/**
 * Le guide « Escalier à limon central : prix, formes et normes »
 * (/escalier-limon-central-prix-normes, lot L4 du plan de référencement).
 *
 * Ce qu'on vérifie : le titre et la description que Google affiche tiennent
 * sans être coupés ; chaque prix est celui du moteur du catalogue, jamais
 * un chiffre recopié ; chaque chiffre de norme vient de
 * src/lib/normes-escalier.ts, avec sa source ; aucune des formules fausses
 * relevées par l'audit du 07/10/2026 (limon « cintré », garde-corps « à
 * câbles ») ni aucun mot interdit par le plan ; la pose est dite comme la
 * fiche la dit, sans rien de plus ; le guide est signé par l'atelier tant
 * que Quentin ne l'a pas relu ; aucune FAQ balisée.
 *
 * Aucun montant n'est écrit dans ce fichier : les prix viennent du catalogue
 * (computeUnitPrice, priceFrom) et des marqueurs du code.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CHEMIN_GUIDE_ESCALIER,
  DATE_MODIFICATION_GUIDE_ESCALIER,
  DATE_PUBLICATION_GUIDE_ESCALIER,
  SLUG_ESCALIER,
  TEXTES_GUIDE_ESCALIER,
  guideEscalier,
  prixParForme,
} from "../src/lib/textes/guide-escalier.ts";
import {
  BLONDEL_MAISON,
  ECHAPPEE_MIN,
  GIRON_MIN,
  HAUTEUR_MARCHE_MAX,
  LARGEUR_MIN,
  NORME_GARDE_CORPS,
  SOURCES_NORMES_ESCALIER,
  TOLERANCE_HAUTEUR_MARCHE,
  VISEE_ATELIER,
} from "../src/lib/normes-escalier.ts";
import { computeUnitPrice, priceFrom, productLocalise, products } from "../src/lib/products.ts";
import { valeursMarqueurs } from "../src/lib/marqueurs.ts";
import { descriptionTient, jsonLdArticle, titreSeo } from "../src/lib/seo.ts";
import { prixAffiche } from "../src/lib/ui.ts";

const LOCALES = ["fr", "en"] as const;
const escalier = products.find((p) => p.slug === SLUG_ESCALIER)!;
const PAGE = readFileSync(new URL("../src/app/[lang]/escalier-limon-central-prix-normes/page.tsx", import.meta.url), "utf8");

/** Tout le texte d'un objet, chaînes mises bout à bout. */
function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  if (Array.isArray(valeur)) return valeur.map(texte).join("\n");
  if (valeur && typeof valeur === "object") return Object.values(valeur).map(texte).join("\n");
  return "";
}

test("la fiche de l'escalier existe, sur devis, avec ses trois formes", () => {
  assert.ok(escalier, `la fiche « ${SLUG_ESCALIER} » a disparu`);
  assert.equal(escalier.orderMode, "quote");
  assert.deepEqual(
    escalier.sizes.map((s) => s.id),
    ["droit", "quart", "demi"]
  );
  assert.equal(CHEMIN_GUIDE_ESCALIER, "/escalier-limon-central-prix-normes");
});

