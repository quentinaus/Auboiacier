import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Rien à indexer côté panier ou confirmation de commande.
        disallow: [
          "/api/",
          "/fr/panier",
          "/en/panier",
          "/fr/commande/",
          "/en/commande/",
          // La page privée de l'atelier.
          "/atelier/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
