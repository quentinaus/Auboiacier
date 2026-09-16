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
// Ce fichier parle à Stripe : il ne doit jamais partir dans le navigateur.
// « server-only » fait échouer la compilation si un composant "use client"
// l'importe — la partie pure (types, clés, libellés) est dans creneau.ts.
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { cleCreneau, lireCreneau, type Creneau, HEURES } from "./creneau";
// Les fichiers serveur qui importent @/lib/agenda continuent de tout y trouver.
export * from "./creneau";

/** À partir de quand on peut venir, et jusqu'où on propose. */
const DELAI_JOURS = 3;
const HORIZON_JOURS = 42;

/**
 * La clé reçue ouvre-t-elle l'agenda privé (page et flux ICS) ? Comparée à
 * AGENDA_CLE octet par octet en temps constant : un `!==` s'arrête au premier
 * caractère différent, et ce temps de réponse trahit, lettre après lettre,
 * la clé attendue. Sans clé configurée, rien n'ouvre.
 */
export function cleAgendaValide(recue: unknown): recue is string {
  const attendue = process.env.AGENDA_CLE;
  if (!attendue || typeof recue !== "string" || !recue) return false;
  const a = Buffer.from(recue);
  const b = Buffer.from(attendue);
  return a.length === b.length && timingSafeEqual(a, b);
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
 * La dernière lecture chez Stripe, gardée une minute : un rendez-vous se paie
 * rarement deux fois dans la minute, et sans cela chaque visiteur du
 * calendrier déclenchait une recherche Stripe — un robot pouvait épuiser la
 * limite d'appels du compte. `frais = true` force la relecture : c'est ce que
 * fait la vérification AU PAIEMENT, qui doit être exacte.
 */
let memoirePris: { a: number; valeur: Set<string> } | null = null;
const MEMOIRE_MS = 60_000;

/**
 * Les créneaux déjà payés, lus chez Stripe. Le rendez-vous est dans les
 * métadonnées du paiement (voir /api/commande). Sans Stripe, ou si la
 * recherche échoue, on n'en cache aucun : mieux vaut un doublon que Quentin
 * règle au téléphone qu'un agenda vide.
 */
export async function creneauxPris(frais = false): Promise<Set<string>> {
  if (!isStripeConfigured()) return new Set();
  if (!frais && memoirePris && Date.now() - memoirePris.a < MEMOIRE_MS) return memoirePris.valeur;
  try {
    const pris = new Set<string>();
    const stripe = getStripe();
    for await (const pi of stripe.paymentIntents.search({
      query: `metadata['type']:'prise-de-cotes' AND status:'succeeded'`,
      limit: 100,
    })) {
      if (pi.metadata?.rdv) pris.add(pi.metadata.rdv);
    }
    // On ne mémorise jamais un échec : en cas de doute, on ne cache aucun créneau.
    memoirePris = { a: Date.now(), valeur: pris };
    return pris;
  } catch (error) {
    console.error("[agenda] créneaux pris illisibles :", error);
    return new Set();
  }
}

/** Tous les créneaux qu'on peut proposer aujourd'hui, dans l'ordre. */
export async function creneauxDisponibles(frais = false): Promise<Creneau[]> {
  const pris = await creneauxPris(frais);
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
  const dispo = await creneauxDisponibles(true);
  const cle = cleCreneau(c);
  return dispo.some((d) => cleCreneau(d) === cle);
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
