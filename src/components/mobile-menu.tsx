"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Le menu du téléphone : un bouton, un panneau qui s'ouvre par-dessus la page.
 * Sur grand écran les liens sont déjà dans la barre, ce composant reste caché.
 *
 * Ce qu'il faut au clavier : Échap referme, la tabulation tourne en rond dans
 * le panneau tant qu'il est ouvert, et le focus revient sur le bouton à la
 * fermeture — sinon on se retrouve perdu en haut de la page.
 */
export function MenuMobile({
  locale,
  links,
  variant = "light",
}: {
  locale: Locale;
  /** Les mêmes liens que la barre du haut, dans le même ordre. */
  links: { href: string; label: string }[];
  /** « dark » quand la barre est posée sur une photo plein écran. */
  variant?: "light" | "dark";
}) {
  const [ouvert, setOuvert] = useState(false);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const panneauId = useId();
  const pathname = usePathname();
  const sombre = variant === "dark";

  // Textes de service : ils n'existent pas dans les dictionnaires, on les écrit
  // ici dans les deux langues.
  const fr = locale === "fr";
  const ouvrirLabel = fr ? "Ouvrir le menu" : "Open menu";
  const fermerLabel = fr ? "Fermer le menu" : "Close menu";
  const titreMenu = fr ? "Menu" : "Menu";
  const navLabel = fr ? "Menu principal" : "Main menu";

  const fermer = useCallback(() => {
    setOuvert(false);
    boutonRef.current?.focus();
  }, []);

  // On change de page : le panneau n'a plus lieu d'être. On l'ajuste pendant le
  // rendu plutôt que dans un effet — React reprend le rendu tout de suite, et la
  // page ne s'affiche jamais avec un menu ouvert par-dessus.
  const [cheminAffiche, setCheminAffiche] = useState(pathname);
  if (cheminAffiche !== pathname) {
    setCheminAffiche(pathname);
    setOuvert(false);
  }

  // Clavier : Échap referme, la tabulation reste enfermée dans le panneau.
  useEffect(() => {
    if (!ouvert) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        fermer();
        return;
      }
      if (event.key !== "Tab") return;

      const panneau = panneauRef.current;
      if (!panneau) return;
      const focusables = panneau.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      const actif = document.activeElement;

      if (event.shiftKey && (actif === premier || !panneau.contains(actif))) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && actif === dernier) {
        event.preventDefault();
        premier.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // La page dessous ne doit pas défiler pendant qu'on lit le menu.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Le premier lien prend le focus : on entre dans le menu, pas dans la page.
    panneauRef.current
      ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
      ?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [ouvert, fermer]);

  return (
    <div className="md:hidden">
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls={panneauId}
        aria-label={ouvert ? fermerLabel : ouvrirLabel}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          sombre ? "text-white hover:bg-white/10" : "text-[#2a2116] hover:bg-black/5"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50">
          {/* Le voile : un clic à côté referme le panneau. */}
          <button
            type="button"
            aria-label={fermerLabel}
            onClick={fermer}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />

          <div
            ref={panneauRef}
            id={panneauId}
            role="dialog"
            aria-modal="true"
            aria-label={navLabel}
            className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto border-b border-[#e5ddd3] bg-[#fbfaf8] px-6 pb-8 pt-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#6f6357]">
                {titreMenu}
              </span>
              <button
                type="button"
                onClick={fermer}
                aria-label={fermerLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2a2116] transition-colors hover:bg-black/5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden
                  className="h-5 w-5"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav aria-label={navLabel} className="mt-4 flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOuvert(false)}
                  className="border-t border-[#e8e1d8] py-4 text-base text-[#2a2116]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 border-t border-[#e8e1d8] pt-5">
              <LocaleSwitcher locale={locale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
