// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.

/**
 * Les matières du mur que le croquis du garde-corps sait dessiner, DANS
 * L'ORDRE de la liste « Type de mur » des dictionnaires (gcMurOptions) :
 * pierre, brique pleine, brique creuse, parpaing, béton, béton cellulaire,
 * placo sur ossature, et « je ne sais pas » — un enduit lisse, comme tant que
 * rien n'est choisi. Un test vérifie que les listes concordent, en français
 * et en anglais.
 */
export const MATIERES_MUR = ["pierre", "brique", "brique-creuse", "parpaing", "beton", "beton-cellulaire", "placo", "enduit"] as const;
export type MatiereMur = (typeof MATIERES_MUR)[number];

/** La matière à dessiner pour le mur choisi dans la liste ; un enduit lisse tant que rien n'est choisi. */
export function matiereMur(choix: string, options: readonly string[]): MatiereMur {
  return MATIERES_MUR[options.indexOf(choix)] ?? "enduit";
}
