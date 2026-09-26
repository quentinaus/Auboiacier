import type { Locale } from "@/lib/i18n";

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
  minMm: number;
  maxLargeurMm: number;
  maxHauteurMm: number;
  /**
   * Cotes de la pièce « à partir de », pour une pièce qui n'a aucune taille au
   * catalogue : c'est le prix de ces cotes-là que la boutique annonce.
   */
  departMm?: [number, number];
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
 * courante. Les croix sont celles du modèle ; le verre feuilleté remplace les
 * croix quand la hauteur demandée laisserait des vides hors norme.
 */
export type Remplissage = {
  id: string;
  label: string;
  labelEn?: string;
  /** Supplément : un forfait, plus un prix au m² de garde-corps. */
  forfait: number;
  parM2: number;
  /**
   * Au-delà de cette hauteur de garde-corps, les vides de ce remplissage ne
   * respectent plus la norme (NF P01-012 : une sphère de 110 mm ne doit pas
   * passer). Sans borne, le remplissage est plein : toujours conforme.
   */
  hauteurMaxConformeMm?: number;
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
   * la largeur entre tableaux et la hauteur d'allège, et déduit la hauteur que
   * la règle impose — de quoi fabriquer au millimètre sans se déplacer.
   */
  releve?: "escalier" | "garde-corps-fenetre";
  /**
   * L'atelier peut venir prendre les cotes à la place du client. Le client
   * donne son code postal ; le déplacement est offert près de Saumur, forfait
   * au-delà (voir src/lib/deplacement.ts).
   */
  priseDeCotes?: boolean;
  /**
   * Prix de lot : à partir de `desPieces` exemplaires dans la même commande —
   * toutes cotes confondues, une fenêtre après l'autre — chaque exemplaire
   * est remisé de `taux`. Appliqué par le serveur (voir remiseLot).
   */
  remiseLot?: { desPieces: number; taux: number };
  /**
   * Deux ou trois mots de métier pour le titre affiché par Google.
   * Le nom d'un modèle — « Brindille », « Halo » — n'est tapé par personne :
   * ce sont « table acier chêne » et « plafond lumineux » que l'on cherche.
   */
  seoMots?: string;
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
    /* Ces fichiers portent « -vN » : à chaque nouvelle génération des photos,
       N augmente. L'optimiseur d'images garde une photo un an (voir
       next.config.mjs) : sous le même nom, il resservirait l'ancienne. */
    /** Teinte de pieds montrée par cette vignette : la cliquer la sélectionne. */
    metal?: string;
    /** Coloris de velours montré par cette vignette : la cliquer le sélectionne. */
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
  /** Coloris de velours, pour les assises garnies. */
  fabrics?: ProductSwatch[];
  /** Les remplissages possibles d'un garde-corps, le premier étant celui du modèle. */
  remplissages?: Remplissage[];
  /** Remplace « Coloris du velours » quand `fabrics` sert à autre chose (les rosaces d'un garde-corps). */
  fabricLabel?: { fr: string; en: string };
  /** Remplace « Couleur des pieds » quand la pièce n'a pas de pieds. */
  metalLabel?: { fr: string; en: string };
  /** Intitulé du groupe des essences quand « plateau » ne convient pas (marches d'escalier). */
  woodLabel?: { fr: string; en: string };
  /**
   * La pièce peut être livrée ET posée par l'atelier, sur un seul trajet :
   * la fiche propose le choix, prix selon le code postal (src/lib/deplacement.ts).
   * La livraison seule reste comprise dans le prix de la pièce.
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
  /** Description pour Google, en anglais (voir Product.seoDescription). */
  seoDescription?: string;
  /** Description (alt) de chaque photo, dans l'ordre de `images`. */
  images?: string[];
  /** Libellé de chaque taille, par identifiant. */
  sizes?: Record<string, string>;
  sections?: { title: string; body: string }[];
  specs?: ProductSpec[];
  /** Description (alt) des photos réservées aux blocs descriptifs. */
  photosDescriptif?: string[];
};

/* ------------------------------------------------------------------ *
 *  Essences de bois
 *  La pastille est un disque de fil de bois calculé par
 *  scripts/echantillons.py (public/images/echantillons/bois-*.webp).
 *  `deltas` donne l'écart de prix par produit — un même bois ne pèse pas
 *  pareil sur une chaise et sur un escalier.
 * ------------------------------------------------------------------ */
type WoodId = "pin" | "hetre" | "chene" | "noyer";

const WOOD_GRAIN: Record<
  WoodId,
  { label: string; labelEn: string; swatch: string; grain: string }
> = {
  pin: {
    label: "Pin",
    labelEn: "Pine",
    swatch: "#e0bd85",
    grain: "url(/images/echantillons/bois-pin-v2.webp)",
  },
  hetre: {
    label: "Hêtre",
    labelEn: "Beech",
    swatch: "#dcc0a0",
    grain: "url(/images/echantillons/bois-hetre-v2.webp)",
  },
  chene: {
    label: "Chêne",
    labelEn: "Oak",
    swatch: "#c19a5e",
    grain: "url(/images/echantillons/bois-chene-v2.webp)",
  },
  noyer: {
    label: "Noyer",
    labelEn: "Walnut",
    swatch: "#6b452c",
    grain: "url(/images/echantillons/bois-noyer-v2.webp)",
  },
};

/** Construit la liste d'essences d'un produit avec ses écarts de prix. */
function woods(deltas: Partial<Record<WoodId, number>>): ProductSwatch[] {
  return (Object.keys(deltas) as WoodId[]).map((id) => ({
    id,
    label: WOOD_GRAIN[id].label,
    labelEn: WOOD_GRAIN[id].labelEn,
    swatch: WOOD_GRAIN[id].swatch,
    grain: WOOD_GRAIN[id].grain,
    priceDelta: deltas[id] ?? 0,
  }));
}

