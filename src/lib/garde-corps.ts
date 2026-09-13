/**
 * Le garde-corps de fenêtre, calculé à partir de ce que le client mesure chez
 * lui. Trois cotes suffisent : la largeur entre tableaux, la hauteur d'allège
 * et l'étage. Le reste se déduit — et c'est la règle qui décide de la hauteur.
 *
 * La règle (Code de la construction, art. R111-15, et NF P01-012) : en étage,
 * une fenêtre dont l'appui est à moins de 0,90 m du sol doit recevoir une
 * barre d'appui et une protection qui monte à 1,00 m du sol au moins.
 * Au rez-de-chaussée, l'atelier vise 0,80 m du sol : la hauteur d'une barre
 * d'appui qui protège sans fermer la vue.
 * Le garde-corps fait donc, au minimum, la différence entre cette hauteur et
 * la hauteur d'allège. Ce fichier ne refuse rien : il calcule, nomme ce qu'il
 * voit, et laisse le client choisir plus haut s'il le souhaite.
 */

/** En étage, la main courante doit atteindre 1,00 m du sol fini intérieur. */
export const HAUTEUR_PROTECTION_MM = 1000;

/** Au rez-de-chaussée, la main courante monte à 0,80 m du sol. */
export const HAUTEUR_PROTECTION_RDC_MM = 800;

/** À partir de 0,90 m d'allège, la règle n'impose plus rien. */
export const ALLEGE_SANS_OBLIGATION_MM = 900;

/**
 * Hauteur conseillée quand la règle ne tranche pas (rez-de-chaussée, allège
 * haute) : celle du modèle en photo, qui donne une vraie barre d'appui sans
 * manger la vue.
 */
export const HAUTEUR_CONSEILLEE_MM = 350;

/** En dessous, ce n'est plus un garde-corps mais une barre : on n'en fait pas. */
export const HAUTEUR_MINI_FABRICATION_MM = 200;

/**
 * Le jour entre l'appui et le bas du garde-corps : la norme (NF P01-012) ne
 * laisse pas passer une sphère de 110 mm sous la lisse basse. L'atelier pose
 * toujours à 100 mm — dix millimètres de marge pour la pose, et autant de
 * hauteur en moins à fabriquer.
 */
export const JOUR_MAX_MM = 110;
export const JOUR_MM = 100;

export type ReleveFenetre = {
  /** Entre les deux tableaux, là où le garde-corps s'encastre. Cote brute. */
  largeurMm: number;
  /** Du sol fini intérieur au-dessus de l'appui de fenêtre. */
  allegeMm: number;
  /** De l'appui au haut de l'ouverture : la hauteur du tableau où le garde-corps s'encastre. */
  hauteurFenetreMm?: number;
  /** En étage, il y a une chute derrière la fenêtre : la règle s'applique. */
  enEtage: boolean;
  /** La hauteur que le client préfère, s'il en a une. */
  hauteurSouhaiteeMm?: number;
};

export type CalculFenetre = {
  largeurMm: number;
  /** La règle impose-t-elle une protection sur cette fenêtre ? (étage, allège < 90 cm) */
  obligatoire: boolean;
  /** Où la main courante doit arriver, depuis le sol : 1 000 mm en étage, 800 au rez-de-chaussée. */
  cibleMm: number;
  /** Hauteur minimale du garde-corps pour atteindre la cible : c'est elle que l'atelier applique. */
  hauteurNormeMm: number;
  /** La hauteur qu'on fabriquera : le souhait du client, sinon la règle, sinon le conseil. */
  hauteurRetenueMm: number;
  /** Le jour laissé entre l'appui et le bas du garde-corps : toujours 100 mm. */
  jourMm: number;
  /** Où arrive la main courante, mesurée depuis le sol. */
  mainCouranteMm: number;
  /** Le client a choisi plus bas que la règle : on le dit, on ne refuse pas. */
  sousLaRegle: boolean;
  /**
   * Le garde-corps tient-il dans l'ouverture ? `null` tant qu'on n'a pas la
   * hauteur de la fenêtre ; `false` si la main courante dépasserait le haut
   * du tableau — une fenêtre trop basse pour un garde-corps encastré.
   */
  tientDansLaFenetre: boolean | null;
};

/** Arrondi à la dizaine supérieure : une cote d'atelier, pas un décimal. */
const dizaine = (mm: number) => Math.ceil(mm / 10) * 10;

/**
 * Calcule le garde-corps. Rend `null` seulement si la largeur ou l'allège
 * n'est pas une mesure utilisable — jamais parce que la fenêtre serait
 * « refusée ».
 */
export function calculerGardeCorpsFenetre(releve: ReleveFenetre): CalculFenetre | null {
  const largeurMm = Math.round(releve.largeurMm);
  const allegeMm = Math.round(releve.allegeMm);
  if (!Number.isFinite(largeurMm) || largeurMm < 200) return null;
  if (!Number.isFinite(allegeMm) || allegeMm < 0) return null;

  const hauteurFenetreMm =
    releve.hauteurFenetreMm !== undefined && Number.isFinite(releve.hauteurFenetreMm)
      ? Math.round(releve.hauteurFenetreMm)
      : null;

  const obligatoire = releve.enEtage && allegeMm < ALLEGE_SANS_OBLIGATION_MM;
  const cibleMm = releve.enEtage ? HAUTEUR_PROTECTION_MM : HAUTEUR_PROTECTION_RDC_MM;
  // Le garde-corps se pose 100 mm au-dessus de l'appui : c'est autant de
  // hauteur en moins à fabriquer, et la main courante arrive quand même à la cible.
  const hauteurNormeMm = Math.max(
    HAUTEUR_MINI_FABRICATION_MM,
    dizaine(cibleMm - allegeMm - JOUR_MM)
  );

  const souhait =
    releve.hauteurSouhaiteeMm !== undefined && Number.isFinite(releve.hauteurSouhaiteeMm)
      ? Math.round(releve.hauteurSouhaiteeMm)
      : null;

  // Le souhait du client d'abord ; sinon la règle, mais jamais plus bas que
  // le conseil d'atelier — 150 mm de garde-corps au-dessus d'un appui à 85 cm
  // est conforme, mais ça ne ressemble à rien ; sinon le conseil tout court.
  const hauteurRetenueMm =
    souhait !== null && souhait >= HAUTEUR_MINI_FABRICATION_MM
      ? souhait
      : Math.max(hauteurNormeMm, HAUTEUR_CONSEILLEE_MM);

  // Le jour ne bouge pas : un garde-corps plus haut que la règle monte
  // d'autant, il ne descend pas sur l'appui.
  const jourMm = JOUR_MM;
  const mainCouranteMm = allegeMm + jourMm + hauteurRetenueMm;

  return {
    largeurMm,
    obligatoire,
    cibleMm,
    hauteurNormeMm,
    hauteurRetenueMm,
    jourMm,
    mainCouranteMm,
    sousLaRegle: hauteurRetenueMm < hauteurNormeMm,
    tientDansLaFenetre:
      hauteurFenetreMm === null ? null : allegeMm + hauteurFenetreMm >= mainCouranteMm,
  };
}
