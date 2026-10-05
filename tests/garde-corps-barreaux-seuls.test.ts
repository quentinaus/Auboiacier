/**
 * BARREAUX SEULS (demande de Quentin, 05/10/2026, photo d'une fenêtre à barreaux droits) : un cadre rempli de
 * barreaux verticaux et rien d'autre — ni croix, ni rosace, ni traverse. Le moteur est celui de l'outil de plans
 * (moteur.genere.mjs) ; ces tests vérifient ce que le site en fait : l'identifiant, la norme (vides sous 110 mm
 * en bas, 180 au-dessus), le dessin du débit, le prix, la ligne de panier et le devis dans les deux langues.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { geomGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { catalogueGC, configurerGC, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { ligneGC } from "../src/lib/garde-corps-outil/site.ts";
import { composerDevisGardeCorps, type EntreeDevisGC } from "../src/lib/garde-corps-outil/devis-site.ts";
import { idModeleGC, lireModeleGC, type ReleveGC } from "../src/lib/garde-corps.ts";
import type { EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";

const e = (largeurMm: number, allegeMm: number, enEtage = true, fenetreMm = 0): EntreeSiteGC => ({ largeurMm, allegeMm, enEtage, fenetreMm, essence: "chene" });
const seuls = (en: EntreeSiteGC) => configurerGC({ ...en, modele: "16-1-s" });

function chiffrageOuEchec() {
  const etat = chargerChiffrage();
  if (!etat.ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}

test("l'identifiant « 16-1-s » : barreaux seuls, un seul par carré ; pas de croix, pas de traverse", () => {
  assert.deepEqual(lireModeleGC("16-1-s"), { carre: 16, croix: 1, barreauxBas: false, seuls: true, traverse: false });
  assert.equal(idModeleGC(18, 1, false, false, true), "18-1-s");
  // Un seul identifiant par carré : pas « 16-3-s », pas de traverse, et l'ancien « -v » n'existe plus.
  for (const mauvais of ["16-2-s", "16-12-s", "16-1-s-t", "16-1-v", "16-3-v", "16-1-b-s", "11-1-s"]) assert.equal(lireModeleGC(mauvais), null, mauvais);
  // Les autres modèles ne changent pas.
  assert.deepEqual(lireModeleGC("16-3-b-t"), { carre: 16, croix: 3, barreauxBas: true, seuls: false, traverse: true });
});

test("barreaux seuls : pas de croix, de rosace ni de traverse dans le débit ; les vides respectent la boule de la norme", () => {
  let vendus = 0, refuses = 0;
  for (const largeur of [450, 700, 900, 1180, 1250, 1500, 1990, 2300, 2400]) for (const allege of [0, 300, 500, 650, 800]) {
    const c = seuls(e(largeur, allege));
    if (!c.ok) { refuses++; continue; }
    vendus++;
    assert.ok(c.seuls && !c.traverse && !c.barreauxBas, `${largeur} × ${allege} : barreaux seuls`);
    const noms = c.R.debit.map((d) => d.nom);
    for (const interdit of [/^Diagonale/, /^Demi-diagonale/, /^Demi-traverses/, /^Rosaces/, /^Montants entre/, /soubassement/i, /^Lisse intermédiaire/]) {
      assert.ok(!noms.some((n) => interdit.test(n)), `${largeur} × ${allege} : pas de ${interdit}`);
    }
    const barreaux = c.R.debit.find((d) => d.nom === "Barreaux")!;
    assert.ok(barreaux && barreaux.qte >= 1 && barreaux.long > 0, `${largeur} × ${allege} : des barreaux`);
    // La géométrie de l'outil : tous les vides sont égaux, sous la boule (110 en bas, 180 si tout est au-dessus de 800 mm).
    const g = geomGC(c.v, 1) as unknown as { nbB: number; vide: number; limite: number; ok: boolean; zBas: number; Lc: number };
    assert.equal(g.nbB, barreaux.qte, "autant de barreaux que le débit");
    assert.ok(g.ok && g.vide < g.limite, `${largeur} × ${allege} : vide de ${g.vide} mm pour ${g.limite}`);
    const s = Number(c.v.s);
    assert.ok(Math.abs(g.nbB * s + (g.nbB + 1) * g.vide - (g.Lc - 2 * s)) < 0.01, "les vides remplissent exactement la largeur");
    // Le vide visé : 100 mm si le bas des barreaux est sous 800 mm du sol, 170 au-dessus.
    assert.ok(g.vide <= (g.zBas < 800 ? 100 : 170) + 1e-9, `${largeur} × ${allege} : vide au plus ${g.zBas < 800 ? 100 : 170}`);
    // Et la hauteur est celle de la norme, comme pour les croix.
    assert.equal(c.hauteurMm, configurerGC(e(largeur, allege)).hauteurMm);
  }
  assert.ok(vendus >= 25, `assez de fenêtres vendues (${vendus})`);
  assert.ok(refuses >= 1 || vendus === 45, "(les refus éventuels sont des fenêtres sans garde-corps à poser)");
});

test("barreaux seuls au catalogue : un seul modèle, aux normes quand le moteur le dit, avec ses ronds verts sinon", () => {
  const dessins = catalogueGC(e(1180, 650));
  const lesSeuls = dessins.filter((d) => (d.conforme ? d.config.seuls : d.seuls));
  assert.equal(lesSeuls.length, 1, "un seul dessin de barreaux seuls");
  assert.ok(lesSeuls[0].conforme);
  // Fenêtre large : le carré de 16 ne tient pas la charge verticale seul, un plus gros carré (ou le fer plat) la tient.
  const large = catalogueGC(e(1990, 650)).filter((d) => (d.conforme ? d.config.seuls : d.seuls));
  assert.equal(large.length, 1);
  if (large[0].conforme) assert.ok(large[0].config.carre >= 16);
  else assert.ok(large[0].trous && large[0].trous.ronds.every((r) => r.ok), "hors norme pour une autre raison que les vides : les ronds sont verts");
  // Pas de famille « barreaux partout » : plus aucun modèle ne mélange croix et barreaux sur toute la hauteur.
  for (const d of dessins) assert.ok(d.conforme ? d.config.croix >= 1 : d.croix >= 1);
});

test("barreaux seuls : la ligne de panier, son prix, ses mots — sans rosace", () => {
  chiffrageOuEchec();
  const fenetre = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 };
  const c = seuls(e(1180, 650)) as ConfigGC;
  assert.ok(c.ok);
  const prix = prixGC(c);
  const l = ligneGC({ ...fenetre, modele: "16-1-s" }, { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" });
  assert.ok(l.ok);
  assert.equal(l.line.unitPrice, prix, "le prix du panier est celui de l'outil");
  assert.match(l.line.size.label, /barreaux seuls/);
  assert.ok(!/croix|rosace/i.test(l.line.size.label + l.line.optionsLabel), l.line.optionsLabel);
  // Une rosace payante choisie avant : sans croix elle ne coûte rien et n'est pas écrite.
  const medaillon = ligneGC({ ...fenetre, modele: "16-1-s" }, { woodId: "chene", metalId: "noir", fabricId: "medaillon", remplissageId: "croix" });
  assert.ok(medaillon.ok);
  assert.equal(medaillon.line.unitPrice, prix, "pas de supplément de rosace");
  assert.ok(!/médaillon|medaillon/i.test(medaillon.line.optionsLabel));
  // Le même relevé avec des croix coûte autre chose : ce n'est pas le même garde-corps.
  const croix = ligneGC(fenetre, { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" });
  assert.ok(croix.ok);
  assert.notEqual(croix.line.unitPrice, prix);
});

test("barreaux seuls : le devis, en français et en anglais, aux mêmes montants et sans croix ni rosace", () => {
  chiffrageOuEchec();
  const releve: ReleveGC = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0, modele: "16-1-s" };
  const entree = (locale: "fr" | "en", fabricId = "fleur"): EntreeDevisGC => ({
    releve, options: { woodId: "chene", metalId: "noir", fabricId, remplissageId: "croix" }, quantite: 1, livraison: { mode: "retrait" },
    date: new Date("2026-10-05T10:00:00+02:00"), locale, origine: "https://auboiacier.fr",
  });
  const devis = (locale: "fr" | "en", fabricId?: string) => {
    const r = composerDevisGardeCorps(entree(locale, fabricId));
    assert.ok(r.ok, r.ok ? "" : r.reason);
    return r.devis;
  };
  const texte = (d: ReturnType<typeof devis>) => JSON.stringify([d.lignes.map((l) => l.designation), d.piece.accroche, d.piece.caracteristiques]);
  const fr = devis("fr"), en = devis("en");
  assert.equal(en.total, fr.total, "mêmes montants dans les deux langues");
  assert.match(texte(fr), /barreaux/i);
  assert.ok(!/croix|rosace/i.test(texte(fr)), "pas de croix ni de rosace dans le devis français");
  assert.match(texte(en), /vertical bars/);
  assert.ok(!/cross|rosette|croix|barreaux/i.test(texte(en)), "anglais seulement, sans croix ni rosette");
  // La rosace payante d'avant ne change ni le prix ni le texte, et ne fait pas échouer le devis.
  assert.equal(devis("fr", "medaillon").total, fr.total);
  assert.equal(devis("en", "medaillon").total, en.total);
});
