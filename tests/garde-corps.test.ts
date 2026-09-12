/**
 * Le garde-corps de fenêtre.
 *
 * Ce qu'on vérifie : que la hauteur déduite de l'allège fait bien remonter la
 * main courante à un mètre du sol, que la règle ne s'applique qu'où elle
 * s'applique, et que rien de plausible n'est refusé — c'est un aide-mémoire.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculerGardeCorpsFenetre,
  ALLEGE_SANS_OBLIGATION_MM,
  HAUTEUR_CONSEILLEE_MM,
  HAUTEUR_MINI_FABRICATION_MM,
  HAUTEUR_PROTECTION_MM,
  HAUTEUR_PROTECTION_RDC_MM,
  JOUR_MAX_MM,
} from "../src/lib/garde-corps.ts";

test("en étage, la main courante remonte à un mètre du sol", () => {
  for (let allege = 300; allege < ALLEGE_SANS_OBLIGATION_MM; allege += 10) {
    const calcul = calculerGardeCorpsFenetre({ largeurMm: 1200, allegeMm: allege, enEtage: true })!;
    assert.ok(calcul.obligatoire, `${allege} mm d'allège : la règle devrait s'appliquer`);
    // Le garde-corps, posé au plus 110 mm au-dessus de l'appui, atteint le mètre.
    assert.ok(
      allege + calcul.jourMm + calcul.hauteurRetenueMm >= HAUTEUR_PROTECTION_MM,
      `${allege} mm d'allège + ${calcul.jourMm} de jour + ${calcul.hauteurRetenueMm} mm ne font pas un mètre`
    );
    // Et le jour seul ne suffit jamais : la règle ne compte que sur le garde-corps au-dessus de lui.
    assert.ok(allege + JOUR_MAX_MM + calcul.hauteurNormeMm >= HAUTEUR_PROTECTION_MM);
    assert.ok(calcul.jourMm >= 0 && calcul.jourMm <= JOUR_MAX_MM);
    // Et la hauteur qu'on fabrique ne descend jamais sous la règle.
    assert.ok(calcul.mainCouranteMm >= HAUTEUR_PROTECTION_MM);
    assert.equal(calcul.sousLaRegle, false);
  }
});

test("une allège haute n'impose rien, on conseille la hauteur du modèle", () => {
  const calcul = calculerGardeCorpsFenetre({ largeurMm: 1000, allegeMm: 950, enEtage: true })!;
  assert.equal(calcul.obligatoire, false);
  assert.equal(calcul.hauteurNormeMm, HAUTEUR_MINI_FABRICATION_MM);
  assert.equal(calcul.hauteurRetenueMm, HAUTEUR_CONSEILLEE_MM);
});

test("au rez-de-chaussée, la main courante monte à 80 cm du sol", () => {
  for (let allege = 300; allege < HAUTEUR_PROTECTION_RDC_MM; allege += 10) {
    const calcul = calculerGardeCorpsFenetre({ largeurMm: 1000, allegeMm: allege, enEtage: false })!;
    assert.equal(calcul.obligatoire, false);
    assert.equal(calcul.cibleMm, HAUTEUR_PROTECTION_RDC_MM);
    assert.ok(calcul.mainCouranteMm >= HAUTEUR_PROTECTION_RDC_MM, `${allege} mm d'allège : la main courante n'arrive pas à 80 cm`);
    assert.equal(calcul.sousLaRegle, false);
  }
  // 450 mm d'allège : 350 mm de garde-corps, la main courante tombe pile à 800 — la hauteur du modèle.
  const modele = calculerGardeCorpsFenetre({ largeurMm: 1180, allegeMm: 450, enEtage: false })!;
  assert.equal(modele.hauteurRetenueMm, HAUTEUR_CONSEILLEE_MM);
  assert.equal(modele.mainCouranteMm, HAUTEUR_PROTECTION_RDC_MM);
});

test("au rez-de-chaussée, une allège déjà haute garde la hauteur du modèle", () => {
  const calcul = calculerGardeCorpsFenetre({ largeurMm: 1000, allegeMm: 850, enEtage: false })!;
  assert.equal(calcul.hauteurRetenueMm, HAUTEUR_CONSEILLEE_MM);
});

test("une allège basse en étage donne un garde-corps haut, arrondi à la dizaine, posé avec un jour", () => {
  const calcul = calculerGardeCorpsFenetre({ largeurMm: 900, allegeMm: 415, enEtage: true })!;
  assert.equal(calcul.hauteurNormeMm, 480); // 1000 − 415 − 110 = 475 → 480
  assert.equal(calcul.hauteurRetenueMm, 480);
  assert.equal(calcul.jourMm, 105); // ce qui manque pour arriver pile au mètre
  assert.equal(calcul.mainCouranteMm, 1000);
});

test("un garde-corps déjà assez haut se pose sur l'appui, sans jour", () => {
  // 850 d'allège : 350 de garde-corps suffisent largement, aucun jour n'est utile.
  const calcul = calculerGardeCorpsFenetre({ largeurMm: 900, allegeMm: 850, enEtage: true })!;
  assert.equal(calcul.jourMm, 0);
  assert.equal(calcul.mainCouranteMm, 1200);
});

test("la hauteur de la fenêtre dit si le garde-corps tient dans l'ouverture", () => {
  const sans = calculerGardeCorpsFenetre({ largeurMm: 900, allegeMm: 415, enEtage: true })!;
  assert.equal(sans.tientDansLaFenetre, null);
  const haute = calculerGardeCorpsFenetre({ largeurMm: 900, allegeMm: 415, hauteurFenetreMm: 1200, enEtage: true })!;
  assert.equal(haute.tientDansLaFenetre, true);
  // Une fenêtre de 40 cm de haut sur une allège de 41,5 cm : la main courante dépasserait.
  const basse = calculerGardeCorpsFenetre({ largeurMm: 900, allegeMm: 415, hauteurFenetreMm: 400, enEtage: true })!;
  assert.equal(basse.tientDansLaFenetre, false);
});

test("le client peut choisir plus haut que la règle, et c'est son choix qu'on garde", () => {
  const calcul = calculerGardeCorpsFenetre({
    largeurMm: 1180,
    allegeMm: 850,
    enEtage: true,
    hauteurSouhaiteeMm: 450,
  })!;
  assert.equal(calcul.hauteurNormeMm, HAUTEUR_MINI_FABRICATION_MM); // 1000 − 850 = 150, relevé au plancher de fabrication
  assert.equal(calcul.hauteurRetenueMm, 450);
  assert.equal(calcul.sousLaRegle, false);
});

test("le client peut choisir plus bas que la règle : on le dit, on ne refuse pas", () => {
  const calcul = calculerGardeCorpsFenetre({
    largeurMm: 1180,
    allegeMm: 500,
    enEtage: true,
    hauteurSouhaiteeMm: 300,
  })!;
  assert.equal(calcul.hauteurNormeMm, 390); // 1000 − 500 − 110
  assert.equal(calcul.hauteurRetenueMm, 300);
  assert.equal(calcul.sousLaRegle, true);
});

test("sans souhait, on ne fabrique jamais plus bas que le conseil d'atelier", () => {
  // 850 mm d'allège : la règle demande 150 mm, ce qui ne ressemble à rien.
  const calcul = calculerGardeCorpsFenetre({ largeurMm: 1180, allegeMm: 850, enEtage: true })!;
  assert.equal(calcul.hauteurNormeMm, HAUTEUR_MINI_FABRICATION_MM);
  assert.equal(calcul.hauteurRetenueMm, HAUTEUR_CONSEILLEE_MM);
  assert.ok(calcul.hauteurRetenueMm >= HAUTEUR_MINI_FABRICATION_MM);
});

test("une largeur ou une allège illisible ne rend rien, tout le reste passe", () => {
  assert.equal(calculerGardeCorpsFenetre({ largeurMm: Number.NaN, allegeMm: 800, enEtage: true }), null);
  assert.equal(calculerGardeCorpsFenetre({ largeurMm: 1000, allegeMm: -5, enEtage: true }), null);
  for (const largeur of [200, 600, 1200, 2400, 4000]) {
    assert.ok(calculerGardeCorpsFenetre({ largeurMm: largeur, allegeMm: 800, enEtage: true }));
  }
});

/* ---------------------------------------------------------------- *
 *  Le garde-corps en boutique : au barème, sans taille au catalogue.
 * ---------------------------------------------------------------- */
