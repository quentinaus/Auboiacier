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
import { remplacerAvec } from "@/lib/marqueurs";
import { DATE_OUVERTURE_COMMANDES } from "@/lib/ouverture";
import { jourEnLettres } from "@/lib/textes/garde-corps-balcon-terrasse";

/*
 * La page À propos, refaite à la demande de Quentin (09/10/2026) : « pas une page pour faire du “moi je” ».
 * Une minute de lecture : sa photo, qui il est, ce qu'il fabrique, ce qu'il aime, le but, puis deux boutons.
 * Écrite à la troisième personne, sans « artisan » (loi 96-603, art. 21, avant l'immatriculation).
 */

// La photo du haut : changer cette ligne suffit (une nouvelle vraie photo s'ajoute aussi à VRAIES_PHOTOS, src/lib/visuels.ts).
const PHOTO_QUENTIN = "/images/atelier-soudeur.jpg";
// Son texte alternatif : toujours dict.hub.altAtelier, qui nomme Quentin (tests/visuels.test.ts).

/** Ce qu'il fabrique : chaque ligne mène à sa page (adresses du plan du site, src/app/sitemap.ts). */
const FABRICATIONS = [
  { cle: "gcFenetre", chemin: "/artisanat/garde-corps" },
  { cle: "gcBalcon", chemin: "/garde-corps-balcon-terrasse" },
  { cle: "escalier", chemin: "/artisanat/escalier-limon-central" },
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
  // Le jour d'ouverture des commandes est lu dans le code, jamais tapé dans le texte.
  const t = remplacerAvec(dict.apropos, { "{ouverture}": jourEnLettres(DATE_OUVERTURE_COMMANDES, locale, true) });

  const titreSection = `${serif.className} text-[1.7rem] font-normal leading-[1.1] tracking-[-0.018em] md:text-[2.1rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      {/* Quentin pour Google : le même parcours que la page (src/lib/seo.ts, jsonLdPersonne), avec sa photo. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(jsonLdPersonne(locale, { image: PHOTO_QUENTIN }))}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* 1. La photo, le nom, une ligne ; 2. qui il est, en trois phrases. Le premier écran monte sans attendre le JavaScript. */}
        <section className="px-6 pb-12 pt-8 md:pb-20 md:pt-20">
          <div className="mx-auto grid max-w-5xl items-center gap-7 md:grid-cols-[5fr_6fr] md:gap-14">
            <div
              className="entree-monte relative aspect-[4/3] overflow-hidden rounded-[10px] md:aspect-[4/5]"
              style={entree(80)}
            >
              <Visuel
                locale={locale}
                src={PHOTO_QUENTIN}
                alt={dict.hub.altAtelier}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 460px"
                className="object-cover object-[42%_center]"
              />
            </div>
            <div className="entree-monte" style={entree(200)}>
              <p className="surtitre">{t.title}</p>
              <h1
                className={`${serif.className} mt-3 text-[2.6rem] font-normal leading-[1.02] tracking-[-0.02em] sm:text-[3.2rem] md:text-[3.8rem]`}
              >
                {t.h1}
              </h1>
              <p className="mt-3 text-[19px] leading-[1.35] text-[#5c5140] md:text-[22px]">{t.ligne}</p>
              <p className={`${texte} mt-6 md:mt-8`}>{t.qui}</p>
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 md:pb-24">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:gap-x-14 md:gap-y-16">
            {/* 3. Ce qu'il fabrique : chaque ligne mène à sa page. */}
            <Apparition>
              <h2 className={titreSection}>{t.fabriqueTitre}</h2>
              <ul className="mt-5 flex flex-col gap-y-2.5">
                {FABRICATIONS.map(({ cle, chemin }) => (
                  <li key={cle}>
                    <Link href={`/${locale}${chemin}`} className="lien-fleche text-[16px] text-[#2b2320] md:text-[17px]">
                      {t.fabrique[cle]}
                    </Link>
                  </li>
                ))}
              </ul>
            </Apparition>

            {/* 4. Ce qu'il aime, et surtout ce qu'il défend. */}
            <Apparition retard={110}>
              <h2 className={titreSection}>{t.aimeTitre}</h2>
              <ul className={`${texte} mt-5 flex flex-col gap-y-2.5`}>
                {t.aime.map((ligne) => (
                  <li key={ligne} className="border-l-2 border-[#e4dccf] pl-4">
                    {ligne}
                  </li>
                ))}
              </ul>
              <p className={`${texte} mt-5 text-[#2b2320]`}>{t.aimeSurtout}</p>
            </Apparition>

            {/* 5. Le but, puis 6. les deux boutons : le prix, ou un message. */}
            <Apparition className="md:col-span-2">
              <div className="rounded-[10px] bg-[#f5f1ea] p-7 md:p-10">
                <h2 className={titreSection}>{t.butTitre}</h2>
                <ul className={`${texte} mt-5 grid gap-x-10 gap-y-2.5 md:grid-cols-2`}>
                  {t.but.map((ligne) => (
                    <li key={ligne} className="border-l-2 border-[#d9cdb9] pl-4">
                      {ligne}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href={`/${locale}/devis`} className="btn-plein">
                    {t.ctaDevis}
                  </Link>
                  <Link href={`/${locale}/contact`} className="btn-clair">
                    {t.ctaContact}
                  </Link>
                </div>
              </div>
            </Apparition>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
