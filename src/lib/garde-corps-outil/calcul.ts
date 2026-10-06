/**
 * Le garde-corps du site, calculé par l'outil de plans : hauteur à la norme,
 * nombre de croix, carré, solidité, poids et prix (décisions de Quentin du
 * 29/09). Rien n'est recopié ici : la norme vient du moteur extrait
 * (moteur.genere.mjs), le prix du chiffrage extrait (chiffré, lu avec la clé).
 *
 * SERVEUR SEULEMENT. Le site l'importe par src/lib/prix-garde-corps.server.ts
 * (import "server-only") ; les tests l'importent directement. Aucun composant
 * du navigateur ne doit l'importer, même indirectement : un test le vérifie.
 */
import { ALLEGE_LIBRE, BARRE_APPUI, BORNES_GC, DEFAUTS_GC, MARGE_BOULE, calculerGC, geomGC, type ResultatGC, type ValeursGC } from "./moteur.genere.mjs";
import { chiffrage } from "./chiffrage.ts";
import { champsMurGC, decorParDefautGC, idDecorGC, idModeleGC, lireDecorGC, lireMainCouranteGC, lireModeleGC, murDansLesBornes, ROSACES_MM_GC, type ChoixDecorGC, type RaisonSansPrixGC, type RondGC, type TrousGC } from "../garde-corps.ts";
import { DECORS_GC } from "../garde-corps-decors.genere.ts";
import { CARRE_RENFORT, CARRES_RENFORT_SEULS, codeAlerte, CROIX_CATALOGUE, CROIX_MAX, MAINS_COURANTES_GC, ORDRE_CARRES, valeursGC, type CodeAlerteGC, type EntreeSiteGC } from "./entree.ts";

export { ChiffrageIndisponible } from "./chiffrage.ts";
export type { CodeAlerteGC, EntreeSiteGC, EssenceGC, MainCouranteGC } from "./entree.ts";

type Commun = {
  entree: Readonly<EntreeSiteGC>;
  /** Hauteur du garde-corps, main courante comprise (la norme de l'outil). */
  hauteurMm: number;
  /** Hauteur de la main courante au-dessus du sol. */
  mainCouranteMm: number;
  /** Jour entre l'appui et le bas du cadre. */
  jourMm: number;
  /** En étage avec une allège sous 900 mm : la loi impose la protection. */
  obligatoire: boolean;
};
/** Une configuration qui passe la norme : c'est elle qui est chiffrée, fabriquée et vendue. */
export type ConfigGC = Commun & {
  ok: true;
  conforme: true;
  carre: number;
  croix: number;
  /** Les barreaux droits du bas sont un choix (modèle « -b »), pas seulement une exigence de la norme. */
  barreauxBas: boolean;
  /** Une traverse au milieu de chaque croix (modèle « -t »). */
  traverse: boolean;
  /** Des barreaux verticaux et rien d'autre : ni croix, ni rosace, ni traverse (modèle « -s »). */
  seuls: boolean;
  /**
   * Fenêtre large : la lisse haute est raidie par un fer plat soudé dessus, caché sous une main courante plus
   * large (décision de Quentin, 04/10/2026). Ajouté seulement quand aucun carré de l'atelier n'est assez rigide.
   */
  renfort: boolean;
  /**
   * Fenêtre large et garde-corps bas : le nombre de pattes (0 à 4) du même carré que le cadre, soudées sous des montants et scellées
   * dans l'appui (décisions de Quentin, 05/10/2026). Ajoutées seulement quand rien ne passe sans elles, et le moins possible.
   */
  patte: number;
  /** Des barreaux droits en partie basse (le cadre commence dans la zone d'escalade, sous 600 mm du sol). */
  soubassement: boolean;
  /** Leur hauteur, du bas du cadre à la lisse qui les ferme (0 : aucun). */
  soubassementMm: number;
  /**
   * Le décor à volutes calculé (demande de Quentin, 06/10/2026) : l'outil le pose dans le cadre des barreaux seuls (seuls est
   * alors vrai, une seule « croix ») et contrôle la norme sur son dessin. Absent : pas de décor.
   */
  decor?: ChoixDecorGC;
  kg: number;
  v: Readonly<ValeursGC>;
  R: Readonly<ResultatGC>;
};
/** Rien ne passe (de 1 à 6 croix, carrés de 12 à 20, puis avec le fer plat de renfort) : pas de prix, « à étudier avec l'atelier ». */
export type ConfigAEtudierGC = Commun & {
  ok: false;
  conforme: false;
  raison: RaisonSansPrixGC;
  /** Ce qui bloque, au carré de 16, là où il y a le moins d'alertes. */
  alertes: CodeAlerteGC[];
};

function gelerProfond<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const x of Object.values(o as object)) gelerProfond(x);
  }
  return o;
}

/** Le relevé est-il dans les bornes des champs de l'outil ? */
export function entreeValide(e: EntreeSiteGC): boolean {
  const dans = (n: unknown, b: { min: number; max: number }) => Number.isInteger(n) && (n as number) >= b.min && (n as number) <= b.max;
  return (
    dans(e.largeurMm, BORNES_GC.B) &&
    dans(e.allegeMm, BORNES_GC.A) &&
    dans(e.fenetreMm, BORNES_GC.Hf) &&
    typeof e.enEtage === "boolean" &&
    (MAINS_COURANTES_GC as readonly string[]).includes(e.essence) &&
    (e.rosaceMm === undefined || ROSACES_MM_GC.includes(e.rosaceMm)) &&
    (e.modele === undefined || lireModeleGC(e.modele) !== null) &&
    (e.decor === undefined || lireDecorGC(e.decor) !== null) &&
    // Le mur des tableaux (facultatif) : un mur de la liste de l'outil, des cotes dans les bornes de ses champs.
    murDansLesBornes(e)
  );
}

/**
 * La clé d'un relevé pour les mémoires du calcul : ses cotes, la main courante (celle du client, ou celle du calcul), la
 * rosace, et le MUR avec ses cotes — deux relevés qui ne diffèrent que par le mur ne partagent jamais un résultat (la
 * fixation change le prix, le débit, et parfois la forme : des pattes, ou « à étudier »).
 */
