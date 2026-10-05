import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

/**
 * Le bois massif à l'atelier : ce que la page des tables ne dit pas. Les
 * marches d'escalier, les mains courantes du garde-corps, pourquoi l'huile-cire
 * et pourquoi le bois bouge — chaque fait vient d'une fiche (src/lib/products.ts,
 * src/lib/garde-corps.ts). Les essences et les plateaux, eux, sont sur
 * /artisanat/tables : on y renvoie au lieu de les recopier. Pas de questions
 * balisées ici (src/lib/faq-balisees.ts).
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

  /** Un usage du bois, ce qu'il faut en savoir, et la page où le configurer. */
  const blocs = [
    { titre: t.marchesTitle, texte: t.marchesBody, lien: { href: `/${locale}/artisanat/escalier-limon-central`, label: t.marchesLien } },
    { titre: t.mainCouranteTitle, texte: t.mainCouranteBody, lien: { href: `/${locale}/artisanat/garde-corps`, label: t.mainCouranteLien } },
    { titre: t.plateauxTitle, texte: t.plateauxBody, lien: { href: `/${locale}/artisanat/tables`, label: dict.liens.toutesTables } },
    { titre: t.huileTitle, texte: t.huileBody, lien: { href: `/${locale}/faq`, label: t.huileLien } },
    { titre: t.bougeTitle, texte: t.bougeBody, lien: null },
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
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-10 md:pt-14">
          {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[11px] text-[#726757]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#2b2320]">{t.title}</span>
          </nav>

          <h1 className={`${serif.className} mt-6 text-3xl font-medium leading-tight tracking-tight md:text-4xl`}>
            {t.h1}
          </h1>
          <p className="mt-4 leading-relaxed text-[#5c5140]">{t.intro}</p>

          <div className="mt-12 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
            {blocs.map((bloc) => (
              <section key={bloc.titre} className="py-8">
                <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{bloc.titre}</h2>
                <p className="mt-3 leading-relaxed text-[#4a4038]">{bloc.texte}</p>
                {bloc.lien && (
                  <Link href={bloc.lien.href} className={`mt-3 ${lien}`}>
                    {bloc.lien.label}
                  </Link>
                )}
              </section>
            ))}
          </div>

          {/* L'atelier. */}
          <section className="mt-12 rounded-xl border border-[#d9cfc0] bg-white px-6 py-7 md:px-10 md:py-10">
            <h2 className={`${serif.className} text-xl text-[#2b2320] md:text-2xl`}>{t.atelierTitle}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-[#4a4038]">{t.atelierBody}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
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
