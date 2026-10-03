/**
 * Le garde-corps du SITE, chiffré par l'outil de plans : ce que les routes et
 * les pages du serveur utilisent (prix d'une pièce avec ses options, remise
 * d'une commande, « à partir de », réponse de /api/prix-garde-corps).
 *
 * SERVEUR SEULEMENT. Le site l'importe par src/lib/prix-garde-corps.server.ts
 * (import "server-only") ; les tests l'importent directement. Rien ici ne
 * part vers le navigateur, sauf ce que reponsePrixGC construit champ par
 * champ : un prix de vente et une forme, jamais un coût.
 */
import { catalogueGC, configurerGC, prixCommandeGC, prixGC, ChiffrageIndisponible, type ConfigAEtudierGC, type ConfigGC } from "./calcul.ts";
import { ESSENCES_GC, type EntreeSiteGC, type EssenceGC } from "./entree.ts";
import { getProduct, priceFrom, prixParOutil, resolveSelection, SUR_MESURE, type PrixReleve, type Product } from "../products.ts";
import { BORNES_RELEVE_GC, MODELES_GC_MAX, RELEVE_DEPART_GC, lireModeleGC, releveDansLesBornes, type ModeleGC, type ReleveGC, type ReponsePrixGC } from "../garde-corps.ts";
import type { CalculGC } from "../tarif-panier.ts";

/** L'identifiant du garde-corps de fenêtre au catalogue. */
export const SLUG_GC = "garde-corps";

function produitGC(): Product {
  const p = getProduct(SLUG_GC);
  if (!p || !prixParOutil(p)) throw new Error("garde-corps : fiche introuvable au catalogue");
  return p;
}

const estEssence = (x: string): x is EssenceGC => (ESSENCES_GC as readonly string[]).includes(x);

function entreeGC(releve: ReleveGC, essence: EssenceGC): EntreeSiteGC {
  return {
    largeurMm: releve.largeurMm, allegeMm: releve.allegeMm, enEtage: releve.enEtage, fenetreMm: releve.fenetreMm, essence,
    ...(releve.modele !== undefined ? { modele: releve.modele } : {}),
  };
}

/** La configuration de l'outil pour ce relevé, ou null s'il sort des bornes des champs de l'outil. */
export function configurationGC(releve: ReleveGC, essence: string): ConfigGC | ConfigAEtudierGC | null {
  if (!estEssence(essence) || !releveDansLesBornes(releve)) return null;
  return configurerGC(entreeGC(releve, essence));
}

/** Le calcul de l'outil, sous la forme que products.ts attend (resolveSelection). */
export const prixReleveOutil: PrixReleve = (e) => {
  const c = configurationGC(e, e.essence);
  if (!c) return { ok: false, raison: "hors-bornes" };
  if (!c.ok) return { ok: false, raison: c.raison };
  return { ok: true, prix: prixGC(c), hauteurMm: c.hauteurMm, croix: c.croix, carre: c.carre, soubassement: c.soubassement, kg: c.kg };
};

/** La remise d'une commande de plusieurs garde-corps : frais fixes une fois, jamais sous le plancher. */
export function remiseCommandeGC(lignes: { releve: ReleveGC; essence: string; quantite: number }[]): number {
  if (!lignes.length) return 0;
  const commande = lignes.map((l) => {
    const c = configurationGC(l.releve, l.essence);
    if (!c?.ok) throw new Error("remise : garde-corps sans prix");
    return { config: c, quantite: l.quantite };
  });
  return prixCommandeGC(commande).remise;
}

/** Ce que le tarif du panier (src/lib/tarif-panier.ts) reçoit pour chiffrer un garde-corps. */
export const CALCUL_GC: CalculGC = { prixReleve: prixReleveOutil, remise: remiseCommandeGC };

/**
 * La ligne d'un garde-corps, options comprises (le même calcul que le panier
 * et la commande). Une option ABSENTE est celle du modèle (noir, fleur,
 * croix) : la même règle pour la route du prix, le devis PDF et l'aperçu de
 * la livraison. Une option inconnue est refusée (unknown_metal…). Le panier,
 * lui, envoie toujours les trois (resolveSelection les exige).
 */
export function ligneGC(
  releve: ReleveGC,
  options: { woodId: string; metalId?: string; fabricId?: string; remplissageId?: string },
  locale: "fr" | "en" = "fr"
) {
  const modele = produitGC();
  return resolveSelection(
    {
      slug: SLUG_GC,
      sizeId: SUR_MESURE,
      largeurMm: releve.largeurMm,
      allegeMm: releve.allegeMm,
      enEtage: releve.enEtage,
      fenetreMm: releve.fenetreMm,
      modeleGc: releve.modele,
      woodId: options.woodId,
      metalId: options.metalId ?? modele.metals[0]?.id,
      fabricId: options.fabricId ?? modele.fabrics?.[0]?.id,
      remplissageId: options.remplissageId ?? modele.remplissages?.[0]?.id,
      locale,
    },
    prixReleveOutil
  );
}

