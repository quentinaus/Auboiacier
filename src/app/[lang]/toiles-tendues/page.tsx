import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { HeroShaderBackground } from "@/components/hero-shader-background";
import { serif } from "@/lib/fonts";

const realisationPhotos = [
  {
    src: "/images/interieur-ensemble.jpg",
    alt: "Plafond lumineux tendu au-dessus d'une salle à manger, avec escalier et table sur mesure",
  },
  { src: "/images/plafond-salle.jpg", alt: "Plafond lumineux tendu — salle épurée" },
];

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
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
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
          <h2 className={`${serif.className} text-2xl font-medium md:text-3xl`}>
            {t.realisationsTitle}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {realisationPhotos.map((photo) => (
              <div key={photo.src} className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Gammes / savoir-faire */}
        <section className="flex flex-col gap-10 py-16">
          <h2 className={`${serif.className} text-2xl font-medium md:text-3xl`}>
            {t.gammesTitle}
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {t.gammes.map((gamme) => (
              <div key={gamme.title} className="border-t border-white/15 pt-6">
                <h3 className={`${serif.className} text-lg text-[#AD8148]`}>
                  {gamme.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{gamme.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pourquoi nous */}
        <section className="flex flex-col gap-10 py-16">
          <h2 className={`${serif.className} text-2xl font-medium md:text-3xl`}>
            {t.pourquoiTitle}
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {t.pourquoi.map((item, index) => (
              <div key={item.title}>
                <span className="font-mono text-sm text-[#AD8148]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className={`${serif.className} mt-3 text-lg text-white`}>
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA devis */}
        <section className="flex flex-col items-start gap-4 py-20">
          <h2 className={`${serif.className} text-2xl font-medium md:text-3xl`}>
            {t.ctaTitle}
          </h2>
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
