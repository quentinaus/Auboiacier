import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { composerConfirmation } from "../src/lib/confirmation.ts";

/**
 * La confirmation de commande est un document contractuel : elle doit dire ce
 * que le client a payé, et le redire à l'identique dans six mois. Ces tests
 * gardent les deux promesses.
 */

const ORIGINE = "https://auboiacier.fr";
/** 2 octobre 2026, 14 h 32 à Paris. */
const CREE_LE = 1_790_944_320;

function session(sur: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    created: CREE_LE,
    amount_total: 184_000,
    payment_intent: "pi_test_9",
    metadata: { order_ref: "AB-K7P2X9", locale: "fr", ville: "Saumur", cgv_accepted: "1" },
    customer_details: {
      name: "Camille Bertrand",
      email: "camille@exemple.fr",
      phone: "+33612345678",
      address: null,
    },
    collected_information: {
      shipping_details: {
        name: "Camille Bertrand",
        address: {
          line1: "12 rue des Ponts",
          line2: null,
          postal_code: "49400",
          city: "Saumur",
          country: "FR",
          state: null,
        },
      },
    },
    ...sur,
  } as unknown as Stripe.Checkout.Session;
}

function lignes(sur: Partial<Stripe.LineItem>[] = []): Stripe.LineItem[] {
  const defaut = [
    {
      description: "Table Mikado — Chêne · Noir charbon — 2 200 × 950 × 40 mm",
      quantity: 1,
      amount_total: 174_000,
      price: { unit_amount: 174_000 },
    },
    {
      description: "Livraison par transporteur",
      quantity: 1,
      amount_total: 10_000,
      price: { unit_amount: 10_000 },
    },
  ];
  return (sur.length ? sur : defaut) as unknown as Stripe.LineItem[];
}

test("le montant imprimé est celui payé, jamais un prix recalculé", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.equal(devis.total, 1840, "le total vient de amount_total, en euros");
  assert.equal(devis.lignes[0].total, 1740);
  assert.equal(devis.lignes[0].unitaire, 1740);
});

test("le document se présente comme une confirmation, pas comme un devis", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.equal(devis.nature, "confirmation");
  assert.ok(devis.acceptation, "le bloc d'acceptation remplace la case à signer");
  assert.equal(devis.acceptation?.transaction, "pi_test_9");
  assert.equal(devis.numero, "AB-K7P2X9");
  // Aucune caractéristique : le bloc « Votre pièce » ne s'affiche pas.
  assert.equal(devis.piece.caracteristiques.length, 0);
  assert.equal(devis.piece.photo, undefined);
});

test("le mot « signé » n'apparaît nulle part : le client a payé, il n'a pas signé", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  const tout = JSON.stringify(devis).toLowerCase();
  assert.ok(!tout.includes("signé"), "rien ne doit promettre une signature électronique");
  assert.ok(!tout.includes("signature"));
});

test("la date est celle de la commande, pas celle du jour où l'on régénère", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.match(devis.date, /2026/);
  assert.equal(devis.date, devis.acceptation?.quand);
  // Deux fabrications successives donnent le même document.
  const bis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.equal(devis.acceptation?.empreinte, bis.acceptation?.empreinte);
});

test("l'empreinte change dès qu'un montant change", () => {
  const avant = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  const apres = composerConfirmation({
    session: session({ amount_total: 184_100 }),
    lignes: lignes(),
    origine: ORIGINE,
  });
  assert.notEqual(avant.acceptation?.empreinte, apres.acceptation?.empreinte);
  // Et elle reste lisible à l'œil : huit groupes de quatre signes.
  assert.match(avant.acceptation!.empreinte, /^([0-9A-F]{4} ){7}[0-9A-F]{4}$/);
});

test("les options de la pièce passent aux détails, sous la désignation", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.equal(devis.lignes[0].designation, "Table Mikado");
  assert.deepEqual(devis.lignes[0].details, [
    "Chêne · Noir charbon",
    "2 200 × 950 × 40 mm",
  ]);
  // Une ligne sans option garde sa désignation entière et n'a pas de détail.
  assert.equal(devis.lignes[1].designation, "Livraison par transporteur");
  assert.deepEqual(devis.lignes[1].details, []);
});

test("l'adresse de livraison de Stripe devient l'adresse du client", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.equal(devis.client.nom, "Camille Bertrand");
  assert.equal(devis.client.email, "camille@exemple.fr");
  assert.equal(devis.client.adresse, "12 rue des Ponts, 49400 Saumur");
});

