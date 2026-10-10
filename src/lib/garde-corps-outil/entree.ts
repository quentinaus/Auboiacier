/**
 * Le relevé du client, traduit en réglages de l'outil de plans.
 *
 * C'est la seule traduction entre le site et l'outil : le script d'extraction
 * s'en sert pour fabriquer la référence des tests, et calcul.ts pour les
 * prix. Aucun coût ici, aucune règle recopiée : les règles restent dans le
 * moteur extrait de l'outil (moteur.genere.mjs).
 */
import { T_MUR_DEFAUT_GC_MM, E_MUR_DEFAUT_GC_MM, ESSENCES_GC, MAINS_COURANTES_GC, jourGC, lireDecorGC, lireMainCouranteGC, type ChoixDecorGC, type CodeAlerteGC, type EssenceGC, type MainCouranteGC, type ReleveGC } from "../garde-corps.ts";

export { ESSENCES_GC, MAINS_COURANTES_GC };
export type { CodeAlerteGC, EssenceGC, MainCouranteGC };

/** Ce que le client relève à sa fenêtre, en millimètres, et le bois de sa main courante. */
export type EntreeSiteGC = ReleveGC & {
  /** Bois de la main courante. */
  essence: MainCouranteGC;
  /** Le diamètre de la rosace choisie, en mm (100 si absent) : il compte pour la norme (ROSACES_MM_GC). */
  rosaceMm?: number;
};

/** Avec le fer plat de renfort, l'atelier garde son carré de 16 (décision de Quentin, 04/10/2026). */
export const CARRE_RENFORT = 16;
/** Barreaux seuls : la charge verticale dépend du carré, le fer plat de renfort se pose donc aussi sur un carré de 18 ou de 20. */
// 18 au plus (décision de Quentin, 05/10/2026 : « 20, c'est gros, ça casse le style »).
export const CARRES_RENFORT_SEULS = [16, 18] as const;

/**
 * Décision de Quentin (29/09) : le carré de 16 d'abord, avec le moins de
 * croix qui passe la norme ; si rien ne passe en 16, les autres carrés de 12
 * à 20, du plus fin au plus gros ; de 1 à 6 croix. Si rien ne passe du tout :
 * pas de prix, « à étudier avec l'atelier ».
 */
// Jamais de carré de 20 (décision de Quentin, 05/10/2026) : au-delà de 18, ce sont le fer plat ou les pattes qui tiennent.
export const ORDRE_CARRES = [16, 12, 14, 18] as const;
/**
 * L'outil de plans n'a pas de limite de croix : on tape le nombre qu'on veut. Le site va jusqu'à 12 — un balayage
 * de toutes les cotes (05/10) montre que les fenêtres larges et basses (1,50 à 2,40 m de large, bas de fenêtre à
 * moins de 40 cm du sol) ne passent la norme qu'avec 7 à 10 croix : à 6, le site répondait « à étudier » alors que
 * l'outil, avec 7 croix, donnait un garde-corps aux normes. Le catalogue, lui, montre toujours 1 à 6 croix, puis
 * les modèles de 7 à 12 croix SEULEMENT s'ils sont aux normes (CROIX_CATALOGUE).
 */
export const CROIX_MAX = 12;
/** Au catalogue : de 1 à 6 croix toujours ; au-delà, seulement les modèles aux normes. */
export const CROIX_CATALOGUE = 6;

/**
 * Les champs du décor à volutes, tels que l'outil les lit dans sa page (decor, decorForme… : des chaînes, « 1 » pour les
 * rehauts dorés). Sans décor (ou un identifiant illisible) : rien, les valeurs de départ de l'outil restent (« aucun »).
 */
export function champsDecorGC(d: ChoixDecorGC | null): Record<string, string> {
  if (!d) return {};
  return { decor: d.assemblage, decorForme: d.forme, decorBouts: d.bouts, decorLiaison: d.liaison, decorBarreaux: d.barreaux, decorFriseBasse: d.friseBasse, decorDore: d.dore ? "1" : "0" };
}

/**
 * Les réglages de l'outil pour ce relevé : ses valeurs par défaut (celles de
 * sa page), puis le relevé du client, puis la forme vendue sur le site (croix
 * avec rosaces, main courante en bois, hauteur calculée pour la norme, rien
 * sous la fenêtre, barreaux en bas seulement si la norme les demande ; ou le
 * décor à volutes choisi, dans le cadre des barreaux seuls).
 */
