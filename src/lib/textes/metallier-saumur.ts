// Extensions écrites en toutes lettres : le test (node --test, sans outil de
// construction) importe ce fichier tel quel.
import { RAYON_MAX_KM } from "../deplacement.ts";
import type { Locale } from "../i18n.ts";
import { remplacerMarqueurs, verifierMarqueurs } from "../marqueurs.ts";

/**
 * LA PAGE « MÉTALLIER À SAUMUR » (/fr et /en /metallier-saumur), 12/10/2026 : l'adresse naturelle de la recherche
 * « métallier Saumur », qui renvoyait une 404. Elle répond à « qui est le métallier de Saumur, que fait-il, où,
 * comment le joindre » et mène vers chaque métier. Elle ne recopie ni l'accueil, ni la zone d'intervention
 * (communes et départements, déjà là), ni la page soudure : elle les relie.
 *
 * Recherches visées : « métallier Saumur », « métallerie Saumur », « métallier Maine-et-Loire », « atelier de métallerie
 * Saumur » ; EN « metalworker Saumur », « metal fabricator Saumur », « metalwork Saumur ».
 *
 * CE QUE LA PAGE NE FAIT PAS :
 * - aucun prix tapé : la prise de cotes vient de {prixVisite} et {rayonVisite} (src/lib/marqueurs.ts), le rayon de pose de
 *   RAYON_MAX_KM ;
 * - aucune promesse nouvelle : les délais, devis, déplacements et la pose sont ceux des questions fréquentes et de la
 *   zone d'intervention (tests/metallier-saumur.test.ts les compare aux dictionnaires) ;
 * - la soudure et les garde-corps de balcon sont « sur devis », sans mot de pose (pas de pose tant que l'assurance
 *   décennale n'est pas signée) ;
 * - ni « artisan », ni « premium », ni « certifié », ni « pose comprise » (loi 96-603, art. 21, avant l'immatriculation) ;
 * - la FAQ est visible, jamais balisée (seules /faq, /artisanat/tables, /toiles-tendues et le guide de l'escalier le sont,
 *   tests/seo-fiches.test.ts).
 */

type Bloc = { titre: string; texte: string };
type Metier = { titre: string; texte: string; lien: string; chemin: string };

export type TextesMetallierSaumur = {
  seo: { title: string; description: string };
  fil: string;
  surtitre: string;
  h1: string;
  intro: string;
  ctaDevis: string;
  ctaRdv: string;
  ctaContact: string;
  faitTitre: string;
  faitIntro: string;
  fait: Metier[];
  pourTitre: string;
  pour: Bloc[];
  deroulementTitre: string;
  deroulement: Bloc[];
  ouTitre: string;
  ouTexte: string[];
  ouCommunes: string;
  ouLien: string;
  contactTitre: string;
  contactIntro: string;
  contactLabels: { adresse: string; telephone: string; email: string; horaires: string };
  contactAdresse: string;
  faqTitre: string;
  faq: { q: string; r: string }[];
  finTitre: string;
  fin: string;
  /** Une ligne de plus sur la page anglaise (vide en français). */
  anglais: string;
  voirAussi: string;
  liens: { zone: string; apropos: string; faq: string; bois: string };
  service: { nom: string; type: string };
};

