/**
 * La Garantie cotes (src/lib/garantie-cotes.ts, décision de Quentin du 09/10/2026) :
 * une option payante du panier, pour le client qui se serait trompé dans ses cotes.
 *
 * Ce qu'on vérifie : son prix (8 %, arrondi à l'euro supérieur, 29 à 99 € par
 * pièce), les pièces qui peuvent la recevoir, le serveur qui la chiffre seul et
 * refuse ce qui est forgé (une garantie sur une chaise, un montant venu du
 * navigateur), la case décochée par défaut, et les textes (CGV, FAQ) dans les
 * deux langues — sans jamais le mot « assurance ».
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { eligibleGarantieCotes, libelleGarantieCotes, prixGarantieCotes } from "../src/lib/garantie-cotes.ts";
import { tarifAffiche, tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC } from "../src/lib/garde-corps-outil/site.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { LIVRAISON, POSE, PRISE_DE_COTES, RETRAIT, type ResultatLieu } from "../src/lib/deplacement.ts";
import { getProduct, products } from "../src/lib/products.ts";
import { remplacerMarqueurs } from "../src/lib/marqueurs.ts";

const aKm = (distanceKm: number) => async (): Promise<ResultatLieu> => ({ ok: true, lieu: { distanceKm, commune: "Nantes", precision: "adresse" } });
const tarif = (lignes: unknown, locale: "fr" | "en" = "fr") => tarifer(lignes, { locale, gc: CALCUL_GC, localiser: aKm(40) });

const mikado = getProduct("table-mikado")!;
const table = (r: Record<string, unknown> = {}, quantity = 1) => ({ slug: mikado.slug, sizeId: mikado.sizes[0].id, woodId: "chene", metalId: mikado.metals[0].id, quantity, ...r });
const garde = (r: Record<string, unknown> = {}) => ({
  slug: "garde-corps",
  largeurMm: 1180,
  allegeMm: 650,
  enEtage: true,
  fenetreMm: 1400,
  woodId: "chene",
  metalId: "noir",
  fabricId: "fleur",
  remplissageId: "croix",
  quantity: 1,
  ...r,
});

test("prix : 8 % de la pièce, arrondi à l'euro supérieur, entre 29 et 99 € par pièce", () => {
  assert.equal(prixGarantieCotes(100), 29);
  assert.equal(prixGarantieCotes(362.5), 29, "8 % = 29 € tout rond : pas d'arrondi flottant à 30");
  assert.equal(prixGarantieCotes(363), 30, "8 % = 29,04 € → 30 €");
  assert.equal(prixGarantieCotes(1237.5), 99);
  assert.equal(prixGarantieCotes(1250), 99);
  assert.equal(prixGarantieCotes(5000), 99);
  assert.equal(prixGarantieCotes(500), 40);
  for (let p = 1; p <= 3000; p += 7.5) {
    const g = prixGarantieCotes(p);
    assert.ok(Number.isInteger(g) && g >= 29 && g <= 99, `${p} € → ${g} €`);
  }
});

test("pièces éligibles : celles dont le client donne les cotes et qui s'achètent au panier", () => {
  const eligibles = products.filter(eligibleGarantieCotes).map((p) => p.famille);
  for (const famille of eligibles) assert.ok(["garde-corps", "portail", "plafond", "table-interieur", "table-exterieur"].includes(famille), famille);
  for (const slug of ["garde-corps", "garde-corps-forge-volutes", "table-mikado", "table-resine-mikado", "table-mikado-exterieur", "plafond-lumineux-halo", "plafond-lumineux-lucarne"]) {
    assert.ok(eligibleGarantieCotes(getProduct(slug)!), slug);
  }
  // L'escalier (sur devis, l'atelier mesure), le fauteuil (taille unique) : non.
  for (const slug of ["escalier-limon-central", "fauteuil-terrasse"]) assert.ok(!eligibleGarantieCotes(getProduct(slug)!), slug);
  // Aucune pièce sur devis, quelle que soit sa famille (les portails le sont aujourd'hui).
  for (const p of products.filter((p) => p.orderMode === "quote")) assert.ok(!eligibleGarantieCotes(p), p.slug);
  assert.ok(eligibleGarantieCotes({ famille: "portail", orderMode: "cart" }), "un portail vendu au panier pourra la recevoir");
});

test("le serveur la chiffre : décochée, rien ; cochée, son prix dans le total ; affichée au panier", async () => {
  const sans = await tarif([table(), { slug: RETRAIT }]);
  assert.equal(sans.probleme, null);
  const piece = sans.pieces[0];
  assert.equal(piece.garantie, false, "décochée par défaut");
  assert.equal(piece.garantiePrix, prixGarantieCotes(piece.line.unitPrice));
  const avec = await tarif([table({ garantieCotes: true }, 2), { slug: RETRAIT }]);
  assert.equal(avec.probleme, null);
  assert.equal(avec.pieces[0].garantie, true);
  assert.equal(avec.total, 2 * (piece.line.unitPrice + piece.garantiePrix!));
  const affiche = tarifAffiche(avec, "fr");
  const ligne = affiche.lignes.find((l) => l.type === "piece")!;
  assert.equal(ligne.garantiePrix, piece.garantiePrix);
  assert.equal(ligne.garantie, true);
  // Une ligne non éligible (le retrait) ne porte rien.
  assert.equal(affiche.lignes.find((l) => l.type === "retrait")!.garantiePrix, undefined);
  assert.equal(libelleGarantieCotes("Table Mikado", "fr"), "Garantie cotes — Table Mikado");
  assert.equal(libelleGarantieCotes("Mikado Table", "en"), "Measurement guarantee — Mikado Table");
});

test("un garde-corps la reçoit, au prix de sa ligne", async () => {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente : copier .env.chiffrage.local.");
  const t = await tarif([garde({ garantieCotes: true }), { slug: RETRAIT }]);
  assert.equal(t.probleme, null);
  assert.equal(t.pieces[0].garantiePrix, prixGarantieCotes(t.pieces[0].line.unitPrice));
  assert.equal(t.total, t.pieces[0].line.unitPrice + t.pieces[0].garantiePrix! + t.remise);
});

test("refusé : une garantie sur ce qui ne peut pas la recevoir, ou un montant venu du navigateur", async () => {
  const fauteuil = getProduct("fauteuil-terrasse")!;
  const ligneFauteuil = (r: Record<string, unknown> = {}) => ({
    slug: fauteuil.slug,
    sizeId: fauteuil.sizes[0]?.id,
    woodId: fauteuil.woods[0]?.id,
    metalId: fauteuil.metals[0]?.id,
    fabricId: fauteuil.fabrics?.[0]?.id,
    quantity: 1,
    ...r,
  });
  const sansGarantie = await tarif([ligneFauteuil(), { slug: RETRAIT }]);
  assert.notEqual(sansGarantie.probleme, "invalid", "le fauteuil seul est commandable");
  assert.equal(sansGarantie.pieces.length, 1);
  assert.equal(sansGarantie.pieces[0].garantiePrix, null);
  assert.equal((await tarif([ligneFauteuil({ garantieCotes: true }), { slug: RETRAIT }])).probleme, "invalid");
  // Sur une livraison, une pose, un retrait, une visite : refusé.
  for (const service of [{ slug: RETRAIT }, { slug: LIVRAISON, livraisonCp: "44000" }, { slug: POSE, poseCp: "44000" }, { slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-12-14|matin" }]) {
    assert.equal((await tarif([table(), { ...service, garantieCotes: true }])).probleme, "invalid", service.slug);
  }
  // Un montant, un texte, un nombre à la place du oui : refusé.
  for (const forge of [29, 1, "true", "29", { prix: 1 }, [true]]) {
    assert.equal((await tarif([table({ garantieCotes: forge }), { slug: RETRAIT }])).probleme, "invalid", JSON.stringify(forge));
  }
  // Un prix glissé à côté n'est jamais lu : le serveur garde le sien.
  const glisse = await tarif([table({ garantieCotes: true, garantiePrix: 1, prixGarantie: 1, unitPrice: 1 }), { slug: RETRAIT }]);
  assert.equal(glisse.probleme, null);
  assert.equal(glisse.pieces[0].garantiePrix, prixGarantieCotes(glisse.pieces[0].line.unitPrice));
  assert.ok(glisse.pieces[0].garantiePrix! >= 29);
  // false et null valent « non ».
  for (const non of [false, null]) {
    const t = await tarif([table({ garantieCotes: non }), { slug: RETRAIT }]);
    assert.equal(t.probleme, null);
    assert.equal(t.pieces[0].garantie, false);
  }
});

test("au panier : la case est décochée par défaut, et seul un oui part vers le serveur", () => {
  const vue = readFileSync(new URL("../src/components/cart-view.tsx", import.meta.url), "utf8");
  const panier = readFileSync(new URL("../src/lib/cart.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(vue, /defaultChecked/);
  assert.match(vue, /checked=\{items\.find\(\(item\) => item\.id === line\.id\)\?\.garantieCotes === true\}/);
  assert.match(vue, /garantieCotes: item\.garantieCotes === true \? true : undefined/);
  assert.doesNotMatch(vue, /garantiePrix:\s*item\./, "aucun prix de garantie lu dans le stockage du navigateur");
  // L'ajout au panier depuis une fiche ne la coche jamais.
  assert.doesNotMatch(panier, /garantieCotes: true,/);
  // La route de paiement prend le prix calculé par tarifer, jamais celui de la requête.
  const route = readFileSync(new URL("../src/app/api/commande/route.ts", import.meta.url), "utf8");
  assert.match(route, /unit_amount: piece\.garantiePrix \* 100/);
  assert.doesNotMatch(route, /body\.[a-zA-Z]*[Gg]arantie/);
});

test("CGV et FAQ : la garantie commerciale dans les deux langues, avec les mentions de l'article L217-22", () => {
  for (const [dict, langue] of [[fr, "fr"], [en, "en"]] as const) {
    const d = remplacerMarqueurs(dict, langue);
    const sections = d.cgv.sections;
    const derniere = sections[sections.length - 1];
    assert.equal("id" in derniere ? derniere.id : undefined, "garantie-cotes", "en fin de liste : les ancres et les index existants ne bougent pas");
    assert.match(derniere.title, /^13\. /);
    assert.equal(sections.filter((s) => "id" in s && s.id === "garantie-cotes").length, 1);
    if (langue === "fr") {
      assert.match(derniere.title, /Contrat de garantie commerciale/i, "art. D217-2 : intitulé « contrat de garantie commerciale »");
      assert.match(derniere.body, /sans préjudice du droit pour le consommateur de bénéficier de la garantie légale de conformité/);
      assert.match(derniere.body, /L217-3 et suivants/);
      assert.match(derniere.body, /articles 1641 à 1649 du code civil/);
      assert.match(derniere.body, /en sus des droits/);
      assert.match(derniere.body, /15 jours/);
      assert.match(derniere.body, /France métropolitaine/);
      assert.match(derniere.body, /8 %/);
      assert.match(derniere.body, /29 €/);
      assert.match(derniere.body, /99 €/);
      assert.match(derniere.body, /exclusions/);
      assert.match(derniere.body, /L221-28 3°/);
    } else {
      assert.match(derniere.title, /commercial guarantee contract/i);
      assert.match(derniere.body, /without prejudice to the consumer's right to benefit from the legal warranty of conformity/);
      assert.match(derniere.body, /1641 to 1649/);
      assert.match(derniere.body, /8%/);
      assert.match(derniere.body, /€29/);
      assert.match(derniere.body, /€99/);
    }
    assert.ok(d.cgv.garantLabel);
    const faq = d.faq.items.find((i) => "id" in i && i.id === "erreur-cotes");
    assert.ok(faq, "la question de la FAQ");
    assert.match(faq.q, langue === "fr" ? /me trompe dans mes cotes/ : /measurements are wrong/);
    assert.doesNotMatch(faq.a, /\{[a-zA-Z]+\}/, "tous les marqueurs remplacés");
    assert.match(faq.a, langue === "fr" ? /Garantie cotes/ : /Measurement guarantee/);
    // Les textes de la Garantie cotes : jamais « assurance » / « insurance » (un produit réglementé).
    const textes = [derniere.title, derniere.body, d.cgv.garantLabel, faq.q, faq.a, d.faq.garantieLien, d.panier.garantieAjouter, d.panier.garantieTexte, d.panier.garantieLien, d.panier.garantieRecap].join("\n");
    assert.doesNotMatch(textes, /assur|insur/i);
    assert.match(d.panier.garantieAjouter, /\{prix\}/);
  }
});
