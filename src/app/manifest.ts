import type { MetadataRoute } from "next";

/**
 * Le manifeste du site : nom, couleurs et icônes que les navigateurs
 * utilisent quand on épingle le site sur l'écran d'accueil d'un téléphone ou
 * dans la barre d'un navigateur. Next le sert sur /manifest.webmanifest et
 * ajoute la balise <link rel="manifest"> tout seul.
 *
 * Pas une application « installable » (display: browser, pas de service
 * worker) : c'est un site, qui s'ouvre dans le navigateur.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Auboiacier — atelier de métallerie, Saumur",
    short_name: "Auboiacier",
    description: "Mobilier acier et bois massif, plafonds lumineux sur mesure.",
    start_url: "/fr",
    lang: "fr",
    display: "browser",
    theme_color: "#6d2c2c",
    background_color: "#fbf9f6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android rogne l'icône à sa forme (cercle, goutte…) : celle-ci a le
      // A réduit au centre et un fond plein qui remplit toute la forme.
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
