import { NextResponse } from "next/server";
import { clientConnecte } from "@/lib/compte";
import { creerLimite } from "@/lib/limite-debit";
import { enregistrerProfil } from "@/lib/profil-client";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Les coordonnées du client, qu'il corrige lui-même.
 *
 * Réservée aux gens connectés, et l'adresse e-mail n'est JAMAIS prise dans le
 * corps de la requête : elle vient du témoin signé. Sans cette règle, il
 * suffirait d'envoyer l'adresse de quelqu'un d'autre pour réécrire ses
 * coordonnées chez Stripe.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 20 });

export async function POST(request: Request) {
  const email = await clientConnecte();
  if (!email) return NextResponse.json({ error: "non_connecte" }, { status: 401 });
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const profil = await enregistrerProfil(email, corps);
  if (!profil) return NextResponse.json({ error: "echec" }, { status: 502 });
  // On renvoie ce qui est VRAIMENT enregistré : la page réaffiche cela, et le
  // client voit tout de suite qu'un champ a été raccourci ou nettoyé.
  return NextResponse.json({ profil });
}
