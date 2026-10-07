/**
 * LE DÉCOR À VOLUTES du garde-corps de fenêtre (demande de Quentin, 06/10/2026 : la bibliothèque de styles de l'outil de
 * plans — volutes entre les barreaux, frise, anneaux, grille, cœurs, médaillon, applique). Le moteur, la norme et les dessins
 * sont ceux de l'outil (moteur.genere.mjs, comparé à l'outil par garde-corps-outil.test.ts) ; ces tests vérifient ce que le
 * site en fait :
 * - l'identifiant du décor, lu et écrit, et tout le reste refusé ; les listes du site sont celles de l'outil ;
 * - le prix : celui de la configuration avec décor, le premier carré de l'atelier où le calcul COMPLET de l'outil n'a aucune
 *   alerte (parité), sans jamais toucher au reste : sans décor rien ne change, le catalogue des modèles est le même avec ou
 *   sans décor, le prix d'appel (« Dès … ») et le moins cher proposé d'office n'en dépendent pas ;
 * - le panier, la commande, le devis : même prix que la route, le décor nommé en français et en anglais ;
 * - les traits du décor envoyés au navigateur : bornés, relus, jamais un coût.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

import { DECOR_NOMS, DEFAUTS_GC, MT_AVEC, MT_CHOIX, MT_NOMS, calculerGC, decorActif, type ValeursGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { chargerChiffrage, texteDuChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { configurerGC, prixCommandeGC, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { CARRES_RENFORT_SEULS, codeAlerte, ORDRE_CARRES, valeursGC, type EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";
import { CALCUL_GC, FENETRE_APPEL_GC, ligneGC, lireRequetePrixGC, PARAMETRES_PRIX_GC, planApercuGC, prixAppelGC, prixDepart, reponsePrixGC, SLUG_GC, SLUG_GC_FORGE } from "../src/lib/garde-corps-outil/site.ts";
import { composerDevisGardeCorps, devisOutil, type EntreeDevisGC } from "../src/lib/garde-corps-outil/devis-site.ts";
import { DECORS_GC, type AssemblageDecorGC } from "../src/lib/garde-corps-decors.genere.ts";
import {
  DECOR_NOMBRES_MAX,
  decorParDefautGC,
  finitionsDecorGC,
  idDecorGC,
  lireDecorGC,
  lireReponsePrixGC,
  NOM_GC_DECOR,
  nomDecorAnglaisGC,
  parametresPrixGC,
  releveDansLesBornes,
  type ChoixDecorGC,
  type ReleveGC,
} from "../src/lib/garde-corps.ts";
import { lireReleveGcMemo, memoVersReleve, releveVersMemo } from "../src/lib/config-memo.ts";
import { composerFavori, encoderFavori } from "../src/lib/favoris.ts";
import { libellePiece, tarifer } from "../src/lib/tarif-panier.ts";
import { nomsStripe, MAX_NOM_STRIPE } from "../src/lib/libelle-stripe.ts";
import { getProduct } from "../src/lib/products.ts";
import { ENTREPRISE } from "../src/lib/entreprise.ts";
import { RETRAIT, type ResultatLieu } from "../src/lib/deplacement.ts";
import { chainesSecretes, DECLARATIONS_COUTS, secretsDans } from "../scripts/outil-plans/secrets.mjs";

const J = (x: unknown) => JSON.stringify(x);
const court = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);

function chiffrageOuEchec() {
  const etat = chargerChiffrage();
  if (!etat.ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
  return etat.chiffrage;
}

/** Tous les décors possibles : chaque assemblage, chaque forme permise, chaque finition. */
function tousLesDecors(): ChoixDecorGC[] {
  const out: ChoixDecorGC[] = [];
  for (const { id: assemblage } of DECORS_GC.assemblages) for (const forme of DECORS_GC.formes[assemblage]) {
    for (const { id: bouts } of DECORS_GC.bouts) for (const { id: liaison } of DECORS_GC.liaisons) for (const { id: barreaux } of DECORS_GC.barreaux) {
      for (const { id: friseBasse } of DECORS_GC.frisesBasses) for (const dore of [false, true]) out.push({ assemblage, forme, bouts, liaison, barreaux, friseBasse, dore });
    }
  }
  return out;
}
const ASSEMBLAGES = DECORS_GC.assemblages.map((a) => a.id);
const parDefaut = (a: AssemblageDecorGC) => idDecorGC(decorParDefautGC(a));
const e = (largeurMm: number, allegeMm: number, decor?: string, essence: EntreeSiteGC["essence"] = "chene", enEtage = true, fenetreMm = 0): EntreeSiteGC => ({
  largeurMm, allegeMm, enEtage, fenetreMm, essence, ...(decor ? { decor } : {}),
});
const requete = (q: string) => {
  const r = lireRequetePrixGC(new URLSearchParams(q));
  assert.ok(r, q);
  return r;
};

/* ------------------------------------------------------------------ *
 *  L'identifiant et les listes
 * ------------------------------------------------------------------ */

test("l'identifiant d'un décor se lit et s'écrit à l'identique, pour tous les décors possibles", () => {
  const tous = tousLesDecors();
  // 16 dessins × 3 bouts × 1 liaison (la soudure seule, 07/10/2026) × 3 barreaux × 2 frises basses × 2 dorures.
  assert.ok(tous.length >= 16 * 3 * 1 * 3 * 2 * 2, `${tous.length} décors`);
  const vus = new Set<string>();
  for (const c of tous) {
    const id = idDecorGC(c);
    assert.ok(id.length <= 64, id);
    assert.deepEqual(lireDecorGC(id), c, id);
    assert.equal(idDecorGC(lireDecorGC(id)!), id);
    assert.ok(!vus.has(id), `deux décors, un seul identifiant : ${id}`);
    vus.add(id);
  }
  assert.equal(idDecorGC(decorParDefautGC("frise")), "frise.S.bouton.soudure.carre.aucune.0");
});

test("un identifiant d'avant le 07/10/2026, avec des colliers, se relit en soudure (la seule liaison de l'atelier)", () => {
  const d = lireDecorGC("frise.S.bouton.colliers.carre.aucune.0");
  assert.ok(d);
  assert.equal(d.liaison, "soudure");
  assert.equal(idDecorGC(d), "frise.S.bouton.soudure.carre.aucune.0");
  assert.deepEqual(DECORS_GC.liaisons.map((l) => l.id), ["soudure"]);
});

