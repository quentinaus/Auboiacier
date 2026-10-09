/**
 * Les portails sur le site : la configuration choisie par le client, ses bornes, ses textes, et le passage vers le
 * moteur de l'outil de plans (src/lib/portails-outil/moteur.genere.mjs, extrait tel quel : aucun prix).
 *
 * Ce fichier ne contient AUCUN prix : il sert au navigateur (dessin, choix) comme au serveur (validation). Le prix se
 * demande à /api/prix-portail, calculé par src/lib/prix-portail.server.ts avec le chiffrage chiffré de l'outil.
 *
 * Étude du 06/10/2026 avec Quentin : quatre modèles pour toutes les entrées (battant, coulissant sur rail ou
 * autoportant, pliant, portillon), un portail composé par blocs (forme du haut, soubassement, remplissage, options),
 * six styles tout faits, surtout de l'alu, l'acier pour la Rosace et les Volutes.
 */
import { calculerPortail, MT_AVEC, PT_ATELIER, PT_STYLES, type ResultatPortail } from "./portails-outil/moteur.genere.mjs";

export const SLUGS_PORTAIL = {
  "portail-battant": "ptBattant",
  "portail-coulissant": "ptCoulissant",
  "portail-pliant": "ptPliant",
  portillon: "ptPortillon",
} as const;
export type SlugPortail = keyof typeof SLUGS_PORTAIL;
export const estSlugPortail = (s: string): s is SlugPortail => Object.prototype.hasOwnProperty.call(SLUGS_PORTAIL, s);

export const STYLES_PORTAIL = ["plein", "lisse", "barreaux", "lamesChene", "rosace", "volutes"] as const;
export type StylePortail = (typeof STYLES_PORTAIL)[number];

const FORMES = ["droit", "chapeau", "creux", "biais"] as const;
const SOUBS = ["aucun", "plein", "panneau", "lames", "barreaux"] as const;
const REMPS = ["plein", "panneau", "lames", "lamesAlu", "barreaux", "croix", "volutes"] as const;
const POTEAUX = ["existants", "acier", "alu"] as const;
// Les décors (lot 3, 07/10/2026) : les formules PT_DECOR_FORMULES de l'outil (motifs.js, références du commerce). Un décor
// impose l'acier ; « Sur mesure » se chiffre sur devis (le moteur rend une alerte : « à étudier »).
// « perso » (lot 10, 09/10/2026) : « Personnaliser », 2 emplacements au plus (decorChoix, lu par ptDecorPerso de l'outil).
export const DECORS_PORTAIL = ["aucun", "classique", "frise", "medaillon", "couronnement", "coeurs", "surMesure", "perso"] as const;
// Les emplacements proposés par « Personnaliser » (motifs.js : MT_CHOIX.assemblage, sans « barreaux » qui n'est pas un décor).
export const EMPLACEMENTS_DECOR = ["entre", "frise", "anneaux", "hauteur", "coeurs", "medaillon", "applique", "coins", "cimier", "appliquePlein"] as const;
export type EmplacementDecor = (typeof EMPLACEMENTS_DECOR)[number];
export const POS_DECOR = ["haut", "milieu", "bas"] as const;
export const RYTHMES_DECOR = ["tous", "unSurDeux", "alterne"] as const;
/** Un emplacement de « Personnaliser » : où, quelle forme, à quelle hauteur (entre les barreaux), à quel rythme. */
export type ChoixDecor = { assemblage: EmplacementDecor; forme: string; pos?: (typeof POS_DECOR)[number]; rythme?: (typeof RYTHMES_DECOR)[number]; forme2?: string };
/** Les formes qu'un emplacement accepte (MT_AVEC de motifs.js). */
export const formesDe = (a: EmplacementDecor): string[] => [...((MT_AVEC as Record<string, string[]>)[a] ?? [])];
/** Un motif soudé sur le bas ne va que sur un soubassement plein (tôle ou panneau). */
export const emplacementPermis = (a: EmplacementDecor, cfg: Pick<ConfigPortail, "soub">) => a !== "appliquePlein" || cfg.soub === "plein" || cfg.soub === "panneau";
export const BOUTS_DECOR = ["droit", "effile", "bouton"] as const;
export const BARREAUX_DECOR = ["carre", "torsade", "bagues"] as const;
// Le moteur (lot 4, « Somfy partout ») : « conseille » laisse l'outil choisir (PT_MOTEURS : le plus facile à poser qui
// convient à ce portail) ; sinon le client choisit Ixengo (vérins), Axovia (bras) ou Elixo (coulissant).
export const MOTEURS_PORTAIL = ["conseille", "ixengo", "axovia", "elixo"] as const;
export const COULEURS_PORTAIL = ["anthracite", "noir", "blanc", "vert", "rouille"] as const;