/* ------------------------------------------------------------------ *
 *  La route /api/prix-garde-corps
 * ------------------------------------------------------------------ */

/** Les paramètres acceptés par /api/prix-garde-corps. Tout autre paramètre = refus. */
export const PARAMETRES_PRIX_GC = ["l", "allege", "etage", "fenetre", "wood", "metal", "fabric", "remplissage", "qty", "modele"] as const;

export type RequetePrixGC = {
  releve: ReleveGC;
  essence: EssenceGC;
  metalId?: string;
  fabricId?: string;
  remplissageId?: string;
  quantite: number;
};

/**
 * Lit le relevé dans l'adresse (?l=1180&allege=650&etage=1&fenetre=1400&wood=chene&metal=noir&fabric=fleur&remplissage=croix&qty=2).
 * Refuse tout ce qui n'est pas exactement attendu : entiers de millimètres
 * dans les bornes de l'outil, étage 1 ou 0, un bois connu, des identifiants
 * d'option courts, une quantité de 1 à 10, aucun paramètre inconnu ou en
 * double. « fenetre » peut manquer (0 = inconnue) ; les options aussi (celles
 * du modèle).
 */
export function lireRequetePrixGC(params: URLSearchParams): RequetePrixGC | null {
  const cles = [...params.keys()];
  if (new Set(cles).size !== cles.length) return null;
  if (cles.some((k) => !(PARAMETRES_PRIX_GC as readonly string[]).includes(k))) return null;
  const mm = (cle: string, b: { min: number; max: number }, defaut?: number) => {
    const t = params.get(cle);
    if (t === null) return defaut ?? null;
    if (!/^\d{1,5}$/.test(t)) return null;
    const n = Number(t);
    return n >= b.min && n <= b.max ? n : null;
  };
  const option = (cle: string) => {
    const t = params.get(cle);
    return t === null ? undefined : /^[a-z0-9-]{1,40}$/.test(t) ? t : null;
  };
  const largeurMm = mm("l", BORNES_RELEVE_GC.largeurMm);
  const allegeMm = mm("allege", BORNES_RELEVE_GC.allegeMm);
  const fenetreMm = mm("fenetre", BORNES_RELEVE_GC.fenetreMm, 0);
  const quantite = mm("qty", { min: 1, max: 10 }, 1);
  const etage = params.get("etage");
  const essence = params.get("wood");
  const metalId = option("metal");
  const fabricId = option("fabric");
  const remplissageId = option("remplissage");
  if (largeurMm === null || allegeMm === null || fenetreMm === null || quantite === null) return null;
  if (etage !== "1" && etage !== "0") return null;
  if (!essence || !estEssence(essence)) return null;
  if (metalId === null || fabricId === null || remplissageId === null) return null;
  const modele = params.get("modele");
  if (modele !== null && !lireModeleGC(modele)) return null;
  return { releve: { largeurMm, allegeMm, enEtage: etage === "1", fenetreMm, ...(modele ? { modele } : {}) }, essence, metalId, fabricId, remplissageId, quantite };
}

/** Le catalogue des dessins, tel qu'il part vers le navigateur : chaque dessin conforme à son prix (le calcul du panier). */
function catalogueSiteGC(q: RequetePrixGC, hauteurMm: number): ModeleGC[] {
  const modeles: ModeleGC[] = [];
  for (const d of catalogueGC(entreeGC(q.releve, q.essence))) {
    if (!d.conforme) {
      modeles.push({ id: `${d.carre}-${d.croix}${d.barreauxBas ? "-b" : ""}`, conforme: false, croix: d.croix, carre: d.carre, soubassementMm: d.soubassementMm, hauteurMm, prix: 0, kg: 0 });
      continue;
    }
    const m = d.config;
    const id = `${m.carre}-${m.croix}${m.barreauxBas ? "-b" : ""}`;
    const l = ligneGC({ ...q.releve, modele: id }, { woodId: q.essence, metalId: q.metalId, fabricId: q.fabricId, remplissageId: q.remplissageId });
    if (l.ok && l.line.gc) modeles.push({ id, conforme: true, croix: m.croix, carre: m.carre, soubassementMm: m.soubassementMm, hauteurMm: l.line.gc.hauteurMm, prix: l.line.unitPrice, kg: Math.round(l.line.gc.kg) });
  }
  return modeles.slice(0, MODELES_GC_MAX);
}

/**
 * La réponse de /api/prix-garde-corps, construite champ par champ : rien
 * d'autre ne peut partir vers le navigateur. null : une option inconnue
 * (la route répond 400).
 */
