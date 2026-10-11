import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTREPRISE, champsManquants, commandesOuvertes, siretValide } from "../src/lib/entreprise.ts";

test("un SIRET, c'est 14 chiffres, espaces tolérés", () => {
  assert.equal(siretValide("123 456 789 00012"), true);
  assert.equal(siretValide("12345678900012"), true);
  assert.equal(siretValide(""), false);
  assert.equal(siretValide("123456789"), false);
  assert.equal(siretValide("1234567890001A"), false);
});

test("les commandes s'ouvrent seulement avec un SIRET valide", () => {
  if (!siretValide(ENTREPRISE.siret)) assert.equal(commandesOuvertes(), false);
});

/** Une fiche entièrement remplie, pour vérifier le garde-fou ligne par ligne. */
const complete = {
  raisonSociale: "Aumercier Quentin",
  statut: "Entreprise individuelle",
  adresse: "1 rue de l'Exemple, 49400 Saumur",
  siret: "123 456 789 00012",
  immatriculation: "RNE — SIREN 123 456 789",
  tva: "non applicable, art. 293 B du CGI",
  tvaMention: { fr: "TVA non applicable, article 293 B du CGI", en: "VAT not applicable, article 293 B of the French Tax Code" },
  assurance: "Assurance décennale — Exemple, contrat n° 1, France",
  telephone: "02 00 00 00 00",
  mediateur: { nom: "Médiateur exemple", adresse: "Paris", site: "mediateur.example" },
};

test("une fiche complète ouvre les commandes", () => {
  assert.deepEqual(champsManquants(complete), []);
  assert.equal(commandesOuvertes(complete), true);
});

test("le SIRET seul ne suffit pas : il manque une mention obligatoire, les commandes restent fermées", () => {
  for (const [cle, vide] of [
    ["raisonSociale", ""],
    ["adresse", ""],
    ["telephone", ""],
    ["immatriculation", ""],
    ["tva", ""],
    ["assurance", ""],
    ["tvaMention", { fr: "TVA non applicable", en: "" }],
    ["mediateur", { nom: "", adresse: "", site: "" }],
  ] as const) {
    const fiche = { ...complete, [cle]: vide };
    assert.equal(commandesOuvertes(fiche), false, `ouvertes sans ${cle}`);
    assert.equal(champsManquants(fiche).length, 1, cle);
  }
});
