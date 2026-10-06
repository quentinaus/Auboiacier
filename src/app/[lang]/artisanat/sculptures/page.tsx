import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { ProductTail } from "@/components/product-tail";
import { VideoBoucle } from "@/components/video-boucle";
import { Apparition } from "@/components/apparition";


export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/sculptures">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat/sculptures",
    title: dict.seo.sculptures.title,
    description: dict.seo.sculptures.description,
    // La photo du cheval est un portrait : les réseaux n'en montraient que
    // les deux tiers. Déclinaison composée au format 1200 × 630.
    image: "/images/partage/sculptures.jpg",
  });
}

export default async function SculpturesPage({
  params,
}: PageProps<"/[lang]/artisanat/sculptures">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.sculptures;
  /** Le titre, la phrase puis le texte arrivent l'un après l'autre (animation CSS, sans attendre le script). */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <>
      <div>
      {/* Le chemin de navigation, déclaré aux moteurs : c'est lui qui fait
          apparaître « auboiacier.fr › Boutique › ... » sous le lien. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.artisanat.breadcrumbShop, chemin: "/artisanat" },
            { nom: t.title, chemin: "/artisanat/sculptures" },
          ])
        )}
      />
      </div>

      {/* Le même gabarit que les fiches : la photo pleine hauteur à gauche,
          la colonne étroite à droite. */}
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(380px,36%)] lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="relative h-[78vw] max-h-[80vh] md:sticky md:top-0 md:h-screen md:max-h-none md:self-start">
          <Visuel
            locale={locale}
            // En haut : l'image fait toute la hauteur de l'écran, son bas tombe sous la ligne de flottaison.
            coin="haut-droite"
            src="/images/sculpture-cheval-v2.jpg"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="px-6 pb-12 pt-8 md:px-8 md:pb-10 md:pt-10 lg:px-12">
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap justify-end text-[13px] text-[#6f6357]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
              {dict.artisanat.breadcrumbShop}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#2b2320]">{t.title}</span>
          </nav>
          <h1
            className={`${serif.className} entree-monte mt-8 text-[2.4rem] text-balance leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem]`}
            style={entree(100)}
          >
            {t.title}
          </h1>
          <p className="entree-monte mt-4 text-[17px] leading-[1.45] text-[#5c5140] md:mt-5 lg:text-[19px]" style={entree(240)}>
            {t.tagline}
          </p>

          <div className="entree-monte" style={entree(380)}>
            <p className="mt-8 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.intro}</p>
            <p className="mt-4 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.body}</p>
          </div>

          {/* Le torse, en vidéo : un tour complet, sans son, en boucle (elle se met en pause d'un clic). */}
          <Apparition className="mt-10 border-t border-[#e8e1d8] pt-8">
            <span className="surtitre block text-center">{t.torseTitle}</span>
            <VideoBoucle
              locale={locale}
              src="/videos/torse-acier.mp4"
              poster="/images/torse-acier-poster.jpg"
              description={t.torseVideoAlt}
              libellePause={t.videoPause}
              libelleLecture={t.videoPlay}
              className="mx-auto mt-5 aspect-[720/1074] w-full max-w-[20rem] rounded-[22px] bg-[#e5ddd3]"
            />
            <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.torseBody}</p>
          </Apparition>

          <div className="mt-10 border-t border-[#e8e1d8] pt-8">
            <span className="surtitre block">{t.priceTitle}</span>
            <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.priceBody}</p>
          </div>

          <div className="mt-8 md:sticky md:bottom-0 md:-mx-8 md:border-t md:border-[#e5ddd3] md:bg-white md:px-8 md:py-4 lg:-mx-12 lg:px-12">
            <Link href={`/${locale}/contact`} className="btn-plein w-full">
              {t.cta}
            </Link>
          </div>
          <p className="mt-5 text-[14px] text-[#6f6357] md:text-[15px]">{dict.artisanat.madeInFrance}</p>
        </div>
      </div>

      <ProductTail dict={dict} locale={locale} />
    </>
  );
}
