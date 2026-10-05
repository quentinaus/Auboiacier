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
import { readFileSync } from "node:fs";

import {
  ALLEGE_SANS_OBLIGATION_MM,
  BARRE_APPUI_MM,
  BORNES_RELEVE_GC,
  ESSENCES_GC,
  JOUR_GC_MM,
  JOUR_MINI_GC_MM,
  MARGE_BOULE_GC_MM,
  MAINS_COURANTES_GC,
  MAIN_COURANTE_MM,
  MINI_GC_MM,
  RELEVE_DEPART_GC,
  diametreRosaceGC,
  formeGC,
  lireReponsePrixGC,
  modeleAfficheGC,
  parametresPrixGC,
  releveDansLesBornes,
  type ReleveGC,
} from "../src/lib/garde-corps.ts";
import { ALLEGE_LIBRE, BARRE_APPUI, BORNES_GC, CIBLE_MARGE, DEFAUTS_GC, HAUT_ETAGE, MARGE_BOULE, MINI_GC, geomGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
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
import { valeursGC } from "../src/lib/garde-corps-outil/entree.ts";
import { computeUnitPrice, essenceDeReference, getProduct, priceFrom, prixParOutil, resolveSelection, SUR_MESURE, supplementRemplissage } from "../src/lib/products.ts";

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
  assert.equal(MAIN_COURANTE_MM, HAUT_ETAGE + CIBLE_MARGE, "la hauteur de la main courante, depuis le sol");
  assert.equal(MINI_GC_MM, MINI_GC, "le plus petit garde-corps à croix");
  assert.equal(MARGE_BOULE_GC_MM, MARGE_BOULE, "la marge de sécurité sur la boule de la norme");
  assert.equal(BARRE_APPUI_MM, BARRE_APPUI, "l'épaisseur d'une barre d'appui");
  // Le garde-corps de départ (le « à partir de ») est le plus petit qui se vend : le premier cadre bas à barreaux, là où même un jour de 40 ne laisse plus la place à des croix.
  assert.equal(RELEVE_DEPART_GC.allegeMm, MAIN_COURANTE_MM - JOUR_MINI_GC_MM - MINI_GC_MM + 1);
  assert.deepEqual(
    { largeurMm: { ...BORNES_RELEVE_GC.largeurMm }, allegeMm: { ...BORNES_RELEVE_GC.allegeMm }, fenetreMm: { ...BORNES_RELEVE_GC.fenetreMm } },
    { largeurMm: { ...BORNES_GC.B }, allegeMm: { ...BORNES_GC.A }, fenetreMm: { ...BORNES_GC.Hf } }
  );
  // La main courante du catalogue : les quatre bois de l'outil, plus l'acier (plat soudé, profilé).
  assert.deepEqual([...MAINS_COURANTES_GC].sort(), gc.woods.map((w) => w.id).sort(), "les mains courantes du catalogue sont celles de l'outil");
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
  for (const allegeMm of [0, 250, 650, 733, 735]) {
    const etage = config({ allegeMm });
    const rdc = config({ allegeMm, enEtage: false });
    // La règle de l'outil ne dépend pas de l'étage : la même hauteur partout.
    assert.equal(rdc.hauteurMm, etage.hauteurMm, `allège ${allegeMm}`);
    assert.equal(etage.jourMm, JOUR_GC_MM);
    assert.equal(etage.mainCouranteMm, allegeMm + JOUR_GC_MM + etage.hauteurMm);
    // LA MAIN COURANTE NE BOUGE JAMAIS (04/10) : pile à la hauteur de la norme, au millimètre, en étage comme au rez-de-chaussée.
    assert.equal(etage.mainCouranteMm, MAIN_COURANTE_MM, `allège ${allegeMm}`);
    assert.equal(rdc.mainCouranteMm, MAIN_COURANTE_MM, `allège ${allegeMm}, rez-de-chaussée`);
    // Le plus petit garde-corps de l'outil (200), plus les 350 mm du modèle en photo.
    if (allegeMm === 735) assert.equal(etage.hauteurMm, MINI_GC);
    // Seul l'étage sous 900 mm d'allège est « obligatoire » (la loi) : c'est ce que dit le devis.
    assert.equal(etage.obligatoire, allegeMm < ALLEGE_LIBRE);
    assert.equal(rdc.obligatoire, false);
  }
});

