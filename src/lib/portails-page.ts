/**
 * La page des portails (/fr|en/artisanat/famille/portail), refaite le 12/10/2026 : ses textes, ses adresses, ses formats.
 * Aucun moteur, aucun prix écrit ici, aucun « server-only » : les deux îlots du navigateur (la vitrine, les modèles et le guide)
 * et la page du serveur l'importent. Les prix arrivent du serveur (portails-page.server.ts) ; les noms de styles et de teintes
 * viennent de portails-textes.ts, les dessins de public/images/portails/scenes (scripts/dessins-scenes-portails.mjs).
 */
import { ACOMPTE_PORTAIL_PCT, COULEURS_PORTAIL, STYLES_PORTAIL, type Langue, type SlugPortail, type StylePortail } from "./portails-base.ts";
import { typographieLangues } from "./typographie.ts";
import { prixAffiche } from "./ui.ts";
// Un petit fichier à part (pas le manifeste, 77 lignes que le navigateur n'a pas à recevoir).
import versionDessins from "../../public/images/portails/scenes/version.json" with { type: "json" };

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

/** La version des dessins : écrite par `npm run portails:scenes` (empreinte du contenu des fichiers), l'adresse des fichiers change donc quand ils changent, et le cache du navigateur suit. */
export const VERSION_DESSINS: string = versionDessins.version;
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

/** Une cote en millimètres, écrite en mètres : « 3,50 × 1,60 m » / « 3.50 × 1.60 m ». Insécables : la cote ne se coupe jamais en deux lignes. */
export function formatCote(P: number, H: number, locale: Langue): string {
  const m = (mm: number) => (mm / 1000).toFixed(2).replace(".", locale === "fr" ? "," : ".");
  return `${m(P)}${NBSP}×${NBSP}${m(H)}${NBSP}m`;
}
const m1 = (mm: number, locale: Langue) => (mm / 1000).toFixed(2).replace(".", locale === "fr" ? "," : ".");
/** « 3,50 m » (avec une espace insécable entre le nombre et l'unité). */
export const formatMetre = (mm: number, locale: Langue) => `${m1(mm, locale)}${NBSP}m`;

/** Un prix écrit pour cette page : le séparateur de milliers est une espace insécable ordinaire (l'espace fine de prixAffiche disparaît en gras). */
export const prixPage = (euros: number, locale: Langue): string => prixAffiche(euros, locale).replace(/\u202f/g, "\u00a0");

/** Une fourchette de prix (« bas à haut € ») ; le montant seul si les deux sont égaux ou si le haut manque. */
export function prixPlage(bas: number, haut: number | null, locale: Langue): { texte: string; plage: boolean } {
  if (haut === null || haut <= bas) return { texte: prixPage(bas, locale), plage: false };
  const a = prixPage(bas, locale), b = prixPage(haut, locale);
  return { texte: locale === "fr" ? `${a.replace(/\s?€$/, "")} à ${b}` : `${a} to ${b}`, plage: true };
}

/** La mention des images qui ne sont pas des photos (visuels.ts : le composant Visuel ne la pose pas pour un .svg). */
export const MENTION_SCENE: Record<Langue, string> = { fr: "Image d'illustration", en: "Illustration" };

/** Une espace insécable : dans les fonctions de texte (dont les résultats ne repassent pas par typographie.ts). */
const NBSP = "\u00a0";

/**
 * Tous les textes de la page, français et anglais, mêmes clés. Les prix et les noms de styles arrivent en paramètres.
 * Écrits avec des espaces ordinaires : TXT (plus bas) y pose les insécables (nombre + unité, « : ; ? ! % »), voir typographie.ts.
 */