import {
  computeUnitPrice,
  devisSurMesure,
  priceFrom,
  resolveSelection,
  SUR_MESURE,
} from "../src/lib/products.ts";
import { produit } from "./catalogue.ts";

const gardeCorps = produit("garde-corps");
/** Le modèle de la photo, celui dont Quentin a donné le prix. */
const PHOTO = { largeurMm: 1180, hauteurMm: 350 };

test("le garde-corps se commande en ligne à ses cotes, sans taille au catalogue", () => {
  assert.equal(gardeCorps.orderMode, "cart");
  assert.equal(gardeCorps.sizes.length, 0);
  assert.ok(gardeCorps.surMesure, "il lui faut un barème");
  const devis = devisSurMesure(gardeCorps, PHOTO.largeurMm, PHOTO.hauteurMm);
  assert.ok(devis.ok, "le modèle de la photo doit être chiffrable");
  assert.ok(devis.prix > 0 && devis.prix % 10 === 0, "un prix rond, en dizaines d'euros");
});

test("le prix affiché à la fenêtre est celui que le serveur facture, pour chaque bois", () => {
  for (const bois of gardeCorps.woods) {
    const selection = {
      sizeId: SUR_MESURE,
      ...PHOTO,
      epaisseurMm: gardeCorps.surMesure!.epaisseur.refMm,
      woodId: bois.id,
      metalId: gardeCorps.metals[0].id,
      fabricId: gardeCorps.fabrics?.[0]?.id,
      remplissageId: gardeCorps.remplissages![0].id,
    };
    const montre = computeUnitPrice(gardeCorps, selection);
    const resolu = resolveSelection({ slug: gardeCorps.slug, ...selection });
    assert.ok(resolu.ok, `${bois.id} : refusé`);
    assert.equal(montre, resolu.line.unitPrice, `${bois.id} : prix affiché ≠ facturé`);
  }
});

