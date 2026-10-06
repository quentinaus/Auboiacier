/**
 * Le garde-corps du SITE, chiffré par l'outil de plans : ce que les routes et
 * les pages du serveur utilisent (prix d'une pièce avec ses options, remise
 * d'une commande, « à partir de », réponse de /api/prix-garde-corps).
 *
 * SERVEUR SEULEMENT. Le site l'importe par src/lib/prix-garde-corps.server.ts
 * (import "server-only") ; les tests l'importent directement. Rien ici ne
 * part vers le navigateur, sauf ce que reponsePrixGC construit champ par
 * champ : un prix de vente et une forme, jamais un coût.
 */
import { catalogueGC, configurerGC, prixCommandeGC, prixGC, ChiffrageIndisponible, type ConfigAEtudierGC, type ConfigGC, type DessinGC } from "./calcul.ts";
import { MAINS_COURANTES_GC, type EntreeSiteGC, type MainCouranteGC, valeursGC } from "./entree.ts";
import { RENFORT, calculerGC, geomGC, mtAlleger, planA3Pur, DEFAUTS_GC, type ResultatGC, type ValeursGC } from "./moteur.genere.mjs";
import { getProduct, priceFrom, prixParOutil, resolveSelection, SLUG_GC_FORGE, SUR_MESURE, type PrixReleve, type Product } from "../products.ts";
import { BORNES_RELEVE_GC, DECOR_NOMBRES_MAX, MODELES_GC_MAX, RELEVE_DEPART_GC, ROSACE_DEFAUT_GC, ROSACE_MM_GC, decorParDefautGC, diametreRosaceGC, idDecorGC, idModeleGC, lireDecorGC, lireMainCouranteGC, lireModeleGC, releveDansLesBornes, type ChoixDecorGC, type DecorReponseGC, type DecorTraitGC, type MainsPrixGC, type ModeleGC, type PlanApercuGC, type PrixDecorGC, type ReleveGC, type ReponsePrixGC, STATUTS_FIXATION_GC, TEXTE_FIXATION_GC_MAX, champsMurGC, estMurFixationGC, lireMurParametresGC, type FixationGC, type MurFixationGC, type StatutFixationGC } from "../garde-corps.ts";
import { DECORS_GC } from "../garde-corps-decors.genere.ts";
import type { CalculGC } from "../tarif-panier.ts";
import { estSlugPortail } from "../portails.ts";
import { prixDepartPortail } from "../portails-outil/prix.ts";

/** L'identifiant du garde-corps de fenêtre au catalogue. */
export const SLUG_GC = "garde-corps";
/** Le Garde-corps forgé à volutes (07/10/2026) : le même garde-corps, avec un décor à volutes, sur sa propre fiche. */
export { SLUG_GC_FORGE };

/** La fiche d'un relevé : celle du Garde-corps forgé à volutes s'il a un décor, sinon celle du garde-corps Rosace. */
export const slugGC = (releve: Pick<ReleveGC, "decor">) => (releve.decor !== undefined ? SLUG_GC_FORGE : SLUG_GC);

function produitGC(slug: string = SLUG_GC): Product {
  const p = getProduct(slug);
  if (!p || !prixParOutil(p)) throw new Error(`${slug} : fiche introuvable au catalogue`);
  return p;
}

const estEssence = (x: string): x is MainCouranteGC => (MAINS_COURANTES_GC as readonly string[]).includes(x);

function entreeGC(releve: ReleveGC, essence: MainCouranteGC, rosaceMm?: number): EntreeSiteGC {
  return {
    largeurMm: releve.largeurMm, allegeMm: releve.allegeMm, enEtage: releve.enEtage, fenetreMm: releve.fenetreMm, essence,
    ...(rosaceMm !== undefined ? { rosaceMm } : {}),
    ...(releve.modele !== undefined ? { modele: releve.modele } : {}),
    ...(releve.decor !== undefined ? { decor: releve.decor } : {}),
    // Le mur des tableaux et ses cotes, quand le client les a donnés : l'outil y choisit la fixation et la chiffre.
    ...champsMurGC(releve),
  };
}

/** La fixation que l'outil a retenue (R.fixation), quand un mur lui a été donné. */
type FixationMoteur = { mur: MurFixationGC; mode: string; statut: string; texte: string; texteClient?: string };
function fixationMoteur(R: Readonly<ResultatGC>): FixationMoteur | null {
  const F = R.fixation as Partial<Record<keyof FixationMoteur, unknown>> | undefined;
  if (!F || typeof F !== "object" || !estMurFixationGC(F.mur) || typeof F.mode !== "string" || typeof F.statut !== "string" || typeof F.texte !== "string") return null;
  return { mur: F.mur, mode: F.mode, statut: F.statut, texte: F.texte, ...(typeof F.texteClient === "string" ? { texteClient: F.texteClient } : {}) };
}

/**
 * Le statut que le site montre : ceux de l'outil tels quels (valide, indicatif, étude). Un autre statut de l'outil (« sous
 * réserve d'essais ») se lit comme un prix indicatif quand il y a un prix — il reste à confirmer —, sinon comme une étude.
 */
function statutFixation(statut: string, avecPrix: boolean): StatutFixationGC {
  if ((STATUTS_FIXATION_GC as readonly string[]).includes(statut) && !(avecPrix && statut === "etude")) return statut as StatutFixationGC;
  return avecPrix ? "indicatif" : "etude";
}