const TXT_BRUT = {
  fr: {
    phrase: "Alu ou acier, soudés à Saumur, posés par l'atelier.",
    vitrine: {
      h2: "Le portail battant en sept styles et six teintes",
      surtitre: "Portail battant",
      styleGroupe: "Style", teinteGroupe: "Teinte",
      teinte: (nom: string, ral?: string) => `Teinte${NBSP}: ${nom}${ral ? ` · ${ral}` : ""}`,
      /** Le libellé visible au-dessus des vignettes : on devine qu'elles se cliquent. */
      style: (nom: string) => `Style${NBSP}: ${nom}`,
      // Dans les fonctions, les insécables sont écrites ici (typographie.ts ne les réécrit pas) : « à l'atelier » ne se coupe pas, « l'atelier » ne reste jamais seul.
      pose: "posé", sansPose: (p: string) => `${p} sans${NBSP}pose, à retirer à${NBSP}l'atelier`,
      plage: (a: string, b: string) => `${a} à ${b}`,
      // « passage » est défini dès le premier écran : la largeur libre entre les piliers.
      cote: (largeur: string, hauteur: string) => `Pour un passage de ${largeur} entre vos piliers, ${hauteur} de haut, sans${NBSP}moteur.`,
      tole: "Selon le dessin : neuf au choix sur la fiche.",
      sansPrix: "Prix à vos mesures sur la fiche",
      bouton: "Composer ce portail", lienModeles: "Les quatre modèles", lienGuide: "Quel portail pour mon entrée ?",
      matiere: {
        aluLaque: "Cadre alu thermolaqué (peint au four)", acierLaque: "Acier galvanisé et thermolaqué (peint au four)", toleLaque: "Acier prégalvanisé, thermolaqué (peint au four)",
        brut: "Acier galvanisé à chaud, sans peinture : gris zinc qui se patine avec le temps", toleBrut: "Acier prégalvanisé, sans peinture : gris zinc qui se patine avec le temps",
      },
      // En galvanisé brut tous les styles sont en acier : la note ne dit plus « alu ».
      notesBrut: { plein: "Lames pleines, on ne voit pas à travers", lisse: "Panneau lisse, moderne", lamesChene: "Cadre acier, lames de chêne" } as Partial<Record<StylePortail, string>>,
      alt: (style: string, teinte: string) => `Portail battant, style ${style.toLowerCase()}, ${teinte.toLowerCase()} (image d'illustration)`,
    },
    faits: [
      { t: "Fabriqué à Saumur", d: "Soudé à l'atelier, aux dimensions de votre entrée." },
      // La visite se règle avec l'acompte puis se déduit du solde (étape 2, fiche, CGV) ; la route est comprise dans le prix posé jusqu'à 45 km de Saumur (portails-outil/prix.ts, devis).
      { t: "Posé par l'atelier", d: "Visite de prise de cotes réglée avec l'acompte, puis déduite du solde ; au-delà de 45 km de Saumur, la route s'ajoute." },
      { t: "Sept styles, six teintes", d: "Alu ou acier selon le style et la teinte. Moteur Somfy en option sur le battant et le coulissant." },
    ],
    modeles: {
      h2: "Les quatre modèles",
      // Aucun chiffre ici : le passage et la hauteur de chaque « dès » sont sur la carte (ligneStyle, cote du serveur).
      legende: "« Dès » : portail posé par l'atelier, dans le style le moins cher, sans moteur, pour le passage et la hauteur indiqués. « Sans pose » : à retirer à l'atelier. Vos choix se font sur la fiche.",
      phrase: { "portail-battant": "Deux vantaux qui s'ouvrent vers la maison.", "portail-coulissant": "Il glisse le long de la clôture.", "portail-pliant": "Chaque vantail se plie en deux.", portillon: "L'entrée des piétons, assortie au portail." } as Record<SlugPortail, string>,
      // Le coulissant sur rail demande le passage plus 160 mm (le moteur : « Place le long de la clôture », 3 660 mm pour 3 500 ; test).
      place: {
        "portail-battant": "Place nécessaire : la moitié du passage, derrière chaque pilier.", "portail-coulissant": "Place nécessaire : un côté libre, le passage plus 16 cm.",
        "portail-pliant": "Place nécessaire : un quart du passage, derrière chaque pilier.", portillon: "Seul ou assorti à votre portail.",
      } as Record<SlugPortail, string>,
      /** La ligne « place » du coulissant sans rail (guide : sol meuble) : le contrepoids demande environ une fois et demie le passage. */
      placeSansRail: "Place nécessaire : un côté libre, environ 1,5 × le passage.",
      posedes: (p: string) => `Posé dès ${p}`, sansPose: (p: string) => `${p} sans${NBSP}pose`,
      // Le « dès » est un prix thermolaqué (le galvanisé brut coûte moins : la vitrine l'affiche) : chaque carte le dit.
      // Le « · » reste collé au mot qui le précède : une ligne ne commence jamais par un séparateur.
      ligneStyle: (style: string, cote: string, slug: SlugPortail) => `${style}, thermolaqué${NBSP}· ${slug === "portail-coulissant" ? `sur rail${NBSP}· ` : ""}${cote}`,
      ligneStyleSansRail: (style: string, cote: string) => `${style}, thermolaqué${NBSP}· sans rail${NBSP}· ${cote}`,
      aEtudier: "Prix à vos mesures sur la fiche",
      conseille: "Conseillé chez vous", conseilleCache: "conseillé chez vous",
      /** Sur la ligne compacte du téléphone (plaque de 132 px), l'étiquette tient sur une ligne. */
      conseilleCourt: "Conseillé",
      // Les quatre cartes : l'alt reste court (la mention d'illustration est sur la vitrine et sur le résultat du guide, pas six fois pour un lecteur d'écran).
      alt: (nom: string, style: string) => `${nom}, style ${style.toLowerCase()}`,
      /** Le coulissant : l'alt dit aussi s'il est sur rail ou sans rail (le dessin, le prix et la ligne visible changent). */
      altGuidage: (nom: string, style: string, guidage: "rail" | "auto") => `${nom}, style ${style.toLowerCase()}, ${guidage === "auto" ? "sans rail" : "sur rail"}`,
    },
    guide: {
      h2: "Quel portail pour votre entrée ?", sous: "3 questions sur la place dont vous disposez.",
      sansJs: "Pour répondre aux questions, activez JavaScript. Sinon, choisissez un modèle ci-dessus, ou appelez l'atelier.",
      question: (n: number) => `Question ${n} sur 3`, retour: "Retour",
      schema: ["Schéma : deux vantaux ouverts vers l'intérieur", "Schéma : le portail glisse le long de la clôture", "Schéma : sol dur avec rail, ou sol meuble sans rail"],
      // Le résultat redit que le « dès » est thermolaqué et que « sans pose » veut dire : à retirer à l'atelier (la légende des cartes est plus haut).
      posedes: (p: string) => `Posé dès ${p}, thermolaqué`, sansPose: (p: string) => `${p} sans${NBSP}pose, à retirer à${NBSP}l'atelier`,
      alt: (nom: string, style: string) => `${nom}, style ${style.toLowerCase()}, vu depuis la rue (image d'illustration)`,
      altGuidage: (nom: string, style: string, guidage: "rail" | "auto") => `${nom}, style ${style.toLowerCase()}, ${guidage === "auto" ? "sans rail" : "sur rail"}, vu depuis la rue (image d'illustration)`,
    },
    etapes: {
      titre: "Votre portail, étape par étape",
      liste: [
        { t: "Vous composez", d: "Style, teinte, dimensions : le dessin à l'échelle et le prix suivent. Estimation PDF gratuite, sans compte." },
        // L'acompte est celui de la commande en ligne (ACOMPTE_PORTAIL_PCT) ; la visite se règle avec lui et se déduit du solde (cgv, art. 4).
        { t: "Vous commandez", d: `Vous réglez en ligne un acompte de ${ACOMPTE_PORTAIL_PCT} % et la visite de prise de cotes (déduite du solde). Le solde se règle à la réception du portail posé.` },
        { t: "Nous venons mesurer", d: "Posé par l'atelier : visite de prise de cotes, piliers et sol relevés. Le plan définitif et le devis à signer suivent." },
        { t: "Fabrication, puis pose", d: "6 à 8 semaines de fabrication à Saumur, puis la pose. Sans pose : retrait à l'atelier, ou livraison en supplément." },
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
      style: (nom: string) => `Style: ${nom}`,
      pose: "fitted", sansPose: (p: string) => `${p} without${NBSP}fitting, to collect from the${NBSP}workshop`,
      plage: (a: string, b: string) => `${a} to ${b}`,
      // “opening” is defined from the first screen: the clear width between the pillars.
      cote: (largeur: string, hauteur: string) => `For a ${largeur} opening between your pillars, ${hauteur} high, without${NBSP}motor.`,
      tole: "Depending on the design: nine to choose from on the model page.",
      sansPrix: "Price at your size on the model page",
      bouton: "Design this gate", lienModeles: "The four models", lienGuide: "Which gate for my entrance?",
      matiere: {
        aluLaque: "Powder-coated aluminium frame", acierLaque: "Galvanised, powder-coated steel", toleLaque: "Pre-galvanised steel, powder-coated",
        brut: "Hot-dip galvanised steel, unpainted: zinc grey that develops a patina over time", toleBrut: "Pre-galvanised steel, unpainted: zinc grey that develops a patina over time",
      },
      // Raw galvanised: every style is steel, so the note no longer says "aluminium".
      notesBrut: { plein: "Solid slats, fully private", lisse: "Flat panel, modern", lamesChene: "Steel frame, oak slats" } as Partial<Record<StylePortail, string>>,
      alt: (style: string, teinte: string) => `Swing gate, ${style.toLowerCase()} style, ${teinte.toLowerCase()} (illustration)`,
    },
    faits: [
      { t: "Made in Saumur", d: "Welded in the workshop, to the size of your entrance." },
      { t: "Fitted by the workshop", d: "Survey visit paid with the deposit, then deducted from the balance; beyond 45 km from Saumur, travel is added." },
      { t: "Seven styles, six colours", d: "Aluminium or steel depending on the style and the colour. Somfy motor optional on the swing and sliding gates." },
    ],
    modeles: {
      h2: "The four models",
      // No figures here: the opening and the height of each “from” price are on the card (ligneStyle, size from the server).
      legende: "“From”: gate fitted by the workshop, in the least expensive style, without motor, for the opening and height shown. “Without fitting”: to collect from the workshop. Your choices are made on the model page.",
      phrase: { "portail-battant": "Two leaves that open towards the house.", "portail-coulissant": "It slides along the fence.", "portail-pliant": "Each leaf folds in two.", portillon: "The way in on foot, matching the gate." } as Record<SlugPortail, string>,
      place: {
        "portail-battant": "Space needed: half the opening, behind each pillar.", "portail-coulissant": "Space needed: one free side, the opening plus 16 cm.",
        "portail-pliant": "Space needed: a quarter of the opening, behind each pillar.", portillon: "Alone or matching your gate.",
      } as Record<SlugPortail, string>,
      placeSansRail: "Space needed: one free side, about 1.5× the opening.",
      posedes: (p: string) => `From ${p} fitted`, sansPose: (p: string) => `${p} without${NBSP}fitting`,
      ligneStyle: (style: string, cote: string, slug: SlugPortail) => `${style}, powder-coated${NBSP}· ${slug === "portail-coulissant" ? `on a rail${NBSP}· ` : ""}${cote}`,
      ligneStyleSansRail: (style: string, cote: string) => `${style}, powder-coated${NBSP}· no rail${NBSP}· ${cote}`,
      aEtudier: "Price at your size on the model page",
      conseille: "Recommended for you", conseilleCache: "recommended for you",
      conseilleCourt: "Recommended",
      alt: (nom: string, style: string) => `${nom}, ${style.toLowerCase()} style`,
      altGuidage: (nom: string, style: string, guidage: "rail" | "auto") => `${nom}, ${style.toLowerCase()} style, ${guidage === "auto" ? "no rail" : "on a rail"}`,
    },
    guide: {
      h2: "Which gate for your entrance?", sous: "3 questions about the space you have.",
      sansJs: "To answer the questions, turn on JavaScript. Otherwise, pick a model above, or call the workshop.",
      question: (n: number) => `Question ${n} of 3`, retour: "Back",
      schema: ["Diagram: two leaves open into the property", "Diagram: the gate slides along the fence", "Diagram: hard ground with a rail, or soft ground without a rail"],
      posedes: (p: string) => `From ${p} fitted, powder-coated`, sansPose: (p: string) => `${p} without${NBSP}fitting, to collect from the${NBSP}workshop`,
      alt: (nom: string, style: string) => `${nom}, ${style.toLowerCase()} style, seen from the street (illustration)`,
      altGuidage: (nom: string, style: string, guidage: "rail" | "auto") => `${nom}, ${style.toLowerCase()} style, ${guidage === "auto" ? "no rail" : "on a rail"}, seen from the street (illustration)`,
    },
    etapes: {
      titre: "Your gate, step by step",
      liste: [
        { t: "You design", d: "Style, colour, size: the scale drawing and the price follow. Free PDF estimate, no account needed." },
        { t: "You order", d: `You pay a ${ACOMPTE_PORTAIL_PCT}% deposit online, plus the survey visit, which is deducted from the balance. The balance is paid when the fitted gate is handed over.` },
        { t: "We come and measure", d: "Fitted by the workshop: we survey the pillars and the ground. The final plan and the quote to sign follow." },
        { t: "Made, then fitted", d: "6 to 8 weeks of making in Saumur, then fitting. Without fitting: collection from the workshop, or delivery at extra cost." },
      ],
    },
    contact: {
      h2: "A question before you design?", texte: (tel: string, horaires: string) => `You can reach the workshop on ${tel}. ${horaires}`,
      appeler: "Call the workshop", ecrire: "Write to the workshop", choisir: "To help you choose",
    },
  },
} as const;

/** Les textes avec leurs insécables (typographie.ts) : c'est ce que la page et ses deux îlots importent. */
export const TXT = typographieLangues(TXT_BRUT);
