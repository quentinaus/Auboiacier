/**
 * Le coffre du chiffrage : les coûts de l'atelier (prix d'achat, fournisseurs,
 * heure, frais fixes) voyagent CHIFFRÉS dans le dépôt, parce que le dépôt
 * GitHub est public. Seul le serveur, qui a la clé, peut les lire.
 *
 * - La clé : 32 octets en base64, dans la variable CHIFFRAGE_GARDE_CORPS_CLE
 *   (Vercel > Settings > Environment Variables), ou, en local seulement, dans le
 *   fichier .env.chiffrage.local à la racine du site. Ce fichier est ignoré par
 *   git (règle « .env* » de .gitignore) : il ne doit JAMAIS être commité, ni
 *   affiché, ni copié ailleurs que dans une copie du site.
 * - Le chiffrement : AES-256-GCM. Le vecteur d'initialisation est tiré du texte
 *   lui-même (HMAC), si bien qu'un même chiffrage donne toujours le même texte
 *   chiffré : git ne voit un changement que si les coûts ont vraiment changé.
 *
 * Ce fichier ne contient aucun coût. Il est importé par le script d'extraction
 * et par chiffrage.ts (serveur seulement, via prix-garde-corps.server.ts).
 */
import { createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const NOM_CLE = "CHIFFRAGE_GARDE_CORPS_CLE";
export const FICHIER_CLE = ".env.chiffrage.local";

const VERSION = "v1";
const CONTEXTE = "auboiacier/chiffrage-garde-corps/v1";

/** Empreinte courte d'un texte (12 signes hexadécimaux de son sha256). */
export function empreinte(texte: string): string {
  return createHash("sha256").update(texte).digest("hex").slice(0, 12);
}

/** Lit la valeur de la clé dans le texte d'un fichier .env (NOM=valeur, guillemets permis). */
export function cleDansTexte(texte: string): string | null {
  for (const ligne of texte.split(/\r?\n/)) {
    const m = ligne.match(/^\s*CHIFFRAGE_GARDE_CORPS_CLE\s*=\s*["']?([A-Za-z0-9+/=]+)["']?\s*$/);
    if (m) return m[1];
  }
  return null;
}

/**
 * La clé, ou null si elle est absente. La variable d'environnement passe en
 * premier ; le fichier local ne sert qu'en développement et aux tests.
 */
export function lireCle(dossier: string = process.cwd()): Buffer | null {
  let brut = process.env[NOM_CLE]?.trim() || null;
  if (!brut) {
    try {
      brut = cleDansTexte(readFileSync(join(/* turbopackIgnore: true */ dossier, FICHIER_CLE), "utf8"));
    } catch {
      brut = null;
    }
  }
  if (!brut) return null;
  const cle = Buffer.from(brut, "base64");
  if (cle.length !== 32) throw new Error(`${NOM_CLE} invalide : il faut 32 octets écrits en base64`);
  return cle;
}

function sousCle(cle: Buffer, usage: string): Buffer {
  return createHmac("sha256", cle).update(`${CONTEXTE}/${usage}`).digest();
}

/** Chiffre un texte. Même texte et même clé : même résultat, au caractère près. */
export function chiffrer(texte: string, cle: Buffer): string {
  const iv = createHmac("sha256", sousCle(cle, "iv")).update(texte).digest().subarray(0, 12);
  const c = createCipheriv("aes-256-gcm", sousCle(cle, "chiffrement"), iv);
  c.setAAD(Buffer.from(CONTEXTE));
  const corps = Buffer.concat([c.update(texte, "utf8"), c.final()]);
  return [VERSION, iv.toString("base64"), c.getAuthTag().toString("base64"), corps.toString("base64")].join(".");
}

/** Déchiffre ; lève une erreur si la clé n'est pas la bonne ou si le texte a été touché. */
export function dechiffrer(paquet: string, cle: Buffer): string {
  const [version, iv, etiquette, corps] = paquet.split(".");
  if (version !== VERSION || !iv || !etiquette || !corps) throw new Error("chiffrage : format inconnu");
  const d = createDecipheriv("aes-256-gcm", sousCle(cle, "chiffrement"), Buffer.from(iv, "base64"));
  d.setAAD(Buffer.from(CONTEXTE));
  d.setAuthTag(Buffer.from(etiquette, "base64"));
  return Buffer.concat([d.update(Buffer.from(corps, "base64")), d.final()]).toString("utf8");
}

/** Ce que rend chiffrerGC (le chiffrage de l'outil) : seuls les champs utilisés par le site sont typés. */
export type ResultatChiffrageGC = {
  cout: number;
  plancher: number;
  conseille: number;
  fraisFixes: number;
  reste: (prix: number) => number;
  [autre: string]: unknown;
};
/** Ce que rend remiseGC : la livraison ou la pose, telle que l'outil la compte. */
export type RemiseGC = { libelle: string; prix: number; cout: number; detailCout: string };
/** Les réglages de l'atelier utiles au prix d'une commande de plusieurs pièces. */
export type ReglagesGC = {
  fraisFixes: number;
  stripeFixe: number;
  stripePct: number;
  cotis: number;
  tvaVente: number;
  [autre: string]: unknown;
};
export type ChiffrageGC = {
  REGLAGES: ReglagesGC;
  chiffrerGC: (R: unknown, v: unknown) => ResultatChiffrageGC;
  remiseGC: (R: unknown, v: unknown) => RemiseGC;
};

/** Les noms du moteur que le chiffrage utilise (le script d'extraction refuse si la liste change). */
export const DEPENDANCES_CHIFFRAGE = ["fmt"] as const;

/**
 * Fait tourner le code déchiffré (les déclarations de l'outil, sans rien de
 * réécrit) en mode strict, et rend ses trois points d'entrée.
 */
export function evaluerChiffrage(corps: string, fmt: (x: number, d?: number) => string): ChiffrageGC {
  const fabrique = new Function(
    ...DEPENDANCES_CHIFFRAGE,
    `"use strict";\n${corps}\nreturn { REGLAGES, chiffrerGC, remiseGC };`
  ) as (f: typeof fmt) => ChiffrageGC;
  return Object.freeze(fabrique(fmt));
}
