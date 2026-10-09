/**
 * Les balises que Google affiche : titre et description.
 *
 * Google ne montre qu'une soixantaine de signes de titre et environ 155 de
 * description ; le reste est remplacé par « … ». Ces tests vérifient que
 * chaque titre et chaque description des deux dictionnaires tiennent dans
 * ces limites UNE FOIS FABRIQUÉS par src/lib/seo.ts (titreSeo ajoute
 * « — Auboiacier Saumur », descriptionSeo coupe), et que deux pages ne
 * partagent jamais le même titre — un doublon fait passer l'une des deux
 * pour une copie de l'autre.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import frBrut from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import enBrut from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import {
  ATELIER,
  COMMUNES_AFFICHEES,
  DEPARTEMENTS_DESSERVIS,
  OFFRE_PRISE_DE_COTES,
  SITE_URL,
  descriptionSeo,
  jsonLdArticle,
  jsonLdAtelier,
  jsonLdPersonne,
  jsonLdProduit,
  jsonLdService,
  materiauFamille,
  metadataPage,
  titreSeo,
} from "../src/lib/seo.ts";
import { remplacerMarqueurs } from "../src/lib/marqueurs.ts";
import { PRIX_OFFRE_CENTS, RAYON_MAX_KM, RAYON_OFFRE_KM } from "../src/lib/deplacement.ts";
import { products } from "../src/lib/products.ts";
import { adressesDuPlan, cleIndexNow, corpsIndexNow } from "../scripts/indexnow.mjs";

// Les textes tels que les pages les reçoivent : getDictionary remplace les
// marqueurs (« dès {prixVisite} ») par la valeur du code avant tout affichage.
const fr = remplacerMarqueurs(frBrut, "fr");
const en = remplacerMarqueurs(enBrut, "en");

const LONGUEUR_TITRE = 60;
const LONGUEUR_DESCRIPTION = 155;

/** Toutes les entrées { title, description } du bloc `seo` d'un dictionnaire. */
function pagesSeo(dict: typeof fr) {
  return Object.entries(dict.seo).flatMap(([cle, valeur]) =>
    typeof valeur === "object" && valeur !== null && "title" in valeur
      ? [{ cle, title: valeur.title, description: valeur.description }]
      : []
  );
}

const DICTIONNAIRES = { fr, en } as const;

for (const [langue, dict] of Object.entries(DICTIONNAIRES)) {
  const pages = pagesSeo(dict);

  test(`${langue} : chaque titre rendu tient en ${LONGUEUR_TITRE} signes et garde ses mots`, () => {
    for (const page of pages) {
      const rendu = titreSeo(page.title);
      assert.ok(
        rendu.length <= LONGUEUR_TITRE,
        `seo.${page.cle}.title : « ${rendu} » fait ${rendu.length} signes`
      );
      // Chaque mot du titre du dictionnaire doit ressortir : un titre écrit
      // trop long se fait amputer de ses mots-clés par la coupe automatique.
      const motsRendus = new Set(rendu.toLowerCase().split(/\s+/));
      for (const mot of page.title.toLowerCase().split(/\s+/)) {
        assert.ok(
          motsRendus.has(mot),
          `seo.${page.cle}.title : « ${page.title} » a été coupé en « ${rendu} » (« ${mot} » perdu)`
        );
      }
      // Le nom de l'atelier et la ville sont toujours là.
      assert.match(rendu, /Auboiacier/, `seo.${page.cle}.title : atelier absent de « ${rendu} »`);
      assert.match(rendu, /Saumur/, `seo.${page.cle}.title : ville absente de « ${rendu} »`);
    }
  });

  test(`${langue} : chaque description tient en ${LONGUEUR_DESCRIPTION} signes sans être coupée`, () => {
    for (const page of pages) {
      const rendu = descriptionSeo(page.description);
      assert.ok(rendu.length <= LONGUEUR_DESCRIPTION, `seo.${page.cle}.description : ${rendu.length} signes`);
      assert.equal(
        rendu,
        page.description.replace(/\s+/g, " ").trim(),
        `seo.${page.cle}.description fait ${page.description.length} signes : elle serait coupée`
      );
    }
    const suffixe = descriptionSeo(dict.seo.produitSuffixe);
    assert.ok(suffixe.length <= 50, `seo.produitSuffixe trop long (${suffixe.length}) pour les fiches produit`);
  });

  test(`${langue} : deux pages n'ont jamais le même titre`, () => {
    const vus = new Map<string, string>();
    for (const page of pages) {
      const rendu = titreSeo(page.title);
      assert.ok(!vus.has(rendu), `seo.${page.cle} et seo.${vus.get(rendu)} partagent « ${rendu} »`);
      vus.set(rendu, page.cle);
    }
  });
}

