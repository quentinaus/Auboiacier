import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { products } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { DATE_MODIFICATION_GUIDE_ESCALIER } from "@/lib/textes/guide-escalier";

/**
 * Toutes les pages du site, dans les deux langues, avec leurs équivalents.
 * `modifie` (AAAA-MM-JJ) : seulement pour une page qui a une vraie date de
 * mise à jour, la même que celle qu'elle affiche et qu'elle donne à Google
 * (Article) — aujourd'hui le guide de l'escalier.
 */
const PAGES: { chemin: string; priorite: number; frequence: "weekly" | "monthly" | "yearly"; modifie?: string }[] = [
  { chemin: "", priorite: 1, frequence: "weekly" },
  { chemin: "/artisanat", priorite: 0.9, frequence: "weekly" },
  // Les tables sur mesure : modèles, essences, dimensions, questions.
  { chemin: "/artisanat/tables", priorite: 0.9, frequence: "weekly" },
  { chemin: "/toiles-tendues", priorite: 0.9, frequence: "weekly" },
  { chemin: "/realisations", priorite: 0.8, frequence: "monthly" },
  { chemin: "/artisanat/sculptures", priorite: 0.7, frequence: "monthly" },
  { chemin: "/artisanat/verrieres", priorite: 0.7, frequence: "monthly" },
  // Les familles à plusieurs modèles : leur page (Collection refaite le 09/10/2026).
  { chemin: "/artisanat/famille/garde-corps", priorite: 0.8, frequence: "weekly" },
  { chemin: "/artisanat/famille/portail", priorite: 0.7, frequence: "weekly" },
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
  { chemin: "/escalier-limon-central-prix-normes", priorite: 0.8, frequence: "monthly", modifie: DATE_MODIFICATION_GUIDE_ESCALIER },
  // Les garde-corps de balcon, de terrasse et les rampes d'escalier extérieur (oui de Quentin, 07/10/2026).
  { chemin: "/garde-corps-balcon-terrasse", priorite: 0.7, frequence: "monthly" },
  // Le portail sur mesure à Saumur : la page d'atterrissage des quatre fiches portail (10/10/2026).
  { chemin: "/portail-sur-mesure-saumur", priorite: 0.8, frequence: "monthly" },
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
  const chemins: (typeof PAGES)[number][] = [
    ...PAGES,
    ...products.map((p) => ({
      chemin: `/artisanat/${p.slug}`,
      priorite: 0.8,
      frequence: "monthly" as const,
    })),
  ];

  return chemins.flatMap(({ chemin, priorite, frequence, modifie }) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${chemin}`,
      // Pas de lastModified inventé : renvoyer la date du jour pour les
      // soixante adresses, à chaque visite du robot, revient à lui mentir.
      // Google s'en aperçoit et cesse de tenir compte du champ. Seule une
      // page datée (`modifie`) donne sa vraie date.
      ...(modifie ? { lastModified: modifie } : {}),
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
