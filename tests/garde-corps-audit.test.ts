/**
 * LES CORRECTIFS DE L'AUDIT DU 05/10/2026 (cotes, prix, norme, textes) : chacun garde son test, pour ne pas revenir.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { tarifAffiche, tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC, configurationGC, ligneGC, planApercuGC, prixDepart, reponsePrixGC, type RequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { configurerGC, prixGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { composerDevisGardeCorps } from "../src/lib/garde-corps-outil/devis-site.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { MAINS_COURANTES_GC, MAIN_COURANTE_MM, MINI_SEULS_GC_MM, RELEVE_DEPART_GC, jourGC, lireReponsePrixGC, noteReleveGC } from "../src/lib/garde-corps.ts";
import { valeursGC } from "../src/lib/garde-corps-outil/entree.ts";
import { DEFAUTS_GC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { getProduct } from "../src/lib/products.ts";

function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}
const q = (largeurMm: number, allegeMm: number, essence = "chene", fabricId = "fleur"): RequetePrixGC => ({ releve: { largeurMm, allegeMm, enEtage: true, fenetreMm: 0 }, essence: essence as RequetePrixGC["essence"], fabricId, quantite: 1 });
const tarif = (lignes: unknown, locale: "fr" | "en" = "fr") => tarifer(lignes, { locale, gc: CALCUL_GC });
const garde = (r: Record<string, unknown> = {}) => ({ slug: "garde-corps", largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix", quantity: 1, ...r });
const RETRAIT = { slug: "retrait-atelier" };
// (Le jour des barreaux seuls : voir aussi la référence de l'outil, cas « barreaux seuls, bas de fenêtre à 760 : jour 90 ».)

test("fenêtres étroites : la réponse du serveur se relit dans le navigateur (rosace plus grande que le vide)", () => {
  chiffrageOuEchec();
  let relues = 0;
  for (const allege of [0, 300, 500, 585, 650, 735, 760, 786]) for (const fabricId of ["fleur", "acier", "sans"]) for (const largeur of [300, 305, 320, 340, 360, 400, 420]) {
    const r = reponsePrixGC(q(largeur, allege, "chene", fabricId));
    assert.ok(r, `${largeur} × ${allege}`);
    const lue = lireReponsePrixGC(JSON.parse(JSON.stringify(r)));
    assert.ok(lue, `${largeur} × ${allege} rosace ${fabricId} : le navigateur doit relire la réponse`);
    for (const m of lue.modeles) for (const rond of m.trous?.ronds ?? []) assert.ok(rond.d >= 1);
    relues++;
  }
  assert.equal(relues, 8 * 3 * 7);
});

test("barreaux seuls : le jour est celui de l'outil (90 mm entre 736 et 785), les croix gardent le jour réduit", () => {
  for (let allege = 736; allege <= 785; allege++) {
    assert.equal(jourGC(allege, true), 90, `barreaux seuls à ${allege} : place pour 120 mm de cadre sans réduire le jour`);
    assert.ok(jourGC(allege) < 90 && jourGC(allege) >= 40, `croix à ${allege}`);
    const v = valeursGC(DEFAUTS_GC, { largeurMm: 1180, allegeMm: allege, enEtage: true, fenetreMm: 0, essence: "chene" }, 16, 1, false, false, false, true) as unknown as { jour: number };
    assert.equal(v.jour, 90);
    assert.ok(MAIN_COURANTE_MM - allege - 90 >= MINI_SEULS_GC_MM, "le cadre à barreaux tient avec 90 mm de jour");
  }
  const c = configurerGC({ largeurMm: 1180, allegeMm: 760, enEtage: true, fenetreMm: 0, essence: "chene", modele: "16-1-s" });
  assert.ok(c.ok && c.jourMm === 90 && c.mainCouranteMm === MAIN_COURANTE_MM, "main courante à 1 025, jour 90");
  assert.equal(c.hauteurMm, MAIN_COURANTE_MM - 760 - 90, "le cadre à barreaux mesure 175 mm, pas 200 (jour réduit des croix)");
  const croix = configurerGC({ largeurMm: 1180, allegeMm: 760, enEtage: true, fenetreMm: 0, essence: "chene" });
  assert.ok(croix.ok && !croix.seuls && croix.jourMm === 65 && croix.hauteurMm === 200, "les croix gardent leur jour réduit");
});

test("le « à partir de » est le prix le plus bas qui se vend (cadre bas à barreaux compris)", () => {
  chiffrageOuEchec();
  const depart = prixDepart(getProduct("garde-corps")!);
  assert.ok(depart !== null);
  let moins = Infinity;
  for (const largeurMm of [300, 310, 400]) for (let allegeMm = 700; allegeMm <= 985; allegeMm += 5) for (const e of MAINS_COURANTES_GC) {
    const c = configurationGC({ largeurMm, allegeMm, enEtage: true, fenetreMm: 0 }, e);
    if (c?.ok) moins = Math.min(moins, prixGC(c));
  }
  assert.ok(depart <= moins, `« à partir de » ${depart} € > le moins cher vendu ${moins} €`);
  assert.equal(RELEVE_DEPART_GC.allegeMm, 786);
});

test("panier : un modèle à barreaux seuls n'écrit pas de rosace, en français comme en anglais", async () => {
  chiffrageOuEchec();
  for (const locale of ["fr", "en"] as const) {
    const t = await tarif([garde({ modeleGc: "16-1-s", fabricId: "fonte" }), RETRAIT], locale);
    assert.equal(t.refusees.length, 0);
    const o = tarifAffiche(t, locale).lignes[0].options;
    assert.ok(!/médaillon|medaillon|rosette|fleur|flower/i.test(o), `${locale} : ${o}`);
    assert.match(o, locale === "fr" ? /barreaux seuls/ : /vertical bars only/);
  }
});

test("panier : un identifiant de modèle de 9 signes passe, une hauteur de fenêtre illisible est refusée", async () => {
  chiffrageOuEchec();
  // Un modèle à 10 croix avec barreaux en bas et traverse : « 16-10-b-t » (9 signes) n'était plus lu (coupé à 8).
  let essaye = 0;
  for (const largeurMm of [2400, 2700, 3000]) for (const allegeMm of [300, 500]) {
    const r = reponsePrixGC({ ...q(largeurMm, allegeMm) });
    for (const m of r?.modeles ?? []) if (m.conforme && m.id.length > 8) {
      essaye++;
      const t = await tarif([garde({ largeurMm, allegeMm, modeleGc: m.id }), RETRAIT]);
      assert.equal(t.refusees.length, 0, `${m.id} à ${largeurMm} × ${allegeMm}`);
    }
  }
  assert.ok(essaye >= 0);
  for (const fenetreMm of ["abc", -5, 1.5, NaN, {}, true]) {
    const t = await tarif([garde({ fenetreMm }), RETRAIT]);
    assert.ok(t.refusees.some((r) => r.index === 0 && r.raison === "unknown_size"), `fenêtre ${JSON.stringify(fenetreMm)} : refusée, pas prise pour « inconnue »`);
  }
  for (const fenetreMm of [undefined, null, 0, 1400]) {
    const t = await tarif([garde({ fenetreMm }), RETRAIT]);
    assert.equal(t.refusees.length, 0, `fenêtre ${String(fenetreMm)} : acceptée`);
  }
});

test("panier : la remise se calcule sur la main courante DEMANDÉE, comme la route et le devis", async () => {
  chiffrageOuEchec();
  // Fenêtre large : le bois « rainuré » est fabriqué sur fer plat (l'identifiant fabriqué n'est pas celui demandé).
  const l = ligneGC({ largeurMm: 2400, allegeMm: 400, enEtage: true, fenetreMm: 0 }, { woodId: "pin", fabricId: "fonte" });
  assert.ok(l.ok && l.line.gc);
  assert.equal(l.line.gc.essence, "pin", "la main courante demandée est gardée dans la ligne");
  assert.notEqual(l.line.wood?.id, undefined);
  const route = reponsePrixGC({ releve: { largeurMm: 2400, allegeMm: 400, enEtage: true, fenetreMm: 0 }, essence: "pin", fabricId: "fonte", quantite: 5 });
  const panier = await tarif([garde({ largeurMm: 2400, allegeMm: 400, fenetreMm: 0, woodId: "pin", fabricId: "fonte", quantity: 5 }), RETRAIT]);
  assert.ok(route?.ok);
  assert.equal(panier.refusees.length, 0);
  const pieces = panier.pieces.filter((p) => p.line.gc);
  const totalPanier = pieces.reduce((t, p) => t + p.line.unitPrice * p.quantite, 0) + panier.remise;
  assert.equal(totalPanier, route.prix * 5 + route.remise, "total du panier = route (prix × quantité + remise)");
});

test("sous un panneau de verre : la rosace par défaut compte partout ; pas de verre sur un cadre à barreaux seuls", () => {
  chiffrageOuEchec();
  const r = (fabricId: string) => reponsePrixGC({ releve: { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 }, essence: "pin", fabricId, remplissageId: "verre", quantite: 3 });
  const medaillon = r("acier"), fleur = r("fleur");
  assert.ok(medaillon?.ok && fleur?.ok);
  assert.equal(medaillon.prix, fleur.prix, "le verre n'a pas de rosace : le médaillon d'acier ne change rien");
  assert.equal(medaillon.croix, fleur.croix);
  assert.equal(medaillon.remise, fleur.remise);
  // Un cadre à barreaux seuls (bas de fenêtre à 800 mm) ne reçoit pas de verre : refusé proprement, le devis ne plante pas.
  const seuls = ligneGC({ largeurMm: 900, allegeMm: 800, enEtage: true, fenetreMm: 0 }, { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "verre" });
  assert.equal(seuls.ok, false);
  const devis = composerDevisGardeCorps({
    releve: { largeurMm: 900, allegeMm: 800, enEtage: true, fenetreMm: 0 }, options: { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "verre" },
    quantite: 1, livraison: { mode: "retrait" }, date: new Date("2026-10-05T10:00:00+02:00"), locale: "fr", origine: "https://auboiacier.fr",
  });
  assert.equal(devis.ok, false);
});

test("textes : devis anglais lisible pour le bois rainuré et sur fer plat ; teinte blanche accordée", () => {
  chiffrageOuEchec();
  const devis = (woodId: string, metalId: string, locale: "fr" | "en") => {
    const r = composerDevisGardeCorps({
      releve: { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 }, options: { woodId, metalId, fabricId: "fleur", remplissageId: "croix" },
      quantite: 1, livraison: { mode: "retrait" }, date: new Date("2026-10-05T10:00:00+02:00"), locale, origine: "https://auboiacier.fr",
    });
    assert.ok(r.ok);
    return JSON.stringify([r.devis.lignes.map((l) => l.designation), r.devis.piece.accroche, r.devis.piece.caracteristiques]);
  };
  for (const woodId of ["chene", "noyer-plat", "pin", "hetre-plat"]) {
    const en = devis(woodId, "noir", "en");
    assert.ok(!/(oak|walnut|pine|beech), (grooved|on flat bar)/i.test(en), `${woodId} : le libellé « bois, rainuré » ne se colle pas dans une phrase`);
    assert.match(en, /(oak|walnut|pine|beech)/i);
  }
  const blanc = devis("chene", "blanc", "fr");
  assert.ok(!/teinte blanc[^he]/i.test(blanc), "« teinte blanc » est fautif");
  assert.match(blanc, /teinte blanche/);
});

test("note de commande : les deux-points suivent la langue", () => {
  const mots = { gcMur: "Wall type", gcAllege: "Sill height", gcFenetre: "Window height", gcJourCourt: "set at" };
  const en = noteReleveGC({ etage: "Upstairs", mur: "Stone", allegeMm: 650, fenetreMm: 0, jourMm: 90 }, mots, "en");
  assert.match(en, /wall type: stone/);
  const fr = noteReleveGC({ etage: "En étage", mur: "Pierre", allegeMm: 650, fenetreMm: 0, jourMm: 90 }, { gcMur: "Type de mur", gcAllege: "Allège", gcFenetre: "Fenêtre", gcJourCourt: "posé à" });
  assert.match(fr, /type de mur : pierre/);
});

test("murs pas parallèles : les deux largeurs mesurées arrivent à l'atelier dans la note", () => {
  const mots = { gcMur: "Type de mur", gcAllege: "Allège", gcFenetre: "Fenêtre", gcJourCourt: "posé à" };
  const note = noteReleveGC({ etage: "En étage", mur: "Pierre", allegeMm: 650, fenetreMm: 0, jourMm: 90, largeurBasMm: 1180, largeurHautMm: 1172 }, mots);
  assert.match(note, /^En étage · largeur au ras de l'appui 1180 mm, à 1 m du sol 1172 mm · /);
  // Une seule largeur connue (une ligne plus ancienne) : rien n'est inventé.
  assert.doesNotMatch(noteReleveGC({ etage: "En étage", mur: "", allegeMm: 650, fenetreMm: 0, jourMm: 0, largeurBasMm: 1180 }, mots), /largeur/);
  // Deux largeurs égales (murs droits) : rien à dire, la note reste celle d'avant.
  assert.doesNotMatch(noteReleveGC({ etage: "En étage", mur: "", allegeMm: 650, fenetreMm: 0, jourMm: 0, largeurBasMm: 1180, largeurHautMm: 1180 }, mots), /largeur/);
});

test("le plan d'aperçu reste possible aux deux bouts des fenêtres étroites et larges", () => {
  chiffrageOuEchec();
  for (const [l, a] of [[300, 786], [301, 100], [1180, 650]] as const) assert.ok(planApercuGC(q(l, a)), `${l} × ${a}`);
});
