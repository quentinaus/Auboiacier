import { NextResponse } from "next/server";
import { remiseLot, resolveSelection, type Product } from "@/lib/products";
import { isEmailConfigured } from "@/lib/email";
import { getStripe, isStripeConfigured, newOrderRef, piedDeFacture, siteOrigin } from "@/lib/stripe";
import { creerLimite } from "@/lib/limite-debit";
import { origineEtrangere } from "@/lib/origine";
import { productLocalise } from "@/lib/products";
import {
  LIVRAISON,
  POSE,
  PRISE_DE_COTES,
  calculerDeplacement,
  calculerLivraison,
  calculerPose,
  libelleLivraison,
  libellePose,
  libellePriseDeCotes,
} from "@/lib/deplacement";
import { cleCreneau, creneauValide, libelleCreneau, lireCreneau } from "@/lib/agenda";

export const runtime = "nodejs";
/** Un départ en paiement ne doit jamais rester suspendu plus d'une demi-minute. */
export const maxDuration = 30;

const MAX_LINES = 20;
const MAX_QUANTITY = 10;

/**
 * 8 départs en paiement par adresse et par dix minutes. Sans cela, un robot
 * crée des milliers de sessions Stripe en quelques secondes : le tableau de
 * bord devient illisible et Stripe finit par brider le compte.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 8 });

type IncomingLine = {
  slug?: unknown;
  sizeId?: unknown;
  woodId?: unknown;
  metalId?: unknown;
  fabricId?: unknown;
  remplissageId?: unknown;
  largeurMm?: unknown;
  hauteurMm?: unknown;
  epaisseurMm?: unknown;
  quantity?: unknown;
  priseDeCotesCp?: unknown;
  poseCp?: unknown;
  livraisonCp?: unknown;
  rdv?: unknown;
  note?: unknown;
};

/** La part encaissée à la commande quand le client choisit l'acompte. */
const TAUX_ACOMPTE = 0.4;

/** Une ligne de texte libre du client, bornée et sans retour à la ligne. */
const asNote = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/[\r\n\t\u0000-\u001f]+/g, " ").trim().slice(0, max)
    : "";

const asId = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Une cote : un entier de millimètres, rien d'autre. Le reste est refusé. */
const asMm = (value: unknown) => {
  const mm = Number(value);
  return Number.isInteger(mm) && mm > 0 && mm <= 10_000 ? mm : undefined;
};

/**
 * Crée une session de paiement Stripe.
 * Le navigateur n'envoie QUE des identifiants : aucun prix n'est accepté en
 * entrée, tout est recalculé ici depuis le catalogue.
 */
