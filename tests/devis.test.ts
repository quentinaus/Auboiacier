/**
 * Le devis en PDF dit exactement ce que le panier facturera : même prix de
 * pièce, même prix de lot, même acompte. Et chaque famille de pièce y décrit
 * ce qui la concerne — l'épaisseur d'un plateau, la puissance d'une toile, la
 * hauteur d'un garde-corps — jamais les caractéristiques d'une autre.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { composerDevis, numeroDevis, photoConfiguration, type EntreeDevis } from "../src/lib/devis.ts";
import { SUR_MESURE, getProduct, prixRemise, resolveSelection } from "../src/lib/products.ts";
import type { Deplacement } from "../src/lib/deplacement.ts";

const DATE = new Date("2026-09-20T10:00:00+02:00");
const ORIGINE = "https://auboiacier.fr";

const nantes: Deplacement = {
  montantCents: 40200,
  distanceKm: 112,
  routeAllerRetourKm: 260,
  heures: 4.5,
  offre: false,
  commune: "Nantes",
  precision: "adresse",
};

function entree(partiel: Partial<EntreeDevis> & Pick<EntreeDevis, "selection">): EntreeDevis {
  return { quantity: 1, date: DATE, locale: "fr", origine: ORIGINE, ...partiel };
}

const labels = (devis: { piece: { caracteristiques: { label: string }[] } }) =>
  devis.piece.caracteristiques.map((c) => c.label);

test("table du catalogue : le prix du devis est celui du panier, l'acompte celui du paiement", () => {
  const selection = { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" };
  const resultat = composerDevis(entree({ selection }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  const attendu = resolveSelection(selection);
  assert.ok(attendu.ok);
  assert.equal(devis.nature, "devis");
  assert.equal(devis.lignes.length, 1);
  assert.equal(devis.lignes[0].unitaire, attendu.line.unitPrice);
  assert.equal(devis.total, attendu.line.unitPrice);
  assert.equal(devis.acompte, Math.round(attendu.line.unitPrice * 0.4 * 100) / 100);
  assert.equal(Math.round((devis.acompte + devis.solde) * 100) / 100, devis.total);
  // Ce qu'une table doit dire.
  const l = labels(devis);
  for (const attendu of ["Dimensions", "Surface du plateau", "Capacité", "Plateau", "Finition du bois", "Piétement"]) {
    assert.ok(l.includes(attendu), `${attendu} manque : ${l.join(", ")}`);
  }
  const plateau = devis.piece.caracteristiques.find((c) => c.label === "Plateau")!;
  assert.match(plateau.value, /Chêne.*premier choix.*45 mm/);
  assert.ok(devis.piece.photo?.startsWith(`${ORIGINE}/images/`), "la photo est une adresse absolue");
  assert.equal(devis.delai, "6 à 8 semaines");
  assert.match(devis.numero, /^D-20260920-[0-9A-Z]{5}$/);
  assert.equal(devis.date, "20 septembre 2026");
  assert.equal(devis.validite, "20 octobre 2026");
});

test("table sur mesure avec pose : la ligne de pose reprend le montant du géocodage", () => {
  const resultat = composerDevis(
    entree({
      selection: { slug: "table-mikado", sizeId: SUR_MESURE, largeurMm: 2600, hauteurMm: 1000, epaisseurMm: 45, woodId: "noyer", metalId: "laiton" },
      hauteurTableMm: 760,
      livraison: { mode: "pose", codePostal: "44000", deplacement: nantes },
    })
  );
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.equal(devis.lignes.length, 2);
  assert.equal(devis.lignes[1].unitaire, 402);
  assert.match(devis.lignes[1].designation, /pose par l'atelier — Nantes \(44000\)/);
  assert.match(devis.lignes[1].details[0], /112 km/);
  assert.equal(devis.total, devis.lignes[0].unitaire + 402);
  const dims = devis.piece.caracteristiques.find((c) => c.label === "Dimensions")!;
  assert.match(dims.value, /260 × 100 cm — H 76 cm/);
  assert.ok(devis.conditions.some((c) => /pose sur rendez-vous/i.test(c)));
  assert.ok(!devis.conditions.some((c) => /au pied du camion/i.test(c)));
});

test("chaise par transporteur : le colis pèse la chaise fois la quantité, pas de plateau", () => {
  const resultat = composerDevis(
    entree({
      selection: { slug: "chaise-acier-bois", metalId: "noir", fabricId: "paon" },
      quantity: 4,
      livraison: { mode: "transporteur", codePostal: "69001", deplacement: { ...nantes, commune: "Lyon", montantCents: 9800, distanceKm: 430 } },
    })
  );
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.equal(devis.lignes[0].quantite, 4);
  assert.equal(devis.lignes[0].total, 4 * 290);
  assert.match(devis.lignes[1].details[0], /36 kg/); // 9 kg × 4
  const l = labels(devis);
  assert.ok(l.includes("Velours") && l.includes("Assise") && l.includes("Structure"));
  assert.ok(!l.includes("Plateau") && !l.includes("Puissance"));
});

test("plafond lumineux sur mesure : surface, puissance et profondeur du caisson", () => {
  const resultat = composerDevis(
    entree({ selection: { slug: "plafond-lumineux-lucarne", sizeId: SUR_MESURE, largeurMm: 2500, hauteurMm: 1400, epaisseurMm: 200, metalId: "blanc" } })
  );
  assert.ok(resultat.ok);
  const c = Object.fromEntries(resultat.devis.piece.caracteristiques.map((x) => [x.label, x.value]));
  assert.equal(c["Surface lumineuse"], "3,5 m²");
  assert.equal(c["Puissance"], "230 W"); // 3,5 m² × 65 W, à 5 W près
  assert.equal(c["Profondeur du caisson"], "200 mm");
  assert.ok(!("Plateau" in c));
});

test("garde-corps × 2 : le prix de lot du panier, la remise dite sur la ligne", () => {
  const selection = {
    slug: "garde-corps",
    sizeId: SUR_MESURE,
    largeurMm: 1200,
    hauteurMm: 1000,
    epaisseurMm: 40,
    woodId: "chene",
    metalId: "noir",
    fabricId: "fonte",
    remplissageId: "verre",
  };
  const resultat = composerDevis(entree({ selection, quantity: 2, note: "1er étage, mur pierre" }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  const plein = resolveSelection(selection);
  assert.ok(plein.ok);
  const lot = getProduct("garde-corps")!.remiseLot!;
  assert.equal(devis.lignes[0].unitaire, prixRemise(plein.line.unitPrice, lot.taux));
  assert.equal(devis.lignes[0].avantRemise, plein.line.unitPrice);
  assert.match(devis.lignes[0].details[0], /remise de 10 %/);
  const c = Object.fromEntries(devis.piece.caracteristiques.map((x) => [x.label, x.value]));
  // toLocaleString met une espace fine insécable entre les milliers.
  assert.equal(c["Largeur entre tableaux"].replace(/\s/g, " "), "1 200 mm");
  assert.equal(c["Relevé du client"], "1er étage, mur pierre");
  // Derrière un verre, pas de rosace.
  assert.ok(!("Rosace" in c));
});

test("garde-corps × 1 : pas de remise, et la rosace se lit avec les croix", () => {
  const resultat = composerDevis(
    entree({
      selection: { slug: "garde-corps", sizeId: SUR_MESURE, largeurMm: 1200, hauteurMm: 400, epaisseurMm: 40, woodId: "chene", metalId: "noir", fabricId: "fonte", remplissageId: "croix" },
    })
  );
  assert.ok(resultat.ok);
  assert.equal(resultat.devis.lignes[0].avantRemise, undefined);
  assert.ok(resultat.devis.piece.caracteristiques.some((c) => c.label === "Rosace"));
});

test("escalier : une estimation, sans acompte ni validité, avec sa réserve", () => {
  const resultat = composerDevis(entree({ selection: { slug: "escalier-limon-central", sizeId: "quart", woodId: "chene", metalId: "noir" }, locale: "en" }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.equal(devis.nature, "estimation");
  assert.equal(devis.total, 8400);
  assert.ok(devis.conditions[0].includes("estimate"));
  const l = labels(devis);
  assert.ok(l.includes("Shape") && l.includes("Treads") && l.includes("Stringer"));
});

test("une configuration impossible ne donne pas de devis", () => {
  assert.equal(composerDevis(entree({ selection: { slug: "inconnue" } })).ok, false);
  assert.equal(composerDevis(entree({ selection: { slug: "table-mikado", sizeId: "p8", woodId: "ebene", metalId: "noir" } })).ok, false);
  assert.equal(
    composerDevis(entree({ selection: { slug: "table-mikado", sizeId: SUR_MESURE, largeurMm: 4000, hauteurMm: 1000, epaisseurMm: 28, woodId: "chene", metalId: "noir" } })).ok,
    false,
    "28 mm sur 4 m : refusé comme sur la fiche"
  );
});

test("le numéro change avec la configuration, pas avec l'heure", () => {
  const base = { selection: { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" }, quantity: 1, date: DATE };
  const a = numeroDevis(base);
  assert.equal(numeroDevis({ ...base, date: new Date("2026-09-20T22:30:00+02:00") }), a);
  assert.notEqual(numeroDevis({ ...base, selection: { ...base.selection, woodId: "noyer" } }), a);
  assert.notEqual(numeroDevis({ ...base, quantity: 2 }), a);
});

test("la photo du devis est celle de la configuration, et jamais un WebP", () => {
  const mikado = getProduct("table-mikado")!;
  const photo = photoConfiguration(mikado, { woodId: "noyer", metalId: "laiton" });
  assert.ok(photo && /noyer/.test(photo) && /laiton/.test(photo), photo);
  assert.match(photo!, /\.(jpe?g|png)$/i);
  const chaise = getProduct("chaise-acier-bois")!;
  const coloris = photoConfiguration(chaise, { fabricId: "paon" });
  assert.ok(coloris === undefined || /\.(jpe?g|png)$/i.test(coloris));
});
