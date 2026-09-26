// Ce fichier lit et pose des témoins : il ne tourne que sur le serveur.
// La partie pure — signature et relecture des jetons — est dans
// compte-jetons.ts, que les tests chargent directement.
import "server-only";
import { cookies } from "next/headers";
import {
  DUREE_SESSION_S,
  compteConfigure,
  lireSession,
  signerSession,
} from "./compte-jetons";

/**
 * La session de l'espace client, dans un témoin signé.
 *
 * C'est le SEUL témoin que le site dépose de son propre chef. Il est
 * strictement nécessaire au service demandé — sans lui, impossible de rester
 * connecté — donc dispensé de bandeau de consentement, et l'article 8 de la
 * politique de confidentialité le décrit nommément. Un test le vérifie
 * (tests/textes-juridiques.test.ts) : le jour où un autre témoin apparaît,
 * l'article doit être réécrit le même jour.
 *
 * Il ne contient qu'une adresse e-mail vérifiée et une échéance, signées.
 * Aucun identifiant de session, donc rien à stocker en face.
 */

export const COOKIE_COMPTE = "auboiacier_compte";
/** Le va-et-vient chez Google : posé au départ, relu au retour, puis effacé. */
export const COOKIE_PASSAGE = "auboiacier_passage";

function maintenantS() {
  return Math.floor(Date.now() / 1000);
}

const REGLAGES = {
  httpOnly: true,
  // Le script de la page n'a jamais besoin de lire ce témoin ; interdire
  // qu'il le puisse est ce qui le protège d'un script étranger injecté.
  sameSite: "lax" as const,
  // « lax » et non « strict » : au retour de Google, le navigateur arrive
  // depuis un autre site, et « strict » n'enverrait pas le témoin — la
  // connexion échouerait sans un mot d'explication.
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** L'adresse du client connecté, ou null. Jamais d'exception. */
export async function clientConnecte(): Promise<string | null> {
  return (await sessionClient())?.email ?? null;
}

/**
 * La session entière : l'adresse, et le nom si la connexion est passée par
 * Google. Ce nom ne sert qu'à pré-remplir le formulaire des coordonnées —
 * il n'est enregistré nulle part tant que le client n'a rien validé.
 */
export async function sessionClient(): Promise<{ email: string; nom?: string } | null> {
  if (!compteConfigure()) return null;
  const jeton = (await cookies()).get(COOKIE_COMPTE)?.value;
  const lu = lireSession(jeton, maintenantS());
  return lu ? { email: lu.email, ...(lu.nom ? { nom: lu.nom } : {}) } : null;
}

/** Connecte cette adresse. Rend false si l'espace client n'est pas configuré. */
export async function ouvrirSession(email: string, nom?: string): Promise<boolean> {
  const jeton = signerSession(email, maintenantS(), nom);
  if (!jeton) return false;
  (await cookies()).set(COOKIE_COMPTE, jeton, { ...REGLAGES, maxAge: DUREE_SESSION_S });
  return true;
}

export async function fermerSession(): Promise<void> {
  (await cookies()).set(COOKIE_COMPTE, "", { ...REGLAGES, maxAge: 0 });
}

/**
 * Le jeton de passage du va-et-vient chez Google (le paramètre « state »).
 * Il n'existe que pour une chose : vérifier au retour que c'est bien NOUS qui
 * avons lancé la connexion. Sans lui, n'importe quel site peut envoyer un
 * visiteur sur notre adresse de retour avec un code volé et le connecter au
 * compte de quelqu'un d'autre.
 */
export async function poserPassage(valeur: string): Promise<void> {
  (await cookies()).set(COOKIE_PASSAGE, valeur, { ...REGLAGES, maxAge: 600 });
}

export async function lirePassage(): Promise<string | null> {
  return (await cookies()).get(COOKIE_PASSAGE)?.value ?? null;
}

export async function effacerPassage(): Promise<void> {
  (await cookies()).set(COOKIE_PASSAGE, "", { ...REGLAGES, maxAge: 0 });
}