test("un identifiant de décor inconnu, incomplet ou forgé est refusé", () => {
  const bon = "entre.C.bouton.soudure.carre.aucune.0";
  assert.ok(lireDecorGC(bon));
  for (const mauvais of [
    "", "aucun", "barreaux.C.bouton.soudure.carre.aucune.0", "entre.coeur.bouton.soudure.carre.aucune.0", "anneaux.C.bouton.soudure.carre.aucune.0",
    "coeurs.C.bouton.soudure.carre.aucune.0", "entre.C.pointu.soudure.carre.aucune.0", "entre.C.bouton.rivets.carre.aucune.0",
    "entre.C.bouton.soudure.rond.aucune.0", "entre.C.bouton.soudure.carre.lances.0", "entre.C.bouton.soudure.carre.aucune.2",
    "entre.C.bouton.soudure.carre.aucune.oui", "entre.C.bouton.soudure.carre.aucune", "entre.C.bouton.soudure.carre.aucune.0.0",
    "Entre.C.bouton.soudure.carre.aucune.0", " entre.C.bouton.soudure.carre.aucune.0", "entre.C.bouton.soudure.carre.aucune.0 ",
    "entre.lyre.bouton.soudure.carre.aucune.0", "entre.C.bouton.soudure.carre.aucune.0" + ".".repeat(60), "__proto__.C.bouton.soudure.carre.aucune.0",
  ]) assert.equal(lireDecorGC(mauvais), null, mauvais);
  for (const x of [null, undefined, 3, true, {}, [], decorParDefautGC("entre")]) assert.equal(lireDecorGC(x), null, J(x));
  assert.throws(() => decorParDefautGC("barreaux" as AssemblageDecorGC));
});

test("les listes du site sont celles de l'outil : DECOR_NOMS, MT_AVEC, MT_NOMS, MT_CHOIX et ses valeurs de départ", () => {
  assert.deepEqual(DECORS_GC.assemblages.map((a) => [a.id, a.nom]), Object.entries(DECOR_NOMS));
  for (const a of ASSEMBLAGES) {
    assert.deepEqual([...DECORS_GC.formes[a]], [...MT_AVEC[a]], a);
    for (const f of DECORS_GC.formes[a]) assert.equal(DECORS_GC.nomsFormes[f], MT_NOMS[f], f);
  }
  assert.deepEqual([...DECORS_GC.formes.anneaux], ["anneau"]);
  assert.deepEqual([...DECORS_GC.formes.coeurs], ["coeur"]);
  // « barreaux » de la bibliothèque n'a pas de décor : ce sont les barreaux seuls, déjà au catalogue.
  assert.deepEqual([...MT_AVEC.barreaux], []);
  assert.ok(!ASSEMBLAGES.includes("barreaux" as AssemblageDecorGC));
  for (const [liste, cle] of [[DECORS_GC.bouts, "bouts"], [DECORS_GC.liaisons, "liaison"], [DECORS_GC.barreaux, "barreaux"], [DECORS_GC.frisesBasses, "friseBasse"]] as const) {
    for (const o of liste) assert.ok(MT_CHOIX[cle].includes(o.id) && o.nom.length > 0, `${cle} : ${o.id}`);
  }
  // Les finitions de départ sont celles de la page de l'outil (et les premières de chaque liste).
  for (const a of ASSEMBLAGES) {
    const d = decorParDefautGC(a);
    assert.equal(d.forme, DECORS_GC.formes[a][0]);
    assert.deepEqual([d.bouts, d.liaison, d.barreaux, d.friseBasse, d.dore], ["bouton", "soudure", "carre", "aucune", false]);
    assert.deepEqual([d.bouts, d.liaison, d.barreaux, d.friseBasse, d.dore ? "1" : "0"], [DEFAUTS_GC.decorBouts, "soudure", DEFAUTS_GC.decorBarreaux, DEFAUTS_GC.decorFriseBasse, DEFAUTS_GC.decorDore]);
  }
  // Par défaut : pas de décor.
  assert.equal(DEFAUTS_GC.decor, "aucun");
  assert.equal(decorActif(DEFAUTS_GC), false);
});

test("le décor du relevé devient les champs de l'outil ; la hauteur reste celle d'un cadre à croix (jour automatique)", () => {
  const d = "frise.S.effile.soudure.torsade.postes.1";
  const v = valeursGC(DEFAUTS_GC, e(1180, 650, d), 16, 1, false, false, false, true) as ValeursGC;
  assert.deepEqual([v.decor, v.decorForme, v.decorBouts, v.decorLiaison, v.decorBarreaux, v.decorFriseBasse, v.decorDore], ["frise", "S", "effile", "soudure", "torsade", "postes", "1"]);
  assert.equal(decorActif(v), true);
  // Sans décor (ou un décor illisible) : les valeurs de départ de l'outil, « aucun ».
  assert.equal(valeursGC(DEFAUTS_GC, e(1180, 650), 16, 1).decor, "aucun");
  assert.equal(valeursGC(DEFAUTS_GC, e(1180, 650, "n'importe.quoi"), 16, 1).decor, "aucun");
  // À 760 mm du sol : 65 mm de jour avec un décor (cadre de 200, comme les croix), 90 pour des barreaux seuls (cadre de 120).
  assert.equal(valeursGC(DEFAUTS_GC, e(1180, 760, d), 16, 1, false, false, false, true).jour, 65);
  assert.equal(valeursGC(DEFAUTS_GC, e(1180, 760), 16, 1, false, false, false, true).jour, 90);
  const c = configurerGC(e(1180, 760, parDefaut("frise")));
  assert.ok(c.ok);
  assert.equal(c.jourMm, 65);
  assert.equal(c.mainCouranteMm, 1025);
});

/* ------------------------------------------------------------------ *
 *  La parité avec l'outil, et ses mémoires
 * ------------------------------------------------------------------ */

const FENETRES: EntreeSiteGC[] = [e(600, 650), e(900, 300), e(1180, 650), e(1180, 760), e(1400, 100), e(1800, 650), e(2200, 400), e(1000, 0, undefined, "chene", false), e(1500, 500, undefined, "acier", true, 1300), e(1300, 700, undefined, "chene-plat")];

