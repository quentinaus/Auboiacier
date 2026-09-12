import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { products } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

/** Toutes les pages du site, dans les deux langues, avec leurs équivalents. */
const PAGES: { chemin: string; priorite: number; frequence: "weekly" | "monthly" | "yearly" }[] = [
  { chemin: "", priorite: 1, frequence: "weekly" },
  { chemin: "/artisanat", priorite: 0.9, frequence: "weekly" },
  { chemin: "/toiles-tendues", priorite: 0.9, frequence: "weekly" },
  { chemin: "/artisanat/sculptures", priorite: 0.7, frequence: "monthly" },
  { chemin: "/artisanat/verrieres", priorite: 0.7, frequence: "monthly" },
  { chemin: "/toiles-tendues/realisations", priorite: 0.6, frequence: "monthly" },
  { chemin: "/toiles-tendues/devis", priorite: 0.6, frequence: "monthly" },
  { chemin: "/a-propos", priorite: 0.6, frequence: "monthly" },
  // Les deux pages écrites pour le référencement local : Google doit les voir vite.
  { chemin: "/zone-intervention", priorite: 0.7, frequence: "monthly" },
  { chemin: "/faq", priorite: 0.7, frequence: "monthly" },
  { chemin: "/contact", priorite: 0.8, frequence: "monthly" },
  // Ni /cgv ni /mentions-legales : ces deux pages se déclarent « ne m'indexe
  // pas », et un plan de site qui annonce une page interdite d'indexation fait
  // perdre à Google confiance dans le plan TOUT ENTIER.
];

export default function sitemap(): MetadataRoute.Sitemap {
  const chemins = [
    ...PAGES,
    ...products.map((p) => ({
      chemin: `/artisanat/${p.slug}`,
      priorite: 0.8,
      frequence: "monthly" as const,
    })),
  ];

  return chemins.flatMap(({ chemin, priorite, frequence }) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${chemin}`,
      // Pas de lastModified : renvoyer la date du jour pour les soixante
      // adresses, à chaque visite du robot, revient à lui mentir. Google
      // s'en aperçoit et cesse de tenir compte du champ.
      changeFrequency: frequence,
      priority: priorite,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${SITE_URL}/${l}${chemin}`])
        ),
      },
    }))
  );
}
