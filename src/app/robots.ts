import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Seulement l'API et la page privée de l'atelier. Le panier, les
        // confirmations et les pages juridiques se déclarent eux-mêmes
        // « ne m'indexe pas » (noIndex dans metadataPage) — et Google ne
        // peut lire cette consigne QUE s'il a le droit de charger la page.
        // Bloquée ici, une adresse liée depuis tout le site (le bouton
        // panier) ressortait quand même dans les résultats, sans titre ni
        // description.
        disallow: ["/api/", "/atelier/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
