import "server-only";
import { posterResend, type ResultatEnvoi } from "./envoi-resend.ts";

export type { ResultatEnvoi };

/**
 * Envoi d'e-mails via Resend.
 * Une seule porte de sortie pour tout le site : formulaire de devis et
 * bons de commande. Ne lève jamais d'exception — renvoie false et journalise,
 * pour que l'appelant décide quoi faire (réessai Stripe, message au visiteur…).
 */

export type EmailAttachment = { filename: string; content: string };

export type EmailInput = {
  to: string;
  subject: string;
  text: string;
  /**
   * Une version mise en page, en plus du texte (la demande d'avis, pour son
   * bouton). Le texte reste toujours là : c'est lui que lisent les
   * messageries qui n'affichent pas le HTML.
   */
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /**
   * L'en-tête Idempotency-Key de Resend : avec la même clé, le même message
   * ne part qu'une fois en 24 heures, même demandé deux fois (le réessai
   * ci-dessous, ou deux passages du cron d'avis en même temps).
   */
  idempotencyKey?: string;
};

/**
 * L'adresse d'expédition compte autant que la clé.
 * L'ancienne valeur de repli, « onboarding@resend.dev », n'a le droit d'écrire
 * qu'au titulaire du compte Resend : tout autre destinataire est refusé. Le
 * paiement se serait ouvert, le client aurait payé, et sa confirmation
 * n'aurait jamais pu partir.
 */
export function isEmailConfigured() {
  const from = process.env.DEVIS_FROM_EMAIL?.trim();
  return Boolean(process.env.RESEND_API_KEY && from && !from.includes("resend.dev"));
}

/**
 * Suffisant pour prévenir l'atelier d'une demande de devis : l'adresse de
 * démonstration de Resend a le droit d'écrire au titulaire du compte, et
 * c'est lui qui reçoit. Seul l'accusé de réception au prospect peut manquer,
 * ce qui n'empêche pas de lui répondre. Le paiement, lui, garde la règle
 * stricte ci-dessus.
 */
export function canNotifyOwner() {
  return Boolean(process.env.RESEND_API_KEY && process.env.DEVIS_FROM_EMAIL?.trim());
}

/** Adresse qui reçoit les demandes de devis ET les bons de commande. */
export function ownerEmail() {
  return process.env.DEVIS_TO_EMAIL ?? "auboiacier@gmail.com";
}

function fromEmail() {
  const from = process.env.DEVIS_FROM_EMAIL?.trim();
  if (!from) throw new Error("DEVIS_FROM_EMAIL absente");
  return from;
}

/**
 * Envoie, et dit ce qu'il en est : "envoye", "refuse" (rien n'est parti) ou
 * "incertain" (pas de réponse claire, le message a peut-être été envoyé).
 * La demande d'avis en a besoin : elle ne renvoie jamais un message
 * « incertain ». Ne lève jamais d'exception.
 */
export async function envoyerEmail(input: EmailInput): Promise<ResultatEnvoi> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Pas l'objet : il peut porter le nom d'un client, et les journaux ne
    // doivent contenir aucune donnée personnelle qui n'y soit pas nécessaire.
    console.error("[email] RESEND_API_KEY absente — e-mail non envoyé.");
    return "refuse";
  }
  let from: string;
  try {
    from = fromEmail();
  } catch {
    console.error("[email] DEVIS_FROM_EMAIL absente — e-mail non envoyé.");
    return "refuse";
  }

  return posterResend({
    apiKey,
    payload: {
      from,
      to: [input.to],
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments?.length ? input.attachments : undefined,
    },
    cleUnique: input.idempotencyKey,
  });
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  return (await envoyerEmail(input)) === "envoye";
}
