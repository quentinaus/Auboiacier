import { NextResponse } from "next/server";
import { ChiffrageIndisponible, lireEntreeGC, reponsePrixGC } from "@/lib/prix-garde-corps.server";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";

/**
 * Cent vingt relevés par adresse et par dix minutes : de quoi essayer ses
 * cotes au fil de la frappe (la fiche attend une pause), pas de quoi
 * moissonner les prix. Chaque calcul prend quelques millisecondes et le
 * serveur garde les derniers relevés en mémoire.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 120 });

let indisponibleSignale = false;

/**
 * Le prix d'un garde-corps de fenêtre, calculé par l'outil de plans, pour un
 * relevé : ?l=1180&allege=650&etage=1&fenetre=1400&wood=chene (fenetre : 0 ou
 * absent = inconnue). Réponse : le prix et la forme retenue (hauteur, croix,
 * carré, conformité), ou « à étudier » avec ce qui bloque. Jamais un coût.
 * /api/commande et le devis PDF appelleront la même fonction.
 */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const entree = lireEntreeGC(new URL(request.url).searchParams);
  if (!entree) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    return NextResponse.json(reponsePrixGC(entree), { headers: { "cache-control": "private, max-age=600" } });
  } catch (erreur) {
    if (erreur instanceof ChiffrageIndisponible) {
      // Clé absente ou fausse sur ce serveur : aucun prix plutôt qu'un prix faux.
      if (!indisponibleSignale) {
        indisponibleSignale = true;
        console.error(`[prix-garde-corps] ${erreur.message} : définir CHIFFRAGE_GARDE_CORPS_CLE (Vercel > Settings > Environment Variables).`);
      }
      return NextResponse.json({ error: "indisponible" }, { status: 503 });
    }
    throw erreur;
  }
}
