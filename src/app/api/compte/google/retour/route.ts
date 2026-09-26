import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { effacerPassage, lirePassage, ouvrirSession } from "@/lib/compte";
import { compteDepuisLeCode, lireEtat } from "@/lib/google-oauth";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * On renvoie TOUJOURS vers l'hôte d'où la demande arrive, jamais vers le
 * domaine inscrit dans la configuration : c'est ce qui fait que la connexion
 * marche aussi en développement et sur un déploiement d'essai. L'adresse de
 * retour déclarée à Google, elle, reste fixe — Google l'exige à l'identique.
 */
function retourEnErreur(request: Request, suite: string, raison: string) {
  const locale = suite.startsWith("/en") ? "en" : "fr";
  return NextResponse.redirect(
    new URL(`/${locale}/compte/connexion?erreur=${raison}`, request.url)
  );
}

/**
 * Retour de Google. Trois vérifications avant d'ouvrir quoi que ce soit : le
 * jeton de passage correspond, Google rend bien un code, et l'adresse qu'il
 * nous donne est vérifiée chez lui.
 */
export async function GET(request: Request) {
  const parametres = new URL(request.url).searchParams;
  const etat = lireEtat(parametres.get("state"));
  const suite = etat?.suite ?? "/fr/compte";

  const attendu = await lirePassage();
  await effacerPassage();

  if (!etat || !attendu) return retourEnErreur(request, suite, "passage");
  const a = Buffer.from(etat.passage);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return retourEnErreur(request, suite, "passage");

  const code = parametres.get("code");
  // L'utilisateur a pu refuser dans l'écran de Google : ce n'est pas une panne.
  if (!code) return retourEnErreur(request, suite, parametres.get("error") ? "refus" : "code");

  const compte = await compteDepuisLeCode(code);
  if (!compte) return retourEnErreur(request, suite, "google");
  // Le nom part dans le jeton de session, pas chez Stripe : se connecter ne
  // doit rien écrire nulle part.
  if (!(await ouvrirSession(compte.email, compte.nom ?? undefined))) {
    return retourEnErreur(request, suite, "ferme");
  }

  return NextResponse.redirect(new URL(suite, request.url));
}
