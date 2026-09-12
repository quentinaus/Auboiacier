/**
 * La fabrication aux cotes du client.
 *
 * Deux dangers : facturer moins cher qu'au catalogue une pièce identique
 * (l'atelier travaille à perte), et accepter des cotes que l'atelier ne sait
 * pas fabriquer. Les tests ci-dessous ferment ces deux portes, sans jamais
 * figer un tarif.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeUnitPrice,
  devisSurMesure,
  epaisseurMiniMm,
  epaisseurMaxMm,
  resolveSelection,
  surfaceM2,
  SUR_MESURE,
} from "../src/lib/products.ts";
import {
  achetables,
  cotesHorsCatalogue,
  estUneCoteDuCatalogue,
  optionsMoinsCheres,
  sansSurMesure,
  surMesurables,
  remplissagesPour,
} from "./catalogue.ts";

/* ---------------------------------------------------------------- *
 *  La surface, d'abord : tout le prix en découle.
 * ---------------------------------------------------------------- */

test("la surface d'un rectangle, c'est longueur × largeur", () => {
  assert.equal(surfaceM2("rect", 2000, 1000), 2);
  assert.equal(surfaceM2("rect", 1000, 1000), 1);
  assert.equal(surfaceM2("rect", 1500, 900), 1.35);
});

test("la surface d'un rond, c'est un disque, pas un carré", () => {
  // Ø 1000 mm : π × 0,5² = 0,785… m². Un carré de 1 m donnerait 1 m² : 27 % de trop.
  assert.ok(Math.abs(surfaceM2("rond", 1000, 1000) - Math.PI / 4) < 1e-12);
  assert.ok(Math.abs(surfaceM2("rond", 2000, 2000) - Math.PI) < 1e-12);
  // Le rond ne se mesure qu'au diamètre : la seconde cote ne compte pas.
  assert.equal(surfaceM2("rond", 1200, 400), surfaceM2("rond", 1200, 9999));
});

/* ---------------------------------------------------------------- *
 *  Sur mesure et catalogue doivent raconter la même histoire.
 * ---------------------------------------------------------------- */

test("aux cotes exactes d'une taille du catalogue, on paie le prix du catalogue", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    for (const taille of product.sizes) {
      if (!taille.dimsMm) continue;
      const [largeur, hauteur] = taille.dimsMm;

      // Épaisseur laissée par défaut, puis écrite en toutes lettres : même prix.
      for (const epaisseur of [undefined, bareme.epaisseur.refMm]) {
        const devis = devisSurMesure(product, largeur, hauteur, epaisseur);
        assert.ok(devis.ok, `${product.slug}/${taille.id} : cotes du catalogue refusées`);
        assert.equal(
          devis.prix,
          taille.price,
          `${product.slug}/${taille.id} : le sur-mesure ne retombe pas sur le prix du catalogue`
        );
      }
    }
  }
});

test("commander une taille du catalogue ou la même pièce sur mesure coûte pareil", () => {
  for (const product of surMesurables.filter((p) => p.orderMode === "cart")) {
    const options = optionsMoinsCheres(product);
    for (const taille of product.sizes) {
      if (!taille.dimsMm) continue;
      const parCatalogue = resolveSelection({
        ...options,
        slug: product.slug,
        sizeId: taille.id,
      });
      const parCotes = resolveSelection({
        ...options,
        slug: product.slug,
        sizeId: SUR_MESURE,
        largeurMm: taille.dimsMm[0],
        hauteurMm: taille.dimsMm[1],
      });
      assert.ok(parCatalogue.ok && parCotes.ok, `${product.slug}/${taille.id} refusé`);
      assert.equal(
        parCotes.line.unitPrice,
        parCatalogue.line.unitPrice,
        `${product.slug}/${taille.id} : deux façons de commander la même pièce, deux prix`
      );
    }
  }
});

