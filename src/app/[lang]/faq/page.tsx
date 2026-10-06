import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFaq, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { questionsFaq } from "@/lib/faq-balisees";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

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

      <div className="mx-auto max-w-3xl px-6 pb-16 pt-10 md:pb-28 md:pt-14">
        {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
        <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[13px] text-[#6f6357]">
          <Link href={`/${locale}`} className="hover:text-[#2b2320]">
            {dict.nav.home}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#2b2320]">{t.title}</span>
        </nav>
        {/* Le haut de page, façon Apple (Quentin, 06/10/2026) : grand titre et chapô, qui montent sans attendre le
            JavaScript. */}
        <div className="entree-monte" style={{ "--retard": "120ms" } as CSSProperties}>
          <h1 className={`${serif.className} mt-8 text-[2.4rem] font-normal leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:mt-10 md:text-[3.8rem]`}>
            {t.title}
          </h1>
          <p className="mt-5 text-[17px] leading-[1.45] text-[#5c5140] md:mt-6 md:text-[21px]">{t.subtitle}</p>
        </div>

        <div className="mt-12 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8] md:mt-16">
          {t.items.map((item) => (
            // Une ancre sur les questions que d'autres pages citent (« #metallier-saumur »).
            <section key={item.q} id={"id" in item ? item.id : undefined} className="scroll-mt-24 py-9 md:py-11">
              <Apparition>
                <h2 className={`${serif.className} text-[1.4rem] font-normal leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>
                  {item.q}
                </h2>
                <p className="mt-4 whitespace-pre-line text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{item.a}</p>
                {/* Le calcul du garde-corps : la règle en entier, avec des exemples, sur sa propre page. */}
                {"id" in item && item.id === "calcul-garde-corps" && (
                  <Link
                    href={`/${locale}/garde-corps-fenetre-normes`}
                    className="lien-fleche mt-4 py-1 text-[#2b2320]"
                  >
                    {dict.liens.normesGc}
                  </Link>
                )}
              </Apparition>
            </section>
          ))}
        </div>

        {/* La sortie : une carte papier, un seul bouton plein, les deux autres en liens fléchés. */}
        <Apparition className="mt-14 md:mt-20">
          <section className="rounded-[22px] bg-[#f5f1ea] px-7 py-9 md:rounded-[28px] md:px-12 md:py-12">
            <h2 className={`${serif.className} text-balance text-[1.75rem] font-normal leading-[1.08] tracking-[-0.01em] text-[#2b2320] md:text-[2.1rem]`}>
              {t.ctaTitle}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.ctaBody}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href={`/${locale}/contact`} className="btn-plein">
                {t.ctaLabel}
              </Link>
              <Link href={`/${locale}/zone-intervention`} className="lien-fleche py-2 text-[#2b2320]">
                {t.zoneLink}
              </Link>
              <Link href={`/${locale}/rendez-vous`} className="lien-fleche py-2 text-[#2b2320]">
                {t.rdvLink}
              </Link>
            </div>
          </section>
        </Apparition>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
