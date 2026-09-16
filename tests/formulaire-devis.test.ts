/**
 * Les portes du formulaire de devis et du départ en paiement : d'où vient la
 * requête, le formulaire a-t-il été rempli par une personne, les pièces
 * jointes tiennent-elles dans ce que l'hébergeur accepte, et l'e-mail est-il
 * une vraie adresse. Ces règles sont les mêmes dans le navigateur et sur le
 * serveur (src/lib/devis-regles.ts) : c'est ici qu'on s'assure qu'elles
 * disent bien ce qu'on croit.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { origineEtrangere } from "../src/lib/origine.ts";
import {
  DUREE_HUMAINE_MS,
  EMAIL_MOTIF,
  EMAIL_VALIDE,
  MAX_FICHIERS,
  MAX_FICHIER_OCTETS,
  MAX_TOTAL_OCTETS,
  TELEPHONE_MOTIF,
  envoiTropRapide,
  fichiersTropLourds,
} from "../src/lib/devis-regles.ts";
import { cleCreneau, libelleCreneau, lireCreneau } from "../src/lib/creneau.ts";

/** Une requête POST vers /api/devis avec les en-têtes donnés. */
function requete(entetes: Record<string, string>) {
  return new Request("https://auboiacier.fr/api/devis", { method: "POST", headers: entetes });
}

// ── D'où vient la requête ────────────────────────────────────────────────────

test("origine : le formulaire du site passe (Origin = Host)", () => {
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr", origin: "https://auboiacier.fr" })), false);
  assert.equal(
    origineEtrangere(requete({ host: "auboiacier.fr", origin: "https://auboiacier.fr", "sec-fetch-site": "same-origin" })),
    false
  );
});

test("origine : localhost et les prévisualisations Vercel passent aussi", () => {
  assert.equal(origineEtrangere(requete({ host: "localhost:3000", origin: "http://localhost:3000" })), false);
  assert.equal(
    origineEtrangere(requete({ host: "auboiacier-git-test.vercel.app", origin: "https://auboiacier-git-test.vercel.app" })),
    false
  );
  // Derrière le relais de Vercel, c'est x-forwarded-host qui dit l'hôte appelé.
  assert.equal(
    origineEtrangere(
      requete({ host: "interne.vercel", "x-forwarded-host": "auboiacier.fr", origin: "https://auboiacier.fr" })
    ),
    false
  );
});

test("origine : un autre site est refusé, par Origin ou par Sec-Fetch-Site", () => {
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr", origin: "https://evil.example" })), true);
  // Même domaine, autre port ou autre protocole : ce n'est pas nous.
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr", origin: "https://auboiacier.fr:8443" })), true);
  assert.equal(
    origineEtrangere(requete({ host: "auboiacier.fr", origin: "https://auboiacier.fr", "sec-fetch-site": "cross-site" })),
    true
  );
  // Un Origin illisible est traité comme étranger.
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr", origin: "pas une adresse" })), true);
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr", origin: "null" })), true);
});

test("origine : sans Origin (curl, script), on laisse passer — c'est le travail de la limite de débit", () => {
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr" })), false);
  assert.equal(origineEtrangere(requete({ host: "auboiacier.fr", "sec-fetch-site": "none" })), false);
});

// ── Le piège temporel ────────────────────────────────────────────────────────

test("piège temporel : un envoi en moins de trois secondes est un robot", () => {
  assert.equal(envoiTropRapide("120"), true);
  assert.equal(envoiTropRapide("2999"), true);
  assert.equal(envoiTropRapide(String(DUREE_HUMAINE_MS)), false);
  assert.equal(envoiTropRapide("45000"), false);
});

test("piège temporel : absent, vide, nul ou illisible, on laisse passer", () => {
  for (const valeur of [null, undefined, "", "0", "-5", "abc", "Infinity", "NaN"]) {
    assert.equal(envoiTropRapide(valeur), false, `${String(valeur)} ne devrait pas être rejeté`);
  }
  // Un fichier envoyé sous ce nom n'est pas un nombre.
  assert.equal(envoiTropRapide(new Blob(["x"])), false);
});

