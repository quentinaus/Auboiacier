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

import { LIVRAISON, tarifLivraison, type ResultatLieu } from "../src/lib/deplacement.ts";
import { getProduct, poidsColisKg } from "../src/lib/products.ts";
import { tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC, configurationGC, ligneGC } from "../src/lib/garde-corps-outil/site.ts";
import { livraisonGC } from "../src/lib/garde-corps-outil/calcul.ts";
import { chargerChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";

/** Un code postal situé sans réseau : les tests ne dépendent pas de l'annuaire de l'État. */
const aKm = (distanceKm: number) => async (): Promise<ResultatLieu> => ({ ok: true, lieu: { distanceKm, commune: "Nantes", precision: "adresse" } });
function chiffrageOuEchec() {
  if (!chargerChiffrage().ok) assert.fail("Clé du chiffrage absente ou invalide : copier .env.chiffrage.local d'une autre copie du site (jamais par git).");
}

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

test("un colis long ou lourd paie un supplément hors gabarit", () => {
  // Même poids, même distance : seule la longueur change.
  const standard = tarifLivraison(100, 15, 1200).montantCents;
  const horsGabarit = tarifLivraison(100, 15, 3333).montantCents;
  assert.ok(
    horsGabarit > standard + 2000,
    `un colis de 3 333 mm (${horsGabarit}) devrait coûter nettement plus qu'un colis de 1 200 mm (${standard})`
  );
  // Un colis très lourd sort aussi du gabarit standard, même court.
  const lourdEtCourt = tarifLivraison(100, 45, 1200).montantCents;
  assert.ok(lourdEtCourt > standard + 2000, "45 kg devrait aussi déclencher le supplément");
});

test("le poids d'un garde-corps est celui de l'outil de plans, et grandit avec sa hauteur", () => {
  chiffrageOuEchec();
  // Même largeur (1 200 mm) : une allège haute (650 mm, garde-corps court)
  // contre une fenêtre au ras du sol (garde-corps de près d'un mètre). Le
  // second pèse nettement plus lourd — c'est le bug que Quentin avait signalé
  // (une largeur de 3 333 mm à 48 € de livraison, qui ignorait la structure).
  const modele = { woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix" };
  const court = ligneGC({ largeurMm: 1200, allegeMm: 650, enEtage: true, fenetreMm: 0 }, modele);
  const haut = ligneGC({ largeurMm: 1200, allegeMm: 0, enEtage: true, fenetreMm: 0 }, modele);
  assert.ok(court.ok && haut.ok);
  assert.ok(haut.line.gc!.kg > court.line.gc!.kg * 1.3, `${haut.line.gc!.kg} kg contre ${court.line.gc!.kg} kg`);
  // Ce poids-là est exactement celui de l'outil (le débit réel de la pièce).
  const c = configurationGC({ largeurMm: 1200, allegeMm: 650, enEtage: true, fenetreMm: 0 }, "chene");
  assert.ok(c?.ok);
  assert.equal(court.line.gc!.kg, c.kg);
  // Le catalogue ne pèse pas le garde-corps : il n'en a pas le calcul.
  assert.throws(() => poidsColisKg(getProduct("garde-corps")!, { largeurMm: 1200, hauteurMm: 400 }));
});

test("le poids du plateau d'une table suit la densité réelle de l'essence choisie", () => {
  const mikado = getProduct("table-mikado")!;
  const cotes = { largeurMm: 2000, hauteurMm: 1000, epaisseurMm: 45 };
  const pin = poidsColisKg(mikado, { ...cotes, woodId: "pin" });
  const chene = poidsColisKg(mikado, { ...cotes, woodId: "chene" });
  const noyer = poidsColisKg(mikado, { ...cotes, woodId: "noyer" });
  // Densités de référence : pin ≈ 500 kg/m³, noyer ≈ 650, chêne ≈ 720 —
  // le pin doit toujours être le plus léger, le chêne le plus lourd.
  assert.ok(pin < noyer, `un plateau pin (${pin} kg) doit peser moins qu'un noyer (${noyer} kg)`);
  assert.ok(noyer < chene, `un plateau noyer (${noyer} kg) doit peser moins qu'un chêne (${chene} kg)`);
});

/** Récupère une constante numérique déclarée en tête d'un fichier. */
function constante(source: string, nom: string): number {
  const trouve = source.match(new RegExp(`const\\s+${nom}\\s*=\\s*([0-9_]+)\\s*;`));
  assert.ok(trouve, `La constante ${nom} a disparu : mets ce test à jour.`);
  return Number(trouve![1].replace(/_/g, ""));
}

test("la commande facture le poids de TOUTES les pièces livrées, pas d'une seule", async () => {
  const mikado = getProduct("table-mikado")!;
  const taille = mikado.sizes[0];
  const table = (quantity: number) => ({ slug: mikado.slug, sizeId: taille.id, woodId: "chene", metalId: mikado.metals[0].id, quantity });
  const kgTable = poidsColisKg(mikado, { largeurMm: taille.dimsMm?.[0], hauteurMm: taille.dimsMm?.[1], woodId: "chene" });
  for (const q of [1, 3]) {
    const t = await tarifer([table(q), { slug: LIVRAISON, livraisonCp: "44000" }], { locale: "fr", gc: CALCUL_GC, localiser: aKm(120) });
    assert.equal(t.probleme, null);
    assert.ok(t.mode?.mode === "transporteur");
    assert.equal(t.mode.kg, kgTable * q, `${q} tables : le colis pèse ${q} fois une table`);
    assert.equal(t.mode.deplacement.montantCents, tarifLivraison(120, kgTable * q, Math.max(...taille.dimsMm!)).montantCents);
  }
  // Deux lignes différentes (une ancienne livraison ne comptait que la dernière ajoutée) : les deux pèsent.
  const deux = await tarifer([table(1), { ...table(1), woodId: "pin" }, { slug: LIVRAISON, livraisonCp: "44000" }], { locale: "fr", gc: CALCUL_GC, localiser: aKm(120) });
  const kgPin = poidsColisKg(mikado, { largeurMm: taille.dimsMm?.[0], hauteurMm: taille.dimsMm?.[1], woodId: "pin" });
  assert.ok(deux.mode?.mode === "transporteur");
  assert.equal(deux.mode.kg, kgTable + kgPin);
});

test("plusieurs garde-corps : la livraison de la commande est exactement celle de l'outil de plans", async () => {
  chiffrageOuEchec();
  const releves = [
    { largeurMm: 1180, allegeMm: 650, enEtage: true, fenetreMm: 1400 },
    { largeurMm: 900, allegeMm: 300, enEtage: true, fenetreMm: 0 },
  ];
  const lignes = releves.map((r, i) => ({ slug: "garde-corps", ...r, woodId: "chene", metalId: "noir", fabricId: "fleur", remplissageId: "croix", quantity: i + 1 }));
  for (const km of [0, 42.7, 380]) {
    for (const [slug, mode] of [[LIVRAISON, "transporteur"], ["pose-a-domicile", "pose"]] as const) {
      const t = await tarifer([...lignes, { slug, livraisonCp: "44000", poseCp: "44000" }], { locale: "fr", gc: CALCUL_GC, localiser: aKm(km) });
      assert.equal(t.probleme, null);
      assert.ok(t.mode && t.mode.mode === mode);
      const outil = livraisonGC(
        releves.map((r, i) => ({ config: configurationGC(r, "chene") as never, quantite: i + 1 })),
        mode,
        km
      );
      assert.equal(t.mode.deplacement.montantCents, outil.prix * 100, `${mode} à ${km} km`);
    }
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
