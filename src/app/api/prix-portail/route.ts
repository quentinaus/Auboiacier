import { NextResponse } from "next/server";
import { ChiffragePortailIndisponible, prixPortail } from "@/lib/prix-portail.server";
import { lireConfig } from "@/lib/portails";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";
export const maxDuration = 20;

/** Comme le garde-corps : de quoi essayer ses cotes et ses styles, pas de quoi moissonner les prix. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 150 });

let indisponibleSignale = false;

/**
 * Le prix d'un portail calculé par l'outil de plans : ?slug=portail-battant&P=3500&H=1600&mat=alu&forme=droit&…
 * (voir versParams, src/lib/portails.ts). Réponse : le prix posé, ou « à étudier » avec les raisons de l'outil.
 * Jamais un coût.
 */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) return NextResponse.json({ error: "too_many" }, { status: 429 });
  const lu = lireConfig(new URL(request.url).searchParams);
  if (!lu) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const reponse = prixPortail(lu.slug, lu.cfg);
    return NextResponse.json(reponse, { headers: { "cache-control": "private, max-age=600" } });
  } catch (erreur) {
    if (erreur instanceof ChiffragePortailIndisponible) {
      if (!indisponibleSignale) {
        indisponibleSignale = true;
        console.error(`[prix-portail] ${erreur.message} : définir CHIFFRAGE_GARDE_CORPS_CLE (Vercel > Settings > Environment Variables).`);
      }
      return NextResponse.json({ error: "indisponible" }, { status: 503 });
    }
    throw erreur;
  }
}