/**
 * Ce que la route dit de la fixation : le statut, le mur, et le texte POUR LE CLIENT que l'outil écrit (texteClient : simple,
 * sans les valeurs d'atelier ; à défaut, le texte d'atelier), borné. Jamais un coût.
 */
function fixationPourLeSite(F: FixationMoteur, avecPrix: boolean): FixationGC {
  const brut = F.texteClient ?? F.texte;
  const texte = brut.length <= TEXTE_FIXATION_GC_MAX ? brut : `${brut.slice(0, TEXTE_FIXATION_GC_MAX - 1).replace(/\s+\S*$/, "")}…`;
  return { statut: statutFixation(F.statut, avecPrix), mur: F.mur, texte };
}

/** La configuration de l'outil pour ce relevé, ou null s'il sort des bornes des champs de l'outil. */
export function configurationGC(releve: ReleveGC, essence: string, rosaceMm?: number): ConfigGC | ConfigAEtudierGC | null {
  if (!estEssence(essence) || !releveDansLesBornes(releve)) return null;
  return configurerGC(entreeGC(releve, essence, rosaceMm));
}

/** Le calcul de l'outil, sous la forme que products.ts attend (resolveSelection). */
export const prixReleveOutil: PrixReleve = (e) => {
  const c = configurationGC(e, e.essence, e.rosaceMm);
  if (!c) return { ok: false, raison: "hors-bornes" };
  // Barre d'appui ou rien à poser : pour le panier, c'est « à étudier » (pas de prix, pas de commande).
  if (!c.ok) return { ok: false, raison: c.raison === "fenetre-trop-basse" ? c.raison : "a-etudier" };
  // La fixation retenue dans le mur, quand le client l'a donné : elle est dans le prix, et le libellé de la commande la nomme.
  const F = fixationMoteur(c.R);
  const fixation = F ? { mur: F.mur, mode: F.mode, statut: statutFixation(F.statut, true) } : undefined;
  return {
    ok: true, prix: prixGC(c), hauteurMm: c.hauteurMm, croix: c.croix, carre: c.carre, soubassement: c.soubassement, traverse: c.traverse, seuls: c.seuls, renfort: c.renfort, patte: c.patte, kg: c.kg,
    // Le nom du décor, celui de l'outil (« Frise de volutes en S ») : le libellé de commande le porte ; et la frise basse retirée.
    ...(c.decor && typeof c.R.decorNom === "string" ? { decorNom: c.R.decorNom } : {}),
    ...(c.decor && friseRetiree(c) ? { decorFriseRetiree: true } : {}),
    ...(fixation ? { fixation } : {}),
  };
};

/** La frise basse demandée a-t-elle été retirée par l'outil ? (Au ras du sol, ses vagues feraient des marches : NF P01-012.) */
function friseRetiree(c: ConfigGC): boolean {
  return c.decor?.friseBasse === "postes" && (c.R.decor as { ch?: { friseBasse?: string } } | undefined)?.ch?.friseBasse !== "postes";
}

/** La remise d'une commande de plusieurs garde-corps : frais fixes une fois, jamais sous le plancher. */
export function remiseCommandeGC(lignes: { releve: ReleveGC; essence: string; quantite: number; rosaceMm?: number }[]): number {
  if (!lignes.length) return 0;
  const commande = lignes.map((l) => {
    const c = configurationGC(l.releve, l.essence, l.rosaceMm);
    if (!c?.ok) throw new Error("remise : garde-corps sans prix");
    return { config: c, quantite: l.quantite };
  });
  return prixCommandeGC(commande).remise;
}

/** Ce que le tarif du panier (src/lib/tarif-panier.ts) reçoit pour chiffrer un garde-corps. */
export const CALCUL_GC: CalculGC = { prixReleve: prixReleveOutil, remise: remiseCommandeGC };

/**
 * La ligne d'un garde-corps, options comprises (le même calcul que le panier
 * et la commande). Une option ABSENTE est celle du modèle (noir, fleur,
 * croix) : la même règle pour la route du prix, le devis PDF et l'aperçu de
 * la livraison. Une option inconnue est refusée (unknown_metal…). Le panier,
 * lui, envoie toujours les trois (resolveSelection les exige).
 */
export function ligneGC(
  releve: ReleveGC,
  options: { woodId: string; metalId?: string; fabricId?: string; remplissageId?: string },
  locale: "fr" | "en" = "fr"
) {
  const slug = slugGC(releve);
  const modele = produitGC(slug);
  // Le forgé n'a ni rosace ni verre : son décor remplit le cadre (une rosace envoyée serait refusée, unknown_fabric).
  const forge = releve.decor !== undefined;
  return resolveSelection(
    {
      slug,
      sizeId: SUR_MESURE,
      largeurMm: releve.largeurMm,
      allegeMm: releve.allegeMm,
      enEtage: releve.enEtage,
      fenetreMm: releve.fenetreMm,
      modeleGc: releve.modele,
      ...(releve.decor !== undefined ? { decorGc: releve.decor } : {}),
      // Le mur des tableaux (facultatif) : la fixation entre dans le prix.
      murGc: releve.mur,
      tMurMm: releve.tMurMm,
      eMurMm: releve.eMurMm,
      woodId: options.woodId,
      metalId: options.metalId ?? modele.metals[0]?.id,
      fabricId: forge ? undefined : (options.fabricId ?? modele.fabrics?.[0]?.id),
      remplissageId: forge ? undefined : (options.remplissageId ?? modele.remplissages?.[0]?.id),
      locale,
    },
    prixReleveOutil
  );
}

