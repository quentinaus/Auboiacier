/**
 * L'agenda des prises de cotes.
 *
 * Le client choisit une demi-journée ; Quentin retrouve le rendez-vous dans
 * son propre calendrier (Apple, Google…) grâce à un flux qu'il s'abonne une
 * fois pour toutes, et sur sa page privée. Rien à installer, aucun compte à
 * relier : les rendez-vous payés SONT l'agenda, ils vivent chez Stripe.
 *
 * Les créneaux proposés suivent des règles simples — les jours ouvrés, matin
 * ou après-midi, à partir de trois jours — moins ceux déjà pris et ceux que
 * Quentin a bloqués (AGENDA_INDISPONIBLE, une liste de dates dans Vercel).
 */
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type DemiJournee = "matin" | "apres-midi";

/** Un créneau : « 2026-09-23|matin ». C'est ce qui voyage et ce qui se stocke. */
export type Creneau = { date: string; demi: DemiJournee };

/** À partir de quand on peut venir, et jusqu'où on propose. */
const DELAI_JOURS = 3;
const HORIZON_JOURS = 42;
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

/** La date d'aujourd'hui, en Europe/Paris, au format AAAA-MM-JJ. */
function aujourdhui(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
}

function ajouterJours(date: string, jours: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

function jourDeSemaine(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = dimanche
}

/** Les dates que Quentin a bloquées : « 2026-09-20, 2026-09-21 » dans Vercel. */
function datesBloquees(): Set<string> {
  return new Set(
    (process.env.AGENDA_INDISPONIBLE ?? "")
      .split(/[,\s;]+/)
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  );
}

/**
 * Les créneaux déjà payés, lus chez Stripe. Le rendez-vous est dans les
 * métadonnées du paiement (voir /api/commande). Sans Stripe, ou si la
 * recherche échoue, on n'en cache aucun : mieux vaut un doublon que Quentin
 * règle au téléphone qu'un agenda vide.
 */
export async function creneauxPris(): Promise<Set<string>> {
  if (!isStripeConfigured()) return new Set();
  try {
    const pris = new Set<string>();
    const stripe = getStripe();
    for await (const pi of stripe.paymentIntents.search({
      query: `metadata['type']:'prise-de-cotes' AND status:'succeeded'`,
      limit: 100,
    })) {
      if (pi.metadata?.rdv) pris.add(pi.metadata.rdv);
    }
    return pris;
  } catch (error) {
    console.error("[agenda] créneaux pris illisibles :", error);
    return new Set();
  }
}

/** Tous les créneaux qu'on peut proposer aujourd'hui, dans l'ordre. */
export async function creneauxDisponibles(): Promise<Creneau[]> {
  const pris = await creneauxPris();
  const bloquees = datesBloquees();
  const debut = ajouterJours(aujourdhui(), DELAI_JOURS);
  const liste: Creneau[] = [];
  for (let i = 0; i < HORIZON_JOURS; i++) {
    const date = ajouterJours(debut, i);
    const jour = jourDeSemaine(date);
    if (jour === 0 || jour === 6) continue; // ni samedi ni dimanche
    if (bloquees.has(date)) continue;
    for (const demi of ["matin", "apres-midi"] as const) {
      const c = { date, demi };
      if (!pris.has(cleCreneau(c))) liste.push(c);
    }
  }
  return liste;
}

/** Ce créneau est-il encore proposable ? Vérifié au moment de payer. */
export async function creneauValide(c: Creneau): Promise<boolean> {
  const dispo = await creneauxDisponibles();
  const cle = cleCreneau(c);
  return dispo.some((d) => cleCreneau(d) === cle);
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

/** Les rendez-vous payés, pour l'agenda de Quentin (flux et page privée). */
export type RendezVous = {
  creneau: Creneau;
  codePostal: string;
  commune: string;
  client: { nom: string; email: string; telephone: string; adresse: string };
  reference: string;
  note: string;
  payeLe: string;
};

export async function rendezVousPayes(): Promise<RendezVous[]> {
  if (!isStripeConfigured()) return [];
  const stripe = getStripe();
  const liste: RendezVous[] = [];
  try {
    for await (const pi of stripe.paymentIntents.search({
      query: `metadata['type']:'prise-de-cotes' AND status:'succeeded'`,
      limit: 100,
    })) {
      const creneau = lireCreneau(pi.metadata?.rdv);
      if (!creneau) continue;
      // La session porte les coordonnées et l'adresse : c'est elle qu'on lit.
      const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
      const session = sessions.data[0];
      const client = session?.customer_details;
      const adresse = session?.collected_information?.shipping_details?.address ?? client?.address;
      liste.push({
        creneau,
        codePostal: pi.metadata?.cp ?? "",
        commune: pi.metadata?.commune ?? "",
        client: {
          nom: session?.collected_information?.shipping_details?.name ?? client?.name ?? "",
          email: client?.email ?? "",
          telephone: client?.phone ?? "",
          adresse: [adresse?.line1, adresse?.line2, adresse?.postal_code, adresse?.city]
            .filter(Boolean)
            .join(", "),
        },
        reference: session?.metadata?.order_ref ?? pi.id,
        note: pi.metadata?.note ?? "",
        payeLe: new Date(pi.created * 1000).toISOString(),
      });
    }
  } catch (error) {
    console.error("[agenda] rendez-vous illisibles :", error);
  }
  return liste.sort((a, b) => cleCreneau(a.creneau).localeCompare(cleCreneau(b.creneau)));
}

/**
 * Le flux iCalendar : une fois abonné dans Apple Calendar ou Google Agenda,
 * chaque rendez-vous payé apparaît tout seul, avec l'adresse et le téléphone.
 */
export function fluxIcs(rendezVous: RendezVous[]): string {
  const ligne = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const evenements = rendezVous.map((rdv) => {
    const [debut, fin] = HEURES[rdv.creneau.demi];
    const jour = rdv.creneau.date.replace(/-/g, "");
    return [
      "BEGIN:VEVENT",
      `UID:${rdv.reference}@auboiacier.fr`,
      `DTSTAMP:${rdv.payeLe.replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=Europe/Paris:${jour}T${debut.replace(":", "")}00`,
      `DTEND;TZID=Europe/Paris:${jour}T${fin.replace(":", "")}00`,
      `SUMMARY:${ligne(`Prise de cotes — ${rdv.client.nom || "client"} (${rdv.commune || rdv.codePostal})`)}`,
      `LOCATION:${ligne(rdv.client.adresse)}`,
      `DESCRIPTION:${ligne(
        [
          `Commande ${rdv.reference}`,
          rdv.client.telephone && `Tél. ${rdv.client.telephone}`,
          rdv.client.email,
          rdv.note,
        ]
          .filter(Boolean)
          .join("\n")
      )}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Auboiacier//Prises de cotes//FR",
    "X-WR-CALNAME:Auboiacier — prises de cotes",
    "X-WR-TIMEZONE:Europe/Paris",
    ...evenements,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
