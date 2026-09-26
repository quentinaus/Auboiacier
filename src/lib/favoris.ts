// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import { createHash } from "node:crypto";
import type { ConfigMemo } from "./config-memo.ts";

/**
 * Les pièces qu'un client a mises de côté, avec leurs cotes et leurs choix.
 *
 * Le besoin, dans ses mots : « les articles en favoris avec la
 * personnalisation enregistrée ». Un plafond lumineux de 1 800 × 1 180 en
 * noir charbon, ce n'est pas « un plafond lumineux » : c'est une pièce
 * précise, et c'est elle qu'il faut retrouver.
 *
 * OÙ ÇA VIT. Dans les métadonnées de la fiche client Stripe, une clé par
 * favori (`fav_…`). Toujours pas de base de données, et cette fois ce n'est
 * pas qu'une question de principe :
 *   — le stockage du navigateur suivrait l'appareil, pas la personne : un
 *     favori enregistré sur le téléphone de l'atelier serait introuvable le
 *     soir sur l'ordinateur, et un favori qui disparaît vaut moins que pas
 *     de favori du tout ;
 *   — la fiche Stripe est déjà celle qui porte ses commandes et ses
 *     coordonnées : tout se supprime d'un même geste le jour où il le demande.
 *
 * CE QUE ÇA COÛTE. Stripe limite les métadonnées à 50 clés de 500 caractères.
 * D'où FAVORIS_MAX, et d'où le format compact plus bas : des clés d'une
 * lettre, pas de blancs. Un favori pèse environ 200 caractères.
 */

/** Cinquante clés chez Stripe, dont on garde une marge pour le reste. */
export const FAVORIS_MAX = 24;

/** Le préfixe des clés de métadonnées : il les distingue du reste de la fiche. */
export const PREFIXE_FAVORI = "fav_";

export type Favori = {
  /** Calculé à partir de la pièce et de sa configuration : deux fois la même chose ne fait qu'un favori. */
  id: string;
  slug: string;
  /** Le nom de la pièce, tel qu'il s'affiche : « Plafond lumineux Lucarne ». */
  titre: string;
  /** Ce qui la distingue : « 1650 × 990 × 300 mm · Noir charbon ». */
  resume: string;
  /** Le prix au moment où il l'a mise de côté, en centimes. Jamais réutilisé pour facturer. */
  prixCents: number | null;
  /** De quoi remettre le configurateur exactement dans cet état. */
  config: ConfigMemo;
  /** Quand, en secondes. Sert à ranger du plus récent au plus ancien. */
  ajouteLe: number;
};

const MAX_TITRE = 70;
const MAX_RESUME = 90;

function coupe(valeur: unknown, maximum: number): string {
  return typeof valeur === "string" ? valeur.replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

/**
 * L'identifiant d'un favori : l'empreinte de la pièce ET de sa configuration.
 *
 * Volontairement pas un tirage au hasard. Remettre deux fois la même table en
 * favori doit écraser le même enregistrement, pas en créer un second — sinon
 * la liste se remplit de doublons que le client n'a pas demandés, et les 24
 * places partent en fumée.
 */
export function empreinteFavori(slug: string, config: ConfigMemo): string {
  // Les clés sont triées : le même contenu donne la même empreinte, quel que
  // soit l'ordre dans lequel le configurateur a rempli l'objet.
  const stable = JSON.stringify(
    Object.keys(config)
      .sort()
      .map((cle) => [cle, (config as Record<string, unknown>)[cle]])
      .filter(([, valeur]) => valeur !== undefined && valeur !== "")
  );
  return createHash("sha256").update(`${slug}\u0000${stable}`).digest("base64url").slice(0, 12);
}

/**
 * Le favori écrit en une chaîne courte. Des clés d'une lettre, et rien
 * d'inutile : on tient dans les 500 caractères d'une métadonnée Stripe, et
 * c'est cette limite, pas l'élégance, qui commande ce format.
 */
export function encoderFavori(favori: Favori): string {
  const compact: Record<string, unknown> = {
    s: favori.slug,
    t: favori.titre,
    r: favori.resume,
    d: favori.ajouteLe,
  };
  if (favori.prixCents !== null) compact.p = favori.prixCents;
  // La configuration garde ses noms : c'est elle qu'on rendra au
  // configurateur (voir config-memo.ts). La renommer ici obligerait à la
  // retraduire au retour — une occasion d'erreur pour trente caractères.
  const config: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(favori.config)) {
    if (valeur !== undefined && valeur !== "" && cle !== "slug") config[cle] = valeur;
  }
  compact.c = config;
  return JSON.stringify(compact);
}