test("le croquis suit le curseur sans le serveur : formeGC est la règle du moteur, à chaque millimètre", () => {
  for (let allegeMm = BORNES_GC.A.min; allegeMm <= BORNES_GC.A.max; allegeMm++) {
    // Le cadre le plus bas (barreaux seuls, 120 mm) fixe la limite du croquis : tant que des croix tiennent, c'est leur cadre
    // (jour réduit jusqu'à 40) qu'on dessine ; au-dessus, le cadre à barreaux seuls (son propre minimum, son propre jour).
    const entreeAllege = { ...releve({ allegeMm }), essence: "chene" as const };
    const vCroix = valeursGC(DEFAUTS_GC, entreeAllege, 16, 1);
    const vSeuls = valeursGC(DEFAUTS_GC, entreeAllege, 16, 1, false, false, false, true);
    const v = geomGC(vCroix, 1).appui === null ? vCroix : vSeuls;
    const g = geomGC(v, 1);
    const f = formeGC(allegeMm);
    assert.equal(f.mode, g.appui === "barre" ? "barre" : g.appui === "rien" ? "aucun" : "garde-corps", `bas de fenêtre à ${allegeMm}`);
    if (f.mode === "garde-corps") {
      assert.equal(f.hauteurMm, g.Hr, `bas de fenêtre à ${allegeMm} : la hauteur du moteur`);
      assert.equal(f.jourMm, v.jour);
      assert.equal(allegeMm + f.jourMm + f.hauteurMm, MAIN_COURANTE_MM, "la main courante ne bouge pas");
    }
    if (f.mode === "barre") assert.equal(allegeMm + f.jourMm + f.hauteurMm, MAIN_COURANTE_MM, "la barre d'appui est à la hauteur de la norme");
  }
  // Ce que le serveur répond pour une barre d'appui, c'est ce que le croquis dessine.
  chiffrageOuEchec();
  const barre = configurationGC(releve({ allegeMm: 900 }), "chene")!;
  assert.deepEqual([barre.hauteurMm, barre.jourMm], [formeGC(900).hauteurMm, formeGC(900).jourMm]);
  // Et pour un garde-corps bas : sa hauteur et son jour.
  const bas = configurationGC(releve({ allegeMm: 840 }), "chene")!;
  assert.deepEqual([bas.hauteurMm, bas.jourMm], [formeGC(840).hauteurMm, formeGC(840).jourMm]);
});

