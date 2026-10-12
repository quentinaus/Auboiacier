/**
 * La typographie des textes de la page des portails (13/10/2026) : une espace insécable (U+00A0) entre un nombre et son unité
 * (« 3,50 m », « 45 km », « 40 % »), entre un nombre et « × », et, en français, avant « : ; ? ! » et « » » comme après « « ».
 * Sans elle, « 3,50 » finit une ligne et « m » commence la suivante.
 *
 * Les textes s'écrivent avec des espaces ordinaires (lisibles dans le source) ; portails-textes.ts et portails-page.ts passent
 * leurs phrases par `typographieLangues` une fois, à la définition. Les fonctions (prix, cotes) ne sont pas réécrites : leurs
 * paramètres arrivent déjà en insécables (formatMetre, formatCote, prixPage de portails-page.ts). Sans moteur, sans import.
 */
export type LangueTexte = "fr" | "en";

const NBSP = "\u00a0";

/** Une phrase, avec ses insécables. Ne touche qu'aux espaces ordinaires : on peut la rejouer sans rien changer. */
export function typo(texte: string, langue: LangueTexte): string {
  // Un nombre et son unité : « 3,50 m », « 45 km », « 16 cm », « 40 % », « 2 570 € » (l'unité n'est pas le début d'un mot : « 6 mois »).
  let t = texte.replace(/(\d) (?=(?:km|cm|mm|m|%|€)(?![\p{L}\d]))/gu, `$1${NBSP}`);
  // « 3,50 × 1,60 m » ne se coupe pas autour du signe.
  t = t.replace(/(\d) ×/g, `$1${NBSP}×`).replace(/× (\d)/g, `×${NBSP}$1`);
  // Le français : jamais un « : ; ? ! » ni un « » » seul en début de ligne, jamais un « « » seul en fin de ligne.
  if (langue === "fr") t = t.replace(/ (?=[?!:;»])/g, NBSP).replace(/« /g, `«${NBSP}`);
  // Jamais un mot seul sur la dernière ligne d'une phrase longue : ses deux derniers mots restent ensemble. (`text-wrap: pretty` fait
  // pareil dans Chrome, mais Safari ne le connaît pas avant sa version 26.) Les libellés courts ne sont pas touchés.
  if (t.length >= 30 && (t.match(/ /g) ?? []).length >= 3) t = t.replace(/ (?=[^ \xa0]+$)/, NBSP);
  return t;
}

/** Tous les textes d'un objet (en profondeur : objets, tableaux) passent par typo ; les fonctions et les nombres restent tels quels. */
export function typographie<T>(valeur: T, langue: LangueTexte): T {
  if (typeof valeur === "string") return typo(valeur, langue) as T;
  if (Array.isArray(valeur)) return valeur.map((v) => typographie(v, langue)) as T;
  if (valeur !== null && typeof valeur === "object") {
    return Object.fromEntries(Object.entries(valeur).map(([cle, v]) => [cle, typographie(v, langue)])) as T;
  }
  return valeur;
}

/** { fr, en } : chaque langue avec sa typographie. */
export function typographieLangues<T extends { fr: unknown; en: unknown }>(textes: T): T {
  return { ...textes, fr: typographie(textes.fr, "fr"), en: typographie(textes.en, "en") };
}
