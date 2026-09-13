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
  replyTo?: string;
  attachments?: EmailAttachment[];
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

/** Adresse qui reçoit les demandes de devis ET les bons de commande. */
export function ownerEmail() {
  return process.env.DEVIS_TO_EMAIL ?? "auboiacier@gmail.com";
}

function fromEmail() {
  const from = process.env.DEVIS_FROM_EMAIL?.trim();
  if (!from) throw new Error("DEVIS_FROM_EMAIL absente");
  return from;
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY absente — e-mail non envoyé :", input.subject);
    return false;
  }

  const payload = {
    from: fromEmail(),
    to: [input.to],
    reply_to: input.replyTo,
    subject: input.subject,
    text: input.text,
    attachments: input.attachments?.length ? input.attachments : undefined,
  };

  // Un seul réessai : Resend peut renvoyer un 429 ou un 5xx passager.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) return true;

      const detail = await response.text().catch(() => "");
      console.error(`[email] Resend ${response.status} :`, detail.slice(0, 500));
      // 4xx autre que 429 : inutile de réessayer, la requête est mauvaise.
      if (response.status !== 429 && response.status < 500) return false;
    } catch (error) {
      console.error("[email] échec réseau :", error);
    }
  }

  return false;
}
