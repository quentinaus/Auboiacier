/**
 * Le tarif du panier (src/lib/tarif-panier.ts) : LA fonction qui dit ce que
 * Stripe encaissera (/api/commande) et ce que le panier affiche
 * (/api/panier/tarif). Si elle se trompe, les deux se trompent ensemble —
 * mais elles ne peuvent plus diverger.
 *
 * Ce qu'on vérifie : une façon de recevoir la commande, et une seule, dès
 * qu'il y a une pièce (transporteur, pose ou retrait à l'atelier, gratuit) ;
 * la remise de plusieurs garde-corps ; les lignes qui ne se vendent plus
 * (à étudier, hauteur changée) ; le total ; et ce qui part vers le navigateur.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { tarifAffiche, tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC, configurationGC, remiseCommandeGC } from "../src/lib/garde-corps-outil/site.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { prixCommandeGC, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { LIVRAISON, POSE, PRISE_DE_COTES, RETRAIT, tarifLivraison, tarifPose, type ResultatLieu } from "../src/lib/deplacement.ts";
import { getProduct } from "../src/lib/products.ts";

const aKm = (distanceKm: number) => async (): Promise<ResultatLieu> => ({ ok: true, lieu: { distanceKm, commune: "Nantes", precision: "adresse" } });
const tarif = (lignes: unknown, locale: "fr" | "en" = "fr", km = 118.4) => tarifer(lignes, { locale, gc: CALCUL_GC, localiser: aKm(km) });
function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}

const mikado = getProduct("table-mikado")!;
const table = (quantity = 1) => ({ slug: mikado.slug, sizeId: mikado.sizes[0].id, woodId: "chene", metalId: mikado.metals[0].id, quantity });
const garde = (r: Record<string, unknown> = {}, quantity = 1) => ({
  slug: "garde-corps",
  largeurMm: 1180,
  allegeMm: 650,
  enEtage: true,
  fenetreMm: 1400,
  woodId: "chene",
  metalId: "noir",
  fabricId: "fleur",
  remplissageId: "croix",
  quantity,
  ...r,
});
const cfg = (r: { largeurMm?: number; allegeMm?: number; enEtage?: boolean; fenetreMm?: number } = {}, essence = "chene") =>
  configurationGC({ largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400, ...r }, essence) as ConfigGC;

test("une pièce demande une façon de la recevoir ; une livraison sans pièce ne se paie pas", async () => {
  const sans = await tarif([table()]);
  assert.equal(sans.probleme, "mode_livraison", "des pièces, mais ni transporteur, ni pose, ni retrait");
  for (const mode of [{ slug: LIVRAISON, livraisonCp: "44000" }, { slug: POSE, poseCp: "44000" }, { slug: RETRAIT }]) {
    const avec = await tarif([table(), mode]);
    assert.equal(avec.probleme, null, mode.slug);
    assert.ok(avec.mode);
    const orpheline = await tarif([mode]);
    assert.deepEqual(orpheline.refusees, [{ index: 0, raison: "orphelin" }], `${mode.slug} seule : à retirer du panier`);
    assert.equal(orpheline.mode, null);
    assert.equal(orpheline.total, 0);
  }
  // Deux façons à la fois : refusé (un seul trajet par commande).
  assert.equal((await tarif([table(), { slug: RETRAIT }, { slug: POSE, poseCp: "44000" }])).probleme, "invalid");
  assert.equal((await tarif([table(), { slug: RETRAIT }, { slug: RETRAIT }])).probleme, "invalid");
});

test("retrait à l'atelier : gratuit, sans code postal, sans ligne à payer", async () => {
  const t = await tarif([table(2), { slug: RETRAIT, livraisonCp: "75001" }]);
  assert.equal(t.probleme, null);
  assert.deepEqual(t.mode, { index: 1, mode: "retrait" });
  assert.equal(t.total, 2 * t.pieces[0].line.unitPrice);
  const affiche = tarifAffiche(t, "fr");
  const retrait = affiche.lignes.find((l) => l.type === "retrait")!;
  assert.equal(retrait.unitaire, 0);
  assert.match(retrait.nom, /^Retrait à l'atelier/);
  assert.match(tarifAffiche(t, "en").lignes.find((l) => l.type === "retrait")!.nom, /^Collection from the workshop/);
});

test("transporteur et pose : le tarif du site, au code postal ; un code postal faux bloque le paiement", async () => {
  const kg = (await tarif([table(), { slug: RETRAIT }])).pieces[0].line;
  assert.ok(kg);
  const t = await tarif([table(), { slug: LIVRAISON, livraisonCp: "44000" }], "fr", 118.4);
  assert.ok(t.mode?.mode === "transporteur");
  assert.equal(t.mode.deplacement.montantCents, tarifLivraison(118.4, t.mode.kg, Math.max(...mikado.sizes[0].dimsMm!)).montantCents);
  const p = await tarif([table(), { slug: POSE, poseCp: "44000" }], "fr", 118.4);
  assert.ok(p.mode?.mode === "pose");
  assert.equal(p.mode.deplacement.montantCents, tarifPose(118.4).montantCents);
  assert.equal(p.total, p.pieces[0].line.unitPrice + tarifPose(118.4).montantCents / 100);
  // Le vrai géocodage refuse ce qui n'est pas un code postal, sans même appeler l'annuaire.
  const faux = await tarifer([table(), { slug: LIVRAISON, livraisonCp: "abc" }], { locale: "fr", gc: CALCUL_GC });
  assert.equal(faux.probleme, "code_postal");
});

test("plusieurs garde-corps, même à des cotes différentes : la remise de l'outil, une fois pour la commande", async () => {
  chiffrageOuEchec();
  const lignes = [garde({}, 2), garde({ largeurMm: 800, allegeMm: 950, fenetreMm: 0, woodId: "pin" }), { slug: RETRAIT }];
  const t = await tarif(lignes);
  assert.equal(t.probleme, null);
  const attendue = prixCommandeGC([
    { config: cfg(), quantite: 2 },
    { config: cfg({ largeurMm: 800, allegeMm: 950, fenetreMm: 0 }, "pin"), quantite: 1 },
  ]).remise;
  assert.ok(attendue < 0);
  assert.equal(t.remise, attendue);
  assert.equal(t.total, 2 * prixGC(cfg()) + prixGC(cfg({ largeurMm: 800, allegeMm: 950, fenetreMm: 0 }, "pin")) + attendue);
  // Les options du site ne changent pas la remise (elles s'ajoutent au prix de l'outil).
  const avecOptions = await tarif([garde({ fabricId: "medaillon", metalId: "blanc" }, 2), garde({ largeurMm: 800, allegeMm: 950, fenetreMm: 0, woodId: "pin", remplissageId: "verre" }), { slug: RETRAIT }]);
  assert.equal(avecOptions.remise, attendue);
  // Une table dans la même commande ne change rien à la remise des garde-corps.
  const mixte = await tarif([...lignes.slice(0, 2), table(), { slug: RETRAIT }]);
  assert.equal(mixte.remise, attendue);
  // Un seul garde-corps : pas de remise.
  assert.equal((await tarif([garde(), { slug: RETRAIT }])).remise, 0);
  assert.equal(remiseCommandeGC([]), 0);
});

test("un garde-corps à étudier, ou dont la hauteur a changé depuis l'affichage, est refusé", async () => {
  chiffrageOuEchec();
  const etude = await tarif([garde({ largeurMm: 1700 }), { slug: RETRAIT }]);
  assert.deepEqual(etude.refusees, [{ index: 0, raison: "a_etudier" }]);
  const basse = await tarif([garde({ allegeMm: 300, fenetreMm: 500 }), { slug: RETRAIT }]);
  assert.deepEqual(basse.refusees, [{ index: 0, raison: "a_etudier" }]);
  // La hauteur que le panier a affichée est renvoyée à la commande : si elle n'est plus la bonne, refus.
  const bonne = cfg().hauteurMm;
  assert.deepEqual((await tarif([garde({ hauteurMm: bonne }), { slug: RETRAIT }])).refusees, []);
  assert.deepEqual((await tarif([garde({ hauteurMm: bonne + 10 }), { slug: RETRAIT }])).refusees, [{ index: 0, raison: "hauteur" }]);
  // Un relevé illisible : refusé, jamais chiffré au hasard.
  assert.deepEqual((await tarif([garde({ allegeMm: "650" }), { slug: RETRAIT }])).refusees, [{ index: 0, raison: "unknown_size" }]);
  assert.deepEqual((await tarif([garde({ enEtage: undefined }), { slug: RETRAIT }])).refusees, [{ index: 0, raison: "unknown_size" }]);
});

test("la prise de cotes : son créneau est lu, son prix vient du code postal", async () => {
  const sansCreneau = await tarif([{ slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "demain" }]);
  assert.equal(sansCreneau.probleme, "rdv");
  const visite = await tarif([{ slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-10-12|matin", note: "garde-corps" }], "fr", 12);
  assert.equal(visite.probleme, null);
  assert.ok(visite.visite);
  assert.equal(visite.total, visite.visite.deplacement.montantCents / 100);
  // Au-delà de 200 km, l'atelier ne se déplace pas.
  const loin = await tarif([{ slug: PRISE_DE_COTES, priseDeCotesCp: "13001", rdv: "2026-10-12|matin" }], "fr", 600);
  assert.equal(loin.probleme, "code_postal");
});

test("ce qui part vers le navigateur : des noms, des prix de vente, la hauteur retenue — rien d'autre", async () => {
  chiffrageOuEchec();
  const t = await tarif([garde({}, 2), table(), { slug: LIVRAISON, livraisonCp: "44000" }], "en");
  assert.equal(t.probleme, null);
  const affiche = tarifAffiche(t, "en");
  assert.deepEqual(Object.keys(affiche).sort(), ["lignes", "probleme", "refusees", "remise", "total"]);
  const champs = new Set(["index", "type", "nom", "options", "quantite", "unitaire", "image", "hauteurMm"]);
  for (const l of affiche.lignes) {
    for (const cle of Object.keys(l)) assert.ok(champs.has(cle), `champ inattendu vers le navigateur : ${cle}`);
    for (const valeur of Object.values(l)) assert.ok(["string", "number", "undefined"].includes(typeof valeur));
  }
  const gc = affiche.lignes.find((l) => l.type === "piece" && l.hauteurMm !== undefined)!;
  assert.equal(gc.hauteurMm, cfg().hauteurMm);
  assert.match(gc.options, /Custom — 1,180 × 290 mm, 4 crosses/);
  assert.equal(gc.nom, "Rosette Window Railing");
  assert.equal(affiche.total, t.total);
  assert.equal(
    affiche.total,
    Math.round((affiche.lignes.reduce((a, l) => a + l.unitaire * l.quantite, 0) + affiche.remise) * 100) / 100
  );
});
