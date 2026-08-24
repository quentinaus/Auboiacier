import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { getProduct, products, priceFrom } from "@/lib/products";
import { ProductOptions } from "@/components/product-options";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href={`/${locale}/artisanat`} className="text-sm text-[#8a7a5f] hover:text-[#2a2116]">
        {t.backToCatalogue}
      </Link>

      <div className="mt-6 grid gap-12 md:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <div className="aspect-square rounded-xl border border-[#e7dccb] bg-[#f1e6d3]" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-lg border border-[#e7dccb] bg-[#f1e6d3]" />
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <h1 className="text-2xl font-medium">{product.name}</h1>
          <p className="mt-2 text-[#5c5140]">{product.tagline}</p>
          <div className="mt-6">
            <ProductOptions product={product} t={t} />
          </div>
        </div>
      </div>

      {/* Description sections */}
      <div className="mt-20 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-medium">{t.sectionDesign}</h2>
          <p className="mt-2 text-sm text-[#5c5140]">{t.sectionDesignBody}</p>
        </section>
        <section>
          <h2 className="text-lg font-medium">{t.sectionSavoirFaire}</h2>
          <p className="mt-2 text-sm text-[#5c5140]">{t.sectionSavoirFaireBody}</p>
        </section>
        <section>
          <h2 className="text-lg font-medium">{t.sectionSpecs}</h2>
          <p className="mt-2 text-sm text-[#5c5140]">{t.specsPlaceholder}</p>
        </section>
        <section>
          <h2 className="text-lg font-medium">{t.sectionFaq}</h2>
          <div className="mt-2 flex flex-col gap-4 text-sm">
            <div>
              <p className="font-medium">{t.faqDeliveryQ}</p>
              <p className="mt-1 text-[#5c5140]">{t.faqDeliveryA}</p>
            </div>
            <div>
              <p className="font-medium">{t.faqCareQ}</p>
              <p className="mt-1 text-[#5c5140]">{t.faqCareA}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-sm font-medium uppercase tracking-widest text-[#8a7a5f]">
            {t.relatedTitle}
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/artisanat/${p.slug}`}
                className="group flex flex-col gap-3"
              >
                <div className="aspect-[4/5] rounded-xl border border-[#e7dccb] bg-[#f1e6d3]" />
                <div>
                  <h3 className="text-base font-medium">{p.name}</h3>
                  <p className="mt-1 text-sm text-[#8a7a5f]">
                    {t.from} {priceFrom(p)} €
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
