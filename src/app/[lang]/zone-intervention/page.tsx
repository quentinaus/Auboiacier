import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd, ATELIER } from "@/lib/seo";
import { photos } from "@/lib/chantiers";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";

/**
 * « Métallier à Saumur » : la page de l'atelier et de son terrain. Pas de
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
  const pres = photos.filter((photo) => photo.commune && !photo.video);

  // La question de la FAQ qui répond à « où trouver un métallier à Saumur » :
  // on y renvoie plutôt que de la recopier.
  const questionMetallier = dict.faq.items.find((item) => item.id === "metallier-saumur");

  const lien =
    "inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black";

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

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.h1}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.subtitle}</p>

        {/* Ce que l'atelier fabrique et pose : un lien par métier. */}
        <section className="mt-12">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.metiersTitle}</h2>
          <ul className="mt-5 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
            {metiers.map((metier) => (
              <li key={metier.href} className="py-4">
                <Link
                  href={metier.href}
                  className="font-medium text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]"
                >
                  {metier.titre}
                </Link>
                <p className="mt-1 text-sm leading-relaxed text-[#4a4038]">{metier.texte}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 flex flex-col gap-10">
          <section>
            <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.autourTitle}</h2>
            <p className="mt-3 leading-relaxed text-[#4a4038]">{t.autourBody}</p>

            {pres.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#726757]">
                  {t.realisationsTitle}
                </h3>
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  {pres.map((photo) => {
                    const legende = dict.realisations[photo.alt];
                    const contenu = (
                      <>
                        <div className={`relative aspect-[16/10] overflow-hidden rounded-xl ${hoverZoom}`}>
                          <Image
                            src={photo.src}
                            alt={legende}
                            fill
                            sizes="(max-width: 640px) 100vw, 360px"
                            className="object-cover"
                          />
                        </div>
                        <figcaption className="text-sm text-[#726757]">
                          <span className="font-medium text-[#2b2320]">{photo.commune}</span> — {legende}
                        </figcaption>
                      </>
                    );
                    return (
                      <figure key={photo.src} className="flex flex-col gap-2">
                        {photo.lien ? (
                          <Link href={`/${locale}/artisanat/${photo.lien}`} className="flex flex-col gap-2">
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
          </section>

          <section>
            <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.voisinsTitle}</h2>
            <p className="mt-3 leading-relaxed text-[#4a4038]">{t.voisinsBody}</p>
            <Link href={`/${locale}/rendez-vous`} className={`mt-3 ${lien}`}>
              {t.rdvLink}
            </Link>
          </section>

          {t.sections.map((section) => (
            <section key={section.title}>
              <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{section.title}</h2>
              {/* Les textes contiennent des retours à la ligne (les étapes d'un
                  chantier) : whitespace-pre-line les respecte. */}
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[#4a4038]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {/* Les communes desservies, écrites noir sur blanc. */}
        <section className="mt-14">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.communesTitle}</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {ATELIER.zones.map((commune) => (
              <li
                key={commune}
                className="rounded-full border border-[#e5ddd3] bg-white px-4 py-2 text-sm text-[#5c5140]"
              >
                {commune}
              </li>
            ))}
          </ul>
        </section>

        {questionMetallier && (
          <p className="mt-12 leading-relaxed text-[#4a4038]">
            <span className={`${serif.className} text-lg text-[#2b2320]`}>{questionMetallier.q}</span>{" "}
            <Link
              href={`/${locale}/faq#${questionMetallier.id}`}
              className="underline underline-offset-4 hover:text-[#2b2320]"
            >
              {t.faqQuestionLink}
            </Link>
          </p>
        )}

        <section className="mt-14 rounded-xl border border-[#d9cfc0] bg-white px-6 py-7">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.ctaTitle}</h2>
          <p className="mt-3 leading-relaxed text-[#4a4038]">{t.ctaBody}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={`/${locale}/contact`}
              className="btn-verre inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
            >
              {t.ctaLabel}
            </Link>
            <Link href={`/${locale}/faq`} className={lien}>
              {t.faqLink}
            </Link>
          </div>
        </section>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
