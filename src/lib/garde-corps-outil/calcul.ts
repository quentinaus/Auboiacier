/**
 * Le garde-corps du site, calculé par l'outil de plans : hauteur à la norme,
 * nombre de croix, carré, solidité, poids et prix (décisions de Quentin du
 * 29/09). Rien n'est recopié ici : la norme vient du moteur extrait
 * (moteur.genere.mjs), le prix du chiffrage extrait (chiffré, lu avec la clé).
 *
 * SERVEUR SEULEMENT. Le site l'importe par src/lib/prix-garde-corps.server.ts
 * (import "server-only") ; les tests l'importent directement. Aucun composant
 * du navigateur ne doit l'importer, même indirectement : un test le vérifie.
 */
import { ALLEGE_LIBRE, BORNES_GC, DEFAUTS_GC, calculerGC, geomGC, type ResultatGC, type ValeursGC } from "./moteur.genere.mjs";
import { chiffrage } from "./chiffrage.ts";
import { codeAlerte, CROIX_MAX, ESSENCES_GC, ORDRE_CARRES, valeursGC, type CodeAlerteGC, type EntreeSiteGC, type EssenceGC } from "./entree.ts";

export { ChiffrageIndisponible } from "./chiffrage.ts";
export type { CodeAlerteGC, EntreeSiteGC, EssenceGC } from "./entree.ts";

type Commun = {
  entree: Readonly<EntreeSiteGC>;
  /** Hauteur du garde-corps, main courante comprise (la norme de l'outil). */
  hauteurMm: number;
  /** Hauteur de la main courante au-dessus du sol. */
  mainCouranteMm: number;
  /** Jour entre l'appui et le bas du cadre. */
  jourMm: number;
  /** En étage avec une allège sous 900 mm : la loi impose la protection. */
  obligatoire: boolean;
};
/** Une configuration qui passe la norme : c'est elle qui est chiffrée, fabriquée et vendue. */
export type ConfigGC = Commun & {
  ok: true;
  conforme: true;
  carre: number;
  croix: number;
  kg: number;
  v: Readonly<ValeursGC>;
  R: Readonly<ResultatGC>;
};
/** Rien ne passe (de 1 à 6 croix, carrés de 12 à 20) : pas de prix, « à étudier avec l'atelier ». */
export type ConfigAEtudierGC = Commun & {
  ok: false;
  conforme: false;
  raison: "a-etudier" | "fenetre-trop-basse";
  /** Ce qui bloque, au carré de 16, là où il y a le moins d'alertes. */
  alertes: CodeAlerteGC[];
};

function gelerProfond<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const x of Object.values(o as object)) gelerProfond(x);
  }
  return o;
}

/** Le relevé est-il dans les bornes des champs de l'outil ? */
export function entreeValide(e: EntreeSiteGC): boolean {
  const dans = (n: unknown, b: { min: number; max: number }) => Number.isInteger(n) && (n as number) >= b.min && (n as number) <= b.max;
  return (
    dans(e.largeurMm, BORNES_GC.B) &&
    dans(e.allegeMm, BORNES_GC.A) &&
    dans(e.fenetreMm, BORNES_GC.Hf) &&
    typeof e.enEtage === "boolean" &&
    (ESSENCES_GC as readonly string[]).includes(e.essence)
  );
}

// Le calcul prend quelques millisecondes à quelques dizaines : on garde les derniers relevés.
const MEMOIRE_MAX = 500;
const memoire = new Map<string, ConfigGC | ConfigAEtudierGC>();

/**
 * La configuration choisie pour ce relevé (décision 2 du 29/09) : le carré de
 * 16 avec le moins de croix qui passe TOUTE la norme de l'outil (trous,
 * hauteur, soubassement, solidité, fenêtre) ; sinon les autres carrés de 12 à
 * 20 ; de 1 à 6 croix. Si rien ne passe : « à étudier ».
 */