/* ------------------------------------------------------------------ *
 *  La route /api/prix-garde-corps
 * ------------------------------------------------------------------ */

/**
 * Les paramètres acceptés par /api/prix-garde-corps. Tout autre paramètre = refus. « decor » : le décor à volutes choisi
 * (idDecorGC) ; « decors=1 » : demander aussi le prix de chaque assemblage de décor (PrixDecorGC) ; « mur », « c », « ep » : le
 * mur des tableaux et ses cotes (facultatifs).
 */
export const PARAMETRES_PRIX_GC = ["l", "allege", "etage", "fenetre", "wood", "metal", "fabric", "remplissage", "qty", "modele", "decor", "decors", "mur", "t", "ep"] as const;

export type RequetePrixGC = {
  releve: ReleveGC;
  essence: MainCouranteGC;
  metalId?: string;
  fabricId?: string;
  remplissageId?: string;
  quantite: number;
  /** Rendre aussi le prix de chaque assemblage de décor (PrixDecorGC). */
  decors?: boolean;
};

/**
 * Lit le relevé dans l'adresse (?l=1180&allege=650&etage=1&fenetre=1400&wood=chene&metal=noir&fabric=fleur&remplissage=croix&qty=2).
 * Refuse tout ce qui n'est pas exactement attendu : entiers de millimètres
 * dans les bornes de l'outil, étage 1 ou 0, un bois connu, des identifiants
 * d'option courts, une quantité de 1 à 10, aucun paramètre inconnu ou en
 * double. « fenetre » peut manquer (0 = inconnue) ; les options aussi (celles
 * du modèle). Le mur des tableaux aussi (&mur=beton&t=180&ep=450) : un mur de
 * la liste de l'outil, des cotes entières dans leurs bornes, jamais une cote
 * sans mur.
 */
export function lireRequetePrixGC(params: URLSearchParams): RequetePrixGC | null {
  const cles = [...params.keys()];
  if (new Set(cles).size !== cles.length) return null;
  if (cles.some((k) => !(PARAMETRES_PRIX_GC as readonly string[]).includes(k))) return null;
  const mm = (cle: string, b: { min: number; max: number }, defaut?: number) => {
    const t = params.get(cle);
    if (t === null) return defaut ?? null;
    if (!/^\d{1,5}$/.test(t)) return null;
    const n = Number(t);
    return n >= b.min && n <= b.max ? n : null;
  };
  const option = (cle: string) => {
    const t = params.get(cle);
    return t === null ? undefined : /^[a-z0-9-]{1,40}$/.test(t) ? t : null;
  };
  const largeurMm = mm("l", BORNES_RELEVE_GC.largeurMm);
  const allegeMm = mm("allege", BORNES_RELEVE_GC.allegeMm);
  const fenetreMm = mm("fenetre", BORNES_RELEVE_GC.fenetreMm, 0);
  const quantite = mm("qty", { min: 1, max: 10 }, 1);
  const etage = params.get("etage");
  const essence = params.get("wood");
  const metalId = option("metal");
  const fabricId = option("fabric");
  const remplissageId = option("remplissage");
  if (largeurMm === null || allegeMm === null || fenetreMm === null || quantite === null) return null;
  if (etage !== "1" && etage !== "0") return null;
  if (!essence || !estEssence(essence)) return null;
  if (metalId === null || fabricId === null || remplissageId === null) return null;
  const modele = params.get("modele");
  if (modele !== null && !lireModeleGC(modele)) return null;
  // Le décor à volutes : un identifiant illisible est refusé ; un décor sous un panneau de verre aussi (le verre remplace les
  // croix, le décor aussi : les deux ne vont pas ensemble). Avec un décor, le modèle ne compte pas (configurerGC l'ignore).
  const decor = params.get("decor");
  const choixDecor = decor === null ? null : lireDecorGC(decor);
  if (decor !== null && !choixDecor) return null;
  if (choixDecor && produitGC().remplissages?.find((r) => r.id === remplissageId)?.sansCroix === true) return null;
  const decors = params.get("decors");
  if (decors !== null && decors !== "1") return null;
  const mur = lireMurParametresGC(params);
  if (mur === null) return null;
  return {
    releve: { largeurMm, allegeMm, enEtage: etage === "1", fenetreMm, ...(choixDecor ? { decor: idDecorGC(choixDecor) } : modele ? { modele } : {}), ...mur },
    essence, metalId, fabricId, remplissageId, quantite,
    ...(decors === "1" ? { decors: true } : {}),
  };
}

/**
 * Les rosaces de repli, de la moins chère à la plus chère. Un dessin qui ne passe pas la norme avec la rosace choisie est
 * essayé avec la première de ces rosaces plus GRANDE que la choisie (une plus grande bouche plus le centre des croix : les
 * vides sont plus petits). Décision de Quentin, 05/10/2026 : « c'est à toi de faire la meilleure configuration en fonction
 * de la taille de la rosace, des espaces et du prix, et tu lui proposes » — pas au client de chercher.
 */
const ROSACES_REPLI_GC = ["fleur"] as const;

/**
 * La rosace qui compte pour la norme : celle choisie par le client, sauf sous un panneau de verre (il n'y a plus de croix, donc
 * plus de rosace : le panier calcule alors avec la fleur par défaut, la route et l'aperçu du plan doivent faire pareil).
 */
