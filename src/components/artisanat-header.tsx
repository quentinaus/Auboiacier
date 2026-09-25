import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";
import { CartButton } from "./cart-button";
import { CompteBouton } from "./compte-bouton";
import { compteConfigure } from "@/lib/compte-jetons";
import { MenuMobile } from "./mobile-menu";

export function ArtisanatHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  // Le panneau du téléphone reprend les mêmes entrées que la barre du hub.
  const links = [
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="border-b border-[#e5ddd3] bg-[#fbfaf8]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <Link
          href={`/${locale}`}
          className="min-w-0 truncate font-mono text-xs tracking-widest text-[#7f7058] hover:text-[#2a2116]"
        >
          ← {dict.nav.backToHub}
        </Link>

        {/* Sous 640 px les trois blocs ne tiennent plus côte à côte et se
            chevauchaient : le nom de la section passe alors dans le panneau du
            menu, où il est la première ligne. */}
        <Link
          href={`/${locale}/artisanat`}
          className="hidden truncate text-sm font-medium tracking-wide text-[#2a2116] sm:block"
        >
          {dict.hub.craftLabel}
        </Link>

        <div className="flex shrink-0 items-center gap-1 md:gap-5">
          <Link
            href={`/${locale}/contact`}
            className="hidden min-h-8 items-center px-1 text-sm text-[#5c5140] hover:text-[#2a2116] md:inline-flex"
          >
            {dict.nav.contact}
          </Link>
          <CartButton locale={locale} label={dict.nav.cart} />
          {compteConfigure() && (
            <CompteBouton locale={locale} label={dict.nav.compte} />
          )}
          <div className="hidden md:block">
            <LocaleSwitcher locale={locale} />
          </div>
          <MenuMobile locale={locale} links={links} />
        </div>
      </div>
    </header>
  );
}