test("le sur-mesure n'est jamais moins cher que le catalogue, à cotes égales", () => {
  for (const product of surMesurables) {
    for (const taille of product.sizes) {
      if (!taille.dimsMm) continue;
      const [largeur, hauteur] = taille.dimsMm;
      const devis = devisSurMesure(product, largeur, hauteur);
      assert.ok(devis.ok, `${product.slug}/${taille.id} : cotes du catalogue refusées`);
      assert.ok(
        devis.prix >= taille.price,
        `${product.slug}/${taille.id} : la même pièce coûte moins cher en sur-mesure (${devis.prix} € contre ${taille.price} €)`
      );
    }
  }
});

/**
 * Une taille du catalogue reprend son propre tarif au millimètre près. Juste à
 * côté, c'est le barème au mètre carré qui s'applique : il ne doit jamais
 * tomber plus bas, sinon demander 2 401 mm au lieu de 2 400 mm ferait baisser
 * la facture. Les forfaits du catalogue ont été recalés pour cela.
 */
test("juste à côté d'une taille du catalogue, le prix ne doit pas plonger", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    for (const taille of product.sizes) {
      if (!taille.dimsMm) continue;
      const [largeur, hauteur] = taille.dimsMm;
      for (const voisine of [largeur - 1, largeur + 1]) {
        if (voisine < bareme.minMm || voisine > bareme.maxLargeurMm) continue;
        const devis = devisSurMesure(product, voisine, hauteur);
        assert.ok(devis.ok);
        assert.ok(
          devis.prix >= taille.price,
          `${product.slug}/${taille.id} : ${voisine} mm au lieu de ${largeur} mm fait tomber le prix à ${devis.prix} € au lieu de ${taille.price} €`
        );
      }
    }
  }
});

/**
 * L'autre sens du même garde-fou, et il vaut de l'argent pour le client :
 * une pièce PLUS PETITE qu'une taille du catalogue ne doit jamais coûter plus
 * cher qu'elle. Sans le plafond, demander 199,9 × 100 cm au lieu de
 * 200 × 100 cm faisait repasser au barème et coûtait 330 € de plus — le client
 * payait la remise du catalogue en moins, pour une table plus petite.
 */
test("une pièce plus petite ne coûte jamais plus cher qu'une taille du catalogue", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    for (const taille of product.sizes) {
      if (!taille.dimsMm) continue;
      const [largeur, hauteur] = taille.dimsMm;
      for (const cotes of [
        [largeur - 1, hauteur],
        [largeur, Math.max(bareme.minMm, hauteur - 1)],
        [largeur - 1, Math.max(bareme.minMm, hauteur - 1)],
      ]) {
        if (cotes[0] < bareme.minMm) continue;
        const devis = devisSurMesure(product, cotes[0], cotes[1]);
        assert.ok(devis.ok, `${product.slug} : ${cotes[0]} × ${cotes[1]} refusé`);
        assert.ok(
          devis.prix <= taille.price,
          `${product.slug}/${taille.id} : ${cotes[0]} × ${cotes[1]} mm coûte ${devis.prix} €, plus que la taille du catalogue qui l'englobe (${taille.price} €)`
        );
      }
    }
  }
});

/**
 * Un caisson lumineux ne peut pas être plus profond que le panneau n'est
 * étroit : la toile ne se tend plus et l'objet devient une boîte. Sans cette
 * borne, on pouvait commander un panneau de 30 × 30 cm avec 60 cm de caisson.
 */
test("un caisson lumineux ne dépasse pas la plus petite cote du panneau", () => {
  const lumineux = surMesurables.filter((p) => p.surMesure!.epaisseur.parM2Bande !== undefined);
  assert.ok(lumineux.length > 0, "aucun produit lumineux à vérifier");

  for (const product of lumineux) {
    const bareme = product.surMesure!;
    const cote = bareme.minMm;
    const maxi = epaisseurMaxMm(bareme, cote, cote);
    assert.equal(maxi, Math.min(bareme.epaisseur.maxMm, cote));

    assert.ok(
      devisSurMesure(product, cote, cote, maxi).ok,
      `${product.slug} : la profondeur maximale devrait passer`
    );
    const trop = devisSurMesure(product, cote, cote, maxi + 1);
    assert.equal(trop.ok, false, `${product.slug} : un caisson trop profond est accepté`);
    assert.equal(
      trop.ok === false && trop.reason,
      maxi === bareme.epaisseur.maxMm ? "epaisseur_hors_bornes" : "caisson_trop_profond"
    );
  }
});

