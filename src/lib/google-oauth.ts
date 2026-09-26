import "server-only";
import { nomLisible, normaliserEmail } from "./compte-jetons";
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
 * Ce qu'on garde de tout ça : une adresse e-mail que Google dit vérifiée, et
 * le nom affiché. Ni photo, ni identifiant Google, ni rien d'autre.
 *
 * Le nom sert à une seule chose : pré-remplir « Prénom et nom » dans les
 * coordonnées. Sans lui, quelqu'un qui vient de se connecter avec Google
 * trouvait une case vide, alors que Google venait de nous le donner — il
 * avait l'impression que sa connexion n'avait servi à rien. Il n'est écrit
 * nulle part tant que le client n'a pas validé le formulaire : il voyage
 * dans le jeton de session (voir compte-jetons.ts).
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
    // Son adresse, et son nom affiché. « profile » donne aussi la photo et
    // la langue, que nous ne lisons pas — Google n'offre pas plus fin.
    scope: "openid email profile",
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
 * Échange le code contre l'adresse e-mail du visiteur et son nom. Rend null
 * pour toute anomalie : refus de Google, adresse non vérifiée, réponse
 * inattendue.
 */
export async function compteDepuisLeCode(
  code: string
): Promise<{ email: string; nom: string | null } | null> {
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
      name?: unknown;
      given_name?: unknown;
      family_name?: unknown;
    };
    // Une adresse que Google lui-même ne dit pas vérifiée ne prouve rien : on
    // ouvrirait les commandes de son titulaire à qui l'a simplement déclarée.
    if (lu.email_verified !== true && lu.email_verified !== "true") return null;
    const email = normaliserEmail(lu.email);
    if (!email) return null;
    // « name » est le nom affiché ; certains comptes n'ont que le prénom et
    // le nom séparés, d'où le repli.
    const nom =
      nomLisible(lu.name) ??
      nomLisible([lu.given_name, lu.family_name].filter((m) => typeof m === "string").join(" "));
    return { email, nom };
  } catch (error) {
    console.error("[compte] échange impossible avec Google :", error);
    return null;
  }
}
