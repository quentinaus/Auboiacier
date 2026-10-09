import "server-only";
import type Stripe from "stripe";
import { accesLivraison } from "./stripe";
import { composerConfirmation } from "./confirmation";
import { rendreDevisPdf } from "./devis-pdf";
import { ownerEmail, sendEmail } from "./email";
import { libelleEntier } from "./libelle-stripe";
import { euros, formatLines } from "./lignes-commande";
import { libelleStatut, phraseStatut, type Statut } from "./statut-commande";
import { lignesOrigine, origineDesMetadonnees } from "./provenance";
import { siteOrigin } from "./stripe";
import { getDictionary } from "../app/[lang]/dictionaries";
import { contratEnTexte, contratGarantieCotes, type PartieContrat } from "./garantie-cotes-contrat";

/**
 * Bons de commande.
 * Le texte des e-mails vit ici, pas dans les dictionnaires de l'interface :
 * ce sont deux publics différents et deux cycles de vie différents.
 */

// Le délai exact dépend de la pièce (3 à 12 semaines selon le meuble) : les CGV
// et les fiches produits font foi, l'e-mail y renvoie plutôt que d'annoncer un
// chiffre qui les contredirait.
const LEAD_TIME = {
  fr: "le délai indiqué sur la fiche de votre pièce (3 à 12 semaines)",
  en: "the lead time shown on your piece's page (3 to 12 weeks)",
};