function rosaceDeLaRequete(q: RequetePrixGC): string | undefined {
  const sousVerre = produitGC().remplissages?.find((r) => r.id === q.remplissageId)?.sansCroix === true;
  return sousVerre ? undefined : q.fabricId;
}

/** Ce qui fait « le même dessin » d'un catalogue à l'autre : croix, barreaux en bas, traverse, barreaux seuls. */
const cleDessin = (d: DessinGC) =>
  d.conforme
    ? `${d.config.croix}|${d.config.soubassementMm > 0}|${d.config.traverse}|${d.config.seuls}`
    : `${d.croix}|${d.barreauxBas || d.soubassementMm > 0}|${d.traverse}|${d.seuls}`;

/**
 * Le catalogue des dessins, tel qu'il part vers le navigateur : chaque dessin conforme à son prix (le calcul du panier),
 * avec la rosace qu'il demande — la choisie par le client quand elle suffit, sinon la plus petite plus grande qui le
 * permet (ModeleGC.rosace). Les dessins que seule une plus grande rosace permet sont proposés aussi.
 */
function catalogueSiteGC(q: RequetePrixGC, hauteurMm: number): ModeleGC[] {
  const choisie = rosaceDuCatalogue(q);
  const base = catalogueGC(entreeGC(q.releve, q.essence, diametreRosaceGC(choisie)));
  const repli = ROSACES_REPLI_GC.filter((id) => diametreRosaceGC(id) > diametreRosaceGC(choisie)).map((id) => ({
    id: id as string,
    dessins: new Map(catalogueGC(entreeGC(q.releve, q.essence, diametreRosaceGC(id))).map((d) => [cleDessin(d), d] as const)),
  }));
  const modeles: ModeleGC[] = [];
  const ajouteConforme = (m: ConfigGC, rosaceId: string) => {
    const id = idModeleGC(m.carre, m.croix, m.barreauxBas, m.traverse, m.seuls);
    // Barreaux seuls : pas de rosace, ni à choisir ni à payer.
    const l = ligneGC({ ...q.releve, modele: id }, { woodId: q.essence, metalId: q.metalId, fabricId: rosaceId, remplissageId: q.remplissageId });
    if (l.ok && l.line.gc) modeles.push({ id, conforme: true, raisons: [], croix: m.croix, carre: m.carre, soubassementMm: m.soubassementMm, traverse: m.traverse, seuls: m.seuls, rosace: m.seuls ? "" : rosaceId, trous: null, renfort: m.renfort, patte: m.patte, hauteurMm: l.line.gc.hauteurMm, prix: l.line.unitPrice, kg: Math.round(l.line.gc.kg) });
  };
  const vus = new Set<string>();
  for (const d of base) {
    const cle = cleDessin(d);
    vus.add(cle);
    if (d.conforme) {
      ajouteConforme(d.config, choisie);
      continue;
    }
    // Pas aux normes avec la rosace choisie : la première plus grande qui le permet, si une le permet.
    const autre = repli.map((r) => ({ id: r.id, d: r.dessins.get(cle) })).find((r) => r.d?.conforme);
    if (autre?.d?.conforme) {
      ajouteConforme(autre.d.config, autre.id);
      continue;
    }
    modeles.push({ id: idModeleGC(d.carre, d.croix, d.barreauxBas, d.traverse, d.seuls), conforme: false, raisons: d.raisons, croix: d.croix, carre: d.carre, soubassementMm: d.soubassementMm, traverse: d.traverse, seuls: d.seuls, rosace: d.seuls ? "" : choisie, trous: d.trous, renfort: false, patte: 0, hauteurMm, prix: 0, kg: 0 });
  }
  // Les dessins que le catalogue de la rosace choisie ne montre pas (7 à 12 croix) mais qu'une plus grande permet.
  for (const r of repli) for (const [cle, d] of r.dessins) {
    if (vus.has(cle) || !d.conforme) continue;
    vus.add(cle);
    ajouteConforme(d.config, r.id);
  }
  return modeles.slice(0, MODELES_GC_MAX);
}

/**
 * Le prix d'UNE pièce avec chaque main courante (bois rainuré, bois sur fer plat, acier plat, acier profilé), à
 * la même fenêtre et aux mêmes options. Le modèle déjà choisi est gardé quand la main courante l'accepte ; sinon le moteur
 * propose le dessin qui convient (c'est ce que fera le panier). Une main courante qui ne passe pas la norme pour cette
 * fenêtre n'est pas dans la liste : le client ne peut pas la choisir (« jamais hors norme, mais toujours une proposition »).
 */
function prixParMainCourante(q: RequetePrixGC): MainsPrixGC {
  const mains: MainsPrixGC = {};
  const { modele, ...sansModele } = q.releve;
  for (const id of MAINS_COURANTES_GC) {
    const options = { woodId: id, metalId: q.metalId, fabricId: q.fabricId, remplissageId: q.remplissageId };
    const gardee = modele ? ligneGC(q.releve, options) : null;
    const l = gardee?.ok ? gardee : ligneGC(sansModele, options);
    if (!l.ok) continue;
    // Fenêtre large : l'outil pose lui-même le bois sur un fer plat. Le bois « rainuré » n'existe donc pas ici : c'est
    // « sur fer plat » qui est proposé (même prix), pour que le nom choisi dise ce qui sera fabriqué.
    if (lireMainCouranteGC(id)?.type === "bois-rainure" && l.line.gc?.renfort) continue;
    mains[id] = l.line.unitPrice;
  }
  return mains;
}