test("la main courante ne bouge jamais : un bas de fenêtre haut donne une barre d'appui, jamais un garde-corps qui dépasse", () => {
  chiffrageOuEchec();
  const cas = (allegeMm: number, enEtage = true) => configurationGC(releve({ allegeMm, enEtage }), "chene")!;
  // Il manque moins que le plus petit cadre (120 mm, barreaux seuls) : une main courante seule, sur devis, à la hauteur de la norme.
  for (const allegeMm of [866, 899, 900, 985]) {
    for (const enEtage of [true, false]) {
      const c = cas(allegeMm, enEtage);
      assert.equal(c.ok, false, `allège ${allegeMm}`);
      assert.equal(!c.ok && c.raison, "barre-appui", `allège ${allegeMm}`);
      assert.equal(c.mainCouranteMm, MAIN_COURANTE_MM);
      assert.equal(c.hauteurMm, BARRE_APPUI_MM);
      assert.deepEqual(prixReleveOutil({ ...releve({ allegeMm, enEtage }), essence: "chene" }), { ok: false, raison: "a-etudier" }, "pas de prix automatique");
      const route = reponsePrixGC({ releve: releve({ allegeMm, enEtage }), essence: "chene", quantite: 1 });
      assert.ok(route && !route.ok && route.raison === "barre-appui" && route.modeles.length === 0, "aucun modèle à croix proposé");
    }
  }
  // Le bas de la fenêtre est déjà à la hauteur de la norme : rien à poser.
  for (const allegeMm of [986, 1025, 1200]) {
    const c = cas(allegeMm);
    assert.equal(!c.ok && c.raison, "sans-garde-corps", `allège ${allegeMm}`);
  }
  // Juste avant : le plus petit garde-corps, avec un prix.
  assert.equal(cas(735).ok, true);
  // « Jamais rien qui ne soit pas aux normes, mais toujours quelque chose » (Quentin, 05/10/2026) : de 736 à 785 mm, des croix
  // avec un jour réduit (jamais sous 40 mm) ; de 786 à 865 mm, un cadre bas à barreaux seuls. Même au rez-de-chaussée.
  for (const allegeMm of [736, 760, 785]) {
    for (const enEtage of [true, false]) {
      const c = cas(allegeMm, enEtage);
      assert.ok(c.ok && !c.seuls, `allège ${allegeMm} : des croix`);
      assert.equal(c.mainCouranteMm, MAIN_COURANTE_MM);
      assert.equal(c.jourMm, MAIN_COURANTE_MM - allegeMm - c.hauteurMm, `allège ${allegeMm} : le jour qui reste`);
      assert.ok(c.jourMm >= 40 && c.jourMm < 110, `allège ${allegeMm} : jour de ${c.jourMm}`);
    }
  }
  assert.equal(cas(760).jourMm, 65, "à 760 mm : un garde-corps de 200 mm, posé à 65 mm au-dessus de l'appui");
  for (const allegeMm of [786, 800, 840, 865]) {
    const c = cas(allegeMm);
    assert.ok(c.ok && c.seuls, `allège ${allegeMm} : un cadre bas à barreaux`);
    assert.equal(c.mainCouranteMm, MAIN_COURANTE_MM);
    assert.ok(c.hauteurMm >= 120 && c.hauteurMm < 200, `allège ${allegeMm} : hauteur ${c.hauteurMm}`);
    assert.deepEqual(c.R.alertes, [], `allège ${allegeMm} : rien qui ne soit pas aux normes`);
    const route = reponsePrixGC({ releve: releve({ allegeMm }), essence: "chene", quantite: 1 });
    assert.ok(route && route.ok && route.modeles.length === 1 && route.modeles[0].seuls, `allège ${allegeMm} : le catalogue ne montre que ce cadre`);
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
  for (const r of [releve(), releve({ largeurMm: 800, allegeMm: 720 }), releve({ largeurMm: 1500, allegeMm: 300 })]) {
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
        // Le diamètre de la rosace compte pour la norme : avec une autre rosace, le dessin retenu peut changer.
        const cF = configurationGC(r, essence, diametreRosaceGC(fabric.id));
        if (!cF?.ok) { assert.equal(avec.ok, false, `rosace ${fabric.id} : pas de modèle aux normes`); continue; }
        assert.ok(avec.ok);
        assert.equal(avec.line.unitPrice, prixGC(cF) + (fabric.priceDelta ?? 0), `rosace ${fabric.id}`);
        if (diametreRosaceGC(fabric.id) === 100) assert.equal(prixGC(cF), prixGC(c), `rosace ${fabric.id} : même diamètre que la fleur, même dessin`);
      }
      for (const metal of gc.metals) {
        const avec = ligneGC(r, { woodId: essence, ...MODELE, metalId: metal.id });
        assert.ok(avec.ok);
        assert.equal(avec.line.unitPrice, prixGC(c) + (metal.priceDelta ?? 0), `teinte ${metal.id}`);
      }
      const verre = gc.remplissages!.find((x) => x.sansCroix)!;
      const sousVerre = ligneGC(r, { woodId: essence, ...MODELE, remplissageId: verre.id, fabricId: "fonte" });
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
      // Le dessin affiché (sans choix : le moins cher à croix), tel que le client le met au panier.
      const modeleGc = route?.ok ? modeleAfficheGC(route) : undefined;
      const serveur = resolveSelection({ slug: gc.slug, sizeId: SUR_MESURE, ...r, modeleGc, woodId: "hetre", ...options }, prixReleveOutil);
      assert.ok(route?.ok && serveur.ok);
      assert.equal(route.prix, serveur.line.unitPrice);
      assert.equal(route.hauteurMm, serveur.line.gc?.hauteurMm);
      // Et la hauteur que le client a vue est vérifiée à la commande : une autre est refusée.
      const autreHauteur = resolveSelection({ slug: gc.slug, sizeId: SUR_MESURE, ...r, modeleGc, hauteurMm: route.hauteurMm + 10, woodId: "hetre", ...options }, prixReleveOutil);
      assert.equal(autreHauteur.ok === false && autreHauteur.reason, "hauteur");
    }
  }
});