test("une commande anglaise sort un document anglais", () => {
  const devis = composerConfirmation({
    session: session({ metadata: { order_ref: "AB-K7P2X9", locale: "en" } }),
    lignes: lignes(),
    origine: ORIGINE,
  });
  assert.equal(devis.locale, "en");
  assert.ok(devis.conditions.some((c) => c.includes("Terms of sale")));
  assert.ok(devis.lienFiche.endsWith("/en/contact"));
});

test("plusieurs lignes : pas de nom de pièce, le numéro suffit", () => {
  const devis = composerConfirmation({ session: session(), lignes: lignes(), origine: ORIGINE });
  assert.equal(devis.piece.nom, "", "un sous-titre répéterait le numéro écrit juste dessous");
});

test("une seule pièce : le document porte son nom", () => {
  const devis = composerConfirmation({
    session: session(),
    lignes: [
      {
        description: "Plafond lumineux Lucarne — Blanc — 2 330 × 1 200 mm",
        quantity: 1,
        amount_total: 64_000,
        price: { unit_amount: 64_000 },
      },
    ] as unknown as Parameters<typeof composerConfirmation>[0]["lignes"],
    origine: ORIGINE,
  });
  assert.equal(devis.piece.nom, "Plafond lumineux Lucarne");
});

test("sans référence de commande, l'identifiant Stripe fait office de numéro", () => {
  const devis = composerConfirmation({
    session: session({ metadata: {} }),
    lignes: lignes(),
    origine: ORIGINE,
  });
  assert.equal(devis.numero, "cs_test_1");
});

test("plusieurs garde-corps : chaque ligne à son prix, la remise sur sa ligne, et le total payé", () => {
  // Deux garde-corps à 570 €, une livraison à 64 € ; Stripe a appliqué le bon de réduction de 110 €
  // (frais fixes de l'atelier comptés une fois) et réparti la remise sur les lignes.
  const avecRemise = composerConfirmation({
    session: session({
      amount_total: 109_400,
      total_details: { amount_discount: 11_000, amount_shipping: 0, amount_tax: 0 },
      metadata: { order_ref: "AB-K7P2X9", locale: "fr", ville: "Saumur", remise_gc: "110", livraison_mode: "transporteur" },
    }),
    lignes: lignes([
      { description: "Garde-corps de fenêtre Rosace — Sur mesure — 1 180 × 290 mm, 4 croix · Chêne", quantity: 2, amount_subtotal: 114_000, amount_total: 103_595, price: { unit_amount: 57_000 } } as never,
      { description: "Livraison par transporteur — 44000 (Nantes)", quantity: 1, amount_subtotal: 6_400, amount_total: 5_805, price: { unit_amount: 6_400 } } as never,
    ]),
    origine: ORIGINE,
  });
  assert.equal(avecRemise.lignes[0].total, 1140, "la ligne à son prix avant remise, comme sur la facture");
  assert.equal(avecRemise.lignes[1].total, 64);
  const remise = avecRemise.lignes[2];
  assert.equal(remise.designation, "Remise plusieurs garde-corps");
  assert.equal(remise.total, -110);
  assert.equal(avecRemise.total, 1094);
  assert.equal(avecRemise.lignes.reduce((a, l) => a + l.total, 0), avecRemise.total, "les lignes font le total payé");
});

test("retrait à l'atelier : une ligne à 0 € et sa condition, et le document nomme toujours la pièce", () => {
  const retrait = composerConfirmation({
    session: session({ amount_total: 57_000, metadata: { order_ref: "AB-K7P2X9", locale: "en", ville: "Saumur", retrait: "1", livraison_mode: "retrait" } }),
    lignes: lignes([{ description: "Rosette Window Railing — Custom — 1,180 × 290 mm, 4 crosses", quantity: 1, amount_total: 57_000, price: { unit_amount: 57_000 } } as never]),
    origine: ORIGINE,
  });
  assert.equal(retrait.lignes.length, 2);
  assert.equal(retrait.lignes[1].designation, "Collection from the workshop");
  assert.equal(retrait.lignes[1].total, 0);
  assert.equal(retrait.total, 570);
  assert.ok(retrait.conditions.includes("Piece to be collected from the workshop in Saumur, by appointment."));
  assert.equal(retrait.piece.nom, "Rosette Window Railing", "une seule pièce payée : le titre la nomme");
});