/**
 * La réponse de /api/prix-garde-corps, construite champ par champ : rien
 * d'autre ne peut partir vers le navigateur. null : une option inconnue
 * (la route répond 400).
 */
/** La rosace qui compte pour les modèles du catalogue : la choisie si elle est connue, sinon celle du modèle (comme catalogueSiteGC). */
function rosaceDuCatalogue(q: RequetePrixGC): string {
  const fabricId = rosaceDeLaRequete(q);
  return fabricId !== undefined && Object.hasOwn(ROSACE_MM_GC, fabricId) ? fabricId : ROSACE_DEFAUT_GC;
}

/**
 * LE MOINS CHER D'OFFICE (décision de Quentin, 05/10/2026 : « le site propose la meilleure config, le client ne cherche pas ») :
 * tant que le client n'a pas choisi de modèle, le croquis, le prix affiché et l'aperçu du plan montrent le modèle aux normes le
 * moins cher pour cette fenêtre, avec la rosace qu'il a choisie — et non plus les croix seules. Le client le choisit (lui ou un
 * autre) dans la rangée avant le panier. Aucun modèle aux normes avec cette rosace : la requête reste telle quelle.
 */
function avecLeMoinsCher(q: RequetePrixGC, modeles: readonly ModeleGC[]): RequetePrixGC {
  // Un modèle ou un décor choisi par le client : rien ne le remplace. (Et le décor n'est jamais choisi d'office.)
  if (q.releve.modele || q.releve.decor) return q;
  const rosace = rosaceDuCatalogue(q);
  // À croix seulement (Quentin, 05/10 : « le moins cher à croix ») : les barreaux seuls, souvent moins chers, restent dans la
  // rangée avec leur prix. Quand seuls les barreaux conviennent, la configuration de l'outil les propose déjà.
  const moinsCher = modeles
    .filter((m) => m.conforme && !m.seuls && m.rosace === rosace)
    .sort((a, b) => a.prix - b.prix || a.croix - b.croix)[0];
  return moinsCher ? { ...q, releve: { ...q.releve, modele: moinsCher.id } } : q;
}

/** La requête sans son décor (ni son modèle s'il n'y en a pas) : celle des modèles du catalogue, qui ne dépendent pas du décor. */
function sansDecor(q: RequetePrixGC): RequetePrixGC {
  if (q.releve.decor === undefined) return q;
  const { decor: _decor, ...releve } = q.releve;
  void _decor;
  return { ...q, releve };
}

/**
 * Le décor de la réponse, construit champ par champ : son identifiant, le nom de l'outil, la frise basse retirée ou non, et ses
 * traits tels que l'outil les dessine (R.vues.face, les primitives qui portent un rôle), ramenés au coin bas-gauche du cadre,
 * arrondis au millimètre, allégés par mtAlleger (la fonction de l'outil) jusqu'à tenir sous DECOR_NOMBRES_MAX nombres.
 */
function decorDeLaReponse(c: ConfigGC): DecorReponseGC | null {
  if (!c.decor || typeof c.R.decorNom !== "string") return null;
  const g = geomGC(c.v, 1);
  const x0 = -g.Lc / 2, y0 = Number(c.v.A) + Number(c.v.jour);
  const prims = (c.R.vues.face as { t?: string; role?: string; pts?: [number, number][]; c?: [number, number]; r?: number; ouvert?: boolean }[]).filter((p) => p.role);
  const mm = (x: number) => Math.round(x);
  const dixieme = (x: number) => Math.round(x * 10) / 10;
  for (const tolerance of [0.5, 1, 2, 4, 8]) {
    const traits: DecorTraitGC[] = [];
    let nombres = 0;
    for (const p of prims) {
      if (p.t === "poly" && p.pts && (p.role === "fer" || p.role === "collier" || p.role === "or" || p.role === "vrille")) {
        const pts: [number, number][] = [];
        for (const [x, y] of p.role === "vrille" ? p.pts : mtAlleger(p.pts, tolerance)) {
          const q: [number, number] = [mm(x - x0), mm(y - y0)];
          const d = pts[pts.length - 1];
          if (!d || d[0] !== q[0] || d[1] !== q[1]) pts.push(q);
        }
        if (pts.length < 2) continue;
        traits.push({ t: "poly", pts, role: p.role, ...(p.ouvert === true ? { ouvert: true } : {}) });
        nombres += 2 * pts.length;
      } else if (p.t === "cercle" && p.c && typeof p.r === "number" && p.r > 0 && (p.role === "fer" || p.role === "or")) {
        traits.push({ t: "cercle", c: [dixieme(p.c[0] - x0), dixieme(p.c[1] - y0)], r: Math.max(0.1, dixieme(p.r)), role: p.role });
        nombres += 3;
      }
    }
    if (nombres <= DECOR_NOMBRES_MAX) {
      return { id: idDecorGC(c.decor), nom: c.R.decorNom, friseRetiree: friseRetiree(c), cadreMm: { l: Math.round(g.Lc), h: Math.round(Number(g.Hc)) }, traits };
    }
  }
  return null;
}

/**
 * Le prix de chaque assemblage de décor pour cette fenêtre (decors=1) : avec les finitions du décor choisi (sa forme si
 * l'assemblage la permet, sinon la première permise), ou celles de départ. Le même calcul que le panier (ligneGC). Le décor
 * remplace le remplissage : le prix est celui du garde-corps à décor, jamais sous verre.
 */
