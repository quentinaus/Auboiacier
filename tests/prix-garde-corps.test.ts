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

import { ALLEGE_LIBRE, BORNES_GC, CIBLE_MARGE, DEFAUTS_GC, HAUT_ETAGE, MINI_GC, SPHERE, SPHERE_HAUT, Z_ESCALADE, Z_SPHERE, calculerGC, geomGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import {
  configurerGC,
  entreeValide,
  livraisonGC,
  prixCommandeGC,
  prixGC,
  type ConfigGC,
} from "../src/lib/garde-corps-outil/calcul.ts";
import { lireRequetePrixGC, PARAMETRES_PRIX_GC, reponsePrixGC, type RequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { CROIX_MAX, ESSENCES_GC, ORDRE_CARRES, valeursGC, type EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";
import { tarifLivraison, tarifPose } from "../src/lib/deplacement.ts";

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
test("hauteur : la main courante atteint 1 000 mm du sol, quel que soit le bas de la fenêtre, visée 1 025", () => {
  for (const e of GRILLE) {
    const c = configurerGC(e);
    const cible = HAUT_ETAGE + CIBLE_MARGE;
    assert.equal(c.jourMm, DEFAUTS_GC.jour, "le jour sous le cadre est celui de l'outil");
    assert.equal(c.mainCouranteMm, e.allegeMm + c.jourMm + c.hauteurMm);
    assert.equal(c.hauteurMm % 10, 0, "hauteur arrondie à la dizaine");
    assert.ok(c.hauteurMm >= MINI_GC, "jamais sous la hauteur minimale de l'outil");
    if (c.hauteurMm > MINI_GC) {
      assert.ok(c.mainCouranteMm >= cible, `${JSON.stringify(e)} : ${c.mainCouranteMm} mm pour ${cible} visés`);
      assert.ok(c.mainCouranteMm < cible + 10, "pas plus haut que la dizaine au-dessus de la visée");
    } else {
      assert.ok(c.mainCouranteMm >= cible, "au minimum de fabrication, la main courante dépasse déjà la visée");
    }
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
  const haute = configurerGC(releve({ allegeMm: 900 }));
  assert.ok(haute.hauteurMm < 350, "une allège de 900 donne un garde-corps plus bas que l'ancien minimum de 350");
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

test("configuration : trop large pour la lisse haute en carré 16 → un carré plus gros ou « à étudier »", () => {
  let vus = 0;
  for (const e of GRILLE) {
    const seize = calculerGC({ ...valeursGC(DEFAUTS_GC, e, 16, CROIX_MAX), _rapide: true });
    if (!seize.alertes.some((a: string) => a.startsWith("Solidité"))) continue;
    vus++;
    const c = configurerGC(e);
    if (c.ok) assert.ok(c.carre > 16, `${JSON.stringify(e)} : carré ${c.carre}`);
    else assert.ok(c.alertes.includes("solidite"));
  }
  assert.ok(vus > 0, "la grille doit contenir des largeurs trop grandes pour le carré 16");
  // Et à l'autre bout, la largeur maximale de l'outil ne se vend pas sans étude.
  assert.equal(configurerGC(releve({ largeurMm: BORNES_GC.B.max })).ok, false);
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
    [{ config: configOk({ largeurMm: 800, allegeMm: 300 }), quantite: 1 }, { config: configOk({ largeurMm: 1400, allegeMm: 950, essence: "noyer" }), quantite: 2 }],
    [{ config: configOk({ largeurMm: 450, allegeMm: 900, essence: "pin" }), quantite: 10 }],
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
  assert.deepEqual(Object.keys(ok).sort(), ["carre", "conforme", "croix", "hauteurMm", "jourMm", "kg", "mainCouranteMm", "modeles", "obligatoire", "ok", "prix", "remise", "soubassementMm"]);
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
  const medaillon = reponsePrixGC(requete({ largeurMm: 1180 }, { fabricId: "medaillon" }));
  assert.ok(medaillon?.ok);
  assert.ok(medaillon.prix > base.prix);
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
  assert.ok(r.modeles.length >= 6 && r.modeles.length <= 12, "le catalogue entier est envoyé");
  assert.deepEqual(Object.keys(r.modeles[0]).sort(), ["carre", "conforme", "croix", "hauteurMm", "id", "kg", "prix", "soubassementMm"]);
  const conformes = r.modeles.filter((m) => m.conforme), hors = r.modeles.filter((m) => !m.conforme);
  assert.ok(conformes.length >= 1 && hors.length >= 1);
  // Le modèle que l'outil retient de lui-même est dans le catalogue, au même prix.
  assert.equal(conformes.find((m) => m.id.replace(/-b$/, "") === `${r.carre}-${r.croix}`)?.prix, r.prix);
  for (const m of conformes) {
    const choisi = reponsePrixGC({ ...q, releve: { ...releve, modele: m.id } });
    assert.ok(choisi && choisi.ok, `le modèle ${m.id} se commande`);
    assert.equal(choisi.prix, m.prix, `le modèle ${m.id} est encaissé au prix affiché`);
    assert.equal(`${choisi.carre}-${choisi.croix}`, m.id.replace(/-b$/, ""));
  }
  for (const m of hors) {
    assert.equal(m.prix, 0, `le modèle hors norme ${m.id} n'a pas de prix`);
    const forge = reponsePrixGC({ ...q, releve: { ...releve, modele: m.id } });
    assert.ok(forge && !forge.ok, `le modèle hors norme ${m.id} ne se vend pas`);
  }
  // Un modèle illisible : l'adresse est refusée.
  assert.equal(lireRequetePrixGC(new URLSearchParams("l=1190&allege=585&etage=1&fenetre=1200&wood=chene&modele=99-9")), null);
  assert.equal(lireRequetePrixGC(new URLSearchParams("l=1190&allege=585&etage=1&fenetre=1200&wood=chene&modele=16-3"))?.releve.modele, "16-3");
});
