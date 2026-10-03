import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTREPRISE, commandesOuvertes, siretValide } from "../src/lib/entreprise.ts";

test("un SIRET, c'est 14 chiffres, espaces tolérés", () => {
  assert.equal(siretValide("123 456 789 00012"), true);
  assert.equal(siretValide("12345678900012"), true);
  assert.equal(siretValide(""), false);
  assert.equal(siretValide("123456789"), false);
  assert.equal(siretValide("1234567890001A"), false);
});

test("les commandes s'ouvrent seulement avec un SIRET valide", () => {
  assert.equal(commandesOuvertes(), siretValide(ENTREPRISE.siret));
});
