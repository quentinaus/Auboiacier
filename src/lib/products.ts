import type { Locale } from "@/lib/i18n";
import { champsMurGC, diametreRosaceGC, finitionsDecorGC, idDecorGC, idMainCouranteGC, lireDecorGC, lireMainCouranteGC, lireModeleGC, murDansLesBornes, nomDecorAnglaisGC, NOMS_MUR_FIXATION_GC, type MurFixationGC, type MurReleveGC, type ReleveGC, type StatutFixationGC } from "./garde-corps.ts";
import { DECORS_GC } from "./garde-corps-decors.genere.ts";
import { PRIX_OFFRE_CENTS, RAYON_OFFRE_KM } from "./deplacement.ts";
import { prixAffiche } from "./ui.ts";

export type ProductSize = {
  id: string;
  label: string;
  price: number;
  /** Cotes en millimètres. Une commande sur mesure à ces cotes reprend ce prix. */
  dimsMm?: [number, number];
  /** Dimension proposée d'entrée sur la fiche produit. */
  default?: boolean;
};

export type ProductSwatch = {
  id: string;
  label: string;
  /** Couleur de repli, et teinte moyenne de l'essence. */
  swatch: string;
  /** Fil du bois, en CSS : superposé à `swatch` dans la pastille. */
  grain?: string;
  /** Écart de prix par rapport à l'essence de référence, en euros. */
  priceDelta?: number;
  /** Même libellé en anglais, servi par `productLocalise`. */
  labelEn?: string;
  /** Photo du produit dans ce coloris, affichée quand on le sélectionne. */
  image?: string;
};
export type ProductSection = {
  title: string;
  body: string;
  /** Photo imposée pour ce bloc ; sinon on pioche dans la galerie. */
  image?: string;
};

/**
 * Épaisseur minimale d'un plateau en bois massif selon sa portée.
 * Les paliers sont lus dans l'ordre : le premier dont `jusquaMm` couvre la
 * longueur donne l'épaisseur mini. Le dernier sert au-delà.
 */
export type PalierEpaisseur = { jusquaMm: number; miniMm: number };

/**
 * Fabrication à la dimension exacte du client.
 * Tout est en millimètres : c'est l'unité de l'atelier, et celle qui évite les
 * malentendus (un « 2,4 » peut être 2,4 m ou 24 cm ; 2400 mm, non).
 */
export type SurMesure = {
  forme: "rect" | "rond";
  /** « plan » : un meuble (longueur × largeur). « panneau » : une surface murale. */
  axes?: "plan" | "panneau";
  /** Part fixe : cadre, toile, alimentation, montage. */
  forfait: number;
  /** Prix du mètre carré de surface lumineuse. */
  parM2: number;
  /**
   * Prix du mètre de pourtour (lumières) : le cadre, la tôle du tour, le
   * profilé de la toile et une bonne part des heures suivent le tour, pas la
   * surface. Sans lui, une petite lampe était trop chère et une grande pas assez.
   */
  parMetre?: number;
  minMm: number;
  maxLargeurMm: number;
  maxHauteurMm: number;
  /**
   * Cotes de la pièce « à partir de », pour une pièce qui n'a aucune taille au
   * catalogue : c'est le prix de ces cotes-là que la boutique annonce.
   */
  departMm?: [number, number];
  /**
   * Les cotes affichées d'entrée dans le configurateur. Un formulaire vide
   * n'apprend rien : le client voit une pièce, son prix et son dessin, puis
   * ajuste. Distinct de departMm, qui ne sert qu'au prix « à partir de ».
   * Ordre : longueur, largeur, épaisseur.
   */
  cotesParDefautMm?: [number, number, number];
  /** Épaisseur : le plateau d'une table, la profondeur du caisson d'une lumière. */
  epaisseur: {
    minMm: number;
    maxMm: number;
    /** Épaisseur de référence, celle des tailles du catalogue. */
    refMm: number;
    /** Table : chaque millimètre de plateau EN PLUS change le prix du m². */
    parM2ParMm?: number;
    /** Lumière : seule la bande d'aluminium du pourtour s'allonge. */
    parM2Bande?: number;
    /** Bois massif : épaisseur minimale imposée par la longueur de la pièce. */
    miniParLongueur?: PalierEpaisseur[];
    /**
     * Les seules épaisseurs fabriquées, quand l'atelier ne coupe qu'à
     * certaines cotes (les plateaux de table : 28, 36 ou 45 mm). Sans cette
     * liste, tout entier entre minMm et maxMm est accepté.
     */
    choixMm?: number[];
  };
};
export type ProductSpec = { label: string; value: string };

/**
 * La famille d'une pièce : c'est la section où on la trouve dans la boutique
 * (« Tables d'intérieur », « Garde-corps »…), une par métier. Les modèles
 * d'une même famille se retrouvent côte à côte, et une pièce peut renvoyer
 * vers « les autres modèles » de sa famille.
 */
export type Famille =
  | "table-interieur"
  | "table-exterieur"
  | "chaise"
  | "chaise-exterieur"
  | "escalier"
  | "garde-corps"
  | "plafond";

/**
 * Le remplissage d'un garde-corps : ce qu'il y a entre le cadre et la main
 * courante. Les croix sont celles du modèle (leur nombre, calculé par l'outil
 * de plans, suit la norme) ; le verre feuilleté peut les remplacer.
 */
export type Remplissage = {
  id: string;
  label: string;
  labelEn?: string;
  /** Supplément : un forfait, plus un prix au m² de garde-corps. */
  forfait: number;
  parM2: number;
  /** Un panneau plein, sans croix : plus de rosace à choisir ni à payer. */
  sansCroix?: boolean;
};

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  famille: Famille;
  /**
   * Cette pièce se relève avant d'être chiffrée : la fiche affiche alors le
   * bloc de cotes correspondant. « escalier » demande la hauteur à monter, le
   * recul, la trémie, et calcule les marches. « garde-corps-fenetre » demande
   * la largeur entre tableaux, la hauteur d'allège et celle de la fenêtre :
   * sa forme (hauteur, croix, carré) et son prix viennent de l'outil de plans
   * de l'atelier, calculés sur le serveur (voir prixParOutil).
   */
  releve?: "escalier" | "garde-corps-fenetre";
  /**
   * Le Garde-corps forgé à volutes (décision de Quentin, 07/10/2026) : la même fenêtre et le même calcul que le garde-corps
   * de fenêtre, mais la fiche ne vend QUE des décors à volutes (bibliothèque de styles) — jamais de croix. Le garde-corps de
   * fenêtre Rosace, lui, n'en vend aucun. L'outil de plans compte les heures d'un garde-corps à décor 65 € au lieu de 50.
   */
  decorsGC?: boolean;
  /**
   * L'atelier peut venir prendre les cotes à la place du client. Le client
   * donne son code postal ; le déplacement est offert près de Saumur, forfait
   * au-delà (voir src/lib/deplacement.ts).
   */
  priseDeCotes?: boolean;
  /**
   * L'essence servie d'entrée quand aucune n'a d'écart nul à elle seule (le
   * garde-corps : l'outil chiffre chaque essence au volume, sans écart fixe).
   */
  boisParDefaut?: string;
  /**
   * Deux ou trois mots de métier pour le titre affiché par Google.
   * Le nom d'un modèle — « Brindille », « Halo » — n'est tapé par personne :
   * ce sont « table acier chêne » et « plafond lumineux » que l'on cherche.
   */
  seoMots?: string;
  /** Le titre de la page pour Google, quand « nom — seoMots » ne dit pas ce que les gens tapent (le garde-corps : « garde-corps artisanal sur mesure »). */
  seoTitre?: string;
  /** Mots-clés propres à cette fiche, en plus de ceux du nom et de la ville. */
  motsCles?: string[];
  /**
   * Description pour Google, quand l'accroche est trop longue pour être
   * assemblée avec le prix et le suffixe de src/lib/seo.ts (155 signes
   * affichés). Sans le prix : la fiche l'ajoute elle-même, à partir du
   * catalogue, pour qu'il ne reste jamais faux ici. Absente, la fiche
   * assemble accroche + prix + suffixe.
   */
  seoDescription?: string;
  /**
   * Image de partage (Facebook, WhatsApp, LinkedIn…) au format 1200 × 630,
   * quand la première photo de la fiche ne s'y prête pas (carrée : elle se
   * ferait rogner d'un tiers). Absente, c'est la première photo qui part.
   */
  imagePartage?: string;
  /** "cart" : achetable en ligne. "quote" : uniquement sur devis (relevé de cotes, pose…). */
  orderMode: "cart" | "quote";
  /** Univers séparés : rien ne doit passer de l'un à l'autre. */
  category: "interieur" | "exterieur" | "lumiere";
  /** `bg` : couleur de fond de la photo, relevée sur ses bords. Le cadre de la
   *  galerie s'y accorde pour qu'on ne voie pas le contour du rectangle. */
  images: {
    src: string;
    alt: string;
    bg?: string;
    fit?: "cover" | "contain";
    /** Le point de la photo à garder au centre quand elle est recadrée (object-position). */
    position?: string;
    /** La prise de vue serre déjà le sujet : une marge en plus dans le cadre, pour ne pas le montrer trop gros. */
    pad?: "loose";
    /** Même prise de vue dans une autre teinte de pieds, par identifiant d'acier. */
    variants?: Record<string, string>;
    /**
     * Même prise de vue dans une autre essence de plateau, par identifiant de
     * bois — puis par teinte de pieds quand la photo en a plusieurs. Le chêne,
     * celui des photos d'origine, n'y figure pas. Les fichiers sortent de
     * scripts/recolor.py, qui ne reteinte que le plateau.
     */
    parBois?: Record<string, string | Record<string, string>>;
    /**
     * Même prise de vue pour chaque coloris (teinte de résine), par identifiant de
     * coloris — puis par teinte de pieds. Ces photos sortent de
     * scripts/table-resine.py : le plateau résine posé sur les pieds de la Table Mikado.
     */
    parColoris?: Record<string, string | Record<string, string>>;
    /* Ces fichiers portent « -vN » : à chaque nouvelle génération des photos,
       N augmente. L'optimiseur d'images garde une photo un an (voir
       next.config.mjs) : sous le même nom, il resservirait l'ancienne. */
    /** Teinte de pieds montrée par cette vignette : la cliquer la sélectionne. */
    metal?: string;
    /** Coloris (velours, teinte de résine) montré par cette vignette : la cliquer le sélectionne. */
    fabric?: string;
    /** Membrane à éclairer : le dégradé animé s'anime dans ce contour. */
    glow?: {
      box: { left: string; top: string; width: string; height: string };
      clip: string;
    };
  }[];
  sizes: ProductSize[];
  woods: ProductSwatch[];
  metals: ProductSwatch[];
  /** Coloris de velours, pour les assises garnies (ou teintes de résine, rosaces : voir fabricLabel). */
  fabrics?: ProductSwatch[];
  /** Les remplissages possibles d'un garde-corps, le premier étant celui du modèle. */
  remplissages?: Remplissage[];
  /** Remplace « Coloris du velours » quand `fabrics` sert à autre chose (les rosaces d'un garde-corps, la résine d'une table). */
  fabricLabel?: { fr: string; en: string };
  /** Remplace « Couleur des pieds » quand la pièce n'a pas de pieds. */
  metalLabel?: { fr: string; en: string };
  /** Intitulé du groupe des essences quand « plateau » ne convient pas (marches d'escalier). */
  woodLabel?: { fr: string; en: string };
  /**
   * La fiche propose de choisir comment recevoir la pièce : livraison par
   * transporteur ou livraison et pose par l'atelier (prix selon le code
   * postal, src/lib/deplacement.ts), ou retrait à l'atelier, à Saumur,
   * gratuit. Une commande qui contient une telle pièce en choisit un, et un
   * seul (vérifié par le serveur, src/lib/tarif-panier.ts).
   */
  poseOption?: boolean;
  /**
   * `poseOption` sans le choix « l'atelier livre et pose » : seule la
   * livraison par transporteur est proposée (une chaise ne se pose pas).
   */
  livraisonSeule?: boolean;
  /** Remplace le texte par défaut sous « Livraison par transporteur », quand la pièce arrive démontée d'une façon qui lui est propre. */
  livraisonInfo?: { fr: string; en: string };
  /**
   * Remplace la phrase sous « Demander un devis » (« prise de cotes à
   * domicile, pose comprise » : vrai pour l'escalier, pas pour une table).
   */
  noteDevis?: { fr: string; en: string };
  /**
   * Pièce sur devis SANS AUCUN PRIX : les formats proposés, sans tarif. Le
   * client en choisit un — ou le sur-mesure — et son choix part avec sa
   * demande de devis. Le jour où la pièce a ses prix, ces formats deviennent
   * `sizes` (mêmes identifiants, plus un `price`) et ce champ disparaît.
   * Leur libellé anglais est lu dans `en.sizes`, comme celui d'une taille.
   */
  formatsDevis?: {
    tailles: Omit<ProductSize, "price">[];
    /** Les bornes du sur-mesure, dites au client quand il le choisit. */
    surMesure?: { fr: string; en: string };
  };
  /**
   * Les écarts de prix des essences sont donnés pour un plateau de
   * SURFACE_REFERENCE_M2 (la table de 200 × 100) et suivent la surface :
   * le noyer d'une table de 3 m coûte plus que celui d'une table de 1,50 m.
   */
  boisAuM2?: boolean;
  /** Le poids du colis, en kilos, pour les pièces à poids fixe (une chaise). Les autres sont estimées par poidsColisKg. */
  colisKg?: number;
  /**
   * Intitulé du choix de taille, quand « Sur mesure, à vos cotes » ne veut rien
   * dire — sur l'escalier, ce menu choisit la FORME, pas les dimensions.
   */
  sizeLabel?: { fr: string; en: string };
  sections: ProductSection[];
  specs: ProductSpec[];
  testimonial?: { quote: string; author: string };
  /** Photos réservées aux blocs descriptifs, absentes de la galerie. */
  photosDescriptif?: { src: string; alt: string }[];
  /** Barème de la fabrication aux cotes exactes du client. */
  surMesure?: SurMesure;
  /** Traduction anglaise. Le français reste la version d'origine. */
  en?: ProductEn;
};

/**
 * Tout ce qui se lit sur une fiche produit, en anglais.
 * Les listes suivent l'ordre du produit français ; les tailles sont repérées
 * par leur identifiant, qui ne change pas d'une langue à l'autre.
 */
export type ProductEn = {
  name?: string;
  tagline?: string;
  /** Les deux ou trois mots de métier du titre, en anglais. */
  seoMots?: string;
  /** Le titre de la page pour Google, en anglais (voir Product.seoTitre). */
  seoTitre?: string;
  /** Mots-clés de la fiche, en anglais. */
  motsCles?: string[];
  /** Description pour Google, en anglais (voir Product.seoDescription). */
  seoDescription?: string;
  /** Description (alt) de chaque photo, dans l'ordre de `images`. */
  images?: string[];
  /** Libellé de chaque taille (et de chaque format sur devis), par identifiant. */
  sizes?: Record<string, string>;
  sections?: { title: string; body: string }[];
  specs?: ProductSpec[];
  /** Description (alt) des photos réservées aux blocs descriptifs. */
  photosDescriptif?: string[];
};

/* ------------------------------------------------------------------ *
 *  Essences de bois
 *  Un aplat, et rien d'autre : la teinte moyenne de l'essence, comme la
 *  plaquette d'un nuancier. Les images de fil qui servaient ici étaient
 *  calculées, et leurs veines régulières au millimètre donnaient à du chêne
 *  l'air d'un décor imprimé. La vraie matière se regarde sur les photos de
 *  l'atelier, où elle est vraie.
 *  `deltas` donne l'écart de prix par produit — un même bois ne pèse pas
 *  pareil sur une chaise et sur un escalier.
 * ------------------------------------------------------------------ */
type WoodId = "pin" | "hetre" | "chene" | "noyer";

const WOOD_GRAIN: Record<
  WoodId,
  { label: string; labelEn: string; swatch: string }
> = {
  pin: {
    label: "Pin",
    labelEn: "Pine",
    swatch: "#e0bd85",
  },
  hetre: {
    label: "Hêtre",
    labelEn: "Beech",
    swatch: "#dcc0a0",
  },
  chene: {
    label: "Chêne",
    labelEn: "Oak",
    swatch: "#c19a5e",
  },
  noyer: {
    label: "Noyer",
    labelEn: "Walnut",
    swatch: "#6b452c",
  },
};

/** Construit la liste d'essences d'un produit avec ses écarts de prix. */
function woods(deltas: Partial<Record<WoodId, number>>): ProductSwatch[] {
  return (Object.keys(deltas) as WoodId[]).map((id) => ({
    id,
    label: WOOD_GRAIN[id].label,
    labelEn: WOOD_GRAIN[id].labelEn,
    swatch: WOOD_GRAIN[id].swatch,
    priceDelta: deltas[id] ?? 0,
  }));
}

/* ------------------------------------------------------------------ *
 *  Finitions de l'acier
 *  Un aplat de la couleur, et c'est tout : un thermolaquage mat EST un
 *  aplat. Les images qui servaient ici étaient des sphères éclairées, avec
 *  leur reflet cuit dedans — c'est précisément ce qui faisait « image de
 *  synthèse » plutôt que « atelier ».
 * ------------------------------------------------------------------ */
type MetalId =
  | "noir"
  | "gris"
  | "chocolat"
  | "laiton"
  | "lin"
  | "blanc"
  | "brut";

const METAL_FINISH: Record<
  MetalId,
  { label: string; labelEn: string; swatch: string }
> = {
  noir: {
    label: "Noir charbon",
    labelEn: "Charcoal black",
    swatch: "#1c1a18",
  },
  gris: {
    label: "Gris acier",
    labelEn: "Steel grey",
    swatch: "#46453f",
  },
  chocolat: {
    label: "Chocolat",
    labelEn: "Chocolate",
    swatch: "#463831",
  },
  laiton: {
    label: "Laiton",
    labelEn: "Brass",
    swatch: "#8c7c3f",
  },
  lin: {
    label: "Lin clair",
    labelEn: "Pale linen",
    swatch: "#cfc9b6",
  },
  blanc: {
    label: "Blanc",
    labelEn: "White",
    swatch: "#f0efeb",
  },
  brut: {
    label: "Acier brut verni",
    labelEn: "Varnished raw steel",
    swatch: "#8a8578",
  },
};

/** Les teintes de pieds proposées sur les tables et les assises. */
const PIEDS: MetalId[] = [
  "noir",
  "gris",
  "chocolat",
  "laiton",
  "lin",
  "blanc",
];

/** Nuancier de pieds d'un meuble ; `images` donne la photo de chaque teinte. */
function pieds(images: Partial<Record<MetalId, string>> = {}): ProductSwatch[] {
  return PIEDS.map((id) => ({ id, ...METAL_FINISH[id], image: images[id] }));
}

/** Construit la liste des finitions acier d'un produit. */
function metals(...ids: MetalId[]): ProductSwatch[] {
  return ids.map((id) => ({ id, ...METAL_FINISH[id] }));
}

/* ------------------------------------------------------------------ *
 *  Velours d'ameublement
 *  Les références correspondent au nuancier du tissu utilisé en atelier.
 *  La couleur seule, comme chez le tapissier : la photo du fauteuil, elle,
 *  s'affiche en grand dès qu'on choisit un coloris.
 * ------------------------------------------------------------------ */

export const fabrics: ProductSwatch[] = [
  {
    id: "bleu-roi",
    label: "Bleu roi 660",
    labelEn: "Royal blue 660",
    swatch: "#304d78",
    image: "/images/chaises/bleu-roi.jpg",
  },
  {
    id: "sacramento",
    label: "Sacramento 795",
    labelEn: "Sacramento 795",
    swatch: "#365055",
    image: "/images/chaises/sacramento.jpg",
  },
  {
    id: "vert-bouteille",
    label: "Vert bouteille 775",
    labelEn: "Bottle green 775",
    swatch: "#706e3b",
    image: "/images/chaises/vert-bouteille.jpg",
  },
  {
    id: "endive",
    label: "Endive 720",
    labelEn: "Endive 720",
    swatch: "#cec68d",
    image: "/images/chaises/endive.jpg",
  },
  {
    id: "paon",
    label: "Paon 710",
    labelEn: "Peacock 710",
    swatch: "#1f5c64",
    image: "/images/chaises/paon.jpg",
  },
  {
    id: "minuit",
    label: "Minuit 690",
    labelEn: "Midnight 690",
    swatch: "#3d4563",
    image: "/images/chaises/minuit.jpg",
  },
  {
    id: "prune",
    label: "Prune 580",
    labelEn: "Plum 580",
    swatch: "#693d4d",
    image: "/images/chaises/prune.jpg",
  },
  {
    id: "vieux-rose",
    label: "Vieux rose 510",
    labelEn: "Old rose 510",
    swatch: "#915f57",
    image: "/images/chaises/vieux-rose.jpg",
  },
  {
    id: "terre-de-sienne",
    label: "Terre de Sienne 390",
    labelEn: "Burnt sienna 390",
    swatch: "#844c2c",
    image: "/images/chaises/terre-de-sienne.jpg",
  },
  {
    id: "ocre",
    label: "Ocre 350",
    labelEn: "Ochre 350",
    swatch: "#a0722c",
    image: "/images/chaises/ocre.jpg",
  },
  {
    id: "champagne",
    label: "Champagne 215",
    labelEn: "Champagne 215",
    swatch: "#bfa37b",
    image: "/images/chaises/champagne.jpg",
  },
  {
    id: "noir",
    label: "Noir 199",
    labelEn: "Black 199",
    swatch: "#454544",
    image: "/images/chaises/noir.jpg",
  },
  {
    id: "onyx",
    label: "Onyx 190",
    labelEn: "Onyx 190",
    // L'onyx tire vers le gris-bleu, le Noir 199 reste neutre : les deux
    // pastilles étaient à deux points l'une de l'autre, donc identiques à l'œil.
    swatch: "#4a4b52",
    image: "/images/chaises/onyx.jpg",
  },
  {
    id: "dune",
    label: "Dune 165",
    labelEn: "Dune 165",
    swatch: "#b99971",
    image: "/images/chaises/dune.jpg",
  },
  {
    id: "cendre",
    label: "Cendre 130",
    labelEn: "Ash 130",
    swatch: "#746a67",
    image: "/images/chaises/cendre.jpg",
  },
];

