import "server-only";

/**
 * La SEULE porte vers le calcul du garde-corps par l'outil de plans (norme,
 * croix, poids, prix, livraison). « server-only » fait échouer la compilation
 * si un composant du navigateur l'importe : les coûts de l'atelier (prix
 * d'achat, fournisseurs, heure, frais fixes) ne partent jamais dans le
 * JavaScript public. Le navigateur demande son prix à /api/prix-garde-corps,
 * qui ne rend que le prix et la forme (hauteur, croix, carré, conformité).
 */
export {
  ChiffrageIndisponible,
  configurerGC,
  entreeValide,
  lireEntreeGC,
  livraisonGC,
  PARAMETRES_PRIX_GC,
  prixCommandeGC,
  prixGC,
  reponsePrixGC,
} from "./garde-corps-outil/calcul.ts";
export type {
  CodeAlerteGC,
  ConfigAEtudierGC,
  ConfigGC,
  EntreeSiteGC,
  EssenceGC,
  LigneCommandeGC,
  ModeRemiseGC,
  ReponsePrixGC,
} from "./garde-corps-outil/calcul.ts";