/* ---------------------------------------------------------------- *
 *  Les bornes de l'atelier : ce qu'on sait fabriquer, et rien d'autre.
 * ---------------------------------------------------------------- */

test("les cotes minimales et maximales sont acceptées, un millimètre de plus ou de moins est refusé", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    const nom = product.slug;
    const rond = bareme.forme === "rond";

    // La plus petite pièce fabricable passe.
    assert.ok(
      devisSurMesure(product, bareme.minMm, bareme.minMm).ok,
      `${nom} : la cote minimale devrait passer`
    );
    // Un millimètre de moins, non.
    const tropPetit = devisSurMesure(product, bareme.minMm - 1, bareme.minMm);
    assert.equal(tropPetit.ok, false, `${nom} : trop petit accepté`);
    assert.equal(tropPetit.ok === false && tropPetit.reason, "trop_petit");
    if (!rond) {
      const tropCourt = devisSurMesure(product, bareme.minMm, bareme.minMm - 1);
      assert.equal(tropCourt.ok, false, `${nom} : hauteur trop petite acceptée`);
    }

    // La plus grande pièce fabricable passe.
    const hauteurMax = rond ? bareme.maxLargeurMm : bareme.maxHauteurMm;
    assert.ok(
      devisSurMesure(product, bareme.maxLargeurMm, hauteurMax).ok,
      `${nom} : la cote maximale devrait passer`
    );
    // Un millimètre de plus, non.
    const tropLarge = devisSurMesure(product, bareme.maxLargeurMm + 1, bareme.minMm);
    assert.equal(tropLarge.ok, false, `${nom} : trop large accepté`);
    assert.equal(tropLarge.ok === false && tropLarge.reason, "trop_grand");
    if (!rond) {
      const tropHaut = devisSurMesure(product, bareme.minMm, bareme.maxHauteurMm + 1);
      assert.equal(tropHaut.ok, false, `${nom} : trop haut accepté`);
      assert.equal(tropHaut.ok === false && tropHaut.reason, "trop_grand");
    }
  }
});

test("les épaisseurs limites passent, celles d'à côté sont refusées", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    const { largeurMm, hauteurMm } = cotesHorsCatalogue(bareme, 0.5);
    // L'épaisseur mini dépend de la portée : sur une longue table, un plateau
    // de 25 mm est refusé même si le barème descend jusque-là.
    const mini = epaisseurMiniMm(bareme, Math.max(largeurMm, hauteurMm));
    const { maxMm } = bareme.epaisseur;

    assert.ok(
      devisSurMesure(product, largeurMm, hauteurMm, mini).ok,
      `${product.slug} : l'épaisseur minimale (${mini} mm) devrait passer`
    );
    assert.ok(
      devisSurMesure(product, largeurMm, hauteurMm, maxMm).ok,
      `${product.slug} : l'épaisseur maximale devrait passer`
    );

    const tropFin = devisSurMesure(product, largeurMm, hauteurMm, mini - 1);
    assert.equal(tropFin.ok, false, `${product.slug} : plateau trop fin accepté`);

    const tropEpais = devisSurMesure(product, largeurMm, hauteurMm, maxMm + 1);
    assert.equal(tropEpais.ok, false, `${product.slug} : plateau trop épais accepté`);
    assert.equal(tropEpais.ok === false && tropEpais.reason, "epaisseur_hors_bornes");
  }
});

