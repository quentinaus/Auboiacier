export type ProductSize = { id: string; label: string; price: number };
export type ProductMaterial = { id: string; label: string; swatch: string };

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  sizes: ProductSize[];
  materials: ProductMaterial[];
};

export const products: Product[] = [
  {
    slug: "table-fer-chene",
    name: "Table Fer & Chêne",
    tagline: "Piétement acier soudé, plateau chêne massif huilé.",
    sizes: [
      { id: "s", label: "140 × 80 cm", price: 1450 },
      { id: "m", label: "180 × 90 cm", price: 1690 },
      { id: "l", label: "220 × 100 cm", price: 1990 },
    ],
    materials: [
      { id: "brut", label: "Acier brut verni", swatch: "#8a8578" },
      { id: "noir", label: "Acier noir mat", swatch: "#22201c" },
      { id: "chene", label: "Chêne huilé", swatch: "#a9784f" },
    ],
  },
  {
    slug: "chaise-acier-bois",
    name: "Chaise Acier & Bois",
    tagline: "Structure acier, assise bois massif.",
    sizes: [{ id: "standard", label: "Taille unique", price: 320 }],
    materials: [
      { id: "brut", label: "Acier brut", swatch: "#8a8578" },
      { id: "noir", label: "Acier noir mat", swatch: "#22201c" },
    ],
  },
  {
    slug: "console-metallier",
    name: "Console Métallier",
    tagline: "Console d'entrée, soudure apparente, ligne fine.",
    sizes: [
      { id: "s", label: "100 × 35 cm", price: 890 },
      { id: "m", label: "140 × 35 cm", price: 1050 },
    ],
    materials: [
      { id: "brut", label: "Acier brut", swatch: "#8a8578" },
      { id: "noir", label: "Acier noir mat", swatch: "#22201c" },
    ],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function priceFrom(product: Product) {
  return Math.min(...product.sizes.map((s) => s.price));
}
