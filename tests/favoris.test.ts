import assert from "node:assert/strict";
import test from "node:test";
import {
  FAVORIS_MAX,
  PREFIXE_FAVORI,
  composerFavori,
  decoderFavori,
  empreinteFavori,
  encoderFavori,
  favorisDepuisMetadata,
} from "../src/lib/favoris.ts";

/**
 * Les favoris vivent dans les métadonnées d'une fiche Stripe : 50 clés de 500
 * caractères, pas une de plus. Ces tests tiennent cette limite, et la règle
 * qui empêche la liste de se remplir de doublons.
 */

const T = 1_790_944_320; // 2 octobre 2026, 12 h 32 UTC

const CONFIG = {
  slug: "plafond-lumineux-lucarne",
  unite: "mm" as const,
  largeur: "1650",
  hauteur: "990",
  epaisseur: "300",
  metalId: "noir",
  quantity: 1,
};

function entree(surcharge: Record<string, unknown> = {}) {
  return {
    slug: "plafond-lumineux-lucarne",
    titre: "Plafond lumineux Lucarne",
    resume: "1650 × 990 mm × 300 mm · Noir charbon",
    prixCents: 53_000,
    config: CONFIG,
    maintenantS: T,
    ...surcharge,
  };
}

test("un favori se compose, s'écrit et se relit à l'identique", () => {
  const favori = composerFavori(entree())!;
  assert.ok(favori, "le favori aurait dû se composer");
  const relu = decoderFavori(favori.id, encoderFavori(favori));
  assert.ok(relu);
  assert.equal(relu.slug, "plafond-lumineux-lucarne");
  assert.equal(relu.titre, "Plafond lumineux Lucarne");
  assert.equal(relu.prixCents, 53_000);
  assert.equal(relu.ajouteLe, T);
  // Les cotes : c'est tout l'intérêt de la chose.
  assert.equal(relu.config.largeur, "1650");
  assert.equal(relu.config.hauteur, "990");
  assert.equal(relu.config.epaisseur, "300");
  assert.equal(relu.config.metalId, "noir");
  assert.equal(relu.config.slug, "plafond-lumineux-lucarne");
});

test("la même pièce dans la même configuration ne fait qu'un seul favori", () => {
  // Sans cette règle, cliquer deux fois sur le signet mangeait deux places
  // sur vingt-quatre, et la liste se remplissait de la même table.
  const a = composerFavori(entree())!;
  const b = composerFavori(entree({ maintenantS: T + 9999 }))!;
  assert.equal(a.id, b.id);
  // L'ordre des clés de la configuration ne doit rien changer.
  const desordre = { quantity: 1, epaisseur: "300", slug: CONFIG.slug, hauteur: "990", largeur: "1650", metalId: "noir", unite: "mm" as const };
  assert.equal(empreinteFavori("plafond-lumineux-lucarne", desordre), a.id);
});

test("changer une cote ou une teinte fait un autre favori", () => {
  const reference = composerFavori(entree())!;
  const plusLarge = composerFavori(entree({ config: { ...CONFIG, largeur: "1800" } }))!;
  const autreTeinte = composerFavori(entree({ config: { ...CONFIG, metalId: "laiton" } }))!;
  assert.notEqual(plusLarge.id, reference.id);
  assert.notEqual(autreTeinte.id, reference.id);
});

test("un favori tient dans une métadonnée Stripe", () => {
  const favori = composerFavori(
    entree({
      titre: "Plafond lumineux Lucarne, très grand modèle sur mesure pour salle à manger",
      resume: "4000 × 3000 mm × 300 mm (12 m²) · Noir charbon · Toile tendue · Pose comprise",
      config: { ...CONFIG, woodId: "noyer", fabricId: "toile-blanche", codePostal: "49400", poseVoulue: true },
    })
  )!;
  assert.ok(favori);
  assert.ok(
    encoderFavori(favori).length <= 500,
    `${encoderFavori(favori).length} caractères : Stripe en refuserait l'enregistrement`
  );
});

test("une pièce sans identifiant utilisable est refusée", () => {
  // Ce qui arrive ici vient du navigateur : un slug fantaisiste ne doit pas
  // finir dans une fiche Stripe, ni produire un lien qui sort du site.
  for (const slug of ["", "../../secret", "/fr/compte", "PLAFOND", "a", null, 42, "x".repeat(200)]) {
    assert.equal(composerFavori(entree({ slug })), null, `accepté à tort : ${JSON.stringify(slug)}`);
  }
});

test("seuls les champs que le configurateur sait relire sont gardés", () => {
  const favori = composerFavori(
    entree({ config: { ...CONFIG, mechant: "<script>", quantity: 9999, unite: "lieues" } })
  )!;
  const relu = decoderFavori(favori.id, encoderFavori(favori))!;
  assert.equal((relu.config as Record<string, unknown>).mechant, undefined);
  assert.equal(relu.config.quantity, undefined, "99 au maximum, sinon rien");
  assert.equal(relu.config.unite, undefined, "une unité inconnue est écartée");
});

test("une métadonnée qui n'est pas un favori ne casse pas la page", () => {
  const favori = composerFavori(entree())!;
  const favoris = favorisDepuisMetadata({
    espace: "1",
    statut: "fabrication",
    [`${PREFIXE_FAVORI}${favori.id}`]: encoderFavori(favori),
    [`${PREFIXE_FAVORI}casse`]: "ceci n'est pas du JSON",
    [`${PREFIXE_FAVORI}vide`]: "",
    [`${PREFIXE_FAVORI}sansSlug`]: JSON.stringify({ t: "Rien" }),
  });
  assert.equal(favoris.length, 1);
  assert.equal(favoris[0].id, favori.id);
});

test("les favoris sortent du plus récent au plus ancien", () => {
  const vieux = composerFavori(entree({ maintenantS: T - 86_400 }))!;
  const recent = composerFavori(entree({ config: { ...CONFIG, largeur: "1800" }, maintenantS: T }))!;
  const favoris = favorisDepuisMetadata({
    [`${PREFIXE_FAVORI}${vieux.id}`]: encoderFavori(vieux),
    [`${PREFIXE_FAVORI}${recent.id}`]: encoderFavori(recent),
  });
  assert.deepEqual(
    favoris.map((f) => f.id),
    [recent.id, vieux.id]
  );
});

test("le plafond laisse de la marge sous la limite de Stripe", () => {
  // Cinquante clés chez Stripe, dont la fiche a besoin pour autre chose
  // (la marque « espace », et ce que la caisse y écrira demain).
  assert.ok(FAVORIS_MAX <= 40, "trop près des 50 clés de Stripe");
  assert.ok(FAVORIS_MAX >= 10, "trop peu pour être utile");
});

test("rien de ce qui n'est pas un favori ne se relit", () => {
  for (const faux of ["", "{}", "[]", "null", "{\"t\":\"sans slug\"}", 42, null, undefined, {}]) {
    assert.equal(decoderFavori("abc", faux), null, `accepté à tort : ${JSON.stringify(faux)}`);
  }
  // Un identifiant vide ne désigne rien.
  assert.equal(decoderFavori("", JSON.stringify({ s: "table-mikado" })), null);
});
