/**
 * Le site calcule-t-il le garde-corps EXACTEMENT comme l'outil de plans ?
 *
 * L'outil (plans-atelier.html) ne peut pas entrer dans le dépôt : il contient
 * les coûts de l'atelier, et le dépôt est public. Le script
 * scripts/extraire-moteur-garde-corps.mjs le fait donc tourner TEL QUEL (dans
 * node:vm, avec un faux DOM) et note ses réponses dans
 * tests/reference/garde-corps-outil.json : des prix de vente, des poids, des
 * hauteurs, et l'empreinte (sha256) de ses réponses complètes — jamais un coût.
 * Ce fichier refait chaque calcul avec le code extrait et compare.
 *
 * Pourquoi une référence écrite plutôt que l'outil lui-même à chaque test :
 * l'outil vit hors du dépôt (et d'autres chantiers le modifient) ; la
 * référence, elle, est fixe, tourne partout, sans faux DOM fragile, et elle
 * porte l'empreinte de l'outil dont elle vient : si quelqu'un régénère le
 * moteur depuis un autre outil sans régénérer la référence, ces tests le
 * voient. Pour comparer à nouveau avec l'outil lui-même :
 *   npm run garde-corps:extraire -- "<plans-atelier.html>" --verifier
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import * as M from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import * as D from "../src/lib/garde-corps-outil/devis.genere.mjs";
import * as CH from "../src/lib/garde-corps-outil/chiffrage.chiffre.mjs";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { configurerGC, prixGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { CARRE_RENFORT, codeAlerte, CROIX_MAX, ORDRE_CARRES, valeursGC, type EntreeSiteGC } from "../src/lib/garde-corps-outil/entree.ts";
import { controlerModule } from "../scripts/outil-plans/analyse.mjs";

type CasRef = {
  nom: string;
  valeurs: Record<string, unknown>;
  chantier?: string;
  R: string;
  hauteurGC: number | null;
  kg: number | null;
  alertes: number;
  prix: number;
  chiffrage: string;
  remise: { prix: number; empreinte: string };
  devis: { numero: string; total: number; lignes: number; donnees: string; html: string } | { raison: string };
  variantes?: string;
};
type ReleveRef = {
  entree: EntreeSiteGC;
  hauteur: number;
  alertes: Record<string, string[][]>;
  /** Avec le fer plat de renfort, au carré de l'atelier, croix seules : les alertes pour 1 à 6 croix. */
  renfort: string[][];
  choix: null | { carre: number; croix: number; R: string; hauteurGC: number; kg: number; prix: number };
};
const REF: {
  outil: string;
  empreintes: { moteur: string; devis: string; chiffrage: string };
  defauts: string;
  date: string;
  cas: CasRef[];
  site: ReleveRef[];
} = JSON.parse(readFileSync(new URL("./reference/garde-corps-outil.json", import.meta.url), "utf8"));

const J = (x: unknown) => JSON.stringify(x);
const court = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);
const trie = (o: object) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, (o as Record<string, unknown>)[k]]));
const valeurs = (c: CasRef) => ({ ...M.DEFAUTS_GC, ...c.valeurs }) as M.ValeursGC;
const infos = (c: CasRef) => ({ client: "", chantier: c.chantier ?? "", email: "", telephone: "", date: new Date(REF.date) });

function chiffrageOuEchec() {
  const etat = chargerChiffrage();
  if (!etat.ok) {
    assert.fail(
      `Clé du chiffrage ${etat.raison === "cle-absente" ? "absente" : "invalide"} : copier le fichier .env.chiffrage.local ` +
        "d'une autre copie du site (jamais par git), ou définir CHIFFRAGE_GARDE_CORPS_CLE."
    );
  }
  return etat.chiffrage;
}

const FICHIERS = ["moteur.genere.mjs", "devis.genere.mjs", "chiffrage.chiffre.mjs"].map((nom) => ({
  nom,
  texte: readFileSync(new URL(`../src/lib/garde-corps-outil/${nom}`, import.meta.url), "utf8"),
}));

