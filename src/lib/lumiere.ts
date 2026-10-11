/**
 * Les plafonds lumineux (Lucarne, Halo) : ce que le bloc « Configuration » calcule tout seul à partir des cotes du
 * client. Rien ici ne touche au prix (devisSurMesure, products.ts) : seulement la puissance affichée et le passage
 * d'une forme à l'autre. Côté public : aucun coût, aucun temps d'atelier.
 */
import { getProduct, SUR_MESURE, computeUnitPrice, type Product } from "./products.ts";

export const SLUG_LUCARNE = "plafond-lumineux-lucarne";
export const SLUG_HALO = "plafond-lumineux-halo";

/**
 * La puissance d'un plafond lumineux, au prorata de sa surface : les tailles du catalogue (products.ts) tournent toutes
 * autour de 65 W par m² (rubans LED 24 V, une ligne tous les 8 cm). Arrondie à 5 W : c'est un ordre de grandeur, pas une
 * fiche électrique. Le test tests/lumiere-bloc.test.ts la tient à ±15 % des tailles du catalogue.
 */
export const WATTS_PAR_M2 = 65;
export function puissanceEstimeeW(surfaceM2: number): number {
  if (!Number.isFinite(surfaceM2) || surfaceM2 <= 0) return 0;
  return Math.max(5, Math.round((surfaceM2 * WATTS_PAR_M2) / 5) * 5);
}

/**
 * Le délai écrit sur la fiche (« Sur commande — comptez 3 à 5 semaines »), ramené à sa durée pour la ligne du récapitulatif :
 * « fabriqué en 3 à 5 semaines ». Pas de durée lisible : on garde la phrase telle quelle, on n'invente rien.
 */
export function dureeFabrication(delai: string | undefined, locale: "fr" | "en"): string | null {
  if (!delai) return null;
  const m = delai.match(/(\d+\s*(?:à|-|to)\s*\d+\s*(?:semaines?|weeks?))/i) ?? delai.match(/(\d+\s*(?:semaines?|weeks?))/i);
  if (!m) return delai;
  return locale === "fr" ? `fabriqué en ${m[1]}` : `made in ${m[1]}`;
}

/**
 * L'autre forme, aux cotes du client : la Lucarne (rectangle) propose le Halo au diamètre de sa plus grande cote, le Halo
 * propose la Lucarne carrée à son diamètre. L'épaisseur du caisson est reprise telle quelle. Le prix est celui de la
 * formule publique (computeUnitPrice, options comprises), le même que sur l'autre fiche : null quand ces cotes y sont
 * hors barème (la Lucarne ne dépasse pas 300 cm de large, un Halo de Ø 400 n'a pas de carré équivalent).
 */
export function formeVoisineLumiere(
  produit: Product,
  cotes: { largeurMm: number; hauteurMm: number; epaisseurMm: number },
  metalId?: string,
): { produit: Product; largeurMm: number; hauteurMm: number; prix: number | null } | null {
  const slugVoisin = produit.slug === SLUG_LUCARNE ? SLUG_HALO : produit.slug === SLUG_HALO ? SLUG_LUCARNE : null;
  if (!slugVoisin) return null;
  const voisin = getProduct(slugVoisin);
  if (!voisin?.surMesure) return null;
  const rondVoisin = voisin.surMesure.forme === "rond";
  const cote = rondVoisin ? Math.max(cotes.largeurMm, cotes.hauteurMm) : cotes.largeurMm;
  const largeurMm = cote;
  const hauteurMm = cote;
  if (!Number.isFinite(cote) || cote <= 0) return { produit: voisin, largeurMm, hauteurMm, prix: null };
  const prix = computeUnitPrice(voisin, {
    sizeId: SUR_MESURE,
    woodId: "",
    // Les deux fiches ont les mêmes couleurs de cadre (pieds()) : la couleur choisie passe telle quelle.
    metalId: metalId || voisin.metals[0]?.id || "",
    fabricId: "",
    largeurMm,
    hauteurMm,
    epaisseurMm: cotes.epaisseurMm,
  });
  return { produit: voisin, largeurMm, hauteurMm, prix };
}
