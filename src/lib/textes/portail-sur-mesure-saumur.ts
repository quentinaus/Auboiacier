// Extensions écrites en toutes lettres : le test (node --test, sans outil de
// construction) importe ce fichier tel quel.
import { RAYON_MAX_KM } from "../deplacement.ts";
import type { Locale } from "../i18n.ts";
import { remplacerMarqueurs, verifierMarqueurs } from "../marqueurs.ts";
import { ACOMPTE_PORTAIL_PCT } from "../portails.ts";

/**
 * LA PAGE « PORTAIL SUR MESURE À SAUMUR » (/fr et /en /portail-sur-mesure-saumur), 10/10/2026 :
 * la page d'atterrissage de qui cherche un portail sur mesure autour de Saumur. Elle répond avant la fiche : quel type
 * (battant, coulissant, pliant, portillon), alu ou acier, motorisation, ce que le client choisit en ligne, posé par
 * l'atelier / livré / retiré, délai, questions. Elle ne remplace pas les fiches : elle y mène.
 *
 * Recherches visées : « portail sur mesure Saumur », « portail alu sur mesure », « portail acier sur mesure Maine-et-Loire »,
 * « portail battant / coulissant / pliant », « portillon sur mesure » ; EN « bespoke gates », « made to measure gates »,
 * « aluminium sliding gate », « steel driveway gates ».
 *
 * CE QUE LA PAGE NE FAIT PAS :
 * - aucun prix tapé : les « dès » des modèles viennent du serveur (prixDepartPortail, page.tsx), la prise de cotes de
 *   {prixVisite} (src/lib/marqueurs.ts), l'acompte de ACOMPTE_PORTAIL_PCT (src/lib/portails.ts), le rayon de RAYON_MAX_KM ;
 * - aucune promesse nouvelle : le délai est celui du configurateur (DELAI_PORTAIL, comparé à src/components/portail-configurateur.tsx
 *   par tests/portail-sur-mesure-saumur.test.ts) ; la pose, la livraison et le retrait sont ceux de RECEPTIONS_PORTAIL ;
 * - ni « artisan », ni « premium », ni « certifié », ni « pose comprise » (loi 96-603, art. 21, avant l'immatriculation).
 */

/** Le délai écrit dans le configurateur (dDelaiTxt) : « 6 à 8 semaines de fabrication, puis la pose ». */
export const DELAI_PORTAIL = {
  fr: "6 à 8 semaines de fabrication, puis la pose",
  en: "6 to 8 weeks of making, then fitting",
} as const;

/** Les quatre modèles, dans l'ordre de la page. */
export const MODELES_PAGE_PORTAIL = ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"] as const;
export type ModelePagePortail = (typeof MODELES_PAGE_PORTAIL)[number];

type Bloc = { titre: string; texte: string };

export type TextesPortailSurMesure = {
  seo: { title: string; description: string };
  fil: string;
  surtitre: string;
  h1: string;
  intro: string;
  ctaConfig: string;
  ctaContact: string;
  typesTitre: string;
  typesIntro: string;
  /** Quand choisir ce modèle (la place, les cotes et le « dès » viennent de la fiche). */
  types: Record<ModelePagePortail, { quand: string; lien: string }>;
  desLegende: string;
  triTexte: string;
  triLien: string;
  matiereTitre: string;
  matiere: Bloc[];
  motoTitre: string;
  moto: string[];
  enLigneTitre: string;
  enLigne: Bloc[];
  receptionTitre: string;
  reception: Bloc[];
  nonComprisTitre: string;
  nonCompris: string;
  prixTitre: string;
  prix: string[];
  faqTitre: string;
  faq: { q: string; r: string }[];
  finTitre: string;
  fin: string;
  /** Une ligne de plus sur la page anglaise (vide en français). */
  anglais: string;
  voirAussi: string;
  liens: { famille: string; zone: string; rdv: string; bois: string };
  service: { nom: string; type: string };
};