test("descriptionSeo coupe sur une fin de phrase, sinon sur un mot, jamais au-delà de 155", () => {
  const phrase = "Première phrase qui dit l'essentiel de la page, assez longue pour valoir la peine d'être gardée entière. ";
  const longue = phrase + "Deuxième phrase qui n'en finit plus et déborde largement de ce que Google accepte d'afficher sous le lien.";
  assert.ok(longue.length > LONGUEUR_DESCRIPTION);
  const coupee = descriptionSeo(longue);
  assert.ok(coupee.length <= LONGUEUR_DESCRIPTION);
  assert.equal(coupee, phrase.trim());

  // Sans fin de phrase, on coupe sur un mot entier et on le signale par « … ».
  const sansPhrase = Array.from({ length: 40 }, (_, i) => `mot${i}`).join(" ");
  const surMot = descriptionSeo(sansPhrase);
  assert.ok(surMot.length <= LONGUEUR_DESCRIPTION);
  assert.ok(surMot.endsWith("…"));
  assert.ok(sansPhrase.startsWith(surMot.slice(0, -1) + " "), "coupé au milieu d'un mot");

  assert.equal(descriptionSeo("  Courte,   avec des   espaces. "), "Courte, avec des espaces.");
});

/* ------------------------------------------------------------------ *
 *  Moteur SEO (lot L1 du plan de référencement, 07/10/2026)
 * ------------------------------------------------------------------ */

