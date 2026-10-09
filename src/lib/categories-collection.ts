/**
 * LES CATÉGORIES DE LA COLLECTION, partagées par l'accueil (« Ce que nous fabriquons ») et la page Collection
 * (demande de Quentin, 09/10/2026 : « pas épuré, fait IA, pas intuitif » → une grille simple, des photos en situation).
 *
 * Chaque catégorie a UNE photo en situation, au même cadrage 4:5. Trois n'en ont pas encore (tables d'extérieur,
 * chaises d'extérieur, portails) : leur visuel de studio est recadré pour remplir la carte (`studio`), en attendant la
 * vraie photo. Un clic mène là où sont les modèles : la page de la catégorie quand elle existe (tables, verrières,
 * sculptures, plafonds), la fiche quand la famille n'a qu'un modèle, sinon la page de la famille
 * (/artisanat/famille/<id>).
 */
import { products, productLocalise, type Famille } from "@/lib/products";
import type { Locale } from "@/lib/i18n";

export type IdCategorie = Famille | "verrieres" | "sculptures" | "plafond";

/** Les libellés et textes alternatifs dont la grille a besoin (pris dans dict.hub). */
export type TextesCategories = {
  catTables: string;
  catTablesExt: string;
  catGardeCorps: string;
  catChaisesExt: string;
  catEscaliers: string;
  catPortails: string;
  catVerrieres: string;
  catSculptures: string;
  catPlafonds: string;
  altHeroMobilier: string;
  altEscaliers: string;
  altVerrieres: string;
  altSculptures: string;
  altTablesExt: string;
  altChaisesExt: string;
  altPlafondSitu: string;
};

export type Categorie = {
  id: IdCategorie;
  titre: string;
  href: string;
  /** Les familles de pièces qu'elle regroupe (pour le nombre de modèles et le prix de départ). */
  familles: Famille[];
  image: { src: string; alt: string; position?: string; studio?: boolean };
  /** Une vraie photo en situation (l'accueil ne montre que celles-là). */
  enSituation: boolean;
};

/** Les familles qui ont plusieurs modèles et pas de page à elles : elles ont une page « famille ». */
export const FAMILLES_AVEC_PAGE: Famille[] = ["garde-corps", "portail"];

/** Les pièces d'une famille, dans la collection (la lumière a sa boutique, à part). */
export function piecesDeFamille(famille: Famille) {
  return products.filter((p) => p.famille === famille);
}

/** Où mène une famille : sa page de famille, ou la fiche de son unique modèle. */
function lienFamille(locale: Locale, famille: Famille): string {
  if (FAMILLES_AVEC_PAGE.includes(famille)) return `/${locale}/artisanat/famille/${famille}`;
  const pieces = piecesDeFamille(famille);
  return pieces.length === 1 ? `/${locale}/artisanat/${pieces[0].slug}` : `/${locale}/artisanat`;
}

/** L'alt d'une photo de fiche, dans la langue du visiteur. */
function altDeFiche(locale: Locale, slug: string, fichier: string, defaut: string): string {
  const p = products.find((x) => x.slug === slug);
  if (!p) return defaut;
  return productLocalise(p, locale).images.find((i) => i.src.endsWith(fichier))?.alt ?? defaut;
}

export function categoriesCollection(locale: Locale, t: TextesCategories): Categorie[] {
  return [
    {
      id: "table-interieur",
      titre: t.catTables,
      href: `/${locale}/artisanat/tables`,
      familles: ["table-interieur"],
      image: { src: "/images/mikado/ambiance-hd.jpg", alt: t.altHeroMobilier, position: "32% 50%" },
      enSituation: true,
    },
    {
      id: "garde-corps",
      titre: t.catGardeCorps,
      href: lienFamille(locale, "garde-corps"),
      familles: ["garde-corps"],
      image: {
        src: "/images/garde-corps/fenetre-rue.jpg",
        alt: altDeFiche(locale, "garde-corps", "fenetre-rue.jpg", t.catGardeCorps),
        position: "50% 50%",
      },
      enSituation: true,
    },
    {
      id: "escalier",
      titre: t.catEscaliers,
      href: lienFamille(locale, "escalier"),
      familles: ["escalier"],
      image: { src: "/images/escalier/limon-droit.jpg", alt: t.altEscaliers, position: "80% 50%" },
      enSituation: true,
    },
    {
      id: "verrieres",
      titre: t.catVerrieres,
      href: `/${locale}/artisanat/verrieres`,
      familles: [],
      image: { src: "/images/verriere-interieure.jpg", alt: t.altVerrieres, position: "40% 50%" },
      enSituation: true,
    },
    {
      id: "plafond",
      titre: t.catPlafonds,
      href: `/${locale}/toiles-tendues`,
      familles: ["plafond"],
      image: { src: "/images/salle-plafond-tuile.jpg", alt: t.altPlafondSitu, position: "50% 40%" },
      enSituation: true,
    },
    {
      id: "portail",
      titre: t.catPortails,
      href: lienFamille(locale, "portail"),
      familles: ["portail"],
      image: {
        src: "/images/portails/portail-battant-volutes.jpg",
        alt: altDeFiche(locale, "portail-battant", "portail-battant-volutes.jpg", t.catPortails),
        position: "50% 60%",
        studio: true,
      },
      enSituation: false,
    },
    {
      id: "table-exterieur",
      titre: t.catTablesExt,
      href: lienFamille(locale, "table-exterieur"),
      familles: ["table-exterieur"],
      image: { src: "/images/table-exterieur-lattes.jpg", alt: t.altTablesExt, position: "45% 50%", studio: true },
      enSituation: false,
    },
    {
      id: "chaise-exterieur",
      titre: t.catChaisesExt,
      href: lienFamille(locale, "chaise-exterieur"),
      familles: ["chaise-exterieur"],
      image: { src: "/images/chaise-exterieur-tuile.jpg", alt: t.altChaisesExt, studio: true },
      enSituation: false,
    },
    {
      id: "sculptures",
      titre: t.catSculptures,
      href: `/${locale}/artisanat/sculptures`,
      familles: [],
      image: { src: "/images/sculpture-cheval-v2.jpg", alt: t.altSculptures, position: "50% 40%" },
      enSituation: true,
    },
  ];
}
