import type { Metadata } from "next";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { MerciDemande } from "@/components/merci-demande";

export async function generateMetadata({ params }: PageProps<"/[lang]/devis/merci">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/devis/merci",
    title: dict.seo.merciDevis.title,
    description: dict.seo.merciDevis.description,
    noIndex: true,
  });
}

export default async function MerciPage({ params }: PageProps<"/[lang]/devis/merci">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return <MerciDemande locale={locale} dict={dict} />;
}
