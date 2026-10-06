/**
 * Le titre et la description que Google affiche pour chaque fiche produit,
 * et les pages écrites pour le référencement (tables, bois massif, plafonds,
 * zone d'intervention).
 *
 * seo.test.ts vérifie les textes des dictionnaires ; les fiches, elles,
 * assemblent leur titre et leur description à la volée (nom, mots de métier,
 * accroche, prix affiché par la fiche), dans src/app/[lang]/artisanat/[slug]/page.tsx.
 * On refait ici le même assemblage, avec le vrai prix du moteur, et on vérifie
 * que rien n'est coupé par Google — un titre amputé perd justement les mots
 * que les gens tapent.
 *
 * Aucun montant n'est écrit dans ce fichier : les prix viennent du catalogue
 * et de l'outil (prixAfficheFiche, src/lib/donnees-google.ts).
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
import { prixAppelGC, prixDepart } from "../src/lib/garde-corps-outil/site.ts";
import { prixAfficheFiche, textePrixDescription } from "../src/lib/donnees-google.ts";
import { descriptionSeo, descriptionTient, lienAvisGoogle, titreSeo } from "../src/lib/seo.ts";
import { prixAffiche } from "../src/lib/ui.ts";
import { remplacerMarqueurs } from "../src/lib/marqueurs.ts";
import { PRIX_OFFRE_CENTS, RAYON_MAX_KM } from "../src/lib/deplacement.ts";
import { questionsEscalier, questionsFaq, questionsPlafonds, questionsTables } from "../src/lib/faq-balisees.ts";
import { CHEMIN_GUIDE_ESCALIER, guideEscalier } from "../src/lib/textes/guide-escalier.ts";
import { delaiFabrication } from "../src/lib/vitrine.ts";
import { ALLEGE_SANS_OBLIGATION_MM, HAUTEUR_LOI_GC_MM } from "../src/lib/garde-corps.ts";

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
  // Le prix que la fiche affiche, et lui seul (sans prix affiché : « Sur devis… ») ;
  // la phrase de la fiche, ou sa forme courte si la description ne tiendrait pas.
  const prixFiche = prixAfficheFiche(fiche, prixAppelGC(fiche));
  const titre =
    fiche.seoTitre ?? (fiche.seoMots ? `${fiche.name} — ${fiche.seoMots}` : `${fiche.name} — ${fiche.tagline}`);
  const assembler = (depuis: string) =>
    fiche.seoDescription
      ? `${fiche.seoDescription} ${depuis}`
      : `${fiche.tagline} ${depuis} ${DICTIONNAIRES[locale].seo.produitSuffixe}`;
  const complete = assembler(textePrixDescription(fiche, prixFiche, locale));
  const description = descriptionTient(complete) ? complete : assembler(textePrixDescription(fiche, prixFiche, locale, true));
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

  test(`${locale} : la description propre de chaque fiche laisse la place à la phrase de prix entière`, () => {
    // Partie « Les longueurs » du plan de référencement : 134 signes au plus avant « À partir de 1 480 €. », 108 avant
    // « Dès 300 € pour une fenêtre de 100 cm de large. », 129 avant « Sur devis, pose comprise. ». La forme courte de la
    // phrase de prix reste un filet de sécurité, pas la règle.
    for (const p of fiches) {
      const fiche = productLocalise(p, locale);
      assert.ok(fiche.seoDescription, `${p.slug} : pas de description propre (l'accroche ne dit pas ce que l'on cherche)`);
      const phrase = textePrixDescription(fiche, prixAfficheFiche(fiche, prixAppelGC(fiche)), locale);
      const complete = `${fiche.seoDescription} ${phrase}`;
      assert.ok(descriptionTient(complete), `${p.slug} : « ${complete} » (${complete.length} signes) serait coupée`);
    }
  });

  test(`${locale} : chaque fiche a sa ligne de titre principal (h1Ligne), une seule fois et dans sa langue`, () => {
    const vues = new Map<string, string>();
    for (const p of fiches) {
      const ligne = productLocalise(p, locale).h1Ligne;
      assert.ok(ligne && ligne.length >= 20, `${p.slug} : h1Ligne absente ou trop courte`);
      assert.ok(!vues.has(ligne), `${p.slug} et ${vues.get(ligne)} partagent la ligne « ${ligne} »`);
      vues.set(ligne, p.slug);
      if (locale === "en") assert.notEqual(ligne, p.h1Ligne, `${p.slug} : h1Ligne anglaise restée en français`);
    }
  });
}

/**
 * Les mots que les fiches ne s'autorisent pas (plan de référencement, liste « Jamais ») : superlatifs invérifiables,
 * labels sans certificat, titres réservés, mots de visuel calculé, et le plateau dit vrai (ni « premier choix », ni
 * origine, ni forêt gérée sans la fiche du fournisseur). « Style fer forgé » et « wrought-iron style » sont permis :
 * l'acier plein en a l'allure, rien n'est forgé.
 */
