import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";
import { CartButton } from "./cart-button";
import { MenuMobile } from "./mobile-menu";

export function GlobalHeader({
  locale,
  dict,
  /** Posé par-dessus une image plein écran : fond transparent, texte blanc. */
  overlay = false,
}: {
  locale: Locale;
  dict: Dictionary;
  overlay?: boolean;
}) {
  const links = [
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    { href: `/${locale}/devis`, label: dict.nav.devis },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];
  /** Au téléphone, le panneau est la seule navigation : il en montre plus que la barre. */
  const liensEnPlus = [
    { href: `/${locale}/zone-intervention`, label: dict.nav.zone },
    { href: `/${locale}/faq`, label: dict.nav.faq },
  ];

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-30"
          : "border-b border-gray-200"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <Link
          href={`/${locale}`}
          className={`min-w-0 truncate font-mono text-sm tracking-widest ${overlay ? "text-white drop-shadow" : ""}`}
        >
          {dict.meta.siteName.toUpperCase()}
        </Link>

        {/* Posés sur une photo, les liens étaient en blanc à 80 % : au-dessus
            d'un ciel clair, ça ne fait plus le contraste demandé. Blanc plein
            et ombre portée : c'est le maximum possible sur une image. */}
        <nav
          aria-label={dict.nav.mainMenu}
          className={`hidden items-center gap-6 text-sm md:flex ${
            overlay ? "text-white drop-shadow-md" : "text-gray-700"
          }`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={overlay ? "hover:text-white" : "hover:text-gray-900"}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <CartButton locale={locale} label={dict.nav.cart} variant={overlay ? "dark" : "light"} />
          {/* Sur téléphone, les langues sont au bas du panneau avec les liens :
              elles ne se battent plus avec le logo pour la place. */}
          <div className="hidden md:block">
            <LocaleSwitcher locale={locale} variant={overlay ? "dark" : "light"} />
          </div>
          <MenuMobile
            locale={locale}
            links={[...links, ...liensEnPlus]}
            variant={overlay ? "dark" : "light"}
          />
        </div>
      </div>
    </header>
  );
}
