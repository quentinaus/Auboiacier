// Ni « server-only » ni alias « @/ » : les tests (node --test) chargent ce
// fichier directement. La clé n'y est jamais lue : email.ts la lui passe.

/**
 * L'appel à Resend, et ce qu'on peut en conclure.
 *
 * Trois issues, pas deux, parce qu'un échec n'est pas toujours un échec :
 *  — "envoye"    : Resend a accepté le message ;
 *  — "refuse"    : Resend l'a refusé franchement (adresse invalide, clé
 *                  refusée, trop d'envois d'un coup) : RIEN n'est parti ;
 *  — "incertain" : pas de réponse claire (délai dépassé, réseau coupé, panne
 *                  chez Resend, même message déjà en cours d'envoi) : le
 *                  message est PEUT-ÊTRE parti.
 *
 * La demande d'avis (avis.ts) ne renvoie jamais un message « incertain » :
 * mieux vaut aucun mail que deux.
 */
export type ResultatEnvoi = "envoye" | "refuse" | "incertain";

export const ADRESSE_RESEND = "https://api.resend.com/emails";

/** Au-delà, on n'attend plus la réponse de Resend (et l'envoi devient « incertain »). */
export const DELAI_RESEND_MS = 10_000;

/** Le temps de souffler avant le second essai (un 429 dit « trop vite »). */
export const PAUSE_AVANT_REESSAI_MS = 1_000;

export async function posterResend(options: {
  apiKey: string;
  payload: Record<string, unknown>;
  /**
   * L'en-tête Idempotency-Key : la même clé, avec le même message, n'est
   * envoyée qu'une fois par Resend pendant 24 heures, même si elle lui
   * arrive deux fois (second essai ci-dessous, ou deux passages du cron en
   * même temps).
   */
  cleUnique?: string;
  /** Les tests branchent leur propre fetch. */
  fetch?: typeof fetch;
  delaiMs?: number;
  pauseMs?: number;
}): Promise<ResultatEnvoi> {
  const appeler = options.fetch ?? fetch;
  const pauseMs = options.pauseMs ?? PAUSE_AVANT_REESSAI_MS;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
  };
  if (options.cleUnique) headers["Idempotency-Key"] = options.cleUnique;
  const body = JSON.stringify(options.payload);

  // Un essai sans réponse claire : le message a pu partir. Même si le second
  // essai est refusé, on ne peut plus dire « rien n'est parti ».
  let incertain = false;

  // Un seul réessai : Resend peut renvoyer un 429 ou un 5xx passager.
  for (let essai = 0; essai < 2; essai++) {
    if (essai > 0 && pauseMs > 0) await new Promise((fin) => setTimeout(fin, pauseMs));
    try {
      const response = await appeler(ADRESSE_RESEND, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(options.delaiMs ?? DELAI_RESEND_MS),
      });
      if (response.ok) return "envoye";

      const detail = await response.text().catch(() => "");
      // Le détail de Resend, jamais le message : il porte l'adresse du client.
      console.error(`[email] Resend ${response.status} :`, detail.slice(0, 500));
      // 409 : la même clé est déjà en cours d'envoi (un autre passage s'en
      // occupe), ou a servi à un autre message. Surtout ne pas conclure que
      // rien n'est parti.
      if (response.status === 409) return "incertain";
      // 5xx : panne chez Resend, qui a pu accepter le message quand même.
      if (response.status >= 500) {
        incertain = true;
        continue;
      }
      // 429 : trop d'envois, refusé avant tout traitement. On réessaie une fois.
      if (response.status === 429) continue;
      // Autre 4xx : la requête est mauvaise (adresse, clé…), inutile de réessayer.
      return incertain ? "incertain" : "refuse";
    } catch (error) {
      // Délai dépassé ou réseau coupé : Resend a peut-être reçu le message.
      console.error("[email] pas de réponse de Resend :", error);
      incertain = true;
    }
  }
  return incertain ? "incertain" : "refuse";
}
