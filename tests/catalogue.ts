/**
 * Boîte à outils des tests.
 *
 * Rien ici ne teste : on y range seulement de quoi promener le catalogue
 * (toutes les combinaisons achetables, les cotes qui ne tombent pas sur une
 * taille du catalogue…). Les tests, eux, ne parlent que de règles.
 *
 * Règle de conduite de toute cette suite : on ne fige AUCUN montant. Les tarifs
 * de Quentin bougeront ; les règles de vente, non.
 */
import {
  products,
  remplissageConforme,
  SUR_MESURE,
  type Product,
  type Selection,
  type SurMesure,
} from "../src/lib/products.ts";

/** Une sélection d'options, sans le produit : ce que l'acheteur choisit. */
export type Options = Omit<Selection, "slug">;

/** Les produits réellement achetables en ligne. */
export const achetables = products.filter((p) => p.orderMode === "cart");

/** Les produits fabriqués aux cotes du client. */
export const surMesurables = products.filter((p) => p.surMesure);

/** Le premier produit vendu sur devis (escalier…), s'il y en a un. */
export const surDevis = products.find((p) => p.orderMode === "quote");

/** Un produit par nom, ou une erreur claire si le catalogue a changé de slug. */
export function produit(slug: string): Product {
  const trouve = products.find((p) => p.slug === slug);
  if (!trouve) {
    throw new Error(
      `Le produit « ${slug} » n'existe plus dans le catalogue : mets à jour les tests.`
    );
  }
  return trouve;
}

/** Un produit achetable qui propose des essences de bois. */
export const avecBois = achetables.find((p) => p.woods.length > 0);
/** Un produit achetable qui propose des velours. */
export const avecTissu = achetables.find((p) => (p.fabrics?.length ?? 0) > 0);
/** Un produit achetable qui n'a PAS de velours (une table, par exemple). */
export const sansTissu = achetables.find((p) => !p.fabrics?.length);
/** Un produit achetable sans barème sur mesure. */
export const sansSurMesure = achetables.find((p) => !p.surMesure);

/**
 * Les « tailles » qu'on peut choisir sur un produit : celles du catalogue, ou,
 * pour une pièce qui n'en a aucune (le garde-corps, tout au barème), la pièce
 * sur mesure à ses cotes de départ. Chacune est un morceau de sélection.
 */
export function taillesChoisissables(product: Product): Partial<Options>[] {
  if (product.sizes.length > 0) return product.sizes.map((size) => ({ sizeId: size.id }));
  const bareme = product.surMesure;
  if (!bareme?.departMm) return [];
  return [
    {
      sizeId: SUR_MESURE,
      largeurMm: bareme.departMm[0],
      hauteurMm: bareme.departMm[1],
      epaisseurMm: bareme.epaisseur.refMm,
    },
  ];
}

/**
 * Les remplissages qu'on peut choisir à cette hauteur : ceux qui respectent
 * la norme. Un produit sans remplissage n'en a qu'un, implicite.
 */
export function remplissagesPour(product: Product, hauteurMm: number | undefined): (string | undefined)[] {
  if (!product.remplissages?.length) return [undefined];
  return product.remplissages
    .filter((option) => hauteurMm === undefined || remplissageConforme(option, hauteurMm))
    .map((option) => option.id);
}

/**
 * Toutes les configurations valides d'un produit du catalogue :
 * chaque taille × chaque essence × chaque teinte de pieds × chaque velours.
 * C'est exactement ce que la fiche produit permet de composer.
 */
export function combinaisonsValides(product: Product): Options[] {
  const bois = product.woods.length ? product.woods.map((w) => w.id) : [undefined];
  const pieds = product.metals.length ? product.metals.map((m) => m.id) : [undefined];
  const velours = product.fabrics?.length
    ? product.fabrics.map((f) => f.id)
    : [undefined];

  const liste: Options[] = [];
  for (const taille of taillesChoisissables(product)) {
    for (const woodId of bois) {
      for (const metalId of pieds) {
        for (const fabricId of velours) {
          for (const remplissageId of remplissagesPour(product, taille.hauteurMm)) {
            liste.push({ ...taille, woodId, metalId, fabricId, remplissageId });
          }
        }
      }
    }
  }
  return liste;
}

/**
 * Une seule configuration valide, la moins chère : de quoi tester une règle
 * sans faire tourner les centaines de combinaisons.
 */
export function optionsMoinsCheres(product: Product): Options {
  const moinsCher = (liste: { id: string; priceDelta?: number }[]) =>
    liste.length
      ? [...liste].sort((a, b) => (a.priceDelta ?? 0) - (b.priceDelta ?? 0))[0].id
      : undefined;
  const taille = taillesChoisissables(product)[0];
  return {
    ...taille,
    woodId: moinsCher(product.woods),
    metalId: moinsCher(product.metals),
    fabricId: moinsCher(product.fabrics ?? []),
    // Le remplissage du modèle (le premier), s'il convient à cette hauteur.
    remplissageId: remplissagesPour(product, taille?.hauteurMm)[0],
  };
}

/** Ces cotes correspondent-elles pile à une taille du catalogue ? */
export function estUneCoteDuCatalogue(product: Product, largeur: number, hauteur: number) {
  return product.sizes.some(
    (t) => t.dimsMm?.[0] === largeur && t.dimsMm?.[1] === hauteur
  );
}

/**
 * Des cotes valides qui ne tombent JAMAIS sur une taille du catalogue.
 * Utile pour les tests de croissance du prix : une taille du catalogue a son
 * propre tarif, elle casserait volontairement la courbe.
 */
export function cotesHorsCatalogue(bareme: SurMesure, part: number) {
  const largeur = Math.round(
    bareme.minMm + 13 + part * (bareme.maxLargeurMm - bareme.minMm - 26)
  );
  // Le rond n'a qu'une cote : son diamètre.
  const hauteur = bareme.forme === "rond" ? largeur : bareme.maxHauteurMm - 7;
  return { largeurMm: largeur, hauteurMm: hauteur };
}
