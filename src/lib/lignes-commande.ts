// Chemins relatifs et extensions en toutes lettres : les tests (node --test) chargent ce fichier tel quel.
import type Stripe from "stripe";
import { libelleEntier } from "./libelle-stripe.ts";

/* Les lignes d'une commande payée, en texte : le bon de commande de l'atelier et l'e-mail de l'acheteur
   (order-email.ts). Sorties de order-email.ts (« server-only ») pour que les tests les lisent. */

/** Phrase de repli quand Stripe ne nous rend pas le détail des lignes. */
const DETAIL_MANQUANT = {
  fr: "(détail indisponible — voir le tableau de bord Stripe)",
  en: "(details unavailable — see the Stripe dashboard)",
};

export function euros(cents: number | null | undefined) {
  return `${((cents ?? 0) / 100).toLocaleString("fr-FR")} €`;
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
export function formatLines(lines: Stripe.LineItem[], locale: "fr" | "en" = "fr", session?: Stripe.Checkout.Session) {
  if (lines.length === 0) return DETAIL_MANQUANT[locale];
  // Chaque ligne à son prix avant remise ; la remise a sa ligne, comme sur la facture.
  const texte = lines.map((item, rang) => {
    const quantity = item.quantity ?? 1;
    // Le libellé ENTIER : Stripe ne garde que 250 signes du nom (libelle-stripe.ts).
    return `• ${libelleEntier(item.description, rang, session?.metadata)}\n  ${quantity} × ${euros(
      item.price?.unit_amount
    )} = ${euros(item.amount_subtotal ?? item.amount_total)}`;
  });
  const remise = session?.total_details?.amount_discount ?? 0;
  if (remise > 0) {
    texte.push(
      locale === "en"
        ? `• Several-railings discount (same order)\n  −${euros(remise)}`
        : `• Remise plusieurs garde-corps (même commande)\n  −${euros(remise)}`
    );
  }
  if (session?.metadata?.retrait === "1") {
    texte.push(locale === "en" ? "• Collection from the workshop in Saumur, by appointment\n  0 €" : "• Retrait à l'atelier, à Saumur, sur rendez-vous\n  0 €");
  }
  return texte.join("\n");
}
