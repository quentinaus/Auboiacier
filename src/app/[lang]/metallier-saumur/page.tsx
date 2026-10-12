import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import {
  ATELIER,
  COMMUNES_AFFICHEES,
  CONTACT_PUBLIC,
  horairesLisibles,
  metadataPage,
  jsonLdFilAriane,
  jsonLdService,
  scriptJsonLd,
  telephoneLisible,
} from "@/lib/seo";
import { textesMetallierSaumur } from "@/lib/textes/metallier-saumur";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

/**
 * « Métallier à Saumur » (12/10/2026) : l'adresse naturelle de la recherche « métallier Saumur ». Qui est le métallier,
 * ce qu'il fait, pour qui, comment se passe un projet, où il travaille, comment le joindre. Elle renvoie vers chaque
 * métier plutôt que de le recopier.
 *
 * Tous les textes, FR et EN, sont dans src/lib/textes/metallier-saumur.ts. Aucun prix tapé (la prise de cotes vient du
 * code). Données structurées : le fil d'Ariane et le service. Les questions sont visibles mais pas balisées : seules /faq,
 * /artisanat/tables, /toiles-tendues et le guide de l'escalier balisent une FAQ (tests/seo-fiches.test.ts).
 */

const CHEMIN = "/metallier-saumur";

/** En français, une espace insécable avant « ? », « ! », « : » et « ; » : jamais un « ? » seul en début de ligne. */
function insecable(texte: string, locale: Locale) {
  return locale === "fr" ? texte.replace(/ ([?!:;])/g, " $1") : texte;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/metallier-saumur">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = textesMetallierSaumur(locale);
  return metadataPage({ locale, chemin: CHEMIN, title: t.seo.title, description: t.seo.description });
}

