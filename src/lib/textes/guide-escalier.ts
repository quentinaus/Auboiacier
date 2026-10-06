// Extensions écrites en toutes lettres : les tests (node --test, sans outil
// de construction) importent ce fichier tel quel.
import { RAYON_MAX_KM } from "../deplacement.ts";
import { calculerEscalier } from "../escalier.ts";
import type { Locale } from "../i18n.ts";
import { remplacerMarqueurs, verifierMarqueurs } from "../marqueurs.ts";
import {
  BLONDEL_MAISON,
  ECHAPPEE_MIN,
  GIRON_MIN,
  HAUTEUR_EXEMPLE_MM,
  HAUTEUR_MARCHE_MAX,
  LARGEUR_MIN,
  LIGNE_FOULEE_LARGEUR_MAX,
  NORME_GARDE_CORPS,
  SOURCES_NORMES_ESCALIER,
  TOLERANCE_HAUTEUR_MARCHE,
  VISEE_ATELIER,
  type SourceNorme,
} from "../normes-escalier.ts";
import { computeUnitPrice, getProduct, productLocalise, type Product } from "../products.ts";
import { prixAffiche } from "../ui.ts";
import { remplir } from "../vitrine.ts";

/**
 * Le guide « Escalier à limon central : prix, formes et normes », en français
 * et en anglais (plan de référencement, page n° 1, lot L4).
 *
 * AUCUN PRIX NI AUCUN CHIFFRE DE NORME N'EST TAPÉ ICI.
 * - Les prix : le tableau vient du moteur du catalogue (computeUnitPrice,
 *   src/lib/products.ts), forme par forme et essence par essence ; dans les
 *   phrases, les marqueurs du code ({prix:<slug>}, {delai:<slug>},
 *   {prixVisite}, {rayonVisite} — src/lib/marqueurs.ts).
 * - Les normes : src/lib/normes-escalier.ts, chaque chiffre avec sa source.
 * - La pose : la ligne « Pose » de la fiche escalier, lue telle quelle. Le
 *   guide ne promet rien de plus que la fiche (assurance décennale pas encore
 *   signée) ; le jour où la fiche change, le guide suit.
 *
 * Vérité de fabrication (audit du 07/10/2026) : le limon est un tube d'acier
 * DROIT, coupé et soudé, des supports et des platines soudés portent les
 * marches ; le garde-corps n'est pas « à câbles » : son remplissage se
 * choisit au devis, selon la NF P01-012. tests/guide-escalier.test.ts
 * refuse les anciennes formules.
 *
 * Signature : l'atelier, tant que Quentin n'a pas relu le guide (jsonLdArticle,
 * auteur « atelier »).
 */

/** L'adresse du guide, sans la langue. */
export const CHEMIN_GUIDE_ESCALIER = "/escalier-limon-central-prix-normes";

/** La fiche dont le guide lit les prix, les essences, les couleurs et la pose. */
export const SLUG_ESCALIER = "escalier-limon-central";

/** Les deux dates du guide : celles que la page affiche et que Google lit (Article). AAAA-MM-JJ. */
export const DATE_PUBLICATION_GUIDE_ESCALIER = "2026-10-07";
export const DATE_MODIFICATION_GUIDE_ESCALIER = "2026-10-07";

/** Les trois formes du catalogue, telles que la fiche les nomme (sizes[].id). */
type FormeId = "droit" | "quart" | "demi";

type QuestionReponse = { q: string; a: string };

/** Les textes, avec leurs marqueurs : ceux du code entre accolades avec deux-points, ceux de la page sans. */
type TextesGuide = {
  seo: { titre: string; description: string };
  filAriane: string;
  surtitre: string;
  h1: string;
  intro: string;
  ctaRdv: string;
  voirFiche: string;
  legendeHero: string;
  prix: {
    titre: string;
    corps: string;
    colForme: string;
    legende: string;
    des: string;
    fabrication: string;
    couleurMemePrix: string;
    suite: string;
  };
  contenu: {
    titre: string;
    priseDeCotes: string;
    limon: string;
    marches: string;
    finition: string;
    gardeCorps: string;
    pose: string;
  };
  formes: {
    titre: string;
    intro: string;
    textes: Record<FormeId, string>;
    conclusion: string;
  };
  normes: {
    titre: string;
    intro: string;
    colRegle: string;
    colChiffre: string;
    colAtelier: string;
    colSource: string;
    lignes: { regle: string; chiffre: string; atelier: string; source: SourceNorme["id"] }[];
    nomsSources: Record<SourceNorme["id"], string>;
    mesures: string;
    blondelTitre: string;
    blondel: string;
    quiTitre: string;
    qui: string;
    gardeCorpsTitre: string;
    gardeCorps: string;
  };
  mesurer: {
    titre: string;
    intro: string;
    items: { titre: string; texte: string }[];
    visite: string;
  };
  faq: {
    titre: string;
    bois: QuestionReponse;
    lienBois: string;
    autres: QuestionReponse[];
  };
  fin: { titre: string; corps: string; lienFiche: string };
  signature: string;
  sourcesTitre: string;
};

