import { NextResponse } from "next/server";
import { ChiffrageIndisponible, lireRequetePrixGC, planApercuGC } from "@/lib/prix-garde-corps.server";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";

/**
 * Trente aperçus par adresse et par dix minutes : de quoi regarder son garde-corps, pas de quoi se servir de l'outil de
 * l'atelier comme d'un générateur de plans (demande de Quentin, 05/10/2026).
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 30 });

/**
 * L'aperçu du plan d'un garde-corps : la vue de face que dessine l'outil de plans pour le relevé et les options, avec les
 * mêmes paramètres que /api/prix-garde-corps. Une seule vue, sans repère de pièce ni liste de débit. Réponse : le dessin
 * en SVG (traits et cotes) et sa feuille de style, jamais un coût, une coupe ou un perçage.
 */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const requete = lireRequetePrixGC(new URL(request.url).searchParams);
  if (!requete) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const plan = planApercuGC(requete);
    if (!plan) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return NextResponse.json(plan, { headers: { "cache-control": "private, max-age=600" } });
  } catch (erreur) {
    if (erreur instanceof ChiffrageIndisponible) return NextResponse.json({ error: "indisponible" }, { status: 503 });
    throw erreur;
  }
}
