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
import { BORNES_RELEVE_GC } from "../src/lib/garde-corps.ts";
import { SUR_MESURE, getProduct } from "../src/lib/products.ts";
import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };

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

/* ------------------------------------------------------------------ *
 *  Le garde-corps de fenêtre : sa pièce, c'est son relevé.
 *  Sans lui, « Reprendre » rouvrait une fiche vide, et deux fenêtres
 *  différentes aux mêmes options s'écrasaient l'une l'autre.
 * ------------------------------------------------------------------ */

const CONFIG_GC = {
  slug: "garde-corps",
  unite: "mm" as const,
  sizeId: SUR_MESURE,
  woodId: "chene",
  metalId: "noir",
  fabricId: "fleur",
  remplissageId: "croix",
  quantity: 1,
  gcLargeurMm: 1180,
  gcAllegeMm: 650,
  gcFenetreMm: 1400,
  gcEnEtage: true,
  gcMur: "Pierre",
  gcModele: "16-5-b",
};

function entreeGC(config: Record<string, unknown> = {}) {
  return entree({
    slug: "garde-corps",
    titre: "Garde-corps de fenêtre Rosace",
    resume: "Fenêtre de 1180 mm · Chêne · Noir charbon · Fleur, aluminium moulé Ø100",
    prixCents: 41_200,
    config: { ...CONFIG_GC, ...config },
  });
}

test("un garde-corps mis de côté garde son relevé et son modèle", () => {
  const favori = composerFavori(entreeGC())!;
  assert.ok(favori, "le favori aurait dû se composer");
  const relu = decoderFavori(favori.id, encoderFavori(favori))!;
  assert.equal(relu.config.gcLargeurMm, 1180);
  assert.equal(relu.config.gcAllegeMm, 650);
  assert.equal(relu.config.gcFenetreMm, 1400);
  assert.equal(relu.config.gcEnEtage, true);
  assert.equal(relu.config.gcMur, "Pierre");
  assert.equal(relu.config.gcModele, "16-5-b");
  // Le rez-de-chaussée et une allège à zéro sont des réponses, pas des oublis.
  const auSol = composerFavori(entreeGC({ gcEnEtage: false, gcAllegeMm: 0 }))!;
  const reluAuSol = decoderFavori(auSol.id, encoderFavori(auSol))!;
  assert.equal(reluAuSol.config.gcEnEtage, false);
  assert.equal(reluAuSol.config.gcAllegeMm, 0);
});

test("deux fenêtres différentes aux mêmes options font deux favoris", () => {
  const reference = composerFavori(entreeGC())!;
  // La même fenêtre, remise de côté plus tard : toujours un seul favori.
  assert.equal(composerFavori({ ...entreeGC(), maintenantS: T + 9999 })!.id, reference.id);
  const autres = {
    "plus large": { gcLargeurMm: 1400 },
    "allège plus basse": { gcAllegeMm: 400 },
    "fenêtre plus haute": { gcFenetreMm: 1600 },
    "au rez-de-chaussée": { gcEnEtage: false },
    "autre mur": { gcMur: "Parpaing" },
    "autre modèle": { gcModele: "16-3" },
  };
  const ids = new Set([reference.id]);
  for (const [quoi, config] of Object.entries(autres)) {
    const favori = composerFavori(entreeGC(config))!;
    assert.notEqual(favori.id, reference.id, `${quoi} : écraserait la première fenêtre`);
    ids.add(favori.id);
  }
  assert.equal(ids.size, 7, "sept fenêtres, sept favoris");
});