test("aucun fichier généré n'a été retouché à la main (chacun porte l'empreinte de son texte)", () => {
  for (const { nom, texte } of FICHIERS) {
    const i = texte.lastIndexOf("export const EMPREINTE = ");
    assert.ok(i > 0, `${nom} : empreinte introuvable`);
    const attendue = texte.slice(i).match(/"([0-9a-f]{12})"/)?.[1];
    assert.equal(createHash("sha256").update(texte.slice(0, i)).digest("hex").slice(0, 12), attendue, `${nom} a été modifié à la main : relancer le script d'extraction`);
  }
});

test("les fichiers générés et la référence viennent du même outil", () => {
  assert.equal(M.EMPREINTE_SOURCE, REF.outil);
  assert.equal(D.EMPREINTE_SOURCE, REF.outil);
  assert.equal(CH.EMPREINTE_SOURCE, REF.outil);
  assert.equal(M.EMPREINTE, REF.empreintes.moteur);
  assert.equal(D.EMPREINTE, REF.empreintes.devis);
  assert.equal(CH.EMPREINTE_CLAIR, REF.empreintes.chiffrage);
});

test("le code extrait ne touche jamais au navigateur (ni document, ni window, ni stockage)", () => {
  for (const { nom, texte } of FICHIERS.slice(0, 2)) {
    const c = controlerModule(texte);
    assert.deepEqual(c.dom, [], `${nom} utilise ${c.dom.join(", ")}`);
    assert.deepEqual(c.inconnus, [], `${nom} utilise des noms inconnus : ${c.inconnus.join(", ")}`);
  }
});

test("les valeurs de départ (DEFAUTS_GC) sont celles de la page de l'outil", () => {
  assert.equal(court(J(trie(M.DEFAUTS_GC))), REF.defauts);
  assert.ok(Object.isFrozen(M.DEFAUTS_GC));
});

test("le moteur répond comme l'outil : hauteur, poids, débit, dessins, alertes", () => {
  for (const c of REF.cas) {
    const R = M.calculerGC(valeurs(c));
    assert.equal(R.hauteurGC ?? null, c.hauteurGC, `${c.nom} : hauteur`);
    assert.equal(R.kg ?? null, c.kg, `${c.nom} : poids`);
    assert.equal(R.alertes.length, c.alertes, `${c.nom} : alertes`);
    assert.equal(court(J(R)), c.R, `${c.nom} : réponse complète de calculerGC`);
  }
});

test("le devis répond comme celui de l'outil : numéro, lignes, total, mise en page", () => {
  for (const c of REF.cas) {
    const v = valeurs(c);
    const prix = (v.prixVente as number) > 0 ? (v.prixVente as number) : c.prix;
    const r = D.composerDevisGC({ R: M.calculerGC(v), v, prix, rem: { prix: c.remise.prix }, infos: infos(c) });
    if ("raison" in c.devis) {
      assert.ok(!r.ok && r.raison === c.devis.raison, `${c.nom} : pas de devis attendu`);
      continue;
    }
    assert.ok(r.ok, `${c.nom} : devis refusé`);
    assert.equal(r.devis.numero, c.devis.numero, `${c.nom} : numéro`);
    assert.equal(r.devis.total, c.devis.total, `${c.nom} : total`);
    assert.equal(r.devis.lignes.length, c.devis.lignes, `${c.nom} : lignes`);
    assert.equal(court(J({ ok: true, devis: r.devis })), c.devis.donnees, `${c.nom} : données du devis`);
    assert.equal(court(D.dsDevisHtml(r.devis)), c.devis.html, `${c.nom} : mise en page du devis`);
  }
});

test("le chiffrage répond comme celui de l'outil : prix conseillé, livraison, pose", () => {
  const { chiffrerGC, remiseGC } = chiffrageOuEchec();
  for (const c of REF.cas) {
    const v = valeurs(c);
    const R = M.calculerGC(v);
    const C = chiffrerGC(R, v);
    assert.equal(C.conseille, c.prix, `${c.nom} : prix conseillé`);
    assert.equal(court(J(C)), c.chiffrage, `${c.nom} : réponse complète de chiffrerGC`);
    const rem = remiseGC(R, v);
    assert.equal(rem.prix, c.remise.prix, `${c.nom} : livraison`);
    assert.equal(court(J(rem)), c.remise.empreinte, `${c.nom} : réponse complète de remiseGC`);
  }
});

