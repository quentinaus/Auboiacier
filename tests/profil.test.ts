import assert from "node:assert/strict";
import test from "node:test";
import {
  PROFIL_VIDE,
  adresseSurUneLigne,
  codePostalFrancais,
  normaliserProfil,
  profilRempli,
  telephonePlausible,
} from "../src/lib/profil.ts";

/**
 * Ces coordonnées partent dans une fiche Stripe et servent à faire livrer un
 * meuble de soixante kilos. Ce qui suit vérifie qu'on n'y écrit rien
 * d'aberrant, et qu'on n'y refuse rien de légitime.
 */

test("un profil se nettoie sans se plaindre", () => {
  const profil = normaliserProfil({
    nom: "  Camille   Durand ",
    telephone: " 06 12 34 56 78 ",
    adresse: { ligne1: " 12 rue des Forges ", ligne2: "", codePostal: " 49 400 ", ville: "Saumur" },
  });
  assert.equal(profil.nom, "Camille Durand", "les espaces multiples sont ramenés à un");
  assert.equal(profil.telephone, "06 12 34 56 78");
  assert.equal(profil.adresse.codePostal, "49400", "le code postal se range sans espaces");
  assert.equal(profil.adresse.ville, "Saumur");
});

test("rien d'exploitable ne donne un profil vide, jamais une exception", () => {
  for (const faux of [null, undefined, 42, "texte", [], { adresse: "pas un objet" }]) {
    const profil = normaliserProfil(faux);
    assert.deepEqual(profil, PROFIL_VIDE, `${JSON.stringify(faux)} aurait dû donner un profil vide`);
  }
});

test("un envoi truqué ne remplit pas une fiche Stripe de kilo-octets", () => {
  const profil = normaliserProfil({
    nom: "a".repeat(5000),
    telephone: "0".repeat(5000),
    adresse: { ligne1: "b".repeat(5000), ligne2: "c".repeat(5000), codePostal: "9".repeat(500), ville: "d".repeat(5000) },
  });
  assert.equal(profil.nom.length, 80);
  assert.equal(profil.telephone.length, 24);
  assert.equal(profil.adresse.ligne1.length, 100);
  assert.equal(profil.adresse.ville.length, 60);
  assert.ok(profil.adresse.codePostal.length <= 16);
});

test("un profil vide se reconnaît", () => {
  assert.equal(profilRempli(PROFIL_VIDE), false);
  assert.equal(profilRempli(normaliserProfil({ nom: "Camille" })), true);
  assert.equal(profilRempli(normaliserProfil({ adresse: { ville: "Saumur" } })), true);
  // Des espaces ne sont pas un profil rempli.
  assert.equal(profilRempli(normaliserProfil({ nom: "   " })), false);
});

test("l'adresse s'écrit comme sur une étiquette", () => {
  assert.equal(
    adresseSurUneLigne({ ligne1: "12 rue des Forges", ligne2: "", codePostal: "49400", ville: "Saumur" }),
    "12 rue des Forges, 49400 Saumur"
  );
  assert.equal(
    adresseSurUneLigne({ ligne1: "12 rue des Forges", ligne2: "Bâtiment B", codePostal: "49400", ville: "Saumur" }),
    "12 rue des Forges, Bâtiment B, 49400 Saumur"
  );
  // Rien de rempli : rien d'écrit, pas une suite de virgules.
  assert.equal(adresseSurUneLigne({ ligne1: "", ligne2: "", codePostal: "", ville: "" }), "");
});

test("un code postal français, et lui seul", () => {
  assert.equal(codePostalFrancais("49400"), "49400");
  assert.equal(codePostalFrancais("49 400"), "49400");
  assert.equal(codePostalFrancais("75001"), "75001");
  for (const faux of ["4940", "494000", "49A00", "", "abcde"]) {
    assert.equal(codePostalFrancais(faux), null, `accepté à tort : ${faux}`);
  }
});

test("un téléphone reste accepté sous toutes ses formes courantes", () => {
  // Refuser l'une de ces écritures ferait perdre un numéro utile à l'atelier
  // le jour de la livraison.
  for (const bon of ["06 12 34 56 78", "+33 6 12 34 56 78", "0033612345678", "0612345678"]) {
    assert.equal(telephonePlausible(bon), bon.trim(), `refusé à tort : ${bon}`);
  }
  for (const faux of ["", "06 12", "12345678", "pas un numéro"]) {
    assert.equal(telephonePlausible(faux), null, `accepté à tort : ${faux}`);
  }
});