function cleDuReleve(e: EntreeSiteGC, essence: string, avecDecor: readonly string[] = []): string {
  return JSON.stringify([e.largeurMm, e.allegeMm, e.enEtage, e.fenetreMm, essence, e.rosaceMm ?? 100, e.mur ?? "", e.tMurMm ?? null, e.eMurMm ?? null, ...avecDecor]);
}

// Le calcul prend quelques millisecondes à quelques dizaines : on garde les derniers relevés.
const MEMOIRE_MAX = 1500;
const memoire = new Map<string, ConfigGC | ConfigAEtudierGC>();

/**
 * Les essais déjà faits, par relevé : pour un carré, un nombre de croix, des barreaux et une traverse, les
 * alertes de l'outil (en codes). Le catalogue essaie jusqu'à 24 dessins dans 5 carrés : sans cette mémoire,
 * la recherche « sans choix » et le catalogue refaisaient les mêmes calculs, et une demande de prix prenait
 * une seconde.
 */
const ESSAIS_MAX = 30000;
const essais = new Map<string, readonly CodeAlerteGC[]>();
/**
 * Par relevé, par carré, avec ou sans fer plat de renfort : le carré est-il écarté d'office ? Deux contrôles de l'outil ne dépendent ni du
 * nombre de croix, ni des barreaux, ni de la traverse (un test le vérifie sur une grille) : la rigidité de la
 * lisse haute (« solidité ») et la place des vis dans le carré (« fixation » : avec la vis de l'atelier, les
 * carrés de 12 et de 14 ne passent jamais). Dès qu'un essai le dit, le carré est écarté pour tous les dessins
 * de ce relevé, sans refaire le calcul.
 */
const ecarte = new Map<string, readonly CodeAlerteGC[]>();
const SOLIDITE: readonly CodeAlerteGC[] = Object.freeze(["solidite"]);
const FIXATION: readonly CodeAlerteGC[] = Object.freeze(["fixation"]);
const FENETRE: readonly CodeAlerteGC[] = Object.freeze(["fenetre"]);
/** Le carré de référence du catalogue (le premier de l'atelier), pour le dessin des vides. */
const CARRE_REFERENCE = ORDRE_CARRES[0];
/** Les raisons qui écartent un carré entier : elles ne disent rien du dessin. */
const duCarre = (codes: readonly CodeAlerteGC[]) => codes.includes("solidite") || codes.includes("fixation");
/**
 * Avec un décor à volutes, les seules alertes qui dépendent du DESSIN du décor : ses vides (« Trous ») et l'appui pour le pied
 * (« Escalade »), contrôlés sur le dessin (normeDecorGC) ; « autre » par prudence. Toutes les autres (rigidité, fixation, charge
 * verticale, hauteur, jour, fenêtre…) ne regardent que le cadre, le même pour tous les décors d'une fenêtre (un test le vérifie).
 */
const DU_DECOR: readonly CodeAlerteGC[] = ["trous", "escalade", "autre"];
/**
 * La SONDE du cadre : le plus léger des décors (le médaillon, quelques pièces), calculé d'abord avec le même cadre. Ce qu'il
 * refuse au cadre, tout décor le refuse : le décor demandé (une grille, des cœurs sur un socle, dix fois plus long à contrôler)
 * n'est dessiné que pour un cadre qui tient.
 */
const DECOR_SONDE = idDecorGC(decorParDefautGC(DECORS_GC.assemblages.some((a) => a.id === "medaillon") ? "medaillon" : DECORS_GC.assemblages[0].id));
/**
 * Par relevé : la fenêtre est-elle trop basse pour ce garde-corps ? Cela ne dépend d'aucun dessin (la hauteur
 * est celle de la norme) : un seul essai le dit. Sans cette mémoire, une fenêtre trop basse faisait essayer
 * les 120 combinaisons de chaque ligne d'un panier — plusieurs secondes de calcul par requête forgée.
 */
const tropBasse = new Map<string, boolean>();

function garder<K, V>(m: Map<K, V>, cle: K, valeur: V, max: number) {
  m.set(cle, valeur);
  if (m.size > max) m.delete(m.keys().next().value!);
}

/** La fenêtre du relevé s'arrête-t-elle sous la main courante ? (l'alerte « La fenêtre est trop basse » de l'outil) */
function fenetreTropBasse(cleReleve: string, entree: EntreeSiteGC, seuls = false): boolean {
  if (!(entree.fenetreMm > 0)) return false;
  // Un cadre à barreaux seuls est plus bas qu'un cadre à croix (120 mm au lieu de 200) : il tient dans une ouverture où les croix ne tiennent pas.
  const cle = `${cleReleve}|${seuls ? "s" : "c"}`;
  const connu = tropBasse.get(cle);
  if (connu !== undefined) return connu;
  // Un essai simple (carré de 16, une croix, ou des barreaux seuls) : l'outil y contrôle toujours la fenêtre.
  const R = calculerGC({ ...(valeursGC(DEFAUTS_GC, entree, 16, 1, false, false, false, seuls) as ValeursGC), _rapide: true });
  const oui = R.alertes.map(codeAlerte).includes("fenetre");
  garder(tropBasse, cle, oui, ESSAIS_MAX);
  return oui;
}

/**
 * Les refus de la fixation dans le mur qui ne dépendent pas de la poussée sur le garde-corps (fixationMurGC, dans l'outil) :
 * le placo (le garde-corps se fixe dehors), la 1re fixation trop près de l'arête du mur, un carré trop fin pour la tige, un
 * montant de rive trop court pour écarter les fixations. Le refus « la fixation la plus chargée reprendrait… » n'y est pas :
 * il dépend de la poussée, une patte peut le lever. Un texte que l'outil écrirait autrement n'est reconnu par aucun : les
 * pattes sont alors essayées, comme avant (plus lent, jamais faux).
 */
const REFUS_SANS_POUSSEE: readonly RegExp[] = [
  /^sur étude — le placo est à l'intérieur/,
  /^sur étude — le tableau est trop peu profond/,
  /^sur étude — un carré de \d+ au moins/,
  /^sur étude — le montant de rive est trop court/,
];
/** Par relevé et par cadre : la fixation dans le mur est-elle « sur étude » quelle que soit la poussée ? (murSansRemede) */
const sansRemede = new Map<string, boolean>();
/** Ce que rend un essai avec des pattes quand le mur n'a pas de remède : l'alerte de la fixation, sans calcul. */
const MUR_SANS_REMEDE: { codes: readonly CodeAlerteGC[]; R: null; v: null } = Object.freeze({ codes: FIXATION, R: null, v: null });

