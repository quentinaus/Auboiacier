/**
 * Le tarif du panier (src/lib/tarif-panier.ts) : LA fonction qui dit ce que
 * Stripe encaissera (/api/commande) et ce que le panier affiche
 * (/api/panier/tarif). Si elle se trompe, les deux se trompent ensemble —
 * mais elles ne peuvent plus diverger.
 *
 * Ce qu'on vérifie : une façon de recevoir la commande, et une seule, dès
 * qu'il y a une pièce (transporteur, pose ou retrait à l'atelier, gratuit) ;
 * la remise de plusieurs garde-corps ; les lignes qui ne se vendent plus
 * (à étudier, hauteur changée) ; le total ; et ce qui part vers le navigateur.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { libellePiece, MAX_PRECISIONS, tarifAffiche, tarifer } from "../src/lib/tarif-panier.ts";
import { libelleEntier, MAX_METADONNEE_STRIPE, MAX_NOM_STRIPE, nomsStripe } from "../src/lib/libelle-stripe.ts";
import { BORNES_RELEVE_GC, modeleAfficheGC, MURS_FIXATION_GC, noteReleveGC } from "../src/lib/garde-corps.ts";
import { CALCUL_GC, configurationGC, remiseCommandeGC, reponsePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { prixCommandeGC, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { LIVRAISON, POSE, PRISE_DE_COTES, RETRAIT, tarifLivraison, tarifPose, type ResultatLieu } from "../src/lib/deplacement.ts";
import { getProduct, libelleGardeCorps, productLocalise } from "../src/lib/products.ts";
import { configDepart, planPortail, versParamsPanier } from "../src/lib/portails.ts";
import { livrablePortailParTransporteur, tarifLivraisonPortail } from "../src/lib/deplacement.ts";
import type { ReponsePrixPortail } from "../src/lib/portails-outil/prix.ts";

const aKm = (distanceKm: number) => async (): Promise<ResultatLieu> => ({ ok: true, lieu: { distanceKm, commune: "Nantes", precision: "adresse" } });
const tarif = (lignes: unknown, locale: "fr" | "en" = "fr", km = 118.4) => tarifer(lignes, { locale, gc: CALCUL_GC, localiser: aKm(km) });
function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}

const mikado = getProduct("table-mikado")!;
const table = (quantity = 1) => ({ slug: mikado.slug, sizeId: mikado.sizes[0].id, woodId: "chene", metalId: mikado.metals[0].id, quantity });
const garde = (r: Record<string, unknown> = {}, quantity = 1) => ({
  slug: "garde-corps",
  largeurMm: 1180,
  allegeMm: 650,
  enEtage: true,
  fenetreMm: 1400,
  woodId: "chene",
  metalId: "noir",
  fabricId: "fleur",
  remplissageId: "croix",
  quantity,
  ...r,
});
const cfg = (r: { largeurMm?: number; allegeMm?: number; enEtage?: boolean; fenetreMm?: number } = {}, essence = "chene") =>
  configurationGC({ largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400, ...r }, essence) as ConfigGC;

test("une pièce demande une façon de la recevoir ; une livraison sans pièce ne se paie pas", async () => {
  const sans = await tarif([table()]);
  assert.equal(sans.probleme, "mode_livraison", "des pièces, mais ni transporteur, ni pose, ni retrait");
  for (const mode of [{ slug: LIVRAISON, livraisonCp: "44000" }, { slug: POSE, poseCp: "44000" }, { slug: RETRAIT }]) {
    const avec = await tarif([table(), mode]);
    assert.equal(avec.probleme, null, mode.slug);
    assert.ok(avec.mode);
    const orpheline = await tarif([mode]);
    assert.deepEqual(orpheline.refusees, [{ index: 0, raison: "orphelin" }], `${mode.slug} seule : à retirer du panier`);
    assert.equal(orpheline.mode, null);
    assert.equal(orpheline.total, 0);
  }
  // Deux façons à la fois : refusé (un seul trajet par commande).
  assert.equal((await tarif([table(), { slug: RETRAIT }, { slug: POSE, poseCp: "44000" }])).probleme, "invalid");
  assert.equal((await tarif([table(), { slug: RETRAIT }, { slug: RETRAIT }])).probleme, "invalid");
});

test("retrait à l'atelier : gratuit, sans code postal, sans ligne à payer", async () => {
  const t = await tarif([table(2), { slug: RETRAIT, livraisonCp: "75001" }]);
  assert.equal(t.probleme, null);
  assert.deepEqual(t.mode, { index: 1, mode: "retrait" });
  assert.equal(t.total, 2 * t.pieces[0].line.unitPrice);
  const affiche = tarifAffiche(t, "fr");
  const retrait = affiche.lignes.find((l) => l.type === "retrait")!;
  assert.equal(retrait.unitaire, 0);
  assert.match(retrait.nom, /^Retrait à l'atelier/);
  assert.match(tarifAffiche(t, "en").lignes.find((l) => l.type === "retrait")!.nom, /^Collection from the workshop/);
});

test("transporteur et pose : le tarif du site, au code postal ; un code postal faux bloque le paiement", async () => {
  const kg = (await tarif([table(), { slug: RETRAIT }])).pieces[0].line;
  assert.ok(kg);
  const t = await tarif([table(), { slug: LIVRAISON, livraisonCp: "44000" }], "fr", 118.4);
  assert.ok(t.mode?.mode === "transporteur");
  assert.equal(t.mode.deplacement.montantCents, tarifLivraison(118.4, t.mode.kg, Math.max(...mikado.sizes[0].dimsMm!)).montantCents);
  const p = await tarif([table(), { slug: POSE, poseCp: "44000" }], "fr", 118.4);
  assert.ok(p.mode?.mode === "pose");
  assert.equal(p.mode.deplacement.montantCents, tarifPose(118.4).montantCents);
  assert.equal(p.total, p.pieces[0].line.unitPrice + tarifPose(118.4).montantCents / 100);
  // Le vrai géocodage refuse ce qui n'est pas un code postal, sans même appeler l'annuaire.
  const faux = await tarifer([table(), { slug: LIVRAISON, livraisonCp: "abc" }], { locale: "fr", gc: CALCUL_GC });
  assert.equal(faux.probleme, "code_postal");
});

test("plusieurs garde-corps, même à des cotes différentes : la remise de l'outil, une fois pour la commande", async () => {
  chiffrageOuEchec();
  const lignes = [garde({}, 2), garde({ largeurMm: 800, allegeMm: 720, fenetreMm: 0, woodId: "pin" }), { slug: RETRAIT }];
  const t = await tarif(lignes);
  assert.equal(t.probleme, null);
  const attendue = prixCommandeGC([
    { config: cfg(), quantite: 2 },
    { config: cfg({ largeurMm: 800, allegeMm: 720, fenetreMm: 0 }, "pin"), quantite: 1 },
  ]).remise;
  assert.ok(attendue < 0);
  assert.equal(t.remise, attendue);
  assert.equal(t.total, 2 * prixGC(cfg()) + prixGC(cfg({ largeurMm: 800, allegeMm: 720, fenetreMm: 0 }, "pin")) + attendue);
  // Les options du site ne changent pas la remise (elles s'ajoutent au prix de l'outil).
  const avecOptions = await tarif([garde({ fabricId: "fonte", metalId: "blanc" }, 2), garde({ largeurMm: 800, allegeMm: 720, fenetreMm: 0, woodId: "pin", remplissageId: "verre" }), { slug: RETRAIT }]);
  assert.equal(avecOptions.remise, attendue);
  // Une table dans la même commande ne change rien à la remise des garde-corps.
  const mixte = await tarif([...lignes.slice(0, 2), table(), { slug: RETRAIT }]);
  assert.equal(mixte.remise, attendue);
  // Un seul garde-corps : pas de remise.
  assert.equal((await tarif([garde(), { slug: RETRAIT }])).remise, 0);
  assert.equal(remiseCommandeGC([]), 0);
});

test("un garde-corps à étudier, ou dont la hauteur a changé depuis l'affichage, est refusé", async () => {
  chiffrageOuEchec();
  // La pièce refusée part du panier, et la façon de la recevoir avec elle (plus rien à livrer).
  const etude = await tarif([garde({ largeurMm: 2800, allegeMm: 300 }), { slug: RETRAIT }]);
  assert.deepEqual(etude.refusees, [{ index: 0, raison: "a_etudier" }, { index: 1, raison: "orphelin" }]);
  const basse = await tarif([garde({ allegeMm: 300, fenetreMm: 500 }), { slug: RETRAIT }]);
  assert.deepEqual(basse.refusees, [{ index: 0, raison: "a_etudier" }, { index: 1, raison: "orphelin" }]);
  // La hauteur que le panier a affichée est renvoyée à la commande : si elle n'est plus la bonne, refus.
  const bonne = cfg().hauteurMm;
  assert.deepEqual((await tarif([garde({ hauteurMm: bonne }), { slug: RETRAIT }])).refusees, []);
  assert.deepEqual((await tarif([garde({ hauteurMm: bonne + 10 }), { slug: RETRAIT }])).refusees, [{ index: 0, raison: "hauteur" }, { index: 1, raison: "orphelin" }]);
  // Un relevé illisible : refusé, jamais chiffré au hasard.
  assert.deepEqual((await tarif([garde({ allegeMm: "650" }), { slug: RETRAIT }])).refusees, [{ index: 0, raison: "unknown_size" }, { index: 1, raison: "orphelin" }]);
  assert.deepEqual((await tarif([garde({ enEtage: undefined }), { slug: RETRAIT }])).refusees, [{ index: 0, raison: "unknown_size" }, { index: 1, raison: "orphelin" }]);
});

test("un garde-corps refusé : jamais un montant de livraison ou de pose sans pièce", async () => {
  chiffrageOuEchec();
  for (const refuse of [garde({ largeurMm: 2800, allegeMm: 300 }, 2), garde({ allegeMm: 300, fenetreMm: 500 })]) {
    for (const mode of [{ slug: LIVRAISON, livraisonCp: "75001" }, { slug: POSE, poseCp: "49400" }, { slug: RETRAIT }]) {
      const t = await tarif([refuse, mode]);
      assert.deepEqual(t.refusees, [{ index: 0, raison: "a_etudier" }, { index: 1, raison: "orphelin" }], mode.slug);
      assert.equal(t.mode, null, mode.slug);
      assert.equal(t.total, 0, `${mode.slug} : aucun total sans pièce`);
      const affiche = tarifAffiche(t, "fr");
      assert.deepEqual(affiche.lignes, []);
      assert.equal(affiche.total, 0);
    }
  }
  // Avec une autre pièce qui, elle, se vend : la livraison reste, au poids de cette pièce seulement.
  const mixte = await tarif([garde({ largeurMm: 2800, allegeMm: 300 }), table(), { slug: LIVRAISON, livraisonCp: "44000" }]);
  assert.deepEqual(mixte.refusees, [{ index: 0, raison: "a_etudier" }]);
  assert.ok(mixte.mode?.mode === "transporteur");
  assert.equal(mixte.total, mixte.pieces[0].line.unitPrice + mixte.mode.deplacement.montantCents / 100);
});

test("ce que le client précise sur un garde-corps arrive entier au panier et au bon de commande", async () => {
  chiffrageOuEchec();
  for (const langue of ["fr", "en"] as const) {
    const t = JSON.parse(readFileSync(new URL(`../src/app/[lang]/dictionaries/${langue}.json`, import.meta.url), "utf8")).artisanat;
    const plusLong = (liste: string[]) => liste.reduce((a, b) => (b.length > a.length ? b : a), "");
    // La note la plus longue que la fiche peut écrire : les plus longs libellés, les plus grandes cotes de l'outil.
    const note = noteReleveGC(
      { etage: plusLong(t.gcEtageOptions), mur: plusLong(t.gcMurOptions), allegeMm: BORNES_RELEVE_GC.allegeMm.max, fenetreMm: BORNES_RELEVE_GC.fenetreMm.max, jourMm: 9999, largeurBasMm: BORNES_RELEVE_GC.largeurMm.max, largeurHautMm: BORNES_RELEVE_GC.largeurMm.max - 1 },
      t,
      langue
    );
    assert.ok(note.length <= MAX_PRECISIONS, `${langue} : ${note.length} signes > ${MAX_PRECISIONS}`);
    const tarifLu = await tarif([garde({ note }), { slug: RETRAIT }], langue);
    assert.equal(tarifLu.pieces[0].precisions, note, `${langue} : la note est coupée`);
    assert.ok(libellePiece(tarifLu.pieces[0]).endsWith(note), `${langue} : le libellé Stripe perd la fin de la note`);
    assert.ok(tarifAffiche(tarifLu, langue).lignes[0].options.endsWith(note), `${langue} : le panier perd la fin de la note`);
  }
  // Le relevé du 30/09 : la hauteur de la fenêtre et « posé à » sont bien là.
  const vu = await tarif([garde({ note: "En étage · type de mur : pierre · hauteur du sol au bas de la fenêtre 650 mm · hauteur de la fenêtre, de l'appui au haut 1400 mm · posé à 90 mm" }), { slug: RETRAIT }]);
  assert.match(tarifAffiche(vu, "fr").lignes[0].options, /de l'appui au haut 1400 mm · posé à 90 mm$/);
});

test("le nom envoyé à Stripe tient en 250 signes ; le libellé entier, note comprise, se relit dans les métadonnées", async () => {
  chiffrageOuEchec();
  for (const langue of ["fr", "en"] as const) {
    const t = JSON.parse(readFileSync(new URL(`../src/app/[lang]/dictionaries/${langue}.json`, import.meta.url), "utf8")).artisanat;
    const plusLong = (liste: string[]) => liste.reduce((a, b) => (b.length > a.length ? b : a), "");
    // Le garde-corps le plus bavard : la rosace au plus long libellé, la note la plus longue de la fiche.
    const note = noteReleveGC(
      { etage: plusLong(t.gcEtageOptions), mur: plusLong(t.gcMurOptions), allegeMm: BORNES_RELEVE_GC.allegeMm.max, fenetreMm: BORNES_RELEVE_GC.fenetreMm.max, jourMm: 9999, largeurBasMm: BORNES_RELEVE_GC.largeurMm.max, largeurHautMm: BORNES_RELEVE_GC.largeurMm.max - 1 },
      t,
      langue
    );
    const lu = await tarif([garde({ note, fabricId: "fonte" }), table(), garde({ note: "x".repeat(MAX_PRECISIONS), fabricId: "fonte" }), { slug: RETRAIT }], langue);
    const libelles = lu.pieces.map(libellePiece);
    assert.ok(libelles[0].length > MAX_NOM_STRIPE, `${langue} : ce libellé dépassait la limite de Stripe (${libelles[0].length} signes)`);
    const { noms, entiers } = nomsStripe(libelles);
    for (const nom of noms) assert.ok(nom.length <= MAX_NOM_STRIPE, `${langue} : ${nom.length} signes, Stripe refuserait le paiement`);
    for (const entier of Object.values(entiers)) assert.ok(entier.length <= MAX_METADONNEE_STRIPE, `${langue} : ${entier.length} signes dans une métadonnée`);
    // Seules les lignes coupées prennent une clé ; la table, courte, garde son nom.
    assert.deepEqual(Object.keys(entiers), ["libelle_0", "libelle_2"]);
    assert.equal(noms[1], libelles[1]);
    // Relu chez Stripe : chaque ligne retrouve son libellé entier, donc la note jusqu'au bout.
    assert.deepEqual(noms.map((nom, rang) => libelleEntier(nom, rang, entiers)), libelles);
    assert.ok(libelleEntier(noms[0], 0, entiers).endsWith(note), `${langue} : l'atelier perd la fin de la note`);
    // Des lignes revenues dans un autre ordre : jamais le libellé d'une autre ligne.
    assert.equal(libelleEntier(noms[2], 0, entiers), libelles[2]);
    // Une commande d'avant la limite (sans métadonnée) : le nom, tel quel.
    assert.equal(libelleEntier(noms[0], 0, { order_ref: "AB-1" }), noms[0]);
  }
});

test("avec le mur des tableaux, le libellé passe 500 signes : il se relit entier, la note jusqu'au bout, une clé par ligne", async () => {
  chiffrageOuEchec();
  for (const langue of ["fr", "en"] as const) {
    const t = JSON.parse(readFileSync(new URL(`../src/app/[lang]/dictionaries/${langue}.json`, import.meta.url), "utf8")).artisanat;
    const plusLong = (liste: readonly string[]) => liste.reduce((a, b) => (b.length > a.length ? b : a), "");
    const note = noteReleveGC(
      { etage: plusLong(t.gcEtageOptions), mur: plusLong(t.gcMurOptions), allegeMm: BORNES_RELEVE_GC.allegeMm.max, fenetreMm: BORNES_RELEVE_GC.fenetreMm.max, jourMm: 9999, largeurBasMm: BORNES_RELEVE_GC.largeurMm.max, largeurHautMm: BORNES_RELEVE_GC.largeurMm.max - 1 },
      t,
      langue
    );
    // Le cas de la relecture (07/10/2026) : 2 000 × 500 en étage, fenêtre de 1 450, le modèle proposé par la route, noyer sur fer
    // plat, rosace en fonte, mur en tuffeau, la note la plus longue de la fiche. Avant : 529 signes, l'atelier lisait « posé à 9 ».
    const route = reponsePrixGC({ releve: { largeurMm: 2000, allegeMm: 500, enEtage: true, fenetreMm: 1450, mur: "tuffeau" }, essence: "noyer-plat", fabricId: "fonte", quantite: 1 });
    assert.ok(route?.ok);
    const ligne = garde({ largeurMm: 2000, allegeMm: 500, fenetreMm: 1450, murGc: "tuffeau", modeleGc: modeleAfficheGC(route), woodId: "noyer-plat", fabricId: "fonte", note });
    const lu = await tarif([ligne, table(), { slug: RETRAIT }], langue);
    assert.deepEqual(lu.refusees, []);
    const reel = libellePiece(lu.pieces[0]);
    assert.ok(reel.length > MAX_METADONNEE_STRIPE, `${langue} : ${reel.length} signes — ce cas ne dépasse plus 500 signes, le test ne vérifie plus la suite`);
    // Le pire libellé : la forme la plus longue de l'outil (12 croix, traverse, barreaux en bas, fer plat de renfort, 4 pattes), le mur et
    // le montage aux plus longs noms, « à confirmer », les plus longues options de la fiche, la note la plus longue.
    const fiche = productLocalise(getProduct("garde-corps")!, langue);
    const taille = plusLong(
      MURS_FIXATION_GC.flatMap((mur) =>
        ["tige", "platine", "platines", "traversant"].map((mode) =>
          libelleGardeCorps(3000, 1100, 12, langue, { soubassement: true, carre: 16, traverse: true, renfort: true, patte: 4, fixation: { mur, mode, statut: "indicatif" } })
        )
      )
    );
    const options = [taille, plusLong(fiche.woods.map((w) => w.label)), plusLong(fiche.metals.map((m) => m.label)), plusLong((fiche.fabrics ?? []).map((f) => f.label))].join(" · ");
    const pire = libellePiece({ ...lu.pieces[0], options, precisions: note });
    assert.ok(pire.length > reel.length);
    const libelles = [reel, libellePiece(lu.pieces[1]), pire];
    const { noms, entiers } = nomsStripe(libelles);
    for (const nom of noms) assert.ok(nom.length <= MAX_NOM_STRIPE, `${langue} : ${nom.length} signes, Stripe refuserait le paiement`);
    for (const valeur of Object.values(entiers)) assert.ok(valeur.length <= MAX_METADONNEE_STRIPE, `${langue} : ${valeur.length} signes dans une métadonnée`);
    // Une seule clé par ligne coupée, comme avant : Stripe n'en accepte que 50 par commande, et un panier a jusqu'à 19 pièces.
    assert.deepEqual(Object.keys(entiers), ["libelle_0", "libelle_2"]);
    // Relu chez Stripe : chaque ligne retrouve son libellé entier — la note jusqu'au bout, « posé à … mm » compris.
    assert.deepEqual(noms.map((nom, rang) => libelleEntier(nom, rang, entiers)), libelles);
    assert.ok(libelleEntier(noms[0], 0, entiers).endsWith(note), `${langue} : l'atelier perd la fin de la note`);
    // Des lignes revenues dans un autre ordre : chaque suite rejoint son nom, jamais celui d'une autre ligne.
    assert.equal(libelleEntier(noms[2], 0, entiers), pire);
    assert.equal(libelleEntier(noms[0], 2, entiers), reel);
    // Une suite qui n'est pas celle de ce nom (une autre empreinte) n'est jamais recollée : le nom coupé, tel quel.
    const suite = entiers.libelle_0;
    assert.equal(libelleEntier(noms[0], 0, { libelle_0: `${suite.slice(0, 1)}00000000${suite.slice(9)}` }), noms[0]);
    assert.equal(libelleEntier(noms[2], 2, { libelle_0: suite }), noms[2]);
  }
});

test("la prise de cotes : son créneau est lu, son prix vient du code postal", async () => {
  const sansCreneau = await tarif([{ slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "demain" }]);
  assert.equal(sansCreneau.probleme, "rdv");
  const visite = await tarif([{ slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-10-12|matin", note: "garde-corps" }], "fr", 12);
  assert.equal(visite.probleme, null);
  assert.ok(visite.visite);
  assert.equal(visite.total, visite.visite.deplacement.montantCents / 100);
  // Au-delà de 200 km, l'atelier ne se déplace pas.
  const loin = await tarif([{ slug: PRISE_DE_COTES, priseDeCotesCp: "13001", rdv: "2026-10-12|matin" }], "fr", 600);
  assert.equal(loin.probleme, "code_postal");
});

test("ce qui part vers le navigateur : des noms, des prix de vente, la hauteur retenue — rien d'autre", async () => {
  chiffrageOuEchec();
  const t = await tarif([garde({}, 2), table(), { slug: LIVRAISON, livraisonCp: "44000" }], "en");
  assert.equal(t.probleme, null);
  const affiche = tarifAffiche(t, "en");
  // garantiesRefusees et garantieExclue : des index et une raison (« visite », « pose »), jamais un montant.
  // soldePortail : le solde d'un portail à la réception (un prix de vente), null sans portail.
  assert.deepEqual(Object.keys(affiche).sort(), ["garantieExclue", "garantiesRefusees", "lignes", "probleme", "receptionsPortail", "refusees", "remise", "soldePortail", "total"]);
  assert.equal(affiche.soldePortail, null);
  assert.deepEqual(affiche.receptionsPortail, []);
  assert.ok(affiche.garantiesRefusees.every((i) => Number.isInteger(i)));
  assert.ok(affiche.garantieExclue === null || ["visite", "pose"].includes(affiche.garantieExclue));
  // garantiePrix et garantie : la Garantie cotes, un prix de VENTE calculé sur le serveur (garantie-cotes.ts) et la case cochée.
  // solde : un portail, le solde à la réception (un prix de vente, l'acompte étant l'unitaire).
  const champs = new Set(["index", "type", "nom", "options", "quantite", "unitaire", "image", "hauteurMm", "garantiePrix", "garantie", "solde", "reception"]);
  for (const l of affiche.lignes) {
    for (const cle of Object.keys(l)) assert.ok(champs.has(cle), `champ inattendu vers le navigateur : ${cle}`);
    for (const [cle, valeur] of Object.entries(l)) assert.ok(["string", "number", "undefined"].includes(typeof valeur) || (cle === "garantie" && typeof valeur === "boolean"));
  }
  const gc = affiche.lignes.find((l) => l.type === "piece" && l.hauteurMm !== undefined)!;
  assert.equal(gc.hauteurMm, cfg().hauteurMm);
  // (3 croix depuis la fixation par platines au bout des lisses, 10/10/2026 : le cadre s'arrête à 90 mm des tableaux, 1 000 mm
  // de croix au lieu de 1 180 ; avant, 4.)
  assert.match(gc.options, /Custom — 1,180 × 285 mm, 3 crosses/);
  assert.equal(gc.nom, "Rosette Window Railing");
  assert.equal(affiche.total, t.total);
  assert.equal(
    affiche.total,
    Math.round((affiche.lignes.reduce((a, l) => a + l.unitaire * l.quantite, 0) + affiche.remise) * 100) / 100
  );
});

test("un portail (10/10/2026) : la configuration relue par l'outil, l'acompte de 40 % et la visite encaissés, le solde à la réception (visite déduite) ; rien à livrer, pas de Garantie cotes", async () => {
  const battant = getProduct("portail-battant")!;
  const config = versParamsPanier("portail-battant", configDepart("portail-battant"));
  // L'outil, remplacé par un prix fixe : ce test tient sans la clé du chiffrage.
  const outil = (): ReponsePrixPortail => ({ ok: true, prix: 5370, portillon: null, avertissements: [], resume: [] });
  const ctx = { locale: "fr" as const, gc: CALCUL_GC, localiser: aKm(10) };
  // La visite de prise de cotes (Quentin, 10/10 : payée à part, déduite du solde) : une ligne PRISE_DE_COTES avec le portail.
  const visite = { slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-10-12|matin", note: "Portail battant" };
  const sansVisite = await tarifer([{ slug: battant.slug, portail: config, quantity: 1 }], { ...ctx, portail: outil });
  assert.equal(sansVisite.probleme, "visite_portail", "un portail sans sa visite ne se paie pas");
  const t = await tarifer([{ slug: battant.slug, portail: config, quantity: 1, garantieCotes: true, unitPrice: 1 }, visite], { ...ctx, portail: outil, garantieSouple: true });
  assert.equal(t.probleme, null);
  assert.ok(t.visite && t.visite.deplacement.montantCents > 0);
  const prixVisite = t.visite!.deplacement.montantCents / 100;
  assert.deepEqual(t.refusees, []);
  assert.equal(t.pieces.length, 1);
  const p = t.pieces[0];
  // 40 % de 5 370 € : 2 148 € aujourd'hui, 3 222 € à la réception ; le « unitPrice: 1 » envoyé n'est jamais lu.
  assert.equal(p.line.unitPrice, 2148);
  assert.deepEqual({ ...p.portail, colis: undefined }, { config, prixPose: 5370, solde: 3222, reception: "pose", colis: undefined });
  assert.ok(p.portail!.colis.kg > 0 && p.portail!.colis.kgTaxable >= p.portail!.colis.kg, "le colis vient du plan");
  assert.equal(p.line.product.slug, "portail-battant");
  assert.deepEqual(p.line.size.dimsMm, [3500, 1600]);
  // La visite est comprise : pas de Garantie cotes, et la case cochée est décochée (garantieSouple) ou refusée.
  assert.equal(p.garantiePrix, null);
  assert.equal(p.garantie, false);
  assert.deepEqual(t.garantiesRefusees, [0]);
  assert.equal((await tarifer([{ slug: battant.slug, portail: config, quantity: 1, garantieCotes: true }, visite], { ...ctx, portail: outil })).probleme, "invalid");
  // Ce que Stripe et l'atelier lisent : le modèle, la configuration en mots, l'acompte et le solde.
  assert.match(libellePiece(p), /^Portail battant — Passage entre piliers : 3500 mm · Hauteur : 1600 mm · /);
  assert.match(p.options, /Acompte de 40 % \(prix posé 5\u202f370 €, solde 3\u202f222 € à la réception\)$/);
  // Rien à livrer : la pose est comprise ; aujourd'hui, l'acompte et la visite ; le solde, visite déduite.
  assert.equal(t.mode, null);
  assert.equal(t.total, 2148 + prixVisite);
  assert.equal(t.soldePortail, 3222 - prixVisite);
  const affiche = tarifAffiche(t, "fr");
  assert.equal(affiche.lignes[0].unitaire, 2148);
  assert.equal(affiche.lignes[0].solde, 3222);
  assert.equal(affiche.lignes[0].image, battant.images[0].src);
  assert.equal(affiche.soldePortail, 3222 - prixVisite);
  assert.equal(affiche.lignes.find((l) => l.type === "visite")?.unitaire, prixVisite);
  // En anglais : le même acompte, dit dans la langue du client ; deux portails, une seule visite déduite.
  const en = await tarifer([{ slug: battant.slug, portail: config, quantity: 2 }, visite], { ...ctx, locale: "en", portail: outil });
  assert.match(en.pieces[0].options, /40% deposit \(fitted price €5,370, balance €3,222 on handover\)$/);
  assert.equal(en.total, 4296 + prixVisite);
  assert.equal(en.soldePortail, 6444 - prixVisite);
  // Sans l'outil sur ce serveur : refusé, jamais un prix inventé. Une configuration illisible, un portail à étudier : refusés.
  assert.deepEqual((await tarifer([{ slug: battant.slug, portail: config, quantity: 1 }, visite], ctx)).refusees, [{ index: 0, raison: "prix_serveur" }]);
  assert.deepEqual((await tarifer([{ slug: battant.slug, portail: "P=99999", quantity: 1 }], { ...ctx, portail: outil })).refusees, [{ index: 0, raison: "unknown_size" }]);
  assert.deepEqual((await tarifer([{ slug: battant.slug, portail: `${config}&slug=portillon`, quantity: 1 }], { ...ctx, portail: outil })).refusees, [{ index: 0, raison: "unknown_size" }]);
  assert.deepEqual((await tarifer([{ slug: battant.slug, quantity: 1 }], { ...ctx, portail: outil })).refusees, [{ index: 0, raison: "unknown_size" }]);
  assert.deepEqual((await tarifer([{ slug: battant.slug, portail: config, quantity: 1 }], { ...ctx, portail: () => ({ ok: false, alertes: ["à étudier"] }) })).refusees, [{ index: 0, raison: "a_etudier" }]);
  // Une table avec un portail : la table demande toujours sa livraison, le portail non.
  const mixte = await tarifer([{ slug: battant.slug, portail: config, quantity: 1 }, visite, table()], { ...ctx, portail: outil });
  assert.equal(mixte.probleme, "mode_livraison");
  const livre = await tarifer([{ slug: battant.slug, portail: config, quantity: 1 }, visite, table(), { slug: RETRAIT }], { ...ctx, portail: outil });
  assert.equal(livre.probleme, null);
  assert.equal(livre.total, 2148 + prixVisite + mikado.sizes[0].price);
});

test("un portail sans pose (10/10/2026) : transporteur ou retrait, la livraison d'après le colis du plan, ni visite ni pose, pas de moteur", async () => {
  const battant = getProduct("portail-battant")!;
  const outil = (_slug: string, cfg: { reception: string }): ReponsePrixPortail => ({ ok: true, prix: cfg.reception === "pose" ? 5370 : 4300, portillon: null, avertissements: [], resume: [] });
  const cfgPar = (reception: "pose" | "transporteur" | "retrait") => versParamsPanier("portail-battant", { ...configDepart("portail-battant"), reception });
  const ctx = { locale: "fr" as const, gc: CALCUL_GC, localiser: aKm(100), portail: outil };
  const colis = planPortail("portail-battant", { ...configDepart("portail-battant"), reception: "transporteur" }).colis;
  // Par transporteur : un portail, sa ligne de livraison ; pas de visite. Aujourd'hui : l'acompte (40 % de 4 300 €) et la livraison.
  const livraison = { slug: LIVRAISON, livraisonCp: "75001" };
  const t = await tarifer([{ slug: battant.slug, portail: cfgPar("transporteur"), quantity: 1 }, livraison], ctx);
  assert.equal(t.probleme, null);
  assert.equal(t.pieces[0].line.unitPrice, 1720);
  assert.equal(t.pieces[0].portail?.reception, "transporteur");
  assert.equal(t.visite, null);
  assert.equal(t.mode?.mode, "transporteur");
  const prixLivraison = t.mode!.mode === "transporteur" ? t.mode.deplacement.montantCents / 100 : 0;
  assert.equal(prixLivraison, tarifLivraisonPortail(100, colis).montantCents / 100, "la livraison est celle du tarif des portails, d'après le colis du plan");
  assert.ok(prixLivraison > 90, "pas de plafond à 90 € comme pour une table");
  assert.equal(t.total, 1720 + prixLivraison);
  assert.equal(t.soldePortail, 2580);
  assert.deepEqual(t.receptionsPortail, ["transporteur"]);
  assert.match(t.pieces[0].options, /prix sans pose 4[\s\u202f\u00a0]300 €, solde 2[\s\u202f\u00a0]580 € avant l'expédition\)$/);
  // Retrait à l'atelier : une ligne RETRAIT, rien à livrer, rien d'autre que l'acompte.
  const r = await tarifer([{ slug: battant.slug, portail: cfgPar("retrait"), quantity: 1 }, { slug: RETRAIT }], ctx);
  assert.equal(r.probleme, null);
  assert.equal(r.total, 1720);
  assert.equal(r.soldePortail, 2580);
  assert.deepEqual(r.receptionsPortail, ["retrait"]);
  assert.match(r.pieces[0].options, /solde 2[\s\u202f\u00a0]580 € au retrait\)$/);
  // Sans sa façon de recevoir, un portail sans pose ne se paie pas ; avec une autre, non plus (une seule livraison par commande).
  assert.equal((await tarifer([{ slug: battant.slug, portail: cfgPar("transporteur"), quantity: 1 }], ctx)).probleme, "mode_livraison");
  assert.equal((await tarifer([{ slug: battant.slug, portail: cfgPar("transporteur"), quantity: 1 }, { slug: RETRAIT }], ctx)).probleme, "invalid");
  assert.equal((await tarifer([{ slug: battant.slug, portail: cfgPar("retrait"), quantity: 1 }, livraison], ctx)).probleme, "invalid");
  // Un portail sans pose n'a pas besoin de visite, et la visite d'un autre ne lui est pas déduite.
  const avecVisite = await tarifer([{ slug: battant.slug, portail: cfgPar("retrait"), quantity: 1 }, { slug: RETRAIT }, { slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-10-12|matin" }], ctx);
  assert.equal(avecVisite.soldePortail, 2580);
  // Posé et retiré dans la même commande : deux soldes, dits tous les deux.
  const mixte = await tarifer([{ slug: battant.slug, portail: cfgPar("pose"), quantity: 1 }, { slug: battant.slug, portail: cfgPar("retrait"), quantity: 1 }, { slug: RETRAIT }, { slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-10-12|matin" }], ctx);
  assert.equal(mixte.probleme, null);
  assert.deepEqual([...mixte.receptionsPortail].sort(), ["pose", "retrait"]);
  // Le moteur ne se vend pas sans la pose : la ligne est refusée (jamais corrigée en silence).
  const moteur = versParamsPanier("portail-battant", { ...configDepart("portail-battant"), reception: "transporteur", moteur: true });
  // (La livraison restée seule, sans portail à livrer, est refusée aussi : « orphelin », elle ne se paie pas.)
  assert.deepEqual((await tarifer([{ slug: battant.slug, portail: moteur, quantity: 1 }, livraison], ctx)).refusees, [{ index: 0, raison: "unknown_size" }, { index: 1, raison: "orphelin" }]);
  // Le prix que le navigateur envoie n'est jamais lu : la façon de recevoir change le prix posé en prix sans pose, et c'est tout.
  assert.equal(livrablePortailParTransporteur(colis), true);
});

test("la livraison d'un portail (10/10/2026) : messagerie d'après le poids taxable, affrètement au-delà de 3 m, jamais plafonnée", () => {
  // Un battant (deux vantaux de 1,70 m debout sur une palette) : 745 kg taxables, pièce la plus longue 1,70 m, 1,65 m de haut.
  const battant = { kg: 61, kgTaxable: 745, longueurMaxMm: 1702, hauteurMaxMm: 1650 };
  const prix = (km: number, c = battant) => tarifLivraisonPortail(km, c).montantCents / 100;
  // (65 + route × (0,06 + 0,0006 × 745)) × 1,10 + 40, au minimum 90 € avant gazole et hayon ; route = vol d'oiseau × 1,25.
  assert.equal(prix(100), Math.ceil(Math.max(90, 65 + 125 * (0.06 + 0.0006 * 745)) * 1.1 + 40));
  assert.equal(prix(300), Math.ceil(Math.max(90, 65 + 375 * (0.06 + 0.0006 * 745)) * 1.1 + 40));
  assert.ok(prix(300) > prix(100) && prix(600) > prix(300), "plus loin, plus cher");
  assert.ok(prix(300) > 90, "la livraison d'un portail n'est pas plafonnée à 90 €");
  // Plus lourd ou plus encombrant, plus cher.
  assert.ok(prix(300, { ...battant, kgTaxable: 1708 }) > prix(300));
  // Un portillon (une palette de 0,94 m : 411 kg taxables) coûte moins qu'un battant.
  assert.ok(prix(300, { kg: 34, kgTaxable: 411, longueurMaxMm: 940, hauteurMaxMm: 1650 }) < prix(300));
  // Au-delà de 3 m (un coulissant de 3,66 m), la messagerie refuse : affrètement, 1,5 € du km aller et retour, 450 € au moins.
  const coulissant = { kg: 83, kgTaxable: 2914, longueurMaxMm: 3660, hauteurMaxMm: 1695 };
  assert.equal(prix(100, coulissant), 450);
  assert.equal(prix(300, coulissant), Math.ceil(2 * 375 * 1.5));
  // Plus de 2,05 m de haut (avec sa palette, plus de 2,20 m) : affrètement aussi, même court.
  assert.equal(prix(100, { ...battant, hauteurMaxMm: 2200 }), 450);
  // Un portail de plus de 6 m ne part pas par transporteur.
  assert.equal(livrablePortailParTransporteur({ ...coulissant, longueurMaxMm: 6001 }), false);
  assert.equal(livrablePortailParTransporteur({ ...coulissant, longueurMaxMm: 5960 }), true);
});