export function configurerGC(e: EntreeSiteGC): ConfigGC | ConfigAEtudierGC {
  if (!entreeValide(e)) throw new RangeError("relevé de garde-corps hors des bornes de l'outil");
  const cle = JSON.stringify([e.largeurMm, e.allegeMm, e.enEtage, e.fenetreMm, e.essence]);
  const deja = memoire.get(cle);
  if (deja) {
    memoire.delete(cle);
    memoire.set(cle, deja);
    return deja;
  }
  const entree = Object.freeze({ largeurMm: e.largeurMm, allegeMm: e.allegeMm, enEtage: e.enEtage, fenetreMm: e.fenetreMm, essence: e.essence });
  const base = valeursGC(DEFAUTS_GC, entree, 16, 1);
  const g = geomGC(base, 1);
  const commun: Commun = {
    entree,
    hauteurMm: g.Hr,
    mainCouranteMm: base.A + base.jour + g.Hr,
    jourMm: base.jour,
    obligatoire: base.etage && base.A < ALLEGE_LIBRE,
  };
  let resultat: ConfigGC | ConfigAEtudierGC | null = null;
  let moinsDAlertes: CodeAlerteGC[] | null = null;
  recherche: for (const s of ORDRE_CARRES) {
    for (let n = 1; n <= CROIX_MAX; n++) {
      // _rapide : mêmes alertes, sans chercher de solution à écrire dans leur texte.
      const essai = calculerGC({ ...valeursGC(DEFAUTS_GC, entree, s, n), _rapide: true });
      if (!essai.alertes.length) {
        const v = valeursGC(DEFAUTS_GC, entree, s, n);
        const R = calculerGC(v);   // le calcul complet, exactement celui qu'affiche l'outil
        if (R.alertes.length || !(R.hauteurGC! > 0) || !(R.kg! > 0)) throw new Error("garde-corps : calcul complet incohérent avec le calcul rapide");
        resultat = { ...commun, ok: true, conforme: true, carre: s, croix: n, kg: R.kg!, v: gelerProfond(v), R: gelerProfond(R) };
        break recherche;
      }
      if (s === 16) {
        const codes = [...new Set(essai.alertes.map(codeAlerte))];
        if (!moinsDAlertes || codes.length < moinsDAlertes.length) moinsDAlertes = codes;
      }
    }
  }
  if (!resultat) {
    const alertes = moinsDAlertes ?? [];
    resultat = { ...commun, ok: false, conforme: false, raison: alertes.includes("fenetre") ? "fenetre-trop-basse" : "a-etudier", alertes };
  }
  Object.freeze(resultat);
  memoire.set(cle, resultat);
  if (memoire.size > MEMOIRE_MAX) memoire.delete(memoire.keys().next().value!);
  return resultat;
}

const prixMemo = new WeakMap<ConfigGC, number>();

/** Le prix d'UNE pièce : le prix conseillé de l'outil (arrondi à la dizaine au-dessus du plancher). */
export function prixGC(config: ConfigGC): number {
  if (!config.ok) throw new Error("pas de prix pour un garde-corps à étudier");
  const deja = prixMemo.get(config);
  if (deja !== undefined) return deja;
  const prix = chiffrage().chiffrerGC(config.R, config.v).conseille;
  if (!Number.isInteger(prix) || prix <= 0) throw new Error("garde-corps : prix de l'outil invalide");
  prixMemo.set(config, prix);
  return prix;
}

export type LigneCommandeGC = { config: ConfigGC; quantite: number };

function verifierLignes(lignes: LigneCommandeGC[]) {
  if (!lignes.length) throw new RangeError("commande de garde-corps vide");
  for (const l of lignes) {
    if (!l.config?.ok) throw new Error("pas de prix pour un garde-corps à étudier");
    if (!Number.isInteger(l.quantite) || l.quantite < 1) throw new RangeError("quantité de garde-corps invalide");
  }
}

/**
 * Plusieurs garde-corps dans une commande (décision 3 du 29/09) : les frais
 * fixes de l'atelier ne sont comptés qu'une fois, et les frais fixes du
 * paiement aussi (un seul paiement) ; le prix de la commande est recalculé
 * par la formule du plancher de l'outil, arrondi à la dizaine au-dessus :
 * jamais sous le plancher. La remise = ce prix − la somme des prix unitaires
 * (0 ou négative). Une seule pièce : exactement le prix de l'outil.
 */
