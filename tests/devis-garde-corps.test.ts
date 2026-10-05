/**
 * Le devis PDF d'un garde-corps, sur le site, est LE DEVIS DE L'OUTIL de plans
 * (décision de Quentin du 29/09) : pour la même entrée, les mêmes lignes et le
 * même total — même découpage en postes (55/15/15/15), même livraison.
 *
 * On le vérifie contre composerDevisGC, le code de l'outil extrait tel quel
 * (devis.genere.mjs, lui-même comparé à l'outil par garde-corps-outil.test.ts),
 * appelé ici avec les entrées de l'outil : sa configuration, son prix
 * (chiffrerGC) et SA livraison (remiseGC). Puis ce que le site ajoute : les
 * options qu'il est seul à vendre, la quantité et la remise de plusieurs
 * garde-corps, la version anglaise — et le devis dit toujours ce que le
 * panier encaissera.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { composerDevisGC, DS_GC } from "../src/lib/garde-corps-outil/devis.genere.mjs";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { prixCommandeGC, prixGC, type ConfigGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { CALCUL_GC, configurationGC, ligneGC, reponsePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { composerDevisGardeCorps, type EntreeDevisGC, type LivraisonDevisGC } from "../src/lib/garde-corps-outil/devis-site.ts";
import { tarifer } from "../src/lib/tarif-panier.ts";
import { LIVRAISON, POSE, RETRAIT, type ResultatLieu } from "../src/lib/deplacement.ts";
import { supplementRemplissage, getProduct } from "../src/lib/products.ts";
import type { ReleveGC } from "../src/lib/garde-corps.ts";

const DATE = new Date("2026-09-29T15:00:00+02:00");
const ORIGINE = "https://auboiacier.fr";
const MODELE = { metalId: "noir", fabricId: "fleur", remplissageId: "croix" };

function chiffrageOuEchec() {
  const etat = chargerChiffrage();
  if (!etat.ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
  return etat.chiffrage;
}

const lieu = (distanceKm: number) => ({ distanceKm, commune: "Nantes", precision: "adresse" as const });
const livraisons = (km: number): LivraisonDevisGC[] => [
  { mode: "transporteur", codePostal: "44000", lieu: lieu(km) },
  { mode: "pose", codePostal: "44000", lieu: lieu(km) },
  { mode: "retrait" },
];

const entree = (releve: ReleveGC, e: Partial<EntreeDevisGC> = {}): EntreeDevisGC => ({
  releve,
  options: { woodId: "chene", ...MODELE },
  quantite: 1,
  livraison: { mode: "retrait" },
  date: DATE,
  locale: "fr",
  origine: ORIGINE,
  ...e,
});

function devisOk(e: EntreeDevisGC) {
  const r = composerDevisGardeCorps(e);
  assert.ok(r.ok, `pas de devis : ${JSON.stringify(e.releve)} ${r.ok ? "" : r.reason}`);
  return r.devis;
}

// Des relevés variés : fenêtre étroite ou large, allège basse (barreaux en bas), moyenne, haute ; étage et rez-de-chaussée.
const RELEVES: ReleveGC[] = [];
// (1 990 et 2 300 : fenêtres larges, vendues avec le fer plat de renfort caché sous la main courante.)
for (const largeurMm of [450, 900, 1180, 1250, 1500, 1990, 2300])
  for (const allegeMm of [0, 300, 650, 950])
    RELEVES.push({ largeurMm, allegeMm, enEtage: allegeMm !== 950 || largeurMm % 2 === 0, fenetreMm: allegeMm === 300 ? 1500 : 0 });

test("les mêmes lignes et le même total que le devis de l'outil, pour la même entrée", () => {
  const { remiseGC } = chiffrageOuEchec();
  let compares = 0;
  for (const releve of RELEVES) {
    for (const essence of ["pin", "chene", "noyer"]) {
      const c = configurationGC(releve, essence);
      if (!c?.ok) continue;
      for (const km of [7.3, 118.46, 612]) {
        for (const livraison of livraisons(km)) {
          const site = devisOk(entree(releve, { options: { woodId: essence, ...MODELE }, livraison }));
          // L'outil, avec ses propres entrées : sa configuration, son prix, SA livraison (remiseGC).
          const v = { ...c.v, remise: livraison.mode, km: livraison.mode === "retrait" ? 0 : km };
          const outil = composerDevisGC({
            R: c.R,
            v,
            prix: prixGC(c),
            rem: { prix: remiseGC(c.R, v).prix },
            infos: { chantier: livraison.mode === "retrait" ? "" : "44000 Nantes", date: DATE },
          });
          assert.ok(outil.ok);
          assert.deepEqual(site.lignes, outil.devis.lignes, `${JSON.stringify(releve)} ${essence} ${livraison.mode} ${km} km : lignes`);
          assert.equal(site.total, outil.devis.total, "total");
          assert.deepEqual(site.conditions, outil.devis.conditions, "conditions");
          assert.deepEqual(site.piece.caracteristiques, outil.devis.piece.caracteristiques, "caractéristiques");
          assert.equal(site.piece.accroche, outil.devis.piece.accroche);
          assert.equal(site.delai, outil.devis.delai);
          compares++;
        }
      }
    }
  }
  assert.ok(compares > 150, `trop peu de cas comparés (${compares})`);
});

test("le découpage de l'outil : structure 55, main courante 15, peinture 15, fixations 15", () => {
  chiffrageOuEchec();
  assert.deepEqual({ ...DS_GC.parts }, { structure: 55, mainCourante: 15, peinture: 15, fixations: 15 });
  const c = configurationGC({ largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 }, "chene") as ConfigGC;
  const devis = devisOk(entree(c.entree));
  const [, structure, main, peinture, fixations] = devis.lignes;
  const prix = prixGC(c);
  assert.equal(structure.unitaire + main.unitaire + peinture.unitaire + fixations.unitaire, prix);
  for (const [l, part] of [[main, 15], [peinture, 15], [fixations, 15]] as const) assert.equal(l.unitaire, Math.round((prix * part) / 100));
  assert.match(structure.designation, /^Structure acier plein — /);
  assert.match(main.designation, /^Main courante chêne massif 40 × 40 mm/);
});

test("le devis dit ce que le panier encaissera : même prix, même remise, même livraison", async () => {
  chiffrageOuEchec();
  const localiser = async (): Promise<ResultatLieu> => ({ ok: true, lieu: lieu(118.46) });
  for (const releve of RELEVES.filter((_, i) => i % 3 === 0)) {
    const c = configurationGC(releve, "noyer");
    if (!c?.ok) continue;
    for (const options of [MODELE, { metalId: "blanc", fabricId: "medaillon", remplissageId: "croix" }, { metalId: "brut", fabricId: "fleur", remplissageId: "verre" }]) {
      for (const quantite of [1, 3]) {
        for (const livraison of livraisons(118.46)) {
          const devis = devisOk(entree(releve, { options: { woodId: "noyer", ...options }, quantite, livraison }));
          const ligneMode = livraison.mode === "transporteur" ? { slug: LIVRAISON, livraisonCp: "44000" } : livraison.mode === "pose" ? { slug: POSE, poseCp: "44000" } : { slug: RETRAIT };
          const panier = await tarifer([{ slug: "garde-corps", ...releve, woodId: "noyer", ...options, quantity: quantite }, ligneMode], { locale: "fr", gc: CALCUL_GC, localiser });
          assert.equal(panier.probleme, null);
          assert.equal(devis.total, panier.total, `${JSON.stringify(releve)} ${JSON.stringify(options)} × ${quantite} ${livraison.mode}`);
          // La remise du devis est celle du panier.
          const remise = devis.lignes.find((l) => /^Plusieurs garde-corps/.test(l.designation));
          assert.equal(remise?.total ?? 0, panier.remise);
        }
      }
    }
  }
});

test("options que l'outil ne chiffre pas encore : leur supplément rejoint son poste, leur nom remplace celui du modèle", () => {
  chiffrageOuEchec();
  const releve = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 };
  const c = configurationGC(releve, "chene") as ConfigGC;
  const base = devisOk(entree(releve));
  const produit = getProduct("garde-corps")!;
  // (La fonte Ø100 a le diamètre de la fleur : le dessin ne change pas, seul le supplément s'ajoute. Une rosace d'un autre
  // diamètre — le grand médaillon Ø170 — peut changer le dessin lui-même : voir garde-corps-rosace.test.ts.)
  const rosace = produit.fabrics!.find((f) => f.id === "fonte")!;

  // Une autre rosace : +supplément sur la structure, son nom partout.
  const medaillon = devisOk(entree(releve, { options: { woodId: "chene", ...MODELE, fabricId: "fonte" } }));
  assert.equal(medaillon.lignes[1].unitaire, base.lignes[1].unitaire + rosace.priceDelta!);
  assert.equal(medaillon.total, base.total + rosace.priceDelta!);
  assert.ok(medaillon.lignes[0].designation.endsWith(` · ${rosace.label}`));
  assert.ok(medaillon.lignes[1].designation.includes("médaillon fleur, fonte Ø100"));
  assert.equal(medaillon.piece.caracteristiques.find((k) => k.label === "Rosace")?.value, rosace.label);
  assert.ok(!JSON.stringify(medaillon).includes(DS_GC.rosace), "plus aucune trace de la fleur");

  // L'acier blanc : la teinte change, pas le prix ; l'acier brut est verni, pas peint.
  const blanc = devisOk(entree(releve, { options: { woodId: "chene", ...MODELE, metalId: "blanc" } }));
  assert.equal(blanc.total, base.total);
  assert.equal(blanc.lignes[3].designation, "Finition peinte de l'acier — teinte blanc");
  assert.ok(!JSON.stringify(blanc).includes("noir charbon"));
  const brut = devisOk(entree(releve, { options: { woodId: "chene", ...MODELE, metalId: "brut" } }));
  assert.equal(brut.lignes[3].designation, "Finition de l'acier — brut, vernis incolore de protection");
  assert.ok(!brut.lignes.some((l) => /peinte/.test(l.designation)));

  // Le verre à la place des croix : un cadre qui le reçoit, sa ligne à son prix, plus de rosace (même forgée).
  const verre = devisOk(entree(releve, { options: { woodId: "chene", ...MODELE, remplissageId: "verre", fabricId: "medaillon" } }));
  const supplement = supplementRemplissage(produit.remplissages!.find((r) => r.sansCroix)!, 1180, c.hauteurMm);
  assert.match(verre.lignes[1].designation, /cadre soudé recevant le verre/);
  assert.equal(verre.lignes[1].unitaire, base.lignes[1].unitaire, "sous le verre, la rosace ne se paie pas");
  const ligneVerre = verre.lignes.find((l) => /^Panneau de verre feuilleté/.test(l.designation));
  assert.equal(ligneVerre?.unitaire, supplement);
  assert.equal(verre.total, base.total + supplement);
  assert.ok(!verre.piece.caracteristiques.some((k) => k.label === "Rosace"));
  // (Le nom du modèle, « Rosace », reste le sien.)
  assert.ok(!/croix|rosace/i.test(verre.lignes[0].designation.replace(DS_GC.nom, "").replace("à la place des croix", "")));

  // Toujours : les postes font le prix de la pièce au panier.
  for (const [devis, options] of [[medaillon, { fabricId: "fonte" }], [blanc, { metalId: "blanc" }], [brut, { metalId: "brut" }], [verre, { remplissageId: "verre", fabricId: "medaillon" }]] as const) {
    const ligne = ligneGC(releve, { woodId: "chene", ...MODELE, ...options });
    assert.ok(ligne.ok);
    const postes = devis.lignes.filter((l) => !l.titre && !/^Livraison/.test(l.designation));
    assert.equal(postes.reduce((a, l) => a + l.unitaire, 0), ligne.line.unitPrice);
  }
});

test("plusieurs pièces : la quantité sur chaque poste, et la remise sur sa ligne (frais fixes une fois)", () => {
  chiffrageOuEchec();
  const releve = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 };
  const c = configurationGC(releve, "chene") as ConfigGC;
  const un = devisOk(entree(releve));
  const trois = devisOk(entree(releve, { quantite: 3 }));
  const postes = trois.lignes.filter((l) => !l.titre && l.unitaire > 0);
  assert.ok(postes.every((l) => l.quantite === 3 && l.total === 3 * l.unitaire));
  const remise = trois.lignes.find((l) => /^Plusieurs garde-corps dans la même commande/.test(l.designation));
  const attendue = prixCommandeGC([{ config: c, quantite: 3 }]).remise;
  assert.ok(attendue < 0, "trois garde-corps : une vraie remise");
  assert.ok(remise && remise.quantite === 1 && remise.unitaire === attendue && remise.total === attendue);
  assert.equal(trois.total, 3 * un.total + attendue);
  // Le devis d'une seule pièce n'a pas de remise.
  assert.ok(!un.lignes.some((l) => /^Plusieurs garde-corps/.test(l.designation)));
});

test("en anglais : les mêmes lignes, dans le même ordre, aux mêmes montants", () => {
  chiffrageOuEchec();
  for (const releve of RELEVES.filter((_, i) => i % 4 === 1)) {
    for (const options of [MODELE, { metalId: "brut", fabricId: "acier", remplissageId: "croix" }, { metalId: "noir", fabricId: "fleur", remplissageId: "verre" }]) {
      for (const livraison of livraisons(55)) {
        const e = entree(releve, { options: { woodId: "pin", ...options }, quantite: 2, livraison });
        const fr = composerDevisGardeCorps(e);
        const en = composerDevisGardeCorps({ ...e, locale: "en" });
        if (!fr.ok) {
          assert.equal(en.ok, false);
          continue;
        }
        assert.ok(en.ok);
        assert.deepEqual(
          en.devis.lignes.map((l) => [l.quantite, l.unitaire, l.total, Boolean(l.titre)]),
          fr.devis.lignes.map((l) => [l.quantite, l.unitaire, l.total, Boolean(l.titre)])
        );
        assert.equal(en.devis.total, fr.devis.total);
        assert.equal(en.devis.conditions.length, fr.devis.conditions.length);
        const texte = JSON.stringify([en.devis.lignes, en.devis.piece, en.devis.conditions]);
        for (const mot of ["Structure acier", "Main courante", "Finition", "Livraison", "croix de Saint-André", "Remise", "Plusieurs garde-corps", "Retrait"]) {
          assert.ok(!texte.includes(mot), `« ${mot} » reste en français`);
        }
      }
    }
  }
});

test("retrait à l'atelier : pas de ligne de livraison, la condition de l'outil", () => {
  chiffrageOuEchec();
  const devis = devisOk(entree({ largeurMm: 900, allegeMm: 650, enEtage: true, fenetreMm: 0 }));
  assert.ok(!devis.lignes.some((l) => /^Livraison/.test(l.designation)));
  assert.ok(devis.conditions.includes("Pièce à retirer à l'atelier, à Saumur, sur rendez-vous."));
  assert.equal(devis.lignes[4].designation, "Fixations et notice de pose", "sans transporteur, pas d'emballage à facturer dans le libellé");
});

test("pas de devis pour un garde-corps « à étudier », ni hors des bornes de l'outil, ni avec une option inconnue", () => {
  chiffrageOuEchec();
  const large = composerDevisGardeCorps(entree({ largeurMm: 3000, allegeMm: 0, enEtage: true, fenetreMm: 0 }));
  assert.equal(large.ok === false && large.reason, "a_etudier");
  const basse = composerDevisGardeCorps(entree({ largeurMm: 1000, allegeMm: 300, enEtage: true, fenetreMm: 500 }));
  assert.equal(basse.ok === false && basse.reason, "a_etudier");
  const etroit = composerDevisGardeCorps(entree({ largeurMm: 200, allegeMm: 650, enEtage: true, fenetreMm: 0 }));
  assert.equal(etroit.ok === false && etroit.reason, "unknown_size");
  const inconnue = composerDevisGardeCorps(entree({ largeurMm: 1000, allegeMm: 650, enEtage: true, fenetreMm: 0 }, { options: { woodId: "chene", ...MODELE, metalId: "or" } }));
  assert.equal(inconnue.ok === false && inconnue.reason, "unknown_metal");
});

test("le numéro du devis change avec la fenêtre, les options, la quantité et la livraison", () => {
  chiffrageOuEchec();
  const releve = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 };
  const numero = (e: Partial<EntreeDevisGC> = {}, r: Partial<ReleveGC> = {}) => devisOk(entree({ ...releve, ...r }, e)).numero;
  const a = numero();
  assert.match(a, /^D-20260929-[0-9A-Z]{5}$/);
  assert.equal(numero({ date: new Date("2026-09-29T22:00:00+02:00") }), a, "même jour à Paris, même numéro");
  for (const autre of [numero({}, { allegeMm: 700 }), numero({}, { enEtage: false }), numero({}, { fenetreMm: 1500 }), numero({ quantite: 2 }), numero({ options: { woodId: "noyer", ...MODELE } }), numero({ livraison: { mode: "pose", codePostal: "44000", lieu: lieu(100) } })]) {
    assert.notEqual(autre, a);
  }
  // Deux modèles différents pour la même fenêtre : deux devis, deux numéros.
  const modeles = reponsePrixGC({ releve, essence: "chene", quantite: 1 })!.modeles.filter((m) => m.conforme);
  assert.ok(modeles.length >= 2);
  const numeros = new Set(modeles.map((m) => numero({}, { modele: m.id })));
  assert.equal(numeros.size, modeles.length, "un numéro par modèle");
});

test("un lien de devis sans teinte, rosace ni remplissage : le devis du modèle, comme la route du prix", () => {
  chiffrageOuEchec();
  const r: ReleveGC = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 };
  for (const livraison of livraisons(118.46)) {
    const sans = devisOk(entree(r, { options: { woodId: "chene" }, quantite: 2, livraison }));
    const avec = devisOk(entree(r, { quantite: 2, livraison }));
    assert.deepEqual(sans.lignes, avec.lignes, livraison.mode);
    assert.equal(sans.total, avec.total);
    assert.equal(sans.numero, avec.numero);
  }
  // La route lit une option absente comme « celle du modèle », une option illisible comme un refus.
  const route = readFileSync(new URL("../src/app/api/devis-pdf/route.ts", import.meta.url), "utf8");
  assert.match(route, /t === null \? undefined : \(identifiant\(t\) \?\? null\)/);
  assert.match(route, /options: \{ woodId, metalId, fabricId, remplissageId \}/);
});

test("le devis d'un modèle à traverse : écrit dans les deux langues, et jamais d'erreur avec le verre", () => {
  chiffrageOuEchec();
  const fenetre = { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 0 };
  const texte = (d: ReturnType<typeof devisOk>) => JSON.stringify([d.lignes.map((l) => l.designation), d.piece.accroche, d.piece.caracteristiques]);
  // « 2 croix + traverse » : le français et l'anglais décrivent la même pièce, au même total.
  const fr = devisOk(entree({ ...fenetre, modele: "16-2-t" }));
  const en = devisOk(entree({ ...fenetre, modele: "16-2-t" }, { locale: "en" }));
  assert.equal(en.total, fr.total);
  assert.match(fr.lignes[0].designation, /2\scroix · traverse au milieu/);
  assert.match(en.lignes[0].designation, /2 crosses · middle rail/);
  assert.match(en.lignes[1].designation, /a middle rail in each cross/);
  assert.match(en.piece.accroche, /crosses with a middle rail/);
  assert.match(en.piece.caracteristiques.find((k) => k.label === "Infill")!.value, /a middle rail in each cross/);
  assert.ok(!/traverse/i.test(texte(en)), "pas un mot de français dans le devis anglais");
  // Barreaux en bas + traverse : le titre anglais dit les deux, dans l'ordre du français.
  const tout = devisOk(entree({ ...fenetre, modele: "16-2-b-t" }, { locale: "en" }));
  assert.match(tout.lignes[0].designation, /2 crosses · middle rail · bars below/);
  // Sans traverse : pas de « middle rail ».
  assert.ok(!/middle rail/.test(texte(devisOk(entree({ ...fenetre, modele: "16-4" }, { locale: "en" })))));

  // Sous verre, le dessin choisi ne compte pas : même devis, même prix que sans modèle, dans les deux langues —
  // et plus d'erreur quand le dessin avait une traverse (l'accroche de l'outil n'était plus reconnue).
  const sousVerre = { woodId: "chene", ...MODELE, remplissageId: "verre" };
  const reference = devisOk(entree(fenetre, { options: sousVerre }));
  for (const modele of ["16-2-t", "16-1-t", "16-2-b-t", "16-6-b", "18-4"]) {
    for (const locale of ["fr", "en"] as const) {
      const d = devisOk(entree({ ...fenetre, modele }, { options: sousVerre, locale }));
      assert.equal(d.total, reference.total, `verre + ${modele} (${locale}) : le prix du relevé seul`);
      assert.ok(!/traverse|middle rail/i.test(texte(d)), `verre + ${modele} (${locale}) : plus de traverse`);
    }
    const ligne = ligneGC({ ...fenetre, modele }, sousVerre);
    assert.ok(ligne.ok);
    assert.equal(ligne.line.unitPrice, reference.total, `verre + ${modele} : le panier encaisse le même prix`);
  }
  // Même quand le dessin retenu d'office a une traverse (fenêtre où les croix seules ne passent pas).
  const large = { largeurMm: 1180, allegeMm: 300, enEtage: true, fenetreMm: 0 };
  for (const locale of ["fr", "en"] as const) assert.ok(devisOk(entree(large, { options: sousVerre, locale })).total > 0);
});
