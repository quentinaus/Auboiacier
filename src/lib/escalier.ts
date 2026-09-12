/**
 * Le calcul d'un escalier, à partir des cotes que le client relève chez lui.
 *
 * Trois nombres suffisent à dessiner un escalier droit : la hauteur à monter,
 * le recul disponible au sol, et la largeur de passage. Le reste se déduit.
 *
 * Ce fichier ne refuse jamais rien. Il calcule, il nomme ce qu'il voit, et il
 * laisse la décision au relevé sur place — c'est là qu'on découvre le mur qui
 * n'est pas d'équerre et la poutre qui traîne.
 */

/** Hauteur de marche visée à l'atelier : la marche confortable d'une maison. */
export const HAUTEUR_MARCHE_VISEE_MM = 175;

/** Bornes de confort admises en habitation : en dessous on rampe, au-dessus on grimpe. */
export const HAUTEUR_MARCHE_MIN_MM = 170;
export const HAUTEUR_MARCHE_MAX_MM = 200;

/** Giron de confort : la profondeur sur laquelle le pied se pose. */
export const GIRON_CONFORT_MM = 280;

/**
 * La formule de Blondel, celle que tous les escaliéristes ont en tête :
 * deux fois la hauteur de marche plus le giron doit tomber entre 60 et 65 cm.
 * En dessous, on trottine ; au-dessus, on s'étire à chaque pas.
 */
export const BLONDEL_MIN_MM = 600;
export const BLONDEL_MAX_MM = 650;

export type ReleveEscalier = {
  /** Du sol fini du bas au sol fini de l'étage. C'est LA cote qui compte. */
  hauteurMm: number;
  /** L'espace disponible au sol, du départ de la première marche à l'aplomb de l'arrivée. */
  reculMm?: number;
};

export type ConfortMarche = "confortable" | "un-peu-raide" | "raide";

/**
 * Le pas, au sens de Blondel.
 * « serré » : pas assez de recul, les marches se marchent dessus.
 * « allongé » : plus de recul que nécessaire, la foulée s'étire.
 */
export type Pas = "juste" | "serre" | "allonge";

export type CalculEscalier = {
  /** Nombre de marches à monter, la dernière étant le sol de l'étage. */
  nombreDeMarches: number;
  /** Hauteur d'une marche, en millimètres. */
  hauteurDeMarcheMm: number;
  confort: ConfortMarche;
  /** Le recul qu'il faudrait pour un giron confortable de 28 cm. */
  reculConfortMm: number;
  /** Renseignés seulement quand le client a donné son recul. */
  gironMm?: number;
  blondelMm?: number;
  /** Où tombe le pas dans la fourchette de Blondel. */
  pas?: Pas;
};

/**
 * Le nombre de marches : on cherche celui qui rapproche le plus la hauteur de
 * marche des 175 mm visés, sans jamais descendre sous deux marches.
 */
function nombreDeMarches(hauteurMm: number): number {
  const brut = Math.round(hauteurMm / HAUTEUR_MARCHE_VISEE_MM);
  return Math.max(2, brut);
}

/** Une hauteur de marche, dite comme on la dit à l'atelier. */
function confortPour(hauteurDeMarcheMm: number): ConfortMarche {
  if (hauteurDeMarcheMm <= 180) return "confortable";
  if (hauteurDeMarcheMm <= 190) return "un-peu-raide";
  return "raide";
}

/**
 * Calcule l'escalier. Rend `null` uniquement si la hauteur n'est pas un
 * nombre utilisable — pas parce que l'escalier serait « refusé ».
 */
export function calculerEscalier(releve: ReleveEscalier): CalculEscalier | null {
  const hauteurMm = Math.round(releve.hauteurMm);
  if (!Number.isFinite(hauteurMm) || hauteurMm < 300) return null;

  const nombre = nombreDeMarches(hauteurMm);
  const hauteurDeMarcheMm = hauteurMm / nombre;

  // Le dernier giron est le sol de l'étage : on ne le compte pas au sol.
  const girons = Math.max(1, nombre - 1);
  const reculConfortMm = girons * GIRON_CONFORT_MM;

  const calcul: CalculEscalier = {
    nombreDeMarches: nombre,
    hauteurDeMarcheMm,
    confort: confortPour(hauteurDeMarcheMm),
    reculConfortMm,
  };

  const reculMm = releve.reculMm === undefined ? NaN : Math.round(releve.reculMm);
  if (Number.isFinite(reculMm) && reculMm > 0) {
    const gironMm = reculMm / girons;
    const blondelMm = 2 * hauteurDeMarcheMm + gironMm;
    calcul.gironMm = gironMm;
    calcul.blondelMm = blondelMm;
    calcul.pas =
      blondelMm < BLONDEL_MIN_MM ? "serre" : blondelMm > BLONDEL_MAX_MM ? "allonge" : "juste";
  }

  return calcul;
}
