// Ce fichier parle à Stripe : il ne doit jamais partir dans le navigateur.
import "server-only";
import type Stripe from "stripe";
import {
  FAVORIS_MAX,
  PREFIXE_FAVORI,
  composerFavori,
  encoderFavori,
  favorisDepuisMetadata,
  type Favori,
} from "@/lib/favoris";
import { PROFIL_VIDE, normaliserProfil, type Profil } from "@/lib/profil";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * La fiche d'un client : ses coordonnées et ses favoris, chez Stripe.
 *
 * LE PROBLÈME QUE CE FICHIER RÉSOUT. Une même adresse e-mail a souvent
 * PLUSIEURS fiches chez Stripe : la caisse est réglée sur
 * `customer_creation: "always"`, donc chaque passage en crée une. Pour les
 * commandes, ce n'est pas gênant, on les lit toutes (commandes-client.ts).
 * Pour un profil qu'on écrit, il faut au contraire en désigner UNE, toujours
 * la même — sinon le client corrige son adresse, revient le lendemain, et
 * retrouve l'ancienne parce qu'on a écrit dans une autre fiche.
 *
 * LA RÈGLE, dans cet ordre :
 *   1. la fiche marquée `espace: "1"` — c'est celle de l'espace client ;
 *   2. sinon la plus récente, qu'on marque au passage ;
 *   3. sinon aucune, et on en crée une à la première écriture seulement.
 *
 * On ne crée jamais de fiche pour une simple lecture : quelqu'un qui se
 * connecte et regarde sans rien enregistrer ne doit laisser aucune trace.
 */

/** La marque qui distingue la fiche de l'espace client des fiches de passage. */
const MARQUE = "espace";

export type FicheClient = {
  id: string;
  profil: Profil;
  favoris: Favori[];
};

export const FICHE_VIDE: FicheClient = { id: "", profil: PROFIL_VIDE, favoris: [] };

function enProfil(client: Stripe.Customer): Profil {
  const a = client.address;
  return normaliserProfil({
    nom: client.name ?? "",
    telephone: client.phone ?? "",
    adresse: {
      ligne1: a?.line1 ?? "",
      ligne2: a?.line2 ?? "",
      codePostal: a?.postal_code ?? "",
      ville: a?.city ?? "",
    },
  });
}

/**
 * La fiche à utiliser pour cette adresse, ou null si le client n'en a aucune.
 * Ne crée rien.
 */
async function trouverFiche(email: string): Promise<Stripe.Customer | null> {
  if (!isStripeConfigured() || !email) return null;
  try {
    const page = await getStripe().customers.list({ email, limit: 100 });
    const vivants = page.data.filter((c) => !c.deleted);
    if (vivants.length === 0) return null;
    const marquee = vivants.find((c) => c.metadata?.[MARQUE] === "1");
    if (marquee) return marquee;
    // Pas encore de fiche d'espace : on adopte la plus récente. Elle porte
    // déjà l'adresse de la dernière commande, ce que le client s'attend
    // justement à relire.
    return vivants.sort((a, b) => b.created - a.created)[0] ?? null;
  } catch (error) {
    console.error("[compte] fiche client illisible :", error);
    return null;
  }
}

/** La fiche, en créant ce qu'il faut. À n'appeler que pour écrire. */
async function ficheOuCreer(email: string): Promise<Stripe.Customer | null> {
  if (!isStripeConfigured() || !email) return null;
  const stripe = getStripe();
  try {
    const existante = await trouverFiche(email);
    if (existante) {
      if (existante.metadata?.[MARQUE] === "1") return existante;
      // On la marque sans toucher au reste : `metadata` REMPLACE toute la
      // table chez Stripe, donc on repart de celle qu'on vient de lire.
      return await stripe.customers.update(existante.id, {
        metadata: { ...existante.metadata, [MARQUE]: "1" },
      });
    }
    return await stripe.customers.create({ email, metadata: { [MARQUE]: "1" } });
  } catch (error) {
    console.error("[compte] fiche client impossible à ouvrir :", error);
    return null;
  }
}

