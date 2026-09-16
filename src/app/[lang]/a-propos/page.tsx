import type { Metadata } from "next";
import Image from "next/image";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

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
    image: "/images/atelier-soudeur.jpg",
  });
}

export default async function AProposPage({
  params,
}: PageProps<"/[lang]/a-propos">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.apropos;

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>

        {/* L'atelier et sa ville */}
        <div className="relative mt-10 aspect-[21/9] overflow-hidden rounded-2xl">
          <Image
            src="/images/saumur.jpg"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <section className="mt-14 max-w-prose">
          <h2 className={`${serif.className} text-2xl font-medium`}>{t.histoireTitle}</h2>
          <p className="mt-4 leading-relaxed text-[#4a4038]">{t.histoireBody}</p>
        </section>

      </div>

      {/* Le savoir-faire, en pleine largeur : l'atelier en photo, le propos sur
          fond sombre. Le bouton est le seul appel à l'action de la page : sans
          lui, le visiteur devait repasser par le menu pour demander un devis. */}
      <BandeauDetail
        className="mt-14"
        titre={t.savoirFaireTitle}
        corps={t.savoirFaireBody}
        cta={{ href: `/${locale}/devis`, label: dict.hub.missionCta }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/atelier-soudeur.jpg", alt: dict.hub.altAtelier }}
        photoAGauche
      />

      <div className="mx-auto max-w-3xl px-6 pb-16">
        <section className="mt-14">
          <h2 className={`${serif.className} text-2xl font-medium`}>{t.valeursTitle}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {t.valeurs.map((valeur) => (
              <div
                key={valeur.title}
                className="rounded-2xl border border-[#e8e1d8] bg-white p-6"
              >
                <h3 className={`${serif.className} text-lg font-medium`}>{valeur.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{valeur.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
