/**
 * La page « Métallier à Saumur » (/metallier-saumur) : des textes vrais, aux bonnes longueurs, sans prix tapé à la main
 * ni promesse nouvelle.
 *
 * 1. le français et l'anglais disent la même chose (mêmes blocs) ;
 * 2. le title tient, la description fait 140 à 155 signes, « Métallier à Saumur » / « Metalworker in Saumur » y est ;
 * 3. aucun mot interdit (premium, luxe, certifié, artisan, IA…), jamais « pose comprise » ;
 * 4. aucun prix écrit : seul le prix de la prise de cotes, lu dans le code ;
 * 5. délais, devis, rayon de pose et départements sont ceux des dictionnaires et du code ;
 * 6. la page est au plan du site, au pied de page, et l'accueil, la zone, À propos et les familles y mènent ;
 * 7. aucune FAQ balisée.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { descriptionSeo, descriptionTient, titreSeo } from "../src/lib/seo.ts";
import { valeursMarqueurs } from "../src/lib/marqueurs.ts";
import { RAYON_MAX_KM } from "../src/lib/deplacement.ts";
import { textesBrutsMetallierSaumur, textesMetallierSaumur } from "../src/lib/textes/metallier-saumur.ts";

const LANGUES = ["fr", "en"] as const;
const lire = (chemin: string) => readFileSync(new URL(`../src/${chemin}`, import.meta.url), "utf8");

function chaines(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(chaines);
  if (valeur && typeof valeur === "object") return Object.values(valeur).flatMap(chaines);
  return [];
}
function forme(valeur: unknown): unknown {
  if (typeof valeur === "string") return "texte";
  if (Array.isArray(valeur)) return valeur.map(forme);
  if (valeur && typeof valeur === "object") return Object.fromEntries(Object.entries(valeur).map(([cle, sous]) => [cle, forme(sous)]));
  return typeof valeur;
}
// Les adresses des pages (« /artisanat/… ») ne sont pas du texte lu.
const tout = (locale: "fr" | "en") => chaines(textesMetallierSaumur(locale)).filter((s) => !s.startsWith("/")).join("\n").replace(/[  ]/g, " ");

test("le français et l'anglais ont les mêmes blocs, et aucun texte vide (sauf la ligne anglaise en français)", () => {
  assert.deepEqual(forme(textesBrutsMetallierSaumur("fr")), forme(textesBrutsMetallierSaumur("en")));
  for (const locale of LANGUES) {
    for (const [cle, valeur] of Object.entries(textesBrutsMetallierSaumur(locale))) {
      if (cle === "anglais") continue;
      for (const s of chaines(valeur)) assert.ok(s.trim().length > 0, `${locale} : texte vide dans ${cle}`);
    }
  }
  assert.equal(textesBrutsMetallierSaumur("fr").anglais, "");
  assert.match(textesBrutsMetallierSaumur("en").anglais, /English spoken/);
  // Les mêmes adresses de pages, dans les deux langues.
  assert.deepEqual(
    textesBrutsMetallierSaumur("fr").fait.map((m) => m.chemin),
    textesBrutsMetallierSaumur("en").fait.map((m) => m.chemin)
  );
});

for (const locale of LANGUES) {
  test(`${locale} : title, description et H1 disent ce que les gens tapent`, () => {
    const t = textesMetallierSaumur(locale);
    assert.ok(titreSeo(t.seo.title).length <= 60, titreSeo(t.seo.title));
    assert.ok(titreSeo(t.seo.title).startsWith(t.seo.title), "titreSeo ne doit rien couper");
    const d = t.seo.description;
    assert.ok(d.length >= 140 && d.length <= 155, `description de ${d.length} signes : « ${d} »`);
    assert.ok(descriptionTient(d));
    assert.equal(descriptionSeo(d), d);
    const mot = locale === "fr" ? /Métallier à Saumur/ : /Metalworker in Saumur/;
    for (const s of [t.seo.title, t.seo.description, t.h1, t.fil]) assert.match(s, mot, s);
  });

  test(`${locale} : aucun mot interdit, jamais « pose comprise »`, () => {
    const texte = tout(locale);
    const interdits: RegExp[] = [
      /premium/i,
      /\blux(e|ueux|ueuse|ury)\b/i,
      /d'exception/i,
      /\ble seul\b|\bthe only\b/i,
      /\bn°\s?1\b|\bno\. ?1\b/i,
      /\bleader\b/i,
      /\ble meilleur\b|\bbest\b/i,
      /certifi/i,
      /\bNF\b/,
      /artisan/i,
      /\bIA\b|\bAI\b|\bCGI\b|\b3D\b|g[ée]n[ée]r[ée]|generated/i,
      /pose comprise|livraison comprise|(?<!\bis )fitting included|delivery included/i,
      /se r[ée]pare|r[ée]parable/i,
      /\bcustom\b/i,
      /\d+\s?ans d'exp|years of experience/i,
      /\bavis\b|reviews?\b/i,
    ];
    for (const motif of interdits) assert.doesNotMatch(texte, motif, `${locale} : ${motif}`);
  });

  test(`${locale} : aucun prix écrit à la main ; la seule somme est celle de la prise de cotes, lue dans le code`, () => {
    const brut = chaines(textesBrutsMetallierSaumur(locale)).join("\n");
    assert.doesNotMatch(brut, /€|\bEUR\b|\beuros?\b/i, "aucun montant dans les textes bruts");
    assert.match(brut, /\{prixVisite\}/);
    const texte = chaines(textesMetallierSaumur(locale)).join("\n");
    assert.doesNotMatch(texte, /\{\w+(:[\w-]+)?\}/, "aucun marqueur restant");
    const sommes = [...texte.matchAll(/€\s?[\d\s.,  ]+|[\d][\d\s.,  ]*\s?€/g)].map((m) => m[0].replace(/[\s.,  ]+$/, "").trim());
    assert.ok(sommes.length > 0);
    for (const s of sommes) assert.equal(s, valeursMarqueurs(locale)["{prixVisite}"]);
  });

  test(`${locale} : le rayon de pose et le délai sont ceux du code et des questions fréquentes`, () => {
    const texte = tout(locale);
    assert.ok(texte.includes(String(RAYON_MAX_KM)), "le rayon de pose");
    // Le délai des questions fréquentes (« de 3 à 12 semaines ») et le devis sous 48 h.
    const dico = lire(`app/[lang]/dictionaries/${locale}.json`);
    assert.match(dico, locale === "fr" ? /va de 3 à 12 semaines/ : /runs from 3 to 12 weeks/);
    assert.match(texte, locale === "fr" ? /de 3 à 12 semaines/ : /from 3 to 12 weeks/);
    assert.match(texte, locale === "fr" ? /sous 48 h/ : /within 48 hours/);
    for (const departement of ["Maine-et-Loire", "Indre-et-Loire", "Deux-Sèvres", "Vienne"]) assert.ok(texte.includes(departement), departement);
  });

  test(`${locale} : la soudure et le balcon sont sur devis, sans mot de pose`, () => {
    const t = textesMetallierSaumur(locale);
    for (const chemin of ["/soudure-reparations", "/garde-corps-balcon-terrasse"]) {
      const metier = t.fait.find((m) => m.chemin === chemin);
      assert.ok(metier, chemin);
      assert.doesNotMatch(metier.texte, /pos[ée]|fitt/i, `${chemin} : pas de pose tant que la décennale n'est pas signée`);
    }
  });
}

test("la page : un seul H1, fil d'Ariane et service balisés, aucune FAQ balisée, aucun montant écrit", () => {
  const page = lire("app/[lang]/metallier-saumur/page.tsx");
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
  assert.match(page, /jsonLdFilAriane/);
  assert.match(page, /jsonLdService/);
  assert.doesNotMatch(page, /jsonLdFaq|<FaqVisible/);
  assert.doesNotMatch(page, /\d\s*€|€\s*\d/, "un montant écrit dans la page");
  assert.match(page, /telephoneLisible/);
  assert.match(page, /COMMUNES_AFFICHEES/);
});

test("au plan du site, au pied de page, et l'accueil, la zone, À propos et les familles y mènent", () => {
  assert.match(lire("app/sitemap.ts"), /chemin: "\/metallier-saumur"/);
  assert.ok(lire("components/site-footer.tsx").includes("/metallier-saumur"));
  assert.ok(lire("app/[lang]/page.tsx").includes('"/metallier-saumur"'));
  assert.ok(lire("app/[lang]/zone-intervention/page.tsx").includes("/metallier-saumur"));
  assert.ok(lire("app/[lang]/a-propos/page.tsx").includes("/metallier-saumur"));
  assert.ok(lire("app/[lang]/artisanat/famille/[famille]/page.tsx").includes("/metallier-saumur"));
  assert.ok(lire("app/[lang]/artisanat/[slug]/page.tsx").includes("/metallier-saumur"));
  for (const langue of LANGUES) {
    const dico = JSON.parse(lire(`app/[lang]/dictionaries/${langue}.json`));
    assert.match(dico.liens.metallierSaumur, langue === "fr" ? /Métallier à Saumur/ : /Metalworker in Saumur/);
    assert.match(dico.hub.seoLinks[0], langue === "fr" ? /Métallier à Saumur/ : /Metalworker in Saumur/);
  }
});
