/**
 * Une pièce sur devis qui n'a encore AUCUN prix — la table résine Mikado,
 * en attendant que Quentin fixe ses tarifs.
 *
 * Ce qu'on vérifie : elle n'annonce aucun chiffre et ne passe jamais en
 * caisse, quoi qu'on lui envoie ; chaque teinte a sa photo, qui existe et
 * figure dans la galerie (c'est elle qui s'affiche quand on choisit la
 * teinte) ; ses formats sont bien formés et traduits — ce sont eux qui
 * deviendront ses tailles le jour des prix ; et la phrase sous « Demander un
 * devis » ne promet pas une visite de l'atelier qui n'aura pas lieu.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import {
  products,
  priceFrom,
  computeUnitPrice,
  resolveSelection,
  productLocalise,
  SUR_MESURE,
} from "../src/lib/products.ts";
import { descriptionSeo, titreSeo } from "../src/lib/seo.ts";
import { produit } from "./catalogue.ts";

/** Les pièces sur devis qui n'ont ni taille chiffrée ni barème : aucun prix nulle part. */
const sansPrix = products.filter(
  (p) => p.orderMode === "quote" && p.sizes.length === 0 && !p.surMesure
);

test("la table résine a ses prix (05/10/2026) : catalogue, en caisse, ses quatre teintes", () => {
  const table = produit("table-resine-mikado");
  assert.equal(table.orderMode, "cart");
  assert.equal(table.famille, "table-interieur");
  assert.equal(table.category, "interieur");
  assert.equal(priceFrom(table), 2160);
  assert.ok(!sansPrix.includes(table));
  assert.deepEqual(table.sizes.map((t) => t.price), [2160, 2540, 2760, 3170, 3670]);
  assert.deepEqual(
    (table.fabrics ?? []).map((f) => f.id),
    ["bleu-paillettes-or", "rouge", "or-nacre", "turquoise"]
  );
});

test("une pièce sans prix ne se vend pas et n'affiche aucun montant, quoi qu'on lui envoie", () => {
  for (const p of sansPrix) {
    const formats = [...(p.formatsDevis?.tailles ?? []).map((f) => f.id), SUR_MESURE, undefined];
    for (const sizeId of formats) {
      for (const fabric of p.fabrics?.length ? p.fabrics : [undefined]) {
        const options = {
          sizeId,
          woodId: p.woods[0]?.id,
          metalId: p.metals[0]?.id,
          fabricId: fabric?.id,
          largeurMm: 2000,
          hauteurMm: 1000,
        };
        assert.equal(computeUnitPrice(p, options), null, `${p.slug} ${JSON.stringify(options)} : un prix s'affiche`);
        const resolu = resolveSelection({ slug: p.slug, ...options });
        assert.equal(resolu.ok, false, `${p.slug} ${JSON.stringify(options)} : commande acceptée`);
        assert.equal(resolu.ok === false && resolu.reason, "not_orderable");
      }
    }
  }
});

test("chaque photo de teinte existe, et la galerie la montre avec sa teinte", () => {
  for (const p of products) {
    for (const f of p.fabrics ?? []) {
      if (!f.image) continue;
      assert.ok(existsSync(join("public", f.image)), `${p.slug}/${f.id} : ${f.image} introuvable`);
    }
    for (const img of p.images) {
      assert.ok(existsSync(join("public", img.src)), `${p.slug} : ${img.src} introuvable`);
    }
  }
  for (const p of sansPrix) {
    for (const f of p.fabrics ?? []) {
      assert.ok(f.image, `${p.slug}/${f.id} : la teinte n'a pas de photo`);
      const vue = p.images.find((img) => img.src === f.image);
      assert.ok(vue, `${p.slug}/${f.id} : sa photo n'est pas dans la galerie`);
      assert.equal(vue.fabric, f.id, `${p.slug}/${f.id} : la vignette sélectionne une autre teinte`);
      assert.ok(f.labelEn && f.labelEn.trim(), `${p.slug}/${f.id} : nom anglais manquant`);
    }
  }
});

