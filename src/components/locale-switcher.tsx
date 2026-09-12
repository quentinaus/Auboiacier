"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";

/**
 * Deux lettres, c'est tout petit pour un doigt : on garde l'allure (ni cadre ni
 * fond) mais la zone touchable fait 32 × 32 px, au-dessus du minimum.
 */
const ZONE = "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5";

function Liens({
  locale,
  variant,
  requete,
}: {
  locale: Locale;
  variant: "light" | "dark";
  /** Ce qui suit le « ? » dans l'adresse, conservé d'une langue à l'autre. */
  requete: string;
}) {
  const pathname = usePathname();
  const reste = pathname.split("/").slice(2).join("/");
  // Sur une photo, le blanc à 75 % ne tenait pas le contraste : blanc plein
  // pour les deux, la langue en cours se distingue par la graisse, par le
  // soulignement et par aria-current, que les lecteurs d'écran annoncent.
  const inactive = variant === "dark" ? "text-white drop-shadow-md" : "text-gray-600";
  const active =
    variant === "dark"
      ? "font-medium text-white underline underline-offset-4 drop-shadow-md"
      : "font-medium underline underline-offset-4";

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${reste ? `/${reste}` : ""}${requete ? `?${requete}` : ""}`}
          hrefLang={l}
          aria-label={l === "fr" ? "Français" : "English"}
          aria-current={l === locale ? "page" : undefined}
          className={`${ZONE} ${l === locale ? active : inactive}`}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

function LiensAvecRequete({ locale, variant }: { locale: Locale; variant: "light" | "dark" }) {
  return <Liens locale={locale} variant={variant} requete={useSearchParams().toString()} />;
}

export function LocaleSwitcher({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  /**
   * Ce qui suit le « ? » comptait : sans lui, passer de FR à EN sur la page de
   * remerciement perdait le session_id et affichait « commande introuvable » à
   * quelqu'un qui venait de payer.
   *
   * Lire la requête oblige le navigateur à finir de charger la page avant de
   * dessiner le composant. On l'enferme donc dans un Suspense : la version sans
   * requête part avec le HTML — le site reste entièrement pré-calculé — et les
   * liens se complètent dès l'arrivée du visiteur.
   */
  return (
    <Suspense fallback={<Liens locale={locale} variant={variant} requete="" />}>
      <LiensAvecRequete locale={locale} variant={variant} />
    </Suspense>
  );
}