export function reponsePrixGC(q: RequetePrixGC): ReponsePrixGC | null {
  const c = configurationGC(q.releve, q.essence);
  if (!c) return null;
  if (!c.ok) {
    return {
      ok: false,
      conforme: false,
      raison: c.raison,
      hauteurMm: c.hauteurMm,
      mainCouranteMm: c.mainCouranteMm,
      jourMm: c.jourMm,
      obligatoire: c.obligatoire,
      alertes: [...c.alertes],
      modeles: catalogueSiteGC(q, c.hauteurMm),
    };
  }
  // Une option absente : celle du modèle (ligneGC).
  const r = ligneGC(q.releve, { woodId: q.essence, metalId: q.metalId, fabricId: q.fabricId, remplissageId: q.remplissageId });
  if (!r.ok || !r.line.gc) return null;
  const modeles = catalogueSiteGC(q, c.hauteurMm);
  return {
    ok: true,
    conforme: true,
    prix: r.line.unitPrice,
    remise: q.quantite > 1 ? prixCommandeGC([{ config: c, quantite: q.quantite }]).remise : 0,
    hauteurMm: c.hauteurMm,
    mainCouranteMm: c.mainCouranteMm,
    jourMm: c.jourMm,
    croix: c.croix,
    carre: c.carre,
    soubassementMm: c.soubassementMm,
    kg: Math.round(r.line.gc.kg),
    obligatoire: c.obligatoire,
    modeles,
  };
}

/* ------------------------------------------------------------------ *
 *  Le « à partir de » et la fourchette annoncée à Google
 * ------------------------------------------------------------------ */

let departMemo: number | null | undefined;
let fourchetteMemo: { prixMin: number; prixMax: number } | null | undefined;
let indisponibleSignale = false;

/** Sans la clé du chiffrage : pas de prix (rien d'inventé), et un seul message dans les journaux. */
function sansCle<T>(calcul: () => T, repli: T): T {
  try {
    return calcul();
  } catch (erreur) {
    if (!(erreur instanceof ChiffrageIndisponible)) throw erreur;
    if (!indisponibleSignale) {
      indisponibleSignale = true;
      console.error(`[prix-garde-corps] ${erreur.message} : pas de « à partir de » pour le garde-corps. Définir CHIFFRAGE_GARDE_CORPS_CLE.`);
    }
    return repli;
  }
}

/** Les suppléments les plus bas des options du site (teinte, rosace), ajoutés au prix de l'outil. */
function supplementsMoinsChers(p: Product) {
  const min = (liste: { priceDelta?: number }[] | undefined) => (liste?.length ? Math.min(...liste.map((o) => o.priceDelta ?? 0)) : 0);
  return min(p.metals) + min(p.fabrics);
}

/**
 * Le prix « à partir de » d'une pièce, sur le serveur : celui du catalogue,
 * et pour le garde-corps celui de l'outil au relevé de départ
 * (RELEVE_DEPART_GC), dans l'essence la moins chère.
 */
export function prixDepart(product: Product): number | null {
  if (!prixParOutil(product)) return priceFrom(product);
  if (departMemo !== undefined) return departMemo;
  const calcul = () => {
    const prix = ESSENCES_GC.map((essence) => {
      const c = configurationGC(RELEVE_DEPART_GC, essence);
      return c?.ok ? prixGC(c) : null;
    }).filter((x): x is number => x !== null);
    return prix.length ? Math.min(...prix) + supplementsMoinsChers(product) : null;
  };
  const valeur = sansCle(calcul, null);
  if (valeur !== null || indisponibleSignale) departMemo = valeur;
  return valeur;
}

/**
 * La fourchette de prix du garde-corps pour Google : du « à partir de » au
 * plus grand garde-corps que l'outil accepte (fenêtre sur le sol, la plus
 * haute), en noyer, avec la rosace la plus chère. Le verre, en option, n'y
 * entre pas.
 */
export function fourchetteGC(): { prixMin: number; prixMax: number } | null {
  if (fourchetteMemo !== undefined) return fourchetteMemo;
  const produit = produitGC();
  const calcul = () => {
    const min = prixDepart(produit);
    if (min === null) return null;
    let max = 0;
    for (let largeurMm = BORNES_RELEVE_GC.largeurMm.min; largeurMm <= 1700; largeurMm += 100) {
      const c = configurationGC({ largeurMm, allegeMm: 0, enEtage: true, fenetreMm: 0 }, "noyer");
      if (c?.ok) max = Math.max(max, prixGC(c));
    }
    const plusCher = (liste: { priceDelta?: number }[] | undefined) => (liste?.length ? Math.max(...liste.map((o) => o.priceDelta ?? 0)) : 0);
    return max > 0 ? { prixMin: min, prixMax: max + plusCher(produit.metals) + plusCher(produit.fabrics) } : null;
  };
  const valeur = sansCle(calcul, null);
  if (valeur !== null || indisponibleSignale) fourchetteMemo = valeur;
  return valeur;
}

