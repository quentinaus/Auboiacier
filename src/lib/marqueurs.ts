// Extensions écrites en toutes lettres : les tests (node --test, sans outil
// de construction) importent ce fichier tel quel.
import { LIVRAISON_MAX_CENTS, PRIX_OFFRE_CENTS, RAYON_OFFRE_KM } from "./deplacement.ts";
import type { Locale } from "./i18n.ts";
import {
  PLATEAU_MAX_LARGEUR_MM,
  PLATEAU_MAX_LONGUEUR_MM,
  priceFrom,
  prixParOutil,
  productLocalise,
  products,
  type Famille,
  type Product,
} from "./products.ts";
import { prixAffiche } from "./ui.ts";
import { delaiFabrication } from "./vitrine.ts";
import { GARANTIE_COTES_MAX, GARANTIE_COTES_MIN, GARANTIE_COTES_POURCENT } from "./garantie-cotes.ts";

/**
 * Les chiffres que les textes du site citent, mais qui appartiennent au code.
 *
 * Le prix de la prise de cotes à domicile était tapé à la main dans une
 * dizaine de phrases (titre de /rendez-vous, fiches, dictionnaires) : le jour
 * où il change dans src/lib/deplacement.ts, la moitié des pages auraient
 * continué d'annoncer l'ancien. Les dictionnaires écrivent donc un marqueur
 * — « dès {prixVisite} » — et getDictionary le remplace par la valeur du code,
 * sur le serveur, avant que la page ne soit fabriquée.
 *
 * Les marqueurs du code (et eux seuls : {n}, {prix} ou {delai} sans
 * deux-points restent à la charge de leur page) :
 *
 * | Marqueur             | Valeur                                   | Lue dans                                   |
 * |----------------------|------------------------------------------|--------------------------------------------|
 * | {prixVisite}         | prix de la prise de cotes                | PRIX_OFFRE_CENTS (deplacement.ts)          |
 * | {rayonVisite}        | rayon de l'offre, en km                  | RAYON_OFFRE_KM (deplacement.ts)            |
 * | {prix:<slug>}        | le « à partir de » de la fiche           | priceFrom (products.ts)                    |
 * | {prixTables}         | le plus bas des tables                   | priceFrom des familles table-*             |
 * | {delai:<slug>}       | délai de fabrication, en semaines        | delaiFabrication (vitrine.ts)              |
 * | {livraisonMax}       | plafond de la livraison                  | LIVRAISON_MAX_CENTS (deplacement.ts)       |
 * | {plateauLongueurMax} | plus long plateau d'un seul tenant, cm   | PLATEAU_MAX_LONGUEUR_MM (products.ts)      |
 * | {plateauLargeurMax}  | plus large plateau, cm                   | PLATEAU_MAX_LARGEUR_MM (products.ts)       |
 * | {prix:garde-corps}   | serveur seulement                        | prixDepart (prix-garde-corps.server.ts)    |
 * | {prixAppelGC}        | serveur seulement (garde-corps Rosace)   | prixAppelGC (prix-garde-corps.server.ts)   |
 * | {largeurAppelGC}     | serveur seulement, cm                    | prixAppelGC (prix-garde-corps.server.ts)   |
 *
 * Les prix sont écrits par prixAffiche, à la mode de la langue (euro après
 * le nombre en français, devant en anglais).
 *
 * Les trois derniers viennent de l'outil de plans, dont le calcul contient
 * les coûts de l'atelier : ce fichier-ci, que les composants du navigateur
 * atteignent (par le type Dictionary), ne les calcule pas. Une page du
 * serveur les remplit avec remplacerMarqueursPrix
 * (src/lib/marqueurs-prix.server.ts).
 *
 * Règle : un marqueur sans valeur (prix indisponible, fiche sur devis, pièce
 * retirée) n'est JAMAIS remplacé par un chiffre écrit à la main. getDictionary
 * refuse le dictionnaire (le build échoue, verifierMarqueurs) et
 * tests/marqueurs-prix.test.ts le signale avant.
 */

