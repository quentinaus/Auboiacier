/**
 * Le garde-corps de fenêtre, côté public : ce que le navigateur a le droit de
 * savoir, et rien d'autre.
 *
 * Les RÈGLES (hauteur à la norme, nombre de croix, barreaux en partie basse,
 * solidité) et le PRIX viennent de l'outil de plans de l'atelier, extrait
 * tel quel dans src/lib/garde-corps-outil/ : c'est le serveur qui les
 * applique. Le navigateur envoie le relevé du client à /api/prix-garde-corps
 * et reçoit la forme retenue et le prix — jamais un coût.
 *
 * Ce fichier ne contient donc aucune règle recopiée : seulement le contrat
 * de la route (les types), les bornes des champs, la valeur de départ du jour
 * sous le cadre pour le croquis, et de quoi fabriquer et relire l'adresse de
 * la route. Chaque constante est comparée à celle de l'outil par un test
 * (tests/garde-corps.test.ts) : elle ne peut pas diverger en silence.
 *
 * Ce que le client mesure : la largeur entre les tableaux, la hauteur du sol
 * au-dessus de l'appui (l'allège), la hauteur de la fenêtre, et s'il est en
 * étage ou au rez-de-chaussée.
 */

import { DECORS_GC, type AssemblageDecorGC, type FormeDecorGC } from "./garde-corps-decors.genere.ts";

export type { AssemblageDecorGC, FormeDecorGC };

/** Les essences de la main courante (les mêmes identifiants que le catalogue et l'outil). */
export const ESSENCES_GC = ["pin", "hetre", "chene", "noyer"] as const;
export type EssenceGC = (typeof ESSENCES_GC)[number];

/** Le bois sur FER PLAT : la même essence, posée sur un plat de 60 × 10 soudé sur la lisse haute (« chene-plat »). */
export const ESSENCES_PLAT_GC = ["pin-plat", "hetre-plat", "chene-plat", "noyer-plat"] as const;

/**
 * LA MAIN COURANTE que choisit le client (demande de Quentin, 05/10/2026 : « de vrais designs : bois, acier ou fer plat, et la
 * rainure, tout comme dans l'outil »). Quatre TYPES, comme dans l'outil de plans :
 *  - bois RAINURÉ : un carré de bois de 40 × 40, une rainure dessous qui l'emboîte sur la lisse haute (« chene ») ;
 *  - bois SUR FER PLAT : le bois (60 × 45) posé sur un plat de 60 × 10 soudé sur la lisse, qui la raidit (« chene-plat ») ;
 *  - acier PLAT : un plat d'acier de 40 × 8 soudé à plat sur le cadre (« acier ») ;
 *  - acier PROFILÉ : un profilé du commerce de 40 × 10, rainuré, emboîté sur la lisse (« profil »).
 * Pour un bois, l'identifiant dit aussi l'essence. Même vocabulaire que l'outil (mcType, rainure, renfort).
 */
export const MAINS_COURANTES_GC = [...ESSENCES_GC, ...ESSENCES_PLAT_GC, "acier", "profil"] as const;
export type MainCouranteGC = (typeof MAINS_COURANTES_GC)[number];
export type TypeMainCouranteGC = "bois-rainure" | "bois-plat" | "acier-plat" | "acier-profile";

/** Le type et l'essence d'une main courante (null pour l'acier, qui n'a pas d'essence). */
export function lireMainCouranteGC(id: string): { type: TypeMainCouranteGC; essence: EssenceGC | null } | null {
  if (id === "acier") return { type: "acier-plat", essence: null };
  if (id === "profil") return { type: "acier-profile", essence: null };
  if ((ESSENCES_GC as readonly string[]).includes(id)) return { type: "bois-rainure", essence: id as EssenceGC };
  if ((ESSENCES_PLAT_GC as readonly string[]).includes(id)) return { type: "bois-plat", essence: id.slice(0, -5) as EssenceGC };
  return null;
}
/** L'identifiant d'une main courante : un type, et une essence pour le bois. */
export function idMainCouranteGC(type: TypeMainCouranteGC, essence: EssenceGC = "chene"): MainCouranteGC {
  return type === "acier-plat" ? "acier" : type === "acier-profile" ? "profil" : type === "bois-plat" ? (`${essence}-plat` as MainCouranteGC) : essence;
}

/** Les bornes des champs de l'outil, en millimètres (BORNES_GC du moteur). */
export const BORNES_RELEVE_GC = {
  largeurMm: { min: 300, max: 3000 },
  allegeMm: { min: 0, max: 1200 },
  fenetreMm: { min: 0, max: 3000 },
} as const;

/**
 * Murs pas parallèles (décision de Quentin, 05/10) : le client mesure la largeur en bas (à l'appui) et en haut (à 1 m
 * du sol) ; l'atelier fabrique à la plus petite. Au-delà de cet écart, le site conseille la visite de l'atelier.
 */
export const ECART_MURS_GC_MM = 10;
/** Jusqu'à cet écart, rien à dire : avec l'enduit, un mur bouge toujours d'un millimètre ou deux (Quentin, 06/10). */
export const TOLERANCE_MURS_GC_MM = 2;

/** Le jour laissé entre l'appui et le bas du cadre, par défaut dans l'outil (DEFAUTS_GC.jour). */
export const JOUR_GC_MM = 90;

/** En étage, à partir de cette allège, la loi n'impose plus de protection (ALLEGE_LIBRE du moteur). */
export const ALLEGE_SANS_OBLIGATION_MM = 900;

/** La hauteur que la loi demande au haut de la main courante, depuis le sol fini, sans tolérance (HAUT_ETAGE du moteur). */
export const HAUTEUR_LOI_GC_MM = 1000;

/**
 * LES BOULES DE LA NORME (NF P01-012), telles que l'outil les contrôle : une boule de SPHERE_GC_MM ne doit passer dans
 * aucun vide qui commence sous Z_SPHERE_GC_MM du sol ; au-dessus, une boule de SPHERE_HAUT_GC_MM (SPHERE, SPHERE_HAUT,
 * Z_SPHERE du moteur). Le jour sous le cadre reste, lui aussi, plus petit que SPHERE_GC_MM.
 */
export const SPHERE_GC_MM = 110;
export const SPHERE_HAUT_GC_MM = 180;
export const Z_SPHERE_GC_MM = 800;

