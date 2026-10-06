import "server-only";

/**
 * La SEULE porte vers le prix d'un portail pour le site. « server-only » fait échouer la compilation si un composant
 * du navigateur l'importe : les coûts de l'atelier ne partent jamais dans le JavaScript public. Le navigateur demande
 * son prix à /api/prix-portail, qui ne rend qu'un prix de vente.
 */
export { ChiffragePortailIndisponible, prixDepartPortail, prixPortail, type ReponsePrixPortail } from "./portails-outil/prix.ts";
