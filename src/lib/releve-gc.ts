/**
 * Le relevé du garde-corps de fenêtre, tel que le client le tape dans la fiche (releve-garde-corps.tsx), et sa lecture :
 * les cases, le relevé en millimètres (lireReleve), ce qui manque, les deux largeurs quand les murs ne sont pas
 * parallèles, et l'état de chaque question du parcours. Rien d'affiché ici : des fonctions pures, que les tests
 * (node --test) chargent telles quelles — chemins relatifs et extensions en toutes lettres, comme les autres fichiers de lib.
 */
import type { Dictionary } from "../app/[lang]/dictionaries";
import {
  BORNES_MUR_GC,
  BORNES_RELEVE_GC,
  ECART_MURS_SUSPECT_GC_MM,
  TOLERANCE_MURS_GC_MM,
  champsMurGC,
  lireDecorGC,
  lireModeleGC,
  type MurFixationGC,
  type ReleveGC,
} from "./garde-corps.ts";
import type { Deplacement } from "./deplacement.ts";
import { matiereMur } from "./murs-gc.ts";

/** Tout ce que le client décide sur sa fenêtre, tel qu'il le tape. */
export type CotesGardeCorps = {
  /** « moi » : le client mesure. « atelier » : Quentin vient mesurer. */
  qui: "moi" | "atelier";
  etage: string;
  /** La largeur de la fenêtre entre les murs, en bas (juste au-dessus de l'appui). */
  largeur: string;
  /**
   * La même largeur en haut, à 1 m du sol (décision de Quentin, 05/10 : des murs pas parallèles). Décision du 10/10/2026 : le
   * garde-corps SUIT les murs — chaque traverse est coupée à la largeur de son niveau (cadre en trapèze), c'est l'outil qui
   * calcule ; les deux largeurs partent telles quelles jusqu'à la commande (ReleveGC.largeurMm en bas, largeurHautMm en haut).
   */
  largeurHaut: string;
  /**
   * Les murs ne sont pas droits (la largeur change du bas en haut) : seulement alors on demande la largeur à 1 m du sol
   * (Quentin, 09/10/2026 : « le code pour savoir si les murs sont parallèles induit en erreur, peut-être en option »).
   * Absent ou faux : une seule largeur, celle du bas, et des murs parallèles.
   */
  mursInegaux?: boolean;
  /** Du sol au bas de la fenêtre. C'est d'elle qu'on déduit la hauteur du garde-corps. */
  allege: string;
  /** De l'appui au haut de l'ouverture : le garde-corps doit tenir dedans. */
  fenetre: string;
  mur: string;
  codePostal: string;
  /** Le déplacement calculé par le serveur pour ce code postal, ou rien. */
  deplacement: Deplacement | null;
  /** Le créneau choisi : « 2026-09-23|matin ». */
  rdv: string;
  /** Le modèle choisi parmi ceux que la norme permet (« 16-5-b ») ; vide : celui que l'atelier conseille. */
  modele?: string;
  /**
   * Le décor à volutes choisi (bibliothèque de styles, 06/10/2026), son identifiant (lireDecorGC) : il remplace les croix et
   * le modèle de la rangée ne compte plus. Vide : sans décor (les croix, comme avant).
   */
  decor?: string;
  /**
   * La fixation dans le mur (« Auboiacier », 07/10/2026, sur le oui de Quentin) : le code du mur pour l'outil
   * (MURS_FIXATION_GC). Déduit du type de mur ; pour la pierre, le client précise laquelle (tuffeau, pierre dure, moellons).
   */
  murFixation?: string;
  /** La profondeur du tableau, de l'angle de la façade (mur nu) jusqu'à la fenêtre, en mm : les tiges s'y scellent. */
  tMur?: string;
  /** L'épaisseur du mur, en mm : seulement pour la pierre dure et les moellons (ancrage traversant), facultative. */
  eMur?: string;
  /** La photo du tableau est partie à l'atelier (photo-tableau.tsx) : le bouton le dit. Rien n'est gardé de la photo. */
  photoTableau?: "envoyee";
};

