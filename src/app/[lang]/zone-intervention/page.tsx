import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd, COMMUNES_AFFICHEES, DEPARTEMENTS_DESSERVIS } from "@/lib/seo";
import { RAYON_MAX_KM } from "@/lib/deplacement";
import { remplir } from "@/lib/vitrine";
import { photos } from "@/lib/chantiers";
import { estVraiePhoto } from "@/lib/visuels";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";
import { Apparition } from "@/components/apparition";

/**
 * « Métallier en Maine-et-Loire et en Touraine » : la page de l'atelier et de
 * son terrain (« métallier Saumur » reste à l'accueil : plan de référencement,
 * 1.13, et relecture du 07/10/2026). Pas de
 * page par ville (Google les prend pour des pages satellites) : une seule
 * page, avec ce que l'atelier fait vraiment, où il se déplace, et les
 * chantiers qui portent une commune — la preuve locale.
 */

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/zone-intervention">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/zone-intervention",
    title: dict.seo.zone.title,
    description: dict.seo.zone.description,
    image: "/images/saumur.jpg",
  });
}

export default async function ZonePage({ params }: PageProps<"/[lang]/zone-intervention">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.zone;

  /** Un métier, une ligne vraie, une page. */
  const metiers = [
    { ...t.metiers.gardeCorps, href: `/${locale}/artisanat/garde-corps` },
    { ...t.metiers.escalier, href: `/${locale}/artisanat/escalier-limon-central` },
    { ...t.metiers.verrieres, href: `/${locale}/artisanat/verrieres` },
    { ...t.metiers.tables, href: `/${locale}/artisanat/tables` },
    { ...t.metiers.plafonds, href: `/${locale}/toiles-tendues` },
    { ...t.metiers.sculptures, href: `/${locale}/artisanat/sculptures` },
  ];

  // Les chantiers publiés avec leur commune (src/lib/chantiers.ts). Tant
  // qu'il n'y en a aucun, le bloc ne s'affiche pas.
  // Une vraie photo seulement : un visuel n'est jamais présenté comme une réalisation près de chez le visiteur.
  const pres = photos.filter((photo) => photo.commune && !photo.video && estVraiePhoto(photo.src));

  // La question de la FAQ qui répond à « où trouver un métallier à Saumur » :
  // on y renvoie plutôt que de la recopier.
  const questionMetallier = dict.faq.items.find((item) => item.id === "metallier-saumur");

  /** Les titres de la page, aux tailles de l'accueil (façon Apple, 06/10/2026). */
  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const sousTitre = `${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";
  /** Le titre et la phrase du haut arrivent l'un après l'autre, comme en haut de l'accueil. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: t.title, chemin: "/zone-intervention" },
          ])
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* 1. Le titre : le métier et la ville. */}
      <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-3xl">
          {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[14px] text-[#6f6357]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#2b2320]">{t.title}</span>
          </nav>
          <h1
            className={`${serif.className} entree-monte mt-10 text-balance text-[2.4rem] leading-[1.03] tracking-[-0.02em] md:mt-14 sm:text-[3rem] md:text-[3.8rem]`}
            style={entree(150)}
          >
            {t.h1}
          </h1>
          <p
            className="entree-monte mt-6 text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
            style={entree(330)}
          >
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* 2. Ce que l'atelier fabrique et pose : un lien par métier. Le lien
          garde le seul nom du métier ; toute la tuile s'ouvre au clic. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition>
            <h2 className={`${titreSection} text-center`}>{t.metiersTitle}</h2>
          </Apparition>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-3">
            {metiers.map((metier, i) => (
              <li key={metier.href}>
                <Apparition retard={(i % 3) * 110} className="h-full">
                  <div className="group relative h-full rounded-[22px] bg-white px-7 py-7 transition-shadow duration-500 hover:shadow-[0_22px_50px_-36px_rgba(43,35,32,0.5)] md:px-8 md:py-8">
                    {/* Le chevron dit que la tuile s'ouvre ; le calque (before) rend toute la tuile cliquable. */}
                    <Link
                      href={metier.href}
                      className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] decoration-1 underline-offset-[6px] before:absolute before:inset-0 before:rounded-[22px] before:content-[''] after:ml-1.5 after:inline-block after:transition-transform after:duration-300 after:content-['›'] group-hover:underline group-hover:after:translate-x-1 md:text-[1.5rem]`}
                    >
                      {metier.titre}
                    </Link>
                    <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{metier.texte}</p>
                  </div>
                </Apparition>
              </li>
            ))}
          </ul>
          {/* Les deux autres services de l'atelier, chacun sur sa page (référencement, 07/10/2026) : sur devis, et sans
              pose tant que l'assurance décennale n'est pas signée — ils ne sont donc pas rangés sous « fabrique et pose ». */}
          <nav
            aria-label={locale === "fr" ? "Autres services de l'atelier" : "Other workshop services"}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 md:mt-14"
          >
            <span className="py-2 text-[16px] text-[#5c5140]">{locale === "fr" ? "Aussi, sur devis\u00a0:" : "Also, quoted per project:"}</span>
            <Link href={`/${locale}/garde-corps-balcon-terrasse`} className="lien-fleche py-2 text-[#2b2320]">
              {locale === "fr" ? "Garde-corps de balcon et de terrasse" : "Balcony and terrace railings"}
            </Link>
            <Link href={`/${locale}/soudure-reparations`} className="lien-fleche py-2 text-[#2b2320]">
              {locale === "fr" ? "Soudure et réparations" : "Welding and repairs"}
            </Link>
          </nav>
        </div>
      </section>

      {/* 3. Où l'atelier se déplace, et comment se passe un chantier. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col gap-14 md:gap-16">
          <Apparition>
            <h2 className={sousTitre}>{t.autourTitle}</h2>
            <p className={`mt-4 ${texte}`}>{t.autourBody}</p>

            {pres.length > 0 && (
              <div className="mt-8">
                <h3 className="surtitre">{t.realisationsTitle}</h3>
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  {pres.map((photo) => {
                    const legende = dict.realisations[photo.alt];
                    const contenu = (
                      <>
                        <div className={`relative aspect-[16/10] overflow-hidden rounded-[22px] ${hoverZoom}`}>
                          <Visuel
                            locale={locale}
                            src={photo.src}
                            alt={legende}
                            fill
                            sizes="(max-width: 640px) 100vw, 360px"
                            className="object-cover"
                          />
                        </div>
                        <figcaption className="text-[15px] leading-[1.5] text-[#5c5140]">
                          <span className="font-medium text-[#2b2320]">{photo.commune}</span> — {legende}
                        </figcaption>
                      </>
                    );
                    return (
                      <figure key={photo.src} className="flex flex-col gap-3">
                        {photo.lien ? (
                          <Link href={`/${locale}/artisanat/${photo.lien}`} className="flex flex-col gap-3">
                            {contenu}
                          </Link>
                        ) : (
                          contenu
                        )}
                      </figure>
                    );
                  })}
                </div>
              </div>
            )}
          </Apparition>

          <Apparition>
            <h2 className={sousTitre}>{t.voisinsTitle}</h2>
            <p className={`mt-4 ${texte}`}>{t.voisinsBody}</p>
            <Link href={`/${locale}/rendez-vous`} className="lien-fleche mt-4 py-2 text-[#2b2320]">
              {t.rdvLink}
            </Link>
            {/* Les deux guides à lire avant la visite (référencement, lot L9). */}
            <nav aria-label={t.guidesTitre} className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-1">
              <span className="py-2 text-[16px] text-[#5c5140]">{t.guidesTitre}</span>
              <Link href={`/${locale}/garde-corps-fenetre-normes`} className="lien-fleche py-2 text-[#2b2320]">
                {dict.liens.normesGc}
              </Link>
              <Link href={`/${locale}/escalier-limon-central-prix-normes`} className="lien-fleche py-2 text-[#2b2320]">
                {dict.liens.guideEscalier}
              </Link>
            </nav>
          </Apparition>

          {/* Le terrain : maisons de tuffeau et secteurs protégés autour de Saumur. */}
          <Apparition>
            <h2 className={sousTitre}>{t.localTitle}</h2>
            <p className={`mt-4 ${texte}`}>{t.localBody}</p>
          </Apparition>

          {/* « Métallerie à Saumur » : ce que fait l'atelier sur place, avec les pages qui détaillent chaque métier. */}
          <Apparition>
            <h2 className={sousTitre}>{t.metalleriesTitle}</h2>
            <p className={`mt-4 ${texte}`}>{t.metalleriesBody}</p>
            <nav aria-label={t.metalleriesTitle} className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-1">
              <Link href={`/${locale}/artisanat/tables`} className="lien-fleche py-2 text-[#2b2320]">
                {dict.liens.tables}
              </Link>
              <Link href={`/${locale}/toiles-tendues`} className="lien-fleche py-2 text-[#2b2320]">
                {dict.liens.plafonds}
              </Link>
              <Link href={`/${locale}/bois-massif`} className="lien-fleche py-2 text-[#2b2320]">
                {dict.liens.boisLong}
              </Link>
              <Link href={`/${locale}/devis`} className="lien-fleche py-2 text-[#2b2320]">
                {dict.nav.devis}
              </Link>
            </nav>
          </Apparition>

          {t.sections.map((section) => (
            <Apparition key={section.title}>
              <h2 className={sousTitre}>{section.title}</h2>
              {/* Les textes contiennent des retours à la ligne (les étapes d'un
                  chantier) : whitespace-pre-line les respecte. */}
              <p className={`mt-4 whitespace-pre-line ${texte}`}>
                {section.body}
              </p>
            </Apparition>
          ))}
        </div>
      </section>

      {/* 4. Les communes desservies, écrites noir sur blanc. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Apparition>
            <h2 className={`${titreSection} text-center`}>{t.communesTitle}</h2>
            {/* Les quatre départements, puis les communes à moins de 50 km de l'atelier (COMMUNES_AFFICHEES) : une longue
                liste de villes lointaines ressemblait à du bourrage. Le reste de la zone tient en une phrase. */}
            <ul className="mt-10 flex flex-wrap justify-center gap-2.5 md:mt-12">
              {DEPARTEMENTS_DESSERVIS.map((departement) => (
                <li key={departement.numero} className="rounded-full bg-[#2b2320] px-[1.1rem] py-2.5 text-[15px] text-white">
                  {departement.nom} ({departement.numero})
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap justify-center gap-2.5">
              {COMMUNES_AFFICHEES.map((commune) => (
                <li
                  key={commune}
                  className="rounded-full bg-white px-[1.1rem] py-2.5 text-[15px] text-[#4a4038]"
                >
                  {commune}
                </li>
              ))}
            </ul>
            <p className={`mx-auto mt-6 max-w-2xl text-center ${texte}`}>{remplir(t.communesNote, { rayonMax: String(RAYON_MAX_KM) })}</p>
          </Apparition>

          {questionMetallier && (
            <Apparition>
              {/* La question sur sa ligne, le lien dessous : collés, le « ? » partait seul en début de ligne. */}
              <p className={`mx-auto mt-12 max-w-3xl text-balance text-center md:mt-16 ${texte}`}>
                <span className={`${serif.className} block text-[1.2rem] text-[#2b2320] md:text-[1.35rem]`}>
                  {questionMetallier.q.replace(/ ([?!:;])/g, " $1")}
                </span>{" "}
                <Link
                  href={`/${locale}/faq#${questionMetallier.id}`}
                  className="mt-2 inline-block underline underline-offset-4 hover:text-[#2b2320]"
                >
                  {t.faqQuestionLink}
                </Link>
              </p>
            </Apparition>
          )}
        </div>
      </section>

      {/* 5. Une commune absente : on écrit quand même. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <Apparition className="mx-auto max-w-3xl text-center">
          <h2 className={titreSection}>{t.ctaTitle}</h2>
          <p className={`mx-auto mt-5 max-w-2xl ${texte}`}>{t.ctaBody}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Link href={`/${locale}/contact`} className="btn-plein">
              {t.ctaLabel}
            </Link>
            <Link href={`/${locale}/faq`} className="lien-fleche py-2 text-[#2b2320]">
              {t.faqLink}
            </Link>
          </div>
        </Apparition>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
