import type { Metadata, Viewport } from "next";
import "../globals.css";

/**
 * Le gabarit racine des pages de l'atelier.
 *
 * Il manquait. `/atelier/agenda` vit hors du segment [lang] — c'est une page
 * de travail, elle n'a pas à être bilingue ni indexée — et n'avait donc
 * AUCUN gabarit au-dessus d'elle : pas de balise <html>, pas de <body>, pas
 * de feuille de style. Next rendait la page en erreur. Le défaut passait
 * inaperçu parce que sans la bonne clé la page répond « introuvable », et que
 * personne d'autre que Quentin n'ouvre jamais cette adresse.
 *
 * Next.js accepte plusieurs gabarits racines tant que chacun porte <html> et
 * <body> : celui-ci sert les pages de l'atelier, celui de [lang] sert le site.
 */

export const metadata: Metadata = {
  // Aucune page de l'atelier n'a sa place dans un moteur de recherche.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2b2320",
  width: "device-width",
  initialScale: 1,
};

export default function AtelierLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
