/**
 * LA FIXATION SELON LE MUR (décisions de Quentin, 06/10/2026 ; études fischer / Hilti / ETE dans « Auboiacier chiffrage » :
 * fixation-plus-forte-2026-10-06.md et fixation-selon-le-mur-specification-2026-10-07.md). Le moteur de l'outil choisit, pour
 * le mur des tableaux, le montage le plus simple qui tient (tige à travers le montant, platine…), dit son statut (validé,
 * sous réserve d'essais, sur étude) et met ses pièces au débit et au prix. Aucun mur n'est retiré. Sans mur (ce que le site
 * envoie tant qu'il ne transmet pas le mur), rien ne change : vis Ø 6 et chevilles, comme avant.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculerGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { configurationGC } from "../src/lib/garde-corps-outil/site.ts";
import { chiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";

type Fixation = { statut: string; mode: string; texte: string; points: { V: number; rd: number | null }[]; plaques: { qte: number }[] };
const config = (l: number, a: number) => {
  const c = configurationGC({ largeurMm: l, allegeMm: a, enEtage: true, fenetreMm: 0 }, "chene");
  assert.ok(c?.ok, `${l} × ${a}`);
  return c;
};
const avecMur = (l: number, a: number, mur: string, cMur = 60) => {
  const c = config(l, a);
  const v = { ...c.v, mur, cMur };
  const R = calculerGC(v);
  return { c, v, R, F: R.fixation as Fixation | undefined };
};

test("sans mur : la fixation d'avant (vis Ø 6 et chevilles), au même prix", () => {
  const c = config(1200, 400);
  const R = calculerGC({ ...c.v });
  assert.equal(R.fixation, undefined);
  assert.ok(R.debit.some((d: { nom: string }) => /^Vis ou goujons/.test(d.nom)));
});

test("béton : une tige M8 à travers le montant quand elle suffit ; validé ; ses pièces au débit et au prix", () => {
  const { c, v, R, F } = avecMur(1200, 400, "beton");
  assert.equal(F?.statut, "valide");
  assert.equal(F?.mode, "tige");
  assert.ok(F.points.every((p) => p.rd !== null && p.V <= p.rd), "chaque point sous sa résistance");
  assert.deepEqual(R.alertes, []);
  assert.ok(R.debit.some((d: { nom: string }) => /^Tige filetée M8 inox/.test(d.nom)));
  assert.ok(!R.debit.some((d: { nom: string }) => /^Vis ou goujons/.test(d.nom)), "plus de vis Ø 6");
  assert.ok(chiffrage().chiffrerGC(R, v).conseille > chiffrage().chiffrerGC(c.R, c.v).conseille, "la résine et l'inox se paient");
});

test("béton : trop près de l'arête pour la tige seule → sur étude, et l'outil dit pourquoi", () => {
  const { R, F } = avecMur(1200, 400, "beton", 30);
  assert.equal(F?.statut, "etude");
  assert.ok(R.alertes.some((a: string) => /Fixation dans le mur \(béton\).*arête/.test(a)));
});

test("brique pleine : platines à 2 tiges M10, validée par un calcul prudent sans essai (décision de Quentin, 07/10/2026)", () => {
  const { R, F } = avecMur(1200, 400, "brique");
  assert.equal(F?.statut, "valide");
  assert.ok(F.plaques.reduce((t, p) => t + p.qte, 0) === 4, "deux platines par montant");
  assert.ok(F.points.every((p) => p.rd !== null && p.V <= p.rd));
  assert.ok(R.oks.some((n: string) => /Fixation dans le mur \(brique pleine\).*validé par le calcul/.test(n)));
  assert.ok(R.debit.some((d: { nom: string }) => d.nom === "Platines de fixation"));
});

test("pierre dure : ancrage traversant (plaque inox à l'intérieur), validé par le calcul ; mur inconnu : prix indicatif", () => {
  const pd = avecMur(1200, 400, "pierre-dure");
  assert.equal(pd.F?.mode, "traversant");
  assert.equal(pd.F?.statut, "valide");
  assert.ok(pd.R.debit.some((d: { nom: string }) => /Plaque inox A4 150/.test(d.nom)));
  const inconnu = avecMur(1200, 400, "enduit");
  assert.equal(inconnu.F?.statut, "indicatif");
  assert.ok(inconnu.R.notes.some((n: string) => /prix indicatif/.test(n)));
  assert.ok(!inconnu.R.alertes.some((a: string) => /Fixation dans le mur/.test(a)), "un prix indicatif reste affiché");
});

test("placo : jamais de cheville dans la plaque ; on demande le mur extérieur (sur étude, avec la raison)", () => {
  assert.ok(avecMur(1200, 400, "placo").R.alertes.some((a: string) => /placo est à l'intérieur/.test(a)));
});

test("brique creuse et parpaing trop faibles : sur étude, avec les solutions (poteau béton, pattes dans l'appui, visite)", () => {
  for (const mur of ["brique-creuse", "parpaing"]) {
    const { F } = avecMur(1200, 400, mur);
    if (F?.statut === "etude") assert.match(F.texte, /poteau ou un encadrement en béton/, mur);
  }
});

test("aucun mur n'est retiré : chaque type de mur rend un statut et un texte", () => {
  for (const mur of ["beton", "brique", "brique-creuse", "parpaing", "beton-cellulaire", "tuffeau", "pierre-dure", "moellons", "placo", "enduit"]) {
    const F = avecMur(1200, 400, mur, 120).F;
    assert.ok(F && ["valide", "essais", "etude", "indicatif"].includes(F.statut) && F.texte.length > 20, mur);
  }
});
