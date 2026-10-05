/**
 * Le titre et la description que Google affiche pour chaque fiche produit,
 * et les pages écrites pour le référencement (tables, bois massif, plafonds,
 * zone d'intervention).
 *
 * seo.test.ts vérifie les textes des dictionnaires ; les fiches, elles,
 * assemblent leur titre et leur description à la volée (nom, mots de métier,
 * accroche, prix « à partir de »), dans src/app/[lang]/artisanat/[slug]/page.tsx.
 * On refait ici le même assemblage, avec le vrai prix du moteur, et on vérifie
 * que rien n'est coupé par Google — un titre amputé perd justement les mots
 * que les gens tapent.
 *
 * Aucun montant n'est écrit dans ce fichier : les prix viennent de prixDepart.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import frBrut from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import enBrut from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { products, productLocalise } from "../src/lib/products.ts";
import { prixDepart } from "../src/lib/garde-corps-outil/site.ts";
import { descriptionSeo, titreSeo } from "../src/lib/seo.ts";
import { prixAffiche } from "../src/lib/ui.ts";
import { remplacerMarqueurs } from "../src/lib/marqueurs.ts";
import { PRIX_OFFRE_CENTS } from "../src/lib/deplacement.ts";

const fr = remplacerMarqueurs(frBrut, "fr");
/**
 * Les chaises restent en dehors : Quentin va peut-être les retirer, on n'y
 * touche pas (leur titre actuel perd un mot à la coupe).
 */
const fiches = products.filter((p) => p.famille !== "chaise" && p.famille !== "chaise-exterieur");
const en = remplacerMarqueurs(enBrut, "en");
const DICTIONNAIRES = { fr, en } as const;

/** Même assemblage que generateMetadata de la fiche produit. */
function balisesFiche(slug: string, locale: "fr" | "en") {
  const fiche = productLocalise(products.find((p) => p.slug === slug)!, locale);
  const depart = prixDepart(fiche);
  const depuis =
    depart === null
      ? fiche.priseDeCotes
        ? locale === "fr"
          ? "Sur devis, pose comprise."
          : "Price on request, fitting included."
        : locale === "fr"
          ? "Sur devis."
          : "Price on request."
      : locale === "fr"
        ? `À partir de ${prixAffiche(depart, locale)}.`
        : `From ${prixAffiche(depart, locale)}.`;
  const titre =
    fiche.seoTitre ?? (fiche.seoMots ? `${fiche.name} — ${fiche.seoMots}` : `${fiche.name} — ${fiche.tagline}`);
  const description = fiche.seoDescription
    ? `${fiche.seoDescription} ${depuis}`
    : `${fiche.tagline} ${depuis} ${DICTIONNAIRES[locale].seo.produitSuffixe}`;
  return { titre, description, depart };
}

for (const locale of ["fr", "en"] as const) {
  test(`${locale} : le titre Google de chaque fiche tient en 60 signes, sans mot perdu`, () => {
    for (const p of fiches) {
      const { titre } = balisesFiche(p.slug, locale);
      const rendu = titreSeo(titre);
      assert.ok(rendu.length <= 60, `${p.slug} : « ${rendu} » fait ${rendu.length} signes`);
      const mots = new Set(rendu.toLowerCase().split(/\s+/));
      for (const mot of titre.toLowerCase().split(/\s+/)) {
        assert.ok(mots.has(mot), `${p.slug} : « ${titre} » coupé en « ${rendu} » (« ${mot} » perdu)`);
      }
      assert.match(rendu, /Auboiacier/, `${p.slug} : atelier absent de « ${rendu} »`);
      assert.match(rendu, /Saumur/, `${p.slug} : ville absente de « ${rendu} »`);
    }
  });

  test(`${locale} : la description Google de chaque fiche, prix compris, n'est jamais coupée`, () => {
    for (const p of fiches) {
      const { description } = balisesFiche(p.slug, locale);
      assert.equal(
        descriptionSeo(description),
        // descriptionSeo remplace les espaces insécables des prix par des espaces simples.
        description.replace(/\s+/g, " ").trim(),
        `${p.slug} : description de ${description.length} signes, coupée par Google`
      );
    }
  });

  test(`${locale} : deux fiches n'ont jamais le même titre Google`, () => {
    const vus = new Map<string, string>();
    for (const p of fiches) {
      const rendu = titreSeo(balisesFiche(p.slug, locale).titre);
      assert.ok(!vus.has(rendu), `${p.slug} et ${vus.get(rendu)} partagent « ${rendu} »`);
      vus.set(rendu, p.slug);
    }
  });
}

test("le garde-corps a son prix « à partir de » (clé du chiffrage présente)", () => {
  const { depart } = balisesFiche("garde-corps", "fr");
  assert.ok(
    depart !== null && depart > 0,
    "Clé du chiffrage absente : copier .env.chiffrage.local d'une autre copie du site (jamais par git)."
  );
});

