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

test("béton : 4 platines 40 × 5 au bout des lisses, 8 tiges M8 scellées (10/10/2026) ; validé ; ses pièces au débit et au prix", () => {
  // Avant le 10/10/2026 : une tige M8 à travers le montant. Depuis la fixation par platines au bout des lisses (décision de
  // Quentin), tous les murs à tiges ont les mêmes platines (une pièce : plat 40 × 5 × 120, 2 trous à 75 mm), le béton compte ses
  // deux tiges pour 1,6 (casse du bord commune, EN 1992-4).
  const { c, v, R, F } = avecMur(1200, 400, "beton");
  assert.equal(F?.statut, "valide");
  assert.equal(F?.mode, "platines");
  assert.equal((F as unknown as { platines: number }).platines, 4, "4 platines");
  assert.equal(F.points.length, 4, "4 hauteurs de tiges par côté");
  assert.ok(F.points.every((p) => p.rd !== null && p.V <= p.rd), "chaque point sous sa résistance");
  assert.deepEqual(R.alertes, []);
  assert.ok(R.debit.some((d: { nom: string }) => /^Tige filetée M8 inox/.test(d.nom)));
  assert.ok(R.debit.some((d: { nom: string; mat: string }) => d.nom === "Platines de fixation" && d.mat === "Plat acier 40 × 5"), "les platines au débit");
  assert.ok(!R.debit.some((d: { nom: string }) => /^Vis ou goujons/.test(d.nom)), "plus de vis Ø 6");
  assert.ok(chiffrage().chiffrerGC(R, v).conseille > chiffrage().chiffrerGC(c.R, c.v).conseille, "la résine et l'inox se paient");
});

test("béton : tableau trop peu profond pour la tige (40 mm de l'arête, 75 de la fenêtre) → la patte en façade (10/10/2026) ; sous 60 mm, sur étude, et l'outil dit pourquoi", () => {
  // Jusqu'au 10/10/2026, un tableau de 100 mm était « sur étude ». Depuis la patte en façade (Quentin : « on garde », +100 €),
  // les platines qui ne tiennent pas dans le tableau laissent la place à une équerre chevillée sur la façade.
  const cent = avecMur(1200, 400, "beton", 100);
  assert.equal(cent.F?.statut, "valide");
  assert.equal(cent.F?.mode, "facade");
  // Un tableau de 50 mm : même l'aile de la patte en façade (45 mm au moins) n'y entre pas.
  const { R, F } = avecMur(1200, 400, "beton", 50);
  assert.equal(F?.statut, "etude");
  assert.match(F!.texte, /trop peu profond/);
  assert.match(F!.texte, /même pour une patte en façade/);
  assert.ok(R.alertes.some((a: string) => /Fixation dans le mur \(béton\).*arête/.test(a)));
});