export const COTES_GARDE_CORPS_VIDES: CotesGardeCorps = {
  // Mesurer soi-même d'abord : gratuit, et le prix tombe tout de suite.
  qui: "moi",
  etage: "",
  largeur: "",
  largeurHaut: "",
  allege: "",
  fenetre: "",
  mur: "",
  codePostal: "",
  deplacement: null,
  rdv: "",
};

export const mm = (valeur: string) => {
  // « 1 180 » (avec l'espace, comme le site écrit lui-même ses nombres) et « 1180 mm » se lisent aussi.
  const nombre = Number(valeur.replace(/[\s\u00a0\u202f]/g, "").replace(/mm$/i, "").replace(",", "."));
  return valeur.trim() !== "" && Number.isFinite(nombre) && nombre >= 0 ? Math.round(nombre) : NaN;
};

/** Une cote du mur telle que tapée, relue en millimètres pour le message de l'atelier (vide si illisible). */
export const saisieMur = (valeur?: string) => {
  const n = mm(valeur ?? "");
  return Number.isFinite(n) ? `${n} mm` : "";
};

/** Les trois pierres que l'outil distingue pour la fixation : la pierre tendre de la région, la pierre dure, les moellons. */
export const PIERRES_GC = ["tuffeau", "pierre-dure", "moellons"] as const;
/** Les murs dont l'épaisseur compte pour la fixation (ancrage traversant). */
export const murAvecEpaisseurGC = (m: MurFixationGC | null) => m === "pierre-dure" || m === "moellons";
/**
 * Le mur de la fixation, déduit des cases : le type de mur de la liste (« Je ne sais pas » : enduit, le mur inconnu,
 * prix indicatif), et la pierre précisée. null : rien de choisi, ou la pierre pas encore précisée.
 */
export function murFixationDesCotes(cotes: CotesGardeCorps, options: readonly string[]): MurFixationGC | null {
  if (!cotes.mur) return null;
  const matiere = matiereMur(cotes.mur, options);
  if (matiere !== "pierre") return matiere;
  return (PIERRES_GC as readonly string[]).includes(cotes.murFixation ?? "") ? (cotes.murFixation as MurFixationGC) : null;
}

/** Ce que disent les cases : un relevé complet, ce qui manque, ou une cote hors de ce que l'atelier fabrique. */
export type LectureReleve =
  /**
   * `manque` : la première chose qui manque, pour le dire précisément au client — la largeur, le bas de
   * la fenêtre, la hauteur de fenêtre tapée de travers (facultative), ou « etage » quand les cotes
   * sont là mais que le client n'a pas dit où est la fenêtre.
   */
  | { etat: "incomplet"; manque: "largeur" | "largeurHaut" | "allege" | "fenetre" | "etage"; illisible?: boolean }
  | { etat: "hors-bornes"; raison: "trop-etroit" | "trop-large" | "allege" | "fenetre" }
  | { etat: "ok"; releve: ReleveGC };

/**
 * Le relevé, lu dans les cases. Les trois mesures sont demandées (la hauteur
 * de la fenêtre dit si le garde-corps tient dedans) ; tant que le client n'a
 * pas dit, on suppose l'étage : c'est le cas où la loi s'applique, mieux vaut
 * la montrer que la taire. Les bornes sont celles de l'outil de plans.
 */
/** La largeur du haut telle que le calcul la lit : celle que le client a tapée si ses murs sont de travers, sinon la largeur du bas. */
export const largeurHautSaisie = (cotes: CotesGardeCorps) => (cotes.mursInegaux ? cotes.largeurHaut : cotes.largeur);

