/**
 * Les marqueurs de prix des textes (« dès {prixTables} », « {prix:<slug>} »,
 * « {delai:<slug>} »…) : chaque valeur est celle du moteur, jamais un chiffre
 * écrit à la main ; un marqueur sans valeur fait échouer le build ; les prix
 * du garde-corps ne se calculent que sur le serveur.
 *
 * Aucun montant n'est écrit dans ce fichier : les prix viennent du catalogue
 * (priceFrom) et de l'outil (prixDepart, prixAppelGC).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import frBrut from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import enBrut from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import {
  MarqueurSansValeur,
  marqueursDuServeur,
  marqueursRestants,
  remplacerAvec,
  remplacerMarqueurs,
  valeursMarqueurs,
  valeursMarqueursOutil,
  verifierMarqueurs,
} from "../src/lib/marqueurs.ts";
import {
  PLATEAU_MAX_LARGEUR_MM,
  PLATEAU_MAX_LONGUEUR_MM,
  productLocalise,
  products,
  prixParOutil,
} from "../src/lib/products.ts";
import { FENETRE_APPEL_GC, prixAppelGC, prixDepart } from "../src/lib/garde-corps-outil/site.ts";
import { LIVRAISON_MAX_CENTS } from "../src/lib/deplacement.ts";
import { prixAffiche } from "../src/lib/ui.ts";
import { delaiFabrication } from "../src/lib/vitrine.ts";

const LOCALES = ["fr", "en"] as const;
const DICTIONNAIRES = { fr: frBrut, en: enBrut } as const;
const tables = products.filter((p) => p.famille === "table-interieur" || p.famille === "table-exterieur");
// Le garde-corps de fenêtre Rosace : ses marqueurs sont ceux des textes (le forgé à volutes a son prix sur sa fiche).
const gc = products.find((p) => prixParOutil(p) && !p.decorsGC)!;
const outil = (locale: "fr" | "en") => valeursMarqueursOutil(locale, { prixDepart, prixAppelGC });

for (const locale of LOCALES) {
  test(`${locale} : {prix:<slug>} est le « à partir de » du moteur, fiche par fiche`, () => {
    const valeurs = valeursMarqueurs(locale);
    let vus = 0;
    for (const p of products) {
      if (prixParOutil(p)) {
        assert.equal(valeurs[`{prix:${p.slug}}`], undefined, `${p.slug} : son prix vient de l'outil, sur le serveur`);
        continue;
      }
      // Les portails : leur « à partir de » vient de l'outil des portails, sur le serveur (prix-portail.server.ts) ; aucun texte
      // ne le cite par un marqueur.
      if (p.famille === "portail") {
        assert.equal(valeurs[`{prix:${p.slug}}`], undefined, `${p.slug} : son prix vient de l'outil des portails, sur le serveur`);
        continue;
      }
      // prixDepart (la porte du serveur) = priceFrom hors garde-corps : la même valeur.
      const depart = prixDepart(p);
      if (depart === null) {
        assert.equal(valeurs[`{prix:${p.slug}}`], undefined, `${p.slug} : sur devis, aucun prix inventé`);
        continue;
      }
      assert.equal(valeurs[`{prix:${p.slug}}`], prixAffiche(depart, locale), p.slug);
      vus++;
    }
    assert.ok(vus >= 5, "les fiches à prix doivent avoir leur marqueur");
  });

  test(`${locale} : {prixTables} est la table la moins chère du catalogue`, () => {
    const prix = tables.map(prixDepart).filter((x): x is number => x !== null);
    assert.ok(prix.length >= 2, "les tables doivent être trouvées");
    assert.equal(valeursMarqueurs(locale)["{prixTables}"], prixAffiche(Math.min(...prix), locale));
  });

  test(`${locale} : délais, livraison et plateau viennent du code`, () => {
    const valeurs = valeursMarqueurs(locale);
    for (const p of products) {
      const delai = delaiFabrication(productLocalise(p, locale));
      assert.equal(valeurs[`{delai:${p.slug}}`], delai ?? undefined, p.slug);
    }
    assert.match(valeurs["{delai:escalier-limon-central}"], locale === "fr" ? /semaines$/ : /weeks$/);
    assert.equal(valeurs["{livraisonMax}"], prixAffiche(LIVRAISON_MAX_CENTS / 100, locale));
    assert.equal(valeurs["{plateauLongueurMax}"], String(PLATEAU_MAX_LONGUEUR_MM / 10));
    assert.equal(valeurs["{plateauLargeurMax}"], String(PLATEAU_MAX_LARGEUR_MM / 10));
  });

  test(`${locale} : les marqueurs du garde-corps sont ceux de l'outil (clé du chiffrage présente)`, () => {
    const valeurs = outil(locale);
    const depart = prixDepart(gc);
    const appel = prixAppelGC(gc);
    assert.ok(depart !== null && appel !== null, "Clé du chiffrage absente : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
    assert.equal(valeurs[`{prix:${gc.slug}}`], prixAffiche(depart, locale));
    assert.equal(valeurs["{prixAppelGC}"], prixAffiche(appel.prix, locale));
    assert.equal(valeurs["{largeurAppelGC}"], String(FENETRE_APPEL_GC.largeurMm / 10));
  });

  test(`${locale} : sans l'outil (pas de clé), aucun prix de garde-corps n'est inventé`, () => {
    const valeurs = valeursMarqueursOutil(locale, { prixDepart: () => null, prixAppelGC: () => null });
    assert.deepEqual(valeurs, {});
  });

  test(`${locale} : le dictionnaire n'a aucun marqueur sans valeur`, () => {
    const dict = remplacerMarqueurs(DICTIONNAIRES[locale], locale);
    // Ce que getDictionary laisse passer : les seuls marqueurs du garde-corps, que la page remplit.
    assert.doesNotThrow(() => verifierMarqueurs(dict, `dictionnaire ${locale}`, { serveurPermis: true }));
    // Et une fois les prix de l'outil remplis (remplacerMarqueursPrix), plus rien du tout.
    assert.deepEqual(marqueursRestants(remplacerAvec(dict, outil(locale))), []);
  });
}

test("un marqueur sans valeur est refusé, jamais remplacé par un chiffre", () => {
  const texte = { a: "Dès {prix:piece-qui-n-existe-pas}.", b: ["{delai:autre-inconnue}", "{prixTables}"] };
  const rempli = remplacerMarqueurs(texte, "fr");
  assert.equal(rempli.a, texte.a, "le marqueur inconnu reste tel quel");
  assert.notEqual(rempli.b[1], "{prixTables}");
  assert.deepEqual(marqueursRestants(rempli).sort(), ["{delai:autre-inconnue}", "{prix:piece-qui-n-existe-pas}"]);
  assert.throws(() => verifierMarqueurs(rempli, "test"), MarqueurSansValeur);
  // Une fiche sur devis (aucun prix au catalogue) n'a pas de marqueur de prix.
  for (const p of products.filter((x) => !prixParOutil(x) && prixDepart(x) === null)) {
    assert.throws(() => verifierMarqueurs(remplacerMarqueurs(`Dès {prix:${p.slug}}`, "fr"), "test"), MarqueurSansValeur);
  }
  // Les marqueurs propres à une page ({prix}, {delai}, {n}) ne sont pas ceux du code : on n'y touche pas.
  assert.deepEqual(marqueursRestants("Dès {prix}, {delai}, {n} modèles"), []);
});

test("le dictionnaire laisse passer les seuls marqueurs du garde-corps, pour la page du serveur", () => {
  const dict = remplacerMarqueurs({ t: `Dès {prixAppelGC} pour {largeurAppelGC} cm, {prix:${gc.slug}}` }, "fr");
  assert.doesNotThrow(() => verifierMarqueurs(dict, "test", { serveurPermis: true }));
  assert.throws(() => verifierMarqueurs(dict, "test"), MarqueurSansValeur);
  // Chaque garde-corps chiffré par l'outil (Rosace et forgé à volutes) a son « à partir de » sur le serveur.
  const departs = products.filter(prixParOutil).map((p) => `{prix:${p.slug}}`);
  assert.ok(departs.includes(`{prix:${gc.slug}}`));
  assert.deepEqual([...marqueursDuServeur()].sort(), ["{largeurAppelGC}", "{prixAppelGC}", ...departs].sort());
});

test("getDictionary refuse un marqueur sans valeur (le build échoue)", () => {
  const source = readFileSync(new URL("../src/app/[lang]/dictionaries.ts", import.meta.url), "utf8");
  assert.match(source, /verifierMarqueurs\(dict, [^)]*\{ serveurPermis: true \}\)/);
  // Pas de fichier *.server.* : les composants du navigateur importent le type Dictionary d'ici.
  assert.doesNotMatch(source.replace(/\/\/[^\n]*/g, ""), /\.server/);
});

