import "server-only";
import { normaliserEmail } from "./compte-jetons";
import { siteOrigin } from "./stripe";

/**
 * « Se connecter avec Google », sans bibliothèque.
 *
 * Le site n'a pas de base de données et n'en veut pas (voir compte-jetons.ts) :
 * les bibliothèques d'authentification en demandent toutes une, pour stocker
 * des comptes et des sessions dont nous n'avons pas l'usage. Ce qu'il nous
 * faut tient dans deux échanges décrits par Google, et les voici.
 *
 * 1. On envoie le visiteur chez Google avec notre identifiant public et un
 *    jeton de passage (« state ») qu'on a aussi posé dans un témoin.
 * 2. Google le renvoie avec un code. On échange ce code contre un jeton
 *    d'identité, DE SERVEUR À SERVEUR, avec notre secret.
 *
 * Pourquoi on ne vérifie pas la signature du jeton d'identité : c'est NOUS
 * qui avons appelé le point d'échange de Google, en HTTPS, en présentant
 * notre secret. La réponse vient donc de Google et de personne d'autre —
 * c'est le flux « serveur » décrit par Google, où la vérification de
 * signature ne s'impose que si le jeton arrive par un chemin non authentifié
 * (le navigateur, par exemple).
 *
 * Ce qu'on garde de tout ça : une adresse e-mail, et le fait que Google la
 * dise vérifiée. Rien d'autre — ni nom, ni photo, ni identifiant Google.
 */

const AUTORISATION = "https://accounts.google.com/o/oauth2/v2/auth";
const JETON = "https://oauth2.googleapis.com/token";

export function googleConfigure(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

/** L'adresse de retour, qui doit être inscrite À L'IDENTIQUE chez Google. */
export function adresseDeRetour(): string {
  return `${siteOrigin()}/api/compte/google/retour`;
}

/** Où envoyer le visiteur pour qu'il se présente à Google. */
export function adresseDeDepart(passage: string, suite: string): string {
  const parametres = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: adresseDeRetour(),
    response_type: "code",
    // Le strict nécessaire : son adresse, et rien de son compte Google.
    scope: "openid email",
    // Le jeton de passage porte AUSSI la page où revenir : au retour de
    // Google, on ne peut plus lire l'adresse d'où l'on venait.
    state: `${passage}.${Buffer.from(suite).toString("base64url")}`,
    // On ne redemande pas l'autorisation à chaque connexion, et on propose le
    // choix du compte : un foyer, deux adresses Google, deux commandes.
    prompt: "select_account",
  });
  return `${AUTORISATION}?${parametres}`;
}

/** Ce que le state transporte : le jeton de passage, et où revenir. */
export function lireEtat(etat: unknown): { passage: string; suite: string } | null {
  if (typeof etat !== "string") return null;
  const point = etat.indexOf(".");
  if (point <= 0) return null;
  const passage = etat.slice(0, point);
  let suite = "";
  try {
    suite = Buffer.from(etat.slice(point + 1), "base64url").toString("utf8");
  } catch {
    return null;
  }
  // Une adresse interne, et rien d'autre : « //ailleurs.fr » est une adresse
  // ABSOLUE pour un navigateur, et renverrait le visiteur hors du site.
  if (!/^\/[A-Za-z0-9/_-]*$/.test(suite) || suite.startsWith("//")) return null;
  return { passage, suite };
}

/**
 * Échange le code contre l'adresse e-mail du visiteur. Rend null pour toute
 * anomalie : refus de Google, adresse non vérifiée, réponse inattendue.
 */
export async function emailDepuisLeCode(code: string): Promise<string | null> {
  if (!googleConfigure()) return null;
  try {
    const reponse = await fetch(JETON, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        redirect_uri: adresseDeRetour(),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok) {
      console.error("[compte] Google refuse le code :", reponse.status);
      return null;
    }
    const { id_token: idToken } = (await reponse.json()) as { id_token?: string };
    if (typeof idToken !== "string") return null;

    const charge = idToken.split(".")[1];
    if (!charge) return null;
    const lu = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as {
      email?: unknown;
      email_verified?: unknown;
    };
    // Une adresse que Google lui-même ne dit pas vérifiée ne prouve rien : on
    // ouvrirait les commandes de son titulaire à qui l'a simplement déclarée.
    if (lu.email_verified !== true && lu.email_verified !== "true") return null;
    return normaliserEmail(lu.email);
  } catch (error) {
    console.error("[compte] échange impossible avec Google :", error);
    return null;
  }
}
