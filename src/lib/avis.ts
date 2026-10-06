// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import { timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import type { Product } from "./products.ts";
import { ADRESSE_AVIS, ADRESSE_AVIS_LISIBLE } from "./avis-lien.ts";

/**
 * La demande d'avis, envoyée une seule fois par commande, une dizaine de jours
 * après la livraison.
 *
 * Le but : que les vrais clients de l'atelier donnent leur avis sur Google, en
 * toute liberté. Donc, dans ce fichier comme dans le texte du mail :
 *  — UN seul message, jamais de relance ;
 *  — aucune contrepartie (ni remise, ni cadeau, ni tirage au sort : c'est
 *    interdit par Google et par la loi, art. L121-4 du code de la consommation) ;
 *  — aucune pression, aucune note suggérée : « dites ce que vous en pensez » ;
 *  — le même lien pour tout le monde, satisfait ou non.
 *
 * Il n'y a pas de base de données : les commandes SONT chez Stripe (comme
 * l'écran de l'atelier, voir commandes-atelier.ts). La trace de l'envoi est
 * écrite dans les métadonnées du PaymentIntent, clé « avis_demande_le ».
 *
 * Ce fichier est PUR (ni réseau, ni « server-only ») : la route
 * /api/cron/avis lui passe les commandes lues chez Stripe et deux fonctions,
 * envoyer et marquer ; les tests lui passent les leurs.
 */

export const JOUR_MS = 24 * 60 * 60 * 1000;

/** Le mail part une dizaine de jours après la livraison : le temps de vivre avec la pièce. */
export const JOURS_APRES_LIVRAISON = 10;

/** Le délai de fabrication quand la fiche n'en donne pas (« délai confirmé avec le devis »). */
export const SEMAINES_PAR_DEFAUT = 8;

/** Les commandes relues à chaque passage : celles payées dans les 120 derniers jours. */
export const FENETRE_JOURS = 120;

/**
 * Une commande « expédiée » (ou prête à poser, prête à retirer) sur l'écran de
 * l'atelier n'est pas encore chez le client : on lui laisse une semaine pour
 * arriver, être posée ou retirée.
 */
export const JOURS_APRES_EXPEDITION = 7;

/** Au plus tant de mails par passage ; le reste part le lendemain. */
export const ENVOIS_PAR_PASSAGE = 20;

/** La clé posée dans les métadonnées du PaymentIntent. */
export const CLE_AVIS = "avis_demande_le";

/* ------------------------------------------------------------------ *
 *  Le délai de fabrication, lu sur les fiches du catalogue
 * ------------------------------------------------------------------ */

/**
 * Le délai de fabrication le plus long d'une fiche, en semaines, tel qu'il est
 * écrit à sa ligne « Fabrication » : « comptez 6 à 8 semaines » donne 8,
 * « comptez 4 semaines » donne 4. Null quand la fiche n'en donne pas.
 */
export function semainesFabrication(product: Pick<Product, "specs">): number | null {
  const ligne = product.specs.find((spec) => spec.label === "Fabrication" || spec.label === "Lead time");
  const trouve = ligne?.value.match(/(\d+)(?:\s*(?:à|to|-)\s*(\d+))?\s*(?:semaines|weeks)/);
  if (!trouve) return null;
  return Math.max(Number(trouve[1]), Number(trouve[2] ?? 0));
}

/**
 * Le délai d'une commande : celui de sa pièce la plus longue à fabriquer (une
 * table et deux chaises arrivent ensemble, avec la table). Une fiche sans
 * délai écrit compte pour SEMAINES_PAR_DEFAUT.
 */
export function semainesCommande(pieces: Pick<Product, "specs">[]): number {
  if (pieces.length === 0) return SEMAINES_PAR_DEFAUT;
  return Math.max(...pieces.map((piece) => semainesFabrication(piece) ?? SEMAINES_PAR_DEFAUT));
}

/* ------------------------------------------------------------------ *
 *  Une commande, vue de la demande d'avis
 * ------------------------------------------------------------------ */

export type CommandeAvis = {
  sessionId: string;
  /** Le PaymentIntent, où la trace de l'envoi est écrite. Vide s'il est illisible. */
  paiementId: string;
  reference: string;
  email: string;
  locale: "fr" | "en";
  /** Le jour du paiement, en millisecondes. */
  payeLe: number;
  /** La fabrication la plus longue de la commande, en semaines. */
  semaines: number;
  /** Une commande de pièces (et pas une prise de cotes seule). */
  avecPieces: boolean;
  /** L'état posé sur l'écran de l'atelier (recue, fabrication, expediee, livree), ou "". */
  statut: string;
  /** Quand cet état a été posé, en millisecondes. */
  statutLe: number | null;
  /** La valeur de « avis_demande_le » : "" tant que rien n'est parti. */
  avisDemande: string;
  payee: boolean;
  rembourseeOuAnnulee: boolean;
};

