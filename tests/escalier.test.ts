/**
 * Le calcul d'escalier.
 *
 * Ce qu'on vérifie : que les marches retombent bien sur la hauteur donnée,
 * qu'aucune cote plausible n'est refusée (c'est un aide-mémoire, pas un
 * gardien), et que la formule de Blondel est appliquée comme à l'atelier.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculerEscalier,
  BLONDEL_MAX_MM,
  BLONDEL_MIN_MM,
  GIRON_CONFORT_MM,
  HAUTEUR_MARCHE_MAX_MM,
  HAUTEUR_MARCHE_MIN_MM,
} from "../src/lib/escalier.ts";

test("les marches retombent exactement sur la hauteur à monter", () => {
  for (let hauteur = 2000; hauteur <= 4000; hauteur += 10) {
    const calcul = calculerEscalier({ hauteurMm: hauteur });
    assert.ok(calcul, `${hauteur} mm refusé`);
    const total = calcul.hauteurDeMarcheMm * calcul.nombreDeMarches;
    assert.ok(
      Math.abs(total - hauteur) < 0.001,
      `${hauteur} mm : ${calcul.nombreDeMarches} marches de ${calcul.hauteurDeMarcheMm} mm font ${total}`
    );
  }
});

test("sur une hauteur d'habitation, la marche reste dans les clous", () => {
  // De 2,20 m (combles) à 3,20 m (bel étage) : la marche doit tomber entre
  // 17 et 20 cm sans qu'on ait à y penser.
  for (let hauteur = 2200; hauteur <= 3200; hauteur += 10) {
    const calcul = calculerEscalier({ hauteurMm: hauteur })!;
    assert.ok(
      calcul.hauteurDeMarcheMm >= HAUTEUR_MARCHE_MIN_MM - 5 &&
        calcul.hauteurDeMarcheMm <= HAUTEUR_MARCHE_MAX_MM,
      `${hauteur} mm donne des marches de ${calcul.hauteurDeMarcheMm.toFixed(1)} mm`
    );
  }
});

test("plus la hauteur monte, plus il y a de marches", () => {
  let precedent = 0;
  for (let hauteur = 1000; hauteur <= 4000; hauteur += 50) {
    const calcul = calculerEscalier({ hauteurMm: hauteur })!;
    assert.ok(
      calcul.nombreDeMarches >= precedent,
      `${hauteur} mm : ${calcul.nombreDeMarches} marches après ${precedent}`
    );
    precedent = calcul.nombreDeMarches;
  }
});

test("le recul confortable vaut un giron de 28 cm par marche, sauf la dernière", () => {
  const calcul = calculerEscalier({ hauteurMm: 2800 })!;
  assert.equal(calcul.nombreDeMarches, 16);
  assert.equal(calcul.reculConfortMm, 15 * GIRON_CONFORT_MM);
});

test("sans recul donné, on ne calcule ni giron ni Blondel", () => {
  const calcul = calculerEscalier({ hauteurMm: 2700 })!;
  assert.equal(calcul.gironMm, undefined);
  assert.equal(calcul.blondelMm, undefined);
  assert.equal(calcul.pas, undefined);
});

test("avec le recul, Blondel est calculé et jugé comme à l'atelier", () => {
  // 2,80 m de hauteur, 4,20 m de recul : 16 marches de 175 mm, giron 280 mm.
  const calcul = calculerEscalier({ hauteurMm: 2800, reculMm: 15 * 280 })!;
  assert.equal(Math.round(calcul.gironMm!), 280);
  assert.equal(Math.round(calcul.blondelMm!), 630);
  assert.equal(calcul.pas, "juste");
  assert.ok(calcul.blondelMm! >= BLONDEL_MIN_MM && calcul.blondelMm! <= BLONDEL_MAX_MM);
});

test("un recul trop court se voit, mais ne bloque rien", () => {
  const calcul = calculerEscalier({ hauteurMm: 2800, reculMm: 2000 })!;
  assert.ok(calcul.gironMm! < 200, "le giron devrait être serré");
  assert.equal(calcul.pas, "serre");
  // Le calcul reste rendu : c'est un aide-mémoire, pas un gardien.
  assert.equal(calcul.nombreDeMarches, 16);
});

test("trop de recul s'appelle un pas allongé, pas un pas serré", () => {
  // 2,70 m de hauteur et 4,20 m de recul : le giron monte à 30 cm et le pas à
  // 66 cm. Ce n'est pas « serré » — c'est l'inverse, et le dire de travers
  // ferait passer l'atelier pour quelqu'un qui ne sait pas lire un escalier.
  const calcul = calculerEscalier({ hauteurMm: 2700, reculMm: 4200 })!;
  assert.ok(calcul.blondelMm! > BLONDEL_MAX_MM);
  assert.equal(calcul.pas, "allonge");
});

test("aucune hauteur plausible n'est refusée, même hors normes", () => {
  for (const hauteur of [500, 1200, 2800, 4500, 6000]) {
    assert.ok(calculerEscalier({ hauteurMm: hauteur }), `${hauteur} mm refusé`);
  }
});

test("une hauteur absurde ou illisible ne rend rien", () => {
  for (const hauteur of [0, -100, 120, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(calculerEscalier({ hauteurMm: hauteur }), null, `${hauteur} accepté`);
  }
});
