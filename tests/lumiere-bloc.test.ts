import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getProduct, computeUnitPrice, SUR_MESURE } from "../src/lib/products.ts";
import { dureeFabrication, formeVoisineLumiere, puissanceEstimeeW, SLUG_HALO, SLUG_LUCARNE } from "../src/lib/lumiere.ts";

/**
 * Le bloc « Configuration » des plafonds lumineux (Quentin, 10/10/2026 : « le même bloc que celui du portail, sans les
 * mêmes options ») : les deux fiches passent par la mise en page trois colonnes de product-view.tsx, la puissance
 * affichée suit les tailles du catalogue, et l'autre forme est proposée au prix de sa propre fiche.
 */

const lucarne = getProduct(SLUG_LUCARNE)!;
const halo = getProduct(SLUG_HALO)!;

test("les deux fiches lumière passent par le bloc trois colonnes (product-view.tsx), le garde-corps aussi, les tables non", () => {
  const vue = readFileSync(new URL("../src/components/product-view.tsx", import.meta.url), "utf8");
  assert.match(vue, /const blocLumiere = pleinePage && product\.category === "lumiere"/);
  assert.match(vue, /const troisColonnes = gardeCorps \|\| blocLumiere/);
  // La fiche du garde-corps (films, « Qui prend les mesures ? ») reste réservée au garde-corps.
  assert.match(vue, /const ficheGC = pleinePage && gardeCorps;/);
  assert.equal(lucarne.category, "lumiere");
  assert.equal(halo.category, "lumiere");
  assert.ok(lucarne.surMesure && halo.surMesure, "les deux fiches se fabriquent aux cotes du client (configurateur en pleine page)");
  // Les morceaux du bloc sont déposés par ProductOptions, seulement pour les lumières.
  const options = readFileSync(new URL("../src/components/product-options.tsx", import.meta.url), "utf8");
  assert.match(options, /const lumiereBloc = product\.category === "lumiere" && nouvelleMiseEnPage;/);
  for (const morceau of ["<PlaquettesCadre", "<BandeauFormes", "<RecapLumiere", "<LigneCoteLumiere"]) {
    assert.ok(options.includes(morceau), `${morceau} est rendu par la fiche`);
  }
});

test("la puissance affichée reste à ±15 % des tailles du catalogue", () => {
  for (const produit of [lucarne, halo]) {
    for (const taille of produit.sizes) {
      const watts = Number(/(\d+)\s*W/.exec(taille.label)?.[1]);
      assert.ok(watts > 0, `${taille.label} annonce une puissance`);
      // La surface écrite sur l'étiquette (un Halo est un disque : surfaceTailleM2 donne le carré qui le contient).
      const surface = Number(/([\d,.]+)\s*m²/.exec(taille.label)?.[1].replace(",", "."));
      const estimee = puissanceEstimeeW(surface);
      const ecart = Math.abs(estimee - watts) / watts;
      assert.ok(ecart <= 0.15, `${produit.name} ${taille.label} : ≈ ${estimee} W pour ${watts} W (${Math.round(ecart * 100)} %)`);
    }
  }
  assert.equal(puissanceEstimeeW(0), 0);
  assert.equal(puissanceEstimeeW(NaN), 0);
});

test("le délai du récapitulatif reprend celui de la fiche, jamais inventé", () => {
  const delai = lucarne.specs.find((s) => /fabrication/i.test(s.label))?.value;
  assert.equal(dureeFabrication(delai, "fr"), "fabriqué en 3 à 5 semaines");
  assert.equal(dureeFabrication("Made to order — allow 3 to 5 weeks", "en"), "made in 3 to 5 weeks");
  assert.equal(dureeFabrication(undefined, "fr"), null);
  // Une phrase sans durée lisible : on l'écrit telle quelle.
  assert.equal(dureeFabrication("Sur commande", "fr"), "Sur commande");
});

test("l'autre forme est proposée au prix public de sa propre fiche, aux cotes du client", () => {
  // Depuis la Lucarne 1800 × 1180 : un Halo de Ø 1800 (la plus grande cote), au prix de la fiche Halo.
  const versHalo = formeVoisineLumiere(lucarne, { largeurMm: 1800, hauteurMm: 1180, epaisseurMm: 200 }, "noir");
  assert.ok(versHalo);
  assert.equal(versHalo.produit.slug, SLUG_HALO);
  assert.equal(versHalo.largeurMm, 1800);
  assert.equal(versHalo.prix, computeUnitPrice(halo, { sizeId: SUR_MESURE, metalId: "noir", largeurMm: 1800, hauteurMm: 1800, epaisseurMm: 200 }));
  // Depuis le Halo Ø 1800 : une Lucarne carrée de 1800 × 1800.
  const versLucarne = formeVoisineLumiere(halo, { largeurMm: 1800, hauteurMm: 1800, epaisseurMm: 200 }, "blanc");
  assert.ok(versLucarne);
  assert.equal(versLucarne.produit.slug, SLUG_LUCARNE);
  assert.equal(versLucarne.prix, computeUnitPrice(lucarne, { sizeId: SUR_MESURE, metalId: "blanc", largeurMm: 1800, hauteurMm: 1800, epaisseurMm: 200 }));
  // Hors barème sur l'autre fiche (une Lucarne de 4 000 × 4 000 n'existe pas) : pas de prix, pas d'invention.
  const tropGrand = formeVoisineLumiere(halo, { largeurMm: 4000, hauteurMm: 4000, epaisseurMm: 200 }, "noir");
  assert.ok(tropGrand);
  assert.equal(tropGrand.prix, null);
  // Une autre pièce : rien à proposer.
  assert.equal(formeVoisineLumiere(getProduct("table-mikado")!, { largeurMm: 2000, hauteurMm: 1000, epaisseurMm: 40 }), null);
});