test("les variantes conformes proposées sont celles de l'outil", () => {
  const avec = REF.cas.filter((c) => c.variantes);
  assert.ok(avec.length >= 1);
  for (const c of avec) assert.equal(court(J(M.variantesConformes(valeurs(c)))), c.variantes, c.nom);
});

test("relevés du site : pour chaque carré et chaque nombre de croix, les mêmes alertes que l'outil", () => {
  for (const r of REF.site) {
    for (const s of ORDRE_CARRES) {
      for (let n = 1; n <= CROIX_MAX; n++) {
        const codes = M.calculerGC({ ...valeursGC(M.DEFAUTS_GC, r.entree, s, n), _rapide: true }).alertes.map(codeAlerte);
        assert.deepEqual(codes, r.alertes[s][n - 1], `${J(r.entree)} carré ${s}, ${n} croix`);
      }
    }
  }
});

test("relevés du site : avec le fer plat de renfort, les mêmes alertes que l'outil", () => {
  let larges = 0;
  for (const r of REF.site) {
    for (let n = 1; n <= CROIX_MAX; n++) {
      const codes = M.calculerGC({ ...valeursGC(M.DEFAUTS_GC, r.entree, CARRE_RENFORT, n, false, false, true), _rapide: true }).alertes.map(codeAlerte);
      assert.deepEqual(codes, r.renfort[n - 1], `${J(r.entree)} avec renfort, ${n} croix`);
      assert.ok(!codes.includes("autre"), `${J(r.entree)} : une alerte sans code`);
    }
    if (r.alertes[20].every((a) => a.includes("solidite")) && r.renfort.some((a) => a.length === 0)) larges++;
  }
  assert.ok(larges >= 3, "la référence contient des fenêtres larges que seul le fer plat permet de vendre");
});

