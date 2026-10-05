/**
 * Le garde-corps du site suit les règles de l'outil de plans (décisions de
 * Quentin du 29/09) : ce fichier écrit ces RÈGLES, sans figer de montant (voir
 * tests/README.md). L'égalité exacte avec l'outil est vérifiée à part, dans
 * garde-corps-outil.test.ts.
 *
 * 1. Hauteur à la norme (1 000 mm + appui si l'allège fait 100 à 600 mm, visée
 *    1 025), croix, barreaux en bas, solidité : ceux de l'outil, plus de
 *    350 mm minimum ni de jour de 100.
 * 2. Le prix = le prix conseillé de l'outil, pour la configuration choisie :
 *    carré 16 et le moins de croix qui passe ; sinon un autre carré de 12 à
 *    20 ; sinon « à étudier », sans prix.
 * 3. Plusieurs garde-corps : frais fixes une fois par commande, jamais sous le
 *    plancher.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { ALLEGE_LIBRE, BARRE_APPUI, BORNES_GC, CIBLE_MARGE, DEFAUTS_GC, HAUT_ETAGE, MINI_GC, RENFORT, SPHERE, SPHERE_HAUT, Z_ESCALADE, Z_SPHERE, calculerGC, geomGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { lireReponsePrixGC } from "../src/lib/garde-corps.ts";
import {
  configurerGC,
  entreeValide,
  livraisonGC,
  prixCommandeGC,
  prixGC,
  type ConfigGC,
} from "../src/lib/garde-corps-outil/calcul.ts";
import { ligneGC, lireRequetePrixGC, PARAMETRES_PRIX_GC, reponsePrixGC, type RequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { CARRE_RENFORT, CARRES_RENFORT_SEULS, CROIX_MAX, ESSENCES_GC, ORDRE_CARRES, valeursGC, type EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";
import { tarifLivraison, tarifPose } from "../src/lib/deplacement.ts";

/** Les nombres de croix essayés dans les tests d'indépendance (1 à 12 en entier prendrait plus d'une minute). */
const ECHANTILLON_CROIX = [1, 2, 3, 5, 6, 9, 12];

