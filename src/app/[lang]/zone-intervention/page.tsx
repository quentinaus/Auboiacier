import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd, ATELIER } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

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
    // Ce que les gens tapent vraiment : un métier et une ville.
    motsCles: ATELIER.zones.map((commune) => `métallier ${commune}`),
  });
}

export default async function ZonePage({ params }: PageProps<"/[lang]/zone-intervention">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.zone;

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
          {t.title}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.subtitle}</p>

        <div className="mt-12 flex flex-col gap-10">
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

        {/* Les communes desservies, écrites noir sur blanc : jusqu'ici elles
            n'existaient que dans les données invisibles des moteurs. */}
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
            <Link
              href={`/${locale}/faq`}
              className="inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black"
            >
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
