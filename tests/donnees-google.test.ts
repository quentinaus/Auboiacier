/**
 * Ce que Google reçoit d'une fiche (données structurées Product / Offer)
 * doit dire la même chose que la page.
 *
 * Deux relectures ont trouvé des écarts : la table Mikado annoncée à Google
 * « dès 1 153 € » (le plus petit sur-mesure) quand la page affichait
 * « à partir de 1 480 € » ; puis un garde-corps à 180 € et un escalier à
 * 4 980 € envoyés à Google alors que leur fiche n'affichait pas ces prix.
 * Google compare : un écart peut lui faire retirer le prix des résultats,
 * voire la fiche entière de Google Shopping.
 *
 * La règle : Google reçoit un prix seulement si la fiche l'affiche. Ces tests
 * vérifient, pour CHAQUE fiche, sans exception :
 * - que le prix bas envoyé est le prix affiché par la fiche
 *   (prixAfficheFiche, le calcul même de ProductView), ou, sans prix affiché,
 *   qu'il n'y a ni offre ni bloc Product ;
 * - que la description Google annonce ce même prix, ou aucun ;
 * - que la disponibilité dit vrai : rien tant que le panier n'encaisse pas,
 *   InStock ensuite (MadeToOrder n'est pas dans la liste de Google) ;
 * - et, quand le site a été fabriqué (npm run build), que chaque page
 *   fabriquée porte dans ses données Google le prix qu'elle affiche.
 *
 * Aucun montant n'est écrit ici : tout vient du catalogue et du moteur.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { priceFrom, prixParOutil, productLocalise, products } from "../src/lib/products.ts";
import { fourchetteGC, prixAppelGC } from "../src/lib/garde-corps-outil/site.ts";
import { disponibiliteGoogle, fourchetteGoogle, prixAfficheFiche, textePrixDescription } from "../src/lib/donnees-google.ts";
import { DATE_OUVERTURE_COMMANDES } from "../src/lib/ouverture.ts";
import { jsonLdProduit } from "../src/lib/seo.ts";
import { prixAffiche } from "../src/lib/ui.ts";

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), "utf8");
/** Ce que la fiche affiche, comme la page le calcule (le prix d'appel du garde-corps vient de l'outil). */
const prixFicheDe = (p: (typeof products)[number]) => prixAfficheFiche(p, prixAppelGC(p));
/** Ce que la page envoie à Google : la fourchette de l'outil pour le garde-corps, rien pour les autres. */
const fourchetteDe = (p: (typeof products)[number]) => fourchetteGoogle(p, prixFicheDe(p), prixParOutil(p) ? fourchetteGC() : null);

test("pour chaque fiche, Google reçoit le prix affiché, ou aucune offre si la fiche n'en affiche pas", () => {
  for (const p of products) {
    const prix = prixFicheDe(p);
    const fourchette = fourchetteDe(p);
    if (prix === null) {
      // Sur devis, sans prix sur la fiche : aucune offre, donc aucun bloc Product (la page teste `fourchette &&`).
      assert.equal(fourchette, undefined, `${p.slug} : offre envoyée à Google sans prix affiché`);
      continue;
    }
    assert.ok(fourchette, `${p.slug} : la fiche affiche ${prix.prix} € mais Google ne reçoit aucune offre`);
    assert.equal(fourchette.prixMin, prix.prix, `${p.slug} : Google reçoit ${fourchette.prixMin} €, la fiche affiche ${prix.prix} €`);
    assert.ok(fourchette.prixMax >= fourchette.prixMin, `${p.slug} : fourchette à l'envers`);
    // Et c'est bien ce nombre qui part dans le JSON-LD.
    const ld = jsonLdProduit({
      locale: "fr",
      chemin: `/artisanat/${p.slug}`,
      nom: p.name,
      description: p.tagline,
      images: [],
      fourchette,
      disponibilite: disponibiliteGoogle({ achetable: p.orderMode === "cart", ouvert: false }),
    });
    assert.equal(ld.offers.lowPrice, prix.prix, p.slug);
    assert.equal(ld.offers.priceCurrency, "EUR");
  }
});