// ── Les pièces jointes ───────────────────────────────────────────────────────

test("fichiers : deux photos de 3 Mo tiennent tout juste… mais pas ensemble", () => {
  assert.equal(fichiersTropLourds([]), false);
  assert.equal(fichiersTropLourds([{ size: MAX_FICHIER_OCTETS }]), false);
  assert.equal(fichiersTropLourds([{ size: MAX_FICHIER_OCTETS + 1 }]), true);
  // Chacun passe seul, mais 6 Mo dépassent les 3,5 Mo que l'hébergeur accepte.
  assert.equal(fichiersTropLourds([{ size: MAX_FICHIER_OCTETS }, { size: MAX_FICHIER_OCTETS }]), true);
  assert.equal(fichiersTropLourds([{ size: 2 * 1024 * 1024 }, { size: 1.5 * 1024 * 1024 }]), false);
  assert.ok(MAX_TOTAL_OCTETS < 2 * MAX_FICHIER_OCTETS);
});

test("fichiers : pas plus de deux, même minuscules", () => {
  const petits = Array.from({ length: MAX_FICHIERS + 1 }, () => ({ size: 10 }));
  assert.equal(fichiersTropLourds(petits), true);
  assert.equal(fichiersTropLourds(petits.slice(0, MAX_FICHIERS)), false);
});

// ── L'e-mail et le téléphone ─────────────────────────────────────────────────

test("e-mail : une adresse complète passe, « jean@orange » et les injections non", () => {
  for (const ok of ["jean@orange.fr", "a@b.co", "prenom.nom+devis@sous.domaine.example"]) {
    assert.ok(EMAIL_VALIDE.test(ok), `${ok} devrait passer`);
  }
  for (const ko of ["jean@orange", "jean", "@orange.fr", "jean@", "a b@c.fr", "a@b.c", 'a"b@c.fr', "a@b.fr,x@y.fr"]) {
    assert.ok(!EMAIL_VALIDE.test(ko), `${ko} devrait être refusé`);
  }
});

test("le motif du navigateur est exactement la règle du serveur", () => {
  // Le `pattern` HTML est implicitement ancré aux deux bouts, et compilé avec le drapeau « v ».
  const navigateur = new RegExp(`^(?:${EMAIL_MOTIF})$`, "v");
  for (const adresse of ["jean@orange.fr", "jean@orange", "a@b.fr,x@y.fr", "a b@c.fr"]) {
    assert.equal(navigateur.test(adresse), EMAIL_VALIDE.test(adresse), adresse);
  }
});

test("téléphone : permissif sur la forme, vide accepté par le champ facultatif", () => {
  const motif = new RegExp(`^(?:${TELEPHONE_MOTIF})$`, "v");
  for (const ok of ["06 12 34 56 78", "+33 6 12 34 56 78", "0612345678", "06.12.34.56.78", "06-12-34-56-78"]) {
    assert.ok(motif.test(ok), `${ok} devrait passer`);
  }
  for (const ko of ["abc", "06 12", "06 12 34 56 78 <script>", "0".repeat(41)]) {
    assert.ok(!motif.test(ko), `${ko} devrait être refusé`);
  }
});

// ── Le créneau, partie pure (partagée navigateur/serveur) ────────────────────

test("créneau : ce qui s'écrit se relit, et le reste est refusé", () => {
  const c = { date: "2026-09-23", demi: "matin" } as const;
  assert.equal(cleCreneau(c), "2026-09-23|matin");
  assert.deepEqual(lireCreneau("2026-09-23|matin"), c);
  for (const ko of [null, undefined, "", "2026-09-23", "2026-09-23|soir", "23/09/2026|matin", "x|apres-midi"]) {
    assert.equal(lireCreneau(ko), null, `${String(ko)} devrait être refusé`);
  }
  assert.equal(libelleCreneau(c, "fr"), "mercredi 23 septembre, matin");
  assert.equal(libelleCreneau({ ...c, demi: "apres-midi" }, "en"), "Wednesday 23 September, afternoon");
});
