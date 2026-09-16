/**
 * Les règles du formulaire de devis, partagées entre le navigateur et le
 * serveur.
 *
 * Le serveur (/api/devis) est le seul juge : c'est lui qui coupe, refuse ou
 * accepte. Mais le navigateur applique les MÊMES bornes avant l'envoi, pour
 * que le visiteur ait un message clair au bon endroit plutôt qu'un « erreur »
 * générique après coup. Elles vivent ici, à un seul endroit, pour qu'on ne
 * puisse pas les faire diverger sans le voir.
 *
 * Ce fichier n'importe rien : il est tiré par un composant "use client".
 */

/**
 * Longueur maximale de chaque champ.
 * Sans borne, on peut coller un roman dans « Nom » : l'e-mail devient
 * illisible et le quota d'envoi part en fumée.
 */
export const MAX_TEXTE = {
  name: 120,
  email: 200,
  phone: 40,
  city: 80,
  project: 80,
  message: 8000,
} as const;

/** Pièces jointes : deux fichiers, 3 Mo chacun, 3,5 Mo au total — l'hébergeur refuse au-delà. */
export const MAX_FICHIERS = 2;
export const MAX_FICHIER_OCTETS = 3 * 1024 * 1024;
export const MAX_TOTAL_OCTETS = 3.5 * 1024 * 1024;

/**
 * Une adresse e-mail plausible. Le contrôle d'avant se contentait d'un « @ » :
 * le site envoyait alors un accusé de réception à ce que le visiteur avait
 * tapé. Autrement dit, une machine à envoyer du courrier depuis le domaine de
 * l'atelier — le quota part en fumée et le domaine finit signalé comme spam.
 */
export const EMAIL_VALIDE = /^[^\s@,;:<>"'\\]+@[^\s@,;:<>"'\\]+\.[A-Za-z]{2,24}$/;

/**
 * La même règle, pour l'attribut `pattern` du champ. Le navigateur seul
 * accepte « jean@orange », que le serveur refuse : avec ce motif il affiche son
 * propre message avant l'envoi. Dérivé de la regex (sans ^ et $) : impossible
 * que les deux se contredisent.
 */
export const EMAIL_MOTIF = EMAIL_VALIDE.source.slice(1, -1);

/**
 * Téléphone, pour l'attribut `pattern` : permissif (indicatif +33, espaces,
 * points, tirets), 6 à 40 caractères. Le champ est facultatif : vide accepté.
 */
export const TELEPHONE_MOTIF = "[0-9+][0-9 .\\-]{5,39}";

/** Trop de fichiers, ou trop lourds ? La même question que se pose le serveur. */
export function fichiersTropLourds(fichiers: readonly { size: number }[]): boolean {
  const total = fichiers.reduce((somme, f) => somme + f.size, 0);
  return (
    fichiers.length > MAX_FICHIERS ||
    fichiers.some((f) => f.size > MAX_FICHIER_OCTETS) ||
    total > MAX_TOTAL_OCTETS
  );
}

/** En dessous de trois secondes, ce n'est pas une personne qui a rempli le formulaire. */
export const DUREE_HUMAINE_MS = 3000;

/**
 * Piège temporel. Le formulaire envoie le temps passé dessus, mesuré par le
 * navigateur (et non par l'heure de la machine du visiteur, qui peut être
 * fausse). Un robot poste en moins d'une seconde, un humain met plus de trois.
 * On ne rejette QUE si la valeur est présente et trop petite : absente ou
 * nulle, elle passe (ancien navigateur, formulaire pas encore hydraté). Un
 * robot qui écrit lui-même « 5000 » passe : c'est un filtre gratuit, pas un
 * rempart.
 */
export function envoiTropRapide(valeur: unknown): boolean {
  if (valeur === null || valeur === undefined || typeof valeur === "object") return false;
  const dureeMs = Number(valeur);
  return Number.isFinite(dureeMs) && dureeMs > 0 && dureeMs < DUREE_HUMAINE_MS;
}