/** Sous cette hauteur du sol, rien sur quoi grimper : des barreaux verticaux ferment le bas d'un cadre qui commence plus bas (Z_ESCALADE du moteur). */
export const Z_ESCALADE_GC_MM = 600;

/**
 * LA HAUTEUR DE LA MAIN COURANTE, DEPUIS LE SOL : elle ne bouge jamais (décision de Quentin, 04/10/2026).
 * La loi demande 1 000 mm au moins ; l'atelier vise 1 025 (HAUT_ETAGE + CIBLE_MARGE du moteur), en étage
 * comme au rez-de-chaussée. C'est le garde-corps qui grandit ou rapetisse avec le bas de la fenêtre.
 */
export const MAIN_COURANTE_MM = 1025;

/** Un garde-corps à croix ne se fabrique pas plus bas (MINI_GC du moteur) : en dessous, une barre d'appui. */
export const MINI_GC_MM = 200;

/** Un cadre à barreaux seuls, main courante comprise, peut être plus bas (MINI_SEULS du moteur) : il n'y a pas de croix à aplatir. */
export const MINI_SEULS_GC_MM = 120;
/** La marge de sécurité de l'atelier sur la boule de la norme (MARGE_BOULE de l'outil) : un vide n'est vendu que s'il fait 3 mm de moins (décision de Quentin, 05/10/2026). */
export const MARGE_BOULE_GC_MM = 3;
/** Le plus petit jour sous le cadre (JOUR_MINI du moteur) : l'appui n'est jamais parfaitement plan. */
export const JOUR_MINI_GC_MM = 40;

/**
 * LE JOUR SOUS LE CADRE POUR CE BAS DE FENÊTRE (demande de Quentin, 05/10/2026 : « à 760 mm il faut un garde-corps, pas une
 * barre d'appui »). Le jour normal est de 90 mm. Si, avec lui, le garde-corps serait plus bas que le minimum d'un cadre à croix
 * (200 mm), on le réduit — jamais sous 40 mm — pour que la main courante reste pile à sa hauteur : à 760 mm du sol, 65 mm.
 * Quand même 40 mm ne suffit pas pour des croix, on cherche pour un cadre à barreaux seuls (120 mm au minimum).
 * Hors de ces cas, le jour normal. C'est la même règle que le « jour automatique » de l'outil de plans.
 */
export function jourGC(allegeMm: number, seuls = false): number {
  // Un cadre à barreaux seuls se juge sur son propre minimum (120 mm), comme la case « barreaux seuls » de l'outil de plans :
  // sa main courante arrive à la hauteur sans qu'on réduise le jour (à 760 mm du sol, 90 et non 65).
  for (const mini of seuls ? [MINI_SEULS_GC_MM] : [MINI_GC_MM, MINI_SEULS_GC_MM]) {
    const place = MAIN_COURANTE_MM - allegeMm - mini;
    if (place >= JOUR_GC_MM) return JOUR_GC_MM;
    if (place >= JOUR_MINI_GC_MM) return place;
  }
  return JOUR_GC_MM;
}

/** L'épaisseur d'une barre d'appui (BARRE_APPUI du moteur). */
export const BARRE_APPUI_MM = 40;

/**
 * Ce que la règle de l'outil donne pour un bas de fenêtre (geomGC : hNorme, appui) : un garde-corps dont la
 * main courante arrive pile à MAIN_COURANTE_MM, une barre d'appui, ou rien. Le croquis s'en sert pour suivre
 * le curseur EN DIRECT, sans attendre le serveur ; un test vérifie, millimètre par millimètre, que c'est bien
 * la règle du moteur. Le prix, les croix et la norme, eux, ne viennent que du serveur.
 */
export function formeGC(allegeMm: number): { mode: "garde-corps" | "barre" | "aucun"; hauteurMm: number; jourMm: number } {
  const jour = jourGC(allegeMm);
  const manque = Math.ceil(MAIN_COURANTE_MM - allegeMm - jour);
  // Au moins le cadre le plus bas (barreaux seuls) ; en dessous de 200 mm, c'est lui seul qui existe.
  if (manque >= MINI_SEULS_GC_MM) return { mode: "garde-corps", hauteurMm: manque, jourMm: jour };
  if (MAIN_COURANTE_MM - allegeMm >= BARRE_APPUI_MM) return { mode: "barre", hauteurMm: BARRE_APPUI_MM, jourMm: MAIN_COURANTE_MM - allegeMm - BARRE_APPUI_MM };
  return { mode: "aucun", hauteurMm: 0, jourMm: 0 };
}

/**
 * Les bas de fenêtre où la forme change, lus dans formeGC (la règle de l'outil) : à partir de `mainSeuleMm`, plus aucun
 * cadre ne tient sous la main courante (une main courante seule, sur devis) ; à partir de `rienMm`, il n'y a rien à
 * poser. La page des normes (/garde-corps-fenetre-normes) les cite au lieu de les recopier.
 */
export function seuilsFormeGC(): { mainSeuleMm: number; rienMm: number } {
  const { min, max } = BORNES_RELEVE_GC.allegeMm;
  let mainSeuleMm = max + 1;
  let rienMm = max + 1;
  for (let allegeMm = min; allegeMm <= max; allegeMm++) {
    const { mode } = formeGC(allegeMm);
    if (mode !== "garde-corps" && mainSeuleMm > max) mainSeuleMm = allegeMm;
    if (mode === "aucun") {
      rienMm = allegeMm;
      break;
    }
  }
  return { mainSeuleMm, rienMm };
}

/** Ce que le client relève à sa fenêtre, en millimètres entiers. */
export type ReleveGC = {
  /** Largeur entre les tableaux (B dans l'outil). */
  largeurMm: number;
  /** Du sol fini au-dessus de l'appui (A dans l'outil). */
  allegeMm: number;
  /** En étage (true) ou au rez-de-chaussée (false). */
  enEtage: boolean;
  /** De l'appui au haut de l'ouverture ; 0 = inconnue (Hf dans l'outil). */
  fenetreMm: number;
  /**
   * Le DÉCOR À VOLUTES choisi (bibliothèque de styles de l'outil, 06/10/2026), son identifiant (idDecorGC, lu par
   * lireDecorGC) : « frise.S.bouton.colliers.carre.aucune.0 ». Il remplace les croix : le cadre est celui des barreaux
   * seuls, le modèle (ci-dessous) est alors ignoré. Absent : pas de décor. Le serveur le revérifie toujours sur le dessin
   * de l'outil : un décor que la norme refuse ne donne ni prix ni commande.
   */
  decor?: string;
  /**
   * Le modèle choisi par le client parmi ceux que la norme permet pour sa
   * fenêtre : « carré-croix », par exemple « 16-3 » ; suivi de « -b » quand
   * des barreaux droits ferment le bas (« 16-5-b »). Absent : celui que
   * l'outil retient de lui-même. C'est le DESSIN qui est choisi (croix,
   * barreaux) : le carré de l'identifiant est indicatif, le serveur retient
   * toujours le premier carré de l'atelier qui passe la norme. Il revérifie
   * toujours le dessin : un modèle forgé ne donne ni prix ni commande.
   */
  modele?: string;
};

