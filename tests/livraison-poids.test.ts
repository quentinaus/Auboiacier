/**
 * La livraison par transporteur se facture au poids du colis. Un colis de
 * plusieurs pièces (5 chaises dans la même commande) doit peser 5 fois plus
 * qu'une seule — sans quoi la livraison de tout un lot se facturait comme
 * celle d'une seule pièce. C'est arrivé une fois : ces tests gardent la
 * correction en place.
 *
 * Comme pour commande-frontiere.test.ts, les routes ne peuvent pas être
 * appelées ici (Stripe, réseau) : on relit leur vrai code et on le fait
 * tourner tel quel, plutôt qu'une copie qui pourrait diverger en silence.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { tarifLivraison } from "../src/lib/deplacement.ts";

test("le tarif de livraison monte nettement avec le poids du colis", () => {
  // Une chaise (9 kg) contre cinq (45 kg), même distance : la différence de
  // poids doit se voir dans le prix, pas rester invisible.
  const uneChaise = tarifLivraison(0, 9).montantCents;
  const cinqChaises = tarifLivraison(0, 45).montantCents;
  assert.ok(
    cinqChaises > uneChaise + 1000,
    `45 kg (${cinqChaises}) devrait coûter nettement plus que 9 kg (${uneChaise})`
  );
});

/** Récupère une constante numérique déclarée en tête d'un fichier. */
function constante(source: string, nom: string): number {
  const trouve = source.match(new RegExp(`const\\s+${nom}\\s*=\\s*([0-9_]+)\\s*;`));
  assert.ok(trouve, `La constante ${nom} a disparu : mets ce test à jour.`);
  return Number(trouve![1].replace(/_/g, ""));
}

test("/api/commande facture le poids de toutes les pièces livrées, pas d'une seule", () => {
  const route = new URL("../src/app/api/commande/route.ts", import.meta.url);
  const source = readFileSync(route, "utf8");
  const maxQuantite = constante(source, "MAX_QUANTITY");

  // Le poids envoyé à calculerLivraison doit être multiplié par la quantité.
  assert.match(
    source,
    /poidsColisKg\(piece,[\s\S]*?\)\s*\*\s*livraisonQuantite/,
    "le poids de la livraison doit être multiplié par livraisonQuantite"
  );

  const trouve = source.match(/const livraisonQuantite = ([\s\S]*?);/);
  assert.ok(
    trouve,
    "le calcul de livraisonQuantite n'a pas été retrouvé dans /api/commande : mets ce test à jour."
  );
  const calc = new Function("qty", "MAX_QUANTITY", `return ${trouve![1]};`) as (
    qty: number,
    max: number
  ) => number;

  // Une quantité absente, invalide ou hors bornes retombe sur une seule pièce...
  for (const brut of [undefined, null, 0, -1, 1.5, "beaucoup", maxQuantite + 1]) {
    assert.equal(calc(Number(brut), maxQuantite), 1, `${brut} devrait retomber sur 1 pièce`);
  }
  // ...une quantité plausible se retrouve telle quelle.
  for (const q of [1, 2, 5, maxQuantite]) {
    assert.equal(calc(Number(q), maxQuantite), q, `${q} devrait rester ${q}`);
  }
});

test("/api/deplacement (l'aperçu du prix) compte aussi le poids de toutes les pièces", () => {
  const route = new URL("../src/app/api/deplacement/route.ts", import.meta.url);
  const source = readFileSync(route, "utf8");

  assert.match(
    source,
    /poidsColisKg\([\s\S]*?\)\s*\*\s*quantite/,
    "le poids demandé à l'aperçu doit être multiplié par la quantité"
  );

  const trouve = source.match(/const quantite = ([\s\S]*?);/);
  assert.ok(
    trouve,
    "le calcul de la quantité n'a pas été retrouvé dans /api/deplacement : mets ce test à jour."
  );
  const calc = new Function("qty", `return ${trouve![1]};`) as (qty: number) => number;

  for (const brut of [undefined, null, 0, -1, 1.5, "beaucoup", 11]) {
    assert.equal(calc(Number(brut)), 1, `${brut} devrait retomber sur 1 pièce`);
  }
  for (const q of [1, 2, 5, 10]) {
    assert.equal(calc(Number(q)), q, `${q} devrait rester ${q}`);
  }
});