const FR: TextesMetallierSaumur = {
  seo: {
    title: "Métallier à Saumur : atelier sur mesure",
    description:
      "Métallier à Saumur : garde-corps, portails, escalier à limon central, tables, verrières et soudure sur mesure. Fabriqué à l'atelier, posé jusqu'à {rayonMax} km.",
  },
  fil: "Métallier à Saumur",
  surtitre: "Atelier de métallerie · Saumur, Maine-et-Loire",
  h1: "Métallier à Saumur, atelier de métallerie sur mesure",
  intro:
    "Auboiacier est un atelier de métallerie à Saumur (49400). Quentin Aumercier, métallier-soudeur, y dessine, soude et finit chaque pièce à vos cotes : celui qui lit votre demande est celui qui la fabrique.",
  ctaDevis: "Demander un devis",
  ctaRdv: "Prendre rendez-vous",
  ctaContact: "Nous écrire",

  faitTitre: "Ce que fait le métallier de Saumur",
  faitIntro: "Tout est fabriqué à la commande, à vos cotes, sans stock ni série. Chaque ouvrage a sa page.",
  fait: [
    {
      titre: "Garde-corps de fenêtre",
      texte: "En acier plein, fabriqué à vos cotes, avec son prix calculé en ligne.",
      lien: "Garde-corps de fenêtre sur mesure",
      chemin: "/artisanat/famille/garde-corps",
    },
    {
      titre: "Garde-corps de balcon et de terrasse",
      texte: "Balcon, terrasse et rampe d'escalier extérieur, en acier soudé à la main, sur devis.",
      lien: "Garde-corps de balcon et de terrasse",
      chemin: "/garde-corps-balcon-terrasse",
    },
    {
      titre: "Portails",
      texte: "Battant, coulissant, pliant ou portillon, en alu ou en acier, composés en ligne.",
      lien: "Portail sur mesure à Saumur",
      chemin: "/portail-sur-mesure-saumur",
    },
    {
      titre: "Escalier à limon central",
      texte: "Droit, quart tournant ou demi-tournant, marches en bois massif, mesuré et posé par l'atelier.",
      lien: "Escalier à limon central",
      chemin: "/artisanat/escalier-limon-central",
    },
    {
      titre: "Verrières d'intérieur",
      texte: "Mesurées chez vous, soudées à l'atelier, puis posées.",
      lien: "Verrière d'atelier en acier",
      chemin: "/artisanat/verrieres",
    },
    {
      titre: "Tables en acier et bois massif",
      texte: "Plateau en bois massif sur piétement en acier soudé, au centimètre près.",
      lien: "Tables sur mesure bois et acier",
      chemin: "/artisanat/tables",
    },
    {
      titre: "Plafonds lumineux",
      texte: "Toile tendue rétroéclairée sur cadre aluminium, rectangle ou disque.",
      lien: "Plafond lumineux à toile tendue",
      chemin: "/toiles-tendues",
    },
    {
      titre: "Soudure sur mesure",
      texte: "Une pièce cassée, à refaire ou introuvable, en acier ou en aluminium : envoyez une photo, vous recevez un devis.",
      lien: "Soudure et réparations à Saumur",
      chemin: "/soudure-reparations",
    },
  ],

  pourTitre: "Pour qui l'atelier travaille",
  pour: [
    {
      titre: "Les particuliers",
      texte:
        "Maisons, appartements et ateliers de Saumur, d'Anjou et du Val de Loire. Vous parlez directement à l'atelier qui dessine et soude votre pièce, sans intermédiaire.",
    },
    {
      titre: "Les maisons anciennes",
      texte:
        "Autour de Saumur, beaucoup de maisons sont en tuffeau. Pour un garde-corps de fenêtre, la fixation se choisit selon votre mur : l'atelier le regarde avant de fabriquer. Dans le centre de Saumur et les secteurs protégés, une modification de façade peut demander une déclaration préalable en mairie : renseignez-vous avant de commander.",
    },
    {
      titre: "Une pièce à souder ou à refaire",
      texte:
        "Un gond arraché, un barreau cassé, une pièce qu'on ne trouve plus : envoyez une photo et les dimensions. Le devis est gratuit et sans engagement.",
    },
  ],

  deroulementTitre: "Comment se passe un projet",
  deroulement: [
    {
      titre: "Vous décrivez votre projet",
      texte: "Par le formulaire ou par e-mail, avec des photos ou des plans si vous en avez. Réponse sous 48 h, avec une estimation écrite.",
    },
    {
      titre: "La prise de cotes",
      texte:
        "Pour du sur-mesure, l'atelier vient relever les cotes chez vous : {prixVisite} jusqu'à {rayonVisite} km de Saumur ; au-delà, le prix dépend de la distance. Vous êtes loin ? Nous travaillons sur vos plans.",
    },
    {
      titre: "Le prix, avant de commander",
      texte:
        "Pour la plupart des pièces, le prix s'affiche en ligne à vos cotes, avec un devis PDF gratuit, sans compte et sans engagement. Pour le reste, le devis est écrit et gratuit.",
    },
    {
      titre: "La fabrication à l'atelier",
      texte:
        "À Saumur, à la commande. L'acier y est coupé, soudé à la main et peint ; le bois massif est mis à vos cotes, poncé et huilé. Le délai va de 3 à 12 semaines selon la pièce et vous est confirmé par écrit à la commande.",
    },
    {
      titre: "La pose, la livraison ou le retrait",
      texte:
        "L'atelier pose jusqu'à {rayonMax} km de Saumur, et revient faire un réglage si la pièce en demande un. Les pièces de la collection peuvent aussi être livrées par transporteur dans toute la France métropolitaine, ou retirées à l'atelier, à Saumur, sur rendez-vous.",
    },
  ],

  ouTitre: "Où l'atelier travaille",
  ouTexte: [
    "L'atelier est à Saumur, en Maine-et-Loire, entre l'Anjou et la Touraine. À Saumur et dans les communes voisines, il vient relever les cotes chez vous, puis poser la pièce.",
    "Il se déplace jusqu'à {rayonMax} km de Saumur : Maine-et-Loire, Indre-et-Loire, Deux-Sèvres et Vienne. Le déplacement est chiffré dans le devis. Au-delà, l'atelier ne se déplace ni pour relever les cotes ni pour poser.",
  ],
  ouCommunes: "Communes proches de Saumur",
  ouLien: "Métallier en Maine-et-Loire et en Touraine : la zone d'intervention",

  contactTitre: "Joindre le métallier de Saumur",
  contactIntro: "Un projet, une question, une pièce à souder : écrivez-nous ou appelez-nous.",
  contactLabels: { adresse: "Atelier", telephone: "Téléphone", email: "E-mail", horaires: "Horaires" },
  contactAdresse: "Saumur (49400), Maine-et-Loire",

  faqTitre: "Vos questions",
  faq: [
    {
      q: "Où se trouve votre atelier ?",
      r: "À Saumur (49400), en Maine-et-Loire, entre l'Anjou et la Touraine. C'est là que l'acier est coupé, soudé et peint, et que le bois massif est mis à vos cotes.",
    },
    {
      q: "Faites-vous des devis gratuits ?",
      r: "Oui, et sans engagement. Décrivez votre projet par le formulaire de contact : vous recevez une réponse sous 48 h et une estimation écrite. Pour un garde-corps, une table, un plafond lumineux ou un portail, le configurateur donne le prix tout de suite, et vous téléchargez un devis PDF gratuit.",
    },
    {
      q: "Quels sont vos délais ?",
      r: "Tout est fabriqué à la commande. Le délai va de 3 à 12 semaines selon la pièce, et il vous est confirmé par écrit à la commande. Certaines étapes sont incompressibles : séchage du bois, soudure, peinture, finition.",
    },
    {
      q: "Jusqu'où l'atelier se déplace-t-il ?",
      r: "Jusqu'à {rayonMax} km de Saumur, pour relever les cotes et poser. Plus loin, un garde-corps se fabrique sur les cotes que vous prenez vous-même, puis il est expédié.",
    },
    {
      q: "Combien coûte la prise de cotes à domicile ?",
      r: "{prixVisite} jusqu'à {rayonVisite} km de Saumur ; au-delà, son prix dépend de la distance.",
    },
    {
      q: "Faites-vous aussi de la soudure sur mesure ?",
      r: "Oui, sur l'acier et sur l'aluminium, au TIG, au MAG et à l'électrode. Envoyez une photo avec les dimensions : le devis est gratuit et sans engagement.",
    },
  ],

  finTitre: "Parlons de votre projet",
  fin: "Décrivez-le en quelques lignes : nous revenons vers vous sous 48 h avec une première estimation.",
  anglais: "",
  voirAussi: "À voir aussi",
  liens: {
    zone: "Zone d'intervention autour de Saumur",
    apropos: "À propos de l'atelier",
    faq: "Questions fréquentes",
    bois: "Le bois massif à l'atelier",
  },
  service: { nom: "Métallier à Saumur : fabrication et pose sur mesure", type: "Métallerie sur mesure" },
};

