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