test("parité : avec un décor, le site retient le premier carré où le calcul COMPLET de l'outil n'a aucune alerte, au prix du chiffrage", () => {
  const { chiffrerGC } = chiffrageOuEchec();
  let vendus = 0, refuses = 0;
  for (const f of FENETRES) for (const a of ASSEMBLAGES) {
    const decor = parDefaut(a);
    const en = { ...f, decor };
    const nom = `${f.largeurMm} × ${f.allegeMm} ${f.essence}, ${decor}`;
    const c = configurerGC(en);
    const platVoulu = f.essence.endsWith("-plat");
    // La règle, écrite ici sans les mémoires du site : les carrés de l'atelier dans l'ordre, calcul complet.
    // Dans chaque carré, 1 panneau, puis 2, puis 3 (des montants au milieu : 07/10/2026).
    let attendu: number | null = null, panneaux = 1;
    if (!platVoulu) {
      carres: for (const s of ORDRE_CARRES) for (let n = 1; n <= 3; n++) {
        if (calculerGC(valeursGC(DEFAUTS_GC, en, s, n, false, false, false, true) as ValeursGC).alertes.length === 0) { attendu = s; panneaux = n; break carres; }
      }
    }
    if (attendu !== null) {
      assert.ok(c.ok, `${nom} : vendu (carré de ${attendu}, ${panneaux} panneau(x))`);
      assert.deepEqual([c.carre, c.renfort, c.patte, c.seuls, c.croix], [attendu, false, 0, true, panneaux], nom);
    }
    if (!c.ok) { refuses++; continue; }
    vendus++;
    assert.equal(c.decor && idDecorGC(c.decor), decor, nom);
    // Ce qui est chiffré est le calcul complet de l'outil (le calcul rapide gardé par le site lui est identique).
    const complet = calculerGC({ ...c.v });
    assert.equal(complet.alertes.length, 0, `${nom} : aux normes`);
    assert.equal(J(c.R), J(complet), `${nom} : calcul rapide = calcul complet`);
    assert.equal(prixGC(c), chiffrerGC(complet, c.v).conseille, `${nom} : prix du chiffrage`);
    assert.ok(typeof complet.decorNom === "string" && complet.decorNom.length > 0, nom);
    if (attendu === null) assert.ok(c.renfort || c.patte > 0 || platVoulu, `${nom} : sans carré qui tienne seul, le fer plat ou les pattes`);
    if (platVoulu) assert.ok(CARRES_RENFORT_SEULS.includes(c.carre as 16 | 18) && c.renfort, nom);
  }
  // Depuis le 07/10/2026, aucun décor n'est « à étudier » sur une fenêtre que le site vend (balayage de plans/tests/motifs.test.mjs).
  assert.ok(vendus >= 40 && refuses === 0, `${vendus} vendus, ${refuses} refusés`);
});

test("parité : les relevés avec décor de la référence (l'outil lui-même, calcul complet) donnent le même garde-corps et le même prix", () => {
  chiffrageOuEchec();
  const REF = JSON.parse(readFileSync(new URL("./reference/garde-corps-outil.json", import.meta.url), "utf8")) as {
    decors: { entree: EntreeSiteGC; alertes: Record<string, string[]>; renfort: Record<string, string[]>; choix: null | { carre: number; renfort: boolean; R: string; hauteurGC: number; kg: number; prix: number; nom: string } }[];
  };
  assert.ok(REF.decors.length >= 6);
  for (const r of REF.decors) {
    const c = configurerGC(r.entree);
    const nom = J(r.entree);
    // Ce que le site essaie (calcul rapide) dit les mêmes alertes que l'outil en calcul complet.
    for (const s of ORDRE_CARRES) {
      const codes = calculerGC({ ...(valeursGC(DEFAUTS_GC, r.entree, s, 1, false, false, false, true) as ValeursGC), _rapide: true }).alertes.map(codeAlerte);
      assert.deepEqual(codes, r.alertes[s], `${nom} : carré ${s}`);
    }
    if (!r.choix) {
      assert.ok(!c.ok || c.patte > 0, `${nom} : l'outil ne trouve rien, le site non plus (sauf avec des pattes)`);
      continue;
    }
    const plat = r.entree.essence.endsWith("-plat");
    if (r.choix.renfort && !(r.alertes[18] ?? []).includes("solidite") && !plat) continue;   // le site n'ajoute le fer plat que pour la rigidité
    assert.ok(c.ok, nom);
    assert.equal(c.carre, r.choix.carre, nom);
    assert.equal(c.croix, (r.choix as { panneaux?: number }).panneaux ?? 1, `${nom} : panneaux`);
    assert.equal(court(J(c.R)), r.choix.R, `${nom} : calcul de l'outil`);
    assert.equal(c.R.decorNom, r.choix.nom);
    assert.equal(prixGC(c), r.choix.prix, `${nom} : prix`);
  }
});

test("ce que le cadre refuse ne dépend pas du décor (la mémoire partagée entre les décors d'une fenêtre)", () => {
  // Rigidité, fixation, charge verticale, hauteur… : les mêmes pour les sept décors d'une fenêtre ; seuls « Trous » et
  // « Escalade » regardent le dessin du décor. C'est ce qui permet au site de calculer le cadre une fois (calcul.ts, essayer).
  const DU_DECOR = ["trous", "escalade", "autre"];
  let refusParLeCadre = 0;
  for (const [l, a, essence] of [[2200, 400, "chene"], [1800, 650, "chene"], [2400, 650, "acier"], [1180, 650, "chene"], [700, 150, "pin"], [1600, 760, "chene-plat"]] as const) {
    for (const s of [16, 14, 18]) for (const r of [false, true]) for (const p of [0, 2]) {
      let reference: string | null = null;
      for (const assemblage of ASSEMBLAGES) {
        const en = e(l, a, parDefaut(assemblage), essence);
        const codes = [...new Set(calculerGC({ ...(valeursGC(DEFAUTS_GC, en, s, 1, false, false, r, true, p) as ValeursGC), _rapide: true }).alertes.map(codeAlerte))].filter((c) => !DU_DECOR.includes(c));
        if (reference === null) reference = J(codes);
        else assert.equal(J(codes), reference, `${l} × ${a} ${essence}, carré ${s}${r ? ", fer plat" : ""}, ${p} pattes, ${assemblage}`);
        if (codes.length) refusParLeCadre++;
      }
    }
  }
  assert.ok(refusParLeCadre > 30);
});

/* ------------------------------------------------------------------ *
 *  La route du prix
 * ------------------------------------------------------------------ */

test("les paramètres de la route : decor (illisible : refusé ; sous verre : refusé), decors=1, et le modèle ignoré avec un décor", () => {
  assert.ok(PARAMETRES_PRIX_GC.includes("decor") && PARAMETRES_PRIX_GC.includes("decors"));
  const base = "l=1180&allege=650&etage=1&wood=chene";
  const d = "frise.S.bouton.soudure.carre.aucune.0";
  assert.equal(requete(`${base}&decor=${d}`).releve.decor, d);
  assert.equal(requete(`${base}&decor=${d}&modele=16-3`).releve.modele, undefined);
  assert.equal(requete(`${base}&modele=16-3`).releve.modele, "16-3");
  assert.equal(requete(`${base}&decors=1`).decors, true);
  assert.equal(requete(base).decors, undefined);
  for (const q of [`${base}&decor=frise.Z.bouton.soudure.carre.aucune.0`, `${base}&decor=`, `${base}&decors=0`, `${base}&decors=oui`, `${base}&decor=${d}&remplissage=verre`, `${base}&decor=${d}&decor=${d}`]) {
    assert.equal(lireRequetePrixGC(new URLSearchParams(q)), null, q);
  }
  // Le relevé du navigateur porte le décor, et l'adresse de la route aussi.
  const releve: ReleveGC = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, decor: d };
  assert.ok(releveDansLesBornes(releve));
  assert.ok(!releveDansLesBornes({ ...releve, decor: "frise" }));
  const p = parametresPrixGC(releve, { woodId: "chene", decors: true });
  assert.equal(p.get("decor"), d);
  assert.equal(p.get("decors"), "1");
  assert.ok(lireRequetePrixGC(p));
  assert.equal(parametresPrixGC({ ...releve, decor: undefined }, { woodId: "chene" }).has("decors"), false);
});

