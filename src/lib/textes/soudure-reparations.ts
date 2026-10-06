// Extension écrite en toutes lettres : les tests (node --test, sans outil de
// construction) importent ce fichier tel quel.
import type { Locale } from "../i18n.ts";
import { DATE_OUVERTURE_COMMANDES } from "../ouverture.ts";
import { jourEnLettres } from "./garde-corps-balcon-terrasse.ts";

/**
 * Les textes de la page « Soudure et réparations à Saumur »
 * (/fr/soudure-reparations, /en/soudure-reparations), en français et en
 * anglais. Quentin l'a confirmée le 07/10/2026 : il veut vendre aussi la
 * soudure à façon et les réparations.
 *
 * Recherches visées (suggestions Google relevées le 07/10/2026) : « soudeur
 * saumur », « soudure saumur », « entreprise soudure saumur », « réparation
 * soudure », « réparation portail métallique / fer / aluminium »,
 * « réparation garde corps », « soudure portail », « soudure aluminium »,
 * « soudure tig », « soudeur particulier », « fabrication pièce métallique
 * sur mesure », « soudure à façon » ; EN « welder saumur france »,
 * « welding repair », « metal gate repair », « aluminium welding ».
 * « métallier Saumur » reste à l'accueil, « soudeur-métallier » et le nom de
 * Quentin à la page À propos : aucun de ces mots dans le titre ici.
 *
 * Ce qui est vrai, et seulement cela :
 * - Quentin soude au TIG, au MAG et à l'électrode ; l'aluminium au TIG
 *   (« bon soudeur alu, TIG si besoin », 06/10/2026). CAP Métallier et
 *   BP Métallier (07/10/2026). Plus de cinq ans de soudure.
 * - L'inox n'est PAS annoncé (à confirmer avec Quentin) : la FAQ dit
 *   seulement « envoyez une photo, nous vous disons si c'est faisable ».
 * - Aucune promesse de pose ni de soudure chez le client (assurance pas
 *   encore signée) : une pièce qui se démonte se répare à l'atelier ; pour
 *   le reste, on regarde sur photo.
 * - L'atelier OUVRE à Saumur : avant l'ouverture des commandes
 *   (DATE_OUVERTURE_COMMANDES, src/lib/ouverture.ts), seulement des demandes
 *   de devis. Le jour n'est pas écrit ici : le texte dit « {ouverture} »,
 *   rempli par valeursSoudure, comme sur la page balcon et terrasse.
 * - Aucun prix écrit à la main : « sur devis » ; la prise de cotes passe par
 *   ses marqueurs ({prixVisite}, {rayonVisite}), remplacés par la page.
 * - Jamais « artisan » (loi 96-603, art. 21, avant l'immatriculation), ni
 *   aucun mot de la liste « Jamais » du plan de référencement.
 */

/** L'adresse de la page, sans la langue. */
export const CHEMIN_SOUDURE = "/soudure-reparations";

type Bloc = { titre: string; texte: string };

export type TextesSoudure = {
  seo: { title: string; description: string };
  /** Le nom de la page dans le fil d'Ariane (visible et balisé). */
  filAriane: string;
  surtitre: string;
  h1: string;
  intro: string;
  /** Affiché tant que les commandes ne sont pas ouvertes (commandesOuvertes). */
  ouverture: string;
  ctaDevis: string;
  ctaDevisNote: string;
  ctaCotes: string;
  ctaCotesNote: string;
  /** La première ligne du message, quand on arrive sur le formulaire de contact depuis cette page. */
  prefillContact: string;
  travauxTitre: string;
  travauxIntro: string;
  travaux: Bloc[];
  procedesTitre: string;
  procedesIntro: string;
  procedes: Bloc[];
  matieres: string;
  demandeTitre: string;
  etapes: Bloc[];
  cotesTexte: string;
  cotesLien: string;
  prixTitre: string;
  prixTexte: string;
  quiTitre: string;
  quiTexte: string;
  /** « English spoken » : sur la page anglaise seulement. */
  quiLangue: string;
  quiLien: string;
  zoneTexte: string;
  zoneLien: string;
  neufTitre: string;
  neufTexte: string;
  neuf: { titre: string; texte: string; chemin: string }[];
  faqTitre: string;
  /** Questions affichées, JAMAIS balisées (FAQPage réservée à /faq, /artisanat/tables et /toiles-tendues). */
  faq: { q: string; a: string }[];
  finTitre: string;
  finTexte: string;
  finLienFaq: string;
  /** Le service, pour Google (jsonLdService) : le même nom que l'offre de l'atelier (OFFRES, src/lib/seo.ts). */
  service: { nom: string; type: string };
};

