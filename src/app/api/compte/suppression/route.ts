import { NextResponse } from "next/server";
import { clientConnecte, fermerSession } from "@/lib/compte";
import { creerLimite } from "@/lib/limite-debit";
import { origineEtrangere } from "@/lib/origine";
import { supprimerEspace } from "@/lib/profil-client";

export const runtime = "nodejs";
export const maxDuration = 20;

/** Trois essais par dix minutes : on ne supprime pas son espace en boucle. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 3 });

/**
 * Supprimer son espace client (droit à l'effacement, RGPD art. 17).
 *
 * Comme pour le profil, l'adresse vient du témoin signé, jamais de la
 * requête : on ne peut effacer que SON espace. Un autre site ne peut pas
 * déclencher la suppression par le navigateur d'un client connecté.
 */
export async function POST(request: Request) {
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  const email = await clientConnecte();
  if (!email) return NextResponse.json({ error: "non_connecte" }, { status: 401 });
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!(await supprimerEspace(email))) {
    return NextResponse.json({ error: "echec" }, { status: 502 });
  }
  await fermerSession();
  return NextResponse.json({ ok: true });
}