test("sans décor, la réponse ne change pas ; decors=1 n'ajoute que la liste des décors", () => {
  chiffrageOuEchec();
  for (const q of ["l=1180&allege=650&etage=1&wood=chene", "l=2200&allege=300&etage=1&wood=noyer&fabric=acier", "l=900&allege=800&etage=0&wood=acier", "l=1000&allege=880&etage=1&wood=pin"]) {
    const sans = reponsePrixGC(requete(q))!;
    assert.ok(sans);
    assert.ok(!("decor" in sans) && !("decors" in sans), q);
    const cles = sans.ok
      ? ["carre", "conforme", "croix", "hauteurMm", "jourMm", "kg", "mainCouranteMm", "mains", "modeles", "obligatoire", "ok", "patte", "prix", "remise", "renfort", "seuls", "soubassementMm", "traverse"]
      : ["alertes", "conforme", "hauteurMm", "jourMm", "mainCouranteMm", "mains", "modeles", "obligatoire", "ok", "raison"];
    assert.deepEqual(Object.keys(sans).sort(), cles, q);
    const avecListe = reponsePrixGC(requete(`${q}&decors=1`))!;
    const { decors, ...reste } = avecListe as typeof avecListe & { decors?: unknown };
    assert.equal(J(reste), J(sans), `${q} : decors=1 ne change rien d'autre`);
    assert.ok(Array.isArray(decors) && decors.length === ASSEMBLAGES.length, q);
  }
});

test("avec un décor : le prix du garde-corps à décor, et les modèles du catalogue IDENTIQUES à ceux de la même fenêtre sans décor", () => {
  chiffrageOuEchec();
  let refuse = 0;
  for (const [base, decor] of [
    ["l=1180&allege=650&etage=1&wood=chene", "frise.S.bouton.soudure.carre.aucune.0"],
    ["l=1180&allege=650&etage=1&wood=chene&fabric=fonte&metal=blanc&qty=3", "coeurs.coeur.effile.soudure.torsade.aucune.1"],
    ["l=2200&allege=400&etage=1&wood=chene", "hauteur.C.bouton.soudure.carre.aucune.0"],
    ["l=900&allege=760&etage=1&wood=noyer-plat", "medaillon.J.droit.soudure.bagues.aucune.0"],
    ["l=1400&allege=300&etage=1&wood=acier&fenetre=1500", "anneaux.anneau.bouton.soudure.carre.postes.0"],
  ] as const) {
    const sans = reponsePrixGC(requete(base))!;
    const avec = reponsePrixGC(requete(`${base}&decor=${decor}`))!;
    assert.ok(sans && avec, base);
    assert.equal(J(avec.modeles), J(sans.modeles), `${base}, ${decor} : le catalogue ne dépend pas du décor`);
    const c = configurerGC({ ...e(Number(requete(base).releve.largeurMm), requete(base).releve.allegeMm, decor, requete(base).essence), fenetreMm: requete(base).releve.fenetreMm, enEtage: true });
    if (!avec.ok) {
      refuse++;
      assert.equal(c.ok, false, base);
      assert.equal(avec.raison, c.ok ? null : c.raison);
      assert.ok(avec.alertes.length > 0, `${base}, ${decor} : ce qui bloque est dit`);
      continue;
    }
    assert.ok(c.ok);
    // Le prix de la route = celui du panier (ligneGC), options comprises, sans supplément de rosace ; poids et forme du décor.
    const q = requete(`${base}&decor=${decor}`);
    const l = ligneGC(q.releve, { woodId: q.essence, metalId: q.metalId, fabricId: q.fabricId, remplissageId: q.remplissageId });
    assert.ok(l.ok);
    assert.equal(avec.prix, l.line.unitPrice);
    const metal = getProduct("garde-corps")!.metals.find((m) => m.id === (q.metalId ?? "noir"))!;
    assert.equal(avec.prix, prixGC(c) + (metal.priceDelta ?? 0), "pas de supplément de rosace avec un décor");
    // croix : le nombre de panneaux du décor (des montants au milieu sur une fenêtre large).
    assert.deepEqual([avec.croix, avec.seuls, avec.traverse, avec.soubassementMm, avec.carre, avec.kg], [c.croix, true, false, 0, c.carre, Math.round(c.kg)]);
    assert.ok(avec.decor);
    assert.equal(avec.decor.id, decor);
    assert.equal(avec.decor.nom, c.R.decorNom);
    assert.equal(avec.decor.friseRetiree, decor.includes(".postes.") && (q.releve.allegeMm + avec.jourMm) < 600);
    // Les mains courantes avec ce décor : le même calcul que le panier.
    for (const [id, prix] of Object.entries(avec.mains)) {
      const m = ligneGC(q.releve, { woodId: id, metalId: q.metalId, fabricId: q.fabricId });
      assert.ok(m.ok && m.line.unitPrice === prix, `${base}, ${decor} : main courante ${id}`);
    }
    // La remise de plusieurs pièces : la règle de l'outil (frais fixes une fois, jamais sous le plancher), décor compris.
    assert.equal(avec.remise, q.quantite > 1 ? prixCommandeGC([{ config: c, quantite: q.quantite }]).remise : 0);
  }
  assert.equal(refuse, 0, "aucun décor « à étudier » (07/10/2026)");
});

