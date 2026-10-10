import { NextResponse, after } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { compter, etiquettesOrigine } from "@/lib/compteurs";
import { lireConnu, metadonneesOrigine, nettoyerProvenance } from "@/lib/provenance";
import { getStripe, isStripeConfigured, newOrderRef, piedDeFacture, siteOrigin } from "@/lib/stripe";
import { commandesOuvertes } from "@/lib/entreprise";
import { creerLimite } from "@/lib/limite-debit";
import { origineEtrangere } from "@/lib/origine";
import { budgetCalculGC } from "@/lib/budget-calcul-gc";
import { trouverFiche } from "@/lib/profil-client";
import { PRISE_DE_COTES, libelleLivraison, libellePose, libellePriseDeCotes } from "@/lib/deplacement";
import { cleCreneau, creneauValide, libelleCreneau } from "@/lib/agenda";
import { clientConnecte } from "@/lib/compte";
import { CALCUL_GC, ChiffrageIndisponible } from "@/lib/prix-garde-corps.server";
import { ChiffragePortailIndisponible, prixPortail } from "@/lib/prix-portail.server";
import { libellePiece, tarifer, type Tarif } from "@/lib/tarif-panier";
import { MAX_METADONNEE_STRIPE, nomsStripe } from "@/lib/libelle-stripe";
import { semainesCommande } from "@/lib/avis";
import { libelleGarantieCotes } from "@/lib/garantie-cotes";

export const runtime = "nodejs";
/** Un départ en paiement ne doit jamais rester suspendu plus d'une demi-minute. */
export const maxDuration = 30;