/**
 * Un modèle : la section du carré (12 à 20), un tiret, le nombre de croix (1 à 12) ; puis « -b » (barreaux droits
 * en bas) ou « -s » (barreaux seuls : des barreaux verticaux et rien d'autre, toujours « 1 » croix dans l'identifiant), et « -t » (une traverse au milieu de chaque croix : la solution de l'outil quand le vide entre les
 * barres est trop grand).
 */
const MODELE_GC = /^(12|14|16|18|20)-(1[0-2]|[1-9])(-b|-s)?(-t)?$/;

/** Lit « 16-3 », « 16-2-t », « 16-5-b-t » ; null si ce n'est pas un modèle. */
export function lireModeleGC(m: unknown): { carre: number; croix: number; barreauxBas: boolean; seuls: boolean; traverse: boolean } | null {
  const r = typeof m === "string" ? MODELE_GC.exec(m) : null;
  // « -s » : des barreaux seuls, sans croix ni traverse (« 16-1-s » : un seul identifiant, pas de doublons).
  if (!r || (r[3] === "-s" && (r[4] !== undefined || r[2] !== "1"))) return null;
  return { carre: Number(r[1]), croix: Number(r[2]), barreauxBas: r[3] === "-b", seuls: r[3] === "-s", traverse: r[4] !== undefined };
}

/** L'identifiant d'un dessin (le carré est indicatif : le serveur le choisit). */
export function idModeleGC(carre: number, croix: number, barreauxBas: boolean, traverse: boolean, seuls = false): string {
  return `${carre}-${croix}${seuls ? "-s" : barreauxBas ? "-b" : ""}${traverse ? "-t" : ""}`;
}

/** Le dessin que montre une réponse aux normes (sans choix du client : le moins cher à croix) — celui qui irait au panier. */
export function modeleAfficheGC(r: { carre: number; croix: number; soubassementMm: number; traverse: boolean; seuls: boolean }): string {
  return idModeleGC(r.carre, r.croix, r.soubassementMm > 0, r.traverse, r.seuls);
}

/**
 * LE DÉCOR À VOLUTES (demande de Quentin, 06/10/2026) : un assemblage de la bibliothèque de styles de l'outil (volutes entre
 * les barreaux, frise, anneaux, grille, cœurs, médaillon, applique), une forme permise pour cet assemblage, et les finitions.
 * Les listes viennent de l'outil (garde-corps-decors.genere.ts, fabriqué par l'extraction) : rien n'est recopié ici.
 * Par défaut, pas de décor ; le site ne le choisit jamais à la place du client.
 */
export type ChoixDecorGC = {
  assemblage: AssemblageDecorGC;
  forme: FormeDecorGC;
  bouts: "bouton" | "effile" | "droit";
  liaison: "colliers" | "soudure";
  barreaux: "carre" | "torsade" | "bagues";
  friseBasse: "aucune" | "postes";
  /** Des rehauts dorés à la feuille (boutons, colliers, bagues). */
  dore: boolean;
};

/** L'identifiant d'un décor, tel qu'il voyage (adresse, panier, commande) : « entre.C.bouton.colliers.carre.aucune.0 ». */
export function idDecorGC(c: ChoixDecorGC): string {
  return [c.assemblage, c.forme, c.bouts, c.liaison, c.barreaux, c.friseBasse, c.dore ? "1" : "0"].join(".");
}

/** Le plus long identifiant possible est bien plus court : au-delà, ce n'est pas un décor. */
const DECOR_MAX_SIGNES = 64;

/**
 * Relit un identifiant de décor : chaque valeur doit être dans les listes de l'outil, la forme permise pour cet assemblage,
 * les rehauts « 0 » ou « 1 ». Tout le reste (un objet, une valeur inconnue, un morceau de trop ou en moins) : null.
 */
export function lireDecorGC(t: unknown): ChoixDecorGC | null {
  if (typeof t !== "string" || t.length > DECOR_MAX_SIGNES) return null;
  const morceaux = t.split(".");
  if (morceaux.length !== 7) return null;
  const [assemblage, forme, bouts, liaison, barreaux, friseBasse, dore] = morceaux;
  const dans = <T extends string>(liste: readonly { id: T }[], x: string): x is T => liste.some((o) => o.id === x);
  const a = DECORS_GC.assemblages.find((o) => o.id === assemblage)?.id;
  if (!a || !(DECORS_GC.formes[a] as readonly string[]).includes(forme)) return null;
  if (!dans(DECORS_GC.bouts, bouts) || !dans(DECORS_GC.liaisons, liaison) || !dans(DECORS_GC.barreaux, barreaux) || !dans(DECORS_GC.frisesBasses, friseBasse)) return null;
  if (dore !== "0" && dore !== "1") return null;
  return { assemblage: a, forme: forme as FormeDecorGC, bouts, liaison, barreaux, friseBasse, dore: dore === "1" };
}

/**
 * Le décor d'un assemblage avec les finitions de départ de l'outil (les premières de ses listes : bouts effilés à bouton,
 * colliers, barreaux carrés lisses, sans frise basse, sans dorure) et sa première forme permise.
 */
export function decorParDefautGC(assemblage: AssemblageDecorGC): ChoixDecorGC {
  const formes = DECORS_GC.formes[assemblage];
  if (!formes?.length) throw new RangeError(`décor inconnu : ${assemblage}`);
  return {
    assemblage,
    forme: formes[0],
    bouts: DECORS_GC.bouts[0].id,
    liaison: DECORS_GC.liaisons[0].id,
    barreaux: DECORS_GC.barreaux[0].id,
    friseBasse: DECORS_GC.frisesBasses[0].id,
    dore: false,
  };
}

