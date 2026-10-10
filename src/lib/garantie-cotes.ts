// Extensions écrites en toutes lettres : les tests (node --test) chargent ce fichier tel quel.
import type { Famille, Product } from "./products.ts";

/* ------------------------------------------------------------------ *
 *  La Garantie cotes (décision de Quentin, 09/10/2026)
 *
 *  Une option payante, proposée au panier, pour le client qui se serait
 *  trompé dans ses cotes : l'atelier modifie ou refait la pièce une fois,
 *  aux cotes corrigées (conditions complètes : CGV, article 13).
 *
 *  C'est une GARANTIE COMMERCIALE du vendeur (art. L217-21 à L217-24 du code
 *  de la consommation), jamais une « assurance » : ce mot désigne un produit
 *  réglementé que l'atelier n'a pas le droit de vendre.
 *
 *  Le prix se calcule ICI, sur le serveur seulement (tarif-panier.ts) : le
 *  navigateur n'envoie qu'un oui ou un non par ligne, jamais un montant.
 * ------------------------------------------------------------------ */

/** 8 % du prix de la pièce… */
export const GARANTIE_COTES_POURCENT = 8;
/** …au moins 29 €… */
export const GARANTIE_COTES_MIN = 29;
/** …au plus 99 €, par pièce. */
export const GARANTIE_COTES_MAX = 99;

/**
 * Les familles dont le client donne lui-même les cotes ou la taille. Pas
 * l'escalier (l'atelier prend les cotes, sur devis), ni la chaise et le
 * fauteuil (taille unique).
 */
const FAMILLES_GARANTIES: ReadonlySet<Famille> = new Set<Famille>([
  "garde-corps",
  "plafond",
  "table-interieur",
  "table-exterieur",
]);

/**
 * La pièce peut-elle recevoir la Garantie cotes ? Il faut qu'elle s'achète au
 * panier (orderMode « cart ») : une pièce sur devis a été mesurée par
 * l'atelier, il n'y a rien à garantir.
 */
export function eligibleGarantieCotes(product: Pick<Product, "famille" | "orderMode">): boolean {
  return product.orderMode === "cart" && FAMILLES_GARANTIES.has(product.famille);
}

/**
 * Le prix de la Garantie cotes pour UNE pièce, en euros entiers : 8 % de son
 * prix unitaire (options comprises), arrondi à l'euro supérieur, entre 29 et
 * 99 €. Calcul en centimes entiers : 8 % de 362,50 € font 29 € tout rond,
 * pas 29,000000000000004 arrondis à 30.
 */
export function prixGarantieCotes(prixUnitaireEuros: number): number {
  if (!Number.isFinite(prixUnitaireEuros) || prixUnitaireEuros <= 0) return GARANTIE_COTES_MIN;
  const centimes = Math.round(prixUnitaireEuros * 100);
  const euros = Math.ceil((centimes * GARANTIE_COTES_POURCENT) / 10_000);
  return Math.min(GARANTIE_COTES_MAX, Math.max(GARANTIE_COTES_MIN, euros));
}

/** Le nom de la ligne, sur la page de paiement, la facture et le bon de commande. */
export const NOM_GARANTIE_COTES = { fr: "Garantie cotes", en: "Measurement guarantee" } as const;

/** « Garantie cotes — Table Mikado » : la ligne Stripe d'une pièce garantie. */
export function libelleGarantieCotes(nomPiece: string, locale: "fr" | "en"): string {
  return `${NOM_GARANTIE_COTES[locale]} — ${nomPiece}`;
}