export function valeursGC<D extends object>(defauts: D, e: EntreeSiteGC, s: number, nP: number, barreauxBas = false, traverse = false, renfort = false, seuls = false, patte = 0) {
  const mc = lireMainCouranteGC(e.essence) ?? { type: "bois-rainure" as const, essence: "chene" as const };
  // Le décor à volutes : l'outil le pose dans le cadre des barreaux seuls, mais garde la hauteur d'un garde-corps à croix.
  const decor = e.decor === undefined ? null : lireDecorGC(e.decor);
  return {
    ...defauts,
    B: e.largeurMm,
    // La largeur à 1 m du sol (murs pas parallèles, Quentin 10/10/2026) : le cadre suit les murs, chaque traverse coupée à la
    // largeur de son niveau. Murs parallèles : la même que B. (Le moteur ne la lit pas encore ; il l'ignore d'ici là.)
    Bh: e.largeurHautMm ?? e.largeurMm,
    A: e.allegeMm,
    etage: e.enEtage,
    Hf: e.fenetreMm,
    // La main courante : un bois, ou de l'acier (plat soudé, ou profilé). L'essence ne compte qu'avec le bois.
    essence: mc.essence ?? "chene",
    mcType: mc.type === "acier-plat" ? "acier" : mc.type === "acier-profile" ? "profil" : "bois",
    // Sans rosace (Ø0) : le centre des croix reste vide, le vide à contrôler est plus grand (rosaceR de l'outil).
    rosace: e.rosaceMm !== 0,
    // Le jour sous le cadre : 90 mm, réduit (jamais sous 40) quand le garde-corps serait sinon trop bas (jourGC). Avec un décor,
    // le minimum est celui d'un cadre à croix (200 mm), comme le jour automatique de l'outil.
    jour: jourGC(e.allegeMm, seuls && !decor),
    // Le diamètre de la rosace choisie (la fleur de Ø100 par défaut).
    rD: e.rosaceMm || 100,
    Hs: 0,
    Xo: 0,
    // Barreaux seuls (un des modèles au choix) : un cadre de barreaux verticaux, sans croix ni rosace ni traverse.
    seuls,
    nb: 0,
    // « toujours » : des barreaux droits en bas même quand la norme ne les impose pas (un des modèles au choix).
    sbMode: barreauxBas && !seuls ? "toujours" : "auto",
    // Une traverse au milieu de chaque croix (un des modèles au choix) : elle coupe les vides en deux.
    traverse: traverse && !seuls,
    // Fenêtre large : un fer plat soudé sur la lisse haute, caché sous une main courante plus large. Le site ne
    // l'ajoute que lorsqu'aucun carré de l'atelier n'est assez rigide seul (calcul.ts).
    // Le bois SUR FER PLAT est un choix du client : le plat est là d'office (sinon, seulement quand la fenêtre est large).
    renfort: renfort || mc.type === "bois-plat" ? "plat" : "sans",
    s,
    nP,
    // Les pattes scellées dans l'appui, du même carré que le cadre (0 à 4, 05/10/2026) : le site ne les ajoute que si rien ne passe
    // sans elles, et le moins possible (calcul.ts).
    patte,
    ...champsDecorGC(decor),
    // Le mur des tableaux (décisions de Quentin, 06 et 07/10/2026) : l'outil y choisit la fixation, la met au débit et au prix.
    // Seulement quand le client l'a donné ; sinon les valeurs de l'outil (mur non précisé : vis Ø 6 et chevilles, comme avant).
    ...(e.mur ? { mur: e.mur, tMur: e.tMurMm ?? T_MUR_DEFAUT_GC_MM, eMur: e.eMurMm ?? E_MUR_DEFAUT_GC_MM } : {}),
  };
}

// Le début du texte de l'alerte, suivi d'autre chose qu'une lettre (« \b » ne marche pas après un « é »).
const CODES: [string, CodeAlerteGC][] = [
  ["Barre d'appui", "barre-appui"],
  ["Trous", "trous"],
  ["Solidité", "solidite"],
  ["La fenêtre est trop basse", "fenetre"],
  ["Hauteur", "hauteur"],
  ["Soubassement", "soubassement"],
  ["Fixation", "fixation"],
  ["Le garde-corps est trop petit", "trop-petit"],
  // Un décor dans une bande trop basse (moins de 60 mm entre les traverses, par exemple avec le fer plat sous une fenêtre haute).
  ["Le garde-corps est trop bas pour un décor", "trop-petit"],
  ["Jour sous le cadre", "jour"],
  ["Jeu total", "jeu"],
  ["Main courante", "main-courante"],
  ["Charge verticale", "charge-verticale"],
  // Un appui pour le pied entre 100 et 600 mm du sol : le décor à volutes (contrôlé sur son dessin) ou la traverse du milieu.
  ["Escalade", "escalade"],
  // (« Patte au milieu » et « Patte impossible » restent « autre » : ils dépendent du DESSIN — où tombe le montant du milieu —
  // et non du carré, qui ne doit donc pas être écarté pour eux.)
];

export function codeAlerte(texte: string): CodeAlerteGC {
  for (const [debut, code] of CODES) {
    if (texte.startsWith(debut) && !/^[\p{L}\p{N}]/u.test(texte.slice(debut.length))) return code;
  }
  return "autre";
}
