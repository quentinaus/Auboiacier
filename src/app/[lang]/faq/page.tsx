import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFaq, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { questionsFaq } from "@/lib/faq-balisees";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

export async function generateMetadata({ params }: PageProps<"/[lang]/faq">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/faq",
    title: dict.seo.faq.title,
    description: dict.seo.faq.description,
  });
}

export default async function FaqPage({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.faq;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      {/* Les questions sont toutes visibles à l'écran, sans repli : c'est la
          condition pour que Google ait le droit de les afficher. Aucune n'est
          balisée ailleurs sur le site (src/lib/faq-balisees.ts). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFaq(questionsFaq(dict).map((item) => ({ question: item.q, reponse: item.a })))
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: t.title, chemin: "/faq" },
          ])
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 pb-16 pt-10 md:pt-14">
        {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
        <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[11px] text-[#726757]">
          <Link href={`/${locale}`} className="hover:text-[#2b2320]">
            {dict.nav.home}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#2b2320]">{t.title}</span>
        </nav>
        <h1 className={`${serif.className} mt-6 text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.subtitle}</p>

        <div className="mt-12 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
          {t.items.map((item) => (
            // Une ancre sur les questions que d'autres pages citent (« #metallier-saumur »).
            <section key={item.q} id={"id" in item ? item.id : undefined} className="scroll-mt-24 py-7">
              <h2 className={`${serif.className} text-lg text-[#2b2320]`}>{item.q}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[#4a4038]">{item.a}</p>
              {/* Le calcul du garde-corps : la règle en entier, avec des exemples, sur sa propre page. */}
              {"id" in item && item.id === "calcul-garde-corps" && (
                <Link
                  href={`/${locale}/garde-corps-fenetre-normes`}
                  className="mt-3 inline-block py-1 text-sm text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]"
                >
                  {dict.liens.normesGc}
                </Link>
              )}
            </section>
          ))}
        </div>

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
              href={`/${locale}/zone-intervention`}
              className="inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black"
            >
              {t.zoneLink}
            </Link>
            <Link
              href={`/${locale}/rendez-vous`}
              className="inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black"
            >
              {t.rdvLink}
            </Link>
          </div>
        </section>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
