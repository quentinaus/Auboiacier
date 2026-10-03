import { PLANS_HTML } from "@/lib/plans-atelier-page";

/**
 * L'outil de plans de l'atelier : les cotes donnent le plan, la liste de débit
 * et les planches. Aucune donnée privée (ni prix, ni client) : la page s'ouvre
 * sans clé, pour que Quentin l'ajoute simplement à l'écran d'accueil de son
 * iPhone. Elle reste hors des moteurs de recherche et n'est liée nulle part.
 */
export function GET() {
  return new Response(PLANS_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