/**
 * Le nom de la pièce quand elle porte un décor (panier, commande, devis) : en français, celui du devis de l'outil
 * (dsRemplissageGC : « Garde-corps forgé à volutes ») ; un test le compare.
 */
export const NOM_GC_DECOR: Readonly<Record<"fr" | "en", string>> = Object.freeze({ fr: "Garde-corps forgé à volutes", en: "Wrought Scroll Window Railing" });

/**
 * Le nom ANGLAIS d'un décor, pour le panier, la commande et le devis en anglais. Le nom français est celui de l'outil
 * (nomDecorGC, dans R.decorNom) ; celui-ci suit la même construction (assemblage, puis la forme), mot pour mot.
 */
export function nomDecorAnglaisGC(c: Pick<ChoixDecorGC, "assemblage" | "forme">): string {
  const pluriel: Record<FormeDecorGC, string> = { C: "C-scrolls", S: "S-scrolls", J: "crooks", coeur: "hearts", doubleC: "double C-scrolls", poste: "wave scrolls", anneau: "rings" };
  const seul: Record<FormeDecorGC, string> = { C: "C-scroll", S: "S-scroll", J: "two crooks as a lyre", coeur: "heart", doubleC: "double C-scroll", poste: "wave scroll", anneau: "ring" };
  const f = pluriel[c.forme] ?? "scrolls";
  const F = f.charAt(0).toUpperCase() + f.slice(1);
  switch (c.assemblage) {
    case "entre": return `${F} between the bars`;
    case "frise": return c.forme === "poste" ? "Wave-scroll frieze" : `Frieze of ${f}`;
    case "anneaux": return "Frieze of rings (Directoire)";
    case "hauteur": return `Grille of ${f}`;
    case "coeurs": return "Forged hearts";
    case "medaillon": return `Medallion: ${seul[c.forme] ?? f}`;
    case "applique": return `Applied ${f}`;
    default: return "Scrollwork";
  }
}

/**
 * Les finitions d'un décor, en mots, dans la langue du client : les bouts, l'assemblage des volutes, les barreaux, la frise
 * basse et les rehauts dorés. Le libellé de commande et le devis les portent : l'atelier doit lire exactement quoi fabriquer.
 */
export function finitionsDecorGC(c: ChoixDecorGC, langue: "fr" | "en" = "fr"): string[] {
  const fr = langue === "fr";
  const bouts = { bouton: fr ? "bouts effilés à bouton" : "tapered ends with buttons", effile: fr ? "bouts effilés" : "tapered ends", droit: fr ? "bouts coupés droits" : "square-cut ends" }[c.bouts];
  const liaison = c.liaison === "colliers" ? (fr ? "colliers" : "forged collars") : fr ? "volutes soudées" : "welded scrolls";
  const barreaux = { carre: fr ? "barreaux carrés lisses" : "plain square bars", torsade: fr ? "barreaux torsadés" : "twisted bars", bagues: fr ? "barreaux à bagues" : "bars with rings" }[c.barreaux];
  return [
    bouts,
    liaison,
    barreaux,
    c.friseBasse === "postes" ? (fr ? "frise basse de postes" : "lower wave-scroll frieze") : null,
    c.dore ? (fr ? "rehauts dorés" : "gilded highlights") : null,
  ].filter((x): x is string => Boolean(x));
}

/**
 * Les rosaces du catalogue (products.ts, « fabrics ») et leur DIAMÈTRE en mm. Il compte pour la norme : la rosace bouche
 * le centre des croix, une rosace plus petite laisse un vide plus grand (la « acier » de Ø85), et SANS rosace (Ø0, demande de
 * Quentin du 05/10/2026) le vide est le plus grand : moins de modèles passent la norme. Le grand médaillon de Ø170 a été retiré
 * (« trop gros »). Le calcul de l'outil prend le diamètre de la rosace CHOISIE ; un test relie ces diamètres aux libellés du catalogue.
 */
export const ROSACE_MM_GC: Readonly<Record<string, number>> = Object.freeze({ fleur: 100, fonte: 100, acier: 85, sans: 0 });
/** Les diamètres que le moteur accepte (tout autre est refusé). */
export const ROSACES_MM_GC: readonly number[] = Object.freeze([0, 85, 100]);
export const ROSACE_DEFAUT_GC = "fleur";
/** Le diamètre de la rosace d'un identifiant d'option (celui de la fleur si l'identifiant est absent ou inconnu). */
export const diametreRosaceGC = (id: string | undefined): number => (id !== undefined && Object.hasOwn(ROSACE_MM_GC, id) ? ROSACE_MM_GC[id] : ROSACE_MM_GC[ROSACE_DEFAUT_GC]);

/** Pourquoi le serveur ne donne pas de prix pour un relevé. */
export type RaisonSansPrixGC = "a-etudier" | "fenetre-trop-basse" | "barre-appui" | "sans-garde-corps";
export const RAISONS_SANS_PRIX_GC: readonly RaisonSansPrixGC[] = ["a-etudier", "fenetre-trop-basse", "barre-appui", "sans-garde-corps"];

/** Un vide du cadre, tel que l'outil le contrôle : le plus grand cercle qui passe entre les barres. */
export type RondGC = {
  /** Centre du cercle, en mm depuis le coin bas-gauche du cadre (le haut est vers le haut). */
  x: number;
  y: number;
  /** Diamètre du cercle, en mm. */
  d: number;
  /** Ce vide respecte-t-il la norme (une boule de la taille limite ne passe pas) ? Rond vert si oui, rouge sinon. */
  ok: boolean;
};

/**
 * Pourquoi un modèle n'est pas aux normes avec une fenêtre : le rond rouge (un vide trop grand) et les ronds
 * verts (les vides qui conviennent), comme dans l'outil de plans. Sert à DESSINER l'explication ; le calcul reste
 * celui du serveur.
 */
export type TrousGC = {
  /** Le cadre, en mm : sa largeur et sa hauteur (le repère des ronds). */
  cadreMm: { l: number; h: number };
  /** Le plus grand vide, en mm. */
  plusGrandMm: number;
  /** La boule qui ne doit pas passer à cet endroit, en mm (110, ou 180 en partie haute). */
  limiteMm: number;
  ronds: RondGC[];
};

