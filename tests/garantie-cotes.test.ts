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
import { contratEnTexte, contratGarantieCotes } from "../src/lib/garantie-cotes-contrat.ts";
import { composerConfirmation } from "../src/lib/confirmation.ts";
import { formatLines } from "../src/lib/lignes-commande.ts";
import type Stripe from "stripe";

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

test("pas de Garantie cotes quand l'atelier mesure (prise de cotes à domicile) ou pose lui-même", async () => {
  const visite = { slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-12-14|matin" };
  const pose = { slug: POSE, poseCp: "44000" };
  for (const [service, raison] of [[visite, "visite"], [pose, "pose"]] as const) {
    const lignes = (garantieCotes?: boolean) => (service === visite ? [table({ garantieCotes }), visite, { slug: RETRAIT }] : [table({ garantieCotes }), pose]);
    // Décochée : la commande passe, mais aucune case n'est proposée, et le panier sait dire pourquoi.
    const sans = await tarif(lignes());
    assert.equal(sans.probleme, null, raison);
    assert.equal(sans.pieces[0].garantiePrix, null, raison);
    assert.equal(sans.garantieExclue, raison);
    assert.equal(tarifAffiche(sans, "fr").lignes.find((l) => l.type === "piece")!.garantiePrix, undefined);
    // Cochée : /api/commande (strict) refuse ; le panier (souple) la signale pour la décocher, sans la compter.
    assert.equal((await tarif(lignes(true))).probleme, "invalid", raison);
    const souple = await tarifer(lignes(true), { locale: "fr", gc: CALCUL_GC, localiser: aKm(40), garantieSouple: true });
    assert.equal(souple.probleme, null, raison);
    assert.deepEqual(souple.garantiesRefusees, [0]);
    assert.equal(souple.pieces[0].garantie, false);
    assert.equal(souple.total, sans.total, "rien de compté");
    assert.deepEqual(tarifAffiche(souple, "fr").garantiesRefusees, [0]);
  }
  // Livraison par transporteur ou retrait : proposée, rien d'exclu.
  const transporteur = await tarif([table(), { slug: LIVRAISON, livraisonCp: "44000" }]);
  assert.equal(transporteur.garantieExclue, null);
  assert.ok(transporteur.pieces[0].garantiePrix);
  // Sans pièce éligible (le fauteuil seul), rien à expliquer.
  const fauteuil = getProduct("fauteuil-terrasse")!;
  const seul = await tarif([{ slug: fauteuil.slug, sizeId: fauteuil.sizes[0]?.id, woodId: fauteuil.woods[0]?.id, metalId: fauteuil.metals[0]?.id, fabricId: fauteuil.fabrics?.[0]?.id, quantity: 1 }, pose]);
  assert.equal(seul.garantieExclue, null);
});

test("panier : une garantie non éligible restée cochée ne bloque pas le panier, elle est décochée", async () => {
  const fauteuil = getProduct("fauteuil-terrasse")!;
  const ligne = { slug: fauteuil.slug, sizeId: fauteuil.sizes[0]?.id, woodId: fauteuil.woods[0]?.id, metalId: fauteuil.metals[0]?.id, fabricId: fauteuil.fabrics?.[0]?.id, quantity: 1, garantieCotes: true };
  const souple = await tarifer([table(), ligne, { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser: aKm(40), garantieSouple: true });
  assert.equal(souple.probleme, null);
  assert.deepEqual(souple.garantiesRefusees, [1]);
  assert.equal((await tarif([table(), ligne, { slug: RETRAIT }])).probleme, "invalid", "le paiement, lui, refuse");
  // La route du panier est souple, celle du paiement ne l'est pas.
  const routePanier = readFileSync(new URL("../src/app/api/panier/tarif/route.ts", import.meta.url), "utf8");
  const routeCommande = readFileSync(new URL("../src/app/api/commande/route.ts", import.meta.url), "utf8");
  assert.match(routePanier, /garantieSouple: true/);
  assert.doesNotMatch(routeCommande, /garantieSouple/);
});

test("les textes ne citent que des familles où la garantie s'achète vraiment", () => {
  const familles = { "garde-corps": /garde-corps|railing/i, plafond: /plafond|ceiling/i, table: /table/i, portail: /portail|portillon|\bgates?\b/i };
  const achetables = new Set<string>(products.filter(eligibleGarantieCotes).map((p) => (p.famille.startsWith("table") ? "table" : p.famille)));
  for (const [dict, langue] of [[fr, "fr"], [en, "en"]] as const) {
    const d = remplacerMarqueurs(dict, langue);
    const article = d.cgv.sections.find((s) => "id" in s && s.id === "garantie-cotes")!;
    const faq = d.faq.items.find((i) => "id" in i && i.id === "erreur-cotes")!;
    // La phrase qui dit où elle est proposée (premier paragraphe de l'article) et la réponse de la FAQ.
    for (const texte of [article.body.split("\n\n")[0], faq.a]) {
      for (const [famille, motif] of Object.entries(familles)) {
        if (motif.test(texte)) assert.ok(achetables.has(famille), `${langue} : « ${famille} » cité, mais aucune pièce de cette famille ne peut la recevoir`);
      }
    }
    // La phrase sous la case dit les limites qui pèsent : une fois, 15 jours, pièce non posée, renvoi à la charge du client.
    const sousCase = d.panier.garantieTexte;
    if (langue === "fr") {
      for (const m of [/une fois/, /15 jours/, /non posée/, /renvoi à votre charge/]) assert.match(sousCase, m);
      assert.match(article.body, /prise de cotes à domicile/);
      assert.match(article.body, /pose par l'atelier/);
      assert.match(article.body, /dans les mentions légales et ci-dessous/);
    } else {
      for (const m of [/once/, /15 days/, /not fitted/, /return shipping at your expense/]) assert.match(sousCase, m);
      assert.match(article.body, /home measuring visit/);
      assert.match(article.body, /in the legal notice and below/);
    }
    assert.doesNotMatch([d.panier.garantieExclueVisite, d.panier.garantieExcluePose, sousCase].join(" "), /assur|insur/i);
  }
});

/* ---- Le contrat remis sur support durable (art. L217-22) ---- */

const sessionGarantie = (metadata: Record<string, string>) =>
  ({
    id: "cs_test_g",
    created: 1_790_944_320,
    amount_total: 186_500,
    payment_intent: "pi_test_g",
    metadata: { order_ref: "AB-GAR123", locale: "fr", ...metadata },
    customer_details: { name: "Camille Bertrand", email: "camille@exemple.fr", phone: null, address: null },
    collected_information: null,
    total_details: { amount_discount: 0 },
  }) as unknown as Stripe.Checkout.Session;
const lignesGarantie = [
  { description: "Table Mikado — Chêne · Noir charbon", quantity: 1, amount_total: 174_000, amount_subtotal: 174_000, price: { unit_amount: 174_000 } },
  { description: "Garantie cotes — Table Mikado", quantity: 1, amount_total: 9_900, amount_subtotal: 9_900, price: { unit_amount: 9_900 } },
] as unknown as Stripe.LineItem[];

test("contrat : l'article 13 entier, le garant et l'encadré légal, dans les deux langues", () => {
  for (const [dict, langue] of [[fr, "fr"], [en, "en"]] as const) {
    const cgv = remplacerMarqueurs(dict, langue).cgv;
    const contrat = contratGarantieCotes(cgv);
    const article = cgv.sections.find((s) => "id" in s && s.id === "garantie-cotes")!;
    assert.equal(contrat.length, 2);
    assert.equal(contrat[0].titre, article.title);
    assert.ok(contrat[0].texte.startsWith(article.body), "l'article en entier, tel quel");
    assert.match(contrat[0].texte, new RegExp(`${cgv.garantLabel} : Auboiacier`));
    assert.match(contrat[0].texte, /auboiacier@gmail\.com/);
    assert.equal(contrat[1].titre, cgv.garantieTitle);
    assert.equal(contrat[1].texte, cgv.garantieBody, "l'encadré officiel, sans rien y changer");
    const texte = contratEnTexte(contrat);
    assert.ok(texte.includes(article.body) && texte.includes(cgv.garantieBody));
  }
});

test("confirmation : avec la Garantie cotes, le contrat est reproduit en fin de document ; sans, rien ne change", () => {
  const contrat = contratGarantieCotes(remplacerMarqueurs(fr, "fr").cgv);
  const avec = composerConfirmation({ session: sessionGarantie({ garantie_cotes: "1" }), lignes: lignesGarantie, origine: "https://auboiacier.fr", contratGarantie: contrat });
  assert.deepEqual(avec.annexes, contrat);
  assert.ok(avec.conditions.some((c) => /Garantie cotes/.test(c) && /reproduits en entier/.test(c)));
  assert.ok(avec.lignes.some((l) => l.designation === "Garantie cotes" && l.details.includes("Table Mikado") && l.total === 99));
  // Le contrat fait partie du document scellé : un autre texte, une autre empreinte.
  const autre = composerConfirmation({
    session: sessionGarantie({ garantie_cotes: "1" }),
    lignes: lignesGarantie,
    origine: "https://auboiacier.fr",
    contratGarantie: [{ ...contrat[0], texte: contrat[0].texte + " (modifié)" }, contrat[1]],
  });
  assert.notEqual(autre.acceptation!.empreinte, avec.acceptation!.empreinte);
  // Sans garantie achetée : pas d'annexe, même si on en passe une, et la même empreinte qu'avant.
  const sans = composerConfirmation({ session: sessionGarantie({}), lignes: lignesGarantie.slice(0, 1), origine: "https://auboiacier.fr", contratGarantie: contrat });
  const sansContrat = composerConfirmation({ session: sessionGarantie({}), lignes: lignesGarantie.slice(0, 1), origine: "https://auboiacier.fr" });
  assert.equal(sans.annexes, undefined);
  assert.equal(sans.acceptation!.empreinte, sansContrat.acceptation!.empreinte);
  assert.ok(!sans.conditions.some((c) => /Garantie cotes/.test(c)));
  // L'e-mail de l'acheteur et le PDF reçoivent ce contrat, et la page du PDF de confirmation aussi.
  const email = readFileSync(new URL("../src/lib/order-email.ts", import.meta.url), "utf8");
  assert.match(email, /contratEnTexte\(contratGarantie\)/);
  assert.match(email, /confirmationJointe\(session, lines, locale, ref, contratGarantie\)/);
  const route = readFileSync(new URL("../src/app/api/commande/confirmation/route.ts", import.meta.url), "utf8");
  assert.match(route, /contratGarantie: await contratDeLaCommande\(session\)/);
});

test("bon de commande : la ligne « Garantie cotes — <pièce> » de Stripe s'imprime avec son montant", () => {
  const texte = formatLines(lignesGarantie, "fr", sessionGarantie({ garantie_cotes: "1" }));
  assert.match(texte, /• Garantie cotes — Table Mikado\n {2}1 × 99 € = 99 €/);
  assert.match(texte, /• Table Mikado — Chêne · Noir charbon\n {2}1 × 1\u202f740 € = 1\u202f740 €/);
});
