// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Les jetons de l'espace client : celui qui garde quelqu'un connecté, et
 * celui qu'on envoie par e-mail pour se connecter sans mot de passe.
 *
 * AUCUNE BASE DE DONNÉES. C'est le choix qui commande tout ce fichier, et il
 * suit celui que le site fait déjà partout : les rendez-vous SONT chez Stripe
 * (agenda.ts), l'état des commandes aussi (commandes-atelier.ts). Un compte
 * ici ne sert qu'à une chose — prouver qu'on est bien le propriétaire d'une
 * adresse e-mail — et cette preuve tient entièrement dans un jeton signé.
 * Pas de table d'utilisateurs, donc rien à sauvegarder, rien à sécuriser,
 * rien à effacer le jour où un client demande l'effacement de ses données,
 * et aucun fichier clients dont Quentin devrait répondre.
 *
 * Ce que ça coûte en échange : on ne peut pas déconnecter quelqu'un à
 * distance, et un jeton volé reste valable jusqu'à son échéance. Pour un
 * espace qui montre l'avancement de sa propre commande, c'est le bon marché.
 *
 * Le secret est COMPTE_SECRET. Sans lui, rien ne se signe et rien ne se
 * vérifie : l'espace client reste simplement fermé, et le reste du site
 * fonctionne — c'est la règle que suit déjà tout le projet.
 */

/** Trente jours : on ne redemande pas à quelqu'un de se reconnecter chaque semaine. */
export const DUREE_SESSION_S = 30 * 24 * 60 * 60;

/**
 * Quinze minutes pour un lien reçu par e-mail. Il reste RÉUTILISABLE pendant
 * ce quart d'heure, volontairement : ouvert depuis l'application Mail d'un
 * iPhone, le lien s'ouvre dans une fenêtre qui ne partage pas ses témoins
 * avec Safari. Le client se retrouve connecté dans sa boîte mail et
 * déconnecté dans son navigateur, et rouvre le lien. À usage unique, il
 * tomberait sur « lien déjà utilisé » sans rien comprendre.
 */
export const DUREE_LIEN_S = 15 * 60;

/** Ce que porte un jeton : une adresse vérifiée, et jusqu'à quand. */
export type Jeton = { email: string; exp: number };

/**
 * Deux usages, deux signatures. Sans cette étiquette dans le calcul, un lien
 * de connexion de quinze minutes ferait un jeton de session de trente jours,
 * et inversement.
 */
type Usage = "session" | "lien";

function secret(): string | null {
  const valeur = process.env.COMPTE_SECRET?.trim();
  // Trop court, un secret ne protège rien : mieux vaut fermer l'espace que
  // laisser croire qu'il est gardé.
  return valeur && valeur.length >= 24 ? valeur : null;
}

/** L'espace client est-il ouvert ? */
export function compteConfigure(): boolean {
  return secret() !== null;
}

function base64url(donnees: Buffer | string): string {
  return Buffer.from(donnees).toString("base64url");
}

function signature(usage: Usage, charge: string, cle: string): string {
  return createHmac("sha256", cle).update(`${usage}.${charge}`).digest("base64url");
}

/** Le jeton signé, ou null si l'espace client n'est pas configuré. */
export function signerJeton(
  usage: Usage,
  email: string,
  maintenantS: number,
  dureeS: number
): string | null {
  const cle = secret();
  if (!cle) return null;
  const normalise = normaliserEmail(email);
  if (!normalise) return null;
  const charge = base64url(
    JSON.stringify({ email: normalise, exp: Math.floor(maintenantS) + dureeS })
  );
  return `${charge}.${signature(usage, charge, cle)}`;
}

/**
 * Relit un jeton. Rend null pour TOUTE anomalie — jamais une exception, et
 * jamais de message qui distingue « mal signé » de « périmé » : ce sont deux
 * façons de ne pas être connecté, et la différence n'intéresse qu'un attaquant.
 */
export function lireJeton(usage: Usage, jeton: unknown, maintenantS: number): Jeton | null {
  const cle = secret();
  if (!cle || typeof jeton !== "string") return null;

  const separateur = jeton.lastIndexOf(".");
  if (separateur <= 0) return null;
  const charge = jeton.slice(0, separateur);
  const recue = jeton.slice(separateur + 1);

  // Comparaison en temps constant : un `!==` s'arrête au premier caractère
  // différent, et ce temps de réponse trahit la signature attendue, lettre
  // après lettre (même raisonnement que cleAgendaValide, agenda.ts).
  const attendue = signature(usage, charge, cle);
  const a = Buffer.from(recue);
  const b = Buffer.from(attendue);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let lu: unknown;
  try {
    lu = JSON.parse(Buffer.from(charge, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!lu || typeof lu !== "object") return null;
  const { email, exp } = lu as Record<string, unknown>;
  if (typeof email !== "string" || typeof exp !== "number") return null;
  if (!Number.isFinite(exp) || exp <= maintenantS) return null;
  const normalise = normaliserEmail(email);
  return normalise ? { email: normalise, exp } : null;
}

export function signerSession(email: string, maintenantS: number): string | null {
  return signerJeton("session", email, maintenantS, DUREE_SESSION_S);
}

export function lireSession(jeton: unknown, maintenantS: number): Jeton | null {
  return lireJeton("session", jeton, maintenantS);
}

export function signerLien(email: string, maintenantS: number): string | null {
  return signerJeton("lien", email, maintenantS, DUREE_LIEN_S);
}

export function lireLien(jeton: unknown, maintenantS: number): Jeton | null {
  return lireJeton("lien", jeton, maintenantS);
}

/**
 * L'adresse, ramenée à une forme unique. Le rattachement des commandes se
 * fait par l'adresse et par elle seule : « Camille@Exemple.FR » et
 * « camille@exemple.fr » doivent désigner le même client, sinon ses commandes
 * n'apparaissent pas et il appelle l'atelier.
 *
 * On ne va pas plus loin (pas de retrait des points de Gmail, pas de coupe au
 * « + ») : deux adresses différentes chez le même fournisseur peuvent très
 * bien appartenir à deux personnes, et les rapprocher ouvrirait les commandes
 * de l'une à l'autre.
 */
export function normaliserEmail(valeur: unknown): string | null {
  if (typeof valeur !== "string") return null;
  const propre = valeur.trim().toLowerCase();
  if (propre.length < 6 || propre.length > 254) return null;
  // Assez strict pour écarter les fantaisies, assez large pour les vraies
  // adresses : un seul arobase, quelque chose de part et d'autre, un point
  // dans le domaine, et aucun espace.
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(propre) ? propre : null;
}

/**
 * Une adresse de retour interne, ou null.
 *
 * Elle doit commencer par UNE seule barre oblique : « //ailleurs.fr » est une
 * adresse absolue pour un navigateur, et l'accepter enverrait le client hors
 * du site à la sortie de Google. Pas de deux-points non plus, qui ouvrirait
 * « javascript: ».
 */
export function retourInterne(valeur: unknown): string | null {
  if (typeof valeur !== "string") return null;
  if (!/^\/[A-Za-z0-9/_-]{1,120}$/.test(valeur)) return null;
  return valeur.startsWith("//") ? null : valeur;
}
