import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { CLE_AVIS, FENETRE_JOURS, JOUR_MS, cronAutorise, demanderLesAvis, lireCommande } from "@/lib/avis";
import { envoyerEmail, isEmailConfigured, ownerEmail } from "@/lib/email";
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
 * ici, on ne fait que lire et écrire chez Stripe et brancher Resend.
 *
 * Vercel peut lancer le même passage deux fois, parfois en même temps : la
 * trace relue juste avant l'envoi et la clé Idempotency-Key de Resend
 * (avis.ts) font qu'un seul mail part. Il ne relance jamais un passage en
 * échec : une erreur 500 ne provoque pas de second envoi, elle s'affiche
 * seulement en rouge dans Settings > Cron Jobs.
 *
 * Rien ne part tant que le lien d'avis Google (NEXT_PUBLIC_ATELIER_GOOGLE_AVIS)
 * est vide, ni tant que Resend n'est pas réglé : les commandes attendent, et
 * le mail partira au premier passage qui suit le réglage.
 *
 * Les journaux ne portent que des références de commande et des identifiants
 * Stripe (pi_…, cus_…), jamais d'adresse.
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
    // L'attente normale tant que la fiche Google n'a pas son lien d'avis.
    console.log("[avis] lien d'avis Google vide : aucun mail ne part (NEXT_PUBLIC_ATELIER_GOOGLE_AVIS).");
    return NextResponse.json({ arret: "lien_vide" });
  }
  // Sans Resend ou sans Stripe, ce n'est plus une attente : une panne de
  // réglage, que l'écran des crons doit montrer en rouge.
  if (!isEmailConfigured()) {
    console.error("[avis] Resend non réglé (RESEND_API_KEY, DEVIS_FROM_EMAIL) : aucun mail d'avis ne part.");
    return NextResponse.json({ arret: "email_non_configure" }, { status: 503 });
  }
  if (!isStripeConfigured()) {
    console.error("[avis] Stripe non réglé : aucune commande lisible, aucun mail d'avis ne part.");
    return NextResponse.json({ arret: "stripe_non_configure" }, { status: 503 });
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
      expand: ["data.payment_intent", "data.payment_intent.latest_charge", "data.customer"],
    })) {
      sessions.push(session);
      if (sessions.length >= SESSIONS_MAX) {
        // Stripe donne les plus récentes d'abord : ce sont les plus anciennes,
        // celles dont le mail est dû, qui restent de côté.
        console.warn(`[avis] plus de ${SESSIONS_MAX} commandes en ${FENETRE_JOURS} jours : les plus anciennes ne sont pas lues.`);
        break;
      }
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
    envoyer: async (mail, commande, cleUnique) => {
      const resultat = await envoyerEmail({
        to: commande.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        // Une réponse arrive dans la boîte de l'atelier, chez Quentin.
        replyTo: ownerEmail(),
        // Une commande, une clé : Resend n'envoie qu'une fois, même demandé deux fois.
        idempotencyKey: cleUnique,
      });
      await new Promise((fin) => setTimeout(fin, PAUSE_ENTRE_ENVOIS_MS));
      return resultat;
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
    relire: async (paiementId) => {
      try {
        const paiement = await stripe.paymentIntents.retrieve(paiementId);
        return (paiement.metadata?.[CLE_AVIS] ?? "").trim();
      } catch (error) {
        console.error("[avis] trace illisible :", paiementId, error);
        return null;
      }
    },
    clientDejaSollicite: async (commande) => {
      try {
        // Une même adresse a souvent PLUSIEURS fiches (une par commande, voir
        // profil-client.ts) : on les lit toutes. Le filtre de Stripe tient
        // compte des majuscules, d'où les deux écritures de l'adresse.
        const lues = new Set<string>();
        for (const email of new Set([commande.email, commande.email.toLowerCase()])) {
          for await (const fiche of stripe.customers.list({ email, limit: 100 })) {
            lues.add(fiche.id);
            if (fiche.metadata?.[CLE_AVIS]?.trim()) return true;
          }
        }
        // La fiche de la commande elle-même, si l'adresse y est écrite autrement.
        if (commande.clientId && !lues.has(commande.clientId)) {
          const fiche = await stripe.customers.retrieve(commande.clientId);
          if (!fiche.deleted && fiche.metadata?.[CLE_AVIS]?.trim()) return true;
        }
        return false;
      } catch (error) {
        console.error("[avis] fiches client illisibles :", commande.reference, error);
        return null;
      }
    },
    marquerClient: async (clientId, valeur) => {
      try {
        // Une seule clé, comme pour le paiement : les favoris et la marque de
        // l'espace client restent intacts.
        await stripe.customers.update(clientId, { metadata: { [CLE_AVIS]: valeur } });
        return true;
      } catch (error) {
        console.error("[avis] trace non posée sur la fiche client :", clientId, error);
        return false;
      }
    },
  });

  const resume =
    `[avis] ${bilan.envoyes.length} demande(s) envoyée(s)${bilan.envoyes.length ? ` (${bilan.envoyes.join(", ")})` : ""}` +
    (bilan.echecs.length ? `, ${bilan.echecs.length} à refaire demain (${bilan.echecs.join(", ")})` : "") +
    (bilan.incertains.length
      ? `, ${bilan.incertains.length} peut-être partie(s), pas renvoyée(s) — voir Resend > Emails (${bilan.incertains.join(", ")})`
      : "") +
    (bilan.bloques.length
      ? `, ${bilan.bloques.length} bloquée(s) — effacer « ${CLE_AVIS} » du paiement et de la fiche client dans Stripe (${bilan.bloques.join(", ")})`
      : "");
  const problemes = bilan.echecs.length + bilan.incertains.length + bilan.bloques.length;
  if (problemes === 0) {
    console.log(resume);
    return NextResponse.json(bilan);
  }
  console.error(resume);
  // Rien n'est parti et quelque chose a échoué : Resend ou Stripe est
  // peut-être en panne pour de bon. L'écran des crons doit le montrer.
  return NextResponse.json(bilan, { status: bilan.envoyes.length === 0 ? 500 : 200 });
}
