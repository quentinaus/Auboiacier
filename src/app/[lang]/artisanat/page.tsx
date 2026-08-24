import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { products, priceFrom } from "@/lib/products";
import { serif } from "@/lib/fonts";

export default async function ArtisanatPage({
  params,
}: PageProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className={`${serif.className} text-4xl text-[#2a2116]`}>{t.title}</h1>
      <p className="mt-3 max-w-xl text-[#5c5140]">{t.subtitle}</p>

      <h2 className="mt-14 text-xs font-medium uppercase tracking-widest text-[#8a7a6f]">
        {t.catalogueTitle}
      </h2>

      <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.slug}
            href={`/${locale}/artisanat/${product.slug}`}
            className="group flex flex-col gap-4"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
              {product.images[0] ? (
                <Image
                  src={product.images[0].src}
                  alt={product.images[0].alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="h-full w-full bg-[#f1ece4]" />
              )}
            </div>
            <div>
              <h3 className={`${serif.className} text-lg text-[#2a2116]`}>{product.name}</h3>
              <p className="mt-1 text-sm text-[#8a7a6f]">
                {t.from} {priceFrom(product).toLocaleString("fr-FR")} €
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
