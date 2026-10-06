/**
 * Le devis en PDF dit exactement ce que le panier facturera : même prix de
 * pièce, même livraison. Et chaque famille de pièce y décrit ce qui la
 * concerne — l'épaisseur d'un plateau, la puissance d'une toile — jamais les
 * caractéristiques d'une autre. Le garde-corps a son propre devis, celui de
 * l'outil de plans : voir devis-garde-corps.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { composerDevis, numeroDevis, photoConfiguration, type EntreeDevis } from "../src/lib/devis.ts";
import { PIECES_RETIREES, SUR_MESURE, getProduct, resolveSelection } from "../src/lib/products.ts";
import { achetables, combinaisonsValides } from "./catalogue.ts";
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

/** Les postes de la pièce : les lignes entre le titre et la livraison, remise comprise. */
const postes = (devis: { lignes: { titre?: boolean; designation: string; quantite: number; unitaire: number; total: number }[] }) =>
  devis.lignes.filter((l) => !l.titre && !/^(Livraison|Carrier delivery|Delivery and installation)/.test(l.designation));

test("table du catalogue : le prix du devis est celui du panier", () => {
  const selection = { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" };
  const resultat = composerDevis(entree({ selection }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  const attendu = resolveSelection(selection);
  assert.ok(attendu.ok);
  assert.equal(devis.nature, "devis");
  // Un titre, puis la pièce poste par poste : plateau, piétement, peinture, huile, visserie.
  assert.ok(devis.lignes[0].titre);
  assert.match(devis.lignes[0].designation, /^Table Mikado — 8 places/);
  const p = postes(devis);
  assert.equal(p.length, 5);
  assert.match(p[0].designation, /^Plateau chêne massif — 200 × 100 cm, 45 mm/);
  assert.match(p[1].designation.replace(/\s/g, " "), /^Piétement acier — Tube d'acier 80 × 80 mm, paroi 3 mm, soudé d'une seule pièce$/);
  assert.match(p[2].designation, /^Finition peinte de l'acier — teinte noir charbon/);
  assert.match(p[3].designation, /huile-cire/);
  assert.match(p[4].designation, /^Visserie, notice de montage et emballage/);
  // La somme des postes vaut exactement le prix du panier.
  assert.equal(p.reduce((somme, l) => somme + l.unitaire, 0), attendu.line.unitPrice);
  assert.ok(p.every((l) => Number.isInteger(l.unitaire) && l.unitaire > 0));
  assert.equal(devis.total, attendu.line.unitPrice);
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
  const pose = devis.lignes[devis.lignes.length - 1];
  assert.equal(pose.unitaire, 402);
  assert.match(pose.designation, /pose par l'atelier — Nantes \(44000\)/);
  assert.match(pose.details[0], /112 km/);
  const piece = resolveSelection({ slug: "table-mikado", sizeId: SUR_MESURE, largeurMm: 2600, hauteurMm: 1000, epaisseurMm: 45, woodId: "noyer", metalId: "laiton" });
  assert.ok(piece.ok);
  assert.equal(postes(devis).reduce((somme, l) => somme + l.unitaire, 0), piece.line.unitPrice);
  // L'écart du noyer est dans le plateau, celui du laiton dans la peinture.
  assert.match(postes(devis)[0].designation, /^Plateau noyer massif — 260 × 100 cm, 45 mm/);
  assert.match(postes(devis)[2].designation, /teinte laiton/);
  assert.equal(devis.total, piece.line.unitPrice + 402);
  const dims = devis.piece.caracteristiques.find((c) => c.label === "Dimensions")!;
  assert.match(dims.value, /260 × 100 cm — H 76 cm/);
  assert.ok(devis.conditions.some((c) => /pose sur rendez-vous/i.test(c)));
  assert.ok(!devis.conditions.some((c) => /au pied du camion/i.test(c)));
});

test("la chaise d'intérieur, retirée de la vente, ne se chiffre plus ; le fauteuil reste", () => {
  assert.ok(PIECES_RETIREES.has("chaise-acier-bois"));
  assert.equal(getProduct("chaise-acier-bois"), undefined);
  assert.ok(!composerDevis(entree({ selection: { slug: "chaise-acier-bois", metalId: "noir", fabricId: "paon" } })).ok);
  assert.ok(!PIECES_RETIREES.has("fauteuil-terrasse"));
  assert.ok(getProduct("fauteuil-terrasse"));
});

test("plafond lumineux sur mesure : surface, puissance et profondeur du caisson", () => {
  const resultat = composerDevis(
    entree({ selection: { slug: "plafond-lumineux-lucarne", sizeId: SUR_MESURE, largeurMm: 2500, hauteurMm: 1400, epaisseurMm: 200, metalId: "blanc" } })
  );
  assert.ok(resultat.ok);
  const p = postes(resultat.devis);
  assert.match(p[0].designation, /^Cadre aluminium laqué blanc — 250 × 140 cm, coupe d'onglet, caisson de 200 mm/);
  assert.match(p[1].designation, /^Toile tendue blanc diffusant — 3,5 m²/);
  assert.match(p[2].designation, /^Éclairage LED 220 V — 230 W/);
  assert.equal(p.reduce((somme, l) => somme + l.unitaire, 0), resultat.devis.total);
  const c = Object.fromEntries(resultat.devis.piece.caracteristiques.map((x) => [x.label, x.value]));
  assert.equal(c["Surface lumineuse"], "3,5 m²");
  assert.equal(c["Puissance"], "230 W"); // 3,5 m² × 65 W, à 5 W près
  assert.equal(c["Profondeur du caisson"], "200 mm");
  assert.ok(!("Plateau" in c));
});

test("le garde-corps n'a pas de devis ici : c'est celui de l'outil de plans, sur le serveur", () => {
  const resultat = composerDevis(
    entree({ selection: { slug: "garde-corps", sizeId: SUR_MESURE, largeurMm: 1200, hauteurMm: 940, woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" } })
  );
  assert.equal(resultat.ok, false);
  assert.equal(resultat.ok === false && resultat.reason, "prix_serveur");
});

test("retrait à l'atelier : pas de ligne de livraison, et la condition du retrait", () => {
  const resultat = composerDevis(entree({ selection: { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" }, livraison: { mode: "retrait" } }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.ok(!devis.lignes.some((l) => /^Livraison/.test(l.designation)));
  assert.equal(devis.total, postes(devis).reduce((somme, l) => somme + l.total, 0));
  assert.ok(devis.conditions.includes("Pièce à retirer à l'atelier, à Saumur, sur rendez-vous."));
  assert.ok(!devis.conditions.some((c) => /au pied du camion|pose sur rendez-vous/i.test(c)));
  const en = composerDevis(entree({ selection: { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" }, livraison: { mode: "retrait" }, locale: "en" }));
  assert.ok(en.ok && en.devis.conditions.some((c) => /collected from the workshop/.test(c)));
  // Et le numéro change avec la façon de recevoir la pièce.
  const transporteur = composerDevis(
    entree({ selection: { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" }, livraison: { mode: "transporteur", codePostal: "44000", deplacement: nantes } })
  );
  assert.ok(transporteur.ok);
  assert.notEqual(transporteur.devis.numero, devis.numero);
});

test("escalier : une estimation, sans validité, avec sa réserve", () => {
  const resultat = composerDevis(entree({ selection: { slug: "escalier-limon-central", sizeId: "quart", woodId: "chene", metalId: "noir" }, locale: "en" }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.equal(devis.nature, "estimation");
  assert.equal(devis.total, 6870);
  const p = postes(devis);
  assert.match(p[0].designation, /^Central stringer/);
  assert.match(p[1].designation, /^Solid oak treads, 50 mm — Quarter turn/);
  assert.equal(p.reduce((somme, l) => somme + l.unitaire, 0), 6870);
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
});

test("en anglais, les options aussi sont en anglais", () => {
  const resultat = composerDevis(entree({ selection: { slug: "table-mikado", sizeId: "p8", woodId: "chene", metalId: "noir" }, locale: "en" }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.match(devis.lignes[0].designation, /^Mikado Table — Seats 8.*· Oak · Charcoal black$/);
  const p = postes(devis);
  assert.match(p[0].designation, /^Solid oak top — 200 × 100 cm, 45 mm/);
  assert.match(p[2].designation, /^Painted finish of the steel — charcoal black/);
  const c = Object.fromEntries(devis.piece.caracteristiques.map((x) => [x.label, x.value]));
  assert.match(c["Top"], /^Oak, solid, first-grade, 45 mm/);
  // Et le piétement extérieur anglais perd bien sa finition, dite sur sa propre ligne.
  const ext = composerDevis(entree({ selection: { slug: "table-mikado-exterieur", sizeId: "p8", metalId: "noir" }, locale: "en" }));
  assert.ok(ext.ok);
  assert.match(postes(ext.devis)[1].designation, /welded in one piece$/);
});

test("un écart d'essence négatif ne fait jamais passer un poste sous zéro", () => {
  // Le pin et le hêtre coûtent moins que le chêne : leur écart fait baisser
  // tous les postes, sans qu'aucun passe sous zéro, et la somme reste le prix.
  for (const product of achetables) {
    for (const options of combinaisonsValides(product).filter((o) => (product.woods.find((w) => w.id === o.woodId)?.priceDelta ?? 0) < 0)) {
      const selection = { slug: product.slug, ...options };
      const resultat = composerDevis(entree({ selection }));
      if (product.orderMode !== "cart") continue;
      assert.ok(resultat.ok, `${product.slug} ${JSON.stringify(options)}`);
      const p = postes(resultat.devis);
      assert.ok(p.every((l) => l.unitaire > 0), `${product.slug} ${JSON.stringify(options)} : ${p.map((l) => l.unitaire).join(", ")}`);
      const plein = resolveSelection(selection);
      assert.ok(plein.ok);
      assert.equal(p.reduce((somme, l) => somme + l.unitaire, 0), plein.line.unitPrice);
    }
  }
});
