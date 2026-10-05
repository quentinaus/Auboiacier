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

/** Le jour laissé entre l'appui et le bas du cadre, par défaut dans l'outil (DEFAUTS_GC.jour). */
export const JOUR_GC_MM = 90;

/** En étage, à partir de cette allège, la loi n'impose plus de protection (ALLEGE_LIBRE du moteur). */
export const ALLEGE_SANS_OBLIGATION_MM = 900;

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
  | "autre";

/** Le prix d'une pièce pour chaque main courante qui convient à la fenêtre (les autres sont absentes). */
export type MainsPrixGC = Partial<Record<MainCouranteGC, number>>;

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
  return { svg: o.svg, largeurMm: o.largeurMm as number, hauteurMm: o.hauteurMm as number, croix: o.croix as number, carre: o.carre as number, seuls: o.seuls, traverse: o.traverse };
}

/** Les options d'une pièce, telles que la fiche les envoie. */
export type OptionsGC = {
  woodId: string;
  metalId?: string;
  fabricId?: string;
  remplissageId?: string;
  quantite?: number;
};

/** Le relevé est-il dans les bornes des champs de l'outil ? */
export function releveDansLesBornes(r: ReleveGC): boolean {
  const dans = (n: number, b: { min: number; max: number }) => Number.isInteger(n) && n >= b.min && n <= b.max;
  return (
    dans(r.largeurMm, BORNES_RELEVE_GC.largeurMm) &&
    dans(r.allegeMm, BORNES_RELEVE_GC.allegeMm) &&
    dans(r.fenetreMm, BORNES_RELEVE_GC.fenetreMm) &&
    typeof r.enEtage === "boolean" &&
    (r.modele === undefined || lireModeleGC(r.modele) !== null)
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

const CODES: readonly CodeAlerteGC[] = ["barre-appui", "trous", "solidite", "fenetre", "hauteur", "soubassement", "fixation", "trop-petit", "jour", "jeu", "main-courante", "charge-verticale", "autre"];

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
  if (o.ok === true && o.conforme === true) {
    if (!entier(o.prix, 1) || !(typeof o.remise === "number" && Number.isInteger(o.remise) && o.remise <= 0)) return null;
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
      ...commun,
    };
  }
  if (o.ok === false && o.conforme === false && RAISONS_SANS_PRIX_GC.includes(o.raison as RaisonSansPrixGC)) {
    const alertes = Array.isArray(o.alertes) ? o.alertes.filter((a): a is CodeAlerteGC => CODES.includes(a as CodeAlerteGC)) : [];
    return { ok: false, conforme: false, raison: o.raison as RaisonSansPrixGC, alertes, modeles, mains, ...commun };
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
  r: { etage: string; mur: string; allegeMm: number; fenetreMm: number; jourMm: number },
  t: MotsNoteGC,
  langue: "fr" | "en" = "fr"
): string {
  return [
    r.etage,
    r.mur && `${t.gcMur.toLowerCase()}${deuxPoints(langue)}${r.mur.toLowerCase()}`,
    Number.isFinite(r.allegeMm) && `${t.gcAllege.toLowerCase()} ${r.allegeMm} mm`,
    Number.isFinite(r.fenetreMm) && `${t.gcFenetre.toLowerCase()} ${r.fenetreMm} mm`,
    r.jourMm > 0 && `${t.gcJourCourt} ${r.jourMm} mm`,
  ]
    .filter(Boolean)
    .join(" · ");
}
