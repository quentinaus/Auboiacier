import type { Metadata } from "next";
import "../globals.css";
import { locales, isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return {
    title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
    description: dict.meta.tagline,
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang}>
      <body className="antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}
