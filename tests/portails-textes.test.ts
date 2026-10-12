/**
 * Les textes de la page des portails et de la fiche (portails-page.ts, portails-textes.ts) après la relecture du 13/10/2026 :
 * - les mêmes clés en français et en anglais ;
 * - une espace insécable entre un nombre et son unité (« 3,50 m », « 45 km », « 40 % »), avant « : ; ? ! » en français ;
 * - les chiffres du texte sont ceux du code : le coulissant sur rail demande le passage + 160 mm au moteur, l'acompte est
 *   ACOMPTE_PORTAIL_PCT, la légende des « dès » n'écrit plus aucune cote à la main ;
 * - « sans pose » dit « à retirer à l'atelier », le « dès » dit « thermolaqué » ;
 * - un build sans clé de chiffrage ne publie plus en silence une page sans prix.
 * Les insécables s'écrivent \xa0 dans ce fichier (un \u00a0 se verrait comme une espace).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACOMPTE_PORTAIL_PCT, configDepart, planPortail, STYLES_PORTAIL, type SlugPortail } from "../src/lib/portails.ts";
import { ORDRE_MODELES, TXT, formatCote, formatMetre, type PrixVitrine } from "../src/lib/portails-page.ts";
import { TEXTES_PORTAIL } from "../src/lib/portails-textes.ts";
import { typo } from "../src/lib/typographie.ts";
import { aucunPrixVitrine, donneesPagePortails, verifierPrixPage } from "../src/lib/portails-outil/donnees-page.ts";
import { getProduct } from "../src/lib/products.ts";
import { COULEURS_PORTAIL } from "../src/lib/portails-base.ts";

const RACINE = join(import.meta.dirname, "..");
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");
const LANGUES = ["fr", "en"] as const;
const NBSP = "\xa0";
/** Le texte comme un lecteur le pense : les insécables redeviennent des espaces (pour comparer des mots, pas des espaces). */
const plat = (texte: string) => texte.replace(/\xa0/g, " ");

/** Toutes les chaînes d'un objet de textes (en profondeur) ; une fonction est appelée avec trois arguments de texte. */
function chaines(valeur: unknown, chemin = ""): { chemin: string; texte: string }[] {
  if (typeof valeur === "string") return [{ chemin, texte: valeur }];
  if (typeof valeur === "function") return chaines((valeur as (...a: unknown[]) => unknown)("A", "B", "C"), `${chemin}()`);
  if (Array.isArray(valeur)) return valeur.flatMap((v, i) => chaines(v, `${chemin}[${i}]`));
  if (valeur && typeof valeur === "object") return Object.entries(valeur).flatMap(([k, v]) => chaines(v, `${chemin}.${k}`));
  return [];
}
/** Les clés d'un objet de textes, en profondeur ; une fonction ou une chaîne compte comme une feuille. */
function cles(o: unknown, prefixe = ""): string[] {
  if (o === null || typeof o !== "object" || Array.isArray(o)) return [prefixe];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => cles(v, `${prefixe}.${k}`));
}
const unite = /\d (?:km|cm|mm|m|%|€)(?![\p{L}\d])/u;
const ponctuationFr = / [?!:;»]|« /;

// ---------------------------------------------------------------------------------------------------------------------------------
// Mêmes clés, insécables
// ---------------------------------------------------------------------------------------------------------------------------------
test("textes : le français et l'anglais ont les mêmes clés (page des portails, fiche et guide)", () => {
  assert.deepEqual(cles(TXT.fr), cles(TXT.en), "portails-page.ts");
  assert.deepEqual(cles(TEXTES_PORTAIL.fr), cles(TEXTES_PORTAIL.en), "portails-textes.ts");
  for (const [nom, t] of [["TXT", TXT], ["TEXTES_PORTAIL", TEXTES_PORTAIL]] as const) {
    assert.equal(chaines(t.fr).length, chaines(t.en).length, `${nom} : autant de textes dans chaque langue`);
    for (const l of LANGUES) for (const { chemin, texte } of chaines(t[l])) assert.ok(texte.trim().length > 0 || /etudierEn$/.test(chemin), `${nom}.${l}${chemin} : texte vide`);
  }
});

