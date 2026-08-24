import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";

export function TTHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const links = [
    { href: `/${locale}/toiles-tendues/realisations`, label: dict.nav.realisations },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="border-b border-white/10 bg-[#0b0a09]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="font-mono text-xs tracking-widest text-white/60 hover:text-white">
          ← {dict.nav.backToHub}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href={`/${locale}/toiles-tendues/devis`}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-white/90"
          >
            {dict.nav.cta}
          </Link>
          <LocaleSwitcher locale={locale} variant="dark" />
        </div>
      </div>
    </header>
  );
}