test("relevés du site : la configuration retenue suit la règle du 29/09 et donne le prix de l'outil", () => {
  for (const r of REF.site) {
    // La règle, écrite ici indépendamment de calcul.ts : carré 16 d'abord, puis 12, 14, 18, 20 ; le moins de croix.
    let attendu: { carre: number; croix: number } | null = null;
    for (const s of [16, 12, 14, 18, 20]) {
      const n = r.alertes[s].findIndex((a) => a.length === 0);
      if (n >= 0) { attendu = { carre: s, croix: n + 1 }; break; }
    }
    assert.deepEqual(attendu && { carre: attendu.carre, croix: attendu.croix }, r.choix && { carre: r.choix.carre, croix: r.choix.croix });
    const c = configurerGC(r.entree);
    // La main courante ne bouge pas (04/10) : quand l'outil dit « barre d'appui » ou « rien à poser », le site
    // ne vend pas de garde-corps à croix — et l'outil non plus (son alerte « Barre d'appui » sur chaque essai).
    const appui = M.geomGC(valeursGC(M.DEFAUTS_GC, r.entree, 16, 1), 1).appui;
    if (appui) {
      assert.equal(r.choix, null, `${J(r.entree)} : l'outil ne retient aucun garde-corps à croix`);
      for (const s of ORDRE_CARRES) for (const a of r.alertes[s]) assert.ok(a.includes("barre-appui") || a.includes("trop-petit"), `${J(r.entree)} carré ${s} : ${a}`);
      assert.equal(c.ok, false);
      assert.equal(!c.ok && c.raison, appui === "rien" ? "sans-garde-corps" : "barre-appui", J(r.entree));
      assert.equal(c.mainCouranteMm, M.HAUT_ETAGE + M.CIBLE_MARGE);
      assert.equal(c.hauteurMm, M.BARRE_APPUI);
      continue;
    }
    assert.equal(c.hauteurMm, r.hauteur, `${J(r.entree)} : hauteur`);
    assert.equal(c.mainCouranteMm, M.HAUT_ETAGE + M.CIBLE_MARGE, `${J(r.entree)} : la main courante, pile à la norme`);
    if (!r.choix) {
      // FENÊTRE LARGE (décision du 04/10) : quand la lisse haute est trop souple même dans le plus gros carré,
      // le site ajoute le fer plat caché sous la main courante, au carré de l'atelier. La règle, écrite ici
      // indépendamment de calcul.ts : le moins de croix qui passe avec le plat (référence « renfort »).
      const tropSouple = r.alertes[20].every((a) => a.includes("solidite"));
      const nRenfort = r.renfort.findIndex((a) => a.length === 0);
      if (tropSouple && nRenfort >= 0) {
        assert.ok(c.ok, `${J(r.entree)} : fenêtre large, vendue avec le fer plat`);
        // Jusqu'à 6 croix, le site essaie TOUS les dessins (croix seules, traverse, barreaux) avant de passer à 7 croix et
        // plus : il ne choisit jamais plus de croix que les croix seules du plus petit nombre qui passe.
        assert.equal(c.renfort, true, J(r.entree));
        assert.equal(c.carre, CARRE_RENFORT, J(r.entree));
        assert.ok(c.croix <= nRenfort + 1, `${J(r.entree)} : ${c.croix} croix, les croix seules passent à ${nRenfort + 1}`);
        if (nRenfort + 1 <= 6) assert.deepEqual([c.croix, c.traverse, c.barreauxBas], [nRenfort + 1, false, false], J(r.entree));
        assert.equal(c.R.alertes.length, 0);
        assert.deepEqual(c.R.mc?.renfort && [c.R.mc.renfort.l, c.R.mc.renfort.e, c.R.mc.l, c.R.mc.h], [M.RENFORT.l, M.RENFORT.e, M.RENFORT.bois.l, M.RENFORT.bois.h], `${J(r.entree)} : plat et bois du renfort`);
        const vSans = valeursGC(M.DEFAUTS_GC, r.entree, CARRE_RENFORT, c.croix);
        const sansPlat = chiffrageOuEchec().chiffrerGC(M.calculerGC(vSans), vSans).conseille;
        assert.ok(prixGC(c) > sansPlat, `${J(r.entree)} : le fer plat et sa main courante plus large sont comptés dans le prix`);
        continue;
      }
      // Règle du 03/10 (« toujours une solution ») : quand les croix seules ne passent pas, le site propose le
      // même garde-corps avec une traverse au milieu des croix, des barreaux droits en bas, ou — fenêtre
      // large — le fer plat de renfort : s'il passe toute la norme de l'outil.
      if (c.ok) {
        assert.ok(c.traverse || c.barreauxBas || c.renfort, `${J(r.entree)} : seule une variante peut remplacer « à étudier »`);
        if (c.barreauxBas) assert.ok(c.soubassementMm > 0, `${J(r.entree)} : variante à barreaux`);
        assert.equal(c.renfort, tropSouple, `${J(r.entree)} : le fer plat seulement quand aucun carré n'est assez rigide`);
        assert.equal(c.R.alertes.length, 0, `${J(r.entree)} : variante conforme`);
      }
      continue;
    }
    assert.equal(c.ok && c.barreauxBas, false, `${J(r.entree)} : les croix seules passent, pas de barreaux ajoutés`);
    assert.ok(c.ok, `${J(r.entree)} : devrait avoir un prix`);
    assert.equal(c.renfort, false, `${J(r.entree)} : un carré suffit, pas de fer plat`);
    assert.equal(c.carre, r.choix.carre);
    assert.equal(c.croix, r.choix.croix);
    assert.equal(c.R.hauteurGC, r.choix.hauteurGC);
    assert.equal(c.kg, r.choix.kg);
    assert.equal(court(J(c.R)), r.choix.R, `${J(r.entree)} : calcul complet`);
    chiffrageOuEchec();
    assert.equal(prixGC(c), r.choix.prix, `${J(r.entree)} : prix`);
  }
});
