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
    <div>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <h1 className={`${serif.className} text-4xl text-[#2b2320] md:text-5xl`}>{t.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-[#5c5140]">{t.subtitle}</p>

        <h2 className="mt-16 text-xs font-medium uppercase tracking-widest text-[#7a6e63]">
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
                  <div className="flex h-full w-full items-center justify-center bg-[#f1ece4] p-6">
                    <span className={`${serif.className} text-center text-3xl leading-tight text-[#7a6e63]`}>
                      {product.name}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className={`${serif.className} text-lg text-[#2b2320]`}>{product.name}</h3>
                <p className="mt-1 text-sm text-[#7a6e63]">
                  {t.from} {priceFrom(product).toLocaleString("fr-FR")} €
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bandeau atelier */}
      <section className="bg-[#6d2c2c] px-6 py-14 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <div>
            <h2 className={`${serif.className} text-2xl`}>{t.craftBandTitle}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/85">{t.craftBandBody}</p>
          </div>
          <Link
            href={`/${locale}/contact`}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#6d2c2c] transition-colors hover:bg-[#f5f1ea]"
          >
            {dict.nav.contact}
          </Link>
        </div>
      </section>
    </div>
  );
}
