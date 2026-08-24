export type ProductSize = { id: string; label: string; price: number };
export type ProductSwatch = { id: string; label: string; swatch: string };

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  images: { src: string; alt: string }[];
  sizes: ProductSize[];
  woods: ProductSwatch[];
  metals: ProductSwatch[];
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
  },
  {
    slug: "chaise-acier-bois",
    name: "Chaise Acier & Bois",
    tagline: "Structure acier, assise bois massif.",
    images: [],
    sizes: [{ id: "standard", label: "Taille unique", price: 320 }],
    woods: [{ id: "chene", label: "Chêne massif", swatch: "#b98a5a" }],
    metals: [
      { id: "noir", label: "Noir mat", swatch: "#1c1a18" },
      { id: "brut", label: "Acier brut verni", swatch: "#8a8578" },
    ],
  },
  {
    slug: "console-metallier",
    name: "Console Métallier",
    tagline: "Console d'entrée, soudure apparente, ligne fine.",
    images: [],
    sizes: [
      { id: "s", label: "100 × 35 cm", price: 890 },
      { id: "m", label: "140 × 35 cm", price: 1050 },
    ],
    woods: [{ id: "chene", label: "Chêne massif", swatch: "#b98a5a" }],
    metals: [{ id: "noir", label: "Noir mat", swatch: "#1c1a18" }],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function priceFrom(product: Product) {
  return Math.min(...product.sizes.map((s) => s.price));
}