const FR: TextesPortailSurMesure = {
  seo: {
    title: "Portail sur mesure à Saumur, alu ou acier",
    description:
      "Portail battant, coulissant ou pliant sur mesure à Saumur, en alu ou en acier : fabriqué à l'atelier, posé par nous jusqu'à {rayonMax} km, ou livré.",
  },
  fil: "Portail sur mesure à Saumur",
  surtitre: "Battant, coulissant, pliant, portillon",
  h1: "Portail sur mesure à Saumur, en alu ou en acier",
  intro:
    "L'atelier de métallerie fabrique votre portail à Saumur, soudé et thermolaqué, aux cotes de votre entrée. Battant, coulissant, pliant ou portillon : vous le composez en ligne, avec son dessin à l'échelle et son prix.",
  ctaConfig: "Composer mon portail",
  ctaContact: "Poser une question",

  typesTitre: "Battant, coulissant ou pliant : quel portail pour votre entrée ?",
  typesIntro: "Le type de portail se choisit d'abord d'après la place autour de l'entrée, avant le style ou la matière.",
  types: {
    "portail-battant": {
      quand:
        "Le choix courant, quand il y a de la place derrière le portail. Deux vantaux s'ouvrent vers la propriété. Ils peuvent être inégaux : le petit sert alors de portillon.",
      lien: "Le portail battant sur mesure",
    },
    "portail-coulissant": {
      quand:
        "Quand il n'y a pas de place derrière. Il glisse le long de la clôture : rien ne s'ouvre vers la maison. Sur rail si le sol est dur et plat, sans rail (autoportant) sur du gravier, de la terre ou une pente.",
      lien: "Le portail coulissant sur mesure",
    },
    "portail-pliant": {
      quand:
        "Quand il n'y a de place ni derrière ni sur le côté : cour fermée, maison de ville, allée courte. Chaque vantail se plie en deux. Il a plus de pièces à fabriquer et à régler, d'où son prix.",
      lien: "Le portail pliant sur mesure",
    },
    portillon: {
      quand: "L'entrée des piétons, seul ou assorti à votre portail. Commandé avec lui, il partage la visite et le déplacement.",
      lien: "Le portillon sur mesure",
    },
  },
  desLegende:
    "« Dès » : le prix d'un portail posé par l'atelier, dans le style le moins cher, sans moteur, à la cote de départ de chaque fiche. Vos cotes changent le prix, et la fiche le calcule.",
  triTexte: "Pas sûr du type ? Quelques questions sur la place disponible vous indiquent le portail adapté.",
  triLien: "Quel portail pour mon entrée ?",

  matiereTitre: "Alu ou acier ?",
  matiere: [
    {
      titre: "Alu thermolaqué",
      texte:
        "Un cadre en alu soudé TIG à l'atelier, puis thermolaqué. L'alu est léger et ne rouille pas. C'est la matière des styles plein, lisse, barreaux et lames de chêne.",
    },
    {
      titre: "Acier galvanisé, thermolaqué",
      texte:
        "De l'acier galvanisé à chaud, puis thermolaqué. Il porte les styles à décor : la rosace, et les volutes en fer forgé soudées à l'atelier, qui imposent l'acier. Dès que vous ajoutez un décor, le portail passe en acier.",
    },
    {
      titre: "Couleur",
      texte: "Cinq teintes sont proposées : {couleurs}.",
    },
    {
      titre: "Style",
      texte:
        "Six styles de départ : plein, lisse, barreaux, lames de chêne, rosace et volutes. Vous les gardez tels quels, ou vous changez chaque bloc : forme du haut, soubassement, remplissage, décor. Ce qui ne se fabrique pas est refusé, avec la raison.",
    },
  ],

  motoTitre: "Motorisation",
  moto: [
    "Un portail battant ou coulissant peut être motorisé à la commande. Les moteurs sont de la marque Somfy ; le kit comprend les télécommandes, les cellules, le feu et la batterie. Le configurateur conseille le moteur le plus facile à poser qui convient à votre portail, et vous pouvez en choisir un autre.",
    "Sans moteur, le portail s'ouvre à la main. L'atelier pose les attentes : le moteur peut venir plus tard.",
    "Le moteur n'est vendu que posé par l'atelier, qui répond de la conformité CE de l'ensemble. Un portail livré ou retiré à l'atelier est donc sans moteur. Le courant jusqu'au pilier reste à votre électricien.",
  ],

  enLigneTitre: "Ce que vous choisissez en ligne",
  enLigne: [
    {
      titre: "Vos cotes",
      texte: "Le passage entre les piliers, mesuré au plus étroit, la hauteur, et la pente du sol derrière le portail.",
    },
    {
      titre: "Votre style",
      texte: "Forme du haut, soubassement, remplissage, matière, couleur, décor. Le dessin suit à l'échelle et le prix se calcule aussitôt.",
    },
    {
      titre: "Le moteur et le portillon",
      texte: "Un moteur en option, et un portillon assorti si vous le souhaitez, posé avec le portail.",
    },
    {
      titre: "Qui pose, et la commande",
      texte: "L'atelier pose, ou le portail vous est livré, ou vous le retirez. On commande avec un acompte de {acompte} %.",
    },
  ],

  receptionTitre: "Posé par l'atelier, livré ou retiré à Saumur",
  reception: [
    {
      titre: "L'atelier le pose",
      texte:
        "L'atelier vient prendre les cotes avant de fabriquer. La visite se paie avec l'acompte, dès {prixVisite}, et elle est déduite du solde. Il fabrique, livre et pose jusqu'à {rayonMax} km de Saumur. Le solde se règle à la réception du portail posé.",
    },
    {
      titre: "Livré chez vous",
      texte:
        "Pour le poser vous-même. Le portail voyage debout, calé sur une palette faite à l'atelier, par transporteur, en France métropolitaine. Le prix de la livraison suit sa taille, son poids et la distance, et s'affiche avec votre code postal. Sans pose et sans moteur ; le solde se règle avant l'expédition.",
    },
    {
      titre: "Retiré à l'atelier",
      texte:
        "À Saumur, sur rendez-vous, sans frais. Sans pose et sans moteur ; le solde se règle au retrait. Nous vous appelons dès que le portail est prêt.",
    },
  ],
  nonComprisTitre: "Dans tous les cas, à prévoir de votre côté",
  nonCompris:
    "Le courant jusqu'au pilier (votre électricien), le béton (massifs, longrine, socle), fait par votre maçon d'après notre plan, et les piliers avec leurs enduits.",

  prixTitre: "Prix, acompte et délai",
  prix: [
    "Il n'y a pas de prix au mètre : le prix se calcule à vos cotes et à votre composition, avant tout engagement. Il dépend du type, de la largeur, de la hauteur, de la matière, du style, du décor, du moteur et du lieu de pose.",
    "La commande se fait en ligne, avec un acompte de {acompte} %. Le délai : {delai}.",
  ],

  faqTitre: "Vos questions",
  faq: [
    {
      q: "Quel portail choisir : battant, coulissant ou pliant ?",
      r: "Cela dépend de la place. Le battant demande de la place derrière lui, le coulissant de la place le long de la clôture, le pliant très peu des deux. Le site vous pose quelques questions sur votre entrée et vous indique le type adapté.",
    },
    {
      q: "Portail alu ou acier : lequel choisir ?",
      r: "L'alu est léger et ne rouille pas : c'est la matière des styles plein, lisse, barreaux et lames de chêne. L'acier galvanisé et thermolaqué porte les styles à décor, rosace ou volutes. Les deux sont soudés à l'atelier.",
    },
    {
      q: "Peut-on motoriser un portail sur mesure ?",
      r: "Oui, un portail battant ou coulissant peut recevoir un moteur à la commande. L'atelier le pose lui-même, avec les cellules, le feu et le réglage des efforts. Sans moteur, l'ouverture est manuelle et le moteur peut venir plus tard.",
    },
    {
      q: "Jusqu'où l'atelier pose-t-il un portail ?",
      r: "Jusqu'à {rayonMax} km de Saumur : Angers, Cholet, Tours, Chinon et les communes entre. Plus loin, le portail part par transporteur, sans pose.",
    },
    {
      q: "Puis-je poser le portail moi-même ?",
      r: "Oui. Le portail peut vous être livré par transporteur, sur palette, ou vous pouvez le retirer à l'atelier, à Saumur. Dans les deux cas, il n'y a ni visite ni moteur.",
    },
    {
      q: "Quel est le délai ?",
      r: "{delai}. Le délai exact vous est confirmé par écrit à la commande.",
    },
    {
      q: "Combien coûte un portail sur mesure ?",
      r: "Le prix dépend de vos cotes et de votre composition. Il s'affiche en ligne, avec un dessin à l'échelle et une estimation en PDF. Les « dès » des fiches donnent le point de départ de chaque modèle.",
    },
    {
      q: "Faut-il une autorisation de la mairie ?",
      r: "Dans certaines communes, une clôture ou un portail demande une déclaration préalable, selon le plan local d'urbanisme. Renseignez-vous en mairie avant de commander.",
    },
    {
      q: "Que faut-il prévoir avant la pose ?",
      r: "Le courant jusqu'au pilier, le béton des massifs, de la longrine ou du socle d'après notre plan, et vos piliers. À la visite, l'atelier vérifie les piliers, le niveau du sol et l'accès ; un pilier à reprendre ou un réseau enterré peut changer le devis.",
    },
    {
      q: "Fabriquez-vous aussi le portillon ?",
      r: "Oui : un portillon dans le même style, la même hauteur et la même couleur que votre portail, posé avec lui. Il peut aussi se commander seul.",
    },
  ],

  finTitre: "Composez votre portail",
  fin: "Entrez vos cotes, choisissez votre style : le dessin et le prix s'affichent aussitôt. Une question avant ? Écrivez-nous.",
  anglais: "",
  voirAussi: "À voir aussi",
  liens: {
    famille: "Tous les portails",
    zone: "Zone d'intervention",
    rdv: "Prise de cotes à domicile",
    bois: "Le bois massif à l'atelier",
  },
  service: { nom: "Portail sur mesure en alu ou en acier", type: "Portail sur mesure" },
};

