import "server-only";

/**
 * La SEULE porte vers le calcul du garde-corps par l'outil de plans (norme,
 * croix, poids, prix, remise, devis). « server-only » fait échouer la
 * compilation si un composant du navigateur l'importe : les coûts de
 * l'atelier (prix d'achat, fournisseurs, heure, frais fixes) ne partent
 * jamais dans le JavaScript public. Le navigateur demande son prix à
 * /api/prix-garde-corps (une pièce) et à /api/panier/tarif (le panier), qui
 * ne rendent que des prix de vente et la forme retenue.
 *
 * La livraison n'a qu'un calcul sur le site : celui du panier (tarifer,
 * src/lib/tarif-panier.ts), que le devis reprend (livraisonDevisGC) ; il
 * pèse le verre. livraisonGC (calcul.ts) ne sert qu'aux tests de parité avec
 * l'outil : elle ne passe donc pas par cette porte.
 */
export { ChiffrageIndisponible, configurerGC, entreeValide, prixCommandeGC, prixGC } from "./garde-corps-outil/calcul.ts";
export {
  CALCUL_GC,
  configurationGC,
  fourchetteGC,
  ligneGC,
  lireRequetePrixGC,
  PARAMETRES_PRIX_GC,
  prixDepart,
  prixAppelGC,
  FENETRE_APPEL_GC,
  planApercuGC,
  prixReleveOutil,
  remiseCommandeGC,
  reponsePrixGC,
  SLUG_GC,
} from "./garde-corps-outil/site.ts";
export { composerDevisGardeCorps } from "./garde-corps-outil/devis-site.ts";
export type { ConfigAEtudierGC, ConfigGC, EntreeSiteGC, LigneCommandeGC, ModeRemiseGC } from "./garde-corps-outil/calcul.ts";
export type { RequetePrixGC } from "./garde-corps-outil/site.ts";
export type { EntreeDevisGC, LivraisonDevisGC } from "./garde-corps-outil/devis-site.ts";
