import { lireProvenance, type Provenance } from "./provenance.ts";

/**
 * La provenance de la visite en cours, gardée EN MÉMOIRE dans la page ouverte.
 *
 * Le visiteur arrive par un lien marqué (« ?utm_source=instagram », une
 * annonce Google) : RetenirProvenance (dans le layout) lit l'adresse une fois,
 * et la provenance reste ici tant que l'onglet n'est pas rechargé. Les pages
 * du site s'enchaînent sans rechargement (liens de Next) : elle est encore là
 * au moment d'envoyer un devis ou de payer, et part avec.
 *
 * Volontairement, RIEN n'est écrit sur l'appareil : ni cookie, ni
 * localStorage, ni sessionStorage. La CNIL ne dispense de consentement que
 * les traceurs strictement nécessaires au service demandé, ou ceux de mesure
 * d'audience anonyme dont les données ne sont croisées avec rien d'autre
 * (lignes directrices du 17/09/2020, art. 82 de la loi Informatique et
 * Libertés). Garder la campagne pour la joindre à une demande nominative,
 * c'est justement la croiser : un stockage sur l'appareil demanderait un
 * consentement, donc un bandeau. Une variable en mémoire ne touche pas à
 * l'appareil : elle disparaît avec la page. Le prix à payer : un visiteur qui
 * recharge la page ou ouvre un nouvel onglet perd sa provenance. C'est voulu.
 */
let provenance: Provenance | null = null;

/** Lit l'adresse d'arrivée (« ?utm_source=… ») ; un lien non marqué ne change rien. */
export function retenirProvenance(recherche: string): void {
  const lue = lireProvenance(new URLSearchParams(recherche));
  if (lue) provenance = lue;
}

/** La provenance de cette visite, ou rien. */
export function provenanceVisite(): Provenance | null {
  return provenance;
}