export const TEXTES_GUIDE_ESCALIER: Record<Locale, TextesGuide> = {
  fr: {
    seo: {
      titre: "Escalier limon central : prix et normes",
      description:
        "Escalier à limon central sur mesure : droit dès {prix:escalier-limon-central}, quart tournant, demi-tournant. Ce que comprend le prix, les normes, les cotes à prendre.",
    },
    filAriane: "Prix, formes et normes",
    surtitre: "Guide de l'atelier",
    h1: "Escalier à limon central : prix, formes et normes",
    intro:
      "Un escalier à limon central, c'est une poutre d'acier placée sous le milieu des marches, qui porte des marches en bois massif : il libère la pièce et laisse passer la lumière. Voici ce qu'il coûte chez nous, forme par forme, ce que le prix comprend, et les règles qu'il doit respecter.",
    ctaRdv: "Réserver la prise de cotes",
    voirFiche: "Voir l'escalier",
    legendeHero: "Le garde-corps de l'image est un exemple : le vôtre est dessiné au devis, aux normes.",
    prix: {
      titre: "Combien coûte un escalier à limon central ?",
      corps:
        "Les prix de départ de l'atelier, pour chaque forme et chaque essence de marches. Le prix exact de votre escalier est celui du devis, établi à vos mesures après la prise de cotes chez vous.",
      colForme: "Forme",
      legende: "Prix de départ par forme et par essence de marches",
      des: "dès {prix}",
      fabrication: "Fabrication sur commande : comptez {delai:escalier-limon-central}.",
      couleurMemePrix: "La couleur du limon ne change pas le prix.",
      suite: "Ce que ce prix comprend est détaillé juste en dessous.",
    },
    contenu: {
      titre: "Ce que comprend le prix",
      priseDeCotes: "La prise de cotes chez vous, puis le plan de votre escalier, dessiné à vos mesures.",
      limon:
        "Le limon central : un tube d'acier de forte section, coupé et soudé à l'atelier. Sous chaque marche, un support coupé dans le même tube et sa platine sont soudés au limon, au TIG.",
      marches:
        "Les marches en bois massif de 50 mm d'épaisseur ({essences}), poncées puis finies à l'huile-cire. Fixées sur leurs platines, cachées dessous, elles débordent de chaque côté du limon.",
      finition: "La finition du limon, au choix : {couleurs}.",
      gardeCorps:
        "Le garde-corps du côté du vide, avec sa main courante en bois massif. Son remplissage se choisit au devis, et il est dessiné selon la norme {norme} ({anneeNorme}).",
      pose: "La pose : {pose}",
    },
    formes: {
      titre: "Droit, quart tournant ou demi-tournant : quelle forme pour votre trémie ?",
      intro:
        "La forme dépend de la place : la longueur de la trémie, l'ouverture dans le plancher de l'étage, et le recul disponible au sol.",
      textes: {
        droit:
          "Il monte d'une seule volée. C'est la forme la plus simple et la moins chère, mais elle demande le plus de longueur au sol.",
        quart:
          "Il tourne d'un quart de tour, en bas ou en haut. Il se loge dans un angle de la pièce et demande moins de longueur qu'un escalier droit.",
        demi: "Il revient sur lui-même, comme un U. C'est la forme des trémies courtes, quand la place au sol manque.",
      },
      conclusion:
        "À la prise de cotes, l'atelier mesure la trémie, le recul et la hauteur à monter, et vous dit quelles formes passent chez vous.",
    },
    normes: {
      titre: "Les normes : hauteur de marche, giron, loi de Blondel, échappée",
      intro:
        "Les chiffres de la réglementation des logements neufs et des règles de l'art des escaliers. L'atelier les applique à chaque escalier, neuf ou en rénovation, et vise plus confortable que le minimum.",
      colRegle: "Règle",
      colChiffre: "Ce que dit la règle",
      colAtelier: "Ce que vise l'atelier",
      colSource: "Source",
      lignes: [
        { regle: "Hauteur de marche", chiffre: "{hauteurMax} au plus", atelier: "{hVisee} environ", source: "arrete-2015" },
        { regle: "Giron, la profondeur où se pose le pied", chiffre: "{gironMin} au moins", atelier: "{gVise}", source: "arrete-2015" },
        {
          regle: "Loi de Blondel : deux hauteurs de marche plus un giron",
          chiffre: "entre {blondelMin} et {blondelMax}",
          atelier: "de {blondelViseMin} à {blondelViseMax}",
          source: "uicb-2020",
        },
        { regle: "Largeur de l'escalier", chiffre: "{largeurMin} au moins", atelier: "{largeurConseil} conseillés", source: "arrete-2015" },
        {
          regle: "Échappée, la hauteur libre au-dessus des marches",
          chiffre: "{echappee} au moins",
          atelier: "vérifiée sur votre trémie",
          source: "afeb-dtu-36-3",
        },
        { regle: "Garde-corps", chiffre: "selon la norme {norme}", atelier: "dessiné au devis", source: "afnor-p01-012" },
      ],
      nomsSources: {
        "arrete-2015": "Arrêté du 24 décembre 2015, art.\u00a012",
        "uicb-2020": "NF DTU 36.3",
        "afeb-dtu-36-3": "NF DTU 36.3",
        "afnor-p01-012": "{norme} ({anneeNorme})",
      },
      mesures:
        "Toutes les marches d'un même escalier ont la même hauteur, à {tolerance} près. Le giron se mesure sur la ligne de foulée, là où l'on pose le pied : au milieu de la marche, pour un escalier de {ligneFoulee} de large au plus. L'échappée évite de se cogner la tête en montant : elle se compte jusqu'au plafond ou au bord de la trémie, et dépend donc de la longueur de la trémie.",
      blondelTitre: "La loi de Blondel, en pratique",
      blondel:
        "Deux hauteurs de marche plus un giron font la longueur d'un pas : c'est la formule de Blondel, 2\u00a0H\u00a0+\u00a0G. Avec des marches de {hEx} et un giron de {gEx}, on obtient 2\u00a0×\u00a0{hEx}\u00a0+\u00a0{gEx}\u00a0=\u00a0{blondelEx}, au cœur de la zone de confort. Pour monter {hauteurEx} de sol fini à sol fini, cela fait {nHauteurs} hauteurs de marche : {nMarches} marches en bois, le sol de l'étage faisant la dernière, et environ {reculEx} de recul au sol pour un escalier droit.",
      quiTitre: "Qui doit respecter ces chiffres ?",
      qui:
        "L'arrêté du 24 décembre 2015 s'impose aux logements neufs : en immeuble, et dans les maisons construites pour être vendues, louées ou mises à disposition. Une maison que l'on fait construire pour soi, ou une maison existante, n'y est pas soumise. Le NF DTU 36.3 fixe les règles de l'art des escaliers en bois : il est d'application volontaire, mais le code des assurances se réfère aux DTU en vigueur. Pour un escalier en acier et bois, neuf ou en rénovation, l'atelier applique partout les mêmes chiffres.",
      gardeCorpsTitre: "Le garde-corps de l'escalier",
      gardeCorps:
        "Dès qu'un côté de l'escalier donne sur le vide, ce côté se protège d'un garde-corps. Sa hauteur au-dessus des marches et les vides qu'il peut laisser relèvent de la norme {norme}, révisée en {moisNorme} : l'atelier dessine le vôtre sur le plan du devis, avec son remplissage et son écartement.",
    },
    mesurer: {
      titre: "Ce qu'il faut mesurer avant la prise de cotes",
      intro:
        "L'atelier vient tout mesurer chez vous. Pour un premier prix, ou pour savoir quelle forme regarder, trois mesures suffisent.",
      items: [
        {
          titre: "La hauteur à monter",
          texte: "Du sol fini du bas, parquet ou carrelage compris, au sol fini de l'étage. C'est elle qui fixe le nombre de marches.",
        },
        {
          titre: "La trémie",
          texte: "La longueur et la largeur de l'ouverture dans le plancher de l'étage. Sa longueur décide de l'échappée.",
        },
        {
          titre: "Le recul",
          texte: "La place au sol, du départ de la première marche jusqu'à l'aplomb de l'arrivée, à l'étage.",
        },
      ],
      visite:
        "La prise de cotes à domicile coûte {prixVisite} jusqu'à {rayonVisite} km de Saumur, puis les kilomètres et le temps de route, jusqu'à {rayonMax}. Ce montant est déduit de votre commande si vous commandez ensuite.",
    },
    faq: {
      titre: "Vos questions",
      bois: {
        q: "Quel bois choisir pour les marches ?",
        a: "Quatre essences massives, en 50 mm d'épaisseur : {essences}. {ecartsBois} Toutes sont finies à l'huile-cire.",
      },
      lienBois: "Le bois massif à l'atelier",
      autres: [
        {
          q: "Faut-il un garde-corps ?",
          a: "Dès qu'un côté de l'escalier donne sur le vide, oui : le prix comprend ce garde-corps, avec sa main courante en bois massif. Il est dessiné selon la norme {norme} ({anneeNorme}), et son remplissage se choisit au devis.",
        },
        {
          q: "Quel est le délai ?",
          a: "Comptez {delai:escalier-limon-central} de fabrication à l'atelier, à partir de la commande. Le délai exact vous est confirmé à la commande.",
        },
        {
          q: "Peut-on l'installer dans une maison ancienne ?",
          a: "Oui, si le plancher et la trémie le permettent : c'est ce que la prise de cotes vérifie. Dans une maison existante, aucune loi n'impose les chiffres des logements neufs, mais l'atelier les applique quand même. Un mur hors d'équerre, un sol pas tout à fait de niveau, une poutre au bord de la trémie : c'est sur place qu'on les découvre, et le plan en tient compte.",
        },
      ],
    },
    fin: {
      titre: "Votre escalier, à vos cotes",
      corps: "L'atelier vient mesurer chez vous, dessine votre escalier et vous envoie le devis.",
      lienFiche: "Voir l'escalier à limon central",
    },
    signature: "Guide écrit par l'atelier Auboiacier, à Saumur. Publié le {date}.",
    sourcesTitre: "Sources",
  },
  en: {
    seo: {
      titre: "Steel spine staircase: prices and rules",
      description:
        "Bespoke steel spine staircase made in Saumur, France: straight from {prix:escalier-limon-central}, quarter or half turn. What the price includes, the rules, what to measure.",
    },
    filAriane: "Prices, shapes and rules",
    surtitre: "Workshop guide",
    h1: "Steel spine staircases: prices, shapes and French rules",
    intro:
      "A spine staircase, also called a central stringer staircase, has a steel beam under the middle of the treads, carrying solid wood steps: it frees up the room and lets the light through. Here is what it costs with us, shape by shape, what the price includes, and the French rules it has to meet.",
    ctaRdv: "Book a measuring visit",
    voirFiche: "See the staircase",
    legendeHero: "The balustrade in the image is an example: yours is drawn with the quote, to French standards.",
    prix: {
      titre: "How much does a steel spine staircase cost?",
      corps:
        "The workshop's starting prices, for each shape and each tread timber. The exact price of your staircase is the one in the quote, worked out to your measurements after the measuring visit at your home.",
      colForme: "Shape",
      legende: "Starting price by shape and tread timber",
      des: "from {prix}",
      fabrication: "Made to order: allow {delai:escalier-limon-central}.",
      couleurMemePrix: "The stringer colour does not change the price.",
      suite: "What this price includes is set out just below.",
    },
    contenu: {
      titre: "What the price includes",
      priseDeCotes: "The measuring visit at your home, then the plan of your staircase, drawn to your measurements.",
      limon:
        "The central stringer: a heavy-section steel tube, cut and welded in the workshop. Under each tread, a support cut from the same tube and its plate are TIG welded to the stringer.",
      marches:
        "Solid wood treads, 50 mm thick ({essences}), sanded then finished with hard wax oil. Fixed on their plates, hidden underneath, they reach out on each side of the stringer.",
      finition: "The stringer finish, your choice: {couleurs}.",
      gardeCorps:
        "The balustrade on the open side, with its solid wood handrail. Its infill is chosen with the quote, and it is drawn to the French standard {norme} ({anneeNorme}).",
      pose: "Fitting: {pose}",
    },
    formes: {
      titre: "Straight, quarter turn or half turn: which shape for your stairwell?",
      intro:
        "The shape depends on the space: the length of the stairwell opening in the upper floor, and the run available on the ground.",
      textes: {
        droit:
          "It climbs in a single flight. It is the simplest shape and the least expensive, but it needs the most length on the ground.",
        quart:
          "It turns a quarter, at the bottom or at the top. It fits into a corner of the room and needs less length than a straight staircase.",
        demi: "It turns back on itself, like a U. It is the shape for short stairwell openings, when floor space is tight.",
      },
      conclusion:
        "At the measuring visit, the workshop measures the opening, the run and the height to climb, and tells you which shapes fit your home.",
    },
    normes: {
      titre: "French rules: rise, going, Blondel's formula, headroom",
      intro:
        "The figures from the French rules for new homes and from the code of practice for stairs. The workshop applies them to every staircase, new build or renovation, and aims for more comfort than the minimum.",
      colRegle: "Rule",
      colChiffre: "What the rule says",
      colAtelier: "What the workshop aims for",
      colSource: "Source",
      lignes: [
        { regle: "Rise, the height of a step", chiffre: "{hauteurMax} at most", atelier: "about {hVisee}", source: "arrete-2015" },
        { regle: "Going, the depth your foot lands on", chiffre: "{gironMin} at least", atelier: "{gVise}", source: "arrete-2015" },
        {
          regle: "Blondel's formula: two rises plus one going",
          chiffre: "between {blondelMin} and {blondelMax}",
          atelier: "{blondelViseMin} to {blondelViseMax}",
          source: "uicb-2020",
        },
        { regle: "Staircase width", chiffre: "{largeurMin} at least", atelier: "{largeurConseil} advised", source: "arrete-2015" },
        {
          regle: "Headroom, the clear height above the treads",
          chiffre: "{echappee} at least",
          atelier: "checked on your stairwell",
          source: "afeb-dtu-36-3",
        },
        { regle: "Balustrade", chiffre: "to the standard {norme}", atelier: "drawn with the quote", source: "afnor-p01-012" },
      ],
      nomsSources: {
        "arrete-2015": "Order of 24 December 2015, art.\u00a012",
        "uicb-2020": "NF DTU 36.3",
        "afeb-dtu-36-3": "NF DTU 36.3",
        "afnor-p01-012": "{norme} ({anneeNorme})",
      },
      mesures:
        "All the steps of one staircase have the same rise, to within {tolerance}. The going is measured on the walking line, where you put your foot: in the middle of the tread, for a staircase up to {ligneFoulee} wide. Headroom keeps you from hitting your head on the way up: it is counted up to the ceiling or the edge of the opening, so it depends on the length of the opening.",
      blondelTitre: "Blondel's formula, in practice",
      blondel:
        "Two rises plus one going make the length of a stride: that is Blondel's formula, 2\u00a0R\u00a0+\u00a0G. With a rise of {hEx} and a going of {gEx}, you get 2\u00a0×\u00a0{hEx}\u00a0+\u00a0{gEx}\u00a0=\u00a0{blondelEx}, right in the comfort zone. To climb {hauteurEx} from finished floor to finished floor, that makes {nHauteurs} rises: {nMarches} wooden treads, with the upper floor as the last step, and about {reculEx} of run on the ground for a straight staircase.",
      quiTitre: "Who has to follow these figures?",
      qui:
        "The order of 24 December 2015 applies to new homes in France: flats, and houses built to be sold, let or made available. A house you have built for yourself, or an existing house, is not bound by it. The French code NF DTU 36.3 sets the code of practice for timber stairs: it is voluntary, but French insurance law refers to the DTU codes in force. For a steel and wood staircase, new build or renovation, the workshop applies the same figures everywhere.",
      gardeCorpsTitre: "The staircase balustrade",
      gardeCorps:
        "As soon as one side of the staircase is open to a drop, that side is protected by a balustrade. Its height above the treads and the gaps it may leave come under the French standard {norme}, revised in {moisNorme}: the workshop draws yours on the plan that comes with the quote, with its infill and spacing.",
    },
    mesurer: {
      titre: "What to measure before the measuring visit",
      intro:
        "The workshop comes to measure everything at your home. For a first price, or to know which shape to look at, three measurements are enough.",
      items: [
        {
          titre: "The height to climb",
          texte: "From the finished floor downstairs, floorboards or tiles included, to the finished floor upstairs. It sets the number of steps.",
        },
        {
          titre: "The stairwell opening",
          texte: "The length and width of the opening in the upper floor. Its length decides the headroom.",
        },
        {
          titre: "The run",
          texte: "The space on the ground, from the bottom step to the point directly below the arrival upstairs.",
        },
      ],
      visite:
        "The measuring visit costs {prixVisite} within {rayonVisite} km of Saumur, then mileage and travel time, up to {rayonMax}. This amount comes off your order if you go ahead.",
    },
    faq: {
      titre: "Your questions",
      bois: {
        q: "Which timber for the treads?",
        a: "Four solid timbers, 50 mm thick: {essences}. {ecartsBois} All are finished with hard wax oil.",
      },
      lienBois: "Solid wood in our workshop",
      autres: [
        {
          q: "Do I need a balustrade?",
          a: "As soon as one side of the staircase is open to a drop, yes: the price includes that balustrade, with its solid wood handrail. It is drawn to the French standard {norme} ({anneeNorme}), and its infill is chosen with the quote.",
        },
        {
          q: "What is the lead time?",
          a: "Allow {delai:escalier-limon-central} of making in the workshop, from the order. The exact lead time is confirmed when you order.",
        },
        {
          q: "Can it go into an old house?",
          a: "Yes, if the floor and the opening allow it: that is what the measuring visit checks. In an existing house, no law imposes the figures for new homes, but the workshop applies them anyway. A wall out of square, a floor not quite level, a beam at the edge of the opening: you find them on site, and the plan takes them into account.",
        },
      ],
    },
    fin: {
      titre: "Your staircase, to your measurements",
      corps: "The workshop comes to measure at your home, draws your staircase and sends you the quote.",
      lienFiche: "See the steel spine staircase",
    },
    signature: "Guide written by the Auboiacier workshop in Saumur. Published {date}.",
    sourcesTitre: "Sources",
  },
};

