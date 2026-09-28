import { cleAgendaValide } from "@/lib/agenda";
import { PLANS_HTML } from "@/lib/plans-atelier-page";

/**
 * L'outil de plans de l'atelier : les cotes du client donnent le plan, la
 * liste de débit et les planches. Page privée, protégée par la clé de
 * l'agenda (sans elle ou avec une autre : introuvable). Quentin l'ajoute à
 * l'écran d'accueil de son iPhone : elle s'ouvre alors comme une app.
 */
export function GET(request: Request) {
  const cle = new URL(request.url).searchParams.get("cle");
  if (!cleAgendaValide(cle)) {
    return new Response("Introuvable", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(PLANS_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
