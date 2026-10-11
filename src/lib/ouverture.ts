import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * Le jour annoncé pour l'ouverture des commandes en ligne : le lundi
 * 7 décembre 2026. Les textes (« Commandes en ligne : ouverture le lundi
 * 7 décembre 2026 ») et les e-mails de « me prévenir » le disent en toutes
 * lettres ; un test vérifie qu'ils disent tous ce jour-là. Google, lui, ne
 * reçoit aucune date : tant que le panier n'encaisse pas, la fiche ne lui
 * annonce aucune disponibilité (src/lib/donnees-google.ts).
 *
 * Ce n'est pas lui qui ouvre le panier : c'est commandesOuvertes()
 * (src/lib/entreprise.ts), dès que la fiche de l'entreprise est complète.
 */
export const DATE_OUVERTURE_COMMANDES = "2026-12-07";

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