test("plus la pièce est longue, plus le plateau doit être épais", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    if (!bareme.epaisseur.miniParLongueur?.length) continue;

    let precedent = 0;
    for (const part of [0, 0.5, 1]) {
      const { largeurMm, hauteurMm } = cotesHorsCatalogue(bareme, part);
      const portee = Math.max(largeurMm, hauteurMm);
      const mini = epaisseurMiniMm(bareme, portee);

      // L'exigence ne redescend jamais quand la pièce s'allonge.
      assert.ok(
        mini >= precedent,
        `${product.slug} : à ${portee} mm on demande moins d'épaisseur qu'à une pièce plus courte`
      );
      precedent = mini;

      // Juste en dessous du mini : refusé, et avec une explication chiffrée.
      const refuse = devisSurMesure(product, largeurMm, hauteurMm, mini - 1);
      assert.equal(
        refuse.ok,
        false,
        `${product.slug} : ${mini - 1} mm accepté sur ${portee} mm de portée`
      );
      if (refuse.ok === false && refuse.reason === "epaisseur_trop_fine") {
        assert.equal(refuse.epaisseurMiniMm, mini);
      }
      // Pile au mini : accepté.
      assert.ok(
        devisSurMesure(product, largeurMm, hauteurMm, mini).ok,
        `${product.slug} : ${mini} mm refusé sur ${portee} mm de portée`
      );
    }
  }
});

test("toutes les tailles du catalogue restent fabricables à l'épaisseur de référence", () => {
  // Les paliers d'épaisseur ne doivent jamais interdire une pièce vendue au
  // catalogue : ce serait un prix affiché qu'on ne peut pas commander.
  for (const product of surMesurables) {
    for (const taille of product.sizes) {
      if (!taille.dimsMm) continue;
      const devis = devisSurMesure(product, taille.dimsMm[0], taille.dimsMm[1]);
      assert.ok(
        devis.ok,
        `${product.slug}/${taille.id} : une taille du catalogue est refusée en sur-mesure`
      );
    }
  }
});

test("tout refus de devis s'explique en français", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    const refus = [
      devisSurMesure(product, Number.NaN, 1000),
      devisSurMesure(product, bareme.minMm - 1, bareme.minMm),
      devisSurMesure(product, bareme.maxLargeurMm + 1, bareme.minMm),
      devisSurMesure(product, bareme.minMm, bareme.minMm, bareme.epaisseur.maxMm + 1),
    ];
    for (const devis of refus) {
      assert.equal(devis.ok, false);
      assert.ok(
        devis.ok === false && typeof devis.message === "string" && devis.message.trim().length > 0,
        `${product.slug} : un refus sans explication pour le client`
      );
    }
  }
});

test("des cotes qui ne sont pas des nombres sont refusées", () => {
  for (const product of surMesurables) {
    for (const cote of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const devis = devisSurMesure(product, cote, 1000);
      assert.equal(devis.ok, false, `${product.slug} : cote « ${cote} » acceptée`);
    }
    // Et la commande entière est refusée, pas seulement le devis.
    if (product.orderMode !== "cart") continue;
    const resolu = resolveSelection({
      ...optionsMoinsCheres(product),
      slug: product.slug,
      sizeId: SUR_MESURE,
      largeurMm: Number.NaN,
      hauteurMm: 1000,
    });
    assert.equal(resolu.ok, false);
  }
});

/* ---------------------------------------------------------------- *
 *  Le prix suit la matière : plus grand, plus épais, plus cher.
 * ---------------------------------------------------------------- */

test("le prix monte quand la pièce grandit", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    let precedent = 0;
    for (const part of [0, 0.25, 0.5, 0.75, 1]) {
      const { largeurMm, hauteurMm } = cotesHorsCatalogue(bareme, part);
      // Les tailles du catalogue ont leur propre tarif : elles casseraient la
      // courbe volontairement, on ne les fait pas entrer dans la comparaison.
      assert.equal(
        estUneCoteDuCatalogue(product, largeurMm, hauteurMm),
        false,
        `${product.slug} : cote de test tombée sur une taille du catalogue`
      );
      const devis = devisSurMesure(product, largeurMm, hauteurMm);
      assert.ok(devis.ok, `${product.slug} : ${largeurMm}×${hauteurMm} refusé`);
      if (precedent) {
        assert.ok(
          devis.prix > precedent,
          `${product.slug} : agrandir la pièce ne la rend pas plus chère (${precedent} € → ${devis.prix} €)`
        );
      }
      precedent = devis.prix;
    }
  }
});

