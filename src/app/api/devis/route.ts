import { NextResponse } from "next/server";
import { canNotifyOwner, ownerEmail, sendEmail } from "@/lib/email";
import { creerLimite } from "@/lib/limite-debit";
import { origineEtrangere } from "@/lib/origine";
import { EMAIL_VALIDE, MAX_TEXTE, envoiTropRapide, fichiersTropLourds } from "@/lib/devis-regles";

export const runtime = "nodejs";
/** Une demande avec pièces jointes prend quelques secondes, jamais plus. */
export const maxDuration = 30;

// Les bornes des champs et des pièces jointes (MAX_TEXTE, MAX_FICHIERS…) et
// la règle de l'e-mail vivent dans src/lib/devis-regles.ts : le formulaire du
// navigateur applique exactement les mêmes.

/**
 * Coupe un champ trop long au lieu de refuser la demande, et le remet sur une
 * seule ligne. Dans un e-mail, un retour à la ligne au milieu d'un en-tête
 * commence un NOUVEL en-tête : un nom contenant un saut de ligne permettait
 * d'ajouter des destinataires cachés au message. Seul le corps du message a le
 * droit d'avoir des lignes.
 */
function borne(valeur: string, max: number, marque = "", uneSeuleLigne = true) {
  const propre = uneSeuleLigne ? valeur.replace(/[\r\n\t\u0000-\u001f]+/g, " ").trim() : valeur;
  return propre.length <= max ? propre : propre.slice(0, max) + marque;
}

/**
 * Formats acceptés en pièce jointe, reconnus à leurs premiers octets et non à
 * l'extension du nom : un fichier « photo.jpg » peut très bien être un
 * programme, et il arriverait tel quel dans la boîte mail de l'atelier.
 */
const TYPES_ACCEPTES = [
  { extension: ".jpg", entete: [0xff, 0xd8, 0xff] },
  { extension: ".png", entete: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { extension: ".pdf", entete: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // « %PDF- »
] as const;

/** Le vrai format du fichier, ou undefined si ce n'est ni JPG, ni PNG, ni PDF. */
function extensionReelle(octets: Buffer) {
  return TYPES_ACCEPTES.find((type) =>
    type.entete.every((octet, i) => octets[i] === octet)
  )?.extension;
}

/**
 * Nom de fichier propre : ni chemin, ni caractère exotique, et l'extension
 * remise d'après le contenu réel.
 */
function nomDeFichier(nom: string, extension: string) {
  const base =
    nom
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.[^.]*$/, "")
      .replace(/[^A-Za-z0-9 ._-]/g, "-")
      .slice(0, 60)
      .trim() || "piece-jointe";
  return `${base}${extension}`;
}

/**
 * Limite de débit sommaire, en mémoire : 3 envois par adresse IP et par
 * dix minutes. Elle ne survit ni à un redémarrage du serveur, ni au fait que
 * Vercel démarre plusieurs instances en parallèle — chacune a son compteur, la
 * limite réelle est donc plus haute. Cela suffit malgré tout à empêcher qu'un
 * robot vide le quota d'e-mails du site, quota partagé avec les bons de
 * commande. Pour faire mieux : un compteur partagé (Vercel KV, Upstash).
 */
const tooManyRequests = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 3 });

