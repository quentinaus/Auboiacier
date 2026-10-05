// Extensions écrites en toutes lettres : les tests (node --test, sans outil
// de construction) importent ce fichier tel quel.
import { PRIX_OFFRE_CENTS, RAYON_OFFRE_KM } from "./deplacement.ts";
import type { Locale } from "./i18n.ts";
import { prixAffiche } from "./ui.ts";

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
 * Seuls les marqueurs de cette liste sont touchés : « {n} » (le nombre de
 * modèles d'une famille) et les autres restent à la charge de leur page.
 */
export function valeursMarqueurs(locale: Locale): Record<string, string> {
  return {
    "{prixVisite}": prixAffiche(PRIX_OFFRE_CENTS / 100, locale),
    "{rayonVisite}": String(RAYON_OFFRE_KM),
  };
}

/** Remplace les marqueurs connus dans un texte. */
export function remplacerDansTexte(texte: string, valeurs: Record<string, string>): string {
  let resultat = texte;
  for (const [marqueur, valeur] of Object.entries(valeurs)) {
    if (resultat.includes(marqueur)) resultat = resultat.split(marqueur).join(valeur);
  }
  return resultat;
}

/**
 * Le même objet (dictionnaire entier, ou une partie), avec les marqueurs
 * remplacés dans toutes ses chaînes, à toute profondeur. L'objet d'origine
 * n'est pas modifié.
 */
export function remplacerMarqueurs<T>(valeur: T, locale: Locale): T {
  const valeurs = valeursMarqueurs(locale);
  const parcourir = (v: unknown): unknown => {
    if (typeof v === "string") return remplacerDansTexte(v, valeurs);
    if (Array.isArray(v)) return v.map(parcourir);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([cle, sous]) => [cle, parcourir(sous)]));
    }
    return v;
  };
  return parcourir(valeur) as T;
}
