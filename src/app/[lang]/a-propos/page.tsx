import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdPersonne, scriptJsonLd } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

/*
 * La page À propos : une page de marque, pas un CV (Quentin, 09/10/2026 : « tu mets pas la boîte en valeur »).
 * L'atelier d'abord (titre, grande photo, façon de travailler, prix, ce qu'il fabrique), puis l'homme derrière
 * l'atelier, son parcours en une ligne discrète tout en bas de son bloc, et les deux boutons.
 * Sans « artisan » (loi 96-603, art. 21, avant l'immatriculation).
 */

// La grande photo : changer cette ligne suffit (une nouvelle vraie photo s'ajoute aussi à VRAIES_PHOTOS, src/lib/visuels.ts).
const PHOTO_QUENTIN = "/images/atelier-soudeur.jpg";
// Son texte alternatif : toujours dict.hub.altAtelier, qui nomme Quentin (tests/visuels.test.ts).

/** Ce que fabrique l'atelier : chaque mot mène à sa page (adresses du plan du site, src/app/sitemap.ts). */
const FABRICATIONS = [
  { cle: "gardeCorps", chemin: "/artisanat/famille/garde-corps" },
  { cle: "escaliers", chemin: "/artisanat/escalier-limon-central" },
  { cle: "verrieres", chemin: "/artisanat/verrieres" },
  { cle: "tables", chemin: "/artisanat/tables" },
  { cle: "plafonds", chemin: "/toiles-tendues" },
  { cle: "sculptures", chemin: "/artisanat/sculptures" },
  { cle: "soudure", chemin: "/soudure-reparations" },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/a-propos">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/a-propos",
    title: dict.seo.apropos.title,
    description: dict.seo.apropos.description,
    image: PHOTO_QUENTIN,
  });
}

export default async function AProposPage({
  params,
}: PageProps<"/[lang]/a-propos">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.apropos;

  const titreSection = `${serif.className} text-[1.9rem] font-normal leading-[1.08] tracking-[-0.018em] md:text-[2.6rem]`;
  const texte = "text-[16px] leading-[1.6] text-[#4a4038] md:text-[17px]";
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      {/* Quentin pour Google (src/lib/seo.ts, jsonLdPersonne) : le même parcours que la ligne du bas de son bloc. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(jsonLdPersonne(locale, { image: PHOTO_QUENTIN }))}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* 1. L'atelier d'abord : le nom, une affirmation, une phrase, puis la grande photo. Monte sans attendre le JavaScript. */}
        <section className="px-6 pb-16 pt-14 md:pb-28 md:pt-24">
          <div className="entree-monte mx-auto max-w-4xl text-center" style={entree(80)}>
            <p className="surtitre">{t.surtitre}</p>
            <h1
              className={`${serif.className} mx-auto mt-4 max-w-3xl text-balance text-[2.5rem] font-normal leading-[1.04] tracking-[-0.02em] sm:text-[3.2rem] md:text-[4.2rem]`}
            >
              {t.h1}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-[17px] leading-[1.5] text-[#5c5140] md:mt-8 md:text-[21px]">
              {t.intro}
            </p>
          </div>
          <div className="entree-monte mx-auto mt-12 max-w-6xl md:mt-16" style={entree(260)}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] md:aspect-[21/9]">
              <Visuel
                locale={locale}
                src={PHOTO_QUENTIN}
                alt={dict.hub.altAtelier}
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1152px"
                className="object-cover object-[40%_center]"
              />
            </div>
          </div>
        </section>

        {/* 2. Deux affirmations côte à côte : la façon de travailler, le prix. */}
        <section className="px-6 pb-16 md:pb-28">
          <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2 md:gap-20">
            <Apparition>
              <h2 className={titreSection}>{t.faconTitre}</h2>
              <p className={`${texte} mt-5 md:mt-6`}>{t.facon}</p>
            </Apparition>
            <Apparition retard={110}>
              <h2 className={titreSection}>{t.prixTitre}</h2>
              <p className={`${texte} mt-5 md:mt-6`}>{t.prix}</p>
            </Apparition>
          </div>
        </section>

        {/* 3. Ce que fabrique l'atelier : une ligne de liens discrets, sur fond papier. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-24">
          <Apparition className="mx-auto max-w-5xl text-center">
            <h2 className={titreSection}>{t.fabriqueTitre}</h2>
            <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 md:mt-10">
              {FABRICATIONS.map(({ cle, chemin }) => (
                <li key={cle}>
                  <Link href={`/${locale}${chemin}`} className="lien-fleche text-[16px] text-[#2b2320] md:text-[17px]">
                    {t.fabrique[cle]}
                  </Link>
                </li>
              ))}
            </ul>
          </Apparition>
        </section>

        {/* 4. Ensuite seulement : l'homme derrière l'atelier. Le parcours, en une ligne discrète, tout en bas. */}
        <section className="px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{t.hommeTitre}</h2>
            
            <p className={`${texte} mt-6`}>{t.homme}</p>
            <p className={`${texte} mt-4`}>{t.parcours}</p>
            <p className="mt-8 border-t border-[#e8e1d6] pt-4 text-[14px] leading-[1.5] text-[#6f6357]">{t.signature}</p>
          </Apparition>
        </section>

        {/* 5. La fin : le prix, ou un message. */}
        <section className="px-6 pb-20 md:pb-32">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titreSection}>{t.finTitre}</h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={`/${locale}/devis`} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <Link href={`/${locale}/contact`} className="btn-clair border border-[#d9cdb9]">
                {t.ctaContact}
              </Link>
            </div>
          </Apparition>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
