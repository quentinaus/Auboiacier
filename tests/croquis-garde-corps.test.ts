import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MATIERES_MUR, matiereMur } from "../src/lib/murs-gc.ts";

/**
 * Le croquis du garde-corps dessine le mur que le client choisit (pierre,
 * brique, béton…). Il lit la matière à la place du mot affiché : ce test
 * tient les deux listes ensemble.
 */

test("le croquis dessine le mur choisi dans la liste, en français comme en anglais", () => {
  // Le croquis lit la matière à la place du mot affiché : si la liste « Type de mur » change d'ordre ou de
  // longueur sans lui, un client qui choisit « Parpaing » verrait un mur de béton.
  const attendu = {
    fr: ["Pierre", "Brique pleine", "Brique creuse", "Parpaing", "Béton", "Béton cellulaire", "Placo sur ossature", "Je ne sais pas"],
    en: ["Stone", "Solid brick", "Hollow brick", "Concrete block", "Concrete", "Aerated concrete", "Plasterboard on studs", "I don't know"],
  };
  for (const langue of ["fr", "en"] as const) {
    const t = JSON.parse(readFileSync(new URL(`../src/app/[lang]/dictionaries/${langue}.json`, import.meta.url), "utf8")).artisanat;
    assert.deepEqual(t.gcMurOptions, attendu[langue], `${langue} : la liste des murs a changé, MATIERES_MUR doit suivre`);
    assert.equal(MATIERES_MUR.length, t.gcMurOptions.length);
    // Chaque mot de la liste, et la matière que le croquis dessine pour lui.
    assert.deepEqual(
      t.gcMurOptions.map((mot: string) => matiereMur(mot, t.gcMurOptions)),
      ["pierre", "brique", "brique-creuse", "parpaing", "beton", "beton-cellulaire", "placo", "enduit"],
    );
  }
  // Rien de choisi, ou un mot inconnu : un enduit lisse, jamais une erreur.
  assert.equal(matiereMur("", attendu.fr), "enduit");
  assert.equal(matiereMur("Torchis", attendu.fr), "enduit");
});
