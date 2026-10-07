import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  appliquerStyle, configDepart, guidePortail, lireConfig, planPortail, styleDe, versParams, DECORS_PORTAIL, SLUGS_PORTAIL, STYLES_PORTAIL,
  type ConfigPortail, type SlugPortail,
} from "../src/lib/portails.ts";
import { prixDepartPortail, prixPortail } from "../src/lib/portails-outil/prix.ts";
import { getProduct } from "../src/lib/products.ts";

/**
 * Les portails sur le site (étude du 06/10/2026) : le dessin vient du moteur de l'outil de plans (extrait tel quel), le
 * prix du chiffrage de l'outil (chiffré dans le dépôt). Ces tests tiennent le site et l'outil ensemble : même prix pour
 * chaque portail de la référence écrite par scripts/extraire-portails.mjs, à l'euro.
 */

const REF = JSON.parse(readFileSync(new URL("./reference/portails-outil.json", import.meta.url), "utf8")) as {
  cas: { modele: string; v: Record<string, unknown>; prix: number; alertes: number }[];
};
const SLUG_DE = Object.fromEntries(Object.entries(SLUGS_PORTAIL).map(([s, m]) => [m, s])) as Record<string, SlugPortail>;

/** La configuration du site qui correspond à une entrée de l'outil (style + options). */
function configDe(slug: SlugPortail, v: Record<string, unknown>): ConfigPortail {
  let cfg = configDepart(slug, v.ptStyle as never);
  if (v.ptP) cfg = { ...cfg, P: Number(v.ptP) };
  if (v.ptH) cfg = { ...cfg, H: Number(v.ptH) };
  if (v.ptMoteur) cfg = { ...cfg, moteur: true };
  if (v.ptPoteaux) cfg = { ...cfg, poteaux: v.ptPoteaux as ConfigPortail["poteaux"] };
  if (v.ptGuidage) cfg = { ...cfg, guidage: v.ptGuidage as ConfigPortail["guidage"] };
  if (v.ptDecor) cfg = { ...cfg, decor: v.ptDecor as ConfigPortail["decor"], mat: "acier" };
  return cfg;
}

test("les prix du site sont ceux de l'outil de plans, portail par portail (120 cas)", () => {
  assert.ok(REF.cas.length >= 100);
  for (const c of REF.cas) {
    const slug = SLUG_DE[c.modele];
    const r = prixPortail(slug, configDe(slug, c.v));
    if (c.alertes) { assert.equal(r.ok, false, `${c.modele} ${JSON.stringify(c.v)} : à étudier dans l'outil`); continue; }
    assert.ok(r.ok, `${c.modele} ${JSON.stringify(c.v)} : refusé sur le site`);
    if (r.ok) assert.equal(r.prix, c.prix, `${c.modele} ${JSON.stringify(c.v)}`);
  }
});

test("les 4 fiches existent, et leur « à partir de » est le style le moins cher à la cote courante", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const fiche = getProduct(slug);
    assert.ok(fiche, slug);
    assert.equal(fiche?.famille, "portail");
    assert.equal(fiche?.orderMode, "quote");
    const depart = prixDepartPortail(slug);
    const prix = STYLES_PORTAIL.map((st) => prixPortail(slug, configDepart(slug, st))).filter((r) => r.ok).map((r) => (r as { prix: number }).prix);
    assert.equal(depart, Math.min(...prix), slug);
  }
});

test("la configuration se relit à l'identique, et tout choix inconnu ou toute cote hors bornes est refusé", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) for (const st of STYLES_PORTAIL) {
    const cfg = configDepart(slug, st);
    const lu = lireConfig(versParams(slug, cfg));
    assert.deepEqual(lu, { slug, cfg }, `${slug} ${st}`);
    assert.equal(styleDe(cfg), st, `${slug} ${st} : le style se reconnaît`);
  }
  const p = versParams("portail-battant", configDepart("portail-battant"));
  for (const [k, v] of [["P", "900"], ["P", "9000"], ["H", "3000"], ["mat", "bois"], ["remp", "verre"], ["slug", "fenetre"], ["moteur", "oui"]]) {
    const q = new URLSearchParams(p);
    q.set(k, v);
    assert.equal(lireConfig(q), null, `${k}=${v}`);
  }
});