/** La forme de tous les marqueurs qui appartiennent au code. */
const MOTIF_MARQUEUR =
  /\{(?:prixVisite|rayonVisite|prixTables|livraisonMax|plateauLongueurMax|plateauLargeurMax|prixAppelGC|largeurAppelGC|garantiePct|garantieMin|garantieMax|(?:prix|delai):[a-z0-9-]+)\}/g;

/** Les familles dont le plus bas prix fait « {prixTables} ». */
const FAMILLES_TABLES: readonly Famille[] = ["table-interieur", "table-exterieur"];

/** Un nombre écrit à la mode de la langue (virgule décimale en français). */
function nombre(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 });
}

const memo = new Map<Locale, Record<string, string>>();

/**
 * Les valeurs des marqueurs que tout le site peut remplir (sans l'outil de
 * plans). Un prix absent (fiche sur devis, garde-corps) ne donne aucune
 * entrée : son marqueur reste tel quel et verifierMarqueurs le signale.
 */
export function valeursMarqueurs(locale: Locale): Record<string, string> {
  const deja = memo.get(locale);
  if (deja) return { ...deja };

  const valeurs: Record<string, string> = {
    "{prixVisite}": prixAffiche(PRIX_OFFRE_CENTS / 100, locale),
    "{rayonVisite}": String(RAYON_OFFRE_KM),
    "{livraisonMax}": prixAffiche(LIVRAISON_MAX_CENTS / 100, locale),
    "{plateauLongueurMax}": nombre(PLATEAU_MAX_LONGUEUR_MM / 10, locale),
    "{plateauLargeurMax}": nombre(PLATEAU_MAX_LARGEUR_MM / 10, locale),
    // La Garantie cotes (garantie-cotes.ts) : CGV, FAQ et panier citent ces chiffres-là, jamais des chiffres tapés.
    "{garantiePct}": locale === "en" ? `${GARANTIE_COTES_POURCENT}%` : `${GARANTIE_COTES_POURCENT}\u00a0%`,
    "{garantieMin}": prixAffiche(GARANTIE_COTES_MIN, locale),
    "{garantieMax}": prixAffiche(GARANTIE_COTES_MAX, locale),
  };

  const prixTables: number[] = [];
  for (const product of products) {
    const delai = delaiFabrication(productLocalise(product, locale));
    if (delai) valeurs[`{delai:${product.slug}}`] = delai;
    // Le garde-corps : son « à partir de » vient de l'outil, sur le serveur.
    if (prixParOutil(product)) continue;
    const prix = priceFrom(product);
    if (prix === null) continue;
    valeurs[`{prix:${product.slug}}`] = prixAffiche(prix, locale);
    if (FAMILLES_TABLES.includes(product.famille)) prixTables.push(prix);
  }
  if (prixTables.length > 0) valeurs["{prixTables}"] = prixAffiche(Math.min(...prixTables), locale);

  memo.set(locale, valeurs);
  return { ...valeurs };
}

/** Ce que l'outil de plans calcule sur le serveur (fourni par prix-garde-corps.server.ts, ou par les tests). */
export type CalculsOutil = {
  prixDepart: (product: Product) => number | null;
  prixAppelGC: (product: Product) => { prix: number; largeurMm: number } | null;
};

/**
 * Les valeurs des marqueurs du garde-corps, calculées par l'outil de plans.
 * Les fonctions de calcul sont passées en paramètre : ce fichier n'importe
 * jamais l'outil (src/lib/marqueurs-prix.server.ts le fait, derrière
 * « server-only »). Sans la clé du chiffrage, pas d'entrée : rien d'inventé.
 */
