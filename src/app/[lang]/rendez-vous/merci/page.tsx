import type { Metadata } from "next";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { MerciDemande } from "@/components/merci-demande";

export async function generateMetadata({ params }: PageProps<"/[lang]/rendez-vous/merci">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/rendez-vous/merci",
    title: dict.seo.merciRdv.title,
    description: dict.seo.merciRdv.description,
    noIndex: true,
  });
}

export default async function MerciPage({ params }: PageProps<"/[lang]/rendez-vous/merci">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return <MerciDemande locale={locale} dict={dict} />;
}
