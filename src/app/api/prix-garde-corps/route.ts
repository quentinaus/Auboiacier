import { NextResponse, after } from "next/server";
import { compter } from "@/lib/compteurs";
import { ChiffrageIndisponible, lireRequetePrixGC, reponsePrixGC } from "@/lib/prix-garde-corps.server";
import { creerLimite } from "@/lib/limite-debit";
import { budgetCalculGC } from "@/lib/budget-calcul-gc";

export const runtime = "nodejs";
export const maxDuration = 20;

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
 * relevé et ses options : ?l=1180&allege=650&etage=1&fenetre=1400&wood=chene
 * &metal=noir&fabric=fleur&remplissage=croix&qty=2 (fenetre : 0 ou absent =
 * inconnue ; options absentes : celles du modèle). Réponse : le prix d'une
 * pièce options comprises, la remise sur la quantité, et la forme retenue
 * (hauteur, croix, carré, conformité), ou « à étudier » avec ce qui bloque.
 * Jamais un coût. Le panier, /api/commande et le devis PDF passent par les
 * mêmes fonctions (celles de src/lib/prix-garde-corps.server.ts).
 */
export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const requete = lireRequetePrixGC(new URL(request.url).searchParams);
  if (!requete) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (budgetCalculGC.epuise(request, Date.now())) return NextResponse.json({ error: "too_many" }, { status: 429 });
  const debut = performance.now();
  try {
    const reponse = reponsePrixGC(requete);
    budgetCalculGC.depenser(request, performance.now() - debut, Date.now());
    if (!reponse) return NextResponse.json({ error: "invalid" }, { status: 400 });
    // Un prix calculé de plus au compteur (ou un garde-corps « à étudier ») :
    // ni les cotes ni le prix n'y entrent. C'est un nombre de CALCULS, pas de
    // visiteurs : chaque cote ou option changée relance un calcul, un même
    // client en fait souvent plusieurs. Le navigateur garde la réponse dix minutes :
    // les mêmes cotes redemandées ne sont pas recomptées.
    after(() => compter("prix_calcule", { famille: "garde-corps", resultat: reponse.ok ? "prix" : "a-etudier" }, request));
    // Le CDN garde la réponse un jour (les prix ne changent qu'au déploiement, qui vide le CDN) : les mêmes cotes ne relancent
    // plus le calcul, d'un client à l'autre (diagnostic du 09/10/2026 : 0,4 à 0,6 s par clic). Elle ne dépend que de
    // l'adresse (cotes et options), jamais du visiteur. Le compteur ne voit plus que les calculs vraiment faits.
    return NextResponse.json(reponse, {
      headers: { "cache-control": "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800" },
    });
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