test("la liste des prix des décors (decors=1) : le même calcul que le panier, pour chaque assemblage", () => {
  chiffrageOuEchec();
  const choisi = "entre.S.effile.soudure.torsade.aucune.1";
  for (const q of [`l=1400&allege=500&etage=1&wood=noyer&decor=${choisi}&decors=1`, "l=1180&allege=650&etage=1&wood=chene&decors=1", "l=2200&allege=400&etage=1&wood=chene&decors=1&remplissage=verre"]) {
    const r = reponsePrixGC(requete(q))!;
    assert.ok(r.decors, q);
    assert.deepEqual(r.decors.map((d) => lireDecorGC(d.id)?.assemblage), ASSEMBLAGES, q);
    const rq = requete(q);
    for (const d of r.decors) {
      const lu = lireDecorGC(d.id)!;
      // Les finitions du décor choisi, sinon celles de départ ; la forme choisie si l'assemblage la permet.
      if (rq.releve.decor) assert.deepEqual([lu.bouts, lu.liaison, lu.barreaux, lu.friseBasse, lu.dore], ["effile", "soudure", "torsade", "aucune", true], d.id);
      else assert.equal(d.id, parDefaut(lu.assemblage));
      const { modele: _m, decor: _d, ...releve } = rq.releve;
      void _m; void _d;
      const l = ligneGC({ ...releve, decor: d.id }, { woodId: rq.essence, metalId: rq.metalId, fabricId: rq.fabricId });
      assert.equal(d.conforme, l.ok, d.id);
      assert.equal(d.prix, l.ok ? l.line.unitPrice : 0, d.id);
    }
  }
  const choix = reponsePrixGC(requete(`l=1400&allege=500&etage=1&wood=noyer&decor=${choisi}&decors=1`))!;
  assert.ok(choix.ok && choix.decors);
  assert.equal(choix.decors.find((d) => d.id === choisi)?.prix, choix.prix, "le décor choisi a, dans la liste, le prix affiché");
});

test("le décor n'est jamais choisi d'office, et le prix d'appel (« Dès … ») n'en dépend pas", () => {
  chiffrageOuEchec();
  for (const q of ["l=1180&allege=650&etage=1&wood=chene", "l=1000&allege=650&etage=1&wood=pin&decors=1", "l=1800&allege=300&etage=1&wood=chene&decors=1"]) {
    const r = reponsePrixGC(requete(q))!;
    assert.ok(r.ok, q);
    assert.equal(r.decor, undefined, `${q} : pas de décor sans demande du client`);
    if (!r.seuls) {
      const propose = r.modeles.find((m) => m.conforme && m.croix === r.croix && m.traverse === r.traverse && m.prix === r.prix);
      assert.ok(propose, `${q} : le prix proposé est celui d'un modèle du catalogue`);
    }
  }
  const produit = getProduct("garde-corps")!;
  const appel = prixAppelGC(produit);
  assert.ok(appel);
  // La règle du prix d'appel, refaite ici : les modèles aux normes de la fenêtre d'appel, sans décor, options au plus bas.
  const moinsCher = (l: { id: string; priceDelta?: number }[] | undefined) => (l?.length ? l.reduce((a, b) => ((a.priceDelta ?? 0) <= (b.priceDelta ?? 0) ? a : b)).id : undefined);
  const prix = ["pin", "hetre", "chene", "noyer", "pin-plat", "hetre-plat", "chene-plat", "noyer-plat", "acier", "profil"].flatMap((essence) => {
    const r = reponsePrixGC({ releve: { ...FENETRE_APPEL_GC, enEtage: true, fenetreMm: 0 }, essence: essence as "chene", metalId: moinsCher(produit.metals), fabricId: moinsCher(produit.fabrics), quantite: 1 });
    return r ? r.modeles.filter((m) => m.conforme).map((m) => m.prix) : [];
  });
  assert.equal(appel.prix, Math.min(...prix));
  // Même si un décor coûtait moins, il n'entrerait pas dans le prix d'appel.
  const decors = reponsePrixGC({ releve: { ...FENETRE_APPEL_GC, enEtage: true, fenetreMm: 0 }, essence: "pin", quantite: 1, decors: true })!.decors!;
  assert.ok(decors.every((d) => !d.conforme || d.prix >= 1));
});

test("deux fiches (07/10/2026) : le garde-corps Rosace sans décor, le Garde-corps forgé à volutes toujours avec, chacun son « à partir de »", () => {
  chiffrageOuEchec();
  const rosace = getProduct(SLUG_GC)!, forge = getProduct(SLUG_GC_FORGE)!;
  assert.equal(forge.releve, "garde-corps-fenetre");
  assert.equal(forge.decorsGC, true);
  assert.notEqual(rosace.decorsGC, true);
  // Ni rosace ni verre sur le forgé : le décor remplit le cadre.
  assert.equal(forge.fabrics, undefined);
  assert.equal(forge.remplissages, undefined);
  // Un relevé à décor se chiffre sur la fiche du forgé ; sans décor, sur celle du Rosace (la route, le devis, l'aperçu du plan).
  const fenetre = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 };
  const avec = ligneGC({ ...fenetre, decor: idDecorGC(decorParDefautGC("entre")) }, { woodId: "chene", fabricId: "fleur", remplissageId: "croix" });
  assert.ok(avec.ok, avec.ok ? "" : avec.reason);
  assert.equal(avec.line.product.slug, SLUG_GC_FORGE);
  assert.equal(avec.line.fabric, undefined);
  const sans = ligneGC(fenetre, { woodId: "chene" });
  assert.ok(sans.ok);
  assert.equal(sans.line.product.slug, SLUG_GC);
  // « À partir de » et prix d'appel : le forgé a les siens, le moins cher de ses décors, plus haut que ceux du Rosace.
  const departR = prixDepart(rosace), departF = prixDepart(forge);
  assert.ok(departR !== null && departF !== null && departF > departR, J([departR, departF]));
  const appelR = prixAppelGC(rosace), appelF = prixAppelGC(forge);
  assert.ok(appelR && appelF && appelF.prix > appelR.prix, J([appelR, appelF]));
  const prixDecors = ["pin", "hetre", "chene", "noyer", "pin-plat", "hetre-plat", "chene-plat", "noyer-plat", "acier", "profil"].flatMap((essence) =>
    reponsePrixGC({ releve: { ...FENETRE_APPEL_GC, enEtage: true, fenetreMm: 0 }, essence: essence as "chene", quantite: 1, decors: true })!.decors!.filter((d) => d.conforme).map((d) => d.prix)
  );
  assert.equal(appelF.prix, Math.min(...prixDecors), "le prix d'appel du forgé : son décor le moins cher à la fenêtre d'appel");
});

