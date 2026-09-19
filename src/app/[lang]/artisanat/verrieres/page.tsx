import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoomSubtle } from "@/lib/ui";
import { ProductTail } from "@/components/product-tail";

const ACCENT = "#2b2320";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/verrieres">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat/verrieres",
    title: dict.seo.verrieres.title,
    description: dict.seo.verrieres.description,
    image: "/images/verriere-interieure.jpg",
  });
}

export default async function VerrieresPage({
  params,
}: PageProps<"/[lang]/artisanat/verrieres">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.verrieres;

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Le chemin de navigation, déclaré aux moteurs : c'est lui qui fait
          apparaître « auboiacier.fr › Boutique › ... » sous le lien. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.artisanat.breadcrumbShop, chemin: "/artisanat" },
            { nom: t.title, chemin: "/artisanat/verrieres" },
          ])
        )}
      />
      <nav aria-label={dict.nav.breadcrumb} className="text-xs text-[#726757]">
        <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
          {dict.artisanat.breadcrumbShop}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#2b2320]">{t.title}</span>
      </nav>

      <div className="mt-8 grid gap-12 md:grid-cols-2">
        <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-white ${hoverZoomSubtle}`}>
          <Image
            src="/images/verriere-interieure.jpg"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
            priority
          />
        </div>

        <div>
          <h1 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{t.title}</h1>
          <p className="mt-2 text-[#5c5140]">{t.tagline}</p>

          <p className="mt-8 leading-relaxed text-[#4a4038]">{t.intro}</p>
          <p className="mt-4 leading-relaxed text-[#4a4038]">{t.body}</p>

          <div className="mt-10 border-t border-[#e8e1d8] pt-8">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
              {t.priceTitle}
            </span>
            <p className="mt-3 leading-relaxed text-[#4a4038]">{t.priceBody}</p>

            <Link
              href={`/${locale}/contact`}
              className="mt-8 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              {t.cta}
            </Link>
          </div>
        </div>
      </div>

      </div>

      {/* Le détail laiton, en pleine largeur */}
      <section className="mt-20 grid md:grid-cols-2">
        <div className="flex items-center bg-[#2b2320] px-8 py-16 md:px-16 md:py-24">
          <div className="mx-auto max-w-md">
            <h2 className={`${serif.className} text-3xl text-white md:text-4xl`}>{t.detailTitle}</h2>
            <p className="mt-6 leading-relaxed text-white/80">{t.detailBody}</p>
            <p className="mt-10 text-[11px] uppercase tracking-[0.18em] text-white/50">
              {dict.artisanat.madeInFrance}
            </p>
          </div>
        </div>
        <div className="relative min-h-[60vh] md:min-h-[80vh]">
          <Image
            src="/images/verriere-poignee-laiton.jpg"
            alt={t.detailAlt}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
          />
        </div>
      </section>

      {/* Le panneau plein */}
      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className={`relative aspect-[21/9] overflow-hidden rounded-xl bg-white ${hoverZoomSubtle}`}>
          <Image
            src="/images/verriere-croisillon.jpg"
            alt={t.panelAlt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="mt-8 max-w-2xl">
          <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.panelTitle}</h2>
          <p className="mt-4 leading-relaxed text-[#4a4038]">{t.panelBody}</p>
        </div>
      </section>

      <ProductTail dict={dict} locale={locale} />
    </>
  );
}