const MOTS_INTERDITS_FICHES = [
  /premium/i,
  /\blux/i,
  /d'exception/i,
  /n°\s?1\b|No\.\s?1\b/i,
  /\b(le|la) seule?\b|\bthe only\b/i,
  /leader|meilleur|\bbest\b/i,
  /certifi/i,
  /artisan d'art|maître artisan|ferronnier d'art|master craftsman|blacksmith/i,
  /\bIA\b|\bAI\b|\b3D\b|\bCGI\b|généré|generated/,
  /forgée? à la main|hand-?forged/i,
  /(?<!style |façon )fer forgé|wrought[- ]iron(?![- ]style)/i,
  /ébéniste|menuisier|forgeron/i,
  /barrisol|clipso|crittall/i,
  /premier choix|first-grade|chêne français|French oak|forêts? gérées?|sustainabl|\bPEFC\b|\bFSC\b/i,
  /plafond tendu|stretch ceiling/i,
];

test("fiches : aucun mot interdit dans les titres, descriptions, accroches, sections et textes alternatifs", () => {
  for (const p of fiches) {
    for (const locale of ["fr", "en"] as const) {
      const fiche = productLocalise(p, locale);
      const textes: [string, string | undefined][] = [
        ["seoTitre", fiche.seoTitre],
        ["seoDescription", fiche.seoDescription],
        ["h1Ligne", fiche.h1Ligne],
        ["tagline", fiche.tagline],
        ...fiche.sections.flatMap((s, i) => [[`section ${i + 1}`, `${s.title} ${s.body}`]] as [string, string][]),
        ...fiche.images.map((img, i) => [`photo ${i + 1}`, img.alt] as [string, string]),
        ...(fiche.photosDescriptif ?? []).map((img, i) => [`photo descriptive ${i + 1}`, img.alt] as [string, string]),
      ];
      for (const [champ, texte] of textes) {
        if (!texte) continue;
        for (const motif of MOTS_INTERDITS_FICHES) {
          assert.doesNotMatch(texte, motif, `${p.slug} (${locale}, ${champ}) : « ${texte} »`);
        }
        // « custom » est américain ou australien : en anglais britannique, « bespoke », « made to measure ».
        if (locale === "en" && ["seoTitre", "seoDescription", "h1Ligne"].includes(champ)) {
          assert.doesNotMatch(texte, /custom/i, `${p.slug} (${champ}) : « ${texte} »`);
        }
      }
    }
  }
});