test("le bois de la main courante se paie dans l'ordre : pin, hêtre, chêne, noyer", () => {
  const prix = (woodId: string) =>
    computeUnitPrice(gardeCorps, {
      sizeId: SUR_MESURE,
      ...PHOTO,
      epaisseurMm: gardeCorps.surMesure!.epaisseur.refMm,
      woodId,
      metalId: gardeCorps.metals[0].id,
      fabricId: gardeCorps.fabrics?.[0]?.id,
      remplissageId: gardeCorps.remplissages![0].id,
    })!;
  assert.ok(prix("pin") < prix("hetre"));
  assert.ok(prix("hetre") < prix("chene"));
  assert.ok(prix("chene") < prix("noyer"));
});

test("le « à partir de » du garde-corps est une petite fenêtre, moins chère que la photo", () => {
  const depart = priceFrom(gardeCorps);
  assert.ok(depart !== null && depart > 0, "il faut un prix d'appel");
  const photo = devisSurMesure(gardeCorps, PHOTO.largeurMm, PHOTO.hauteurMm);
  assert.ok(photo.ok && depart <= photo.prix, "le prix d'appel dépasse le modèle de la photo");
});

test("plus la fenêtre est large ou le garde-corps haut, plus c'est cher", () => {
  let precedent = 0;
  for (const [l, h] of [
    [600, 350],
    [1000, 350],
    [1180, 350],
    [1500, 450],
    [2000, 600],
    [3000, 1000],
  ]) {
    const devis = devisSurMesure(gardeCorps, l, h);
    assert.ok(devis.ok, `${l} × ${h} refusé`);
    assert.ok(devis.prix > precedent, `${l} × ${h} : ${devis.prix} € ne dépasse pas ${precedent} €`);
    precedent = devis.prix;
  }
});

/* ---------------------------------------------------------------- *
 *  Le prix de lot : plusieurs fenêtres, une seule commande.
 * ---------------------------------------------------------------- */
import { remiseLot, prixRemise } from "../src/lib/products.ts";

const table = produit("table-brindille");

test("un seul garde-corps se paie plein tarif, deux ou plus sont remisés — même à des cotes différentes", () => {
  const lot = gardeCorps.remiseLot!;
  assert.equal(lot.desPieces, 2);
  const seul = remiseLot([{ product: gardeCorps, unitPrice: 490, quantity: 1 }]);
  assert.equal(seul[0].remise, 0);
  assert.equal(seul[0].prixLot, 490);

  const deux = remiseLot([
    { product: gardeCorps, unitPrice: 490, quantity: 1 },
    { product: gardeCorps, unitPrice: 380, quantity: 1 },
  ]);
  assert.equal(deux[0].remise, lot.taux);
  assert.equal(deux[0].prixLot, prixRemise(490, lot.taux));
  assert.equal(deux[1].prixLot, prixRemise(380, lot.taux));
  assert.ok(deux[0].prixLot < 490 && deux[1].prixLot < 380);

  // Deux exemplaires sur la même ligne comptent aussi.
  const paire = remiseLot([{ product: gardeCorps, unitPrice: 490, quantity: 2 }]);
  assert.equal(paire[0].remise, lot.taux);
});

test("le prix de lot ne touche pas les autres pièces de la commande", () => {
  const lignes = remiseLot([
    { product: gardeCorps, unitPrice: 490, quantity: 2 },
    { product: table, unitPrice: 2000, quantity: 1 },
  ]);
  assert.equal(lignes[1].remise, 0);
  assert.equal(lignes[1].prixLot, 2000);
});