export const TEXTES_SOUDURE: Record<Locale, TextesSoudure> = {
  fr: {
    seo: {
      title: "Soudeur à Saumur : soudure et réparation",
      description:
        "Soudure et réparations à Saumur : portails, garde-corps, rampes, mobilier et pièces à façon en acier ou aluminium, TIG ou MAG. Devis gratuit sur photo.",
    },
    filAriane: "Soudure et réparations",
    surtitre: "Acier et aluminium · TIG, MAG, électrode",
    h1: "Soudure et réparations à Saumur",
    intro:
      "Un gond arraché, un barreau cassé, un pied de chaise fendu, une pièce qu'on ne trouve plus : l'atelier Auboiacier, qui ouvre à Saumur, ressoude l'acier et l'aluminium, et fabrique à façon la pièce qu'il vous faut. Envoyez une photo, vous recevez un devis.",
    ouverture: "Les commandes ouvrent le {ouverture}. D'ici là, vous pouvez déjà envoyer vos demandes de devis.",
    ctaDevis: "Demander un devis",
    ctaDevisNote: "Avec une photo et les dimensions",
    ctaCotes: "Faire mesurer sur place",
    ctaCotesNote: "Prise de cotes dès {prixVisite}",
    prefillContact: "Soudure ou réparation",
    travauxTitre: "Ce que l'atelier soude et répare",
    travauxIntro:
      "À l'intérieur comme au jardin, de la petite pièce au portail : si le métal peut se souder, nous regardons ce qui peut être fait.",
    travaux: [
      {
        titre: "Portails et portillons",
        texte:
          "Gond ou paumelle arrachés, cadre fendu, barreau cassé ou tordu, support de serrure à ressouder : en acier ou en aluminium.",
      },
      {
        titre: "Garde-corps, rampes et grilles",
        texte:
          "Barreau décollé, main courante fendue, élément manquant refait en acier, au plus près de l'existant, d'après la pièce d'origine ou une photo.",
      },
      {
        titre: "Mobilier et objets en métal",
        texte:
          "Pied de table ou de chaise cassé, salon de jardin, étagère, support : l'atelier ressoude, et la finition (peinture) se chiffre au devis.",
      },
      {
        titre: "Pièces faites à façon",
        texte:
          "Une équerre, une platine, un support, un cadre : fabriqués en acier d'après vos cotes, un croquis ou la pièce à remplacer. Vous pouvez aussi fournir le métal : c'est la soudure à façon.",
      },
    ],
    procedesTitre: "TIG, MAG ou électrode : le procédé qui convient à la pièce",
    procedesIntro:
      "Quentin soude au TIG, au MAG et à l'électrode. Le procédé se choisit selon le métal, son épaisseur et la soudure à faire.",
    procedes: [
      {
        titre: "TIG",
        texte:
          "Pour l'acier fin et pour l'aluminium : une soudure précise et propre, que l'on peut meuler avant la peinture.",
      },
      {
        titre: "MAG",
        texte:
          "Pour l'acier plus épais : un cordon régulier et bien pénétré, sur les pièces qui travaillent, comme un cadre de portail ou un support.",
      },
      {
        titre: "Électrode",
        texte:
          "Pour l'acier épais : le plus robuste des trois procédés, et il ne craint pas le vent.",
      },
    ],
    matieres:
      "Les métaux soudés : l'acier (tubes, fers plats, cornières, tôles) et l'aluminium, au TIG.",
    demandeTitre: "Demander un devis, en quatre étapes",
    etapes: [
      {
        titre: "Photographiez la pièce",
        texte: "Une vue d'ensemble, puis une vue de près de la casse. Un mètre posé à côté donne l'échelle.",
      },
      {
        titre: "Donnez les dimensions",
        texte: "La longueur, l'épaisseur du métal si vous la connaissez, et le métal s'il est connu : acier ou aluminium.",
      },
      {
        titre: "Envoyez votre demande",
        texte: "Par le formulaire de contact, photos jointes. Quentin la lit lui-même.",
      },
      {
        titre: "Recevez le devis",
        texte: "Le prix, le délai, et la façon de procéder : pièce apportée à l'atelier, ou visite si l'ouvrage doit être mesuré sur place.",
      },
    ],
    cotesTexte:
      "Une grille ou un garde-corps à refaire, qu'il faut mesurer sur place ? L'atelier vient relever les cotes chez vous : {prixVisite} jusqu'à {rayonVisite} km de Saumur ; au-delà, le prix dépend de la distance.",
    cotesLien: "Réserver une prise de cotes",
    prixTitre: "Prix et délais : sur devis",
    prixTexte:
      "Chaque réparation est différente : le prix se fait sur devis, gratuit et sans engagement. Il dépend du métal, de la longueur à souder, des pièces à refaire et de la finition. Le délai est donné avec le devis.",
    quiTitre: "Qui soude votre pièce",
    quiTexte:
      "Quentin Aumercier, soudeur-métallier, titulaire du CAP Métallier et du BP Métallier. Plus de cinq ans de soudure, au TIG, au MAG et à l'électrode, en France puis en Australie. À Saumur, il travaille seul : celui qui lit votre demande est celui qui soude votre pièce.",
    quiLangue: "",
    quiLien: "Son parcours",
    zoneTexte: "L'atelier est à Saumur, en Maine-et-Loire, entre l'Anjou et la Touraine.",
    zoneLien: "Voir la zone d'intervention",
    neufTitre: "Quand il vaut mieux refaire à neuf",
    neufTexte:
      "Une pièce trop rongée par la rouille ne vaut plus une réparation : le devis vous le dit. L'atelier peut alors la refaire, à vos cotes.",
    neuf: [
      {
        titre: "Garde-corps de fenêtre",
        texte: "En acier plein, fabriqué à vos cotes, avec son prix calculé en ligne.",
        chemin: "/artisanat/garde-corps",
      },
      {
        titre: "Garde-corps de balcon et de terrasse",
        texte: "En acier, dessiné et soudé à vos cotes, sur devis.",
        chemin: "/garde-corps-balcon-terrasse",
      },
      {
        titre: "Escalier à limon central",
        texte: "Un limon en tube d'acier, des marches en bois massif, sur devis.",
        chemin: "/artisanat/escalier-limon-central",
      },
      {
        titre: "Verrières d'atelier",
        texte: "En acier, mesurées sur place et soudées à l'atelier, sur devis.",
        chemin: "/artisanat/verrieres",
      },
    ],
    faqTitre: "Vos questions",
    faq: [
      {
        q: "Quels métaux soudez-vous ?",
        a: "L'acier et l'aluminium. Pour un autre métal, comme l'inox ou la fonte, envoyez une photo : nous vous disons franchement si la réparation est faisable. L'atelier ne fait ni la soudure à l'étain (électronique, bijoux), ni celle du plastique, ni celle du zinc des gouttières.",
      },
      {
        q: "Travaillez-vous pour les particuliers ?",
        a: "Oui, pour les particuliers comme pour les professionnels. Décrivez la pièce : le devis dit ce que coûte la réparation, avant tout travail.",
      },
      {
        q: "Faut-il apporter la pièce à l'atelier ?",
        a: "Une pièce qui se démonte se répare à l'atelier, à Saumur. Pour un portail ou un garde-corps fixé au mur, dites-le dans votre demande : nous regardons avec vous, sur photo, la bonne façon de faire.",
      },
      {
        q: "Une soudure tient-elle comme une pièce neuve ?",
        a: "Sur un métal sain, une soudure bien faite tient. Sur un métal rongé par la rouille, elle ne tient pas mieux que ce qui l'entoure : nous vous le disons au devis, et nous vous proposons alors de refaire la pièce.",
      },
    ],
    finTitre: "Une pièce à souder ou à réparer ?",
    finTexte: "Envoyez une photo et les dimensions : vous recevez un devis, gratuit et sans engagement.",
    finLienFaq: "Toutes les questions fréquentes",
    service: { nom: "Soudure et réparation à façon", type: "Soudure" },
  },
  en: {
    seo: {
      title: "Welder in Saumur: welding and repairs",
      description:
        "Welder in Saumur, France: repairs to gates, railings and metal furniture, parts welded to order in steel or aluminium, TIG or MIG/MAG. Free quote.",
    },
    filAriane: "Welding and repairs",
    surtitre: "Steel and aluminium · TIG, MIG/MAG, stick",
    h1: "Welding and metal repairs in Saumur",
    intro:
      "A hinge torn off, a broken bar, a cracked chair leg, a part you can no longer find: the Auboiacier workshop, opening in Saumur, re-welds steel and aluminium, and makes the part you need, to order. Send a photo and you get a quote.",
    ouverture: "Orders open on {ouverture}. Until then, you can already send your quote requests.",
    ctaDevis: "Ask for a quote",
    ctaDevisNote: "With a photo and the dimensions",
    ctaCotes: "Have it measured on site",
    ctaCotesNote: "Site measurement from {prixVisite}",
    prefillContact: "Welding or repair",
    travauxTitre: "What the workshop welds and repairs",
    travauxIntro:
      "Indoors or in the garden, from a small part to a gate: if the metal can be welded, we look at what can be done.",
    travaux: [
      {
        titre: "Gates and side gates",
        texte: "A hinge torn off, a cracked frame, a broken or bent bar, a lock bracket to weld back on: in steel or aluminium.",
      },
      {
        titre: "Railings, banisters and grilles",
        texte:
          "A loose bar, a split handrail, a missing piece remade in steel, as close as possible to the original, from the old part or a photo.",
      },
      {
        titre: "Metal furniture and objects",
        texte:
          "A broken table or chair leg, garden furniture, a shelf, a bracket: the workshop welds it back, and the finish (paint) is priced in the quote.",
      },
      {
        titre: "Parts made to order",
        texte:
          "A bracket, a plate, a support, a frame: made in steel from your measurements, a sketch or the part to replace. You can also supply the metal and have it welded.",
      },
    ],
    procedesTitre: "TIG, MIG/MAG or stick: the process that suits the part",
    procedesIntro:
      "Quentin welds with TIG, MIG/MAG and stick. The process depends on the metal, its thickness and the weld to be made.",
    procedes: [
      {
        titre: "TIG",
        texte: "For thin steel and for aluminium: a precise, clean weld that can be ground smooth before painting.",
      },
      {
        titre: "MIG/MAG",
        texte: "For thicker steel: an even, well-penetrated bead, on parts under load, such as a gate frame or a bracket.",
      },
      {
        titre: "Stick",
        texte: "For thick steel: the toughest of the three processes, and it does not mind the wind.",
      },
    ],
    matieres: "Metals welded: steel (tubes, flat bars, angles, sheet) and aluminium, TIG welded.",
    demandeTitre: "Asking for a quote, in four steps",
    etapes: [
      {
        titre: "Take a photo of the part",
        texte: "One overall view, then a close-up of the break. A tape measure next to it gives the scale.",
      },
      {
        titre: "Give the dimensions",
        texte: "The length, the thickness of the metal if you know it, and the metal if known: steel or aluminium.",
      },
      {
        titre: "Send your request",
        texte: "Through the contact form, with your photos attached. Quentin reads it himself.",
      },
      {
        titre: "Get the quote",
        texte: "The price, the lead time and how we go about it: the part brought to the workshop, or a visit if the work has to be measured on site.",
      },
    ],
    cotesTexte:
      "A grille or a railing to remake that needs measuring on site? The workshop comes to take the measurements at your home: {prixVisite} within {rayonVisite} km of Saumur; further away, the price depends on the distance.",
    cotesLien: "Book a site measurement",
    prixTitre: "Prices and lead times: quoted per job",
    prixTexte:
      "Every repair is different, so each one is quoted, free and with no obligation. The price depends on the metal, the length of weld, the parts to remake and the finish. The lead time comes with the quote.",
    quiTitre: "Who welds your part",
    quiTexte:
      "Quentin Aumercier, welder-metalworker, holder of the French CAP Métallier and BP Métallier diplomas. More than five years of welding, TIG, MIG/MAG and stick, in France and then in Australia. In Saumur he works alone: the person who reads your request is the one who welds your part.",
    quiLangue: "English spoken.",
    quiLien: "His story",
    zoneTexte: "The workshop is in Saumur, in the Loire Valley, between Anjou and Touraine.",
    zoneLien: "See the area we cover",
    neufTitre: "When it is better to make it new",
    neufTexte:
      "A part eaten through by rust is no longer worth repairing: the quote tells you so. The workshop can then make it again, to your measurements.",
    neuf: [
      {
        titre: "Window railings",
        texte: "In solid steel, made to your measurements, priced online.",
        chemin: "/artisanat/garde-corps",
      },
      {
        titre: "Balcony and terrace railings",
        texte: "In steel, designed and welded to your measurements, quoted per project.",
        chemin: "/garde-corps-balcon-terrasse",
      },
      {
        titre: "Steel spine staircase",
        texte: "A steel tube spine and solid wood treads, quoted per project.",
        chemin: "/artisanat/escalier-limon-central",
      },
      {
        titre: "Steel internal windows",
        texte: "In steel, measured on site and welded in the workshop, quoted per project.",
        chemin: "/artisanat/verrieres",
      },
    ],
    faqTitre: "Your questions",
    faq: [
      {
        q: "Which metals do you weld?",
        a: "Steel and aluminium. For another metal, such as stainless steel or cast iron, send a photo: we will tell you honestly whether the repair can be done. The workshop does not do soldering (electronics, jewellery), plastic welding or zinc guttering.",
      },
      {
        q: "Do you work for private customers?",
        a: "Yes, for private customers as well as for businesses. Describe the part: the quote tells you what the repair costs, before any work starts.",
      },
      {
        q: "Do I need to bring the part to the workshop?",
        a: "A part that can be taken off is repaired in the workshop, in Saumur. For a gate or a railing fixed to the wall, say so in your request: we look at the right way to go about it with you, from photos.",
      },
      {
        q: "Is a welded part as strong as a new one?",
        a: "On sound metal, a well-made weld holds. On metal eaten by rust, it holds no better than what surrounds it: we tell you so in the quote, and then offer to make the part again.",
      },
    ],
    finTitre: "A part to weld or repair?",
    finTexte: "Send a photo and the dimensions: you get a quote, free and with no obligation.",
    finLienFaq: "All frequently asked questions",
    service: { nom: "Welding and metal repairs", type: "Welding" },
  },
};

/**
 * Les valeurs des marqueurs propres à la page (« {ouverture} » : le jour
 * d'ouverture des commandes, lu dans DATE_OUVERTURE_COMMANDES), au format de
 * remplacerAvec (src/lib/marqueurs.ts). La page les remplace après les
 * marqueurs du code.
 */
export function valeursSoudure(locale: Locale): Record<string, string> {
  return { "{ouverture}": jourEnLettres(DATE_OUVERTURE_COMMANDES, locale, true) };
}