/* ------------------------------------------------------------------ *
 *  Épaisseur d'un plateau de table en chêne massif
 *  Le plateau vient d'un panneau de chêne premier choix, fabriqué à la
 *  commande en 28, 36 ou 45 mm, jusqu'à 4 500 × 1 250 mm d'un seul tenant
 *  quelle que soit l'épaisseur (c'est le fournisseur qui fixe ces bornes).
 *  Et plus la pièce est longue, plus le plateau doit être épais : c'est la
 *  portée entre les appuis qui fait fléchir le bois. 28 mm jusqu'à 1,60 m ;
 *  36 mm jusqu'à 3,60 m ; 45 mm — la cote de référence, celle des tailles du
 *  catalogue — au-delà. Quand une cote ne va pas avec l'épaisseur choisie,
 *  la fiche le dit et propose de changer l'une ou l'autre. Paliers à
 *  VALIDER par Quentin.
 * ------------------------------------------------------------------ */
const PLATEAU_CHOIX = [28, 36, 45];
const PLATEAU_MASSIF: PalierEpaisseur[] = [
  { jusquaMm: 1600, miniMm: 28 },
  { jusquaMm: 3600, miniMm: 36 },
  { jusquaMm: 4500, miniMm: 45 },
];
/**
 * Le plus grand panneau d'un seul tenant chez le fournisseur, en mm. Exportés :
 * la page /artisanat/tables les cite, sans les recopier.
 */
export const PLATEAU_MAX_LONGUEUR_MM = 4500;
export const PLATEAU_MAX_LARGEUR_MM = 1250;