const EN: TextesPortailSurMesure = {
  seo: {
    title: "Bespoke aluminium or steel gates, Saumur",
    description:
      "Bespoke swing, sliding or folding gates in aluminium or steel, made in our Saumur workshop, France. Fitted by us within {rayonMax} km, or delivered.",
  },
  fil: "Bespoke gates in Saumur",
  surtitre: "Swing, sliding, folding, pedestrian",
  h1: "Bespoke aluminium or steel gates, made in Saumur",
  intro:
    "Our metalwork workshop in Saumur makes your gate, welded and powder-coated, to the size of your entrance. Swing, sliding, folding or pedestrian gate: you design it online, with its scale drawing and its price.",
  ctaConfig: "Design my gate",
  ctaContact: "Ask a question",

  typesTitre: "Swing, sliding or folding: which gate for your entrance?",
  typesIntro: "The type of gate is chosen first according to the space around the entrance, before style or material.",
  types: {
    "portail-battant": {
      quand:
        "The usual choice, when there is room behind the gate. Two leaves swing into the property. They can be unequal: the small one then works as a pedestrian gate.",
      lien: "The bespoke swing gate",
    },
    "portail-coulissant": {
      quand:
        "When there is no room behind. It slides along the fence: nothing opens towards the house. On a rail if the ground is hard and level, with no rail (cantilevered) on gravel, soil or a slope.",
      lien: "The bespoke sliding gate",
    },
    "portail-pliant": {
      quand:
        "When there is room neither behind nor alongside: enclosed courtyard, town house, short drive. Each leaf folds in two. It has more parts to make and adjust, hence its price.",
      lien: "The bespoke folding gate",
    },
    portillon: {
      quand: "The way in on foot, alone or matching your gate. Ordered with it, it shares the survey visit and the trip.",
      lien: "The bespoke pedestrian gate",
    },
  },
  desLegende:
    "“From” is the price of a gate fitted by the workshop, in the least expensive style, without motor, at each page's starting size. Your measurements change the price, and the page calculates it.",
  triTexte: "Not sure which type? A few questions about the space you have will point you to the right gate.",
  triLien: "Which gate for my entrance?",

  matiereTitre: "Aluminium or steel?",
  matiere: [
    {
      titre: "Powder-coated aluminium",
      texte:
        "An aluminium frame, TIG-welded in our workshop, then powder-coated. Aluminium is light and does not rust. It is the material of the solid, smooth, bars and oak slats styles.",
    },
    {
      titre: "Galvanised, powder-coated steel",
      texte:
        "Hot-dip galvanised steel, then powder-coated. It carries the decorative styles: the rosette, and the wrought-iron scrolls welded in our workshop, which require steel. As soon as you add a decoration, the gate becomes steel.",
    },
    {
      titre: "Colour",
      texte: "Five colours are offered: {couleurs}.",
    },
    {
      titre: "Style",
      texte:
        "Six starting styles: solid, smooth, bars, oak slats, rosette and scrolls. Keep them as they are, or change each block: top shape, lower panel, infill, decoration. What cannot be made is refused, with the reason.",
    },
  ],

  motoTitre: "Motor",
  moto: [
    "A swing or sliding gate can be motorised when you order. The motors are Somfy; the kit includes the remotes, the photocells, the light and the battery. The configurator recommends the motor that is easiest to fit and suits your gate, and you can choose another.",
    "Without a motor, the gate opens by hand. We prepare the ground for it: the motor can come later.",
    "The motor is only sold fitted by the workshop, which answers for the CE conformity of the whole. A gate that is delivered or collected from the workshop is therefore without motor. The power supply to the pillar is for your electrician.",
  ],

  enLigneTitre: "What you choose online",
  enLigne: [
    {
      titre: "Your measurements",
      texte: "The opening between the pillars, measured at the narrowest point, the height, and the slope of the ground behind the gate.",
    },
    {
      titre: "Your style",
      texte: "Top shape, lower panel, infill, material, colour, decoration. The scale drawing follows and the price is calculated at once.",
    },
    {
      titre: "The motor and the pedestrian gate",
      texte: "A motor as an option, and a matching pedestrian gate if you wish, fitted with the gate.",
    },
    {
      titre: "Who fits it, and the order",
      texte: "The workshop fits it, or it is delivered, or you collect it. You order with a {acompte}% deposit.",
    },
  ],

  receptionTitre: "Fitted by the workshop, delivered, or collected in Saumur",
  reception: [
    {
      titre: "The workshop fits it",
      texte:
        "The workshop comes to take the measurements before making the gate. The visit is paid with the deposit, from {prixVisite}, and deducted from the balance. We make, deliver and fit within {rayonMax} km of Saumur. The balance is paid when the fitted gate is handed over.",
    },
    {
      titre: "Delivered to you",
      texte:
        "To fit it yourself. The gate travels upright, wedged on a pallet made in our workshop, by carrier, within mainland France. The delivery price follows its size, its weight and the distance, and shows with your postcode. No fitting and no motor; the balance is paid before shipping.",
    },
    {
      titre: "Collected from the workshop",
      texte:
        "In Saumur, by appointment, free of charge. No fitting and no motor; the balance is paid at collection. We call you as soon as the gate is ready.",
    },
  ],
  nonComprisTitre: "In every case, to arrange on your side",
  nonCompris:
    "The power supply to the pillar (your electrician), the concrete (footings, ground beam, base), done by your mason from our plan, and the pillars with their rendering.",

  prixTitre: "Price, deposit and lead time",
  prix: [
    "There is no price per metre: the price is calculated for your measurements and your design, before any commitment. It depends on the type, the width, the height, the material, the style, the decoration, the motor and where it is fitted.",
    "You order online with a {acompte}% deposit. The lead time: {delai}.",
  ],

  faqTitre: "Your questions",
  faq: [
    {
      q: "Which gate: swing, sliding or folding?",
      r: "It depends on the space. A swing gate needs room behind it, a sliding gate needs room along the fence, a folding gate very little of either. The site asks a few questions about your entrance and tells you the suitable type.",
    },
    {
      q: "Aluminium or steel gate: which to choose?",
      r: "Aluminium is light and does not rust: it is the material of the solid, smooth, bars and oak slats styles. Galvanised, powder-coated steel carries the decorative styles, rosette or scrolls. Both are welded in our workshop.",
    },
    {
      q: "Can a bespoke gate be motorised?",
      r: "Yes, a swing or sliding gate can have a motor when you order. The workshop fits it itself, with the photocells, the light and the force setting. Without a motor, it opens by hand and the motor can come later.",
    },
    {
      q: "How far does the workshop fit a gate?",
      r: "Within {rayonMax} km of Saumur: Angers, Cholet, Tours, Chinon and the towns between. Further away, the gate is sent by carrier, without fitting.",
    },
    {
      q: "Can I fit the gate myself?",
      r: "Yes. The gate can be delivered to you by carrier, on a pallet, or you can collect it from the workshop in Saumur. In both cases there is no survey visit and no motor.",
    },
    {
      q: "What is the lead time?",
      r: "{delai}. The exact lead time is confirmed to you in writing when you order.",
    },
    {
      q: "How much does a bespoke gate cost?",
      r: "The price depends on your measurements and your design. It shows online, with a scale drawing and a PDF estimate. The “from” prices on each page give the starting point of each model.",
    },
    {
      q: "Do I need permission from the town hall?",
      r: "In some towns, a fence or a gate needs a prior declaration, depending on the local urban plan. Check with your town hall before ordering.",
    },
    {
      q: "What should I arrange before the gate is fitted?",
      r: "The power supply to the pillar, the concrete for the footings, ground beam or base from our plan, and your pillars. At the survey visit, the workshop checks the pillars, the ground level and access; a pillar to repair or a buried service can change the quote.",
    },
    {
      q: "Do you also make the pedestrian gate?",
      r: "Yes: a pedestrian gate in the same style, height and colour as your gate, fitted with it. It can also be ordered alone.",
    },
  ],

  finTitre: "Design your gate",
  fin: "Enter your measurements, choose your style: the drawing and the price show at once. A question first? Write to us.",
  anglais: "English spoken.",
  voirAussi: "See also",
  liens: {
    famille: "All gates",
    zone: "Where we work",
    rdv: "On-site measuring",
    bois: "Solid wood in our workshop",
  },
  service: { nom: "Bespoke aluminium or steel gates", type: "Bespoke gates" },
};

