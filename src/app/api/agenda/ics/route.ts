import { cleFluxValide, fluxIcs, rendezVousPayes } from "@/lib/agenda";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";

/**
 * Le calendrier de Quentin, au format que tous les agendas savent lire.
 * Protégé par une clé : l'adresse complète n'est connue que de lui, et elle
 * contient des coordonnées de clients.
 *
 * Sa clé est celle du flux (AGENDA_ICS_CLE), qui n'ouvre rien d'autre.
 */
/** Un calendrier relit le flux toutes les quelques minutes au plus : 30 par dix minutes suffisent, et freinent qui essaie des clés. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 30 });

export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return new Response("Too many requests", { status: 429, headers: { "retry-after": "600" } });
  }
  const donnee = new URL(request.url).searchParams.get("cle");
  if (!cleFluxValide(donnee)) {
    return new Response("Not found", { status: 404 });
  }
  const flux = fluxIcs(await rendezVousPayes());
  return new Response(flux, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="auboiacier-prises-de-cotes.ics"',
      "cache-control": "private, no-store",
    },
  });
}
