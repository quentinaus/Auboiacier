/**
 * La page « Soudure et réparations à Saumur » (/fr et /en /soudure-reparations,
 * textes dans src/lib/textes/soudure-reparations.ts).
 *
 * Ce qu'on vérifie :
 * 1. le titre et la description que Google affiche : 40 signes de texte au
 *    plus, 140 à 155 signes de description, marqueurs remplacés, rien de coupé,
 *    et aucun autre titre du site identique ;
 * 2. aucun prix écrit à la main (seulement les marqueurs de la prise de
 *    cotes), aucun marqueur resté sans valeur ;
 * 3. aucun mot interdit (liste « Jamais » du plan), pas d'« artisan » avant
 *    l'immatriculation, aucune promesse de pose, l'inox jamais annoncé comme
 *    soudé, aucun texte faux déjà relevé sur le site ;
 * 4. le jour d'ouverture des commandes, le même que DATE_OUVERTURE_COMMANDES ;
 * 5. le français et l'anglais disent la même chose, bloc pour bloc, et chaque
 *    lien mène à une page qui existe ;
 * 6. la page : un seul H1, le fil d'Ariane visible et balisé, le service pour
 *    Google sans prix, aucune FAQ balisée.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import frBrut from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import enBrut from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { CHEMIN_SOUDURE, TEXTES_SOUDURE, valeursSoudure } from "../src/lib/textes/soudure-reparations.ts";
import { descriptionSeo, descriptionTient, jsonLdAtelier, jsonLdService, SITE_URL, titreSeo } from "../src/lib/seo.ts";
import { marqueursRestants, remplacerAvec, remplacerMarqueurs, verifierMarqueurs } from "../src/lib/marqueurs.ts";
import { DATE_OUVERTURE_COMMANDES } from "../src/lib/ouverture.ts";
import { getProduct } from "../src/lib/products.ts";

const LOCALES = ["fr", "en"] as const;
const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), "utf8");
const PAGE = "../src/app/[lang]/soudure-reparations/page.tsx";

/** Les textes tels que la page les affiche : marqueurs du code, puis jour d'ouverture des commandes. */
const textes = (locale: (typeof LOCALES)[number]) =>
  remplacerAvec(remplacerMarqueurs(TEXTES_SOUDURE[locale], locale), valeursSoudure(locale));

/**
 * L'employeur australien de Quentin n'est jamais nommé, ni sur le site, ni dans ce dépôt public : on compare
 * l'empreinte SHA-256 de chaque mot (en minuscules) à celle de son nom, sans écrire le nom.
 */
const EMPREINTE_EMPLOYEUR = "bf70b26b10a2574dffe657b352a33dcb77171cb312337e7afafbc199da9ed2db";
const nommeEmployeur = (texte: string) =>
  (texte.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).some((mot) => createHash("sha256").update(mot).digest("hex") === EMPREINTE_EMPLOYEUR);
/** Toutes les chaînes d'un objet, bout à bout. */
const tout = (valeur: unknown) => JSON.stringify(valeur);

/** Les mots de la liste « Jamais » du plan de référencement (comme tests/seo.test.ts). */
const MOTS_JAMAIS = [
  /\bpremium\b/i, /\bluxe\b/i, /\bluxury\b/i, /d'exception/i, /\bn°\s?1\b/i, /\ble seul\b/i, /\ble premier\b/i,
  /\bleader\b/i, /\ble meilleur\b/i, /\bbest\b/i, /\bcertifi(é|ée|ed)\b/i, /artisan d'art/i, /ma[iî]tre artisan/i,
  /master craftsman/i, /meilleur ouvrier/i, /ferronn/i, /\bIA\b/, /\bAI\b/, /\b3D\b/, /\bCGI\b/, /\bg[ée]n[ée]r[ée]e?s?\b/i,
  /\bgenerated\b/i, /ébéniste/i, /menuisier/i, /forgeron/i, /blacksmith/i, /(?<!style )fer forgé/i, /(?<!-)wrought iron/i,
  /plafond tendu/i, /stretch ceiling/i, /100 % français/i, /posé chez/i, /plusieurs années/i, /several years/i,
  /pose comprise/i, /\bNF\b/, /\bthe only\b/i, /\bthe first\b/i, /\bcustom\b/i,
];

/** Des textes faux déjà relevés sur le site (audit du 07/10/2026) : jamais repris ici. */
const DEJA_FAUX = [/installé à Saumur/i, /sous-traité/i, /cintr/i, /\b48 h\b/i, /partout en France/i, /nationwide/i];

test("la page existe, à la même adresse en français et en anglais", () => {
  assert.equal(CHEMIN_SOUDURE, "/soudure-reparations");
  assert.ok(existsSync(new URL(PAGE, import.meta.url)), "page absente");
  assert.deepEqual(Object.keys(TEXTES_SOUDURE).sort(), [...LOCALES].sort());
});