export type ConfigPortail = {
  P: number;
  H: number;
  mat: "alu" | "acier";
  forme: (typeof FORMES)[number];
  fleche: number;
  soub: (typeof SOUBS)[number];
  hSoub: number;
  remp: (typeof REMPS)[number];
  decor: (typeof DECORS_PORTAIL)[number];
  decorChoix: ChoixDecor[];
  bouts: (typeof BOUTS_DECOR)[number];
  barreauxDeco: (typeof BARREAUX_DECOR)[number];
  pointes: boolean;
  lisse: boolean;
  vantaux: 1 | 2;
  rep: "egal" | "tiers";
  guidage: "rail" | "auto";
  sens: "gauche" | "droite";
  poteaux: (typeof POTEAUX)[number];
  moteur: boolean;
  moteurModele: (typeof MOTEURS_PORTAIL)[number];
  pente: number;
  couleur: (typeof COULEURS_PORTAIL)[number];
  // Le portillon assorti (lot 10) : même style, même hauteur, posé avec le portail (visite et route comptées une fois).
  portillon: boolean;
  portillonP: number;
  portillonSens: "gauche" | "droite";
};

/** Les bornes de l'atelier (celles de l'outil : PT_ATELIER.bornes). */
export function bornesPortail(slug: SlugPortail) {
  const type = SLUGS_PORTAIL[slug].slice(2).toLowerCase();
  const P = PT_ATELIER.bornes.P[type] as [number, number];
  return { P, H: PT_ATELIER.bornes.H, fleche: [50, 400] as [number, number], hSoub: [250, 1400] as [number, number], pente: [0, 300] as [number, number] };
}

/** La configuration de départ d'une fiche : la cote courante, dans un style. */
export function configDepart(slug: SlugPortail, style: StylePortail = "plein"): ConfigPortail {
  const base: ConfigPortail = {
    P: slug === "portillon" ? 1000 : 3500, H: 1600, mat: "alu", forme: "droit", fleche: 150, soub: "aucun", hSoub: 500,
    remp: "plein", decor: "aucun", decorChoix: [], bouts: "effile", barreauxDeco: "carre", pointes: false, lisse: false, vantaux: 2, rep: "egal",
    guidage: "rail", sens: "gauche", poteaux: "existants", moteur: false, moteurModele: "conseille", pente: 0, couleur: "anthracite",
    portillon: false, portillonP: 1000, portillonSens: "gauche",
  };
  return appliquerStyle(base, style);
}

/** Un style tout fait remplit les blocs de la composition (PT_STYLES de l'outil). */
export function appliquerStyle(cfg: ConfigPortail, style: StylePortail): ConfigPortail {
  const s = PT_STYLES[style] as Record<string, unknown>;
  if (!s) return cfg;
  return {
    ...cfg,
    mat: s.ptMat as ConfigPortail["mat"],
    forme: s.ptForme as ConfigPortail["forme"],
    soub: s.ptSoub as ConfigPortail["soub"],
    remp: s.ptRemp as ConfigPortail["remp"],
    decor: ((s.ptDecor as ConfigPortail["decor"] | undefined) ?? "aucun"),
    decorChoix: [],
    pointes: Boolean(s.ptPointes),
    lisse: Boolean(s.ptLisse),
    ...(typeof s.ptHSoub === "number" ? { hSoub: s.ptHSoub } : {}),
    ...(typeof s.ptFleche === "number" ? { fleche: s.ptFleche } : {}),
    couleur: s.ptMat === "acier" ? "noir" : cfg.couleur === "noir" && cfg.mat === "acier" ? "anthracite" : cfg.couleur,
  };
}

