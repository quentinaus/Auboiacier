/**
 * Les textes alternatifs des photos du catalogue.
 *
 * Ce qu'on vérifie : chaque photo a une description française qui dit quelque
 * chose, et sa traduction anglaise est bien EN FACE (même nombre d'entrées,
 * même ordre). Un tableau `en.images` plus court laisse des alt en français
 * sur la version anglaise ; un tableau plus long décale toutes les
 * descriptions d'un cran — la photo 1 reçoit le texte de la photo 2. C'est
 * arrivé trois fois avant ce test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { products } from "../src/lib/products.ts";

test("chaque photo a un alt FR non vide et sa traduction EN", () => {
  for (const p of products) {
    for (const img of p.images) {
      assert.ok(img.alt.trim().length > 10, `${p.slug} ${img.src} : alt trop court`);
    }
    for (const photo of p.photosDescriptif ?? []) {
      assert.ok(photo.alt.trim().length > 10, `${p.slug} ${photo.src} : alt trop court`);
    }
    assert.equal(
      p.en?.images?.length ?? 0,
      p.images.length,
      `${p.slug} : en.images doit avoir ${p.images.length} entrées`
    );
    assert.equal(
      p.en?.photosDescriptif?.length ?? 0,
      p.photosDescriptif?.length ?? 0,
      `${p.slug} : en.photosDescriptif désaligné`
    );
  }
});

test("aucune traduction d'alt n'est vide ni identique au français", () => {
  for (const p of products) {
    (p.en?.images ?? []).forEach((alt, i) => {
      assert.ok(alt.trim().length > 10, `${p.slug} photo ${i + 1} : alt EN trop court`);
      assert.notEqual(alt, p.images[i].alt, `${p.slug} photo ${i + 1} : alt EN resté en français`);
    });
    (p.en?.photosDescriptif ?? []).forEach((alt, i) => {
      assert.ok(alt.trim().length > 10, `${p.slug} photo descriptif ${i + 1} : alt EN trop court`);
    });
  }
});
