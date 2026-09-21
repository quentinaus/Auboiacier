/* ------------------------------------------------------------------ *
 *  À COMPLÉTER AVANT LA MISE EN VENTE — ces informations sont obligatoires
 *  sur un site marchand français. Tant qu'une ligne est vide, elle ne
 *  s'affiche pas : le client ne lit jamais de « à compléter ».
 *
 *  Elles servent à trois endroits : les mentions légales (éditeur du site),
 *  la politique de confidentialité (responsable du traitement — sans raison
 *  sociale ni adresse, la loi considère qu'il n'est pas identifiable) et
 *  l'en-tête de chaque devis PDF (émetteur).
 *
 *  — raisonSociale : le nom exact déposé (ex. « Aumercier Quentin »).
 *  — statut        : entreprise individuelle, EURL, SASU…
 *  — adresse       : adresse complète du siège.
 *  — siret         : les 14 chiffres du SIRET.
 *  — tva           : n° de TVA intracommunautaire, ou en franchise en base,
 *                     la mention « non applicable, art. 293 B du CGI ».
 *  — assurance     : l'assurance décennale (obligatoire dès qu'il y a de la
 *                     pose chez le client), ex. « Assurance décennale —
 *                     <assureur>, contrat n° 000000, France ».
 *  — telephone     : le numéro que le client peut appeler.
 *
 *  Rappel : le médiateur de la consommation se remplit dans
 *  src/app/[lang]/cgv/page.tsx.
 * ------------------------------------------------------------------ */
export const ENTREPRISE = {
  raisonSociale: "",
  statut: "",
  adresse: "",
  siret: "",
  tva: "",
  assurance: "",
  telephone: "",
};
