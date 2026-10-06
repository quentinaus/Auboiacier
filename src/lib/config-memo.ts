// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import { BORNES_MUR_GC, BORNES_RELEVE_GC, estMurFixationGC, lireDecorGC, lireModeleGC, type MurFixationGC } from "./garde-corps.ts";
import { MATIERES_MUR } from "./murs-gc.ts";

/**
 * La configuration en cours, mise de côté le temps d'un aller-retour.
 *
 * Quand le client part créer son compte depuis le configurateur, il quitte le
 * site : il va chez Google, puis revient. Sans mémoire, il retrouverait un
 * formulaire vide et devrait tout resaisir — ses cotes, son essence, sa
 * teinte. Autant dire qu'il n'y reviendrait pas.
 *
 * On écrit donc la configuration dans le stockage de SESSION du navigateur,
 * et on la relit au retour. Session, et non local : c'est un aller-retour, pas
 * une préférence. L'onglet fermé, la mémoire s'efface toute seule.
 *
 * Rien de personnel n'y entre — ni nom, ni adresse e-mail. Uniquement des
 * identifiants d'options et des cotes, exactement ce qui figure déjà dans
 * l'adresse du devis PDF. La politique de confidentialité n'a donc rien de
 * nouveau à déclarer.
 */

export const CLE_CONFIG = "auboiacier-config-v1";

/** Ce qu'on remet en place au retour. Tout est facultatif : une version plus ancienne du site a pu écrire moins de champs. */
export type ConfigMemo = {
  /** La pièce concernée : on ne restaure pas la configuration d'une table sur une lampe. */
  slug: string;
  unite?: "mm" | "cm" | "m";
  largeur?: string;
  hauteur?: string;
  epaisseur?: string;
  hauteurTable?: string;
  sizeId?: string;
  woodId?: string;
  metalId?: string;
  fabricId?: string;
  remplissageId?: string;
  quantity?: number;
  codePostal?: string;
  /** Ancienne forme du choix de livraison (avant le retrait à l'atelier) : true = pose. */
  poseVoulue?: boolean;
  /** Comment recevoir la pièce : transporteur, pose, ou retrait à l'atelier. */
  modeLivraison?: "transporteur" | "pose" | "retrait";
  /**
   * Le relevé du garde-corps de fenêtre. Sans lui, « Reprendre » rouvrait une
   * fiche vide, et deux fenêtres différentes aux mêmes options ne faisaient
   * qu'un seul favori. Les cotes sont des millimètres entiers, dans les bornes
   * de l'atelier (BORNES_RELEVE_GC).
   */
  gcLargeurMm?: number;
  /** La largeur mesurée en haut, vers 1 m du sol (gcLargeurMm : celle d'en bas). Absente d'une mémoire plus ancienne. */
  gcLargeurHautMm?: number;
  gcAllegeMm?: number;
  gcFenetreMm?: number;
  /** true : en étage ; false : au rez-de-chaussée. Absent : le client ne l'a pas dit, et on ne le dit jamais à sa place. */
  gcEnEtage?: boolean;
  /** Le type de mur : sa matière (« brique », MATIERES_MUR) ; une mémoire plus ancienne a pu garder le mot affiché (« Brique pleine »). */
  gcMur?: string;
  /** Le modèle choisi (« 16-5-b »), tel que lireModeleGC le reconnaît. */
  gcModele?: string;
  /** Le décor à volutes choisi (« frise.S.bouton.colliers.carre.aucune.0 »), tel que lireDecorGC le reconnaît. */
  gcDecor?: string;
  /**
   * Le mur des tableaux POUR LA FIXATION (un code de MURS_FIXATION_GC : « beton », « tuffeau »…) et ses cotes en mm — la
   * fixation entre dans le prix. Distinct de gcMur, la matière que le croquis dessine. Les cotes ne vont jamais sans le mur.
   */
  gcMurFixation?: MurFixationGC;
  gcTMurMm?: number;
  gcEMurMm?: number;
};

/** Les champs du relevé du garde-corps dans la mémoire. */
export type ReleveGcMemo = Pick<
  ConfigMemo,
  "gcLargeurMm" | "gcLargeurHautMm" | "gcAllegeMm" | "gcFenetreMm" | "gcEnEtage" | "gcMur" | "gcModele" | "gcDecor" | "gcMurFixation" | "gcTMurMm" | "gcEMurMm"
>;

/** Les cases du relevé, telles que le client les tape (CotesGardeCorps, releve-garde-corps.tsx). */
type CasesReleveGc = {
  etage: string;
  largeur: string;
  /** La largeur en haut (murs pas parallèles) : facultative ici, une saisie plus ancienne ne l'a pas. */
  largeurHaut?: string;
  allege: string;
  fenetre: string;
  mur: string;
  modele?: string;
  /** Le décor à volutes (idDecorGC) : facultatif, une saisie plus ancienne ne l'a pas. */
  decor?: string;
  /** Le mur pour la fixation (un code de MURS_FIXATION_GC), et ses cotes telles que tapées : facultatifs. */
  murFixation?: string;
  tMur?: string;
  eMur?: string;
};

