export type ProductSize = { id: string; label: string; price: number };
export type ProductSwatch = { id: string; label: string; swatch: string };
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

export const products: Product[] = [
  {
    slug: "table-mikado",
    name: "Table Mikado",
    tagline: "Piétement acier croisé soudé main, plateau chêne massif.",
    images: [
      { src: "/images/table-mikado-full.jpg", alt: "Table Mikado — vue d'ensemble" },
      { src: "/images/table-mikado-detail.jpg", alt: "Table Mikado — détail plateau chêne et piétement acier" },
    ],
    sizes: [
      { id: "s", label: "180 × 90 cm", price: 1450 },
      { id: "m", label: "220 × 100 cm", price: 1690 },
      { id: "l", label: "240 × 110 cm", price: 1990 },
    ],
    woods: [
      { id: "chene", label: "Chêne massif", swatch: "#b98a5a" },
      { id: "noyer", label: "Noyer massif", swatch: "#6f4a2f" },
    ],
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
    ],
    sizes: [
      { id: "droit", label: "Droit — 13 marches", price: 6900 },
      { id: "quart", label: "Quart tournant — 14 marches", price: 8400 },
      { id: "demi", label: "Demi-tournant — 16 marches", price: 9800 },
    ],
    woods: [
      { id: "chene", label: "Chêne massif", swatch: "#b98a5a" },
      { id: "noyer", label: "Noyer massif", swatch: "#6f4a2f" },
    ],
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
    images: [],
    sizes: [{ id: "standard", label: "Taille unique", price: 320 }],
    woods: [{ id: "chene", label: "Chêne massif", swatch: "#b98a5a" }],
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
    woods: [{ id: "chene", label: "Chêne massif", swatch: "#b98a5a" }],
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

export function priceFrom(product: Product) {
  return Math.min(...product.sizes.map((s) => s.price));
}
