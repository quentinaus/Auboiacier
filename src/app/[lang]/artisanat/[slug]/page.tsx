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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Breadcrumb façon artmeta */}
      <nav className="text-xs text-[#8a7a6f]">
        <Link href={`/${locale}/artisanat`} className="hover:text-[#2a2116]">
          {t.breadcrumbShop}
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/${locale}/artisanat`} className="hover:text-[#2a2116]">
          {t.breadcrumbCategory}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#2a2116]">{product.name}</span>
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
          <h1 className={`${serif.className} text-3xl text-[#2a2116]`}>{product.name}</h1>
          <p className="mt-2 text-[#5c5140]">{product.tagline}</p>
          <div className="mt-6">
            <ProductOptions product={product} t={t} />
          </div>
        </div>
      </div>

      {/* Sections descriptives */}
      <div className="mt-20 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className={`${serif.className} text-xl text-[#2a2116]`}>{t.sectionDesign}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.sectionDesignBody}</p>
        </section>
        <section>
          <h2 className={`${serif.className} text-xl text-[#2a2116]`}>{t.sectionSavoirFaire}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.sectionSavoirFaireBody}</p>
        </section>
      </div>

      {/* Descriptif */}
      <section className="mt-14 border-t border-[#e5ddd3] pt-10">
        <h2 className={`${serif.className} text-xl text-[#2a2116]`}>{t.descriptifTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5c5140]">{t.specsPlaceholder}</p>
      </section>

      {/* FAQ */}
      <section className="mt-14 border-t border-[#e5ddd3] pt-10">
        <h2 className={`${serif.className} text-xl text-[#2a2116]`}>{t.sectionFaq}</h2>
        <div className="mt-4 flex max-w-2xl flex-col divide-y divide-[#e5ddd3]">
          <details className="group py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-[#2a2116]">
              {t.faqDeliveryQ}
            </summary>
            <p className="mt-2 text-sm text-[#5c5140]">{t.faqDeliveryA}</p>
          </details>
          <details className="group py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-[#2a2116]">
              {t.faqCareQ}
            </summary>
            <p className="mt-2 text-sm text-[#5c5140]">{t.faqCareA}</p>
          </details>
        </div>
      </section>

      {/* Autres pièces */}
      {related.length > 0 && (
        <div className="mt-20 border-t border-[#e5ddd3] pt-10">
          <h2 className={`${serif.className} text-xl text-[#2a2116]`}>{t.relatedTitle}</h2>
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
                    <div className="h-full w-full bg-[#f1ece4]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#2a2116]">{p.name}</h3>
                  <p className="mt-1 text-sm text-[#8a7a6f]">
                    {t.from} {priceFrom(p).toLocaleString("fr-FR")} €
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
