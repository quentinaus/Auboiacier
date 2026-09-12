import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoomSubtle } from "@/lib/ui";
import { ProductTail } from "@/components/product-tail";

const ACCENT = "#6d2c2c";

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
    image: "/images/sculpture-cheval.jpg",
  });
}

export default async function SculpturesPage({
  params,
}: PageProps<"/[lang]/artisanat/sculptures">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.sculptures;

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
            { nom: t.title, chemin: "/artisanat/sculptures" },
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
        {/* La pièce */}
        <div className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-white ${hoverZoomSubtle}`}>
          <Image
            src="/images/sculpture-cheval.jpg"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
            priority
          />
        </div>

        {/* Le propos */}
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

          <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-[#6f6357]">
            {dict.artisanat.madeInFrance}
          </p>
        </div>
      </div>
    </div>

      <ProductTail dict={dict} locale={locale} />
    </>
  );
}
