import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { LumiereHeader } from "@/components/lumiere-header";
import { SiteFooter } from "@/components/site-footer";

export default async function ToilesTenduesLayout({
  children,
  params,
}: LayoutProps<"/[lang]/toiles-tendues">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <LumiereHeader locale={locale} dict={dict} />
      <main id="contenu">
      {children}
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
