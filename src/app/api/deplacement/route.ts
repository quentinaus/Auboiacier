import { NextResponse } from "next/server";
import { calculerDeplacement, calculerLivraison, calculerPose } from "@/lib/deplacement";
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
  // Même route pour la prise de cotes, la pose et la livraison : seul le
  // barème change. La livraison a besoin des cotes du colis (en mm).
  const pour = params.get("pour");
  const entier = (cle: string, defaut: number) => {
    const n = Number(params.get(cle));
    return Number.isFinite(n) && n > 0 && n <= 10000 ? Math.round(n) : defaut;
  };
  const resultat =
    pour === "pose"
      ? await calculerPose(cp.slice(0, 10))
      : pour === "livraison"
        ? await calculerLivraison(cp.slice(0, 10), {
            longueurMm: entier("l", 2000),
            largeurMm: entier("w", 1000),
            epaisseurMm: entier("t", 35),
          })
        : await calculerDeplacement(cp.slice(0, 10));
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
