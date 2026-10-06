/**
 * LE MUR DES TABLEAUX, DE BOUT EN BOUT SUR LE SITE (décisions de Quentin, 06 et 07/10/2026) : le moteur de l'outil choisit
 * la fixation selon le mur (tests/garde-corps-fixation-mur.test.ts) ; ici, on vérifie que le site sait la lui transmettre
 * — la route du prix, le panier, la commande, le devis PDF, les favoris — avec LE MÊME PRIX partout, et que rien ne change
 * quand le mur n'est pas transmis (ce que fait le site tant que l'écran ne le demande pas).
 *
 * Comme les autres tests de prix : aucun montant figé, des règles (même prix partout, plus cher avec la fixation qui coûte).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BORNES_MUR_GC,
  T_MUR_DEFAUT_GC_MM,
  E_MUR_DEFAUT_GC_MM,
  MURS_FIXATION_GC,
  NOMS_MUR_FIXATION_GC,
  TEXTE_FIXATION_GC_MAX,
  lireMurParametresGC,
  lireReponsePrixGC,
  modeleAfficheGC,
  parametresPrixGC,
  releveDansLesBornes,
  type MurFixationGC,
  type ReleveGC,
} from "../src/lib/garde-corps.ts";
import { calculerGC, DEFAUTS_GC, type ValeursGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { valeursGC } from "../src/lib/garde-corps-outil/entree.ts";
import { catalogueGC, configurerGC, entreeValide, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { CALCUL_GC, configurationGC, ligneGC, lireRequetePrixGC, planApercuGC, reponsePrixGC, type RequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { composerDevisGardeCorps, type EntreeDevisGC } from "../src/lib/garde-corps-outil/devis-site.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { libellePiece, tarifer } from "../src/lib/tarif-panier.ts";
import { LIVRAISON, RETRAIT, type ResultatLieu } from "../src/lib/deplacement.ts";
import { numeroDevis } from "../src/lib/devis.ts";
import { lireReleveGcMemo, memoVersReleve, releveVersMemo } from "../src/lib/config-memo.ts";
import { composerFavori, encoderFavori } from "../src/lib/favoris.ts";
import { getProduct } from "../src/lib/products.ts";

function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}

const BASE = "l=1200&allege=400&etage=1&wood=chene";
const lire = (q: string) => lireRequetePrixGC(new URLSearchParams(q));
const releve = (r: Partial<ReleveGC> = {}): ReleveGC => ({ largeurMm: 1200, allegeMm: 400, enEtage: true, fenetreMm: 0, ...r });
const requete = (r: Partial<ReleveGC> = {}, q: Partial<RequetePrixGC> = {}): RequetePrixGC => ({ releve: releve(r), essence: "chene", quantite: 1, ...q });
const lieu = { distanceKm: 118.46, commune: "Nantes", precision: "adresse" as const };
const localiser = async (): Promise<ResultatLieu> => ({ ok: true, lieu });

/* ------------------------------------------------------------------ *
 *  Les constantes du site sont celles de l'outil
 * ------------------------------------------------------------------ */

test("les murs, les cotes par défaut et les noms du site sont ceux de l'outil", () => {
  assert.equal(T_MUR_DEFAUT_GC_MM, DEFAUTS_GC.tMur);
  assert.equal(E_MUR_DEFAUT_GC_MM, DEFAUTS_GC.eMur);
  assert.equal(DEFAUTS_GC.mur, "", "l'outil part d'un mur non précisé");
  assert.ok(BORNES_MUR_GC.tMurMm.min <= T_MUR_DEFAUT_GC_MM && T_MUR_DEFAUT_GC_MM <= BORNES_MUR_GC.tMurMm.max);
  assert.ok(BORNES_MUR_GC.eMurMm.min <= E_MUR_DEFAUT_GC_MM && E_MUR_DEFAUT_GC_MM <= BORNES_MUR_GC.eMurMm.max);
  const c = configurationGC(releve(), "chene") as ConfigGC;
  for (const mur of MURS_FIXATION_GC) {
    const F = calculerGC({ ...c.v, mur }).fixation as { nomMur: string } | undefined;
    assert.equal(F?.nomMur, NOMS_MUR_FIXATION_GC[mur].fr, `le nom du mur « ${mur} » est celui que l'outil écrit`);
  }
});

/* ------------------------------------------------------------------ *
 *  (a) La requête : /api/prix-garde-corps (et l'aperçu du plan, la livraison, le devis PDF, qui lisent le mur pareil)
 * ------------------------------------------------------------------ */