test("un style remplit les blocs ; changer un bloc donne « composé »", () => {
  const cfg = appliquerStyle(configDepart("portail-battant"), "volutes");
  assert.equal(cfg.mat, "acier");
  assert.equal(cfg.remp, "barreaux");
  assert.equal(cfg.decor, "frise", "le style Volutes = barreaux + la formule de décor « frise » (lot 3)");
  assert.equal(styleDe(cfg), "volutes");
  assert.equal(styleDe({ ...cfg, decor: "medaillon" }), null);
});

test("le guide des trois questions mène au bon modèle", () => {
  assert.deepEqual(guidePortail({ derriere: true }), { slug: "portail-battant" });
  assert.deepEqual(guidePortail({ derriere: false, cote: false }), { slug: "portail-pliant" });
  assert.deepEqual(guidePortail({ derriere: false, cote: true, sol: true }), { slug: "portail-coulissant", guidage: "rail" });
  assert.deepEqual(guidePortail({ derriere: false, cote: true, sol: false }), { slug: "portail-coulissant", guidage: "auto" });
  assert.equal(guidePortail({}), null);
});

test("décors (lot 3) : chaque formule se dessine et se chiffre sur le site, avec le catalogue anonymisé", () => {
  for (const slug of ["portail-battant", "portillon"] as SlugPortail[]) for (const d of DECORS_PORTAIL) {
    if (d === "aucun") continue;
    const cfg = { ...configDepart(slug, "barreaux"), decor: d, mat: "acier" as const };
    const R = planPortail(slug, cfg);
    const r = prixPortail(slug, cfg);
    if (d === "surMesure") { assert.equal(r.ok, false, `${slug} : sur mesure = à étudier`); continue; }
    assert.equal(R.alertes.length, 0, `${slug} ${d} : ${R.alertes.join(" ")}`);
    const base = prixPortail(slug, configDepart(slug, "barreaux"));
    assert.ok(r.ok && base.ok && r.prix > base.prix, `${slug} ${d} : plus cher que les barreaux seuls`);
    assert.equal(lireConfig(versParams(slug, cfg))?.cfg.decor, d, `${slug} ${d} : se relit`);
  }
});

test("le dessin vient de l'outil : vue de face, de dessus et de côté pour chaque modèle et chaque style", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) for (const st of STYLES_PORTAIL) {
    const R = planPortail(slug, configDepart(slug, st));
    assert.ok(R.vues.face.length > 5 && R.vues.dessus.length > 3 && R.vues.cote.length > 3, `${slug} ${st}`);
    assert.equal(R.alertes.length, 0, `${slug} ${st} : ${R.alertes.join(" ")}`);
  }
});

test("aucun coût en clair dans ce que le dépôt publie (moteur, référence, fiches)", () => {
  const publics = [
    readFileSync(new URL("../src/lib/portails-outil/moteur.genere.mjs", import.meta.url), "utf8"),
    readFileSync(new URL("./reference/portails-outil.json", import.meta.url), "utf8"),
    readFileSync(new URL("../src/lib/portails.ts", import.meta.url), "utf8"),
  ].join("\n");
  for (const interdit of ["TARIFS_ACHATS", "heure_atelier", "prixPaye", "fraisFixes", "kit_moteur", "gonds_portail_reglables", "plancher\":", "prixCle", "volute_cat_", "coeur_cat_", "La Mine de Fer", "Ferronnerie en ligne", "Déco Fer Forgé", "SF11051", "02.204", "MTC_PRIX"]) {
    assert.ok(!publics.includes(interdit), `« ${interdit} » ne doit jamais être publié`);
  }
  const chiffre = readFileSync(new URL("../src/lib/portails-outil/chiffrage.chiffre.mjs", import.meta.url), "utf8");
  for (const interdit of ["TARIFS_ACHATS", "heure_atelier", "Locinox", "Nice"]) assert.ok(!chiffre.includes(interdit), `chiffrage chiffré : ${interdit}`);
});