test("espaces insécables : aucune espace simple entre un nombre et son unité, ni avant « : ; ? ! » en français (TXT et TEXTES_PORTAIL)", () => {
  const fautes: string[] = [];
  for (const [nom, t] of [["TXT", TXT], ["TEXTES_PORTAIL", TEXTES_PORTAIL]] as const) {
    for (const l of LANGUES) {
      for (const { chemin, texte } of chaines(t[l])) {
        if (unite.test(texte)) fautes.push(`${nom}.${l}${chemin} : nombre et unité séparés par une espace simple : « ${texte.slice(0, 90)} »`);
        if (l === "fr" && ponctuationFr.test(texte)) fautes.push(`${nom}.${l}${chemin} : espace simple avant « : ; ? ! » ou après « : « ${texte.slice(0, 90)} »`);
      }
    }
  }
  assert.deepEqual(fautes, []);
  // Ce que le test voit : un texte écrit à la main sans insécable serait repéré.
  assert.ok(unite.test("45 km de Saumur") && ponctuationFr.test("Quel portail ?"));
  assert.ok(!unite.test(`45${NBSP}km`) && !ponctuationFr.test(`Quel portail${NBSP}?`));
});

test("espaces insécables : les cotes et les mètres de la page les portent déjà (formatMetre, formatCote), et la cote ne se coupe pas", () => {
  for (const l of LANGUES) {
    assert.ok(formatMetre(3500, l).includes(`${NBSP}m`));
    assert.equal(formatCote(3500, 1600, l).split(NBSP).length, 4, "3,50 | × | 1,60 | m");
    assert.ok(!formatCote(3500, 1600, l).includes(" "), "aucune espace simple dans une cote");
    // Une phrase faite avec ces cotes : les textes de la page ne les séparent plus.
    const phrase = TXT[l].vitrine.cote(formatMetre(3500, l), formatMetre(1600, l));
    assert.ok(!unite.test(phrase), phrase);
  }
});