export function lireReleve(cotes: CotesGardeCorps, t: Dictionary["artisanat"]): LectureReleve {
  // La largeur du relevé est celle du BAS, au ras de l'appui (B dans l'outil) ; celle du haut, à 1 m du sol, part à côté
  // quand les murs ne sont pas parallèles (largeurHautMm) : l'outil coupe chaque traverse à la largeur de son niveau.
  const largeurMm = mm(cotes.largeur);
  const largeurHautMm = mm(largeurHautSaisie(cotes));
  const allegeMm = mm(cotes.allege);
  // La hauteur de la fenêtre est FACULTATIVE (décision du 03/10) : elle ne sert qu'au croquis et à
  // vérifier que le garde-corps tient dans l'ouverture. Vide : 0, « inconnue », comme dans l'outil.
  const fenetreMm = cotes.fenetre.trim() === "" ? 0 : mm(cotes.fenetre);
  // `illisible` : la case est remplie, mais ce n'est pas une mesure (des lettres, zéro, un nombre négatif).
  if (!Number.isFinite(largeurMm) || largeurMm <= 0) return { etat: "incomplet", manque: "largeur", illisible: cotes.largeur.trim() !== "" };
  if (!Number.isFinite(largeurHautMm) || largeurHautMm <= 0) return { etat: "incomplet", manque: "largeurHaut", illisible: cotes.largeurHaut.trim() !== "" };
  if (!Number.isFinite(allegeMm)) return { etat: "incomplet", manque: "allege", illisible: cotes.allege.trim() !== "" };
  if (!Number.isFinite(fenetreMm)) return { etat: "incomplet", manque: "fenetre", illisible: true };
  // En étage ou au rez-de-chaussée : JAMAIS présélectionné (décision du 03/10). La norme en dépend ;
  // un choix fait d'avance passerait inaperçu, et le garde-corps serait calculé pour la mauvaise règle.
  if (!t.gcEtageOptions.includes(cotes.etage)) return { etat: "incomplet", manque: "etage" };
  const B = BORNES_RELEVE_GC;
  // Les DEUX largeurs dans les bornes de l'outil : la plus petite dit « trop étroit », la plus grande « trop large ».
  if (Math.min(largeurMm, largeurHautMm) < B.largeurMm.min) return { etat: "hors-bornes", raison: "trop-etroit" };
  if (Math.max(largeurMm, largeurHautMm) > B.largeurMm.max) return { etat: "hors-bornes", raison: "trop-large" };
  if (allegeMm > B.allegeMm.max) return { etat: "hors-bornes", raison: "allege" };
  if (fenetreMm > B.fenetreMm.max) return { etat: "hors-bornes", raison: "fenetre" };
  // Le mur de la fixation, dès qu'il est choisi : ses cotes seulement lisibles et dans leurs bornes (sinon celles de
  // l'outil), l'épaisseur seulement pour la pierre dure et les moellons.
  const murFixation = murFixationDesCotes(cotes, t.gcMurOptions);
  const dans = (v: number, b: { min: number; max: number }) => (Number.isFinite(v) && v >= b.min && v <= b.max ? v : undefined);
  const champsMur = murFixation
    ? champsMurGC({
        mur: murFixation,
        tMurMm: dans(mm(cotes.tMur ?? ""), BORNES_MUR_GC.tMurMm),
        eMurMm: murAvecEpaisseurGC(murFixation) ? dans(mm(cotes.eMur ?? ""), BORNES_MUR_GC.eMurMm) : undefined,
      })
    : {};
  return {
    etat: "ok",
    releve: {
      largeurMm,
      // Absente ou égale : des murs parallèles. Elle n'est écrite que si elle diffère (le libellé, la note et l'identifiant de
      // ligne du panier ne changent pas pour une fenêtre droite).
      ...(cotes.mursInegaux && largeurHautMm !== largeurMm ? { largeurHautMm } : {}),
      allegeMm, enEtage: cotes.etage === t.gcEtageOptions[0], fenetreMm, ...champsMur, ...(lireDecorGC(cotes.decor) ? { decor: cotes.decor } : lireModeleGC(cotes.modele) ? { modele: cotes.modele } : {}) },
  };
}

