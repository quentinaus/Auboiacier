import type Stripe from "stripe";
import { ownerEmail, sendEmail } from "./email";

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

/** Phrase de repli quand Stripe ne nous rend pas le détail des lignes. */
const DETAIL_MANQUANT = {
  fr: "(détail indisponible — voir le tableau de bord Stripe)",
  en: "(details unavailable — see the Stripe dashboard)",
};

function euros(cents: number | null | undefined) {
  return `${((cents ?? 0) / 100).toLocaleString("fr-FR")} €`;
}

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
 * Les lignes viennent de listLineItems : la liste est complète, alors que
 * l'expansion de la session s'arrête aux dix premières.
 * Le nom porte déjà les options choisies (voir /api/commande).
 *
 * ATTENTION : ce nom est celui envoyé à Stripe au moment du paiement, et il est
 * écrit en français, même pour un acheteur anglais. C'est voulu pour le bon de
 * commande de l'atelier ; pour l'e-mail de l'acheteur, il faudrait que
 * /api/commande envoie aussi le nom anglais (productLocalise) dans les
 * métadonnées de la session.
 */
function formatLines(lines: Stripe.LineItem[], locale: "fr" | "en" = "fr") {
  if (lines.length === 0) return DETAIL_MANQUANT[locale];
  return lines
    .map((item) => {
      const quantity = item.quantity ?? 1;
      return `• ${item.description ?? ""}\n  ${quantity} × ${euros(
        item.price?.unit_amount
      )} = ${euros(item.amount_total)}`;
    })
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
    articles: lines.map((item) => ({
      designation: item.description ?? "",
      quantite: item.quantity ?? 1,
      prixUnitaire: euros(item.price?.unit_amount),
      total: euros(item.amount_total),
    })),
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

  const text = [
    `Nouvelle commande ${ref}`,
    // La ville, donnée au panier avant le paiement : elle est là même si le
    // client s'est arrêté avant de saisir son adresse complète.
    session.metadata?.ville ? `Ville : ${session.metadata.ville}` : "",
    "",
    formatLines(lines),
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
    "",
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

/** Confirmation à l'acheteur. Au mieux : son échec ne bloque pas la commande. */
export async function notifyCustomer(
  session: Stripe.Checkout.Session,
  lines: Stripe.LineItem[]
): Promise<boolean> {
  const email = session.customer_details?.email;
  if (!email) return false;

  const ref = session.metadata?.order_ref ?? session.id;
  const locale = session.metadata?.locale === "en" ? "en" : "fr";

  const text =
    locale === "en"
      ? [
          `Thank you for your order (${ref}).`,
          "",
          formatLines(lines, "en"),
          "",
          `Total paid: ${euros(session.amount_total)}`,
          "",
          `Your piece is made to order in our workshop: allow ${LEAD_TIME.en}. We will contact you to arrange delivery.`,
          "Your invoice is sent separately by our payment provider.",
          "",
          "Auboiacier — wood, steel & light",
        ].join("\n")
      : [
          `Merci pour votre commande (${ref}).`,
          "",
          formatLines(lines),
          "",
          `Total payé : ${euros(session.amount_total)}`,
          "",
          `Votre pièce est fabriquée à la commande dans notre atelier : comptez ${LEAD_TIME.fr}. Nous vous contactons pour convenir de la livraison.`,
          "Votre facture vous est envoyée séparément par notre prestataire de paiement.",
          "",
          "Auboiacier — bois, acier & lumière",
        ].join("\n");

  return sendEmail({
    to: email,
    subject: locale === "en" ? `Your Auboiacier order ${ref}` : `Votre commande Auboiacier ${ref}`,
    text,
    replyTo: ownerEmail(),
  });
}