test("descriptionSeo ne coupe jamais après « art. » ni « env. », seulement avant une majuscule", () => {
  // Le cas réel de la page vérification : coupée en « … hauteur (art. ».
  const verification =
    "Avant de vous donner un prix, notre outil dessine votre garde-corps à vos mesures et teste chaque modèle : hauteur (art. R134-59 du Code de la construction), vides de moins de 110 mm et partie basse.";
  assert.ok(verification.length > LONGUEUR_DESCRIPTION);
  const coupee = descriptionSeo(verification);
  assert.ok(coupee.length <= LONGUEUR_DESCRIPTION);
  assert.doesNotMatch(coupee, /\(?art\.?…?$/, `coupée sur l'abréviation : « ${coupee} »`);
  assert.ok(coupee.endsWith("…"));
  assert.ok(verification.startsWith(coupee.slice(0, -1)), "coupé au milieu d'un mot");

  // Une vraie fin de phrase plus tôt l'emporte sur « env. » suivi d'une majuscule…
  const phrase = "Une première phrase assez longue pour passer la moitié de la limite, sur les tables en bois massif. ";
  const avecEnv = phrase + "Comptez env. Deux semaines pour l'huile, et un peu de patience avant la livraison chez vous, en France.";
  assert.equal(descriptionSeo(avecEnv), phrase.trim());
  // … et sur un point suivi d'une minuscule, qui ne finit pas la phrase.
  const avecMinuscule = phrase + "Le plateau fait 45 mm. puis il est huilé à la main, à l'atelier de Saumur, avant la livraison en France.";
  assert.equal(descriptionSeo(avecMinuscule), phrase.trim());
});

test("chaque page annonce aux réseaux l'autre langue (og:locale:alternate)", () => {
  for (const [locale, autre] of [["fr", "en_GB"], ["en", "fr_FR"]] as const) {
    const og = metadataPage({ locale, chemin: "/faq", title: "Questions", description: "Réponses." }).openGraph as {
      locale?: string;
      alternateLocale?: string[];
    };
    assert.deepEqual(og.alternateLocale, [autre]);
    assert.notEqual(og.locale, autre);
  }
});

/** Les mots de la liste « Jamais » du plan, cherchés dans les données envoyées à Google et dans llms.txt. */
const MOTS_JAMAIS = [
  /\bpremium\b/i, /\bluxe\b/i, /\bluxury\b/i, /d'exception/i, /\bn°\s?1\b/i, /\ble seul\b/i, /\ble premier\b/i,
  /\bleader\b/i, /\ble meilleur\b/i, /\bbest\b/i, /\bcertifi(é|ée|ed)\b/i, /artisan d'art/i, /ma[iî]tre artisan/i,
  /master craftsman/i, /meilleur ouvrier/i, /ferronnier/i, /\bIA\b/, /\bAI\b/, /\b3D\b/, /\bCGI\b/, /\bg[ée]n[ée]r[ée]e?s?\b/i,
  /\bgenerated\b/i, /ébéniste/i, /menuisier/i, /forgeron/i, /blacksmith/i, /(?<!style )fer forgé/i, /(?<!-)wrought iron/i,
  /plafond tendu/i, /stretch ceiling/i, /barrisol/i, /clipso/i, /crittall/i, /100 % français/i, /posé chez/i,
  /plusieurs années/i, /\bPEFC\b/, /\bFSC\b/, /pose comprise/i, /\bNF\b/, /\bthe only\b/i, /\bthe first\b/i,
];

function sansMotInterdit(nom: string, texte: string) {
  for (const mot of MOTS_JAMAIS) assert.doesNotMatch(texte, mot, `${nom} contient un mot interdit (${mot})`);
}

for (const locale of ["fr", "en"] as const) {
  test(`${locale} : l'atelier pour Google — ni boutique, ni raison sociale inventée, la vraie zone`, () => {
    const a = jsonLdAtelier(locale);
    assert.deepEqual(a["@type"], ["LocalBusiness", "HomeAndConstructionBusiness"], "pas de « Store » : aucune boutique ouverte");
    assert.ok(!("legalName" in a), "legalName seulement avec la raison sociale (src/lib/entreprise.ts)");
    assert.ok(!("identifier" in a) && !("vatID" in a), "SIRET et TVA seulement une fois remplis");
    assert.equal(a.alternateName, ATELIER.legal);
    assert.equal(a.founder["@id"], `${SITE_URL}/#quentin`);
    assert.equal(a.founder["@id"], jsonLdPersonne(locale)["@id"], "le fondateur est le bloc Person d'À propos");
    // La zone : le rayon de déplacement du code, et les quatre départements de la page zone.
    const [cercle, ...departements] = a.areaServed as { "@type": string; geoRadius?: number; name?: string }[];
    assert.equal(cercle["@type"], "GeoCircle");
    assert.equal(cercle.geoRadius, RAYON_MAX_KM * 1000);
    assert.deepEqual(
      departements.map((d) => d.name),
      DEPARTEMENTS_DESSERVIS.map((d) => d.nom)
    );
    assert.ok(a.knowsAbout.length >= 8);
    // Plus de chaises dans la description (pièce retirée le 06/10), plus de « custom » ni de « Craft ».
    assert.doesNotMatch(a.description, /chaise|chair|custom|craft/i);
    // Les offres en anglais parlent comme les titles : « bespoke », jamais « custom » ; « steel internal windows ».
    const offres = a.makesOffer.map((o: { itemOffered: { name: string } }) => o.itemOffered.name).join(" | ");
    if (locale === "en") {
      assert.doesNotMatch(offres, /custom|partition|stretched-fabric/i, offres);
      assert.match(offres, /Bespoke window railing/);
    }
    assert.ok(!("aggregateRating" in a) && !("review" in a), "jamais de note sur l'atelier");
    sansMotInterdit(`jsonLdAtelier(${locale})`, JSON.stringify(a));
  });

  test(`${locale} : Quentin pour Google — CAP et BP Métallier, deux ans en Australie, employeur jamais nommé`, () => {
    // La vraie photo de Quentin au travail : la page À propos la passe (tests/visuels.test.ts).
    const p = jsonLdPersonne(locale, { image: "/images/atelier-soudeur.jpg" });
    assert.equal(p["@type"], "Person");
    assert.equal(p.name, "Quentin Aumercier");
    assert.equal(p.url, `${SITE_URL}/${locale}/a-propos`);
    assert.equal(p.worksFor["@id"], `${SITE_URL}/#atelier`);
    assert.deepEqual(
      p.hasCredential.map((c) => [c["@type"], c.name]),
      [
        ["EducationalOccupationalCredential", "CAP Métallier"],
        ["EducationalOccupationalCredential", "BP Métallier"],
      ]
    );
    assert.match(p.description, locale === "fr" ? /Deux ans en Australie/ : /Two years in Australia/);
    assert.match(p.description, locale === "fr" ? /plafonds lumineux en toile tendue/ : /stretch-fabric ceilings/);
    // Aucune autre organisation que l'atelier : l'employeur australien n'est pas nommé.
    assert.ok(!JSON.stringify(p).includes('"Organization"'));
    assert.doesNotMatch(p.jobTitle, /artisan/i, "« Artisan métallier » attend l'immatriculation (loi 96-603, art. 21)");
    assert.ok(p.image && existsSync(new URL(`../public${new URL(p.image).pathname}`, import.meta.url)), "la photo de Quentin existe");
    assert.ok(!("image" in jsonLdPersonne(locale)), "sans photo passée, aucune");
    sansMotInterdit(`jsonLdPersonne(${locale})`, JSON.stringify(p));
  });

  test(`${locale} : un guide pour Google — signé par l'atelier tant que Quentin ne l'a pas relu`, () => {
    const base = {
      locale,
      chemin: "/garde-corps-fenetre-normes",
      titre: "Garde-corps de fenêtre : la norme",
      description: "Hauteur, vides, cas où il est obligatoire.",
      datePublication: "2026-10-01",
      dateModification: "2026-10-07",
    };
    const parAtelier = jsonLdArticle(base);
    assert.equal(parAtelier["@type"], "Article");
    assert.equal(parAtelier.author["@id"], `${SITE_URL}/#atelier`);
    assert.equal(parAtelier.publisher["@id"], `${SITE_URL}/#atelier`);
    assert.equal(parAtelier.mainEntityOfPage["@id"], `${SITE_URL}/${locale}/garde-corps-fenetre-normes`);
    assert.equal(parAtelier.inLanguage, locale);
    assert.equal(parAtelier.dateModified, "2026-10-07");
    const parQuentin = jsonLdArticle({ ...base, auteur: "quentin" });
    assert.equal(parQuentin.author["@id"], `${SITE_URL}/#quentin`);
    assert.throws(() => jsonLdArticle({ ...base, datePublication: "07/10/2026" }), /AAAA-MM-JJ/);
    assert.throws(() => jsonLdArticle({ ...base, dateModification: "2026-09-01" }), /avant sa publication/);
  });

  test(`${locale} : un service pour Google — un prix seulement s'il vient du code`, () => {
    const verriere = jsonLdService({ locale, nom: "Verrière d'atelier sur mesure", chemin: "/artisanat/verrieres" });
    assert.equal(verriere["@type"], "Service");
    assert.equal(verriere.provider["@id"], `${SITE_URL}/#atelier`);
    assert.equal(verriere.areaServed.geoRadius, RAYON_MAX_KM * 1000);
    assert.ok(!("offers" in verriere), "sur devis : aucun prix");
    const visite = jsonLdService({ locale, nom: "Prise de cotes à domicile", chemin: "/rendez-vous", offre: OFFRE_PRISE_DE_COTES });
    assert.ok(visite.offers);
    assert.equal(visite.offers.price, PRIX_OFFRE_CENTS / 100);
    assert.equal(visite.offers.priceCurrency, "EUR");
    assert.equal(visite.offers.eligibleRegion.geoRadius, RAYON_OFFRE_KM * 1000);
  });

  test(`${locale} : le bloc Product garde sa forme, référence et matières en plus si on les donne`, () => {
    const base = {
      locale,
      chemin: "/artisanat/table-mikado",
      nom: "Mikado",
      description: "Table.",
      images: ["/images/x.jpg"],
      fourchette: { prixMin: 1, prixMax: 2 },
      disponibilite: null,
    };
    const sans = jsonLdProduit(base);
    assert.ok(!("sku" in sans) && !("material" in sans));
    const avec = jsonLdProduit({ ...base, sku: "table-mikado", materiau: materiauFamille("table-interieur", locale) });
    assert.equal(avec.sku, "table-mikado");
    assert.equal(avec.material, locale === "fr" ? "Acier ; bois massif" : "Steel; solid wood");
    assert.equal(materiauFamille("chaise", locale), undefined, "les chaises : session Chaises");
  });
}

test("la page zone n'affiche que les communes à moins de 50 km, et les quatre départements", () => {
  const zones = new Set<string>(ATELIER.zones);
  for (const commune of COMMUNES_AFFICHEES) assert.ok(zones.has(commune), `${commune} absente de ATELIER.zones`);
  for (const loin of ["Tours", "Cholet", "Poitiers", "Le Mans", "Nantes"]) {
    assert.ok(!(COMMUNES_AFFICHEES as readonly string[]).includes(loin), `${loin} est à plus de 50 km`);
  }
  assert.equal(COMMUNES_AFFICHEES[0], "Saumur");
  for (const d of DEPARTEMENTS_DESSERVIS) assert.ok(zones.has(`${d.nom} (${d.numero})`), d.nom);
});

test("la page introuvable n'a qu'une balise robots (celle que Next pose sur toute 404)", () => {
  const source = readFileSync(new URL("../src/app/[lang]/not-found.tsx", import.meta.url), "utf8");
  assert.match(source, /robots: null,/);
});

test("llms.txt : qui, quoi, où, les pages clés — sans prix écrit à la main ni mot interdit", () => {
  const texte = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
  assert.match(texte, /^# Auboiacier\n\n> /);
  assert.match(texte, /Quentin Aumercier/);
  assert.match(texte, /CAP Métallier/);
  assert.match(texte, /Saumur/);
  assert.doesNotMatch(texte, /\d\s?€|€\s?\d/, "aucun prix : ils changent, la fiche les donne");
  // « artisan » attend l'immatriculation (loi 96-603, art. 21) ; l'adresse /artisanat, elle, existe déjà.
  assert.doesNotMatch(texte.replace(/\(https?:[^)]*\)/g, ""), /artisan/i, "« artisan » attend l'immatriculation");
  sansMotInterdit("llms.txt", texte);
  // Chaque lien mène à une page du site qui existe.
  const liens = [...texte.matchAll(/\]\((https:\/\/auboiacier\.fr[^)]*)\)/g)].map((m) => new URL(m[1] ?? "").pathname);
  assert.ok(liens.length >= 10);
  for (const chemin of liens) {
    if (chemin === "/sitemap.xml") continue;
    const sansLangue = chemin.replace(/^\/(fr|en)/, "");
    const dossier = new URL(`../src/app/[lang]${sansLangue}`, import.meta.url);
    const fiche = sansLangue.match(/^\/artisanat\/([a-z0-9-]+)$/)?.[1];
    assert.ok(
      existsSync(dossier) || (fiche && products.some((p) => p.slug === fiche)) || sansLangue === "",
      `llms.txt renvoie vers ${chemin}, qui n'existe pas`
    );
  }
});