export async function POST(request: Request) {
  // Un site tiers ne doit pas pouvoir ouvrir des paiements par le navigateur
  // de ses visiteurs : refusé avant même de compter le passage.
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers: { "retry-after": "600" } });
  }

  // Les trois clés (clé secrète Stripe, secret du webhook, clé Resend) doivent
  // être là. Il en manque une et on n'encaisse pas : une commande payée que
  // personne ne reçoit serait pire que pas de commande du tout.
  if (!isStripeConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: { locale?: unknown; lines?: unknown; cgvAccepted?: unknown; ville?: unknown; acompte?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "fr";
  // La ville, demandée au panier : elle est recopiée sur la commande Stripe
  // pour que le bon de commande la porte dès la première ligne. Une seule
  // ligne, jamais un en-tête d'e-mail à rallonge.
  const ville =
    typeof body.ville === "string"
      ? body.ville.replace(/[\r\n\t]+/g, " ").trim().slice(0, 80)
      : "";
  if (!ville) {
    return NextResponse.json({ error: "ville" }, { status: 400 });
  }
  if (body.cgvAccepted !== true) {
    return NextResponse.json({ error: "cgv" }, { status: 400 });
  }
  /**
   * L'acompte : 40 % encaissés aujourd'hui, la carte enregistrée, le solde
   * prélevé par l'atelier à la livraison ou à la pose. Le client l'a choisi
   * d'une case explicite ; c'est aussi écrit dans les conditions de vente.
   */
  const acompte = body.acompte === true;
  const lines = Array.isArray(body.lines) ? (body.lines as IncomingLine[]) : [];
  if (lines.length === 0 || lines.length > MAX_LINES) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // L'adresse du site ne se déduit jamais de la requête : une requête forgée
  // avec « Host: site-pirate.fr » fabriquait une vraie page de paiement
  // Auboiacier dont le retour, après paiement, atterrissait chez le pirate.
  const origin = siteOrigin();
  const items: {
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description?: string; images?: string[] };
    };
    quantity: number;
  }[] = [];

  /** Le rendez-vous de la commande, s'il y en a un : il part dans le paiement. */
  let visite: { rdv: string; cp: string; commune: string; note: string } | null = null;
  /** Une seule pose par commande : tout part sur le même trajet. */
  let pose: { cp: string; commune: string } | null = null;
  /** Une seule livraison par transporteur, et pas en plus d'une pose. */
  let livraison: { cp: string; commune: string } | null = null;
  /**
   * Les pièces, gardées de côté jusqu'à la fin : le prix de lot (plusieurs
   * garde-corps dans la même commande) ne se connaît qu'une fois toutes les
   * lignes lues.
   */
  const pieces: { product: Product; unitPrice: number; quantity: number; name: string; image?: string }[] = [];

  for (const line of lines) {
    // {"lines":[null]} faisait planter la lecture juste en dessous, hors du
    // bloc try : le visiteur recevait une page d'erreur du serveur.
    if (!line || typeof line !== "object") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    // La livraison par transporteur : une ligne à part, au code postal du
    // client et aux cotes du colis, recalculée ici. Une seule par commande,
    // et jamais avec une pose (qui livre déjà).
    if (line.slug === LIVRAISON) {
      if (livraison || pose) return NextResponse.json({ error: "invalid" }, { status: 400 });
      const cp = asNote(line.livraisonCp, 10);
      const cote = (valeur: unknown, defaut: number) =>
        typeof valeur === "number" && Number.isFinite(valeur) && valeur > 0 && valeur <= 10000 ? Math.round(valeur) : defaut;
      const calcul = await calculerLivraison(cp, {
        longueurMm: cote(line.largeurMm, 2000),
        largeurMm: cote(line.hauteurMm, 1000),
        epaisseurMm: cote(line.epaisseurMm, 35),
      });
      if (!calcul.ok) return NextResponse.json({ error: "code_postal" }, { status: 400 });
      livraison = { cp, commune: calcul.deplacement.commune };
      items.push({
        price_data: {
          currency: "eur",
          unit_amount: calcul.deplacement.montantCents,
          product_data: { name: `${libelleLivraison(cp, locale)} (${calcul.deplacement.commune})` },
        },
        quantity: 1,
      });
      continue;
    }

    // La livraison et pose à domicile : une ligne à part, au code postal du
    // client, recalculée ici — le navigateur n'a envoyé aucun montant. Une
    // seule par commande : l'atelier fait un trajet, pas un par table.
    if (line.slug === POSE) {
      if (pose || livraison) return NextResponse.json({ error: "invalid" }, { status: 400 });
      const cp = asNote(line.poseCp, 10);
      const calcul = await calculerPose(cp);
      if (!calcul.ok) return NextResponse.json({ error: "code_postal" }, { status: 400 });
      pose = { cp, commune: calcul.deplacement.commune };
      items.push({
        price_data: {
          currency: "eur",
          unit_amount: calcul.deplacement.montantCents,
          product_data: { name: `${libellePose(cp, locale)} (${calcul.deplacement.commune})` },
        },
        quantity: 1,
      });
      continue;
    }

    // La prise de cotes à domicile : ni catalogue ni barème. Le prix vient du
    // code postal, recalculé ici — le navigateur n'en a envoyé aucun — et le
    // créneau doit être encore libre à l'instant où l'on paie.
    if (line.slug === PRISE_DE_COTES) {
      if (visite) return NextResponse.json({ error: "rdv" }, { status: 400 });
      const cp = asNote(line.priseDeCotesCp, 10);
      const creneau = lireCreneau(asNote(line.rdv, 30));
      if (!creneau) return NextResponse.json({ error: "rdv" }, { status: 400 });
      const deplacement = await calculerDeplacement(cp);
      if (!deplacement.ok) return NextResponse.json({ error: "code_postal" }, { status: 400 });
      if (!(await creneauValide(creneau))) {
        return NextResponse.json({ error: "rdv" }, { status: 409 });
      }
      const note = asNote(line.note, 160);
      visite = { rdv: cleCreneau(creneau), cp, commune: deplacement.deplacement.commune, note };
      items.push({
        price_data: {
          currency: "eur",
          unit_amount: deplacement.deplacement.montantCents,
          product_data: {
            name: `${libellePriseDeCotes(cp, locale)} — ${libelleCreneau(creneau, locale)}${note ? ` — ${note}` : ""}`,
          },
        },
        quantity: 1,
      });
      continue;
    }

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const resolved = resolveSelection({
      slug: String(line.slug ?? ""),
      sizeId: asId(line.sizeId),
      woodId: asId(line.woodId),
      metalId: asId(line.metalId),
      fabricId: asId(line.fabricId),
      remplissageId: asId(line.remplissageId),
      largeurMm: asMm(line.largeurMm),
      hauteurMm: asMm(line.hauteurMm),
      epaisseurMm: asMm(line.epaisseurMm),
      locale,
    });

    if (!resolved.ok) {
      console.error("[commande] ligne refusée :", resolved.reason, line);
      return NextResponse.json({ error: "unavailable" }, { status: 400 });
    }

    const { product, unitPrice, optionsLabel, image, size, wood, metal, fabric, remplissage } = resolved.line;
    const precisions = asNote(line.note, 120);
    // Ce libellé part sur la page de paiement, sur la facture Stripe et dans
    // l'e-mail de confirmation : il doit être écrit dans la langue du client.
    // Un Anglais payait « Escalier Limon Central — Chêne massif · Noir charbon ».
    const fiche = productLocalise(product, locale);
    const rangTaille = product.sizes.findIndex((taille) => taille.id === size.id);
    const optionsTraduites =
      [
        product.sizes.length > 1 || size.id === "sur-mesure"
          ? rangTaille >= 0
            ? fiche.sizes[rangTaille].label
            : size.label
          : null,
        fiche.woods.find((bois) => bois.id === wood?.id)?.label,
        fiche.metals.find((acier) => acier.id === metal?.id)?.label,
        fiche.fabrics?.find((velours) => velours.id === fabric?.id)?.label,
        remplissage && remplissage.id !== fiche.remplissages?.[0]?.id
          ? fiche.remplissages?.find((option) => option.id === remplissage.id)?.label
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || optionsLabel;
    pieces.push({
      product,
      unitPrice,
      quantity,
      // Les options sont dans le NOM : Stripe ne renvoie pas la description
      // dans les lignes de commande, l'atelier saurait quoi fabriquer.
      name: `${optionsTraduites ? `${fiche.name} — ${optionsTraduites}` : fiche.name}${
        precisions ? ` — ${precisions}` : ""
      }`,
      image,
    });
  }

  for (const piece of remiseLot(pieces)) {
    items.push({
      price_data: {
        currency: "eur",
        // Les prix du catalogue sont des euros entiers, le prix de lot aussi :
        // pas d'arrondi possible.
        unit_amount: piece.prixLot * 100,
        product_data: {
          name: piece.remise
            ? `${piece.name} — ${locale === "en" ? "multi-buy" : "prix de lot"} −${Math.round(piece.remise * 100)} %`
            : piece.name,
          images: piece.image ? [`${origin}${piece.image}`] : undefined,
        },
      },
      quantity: piece.quantity,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const orderRef = newOrderRef();
  // Mentions légales du bas de facture : vides tant que Quentin n'a pas rempli
  // les variables FACTURE_… (voir .env.example et MISE-EN-LIGNE.md).
  const pied = piedDeFacture();

  // Le total réel de la commande, avant tout acompte : c'est lui qui va sur
  // le bon de commande, et c'est de lui que se déduit le solde.
  const totalCents = items.reduce((somme, item) => somme + item.price_data.unit_amount * item.quantity, 0);
  let acompteCents = 0;
  if (acompte) {
    // Chaque ligne est ramenée à 40 %, au centime près ; le solde, c'est le
    // reste, calculé une fois pour que les arrondis ne fassent perdre rien.
    for (const item of items) {
      item.price_data.unit_amount = Math.round(item.price_data.unit_amount * TAUX_ACOMPTE);
      item.price_data.product_data.name = `${item.price_data.product_data.name} — ${
        locale === "en" ? "40% deposit" : "acompte de 40 %"
      }`;
    }
    acompteCents = items.reduce((somme, item) => somme + item.price_data.unit_amount * item.quantity, 0);
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      locale,
      line_items: items,
      shipping_address_collection: { allowed_countries: ["FR"] },
      phone_number_collection: { enabled: true },
      customer_creation: "always",
      invoice_creation: {
        enabled: true,
        ...(pied ? { invoice_data: { footer: pied } } : {}),
      },
      client_reference_id: orderRef,
      payment_intent_data: {
        // Avec un acompte, la carte est gardée pour le solde : Stripe le dit
        // au client sur sa page, et l'atelier prélève ensuite depuis son
        // tableau de bord (client → moyen de paiement enregistré).
        ...(acompte ? { setup_future_usage: "off_session" as const } : {}),
        metadata: {
          order_ref: orderRef,
          ...(acompte ? { acompte: "1", total_cents: String(totalCents), solde_cents: String(totalCents - acompteCents) } : {}),
          ...(visite
            ? { type: PRISE_DE_COTES, rdv: visite.rdv, cp: visite.cp, commune: visite.commune, note: visite.note }
            : {}),
        },
      },
      metadata: {
        order_ref: orderRef,
        locale,
        ville,
        ...(visite ? { rdv: visite.rdv, rdv_cp: visite.cp } : {}),
        ...(pose ? { pose_cp: pose.cp, pose_commune: pose.commune } : {}),
        ...(livraison ? { livraison_cp: livraison.cp, livraison_commune: livraison.commune } : {}),
        ...(acompte ? { acompte: "1", total_cents: String(totalCents), solde_cents: String(totalCents - acompteCents) } : {}),
        // Trace de l'acceptation des conditions de vente avant paiement.
        cgv_accepted: "1",
      },
      success_url: `${origin}/${locale}/commande/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/panier`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "error" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[commande] Stripe a refusé la session :", error);
    return NextResponse.json({ error: "error" }, { status: 502 });
  }
}
