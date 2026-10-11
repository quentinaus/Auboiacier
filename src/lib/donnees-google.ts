/**
 * Ce que la fiche produit affiche comme prix, et ce qu'elle annonce à Google
 * (données structurées Product / Offer) : les deux viennent d'ici.
 *
 * Trois règles, que Google vérifie et que les tests vérifient aussi
 * (tests/donnees-google.test.ts) :
 *
 * 1. Google reçoit un prix SEULEMENT si la fiche l'affiche, et c'est le même.
 *    prixAfficheFiche dit ce que le haut de la fiche montre (le « à partir
 *    de » d'une table ou d'un plafond, le « dès X € pour une fenêtre de Y cm »
 *    du garde-corps, ou rien) ; la fiche (product-view.tsx), la description
 *    Google (generateMetadata) et le JSON-LD s'en servent tous les trois. Le
 *    jour où une fiche se met à afficher un prix, Google suit tout seul.
 *    Avant, Google recevait 1 153 € pour la table Mikado quand la page disait
 *    « à partir de 1 480 € », puis 180 € pour un garde-corps et 4 980 € pour
 *    un escalier que la fiche ne chiffrait pas : un écart que Google signale,
 *    et qui peut lui faire retirer le prix des résultats.
 *
 * 2. Pas de prix affiché : pas de bloc Product du tout. Google exige d'un
 *    Product une offre, un avis ou une note ; un bloc sans aucun des trois
 *    est signalé « élément non valide » dans la Search Console. Le fil
 *    d'Ariane, lui, reste.
 *
 * 3. La disponibilité dit vrai. Tant que le panier n'encaisse pas, rien ne
 *    se commande (seulement « Me prévenir ») : on n'envoie aucune
 *    disponibilité — surtout pas PreOrder, qui veut dire « on prend les
 *    commandes maintenant ». Panier ouvert : InStock. MadeToOrder (fabriqué à
 *    la commande) serait plus juste, mais Google ne l'accepte pas : sa liste
 *    (developers.google.com/search/docs/appearance/structured-data/product-snippet
 *    et merchant-listing, vérifiée le 06/10/2026) ne compte que BackOrder,
 *    Discontinued, InStock, InStoreOnly, LimitedAvailability, OnlineOnly,
 *    OutOfStock, PreOrder, PreSale et SoldOut. Le délai de fabrication est dit
 *    sur la page et dans l'e-mail de confirmation.
 *
 * Aucun import du calcul du garde-corps (ce fichier part aussi dans le
 * navigateur, avec product-view.tsx) : la page passe le prix d'appel et la
 * fourchette de l'outil (src/lib/prix-garde-corps.server.ts, la seule porte
 * vers ce calcul). Les tests chargent ce fichier tel quel.
 */
import { devisSurMesure, epaisseurMaxMm, priceFrom, prixParOutil, type Product } from "./products.ts";
import { prixAffiche } from "./ui.ts";

/** Le prix d'appel du garde-corps, calculé par l'outil sur le serveur (prixAppelGC). */
export type PrixAppel = { prix: number; largeurMm: number };

/** Le prix que le haut de la fiche affiche. */
export type PrixFiche =
  /** « À partir de 1 480 € » : la plus petite taille du catalogue, ou les cotes de départ du sur-mesure. */
  | { sorte: "a-partir-de"; prix: number }
  /** « Dès 300 € pour une fenêtre de 100 cm de large » : le garde-corps, pour une fenêtre courante. */
  | { sorte: "appel"; prix: number; largeurMm: number };

/**
 * Ce que le haut de la fiche affiche comme prix, ou null (sur devis).
 * - Une pièce qui se relève (garde-corps, escalier) n'a pas de « à partir
 *   de » avant ses cotes : il se lisait comme le prix de la pièce. Le
 *   garde-corps montre à la place son prix d'appel, s'il est calculé ;
 *   l'escalier, rien.
 * - Les autres : le « à partir de » du catalogue (priceFrom).
 */
