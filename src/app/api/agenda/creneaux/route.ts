import { NextResponse } from "next/server";
import { creneauxDisponibles } from "@/lib/agenda";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";

/**
 * Trente lectures par adresse et par dix minutes : de quoi hésiter, pas de
 * quoi marteler Stripe — chaque lecture (hors mémoire d'une minute, voir
 * agenda.ts) est une recherche chez lui, et le compte a une limite d'appels.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 30 });

/** Les demi-journées où l'atelier peut venir prendre les cotes. */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers: { "retry-after": "600" } });
  }
  const creneaux = await creneauxDisponibles();
  return NextResponse.json(
    { creneaux },
    { headers: { "cache-control": "private, max-age=60" } }
  );
}