/** Ce que l'espace client affiche. Rend une fiche vide plutôt que de lever. */
export async function ficheDuClient(email: string): Promise<FicheClient> {
  const client = await trouverFiche(email);
  if (!client) return FICHE_VIDE;
  return {
    id: client.id,
    profil: enProfil(client),
    favoris: favorisDepuisMetadata(client.metadata),
  };
}

/**
 * Enregistre les coordonnées. Rend le profil tel qu'il a été retenu — coupé,
 * nettoyé — pour que la page réaffiche ce qui est vraiment enregistré, et
 * non ce que le client croyait taper.
 */
export async function enregistrerProfil(email: string, entree: unknown): Promise<Profil | null> {
  const profil = normaliserProfil(entree);
  const client = await ficheOuCreer(email);
  if (!client) return null;
  try {
    const { nom, telephone, adresse } = profil;
    const aUneAdresse = Boolean(adresse.ligne1 || adresse.codePostal || adresse.ville);
    await getStripe().customers.update(client.id, {
      // Stripe efface un champ quand on lui envoie une chaîne vide : c'est ce
      // qu'on veut, un client doit pouvoir retirer son téléphone.
      name: nom,
      phone: telephone,
      address: aUneAdresse
        ? {
            line1: adresse.ligne1,
            line2: adresse.ligne2 || undefined,
            postal_code: adresse.codePostal,
            city: adresse.ville,
            country: "FR",
          }
        : null,
    });
    return profil;
  } catch (error) {
    console.error("[compte] coordonnées non enregistrées :", error);
    return null;
  }
}

/**
 * Met une pièce de côté. Rend la liste à jour, ou null si l'écriture a
 * échoué.
 *
 * Le même article dans la même configuration écrase son propre
 * enregistrement (l'identifiant est l'empreinte de la configuration, voir
 * favoris.ts) : cliquer deux fois sur le cœur ne crée pas deux favoris.
 */
export async function ajouterFavori(
  email: string,
  entree: { slug: unknown; titre: unknown; resume: unknown; prixCents: unknown; config: unknown },
  maintenantS: number
): Promise<Favori[] | null> {
  const favori = composerFavori({ ...entree, maintenantS });
  if (!favori) return null;
  const client = await ficheOuCreer(email);
  if (!client) return null;

  const metadata = { ...(client.metadata ?? {}) };
  const cle = `${PREFIXE_FAVORI}${favori.id}`;
  if (!(cle in metadata)) {
    // Plein : on fait de la place en retirant le plus ancien. Un refus sec
    // laisserait le client cliquer un cœur qui ne répond pas.
    const actuels = favorisDepuisMetadata(metadata);
    for (const vieux of actuels.slice(FAVORIS_MAX - 1)) {
      delete metadata[`${PREFIXE_FAVORI}${vieux.id}`];
    }
  }
  metadata[cle] = encoderFavori(favori);

  try {
    const misAJour = await getStripe().customers.update(client.id, { metadata });
    return favorisDepuisMetadata(misAJour.metadata);
  } catch (error) {
    console.error("[compte] favori non enregistré :", error);
    return null;
  }
}

/** Retire une pièce des favoris. Rend la liste à jour, ou null en cas d'échec. */
export async function retirerFavori(email: string, id: unknown): Promise<Favori[] | null> {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return null;
  const client = await trouverFiche(email);
  if (!client) return [];
  const cle = `${PREFIXE_FAVORI}${id}`;
  if (!(cle in (client.metadata ?? {}))) return favorisDepuisMetadata(client.metadata);
  try {
    // Chez Stripe, une métadonnée s'efface en lui donnant la valeur vide.
    const misAJour = await getStripe().customers.update(client.id, {
      metadata: { ...client.metadata, [cle]: "" },
    });
    return favorisDepuisMetadata(misAJour.metadata);
  } catch (error) {
    console.error("[compte] favori non retiré :", error);
    return null;
  }
}
