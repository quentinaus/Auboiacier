/**
 * La porte d'entrée de la commande : /api/commande, et le panier qui affiche
 * ce qu'elle encaissera (/api/panier/tarif).
 *
 * Les deux routes passent par UNE fonction, tarifer (src/lib/tarif-panier.ts),
 * que ce fichier fait tourner pour de vrai. Les garde-fous y vivent, avant
 * même le calcul du prix :
 *   — la quantité doit être un entier, entre 1 et un maximum ;
 *   — une cote doit être un entier de millimètres, positif et raisonnable ;
 *   — aucun montant envoyé par le navigateur n'est lu.
 *
 * Les routes elles-mêmes démarrent par Stripe et l'e-mail : on ne les appelle
 * pas, on RELIT leur code pour vérifier qu'elles passent bien par tarifer, et
 * que Stripe reçoit ce que tarifer a calculé.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { coteMm, MAX_LIGNES, MAX_QUANTITE, tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC } from "../src/lib/garde-corps-outil/site.ts";
import { RETRAIT } from "../src/lib/deplacement.ts";
import { produit } from "./catalogue.ts";

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), "utf8");
const COMMANDE = lire("../src/app/api/commande/route.ts");
const TARIF = lire("../src/app/api/panier/tarif/route.ts");
const PANIER = lire("../src/lib/cart.tsx");

/** Une table du catalogue, à sa première taille : de quoi tester une règle sans géocodage. */
const table = produit("table-mikado");
const pieceTable = (extra: Record<string, unknown> = {}) => ({
  slug: table.slug,
  sizeId: table.sizes[0].id,
  woodId: table.woods[0].id,
  metalId: table.metals[0]?.id,
  quantity: 1,
  ...extra,
});
const tarif = (lignes: unknown) => tarifer(lignes, { locale: "fr", gc: CALCUL_GC });

test("les bornes de commande sont déclarées, raisonnables, et les mêmes que celles du panier", () => {
  assert.ok(Number.isInteger(MAX_QUANTITE) && MAX_QUANTITE >= 1);
  assert.ok(Number.isInteger(MAX_LIGNES) && MAX_LIGNES >= 1);
  const constante = (nom: string) => Number(PANIER.match(new RegExp(`const\\s+${nom}\\s*=\\s*([0-9]+)\\s*;`))?.[1]);
  assert.equal(constante("MAX_QUANTITY"), MAX_QUANTITE, "le panier et le serveur doivent avoir la même quantité maximale");
  assert.equal(constante("MAX_LINES"), MAX_LIGNES, "le panier et le serveur doivent avoir le même nombre de lignes maximal");
});

test("une quantité qui n'est pas un entier dans les bornes est refusée", async () => {
  for (const quantite of [0, -1, 1.5, 0.999, Number.NaN, Number.POSITIVE_INFINITY, MAX_QUANTITE + 1, 1e6, null]) {
    const t = await tarif([pieceTable({ quantity: quantite }), { slug: RETRAIT }]);
    assert.equal(t.probleme, "invalid", `la quantité ${JSON.stringify(quantite)} devrait être refusée`);
  }
  for (const quantite of [1, 2, MAX_QUANTITE]) {
    const t = await tarif([pieceTable({ quantity: quantite }), { slug: RETRAIT }]);
    assert.equal(t.probleme, null, `la quantité ${quantite} devrait être acceptée`);
    assert.equal(t.pieces[0].quantite, quantite);
  }
});

test("une cote qui n'est pas un entier de millimètres est refusée", () => {
  // Une cote, c'est un entier de millimètres. Rien d'autre n'entre.
  for (const valeur of [1200.5, "1200,5", "1 200", "deux mètres", "", null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 0, -1200, 1e9, {}, []]) {
    assert.equal(coteMm(valeur), undefined, `la cote ${JSON.stringify(valeur)} devrait être refusée`);
  }
  // Et une vraie cote passe, en nombre comme en texte.
  assert.equal(coteMm(1200), 1200);
  assert.equal(coteMm("1200"), 1200);
  assert.equal(coteMm(1), 1);
});

test("trop de lignes, ou une ligne qui n'est pas un objet : refusé", async () => {
  assert.equal((await tarif([])).probleme, "invalid");
  assert.equal((await tarif("pas une liste")).probleme, "invalid");
  assert.equal((await tarif([null])).probleme, "invalid");
  assert.equal((await tarif(Array.from({ length: MAX_LIGNES + 1 }, () => pieceTable()))).probleme, "invalid");
});

test("aucun prix venu du navigateur n'est lu : le tarif est le même, quoi qu'il envoie", async () => {
  const propre = await tarif([pieceTable(), { slug: RETRAIT }]);
  const force = await tarif([pieceTable({ unitPrice: 1, price: 1, amount: 1, total: 1, prix: 1 }), { slug: RETRAIT, unitPrice: -500 }]);
  assert.equal(force.total, propre.total);
  assert.ok(propre.total > 1);
  // Et les routes ne lisent aucun champ d'une ligne : elles passent la liste entière à tarifer.
  for (const source of [COMMANDE, TARIF]) {
    // (« piece.line.unitPrice », lui, est le prix que tarifer a calculé.)
    assert.doesNotMatch(source, /(?<![\w.])(line|ligne|body)\.(unitPrice|price|amount|total|prix)\b/);
    // (Le panier ajoute garantieSouple : une Garantie cotes invendable y est décochée au lieu de bloquer le panier.)
    assert.match(source, /tarifer\(body\.lines, \{ locale, gc: CALCUL_GC(, garantieSouple: true)? \}\)/, "la route doit tarifer les lignes reçues avec le calcul du serveur");
  }
  assert.match(COMMANDE, /tarifer\(body\.lines, \{ locale, gc: CALCUL_GC \}\)/, "le paiement garde le refus strict");
});

test("Stripe reçoit ce que tarifer a calculé : pièces, livraison, remise", () => {
  assert.match(COMMANDE, /unit_amount:\s*Math\.round\(piece\.line\.unitPrice \* 100\)/, "le prix d'une pièce vient de tarifer");
  assert.match(COMMANDE, /quantity:\s*piece\.quantite/);
  assert.match(COMMANDE, /unit_amount:\s*mode\.deplacement\.montantCents/, "la livraison ou la pose vient de tarifer");
  assert.match(COMMANDE, /unit_amount:\s*visite\.deplacement\.montantCents/, "la visite vient de tarifer");
  // La remise de plusieurs garde-corps : un bon de réduction du montant de tarifer, pour cette seule commande.
  assert.match(COMMANDE, /amount_off:\s*Math\.round\(-tarif\.remise \* 100\)/);
  assert.match(COMMANDE, /max_redemptions:\s*1/);
  assert.match(COMMANDE, /discounts:\s*\[\{ coupon \}\]/);
  // Une ligne refusée ou un problème (livraison à choisir…) : pas de paiement.
  assert.match(COMMANDE, /if \(tarif\.refusees\.length\)/);
  assert.match(COMMANDE, /if \(tarif\.probleme\)/);
  // Le retrait à l'atelier est noté dans la commande (il n'a pas de ligne : il est gratuit).
  assert.match(COMMANDE, /retrait: "1"/);
});