test("les traits du décor : en mm depuis le coin du cadre, bornés, relus à l'identique ; une réponse forgée est refusée", () => {
  chiffrageOuEchec();
  for (const a of ASSEMBLAGES) for (const [l, al] of [[1180, 650], [2400, 650], [1000, 200]]) {
    const r = reponsePrixGC(requete(`l=${l}&allege=${al}&etage=1&wood=chene-plat&decor=${parDefaut(a)}`))!;
    if (!r.ok) continue;
    assert.ok(r.decor, a);
    const d = r.decor;
    let nombres = 0;
    for (const t of d.traits) {
      if (t.t === "poly") {
        assert.ok(["fer", "collier", "or", "vrille"].includes(t.role));
        for (const [x, y] of t.pts) {
          assert.ok(Number.isInteger(x) && Number.isInteger(y), "au millimètre");
          assert.ok(x >= -20 && x <= d.cadreMm.l + 20 && y >= -20 && y <= d.cadreMm.h + 20, `${a} : trait hors du cadre (${x}, ${y})`);
        }
        nombres += 2 * t.pts.length;
      } else {
        assert.ok(["fer", "or"].includes(t.role) && t.r > 0);
        nombres += 3;
      }
    }
    assert.ok(nombres > 50 && nombres <= DECOR_NOMBRES_MAX, `${a}, ${l} : ${nombres} nombres`);
    assert.equal(d.cadreMm.l, l - 1, "le cadre (jeu de 1 mm)");
    const relu = lireReponsePrixGC(JSON.parse(J(r)));
    assert.ok(relu && relu.ok);
    assert.deepEqual(relu.decor, d);
  }
  const r = reponsePrixGC(requete("l=1180&allege=650&etage=1&wood=chene&decor=frise.S.bouton.soudure.carre.aucune.1&decors=1"))!;
  assert.ok(r.ok && r.decor);
  assert.ok(r.decor.traits.some((t) => t.role === "or"), "les rehauts dorés sont dessinés en or");
  const brut = JSON.parse(J(r));
  const forge = (f: (o: { decor: { id: string; traits: { t: string; role: string; pts?: unknown[]; r?: number }[]; cadreMm: { l: number } }; decors: { prix: number; id: string }[] }) => void) => {
    const o = JSON.parse(J(brut));
    f(o);
    return lireReponsePrixGC(o);
  };
  assert.ok(forge(() => {}));
  assert.equal(forge((o) => { o.decor.id = "frise"; }), null);
  assert.equal(forge((o) => { o.decor.traits[0].role = "script"; }), null);
  assert.equal(forge((o) => { o.decor.traits[0].t = "texte"; }), null);
  assert.equal(forge((o) => { o.decor.traits.push({ t: "poly", role: "fer", pts: Array.from({ length: DECOR_NOMBRES_MAX }, () => [1, 1]) }); }), null);
  assert.equal(forge((o) => { o.decor.traits.push({ t: "poly", role: "fer", pts: [[1, 1], [Number.NaN, 2]] }); }), null);
  assert.equal(forge((o) => { o.decor.traits.push({ t: "poly", role: "fer", pts: [[1, 1], [1e7, 2]] }); }), null);
  assert.equal(forge((o) => { o.decor.traits.push({ t: "cercle", role: "collier", c: [1, 1], r: 2 } as never); }), null);
  assert.equal(forge((o) => { o.decor.cadreMm.l = 0; }), null);
  assert.equal(forge((o) => { o.decors[0].prix = -5; }), null);
  assert.equal(forge((o) => { o.decors[0].id = "x"; }), null);
  assert.equal(forge((o) => { o.decors.push(...o.decors); }), null);
});

test("l'aperçu du plan dessine le décor (le Plan A3 de l'outil)", () => {
  chiffrageOuEchec();
  const sans = planApercuGC(requete("l=1180&allege=650&etage=1&wood=chene"), new Date("2026-10-06T10:00:00+02:00"))!;
  const avec = planApercuGC(requete("l=1180&allege=650&etage=1&wood=chene&decor=frise.S.bouton.soudure.carre.aucune.0"), new Date("2026-10-06T10:00:00+02:00"))!;
  assert.ok(sans && avec);
  assert.equal(sans.decor, undefined);
  assert.equal(avec.decor, true);
  assert.equal(avec.seuls, true);
  assert.notEqual(avec.svg, sans.svg);
  assert.match(avec.svg, /volutes/i);
  // Une fenêtre large : le décor en panneaux, son plan aussi (07/10/2026 : plus de décor refusé).
  assert.ok(planApercuGC(requete("l=2200&allege=400&etage=1&wood=chene&decor=hauteur.C.bouton.soudure.carre.aucune.0"))?.decor, "décor en panneaux : son plan");
});

/* ------------------------------------------------------------------ *
 *  Le panier, la commande, le devis
 * ------------------------------------------------------------------ */

const aKm = (distanceKm: number) => async (): Promise<ResultatLieu> => ({ ok: true, lieu: { distanceKm, commune: "Nantes", precision: "adresse" } });
const ligne = (r: Record<string, unknown> = {}) => ({
  slug: "garde-corps", largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400, woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix", quantity: 1, ...r,
});
/** Une ligne du Garde-corps forgé à volutes (07/10/2026) : ni rosace ni remplissage, un décor. */
const ligneForge = (r: Record<string, unknown> = {}) => ({
  slug: SLUG_GC_FORGE, largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400, woodId: "chene", metalId: "noir", quantity: 1, ...r,
});