function objet<T extends { id: string }>(valeur: string | T | null | undefined): T | null {
  return valeur && typeof valeur !== "string" ? valeur : null;
}

/**
 * Lit une session de paiement Stripe, PaymentIntent et dernier paiement
 * développés (expand: data.payment_intent, data.payment_intent.latest_charge).
 */
export function lireCommande(session: Stripe.Checkout.Session): CommandeAvis {
  const paiement = objet(session.payment_intent);
  const charge = objet(paiement?.latest_charge);
  const meta = session.metadata ?? {};
  const metaPaiement = paiement?.metadata ?? {};

  // Écrit par /api/commande au moment du paiement, depuis les fiches du
  // catalogue. Absent (commande plus ancienne) : le délai par défaut.
  const semainesNotees = Number(meta.fabrication_semaines);
  const semaines =
    Number.isInteger(semainesNotees) && semainesNotees > 0 && semainesNotees <= 52 ? semainesNotees : SEMAINES_PAR_DEFAUT;

  const statutLe = Date.parse(metaPaiement.statut_le ?? "");

  return {
    sessionId: session.id,
    paiementId: paiement?.id ?? "",
    reference: meta.order_ref ?? session.id,
    email: session.customer_details?.email?.trim() ?? "",
    locale: meta.locale === "en" ? "en" : "fr",
    payeLe: (charge?.created ?? paiement?.created ?? session.created) * 1000,
    semaines,
    // Des pièces = une façon de les recevoir (transporteur, pose ou retrait).
    // Une prise de cotes seule n'en a pas : le devis suit, rien n'est livré.
    avecPieces: Boolean(meta.fabrication_semaines || meta.livraison_mode),
    statut: metaPaiement.statut ?? "",
    statutLe: Number.isFinite(statutLe) ? statutLe : null,
    avisDemande: (metaPaiement[CLE_AVIS] ?? "").trim(),
    payee: session.payment_status === "paid" && paiement?.status === "succeeded",
    rembourseeOuAnnulee:
      paiement?.status === "canceled" ||
      Boolean(charge?.refunded) ||
      (charge?.amount_refunded ?? 0) > 0 ||
      Boolean(charge?.disputed),
  };
}

/* ------------------------------------------------------------------ *
 *  Quand envoyer
 * ------------------------------------------------------------------ */

/**
 * Le jour où la demande peut partir, en millisecondes, ou null s'il faut
 * attendre sans pouvoir dire jusqu'à quand.
 *
 *  — Par défaut : paiement + fabrication la plus longue + 10 jours. C'est la
 *    livraison estimée, plus dix jours. Le retrait à l'atelier compte comme
 *    une livraison, la pose aussi.
 *  — Quentin a coché « Livrée » (ou « Posée », « Retirée ») : 10 jours après,
 *    même si c'est plus tôt que prévu.
 *  — « Expédiée » (ou « Prête à poser », « Prête à retirer ») : pas avant une
 *    semaine plus 10 jours après, même si l'estimation est passée — une pièce
 *    en retard ne reçoit pas de demande d'avis avant d'être arrivée.
 *  — « En fabrication » : la pièce n'est pas finie, on attend la suite.
 */
export function dateEnvoiAvis(
  commande: Pick<CommandeAvis, "payeLe" | "semaines" | "statut" | "statutLe">
): number | null {
  const { payeLe, semaines, statut, statutLe } = commande;
  if (statut === "livree" && statutLe !== null) return statutLe + JOURS_APRES_LIVRAISON * JOUR_MS;
  if (statut === "fabrication") return null;
  const estimee = payeLe + semaines * 7 * JOUR_MS + JOURS_APRES_LIVRAISON * JOUR_MS;
  if (statut === "expediee" && statutLe !== null) {
    return Math.max(estimee, statutLe + (JOURS_APRES_EXPEDITION + JOURS_APRES_LIVRAISON) * JOUR_MS);
  }
  return estimee;
}

export type RaisonAvis =
  | "a_envoyer"
  | "pas_payee"
  | "remboursee"
  | "sans_paiement"
  | "deja_demande"
  | "sans_piece"
  | "sans_email"
  | "en_fabrication"
  | "pas_encore";

