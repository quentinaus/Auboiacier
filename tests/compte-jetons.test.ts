import assert from "node:assert/strict";
import test from "node:test";
import {
  DUREE_LIEN_S,
  DUREE_SESSION_S,
  compteConfigure,
  lireLien,
  lireSession,
  normaliserEmail,
  signerLien,
  signerSession,
} from "../src/lib/compte-jetons.ts";

/**
 * Ces jetons sont la seule chose qui sépare un visiteur des commandes d'un
 * client : son adresse, son téléphone, ce qu'il a payé. Tout ce qui suit
 * essaie de les contourner.
 */

const SECRET = "un-secret-de-trente-deux-caracteres-au-moins";
const T = 1_790_944_320; // 2 octobre 2026, 12 h 32 UTC
const EMAIL = "camille@exemple.fr";

function avecSecret<T>(secret: string | undefined, fn: () => T): T {
  const avant = process.env.COMPTE_SECRET;
  if (secret === undefined) delete process.env.COMPTE_SECRET;
  else process.env.COMPTE_SECRET = secret;
  try {
    return fn();
  } finally {
    if (avant === undefined) delete process.env.COMPTE_SECRET;
    else process.env.COMPTE_SECRET = avant;
  }
}

test("un jeton signé se relit, et rend l'adresse normalisée", () => {
  avecSecret(SECRET, () => {
    const jeton = signerSession("Camille@Exemple.FR", T)!;
    assert.ok(jeton);
    assert.deepEqual(lireSession(jeton, T), { email: EMAIL, exp: T + DUREE_SESSION_S });
  });
});

test("sans secret, rien ne se signe et rien ne s'ouvre : l'espace est simplement fermé", () => {
  const jeton = avecSecret(SECRET, () => signerSession(EMAIL, T)!);
  avecSecret(undefined, () => {
    assert.equal(compteConfigure(), false);
    assert.equal(signerSession(EMAIL, T), null);
    assert.equal(lireSession(jeton, T), null);
  });
  // Un secret trop court ne vaut pas mieux qu'aucun secret.
  avecSecret("trop-court", () => {
    assert.equal(compteConfigure(), false);
    assert.equal(signerSession(EMAIL, T), null);
  });
});

test("un jeton périmé ne connecte plus personne", () => {
  avecSecret(SECRET, () => {
    const jeton = signerSession(EMAIL, T)!;
    assert.ok(lireSession(jeton, T + DUREE_SESSION_S - 1), "encore valable une seconde avant");
    assert.equal(lireSession(jeton, T + DUREE_SESSION_S), null, "plus valable à l'échéance");
    assert.equal(lireSession(jeton, T + DUREE_SESSION_S + 86_400), null);
  });
});

test("un lien de connexion ne fait pas une session, et inversement", () => {
  avecSecret(SECRET, () => {
    const lien = signerLien(EMAIL, T)!;
    const session = signerSession(EMAIL, T)!;
    assert.equal(lireSession(lien, T), null, "un lien de 15 min deviendrait une session de 30 jours");
    assert.equal(lireLien(session, T), null);
    assert.ok(lireLien(lien, T));
    assert.ok(lireSession(session, T));
  });
});

test("le lien de connexion dure un quart d'heure, et reste réutilisable jusque-là", () => {
  avecSecret(SECRET, () => {
    const lien = signerLien(EMAIL, T)!;
    assert.ok(lireLien(lien, T + 60), "relu une minute après");
    assert.ok(lireLien(lien, T + 14 * 60), "et encore quatorze minutes après : l'iPhone le rouvre");
    assert.equal(lireLien(lien, T + DUREE_LIEN_S), null);
  });
});

test("une charge modifiée casse la signature", () => {
  avecSecret(SECRET, () => {
    const jeton = signerSession(EMAIL, T)!;
    const [charge, signature] = jeton.split(".");
    // On réécrit l'adresse pour voler les commandes de quelqu'un d'autre.
    const truquee = Buffer.from(
      JSON.stringify({ email: "voleur@exemple.fr", exp: T + DUREE_SESSION_S })
    ).toString("base64url");
    assert.equal(lireSession(`${truquee}.${signature}`, T), null);
    // Et on repousse l'échéance de dix ans.
    const eternelle = Buffer.from(
      JSON.stringify({ email: EMAIL, exp: T + 10 * 365 * 86_400 })
    ).toString("base64url");
    assert.equal(lireSession(`${eternelle}.${signature}`, T), null);
    assert.ok(lireSession(`${charge}.${signature}`, T), "le jeton d'origine reste bon");
  });
});

test("un jeton signé avec un autre secret ne vaut rien", () => {
  const etranger = avecSecret("un-autre-secret-de-plus-de-24-signes", () => signerSession(EMAIL, T)!);
  avecSecret(SECRET, () => assert.equal(lireSession(etranger, T), null));
});

test("rien de ce qui n'est pas un jeton ne passe", () => {
  avecSecret(SECRET, () => {
    for (const faux of ["", ".", "a.b", "sans-point", null, undefined, 42, {}, [], "..", "a..b"]) {
      assert.equal(lireSession(faux, T), null, `accepté à tort : ${JSON.stringify(faux)}`);
    }
  });
});

test("normaliserEmail met en minuscules et refuse ce qui n'est pas une adresse", () => {
  assert.equal(normaliserEmail("  Camille@Exemple.FR "), EMAIL);
  assert.equal(normaliserEmail("a@b.co"), "a@b.co");
  for (const faux of [
    "",
    "sans-arobase.fr",
    "deux@@exemple.fr",
    "pas@dedomaine",
    "avec espace@exemple.fr",
    "@exemple.fr",
    "camille@",
    null,
    undefined,
    42,
    `${"a".repeat(250)}@exemple.fr`,
  ]) {
    assert.equal(normaliserEmail(faux), null, `accepté à tort : ${JSON.stringify(faux)}`);
  }
});

test("une adresse refusée ne produit aucun jeton", () => {
  avecSecret(SECRET, () => {
    assert.equal(signerSession("pas-une-adresse", T), null);
    assert.equal(signerLien("", T), null);
  });
});
