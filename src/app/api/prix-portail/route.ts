import { NextResponse } from "next/server";
import { ChiffragePortailIndisponible, prixDepartModeles, prixPortail, prixVariantesPortail } from "@/lib/prix-portail.server";
import { bornesPortail } from "@/lib/portails";
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
 * Avec &variantes=1 : en plus, les prix voisins (styles, décors, moteurs) pour le configurateur, en une seule demande.
 * Jamais un coût.
 */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) return NextResponse.json({ error: "too_many" }, { status: 429 });
  const params = new URL(request.url).searchParams;
  // La page des portails (10/10/2026) : le « dès » des 4 modèles aux cotes du client, ?modeles=1&P=3500&H=1600.
  if (params.get("modeles") === "1") {
    const P = Number(params.get("P")), H = Number(params.get("H")), bH = bornesPortail("portail-battant").H;
    if (!Number.isFinite(P) || !Number.isFinite(H) || P < 500 || P > 8000 || H < bH[0] || H > bH[1]) return NextResponse.json({ error: "invalid" }, { status: 400 });
    try {
      return NextResponse.json(prixDepartModeles(Math.round(P), Math.round(H)), { headers: { "cache-control": "private, max-age=600" } });
    } catch (erreur) {
      if (erreur instanceof ChiffragePortailIndisponible) return NextResponse.json({ error: "indisponible" }, { status: 503 });
      throw erreur;
    }
  }
  const variantes = params.get("variantes") === "1";
  params.delete("variantes");
  const lu = lireConfig(params);
  if (!lu) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const reponse = variantes ? prixVariantesPortail(lu.slug, lu.cfg) : prixPortail(lu.slug, lu.cfg);
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
