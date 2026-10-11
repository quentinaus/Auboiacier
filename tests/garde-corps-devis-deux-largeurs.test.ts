/**
 * Murs pas parallèles (10/10/2026) : le devis dit les DEUX largeurs (en bas, à 1 m du sol), en français comme en anglais ; murs
 * droits (Bh absent ou égal à B), le texte d'avant ne change pas. Le détail C du plan A3 dit les deux reculs du montant de rive.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculerGC, DEFAUTS_GC, planA3Pur } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { composerDevisGC } from "../src/lib/garde-corps-outil/devis.genere.mjs";
import { composerDevisGardeCorps } from "../src/lib/garde-corps-outil/devis-site.ts";

const base = { allegeMm: 585, enEtage: true, fenetreMm: 1400 };
const options = { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" };
const devis = (releve: Record<string, unknown>, locale: "fr" | "en") => {
  const d = composerDevisGardeCorps({
    releve: { ...base, ...releve } as never,
    options,
    quantite: 1,
    livraison: { mode: "retrait" },
    date: new Date("2026-10-10T10:00:00+02:00"),
    locale,
    origine: "https://auboiacier.fr",
  });
  assert.ok(d.ok, d.ok ? "" : JSON.stringify(d));
  return d.devis;
};
const largeur = (d: ReturnType<typeof devis>, label: string) => d.piece.caracteristiques.find((c) => c.label === label)?.value;

test("devis français : « 1 180 mm en bas, 1 120 mm à 1 m du sol » quand les murs sont penchés", () => {
  const v = largeur(devis({ largeurMm: 1180, largeurHautMm: 1120 }, "fr"), "Largeur entre tableaux");
  assert.match(String(v), /^1\s180\u00a0mm en bas, 1\s120\u00a0mm à 1\u00a0m du sol$/, "même séparateur de milliers que le reste du devis");
});

test("devis anglais : les deux largeurs aussi", () => {
  const v = largeur(devis({ largeurMm: 1180, largeurHautMm: 1120 }, "en"), "Width between reveals");
  assert.match(String(v), /^1,180 mm at the bottom, 1,120 mm at 1 m above the floor$/);
});

test("murs droits : le texte d'avant (Bh absent ou égal à B)", () => {
  for (const locale of ["fr", "en"] as const) {
    const label = locale === "fr" ? "Largeur entre tableaux" : "Width between reveals";
    const sans = largeur(devis({ largeurMm: 1180 }, locale), label);
    const egal = largeur(devis({ largeurMm: 1180, largeurHautMm: 1180 }, locale), label);
    assert.equal(sans, egal);
    assert.match(String(sans), locale === "fr" ? /^1\s180 mm$/ : /^1,180 mm$/);
  }
});

test("bas de fenêtre à 880 avec un cadre imposé : la largeur se lit à 1 030 mm du sol (A + 150), l'outil le dit (le site n'en vend pas)", () => {
  const v = { ...DEFAUTS_GC, nP: 2, s: 16, essence: "chene", etage: true, A: 880, B: 1180, Bh: 1120, Hs: 300, jourAuto: false };
  const R = calculerGC(v);
  const d = composerDevisGC({ R, v, prix: 1900, rem: { prix: 0 }, infos: { client: "", chantier: "", date: new Date("2026-10-10T10:00:00+02:00") } });
  assert.ok(d.ok, d.ok ? "" : d.raison);
  assert.match(String(d.devis.piece.caracteristiques.find((c: { label: string }) => c.label === "Largeur entre tableaux")?.value), /à 1\s030\u00a0mm du sol$/);
});

test("schéma du devis : les deux largeurs sont écrites sur le dessin et dans sa description", () => {
  const v = { ...DEFAUTS_GC, nP: 2, s: 16, essence: "chene", etage: true, A: 585, B: 1180, Bh: 1120, jourAuto: false };
  const d = composerDevisGC({ R: calculerGC(v), v, prix: 1900, rem: { prix: 0 }, image: "schema", infos: { client: "", chantier: "", date: new Date("2026-10-10T10:00:00+02:00") } });
  assert.ok(d.ok, d.ok ? "" : d.raison);
  const img = d.devis.piece.image as { type: string; svg: string };
  assert.equal(img.type, "svg");
  assert.match(img.svg, /1\s180 en bas, 1\s120 à 1\u00a0m du sol/);
  assert.match(img.svg, /aria-label="[^"]*1\s180 mm entre tableaux en bas, 1\s120 mm à 1\u00a0m du sol/);
});

test("plan A3, détail C : murs penchés = deux reculs (90 au niveau étroit, 90 + écart/2 au large) ; murs droits = le détail d'avant", () => {
  const plan = (Bh: number) => {
    const v = { ...DEFAUTS_GC, nP: 2, s: 16, essence: "chene", etage: true, A: 585, B: 1180, Bh, jourAuto: false };
    const R = calculerGC(v);
    return { R, svg: planA3Pur(R, v, { apercu: false, date: "10/10/2026", client: "", chantier: "" }, "gardeCorps") as string };
  };
  const penche = plan(1120);
  const large = Math.round(penche.R.videRive!.max);
  assert.ok(large > 90);
  assert.match(penche.svg, /murs penchés, recul du montant au mur/);
  assert.ok(penche.svg.includes(`niveau étroit (lisse haute) : 90 mm`) && penche.svg.includes(`niveau large (lisse basse) : ${large} mm`), "les deux reculs sont écrits");
  assert.ok(penche.svg.includes(`>${large}</text>`), "la cote du dessin est le recul réel");
  const droit = plan(0);
  assert.doesNotMatch(droit.svg, /murs penchés, recul/);
  assert.doesNotMatch(droit.svg, /LISSE BASSE|LISSE HAUTE/);
  assert.equal(plan(1180).svg, droit.svg, "Bh = B : identique à Bh = 0");
});
