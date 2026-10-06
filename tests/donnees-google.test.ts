/**
 * Ce que Google reçoit d'une fiche (données structurées Product / Offer)
 * doit dire la même chose que la page.
 *
 * Une étude des données envoyées a trouvé la table Mikado annoncée à Google
 * « dès 1 153 € » (le plus petit sur-mesure) quand la page affichait
 * « à partir de 1 480 € ». Google compare les deux : un écart peut lui faire
 * retirer le prix des résultats, voire la fiche entière de Google Shopping.
 *
 * Ces tests vérifient, pour CHAQUE fiche :
 * - que le prix bas annoncé est le « à partir de » de la page (prixDepart :
 *   description Google, cartes de la boutique, haut de la fiche) ;
 * - que la disponibilité dit vrai : précommande jusqu'à l'ouverture des
 *   commandes (lundi 7 décembre 2026), disponible ensuite ;
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
import { priceFrom, prixParOutil, products } from "../src/lib/products.ts";
import { fourchetteGC, prixDepart } from "../src/lib/garde-corps-outil/site.ts";
import { OUVERTURE_ISO, disponibiliteGoogle, fourchetteGoogle } from "../src/lib/donnees-google.ts";
import { DATE_OUVERTURE_COMMANDES } from "../src/lib/ouverture.ts";
import { jsonLdProduit } from "../src/lib/seo.ts";
import { prixAffiche } from "../src/lib/ui.ts";

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), "utf8");
/** Ce que la page reçoit : la fourchette de l'outil pour le garde-corps, rien pour les autres. */
const fourchetteDe = (p: (typeof products)[number]) => fourchetteGoogle(p, prixDepart(p), prixParOutil(p) ? fourchetteGC() : null);
const AVANT = new Date("2026-10-06T12:00:00+02:00");
const APRES = new Date("2026-12-08T12:00:00+01:00");

test("pour chaque fiche, le prix bas envoyé à Google est le « à partir de » de la page", () => {
  for (const p of products) {
    const depart = prixDepart(p);
    const fourchette = fourchetteDe(p);
    if (depart === null) {
      // Sur devis, sans prix d'appel : aucune offre, jamais un prix inventé.
      assert.equal(fourchette, undefined, `${p.slug} : offre annoncée sans prix affiché`);
      continue;
    }
    assert.ok(fourchette, `${p.slug} : la page affiche ${depart} € mais Google ne reçoit aucune offre`);
    assert.equal(fourchette.prixMin, depart, `${p.slug} : Google reçoit ${fourchette.prixMin} €, la page affiche ${depart} €`);
    assert.ok(fourchette.prixMax >= fourchette.prixMin, `${p.slug} : fourchette à l'envers`);
    // Le haut de la fiche (ProductView) affiche priceFrom : le même nombre, pour toute pièce qui l'affiche.
    if (!p.releve) assert.equal(priceFrom(p), depart, `${p.slug} : le haut de la fiche et Google ne disent pas le même prix`);
    // Et c'est bien ce nombre qui part dans le JSON-LD.
    const ld = jsonLdProduit({
      locale: "fr",
      chemin: `/artisanat/${p.slug}`,
      nom: p.name,
      description: p.tagline,
      images: [],
      fourchette,
      disponibilite: disponibiliteGoogle({ achetable: p.orderMode === "cart", ouvert: false, maintenant: AVANT }),
    }) as { offers?: { lowPrice: number; highPrice: number; priceCurrency: string } };
    assert.equal(ld.offers?.lowPrice, depart, p.slug);
    assert.equal(ld.offers?.priceCurrency, "EUR");
  }
});

test("disponibilité : précommande jusqu'à l'ouverture des commandes, disponible ensuite", () => {
  // Achetable au panier, panier pas encore ouvert, avant le 7 décembre : précommande, avec la date.
  assert.deepEqual(disponibiliteGoogle({ achetable: true, ouvert: false, maintenant: AVANT }), { valeur: "PreOrder", aPartirDu: OUVERTURE_ISO });
  // Panier ouvert : disponible, sans date.
  assert.deepEqual(disponibiliteGoogle({ achetable: true, ouvert: true, maintenant: AVANT }), { valeur: "InStock" });
  assert.deepEqual(disponibiliteGoogle({ achetable: true, ouvert: true, maintenant: APRES }), { valeur: "InStock" });
  // Date passée mais panier toujours fermé : toujours en précommande, sans date déjà passée.
  assert.deepEqual(disponibiliteGoogle({ achetable: true, ouvert: false, maintenant: APRES }), { valeur: "PreOrder" });
  // Pièce sur devis : rien ne s'achète en ligne, aucune date promise.
  assert.deepEqual(disponibiliteGoogle({ achetable: false, ouvert: true, maintenant: AVANT }), { valeur: "PreOrder" });

  // Le JSON-LD en porte la valeur schema.org et, avant l'ouverture, availabilityStarts.
  const offre = (ouvert: boolean) =>
    (
      jsonLdProduit({
        locale: "fr",
        chemin: "/artisanat/x",
        nom: "x",
        description: "x",
        images: [],
        fourchette: { prixMin: 1, prixMax: 2 },
        disponibilite: disponibiliteGoogle({ achetable: true, ouvert, maintenant: AVANT }),
      }) as { offers: Record<string, unknown> }
    ).offers;
  assert.equal(offre(false).availability, "https://schema.org/PreOrder");
  assert.equal(offre(false).availabilityStarts, OUVERTURE_ISO);
  assert.equal(offre(true).availability, "https://schema.org/InStock");
  assert.equal("availabilityStarts" in offre(true), false);
});