export default async function MetallierSaumurPage({ params }: PageProps<"/[lang]/metallier-saumur">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = textesMetallierSaumur(locale);
  const f = (texte: string) => insecable(texte, locale);

  const telephone = telephoneLisible();
  const horaires = horairesLisibles(locale);

  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const sousTitre = `${serif.className} text-balance text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  const liens = [
    { href: `/${locale}/zone-intervention`, label: t.liens.zone },
    { href: `/${locale}/a-propos`, label: t.liens.apropos },
    { href: `/${locale}/faq`, label: t.liens.faq },
    { href: `/${locale}/bois-massif`, label: t.liens.bois },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: t.fil, chemin: CHEMIN },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdService({ locale, nom: t.service.nom, type: t.service.type, chemin: CHEMIN, description: t.seo.description })
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* 1. Le titre, qui est le métallier, les trois portes : devis, rendez-vous, message. */}
        <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
          <div className="mx-auto max-w-3xl">
            <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[14px] text-[#6f6357]">
              <Link href={`/${locale}`} className="hover:text-[#2b2320]">
                {dict.nav.home}
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-[#2b2320]">{t.fil}</span>
            </nav>
            <p className="surtitre entree-monte mt-10 md:mt-14" style={entree(60)}>
              {t.surtitre}
            </p>
            <h1
              className={`${serif.className} entree-monte mt-3 text-balance text-[2.4rem] leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}
              style={entree(150)}
            >
              {t.h1}
            </h1>
            <p className="entree-monte mt-6 text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]" style={entree(330)}>
              {f(t.intro)}
            </p>
            <div className="entree-monte mt-9 flex flex-wrap items-center gap-x-8 gap-y-4" style={entree(480)}>
              <Link href={`/${locale}/devis`} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <Link href={`/${locale}/rendez-vous`} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaRdv}
              </Link>
              <Link href={`/${locale}/contact`} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaContact}
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Ce que fait l'atelier : un ouvrage, une phrase, un lien vers sa page. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{f(t.faitTitre)}</h2>
              <p className={`mx-auto mt-5 max-w-2xl text-center ${texte}`}>{f(t.faitIntro)}</p>
            </Apparition>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-4">
              {t.fait.map((metier, i) => (
                <li key={metier.chemin}>
                  <Apparition retard={(i % 4) * 110} className="h-full">
                    <div className="flex h-full flex-col rounded-[22px] bg-white px-7 py-7">
                      <h3 className={`${serif.className} text-[1.25rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320]`}>{f(metier.titre)}</h3>
                      <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{f(metier.texte)}</p>
                      <Link href={`/${locale}${metier.chemin}`} className="lien-fleche mt-auto pt-4 text-[#2b2320]">
                        {metier.lien}
                      </Link>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. Pour qui. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={titreSection}>{f(t.pourTitre)}</h2>
            </Apparition>
            <div className="mt-10 divide-y divide-[#e8e1d8] border-y border-[#e8e1d8] md:mt-12">
              {t.pour.map((bloc) => (
                <Apparition key={bloc.titre} className="py-7 md:py-8">
                  <h3 className={sousTitre}>{f(bloc.titre)}</h3>
                  <p className={`mt-3 ${texte}`}>{f(bloc.texte)}</p>
                </Apparition>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Comment se passe un projet. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{f(t.deroulementTitre)}</h2>
            </Apparition>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-3">
              {t.deroulement.map((etape, i) => (
                <li key={etape.titre}>
                  <Apparition retard={(i % 3) * 110} className="h-full">
                    <div className="h-full rounded-[22px] bg-white px-7 py-7">
                      <span className="surtitre block" aria-hidden="true">
                        {i + 1}
                      </span>
                      <h3 className={`${serif.className} mt-2 text-[1.3rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320]`}>{f(etape.titre)}</h3>
                      <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{f(etape.texte)}</p>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. Où l'atelier travaille : une phrase, les communes proches (les mêmes que la zone d'intervention), le lien. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{f(t.ouTitre)}</h2>
            {t.ouTexte.map((paragraphe) => (
              <p key={paragraphe} className={`mt-5 ${texte}`}>
                {f(paragraphe)}
              </p>
            ))}
            <h3 className="surtitre mt-9">{t.ouCommunes}</h3>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {COMMUNES_AFFICHEES.map((commune) => (
                <li key={commune} className="rounded-full bg-[#f5f1ea] px-[1.1rem] py-2.5 text-[15px] text-[#4a4038]">
                  {commune}
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/zone-intervention`} className="lien-fleche mt-6 py-2 text-[#2b2320]">
              {t.ouLien}
            </Link>
          </Apparition>
        </section>

        {/* 6. Comment le joindre : l'atelier, le téléphone, l'e-mail, les horaires de la fiche Google. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{f(t.contactTitre)}</h2>
            <p className={`mt-5 ${texte}`}>{f(t.contactIntro)}</p>
            <dl className={`mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-[auto_1fr] ${texte}`}>
              <dt className="text-[#6f6357]">{t.contactLabels.adresse}</dt>
              <dd>{t.contactAdresse}</dd>
              {telephone && (
                <>
                  <dt className="text-[#6f6357]">{t.contactLabels.telephone}</dt>
                  <dd>
                    <a href={`tel:${CONTACT_PUBLIC.telephone}`} className="underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]">
                      {telephone}
                    </a>
                  </dd>
                </>
              )}
              <dt className="text-[#6f6357]">{t.contactLabels.email}</dt>
              <dd>
                <a href={`mailto:${ATELIER.email}`} className="underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]">
                  {ATELIER.email}
                </a>
              </dd>
              {horaires && (
                <>
                  <dt className="text-[#6f6357]">{t.contactLabels.horaires}</dt>
                  <dd>{horaires}</dd>
                </>
              )}
            </dl>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href={`/${locale}/devis`} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <Link href={`/${locale}/rendez-vous`} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaRdv}
              </Link>
            </div>
          </Apparition>
        </section>

        {/* 7. Les questions : visibles, non balisées (voir plus haut). */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={titreSection}>{t.faqTitre}</h2>
            </Apparition>
            <div className="mt-10 divide-y divide-[#e5ddd3] border-y border-[#e5ddd3] md:mt-12">
              {t.faq.map((qr) => (
                <Apparition key={qr.q} className="py-7 md:py-8">
                  <h3 className={sousTitre}>{f(qr.q)}</h3>
                  <p className={`mt-3 ${texte}`}>{f(qr.r)}</p>
                </Apparition>
              ))}
            </div>
          </div>
        </section>

        {/* 8. L'appel, et les pages voisines. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titreSection}>{t.finTitre}</h2>
            <p className={`mx-auto mt-5 max-w-2xl ${texte}`}>
              {f(t.fin)}
              {t.anglais && <span className="mt-2 block">{t.anglais}</span>}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link href={`/${locale}/devis`} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <Link href={`/${locale}/contact`} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaContact}
              </Link>
            </div>
          </Apparition>
          <Apparition className="mx-auto mt-16 max-w-4xl md:mt-20">
            <h2 className="surtitre text-center">{t.voirAussi}</h2>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2">
              {liens.map((lien) => (
                <li key={lien.href}>
                  <Link href={lien.href} className="lien-fleche py-2 text-[#2b2320]">
                    {lien.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Apparition>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
