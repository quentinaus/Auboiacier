import { NextResponse } from "next/server";
import { calculerDeplacement, calculerLivraison, calculerPose } from "@/lib/deplacement";
import { getProduct, poidsColisKg } from "@/lib/products";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";

/** Quarante codes postaux par adresse et par dix minutes : de quoi hésiter, pas de quoi moissonner. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 40 });

/** Un identifiant d'option : lettres, chiffres et tirets seulement. */
function identifiant(valeur: string | null): string | undefined {
  return valeur && /^[a-z0-9-]{1,40}$/i.test(valeur) ? valeur : undefined;
}

/** Le poids du colis, d'après la pièce (slug), ses cotes et sa quantité : jamais d'après un chiffre envoyé. */
function poidsDemande(params: URLSearchParams): number {
  const produit = getProduct(params.get("slug") ?? "");
  if (!produit) return 30;
  const entier = (cle: string) => {
    const n = Number(params.get(cle));
    return Number.isFinite(n) && n > 0 && n <= 10000 ? Math.round(n) : undefined;
  };
  // Même borne que le panier (MAX_QUANTITY) : au-delà, ce n'est plus une quantité plausible.
  const qty = Number(params.get("qty"));
  const quantite = Number.isInteger(qty) && qty >= 1 && qty <= 10 ? qty : 1;
  return (
    poidsColisKg(produit, {
      largeurMm: entier("l"),
      hauteurMm: entier("w"),
      epaisseurMm: entier("t"),
      woodId: identifiant(params.get("wood")),
      remplissageId: identifiant(params.get("remplissage")),
    }) * quantite
  );
}

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
  const plusGrandeCoteMm = Math.max(Number(params.get("l")) || 0, Number(params.get("w")) || 0);
  const resultat =
    pour === "pose"
      ? await calculerPose(cp.slice(0, 10))
      : pour === "livraison"
        ? await calculerLivraison(cp.slice(0, 10), poidsDemande(params), plusGrandeCoteMm)
        : await calculerDeplacement(cp.slice(0, 10));
  if (!resultat.ok) {
    // « Trop loin » dit aussi où, et à combien : le client comprend le refus.
    return NextResponse.json(
      { error: resultat.reason, distanceKm: resultat.distanceKm, commune: resultat.commune },
      { status: 400 }
    );
  }
  return NextResponse.json(
    // Le poids estimé, à dire au client — seulement pour la livraison seule :
    // la pose ne facture pas au colis.
    pour === "livraison" ? { ...resultat.deplacement, kg: poidsDemande(params) } : resultat.deplacement,
    { headers: { "cache-control": "private, max-age=600" } }
  );
}
