import type { Metadata } from "next";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { CartView } from "@/components/cart-view";
import { serif } from "@/lib/fonts";
import { commandesOuvertes } from "@/lib/entreprise";
import { Apparition } from "@/components/apparition";

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
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* Façon Apple (Quentin, 06/10/2026) : un grand titre et de l'air ; le panier lui-même n'apparaît pas au
          défilement (c'est un formulaire). */}
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 md:pb-28 md:pt-20">
        <Apparition>
          <h1 className={`${serif.className} text-[2.4rem] leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}>
            {t.title}
          </h1>
        </Apparition>
        <div className="mt-10 md:mt-14">
          <CartView t={t} locale={locale} contactEmail={dict.contact.email} ouvert={commandesOuvertes()} />
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