function prixDesDecors(q: RequetePrixGC): PrixDecorGC[] {
  const choisi = q.releve.decor ? lireDecorGC(q.releve.decor) : null;
  const { modele: _modele, decor: _decor, ...releve } = q.releve;
  void _modele;
  void _decor;
  return DECORS_GC.assemblages.map(({ id: assemblage, nom }) => {
    const d: ChoixDecorGC = choisi
      ? { ...choisi, assemblage, forme: DECORS_GC.formes[assemblage].includes(choisi.forme) ? choisi.forme : DECORS_GC.formes[assemblage][0] }
      : decorParDefautGC(assemblage);
    const id = idDecorGC(d);
    const l = ligneGC({ ...releve, decor: id }, { woodId: q.essence, metalId: q.metalId, fabricId: q.fabricId });
    return l.ok && l.line.gc ? { id, nom: l.line.gc.decorNom ?? nom, prix: l.line.unitPrice, conforme: true } : { id, nom, prix: 0, conforme: false };
  });
}

/**
 * Pourquoi un garde-corps « à étudier » ne se fixe pas dans ce mur (ou que le mur n'y est pour rien) : le texte de l'outil
 * pour la configuration de départ (carré de 16, une croix). Seulement quand le client a donné son mur.
 */
function fixationAEtudier(q: RequetePrixGC, c0: ConfigAEtudierGC): FixationGC | undefined {
  if (!q.releve.mur || c0.raison !== "a-etudier") return undefined;
  const v = valeursGC(DEFAUTS_GC, entreeGC(q.releve, q.essence, diametreRosaceGC(rosaceDeLaRequete(q))), 16, 1) as ValeursGC;
  const F = fixationMoteur(calculerGC({ ...v, _rapide: true }));
  return F ? fixationPourLeSite(F, false) : undefined;
}

export function reponsePrixGC(q: RequetePrixGC): ReponsePrixGC | null {
  const decors = q.decors ? { decors: prixDesDecors(q) } : {};
  if (q.releve.decor !== undefined) return reponseAvecDecor(q, decors);
  const c0 = configurationGC(q.releve, q.essence, diametreRosaceGC(rosaceDeLaRequete(q)));
  if (!c0) return null;
  if (!c0.ok) {
    const fixation = fixationAEtudier(q, c0);
    return {
      ok: false,
      conforme: false,
      raison: c0.raison,
      hauteurMm: c0.hauteurMm,
      mainCouranteMm: c0.mainCouranteMm,
      jourMm: c0.jourMm,
      obligatoire: c0.obligatoire,
      alertes: [...c0.alertes],
      modeles: catalogueSiteGC(q, c0.hauteurMm),
      mains: prixParMainCourante(q),
      ...decors,
      ...(fixation ? { fixation } : {}),
    };
  }
  const modeles = catalogueSiteGC(q, c0.hauteurMm);
  // Sans choix du client : le moins cher des modèles aux normes (sinon, la configuration de l'outil).
  const proposee = avecLeMoinsCher(q, modeles);
  const cp = proposee === q ? c0 : configurationGC(proposee.releve, q.essence, diametreRosaceGC(rosaceDeLaRequete(q)));
  const [qr, c] = cp?.ok ? [proposee, cp] : [q, c0];
  // Une option absente : celle du modèle (ligneGC).
  const r = ligneGC(qr.releve, { woodId: q.essence, metalId: q.metalId, fabricId: q.fabricId, remplissageId: q.remplissageId });
  if (!r.ok || !r.line.gc) return null;
  // La fixation dans le mur retenue pour CE garde-corps (celle que le prix comprend), quand le client a donné son mur.
  const F = fixationMoteur(c.R);
  return {
    ok: true,
    conforme: true,
    prix: r.line.unitPrice,
    remise: q.quantite > 1 ? prixCommandeGC([{ config: c, quantite: q.quantite }]).remise : 0,
    hauteurMm: c.hauteurMm,
    mainCouranteMm: c.mainCouranteMm,
    jourMm: c.jourMm,
    croix: c.croix,
    carre: c.carre,
    soubassementMm: c.soubassementMm,
    traverse: c.traverse,
    seuls: c.seuls,
    renfort: c.renfort,
    patte: c.patte,
    kg: Math.round(r.line.gc.kg),
    obligatoire: c.obligatoire,
    modeles,
    mains: prixParMainCourante(qr),
    ...decors,
    ...(F ? { fixation: fixationPourLeSite(F, true) } : {}),
  };
}

/**
 * La réponse quand le client a choisi un DÉCOR À VOLUTES : le prix, le poids et la forme du garde-corps avec ce décor (la rosace
 * par défaut, sans supplément : il n'y a pas de croix), son nom et son dessin. Les modèles du catalogue sont ceux de la même
 * fenêtre SANS décor, au caractère près (la vérification des modèles et « 25 dessins testés » n'en dépendent pas). Si la norme
 * refuse le décor : « à étudier », avec ce qui bloque (trous, escalade…), et toujours le catalogue des modèles.
 */
