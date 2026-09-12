/**
 * La prise de cotes à domicile : l'offre près de Saumur, puis les kilomètres
 * et le temps au taux de déplacement. Les chiffres sont ceux de Quentin. Le
 * géocodage, lui, n'est pas testé ici : il dépend d'un service extérieur.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  tarifDeplacement,
  calculerDeplacement,
  PRIX_OFFRE_CENTS,
  RAYON_MAX_KM,
  RAYON_OFFRE_KM,
  TAUX_HORAIRE_DEPLACEMENT,
} from "../src/lib/deplacement.ts";

test("jusqu'à 30 km, c'est l'offre à 19,99 €", () => {
  for (const km of [0, 5, 18, 29.9, RAYON_OFFRE_KM]) {
    const tarif = tarifDeplacement(km);
    assert.equal(tarif.montantCents, PRIX_OFFRE_CENTS, `${km} km : ce devrait être l'offre`);
    assert.equal(tarif.offre, true);
  }
});

test("au-delà, le prix monte avec la distance et compte au moins l'heure sur place", () => {
  let precedent = 0;
  for (const km of [31, 50, 80, 150, 300]) {
    const tarif = tarifDeplacement(km);
    assert.equal(tarif.offre, false);
    assert.ok(tarif.montantCents > precedent, `${km} km : ${tarif.montantCents} ne dépasse pas ${precedent}`);
    // Une heure sur place au taux horaire, au minimum, quoi qu'il arrive.
    assert.ok(tarif.montantCents >= TAUX_HORAIRE_DEPLACEMENT * 100, `${km} km : moins qu'une heure`);
    // Un montant en euros entiers : pas de centimes hors de l'offre.
    assert.equal(tarif.montantCents % 100, 0);
    precedent = tarif.montantCents;
  }
});

test("le temps compté : la route aller-retour plus une heure sur place", () => {
  const tarif = tarifDeplacement(60);
  // 60 km à vol d'oiseau → 75 km de route, 150 aller-retour, 2,5 h de route + 1 h.
  assert.equal(tarif.routeAllerRetourKm, 150);
  assert.equal(tarif.heures, 3.5);
});

test("un code postal illisible ou l'outre-mer sont refusés sans appeler personne", async () => {
  for (const cp of ["", "4940", "abcde", "494000", "97400", "98800"]) {
    const resultat = await calculerDeplacement(cp);
    assert.equal(resultat.ok, false, `${cp} accepté`);
  }
  const outreMer = await calculerDeplacement("97400");
  assert.equal(outreMer.ok === false && outreMer.reason, "hors_metropole");
});

test("au-delà de 200 km à vol d'oiseau, l'atelier ne se déplace pas", async () => {
  // Paris est à 255 km de Saumur : refusé, avec la distance pour le dire au client.
  const paris = await calculerDeplacement("75001");
  assert.equal(paris.ok, false, "Paris devrait être trop loin");
  if (paris.ok === false) {
    assert.equal(paris.reason, "trop_loin");
    assert.ok((paris.distanceKm ?? 0) > RAYON_MAX_KM);
  }
  // Nantes, à 112 km, reste possible.
  const nantes = await calculerDeplacement("44000");
  assert.ok(nantes.ok, "Nantes devrait passer");
});