/** Relit un favori. Rend null pour tout ce qui n'en est pas un — jamais d'exception. */
export function decoderFavori(id: string, valeur: unknown): Favori | null {
  if (typeof valeur !== "string" || !id) return null;
  let lu: unknown;
  try {
    lu = JSON.parse(valeur);
  } catch {
    return null;
  }
  if (!lu || typeof lu !== "object") return null;
  const o = lu as Record<string, unknown>;
  const slug = coupe(o.s, 80);
  if (!slug) return null;
  const config = (o.c ?? {}) as Record<string, unknown>;
  const date = Number(o.d);
  const prix = Number(o.p);
  return {
    id,
    slug,
    titre: coupe(o.t, MAX_TITRE),
    resume: coupe(o.r, MAX_RESUME),
    prixCents: Number.isFinite(prix) && prix >= 0 ? Math.round(prix) : null,
    config: { ...(config as object), slug } as ConfigMemo,
    ajouteLe: Number.isFinite(date) && date > 0 ? Math.floor(date) : 0,
  };
}

/**
 * Prépare un favori à l'enregistrement : champs coupés, empreinte calculée.
 * Rend null si la pièce n'est pas identifiable — un favori sans slug ne
 * ramènerait nulle part.
 */
export function composerFavori(entree: {
  slug: unknown;
  titre: unknown;
  resume: unknown;
  prixCents: unknown;
  config: unknown;
  maintenantS: number;
}): Favori | null {
  // Le slug n'est PAS raccourci : un identifiant coupé désignerait une pièce
  // qui n'existe pas, et le favori ramènerait sur une page introuvable. On
  // prend celui qu'on reçoit, ou rien. Même alphabet que les adresses du
  // site : pas de barre oblique, pas de point, rien qui sorte de /artisanat/.
  const slug = typeof entree.slug === "string" ? entree.slug.trim() : "";
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const config = nettoyerConfig(entree.config, slug);
  const prix = Number(entree.prixCents);
  const favori: Favori = {
    id: "",
    slug,
    titre: coupe(entree.titre, MAX_TITRE),
    resume: coupe(entree.resume, MAX_RESUME),
    prixCents: Number.isFinite(prix) && prix > 0 ? Math.round(prix) : null,
    config,
    ajouteLe: Math.floor(entree.maintenantS),
  };
  favori.id = empreinteFavori(slug, config);
  // Une configuration démesurée ne rentrerait pas dans une métadonnée Stripe :
  // mieux vaut refuser que d'écrire une valeur tronquée, illisible au retour.
  return encoderFavori(favori).length <= 480 ? favori : null;
}

/**
 * La configuration, ramenée aux seuls champs que le configurateur sait
 * relire. Tout le reste est écarté : ce qui arrive ici vient du navigateur,
 * et finira dans une fiche Stripe.
 */
function nettoyerConfig(valeur: unknown, slug: string): ConfigMemo {
  const o = (valeur && typeof valeur === "object" ? valeur : {}) as Record<string, unknown>;
  const mot = (v: unknown) =>
    typeof v === "string" && v.length > 0 && v.length <= 40 ? v : undefined;
  const unite = mot(o.unite);
  const quantite = Number(o.quantity);
  return {
    slug,
    unite: unite === "mm" || unite === "cm" || unite === "m" ? unite : undefined,
    largeur: mot(o.largeur),
    hauteur: mot(o.hauteur),
    epaisseur: mot(o.epaisseur),
    hauteurTable: mot(o.hauteurTable),
    sizeId: mot(o.sizeId),
    woodId: mot(o.woodId),
    metalId: mot(o.metalId),
    fabricId: mot(o.fabricId),
    remplissageId: mot(o.remplissageId),
    quantity:
      Number.isInteger(quantite) && quantite >= 1 && quantite <= 99 ? quantite : undefined,
    codePostal: mot(o.codePostal),
    poseVoulue: typeof o.poseVoulue === "boolean" ? o.poseVoulue : undefined,
  };
}

/**
 * Les favoris lus dans les métadonnées d'une fiche Stripe, du plus récent au
 * plus ancien. Tout ce qui n'est pas un favori lisible est ignoré en silence :
 * une métadonnée écrite à la main dans le tableau de bord de Stripe ne doit
 * pas casser la page.
 */
export function favorisDepuisMetadata(metadata: Record<string, string> | null | undefined): Favori[] {
  if (!metadata) return [];
  const favoris: Favori[] = [];
  for (const [cle, valeur] of Object.entries(metadata)) {
    if (!cle.startsWith(PREFIXE_FAVORI)) continue;
    const favori = decoderFavori(cle.slice(PREFIXE_FAVORI.length), valeur);
    if (favori) favoris.push(favori);
  }
  return favoris.sort((a, b) => b.ajouteLe - a.ajouteLe);
}