/**
 * Ce qui manque, dit précisément (« j'ai tout indiqué et je ne peux pas ajouter au panier » : la largeur
 * affichait sa valeur d'exemple en gris, et le site ne disait pas QUELLE mesure manquait).
 */
export function texteManqueGC(lecture: LectureReleve | null | undefined, locale: "fr" | "en"): string | null {
  if (lecture?.etat !== "incomplet") return null;
  const fr = locale === "fr";
  switch (lecture.manque) {
    case "largeur":
      if (lecture.illisible) return fr ? "La largeur en bas n'est pas un nombre : corrigez-la." : "The width at the bottom is not a number: please correct it.";
      return fr ? "Il manque la largeur en bas, d'un mur à l'autre, juste au-dessus de l'appui." : "The width at the bottom, wall to wall just above the sill, is missing.";
    case "largeurHaut":
      if (lecture.illisible) return fr ? "La largeur à 1 m du sol n'est pas un nombre : corrigez-la." : "The width 1 m from the floor is not a number: please correct it.";
      return fr ? "Il manque la largeur à 1 m du sol, d'un mur à l'autre." : "The width 1 m from the floor, wall to wall, is missing.";
    case "allege":
      if (lecture.illisible) return fr ? "La hauteur du sol au bas de la fenêtre n'est pas un nombre : corrigez-la." : "The height from the floor to the bottom of the window is not a number: please correct it.";
      return fr ? "Il manque la hauteur du sol au bas de la fenêtre." : "The height from the floor to the bottom of the window is missing.";
    case "fenetre":
      return fr
        ? "La hauteur de la fenêtre n'est pas un nombre : corrigez-la ou effacez-la (elle est facultative)."
        : "The window height is not a number: correct it or clear it (it is optional).";
    case "etage":
      return fr ? "Dites où est la fenêtre : en étage ou au rez-de-chaussée." : "Tell us where the window is: upstairs or on the ground floor.";
  }
}

/**
 * Les deux largeurs mesurées et leur écart (murs pas parallèles), quand les deux cases sont lisibles ; sinon null.
 * Murs droits : la largeur du haut est celle du bas, l'écart est nul.
 */
export function largeursGC(cotes: CotesGardeCorps): { basMm: number; hautMm: number; ecartMm: number } | null {
  const basMm = mm(cotes.largeur);
  const hautMm = mm(largeurHautSaisie(cotes));
  if (!Number.isFinite(basMm) || basMm <= 0 || !Number.isFinite(hautMm) || hautMm <= 0) return null;
  return { basMm, hautMm, ecartMm: Math.abs(basMm - hautMm) };
}

/**
 * Ce qu'on dit au client quand ses murs ne sont pas parallèles (null : les deux largeurs sont égales, ou pas encore là).
 * Décision de Quentin (10/10/2026) : plus de renvoi vers l'atelier — le garde-corps suit les murs, chaque traverse est coupée
 * à la largeur de son niveau, et c'est l'outil qui calcule.
 */
export function texteEcartGC(cotes: CotesGardeCorps, locale: "fr" | "en"): string | null {
  const l = largeursGC(cotes);
  // Un ou deux millimètres d'écart : c'est l'enduit, pas un mur de travers. Rien à dire.
  if (!l || l.ecartMm <= TOLERANCE_MURS_GC_MM) return null;
  // Une largeur encore en cours de frappe (« 1 », « 11 »…) ou hors de ce que l'atelier fabrique : c'est le message de
  // cette largeur qui parle, pas l'écart.
  const B = BORNES_RELEVE_GC.largeurMm;
  if (Math.min(l.basMm, l.hautMm) < B.min || Math.max(l.basMm, l.hautMm) > B.max) return null;
  const fr = locale === "fr";
  const n = (v: number) => v.toLocaleString(fr ? "fr-FR" : "en-GB");
  return fr
    ? `Vos murs ne sont pas parallèles : ${n(l.ecartMm)} mm d'écart. Le garde-corps suit vos murs : chaque traverse est coupée à la largeur de son niveau.`
    : `Your walls are not parallel: ${n(l.ecartMm)} mm apart. The railing follows your walls: each rail is cut to the width at its level.`;
}

