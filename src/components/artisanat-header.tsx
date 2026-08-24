import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";

export function ArtisanatHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <header className="border-b border-[#e5ddd3] bg-[#fbfaf8]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="font-mono text-xs tracking-widest text-[#8a7a5f] hover:text-[#2a2116]">
          ← {dict.nav.backToHub}
        </Link>

        <Link href={`/${locale}/artisanat`} className="text-sm font-medium tracking-wide text-[#2a2116]">
          {dict.hub.craftLabel}
        </Link>

        <div className="flex items-center gap-5">
          <Link href={`/${locale}/contact`} className="text-sm text-[#5c5140] hover:text-[#2a2116]">
            {dict.nav.contact}
          </Link>
          <LocaleSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