for (const locale of LOCALES) {
  const guide = guideEscalier(locale);
  const brut = TEXTES_GUIDE_ESCALIER[locale];

  test(`${locale} : titre et description Google entiers (40 signes de texte, 140 à 155 signes)`, () => {
    const titre = guide.seo.titre;
    assert.ok(titre.length <= 40, `titre de ${titre.length} signes : « ${titre} »`);
    const rendu = titreSeo(titre);
    assert.ok(rendu.startsWith(titre), `titre coupé : « ${rendu} »`);
    assert.ok(rendu.length <= 60, `« ${rendu} » fait ${rendu.length} signes`);
    const description = guide.seo.description;
    const longueur = [...description].length;
    assert.ok(longueur >= 140 && longueur <= 155, `description de ${longueur} signes : « ${description} »`);
    assert.ok(descriptionTient(description), `description coupée par Google : « ${description} »`);
    // La recherche principale en tête du titre et du H1.
    assert.match(titre, locale === "fr" ? /^Escalier limon central/ : /^Steel spine staircase/);
    assert.match(guide.h1, locale === "fr" ? /^Escalier à limon central/ : /^Steel spine staircases/);
    // En français, jamais une ligne qui commence par « : » : l'espace avant la ponctuation haute est insécable.
    if (locale === "fr") assert.doesNotMatch(texte({ ...guide, seo: null }), / [:;?!»]/);
  });

  test(`${locale} : aucun marqueur restant, aucun prix tapé à la main`, () => {
    const rendu = texte(guide);
    assert.doesNotMatch(rendu, /[{}]/, "un marqueur n'a pas été remplacé");
    // Les textes bruts : pas un montant, pas un délai, pas un chiffre de norme écrit en dur.
    const source = texte(brut);
    assert.doesNotMatch(source, /\d[\d\s  .,]*\s*€|€\s*\d/, "un prix est écrit à la main");
    assert.doesNotMatch(source, /\d+\s*(?:à|to)\s*\d+\s*(?:semaines|weeks)/, "un délai est écrit à la main");
    const chiffres = [...source.matchAll(/\d+(?:[.,]\d+)?\s*(?:cm|m|mm|km)\b/g)].map((m) => m[0]);
    // Seule l'épaisseur des marches est écrite : c'est celle de la fiche (ligne « Marches »).
    assert.deepEqual([...new Set(chiffres)], ["50 mm"], `chiffres écrits à la main : ${chiffres.join(", ")}`);
    const marches = productLocalise(escalier, locale).specs.find((s) => s.label === "Marches" || s.label === "Treads");
    assert.match(marches?.value ?? "", /50 mm/, "la fiche ne dit plus des marches de 50 mm");
  });

  test(`${locale} : le tableau des prix est celui du moteur, forme par forme et essence par essence`, () => {
    const fiche = productLocalise(escalier, locale);
    const { essences, lignes } = prixParForme(locale);
    assert.deepEqual(
      essences.map((e) => e.id),
      fiche.woods.map((w) => w.id)
    );
    assert.equal(lignes.length, fiche.sizes.length);
    for (const ligne of lignes) {
      fiche.woods.forEach((bois, i) => {
        // Chaque couleur du limon donne le même prix : la page le dit.
        for (const couleur of fiche.metals) {
          assert.equal(
            computeUnitPrice(fiche, { sizeId: ligne.id, woodId: bois.id, metalId: couleur.id }),
            ligne.prix[i],
            `${ligne.id} ${bois.id} ${couleur.id}`
          );
        }
      });
    }
    assert.ok(guide.prix.couleurMemePrix, "la phrase « la couleur ne change pas le prix » doit s'afficher");
    // Le « dès » de l'escalier droit est le « à partir de » du catalogue, et celui du marqueur de la description.
    const droit = lignes.find((l) => l.id === "droit")!;
    assert.equal(droit.des, priceFrom(escalier));
    assert.equal(valeursMarqueurs(locale)["{prix:escalier-limon-central}"], prixAffiche(droit.des, locale));
    assert.ok(guide.seo.description.includes(prixAffiche(droit.des, locale)));
    // « La forme la plus simple et la moins chère » : l'escalier droit l'est bien.
    for (const ligne of lignes) assert.ok(ligne.des >= droit.des, `${ligne.id} moins cher que le droit`);
    // Les prix affichés, à la mode de la langue.
    for (const ligne of guide.prix.lignes) {
      assert.deepEqual(
        ligne.prixAffiches,
        ligne.prix.map((p) => prixAffiche(p, locale))
      );
    }
  });

  test(`${locale} : le délai, la prise de cotes et la pose viennent du code et de la fiche`, () => {
    const fiche = productLocalise(escalier, locale);
    const valeurs = valeursMarqueurs(locale);
    assert.ok(guide.prix.fabrication.includes(valeurs["{delai:escalier-limon-central}"]));
    assert.ok(guide.mesurer.visite.includes(valeurs["{prixVisite}"]));
    // La pose : la ligne de la fiche, mot pour mot (première lettre mise à part), et rien d'autre.
    const pose = fiche.specs.find((s) => s.label === "Pose" || s.label === "Fitting")!.value;
    const item = guide.contenu.items[guide.contenu.items.length - 1];
    const simple = (t: string) => t.replace(/\s+/g, " ").toLowerCase();
    assert.ok(simple(item).includes(simple(pose)), `la pose ne reprend pas la fiche : « ${item} »`);
    const source = texte(brut);
    assert.doesNotMatch(source, /pose comprise|posé par l'atelier|posée par l'atelier|fitting included|fitted by the workshop/i);
  });

  test(`${locale} : chaque chiffre de norme du guide est celui du module des normes`, () => {
    const lignes = guide.normes.lignes;
    const cm = (mm: number) => `${(mm / 10).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} cm`;
    assert.ok(lignes[0].chiffre.includes(cm(HAUTEUR_MARCHE_MAX.mm)));
    assert.ok(lignes[1].chiffre.includes(cm(GIRON_MIN.mm)));
    assert.ok(lignes[2].chiffre.includes(cm(BLONDEL_MAISON.maxMm)));
    assert.ok(lignes[3].chiffre.includes(cm(LARGEUR_MIN.mm)));
    assert.ok(lignes[4].chiffre.includes((ECHAPPEE_MIN.mm / 1000).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: 2 })));
    assert.ok(lignes[5].chiffre.includes(NORME_GARDE_CORPS.reference));
    assert.ok(lignes[0].atelier.includes(cm(VISEE_ATELIER.hauteurMarcheMm)));
    assert.ok(guide.normes.mesures.includes(`${TOLERANCE_HAUTEUR_MARCHE.mm} mm`));
    // L'exemple de Blondel tombe dans la zone de confort de l'atelier, et dans la règle.
    const pas = 2 * VISEE_ATELIER.hauteurMarcheMm + VISEE_ATELIER.gironMm;
    assert.ok(pas >= VISEE_ATELIER.blondelMinMm && pas <= VISEE_ATELIER.blondelMaxMm);
    assert.ok(pas >= BLONDEL_MAISON.minMm && pas <= BLONDEL_MAISON.maxMm);
    assert.ok(guide.normes.blondel.includes(cm(pas)));
    // La hauteur du garde-corps de rampe n'est pas vérifiée dans le texte de la norme : elle n'est pas publiée.
    // Les phrases du garde-corps ne citent aucun chiffre, hors le numéro et l'année de la norme.
    const gardeCorps = [
      lignes[5].chiffre,
      lignes[5].atelier,
      guide.normes.gardeCorps,
      guide.contenu.items.find((item) => item.includes(NORME_GARDE_CORPS.reference))!,
      guide.faq.questions[1].a,
    ];
    for (const phrase of gardeCorps) {
      const sansNorme = phrase.split(NORME_GARDE_CORPS.reference).join("").split(String(NORME_GARDE_CORPS.annee)).join("");
      assert.doesNotMatch(sansNorme, /\d/, `un chiffre dans « ${phrase} »`);
    }
    assert.doesNotMatch(texte(guide), /probable/i);
    // Chaque source citée a son lien.
    for (const s of SOURCES_NORMES_ESCALIER) assert.match(s.url, /^https:\/\//);
    assert.equal(guide.sources.length, SOURCES_NORMES_ESCALIER.length);
  });

  test(`${locale} : ni mot interdit par le plan, ni formule fausse de l'audit du 07/10/2026`, () => {
    // Tout ce que le guide écrit lui-même : sans les textes des images (ceux de la fiche) ni les adresses.
    const tout = texte({
      ...guide,
      imageHero: null,
      imageDetail: null,
      cheminFiche: null,
      sources: guide.sources.map((s) => s.titre),
    });
    const interdits =
      locale === "fr"
        ? [
            /premium/i, /\bluxe\b/i, /d'exception/i, /n°\s?1\b/i, /\ble seul\b/i, /\bla seule\b/i, /\ble premier\b/i,
            /\bleader\b/i, /\ble meilleur\b/i, /certifi/i, /artisan/i, /maître/i, /meilleur ouvrier/i, /ferronn/i,
            /\bIA\b/, /\b3D\b/i, /généré/i, /forg[ée]/i, /volute/i, /ébéniste/i, /menuisier/i, /plafond tendu/i,
            /chantier/i, /plusieurs années/i, /PEFC|FSC/, /solidité|résistance vérifiée/i,
          ]
        : [
            /premium/i, /luxury/i, /blacksmith/i, /master craftsman/i, /certified/i, /\bthe only\b/i, /\bthe first\b/i,
            /No\.\s?1\b/i, /\bleader\b/i, /\bbest\b/i, /\bAI\b/, /\bCGI\b/, /\b3D\b/i, /generated/i, /wrought iron/i,
            /forged/i, /stretch ceiling/i, /\bcustom\b/i, /artisan/i,
          ];
    for (const motif of interdits) assert.doesNotMatch(tout, motif, `${locale} : ${motif}`);
    // Vérité de fabrication : un limon droit, coupé et soudé ; pas de câbles ; pas de porte-à-faux d'une seule courbe.
    const faux = [/cintr/i, /câble/i, /\bcables?\b/i, /porte-à-faux/i, /cantilever/i, /curved/i, /\bbent\b/i, /une seule courbe/i];
    for (const motif of faux) assert.doesNotMatch(texte(brut), motif, `${locale} : ${motif}`);
    // « NF » toujours avec son numéro.
    for (const m of tout.matchAll(/\bNF\b(.{0,9})/g)) {
      assert.match(m[1], /^ (P01-012|DTU 36\.3)/, `« NF » sans numéro : « NF${m[1]} »`);
    }
  });
}

