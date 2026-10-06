// Extensions écrites en toutes lettres : le test (node --test, sans outil de
// construction) importe ce fichier tel quel.
import { RAYON_MAX_KM } from "../deplacement.ts";
import { HAUTEUR_LOI_GC_MM, SPHERE_GC_MM, SPHERE_HAUT_GC_MM, Z_ESCALADE_GC_MM, Z_SPHERE_GC_MM } from "../garde-corps.ts";
import type { Locale } from "../i18n.ts";
import { remplacerMarqueurs, verifierMarqueurs } from "../marqueurs.ts";
import { DATE_OUVERTURE_COMMANDES } from "../ouverture.ts";

/**
 * LA PAGE « GARDE-CORPS DE BALCON ET DE TERRASSE SUR MESURE »
 * (/fr et /en /garde-corps-balcon-terrasse), demandée par Quentin le 07/10/2026 :
 * balcons, terrasses, rampes d'escalier extérieur.
 *
 * Recherches visées (suggestions Google relevées le 07/10/2026) : « garde corps
 * terrasse sur mesure », « garde corps balcon sur mesure », « garde corps
 * balcon acier », « rambarde terrasse acier », « garde corps terrasse metal
 * bois », « garde corps acier main courante bois », « rampe d'escalier
 * extérieur », « rampe escalier extérieur métal », « hauteur garde corps
 * balcon », « garde corps terrasse norme hauteur », « garde corps fixation nez
 * de dalle », « garde corps pose à l'anglaise » ; EN « bespoke balcony
 * railings », « made to measure balcony railings », « bespoke steel
 * balustrade », « outdoor stair railing ». Les recherches « garde-corps
 * fenêtre » appartiennent à la fiche et au guide des normes : ni le title, ni
 * la description, ni le H1 ne les prennent (test).
 *
 * CE QUE LA PAGE NE PROMET PAS :
 * - aucun prix (sur devis) : la seule somme citée est celle de la prise de
 *   cotes, lue dans le code ({prixVisite}, src/lib/marqueurs.ts) ;
 * - pas de pose : elle demande l'assurance décennale, pas encore signée ;
 * - pas de « solidité vérifiée » : la fixation est étudiée au cas par cas ;
 * - aucun mot « artisan / artisanal » (loi 96-603, art. 21, avant
 *   l'immatriculation), ni « premium », « luxe », « certifié »…
 *
 * LES CHIFFRES DE LA RÈGLE ne sont pas tapés dans les textes : ils y sont
 * écrits {hauteur}, {boule}… et remplis par textesGcExterieur avec les valeurs
 * ci-dessous (REGLE_EXTERIEUR), chacune avec sa source. Les boules, la zone
 * basse et la hauteur de 1 m sont celles de src/lib/garde-corps.ts, comparées
 * à l'outil de plans par tests/garde-corps.test.ts.
 */

/** Les sources, relues le 07/10/2026. */
const SOURCES = {
  /** Code de la construction et de l'habitation, art. R134-59 (décret 2021-872, en vigueur depuis le 01/07/2021). */
  r134_59: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818881",
  /**
   * Révision de la NF P01-012 : présentation Apave / CAPEB du 07/11/2024 par Pierre Martin, président de la commission
   * de normalisation AFNOR P01A (diapositives 8, 12, 13, 16, 19, 24, 27). La norme elle-même est payante.
   */
  apave: "https://www.capeb.fr/www/capeb/media/somme/document/apave-presentation-webinaire-garde-corps-7-novembre-2024.pptx.pdf",
  /** Horizal, « Évolution de la norme NF P01-012 2024 / 1988 » (pages 4 à 7, 11 à 13). */
  horizal: "https://www.horizal.com/data/medias/2413/style/default/HORIZAL_NORME_NF.pdf",
  /** FFB : norme révisée en novembre 2024, applicable en janvier 2026. */
  ffb: "https://www.ffbatiment.fr/actualites-batiment/actualite-bam/norme-garde-corps-revisee-novembre-2024-applicable-janvier-2026",
  /** Code de l'urbanisme, art. R*421-17 a) : travaux qui modifient l'aspect extérieur d'un bâtiment existant. */
  r421_17: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034355355",
} as const;

