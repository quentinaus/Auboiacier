import { NextResponse } from "next/server";
import { composerConfirmation } from "@/lib/confirmation";
import { rendreDevisPdf } from "@/lib/devis-pdf";
import { creerLimite } from "@/lib/limite-debit";
import { getStripe, isStripeConfigured, siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";
/** Stripe, la police et le rendu : jamais plus de vingt secondes. */
export const maxDuration = 20;

/**
 * La confirmation de commande en PDF — « Commande acceptée et payée ».
 *
 * Le document est REFABRIQUÉ à chaque demande à partir de la session Stripe,
 * jamais stocké : il n'y a donc rien à sauvegarder, rien à sauvegarder deux
 * fois, et rien à effacer le jour où un client demande l'effacement de ses
 * données — tout vit chez Stripe, où l'on peut le supprimer.
 *
 * Ce qui protège l'accès : l'identifiant de session lui-même. Il n'est connu
 * que de l'acheteur (Stripe le lui rend dans l'adresse de retour) et de
 * l'atelier, il ne s'énumère pas, et il n'ouvre ici qu'un document que
 * l'acheteur reçoit de toute façon par e-mail. C'est exactement la protection
 * de la page de remerciement, qui affiche déjà la référence et le montant.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 30 });

/** Un identifiant de session Stripe, et rien d'autre. */
function identifiantDeSession(valeur: string | null): string | undefined {
  return valeur && /^cs_[A-Za-z0-9_]{10,200}$/.test(valeur) ? valeur : undefined;
}

export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sessionId = identifiantDeSession(
    new URL(request.url).searchParams.get("session_id")
  );
  if (!sessionId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("[confirmation] session introuvable :", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // On ne fait jamais confiance à l'adresse : c'est Stripe qui dit si c'est payé.
  // Une commande impayée n'a pas de confirmation — ce serait un faux.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "not_paid" }, { status: 404 });
  }

  // L'expansion s'arrête aux dix premières lignes : on demande la liste
  // complète, sinon une commande de plus de dix pièces sortirait tronquée.
  const lignes = await getStripe().checkout.sessions.listLineItems(sessionId, {
    limit: 100,
  });

  const devis = composerConfirmation({
    session,
    lignes: lignes.data,
    origine: siteOrigin(),
  });
  const pdf = await rendreDevisPdf(devis);

  // « Commande-Auboiacier-AB-K7P2X9.pdf » : sans accent ni espace, pour que
  // tous les navigateurs gardent le nom tel quel.
  const nature = devis.locale === "en" ? "Order" : "Commande";
  const reference = devis.numero.replace(/[^A-Za-z0-9-]+/g, "-");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nature}-Auboiacier-${reference}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
