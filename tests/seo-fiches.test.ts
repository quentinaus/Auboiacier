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
import { existsSync, readdirSync, readFileSync } from "node:fs";

import frBrut from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import enBrut from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import {
  products,
  productLocalise,
  TRANSPORT_MAX_GRANDE_COTE_MM,
  TRANSPORT_MAX_PETITE_COTE_MM,
} from "../src/lib/products.ts";
import { prixDepart } from "../src/lib/garde-corps-outil/site.ts";
import { descriptionSeo, titreSeo } from "../src/lib/seo.ts";
import { prixAffiche } from "../src/lib/ui.ts";
import { remplacerMarqueurs } from "../src/lib/marqueurs.ts";
import { PRIX_OFFRE_CENTS } from "../src/lib/deplacement.ts";
import { questionsFaq, questionsPlafonds, questionsTables } from "../src/lib/faq-balisees.ts";
import { delaiFabrication } from "../src/lib/vitrine.ts";

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

test("les tailles de plafond citées dans les textes sont celles du catalogue et du transport", () => {
  const lucarne = products.find((p) => p.slug === "plafond-lumineux-lucarne")!;
  const halo = products.find((p) => p.slug === "plafond-lumineux-halo")!;
  // Le plus grand plafond : celui du catalogue.
  const rect = `${lucarne.surMesure!.maxLargeurMm / 10} × ${lucarne.surMesure!.maxHauteurMm / 10} cm`;
  const disque = `Ø ${halo.surMesure!.maxLargeurMm / 10} cm`;
  // Le plus grand d'un seul tenant, donc livrable : la limite des transporteurs.
  const rectLivrable = `${TRANSPORT_MAX_GRANDE_COTE_MM / 10} × ${TRANSPORT_MAX_PETITE_COTE_MM / 10} cm`;
  const disqueLivrable = `Ø ${TRANSPORT_MAX_PETITE_COTE_MM / 10} cm`;
  // Les fiches disent la même chose que le code.
  assert.ok(JSON.stringify(lucarne.specs).includes(`D'un seul tenant jusqu'à ${rectLivrable}`));
  assert.ok(JSON.stringify(halo.specs).includes(`D'un seul tenant jusqu'à ${TRANSPORT_MAX_PETITE_COTE_MM / 10} cm`));
  for (const dict of [fr, en]) {
    // Les textes qui citent le plus grand plafond disent aussi jusqu'où il part d'un seul tenant.
    for (const texte of [dict.home.surMesureBody, dict.lumiere.faq[1].a]) {
      for (const taille of [rect, disque, rectLivrable, disqueLivrable]) {
        assert.ok(texte.includes(taille), `« ${texte} » ne dit pas ${taille}`);
      }
    }
    // Ceux qui parlent de livraison disent la limite livrable.
    const posePlafond = dict.faq.items.find((item) => /plafond lumineux|stretch ceiling/.test(item.q))!.a;
    for (const texte of [dict.seo.lumiere.description, dict.lumiere.fabricationBody, posePlafond]) {
      for (const taille of [rectLivrable, disqueLivrable]) {
        assert.ok(texte.includes(taille), `« ${texte} » ne dit pas ${taille}`);
      }
    }
    assert.ok(dict.home.surMesureTitle.includes(rectLivrable), dict.home.surMesureTitle);
  }
  // Les descriptions Google des deux plafonds : jamais « livré en France » sans limite.
  for (const locale of ["fr", "en"] as const) {
    for (const plafond of [lucarne, halo]) {
      const description = productLocalise(plafond, locale).seoDescription ?? "";
      assert.doesNotMatch(description, /livrée? en France|delivered in France/, description);
      assert.ok(
        description.includes(plafond === halo ? disqueLivrable : rectLivrable),
        `${plafond.slug} (${locale}) : « ${description} » ne dit pas la limite livrable`
      );
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
  for (const chemin of ["artisanat/tables", "toiles-tendues"]) {
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

/** Tous les fichiers .tsx sous un dossier. */
function fichiersTsx(dossier: URL): URL[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const url = new URL(entree.name + (entree.isDirectory() ? "/" : ""), dossier);
    if (entree.isDirectory()) return fichiersTsx(url);
    return entree.name.endsWith(".tsx") ? [url] : [];
  });
}

test("FAQ : seules /faq, /artisanat/tables et /toiles-tendues balisent des questions", () => {
  const app = new URL("../src/app/", import.meta.url);
  const autorises = ["[lang]/faq/page.tsx", "[lang]/artisanat/tables/page.tsx", "[lang]/toiles-tendues/page.tsx"].map(
    (chemin) => new URL(chemin, app).href
  );
  for (const fichier of fichiersTsx(app)) {
    const source = readFileSync(fichier, "utf8");
    if (!/jsonLdFaq|<FaqVisible/.test(source)) continue;
    assert.ok(autorises.includes(fichier.href), `${fichier.pathname} balise une FAQ`);
    // Et chacune prend ses questions dans src/lib/faq-balisees.ts.
    assert.match(source, /questions(Faq|Tables|Plafonds)\(dict/, `${fichier.pathname} : questions hors de faq-balisees.ts`);
  }
});

for (const locale of ["fr", "en"] as const) {
  test(`${locale} : une même question, ou une même réponse, n'est balisée qu'une fois sur tout le site`, () => {
    const dict = DICTIONNAIRES[locale];
    // Comme les pages : les formats de la table de référence, le délai des plafonds.
    const reference = productLocalise(products.find((p) => p.slug === "table-mikado")!, locale);
    const formats = reference.sizes
      .filter((taille) => ["p6", "p8", "p10"].includes(taille.id))
      .map((taille) => taille.label)
      .join("; ");
    const delai =
      products
        .filter((p) => p.category === "lumiere")
        .map((p) => delaiFabrication(productLocalise(p, locale)))
        .find((d) => d !== null) ?? null;
    const toutes = [
      ...questionsFaq(dict).map((qr) => ({ ...qr, page: "/faq" })),
      ...questionsTables(dict, formats).map((qr) => ({ ...qr, page: "/artisanat/tables" })),
      ...questionsPlafonds(dict, delai).map((qr) => ({ ...qr, page: "/toiles-tendues" })),
    ];
    const normaliser = (texte: string) => texte.replace(/\s+/g, " ").trim().toLowerCase();
    for (const champ of ["q", "a"] as const) {
      const vus = new Map<string, string>();
      for (const qr of toutes) {
        const cle = normaliser(qr[champ]);
        assert.ok(!vus.has(cle), `« ${qr[champ]} » balisée sur ${vus.get(cle)} et sur ${qr.page}`);
        vus.set(cle, qr.page);
      }
    }
  });
}

test("un fil d'Ariane balisé est toujours un fil d'Ariane affiché", () => {
  for (const fichier of fichiersTsx(new URL("../src/app/", import.meta.url))) {
    const source = readFileSync(fichier, "utf8");
    if (!source.includes("jsonLdFilAriane(")) continue;
    assert.ok(source.includes("dict.nav.breadcrumb"), `${fichier.pathname} : BreadcrumbList sans fil d'Ariane visible`);
  }
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