/* ------------------------------------------------------------------ *
 *  Finitions de l'acier
 *  Comme le bois, la pastille est une image calculée par
 *  scripts/echantillons.py : une bille de peinture, éclairée.
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
  { label: string; labelEn: string; swatch: string; grain: string }
> = {
  noir: {
    label: "Noir charbon",
    labelEn: "Charcoal black",
    swatch: "#1c1a18",
    grain: "url(/images/echantillons/metal-noir.webp)",
  },
  gris: {
    label: "Gris acier",
    labelEn: "Steel grey",
    swatch: "#46453f",
    grain: "url(/images/echantillons/metal-gris.webp)",
  },
  chocolat: {
    label: "Chocolat",
    labelEn: "Chocolate",
    swatch: "#463831",
    grain: "url(/images/echantillons/metal-chocolat.webp)",
  },
  laiton: {
    label: "Laiton",
    labelEn: "Brass",
    swatch: "#8c7c3f",
    grain: "url(/images/echantillons/metal-laiton.webp)",
  },
  lin: {
    label: "Lin clair",
    labelEn: "Pale linen",
    swatch: "#cfc9b6",
    grain: "url(/images/echantillons/metal-lin.webp)",
  },
  blanc: {
    label: "Blanc",
    labelEn: "White",
    swatch: "#f0efeb",
    grain: "url(/images/echantillons/metal-blanc.webp)",
  },
  brut: {
    label: "Acier brut verni",
    labelEn: "Varnished raw steel",
    swatch: "#8a8578",
    grain: "url(/images/echantillons/metal-acier-brut.webp)",
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
 * ------------------------------------------------------------------ */

