import { NextResponse } from "next/server";
import { calculerDeplacement, calculerPose } from "@/lib/deplacement";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";

/** Quarante codes postaux par adresse et par dix minutes : de quoi hésiter, pas de quoi moissonner. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 40 });

/**
 * Le prix du déplacement (prise de cotes, ou pose avec ?pour=pose) pour un
 * code postal, tel que le serveur le calcule.
 * La fiche produit l'appelle à la frappe ; /api/commande refait exactement le
 * même calcul avant d'encaisser — le navigateur n'envoie jamais un montant.
 */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const params = new URL(request.url).searchParams;
  const cp = params.get("cp") ?? "";
  // Même route pour la prise de cotes et pour la pose : seul le barème change.
  const resultat =
    params.get("pour") === "pose" ? await calculerPose(cp.slice(0, 10)) : await calculerDeplacement(cp.slice(0, 10));
  if (!resultat.ok) {
    // « Trop loin » dit aussi où, et à combien : le client comprend le refus.
    return NextResponse.json(
      { error: resultat.reason, distanceKm: resultat.distanceKm, commune: resultat.commune },
      { status: 400 }
    );
  }
  return NextResponse.json(resultat.deplacement, {
    headers: { "cache-control": "private, max-age=600" },
  });
}
