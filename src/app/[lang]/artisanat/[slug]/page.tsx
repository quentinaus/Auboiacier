import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { getProduct, products, priceFrom } from "@/lib/products";
import { ProductOptions } from "@/components/product-options";
import { serif } from "@/lib/fonts";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/artisanat/[slug]">) {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;

  const product = getProduct(slug);
  if (!product) notFound();

  const related = products.filter((p) => p.slug !== product.slug).slice(0, 2);
  const [mainImage, ...thumbs] = product.images;
  const hasImages = product.images.length > 0;

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb façon artmeta */}
        <nav className="text-xs text-[#7a6e63]">
          <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
            {t.breadcrumbShop}
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
            {t.breadcrumbCategory}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#2b2320]">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-12 md:grid-cols-2">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
              {mainImage ? (
                <Image
                  src={mainImage.src}
                  alt={mainImage.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain p-6"
                  priority
                />
              ) : (
                <div className="h-full w-full bg-[#f1ece4]" />
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {thumbs.map((img) => (
                <div key={img.src} className="relative aspect-square overflow-hidden rounded-lg bg-white">
                  <Image src={img.src} alt={img.alt} fill sizes="150px" className="object-cover" />
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - thumbs.length) }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-[#f1ece4]" />
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <h1 className={`${serif.className} text-3xl text-[#2b2320]`}>{product.name}</h1>
            <p className="mt-2 text-[#5c5140]">{product.tagline}</p>
            <div className="mt-6">
              <ProductOptions product={product} t={t} locale={locale} />
            </div>
          </div>
        </div>

        {/* Sections éditoriales */}
        <div className="mt-24 flex flex-col gap-16 md:gap-24">
          {product.sections.map((section, i) =>
            hasImages ? (
              <div key={section.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
                    <Image
                      src={product.images[i % product.images.length].src}
                      alt={product.images[i % product.images.length].alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div>
                  <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{section.title}</h2>
                  <p className="mt-4 leading-relaxed text-[#4a4038]">{section.body}</p>
                </div>
              </div>
            ) : (
              <div key={section.title} className="rounded-2xl bg-[#f5f1ea] px-8 py-14 md:px-16">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{section.title}</h2>
                  <p className="mt-4 leading-relaxed text-[#4a4038]">{section.body}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bandeau atelier */}
      <section className="mt-24 bg-[#6d2c2c] px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`${serif.className} text-3xl`}>{t.craftBandTitle}</h2>
          <p className="mt-5 leading-relaxed text-white/85">{t.craftBandBody}</p>
        </div>
      </section>

      {/* Témoignage */}
      {product.testimonial && (
        <section className="bg-[#f5f1ea] px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <blockquote className={`${serif.className} text-2xl italic leading-snug text-[#2b2320]`}>
              « {product.testimonial.quote} »
            </blockquote>
            <p className="mt-6 text-sm text-[#7a6e63]">{product.testimonial.author}</p>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-6">
        {/* Descriptif */}
        <section className="mt-20">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.descriptifTitle}</h2>
          <dl className="mt-6 max-w-2xl divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
            {product.specs.map((spec) => (
              <div key={spec.label} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr]">
                <dt className="text-sm text-[#7a6e63]">{spec.label}</dt>
                <dd className="text-sm leading-relaxed text-[#2b2320]">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* FAQ */}
        <section className="mt-16 border-t border-[#e8e1d8] pt-10">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.sectionFaq}</h2>
          <div className="mt-4 flex max-w-2xl flex-col divide-y divide-[#e8e1d8]">
            <details className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-[#2b2320]">
                {t.faqDeliveryQ}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.faqDeliveryA}</p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-[#2b2320]">
                {t.faqCareQ}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.faqCareA}</p>
            </details>
          </div>
        </section>

        {/* Autres pièces */}
        {related.length > 0 && (
          <div className="mt-20 border-t border-[#e8e1d8] py-10 pb-20">
            <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.relatedTitle}</h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {related.map((p) => (
                <Link key={p.slug} href={`/${locale}/artisanat/${p.slug}`} className="group flex flex-col gap-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
                    {p.images[0] ? (
                      <Image
                        src={p.images[0].src}
                        alt={p.images[0].alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#f1ece4] p-6">
                        <span className={`${serif.className} text-center text-2xl text-[#7a6e63]`}>
                          {p.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className={`${serif.className} text-lg text-[#2b2320]`}>{p.name}</h3>
                    <p className="mt-1 text-sm text-[#7a6e63]">
                      {t.from} {priceFrom(p).toLocaleString("fr-FR")} €
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