function reponseAvecDecor(q: RequetePrixGC, decors: { decors?: PrixDecorGC[] }): ReponsePrixGC | null {
  const qs = sansDecor(q);
  const c0 = configurationGC(qs.releve, q.essence, diametreRosaceGC(rosaceDeLaRequete(qs)));
  const c = configurationGC(q.releve, q.essence, diametreRosaceGC(undefined));
  if (!c0 || !c) return null;
  const modeles = catalogueSiteGC(qs, c0.hauteurMm);
  const mains = prixParMainCourante(q);
  if (!c.ok) {
    return { ok: false, conforme: false, raison: c.raison, hauteurMm: c.hauteurMm, mainCouranteMm: c.mainCouranteMm, jourMm: c.jourMm, obligatoire: c.obligatoire, alertes: [...c.alertes], modeles, mains, ...decors };
  }
  const r = ligneGC(q.releve, { woodId: q.essence, metalId: q.metalId, fabricId: q.fabricId, remplissageId: q.remplissageId });
  const decor = decorDeLaReponse(c);
  if (!r.ok || !r.line.gc || !decor) return null;
  return {
    ok: true,
    conforme: true,
    prix: r.line.unitPrice,
    remise: q.quantite > 1 ? prixCommandeGC([{ config: c, quantite: q.quantite }]).remise : 0,
    hauteurMm: c.hauteurMm,
    mainCouranteMm: c.mainCouranteMm,
    jourMm: c.jourMm,
    croix: c.croix,
    carre: c.carre,
    soubassementMm: c.soubassementMm,
    traverse: c.traverse,
    seuls: c.seuls,
    renfort: c.renfort,
    patte: c.patte,
    kg: Math.round(r.line.gc.kg),
    obligatoire: c.obligatoire,
    modeles,
    mains,
    decor,
    ...decors,
    ...(fixationMoteur(c.R) ? { fixation: fixationPourLeSite(fixationMoteur(c.R)!, true) } : {}),
  };
}

/**
 * L'aperçu du plan : le « Plan A3 » que dessine l'outil de plans pour cette configuration (même moteur, même dessin :
 * planA3Pur est la fonction de l'outil). En mode « aperçu », l'outil retire de la feuille la liste de débit, le détail de
 * fixation et la coupe de perçage, et pose un filigrane : le client voit son plan, il n'a pas de quoi le refaire.
 * Sans modèle choisi : le plan du modèle montré sur le croquis, le moins cher (avecLeMoinsCher).
 * null : pas de garde-corps à dessiner (« à étudier »).
 */
export function planApercuGC(q: RequetePrixGC, date = new Date()): PlanApercuGC | null {
  // Avec un décor à volutes : le plan du garde-corps à décor (le Plan A3 de l'outil dessine les volutes), rosace par défaut.
  const rosaceMm = q.releve.decor !== undefined ? diametreRosaceGC(undefined) : diametreRosaceGC(rosaceDeLaRequete(q));
  const c0 = configurationGC(q.releve, q.essence, rosaceMm);
  if (!c0 || !c0.ok) return null;
  const proposee = q.releve.modele || q.releve.decor ? q : avecLeMoinsCher(q, catalogueSiteGC(q, c0.hauteurMm));
  const cp = proposee === q ? c0 : configurationGC(proposee.releve, q.essence, rosaceMm);
  const c = cp?.ok ? cp : c0;
  const R = calculerGC({ ...c.v });
  const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  return {
    svg: planA3Pur(R, c.v, { apercu: true, date: jour }, "gardeCorps"),
    largeurMm: q.releve.largeurMm,
    hauteurMm: c.hauteurMm,
    croix: c.croix,
    carre: c.carre,
    seuls: c.seuls,
    traverse: c.traverse,
    ...(c.decor ? { decor: true } : {}),
  };
}

/* ------------------------------------------------------------------ *
 *  Le « à partir de » et la fourchette annoncée à Google
 * ------------------------------------------------------------------ */

/** Par fiche (le garde-corps Rosace, le Garde-corps forgé à volutes) : chacune a son « à partir de » et son prix d'appel. */
const departMemo = new Map<string, number | null>();
const appelMemo = new Map<string, { prix: number; largeurMm: number } | null>();
const fourchetteMemo = new Map<string, { prixMin: number; prixMax: number } | null>();
let indisponibleSignale = false;

/** Sans la clé du chiffrage : pas de prix (rien d'inventé), et un seul message dans les journaux. */
function sansCle<T>(calcul: () => T, repli: T): T {
  try {
    return calcul();
  } catch (erreur) {
    if (!(erreur instanceof ChiffrageIndisponible)) throw erreur;
    if (!indisponibleSignale) {
      indisponibleSignale = true;
      console.error(`[prix-garde-corps] ${erreur.message} : pas de « à partir de » pour le garde-corps. Définir CHIFFRAGE_GARDE_CORPS_CLE.`);
    }
    return repli;
  }
}

/** Les suppléments les plus bas des options du site (teinte, rosace), ajoutés au prix de l'outil. */
function supplementsMoinsChers(p: Product) {
  const min = (liste: { priceDelta?: number }[] | undefined) => (liste?.length ? Math.min(...liste.map((o) => o.priceDelta ?? 0)) : 0);
  return min(p.metals) + min(p.fabrics);
}

/**
 * Le prix « à partir de » d'une pièce, sur le serveur : celui du catalogue,
 * et pour le garde-corps celui de l'outil au relevé de départ
 * (RELEVE_DEPART_GC), dans l'essence la moins chère.
 */