const EN: TextesMetallierSaumur = {
  seo: {
    title: "Metalworker in Saumur: bespoke workshop",
    description:
      "Metalworker in Saumur, France: railings, gates, spine staircases, tables, steel partitions and welding made to measure. Fitted within {rayonMax} km.",
  },
  fil: "Metalworker in Saumur",
  surtitre: "Metalwork workshop · Saumur, Maine-et-Loire",
  h1: "Metalworker in Saumur, a bespoke metalwork workshop",
  intro:
    "Auboiacier is a metalwork workshop in Saumur (49400), France. Quentin Aumercier, a metalworker and welder, designs, welds and finishes every piece to your measurements: the person who reads your request is the one who makes it.",
  ctaDevis: "Ask for a quote",
  ctaRdv: "Book an appointment",
  ctaContact: "Write to us",

  faitTitre: "What the Saumur metalworker makes",
  faitIntro: "Everything is made to order, to your measurements, with no stock and no series. Each piece of work has its own page.",
  fait: [
    {
      titre: "Window railings",
      texte: "Solid steel, made to your measurements, with the price shown online.",
      lien: "Bespoke window railings",
      chemin: "/artisanat/famille/garde-corps",
    },
    {
      titre: "Balcony and terrace railings",
      texte: "Balcony, terrace and outdoor stair railings, in steel welded by hand, quoted per project.",
      lien: "Balcony and terrace railings",
      chemin: "/garde-corps-balcon-terrasse",
    },
    {
      titre: "Gates",
      texte: "Swing, sliding, folding or pedestrian gate, in aluminium or steel, designed online.",
      lien: "Bespoke gates in Saumur",
      chemin: "/portail-sur-mesure-saumur",
    },
    {
      titre: "Central stringer staircase",
      texte: "Straight, quarter turn or half turn, solid wood treads, measured and fitted by the workshop.",
      lien: "Steel spine staircase",
      chemin: "/artisanat/escalier-limon-central",
    },
    {
      titre: "Interior steel partitions",
      texte: "Measured at your home, welded in the workshop, then fitted.",
      lien: "Steel internal windows",
      chemin: "/artisanat/verrieres",
    },
    {
      titre: "Steel and solid wood tables",
      texte: "Solid wood top on a welded steel base, to the centimetre.",
      lien: "Bespoke wood and steel tables",
      chemin: "/artisanat/tables",
    },
    {
      titre: "Light ceilings",
      texte: "Backlit stretched fabric on an aluminium frame, rectangle or disc.",
      lien: "Backlit stretch-fabric ceiling lights",
      chemin: "/toiles-tendues",
    },
    {
      titre: "Welding to order",
      texte: "A broken part, one to remake or one you cannot find, in steel or aluminium: send a photo and you receive a quote.",
      lien: "Welding and repairs in Saumur",
      chemin: "/soudure-reparations",
    },
  ],

  pourTitre: "Who the workshop works for",
  pour: [
    {
      titre: "Private customers",
      texte:
        "Houses, flats and workshops in Saumur, Anjou and the Loire Valley. You speak directly to the workshop that designs and welds your piece, with no middleman.",
    },
    {
      titre: "Older houses",
      texte:
        "Around Saumur, many houses are built of tuffeau, the local white tufa stone. For a window railing, the fixing is chosen to suit your wall: the workshop looks at it before making anything. In central Saumur and other protected areas, changing a façade may need a prior declaration at the town hall: check before you order.",
    },
    {
      titre: "A part to weld or remake",
      texte:
        "A torn-off hinge, a broken bar, a part you can no longer find: send a photo and the dimensions. The quote is free, with no obligation.",
    },
  ],

  deroulementTitre: "How a project runs",
  deroulement: [
    {
      titre: "You describe your project",
      texte: "Through the form or by email, with photos or drawings if you have them. We reply within 48 hours, with a written estimate.",
    },
    {
      titre: "The measuring visit",
      texte:
        "For made-to-measure work, the workshop comes to measure at your home: {prixVisite} within {rayonVisite} km of Saumur; further out, the price depends on the distance. Far away? We work from your drawings.",
    },
    {
      titre: "The price, before you order",
      texte:
        "For most pieces, the price shows online for your measurements, with a free PDF quote, no account and no obligation. For the rest, the quote is written and free.",
    },
    {
      titre: "Making it in the workshop",
      texte:
        "In Saumur, to order. The steel is cut, welded by hand and painted there; the solid wood is cut to your sizes, sanded and oiled. The lead time runs from 3 to 12 weeks depending on the piece, and is confirmed to you in writing when you order.",
    },
    {
      titre: "Fitting, delivery or collection",
      texte:
        "The workshop fits within {rayonMax} km of Saumur, and comes back to adjust if the piece needs it. Pieces from the collection can also be delivered by carrier anywhere in mainland France, or collected from the workshop in Saumur, by appointment.",
    },
  ],

  ouTitre: "Where the workshop works",
  ouTexte: [
    "The workshop is in Saumur, in Maine-et-Loire, between Anjou and Touraine. In Saumur and the nearby towns, it comes to measure at your home, then fits the piece.",
    "It travels up to {rayonMax} km from Saumur: Maine-et-Loire, Indre-et-Loire, Deux-Sèvres and Vienne. Travel is priced into the quote. Beyond that, the workshop does not travel, either to measure or to fit.",
  ],
  ouCommunes: "Towns near Saumur",
  ouLien: "Metalworker in Maine-et-Loire and Touraine: where we work",

  contactTitre: "Reach the Saumur metalworker",
  contactIntro: "A project, a question, a part to weld: write to us or call us.",
  contactLabels: { adresse: "Workshop", telephone: "Phone", email: "Email", horaires: "Opening hours" },
  contactAdresse: "Saumur (49400), Maine-et-Loire, France",

  faqTitre: "Your questions",
  faq: [
    {
      q: "Where is your workshop?",
      r: "In Saumur (49400), in Maine-et-Loire, between Anjou and Touraine. That is where the steel is cut, welded and painted, and where the solid wood is cut to your sizes.",
    },
    {
      q: "Are your quotes free?",
      r: "Yes, and with no obligation. Describe your project through the contact form: you get an answer within 48 hours and a written estimate. For a railing, a table, a light ceiling or a gate, the configurator gives the price at once, and you download a free PDF quote.",
    },
    {
      q: "What are your lead times?",
      r: "Everything is made to order. The lead time runs from 3 to 12 weeks depending on the piece, and is confirmed to you in writing when you order. Some steps cannot be rushed: drying the timber, welding, painting, finishing.",
    },
    {
      q: "How far does the workshop travel?",
      r: "Up to {rayonMax} km from Saumur, to measure and to fit. Further out, a railing is made to measurements you take yourself, then shipped.",
    },
    {
      q: "How much does a measuring visit at home cost?",
      r: "{prixVisite} within {rayonVisite} km of Saumur; further out, its price depends on the distance.",
    },
    {
      q: "Do you also do welding to order?",
      r: "Yes, on steel and aluminium, TIG, MIG/MAG and stick. Send a photo with the dimensions: the quote is free, with no obligation.",
    },
  ],

  finTitre: "Let's talk about your project",
  fin: "Describe it in a few lines: we reply within 48 hours with a first estimate.",
  anglais: "English spoken.",
  voirAussi: "See also",
  liens: {
    zone: "Where we work around Saumur",
    apropos: "About the workshop",
    faq: "Frequently asked questions",
    bois: "Solid wood in our workshop",
  },
  service: { nom: "Metalworker in Saumur: bespoke making and fitting", type: "Bespoke metalwork" },
};

