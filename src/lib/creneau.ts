/**
 * Ce qu'est un créneau, et comment on l'écrit — la partie PURE de l'agenda.
 *
 * Ce fichier n'importe rien : il peut être tiré aussi bien par les composants
 * du navigateur (le calendrier du formulaire, le panier) que par le serveur.
 * Tout ce qui parle à Stripe vit dans agenda.ts, marqué « server-only » : il
 * était importé par des composants "use client" pour ces trois fonctions, et
 * le SDK Stripe entier partait chez le visiteur avec.
 */

export type DemiJournee = "matin" | "apres-midi";

/** Un créneau : « 2026-09-23|matin ». C'est ce qui voyage et ce qui se stocke. */
export type Creneau = { date: string; demi: DemiJournee };

/** Les heures des deux demi-journées, dans le calendrier de Quentin. */
export const HEURES: Record<DemiJournee, [string, string]> = {
  matin: ["09:00", "12:00"],
  "apres-midi": ["14:00", "17:00"],
};

export function cleCreneau(c: Creneau) {
  return `${c.date}|${c.demi}`;
}

export function lireCreneau(texte: string | undefined | null): Creneau | null {
  if (!texte) return null;
  const [date, demi] = texte.split("|");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return null;
  if (demi !== "matin" && demi !== "apres-midi") return null;
  return { date, demi };
}

/** « mardi 23 septembre, matin » — pour le client, le panier et le bon de commande. */
export function libelleCreneau(c: Creneau, locale: "fr" | "en"): string {
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(`${c.date}T12:00:00Z`));
  const demi =
    locale === "en"
      ? c.demi === "matin"
        ? "morning"
        : "afternoon"
      : c.demi === "matin"
        ? "matin"
        : "après-midi";
  return `${date}, ${demi}`;
}
