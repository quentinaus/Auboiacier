import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { getProduct, productLocalise } from "@/lib/products";
import { essencesParPrix, remplir } from "@/lib/vitrine";

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
  // « L'entretien au quotidien » mène droit à la question de /faq qui en parle.
  const questionEntretien = dict.faq.items.find((item) => item.id === "entretien-bois-acier");
  const lienEntretien = questionEntretien ? `/${locale}/faq#${questionEntretien.id}` : `/${locale}/faq`;

  // « Quel bois choisir ? » : l'ordre des prix est celui des écarts de la table de référence, jamais recopié.
  const reference = getProduct("table-mikado");
  const essences = reference ? essencesParPrix(productLocalise(reference, locale)).map((w) => w.label.toLowerCase()) : [];
  const ordre = essences.length > 1 ? `${essences.slice(0, -1).join(", ")} ${locale === "fr" ? "puis" : "then"} ${essences[essences.length - 1]}` : essences.join("");

  /** Un usage du bois, ce qu'il faut en savoir, et la page où le configurer. */
  const blocs = [
    { titre: t.marchesTitle, texte: t.marchesBody, lien: { href: `/${locale}/artisanat/escalier-limon-central`, label: t.marchesLien } },
    { titre: t.mainCouranteTitle, texte: t.mainCouranteBody, lien: { href: `/${locale}/artisanat/garde-corps`, label: t.mainCouranteLien } },
    { titre: t.plateauxTitle, texte: t.plateauxBody, lien: { href: `/${locale}/artisanat/tables`, label: dict.liens.toutesTables } },
    ...(ordre
      ? [{ titre: t.choisirTitle, texte: remplir(t.choisirBody, { ordre }), lien: { href: `/${locale}/artisanat/tables`, label: dict.liens.toutesTables } }]
      : []),
    { titre: t.huileTitle, texte: t.huileBody, lien: { href: lienEntretien, label: t.huileLien } },
    { titre: t.bougeTitle, texte: t.bougeBody, lien: null },
  ];

  /** Le titre et la phrase arrivent tout de suite (animation CSS) ; la suite monte au défilement. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

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
        {/* 1. Le titre et la promesse. */}
        <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
          <div className="mx-auto max-w-6xl">
            {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
            <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[13px] text-[#6f6357]">
              <Link href={`/${locale}`} className="hover:text-[#2b2320]">
                {dict.nav.home}
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-[#2b2320]">{t.title}</span>
            </nav>

            <h1
              className={`${serif.className} entree-monte mt-8 max-w-4xl text-[2.4rem] text-balance leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:mt-12 md:text-[3.8rem]`}
              style={entree(100)}
            >
              {t.h1}
            </h1>
            <p
              className="entree-monte mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
              style={entree(260)}
            >
              {t.intro}
            </p>
          </div>
        </section>

        {/* 2. Un usage du bois par rangée : le titre à gauche, ce qu'il faut savoir à droite. */}
        <div className="bg-[#f5f1ea] px-6 py-6 md:py-12">
          <div className="mx-auto max-w-6xl divide-y divide-[#e5ddd3]">
            {blocs.map((bloc) => (
              <section key={bloc.titre} className="py-12 md:py-16">
                <Apparition className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
                  <h2 className={`${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem]`}>
                    {bloc.titre}
                  </h2>
                  <div className="md:pt-2">
                    <p className="text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{bloc.texte}</p>
                    {bloc.lien && (
                      <Link href={bloc.lien.href} className="lien-fleche mt-5 text-[#2b2320]">
                        {bloc.lien.label}
                      </Link>
                    )}
                  </div>
                </Apparition>
              </section>
            ))}
          </div>
        </div>

        {/* 3. L'atelier. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={`${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`}>
              {t.atelierTitle}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]">{t.atelierBody}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <Link href={`/${locale}/a-propos`} className="lien-fleche py-1 text-[#2b2320]">
                {dict.nav.apropos}
              </Link>
              <Link href={`/${locale}/zone-intervention`} className="lien-fleche py-1 text-[#2b2320]">
                {dict.liens.zonePose}
              </Link>
              <Link href={`/${locale}/contact`} className="lien-fleche py-1 text-[#2b2320]">
                {dict.nav.contact}
              </Link>
            </div>
          </Apparition>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
