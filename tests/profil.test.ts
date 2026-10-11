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
import { CLE_CONFIG, memoVersReleve, memoriserConfig, releveVersMemo, reprendreConfig } from "../src/lib/config-memo.ts";
import { PREFIXE_FAVORI, composerFavori, encoderFavori, favorisDepuisMetadata } from "../src/lib/favoris.ts";
import { SUR_MESURE } from "../src/lib/products.ts";
import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };

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

/* ------------------------------------------------------------------ *
 *  La fiche du client porte aussi ses pièces mises de côté
 *  (profil-client.ts), et c'est par la mémoire de session qu'il les
 *  retrouve : « Reprendre », ou le retour de la création de compte.
 *  Pour un garde-corps, la pièce, c'est le relevé de la fenêtre.
 * ------------------------------------------------------------------ */

const T = 1_791_187_200; // 5 octobre 2026

/** Une fenêtre, telle que le client l'a remplie sur la fiche en français. */
const FENETRE = {
  etage: fr.artisanat.gcEtageOptions[0],
  largeur: "1180",
  allege: "650",
  fenetre: "1400",
  mur: fr.artisanat.gcMurOptions[0],
  modele: "16-5-b",
};

const OPTIONS_GC = {
  slug: "garde-corps",
  unite: "mm" as const,
  sizeId: SUR_MESURE,
  woodId: "chene",
  metalId: "noir",
  fabricId: "fleur",
  remplissageId: "croix",
  quantity: 1,
};

/** Ce que la fiche fait de « Mettre de côté » : une clé par favori dans la fiche Stripe (ajouterFavori). */
function mettreDeCote(metadata: Record<string, string>, cases: typeof FENETRE, maintenantS: number) {
  const favori = composerFavori({
    slug: "garde-corps",
    titre: "Garde-corps de fenêtre Rosace",
    resume: `Fenêtre de ${cases.largeur} mm · Chêne · Noir charbon`,
    prixCents: 41_200,
    config: { ...OPTIONS_GC, ...releveVersMemo(cases, fr.artisanat) },
    maintenantS,
  });
  assert.ok(favori, "le garde-corps aurait dû se mettre de côté");
  metadata[`${PREFIXE_FAVORI}${favori.id}`] = encoderFavori(favori);
}

/** Le stockage de session du navigateur, réduit à ce que config-memo.ts en fait. */
function stockageDeSession(): Map<string, string> {
  const cases = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (cle: string) => cases.get(cle) ?? null,
      setItem: (cle: string, valeur: string) => void cases.set(cle, valeur),
      removeItem: (cle: string) => void cases.delete(cle),
    },
  });
  return cases;
}

test("deux fenêtres aux mêmes options ne s'écrasent plus dans la fiche du client", () => {
  const metadata: Record<string, string> = { espace: "1" };
  mettreDeCote(metadata, FENETRE, T);
  mettreDeCote(metadata, { ...FENETRE, largeur: "1400" }, T + 60);
  // La première, remise de côté : elle reprend sa place, sans en prendre une troisième.
  mettreDeCote(metadata, FENETRE, T + 120);
  const favoris = favorisDepuisMetadata(metadata);
  assert.equal(favoris.length, 2);
  assert.deepEqual(favoris.map((f) => f.config.gcLargeurMm).sort(), [1180, 1400]);
});

test("« Reprendre » un garde-corps rouvre la fiche avec son relevé et son modèle", () => {
  stockageDeSession();
  const metadata: Record<string, string> = {};
  mettreDeCote(metadata, FENETRE, T);
  const [favori] = favorisDepuisMetadata(metadata);

  // Le bouton « Reprendre » (favoris-liste.tsx), puis le montage de la fiche.
  memoriserConfig(favori.config);
  const memo = reprendreConfig("garde-corps");
  assert.ok(memo, "la configuration aurait dû attendre la fiche");
  assert.deepEqual(memoVersReleve(memo, fr.artisanat), FENETRE);
  assert.equal(memo.woodId, "chene", "les options restent là, comme avant");
  // Relue une seule fois : elle ne ressurgit pas à la visite suivante.
  assert.equal(reprendreConfig("garde-corps"), null);

  // Sur la fiche en anglais : les cotes, l'étage et le mur reviennent dans ses mots. Le mur est gardé par sa
  // matière : sans lui, le panier resterait bloqué (« Choisissez le type de mur »).
  memoriserConfig(favori.config);
  const enAnglais = memoVersReleve(reprendreConfig("garde-corps")!, en.artisanat);
  assert.equal(enAnglais.largeur, "1180");
  assert.equal(enAnglais.etage, en.artisanat.gcEtageOptions[0]);
  assert.equal(enAnglais.mur, en.artisanat.gcMurOptions[0]);
  assert.equal(enAnglais.modele, "16-5-b");

  // Un favori mis de côté avant ce changement a gardé le mot affiché : il revient dans sa langue.
  memoriserConfig({ ...favori.config, gcMur: fr.artisanat.gcMurOptions[3] });
  assert.equal(memoVersReleve(reprendreConfig("garde-corps")!, fr.artisanat).mur, fr.artisanat.gcMurOptions[3]);
});

