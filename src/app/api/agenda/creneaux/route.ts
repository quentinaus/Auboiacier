import { NextResponse } from "next/server";
import { creneauxDisponibles } from "@/lib/agenda";

export const runtime = "nodejs";

/** Les demi-journées où l'atelier peut venir prendre les cotes. */
export async function GET() {
  const creneaux = await creneauxDisponibles();
  return NextResponse.json(
    { creneaux },
    { headers: { "cache-control": "private, max-age=60" } }
  );
}