test("les trois pages nouvelles (guide escalier, balcon et terrasse, soudure) : au plan du site, et des pages y mènent", () => {
  const lire = (chemin: string) => readFileSync(new URL(`../src/${chemin}`, import.meta.url), "utf8");
  const plan = lire("app/sitemap.ts");
  const pied = lire("components/site-footer.tsx");
  const fiche = lire("app/[lang]/artisanat/[slug]/page.tsx");
  const zone = lire("app/[lang]/zone-intervention/page.tsx");
  for (const chemin of ["/escalier-limon-central-prix-normes", "/garde-corps-balcon-terrasse", "/soudure-reparations"]) {
    assert.ok(existsSync(new URL(`../src/app/[lang]${chemin}/page.tsx`, import.meta.url)), `${chemin} : page absente`);
    assert.ok(plan.includes(`chemin: "${chemin}"`), `${chemin} absent du plan du site`);
    assert.ok(pied.includes(`/\${locale}${chemin}\``), `${chemin} absent du pied de page`);
  }
  // La fiche escalier mène à son guide, la fiche garde-corps à la page balcon et terrasse, la zone à la soudure.
  assert.match(fiche, /famille === "escalier"[\s\S]{0,120}\/escalier-limon-central-prix-normes/);
  assert.match(fiche, /famille === "garde-corps"[\s\S]{0,120}\/garde-corps-balcon-terrasse/);
  assert.match(zone, /\/soudure-reparations/);
  assert.match(zone, /\/garde-corps-balcon-terrasse/);
  // Le guide de l'escalier, seule page datée, donne sa vraie date de mise à jour au plan du site ; aucune autre.
  assert.match(plan, /chemin: "\/escalier-limon-central-prix-normes",[^\n]*modifie: DATE_MODIFICATION_GUIDE_ESCALIER/);
  assert.equal((plan.match(/modifie: /g) ?? []).length, 1, "une autre page du plan a une date");
  // Les pages balcon et soudure se relient dans leur texte, pas seulement par le pied de page.
  assert.ok(lire("app/[lang]/garde-corps-balcon-terrasse/page.tsx").includes("/soudure-reparations"));
  assert.ok(lire("lib/textes/soudure-reparations.ts").includes('chemin: "/garde-corps-balcon-terrasse"'));
});