/** Un modèle conforme proposé au client, tel que le serveur le donne : jamais un coût. */
export type ModeleGC = {
  /** « carré-croix », à renvoyer tel quel pour le choisir. */
  id: string;
  /** Ce dessin passe-t-il la norme pour CETTE fenêtre ? Sinon : montré au catalogue, mais pas vendu (prix 0). */
  conforme: boolean;
  /**
   * Pourquoi ce dessin ne va pas AVEC CETTE FENÊTRE (vide entre les barres trop grand, lisse pas assez
   * rigide sur cette largeur…) : le modèle n'est pas en cause, c'est l'association des deux. Vide s'il convient.
   */
  raisons: CodeAlerteGC[];
  croix: number;
  carre: number;
  /** Hauteur des barreaux droits en partie basse ; 0 : aucun. */
  soubassementMm: number;
  /** Une traverse au milieu de chaque croix. */
  traverse: boolean;
  /** Des barreaux verticaux et rien d'autre (modèle « -s »). */
  seuls: boolean;
  /**
   * La rosace avec laquelle ce modèle est calculé et chiffré : celle que le client a choisie quand elle suffit, sinon la plus
   * petite plus grande qui permet ce dessin (la fleur Ø100 laisse des vides plus petits que le Ø85 ou que l'absence de rosace). Vide pour des
   * barreaux seuls, qui n'ont pas de rosace. Choisir le modèle applique aussi cette rosace.
   */
  rosace: string;
  /** Les vides de ce dessin avec CETTE fenêtre, quand l'un est trop grand (modèle hors norme) ; sinon null. */
  trous: TrousGC | null;
  /**
   * Fenêtre large : la lisse haute est renforcée par un fer plat soudé dessus, caché sous une main courante
   * plus large (décision de Quentin, 04/10/2026). C'est le serveur qui le décide, jamais le client.
   */
  renfort: boolean;
  /** Fenêtre large et garde-corps bas : le nombre de pattes scellées dans l'appui (0 à 4, 05/10/2026). Décidé par le serveur. */
  patte: number;
  /** Hauteur du garde-corps dans ce modèle, main courante comprise (pour le dessiner à l'échelle). */
  hauteurMm: number;
  /** Le prix d'UNE pièce dans ce modèle, options comprises. */
  prix: number;
  kg: number;
};

/**
 * Combien de modèles la route propose au plus : 12 croix × (croix seules, traverse, barreaux, barreaux + traverse).
 * (Au-delà de 6 croix, seuls les modèles aux normes sont montrés.)
 */
export const MODELES_GC_MAX = 48;

/**
 * Le relevé qui fait le « à partir de » du garde-corps : le plus petit que l'outil fabrique — la fenêtre la plus étroite
 * (300 mm), en étage, avec le bas de fenêtre le plus haut où il faut encore des croix de moins de 200 mm (786 mm : même avec
 * un jour de 40, un cadre à croix ne tiendrait plus), donc le premier du CADRE BAS À BARREAUX (120 mm au minimum), le moins
 * cher de tous : 260 € contre 280 € avec des croix à 735 mm. Plus haut (866 mm), la loi n'impose plus de garde-corps complet
 * (« main courante seule » sur devis). Le prix annoncé est celui de l'outil pour ce relevé, dans la main courante la moins
 * chère : aucun garde-corps ne coûte moins (un test le vérifie sur toutes les allèges). À AJUSTER par Quentin s'il préfère
 * annoncer une fenêtre courante.
 */
export const RELEVE_DEPART_GC: ReleveGC = { largeurMm: BORNES_RELEVE_GC.largeurMm.min, allegeMm: MAIN_COURANTE_MM - JOUR_MINI_GC_MM - MINI_GC_MM + 1, enEtage: true, fenetreMm: 0 };

/** Les alertes de l'outil, réduites à un mot-clé que le site sait traduire. */
export type CodeAlerteGC =
  | "barre-appui"
  | "trous"
  | "solidite"
  | "fenetre"
  | "hauteur"
  | "soubassement"
  | "fixation"
  | "trop-petit"
  | "jour"
  | "jeu"
  | "main-courante"
  | "charge-verticale"
  /** Le décor laisse un appui pour le pied entre 100 et 600 mm du sol (ou la traverse du milieu y est). */
  | "escalade"
  | "autre";

/** Le prix d'une pièce pour chaque main courante qui convient à la fenêtre (les autres sont absentes). */
export type MainsPrixGC = Partial<Record<MainCouranteGC, number>>;

/**
 * Un trait du décor à volutes, tel que l'outil le dessine (R.vues.face, les primitives qui portent un rôle) : en mm depuis le
 * coin bas-gauche du CADRE (le même repère que TrousGC.cadreMm), le haut vers le haut. « fer » : une volute, une lisse, un
 * barreau ; « collier » : un collier ou une bague ; « or » : un rehaut doré ; « vrille » : le trait clair d'une torsade.
 */
export type DecorTraitGC =
  | { t: "poly"; pts: [number, number][]; role: "fer" | "collier" | "or" | "vrille"; ouvert?: boolean }
  | { t: "cercle"; c: [number, number]; r: number; role: "fer" | "or" };

/** Le décor de la réponse : de quoi le nommer et le dessiner sur le croquis, jamais un coût. */
export type DecorReponseGC = {
  /** L'identifiant (idDecorGC) du décor calculé. */
  id: string;
  /** Son nom, celui de l'outil : « Frise de volutes en S ». */
  nom: string;
  /** La frise basse demandée a été retirée par l'outil : au ras du sol, ses vagues feraient des marches (NF P01-012). */
  friseRetiree: boolean;
  /** Le cadre, en mm (le repère des traits). */
  cadreMm: { l: number; h: number };
  traits: DecorTraitGC[];
};

/** Le prix d'un assemblage de décor pour cette fenêtre (avec les finitions demandées) ; non conforme : prix 0. */
export type PrixDecorGC = { id: string; nom: string; prix: number; conforme: boolean };

/** Au plus autant de nombres dans les traits d'un décor (le serveur allège les traits pour rester dessous). */
export const DECOR_NOMBRES_MAX = 20000;

