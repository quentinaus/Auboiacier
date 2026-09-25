// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import type { Locale } from "./i18n.ts";

/**
 * Où en est une commande, de l'atelier jusqu'au salon du client.
 *
 * Ce fichier est PUR : ni Stripe, ni réseau, ni « server-only ». L'écran de
 * l'atelier tourne côté navigateur (ce sont des boutons), la page du client
 * côté serveur, et l'e-mail quelque part entre les deux — les trois doivent
 * parler des mêmes quatre états, avec les mêmes mots.
 *
 * Quatre états, pas cinq. Chacun est une case de plus à cocher pour un
 * artisan qui travaille seul : au-delà, l'écran ne sert plus, et une commande
 * affiche pendant deux mois un état qui ne veut plus rien dire.
 */

export const STATUTS = ["recue", "fabrication", "expediee", "livree"] as const;

export type Statut = (typeof STATUTS)[number];

/** L'état posé tout seul par le paiement : une commande payée est reçue. */
export const STATUT_INITIAL: Statut = "recue";

export function estStatut(valeur: unknown): valeur is Statut {
  return typeof valeur === "string" && (STATUTS as readonly string[]).includes(valeur);
}

/**
 * Les libellés. Une commande posée par l'atelier ne s'« expédie » pas et ne se
 * « livre » pas : elle est prête, puis posée. Le client lit son propre cas,
 * pas un vocabulaire de transporteur.
 */
const LIBELLES: Record<Statut, Record<"livraison" | "pose", Record<Locale, string>>> = {
  recue: {
    livraison: { fr: "Commande reçue", en: "Order received" },
    pose: { fr: "Commande reçue", en: "Order received" },
  },
  fabrication: {
    livraison: { fr: "En fabrication", en: "In the workshop" },
    pose: { fr: "En fabrication", en: "In the workshop" },
  },
  expediee: {
    livraison: { fr: "Expédiée", en: "Shipped" },
    pose: { fr: "Prête à poser", en: "Ready to fit" },
  },
  livree: {
    livraison: { fr: "Livrée", en: "Delivered" },
    pose: { fr: "Posée", en: "Fitted" },
  },
};

/**
 * Ce que le client lit quand on lui annonce le changement. Une phrase, pas un
 * mot : « Expédiée » seul n'apprend rien à quelqu'un qui attend une table
 * depuis six semaines.
 */
const PHRASES: Record<Statut, Record<"livraison" | "pose", Record<Locale, string>>> = {
  recue: {
    livraison: {
      fr: "Nous avons bien reçu votre commande et votre paiement.",
      en: "We have received your order and your payment.",
    },
    pose: {
      fr: "Nous avons bien reçu votre commande et votre paiement.",
      en: "We have received your order and your payment.",
    },
  },
  fabrication: {
    livraison: {
      fr: "Votre pièce est entrée en fabrication à l'atelier.",
      en: "Your piece is now being made in the workshop.",
    },
    pose: {
      fr: "Votre pièce est entrée en fabrication à l'atelier.",
      en: "Your piece is now being made in the workshop.",
    },
  },
  expediee: {
    livraison: {
      fr: "Votre pièce a quitté l'atelier. Le transporteur vous contacte pour convenir de la livraison.",
      en: "Your piece has left the workshop. The carrier will contact you to arrange delivery.",
    },
    pose: {
      fr: "Votre pièce est terminée. Nous vous appelons pour convenir du jour de la pose.",
      en: "Your piece is finished. We will call you to arrange the fitting date.",
    },
  },
  livree: {
    livraison: {
      fr: "Votre pièce vous a été livrée. Merci de votre confiance.",
      en: "Your piece has been delivered. Thank you for your trust.",
    },
    pose: {
      fr: "Votre pièce est posée. Merci de votre confiance.",
      en: "Your piece has been fitted. Thank you for your trust.",
    },
  },
};

export type Contexte = { pose?: boolean; locale?: Locale };

export function libelleStatut(statut: Statut, { pose, locale = "fr" }: Contexte = {}) {
  return LIBELLES[statut][pose ? "pose" : "livraison"][locale];
}

export function phraseStatut(statut: Statut, { pose, locale = "fr" }: Contexte = {}) {
  return PHRASES[statut][pose ? "pose" : "livraison"][locale];
}

/**
 * Faut-il prévenir le client par e-mail ? Coché d'office pour le seul état
 * qui l'intéresse vraiment — sa pièce part — et décoché partout ailleurs.
 * Quatre e-mails pour une table, et le client se désabonne avant la livraison.
 */
export function prevenirParDefaut(statut: Statut): boolean {
  return statut === "expediee";
}

/** Où en est la commande sur la frise, de 0 à 3. */
export function etapeStatut(statut: Statut): number {
  return STATUTS.indexOf(statut);
}