test("aucun montant de prise de cotes n'est tapé dans les textes : il vient de deplacement.ts", () => {
  const prixFr = prixAffiche(PRIX_OFFRE_CENTS / 100, "fr").replace(/\s/g, " ");
  const prixEn = prixAffiche(PRIX_OFFRE_CENTS / 100, "en");
  const chiffre = (PRIX_OFFRE_CENTS / 100).toFixed(2);
  for (const [nom, brut] of [
    ["fr.json", frBrut],
    ["en.json", enBrut],
  ] as const) {
    const texte = JSON.stringify(brut);
    assert.ok(!texte.includes(chiffre), `${nom} écrit ${chiffre} en dur`);
    assert.ok(!texte.includes(chiffre.replace(".", ",")), `${nom} écrit ${chiffre.replace(".", ",")} en dur`);
  }
  const catalogue = readFileSync(new URL("../src/lib/products.ts", import.meta.url), "utf8");
  assert.ok(!/19[.,]99/.test(catalogue), "products.ts écrit le prix de la prise de cotes en dur");
  // Et une fois remplacé, le marqueur dit bien le prix du code.
  assert.ok(fr.seo.rdv.title.replace(/\s/g, " ").includes(prixFr), fr.seo.rdv.title);
  assert.ok(en.seo.rdv.title.includes(prixEn), en.seo.rdv.title);
  for (const dict of [fr, en]) {
    assert.ok(!JSON.stringify(dict).includes("{prixVisite}"), "marqueur {prixVisite} resté tel quel");
    assert.ok(!JSON.stringify(dict).includes("{rayonVisite}"), "marqueur {rayonVisite} resté tel quel");
  }
});

test("les tailles de plafond citées dans les textes sont celles du catalogue", () => {
  const lucarne = products.find((p) => p.slug === "plafond-lumineux-lucarne")!.surMesure!;
  const halo = products.find((p) => p.slug === "plafond-lumineux-halo")!.surMesure!;
  const rect = `${lucarne.maxLargeurMm / 10} × ${lucarne.maxHauteurMm / 10} cm`;
  const disque = `Ø ${halo.maxLargeurMm / 10} cm`;
  for (const dict of [fr, en]) {
    for (const texte of [dict.seo.lumiere.description, dict.home.surMesureBody, dict.lumiere.faq[1].a]) {
      assert.ok(texte.includes(rect), `« ${texte} » ne dit pas ${rect}`);
      assert.ok(texte.includes(disque), `« ${texte} » ne dit pas ${disque}`);
    }
  }
});

test("les pages du référencement existent, figurent au plan du site et ont leurs textes", () => {
  const plan = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
  for (const [chemin, cle] of [
    ["/artisanat/tables", "tables"],
    ["/bois-massif", "bois"],
    ["/toiles-tendues", "lumiere"],
    ["/zone-intervention", "zone"],
  ] as const) {
    const fichier = new URL(`../src/app/[lang]${chemin}/page.tsx`, import.meta.url);
    assert.ok(existsSync(fichier), `${chemin} : page absente`);
    assert.ok(plan.includes(`chemin: "${chemin}"`), `${chemin} absent du plan du site`);
    for (const dict of [fr, en]) {
      assert.ok(dict.seo[cle].title && dict.seo[cle].description, `seo.${cle} incomplet`);
    }
  }
  // Un dossier statique sous /artisanat passe avant [slug] : aucune fiche ne
  // doit porter le même nom, sinon elle deviendrait inaccessible.
  for (const statique of ["tables", "verrieres", "sculptures"]) {
    assert.ok(!products.some((p) => p.slug === statique), `une fiche s'appelle « ${statique} »`);
  }
});

test("les questions balisées pour Google sont affichées à l'écran, jamais de note ni d'avis", () => {
  // Le composant des FAQ fabrique l'affichage ET le balisage depuis la même liste.
  const faq = readFileSync(new URL("../src/components/faq-visible.tsx", import.meta.url), "utf8");
  assert.match(faq, /jsonLdFaq\(questions\.map/);
  assert.match(faq, /\{questions\.map\(/);
  for (const chemin of ["artisanat/tables", "bois-massif", "toiles-tendues"]) {
    const source = readFileSync(new URL(`../src/app/[lang]/${chemin}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /<FaqVisible[^>]*questions=\{questions\}/, `${chemin} : la FAQ doit passer par FaqVisible`);
    assert.doesNotMatch(source, /jsonLdFaq/, `${chemin} : une FAQ balisée hors de FaqVisible`);
  }
  // Nulle part de note ni d'avis balisés : les avis restent sur la fiche Google.
  const seo = readFileSync(new URL("../src/lib/seo.ts", import.meta.url), "utf8");
  assert.doesNotMatch(seo, /AggregateRating|"Review"/);
  // Le bas de fiche commun ne balise plus sa FAQ : les mêmes questions sur
  // quinze pages passaient pour du contenu dupliqué.
  const tail = readFileSync(new URL("../src/components/product-tail.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(tail, /jsonLdFaq/);
});

test("accueil : les liens « Nos fabrications » et leurs libellés restent alignés, en français comme en anglais", () => {
  const accueil = readFileSync(new URL("../src/app/[lang]/page.tsx", import.meta.url), "utf8");
  const bloc = accueil.match(/\{\[\s*("\/[^\]]+?)\]\.map\(\(chemin, i\)/);
  assert.ok(bloc, "liste des chemins seoLinks introuvable dans src/app/[lang]/page.tsx");
  const chemins = [...bloc[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(chemins.length, fr.hub.seoLinks.length, "fr : un libellé de trop ou de moins");
  assert.equal(chemins.length, en.hub.seoLinks.length, "en : un libellé de trop ou de moins");
  assert.ok(chemins.includes("/artisanat/tables"));
  assert.ok(chemins.includes("/bois-massif"));
  assert.equal(chemins.indexOf("/artisanat/tables"), fr.hub.seoLinks.findIndex((l) => /^Tables/.test(l)));
});
