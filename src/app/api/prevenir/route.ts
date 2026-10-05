import { NextResponse } from "next/server";
import { canNotifyOwner, ownerEmail, sendEmail } from "@/lib/email";
import { creerLimite, creerLimiteParCle } from "@/lib/limite-debit";
import { origineEtrangere } from "@/lib/origine";
import { EMAIL_VALIDE, MAX_TEXTE, envoiTropRapide } from "@/lib/devis-regles";

export const runtime = "nodejs";

/** Un panier, pas un catalogue : au-delà, le reste est coupé. */
const MAX_LIGNES = 20;
const MAX_LIGNE = 200;

/** Une ligne du panier, sur une seule ligne et bornée (même règle que le devis). */
function borne(valeur: unknown, max: number) {
  const propre = String(valeur ?? "").replace(/[\r\n\t\u0000-\u001f]+/g, " ").trim();
  return propre.length <= max ? propre : propre.slice(0, max) + "…";
}

/** 3 demandes par adresse IP et par dix minutes, comme le formulaire de devis. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 3 });

/** Deux accusés par adresse et par jour : l'adresse tapée n'est pas vérifiée (voir /api/devis). */
const tropDAccuses = creerLimiteParCle({ fenetreMs: 24 * 60 * 60 * 1000, maximum: 2 });

/**
 * « Me prévenir à l'ouverture » : avant l'immatriculation, le panier ne peut
 * pas encaisser. Le client laisse son e-mail ; l'atelier le reçoit avec le
 * panier, pour lui écrire le jour de l'ouverture (et mesurer l'intérêt).
 */
export async function POST(request: Request) {
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers: { "retry-after": "600" } });
  }

  let body: { email?: unknown; locale?: unknown; website?: unknown; dureeMs?: unknown; panier?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Champ piège et piège temporel : un robot est remercié, rien ne part.
  if (String(body.website ?? "")) return NextResponse.json({ ok: true });
  if (envoiTropRapide(body.dureeMs)) return NextResponse.json({ ok: true });

  const email = borne(body.email, MAX_TEXTE.email);
  if (!EMAIL_VALIDE.test(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const locale = body.locale === "en" ? "en" : "fr";
  const panier = (Array.isArray(body.panier) ? body.panier : [])
    .slice(0, MAX_LIGNES)
    .map((ligne) => borne(ligne, MAX_LIGNE))
    .filter(Boolean);

  if (!canNotifyOwner()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sent = await sendEmail({
    to: ownerEmail(),
    // Objet figé : l'adresse du visiteur n'y entre pas.
    subject: `Me prévenir à l'ouverture — panier de ${panier.length} ligne${panier.length > 1 ? "s" : ""}`,
    text: [
      `E-mail : ${email}`,
      `Langue : ${locale.toUpperCase()}`,
      "",
      "Son panier :",
      ...(panier.length ? panier.map((l) => `- ${l}`) : ["(vide)"]),
      "",
      "À prévenir le jour de l'ouverture des commandes (au plus tard le lundi 7 décembre 2026), à passer en priorité dans le planning, puis à effacer (promis dans la politique de confidentialité).",
    ].join("\n"),
    replyTo: email,
  });
  if (!sent) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  // Accusé de réception, attendu pour qu'il parte vraiment (voir /api/devis).
  if (tropDAccuses(email.toLowerCase(), Date.now())) return NextResponse.json({ ok: true });
  await sendEmail({
    to: email,
    replyTo: ownerEmail(),
    subject: locale === "en" ? "We will let you know — Auboiacier" : "Nous vous prévenons — Auboiacier",
    text: (locale === "en"
      ? [
          "Hello,",
          "",
          "Your sign-up is noted: the workshop opens on Monday 7 December 2026 at the latest.",
          "We make one piece at a time, and the first to sign up get priority in the production schedule.",
          "We will write to you on opening day. No payment before then.",
          "",
          "Auboiacier — wood, steel & light",
        ]
      : [
          "Bonjour,",
          "",
          "Votre inscription est notée : l'atelier ouvre au plus tard le lundi 7 décembre 2026.",
          "Nous fabriquons une pièce à la fois, et les premiers inscrits passent en priorité dans le planning de fabrication.",
          "Nous vous écrivons le jour de l'ouverture. Aucun paiement avant.",
          "",
          "Auboiacier — bois, acier & lumière",
        ]
    ).join("\n"),
  });

  return NextResponse.json({ ok: true });
}