const TEXTES: Record<Locale, TextesPortailSurMesure> = { fr: FR, en: EN };

/** Les textes bruts, avec leurs {marqueurs} : pour les tests. */
export function textesBrutsPortailSurMesure(locale: Locale): TextesPortailSurMesure {
  return TEXTES[locale];
}

/** Les valeurs des {marqueurs} propres à la page : le rayon de pose, l'acompte, le délai, les teintes. */
export function valeursPortailSurMesure(locale: Locale, couleurs: string): Record<string, string> {
  return {
    rayonMax: String(RAYON_MAX_KM),
    acompte: String(ACOMPTE_PORTAIL_PCT),
    delai: DELAI_PORTAIL[locale],
    couleurs,
  };
}

/** Remplace les {marqueurs} de la page, à toute profondeur. */
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
 * Les textes de la page, prêts à afficher. `couleurs` : les teintes du configurateur, écrites par la page (TEXTES_PORTAIL).
 * Un marqueur resté sans valeur fait échouer la construction (verifierMarqueurs).
 */
export function textesPortailSurMesure(locale: Locale, couleurs: string): TextesPortailSurMesure {
  const textes = remplacerMarqueurs(remplirTout(TEXTES[locale], valeursPortailSurMesure(locale, couleurs)), locale);
  verifierMarqueurs(textes, `portail-sur-mesure-saumur (${locale})`);
  return textes;
}
