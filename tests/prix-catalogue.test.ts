/**
 * Le prix affiché est le prix facturé.
 *
 * Deux calculs coexistent : `computeUnitPrice` (celui qu'on montre au client
 * dans la fiche produit) et `resolveSelection` (celui que le serveur facture
 * avant le paiement). Le jour où ils divergent, on vend à un prix et on
 * encaisse l'autre. Ces tests interdisent cette divergence.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  products,
  computeUnitPrice,
  essenceDeReference,
  resolveSelection,
  priceFrom,
  devisSurMesure,
  SUR_MESURE,
} from "../src/lib/products.ts";
import {
  achetables,
  combinaisonsValides,
  optionsMoinsCheres,
} from "./catalogue.ts";

test("chaque prix du catalogue est un entier d'euros, strictement positif", () => {
  for (const product of products) {
    // Une pièce qu'on met au panier doit avoir un prix : des tailles au
    // catalogue, ou un barème avec des cotes de départ. Seule une pièce sur
    // devis a le droit de n'en afficher aucun.
    if (product.orderMode === "cart") {
      assert.ok(
        product.sizes.length > 0 || product.surMesure?.departMm,
        `${product.slug} : aucune taille ni cotes de départ`
      );
    }
    for (const taille of product.sizes) {
      assert.ok(
        Number.isInteger(taille.price) && taille.price > 0,
        `${product.slug}/${taille.id} : le prix doit être un entier positif`
      );
    }
    // Les écarts d'options aussi : Stripe facture en centimes entiers.
    for (const option of [...product.woods, ...product.metals, ...(product.fabrics ?? [])]) {
      const ecart = option.priceDelta ?? 0;
      assert.ok(
        Number.isInteger(ecart),
        `${product.slug}/${option.id} : l'écart de prix doit être un entier`
      );
    }
  }
});

test("le prix montré et le prix facturé sont le même, pour toute configuration valide", () => {
  for (const product of achetables) {
    for (const options of combinaisonsValides(product)) {
      const montre = computeUnitPrice(product, options);
      const resolu = resolveSelection({ slug: product.slug, ...options });

      assert.ok(
        resolu.ok,
        `${product.slug} ${JSON.stringify(options)} : une configuration du catalogue est refusée (${
          resolu.ok ? "" : resolu.reason
        })`
      );
      assert.equal(
        montre,
        resolu.line.unitPrice,
        `${product.slug} ${JSON.stringify(options)} : prix affiché ≠ prix facturé`
      );
    }
  }
});

test("toute configuration valide donne un prix entier et strictement positif", () => {
  for (const product of achetables) {
    for (const options of combinaisonsValides(product)) {
      const resolu = resolveSelection({ slug: product.slug, ...options });
      assert.ok(resolu.ok);
      assert.ok(
        Number.isInteger(resolu.line.unitPrice) && resolu.line.unitPrice > 0,
        `${product.slug} ${JSON.stringify(options)} : prix non facturable`
      );
    }
  }
});

test("le « à partir de » est un prix qu'on peut vraiment payer", () => {
  for (const product of achetables) {
    const annonce = priceFrom(product);
    assert.ok(
      annonce !== null && Number.isInteger(annonce) && annonce > 0,
      `${product.slug} : « à partir de » non facturable`
    );

    // La plus petite taille, dans l'essence servie par défaut : c'est ce que le
    // client voit d'abord sur la fiche, et c'est ce que doit annoncer le prix.
    // Sans taille au catalogue, c'est la pièce sur mesure à ses cotes de départ.
    const petiteTaille = product.sizes.length
      ? [...product.sizes].sort((a, b) => a.price - b.price)[0].id
      : SUR_MESURE;
    const reference = essenceDeReference(product);

    const prixReels = combinaisonsValides(product)
      .filter((options) => options.sizeId === petiteTaille && options.woodId === reference?.id)
      .map((options) => {
        const resolu = resolveSelection({ slug: product.slug, ...options });
        assert.ok(resolu.ok, `${product.slug} : configuration par défaut refusée`);
        return resolu.line.unitPrice;
      });

    assert.ok(prixReels.length > 0, `${product.slug} : aucune configuration par défaut`);
    assert.equal(
      annonce,
      Math.min(...prixReels),
      `${product.slug} : le « à partir de » ne correspond à aucune commande réelle dans l'essence par défaut`
    );
  }
});

test("le « à partir de » n'affiche pas le rabais d'une essence moins chère", () => {
  // Annoncer le prix du pin au-dessus d'une table montrée en chêne donne un
  // prix que personne ne peut payer tel quel : le « à partir de » doit rester
  // celui de l'essence servie par défaut, quitte à être plus élevé.
  for (const product of achetables) {
    const reference = essenceDeReference(product);
    if (!reference) continue;
    const moinsChere = [...product.woods].sort(
      (a, b) => (a.priceDelta ?? 0) - (b.priceDelta ?? 0)
    )[0];
    if (moinsChere.id === reference.id) continue;
    // Le prix de la plus petite pièce sans aucune essence : catalogue, ou barème.
    const base = product.sizes.length
      ? Math.min(...product.sizes.map((t) => t.price))
      : (() => {
          const depart = product.surMesure!.departMm!;
          const devis = devisSurMesure(product, depart[0], depart[1]);
          return devis.ok ? devis.prix : Number.POSITIVE_INFINITY;
        })();
    assert.ok(
      (priceFrom(product) ?? 0) > base + (moinsChere.priceDelta ?? 0),
      `${product.slug} : le « à partir de » annonce le prix d'une essence qui n'est pas celle montrée`
    );
  }
});

test("une pièce à taille unique se commande sans avoir à choisir de taille", () => {
  for (const product of achetables.filter((p) => p.sizes.length === 1)) {
    const resolu = resolveSelection({
      slug: product.slug,
      // sizeId volontairement absent
      woodId: product.woods[0]?.id,
      metalId: product.metals[0]?.id,
      fabricId: product.fabrics?.[0]?.id,
    });
    assert.ok(resolu.ok, `${product.slug} : la taille unique devrait être implicite`);
    assert.equal(resolu.line.size.id, product.sizes[0].id);
  }
});

test("le résumé des options nomme toujours ce qui a été choisi", () => {
  for (const product of achetables) {
    for (const options of combinaisonsValides(product)) {
      const resolu = resolveSelection({ slug: product.slug, ...options });
      assert.ok(resolu.ok);
      const { line } = resolu;
      // L'atelier doit lire dans le libellé de quoi fabriquer la pièce.
      for (const choix of [line.wood, line.metal, line.fabric]) {
        if (choix) {
          assert.ok(
            line.optionsLabel.includes(choix.label),
            `${product.slug} : « ${choix.label} » absent du résumé de commande`
          );
        }
      }
      if (product.sizes.length > 1) {
        assert.ok(
          line.optionsLabel.includes(line.size.label),
          `${product.slug} : la taille est absente du résumé de commande`
        );
      }
    }
  }
});

test("un produit sur devis ne se commande jamais, avec ou sans prix d'appel", () => {
  const surDevisTous = products.filter((p) => p.orderMode === "quote");
  if (surDevisTous.length === 0) return; // Plus aucun produit sur devis : rien à vérifier.
  for (const produit of surDevisTous) {
    // Avec des tailles, le « à partir de » reste un vrai prix ; sans taille,
    // la fiche dit « sur devis » et n'annonce rien.
    const annonce = priceFrom(produit);
    if (produit.sizes.length > 0) {
      assert.ok(annonce !== null && annonce > 0, `${produit.slug} : prix d'appel attendu`);
    } else {
      assert.equal(annonce, null, `${produit.slug} : un prix inventé sans taille`);
    }
    const resolu = resolveSelection({
      slug: produit.slug,
      sizeId: produit.sizes[0]?.id,
      woodId: produit.woods[0]?.id,
      metalId: produit.metals[0]?.id,
    });
    assert.equal(resolu.ok, false, `${produit.slug} : commandable alors qu'il est sur devis`);
    assert.equal(
      resolu.ok === false && resolu.reason,
      "not_orderable",
      `${produit.slug} : refusé pour la mauvaise raison`
    );
  }
});

test("quand la commande est refusée, le prix affiché disparaît aussi", () => {
  // L'inverse du test précédent : là où le serveur refuse, la fiche produit ne
  // doit pas continuer à afficher un montant. Les deux fonctions se taisent
  // ensemble, sinon on montre un prix qu'on n'encaissera jamais.
  for (const product of achetables) {
    const bonnes = optionsMoinsCheres(product);
    const mauvaises = [
      { ...bonnes, sizeId: "taille-inventee" },
      { ...bonnes, sizeId: SUR_MESURE, largeurMm: 1, hauteurMm: 1 },
      product.woods.length ? { ...bonnes, woodId: "essence-inventee" } : null,
      product.woods.length ? { ...bonnes, woodId: undefined } : null,
      product.metals.length ? { ...bonnes, metalId: "acier-invente" } : null,
      product.metals.length ? { ...bonnes, metalId: undefined } : null,
      product.fabrics?.length ? { ...bonnes, fabricId: "velours-invente" } : null,
      product.fabrics?.length ? { ...bonnes, fabricId: undefined } : null,
    ].filter((o) => o !== null);

    for (const options of mauvaises) {
      const resolu = resolveSelection({ slug: product.slug, ...options });
      assert.equal(
        resolu.ok,
        false,
        `${product.slug} ${JSON.stringify(options)} : commande acceptée à tort`
      );
      assert.equal(
        computeUnitPrice(product, options),
        null,
        `${product.slug} ${JSON.stringify(options)} : un prix est affiché alors que la commande est refusée`
      );
    }
  }
});
