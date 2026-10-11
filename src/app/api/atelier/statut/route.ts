import { NextResponse } from "next/server";
import { cleAgendaValide } from "@/lib/agenda";
import { changerStatut, commandeParPaiement } from "@/lib/commandes-atelier";
import { notifyStatut } from "@/lib/order-email";
import { estStatut } from "@/lib/statut-commande";
import { creerLimite } from "@/lib/limite-debit";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Change l'état d'une commande depuis l'écran de l'atelier.
 *
 * Protégée par la même clé que l'agenda : c'est la seule porte privée du
 * site, et en ouvrir une deuxième multiplierait les secrets à garder.
 * Sans clé valable, la réponse est 404 — jamais 401 ni 403 : une adresse qui
 * répond « interdit » avoue qu'il y a quelque chose derrière.
 */
/** Largement de quoi faire sa journée à l'atelier, et un frein pour qui essaie des clés. */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 60 });

export async function POST(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { cle, paiementId, statut, prevenir } = (corps ?? {}) as Record<string, unknown>;

  if (!cleAgendaValide(cle)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!estStatut(statut) || typeof paiementId !== "string" || !/^pi_[A-Za-z0-9_]{6,200}$/.test(paiementId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Seulement une commande payée de la liste de l'atelier : pas n'importe quel
  // paiement du compte Stripe (une prise de cotes, un essai…).
  const commande = await commandeParPaiement(paiementId);
  if (!commande) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await changerStatut(paiementId, statut))) {
    return NextResponse.json({ error: "error" }, { status: 502 });
  }

  // L'e-mail au client vient APRÈS, et son échec ne défait pas le changement :
  // l'état est juste, c'est le principal. Quentin voit le résultat à l'écran.
  let prevenu = false;
  if (prevenir === true) {
    prevenu = await notifyStatut({
      email: commande.client.email,
      reference: commande.reference,
      locale: commande.locale,
      statut,
      pose: commande.pose,
      retrait: commande.retrait,
    });
  }

  return NextResponse.json({ ok: true, statut, prevenu });
}