/**
 * Les chiffres de la règle pour un balcon, une terrasse ou une rampe extérieure.
 * Voir aussi « Documents/Auboiacier chiffrage/norme-garde-corps-verifie.json » (hors dépôt).
 */
export const REGLE_EXTERIEUR = {
  /**
   * NF P01-012 (novembre 2024) : un élément de protection est demandé « lorsque la hauteur de chute > 1 m »
   * (SOURCES.apave, diapositive 8). Plus de 1 m, et non « dès 1 m ».
   */
  chuteMm: 1000,
  /**
   * R134-59 b) : « Les garde-corps des balcons, terrasses, galeries, loggias, doivent avoir une hauteur d'au moins un
   * mètre » (SOURCES.r134_59). La norme 2024 dit la même chose pour un garde-corps fin : h = 1,00 m quand
   * l'épaisseur E ≤ 0,25 m (SOURCES.apave, diapositive 12).
   */
  hauteurMm: HAUTEUR_LOI_GC_MM,
  /**
   * R134-59 b) : « cette hauteur peut être abaissée jusqu'à 0,80 mètre au cas où le garde-corps a plus de cinquante
   * centimètres d'épaisseur ». Même valeur dans la norme 2024 (E > 0,50 m → h = 0,80 m), qui donne des paliers
   * entre les deux (0,975 m à 0,85 m). Attention : 0,90 m n'est que le palier de 0,40 à 0,45 m d'épaisseur.
   */
  hauteurEpaisMm: 800,
  epaisseurMm: 500,
  /**
   * Les appuis où l'on peut grimper (gabarit B) : un dessus entre 0,10 et 0,60 m du sol, sur le garde-corps ou tout
   * près, et la hauteur se compte au-dessus de lui (SOURCES.apave, diapositives 13 et 27 : « plinthe de 0,60 m au
   * lieu de 0,45 m » ; SOURCES.horizal, page 7). La « zone de stationnement précaire » de 1988 n'existe plus
   * (diapositive 11).
   */
  appuiBasMm: 100,
  appuiHautMm: Z_ESCALADE_GC_MM,
  /**
   * Les vides (gabarits T1 et T2) : aucune boule de 0,11 m du sol jusqu'à 0,80 m ; de 0,80 m jusqu'en haut, aucune
   * boule de 0,18 m (SOURCES.apave, diapositive 16 ; SOURCES.horizal, pages 5 et 11). Les vides ne doivent pas
   * grandir avec le temps (diapositive 22).
   */
  bouleMm: SPHERE_GC_MM,
  bouleHautMm: SPHERE_HAUT_GC_MM,
  zoneBouleMm: Z_SPHERE_GC_MM,
  /**
   * La résistance : la norme 2024 renvoie à l'Eurocode 1 (SOURCES.apave, diapositive 19). Logement (catégorie A,
   * NF EN 1991-1-1 et annexe nationale NF P06-111-2) : 0,6 kN par mètre, appliqués à 1 m au-dessus du sol
   * (SOURCES.horizal, page 12). En newtons par mètre, pour n'écrire aucun nombre à virgule dans le code.
   */
  chargeNParM: 600,
  /** Dates d'application de la version 2024 (SOURCES.apave, diapositive 24 ; SOURCES.ffb). */
  applicationPermis: "2025-06-01",
  applicationTravaux: "2026-01-01",
} as const;

/** Un ouvrage, une étape ou un point de la règle : un titre et son texte. */
type Bloc = { titre: string; texte: string };

