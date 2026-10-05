import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { getProduct, productLocalise, PLATEAU_MAX_LARGEUR_MM, PLATEAU_MAX_LONGUEUR_MM } from "@/lib/products";
import { essencesParPrix, remplir } from "@/lib/vitrine";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { MaterialBubble } from "@/components/material-bubble";
import { FaqVisible } from "@/components/faq-visible";
import { serif } from "@/lib/fonts";

/**
 * Le bois massif à l'atelier : l'autre matière de Quentin, à côté de l'acier.
 * Seul ce qui est écrit ailleurs dans le site et dans le catalogue est dit
 * ici — les essences et leur ordre de prix viennent de src/lib/products.ts,
 * comme le plus grand plateau d'un seul tenant.
 */

export async function generateMetadata({ params }: PageProps<"/[lang]/bois-massif">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/bois-massif",
    title: dict.seo.bois.title,
    description: dict.seo.bois.description,
    image: "/images/escalier/marche-detail.jpg",
  });
}

export default async function BoisMassifPage({ params }: PageProps<"/[lang]/bois-massif">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.bois;
  const e = dict.essences;

  const essences = essencesParPrix(productLocalise(getProduct("table-mikado")!, locale));

  /** Où le bois entre dans les pièces : un lien par fiche. */
  const usages = [
    { ...t.ou.tables, href: `/${locale}/artisanat/tables` },
    { ...t.ou.escalier, href: `/${locale}/artisanat/escalier-limon-central` },
    { ...t.ou.gardeCorps, href: `/${locale}/artisanat/garde-corps` },
    { ...t.ou.exterieur, href: `/${locale}/artisanat/table-mikado-exterieur` },
  ];

  const questions = [
    { q: t.faqBoisTableQ, a: dict.tables.faqBoisA },
    { q: t.faqBougeQ, a: t.faqBougeA },
    { q: t.faqHorsQ, a: dict.tables.faqHorsA },
  ];

  const lien =
    "inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: t.title, chemin: "/bois-massif" },
          ])
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h1 className={`${serif.className} max-w-3xl text-3xl font-medium leading-tight tracking-tight md:text-4xl`}>
            {t.h1}
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#5c5140]">{t.intro}</p>

          {/* 1. Les essences, de la moins chère à la plus chère. */}
          <section className="mt-14">
            <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.essencesTitle}</h2>
            <p className="mt-2 text-sm text-[#726757]">{e.note}</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {essences.map((bois) => {
                const texte = e[bois.id as "pin" | "hetre" | "chene" | "noyer"];
                if (!texte) return null;
                return (
                  <div key={bois.id} className="rounded-2xl border border-[#e8e1d8] bg-white p-6">
                    <div className="flex items-center gap-3">
                      <MaterialBubble material={bois} className="h-8 w-6" />
                      <h3 className={`${serif.className} text-lg text-[#2b2320]`}>{bois.label}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-[#4a4038]">
                      {texte.teinte} {texte.durete} {texte.usage}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Où le bois entre dans les pièces de l'atelier. */}
          <section className="mt-16">
            <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.ouTitle}</h2>
            <ul className="mt-6 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
              {usages.map((usage) => (
                <li key={usage.href} className="py-5">
                  <Link href={usage.href} className={`${serif.className} text-lg text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]`}>
                    {usage.titre}
                  </Link>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4a4038]">{usage.texte}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* 3 et 4. Le plateau et son entretien. */}
          <section className="mt-16 grid gap-10 md:grid-cols-2">
            <div>
              <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.preparationTitle}</h2>
              <p className="mt-4 leading-relaxed text-[#4a4038]">
                {remplir(t.preparationBody, {
                  longueur: String(PLATEAU_MAX_LONGUEUR_MM / 10),
                  largeur: String(PLATEAU_MAX_LARGEUR_MM / 10),
                })}
              </p>
            </div>
            <div>
              <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.entretienTitle}</h2>
              <p className="mt-4 leading-relaxed text-[#4a4038]">{t.entretienBody}</p>
            </div>
          </section>

          {/* 5. Questions fréquentes, affichées ET balisées depuis la même liste. */}
          <FaqVisible titre={t.faqTitle} questions={questions} className="mt-16 max-w-3xl" />

          {/* 6. L'atelier. */}
          <section className="mt-16 rounded-xl border border-[#d9cfc0] bg-white px-6 py-7 md:px-10 md:py-10">
            <h2 className={`${serif.className} text-xl text-[#2b2320] md:text-2xl`}>{t.atelierTitle}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-[#4a4038]">{t.atelierBody}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link href={`/${locale}/artisanat/tables`} className={lien}>
                {dict.liens.toutesTables}
              </Link>
              <Link href={`/${locale}/a-propos`} className={lien}>
                {dict.nav.apropos}
              </Link>
              <Link href={`/${locale}/zone-intervention`} className={lien}>
                {dict.liens.zonePose}
              </Link>
              <Link href={`/${locale}/contact`} className={lien}>
                {dict.nav.contact}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
