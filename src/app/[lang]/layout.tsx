import type { Metadata } from "next";
import "../globals.css";
import { locales, isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { notFound } from "next/navigation";
import { CartProvider } from "@/lib/cart";
import {
  SITE_URL,
  alternatesPour,
  jsonLdAtelier,
  jsonLdSite,
  scriptJsonLd,
  ATELIER,
  titreSeo,
} from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: titreSeo(dict.seo.hub.title),
      // Google ne montre qu'une soixantaine de signes : le modèle reste court
      // pour que le nom de l'atelier ET la ville restent visibles.
      // Les pages qui passent par metadataPage fabriquent déjà leur titre
      // complet ; ce modèle ne sert donc qu'aux pages sans balises à elles.
      template: `%s — ${dict.meta.siteName} ${ATELIER.ville}`,
    },
    description: dict.seo.hub.description,
    applicationName: dict.meta.siteName,
    authors: [{ name: dict.meta.siteName, url: SITE_URL }],
    creator: dict.meta.siteName,
    publisher: dict.meta.siteName,
    category: locale === "fr" ? "Artisanat, mobilier sur mesure" : "Craft, bespoke furniture",
    alternates: alternatesPour(locale, ""),
    formatDetection: { telephone: true, address: true, email: true },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = isLocale(lang) ? lang : defaultLocale;

  // Premier élément de la page, caché tant qu'on ne l'atteint pas au clavier :
  // une personne qui navigue avec la touche Tab (ou avec un lecteur d'écran)
  // saute ainsi tout le menu d'un seul appui.
  const allerAuContenu = locale === "en" ? "Skip to main content" : "Aller au contenu principal";

  return (
    <html lang={lang}>
      <body className="antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#2b2320] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white focus:no-underline focus:outline-2 focus:outline-offset-2 focus:outline-white"
        >
          {allerAuContenu}
        </a>
        {/* Fiche de l'atelier pour les moteurs : métier, adresse, zone desservie. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={scriptJsonLd(jsonLdAtelier(locale))}
        />
        {/* Et la carte d'identité du site, qui fait écrire « Auboiacier »
            sous le résultat de recherche plutôt que « auboiacier.fr ». */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={scriptJsonLd(jsonLdSite(locale))}
        />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
