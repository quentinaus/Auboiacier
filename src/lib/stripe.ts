import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Client Stripe, côté serveur uniquement.
 * Construit à la première utilisation : sans cela, une clé absente ferait
 * échouer la compilation du site au lieu d'un simple message « paiement non
 * configuré ». Ne jamais importer ce fichier depuis un composant "use client".
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY absente");
  // Sans délai, la bibliothèque attend 80 secondes : le visiteur regarde son
  // bouton tourner jusqu'à ce que Vercel coupe la fonction, sans message.
  if (!client) client = new Stripe(key, { timeout: 8000, maxNetworkRetries: 2 });
  return client;
}

/**
 * Le paiement est-il configuré ?
 * Les DEUX clés Stripe sont exigées, pas seulement la clé secrète :
 * sans STRIPE_WEBHOOK_SECRET, le paiement passerait, le client verrait
 * « merci »… et l'atelier ne recevrait jamais le bon de commande, parce que
 * c'est le webhook — et lui seul — qui déclenche l'e-mail.
 * La troisième clé, RESEND_API_KEY, est vérifiée par /api/commande avec
 * isEmailConfigured() : sans elle non plus, on n'ouvre pas le paiement.
 */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Pied de page des factures Stripe.
 * Une facture française doit porter les mentions de l'entreprise : raison
 * sociale, SIRET, adresse, régime de TVA, et l'assurance décennale quand il y a
 * de la pose. Ces informations, seul Quentin les a : elles arrivent par
 * variables d'environnement (voir .env.example) et le pied reste vide tant
 * qu'elles ne sont pas remplies — on n'invente rien sur un document comptable.
 */
export function piedDeFacture(): string | undefined {
  const lignes = [
    process.env.FACTURE_RAISON_SOCIALE,
    process.env.FACTURE_ADRESSE,
    process.env.FACTURE_SIRET,
    process.env.FACTURE_TVA,
    process.env.FACTURE_ASSURANCE,
  ]
    .map((ligne) => ligne?.replace(/\s+/g, " ").trim())
    .filter((ligne): ligne is string => Boolean(ligne));

  if (lignes.length === 0) return undefined;
  // Stripe accepte 5 000 signes dans ce champ : on reste très en dessous.
  return lignes.join("\n").slice(0, 5000);
}

/** Alphabet sans I, O, 0 ni 1 : une référence se dicte au téléphone sans erreur. */
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Référence de commande courte, du type AB-K7P2X9. */
export function newOrderRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `AB-${code}`;
}

/**
 * URL publique du site, pour construire les retours de paiement.
 * Elle ne regarde JAMAIS la requête : l'en-tête « Host » est écrit par le
 * navigateur, et une requête forgée créait une session de paiement bien réelle
 * dont le retour renvoyait la victime sur le site d'un inconnu.
 */
const DOMAINE = "https://auboiacier.fr";

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DOMAINE).replace(/\/+$/, "");
}
