import type { Dictionary } from "@/app/[lang]/dictionaries";

/** Les textes du panier qui servent à l'inscription avant l'ouverture : une seule source, panier et fiches. */
const CLES = [
  "prevenirTitre",
  "prevenirTexte",
  "prevenirEmail",
  "prevenirEmailPh",
  "prevenirBouton",
  "prevenirEnvoi",
  "prevenirOk",
  "prevenirInvalide",
  "prevenirErreur",
  "prevenirNote",
  "privacyLink",
  "writeUs",
  "tooMany",
] as const;

export type TextesOuverture = Pick<Dictionary["panier"], (typeof CLES)[number]>;

/** Seulement ces textes-là, pour ne pas envoyer tout le panier à chaque fiche produit. */
export function textesOuverture(panier: Dictionary["panier"]): TextesOuverture {
  return Object.fromEntries(CLES.map((cle) => [cle, panier[cle]])) as TextesOuverture;
}
