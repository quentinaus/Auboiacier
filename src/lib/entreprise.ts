/* ------------------------------------------------------------------ *
 *  LA FICHE DE L'ENTREPRISE — LE SEUL ENDROIT À REMPLIR LE JOUR DU SIRET.
 *
 *  Tant qu'une ligne est vide, elle ne s'affiche pas : le client ne lit
 *  jamais de « à compléter ». Elle sert partout où la loi demande qui vend :
 *  les mentions légales (éditeur du site), la politique de confidentialité
 *  (responsable du traitement), les CGV (TVA, médiateur), l'en-tête de chaque
 *  devis PDF et le bas des factures Stripe.
 *
 *  — raisonSociale  : le nom exact déposé (ex. « Aumercier Quentin »).
 *  — statut         : entreprise individuelle, EURL, SASU…
 *  — adresse        : adresse complète du siège (pour une EI : ton domicile,
 *                      ou une domiciliation).
 *  — siret          : les 14 chiffres du SIRET.
 *  — immatriculation: le registre, ex. « RNE — SIREN 000 000 000 ».
 *  — tva            : n° de TVA intracommunautaire, ou en franchise en base
 *                      la mention « non applicable, art. 293 B du CGI ».
 *  — tvaMention     : la même chose en phrase, dans les deux langues, pour
 *                      les CGV (ex. « TVA non applicable, article 293 B du
 *                      CGI » / « VAT not applicable, article 293 B of the
 *                      French Tax Code »).
 *  — assurance      : l'assurance décennale (obligatoire dès qu'il y a de la
 *                      pose chez le client), ex. « Assurance décennale —
 *                      <assureur>, contrat n° 000000, France ».
 *  — telephone      : le numéro que le client peut appeler.
 *  — mediateur      : le médiateur de la consommation auquel tu adhères
 *                      (obligatoire pour vendre à des particuliers).
 *
 *  GARDE-FOU : les ventes en ligne ne s'ouvrent que lorsque TOUTES les
 *  lignes obligatoires sont remplies (voir champsManquants). Remplir le SIRET
 *  seul ne suffit pas : vendre sans médiateur, sans adresse ou sans mention
 *  de TVA serait vendre hors des règles.
 * ------------------------------------------------------------------ */
export const ENTREPRISE = {
  raisonSociale: "",
  statut: "",
  adresse: "",
  siret: "",
  immatriculation: "",
  tva: "",
  tvaMention: { fr: "", en: "" },
  assurance: "",
  telephone: "07 82 37 23 79",
  mediateur: { nom: "", adresse: "", site: "" },
};

/** Un SIRET, c'est 14 chiffres (on tolère les espaces à la saisie). */
export function siretValide(siret: string) {
  return /^\d{14}$/.test(siret.replace(/\s/g, ""));
}

/** La fiche telle que le garde-fou la relit (un paramètre, pour les tests). */
type Fiche = typeof ENTREPRISE;

/**
 * Ce qu'il manque encore pour vendre en règle, en clair. Vide = tout y est.
 *
 * Chaque ligne est une obligation : l'identité, l'adresse et le téléphone de
 * l'éditeur (LCEN, art. 6), le SIRET et le registre (code de commerce), la
 * TVA (code général des impôts), l'assurance décennale pour la pose (code
 * des assurances), le médiateur (code de la consommation, L612-1 et L616-1).
 */
export function champsManquants(fiche: Fiche = ENTREPRISE): string[] {
  const vide = (v: string) => v.trim() === "";
  return [
    vide(fiche.raisonSociale) && "raison sociale",
    vide(fiche.statut) && "statut juridique",
    vide(fiche.adresse) && "adresse du siège",
    !siretValide(fiche.siret) && "SIRET (14 chiffres)",
    vide(fiche.immatriculation) && "immatriculation (RNE)",
    vide(fiche.tva) && "TVA (numéro ou « non applicable, art. 293 B du CGI »)",
    (vide(fiche.tvaMention.fr) || vide(fiche.tvaMention.en)) && "mention de TVA des CGV (français et anglais)",
    vide(fiche.assurance) && "assurance décennale",
    vide(fiche.telephone) && "téléphone",
    (vide(fiche.mediateur.nom) || vide(fiche.mediateur.site)) && "médiateur de la consommation (nom et site)",
  ].filter((ligne): ligne is string => typeof ligne === "string");
}

/**
 * Les commandes payées s'ouvrent quand l'entreprise existe ET que tout ce que
 * la loi demande d'afficher est rempli. Jusque-là, le panier propose « Me
 * prévenir à l'ouverture » à la place du paiement, et /api/commande refuse de
 * créer un paiement.
 */
export function commandesOuvertes(fiche: Fiche = ENTREPRISE) {
  return champsManquants(fiche).length === 0;
}

/**
 * L'interrupteur « décennale » (plan de référencement, lot L10) : poser chez
 * le client demande l'assurance décennale (code des assurances, art. L241-1
 * et L243-3). Tant que la ligne `assurance` est vide, aucun texte nouveau ne
 * promet la pose ; il dit à la place qu'elle sera proposée une fois
 * l'assurance signée (guide de l'escalier, page balcon et terrasse).
 */
export function poseAssuree(fiche: Fiche = ENTREPRISE) {
  return fiche.assurance.trim() !== "";
}