test("le prix monte quand le plateau épaissit", () => {
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    const { refMm, parM2ParMm, parM2Bande } = bareme.epaisseur;
    // Une épaisseur se paie-t-elle sur ce produit ? Si aucun coefficient n'est
    // renseigné, le prix ne doit pas bouger — mais il ne doit jamais baisser.
    const facturee = (parM2ParMm ?? 0) > 0 || (parM2Bande ?? 0) > 0;
    const { largeurMm, hauteurMm } = cotesHorsCatalogue(bareme, 0.6);
    // Sur un caisson lumineux, la profondeur est bornée par la cote du panneau.
    const maxMm = epaisseurMaxMm(bareme, largeurMm, hauteurMm);
    // On part de l'épaisseur de référence, ou du minimum imposé par la portée
    // s'il est plus élevé.
    const depart = Math.max(refMm, epaisseurMiniMm(bareme, Math.max(largeurMm, hauteurMm)));

    let precedent = 0;
    for (const part of [0, 0.25, 0.5, 0.75, 1]) {
      const epaisseur = Math.round(depart + part * (maxMm - depart));
      const devis = devisSurMesure(product, largeurMm, hauteurMm, epaisseur);
      assert.ok(devis.ok, `${product.slug} : épaisseur ${epaisseur} mm refusée`);
      if (precedent) {
        if (facturee) {
          assert.ok(
            devis.prix > precedent,
            `${product.slug} : épaissir le plateau ne coûte rien (${precedent} € → ${devis.prix} €)`
          );
        } else {
          assert.ok(
            devis.prix >= precedent,
            `${product.slug} : épaissir le plateau fait BAISSER le prix`
          );
        }
      }
      precedent = devis.prix;
    }
  }
});

test("un plateau plus fin que la référence ne fait pas baisser la facture", () => {
  // Même piétement, mêmes usinages, même finition : un plateau plus fin ne
  // coûte pas moins cher à fabriquer, et une remise ferait passer une grande
  // table sur mesure sous le prix d'une plus petite du catalogue.
  for (const product of surMesurables) {
    const bareme = product.surMesure!;
    const { refMm } = bareme.epaisseur;
    const { largeurMm, hauteurMm } = cotesHorsCatalogue(bareme, 0.5);
    const mini = epaisseurMiniMm(bareme, Math.max(largeurMm, hauteurMm));
    if (mini >= refMm) continue; // Aucune épaisseur sous la référence ici.

    const reference = devisSurMesure(product, largeurMm, hauteurMm, refMm);
    assert.ok(reference.ok);
    for (const epaisseur of [mini, Math.round((mini + refMm) / 2)]) {
      const plusFin = devisSurMesure(product, largeurMm, hauteurMm, epaisseur);
      assert.ok(plusFin.ok, `${product.slug} : ${epaisseur} mm refusé`);
      assert.equal(
        plusFin.prix,
        reference.prix,
        `${product.slug} : un plateau de ${epaisseur} mm est facturé moins cher que ${refMm} mm`
      );
      assert.ok(Number.isInteger(plusFin.prix) && plusFin.prix > 0);
    }
  }
});

test("le prix montré sur mesure est bien celui qui sera facturé", () => {
  for (const product of surMesurables.filter((p) => p.orderMode === "cart")) {
    const bareme = product.surMesure!;
    const options = optionsMoinsCheres(product);
    for (const part of [0, 0.4, 1]) {
      const mesures = cotesHorsCatalogue(bareme, part);
      const mini = epaisseurMiniMm(bareme, Math.max(mesures.largeurMm, mesures.hauteurMm));
      const maxi = epaisseurMaxMm(bareme, mesures.largeurMm, mesures.hauteurMm);
      const epaisseurs = [mini, Math.max(mini, bareme.epaisseur.refMm), maxi];
      for (const epaisseur of epaisseurs) {
        const cotes = { ...mesures, epaisseurMm: epaisseur };
        // À cette hauteur, il faut un remplissage qui respecte la norme.
        const selection = {
          ...options,
          ...cotes,
          sizeId: SUR_MESURE,
          remplissageId: remplissagesPour(product, mesures.hauteurMm)[0],
        };

        const montre = computeUnitPrice(product, selection);
        const resolu = resolveSelection({ slug: product.slug, ...selection });
        assert.ok(resolu.ok, `${product.slug} ${JSON.stringify(cotes)} refusé`);
        assert.equal(
          montre,
          resolu.line.unitPrice,
          `${product.slug} ${JSON.stringify(cotes)} : prix affiché ≠ prix facturé`
        );
        assert.ok(Number.isInteger(resolu.line.unitPrice) && resolu.line.unitPrice > 0);
      }
    }
  }
});