/* ------------------------------------------------------------------ *
 *  Le guide, tous marqueurs remplacés
 * ------------------------------------------------------------------ */

/** Un nombre à la mode de la langue (virgule décimale en français). */
function nombre(n: number, locale: Locale, decimales: number): string {
  return n.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Des millimètres en centimètres : « 17,5 cm », « 24 cm ». */
function cm(mm: number, locale: Locale): string {
  return `${nombre(mm / 10, locale, Number.isInteger(mm / 10) ? 0 : 1)} cm`;
}

/** Des millimètres en mètres, au centimètre : « 1,90 m ». */
function metres(mm: number, locale: Locale): string {
  return `${nombre(mm / 1000, locale, 2)} m`;
}

/** « a, b, c ou d » / « a, b, c or d ». */
function liste(elements: string[], locale: Locale, ou = true): string {
  const mot = ou ? (locale === "fr" ? "ou" : "or") : locale === "fr" ? "et" : "and";
  if (elements.length <= 1) return elements.join("");
  return `${elements.slice(0, -1).join(", ")} ${mot} ${elements[elements.length - 1]}`;
}

/** La première lettre en minuscule (« Comprise jusqu'à… » devient « comprise jusqu'à… »). */
function minusculeInitiale(texte: string): string {
  return texte.charAt(0).toLocaleLowerCase("fr-FR") + texte.slice(1);
}

/** La ligne d'une fiche, par son libellé français ou anglais. */
function ligneFiche(fiche: Product, libelles: string[]): string | null {
  return fiche.specs.find((spec) => libelles.includes(spec.label))?.value ?? null;
}

/** Une forme du catalogue, ses prix par essence (dans l'ordre de la fiche) et son « dès ». */
export type LignePrix = { id: string; label: string; prix: number[]; des: number; texte: string };

/** La fiche de l'escalier ; sans elle, le guide n'a pas de sens (le build échoue). */
function ficheEscalier(): Product {
  const modele = getProduct(SLUG_ESCALIER);
  if (!modele) throw new Error(`Guide escalier : la fiche « ${SLUG_ESCALIER} » n'existe plus`);
  return modele;
}

/**
 * Les prix du tableau, par le moteur du catalogue : chaque forme × chaque
 * essence, la couleur la moins chère. Un prix que le moteur refuse fait
 * échouer le build : jamais un chiffre recopié à la main.
 */
export function prixParForme(locale: Locale): { essences: { id: string; label: string }[]; lignes: Omit<LignePrix, "texte">[] } {
  const fiche = productLocalise(ficheEscalier(), locale);
  const couleur = [...fiche.metals].sort((a, b) => (a.priceDelta ?? 0) - (b.priceDelta ?? 0))[0];
  const lignes = fiche.sizes.map((taille) => {
    const prix = fiche.woods.map((bois) => {
      const p = computeUnitPrice(fiche, { sizeId: taille.id, woodId: bois.id, metalId: couleur?.id });
      if (p === null) throw new Error(`Guide escalier : pas de prix pour ${taille.id} en ${bois.id}`);
      return p;
    });
    return { id: taille.id, label: taille.label, prix, des: Math.min(...prix) };
  });
  return { essences: fiche.woods.map((bois) => ({ id: bois.id, label: bois.label })), lignes };
}

/**
 * La typographie française : une espace insécable avant « : ; ? ! » et à
 * l'intérieur des guillemets, pour qu'un titre ne commence jamais une ligne
 * par « : prix, formes et normes ». Rien en anglais.
 */
function typographie<T>(valeur: T, locale: Locale): T {
  if (locale !== "fr") return valeur;
  const suivre = (v: unknown): unknown => {
    if (typeof v === "string") return v.replace(/ ([:;?!»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
    if (Array.isArray(v)) return v.map(suivre);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([cle, sous]) => [cle, suivre(sous)]));
    return v;
  };
  return suivre(valeur) as T;
}

/**
 * Ce que la page affiche : chaque texte prêt, chaque prix et chaque chiffre
 * lus dans le code. Le titre et la description de Google gardent leurs
 * espaces simples (titreSeo et descriptionSeo les normalisent).
 */
export function guideEscalier(locale: Locale) {
  const { seo, ...page } = guideBrut(locale);
  return { seo, ...typographie(page, locale) };
}

/** Le guide, marqueurs remplacés, avant la typographie. */
function guideBrut(locale: Locale) {
  const t = TEXTES_GUIDE_ESCALIER[locale];
  const modele = ficheEscalier();
  const fiche = productLocalise(modele, locale);
  const { essences, lignes } = prixParForme(locale);

  // L'exemple de Blondel : l'escalier droit du catalogue, calculé par src/lib/escalier.ts.
  const exemple = calculerEscalier({ hauteurMm: HAUTEUR_EXEMPLE_MM });
  if (!exemple) throw new Error("Guide escalier : l'exemple de Blondel ne se calcule pas");
  const blondelExemple = 2 * exemple.hauteurDeMarcheMm + VISEE_ATELIER.gironMm;

  // Les écarts de prix des essences, lus sur l'escalier droit (le moins cher).
  const droit = lignes.find((l) => l.id === "droit") ?? lignes[0];
  const base = Math.min(...droit.prix);
  const nomBois = (label: string) => (locale === "fr" ? `le ${label.toLocaleLowerCase("fr-FR")}` : label.toLocaleLowerCase("en-GB"));
  const debut = essences.filter((_, i) => droit.prix[i] === base).map((e) => nomBois(e.label));
  const plus = essences
    .map((e, i) => ({ nom: nomBois(e.label), ecart: droit.prix[i] - base }))
    .filter((e) => e.ecart > 0)
    .map((e, i) => (i === 0 ? `${e.nom} ${locale === "fr" ? "ajoute" : "adds"} ${prixAffiche(e.ecart, locale)}` : `${e.nom} ${prixAffiche(e.ecart, locale)}`));
  const debutPhrase = liste(debut, locale, false);
  const majuscule = debutPhrase.charAt(0).toLocaleUpperCase(locale === "fr" ? "fr-FR" : "en-GB") + debutPhrase.slice(1);
  const ecartsBois =
    locale === "fr"
      ? `${majuscule} ${debut.length > 1 ? "font" : "fait"} le prix de départ${plus.length ? ` ; ${plus.join(", ")}` : ""}.`
      : `${majuscule} ${debut.length > 1 ? "set" : "sets"} the starting price${plus.length ? `; ${plus.join(", ")}` : ""}.`;

  const pose = ligneFiche(fiche, ["Pose", "Fitting"]);
  const moisNorme = new Date(Date.UTC(NORME_GARDE_CORPS.annee, 10, 1)).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Les chiffres que les textes citent : tous viennent du code.
  const valeurs: Record<string, string> = {
    hauteurMax: cm(HAUTEUR_MARCHE_MAX.mm, locale),
    tolerance: `${TOLERANCE_HAUTEUR_MARCHE.mm} mm`,
    gironMin: cm(GIRON_MIN.mm, locale),
    ligneFoulee: metres(LIGNE_FOULEE_LARGEUR_MAX.mm, locale),
    blondelMin: nombre(BLONDEL_MAISON.minMm / 10, locale, 0),
    blondelMax: cm(BLONDEL_MAISON.maxMm, locale),
    largeurMin: cm(LARGEUR_MIN.mm, locale),
    echappee: metres(ECHAPPEE_MIN.mm, locale),
    norme: NORME_GARDE_CORPS.reference,
    anneeNorme: String(NORME_GARDE_CORPS.annee),
    moisNorme,
    hVisee: cm(VISEE_ATELIER.hauteurMarcheMm, locale),
    gVise: cm(VISEE_ATELIER.gironMm, locale),
    blondelViseMin: nombre(VISEE_ATELIER.blondelMinMm / 10, locale, 0),
    blondelViseMax: cm(VISEE_ATELIER.blondelMaxMm, locale),
    largeurConseil: `${nombre(VISEE_ATELIER.largeurConseilleeMm[0] / 10, locale, 0)} ${locale === "fr" ? "à" : "to"} ${cm(VISEE_ATELIER.largeurConseilleeMm[1], locale)}`,
    hEx: cm(exemple.hauteurDeMarcheMm, locale),
    gEx: cm(VISEE_ATELIER.gironMm, locale),
    blondelEx: cm(blondelExemple, locale),
    hauteurEx: metres(HAUTEUR_EXEMPLE_MM, locale),
    nHauteurs: String(exemple.nombreDeMarches),
    nMarches: String(exemple.nombreDeMarches - 1),
    reculEx: metres(exemple.reculConfortMm, locale),
    essences: liste(essences.map((e) => e.label.toLocaleLowerCase(locale === "fr" ? "fr-FR" : "en-GB")), locale),
    couleurs: liste(fiche.metals.map((m) => m.label.toLocaleLowerCase(locale === "fr" ? "fr-FR" : "en-GB")), locale),
    ecartsBois,
    pose: pose ? minusculeInitiale(pose).replace(/\.?$/, ".") : "",
    rayonMax: `${RAYON_MAX_KM} km`,
    date: new Date(`${DATE_MODIFICATION_GUIDE_ESCALIER}T12:00:00Z`).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };

  // D'abord les marqueurs du code (prix, délai, prise de cotes), puis ceux de la page.
  const brut = remplacerMarqueurs(t, locale);
  verifierMarqueurs(brut, `guide escalier (${locale})`);
  const r = (texte: string, autres: Record<string, string> = {}) => remplir(texte, { ...valeurs, ...autres });

  const couleurMemePrix = fiche.metals.every((m) => !m.priceDelta);

  return {
    seo: { titre: brut.seo.titre, description: r(brut.seo.description) },
    filAriane: brut.filAriane,
    nomFiche: fiche.name,
    cheminFiche: `/artisanat/${SLUG_ESCALIER}`,
    surtitre: brut.surtitre,
    h1: brut.h1,
    intro: r(brut.intro),
    ctaRdv: brut.ctaRdv,
    voirFiche: brut.voirFiche,
    legendeHero: brut.legendeHero,
    /** L'image de l'escalier entier, et celle du limon sous les marches, avec le texte de la fiche. */
    imageHero: { src: fiche.images[0].src, alt: fiche.images[0].alt, position: fiche.images[0].position },
    imageDetail: fiche.images[1] ? { src: fiche.images[1].src, alt: fiche.images[1].alt, position: fiche.images[1].position } : null,
    prix: {
      titre: brut.prix.titre,
      corps: r(brut.prix.corps),
      colForme: brut.prix.colForme,
      legende: brut.prix.legende,
      essences: essences.map((e) => e.label),
      lignes: lignes.map((l) => ({
        ...l,
        prixAffiches: l.prix.map((p) => prixAffiche(p, locale)),
        desAffiche: r(brut.prix.des, { prix: prixAffiche(l.des, locale) }),
      })),
      fabrication: r(brut.prix.fabrication),
      couleurMemePrix: couleurMemePrix ? brut.prix.couleurMemePrix : null,
      suite: brut.prix.suite,
    },
    contenu: {
      titre: brut.contenu.titre,
      items: [
        brut.contenu.priseDeCotes,
        brut.contenu.limon,
        brut.contenu.marches,
        brut.contenu.finition,
        brut.contenu.gardeCorps,
        // La pose, telle que la fiche la dit ; sans ligne « Pose » sur la fiche, rien.
        ...(pose ? [brut.contenu.pose] : []),
      ].map((texte) => r(texte)),
    },
    formes: {
      titre: brut.formes.titre,
      intro: brut.formes.intro,
      cartes: lignes.map((l) => {
        const texte = brut.formes.textes[l.id as FormeId];
        if (!texte) throw new Error(`Guide escalier : la forme « ${l.id} » n'a pas de texte`);
        return { id: l.id, label: l.label, texte, des: r(brut.prix.des, { prix: prixAffiche(l.des, locale) }) };
      }),
      conclusion: brut.formes.conclusion,
    },
    normes: {
      titre: brut.normes.titre,
      intro: brut.normes.intro,
      colonnes: [brut.normes.colRegle, brut.normes.colChiffre, brut.normes.colAtelier, brut.normes.colSource] as const,
      lignes: brut.normes.lignes.map((l) => ({
        regle: r(l.regle),
        chiffre: r(l.chiffre),
        atelier: r(l.atelier),
        source: r(brut.normes.nomsSources[l.source]),
      })),
      mesures: r(brut.normes.mesures),
      blondelTitre: brut.normes.blondelTitre,
      blondel: r(brut.normes.blondel),
      quiTitre: brut.normes.quiTitre,
      qui: r(brut.normes.qui),
      gardeCorpsTitre: brut.normes.gardeCorpsTitre,
      gardeCorps: r(brut.normes.gardeCorps),
    },
    mesurer: {
      titre: brut.mesurer.titre,
      intro: brut.mesurer.intro,
      items: brut.mesurer.items,
      visite: r(brut.mesurer.visite),
    },
    faq: {
      titre: brut.faq.titre,
      questions: [brut.faq.bois, ...brut.faq.autres].map((qr) => ({ q: qr.q, a: r(qr.a) })),
      lienBois: brut.faq.lienBois,
    },
    fin: brut.fin,
    signature: r(brut.signature),
    sourcesTitre: brut.sourcesTitre,
    sources: SOURCES_NORMES_ESCALIER.map((s) => ({ id: s.id, titre: s.titre[locale], url: s.url })),
  };
}

export type GuideEscalier = ReturnType<typeof guideEscalier>;