test("à étudier avec l'atelier : pas de prix, pas de commande", () => {
  chiffrageOuEchec();
  // (Jusqu'à 2 400 mm de cadre, une fenêtre large se vend avec le fer plat de renfort : au-delà, à étudier.)
  for (const r of [releve({ largeurMm: 3000, allegeMm: 0 }), releve({ largeurMm: 2800, allegeMm: 300 }), releve({ allegeMm: 300, fenetreMm: 500 })]) {
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
  const autre = config({ largeurMm: 800, allegeMm: 720 }, "pin");
  assert.ok(prixCommandeGC([{ config: c, quantite: 1 }, { config: autre, quantite: 1 }]).remise < 0);
  const route = reponsePrixGC({ releve: releve(), essence: "chene", quantite: 3 });
  // (La route montre, sans choix, le moins cher à croix : sa remise est celle de CE dessin.)
  assert.ok(route?.ok && route.remise === prixCommandeGC([{ config: config({ modele: modeleAfficheGC(route) }), quantite: 3 }]).remise);
});

test("le « à partir de » est le prix du plus petit garde-corps, et aucun ne coûte moins", () => {
  chiffrageOuEchec();
  const depart = prixDepart(gc);
  assert.ok(depart !== null && Number.isInteger(depart) && depart > 0);
  // (Au relevé de départ, le bois sur fer plat est trop haut pour le cadre : seules les mains courantes qui conviennent comptent.)
  const moinsCher = Math.min(...MAINS_COURANTES_GC.flatMap((e) => { const c = configurationGC(RELEVE_DEPART_GC, e); return c?.ok ? [prixGC(c)] : []; }));
  assert.equal(depart, moinsCher);
  for (const largeurMm of [300, 450, 800, 1180, 1500]) {
    for (const allegeMm of [0, 300, 650, 735, 786, 800, 865, 900, 1200]) {
      for (const essence of MAINS_COURANTES_GC) {
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

test("la fiche démarre sur le chêne de la photo, et appelle le bois « main courante »", () => {
  // Toutes les essences sont à 0 € au catalogue (l'outil chiffre le bois) : la « première sans supplément » serait le pin.
  assert.equal(essenceDeReference(gc)?.id, "chene");
  assert.equal(gc.woods[0].id, "pin", "si le pin n'est plus le premier, ce test ne prouve plus rien");
  // La galerie (product-view) et les options (product-options) partent de la même essence : celle de référence.
  for (const fichier of ["product-view.tsx", "product-options.tsx"]) {
    const source = readFileSync(new URL(`../src/components/${fichier}`, import.meta.url), "utf8");
    assert.match(source, /useState\(\s*essenceDeReference\(product\)\?\.id \?\? ""/, `${fichier} : l'essence de départ`);
    assert.doesNotMatch(source, /woods\.find\(\(w\) => !w\.priceDelta\)/, `${fichier} : l'ancienne règle (le pin pour le garde-corps)`);
  }
  // Le pin et le chêne n'ont pas le même prix : démarrer sur le mauvais montrait un prix qui n'était pas celui de la photo.
  chiffrageOuEchec();
  // (Sur un grand garde-corps : sur un petit, l'écart de bois disparaît dans l'arrondi à la dizaine. Depuis le prix
  // d'appel du 05/10/2026 — plus de frais d'atelier —, 800 × 300 tombe à la même dizaine : on prend 1 200 × 300.)
  const grand = releve({ largeurMm: 1200, allegeMm: 300 });
  const chene = reponsePrixGC({ releve: grand, essence: "chene", quantite: 1 });
  // (Le même dessin pour les deux bois : seul le bois change.)
  const pin = reponsePrixGC({ releve: chene?.ok ? { ...grand, modele: modeleAfficheGC(chene) } : grand, essence: "pin", quantite: 1 });
  assert.ok(chene?.ok && pin?.ok && chene.prix !== pin.prix);
  // Un garde-corps n'a pas de plateau.
  assert.deepEqual(gc.woodLabel, { fr: "Main courante", en: "Handrail" });
});

test("une option absente est celle du modèle, partout : prix, devis, aperçu de la livraison", () => {
  chiffrageOuEchec();
  const sans = ligneGC(releve(), { woodId: "chene" });
  const avec = ligneGC(releve(), { woodId: "chene", ...MODELE });
  assert.ok(sans.ok && avec.ok);
  assert.deepEqual([sans.line.metal?.id, sans.line.fabric?.id, sans.line.remplissage?.id], [MODELE.metalId, MODELE.fabricId, MODELE.remplissageId]);
  assert.equal(sans.line.unitPrice, avec.line.unitPrice);
  // Une option inconnue reste refusée : jamais remplacée en silence.
  const inconnue = ligneGC(releve(), { woodId: "chene", metalId: "or" });
  assert.equal(inconnue.ok === false && inconnue.reason, "unknown_metal");
  assert.equal(reponsePrixGC({ releve: releve(), essence: "chene", quantite: 1 })?.ok, true);
});

test("les mots de la fiche disent ce qui se passe vraiment (devis, livraison)", () => {
  const route = readFileSync(new URL("../src/app/api/devis-pdf/route.ts", import.meta.url), "utf8");
  // Le devis PDF s'ouvre dans un onglet : la route n'envoie aucun e-mail…
  assert.doesNotMatch(route, /sendEmail|@\/lib\/email/);
  for (const langue of ["fr", "en"]) {
    const t = JSON.parse(readFileSync(new URL(`../src/app/[lang]/dictionaries/${langue}.json`, import.meta.url), "utf8")).artisanat;
    // … donc la fenêtre des coordonnées ne le promet pas.
    assert.doesNotMatch(t.coordonneesNote, /e-?mail|envoy|sent/i, `${langue} : coordonneesNote promet un envoi`);
    // Sous le prix : le montant de la livraison compté dedans, pas « livraison incluse » (lu « gratuite »).
    for (const cle of ["livraisonIncluse", "poseIncluse"]) {
      assert.match(t[cle], /\{prix\}/, `${langue} : ${cle} sans montant`);
      assert.doesNotMatch(t[cle], /inclus|included|offert|free|gratuit/i, `${langue} : ${cle}`);
    }
  }
  const options = readFileSync(new URL("../src/components/product-options.tsx", import.meta.url), "utf8");
  assert.match(options, /\(pose\.mode === "pose" \? t\.poseIncluse : t\.livraisonIncluse\)\.replace\(\s*"\{prix\}",\s*prixAffiche\(montantLivraisonChoisie \?\? 0, locale\)/);
});
