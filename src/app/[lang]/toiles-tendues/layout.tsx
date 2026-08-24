import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { TTHeader } from "@/components/tt-header";
import { SiteFooter } from "@/components/site-footer";

export default async function ToilesTenduesLayout({
  children,
  params,
}: LayoutProps<"/[lang]/toiles-tendues">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="min-h-screen bg-[#0b0a09] text-white">
      <TTHeader locale={locale} dict={dict} />
      {children}
      <SiteFooter locale={locale} dict={dict} tone="dark" />
    </div>
  );
}
