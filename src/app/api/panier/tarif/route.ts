import { NextResponse } from "next/server";
import { CALCUL_GC, ChiffrageIndisponible } from "@/lib/prix-garde-corps.server";
import { ChiffragePortailIndisponible, prixPortail } from "@/lib/prix-portail.server";
import { tarifAffiche, tarifer } from "@/lib/tarif-panier";
import { creerLimite } from "@/lib/limite-debit";
import { budgetCalculGC } from "@/lib/budget-calcul-gc";
import { origineEtrangere } from "@/lib/origine";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Cent vingt tarifs par adresse et par dix minutes : le panier redemande le
 * sien à chaque changement (une quantité, une ligne retirée), pas de quoi
 * moissonner les prix.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 120 });

/**
 * Le tarif du panier, EXACTEMENT celui que /api/commande enverra à Stripe :
 * la même fonction (tarifer, src/lib/tarif-panier.ts), sur les mêmes lignes.
 * Le panier affiche ces montants-là — pièces, remise sur plusieurs
 * garde-corps, livraison, pose ou retrait, visite — et ne calcule plus rien
 * lui-même. Jamais un coût : des prix de vente et la forme retenue.
 */
export async function POST(request: Request) {
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  let body: { locale?: unknown; lines?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const locale = body.locale === "en" ? "en" : "fr";
  // Le calcul des garde-corps du panier prend du temps de calcul au serveur : il est compté comme celui de la fiche.
  if (budgetCalculGC.epuise(request, Date.now())) return NextResponse.json({ error: "too_many" }, { status: 429 });
  const debut = performance.now();
  try {
    const tarif = await tarifer(body.lines, { locale, gc: CALCUL_GC, garantieSouple: true, portail: prixPortail });
    budgetCalculGC.depenser(request, performance.now() - debut, Date.now());
    return NextResponse.json(tarifAffiche(tarif, locale), { headers: { "cache-control": "private, no-store" } });
  } catch (erreur) {
    if (erreur instanceof ChiffrageIndisponible || erreur instanceof ChiffragePortailIndisponible) {
      console.error(`[panier] ${erreur.message} : définir CHIFFRAGE_GARDE_CORPS_CLE (Vercel > Settings > Environment Variables).`);
      return NextResponse.json({ error: "indisponible" }, { status: 503 });
    }
    throw erreur;
  }
}
