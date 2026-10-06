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
 *  Un libellé de plus de 500 signes (un garde-corps avec toutes ses options,
 *  la fixation dans le mur et la note la plus longue : jusqu'à 550 signes)
 *  ne tient pas dans une valeur. Sa métadonnée garde alors seulement la SUITE
 *  du nom envoyé à Stripe (le nom en a déjà le début) : toujours une seule
 *  clé par ligne — Stripe n'en accepte que 50 par commande —, et jusqu'à
 *  740 signes relus entiers. Avant, la fin était perdue : l'atelier lisait
 *  « posé à 9 » au lieu de « posé à 90 mm ».
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
/** Ce qui commence une métadonnée qui n'est que la suite du nom : « … », puis l'empreinte du début (8 signes). */
const SUITE = "…";
const TAILLE_EMPREINTE = 8;

/** Les `max` premiers signes, sans laisser une moitié d'émoji au bout : l'envoi à Stripe échouerait. */
const debut = (texte: string, max: number) => texte.slice(0, max).replace(/[\uD800-\uDBFF]$/, "");

/**
 * L'empreinte d'un début de libellé (FNV-1a sur 32 bits, 8 chiffres hexadécimaux) : la suite gardée dans les
 * métadonnées n'est recollée qu'au nom dont elle est la suite, jamais à celui d'une autre ligne.
 */
function empreinte(texte: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(TAILLE_EMPREINTE, "0");
}

/**
 * Ce que Stripe reçoit pour les lignes d'une commande, dans l'ordre : le nom
 * de chacune, borné, et le libellé entier de celles qu'il a fallu couper,
 * à joindre aux métadonnées de la commande (une clé par ligne coupée ; au-delà
 * de 500 signes, la suite du nom seulement).
 */
export function nomsStripe(libelles: string[]): { noms: string[]; entiers: Record<string, string> } {
  const entiers: Record<string, string> = {};
  const noms = libelles.map((libelle, rang) => {
    if (libelle.length <= MAX_NOM_STRIPE) return libelle;
    const garde = debut(libelle, MAX_NOM_STRIPE - COUPE.length);
    entiers[`${PREFIXE}${rang}`] =
      libelle.length <= MAX_METADONNEE_STRIPE
        ? libelle
        : `${SUITE}${empreinte(garde)}${debut(libelle.slice(garde.length), MAX_METADONNEE_STRIPE - SUITE.length - TAILLE_EMPREINTE)}`;
    return `${garde}${COUPE}`;
  });
  return { noms, entiers };
}

/**
 * Le libellé entier d'une ligne relue chez Stripe : son nom, ou, s'il a été
 * coupé, le libellé gardé dans les métadonnées de la commande (ou le nom
 * suivi de sa suite). `rang` est la place de la ligne dans la commande. Un
 * libellé n'est rendu que s'il commence comme le nom (ou si la suite porte
 * l'empreinte de ce nom) : jamais celui d'une autre ligne.
 */
export function libelleEntier(nom: string | null | undefined, rang: number, metadonnees: Record<string, string> | null | undefined): string {
  const coupe = nom ?? "";
  if (!metadonnees || !coupe.endsWith(COUPE)) return coupe;
  const garde = coupe.slice(0, -COUPE.length);
  const relire = (valeur: string | undefined): string | null => {
    if (typeof valeur !== "string") return null;
    if (valeur.startsWith(garde)) return valeur;
    if (valeur.startsWith(SUITE) && valeur.slice(SUITE.length, SUITE.length + TAILLE_EMPREINTE) === empreinte(garde)) return `${garde}${valeur.slice(SUITE.length + TAILLE_EMPREINTE)}`;
    return null;
  };
  const propre = relire(metadonnees[`${PREFIXE}${rang}`]);
  if (propre !== null) return propre;
  // Les lignes ne sont pas revenues dans l'ordre de la commande : on cherche le libellé qui commence pareil (ou la suite de ce nom).
  for (const [cle, valeur] of Object.entries(metadonnees)) {
    if (!cle.startsWith(PREFIXE)) continue;
    const lu = relire(valeur);
    if (lu !== null) return lu;
  }
  return coupe;
}
