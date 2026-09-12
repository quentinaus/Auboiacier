/**
 * La porte d'entrée de la commande : /api/commande.
 *
 * Deux garde-fous y vivent, avant même le calcul du prix :
 *   — la quantité doit être un entier, entre 1 et un maximum ;
 *   — une cote doit être un entier de millimètres, positif et raisonnable.
 *
 * Ce fichier ne peut pas appeler la route (elle démarre par Stripe et l'e-mail).
 * Il fait autre chose, et c'est volontaire : il RELIT le code de ces deux
 * garde-fous dans le fichier de la route et les fait tourner tels quels. On
 * teste donc le vrai code, pas une copie qui pourrait diverger en silence.
 *
 * Si un jour ces tests ne retrouvent plus les garde-fous, ils échouent avec un
 * message clair : c'est le signal qu'il faut remettre les tests à jour — ou que
 * quelqu'un a retiré une protection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROUTE = new URL("../src/app/api/commande/route.ts", import.meta.url);
const source = readFileSync(ROUTE, "utf8");

/** Récupère une constante numérique déclarée en tête de la route. */
function constante(nom: string): number {
  const trouve = source.match(new RegExp(`const\\s+${nom}\\s*=\\s*([0-9_]+)\\s*;`));
  assert.ok(trouve, `La constante ${nom} a disparu de /api/commande : mets les tests à jour.`);
  return Number(trouve![1].replace(/_/g, ""));
}

test("les bornes de commande sont déclarées, et raisonnables", () => {
  const maxQuantite = constante("MAX_QUANTITY");
  const maxLignes = constante("MAX_LINES");
  assert.ok(
    Number.isInteger(maxQuantite) && maxQuantite >= 1,
    "MAX_QUANTITY doit être un entier d'au moins 1"
  );
  assert.ok(
    Number.isInteger(maxLignes) && maxLignes >= 1,
    "MAX_LINES doit être un entier d'au moins 1"
  );
});

test("une quantité qui n'est pas un entier dans les bornes est refusée", () => {
  const maxQuantite = constante("MAX_QUANTITY");

  // On extrait la condition de refus telle qu'elle est écrite dans la route.
  const trouve = source.match(
    /const quantity = Number\(line\.quantity\);\s*if \(([\s\S]*?)\)\s*\{/
  );
  assert.ok(
    trouve,
    "Le garde-fou sur la quantité n'a pas été retrouvé dans /api/commande : soit il a été retiré, soit les tests sont à remettre à jour."
  );
  const refuse = new Function("quantity", "MAX_QUANTITY", `return Boolean(${trouve![1]});`) as (
    q: unknown,
    max: number
  ) => boolean;

  const aRefuser = [0, -1, 1.5, 0.999, Number.NaN, Number.POSITIVE_INFINITY, maxQuantite + 1, 1e6];
  for (const quantite of aRefuser) {
    assert.equal(
      refuse(quantite, maxQuantite),
      true,
      `la quantité ${quantite} devrait être refusée`
    );
  }
  for (const quantite of [1, 2, maxQuantite]) {
    assert.equal(
      refuse(quantite, maxQuantite),
      false,
      `la quantité ${quantite} devrait être acceptée`
    );
  }
});

test("une cote qui n'est pas un entier de millimètres est refusée", () => {
  // Même méthode : on fait tourner la vraie fonction de la route.
  const trouve = source.match(/const asMm\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\};/);
  assert.ok(
    trouve,
    "Le garde-fou sur les cotes (asMm) n'a pas été retrouvé dans /api/commande : soit il a été retiré, soit les tests sont à remettre à jour."
  );
  const asMm = new Function("value", trouve![1]) as (v: unknown) => number | undefined;

  // Une cote, c'est un entier de millimètres. Rien d'autre n'entre.
  for (const valeur of [
    1200.5,
    "1200,5",
    "1 200",
    "deux mètres",
    "",
    null,
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    0,
    -1200,
    1e9,
    {},
    [],
  ]) {
    assert.equal(
      asMm(valeur),
      undefined,
      `la cote ${JSON.stringify(valeur)} devrait être refusée`
    );
  }

  // Et une vraie cote passe, en nombre comme en texte.
  assert.equal(asMm(1200), 1200);
  assert.equal(asMm("1200"), 1200);
  assert.equal(asMm(1), 1);
});

test("aucun prix venu du navigateur n'est lu par la route", () => {
  // Le panier garde une copie d'affichage du prix ; elle ne doit jamais servir.
  for (const champ of ["unitPrice", "price", "amount", "total", "prix"]) {
    assert.equal(
      new RegExp(`line\\.${champ}\\b`).test(source),
      false,
      `/api/commande lit « line.${champ} » : un prix envoyé par le navigateur ne doit jamais être utilisé`
    );
  }
  // Le montant facturé vient du catalogue, recalculé sur place, puis passé
  // au prix de lot — jamais d'un chiffre envoyé par le navigateur.
  assert.match(
    source,
    /unit_amount:\s*piece\.prixLot\s*\*\s*100/,
    "le montant facturé doit être le prix de lot calculé sur place"
  );
  assert.match(source, /remiseLot\(pieces\)/, "le prix de lot doit être appliqué par le serveur");
  assert.match(
    source,
    /const \{ product, unitPrice[^}]*\} = resolved\.line/,
    "le prix unitaire doit venir de resolveSelection"
  );
});
