/**
 * La page « Garde-corps de balcon et de terrasse sur mesure » (/garde-corps-balcon-terrasse) :
 * des textes vrais, aux bonnes longueurs, sans prix tapé à la main ni promesse de pose.
 *
 * Ce qu'on vérifie :
 * 1. le français et l'anglais disent la même chose (mêmes blocs, mêmes listes) ;
 * 2. le title tient (40 signes au plus, jamais coupé par titreSeo) et la description fait 140 à 155 signes ;
 * 3. aucune recherche d'une autre page : ni « fenêtre », ni « Juliet », ni « métallier » dans le title, la
 *    description ou le H1 (une recherche = une page) ;
 * 4. aucun mot de la liste « Jamais » du plan de référencement, ni « artisan » (loi 96-603, art. 21) ;
 * 5. aucun prix écrit à la main : la seule somme est celle de la prise de cotes, lue dans le code ;
 * 6. les chiffres de la règle sont ceux des sources (R134-59, NF P01-012 de 2024), et pas les erreurs connues ;
 * 7. la pose : seulement avec l'assurance décennale, jamais « comprise » ;
 * 8. la page : un seul H1, le fil d'Ariane et le service balisés, aucune FAQ balisée, les liens voisins.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { descriptionSeo, descriptionTient, titreSeo } from "../src/lib/seo.ts";
import { valeursMarqueurs } from "../src/lib/marqueurs.ts";
import { HAUTEUR_LOI_GC_MM, SPHERE_GC_MM, SPHERE_HAUT_GC_MM, Z_ESCALADE_GC_MM, Z_SPHERE_GC_MM } from "../src/lib/garde-corps.ts";
import {
  REGLE_EXTERIEUR,
  textesBrutsGcExterieur,
  textesGcExterieur,
  valeursGcExterieur,
  type TextesGcExterieur,
} from "../src/lib/textes/garde-corps-balcon-terrasse.ts";

const LANGUES = ["fr", "en"] as const;
const PAGE = readFileSync(new URL("../src/app/[lang]/garde-corps-balcon-terrasse/page.tsx", import.meta.url), "utf8");

/** Toutes les chaînes d'un objet, à toute profondeur. */
function chaines(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(chaines);
  if (valeur && typeof valeur === "object") return Object.values(valeur).flatMap(chaines);
  return [];
}

/** La forme d'un objet : ses clés et la longueur de ses listes, sans les textes. */
function forme(valeur: unknown): unknown {
  if (typeof valeur === "string") return "texte";
  if (Array.isArray(valeur)) return valeur.map(forme);
  if (valeur && typeof valeur === "object") return Object.fromEntries(Object.entries(valeur).map(([cle, sous]) => [cle, forme(sous)]));
  return typeof valeur;
}

/** Tout le texte d'une langue, prêt à afficher, en une seule chaîne (espaces insécables ramenées à des espaces). */
const tout = (t: TextesGcExterieur) => chaines(t).join("\n").replace(/[  ]/g, " ");

test("le français et l'anglais ont les mêmes blocs, et aucun texte vide (sauf la ligne anglaise en français)", () => {
  const fr = textesBrutsGcExterieur("fr");
  const en = textesBrutsGcExterieur("en");
  assert.deepEqual(forme(fr), forme(en));
  for (const locale of LANGUES) {
    const t = textesBrutsGcExterieur(locale);
    for (const [cle, valeur] of Object.entries(t)) {
      if (cle === "anglais") continue;
      for (const s of chaines(valeur)) assert.ok(s.trim().length > 0, `${locale} : texte vide dans ${cle}`);
    }
  }
  assert.equal(textesBrutsGcExterieur("fr").anglais, "");
  assert.match(textesBrutsGcExterieur("en").anglais, /English spoken/);
});

