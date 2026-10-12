/**
 * La page des portails (/fr|en/artisanat/famille/portail), refaite le 12/10/2026 : ses textes, ses adresses, ses formats.
 * Aucun moteur, aucun prix écrit ici, aucun « server-only » : les deux îlots du navigateur (la vitrine, les modèles et le guide)
 * et la page du serveur l'importent. Les prix arrivent du serveur (portails-page.server.ts) ; les noms de styles et de teintes
 * viennent de portails-textes.ts, les dessins de public/images/portails/scenes (scripts/dessins-scenes-portails.mjs).
 */
import { COULEURS_PORTAIL, STYLES_PORTAIL, type Langue, type SlugPortail, type StylePortail } from "./portails-base.ts";
import { prixAffiche } from "./ui.ts";

export type Teinte = (typeof COULEURS_PORTAIL)[number];
export type FinitionPage = "laque" | "brut";
/** Les prix d'un style : posé, et sans pose (à retirer à l'atelier). poseMax : le haut de la fourchette (la tôle découpée a neuf dessins). null = à vos mesures sur la fiche. */
export type PrixStyle = { pose: number | null; sansPose: number | null; poseMax: number | null; sansPoseMax: number | null };
export type PrixVitrine = Record<FinitionPage, Record<StylePortail, PrixStyle>>;
/** Une carte de la section « Les quatre modèles » : le style dessiné EST celui dont le prix est le « dès ». */
export type ModeleCarte = { slug: SlugPortail; nom: string; style: StylePortail; depart: number | null; departSans: number | null; P: number; H: number };
/** Le coulissant sans rail (guide : « sol meuble ») : son style le moins cher et son « dès ». */
export type SansRail = { style: StylePortail; depart: number | null; departSans: number | null };
export type DonneesPagePortails = {
  vitrine: PrixVitrine;
  modeles: Record<SlugPortail, { style: StylePortail; depart: number | null; departSans: number | null; P: number; H: number }>;
  sansRail: SansRail | null;
  /** La cote de la vitrine : celle de départ du portail battant, en millimètres. */
  coteVitrine: { P: number; H: number };
};

/** Ce que la page du serveur donne à la vitrine (îlot client) : les prix de chaque style et finition, le style d'ouverture, la cote de départ en millimètres. */
export type PropsVitrine = { locale: Langue; prix: PrixVitrine; styleInitial: StylePortail; cote: { P: number; H: number } };
/** Ce que la page du serveur donne à la section « Les quatre modèles » et au guide (îlot client). */
export type PropsModeles = { locale: Langue; modeles: ModeleCarte[]; sansRail: SansRail | null };

/** Les quatre modèles dans l'ordre de la page (éditorial, plus de tri par prix). */
export const ORDRE_MODELES: readonly SlugPortail[] = ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"];

/** À changer quand on régénère les dessins (npm run portails:scenes) : l'adresse du fichier change, le cache du navigateur suit. */
export const VERSION_DESSINS = "1";
/** Le style qui ouvre la vitrine, et sa teinte. */
export const STYLE_VITRINE_DEPART: StylePortail = "lamesChene";
export const TEINTE_VITRINE_DEPART: Teinte = "anthracite";
/** Les sept styles et six teintes de la vitrine, dans l'ordre d'affichage. */
export const STYLES_VITRINE: readonly StylePortail[] = STYLES_PORTAIL;
export const TEINTES_VITRINE: readonly Teinte[] = COULEURS_PORTAIL;

/** Les références RAL des teintes laquées ; la rouille et le galvanisé brut n'en ont pas. */
export const RAL_TEINTE: Partial<Record<Teinte, string>> = { anthracite: "RAL 7016", noir: "RAL 9005", blanc: "RAL 9016", vert: "RAL 6009" };

/** Brut = galvanisé laissé tel quel (acier) ; sinon laqué. */
export const finitionDe = (teinte: Teinte): FinitionPage => (teinte === "galva" ? "brut" : "laque");

/** La matière affichée d'un style dans une teinte : le galvanisé brut n'existe qu'en acier, même pour les styles alu. */
export function matiereVitrine(style: StylePortail, teinte: Teinte): "alu" | "acier" {
  if (teinte === "galva") return "acier";
  return style === "rosace" || style === "volutes" || style === "tole" ? "acier" : "alu";
}

