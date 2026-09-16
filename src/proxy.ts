import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n";
import { creerLimite } from "@/lib/limite-debit";

/**
 * Limite de débit de la page de remerciement : 20 affichages par adresse et
 * par dix minutes. Cette page interroge Stripe avec l'identifiant lu dans
 * l'adresse ; sans garde-fou, un robot peut la marteler avec n'importe quel
 * identifiant et faire tomber le site sur la limite d'appels de Stripe.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 20 });

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const estMerci = locales.some((locale) => pathname === `/${locale}/commande/merci`);
  if (
    estMerci &&
    request.nextUrl.searchParams.has("session_id") &&
    tropDeDemandes(request, Date.now())
  ) {
    return new NextResponse("Trop de demandes. Merci de réessayer dans quelques minutes.", {
      status: 429,
      headers: { "retry-after": "600", "content-type": "text/plain; charset=utf-8" },
    });
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return;
  // La page privée de l'atelier n'a pas de langue : elle est en français, point.
  if (pathname === "/atelier" || pathname.startsWith("/atelier/")) return;

  // La langue du navigateur décide, à défaut le français. Un visiteur anglais
  // arrivait jusqu'ici sur une page française et devait repérer tout seul le
  // petit « EN » en haut de page.
  const annoncee = request.headers.get("accept-language") ?? "";
  const premiere = annoncee.split(",")[0]?.trim().toLowerCase() ?? "";
  const langue = locales.find((locale) => premiere.startsWith(locale)) ?? defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${langue}${pathname}`;
  // 307 et non 308 : la destination dépend du visiteur, une redirection
  // permanente ferait retenir à Google la langue du premier robot venu.
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Les routes d'API et les fichiers gardent leur URL, seules les pages sont
  // préfixées par la langue. `_vercel` : la mesure d'audience envoie ses vues
  // en POST sur /_vercel/insights/view (sans point dans le chemin) ; sans
  // cette exclusion, le proxy la renverrait vers /fr/_vercel/… et rien ne
  // serait compté.
  matcher: ["/((?!api|_next|_vercel|favicon.ico|.*\\..*).*)"],
};