/** Le style dont la composition est exactement celle choisie, ou null (« composé »). */
export function styleDe(cfg: ConfigPortail): StylePortail | null {
  return (
    STYLES_PORTAIL.find((st) => {
      const s = PT_STYLES[st] as Record<string, unknown>;
      return s.ptMat === cfg.mat && s.ptForme === cfg.forme && s.ptSoub === cfg.soub && s.ptRemp === cfg.remp && ((s.ptDecor as string | undefined) ?? "aucun") === cfg.decor && Boolean(s.ptPointes) === cfg.pointes && Boolean(s.ptLisse) === cfg.lisse;
    }) ?? null
  );
}

/** Les entrées du moteur de l'outil (mêmes noms que les champs de l'outil). */
export function versEntrees(cfg: ConfigPortail): Record<string, unknown> {
  // « Personnaliser » sans emplacement = pas de décor.
  const decor = cfg.decor === "perso" && !cfg.decorChoix.length ? "aucun" : cfg.decor;
  return {
    ptP: cfg.P, ptH: cfg.H, ptMat: cfg.mat, ptForme: cfg.forme, ptFleche: cfg.fleche, ptSoub: cfg.soub, ptHSoub: cfg.hSoub,
    ptRemp: cfg.remp, ptDecor: decor, ptPointes: cfg.pointes, ptLisse: cfg.lisse, ptVantaux: String(cfg.vantaux), ptRep: cfg.rep,
    ptGuidage: cfg.guidage, ptSens: cfg.sens, ptPoteaux: cfg.poteaux, ptMoteur: cfg.moteur, ptPente: cfg.pente,
    ...(cfg.moteurModele !== "conseille" ? { ptMoteurModele: cfg.moteurModele } : {}),
    ...(decor === "perso" ? { ptDecorChoix: JSON.stringify(cfg.decorChoix) } : {}),
    ...(decor !== "aucun" ? { ptBouts: cfg.bouts, ptBarreauxDeco: cfg.barreauxDeco } : {}),
  };
}

/** Le portillon assorti d'un portail : même composition, même hauteur, sa largeur et ses gonds ; jamais de moteur. */
export function configPortillonAssorti(cfg: ConfigPortail): ConfigPortail {
  return { ...cfg, P: cfg.portillonP, sens: cfg.portillonSens, vantaux: 1, moteur: false, portillon: false };
}

/** Le plan de l'outil pour cette configuration (vues, débit, contrôles). */
export function planPortail(slug: SlugPortail, cfg: ConfigPortail): ResultatPortail {
  return calculerPortail(versEntrees(cfg), SLUGS_PORTAIL[slug]);
}

const PARAMS: (keyof ConfigPortail)[] = ["P", "H", "mat", "forme", "fleche", "soub", "hSoub", "remp", "decor", "bouts", "barreauxDeco", "pointes", "lisse", "vantaux", "rep", "guidage", "sens", "poteaux", "moteur", "moteurModele", "pente", "couleur", "portillon", "portillonP", "portillonSens"];