/** Les dessins : tirés du moteur une fois pour toutes (jamais redessinés), chargés en <img>. */
export const srcVitrine = (style: StylePortail, teinte: Teinte): string => `/images/portails/scenes/vitrine/battant-${style}-${teinte}.svg?v=${VERSION_DESSINS}`;
export const srcCarte = (slug: SlugPortail, style: StylePortail, guidage?: "rail" | "auto"): string =>
  slug === "portail-coulissant" && guidage === "auto"
    ? `/images/portails/scenes/cartes/portail-coulissant-${style}-auto.svg?v=${VERSION_DESSINS}`
    : `/images/portails/scenes/cartes/${slug}-${style}.svg?v=${VERSION_DESSINS}`;

/** L'adresse de la fiche, ouverte sur la configuration affichée (lue par configDepuisAdresse) : ?style=…&mat=…&couleur=…&guidage=…#configuration */
export function lienFiche(locale: Langue, slug: SlugPortail, p: { style?: StylePortail; mat?: "acier"; couleur?: Teinte; guidage?: "rail" | "auto" } = {}): string {
  const q = new URLSearchParams();
  if (p.style) q.set("style", p.style);
  if (p.mat) q.set("mat", p.mat);
  if (p.couleur) q.set("couleur", p.couleur);
  if (p.guidage) q.set("guidage", p.guidage);
  const texte = q.toString();
  return `/${locale}/artisanat/${slug}${texte ? `?${texte}` : ""}#configuration`;
}
/** Ce que la vitrine envoie à la fiche : le galvanisé brut impose l'acier. */
export function paramsVitrine(style: StylePortail, teinte: Teinte): { style: StylePortail; mat?: "acier"; couleur: Teinte } {
  return teinte === "galva" ? { style, mat: "acier", couleur: "galva" } : { style, couleur: teinte };
}

/** Une cote en millimètres, écrite en mètres : « 3,50 × 1,60 m » / « 3.50 × 1.60 m ». */
export function formatCote(P: number, H: number, locale: Langue): string {
  const m = (mm: number) => (mm / 1000).toFixed(2).replace(".", locale === "fr" ? "," : ".");
  return `${m(P)} × ${m(H)} m`;
}
const m1 = (mm: number, locale: Langue) => (mm / 1000).toFixed(2).replace(".", locale === "fr" ? "," : ".");
/** « 3,50 m » */
export const formatMetre = (mm: number, locale: Langue) => `${m1(mm, locale)} m`;

/** Une fourchette de prix (« bas à haut € ») ; le montant seul si les deux sont égaux ou si le haut manque. */
export function prixPlage(bas: number, haut: number | null, locale: Langue): { texte: string; plage: boolean } {
  if (haut === null || haut <= bas) return { texte: prixAffiche(bas, locale), plage: false };
  const a = prixAffiche(bas, locale), b = prixAffiche(haut, locale);
  return { texte: locale === "fr" ? `${a.replace(/\s?€$/, "")} à ${b}` : `${a} to ${b}`, plage: true };
}

/** La mention des images qui ne sont pas des photos (visuels.ts : le composant Visuel ne la pose pas pour un .svg). */
export const MENTION_SCENE: Record<Langue, string> = { fr: "Image d'illustration", en: "Illustration" };

const NBSP = " ";