/**
 * Par relevé et par cadre (carré, fer plat de renfort, barreaux seuls) : la fixation dans le mur est-elle « sur étude » quelle
 * que soit la poussée ? Alors aucune patte n'y peut rien — une patte ne fait que soulager les fixations des tableaux — et les
 * essais avec des pattes ne sont pas calculés : ils rendraient cette alerte (MUR_SANS_REMEDE). Sans ce contrôle, un mur en placo
 * (toujours sur étude) ou un cadre trop court pour écarter les fixations faisait calculer 1 à 4 pattes sur tous les dessins, pour
 * rien : une seconde par configuration au lieu de 0,1 s, 4 à 8 s pour la route (au lieu de 0,4), 11 à 18 s pour un panier de
 * 19 fenêtres (au lieu de 0,2).
 * Le contrôle : le même cadre (même hauteur, même carré, même mur, mêmes cotes du mur) sur la plus petite largeur de l'outil,
 * où la poussée est la plus faible (la largeur ne change ni la hauteur du cadre ni ses montants de rive : geomGC). S'il y est
 * encore « sur étude », pour une raison qui ne dépend pas de la poussée (REFUS_SANS_POUSSEE), aucune patte ne le sauvera.
 * (Le béton a deux montages, et l'outil n'écrit que le refus du dernier : à cette poussée, la tige du premier passe toujours,
 * le contrôle ne conclut donc jamais à tort.) Gardé par relevé, comme la fenêtre trop basse : le catalogue et les prix de
 * chaque main courante ne refont pas le contrôle.
 */
function murSansRemede(cleReleve: string, entree: EntreeSiteGC, s: number, r: boolean, seuls: boolean): boolean {
  if (!entree.mur) return false;
  const cle = `${cleReleve}|${s}|${r ? 1 : 0}|${seuls ? 1 : 0}`;
  const connu = sansRemede.get(cle);
  if (connu !== undefined) return connu;
  const v = valeursGC(DEFAUTS_GC, { ...entree, largeurMm: BORNES_GC.B.min }, s, 1, false, false, r, seuls) as ValeursGC;
  const F = calculerGC({ ...v, _rapide: true }).fixation as { statut?: unknown; texte?: unknown } | undefined;
  const texte = typeof F?.texte === "string" ? F.texte : "";
  const oui = F?.statut === "etude" && REFUS_SANS_POUSSEE.some((re) => re.test(texte));
  garder(sansRemede, cle, oui, ESSAIS_MAX);
  return oui;
}

/**
 * La clé d'un carré pour un relevé, sans ou avec le fer plat de renfort. Avec un mur donné, les barreaux seuls ont la leur
 * (« |s ») : la fixation dans le mur dépend de la longueur des montants de rive, et un cadre à barreaux seuls n'a pas la
 * hauteur d'un cadre à croix quand le jour sous le cadre est réduit (bas de fenêtre haut). Sans mur, rien ne change.
 */
const cleCarre = (cleReleve: string, s: number, r: boolean, p = 0, famille = "") => `${cleReleve}|${s}|${r ? 1 : 0}${p ? `|p${p}` : ""}${famille}`;

/**
 * La lisse haute est-elle trop souple dans TOUS les carrés de l'atelier (fenêtre large) ? C'est le seul cas où
 * le site ajoute le fer plat de renfort. À appeler après avoir essayé le plus gros carré : la rigidité ne
 * dépend pas du dessin, et un carré plus gros est toujours plus rigide.
 */
function lisseTropSouple(cleReleve: string, p = 0): boolean {
  const cle = cleCarre(cleReleve, Math.max(...ORDRE_CARRES), false, p);
  return ecarte.get(cle)?.includes("solidite") === true || ecarte.get(`${cle}|s`)?.includes("solidite") === true;
}

/** L'essence qui représente un type de main courante pour la recherche (même section, même calcul) : « chene » ou « chene-plat ». */
function representantMainCourante(id: EntreeSiteGC["essence"]): EntreeSiteGC["essence"] {
  const m = lireMainCouranteGC(id);
  return m?.type === "bois-rainure" ? "chene" : m?.type === "bois-plat" ? "chene-plat" : id;
}

/**
 * Un essai de l'outil (calcul rapide : mêmes alertes, sans chercher de solution à écrire dans leur texte). `cleCarres` : la clé
 * des carrés écartés (par défaut celle du relevé) ; avec un décor, elle est commune à tous les décors de la fenêtre.
 */
