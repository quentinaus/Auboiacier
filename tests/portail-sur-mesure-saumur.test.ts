/**
 * La page « Portail sur mesure à Saumur » (/portail-sur-mesure-saumur) : des textes vrais, aux bonnes longueurs, sans
 * prix tapé à la main ni promesse nouvelle.
 *
 * 1. le français et l'anglais disent la même chose (mêmes blocs) ;
 * 2. le title tient, la description fait 140 à 155 signes, « sur mesure » / « bespoke » et Saumur y sont ;
 * 3. aucun mot interdit (premium, luxe, certifié, artisan, IA…), jamais « pose comprise » ;
 * 4. aucun prix écrit : seul le prix de la prise de cotes, lu dans le code ;
 * 5. le délai est celui du configurateur, l'acompte et le rayon ceux du code ;
 * 6. la page est au plan du site, au pied de page, et les fiches portail et la page des portails y mènent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { descriptionSeo, descriptionTient, titreSeo } from "../src/lib/seo.ts";
import { valeursMarqueurs } from "../src/lib/marqueurs.ts";
import { RAYON_MAX_KM } from "../src/lib/deplacement.ts";
import { ACOMPTE_PORTAIL_PCT } from "../src/lib/portails.ts";
import {
  DELAI_PORTAIL,
  MODELES_PAGE_PORTAIL,
  textesBrutsPortailSurMesure,
  textesPortailSurMesure,
} from "../src/lib/textes/portail-sur-mesure-saumur.ts";

const LANGUES = ["fr", "en"] as const;
const lire = (chemin: string) => readFileSync(new URL(`../src/${chemin}`, import.meta.url), "utf8");
const COULEURS = "anthracite, noir, blanc, vert sapin et rouille";

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
const tout = (locale: "fr" | "en") => chaines(textesPortailSurMesure(locale, COULEURS)).join("\n").replace(/[  ]/g, " ");

test("le français et l'anglais ont les mêmes blocs, et aucun texte vide (sauf la ligne anglaise en français)", () => {
  assert.deepEqual(forme(textesBrutsPortailSurMesure("fr")), forme(textesBrutsPortailSurMesure("en")));
  for (const locale of LANGUES) {
    for (const [cle, valeur] of Object.entries(textesBrutsPortailSurMesure(locale))) {
      if (cle === "anglais") continue;
      for (const s of chaines(valeur)) assert.ok(s.trim().length > 0, `${locale} : texte vide dans ${cle}`);
    }
  }
  assert.equal(textesBrutsPortailSurMesure("fr").anglais, "");
  assert.match(textesBrutsPortailSurMesure("en").anglais, /English spoken/);
});

for (const locale of LANGUES) {
  test(`${locale} : title, description et H1 disent ce que les gens tapent`, () => {
    const t = textesPortailSurMesure(locale, COULEURS);
    assert.ok(titreSeo(t.seo.title).length <= 60, titreSeo(t.seo.title));
    assert.ok(titreSeo(t.seo.title).startsWith(t.seo.title), "titreSeo ne doit rien couper");
    const d = t.seo.description;
    assert.ok(d.length >= 140 && d.length <= 155, `description de ${d.length} signes : « ${d} »`);
    assert.ok(descriptionTient(d));
    assert.equal(descriptionSeo(d), d);
    const mot = locale === "fr" ? /sur mesure/i : /bespoke/i;
    for (const s of [t.seo.title, t.seo.description, t.h1]) assert.match(s, mot, s);
    for (const s of [t.seo.title, t.seo.description, t.h1]) assert.match(s, /Saumur/, s);
    assert.match(t.seo.title + t.h1, locale === "fr" ? /alu/i : /aluminium/i);
    assert.match(t.seo.title + t.h1, locale === "fr" ? /acier/i : /steel/i);
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
      /r[ée]paration/i,
      /\bcustom\b/i,
    ];
    for (const motif of interdits) assert.doesNotMatch(texte, motif, `${locale} : ${motif}`);
  });

  test(`${locale} : aucun prix écrit à la main ; la seule somme est celle de la prise de cotes, lue dans le code`, () => {
    const brut = chaines(textesBrutsPortailSurMesure(locale)).join("\n");
    assert.doesNotMatch(brut, /€|\bEUR\b|\beuros?\b/i, "aucun montant dans les textes bruts");
    assert.match(brut, /\{prixVisite\}/);
    const texte = chaines(textesPortailSurMesure(locale, COULEURS)).join("\n");
    assert.doesNotMatch(texte, /\{\w+(:[\w-]+)?\}/, "aucun marqueur restant");
    const sommes = [...texte.matchAll(/€\s?[\d\s.,  ]+|[\d][\d\s.,  ]*\s?€/g)].map((m) => m[0].replace(/[\s.,  ]+$/, "").trim());
    assert.ok(sommes.length > 0);
    for (const s of sommes) assert.equal(s, valeursMarqueurs(locale)["{prixVisite}"]);
  });

  test(`${locale} : le délai, l'acompte et le rayon sont ceux du code`, () => {
    const texte = tout(locale);
    assert.ok(texte.includes(DELAI_PORTAIL[locale]), "le délai du configurateur");
    assert.ok(texte.includes(String(RAYON_MAX_KM)), "le rayon de pose");
    assert.match(texte, new RegExp(`${ACOMPTE_PORTAIL_PCT} ?%`));
  });

  test(`${locale} : la réception dit pose, livraison et retrait, et le moteur seulement posé`, () => {
    const t = textesPortailSurMesure(locale, COULEURS);
    assert.equal(t.reception.length, 3);
    assert.match(tout(locale), locale === "fr" ? /sans pose et sans moteur/i : /no fitting and no motor/i);
    assert.match(t.moto.join(" "), locale === "fr" ? /que posé par l'atelier/ : /only sold fitted by the workshop/);
  });
}

test("le délai de la page est celui du configurateur", () => {
  const configurateur = lire("components/portail-configurateur.tsx");
  assert.ok(configurateur.includes(`dDelaiTxt: "${DELAI_PORTAIL.fr}"`), "délai français");
  assert.ok(configurateur.includes(`dDelaiTxt: "${DELAI_PORTAIL.en}"`), "délai anglais");
});

test("la page : un seul H1, le fil d'Ariane et le service balisés, aucune FAQ balisée, les quatre fiches", () => {
  const page = lire("app/[lang]/portail-sur-mesure-saumur/page.tsx");
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
  assert.match(page, /jsonLdFilAriane/);
  assert.match(page, /jsonLdService/);
  assert.doesNotMatch(page, /jsonLdFaq/);
  assert.doesNotMatch(page, /\d\s*€|€\s*\d/, "un montant écrit dans la page");
  assert.match(page, /prixDepartPortail/);
  assert.deepEqual([...MODELES_PAGE_PORTAIL], ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"]);
});

test("au plan du site, au pied de page, et les fiches portail et la page des portails y mènent", () => {
  assert.match(lire("app/sitemap.ts"), /chemin: "\/portail-sur-mesure-saumur"/);
  assert.ok(lire("components/site-footer.tsx").includes("/portail-sur-mesure-saumur"));
  assert.match(lire("app/[lang]/artisanat/[slug]/page.tsx"), /famille === "portail"[\s\S]{0,200}\/portail-sur-mesure-saumur/);
  assert.ok(lire("app/[lang]/artisanat/famille/[famille]/page.tsx").includes("/portail-sur-mesure-saumur"));
});