test("le retour de la création de compte rend le relevé, sans cocher l'étage à la place du client", () => {
  stockageDeSession();
  // Une fenêtre en cours de saisie : ni étage, ni mur, ni modèle, et une cote à virgule.
  const enCours = { etage: "", largeur: "1180,4", allege: "0", fenetre: " ", mur: "", modele: "" };
  memoriserConfig({ ...OPTIONS_GC, ...releveVersMemo(enCours, fr.artisanat) });
  const releve = memoVersReleve(reprendreConfig("garde-corps")!, fr.artisanat);
  // Rien d'autre que ce qui était rempli : l'étage reste « à choisir » (décision du 03/10).
  assert.deepEqual(releve, { largeur: "1180", allege: "0" });

  // Le rez-de-chaussée, lui, a été choisi : il revient.
  memoriserConfig({ ...OPTIONS_GC, ...releveVersMemo({ ...enCours, etage: fr.artisanat.gcEtageOptions[1] }, fr.artisanat) });
  assert.equal(memoVersReleve(reprendreConfig("garde-corps")!, fr.artisanat).etage, fr.artisanat.gcEtageOptions[1]);

  // La mémoire d'une autre pièce ne se pose pas sur le garde-corps.
  memoriserConfig({ slug: "table-mikado", gcLargeurMm: 1180 });
  assert.equal(reprendreConfig("garde-corps"), null);
});

test("la largeur en haut (murs pas parallèles) se met de côté et revient avec le reste", () => {
  memoriserConfig({ ...OPTIONS_GC, ...releveVersMemo({ ...FENETRE, largeurHaut: "1172", mursInegaux: true }, fr.artisanat) });
  const releve = memoVersReleve(reprendreConfig("garde-corps")!, fr.artisanat);
  assert.equal(releve.largeur, FENETRE.largeur);
  assert.equal(releve.largeurHaut, "1172");
  assert.equal(releve.mursInegaux, true);
  // Des murs droits : une seule largeur, rien pour le haut — et jamais la largeur du bas recopiée en haut.
  const droit = releveVersMemo({ ...FENETRE, largeurHaut: "1172", mursInegaux: false }, fr.artisanat);
  assert.equal(droit.gcLargeurHautMm, undefined);
  assert.equal(droit.gcLargeurMm, 1180);
  // Une mémoire plus ancienne qui a gardé deux largeurs égales : des murs droits.
  memoriserConfig({ ...OPTIONS_GC, gcLargeurMm: 1180, gcLargeurHautMm: 1180 });
  assert.equal(memoVersReleve(reprendreConfig("garde-corps")!, fr.artisanat).mursInegaux, false);
  // Une largeur du haut hors bornes est écartée.
  memoriserConfig({ ...OPTIONS_GC, gcLargeurMm: 1180, gcLargeurHautMm: 99_999 });
  assert.equal(reprendreConfig("garde-corps")!.gcLargeurHautMm, undefined);
});

test("une mémoire trafiquée ne remet ni cote hors bornes ni modèle inventé", () => {
  const stockage = stockageDeSession();
  stockage.set(
    CLE_CONFIG,
    JSON.stringify({
      slug: "garde-corps",
      gcLargeurMm: 99_999,
      gcAllegeMm: null,
      gcFenetreMm: "1400",
      gcEnEtage: "oui",
      gcMur: "x".repeat(60),
      gcModele: "99-9",
    })
  );
  const memo = reprendreConfig("garde-corps");
  assert.ok(memo);
  assert.deepEqual(memoVersReleve(memo, fr.artisanat), {});
});