function essayer(cleReleve: string, entree: EntreeSiteGC, s: number, n: number, b: boolean, t: boolean, r = false, seuls = false, p = 0, cleCarres = cleReleve): { codes: readonly CodeAlerteGC[]; R: ResultatGC | null; v: ValeursGC | null } {
  if (tropBasse.get(cleReleve)) return { codes: FENETRE, R: null, v: null };
  const famille = entree.mur && seuls ? "|s" : "";
  const horsJeu = ecarte.get(cleCarre(cleCarres, s, r, p, famille));
  if (horsJeu) return { codes: horsJeu, R: null, v: null };
  const suite = `|${s}|${n}|${b ? 1 : 0}|${t ? 1 : 0}|${r ? 1 : 0}|${seuls ? 1 : 0}${p ? `|p${p}` : ""}`;
  const cle = `${cleReleve}${suite}`;
  const connus = essais.get(cle);
  if (connus?.length) return { codes: connus, R: null, v: null };
  // Avec un décor : ce que le CADRE refuse vaut pour tous les décors de la fenêtre (même carré, même renfort, mêmes pattes). Le
  // premier décor calculé le dit aux autres : la liste des prix des sept décors ne refait pas sept fois les mêmes essais.
  const cleCadre = entree.decor !== undefined ? `cadre|${cleCarres}${suite}` : null;
  const parLeCadre = cleCadre ? essais.get(cleCadre) : undefined;
  if (parLeCadre?.length) return { codes: parLeCadre, R: null, v: null };
  /** Ce que l'essai a donné, gardé en mémoire ; R et v seulement s'il passe. */
  const conclure = (brut: readonly CodeAlerteGC[], R: ResultatGC | null, v: ValeursGC | null) => {
    let codes = brut;
    // Le cadre refuse : seules ses raisons sont dites (le décor n'y est pour rien), les mêmes que la mémoire ait servi ou non.
    if (cleCadre) {
      const duCadre = codes.filter((c) => !DU_DECOR.includes(c));
      if (duCadre.length) {
        codes = duCadre;
        garder(essais, cleCadre, codes, ESSAIS_MAX);
      }
    }
    // Le carré lui-même ne convient pas (pas assez rigide, ou la vis n'y tient pas) : c'est la raison qui compte
    // pour ce carré, quel que soit le dessin.
    // (Avec la patte, la rigidité et la fixation dépendent du DESSIN — où tombe le montant du milieu, s'il y en a un : une seule
    // croix n'en a pas — : le carré n'est jamais écarté pour eux.)
    if (duCarre(codes) && !p) {
      codes = codes.includes("solidite") ? SOLIDITE : FIXATION;
      garder(ecarte, cleCarre(cleCarres, s, r, p, famille), codes, ESSAIS_MAX);
    }
    garder(essais, cle, codes, ESSAIS_MAX);
    // Sans alerte, le calcul rapide EST le calcul complet de l'outil (identiques au caractère près : un test le
    // vérifie avec l'empreinte de la référence) : inutile de le refaire.
    return { codes, R: codes.length ? null : R, v: codes.length ? null : v };
  };
  const alertesDe = (R: ResultatGC): CodeAlerteGC[] => [...new Set(R.alertes.map(codeAlerte))];
  // Avec un décor : le cadre d'abord, avec la sonde. S'il refuse, le décor demandé n'est pas dessiné.
  if (cleCadre && entree.decor !== DECOR_SONDE) {
    const sonde = alertesDe(calculerGC({ ...(valeursGC(DEFAUTS_GC, { ...entree, decor: DECOR_SONDE }, s, n, b, t, r, seuls, p) as ValeursGC), _rapide: true }));
    if (sonde.some((c) => !DU_DECOR.includes(c))) return conclure(sonde, null, null);
  }
  const v = valeursGC(DEFAUTS_GC, entree, s, n, b, t, r, seuls, p) as ValeursGC;
  const R = calculerGC({ ...v, _rapide: true });
  return conclure(alertesDe(R), R, v);
}

/**
 * La configuration choisie pour ce relevé (décision 2 du 29/09) : le carré de
 * 16 avec le moins de croix qui passe TOUTE la norme de l'outil (trous,
 * hauteur, soubassement, solidité, fenêtre) ; sinon les autres carrés de 12 à
 * 20 ; de 1 à 6 croix. Fenêtre large (aucun carré assez rigide seul) : le
 * carré de 16 avec un fer plat caché sous la main courante (04/10/2026).
 * Si rien ne passe : « à étudier ».
 */
