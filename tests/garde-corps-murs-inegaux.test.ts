/**
 * Murs pas parallèles (Quentin, 10/10/2026) : plus de renvoi vers l'atelier. Le garde-corps suit les murs, chaque traverse est
 * coupée à la largeur de son niveau, et les DEUX largeurs (en bas au ras de l'appui, à 1 m du sol) restent des données du relevé
 * jusqu'à la commande : la fiche, l'adresse du prix, le panier, le tarif du serveur, le libellé, le colis.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import {
  BORNES_RELEVE_GC,
  ECART_MURS_SUSPECT_GC_MM,
  TOLERANCE_MURS_GC_MM,
  parametresPrixGC,
  releveDansLesBornes,
  type ReleveGC,
} from "../src/lib/garde-corps.ts";
import { COTES_GARDE_CORPS_VIDES, etatQuestionGC, lireReleve, texteEcartGC, type CotesGardeCorps } from "../src/lib/releve-gc.ts";
import { lineId } from "../src/lib/ligne-panier.ts";
import { libelleGardeCorps } from "../src/lib/products.ts";
import { tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC, configurationGC, lireRequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { RETRAIT } from "../src/lib/deplacement.ts";

const t = fr.artisanat;
const FENETRE: CotesGardeCorps = {
  ...COTES_GARDE_CORPS_VIDES,
  etage: t.gcEtageOptions[0],
  largeur: "1180",
  allege: "650",
  fenetre: "1400",
};
const cotes = (c: Partial<CotesGardeCorps>): CotesGardeCorps => ({ ...FENETRE, ...c });
const releveDe = (c: Partial<CotesGardeCorps>) => {
  const l = lireReleve(cotes(c), t);
  assert.equal(l.etat, "ok");
  return l.etat === "ok" ? l.releve : (undefined as never);
};

function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}

/* ---------------------------- la lecture de la fiche ---------------------------- */

test("murs pas parallèles : le relevé garde la largeur du bas ET celle du haut (plus le minimum)", () => {
  const r = releveDe({ largeur: "1180", largeurHaut: "1120", mursInegaux: true });
  assert.equal(r.largeurMm, 1180, "largeurMm est la largeur du BAS, pas la plus petite");
  assert.equal(r.largeurHautMm, 1120);
  // Plus large en haut qu'en bas : le bas reste le bas.
  const inverse = releveDe({ largeur: "1120", largeurHaut: "1180", mursInegaux: true });
  assert.equal(inverse.largeurMm, 1120);
  assert.equal(inverse.largeurHautMm, 1180);
});

test("murs droits : une seule largeur, aucun champ du haut", () => {
  assert.equal("largeurHautMm" in releveDe({ largeurHaut: "1120" }), false, "une case du haut tapée puis des murs droits : ignorée");
  assert.equal("largeurHautMm" in releveDe({ largeurHaut: "1180", mursInegaux: true }), false, "deux largeurs égales : des murs droits");
});

test("murs pas parallèles : les deux largeurs sont dans les bornes de l'outil", () => {
  const B = BORNES_RELEVE_GC.largeurMm;
  assert.deepEqual(lireReleve(cotes({ largeurHaut: String(B.min - 1), mursInegaux: true }), t), { etat: "hors-bornes", raison: "trop-etroit" });
  assert.deepEqual(lireReleve(cotes({ largeurHaut: String(B.max + 1), mursInegaux: true }), t), { etat: "hors-bornes", raison: "trop-large" });
  assert.deepEqual(lireReleve(cotes({ largeur: String(B.max + 1), largeurHaut: "1180", mursInegaux: true }), t), { etat: "hors-bornes", raison: "trop-large" });
  assert.deepEqual(lireReleve(cotes({ largeurHaut: "", mursInegaux: true }), t), { etat: "incomplet", manque: "largeurHaut", illisible: false });
  assert.equal(releveDansLesBornes({ ...releveDe({}), largeurHautMm: B.max + 1 }), false);
  assert.equal(releveDansLesBornes({ ...releveDe({}), largeurHautMm: 1120 }), true);
  assert.equal(releveDansLesBornes({ ...releveDe({}), largeurHautMm: 1120.5 }), false);
});

test("téléphone, question 2 : un écart de plus de 150 mm avertit une fois (jamais un blocage)", () => {
  const ecart = cotes({ largeurHaut: String(1180 - ECART_MURS_SUSPECT_GC_MM - 1), mursInegaux: true });
  const e = etatQuestionGC(ecart, 2, t, "fr");
  assert.equal(e.manque, null);
  assert.match(e.avertissement ?? "", /^Vérifiez vos deux largeurs : 151 mm d'écart, c'est beaucoup\.$/);
  assert.equal(etatQuestionGC(cotes({ largeurHaut: "1100", mursInegaux: true }), 2, t, "fr").avertissement, null, "80 mm : rien");
  assert.equal(etatQuestionGC(cotes({ largeurHaut: "1180", mursInegaux: false }), 2, t, "fr").avertissement, null);
  // Le relevé, lui, passe : l'avertissement ne bloque rien.
  assert.equal(lireReleve(ecart, t).etat, "ok");
});

