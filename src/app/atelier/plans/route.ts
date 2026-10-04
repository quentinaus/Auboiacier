import { cleAgendaValide } from "@/lib/agenda";
import { PLANS_HTML } from "@/lib/plans-atelier-page";

/**
 * L'outil de plans de l'atelier : les cotes donnent le plan, la liste de débit
 * et les planches. Page PRIVÉE, protégée par la clé de l'agenda (la même que
 * /atelier/agenda et /atelier/commandes) : sans elle, ou avec une autre,
 * « introuvable ». Décision de Quentin (05/10/2026) : la page était ouverte à
 * tous pour l'écran d'accueil de son iPhone ; elle s'y ajoute très bien avec
 * l'adresse complète (…/atelier/plans?cle=…), comme l'agenda.
 */
export function GET(request: Request) {
  const cle = new URL(request.url).searchParams.get("cle");
  if (!cleAgendaValide(cle)) {
    return new Response("Introuvable", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  return new Response(PLANS_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