export function configurerGC(e: EntreeSiteGC): ConfigGC | ConfigAEtudierGC {
  if (!entreeValide(e)) throw new RangeError("relevé de garde-corps hors des bornes de l'outil");
  // LE DÉCOR À VOLUTES (06/10/2026) : il remplace les croix. L'outil le pose dans le cadre des barreaux seuls et contrôle la
  // norme sur son dessin ; le modèle choisi est alors ignoré. Il n'est jamais choisi à la place du client.
  const decor = e.decor === undefined ? null : lireDecorGC(e.decor);
  const idDecor = decor ? idDecorGC(decor) : null;
  // Le modèle choisi par le client : ce DESSIN seul est essayé (croix, barreaux, traverse). S'il ne passe pas
  // la norme, rien n'est vendu. Le carré, lui, reste le choix de l'atelier (16 d'abord) : celui de
  // l'identifiant est indicatif — sinon le même dessin « sautait » quand une cote faisait changer de carré,
  // et un identifiant forgé pouvait obtenir un carré que l'atelier ne propose pas.
  const choisi = decor ? null : lireModeleGC(e.modele);
  // Toutes les mémoires dérivent de ces deux clés : le décor y entre (et seulement quand il y en a un : sans décor, les clés
  // d'avant ne changent pas).
  const avecDecor = idDecor ? [idDecor] : [];
  const cleReleve = cleDuReleve(e, e.essence, avecDecor);
  // La RECHERCHE ne dépend que du type de main courante : pin, hêtre, chêne et noyer ont la même section et le même calcul (seuls le
  // nom et le prix du bois changent). Les essais sont donc partagés entre les essences d'un même type (« chene » pour le bois rainuré,
  // « chene-plat » pour le bois sur fer plat) : dix fois moins de calcul pour les prix de chaque main courante.
  const essenceCalcul = representantMainCourante(e.essence);
  const cleCalcul = cleDuReleve(e, essenceCalcul, avecDecor);
  // Les carrés écartés (rigidité de la lisse haute, place des vis) ne dépendent que du cadre : tous les décors d'une fenêtre ont le
  // même (la hauteur d'un cadre à croix, le cadre des barreaux seuls). Ils se partagent donc cette mémoire — un test le vérifie
  // sur une grille de fenêtres : le premier décor calculé écarte les carrés pour les six autres (la liste des prix des décors).
  // (Le mur des tableaux et ses cotes y entrent : la fixation dépend du mur.)
  const cleCarres = decor ? JSON.stringify([e.largeurMm, e.allegeMm, e.enEtage, e.fenetreMm, essenceCalcul, "décor", e.mur ?? "", e.tMurMm ?? null, e.eMurMm ?? null]) : cleCalcul;
  // La mémoire est rangée par DESSIN (pas par identifiant) : « 16-4 » et « 18-4 » sont la même demande.
  const cle = `${cleReleve}|${choisi ? `${choisi.croix}|${choisi.barreauxBas ? 1 : 0}|${choisi.traverse ? 1 : 0}|${choisi.seuls ? 1 : 0}` : ""}`;
  const deja = memoire.get(cle);
  if (deja) {
    memoire.delete(cle);
    memoire.set(cle, deja);
    return deja;
  }
  const entree: EntreeSiteGC = Object.freeze({
    largeurMm: e.largeurMm, allegeMm: e.allegeMm, enEtage: e.enEtage, fenetreMm: e.fenetreMm, essence: e.essence,
    ...(e.rosaceMm !== undefined ? { rosaceMm: e.rosaceMm } : {}),
    ...(e.modele !== undefined && !idDecor ? { modele: e.modele } : {}),
    ...(idDecor ? { decor: idDecor } : {}),
    // Le mur des tableaux et ses cotes, quand le client les a donnés.
    ...champsMurGC(e),
  });
  const entreeCalcul: EntreeSiteGC = essenceCalcul === entree.essence ? entree : Object.freeze({ ...entree, essence: essenceCalcul });
  const carres: readonly number[] = ORDRE_CARRES;
  // Sans choix : d'abord 1 à 6 croix dans tous les carrés (les prix d'avant ne changent pas), puis seulement si
  // rien n'a passé, 7 à 12 croix — les fenêtres larges et basses que l'outil résout et que le site refusait.
  // Bas de fenêtre trop haut pour des croix mais pas pour un cadre à barreaux seuls (qui peut être plus bas) : c'est lui, et lui seul,
  // qu'on propose. « Jamais rien qui ne soit pas aux normes, mais toujours quelque chose » (Quentin, 05/10/2026).
  // (Avec un décor, l'outil garde la hauteur d'un cadre à croix — 200 mm au moins — : le cadre bas des barreaux seuls n'existe pas.)
  const baseSeuls = valeursGC(DEFAUTS_GC, entree, 16, 1, false, false, false, true);
  const soloSeuls = !decor && geomGC(valeursGC(DEFAUTS_GC, entree, 16, 1), 1).appui !== null && geomGC(baseSeuls, 1).appui === null;
  // Avec un décor : un seul dessin, le cadre des barreaux seuls rempli du décor (une « croix »).
  const plages: readonly (readonly [nMin: number, nMax: number])[] = soloSeuls || decor ? [[1, 1]] : choisi ? [[choisi.croix, choisi.croix]] : [[1, CROIX_CATALOGUE], [CROIX_CATALOGUE + 1, CROIX_MAX]];
  // Sans choix du client : les croix seules d'abord ; si rien ne passe, une traverse au milieu des croix (la
  // solution de l'outil : le même dessin, les vides coupés en deux) ; puis des barreaux droits en bas ; puis les deux.
  const variantes: readonly (readonly [barreaux: boolean, traverse: boolean, seuls: boolean])[] = soloSeuls || decor
    ? [[false, false, true]]
    : choisi
    ? [[choisi.barreauxBas, choisi.traverse, choisi.seuls]]
    : [[false, false, false], [false, true, false], [true, false, false], [true, true, false]];
  // La hauteur, le jour et la main courante annoncés sont ceux du dessin vendu : un cadre à barreaux seuls (choisi, ou seul possible)
  // se juge sur son propre minimum (120 mm), comme la case « barreaux seuls » de l'outil — à 760 mm : jour 90 et cadre de 175, non 65 et 200.
  // Avec un décor, le cadre des barreaux seuls garde le minimum d'un cadre à croix (valeursGC, geomGC : decorActif).
  const base = soloSeuls || choisi?.seuls || decor ? baseSeuls : valeursGC(DEFAUTS_GC, entree, 16, 1);
  const g = geomGC(base, 1);
  const commun: Commun = {
    entree,
    hauteurMm: g.Hr,
    mainCouranteMm: base.A + base.jour + g.Hr,
    jourMm: base.jour,
    obligatoire: base.etage && base.A < ALLEGE_LIBRE,
  };
  let resultat: ConfigGC | ConfigAEtudierGC | null = null;
  // LA MAIN COURANTE RESTE À LA HAUTEUR DE LA NORME (décision de Quentin, 04/10/2026) : la règle est dans
  // l'outil (geomGC.appui). Quand le bas de la fenêtre est assez haut pour qu'un garde-corps à croix dépasse
  // la norme, on n'en vend pas : une barre d'appui (sur devis) — ou rien, si la fenêtre est déjà assez haute.
  if (g.appui) {
    resultat = {
      ...commun,
      hauteurMm: BARRE_APPUI,
      mainCouranteMm: g.cible,
      jourMm: Math.max(0, g.cible - base.A - BARRE_APPUI),
      ok: false,
      conforme: false,
      raison: g.appui === "rien" ? "sans-garde-corps" : "barre-appui",
      alertes: [],
    };
    Object.freeze(resultat);
    garder(memoire, cle, resultat, MEMOIRE_MAX);
    return resultat;
  }
  // La fenêtre s'arrête sous la main courante : aucun dessin n'y changera rien (en applique, sur devis).
  if (fenetreTropBasse(cleCalcul, entreeCalcul, soloSeuls || decor !== null)) {
    resultat = { ...commun, ok: false, conforme: false, raison: "fenetre-trop-basse", alertes: [...FENETRE] };
    Object.freeze(resultat);
    garder(memoire, cle, resultat, MEMOIRE_MAX);
    return resultat;
  }
  /** Ce qui bloque, carré par carré (les essais du dessin choisi, ou des croix seules sans choix). */
  const blocages: (readonly CodeAlerteGC[])[] = [];
  let auCarre16: readonly CodeAlerteGC[] | null = null;
  let auCarre16Renfort = false;
  // D'abord sans renfort, dans tous les carrés. Ensuite, seulement si la lisse haute est trop souple dans tous
  // (fenêtre large) : le carré de l'atelier avec le fer plat caché sous la main courante.
  // Bois SUR FER PLAT, choisi par le client : le plat est posé d'office, dans tous les carrés de l'atelier (comme pour les barreaux seuls).
  const platVoulu = lireMainCouranteGC(entree.essence)?.type === "bois-plat";
  // Rien ne passe parce que les vis des tableaux sont trop tirées ou la lisse trop souple : on recommence avec la patte du milieu.
  let blocagesSansPatte: (readonly CodeAlerteGC[])[] = [], auCarre16SansPatte: readonly CodeAlerteGC[] | null = null;
  /** Un essai sans patte a buté sur la rigidité ou la fixation (avant que le fer plat ne remette les blocages à zéro). */
  let butePatte = false;
  // Une patte d'abord, puis deux… jusqu'à quatre : le moins de pattes qui passe.
  // Le moins de pattes qui puisse suffire, d'après le calcul de la patte (carré de 18, le plus fort) : chacune reprend au moins
  // q L / (k + 1) ; elle tient si q L / (k + 1) × (hauteur + jour) ≤ 235 × 18³ / 6. Une estimation par défaut (elle ne saute jamais
  // un nombre de pattes qui passerait) : on ne commence qu'à ce nombre-là, et au-delà de 4, la patte n'est pas essayée du tout.
  const rbMax = (235 * 18 ** 3 / 6) / (commun.hauteurMm + commun.jourMm) / 1000;
  const pattesMin = Math.max(1, Math.ceil((0.9 * entree.largeurMm / 1000) / rbMax) - 1);
  for (const patte of [0, 1, 2, 3, 4]) {
  if (patte) {
    if (resultat) break;
    if (!butePatte) break;
    if (patte < pattesMin) continue;
    if (patte > 1) { blocages.length = 0; auCarre16 = null; }
    if (patte === 1) {
      blocagesSansPatte = [...blocages];
      auCarre16SansPatte = auCarre16;
      blocages.length = 0;
      auCarre16 = null;
    }
  }
  recherche: for (const r of platVoulu ? [true] : [false, true]) {
    if (r && !platVoulu && !lisseTropSouple(cleCarres, patte)) break;
    // Avec le fer plat, la rigidité est réglée : seul compte ce qui bloque ENCORE (les essais qui suivent).
    if (r) blocages.length = 0;
    for (const [nMin, nMax] of plages) for (const [b, t, seuls] of variantes) {
      for (const s of r ? (seuls || platVoulu ? CARRES_RENFORT_SEULS : [CARRE_RENFORT]) : carres) {
        for (let n = nMin; n <= nMax; n++) {
          // Les pattes ne changent ni les vides ni la hauteur : inutile d'essayer un dessin dont les vides sont déjà hors norme, un dessin
          // sans assez de montants pour les poser, ou un carré de 12 ou 14 (trop faible pour une patte). Le calcul complet reste fait
          // pour tout le reste (sinon une fenêtre impossible coûtait plus de 10 s de calcul).
          // Avec des pattes, quand la fixation dans le mur est « sur étude » pour ce cadre quelle que soit la poussée (placo, montant trop
          // court…) : l'essai ne peut que buter sur elle — on le sait sans rien calculer, pas même les vides du dessin (murSansRemede).
          let murBloque = false;
          if (patte) {
            if (s < CARRE_RENFORT || (!seuls && n - 1 < patte)) continue;
            // La patte la plus chargée reprend au moins q L / (k + 1) : si, même ainsi, ce carré est trop faible, inutile de calculer.
            if ((0.9 * entree.largeurMm / 1000 / (patte + 1)) * 1000 * (commun.hauteurMm + commun.jourMm) / (s ** 3 / 6) > 235) continue;
            murBloque = murSansRemede(cleCalcul, entreeCalcul, s, r, seuls);
            if (!murBloque) {
              const vg = valeursGC(DEFAUTS_GC, entreeCalcul, s, n, b, t, r, seuls) as ValeursGC;
              if (!geomGC(vg, n).ok) continue;
            }
          }
          const essai = murBloque ? MUR_SANS_REMEDE : essayer(cleCalcul, entreeCalcul, s, n, b, t, r, seuls, patte, cleCarres);
          if (!patte && (essai.codes.includes("solidite") || essai.codes.includes("fixation"))) butePatte = true;
          if (essai.R && essai.v) {
            let { R, v } = essai;
            // Trouvé avec l'essence de calcul : on refait le calcul complet avec celle du client (nom et poids du bois dans le débit).
            if (essenceCalcul !== entree.essence) {
              v = valeursGC(DEFAUTS_GC, entree, s, n, b, t, r, seuls, patte) as ValeursGC;
              R = calculerGC({ ...v, _rapide: true });
              if (R.alertes.length) throw new Error("garde-corps : l'essence change le calcul de la norme");
            }
            if (!(R.hauteurGC! > 0) || !(R.kg! > 0)) throw new Error("garde-corps : calcul de l'outil incohérent");
            if (decor && !R.decorNom) throw new Error("garde-corps : l'outil n'a pas posé le décor demandé");
            const soubassementMm = geomGC(v, n).sb;
            // Des barreaux en bas demandés mais que l'outil n'a pas pu dessiner (cadre trop bas) : ce n'est pas ce modèle.
            if (b && !seuls && !(soubassementMm > 0)) {
              if (choisi) blocages.push(["trop-petit"]);
              continue;
            }
            resultat = { ...commun, ok: true, conforme: true, carre: s, croix: n, barreauxBas: b, traverse: t, seuls, renfort: r, patte, soubassement: soubassementMm > 0, soubassementMm, ...(decor ? { decor: Object.freeze({ ...decor }) } : {}), kg: R.kg!, v: gelerProfond(v), R: gelerProfond(R) };
            break recherche;
          }
          // (Un décor est un dessin choisi : ce qui le bloque se garde comme pour un modèle.)
          if (choisi || decor) blocages.push(essai.codes);
          // Sans choix : ce qui bloque au carré de 16, croix seules (la section du modèle), avec le moins d'alertes.
          // Avec le renfort, c'est ce qui bloque ENCORE qui compte (la rigidité, elle, est réglée par le plat).
          else if (s === 16 && !b && !t && !seuls && (!auCarre16 || r !== auCarre16Renfort || essai.codes.length < auCarre16.length)) { auCarre16 = essai.codes; auCarre16Renfort = r; }
        }
      }
    }
  }
  }
  // La patte n'a rien donné : on garde la raison d'avant (c'est elle qu'on explique au client).
  if (!resultat && blocagesSansPatte.length + (auCarre16SansPatte ? 1 : 0) > 0) {
    blocages.length = 0;
    blocages.push(...blocagesSansPatte);
    auCarre16 = auCarre16SansPatte;
  }
  if (!resultat) {
    // Pour un dessin choisi : la raison dans un carré qui convient s'il y en a un (« l'espace entre les barres
    // serait trop grand ») ; sinon ce qui écarte les carrés (la rigidité). Sans choix : ce qui bloque au carré de 16.
    const rigides = blocages.filter((c) => c.length > 0 && !duCarre(c)).sort((a, b) => a.length - b.length);
    const alertes: CodeAlerteGC[] = [...(choisi || decor ? (rigides[0] ?? blocages.find((c) => c.includes("solidite")) ?? blocages.find((c) => c.length > 0) ?? []) : (auCarre16 ?? []))];
    resultat = { ...commun, ok: false, conforme: false, raison: alertes.includes("fenetre") ? "fenetre-trop-basse" : "a-etudier", alertes };
  }
  Object.freeze(resultat);
  garder(memoire, cle, resultat, MEMOIRE_MAX);
  return resultat;
}