/** Tous les textes de la page, dans une langue. */
export type TextesGcExterieur = {
  seo: { title: string; description: string };
  /** Le nom de la page dans le fil d'Ariane. */
  fil: string;
  surtitre: string;
  h1: string;
  intro: string;
  ctaRdv: string;
  ctaContact: string;
  ouvragesTitre: string;
  ouvrages: Bloc[];
  /**
   * La porte-fenêtre (balcon français, « Juliet balcony ») n'est pas ici : elle se commande sur la fiche du
   * garde-corps de fenêtre, prix en ligne (guide des normes, « porteFenetreBody »). Une ligne de tri, avec son lien,
   * pour que le visiteur et Google sachent quelle page répond à quoi.
   */
  tri: { texte: string; lien: string };
  normesTitre: string;
  normesIntro: string;
  normes: Bloc[];
  normesDates: string;
  normesLienFenetre: string;
  matieresTitre: string;
  matieres: string[];
  matieresAlt: string;
  matieresLegende: string;
  matieresLienFiche: string;
  matieresLienBois: string;
  fixationTitre: string;
  fixation: string[];
  etapesTitre: string;
  etapes: Bloc[];
  poseTitre: string;
  pose: string;
  prixTitre: string;
  prix: string[];
  prixLienFenetre: string;
  faqTitre: string;
  faq: { q: string; r: string }[];
  finTitre: string;
  fin: string;
  /** Une ligne de plus sur la page anglaise (vide en français). */
  anglais: string;
  voirAussi: string;
  liens: { fiche: string; normes: string; bois: string; zone: string; escalier: string; soudure: string };
  service: { nom: string; type: string };
};

