import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

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
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* Le haut de page, façon Apple (Quentin, 06/10/2026 : « plus premium, plus Apple, moins IA ») : une accroche en
          phrase normale, le grand titre, puis la ville en grand. */}
      <section className="px-6 pb-12 pt-14 md:pb-20 md:pt-24">
        {/* Le premier écran monte sans attendre le JavaScript (comme sur l'accueil) : pas d'<Apparition> ici. */}
        <div className="entree-monte mx-auto max-w-3xl" style={{ "--retard": "120ms" } as CSSProperties}>
          <p className="surtitre">{t.title}</p>
          <h1 className={`${serif.className} mt-3 text-balance text-[2.4rem] font-normal leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}>
            {t.h1}
          </h1>
        </div>

        {/* L'atelier et sa ville */}
        <div className="entree-monte mx-auto mt-10 max-w-6xl md:mt-16" style={{ "--retard": "320ms" } as CSSProperties}>
          <div className="relative aspect-[16/9] overflow-hidden rounded-[22px] md:aspect-[21/9] md:rounded-[28px]">
            <Image
              src="/images/saumur.jpg"
              alt={t.photoAlt}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 md:pb-28">
        <Apparition className="mx-auto max-w-3xl">
          <h2 className={`${serif.className} text-[2rem] font-normal leading-[1.05] tracking-[-0.018em] sm:text-[2.5rem] md:text-[3rem]`}>
            {t.histoireTitle}
          </h2>
          <p className="mt-6 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.histoireBody}</p>
          {/* Les deux matières de l'atelier, et son terrain : chacun a sa page. */}
          <div className="mt-8 flex flex-col items-start gap-y-3 sm:flex-row sm:flex-wrap sm:gap-x-8">
            <Link href={`/${locale}/bois-massif`} className="lien-fleche text-[#2b2320]">
              {dict.liens.boisLong}
            </Link>
            <Link href={`/${locale}/toiles-tendues`} className="lien-fleche text-[#2b2320]">
              {dict.liens.plafonds}
            </Link>
            <Link href={`/${locale}/zone-intervention`} className="lien-fleche text-[#2b2320]">
              {dict.liens.zonePose}
            </Link>
          </div>
        </Apparition>
      </section>

      {/* Le savoir-faire, en pleine largeur : l'atelier en photo, le propos sur
          fond sombre. Le bouton est le seul appel à l'action de la page : sans
          lui, le visiteur devait repasser par le menu pour demander un devis. */}
      <BandeauDetail
        titre={t.savoirFaireTitle}
        corps={t.savoirFaireBody}
        cta={{ href: `/${locale}/devis`, label: dict.hub.missionCta }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/atelier-soudeur.jpg", alt: dict.hub.altAtelier }}
        photoAGauche
      />

      {/* Les valeurs : trois cartes papier sur fond blanc (le pied de page, lui, est papier). */}
      <section className="px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition>
            <h2 className={`${serif.className} text-center text-[2rem] font-normal leading-[1.05] tracking-[-0.018em] sm:text-[2.5rem] md:text-[3rem]`}>
              {t.valeursTitle}
            </h2>
          </Apparition>
          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3 md:gap-6">
            {t.valeurs.map((valeur, i) => (
              <Apparition
                key={valeur.title}
                retard={(i % 4) * 110}
                className="rounded-[22px] bg-[#f5f1ea] p-7 md:rounded-[26px] md:p-9"
              >
                <h3 className={`${serif.className} text-[1.4rem] font-normal leading-[1.12] tracking-[-0.01em] md:text-[1.7rem]`}>
                  {valeur.title}
                </h3>
                <p className="mt-4 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{valeur.body}</p>
              </Apparition>
            ))}
          </div>
        </div>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