/** Un dessin du catalogue, pour une fenêtre : conforme (avec sa configuration complète) ou non. */
export type DessinGC =
  | { conforme: true; config: ConfigGC }
  | { conforme: false; carre: number; croix: number; barreauxBas: boolean; traverse: boolean; seuls: boolean; soubassementMm: number; raisons: CodeAlerteGC[]; trous: TrousGC | null };

/**
 * Les vides d'un dessin dans cette fenêtre, pour l'EXPLIQUER au client : le rond rouge (le vide trop grand) et les
 * ronds verts, ceux que l'outil de plans dessine sur ses modèles — sur TOUS les modèles, comme l'outil : un modèle
 * écarté pour sa fixation ou sa rigidité montre des ronds verts (ses vides sont bons) et la raison, au lieu de rien.
 * Calcul de géométrie seulement, sans les contrôles.
 */
function trousDuDessin(entree: EntreeSiteGC, n: number, b: boolean, t: boolean, renfort: boolean, seuls = false): TrousGC | null {
  const v = valeursGC(DEFAUTS_GC, entree, CARRE_REFERENCE, n, b, t, renfort, seuls) as ValeursGC;
  const g = geomGC(v, n);
  const trous = (g.trous ?? []) as { c: [number, number]; d: number; limite: number; ok: boolean }[];
  const s = Number(v.s), sb = Number(g.sb) || 0;
  const ronds: RondGC[] = [];
  const vus = new Set<string>();
  // Comme l'outil : un seul rond par taille (les panneaux sont tous pareils), placé dans le premier panneau.
  for (const x of trous) {
    // Une rosace plus grande que le vide le bouche entièrement : il n'y a plus de rond à montrer (et jamais de diamètre nul ou négatif).
    if (!(Math.round(x.d) >= 1)) continue;
    const cle = t ? `${Math.round(x.d)}|${x.ok}` : String(Math.round(x.d));
    if (vus.has(cle)) continue;
    vus.add(cle);
    ronds.push({ x: Math.round(s + x.c[0]), y: Math.round(s + sb + x.c[1]), d: Math.round(x.d), ok: x.ok });
  }
  // Le vide entre les barreaux du bas, quand le cadre en a.
  if (sb > 0) {
    const dS = Math.min(Number(g.videS), Number(g.hb));
    if (Number.isFinite(dS) && dS > 0) ronds.push({ x: Math.round(s + Number(g.videS) / 2), y: Math.round(s + Number(g.hb) / 2), d: Math.round(dS), ok: dS < Number(g.limiteS) });
  }
  ronds.sort((a, b2) => a.x - b2.x);
  if (!ronds.length || !Number.isFinite(g.dMax) || !(g.Lc > 0) || !(g.Hc > 0)) return null;
  return { cadreMm: { l: Math.round(g.Lc), h: Math.round(Number(g.Hc)) }, plusGrandMm: Math.max(0, Math.round(g.dMax)), limiteMm: Math.round(g.limite) - MARGE_BOULE, ronds: ronds.slice(0, 12) };
}