const FR: TextesGcExterieur = {
  seo: {
    title: "Garde-corps terrasse, balcon sur mesure",
    description:
      "Garde-corps de balcon et de terrasse, rampes d'escalier extérieur : acier soudé à la main à Saumur, main courante en acier ou en bois massif. Sur devis.",
  },
  fil: "Garde-corps de balcon et de terrasse",
  surtitre: "Balcons, terrasses, escaliers extérieurs",
  h1: "Garde-corps de balcon et de terrasse sur mesure",
  intro:
    "Un garde-corps en acier dessiné pour votre balcon, votre terrasse ou votre escalier extérieur, soudé à la main à l'atelier, à Saumur, avec une main courante en acier ou en bois massif. Nous venons voir le support et prendre les cotes, puis vous recevez un devis.",
  ctaRdv: "Réserver la prise de cotes",
  ctaContact: "Décrire mon projet",

  // « garde-corps extérieur sur mesure » : la 2e suggestion Google de « garde corps terrasse / balcon sur mesure ».
  ouvragesTitre: "Garde-corps extérieurs : balcon, terrasse, escalier",
  ouvrages: [
    {
      titre: "Garde-corps de balcon",
      texte:
        "Sur un balcon ou une loggia, le garde-corps ferme le côté vide, d'un mur à l'autre ou sur toute la longueur. Il se fixe sur la dalle, sur sa tranche ou entre les murs, selon ce que le support permet.",
    },
    {
      titre: "Garde-corps de terrasse",
      texte:
        "Terrasse surélevée ou toit-terrasse accessible : dès que la chute dépasse {chute}, il faut une protection. Nous la dessinons à la longueur de votre terrasse, angles et retours compris.",
    },
    {
      titre: "Rampe d'escalier extérieur",
      texte:
        "Le long d'un escalier extérieur : une main courante fixée au mur, ou une rampe avec son garde-corps du côté vide, qui suit la pente des marches.",
    },
  ],
  tri: {
    texte: "Devant une porte-fenêtre, le balcon français se fabrique comme un garde-corps de fenêtre, avec son prix en ligne.",
    lien: "Garde-corps de fenêtre et de porte-fenêtre",
  },

  normesTitre: "Hauteur et normes : ce que demande la règle",
  normesIntro:
    "Deux textes comptent : le Code de la construction, pour les logements neufs, et la norme NF P01-012, révisée en novembre 2024, qui est la référence technique. Nous dessinons chaque garde-corps de balcon ou de terrasse selon la version 2024, même en rénovation.",
  normes: [
    {
      titre: "Quand faut-il un garde-corps ?",
      texte:
        "La norme demande une protection dès que la hauteur de chute dépasse {chute}. Dans un logement neuf, le Code de la construction (article R134-59) impose un garde-corps aux balcons, terrasses, galeries et loggias des étages. Dans une maison existante, rien n'oblige à en ajouter un ; mais celui que l'on pose doit protéger des chutes, et c'est la norme qui sert de référence.",
    },
    {
      titre: "Quelle hauteur ?",
      texte:
        "{hauteur} au moins, depuis le sol où l'on se tient. Si le garde-corps a plus de {epaisseur} d'épaisseur — un muret large, par exemple —, la loi permet de descendre à {hauteurEpaisse} ; la norme de 2024 donne les paliers entre les deux.",
    },
    {
      titre: "Ce sur quoi un enfant peut grimper",
      texte:
        "Une traverse basse, un muret, une jardinière ou un banc fixe tout près, dont le dessus est entre {appuiBas} et {appuiHaut} du sol, compte comme un appui : la hauteur se mesure alors au-dessus de lui. C'est pourquoi le bas d'un garde-corps se ferme plutôt par des barreaux verticaux. Cette règle remplace la « zone de stationnement précaire » de la version de 1988.",
    },
    {
      titre: "Les vides entre les barres",
      texte:
        "Du sol jusqu'à {zoneBoule}, aucune boule de {boule} de diamètre ne doit passer à travers le garde-corps ; au-dessus, jusqu'à la main courante, aucune boule de {bouleHaut}. Sans tolérance, et les vides ne doivent pas s'agrandir avec le temps.",
    },
    {
      titre: "La résistance",
      texte:
        "La norme renvoie à l'Eurocode 1 : dans un logement, la main courante doit résister à une poussée de {charge} par mètre de longueur, soit environ {chargeKg} par mètre. C'est la fixation qui la reprend : voilà pourquoi elle est choisie pour votre support.",
    },
  ],
  normesDates:
    "La version 2024 s'applique aux permis de construire et déclarations préalables déposés depuis le {permis}, et aux autres travaux depuis le {travaux}.",
  normesLienFenetre: "Normes du garde-corps de fenêtre",

  matieresTitre: "Acier soudé, main courante en acier ou en bois massif",
  matieres: [
    "Le garde-corps est en acier, coupé et soudé à la main à l'atelier. Le dessin se choisit ensemble — barreaux droits, cadre et remplissage, une ligne qui répond à la façade —, et chaque version est contrôlée avec les boules de la norme avant d'être chiffrée.",
    "Dehors, l'acier est protégé contre la rouille, puis peint : la protection et la teinte se choisissent au devis.",
    "La main courante peut être en acier ou en bois massif, comme sur notre garde-corps de fenêtre : le bois est poncé et huilé à la main. Dehors, il se patine et demande un peu d'entretien ; nous en parlons au devis, selon l'exposition de votre balcon.",
  ],
  matieresAlt: "Garde-corps de fenêtre en acier noir, main courante en chêne massif, devant une façade en pierre claire",
  matieresLegende: "Notre garde-corps de fenêtre et sa main courante en chêne massif : la même alliance d'acier et de bois, pour un balcon.",
  matieresLienFiche: "Voir le garde-corps de fenêtre",
  matieresLienBois: "Le bois massif à l'atelier",

  fixationTitre: "Fixé sur la dalle ou en nez de dalle, selon votre support",
  fixation: [
    "Un garde-corps de balcon ou de terrasse se fixe de trois façons : sur le dessus de la dalle (pose à la française), sur sa tranche, en nez de dalle (pose à l'anglaise), ou entre deux murs. En nez de dalle, il laisse toute la surface libre, mais demande une tranche assez épaisse et saine.",
    "Le bon choix dépend du support — béton, pierre, bois —, de son état, de son épaisseur et de ce qu'il protège (étanchéité, isolation). Nous l'étudions au cas par cas, sur place, avant de chiffrer : la fixation est choisie pour votre support, jamais la même pour tous.",
  ],

  etapesTitre: "Comment ça se passe",
  etapes: [
    {
      titre: "Vous nous décrivez le projet",
      texte: "Quelques photos du balcon ou de la terrasse et une longueur approximative suffisent pour un premier avis.",
    },
    {
      titre: "Nous prenons les cotes chez vous",
      texte: "L'atelier vient mesurer et voir le support, dès {prixVisite}, jusqu'à {rayonMax} km de Saumur.",
    },
    {
      titre: "Vous recevez le devis",
      texte: "Un devis écrit et détaillé : dessin, matières, finition, fixation et délai.",
    },
    {
      titre: "Le garde-corps est fabriqué à vos cotes",
      texte: "Coupé, soudé et fini à l'atelier. Du premier message à la fabrication, vous parlez à celui qui soude votre garde-corps.",
    },
  ],

  poseTitre: "Et la pose ?",
  pose:
    "La pose d'un garde-corps sur un balcon ou une terrasse demande l'assurance décennale de l'atelier : elle ne sera proposée qu'une fois cette assurance signée. Les commandes ouvrent le {ouverture} ; le devis dit toujours, noir sur blanc, si la pose est comprise.",

  prixTitre: "Le prix d'un garde-corps de balcon ou de terrasse",
  prix: [
    "Sur devis. Le prix dépend de la longueur et de la hauteur, du dessin, de la main courante, de la finition, de la fixation et de l'accès au chantier.",
    "Nous ne donnons pas de prix au mètre sans avoir vu le support : c'est lui qui décide de la fixation, et la fixation compte dans le prix.",
  ],
  prixLienFenetre: "Garde-corps de fenêtre : prix en ligne",

  faqTitre: "Vos questions",
  faq: [
    {
      q: "Un garde-corps est-il obligatoire sur ma terrasse ?",
      r: "La norme NF P01-012 en demande un dès que la chute dépasse {chute}, et la loi l'impose sur les balcons et terrasses des étages d'un logement neuf. Dans une maison existante, ce n'est pas une obligation, mais c'est la norme qui dit ce qui protège vraiment.",
    },
    {
      q: "Quelle hauteur pour un garde-corps de balcon ?",
      r: "{hauteur} au moins depuis le sol du balcon, ou {hauteurEpaisse} si le garde-corps a plus de {epaisseur} d'épaisseur. Un appui sur lequel on peut grimper, entre {appuiBas} et {appuiHaut} du sol, rehausse cette hauteur d'autant.",
    },
    {
      q: "Faites-vous les rampes d'escalier extérieur ?",
      r: "Oui : une main courante fixée au mur, ou une rampe avec son garde-corps du côté vide, en acier, avec une main courante en acier ou en bois massif. La même norme s'applique le long d'un escalier ; la hauteur sur la volée et au palier est fixée au devis, selon votre escalier.",
    },
    {
      q: "La pose est-elle comprise ?",
      r: "Pas encore : la pose demande l'assurance décennale de l'atelier, et elle ne sera proposée qu'une fois celle-ci signée. Le devis dit toujours si la pose est comprise ou non.",
    },
    {
      q: "Faut-il une autorisation de la mairie ?",
      r: "Un garde-corps visible de la rue change l'aspect de la façade : une déclaration préalable peut être demandée (Code de l'urbanisme, article R*421-17), avec l'avis de l'architecte des Bâtiments de France en secteur protégé. Renseignez-vous en mairie avant de commander.",
    },
    {
      q: "Jusqu'où vous déplacez-vous ?",
      r: "L'atelier est à Saumur : nous venons prendre les cotes en Anjou, en Touraine et au-delà, jusqu'à {rayonMax} km.",
    },
  ],

  finTitre: "Parlons de votre balcon ou de votre terrasse",
  fin: "Envoyez-nous quelques photos et les longueurs approximatives, ou réservez directement la prise de cotes.",
  anglais: "",
  voirAussi: "À voir aussi",
  liens: {
    fiche: "Garde-corps de fenêtre sur mesure",
    normes: "Normes du garde-corps de fenêtre",
    bois: "Le bois massif à l'atelier",
    zone: "Zone d'intervention",
    escalier: "Escalier à limon central",
    soudure: "Réparer un garde-corps : soudure et réparations",
  },
  service: { nom: "Garde-corps de balcon et de terrasse sur mesure", type: "Garde-corps extérieur en acier" },
};

