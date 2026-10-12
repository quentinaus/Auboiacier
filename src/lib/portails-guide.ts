/**
 * La logique du guide « Quel portail pour votre entrée ? » de la page des portails (13/10/2026), sortie du composant pour être
 * testée : questions, réponses, conseil, adresse de la fiche, prix, dessin, garde-fou du double appui, mémoire de la session.
 * Aucun import du moteur ni du chiffrage : le navigateur et `node --test` peuvent tous deux l'importer (imports relatifs,
 * extension .ts). Le composant (portails-modeles.tsx) ne garde que l'affichage.
 */
import { guidePortail, type Langue, type SlugPortail, type StylePortail } from "./portails-base.ts";
import { lienFiche, srcCarte, type ModeleCarte, type SansRail } from "./portails-page.ts";

/** Les réponses données : une par question, dans l'ordre. Oui = true. */
export type Reponses = { derriere?: boolean; cote?: boolean; sol?: boolean };
export type IndexQuestion = 0 | 1 | 2;
export const CLES = ["derriere", "cote", "sol"] as const;

/** La question en cours : la première sans réponse parmi celles que les réponses précédentes rendent utiles ; null = le résultat est là. */
export function questionCourante(g: Reponses): IndexQuestion | null {
  if (g.derriere === undefined) return 0;
  if (g.derriere) return null;
  if (g.cote === undefined) return 1;
  if (!g.cote) return null;
  return g.sol === undefined ? 2 : null;
}

/** Les questions déjà répondues, dans l'ordre. */
export function repondues(g: Reponses): IndexQuestion[] {
  const l: IndexQuestion[] = [];
  if (g.derriere !== undefined) l.push(0);
  if (g.derriere === false && g.cote !== undefined) l.push(1);
  if (g.derriere === false && g.cote === true && g.sol !== undefined) l.push(2);
  return l;
}

/** Les sept états du guide : trois questions et quatre résultats (un par parcours ; ce sont aussi les clés de guideRaison). */
export const ETATS = ["q0", "q1", "q2", "battant", "pliant", "rail", "auto"] as const;
export type EtatGuide = (typeof ETATS)[number];
export type EtatResultat = "battant" | "pliant" | "rail" | "auto";
export const RESULTATS: Record<EtatResultat, { slug: SlugPortail; guidage?: "rail" | "auto" }> = {
  battant: { slug: "portail-battant" }, pliant: { slug: "portail-pliant" },
  rail: { slug: "portail-coulissant", guidage: "rail" }, auto: { slug: "portail-coulissant", guidage: "auto" },
};

