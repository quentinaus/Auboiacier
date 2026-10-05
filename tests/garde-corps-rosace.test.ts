/**
 * LA ROSACE COMPTE POUR LA NORME (demande de Quentin, 05/10/2026 : « la meilleure configuration en fonction de la taille de la
 * rosace, des espaces et du prix »). La rosace bouche le centre des croix : une rosace plus petite (« acier » Ø85) laisse un vide
 * plus grand ; SANS rosace (Ø0, aussi sa demande du 05/10 : « mets le choix de ne pas avoir de rosace »), le vide est le plus
 * grand. Le grand médaillon de Ø170 a été retiré (« trop gros »). Le moteur prend le diamètre de la rosace CHOISIE ; ces tests
 * le vérifient pour le catalogue, le prix et la ligne de panier.
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
// Des fenêtres étroites et larges, basses et hautes.
const GRILLE: [number, number][] = [[1000, 600], [1800, 600], [2000, 600], [1180, 400], [1400, 200], [800, 200], [2000, 400], [600, 700]];

test("les diamètres des rosaces sont ceux du catalogue (le libellé de chaque rosace dit son Ø) ; il y a un choix « sans rosace »", () => {
  const produit = getProduct("garde-corps")!;
  const ids = produit.fabrics!.map((f) => f.id);
  assert.deepEqual([...ids].sort(), Object.keys(ROSACE_MM_GC).sort(), "chaque rosace du catalogue a un diamètre, et inversement");
  for (const f of produit.fabrics!) {
    if (ROSACE_MM_GC[f.id] > 0) assert.match(f.label, new RegExp(`Ø${ROSACE_MM_GC[f.id]}\\b`), f.label);
    else assert.ok(!/Ø/.test(f.label) && /sans rosace/i.test(f.label) && /no rosette/i.test(f.labelEn ?? ""), `${f.id} : « sans rosace »`);
  }
  assert.ok(!ids.includes("medaillon"), "le grand médaillon Ø170 est retiré du catalogue");
  assert.deepEqual([...ROSACES_MM_GC], [...new Set(Object.values(ROSACE_MM_GC))].sort((a, b) => a - b));
  assert.deepEqual([...ROSACES_MM_GC], [0, 85, 100]);
  assert.equal(diametreRosaceGC(undefined), 100);
  assert.equal(diametreRosaceGC("inconnue"), 100);
  assert.equal(diametreRosaceGC("medaillon"), 100, "l'ancien identifiant n'est plus connu");
  assert.equal(diametreRosaceGC("__proto__"), 100);
  assert.equal(diametreRosaceGC("acier"), 85);
  assert.equal(diametreRosaceGC("sans"), 0);
});

test("tout modèle vendu passe la norme avec LA rosace choisie (Ø0, Ø85 et Ø100)", () => {
  let vendus = 0;
  for (const rosaceMm of ROSACES_MM_GC) for (const [largeur, allege] of GRILLE) {
    for (const d of catalogueGC(e(largeur, allege, rosaceMm))) {
      if (!d.conforme) continue;
      vendus++;
      if (rosaceMm === 0) assert.equal(d.config.v.rosace, false, "sans rosace : le calcul n'en met pas");
      else assert.equal(d.config.v.rD, rosaceMm, "le calcul prend le diamètre de la rosace choisie");
      const alertes = calculerGC({ ...d.config.v, _rapide: true }).alertes;
      assert.deepEqual(alertes, [], `${largeur} × ${allege}, rosace Ø${rosaceMm} : ${d.config.croix} croix${d.config.traverse ? " + traverse" : ""}`);
    }
  }
  assert.ok(vendus > 80, `des modèles vendus (${vendus})`);
});

test("la taille de la rosace change ce qui est vendu : sans rosace, des modèles de la fleur ne passent plus", () => {
  const cle = (d: ReturnType<typeof catalogueGC>[number]) => (d.conforme ? `${d.config.croix}|${d.config.traverse}|${d.config.seuls}|${d.config.soubassementMm > 0}|${d.config.carre}` : "");
  let sansRefuse = 0, acierRefuse = 0;
  for (const [largeur, allege] of GRILLE) {
    const fleur = new Set(catalogueGC(e(largeur, allege, 100)).map(cle));
    const acier = new Set(catalogueGC(e(largeur, allege, 85)).map(cle));
    const sans = new Set(catalogueGC(e(largeur, allege, 0)).map(cle));
    for (const k of fleur) { if (k && !sans.has(k)) sansRefuse++; if (k && !acier.has(k)) acierRefuse++; }
  }
  assert.ok(sansRefuse >= 3, `sans rosace, des modèles vendus avec la fleur ne le sont plus tels quels (${sansRefuse})`);
  assert.ok(acierRefuse <= sansRefuse, "la petite rosace refuse moins que l'absence de rosace");
});

test("la route du prix et la ligne de panier utilisent la rosace choisie ; sans rosace, l'outil ne compte pas les rosaces", () => {
  // Une fenêtre où la fleur Ø100 permet un dessin que l'absence de rosace ne permet pas.
  let trouve: { largeur: number; allege: number; id: string } | null = null;
  for (const [largeur, allege] of GRILLE) {
    const sans = catalogueGC(e(largeur, allege, 0));
    for (const d of catalogueGC(e(largeur, allege, 100))) {
      if (!d.conforme || d.config.seuls) continue;
      const pareil = sans.find((x) => !x.conforme && x.croix === d.config.croix && x.traverse === d.config.traverse && x.barreauxBas === d.config.barreauxBas);
      if (pareil) { trouve = { largeur, allege, id: idModeleGC(16, d.config.croix, d.config.barreauxBas, d.config.traverse) }; break; }
    }
    if (trouve) break;
  }
  assert.ok(trouve, "un dessin que seule la fleur permet");
  const releve = { largeurMm: trouve.largeur, allegeMm: trouve.allege, enEtage: true, fenetreMm: 0, modele: trouve.id };
  const avecFleur = ligneGC(releve, { woodId: "chene", fabricId: "fleur" });
  const sansRosace = ligneGC(releve, { woodId: "chene", fabricId: "sans" });
  assert.ok(avecFleur.ok, "avec la fleur Ø100, ce dessin est aux normes");
  assert.equal(avecFleur.ok && avecFleur.line.gc?.rosaceMm, 100);
  assert.equal(sansRosace.ok, false, "sans rosace, ce dessin n'est pas aux normes : pas vendu");
  // Le catalogue envoyé au navigateur suit la rosace choisie.
  const q = (fabricId: string) => reponsePrixGC({ releve: { ...releve, modele: undefined }, essence: "chene", fabricId, quantite: 1 });
  const conformes = (fabricId: string) => (q(fabricId)?.modeles ?? []).filter((m) => m.conforme && m.rosace === fabricId).length;
  assert.ok(conformes("fleur") > conformes("sans"), "plus de modèles aux normes avec la fleur que sans rosace");
  assert.equal(conformes("fonte"), conformes("fleur"), "la fonte Ø100 et la fleur Ø100 : mêmes modèles");
  // Même fenêtre, même dessin permis par les deux : « sans rosace » coûte moins cher (l'outil ne compte pas les rosaces).
  const prix = (fabricId: string) => { const l = ligneGC({ largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 }, { woodId: "chene", fabricId }); return l.ok ? l.line.unitPrice : NaN; };
  assert.ok(prix("sans") < prix("fleur"), `${prix("sans")} < ${prix("fleur")}`);
});

test("le catalogue propose, pour chaque dessin, la meilleure rosace : la choisie, sinon la plus petite plus grande qui le permet", () => {
  const releveDe = (largeurMm: number, allegeMm: number) => ({ largeurMm, allegeMm, enEtage: true, fenetreMm: 0 });
  let avecFleurDepuisSans = 0, avecFleurDepuisAcier = 0;
  for (const [largeur, allege] of GRILLE) for (const choisie of ["fleur", "acier", "sans"]) {
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
      if (m.rosace === "fleur" && choisie === "sans") avecFleurDepuisSans++;
      if (m.rosace === "fleur" && choisie === "acier") avecFleurDepuisAcier++;
    }
  }
  assert.ok(avecFleurDepuisSans >= 3, `des modèles que seule la fleur permet quand on part de « sans rosace » (${avecFleurDepuisSans})`);
  assert.ok(avecFleurDepuisAcier >= 0);
});

test("choisir un modèle qui demande la fleur : sans rosace il n'est pas vendu ; la route le refuse proprement", () => {
  for (const [largeur, allege] of GRILLE) {
    const releve = { largeurMm: largeur, allegeMm: allege, enEtage: true, fenetreMm: 0 };
    const r = reponsePrixGC({ releve, essence: "chene", fabricId: "sans", quantite: 1 });
    for (const m of r?.modeles ?? []) {
      if (!m.conforme || m.rosace !== "fleur") continue;
      const sans = reponsePrixGC({ releve: { ...releve, modele: m.id }, essence: "chene", fabricId: "sans", quantite: 1 });
      assert.ok(sans && !sans.ok, `${m.id} sans rosace : refusé (le client doit prendre une rosace)`);
      const avec = reponsePrixGC({ releve: { ...releve, modele: m.id }, essence: "chene", fabricId: "fleur", quantite: 1 });
      assert.ok(avec?.ok && avec.prix === m.prix, `${m.id} avec la fleur : au prix annoncé`);
      return;
    }
  }
  assert.fail("aucun modèle qui demande la fleur dans la grille");
});
