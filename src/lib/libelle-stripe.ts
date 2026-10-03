/* ------------------------------------------------------------------ *
 *  Le libellé d'une ligne, chez Stripe
 *
 *  Stripe refuse un nom de produit de plus de 250 signes, et le paiement
 *  avec lui : le client ne peut plus payer
 *  (docs.stripe.com/changelog/2018-10-31/names-products-character-limit).
 *  Or le libellé d'une pièce porte ses options ET ce que le client a
 *  précisé : celui d'un garde-corps relevé en entier dépasse 300 signes.
 *
 *  Le nom envoyé à Stripe est donc coupé à 250 signes, et le libellé ENTIER
 *  d'une ligne coupée part à côté, dans les métadonnées de la commande
 *  (500 signes par valeur). Tout ce qui relit une commande — bon de commande
 *  de l'atelier, confirmation, écran d'atelier, espace client — passe par
 *  libelleEntier : ce que le client a précisé arrive entier.
 *
 *  Aucun import : les tests (node --test) chargent ce fichier directement.
 * ------------------------------------------------------------------ */

/** Le nom d'un produit, chez Stripe : 250 signes au plus. */
export const MAX_NOM_STRIPE = 250;
/** Une valeur de métadonnée, chez Stripe : 500 signes au plus. */
export const MAX_METADONNEE_STRIPE = 500;

/** Ce qui termine un nom coupé. */
const COUPE = "…";
const PREFIXE = "libelle_";

/** Les `max` premiers signes, sans laisser une moitié d'émoji au bout : l'envoi à Stripe échouerait. */
const debut = (texte: string, max: number) => texte.slice(0, max).replace(/[\uD800-\uDBFF]$/, "");

/**
 * Ce que Stripe reçoit pour les lignes d'une commande, dans l'ordre : le nom
 * de chacune, borné, et le libellé entier de celles qu'il a fallu couper,
 * à joindre aux métadonnées de la commande (une clé par ligne coupée).
 */
export function nomsStripe(libelles: string[]): { noms: string[]; entiers: Record<string, string> } {
  const entiers: Record<string, string> = {};
  const noms = libelles.map((libelle, rang) => {
    if (libelle.length <= MAX_NOM_STRIPE) return libelle;
    entiers[`${PREFIXE}${rang}`] = debut(libelle, MAX_METADONNEE_STRIPE);
    return `${debut(libelle, MAX_NOM_STRIPE - COUPE.length)}${COUPE}`;
  });
  return { noms, entiers };
}

/**
 * Le libellé entier d'une ligne relue chez Stripe : son nom, ou, s'il a été
 * coupé, le libellé gardé dans les métadonnées de la commande. `rang` est la
 * place de la ligne dans la commande. Un libellé n'est rendu que s'il
 * commence comme le nom : jamais celui d'une autre ligne.
 */
export function libelleEntier(nom: string | null | undefined, rang: number, metadonnees: Record<string, string> | null | undefined): string {
  const coupe = nom ?? "";
  if (!metadonnees || !coupe.endsWith(COUPE)) return coupe;
  const garde = coupe.slice(0, -COUPE.length);
  const entier = metadonnees[`${PREFIXE}${rang}`];
  if (entier?.startsWith(garde)) return entier;
  // Les lignes ne sont pas revenues dans l'ordre de la commande : on cherche le libellé qui commence pareil.
  return Object.entries(metadonnees).find(([cle, valeur]) => cle.startsWith(PREFIXE) && valeur.startsWith(garde))?.[1] ?? coupe;
}
