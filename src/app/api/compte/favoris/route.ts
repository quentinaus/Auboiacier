import { NextResponse } from "next/server";
import { clientConnecte } from "@/lib/compte";
import { creerLimite } from "@/lib/limite-debit";
import { ajouterFavori, retirerFavori } from "@/lib/profil-client";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Les pièces mises de côté, avec leurs cotes et leurs choix.
 *
 * Comme pour le profil, l'adresse du client vient du témoin signé et jamais
 * du corps de la requête : on n'écrit que dans sa propre fiche.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 60 });

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
  const o = (corps ?? {}) as Record<string, unknown>;

  const favoris = await ajouterFavori(
    email,
    { slug: o.slug, titre: o.titre, resume: o.resume, prixCents: o.prixCents, config: o.config },
    Math.floor(Date.now() / 1000)
  );
  if (!favoris) return NextResponse.json({ error: "echec" }, { status: 400 });
  return NextResponse.json({ favoris });
}

export async function DELETE(request: Request) {
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

  const favoris = await retirerFavori(email, (corps as Record<string, unknown>)?.id);
  if (!favoris) return NextResponse.json({ error: "echec" }, { status: 400 });
  return NextResponse.json({ favoris });
}