test("quand les cotes sont refusées, les deux calculs se taisent ensemble", () => {
  for (const product of surMesurables.filter((p) => p.orderMode === "cart")) {
    const bareme = product.surMesure!;
    const options = optionsMoinsCheres(product);
    const impossibles = [
      { largeurMm: bareme.minMm - 1, hauteurMm: bareme.minMm },
      { largeurMm: bareme.maxLargeurMm + 1, hauteurMm: bareme.minMm },
      { largeurMm: bareme.minMm, hauteurMm: bareme.minMm, epaisseurMm: bareme.epaisseur.maxMm + 1 },
      { largeurMm: Number.NaN, hauteurMm: bareme.minMm },
    ];
    for (const cotes of impossibles) {
      const selection = { ...options, ...cotes, sizeId: SUR_MESURE };
      assert.equal(
        computeUnitPrice(product, selection),
        null,
        `${product.slug} ${JSON.stringify(cotes)} : un prix est affiché pour une pièce infabricable`
      );
      const resolu = resolveSelection({ slug: product.slug, ...selection });
      assert.equal(
        resolu.ok,
        false,
        `${product.slug} ${JSON.stringify(cotes)} : commande acceptée`
      );
    }
  }
});

test("on ne peut pas demander du sur-mesure sur une pièce qui n'en propose pas", () => {
  assert.ok(sansSurMesure, "il faut au moins un produit sans barème sur mesure");
  const devis = devisSurMesure(sansSurMesure!, 1000, 1000);
  assert.equal(devis.ok, false);
  assert.equal(devis.ok === false && devis.reason, "pas_sur_mesure");

  const resolu = resolveSelection({
    ...optionsMoinsCheres(sansSurMesure!),
    slug: sansSurMesure!.slug,
    sizeId: SUR_MESURE,
    largeurMm: 1000,
    hauteurMm: 1000,
  });
  assert.equal(resolu.ok, false, "du sur-mesure accepté sur une pièce standard");
  assert.equal(resolu.ok === false && resolu.reason, "unknown_size");
});

test("un rond ne se commande qu'au diamètre : la seconde cote est ignorée", () => {
  for (const product of surMesurables.filter((p) => p.surMesure!.forme === "rond")) {
    const bareme = product.surMesure!;
    const diametre = Math.round((bareme.minMm + bareme.maxLargeurMm) / 2);
    const a = devisSurMesure(product, diametre, 10);
    const b = devisSurMesure(product, diametre, 9_999);
    assert.ok(a.ok && b.ok, `${product.slug} : le diamètre seul devrait suffire`);
    assert.equal(a.prix, b.prix, `${product.slug} : la seconde cote change le prix d'un rond`);
  }
});

test("aucun produit du catalogue n'oublie de dire ce qu'il sait fabriquer", () => {
  for (const product of achetables) {
    if (!product.surMesure) continue;
    const b = product.surMesure;
    assert.ok(b.minMm > 0, `${product.slug} : cote minimale absurde`);
    assert.ok(b.maxLargeurMm >= b.minMm, `${product.slug} : largeur maximale sous le minimum`);
    assert.ok(b.maxHauteurMm >= b.minMm, `${product.slug} : hauteur maximale sous le minimum`);
    assert.ok(
      b.epaisseur.minMm <= b.epaisseur.refMm && b.epaisseur.refMm <= b.epaisseur.maxMm,
      `${product.slug} : l'épaisseur de référence est hors de ses propres bornes`
    );
    assert.ok(b.forfait >= 0 && b.parM2 > 0, `${product.slug} : barème incohérent`);
  }
});
