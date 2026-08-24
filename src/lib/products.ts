export type ProductSize = { id: string; label: string; price: number };

export type ProductSwatch = {
  id: string;
  label: string;
  /** Couleur de repli, et teinte moyenne de l'essence. */
  swatch: string;
  /** Fil du bois, en CSS : superposé à `swatch` dans la pastille. */
  grain?: string;
  /** Écart de prix par rapport à l'essence de référence, en euros. */
  priceDelta?: number;
};
export type ProductSection = { title: string; body: string };
export type ProductSpec = { label: string; value: string };

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  images: { src: string; alt: string }[];
  sizes: ProductSize[];
  woods: ProductSwatch[];
  metals: ProductSwatch[];
  /** Remplace « Couleur des pieds » quand la pièce n'a pas de pieds. */
  metalLabel?: { fr: string; en: string };
  sections: ProductSection[];
  specs: ProductSpec[];
  testimonial?: { quote: string; author: string };
};

/* ------------------------------------------------------------------ *
 *  Essences de bois
 *  Le fil est dessiné en CSS plutôt que photographié : la pastille reste
 *  nette à toute taille et ne coûte aucun téléchargement.
 *  `deltas` donne l'écart de prix par produit — un même bois ne pèse pas
 *  pareil sur une chaise et sur un escalier.
 * ------------------------------------------------------------------ */
type WoodId = "pin" | "hetre" | "chene" | "noyer";

const WOOD_GRAIN: Record<WoodId, { label: string; swatch: string; grain: string }> = {
  pin: {
    label: "Pin massif",
    swatch: "#e0bd85",
    grain: `repeating-linear-gradient(96deg, rgba(120,80,35,0.16) 0 1px, transparent 1px 6px),
            repeating-linear-gradient(94deg, rgba(120,80,35,0.09) 0 2px, transparent 2px 11px),
            radial-gradient(ellipse 34% 12% at 62% 34%, rgba(122,80,38,0.34), transparent 70%),
            linear-gradient(100deg, #ecca94 0%, #dcb376 45%, #e7c489 72%, #d5aa6c 100%)`,
  },
  hetre: {
    label: "Hêtre massif",
    swatch: "#dcc0a0",
    grain: `repeating-linear-gradient(93deg, rgba(120,82,52,0.13) 0 1px, transparent 1px 4px),
            repeating-linear-gradient(93deg, rgba(120,82,52,0.07) 0 1px, transparent 1px 9px),
            linear-gradient(100deg, #e6cdb0 0%, #d7b895 50%, #e0c4a4 100%)`,
  },
  chene: {
    label: "Chêne massif",
    swatch: "#c19a5e",
    grain: `repeating-linear-gradient(95deg, rgba(92,58,26,0.20) 0 1px, transparent 1px 7px),
            repeating-linear-gradient(95deg, rgba(92,58,26,0.11) 0 2px, transparent 2px 15px),
            repeating-linear-gradient(95deg, rgba(255,236,205,0.16) 0 1px, transparent 1px 23px),
            linear-gradient(100deg, #cd9f63 0%, #b9884c 40%, #c99a5f 68%, #ad7d45 100%)`,
  },
  noyer: {
    label: "Noyer massif",
    swatch: "#6b452c",
    grain: `repeating-linear-gradient(95deg, rgba(28,16,8,0.30) 0 1px, transparent 1px 6px),
            repeating-linear-gradient(95deg, rgba(28,16,8,0.16) 0 2px, transparent 2px 13px),
            radial-gradient(ellipse 40% 16% at 35% 62%, rgba(150,96,54,0.34), transparent 72%),
            linear-gradient(100deg, #7a5033 0%, #5d3a22 46%, #6f472c 74%, #4e2f1b 100%)`,
  },
};

/** Construit la liste d'essences d'un produit avec ses écarts de prix. */
function woods(deltas: Partial<Record<WoodId, number>>): ProductSwatch[] {
  return (Object.keys(deltas) as WoodId[]).map((id) => ({
    id,
    label: WOOD_GRAIN[id].label,
    swatch: WOOD_GRAIN[id].swatch,
    grain: WOOD_GRAIN[id].grain,
    priceDelta: deltas[id] ?? 0,
  }));
}