/** La configuration en paramètres d'adresse (pour /api/prix-portail). */
export function versParams(slug: SlugPortail, cfg: ConfigPortail): URLSearchParams {
  const p = new URLSearchParams({ slug });
  for (const k of PARAMS) {
    const v = cfg[k];
    p.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  if (cfg.decor === "perso") p.set("decorChoix", JSON.stringify(cfg.decorChoix));
  return p;
}

/** Relit les emplacements de « Personnaliser » : 1 ou 2, chacun permis par motifs.js ; sinon null (jamais deviné). */
export function lireDecorChoix(texte: string | null): ChoixDecor[] | null {
  let L: unknown;
  try { L = JSON.parse(texte ?? ""); } catch { return null; }
  if (!Array.isArray(L) || L.length < 1 || L.length > 2) return null;
  const sortie: ChoixDecor[] = [];
  for (const x of L) {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    if (Object.keys(o).some((k) => !["assemblage", "forme", "pos", "rythme", "forme2"].includes(k))) return null;
    const a = o.assemblage as EmplacementDecor;
    if (!EMPLACEMENTS_DECOR.includes(a)) return null;
    const formes = formesDe(a);
    if (typeof o.forme !== "string" || !formes.includes(o.forme)) return null;
    if (o.pos !== undefined && !POS_DECOR.includes(o.pos as never)) return null;
    if (o.rythme !== undefined && !RYTHMES_DECOR.includes(o.rythme as never)) return null;
    if (o.forme2 !== undefined && (typeof o.forme2 !== "string" || !formes.includes(o.forme2))) return null;
    sortie.push(o as ChoixDecor);
  }
  return sortie;
}

/**
 * Relit une configuration venue du navigateur. Tout est vérifié : un choix inconnu ou une cote hors des bornes de
 * l'atelier rend null (le serveur répond 400), jamais une valeur devinée.
 */
export function lireConfig(params: URLSearchParams): { slug: SlugPortail; cfg: ConfigPortail } | null {
  const slug = params.get("slug") ?? "";
  if (!estSlugPortail(slug)) return null;
  const b = bornesPortail(slug);
  const nombre = (k: string, [min, max]: [number, number]) => {
    const n = Number(params.get(k));
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
  };
  const choix = <T extends string>(k: string, liste: readonly T[]) => {
    const v = params.get(k) as T | null;
    return v !== null && liste.includes(v) ? v : null;
  };
  const bool = (k: string) => (params.get(k) === "1" ? true : params.get(k) === "0" ? false : null);
  const cfg = {
    P: nombre("P", b.P), H: nombre("H", b.H), mat: choix("mat", ["alu", "acier"] as const), forme: choix("forme", FORMES),
    fleche: nombre("fleche", [0, 400]), soub: choix("soub", SOUBS), hSoub: nombre("hSoub", [0, 2000]), remp: choix("remp", REMPS),
    decor: choix("decor", DECORS_PORTAIL), bouts: choix("bouts", BOUTS_DECOR), barreauxDeco: choix("barreauxDeco", BARREAUX_DECOR),
    pointes: bool("pointes"), lisse: bool("lisse"), vantaux: params.get("vantaux") === "1" ? 1 : params.get("vantaux") === "2" ? 2 : null,
    rep: choix("rep", ["egal", "tiers"] as const), guidage: choix("guidage", ["rail", "auto"] as const), sens: choix("sens", ["gauche", "droite"] as const),
    poteaux: choix("poteaux", POTEAUX), moteur: bool("moteur"), moteurModele: choix("moteurModele", MOTEURS_PORTAIL), pente: nombre("pente", b.pente), couleur: choix("couleur", COULEURS_PORTAIL),
    // Le portillon assorti : seulement à côté d'un portail, à la largeur d'un portillon.
    portillon: slug === "portillon" ? (params.get("portillon") === "1" ? null : false) : bool("portillon"),
    portillonP: nombre("portillonP", bornesPortail("portillon").P), portillonSens: choix("portillonSens", ["gauche", "droite"] as const),
    decorChoix: params.get("decor") === "perso" ? lireDecorChoix(params.get("decorChoix")) : params.has("decorChoix") ? null : [],
  };
  if (Object.values(cfg).some((x) => x === null)) return null;
  return { slug, cfg: cfg as ConfigPortail };
}

/**
 * Le guide « Quel portail chez vous ? » : trois questions, dans l'ordre (étude du 06/10/2026).
 * 1. Derrière, la place d'un vantail est-elle libre, sur un sol plat ou qui monte de moins de 5 cm ? → battant.
 * 2. Sinon : le long de la clôture, la longueur du passage + 15 cm est-elle libre ? Non → pliant.
 * 3. Oui : le sol y est-il dur et plat ? Oui → coulissant sur rail ; non → autoportant.
 */
export function guidePortail(r: { derriere?: boolean; cote?: boolean; sol?: boolean }): { slug: SlugPortail; guidage?: "rail" | "auto" } | null {
  if (r.derriere === true) return { slug: "portail-battant" };
  if (r.derriere !== false) return null;
  if (r.cote === false) return { slug: "portail-pliant" };
  if (r.cote !== true) return null;
  if (r.sol === undefined) return null;
  return { slug: "portail-coulissant", guidage: r.sol ? "rail" : "auto" };
}

/* ---------- Les textes (français, anglais) ---------- */

export type Langue = "fr" | "en";
export const TEXTES_PORTAIL = {
  fr: {
    styles: { plein: "Plein", lisse: "Lisse", barreaux: "Barreaux", lamesChene: "Lames chêne", rosace: "Rosace", volutes: "Volutes" },
    stylesNote: {
      plein: "Lames alu emboîtées, on ne voit pas à travers", lisse: "Panneau alu lisse, moderne", barreaux: "Barreaux serrés, ajouré",
      lamesChene: "Cadre alu, lames de chêne", rosace: "Croix et rosaces, comme le garde-corps", volutes: "Acier, volutes en fer forgé et pointes",
    },
    compose: "Composé à votre goût",
    mat: { alu: "Alu", acier: "Acier" },
    forme: { droit: "Droit", chapeau: "Chapeau de gendarme", creux: "En creux", biais: "En biais" },
    soub: { aucun: "Aucun", plein: "Plein", panneau: "Panneau lisse", lames: "Lames chêne", barreaux: "Barreaux" },
    remp: { plein: "Lames pleines", panneau: "Panneau lisse", lames: "Lames chêne", lamesAlu: "Lames ajourées", barreaux: "Barreaux", croix: "Croix et rosaces", volutes: "Volutes" },
    decor: { aucun: "Aucun", classique: "Classique", frise: "Frise", medaillon: "Médaillon", couronnement: "Couronnement", coeurs: "Cœurs", surMesure: "Sur mesure", perso: "Personnalisé" },
    emplacements: { entre: "Entre les barreaux", frise: "Frise sous la traverse", anneaux: "Frise d'anneaux", hauteur: "Sur toute la hauteur", coeurs: "Cœurs", medaillon: "Médaillon", applique: "Motifs en applique", coins: "Coins du haut", cimier: "Couronnement", appliquePlein: "Motif sur le bas plein" },
    formesDecor: { C: "Volute en C", S: "Volute en S", J: "Crosse", coeur: "Cœur", doubleC: "Double C", poste: "Postes", anneau: "Anneau" } as Record<string, string>,
    posDecor: { haut: "En haut", milieu: "Au milieu", bas: "En bas" },
    rythmes: { tous: "Chaque vide", unSurDeux: "Un sur deux", alterne: "Deux formes" },
    bouts: { droit: "Droits", effile: "Effilés", bouton: "À bouton" },
    barreauxDeco: { carre: "Carrés", torsade: "Torsadés", bagues: "À bagues" },
    portillon: "Portillon assorti",
    poteaux: { existants: "Mes piliers", acier: "Poteaux acier", alu: "Poteaux alu" },
    couleur: { anthracite: "Gris anthracite", noir: "Noir", blanc: "Blanc", vert: "Vert sapin", rouille: "Rouille" },
    vantaux: { 1: "1 vantail", 2: "2 vantaux" },
    rep: { egal: "Égaux", tiers: "1/3 – 2/3" },
    guidage: { rail: "Sur rail", auto: "Sans rail" },
    sens: { gauche: "Vers la gauche", droite: "Vers la droite" },
    sensPortillon: { gauche: "Gonds à gauche", droite: "Gonds à droite" },
    onglets: { cotes: "Cotes", style: "Style", compo: "Composition", pose: "Pose" },
    passage: "Passage entre piliers", hauteur: "Hauteur", fleche: "Flèche du haut", hSoub: "Hauteur du soubassement", pente: "Le sol monte derrière de",
    titres: { mat: "Matière", forme: "Forme du haut", soub: "Soubassement", remp: "Remplissage", decor: "Décor", options: "Finitions", couleur: "Couleur",
      vantaux: "Vantaux", rep: "Répartition", guidage: "Guidage", sens: "Il s'ouvre", poteaux: "Fixation", moteur: "Moteur" },
    pointes: "Pointes de lance", lisseChene: "Lisse en chêne", moteurOui: "Motorisé", moteurNon: "Manuel",
    prix: "Prix posé", prixNote: "Visite et pose comprises jusqu'à 45 km de Saumur ; au-delà, la route s'ajoute au devis.",
    prixCalcul: "Calcul…", aEtudier: "À étudier", indisponible: "Prix indisponible pour le moment",
    cta: "Demander ma visite", ctaNote: "Nous venons mesurer, vous recevez le devis détaillé.",
    vueFace: "Vue de face, depuis la rue", vueDessus: "Vue de dessus : en vert, la place à laisser libre", illustration: "Dessin d'illustration, cotes en mm",
    guideTitre: "Quel portail chez vous ?", guideCourt: "Quel modèle ?",
    guideQ: ["Derrière le portail, la place d'un vantail est-elle libre, sur un sol plat ?", "Le long de la clôture, la longueur du passage est-elle libre ?", "À cet endroit, le sol est-il dur et plat ?"],
    oui: "Oui", non: "Non", guideVers: "Le bon modèle :", ouvrirModele: "Voir ce modèle",
    modeles: { "portail-battant": "Battant", "portail-coulissant": "Coulissant", "portail-pliant": "Pliant", portillon: "Portillon" },
    placeDerriere: "Place derrière", placeCote: "Place le long de la clôture", poids: "Poids du portail", etudierEn: "",
  },
  en: {
    styles: { plein: "Solid", lisse: "Flat", barreaux: "Bars", lamesChene: "Oak slats", rosace: "Rosette", volutes: "Scrolls" },
    stylesNote: {
      plein: "Interlocking aluminium slats, fully private", lisse: "Flat aluminium panel, modern", barreaux: "Close vertical bars",
      lamesChene: "Aluminium frame, oak slats", rosace: "Crosses and rosettes, like the balustrade", volutes: "Steel, wrought-iron scrolls and spear tips",
    },
    compose: "Made to your taste",
    mat: { alu: "Aluminium", acier: "Steel" },
    forme: { droit: "Straight", chapeau: "Arched", creux: "Dipped", biais: "Sloped" },
    soub: { aucun: "None", plein: "Solid", panneau: "Flat panel", lames: "Oak slats", barreaux: "Bars" },
    remp: { plein: "Solid slats", panneau: "Flat panel", lames: "Oak slats", lamesAlu: "Open slats", barreaux: "Bars", croix: "Crosses and rosettes", volutes: "Scrolls" },
    decor: { aucun: "None", classique: "Classic", frise: "Frieze", medaillon: "Medallion", couronnement: "Crest", coeurs: "Hearts", surMesure: "Bespoke", perso: "Custom" },
    emplacements: { entre: "Between the bars", frise: "Frieze under the top rail", anneaux: "Ring frieze", hauteur: "Full height", coeurs: "Hearts", medaillon: "Medallion", applique: "Applied motifs", coins: "Top corners", cimier: "Crest", appliquePlein: "Motif on the solid lower panel" },
    formesDecor: { C: "C scroll", S: "S scroll", J: "Crook", coeur: "Heart", doubleC: "Double C", poste: "Running scrolls", anneau: "Ring" } as Record<string, string>,
    posDecor: { haut: "Top", milieu: "Middle", bas: "Bottom" },
    rythmes: { tous: "Every gap", unSurDeux: "Every other", alterne: "Two shapes" },
    bouts: { droit: "Straight", effile: "Tapered", bouton: "Knob" },
    barreauxDeco: { carre: "Square", torsade: "Twisted", bagues: "Ringed" },
    portillon: "Matching pedestrian gate",
    poteaux: { existants: "My pillars", acier: "Steel posts", alu: "Aluminium posts" },
    couleur: { anthracite: "Anthracite grey", noir: "Black", blanc: "White", vert: "Fir green", rouille: "Rust" },
    vantaux: { 1: "1 leaf", 2: "2 leaves" },
    rep: { egal: "Equal", tiers: "1/3 – 2/3" },
    guidage: { rail: "On a rail", auto: "No rail" },
    sens: { gauche: "To the left", droite: "To the right" },
    sensPortillon: { gauche: "Hinges on the left", droite: "Hinges on the right" },
    onglets: { cotes: "Size", style: "Style", compo: "Design", pose: "Fitting" },
    passage: "Opening between pillars", hauteur: "Height", fleche: "Rise of the top", hSoub: "Lower panel height", pente: "Ground rises behind by",
    titres: { mat: "Material", forme: "Top shape", soub: "Lower panel", remp: "Infill", decor: "Decoration", options: "Finishes", couleur: "Colour",
      vantaux: "Leaves", rep: "Split", guidage: "Guiding", sens: "Opens", poteaux: "Fixing", moteur: "Motor" },
    pointes: "Spear tips", lisseChene: "Oak top rail", moteurOui: "Motorised", moteurNon: "Manual",
    prix: "Fitted price", prixNote: "Survey visit and fitting included within 45 km of Saumur; beyond that, travel is added to the quote.",
    prixCalcul: "Calculating…", aEtudier: "To be studied", indisponible: "Price unavailable for now",
    cta: "Book my survey visit", ctaNote: "We come and measure, you receive the detailed quote.",
    vueFace: "Front view, from the street", vueDessus: "Top view: in green, the space to keep clear", illustration: "Illustrative drawing, dimensions in mm",
    guideTitre: "Which gate for your entrance?", guideCourt: "Which model?",
    guideQ: ["Behind the gate, is there room for one leaf to swing, on flat ground?", "Along the fence, is the length of the opening free?", "There, is the ground hard and level?"],
    oui: "Yes", non: "No", guideVers: "The right model:", ouvrirModele: "See this model",
    modeles: { "portail-battant": "Swing", "portail-coulissant": "Sliding", "portail-pliant": "Folding", portillon: "Pedestrian gate" },
    placeDerriere: "Space behind", placeCote: "Space along the fence", poids: "Weight",
    etudierEn: "These dimensions are outside what the workshop makes as standard: book a survey visit and we will study it with you.",
  },
} as const;

/** La configuration en mots (pour la demande de visite : elle arrive écrite dans le message). */
export function resumeConfig(slug: SlugPortail, cfg: ConfigPortail, locale: Langue, prix: number | null): string[] {
  const t = TEXTES_PORTAIL[locale];
  const st = styleDe(cfg);
  const lignes = [
    `${t.passage} : ${cfg.P} mm · ${t.hauteur} : ${cfg.H} mm`,
    `${t.onglets.style} : ${st ? t.styles[st] : t.compose} · ${t.mat[cfg.mat]} · ${t.couleur[cfg.couleur]}`,
    `${t.titres.forme} : ${t.forme[cfg.forme]}${cfg.forme !== "droit" ? ` (${cfg.fleche} mm)` : ""} · ${t.titres.remp} : ${t.remp[cfg.remp]}${cfg.soub !== "aucun" ? ` · ${t.titres.soub} : ${t.soub[cfg.soub]} (${cfg.hSoub} mm)` : ""}${cfg.decor !== "aucun" ? ` · ${t.titres.decor} : ${decrireDecor(cfg, locale)}` : ""}`,
  ];
  if (slug === "portail-battant") lignes.push(`${t.titres.vantaux} : ${t.vantaux[cfg.vantaux]}${cfg.vantaux === 2 ? ` (${t.rep[cfg.rep]})` : ""}`);
  if (slug === "portail-coulissant") lignes.push(`${t.titres.guidage} : ${t.guidage[cfg.guidage]} · ${t.titres.sens} : ${t.sens[cfg.sens]}`);
  lignes.push(`${t.titres.poteaux} : ${t.poteaux[cfg.poteaux]} · ${t.titres.moteur} : ${cfg.moteur ? t.moteurOui : t.moteurNon}${cfg.pointes ? ` · ${t.pointes}` : ""}${cfg.lisse ? ` · ${t.lisseChene}` : ""}`);
  if (cfg.portillon && slug !== "portillon") lignes.push(`${t.portillon} : ${cfg.portillonP} × ${cfg.H} mm · ${t.sensPortillon[cfg.portillonSens]}`);
  if (prix !== null) lignes.push(`${t.prix} : ${prix} €`);
  return lignes;
}

/** Le décor en mots : la formule, ou les emplacements de « Personnaliser », avec les finitions. */
export function decrireDecor(cfg: ConfigPortail, locale: Langue): string {
  const t = TEXTES_PORTAIL[locale];
  if (cfg.decor === "aucun") return t.decor.aucun;
  const fins = `${t.titres.options.toLowerCase()} : ${locale === "fr" ? "bouts" : "ends"} ${t.bouts[cfg.bouts].toLowerCase()}, ${locale === "fr" ? "barreaux" : "bars"} ${t.barreauxDeco[cfg.barreauxDeco].toLowerCase()}`;
  if (cfg.decor !== "perso") return cfg.decor === "surMesure" ? t.decor.surMesure : `${t.decor[cfg.decor]} (${fins})`;
  const un = (c: ChoixDecor) => `${t.formesDecor[c.forme] ?? c.forme}${c.rythme === "alterne" && c.forme2 ? ` / ${t.formesDecor[c.forme2] ?? c.forme2}` : ""}, ${t.emplacements[c.assemblage].toLowerCase()}${c.assemblage === "entre" && c.pos ? ` ${t.posDecor[c.pos].toLowerCase()}` : ""}${c.rythme === "unSurDeux" ? ` (${t.rythmes.unSurDeux.toLowerCase()})` : ""}`;
  return `${t.decor.perso} : ${cfg.decorChoix.map(un).join(" + ")} (${fins})`;
}