test("le prix remisé est un euro entier", () => {
  for (const prix of [437, 490, 551, 1005]) {
    assert.ok(Number.isInteger(prixRemise(prix, 0.1)));
  }
});

/* ---------------------------------------------------------------- *
 *  Le remplissage et la norme : les croix jusqu'à une hauteur, le verre au-delà.
 * ---------------------------------------------------------------- */
import { remplissageConforme, supplementRemplissage } from "../src/lib/products.ts";

const croix = gardeCorps.remplissages!.find((option) => option.id === "croix")!;
const verre = gardeCorps.remplissages!.find((option) => option.id === "verre")!;
const base = {
  slug: gardeCorps.slug,
  sizeId: SUR_MESURE,
  epaisseurMm: gardeCorps.surMesure!.epaisseur.refMm,
  woodId: "chene",
  metalId: gardeCorps.metals[0].id,
  fabricId: gardeCorps.fabrics?.[0]?.id,
};

test("la rosace se choisit, et se paie comme annoncé", () => {
  const rosaces = gardeCorps.fabrics!;
  assert.ok(rosaces.length >= 2, "plusieurs rosaces au choix");
  const incluse = computeUnitPrice(gardeCorps, { ...base, ...PHOTO, remplissageId: "croix", fabricId: rosaces[0].id })!;
  for (const rosace of rosaces) {
    const prix = computeUnitPrice(gardeCorps, { ...base, ...PHOTO, remplissageId: "croix", fabricId: rosace.id });
    assert.equal(prix, incluse + (rosace.priceDelta ?? 0), `${rosace.id} : l'écart affiché n'est pas facturé`);
    assert.ok(rosace.grain?.startsWith("url("), `${rosace.id} : il lui faut sa photo dans la pastille`);
  }
  assert.equal(resolveSelection({ ...base, ...PHOTO, remplissageId: "croix", fabricId: "rosace-inventee" }).ok, false);
});

test("les croix du modèle sont conformes à la hauteur de la photo, plus à celle d'une baie", () => {
  assert.ok(remplissageConforme(croix, PHOTO.hauteurMm));
  assert.ok(remplissageConforme(croix, croix.hauteurMaxConformeMm!));
  assert.equal(remplissageConforme(croix, croix.hauteurMaxConformeMm! + 10), false);
  // Le verre n'a pas de vide : conforme à toute hauteur.
  assert.ok(remplissageConforme(verre, 1200));
});

test("un garde-corps à croix trop haut pour la norme est refusé par le serveur, le verre passe", () => {
  const trop = croix.hauteurMaxConformeMm! + 100;
  const refuse = resolveSelection({ ...base, largeurMm: 1180, hauteurMm: trop, remplissageId: "croix" });
  assert.equal(refuse.ok, false);
  if (!refuse.ok) assert.equal(refuse.reason, "non_conforme");
  assert.equal(computeUnitPrice(gardeCorps, { ...base, largeurMm: 1180, hauteurMm: trop, remplissageId: "croix" }), null);

  const accepte = resolveSelection({ ...base, largeurMm: 1180, hauteurMm: trop, remplissageId: "verre" });
  assert.ok(accepte.ok);
  if (accepte.ok) {
    assert.ok(/verre|glass/i.test(accepte.line.optionsLabel), "le bon de commande doit dire « verre »");
    assert.equal(
      accepte.line.unitPrice,
      computeUnitPrice(gardeCorps, { ...base, largeurMm: 1180, hauteurMm: trop, remplissageId: "verre" })
    );
  }
});

test("le verre coûte plus que les croix, d'un supplément qui grandit avec la surface", () => {
  const avecCroix = computeUnitPrice(gardeCorps, { ...base, ...PHOTO, remplissageId: "croix" })!;
  const avecVerre = computeUnitPrice(gardeCorps, { ...base, ...PHOTO, remplissageId: "verre" })!;
  assert.equal(avecVerre - avecCroix, supplementRemplissage(verre, PHOTO.largeurMm, PHOTO.hauteurMm));
  assert.ok(avecVerre > avecCroix);
  assert.ok(supplementRemplissage(verre, 2000, 600) > supplementRemplissage(verre, 1180, 350));
  assert.equal(supplementRemplissage(croix, 1180, 350), 0);
});

test("un remplissage inventé ou oublié est refusé", () => {
  assert.equal(resolveSelection({ ...base, ...PHOTO, remplissageId: "bambou" }).ok, false);
  assert.equal(resolveSelection({ ...base, ...PHOTO }).ok, false);
  // Une pièce sans remplissage n'en accepte aucun.
  assert.equal(resolveSelection({ slug: table.slug, sizeId: table.sizes[0].id, woodId: "chene", metalId: table.metals[0]?.id, remplissageId: "croix" }).ok, false);
});
