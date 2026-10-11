/**
 * Les mots que le site n'écrit jamais (plan de référencement, 0 bis, liste « Jamais », et T16).
 *
 * « Premium », « luxe », « le seul », « certifié », « artisan d'art »… : soit ils sont faux, soit ils ne se prouvent
 * pas, soit la loi les réserve. Ce test les cherche dans les deux dictionnaires et dans le catalogue
 * (src/lib/products.ts, français et anglais), avec des limites de mot : « il travaille seul » reste permis,
 * « le seul » non ; « ébénisterie » (Quentin a exercé en ébénisterie) reste permis, « ébéniste » non.
 *
 * « fer forgé » : seulement « style fer forgé » ou « façon fer forgé » (en anglais « wrought-iron style »), sauf sur
 * la fiche du Garde-corps forgé à volutes, où c'est vrai (volutes du commerce en fer forgé).
 *
 * Et jamais une phrase qui laisse entendre qu'une pièce devra être réparée (« se répare », « réparable ») :
 * Quentin, 10/10/2026.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { products, SLUG_GC_FORGE } from "../src/lib/products.ts";

const RACINE = join(import.meta.dirname, "..");
const fr = readFileSync(join(RACINE, "src/app/[lang]/dictionaries/fr.json"), "utf8");
const en = readFileSync(join(RACINE, "src/app/[lang]/dictionaries/en.json"), "utf8");

/** Une lettre, accents compris : la limite d'un mot. */
const L = "\\p{L}";
const mot = (source: string, drapeaux = "iu") => new RegExp(`(?<![${L}\\d])(?:${source})(?![${L}\\d])`, drapeaux);

const JAMAIS_FR: [string, RegExp][] = [
  ["premium", mot("premium")],
  ["luxe", mot("luxe|luxueu(?:x|se|ses)")],
  ["d'exception", mot("d['’]exception")],
  ["n° 1", mot("n°\\s?1")],
  ["le seul / la seule", mot("(?:le|la) seule?")],
  // « dès le premier repas » reste permis : seule la revendication (« le premier atelier ») est visée.
  ["le premier", mot("(?:le|la) premi(?:er|ère) (?:atelier|métallier|artisan|fabricant)|le premier à")],
  ["leader", mot("leader")],
  ["le meilleur", mot("(?:le|la) meilleure?")],
  // Les prestataires (Stripe « certifié PCI DSS », « certifiée au cadre » de transfert) restent permis : seul l'atelier est visé.
  ["certifié", mot("certifiée?s?(?![\\s\\u00a0](?:PCI|au[\\s\\u00a0]cadre)|, par le cadre)")],
  ["« NF » sans son numéro", /(?<![\p{L}\d])NF(?![\s\u00a0](?:P[\s\u00a0]?\d|EN[\s\u00a0]?\d|DTU))(?![\p{L}\d])/u],
  ["artisan d'art", mot("artisans? d['’]art")],
  ["maître artisan", mot("ma[îi]tres? artisans?")],
  ["meilleur ouvrier", mot("meilleurs? ouvriers?")],
  ["ferronnier d'art", mot("ferronniers? d['’]art")],
  ["IA", mot("IA", "u")],
  ["3D", mot("3D", "u")],
  ["généré", mot("générée?s?")],
  ["forgé à la main", mot("forgée?s? à la main")],
  ["ébéniste", mot("ébénistes?")],
  ["menuisier", mot("menuisiers?")],
  ["forgeron", mot("forgerons?")],
  ["marques de concurrents", mot("Barrisol|Clipso|Crittall|Ethnicraft|Roche Bobois")],
  ["100 % français", mot("100\\s?%\\s?français")],
  ["Origine France Garantie", mot("Origine France Garantie")],
  ["Entreprise du Patrimoine Vivant", mot("Entreprise du Patrimoine Vivant")],
  // « posé chez vous » (un service) reste permis ; « posé chez » un client, sous un visuel, non.
  ["« posé chez »", mot("posée?s? chez(?! vous)")],
  ["« plusieurs années » (Australie)", mot("plusieurs années")],
  ["forêts gérées durablement", mot("forêts? gérées? durablement")],
  ["PEFC / FSC", mot("PEFC|FSC", "u")],
  ["« se répare », « réparable »", mot("se répar(?:e|ent|er)|réparables?")],
];