export function valeursMarqueursOutil(locale: Locale, calculs: CalculsOutil): Record<string, string> {
  const valeurs: Record<string, string> = {};
  for (const product of products) {
    if (!prixParOutil(product)) continue;
    const depart = calculs.prixDepart(product);
    if (depart !== null) valeurs[`{prix:${product.slug}}`] = prixAffiche(depart, locale);
    // Le prix d'appel des textes (« dès {prixAppelGC} pour une fenêtre de {largeurAppelGC} cm ») est celui du garde-corps
    // de fenêtre Rosace ; le Garde-corps forgé à volutes (decorsGC) a le sien, sur sa fiche seulement.
    const appel = product.decorsGC ? null : calculs.prixAppelGC(product);
    if (appel) {
      valeurs["{prixAppelGC}"] = prixAffiche(appel.prix, locale);
      valeurs["{largeurAppelGC}"] = nombre(appel.largeurMm / 10, locale);
    }
  }
  return valeurs;
}

/** Les marqueurs que seul le serveur sait remplir (ceux de l'outil de plans). */
export function marqueursDuServeur(): ReadonlySet<string> {
  return new Set([
    "{prixAppelGC}",
    "{largeurAppelGC}",
    ...products.filter(prixParOutil).map((product) => `{prix:${product.slug}}`),
  ]);
}

/** Remplace les marqueurs connus dans un texte. */
export function remplacerDansTexte(texte: string, valeurs: Record<string, string>): string {
  let resultat = texte;
  for (const [marqueur, valeur] of Object.entries(valeurs)) {
    if (resultat.includes(marqueur)) resultat = resultat.split(marqueur).join(valeur);
  }
  return resultat;
}

/** Le même objet, chaque chaîne passée à `faire`, à toute profondeur. L'objet d'origine n'est pas modifié. */
function parcourir<T>(valeur: T, faire: (texte: string) => string): T {
  const suivre = (v: unknown): unknown => {
    if (typeof v === "string") return faire(v);
    if (Array.isArray(v)) return v.map(suivre);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([cle, sous]) => [cle, suivre(sous)]));
    }
    return v;
  };
  return suivre(valeur) as T;
}

/** Le même objet, marqueurs remplacés par ces valeurs-là. */
export function remplacerAvec<T>(valeur: T, valeurs: Record<string, string>): T {
  return parcourir(valeur, (texte) => remplacerDansTexte(texte, valeurs));
}

/**
 * Le même objet (dictionnaire entier, ou une partie), avec les marqueurs
 * remplacés dans toutes ses chaînes, à toute profondeur. L'objet d'origine
 * n'est pas modifié. Les marqueurs du garde-corps restent : voir
 * remplacerMarqueursPrix (src/lib/marqueurs-prix.server.ts).
 */
export function remplacerMarqueurs<T>(valeur: T, locale: Locale): T {
  return remplacerAvec(valeur, valeursMarqueurs(locale));
}

/** Les marqueurs du code encore présents dans un objet (chacun une fois). */
export function marqueursRestants(valeur: unknown): string[] {
  const vus = new Set<string>();
  parcourir(valeur, (texte) => {
    for (const m of texte.matchAll(MOTIF_MARQUEUR)) vus.add(m[0]);
    return texte;
  });
  return [...vus];
}

/** Un texte cite un chiffre que le code ne sait pas donner. */
export class MarqueurSansValeur extends Error {
  marqueurs: string[];
  constructor(marqueurs: string[], ou: string) {
    super(
      `${ou} : marqueur sans valeur ${marqueurs.join(", ")}. ` +
        "Le prix ou le délai n'existe pas dans le code (fiche sur devis, pièce retirée, faute de frappe, " +
        "clé du chiffrage absente) : corriger le texte, jamais y écrire un chiffre à la main."
    );
    this.name = "MarqueurSansValeur";
    this.marqueurs = marqueurs;
  }
}

/**
 * Lève MarqueurSansValeur si un marqueur du code est resté sans valeur.
 * `serveurPermis` : laisser passer ceux du garde-corps, qu'une page du
 * serveur remplira ensuite avec remplacerMarqueursPrix (c'est le cas du
 * dictionnaire).
 */
export function verifierMarqueurs(valeur: unknown, ou: string, { serveurPermis = false } = {}): void {
  const serveur = serveurPermis ? marqueursDuServeur() : new Set<string>();
  const restants = marqueursRestants(valeur).filter((m) => !serveur.has(m));
  if (restants.length > 0) throw new MarqueurSansValeur(restants, ou);
}