test("les formats sur devis sont bien formés et traduits", () => {
  for (const p of products) {
    const formats = p.formatsDevis;
    if (!formats) continue;
    // Des formats sans prix n'ont de sens que sur une pièce qui n'en a aucun.
    assert.equal(p.orderMode, "quote", `${p.slug} : formatsDevis sur une pièce vendue en ligne`);
    assert.equal(p.sizes.length, 0, `${p.slug} : des formats sans prix ET des tailles à prix`);
    assert.ok(formats.tailles.length > 0, `${p.slug} : aucun format`);

    const ids = formats.tailles.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, `${p.slug} : deux formats ont le même identifiant`);
    assert.ok(!ids.includes(SUR_MESURE), `${p.slug} : « ${SUR_MESURE} » est réservé au sur-mesure`);
    assert.ok(
      formats.tailles.filter((f) => f.default).length <= 1,
      `${p.slug} : plusieurs formats par défaut`
    );
    for (const f of formats.tailles) {
      assert.ok(f.label.trim().length > 0, `${p.slug}/${f.id} : libellé vide`);
      if (f.dimsMm) {
        assert.ok(f.dimsMm.every((mm) => Number.isInteger(mm) && mm > 0), `${p.slug}/${f.id} : cotes invalides`);
      }
      const anglais = p.en?.sizes?.[f.id];
      assert.ok(anglais && anglais !== f.label, `${p.slug}/${f.id} : libellé anglais manquant`);
    }
    // La fiche anglaise lit bien ces libellés-là.
    assert.deepEqual(
      productLocalise(p, "en").formatsDevis?.tailles.map((f) => f.label),
      formats.tailles.map((f) => p.en?.sizes?.[f.id])
    );
    if (formats.surMesure) {
      assert.ok(formats.surMesure.fr.trim() && formats.surMesure.en.trim());
      assert.notEqual(formats.surMesure.fr, formats.surMesure.en);
    }
  }
});

test("sur devis sans visite de l'atelier : une phrase à soi sous « Demander un devis »", () => {
  // La phrase par défaut promet une prise de cotes à domicile et la pose
  // comprise : c'est l'escalier. Toute autre pièce sur devis dit la sienne.
  for (const p of products.filter((p) => p.orderMode === "quote" && !p.priseDeCotes)) {
    const note = p.noteDevis;
    assert.ok(note, `${p.slug} : noteDevis manquant`);
    assert.ok(note.fr.trim(), `${p.slug} : noteDevis.fr vide`);
    assert.ok(note.en.trim(), `${p.slug} : noteDevis.en vide`);
    assert.doesNotMatch(note.fr, /prise de cotes|pose comprise/i);
  }
});

test("titre et description Google d'une pièce sans prix tiennent sans être coupés", () => {
  // Même assemblage que generateMetadata (src/app/[lang]/artisanat/[slug]/page.tsx) :
  // nom — mots de métier ; accroche + « Sur devis. » + suffixe.
  const dictionnaires = { fr, en } as const;
  for (const p of sansPrix) {
    for (const locale of ["fr", "en"] as const) {
      const fiche = productLocalise(p, locale);
      const titre = fiche.seoMots ? `${fiche.name} — ${fiche.seoMots}` : fiche.name;
      const rendu = titreSeo(titre);
      assert.ok(rendu.length <= 60, `${p.slug} ${locale} : « ${rendu} » fait ${rendu.length} signes`);
      assert.ok(rendu.startsWith(titre), `${p.slug} ${locale} : titre coupé en « ${rendu} »`);

      const depuis = locale === "fr" ? "Sur devis." : "Price on request.";
      const description = fiche.seoDescription
        ? `${fiche.seoDescription} ${depuis}`
        : `${fiche.tagline} ${depuis} ${dictionnaires[locale].seo.produitSuffixe}`;
      assert.equal(
        descriptionSeo(description),
        description,
        `${p.slug} ${locale} : description de ${description.length} signes, coupée par Google`
      );
    }
  }
});