export const products: Product[] = [
  {
    slug: "table-mikado",
    name: "Table Mikado",
    tagline: "Piétement acier croisé soudé main, plateau chêne massif.",
    images: [
      { src: "/images/table-mikado-full.jpg", alt: "Table Mikado — vue d'ensemble" },
      { src: "/images/table-mikado-detail.jpg", alt: "Table Mikado — détail plateau chêne et piétement acier" },
      { src: "/images/interieur-ensemble.jpg", alt: "Table Mikado, escalier et plafond lumineux dans une pièce à vivre" },
    ],
    sizes: [
      { id: "s", label: "180 × 90 cm", price: 1450 },
      { id: "m", label: "220 × 100 cm", price: 1690 },
      { id: "l", label: "240 × 110 cm", price: 1990 },
    ],
    woods: woods({ pin: -260, hetre: -140, chene: 0, noyer: 190 }),
    metals: [
      { id: "noir", label: "Noir mat", swatch: "#1c1a18" },
      { id: "brut", label: "Acier brut verni", swatch: "#8a8578" },
      { id: "blanc", label: "Blanc texturé", swatch: "#e8e6e1" },
    ],
    sections: [
      {
        title: "Un piétement sculptural",
        body: "Des lames d'acier plein se croisent sous le plateau comme un jeu de mikado : chaque appui semble posé au hasard, mais l'équilibre est calculé au millimètre. Le piétement est soudé d'une seule pièce à l'atelier — aucune vis apparente, aucun raccord.",
      },
      {
        title: "Un plateau qui traverse les années",
        body: "Le plateau en chêne massif de 40 mm est aboutés en lames larges, poncé puis protégé par une huile-cire qui laisse le bois respirer. Les marques du temps se réparent d'un simple ponçage léger — c'est une table faite pour servir tous les jours.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Chêne ou noyer massif, épaisseur 40 mm, finition huile-cire" },
      { label: "Piétement", value: "Acier plein S235, soudure TIG, thermolaquage mat" },
      { label: "Capacité", value: "6 à 10 couverts selon dimension" },
      { label: "Fabrication", value: "Sur commande — comptez 6 à 8 semaines" },
      { label: "Livraison", value: "France entière, montage compris" },
    ],
    testimonial: {
      quote: "On cherchait une table unique, on a eu une pièce d'atelier. Les soudures sont invisibles, le plateau est magnifique.",
      author: "Client particulier — exemple d'avis",
    },
  },
  {
    slug: "escalier-limon-central",
    name: "Escalier Limon Central",
    tagline: "Limon acier cintré, marches chêne massif, garde-corps à câbles.",
    images: [
      {
        src: "/images/escalier-limon-central.jpg",
        alt: "Escalier à limon central acier et marches en chêne massif",
      },
      { src: "/images/interieur-ensemble.jpg", alt: "Table Mikado, escalier et plafond lumineux dans une pièce à vivre" },
    ],
    sizes: [
      { id: "droit", label: "Droit — 13 marches", price: 6900 },
      { id: "quart", label: "Quart tournant — 14 marches", price: 8400 },
      { id: "demi", label: "Demi-tournant — 16 marches", price: 9800 },
    ],
    woods: woods({ pin: -950, hetre: -520, chene: 0, noyer: 640 }),
    metals: [
      { id: "noir", label: "Noir mat", swatch: "#1c1a18" },
      { id: "brut", label: "Acier brut verni", swatch: "#8a8578" },
      { id: "blanc", label: "Blanc texturé", swatch: "#e8e6e1" },
    ],
    metalLabel: { fr: "Couleur du limon", en: "Stringer colour" },
    sections: [
      {
        title: "Une seule ligne, du sol à l'étage",
        body: "Le limon central est cintré d'une pièce puis soudé en atelier : l'escalier ne montre aucun raccord, seulement une courbe continue qui porte les marches en porte-à-faux. C'est la pièce technique la plus exigeante que nous fabriquions, et celle qui structure le plus une entrée.",
      },
      {
        title: "Des marches qui semblent flotter",
        body: "Chaque marche en chêne massif de 50 mm est fixée sur des platines invisibles, sous la marche. Le garde-corps à câbles inox et la main courante en bois cintré prolongent le geste sans jamais fermer l'espace ni couper la lumière.",
      },
    ],
    specs: [
      { label: "Limon", value: "Acier plein cintré, soudure TIG, thermolaquage mat" },
      { label: "Marches", value: "Chêne ou noyer massif, épaisseur 50 mm, finition huile-cire" },
      { label: "Garde-corps", value: "Câbles inox tendus, main courante bois cintré" },
      { label: "Hauteur", value: "Sur-mesure, adaptée à votre trémie (relevé de cotes sur place)" },
      { label: "Normes", value: "Conforme NF P01-012 — garde-corps et hauteur de marche" },
      { label: "Fabrication", value: "Sur commande — comptez 10 à 12 semaines" },
      { label: "Pose", value: "Comprise, par nos soins, en 1 à 2 jours" },
    ],
    testimonial: {
      quote:
        "On a gagné une pièce maîtresse au milieu de la maison. La courbe du limon change tout, et la lumière passe toujours.",
      author: "Client particulier — exemple d'avis",
    },
  },
  {
    slug: "chaise-acier-bois",
    name: "Chaise Acier & Bois",
    tagline: "Structure acier fine, assise bois massif sculptée.",
    images: [
      { src: "/images/interieur-ensemble.jpg", alt: "Table Mikado, escalier et plafond lumineux dans une pièce à vivre" },
    ],
    sizes: [{ id: "standard", label: "Taille unique", price: 320 }],
    woods: woods({ pin: -55, hetre: -30, chene: 0, noyer: 45 }),
    metals: [
      { id: "noir", label: "Noir mat", swatch: "#1c1a18" },
      { id: "brut", label: "Acier brut verni", swatch: "#8a8578" },
    ],
    sections: [
      {
        title: "Légère à l'œil, solide à l'usage",
        body: "Un cadre en tube d'acier fin souligné par une assise en chêne massif galbée. La chaise accompagne naturellement la table Mikado, seule ou en série.",
      },
    ],
    specs: [
      { label: "Assise", value: "Chêne massif, finition huile-cire" },
      { label: "Structure", value: "Tube acier, soudure TIG, thermolaquage mat" },
      { label: "Fabrication", value: "Sur commande — comptez 4 semaines" },
    ],
  },
  {
    slug: "console-metallier",
    name: "Console Métallier",
    tagline: "Console d'entrée, soudure apparente assumée, ligne fine.",
    images: [],
    sizes: [
      { id: "s", label: "100 × 35 cm", price: 890 },
      { id: "m", label: "140 × 35 cm", price: 1050 },
    ],
    woods: woods({ pin: -140, hetre: -80, chene: 0, noyer: 110 }),
    metals: [{ id: "noir", label: "Noir mat", swatch: "#1c1a18" }],
    sections: [
      {
        title: "L'atelier dans l'entrée",
        body: "Ici, les cordons de soudure restent visibles : c'est la signature de la pièce. Un cadre d'acier fin, un plateau de chêne, rien de plus.",
      },
    ],
    specs: [
      { label: "Plateau", value: "Chêne massif, épaisseur 30 mm" },
      { label: "Structure", value: "Acier plein, soudure apparente vernie" },
      { label: "Fabrication", value: "Sur commande — comptez 4 semaines" },
    ],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

/** Prix plancher réel : plus petite dimension dans l'essence la moins chère. */
export function priceFrom(product: Product) {
  const cheapestSize = Math.min(...product.sizes.map((s) => s.price));
  const cheapestWood = product.woods.length
    ? Math.min(...product.woods.map((w) => w.priceDelta ?? 0))
    : 0;
  return cheapestSize + cheapestWood;
}
