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

/** Les postes de la pièce : les lignes entre le titre et la livraison, remise comprise. */
const postes = (devis: { lignes: { titre?: boolean; designation: string; quantite: number; unitaire: number; total: number }[] }) =>
  devis.lignes.filter((l) => !l.titre && !/^(Livraison|Carrier delivery|Delivery and installation)/.test(l.designation));

test("table du catalogue : le prix du devis est celui du panier, l'acompte celui du paiement", () => {
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
  const p = postes(devis);
  assert.ok(p.every((l) => l.quantite === 4 && l.total === 4 * l.unitaire));
  assert.equal(p.reduce((somme, l) => somme + l.total, 0), 4 * 145);
  assert.match(p[1].designation, /^Assise garnie — mousse haute densité, velours Paon/);
  const livraison = devis.lignes[devis.lignes.length - 1];
  assert.match(livraison.details[0], /36 kg/); // 9 kg × 4
  const l = labels(devis);
  assert.ok(l.includes("Velours") && l.includes("Assise") && l.includes("Structure"));
  assert.ok(!l.includes("Plateau") && !l.includes("Puissance"));
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
  const p = postes(devis);
  // Les postes au plein prix, dont le verre sur sa ligne ; la remise de lot en négatif.
  const remise = p[p.length - 1];
  assert.match(remise.designation, /^Prix de lot — remise de 10 %/);
  assert.equal(remise.unitaire, prixRemise(plein.line.unitPrice, lot.taux) - plein.line.unitPrice);
  assert.ok(remise.unitaire < 0);
  assert.equal(p.slice(0, -1).reduce((somme, l) => somme + l.unitaire, 0), plein.line.unitPrice);
  assert.match(p[0].designation, /cadre soudé recevant le verre/);
  assert.ok(p.some((l) => /^Panneau de verre feuilleté/.test(l.designation)));
  assert.equal(p.reduce((somme, l) => somme + l.total, 0), 2 * prixRemise(plein.line.unitPrice, lot.taux));
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
  const p = postes(resultat.devis);
  assert.ok(!p.some((l) => /Prix de lot/.test(l.designation)));
  assert.match(p[0].designation, /croix de Saint-André et rosaces médaillon fleur, fonte ø100/i);
  assert.ok(!p.some((l) => /verre/i.test(l.designation)));
  assert.ok(resultat.devis.piece.caracteristiques.some((c) => c.label === "Rosace"));
});

test("escalier : une estimation, sans acompte ni validité, avec sa réserve", () => {
  const resultat = composerDevis(entree({ selection: { slug: "escalier-limon-central", sizeId: "quart", woodId: "chene", metalId: "noir" }, locale: "en" }));
  assert.ok(resultat.ok);
  const { devis } = resultat;
  assert.equal(devis.nature, "estimation");
  assert.equal(devis.total, 8400);
  const p = postes(devis);
  assert.match(p[0].designation, /^Central stringer/);
  assert.match(p[1].designation, /^Solid oak treads, 50 mm — Quarter turn/);
  assert.equal(p.reduce((somme, l) => somme + l.unitaire, 0), 8400);
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
  for (const [largeurMm, hauteurMm] of [[1180, 350], [800, 350], [200, 200]] as const) {
    for (const woodId of ["pin", "hetre"]) {
      const resultat = composerDevis(
        entree({ selection: { slug: "garde-corps", sizeId: SUR_MESURE, largeurMm, hauteurMm, epaisseurMm: 40, woodId, metalId: "noir", fabricId: "fleur", remplissageId: "croix" } })
      );
      assert.ok(resultat.ok);
      const p = postes(resultat.devis);
      assert.ok(p.every((l) => l.unitaire > 0), `${largeurMm} × ${hauteurMm} en ${woodId} : ${p.map((l) => l.unitaire).join(", ")}`);
      const plein = resolveSelection({ slug: "garde-corps", sizeId: SUR_MESURE, largeurMm, hauteurMm, epaisseurMm: 40, woodId, metalId: "noir", fabricId: "fleur", remplissageId: "croix" });
      assert.ok(plein.ok);
      assert.equal(p.reduce((somme, l) => somme + l.unitaire, 0), plein.line.unitPrice);
    }
  }
});

test("l'acier brut verni n'a pas de ligne « finition peinte »", () => {
  const resultat = composerDevis(
    entree({ selection: { slug: "garde-corps", sizeId: SUR_MESURE, largeurMm: 1180, hauteurMm: 350, epaisseurMm: 40, woodId: "chene", metalId: "brut", fabricId: "fleur", remplissageId: "croix" } })
  );
  assert.ok(resultat.ok);
  const p = postes(resultat.devis);
  assert.ok(p.some((l) => /^Finition de l'acier — brut, vernis/.test(l.designation)));
  assert.ok(!p.some((l) => /peinte/.test(l.designation)));
});

test("sous un panneau de verre, une rosace forgée ne se paie pas", () => {
  const base = { slug: "garde-corps", sizeId: SUR_MESURE, largeurMm: 1180, hauteurMm: 350, epaisseurMm: 40, woodId: "chene", metalId: "noir", remplissageId: "verre" };
  const fleur = resolveSelection({ ...base, fabricId: "fleur" });
  const medaillon = resolveSelection({ ...base, fabricId: "medaillon" });
  assert.ok(fleur.ok && medaillon.ok);
  assert.equal(medaillon.line.unitPrice, fleur.line.unitPrice);
  const devis = composerDevis(entree({ selection: { ...base, fabricId: "medaillon" } }));
  assert.ok(devis.ok);
  assert.ok(!/Médaillon/.test(devis.devis.lignes[0].designation));
});

