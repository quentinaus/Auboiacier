/**
 * Le relevé du client, traduit en réglages de l'outil de plans.
 *
 * C'est la seule traduction entre le site et l'outil : le script d'extraction
 * s'en sert pour fabriquer la référence des tests, et calcul.ts pour les
 * prix. Aucun coût ici, aucune règle recopiée : les règles restent dans le
 * moteur extrait de l'outil (moteur.genere.mjs).
 */
import { ESSENCES_GC, type CodeAlerteGC, type EssenceGC, type ReleveGC } from "../garde-corps.ts";

export { ESSENCES_GC };
export type { CodeAlerteGC, EssenceGC };

/** Ce que le client relève à sa fenêtre, en millimètres, et le bois de sa main courante. */
export type EntreeSiteGC = ReleveGC & {
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
export function valeursGC<D extends object>(defauts: D, e: EntreeSiteGC, s: number, nP: number, barreauxBas = false) {
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
    // « toujours » : des barreaux droits en bas même quand la norme ne les impose pas (un des modèles au choix).
    sbMode: barreauxBas ? "toujours" : "auto",
    s,
    nP,
  };
}

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