const JAMAIS_EN: [string, RegExp][] = [
  ["luxury", mot("luxury|luxurious")],
  ["premium", mot("premium")],
  ["blacksmith", mot("blacksmiths?")],
  ["master craftsman", mot("master craftsm[ae]n")],
  ["certified", mot("(?<!DSS )certified(?! under)")],
  ["the only", mot("the only (?:workshop|metalworker|maker|craftsman|one in)")],
  ["the first", mot("the first (?:workshop|metalworker|maker|craftsman)")],
  ["No. 1", mot("No\\.\\s?1")],
  ["leader", mot("leader")],
  ["the best", mot("the best")],
  ["AI", mot("AI", "u")],
  ["CGI", mot("CGI", "u")],
  ["3D", mot("3D", "u")],
  ["generated", mot("generated")],
  ["repairable", mot("repairable|is repaired rather than")],
  ["competitor brands", mot("Barrisol|Clipso|Crittall|Ethnicraft|Roche Bobois")],
];

/** « fer forgé » seul : permis seulement après « style » ou « façon ». */
const FER_FORGE_SEUL = /(?<!(?:style|façon) )fer forgé/iu;
/** « wrought iron » seul : permis seulement en « wrought-iron style ». */
const WROUGHT_IRON_SEUL = /wrought[- ]iron(?![- ]style)/iu;

/** Les lignes d'un texte où un motif apparaît, pour un message lisible. */
function lignes(texte: string, motif: RegExp): string[] {
  return texte
    .split("\n")
    .filter((ligne) => motif.test(ligne))
    .map((ligne) => ligne.trim().slice(0, 160));
}

/** Tous les mots interdits trouvés dans un texte, « libellé : ligne », pour tout voir d'un coup. */
function trouves(nom: string, texte: string, liste: [string, RegExp][]): string[] {
  return liste.flatMap(([libelle, motif]) => lignes(texte, motif).map((ligne) => `${nom} — ${libelle} : ${ligne}`));
}

/** Le catalogue, une fiche à la fois : ses textes français, puis ses textes anglais. */
const fiches = products.map((p) => {
  const { en: anglais, ...francais } = p as typeof p & { en?: unknown };
  return { slug: p.slug, fr: JSON.stringify(francais, null, 1), en: JSON.stringify(anglais ?? {}, null, 1) };
});

test("aucun mot de la liste « Jamais » dans les dictionnaires", () => {
  assert.deepEqual([...trouves("fr.json", fr, JAMAIS_FR), ...trouves("en.json", en, JAMAIS_EN)], []);
});

test("aucun mot de la liste « Jamais » dans le catalogue", () => {
  assert.deepEqual(
    fiches.flatMap((fiche) => [...trouves(`${fiche.slug} (fr)`, fiche.fr, JAMAIS_FR), ...trouves(`${fiche.slug} (en)`, fiche.en, JAMAIS_EN)]),
    [],
  );
});

test("« fer forgé » : seulement « style » ou « façon fer forgé », sauf sur la fiche du garde-corps forgé à volutes", () => {
  assert.deepEqual(lignes(fr, FER_FORGE_SEUL), [], "fr.json");
  assert.deepEqual(lignes(en, WROUGHT_IRON_SEUL), [], "en.json");
  for (const fiche of fiches) {
    if (fiche.slug === SLUG_GC_FORGE) continue;
    assert.deepEqual(lignes(fiche.fr, FER_FORGE_SEUL), [], fiche.slug);
    assert.deepEqual(lignes(fiche.en, WROUGHT_IRON_SEUL), [], `${fiche.slug} (en)`);
  }
});

test("les motifs reconnaissent ce qu'ils doivent, et laissent passer le reste", () => {
  const seul = JAMAIS_FR.find(([l]) => l.startsWith("le seul"))![1];
  assert.ok(seul.test("le seul atelier"));
  assert.ok(!seul.test("il travaille seul"));
  const ebeniste = JAMAIS_FR.find(([l]) => l === "ébéniste")![1];
  assert.ok(ebeniste.test("un ébéniste"));
  assert.ok(!ebeniste.test("j'ai exercé en ébénisterie"));
  const nf = JAMAIS_FR.find(([l]) => l.startsWith("« NF »"))![1];
  assert.ok(nf.test("garde-corps NF"));
  assert.ok(!nf.test("la norme NF P01-012"));
  assert.ok(!FER_FORGE_SEUL.test("garde-corps style fer forgé"));
  assert.ok(!FER_FORGE_SEUL.test("façon fer forgé"));
  assert.ok(FER_FORGE_SEUL.test("un garde-corps en fer forgé"));
  assert.ok(!WROUGHT_IRON_SEUL.test("wrought-iron style railing"));
  assert.ok(WROUGHT_IRON_SEUL.test("a wrought iron railing"));
});