export const fabrics: ProductSwatch[] = [
  {
    id: "bleu-roi",
    label: "Bleu roi 660",
    labelEn: "Royal blue 660",
    swatch: "#304d78",
    grain: "url(/images/echantillons/velours-bleu-roi.webp)",
    image: "/images/chaises/bleu-roi.jpg",
  },
  {
    id: "sacramento",
    label: "Sacramento 795",
    labelEn: "Sacramento 795",
    swatch: "#365055",
    grain: "url(/images/echantillons/velours-sacramento.webp)",
    image: "/images/chaises/sacramento.jpg",
  },
  {
    id: "vert-bouteille",
    label: "Vert bouteille 775",
    labelEn: "Bottle green 775",
    swatch: "#706e3b",
    grain: "url(/images/echantillons/velours-vert-bouteille.webp)",
    image: "/images/chaises/vert-bouteille.jpg",
  },
  {
    id: "endive",
    label: "Endive 720",
    labelEn: "Endive 720",
    swatch: "#cec68d",
    grain: "url(/images/echantillons/velours-endive.webp)",
    image: "/images/chaises/endive.jpg",
  },
  {
    id: "paon",
    label: "Paon 710",
    labelEn: "Peacock 710",
    swatch: "#1f5c64",
    grain: "url(/images/echantillons/velours-paon.webp)",
    image: "/images/chaises/paon.jpg",
  },
  {
    id: "minuit",
    label: "Minuit 690",
    labelEn: "Midnight 690",
    swatch: "#3d4563",
    grain: "url(/images/echantillons/velours-minuit.webp)",
    image: "/images/chaises/minuit.jpg",
  },
  {
    id: "prune",
    label: "Prune 580",
    labelEn: "Plum 580",
    swatch: "#693d4d",
    grain: "url(/images/echantillons/velours-prune.webp)",
    image: "/images/chaises/prune.jpg",
  },
  {
    id: "vieux-rose",
    label: "Vieux rose 510",
    labelEn: "Old rose 510",
    swatch: "#915f57",
    grain: "url(/images/echantillons/velours-vieux-rose.webp)",
    image: "/images/chaises/vieux-rose.jpg",
  },
  {
    id: "terre-de-sienne",
    label: "Terre de Sienne 390",
    labelEn: "Burnt sienna 390",
    swatch: "#844c2c",
    grain: "url(/images/echantillons/velours-terre-de-sienne.webp)",
    image: "/images/chaises/terre-de-sienne.jpg",
  },
  {
    id: "ocre",
    label: "Ocre 350",
    labelEn: "Ochre 350",
    swatch: "#a0722c",
    grain: "url(/images/echantillons/velours-ocre.webp)",
    image: "/images/chaises/ocre.jpg",
  },
  {
    id: "champagne",
    label: "Champagne 215",
    labelEn: "Champagne 215",
    swatch: "#bfa37b",
    grain: "url(/images/echantillons/velours-champagne.webp)",
    image: "/images/chaises/champagne.jpg",
  },
  {
    id: "noir",
    label: "Noir 199",
    labelEn: "Black 199",
    swatch: "#454544",
    grain: "url(/images/echantillons/velours-noir.webp)",
    image: "/images/chaises/noir.jpg",
  },
  {
    id: "onyx",
    label: "Onyx 190",
    labelEn: "Onyx 190",
    // L'onyx tire vers le gris-bleu, le Noir 199 reste neutre : les deux
    // pastilles étaient à deux points l'une de l'autre, donc identiques à l'œil.
    swatch: "#4a4b52",
    grain: "url(/images/echantillons/velours-onyx.webp)",
    image: "/images/chaises/onyx.jpg",
  },
  {
    id: "dune",
    label: "Dune 165",
    labelEn: "Dune 165",
    swatch: "#b99971",
    grain: "url(/images/echantillons/velours-dune.webp)",
    image: "/images/chaises/dune.jpg",
  },
  {
    id: "cendre",
    label: "Cendre 130",
    labelEn: "Ash 130",
    swatch: "#746a67",
    grain: "url(/images/echantillons/velours-cendre.webp)",
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
/** Le plus grand panneau d'un seul tenant chez le fournisseur, en mm. */
const PLATEAU_MAX_LONGUEUR_MM = 4500;
const PLATEAU_MAX_LARGEUR_MM = 1250;

export const products: Product[] = [
  {
    slug: "table-mikado",
    poseOption: true,
    boisAuM2: true,
    famille: "table-interieur",
    seoMots: "table acier & chêne",
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
            noir: "/images/mikado/devant/noir-pin-v5.jpg",
            gris: "/images/mikado/devant/gris-pin-v5.jpg",
            chocolat: "/images/mikado/devant/chocolat-pin-v5.jpg",
            laiton: "/images/mikado/devant/laiton-pin-v5.jpg",
            lin: "/images/mikado/devant/lin-pin-v5.jpg",
            blanc: "/images/mikado/devant/blanc-pin-v5.jpg",
          },
          hetre: {
            noir: "/images/mikado/devant/noir-hetre-v5.jpg",
            gris: "/images/mikado/devant/gris-hetre-v5.jpg",
            chocolat: "/images/mikado/devant/chocolat-hetre-v5.jpg",
            laiton: "/images/mikado/devant/laiton-hetre-v5.jpg",
            lin: "/images/mikado/devant/lin-hetre-v5.jpg",
            blanc: "/images/mikado/devant/blanc-hetre-v5.jpg",
          },
          noyer: {
            noir: "/images/mikado/devant/noir-noyer-v5.jpg",
            gris: "/images/mikado/devant/gris-noyer-v5.jpg",
            chocolat: "/images/mikado/devant/chocolat-noyer-v5.jpg",
            laiton: "/images/mikado/devant/laiton-noyer-v5.jpg",
            lin: "/images/mikado/devant/lin-noyer-v5.jpg",
            blanc: "/images/mikado/devant/blanc-noyer-v5.jpg",
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
            noir: "/images/mikado/coupe/noir-pin-v5.jpg",
            gris: "/images/mikado/coupe/gris-pin-v5.jpg",
            chocolat: "/images/mikado/coupe/chocolat-pin-v5.jpg",
            laiton: "/images/mikado/coupe/laiton-pin-v5.jpg",
            lin: "/images/mikado/coupe/lin-pin-v5.jpg",
            blanc: "/images/mikado/coupe/blanc-pin-v5.jpg",
          },
          hetre: {
            noir: "/images/mikado/coupe/noir-hetre-v5.jpg",
            gris: "/images/mikado/coupe/gris-hetre-v5.jpg",
            chocolat: "/images/mikado/coupe/chocolat-hetre-v5.jpg",
            laiton: "/images/mikado/coupe/laiton-hetre-v5.jpg",
            lin: "/images/mikado/coupe/lin-hetre-v5.jpg",
            blanc: "/images/mikado/coupe/blanc-hetre-v5.jpg",
          },
          noyer: {
            noir: "/images/mikado/coupe/noir-noyer-v5.jpg",
            gris: "/images/mikado/coupe/gris-noyer-v5.jpg",
            chocolat: "/images/mikado/coupe/chocolat-noyer-v5.jpg",
            laiton: "/images/mikado/coupe/laiton-noyer-v5.jpg",
            lin: "/images/mikado/coupe/lin-noyer-v5.jpg",
            blanc: "/images/mikado/coupe/blanc-noyer-v5.jpg",
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
            noir: "/images/mikado/devant/noir-pin-v5.jpg",
            gris: "/images/mikado/devant/gris-pin-v5.jpg",
            chocolat: "/images/mikado/devant/chocolat-pin-v5.jpg",
            laiton: "/images/mikado/devant/laiton-pin-v5.jpg",
            lin: "/images/mikado/devant/lin-pin-v5.jpg",
            blanc: "/images/mikado/devant/blanc-pin-v5.jpg",
          },
          hetre: {
            noir: "/images/mikado/devant/noir-hetre-v5.jpg",
            gris: "/images/mikado/devant/gris-hetre-v5.jpg",
            chocolat: "/images/mikado/devant/chocolat-hetre-v5.jpg",
            laiton: "/images/mikado/devant/laiton-hetre-v5.jpg",
            lin: "/images/mikado/devant/lin-hetre-v5.jpg",
            blanc: "/images/mikado/devant/blanc-hetre-v5.jpg",
          },
          noyer: {
            noir: "/images/mikado/devant/noir-noyer-v5.jpg",
            gris: "/images/mikado/devant/gris-noyer-v5.jpg",
            chocolat: "/images/mikado/devant/chocolat-noyer-v5.jpg",
            laiton: "/images/mikado/devant/laiton-noyer-v5.jpg",
            lin: "/images/mikado/devant/lin-noyer-v5.jpg",
            blanc: "/images/mikado/devant/blanc-noyer-v5.jpg",
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
            noir: "/images/mikado/coupe/noir-pin-v5.jpg",
            gris: "/images/mikado/coupe/gris-pin-v5.jpg",
            chocolat: "/images/mikado/coupe/chocolat-pin-v5.jpg",
            laiton: "/images/mikado/coupe/laiton-pin-v5.jpg",
            lin: "/images/mikado/coupe/lin-pin-v5.jpg",
            blanc: "/images/mikado/coupe/blanc-pin-v5.jpg",
          },
          hetre: {
            noir: "/images/mikado/coupe/noir-hetre-v5.jpg",
            gris: "/images/mikado/coupe/gris-hetre-v5.jpg",
            chocolat: "/images/mikado/coupe/chocolat-hetre-v5.jpg",
            laiton: "/images/mikado/coupe/laiton-hetre-v5.jpg",
            lin: "/images/mikado/coupe/lin-hetre-v5.jpg",
            blanc: "/images/mikado/coupe/blanc-hetre-v5.jpg",
          },
          noyer: {
            noir: "/images/mikado/coupe/noir-noyer-v5.jpg",
            gris: "/images/mikado/coupe/gris-noyer-v5.jpg",
            chocolat: "/images/mikado/coupe/chocolat-noyer-v5.jpg",
            laiton: "/images/mikado/coupe/laiton-noyer-v5.jpg",
            lin: "/images/mikado/coupe/lin-noyer-v5.jpg",
            blanc: "/images/mikado/coupe/blanc-noyer-v5.jpg",
          },
        },
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 920 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 1130 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 1460 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 1700 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2050 },
    ],
    surMesure: {
      // Forfait de piétement, puis le mètre carré de plateau. Le prix au m²
      // est calé pour qu'une table aux cotes du client ne tombe jamais sous
      // le prix d'une table du catalogue plus petite. Les prix du catalogue
      // doivent rester des multiples de 10 € : c'est ce qui leur sert de
      // plafond exact pour le sur-mesure (devisSurMesure arrondit toujours
      // à la dizaine supérieure) — un prix qui n'est pas un multiple de 10
      // laisserait passer une pièce sur mesure plus chère que le catalogue.
      // Tous les prix de cette table ont été baissés de 30 % puis remontés
      // de 10 % (net ×0,77), divisés par deux, relevés de 13 % quand la
      // livraison est passée au forfait plafonné (voir LIVRAISON_MAX_CENTS),
      // puis de 7 % à la demande de Quentin.
      forme: "rect",
      axes: "plan",
      forfait: 304,
      parM2: 485,
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
        parM2ParMm: 10,
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
          body: "Our reference top is French first-grade oak from sustainably managed forests. Wide boards, each running the full length in a single piece, are selected and matched by hand so grain and colour answer each other: no knots, no sapwood. Oiled rather than varnished, the wood keeps its touch and gains a patina over the years; a mark comes out with fine paper, on that spot alone. Beech, walnut and pine are made to the same standard.",
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
          pin: "/images/table-croix-bout-v2-pin.jpg",
          hetre: "/images/table-croix-bout-v2-hetre.jpg",
          noyer: "/images/table-croix-bout-v2-noyer.jpg",
        },
      },
      {
        src: "/images/table-croix-soudure-v1.jpg",
        alt: "Table Croix, gros plan sur le X d'acier : le cordon de soudure au croisement des lames, sous le plateau",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-soudure-v1-pin.jpg",
          hetre: "/images/table-croix-soudure-v1-hetre.jpg",
          noyer: "/images/table-croix-soudure-v1-noyer.jpg",
        },
      },
      {
        src: "/images/table-croix-cote-v2.jpg",
        alt: "Table Croix vue de côté : les deux X d'acier noir sous le long plateau de chêne",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-cote-v2-pin.jpg",
          hetre: "/images/table-croix-cote-v2-hetre.jpg",
          noyer: "/images/table-croix-cote-v2-noyer.jpg",
        },
      },
      {
        src: "/images/table-croix-detail-v1.jpg",
        alt: "Table Croix, détail : l'angle du plateau de chêne et le X d'acier noir qui le porte",
        bg: "#ffffff",
        fit: "contain",
        parBois: {
          pin: "/images/table-croix-detail-v1-pin.jpg",
          hetre: "/images/table-croix-detail-v1-hetre.jpg",
          noyer: "/images/table-croix-detail-v1-noyer.jpg",
        },
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 880 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 1100 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 1420 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 1680 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2020 },
    ],
    surMesure: {
      // Forfait de piétement, puis le mètre carré de plateau. Le prix au m²
      // est calé pour qu'une table aux cotes du client ne tombe jamais sous
      // le prix d'une table du catalogue plus petite. Les prix du catalogue
      // doivent rester des multiples de 10 € (voir table-mikado).
      // Tous les prix de cette table ont été baissés de 30 % puis remontés
      // de 10 % (net ×0,77), divisés par deux, relevés de 13 % quand la
      // livraison est passée au forfait plafonné (voir LIVRAISON_MAX_CENTS),
      // puis de 7 % à la demande de Quentin.
      forme: "rect",
      axes: "plan",
      forfait: 271,
      parM2: 485,
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
        parM2ParMm: 10,
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
          body: "Our reference top is French first-grade oak from sustainably managed forests. Wide boards, each running the full length in a single piece, are selected and matched by hand so grain and colour answer each other: no knots, no sapwood. Oiled rather than varnished, the wood keeps its touch and gains a patina over the years; a mark comes out with fine paper, on that spot alone. Beech, walnut and pine are made to the same standard.",
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
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 910 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 1120 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 1430 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 1690 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 2040 },
    ],
    surMesure: {
      // Forfait de piétement, puis le mètre carré de plateau. Le prix au m²
      // est calé pour qu'une table aux cotes du client ne tombe jamais sous
      // le prix d'une table du catalogue plus petite. Le bouquet de tiges
      // demande bien plus d'heures qu'un autre piétement : plus cher au
      // forfait, quelle que soit la taille du plateau. Les prix du catalogue
      // doivent rester des multiples de 10 € (voir table-mikado).
      // Tous les prix de cette table ont été baissés de 30 % puis remontés
      // de 10 % (net ×0,77), divisés par deux, relevés de 13 % quand la
      // livraison est passée au forfait plafonné (voir LIVRAISON_MAX_CENTS),
      // puis de 7 % à la demande de Quentin.
      forme: "rect",
      axes: "plan",
      forfait: 285,
      parM2: 485,
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
        parM2ParMm: 10,
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
          body: "Our reference top is French first-grade oak from sustainably managed forests. Wide boards, each running the full length in a single piece, are selected and matched by hand so grain and colour answer each other: no knots, no sapwood. Oiled rather than varnished, the wood keeps its touch and gains a patina over the years; a mark comes out with fine paper, on that spot alone. Beech, walnut and pine are made to the same standard.",
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
    slug: "escalier-limon-central",
    famille: "escalier",
    seoMots: "escalier acier",
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
      { id: "droit", label: "Droit — 13 marches", price: 6900 },
      { id: "quart", label: "Quart tournant — 14 marches", price: 8400 },
      { id: "demi", label: "Demi-tournant — 16 marches", price: 9800 },
    ],
    woods: woods({ pin: -1290, hetre: -690, chene: 0, noyer: 1690 }),
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
      { label: "Normes", value: "Conforme NF P01-012 — garde-corps et hauteur de marche" },
      { label: "Fabrication", value: "Sur commande — comptez 10 à 12 semaines" },
      { label: "Pose", value: "Comprise, par nos soins, en 1 à 2 jours" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Central Stringer Staircase",
      seoMots: "steel staircase",
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
        { label: "Standards", value: "Complies with NF P01-012 — balustrades and rise" },
        { label: "Lead time", value: "Made to order — allow 10 to 12 weeks" },
        { label: "Fitting", value: "Included, by us, in one or two days" },
      ],
    },
  },
  {
    slug: "garde-corps",
    poseOption: true,
    famille: "garde-corps",
    // « barre d'appui » : c'est le mot que tapent les gens pour une fenêtre.
    seoMots: "barre d'appui",
    // L'accroche fait 131 signes : assemblée avec le prix et le suffixe, elle
    // dépassait les 155 signes que Google affiche.
    seoDescription:
      "Garde-corps de fenêtre en acier plein, croix de Saint-André, rosaces de fonderie, main courante chêne. Fabriqué à vos cotes à Saumur (49).",
    releve: "garde-corps-fenetre",
    category: "interieur",
    // Se commande en ligne, aux cotes que le client relève lui-même : aucune
    // taille au catalogue, tout passe par le barème au m². L'atelier peut
    // aussi venir mesurer (priseDeCotes).
    // Ce modèle est fait pour la FENÊTRE seulement : d'autres modèles
    // viendront pour l'escalier, le balcon ou la mezzanine, avec leurs
    // propres photos.
    orderMode: "cart",
    priseDeCotes: true,
    // Plusieurs fenêtres : −10 % sur chaque garde-corps dès le deuxième,
    // même avec des cotes différentes. Un seul déplacement, un seul emballage.
    remiseLot: { desPieces: 2, taux: 0.1 },
    name: "Garde-corps de fenêtre Rosace",
    tagline: "Croix de Saint-André en acier plein, rosaces de fonderie, main courante en chêne. Fabriqué au millimètre, encastré dans votre fenêtre.",
    images: [
      {
        src: "/images/garde-corps/fenetre.jpg",
        alt: "Garde-corps de fenêtre vu de face : cadre acier peint noir à croix de Saint-André, deux rosaces de fonderie, main courante en chêne",
        bg: "#ffffff",
        fit: "contain",
      },
      {
        src: "/images/garde-corps/fenetre-pose.jpg",
        alt: "Le même garde-corps posé en tableau, vu depuis la pièce : la fenêtre entière, l'appui et le jour sous le cadre",
        bg: "#e9e6e0",
        fit: "contain",
      },
      {
        src: "/images/garde-corps/fenetre-rue.jpg",
        alt: "Le garde-corps vu de la rue, entre les volets : posé sur l'appui en tuffeau, la fenêtre ouverte derrière",
        bg: "#e6e1d6",
        fit: "contain",
      },
    ],
    sizes: [],
    surMesure: {
      // 100 € de forfait (rosaces, fixations, finition, emballage) + 330 €/m²
      // de garde-corps : le modèle de la photo, 1 180 × 350 mm, tombe à 240 €,
      // le prix donné par Quentin (« autour de 240 € max »). Une petite
      // fenêtre de 800 × 350 fait 200 €, un 2 000 × 600 fait 500 €.
      forme: "rect",
      axes: "panneau",
      forfait: 100,
      parM2: 330,
      minMm: 200,
      maxLargeurMm: 3000,
      maxHauteurMm: 1200,
      // Le « à partir de » : une petite fenêtre de 80 cm, à la hauteur du modèle.
      departMm: [800, 350],
      // Pas d'épaisseur à choisir : c'est la main courante, 40 mm, point.
      epaisseur: { minMm: 40, maxMm: 40, refMm: 40 },
    },
    woods: woods({ pin: -40, hetre: -20, chene: 0, noyer: 60 }),
    metals: metals("noir", "brut", "blanc"),
    metalLabel: { fr: "Couleur de l'acier", en: "Steel colour" },
    // La rosace au croisement des barres : quatre modèles de fonderie, en
    // photo dans la pastille. Le supplément est par garde-corps, quel que
    // soit le nombre de croix. À VALIDER par Quentin : les suppléments.
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
        id: "medaillon",
        label: "Grand médaillon, fonte Ø170",
        labelEn: "Large medallion, cast iron Ø170",
        swatch: "#2b2320",
        grain: "url(/images/garde-corps/rosaces/medaillon.jpg)",
        priceDelta: 40,
      },
    ],
    remplissages: [
      {
        // Le modèle : une rangée de croix, une par panneau d'environ 60 cm.
        // Au-delà de 450 mm de haut, les triangles entre les croix laissent
        // passer la sphère de 110 mm de la norme : on ne le vend plus à ces
        // cotes — on propose le verre, ou un autre modèle.
        // À VALIDER par Quentin : la hauteur limite (450) et le tarif du verre.
        id: "croix",
        label: "Croix de Saint-André et rosaces",
        labelEn: "Saint Andrew's crosses and rosettes",
        forfait: 0,
        parM2: 0,
        hauteurMaxConformeMm: 450,
      },
      {
        // Verre feuilleté de sécurité 44.2 dans le cadre acier, à la place des
        // croix : aucun vide, conforme à toute hauteur. Le verre, la découpe,
        // les fixations et le joint : 180 € + 350 €/m².
        id: "verre",
        label: "Panneau de verre feuilleté, à la place des croix",
        labelEn: "Laminated glass panel, instead of the crosses",
        forfait: 180,
        parM2: 350,
      },
    ],
    sections: [
      {
        title: "Un cadre en acier plein, une rosace de fonderie",
        body: "Le cadre et les croisillons sont en acier plein, soudés puis peints à l'atelier. Au croisement, une rosace de fonderie, comme sur les balcons anciens de Saumur. Quatre modèles sont proposés, en aluminium moulé, en fonte ou en acier ; vous choisissez le vôtre à la commande.",
      },
      {
        title: "Une main courante en bois massif de 40 mm",
        body: "Le dessus est une pièce de bois massif de 40 mm, arrondie, poncée et huilée. La main s'y pose sans accrocher, l'été comme l'hiver. Pin, hêtre, chêne ou noyer au choix ; le chêne est celui de la photo.",
      },
      {
        title: "Trois cotes à relever",
        body: "Vous relevez trois cotes au mètre : la largeur entre les murs, la hauteur du sol à l'appui, et la hauteur de la fenêtre. Nous calculons la hauteur du garde-corps pour qu'il respecte la règle. Il vient s'encastrer dans le tableau, fixé dans l'épaisseur des murs. Si une cote nous étonne, nous vous appelons avant de couper. Si vous préférez, l'atelier vient prendre les cotes.",
      },
      {
        title: "Une hauteur calculée selon la règle",
        body: "En étage, une fenêtre dont l'appui est à moins de 90 cm du sol doit être protégée jusqu'à 1 m du sol. C'est le Code de la construction. Nous faisons le calcul à partir de votre hauteur d'allège. Le garde-corps ne descend jamais sous 35 cm, la hauteur du modèle en photo : une barre d'appui qui laisse la vue.",
      },
    ],
    specs: [
      { label: "Structure", value: "Acier plein, soudure TIG, finition peinte" },
      { label: "Motif", value: "Croix de Saint-André, rosaces de fonderie" },
      { label: "Main courante", value: "Pin, hêtre, chêne ou noyer massif au choix, 40 mm, finition huile-cire" },
      { label: "Pose", value: "Encastré dans le tableau de la fenêtre, fixations fournies — vous mesurez, nous fabriquons" },
      { label: "Prise de cotes", value: "Par vous, au mètre — ou par l'atelier, dès 19,99 € jusqu'à 30 km de Saumur, déduits de la commande" },
      { label: "Normes", value: "Hauteur calculée selon l'art. R111-15 du Code de la construction et la NF P01-012" },
      { label: "Fabrication", value: "Sur commande — comptez 4 à 6 semaines" },
      { label: "Livraison", value: "France métropolitaine, fixations et notice de pose comprises" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Rosette Window Railing",
      seoMots: "window railing",
      seoDescription:
        "Solid steel window railing with a Saint Andrew's cross, cast rosettes and an oak handrail, made to the millimetre in Saumur, France.",
      tagline: "Solid steel Saint Andrew's cross, cast rosettes, oak handrail. Made to the millimetre, fitted into your window.",
      images: [
        "Window railing seen head-on: painted black steel frame with a Saint Andrew's cross, two cast rosettes, oak handrail",
        "The same railing fitted in the reveal, seen from the room: the whole window, the sill and the daylight under the frame",
        "The railing seen from the street, between the shutters: set on the tuffeau stone sill, the window open behind",
      ],
      sizes: {},
      sections: [
        {
          title: "A solid steel frame, a cast rosette",
          body: "The frame and the braces are solid steel, welded then painted in the workshop. Where the bars cross sits a cast rosette, as on the old balconies of Saumur. Four models are offered, in cast aluminium, cast iron or steel; you choose yours with the order.",
        },
        {
          title: "A 40 mm solid wood handrail",
          body: "The top is a 40 mm piece of solid wood, rounded, sanded and oiled. The hand rests on it without catching, summer or winter. Pine, beech, oak or walnut; oak is the one in the photo.",
        },
        {
          title: "Three measurements to take",
          body: "You take three tape measurements: the width between the walls, the height from the floor to the sill, and the window height. We work out the railing height so that it meets the rule. The railing fits into the reveal, fixed into the thickness of the walls. If a measurement surprises us, we call you before cutting. If you prefer, the workshop comes to measure up.",
        },
        {
          title: "A height set by the rule",
          body: "Upstairs, a window whose sill is less than 90 cm from the floor must be guarded up to 1 m from the floor. That is the French building code. We do the sum from your sill height. The railing never goes below 35 cm, the height of the model in the photo: a handrail that leaves the view open.",
        },
      ],
      specs: [
        { label: "Frame", value: "Solid steel, TIG welded, painted finish" },
        { label: "Pattern", value: "Saint Andrew's cross, cast rosettes" },
        { label: "Handrail", value: "Pine, beech, oak or walnut to choose from, 40 mm, oil-wax finish" },
        { label: "Fitting", value: "Fits into the window reveal, fixings supplied — you measure, we build" },
        { label: "Survey", value: "By you, with a tape — or by the workshop, from €19.99 within 30 km of Saumur, deducted from the order" },
        { label: "Standards", value: "Height set by art. R111-15 of the French building code and NF P01-012" },
        { label: "Lead time", value: "Made to order — allow 4 to 6 weeks" },
        { label: "Delivery", value: "Mainland France, fixings and fitting guide included" },
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
        alt: "Table d'extérieur Mikado, plateau à lattes de chêne et piétement acier noir",
        bg: "#ffffff",
        fit: "cover",
      },
    ],
    sizes: [
      { id: "p6", dimsMm: [1500, 900], label: "6 places — 150 × 90 × H 75 cm", price: 260 },
      { id: "p8", default: true, dimsMm: [2000, 1000], label: "8 places — 200 × 100 × H 75 cm", price: 300 },
      { id: "p10", dimsMm: [2400, 1000], label: "10 places — 240 × 100 × H 75 cm", price: 390 },
      { id: "p12", dimsMm: [3000, 1000], label: "12 places — 300 × 100 × H 75 cm", price: 460 },
      { id: "p14", dimsMm: [3500, 1100], label: "14 places — 350 × 110 × H 75 cm", price: 550 },
    ],
    surMesure: {
      // Le même piétement que la table d'intérieur, mais un plateau à lattes.
      // Échelle de Quentin (200 × 100, 8 places, 45 mm à 650 €), baissée de
      // 30 % puis remontée de 10 % (net ×0,77), divisée par deux, puis
      // relevée de 13 % (livraison au forfait) puis de 7 %. Les prix du catalogue restent des multiples de
      // 10 € : c'est ce qui leur sert de plafond exact pour le sur-mesure
      // (voir table-mikado).
      forme: "rect",
      axes: "plan",
      forfait: 74,
      parM2: 131,
      minMm: 800,
      maxLargeurMm: PLATEAU_MAX_LONGUEUR_MM,
      maxHauteurMm: PLATEAU_MAX_LARGEUR_MM,
      epaisseur: {
        // Les mêmes trois épaisseurs que les tables d'intérieur : 28, 36 ou 45 mm.
        minMm: 28,
        maxMm: 45,
        refMm: 45,
        choixMm: PLATEAU_CHOIX,
        parM2ParMm: 6,
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
      // Même raison qu'en français : accroche + prix + suffixe dépassait.
      seoDescription:
        "Garden table with a slatted treated-oak top and a painted steel Mikado base, made to stay outside. Made in Saumur, France.",
      tagline: "Slatted treated-oak top, Mikado base painted for outdoors — made to stay outside.",
      images: [
        "Mikado outdoor table, slatted oak top and black steel base",
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
      { id: "l60", dimsMm: [600, 600], label: "60 × 60 cm — 0,36 m² — 25 W", price: 330 },
      { id: "l120", default: true, dimsMm: [1200, 600], label: "120 × 60 cm — 0,72 m² — 50 W", price: 370 },
      { id: "l1212", dimsMm: [1200, 1200], label: "120 × 120 cm — 1,44 m² — 95 W", price: 460 },
      { id: "l180", dimsMm: [1800, 900], label: "180 × 90 cm — 1,62 m² — 105 W", price: 490 },
      { id: "l240", dimsMm: [2400, 1200], label: "240 × 120 cm — 2,88 m² — 190 W", price: 640 },
      { id: "l300", dimsMm: [3000, 1500], label: "300 × 150 cm — 4,5 m² — 290 W", price: 850 },
      { id: "l302", dimsMm: [3000, 2000], label: "300 × 200 cm — 6 m² — 390 W", price: 1030 },
      { id: "l400", dimsMm: [4000, 2000], label: "400 × 200 cm — 8 m² — 520 W", price: 1280 },
      { id: "l425", dimsMm: [4000, 2500], label: "400 × 250 cm — 10 m² — 650 W", price: 1530 },
      { id: "l430", dimsMm: [4000, 3000], label: "400 × 300 cm — 12 m² — 780 W", price: 1780 },
    ],
    surMesure: {
      forme: "rect",
      // Un plafond se mesure à plat : longueur × largeur, comme une table.
      axes: "plan",
      // 280 € de forfait + 125 €/m² : ce couple retombe exactement sur les dix
      // prix du catalogue, de 330 € à 1 780 €. Ne changer l'un sans l'autre.
      forfait: 280,
      parM2: 125,
      minMm: 300,
      maxLargeurMm: 4000,
      maxHauteurMm: 3000,
      epaisseur: {
        // Seule la bande d'aluminium du pourtour change : l'écart reste léger.
        minMm: 180,
        maxMm: 600,
        refMm: 180,
        parM2Bande: 60,
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
      { label: "Dimensions", value: "Jusqu'à 400 × 300 cm d'un seul tenant, au centimètre près" },
      { label: "Pose", value: "En applique, suspendu par câbles ou encastré" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Lucarne",
      seoMots: "backlit stretch ceiling",
      tagline: "Backlit stretched fabric, lacquered aluminium frame.",
      images: [
        "Lucarne: backlit stretch ceiling seen from below, black aluminium frame",
        "Lucarne: backlit stretch ceiling above a dining table",
      ],
      sizes: {
        l60: "60 × 60 cm — 0.36 m² — 25 W",
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
        { label: "Sizes", value: "Up to 400 × 300 cm in one piece, to the centimetre" },
        { label: "Fitting", value: "Surface-mounted, hung on cables or recessed" },
      ],
    },
  },
  {
    slug: "plafond-lumineux-halo",
    poseOption: true,
    famille: "plafond",
    seoMots: "plafond lumineux rond",
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
        alt: "Halo allumé, plafond lumineux rond posé au plafond d'une pièce à vivre",
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
      { id: "d60", dimsMm: [600, 600], label: "Ø 60 cm — 0,28 m² — 20 W", price: 350 },
      { id: "d90", dimsMm: [900, 900], label: "Ø 90 cm — 0,64 m² — 40 W", price: 400 },
      { id: "d120", default: true, dimsMm: [1200, 1200], label: "Ø 120 cm — 1,13 m² — 75 W", price: 470 },
      { id: "d150", dimsMm: [1500, 1500], label: "Ø 150 cm — 1,77 m² — 115 W", price: 560 },
      { id: "d200", dimsMm: [2000, 2000], label: "Ø 200 cm — 3,14 m² — 205 W", price: 760 },
      { id: "d250", dimsMm: [2500, 2500], label: "Ø 250 cm — 4,91 m² — 320 W", price: 1010 },
      { id: "d300", dimsMm: [3000, 3000], label: "Ø 300 cm — 7,07 m² — 460 W", price: 1320 },
      { id: "d350", dimsMm: [3500, 3500], label: "Ø 350 cm — 9,62 m² — 625 W", price: 1690 },
      { id: "d400", dimsMm: [4000, 4000], label: "Ø 400 cm — 12,57 m² — 815 W", price: 2110 },
    ],
    surMesure: {
      // Le cercle demande le cintrage du profilé et une toile taillée en rond :
      // le mètre carré est plus cher que sur un rectangle.
      forme: "rond",
      // 300 € de forfait + 144 €/m² : retombe exactement sur les neuf prix du
      // catalogue, de 350 € à 2 110 €. Le mètre carré est plus cher qu'en
      // rectangle : il faut cintrer le profilé et la toile ronde fait de la chute.
      forfait: 300,
      parM2: 144,
      minMm: 300,
      maxLargeurMm: 4000,
      maxHauteurMm: 4000,
      epaisseur: {
        minMm: 180,
        maxMm: 600,
        refMm: 180,
        parM2Bande: 60,
      },
    },
    woods: [],
    metals: pieds(),
    sections: [
      {
        title: "Un disque de lumière pleine",
        body: "Le cercle est roulé d'une seule pièce : pas d'angle, pas de raccord visible sur le pourtour. La toile s'y tend en une seule surface et diffuse la même lumière du centre jusqu'au bord.",
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
        body: "Le disque se pose au plafond ou se suspend par câbles. Jusqu'à 400 cm de diamètre d'un seul tenant ; l'alimentation 220 V est fournie, la variation est possible sur demande.",
      },
    ],
    specs: [
      { label: "Toile", value: "Membrane translucide tendue, blanc diffusant" },
      { label: "Cadre", value: "Profilé aluminium cintré et laqué, caisson de 180 à 600 mm" },
      { label: "Éclairage", value: "LED 220 V, blanc 3000 K ou 4000 K, variation en option" },
      { label: "Diamètre", value: "Jusqu'à 400 cm d'un seul tenant, au centimètre près" },
      { label: "Fabrication", value: "Sur commande — comptez 3 à 5 semaines" },
    ],
    // Traduction anglaise de la fiche.
    en: {
      name: "Halo",
      seoMots: "round backlit stretch ceiling",
      tagline: "A circle of backlit stretched fabric, lacquered aluminium frame.",
      images: [
        "Halo: round stretched-fabric light ceiling, black aluminium frame",
        "Halo lit up: round light ceiling fitted to a living-room ceiling",
        "Close-up of the curved aluminium frame and the lit stretched fabric",
      ],
      sizes: {
        d60: "Ø 60 cm — 0.28 m² — 20 W",
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
          body: "The circle is rolled in one piece: no corner, no joint showing anywhere on the rim. The fabric is stretched across it as a single surface and gives the same light from the centre out to the edge.",
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
          body: "The disc fixes to the ceiling or hangs on cables. Up to 400 cm across in one piece; the 220 V supply comes with it and dimming is available on request.",
        },
      ],
      specs: [
        { label: "Fabric", value: "Stretched translucent membrane, diffusing white" },
        { label: "Frame", value: "Curved and lacquered aluminium profile, box 180 to 600 mm deep" },
        { label: "Lighting", value: "220 V LED, 3000 K or 4000 K white, dimming optional" },
        { label: "Diameter", value: "Up to 400 cm in one piece, to the centimetre" },
        { label: "Lead time", value: "Made to order — allow 3 to 5 weeks" },
      ],
    },
  },
];

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

/** L'acier, plein, quelle que soit la pièce : 7 850 kg/m³. */
const DENSITE_ACIER_KG_M3 = 7850;

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
 * L'acier plein d'un garde-corps de fenêtre : une barre carrée de 16 mm — un
 * choix courant en ferronnerie d'art pour une croix de Saint-André, à
 * confirmer par Quentin contre le profil réellement soudé. 16² mm² × 7 850
 * kg/m³ ≈ 2,0 kg le mètre.
 */
const BARRE_GC_KG_PAR_M = 0.016 * 0.016 * DENSITE_ACIER_KG_M3;
/** Une croix par panneau d'environ 60 cm (voir le remplissage « croix », plus haut). */
const LARGEUR_PANNEAU_CROIX_M = 0.6;
/** La main courante : 40 × 40 mm massif. */
const SECTION_MAIN_COURANTE_M2 = 0.04 * 0.04;
/** Une rosace de fonderie ou d'aluminium moulé, par croix. */
const ROSACE_KG = 0.4;
/** Un panneau de verre feuilleté de sécurité (environ 8 mm), au m². */
const VERRE_KG_PAR_M2 = 20;

/**
 * Le poids du colis d'une pièce, en kilos, pour chiffrer la livraison : le
 * plateau d'une table au volume réel de l'essence choisie, son piétement à
 * son métrage de tube, un garde-corps à la vraie longueur de barre (cadre et
 * croix de Saint-André, ou cadre et verre), un plafond lumineux à la
 * surface, une chaise à poids fixe (colisKg). Estimation, jamais une pesée :
 * à valider contre un vrai colis.
 */
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

export function poidsColisKg(
  product: Product,
  cotes: { largeurMm?: number; hauteurMm?: number; epaisseurMm?: number; woodId?: string; remplissageId?: string }
): number {
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
  if (product.famille === "garde-corps") {
    const nbPanneaux = Math.max(1, Math.round(L / LARGEUR_PANNEAU_CROIX_M));
    const perimetreM = 2 * (L + W);
    const structureKg =
      cotes.remplissageId === "verre"
        ? // Un cadre soudé qui reçoit le verre : pas de croix, le poids du vitrage à la place.
          perimetreM * BARRE_GC_KG_PAR_M + L * W * VERRE_KG_PAR_M2
        : (() => {
            const panneauLargeurM = L / nbPanneaux;
            const diagonaleM = Math.sqrt(panneauLargeurM ** 2 + W ** 2);
            return (perimetreM + nbPanneaux * 2 * diagonaleM) * BARRE_GC_KG_PAR_M + nbPanneaux * ROSACE_KG;
          })();
    const mainCouranteKg = L * SECTION_MAIN_COURANTE_M2 * densiteBoisKgM3(cotes.woodId);
    return Math.max(8, Math.round(structureKg + mainCouranteKg));
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
  const moinsCher = (options: ProductSwatch[] | undefined) =>
    options && options.length > 0 ? Math.min(...options.map((o) => o.priceDelta ?? 0)) : 0;
  const boisMoinsCher =
    product.woods.length > 0
      ? product.woods.reduce((a, b) => ((a.priceDelta ?? 0) <= (b.priceDelta ?? 0) ? a : b))
      : undefined;
  const autres = moinsCher(product.metals) + moinsCher(product.fabrics);
  // Une pièce sans taille au catalogue : soit elle a un barème et des cotes de
  // départ (le garde-corps), soit elle est sur devis et on n'annonce rien —
  // jamais un chiffre inventé.
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
};

export type ResolveFailure =
  | "unknown_slug"
  | "not_orderable"
  | "unknown_size"
  | "unknown_wood"
  | "unknown_metal"
  | "unknown_fabric"
  | "unknown_remplissage"
  /** Le remplissage demandé laisse des vides hors norme à cette hauteur. */
  | "non_conforme"
  | "invalid_price";

export type ResolveResult =
  | { ok: true; line: ResolvedLine }
  | { ok: false; reason: ResolveFailure };

/**
 * Choisit une option dans une liste, en REFUSANT tout ce qui ne correspond pas.
 * Pas de repli sur la première option : un identifiant absent ou inconnu ferait
 * payer le pin (−260 € sur la table, −950 € sur l'escalier) à la place du chêne.
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
function fabricSousRemplissage(product: Product, fabricId: string | undefined, remplissageId: string | undefined) {
  if (!product.fabricLabel || !product.fabrics?.length) return fabricId;
  const sansCroix = product.remplissages?.some((r) => r.id === remplissageId && r.hauteurMaxConformeMm === undefined);
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

/**
 * Ce remplissage respecte-t-il la norme à cette hauteur de garde-corps ?
 * Les croix ont une hauteur limite ; le verre n'en a pas.
 */
export function remplissageConforme(remplissage: Remplissage, hauteurMm: number) {
  return remplissage.hauteurMaxConformeMm === undefined || hauteurMm <= remplissage.hauteurMaxConformeMm;
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
  const auBareme = Math.ceil((bareme.forfait + parM2 * surface + bande) / 10) * 10;
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
  if (
    remplissage.value &&
    size.id === SUR_MESURE &&
    !remplissageConforme(remplissage.value, Number(selection.hauteurMm))
  ) {
    return null;
  }

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
 */
export function resolveSelection(selection: Selection): ResolveResult {
  const product = getProduct(selection.slug);
  if (!product) return { ok: false, reason: "unknown_slug" };
  if (product.orderMode !== "cart") return { ok: false, reason: "not_orderable" };
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
  // Un garde-corps à croix trop haut pour la norme ne se vend pas : le
  // navigateur l'a déjà dit au client, le serveur le redit à quiconque forge.
  if (
    remplissage.value &&
    size.id === SUR_MESURE &&
    !remplissageConforme(remplissage.value, Number(selection.hauteurMm))
  ) {
    return { ok: false, reason: "non_conforme" };
  }

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
 * Le prix de lot, appliqué à une commande entière.
 *
 * On compte les exemplaires de chaque pièce à prix de lot (un garde-corps par
 * fenêtre, avec ses propres cotes : ce sont bien des lignes différentes) ; dès
 * que le seuil est atteint, chaque exemplaire de cette pièce est remisé. Le
 * navigateur et /api/commande passent par ici : même arrondi, même résultat.
 */
export function remiseLot<L extends { product: Product; unitPrice: number; quantity: number }>(
  lines: L[]
): (L & { prixLot: number; remise: number })[] {
  const parPiece = new Map<string, number>();
  for (const line of lines) {
    if (!line.product.remiseLot) continue;
    parPiece.set(line.product.slug, (parPiece.get(line.product.slug) ?? 0) + line.quantity);
  }
  return lines.map((line) => {
    const lot = line.product.remiseLot;
    const nombre = parPiece.get(line.product.slug) ?? 0;
    const remise = lot && nombre >= lot.desPieces ? lot.taux : 0;
    return { ...line, remise, prixLot: prixRemise(line.unitPrice, remise) };
  });
}

/** Un prix remisé, à l'euro : le catalogue est en euros entiers, le lot aussi. */
export function prixRemise(unitPrice: number, taux: number) {
  return Math.round(unitPrice * (1 - taux));
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
