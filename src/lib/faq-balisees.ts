// Extensions écrites en toutes lettres : les tests (node --test, sans outil
// de construction) importent ce fichier tel quel.
import type fr from "../app/[lang]/dictionaries/fr.json";
import { remplir } from "./vitrine.ts";

/**
 * Les questions balisées FAQPage pour Google, page par page.
 *
 * Règle : une même question, ou une même réponse, n'est balisée qu'UNE fois
 * sur tout le site. Les pages les prennent ici, et tests/seo-fiches.test.ts
 * vérifie qu'aucune ne revient deux fois. Seules ces trois pages balisent
 * leurs questions : /faq, /artisanat/tables et /toiles-tendues. Ailleurs
 * (fiches produit, bois massif), les questions s'affichent sans balisage.
 */

/** Un dictionnaire, marqueurs remplacés (les deux langues ont les mêmes clés). */
type Dict = typeof fr;

export type QuestionReponse = { q: string; a: string };

/** /faq : toutes les questions de la page. */
export function questionsFaq(dict: Dict): QuestionReponse[] {
  return dict.faq.items.map((item) => ({ q: item.q, a: item.a }));
}

/**
 * /artisanat/tables. `formats` : les tailles du catalogue pour 6, 8 et 10
 * couverts, telles qu'écrites sur la fiche de référence.
 */
export function questionsTables(dict: Dict, formats: string): QuestionReponse[] {
  const t = dict.tables;
  return [
    { q: t.faqTailleQ, a: remplir(t.faqTailleA, { formats }) },
    { q: t.faqBoisQ, a: t.faqBoisA },
    { q: t.faqEntretienQ, a: t.faqEntretienA },
    { q: t.faqDehorsQ, a: t.faqDehorsA },
    { q: t.faqHorsQ, a: t.faqHorsA },
  ];
}

/**
 * /toiles-tendues. `delai` : le délai lu à la ligne « Fabrication » des
 * fiches ; sans délai écrit, la question du délai disparaît. « Quelle
 * différence avec un plafond tendu ? » n'y figure pas : la section
 * « Cadre lumineux ou plafond tendu mur à mur ? » de la même page y répond
 * déjà, et la redire en bas de page faisait doublon.
 */
export function questionsPlafonds(dict: Dict, delai: string | null): QuestionReponse[] {
  const tl = dict.lumiere;
  return [
    tl.faq[0],
    tl.faq[1],
    { q: dict.artisanat.faqToileQ, a: dict.artisanat.faqToileA },
    ...(delai ? [{ q: tl.faq[2].q, a: remplir(tl.faq[2].a, { delai }) }] : []),
  ];
}