test("les deux langues ont les mêmes textes (mêmes clés, même nombre de lignes)", () => {
  const forme = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(forme) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, s]) => [k, forme(s)])) : typeof v;
  assert.deepEqual(forme(TEXTES_GUIDE_ESCALIER.fr), forme(TEXTES_GUIDE_ESCALIER.en));
  assert.notEqual(TEXTES_GUIDE_ESCALIER.fr.h1, TEXTES_GUIDE_ESCALIER.en.h1);
});

test("Google : un guide signé par l'atelier, aux dates affichées, et un fil d'Ariane", () => {
  for (const date of [DATE_PUBLICATION_GUIDE_ESCALIER, DATE_MODIFICATION_GUIDE_ESCALIER]) assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(DATE_MODIFICATION_GUIDE_ESCALIER >= DATE_PUBLICATION_GUIDE_ESCALIER);
  // Quentin n'a pas encore relu le guide : la page ne passe pas « auteur: quentin ».
  assert.match(PAGE, /jsonLdArticle\(/);
  assert.doesNotMatch(PAGE, /auteur:\s*"quentin"/);
  const article = jsonLdArticle({
    locale: "fr",
    chemin: CHEMIN_GUIDE_ESCALIER,
    titre: guideEscalier("fr").h1,
    description: guideEscalier("fr").seo.description,
    datePublication: DATE_PUBLICATION_GUIDE_ESCALIER,
    dateModification: DATE_MODIFICATION_GUIDE_ESCALIER,
  }) as { author: { "@type": string } };
  assert.equal(article.author["@type"], "Organization");
  // La signature visible dit la même date.
  assert.match(guideEscalier("fr").signature, /7 octobre 2026/);
  assert.match(PAGE, /jsonLdFilAriane\(/);
});

test("la page : un seul H1, pas de FAQ balisée, les liens vers les pages voisines", () => {
  assert.equal((PAGE.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(PAGE, /jsonLdFaq|<FaqVisible|FAQPage/);
  for (const lien of ["/rendez-vous", "/bois-massif", "/garde-corps-fenetre-normes", "/zone-intervention"]) {
    assert.ok(PAGE.includes(`/\${locale}${lien}`), `lien manquant vers ${lien}`);
  }
  assert.match(PAGE, /href=\{fiche\}/, "lien manquant vers la fiche escalier");
  // Les images passent par Visuel (mention « Image d'illustration »), la première en priorité.
  assert.match(PAGE, /<Visuel[\s\S]*?priority/);
  // Ni montant, ni chiffre de norme tapé dans la page.
  assert.doesNotMatch(PAGE, /€|\d+\s*(?:cm|mm)\b/);
});
