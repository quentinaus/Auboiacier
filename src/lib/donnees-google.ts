/**
 * Ce que la fiche produit annonce à Google (données structurées Product /
 * Offer) : le prix « à partir de » et la disponibilité.
 *
 * Deux règles, que Google vérifie et que les tests vérifient aussi
 * (tests/donnees-google.test.ts) :
 *
 * 1. Le prix bas annoncé est EXACTEMENT le « à partir de » que la page
 *    affiche (prixDepart, le même que la description Google, les cartes de
 *    la boutique et le haut de la fiche). Avant, la fourchette descendait
 *    jusqu'au plus petit sur-mesure : Google recevait 1 153 € pour la table
 *    Mikado quand la page disait « à partir de 1 480 € » — un écart que
 *    Google signale, et qui peut lui faire retirer le prix des résultats.
 *    Une pièce sans « à partir de » (sur devis) n'annonce aucune offre.
 *
 * 2. La disponibilité dit vrai : tant que le panier n'encaisse pas, la pièce
 *    est en précommande (PreOrder), avec le jour annoncé pour l'ouverture
 *    (availabilityStarts) ; dès que les commandes sont ouvertes, elle est
 *    disponible (InStock — le délai de fabrication est dit sur la page).
 *
 * Aucun import du calcul du garde-corps : la page passe le prix de départ et
 * la fourchette de l'outil (src/lib/prix-garde-corps.server.ts, la seule
 * porte vers ce calcul). Les tests chargent ce fichier tel quel.
 */
import { devisSurMesure, epaisseurMaxMm, prixParOutil, type Product } from "./products.ts";
import { DATE_OUVERTURE_COMMANDES } from "./ouverture.ts";

/** Ce que Google reçoit comme fourchette de prix, en euros. */
export type FourchetteGoogle = { prixMin: number; prixMax: number };

/** Ce que Google reçoit comme disponibilité. */
export type DisponibiliteGoogle = {
  /** La valeur schema.org, sans le préfixe https://schema.org/. */
  valeur: "InStock" | "PreOrder";
  /** Le jour où la pièce devient commandable (ISO 8601, heure de Paris), s'il est encore à venir. */
  aPartirDu?: string;
};

/** Le jour de l'ouverture, à minuit, heure de Paris (décembre : UTC+1). */
export const OUVERTURE_ISO = `${DATE_OUVERTURE_COMMANDES}T00:00:00+01:00`;

/**
 * La fourchette annoncée à Google pour une fiche.
 * - `depart` : le « à partir de » affiché par la page (prixDepart), ou null
 *   pour une pièce sur devis — et alors, aucune offre.
 * - `fourchetteOutil` : celle du garde-corps, calculée par l'outil de plans
 *   (fourchetteGC) ; ignorée pour les autres pièces.
 * Le haut de la fourchette couvre ce qu'on vend vraiment : la plus grande
 * taille du catalogue ou du sur-mesure, dans l'essence la plus chère.
 */
export function fourchetteGoogle(
  product: Product,
  depart: number | null,
  fourchetteOutil?: FourchetteGoogle | null
): FourchetteGoogle | undefined {
  if (depart === null || !Number.isFinite(depart) || depart <= 0) return undefined;
  let haut = depart;
  if (prixParOutil(product)) {
    haut = Math.max(haut, fourchetteOutil?.prixMax ?? 0);
  } else {
    const ecartsBois = product.woods.map((bois) => bois.priceDelta ?? 0);
    const boisMax = ecartsBois.length ? Math.max(...ecartsBois) : 0;
    if (product.sizes.length) haut = Math.max(haut, Math.max(...product.sizes.map((taille) => taille.price)) + boisMax);
    const bareme = product.surMesure;
    if (bareme) {
      const plusGrand = devisSurMesure(
        product,
        bareme.maxLargeurMm,
        bareme.maxHauteurMm,
        epaisseurMaxMm(bareme, bareme.maxLargeurMm, bareme.maxHauteurMm)
      );
      if (plusGrand.ok) haut = Math.max(haut, plusGrand.prix + boisMax);
    }
  }
  return { prixMin: depart, prixMax: haut };
}

/**
 * La disponibilité annoncée à Google.
 * - `achetable` : la pièce se commande au panier (orderMode « cart ») ;
 * - `ouvert` : le panier encaisse (commandesOuvertes()) ;
 * - `maintenant` : l'instant où la page est fabriquée.
 * Une pièce achetable avant l'ouverture : précommande, avec le jour
 * d'ouverture tant qu'il est à venir. Ouverte : disponible. Une pièce qui ne
 * se vend que sur devis reste en précommande, sans date (rien ne s'achète en
 * ligne).
 */
export function disponibiliteGoogle({
  achetable,
  ouvert,
  maintenant,
}: {
  achetable: boolean;
  ouvert: boolean;
  maintenant: Date;
}): DisponibiliteGoogle {
  if (achetable && ouvert) return { valeur: "InStock" };
  if (achetable && maintenant.getTime() < Date.parse(OUVERTURE_ISO)) {
    return { valeur: "PreOrder", aPartirDu: OUVERTURE_ISO };
  }
  return { valeur: "PreOrder" };
}