/** Tous les textes de la page, français et anglais, mêmes clés. Les prix et les noms de styles arrivent en paramètres. */
export const TXT = {
  fr: {
    phrase: "Alu ou acier, soudés à Saumur, posés par l'atelier.",
    vitrine: {
      h2: "Le portail battant en sept styles et six teintes",
      surtitre: "Portail battant",
      styleGroupe: "Style", teinteGroupe: "Teinte",
      teinte: (nom: string, ral?: string) => `Teinte${NBSP}: ${nom}${ral ? ` · ${ral}` : ""}`,
      pose: "posé", sansPose: (p: string) => `${p} sans pose, à retirer à l'atelier`,
      plage: (a: string, b: string) => `${a} à ${b}`,
      cote: (largeur: string, hauteur: string) => `Pour un passage de ${largeur}, ${hauteur} de haut, sans moteur.`,
      tole: "Selon le dessin : neuf au choix sur la fiche.",
      sansPrix: "Prix à vos mesures sur la fiche",
      bouton: "Composer ce portail", lienModeles: "Les quatre modèles", lienGuide: "Quel portail chez moi ?",
      matiere: {
        aluLaque: "Cadre alu thermolaqué", acierLaque: "Acier galvanisé et thermolaqué", toleLaque: "Acier prégalvanisé, thermolaqué",
        brut: "Acier galvanisé à chaud, laissé brut (sans peinture, gris zinc)", toleBrut: "Acier prégalvanisé, laissé brut (sans peinture, gris zinc)",
      },
      alt: (style: string, teinte: string) => `Portail battant, style ${style}, ${teinte.toLowerCase()} (image d'illustration)`,
    },
    faits: [
      { t: "Fabriqué à Saumur", d: "Soudé à l'atelier, aux cotes de votre entrée." },
      { t: "Posé par l'atelier", d: "Visite de prise de cotes comprise jusqu'à 45 km de Saumur ; au-delà, la route s'ajoute." },
      { t: "Sept styles, six teintes", d: "Alu ou acier selon le style. Moteur Somfy en option sur le battant et le coulissant." },
    ],
    modeles: {
      h2: "Les quatre modèles",
      legende: "« Dès » : portail posé par l'atelier, style le moins cher, thermolaqué, sans moteur, passage de 3,50 m, 1,60 m de haut (portillon : 1,00 m). Sans pose : à retirer à l'atelier. Vos mesures et vos choix se font sur la fiche.",
      phrase: { "portail-battant": "Deux vantaux qui s'ouvrent vers la maison.", "portail-coulissant": "Il glisse le long de la clôture.", "portail-pliant": "Chaque vantail se plie en deux.", portillon: "L'entrée des piétons, assortie au portail." } as Record<SlugPortail, string>,
      place: {
        "portail-battant": "Place : la moitié du passage, derrière chaque pilier.", "portail-coulissant": "Place : un côté libre, aussi long que le passage.",
        "portail-pliant": "Place : un quart du passage, derrière chaque pilier.", portillon: "Seul ou assorti à votre portail.",
      } as Record<SlugPortail, string>,
      /** La ligne « place » du coulissant sans rail (guide : sol meuble) : le contrepoids demande environ une fois et demie le passage. */
      placeSansRail: "Place : un côté libre, environ 1,5 × le passage.",
      posedes: (p: string) => `Posé dès ${p}`, sansPose: (p: string) => `${p} sans pose`,
      ligneStyle: (style: string, cote: string, slug: SlugPortail) => `${style} · ${slug === "portail-coulissant" ? "sur rail · " : ""}${cote}`,
      ligneStyleSansRail: (style: string, cote: string) => `${style} · sans rail · ${cote}`,
      aEtudier: "Prix à vos mesures sur la fiche",
      conseille: "Conseillé chez vous", conseilleCache: "conseillé chez vous",
      /** Sur la ligne compacte du téléphone (plaque de 132 px), l'étiquette tient sur une ligne. */
      conseilleCourt: "Conseillé",
      alt: (nom: string, style: string) => `${nom}, style ${style.toLowerCase()}, vu depuis la rue (image d'illustration)`,
    },
    guide: {
      h2: "Quel portail pour votre entrée ?", sous: "3 questions, sans rien mesurer.",
      question: (n: number) => `Question ${n} sur 3`, retour: "Retour",
      schema: ["Schéma : deux vantaux ouverts vers la propriété", "Schéma : le portail glisse le long de la clôture", "Schéma : sol dur avec rail, ou sol meuble sans rail"],
      posedes: (p: string) => `Posé dès ${p}`, sansPose: (p: string) => `${p} sans pose`,
      alt: (nom: string, style: string) => `${nom}, style ${style.toLowerCase()}, vu depuis la rue (image d'illustration)`,
    },
    etapes: {
      titre: "Votre portail, étape par étape",
      liste: [
        { t: "Vous composez", d: "Style, teinte, cotes : le dessin à l'échelle et le prix suivent. Estimation PDF gratuite, sans compte." },
        { t: "Vous commandez", d: "Un acompte de 40 % lance la commande, en ligne. Le solde se règle à la réception du portail posé." },
        { t: "Nous venons mesurer", d: "Posé par l'atelier : visite de prise de cotes, piliers et sol relevés. Le plan définitif et le devis à signer suivent." },
        { t: "Fabrication, puis pose", d: "6 à 8 semaines de fabrication à Saumur, puis la pose. Ou livraison, ou retrait à l'atelier, sans pose." },
      ],
    },
    contact: {
      h2: "Une question avant de composer ?", texte: (tel: string, horaires: string) => `L'atelier vous répond au ${tel}. ${horaires}`,
      appeler: "Appeler l'atelier", ecrire: "Écrire à l'atelier", choisir: "Pour bien choisir",
    },
  },
  en: {
    phrase: "Aluminium or steel, welded in Saumur, fitted by the workshop.",
    vitrine: {
      h2: "The swing gate in seven styles and six colours",
      surtitre: "Swing gate",
      styleGroupe: "Style", teinteGroupe: "Colour",
      teinte: (nom: string, ral?: string) => `Colour: ${nom}${ral ? ` · ${ral}` : ""}`,
      pose: "fitted", sansPose: (p: string) => `${p} without fitting, to collect at the workshop`,
      plage: (a: string, b: string) => `${a} to ${b}`,
      cote: (largeur: string, hauteur: string) => `For a ${largeur} opening, ${hauteur} high, without motor.`,
      tole: "Depending on the design: nine to choose from on the model page.",
      sansPrix: "Price at your size on the model page",
      bouton: "Compose this gate", lienModeles: "The four models", lienGuide: "Which gate suits me?",
      matiere: {
        aluLaque: "Powder-coated aluminium frame", acierLaque: "Galvanised, powder-coated steel", toleLaque: "Pre-galvanised steel, powder-coated",
        brut: "Hot-dip galvanised steel, left raw (unpainted, zinc grey)", toleBrut: "Pre-galvanised steel, left raw (unpainted, zinc grey)",
      },
      alt: (style: string, teinte: string) => `Swing gate, ${style.toLowerCase()} style, ${teinte.toLowerCase()} (illustration)`,
    },
    faits: [
      { t: "Made in Saumur", d: "Welded in the workshop, to the size of your entrance." },
      { t: "Fitted by the workshop", d: "Survey visit included within 45 km of Saumur; beyond that, travel is added." },
      { t: "Seven styles, six colours", d: "Aluminium or steel depending on the style. Somfy motor optional on the swing and sliding gates." },
    ],
    modeles: {
      h2: "The four models",
      legende: "“From”: gate fitted by the workshop, least expensive style, powder-coated, without motor, 3.50 m opening, 1.60 m high (pedestrian gate: 1.00 m). Without fitting: collected at the workshop. Your size and choices are set on the model page.",
      phrase: { "portail-battant": "Two leaves that open towards the house.", "portail-coulissant": "It slides along the fence.", "portail-pliant": "Each leaf folds in two.", portillon: "The pedestrian entrance, matching the gate." } as Record<SlugPortail, string>,
      place: {
        "portail-battant": "Room: half the opening, behind each pillar.", "portail-coulissant": "Room: one side free, as long as the opening.",
        "portail-pliant": "Room: a quarter of the opening, behind each pillar.", portillon: "Alone or matching your gate.",
      } as Record<SlugPortail, string>,
      placeSansRail: "Room: one side free, about 1.5× the opening.",
      posedes: (p: string) => `From ${p} fitted`, sansPose: (p: string) => `${p} without fitting`,
      ligneStyle: (style: string, cote: string, slug: SlugPortail) => `${style} · ${slug === "portail-coulissant" ? "on a rail · " : ""}${cote}`,
      ligneStyleSansRail: (style: string, cote: string) => `${style} · no rail · ${cote}`,
      aEtudier: "Price at your size on the model page",
      conseille: "Recommended for you", conseilleCache: "recommended for you",
      conseilleCourt: "Recommended",
      alt: (nom: string, style: string) => `${nom}, ${style.toLowerCase()} style, seen from the street (illustration)`,
    },
    guide: {
      h2: "Which gate for your entrance?", sous: "3 questions, no measuring.",
      question: (n: number) => `Question ${n} of 3`, retour: "Back",
      schema: ["Diagram: two leaves open into the property", "Diagram: the gate slides along the fence", "Diagram: hard ground with a rail, or soft ground without a rail"],
      posedes: (p: string) => `From ${p} fitted`, sansPose: (p: string) => `${p} without fitting`,
      alt: (nom: string, style: string) => `${nom}, ${style.toLowerCase()} style, seen from the street (illustration)`,
    },
    etapes: {
      titre: "Your gate, step by step",
      liste: [
        { t: "You compose", d: "Style, colour, size: the scale drawing and the price follow. Free PDF estimate, no account needed." },
        { t: "You order", d: "A 40% deposit starts the order, online. The balance is paid when the fitted gate is handed over." },
        { t: "We come and measure", d: "Fitted by the workshop: survey visit, pillars and ground measured. The final plan and the quote to sign follow." },
        { t: "Making, then fitting", d: "6 to 8 weeks of making in Saumur, then fitting. Or delivery, or collection at the workshop, without fitting." },
      ],
    },
    contact: {
      h2: "A question before you compose?", texte: (tel: string, horaires: string) => `The workshop answers on ${tel}. ${horaires}`,
      appeler: "Call the workshop", ecrire: "Write to the workshop", choisir: "To help you choose",
    },
  },
} as const;