/**
 * Le CATALOGUE des dessins pour cette fenêtre : de 1 à 6 croix ; croix seules,
 * avec une traverse au milieu, avec des barreaux droits en bas, ou les deux. Chaque dessin est essayé dans chaque carré,
 * dans l'ordre de l'atelier (16 d'abord) : le premier qui passe toute la
 * norme est retenu et chiffré ; si aucun ne passe, le dessin est montré
 * « hors norme » — visible, jamais vendu.
 */
export function catalogueGC(e: EntreeSiteGC): DessinGC[] {
  // Le catalogue des modèles ne dépend ni du modèle choisi ni du décor : avec ou sans décor, les mêmes dessins, aux mêmes prix.
  const { modele: _ignore, decor: _sansDecor, ...sansChoix } = e;
  void _ignore;
  void _sansDecor;
  // Barre d'appui, ou rien à poser : aucun modèle à croix. Bas de fenêtre trop haut pour des croix mais pas pour un cadre à
  // barreaux seuls (plus bas) : ce cadre, et lui seul.
  const croixImpossibles = geomGC(valeursGC(DEFAUTS_GC, sansChoix, 16, 1), 1).appui !== null;
  if (croixImpossibles && geomGC(valeursGC(DEFAUTS_GC, sansChoix, 16, 1, false, false, false, true), 1).appui !== null) return [];
  // Un dessin = un nombre de croix, des barreaux en bas ou non (demandés, ou imposés par la norme), une traverse ou non.
  const dessins = new Map<string, DessinGC>();
  const cleReleve = cleDuReleve(e, e.essence);
  // L'ordre du catalogue : les croix seules, puis avec une traverse au milieu, puis avec des barreaux en bas,
  // puis les deux — de 1 à 6 croix chaque fois (de 7 à 12 : seulement les modèles aux normes).
  // (Cinquième famille : les barreaux seuls — des barreaux verticaux et rien d'autre, un seul dessin.)
  for (const [b, t, p] of ([[false, false, false], [false, true, false], [true, false, false], [true, true, false], [false, false, true]] as const).filter(([, , seuls]) => seuls || !croixImpossibles)) {
    // De 7 à 12 croix : seulement quand AUCUN modèle de 1 à 6 croix de cette famille n'est aux normes (une fenêtre
    // large et basse). Sinon le catalogue se remplirait de dessins très serrés pour une fenêtre ordinaire.
    let assezDeCroix = false;
    for (let n = 1; n <= (p ? 1 : CROIX_MAX); n++) {
      if (n > CROIX_CATALOGUE && assezDeCroix) break;
      // Le dessin dans le premier carré de l'atelier qui passe toute la norme (configurerGC les essaie dans l'ordre).
      const c = configurerGC({ ...sansChoix, modele: idModeleGC(16, n, b, t, p) });
      if (c.ok) {
        if (n <= CROIX_CATALOGUE) assezDeCroix = true;
        // Le même dessin par deux chemins (les barreaux que la norme impose déjà) : une seule fois — et s'il
        // n'était « hors norme » que par l'autre chemin, c'est le dessin conforme qu'on garde.
        const cle = [c.croix, c.soubassementMm > 0, t, p].join("|");
        if (!dessins.get(cle)?.conforme) dessins.set(cle, { conforme: true, config: c });
      } else {
        // Au-delà de 6 croix, le catalogue ne montre que les modèles aux normes (douze croix hors norme : du bruit).
        if (n > CROIX_CATALOGUE) continue;
        // (Fenêtre large : avec le fer plat de renfort, le cadre est plus bas — c'est ce cadre-là qu'on regarde.)
        const sb = Math.max(0, Math.round(geomGC(valeursGC(DEFAUTS_GC, sansChoix, 16, n, b, t, lisseTropSouple(cleReleve)), n).sb || 0));
        // Des barreaux en bas que l'outil ne peut pas dessiner (garde-corps trop bas) : ce dessin n'existe pas
        // pour cette fenêtre. Le montrer ferait un jumeau « hors norme » du même dessin sans barreaux.
        if (b && !p && sb === 0) continue;
        const cle = [n, b || sb > 0, t, p].join("|");
        // La raison donnée au client : ce qui bloque ce dessin (configurerGC).
        if (!dessins.has(cle)) dessins.set(cle, { conforme: false, carre: 16, croix: n, barreauxBas: b, traverse: t, seuls: p, soubassementMm: sb, raisons: [...c.alertes], trous: trousDuDessin(sansChoix, n, b, t, lisseTropSouple(cleReleve), p) });
      }
    }
  }
  return [...dessins.values()];
}