/** Ce que rend /api/prix-garde-corps : le prix et la forme retenue, JAMAIS un coût. */
export type ReponsePrixGC =
  | {
      ok: true;
      conforme: true;
      /** Le prix d'UNE pièce, options comprises (bois, teinte, rosace, remplissage), en euros. */
      prix: number;
      /** La remise sur la quantité demandée (0 ou négative) : frais fixes comptés une fois. */
      remise: number;
      /** Hauteur du garde-corps, main courante comprise. */
      hauteurMm: number;
      /** Hauteur de la main courante au-dessus du sol. */
      mainCouranteMm: number;
      /** Jour entre l'appui et le bas du cadre. */
      jourMm: number;
      /** Nombre de croix de Saint-André. */
      croix: number;
      /** Section du carré d'acier plein, en millimètres. */
      carre: number;
      /** La hauteur des barreaux droits en partie basse (le cadre commence sous 600 mm du sol) ; 0 : aucun. */
      soubassementMm: number;
      /** Une traverse au milieu de chaque croix. */
      traverse: boolean;
      /** Des barreaux sur toute la hauteur (en bas et dans chaque croix). */
      seuls: boolean;
      /** Fenêtre large : un fer plat caché sous la main courante raidit la lisse haute. */
      renfort: boolean;
      /** Le nombre de pattes scellées dans l'appui (0 à 4) : les vis des tableaux seules seraient trop tirées. */
      patte: number;
      /** Poids d'une pièce, arrondi au kilo. */
      kg: number;
      /** En étage avec une allège sous 900 mm : la loi impose la protection. */
      obligatoire: boolean;
      /** Les modèles que la norme permet pour cette fenêtre (au plus MODELES_GC_MAX), celui-ci compris. */
      modeles: ModeleGC[];
      /** Le prix d'UNE pièce avec chaque main courante ; une main courante absente de la liste ne convient pas à cette fenêtre. */
      mains: MainsPrixGC;
      /** Avec un décor à volutes : son nom et son dessin (le prix ci-dessus est celui du garde-corps avec ce décor). */
      decor?: DecorReponseGC;
      /** Demandé (decors=1) : le prix de chaque assemblage de décor pour cette fenêtre. */
      decors?: PrixDecorGC[];
    }
  | {
      ok: false;
      conforme: false;
      /**
       * « à étudier » : rien ne passe la norme avec les croix du modèle ; « fenêtre trop basse » : ne tient
       * pas dans l'ouverture ; « barre d'appui » : le bas de la fenêtre est haut, il manque moins que la
       * hauteur du plus petit garde-corps pour arriver à la norme — une simple barre suffit (sur devis) ;
       * « sans garde-corps » : le bas de la fenêtre est déjà à la hauteur de la norme.
       */
      raison: RaisonSansPrixGC;
      hauteurMm: number;
      mainCouranteMm: number;
      jourMm: number;
      obligatoire: boolean;
      /** Ce qui bloque. */
      alertes: CodeAlerteGC[];
      /** Le catalogue des dessins, tous hors norme pour cette fenêtre (ou vide : version ancienne du serveur). */
      modeles: ModeleGC[];
      /** Le prix d'UNE pièce avec chaque main courante qui convient (le client peut en changer pour sortir de l'impasse). */
      mains: MainsPrixGC;
      /** Demandé (decors=1) : le prix de chaque assemblage de décor, pour en choisir un qui passe. */
      decors?: PrixDecorGC[];
    };

/**
 * L'APERÇU DU PLAN (demande de Quentin, 05/10/2026) : le « Plan A3 » de l'outil de plans de l'atelier, dessiné par l'outil
 * lui-même pour la configuration du client — jamais redessiné par le site. Ni liste de débit, ni détail de fixation, ni
 * perçage : de quoi voir à quoi ressemblera le plan de sa fenêtre, pas de quoi le fabriquer. `svg` est le SVG de l'outil.
 */
export type PlanApercuGC = {
  /** La feuille A3 en SVG (420 × 297). */
  svg: string;
  largeurMm: number;
  hauteurMm: number;
  croix: number;
  carre: number;
  seuls: boolean;
  traverse: boolean;
  /** Le plan dessine un décor à volutes (celui du relevé). */
  decor?: boolean;
};

/**
 * Relit la réponse de /api/plan-garde-corps : null au moindre doute. Le SVG ne s'affiche que dans une balise <img> (un SVG
 * « image » n'exécute rien), et on refuse d'avance tout ce qui n'est pas un dessin.
 */
export function lirePlanApercuGC(json: unknown): PlanApercuGC | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.svg !== "string" || !o.svg.startsWith("<svg ") || o.svg.length > 600_000) return null;
  if (/<(?!\/?(?:svg|rect|line|polygon|polyline|circle|text|tspan|g)[\s>/])/i.test(o.svg) || /\bon\w+\s*=|javascript:|href\s*=/i.test(o.svg)) return null;
  const entier = (x: unknown) => typeof x === "number" && Number.isInteger(x) && x >= 0;
  if (!entier(o.largeurMm) || !entier(o.hauteurMm) || !entier(o.croix) || !entier(o.carre) || typeof o.seuls !== "boolean" || typeof o.traverse !== "boolean") return null;
  if (o.decor !== undefined && typeof o.decor !== "boolean") return null;
  return { svg: o.svg, largeurMm: o.largeurMm as number, hauteurMm: o.hauteurMm as number, croix: o.croix as number, carre: o.carre as number, seuls: o.seuls, traverse: o.traverse, ...(o.decor === true ? { decor: true } : {}) };
}

/** Les options d'une pièce, telles que la fiche les envoie. */
export type OptionsGC = {
  woodId: string;
  metalId?: string;
  fabricId?: string;
  remplissageId?: string;
  quantite?: number;
  /** Demander aussi le prix de chaque assemblage de décor (PrixDecorGC). */
  decors?: boolean;
};

/** Le relevé est-il dans les bornes des champs de l'outil ? */
export function releveDansLesBornes(r: ReleveGC): boolean {
  const dans = (n: number, b: { min: number; max: number }) => Number.isInteger(n) && n >= b.min && n <= b.max;
  return (
    dans(r.largeurMm, BORNES_RELEVE_GC.largeurMm) &&
    dans(r.allegeMm, BORNES_RELEVE_GC.allegeMm) &&
    dans(r.fenetreMm, BORNES_RELEVE_GC.fenetreMm) &&
    typeof r.enEtage === "boolean" &&
    (r.modele === undefined || lireModeleGC(r.modele) !== null) &&
    (r.decor === undefined || lireDecorGC(r.decor) !== null)
  );
}

