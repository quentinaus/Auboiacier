import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { GlobalHeader } from "@/components/global-header";
import { HeroShaderBackground } from "@/components/hero-shader-background";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

export default async function HubPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.hub;

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1
          className={`${serif.className} max-w-xl text-3xl font-medium tracking-tight md:text-4xl`}
        >
          {t.title}
        </h1>
        <p className="mt-3 text-[#7a6e63]">{t.subtitle}</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Lumière & toile tendue */}
          <Link
            href={`/${locale}/toiles-tendues`}
            className="group relative flex min-h-96 flex-col justify-end overflow-hidden rounded-2xl bg-[#0b0a09] p-8"
          >
            <div className="absolute inset-0 opacity-90">
              <HeroShaderBackground />
            </div>
            <div className="relative z-10">
              <span className="font-mono text-xs uppercase tracking-widest text-white/60">
                {t.lightingLabel}
              </span>
              <h2 className={`${serif.className} mt-2 text-2xl font-medium text-white`}>
                {t.lightingTitle}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-white/70">{t.lightingSubtitle}</p>
              <span className="mt-4 inline-block text-sm font-medium text-white underline-offset-4 group-hover:underline">
                {t.lightingCta} →
              </span>
            </div>
          </Link>

          {/* Fabrication artisanale */}
          <Link
            href={`/${locale}/artisanat`}
            className="group relative flex min-h-96 flex-col justify-end overflow-hidden rounded-2xl bg-[#f5f1ea] p-8"
          >
            <div className="absolute inset-x-6 top-6 bottom-32">
              <Image
                src="/images/table-mikado-full.jpg"
                alt="Table Mikado — bois massif et acier"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="relative z-10">
              <span className="font-mono text-xs uppercase tracking-widest text-[#7a6e63]">
                {t.craftLabel}
              </span>
              <h2 className={`${serif.className} mt-2 text-2xl font-medium text-[#2b2320]`}>
                {t.craftTitle}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#5c5140]">{t.craftSubtitle}</p>
              <span className="mt-4 inline-block text-sm font-medium text-[#2b2320] underline-offset-4 group-hover:underline">
                {t.craftCta} →
              </span>
            </div>
          </Link>
        </div>
      </div>

      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