test("les trois tables d'intérieur n'ouvrent pas leur description Google par les mêmes mots", () => {
  for (const locale of ["fr", "en"] as const) {
    const debuts = ["table-mikado", "table-croix", "table-brindille"].map((slug) =>
      (productLocalise(products.find((p) => p.slug === slug)!, locale).seoDescription ?? "").split(/\s+/).slice(0, 3).join(" ")
    );
    assert.equal(new Set(debuts).size, debuts.length, `${locale} : ${debuts.join(" / ")}`);
  }
});

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
    // Les textes qui citent le plus grand plafond disent aussi jusqu'où il part
    // d'un seul tenant (le bloc « Au-delà de 230 × 210 cm » : titre et texte).
    for (const texte of [`${dict.home.surMesureTitle} ${dict.home.surMesureBody}`, dict.lumiere.faq[0].a]) {
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
    ["/garde-corps-fenetre-normes", "normesGc"],
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

test("FAQ : seules /faq, /artisanat/tables, /toiles-tendues et le guide de l'escalier balisent des questions", () => {
  const app = new URL("../src/app/", import.meta.url);
  const autorises = [
    "[lang]/faq/page.tsx",
    "[lang]/artisanat/tables/page.tsx",
    "[lang]/toiles-tendues/page.tsx",
    // Le guide de l'escalier (plan de référencement, page n° 1 : « FAQ balisée ici seulement »).
    "[lang]/escalier-limon-central-prix-normes/page.tsx",
  ].map((chemin) => new URL(chemin, app).href);
  for (const fichier of fichiersTsx(app)) {
    const source = readFileSync(fichier, "utf8");
    if (!/jsonLdFaq|<FaqVisible/.test(source)) continue;
    assert.ok(autorises.includes(fichier.href), `${fichier.pathname} balise une FAQ`);
    // Et chacune prend ses questions dans src/lib/faq-balisees.ts.
    assert.match(source, /questions(Faq|Tables|Plafonds)\(dict|questionsEscalier\(g\)/, `${fichier.pathname} : questions hors de faq-balisees.ts`);
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
      ...questionsEscalier(guideEscalier(locale)).map((qr) => ({ ...qr, page: CHEMIN_GUIDE_ESCALIER })),
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

test("avis : sans adresse de fiche Google, ni phrase « nos avis sont sur Google », ni lien, ni recherche de repli", () => {
  // La fiche Google Business Profile n'existe pas encore (MISE-EN-LIGNE.md).
  const attendu = process.env.NEXT_PUBLIC_ATELIER_GOOGLE?.trim() || null;
  assert.equal(lienAvisGoogle(), attendu);
  const seo = readFileSync(new URL("../src/lib/seo.ts", import.meta.url), "utf8");
  assert.doesNotMatch(seo, /google\.[a-z.]+\/maps\/search/, "une recherche Google Maps sert encore de repli");
  for (const dict of [fr, en]) {
    // Le texte affiché par défaut ne parle pas de Google.
    for (const texte of [dict.hub.testimonialsNote, dict.artisanat.avisNote]) {
      assert.doesNotMatch(texte, /Google/, texte);
    }
  }
  // La phrase Google et le lien ne s'affichent que si la fiche est renseignée.
  const accueil = readFileSync(new URL("../src/app/[lang]/page.tsx", import.meta.url), "utf8");
  assert.match(accueil, /ficheGoogle \? t\.testimonialsNoteGoogle : t\.testimonialsNote/);
  assert.match(accueil, /\{ficheGoogle && \(\s*<a\s+href=\{ficheGoogle\}/);
  const tail = readFileSync(new URL("../src/components/product-tail.tsx", import.meta.url), "utf8");
  assert.match(tail, /ficheGoogle \? t\.avisNoteGoogle : t\.avisNote/);
  assert.match(tail, /\{ficheGoogle && \(\s*<a\s+href=\{ficheGoogle\}/);
  for (const source of [accueil, tail]) {
    assert.doesNotMatch(source, /href=\{lienAvisGoogle\(\)\}/, "lien Google affiché sans condition");
  }
});

test("textes : ni pose en une journée ni « pas de poussière », et le délai des tables n'est pas toujours sur la fiche", () => {
  for (const [nom, brut] of [
    ["fr.json", frBrut],
    ["en.json", enBrut],
  ] as const) {
    const texte = JSON.stringify(brut);
    for (const promesse of [/poussi[èe]re/i, /\bdust\b/i, /en une journée/i, /\bin a day\b/i]) {
      assert.doesNotMatch(texte, promesse, `${nom} : promesse invérifiable ${promesse}`);
    }
  }
  // Une table au moins n'a pas de délai écrit (« délai confirmé avec le devis ») :
  // la page des tables ne peut pas dire que le délai est sur chaque fiche, sans plus.
  const sansDelai = products.filter(
    (p) => p.famille?.startsWith("table") && p.specs.some((s) => s.label === "Fabrication" && /devis/.test(s.value))
  );
  if (sansDelai.length > 0) {
    assert.match(fr.tables.fabricationBody, /confirmé avec le devis/, fr.tables.fabricationBody);
    assert.match(en.tables.fabricationBody, /confirmed with the quote/, en.tables.fabricationBody);
  }
});

test("zone : aucune pose ni prise de cotes promise au-delà du rayon de l'atelier", () => {
  for (const dict of [fr, en]) {
    const corps = dict.zone.sections[0].body;
    assert.ok(corps.includes(`${RAYON_MAX_KM} km`), corps);
    assert.doesNotMatch(corps, /pose plus loin|fitting further afield|écrivez-nous|write to us/i, corps);
  }
});

test("/toiles-tendues : une même explication n'y revient pas deux fois", () => {
  for (const [locale, dict] of [
    ["fr", fr],
    ["en", en],
  ] as const) {
    const tl = dict.lumiere;
    // Tous les textes de la page, FAQ comprise (délai fictif : seule sa présence compte).
    const page = [
      tl.choixCadre,
      tl.choixTendu,
      tl.choixPrix,
      tl.poseBody,
      tl.lumiereBody,
      tl.piecesBody,
      tl.fabricationBody,
      dict.home.surMesureTitle,
      dict.home.surMesureBody,
      ...questionsPlafonds(dict, "6 semaines").flatMap((qr) => [qr.q, qr.a]),
    ].join("\n");
    const motifs =
      locale === "fr"
        ? [/sans outil/gi, /d'un seul tenant/gi, /plafond tendu couvre/gi]
        : [/without a tool/gi, /in one piece/gi, /stretch ceiling covers/gi];
    for (const motif of motifs) {
      const n = page.match(motif)?.length ?? 0;
      assert.ok(n <= 1, `${locale} : ${motif} revient ${n} fois sur /toiles-tendues`);
    }
  }
});

test("/bois-massif : « L'entretien au quotidien » mène à la question de la FAQ, ancre comprise", () => {
  for (const dict of [fr, en]) {
    const question = dict.faq.items.find((item) => item.id === "entretien-bois-acier");
    assert.ok(question, "question d'entretien sans ancre dans /faq");
    assert.equal(question.q, dict.artisanat.faqCareQ);
  }
  const page = readFileSync(new URL("../src/app/[lang]/bois-massif/page.tsx", import.meta.url), "utf8");
  assert.match(page, /"entretien-bois-acier"/);
  assert.match(page, /lien: \{ href: lienEntretien, label: t\.huileLien \}/);
});

test("le chêne « traité classe 4 » n'est repris ni dans une réponse balisée ni sur /bois-massif (à confirmer par Quentin)", () => {
  for (const dict of [fr, en]) {
    for (const texte of [...questionsTables(dict, "").map((qr) => qr.a), dict.bois.plateauxBody, dict.bois.huileBody]) {
      assert.doesNotMatch(texte, /class(e)? 4/i, texte);
    }
  }
});

test("/garde-corps-fenetre-normes : aucun chiffre de la règle ni aucun prix n'est tapé, tout vient du code", () => {
  for (const [nom, brut] of [
    ["fr.json", frBrut],
    ["en.json", enBrut],
  ] as const) {
    // Les textes de la page (pas les clés : « h1 »), avant remplacement des marqueurs : seules les références (article,
    // norme) ont des chiffres.
    const texte = Object.values(brut.normesGc).join("\n");
    const sansReferences = texte.replace(/R134-59|NF[\s\u00a0]P01-012/g, "");
    assert.doesNotMatch(sansReferences, /\d/, `${nom} : un chiffre tapé dans normesGc (il doit venir du code)`);
    assert.doesNotMatch(texte, /€/, `${nom} : un prix tapé dans normesGc`);
    // Jamais rien qui ressemble à une marque NF : seulement la norme, nommée en entier.
    assert.doesNotMatch(texte, /certifi/i, nom);
    assert.doesNotMatch(texte.replace(/NF[\s\u00a0]P01-012/g, ""), /\bNF\b/, `${nom} : « NF » seul dans normesGc`);
  }
  // Les deux chiffres que la description Google cite sont ceux du code.
  for (const dict of [fr, en]) {
    const description = dict.seo.normesGc.description;
    assert.ok(description.includes(`${ALLEGE_SANS_OBLIGATION_MM / 10} cm`), description);
    assert.ok(description.includes(`${HAUTEUR_LOI_GC_MM / 1000} m `), description);
  }
  // La page calcule ses exemples avec la fonction de /api/prix-garde-corps, et n'écrit aucun montant.
  const page = readFileSync(new URL("../src/app/[lang]/garde-corps-fenetre-normes/page.tsx", import.meta.url), "utf8");
  assert.match(page, /reponsePrixGC\(\{ releve, essence, quantite: 1 \}\)/);
  assert.match(page, /prixAppelGC\(modele\)/);
  assert.doesNotMatch(page, /\d\s*€|€\s*\d/, "un montant écrit dans la page");
  // La rosace : le prix du garde-corps complet par le moteur, pour la fenêtre dite dans le titre — jamais le supplément du
  // catalogue (priceDelta) affiché comme un écart fixe : avec une autre rosace, le moteur peut changer de dessin.
  assert.match(page, /reponsePrixGC\(\{ releve, essence, fabricId: f\.id, quantite: 1 \}\)/);
  assert.doesNotMatch(page, /priceDelta/, "un supplément du catalogue affiché comme écart de prix");
  for (const dict of [frBrut, enBrut]) {
    assert.match(dict.normesGc.rosacesTitre, /\{largeur\}.*\{allege\}/, "le titre des rosaces dit la fenêtre de l'exemple");
  }
  // Ni produit ni FAQ balisés : le produit reste sur la fiche, les questions sur les trois pages autorisées.
  assert.doesNotMatch(page, /jsonLdProduit|jsonLdFaq|<FaqVisible/);
});

test("/garde-corps-fenetre-normes : la fiche du garde-corps, l'accueil et la FAQ y mènent", () => {
  const fiche = readFileSync(new URL("../src/app/[lang]/artisanat/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(fiche, /product\.famille === "garde-corps"\s*\?\s*\[\{ href: `\/\$\{locale\}\/garde-corps-fenetre-normes`, label: dict\.liens\.normesGc \}\]/);
  const accueil = readFileSync(new URL("../src/app/[lang]/page.tsx", import.meta.url), "utf8");
  assert.ok(accueil.includes('"/garde-corps-fenetre-normes"'), "accueil : lien absent");
  const faq = readFileSync(new URL("../src/app/[lang]/faq/page.tsx", import.meta.url), "utf8");
  assert.match(faq, /item\.id === "calcul-garde-corps"/);
  for (const dict of [fr, en]) {
    // L'ancre est posée sur la question du calcul du garde-corps, la seule qui cite la norme des vides.
    const question = dict.faq.items.find((item) => "id" in item && item.id === "calcul-garde-corps");
    assert.ok(question && /NF P01-012/.test(question.a), "question du calcul du garde-corps sans ancre");
    assert.ok(dict.liens.normesGc, "libellé du lien absent");
  }
});