/** L'adresse de la route pour ce relevé et ces options : ?l=1180&allege=650&etage=1&fenetre=1400&wood=chene… */
export function parametresPrixGC(r: ReleveGC, o: OptionsGC): URLSearchParams {
  const p = new URLSearchParams({
    l: String(r.largeurMm),
    allege: String(r.allegeMm),
    etage: r.enEtage ? "1" : "0",
    fenetre: String(r.fenetreMm),
    wood: o.woodId,
  });
  if (o.metalId) p.set("metal", o.metalId);
  if (o.fabricId) p.set("fabric", o.fabricId);
  if (o.remplissageId) p.set("remplissage", o.remplissageId);
  if (o.quantite && o.quantite > 1) p.set("qty", String(o.quantite));
  if (r.modele) p.set("modele", r.modele);
  if (r.decor) p.set("decor", r.decor);
  if (o.decors) p.set("decors", "1");
  return p;
}

/** Relit les vides d'un modèle : null s'il n'y en a pas, undefined si le format est mauvais. */
function lireTrousGC(brut: unknown): TrousGC | null | undefined {
  if (brut === null || brut === undefined) return null;
  if (typeof brut !== "object") return undefined;
  const o = brut as Record<string, unknown>;
  const nb = (x: unknown, min = 0) => typeof x === "number" && Number.isFinite(x) && x >= min && x <= 100000;
  const cadre = o.cadreMm as Record<string, unknown> | null;
  if (!cadre || typeof cadre !== "object" || !nb(cadre.l, 1) || !nb(cadre.h, 1) || typeof o.plusGrandMm !== "number" || !Number.isFinite(o.plusGrandMm) || !nb(o.limiteMm, 1) || !Array.isArray(o.ronds) || o.ronds.length > 12) return undefined;
  const ronds: RondGC[] = [];
  for (const r of o.ronds) {
    const x = r as Record<string, unknown> | null;
    if (!x || typeof x !== "object" || !nb(x.x) || typeof x.ok !== "boolean" || typeof x.d !== "number" || !Number.isFinite(x.d)) return undefined;
    // Un vide bouché par la rosace (diamètre nul ou négatif) n'a rien à montrer : on l'ignore, sans rejeter toute la réponse.
    if (x.d < 1) continue;
    if (!nb(x.y) || !nb(x.d, 1)) return undefined;
    ronds.push({ x: x.x as number, y: x.y as number, d: x.d as number, ok: x.ok });
  }
  return { cadreMm: { l: cadre.l as number, h: cadre.h as number }, plusGrandMm: Math.max(0, o.plusGrandMm as number), limiteMm: o.limiteMm as number, ronds };
}

/** Le nombre de pattes lu dans une réponse : un entier de 0 à 4, sinon 0. */
const nbPattesLu = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 4 ? x : 0);

const CODES: readonly CodeAlerteGC[] = ["barre-appui", "trous", "solidite", "fenetre", "hauteur", "soubassement", "fixation", "trop-petit", "jour", "jeu", "main-courante", "charge-verticale", "escalade", "autre"];

const ROLES_POLY: readonly string[] = ["fer", "collier", "or", "vrille"];
const ROLES_CERCLE: readonly string[] = ["fer", "or"];

/** Relit le décor d'une réponse : undefined s'il n'y en a pas, null si le format est mauvais (alors toute la réponse l'est). */
function lireDecorReponseGC(brut: unknown): DecorReponseGC | undefined | null {
  if (brut === undefined) return undefined;
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  const cadre = o.cadreMm as Record<string, unknown> | null;
  const nb = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
  if (!lireDecorGC(o.id) || typeof o.nom !== "string" || !o.nom || o.nom.length > 120 || typeof o.friseRetiree !== "boolean") return null;
  if (!cadre || typeof cadre !== "object" || !nb(cadre.l, 1, 100000) || !nb(cadre.h, 1, 100000) || !Array.isArray(o.traits)) return null;
  // Les traits restent près du cadre (un bouton déborde un peu) : au-delà, ce n'est pas un dessin du décor.
  const l = cadre.l as number, h = cadre.h as number;
  const point = (p: unknown) => Array.isArray(p) && p.length === 2 && nb(p[0], -l, 2 * l) && nb(p[1], -h, 2 * h);
  let nombres = 0;
  const traits: DecorTraitGC[] = [];
  for (const x of o.traits) {
    const t = x as Record<string, unknown> | null;
    if (!t || typeof t !== "object") return null;
    if (t.t === "poly") {
      if (!ROLES_POLY.includes(t.role as string) || !Array.isArray(t.pts) || t.pts.length < 2 || !t.pts.every(point) || (t.ouvert !== undefined && typeof t.ouvert !== "boolean")) return null;
      nombres += 2 * t.pts.length;
      traits.push({ t: "poly", pts: (t.pts as [number, number][]).map(([a, b]) => [a, b]), role: t.role as "fer", ...(t.ouvert === true ? { ouvert: true } : {}) });
    } else if (t.t === "cercle") {
      if (!ROLES_CERCLE.includes(t.role as string) || !point(t.c) || !nb(t.r, 0.1, 1000)) return null;
      nombres += 3;
      const [a, b] = t.c as [number, number];
      traits.push({ t: "cercle", c: [a, b], r: t.r as number, role: t.role as "fer" });
    } else return null;
    if (nombres > DECOR_NOMBRES_MAX) return null;
  }
  return { id: o.id as string, nom: o.nom, friseRetiree: o.friseRetiree, cadreMm: { l, h }, traits };
}

/** Relit le prix des décors : undefined s'il n'y en a pas, null si le format est mauvais. */
function lirePrixDecorsGC(brut: unknown): PrixDecorGC[] | undefined | null {
  if (brut === undefined) return undefined;
  if (!Array.isArray(brut) || brut.length > DECORS_GC.assemblages.length) return null;
  const out: PrixDecorGC[] = [];
  for (const x of brut) {
    const o = x as Record<string, unknown> | null;
    if (!o || typeof o !== "object" || !lireDecorGC(o.id) || typeof o.nom !== "string" || o.nom.length > 120 || typeof o.conforme !== "boolean") return null;
    if (typeof o.prix !== "number" || !Number.isInteger(o.prix) || o.prix < (o.conforme ? 1 : 0)) return null;
    out.push({ id: o.id as string, nom: o.nom, prix: o.prix, conforme: o.conforme });
  }
  return out;
}

/**
 * Relit la réponse de la route, champ par champ : un format inattendu (une
 * version plus ancienne du serveur, un intermédiaire qui répond à sa place)
 * donne null, jamais un prix mal lu.
 */