test("requête : chaque mur de l'outil est accepté, avec ou sans ses cotes", () => {
  for (const mur of MURS_FIXATION_GC) {
    const q = lire(`${BASE}&mur=${mur}`);
    assert.equal(q?.releve.mur, mur, mur);
    assert.equal(q?.releve.tMurMm, undefined, "une cote absente : celle de l'outil, au calcul");
  }
  const q = lire(`${BASE}&mur=beton&t=${BORNES_MUR_GC.tMurMm.min}&ep=${BORNES_MUR_GC.eMurMm.max}`);
  assert.deepEqual(q?.releve, { largeurMm: 1200, allegeMm: 400, enEtage: true, fenetreMm: 0, mur: "beton", tMurMm: BORNES_MUR_GC.tMurMm.min, eMurMm: BORNES_MUR_GC.eMurMm.max });
  assert.equal(lire(`${BASE}&mur=pierre-dure&ep=600`)?.releve.eMurMm, 600);
  // Sans mur : le relevé d'avant, sans aucun champ de mur.
  assert.deepEqual(Object.keys(lire(BASE)!.releve).sort(), ["allegeMm", "enEtage", "fenetreMm", "largeurMm"]);
});

test("requête : un mur inconnu, une cote hors bornes ou une cote sans mur sont refusés", () => {
  for (const q of [
    "mur=granit", "mur=BETON", "mur=", "mur=beton&mur=brique", "mur=pierre",           // un mur que l'outil ne connaît pas (« pierre » : tuffeau, pierre dure ou moellons)
    `mur=beton&t=${BORNES_MUR_GC.tMurMm.min - 1}`, `mur=beton&t=${BORNES_MUR_GC.tMurMm.max + 1}`,
    "mur=beton&t=180.5", "mur=beton&t=-5", "mur=beton&t=1e2", "mur=beton&t=", "mur=beton&t=abc",
    `mur=moellons&ep=${BORNES_MUR_GC.eMurMm.min - 1}`, `mur=moellons&ep=${BORNES_MUR_GC.eMurMm.max + 1}`, "mur=moellons&ep=450mm",
    "t=180", "ep=450", "t=180&ep=450",                                                     // une cote sans mur
  ]) assert.equal(lire(`${BASE}&${q}`), null, q);
  assert.equal(lireMurParametresGC(new URLSearchParams("t=180")), null);
  assert.deepEqual(lireMurParametresGC(new URLSearchParams("")), {});
});

test("requête : l'adresse fabriquée par la fiche se relit à l'identique, et n'a pas de mur quand le client n'en a pas donné", () => {
  for (const r of [releve(), releve({ mur: "tuffeau" }), releve({ mur: "beton", tMurMm: 90 }), releve({ mur: "moellons", tMurMm: 120, eMurMm: 600, modele: "16-4" })]) {
    const p = parametresPrixGC(r, { woodId: "chene" });
    assert.deepEqual(lireRequetePrixGC(p)?.releve, r);
    assert.equal(p.has("mur"), r.mur !== undefined);
  }
  // Le relevé lui-même : mêmes règles que l'adresse.
  assert.equal(releveDansLesBornes(releve({ mur: "beton" })), true);
  assert.equal(releveDansLesBornes(releve({ tMurMm: 80 })), false, "une cote sans mur");
  assert.equal(releveDansLesBornes(releve({ mur: "granit" as MurFixationGC })), false);
  assert.equal(releveDansLesBornes(releve({ mur: "beton", eMurMm: 1000 })), false);
  assert.equal(entreeValide({ ...releve({ mur: "beton", tMurMm: 19 }), essence: "chene" }), false);
  assert.throws(() => configurerGC({ ...releve({ mur: "granit" as MurFixationGC }), essence: "chene" }), RangeError);
});

/* ------------------------------------------------------------------ *
 *  (b) La réponse : la fixation, relue par le navigateur
 * ------------------------------------------------------------------ */

