// Extensions écrites en toutes lettres : les tests (node --test, sans outil
// de construction) importent ce fichier tel quel.
import { BLONDEL_MAX_MM, BLONDEL_MIN_MM, GIRON_CONFORT_MM, HAUTEUR_MARCHE_VISEE_MM } from "./escalier.ts";

/**
 * Les règles d'un escalier de maison, chiffre par chiffre, avec la source de
 * chacun. Le guide « Escalier à limon central : prix, formes et normes »
 * (src/app/[lang]/escalier-limon-central-prix-normes) les lit ici : aucun
 * chiffre de norme n'est tapé dans ses textes.
 *
 * Relu le 07/10/2026 dans les textes eux-mêmes (Légifrance) et dans les
 * deux notes de la profession (UICB, octobre 2020 ; AFEB, guide du NF DTU
 * 36.3, janvier 2016), d'après ~/Documents/Auboiacier chiffrage/
 * norme-escalier-verifie.json.
 *
 * Ce qui n'est PAS ici, exprès : la hauteur du garde-corps de rampe (0,90 m
 * sur la volée, 1 m au palier d'après des fabricants). Le texte de la
 * NF P01-012 (novembre 2024) est payant et n'a pas été lu ; une source
 * de bureau de contrôle dit même que la norme ne traite pas la chute dans
 * l'escalier. Un guide de normes n'écrit jamais « probable » : le guide dit
 * seulement que le garde-corps est dessiné selon la NF P01-012, au devis.
 */

/** D'où vient un chiffre. `url` : une page que chacun peut ouvrir. */
export type SourceNorme = {
  id: "arrete-2015" | "uicb-2020" | "afeb-dtu-36-3" | "afnor-p01-012";
  titre: { fr: string; en: string };
  url: string;
};

export const SOURCES_NORMES_ESCALIER: readonly SourceNorme[] = [
  {
    id: "arrete-2015",
    titre: {
      fr: "Arrêté du 24 décembre 2015 (accessibilité des logements neufs), article 12 — Légifrance",
      en: "French order of 24 December 2015 (accessibility of new homes), article 12 — Légifrance",
    },
    url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000031830909",
  },
  {
    id: "uicb-2020",
    titre: {
      fr: "UICB, « Accessibilité : récapitulatif des exigences applicables aux escaliers en bois », octobre 2020",
      en: "UICB (French timber industry union), summary of the rules for timber stairs, October 2020 (in French)",
    },
    url: "https://www.uiccb.fr/wp-content/uploads/2021/07/Note-Accessibilite-applicable-aux-escaliers-en-bois-Octobre-2020.pdf",
  },
  {
    id: "afeb-dtu-36-3",
    titre: {
      fr: "AFEB, « Escaliers en bois : guide d'application du DTU 36.3 », janvier 2016",
      en: "AFEB, application guide of the French timber stairs code NF DTU 36.3, January 2016 (in French)",
    },
    url: "https://www.uiccb.fr/wp-content/uploads/2018/06/AFEB-Guide-DTU-36-3-Janvier-2016.pdf",
  },
  {
    id: "afnor-p01-012",
    titre: {
      fr: "AFNOR, norme NF P01-012, novembre 2024 (fiche de la norme)",
      en: "AFNOR, French standard NF P01-012, November 2024 (standard page, in French)",
    },
    url: "https://www.boutique.afnor.org/fr-fr/norme/nf-p01012/solutions-techniques-relatives-aux-elements-de-protection-visant-a-limiter-/fa179331/428035",
  },
];

/** Une règle chiffrée et sa source. */
type Regle = { mm: number; source: SourceNorme["id"] };

/** Hauteur de marche dans un logement neuf : 18 cm au plus (arrêté du 24/12/2015, art. 12). */
export const HAUTEUR_MARCHE_MAX: Regle = { mm: 180, source: "arrete-2015" };

/**
 * Écart admis sur la hauteur de CHAQUE marche, en plus ou en moins, par rapport
 * à la hauteur prévue (valeur nominale) : ± 5 mm (NF DTU 36.3 P3, cité par
 * l'UICB, § 7 ; guide AFEB p. 9). Ce n'est pas l'écart entre deux marches, qui
 * peut donc aller jusqu'à 10 mm.
 */
export const TOLERANCE_HAUTEUR_MARCHE: Regle = { mm: 5, source: "uicb-2020" };

/**
 * La première marche, mesurée depuis le sol fini une fois l'escalier en place :
 * de 10 mm de plus à 30 mm de moins que la hauteur prévue (NF DTU 36.3 P1-1,
 * CCT 6.5.1 ; guide AFEB p. 9, relu le 07/10/2026 ; UICB, p. 7).
 */
export const TOLERANCE_PREMIERE_MARCHE = { plusMm: 10, moinsMm: 30, source: "afeb-dtu-36-3" } as const;

/** Giron dans un logement neuf : 24 cm au moins (arrêté du 24/12/2015, art. 12). */
export const GIRON_MIN: Regle = { mm: 240, source: "arrete-2015" };

/**
 * La ligne de foulée, où se mesure le giron : au milieu de la marche quand
 * l'escalier fait 1,20 m de large au plus (NF DTU 36.3 P3, UICB § 2).
 */
export const LIGNE_FOULEE_LARGEUR_MAX: Regle = { mm: 1200, source: "uicb-2020" };

/** Formule de Blondel (2 H + G) en maison individuelle : de 58 à 66 cm (NF DTU 36.3 P3, UICB § 7). */
export const BLONDEL_MAISON = { minMm: 580, maxMm: 660, source: "uicb-2020" } as const;

/** Largeur d'un escalier de logement neuf : 80 cm au moins (arrêté du 24/12/2015, art. 12). */
export const LARGEUR_MIN: Regle = { mm: 800, source: "arrete-2015" };

/** Échappée dans un logement : 1,90 m au moins (NF DTU 36.3, CCT 6.5.2 ; guide AFEB p. 9). */
export const ECHAPPEE_MIN: Regle = { mm: 1900, source: "afeb-dtu-36-3" };

/** La norme du garde-corps, citée avec son numéro et son édition, jamais « NF » seul. */
export const NORME_GARDE_CORPS = { reference: "NF P01-012", annee: 2024, source: "afnor-p01-012" } as const;

/**
 * Ce que vise l'atelier, plus confortable que le minimum : les chiffres de
 * src/lib/escalier.ts (la marche de 17,5 cm, le giron de 28 cm, le pas de
 * Blondel entre 60 et 65 cm), et la largeur que l'atelier conseille.
 */
export const VISEE_ATELIER = {
  hauteurMarcheMm: HAUTEUR_MARCHE_VISEE_MM,
  gironMm: GIRON_CONFORT_MM,
  blondelMinMm: BLONDEL_MIN_MM,
  blondelMaxMm: BLONDEL_MAX_MM,
  largeurConseilleeMm: [800, 900] as const,
} as const;

/**
 * L'escalier de l'exemple : celui du catalogue, « Droit — 13 marches » —
 * 13 marches de bois, 14 hauteurs de marche (le sol de l'étage fait la
 * dernière) à la hauteur visée par l'atelier.
 */
export const HAUTEUR_EXEMPLE_MM = 14 * HAUTEUR_MARCHE_VISEE_MM;