function chiffrageOuEchec() {
  const etat = chargerChiffrage();
  if (!etat.ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
  return etat.chiffrage;
}

const releve = (e: Partial<EntreeSiteGC> = {}): EntreeSiteGC => ({ largeurMm: 1000, allegeMm: 650, enEtage: true, fenetreMm: 0, essence: "chene", ...e });
const configOk = (e: Partial<EntreeSiteGC>): ConfigGC => {
  const c = configurerGC(releve(e));
  assert.ok(c.ok, `${JSON.stringify(e)} devrait avoir un prix`);
  return c;
};

// Une grille de relevés plausibles (largeurs, allèges, fenêtre connue ou non), en étage, plus une partie au
// rez-de-chaussée. Chaque relevé demande jusqu'à 30 calculs de l'outil (5 carrés × 6 croix) : la grille reste
// courte pour que la suite tourne en quelques secondes.
const GRILLE: EntreeSiteGC[] = [];
for (const largeurMm of [300, 900, 1180, 1250, 1450, 1700])
  for (const allegeMm of [0, 99, 100, 450, 599, 600, 650, 899, 900, 1200])
    GRILLE.push({ largeurMm, allegeMm, enEtage: true, fenetreMm: allegeMm % 200 === 0 ? 1300 : 0, essence: ESSENCES_GC[(largeurMm + allegeMm) % 4] });
for (const e of GRILLE.filter((x) => x.largeurMm === 900 || x.largeurMm === 1450)) GRILLE.push({ ...e, enEtage: false });

// Décision de Quentin (03/10/2026) : la hauteur se mesure TOUJOURS depuis le sol (la loi : « jusqu'à 1 m du
// plancher »). Le bas de la fenêtre, même bas, ne relève plus la visée : la main courante reste à la même hauteur,
// c'est le garde-corps qui grandit ou rapetisse.
// Décision du 04/10/2026 : LE HAUT DE LA MAIN COURANTE NE BOUGE JAMAIS. Il est pile à la visée (1 025 mm du sol),
// au millimètre, sans arrondi. Quand il manque moins que le plus petit garde-corps à croix : une barre d'appui.
test("hauteur : la main courante est pile à 1 025 mm du sol, quel que soit le bas de la fenêtre", () => {
  const cible = HAUT_ETAGE + CIBLE_MARGE;
  let gardeCorps = 0, barres = 0, rien = 0;
  for (const e of GRILLE) {
    const c = configurerGC(e);
    assert.equal(c.mainCouranteMm, cible, `${JSON.stringify(e)} : la main courante ne bouge pas`);
    const manque = cible - e.allegeMm - DEFAUTS_GC.jour;
    if (manque >= MINI_GC) {
      gardeCorps++;
      assert.equal(c.jourMm, DEFAUTS_GC.jour, "le jour sous le cadre est celui de l'outil");
      assert.equal(c.hauteurMm, manque, "la hauteur qu'il faut, au millimètre");
      assert.equal(c.mainCouranteMm, e.allegeMm + c.jourMm + c.hauteurMm);
      if (!c.ok) assert.ok(c.raison === "a-etudier" || c.raison === "fenetre-trop-basse");
    } else {
      assert.equal(c.ok, false, `${JSON.stringify(e)} : pas de garde-corps à croix qui dépasserait la norme`);
      const sans = cible - e.allegeMm < BARRE_APPUI;
      if (sans) rien++; else barres++;
      assert.equal(!c.ok && c.raison, sans ? "sans-garde-corps" : "barre-appui");
      assert.equal(c.hauteurMm, BARRE_APPUI);
      assert.deepEqual(reponsePrixGC({ releve: e, essence: e.essence, quantite: 1 })?.modeles, []);
    }
  }
  assert.ok(gardeCorps > 0 && barres > 0 && rien > 0, "la grille couvre les trois cas");
});

// Au millimètre : la règle de l'outil (geomGC) sur tous les bas de fenêtre possibles.
test("hauteur : à chaque millimètre de bas de fenêtre, un garde-corps pile à la norme, puis une barre d'appui, puis rien", () => {
  const cible = HAUT_ETAGE + CIBLE_MARGE;
  for (let A = BORNES_GC.A.min; A <= BORNES_GC.A.max; A++) {
    const v = valeursGC(DEFAUTS_GC, releve({ allegeMm: A }), 16, 1);
    const g = geomGC(v, 1);
    assert.equal(g.cible, cible);
    if (A <= cible - DEFAUTS_GC.jour - MINI_GC) {
      assert.equal(g.appui, null, `bas de fenêtre à ${A}`);
      assert.equal(A + v.jour + g.Hr, cible, `bas de fenêtre à ${A} : main courante pile à la norme`);
    } else assert.equal(g.appui, A > cible - BARRE_APPUI ? "rien" : "barre", `bas de fenêtre à ${A}`);
  }
});

test("hauteur : la même au rez-de-chaussée qu'en étage (règle de l'outil) ; la loi ne l'impose qu'en étage sous 900 mm", () => {
  for (const e of GRILLE.filter((x) => !x.enEtage)) {
    const rdc = configurerGC(e), etage = configurerGC({ ...e, enEtage: true });
    assert.equal(rdc.hauteurMm, etage.hauteurMm);
    assert.equal(etage.obligatoire, e.allegeMm < ALLEGE_LIBRE);
    assert.equal(rdc.obligatoire, false);
  }
});

test("plus de règle du site : ni 350 mm minimum, ni jour de 100 mm", () => {
  const haute = configurerGC(releve({ allegeMm: 700 }));
  assert.ok(haute.ok && haute.hauteurMm < 350, "une allège de 700 donne un garde-corps plus bas que l'ancien minimum de 350");
  assert.notEqual(haute.jourMm, 100);
});

test("configuration : jamais d'alerte de l'outil sur une pièce vendue", () => {
  for (const e of GRILLE) {
    const c = configurerGC(e);
    if (!c.ok) continue;
    assert.deepEqual(c.R.alertes, [], JSON.stringify(e));
    assert.equal(c.v.s, c.carre);
    assert.equal(c.v.nP, c.croix);
    assert.ok(c.croix >= 1 && c.croix <= CROIX_MAX);
  }
});

test("configuration : le carré de 16 dès qu'il passe, avec le moins de croix possible", () => {
  for (const e of GRILLE.filter((x) => x.enEtage)) {
    const c = configurerGC(e);
    const passe = (s: number, n: number) => calculerGC({ ...valeursGC(DEFAUTS_GC, e, s, n), _rapide: true }).alertes.length === 0;
    const rang = c.ok ? ORDRE_CARRES.indexOf(c.carre as (typeof ORDRE_CARRES)[number]) : ORDRE_CARRES.length;
    // Aucun carré avant celui retenu ne passe, quel que soit le nombre de croix.
    for (const s of ORDRE_CARRES.slice(0, rang)) for (let n = 1; n <= CROIX_MAX; n++) assert.ok(!passe(s, n), `${JSON.stringify(e)} : le carré ${s} passait avec ${n} croix`);
    if (!c.ok) continue;
    // Dans le carré retenu, une croix de moins ne passe pas.
    for (let n = 1; n < c.croix; n++) assert.ok(!passe(c.carre, n), `${JSON.stringify(e)} : ${n} croix suffisaient`);
  }
});

test("configuration : barreaux en bas quand le cadre commence dans la zone d'escalade (sous 600 mm du sol)", () => {
  for (const e of GRILLE) {
    const c = configurerGC(e);
    if (!c.ok) continue;
    const soubassement = c.R.debit.some((d) => /soubassement/i.test(d.nom));
    // Règle du 03/10 : quand les croix seules ne passent pas, l'outil met des barreaux en bas (modèle « -b »).
    assert.equal(soubassement, c.barreauxBas || e.allegeMm + c.jourMm < Z_ESCALADE, JSON.stringify(e));
  }
});

test("configuration : aucun trou ne laisse passer la boule (110 mm sous 800 mm du sol, 180 mm au-dessus)", () => {
  for (const e of GRILLE) {
    const c = configurerGC(e);
    if (!c.ok) continue;
    const g = geomGC(c.v, c.croix);
    assert.ok(g.ok && g.dMax < g.limite, JSON.stringify(e));
    for (const t of g.trous as { d: number; limite: number; yBas: number }[]) {
      assert.equal(t.limite, g.zBas as number + t.yBas < Z_SPHERE ? SPHERE : SPHERE_HAUT);
      assert.ok(t.d < t.limite);
    }
  }
});

test("configuration : trop large pour la lisse haute en carré 16 → un carré plus gros, le fer plat de renfort, ou « à étudier »", () => {
  let vus = 0, renforces = 0;
  const souple = (e: EntreeSiteGC, s: number) => calculerGC({ ...valeursGC(DEFAUTS_GC, e, s, CROIX_MAX), _rapide: true }).alertes.some((a: string) => a.startsWith("Solidité"));
  for (const e of GRILLE) {
    if (!souple(e, 16)) {
      const c = configurerGC(e);
      assert.ok(!c.ok || !c.renfort, `${JSON.stringify(e)} : le carré de 16 suffit, pas de fer plat`);
      continue;
    }
    vus++;
    const c = configurerGC(e);
    if (c.ok && c.renfort) {
      // Le fer plat : seulement quand même le plus gros carré de l'atelier est trop souple, et au carré de 16.
      renforces++;
      assert.ok(souple(e, 20), `${JSON.stringify(e)} : un carré de 20 suffisait`);
      assert.equal(c.carre, CARRE_RENFORT);
      assert.ok(c.v.B - c.v.j <= RENFORT.LcMax, `${JSON.stringify(e)} : au-delà de la largeur garantie du fer plat`);
      assert.deepEqual([c.v.renfort, c.R.mc?.renfort?.l, c.R.mc?.renfort?.e, c.R.alertes.length], ["plat", RENFORT.l, RENFORT.e, 0]);
    } else if (c.ok) {
      assert.ok(c.carre > 16 && !souple(e, c.carre), `${JSON.stringify(e)} : carré ${c.carre}`);
      assert.equal(c.R.mc?.renfort ?? null, null, `${JSON.stringify(e)} : pas de fer plat quand un carré suffit`);
    } else if (c.raison === "barre-appui" || c.raison === "sans-garde-corps") continue;   // pas de garde-corps à croix du tout
    else assert.ok(c.alertes.length > 0, `${JSON.stringify(e)} : une raison est donnée`);
  }
  assert.ok(vus > 0, "la grille doit contenir des largeurs trop grandes pour le carré 16");
  assert.ok(renforces > 0, "la grille doit contenir des fenêtres larges vendues avec le fer plat");
  // Les bornes du fer plat : 2 400 mm de cadre au plus. Un millimètre de plus : à étudier.
  const juste = configurerGC(releve({ largeurMm: RENFORT.LcMax + DEFAUTS_GC.j }));
  assert.ok(juste.ok && juste.renfort, "2 400 mm de cadre : vendu avec le fer plat");
  const trop = configurerGC(releve({ largeurMm: RENFORT.LcMax + DEFAUTS_GC.j + 1 }));
  assert.equal(trop.ok, false, "au-delà : à étudier");
  assert.ok(!trop.ok && trop.alertes.includes("solidite"));
  // Et à l'autre bout, la largeur maximale de l'outil ne se vend pas sans étude.
  assert.equal(configurerGC(releve({ largeurMm: BORNES_GC.B.max })).ok, false);
});

test("fenêtre large : le fer plat est le même pour tous les dessins, ne se choisit pas et ne se contourne pas", () => {
  chiffrageOuEchec();
  const large = { largeurMm: 1990, allegeMm: 650, enEtage: true, fenetreMm: 0 };
  const q = { releve: large, essence: "chene" as const, quantite: 1 };
  const r = reponsePrixGC(q);
  assert.ok(r && r.ok && r.renfort, "1 990 mm : vendu, avec le fer plat");
  const conformes = r.modeles.filter((m) => m.conforme);
  assert.ok(conformes.length >= 3);
  for (const m of conformes) {
    assert.equal(m.renfort, true, `${m.id} : sur cette largeur, tous les modèles vendus ont le fer plat`);
    // (Les barreaux seuls peuvent demander un carré de 18 ou de 20 : leur charge verticale dépend du carré.)
    if (m.seuls) assert.ok((CARRES_RENFORT_SEULS as readonly number[]).includes(m.carre), `${m.id} : carré ${m.carre}`);
    else assert.equal(m.carre, CARRE_RENFORT);
    // Un identifiant forgé dans un autre carré : le même garde-corps, au même prix (le carré reste celui de l'atelier).
    for (const s of ORDRE_CARRES) {
      const forge = reponsePrixGC({ ...q, releve: { ...large, modele: m.id.replace(/^\d+/, String(s)) } });
      assert.ok(forge && forge.ok, `${s} : ${m.id}`);
      assert.deepEqual([forge.carre, forge.renfort, forge.prix], [m.carre, true, m.prix]);
    }
  }
  for (const m of r.modeles.filter((x) => !x.conforme)) {
    const forge = reponsePrixGC({ ...q, releve: { ...large, modele: m.id } });
    assert.ok(forge && !forge.ok, `${m.id} : hors norme, pas vendu`);
  }
  // Le prix compte le fer plat : plus cher que le même dessin sur une fenêtre où un carré suffit.
  const etroit = reponsePrixGC({ ...q, releve: { ...large, largeurMm: 1180, modele: r.modeles.find((m) => m.conforme)!.id } });
  assert.ok(etroit && (!etroit.ok || (etroit.renfort === false && etroit.prix < r.prix)));
  // Le libellé de commande et le devis le disent.
  const ligne = ligneGC(large, { woodId: "chene" });
  assert.ok(ligne.ok && ligne.line.gc?.renfort);
  assert.match(ligne.line.size!.label, /lisse haute renforcée$/);
  const en = ligneGC(large, { woodId: "chene" }, "en");
  assert.ok(en.ok);
  assert.match(en.line.size!.label, /reinforced top rail$/);
  // Sous un panneau de verre aussi : la lisse haute reste renforcée.
  const verre = ligneGC(large, { woodId: "chene", remplissageId: "verre" });
  assert.ok(verre.ok && verre.line.gc?.renfort);
  assert.match(verre.line.size!.label, /lisse haute renforcée$/);
});

test("configuration : fenêtre trop basse pour la hauteur demandée → « à étudier », raison fenêtre", () => {
  const c = configurerGC(releve({ allegeMm: 600, fenetreMm: 300 }));
  assert.equal(c.ok, false);
  assert.equal(!c.ok && c.raison, "fenetre-trop-basse");
  const assez = configurerGC(releve({ allegeMm: 600, fenetreMm: configurerGC(releve({ allegeMm: 600 })).mainCouranteMm - 600 }));
  assert.ok(assez.ok, "une fenêtre qui monte juste à la main courante suffit");
});

test("prix : un multiple de 10, jamais sous le plancher de l'outil, et il reste de quoi payer l'atelier", () => {
  const { chiffrerGC } = chiffrageOuEchec();
  for (const e of GRILLE) {
    const c = configurerGC(e);
    if (!c.ok) continue;
    const prix = prixGC(c);
    const C = chiffrerGC(c.R, c.v);
    assert.equal(prix, C.conseille, "le prix du site est le prix conseillé de l'outil");
    assert.equal(prix % 10, 0);
    assert.ok(prix >= C.plancher, `${JSON.stringify(e)} : ${prix} sous le plancher`);
    assert.ok(prix - C.plancher < 10, "arrondi à la dizaine au-dessus, pas plus");
    assert.ok(C.reste(prix) >= -1e-9, "le prix couvre les coûts");
  }
});

// Le prix pour des largeurs croissantes, par allège et par bois : [largeur, carré, croix, prix].
function prixParLargeur(allegeMm: number, essence: EntreeSiteGC["essence"], debut: number, fin: number, pas: number) {
  const suite: [number, number, number, number][] = [];
  for (let largeurMm = debut; largeurMm <= fin; largeurMm += pas) {
    const c = configurerGC(releve({ largeurMm, allegeMm, essence }));
    if (c.ok) suite.push([largeurMm, c.carre, c.croix, prixGC(c)]);
  }
  return suite;
}

test("prix : à carré égal, il ne baisse jamais quand la fenêtre s'élargit", () => {
  chiffrageOuEchec();
  for (const allegeMm of [0, 300, 650, 950]) {
    for (const essence of ["pin", "noyer"] as const) {
      const suite = prixParLargeur(allegeMm, essence, BORNES_GC.B.min, 1500, 100);
      for (let i = 1; i < suite.length; i++) {
        const [l0, s0, , p0] = suite[i - 1], [l1, s1, , p1] = suite[i];
        if (s0 === s1) assert.ok(p1 >= p0, `${essence}, allège ${allegeMm} : ${l1} mm coûte ${p1} €, moins que ${l0} mm (${p0} €)`);
      }
    }
  }
});

// POINT OUVERT (à trancher par Quentin, pas un bug à corriger seul) : au passage du carré 18 au carré 20,
// le prix peut baisser. Exemple relevé : allège 300, 1 425 mm = carré 18 et 4 croix, 850 € ; 1 430 mm =
// carré 20 et 3 croix, 780 €. Deux causes, dans l'outil : l'acier est compté au prix du carré de 16 quel que
// soit le carré, et le carré de 20 demande moins de croix (moins de soudures). Tant que ce n'est pas tranché,
// ce test est noté « todo » : il ne fait pas échouer la suite, il montre l'écart.
test("prix : il ne baisse jamais quand la fenêtre s'élargit, même quand le carré change", { todo: "écart au passage carré 18 → 20 : décision de Quentin" }, () => {
  chiffrageOuEchec();
  const suite = prixParLargeur(300, "chene", 1400, 1450, 5);
  for (let i = 1; i < suite.length; i++) {
    const [l0, s0, n0, p0] = suite[i - 1], [l1, s1, n1, p1] = suite[i];
    assert.ok(p1 >= p0, `${l0} mm (carré ${s0}, ${n0} croix) = ${p0} € ; ${l1} mm (carré ${s1}, ${n1} croix) = ${p1} €`);
  }
});

test("commande : une seule pièce = exactement le prix de l'outil, sans remise", () => {
  chiffrageOuEchec();
  const c = configOk({ largeurMm: 1180 });
  assert.deepEqual(prixCommandeGC([{ config: c, quantite: 1 }]), { pieces: 1, sommeUnitaires: prixGC(c), prix: prixGC(c), remise: 0 });
});

test("commande : plusieurs pièces, frais fixes une seule fois, jamais sous le plancher de la commande", () => {
  const { chiffrerGC, REGLAGES } = chiffrageOuEchec();
  const k = (1 - REGLAGES.cotis) / (1 + REGLAGES.tvaVente) - REGLAGES.stripePct;
  const paniers = [
    [{ config: configOk({ largeurMm: 1180 }), quantite: 2 }],
    [{ config: configOk({ largeurMm: 1180 }), quantite: 3 }],
    [{ config: configOk({ largeurMm: 800, allegeMm: 300 }), quantite: 1 }, { config: configOk({ largeurMm: 1400, allegeMm: 700, essence: "noyer" }), quantite: 2 }],
    [{ config: configOk({ largeurMm: 450, allegeMm: 735, essence: "pin" }), quantite: 10 }],
  ];
  for (const lignes of paniers) {
    const r = prixCommandeGC(lignes);
    const pieces = lignes.reduce((t, l) => t + l.quantite, 0);
    const somme = lignes.reduce((t, l) => t + l.quantite * prixGC(l.config), 0);
    const cout = lignes.reduce((t, l) => t + l.quantite * chiffrerGC(l.config.R, l.config.v).cout, 0) - (pieces - 1) * REGLAGES.fraisFixes;
    const plancher = (cout + REGLAGES.stripeFixe) / k;
    assert.equal(r.pieces, pieces);
    assert.equal(r.sommeUnitaires, somme);
    assert.equal(r.remise, r.prix - somme);
    assert.ok(r.remise <= 0, "une remise, jamais un supplément");
    assert.equal(r.prix % 10, 0);
    assert.ok(r.prix >= plancher, "jamais sous le plancher de la commande");
    assert.ok(r.prix - plancher < 10, "arrondi à la dizaine au-dessus, pas plus");
    // Les frais fixes comptés une fois : la commande coûte moins que les pièces payées une à une.
    if (REGLAGES.fraisFixes / k >= 20) assert.ok(r.prix < somme, "plusieurs pièces : la remise doit être réelle");
  }
});

test("commande : une pièce « à étudier » ou une quantité fausse est refusée", () => {
  chiffrageOuEchec();
  const c = configOk({});
  const aEtudier = configurerGC(releve({ largeurMm: BORNES_GC.B.max }));
  assert.throws(() => prixCommandeGC([]));
  assert.throws(() => prixCommandeGC([{ config: c, quantite: 0 }]));
  assert.throws(() => prixCommandeGC([{ config: c, quantite: 1.5 }]));
  assert.throws(() => prixCommandeGC([{ config: aEtudier as unknown as ConfigGC, quantite: 1 }]));
  assert.throws(() => prixGC(aEtudier as unknown as ConfigGC));
});

test("livraison : l'outil compte comme le site (deplacement.ts), retrait à l'atelier gratuit", () => {
  const { remiseGC } = chiffrageOuEchec();
  let graine = 7;
  const hasard = () => ((graine = (graine * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let i = 0; i < 300; i++) {
    const km = Math.round(hasard() * 900 * 10) / 10, kg = Math.round(hasard() * 80 * 100) / 100;
    const B = 300 + Math.round(hasard() * 2700), hauteurGC = 200 + Math.round(hasard() * 1000);
    assert.equal(remiseGC({ kg, hauteurGC }, { B, remise: "transporteur", km }).prix * 100, tarifLivraison(km, kg, Math.max(B, hauteurGC)).montantCents, `transporteur ${km} km ${kg} kg`);
    assert.equal(remiseGC({ kg, hauteurGC }, { B, remise: "pose", km }).prix * 100, tarifPose(km).montantCents, `pose ${km} km`);
    assert.equal(remiseGC({ kg, hauteurGC }, { B, remise: "retrait", km }).prix, 0);
  }
});

test("livraison d'une commande : le poids de toutes les pièces ; pour une pièce, exactement l'outil", () => {
  const { remiseGC } = chiffrageOuEchec();
  const c = configOk({ largeurMm: 1180 });
  for (const mode of ["transporteur", "pose", "retrait"] as const) {
    const un = livraisonGC([{ config: c, quantite: 1 }], mode, 120);
    assert.equal(un.prix, remiseGC(c.R, { ...c.v, remise: mode, km: 120 }).prix);
    assert.equal(un.kg, c.kg);
  }
  const trois = livraisonGC([{ config: c, quantite: 3 }], "transporteur", 120);
  assert.ok(Math.abs(trois.kg - 3 * c.kg) < 1e-9);
  assert.ok(trois.prix >= livraisonGC([{ config: c, quantite: 1 }], "transporteur", 120).prix);
  assert.equal(livraisonGC([{ config: c, quantite: 3 }], "retrait", 120).prix, 0);
});

test("adresse de /api/prix-garde-corps : seuls des millimètres entiers dans les bornes de l'outil passent", () => {
  const ok = (q: string) => lireRequetePrixGC(new URLSearchParams(q));
  assert.deepEqual(ok("l=1180&allege=650&etage=1&fenetre=1400&wood=chene"), {
    releve: { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 },
    essence: "chene",
    metalId: undefined,
    fabricId: undefined,
    remplissageId: undefined,
    quantite: 1,
  });
  assert.deepEqual(ok("l=1180&allege=650&etage=0&wood=pin&metal=blanc&fabric=fonte&remplissage=verre&qty=3"), {
    releve: { largeurMm: 1180, allegeMm: 650, enEtage: false, fenetreMm: 0 },
    essence: "pin",
    metalId: "blanc",
    fabricId: "fonte",
    remplissageId: "verre",
    quantite: 3,
  });
  assert.ok(ok(`l=${BORNES_GC.B.min}&allege=${BORNES_GC.A.max}&etage=1&wood=noyer&fenetre=${BORNES_GC.Hf.max}`));
  for (const q of [
    "",
    "l=1180&allege=650&etage=1",                          // bois manquant
    "l=1180&allege=650&etage=oui&wood=chene",             // étage : 1 ou 0
    "l=1180&allege=650&etage=1&wood=teck",                // bois inconnu
    "l=1180.5&allege=650&etage=1&wood=chene",             // pas un entier
    "l=-5&allege=650&etage=1&wood=chene",
    "l=1e3&allege=650&etage=1&wood=chene",
    `l=${BORNES_GC.B.min - 1}&allege=650&etage=1&wood=chene`,
    `l=${BORNES_GC.B.max + 1}&allege=650&etage=1&wood=chene`,
    `l=1180&allege=${BORNES_GC.A.max + 1}&etage=1&wood=chene`,
    `l=1180&allege=650&etage=1&wood=chene&fenetre=${BORNES_GC.Hf.max + 1}`,
    "l=1180&allege=650&etage=1&wood=chene&prix=1",        // paramètre inconnu
    "l=1180&l=900&allege=650&etage=1&wood=chene",         // en double
    "l=1180&allege=650&etage=1&wood=chene&qty=0",         // quantité de 1 à 10
    "l=1180&allege=650&etage=1&wood=chene&qty=11",
    "l=1180&allege=650&etage=1&wood=chene&metal=NOIR!",   // un identifiant d'option, rien d'autre
  ]) assert.equal(ok(q), null, q);
  assert.deepEqual([...PARAMETRES_PRIX_GC].sort(), ["allege", "etage", "fabric", "fenetre", "l", "metal", "modele", "qty", "remplissage", "wood"]);
});

test("un relevé hors des bornes de l'outil n'est jamais calculé", () => {
  assert.equal(entreeValide(releve({ largeurMm: BORNES_GC.B.max + 1 })), false);
  assert.throws(() => configurerGC(releve({ largeurMm: 1180.5 })), RangeError);
  assert.throws(() => configurerGC(releve({ essence: "teck" as "pin" })), RangeError);
});

const requete = (e: Partial<EntreeSiteGC> = {}, q: Partial<RequetePrixGC> = {}): RequetePrixGC => {
  const { essence, ...r } = releve(e);
  return { releve: r, essence, quantite: 1, ...q };
};

test("réponse de /api/prix-garde-corps : le prix et la forme, rien d'autre", () => {
  chiffrageOuEchec();
  const ok = reponsePrixGC(requete({ largeurMm: 1180 }));
  assert.ok(ok);
  assert.deepEqual(Object.keys(ok).sort(), ["carre", "conforme", "croix", "hauteurMm", "jourMm", "kg", "mainCouranteMm", "modeles", "obligatoire", "ok", "prix", "remise", "renfort", "seuls", "soubassementMm", "traverse"]);
  const non = reponsePrixGC(requete({ largeurMm: BORNES_GC.B.max }));
  assert.ok(non);
  assert.deepEqual(Object.keys(non).sort(), ["alertes", "conforme", "hauteurMm", "jourMm", "mainCouranteMm", "modeles", "obligatoire", "ok", "raison"]);
  for (const r of [ok, non]) for (const x of Object.values(r)) assert.ok(["number", "boolean", "string"].includes(typeof x) || Array.isArray(x));
});

test("réponse de /api/prix-garde-corps : le prix de l'outil, plus les suppléments des options du site", () => {
  chiffrageOuEchec();
  const c = configOk({ largeurMm: 1180 });
  const base = reponsePrixGC(requete({ largeurMm: 1180 }));
  assert.ok(base?.ok);
  // Les options du modèle (noir, fleur, croix) : exactement le prix de l'outil.
  assert.equal(base.prix, prixGC(c));
  assert.equal(base.remise, 0);
  // Une rosace plus chère ajoute son supplément (décision 5 : inchangé, ajouté au prix de l'outil).
  const fonte = reponsePrixGC(requete({ largeurMm: 1180 }, { fabricId: "fonte" }));   // Ø100 comme la fleur : même dessin
  assert.ok(fonte?.ok);
  assert.ok(fonte.prix > base.prix);
  // Le grand médaillon (Ø170) compte pour la norme : il peut permettre un autre dessin ; son supplément s'ajoute au prix de CE dessin.
  const medaillon = reponsePrixGC(requete({ largeurMm: 1180 }, { fabricId: "medaillon" }));
  assert.ok(medaillon?.ok);
  const ligneMedaillon = ligneGC(requete({ largeurMm: 1180 }).releve, { woodId: "chene", fabricId: "medaillon" });
  assert.ok(ligneMedaillon.ok && ligneMedaillon.line.gc);
  assert.equal(medaillon.prix, ligneMedaillon.line.gc.prixOutil + 30);
  // Le verre remplace les croix : son supplément s'ajoute, la rosace ne se paie plus.
  const verre = reponsePrixGC(requete({ largeurMm: 1180 }, { remplissageId: "verre", fabricId: "medaillon" }));
  assert.ok(verre?.ok);
  assert.ok(verre.prix > base.prix);
  const verreFleur = reponsePrixGC(requete({ largeurMm: 1180 }, { remplissageId: "verre" }));
  assert.equal(verre.prix, verreFleur?.ok ? verreFleur.prix : NaN, "sous le verre, pas de rosace à payer");
  // Plusieurs pièces : la remise de la commande (frais fixes une fois), la même que prixCommandeGC.
  const trois = reponsePrixGC(requete({ largeurMm: 1180 }, { quantite: 3 }));
  assert.ok(trois?.ok);
  assert.equal(trois.prix, base.prix);
  assert.equal(trois.remise, prixCommandeGC([{ config: c, quantite: 3 }]).remise);
  // Une option inconnue : pas de réponse (la route répond 400).
  assert.equal(reponsePrixGC(requete({ largeurMm: 1180 }, { metalId: "or" })), null);
});


test("catalogue des modèles : tous montrés, seuls les conformes ont un prix, un modèle hors norme ou forgé ne se vend pas", () => {
  chiffrageOuEchec();
  const releve = { largeurMm: 1190, allegeMm: 585, enEtage: true, fenetreMm: 1200 };
  const q = { releve, essence: "chene" as const, quantite: 1 };
  const r = reponsePrixGC(q);
  assert.ok(r && r.ok, "ce relevé a un prix");
  assert.ok(r.modeles.length >= 12 && r.modeles.length <= 48, "le catalogue entier est envoyé");
  assert.deepEqual(Object.keys(r.modeles[0]).sort(), ["carre", "conforme", "croix", "hauteurMm", "id", "kg", "prix", "raisons", "renfort", "rosace", "seuls", "soubassementMm", "traverse", "trous"]);
  // Les quatre familles : croix seules, traverse au milieu, barreaux en bas, les deux.
  assert.ok(r.modeles.some((m) => m.traverse) && r.modeles.some((m) => !m.traverse));
  const conformes = r.modeles.filter((m) => m.conforme), hors = r.modeles.filter((m) => !m.conforme);
  assert.ok(conformes.length >= 1 && hors.length >= 1);
  // Le modèle que l'outil retient de lui-même est dans le catalogue, au même prix.
  assert.equal(conformes.find((m) => m.croix === r.croix && m.traverse === r.traverse && m.soubassementMm > 0 === r.soubassementMm > 0)?.prix, r.prix);
  for (const m of conformes) {
    // (Un modèle qui demande le grand médaillon se commande avec lui : c'est la rosace du modèle.)
    const choisi = reponsePrixGC({ ...q, fabricId: m.rosace || undefined, releve: { ...releve, modele: m.id } });
    assert.ok(choisi && choisi.ok, `le modèle ${m.id} se commande`);
    assert.equal(choisi.prix, m.prix, `le modèle ${m.id} est encaissé au prix affiché`);
    assert.deepEqual([choisi.carre, choisi.croix, choisi.traverse], [m.carre, m.croix, m.traverse]);
  }
  for (const m of hors) {
    assert.equal(m.prix, 0, `le modèle hors norme ${m.id} n'a pas de prix`);
    const forge = reponsePrixGC({ ...q, releve: { ...releve, modele: m.id } });
    assert.ok(forge && !forge.ok, `le modèle hors norme ${m.id} ne se vend pas`);
  }
  // Le carré de l'identifiant est indicatif : c'est le DESSIN qui est choisi, le carré reste celui de l'atelier.
  // Un identifiant forgé dans un autre carré ne donne ni un autre garde-corps ni un autre prix.
  for (const m of conformes) {
    const suite = m.id.replace(/^\d+-\d+/, "");
    for (const s of ORDRE_CARRES) {
      const forge = reponsePrixGC({ ...q, fabricId: m.rosace || undefined, releve: { ...releve, modele: `${s}-${m.croix}${suite}` } });
      assert.ok(forge && forge.ok, `${s}-${m.croix}${suite} : le même dessin`);
      assert.deepEqual([forge.carre, forge.croix, forge.soubassementMm, forge.traverse, forge.prix], [m.carre, m.croix, m.soubassementMm, m.traverse, m.prix], `${s}-${m.croix}${suite}`);
    }
  }
  // Un modèle illisible : l'adresse est refusée.
  assert.equal(lireRequetePrixGC(new URLSearchParams("l=1190&allege=585&etage=1&fenetre=1200&wood=chene&modele=99-9")), null);
  assert.equal(lireRequetePrixGC(new URLSearchParams("l=1190&allege=585&etage=1&fenetre=1200&wood=chene&modele=16-3"))?.releve.modele, "16-3");
});

test("modèles hors norme : le rond rouge et les ronds verts de l'outil accompagnent le refus", () => {
  chiffrageOuEchec();
  // La fenêtre de Quentin (05/10) : 1 775 × 410 en étage, aucun modèle ne convient.
  const q = { releve: { largeurMm: 1775, allegeMm: 410, enEtage: true, fenetreMm: 0 }, essence: "chene" as const, quantite: 1 };
  const r = reponsePrixGC(q);
  // (Avec 7 à 12 croix l'outil résout cette fenêtre basse et large : des modèles aux normes ET des refusés.)
  assert.ok(r);
  const refuses = r.modeles.filter((m) => !m.conforme);
  assert.ok(refuses.length >= 6);
  for (const m of r.modeles.filter((x) => x.conforme)) assert.equal(m.trous, null, `${m.id} : aux normes, rien à expliquer`);
  for (const m of refuses.filter((x) => x.raisons.includes("trous"))) {
    const t = m.trous;
    assert.ok(t, `${m.id} : un vide trop grand, donc des ronds`);
    // Au moins un rond rouge (le vide trop grand), plus grand que la boule qui ne doit pas passer.
    const rouges = t.ronds.filter((x) => !x.ok);
    assert.ok(rouges.length >= 1, `${m.id} : un rond rouge`);
    assert.ok(t.plusGrandMm >= t.limiteMm && Math.max(...rouges.map((x) => x.d)) === t.plusGrandMm, `${m.id} : le plus grand vide dépasse la limite`);
    assert.ok(rouges.every((x) => x.d >= 1), "diamètres positifs");
    // Les ronds sont dans le cadre.
    for (const x of t.ronds) assert.ok(x.x - x.d / 2 >= -1 && x.x + x.d / 2 <= t.cadreMm.l + 1 && x.y - x.d / 2 >= -1 && x.y + x.d / 2 <= t.cadreMm.h + 1, `${m.id} : rond dans le cadre ${JSON.stringify(x)}`);
  }
  // Plus de croix : le plus grand vide diminue (c'est ce que le client doit comprendre).
  const seules = refuses.filter((m) => !m.traverse && !m.seuls && m.soubassementMm > 0 === refuses[0].soubassementMm > 0 && m.trous).sort((a, b) => a.croix - b.croix);
  for (let i = 1; i < seules.length; i++) assert.ok(seules[i].trous!.plusGrandMm <= seules[i - 1].trous!.plusGrandMm, "plus de croix, vide plus petit");
  // Et la réponse se relit côté navigateur, ronds compris ; un format truqué est refusé.
  const relu = lireReponsePrixGC(JSON.parse(JSON.stringify(r)));
  assert.ok(relu);
  assert.deepEqual(relu.modeles.map((m) => m.trous), r.modeles.map((m) => m.trous));
  const truque = JSON.parse(JSON.stringify(r));
  const i = truque.modeles.findIndex((m: { trous: unknown }) => m.trous);
  truque.modeles[i].trous.ronds[0].x = "12";
  assert.equal(lireReponsePrixGC(truque), null, "un rond mal formé : la réponse est refusée");
  const trop = JSON.parse(JSON.stringify(r));
  trop.modeles[i].trous.ronds = Array.from({ length: 40 }, () => ({ x: 1, y: 1, d: 5, ok: true }));
  assert.equal(lireReponsePrixGC(trop), null, "trop de ronds : refusé");
});

test("le modèle choisi ne saute pas quand une cote fait changer de carré : c'est le dessin qui est choisi", () => {
  chiffrageOuEchec();
  // Pour chaque dessin conforme d'une fenêtre, on élargit la fenêtre pas à pas en renvoyant le MÊME identifiant
  // (comme la fiche) : tant que le catalogue propose ce dessin, le serveur le vend — même dans un autre carré.
  let changements = 0;
  for (const allegeMm of [300, 650]) {
    const depart = reponsePrixGC({ releve: { largeurMm: 700, allegeMm, enEtage: true, fenetreMm: 0 }, essence: "chene", quantite: 1 });
    assert.ok(depart);
    // (Jusqu'à 6 croix ici ; les modèles de 7 à 12 croix sont couverts par parite-outil-site.test.ts.)
    for (const choisi of depart.modeles.filter((m) => m.conforme && m.croix <= 6 && (m.seuls || m.rosace === "fleur"))) {
      for (let largeurMm = 700; largeurMm <= 1700; largeurMm += 100) {
        const releve = { largeurMm, allegeMm, enEtage: true, fenetreMm: 0 };
        const catalogue = reponsePrixGC({ releve, essence: "chene", quantite: 1 })!.modeles;
        const propose = catalogue.find((m) => m.conforme && m.croix === choisi.croix && m.traverse === choisi.traverse && m.seuls === choisi.seuls && m.rosace === choisi.rosace && m.soubassementMm > 0 === choisi.soubassementMm > 0);
        const r = reponsePrixGC({ releve: { ...releve, modele: choisi.id }, essence: "chene", quantite: 1 });
        assert.ok(r);
        if (propose && (propose.id.includes("-b") === choisi.id.includes("-b") || propose.soubassementMm > 0)) {
          assert.ok(r.ok, `${choisi.id} à ${largeurMm} mm (allège ${allegeMm}) : le catalogue le propose (${propose.id}), il doit se vendre`);
          assert.equal(r.prix, propose.prix, `${choisi.id} à ${largeurMm} mm : le prix du catalogue`);
          if (propose.carre !== choisi.carre) changements++;
        }
      }
    }
  }
  assert.ok(changements > 0, "la grille doit contenir des largeurs où le carré change");
});

test("le libellé de la commande dit ce qui est vendu : barreaux en bas, section du carré", () => {
  chiffrageOuEchec();
  const releve = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 };
  const r = reponsePrixGC({ releve, essence: "chene", quantite: 1 });
  assert.ok(r);
  const libelles = new Map<string, number>();
  for (const m of r.modeles.filter((x) => x.conforme)) {
    const l = ligneGC({ ...releve, modele: m.id }, { woodId: "chene", fabricId: m.rosace || undefined });
    assert.ok(l.ok);
    const libelle = l.line.size.label;
    if (m.seuls) assert.equal(libelle.includes("croix"), false, libelle);
    else assert.match(libelle, new RegExp(`${m.croix} croix`));
    assert.match(libelle, new RegExp(`acier carré de ${m.carre}$`));
    assert.equal(libelle.includes("barreaux en bas"), m.soubassementMm > 0 && !m.seuls, libelle);
    assert.equal(libelle.includes("barreaux seuls"), m.seuls, libelle);
    assert.equal(libelle.includes("traverse au milieu"), m.traverse, libelle);
    // Deux modèles différents ne portent jamais le même libellé (l'atelier ne les distinguait que par le prix).
    assert.equal(libelles.has(libelle), false, libelle);
    libelles.set(libelle, m.prix);
  }
  assert.ok(libelles.size >= 2);
  const en = ligneGC({ ...releve, modele: r.modeles.find((x) => x.conforme && x.soubassementMm > 0 && x.traverse)!.id }, { woodId: "chene" }, "en");
  assert.ok(en.ok);
  assert.match(en.line.size.label, /middle rail, bars below, \d+ mm square bar$/);
});

test("une traverse au milieu : la solution de l'outil quand le vide entre les barres est trop grand, proposée sur le site", () => {
  chiffrageOuEchec();
  // Le modèle de la photo (deux croix) sur une fenêtre de 1 180 mm : hors norme seul (trous), aux normes avec une traverse.
  const fenetre = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 };
  const r = reponsePrixGC({ releve: fenetre, essence: "chene", quantite: 1 });
  assert.ok(r && r.ok);
  const seul = r.modeles.find((m) => m.croix === 2 && !m.traverse && m.soubassementMm === 0);
  const avec = r.modeles.find((m) => m.croix === 2 && m.traverse && m.soubassementMm === 0);
  assert.ok(seul && !seul.conforme && seul.raisons.includes("trous"), "deux croix seules : le vide est trop grand");
  assert.ok(avec && avec.conforme && avec.prix > 0, "deux croix avec une traverse : aux normes, avec un prix");
  assert.match(avec.id, /^\d+-2-t$/);
  // C'est bien l'outil qui le dit : mêmes réglages, traverse cochée, aucune alerte ; décochée, l'alerte « Trous ».
  const v = valeursGC(DEFAUTS_GC, releve({ largeurMm: 1180, allegeMm: 650 }), avec.carre, 2, false, true);
  assert.equal(v.traverse, true);
  assert.deepEqual(calculerGC({ ...v, _rapide: true }).alertes, []);
  assert.ok(calculerGC({ ...v, traverse: false, _rapide: true }).alertes.some((a: string) => a.startsWith("Trous")));
  // Le modèle choisi est vendu tel quel, la traverse est écrite sur la commande, et elle a un prix (plus d'acier).
  const choisi = reponsePrixGC({ releve: { ...fenetre, modele: avec.id }, essence: "chene", quantite: 1 });
  assert.ok(choisi && choisi.ok && choisi.traverse && choisi.croix === 2 && choisi.prix === avec.prix);
  const l = ligneGC({ ...fenetre, modele: avec.id }, { woodId: "chene" });
  assert.ok(l.ok && l.line.gc?.traverse);
  assert.match(l.line.size.label, /2 croix, traverse au milieu, acier carré de \d+$/);
  const sansTraverse = r.modeles.find((m) => m.conforme && !m.traverse && m.soubassementMm === 0);
  assert.ok(sansTraverse);
  // Sans choix du client, les croix seules restent proposées d'abord quand elles passent.
  assert.equal(r.traverse, false);
});

test("la rigidité de la lisse ne dépend pas du dessin : un carré écarté pour un dessin l'est pour tous", () => {
  // configurerGC s'appuie dessus pour ne pas refaire le calcul (calcul.ts, « rigide ») : si l'outil change, ce test le dit.
  for (const allegeMm of [0, 400, 650, 735])
    for (const largeurMm of [300, 900, 1180, 1400, 1500, 1700, 2000, 3000])
      for (const s of ORDRE_CARRES) {
        const vus = new Set<boolean>();
        for (const b of [false, true])
          for (const t of [false, true])
            for (const n of ECHANTILLON_CROIX) {
              const alertes: string[] = calculerGC({ ...valeursGC(DEFAUTS_GC, releve({ largeurMm, allegeMm }), s, n, b, t), _rapide: true }).alertes;
              // « Trop petit pour ce nombre de croix » : l'outil s'arrête avant de contrôler la solidité.
              if (alertes.some((a) => a.startsWith("Le garde-corps est trop petit"))) continue;
              vus.add(alertes.some((a) => a.startsWith("Solidité")));
            }
        assert.ok(vus.size <= 1, `${largeurMm} × ${allegeMm}, carré ${s} : la solidité change avec le dessin`);
      }
});

test("le calcul rapide est le calcul complet de l'outil quand rien ne bloque", () => {
  // configurerGC garde le résultat du calcul rapide pour chiffrer (calcul.ts, « essayer ») : il doit être identique.
  let compares = 0;
  for (const allegeMm of [0, 300, 650, 735])
    for (const largeurMm of [600, 1180, 1400])
      for (const b of [false, true])
        for (const t of [false, true])
          for (let n = 1; n <= CROIX_MAX; n += 2)
            for (const s of [16, 18, 20]) {
              const v = valeursGC(DEFAUTS_GC, releve({ largeurMm, allegeMm }), s, n, b, t);
              const rapide = calculerGC({ ...v, _rapide: true });
              if (rapide.alertes.length) continue;
              assert.equal(JSON.stringify(rapide), JSON.stringify(calculerGC(v)), `${largeurMm} × ${allegeMm}, ${s}-${n}`);
              compares++;
            }
  assert.ok(compares > 50);
});

test("fenêtre trop basse : dit tout de suite, pour tout dessin — et un panier forgé ne coûte plus des secondes de calcul", () => {
  chiffrageOuEchec();
  // La bonne raison, même quand la fenêtre est aussi trop large pour le carré de 16 (avant : « pas assez rigide »).
  for (const [largeurMm, allegeMm, fenetreMm] of [[1300, 300, 700], [1500, 100, 900], [800, 650, 200]]) {
    const c = configurerGC(releve({ largeurMm, allegeMm, fenetreMm }));
    assert.equal(!c.ok && c.raison, "fenetre-trop-basse", `${largeurMm} × ${allegeMm}, fenêtre ${fenetreMm}`);
    assert.deepEqual(!c.ok && c.alertes, ["fenetre"]);
    // Avec un modèle choisi aussi, quel que soit l'ordre des demandes.
    for (const modele of ["16-6", "16-1-t", "20-3-b-t"]) {
      const m = configurerGC(releve({ largeurMm, allegeMm, fenetreMm, modele }));
      assert.equal(!m.ok && m.raison, "fenetre-trop-basse", modele);
    }
    const r = reponsePrixGC({ releve: { largeurMm, allegeMm, enEtage: true, fenetreMm }, essence: "chene", quantite: 1 });
    assert.ok(r && !r.ok && r.modeles.every((m) => !m.conforme && m.raisons.includes("fenetre")));
  }
  // Une fenêtre assez haute : le même relevé se vend.
  assert.ok(configurerGC(releve({ largeurMm: 800, allegeMm: 650, fenetreMm: 400 })).ok);
  // Vingt relevés neufs à fenêtre trop basse (le panier forgé de la relecture : 2 400 calculs, 8 s) : un essai chacun.
  const debut = performance.now();
  for (let i = 0; i < 20; i++) {
    const c = configurerGC(releve({ largeurMm: 640 - i, allegeMm: 340 + i, fenetreMm: 1 }));
    assert.equal(!c.ok && c.raison, "fenetre-trop-basse");
  }
  assert.ok(performance.now() - debut < 2000, "vingt fenêtres trop basses : bien moins de deux secondes");
});

test("des barreaux en bas impossibles (garde-corps trop bas) : la bonne raison, et pas de jumeau dans le catalogue", () => {
  chiffrageOuEchec();
  // 1 000 mm de large, bas de fenêtre à 700 : un garde-corps de 235 mm, trop bas pour des barreaux sous les croix.
  const fenetre = { largeurMm: 1000, allegeMm: 700, enEtage: true, fenetreMm: 0 };
  const c = configurerGC(releve({ ...fenetre, modele: "16-2-b" }));
  assert.equal(c.ok, false);
  assert.deepEqual(!c.ok && c.alertes, ["trop-petit"], "ni « pas assez rigide », ni « fixation » : le garde-corps est trop bas pour ce dessin");
  assert.ok(configurerGC(releve({ ...fenetre, modele: "16-2" })).ok, "le même dessin sans barreaux se vend");
  const r = reponsePrixGC({ releve: fenetre, essence: "chene", quantite: 1 });
  assert.ok(r && r.ok);
  assert.ok(!r.modeles.some((m) => m.id.includes("-b")), "aucun dessin « barreaux en bas » : l'outil ne peut pas les dessiner ici");
  const cles = r.modeles.map((m) => `${m.croix}|${m.soubassementMm > 0}|${m.traverse}|${m.seuls}`);
  assert.equal(new Set(cles).size, cles.length, "chaque dessin une seule fois");
  assert.equal(new Set(r.modeles.map((m) => m.id)).size, r.modeles.length);
});

test("ce qui écarte un carré entier (solidité, fixation) ne dépend pas du dessin", () => {
  // configurerGC s'appuie dessus (calcul.ts, « ecarte ») : avec la vis de l'atelier, les carrés de 12 et 14 sortent toujours.
  for (const allegeMm of [0, 400, 650, 735])
    for (const largeurMm of [300, 900, 1180, 1500, 2000])
      for (const s of ORDRE_CARRES) {
        const vus = new Set<string>();
        for (const b of [false, true])
          for (const t of [false, true])
            for (const n of ECHANTILLON_CROIX) {
              const alertes: string[] = calculerGC({ ...valeursGC(DEFAUTS_GC, releve({ largeurMm, allegeMm }), s, n, b, t), _rapide: true }).alertes;
              if (alertes.some((a) => a.startsWith("Le garde-corps est trop petit"))) continue;
              vus.add(`${alertes.some((a) => a.startsWith("Solidité"))}|${alertes.some((a) => a.startsWith("Fixation"))}`);
            }
        assert.ok(vus.size <= 1, `${largeurMm} × ${allegeMm}, carré ${s} : ${[...vus].join(" / ")}`);
      }
});