export function prixCommandeGC(lignes: LigneCommandeGC[]): { pieces: number; sommeUnitaires: number; prix: number; remise: number } {
  verifierLignes(lignes);
  const { chiffrerGC, REGLAGES } = chiffrage();
  const pieces = lignes.reduce((t, l) => t + l.quantite, 0);
  const sommeUnitaires = lignes.reduce((t, l) => t + l.quantite * prixGC(l.config), 0);
  if (pieces === 1) return { pieces, sommeUnitaires, prix: sommeUnitaires, remise: 0 };
  const { fraisFixes, stripeFixe, cotis, stripePct, tvaVente } = REGLAGES;
  const cout = lignes.reduce((t, l) => t + l.quantite * chiffrerGC(l.config.R, l.config.v).cout, 0) - (pieces - 1) * fraisFixes;
  const plancher = (cout + stripeFixe) / ((1 - cotis) / (1 + tvaVente) - stripePct);   // la formule de chiffrerGC
  const prix = Math.min(sommeUnitaires, Math.ceil(plancher / 10) * 10);
  return { pieces, sommeUnitaires, prix, remise: prix - sommeUnitaires };
}

export type ModeRemiseGC = "transporteur" | "pose" | "retrait";

/**
 * La livraison d'une commande de garde-corps, comptée par l'outil (remiseGC,
 * mêmes règles que src/lib/deplacement.ts) : le poids de toutes les pièces,
 * la plus grande cote pour le hors gabarit. Retrait à l'atelier : 0 €.
 * km : distance à vol d'oiseau depuis Saumur.
 */
export function livraisonGC(lignes: LigneCommandeGC[], mode: ModeRemiseGC, km: number): { prix: number; kg: number } {
  verifierLignes(lignes);
  if (!["transporteur", "pose", "retrait"].includes(mode)) throw new RangeError("mode de livraison inconnu");
  if (!Number.isFinite(km) || km < 0) throw new RangeError("distance invalide");
  const kg = lignes.reduce((t, l) => t + l.quantite * l.config.kg, 0);
  const B = Math.max(...lignes.map((l) => l.config.v.B));
  const hauteurGC = Math.max(...lignes.map((l) => l.config.R.hauteurGC!));
  const { prix } = chiffrage().remiseGC({ kg, hauteurGC }, { B, remise: mode, km });
  return { prix, kg };
}

/** Réponse de /api/prix-garde-corps : le prix et la forme, JAMAIS un coût. */
export type ReponsePrixGC =
  | {
      ok: true;
      conforme: true;
      prix: number;
      hauteurMm: number;
      mainCouranteMm: number;
      jourMm: number;
      croix: number;
      carre: number;
      obligatoire: boolean;
    }
  | {
      ok: false;
      conforme: false;
      raison: "a-etudier" | "fenetre-trop-basse";
      hauteurMm: number;
      mainCouranteMm: number;
      jourMm: number;
      obligatoire: boolean;
      alertes: CodeAlerteGC[];
    };

/** Construite champ par champ : rien d'autre ne peut partir vers le navigateur. */
export function reponsePrixGC(e: EntreeSiteGC): ReponsePrixGC {
  const c = configurerGC(e);
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
    };
  }
  return {
    ok: true,
    conforme: true,
    prix: prixGC(c),
    hauteurMm: c.hauteurMm,
    mainCouranteMm: c.mainCouranteMm,
    jourMm: c.jourMm,
    croix: c.croix,
    carre: c.carre,
    obligatoire: c.obligatoire,
  };
}

/** Les paramètres acceptés par /api/prix-garde-corps. Tout autre paramètre = refus. */
export const PARAMETRES_PRIX_GC = ["l", "allege", "etage", "fenetre", "wood"] as const;

/**
 * Lit le relevé dans l'adresse (?l=1180&allege=650&etage=1&fenetre=1400&wood=chene).
 * Refuse tout ce qui n'est pas exactement attendu : entiers de millimètres
 * dans les bornes de l'outil, étage 1 ou 0, un bois connu, aucun paramètre
 * inconnu ou en double. « fenetre » peut manquer (0 = inconnue).
 */
export function lireEntreeGC(params: URLSearchParams): EntreeSiteGC | null {
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
  const largeurMm = mm("l", BORNES_GC.B);
  const allegeMm = mm("allege", BORNES_GC.A);
  const fenetreMm = mm("fenetre", BORNES_GC.Hf, 0);
  const etage = params.get("etage");
  const essence = params.get("wood");
  if (largeurMm === null || allegeMm === null || fenetreMm === null) return null;
  if (etage !== "1" && etage !== "0") return null;
  if (!essence || !(ESSENCES_GC as readonly string[]).includes(essence)) return null;
  return { largeurMm, allegeMm, enEtage: etage === "1", fenetreMm, essence: essence as EssenceGC };
}
