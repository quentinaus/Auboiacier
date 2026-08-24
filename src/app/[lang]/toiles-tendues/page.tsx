import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { PlaceholderBlock } from "@/components/placeholder-block";
import { HeroShaderBackground } from "@/components/hero-shader-background";

export default async function ToilesTenduesPage({
  params,
}: PageProps<"/[lang]/toiles-tendues">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.home;

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] flex-col justify-center overflow-hidden">
        <HeroShaderBackground />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
          <h1 className="max-w-2xl text-4xl font-medium tracking-tight text-white md:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="max-w-xl text-lg text-white/80">{t.heroSubtitle}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/${locale}/toiles-tendues/devis`}
              className="rounded-full bg-[#AD8148] px-6 py-3 text-sm font-medium text-white hover:bg-[#93703d]"
            >
              {t.heroCtaPrimary}
            </Link>
            <Link
              href={`/${locale}/toiles-tendues/realisations`}
              className="text-sm font-medium text-white"
            >
              {t.heroCtaSecondary} →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        {/* Aperçu réalisations */}
        <section className="flex flex-col gap-6 py-16">
          <h2 className="text-2xl font-medium">{t.realisationsTitle}</h2>
          <PlaceholderBlock label={t.realisationsPlaceholder} tone="dark" />
        </section>

        {/* Gammes / savoir-faire */}
        <section className="flex flex-col gap-6 py-16">
          <h2 className="text-2xl font-medium">{t.gammesTitle}</h2>
          <PlaceholderBlock label={t.gammesPlaceholder} tone="dark" />
        </section>

        {/* Pourquoi nous */}
        <section className="flex flex-col gap-6 py-16">
          <h2 className="text-2xl font-medium">{t.pourquoiTitle}</h2>
          <PlaceholderBlock label={t.pourquoiPlaceholder} tone="dark" />
        </section>

        {/* CTA devis */}
        <section className="flex flex-col items-start gap-4 py-20">
          <h2 className="text-2xl font-medium">{t.ctaTitle}</h2>
          <p className="text-white/60">{t.ctaSubtitle}</p>
          <Link
            href={`/${locale}/toiles-tendues/devis`}
            className="rounded-full bg-[#AD8148] px-6 py-3 text-sm font-medium text-white hover:bg-[#93703d]"
          >
            {t.ctaButton}
          </Link>
        </section>
      </div>
    </div>
  );
}
