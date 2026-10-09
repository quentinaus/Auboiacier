import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";

export default async function ArtisanatLayout({
  children,
  params,
}: LayoutProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      {/* La même barre que le reste du site (09/10/2026, Quentin : l'ancienne barre « ← Auboiacier | Mobilier acier & bois »
          n'était pas belle quand on ouvre une pièce). */}
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
      {children}
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