test("le jour d'ouverture est le même pour Google, pour les textes et pour les e-mails", () => {
  assert.equal(DATE_OUVERTURE_COMMANDES, "2026-12-07");
  // Minuit à Paris, le lundi 7 décembre 2026.
  assert.equal(Date.parse(OUVERTURE_ISO), Date.UTC(2026, 11, 6, 23, 0, 0));
  assert.equal(new Date(Date.parse(OUVERTURE_ISO) + 3600_000).getUTCDay(), 1, "un lundi");
  assert.match(fr.panier.prevenirTitre, /lundi 7\sdécembre\s2026/);
  assert.match(en.panier.prevenirTitre, /Monday 7\sDecember\s2026/);
  const prevenir = lire("../src/app/api/prevenir/route.ts");
  assert.match(prevenir, /lundi 7 décembre 2026/);
  assert.match(prevenir, /Monday 7 December 2026/);
});

test("la fiche produit passe par ces fonctions, et ne recalcule plus sa propre fourchette", () => {
  const page = lire("../src/app/[lang]/artisanat/[slug]/page.tsx");
  assert.match(page, /fourchetteGoogle\(product, prixDepartFiche, prixParOutil\(product\) \? fourchetteGC\(\) : null\)/);
  assert.match(page, /disponibiliteGoogle\(\{ achetable, ouvert: commandesOuvertes\(\)/);
  assert.match(page, /fourchette,\s*\n\s*disponibilite,/);
  // Le plus petit sur-mesure ne fait plus le prix bas.
  assert.doesNotMatch(page, /bareme\.minMm, bareme\.minMm/);
  assert.doesNotMatch(page, /achetable: product\.orderMode === "cart",\s*\n\s*\}\)/);
});

/* ------------------------------------------------------------------ *
 *  Les pages fabriquées (après « npm run build »)
 *  On lit le HTML que Google lira, et on compare, DANS la même page, le
 *  prix des données structurées et le prix affiché. Sans build, ou avec un
 *  build plus ancien que ce code, la vérification est sautée.
 * ------------------------------------------------------------------ */

const PAGES = new URL("../.next/server/app/", import.meta.url);
const CODE = ["../src/lib/donnees-google.ts", "../src/app/[lang]/artisanat/[slug]/page.tsx", "../src/lib/seo.ts"].map((c) => new URL(c, import.meta.url));
const pageFabriquee = (locale: string, slug: string) => new URL(`${locale}/artisanat/${slug}.html`, PAGES);
const premiere = pageFabriquee("fr", products[0].slug);
const aJour = existsSync(premiere) && CODE.every((c) => statSync(c).mtimeMs <= statSync(premiere).mtimeMs);

/** Toutes les espaces (insécables comprises) ramenées à une espace simple. */
const espaces = (texte: string) => texte.replace(/[\s  ]+/g, " ").trim();
const entites = (texte: string) =>
  texte.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

test(
  "chaque page fabriquée annonce à Google le prix qu'elle affiche",
  { skip: aJour ? false : "pas de build à jour : lancer « npx next build » pour vérifier les pages fabriquées" },
  () => {
    for (const locale of ["fr", "en"] as const) {
      const aPartirDe = locale === "fr" ? "À partir de" : "From";
      for (const p of products) {
        const html = readFileSync(pageFabriquee(locale, p.slug), "utf8");
        const produit = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
          .map((m) => JSON.parse(m[1]) as { "@type"?: string; offers?: { lowPrice: number; highPrice: number; availability: string } })
          .find((ld) => ld["@type"] === "Product");
        assert.ok(produit, `${locale}/${p.slug} : pas de données Product`);
        const description = espaces(entites(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""));
        const annonce = description.match(new RegExp(`${aPartirDe} ([^.]*?\\d[^.]*?)\\.`))?.[1];
        if (!produit.offers) {
          assert.equal(annonce, undefined, `${locale}/${p.slug} : la page affiche ${annonce}, Google ne reçoit aucune offre`);
          continue;
        }
        const attendu = espaces(prixAffiche(produit.offers.lowPrice, locale));
        // La description Google de la page…
        assert.equal(annonce, attendu, `${locale}/${p.slug} : description « ${annonce} », données Google « ${attendu} »`);
        // … et le prix affiché en haut de la fiche, pour les pièces qui l'affichent.
        if (!p.releve) {
          const affiche = html.match(new RegExp(`${aPartirDe}(?:<!-- -->)?\\s*<span[^>]*>([^<]+)</span>`))?.[1];
          assert.equal(espaces(affiche ?? ""), attendu, `${locale}/${p.slug} : la fiche affiche « ${affiche} », Google reçoit « ${attendu} »`);
        }
        assert.ok(produit.offers.highPrice >= produit.offers.lowPrice, `${locale}/${p.slug}`);
        assert.match(produit.offers.availability, /^https:\/\/schema\.org\/(InStock|PreOrder)$/);
      }
    }
  }
);
