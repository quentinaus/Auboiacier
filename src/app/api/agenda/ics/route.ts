import { fluxIcs, rendezVousPayes } from "@/lib/agenda";

export const runtime = "nodejs";

/**
 * Le calendrier de Quentin, au format que tous les agendas savent lire.
 * Protégé par une clé : l'adresse complète n'est connue que de lui, et elle
 * contient des coordonnées de clients.
 */
export async function GET(request: Request) {
  const cle = process.env.AGENDA_CLE;
  const donnee = new URL(request.url).searchParams.get("cle");
  if (!cle || !donnee || donnee !== cle) {
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