test("ce que chaque fiche affiche : « à partir de » du catalogue, prix d'appel du garde-corps, rien pour l'escalier", () => {
  for (const p of products) {
    const prix = prixFicheDe(p);
    if (!p.releve) {
      // Le « à partir de » du catalogue, celui des cartes de la boutique.
      const depart = priceFrom(p);
      assert.deepEqual(prix, depart === null ? null : { sorte: "a-partir-de", prix: depart }, p.slug);
    } else if (prixParOutil(p)) {
      // Le garde-corps : son prix d'appel, jamais le plus petit garde-corps (que la fiche n'affiche pas).
      const appel = prixAppelGC(p);
      assert.ok(appel, `${p.slug} : prix d'appel non calculé (clé du chiffrage absente ?)`);
      assert.deepEqual(prix, { sorte: "appel", ...appel }, p.slug);
    } else {
      // L'escalier : pas de prix sur la fiche, donc rien pour Google.
      assert.equal(prix, null, `${p.slug} : la fiche n'affiche aucun prix`);
    }
  }
  // Sans prix d'appel (clé du chiffrage absente), le garde-corps n'affiche rien et Google ne reçoit rien.
  const gc = products.find((p) => prixParOutil(p))!;
  assert.equal(prixAfficheFiche(gc, null), null);
  assert.equal(fourchetteGoogle(gc, null, fourchetteGC()), undefined);
});

test("la description Google annonce le prix de la fiche, avec ses mots, ou « Sur devis » sans aucun montant", () => {
  for (const p of products) {
    for (const locale of ["fr", "en"] as const) {
      const fiche = productLocalise(p, locale);
      const prix = prixFicheDe(fiche);
      for (const court of [false, true]) {
        const texte = textePrixDescription(fiche, prix, locale, court);
        if (prix === null) {
          assert.doesNotMatch(texte, /€|\d/, `${p.slug} ${locale} : « ${texte} » annonce un prix que la fiche n'affiche pas`);
          assert.match(texte, locale === "fr" ? /^Sur devis/ : /^(Price on request|Quote)/, texte);
          if (fiche.priseDeCotes) assert.match(texte, locale === "fr" ? /pose comprise/ : /fitting included/, texte);
        } else {
          assert.ok(texte.includes(prixAffiche(prix.prix, locale)), `${p.slug} ${locale} : « ${texte} »`);
        }
      }
    }
  }
  // Le garde-corps : la phrase même de la fiche (« Dès 300 € pour une fenêtre de 100 cm de large »), et
  // jamais le plus petit garde-corps fabriqué ; la forme courte garde le prix et la fenêtre.
  const gc = products.find((p) => prixParOutil(p))!;
  const appel = prixAppelGC(gc)!;
  const cm = appel.largeurMm / 10;
  assert.equal(textePrixDescription(gc, prixFicheDe(gc), "fr"), `Dès ${prixAffiche(appel.prix, "fr")} pour une fenêtre de ${cm} cm de large.`);
  assert.equal(textePrixDescription(gc, prixFicheDe(gc), "en"), `From ${prixAffiche(appel.prix, "en")} for a window ${cm} cm wide.`);
  assert.equal(textePrixDescription(gc, prixFicheDe(gc), "fr", true), `Dès ${prixAffiche(appel.prix, "fr")} (fenêtre de ${cm} cm).`);
  const vue = lire("../src/components/product-view.tsx");
  assert.ok(vue.includes("` pour une fenêtre de ${prixFiche.largeurMm / 10}\\u00a0cm de large`"), "la fiche n'écrit plus la même phrase");
  assert.ok(vue.includes("` for a window ${prixFiche.largeurMm / 10} cm wide`"), "la fiche n'écrit plus la même phrase (anglais)");
});