test("les prix du garde-corps passent par la porte du serveur, derrière « server-only »", () => {
  const source = readFileSync(new URL("../src/lib/marqueurs-prix.server.ts", import.meta.url), "utf8");
  assert.match(source, /^import "server-only";\n/);
  assert.match(source, /from "\.\/prix-garde-corps\.server\.ts"/);
  assert.doesNotMatch(source, /garde-corps-outil/);
  assert.match(source, /verifierMarqueurs\(resultat/);
  // Le fichier que tout le site importe ne touche jamais l'outil.
  const commun = readFileSync(new URL("../src/lib/marqueurs.ts", import.meta.url), "utf8");
  assert.doesNotMatch(commun.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /garde-corps-outil|\.server/);
});

/**
 * Écrits à la main avant les marqueurs (relevé du 07/10/2026) : le plafond de
 * la livraison, dans le bloc `artisanat` (lot L7 du plan de référencement).
 * À passer en {livraisonMax}, puis à retirer d'ici. N'y ajouter aucune clé.
 */
const MONTANTS_EN_DUR_CONNUS = new Set([
  "artisanat.poseSeulInfo",
  "artisanat.inclusLivraisonTable",
  "artisanat.poseSeulInfoPiece",
  "artisanat.poseSeulCourt",
]);

/** Chaque chaîne d'un dictionnaire, avec sa clé (« artisanat.poseSeulInfo », « faq.items.8.a »). */
function chaines(valeur: unknown, chemin = ""): [string, string][] {
  if (typeof valeur === "string") return [[chemin, valeur]];
  if (valeur && typeof valeur === "object") {
    return Object.entries(valeur).flatMap(([cle, sous]) => chaines(sous, chemin ? `${chemin}.${cle}` : cle));
  }
  return [];
}

test("aucun montant n'est écrit dans les textes à la place d'un marqueur du code", () => {
  // Les prix que les marqueurs donnent ne doivent pas être recopiés à la main dans les dictionnaires.
  for (const locale of LOCALES) {
    const valeurs = Object.entries({ ...valeursMarqueurs(locale), ...outil(locale) }).filter(([, v]) => v.includes("€"));
    for (const [cle, texte] of chaines(DICTIONNAIRES[locale])) {
      const propre = texte.replace(/\s/g, " ");
      for (const [marqueur, valeur] of valeurs) {
        if (!propre.includes(valeur.replace(/\s/g, " ")) || MONTANTS_EN_DUR_CONNUS.has(cle)) continue;
        assert.fail(`${locale}.json, ${cle} écrit « ${valeur} » en dur : utiliser ${marqueur}`);
      }
    }
  }
});
