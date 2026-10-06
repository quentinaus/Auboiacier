/**
 * Les photos des sections sous chaque fiche (src/lib/photos-sections.ts, appelé par
 * src/app/[lang]/artisanat/[slug]/page.tsx) : aucune photo n'est montrée deux fois dans les sections d'une même
 * fiche (relecture du 07/10/2026 : l'escalier alternait ses deux photos sur quatre sections, la table de jardin
 * montrait la même photo quatre fois de suite). Une section sans photo libre devient une carte de texte seul.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { photosDesSections } from "../src/lib/photos-sections.ts";
import { productLocalise, products, type Product } from "../src/lib/products.ts";

const PAGE = readFileSync(new URL("../src/app/[lang]/artisanat/[slug]/page.tsx", import.meta.url), "utf8");

/** Les photos qu'une fiche propose à ses sections : la même liste que `sectionImages` dans la page. */
function photosDeFiche(product: Product) {
  return [
    ...product.images,
    ...(product.photosDescriptif ?? []),
    ...(product.fabrics ?? [])
      .filter((f) => f.image && !product.images.some((img) => img.src === f.image))
      .map((f) => ({ src: f.image as string, alt: `${product.name} — ${f.label}` })),
  ];
}

test("la page choisit les photos des sections par photosDesSections, sur la liste sectionImages", () => {
  assert.match(PAGE, /photosDesSections\(product\.sections, sectionImages\)/);
  assert.doesNotMatch(PAGE, /sectionImages\[\(i \+ 1\) % sectionImages\.length\]/, "l'ancienne rotation, qui répétait les photos");
  // La liste de la page est celle que ce test reconstruit.
  assert.match(PAGE, /\.\.\.product\.images,\s*\.\.\.\(product\.photosDescriptif \?\? \[\]\),/);
});

for (const locale of ["fr", "en"] as const) {
  test(`${locale} : aucune photo n'est montrée deux fois dans les sections d'une même fiche`, () => {
    for (const modele of products) {
      const product = productLocalise(modele, locale);
      const choix = photosDesSections(product.sections, photosDeFiche(product));
      assert.equal(choix.length, product.sections.length);
      const vues = choix.flatMap((c) => (c === null ? [] : ["propre" in c ? c.propre : c.photo.src]));
      assert.equal(new Set(vues).size, vues.length, `${product.slug} : une photo revient (${vues.join(", ")})`);
      // Une section qui a sa photo la garde.
      product.sections.forEach((section, i) => {
        if (section.image) assert.deepEqual(choix[i], { propre: section.image }, `${product.slug} : « ${section.title} »`);
      });
    }
  });
}

test("les cas de la relecture : l'escalier et la table de jardin ne répètent plus leurs photos", () => {
  const escalier = products.find((p) => p.slug === "escalier-limon-central")!;
  const choixEscalier = photosDesSections(escalier.sections, photosDeFiche(escalier));
  // Deux photos pour quatre sections : deux sections en photo, les deux autres en texte seul.
  assert.equal(choixEscalier.filter(Boolean).length, Math.min(escalier.sections.length, photosDeFiche(escalier).length));
  const jardin = products.find((p) => p.slug === "table-mikado-exterieur")!;
  const choixJardin = photosDesSections(jardin.sections, photosDeFiche(jardin));
  const vues = choixJardin.flatMap((c) => (c === null ? [] : ["propre" in c ? c.propre : c.photo.src]));
  assert.equal(new Set(vues).size, vues.length);
});

test("photosDesSections : sa propre photo d'abord, puis les suivantes, la première en dernier, puis rien", () => {
  const photos = [{ src: "a" }, { src: "b" }, { src: "c" }];
  assert.deepEqual(photosDesSections([{}, {}, {}, {}], photos), [{ photo: { src: "b" } }, { photo: { src: "c" } }, { photo: { src: "a" } }, null]);
  // Une photo propre à une section n'est plus proposée aux autres, même plus haut.
  assert.deepEqual(photosDesSections([{}, { image: "b" }, {}], photos), [{ photo: { src: "c" } }, { propre: "b" }, { photo: { src: "a" } }]);
  assert.deepEqual(photosDesSections([{}, {}], []), [null, null]);
});
