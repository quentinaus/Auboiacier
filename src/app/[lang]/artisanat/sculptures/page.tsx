import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { ProductTail } from "@/components/product-tail";


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
          <Image
            src="/images/sculpture-cheval-v2.jpg"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="px-6 py-8 md:px-8 md:py-10 lg:px-12">
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap justify-end text-[11px] text-[#7a6f64]">
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
          <h1 className={`${serif.className} mt-6 text-3xl text-[#2b2320] md:text-[2rem]`}>{t.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5c5140]">{t.tagline}</p>

          <p className="mt-8 text-sm leading-relaxed text-[#4a4038]">{t.intro}</p>
          <p className="mt-4 text-sm leading-relaxed text-[#4a4038]">{t.body}</p>

          <div className="mt-8 border-t border-[#e8e1d8] pt-6">
            <span className="block text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
              {t.priceTitle}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-[#4a4038]">{t.priceBody}</p>
          </div>

          <div className="mt-6 md:sticky md:bottom-0 md:-mx-8 md:border-t md:border-[#e5ddd3] md:bg-white md:px-8 md:py-4 lg:-mx-12 lg:px-12">
            <Link
              href={`/${locale}/contact`}
              className="btn-verre block rounded-full px-8 py-3.5 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white"
            >
              {t.cta}
            </Link>
          </div>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{dict.artisanat.madeInFrance}</p>
        </div>
      </div>

      <ProductTail dict={dict} locale={locale} />
    </>
  );
}