test("panier et commande : le prix de la route, le décor dans le libellé (français, anglais), le verre refusé", async () => {
  chiffrageOuEchec();
  const decor = "frise.S.effile.soudure.torsade.postes.1";
  const route = reponsePrixGC(requete(`l=1180&allege=650&etage=1&fenetre=1400&wood=chene&metal=noir&fabric=fleur&remplissage=croix&decor=${decor}`))!;
  assert.ok(route.ok && route.decor);
  const fr = await tarifer([ligneForge({ decorGc: decor, note: "En étage · mur : brique · ".padEnd(240, "précision ") }), { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser: aKm(40) });
  assert.equal(fr.refusees.length, 0, J(fr.refusees));
  const p = fr.pieces[0];
  assert.equal(p.line.unitPrice, route.prix, "le panier encaisse le prix affiché");
  assert.equal(p.nom, NOM_GC_DECOR.fr);
  const libelleFr = libellePiece(p);
  assert.match(libelleFr, /^Garde-corps forgé à volutes — Sur mesure — 1[\s\u00a0\u202f]180 × \d+ mm, frise de volutes en S/);
  for (const mot of finitionsDecorGC(lireDecorGC(decor)!, "fr")) assert.ok(libelleFr.includes(mot), mot);
  assert.ok(!/rosace|croix/i.test(p.options), p.options);
  const en = await tarifer([ligneForge({ decorGc: decor })], { locale: "en", gc: CALCUL_GC, localiser: aKm(40) });
  const libelleEn = libellePiece(en.pieces[0]);
  assert.equal(en.pieces[0].line.unitPrice, route.prix);
  assert.ok(libelleEn.startsWith(`${NOM_GC_DECOR.en} — Custom`), libelleEn);
  assert.ok(libelleEn.toLowerCase().includes(nomDecorAnglaisGC(lireDecorGC(decor)!).toLowerCase()), libelleEn);
  for (const mot of finitionsDecorGC(lireDecorGC(decor)!, "en")) assert.ok(libelleEn.includes(mot), mot);
  assert.ok(!/volute|barreaux|colliers|dorés/.test(libelleEn), `anglais seulement : ${libelleEn}`);
  // Chez Stripe : 250 signes au plus, et le décor reste lisible dans ce qui est gardé.
  for (const libelle of [libelleFr, libelleEn]) {
    const { noms } = nomsStripe([libelle]);
    assert.ok(noms[0].length <= MAX_NOM_STRIPE);
    assert.ok(/volutes|scroll/i.test(noms[0].slice(0, 120)), noms[0]);
  }
  // Refusés : un décor illisible ; un décor sur la fiche du garde-corps Rosace (sous verre ou non) ; le forgé sans décor, avec
  // un panneau de verre ou une rosace (il n'en a pas) ; une fenêtre trop basse pour un garde-corps est « à étudier ».
  const refus = await tarifer(
    [
      ligneForge({ decorGc: "frise.Z" }), ligne({ decorGc: decor, remplissageId: "verre" }), ligneForge({ decorGc: 12 }),
      // « À étudier » : une fenêtre qui s'arrête sous la main courante (plus aucun décor n'est refusé par la norme, 07/10/2026).
      ligneForge({ fenetreMm: 200, decorGc: "hauteur.C.bouton.soudure.carre.aucune.0" }),
      ligne({ decorGc: decor }), ligneForge(), ligneForge({ decorGc: decor, remplissageId: "verre" }), ligneForge({ decorGc: decor, fabricId: "fonte" }),
      { slug: RETRAIT },
    ],
    { locale: "fr", gc: CALCUL_GC, localiser: aKm(40) }
  );
  assert.deepEqual(refus.refusees.map((r) => r.raison), ["unknown_decor", "unknown_decor", "unknown_decor", "a_etudier", "unknown_decor", "unknown_decor", "unknown_remplissage", "unknown_fabric", "orphelin"]);
  // Le décor ignore le modèle : un modèle forgé ne change rien.
  const autre = await tarifer([ligneForge({ decorGc: decor, modeleGc: "16-1" })], { locale: "fr", gc: CALCUL_GC, localiser: aKm(40) });
  assert.equal(autre.pieces[0].line.unitPrice, route.prix);
  assert.equal(autre.pieces[0].line.gc!.releve.modele, undefined);
  // Plusieurs garde-corps à décor : la remise de l'outil (frais fixes une fois, jamais sous le plancher).
  const deux = await tarifer([ligneForge({ decorGc: decor, quantity: 2 }), { slug: RETRAIT }], { locale: "fr", gc: CALCUL_GC, localiser: aKm(40) });
  assert.equal(deux.remise, prixCommandeGC([{ config: configurerGC({ ...e(1180, 650, decor), fenetreMm: 1400 }) as ConfigGC, quantite: 2 }]).remise);
  assert.ok(deux.remise <= 0);
  assert.equal(deux.total, 2 * route.prix + deux.remise);
});

test("une frise basse que l'outil retire (au ras du sol) n'est pas écrite sur la commande", async () => {
  chiffrageOuEchec();
  const decor = "frise.S.bouton.soudure.carre.postes.0";
  const route = reponsePrixGC(requete(`l=1180&allege=300&etage=1&wood=chene&decor=${decor}`))!;
  assert.ok(route.ok && route.decor);
  assert.equal(route.decor.friseRetiree, true);
  const t = await tarifer([ligneForge({ allegeMm: 300, fenetreMm: 0, decorGc: decor })], { locale: "fr", gc: CALCUL_GC, localiser: aKm(40) });
  assert.ok(!/frise basse/.test(libellePiece(t.pieces[0])), libellePiece(t.pieces[0]));
});

test("le devis nomme le décor (comme l'outil), en français et en anglais, aux mêmes montants que le panier ; le téléphone est celui de l'entreprise", () => {
  chiffrageOuEchec();
  const decor = "medaillon.doubleC.bouton.soudure.bagues.aucune.1";
  const releve: ReleveGC = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, decor };
  const entree = (locale: "fr" | "en", fabricId = "fleur"): EntreeDevisGC => ({
    releve, options: { woodId: "chene", metalId: "blanc", fabricId, remplissageId: "croix" }, quantite: 2, livraison: { mode: "retrait" },
    date: new Date("2026-10-06T10:00:00+02:00"), locale, origine: "https://auboiacier.fr",
  });
  const devis = (locale: "fr" | "en", fabricId?: string) => {
    const r = composerDevisGardeCorps(entree(locale, fabricId));
    assert.ok(r.ok, r.ok ? "" : r.reason);
    return r.devis;
  };
  const fr = devis("fr"), en = devis("en");
  const c = configurerGC({ ...e(1180, 650, decor), rosaceMm: 100 }) as ConfigGC;
  assert.ok(c.ok);
  const l = ligneGC(releve, { woodId: "chene", metalId: "blanc", fabricId: "fleur", remplissageId: "croix" });
  assert.ok(l.ok);
  // Le nom, celui du devis de l'outil.
  const base = devisOutil(c, l.line, 1, { mode: "retrait" }, new Date("2026-10-06T10:00:00+02:00"));
  assert.equal(base.piece.nom, NOM_GC_DECOR.fr);
  assert.equal(fr.piece.nom, NOM_GC_DECOR.fr);
  assert.equal(en.piece.nom, NOM_GC_DECOR.en);
  const texte = (d: typeof fr) => J([d.lignes.map((x) => x.designation), d.piece.accroche, d.piece.caracteristiques]);
  assert.ok(texte(fr).toLowerCase().includes(String(c.R.decorNom).toLowerCase()), "le devis français nomme le décor");
  assert.ok(!/rosace|croix de saint/i.test(texte(fr)));
  assert.ok(texte(en).toLowerCase().includes(nomDecorAnglaisGC(c.decor!).toLowerCase()), "le devis anglais nomme le décor");
  assert.ok(!/volute|rosette|cross|barreaux/i.test(texte(en)), texte(en));
  assert.equal(en.total, fr.total);
  assert.equal(fr.lignes.length, en.lignes.length);
  // Le montant : celui du panier (deux pièces, la remise de l'outil).
  assert.equal(fr.total, 2 * l.line.unitPrice + prixCommandeGC([{ config: c, quantite: 2 }]).remise, "deux pièces, frais fixes comptés une fois");
  // Pas de photo de croix à rosaces pour une pièce à volutes.
  assert.equal(fr.piece.photo, undefined);
  // Un devis par décor : un autre décor, un autre numéro.
  const autre = composerDevisGardeCorps({ ...entree("fr"), releve: { ...releve, decor: "medaillon.coeur.bouton.soudure.bagues.aucune.1" } });
  assert.ok(autre.ok && autre.devis.numero !== fr.numero);
  // Le téléphone du devis : celui de la fiche de l'entreprise, le même que l'outil écrit sur les siens.
  assert.ok(fr.emetteur.lignes.some((x) => x.includes(ENTREPRISE.telephone)), J(fr.emetteur));
  assert.ok(base.emetteur.lignes.some((x) => x.includes(ENTREPRISE.telephone)), `l'outil écrit un autre numéro : ${J(base.emetteur)}`);
});

