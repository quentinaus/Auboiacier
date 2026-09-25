// Ce fichier parle à Stripe : il ne doit jamais partir dans le navigateur.
// La partie pure — les quatre états et leurs libellés — est dans
// statut-commande.ts, que l'écran à boutons importe côté client.
import "server-only";
import type Stripe from "stripe";
import { PRISE_DE_COTES } from "@/lib/deplacement";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { STATUT_INITIAL, estStatut, type Statut } from "@/lib/statut-commande";

/**
 * Les commandes payées, telles que l'atelier les voit.
 *
 * Comme l'agenda des prises de cotes, cet écran n'a PAS de base de données :
 * les commandes payées SONT chez Stripe, et l'état de fabrication vit dans
 * les métadonnées du PaymentIntent, à côté de l'argent qu'il représente.
 *
 * Pourquoi le PaymentIntent et pas la session de paiement : la session est un
 * objet de passage, le PaymentIntent est l'objet durable ; et surtout, le
 * webhook écrit déjà `notified` et `client_prevenu` sur la session. Deux
 * objets séparés, donc aucune écriture concurrente ne peut en écraser une
 * autre — un changement d'état pendant qu'un rejeu Stripe pose son verrou ne
 * se perd pas.
 */

export type CommandeAtelier = {
  reference: string;
  sessionId: string;
  paiementId: string;
  /** Quand la commande a été passée, en secondes depuis 1970. */
  creeLe: number;
  montantCents: number;
  locale: "fr" | "en";
  client: { nom: string; email: string; telephone: string };
  /** La ville saisie au panier : elle est là même sans adresse complète. */
  ville: string;
  adresse: string;
  /** Les pièces commandées, telles qu'elles sont écrites chez Stripe. */
  pieces: string[];
  statut: Statut;
  /** L'atelier vient poser la pièce : le vocabulaire du suivi change. */
  pose: boolean;
};

/**
 * Combien de commandes on détaille. Au-delà, l'écran deviendrait long à
 * charger sans rien apprendre : c'est un outil de travail pour les commandes
 * en cours, pas un livre de comptes.
 */
const DETAILLEES = 40;

/** La dernière lecture chez Stripe, gardée une minute (voir agenda.ts). */
let memoire: { a: number; valeur: CommandeAtelier[] } | null = null;
const MEMOIRE_MS = 60_000;

function texte(valeur: string | null | undefined) {
  return valeur ?? "";
}

function adresseLisible(adresse: Stripe.Address | null | undefined) {
  if (!adresse) return "";
  return [
    adresse.line1,
    adresse.line2,
    [adresse.postal_code, adresse.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Le PaymentIntent d'une session, une fois développé. Stripe renvoie soit
 * l'objet, soit son identifiant, soit rien : les trois cas existent vraiment.
 */
function paiementDe(session: Stripe.Checkout.Session): Stripe.PaymentIntent | null {
  const pi = session.payment_intent;
  return pi && typeof pi !== "string" ? pi : null;
}

/** Les commandes payées, de la plus récente à la plus ancienne. */
export async function commandesPayees(frais = false): Promise<CommandeAtelier[]> {
  if (!isStripeConfigured()) return [];
  const maintenant = Date.now();
  if (!frais && memoire && maintenant - memoire.a < MEMOIRE_MS) return memoire.valeur;

  const stripe = getStripe();
  let sessions: Stripe.Checkout.Session[];
  try {
    // `list` et non `search` : l'index de recherche de Stripe est à cohérence
    // différée, et une commande payée il y a trente secondes y manquerait
    // encore. Sur cet écran, une commande absente est un appel téléphonique.
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.payment_intent"],
    });
    sessions = page.data;
  } catch (error) {
    console.error("[atelier] commandes illisibles :", error);
    // On rend la dernière lecture réussie plutôt qu'un écran vide, qui
    // laisserait croire qu'il n'y a rien à fabriquer.
    return memoire?.valeur ?? [];
  }

  const payees = sessions.filter((session) => {
    if (session.payment_status !== "paid") return false;
    // Les prises de cotes ont leur propre écran : elles ne se fabriquent pas.
    const paiement = paiementDe(session);
    return paiement?.metadata?.type !== PRISE_DE_COTES;
  });

  const commandes = await Promise.all(
    payees.slice(0, DETAILLEES).map(async (session): Promise<CommandeAtelier> => {
      const paiement = paiementDe(session);
      const client = session.customer_details;
      const livraison = session.collected_information?.shipping_details ?? null;
      const statutBrut = paiement?.metadata?.statut;

      let pieces: string[] = [];
      try {
        const lignes = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
        pieces = lignes.data.map((ligne) => texte(ligne.description));
      } catch (error) {
        // Le détail manque : la commande reste pilotable, c'est l'essentiel.
        console.error("[atelier] lignes illisibles :", session.id, error);
      }

      return {
        reference: session.metadata?.order_ref ?? session.id,
        sessionId: session.id,
        paiementId: paiement?.id ?? "",
        creeLe: session.created,
        montantCents: session.amount_total ?? 0,
        locale: session.metadata?.locale === "en" ? "en" : "fr",
        client: {
          nom: texte(livraison?.name ?? client?.name),
          email: texte(client?.email),
          telephone: texte(client?.phone),
        },
        ville: texte(session.metadata?.ville),
        adresse: adresseLisible(livraison?.address ?? client?.address),
        pieces,
        statut: estStatut(statutBrut) ? statutBrut : STATUT_INITIAL,
        pose: Boolean(session.metadata?.pose_cp),
      };
    })
  );

  memoire = { a: maintenant, valeur: commandes };
  return commandes;
}

/**
 * Change l'état d'une commande. On relit les métadonnées avant d'écrire :
 * Stripe REMPLACE la table entière, et un `update` construit de mémoire
 * effacerait `order_ref` — donc le lien entre le paiement et la commande.
 */
export async function changerStatut(paiementId: string, statut: Statut): Promise<boolean> {
  if (!isStripeConfigured()) return false;
  const stripe = getStripe();
  try {
    const paiement = await stripe.paymentIntents.retrieve(paiementId);
    await stripe.paymentIntents.update(paiementId, {
      metadata: {
        ...(paiement.metadata ?? {}),
        statut,
        statut_le: new Date().toISOString(),
      },
    });
    // La liste en mémoire vient de vieillir d'un coup : l'écran doit montrer
    // le nouvel état tout de suite, pas dans cinquante secondes.
    memoire = null;
    return true;
  } catch (error) {
    console.error("[atelier] état non enregistré :", paiementId, error);
    return false;
  }
}

/** Retrouve une commande par son paiement, pour l'e-mail qui suit. */
export async function commandeParPaiement(paiementId: string) {
  const commandes = await commandesPayees(true);
  return commandes.find((c) => c.paiementId === paiementId) ?? null;
}
