/**
 * Ce que le serveur doit refuser.
 *
 * Le navigateur n'envoie que des identifiants, jamais un prix. Mais un curieux
 * peut envoyer ce qu'il veut à /api/commande : une essence inconnue, la taille
 * d'un autre meuble, un velours sur une table… `resolveSelection` est le seul
 * garde-fou avant le paiement. Chaque test ci-dessous ferme une porte.
 *
 * Règle générale, écrite noir sur blanc dans le code : pas de repli silencieux.
 * Une option absente ou inconnue ne doit JAMAIS retomber sur la première de la
 * liste — ce serait payer le pin au prix du pin en croyant acheter du chêne.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveSelection, SUR_MESURE } from "../src/lib/products.ts";
import {
  achetables,
  avecBois,
  avecTissu,
  optionsMoinsCheres,
  sansTissu,
  surDevis,
  surMesurables,
} from "./catalogue.ts";

test("un produit qui n'existe pas ne se commande pas", () => {
  for (const slug of ["", "table-fantome", "../../etc/passwd", "TABLE-MIKADO"]) {
    const resolu = resolveSelection({ slug });
    assert.equal(resolu.ok, false, `slug « ${slug} » accepté`);
    assert.equal(resolu.ok === false && resolu.reason, "unknown_slug");
  }
});

test("un produit vendu sur devis ne passe pas en caisse", () => {
  if (!surDevis) return;
  const resolu = resolveSelection({
    ...optionsMoinsCheres(surDevis),
    slug: surDevis.slug,
  });
  assert.equal(resolu.ok, false);
  assert.equal(resolu.ok === false && resolu.reason, "not_orderable");
});

test("la taille d'un autre produit est refusée", () => {
  for (const product of achetables) {
    const siennes = new Set(product.sizes.map((t) => t.id));
    for (const autre of achetables) {
      if (autre === product) continue;
      for (const taille of autre.sizes) {
        if (siennes.has(taille.id)) continue; // même identifiant, taille légitime
        const resolu = resolveSelection({
          ...optionsMoinsCheres(product),
          slug: product.slug,
          sizeId: taille.id,
        });
        assert.equal(
          resolu.ok,
          false,
          `${product.slug} : la taille « ${taille.id} » de ${autre.slug} est acceptée`
        );
        assert.equal(resolu.ok === false && resolu.reason, "unknown_size");
      }
    }
  }
});

test("une taille inventée est refusée", () => {
  for (const product of achetables) {
    for (const sizeId of ["xxl", "gratuit", "0", " "]) {
      const resolu = resolveSelection({
        ...optionsMoinsCheres(product),
        slug: product.slug,
        sizeId,
      });
      assert.equal(resolu.ok, false, `${product.slug} : taille « ${sizeId} » acceptée`);
    }
  }
});

test("une essence de bois inconnue est refusée", () => {
  assert.ok(avecBois, "il faut un produit avec des essences de bois");
  for (const woodId of ["acajou", "chene ", "CHENE", "pin;"]) {
    const resolu = resolveSelection({
      ...optionsMoinsCheres(avecBois!),
      slug: avecBois!.slug,
      woodId,
    });
    assert.equal(resolu.ok, false, `essence « ${woodId} » acceptée`);
    assert.equal(resolu.ok === false && resolu.reason, "unknown_wood");
  }
});

test("une option obligatoire oubliée est refusée, jamais remplacée d'office", () => {
  for (const product of achetables) {
    const options = optionsMoinsCheres(product);

    if (product.woods.length) {
      const resolu = resolveSelection({ ...options, slug: product.slug, woodId: undefined });
      assert.equal(resolu.ok, false, `${product.slug} : commande sans essence acceptée`);
      assert.equal(resolu.ok === false && resolu.reason, "unknown_wood");
    }
    if (product.metals.length) {
      const resolu = resolveSelection({ ...options, slug: product.slug, metalId: undefined });
      assert.equal(resolu.ok, false, `${product.slug} : commande sans teinte d'acier acceptée`);
      assert.equal(resolu.ok === false && resolu.reason, "unknown_metal");
    }
    if (product.fabrics?.length) {
      const resolu = resolveSelection({ ...options, slug: product.slug, fabricId: undefined });
      assert.equal(resolu.ok, false, `${product.slug} : commande sans velours acceptée`);
      assert.equal(resolu.ok === false && resolu.reason, "unknown_fabric");
    }
  }
});

test("un velours demandé sur une table est refusé", () => {
  assert.ok(sansTissu, "il faut un produit sans velours");
  assert.ok(avecTissu, "il faut un produit avec des velours");
  const resolu = resolveSelection({
    ...optionsMoinsCheres(sansTissu!),
    slug: sansTissu!.slug,
    fabricId: avecTissu!.fabrics![0].id,
  });
  assert.equal(resolu.ok, false, "un velours a été accepté sur une pièce qui n'en a pas");
  assert.equal(resolu.ok === false && resolu.reason, "unknown_fabric");
});

test("une essence demandée sur une pièce qui n'en propose pas est refusée", () => {
  const sansBois = achetables.find((p) => p.woods.length === 0);
  if (!sansBois || !avecBois) return;
  const resolu = resolveSelection({
    ...optionsMoinsCheres(sansBois),
    slug: sansBois.slug,
    woodId: avecBois.woods[0].id,
  });
  assert.equal(resolu.ok, false, "une essence a été acceptée sur une pièce sans bois");
  assert.equal(resolu.ok === false && resolu.reason, "unknown_wood");
});

test("des cotes hors des capacités de l'atelier sont refusées", () => {
  for (const product of surMesurables.filter((p) => p.orderMode === "cart")) {
    const b = product.surMesure!;
    const impossibles: [number, number][] = [
      [0, 0],
      [-1000, -1000],
      [1, 1],
      [b.minMm - 1, b.minMm],
      [b.maxLargeurMm + 1, b.minMm],
      [b.maxLargeurMm * 10, b.maxHauteurMm * 10],
    ];
    for (const [largeurMm, hauteurMm] of impossibles) {
      const resolu = resolveSelection({
        ...optionsMoinsCheres(product),
        slug: product.slug,
        sizeId: SUR_MESURE,
        largeurMm,
        hauteurMm,
      });
      assert.equal(
        resolu.ok,
        false,
        `${product.slug} : ${largeurMm}×${hauteurMm} mm accepté alors que c'est infabricable`
      );
      assert.equal(resolu.ok === false && resolu.reason, "unknown_size");
    }
  }
});

test("du sur-mesure sans cotes du tout est refusé", () => {
  for (const product of surMesurables.filter((p) => p.orderMode === "cart")) {
    const resolu = resolveSelection({
      ...optionsMoinsCheres(product),
      slug: product.slug,
      sizeId: SUR_MESURE,
      // ni largeur ni hauteur — même sur une pièce dont la configuration de
      // base est déjà sur mesure (le garde-corps), on les retire exprès.
      largeurMm: undefined,
      hauteurMm: undefined,
      epaisseurMm: undefined,
    });
    assert.equal(resolu.ok, false, `${product.slug} : sur-mesure sans cotes accepté`);
  }
});

test("le serveur ne fait jamais confiance à un prix venu du navigateur", () => {
  for (const product of achetables) {
    const honnete = resolveSelection({
      ...optionsMoinsCheres(product),
      slug: product.slug,
    });
    assert.ok(honnete.ok);
    // Le panier stocke une copie d'affichage du prix. Même envoyée, elle ne
    // doit rien changer : le prix est toujours recalculé depuis le catalogue.
    const menteur = resolveSelection({
      ...optionsMoinsCheres(product),
      slug: product.slug,
      unitPrice: 1,
      price: 1,
      prix: 1,
    } as never);
    assert.ok(menteur.ok);
    assert.equal(
      menteur.line.unitPrice,
      honnete.line.unitPrice,
      `${product.slug} : un prix envoyé par le navigateur a influencé la facture`
    );
  }
});
