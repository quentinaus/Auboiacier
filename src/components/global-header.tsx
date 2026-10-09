import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";
import { CartButton } from "./cart-button";
import { CompteBouton } from "./compte-bouton";
import { compteConfigure } from "@/lib/compte-jetons";
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
  const links: { href: string; label: string; grandEcran?: boolean }[] = [
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    // Le produit le plus demandé, dans le menu (étude marketing, 06/10) : sur grand écran seulement, la barre d'une
    // tablette n'a pas la place d'un lien de plus (le panneau du téléphone et de la tablette l'a déjà).
    { href: `/${locale}/artisanat/garde-corps`, label: locale === "fr" ? "Garde-corps" : "Railings", grandEcran: true },
    { href: `/${locale}/realisations`, label: dict.nav.realisations },
    { href: `/${locale}/devis`, label: dict.nav.devis },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];
  /**
   * Au téléphone, le panneau est la seule navigation : il en montre plus que
   * la barre (qui n'a pas la place d'un lien de plus sur une tablette).
   */
  const liensEnPlus = [
    { href: `/${locale}/artisanat/tables`, label: dict.liens.tables },
    { href: `/${locale}/artisanat/garde-corps`, label: dict.liens.gardeCorps },
    { href: `/${locale}/bois-massif`, label: dict.liens.bois },
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
      {/* Toute la largeur de l'écran (09/10/2026, Quentin : « le menu est serré, pourquoi tu n'utilises pas toute la page »).
          Dès 1024 px : trois zones, le menu au centre de l'écran, jamais collé au logo. */}
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-6 py-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-6 lg:py-5 xl:px-10">
        <Link
          href={`/${locale}`}
          className={`font-display shrink-0 whitespace-nowrap text-[15px] tracking-[0.3em] lg:justify-self-start ${overlay ? "text-white drop-shadow" : "text-[#1d1d1f]"}`}
        >
          {dict.meta.siteName.toUpperCase()}
        </Link>

        {/* Posés sur une photo, les liens étaient en blanc à 80 % : au-dessus
            d'un ciel clair, ça ne fait plus le contraste demandé. Blanc plein
            et ombre portée : c'est le maximum possible sur une image. */}
        <nav
          aria-label={dict.nav.mainMenu}
          className={`hidden items-center gap-6 whitespace-nowrap text-sm lg:flex xl:gap-7 xl:text-[15px] 2xl:gap-10 ${
            overlay ? "text-white drop-shadow-md" : "text-gray-700"
          }`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${link.grandEcran ? "hidden xl:inline" : ""} ${overlay ? "hover:text-white" : "hover:text-gray-900"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3 lg:justify-self-end">
          <CartButton locale={locale} label={dict.nav.cart} variant={overlay ? "dark" : "light"} />
          {compteConfigure() && (
            <CompteBouton locale={locale} label={dict.nav.compte} variant={overlay ? "dark" : "light"} />
          )}
          {/* Sur téléphone, les langues sont au bas du panneau avec les liens :
              elles ne se battent plus avec le logo pour la place. */}
          <div className="hidden md:block">
            <LocaleSwitcher locale={locale} variant={overlay ? "dark" : "light"} />
          </div>
          <MenuMobile
            locale={locale}
            // Le garde-corps du menu de grand écran est déjà dans liensEnPlus : pas deux fois dans le panneau.
            links={[...links.filter((l) => !l.grandEcran), ...liensEnPlus]}
            variant={overlay ? "dark" : "light"}
            // Sous 1024 px, les liens ne tiennent plus sur une ligne : le menu les prend (09/10/2026, barre élégante).
            seuil="lg"
          />
        </div>
      </div>
    </header>
  );
}
