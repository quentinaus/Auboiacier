import "server-only";

/**
 * La SEULE porte vers les prix de la page des portails pour le site. « server-only » fait échouer la compilation si un composant
 * du navigateur l'importe : les coûts de l'atelier ne partent jamais dans le JavaScript public, seulement des prix de vente.
 */
export { donneesPagePortails } from "./prix-portail.server.ts";