test("disponibilité : rien tant que le panier n'encaisse pas, InStock ensuite", () => {
  // Panier fermé : aucune disponibilité (PreOrder voudrait dire « on prend les commandes maintenant »).
  assert.equal(disponibiliteGoogle({ achetable: true, ouvert: false }), null);
  // Panier ouvert : disponible. Fabriqué à la commande, mais MadeToOrder n'est pas dans la liste de Google.
  assert.equal(disponibiliteGoogle({ achetable: true, ouvert: true }), "InStock");
  // Pièce sur devis : rien ne s'achète en ligne.
  assert.equal(disponibiliteGoogle({ achetable: false, ouvert: true }), null);
  assert.equal(disponibiliteGoogle({ achetable: false, ouvert: false }), null);

  // Le JSON-LD : ni availability ni availabilityStarts avant l'ouverture ; InStock après.
  const offre = (ouvert: boolean) =>
    jsonLdProduit({
      locale: "fr",
      chemin: "/artisanat/x",
      nom: "x",
      description: "x",
      images: [],
      fourchette: { prixMin: 1, prixMax: 2 },
      disponibilite: disponibiliteGoogle({ achetable: true, ouvert }),
    }).offers as Record<string, unknown>;
  assert.equal("availability" in offre(false), false);
  assert.equal("availabilityStarts" in offre(false), false);
  assert.equal(offre(true).availability, "https://schema.org/InStock");
  assert.equal("availabilityStarts" in offre(true), false);
  for (const fichier of ["../src/lib/seo.ts", "../src/lib/donnees-google.ts"]) {
    const code = lire(fichier).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    assert.doesNotMatch(code, /PreOrder|availabilityStarts|MadeToOrder/, fichier);
  }
});

test("le jour d'ouverture est le même dans les textes et dans les e-mails", () => {
  assert.equal(DATE_OUVERTURE_COMMANDES, "2026-12-07");
  assert.equal(new Date(`${DATE_OUVERTURE_COMMANDES}T12:00:00Z`).getUTCDay(), 1, "un lundi");
  assert.match(fr.panier.prevenirTitre, /lundi 7\sdécembre\s2026/);
  assert.match(en.panier.prevenirTitre, /Monday 7\sDecember\s2026/);
  const prevenir = lire("../src/app/api/prevenir/route.ts");
  assert.match(prevenir, /lundi 7 décembre 2026/);
  assert.match(prevenir, /Monday 7 December 2026/);
});

