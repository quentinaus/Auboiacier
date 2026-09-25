// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { emetteurDevis, type Acceptation, type Devis, type LigneDevis } from "./devis.ts";
import type { Locale } from "./i18n.ts";

/**
 * La confirmation de commande : le document que l'acheteur reçoit APRÈS avoir
 * payé, à la place de la case « Bon pour accord » restée vide sur son devis.
 *
 * Trois règles commandent tout ce fichier.
 *
 * 1. TOUT VIENT DE STRIPE. Le montant imprimé est `amount_total`, celui qui a
 *    réellement quitté la carte — jamais un prix recalculé depuis le
 *    catalogue. Sans cela, une hausse de tarif un mois plus tard ferait dire
 *    au document un montant que le client n'a jamais payé.
 *
 * 2. LE DOCUMENT EST REPRODUCTIBLE. Rien n'y dépend de l'instant où on le
 *    fabrique : la date est celle de la commande (`session.created`), pas
 *    celle du jour. Régénéré dans six mois, il sort identique — c'est ce qui
 *    donne un sens à l'empreinte.
 *
 * 3. ON N'ÉCRIT PAS « SIGNÉ ». Le client n'a pas apposé de signature
 *    électronique au sens de l'article 1367 du code civil. Il a accepté les
 *    conditions puis payé l'intégralité par carte, ce qui est une preuve
 *    d'engagement plus forte qu'une case cochée. Le document dit donc ce qui
 *    s'est vraiment passé : commande acceptée et payée, tel jour, à telle
 *    heure, pour tel montant, sous tel numéro de transaction.
 */

const TEXTES = {
  fr: {
    delai: "le délai indiqué sur la fiche de votre pièce (3 à 12 semaines)",
    conditions: [
      "Commande payée en totalité par carte bancaire, sur auboiacier.fr.",
      "Conditions générales de vente acceptées avant le paiement.",
      "La facture vous est adressée séparément par notre prestataire de paiement.",
      "Ce document tient lieu d'accusé de réception de votre commande.",
    ],
  },
  en: {
    delai: "the lead time shown on your piece's page (3 to 12 weeks)",
    conditions: [
      "Order paid in full by card, on auboiacier.fr.",
      "Terms of sale accepted before payment.",
      "Your invoice is sent separately by our payment provider.",
      "This document serves as acknowledgement of your order.",
    ],
  },
} as const;

export type EntreeConfirmation = {
  session: Stripe.Checkout.Session;
  /** Les lignes complètes, telles que listLineItems les rend. */
  lignes: Stripe.LineItem[];
  /** L'adresse du site, pour le lien de bas de page. */
  origine: string;
};

/** Le nombre de centimes de Stripe, en euros. */
function euros(cents: number | null | undefined) {
  return Math.round(cents ?? 0) / 100;
}

/** La date et l'heure de la commande, à Paris, dans la langue du document. */
function quandLisible(secondes: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(secondes * 1000));
}

/**
 * Le libellé Stripe porte la pièce ET ses options, séparées par « — » (voir
 * /api/commande). On rend la pièce à la désignation et les options aux
 * détails : c'est la forme que le tableau du devis sait présenter.
 */
function decouper(libelle: string): { designation: string; details: string[] } {
  const [designation, ...reste] = libelle.split(" — ");
  return { designation: designation.trim(), details: reste.map((d) => d.trim()).filter(Boolean) };
}

function adresseLisible(adresse: Stripe.Address | null | undefined) {
  if (!adresse) return undefined;
  return (
    [
      adresse.line1,
      adresse.line2,
      [adresse.postal_code, adresse.city].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ") || undefined
  );
}

/**
 * L'empreinte du document : ce qui permettra, un jour, de vérifier qu'un PDF
 * présenté est bien celui qui a été émis. Elle porte sur le CONTENU — qui a
 * commandé quoi, pour quel montant, sous quelle transaction — et non sur les
 * octets du PDF, qui varient d'une version de la bibliothèque à l'autre.
 * Trente-deux signes suffisent : c'est encore 128 bits.
 */
export function empreinteConfirmation(
  contenu: Omit<Devis, "acceptation">,
  transaction: string
): string {
  const canonique = JSON.stringify({
    numero: contenu.numero,
    date: contenu.date,
    client: contenu.client,
    lignes: contenu.lignes,
    total: contenu.total,
    transaction,
  });
  const brute = createHash("sha256").update(canonique, "utf8").digest("hex").slice(0, 32);
  return (brute.match(/.{4}/g) ?? []).join(" ").toUpperCase();
}

/** La confirmation de commande, prête à rendre en PDF. */
export function composerConfirmation({ session, lignes, origine }: EntreeConfirmation): Devis {
  const locale: Locale = session.metadata?.locale === "en" ? "en" : "fr";
  const t = TEXTES[locale];
  const reference = session.metadata?.order_ref ?? session.id;

  const client = session.customer_details;
  const livraison = session.collected_information?.shipping_details ?? null;

  const lignesDevis: LigneDevis[] = lignes.map((item) => {
    const { designation, details } = decouper(item.description ?? "");
    return {
      designation,
      details,
      quantite: item.quantity ?? 1,
      unitaire: euros(item.price?.unit_amount),
      total: euros(item.amount_total),
    };
  });

  // Le titre du document nomme la pièce quand il n'y en a qu'une, et rien du
  // tout quand il y en a plusieurs : le numéro de commande, juste en dessous,
  // le dirait une deuxième fois. Pas de bloc « Votre pièce » non plus — ses
  // caractéristiques (essence, cotes, teinte) ne sont pas chez Stripe, et un
  // encadré à moitié vide vaut moins que le tableau complet qui suit.
  const nomPiece =
    lignesDevis.length === 1 && lignesDevis[0].designation
      ? lignesDevis[0].designation
      : "";

  const contenu: Omit<Devis, "acceptation"> = {
    nature: "confirmation",
    numero: reference,
    date: quandLisible(session.created, locale),
    // Une commande payée ne se périme pas : le champ reste, vide de sens ici,
    // et l'en-tête du PDF ne l'affiche que pour un devis.
    validite: "",
    locale,
    emetteur: emetteurDevis(locale),
    client: {
      nom: livraison?.name ?? client?.name ?? undefined,
      adresse: adresseLisible(livraison?.address ?? client?.address),
      email: client?.email ?? undefined,
      telephone: client?.phone ?? undefined,
    },
    piece: { nom: nomPiece, accroche: "", caracteristiques: [] },
    lignes: lignesDevis,
    total: euros(session.amount_total),
    delai: t.delai,
    conditions: [...t.conditions],
    lienFiche: `${origine}/${locale}/contact`,
  };

  const transaction =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  const acceptation: Acceptation = {
    quand: quandLisible(session.created, locale),
    transaction,
    empreinte: empreinteConfirmation(contenu, transaction),
  };

  return { ...contenu, acceptation };
}
