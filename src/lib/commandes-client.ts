// Ce fichier parle à Stripe : il ne doit jamais partir dans le navigateur.
import "server-only";
import type Stripe from "stripe";
import { PRISE_DE_COTES } from "@/lib/deplacement";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { STATUT_INITIAL, estStatut, type Statut } from "@/lib/statut-commande";

/**
 * Les commandes d'un client, retrouvées par son adresse e-mail VÉRIFIÉE.
 *
 * Le rattachement se fait par l'adresse, jamais par un identifiant qu'on
 * aurait écrit dans les métadonnées au moment du paiement. La conséquence est
 * décisive : quelqu'un qui a commandé en mars et qui crée son compte en
 * octobre retrouve sa commande de mars. Aucune autre méthode ne donne ça —
 * et comme le compte n'est proposé qu'APRÈS le paiement, c'est précisément le
 * cas de tout le monde.
 *
 * On lit `customers.list` puis `sessions.list`, jamais `search` : l'index de
 * recherche de Stripe est à cohérence différée, et une commande payée il y a
 * trente secondes y manquerait encore. Un client qui vient de payer, qui crée
 * son compte dans la foulée et qui ne voit rien, c'est un appel à l'atelier.
 */

export type CommandeClient = {
  reference: string;
  sessionId: string;
  creeLe: number;
  montantCents: number;
  locale: "fr" | "en";
  pieces: string[];
  statut: Statut;
  pose: boolean;
  adresse: string;
  /** La facture éditée par Stripe, quand elle existe. */
  factureUrl: string | null;
};

/** Au-delà, ce n'est plus un suivi de commande mais une comptabilité. */
const MAXIMUM = 25;

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

function develop<T extends { id: string }>(valeur: string | T | null | undefined): T | null {
  return valeur && typeof valeur !== "string" ? valeur : null;
}

/**
 * Les commandes payées de cette adresse, de la plus récente à la plus
 * ancienne. Rend une liste vide plutôt que de lever : un espace client qui
 * plante vaut moins qu'un espace client qui dit « rien pour l'instant ».
 */
export async function commandesDuClient(email: string): Promise<CommandeClient[]> {
  if (!isStripeConfigured() || !email) return [];
  const stripe = getStripe();

  try {
    // « customer_creation: "always" » crée un client Stripe à CHAQUE passage
    // en caisse : la même adresse en a donc souvent plusieurs. Les oublier,
    // c'est perdre des commandes.
    const clients = await stripe.customers.list({ email, limit: 100 });
    if (clients.data.length === 0) return [];

    const parClient = await Promise.all(
      clients.data.map((client) =>
        stripe.checkout.sessions
          .list({
            customer: client.id,
            limit: 100,
            expand: ["data.payment_intent", "data.invoice"],
          })
          .then((page) => page.data)
          .catch((error) => {
            console.error("[compte] sessions illisibles :", client.id, error);
            return [] as Stripe.Checkout.Session[];
          })
      )
    );

    const sessions = parClient
      .flat()
      .filter((session) => {
        if (session.payment_status !== "paid") return false;
        // Les prises de cotes ne sont pas des commandes de meuble : elles se
        // suivent dans l'agenda, pas dans « mes commandes ».
        const paiement = develop<Stripe.PaymentIntent>(session.payment_intent);
        return paiement?.metadata?.type !== PRISE_DE_COTES;
      })
      // Une même session ne peut pas revenir deux fois, mais deux clients
      // Stripe peuvent pointer la même — on s'en assure.
      .filter((session, i, toutes) => toutes.findIndex((s) => s.id === session.id) === i)
      .sort((a, b) => b.created - a.created)
      .slice(0, MAXIMUM);

    return await Promise.all(
      sessions.map(async (session): Promise<CommandeClient> => {
        const paiement = develop<Stripe.PaymentIntent>(session.payment_intent);
        const facture = develop<Stripe.Invoice>(session.invoice);
        const livraison = session.collected_information?.shipping_details ?? null;
        const statut = paiement?.metadata?.statut;

        let pieces: string[] = [];
        try {
          const lignes = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
          pieces = lignes.data.map((ligne) => ligne.description ?? "");
        } catch (error) {
          console.error("[compte] lignes illisibles :", session.id, error);
        }

        return {
          reference: session.metadata?.order_ref ?? session.id,
          sessionId: session.id,
          creeLe: session.created,
          montantCents: session.amount_total ?? 0,
          locale: session.metadata?.locale === "en" ? "en" : "fr",
          pieces,
          statut: estStatut(statut) ? statut : STATUT_INITIAL,
          pose: Boolean(session.metadata?.pose_cp),
          adresse: adresseLisible(livraison?.address ?? session.customer_details?.address),
          factureUrl: facture?.hosted_invoice_url ?? null,
        };
      })
    );
  } catch (error) {
    console.error("[compte] commandes illisibles :", error);
    return [];
  }
}

/** Une commande précise, et seulement si elle appartient bien à cette adresse. */
export async function commandeDuClient(email: string, reference: string) {
  const commandes = await commandesDuClient(email);
  return commandes.find((c) => c.reference === reference) ?? null;
}