test("la fiche, sa description et ses données Google passent toutes par prixAfficheFiche", () => {
  const page = lire("../src/app/[lang]/artisanat/[slug]/page.tsx");
  assert.match(page, /fourchetteGoogle\(product, prixAfficheFiche\(product, prixAppel\), prixParOutil\(product\) \? fourchetteGC\(\) : null\)/);
  assert.match(page, /const prixFiche = prixAfficheFiche\(product, prixAppelGC\(product\)\);/);
  assert.match(page, /descriptionTient\(complete\) \? complete : assembler\(textePrixDescription\(product, prixFiche, locale, true\)\)/);
  assert.match(page, /disponibiliteGoogle\(\{ achetable, ouvert: commandesOuvertes\(\) \}\)/);
  // Pas d'offre : pas de bloc Product.
  assert.match(page, /\{fourchette && \(\s*<script[\s\S]{0,200}jsonLdProduit\(/);
  assert.match(page, /prixAppel=\{prixAppel\}/);
  // Le plus petit sur-mesure ne fait plus le prix bas.
  assert.doesNotMatch(page, /bareme\.minMm, bareme\.minMm/);
  // Le haut de la fiche : le même calcul, pour le « à partir de » comme pour le prix d'appel.
  const vue = lire("../src/components/product-view.tsx");
  assert.match(vue, /const prixFiche = prixAfficheFiche\(product, prixAppel\);/);
  assert.match(vue, /const prixDepart = prixFiche\?\.sorte === "a-partir-de" \? prixFiche\.prix : null;/);
  assert.match(vue, /\{prixFiche\?\.sorte === "appel" && \(/);
  assert.doesNotMatch(vue, /priceFrom\(product\)/);
});

/* ------------------------------------------------------------------ *
 *  Les pages fabriquées (après « npm run build »)
 *  On lit le HTML que Google lira, et on compare, DANS la même page, le
 *  prix des données structurées et le prix affiché. Sans build, ou avec un
 *  build plus ancien que ce code, la vérification est sautée.
 * ------------------------------------------------------------------ */

const PAGES = new URL("../.next/server/app/", import.meta.url);
const CODE = [
  "../src/lib/donnees-google.ts",
  "../src/app/[lang]/artisanat/[slug]/page.tsx",
  "../src/lib/seo.ts",
  "../src/components/product-view.tsx",
].map((c) => new URL(c, import.meta.url));
const pageFabriquee = (locale: string, slug: string) => new URL(`${locale}/artisanat/${slug}.html`, PAGES);
const premiere = pageFabriquee("fr", products[0].slug);
const aJour = existsSync(premiere) && CODE.every((c) => statSync(c).mtimeMs <= statSync(premiere).mtimeMs);

/** Toutes les espaces (insécables comprises) ramenées à une espace simple. */
const espaces = (texte: string) => texte.replace(/[\s  ]+/g, " ").trim();
const entites = (texte: string) =>
  texte.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

test(
  "chaque page fabriquée annonce à Google le prix qu'elle affiche, ou ni prix ni bloc Product",
  { skip: aJour ? false : "pas de build à jour : lancer « npx next build » pour vérifier les pages fabriquées" },
  () => {
    for (const locale of ["fr", "en"] as const) {
      // Le prix du haut de la fiche : « À partir de <span>1 480 €</span> » ou « Dès <span>300 €</span> pour une fenêtre… ».
      const prixHaut = new RegExp(`(?:${locale === "fr" ? "À partir de|Dès" : "From"})\\s*(?:<!-- -->)?\\s*<span[^>]*>([^<]+)</span>`);
      for (const p of products) {
        const html = readFileSync(pageFabriquee(locale, p.slug), "utf8");
        const blocs = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
          (m) => JSON.parse(m[1]) as { "@type"?: string; offers?: Record<string, unknown> & { lowPrice: number; highPrice: number } }
        );
        const produit = blocs.find((ld) => ld["@type"] === "Product");
        // Le fil d'Ariane reste, avec ou sans prix.
        assert.ok(blocs.some((ld) => ld["@type"] === "BreadcrumbList"), `${locale}/${p.slug} : fil d'Ariane absent`);
        const description = espaces(entites(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""));
        const affiche = html.match(prixHaut)?.[1];
        if (!produit) {
          // Ni prix affiché en haut de la fiche, ni prix dans la description.
          assert.equal(affiche, undefined, `${locale}/${p.slug} : la fiche affiche « ${affiche} », Google ne reçoit rien`);
          assert.doesNotMatch(description, /€/, `${locale}/${p.slug} : la description annonce un prix (« ${description} »)`);
          continue;
        }
        assert.ok(produit.offers, `${locale}/${p.slug} : bloc Product sans offre (Google le juge non valide)`);
        const attendu = espaces(prixAffiche(produit.offers.lowPrice, locale));
        // Le prix affiché en haut de la fiche…
        assert.equal(espaces(affiche ?? ""), attendu, `${locale}/${p.slug} : la fiche affiche « ${affiche} », Google reçoit « ${attendu} »`);
        // … et la description Google de la page.
        assert.ok(description.includes(attendu), `${locale}/${p.slug} : description « ${description} », données Google « ${attendu} »`);
        assert.ok(produit.offers.highPrice >= produit.offers.lowPrice, `${locale}/${p.slug}`);
        // Avant l'ouverture : aucune disponibilité ; après : InStock. Jamais PreOrder ni date.
        if ("availability" in produit.offers) assert.equal(produit.offers.availability, "https://schema.org/InStock", `${locale}/${p.slug}`);
        assert.equal("availabilityStarts" in produit.offers, false, `${locale}/${p.slug}`);
      }
    }
  }
);
