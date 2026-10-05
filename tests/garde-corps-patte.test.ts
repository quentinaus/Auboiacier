/**
 * LA PATTE DU MILIEU (décision de Quentin, 05/10/2026, fenêtre de 1 775 × 665 « à étudier ») : quand un garde-corps large et bas
 * n'a aucun modèle parce que les vis des tableaux seraient trop tirées (ou la lisse trop souple), le site le propose avec une patte
 * de 40 × 10 soudée sous le montant du milieu et scellée dans l'appui. Jamais quand on peut s'en passer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculerGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { configurationGC, ligneGC, planApercuGC, reponsePrixGC, type RequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { composerDevisGardeCorps } from "../src/lib/garde-corps-outil/devis-site.ts";
import { lireReponsePrixGC } from "../src/lib/garde-corps.ts";

const releve = { largeurMm: 1775, allegeMm: 665, enEtage: true, fenetreMm: 2400 };

test("1 775 × 665 : vendu avec la patte du milieu, aux normes, et la patte est dans le débit", () => {
  const c = configurationGC(releve, "chene");
  assert.ok(c?.ok, "la fenêtre a maintenant un garde-corps");
  assert.ok(c.patte >= 1 && c.patte <= 4, "une à quatre pattes");
  assert.ok(c.carre <= 18, "jamais de carré de 20");
  const R = calculerGC({ ...c.v });
  assert.deepEqual(R.alertes, [], "aux normes, patte comprise");
  assert.ok(R.debit.some((d) => /^Pattes? de scellement/.test(d.nom) && d.qte === c.patte && d.long === c.jourMm + 80 && d.mat === `Carré plein ${c.carre} × ${c.carre}`), "les pattes au débit, du même carré que le cadre (jour + 80 mm scellés)");
  assert.ok(R.oks.some((o) => /^Pattes? (\(\d\) )?scellées? dans l'appui/.test(o)), "le calcul des pattes est fait");
});

test("la patte n'est jamais ajoutée quand on peut s'en passer", () => {
  for (const [l, a] of [[1180, 650], [900, 735], [1500, 300], [1990, 650], [2400, 300], [600, 0]] as const) {
    const c = configurationGC({ largeurMm: l, allegeMm: a, enEtage: true, fenetreMm: 0 }, "chene");
    if (c?.ok) assert.equal(c.patte, 0, `${l} × ${a}`);
  }
});

test("prix, panier, devis FR et EN, réponse de la route et plan : la patte y est, au même prix", () => {
  const q: RequetePrixGC = { releve, essence: "chene", fabricId: "fleur", quantite: 1 };
  const r = reponsePrixGC(q);
  assert.ok(r?.ok && r.patte > 0);
  assert.deepEqual(lireReponsePrixGC(JSON.parse(JSON.stringify(r))), r);
  const l = ligneGC(releve, { woodId: "chene", fabricId: "fleur" });
  assert.ok(l.ok && (l.line.gc?.patte ?? 0) > 0);
  assert.equal(l.line.unitPrice, r.prix);
  assert.match(l.line.size.label, /pattes? (au milieu )?scellées? dans l'appui/);
  for (const locale of ["fr", "en"] as const) {
    const d = composerDevisGardeCorps({ releve, options: { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" }, quantite: 1, livraison: { mode: "retrait" }, date: new Date("2026-10-05T10:00:00+02:00"), locale, origine: "https://auboiacier.fr" });
    assert.ok(d.ok);
    assert.equal(d.devis.total, r.prix);
    assert.match(JSON.stringify(d.devis.lignes), locale === "fr" ? /pattes? (au milieu, )?scellées? dans l'appui/ : /fixing bars? sealed into the sill/);
  }
  const plan = planApercuGC(q);
  assert.ok(plan && !/LISTE DE D[ÉE]BIT/.test(plan.svg));
});

test("jamais de carré de 20 : ni au catalogue, ni dans la configuration retenue", () => {
  for (const [l, a] of [[1180, 650], [1500, 300], [1775, 665], [1990, 650], [2400, 300], [1800, 800]] as const) {
    const r = reponsePrixGC({ releve: { largeurMm: l, allegeMm: a, enEtage: true, fenetreMm: 0 }, essence: "chene", fabricId: "fleur", quantite: 1 });
    for (const m of r?.modeles ?? []) if (m.conforme) assert.ok(m.carre <= 18, `${l} × ${a} ${m.id}`);
    if (r?.ok) assert.ok(r.carre <= 18, `${l} × ${a}`);
  }
});
