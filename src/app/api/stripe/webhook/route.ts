import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { compter, etiquettesOrigine } from "@/lib/compteurs";
import { origineDesMetadonnees } from "@/lib/provenance";
import { ligneDeJournal, notifyCustomer, notifyOwner } from "@/lib/order-email";
import { getStripe } from "@/lib/stripe";
import { autresVisitesDuCreneau, lireCreneau, libelleCreneau } from "@/lib/agenda";
import { ownerEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
/** Un rejeu Stripe ne doit pas rester suspendu : au-delà, Stripe recommence. */
export const maxDuration = 60;

/**
 * Les commandes en cours de traitement dans CETTE instance.
 * Stripe livre « au moins une fois » et peut envoyer deux événements pour la
 * même commande à quelques millisecondes d'intervalle
 * (checkout.session.completed et checkout.session.async_payment_succeeded).
 * Le verrou posé dans les métadonnées ne se ferme qu'APRÈS l'envoi des
 * e-mails : entre-temps, les deux livraisons lisent « pas encore prévenu » et
 * l'acheteur reçoit deux fois sa confirmation. Ce petit garde-fou fait
 * attendre la seconde livraison que la première ait fini.
 * Il ne couvre qu'une instance ; le jour où il faudra plus, ce sera un
 * compteur partagé (Vercel KV) sur event.id.
 */
const enCours = new Map<string, Promise<unknown>>();

/**
 * Webhook Stripe : seule source de vérité d'une commande payée.
 * Stripe garantit « au moins une livraison » : le même événement peut arriver
 * plusieurs fois, d'où le verrou d'idempotence posé dans les métadonnées.
 */
export async function POST(request: Request) {
  // Les deux clés sont contrôlées ici. Sans cela, une clé secrète absente
  // faisait échouer getStripe() à l'intérieur du try, et le message affiché
  // était « signature invalide » : on aurait cherché des heures du mauvais côté
  // pendant que les commandes payées n'arrivaient nulle part.
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) {
    console.error("[webhook] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET absente");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  // La signature porte sur les octets exacts : jamais request.json() ici.
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (error) {
    console.error("[webhook] signature invalide :", error);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const handled =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded";
  if (!handled) return NextResponse.json({ received: true });

  const sessionId = (event.data.object as Stripe.Checkout.Session).id;

  // Une livraison à la fois par commande, dans cette instance.
  const precedente = enCours.get(sessionId);
  if (precedente) await precedente.catch(() => {});

  const traitement = traiter(sessionId, request);
  enCours.set(sessionId, traitement);
  try {
    return await traitement;
  } finally {
    enCours.delete(sessionId);
  }
}

async function traiter(sessionId: string, request: Request) {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }
    // Deux verrous séparés : l'atelier et l'acheteur. Si seul l'e-mail à
    // l'atelier a échoué, le rejeu de Stripe le renvoie sans importuner
    // l'acheteur avec une deuxième confirmation.
    const atelierDejaPrevenu = session.metadata?.notified === "1";
    const clientDejaPrevenu = session.metadata?.client_prevenu === "1";
    if (atelierDejaPrevenu && clientDejaPrevenu) {
      return NextResponse.json({ received: true });
    }

    // L'expansion ne renvoie que les dix premières lignes : on demande la liste
    // complète, sinon une commande de plus de dix pièces arriverait tronquée.
    const lineItems = await getStripe().checkout.sessions.listLineItems(sessionId, {
      limit: 100,
    });

    // Les deux e-mails partent EN MÊME TEMPS et sans se conditionner l'un
    // l'autre : avant, un refus de l'e-mail à l'atelier empêchait aussi la
    // confirmation à l'acheteur, qui restait sans nouvelles après avoir payé.
    const [atelierEnvoye, clientEnvoye] = await Promise.all([
      atelierDejaPrevenu ? Promise.resolve(true) : notifyOwner(session, lineItems.data),
      clientDejaPrevenu ? Promise.resolve(true) : notifyCustomer(session, lineItems.data),
    ]);

    // Une commande payée de plus au compteur : une seule fois, au premier
    // bon de commande parti (un rejeu de Stripe ne la recompte pas). Elle n'y
    // porte que son origine (réponse au menu, canal du lien), rien d'autre.
    // Une ligne « COMPTEUR » dans les journaux seulement : la requête vient de
    // Stripe, pas du client, et Vercel Analytics la jetterait comme robot
    // (JOURNAL_SEULEMENT, src/lib/compteurs.ts). Stripe fait foi.
    if (!atelierDejaPrevenu && atelierEnvoye) {
      const { connu, provenance } = origineDesMetadonnees(session.metadata);
      after(() => compter("commande_payee", etiquettesOrigine(connu, provenance), request));
    }

    // Une visite payée sur un créneau déjà vendu (rare : voir
    // autresVisitesDuCreneau) : Quentin est prévenu tout de suite, pour
    // appeler l'un des deux clients. Une seule fois, au premier passage.
    if (!atelierDejaPrevenu && atelierEnvoye && session.metadata?.rdv) {
      await signalerDoublon(session).catch((error) =>
        console.error("[webhook] doublon de créneau non vérifié :", sessionId, error)
      );
    }

    // On note ce qui est parti, pour ne pas le renvoyer au rejeu suivant.
    if (atelierEnvoye !== atelierDejaPrevenu || clientEnvoye !== clientDejaPrevenu) {
      try {
        await getStripe().checkout.sessions.update(sessionId, {
          metadata: {
            ...(session.metadata ?? {}),
            ...(atelierEnvoye ? { notified: "1" } : {}),
            ...(clientEnvoye ? { client_prevenu: "1" } : {}),
          },
        });
      } catch (error) {
        // Le verrou n'est pas passé : au pire, un e-mail en double. Ce n'est
        // pas une raison pour perdre la commande, on continue.
        console.error("[webhook] verrou non posé :", sessionId, error);
      }
    }

    if (!atelierEnvoye) {
      // Filet de sécurité : la commande complète est écrite en clair dans les
      // journaux Vercel, sur une seule ligne. Même si l'e-mail ne part jamais,
      // rien n'est perdu — il suffit de chercher « COMMANDE-A-RECOPIER ».
      console.error(ligneDeJournal(session, lineItems.data));
      // 500 → Stripe réessaie pendant ~3 jours : la commande ne peut pas se perdre.
      console.error("[webhook] bon de commande non envoyé, réessai demandé :", sessionId);
      return NextResponse.json({ error: "email_failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] traitement impossible :", error);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}

async function signalerDoublon(session: Stripe.Checkout.Session) {
  const rdv = session.metadata?.rdv ?? "";
  const autres = await autresVisitesDuCreneau(rdv, session.id);
  if (!autres.length) return;
  const creneau = lireCreneau(rdv);
  const quand = creneau ? libelleCreneau(creneau, "fr") : rdv;
  await sendEmail({
    to: ownerEmail(),
    subject: `Attention : deux prises de cotes le même créneau (${quand})`,
    text: [
      `La commande ${session.metadata?.order_ref ?? session.id} vient d'être payée pour une prise de cotes le ${quand}.`,
      `Ce créneau était déjà payé par : ${autres.join(", ")}.`,
      "",
      "Appelez l'un des deux clients pour lui proposer une autre demi-journée (ou le rembourser depuis Stripe).",
    ].join("\n"),
  });
}