const TEXTES: Record<Locale, TextesMetallierSaumur> = { fr: FR, en: EN };

/** Les textes bruts, avec leurs {marqueurs} : pour les tests. */
export function textesBrutsMetallierSaumur(locale: Locale): TextesMetallierSaumur {
  return TEXTES[locale];
}

/** Remplace les {marqueurs} propres à la page (le rayon de pose), à toute profondeur. */
function remplirTout<T>(valeur: T, valeurs: Record<string, string>): T {
  const suivre = (v: unknown): unknown => {
    if (typeof v === "string") return v.replace(/\{(\w+)\}/g, (marqueur, nom: string) => valeurs[nom] ?? marqueur);
    if (Array.isArray(v)) return v.map(suivre);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([cle, sous]) => [cle, suivre(sous)]));
    return v;
  };
  return suivre(valeur) as T;
}

/**
 * Les textes de la page, prêts à afficher : {rayonMax} (RAYON_MAX_KM), puis les marqueurs du code ({prixVisite},
 * {rayonVisite}). Un marqueur resté sans valeur fait échouer la construction (verifierMarqueurs).
 */
export function textesMetallierSaumur(locale: Locale): TextesMetallierSaumur {
  const textes = remplacerMarqueurs(remplirTout(TEXTES[locale], { rayonMax: String(RAYON_MAX_KM) }), locale);
  verifierMarqueurs(textes, `metallier-saumur (${locale})`);
  return textes;
}