/** Où en est la demande d'avis d'une commande, à l'instant `maintenant`. */
export function etatAvis(commande: CommandeAvis, maintenant: number): { raison: RaisonAvis; date: number | null } {
  if (!commande.payee) return { raison: "pas_payee", date: null };
  // Remboursée, même en partie, annulée ou contestée : on ne demande rien.
  if (commande.rembourseeOuAnnulee) return { raison: "remboursee", date: null };
  if (!commande.paiementId) return { raison: "sans_paiement", date: null };
  // Déjà partie — ou refusée par le client (« non », posé à la main dans Stripe).
  if (commande.avisDemande) return { raison: "deja_demande", date: null };
  if (!commande.avecPieces) return { raison: "sans_piece", date: null };
  if (!commande.email) return { raison: "sans_email", date: null };
  const date = dateEnvoiAvis(commande);
  if (date === null) return { raison: "en_fabrication", date: null };
  if (date > maintenant) return { raison: "pas_encore", date };
  return { raison: "a_envoyer", date };
}

/* ------------------------------------------------------------------ *
 *  Le mail
 * ------------------------------------------------------------------ */

export type MailAvis = { subject: string; text: string; html: string };

const TEXTES = {
  fr: {
    objet: (ref: string) => `Votre commande ${ref} vous plaît ?`,
    bonjour: "Bonjour,",
    espoir: (ref: string) => `J'espère que votre commande ${ref} vous plaît.`,
    demande:
      "Si vous en avez envie, et deux minutes devant vous, vous pouvez laisser un avis sur la fiche Google de l'atelier. Dites simplement ce que vous en pensez, en toute franchise : c'est ce qui aide le plus les personnes qui hésitent.",
    bouton: "Laisser un avis",
    lien: (adresse: string) => `Laisser un avis : ${adresse}`,
    unSeul: "Un seul message : vous ne recevrez rien d'autre de notre part à ce sujet.",
    question: "Pour toute question sur votre commande, répondez simplement à cet e-mail.",
    merci: "Merci,",
    atelier: "Auboiacier, atelier à Saumur",
  },
  en: {
    objet: (ref: string) => `Are you happy with your order ${ref}?`,
    bonjour: "Hello,",
    espoir: (ref: string) => `I hope you are enjoying your order ${ref}.`,
    demande:
      "If you feel like it and have two minutes, you can leave a review on the workshop's Google page. Just say what you think, honestly: that is what helps people who are still making up their minds.",
    bouton: "Leave a review",
    lien: (adresse: string) => `Leave a review: ${adresse}`,
    unSeul: "Just this one message: you will not hear from us about this again.",
    question: "For any question about your order, simply reply to this e-mail.",
    merci: "Thank you,",
    atelier: "Auboiacier, workshop in Saumur",
  },
} as const;