/** Réception d'une demande de devis : validation puis envoi par e-mail. */
export async function POST(request: Request) {
  // Un site tiers ne doit pas pouvoir poster des demandes par le navigateur
  // de ses visiteurs : refusé avant même de compter le passage.
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  if (tooManyRequests(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers: { "retry-after": "600" } });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("[devis] formulaire illisible :", error);
    return NextResponse.json({ error: "too_big" }, { status: 413 });
  }

  // Champ piège : rempli uniquement par les robots.
  if (String(form.get("website") ?? "")) {
    return NextResponse.json({ ok: true });
  }

  // Piège temporel : le formulaire envoie le temps passé dessus. Un robot
  // poste en moins d'une seconde, un humain met plus de trois (voir devis-regles.ts).
  if (envoiTropRapide(form.get("dureeMs"))) {
    return NextResponse.json({ ok: true }); // trop rapide pour un humain : on fait comme si
  }

  const name = borne(String(form.get("name") ?? "").trim(), MAX_TEXTE.name);
  const email = borne(String(form.get("email") ?? "").trim(), MAX_TEXTE.email);
  const phone = borne(String(form.get("phone") ?? "").trim(), MAX_TEXTE.phone);
  const city = borne(String(form.get("city") ?? "").trim(), MAX_TEXTE.city);
  const project = borne(String(form.get("project") ?? "").trim(), MAX_TEXTE.project);
  /** La demi-journée souhaitée pour une prise de cotes, en clair, si le formulaire en avait une. */
  const creneau = borne(String(form.get("creneau") ?? "").trim(), MAX_TEXTE.project);
  // Le message garde ses retours à la ligne : c'est le corps, pas un en-tête.
  const message = borne(
    String(form.get("message") ?? "").trim(),
    MAX_TEXTE.message,
    "\n\n[message trop long, la suite a été coupée]",
    false
  );
  const locale = String(form.get("locale") ?? "") === "en" ? "en" : "fr";

  if (!name || !city || !message || !EMAIL_VALIDE.test(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiersTropLourds(files)) {
    return NextResponse.json({ error: "too_big" }, { status: 413 });
  }

  if (!canNotifyOwner()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // On lit chaque fichier, on regarde ses premiers octets, et on ne garde que
  // les photos et les PDF. Tout le reste est refusé avant de partir par e-mail.
  const attachments: { filename: string; content: string }[] = [];
  for (const file of files) {
    const octets = Buffer.from(await file.arrayBuffer());
    const extension = extensionReelle(octets);
    if (!extension) {
      console.error("[devis] pièce jointe refusée (format non reconnu) :", file.name);
      return NextResponse.json({ error: "bad_file" }, { status: 415 });
    }
    attachments.push({
      filename: nomDeFichier(file.name, extension),
      content: octets.toString("base64"),
    });
  }

  const lines = [
    `Nom : ${name}`,
    `E-mail : ${email}`,
    phone && `Téléphone : ${phone}`,
    `Ville : ${city}`,
    project && `Type de projet : ${project}`,
    creneau && `Créneau souhaité : ${creneau}`,
    // Pour répondre dans la langue du prospect sans avoir à la deviner.
    `Langue : ${locale.toUpperCase()}`,
    "",
    message,
  ].filter(Boolean);

  const sent = await sendEmail({
    to: ownerEmail(),
    // L'objet est figé : le nom du visiteur ne doit pas pouvoir le maquiller en
    // « URGENT — Stripe : votre compte va être suspendu ».
    subject: `Demande de devis — ${name.slice(0, 60)}${project ? ` (${project})` : ""}`,
    text: lines.join("\n"),
    // Répondre à cet e-mail écrit directement au prospect.
    replyTo: email,
    attachments,
  });

  if (!sent) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  // Accusé de réception au prospect, dans SA langue. On l'attend : sur Vercel,
  // la fonction peut être arrêtée dès qu'elle a répondu, et un envoi lancé sans
  // être attendu ne part parfois jamais — le prospect voit « demande envoyée »
  // et ne reçoit rien. Son échec, lui, ne remet toujours pas la demande en cause.
  const accuse =
    locale === "en"
      ? {
          subject: "Your quote request — Auboiacier",
          text: [
            `Hello ${name},`,
            "",
            "We have received your request and will get back to you within 48 hours.",
            "",
            "Auboiacier — wood, steel & light",
          ],
        }
      : {
          subject: "Votre demande de devis — Auboiacier",
          text: [
            `Bonjour ${name},`,
            "",
            "Nous avons bien reçu votre demande et nous vous répondons sous 48 heures.",
            "",
            "Auboiacier — bois, acier & lumière",
          ],
        };
  await sendEmail({
    to: email,
    subject: accuse.subject,
    replyTo: ownerEmail(),
    text: accuse.text.join("\n"),
  });

  return NextResponse.json({ ok: true });
}
