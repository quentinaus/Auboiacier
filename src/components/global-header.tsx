import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";

export function GlobalHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const links = [
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="font-mono text-sm tracking-widest">
          {dict.meta.siteName.toUpperCase()}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gray-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <LocaleSwitcher locale={locale} />
      </div>
    </header>
  );
}