function echapper(texte: string) {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Le mail de demande d'avis : court, personnel, signé Quentin. Le bouton
 * mène à https://auboiacier.fr/avis, qui renvoie au lien d'avis de Google.
 */
export function mailAvis(commande: Pick<CommandeAvis, "reference" | "locale">): MailAvis {
  const t = TEXTES[commande.locale];
  const ref = commande.reference;
  const text = [
    t.bonjour,
    "",
    t.espoir(ref),
    "",
    t.demande,
    "",
    t.lien(ADRESSE_AVIS),
    "",
    t.unSeul,
    t.question,
    "",
    t.merci,
    "Quentin",
    t.atelier,
  ].join("\n");

  const p = (contenu: string, style = "") =>
    `<p style="margin:0 0 16px;${style}">${contenu}</p>`;
  const html = [
    `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#2b2320;max-width:520px">`,
    p(echapper(t.bonjour)),
    p(echapper(t.espoir(ref))),
    p(echapper(t.demande)),
    `<p style="margin:24px 0">`,
    `<a href="${ADRESSE_AVIS}" style="display:inline-block;background:#2b2320;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;padding:14px 28px;border-radius:999px">${echapper(t.bouton)}</a>`,
    `</p>`,
    p(`<a href="${ADRESSE_AVIS}" style="color:#5c5140">${ADRESSE_AVIS_LISIBLE}</a>`, "font-size:14px"),
    p(`${echapper(t.unSeul)}<br>${echapper(t.question)}`, "font-size:14px;color:#5c5140"),
    p(`${echapper(t.merci)}<br>Quentin<br><span style="color:#726757">${echapper(t.atelier)}</span>`),
    `</div>`,
  ].join("");

  return { subject: t.objet(ref), text, html };
}

/* ------------------------------------------------------------------ *
 *  Le passage quotidien
 * ------------------------------------------------------------------ */

/**
 * La porte de /api/cron/avis : Vercel Cron envoie « Authorization: Bearer »
 * suivi de CRON_SECRET. Sans secret réglé, tout est refusé.
 */
export function cronAutorise(entete: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !secret.trim() || !entete) return false;
  const recu = Buffer.from(entete);
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

export type BilanAvis = {
  /** Pourquoi rien n'a été tenté, le cas échéant. */
  arret: null | "lien_vide" | "email_non_configure";
  /** Les références des commandes dont le mail est parti. */
  envoyes: string[];
  /** Les références dont le mail n'est pas parti : il repartira au prochain passage. */
  echecs: string[];
  /** Combien de commandes ont été laissées de côté, et pourquoi. */
  ignores: Partial<Record<RaisonAvis | "meme_client", number>>;
};

/**
 * Le passage quotidien : choisit les commandes dont la demande est due et
 * envoie leur mail, une fois chacune.
 *
 * L'ordre compte. La trace (« avis_demande_le ») est écrite AVANT l'envoi : si
 * elle ne peut pas l'être, on n'envoie pas — un mail qui pourrait repartir
 * demain ne part pas aujourd'hui. Si l'envoi échoue, la trace est effacée et
 * le mail repartira au passage suivant.
 *
 * Un client qui a passé deux commandes n'est sollicité qu'une fois : la
 * seconde est marquée « autre-commande » sans mail. Le mail le lui a promis.
 */
export async function demanderLesAvis(contexte: {
  commandes: CommandeAvis[];
  maintenant: number;
  /** Le lien d'avis Google (lienLaisserAvis) : sans lui, rien ne part. */
  lien: string | null;
  /** Resend est-il réglé (isEmailConfigured) ? Sans lui, rien ne part. */
  emailPret: boolean;
  envoyer: (mail: MailAvis, commande: CommandeAvis) => Promise<boolean>;
  /** Écrit (ou efface, avec "") la trace dans le PaymentIntent. */
  marquer: (paiementId: string, valeur: string) => Promise<boolean>;
  maximum?: number;
}): Promise<BilanAvis> {
  const bilan: BilanAvis = { arret: null, envoyes: [], echecs: [], ignores: {} };
  if (!contexte.lien) return { ...bilan, arret: "lien_vide" };
  if (!contexte.emailPret) return { ...bilan, arret: "email_non_configure" };

  const { maintenant } = contexte;
  const maximum = contexte.maximum ?? ENVOIS_PAR_PASSAGE;
  const ignorer = (raison: RaisonAvis | "meme_client") => {
    bilan.ignores[raison] = (bilan.ignores[raison] ?? 0) + 1;
  };

  // Les clients déjà sollicités (ou qui ont dit non), toutes commandes confondues.
  const dejaSollicites = new Set(
    contexte.commandes.filter((c) => c.avisDemande && c.email).map((c) => c.email.toLowerCase())
  );

  const dues: { commande: CommandeAvis; date: number }[] = [];
  const vus = new Set<string>();
  for (const commande of contexte.commandes) {
    const { raison, date } = etatAvis(commande, maintenant);
    if (raison !== "a_envoyer" || date === null) {
      ignorer(raison);
      continue;
    }
    // Deux sessions pour le même paiement : une seule demande.
    if (vus.has(commande.paiementId)) continue;
    vus.add(commande.paiementId);
    dues.push({ commande, date });
  }
  // Les plus anciennes d'abord : ce sont celles qui attendent depuis le plus longtemps.
  dues.sort((a, b) => a.date - b.date);

  const horodatage = new Date(maintenant).toISOString();
  let tentatives = 0;
  for (const { commande } of dues) {
    const email = commande.email.toLowerCase();
    if (dejaSollicites.has(email)) {
      await contexte.marquer(commande.paiementId, "autre-commande");
      ignorer("meme_client");
      continue;
    }
    if (tentatives >= maximum) break;
    tentatives++;

    if (!(await contexte.marquer(commande.paiementId, horodatage))) {
      bilan.echecs.push(commande.reference);
      continue;
    }
    let parti = false;
    try {
      parti = await contexte.envoyer(mailAvis(commande), commande);
    } catch {
      parti = false;
    }
    if (parti) {
      bilan.envoyes.push(commande.reference);
      dejaSollicites.add(email);
    } else {
      bilan.echecs.push(commande.reference);
      await contexte.marquer(commande.paiementId, "");
    }
  }
  return bilan;
}