test("patte en façade (Quentin, 10/10/2026) : quand les platines ne tiennent pas dans le tableau, une équerre chevillée sur la façade, chiffrée, dessinée et dite au client", () => {
  // Béton, tableau de 60 mm : aile 40 × 5 de 45 dans le tableau, plaque de tôle 5 mm de 145 de large sur la façade, 2 chevilles
  // l'une au-dessus de l'autre par plaque (traction, effet de levier 1,8 : EN 1993-1-8), les mêmes tiges M8 et la même résine.
  const { c, v, R, F } = avecMur(1200, 400, "beton", 60);
  assert.equal(F?.statut, "valide");
  assert.equal(F?.mode, "facade");
  assert.equal((F as unknown as { platines: number }).platines, 4, "4 pattes");
  assert.equal((F as unknown as { c: number }).c, 30, "la lisse à 30 mm de la façade (aile de 45 − 15)");
  assert.ok(F!.points.every((p) => p.rd !== null && p.V <= p.rd), "chaque cheville sous sa résistance en traction");
  assert.deepEqual(R.alertes, []);
  assert.ok(R.debit.some((d: { nom: string; mat: string }) => d.nom === "Platines de fixation" && /^Tôle acier 145 × 5$/.test(d.mat)), "la tôle des plaques au débit");
  assert.ok(R.debit.some((d: { nom: string; mat: string; long: number }) => d.nom === "Platines de fixation" && d.mat === "Plat acier 40 × 5" && d.long === 45), "les ailes au débit");
  assert.ok(R.debit.some((d: { nom: string }) => /^Tige filetée M8 inox/.test(d.nom)));
  // Le client sait que les plaques se voient de la rue, peintes dans la teinte du garde-corps.
  const client = (F as unknown as { texteClient: string }).texteClient;
  assert.match(client, /4 pattes en équerre .* 8 chevilles scellées/);
  assert.match(client, /les plaques se voient de l'extérieur, dans la teinte du garde-corps/);
  assert.ok(R.notes.some((n: string) => /Patte en façade/.test(n)), "la note d'atelier");
  // Plus cher que les platines dans un tableau profond (tôle, 15 min par patte au lieu de 9) : +40 € ici (grand cadre en
  // carré 18), +100 € sur le 1 180 × 585 de la fiche (tests/garde-corps-mur-site.test.ts).
  const profond = avecMur(1200, 400, "beton", 150);
  assert.equal(profond.F?.mode, "platines");
  const ecart = chiffrage().chiffrerGC(R, v).conseille - chiffrage().chiffrerGC(profond.R, profond.v).conseille;
  assert.ok(ecart > 0 && ecart <= 150, `+${ecart} € pour la façade`);
  assert.ok(chiffrage().chiffrerGC(R, v).conseille > chiffrage().chiffrerGC(c.R, c.v).conseille);
  // La façade n'est essayée qu'après les platines : un tableau profond garde ses platines (même prix qu'avant la façade).
  assert.equal(avecMur(1200, 400, "brique", 150).F?.mode, "platines");
  // Brique creuse : la patte en façade tient sur une petite fenêtre, à titre indicatif (classe de brique à confirmer sur photo).
  const creuse = avecMur(500, 0, "brique-creuse");
  assert.equal(creuse.F?.statut, "indicatif");
  assert.equal(creuse.F?.mode, "facade");
  assert.match((creuse.F as unknown as { texteClient: string }).texteClient, /^Prix indicatif : nous confirmerons la fixation avec la photo de votre mur\. Prévu : /);
  // Parpaing, cadre bas : la façade ne suffit pas non plus (traction dans un bloc creux) ; l'outil dit les deux raisons.
  const parpaing = avecMur(1000, 800, "parpaing");
  assert.equal(parpaing.F?.statut, "etude");
  assert.match(parpaing.F!.texte, /en façade aussi, la cheville la plus chargée reprendrait/);
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
  // (75 + 75 = 150 mm de tableau au moins pour les platines ; en dessous, depuis le 10/10/2026, la patte en façade prend le relais.)
  const court = avecMur(1200, 400, "tuffeau", 140);
  assert.equal(court.F?.statut, "valide");
  assert.equal(court.F?.mode, "facade");
  assert.equal(cDe(court.F), 50, "la lisse à 50 mm de la façade (aile de 65 − 15)");
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

test("barre d'appui très basse : une seule platine par côté, sur toute la hauteur du cadre (brique, enduit ; tuffeau avec un tableau assez profond)", () => {
  // 100 × 80 : le cadre (135 mm) est trop bas pour deux platines par côté écartées de 10 mm. Depuis le 10/10/2026 (platines au
  // bout des lisses), une seule platine par côté, du bas de la platine basse au dessus de la lisse haute, 2 ou 3 tiges ; elle
  // remplace l'ancienne « platine prolongée » sous le cadre.
  const brique = avecMur(1000, 800, "brique");
  assert.equal(brique.F?.statut, "valide");
  assert.deepEqual(brique.F!.plaques.map((pl) => pl.qte), [2], "une platine par côté");
  assert.equal((brique.F as unknown as { platines: number }).platines, 2);
  assert.ok(brique.F!.points.length >= 2 && brique.F!.points.length <= 3, "2 ou 3 tiges par côté");
  assert.ok(brique.F!.points.every((p) => p.rd !== null && p.V <= p.rd));
  assert.ok(brique.R.notes.some((n: string) => /une seule platine par côté/.test(n)), "l'outil le dit");
  assert.ok(brique.R.debit.some((d: { nom: string; mat: string }) => d.nom === "Platines de fixation" && d.mat === "Plat acier 40 × 5"));
  assert.equal(avecMur(1000, 800, "enduit").F?.statut, "indicatif");
  // Tuffeau : les 2 tiges d'une platine comptent pour deux (décision de Quentin, 09/10) ; avec 20 cm de tableau, ça tient.
  assert.equal(avecMur(1000, 800, "tuffeau", 200).F?.statut, "valide");
  // Le parpaing veut 200 mm entre ses chevilles (deux rangs de blocs) : toujours sur étude, avec les solutions.
  assert.equal(avecMur(1000, 800, "parpaing").F?.statut, "etude");
  // Un cadre assez haut garde ses deux platines par côté (4 en tout).
  assert.equal((avecMur(1200, 400, "brique").F as unknown as { platines: number }).platines, 4);
});

test("placo : jamais de cheville dans la plaque ; on demande le mur extérieur (sur étude, avec la raison)", () => {
  assert.ok(avecMur(1200, 400, "placo").R.alertes.some((a: string) => /placo est à l'intérieur/.test(a)));
});

test("brique creuse et parpaing trop faibles : sur étude, avec les solutions (poteau béton, pattes dans l'appui, visite)", () => {
  for (const mur of ["brique-creuse", "parpaing"]) {
    const { F } = avecMur(1200, 400, mur);
    if (F?.statut === "etude") assert.match(F.texte, /poteau ou un (?:encadrement|chaînage) en béton/, mur);
  }
});

test("aucun mur n'est retiré : chaque type de mur rend un statut et un texte", () => {
  for (const mur of ["beton", "brique", "brique-creuse", "parpaing", "beton-cellulaire", "tuffeau", "pierre-dure", "moellons", "placo", "enduit"]) {
    const F = avecMur(1200, 400, mur, 200).F;
    assert.ok(F && ["valide", "essais", "etude", "indicatif"].includes(F.statut) && F.texte.length > 20, mur);
  }
});
