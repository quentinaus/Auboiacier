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

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { descriptionSeo, titreSeo } from "../src/lib/seo.ts";

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
