import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { products, priceFrom } from "@/lib/products";

export default async function ArtisanatPage({
  params,
}: PageProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-medium">{t.title}</h1>
      <p className="mt-2 max-w-xl text-[#5c5140]">{t.subtitle}</p>

      <h2 className="mt-12 text-sm font-medium uppercase tracking-widest text-[#8a7a5f]">
        {t.catalogueTitle}
      </h2>

      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.slug}
            href={`/${locale}/artisanat/${product.slug}`}
            className="group flex flex-col gap-3"
          >
            <div className="aspect-[4/5] rounded-xl border border-[#e7dccb] bg-[#f1e6d3]" />
            <div>
              <h3 className="text-base font-medium">{product.name}</h3>
              <p className="mt-1 text-sm text-[#8a7a5f]">
                {t.from} {priceFrom(product)} €
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