test("murs pas parallèles : l'écart est dit sans jamais renvoyer vers l'atelier", () => {
  const f = texteEcartGC(cotes({ largeurHaut: "1120", mursInegaux: true }), "fr");
  assert.equal(f, "Vos murs ne sont pas parallèles : 60 mm d'écart. Le garde-corps suit vos murs : chaque traverse est coupée à la largeur de son niveau.");
  const e = texteEcartGC(cotes({ largeurHaut: "1120", mursInegaux: true }), "en");
  assert.equal(e, "Your walls are not parallel: 60 mm apart. The railing follows your walls: each rail is cut to the width at its level.");
  // Un mur qui bouge de 2 mm (l'enduit) : rien à dire.
  assert.equal(texteEcartGC(cotes({ largeurHaut: String(1180 - TOLERANCE_MURS_GC_MM), mursInegaux: true }), "fr"), null);
  // Même un très grand écart : jamais « atelier », « visite », « mesurer ».
  const grand = texteEcartGC(cotes({ largeurHaut: "700", mursInegaux: true }), "fr")!;
  assert.doesNotMatch(grand, /atelier|visite|mesurer/i);
});

test("plus aucun « faites mesurer par l'atelier » lié à l'écart des murs", () => {
  const sources = ["../src/components/releve-garde-corps.tsx", "../src/lib/releve-gc.ts", "../src/lib/garde-corps.ts", "../src/components/etapes-telephone.tsx", "../src/components/product-options.tsx"];
  for (const s of sources) {
    const texte = readFileSync(new URL(s, import.meta.url), "utf8");
    assert.doesNotMatch(texte, /versAtelier|ecartMursCourt|ECART_MURS_GC_MM/, s);
    assert.doesNotMatch(texte, /Faites mesurer/i, s);
    assert.doesNotMatch(texte, /l'atelier vérifie à la visite/i, s);
  }
  const normes = JSON.stringify(fr).match(/"mesurerBody":"([^"]*)"/g) ?? [];
  assert.ok(normes.length > 0);
  for (const m of normes) assert.doesNotMatch(m, /\{ecart\}|mesure(r)? par l'atelier|visite de mesure/i);
  assert.doesNotMatch(JSON.stringify(en), /"mesurerBody":"[^"]*(\{ecart\}|measuring visit)/);
});

/* ---------------------------- l'adresse du prix ---------------------------- */

const BASE = "l=1180&allege=650&etage=1&wood=chene";
const lire = (q: string) => lireRequetePrixGC(new URLSearchParams(q));

test("requête : « lh » (largeur à 1 m du sol) est lu avec les bornes de « l », refusé sinon", () => {
  assert.equal(lire(`${BASE}&lh=1120`)?.releve.largeurHautMm, 1120);
  assert.equal(lire(BASE)?.releve.largeurHautMm, undefined, "absent : des murs droits");
  assert.equal("largeurHautMm" in lire(BASE)!.releve, false);
  const B = BORNES_RELEVE_GC.largeurMm;
  for (const bad of [B.min - 1, B.max + 1, "1120.5", "-5", "1e3", "", "abc", "1120mm"]) assert.equal(lire(`${BASE}&lh=${bad}`), null, `lh=${bad}`);
  assert.equal(lire(`${BASE}&lh=1120&lh=1100`), null, "en double");
  assert.equal(lire(`${BASE}&lh=${B.min}`)?.releve.largeurHautMm, B.min);
  assert.equal(lire(`${BASE}&lh=${B.max}`)?.releve.largeurHautMm, B.max);
});

test("l'adresse fabriquée par la fiche se relit à l'identique avec les deux largeurs", () => {
  const r: ReleveGC = { largeurMm: 1180, largeurHautMm: 1120, allegeMm: 650, enEtage: true, fenetreMm: 1400 };
  const p = parametresPrixGC(r, { woodId: "chene" });
  assert.equal(p.get("lh"), "1120");
  assert.deepEqual(lireRequetePrixGC(p)?.releve, r);
  assert.equal(parametresPrixGC({ ...r, largeurHautMm: undefined }, { woodId: "chene" }).has("lh"), false);
});

/* ---------------------------- le panier et le serveur ---------------------------- */