for (const locale of LANGUES) {
  test(`${locale} : title de 40 signes au plus, jamais coupé ; description de 140 à 155 signes, entière`, () => {
    const t = textesGcExterieur(locale);
    assert.ok(t.seo.title.length <= 40, `title de ${t.seo.title.length} signes : « ${t.seo.title} »`);
    assert.equal(titreSeo(t.seo.title), `${t.seo.title} — Auboiacier Saumur`, "titreSeo ne doit rien couper");
    assert.ok(titreSeo(t.seo.title).length <= 60);
    const d = t.seo.description;
    assert.ok(d.length >= 140 && d.length <= 155, `description de ${d.length} signes : « ${d} »`);
    assert.ok(descriptionTient(d));
    assert.equal(descriptionSeo(d), d);
  });

  test(`${locale} : une recherche = une page — ni fenêtre, ni Juliet, ni métallier dans le title, la description, le H1`, () => {
    const t = textesGcExterieur(locale);
    for (const s of [t.seo.title, t.seo.description, t.h1]) {
      assert.doesNotMatch(s, /fen[êe]tre|window|juliet|m[ée]tallier|metalworker/i, s);
    }
    // Les mots visés : balcon et terrasse, sur mesure (bespoke).
    assert.match(t.seo.title, locale === "fr" ? /terrasse.*balcon.*sur mesure/i : /bespoke.*balcony.*terrace/i);
    assert.match(t.h1, locale === "fr" ? /balcon.*terrasse.*sur mesure/i : /balcony.*terrace/i);
  });

  test(`${locale} : aucun mot interdit (liste « Jamais » du plan, « artisan » avant l'immatriculation)`, () => {
    const texte = tout(textesGcExterieur(locale));
    const interdits: RegExp[] = [
      /premium/i,
      /\blux(e|ueux|ueuse|ury)\b/i,
      /d'exception/i,
      /\bn°\s?1\b|\bno\. ?1\b/i,
      /\ble seul\b|\bthe only\b/i,
      /\ble premier\b|\bthe first\b/i,
      /\bleader\b/i,
      /\ble meilleur\b|\bbest\b/i,
      /certifi/i,
      /\bNF\b(?! P01-01[23])/,
      /artisan/i,
      /ma[îi]tre artisan|master craftsman|meilleur ouvrier/i,
      /ferronnier|forgeron|blacksmith|[ée]b[ée]niste|menuisier/i,
      /\bIA\b|\bAI\b|\bCGI\b|\b3D\b|g[ée]n[ée]r[ée]|generated/i,
      /fer forg[ée]|forg[ée] à la main|wrought iron/i,
      /volute|scroll/i,
      /plafond tendu|stretch ceiling/i,
      /pos[ée] chez/i,
      /plusieurs ann[ée]es/i,
      /PEFC|FSC|for[êe]ts? g[ée]r[ée]es?/i,
      /solidit[ée]|r[ée]sistance v[ée]rifi[ée]e/i,
      /\bcustom\b/i,
      /juliet/i,
    ];
    for (const motif of interdits) assert.doesNotMatch(texte, motif, `${locale} : ${motif}`);
  });

  test(`${locale} : aucun prix écrit à la main ; la seule somme est celle de la prise de cotes, lue dans le code`, () => {
    const brut = chaines(textesBrutsGcExterieur(locale)).join("\n");
    assert.doesNotMatch(brut, /€|\bEUR\b|\beuros?\b/i, "aucun montant dans les textes bruts");
    assert.match(brut, /\{prixVisite\}/, "la prise de cotes passe par son marqueur");
    const texte = chaines(textesGcExterieur(locale)).join("\n");
    assert.doesNotMatch(texte, /\{\w+(:[\w-]+)?\}/, "aucun marqueur restant");
    const sommes = [...texte.matchAll(/€\s?[\d\s.,  ]+|[\d][\d\s.,  ]*\s?€/g)].map((m) => m[0].replace(/[\s.,\u00a0\u202f]+$/, "").trim());
    assert.deepEqual(sommes, [valeursMarqueurs(locale)["{prixVisite}"]]);
  });

  test(`${locale} : la pose attend l'assurance décennale ; jamais « pose comprise », ni « posé par l'atelier »`, () => {
    const t = textesGcExterieur(locale);
    const texte = tout(t);
    assert.doesNotMatch(texte, /pose comprise|pos[ée]e? par l'atelier|pose par l'atelier|(?<!\bis )fitting included|fitted by (us|the workshop)/i);
    assert.match(t.pose, locale === "fr" ? /assurance décennale/ : /ten-year building insurance/);
    assert.match(t.pose, locale === "fr" ? /lundi 7 décembre 2026/ : /Monday 7 December 2026/, "la date d'ouverture lue dans le code");
    const faqPose = t.faq.find((qr) => /pose|fitting/i.test(qr.q));
    assert.ok(faqPose, "une question sur la pose");
    assert.match(faqPose.r, locale === "fr" ? /décennale/ : /ten-year/);
  });

  test(`${locale} : aucun des faits faux connus (corrections du 07/10/2026)`, () => {
    const texte = tout(textesGcExterieur(locale));
    for (const motif of [
      /cintr[ée]|\bbent\b/i,
      /c[âa]bles?\b/i,
      /install[ée] à Saumur/i,
      /fixations? fournies?|visserie|pose facile/i,
      /rien n'est sous-trait[ée]/i,
      /partout en France(?! métropolitaine)|nationwide/i,
    ]) {
      assert.doesNotMatch(texte, motif, `${locale} : ${motif}`);
    }
  });
}