export function prixDepart(product: Product): number | null {
  // Les portails : le style le moins cher à la cote courante, calculé par l'outil (prix-portail.server.ts).
  if (product.famille === "portail" && estSlugPortail(product.slug)) return prixDepartPortail(product.slug);
  if (!prixParOutil(product)) return priceFrom(product);
  if (departMemo.has(product.slug)) return departMemo.get(product.slug) ?? null;
  // Le forgé : au relevé de départ (le plus petit garde-corps), aucun décor n'a la place de ses volutes. Son « à partir de » est
  // donc son prix d'appel : le moins cher de ses décors pour une fenêtre courante (jamais un prix qu'aucune fenêtre n'atteint).
  if (product.decorsGC) {
    const appel = prixAppelGC(product);
    if (appel !== null || indisponibleSignale) departMemo.set(product.slug, appel?.prix ?? null);
    return appel?.prix ?? null;
  }
  const calcul = () => {
    const prix = MAINS_COURANTES_GC.map((essence) => {
      const c = configurationGC(RELEVE_DEPART_GC, essence);
      return c?.ok ? prixGC(c) : null;
    }).filter((x): x is number => x !== null);
    return prix.length ? Math.min(...prix) + supplementsMoinsChers(product) : null;
  };
  const valeur = sansCle(calcul, null);
  if (valeur !== null || indisponibleSignale) departMemo.set(product.slug, valeur);
  return valeur;
}

/**
 * LE PRIX D'APPEL (étude marketing, 06/10/2026 : « un prix dès réaliste, avec la taille de fenêtre qui va avec ») :
 * le modèle aux normes le moins cher, toutes mains courantes et options au plus bas, pour une fenêtre COURANTE — 100 cm
 * de large, en étage, le bas à 65 cm du sol. Le « à partir de » (prixDepart) reste le plus petit garde-corps fabriqué,
 * pour Google ; celui-ci se lit « dès X € pour une fenêtre de 100 cm ». C'est le prix que le client obtient s'il entre ces
 * cotes et choisit ce modèle : jamais un chiffre qu'aucune configuration n'atteint.
 */
export const FENETRE_APPEL_GC = { largeurMm: 1000, allegeMm: 650 } as const;
export function prixAppelGC(product: Product): { prix: number; largeurMm: number } | null {
  if (!prixParOutil(product)) return null;
  if (appelMemo.has(product.slug)) return appelMemo.get(product.slug) ?? null;
  const moinsCher = (liste: { id: string; priceDelta?: number }[] | undefined) =>
    liste?.length ? liste.reduce((a, b) => ((a.priceDelta ?? 0) <= (b.priceDelta ?? 0) ? a : b)).id : undefined;
  const calcul = () => {
    const prix = MAINS_COURANTES_GC.flatMap((essence) => {
      const q: RequetePrixGC = {
        releve: { ...FENETRE_APPEL_GC, enEtage: true, fenetreMm: 0 },
        essence,
        metalId: moinsCher(product.metals),
        fabricId: moinsCher(product.fabrics),
        quantite: 1,
      };
      // Le forgé : le moins cher de ses décors, finitions de départ (le calcul des vignettes de la fiche).
      if (product.decorsGC) return prixDesDecors(q).filter((d) => d.conforme).map((d) => d.prix);
      const r = reponsePrixGC(q);
      return r ? r.modeles.filter((m) => m.conforme).map((m) => m.prix) : [];
    });
    return prix.length ? { prix: Math.min(...prix), largeurMm: FENETRE_APPEL_GC.largeurMm } : null;
  };
  const valeur = sansCle(calcul, null);
  if (valeur !== null || indisponibleSignale) appelMemo.set(product.slug, valeur);
  return valeur;
}

/**
 * La fourchette de prix du garde-corps pour Google : du « à partir de » au
 * plus grand garde-corps que l'outil accepte (fenêtre sur le sol, la plus
 * haute), en noyer, avec la rosace la plus chère. Le verre, en option, n'y
 * entre pas.
 */
export function fourchetteGC(slug: string = SLUG_GC): { prixMin: number; prixMax: number } | null {
  if (fourchetteMemo.has(slug)) return fourchetteMemo.get(slug) ?? null;
  const produit = produitGC(slug);
  const calcul = () => {
    const min = prixDepart(produit);
    if (min === null) return null;
    let max = 0;
    if (produit.decorsGC) {
      // Le forgé : chacun de ses décors (finitions de départ) à la plus grande fenêtre vendue en ligne, la plus haute, en noyer.
      for (const { id } of DECORS_GC.assemblages) {
        const c = configurationGC({ largeurMm: RENFORT.LcMax, allegeMm: 0, enEtage: true, fenetreMm: 0, decor: idDecorGC(decorParDefautGC(id)) }, "noyer");
        if (c?.ok) max = Math.max(max, prixGC(c));
      }
    } else {
      // Jusqu'à la plus grande largeur vendue en ligne : celle du fer plat de renfort (RENFORT.LcMax de l'outil).
      for (let largeurMm = BORNES_RELEVE_GC.largeurMm.min; largeurMm <= RENFORT.LcMax; largeurMm += 100) {
        const c = configurationGC({ largeurMm, allegeMm: 0, enEtage: true, fenetreMm: 0 }, "noyer");
        if (c?.ok) max = Math.max(max, prixGC(c));
      }
    }
    const plusCher = (liste: { priceDelta?: number }[] | undefined) => (liste?.length ? Math.max(...liste.map((o) => o.priceDelta ?? 0)) : 0);
    return max > 0 ? { prixMin: min, prixMax: max + plusCher(produit.metals) + plusCher(produit.fabrics) } : null;
  };
  const valeur = sansCle(calcul, null);
  if (valeur !== null || indisponibleSignale) fourchetteMemo.set(slug, valeur);
  return valeur;
}