test("panier : deux largeurs hautes différentes font deux lignes ; sans largeur haute, l'identifiant d'avant", () => {
  const base = { id: "x", name: "Garde-corps", optionsLabel: "", unitPrice: 0, slug: "garde-corps", quantity: 1, sizeId: "sur-mesure", largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400, woodId: "chene" } as const;
  const droit = lineId(base);
  assert.notEqual(lineId({ ...base, largeurHautMm: 1120 }), droit);
  assert.notEqual(lineId({ ...base, largeurHautMm: 1120 }), lineId({ ...base, largeurHautMm: 1100 }));
  assert.equal(lineId({ ...base, largeurHautMm: 1120 }), lineId({ ...base, largeurHautMm: 1120 }));
  assert.ok(!droit.includes("lh"), "l'identifiant des lignes déjà au panier ne change pas");
  // Une autre pièce n'a pas de largeur haute.
  assert.equal(lineId({ id: "t", slug: "table-mikado", quantity: 1, largeurHautMm: 1120 } as never), lineId({ id: "t", slug: "table-mikado", quantity: 1 } as never));
});

const garde = (r: Record<string, unknown> = {}) => ({
  slug: "garde-corps", largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400,
  woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix", quantity: 1, ...r,
});
const tarif = (lignes: unknown) => tarifer(lignes, { locale: "fr", gc: CALCUL_GC });

test("tarif du serveur : la largeur à 1 m du sol arrive au relevé, au libellé, et reste refusée si elle est illisible", async () => {
  chiffrageOuEchec();
  const murs = await tarif([garde({ largeurHautMm: 1120 }), { slug: RETRAIT }]);
  assert.equal(murs.probleme, null);
  const releve = murs.pieces[0].line.gc?.releve;
  assert.equal(releve?.largeurMm, 1180);
  assert.equal(releve?.largeurHautMm, 1120);
  assert.match(murs.pieces[0].line.size.label, /1.180 \/ 1.120 × \d/);
  // Murs droits, ou deux largeurs égales : le libellé d'avant.
  for (const l of [garde(), garde({ largeurHautMm: 1180 })]) {
    const droit = await tarif([l, { slug: RETRAIT }]);
    assert.equal(droit.pieces[0].line.gc?.releve.largeurHautMm, undefined);
    assert.doesNotMatch(droit.pieces[0].line.size.label, /\//);
  }
  // Illisible ou hors bornes : refusé, jamais pris pour « absent ».
  for (const mauvais of ["abc", 99_999, 12, -1, 1120.5]) {
    const faux = await tarif([garde({ largeurHautMm: mauvais }), { slug: RETRAIT }]);
    assert.ok(faux.refusees.length > 0 || faux.probleme !== null, String(mauvais));
  }
});

test("libellé : « Sur mesure — 1 180 / 1 120 × 350 mm » quand elles diffèrent, inchangé sinon", () => {
  const sans = libelleGardeCorps(1180, 350, 2, "fr");
  assert.match(sans, /^Sur mesure — 1.180 × 350 mm/);
  assert.equal(libelleGardeCorps(1180, 350, 2, "fr", { largeurHautMm: 1180 }), sans);
  assert.equal(libelleGardeCorps(1180, 350, 2, "fr", { largeurHautMm: undefined }), sans);
  const avec = libelleGardeCorps(1180, 350, 2, "fr", { largeurHautMm: 1120 });
  assert.match(avec, /^Sur mesure — 1.180 \/ 1.120 × 350 mm/);
  assert.match(libelleGardeCorps(1180, 350, 2, "en", { largeurHautMm: 1120 }), /^Custom — 1,180 \/ 1,120 × 350 mm/);
});

test("la largeur à 1 m du sol arrive jusqu'au moteur : chaque traverse est coupée à sa largeur", () => {
  const base = { largeurMm: 1180, allegeMm: 585, enEtage: true, fenetreMm: 0 };
  const droit = configurationGC(base, "chene");
  const penche = configurationGC({ ...base, largeurHautMm: 1120 }, "chene");
  assert.ok(droit && penche && droit.ok && penche.ok);
  assert.equal((droit as { v: { Bh: number } }).v.Bh, 1180);
  assert.equal((penche as { v: { Bh: number } }).v.Bh, 1120);
  const noms = (c: unknown) => (c as { R: { debit: { nom: string }[] } }).R.debit.map((d) => d.nom);
  // Murs droits : la ligne unique, comme avant. Murs pas parallèles : deux traverses distinctes.
  assert.ok(noms(droit).includes("Traverses du cadre (haut et bas)"));
  assert.ok(noms(penche).includes("Traverse basse du cadre") && noms(penche).includes("Traverse haute du cadre"));
  // Pas d'alerte « à faire mesurer » : l'outil calcule, y compris avec un grand écart.
  const grand = configurationGC({ ...base, largeurHautMm: 1000 }, "chene");
  assert.ok(grand && grand.ok);
});