test("les chiffres de la règle sont ceux des sources (R134-59, NF P01-012 de novembre 2024)", () => {
  // R134-59 b) : 1 m au moins ; 0,80 m si le garde-corps a plus de 50 cm d'épaisseur.
  assert.equal(REGLE_EXTERIEUR.hauteurMm, 1000);
  assert.equal(REGLE_EXTERIEUR.hauteurEpaisMm, 800);
  assert.equal(REGLE_EXTERIEUR.epaisseurMm, 500);
  // NF P01-012 (2024) : protection quand la chute dépasse 1 m ; appuis de 0,10 à 0,60 m ; boules de 110 et 180 mm, limite à 0,80 m.
  assert.equal(REGLE_EXTERIEUR.chuteMm, 1000);
  assert.equal(REGLE_EXTERIEUR.appuiBasMm, 100);
  assert.equal(REGLE_EXTERIEUR.appuiHautMm, 600);
  assert.equal(REGLE_EXTERIEUR.bouleMm, 110);
  assert.equal(REGLE_EXTERIEUR.bouleHautMm, 180);
  assert.equal(REGLE_EXTERIEUR.zoneBouleMm, 800);
  // Les mêmes valeurs que le garde-corps de fenêtre (elles-mêmes comparées à l'outil de plans).
  assert.equal(REGLE_EXTERIEUR.hauteurMm, HAUTEUR_LOI_GC_MM);
  assert.equal(REGLE_EXTERIEUR.appuiHautMm, Z_ESCALADE_GC_MM);
  assert.equal(REGLE_EXTERIEUR.bouleMm, SPHERE_GC_MM);
  assert.equal(REGLE_EXTERIEUR.bouleHautMm, SPHERE_HAUT_GC_MM);
  assert.equal(REGLE_EXTERIEUR.zoneBouleMm, Z_SPHERE_GC_MM);
  // Eurocode 1, logement : 0,6 kN/m.
  assert.equal(REGLE_EXTERIEUR.chargeNParM, 600);
  // Application : permis et déclarations déposés depuis le 1er juin 2025, autres travaux depuis le 1er janvier 2026.
  assert.equal(REGLE_EXTERIEUR.applicationPermis, "2025-06-01");
  assert.equal(REGLE_EXTERIEUR.applicationTravaux, "2026-01-01");
});

test("les chiffres écrits sur la page : les bons, et pas les erreurs connues", () => {
  const v = valeursGcExterieur("fr");
  const espaces = (s: string) => s.replace(/[  ]/g, " ");
  assert.deepEqual(
    [v.chute, v.hauteur, v.hauteurEpaisse, v.epaisseur, v.appuiBas, v.appuiHaut, v.boule, v.bouleHaut, v.zoneBoule, v.charge, v.chargeKg].map(espaces),
    ["1 m", "1 m", "0,80 m", "50 cm", "10 cm", "60 cm", "11 cm", "18 cm", "80 cm", "0,6 kN", "60 kg"]
  );
  assert.equal(v.permis, "1er juin 2025");
  assert.equal(v.travaux, "1er janvier 2026");
  assert.equal(espaces(valeursGcExterieur("en").hauteurEpaisse), "0.80 m");
  const fr = tout(textesGcExterieur("fr"));
  // 0,90 m n'est qu'un palier de la norme (40 à 45 cm d'épaisseur), pas la hauteur réduite d'un garde-corps épais.
  assert.doesNotMatch(fr, /0,90 m/);
  // La « zone de stationnement précaire » n'est citée que comme règle de 1988, remplacée.
  for (const s of chaines(textesGcExterieur("fr")).filter((s) => /stationnement précaire/.test(s))) {
    assert.match(s, /remplace[^.]*1988/);
  }
  // « dès que la chute dépasse 1 m » : plus de 1 m, et non « dès 1 m ».
  assert.match(fr, /dépasse 1 m/);
  assert.doesNotMatch(fr, /dès 1 m/);
});

test("la page : un seul H1, le fil d'Ariane et le service balisés, aucune FAQ balisée, les pages voisines liées", () => {
  assert.equal((PAGE.match(/<h1\b/g) ?? []).length, 1);
  assert.match(PAGE, /jsonLdFilAriane\(/);
  assert.match(PAGE, /jsonLdService\(/);
  assert.doesNotMatch(PAGE, /jsonLdFaq|FaqVisible/);
  assert.doesNotMatch(PAGE, /offre\s*:/, "le service n'annonce aucun prix");
  for (const lien of ["/artisanat/garde-corps", "/garde-corps-fenetre-normes", "/rendez-vous", "/contact", "/zone-intervention", "/bois-massif"]) {
    assert.ok(PAGE.includes(lien), `lien vers ${lien}`);
  }
  // Les textes viennent tous du fichier des textes : aucune phrase en dur dans la page.
  assert.match(PAGE, /textesGcExterieur\(locale\)/);
  assert.match(PAGE, /<Visuel\b[^>]*locale=\{locale\}/, "l'image passe par Visuel, qui pose « Image d'illustration »");
});
