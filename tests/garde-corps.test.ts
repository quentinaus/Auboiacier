/**
 * Le garde-corps de fenêtre, tel que le site le vend depuis les décisions de
 * Quentin du 29/09 : les RÈGLES de l'outil de plans (hauteur à la norme,
 * croix, barreaux en bas, solidité), son PRIX, une remise de plusieurs
 * garde-corps qui ne passe jamais sous le plancher, et les suppléments des
 * options que l'outil ne chiffre pas encore (rosace, teinte, verre).
 *
 * Les règles de l'outil elles-mêmes sont vérifiées dans prix-garde-corps.test.ts
 * (sans montant figé) et garde-corps-outil.test.ts (égalité avec l'outil). Ici :
 * ce que le site en fait, et ce qu'il ne fait plus (350 mm minimum, 80 cm au
 * rez-de-chaussée, jour de 100, croix limitées à 450 mm, lot −10 %).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALLEGE_SANS_OBLIGATION_MM,
  BORNES_RELEVE_GC,
  ESSENCES_GC,
  JOUR_GC_MM,
  RELEVE_DEPART_GC,
  lireReponsePrixGC,
  parametresPrixGC,
  releveDansLesBornes,
  type ReleveGC,
} from "../src/lib/garde-corps.ts";
import { ALLEGE_LIBRE, BORNES_GC, DEFAUTS_GC, MINI_GC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { prixCommandeGC, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import {
  configurationGC,
  fourchetteGC,
  ligneGC,
  lireRequetePrixGC,
  prixDepart,
  prixReleveOutil,
  reponsePrixGC,
} from "../src/lib/garde-corps-outil/site.ts";
import { computeUnitPrice, getProduct, priceFrom, prixParOutil, resolveSelection, SUR_MESURE, supplementRemplissage } from "../src/lib/products.ts";

const gc = getProduct("garde-corps")!;
const MODELE = { metalId: "noir", fabricId: "fleur", remplissageId: "croix" };
const releve = (r: Partial<ReleveGC> = {}): ReleveGC => ({ largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, ...r });

function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}
function config(r: Partial<ReleveGC> = {}, essence = "chene"): ConfigGC {
  const c = configurationGC(releve(r), essence);
  assert.ok(c?.ok, `${JSON.stringify(r)} devrait passer la norme`);
  return c;
}

test("les constantes du site sont celles de l'outil de plans", () => {
  assert.equal(JOUR_GC_MM, DEFAUTS_GC.jour, "le jour sous le cadre");
  assert.equal(ALLEGE_SANS_OBLIGATION_MM, ALLEGE_LIBRE);
  assert.deepEqual(
    { largeurMm: { ...BORNES_RELEVE_GC.largeurMm }, allegeMm: { ...BORNES_RELEVE_GC.allegeMm }, fenetreMm: { ...BORNES_RELEVE_GC.fenetreMm } },
    { largeurMm: { ...BORNES_GC.B }, allegeMm: { ...BORNES_GC.A }, fenetreMm: { ...BORNES_GC.Hf } }
  );
  assert.deepEqual([...ESSENCES_GC].sort(), gc.woods.map((w) => w.id).sort(), "les essences du catalogue sont celles de l'outil");
});

test("le garde-corps se chiffre sur le serveur seulement : le catalogue public n'en donne aucun prix", () => {
  assert.ok(prixParOutil(gc));
  assert.equal(gc.surMesure, undefined, "plus de barème au m² : le prix vient de l'outil");
  const selection = { sizeId: SUR_MESURE, largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, woodId: "chene", ...MODELE };
  assert.equal(computeUnitPrice(gc, selection), null);
  assert.equal(priceFrom(gc), null);
  const sansServeur = resolveSelection({ slug: gc.slug, ...selection });
  assert.equal(sansServeur.ok === false && sansServeur.reason, "prix_serveur");
  // L'essence n'a plus d'écart fixe au catalogue (l'outil la chiffre à son volume) ; le chêne reste celui d'entrée.
  assert.ok(gc.woods.every((w) => !w.priceDelta));
  assert.equal(gc.boisParDefaut, "chene");
  // Plus de prix de lot à −10 % : la remise vient des frais fixes de l'atelier.
  assert.equal((gc as { remiseLot?: unknown }).remiseLot, undefined);
});

test("la hauteur est celle de l'outil : plus de 350 mm imposés, ni de 80 cm au rez-de-chaussée, ni de jour de 100", () => {
  chiffrageOuEchec();
  for (const allegeMm of [0, 250, 650, 800, 950, 1200]) {
    const etage = config({ allegeMm });
    const rdc = config({ allegeMm, enEtage: false });
    // La règle de l'outil ne dépend pas de l'étage : la même hauteur partout.
    assert.equal(rdc.hauteurMm, etage.hauteurMm, `allège ${allegeMm}`);
    assert.equal(etage.jourMm, JOUR_GC_MM);
    assert.equal(etage.mainCouranteMm, allegeMm + JOUR_GC_MM + etage.hauteurMm);
    // Une allège haute : la hauteur minimale de l'outil (200), plus les 350 mm du modèle en photo.
    if (allegeMm >= 950) assert.equal(etage.hauteurMm, MINI_GC);
    // Seul l'étage sous 900 mm d'allège est « obligatoire » (la loi) : c'est ce que dit le devis.
    assert.equal(etage.obligatoire, allegeMm < ALLEGE_LIBRE);
    assert.equal(rdc.obligatoire, false);
  }
});

test("les croix ne sont plus limitées à 450 mm : l'outil en met autant qu'il faut", () => {
  chiffrageOuEchec();
  // Une fenêtre au ras du sol : un garde-corps de près d'un mètre, en croix, conforme.
  const haut = config({ allegeMm: 0 });
  assert.ok(haut.hauteurMm > 450);
  assert.ok(haut.croix >= 1);
  const ligne = ligneGC(releve({ allegeMm: 0 }), { woodId: "chene", ...MODELE });
  assert.ok(ligne.ok, "vendu en croix, sans passer par le verre");
  assert.ok(ligne.line.optionsLabel.includes(`${haut.croix} croix`), ligne.line.optionsLabel);
  // Le modèle de la photo (1 180 mm, allège 650) : 4 croix pour la norme, pas 2.
  assert.equal(config().croix, 4);
});

test("le prix du site est le prix de l'outil, plus les suppléments des options du site", () => {
  chiffrageOuEchec();
  for (const r of [releve(), releve({ largeurMm: 800, allegeMm: 950 }), releve({ largeurMm: 1500, allegeMm: 300 })]) {
    for (const essence of ESSENCES_GC) {
      const c = configurationGC(r, essence);
      if (!c?.ok) continue;
      const modele = ligneGC(r, { woodId: essence, ...MODELE });
      assert.ok(modele.ok);
      assert.equal(modele.line.unitPrice, prixGC(c), "options du modèle : exactement l'outil");
      assert.equal(modele.line.gc?.prixOutil, prixGC(c));
      assert.deepEqual(modele.line.size.dimsMm, [r.largeurMm, c.hauteurMm]);
      for (const fabric of gc.fabrics!) {
        const avec = ligneGC(r, { woodId: essence, ...MODELE, fabricId: fabric.id });
        assert.ok(avec.ok);
        assert.equal(avec.line.unitPrice, prixGC(c) + (fabric.priceDelta ?? 0), `rosace ${fabric.id}`);
      }
      for (const metal of gc.metals) {
        const avec = ligneGC(r, { woodId: essence, ...MODELE, metalId: metal.id });
        assert.ok(avec.ok);
        assert.equal(avec.line.unitPrice, prixGC(c) + (metal.priceDelta ?? 0), `teinte ${metal.id}`);
      }
      const verre = gc.remplissages!.find((x) => x.sansCroix)!;
      const sousVerre = ligneGC(r, { woodId: essence, ...MODELE, remplissageId: verre.id, fabricId: "medaillon" });
      assert.ok(sousVerre.ok);
      assert.equal(sousVerre.line.unitPrice, prixGC(c) + supplementRemplissage(verre, r.largeurMm, c.hauteurMm), "le verre, et pas de rosace à payer");
    }
  }
});

test("le prix encaissé est le prix affiché : la route, le panier et la commande font le même calcul", () => {
  chiffrageOuEchec();
  for (const r of [releve(), releve({ largeurMm: 450, allegeMm: 0, fenetreMm: 1600 }), releve({ enEtage: false, allegeMm: 300 })]) {
    for (const options of [MODELE, { metalId: "brut", fabricId: "acier", remplissageId: "croix" }, { metalId: "blanc", fabricId: "fleur", remplissageId: "verre" }]) {
      const route = reponsePrixGC({ releve: r, essence: "hetre", ...options, quantite: 1 });
      const serveur = resolveSelection({ slug: gc.slug, sizeId: SUR_MESURE, ...r, woodId: "hetre", ...options }, prixReleveOutil);
      assert.ok(route?.ok && serveur.ok);
      assert.equal(route.prix, serveur.line.unitPrice);
      assert.equal(route.hauteurMm, serveur.line.gc?.hauteurMm);
      // Et la hauteur que le client a vue est vérifiée à la commande : une autre est refusée.
      const autreHauteur = resolveSelection({ slug: gc.slug, sizeId: SUR_MESURE, ...r, hauteurMm: route.hauteurMm + 10, woodId: "hetre", ...options }, prixReleveOutil);
      assert.equal(autreHauteur.ok === false && autreHauteur.reason, "hauteur");
    }
  }
});

test("à étudier avec l'atelier : pas de prix, pas de commande", () => {
  chiffrageOuEchec();
  for (const r of [releve({ largeurMm: 3000, allegeMm: 0 }), releve({ largeurMm: 1700 }), releve({ allegeMm: 300, fenetreMm: 500 })]) {
    const reponse = reponsePrixGC({ releve: r, essence: "chene", quantite: 1 });
    assert.ok(reponse && !reponse.ok, JSON.stringify(r));
    assert.ok(!("prix" in reponse), "aucun prix pour un garde-corps à étudier");
    const commande = resolveSelection({ slug: gc.slug, sizeId: SUR_MESURE, ...r, woodId: "chene", ...MODELE }, prixReleveOutil);
    assert.equal(commande.ok === false && commande.reason, "a_etudier");
  }
  // Hors des bornes des champs de l'outil : refusé avant tout calcul.
  const etroit = resolveSelection({ slug: gc.slug, sizeId: SUR_MESURE, ...releve({ largeurMm: 250 }), woodId: "chene", ...MODELE }, prixReleveOutil);
  assert.equal(etroit.ok === false && etroit.reason, "unknown_size");
  assert.equal(releveDansLesBornes(releve({ largeurMm: 250 })), false);
  assert.equal(releveDansLesBornes(releve({ allegeMm: 1300 })), false);
  assert.equal(releveDansLesBornes(releve()), true);
});

test("un relevé forgé ou incomplet ne se commande pas", () => {
  chiffrageOuEchec();
  const base = { slug: gc.slug, sizeId: SUR_MESURE, largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, woodId: "chene", ...MODELE };
  const refus = (selection: Record<string, unknown>) => {
    const r = resolveSelection(selection as never, prixReleveOutil);
    return r.ok ? null : r.reason;
  };
  assert.equal(refus(base), null);
  assert.equal(refus({ ...base, allegeMm: undefined }), "unknown_size");
  assert.equal(refus({ ...base, enEtage: "1" }), "unknown_size");
  assert.equal(refus({ ...base, largeurMm: 1180.5 }), "unknown_size");
  assert.equal(refus({ ...base, sizeId: "p8" }), "unknown_size");
  assert.equal(refus({ ...base, woodId: "teck" }), "unknown_wood");
  assert.equal(refus({ ...base, woodId: undefined }), "unknown_wood");
  assert.equal(refus({ ...base, metalId: "or" }), "unknown_metal");
  assert.equal(refus({ ...base, fabricId: "inventee" }), "unknown_fabric");
  assert.equal(refus({ ...base, remplissageId: "barreaux" }), "unknown_remplissage");
  assert.equal(refus({ ...base, remplissageId: undefined }), "unknown_remplissage");
});

test("plusieurs garde-corps : une remise, jamais sous le plancher, et une seule pièce se paie plein tarif", () => {
  chiffrageOuEchec();
  const c = config();
  assert.equal(prixCommandeGC([{ config: c, quantite: 1 }]).remise, 0);
  for (const quantite of [2, 3, 10]) {
    const r = prixCommandeGC([{ config: c, quantite }]);
    assert.ok(r.remise < 0, `${quantite} garde-corps : une vraie remise (frais fixes comptés une fois)`);
    assert.equal(Math.abs(r.remise) % 10, 0, "une remise en dizaines d'euros");
    assert.equal(r.prix, quantite * prixGC(c) + r.remise);
  }
  // À des cotes différentes aussi, et la route donne la même pour la quantité demandée.
  const autre = config({ largeurMm: 800, allegeMm: 950 }, "pin");
  assert.ok(prixCommandeGC([{ config: c, quantite: 1 }, { config: autre, quantite: 1 }]).remise < 0);
  const route = reponsePrixGC({ releve: releve(), essence: "chene", quantite: 3 });
  assert.ok(route?.ok && route.remise === prixCommandeGC([{ config: c, quantite: 3 }]).remise);
});

test("le « à partir de » est le prix du plus petit garde-corps, et aucun ne coûte moins", () => {
  chiffrageOuEchec();
  const depart = prixDepart(gc);
  assert.ok(depart !== null && Number.isInteger(depart) && depart > 0);
  const moinsCher = Math.min(...ESSENCES_GC.map((e) => prixGC(configurationGC(RELEVE_DEPART_GC, e) as ConfigGC)));
  assert.equal(depart, moinsCher);
  for (const largeurMm of [300, 450, 800, 1180, 1500]) {
    for (const allegeMm of [0, 300, 650, 900, 1200]) {
      for (const essence of ESSENCES_GC) {
        const c = configurationGC(releve({ largeurMm, allegeMm }), essence);
        if (c?.ok) assert.ok(prixGC(c) >= depart, `${largeurMm} × allège ${allegeMm} en ${essence} : ${prixGC(c)} € sous le « à partir de » ${depart} €`);
      }
    }
  }
  const fourchette = fourchetteGC();
  assert.ok(fourchette && fourchette.prixMin === depart && fourchette.prixMax > fourchette.prixMin);
  // Le prix de départ d'une autre pièce reste celui du catalogue.
  const table = getProduct("table-mikado")!;
  assert.equal(prixDepart(table), priceFrom(table));
});

test("la réponse de la route se relit dans le navigateur, et rien d'autre", () => {
  chiffrageOuEchec();
  for (const r of [releve(), releve({ largeurMm: 1700 }), releve({ allegeMm: 300, fenetreMm: 500 })]) {
    const reponse = reponsePrixGC({ releve: r, essence: "noyer", quantite: 2 });
    assert.ok(reponse);
    // Telle que le réseau la transporte : du JSON.
    assert.deepEqual(lireReponsePrixGC(JSON.parse(JSON.stringify(reponse))), reponse);
  }
  const ok = reponsePrixGC({ releve: releve(), essence: "noyer", quantite: 1 })!;
  for (const faux of [null, "texte", {}, { ...ok, prix: "570" }, { ...ok, prix: -1 }, { ...ok, remise: 10 }, { ...ok, ok: "oui" }, { ...ok, hauteurMm: 0 }]) {
    assert.equal(lireReponsePrixGC(faux), null, JSON.stringify(faux));
  }
});

test("l'adresse que la fiche fabrique est celle que la route sait lire", () => {
  for (const r of [releve(), releve({ enEtage: false, fenetreMm: 1400 })]) {
    for (const quantite of [1, 4]) {
      const p = parametresPrixGC(r, { woodId: "pin", metalId: "brut", fabricId: "fonte", remplissageId: "verre", quantite });
      assert.deepEqual(lireRequetePrixGC(p), { releve: r, essence: "pin", metalId: "brut", fabricId: "fonte", remplissageId: "verre", quantite });
    }
  }
});