const prixMemo = new WeakMap<ConfigGC, number>();

/** Le prix d'UNE pièce : le prix conseillé de l'outil (arrondi à la dizaine au-dessus du plancher). */
export function prixGC(config: ConfigGC): number {
  if (!config.ok) throw new Error("pas de prix pour un garde-corps à étudier");
  const deja = prixMemo.get(config);
  if (deja !== undefined) return deja;
  const prix = chiffrage().chiffrerGC(config.R, config.v).conseille;
  if (!Number.isInteger(prix) || prix <= 0) throw new Error("garde-corps : prix de l'outil invalide");
  prixMemo.set(config, prix);
  return prix;
}

export type LigneCommandeGC = { config: ConfigGC; quantite: number };

function verifierLignes(lignes: LigneCommandeGC[]) {
  if (!lignes.length) throw new RangeError("commande de garde-corps vide");
  for (const l of lignes) {
    if (!l.config?.ok) throw new Error("pas de prix pour un garde-corps à étudier");
    if (!Number.isInteger(l.quantite) || l.quantite < 1) throw new RangeError("quantité de garde-corps invalide");
  }
}

/**
 * Plusieurs garde-corps dans une commande (décision 3 du 29/09) : les frais
 * fixes de l'atelier ne sont comptés qu'une fois, et les frais fixes du
 * paiement aussi (un seul paiement) ; le prix de la commande est recalculé
 * par la formule du plancher de l'outil, arrondi à la dizaine au-dessus :
 * jamais sous le plancher. La remise = ce prix − la somme des prix unitaires
 * (0 ou négative). Une seule pièce : exactement le prix de l'outil.
 */
export function prixCommandeGC(lignes: LigneCommandeGC[]): { pieces: number; sommeUnitaires: number; prix: number; remise: number } {
  verifierLignes(lignes);
  const { chiffrerGC, REGLAGES } = chiffrage();
  const pieces = lignes.reduce((t, l) => t + l.quantite, 0);
  const sommeUnitaires = lignes.reduce((t, l) => t + l.quantite * prixGC(l.config), 0);
  if (pieces === 1) return { pieces, sommeUnitaires, prix: sommeUnitaires, remise: 0 };
  const { fraisFixes, stripeFixe, cotis, stripePct, tvaVente } = REGLAGES;
  const cout = lignes.reduce((t, l) => t + l.quantite * chiffrerGC(l.config.R, l.config.v).cout, 0) - (pieces - 1) * fraisFixes;
  const plancher = (cout + stripeFixe) / ((1 - cotis) / (1 + tvaVente) - stripePct);   // la formule de chiffrerGC
  const prix = Math.min(sommeUnitaires, Math.ceil(plancher / 10) * 10);
  return { pieces, sommeUnitaires, prix, remise: prix - sommeUnitaires };
}

export type ModeRemiseGC = "transporteur" | "pose" | "retrait";

/**
 * La livraison d'une commande de garde-corps, comptée par l'outil (remiseGC,
 * mêmes règles que src/lib/deplacement.ts) : le poids de toutes les pièces,
 * la plus grande cote pour le hors gabarit. Retrait à l'atelier : 0 €.
 * km : distance à vol d'oiseau depuis Saumur.
 *
 * POUR LES TESTS SEULEMENT : elle prouve que le panier livre au prix de
 * l'outil. Elle pèse le garde-corps de l'outil, SANS le verre (l'outil ne le
 * connaît pas) ; le site, lui, livre au poids de la ligne, verre compris
 * (tarifer, src/lib/tarif-panier.ts, et livraisonDevisGC pour le devis). Elle
 * n'est donc pas exportée par src/lib/prix-garde-corps.server.ts : aucune
 * route ne peut l'utiliser (un test le vérifie).
 */
export function livraisonGC(lignes: LigneCommandeGC[], mode: ModeRemiseGC, km: number): { prix: number; kg: number } {
  verifierLignes(lignes);
  if (!["transporteur", "pose", "retrait"].includes(mode)) throw new RangeError("mode de livraison inconnu");
  if (!Number.isFinite(km) || km < 0) throw new RangeError("distance invalide");
  const kg = lignes.reduce((t, l) => t + l.quantite * l.config.kg, 0);
  const B = Math.max(...lignes.map((l) => l.config.v.B));
  const hauteurGC = Math.max(...lignes.map((l) => l.config.R.hauteurGC!));
  const { prix } = chiffrage().remiseGC({ kg, hauteurGC }, { B, remise: mode, km });
  return { prix, kg };
}