function formatAddress(address: Stripe.Address | null | undefined) {
  if (!address) return "—";
  return [
    address.line1,
    address.line2,
    [address.postal_code, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}


/**
 * Filet de sécurité : la commande entière écrite dans les journaux du serveur,
 * en clair et sur UNE SEULE ligne, quand l'e-mail à l'atelier n'est pas parti.
 * Sur Vercel (Deployments > le déploiement > Logs, ou Observability > Logs), on
 * cherche « COMMANDE-A-RECOPIER » et on retrouve tout : référence, pièces,
 * options, montants, nom, e-mail, téléphone et adresse de livraison.
 * Une seule ligne, parce qu'un message coupé en plusieurs lignes est mélangé
 * aux autres et devient impossible à relire.
 */
export function ligneDeJournal(
  session: Stripe.Checkout.Session,
  lines: Stripe.LineItem[]
): string {
  const client = session.customer_details;
  const livraison = session.collected_information?.shipping_details ?? null;
  const adresse = livraison?.address ?? client?.address ?? null;

  const commande = {
    reference: session.metadata?.order_ref ?? session.id,
    paiementStripe: session.id,
    payeLe: new Date().toISOString(),
    totalPaye: euros(session.amount_total),
    langue: session.metadata?.locale ?? "fr",
    // Les options choisies sont dans le libellé de chaque ligne (voir /api/commande).
    articles: lines.map((item, rang) => ({
      designation: libelleEntier(item.description, rang, session.metadata),
      quantite: item.quantity ?? 1,
      prixUnitaire: euros(item.price?.unit_amount),
      total: euros(item.amount_total),
    })),
    // La remise de plusieurs garde-corps, et le retrait à l'atelier, s'il y a lieu.
    ...(session.total_details?.amount_discount ? { remise: euros(session.total_details.amount_discount) } : {}),
    ...(session.metadata?.retrait === "1" ? { retraitAtelier: true } : {}),
    ...(session.metadata?.garantie_cotes ? { garantieCotes: session.metadata.garantie_cotes } : {}),
    // Juste de quoi reconnaître la commande. Le nom, le téléphone et la rue
    // ne descendent PAS dans les journaux : ce sont des données personnelles,
    // les journaux Vercel se conservent, se lisent par toute l'équipe du
    // projet et ne s'effacent pas ligne par ligne. Elles restent chez Stripe,
    // où elles sont à leur place — et où l'on peut les supprimer.
    client: { email: client?.email ?? "" },
    livraison: {
      codePostal: adresse?.postal_code ?? "",
      ville: adresse?.city ?? "",
      pays: adresse?.country ?? "",
    },
    coordonneesCompletes: `tableau de bord Stripe > Paiements > ${session.id}`,
  };

  // JSON.stringify garantit l'absence de retour à la ligne dans le résultat.
  return `COMMANDE-A-RECOPIER ${JSON.stringify(commande)}`;
}

/** Bon de commande à l'atelier. C'est l'e-mail qui ne doit jamais se perdre. */
export async function notifyOwner(
  session: Stripe.Checkout.Session,
  lines: Stripe.LineItem[]
): Promise<boolean> {
  const ref = session.metadata?.order_ref ?? session.id;
  const customer = session.customer_details;
  const shipping = session.collected_information?.shipping_details ?? null;
  // Comment le client nous a connus, et le lien marqué de son arrivée (métadonnées posées par /api/commande).
  const { connu, provenance } = origineDesMetadonnees(session.metadata);
  const origine = lignesOrigine(connu, provenance);

  const text = [
    `Nouvelle commande ${ref}`,
    // La ville, donnée au panier avant le paiement : elle est là même si le
    // client s'est arrêté avant de saisir son adresse complète.
    session.metadata?.ville ? `Ville : ${session.metadata.ville}` : "",
    // La pose à domicile : où aller, en clair, pour caler le trajet.
    session.metadata?.pose_cp
      ? `POSE À DOMICILE : ${session.metadata.pose_cp}${session.metadata.pose_commune ? ` (${session.metadata.pose_commune})` : ""} — appeler le client pour convenir du jour.`
      : "",
    // Le retrait à l'atelier : pas de colis à préparer pour un transporteur.
    session.metadata?.retrait === "1" ? "RETRAIT À L'ATELIER : le client vient chercher sa commande à Saumur — l'appeler quand elle est prête." : "",
    // La Garantie cotes : une modification ou une refabrication par pièce garantie, 15 jours après la livraison (CGV, art. 13).
    session.metadata?.garantie_cotes
      ? `GARANTIE COTES : ${session.metadata.garantie_cotes} pièce(s) garantie(s) — voir les lignes « Garantie cotes » ci-dessous (CGV, article 13).`
      : "",
    "",
    formatLines(lines, "fr", session),
    "",
    `TOTAL PAYÉ : ${euros(session.amount_total)}`,
    "",
    "CLIENT",
    `Nom : ${shipping?.name ?? customer?.name ?? "—"}`,
    `E-mail : ${customer?.email ?? "—"}`,
    `Téléphone : ${customer?.phone ?? "—"}`,
    "",
    "LIVRAISON",
    formatAddress(shipping?.address ?? customer?.address),
    accesLivraison(session) ? `Accès : ${accesLivraison(session)}` : "",
    "",
    ...(origine.length ? ["ORIGINE", ...origine, ""] : []),
    `Paiement Stripe : ${session.id}`,
    "Facture et remboursement : tableau de bord Stripe > Paiements.",
  ].join("\n");

  return sendEmail({
    to: ownerEmail(),
    subject: `Commande ${ref} — ${euros(session.amount_total)}`,
    text,
    // Répondre à cet e-mail écrit directement à l'acheteur.
    replyTo: customer?.email ?? undefined,
  });
}

/**
 * Le document « Commande acceptée et payée », en pièce jointe de la
 * confirmation. Il remplace la case « Bon pour accord » restée vide sur le
 * devis : le client a accepté les conditions puis payé, le document le dit.
 *
 * Ne lève jamais. Un PDF qui ne sort pas ne doit pas priver l'acheteur de sa
 * confirmation de commande — c'est l'e-mail qui compte, la pièce jointe est
 * un plus.
 */
/**
 * Le contrat de la Garantie cotes d'une commande qui la comprend (métadonnée
 * garantie_cotes), dans la langue du client : l'article 13 des CGV, le
 * garant et l'encadré légal, tels qu'ils sont aujourd'hui. Sans garantie :
 * rien. L'e-mail de confirmation et la confirmation PDF le reproduisent en
 * entier (support durable, art. L217-22 du code de la consommation).
 */
export async function contratDeLaCommande(session: Stripe.Checkout.Session): Promise<PartieContrat[] | undefined> {
  if (!session.metadata?.garantie_cotes) return undefined;
  const locale = session.metadata?.locale === "en" ? "en" : "fr";
  return contratGarantieCotes((await getDictionary(locale)).cgv);
}

async function confirmationJointe(
  session: Stripe.Checkout.Session,
  lines: Stripe.LineItem[],
  locale: "fr" | "en",
  ref: string,
  contratGarantie: PartieContrat[] | undefined
) {
  try {
    const pdf = await rendreDevisPdf(
      composerConfirmation({ session, lignes: lines, origine: siteOrigin(), contratGarantie })
    );
    return [
      {
        filename: `${locale === "en" ? "Order" : "Commande"} ${ref}.pdf`,
        content: pdf.toString("base64"),
      },
    ];
  } catch (error) {
    console.error("[commande] confirmation PDF non produite :", ref, error);
    return undefined;
  }
}

/** Confirmation à l'acheteur. Au mieux : son échec ne bloque pas la commande. */
export async function notifyCustomer(
  session: Stripe.Checkout.Session,
  lines: Stripe.LineItem[]
): Promise<boolean> {
  const email = session.customer_details?.email;
  if (!email) return false;

  const ref = session.metadata?.order_ref ?? session.id;
  const locale = session.metadata?.locale === "en" ? "en" : "fr";
  // La Garantie cotes achetée : son contrat en entier, dans le corps du message ET dans le PDF joint.
  const contratGarantie = await contratDeLaCommande(session);
  const contrat = contratGarantie
    ? [
        "",
        "",
        locale === "en"
          ? "Your Measurement guarantee contract, reproduced in full below (keep this e-mail):"
          : "Votre contrat de Garantie cotes, reproduit en entier ci-dessous (conservez cet e-mail) :",
        "",
        contratEnTexte(contratGarantie),
      ].join("\n")
    : "";

  const text =
    locale === "en"
      ? [
          `Thank you for your order (${ref}).`,
          "",
          formatLines(lines, "en", session),
          "",
          `Total paid: ${euros(session.amount_total)}`,
                "",
          "Your order confirmation is attached to this e-mail.",
          `Your piece is made to order in our workshop: allow ${LEAD_TIME.en}. ${session.metadata?.retrait === "1" ? "We will call you when it is ready, to arrange a day to collect it from the workshop in Saumur." : "We will contact you to arrange delivery."}`,
          "Your invoice is sent separately by our payment provider.",
          "",
          "Auboiacier — wood, steel & light",
        ].join("\n") + contrat
      : [
          `Merci pour votre commande (${ref}).`,
          "",
          formatLines(lines, "fr", session),
          "",
          `Total payé : ${euros(session.amount_total)}`,
                "",
          "Votre confirmation de commande est jointe à cet e-mail.",
          `Votre pièce est fabriquée à la commande dans notre atelier : comptez ${LEAD_TIME.fr}. ${session.metadata?.retrait === "1" ? "Nous vous appelons dès qu'elle est prête, pour convenir du jour où vous venez la chercher à l'atelier, à Saumur." : "Nous vous contactons pour convenir de la livraison."}`,
          "Votre facture vous est envoyée séparément par notre prestataire de paiement.",
          "",
          "Auboiacier — bois, acier & lumière",
        ].join("\n") + contrat;

  return sendEmail({
    to: email,
    subject: locale === "en" ? `Your Auboiacier order ${ref}` : `Votre commande Auboiacier ${ref}`,
    text,
    replyTo: ownerEmail(),
    attachments: await confirmationJointe(session, lines, locale, ref, contratGarantie),
  });
}

/**
 * « Votre pièce est entrée en fabrication. » L'e-mail que Quentin déclenche
 * depuis son écran d'atelier, en cochant une case.
 *
 * Volontairement court : trois lignes, la référence, et de quoi répondre.
 * Un client qui attend une table pendant six semaines veut savoir où elle en
 * est, pas lire une lettre.
 */
export async function notifyStatut(commande: {
  email: string;
  reference: string;
  locale: "fr" | "en";
  statut: Statut;
  pose: boolean;
  /** Retrait à l'atelier : « prête à retirer », pas « expédiée ». */
  retrait?: boolean;
}): Promise<boolean> {
  if (!commande.email) return false;
  const { locale, pose, retrait, statut, reference } = commande;
  const libelle = libelleStatut(statut, { pose, retrait, locale });

  const text = [
    phraseStatut(statut, { pose, retrait, locale }),
    "",
    locale === "en" ? `Order ${reference} — ${libelle}` : `Commande ${reference} — ${libelle}`,
    "",
    locale === "en"
      ? "Reply to this e-mail if you have any question."
      : "Répondez à cet e-mail si vous avez la moindre question.",
    "",
    locale === "en" ? "Auboiacier — wood, steel & light" : "Auboiacier — bois, acier & lumière",
  ].join("\n");

  return sendEmail({
    to: commande.email,
    subject:
      locale === "en"
        ? `Your Auboiacier order ${reference} — ${libelle}`
        : `Votre commande Auboiacier ${reference} — ${libelle}`,
    text,
    replyTo: ownerEmail(),
  });
}