/** Les mots du dictionnaire dont la mémoire a besoin. Le premier de gcEtageOptions est « en étage » (voir lireReleve). */
type MotsReleveGc = { gcEtageOptions: readonly string[]; gcMurOptions: readonly string[] };

function texte(valeur: unknown): string | undefined {
  return typeof valeur === "string" && valeur.length <= 40 ? valeur : undefined;
}

/**
 * Le relevé du garde-corps, relu champ par champ : une cote qui n'est pas un
 * entier dans les bornes de l'atelier, un modèle que l'outil ne connaît pas,
 * et le champ est écarté. La même règle sert au retour dans le navigateur
 * (reprendreConfig) et à l'enregistrement d'un favori sur le serveur
 * (favoris.ts).
 */
export function lireReleveGcMemo(o: Record<string, unknown>): ReleveGcMemo {
  // Un vrai nombre, pas « ce qui se convertit » : Number(null) vaut 0, et 0
  // est une allège valable.
  const mm = (v: unknown, borne: { min: number; max: number }) =>
    typeof v === "number" && Number.isInteger(v) && v >= borne.min && v <= borne.max ? v : undefined;
  return {
    gcLargeurMm: mm(o.gcLargeurMm, BORNES_RELEVE_GC.largeurMm),
    gcLargeurHautMm: mm(o.gcLargeurHautMm, BORNES_RELEVE_GC.largeurMm),
    gcAllegeMm: mm(o.gcAllegeMm, BORNES_RELEVE_GC.allegeMm),
    gcFenetreMm: mm(o.gcFenetreMm, BORNES_RELEVE_GC.fenetreMm),
    gcEnEtage: typeof o.gcEnEtage === "boolean" ? o.gcEnEtage : undefined,
    gcMur: texte(o.gcMur) || undefined,
    gcModele: typeof o.gcModele === "string" && lireModeleGC(o.gcModele) ? o.gcModele : undefined,
    gcDecor: typeof o.gcDecor === "string" && lireDecorGC(o.gcDecor) ? o.gcDecor : undefined,
    // Le mur de la fixation : un code de la liste de l'outil ; ses cotes, dans leurs bornes, et seulement avec lui.
    gcMurFixation: estMurFixationGC(o.gcMurFixation) ? o.gcMurFixation : undefined,
    gcTMurMm: estMurFixationGC(o.gcMurFixation) ? mm(o.gcTMurMm, BORNES_MUR_GC.tMurMm) : undefined,
    gcEMurMm: estMurFixationGC(o.gcMurFixation) ? mm(o.gcEMurMm, BORNES_MUR_GC.eMurMm) : undefined,
  };
}

/**
 * Les cases du relevé, mises sous la forme que la mémoire garde : des
 * millimètres entiers (la même lecture que lireReleve), et l'étage en oui/non
 * plutôt que le mot affiché, qui change avec la langue.
 */
export function releveVersMemo(cases: CasesReleveGc, t: MotsReleveGc): ReleveGcMemo {
  const mm = (saisie: string) => {
    // Comme le formulaire (lireReleve) : « 1 180 » et « 1172 mm » se lisent aussi.
    const nombre = Number(saisie.replace(/[\s\u00a0\u202f]/g, "").replace(/mm$/i, "").replace(",", "."));
    return saisie.trim() !== "" && Number.isFinite(nombre) && nombre >= 0 ? Math.round(nombre) : undefined;
  };
  const etage = t.gcEtageOptions.indexOf(cases.etage);
  return {
    gcLargeurMm: mm(cases.largeur),
    gcLargeurHautMm: cases.largeurHaut === undefined ? undefined : mm(cases.largeurHaut),
    gcAllegeMm: mm(cases.allege),
    gcFenetreMm: mm(cases.fenetre),
    gcEnEtage: etage === 0 ? true : etage === 1 ? false : undefined,
    // La matière, pas le mot de la liste : il change avec la langue. Un mot inconnu de la liste est gardé tel quel.
    gcMur: cases.mur ? (MATIERES_MUR[t.gcMurOptions.indexOf(cases.mur)] ?? cases.mur) : undefined,
    gcModele: cases.modele || undefined,
    gcDecor: cases.decor && lireDecorGC(cases.decor) ? cases.decor : undefined,
    gcMurFixation: estMurFixationGC(cases.murFixation) ? cases.murFixation : undefined,
    gcTMurMm: estMurFixationGC(cases.murFixation) && cases.tMur !== undefined ? mm(cases.tMur) : undefined,
    gcEMurMm: estMurFixationGC(cases.murFixation) && cases.eMur !== undefined ? mm(cases.eMur) : undefined,
  };
}

