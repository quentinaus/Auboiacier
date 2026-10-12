/**
 * Vague 5 du référencement (12/10/2026) : escalier, tables, verrières, soudure sur mesure, volutes, portillon et
 * « métallier près d'Angers, Tours, Cholet, Chinon, Doué-la-Fontaine ». Pas de page par ville : tout est renforcé sur des
 * pages existantes. Ce test garde ce qui peut se casser sans bruit :
 *
 * 1. les distances de la zone sont celles du code (à vol d'oiseau depuis Saumur, arrondies à 1 km près) ;
 * 2. le français et l'anglais ont les mêmes blocs ;
 * 3. aucun mot interdit (artisan, premium, « pose comprise », colliers…) dans les textes ajoutés ;
 * 4. les fiches renforcées gardent leurs sections et leurs liens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import frBrut from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import enBrut from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { products, productLocalise } from "../src/lib/products.ts";
import { RAYON_MAX_KM } from "../src/lib/deplacement.ts";

const SAUMUR = { lat: 47.2601, lon: -0.0769 };
const VILLES: Record<string, { lat: number; lon: number }> = {
  "Doué-la-Fontaine": { lat: 47.192, lon: -0.276 },
  Chinon: { lat: 47.1676, lon: 0.2405 },
  Angers: { lat: 47.4784, lon: -0.5632 },
  Tours: { lat: 47.3941, lon: 0.6848 },
  Cholet: { lat: 47.06, lon: -0.88 },
};
function vol(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
const chaines = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(chaines) : v && typeof v === "object" ? Object.values(v).flatMap(chaines) : [];
const forme = (v: unknown): unknown =>
  typeof v === "string" ? "t" : Array.isArray(v) ? v.map(forme) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, s]) => [k, forme(s)])) : typeof v;

const CLES_ZONE = ["villesTitle", "villesIntro", "villes", "villesProche", "villesLoin", "villesSans"] as const;
const AJOUTS = {
  zone: CLES_ZONE.map((k) => frBrut.zone[k]),
  tables: [frBrut.tables.saumurTitle, frBrut.tables.saumurBody, frBrut.tables.saumurLiens],
  verrieres: [frBrut.verrieres.saumurTitle, frBrut.verrieres.saumurBody, frBrut.verrieres.faq],
};
const AJOUTS_EN = {
  zone: CLES_ZONE.map((k) => enBrut.zone[k]),
  tables: [enBrut.tables.saumurTitle, enBrut.tables.saumurBody, enBrut.tables.saumurLiens],
  verrieres: [enBrut.verrieres.saumurTitle, enBrut.verrieres.saumurBody, enBrut.verrieres.faq],
};

test("zone : les cinq villes, leurs distances à vol d'oiseau depuis Saumur, arrondies", () => {
  for (const dico of [frBrut, enBrut]) {
    assert.deepEqual(dico.zone.villes.map((v) => v.nom), Object.keys(VILLES));
    for (const v of dico.zone.villes) {
      const km = Number(v.distance.match(/\d+/)?.[0]);
      assert.ok(Math.abs(km - vol(SAUMUR, VILLES[v.nom])) <= 1, `${v.nom} : ${v.distance} pour ${vol(SAUMUR, VILLES[v.nom]).toFixed(1)} km`);
      assert.ok(km <= RAYON_MAX_KM);
    }
  }
});

test("textes ajoutés : mêmes blocs en français et en anglais", () => {
  assert.deepEqual(forme(AJOUTS), forme(AJOUTS_EN));
  assert.deepEqual(
    frBrut.tables.saumurLiens.map((l) => l.slug),
    enBrut.tables.saumurLiens.map((l) => l.slug)
  );
  for (const l of frBrut.tables.saumurLiens) assert.ok(products.some((p) => p.slug === l.slug), `${l.slug} n'est pas une fiche`);
});

/** Les sections que la vague 5 ajoute aux fiches : leur titre commence par ce qu'on tape. */
const SECTIONS_FICHES: Record<string, { fr: RegExp; en: RegExp }[]> = {
  "escalier-limon-central": [{ fr: /escalier métallique sur mesure à Saumur/i, en: /bespoke steel staircase in Saumur/i }],
  "garde-corps-forge-volutes": [{ fr: /Ferronnerie à Saumur/, en: /Ironwork in Saumur/ }],
  portillon: [
    { fr: /portillon de jardin sur mesure/i, en: /made-to-measure garden gate/i },
    { fr: /portillon assorti au portail ou à la clôture/i, en: /pedestrian gate to match your gate or fence/i },
  ],
};
test("fiches renforcées : leurs sections sont là, dans les deux langues, et les volutes restent soudées", () => {
  for (const [slug, attendus] of Object.entries(SECTIONS_FICHES)) {
    const fiche = products.find((p) => p.slug === slug)!;
    for (const locale of ["fr", "en"] as const) {
      const titres = productLocalise(fiche, locale).sections.map((s) => s.title);
      for (const a of attendus) assert.ok(titres.some((t) => a[locale].test(t)), `${slug} (${locale}) : section absente ${a[locale]}`);
    }
  }
  const volutes = productLocalise(products.find((p) => p.slug === "garde-corps-forge-volutes")!, "fr");
  assert.match(volutes.sections.map((s) => s.body).join(" "), /volutes sont soudées/);
});

test("textes ajoutés : aucun mot interdit, aucune promesse nouvelle", () => {
  const sources = [
    ...chaines(AJOUTS),
    ...chaines(AJOUTS_EN),
    ...["escalier-limon-central", "garde-corps-forge-volutes", "portillon"].flatMap((slug) =>
      (["fr", "en"] as const).flatMap((l) => productLocalise(products.find((p) => p.slug === slug)!, l).sections.map((s) => `${s.title} ${s.body}`))
    ),
  ].join("\n");
  const interdits = [/artisan/i, /premium/i, /\bluxe\b|luxury/i, /\ble seul\b|the only/i, /certifi/i, /pose comprise|fitting included/i, /\bcolliers?\b/i, /\bIA\b|\bAI\b|\b3D\b/, /généré|generated/i, /forgé à la main/i];
  for (const mot of interdits) assert.doesNotMatch(sources, mot);
  assert.doesNotMatch(sources, /\d\s?€|€\s?\d/, "un prix tapé à la main");
});

test("pages : la zone, la fiche tables et les verrières affichent les blocs ajoutés", () => {
  const lire = (c: string) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  assert.match(lire("app/[lang]/zone-intervention/page.tsx"), /t\.villes\.map/);
  assert.match(lire("app/[lang]/artisanat/tables/page.tsx"), /t\.saumurLiens\.map/);
  assert.match(lire("app/[lang]/artisanat/verrieres/page.tsx"), /t\.faq\.map/);
  // Aucune page par ville.
  for (const ville of ["angers", "tours", "cholet", "chinon"]) assert.doesNotMatch(lire("app/sitemap.ts"), new RegExp(`/${ville}`));
});