/* ------------------------------------------------------------------ *
 *  La mémoire de la fiche, les favoris
 * ------------------------------------------------------------------ */

test("la configuration mise de côté et les favoris gardent le décor (et refusent un décor inventé)", () => {
  const decor = "medaillon.doubleC.bouton.soudure.torsade.aucune.0";
  assert.equal(lireReleveGcMemo({ gcDecor: decor }).gcDecor, decor);
  assert.equal(lireReleveGcMemo({ gcDecor: "medaillon.lyre.bouton.soudure.torsade.aucune.0" }).gcDecor, undefined);
  assert.equal(lireReleveGcMemo({ gcDecor: 12 }).gcDecor, undefined);
  const mots = { gcEtageOptions: ["En étage", "Au rez-de-chaussée"], gcMurOptions: ["Brique"] };
  const memo = releveVersMemo({ etage: "En étage", largeur: "1180", allege: "650", fenetre: "", mur: "", modele: "", decor }, mots);
  assert.equal(memo.gcDecor, decor);
  assert.equal(memoVersReleve(memo, mots).decor, decor);
  assert.equal(releveVersMemo({ etage: "", largeur: "", allege: "", fenetre: "", mur: "", decor: "rien" }, mots).gcDecor, undefined);
  // Le favori le plus chargé, décor compris, tient dans une métadonnée Stripe.
  const produit = getProduct(SLUG_GC_FORGE)!;
  const plusLong = (mots: readonly string[]) => mots.reduce((a, b) => (b.length > a.length ? b : a), "");
  const ids = (options: readonly { id: string }[] | undefined) => (options ?? []).map((o) => o.id);
  const plusLongDecor = plusLong(tousLesDecors().map(idDecorGC));
  const favori = composerFavori({
    slug: SLUG_GC_FORGE, titre: NOM_GC_DECOR.fr, resume: "Fenêtre de 3000 mm · ".padEnd(120, "Chêne massif · "), prixCents: 999_999, maintenantS: 1_780_000_000,
    config: {
      woodId: plusLong(ids(produit.woods)), metalId: plusLong(ids(produit.metals)), fabricId: plusLong(ids(produit.fabrics)), remplissageId: plusLong(ids(produit.remplissages)),
      quantity: 10, codePostal: "49400", modeLivraison: "transporteur", gcLargeurMm: 3000, gcLargeurHautMm: 2990, gcAllegeMm: 1200, gcFenetreMm: 3000, gcEnEtage: false,
      gcMur: "Pierre de taille (tuffeau)", gcModele: "16-5-b-t", gcDecor: plusLongDecor,
    },
  });
  assert.ok(favori, "le favori aurait dû se composer");
  assert.ok(encoderFavori(favori).length <= 500);
  assert.equal(favori.config.gcDecor, plusLongDecor);
});

/* ------------------------------------------------------------------ *
 *  Aucun coût en clair
 * ------------------------------------------------------------------ */

test("les prix et les temps du décor (MTC_PRIX, MTC_TEMPS) sont des chaînes de coûts, absentes du code public et des vignettes", () => {
  assert.ok(DECLARATIONS_COUTS.includes("MTC_PRIX") && DECLARATIONS_COUTS.includes("MTC_TEMPS"));
  assert.ok(!DECLARATIONS_COUTS.includes("MTC_PIECES_PAR_FORME"));
  const corps = texteDuChiffrage();
  assert.ok(corps, "clé absente ou invalide : contrôle impossible");
  // Les textes de MTC_PRIX, tirés du chiffrage déchiffré (jamais écrits ici) : ils sont bien dans la liste contrôlée.
  const require = createRequire(import.meta.url);
  const acorn = require("acorn") as { parse: (t: string, o: object) => { body: { type: string; declarations?: { id: { name: string } }[]; start: number; end: number }[] } };
  const decl = acorn.parse(corps, { ecmaVersion: "latest", sourceType: "script" }).body.find((s) => s.type === "VariableDeclaration" && s.declarations?.some((d) => d.id.name === "MTC_PRIX"));
  assert.ok(decl, "MTC_PRIX introuvable dans le chiffrage");
  const textes = [...corps.slice(decl.start, decl.end).matchAll(/"([^"\\]{12,})"/g)].map((m) => m[1]);
  assert.ok(textes.length >= 10);
  const { valeurs, noms } = chainesSecretes(corps);
  for (const t of textes) assert.ok(valeurs.includes(t), "un texte de MTC_PRIX échappe au contrôle");
  // Nulle part dans src, ni dans les vignettes, ni dans le fichier des décors.
  const fichiers = (dossier: string): string[] => readdirSync(dossier).flatMap((n) => {
    const f = join(dossier, n);
    return statSync(f).isDirectory() ? fichiers(f) : [f];
  });
  const racine = new URL("..", import.meta.url).pathname;
  const publics = [...fichiers(join(racine, "src")), ...fichiers(join(racine, "public/garde-corps/decors"))].filter((f) => !f.endsWith(".chiffre.mjs"));
  let lus = 0;
  for (const f of publics) {
    const texte = readFileSync(f, "utf8");
    lus++;
    assert.deepEqual(secretsDans(texte, valeurs).length, 0, `${f} contient une chaîne de coûts`);
  }
  assert.ok(lus > 100);
  // Les vignettes et la liste des décors : ni valeur ni nom du chiffrage (elles partent telles quelles vers le navigateur).
  const vignettes = fichiers(join(racine, "public/garde-corps/decors"));
  assert.equal(vignettes.length, ASSEMBLAGES.reduce((n, a) => n + DECORS_GC.formes[a].length, 0), "une vignette par décor");
  for (const f of [...vignettes, join(racine, "src/lib/garde-corps-decors.genere.ts")]) {
    const texte = readFileSync(f, "utf8");
    assert.deepEqual(secretsDans(texte, [...valeurs, ...noms]).length, 0, f);
    assert.ok(!texte.includes("€"), `${f} : un montant`);
  }
  for (const a of ASSEMBLAGES) for (const f of DECORS_GC.formes[a]) {
    const svg = readFileSync(join(racine, `public/garde-corps/decors/${a}-${f}.svg`), "utf8");
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+">/, `${a}-${f}`);
    assert.ok(!/<script|on\w+=|href|class=|data-/i.test(svg), `${a}-${f} : rien d'autre qu'un dessin`);
    assert.ok(svg.length < 40_000, `${a}-${f} : ${svg.length} octets`);
  }
  assert.ok(existsSync(join(racine, "src/lib/garde-corps-decors.genere.ts")));
});