export function lireReponsePrixGC(json: unknown): ReponsePrixGC | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const entier = (x: unknown, min = 0) => typeof x === "number" && Number.isInteger(x) && x >= min;
  if (!entier(o.hauteurMm, 1) || !entier(o.mainCouranteMm, 1) || !entier(o.jourMm) || typeof o.obligatoire !== "boolean") return null;
  const commun = { hauteurMm: o.hauteurMm as number, mainCouranteMm: o.mainCouranteMm as number, jourMm: o.jourMm as number, obligatoire: o.obligatoire };
  const modeles: ModeleGC[] = [];
  for (const m of Array.isArray(o.modeles) ? o.modeles.slice(0, MODELES_GC_MAX) : []) {
    if (!m || typeof m !== "object") return null;
    const x = m as Record<string, unknown>;
    const lu = lireModeleGC(x.id);
    if (!lu || x.croix !== lu.croix || x.carre !== lu.carre || typeof x.conforme !== "boolean") return null;
    if (!entier(x.soubassementMm) || !entier(x.hauteurMm, 1) || !entier(x.prix, x.conforme ? 1 : 0) || !entier(x.kg)) return null;
    const raisons = Array.isArray(x.raisons) ? x.raisons.filter((a): a is CodeAlerteGC => CODES.includes(a as CodeAlerteGC)) : [];
    if (x.traverse !== lu.traverse || x.seuls !== lu.seuls) return null;
    if (typeof x.rosace !== "string" || (x.rosace !== "" && !Object.hasOwn(ROSACE_MM_GC, x.rosace))) return null;
    const trous = lireTrousGC(x.trous);
    if (trous === undefined) return null;
    modeles.push({ id: x.id as string, conforme: x.conforme, raisons, croix: lu.croix, carre: lu.carre, soubassementMm: x.soubassementMm as number, traverse: lu.traverse, seuls: lu.seuls, rosace: x.rosace, trous, renfort: x.renfort === true, patte: nbPattesLu(x.patte), hauteurMm: x.hauteurMm as number, prix: x.prix as number, kg: x.kg as number });
  }
  const mains: MainsPrixGC = {};
  if (o.mains && typeof o.mains === "object") {
    for (const [id, prix] of Object.entries(o.mains as Record<string, unknown>)) {
      if (!(MAINS_COURANTES_GC as readonly string[]).includes(id) || !entier(prix, 1)) return null;
      mains[id as MainCouranteGC] = prix as number;
    }
  }
  const decors = lirePrixDecorsGC(o.decors);
  if (decors === null) return null;
  if (o.ok === true && o.conforme === true) {
    if (!entier(o.prix, 1) || !(typeof o.remise === "number" && Number.isInteger(o.remise) && o.remise <= 0)) return null;
    const decor = lireDecorReponseGC(o.decor);
    if (decor === null) return null;
    if (!entier(o.croix, 1) || !entier(o.carre, 1) || !entier(o.soubassementMm) || !entier(o.kg) || typeof o.traverse !== "boolean" || typeof o.seuls !== "boolean") return null;
    return {
      ok: true,
      conforme: true,
      prix: o.prix as number,
      remise: o.remise,
      croix: o.croix as number,
      carre: o.carre as number,
      soubassementMm: o.soubassementMm as number,
      traverse: o.traverse,
      seuls: o.seuls,
      renfort: o.renfort === true,
      patte: nbPattesLu(o.patte),
      kg: o.kg as number,
      modeles,
      mains,
      ...(decor ? { decor } : {}),
      ...(decors ? { decors } : {}),
      ...commun,
    };
  }
  if (o.ok === false && o.conforme === false && RAISONS_SANS_PRIX_GC.includes(o.raison as RaisonSansPrixGC)) {
    const alertes = Array.isArray(o.alertes) ? o.alertes.filter((a): a is CodeAlerteGC => CODES.includes(a as CodeAlerteGC)) : [];
    return { ok: false, conforme: false, raison: o.raison as RaisonSansPrixGC, alertes, modeles, mains, ...(decors ? { decors } : {}), ...commun };
  }
  return null;
}

/** Les mots de la note, pris au dictionnaire de la fiche (fr.json / en.json, « artisanat »). */
export type MotsNoteGC = { gcMur: string; gcAllege: string; gcFenetre: string; gcJourCourt: string };

/** Les deux-points s'écrivent « mot\u00a0: » en français et « mot: » en anglais. */
const deuxPoints = (langue: "fr" | "en") => (langue === "fr" ? "\u00a0: " : ": ");

/**
 * Ce que le client précise et qui doit arriver tel quel à l'atelier, sur le
 * panier et le bon de commande : l'étage, le mur, l'allège, la hauteur de la
 * fenêtre, et le jour sous le cadre retenu par l'outil (« posé à 90 mm »).
 * Une cote inconnue (NaN) ou un jour nul est omis. Le panier garde ce texte
 * jusqu'à MAX_PRECISIONS signes (src/lib/tarif-panier.ts) : un test vérifie
 * que la note la plus longue, dans les deux langues, passe entière.
 */
export function noteReleveGC(
  r: {
    etage: string;
    mur: string;
    allegeMm: number;
    fenetreMm: number;
    jourMm: number;
    /** Les deux largeurs mesurées (murs pas parallèles) : l'atelier fabrique à la plus petite, et les connaît pour la pose. */
    largeurBasMm?: number;
    largeurHautMm?: number;
  },
  t: MotsNoteGC,
  langue: "fr" | "en" = "fr"
): string {
  const largeurs =
    Number.isFinite(r.largeurBasMm) &&
    Number.isFinite(r.largeurHautMm) &&
    (langue === "fr" ? `largeur au ras de l'appui ${r.largeurBasMm} mm, à 1 m du sol ${r.largeurHautMm} mm` : `width at the sill ${r.largeurBasMm} mm, 1 m up ${r.largeurHautMm} mm`);
  return [
    r.etage,
    largeurs,
    r.mur && `${t.gcMur.toLowerCase()}${deuxPoints(langue)}${r.mur.toLowerCase()}`,
    Number.isFinite(r.allegeMm) && `${t.gcAllege.toLowerCase()} ${r.allegeMm} mm`,
    Number.isFinite(r.fenetreMm) && `${t.gcFenetre.toLowerCase()} ${r.fenetreMm} mm`,
    r.jourMm > 0 && `${t.gcJourCourt} ${r.jourMm} mm`,
  ]
    .filter(Boolean)
    .join(" · ");
}
