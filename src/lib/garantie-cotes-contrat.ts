// Extensions écrites en toutes lettres : les tests (node --test) chargent ce fichier tel quel.
import { ENTREPRISE } from "./entreprise.ts";

/* ------------------------------------------------------------------ *
 *  Le contrat de la Garantie cotes, remis au client
 *
 *  L'article L217-22 du code de la consommation : la garantie commerciale
 *  fait l'objet d'un contrat remis au consommateur sur un support durable, au
 *  plus tard à la délivrance du bien. Un lien vers la page des CGV n'en est
 *  pas un (CJUE, 5 juillet 2012, C-49/11, Content Services).
 *
 *  Quand une commande comprend la Garantie cotes, l'e-mail de confirmation
 *  (dans son corps) et la confirmation PDF jointe reproduisent donc, en
 *  entier : l'article 13 des CGV, les coordonnées du garant, et l'encadré
 *  officiel sur la garantie légale de conformité (art. D217-3, modèle de
 *  l'art. D211-2), tels qu'ils sont le jour de la commande — l'e-mail part
 *  au paiement et ne change plus.
 *
 *  Le texte vient des dictionnaires (cgv), le même que la page /cgv : jamais
 *  une deuxième copie à tenir à jour.
 * ------------------------------------------------------------------ */

/** Ce que ce fichier lit dans la section « cgv » d'un dictionnaire (marqueurs déjà remplacés). */
export type TextesCgv = {
  sections: readonly ({ title: string; body: string } & { id?: string })[];
  garantieTitle: string;
  garantieBody: string;
  garantLabel: string;
};

/** Une partie du contrat : un titre, un texte (paragraphes séparés par des retours à la ligne). */
export type PartieContrat = { titre: string; texte: string };

/** Les coordonnées du garant (art. L217-22) : ce que la fiche de l'entreprise contient déjà, rien d'inventé. */
export function coordonneesGarant(): string {
  return ["Auboiacier", ENTREPRISE.raisonSociale, ENTREPRISE.adresse, ENTREPRISE.telephone, "auboiacier@gmail.com"]
    .filter(Boolean)
    .join(" — ");
}

/**
 * Le contrat complet de la Garantie cotes : l'article 13 des CGV suivi des
 * coordonnées du garant, puis l'encadré officiel de la garantie légale.
 */
export function contratGarantieCotes(cgv: TextesCgv): PartieContrat[] {
  const article = cgv.sections.find((section) => section.id === "garantie-cotes");
  if (!article) throw new Error("CGV : l'article « garantie-cotes » est introuvable");
  return [
    { titre: article.title, texte: `${article.body}\n\n${cgv.garantLabel} : ${coordonneesGarant()}` },
    { titre: cgv.garantieTitle, texte: cgv.garantieBody },
  ];
}

/** Le contrat en texte brut, pour le corps d'un e-mail. */
export function contratEnTexte(parties: PartieContrat[]): string {
  return parties.map((partie) => `${partie.titre.toUpperCase()}\n\n${partie.texte}`).join("\n\n\n");
}