test("réponse : la fixation retenue (statut, mur, texte de l'outil), relue telle quelle par la fiche ; jamais un coût", () => {
  chiffrageOuEchec();
  for (const [mur, statut] of [["beton", "valide"], ["brique", "valide"], ["pierre-dure", "valide"], ["enduit", "indicatif"]] as const) {
    const r = reponsePrixGC(requete({ mur }));
    assert.ok(r?.ok, mur);
    assert.deepEqual(Object.keys(r.fixation ?? {}).sort(), ["mur", "statut", "texte"]);
    assert.equal(r.fixation?.statut, statut, mur);
    assert.equal(r.fixation?.mur, mur);
    assert.ok(r.fixation.texte.length > 20 && r.fixation.texte.length <= TEXTE_FIXATION_GC_MAX);
    assert.doesNotMatch(r.fixation.texte, /€|prix d'achat/i, "le texte de l'outil ne dit aucun coût");
    // Ce que la route envoie (JSON) est ce que la fiche relit.
    assert.deepEqual(lireReponsePrixGC(JSON.parse(JSON.stringify(r))), r, mur);
  }
  // Le placo : sur étude, pas de prix — et la fiche sait pourquoi (le garde-corps se fixe dehors).
  const placo = reponsePrixGC(requete({ mur: "placo" }));
  assert.ok(placo && !placo.ok);
  assert.equal(placo.raison, "a-etudier");
  assert.ok(placo.alertes.includes("fixation"));
  assert.equal(placo.fixation?.statut, "etude");
  assert.match(placo.fixation!.texte, /placo est à l'intérieur/);
  assert.deepEqual(lireReponsePrixGC(JSON.parse(JSON.stringify(placo))), placo);
  // Sans mur : pas de champ « fixation » du tout (la réponse d'avant).
  const sans = reponsePrixGC(requete());
  assert.ok(sans?.ok);
  assert.equal("fixation" in sans, false);
});

test("réponse : une fixation mal formée n'est jamais devinée ; une réponse sans fixation se lit comme avant", () => {
  chiffrageOuEchec();
  const r = JSON.parse(JSON.stringify(reponsePrixGC(requete({ mur: "beton" }))));
  assert.ok(lireReponsePrixGC(r));
  for (const fixation of [
    { ...r.fixation, statut: "essais" },
    { ...r.fixation, statut: "etude" },                       // un prix ET une fixation sur étude : contradictoire
    { ...r.fixation, mur: "granit" },
    { ...r.fixation, texte: "x".repeat(TEXTE_FIXATION_GC_MAX + 1) },
    { ...r.fixation, texte: 3 },
    null,
    "beton",
  ]) assert.equal(lireReponsePrixGC({ ...r, fixation }), null, JSON.stringify(fixation)?.slice(0, 60));
  // Des champs en trop dans la fixation ne passent pas.
  assert.deepEqual(lireReponsePrixGC({ ...r, fixation: { ...r.fixation, cout: 12 } })?.fixation, r.fixation);
  const { fixation: _f, ...sans } = r;
  void _f;
  const lu = lireReponsePrixGC(sans);
  assert.ok(lu?.ok);
  assert.equal("fixation" in lu, false);
});

/* ------------------------------------------------------------------ *
 *  (c) LE PRIX : la route = le panier = la commande = le devis PDF
 * ------------------------------------------------------------------ */

const RELEVES_PRIX: ReleveGC[] = [releve(), releve({ largeurMm: 1800, allegeMm: 300 }), releve({ largeurMm: 1000, allegeMm: 650, fenetreMm: 1400 })];
const MURS_PRIX: MurFixationGC[] = ["beton", "brique", "enduit"];

/** La ligne du panier pour ce relevé, telle que la fiche l'ajoute (cart.tsx, cart-view.tsx). */
const ligneDuPanier = (r: ReleveGC, quantity = 1) => ({
  slug: "garde-corps",
  largeurMm: r.largeurMm,
  allegeMm: r.allegeMm,
  enEtage: r.enEtage,
  fenetreMm: r.fenetreMm,
  modeleGc: r.modele,
  murGc: r.mur,
  tMurMm: r.tMurMm,
  eMurMm: r.eMurMm,
  woodId: "chene",
  metalId: "noir",
  fabricId: "fleur",
  remplissageId: "croix",
  quantity,
});
const devis = (r: ReleveGC, e: Partial<EntreeDevisGC> = {}) => {
  const d = composerDevisGardeCorps({ releve: r, options: { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" }, quantite: 1, livraison: { mode: "retrait" }, date: new Date("2026-10-07T10:00:00+02:00"), locale: "fr", origine: "https://auboiacier.fr", ...e });
  assert.ok(d.ok, `pas de devis : ${JSON.stringify(r)} ${d.ok ? "" : d.reason}`);
  return d.devis;
};

test("prix : avec un mur, la route, le panier (donc la commande) et le devis PDF disent le même prix", async () => {
  chiffrageOuEchec();
  for (const base of RELEVES_PRIX) for (const mur of MURS_PRIX) {
    const r0 = { ...base, mur };
    const route = reponsePrixGC({ releve: r0, essence: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix", quantite: 1 });
    assert.ok(route?.ok, `${JSON.stringify(r0)} : la route devait donner un prix`);
    // Le modèle montré par la fiche (le moins cher) : c'est lui qui part au panier et au devis.
    const r = { ...r0, modele: modeleAfficheGC(route) };
    const ctx = `${JSON.stringify(r)}`;
    const ligne = ligneGC(r, { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" });
    assert.ok(ligne.ok && ligne.line.gc, ctx);
    assert.equal(ligne.line.unitPrice, route.prix, `${ctx} : route = ligne`);
    assert.equal(ligne.line.gc.releve.mur, mur, "le mur arrive jusqu'au relevé chiffré");
    // Le panier : /api/panier/tarif et /api/commande appellent cette même fonction.
    const panier = await tarifer([ligneDuPanier(r), { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
    assert.equal(panier.probleme, null, ctx);
    assert.deepEqual(panier.refusees, [], ctx);
    assert.equal(panier.pieces[0].line.unitPrice, route.prix, `${ctx} : route = panier`);
    assert.equal(panier.total, route.prix, `${ctx} : total du panier`);
    // Le devis PDF (retrait : pas de livraison).
    assert.equal(devis(r).total, route.prix, `${ctx} : route = devis`);
    // Le libellé de la commande dit la fixation retenue.
    assert.match(libellePiece(panier.pieces[0]), new RegExp(`fixation ${NOMS_MUR_FIXATION_GC[mur].fr.replace(/[()]/g, "\\$&")}`), ctx);
  }
});

test("prix : la fixation dans le mur se paie (résine, inox, platines, temps) — plus cher qu'avec les vis d'avant", async () => {
  chiffrageOuEchec();
  for (const base of RELEVES_PRIX) for (const mur of MURS_PRIX) {
    const route = reponsePrixGC(requete({ ...base, mur }));
    assert.ok(route?.ok);
    // Le même dessin, sans mur : le prix d'avant.
    const options = { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" };
    const avec = ligneGC({ ...base, mur, modele: modeleAfficheGC(route) }, options);
    const sans = ligneGC({ ...base, modele: modeleAfficheGC(route) }, options);
    assert.ok(avec.ok && sans.ok);
    assert.ok(avec.line.unitPrice > sans.line.unitPrice, `${JSON.stringify(base)} ${mur} : ${avec.line.unitPrice} € contre ${sans.line.unitPrice} € sans mur`);
    // Les platines pèsent : le colis aussi (la livraison se calcule sur ce poids, au panier comme au devis).
    assert.ok(avec.line.gc!.kg >= sans.line.gc!.kg);
  }
});

test("prix : plusieurs pièces et la livraison par transporteur — la remise et le colis du panier sont ceux du devis et de la route", async () => {
  chiffrageOuEchec();
  for (const mur of ["brique", "pierre-dure"] as const) {
    const route = reponsePrixGC(requete({ mur }, { metalId: "noir", fabricId: "fleur", remplissageId: "croix", quantite: 3 }));
    assert.ok(route?.ok);
    const r = releve({ mur, modele: modeleAfficheGC(route), ...(mur === "pierre-dure" ? { eMurMm: 600 } : {}) });
    const panier = await tarifer([ligneDuPanier(r, 3), { slug: LIVRAISON, livraisonCp: "44000" }], { locale: "fr", gc: CALCUL_GC, localiser });
    assert.equal(panier.probleme, null);
    const d = devis(r, { quantite: 3, livraison: { mode: "transporteur", codePostal: "44000", lieu } });
    assert.equal(d.total, panier.total, `${mur} : devis = panier`);
    assert.equal(d.lignes.find((l) => /^Plusieurs garde-corps/.test(l.designation))?.total ?? 0, panier.remise);
    if (mur === "brique") assert.equal(panier.remise, route.remise, "la remise affichée par la fiche est celle du panier");
  }
});

test("libellé de la commande et devis anglais : la fixation retenue, dans la langue du client", async () => {
  chiffrageOuEchec();
  const r = releve({ mur: "beton", modele: "16-6" });
  const fr = await tarifer([ligneDuPanier(r), { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
  const en = await tarifer([ligneDuPanier(r), { slug: RETRAIT }], { locale: "en", gc: CALCUL_GC, localiser });
  assert.match(fr.pieces[0].options, /fixation béton : (tiges M8|platines) scellées/);
  assert.match(en.pieces[0].options, /concrete wall fixing: bonded/);
  assert.equal(fr.total, en.total);
  const inconnu = await tarifer([ligneDuPanier(releve({ mur: "enduit", modele: "16-6" })), { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
  assert.match(inconnu.pieces[0].options, /fixation mur inconnu \(enduit\) : platines scellées \(à confirmer\)/);
  // Le devis : « Pose » dit la fixation (l'outil), et « Installation » aussi en anglais — jamais les vis et chevilles d'avant.
  const pose = devis(r).piece.caracteristiques.find((c) => c.label === "Pose");
  assert.match(pose!.value, /Fixation adaptée à votre mur \(béton\)/);
  const installation = devis(r, { locale: "en" }).piece.caracteristiques.find((c) => c.label === "Installation");
  assert.match(installation!.value, /Fixing suited to your wall \(concrete\)/);
  assert.doesNotMatch(installation!.value, /screws and plugs/);
  assert.match(devis(releve({ modele: "16-6" }), { locale: "en" }).piece.caracteristiques.find((c) => c.label === "Installation")!.value, /countersunk screws and plugs/, "sans mur : comme avant");
});

test("devis : mur inconnu (enduit), le prix est indicatif — le devis le dit, en français et en anglais, comme la route et la commande", () => {
  chiffrageOuEchec();
  const r = releve({ largeurMm: 1200, allegeMm: 400, mur: "enduit", modele: "16-6" });
  const route = reponsePrixGC(requete({ mur: "enduit" }));
  assert.equal(route?.fixation?.statut, "indicatif", "la route le dit déjà");
  const fr = devis(r);
  const en = devis(r, { locale: "en" });
  assert.equal(fr.total, en.total);
  // « Pose » : le texte de l'outil pour le client (texteClient), une seule fois.
  const poseFr = fr.piece.caracteristiques.find((c) => c.label === "Pose")!.value;
  assert.match(poseFr, /Prix indicatif : nous confirmerons la fixation avec la photo de votre tableau\.$/);
  assert.equal(poseFr.match(/indicatif/gi)?.length, 1, "la réserve n'est dite qu'une fois");
  assert.match(en.piece.caracteristiques.find((c) => c.label === "Installation")!.value, /Indicative price: we will confirm the fixing with a photo of your window reveal\.$/);
  // Les conditions : juste après la validité de trente jours, qui ne fige donc pas la fixation.
  const fr2 = fr.conditions.findIndex((c) => c.startsWith("Devis valable"));
  assert.match(fr.conditions[fr2 + 1], /^Prix indicatif pour la fixation : le mur des tableaux n'est pas encore connu\./);
  const en2 = en.conditions.findIndex((c) => c.startsWith("Quote valid for"));
  assert.match(en.conditions[en2 + 1], /^Indicative price for the fixing: the wall of the window reveals is not known yet\./);
  assert.equal(fr.conditions.length, en.conditions.length);
  // Un mur connu : un prix ferme, sans réserve — et sans mur, les conditions de l'outil telles quelles.
  for (const mur of ["beton", "brique"] as const) {
    assert.doesNotMatch(JSON.stringify(devis({ ...r, mur })), /indicatif|confirmé avec la photo/, mur);
    assert.doesNotMatch(JSON.stringify(devis({ ...r, mur }, { locale: "en" })), /indicative|confirmed from a photo/i, mur);
  }
  assert.equal(devis(releve({ modele: "16-6" })).conditions.length, fr.conditions.length - 1);
});

test("panier : un mur illisible est refusé, jamais remplacé en silence par la fixation d'avant", async () => {
  chiffrageOuEchec();
  const r = releve({ modele: "16-6" });
  for (const mur of [
    { murGc: "granit" }, { murGc: "beton", tMurMm: 10 }, { murGc: "beton", tMurMm: "80" }, { murGc: "beton", eMurMm: 2000 }, { tMurMm: 80 }, { eMurMm: 450 },
    // Un mur qui n'est pas une chaîne lisible, sans aucune cote : refusé aussi (avant, la ligne passait au prix sans mur, sans fixation).
    { murGc: 1 }, { murGc: true }, { murGc: ["beton"] }, { murGc: { a: 1 } }, { murGc: "  " }, { murGc: "" }, { murGc: 0 }, { murGc: false },
  ]) {
    const t = await tarifer([{ ...ligneDuPanier(r), ...mur }, { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
    assert.deepEqual(t.refusees.map((x) => x.raison), ["unknown_size", "orphelin"], JSON.stringify(mur));
  }
  // Un mur absent (ou null, ce que JSON garde d'un champ vide) : la ligne d'avant, au prix sans mur.
  for (const absent of [{ murGc: undefined }, { murGc: null }]) {
    const t = await tarifer([{ ...ligneDuPanier(r), ...absent }, { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
    assert.deepEqual(t.refusees, [], JSON.stringify(absent));
  }
  // Sur étude dans ce mur : pas de vente.
  const placo = await tarifer([{ ...ligneDuPanier(r), murGc: "placo" }, { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
  assert.equal(placo.refusees[0]?.raison, "a_etudier");
});

/* ------------------------------------------------------------------ *
 *  Le temps de calcul : des pattes seulement quand elles peuvent aider
 * ------------------------------------------------------------------ */

test("temps : un mur « sur étude » quelle que soit la poussée (placo, tableau trop peu profond, montant trop court) n'essaie pas les pattes", async () => {
  chiffrageOuEchec();
  // Les relevés de la relecture (07/10/2026) : la route prenait 7 à 8 s (1 à 3 s sans mur), un panier de 19 fenêtres en placo 11 à 18 s
  // (0,1 s sans mur) — le fil du serveur bloqué pour tous les visiteurs. Des relevés jamais vus ici (rien en mémoire).
  for (const [largeurMm, allegeMm, mur, raison] of [
    [801, 781, "placo", /placo est à l'intérieur/],
    [1003, 751, "placo", /placo est à l'intérieur/],
    [805, 779, "beton-cellulaire", /fixation à étudier/],
    [807, 777, "brique-creuse", /poteau en béton/],
    [809, 775, "parpaing", /poteau en béton/],
  ] as const) {
    const debut = performance.now();
    const r = reponsePrixGC(requete({ largeurMm, allegeMm, mur }));
    const ms = performance.now() - debut;
    assert.ok(r && !r.ok && r.alertes.includes("fixation"), `${largeurMm} × ${allegeMm}, ${mur}`);
    assert.equal(r.fixation?.statut, "etude");
    assert.match(r.fixation!.texte, raison);
    assert.ok(r.modeles.length > 0 && r.modeles.every((m) => !m.conforme), "aucun modèle ne se vend dans ce mur");
    assert.ok(ms < 3000, `${largeurMm} × ${allegeMm}, ${mur} : ${Math.round(ms)} ms pour la route (avant : 7 à 8 s)`);
  }
  // Le panier de 19 fenêtres en placo, sans modèle choisi (la recherche complète, pour chacune).
  const lignes = Array.from({ length: 19 }, (_, i) => ({ ...ligneDuPanier(releve({ largeurMm: 811 + 7 * i, allegeMm: 780 - i })), murGc: "placo" }));
  const debut = performance.now();
  const t = await tarifer([...lignes, { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
  const ms = performance.now() - debut;
  assert.deepEqual(t.refusees.slice(0, 19).map((x) => x.raison), Array(19).fill("a_etudier"));
  assert.ok(ms < 3000, `panier de 19 fenêtres en placo : ${Math.round(ms)} ms (avant : 11 à 18 s)`);
});

test("pattes : un mur que seule la poussée met « sur étude » garde ses pattes (béton près de l'arête, brique creuse, parpaing, tuffeau)", () => {
  chiffrageOuEchec();
  // Ce que la recherche complète trouvait avant le contrôle (balayage du 07/10/2026) : le contrôle ne doit rien enlever.
  // Béton, tableau de 120 mm : la platine n'y tient pas (60 mm de l'arête + 75 de la fenêtre) et l'outil n'écrit que son
  // refus, mais la tige du premier montage (40 mm de l'arête) passe une fois soulagée par les pattes.
  for (const [r, essence, attendu] of [
    [releve({ largeurMm: 2200, allegeMm: 700, mur: "beton", tMurMm: 120 }), "chene-plat", { croix: 5, carre: 18, patte: 2 }],
    [releve({ largeurMm: 500, allegeMm: 0, mur: "brique-creuse" }), "chene", { croix: 5, carre: 16, patte: 2 }],
    [releve({ largeurMm: 801, allegeMm: 0, mur: "parpaing" }), "chene", { croix: 4, carre: 18, patte: 3 }],
    [releve({ largeurMm: 1000, allegeMm: 700, mur: "tuffeau" }), "chene", { croix: 2, carre: 18, patte: 1 }],
    [releve({ largeurMm: 1500, allegeMm: 700, mur: "brique", tMurMm: 135 }), "chene", { croix: 3, carre: 16, patte: 2 }],   // tiges à 60 mm de l'arête
  ] as const) {
    const c = configurerGC({ ...r, essence });
    assert.ok(c.ok, `${JSON.stringify(r)} : plus de garde-corps`);
    assert.deepEqual({ croix: c.croix, carre: c.carre, patte: c.patte }, attendu, JSON.stringify(r));
    assert.equal((c.R.fixation as { statut: string }).statut, "valide");
    // Sans mur, pas de patte : c'est le mur qui les demande.
    const sansMur = configurerGC({ largeurMm: r.largeurMm, allegeMm: r.allegeMm, enEtage: r.enEtage, fenetreMm: r.fenetreMm, essence });
    assert.ok(sansMur.ok && sansMur.patte === 0, JSON.stringify(r));
    // Le même garde-corps sans ses pattes : la fixation dans le mur ne tient plus (trop de poussée) — ce sont bien elles qui la sauvent.
    const sansPatte = calculerGC({ ...c.v, patte: 0 }).fixation as { statut: string; texte: string };
    assert.equal(sansPatte.statut, "etude", JSON.stringify(r));
  }
});

/* ------------------------------------------------------------------ *
 *  (d) La mémoire du calcul : un autre mur, un autre résultat
 * ------------------------------------------------------------------ */

test("mémoire : le même relevé dans deux murs (ou à deux cotes du mur) ne partage jamais un résultat", () => {
  chiffrageOuEchec();
  const e = { ...releve(), essence: "chene" as const };
  // Dans un ordre, puis dans l'autre : la mémoire ne doit rien changer.
  const sans1 = configurerGC(e);
  const beton = configurerGC({ ...e, mur: "beton" });
  const brique = configurerGC({ ...e, mur: "brique" });
  const sans2 = configurerGC(e);
  assert.ok(sans1.ok && beton.ok && brique.ok && sans2.ok);
  assert.equal(sans1, sans2, "sans mur : le même résultat qu'avant les murs");
  assert.equal(sans1.entree.mur, undefined);
  assert.equal(beton.entree.mur, "beton");
  assert.notEqual(prixGC(beton), prixGC(brique));
  assert.notEqual(prixGC(beton), prixGC(sans1));
  assert.equal((beton.R.fixation as { mur: string }).mur, "beton");
  assert.equal((brique.R.fixation as { mur: string }).mur, "brique");
  assert.equal(sans1.R.fixation, undefined);
  // La profondeur du tableau : 135 mm, la tige tient ; 100 mm, plus de place pour elle (étude) — deux résultats distincts.
  const pres = configurerGC({ ...e, mur: "beton", tMurMm: 100 });
  assert.ok(!pres.ok && pres.alertes.includes("fixation"));
  assert.ok(configurerGC({ ...e, mur: "beton", tMurMm: 135 }).ok);
  // L'épaisseur du mur : la longueur des tiges traversantes change (le débit).
  const mince = configurerGC({ ...e, mur: "moellons", eMurMm: 300 });
  const epais = configurerGC({ ...e, mur: "moellons", eMurMm: 700 });
  assert.ok(mince.ok && epais.ok);
  const tiges = (c: ConfigGC) => c.R.debit.find((d) => /^Tige filetée M10/.test(d.nom))?.nom;
  assert.notEqual(tiges(mince), tiges(epais));
  // Le catalogue aussi : dans le placo, aucun dessin ne se vend ; sans mur, si.
  assert.ok(catalogueGC(e).some((d) => d.conforme));
  const placo = catalogueGC({ ...e, mur: "placo" });
  assert.ok(placo.length > 0 && placo.every((d) => !d.conforme));
  assert.ok(placo.some((d) => !d.conforme && d.raisons.includes("fixation")));
  assert.ok(catalogueGC(e).some((d) => d.conforme), "et sans mur, encore après");
});

test("mémoire : l'aperçu du plan et la réponse de la route suivent le mur (pas celui d'une demande précédente)", () => {
  chiffrageOuEchec();
  const avec = reponsePrixGC(requete({ mur: "brique" }));
  const sans = reponsePrixGC(requete());
  const avec2 = reponsePrixGC(requete({ mur: "brique" }));
  assert.ok(avec?.ok && sans?.ok && avec2?.ok);
  assert.ok(avec.prix > sans.prix);
  assert.deepEqual(avec2, avec);
  assert.equal("fixation" in sans, false);
  // L'aperçu du plan : dessiné pour le garde-corps vendu dans ce mur ; aucun plan quand le mur le met « à étudier ».
  const date = new Date("2026-10-07T10:00:00+02:00");
  const plan = planApercuGC(requete({ mur: "brique" }), date);
  assert.ok(plan?.svg.startsWith("<svg "));
  assert.equal(plan?.croix, avec.croix);
  assert.equal(planApercuGC(requete({ mur: "placo" }), date), null);
  assert.ok(planApercuGC(requete(), date), "sans mur : le plan d'avant");
});

/* ------------------------------------------------------------------ *
 *  (e) Sans mur : rien ne change
 * ------------------------------------------------------------------ */

test("sans mur : les réglages donnés à l'outil, l'adresse, le numéro de devis et le libellé sont ceux d'avant", async () => {
  chiffrageOuEchec();
  const e = { ...releve(), essence: "chene" as const };
  const v = valeursGC(DEFAUTS_GC, e, 16, 3) as ValeursGC;
  assert.equal(v.mur, "");
  assert.equal(v.tMur, DEFAUTS_GC.tMur);
  assert.equal(v.eMur, DEFAUTS_GC.eMur);
  // Avec un mur : le mur et les cotes (par défaut celles de l'outil), rien d'autre ne bouge.
  const vm = valeursGC(DEFAUTS_GC, { ...e, mur: "tuffeau", tMurMm: 90 }, 16, 3) as ValeursGC;
  assert.deepEqual({ ...vm, mur: "", tMur: DEFAUTS_GC.tMur, eMur: DEFAUTS_GC.eMur }, v);
  assert.equal(vm.mur, "tuffeau");
  assert.equal(vm.tMur, 90);
  assert.equal(vm.eMur, E_MUR_DEFAUT_GC_MM);
  // L'adresse de la route.
  assert.equal(parametresPrixGC(releve(), { woodId: "chene" }).toString(), "l=1200&allege=400&etage=1&fenetre=0&wood=chene");
  // Le numéro du devis : sans mur, inchangé ; avec un mur, un autre.
  const selection = { slug: "garde-corps", sizeId: "sur-mesure", woodId: "chene", largeurMm: 1200, hauteurMm: 500, allegeMm: 400, enEtage: true, fenetreMm: 0, modeleGc: "16-6" };
  const date = new Date("2026-10-07T10:00:00+02:00");
  const numero = (s: Record<string, unknown>) => numeroDevis({ selection: { ...selection, ...s }, quantity: 1, livraison: { mode: "retrait" }, date });
  assert.equal(numero({ murGc: undefined }), numero({}));
  assert.notEqual(numero({ murGc: "beton" }), numero({}));
  assert.notEqual(numero({ murGc: "beton" }), numero({ murGc: "brique" }));
  assert.notEqual(numero({ murGc: "beton", tMurMm: 80 }), numero({ murGc: "beton" }));
  // Le libellé : pas un mot de fixation.
  const t = await tarifer([ligneDuPanier(releve({ modele: "16-6" })), { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser });
  assert.doesNotMatch(t.pieces[0].options, /fixation/);
});

/* ------------------------------------------------------------------ *
 *  Les favoris et le retour de la création de compte
 * ------------------------------------------------------------------ */

test("favoris : le mur de la fixation et ses cotes se gardent, relus par liste blanche, et le favori le plus chargé tient chez Stripe", () => {
  const lu = lireReleveGcMemo({ gcMurFixation: "pierre-dure", gcTMurMm: 120, gcEMurMm: 600 });
  assert.equal(lu.gcMurFixation, "pierre-dure");
  assert.equal(lu.gcTMurMm, 120);
  assert.equal(lu.gcEMurMm, 600);
  assert.equal(lireReleveGcMemo({ gcMurFixation: "granit", gcTMurMm: 120 }).gcTMurMm, undefined, "pas de cote sans mur");
  assert.equal(lireReleveGcMemo({ gcMurFixation: "granit" }).gcMurFixation, undefined);
  assert.equal(lireReleveGcMemo({ gcMurFixation: "beton", gcTMurMm: 10 }).gcTMurMm, undefined, "hors bornes");
  // Les cases du relevé, aller et retour.
  const mots = { gcEtageOptions: ["En étage", "Au rez-de-chaussée"], gcMurOptions: ["Pierre"] };
  const cases = { etage: "En étage", largeur: "1200", allege: "400", fenetre: "", mur: "", murFixation: "moellons", tMur: "90", eMur: "600" };
  const memo = releveVersMemo(cases, mots);
  assert.deepEqual([memo.gcMurFixation, memo.gcTMurMm, memo.gcEMurMm], ["moellons", 90, 600]);
  const retour = memoVersReleve(memo, mots);
  assert.deepEqual([retour.murFixation, retour.tMur, retour.eMur], ["moellons", "90", "600"]);
  // Le favori le plus chargé (les ids les plus longs, toutes les cotes aux bornes, le mur au nom le plus long).
  const produit = getProduct("garde-corps")!;
  const plusLong = (mots: readonly string[]) => mots.reduce((a, b) => (b.length > a.length ? b : a), "");
  const ids = (o: readonly { id: string }[] | undefined) => (o ?? []).map((x) => x.id);
  const config = {
    slug: "garde-corps",
    woodId: plusLong(ids(produit.woods)),
    metalId: plusLong(ids(produit.metals)),
    fabricId: plusLong(ids(produit.fabrics)),
    remplissageId: plusLong(ids(produit.remplissages)),
    quantity: 10,
    codePostal: "49400",
    poseVoulue: false,
    modeLivraison: "transporteur",
    gcLargeurMm: 3000,
    gcLargeurHautMm: 3000,
    gcAllegeMm: 1200,
    gcFenetreMm: 3000,
    gcEnEtage: false,
    gcMur: "Je ne sais pas (enduit)",
    gcModele: "16-5-b",
    gcMurFixation: plusLong(MURS_FIXATION_GC),
    gcTMurMm: BORNES_MUR_GC.tMurMm.max,
    gcEMurMm: BORNES_MUR_GC.eMurMm.max,
  };
  const favori = composerFavori({ slug: "garde-corps", titre: plusLong([produit.name, produit.en?.name ?? ""]), resume: "Fenêtre de 3000 mm · ".padEnd(120, "Chêne massif · "), prixCents: 999_999, config, maintenantS: 1_760_000_000 });
  assert.ok(favori, "trop long pour Stripe : le favori serait refusé");
  assert.ok(encoderFavori(favori).length <= 500);
  assert.equal(favori.config.gcMurFixation, plusLong(MURS_FIXATION_GC));
  assert.equal(favori.config.gcEMurMm, BORNES_MUR_GC.eMurMm.max);
});
