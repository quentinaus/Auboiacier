import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { ArtisanatHeader } from "@/components/artisanat-header";

export default async function ArtisanatLayout({
  children,
  params,
}: LayoutProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#2a2116]">
      <ArtisanatHeader locale={locale} dict={dict} />
      {children}
    </div>
  );
}