const EN: TextesGcExterieur = {
  seo: {
    title: "Bespoke balcony and terrace railings",
    // « balustrade » : le mot que tapent les Britanniques (« bespoke balustrade », « steel balustrade »).
    description:
      "Bespoke balcony and terrace railings and balustrades in hand-welded steel, made in Saumur, France, with a steel or solid wood handrail. Quoted per project.",
  },
  fil: "Balcony and terrace railings",
  surtitre: "Balconies, terraces, outdoor stairs",
  h1: "Bespoke balcony and terrace railings",
  intro:
    "A steel railing designed for your balcony, your terrace or your outdoor stairs, welded by hand in our workshop in Saumur, with a steel or solid wood handrail. We come to see the structure and take the measurements, then you receive a quote.",
  ctaRdv: "Book a measuring visit",
  ctaContact: "Describe my project",

  ouvragesTitre: "Outdoor railings and balustrades: balcony, terrace, stairs",
  ouvrages: [
    {
      titre: "Balcony railings",
      texte:
        "On a balcony or a loggia, the railing closes the open side, from wall to wall or along its full length. It is fixed on top of the slab, on its edge or between the walls, depending on what the structure allows.",
    },
    {
      titre: "Terrace railings",
      texte:
        "Raised terrace or accessible roof terrace: as soon as the drop is more than {chute}, it needs a guard. We design it to the length of your terrace, corners and returns included.",
    },
    {
      titre: "Outdoor stair railings",
      texte:
        "Along outdoor steps: a handrail fixed to the wall, or a stair rail with its balustrade on the open side, following the pitch of the steps.",
    },
  ],
  tri: {
    texte: "A Juliet balcony across a French window is made like a window railing, and priced online.",
    lien: "Juliet balcony railings",
  },

  normesTitre: "Height and French rules: what is required",
  normesIntro:
    "Two texts matter: the French Building Code, for new homes, and standard NF P01-012, revised in November 2024, which is the technical reference. We design every balcony or terrace railing to the 2024 version, renovations included.",
  normes: [
    {
      titre: "When is a railing required?",
      texte:
        "The standard calls for a guard as soon as the drop is more than {chute}. In a new home, the French Building Code (article R134-59) requires railings on upper-floor balconies, terraces, galleries and loggias. In an existing house, nothing obliges you to add one; but a railing that is fitted must protect against falls, and the standard is the reference.",
    },
    {
      titre: "How high?",
      texte:
        "At least {hauteur}, measured from the floor you stand on. If the railing is more than {epaisseur} thick — a wide low wall, for example — the law allows {hauteurEpaisse}; the 2024 standard sets the steps in between.",
    },
    {
      titre: "What a child can climb on",
      texte:
        "A low rail, a low wall, a planter or a fixed bench close by, with a top between {appuiBas} and {appuiHaut} above the floor, counts as a foothold: the height is then measured from its top. This is why the lower part of a railing is usually closed with vertical bars. This rule replaces the 1988 version's “zone de stationnement précaire”.",
    },
    {
      titre: "The gaps between the bars",
      texte:
        "From the floor up to {zoneBoule}, no sphere of {boule} in diameter may pass through the railing; above that, up to the handrail, no sphere of {bouleHaut}. No tolerance, and the gaps must not grow over time.",
    },
    {
      titre: "Strength",
      texte:
        "The standard refers to Eurocode 1: in a home, the handrail must withstand a push of {charge} per metre of length, about {chargeKg} per metre. The fixings take that load, which is why they are chosen for your structure.",
    },
  ],
  normesDates:
    "The 2024 version applies to building permits and prior declarations filed since {permis}, and to all other works since {travaux}.",
  normesLienFenetre: "Window railing rules",

  matieresTitre: "Welded steel, with a steel or solid wood handrail",
  matieres: [
    "The railing is made of steel, cut and welded by hand in the workshop. We choose the design together — straight bars, frame and infill, a line that suits the façade — and every version is checked against the standard's spheres before it is priced.",
    "Outdoors, the steel is protected against rust, then painted: the protection and the colour are chosen on the quote.",
    "The handrail can be steel or solid wood, as on our window railing: the wood is sanded and oiled by hand. Outdoors it weathers and needs a little care; we discuss it on the quote, depending on how exposed your balcony is.",
  ],
  matieresAlt: "Window railing in black steel with a solid oak handrail, in front of a pale stone façade",
  matieresLegende: "Our window railing and its solid oak handrail: the same pairing of steel and wood, for a balcony.",
  matieresLienFiche: "See the window railing",
  matieresLienBois: "Solid wood in our workshop",

  fixationTitre: "Fixed on the slab or on its edge, to suit your structure",
  fixation: [
    "A balcony or terrace railing is fixed in one of three ways: on top of the slab, on its edge (side-mounted), or between two walls. Side-mounted, it leaves the whole floor free, but it needs a slab edge that is thick and sound enough.",
    "The right choice depends on the structure — concrete, stone, timber —, its condition, its thickness and what it protects (waterproofing, insulation). We study it case by case, on site, before pricing: the fixings are chosen for your structure, never the same for everyone.",
  ],

  etapesTitre: "How it works",
  etapes: [
    {
      titre: "You describe the project",
      texte: "A few photos of the balcony or terrace and a rough length are enough for a first opinion.",
    },
    {
      titre: "We measure at your home",
      texte: "The workshop comes to measure and see the structure, from {prixVisite}, within {rayonMax} km of Saumur.",
    },
    {
      titre: "You receive the quote",
      texte: "A detailed written quote: design, materials, finish, fixings and lead time.",
    },
    {
      titre: "Your railing is made to your measurements",
      texte: "Cut, welded and finished in the workshop. From your first message to the finished piece, you deal with the person who welds your railing.",
    },
  ],

  poseTitre: "What about fitting?",
  pose:
    "Fitting a railing on a balcony or a terrace requires the workshop's ten-year building insurance (assurance décennale): fitting will only be offered once that insurance is signed. Orders open on {ouverture}; the quote always states clearly whether fitting is included.",

  prixTitre: "What a balcony or terrace railing costs",
  prix: [
    "Quoted per project. The price depends on the length and height, the design, the handrail, the finish, the fixings and access to the site.",
    "We do not give a price per metre without seeing the structure: it decides the fixings, and the fixings are part of the price.",
  ],
  prixLienFenetre: "Window railings: priced online",

  faqTitre: "Your questions",
  faq: [
    {
      q: "Does my terrace need a railing?",
      r: "Standard NF P01-012 calls for one as soon as the drop is more than {chute}, and French law requires one on upper-floor balconies and terraces of a new home. In an existing house it is not compulsory, but the standard says what really protects.",
    },
    {
      q: "How high should a balcony railing be?",
      r: "At least {hauteur} above the balcony floor, or {hauteurEpaisse} if the railing is more than {epaisseur} thick. A foothold that can be climbed on, between {appuiBas} and {appuiHaut} above the floor, raises that height by as much.",
    },
    {
      q: "Do you make outdoor stair railings?",
      r: "Yes: a handrail fixed to the wall, or a stair rail with its balustrade on the open side, in steel, with a steel or solid wood handrail. The same standard applies along stairs; the height on the flight and at the landing is set on the quote, for your stairs.",
    },
    {
      q: "Is fitting included?",
      r: "Not yet: fitting requires the workshop's ten-year building insurance, and it will only be offered once that is signed. The quote always says whether fitting is included.",
    },
    {
      q: "Do I need permission from the town hall?",
      r: "A railing visible from the street changes the look of the façade: a prior declaration (déclaration préalable) may be required under article R*421-17 of the French Planning Code, with the opinion of the Architecte des Bâtiments de France in a protected area. Check with your town hall before ordering.",
    },
    {
      q: "How far do you travel?",
      r: "The workshop is in Saumur: we come to measure across Anjou, Touraine and beyond, within {rayonMax} km.",
    },
  ],

  finTitre: "Let's talk about your balcony or terrace",
  fin: "Send us a few photos and rough lengths, or book the measuring visit straight away.",
  anglais: "English spoken.",
  voirAussi: "See also",
  liens: {
    fiche: "Bespoke window railings",
    normes: "Window railing rules",
    bois: "Solid wood in our workshop",
    zone: "Where we work",
    escalier: "Steel spine staircase",
    soudure: "Repairing a railing: welding and repairs",
  },
  service: { nom: "Bespoke balcony and terrace railings", type: "Steel outdoor railings" },
};

