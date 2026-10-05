import type { Product, ProductSwatch } from "./products";

/**
 * Petites lectures du catalogue pour les pages de présentation (tables, bois
 * massif, plafonds) : elles citent le catalogue au lieu de le recopier.
 */

/**
 * Le délai de fabrication d'une fiche, tel qu'il est écrit à sa ligne
 * « Fabrication » : « Sur commande — comptez 6 à 8 semaines » donne
 * « 6 à 8 semaines ». Null quand la fiche n'en donne pas (« délai confirmé
 * avec le devis »).
 */
export function delaiFabrication(product: Product): string | null {
  const ligne = product.specs.find((spec) => spec.label === "Fabrication" || spec.label === "Lead time");
  const trouve = ligne?.value.match(/\d+\s+(?:à|to)\s+\d+\s+(?:semaines|weeks)/);
  return trouve ? trouve[0] : null;
}

/** Les essences d'une pièce, de la moins chère à la plus chère, d'après les écarts du catalogue. */
export function essencesParPrix(product: Product): ProductSwatch[] {
  return [...product.woods].sort((a, b) => (a.priceDelta ?? 0) - (b.priceDelta ?? 0));
}

/** Remplace des marqueurs « {nom} » propres à une page. */
export function remplir(texte: string, valeurs: Record<string, string>): string {
  return texte.replace(/\{(\w+)\}/g, (marqueur, nom: string) => valeurs[nom] ?? marqueur);
}
