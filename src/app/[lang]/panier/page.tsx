import type { Metadata } from "next";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { ArtisanatHeader } from "@/components/artisanat-header";
import { SiteFooter } from "@/components/site-footer";
import { CartView } from "@/components/cart-view";
import { serif } from "@/lib/fonts";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/panier">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/panier",
    title: dict.seo.panier.title,
    description: dict.seo.panier.description,
    noIndex: true,
  });
}

export default async function PanierPage({ params }: PageProps<"/[lang]/panier">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.panier;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <div className="mt-10">
          <CartView t={t} locale={locale} contactEmail={dict.contact.email} />
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