test("typographie : nombre + unité, ponctuation française, jamais de mot seul en fin de phrase longue ; rejouée, elle ne change plus rien", () => {
  assert.equal(typo("jusqu'à 45 km de Saumur ; au-delà", "fr"), `jusqu'à 45${NBSP}km de Saumur${NBSP};${NBSP}au-delà`);
  assert.equal(typo("acompte de 40 % puis 16 cm", "fr"), `acompte de 40${NBSP}% puis 16${NBSP}cm`);
  assert.equal(typo("« Dès » : portail", "fr"), `«${NBSP}Dès${NBSP}»${NBSP}: portail`);
  assert.equal(typo("3,50 × 1,60 m", "fr"), `3,50${NBSP}×${NBSP}1,60${NBSP}m`);
  // L'anglais : seulement le nombre et son unité (pas de blanc avant « : » ni « ? »).
  assert.equal(typo("a 3.50 m opening: what?", "en"), `a 3.50${NBSP}m opening: what?`);
  assert.equal(typo("40 % deposit", "en"), `40${NBSP}% deposit`);
  // « 6 mois », « 3 mètres » : l'unité n'est pas le début d'un mot.
  assert.equal(typo("6 mois de délai", "fr"), "6 mois de délai");
  // Les deux derniers mots d'une phrase longue restent ensemble ; un libellé court n'est pas touché.
  assert.equal(typo("Le solde se règle à la réception du portail posé.", "fr"), `Le solde se règle à la réception du portail${NBSP}posé.`);
  assert.equal(typo("Lames chêne", "fr"), "Lames chêne");
  for (const [s, l] of [["jusqu'à 45 km de Saumur ; au-delà, la route s'ajoute.", "fr"], ["Which gate for my entrance? 3.50 m", "en"]] as const) assert.equal(typo(typo(s, l), l), typo(s, l));
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Les chiffres du texte sont ceux du code
// ---------------------------------------------------------------------------------------------------------------------------------
/** « Place le long de la clôture » du moteur pour un coulissant de ce passage : la longueur libre demandée à la clôture, en mm. */
function placeLeLongDeLaCloture(P: number, guidage: "rail" | "auto"): number {
  const plan = planPortail("portail-coulissant", { ...configDepart("portail-coulissant"), P, guidage }) as unknown as { resume: [string, string][] };
  const ligne = plan.resume.find(([cle]) => cle === "Place le long de la clôture");
  assert.ok(ligne, "le moteur donne « Place le long de la clôture »");
  return Number(ligne[1].replace(/\D/g, ""));
}
const metres = (mm: number, l: "fr" | "en") => (mm / 1000).toFixed(2).replace(".", l === "fr" ? "," : ".");

test("coulissant sur rail : le moteur demande le passage + 160 mm, et le site écrit « le passage plus 16 cm » partout", () => {
  const supplements = [2000, 3500, 5000].map((P) => placeLeLongDeLaCloture(P, "rail") - P);
  assert.deepEqual(supplements, [160, 160, 160], "le moteur : passage + 160 mm");
  const cm = supplements[0] / 10;
  const exemple = placeLeLongDeLaCloture(3500, "rail");
  for (const l of LANGUES) {
    const t = TXT[l], tp = TEXTES_PORTAIL[l];
    const mot = l === "fr" ? "le passage plus" : "the opening plus";
    for (const [nom, texte] of [["place du coulissant", t.modeles.place["portail-coulissant"]], ["guideAide[1]", tp.guideAide[1]], ["guideVerif[1]", tp.guideVerif[1]]] as const) {
      assert.ok(plat(texte).includes(`${mot} ${cm} cm`), `${l} ${nom} : « ${texte} »`);
      assert.doesNotMatch(texte, /15 cm|aussi long|as long as/, `${l} ${nom}`);
    }
    for (const [nom, texte] of [["guideAide[1]", tp.guideAide[1]], ["guideVerif[1]", tp.guideVerif[1]]] as const) assert.ok(texte.includes(`${metres(exemple, l)}${NBSP}m`), `${l} ${nom} : ${metres(exemple, l)} m pour un passage de 3,50 m`);
  }
  // La fiche du coulissant dit la même chose, en français et en anglais.
  const fiche = getProduct("portail-coulissant")!;
  const fr = JSON.stringify(fiche), en = JSON.stringify((fiche as unknown as { en: unknown }).en);
  assert.match(fr, /le passage plus 16 cm/); assert.match(fr, /le passage \+ 16 cm/); assert.doesNotMatch(fr, /passage (?:plus|\+) 15 cm/);
  assert.match(en, /the opening plus 16 cm/); assert.doesNotMatch(en, /plus 15 cm/);
  assert.match(lire("src/lib/portails-base.ts"), /passage \+ 16 cm/);
});

test("coulissant sans rail : « environ 5,30 m pour 3,50 m » est la place que le moteur demande, à 5 cm près", () => {
  const mm = placeLeLongDeLaCloture(3500, "auto");
  assert.ok(Math.abs(mm - 5300) <= 50, `le moteur : ${mm} mm`);
  assert.match(plat(TEXTES_PORTAIL.fr.guideVerif[2]), /environ 5,30 m pour 3,50 m/);
  assert.match(plat(TEXTES_PORTAIL.en.guideVerif[2]), /around 5\.30 m for 3\.50 m/);
});

test("l'acompte écrit sur la page est ACOMPTE_PORTAIL_PCT, et la page ne l'écrit pas en dur", () => {
  assert.equal(ACOMPTE_PORTAIL_PCT, 40, "la valeur du code (portails-base.ts)");
  assert.ok(TXT.fr.etapes.liste[1].d.includes(`${ACOMPTE_PORTAIL_PCT}${NBSP}%`), TXT.fr.etapes.liste[1].d);
  assert.ok(TXT.en.etapes.liste[1].d.includes(`${ACOMPTE_PORTAIL_PCT}${NBSP}%`) || TXT.en.etapes.liste[1].d.includes(`${ACOMPTE_PORTAIL_PCT}%`), TXT.en.etapes.liste[1].d);
  const source = lire("src/lib/portails-page.ts");
  assert.match(source, /\$\{ACOMPTE_PORTAIL_PCT\}/);
  assert.doesNotMatch(source, /\b40 ?%/, "aucun « 40 % » écrit à la main dans portails-page.ts");
  // La visite se règle avec l'acompte et se déduit du solde (CGV, article 4) : l'étape le dit.
  assert.match(plat(TXT.fr.etapes.liste[1].d), /acompte de .* et la visite de prise de cotes \(déduite du solde\)/);
  assert.match(plat(TXT.en.etapes.liste[1].d), /deposit online, plus the survey visit, which is deducted from the balance/);
  // portails.ts le ré-exporte : une seule valeur pour le site.
  assert.match(lire("src/lib/portails.ts"), /export \{ ACOMPTE_PORTAIL_PCT,/);
  assert.doesNotMatch(lire("src/lib/portails.ts"), /ACOMPTE_PORTAIL_PCT = 40/);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Ce que disent les cartes, la vitrine et le guide
// ---------------------------------------------------------------------------------------------------------------------------------
test("légende des « dès » : courte, sans aucune cote écrite à la main ; les cotes de chaque carte viennent de configDepart", () => {
  for (const l of LANGUES) {
    const legende = TXT[l].modeles.legende;
    assert.doesNotMatch(legende, /\d/, `${l} : aucun chiffre dans la légende (les cotes sont sur les cartes, depuis le serveur)`);
    assert.ok(legende.split(/\s+/).length <= 40, `${l} : ${legende.split(/\s+/).length} mots`);
    assert.match(legende, l === "fr" ? /à retirer à l'atelier/ : /to collect from the workshop/, `${l} : « sans pose » veut dire à retirer à l'atelier`);
    assert.match(legende, l === "fr" ? /sans moteur/ : /without motor/);
    // La cote d'une carte est celle de configDepart, avec ses insécables.
    for (const slug of ORDRE_MODELES) {
      const c = configDepart(slug);
      const ligne = TXT[l].modeles.ligneStyle("Lisse", formatCote(c.P, c.H, l), slug);
      assert.ok(ligne.includes(formatCote(c.P, c.H, l)), ligne);
      assert.match(plat(ligne), l === "fr" ? /Lisse, thermolaqué · / : /Lisse, powder-coated · /, "le « dès » est un prix thermolaqué : chaque carte le dit");
    }
    assert.match(plat(TXT[l].modeles.ligneStyle("Lisse", "x", "portail-coulissant")), l === "fr" ? /· sur rail · x/ : /· on a rail · x/);
    // Le séparateur « · » reste collé au mot qui le précède : jamais en début de ligne.
    assert.ok(!/ · /.test(TXT[l].modeles.ligneStyle("Lisse", "x", "portail-coulissant")));
    assert.match(plat(TXT[l].modeles.ligneStyleSansRail("Lisse", "x")), l === "fr" ? /thermolaqué · sans rail · x/ : /powder-coated · no rail · x/);
  }
});

test("« sans pose » : le résultat du guide et la vitrine disent « à retirer à l'atelier », le résultat dit aussi « thermolaqué »", () => {
  assert.equal(plat(TXT.fr.guide.sansPose("1 780 €")), "1 780 € sans pose, à retirer à l'atelier");
  assert.equal(plat(TXT.en.guide.sansPose("€1,780")), "€1,780 without fitting, to collect from the workshop");
  assert.equal(plat(TXT.fr.vitrine.sansPose("1 780 €")), "1 780 € sans pose, à retirer à l'atelier");
  assert.equal(plat(TXT.en.vitrine.sansPose("€1,780")), "€1,780 without fitting, to collect from the workshop");
  assert.match(TXT.fr.guide.posedes("X"), /thermolaqué/);
  assert.match(TXT.en.guide.posedes("X"), /powder-coated/);
  // La vitrine garde le prix seul, sans « dès » (c'est le prix du style affiché).
  assert.doesNotMatch(TXT.fr.vitrine.pose, /dès/);
});

test("vitrine : la cote définit « passage », la matière brute dit la patine, la matière laquée explique « thermolaqué »", () => {
  assert.equal(TXT.fr.vitrine.cote(formatMetre(3500, "fr"), formatMetre(1600, "fr")), `Pour un passage de 3,50${NBSP}m entre vos piliers, 1,60${NBSP}m de haut, sans${NBSP}moteur.`);
  assert.equal(TXT.en.vitrine.cote(formatMetre(3500, "en"), formatMetre(1600, "en")), `For a 3.50${NBSP}m opening between your pillars, 1.60${NBSP}m high, without${NBSP}motor.`);
  assert.equal(plat(TXT.fr.vitrine.matiere.brut), "Acier galvanisé à chaud, sans peinture : gris zinc qui se patine avec le temps");
  assert.equal(plat(TXT.fr.vitrine.matiere.toleBrut), "Acier prégalvanisé, sans peinture : gris zinc qui se patine avec le temps");
  assert.match(plat(TXT.en.vitrine.matiere.brut), /unpainted: zinc grey that develops a patina over time/);
  assert.match(TXT.en.vitrine.matiere.toleBrut, /^Pre-galvanised steel, unpainted/);
  for (const k of ["aluLaque", "acierLaque", "toleLaque"] as const) assert.match(plat(TXT.fr.vitrine.matiere[k]), /thermolaqué \(peint au four\)/);
  // En galvanisé brut tous les styles sont en acier : aucune note ne dit « alu » (les notes de substitution sont dans notesBrut).
  for (const l of LANGUES) for (const note of Object.values(TXT[l].vitrine.notesBrut)) assert.doesNotMatch(note ?? "", /\balu(?:minium)?\b/i, note);
});

test("faits, guide, étapes : les corrections de la relecture", () => {
  assert.equal(plat(TXT.fr.guide.sous), "3 questions sur la place dont vous disposez.");
  assert.equal(plat(TXT.en.guide.sous), "3 questions about the space you have.");
  for (const l of LANGUES) assert.doesNotMatch(TXT[l].guide.sous, /sans rien mesurer|no measuring/);
  assert.match(TXT.fr.faits[2].d, /selon le style et la teinte/);
  assert.match(TXT.fr.etapes.liste[3].d, /Sans pose\xa0: retrait à l'atelier, ou livraison en\xa0supplément/);
  assert.match(plat(TXT.en.etapes.liste[3].d), /Without fitting: collection from the workshop, or delivery at extra cost/);
  // Le fait « Posé par l'atelier » dit la même chose que l'étape 2 et la fiche (13/10/2026) : la visite se règle avec l'acompte puis se
  // déduit du solde, et la route ne s'ajoute qu'au-delà de 45 km (limite du prix posé, portails-outil/prix.ts) ; plus jamais « visite comprise ».
  assert.equal(plat(TXT.fr.faits[1].d), "Visite de prise de cotes réglée avec l'acompte, puis déduite du solde ; au-delà de 45 km de Saumur, la route s'ajoute.");
  assert.equal(plat(TXT.en.faits[1].d), "Survey visit paid with the deposit, then deducted from the balance; beyond 45 km from Saumur, travel is added.");
  for (const l of LANGUES) assert.doesNotMatch(plat(TXT[l].faits[1].d), /comprise|included/i, `${l} : la visite n'est pas « comprise » (elle se règle puis se déduit)`);
  assert.match(plat(TXT.fr.etapes.liste[1].d), /visite de prise de cotes \(déduite du solde\)/);
  assert.match(plat(TXT.en.etapes.liste[1].d), /survey visit, which is deducted from the balance/);
  // Un seul mot pour « vers où s'ouvre le portail » dans le guide : l'intérieur.
  assert.match(plat(TXT.fr.guide.schema[0]), /vers l'intérieur/);
  assert.match(plat(TEXTES_PORTAIL.fr.guideQ[0]), /vers l'intérieur/);
});

test("anglais : les mots du site (« railings », « Laser-cut sheet », « Space needed »), jamais « balustrade », « Cut sheet », « Room: »", () => {
  const en = JSON.stringify([TXT.en, TEXTES_PORTAIL.en], (_k, v) => (typeof v === "function" ? v("A", "B", "C") : v));
  assert.doesNotMatch(en, /balustrade/i);
  assert.doesNotMatch(en, /\bCut sheet|Room:|Compose this gate|Which gate suits me/);
  assert.equal(TEXTES_PORTAIL.en.styles.tole, "Laser-cut sheet");
  assert.equal(TEXTES_PORTAIL.en.remp.tole, "Laser-cut sheet");
  assert.match(plat(TEXTES_PORTAIL.en.stylesNote.rosace), /like our railings/);
  assert.match(plat(TEXTES_PORTAIL.en.stylesNote.volutes), /wrought-iron style scrolls/);
  assert.match(plat(TEXTES_PORTAIL.fr.stylesNote.volutes), /volutes façon fer forgé/);
  for (const slug of ["portail-battant", "portail-coulissant", "portail-pliant"] as SlugPortail[]) {
    assert.match(TXT.fr.modeles.place[slug], /^Place nécessaire/);
    assert.match(TXT.en.modeles.place[slug], /^Space needed/);
  }
  assert.match(TXT.fr.modeles.placeSansRail, /^Place nécessaire/);
  assert.match(TXT.en.modeles.placeSansRail, /^Space needed/);
});

test("alt : le style s'écrit toujours en minuscules ; la mention d'illustration est sur la vitrine et le résultat du guide, pas sur les cartes ; rail et sans rail se distinguent", () => {
  for (const l of LANGUES) {
    const t = TXT[l];
    const mention = l === "fr" ? /image d'illustration/ : /\(illustration\)/;
    assert.match(t.vitrine.alt("Lames chêne", "Gris anthracite"), l === "fr" ? /style lames chêne, gris anthracite/ : /lames chêne style, gris anthracite/);
    assert.match(t.vitrine.alt("Lames chêne", "Gris anthracite"), mention);
    assert.match(t.guide.alt("Portail battant", "Lisse"), mention);
    assert.match(t.guide.altGuidage("Portail coulissant", "Lisse", "auto"), mention);
    assert.doesNotMatch(t.modeles.alt("Portail battant", "Lisse"), mention, "cartes : pas de mention répétée");
    assert.doesNotMatch(t.modeles.altGuidage("Portail coulissant", "Lisse", "rail"), mention);
    for (const [rail, auto] of [[t.modeles.altGuidage("Portail coulissant", "Lisse", "rail"), t.modeles.altGuidage("Portail coulissant", "Lisse", "auto")], [t.guide.altGuidage("Portail coulissant", "Lisse", "rail"), t.guide.altGuidage("Portail coulissant", "Lisse", "auto")]]) assert.notEqual(rail, auto);
    assert.ok(t.modeles.alt("Portail battant", "Lisse").toLowerCase().includes("lisse"));
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Un build sans clé de chiffrage
// ---------------------------------------------------------------------------------------------------------------------------------
const prixNuls = (): PrixVitrine => {
  const sans = { pose: null, sansPose: null, poseMax: null, sansPoseMax: null };
  const table = () => Object.fromEntries(STYLES_PORTAIL.map((s) => [s, { ...sans }]));
  return { laque: table(), brut: table() } as PrixVitrine;
};

test("sans aucun prix, la page prévient : un avertissement net hors production, une erreur claire sur Vercel en production", () => {
  const nuls = { vitrine: prixNuls() };
  assert.equal(aucunPrixVitrine(nuls), true);
  const avertissements: string[] = [];
  // En développement et pendant les tests : un avertissement, jamais d'erreur.
  verifierPrixPage(nuls, {}, (m) => avertissements.push(m));
  verifierPrixPage(nuls, { VERCEL_ENV: "preview" }, (m) => avertissements.push(m));
  verifierPrixPage(nuls, { NODE_ENV: "test" }, (m) => avertissements.push(m));
  assert.equal(avertissements.length, 3);
  assert.match(avertissements[0], /aucun prix/);
  assert.match(avertissements[0], /CHIFFRAGE_GARDE_CORPS_CLE/);
  // Sur Vercel en production : le déploiement échoue.
  assert.throws(() => verifierPrixPage(nuls, { VERCEL_ENV: "production" }, () => assert.fail("pas d'avertissement : une erreur")), /Déploiement refusé/);
  // Un seul prix suffit : rien à signaler, même en production.
  const unPrix = prixNuls();
  unPrix.laque.lisse = { pose: 2570, sansPose: 1780, poseMax: null, sansPoseMax: null };
  assert.equal(aucunPrixVitrine({ vitrine: unPrix }), false);
  verifierPrixPage({ vitrine: unPrix }, { VERCEL_ENV: "production" }, () => assert.fail("pas d'avertissement"));
  // Les vrais prix de la page (la clé est présente pour les tests).
  const vrais = donneesPagePortails();
  assert.equal(aucunPrixVitrine(vrais), false);
  verifierPrixPage(vrais, { VERCEL_ENV: "production" }, () => assert.fail("pas d'avertissement"));
});

test("un vrai serveur sans la clé : la page prévient (hors production) ou fait échouer le déploiement (VERCEL_ENV=production)", () => {
  const dossier = mkdtempSync(join(tmpdir(), "portails-sans-cle-"));
  try {
    const adresseModule = pathToFileURL(join(RACINE, "src/lib/portails-outil/donnees-page.ts")).href;
    const code = `import { donneesPagePortails } from ${JSON.stringify(adresseModule)}; try { donneesPagePortails(); console.log("PAGE-OK"); } catch (e) { console.log("PAGE-ERREUR " + e.message); }`;
    const lancer = (dossierCourant: string, vercel?: string, avecCle = false) => {
      const env: Record<string, string | undefined> = { ...process.env, VERCEL_ENV: vercel };
      if (!avecCle) delete env.CHIFFRAGE_GARDE_CORPS_CLE;
      if (vercel === undefined) delete env.VERCEL_ENV;
      return spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", code], { cwd: dossierCourant, env: env as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60000 });
    };
    // Sans clé (le dossier courant n'a pas de .env.chiffrage.local), hors Vercel : un avertissement, la page se construit.
    const dev = lancer(dossier);
    assert.match(dev.stdout, /PAGE-OK/);
    assert.match(dev.stderr, /\[page des portails\] aucun prix/);
    // Sans clé, sur Vercel en production : l'erreur claire.
    const prod = lancer(dossier, "production");
    assert.match(prod.stdout, /PAGE-ERREUR \[page des portails\] aucun prix/);
    assert.match(prod.stdout, /Déploiement refusé/);
    // Avec la clé (le dossier du site), même en production : tout va bien et rien n'est dit.
    const bon = lancer(RACINE, "production");
    assert.match(bon.stdout, /PAGE-OK/);
    assert.doesNotMatch(bon.stderr, /page des portails/);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Les pièces partagées (lues dans le source)
// ---------------------------------------------------------------------------------------------------------------------------------
test("globals.css : le chevron « › » des liens fléchés sort du nom accessible, avec un repli pour les navigateurs qui ne connaissent pas l'écriture", () => {
  const css = lire("src/app/globals.css");
  assert.match(css, /\.lien-fleche::after \{\s*content: "\\203A";/, "la déclaration d'origine reste");
  assert.match(css, /@supports \(content: "a" \/ "b"\) \{\s*\.lien-fleche::after \{\s*content: "\\203A" \/ "";/);
  // Tout autre ::before / ::after à contenu : vide (décoratif). Seul le chevron porte un texte.
  const sansCondition = css.replace(/@supports \([^)]*\)/g, "@supports");
  const contenus = [...sansCondition.matchAll(/content:\s*("(?:[^"\\]|\\.)*")/g)].map((m) => m[1]).filter((c) => c !== '""');
  assert.deepEqual([...new Set(contenus)], ['"\\203A"']);
});

test("EtapesFabrication : le chiffre a une largeur fixe, le remplissage est dans le conteneur (comme les autres sections), les réglages d'origine restent", () => {
  const source = lire("src/components/etapes-fabrication.tsx");
  assert.match(source, /<section className=\{bande\}>/, "plus de px-6 sur la section");
  assert.match(source, /<div className="mx-auto max-w-6xl px-6">/);
  assert.match(source, /w-\[0\.55em\] shrink-0[^"]*lg:block lg:w-auto/, "chiffre à largeur fixe sur la ligne mobile, libre au-dessus de la colonne");
});

test("page-portails.tsx : la phrase de tête est équilibrée, les paragraphes évitent les veuves, le numéro de téléphone se touche sur 44 px", () => {
  const source = lire("src/components/portail/page-portails.tsx");
  assert.match(source, /className="pp-phrase [^"]*text-balance/);
  assert.match(source, /text-pretty text-\[15px\]/, "faits");
  assert.match(source, /<p className="mt-4 max-w-\[34em\] text-pretty/, "contact");
  assert.match(source, /\[&_p\]:text-pretty/, "descriptions des étapes");
  const lienTel = source.match(/<a href=\{`tel:\$\{CONTACT_PUBLIC\.telephone\}`\} className=\{`([^`]*)`\}>\s*\{telephone\}/);
  assert.ok(lienTel, "le lien du numéro");
  assert.match(lienTel[1], /\binline-block\b/);
  assert.match(lienTel[1], /\bpy-3\b/);
  assert.match(lienTel[1], /-my-3\b/, "marges négatives égales : la ligne ne bouge pas");
  // Plus de filtre local : les insécables sont dans les textes.
  assert.doesNotMatch(source, /const f = /);
});

test("les noms des teintes et des styles restent ceux du site (couleurs : 6, styles : 7)", () => {
  assert.equal(COULEURS_PORTAIL.length, 6);
  assert.equal(STYLES_PORTAIL.length, 7);
  for (const l of LANGUES) {
    assert.equal(Object.keys(TEXTES_PORTAIL[l].couleur).length, COULEURS_PORTAIL.length);
    assert.equal(Object.keys(TEXTES_PORTAIL[l].styles).length, STYLES_PORTAIL.length);
    assert.equal(Object.keys(TEXTES_PORTAIL[l].stylesNote).length, STYLES_PORTAIL.length);
  }
});
