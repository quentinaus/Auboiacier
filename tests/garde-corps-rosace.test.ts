/**
 * LA ROSACE COMPTE POUR LA NORME (demande de Quentin, 05/10/2026 : « la meilleure configuration en fonction de la
 * taille de la rosace, des espaces et du prix »). La rosace bouche le centre des croix : une rosace plus petite
 * (« acier » Ø85) laisse un vide plus grand, une plus grande (« grand médaillon » Ø170) en laisse un plus petit. Le
 * moteur de l'outil calculait toujours avec Ø100 : le site pouvait vendre, avec la rosace Ø85, un garde-corps dont un
 * vide dépassait la boule de la norme (5 cas sur 480 dans un balayage). Ces tests vérifient que le diamètre de la
 * rosace CHOISIE est celui du calcul — pour le catalogue, le prix et la ligne de panier.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculerGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { catalogueGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { ligneGC, reponsePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import type { EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";
import { ROSACE_MM_GC, ROSACES_MM_GC, diametreRosaceGC, idModeleGC } from "../src/lib/garde-corps.ts";
import { getProduct } from "../src/lib/products.ts";

const e = (largeurMm: number, allegeMm: number, rosaceMm?: number): EntreeSiteGC => ({ largeurMm, allegeMm, enEtage: true, fenetreMm: 0, essence: "chene", ...(rosaceMm !== undefined ? { rosaceMm } : {}) });
// Des fenêtres étroites et larges, basses et hautes (le balayage complet, 480 cas, a été fait une fois : voir le suivi).
const GRILLE: [number, number][] = [[1000, 600], [1800, 600], [2000, 600], [1180, 400], [1400, 200], [800, 200], [2000, 400], [600, 700]];

test("les diamètres des rosaces sont ceux du catalogue (le libellé de chaque rosace dit son Ø)", () => {
  const produit = getProduct("garde-corps")!;
  const ids = produit.fabrics!.map((f) => f.id);
  assert.deepEqual([...ids].sort(), Object.keys(ROSACE_MM_GC).sort(), "chaque rosace du catalogue a un diamètre, et inversement");
  for (const f of produit.fabrics!) assert.match(f.label, new RegExp(`Ø${ROSACE_MM_GC[f.id]}\\b`), f.label);
  assert.deepEqual([...ROSACES_MM_GC], [...new Set(Object.values(ROSACE_MM_GC))].sort((a, b) => a - b));
  assert.equal(diametreRosaceGC(undefined), 100);
  assert.equal(diametreRosaceGC("inconnue"), 100);
  assert.equal(diametreRosaceGC("__proto__"), 100);
  assert.equal(diametreRosaceGC("acier"), 85);
  assert.equal(diametreRosaceGC("medaillon"), 170);
});

test("tout modèle vendu passe la norme avec LA rosace choisie (Ø85, Ø100 et Ø170)", () => {
  let vendus = 0;
  for (const rosaceMm of ROSACES_MM_GC) for (const [largeur, allege] of GRILLE) {
    for (const d of catalogueGC(e(largeur, allege, rosaceMm))) {
      if (!d.conforme) continue;
      vendus++;
      assert.equal(d.config.v.rD, rosaceMm, "le calcul prend le diamètre de la rosace choisie");
      const alertes = calculerGC({ ...d.config.v, _rapide: true }).alertes;
      assert.deepEqual(alertes, [], `${largeur} × ${allege}, rosace Ø${rosaceMm}, ${d.config.croix} croix${d.config.traverse ? " + traverse" : ""}`);
    }
  }
  assert.ok(vendus > 100, `des modèles vendus (${vendus})`);
});

test("la taille de la rosace change ce qui est vendu : la petite en refuse, la grande en permet plus", () => {
  const cle = (d: ReturnType<typeof catalogueGC>[number]) => (d.conforme ? `${d.config.croix}|${d.config.traverse}|${d.config.seuls}|${d.config.soubassementMm > 0}|${d.config.carre}` : "");
  let petiteRefuse = 0, grandePermet = 0;
  for (const [largeur, allege] of GRILLE) {
    const moyenne = new Set(catalogueGC(e(largeur, allege, 100)).map(cle));
    const petite = new Set(catalogueGC(e(largeur, allege, 85)).map(cle));
    const grande = new Set(catalogueGC(e(largeur, allege, 170)).map(cle));
    for (const k of moyenne) if (k && !petite.has(k)) petiteRefuse++;
    for (const k of grande) if (k && !moyenne.has(k)) grandePermet++;
  }
  assert.ok(petiteRefuse >= 1, "avec la rosace Ø85, au moins un modèle vendu avec Ø100 ne l'est plus tel quel (autre carré ou refusé)");
  assert.ok(grandePermet >= 3, `avec la rosace Ø170, des modèles que Ø100 ne permet pas (${grandePermet})`);
});

test("la route du prix et la ligne de panier utilisent la rosace choisie", () => {
  // Une fenêtre où la rosace Ø170 permet un dessin que la fleur Ø100 ne permet pas.
  let trouve: { largeur: number; allege: number; id: string } | null = null;
  for (const [largeur, allege] of GRILLE) {
    const moyenne = catalogueGC(e(largeur, allege, 100));
    for (const d of catalogueGC(e(largeur, allege, 170))) {
      if (!d.conforme || d.config.seuls) continue;
      const pareil = moyenne.find((x) => !x.conforme && x.croix === d.config.croix && x.traverse === d.config.traverse && x.barreauxBas === d.config.barreauxBas);
      if (pareil) { trouve = { largeur, allege, id: idModeleGC(16, d.config.croix, d.config.barreauxBas, d.config.traverse) }; break; }
    }
    if (trouve) break;
  }
  assert.ok(trouve, "un dessin que seule la rosace Ø170 permet");
  const releve = { largeurMm: trouve.largeur, allegeMm: trouve.allege, enEtage: true, fenetreMm: 0, modele: trouve.id };
  const sans = ligneGC(releve, { woodId: "chene", fabricId: "fleur" });
  const avec = ligneGC(releve, { woodId: "chene", fabricId: "medaillon" });
  assert.equal(sans.ok, false, "avec la fleur Ø100, ce dessin n'est pas aux normes : pas vendu");
  assert.ok(avec.ok, "avec le grand médaillon Ø170, il l'est");
  assert.equal(avec.ok && avec.line.gc?.rosaceMm, 170);
  // Le catalogue envoyé au navigateur suit la rosace choisie.
  const q = (fabricId: string) => reponsePrixGC({ releve: { ...releve, modele: undefined }, essence: "chene", fabricId, quantite: 1 });
  // (Le catalogue propose aussi, avec leur rosace, les dessins que seule une plus grande rosace permet : on compte ici ceux
  // qui passent AVEC la rosace choisie.)
  const conformes = (fabricId: string) => (q(fabricId)?.modeles ?? []).filter((m) => m.conforme && m.rosace === fabricId).length;
  assert.ok(conformes("medaillon") > conformes("fleur"), "plus de modèles aux normes avec la grande rosace");
  assert.equal(conformes("fonte"), conformes("fleur"), "la fonte Ø100 et la fleur Ø100 : mêmes modèles");
});

test("le catalogue propose, pour chaque dessin, la meilleure rosace : la choisie, sinon la plus petite plus grande qui le permet", () => {
  const releveDe = (largeurMm: number, allegeMm: number) => ({ largeurMm, allegeMm, enEtage: true, fenetreMm: 0 });
  let avecGrande = 0, avecFleurDepuisAcier = 0;
  for (const [largeur, allege] of GRILLE) for (const choisie of ["fleur", "acier", "medaillon"]) {
    const releve = releveDe(largeur, allege);
    const r = reponsePrixGC({ releve, essence: "chene", fabricId: choisie, quantite: 1 });
    if (!r) continue;
    for (const m of r.modeles) {
      if (m.seuls) { assert.equal(m.rosace, "", "barreaux seuls : pas de rosace"); }
      else assert.ok(Object.hasOwn(ROSACE_MM_GC, m.rosace), `${m.id} : une rosace connue`);
      if (!m.conforme) { assert.equal(m.prix, 0); continue; }
      // La rosace du modèle est la choisie, ou une PLUS GRANDE (jamais une plus petite).
      assert.ok(m.seuls || diametreRosaceGC(m.rosace) >= diametreRosaceGC(choisie), `${m.id} : ${m.rosace} n'est pas plus petite que ${choisie}`);
      // Le prix annoncé est exactement ce que le panier encaisserait avec cette rosace — et le modèle y passe la norme.
      const l = ligneGC({ ...releve, modele: m.id }, { woodId: "chene", fabricId: m.rosace || choisie });
      assert.ok(l.ok, `${largeur} × ${allege} ${m.id} avec ${m.rosace || choisie}`);
      assert.equal(l.line.unitPrice, m.prix);
      if (m.rosace === "medaillon" && choisie !== "medaillon") avecGrande++;
      if (m.rosace === "fleur" && choisie === "acier") avecFleurDepuisAcier++;
    }
  }
  assert.ok(avecGrande >= 3, `des modèles que seul le grand médaillon permet (${avecGrande})`);
  assert.ok(avecFleurDepuisAcier >= 0);
});

test("choisir un modèle qui demande le grand médaillon : sans lui, il n'est pas vendu ; la route le refuse proprement", () => {
  for (const [largeur, allege] of GRILLE) {
    const releve = { largeurMm: largeur, allegeMm: allege, enEtage: true, fenetreMm: 0 };
    const r = reponsePrixGC({ releve, essence: "chene", fabricId: "fleur", quantite: 1 });
    for (const m of r?.modeles ?? []) {
      if (!m.conforme || m.rosace !== "medaillon") continue;
      const sans = reponsePrixGC({ releve: { ...releve, modele: m.id }, essence: "chene", fabricId: "fleur", quantite: 1 });
      assert.ok(sans && !sans.ok, `${m.id} avec la fleur : refusé (le client doit prendre le grand médaillon)`);
      const avec = reponsePrixGC({ releve: { ...releve, modele: m.id }, essence: "chene", fabricId: "medaillon", quantite: 1 });
      assert.ok(avec?.ok && avec.prix === m.prix, `${m.id} avec le grand médaillon : au prix annoncé`);
      return;
    }
  }
  assert.fail("aucun modèle qui demande le grand médaillon dans la grille");
});