export function prixAfficheFiche(product: Product, prixAppel?: PrixAppel | null): PrixFiche | null {
  if (product.releve) {
    return prixAppel && Number.isFinite(prixAppel.prix) && prixAppel.prix > 0
      ? { sorte: "appel", prix: prixAppel.prix, largeurMm: prixAppel.largeurMm }
      : null;
  }
  const prix = priceFrom(product);
  return prix === null ? null : { sorte: "a-partir-de", prix };
}

/**
 * La phrase de prix de la description Google : la phrase même de la fiche.
 * « À partir de 1 480 €. », « Dès 300 € pour une fenêtre de 100 cm de
 * large. », ou, sans prix affiché, « Sur devis. » (« Sur devis, pose
 * comprise. » pour une pièce que l'atelier vient mesurer avant de la poser :
 * priseDeCotes ; une table sur devis se livre, la pose y reste en option).
 *
 * `court` : la même chose en moins de signes (« Dès 300 € (fenêtre de
 * 100 cm). »), pour une description qui dépasserait sinon les 155 signes que
 * Google affiche — il la couperait à la phrase précédente, prix compris. La
 * page ne s'en sert que dans ce cas (generateMetadata).
 */
export function textePrixDescription(product: Product, prix: PrixFiche | null, locale: "fr" | "en", court = false): string {
  if (prix === null) {
    if (product.priseDeCotes) return locale === "fr" ? "Sur devis, pose comprise." : court ? "Quote, fitting included." : "Price on request, fitting included.";
    return locale === "fr" ? "Sur devis." : "Price on request.";
  }
  const montant = prixAffiche(prix.prix, locale);
  if (prix.sorte === "appel") {
    // Les mots de la fiche (product-view.tsx), à l'espace insécable près.
    const cm = prix.largeurMm / 10;
    if (court) return locale === "fr" ? `Dès ${montant} (fenêtre de ${cm} cm).` : `From ${montant} (${cm} cm window).`;
    return locale === "fr" ? `Dès ${montant} pour une fenêtre de ${cm} cm de large.` : `From ${montant} for a window ${cm} cm wide.`;
  }
  return locale === "fr" ? `À partir de ${montant}.` : `From ${montant}.`;
}

/** Ce que Google reçoit comme fourchette de prix, en euros. */
export type FourchetteGoogle = { prixMin: number; prixMax: number };

/** La disponibilité envoyée à Google (valeur schema.org, sans le préfixe), ou null : rien ne se commande encore. */
export type DisponibiliteGoogle = "InStock" | null;

/**
 * La fourchette annoncée à Google pour une fiche, ou undefined : pas d'offre,
 * et alors pas de bloc Product (règle 2).
 * - `prix` : ce que la fiche affiche (prixAfficheFiche). Son montant est le
 *   prix bas, à l'euro près.
 * - `fourchetteOutil` : celle du garde-corps, calculée par l'outil de plans
 *   (fourchetteGC) ; seul son haut sert, et pour le garde-corps seulement.
 * Le haut de la fourchette couvre ce qu'on vend vraiment : la plus grande
 * taille du catalogue ou du sur-mesure, dans l'essence la plus chère.
 */
export function fourchetteGoogle(
  product: Product,
  prix: PrixFiche | null,
  fourchetteOutil?: FourchetteGoogle | null
): FourchetteGoogle | undefined {
  if (prix === null || !Number.isFinite(prix.prix) || prix.prix <= 0) return undefined;
  const bas = prix.prix;
  let haut = bas;
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
  return { prixMin: bas, prixMax: haut };
}

/**
 * La disponibilité annoncée à Google (règle 3).
 * - `achetable` : la pièce se commande au panier (orderMode « cart ») ;
 * - `ouvert` : le panier encaisse (commandesOuvertes()).
 * Les deux : InStock. Sinon rien — ni PreOrder, ni date d'ouverture : avant
 * l'ouverture, le panier ne fait que noter « Me prévenir ».
 */
export function disponibiliteGoogle({ achetable, ouvert }: { achetable: boolean; ouvert: boolean }): DisponibiliteGoogle {
  return achetable && ouvert ? "InStock" : null;
}
