/**
 * Les portails, SANS le moteur : ce que le navigateur doit connaître pour la page des portails (les modèles, les styles, les
 * teintes, les dessins de la tôle, le guide). Aucun import du moteur de l'outil ni du chiffrage : un composant du navigateur qui
 * importe ce fichier n'embarque pas le moteur (la page des portails, 12/10/2026). src/lib/portails.ts le ré-exporte : l'API
 * publique ne change pas.
 */

export const SLUGS_PORTAIL = {
  "portail-battant": "ptBattant",
  "portail-coulissant": "ptCoulissant",
  "portail-pliant": "ptPliant",
  portillon: "ptPortillon",
} as const;
export type SlugPortail = keyof typeof SLUGS_PORTAIL;
export const estSlugPortail = (s: string): s is SlugPortail => Object.prototype.hasOwnProperty.call(SLUGS_PORTAIL, s);

export const STYLES_PORTAIL = ["plein", "lisse", "barreaux", "lamesChene", "rosace", "volutes", "tole"] as const;
export type StylePortail = (typeof STYLES_PORTAIL)[number];

/** Les dessins de la tôle découpée (11/10/2026) : ceux de modules/designs-tole.js (TDC_IDS), découpés au laser dans une tôle prégalvanisée de 3 mm. */
export const DESSINS_TOLE = ["foret", "vagues", "soleil", "losanges", "feuillage", "lignes", "nid", "loup", "bulles"] as const;
export type DessinTole = (typeof DESSINS_TOLE)[number];

/** Les teintes du portail ; « galva » n'est pas une peinture : la galvanisation à chaud laissée brute (acier seulement, 11/10/2026). */
export const COULEURS_PORTAIL = ["anthracite", "noir", "blanc", "vert", "rouille", "galva"] as const;

/**
 * Comment le client reçoit son portail (Quentin, 10/10/2026) : « pose » (l'atelier livre et pose, visite de prise de cotes
 * payée avec l'acompte), « transporteur » (livré sur palette, sans pose, la livraison selon le colis) ou « retrait » (le client
 * vient le chercher à l'atelier, sans pose). Sans pose, pas de motorisation : l'atelier la pose lui-même (conformité CE).
 */
export const RECEPTIONS_PORTAIL = ["pose", "transporteur", "retrait"] as const;
export type ReceptionPortail = (typeof RECEPTIONS_PORTAIL)[number];

/**
 * Le guide « Quel portail chez vous ? » : trois questions, dans l'ordre (étude du 06/10/2026).
 * 1. Derrière, la place d'un vantail est-elle libre, sur un sol plat ou qui monte de moins de 5 cm ? → battant.
 * 2. Sinon : le long de la clôture, la longueur du passage + 15 cm est-elle libre ? Non → pliant.
 * 3. Oui : le sol y est-il dur et plat ? Oui → coulissant sur rail ; non → autoportant.
 */
export function guidePortail(r: { derriere?: boolean; cote?: boolean; sol?: boolean }): { slug: SlugPortail; guidage?: "rail" | "auto" } | null {
  if (r.derriere === true) return { slug: "portail-battant" };
  if (r.derriere !== false) return null;
  if (r.cote === false) return { slug: "portail-pliant" };
  if (r.cote !== true) return null;
  if (r.sol === undefined) return null;
  return { slug: "portail-coulissant", guidage: r.sol ? "rail" : "auto" };
}

export type Langue = "fr" | "en";