test("une cote hors de ce que l'atelier fabrique, ou un modèle inventé, n'entre pas dans la fiche", () => {
  const B = BORNES_RELEVE_GC;
  const refusees: Record<string, unknown>[] = [
    { gcLargeurMm: B.largeurMm.min - 1 },
    { gcLargeurMm: B.largeurMm.max + 1 },
    { gcLargeurMm: 1180.5 },
    { gcLargeurMm: "1180" },
    { gcLargeurMm: null },
    { gcAllegeMm: -1 },
    { gcAllegeMm: B.allegeMm.max + 1 },
    // Number(null) vaut 0, une allège valable : seul un vrai nombre passe.
    { gcAllegeMm: null },
    { gcAllegeMm: "" },
    { gcFenetreMm: B.fenetreMm.max + 1 },
    { gcFenetreMm: Number.NaN },
    { gcEnEtage: "oui" },
    { gcEnEtage: 1 },
    { gcMur: "x".repeat(41) },
    { gcMur: "" },
    { gcMur: 3 },
    { gcModele: "99-9" },
    { gcModele: "16-5-b<script>" },
    { gcModele: 16 },
  ];
  for (const config of refusees) {
    const [champ] = Object.keys(config);
    const favori = composerFavori(entreeGC(config))!;
    assert.ok(favori, "le reste de la configuration reste enregistrable");
    const relu = decoderFavori(favori.id, encoderFavori(favori))!;
    assert.equal(
      (relu.config as Record<string, unknown>)[champ],
      undefined,
      `gardé à tort : ${JSON.stringify(config)}`
    );
    // Ce qui était bon autour n'est pas perdu pour autant.
    if (champ !== "gcModele") assert.equal(relu.config.gcModele, "16-5-b");
  }
  // Les bornes elles-mêmes sont des cotes que l'atelier fabrique.
  const auxBornes = composerFavori(
    entreeGC({ gcLargeurMm: B.largeurMm.max, gcAllegeMm: B.allegeMm.max, gcFenetreMm: B.fenetreMm.max })
  )!;
  assert.equal(auxBornes.config.gcLargeurMm, B.largeurMm.max);
  assert.equal(auxBornes.config.gcAllegeMm, B.allegeMm.max);
  assert.equal(auxBornes.config.gcFenetreMm, B.fenetreMm.max);
});

test("le garde-corps le plus chargé tient dans une métadonnée Stripe", () => {
  // La vraie pièce du catalogue, avec ce qu'elle a de plus long partout : un
  // favori refusé pour sa taille, c'est un bouton « Mettre de côté » qui ne
  // répond pas, sans un mot d'explication.
  const produit = getProduct("garde-corps")!;
  assert.ok(produit, "le garde-corps de fenêtre a changé d'adresse");
  const plusLong = (mots: readonly string[]) => mots.reduce((a, b) => (b.length > a.length ? b : a), "");
  const ids = (options: readonly { id: string }[] | undefined) => (options ?? []).map((o) => o.id);
  const favori = composerFavori(
    entreeGC({
      woodId: plusLong(ids(produit.woods)),
      metalId: plusLong(ids(produit.metals)),
      fabricId: plusLong(ids(produit.fabrics)),
      remplissageId: plusLong(ids(produit.remplissages)),
      quantity: 10,
      codePostal: "49400",
      poseVoulue: false,
      modeLivraison: "transporteur",
      gcLargeurMm: BORNES_RELEVE_GC.largeurMm.max,
      gcAllegeMm: BORNES_RELEVE_GC.allegeMm.max,
      gcFenetreMm: BORNES_RELEVE_GC.fenetreMm.max,
      gcEnEtage: false,
      gcMur: plusLong([...fr.artisanat.gcMurOptions, ...en.artisanat.gcMurOptions]),
      gcModele: "16-5-b",
    })
  );
  const complet = {
    ...entreeGC(),
    titre: plusLong([produit.name, produit.en?.name ?? ""]),
    // Le résumé est coupé à 90 signes : on le remplit jusqu'au bord.
    resume: "Fenêtre de 3000 mm · ".padEnd(120, "Chêne massif · "),
    prixCents: 999_999,
  };
  assert.ok(favori, "le favori aurait dû se composer");
  const charge = composerFavori({ ...complet, config: favori.config });
  assert.ok(charge, "trop long pour Stripe : le favori serait refusé");
  assert.ok(
    encoderFavori(charge).length <= 500,
    `${encoderFavori(charge).length} caractères : Stripe en refuserait l'enregistrement`
  );
  assert.equal(charge.config.gcModele, "16-5-b");
});