/** L'avertissement d'un écart peu plausible entre les deux largeurs (null en dessous d'ECART_MURS_SUSPECT_GC_MM). */
export function texteEcartSuspectGC(cotes: CotesGardeCorps, locale: "fr" | "en"): string | null {
  const l = largeursGC(cotes);
  if (!l || l.ecartMm <= ECART_MURS_SUSPECT_GC_MM) return null;
  const n = l.ecartMm.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB");
  return locale === "fr" ? `Vérifiez vos deux largeurs : ${n} mm d'écart, c'est beaucoup.` : `Check both widths: ${n} mm apart is a lot.`;
}

/**
 * Téléphone, une question à la fois (etapes-telephone.tsx) : ce qui empêche de passer à la question suivante (`manque`),
 * et ce qu'il faut savoir sans être bloqué (`avertissement` : une mesure hors de ce que l'atelier fabrique). Chaque
 * question est lue SEULE : `lireReleve` s'arrête au premier défaut, une largeur hors barème y cachait une hauteur vide.
 */
export function etatQuestionGC(
  cotes: CotesGardeCorps,
  question: number,
  t: Dictionary["artisanat"],
  locale: "fr" | "en",
): { manque: string | null; avertissement: string | null } {
  const fr = locale === "fr";
  const B = BORNES_RELEVE_GC;
  const nombre = (n: number) => n.toLocaleString(fr ? "fr-FR" : "en-GB");
  const rien = { manque: null, avertissement: null };
  switch (question) {
    case 1: {
      const v = mm(cotes.largeur);
      if (!Number.isFinite(v) || v <= 0)
        return {
          manque:
            cotes.largeur.trim() !== ""
              ? fr ? "La largeur n'est pas un nombre : corrigez-la." : "The width is not a number: please correct it."
              : fr ? "Entrez la largeur de la fenêtre pour continuer." : "Enter the window width to continue.",
          avertissement: null,
        };
      if (v < B.largeurMm.min) return { manque: null, avertissement: t.gcTropEtroit.replace("{min}", nombre(B.largeurMm.min)) };
      if (v > B.largeurMm.max) return { manque: null, avertissement: t.gcHorsBareme.replace("{l}", nombre(B.largeurMm.max)) };
      return rien;
    }
    case 2: {
      // Murs droits (la réponse par défaut) : rien à mesurer de plus.
      if (!cotes.mursInegaux) return rien;
      const v = mm(cotes.largeurHaut);
      if (!Number.isFinite(v) || v <= 0)
        return {
          manque:
            cotes.largeurHaut.trim() !== ""
              ? fr ? "La largeur à 1 m du sol n'est pas un nombre : corrigez-la." : "The width 1 m from the floor is not a number: please correct it."
              : fr ? "Entrez la largeur à 1 m du sol pour continuer." : "Enter the width 1 m from the floor to continue.",
          avertissement: null,
        };
      // Murs pas parallèles : l'écart est écrit sous la case, dès la saisie (releve-garde-corps.tsx, ecartMurs).
      if (v < B.largeurMm.min) return { manque: null, avertissement: t.gcTropEtroit.replace("{min}", nombre(B.largeurMm.min)) };
      if (v > B.largeurMm.max) return { manque: null, avertissement: t.gcHorsBareme.replace("{l}", nombre(B.largeurMm.max)) };
      // Un écart peu plausible (une faute de frappe, le plus souvent) : on le dit une fois, le second « Suivant » passe.
      return { manque: null, avertissement: texteEcartSuspectGC(cotes, locale) };
    }
    case 3: {
      const v = mm(cotes.allege);
      if (!Number.isFinite(v))
        return {
          manque:
            cotes.allege.trim() !== ""
              ? fr ? "Cette hauteur n'est pas un nombre : corrigez-la." : "This height is not a number: please correct it."
              : fr ? "Entrez la hauteur du sol au bas de la fenêtre pour continuer." : "Enter the height from the floor to the bottom of the window to continue.",
          avertissement: null,
        };
      if (v > B.allegeMm.max)
        return {
          manque: null,
          avertissement: fr
            ? "À cette hauteur, la loi ne demande pas de garde-corps (seulement en dessous de 90 cm)."
            : "At that height the law does not ask for a railing (only below 90 cm).",
        };
      return rien;
    }
    case 4: {
      // Facultative : vide, on passe.
      if (cotes.fenetre.trim() === "") return rien;
      const v = mm(cotes.fenetre);
      if (!Number.isFinite(v))
        return {
          manque: fr
            ? "La hauteur de la fenêtre n'est pas un nombre : corrigez-la ou effacez-la."
            : "The window height is not a number: correct it or clear it.",
          avertissement: null,
        };
      if (v > B.fenetreMm.max) return { manque: null, avertissement: t.gcAEtudier };
      return rien;
    }
    case 5:
      return t.gcEtageOptions.includes(cotes.etage)
        ? rien
        : { manque: fr ? "Touchez « En étage » ou « Au rez-de-chaussée »." : "Tap “Upstairs” or “Ground floor”.", avertissement: null };
    case 6:
      if (cotes.mur === "") return { manque: fr ? "Touchez le type de mur (ou « Je ne sais pas »)." : "Tap the wall type (or “I don't know”).", avertissement: null };
      return murFixationDesCotes(cotes, t.gcMurOptions)
        ? rien
        : { manque: fr ? "Dites quelle pierre : tuffeau, pierre dure ou moellons." : "Tell us which stone: tufa, hard stone or rubble stone.", avertissement: null };
    case 7: {
      // La profondeur du tableau : les tiges de la fixation s'y scellent (« Auboiacier », 07/10).
      const T = BORNES_MUR_GC.tMurMm;
      const v = mm(cotes.tMur ?? "");
      if (!Number.isFinite(v) || v <= 0)
        return {
          manque:
            (cotes.tMur ?? "").trim() !== ""
              ? fr ? "La profondeur n'est pas un nombre : corrigez-la." : "The depth is not a number: please correct it."
              : fr ? "Entrez la profondeur entre la façade et la fenêtre pour continuer." : "Enter the depth between the façade and the window to continue.",
          avertissement: null,
        };
      if (v < T.min || v > T.max)
        return { manque: fr ? `Entre ${nombre(T.min)} et ${nombre(T.max)} mm : vérifiez la mesure.` : `Between ${nombre(T.min)} and ${nombre(T.max)} mm: check the measurement.`, avertissement: null };
      if (murAvecEpaisseurGC(murFixationDesCotes(cotes, t.gcMurOptions)) && (cotes.eMur ?? "").trim() !== "") {
        const E = BORNES_MUR_GC.eMurMm;
        const ep = mm(cotes.eMur ?? "");
        if (!Number.isFinite(ep) || ep < E.min || ep > E.max)
          return {
            manque: fr
              ? `L'épaisseur du mur se compte entre ${nombre(E.min)} et ${nombre(E.max)} mm : corrigez-la, ou effacez-la.`
              : `The wall thickness goes from ${nombre(E.min)} to ${nombre(E.max)} mm: correct it, or clear it.`,
            avertissement: null,
          };
      }
      return rien;
    }
    default:
      return rien;
  }
}