test("pied de page : chaque lien mène à une page du site qui existe", () => {
  const pied = readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
  const chemins = [...pied.matchAll(/href: `\/\$\{locale\}([^`]*)`/g)].map((m) => m[1] ?? "");
  assert.ok(chemins.length >= 15, `${chemins.length} liens seulement`);
  for (const chemin of chemins) {
    const sansAncre = chemin.replace(/#.*$/, "");
    const fiche = sansAncre.match(/^\/artisanat\/([a-z0-9-]+)$/)?.[1];
    // Les pages de famille (garde-corps, portail) sont une route dynamique : src/app/[lang]/artisanat/famille/[famille].
    const famille = sansAncre.match(/^\/artisanat\/famille\/([a-z0-9-]+)$/)?.[1];
    assert.ok(
      existsSync(new URL(`../src/app/[lang]${sansAncre}`, import.meta.url)) ||
        (fiche && products.some((p) => p.slug === fiche)) ||
        (famille && existsSync(new URL("../src/app/[lang]/artisanat/famille/[famille]/page.tsx", import.meta.url)) && products.some((p) => p.famille === famille)),
      `le pied de page renvoie vers ${chemin}, qui n'existe pas`
    );
  }
});

test("IndexNow : une seule clé, servie en public/<clé>.txt, et l'envoi prêt (jamais lancé par les tests)", () => {
  const cle = cleIndexNow();
  assert.match(cle, /^[0-9a-f]{32}$/);
  assert.equal(readFileSync(new URL(`../public/${cle}.txt`, import.meta.url), "utf8").trim(), cle);
  const xml = `<?xml version="1.0"?><urlset><url><loc>https://auboiacier.fr/fr</loc><xhtml:link href="https://auboiacier.fr/en"/></url>
    <url><loc> https://auboiacier.fr/en/artisanat?a=1&amp;b=2 </loc></url><url><loc>https://auboiacier.fr/fr</loc></url>
    <url><loc>https://ailleurs.example/fr</loc></url></urlset>`;
  const adresses = adressesDuPlan(xml);
  assert.deepEqual(adresses, ["https://auboiacier.fr/fr", "https://auboiacier.fr/en/artisanat?a=1&b=2"]);
  assert.deepEqual(corpsIndexNow(cle, adresses), {
    host: "auboiacier.fr",
    key: cle,
    keyLocation: `https://auboiacier.fr/${cle}.txt`,
    urlList: adresses,
  });
  const paquet = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(paquet.scripts.indexnow, "node scripts/indexnow.mjs");
});
