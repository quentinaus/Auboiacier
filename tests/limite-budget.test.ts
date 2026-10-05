/**
 * Le budget de temps de calcul (audit du 05/10/2026) : un relevé jamais vu coûte jusqu'à 3,4 s au serveur, 120 requêtes
 * autorisées par dix minutes en faisaient plus de six minutes de calcul. Chaque porte qui calcule un garde-corps dépense un
 * budget par adresse (et un budget pour l'instance entière) ; au-delà, elle refuse.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { creerBudget } from "../src/lib/limite-debit.ts";
import { budgetCalculGC } from "../src/lib/budget-calcul-gc.ts";

const de = (ip: string) => new Request("https://exemple.fr/api", { headers: { "x-real-ip": ip } });
const FENETRE = 10 * 60 * 1000;

test("le budget : une adresse qui a pris son temps de calcul est refusée, pas les autres", () => {
  const b = creerBudget({ fenetreMs: FENETRE, budgetMs: 10_000, budgetGlobalMs: 1_000_000 });
  const t0 = 1_000_000;
  assert.equal(b.epuise(de("1.1.1.1"), t0), false);
  b.depenser(de("1.1.1.1"), 6_000, t0);
  assert.equal(b.epuise(de("1.1.1.1"), t0 + 1), false, "6 s sur 10 : encore permis");
  b.depenser(de("1.1.1.1"), 5_000, t0 + 2);
  assert.equal(b.epuise(de("1.1.1.1"), t0 + 3), true, "11 s sur 10 : refusé");
  assert.equal(b.epuise(de("2.2.2.2"), t0 + 3), false, "une autre adresse n'est pas touchée");
});

test("le budget se libère avec le temps", () => {
  const b = creerBudget({ fenetreMs: FENETRE, budgetMs: 10_000, budgetGlobalMs: 1_000_000 });
  const t0 = 5_000_000;
  b.depenser(de("1.1.1.1"), 12_000, t0);
  assert.equal(b.epuise(de("1.1.1.1"), t0 + FENETRE - 1), true);
  assert.equal(b.epuise(de("1.1.1.1"), t0 + FENETRE + 1), false, "dix minutes plus tard, le compteur est reparti");
});

test("le budget de l'instance entière protège contre des adresses qui changent", () => {
  const b = creerBudget({ fenetreMs: FENETRE, budgetMs: 10_000, budgetGlobalMs: 20_000 });
  const t0 = 9_000_000;
  for (let i = 0; i < 4; i++) b.depenser(de(`10.0.0.${i}`), 6_000, t0 + i);
  assert.equal(b.epuise(de("10.0.0.99"), t0 + 10), true, "24 s au total sur 20 : même une adresse neuve est refusée");
});

test("le budget ignore une durée absurde et reste borné en mémoire", () => {
  const b = creerBudget({ fenetreMs: FENETRE, budgetMs: 10_000, budgetGlobalMs: 1_000_000, tailleMax: 50 });
  const t0 = 1;
  for (const ms of [NaN, -5, 0]) b.depenser(de("3.3.3.3"), ms, t0);
  assert.equal(b.epuise(de("3.3.3.3"), t0), false);
  for (let i = 0; i < 200; i++) b.depenser(de(`9.9.${i % 250}.${i}`), 1, t0 + i * FENETRE);
  assert.equal(b.epuise(de("9.9.0.0"), t0 + 200 * FENETRE), false);
});

test("le budget du garde-corps : des centaines de millisecondes de calcul passent, plusieurs minutes non", () => {
  const t0 = 42_000_000;
  const moi = de("7.7.7.7");
  for (let i = 0; i < 40; i++) budgetCalculGC.depenser(moi, 1_000, t0 + i);
  assert.equal(budgetCalculGC.epuise(moi, t0 + 41), false, "40 relevés de 1 s : un client normal");
  for (let i = 0; i < 60; i++) budgetCalculGC.depenser(moi, 1_000, t0 + 100 + i);
  assert.equal(budgetCalculGC.epuise(moi, t0 + 200), true, "100 s de calcul en dix minutes : refusé");
});
