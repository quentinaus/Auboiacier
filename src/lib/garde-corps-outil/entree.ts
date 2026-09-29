/**
 * Le relevé du client, traduit en réglages de l'outil de plans.
 *
 * C'est la seule traduction entre le site et l'outil : le script d'extraction
 * s'en sert pour fabriquer la référence des tests, et calcul.ts pour les
 * prix. Aucun coût ici, aucune règle recopiée : les règles restent dans le
 * moteur extrait de l'outil (moteur.genere.mjs).
 */

export const ESSENCES_GC = ["pin", "hetre", "chene", "noyer"] as const;
export type EssenceGC = (typeof ESSENCES_GC)[number];

/** Ce que le client relève à sa fenêtre, en millimètres. */
export type EntreeSiteGC = {
  /** Largeur entre les tableaux (B dans l'outil). */
  largeurMm: number;
  /** Hauteur du sol au-dessus de l'appui (A dans l'outil). */
  allegeMm: number;
  /** En étage (true) ou au rez-de-chaussée (false). */
  enEtage: boolean;
  /** Hauteur de la fenêtre, de l'appui au haut ; 0 = inconnue (Hf dans l'outil). */
  fenetreMm: number;
  /** Bois de la main courante. */
  essence: EssenceGC;
};

/**
 * Décision de Quentin (29/09) : le carré de 16 d'abord, avec le moins de
 * croix qui passe la norme ; si rien ne passe en 16, les autres carrés de 12
 * à 20, du plus fin au plus gros ; de 1 à 6 croix. Si rien ne passe du tout :
 * pas de prix, « à étudier avec l'atelier ».
 */
export const ORDRE_CARRES = [16, 12, 14, 18, 20] as const;
export const CROIX_MAX = 6;

/**
 * Les réglages de l'outil pour ce relevé : ses valeurs par défaut (celles de
 * sa page), puis le relevé du client, puis la forme vendue sur le site (croix
 * avec rosaces, main courante en bois, hauteur calculée pour la norme, rien
 * sous la fenêtre, barreaux en bas seulement si la norme les demande).
 */
export function valeursGC<D extends object>(defauts: D, e: EntreeSiteGC, s: number, nP: number) {
  return {
    ...defauts,
    B: e.largeurMm,
    A: e.allegeMm,
    etage: e.enEtage,
    Hf: e.fenetreMm,
    essence: e.essence,
    mcType: "bois",
    rosace: true,
    Hs: 0,
    Xo: 0,
    nb: 0,
    sbMode: "auto",
    s,
    nP,
  };
}

/** Les alertes de l'outil, réduites à un mot-clé que le site sait traduire. */
export type CodeAlerteGC =
  | "trous"
  | "solidite"
  | "fenetre"
  | "hauteur"
  | "soubassement"
  | "fixation"
  | "trop-petit"
  | "jour"
  | "main-courante"
  | "autre";

// Le début du texte de l'alerte, suivi d'autre chose qu'une lettre (« \b » ne marche pas après un « é »).
const CODES: [string, CodeAlerteGC][] = [
  ["Trous", "trous"],
  ["Solidité", "solidite"],
  ["La fenêtre est trop basse", "fenetre"],
  ["Hauteur", "hauteur"],
  ["Soubassement", "soubassement"],
  ["Fixation", "fixation"],
  ["Le garde-corps est trop petit", "trop-petit"],
  ["Jour sous le cadre", "jour"],
  ["Main courante", "main-courante"],
];

export function codeAlerte(texte: string): CodeAlerteGC {
  for (const [debut, code] of CODES) {
    if (texte.startsWith(debut) && !/^[\p{L}\p{N}]/u.test(texte.slice(debut.length))) return code;
  }
  return "autre";
}