/** L'état affiché pour ces réponses : la question en cours, ou le résultat du parcours. */
export function etatGuide(g: Reponses): EtatGuide {
  const q = questionCourante(g);
  if (q !== null) return `q${q}`;
  const r = guidePortail(g);
  if (r?.slug === "portail-battant") return "battant";
  if (r?.slug === "portail-pliant") return "pliant";
  return r?.guidage === "auto" ? "auto" : "rail";
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Les gestes : une réponse à la fois, et pas de double appui
// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * Après un changement d'état, les clics arrivés avant ce délai (en millisecondes) sont ignorés : un double appui sur « Oui » ou
 * « Non » tomberait sinon sur le bouton de la question suivante, posé au même endroit, et répondrait à une question jamais lue.
 */
export const DELAI_DOUBLE_APPUI_MS = 450;

/** Vrai si cette réponse compte : c'est bien la question en cours (une réponse à la fois), et le dernier changement n'est pas trop frais. */
export function reponseAcceptee(g: Reponses, i: IndexQuestion, msDepuisChangement: number): boolean {
  return questionCourante(g) === i && msDepuisChangement >= DELAI_DOUBLE_APPUI_MS;
}
/** Vrai si ce retour compte : la question a bien été répondue, et le dernier changement n'est pas trop frais. */
export function retourAccepte(g: Reponses, i: IndexQuestion, msDepuisChangement: number): boolean {
  return repondues(g).includes(i) && msDepuisChangement >= DELAI_DOUBLE_APPUI_MS;
}
/**
 * Vrai si ce clic sur un lien ou sur le « Besoin d'aide pour vérifier ? » compte. Ces deux-là ne changent pas l'état du guide, mais ils
 * sont posés là où l'on vient de toucher « Oui » ou « Non » : le 2e appui d'un double tap les atteindrait (« Composer ce portail » ouvrirait
 * la fiche, le résumé déplierait l'aide). Ils attendent donc le même délai que les réponses après un changement d'état.
 */
export function actionAcceptee(msDepuisChangement: number): boolean {
  return msDepuisChangement >= DELAI_DOUBLE_APPUI_MS;
}

/** Les réponses et l'instant (en millisecondes) du dernier changement d'état : ce que le composant garde pour refuser un double appui. */
export type SuiviGuide = { reponses: Reponses; dernierChangement: number };
export const SUIVI_VIERGE: SuiviGuide = { reponses: {}, dernierChangement: Number.NEGATIVE_INFINITY };
/** Un clic sur « Oui » ou « Non » à l'instant `maintenant` : le nouveau suivi, ou le même objet si le clic est refusé (autre question, ou trop tôt). */
export function suivreReponse(s: SuiviGuide, i: IndexQuestion, valeur: boolean, maintenant: number): SuiviGuide {
  if (!reponseAcceptee(s.reponses, i, maintenant - s.dernierChangement)) return s;
  return { reponses: repondre(s.reponses, i, valeur), dernierChangement: maintenant };
}
/** Un clic sur le lien « Composer ce portail » ou sur « Besoin d'aide pour vérifier ? » à l'instant `maintenant` : vrai s'il compte, faux s'il faut l'annuler. */
export function suivreAction(s: SuiviGuide, maintenant: number): boolean {
  return actionAcceptee(maintenant - s.dernierChangement);
}
/** Un clic sur « Retour » (ou « Recommencer » : la question 0) à l'instant `maintenant`. */
export function suivreRetour(s: SuiviGuide, i: IndexQuestion, maintenant: number): SuiviGuide {
  if (!retourAccepte(s.reponses, i, maintenant - s.dernierChangement)) return s;
  return { reponses: modifier(s.reponses, i), dernierChangement: maintenant };
}

/** Répondre à la question en cours : les réponses d'avant sont gardées, la nouvelle s'ajoute. Une réponse à une autre question que la courante est refusée (rien ne change). */
export function repondre(g: Reponses, i: IndexQuestion, valeur: boolean): Reponses {
  if (questionCourante(g) !== i) return g;
  return { ...garder(g, i), [CLES[i]]: valeur };
}
/** Revenir sur une réponse : elle et les suivantes sont effacées. Une question qui n'a pas été répondue ne change rien. */
export function modifier(g: Reponses, i: IndexQuestion): Reponses {
  if (!repondues(g).includes(i)) return g;
  return garder(g, i);
}
/** Les réponses des questions avant la n-ième. */
function garder(g: Reponses, avant: IndexQuestion): Reponses {
  return Object.fromEntries(CLES.slice(0, avant).map((k) => [k, g[k]])) as Reponses;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Ce que montre un modèle, et le conseil
// ---------------------------------------------------------------------------------------------------------------------------------

export type VueModele = {
  /** Le coulissant « sans rail » (sol meuble) : son dessin, son style et son « dès » sont ceux du sans rail. */
  auto: boolean;
  guidage: "rail" | "auto" | undefined;
  style: StylePortail;
  lien: string;
  depart: number | null;
  departSans: number | null;
  src: string;
};

/**
 * Ce que montre un modèle : le coulissant devient « sans rail » quand le guide a répondu « sol non dur ». Le prix et le style du
 * sans rail viennent de `sansRail` ; s'il manque, le sans rail garde son dessin mais n'affiche aucun prix (celui du rail serait faux).
 */
export function vueModele(m: ModeleCarte, sansRail: SansRail | null, guidage: "rail" | "auto" | undefined, locale: Langue): VueModele {
  const coulissant = m.slug === "portail-coulissant";
  const auto = coulissant && guidage === "auto";
  const gabarit = auto && sansRail ? sansRail : null;
  const style = gabarit ? gabarit.style : m.style;
  const g = coulissant ? guidage : undefined;
  return {
    auto, guidage: g, style,
    lien: lienFiche(locale, m.slug, { style, ...(g ? { guidage: g } : {}) }),
    depart: auto ? (gabarit ? gabarit.depart : null) : m.depart,
    departSans: auto ? (gabarit ? gabarit.departSans : null) : m.departSans,
    src: srcCarte(m.slug, style, auto ? "auto" : undefined),
  };
}

export type Conseil = { etat: EtatResultat; slug: SlugPortail; modele: ModeleCarte; vue: VueModele };

/** Le conseil d'un état-résultat : le modèle, et ce qu'on en montre (adresse de la fiche, dessin, prix posé et sans pose). */
export function conseilDe(etat: EtatResultat, modeles: readonly ModeleCarte[], sansRail: SansRail | null, locale: Langue): Conseil | null {
  const res = RESULTATS[etat];
  const modele = modeles.find((m) => m.slug === res.slug);
  if (!modele) return null;
  return { etat, slug: res.slug, modele, vue: vueModele(modele, sansRail, res.guidage, locale) };
}

/** Le conseil donné par ces réponses ; null tant qu'une question reste sans réponse. */
export function conseilGuide(g: Reponses, modeles: readonly ModeleCarte[], sansRail: SansRail | null, locale: Langue): Conseil | null {
  if (questionCourante(g) !== null) return null;
  const etat = etatGuide(g);
  return etat.startsWith("q") ? null : conseilDe(etat as EtatResultat, modeles, sansRail, locale);
}

// ---------------------------------------------------------------------------------------------------------------------------------
// La mémoire de la session (retour du navigateur depuis la fiche)
// ---------------------------------------------------------------------------------------------------------------------------------

/** La clé de sessionStorage : les réponses sont les mêmes en français et en anglais. */
export const CLE_MEMOIRE_GUIDE = "auboiacier:portails:guide";

/** Ce qui s'écrit en mémoire : seulement des réponses qui se suivent (une réponse sans celle d'avant n'a pas de sens). */
export function memoriserReponses(g: Reponses): string {
  const r: Reponses = {};
  for (const k of CLES) {
    const v = g[k];
    if (v === undefined) break;
    r[k] = v;
    if (questionCourante(r) === null) break;
  }
  return JSON.stringify(r);
}

/** Ce qui se relit : tout ce qui n'est pas une suite valide de réponses est jeté (texte absent, abîmé, ou écrit par une autre version). */
export function lireReponses(brut: string | null | undefined): Reponses {
  if (!brut) return {};
  let v: unknown;
  try { v = JSON.parse(brut); } catch { return {}; }
  if (v === null || typeof v !== "object" || Array.isArray(v)) return {};
  const o = v as Record<string, unknown>;
  const r: Reponses = {};
  for (const k of CLES) {
    if (typeof o[k] !== "boolean") break;
    r[k] = o[k] as boolean;
    if (questionCourante(r) === null) break;
  }
  return r;
}
