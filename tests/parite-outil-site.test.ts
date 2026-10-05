/**
 * PARITÉ SITE / OUTIL DE PLANS (règle de Quentin, 05/10/2026) : une cote tapée sur le site doit donner le MÊME
 * résultat que dans l'outil, pour toutes les cotes — il ne doit jamais avoir à les essayer une par une.
 *
 * L'outil n'a pas de limite de croix : à 6 croix, le site répondait « à étudier » pour des fenêtres que l'outil
 * résout avec 7 à 10 croix. Ce test cherche, SANS aucune des mémoires ni des raccourcis du site, tout ce que le
 * moteur de l'outil accepte (1 à 12 croix, tous les carrés de l'atelier, le plat de renfort quand aucun carré ne
 * suffit, traverse, barreaux en bas) et exige que le site propose exactement les mêmes dessins.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAUTS_GC, calculerGC, geomGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { catalogueGC, configurerGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { CROIX_CATALOGUE, CROIX_MAX, valeursGC, type EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";

const e = (largeurMm: number, allegeMm: number, enEtage = true, fenetreMm = 0): EntreeSiteGC => ({ largeurMm, allegeMm, enEtage, fenetreMm, essence: "chene" });

/** Les cotes que Quentin a tapées, plus une grille qui couvre étroit, large, bas, haut. */
const FENETRES: EntreeSiteGC[] = [
  e(1990, 650), e(1775, 410), e(1775, 685), e(1160, 505), e(1180, 650), e(1650, 300), e(2000, 300), e(2400, 300), e(2401, 500),
  e(1500, 0), e(1669, 650), e(1700, 650), e(2400, 650), e(1200, 300, false),
];
for (const B of [600, 1400, 2200]) for (const A of [0, 450, 700]) FENETRES.push(e(B, A));

/** Ce que le moteur accepte, dessin par dessin : un calcul simple, sans cache. */
function dessinsPossibles(en: EntreeSiteGC): Set<string> {
  const ok = new Set<string>();
  const alertes = (s: number, n: number, b: boolean, t: boolean, plat: boolean, nb = 0) =>
    calculerGC({ ...(valeursGC(DEFAUTS_GC, en, s, n, b, t, plat, nb) as object as Parameters<typeof calculerGC>[0]), _rapide: true }).alertes as string[];
  // Les cinq familles du catalogue : croix seules, + traverse, + barreaux en bas, les deux, et « barreaux partout »
  // (en bas ET dans chaque croix, de 1 à 4 barreaux par croix, sans traverse).
  const familles: [boolean, boolean, boolean][] = [[false, false, false], [false, true, false], [true, false, false], [true, true, false], [true, false, true]];
  // Comme le catalogue de l'outil : de 7 à 12 croix, seulement si aucun modèle de 1 à 6 croix de la famille ne passe.
  for (const [b, t, partout] of familles) for (let n = 1, assez = false; n <= CROIX_MAX && !(n > CROIX_CATALOGUE && assez); n++) {
    const cle = `${n}|${t ? 1 : 0}|${partout ? 1 : 0}`;
    const avant = ok.has(cle);
    const nbs = partout ? [1, 2, 3, 4] : [0];
    // Sans plat : un carré de l'atelier qui passe tout (les carrés de 12 et 14 ne passent jamais la fixation : un test
    // de prix-garde-corps.test.ts le vérifie sur toute une grille).
    let passe = [16, 18, 20].some((s) => nbs.some((nb) => alertes(s, n, b, t, false, nb).length === 0));
    // Avec le plat de renfort : seulement si la lisse haute est trop souple dans TOUS les carrés (comme l'outil).
    if (!passe) passe = [16, 18, 20].every((s) => nbs.every((nb) => alertes(s, n, b, t, false, nb).some((a) => a.startsWith("Solidité")))) && nbs.some((nb) => alertes(16, n, b, t, true, nb).length === 0);
    if (passe) { ok.add(cle); if (n <= CROIX_CATALOGUE) assez = true; }
    void avant;
  }
  return ok;
}

test("parité : tout ce que l'outil sait résoudre (jusqu'à 12 croix), le site le propose — et rien d'autre", () => {
  let avecSolution = 0, sansSolution = 0, septEtPlus = 0;
  for (const en of FENETRES) {
    const nom = `${en.largeurMm} × ${en.allegeMm}${en.enEtage ? "" : " (rez)"}`;
    // Barre d'appui / rien à poser : aucun dessin à croix, des deux côtés.
    if (geomGC(valeursGC(DEFAUTS_GC, en, 16, 1), 1).appui) {
      assert.deepEqual(catalogueGC(en), [], `${nom} : pas de modèle à croix`);
      continue;
    }
    const outil = dessinsPossibles(en);
    const site = new Set(catalogueGC(en).filter((d) => d.conforme).map((d) => (d.conforme ? `${d.config.croix}|${d.config.traverse ? 1 : 0}|${d.config.partout ? 1 : 0}` : "")));
    assert.deepEqual([...site].sort(), [...outil].sort(), `${nom} : mêmes dessins aux normes (outil contre site)`);
    // Et la configuration choisie quand le client n'a rien choisi : il y en a une dès que l'outil en trouve une.
    const c = configurerGC(en);
    assert.equal(c.ok, outil.size > 0, `${nom} : le site vend dès que l'outil sait faire`);
    if (outil.size) { avecSolution++; if (c.ok && c.croix > CROIX_CATALOGUE) septEtPlus++; } else sansSolution++;
  }
  assert.ok(avecSolution >= 12, "la grille contient des fenêtres résolues");
  assert.ok(sansSolution >= 2, "la grille contient des fenêtres que ni l'outil ni le site ne résolvent (trop larges, fixation…)");
  assert.ok(septEtPlus >= 3, "la grille contient des fenêtres larges et basses qui demandent 7 croix ou plus");
});

test("parité : un modèle de 7 à 12 croix se choisit, se chiffre et se refuse comme les autres", () => {
  const en = e(1990, 300);   // large et basse : 6 croix ne passent pas, 9 passent
  const dessins = catalogueGC(en);
  const conformes = dessins.filter((d) => d.conforme);
  assert.ok(conformes.some((d) => d.conforme && d.config.croix > CROIX_CATALOGUE), "cette fenêtre demande plus de 6 croix");
  assert.ok(dessins.every((d) => d.conforme || d.croix <= CROIX_CATALOGUE), "aucun modèle hors norme de 7 croix ou plus");
  const un = conformes[0];
  assert.ok(un.conforme);
  const choisi = configurerGC({ ...en, modele: `16-${un.config.croix}${un.config.traverse ? "-t" : ""}` });
  assert.ok(choisi.ok && choisi.croix === un.config.croix, "le modèle de 7 croix ou plus se choisit");
  assert.throws(() => configurerGC({ ...en, modele: "16-13" }), RangeError, "13 croix : refusé (au plus 12)");
});