/**
 * 8 départs en paiement par adresse et par dix minutes. Sans cela, un robot
 * crée des milliers de sessions Stripe en quelques secondes : le tableau de
 * bord devient illisible et Stripe finit par brider le compte.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 8 });

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
  // Pas de numéro d'entreprise, pas d'encaissement : même si les clés Stripe
  // sont là, on ne vend pas avant l'immatriculation.
  if (!commandesOuvertes()) {
    return NextResponse.json({ error: "pas_ouvert" }, { status: 503 });
  }

  if (!isStripeConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: {
    locale?: unknown;
    lines?: unknown;
    cgvAccepted?: unknown;
    visiteAvantDelai?: unknown;
    ville?: unknown;
    connu?: unknown;
    provenance?: unknown;
  };
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
  // D'où vient le client : sa réponse (facultative) à « Comment nous avez-vous
  // connu ? » et le lien marqué de son arrivée. Revérifiés ici : seules les
  // valeurs connues passent, et rien de tout cela ne touche au prix.
  const connu = lireConnu(body.connu);
  const provenance = nettoyerProvenance(body.provenance);
  // Le tarif de la commande : LA fonction que le panier appelle aussi pour
  // s'afficher (/api/panier/tarif). Aucun montant n'est lu dans la requête :
  // tout est recalculé ici — pièces, remise sur plusieurs garde-corps (l'outil
  // de plans), livraison, pose ou retrait à l'atelier, prise de cotes.
  let tarif: Tarif;
  // Même budget de temps de calcul que le panier : un panier de garde-corps
  // jamais vus coûte plusieurs secondes au serveur.
  if (budgetCalculGC.epuise(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const debut = performance.now();
  try {
    tarif = await tarifer(body.lines, { locale, gc: CALCUL_GC, portail: prixPortail });
    budgetCalculGC.depenser(request, performance.now() - debut, Date.now());
  } catch (erreur) {
    if (erreur instanceof ChiffrageIndisponible || erreur instanceof ChiffragePortailIndisponible) {
      // Pas de clé du chiffrage sur ce serveur : pas de garde-corps vendu à un prix inventé.
      console.error(`[commande] ${erreur.message} : définir CHIFFRAGE_GARDE_CORPS_CLE.`);
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    throw erreur;
  }
  if (tarif.refusees.length) {
    console.error("[commande] lignes refusées :", tarif.refusees);
    // La hauteur d'un garde-corps a changé depuis l'affichage du panier : il doit la revoir.
    const changee = tarif.refusees.some((r) => r.raison === "hauteur");
    return NextResponse.json({ error: changee ? "changed" : "unavailable" }, { status: 400 });
  }
  if (tarif.probleme) {
    return NextResponse.json({ error: tarif.probleme }, { status: 400 });
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

  /**
   * Murs pas parallèles (Quentin, 10/10/2026) : les deux largeurs de chaque garde-corps, en bas puis à 1 m du sol, telles que le
   * client les a relevées, par rang de ligne (« 0:1180/1172;3:2000/1980 ») — une seule clé, lisible par l'atelier à côté du
   * libellé, qui les porte aussi (« 1 180 / 1 172 × 350 mm »). Rien pour une fenêtre droite.
   */
  const largeursGC: string[] = [];
  for (const piece of tarif.pieces) {
    const releveGC = piece.line.gc?.releve;
    if (releveGC?.largeurHautMm !== undefined && releveGC.largeurHautMm !== releveGC.largeurMm) largeursGC.push(`${items.length}:${releveGC.largeurMm}/${releveGC.largeurHautMm}`);
    items.push({
      price_data: {
        currency: "eur",
        // Les prix du catalogue et de l'outil sont des euros entiers : pas d'arrondi possible.
        unit_amount: Math.round(piece.line.unitPrice * 100),
        product_data: {
          // Les options sont dans le NOM : Stripe ne renvoie pas la description
          // dans les lignes de commande, l'atelier saurait quoi fabriquer.
          name: libellePiece(piece),
          images: piece.line.image ? [`${origin}${piece.line.image}`] : undefined,
        },
      },
      quantity: piece.quantite,
    });
    // La Garantie cotes cochée sur cette pièce : sa ligne à elle, juste en dessous, au prix calculé par tarifer
    // (garantie-cotes.ts) — le navigateur n'a envoyé qu'un oui.
    if (piece.garantie && piece.garantiePrix !== null) {
      items.push({
        price_data: {
          currency: "eur",
          unit_amount: piece.garantiePrix * 100,
          product_data: { name: libelleGarantieCotes(piece.nom, locale) },
        },
        quantity: piece.quantite,
      });
    }
  }
  /** Le nombre de pièces garanties : le bon de commande le dit en tête. */
  const piecesGaranties = tarif.pieces.reduce((n, p) => n + (p.garantie && p.garantiePrix !== null ? p.quantite : 0), 0);
  // Les portails : l'acompte et la visite sont encaissés ici ; le solde (visite déduite) se règle à la réception.
  const portails = tarif.pieces.filter((p) => p.portail);

  // La prise de cotes à domicile : le créneau doit être encore libre à l'instant où l'on paie.
  const visite = tarif.visite;
  if (visite) {
    // Un service, donc 14 jours de rétractation ; la visite a lieu avant leur
    // fin : la demande expresse du client est obligatoire (art. L221-25).
    if (body.visiteAvantDelai !== true) {
      return NextResponse.json({ error: "avant_delai" }, { status: 400 });
    }
    if (!(await creneauValide(visite.creneau))) {
      return NextResponse.json({ error: "rdv" }, { status: 409 });
    }
    items.push({
      price_data: {
        currency: "eur",
        unit_amount: visite.deplacement.montantCents,
        product_data: {
          name: `${libellePriseDeCotes(visite.codePostal, locale)} — ${libelleCreneau(visite.creneau, locale)}${visite.note ? ` — ${visite.note}` : ""}`,
        },
      },
      quantity: 1,
    });
  }

  // Une seule façon de recevoir la commande : le transporteur ou la pose ont
  // leur ligne ; le retrait à l'atelier est gratuit, il n'en a pas — il est
  // noté dans la commande (métadonnées), et dit dans la confirmation.
  const mode = tarif.mode;
  if (mode && mode.mode !== "retrait") {
    items.push({
      price_data: {
        currency: "eur",
        unit_amount: mode.deplacement.montantCents,
        product_data: {
          name: `${mode.mode === "pose" ? libellePose(mode.codePostal, locale) : libelleLivraison(mode.codePostal, locale)} (${mode.deplacement.commune})`,
        },
      },
      quantity: 1,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Stripe refuse un nom de plus de 250 signes, et le paiement avec lui :
  // chaque nom est borné, et le libellé entier d'une ligne coupée part dans
  // les métadonnées, où le bon de commande le relit (libelle-stripe.ts).
  const { noms, entiers } = nomsStripe(items.map((item) => item.price_data.product_data.name));
  items.forEach((item, rang) => {
    item.price_data.product_data.name = noms[rang];
  });

  const orderRef = newOrderRef();

  /**
   * Un client connecté ne retape pas son adresse. On donne son client Stripe
   * à la caisse, et Stripe lui représente ce qu'il avait saisi la fois
   * précédente ; « customer_update » laisse Stripe réenregistrer ce qu'il
   * modifie, faute de quoi une adresse corrigée serait perdue au paiement
   * suivant. C'est la réponse à « mettre ses informations de livraison » :
   * les coordonnées restent chez Stripe, où la politique de confidentialité
   * dit déjà qu'elles sont, et où l'on peut les supprimer.
   */
  let clientStripe: string | null = null;
  try {
    const email = await clientConnecte();
    if (email) {
      // La fiche de l'ESPACE client (celle que lit et corrige la page
      // « Mes informations »), pas simplement la plus récente à cette adresse :
      // n'importe qui peut créer une fiche à l'adresse d'un autre en payant
      // avec elle, et la page de paiement suivante du vrai client aurait été
      // pré-remplie avec l'adresse choisie par l'autre.
      clientStripe = (await trouverFiche(email))?.id ?? null;
    }
  } catch (error) {
    // Un pré-remplissage raté ne doit pas empêcher d'acheter : on continue
    // exactement comme pour un visiteur de passage.
    console.error("[commande] pré-remplissage impossible :", error);
  }
  // Mentions légales du bas de facture : vides tant que Quentin n'a pas rempli
  // les variables FACTURE_… (voir .env.example et MISE-EN-LIGNE.md).
  const pied = piedDeFacture();

  /**
   * Plusieurs garde-corps : les frais fixes de l'atelier ne comptent qu'une
   * fois (la remise du tarif, jamais sous le prix plancher). Stripe refuse une
   * ligne négative : la remise part en bon de réduction d'un montant fixe,
   * valable pour cette seule commande (une utilisation, périmé après le délai
   * de la page de paiement). Elle se lit ainsi, en toutes lettres, sur la page
   * de paiement et sur la facture.
   */
  let coupon: string | null = null;
  if (tarif.remise < 0) {
    try {
      const bon = await getStripe().coupons.create({
        amount_off: Math.round(-tarif.remise * 100),
        currency: "eur",
        duration: "once",
        max_redemptions: 1,
        // La page de paiement vit 24 heures : le bon, une de plus.
        redeem_by: Math.floor(Date.now() / 1000) + 25 * 3600,
        name: locale === "en" ? "Several railings" : "Plusieurs garde-corps",
        metadata: { order_ref: orderRef, motif: "plusieurs garde-corps dans la même commande" },
      });
      coupon = bon.id;
    } catch (error) {
      console.error("[commande] Stripe a refusé la remise :", error);
      return NextResponse.json({ error: "error" }, { status: 502 });
    }
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      locale,
      line_items: items,
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      shipping_address_collection: { allowed_countries: ["FR"] },
      phone_number_collection: { enabled: true },
      // Les deux s'excluent : avec un client connu on le désigne, sinon
      // Stripe en crée un — c'est lui qui permettra de retrouver la commande
      // depuis l'espace client, plus tard, par l'adresse e-mail.
      ...(clientStripe
        ? {
            customer: clientStripe,
            customer_update: { shipping: "auto", address: "auto", name: "auto" as const },
          }
        : { customer_creation: "always" as const }),
      /**
       * Une table de 60 kg ne monte pas toute seule au deuxième étage. Ce
       * champ est l'information qui manque vraiment aujourd'hui au bon de
       * commande : elle remonte dans l'e-mail à l'atelier.
       */
      custom_fields: [
        {
          key: "acces",
          label: {
            type: "custom" as const,
            custom:
              locale === "en"
                ? "Floor, door code, truck access"
                : "Étage, code d'entrée, accès camion",
          },
          type: "text" as const,
          optional: true,
          text: { maximum_length: 200 },
        },
      ],
      invoice_creation: {
        enabled: true,
        ...(pied ? { invoice_data: { footer: pied } } : {}),
      },
      client_reference_id: orderRef,
      payment_intent_data: {
        metadata: {
          order_ref: orderRef,
          ...(visite
            ? {
                // Le type « prise de cotes » prend le créneau dans l'agenda (agenda.ts). Une visite seule ne se fabrique pas ;
                // avec un portail (sa visite, payée avec l'acompte), la commande se fabrique : avec_commande la distingue.
                type: PRISE_DE_COTES,
                ...(tarif.pieces.length > 0 ? { avec_commande: "1" } : {}),
                rdv: cleCreneau(visite.creneau),
                cp: visite.codePostal,
                commune: visite.deplacement.commune,
                note: visite.note,
              }
            : {}),
        },
      },
      metadata: {
        // Le libellé entier des lignes dont le nom a été coupé (au plus une clé par ligne).
        ...entiers,
        // Les deux largeurs des garde-corps aux murs pas parallèles, par rang de ligne (voir largeursGC plus haut).
        ...(largeursGC.length ? { gc_largeurs: largeursGC.join(";").slice(0, 500) } : {}),
        order_ref: orderRef,
        locale,
        ville,
        ...(visite ? { rdv: cleCreneau(visite.creneau), rdv_cp: visite.codePostal } : {}),
        // Comment la commande part : transporteur, pose ou retrait à l'atelier.
        ...(mode ? { livraison_mode: mode.mode } : {}),
        ...(mode?.mode === "pose" ? { pose_cp: mode.codePostal, pose_commune: mode.deplacement.commune } : {}),
        ...(mode?.mode === "transporteur" ? { livraison_cp: mode.codePostal, livraison_commune: mode.deplacement.commune } : {}),
        ...(mode?.mode === "retrait" ? { retrait: "1" } : {}),
        // La fabrication la plus longue, en semaines, lue sur les fiches : la
        // demande d'avis (src/lib/avis.ts) part dix jours après la livraison
        // estimée, et c'est d'ici qu'elle la connaît.
        ...(tarif.pieces.length ? { fabrication_semaines: String(semainesCommande(tarif.pieces.map((p) => p.line.product))) } : {}),
        // La Garantie cotes : combien de pièces en ont une (chacune a aussi sa ligne).
        ...(piecesGaranties > 0 ? { garantie_cotes: String(piecesGaranties) } : {}),
        // Un portail : le solde à la réception, et sa configuration (à coller dans l'outil de plans) — une clé par portail.
        ...(tarif.soldePortail !== null ? { portail_solde: String(tarif.soldePortail), portail_reception: tarif.receptionsPortail.join(",") } : {}),
        ...Object.fromEntries(portails.map((p, i) => [`portail_cfg_${i}`, `${p.line.product.slug}?${p.portail!.config}`.slice(0, MAX_METADONNEE_STRIPE)])),
        // La remise sur plusieurs garde-corps, en euros : elle se lit aussi sur le bon de réduction.
        ...(tarif.remise < 0 ? { remise_gc: String(-tarif.remise) } : {}),
        // L'origine du client (connu, utm_…, annonce_google) : le bon de
        // commande la recopie, les compteurs l'additionnent.
        ...metadonneesOrigine(connu, provenance),
        // Trace de l'acceptation des conditions de vente avant paiement.
        cgv_accepted: "1",
        // Et, pour une visite, de la demande de l'exécuter avant la fin du délai de rétractation.
        ...(visite ? { visite_avant_delai: "1" } : {}),
      },
      // Une visite à domicile tient une demi-journée de l'agenda : la page de
      // paiement ne reste pas ouverte 24 heures (le défaut de Stripe) mais 30
      // minutes, le minimum, pour qu'un onglet oublié ne permette pas de payer
      // demain un créneau vendu entre-temps à quelqu'un d'autre.
      ...(visite ? { expires_at: Math.floor(Date.now() / 1000) + 30 * 60 } : {}),
      success_url: `${origin}/${locale}/commande/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/panier`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "error" }, { status: 502 });
    }
    // Un départ en paiement de plus au compteur (le client peut encore renoncer chez Stripe).
    after(() => compter("depart_paiement", etiquettesOrigine(connu, provenance), request));
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[commande] Stripe a refusé la session :", error);
    return NextResponse.json({ error: "error" }, { status: 502 });
  }
}