for (const locale of LOCALES) {
  const t = textes(locale);

  test(`${locale} : titre de 40 signes au plus, avec l'atelier et la ville, rien de coupé`, () => {
    assert.ok([...t.seo.title].length <= 40, `« ${t.seo.title} » fait ${[...t.seo.title].length} signes`);
    const rendu = titreSeo(t.seo.title);
    assert.ok(rendu.length <= 60, `« ${rendu} »`);
    assert.ok(rendu.startsWith(t.seo.title), `titre coupé : « ${rendu} »`);
    assert.match(rendu, /Auboiacier/);
    assert.match(rendu, /Saumur/);
    // La recherche principale : « soudeur saumur » (« welder saumur » en anglais).
    assert.match(t.seo.title, locale === "fr" ? /^Soudeur à Saumur/ : /^Welder in Saumur/);
    // « métallier Saumur » est la recherche de l'accueil : aucun autre titre ne la prend.
    assert.doesNotMatch(t.seo.title, /métallier|metalworker/i);
  });

  test(`${locale} : description de 140 à 155 signes, entière`, () => {
    const longueur = [...t.seo.description].length;
    assert.ok(longueur >= 140 && longueur <= 155, `${longueur} signes : « ${t.seo.description} »`);
    assert.ok(descriptionTient(t.seo.description), "descriptionSeo la couperait");
    assert.equal(descriptionSeo(t.seo.description), t.seo.description);
  });

  test(`${locale} : aucun prix écrit à la main, aucun marqueur sans valeur`, () => {
    const brut = tout(TEXTES_SOUDURE[locale]);
    assert.doesNotMatch(brut, /\d\s?€|€\s?\d/, "un prix écrit à la main");
    // Les seuls chiffres du code cités : la prise de cotes, par ses marqueurs.
    assert.deepEqual(marqueursRestants(TEXTES_SOUDURE[locale]).sort(), ["{prixVisite}", "{rayonVisite}"]);
    assert.doesNotThrow(() => verifierMarqueurs(t, `soudure-reparations (${locale})`));
    assert.deepEqual(marqueursRestants(t), []);
    // Ni marqueur de la page resté tel quel (« {ouverture} »).
    assert.doesNotMatch(tout(t), /\{\w+\}/, "un marqueur de la page n'a pas été remplacé");
    assert.match(t.cotesTexte, /€/, "le prix de la prise de cotes vient du code");
  });

  test(`${locale} : aucun mot interdit, pas d'« artisan », aucune promesse de pose, l'inox jamais annoncé`, () => {
    // Le texte lu par le visiteur, sans les adresses des liens (/artisanat/… existe déjà).
    const texte = tout(t).replace(/"chemin":"[^"]*"/g, "");
    for (const mot of MOTS_JAMAIS) assert.doesNotMatch(texte, mot, `mot interdit (${mot})`);
    // « artisan » attend l'immatriculation (loi 96-603, art. 21).
    assert.doesNotMatch(texte, /artisan/i, "« artisan » attend l'immatriculation");
    // La pose attend l'assurance décennale : ni pose, ni soudure chez le client promises.
    assert.doesNotMatch(texte, /\bposons\b|\bposée? par\b|pose par l'atelier|\bfitted by\b|fitting included|\bwe fit\b/i, "promesse de pose");
    assert.doesNotMatch(texte, /à domicile|chez vous, nous soudons|on site welding|mobile weld/i, "soudure chez le client promise");
    for (const faux of DEJA_FAUX) assert.doesNotMatch(texte, faux, `texte déjà relevé faux (${faux})`);
    // L'inox n'est pas annoncé (à confirmer avec Quentin) : cité une seule fois, dans la question des métaux.
    const sansFaqMetaux = tout({ ...t, faq: t.faq.slice(1) });
    assert.doesNotMatch(sansFaqMetaux, /inox|stainless/i);
    assert.match(t.faq[0].a, locale === "fr" ? /inox/ : /stainless/);
    assert.match(t.matieres, locale === "fr" ? /acier.*aluminium/ : /steel.*aluminium/);
  });

  test(`${locale} : Quentin, ses diplômes et ses trois procédés`, () => {
    assert.match(t.quiTexte, /CAP Métallier/);
    assert.match(t.quiTexte, /BP Métallier/);
    assert.match(t.quiTexte, /Australi/);
    assert.deepEqual(
      t.procedes.map((p) => p.titre),
      locale === "fr" ? ["TIG", "MAG", "Électrode"] : ["TIG", "MIG/MAG", "Stick"]
    );
    // L'employeur australien n'est jamais nommé.
    assert.ok(!nommeEmployeur(tout(t)), "l'employeur australien est nommé");
    // « English spoken » : sur la page anglaise seulement.
    if (locale === "en") assert.equal(t.quiLangue, "English spoken.");
    else assert.equal(t.quiLangue, "");
  });

  test(`${locale} : le jour d'ouverture des commandes est celui du code`, () => {
    const jour = new Date(`${DATE_OUVERTURE_COMMANDES}T12:00:00Z`).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const attendu = locale === "fr" ? jour : jour.replace(/^(\w+),? /, "$1 ");
    assert.ok(t.ouverture.includes(attendu), `« ${t.ouverture} » ne dit pas « ${attendu} »`);
    // Le jour vient du code : le texte brut n'en écrit aucun.
    assert.doesNotMatch(TEXTES_SOUDURE[locale].ouverture, /\d|décembre|december|lundi|monday/i);
    assert.match(TEXTES_SOUDURE[locale].ouverture, /\{ouverture\}/);
  });

  test(`${locale} : le service pour Google — son nom est une offre de l'atelier, sans prix`, () => {
    const s = jsonLdService({ locale, nom: t.service.nom, type: t.service.type, chemin: CHEMIN_SOUDURE, description: t.seo.description });
    assert.equal(s["@type"], "Service");
    assert.equal(s.url, `${SITE_URL}/${locale}/soudure-reparations`);
    assert.equal(s.provider["@id"], `${SITE_URL}/#atelier`);
    assert.ok(!("offers" in s), "sur devis : aucun prix annoncé");
    const offres = jsonLdAtelier(locale).makesOffer.map((o) => o.itemOffered.name);
    assert.ok(offres.includes(t.service.nom), `« ${t.service.nom} » n'est pas une offre de l'atelier (${offres.join(", ")})`);
  });
}

test("aucun autre titre du site n'est identique", () => {
  for (const [locale, dict] of [["fr", frBrut], ["en", enBrut]] as const) {
    const rendu = titreSeo(TEXTES_SOUDURE[locale].seo.title);
    for (const [cle, valeur] of Object.entries(dict.seo)) {
      if (typeof valeur !== "object" || valeur === null || !("title" in valeur)) continue;
      assert.notEqual(titreSeo(String(valeur.title)), rendu, `seo.${cle} (${locale}) a le même titre`);
    }
  }
});

test("le français et l'anglais disent la même chose, bloc pour bloc", () => {
  const { fr, en } = TEXTES_SOUDURE;
  for (const cle of ["travaux", "procedes", "etapes", "neuf", "faq"] as const) {
    assert.equal(fr[cle].length, en[cle].length, `${cle} : pas le même nombre de blocs`);
  }
  assert.deepEqual(
    fr.neuf.map((n) => n.chemin),
    en.neuf.map((n) => n.chemin)
  );
  // Chaque champ est rempli dans les deux langues (sauf « English spoken », anglais seulement).
  for (const [cle, valeur] of Object.entries(fr)) {
    if (cle === "quiLangue") continue;
    assert.ok(tout(valeur).length > 2, `fr.${cle} vide`);
    assert.ok(tout(en[cle as keyof typeof en]).length > 2, `en.${cle} vide`);
  }
});

test("chaque pièce « à refaire à neuf » mène à une page ou une fiche qui existe", () => {
  for (const piece of TEXTES_SOUDURE.fr.neuf) {
    const slug = piece.chemin.match(/^\/artisanat\/([a-z0-9-]+)$/)?.[1];
    const dossier = new URL(`../src/app/[lang]${piece.chemin}`, import.meta.url);
    assert.ok(existsSync(dossier) || (slug && getProduct(slug)), `${piece.chemin} n'existe pas`);
  }
});

test("la page : un H1, fil d'Ariane visible et balisé, service sans FAQ balisée, liens de demande", () => {
  const source = lire(PAGE);
  assert.equal(source.match(/<h1[\s>]/g)?.length, 1, "un seul H1");
  assert.match(source, /jsonLdFilAriane\(/);
  assert.match(source, /dict\.nav\.breadcrumb/);
  assert.match(source, /jsonLdService\(/);
  assert.doesNotMatch(source, /jsonLdFaq|FaqVisible/, "FAQ balisée réservée à /faq, /artisanat/tables et /toiles-tendues");
  assert.doesNotMatch(source, /jsonLdProduit|AggregateRating|"Review"/);
  // Les marqueurs remplacés et vérifiés dans la page : un marqueur sans valeur fait échouer la page.
  assert.match(source, /remplacerAvec\(remplacerMarqueurs\(TEXTES_SOUDURE\[locale\], locale\), valeursSoudure\(locale\)\)/);
  assert.match(source, /verifierMarqueurs\(/);
  // Avant l'ouverture : seulement des demandes de devis.
  assert.match(source, /!commandesOuvertes\(\) &&/);
  // Où demander : le formulaire (photos), la prise de cotes, Quentin, la zone.
  for (const chemin of ["/contact?produit=", "/rendez-vous", "/a-propos", "/zone-intervention"]) {
    assert.ok(source.includes(chemin), `lien ${chemin} absent`);
  }
  // Aucun prix ni chiffre du chiffrage écrit dans la page.
  assert.doesNotMatch(source, /\d\s?€|€\s?\d/);
  // Pas de fichier serveur du chiffrage : la page n'en a pas besoin.
  assert.doesNotMatch(source, /\.server"/);
});
