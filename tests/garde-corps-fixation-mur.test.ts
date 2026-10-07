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

type Fixation = { statut: string; mode: string; texte: string; points: { y: number; V: number; rd: number | null }[]; plaques: { qte: number }[] };
const config = (l: number, a: number) => {
  const c = configurationGC({ largeurMm: l, allegeMm: a, enEtage: true, fenetreMm: 0 }, "chene");
  assert.ok(c?.ok, `${l} × ${a}`);
  return c;
};
const avecMur = (l: number, a: number, mur: string, tMur = 150) => {
  const c = config(l, a);
  const v = { ...c.v, mur, tMur };
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

test("béton : tableau trop peu profond pour la tige (40 mm de l'arête, 75 de la fenêtre) → sur étude, et l'outil dit pourquoi", () => {
  const { R, F } = avecMur(1200, 400, "beton", 100);
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

test("la profondeur du tableau place les tiges : le plus près de la façade qui tient, à 75 mm au moins de la fenêtre", () => {
  const cDe = (F: Fixation | undefined) => (F as unknown as { c: number }).c;
  // Tuffeau : 75 mm de l'arête au moins, et rien ne se gagne au-delà de 100 (le tiers d'une pierre de 30 cm).
  const court = avecMur(1200, 400, "tuffeau", 140);
  assert.equal(court.F?.statut, "etude", "75 + 75 = 150 mm de tableau au moins");
  assert.match(court.F!.texte, /trop peu profond/);
  const profond = avecMur(1200, 400, "tuffeau", 400);
  assert.equal(profond.F?.statut, "valide");
  assert.ok(cDe(profond.F) >= 75 && cDe(profond.F) <= 100);
  // Plus profond ne change rien au-delà du maxi : même c.
  assert.equal(cDe(avecMur(1200, 400, "tuffeau", 800).F), cDe(profond.F));
  // Béton : la tige à 40 mm de l'arête dès que le tableau fait 115 mm.
  assert.equal(cDe(avecMur(1200, 400, "beton", 115).F), 40);
  // Ancrage traversant : les tiges à 80 mm de l'arête, quelle que soit la profondeur.
  assert.equal(cDe(avecMur(1200, 400, "pierre-dure", 60).F), 80);
});

test("barre d'appui très basse : une platine prolongée sous le cadre écarte les tiges (brique, enduit ; tuffeau avec un tableau assez profond)", () => {
  // 100 × 80 : le montant de rive est trop court pour deux platines.
  const brique = avecMur(1000, 800, "brique");
  assert.equal(brique.F?.statut, "valide");
  assert.ok((brique.F as unknown as { prolongee: boolean }).prolongee);
  assert.equal(brique.F!.points.length, 3);
  assert.ok(brique.F!.points[0].y < 0, "la tige du bas est sous le cadre");
  assert.ok(brique.F!.points[0].y >= 25 - (brique.v as { jour: number }).jour, "à 10 mm au moins de l'appui");
  assert.ok(brique.F!.points.every((p) => p.rd !== null && p.V <= p.rd));
  assert.deepEqual(brique.F!.plaques.map((pl) => pl.qte), [2], "une platine par montant");
  assert.ok(brique.R.debit.some((d: { nom: string; coupes: string }) => d.nom === "Platines de fixation" && /prolongée/.test(d.coupes)));
  assert.equal(avecMur(1000, 800, "enduit").F?.statut, "indicatif");
  // Tuffeau : les 2 tiges du haut comptent pour une ; avec 20 cm de tableau (tiges jusqu'à 10 cm de l'arête), ça tient.
  assert.equal(avecMur(1000, 800, "tuffeau", 200).F?.statut, "valide");
  // Le parpaing veut 200 mm entre ses chevilles (deux rangs de blocs) : toujours sur étude, avec les solutions.
  assert.equal(avecMur(1000, 800, "parpaing").F?.statut, "etude");
  // Un montant assez long garde ses deux platines d'avant.
  assert.ok(!(avecMur(1200, 400, "brique").F as unknown as { prolongee: boolean }).prolongee);
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
    const F = avecMur(1200, 400, mur, 200).F;
    assert.ok(F && ["valide", "essais", "etude", "indicatif"].includes(F.statut) && F.texte.length > 20, mur);
  }
});
