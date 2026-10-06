import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { CLE_AVIS, FENETRE_JOURS, JOUR_MS, cronAutorise, demanderLesAvis, lireCommande } from "@/lib/avis";
import { isEmailConfigured, ownerEmail, sendEmail } from "@/lib/email";
import { lienLaisserAvis } from "@/lib/seo";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
/** Lire quatre mois de commandes et envoyer quelques mails tient largement dans une minute. */
export const maxDuration = 60;

/** Garde-fou : au-delà, l'atelier a d'autres soucis qu'une demande d'avis. */
const SESSIONS_MAX = 2000;

/** Resend accepte deux envois par seconde : on en laisse passer un peu moins. */
const PAUSE_ENTRE_ENVOIS_MS = 600;

/**
 * La demande d'avis, une fois par jour (vercel.json, « crons »).
 *
 * Vercel appelle cette adresse chaque matin avec « Authorization: Bearer »
 * suivi de CRON_SECRET. Sans ce secret, ou avec un autre : 401, rien ne se
 * passe. La règle (quand, à qui, une seule fois) est dans src/lib/avis.ts ;
 * ici, on ne fait que lire Stripe et brancher Resend.
 *
 * Rien ne part tant que le lien d'avis Google (NEXT_PUBLIC_ATELIER_GOOGLE_AVIS)
 * est vide, ni tant que Resend n'est pas réglé : les commandes attendent, et
 * le mail partira au premier passage qui suit le réglage.
 *
 * Les journaux ne portent que des références de commande, jamais d'adresse.
 */
export async function GET(request: Request) {
  if (!cronAutorise(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    if (!process.env.CRON_SECRET?.trim()) {
      console.error("[avis] CRON_SECRET absente : la demande d'avis ne tourne pas (voir MISE-EN-LIGNE.md).");
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lien = lienLaisserAvis();
  if (!lien) {
    return NextResponse.json({ arret: "lien_vide" });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ arret: "email_non_configure" });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ arret: "stripe_non_configure" });
  }

  const maintenant = Date.now();
  const stripe = getStripe();
  const sessions: Stripe.Checkout.Session[] = [];
  try {
    // `list` et non `search` : comme l'écran de l'atelier (commandes-atelier.ts).
    for await (const session of stripe.checkout.sessions.list({
      created: { gte: Math.floor((maintenant - FENETRE_JOURS * JOUR_MS) / 1000) },
      status: "complete",
      limit: 100,
      expand: ["data.payment_intent", "data.payment_intent.latest_charge"],
    })) {
      sessions.push(session);
      if (sessions.length >= SESSIONS_MAX) break;
    }
  } catch (error) {
    console.error("[avis] commandes illisibles chez Stripe :", error);
    return NextResponse.json({ error: "stripe" }, { status: 502 });
  }

  const bilan = await demanderLesAvis({
    commandes: sessions.map(lireCommande),
    maintenant,
    lien,
    emailPret: true,
    envoyer: async (mail, commande) => {
      const parti = await sendEmail({
        to: commande.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        // Une réponse arrive dans la boîte de l'atelier, chez Quentin.
        replyTo: ownerEmail(),
      });
      await new Promise((fin) => setTimeout(fin, PAUSE_ENTRE_ENVOIS_MS));
      return parti;
    },
    marquer: async (paiementId, valeur) => {
      try {
        // Une seule clé : Stripe ajoute ou remplace celle-ci et garde les
        // autres. Renvoyer une copie de toutes les métadonnées, lue au début
        // du passage, effacerait un état de fabrication changé entre-temps
        // depuis l'écran de l'atelier. Une valeur vide efface la clé.
        await stripe.paymentIntents.update(paiementId, { metadata: { [CLE_AVIS]: valeur } });
        return true;
      } catch (error) {
        console.error("[avis] trace non posée :", paiementId, error);
        return false;
      }
    },
  });

  console.log(
    `[avis] ${bilan.envoyes.length} demande(s) envoyée(s)${bilan.envoyes.length ? ` (${bilan.envoyes.join(", ")})` : ""}` +
      (bilan.echecs.length ? `, ${bilan.echecs.length} à refaire (${bilan.echecs.join(", ")})` : "")
  );
  return NextResponse.json(bilan);
}
