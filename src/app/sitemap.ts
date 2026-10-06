import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { products } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

/** Toutes les pages du site, dans les deux langues, avec leurs équivalents. */
const PAGES: { chemin: string; priorite: number; frequence: "weekly" | "monthly" | "yearly" }[] = [
  { chemin: "", priorite: 1, frequence: "weekly" },
  { chemin: "/artisanat", priorite: 0.9, frequence: "weekly" },
  // Les tables sur mesure : modèles, essences, dimensions, questions.
  { chemin: "/artisanat/tables", priorite: 0.9, frequence: "weekly" },
  { chemin: "/toiles-tendues", priorite: 0.9, frequence: "weekly" },
  { chemin: "/realisations", priorite: 0.8, frequence: "monthly" },
  { chemin: "/artisanat/sculptures", priorite: 0.7, frequence: "monthly" },
  { chemin: "/artisanat/verrieres", priorite: 0.7, frequence: "monthly" },
  // Comment l'outil vérifie un garde-corps : les règles, et un exemple réel (étude marketing, 06/10).
  { chemin: "/artisanat/verification-garde-corps", priorite: 0.6, frequence: "monthly" },
  { chemin: "/devis", priorite: 0.9, frequence: "monthly" },
  { chemin: "/rendez-vous", priorite: 0.8, frequence: "monthly" },
  { chemin: "/a-propos", priorite: 0.6, frequence: "monthly" },
  // Le bois massif à l'atelier : l'autre matière, à côté de l'acier.
  { chemin: "/bois-massif", priorite: 0.7, frequence: "monthly" },
  // Le garde-corps de fenêtre : la règle de hauteur et de vides, avec des exemples calculés par le moteur.
  { chemin: "/garde-corps-fenetre-normes", priorite: 0.8, frequence: "monthly" },
  // L'escalier à limon central : prix par forme et par essence (moteur du catalogue), normes sourcées.
  { chemin: "/escalier-limon-central-prix-normes", priorite: 0.8, frequence: "monthly" },
  // Les garde-corps de balcon, de terrasse et les rampes d'escalier extérieur (oui de Quentin, 07/10/2026).
  { chemin: "/garde-corps-balcon-terrasse", priorite: 0.7, frequence: "monthly" },
  // La soudure et les réparations à façon, à Saumur (oui de Quentin, 07/10/2026).
  { chemin: "/soudure-reparations", priorite: 0.7, frequence: "monthly" },
  // Les deux pages écrites pour le référencement local : Google doit les voir vite.
  { chemin: "/zone-intervention", priorite: 0.7, frequence: "monthly" },
  { chemin: "/faq", priorite: 0.7, frequence: "monthly" },
  { chemin: "/contact", priorite: 0.8, frequence: "monthly" },
  // Ni /cgv, /cgu, /confidentialite ni /mentions-legales : ces quatre pages
  // se déclarent « ne m'indexe pas », et un plan de site qui annonce une page
  // interdite d'indexation fait perdre à Google confiance dans le plan TOUT
  // ENTIER.
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
        languages: {
          ...Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${chemin}`])),
          // Même « x-default » que dans les pages (alternatesPour, src/lib/seo.ts) :
          // le plan de site et le HTML doivent raconter la même chose.
          "x-default": `${SITE_URL}/fr${chemin}`,
        },
      },
    }))
  );
}