/**
 * Le chemin inverse : les cases à remettre en place à la reprise d'un favori
 * ou au retour de la création de compte. Seulement ce qui avait été rempli.
 * L'étage ne revient que s'il avait été choisi : sur une nouvelle fenêtre,
 * rien n'est jamais coché d'avance (décision du 03/10). Le mur ne revient que
 * dans la langue de la page.
 */
export function memoVersReleve(memo: ReleveGcMemo, t: MotsReleveGc): Partial<CasesReleveGc> {
  const cases: Partial<CasesReleveGc> = {};
  if (memo.gcLargeurMm !== undefined) cases.largeur = String(memo.gcLargeurMm);
  if (memo.gcLargeurHautMm !== undefined) cases.largeurHaut = String(memo.gcLargeurHautMm);
  if (memo.gcAllegeMm !== undefined) cases.allege = String(memo.gcAllegeMm);
  if (memo.gcFenetreMm !== undefined) cases.fenetre = String(memo.gcFenetreMm);
  const etage = memo.gcEnEtage === undefined ? undefined : t.gcEtageOptions[memo.gcEnEtage ? 0 : 1];
  if (etage !== undefined) cases.etage = etage;
  // La matière se retrouve dans la liste de la page, quelle que soit sa langue ; une mémoire plus ancienne a gardé
  // le mot affiché, qu'on reprend s'il est dans la liste.
  if (memo.gcMur !== undefined) {
    const mot = t.gcMurOptions[(MATIERES_MUR as readonly string[]).indexOf(memo.gcMur)] ?? (t.gcMurOptions.includes(memo.gcMur) ? memo.gcMur : undefined);
    if (mot !== undefined) cases.mur = mot;
  }
  if (memo.gcModele !== undefined) cases.modele = memo.gcModele;
  if (memo.gcDecor !== undefined) cases.decor = memo.gcDecor;
  if (memo.gcMurFixation !== undefined) {
    cases.murFixation = memo.gcMurFixation;
    if (memo.gcTMurMm !== undefined) cases.tMur = String(memo.gcTMurMm);
    if (memo.gcEMurMm !== undefined) cases.eMur = String(memo.gcEMurMm);
  }
  return cases;
}

/**
 * Met la configuration de côté. Ne lève jamais : le stockage de session peut
 * être refusé (navigation privée, réglage du navigateur), et une mémoire qui
 * échoue ne doit pas empêcher d'aller créer son compte.
 */
export function memoriserConfig(config: ConfigMemo): void {
  try {
    sessionStorage.setItem(CLE_CONFIG, JSON.stringify(config));
  } catch {
    // Tant pis : le client resaisira ses cotes.
  }
}

/**
 * Relit la configuration mise de côté, et l'efface. On ne la restaure qu'UNE
 * fois : sans cela, un client qui revient sur la fiche trois jours plus tard
 * verrait ressurgir des cotes qu'il avait oubliées.
 *
 * Rend null si rien n'attend, si la mémoire est illisible, ou si elle
 * concerne une autre pièce.
 */
export function reprendreConfig(slug: string): ConfigMemo | null {
  let brut: string | null = null;
  try {
    brut = sessionStorage.getItem(CLE_CONFIG);
    if (brut !== null) sessionStorage.removeItem(CLE_CONFIG);
  } catch {
    return null;
  }
  if (!brut) return null;

  let lu: unknown;
  try {
    lu = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!lu || typeof lu !== "object") return null;
  const o = lu as Record<string, unknown>;
  if (o.slug !== slug) return null;

  const unite = texte(o.unite);
  const quantity = Number(o.quantity);
  return {
    slug,
    unite: unite === "mm" || unite === "cm" || unite === "m" ? unite : undefined,
    largeur: texte(o.largeur),
    hauteur: texte(o.hauteur),
    epaisseur: texte(o.epaisseur),
    hauteurTable: texte(o.hauteurTable),
    sizeId: texte(o.sizeId),
    woodId: texte(o.woodId),
    metalId: texte(o.metalId),
    fabricId: texte(o.fabricId),
    remplissageId: texte(o.remplissageId),
    quantity: Number.isInteger(quantity) && quantity >= 1 && quantity <= 99 ? quantity : undefined,
    codePostal: texte(o.codePostal),
    poseVoulue: typeof o.poseVoulue === "boolean" ? o.poseVoulue : undefined,
    modeLivraison: o.modeLivraison === "transporteur" || o.modeLivraison === "pose" || o.modeLivraison === "retrait" ? o.modeLivraison : undefined,
    ...lireReleveGcMemo(o),
  };
}
