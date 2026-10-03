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
import { lireModeleGC } from "../garde-corps.ts";
import { codeAlerte, CROIX_MAX, ESSENCES_GC, ORDRE_CARRES, valeursGC, type CodeAlerteGC, type EntreeSiteGC } from "./entree.ts";

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
  /** Les barreaux droits du bas sont un choix (modèle « -b »), pas seulement une exigence de la norme. */
  barreauxBas: boolean;
  /** Des barreaux droits en partie basse (le cadre commence dans la zone d'escalade, sous 600 mm du sol). */
  soubassement: boolean;
  /** Leur hauteur, du bas du cadre à la lisse qui les ferme (0 : aucun). */
  soubassementMm: number;
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
    (ESSENCES_GC as readonly string[]).includes(e.essence) &&
    (e.modele === undefined || lireModeleGC(e.modele) !== null)
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
  const cle = JSON.stringify([e.largeurMm, e.allegeMm, e.enEtage, e.fenetreMm, e.essence, e.modele ?? ""]);
  const deja = memoire.get(cle);
  if (deja) {
    memoire.delete(cle);
    memoire.set(cle, deja);
    return deja;
  }
  const entree: EntreeSiteGC = Object.freeze({
    largeurMm: e.largeurMm, allegeMm: e.allegeMm, enEtage: e.enEtage, fenetreMm: e.fenetreMm, essence: e.essence,
    ...(e.modele !== undefined ? { modele: e.modele } : {}),
  });
  // Le modèle choisi par le client : lui seul est essayé. S'il ne passe pas la norme, rien n'est vendu.
  const choisi = lireModeleGC(e.modele);
  const carres: readonly number[] = choisi ? [choisi.carre] : ORDRE_CARRES;
  const [nMin, nMax] = choisi ? [choisi.croix, choisi.croix] : [1, CROIX_MAX];
  // Sans choix du client : les croix seules d'abord ; si rien ne passe, des barreaux droits en bas.
  const bas: readonly boolean[] = choisi ? [choisi.barreauxBas] : [false, true];
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
  recherche: for (const b of bas) {
    for (const s of carres) {
      for (let n = nMin; n <= nMax; n++) {
        // _rapide : mêmes alertes, sans chercher de solution à écrire dans leur texte.
        const essai = calculerGC({ ...valeursGC(DEFAUTS_GC, entree, s, n, b), _rapide: true });
        if (!essai.alertes.length) {
          const v = valeursGC(DEFAUTS_GC, entree, s, n, b);
          const R = calculerGC(v);   // le calcul complet, exactement celui qu'affiche l'outil
          if (R.alertes.length || !(R.hauteurGC! > 0) || !(R.kg! > 0)) throw new Error("garde-corps : calcul complet incohérent avec le calcul rapide");
          const soubassementMm = geomGC(v, n).sb;
          // Des barreaux demandés mais que l'outil n'a pas pu dessiner (cadre trop bas) : ce n'est pas ce modèle.
          if (b && !(soubassementMm > 0)) continue;
          resultat = { ...commun, ok: true, conforme: true, carre: s, croix: n, barreauxBas: b, soubassement: soubassementMm > 0, soubassementMm, kg: R.kg!, v: gelerProfond(v), R: gelerProfond(R) };
          break recherche;
        }
        if ((s === 16 && !b) || choisi) {
          const codes = [...new Set(essai.alertes.map(codeAlerte))];
          if (!moinsDAlertes || codes.length < moinsDAlertes.length) moinsDAlertes = codes;
        }
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

/**
 * Les modèles que la norme permet pour cette fenêtre, dans l'ordre de
 * préférence de l'atelier (le carré de 16 d'abord, le moins de croix
 * d'abord) : au plus `max`. Le premier est celui que l'outil retient de
 * lui-même. Chacun est une configuration complète, chiffrée comme les autres.
 */
export function modelesConformesGC(e: EntreeSiteGC, max = 6): ConfigGC[] {
  const { modele: _ignore, ...sansChoix } = e;
  void _ignore;
  const trouves: ConfigGC[] = [];
  const dessins = new Set<string>();
  const ajouter = (s: number, n: number, b: boolean) => {
    if (trouves.length >= max) return false;
    if (calculerGC({ ...valeursGC(DEFAUTS_GC, sansChoix, s, n, b), _rapide: true }).alertes.length) return false;
    const c = configurerGC({ ...sansChoix, modele: `${s}-${n}${b ? "-b" : ""}` });
    if (!c.ok) return false;
    // Le même dessin obtenu par deux chemins (les barreaux que la norme impose déjà) : une seule fois.
    const dessin = [c.carre, c.croix, c.soubassementMm].join("|");
    if (dessins.has(dessin)) return true;
    dessins.add(dessin);
    trouves.push(c);
    return true;
  };
  // Les croix seules d'abord, puis les barreaux en bas. Dans chaque famille : le premier carré qui
  // passe, avec le moins de croix puis une croix de plus (un dessin plus serré) ; ensuite les
  // carrés plus forts, seulement s'ils demandent MOINS de croix.
  for (const b of [false, true]) {
    let moinsDeCroix = Infinity;
    for (const s of ORDRE_CARRES) {
      for (let n = 1; n <= CROIX_MAX && n < moinsDeCroix; n++) {
        if (!ajouter(s, n, b)) continue;
        if (moinsDeCroix === Infinity && n < CROIX_MAX) ajouter(s, n + 1, b);
        moinsDeCroix = n;
        break;
      }
    }
  }
  return trouves;
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
 *
 * POUR LES TESTS SEULEMENT : elle prouve que le panier livre au prix de
 * l'outil. Elle pèse le garde-corps de l'outil, SANS le verre (l'outil ne le
 * connaît pas) ; le site, lui, livre au poids de la ligne, verre compris
 * (tarifer, src/lib/tarif-panier.ts, et livraisonDevisGC pour le devis). Elle
 * n'est donc pas exportée par src/lib/prix-garde-corps.server.ts : aucune
 * route ne peut l'utiliser (un test le vérifie).
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