const TEXTES: Record<Locale, TextesGcExterieur> = { fr: FR, en: EN };

/** Les textes bruts, avec leurs {marqueurs} : pour les tests. */
export function textesBrutsGcExterieur(locale: Locale): TextesGcExterieur {
  return TEXTES[locale];
}

/** L'espace insécable entre un nombre et son unité. */
const NBSP = " ";

/** Un jour du calendrier, en toutes lettres : « lundi 7 décembre 2026 », « Monday 7 December 2026 » (aussi pour la page soudure). */
export function jourEnLettres(iso: string, locale: Locale, avecJour: boolean): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return date
    .toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      ...(avecJour ? { weekday: "long" as const } : {}),
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    })
    // « Monday, 7 December 2026 » : le site écrit « Monday 7 December 2026 », sans virgule.
    .replace(",", "");
}

/** Les valeurs des {marqueurs} propres à la page : les chiffres de la règle, le rayon, la date d'ouverture. */
export function valeursGcExterieur(locale: Locale): Record<string, string> {
  const nombre = (n: number, decimales = 0) =>
    n.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  /** En mètres : « 1 m », « 0,80 m ». */
  const metres = (mm: number) => `${nombre(mm / 1000, mm % 1000 === 0 ? 0 : 2)}${NBSP}m`;
  /** En centimètres : « 50 cm », « 11 cm ». */
  const cm = (mm: number) => `${nombre(mm / 10)}${NBSP}cm`;
  const r = REGLE_EXTERIEUR;
  // « 1er juin 2025 » en français : le premier du mois s'écrit « 1er ».
  const date = (iso: string) => jourEnLettres(iso, locale, false).replace(/^1 /, locale === "fr" ? "1er " : "1 ");
  return {
    chute: metres(r.chuteMm),
    hauteur: metres(r.hauteurMm),
    hauteurEpaisse: metres(r.hauteurEpaisMm),
    epaisseur: cm(r.epaisseurMm),
    appuiBas: cm(r.appuiBasMm),
    appuiHaut: cm(r.appuiHautMm),
    boule: cm(r.bouleMm),
    bouleHaut: cm(r.bouleHautMm),
    zoneBoule: cm(r.zoneBouleMm),
    charge: `${nombre(r.chargeNParM / 1000, 1)}${NBSP}kN`,
    // 1 kg pèse 981 centinewtons : 600 N, c'est environ 60 kg (arrondi à la dizaine).
    chargeKg: `${nombre(Math.round((r.chargeNParM * 100) / 981 / 10) * 10)}${NBSP}kg`,
    permis: date(r.applicationPermis),
    travaux: date(r.applicationTravaux),
    rayonMax: String(RAYON_MAX_KM),
    ouverture: jourEnLettres(DATE_OUVERTURE_COMMANDES, locale, true),
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
 * Les textes de la page, prêts à afficher : les chiffres de la règle remplis
 * (valeursGcExterieur), puis les marqueurs du code ({prixVisite}). Un
 * marqueur resté sans valeur fait échouer la construction de la page
 * (verifierMarqueurs) : jamais un chiffre écrit à la main à sa place.
 */
export function textesGcExterieur(locale: Locale): TextesGcExterieur {
  const textes = remplacerMarqueurs(remplirTout(TEXTES[locale], valeursGcExterieur(locale)), locale);
  verifierMarqueurs(textes, `garde-corps-balcon-terrasse (${locale})`);
  return textes;
}
