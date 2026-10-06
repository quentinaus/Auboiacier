import { idDecorGC, lireDecorGC, lireModeleGC } from "@/lib/garde-corps";
import { NextResponse } from "next/server";
import { calculerDeplacement, calculerLivraison, calculerPose } from "@/lib/deplacement";
import { getProduct, poidsColisKg, prixParOutil } from "@/lib/products";
import { creerLimite } from "@/lib/limite-debit";
import { budgetCalculGC } from "@/lib/budget-calcul-gc";
import { ChiffrageIndisponible, ligneGC } from "@/lib/prix-garde-corps.server";

export const runtime = "nodejs";

/**
 * Cent vingt demandes par adresse et par dix minutes, comme /api/prix-garde-corps : la fiche garde-corps
 * redemande la livraison à chaque nouveau prix (cote, modèle, bois). À quarante, un client qui ajustait ses
 * curseurs voyait sa livraison « en erreur » et son bouton du panier grisé pendant dix minutes.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 120 });

/** Un identifiant d'option : lettres, chiffres et tirets seulement. */
function identifiant(valeur: string | null): string | undefined {
  return valeur && /^[a-z0-9-]{1,40}$/i.test(valeur) ? valeur : undefined;
}

/**
 * Le colis, d'après la pièce (slug), ses cotes et sa quantité : jamais
 * d'après un chiffre envoyé. Le garde-corps est pesé par l'outil de plans, à
 * partir de son relevé (l, allege, etage, fenetre) : c'est le même poids que
 * celui du panier et de la commande (src/lib/tarif-panier.ts). null : un
 * garde-corps sans prix (à étudier, ou un relevé illisible).
 */
function colisDemande(params: URLSearchParams): { kg: number; plusGrandeCoteMm: number } | null {
  const produit = getProduct(params.get("slug") ?? "");
  const entier = (cle: string) => {
    const n = Number(params.get(cle));
    return Number.isFinite(n) && n > 0 && n <= 10000 ? Math.round(n) : undefined;
  };
  // Même borne que le panier (MAX_QUANTITY) : au-delà, ce n'est plus une quantité plausible.
  const qty = Number(params.get("qty"));
  const quantite = Number.isInteger(qty) && qty >= 1 && qty <= 10 ? qty : 1;
  if (!produit) return { kg: 30, plusGrandeCoteMm: 0 };
  if (prixParOutil(produit)) {
    const mm = (cle: string) => {
      const t = params.get(cle);
      return t !== null && /^\d{1,5}$/.test(t) ? Number(t) : undefined;
    };
    const largeurMm = mm("l");
    const allegeMm = mm("allege");
    const etage = params.get("etage");
    const woodId = identifiant(params.get("wood"));
    if (largeurMm === undefined || allegeMm === undefined || (etage !== "1" && etage !== "0") || !woodId) return null;
    // Le décor à volutes pèse le poids de ses volutes : illisible, pas de colis (jamais le poids d'un autre garde-corps).
    const decorBrut = params.get("decor");
    const decor = decorBrut === null ? null : lireDecorGC(decorBrut);
    if (decorBrut !== null && !decor) return null;
    const ligne = ligneGC(
      { largeurMm, allegeMm, enEtage: etage === "1", fenetreMm: mm("fenetre") ?? 0, ...(decor ? { decor: idDecorGC(decor) } : lireModeleGC(params.get("modele")) ? { modele: params.get("modele")! } : {}) },
      { woodId, metalId: identifiant(params.get("metal")) ?? produit.metals[0]?.id, fabricId: identifiant(params.get("fabric")) ?? produit.fabrics?.[0]?.id, remplissageId: identifiant(params.get("remplissage")) ?? produit.remplissages?.[0]?.id }
    );
    if (!ligne.ok || !ligne.line.gc) return null;
    const [L, H] = ligne.line.size.dimsMm!;
    return { kg: ligne.line.gc.kg * quantite, plusGrandeCoteMm: Math.max(L, H) };
  }
  return {
    kg:
      poidsColisKg(produit, {
        largeurMm: entier("l"),
        hauteurMm: entier("w"),
        epaisseurMm: entier("t"),
        woodId: identifiant(params.get("wood")),
        remplissageId: identifiant(params.get("remplissage")),
      }) * quantite,
    plusGrandeCoteMm: Math.max(entier("l") ?? 0, entier("w") ?? 0),
  };
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
  let colis: { kg: number; plusGrandeCoteMm: number } | null = null;
  if (pour === "livraison") {
    // Peser un garde-corps, c'est le calculer : même budget de temps que la
    // fiche et le panier. Sans lui, cette porte (120 demandes par dix minutes)
    // permettait d'occuper le serveur plusieurs minutes en changeant une cote
    // à chaque appel.
    if (budgetCalculGC.epuise(request, Date.now())) {
      return NextResponse.json({ error: "too_many" }, { status: 429 });
    }
    const debut = performance.now();
    try {
      colis = colisDemande(params);
      budgetCalculGC.depenser(request, performance.now() - debut, Date.now());
    } catch (erreur) {
      if (erreur instanceof ChiffrageIndisponible) return NextResponse.json({ error: "indisponible" }, { status: 503 });
      throw erreur;
    }
    if (!colis) return NextResponse.json({ error: "colis" }, { status: 400 });
  }
  const resultat =
    pour === "pose"
      ? await calculerPose(cp.slice(0, 10))
      : colis
        ? await calculerLivraison(cp.slice(0, 10), colis.kg, colis.plusGrandeCoteMm)
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
    colis ? { ...resultat.deplacement, kg: Math.round(colis.kg) } : resultat.deplacement,
    { headers: { "cache-control": "private, max-age=600" } }
  );
}