const catalogue: Product[] = [
  {
    slug: "table-mikado",
    poseOption: true,
    boisAuM2: true,
    famille: "table-interieur",
    seoMots: "table acier & chêne",
    seoTitre: "Table bois massif pied Mikado acier",
    seoDescription:
      "Table à manger sur mesure : tubes d'acier croisés sous un plateau en bois massif (pin, hêtre, chêne ou noyer), fabriquée à Saumur.",
    category: "interieur",
    orderMode: "cart",
    name: "Table Mikado",
    tagline: "Des tubes d'acier croisés comme un jeu de mikado, sous un plateau de chêne massif.",
    images: [
      {
        src: "/images/mikado/devant/noir.jpg",
        alt: "Table Mikado — vue de face, pieds noir charbon",
        bg: "#ffffff",
        fit: "contain",
        metal: "noir",
        variants: {
          noir: "/images/mikado/devant/noir.jpg",
          gris: "/images/mikado/devant/gris.jpg",
          chocolat: "/images/mikado/devant/chocolat.jpg",
          laiton: "/images/mikado/devant/laiton.jpg",
          lin: "/images/mikado/devant/lin.jpg",
          blanc: "/images/mikado/devant/blanc.jpg",
        },
        parBois: {
          pin: {
            noir: "/images/mikado/devant/noir-pin-v10.jpg",
            gris: "/images/mikado/devant/gris-pin-v10.jpg",
            chocolat: "/images/mikado/devant/chocolat-pin-v10.jpg",
            laiton: "/images/mikado/devant/laiton-pin-v10.jpg",
            lin: "/images/mikado/devant/lin-pin-v10.jpg",
            blanc: "/images/mikado/devant/blanc-pin-v10.jpg",
          },
          hetre: {
            noir: "/images/mikado/devant/noir-hetre-v10.jpg",
            gris: "/images/mikado/devant/gris-hetre-v10.jpg",
            chocolat: "/images/mikado/devant/chocolat-hetre-v10.jpg",
            laiton: "/images/mikado/devant/laiton-hetre-v10.jpg",
            lin: "/images/mikado/devant/lin-hetre-v10.jpg",
            blanc: "/images/mikado/devant/blanc-hetre-v10.jpg",
          },
          noyer: {
            noir: "/images/mikado/devant/noir-noyer-v10.jpg",
            gris: "/images/mikado/devant/gris-noyer-v10.jpg",
            chocolat: "/images/mikado/devant/chocolat-noyer-v10.jpg",
            laiton: "/images/mikado/devant/laiton-noyer-v10.jpg",
            lin: "/images/mikado/devant/lin-noyer-v10.jpg",
            blanc: "/images/mikado/devant/blanc-noyer-v10.jpg",
          },
        },
      },
      {
        src: "/images/mikado/coupe/gris.jpg",
        alt: "Table Mikado — détail du plateau et des pieds gris acier",
        bg: "#ffffff",
        fit: "cover",
        metal: "gris",
        variants: {
          noir: "/images/mikado/coupe/noir.jpg",
          gris: "/images/mikado/coupe/gris.jpg",
          chocolat: "/images/mikado/coupe/chocolat.jpg",
          laiton: "/images/mikado/coupe/laiton.jpg",
          lin: "/images/mikado/coupe/lin.jpg",
          blanc: "/images/mikado/coupe/blanc.jpg",
        },
        parBois: {
          pin: {
            noir: "/images/mikado/coupe/noir-pin-v10.jpg",
            gris: "/images/mikado/coupe/gris-pin-v10.jpg",
            chocolat: "/images/mikado/coupe/chocolat-pin-v10.jpg",
            laiton: "/images/mikado/coupe/laiton-pin-v10.jpg",
            lin: "/images/mikado/coupe/lin-pin-v10.jpg",
            blanc: "/images/mikado/coupe/blanc-pin-v10.jpg",
          },
          hetre: {
            noir: "/images/mikado/coupe/noir-hetre-v10.jpg",
            gris: "/images/mikado/coupe/gris-hetre-v10.jpg",
            chocolat: "/images/mikado/coupe/chocolat-hetre-v10.jpg",
            laiton: "/images/mikado/coupe/laiton-hetre-v10.jpg",
            lin: "/images/mikado/coupe/lin-hetre-v10.jpg",
            blanc: "/images/mikado/coupe/blanc-hetre-v10.jpg",
          },
          noyer: {
            noir: "/images/mikado/coupe/noir-noyer-v10.jpg",
            gris: "/images/mikado/coupe/gris-noyer-v10.jpg",
            chocolat: "/images/mikado/coupe/chocolat-noyer-v10.jpg",
            laiton: "/images/mikado/coupe/laiton-noyer-v10.jpg",
            lin: "/images/mikado/coupe/lin-noyer-v10.jpg",
            blanc: "/images/mikado/coupe/blanc-noyer-v10.jpg",
          },
        },
      },
      {
        src: "/images/mikado/devant/laiton.jpg",
        alt: "Table Mikado — vue de face, pieds laiton",
        bg: "#ffffff",
        fit: "contain",
        metal: "laiton",
        variants: {
          noir: "/images/mikado/devant/noir.jpg",
          gris: "/images/mikado/devant/gris.jpg",
          chocolat: "/images/mikado/devant/chocolat.jpg",
          laiton: "/images/mikado/devant/laiton.jpg",
          lin: "/images/mikado/devant/lin.jpg",
          blanc: "/images/mikado/devant/blanc.jpg",
        },
        parBois: {
          pin: {
            noir: "/images/mikado/devant/noir-pin-v10.jpg",
            gris: "/images/mikado/devant/gris-pin-v10.jpg",
            chocolat: "/images/mikado/devant/chocolat-pin-v10.jpg",
            laiton: "/images/mikado/devant/laiton-pin-v10.jpg",
            lin: "/images/mikado/devant/lin-pin-v10.jpg",
            blanc: "/images/mikado/devant/blanc-pin-v10.jpg",
          },
          hetre: {
            noir: "/images/mikado/devant/noir-hetre-v10.jpg",
            gris: "/images/mikado/devant/gris-hetre-v10.jpg",
            chocolat: "/images/mikado/devant/chocolat-hetre-v10.jpg",
            laiton: "/images/mikado/devant/laiton-hetre-v10.jpg",
            lin: "/images/mikado/devant/lin-hetre-v10.jpg",
            blanc: "/images/mikado/devant/blanc-hetre-v10.jpg",
          },
          noyer: {
            noir: "/images/mikado/devant/noir-noyer-v10.jpg",
            gris: "/images/mikado/devant/gris-noyer-v10.jpg",
            chocolat: "/images/mikado/devant/chocolat-noyer-v10.jpg",
            laiton: "/images/mikado/devant/laiton-noyer-v10.jpg",
            lin: "/images/mikado/devant/lin-noyer-v10.jpg",
            blanc: "/images/mikado/devant/blanc-noyer-v10.jpg",
          },
        },
      },
      {
        src: "/images/mikado/coupe/blanc.jpg",
        alt: "Table Mikado — détail du plateau et des pieds blancs",
        bg: "#ffffff",
        fit: "cover",
        metal: "blanc",
        variants: {
          noir: "/images/mikado/coupe/noir.jpg",
          gris: "/images/mikado/coupe/gris.jpg",
          chocolat: "/images/mikado/coupe/chocolat.jpg",
          laiton: "/images/mikado/coupe/laiton.jpg",
          lin: "/images/mikado/coupe/lin.jpg",
          blanc: "/images/mikado/coupe/blanc.jpg",
        },
        parBois: {
          pin: {
            noir: "/images/mikado/coupe/noir-pin-v10.jpg",
            gris: "/images/mikado/coupe/gris-pin-v10.jpg",
            chocolat: "/images/mikado/coupe/chocolat-pin-v10.jpg",
            laiton: "/images/mikado/coupe/laiton-pin-v10.jpg",
            lin: "/images/mikado/coupe/lin-pin-v10.jpg",
            blanc: "/images/mikado/coupe/blanc-pin-v10.jpg",
          },
          hetre: {
            noir: "/images/mikado/coupe/noir-hetre-v10.jpg",
            gris: "/images/mikado/coupe/gris-hetre-v10.jpg",
            chocolat: "/images/mikado/coupe/chocolat-hetre-v10.jpg",
            laiton: "/images/mikado/coupe/laiton-hetre-v10.jpg",
            lin: "/images/mikado/coupe/lin-hetre-v10.jpg",
            blanc: "/images/mikado/coupe/blanc-hetre-v10.jpg",
          },
          noyer: {
            noir: "/images/mikado/coupe/noir-noyer-v10.jpg",
            gris: "/images/mikado/coupe/gris-noyer-v10.jpg",
            chocolat: "/images/mikado/coupe/chocolat-noyer-v10.jpg",
            laiton: "/images/mikado/coupe/laiton-noyer-v10.jpg",
            lin: "/images/mikado/coupe/lin-noyer-v10.jpg",
            blanc: "/images/mikado/coupe/blanc-noyer-v10.jpg",
          },
        },
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 1650 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 1880 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 2030 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 2310 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2600 },
    ],
    surMesure: {
      // Forfait de piétement, puis le mètre carré de plateau. Le prix au m²
      // est calé pour qu'une table aux cotes du client ne tombe jamais sous
      // le prix d'une table du catalogue plus petite. Les prix du catalogue
      // doivent rester des multiples de 10 € : c'est ce qui leur sert de
      // plafond exact pour le sur-mesure (devisSurMesure arrondit toujours
      // à la dizaine supérieure) — un prix qui n'est pas un multiple de 10
      // laisserait passer une pièce sur mesure plus chère que le catalogue.
      // Prix conseillés du chiffrage du 27/09/2026 (prix des artisans
      // comparables, même marge à toutes les tailles). La livraison et la pose
      // restent facturées à part.
      forme: "rect",
      axes: "plan",
      forfait: 1140,
      parM2: 410,
      minMm: 800,
      maxLargeurMm: PLATEAU_MAX_LONGUEUR_MM,
      maxHauteurMm: PLATEAU_MAX_LARGEUR_MM,
      epaisseur: {
        // Trois épaisseurs au choix : 28, 36 ou 45 mm, 45 au catalogue.
        minMm: 28,
        maxMm: 45,
        refMm: 45,
        choixMm: PLATEAU_CHOIX,
        // Chaque millimètre d'écart avec 45 mm se paie au mètre carré, en plus
        // ou en moins : un plateau plus fin utilise vraiment moins de bois.
        parM2ParMm: 2,
        // Et le plateau doit s'épaissir avec la longueur.
        miniParLongueur: PLATEAU_MASSIF,
      },
    },
    woods: woods({ pin: -257, hetre: -146, chene: 0, noyer: 332 }),
    metals: pieds(),
    // La table chez quelqu'un : la photo d'ambiance du bloc descriptif.
    photosDescriptif: [
      {
        src: "/images/mikado/ambiance.jpg",
        alt: "Table Mikado en noyer et chaises en velours vert dans une salle à manger aux murs de pierre",
      },
    ],
    sections: [
      {
        title: "Un piétement en tube d'acier 80 × 80 mm",
        image: "/images/mikado/ambiance.jpg",
        body: "Des tubes d'acier de 80 × 80 mm, paroi 3 mm, se croisent sous le plateau comme un jeu de mikado. Chaque appui semble posé au hasard ; l'équilibre est calculé. Le piétement est soudé d'une seule pièce à l'atelier, non démontable, sans vis apparente, puis peint dans la teinte de votre choix.",
      },
      {
        title: "Un plateau de chêne premier choix",
        body: "Notre plateau de référence est en chêne français premier choix, issu de forêts gérées durablement. Des lames larges, d'une seule pièce sur toute la longueur, choisies et assemblées à la main pour que le veinage et la teinte se répondent : ni nœud, ni aubier. Huilé plutôt que verni, le bois garde son toucher et se patine avec les années ; une marque se rattrape au papier fin, sur la zone touchée seulement. Hêtre, noyer et pin suivent la même exigence.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Pin, hêtre, chêne ou noyer massif, épaisseur 28, 36 ou 45 mm (45 mm au catalogue), finition huile-cire" },
      { label: "Piétement", value: "Tube d'acier 80 × 80 mm, paroi 3 mm, soudé d'une seule pièce, finition peinte mate" },
      { label: "Capacité", value: "6 à 14 places selon le format" },
      { label: "Fabrication", value: "Sur commande — comptez 6 à 8 semaines" },
      { label: "Livraison", value: "Partout en France, par transporteur, 90 € au maximum ; ou livrée et posée par l'atelier" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Mikado Table",
      seoMots: "steel & oak table",
      seoTitre: "Solid wood table, Mikado steel base",
      seoDescription:
        "Made-to-measure dining table: crossed steel tubes under a solid wood top (pine, beech, oak or walnut), made in Saumur, France.",
      tagline: "Steel tubes crossed like pick-up sticks, under a solid oak top.",
      images: [
        "Mikado table — front view, charcoal black legs",
        "Mikado table — close-up of the top and steel grey legs",
        "Mikado table — front view, brass legs",
        "Mikado table — close-up of the top and white legs",
      ],
      photosDescriptif: [
        "Mikado table in walnut with green velvet chairs in a stone-walled dining room",
      ],
      sizes: {
        p6: "Seats 6 — 150 × 90 × H 75 cm",
        p8: "Seats 8 — 200 × 100 × H 75 cm",
        p10: "Seats 10 — 240 × 100 × H 75 cm",
        p12: "Seats 12 — 300 × 100 × H 75 cm",
        p14: "Seats 14 — 350 × 110 × H 75 cm",
      },
      sections: [
        {
          title: "A base in 80 × 80 mm steel tube",
          body: "Steel tubes of 80 × 80 mm, 3 mm wall, cross under the top like a game of pick-up sticks. Every leg looks dropped at random; the balance is worked out. The base is welded in one piece in the workshop, not dismountable, with no visible screw, then painted in the colour of your choice.",
        },
        {
          title: "A first-grade oak top",
          body: "Our reference top is French first-grade oak from sustainably managed forests. Wide boards, each running the full length in a single piece, are selected and matched by hand so grain and colour answer each other: no knots, no sapwood. Oiled rather than varnished, the wood keeps its touch and gains a patina over the years; a mark comes out with fine sandpaper, on that spot alone. Beech, walnut and pine are made to the same standard.",
        },
      ],
      specs: [
        { label: "Top", value: "Solid pine, beech, oak or walnut, 28, 36 or 45 mm thick (45 mm for catalogue sizes), hardwax oil finish" },
        { label: "Base", value: "80 × 80 mm steel tube, 3 mm wall, welded in one piece, matt painted finish" },
        { label: "Seats", value: "6 to 14 depending on size" },
        { label: "Lead time", value: "Made to order — allow 6 to 8 weeks" },
        { label: "Delivery", value: "Anywhere in mainland France by carrier, €90 at most; or delivered and fitted by the workshop" },
      ],
    },
  },
  {
    slug: "table-croix",
    poseOption: true,
    boisAuM2: true,
    famille: "table-interieur",
    seoMots: "table acier & chêne",
    seoTitre: "Table bois massif pied croix acier",
    category: "interieur",
    orderMode: "cart",
    name: "Table Croix",
    tagline: "Deux tubes d'acier en X à chaque bout du plateau, et toute la place pour les jambes.",
    images: [
      {
        src: "/images/table-croix-bout-v2.jpg",
        alt: "Table Croix : plateau en chêne massif sur deux piétements acier noir en X, vue de bout",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-bout-v2-pin-v10.jpg",
          hetre: "/images/table-croix-bout-v2-hetre-v10.jpg",
          noyer: "/images/table-croix-bout-v2-noyer-v10.jpg",
        },
      },
      {
        src: "/images/table-croix-soudure-v1.jpg",
        alt: "Table Croix, gros plan sur le X d'acier : le cordon de soudure au croisement des lames, sous le plateau",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-soudure-v1-pin-v10.jpg",
          hetre: "/images/table-croix-soudure-v1-hetre-v10.jpg",
          noyer: "/images/table-croix-soudure-v1-noyer-v10.jpg",
        },
      },
      {
        src: "/images/table-croix-cote-v2.jpg",
        alt: "Table Croix vue de côté : les deux X d'acier noir sous le long plateau de chêne",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-cote-v2-pin-v10.jpg",
          hetre: "/images/table-croix-cote-v2-hetre-v10.jpg",
          noyer: "/images/table-croix-cote-v2-noyer-v10.jpg",
        },
      },
      {
        src: "/images/table-croix-detail-v1.jpg",
        alt: "Table Croix, détail : l'angle du plateau de chêne et le X d'acier noir qui le porte",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-detail-v1-pin-v10.jpg",
          hetre: "/images/table-croix-detail-v1-hetre-v10.jpg",
          noyer: "/images/table-croix-detail-v1-noyer-v10.jpg",
        },
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 1670 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 1870 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 1990 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 2230 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2500 },
    ],
    surMesure: {
      // Forfait de piétement, puis le mètre carré de plateau. Le prix au m²
      // est calé pour qu'une table aux cotes du client ne tombe jamais sous
      // le prix d'une table du catalogue plus petite. Les prix du catalogue
      // doivent rester des multiples de 10 € (voir table-mikado).
      // Prix conseillés du chiffrage du 27/09/2026 (prix des artisans
      // comparables, même marge à toutes les tailles). La livraison et la pose
      // restent facturées à part.
      forme: "rect",
      axes: "plan",
      forfait: 1240,
      parM2: 335,
      minMm: 800,
      maxLargeurMm: PLATEAU_MAX_LONGUEUR_MM,
      maxHauteurMm: PLATEAU_MAX_LARGEUR_MM,
      epaisseur: {
        // Trois épaisseurs au choix : 28, 36 ou 45 mm, 45 au catalogue.
        minMm: 28,
        maxMm: 45,
        refMm: 45,
        choixMm: PLATEAU_CHOIX,
        // Chaque millimètre d'écart avec 45 mm se paie au mètre carré, en plus
        // ou en moins : un plateau plus fin utilise vraiment moins de bois.
        parM2ParMm: 2,
        // Et le plateau doit s'épaissir avec la longueur.
        miniParLongueur: PLATEAU_MASSIF,
      },
    },
    woods: woods({ pin: -257, hetre: -146, chene: 0, noyer: 332 }),
    metals: pieds(),
    sections: [
      {
        title: "Un X soudé puis meulé",
        body: "Deux tubes d'acier de 80 × 80 mm, paroi 3 mm, se croisent sous chaque bout du plateau et rejoignent le sol d'une seule pièce. La croix est soudée à plat puis meulée : le raccord disparaît, il ne reste qu'un trait net sous la table.",
      },
      {
        title: "De la place pour les jambes",
        body: "Les appuis sont repoussés vers les extrémités : on s'assoit au milieu sans buter dans un pied. C'est la table des longues tablées, celle qui accepte une chaise de plus au dernier moment.",
      },
      {
        title: "Un plateau de chêne premier choix",
        body: "Notre plateau de référence est en chêne français premier choix, issu de forêts gérées durablement. Des lames larges, d'une seule pièce sur toute la longueur, choisies et assemblées à la main pour que le veinage et la teinte se répondent : ni nœud, ni aubier. Huilé plutôt que verni, le bois garde son toucher et se patine avec les années ; une marque se rattrape au papier fin, sur la zone touchée seulement. Hêtre, noyer et pin suivent la même exigence.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Pin, hêtre, chêne ou noyer massif, épaisseur 28, 36 ou 45 mm (45 mm au catalogue), finition huile-cire" },
      { label: "Piétement", value: "Tube d'acier 80 × 80 mm, paroi 3 mm, soudé d'une seule pièce, finition peinte mate" },
      { label: "Capacité", value: "6 à 14 places selon le format" },
      { label: "Fabrication", value: "Sur commande — comptez 6 à 8 semaines" },
      { label: "Livraison", value: "Partout en France, par transporteur, 90 € au maximum ; ou livrée et posée par l'atelier" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Croix Table",
      seoMots: "steel & oak table",
      seoTitre: "Solid wood table, steel X base",
      tagline: "Two steel tubes in an X at each end of the top, and room for everyone's legs.",
      images: [
        "Croix table: solid oak top on two black steel X bases, end view",
        "Croix table, close-up of the steel X: the weld seam where the blades cross, under the top",
        "Croix table from the side: the two black steel Xs under the long oak top",
        "Croix table, detail: the corner of the oak top and the black steel X that carries it",
      ],
      sizes: {
        p6: "Seats 6 — 150 × 90 × H 75 cm",
        p8: "Seats 8 — 200 × 100 × H 75 cm",
        p10: "Seats 10 — 240 × 100 × H 75 cm",
        p12: "Seats 12 — 300 × 100 × H 75 cm",
        p14: "Seats 14 — 350 × 110 × H 75 cm",
      },
      sections: [
        {
          title: "An X welded, then ground back",
          body: "Two steel tubes of 80 × 80 mm, 3 mm wall, cross under each end of the top and meet the floor as a single piece. The cross is welded flat, then ground back: the joint disappears and only a clean line remains under the table.",
        },
        {
          title: "Room for your legs",
          body: "The feet are pushed out to the ends: you sit in the middle without knocking into anything. This is the table for long gatherings, the one that takes one more chair at the last minute.",
        },
        {
          title: "A first-grade oak top",
          body: "Our reference top is French first-grade oak from sustainably managed forests. Wide boards, each running the full length in a single piece, are selected and matched by hand so grain and colour answer each other: no knots, no sapwood. Oiled rather than varnished, the wood keeps its touch and gains a patina over the years; a mark comes out with fine sandpaper, on that spot alone. Beech, walnut and pine are made to the same standard.",
        },
      ],
      specs: [
        { label: "Top", value: "Solid pine, beech, oak or walnut, 28, 36 or 45 mm thick (45 mm for catalogue sizes), hardwax oil finish" },
        { label: "Base", value: "80 × 80 mm steel tube, 3 mm wall, welded in one piece, matt painted finish" },
        { label: "Seats", value: "6 to 14 depending on size" },
        { label: "Lead time", value: "Made to order — allow 6 to 8 weeks" },
        { label: "Delivery", value: "Anywhere in mainland France by carrier, €90 at most; or delivered and fitted by the workshop" },
      ],
    },
  },
  {
    slug: "table-brindille",
    poseOption: true,
    boisAuM2: true,
    famille: "table-interieur",
    seoMots: "table acier & chêne",
    seoTitre: "Table Brindille, bois massif et acier",
    category: "interieur",
    orderMode: "cart",
    name: "Table Brindille",
    tagline: "Un bouquet de tiges d'acier cintrées une à une, sous un plateau qui semble flotter.",
    images: [
      {
        src: "/images/table-brindille.jpg",
        alt: "Table Brindille : plateau en chêne massif sur un bouquet de tiges d'acier cintrées, vue de face",
        bg: "#ffffff",
        fit: "contain",
      },
      {
        src: "/images/salle-plafond-mikado.jpg",
        alt: "Table Brindille dans une pièce à vivre, sous un plafond lumineux à toile tendue",
        bg: "#776c5c",
        fit: "cover",
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 1850 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 2070 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 2210 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 2460 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2750 },
    ],
    surMesure: {
      // Forfait de piétement, puis le mètre carré de plateau. Le prix au m²
      // est calé pour qu'une table aux cotes du client ne tombe jamais sous
      // le prix d'une table du catalogue plus petite. Le bouquet de tiges
      // demande bien plus d'heures qu'un autre piétement : plus cher au
      // forfait, quelle que soit la taille du plateau. Les prix du catalogue
      // doivent rester des multiples de 10 € (voir table-mikado).
      // Prix conseillés du chiffrage du 27/09/2026 (prix des artisans
      // comparables, même marge à toutes les tailles). La livraison et la pose
      // restent facturées à part.
      forme: "rect",
      axes: "plan",
      forfait: 1390,
      parM2: 367,
      minMm: 800,
      maxLargeurMm: PLATEAU_MAX_LONGUEUR_MM,
      maxHauteurMm: PLATEAU_MAX_LARGEUR_MM,
      epaisseur: {
        // Trois épaisseurs au choix : 28, 36 ou 45 mm, 45 au catalogue.
        minMm: 28,
        maxMm: 45,
        refMm: 45,
        choixMm: PLATEAU_CHOIX,
        // Chaque millimètre d'écart avec 45 mm se paie au mètre carré, en plus
        // ou en moins : un plateau plus fin utilise vraiment moins de bois.
        parM2ParMm: 2,
        // Et le plateau doit s'épaissir avec la longueur.
        miniParLongueur: PLATEAU_MASSIF,
      },
    },
    woods: woods({ pin: -257, hetre: -146, chene: 0, noyer: 332 }),
    metals: pieds(),
    sections: [
      {
        title: "Un bouquet de tiges sous le plateau",
        body: "Des tiges d'acier fines partent du sol et se rejoignent sous le plateau comme un bouquet de brindilles. De loin, le plateau paraît flotter ; de près, on voit chaque soudure, faite une par une à l'atelier.",
      },
      {
        title: "Léger à l'œil, stable au sol",
        body: "Les appuis, nombreux, répartissent la charge : la table ne bouge pas, même chargée. Chaque tige est cintrée puis ajustée à la main ; aucun piétement n'est tout à fait identique à un autre.",
      },
      {
        title: "Un plateau de chêne premier choix",
        body: "Notre plateau de référence est en chêne français premier choix, issu de forêts gérées durablement. Des lames larges, d'une seule pièce sur toute la longueur, choisies et assemblées à la main pour que le veinage et la teinte se répondent : ni nœud, ni aubier. Huilé plutôt que verni, le bois garde son toucher et se patine avec les années ; une marque se rattrape au papier fin, sur la zone touchée seulement. Hêtre, noyer et pin suivent la même exigence.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Pin, hêtre, chêne ou noyer massif, épaisseur 28, 36 ou 45 mm (45 mm au catalogue), finition huile-cire" },
      { label: "Piétement", value: "Tiges d'acier soudées une à une, finition peinte mate" },
      { label: "Capacité", value: "6 à 14 places selon le format" },
      { label: "Fabrication", value: "Sur commande — comptez 6 à 8 semaines" },
      { label: "Livraison", value: "Partout en France, par transporteur, 90 € au maximum ; ou livrée et posée par l'atelier" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Brindille Table",
      seoMots: "steel & oak table",
      seoTitre: "Brindille table, solid wood and steel",
      tagline: "A bunch of steel rods bent one by one, under a top that seems to float.",
      images: [
        "Brindille table: solid oak top on a bunch of bent steel rods, front view",
        "Brindille table in a living room, under a backlit stretch ceiling",
      ],
      sizes: {
        p6: "Seats 6 — 150 × 90 × H 75 cm",
        p8: "Seats 8 — 200 × 100 × H 75 cm",
        p10: "Seats 10 — 240 × 100 × H 75 cm",
        p12: "Seats 12 — 300 × 100 × H 75 cm",
        p14: "Seats 14 — 350 × 110 × H 75 cm",
      },
      sections: [
        {
          title: "A bunch of rods under the top",
          body: "Slender steel rods rise from the floor and gather under the top like a bunch of twigs. From across the room the top seems to float; up close you can see every weld, made one at a time in the workshop.",
        },
        {
          title: "Light to the eye, steady on the floor",
          body: "The many points of contact spread the load: the table does not budge, even fully laid. Each rod is bent and then fitted by hand; no two bases are quite alike.",
        },
        {
          title: "A first-grade oak top",
          body: "Our reference top is French first-grade oak from sustainably managed forests. Wide boards, each running the full length in a single piece, are selected and matched by hand so grain and colour answer each other: no knots, no sapwood. Oiled rather than varnished, the wood keeps its touch and gains a patina over the years; a mark comes out with fine sandpaper, on that spot alone. Beech, walnut and pine are made to the same standard.",
        },
      ],
      specs: [
        { label: "Top", value: "Solid pine, beech, oak or walnut, 28, 36 or 45 mm thick (45 mm for catalogue sizes), hardwax oil finish" },
        { label: "Base", value: "Steel rods welded one by one, matt painted finish" },
        { label: "Seats", value: "6 to 14 depending on size" },
        { label: "Lead time", value: "Made to order — allow 6 to 8 weeks" },
        { label: "Delivery", value: "Anywhere in mainland France by carrier, €90 at most; or delivered and fitted by the workshop" },
      ],
    },
  },
  {
    slug: "table-resine-mikado",
    /*
     * PRIX (05/10/2026) : calculés par le tableur « Chiffrage Auboiacier.xlsx » (Pièces 635-693) et l'outil de plans
     * (modèle « resine ») : même pied que la Table Mikado, plateau de chêne de récupération noyé dans 40 % de résine
     * Epodex ECO MAX. Prix plancher arrondi (ton heure à 50 €), sous les tables rivière des artisans (2 600 à 3 050 € en
     * 200 × 100). Sur mesure : 1 340 € + 640 €/m², jamais sous le prix plancher (contrôlé de 80 × 80 à 450 × 125).
     */
    poseOption: true,
    boisAuM2: true,
    famille: "table-interieur",
    seoMots: "chêne massif",
    // « Table rivière » : c'est ainsi qu'on cherche une table à coulée de résine.
    seoTitre: "Table rivière époxy et chêne massif",
    seoDescription:
      "Table rivière : une coulée de résine époxy dans un plateau de chêne massif, sur piétement Mikado en acier. Fabriquée à Saumur (49).",
    category: "interieur",
    orderMode: "cart",
    name: "Table Résine Époxy Mikado",
    tagline: "Une rivière de résine époxy dans un plateau de chêne massif, sur le piétement Mikado.",
    // Les quatre rendus ont le cadrage des photos « coupe » de la table
    // Mikado : fond blanc de studio, la table remplit le cadre. Le recadrage
    // garde la rivière et son chant en vue (position), même sur un écran
    // presque carré. Chaque vignette sélectionne sa teinte de résine.
    images: [
      {
        src: "/images/table-resine/devant/noir-bleu-paillettes-or-v1.jpg",
        alt: "Table résine époxy Mikado — vue de face : plateau de chêne massif traversé d'une rivière de résine, piétement Mikado",
        bg: "#ffffff",
        fit: "contain",
        parColoris: {
          "rouge": {
            noir: "/images/table-resine/devant/noir-rouge-v1.jpg",
            gris: "/images/table-resine/devant/gris-rouge-v1.jpg",
            chocolat: "/images/table-resine/devant/chocolat-rouge-v1.jpg",
            laiton: "/images/table-resine/devant/laiton-rouge-v1.jpg",
            lin: "/images/table-resine/devant/lin-rouge-v1.jpg",
            blanc: "/images/table-resine/devant/blanc-rouge-v1.jpg",
          },
          "or-nacre": {
            noir: "/images/table-resine/devant/noir-or-nacre-v1.jpg",
            gris: "/images/table-resine/devant/gris-or-nacre-v1.jpg",
            chocolat: "/images/table-resine/devant/chocolat-or-nacre-v1.jpg",
            laiton: "/images/table-resine/devant/laiton-or-nacre-v1.jpg",
            lin: "/images/table-resine/devant/lin-or-nacre-v1.jpg",
            blanc: "/images/table-resine/devant/blanc-or-nacre-v1.jpg",
          },
          "turquoise": {
            noir: "/images/table-resine/devant/noir-turquoise-v1.jpg",
            gris: "/images/table-resine/devant/gris-turquoise-v1.jpg",
            chocolat: "/images/table-resine/devant/chocolat-turquoise-v1.jpg",
            laiton: "/images/table-resine/devant/laiton-turquoise-v1.jpg",
            lin: "/images/table-resine/devant/lin-turquoise-v1.jpg",
            blanc: "/images/table-resine/devant/blanc-turquoise-v1.jpg",
          },
          "bleu-paillettes-or": {
            noir: "/images/table-resine/devant/noir-bleu-paillettes-or-v1.jpg",
            gris: "/images/table-resine/devant/gris-bleu-paillettes-or-v1.jpg",
            chocolat: "/images/table-resine/devant/chocolat-bleu-paillettes-or-v1.jpg",
            laiton: "/images/table-resine/devant/laiton-bleu-paillettes-or-v1.jpg",
            lin: "/images/table-resine/devant/lin-bleu-paillettes-or-v1.jpg",
            blanc: "/images/table-resine/devant/blanc-bleu-paillettes-or-v1.jpg",
          },
        },
      },
      {
        src: "/images/table-resine/rouge-v1.jpg",
        alt: "Table résine époxy Mikado : rivière de résine rouge dans un plateau de chêne massif, piétement acier noir",
        bg: "#ffffff",
        fit: "cover",
        position: "65% 50%",
        fabric: "rouge",
      },
      {
        src: "/images/table-resine/or-nacre-v1.jpg",
        alt: "Table résine époxy Mikado : rivière de résine or nacré semée de paillettes d'or, plateau de chêne massif",
        bg: "#ffffff",
        fit: "cover",
        position: "65% 50%",
        fabric: "or-nacre",
      },
      {
        src: "/images/table-resine/turquoise-v1.jpg",
        alt: "Table résine époxy Mikado : rivière de résine turquoise entre les bords naturels du chêne, piétement acier noir",
        bg: "#ffffff",
        fit: "cover",
        position: "65% 50%",
        fabric: "turquoise",
      },
      {
        src: "/images/table-resine/bleu-paillettes-or-v1.jpg",
        alt: "Table résine époxy Mikado : rivière de résine bleue semée de paillettes d'or, plateau de chêne massif",
        bg: "#ffffff",
        fit: "cover",
        position: "65% 50%",
        fabric: "bleu-paillettes-or",
      },
      {
        src: "/images/table-resine/ambiance-bleu-blanc-v1.jpg",
        alt: "Table résine époxy Mikado dans un salon : rivière de résine bleue, piétement blanc",
        bg: "#d9d5cf",
        fit: "cover",
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 2160 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 2540 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 2770 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 3170 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 3670 },
    ],
    surMesure: {
      forme: "rect",
      axes: "plan",
      forfait: 1340,
      parM2: 640,
      minMm: 800,
      maxLargeurMm: PLATEAU_MAX_LONGUEUR_MM,
      maxHauteurMm: PLATEAU_MAX_LARGEUR_MM,
      epaisseur: {
        // Plateau coulé : 45 mm fini seulement.
        minMm: 45,
        maxMm: 45,
        refMm: 45,
        choixMm: [45],
        parM2ParMm: 10,
        miniParLongueur: PLATEAU_MASSIF,
      },
    },
    woods: woods({ chene: 0 }),
    metals: pieds(),
    fabricLabel: { fr: "Couleur de la résine", en: "Resin colour" },
    // Couleurs relevées sur les photos, à l'œil : la pastille du nuancier.
    fabrics: [
      {
        id: "bleu-paillettes-or",
        label: "Bleu et paillettes d'or",
        labelEn: "Blue with gold flakes",
        swatch: "#1d3a80",
        image: "/images/table-resine/bleu-paillettes-or-v1.jpg",
      },
      {
        id: "rouge",
        label: "Rouge",
        labelEn: "Red",
        swatch: "#6e1f27",
        image: "/images/table-resine/rouge-v1.jpg",
      },
      {
        id: "or-nacre",
        label: "Or nacré",
        labelEn: "Pearl gold",
        swatch: "#d5c193",
        image: "/images/table-resine/or-nacre-v1.jpg",
      },
      {
        id: "turquoise",
        label: "Turquoise",
        labelEn: "Turquoise",
        swatch: "#2f7d88",
        image: "/images/table-resine/turquoise-v1.jpg",
      },
    ],
    sections: [
      {
        title: "Une table rivière : la résine coule dans le chêne",
        body: "Le plateau est en chêne massif. Une rivière de résine époxy le traverse d'un bout à l'autre, coulée à l'atelier dans la teinte de votre choix : rouge, or nacré, turquoise, ou bleu semé de paillettes d'or. Le fil du bois et les reflets de la résine changent d'une table à l'autre : chaque plateau est unique.",
      },
      {
        title: "Le piétement Mikado, dans la teinte de votre choix",
        body: "Le même piétement que notre table Mikado : des tubes d'acier de 80 × 80 mm, paroi 3 mm, croisés sous le plateau comme un jeu de mikado. Il est soudé d'une seule pièce à l'atelier, puis peint en noir charbon mat.",
      },
      {
        title: "Sur devis, à vos mesures",
        body: "Choisissez la teinte de la résine et le format — de 6 à 14 places, ou à vos cotes jusqu'à 450 × 125 cm — puis demandez votre devis. Nous vous répondons avec le prix, le délai de fabrication et la livraison.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Chêne massif, traversé d'une rivière de résine époxy coulée à l'atelier" },
      { label: "Résine", value: "Quatre teintes : rouge, or nacré, turquoise, bleu et paillettes d'or" },
      { label: "Piétement", value: "Piétement Mikado : tube d'acier 80 × 80 mm, paroi 3 mm, soudé d'une seule pièce, peint mat — six teintes au choix" },
      { label: "Dimensions", value: "6 à 14 places, de 150 × 90 à 350 × 110 cm (H 75 cm), ou sur mesure jusqu'à 450 × 125 cm" },
      { label: "Fabrication", value: "Sur commande — délai confirmé avec le devis" },
      { label: "Livraison", value: "Partout en France, par transporteur, 90 € au maximum ; ou livrée et posée par l'atelier" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Mikado Epoxy Resin Table",
      seoMots: "solid oak",
      seoTitre: "Epoxy river table in solid oak",
      seoDescription:
        "River table: a pour of epoxy resin through a solid oak top, on a Mikado steel base. Made in Saumur, France.",
      tagline: "A river of epoxy resin through a solid oak top, on the Mikado steel base.",
      images: [
        "Mikado epoxy resin table — front view: solid oak top with a river of resin, Mikado base",
        "Mikado epoxy resin table: red resin river through a solid oak top, black steel base",
        "Mikado epoxy resin table: pearl gold resin river scattered with gold flakes, solid oak top",
        "Mikado epoxy resin table: turquoise resin river between the natural edges of the oak, black steel base",
        "Mikado epoxy resin table: blue resin river scattered with gold flakes, solid oak top",
        "Mikado epoxy resin table in a living room: blue resin river, white base",
      ],
      sizes: {
        p6: "Seats 6 — 150 × 90 × H 75 cm",
        p8: "Seats 8 — 200 × 100 × H 75 cm",
        p10: "Seats 10 — 240 × 100 × H 75 cm",
        p12: "Seats 12 — 300 × 100 × H 75 cm",
        p14: "Seats 14 — 350 × 110 × H 75 cm",
      },
      sections: [
        {
          title: "A river table: resin flowing through the oak",
          body: "The top is solid oak. A river of epoxy resin runs through it from end to end, poured in the workshop in the colour of your choice: red, pearl gold, turquoise, or blue scattered with gold flakes. The grain of the wood and the sheen of the resin change from one table to the next: every top is one of a kind.",
        },
        {
          title: "The Mikado base, in the colour you choose",
          body: "The same base as our Mikado table: 80 × 80 mm steel tubes, 3 mm wall, crossed under the top like a game of pick-up sticks. It is welded in one piece in the workshop, then painted matt charcoal black.",
        },
        {
          title: "On quotation, to your size",
          body: "Choose the resin colour and the size — seats 6 to 14, or your own dimensions up to 450 × 125 cm — then request your quote. We reply with the price, the lead time and the delivery.",
        },
      ],
      specs: [
        { label: "Top", value: "Solid oak with a river of epoxy resin poured in the workshop" },
        { label: "Resin", value: "Four colours: red, pearl gold, turquoise, blue with gold flakes" },
        { label: "Base", value: "Mikado base: 80 × 80 mm steel tube, 3 mm wall, welded in one piece, matt paint — six colours to choose from" },
        { label: "Dimensions", value: "Seats 6 to 14, from 150 × 90 to 350 × 110 cm (H 75 cm), or made to measure up to 450 × 125 cm" },
        { label: "Lead time", value: "Made to order — lead time confirmed with the quote" },
        { label: "Delivery", value: "Anywhere in mainland France by carrier, €90 at most; or delivered and fitted by the workshop" },
      ],
    },
  },
  {
    slug: "escalier-limon-central",
    famille: "escalier",
    seoMots: "escalier acier",
    seoTitre: "Escalier limon central acier et bois",
    seoDescription:
      "Escalier à limon central acier, marches en bois massif, droit, quart tournant ou demi-tournant. Fabriqué et posé depuis Saumur.",
    releve: "escalier",
    category: "interieur",
    // Sur devis, toujours — mais l'atelier peut venir prendre les cotes,
    // comme pour le garde-corps : la visite se paie en ligne, le devis suit.
    orderMode: "quote",
    priseDeCotes: true,
    name: "Escalier Limon Central",
    tagline: "Limon acier cintré, marches chêne massif, garde-corps à câbles.",
    images: [
      {
        src: "/images/escalier/limon-droit.jpg",
        alt: "Escalier droit à limon central acier, marches en chêne massif et garde-corps acier à lisses horizontales, dans une pièce aux murs chaulés",
        bg: "#e6e0d6",
        fit: "cover",
        // L'escalier est à droite de la photo : le recadrage le garde au centre.
        position: "88% 50%",
      },
      {
        src: "/images/escalier/marche-detail.jpg",
        alt: "Détail des premières marches en chêne massif sur le limon acier, platine au sol boulonnée",
        bg: "#d9cfc2",
        fit: "cover",
      },
    ],
    sizes: [
      // Le prix plancher de l'atelier (son heure à 50 €), arrondi à la dizaine,
      // pose comprise jusqu'à 45 km de Saumur (décision de Quentin, 06/10/2026).
      // Les deux escaliers tournants gardent leur supplément au-dessus du droit.
      { id: "droit", label: "Droit — 13 marches", price: 5370 },
      { id: "quart", label: "Quart tournant — 14 marches", price: 6870 },
      { id: "demi", label: "Demi-tournant — 16 marches", price: 8270 },
    ],
    // L'écart suit le vrai prix du bois des marches et de la main courante.
    woods: woods({ pin: -390, hetre: -390, chene: 0, noyer: 370 }),
    metals: metals("noir", "brut", "blanc"),
    metalLabel: { fr: "Couleur du limon", en: "Stringer colour" },
    woodLabel: { fr: "Essence des marches", en: "Tread timber" },
    sizeLabel: { fr: "Forme de l'escalier", en: "Staircase shape" },
    sections: [
      {
        title: "Une seule ligne, du sol à l'étage",
        body: "Le limon central est cintré d'une pièce, puis soudé à l'atelier. L'escalier ne montre aucun raccord : une seule courbe porte les marches en porte-à-faux. C'est la pièce la plus exigeante que nous fabriquions.",
      },
      {
        title: "Des marches qui semblent flotter",
        body: "Chaque marche en bois massif de 50 mm est fixée sur des platines cachées sous la marche. Le garde-corps à câbles inox et la main courante en bois cintré laissent passer la lumière.",
      },
    ],
    specs: [
      { label: "Limon", value: "Tube d'acier de forte section, cintré, soudure TIG, finition peinte mate" },
      { label: "Marches", value: "Pin, hêtre, chêne ou noyer massif au choix, épaisseur 50 mm, finition huile-cire" },
      { label: "Garde-corps", value: "Câbles inox tendus, main courante bois cintré" },
      { label: "Hauteur", value: "Sur mesure, adaptée à votre trémie (prise de cotes à domicile)" },
      { label: "Normes", value: "Garde-corps aux normes de sécurité françaises (NF P01-012)" },
      { label: "Fabrication", value: "Sur commande — comptez 10 à 12 semaines" },
      { label: "Pose", value: "Comprise jusqu'à 45 km de Saumur, par nos soins, en 1 à 2 jours ; au-delà, la route s'ajoute au devis" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Central Stringer Staircase",
      seoMots: "steel staircase",
      seoTitre: "Steel and wood central stringer stairs",
      seoDescription:
        "Central stringer staircase in steel, solid wood treads: straight, quarter turn or half turn. Made and fitted from Saumur, France.",
      tagline: "Curved steel stringer, solid oak treads, cable balustrade.",
      images: [
        "Straight staircase with a central steel stringer, solid oak treads and a steel balustrade with slim horizontal rails, in a limewashed room",
        "Close-up of the first solid oak treads on the steel stringer, bolted floor plate",
      ],
      sizes: {
        droit: "Straight — 13 treads",
        quart: "Quarter turn — 14 treads",
        demi: "Half turn — 16 treads",
      },
      sections: [
        {
          title: "One single line, from floor to landing",
          body: "The central stringer is curved in one piece, then welded in the workshop. The staircase shows no joint: a single curve carries the cantilevered treads. It is the most demanding piece we make.",
        },
        {
          title: "Treads that seem to float",
          body: "Each 50 mm solid wood tread is fixed on plates hidden under the tread. The stainless steel cable balustrade and the curved timber handrail let the light through.",
        },
      ],
      specs: [
        { label: "Stringer", value: "Heavy-section steel tube, bent, TIG welded, matt painted finish" },
        { label: "Treads", value: "Pine, beech, oak or walnut to choose from, 50 mm thick, oil-wax finish" },
        { label: "Balustrade", value: "Tensioned stainless steel cables, bent timber handrail" },
        { label: "Height", value: "Made to measure, fitted to your stairwell opening (measuring visit at your home)" },
        { label: "Standards", value: "Balustrade to French safety standards (NF P01-012)" },
        { label: "Lead time", value: "Made to order — allow 10 to 12 weeks" },
        { label: "Fitting", value: "Included within 45 km of Saumur, by us, in one or two days; beyond that, travel is added to the quote" },
      ],
    },
  },
  {
    slug: "garde-corps",
    poseOption: true,
    famille: "garde-corps",
    seoMots: "garde-corps sur mesure",
    // Ce que tapent les gens : « garde-corps artisanal sur mesure », et la ville.
    seoTitre: "Garde-corps de fenêtre sur mesure, Saumur",
    motsCles: [
      "garde-corps artisanal sur mesure",
      "garde-corps de fenêtre sur mesure Saumur",
      "garde-corps fenêtre acier Maine-et-Loire",
      "garde-corps croix de Saint-André rosace",
      "garde-corps prix instantané devis PDF",
      "garde-corps norme NF P01-012 sur mesure",
      "garde-corps Angers Cholet Tours sur mesure",
      "main courante chêne ou acier sur mesure",
      "balcon français fenêtre garde-corps acier",
    ],
    // L'accroche fait 131 signes : assemblée avec le prix et le suffixe, elle
    // dépassait les 155 signes que Google affiche. Courte, elle tient aussi
    // avec « Sur devis, pose comprise. » (prix indisponible). « Normes de
    // sécurité françaises » : la fiche détaille hauteur (art. R134-59) et
    // espaces (NF P01-012) — rien ici qui ressemble à une marque NF.
    seoDescription:
      "Garde-corps de fenêtre en acier plein, à rosaces de style ancien, sur mesure à Saumur, aux normes de sécurité françaises.",
    releve: "garde-corps-fenetre",
    category: "interieur",
    // Se commande en ligne, aux cotes que le client relève lui-même : aucune
    // taille au catalogue. La forme (hauteur à la norme, nombre de croix,
    // carré, barreaux en partie basse) et le prix viennent de l'outil de plans
    // de l'atelier, sur le serveur (src/lib/garde-corps-outil/, décisions de
    // Quentin du 29/09) : aucun barème ici. Plusieurs garde-corps dans une
    // commande : les frais fixes de l'atelier ne comptent qu'une fois (la
    // remise, jamais sous le prix plancher). L'atelier peut aussi venir
    // mesurer (priseDeCotes).
    // Ce modèle est fait pour la FENÊTRE seulement : d'autres modèles
    // viendront pour l'escalier, le balcon ou la mezzanine, avec leurs
    // propres photos.
    orderMode: "cart",
    priseDeCotes: true,
    name: "Garde-corps de fenêtre Rosace",
    tagline: "Garde-corps artisanal sur mesure, en acier plein : croix de Saint-André à rosaces de fonderie, ou barreaux verticaux ; main courante en bois ou en acier. Fabriqué au millimètre, encastré dans votre fenêtre.",
    images: [
      {
        src: "/images/garde-corps/fenetre.jpg",
        alt: "Garde-corps de fenêtre vu de face : cadre acier peint noir à croix de Saint-André, deux rosaces de fonderie, main courante en chêne",
        bg: "#ffffff",
        fit: "contain",
      },
      {
        src: "/images/garde-corps/fenetre-pose.jpg",
        alt: "Le même garde-corps en tableau, vu depuis la pièce : la fenêtre entière, l'appui et le jour sous le cadre",
        bg: "#e9e6e0",
        fit: "contain",
      },
      {
        src: "/images/garde-corps/fenetre-rue.jpg",
        alt: "Le garde-corps vu de la rue, entre les volets : sur l'appui en tuffeau, la fenêtre ouverte derrière",
        bg: "#e6e1d6",
        fit: "contain",
      },
    ],
    sizes: [],
    // L'outil chiffre le bois de la main courante à son volume, essence par
    // essence : aucun écart fixe ici (il compterait le bois deux fois).
    // La main courante : quatre bois, ou de l'acier (un plat soudé, un profilé du commerce) — au choix du client (05/10).
    woods: [
      ...woods({ pin: 0, hetre: 0, chene: 0, noyer: 0 }).map((b) => ({ ...b, label: `${b.label}, rainuré`, labelEn: `${b.labelEn}, grooved` })),
      // Le même bois, posé sur un fer plat de 60 × 10 soudé sur la lisse haute (il la raidit) : « Chêne, sur fer plat ».
      ...woods({ pin: 0, hetre: 0, chene: 0, noyer: 0 }).map((b) => ({ ...b, id: `${b.id}-plat`, label: `${b.label}, sur fer plat`, labelEn: `${b.labelEn}, on flat bar` })),
      { id: "acier", label: "Acier, fer plat", labelEn: "Steel, flat bar", swatch: "#4a4b4f", priceDelta: 0 },
      { id: "profil", label: "Acier, profilé", labelEn: "Steel, profiled", swatch: "#2e2f33", priceDelta: 0 },
    ],
    boisParDefaut: "chene",
    // Un garde-corps n'a pas de plateau : le « bois », c'est la main courante — en bois ou en acier.
    woodLabel: { fr: "Main courante", en: "Handrail" },
    metals: metals("noir", "brut", "blanc"),
    metalLabel: { fr: "Couleur de l'acier", en: "Steel colour" },
    // La rosace au croisement des barres : quatre modèles de fonderie, en
    // photo dans la pastille. Le supplément est par garde-corps, quel que
    // soit le nombre de croix, AJOUTÉ au prix de l'outil (qui compte la
    // fleur) : décision du 29/09, en attendant que l'outil chiffre chaque
    // modèle. De même pour les teintes (0 €) et le verre.
    fabricLabel: { fr: "Rosace au centre des croix", en: "Rosette at the centre of the crosses" },
    fabrics: [
      {
        id: "fleur",
        label: "Fleur, aluminium moulé Ø100",
        labelEn: "Flower, cast aluminium Ø100",
        swatch: "#2b2320",
        grain: "url(/images/garde-corps/rosaces/fleur.jpg)",
        priceDelta: 0,
      },
      {
        id: "fonte",
        label: "Médaillon fleur, fonte Ø100",
        labelEn: "Flower medallion, cast iron Ø100",
        swatch: "#2b2320",
        grain: "url(/images/garde-corps/rosaces/fonte.jpg)",
        priceDelta: 15,
      },
      {
        id: "acier",
        label: "Médaillon, acier Ø85",
        labelEn: "Medallion, steel Ø85",
        swatch: "#2b2320",
        grain: "url(/images/garde-corps/rosaces/acier.jpg)",
        priceDelta: 15,
      },
      {
        // Sans rosace (demande de Quentin, 05/10/2026) : le centre des croix reste vide ; l'outil ne compte pas les rosaces.
        id: "sans",
        label: "Sans rosace",
        labelEn: "No rosette",
        swatch: "#f4efe8",
        grain: "url(/images/garde-corps/rosaces/sans.svg)",
        priceDelta: 0,
      },
    ],
    remplissages: [
      {
        // Le modèle : une rangée de croix. Leur nombre est celui de l'outil de
        // plans : le moins de croix qui passe la norme (NF P01-012 : une
        // boule de 110 mm ne passe pas sous 800 mm du sol, de 180 au-dessus).
        id: "croix",
        label: "Croix de Saint-André et rosaces",
        labelEn: "Saint Andrew's crosses and rosettes",
        forfait: 0,
        parM2: 0,
      },
      {
        // Verre feuilleté de sécurité 44.2 dans le cadre acier, à la place des
        // croix : aucun vide. Le verre, la découpe, les fixations et le joint :
        // 180 € + 350 €/m², ajoutés au prix de l'outil (décision du 29/09).
        // À VALIDER par Quentin : le tarif du verre.
        id: "verre",
        label: "Panneau de verre feuilleté, à la place des croix",
        labelEn: "Laminated glass panel, instead of the crosses",
        forfait: 180,
        parM2: 350,
        sansCroix: true,
      },
    ],
    sections: [
      {
        title: "Un cadre en acier plein, une rosace de fonderie",
        body: "Le cadre et les croisillons sont en acier plein, soudés puis peints à l'atelier. Au croisement, une rosace de fonderie, comme sur les balcons anciens de Saumur. Quatre modèles sont proposés, en aluminium moulé, en fonte ou en acier ; vous choisissez le vôtre à la commande.",
      },
      {
        title: "Une main courante en bois ou en acier",
        body: "Quatre modèles au choix. En bois massif (pin, hêtre, chêne ou noyer ; le chêne est celui de l'image), arrondi, poncé et huilé : rainuré de 40 × 40 mm, il s'emboîte sur le cadre ; ou de 60 × 45 mm, vissé sur un fer plat de 60 × 10 mm qui raidit la lisse haute (obligatoire à partir de 1,67 m de large, compris dans le prix). En acier, peint comme le cadre : un fer plat de 40 × 8 mm soudé à plat, ou un profilé du commerce de 40 × 10 mm. Le choix se fait sur la fiche, avec le prix de chacun.",
      },
      {
        title: "Trois mesures à relever",
        body: "Vous relevez trois mesures au mètre : la largeur entre les murs au ras de l'appui, la même largeur à 1 m du sol, et la hauteur du sol au bas de la fenêtre (la hauteur de la fenêtre est facultative). Nous calculons la hauteur du garde-corps pour qu'il respecte la règle. Il vient s'encastrer dans le tableau, fixé dans l'épaisseur des murs. Si une cote nous étonne, nous vous appelons avant de couper. Si vous préférez, l'atelier vient prendre les cotes.",
      },
      {
        title: "Une hauteur calculée selon la règle",
        body: "En étage, une fenêtre dont l'appui est à moins de 90 cm du sol doit être protégée : c'est le Code de la construction. Le haut de la main courante est toujours au même endroit : à 1 m du sol au moins (nous visons 1 025 mm). C'est le garde-corps qui grandit ou rapetisse selon votre fenêtre. Nous faisons le calcul à partir de vos mesures, et nous vous proposons les modèles dont aucun vide n'est trop grand.",
      },
    ],
    specs: [
      { label: "Structure", value: "Acier plein, soudure TIG, finition peinte" },
      { label: "Motif", value: "Croix de Saint-André à rosaces de fonderie, ou barreaux verticaux" },
      { label: "Main courante", value: "Au choix : bois massif (pin, hêtre, chêne ou noyer) rainuré de 40 × 40 mm ou de 60 × 45 mm sur fer plat de 60 × 10 mm, finition huile-cire ; ou acier peint, fer plat de 40 × 8 mm ou profilé de 40 × 10 mm" },
      { label: "Pose", value: "Encastré dans le tableau de la fenêtre, fixations fournies — vous mesurez, nous fabriquons" },
      // Le prix de la visite vient de src/lib/deplacement.ts : jamais recopié ici.
      { label: "Prise de cotes", value: `Par vous, au mètre — ou par l'atelier, dès ${prixAffiche(PRIX_OFFRE_CENTS / 100, "fr")} jusqu'à ${RAYON_OFFRE_KM}\u00a0km de Saumur, déduits de la commande` },
      { label: "Normes", value: "Conforme aux normes françaises : hauteur calculée selon l'art. R134-59 du Code de la construction ; espaces entre les barres selon la NF P01-012" },
      { label: "Fabrication", value: "Sur commande — comptez 4 à 6 semaines" },
      { label: "Livraison", value: "Par transporteur en France métropolitaine, livré et posé par l'atelier, ou retiré à l'atelier à Saumur — fixations et notice de pose comprises" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Rosette Window Railing",
      seoMots: "custom window railing",
      seoTitre: "Custom window railing, Saumur",
      motsCles: [
        "custom handmade window railing",
        "bespoke steel window railing France",
        "window railing Saumur Loire Valley",
        "Saint Andrew's cross railing cast rosettes",
        "instant price PDF quote railing",
        "NF P01-012 window guard custom",
      ],
      seoDescription:
        "Solid steel window railing, period-style rosettes, made to measure in Saumur to French safety standards.",
      tagline: "Handmade custom window railing in solid steel: Saint Andrew's crosses with cast rosettes, or vertical bars; wood or steel handrail. Made to the millimetre, fitted into your window.",
      images: [
        "Window railing seen head-on: painted black steel frame with a Saint Andrew's cross, two cast rosettes, oak handrail",
        "The same railing in the reveal, seen from the room: the whole window, the sill and the daylight under the frame",
        "The railing seen from the street, between the shutters: on the tuffeau stone sill, the window open behind",
      ],
      sizes: {},
      sections: [
        {
          title: "A solid steel frame, a cast rosette",
          body: "The frame and the braces are solid steel, welded then painted in the workshop. Where the bars cross sits a cast rosette, as on the old balconies of Saumur. Four models are offered, in cast aluminium, cast iron or steel; you choose yours with the order.",
        },
        {
          title: "A wood or steel handrail",
          body: "Four designs to choose from. In solid wood (pine, beech, oak or walnut; oak is the one in the image), rounded, sanded and oiled: grooved, 40 × 40 mm, it fits over the frame; or 60 × 45 mm, screwed onto a 60 × 10 mm flat bar that stiffens the top rail (required from 1.67 m wide, included in the price). In steel, painted like the frame: a 40 × 8 mm flat bar welded flat, or an off-the-shelf 40 × 10 mm profile. You choose on the product page, with the price of each.",
        },
        {
          title: "Three measurements to take",
          body: "You take three tape measurements: the width between the walls just above the sill, the same width 1 m from the floor, and the height from the floor to the bottom of the window (the window height is optional). We work out the railing height so that it meets the rule. The railing fits into the reveal, fixed into the thickness of the walls. If a measurement surprises us, we call you before cutting. If you prefer, the workshop comes to measure up.",
        },
        {
          title: "A height set by the rule",
          body: "Upstairs, a window whose sill is less than 90 cm from the floor must be guarded: that is the French building code. The top of the handrail is always in the same place: at least 1 m from the floor (we aim for 1,025 mm). It is the railing that grows or shrinks with your window. We do the sum from your measurements, and we show you the models in which no gap is too wide.",
        },
      ],
      specs: [
        { label: "Frame", value: "Solid steel, TIG welded, painted finish" },
        { label: "Pattern", value: "Saint Andrew's crosses with cast rosettes, or vertical bars" },
        { label: "Handrail", value: "Your choice: solid wood (pine, beech, oak or walnut), grooved 40 × 40 mm or 60 × 45 mm on a 60 × 10 mm flat bar, oil-wax finish; or painted steel, 40 × 8 mm flat bar or 40 × 10 mm profile" },
        { label: "Fitting", value: "Fits into the window reveal, fixings supplied — you measure, we build" },
        { label: "Survey", value: `By you, with a tape — or by the workshop, from ${prixAffiche(PRIX_OFFRE_CENTS / 100, "en")} within ${RAYON_OFFRE_KM} km of Saumur, deducted from the order` },
        { label: "Standards", value: "Compliant with French standards: height set by art. R134-59 of the French building code; gaps between the bars to NF P01-012" },
        { label: "Lead time", value: "Made to order — allow 4 to 6 weeks" },
        { label: "Delivery", value: "By carrier in mainland France, delivered and fitted by the workshop, or collected from the workshop in Saumur — fixings and fitting guide included" },
      ],
    },
  },
  {
    slug: "garde-corps-forge-volutes",
    poseOption: true,
    famille: "garde-corps",
    // Le garde-corps à décor de la bibliothèque de styles (07/10/2026) : un modèle à part, plus haut de gamme.
    decorsGC: true,
    seoMots: "garde-corps fer forgé",
    seoTitre: "Garde-corps fer forgé à volutes, Saumur",
    motsCles: [
      "garde-corps fer forgé sur mesure",
      "garde-corps à volutes de fenêtre",
      "garde-corps ferronnerie ancienne Saumur",
      "balcon français fer forgé volutes",
      "garde-corps style haussmannien sur mesure",
      "garde-corps fer forgé Angers Tours",
    ],
    seoDescription:
      "Garde-corps de fenêtre à volutes de ferronnerie, sur mesure à Saumur, aux normes de sécurité françaises.",
    releve: "garde-corps-fenetre",
    category: "interieur",
    // Le même relevé, le même outil et le même panier que le garde-corps Rosace (voir sa fiche, plus haut) : seul le
    // remplissage change. Ni rosace ni verre : le décor remplit le cadre.
    orderMode: "cart",
    priseDeCotes: true,
    name: "Garde-corps forgé à volutes",
    tagline: "Garde-corps de fenêtre en acier plein, à volutes de ferronnerie : le décor des balcons anciens, dessiné à vos cotes et vérifié selon la norme.",
    images: [
      {
        src: "/images/garde-corps/forge/entre-c.jpg",
        alt: "Garde-corps forgé vu de face : volutes en C entre les barreaux, acier peint noir, main courante en chêne, entre deux tableaux en tuffeau",
        // Le fond de la pierre : la marge autour du dessin prolonge le mur.
        bg: "#e6dfd2",
        fit: "contain",
      },
      {
        src: "/images/garde-corps/forge/directoire.jpg",
        alt: "Garde-corps forgé à frise d'anneaux de style Directoire, colliers à rehauts dorés, acier peint noir et main courante en chêne",
        bg: "#e6dfd2",
        fit: "contain",
      },
      {
        src: "/images/garde-corps/forge/coeurs.jpg",
        alt: "Garde-corps forgé à cœurs de volutes, acier peint noir, main courante en chêne, dans une baie en pierre de tuffeau",
        bg: "#e6dfd2",
        fit: "contain",
      },
    ],
    sizes: [],
    woods: [
      ...woods({ pin: 0, hetre: 0, chene: 0, noyer: 0 }).map((b) => ({ ...b, label: `${b.label}, rainuré`, labelEn: `${b.labelEn}, grooved` })),
      // Le même bois, posé sur un fer plat de 60 × 10 soudé sur la lisse haute (il la raidit) : « Chêne, sur fer plat ».
      ...woods({ pin: 0, hetre: 0, chene: 0, noyer: 0 }).map((b) => ({ ...b, id: `${b.id}-plat`, label: `${b.label}, sur fer plat`, labelEn: `${b.labelEn}, on flat bar` })),
      { id: "acier", label: "Acier, fer plat", labelEn: "Steel, flat bar", swatch: "#4a4b4f", priceDelta: 0 },
      { id: "profil", label: "Acier, profilé", labelEn: "Steel, profiled", swatch: "#2e2f33", priceDelta: 0 },
    ],
    boisParDefaut: "chene",
    woodLabel: { fr: "Main courante", en: "Handrail" },
    metals: metals("noir", "brut", "blanc"),
    metalLabel: { fr: "Couleur de l'acier", en: "Steel colour" },
    sections: [
      {
        title: "Un décor de ferronnerie, à vos cotes",
        body: "Volutes en C entre les barreaux, frise de S, anneaux du Directoire, cœurs, médaillon : sept décors inspirés des balcons anciens, dessinés pour votre fenêtre. Les volutes sont assemblées par colliers sur un cadre en acier plein, soudé puis peint à l'atelier.",
      },
      {
        title: "Les finitions",
        body: "La forme des volutes, leurs bouts, les colliers ou la soudure, des barreaux carrés, torsadés ou à bagues, des rehauts dorés : chaque décor se règle dans un seul bouton, et le prix suit.",
      },
      {
        title: "Toujours aux normes",
        body: "Chaque décor est vérifié à vos cotes : aucun vide ne laisse passer une boule de 11 cm sous 80 cm du sol, de 18 cm au-dessus (NF P01-012), et rien ne sert de marche pour grimper. Un décor qui ne passe pas n'est pas proposé.",
      },
      {
        title: "Trois mesures à relever",
        body: "Vous relevez trois mesures au mètre : la largeur entre les murs au ras de l'appui, la même largeur à 1 m du sol, et la hauteur du sol au bas de la fenêtre (la hauteur de la fenêtre est facultative). Nous calculons la hauteur du garde-corps pour qu'il respecte la règle. Il vient s'encastrer dans le tableau, fixé dans l'épaisseur des murs. Si une cote nous étonne, nous vous appelons avant de couper. Si vous préférez, l'atelier vient prendre les cotes.",
      },
      {
        title: "Une hauteur calculée selon la règle",
        body: "En étage, une fenêtre dont l'appui est à moins de 90 cm du sol doit être protégée : c'est le Code de la construction. Le haut de la main courante est toujours au même endroit : à 1 m du sol au moins (nous visons 1 025 mm). C'est le garde-corps qui grandit ou rapetisse selon votre fenêtre. Nous faisons le calcul à partir de vos mesures, et nous vous proposons les modèles dont aucun vide n'est trop grand.",
      },
    ],
    specs: [
      { label: "Structure", value: "Acier plein, soudure TIG, finition peinte" },
      { label: "Décor", value: "Volutes de ferronnerie en acier, assemblées par colliers : sept décors au choix, et leurs finitions" },
      { label: "Main courante", value: "Au choix : bois massif (pin, hêtre, chêne ou noyer) rainuré de 40 × 40 mm ou de 60 × 45 mm sur fer plat de 60 × 10 mm, finition huile-cire ; ou acier peint, fer plat de 40 × 8 mm ou profilé de 40 × 10 mm" },
      { label: "Pose", value: "Encastré dans le tableau de la fenêtre, fixations fournies — vous mesurez, nous fabriquons" },
      { label: "Prise de cotes", value: `Par vous, au mètre — ou par l'atelier, dès ${prixAffiche(PRIX_OFFRE_CENTS / 100, "fr")} jusqu'à ${RAYON_OFFRE_KM}\u00a0km de Saumur, déduits de la commande` },
      { label: "Normes", value: "Conforme aux normes françaises : hauteur calculée selon l'art. R134-59 du Code de la construction ; espaces entre les barres selon la NF P01-012" },
      { label: "Fabrication", value: "Sur commande — comptez 4 à 6 semaines" },
      { label: "Livraison", value: "Par transporteur en France métropolitaine, livré et posé par l'atelier, ou retiré à l'atelier à Saumur — fixations et notice de pose comprises" },
    ],
    en: {
      name: "Wrought Scroll Window Railing",
      seoMots: "wrought iron window railing",
      seoTitre: "Custom wrought scroll window railing, Saumur",
      motsCles: [
        "custom wrought iron window railing",
        "scrollwork window railing France",
        "period ironwork railing Saumur Loire Valley",
        "French balcony scroll railing",
        "Haussmann style window railing",
      ],
      seoDescription:
        "Window railing with ironwork scrolls, made to measure in Saumur to French safety standards.",
      tagline: "Solid steel window railing with ironwork scrolls: the design of old balconies, drawn to your measurements and checked against the standard.",
      images: [
        "Wrought window railing, front view: C-scrolls between the bars, black-painted steel, oak handrail, between two tufa stone reveals",
        "Wrought railing with a Directoire-style ring frieze, gilded collars, black-painted steel and oak handrail",
        "Wrought railing with scrolled hearts, black-painted steel, oak handrail, in a tufa stone window opening",
      ],
      sizes: {},
      sections: [
        {
          title: "Ironwork, made to your measurements",
          body: "C-scrolls between the bars, S-scroll frieze, Directoire rings, hearts, medallion: seven designs inspired by old balconies, drawn for your window. The scrolls are clamped with collars onto a solid steel frame, welded then painted in the workshop.",
        },
        {
          title: "The finishes",
          body: "The shape of the scrolls, their ends, collars or welds, square, twisted or ringed bars, gilded highlights: each design is set in a single button, and the price follows.",
        },
        {
          title: "Always to the standard",
          body: "Each design is checked at your measurements: no gap lets a 11 cm ball through below 80 cm from the floor, 18 cm above (NF P01-012), and nothing serves as a foothold to climb. A design that fails is not offered.",
        },
        {
          title: "Three measurements to take",
          body: "You take three tape measurements: the width between the walls just above the sill, the same width 1 m from the floor, and the height from the floor to the bottom of the window (the window height is optional). We work out the railing height so that it meets the rule. The railing fits into the reveal, fixed into the thickness of the walls. If a measurement surprises us, we call you before cutting. If you prefer, the workshop comes to measure up.",
        },
        {
          title: "A height set by the rule",
          body: "Upstairs, a window whose sill is less than 90 cm from the floor must be guarded: that is the French building code. The top of the handrail is always in the same place: at least 1 m from the floor (we aim for 1,025 mm). It is the railing that grows or shrinks with your window. We do the sum from your measurements, and we show you the models in which no gap is too wide.",
        },
      ],
      specs: [
        { label: "Frame", value: "Solid steel, TIG welded, painted finish" },
        { label: "Design", value: "Steel ironwork scrolls, clamped with collars: seven designs to choose from, with their finishes" },
        { label: "Handrail", value: "Your choice: solid wood (pine, beech, oak or walnut), grooved 40 × 40 mm or 60 × 45 mm on a 60 × 10 mm flat bar, oil-wax finish; or painted steel, 40 × 8 mm flat bar or 40 × 10 mm profile" },
        { label: "Fitting", value: "Fits into the window reveal, fixings supplied — you measure, we build" },
        { label: "Survey", value: `By you, with a tape — or by the workshop, from ${prixAffiche(PRIX_OFFRE_CENTS / 100, "en")} within ${RAYON_OFFRE_KM} km of Saumur, deducted from the order` },
        { label: "Standards", value: "Compliant with French standards: height set by art. R134-59 of the French building code; gaps between the bars to NF P01-012" },
        { label: "Lead time", value: "Made to order — allow 4 to 6 weeks" },
        { label: "Delivery", value: "By carrier in mainland France, delivered and fitted by the workshop, or collected from the workshop in Saumur — fixings and fitting guide included" },
      ],
    },
  },
  {
    slug: "chaise-acier-bois",
    poseOption: true,
    livraisonSeule: true,
    livraisonInfo: {
      fr: "Partout en France métropolitaine, 90 € au maximum. Le dossier et les pieds sont livrés démontés, avec la visserie, la clé de montage et la notice.",
      en: "Price depends on your city, the weight and the dimensions. The backrest and legs are delivered unassembled, with the hardware, the allen key and the instructions.",
    },
    colisKg: 9,
    famille: "chaise",
    seoMots: "chaise en velours",
    category: "interieur",
    orderMode: "cart",
    name: "Chaise Velours & Acier",
    tagline: "Piétement acier fin, assise garnie en velours — quinze coloris.",
    images: [
      {
        src: "/images/chaises/vert-bouteille.jpg",
        alt: "Chaise en velours vert bouteille sur piétement acier noir",
        bg: "#f3f3f3",
        fit: "contain",
        fabric: "vert-bouteille",
      },
      {
        src: "/images/chaises/bleu-roi.jpg",
        alt: "Chaise en velours bleu roi sur piétement acier noir",
        bg: "#f3f3f3",
        fit: "contain",
        fabric: "bleu-roi",
      },
      {
        src: "/images/chaises/terre-de-sienne.jpg",
        alt: "Chaise en velours terre de Sienne sur piétement acier noir",
        bg: "#f3f3f3",
        fit: "contain",
        fabric: "terre-de-sienne",
      },
      {
        src: "/images/chaises/detail-piedement.jpg",
        alt: "Détail de la liaison entre l'assise en velours et le piétement acier",
        bg: "#f5f5f5",
        fit: "cover",
      },
    ],
    // Prix baissé de 50 % à la demande de Quentin (290 € à l'origine).
    sizes: [{ id: "standard", label: "Taille unique — L 48 × P 55 × H 88 cm", price: 145 }],
    woods: [],
    metals: pieds(),
    fabrics,
    sections: [
      {
        title: "Quatre ronds d'acier, cintrés un à un",
        body: "Quatre ronds d'acier plein de faible section, cintrés puis soudés un à un, portent l'assise. Elle est garnie de mousse haute densité. La chaise se commande à l'unité comme par six ; elle accompagne les tables Mikado, Croix et Brindille.",
      },
      {
        title: "Quinze velours au choix",
        body: "Du bleu roi au champagne, chaque coloris est au même prix. Le velours est un tissu d'ameublement résistant ; il se nettoie à la brosse douce.",
      },
    ],
    specs: [
      { label: "Assise", value: "Mousse haute densité, velours d'ameublement, quinze coloris" },
      { label: "Structure", value: "Rond plein acier, soudure TIG, finition peinte mate" },
      { label: "Fabrication", value: "Sur commande — comptez 4 semaines" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Velvet & Steel Chair",
      seoMots: "velvet chair",
      tagline: "Slender steel base, padded velvet seat — fifteen colours.",
      images: [
        "Chair in bottle green velvet on a black steel base",
        "Chair in royal blue velvet on a black steel base",
        "Chair in burnt sienna velvet on a black steel base",
        "Close-up of the joint between the velvet seat and the steel base",
      ],
      sizes: {
        standard: "One size — W 48 × D 55 × H 88 cm",
      },
      sections: [
        {
          title: "Four steel rods, bent one by one",
          body: "Four slender solid steel rods, bent then welded one by one, carry the seat. It is padded with high-density foam. The chair comes singly or by the six; it goes with the Mikado, Croix and Brindille tables.",
        },
        {
          title: "Fifteen velvets to choose from",
          body: "From royal blue to champagne, every colour comes at the same price. Velvet is a hard-wearing upholstery fabric; it cleans with a soft brush.",
        },
      ],
      specs: [
        { label: "Seat", value: "High-density foam, upholstery velvet, fifteen colours" },
        { label: "Frame", value: "Solid steel rod, TIG welded, matt painted finish" },
        { label: "Lead time", value: "Made to order — allow 4 weeks" },
      ],
    },
  },
  {
    slug: "table-mikado-exterieur",
    poseOption: true,
    boisAuM2: true,
    famille: "table-exterieur",
    seoMots: "table de jardin",
    seoTitre: "Table de jardin chêne et acier, Mikado",
    // Même raison que le garde-corps : accroche + prix + suffixe dépassait.
    seoDescription:
      "Table de jardin à lattes de chêne traité, piétement Mikado en acier peint, faite pour rester dehors. Fabriquée à Saumur (49).",
    category: "exterieur",
    orderMode: "cart",
    name: "Table Mikado Extérieur",
    tagline: "Plateau à lattes en chêne traité, piétement Mikado peint pour l'extérieur — faite pour rester dehors.",
    images: [
      {
        src: "/images/table-exterieur-lattes.jpg",
        alt: "Table d'extérieur Mikado, plateau à lattes de chêne — vue d'angle sur la finition du plateau",
        bg: "#ffffff",
        fit: "cover",
        metal: "noir",
        variants: {
          noir: "/images/table-exterieur-lattes.jpg",
          gris: "/images/mikado-exterieur/angle/gris-v3.jpg",
          chocolat: "/images/mikado-exterieur/angle/chocolat-v3.jpg",
          laiton: "/images/mikado-exterieur/angle/laiton-v3.jpg",
          lin: "/images/mikado-exterieur/angle/lin-v3.jpg",
          blanc: "/images/mikado-exterieur/angle/blanc-v3.jpg",
        },
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 1460 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 1680 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 1800 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 2050 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2330 },
    ],
    surMesure: {
      // Le même piétement que la table d'intérieur, mais un plateau à lattes.
      // Prix conseillés du chiffrage du 27/09/2026 : le prix qui paie l'heure
      // de Quentin 50 € (aucun concurrent relevé). Les prix du catalogue restent des multiples de
      // 10 € : c'est ce qui leur sert de plafond exact pour le sur-mesure
      // (voir table-mikado).
      forme: "rect",
      axes: "plan",
      forfait: 987,
      parM2: 255,
      // Le tour de la table : les tables longues et étroites coûtent plus que leur surface (lattes, traverses).
      parMetre: 40,
      minMm: 800,
      maxLargeurMm: PLATEAU_MAX_LONGUEUR_MM,
      maxHauteurMm: PLATEAU_MAX_LARGEUR_MM,
      epaisseur: {
        // Les mêmes trois épaisseurs que les tables d'intérieur : 28, 36 ou 45 mm.
        minMm: 28,
        maxMm: 45,
        refMm: 45,
        choixMm: PLATEAU_CHOIX,
        parM2ParMm: 0,
        miniParLongueur: PLATEAU_MASSIF,
      },
    },
    woods: [],
    metals: pieds(),
    sections: [
      {
        title: "Un plateau à lattes espacées",
        body: "Le plateau est monté en lattes espacées : la pluie traverse au lieu de stagner. Le bois sèche vite et travaille peu. Chaque latte est arrondie sur ses arêtes, puis poncée.",
      },
      {
        title: "Le même piétement, traité pour dehors",
        body: "C'est le piétement Mikado de la table d'intérieur, protégé par une peinture pour l'extérieur. La couche tient à la pluie, au sel et aux UV sans s'écailler.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Chêne massif traité classe 4, lattes espacées, finition huile extérieure" },
      { label: "Piétement", value: "Tube d'acier 80 × 80 mm, paroi 3 mm, soudé d'une seule pièce, finition peinte pour l'extérieur" },
      { label: "Capacité", value: "6 à 14 places selon le format" },
      { label: "Entretien", value: "Une huile par an ; laisser griser si l'on préfère la patine" },
      { label: "Fabrication", value: "Sur commande — comptez 6 à 8 semaines" },
      { label: "Livraison", value: "Partout en France, par transporteur, 90 € au maximum ; ou livrée et posée par l'atelier" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Mikado Outdoor Table",
      seoMots: "garden table",
      seoTitre: "Oak and steel garden table, Mikado",
      // Même raison qu'en français : accroche + prix + suffixe dépassait.
      seoDescription:
        "Garden table with a slatted treated-oak top and a painted steel Mikado base, made to stay outside. Made in Saumur, France.",
      tagline: "Slatted treated-oak top, Mikado base painted for outdoors — made to stay outside.",
      images: [
        "Mikado outdoor table, slatted oak top — angle view of the top finish",
      ],
      sizes: {
        p6: "Seats 6 — 150 × 90 × H 75 cm",
        p8: "Seats 8 — 200 × 100 × H 75 cm",
        p10: "Seats 10 — 240 × 100 × H 75 cm",
        p12: "Seats 12 — 300 × 100 × H 75 cm",
        p14: "Seats 14 — 350 × 110 × H 75 cm",
      },
      sections: [
        {
          title: "A top of spaced slats",
          body: "The top is built from spaced slats: rain runs through instead of sitting on the wood. The wood dries quickly and moves little. Every slat has its edges rounded, then sanded.",
        },
        {
          title: "The same base, treated for outdoors",
          body: "It is the Mikado base of the indoor table, protected by an outdoor paint finish. The coat stands up to rain, salt and sunlight without flaking.",
        },
      ],
      specs: [
        { label: "Top", value: "Class 4 treated solid oak, spaced slats, outdoor oil finish" },
        { label: "Base", value: "80 × 80 mm steel tube, 3 mm wall, welded in one piece, outdoor painted finish" },
        { label: "Seats", value: "6 to 14 depending on size" },
        { label: "Care", value: "One coat of oil a year; leave it to silver if you prefer the patina" },
        { label: "Lead time", value: "Made to order — allow 6 to 8 weeks" },
        { label: "Delivery", value: "Anywhere in mainland France by carrier, €90 at most; or delivered and fitted by the workshop" },
      ],
    },
  },
  {
    slug: "fauteuil-terrasse",
    poseOption: true,
    colisKg: 14,
    famille: "chaise-exterieur",
    seoMots: "fauteuil d'extérieur",
    category: "exterieur",
    orderMode: "cart",
    name: "Fauteuil Terrasse",
    tagline: "Structure acier peint, coussins déperlants — fait pour rester dehors.",
    images: [
      {
        src: "/images/chaise-exterieur.jpg",
        alt: "Fauteuil de terrasse en acier peint gris avec coussins",
        bg: "#d5d5d5",
        fit: "cover",
      },
    ],
    // Prix baissé de 50 % à la demande de Quentin (390 € à l'origine).
    sizes: [{ id: "standard", label: "Taille unique — L 62 × P 68 × H 82 cm", price: 195 }],
    woods: [],
    metals: pieds(),
    sections: [
      {
        title: "Il passe l'hiver dehors",
        body: "La structure est en acier peint pour l'extérieur : la peinture tient à la pluie et au sel sans s'écailler. Accoudoirs et dossier sont soudés d'une pièce ; aucun boulon à resserrer au fil des saisons.",
      },
      {
        title: "Des coussins qui sèchent vite",
        body: "Assise et dossier reposent sur des coussins en mousse à cellules ouvertes, habillés d'un tissu d'extérieur déperlant. L'eau traverse et s'évacue ; la housse se retire pour le lavage.",
      },
    ],
    specs: [
      { label: "Structure", value: "Acier peint, soudure TIG, traitement extérieur" },
      { label: "Coussins", value: "Mousse à cellules ouvertes, tissu d'extérieur déperlant, housses amovibles" },
      { label: "Fabrication", value: "Sur commande — comptez 4 semaines" },
      { label: "Livraison", value: "France métropolitaine" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Terrace Armchair",
      seoMots: "outdoor armchair",
      tagline: "Painted steel frame, water-repellent cushions — made to stay outside.",
      images: [
        "Terrace armchair in grey painted steel with cushions",
      ],
      sizes: {
        standard: "One size — W 62 × D 68 × H 82 cm",
      },
      sections: [
        {
          title: "It stays out all winter",
          body: "The frame is steel painted for outdoors: the coat takes rain and salt without flaking. Arms and back are welded in one piece; there is no bolt to tighten season after season.",
        },
        {
          title: "Cushions that dry fast",
          body: "Seat and back rest on open-cell foam cushions covered in a water-repellent outdoor fabric. Water runs through and drains away; the covers come off for washing.",
        },
      ],
      specs: [
        { label: "Frame", value: "Painted steel, TIG welded, outdoor treatment" },
        { label: "Cushions", value: "Open-cell foam, removable water-repellent outdoor fabric" },
        { label: "Lead time", value: "Made to order — allow 4 weeks" },
        { label: "Delivery", value: "Mainland France" },
      ],
    },
  },
  {
    slug: "plafond-lumineux-lucarne",
    poseOption: true,
    famille: "plafond",
    seoMots: "plafond lumineux toile tendue",
    seoTitre: "Lucarne, plafonnier en toile tendue",
    seoDescription:
      "Plafonnier en toile tendue rétroéclairée, cadre alu, fabriqué à Saumur. Livré jusqu'à 230 × 210 cm, posé par l'atelier au-delà.",
    // Les photos de la fiche sont carrées : déclinaison 1200 × 630 pour les réseaux.
    imagePartage: "/images/partage/lucarne.jpg",
    category: "lumiere",
    orderMode: "cart",
    name: "Lucarne",
    tagline: "Toile tendue rétroéclairée, cadre aluminium laqué.",
    metalLabel: { fr: "Couleur du cadre", en: "Frame colour" },
    images: [
      {
        src: "/images/lumiere/panneau-dessous-carre.jpg",
        alt: "Lucarne : plafond lumineux à toile tendue vu de dessous, cadre aluminium noir",
        bg: "#ffffff",
        fit: "cover",
        // Membrane relevée sur la photo : sa lumière est réellement animée.
        glow: {
          box: { left: "11.9%", top: "29.1%", width: "80.3%", height: "46.3%" },
          clip: "polygon(66.6% 0%, 100% 47.4%, 34.2% 100%, 0% 66.9%)",
        },
      },
      {
        // La Lucarne chez quelqu'un : la même photo que l'accueil.
        src: "/images/salle-plafond-mikado.jpg",
        alt: "Lucarne : plafond lumineux à toile tendue au-dessus d'une table de salle à manger",
        fit: "cover",
      },
    ],
    sizes: [
      { id: "l120", default: true, dimsMm: [1200, 600], label: "120 × 60 cm — 0,72 m² — 50 W", price: 1300 },
      { id: "l1212", dimsMm: [1200, 1200], label: "120 × 120 cm — 1,44 m² — 95 W", price: 1780 },
      { id: "l180", dimsMm: [1800, 900], label: "180 × 90 cm — 1,62 m² — 105 W", price: 1940 },
      { id: "l240", dimsMm: [2400, 1200], label: "240 × 120 cm — 2,88 m² — 190 W", price: 2700 },
      { id: "l300", dimsMm: [3000, 1500], label: "300 × 150 cm — 4,5 m² — 290 W", price: 3670 },
      { id: "l302", dimsMm: [3000, 2000], label: "300 × 200 cm — 6 m² — 390 W", price: 4370 },
      { id: "l400", dimsMm: [4000, 2000], label: "400 × 200 cm — 8 m² — 520 W", price: 5480 },
      { id: "l425", dimsMm: [4000, 2500], label: "400 × 250 cm — 10 m² — 650 W", price: 6330 },
      { id: "l430", dimsMm: [4000, 3000], label: "400 × 300 cm — 12 m² — 780 W", price: 7280 },
    ],
    surMesure: {
      cotesParDefautMm: [1800, 1180, 200],
      forme: "rect",
      // Un plafond se mesure à plat : longueur × largeur, comme une table.
      axes: "plan",
      // Prix conseillés du chiffrage (27/09/2026) : chaque taille du catalogue
      // paie l'heure de Quentin 50 €. Forfait + mètre carré + mètre de pourtour,
      // calés sur le chiffrage et jamais sous une taille du catalogue ; entre
      // deux tailles, la plus petite qui contient les cotes sert de plafond.
      // 06/10/2026 : recalés sur la règle des 14 m de ruban par boîtier LED (1 boîtier de 150 W pour 14 m au plus,
      // Quentin, 26/09) : la formule la plus basse qui reste au-dessus du plancher à toutes les cotes et profondeurs.
      forfait: 459,
      parM2: 380,
      parMetre: 170,
      minMm: 300,
      maxLargeurMm: 4000,
      maxHauteurMm: 3000,
      epaisseur: {
        // Seule la bande d'aluminium du pourtour change : 134 €/m² de bande,
        // tiré du chiffrage (tôle, montants, caisse plus haute).
        minMm: 180,
        maxMm: 600,
        refMm: 180,
        parM2Bande: 156,
      },
    },
    woods: [],
    metals: pieds(),
    sections: [
      {
        title: "Une lumière sans point chaud",
        body: "La toile tendue diffuse la lumière sur toute sa surface : pas de spot visible, pas d'ombre dure sur la table. Les LED sont montées au fond du caisson ; la toile égalise leur lumière, du même blanc d'un bord à l'autre.",
        image: "/images/salle-plafond-mikado.jpg",
      },
      {
        title: "Un cadre en aluminium laqué",
        body: "Le cadre est assemblé en profilé d'aluminium, coupé en onglet et laqué. La teinte ne jaunit pas et ne s'écaille pas. La toile se clipse dans une gorge périphérique ; elle se retire et se remet sans outil pour le nettoyage.",
      },
      {
        title: "En applique, suspendu ou encastré",
        body: "La Lucarne se pose en applique au plafond, se suspend par câbles ou s'encastre dans un faux plafond. L'alimentation 220 V est fournie ; la variation est possible sur demande, et une application permet de régler la teinte — blanc, couleur ou animation lumineuse.",
        // Une pose réelle, encastrée, la toile en couleur.
        image: "/images/lumiere/lucarne-rgb.jpg",
      },
    ],
    specs: [
      { label: "Toile", value: "Membrane translucide tendue, blanc diffusant" },
      { label: "Cadre", value: "Profilé aluminium laqué, coupe d'onglet, caisson de 180 à 600 mm" },
      { label: "Éclairage", value: "LED 220 V, blanc 3000 K ou 4000 K ou couleur réglable par application, variation en option" },
      { label: "Fabrication", value: "Sur commande — comptez 3 à 5 semaines" },
      { label: "Dimensions", value: "Jusqu'à 400 × 300 cm, au centimètre près. D'un seul tenant jusqu'à 230 × 210 cm ; au-delà, en modules assemblés et posés chez vous par l'atelier." },
      { label: "Pose", value: "En applique, suspendu par câbles ou encastré" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Lucarne",
      seoMots: "backlit stretch ceiling",
      seoTitre: "Lucarne, stretch-fabric ceiling light",
      seoDescription:
        "Backlit stretch-fabric ceiling light, aluminium frame, made in Saumur. Shipped up to 230 × 210 cm; larger sizes fitted by the workshop.",
      tagline: "Backlit stretched fabric, lacquered aluminium frame.",
      images: [
        "Lucarne: backlit stretch ceiling seen from below, black aluminium frame",
        "Lucarne: backlit stretch ceiling above a dining table",
      ],
      sizes: {
        l120: "120 × 60 cm — 0.72 m² — 50 W",
        l1212: "120 × 120 cm — 1.44 m² — 95 W",
        l180: "180 × 90 cm — 1.62 m² — 105 W",
        l240: "240 × 120 cm — 2.88 m² — 190 W",
        l300: "300 × 150 cm — 4.5 m² — 290 W",
        l302: "300 × 200 cm — 6 m² — 390 W",
        l400: "400 × 200 cm — 8 m² — 520 W",
        l425: "400 × 250 cm — 10 m² — 650 W",
        l430: "400 × 300 cm — 12 m² — 780 W",
      },
      sections: [
        {
          title: "Light with no hot spot",
          body: "The stretched fabric spreads the light over its whole surface: no visible spotlight, no hard shadow on the table. The LEDs sit at the back of the box; the fabric evens out their light, the same white from one edge to the other.",
        },
        {
          title: "A lacquered aluminium frame",
          body: "The frame is built from aluminium profile, mitred and lacquered. The colour neither yellows nor flakes. The fabric clips into a groove all around; it comes out and goes back without a tool for cleaning.",
        },
        {
          title: "Surface-mounted, suspended or recessed",
          body: "The Lucarne is surface-mounted on the ceiling, hung on cables or recessed into a false ceiling. The 220 V supply comes with it; dimming is available on request, and an app lets you set the tone — white, solid colour or a light animation.",
        },
      ],
      specs: [
        { label: "Fabric", value: "Stretched translucent membrane, diffusing white" },
        { label: "Frame", value: "Lacquered aluminium profile, mitred corners, box 180 to 600 mm deep" },
        { label: "Lighting", value: "220 V LED, 3000 K or 4000 K white, or colour set from an app, dimming optional" },
        { label: "Lead time", value: "Made to order — allow 3 to 5 weeks" },
        { label: "Sizes", value: "Up to 400 × 300 cm, to the centimetre. In one piece up to 230 × 210 cm; beyond that, in modules assembled and fitted at your place by the workshop." },
        { label: "Fitting", value: "Surface-mounted, hung on cables or recessed" },
      ],
    },
  },
  {
    slug: "plafond-lumineux-halo",
    poseOption: true,
    famille: "plafond",
    seoMots: "plafond lumineux rond",
    seoTitre: "Halo, luminaire rond en toile tendue",
    seoDescription:
      "Grand luminaire rond en toile tendue rétroéclairée, fabriqué à Saumur. Livré jusqu'à Ø 210 cm, posé par l'atelier au-delà.",
    // Photos carrées, là aussi : déclinaison 1200 × 630 pour les réseaux.
    imagePartage: "/images/partage/halo.jpg",
    category: "lumiere",
    orderMode: "cart",
    name: "Halo",
    tagline: "Cercle de toile tendue rétroéclairée, cadre aluminium laqué.",
    metalLabel: { fr: "Couleur du cadre", en: "Frame colour" },
    images: [
      {
        src: "/images/lumiere/rond-dessous-carre.jpg",
        alt: "Halo : plafond lumineux rond à toile tendue, cadre aluminium noir",
        bg: "#ffffff",
        fit: "cover",
        // Membrane relevée sur la photo : sa lumière est réellement animée.
        glow: {
          box: { left: "16.4%", top: "33.4%", width: "67.5%", height: "33.9%" },
          clip: "ellipse(50% 50% at 50% 50%)",
        },
      },
      {
        src: "/images/lumiere/rond-allume.jpg",
        alt: "Halo allumé, plafond lumineux rond",
        bg: "#e8e8e8",
        fit: "cover",
      },
      {
        src: "/images/lumiere/rond-angle.jpg",
        alt: "Détail du cadre aluminium cintré et de la toile tendue allumée",
        bg: "#6f6f6f",
        fit: "cover",
      },
    ],
    sizes: [
      { id: "d90", dimsMm: [900, 900], label: "Ø 90 cm — 0,64 m² — 40 W", price: 1600 },
      { id: "d120", default: true, dimsMm: [1200, 1200], label: "Ø 120 cm — 1,13 m² — 75 W", price: 2170 },
      { id: "d150", dimsMm: [1500, 1500], label: "Ø 150 cm — 1,77 m² — 115 W", price: 2730 },
      { id: "d200", dimsMm: [2000, 2000], label: "Ø 200 cm — 3,14 m² — 205 W", price: 3790 },
      { id: "d250", dimsMm: [2500, 2500], label: "Ø 250 cm — 4,91 m² — 320 W", price: 4990 },
      { id: "d300", dimsMm: [3000, 3000], label: "Ø 300 cm — 7,07 m² — 460 W", price: 6330 },
      { id: "d350", dimsMm: [3500, 3500], label: "Ø 350 cm — 9,62 m² — 625 W", price: 7800 },
      { id: "d400", dimsMm: [4000, 4000], label: "Ø 400 cm — 12,57 m² — 815 W", price: 9470 },
    ],
    surMesure: {
      cotesParDefautMm: [1800, 1800, 200],
      // Le cercle demande le cintrage du profilé et une toile taillée en rond :
      // le mètre carré est plus cher que sur un rectangle.
      forme: "rond",
      // Prix conseillés du chiffrage (27/09/2026), calés comme la Lucarne. Le
      // mètre carré est plus cher qu'en rectangle : il faut cintrer le profilé
      // et la toile ronde fait de la chute.
      // Prix conseillés du chiffrage du 03/10/2026 : un rond demande bien plus
      // de travail qu'un rectangle (cintrage, roulage), le pourtour pèse donc
      // plus lourd dans le prix.
      // 06/10/2026 : recalés sur la règle des 14 m de ruban par boîtier LED (voir la Lucarne).
      forfait: 419,
      parM2: 350,
      parMetre: 370,
      minMm: 300,
      maxLargeurMm: 4000,
      maxHauteurMm: 4000,
      epaisseur: {
        minMm: 180,
        maxMm: 600,
        refMm: 180,
        parM2Bande: 168,
      },
    },
    woods: [],
    metals: pieds(),
    sections: [
      {
        title: "Un disque de lumière pleine",
        body: "Jusqu'à Ø 210 cm, le cercle est roulé d'une seule pièce : pas d'angle, pas de raccord visible sur le pourtour. La toile s'y tend en une seule surface et diffuse la même lumière du centre jusqu'au bord.",
      },
      {
        title: "Le même cadre, roulé",
        body: "Le profilé d'aluminium est cintré puis laqué. La teinte ne jaunit pas et ne s'écaille pas. La toile se clipse dans la gorge périphérique et se retire sans outil.",
      },
      {
        title: "Un grand disque éclaire toute une salle",
        body: "Au-delà de 1,50 m de diamètre, le disque ne complète plus l'éclairage : il le remplace. Un seul suffit pour une salle de réunion, un plateau de bureaux ou une grande pièce à vivre, sans autre spot. La lumière diffuse ne porte pas d'ombre dure sur les visages.",
        image: "/images/lumiere/salle-ronde.jpg",
      },
      {
        title: "Posé au plafond ou suspendu",
        body: "Le disque se pose au plafond ou se suspend par câbles. Il se fabrique jusqu'à 400 cm de diamètre : d'un seul tenant jusqu'à 210 cm, en modules posés chez vous par l'atelier au-delà. L'alimentation 220 V est fournie, la variation est possible sur demande.",
      },
    ],
    specs: [
      { label: "Toile", value: "Membrane translucide tendue, blanc diffusant" },
      { label: "Cadre", value: "Profilé aluminium cintré et laqué, caisson de 180 à 600 mm" },
      { label: "Éclairage", value: "LED 220 V, blanc 3000 K ou 4000 K, variation en option" },
      { label: "Diamètre", value: "Jusqu'à 400 cm, au centimètre près. D'un seul tenant jusqu'à 210 cm ; au-delà, en modules assemblés et posés chez vous par l'atelier." },
      { label: "Fabrication", value: "Sur commande — comptez 3 à 5 semaines" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Halo",
      seoMots: "round backlit stretch ceiling",
      seoTitre: "Halo, round stretch-fabric ceiling light",
      seoDescription:
        "Large round backlit stretch-fabric light, made in Saumur. Shipped up to Ø 210 cm; larger sizes fitted by the workshop.",
      tagline: "A circle of backlit stretched fabric, lacquered aluminium frame.",
      images: [
        "Halo: round stretched-fabric light ceiling, black aluminium frame",
        "Halo lit up: round light ceiling",
        "Close-up of the curved aluminium frame and the lit stretched fabric",
      ],
      sizes: {
        d90: "Ø 90 cm — 0.64 m² — 40 W",
        d120: "Ø 120 cm — 1.13 m² — 75 W",
        d150: "Ø 150 cm — 1.77 m² — 115 W",
        d200: "Ø 200 cm — 3.14 m² — 205 W",
        d250: "Ø 250 cm — 4.91 m² — 320 W",
        d300: "Ø 300 cm — 7.07 m² — 460 W",
        d350: "Ø 350 cm — 9.62 m² — 625 W",
        d400: "Ø 400 cm — 12.57 m² — 815 W",
      },
      sections: [
        {
          title: "A full disc of light",
          body: "Up to Ø 210 cm, the circle is rolled in one piece: no corner, no joint showing anywhere on the rim. The fabric is stretched across it as a single surface and gives the same light from the centre out to the edge.",
        },
        {
          title: "The same frame, rolled",
          body: "The aluminium profile is curved, then lacquered. The colour neither yellows nor flakes. The fabric clips into the groove all around and comes out without a tool.",
        },
        {
          title: "One large disc lights a whole room",
          body: "Past 1.50 m across, the disc no longer adds to the lighting: it replaces it. One is enough for a meeting room, an open-plan office or a large living room, with no other spotlight. The diffused light casts no hard shadow on faces.",
        },
        {
          title: "Fixed to the ceiling or suspended",
          body: "The disc fixes to the ceiling or hangs on cables. It is made up to 400 cm across: in one piece up to 210 cm, in modules fitted at your place by the workshop beyond that. The 220 V supply comes with it and dimming is available on request.",
        },
      ],
      specs: [
        { label: "Fabric", value: "Stretched translucent membrane, diffusing white" },
        { label: "Frame", value: "Curved and lacquered aluminium profile, box 180 to 600 mm deep" },
        { label: "Lighting", value: "220 V LED, 3000 K or 4000 K white, dimming optional" },
        { label: "Diameter", value: "Up to 400 cm, to the centimetre. In one piece up to 210 cm; beyond that, in modules assembled and fitted at your place by the workshop." },
        { label: "Lead time", value: "Made to order — allow 3 to 5 weeks" },
      ],
    },
  },
];

/**
 * Pièces retirées de la vente : la chaise d'intérieur était vendue à perte
 * (Quentin, 06/10/2026 : « supprime que la chaise d'intérieur » ; le fauteuil
 * d'extérieur reste, son prix sera revu). Sa fiche reste écrite plus haut,
 * pour la remettre en vente une fois rechiffrée : il suffira de l'ôter de
 * cette liste. Tant qu'elle y est, ni le catalogue, ni l'accueil, ni le plan
 * du site, ni le panier, ni le paiement ne la connaissent, et son ancienne
 * adresse renvoie au catalogue (next.config.mjs).
 */
export const PIECES_RETIREES: ReadonlySet<string> = new Set(["chaise-acier-bois"]);

export const products: Product[] = catalogue.filter((p) => !PIECES_RETIREES.has(p.slug));

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

/**
 * Densité du bois massif, à l'humidité d'usage (12 % environ), en kg/m³.
 * Chiffres de référence pour chaque essence du catalogue ; le chêne sert de
 * repli quand l'essence n'est pas connue (les pièces sans bois, ou un
 * identifiant inattendu).
 */
const DENSITE_BOIS_KG_M3: Record<string, number> = {
  chene: 720,
  hetre: 720,
  pin: 500,
  noyer: 650,
};
function densiteBoisKgM3(woodId?: string): number {
  return (woodId && DENSITE_BOIS_KG_M3[woodId]) || DENSITE_BOIS_KG_M3.chene;
}

/**
 * Le piétement soudé d'une table, en kilos par mètre de longueur du plateau —
 * d'après le profil réellement écrit sur la fiche (« Piétement »). Un tube de
 * 80 × 80 mm, paroi 3 mm, pèse (80² − 74²) mm² × 7 850 kg/m³ ≈ 7,25 kg le
 * mètre ; un piétement soudé (deux appuis en diagonale, quelques traverses)
 * en emploie environ 2,2 fois la longueur du plateau, d'où le repli ci-
 * dessous. La table Brindille est plus fine : des tiges rondes d'environ
 * 12 mm, plus nombreuses. À AJUSTER par Quentin selon le métrage réel de
 * chaque piétement — ce ne sont que des estimations de plan.
 */
const PIETEMENT_KG_PAR_M: Record<string, number> = {
  "table-brindille": 4.5,
};
const PIETEMENT_KG_PAR_M_DEFAUT = 16; // tube 80 × 80 mm, paroi 3 mm

/** La part de la surface réellement occupée par le bois d'un plateau à lattes (le reste, ce sont les jours). */
const COUVERTURE_LATTES = 0.7;

/**
 * Un panneau de verre feuilleté de sécurité (environ 8 mm), au m². L'outil de
 * plans ne dessine pas encore le verre du garde-corps : son poids s'ajoute à
 * celui que l'outil donne pour la pièce (voir resolveSelection).
 */
export const VERRE_KG_PAR_M2 = 20;

/**
 * Les cotes au-delà desquelles aucun transporteur ne prend le colis.
 *
 * Un plafond lumineux voyage DEBOUT : sa longueur repose au sol, sa largeur
 * part à la verticale. Ce qui le limite n'est donc pas son poids mais son
 * encombrement, et la hauteur plus encore que la longueur. La quasi-totalité
 * des réseaux français s'arrêtent à 2,40 m de long et 2,20 m de haut ; le
 * coffrage bois ajoutant une dizaine de centimètres dans chaque sens, la
 * pièce nue ne doit pas dépasser 2,30 × 2,10 m.
 *
 * Ces valeurs sont volontairement prudentes : l'atelier n'a pas encore de
 * transporteur attitré, et mieux vaut un seuil que tout le monde accepte
 * qu'un colis refusé au départ. À remonter le jour où un transporteur est
 * choisi et où ses cotes réelles sont connues.
 */
export const TRANSPORT_MAX_GRANDE_COTE_MM = 2300;
export const TRANSPORT_MAX_PETITE_COTE_MM = 2100;

/**
 * Cette pièce peut-elle partir par transporteur, ou seule la pose est-elle
 * possible ?
 *
 * La pièce se pose debout dans le sens le plus favorable : on compare donc la
 * plus grande de ses deux cotes à la limite de longueur, et la plus petite à
 * la limite de hauteur.
 *
 * Ne concerne que les plafonds lumineux. Les autres familles partent
 * démontées ou à plat et n'ont pas cette contrainte — à revoir le jour où
 * l'on relèvera leurs fiches de fabrication.
 */
export function livrableParTransporteur(
  product: Product,
  cotes: { largeurMm?: number; hauteurMm?: number }
): boolean {
  if (product.category !== "lumiere") return true;
  const a = cotes.largeurMm ?? 0;
  const b = cotes.hauteurMm ?? a;
  // Sans cote saisie, on ne bloque rien : le client n'a encore rien choisi.
  if (!a) return true;
  const grande = Math.max(a, b);
  const petite = Math.min(a, b) || grande;
  return (
    grande <= TRANSPORT_MAX_GRANDE_COTE_MM && petite <= TRANSPORT_MAX_PETITE_COTE_MM
  );
}

/**
 * Le poids du colis d'une pièce, en kilos, pour chiffrer la livraison : le
 * plateau d'une table au volume réel de l'essence choisie, son piétement à
 * son métrage de tube, un plafond lumineux à la surface, une chaise à poids
 * fixe (colisKg). Estimation, jamais une pesée : à valider contre un vrai
 * colis. Le garde-corps n'est pas ici : son poids est celui de l'outil de
 * plans (le débit réel de sa configuration), calculé sur le serveur.
 */
export function poidsColisKg(
  product: Product,
  cotes: { largeurMm?: number; hauteurMm?: number; epaisseurMm?: number; woodId?: string; remplissageId?: string }
): number {
  if (prixParOutil(product)) throw new Error("poids du garde-corps : calculé par l'outil de plans, sur le serveur");
  if (product.colisKg) return product.colisKg;
  const bareme = product.surMesure;
  const L = (cotes.largeurMm && cotes.largeurMm > 0 ? cotes.largeurMm : bareme?.departMm?.[0] ?? 2000) / 1000;
  const W = (cotes.hauteurMm && cotes.hauteurMm > 0 ? cotes.hauteurMm : bareme?.departMm?.[1] ?? 1000) / 1000;
  const T = (cotes.epaisseurMm && cotes.epaisseurMm > 0 ? cotes.epaisseurMm : bareme?.epaisseur.refMm ?? 36) / 1000;
  if (product.category === "lumiere") {
    // Cadre aluminium, LED et toile : léger, et un peu de fixations.
    const surface = bareme?.forme === "rond" ? Math.PI * (L / 2) ** 2 : L * W;
    return Math.max(4, Math.round(surface * 6 + 4));
  }
  // Une table : le plateau au volume réel de l'essence choisie (à lattes,
  // 70 % de bois pour un plateau extérieur), le piétement soudé à part, et
  // quelques kilos d'emballage (carton, mousse, sangles).
  const couverture = product.famille === "table-exterieur" ? COUVERTURE_LATTES : 1;
  const plateauKg = L * W * T * densiteBoisKgM3(cotes.woodId) * couverture;
  const pietementKg = (PIETEMENT_KG_PAR_M[product.slug] ?? PIETEMENT_KG_PAR_M_DEFAUT) * L;
  return Math.round(plateauKg + pietementKg + 5);
}

/** La surface pour laquelle les écarts d'essence du catalogue sont écrits : 200 × 100. */
export const SURFACE_REFERENCE_M2 = 2;

/** La surface d'une taille, en m² ; une taille sans cotes vaut la référence. */
export function surfaceTailleM2(size: ProductSize | undefined, largeurMm?: number, hauteurMm?: number): number {
  if (size?.dimsMm) return (size.dimsMm[0] * size.dimsMm[1]) / 1e6;
  if (largeurMm && hauteurMm && largeurMm > 0 && hauteurMm > 0) return (largeurMm * hauteurMm) / 1e6;
  return SURFACE_REFERENCE_M2;
}

/**
 * L'écart de prix d'une essence, pour ce produit et cette surface : fixe
 * sur un escalier, proportionnel à la surface du plateau sur une table.
 * Arrondi à l'euro, le même dans le navigateur et sur le serveur.
 */
export function deltaBois(product: Product, wood: ProductSwatch | undefined, surfaceM2: number): number {
  const delta = wood?.priceDelta ?? 0;
  if (!product.boisAuM2 || !delta) return delta;
  // Arrondi à la dizaine d'euros : un écart de −371 € n'est pas un prix d'atelier.
  return Math.round((delta * surfaceM2) / SURFACE_REFERENCE_M2 / 10) * 10;
}

/**
 * L'essence servie par défaut : celle dont le supplément est nul (le chêne).
 * C'est elle qui est montrée sur la fiche et qui fait le prix affiché.
 */
export function essenceDeReference(product: Product): ProductSwatch | undefined {
  if (product.woods.length === 0) return undefined;
  return (
    product.woods.find((bois) => bois.id === product.boisParDefaut) ??
    product.woods.find((bois) => !bois.priceDelta) ??
    // Aucune essence à écart nul : faute de mieux, la moins chère.
    product.woods.reduce((a, b) => ((a.priceDelta ?? 0) <= (b.priceDelta ?? 0) ? a : b))
  );
}

/**
 * Prix « à partir de » : la configuration la moins chère — la plus petite
 * dimension, dans l'essence, la teinte et le tissu les moins chers. C'est
 * ce que le client verra s'il choisit tout au plus bas ; jamais un chiffre
 * qu'aucune configuration ne peut atteindre.
 */
export function priceFrom(product: Product): number | null {
  // Le garde-corps : son « à partir de » vient de l'outil de plans, sur le
  // serveur (prixDepart, src/lib/prix-garde-corps.server.ts). Ici, rien.
  if (prixParOutil(product)) return null;
  const moinsCher = (options: ProductSwatch[] | undefined) =>
    options && options.length > 0 ? Math.min(...options.map((o) => o.priceDelta ?? 0)) : 0;
  const boisMoinsCher =
    product.woods.length > 0
      ? product.woods.reduce((a, b) => ((a.priceDelta ?? 0) <= (b.priceDelta ?? 0) ? a : b))
      : undefined;
  const autres = moinsCher(product.metals) + moinsCher(product.fabrics);
  // Une pièce sans taille au catalogue : soit elle a un barème et des cotes de
  // départ, soit elle est sur devis et on n'annonce rien — jamais un chiffre
  // inventé.
  if (product.sizes.length === 0) {
    const bareme = product.surMesure;
    if (!bareme?.departMm) return null;
    const devis = devisSurMesure(product, bareme.departMm[0], bareme.departMm[1]);
    if (!devis.ok) return null;
    const surface = surfaceTailleM2(undefined, bareme.departMm[0], bareme.departMm[1]);
    return devis.prix + deltaBois(product, boisMoinsCher, surface) + autres;
  }
  const petite = product.sizes.reduce((a, b) => (a.price <= b.price ? a : b));
  return petite.price + deltaBois(product, boisMoinsCher, surfaceTailleM2(petite)) + autres;
}

/* ------------------------------------------------------------------ *
 *  Résolution d'une ligne de commande
 *  Utilisé côté serveur : le prix ne vient JAMAIS du navigateur, il est
 *  recalculé à partir du catalogue avant tout paiement.
 * ------------------------------------------------------------------ */

export type Selection = {
  slug: string;
  sizeId?: string;
  woodId?: string;
  metalId?: string;
  fabricId?: string;
  /** Le remplissage d'un garde-corps : imposé dès que la pièce en propose. */
  remplissageId?: string;
  /** Dimensions demandées, en millimètres, quand sizeId vaut « sur-mesure ». */
  largeurMm?: number;
  hauteurMm?: number;
  epaisseurMm?: number;
  /**
   * Le relevé d'un garde-corps de fenêtre (avec largeurMm) : l'allège, l'étage
   * et la hauteur de la fenêtre. C'est avec eux que le serveur recalcule la
   * forme et le prix ; hauteurMm, s'il est donné, doit être la hauteur que
   * l'outil retient (sinon la ligne est refusée : le client a vu autre chose).
   */
  allegeMm?: number;
  enEtage?: boolean;
  fenetreMm?: number;
  /** Garde-corps : le modèle choisi parmi ceux que la norme permet (« 16-3 »). Voir ReleveGC.modele. */
  modeleGc?: string;
  /** Garde-corps : le décor à volutes choisi (idDecorGC, « frise.S.bouton.colliers.carre.aucune.0 »). Il remplace le modèle. */
  decorGc?: string;
  /**
   * Garde-corps : le mur des tableaux (MURS_FIXATION_GC) et ses cotes en mm (ReleveGC.mur, tMurMm, eMurMm). La fixation
   * que l'outil y choisit entre dans le prix. Absent : la fixation d'avant (vis et chevilles). Une cote sans mur est refusée.
   */
  murGc?: string;
  tMurMm?: number;
  eMurMm?: number;
  /** Langue du libellé de la ligne. N'influence aucun prix. */
  locale?: Locale;
};

/** Identifiant réservé à une pièce fabriquée aux cotes du client. */
export const SUR_MESURE = "sur-mesure";

export type ResolvedLine = {
  product: Product;
  size: ProductSize;
  wood?: ProductSwatch;
  metal?: ProductSwatch;
  fabric?: ProductSwatch;
  remplissage?: Remplissage;
  /** Prix unitaire en euros, options comprises. */
  unitPrice: number;
  /** Résumé lisible des options, pour l'e-mail et le panier. */
  optionsLabel: string;
  image?: string;
  /** Un garde-corps de fenêtre : la forme retenue par l'outil de plans, et son poids. */
  gc?: {
    releve: ReleveGC;
    /** Le prix de l'outil seul, sans les suppléments d'option du site. */
    prixOutil: number;
    hauteurMm: number;
    croix: number;
    carre: number;
    soubassement: boolean;
    /** Une traverse au milieu de chaque croix. */
    traverse: boolean;
    /** Des barreaux sur toute la hauteur (en bas et dans chaque croix). */
    seuls: boolean;
    /** Fenêtre large : un fer plat caché sous la main courante raidit la lisse haute. */
    renfort: boolean;
    /** Le nombre de pattes scellées dans l'appui (0 à 4). */
    patte: number;
    /** Le diamètre de la rosace chiffrée, en mm : il compte pour la norme. */
    rosaceMm: number;
    /** La main courante DEMANDÉE (« chene ») : la remise sur la quantité se calcule sur elle, comme le prix et le devis (wood est celle qui sera fabriquée). */
    essence: string;
    /** Le poids d'une pièce : celui de l'outil, plus le verre s'il remplace les croix. */
    kg: number;
    /** Le décor à volutes (son identifiant est dans releve.decor) : son nom, celui de l'outil (« Frise de volutes en S »). */
    decorNom?: string;
    /** La frise basse demandée a été retirée par l'outil (au ras du sol). */
    decorFriseRetiree?: boolean;
    /** La fixation retenue dans le mur des tableaux, quand le client l'a donné (elle est dans le prix). */
    fixation?: FixationReleve;
  };
};

export type ResolveFailure =
  | "unknown_slug"
  | "not_orderable"
  | "unknown_size"
  | "unknown_wood"
  | "unknown_metal"
  | "unknown_fabric"
  | "unknown_remplissage"
  /** Un décor à volutes illisible, ou demandé sous un panneau de verre (le verre et le décor remplacent tous deux les croix). */
  | "unknown_decor"
  /** Un garde-corps de fenêtre que la norme ne laisse pas vendre tel quel : à étudier avec l'atelier. */
  | "a_etudier"
  /** La hauteur envoyée n'est pas celle que l'outil retient pour ce relevé. */
  | "hauteur"
  /** Le prix de cette pièce ne se calcule que sur le serveur (l'outil de plans). */
  | "prix_serveur"
  | "invalid_price";

export type ResolveResult =
  | { ok: true; line: ResolvedLine }
  | { ok: false; reason: ResolveFailure };

/**
 * Choisit une option dans une liste, en REFUSANT tout ce qui ne correspond pas.
 * Pas de repli sur la première option : un identifiant absent ou inconnu ferait
 * payer le pin (−260 € sur la table, −390 € sur l'escalier) à la place du chêne.
 */
function pickOption(
  list: ProductSwatch[] | undefined,
  id: string | undefined
): { ok: boolean; value?: ProductSwatch } {
  const options = list ?? [];
  if (options.length === 0) {
    // Produit sans cette famille d'options : un identifiant fourni est suspect.
    return { ok: !id };
  }
  if (!id) return { ok: false };
  const value = options.find((option) => option.id === id);
  return { ok: Boolean(value), value };
}

/**
 * Le remplissage demandé, en REFUSANT tout ce qui ne correspond pas — comme
 * pickOption. Un produit sans remplissage n'en accepte aucun.
 */
/**
 * Sous un panneau de verre, il n'y a plus de croix : plus de rosace à choisir
 * ni à payer. La fiche impose alors la première rosace (écart nul) ; le
 * serveur fait pareil, sinon un lien ou un panier forgé faisait payer un
 * médaillon que la pièce n'a pas.
 */
export function fabricSousRemplissage(product: Product, fabricId: string | undefined, remplissageId: string | undefined) {
  if (!product.fabricLabel || !product.fabrics?.length) return fabricId;
  const sansCroix = product.remplissages?.some((r) => r.id === remplissageId && r.sansCroix);
  return sansCroix ? product.fabrics[0].id : fabricId;
}

function remplissageDemande(
  product: Product,
  id: string | undefined
): { ok: boolean; value?: Remplissage } {
  const options = product.remplissages ?? [];
  if (options.length === 0) return { ok: !id };
  if (!id) return { ok: false };
  const value = options.find((option) => option.id === id);
  return { ok: Boolean(value), value };
}

/** Le supplément d'un remplissage, à la dizaine d'euros, pour un garde-corps l × h. */
export function supplementRemplissage(remplissage: Remplissage, largeurMm: number, hauteurMm: number) {
  if (!remplissage.forfait && !remplissage.parM2) return 0;
  const surface = surfaceM2("rect", largeurMm, hauteurMm);
  return Math.ceil((remplissage.forfait + remplissage.parM2 * surface) / 10) * 10;
}

/** Surface lumineuse en m², à partir de cotes en millimètres. */
export function surfaceM2(forme: SurMesure["forme"], largeurMm: number, hauteurMm: number) {
  return forme === "rond"
    ? (Math.PI * (largeurMm / 2) ** 2) / 1_000_000
    : (largeurMm * hauteurMm) / 1_000_000;
}

export type DevisRefus =
  | "pas_sur_mesure"
  | "cotes_invalides"
  | "trop_petit"
  | "trop_grand"
  | "epaisseur_hors_bornes"
  /** Plateau trop fin pour la longueur demandée : il plierait puis fendrait. */
  | "epaisseur_trop_fine"
  /** Caisson lumineux plus profond que le panneau n'est large. */
  | "caisson_trop_profond";

export type DevisSurMesure =
  | {
      ok: false;
      reason: DevisRefus;
      /** Phrase toute prête, en français d'atelier, pour l'afficher au client. */
      message: string;
      /** Épaisseur minimale attendue, quand c'est elle qui coince. */
      epaisseurMiniMm?: number;
    }
  | { ok: true; prix: number; surface: number; label: string };

/**
 * Épaisseur minimale d'un plateau pour la portée demandée.
 * Sans paliers (les plafonds lumineux, dont l'« épaisseur » est la profondeur
 * du caisson), c'est simplement la borne basse du barème.
 */
export function epaisseurMiniMm(bareme: SurMesure, longueurMm: number): number {
  const paliers = bareme.epaisseur.miniParLongueur;
  if (!paliers || paliers.length === 0) return bareme.epaisseur.minMm;
  const palier = paliers.find((p) => longueurMm <= p.jusquaMm) ?? paliers[paliers.length - 1];
  return Math.max(bareme.epaisseur.minMm, palier.miniMm);
}

/**
 * Le prix de la plus petite taille du catalogue qui englobe les cotes
 * demandées, dans les deux sens (une table de 90 × 190 est une 190 × 90
 * tournée). C'est le plafond du sur-mesure.
 *
 * Sans lui, une table d'un millimètre plus courte qu'une taille du catalogue
 * repassait au barème et coûtait jusqu'à 330 € DE PLUS qu'une table plus
 * grande : le client payait sa remise en moins. Personne ne doit jamais payer
 * davantage pour une pièce plus petite.
 */
function plafondCatalogue(product: Product, largeur: number, hauteur: number): number | null {
  const prix = product.sizes
    .filter((taille) => {
      const dims = taille.dimsMm;
      if (!dims) return false;
      return (
        (dims[0] >= largeur && dims[1] >= hauteur) || (dims[0] >= hauteur && dims[1] >= largeur)
      );
    })
    .map((taille) => taille.price);
  return prix.length ? Math.min(...prix) : null;
}

/**
 * Épaisseur maximale utilisable pour ces cotes.
 * Sur un plateau de bois, c'est simplement la borne du barème. Sur un caisson
 * lumineux, il ne peut pas être plus profond que le panneau n'est étroit :
 * la toile ne se tendrait plus et l'objet ressemblerait à une boîte.
 */
export function epaisseurMaxMm(bareme: SurMesure, largeurMm: number, hauteurMm: number): number {
  if (bareme.epaisseur.parM2Bande === undefined) return bareme.epaisseur.maxMm;
  return Math.min(bareme.epaisseur.maxMm, Math.min(largeurMm, hauteurMm));
}

/**
 * Prix d'une pièce aux cotes du client. Même fonction dans le navigateur et
 * sur le serveur : le prix affiché est celui qui sera facturé.
 */
export function devisSurMesure(
  product: Product,
  largeurMm: number,
  hauteurMm: number,
  epaisseurMm?: number,
  /** Langue du libellé rendu. Les prix et les refus, eux, ne changent jamais. */
  locale: Locale = "fr"
): DevisSurMesure {
  const bareme = product.surMesure;
  if (!bareme) {
    return {
      ok: false,
      reason: "pas_sur_mesure",
      message: "Cette pièce ne se fabrique pas aux cotes du client.",
    };
  }
  const rond = bareme.forme === "rond";

  const largeur = Math.round(largeurMm);
  // Un rond n'a qu'une cote : son diamètre.
  const hauteur = rond ? largeur : Math.round(hauteurMm);
  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur)) {
    return {
      ok: false,
      reason: "cotes_invalides",
      message: "Les cotes saisies ne sont pas des mesures valables.",
    };
  }
  if (largeur < bareme.minMm || hauteur < bareme.minMm) {
    return {
      ok: false,
      reason: "trop_petit",
      message: rond
        ? `Le plus petit diamètre que nous fabriquons est de ${bareme.minMm} mm.`
        : `La plus petite cote que nous fabriquons est de ${bareme.minMm} mm.`,
    };
  }
  if (largeur > bareme.maxLargeurMm || hauteur > bareme.maxHauteurMm) {
    return {
      ok: false,
      reason: "trop_grand",
      message: rond
        ? `Nous ne dépassons pas Ø ${bareme.maxLargeurMm} mm d'un seul tenant.`
        : `Nous ne dépassons pas ${bareme.maxLargeurMm} × ${bareme.maxHauteurMm} mm d'un seul tenant.`,
    };
  }

  const epaisseur = Math.round(epaisseurMm ?? bareme.epaisseur.refMm);
  if (
    !Number.isFinite(epaisseur) ||
    epaisseur < bareme.epaisseur.minMm ||
    epaisseur > bareme.epaisseur.maxMm
  ) {
    return {
      ok: false,
      reason: "epaisseur_hors_bornes",
      message: `L'épaisseur doit rester entre ${bareme.epaisseur.minMm} et ${bareme.epaisseur.maxMm} mm.`,
    };
  }
  // Quand l'atelier ne coupe qu'à certaines cotes, rien entre les deux.
  const choix = bareme.epaisseur.choixMm;
  if (choix && !choix.includes(epaisseur)) {
    return {
      ok: false,
      reason: "epaisseur_hors_bornes",
      message: `L'épaisseur se choisit parmi ${choix.join(", ")} mm.`,
    };
  }

  // Un caisson lumineux ne peut pas être plus profond que le panneau n'est
  // étroit : la toile ne se tend plus proprement et l'objet devient une boîte.
  // Sans ce garde-fou, un panneau de 30 × 30 cm acceptait 60 cm de profondeur.
  const maxCaisson = epaisseurMaxMm(bareme, largeur, hauteur);
  if (epaisseur > maxCaisson) {
    return {
      ok: false,
      reason: "caisson_trop_profond",
      message: `Sur un panneau de ${Math.min(largeur, hauteur)} mm, le caisson ne peut pas être plus profond que large : ${maxCaisson} mm au maximum.`,
    };
  }

  // Un plateau de bois massif doit s'épaissir avec sa portée : c'est la plus
  // grande cote qui décide. 25 mm sur 4 m de long, le plateau plie puis fend.
  const portee = Math.max(largeur, hauteur);
  const mini = epaisseurMiniMm(bareme, portee);
  if (epaisseur < mini) {
    return {
      ok: false,
      reason: "epaisseur_trop_fine",
      epaisseurMiniMm: mini,
      message: `Sur ${portee} mm de long, un plateau de ${epaisseur} mm plierait puis fendrait : il faut ${mini} mm au minimum.`,
    };
  }

  // Mêmes cotes ET même épaisseur qu'une taille du catalogue = même prix.
  const duCatalogue = product.sizes.find(
    (taille) =>
      taille.dimsMm?.[0] === largeur &&
      taille.dimsMm?.[1] === hauteur &&
      epaisseur === bareme.epaisseur.refMm
  );
  if (duCatalogue) {
    return {
      ok: true,
      prix: duCatalogue.price,
      surface: surfaceM2(bareme.forme, largeur, hauteur),
      label: duCatalogue.label,
    };
  }

  const surface = surfaceM2(bareme.forme, largeur, hauteur);
  // L'écart avec la référence joue dans les deux sens : un plateau plus fin
  // utilise vraiment moins de bois et coûte moins cher, un plateau plus épais
  // coûte plus cher. Le plafond du catalogue (plus bas) empêche quand même
  // une grande table sur mesure de tomber sous le prix d'une plus petite.
  const ecart = epaisseur - bareme.epaisseur.refMm;

  // Le plateau : chaque millimètre de bois en plus se paie au mètre carré.
  const parM2 = bareme.parM2 + (bareme.epaisseur.parM2ParMm ?? 0) * ecart;
  // Le caisson : seule la bande d'aluminium du pourtour s'allonge.
  const perimetre = rond ? (Math.PI * largeur) / 1000 : (2 * (largeur + hauteur)) / 1000;
  const bande = ((bareme.epaisseur.parM2Bande ?? 0) * perimetre * ecart) / 1000;

  // Arrondi à la dizaine d'euros supérieure : un prix rond, jamais sous-évalué.
  const pourtour = (bareme.parMetre ?? 0) * perimetre;
  const auBareme = Math.ceil((bareme.forfait + parM2 * surface + pourtour + bande) / 10) * 10;
  // Mais jamais plus cher que la taille du catalogue qui l'englobe. Le
  // supplément d'épaisseur, lui, reste dû : il correspond à de la matière.
  const plafond = plafondCatalogue(product, largeur, hauteur);
  const supplement = (bareme.epaisseur.parM2ParMm ?? 0) * ecart * surface + bande;
  const prix =
    plafond === null
      ? auBareme
      : Math.min(auBareme, Math.ceil((plafond + supplement) / 10) * 10);
  // Le libellé part tel quel dans le panier, sur la page de paiement Stripe et
  // sur la facture : il doit être écrit dans la langue du client, séparateur
  // décimal compris. Un anglophone qui lit « 2,40 m² » comprend 240 m².
  const langue = locale === "en" ? "en-GB" : "fr-FR";
  const cotes = rond
    ? `Ø ${largeur.toLocaleString(langue)} mm`
    : `${largeur.toLocaleString(langue)} × ${hauteur.toLocaleString(langue)} mm`;
  const m2 = locale === "en" ? surface.toFixed(2) : surface.toFixed(2).replace(".", ",");
  const prefixe = locale === "en" ? "Custom" : "Sur mesure";
  // Quand l'épaisseur n'est pas un choix (le garde-corps : sa main courante
  // fait 40 mm, point), la dire n'apprend rien — pas plus que la surface.
  const epaisseurChoisie = bareme.epaisseur.minMm !== bareme.epaisseur.maxMm;
  return {
    ok: true,
    prix,
    surface,
    label: epaisseurChoisie
      ? `${prefixe} — ${cotes} × ${epaisseur} mm (${m2} m²)`
      : `${prefixe} — ${cotes}`,
  };
}

/**
 * Prix unitaire d'une configuration, avec la MÊME sévérité que le serveur :
 * une taille inconnue ou une essence inconnue rendent `null`, jamais un prix
 * de repli. Avant, la fonction retombait en silence sur la première taille et
 * sur des suppléments nuls : le client voyait un prix qui n'était pas le sien.
 */
export function computeUnitPrice(
  product: Product,
  selection: Omit<Selection, "slug">
): number | null {
  // Le garde-corps : son prix ne se calcule que sur le serveur (/api/prix-garde-corps).
  if (prixParOutil(product)) return null;
  const size = tailleDemandee(product, selection);
  if (!size) return null;

  const wood = pickOption(product.woods, selection.woodId);
  if (!wood.ok) return null;
  const metal = pickOption(product.metals, selection.metalId);
  if (!metal.ok) return null;
  const fabric = pickOption(product.fabrics, fabricSousRemplissage(product, selection.fabricId, selection.remplissageId));
  if (!fabric.ok) return null;
  const remplissage = remplissageDemande(product, selection.remplissageId);
  if (!remplissage.ok) return null;

  const prix =
    size.price +
    deltaBois(product, wood.value, surfaceTailleM2(size, Number(selection.largeurMm), Number(selection.hauteurMm))) +
    (metal.value?.priceDelta ?? 0) +
    (fabric.value?.priceDelta ?? 0) +
    (remplissage.value && size.id === SUR_MESURE
      ? supplementRemplissage(remplissage.value, Number(selection.largeurMm), Number(selection.hauteurMm))
      : 0);
  return Number.isInteger(prix) && prix > 0 ? prix : null;
}

/**
 * La taille demandée : une taille du catalogue, ou la pièce aux cotes du
 * client. Aucun repli sur la première taille — sauf quand le produit n'en a
 * qu'une, où le choix est implicite.
 */
function tailleDemandee(
  product: Product,
  selection: Omit<Selection, "slug">
): ProductSize | undefined {
  // Le sur-mesure passe même sans taille au catalogue ; le reste, non.
  if (product.sizes.length === 0 && selection.sizeId !== SUR_MESURE) return undefined;
  if (selection.sizeId === SUR_MESURE) {
    const devis = devisSurMesure(
      product,
      Number(selection.largeurMm),
      Number(selection.hauteurMm),
      selection.epaisseurMm === undefined ? undefined : Number(selection.epaisseurMm),
      selection.locale
    );
    return devis.ok
      ? { id: SUR_MESURE, label: devis.label, price: devis.prix, dimsMm: [Number(selection.largeurMm), Number(selection.hauteurMm)] }
      : undefined;
  }
  if (product.sizes.length === 1 && !selection.sizeId) return product.sizes[0];
  return product.sizes.find((taille) => taille.id === selection.sizeId);
}

/**
 * Vérifie une sélection et calcule son prix, côté serveur.
 * Le navigateur n'envoie que des identifiants : tout montant reçu est ignoré.
 *
 * Le garde-corps de fenêtre demande `prixReleve`, le calcul de l'outil de
 * plans, que seul le serveur fournit (src/lib/prix-garde-corps.server.ts) :
 * sans lui, sa ligne est refusée (« prix_serveur »), jamais chiffrée ici.
 */
export function resolveSelection(selection: Selection, prixReleve?: PrixReleve): ResolveResult {
  const product = getProduct(selection.slug);
  if (!product) return { ok: false, reason: "unknown_slug" };
  if (product.orderMode !== "cart") return { ok: false, reason: "not_orderable" };
  if (prixParOutil(product)) return resoudreReleve(product, selection, prixReleve);
  // Sans taille au catalogue ni barème, il n'y a rien à vendre.
  if (product.sizes.length === 0 && !product.surMesure) {
    return { ok: false, reason: "unknown_size" };
  }

  // Taille imposée dès qu'il y a un choix ; sinon l'unique taille est implicite.
  // Exactement la même résolution que dans le navigateur : aucune divergence.
  const size = tailleDemandee(product, selection);
  if (!size) return { ok: false, reason: "unknown_size" };

  const wood = pickOption(product.woods, selection.woodId);
  if (!wood.ok) return { ok: false, reason: "unknown_wood" };
  const metal = pickOption(product.metals, selection.metalId);
  if (!metal.ok) return { ok: false, reason: "unknown_metal" };
  const fabric = pickOption(product.fabrics, fabricSousRemplissage(product, selection.fabricId, selection.remplissageId));
  if (!fabric.ok) return { ok: false, reason: "unknown_fabric" };
  const remplissage = remplissageDemande(product, selection.remplissageId);
  if (!remplissage.ok) return { ok: false, reason: "unknown_remplissage" };

  const unitPrice =
    size.price +
    deltaBois(product, wood.value, surfaceTailleM2(size, Number(selection.largeurMm), Number(selection.hauteurMm))) +
    (metal.value?.priceDelta ?? 0) +
    (fabric.value?.priceDelta ?? 0) +
    (remplissage.value && size.id === SUR_MESURE
      ? supplementRemplissage(remplissage.value, Number(selection.largeurMm), Number(selection.hauteurMm))
      : 0);
  if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
    return { ok: false, reason: "invalid_price" };
  }

  const optionsLabel = [
    product.sizes.length > 1 || size.id === SUR_MESURE ? size.label : null,
    wood.value?.label,
    metal.value?.label,
    fabric.value?.label,
    // Le remplissage du modèle va sans dire ; l'autre se lit sur le bon.
    remplissage.value && remplissage.value !== product.remplissages?.[0] ? remplissage.value.label : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    ok: true,
    line: {
      product,
      size,
      wood: wood.value,
      metal: metal.value,
      fabric: fabric.value,
      remplissage: remplissage.value,
      unitPrice,
      optionsLabel,
      image: fabric.value?.image ?? product.images[0]?.src,
    },
  };
}

/* ------------------------------------------------------------------ *
 *  Le garde-corps de fenêtre : chiffré par l'outil de plans
 *  Sa forme (hauteur à la norme, croix, carré, barreaux en partie basse)
 *  et son prix sont ceux de l'outil de l'atelier (décisions de Quentin du
 *  29/09). Ils se calculent sur le serveur seulement, parce que le calcul
 *  contient les coûts de l'atelier : ce fichier-ci, que le navigateur
 *  charge, n'en reçoit que le résultat, par `prixReleve`.
 * ------------------------------------------------------------------ */

/** Le prix de cette pièce vient-il de l'outil de plans (le garde-corps de fenêtre) ? */
export function prixParOutil(product: Product): boolean {
  return product.releve === "garde-corps-fenetre";
}

/** La fixation que l'outil retient dans le mur des tableaux : le mur, le montage (« tige », « platine »…) et son statut. */
export type FixationReleve = { mur: MurFixationGC; mode: string; statut: StatutFixationGC };

/** Ce que l'outil de plans répond pour un relevé et une essence (fourni par le serveur). */
export type ReponseReleve =
  | {
      ok: true;
      /** Le prix conseillé de l'outil, en euros entiers. */
      prix: number;
      hauteurMm: number;
      croix: number;
      carre: number;
      soubassement: boolean;
      /** Une traverse au milieu de chaque croix. */
      traverse: boolean;
      /** Des barreaux sur toute la hauteur (en bas et dans chaque croix). */
      seuls: boolean;
      /** Fenêtre large : un fer plat caché sous la main courante raidit la lisse haute. */
      renfort: boolean;
      /** Le nombre de pattes scellées dans l'appui (0 à 4). */
      patte?: number;
      /** Le poids d'une pièce, en kilos (celui de l'outil). */
      kg: number;
      /** Avec un décor à volutes : son nom, celui de l'outil (« Frise de volutes en S »). */
      decorNom?: string;
      /** La frise basse demandée a été retirée par l'outil (au ras du sol, elle ferait des marches) : le libellé ne la cite pas. */
      decorFriseRetiree?: boolean;
      /** La fixation retenue dans le mur, quand un mur est donné. */
      fixation?: FixationReleve;
    }
  | { ok: false; raison: "a-etudier" | "fenetre-trop-basse" | "hors-bornes" };
export type PrixReleve = (releve: ReleveGC & { essence: string; rosaceMm?: number }) => ReponseReleve;

/** Un entier de millimètres, ou rien. */
const mmEntier = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : undefined);

/** Le montage de la fixation, en deux mots pour le libellé de la commande (les modes de l'outil : fixationMurGC). */
const MONTAGES_LIBELLE: Readonly<Record<string, { fr: string; en: string }>> = {
  tige: { fr: "tiges M8 scellées", en: "bonded M8 rods" },
  platine: { fr: "platines scellées", en: "bonded fixing plates" },
  platines: { fr: "platines scellées", en: "bonded fixing plates" },
  traversant: { fr: "ancrage traversant", en: "through-wall anchors" },
};

/**
 * « , fixation béton : tiges M8 scellées » : la fixation retenue dans le mur des tableaux, pour que le bon de commande
 * dise ce qui est vendu (le prix la comprend). « à confirmer » quand le prix est indicatif (mur inconnu).
 * Avec elle, le libellé le plus long dépasse 500 signes (550) : Stripe le garde en entier (libelle-stripe.ts, un test le vérifie).
 */
function libelleFixation(f: { mur: MurFixationGC; mode?: string; statut?: StatutFixationGC } | undefined, locale: Locale): string {
  if (!f) return "";
  const en = locale === "en";
  const nom = NOMS_MUR_FIXATION_GC[f.mur][en ? "en" : "fr"];
  const montage = f.mode !== undefined && Object.hasOwn(MONTAGES_LIBELLE, f.mode) ? MONTAGES_LIBELLE[f.mode][en ? "en" : "fr"] : null;
  const confirmer = f.statut === "indicatif" ? (en ? " (to be confirmed)" : " (à confirmer)") : "";
  return en ? `, ${nom} wall fixing${montage ? `: ${montage}` : ""}${confirmer}` : `, fixation ${nom}${montage ? ` : ${montage}` : ""}${confirmer}`;
}

/**
 * « Sur mesure — 1 180 × 285 mm, 4 croix, traverse au milieu, barreaux en bas, acier carré de 16 », dans la langue du client
 * (et « , lisse haute renforcée » quand la fenêtre est large : un fer plat caché sous la main courante ; et la fixation
 * retenue dans le mur, quand le client l'a donné).
 * Le libellé part sur le bon de commande : il doit dire CE QUI EST VENDU. Deux modèles à des prix différents
 * (avec ou sans barreaux en bas, carré de 16 ou de 18) portaient le même libellé : l'atelier ne pouvait les
 * distinguer que par le prix.
 */
export function libelleGardeCorps(
  largeurMm: number,
  hauteurMm: number,
  croix: number | null,
  locale: Locale = "fr",
  modele: { soubassement?: boolean; carre?: number; traverse?: boolean; renfort?: boolean; seuls?: boolean; patte?: number; decor?: string; fixation?: { mur: MurFixationGC; mode?: string; statut?: StatutFixationGC } } = {}
) {
  const langue = locale === "en" ? "en-GB" : "fr-FR";
  const cotes = `${largeurMm.toLocaleString(langue)} × ${hauteurMm.toLocaleString(langue)} mm`;
  const prefixe = locale === "en" ? "Custom" : "Sur mesure";
  const renfort = (modele.renfort ? (locale === "en" ? ", reinforced top rail" : ", lisse haute renforcée") : "")
    + (!modele.patte ? "" : modele.patte > 1
      ? (locale === "en" ? `, ${modele.patte} fixing bars sealed into the sill` : `, ${modele.patte} pattes scellées dans l'appui`)
      : (locale === "en" ? ", middle fixing bar sealed into the sill" : ", patte au milieu scellée dans l'appui"))
    + libelleFixation(modele.fixation, locale);
  if (croix === null) return `${prefixe} — ${cotes}${renfort}`;
  const mot = locale === "en" ? (croix > 1 ? "crosses" : "cross") : "croix";
  const traverse = modele.traverse ? (locale === "en" ? ", middle rail" : ", traverse au milieu") : "";
  const barreaux = modele.soubassement && !modele.seuls ? (locale === "en" ? ", bars below" : ", barreaux en bas") : "";
  const carre = modele.carre ? (locale === "en" ? `, ${modele.carre} mm square bar` : `, acier carré de ${modele.carre}`) : "";
  // Un décor à volutes : son nom à la place des croix ou des barreaux (il est posé dans le cadre des barreaux seuls).
  if (modele.decor) return `${prefixe} — ${cotes}, ${modele.decor.charAt(0).toLowerCase()}${modele.decor.slice(1)}${carre}${renfort}`;
  // Barreaux seuls : des barreaux verticaux et rien d'autre, aucune croix à compter.
  if (modele.seuls) return `${prefixe} — ${cotes}, ${locale === "en" ? "vertical bars only" : "barreaux seuls"}${carre}${renfort}`;
  return `${prefixe} — ${cotes}, ${croix} ${mot}${traverse}${barreaux}${carre}${renfort}`;
}

/**
 * La ligne d'un garde-corps de fenêtre : les options vérifiées comme pour
 * toute pièce, la forme et le prix de l'outil pour ce relevé, puis les
 * suppléments du site que l'outil ne chiffre pas encore (rosace, teinte,
 * verre : décision du 29/09). L'essence n'a pas d'écart : l'outil la chiffre.
 */
function resoudreReleve(product: Product, selection: Selection, prixReleve?: PrixReleve): ResolveResult {
  if (selection.sizeId !== undefined && selection.sizeId !== SUR_MESURE) return { ok: false, reason: "unknown_size" };
  const largeurMm = mmEntier(selection.largeurMm);
  const allegeMm = mmEntier(selection.allegeMm);
  const fenetreMm = selection.fenetreMm === undefined ? 0 : mmEntier(selection.fenetreMm);
  if (largeurMm === undefined || allegeMm === undefined || fenetreMm === undefined || typeof selection.enEtage !== "boolean") {
    return { ok: false, reason: "unknown_size" };
  }

  const wood = pickOption(product.woods, selection.woodId);
  if (!wood.ok || !wood.value) return { ok: false, reason: "unknown_wood" };
  const metal = pickOption(product.metals, selection.metalId);
  if (!metal.ok) return { ok: false, reason: "unknown_metal" };
  const fabric = pickOption(product.fabrics, fabricSousRemplissage(product, selection.fabricId, selection.remplissageId));
  if (!fabric.ok) return { ok: false, reason: "unknown_fabric" };
  const remplissage = remplissageDemande(product, selection.remplissageId);
  if (!remplissage.ok) return { ok: false, reason: "unknown_remplissage" };

  // Le décor à volutes (06/10/2026) : illisible, refusé ; sous un panneau de verre aussi (le verre et le décor remplacent tous
  // deux les croix : une ligne forgée ne doit pas obtenir l'un au prix de l'autre).
  const decor = selection.decorGc === undefined ? null : lireDecorGC(selection.decorGc);
  if (selection.decorGc !== undefined && (!decor || remplissage.value?.sansCroix === true)) return { ok: false, reason: "unknown_decor" };
  // Le Garde-corps forgé à volutes se vend avec un décor, toujours ; le garde-corps Rosace, jamais (07/10/2026).
  if ((product.decorsGC === true) !== (decor !== null)) return { ok: false, reason: "unknown_decor" };

  if (!prixReleve) return { ok: false, reason: "prix_serveur" };
  if (selection.modeleGc !== undefined && !lireModeleGC(selection.modeleGc)) return { ok: false, reason: "unknown_size" };
  // Le mur des tableaux (facultatif) : un mur de la liste de l'outil, des cotes entières dans leurs bornes, jamais une cote
  // sans mur. Illisible : refusé, jamais remplacé en silence (la fixation change le prix).
  const mur = { mur: selection.murGc, tMurMm: selection.tMurMm, eMurMm: selection.eMurMm };
  if (!murDansLesBornes(mur)) return { ok: false, reason: "unknown_size" };
  const releve: ReleveGC = {
    largeurMm, allegeMm, enEtage: selection.enEtage, fenetreMm,
    // Sous un panneau de verre il n'y a plus de croix : le dessin choisi ne compte pas. (Sinon une requête
    // forgée obtenait le verre au prix du dessin le moins cher — 680 € au lieu de 860 € sur une fenêtre de 1 180.)
    // Avec un décor non plus : c'est le décor qui remplit le cadre.
    ...(selection.modeleGc !== undefined && remplissage.value?.sansCroix !== true && !decor ? { modele: selection.modeleGc } : {}),
    ...(decor ? { decor: idDecorGC(decor) } : {}),
    // Le mur (vérifié juste au-dessus) : l'outil y choisit la fixation et la chiffre.
    ...champsMurGC(mur as MurReleveGC),
  };
  // La rosace choisie compte pour la norme (son diamètre bouche le centre des croix) ; sous verre, il n'y en a pas : la fleur.
  // Avec un décor non plus (pas de croix) : la rosace par défaut, sans supplément.
  const rosaceMm = remplissage.value?.sansCroix === true || decor ? diametreRosaceGC(undefined) : diametreRosaceGC(fabric.value?.id);
  const r = prixReleve({ ...releve, essence: wood.value.id, rosaceMm });
  if (!r.ok) return { ok: false, reason: r.raison === "hors-bornes" ? "unknown_size" : "a_etudier" };
  if (selection.hauteurMm !== undefined && selection.hauteurMm !== r.hauteurMm) return { ok: false, reason: "hauteur" };

  // Fenêtre large : l'outil pose lui-même le bois sur un fer plat. La ligne dit ce qui sera fabriqué (« Chêne, sur fer plat »),
  // pas le « rainuré » demandé : même prix, même devis.
  const mc = lireMainCouranteGC(wood.value.id);
  const boisFabrique = (r.renfort && mc?.type === "bois-rainure" && mc.essence ? product.woods.find((w) => w.id === idMainCouranteGC("bois-plat", mc.essence!)) : undefined) ?? wood.value;
  const verre = remplissage.value?.sansCroix === true;
  // Un panneau de verre remplace les croix : sur un cadre à barreaux seuls (bas de fenêtre haut), il n'y a rien à remplacer.
  if (verre && r.seuls) return { ok: false, reason: "a_etudier" };
  const supplementVerre = verre && remplissage.value ? supplementRemplissage(remplissage.value, largeurMm, r.hauteurMm) : 0;
  // Sans croix (verre, barreaux seuls, décor à volutes) il n'y a pas de rosace : son supplément ne s'applique pas.
  const sansRosace = verre || r.seuls || decor !== null;
  // Le nom du décor dans la langue du client : celui de l'outil en français, sa traduction en anglais.
  const decorNom = decor ? (r.decorNom ?? DECORS_GC.assemblages.find((a) => a.id === decor.assemblage)?.nom ?? "") : undefined;
  const decorLibelle = decor ? (selection.locale === "en" ? nomDecorAnglaisGC(decor) : decorNom) : undefined;
  const unitPrice = r.prix + (metal.value?.priceDelta ?? 0) + (sansRosace ? 0 : fabric.value?.priceDelta ?? 0) + supplementVerre;
  if (!Number.isInteger(unitPrice) || unitPrice <= 0) return { ok: false, reason: "invalid_price" };

  const size: ProductSize = {
    id: SUR_MESURE,
    label: libelleGardeCorps(largeurMm, r.hauteurMm, verre ? null : r.croix, selection.locale, { soubassement: r.soubassement, carre: r.carre, traverse: r.traverse, renfort: r.renfort, seuls: r.seuls, patte: r.patte, decor: decorLibelle, fixation: r.fixation }),
    price: r.prix,
    dimsMm: [largeurMm, r.hauteurMm],
  };
  const optionsLabel = [
    size.label,
    boisFabrique.label,
    metal.value?.label,
    sansRosace ? null : fabric.value?.label,
    remplissage.value && remplissage.value !== product.remplissages?.[0] ? remplissage.value.label : null,
    // Les finitions du décor : l'atelier lit exactement quoi fabriquer (bouts, colliers, barreaux, frise basse, dorure) — ce que
    // l'outil a posé : une frise basse qu'il a retirée n'est pas écrite.
    decor ? finitionsDecorGC(r.decorFriseRetiree ? { ...decor, friseBasse: "aucune" } : decor, selection.locale === "en" ? "en" : "fr").join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    ok: true,
    line: {
      product,
      size,
      wood: boisFabrique,
      metal: metal.value,
      fabric: fabric.value,
      remplissage: remplissage.value,
      unitPrice,
      optionsLabel,
      image: fabric.value?.image ?? product.images[0]?.src,
      gc: {
        releve,
        prixOutil: r.prix,
        hauteurMm: r.hauteurMm,
        croix: r.croix,
        carre: r.carre,
        soubassement: r.soubassement,
        traverse: r.traverse,
        seuls: r.seuls,
        renfort: r.renfort,
        patte: r.patte ?? 0,
        rosaceMm,
        essence: wood.value.id,
        kg: r.kg + (verre ? ((largeurMm * r.hauteurMm) / 1e6) * VERRE_KG_PAR_M2 : 0),
        ...(decorNom !== undefined ? { decorNom } : {}),
        ...(r.decorFriseRetiree ? { decorFriseRetiree: true } : {}),
        ...(r.fixation ? { fixation: r.fixation } : {}),
      },
    },
  };
}

/* ------------------------------------------------------------------ *
 *  Le catalogue dans la langue du visiteur
 *  Le français reste la version d'origine : on pose simplement la
 *  traduction par-dessus, champ par champ. Ce qui n'est pas traduit
 *  reste en français plutôt que de disparaître de la page.
 * ------------------------------------------------------------------ */

/** Libellé d'une matière (bois, acier, velours) dans la langue demandée. */
function swatchLocalise(swatch: ProductSwatch, locale: Locale): ProductSwatch {
  return locale === "en" && swatch.labelEn ? { ...swatch, label: swatch.labelEn } : swatch;
}

/**
 * Un produit dont tous les textes visibles sont dans la langue demandée.
 * En français, c'est le produit d'origine, tel quel.
 */
export function productLocalise(product: Product, locale: Locale): Product {
  if (locale !== "en") return product;
  const en = product.en;
  return {
    ...product,
    name: en?.name ?? product.name,
    tagline: en?.tagline ?? product.tagline,
    seoMots: en?.seoMots ?? product.seoMots,
    seoTitre: en?.seoTitre,
    motsCles: en?.motsCles ?? product.motsCles,
    // Pas de repli sur le français : sans traduction, la fiche anglaise
    // assemble sa description à partir de l'accroche, déjà traduite.
    seoDescription: en?.seoDescription,
    images: product.images.map((image, i) => ({ ...image, alt: en?.images?.[i] ?? image.alt })),
    photosDescriptif: product.photosDescriptif?.map((photo, i) => ({
      ...photo,
      alt: en?.photosDescriptif?.[i] ?? photo.alt,
    })),
    sizes: product.sizes.map((taille) => ({
      ...taille,
      label: en?.sizes?.[taille.id] ?? taille.label,
    })),
    formatsDevis: product.formatsDevis && {
      ...product.formatsDevis,
      tailles: product.formatsDevis.tailles.map((taille) => ({
        ...taille,
        label: en?.sizes?.[taille.id] ?? taille.label,
      })),
    },
    sections: product.sections.map((section, i) => ({
      ...section,
      title: en?.sections?.[i]?.title ?? section.title,
      body: en?.sections?.[i]?.body ?? section.body,
    })),
    specs: product.specs.map((spec, i) => en?.specs?.[i] ?? spec),
    woods: product.woods.map((bois) => swatchLocalise(bois, locale)),
    metals: product.metals.map((acier) => swatchLocalise(acier, locale)),
    fabrics: product.fabrics?.map((velours) => swatchLocalise(velours, locale)),
    remplissages: product.remplissages?.map((remplissage) =>
      locale === "en" && remplissage.labelEn ? { ...remplissage, label: remplissage.labelEn } : remplissage
    ),
  };
}
