// Extraire le moteur garde-corps de l'outil de plans, SANS rien réécrire.
//
//   npm run garde-corps:extraire -- "<chemin de plans-atelier.html>"              écrit les fichiers
//   npm run garde-corps:extraire -- "<chemin de plans-atelier.html>" --verifier   ne touche à rien : compare
//   … --nouvelle-cle   la toute première fois seulement (crée la clé locale du chiffrage)
//
// L'outil n'entre jamais dans le dépôt : il contient les coûts de l'atelier. Ce script en COPIE, telles
// quelles (seuls les commentaires sont retirés), les déclarations utiles au site, et écrit :
//   src/lib/garde-corps-outil/moteur.genere.mjs     la norme NF P01-012, la géométrie, le débit, les dessins ;
//                                                   sans coûts (les notes d'achat entre parenthèses sont retirées) ;
//   src/lib/garde-corps-outil/devis.genere.mjs      le devis au format du site ; sans coûts (le prix est une entrée) ;
//   src/lib/garde-corps-outil/chiffrage.chiffre.mjs REGLAGES, TARIFS, CONSO, TEMPS_REF, chiffrerGC, remiseGC,
//                                                   CHIFFRÉS : le dépôt GitHub est public ;
//   (et un .d.mts à côté de chacun, pour TypeScript)
//   tests/reference/garde-corps-outil.json          ce que l'OUTIL LUI-MÊME répond (chargé tel quel dans node:vm, avec
//                                                   un faux DOM) sur une série de cas : prix de vente et empreintes,
//                                                   jamais un coût ;
//   src/lib/garde-corps-coupes.genere.ts            les coupes de main courante dessinées par l'outil ;
//   src/lib/garde-corps-decors.genere.ts            le décor à volutes : assemblages, formes permises, noms (sans coûts) ;
//   public/garde-corps/decors/*.svg                 une vignette par décor, dessinée par l'outil (calculerGC, svgDe).
// Avant d'écrire quoi que ce soit, il fait tourner l'outil et le code extrait côte à côte et refuse au
// moindre écart.
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { acorn, analyser, controlerModule, extraireScript, fermeture, GLOBAUX_PERMIS, libres } from "./outil-plans/analyse.mjs";
import { preparerOutil } from "./outil-plans/charger-outil.mjs";
import { chainesSecretes, DECLARATIONS_COUTS, secretsDans } from "./outil-plans/secrets.mjs";
import { chiffrer, dechiffrer, DEPENDANCES_CHIFFRAGE, empreinte, evaluerChiffrage, FICHIER_CLE, lireCle, NOM_CLE } from "../src/lib/garde-corps-outil/coffre.ts";
import { CARRE_RENFORT, CARRES_RENFORT_SEULS, codeAlerte, CROIX_MAX, ORDRE_CARRES, valeursGC } from "../src/lib/garde-corps-outil/entree.ts";

const args = process.argv.slice(2);
const SOURCE = args.find((a) => !a.startsWith("--"));
const VERIFIER = args.includes("--verifier");
const NOUVELLE_CLE = args.includes("--nouvelle-cle");
if (!SOURCE) {
  console.error('Usage : npm run garde-corps:extraire -- "<chemin de plans-atelier.html>" [--verifier]');
  process.exit(2);
}
const arret = (message) => { console.error("\nREFUS : " + message); process.exit(1); };

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const DOSSIER = join(RACINE, "src/lib/garde-corps-outil");
const NOMS = { moteur: "moteur.genere.mjs", devis: "devis.genere.mjs", chiffrage: "chiffrage.chiffre.mjs" };
const REFERENCE = join(RACINE, "tests/reference/garde-corps-outil.json");
/** Les vignettes des décors à volutes, publiques (le navigateur les affiche telles quelles). */
const DOSSIER_VIGNETTES = join(RACINE, "public/garde-corps/decors");
const sha = (t) => createHash("sha256").update(t).digest("hex");
const court = (t) => sha(t).slice(0, 16);

const html = readFileSync(SOURCE, "utf8");
const empreinteSource = sha(html);
const A = analyser(html);

// ---------- 1. Ce qu'on prend : des racines, puis tout ce qu'elles utilisent ----------
const RACINES = {
  moteur: ["geomGC", "calculerGC", "variantesConformes", "decrireVariante", "HAUT_ETAGE", "ALLEGE_LIBRE", "MINI_GC", "MINI_SEULS", "BARRE_APPUI", "SPHERE",
    "SPHERE_HAUT", "Z_SPHERE", "Z_ESCALADE", "CIBLE_MARGE", "LIMITE_ACIER", "ROSACE_R", "RENFORT", "fmt", "mmTxt", "planA3Pur", "DS_ESSENCES", "coupeMainCourante", "svgDe", "MARGE_BOULE",
    // La fixation par platines au bout des lisses (10/10/2026) : le recul du cadre dans le tableau (90 mm), la platine 40 × 5 × 120.
    // Le croquis du site (schema-fenetre.tsx) dessine le cadre en retrait d'autant.
    "FIX_GC",
    // Le décor à volutes (bibliothèque de styles, 06/10/2026) : ses noms, les formes permises par assemblage, les choix de la
    // bibliothèque ; mtAlleger (la fonction de l'outil qui allège un trait) sert aux vignettes des décors.
    "DECOR_NOMS", "MT_AVEC", "MT_NOMS", "MT_CHOIX", "decorActif", "mtAlleger"],
  devis: ["composerDevisGC", "dsDevisHtml", "dsPrix", "DS_GC", "DS_VALIDITE_JOURS"],
  chiffrage: ["chiffrerGC", "remiseGC", "REGLAGES"],
};
/**
 * Le contrat que l'écran du site attend (src/lib/garde-corps-decors.genere.ts, AssemblageDecorGC et FormeDecorGC) : un
 * assemblage, une forme ou une finition de plus dans l'outil demande d'abord de mettre l'écran et lireDecorGC à jour.
 */
const CONTRAT_DECORS = {
  assemblages: ["entre", "frise", "anneaux", "hauteur", "coeurs", "medaillon", "applique"],
  formes: ["C", "S", "J", "coeur", "doubleC", "poste", "anneau"],
  bouts: ["bouton", "effile", "droit"],
  // La soudure seule (Quentin, 07/10/2026 : « uniquement soudure, on propose pas » les colliers).
  liaisons: ["soudure"],
  barreaux: ["carre", "torsade", "bagues"],
  frisesBasses: ["aucune", "postes"],
};

const F = Object.fromEntries(Object.entries(RACINES).map(([k, r]) => [k, fermeture(A, r)]));
const decl = (n) => A.haut.get(n);
const refus = [];
for (const k of ["moteur", "devis"]) {
  for (const n of F[k]) {
    if ([...DECLARATIONS_COUTS, "chiffrerGC", "remiseGC"].includes(n)) refus.push(`${k} : ${n} porte des coûts`);
  }
}
for (const k of Object.keys(F)) for (const n of F[k]) {
  const d = decl(n);
  if (d.genre === "let" || d.genre === "var") refus.push(`${k} : ${n} est un « ${d.genre} » (état modifié par l'écran)`);
  if (d.ecritHaut.length) refus.push(`${k} : ${n} modifie ${d.ecritHaut.join(", ")}`);
  if (d.dom.length) refus.push(`${k} : ${n} touche le navigateur (${d.dom.join(", ")})`);
  if (A.ecritsPar.has(n)) refus.push(`${k} : ${n} est modifié ailleurs par ${A.ecritsPar.get(n).join(", ")}`);
}
if (refus.length) arret(refus.join("\n"));

const dansMoteur = F.moteur;
const propresDevis = [...F.devis].filter((n) => !dansMoteur.has(n));
const propresChiffrage = [...F.chiffrage].filter((n) => !dansMoteur.has(n) && !propresDevis.includes(n));
const depsVers = (noms, source) => [...new Set(noms.flatMap((n) => decl(n).deps).filter((x) => source.has(x) && !noms.includes(x)))].sort();
const impDevis = depsVers(propresDevis, dansMoteur);
const impChiffrage = depsVers(propresChiffrage, dansMoteur);
if (propresChiffrage.some((n) => F.devis.has(n))) arret("le devis utilise une déclaration du chiffrage");
if (impChiffrage.join() !== [...DEPENDANCES_CHIFFRAGE].sort().join()) {
  arret(`le chiffrage utilise [${impChiffrage.join(", ")}] du moteur ; coffre.ts attend [${DEPENDANCES_CHIFFRAGE.join(", ")}] : mettre DEPENDANCES_CHIFFRAGE à jour`);
}

// ---------- 2. Le texte de chaque déclaration, commentaires retirés ----------
// PIÈGE : ne jamais ré-indenter ni retirer de lignes vides : les gabarits `…` sur plusieurs lignes (devis
// HTML) contiennent ces espaces. On ne retire QUE les commentaires, qu'acorn connaît :
// - seul sur sa ligne : la ligne entière part (un gabarit ne peut pas contenir de commentaire) ;
// - en fin de ligne : lui et les espaces qui le précèdent ;
// - /* */ au milieu du code : remplacé par une espace.
const { js } = extraireScript(html);
const commentaires = [];
acorn.parse(js, { ecmaVersion: "latest", sourceType: "script", onComment: (bloc, t, s, e) => commentaires.push([s, e, bloc]) });
function sansCommentaires(d) {
  const { start, end } = d.node;
  let out = "", i = start;
  for (const [s, e, bloc] of commentaires) {
    if (e <= start || s >= end) continue;
    const ls = js.lastIndexOf("\n", s - 1) + 1;
    const le = js.indexOf("\n", e) === -1 ? js.length : js.indexOf("\n", e);
    const seulAvant = ls >= start && js.slice(ls, s).trim() === "", seulApres = js.slice(e, le).trim() === "";
    if (seulAvant && seulApres) { out += js.slice(i, ls); i = Math.min(le + 1, end); }
    else if (seulApres) { out += js.slice(i, s).replace(/[ \t]+$/, ""); i = e; }
    else { out += js.slice(i, s) + (bloc ? " " : ""); i = e; }
  }
  return out + js.slice(i, end);
}
const corpsDe = (noms) => A.decls.filter((d) => d.noms.some((n) => noms.includes(n))).map(sansCommentaires).join("\n");

// Les notes d'achat du moteur (« Achetée en barre (fournisseur, prix) ») : le groupe entre parenthèses qui
// contient un prix est retiré, dans le code comme dans les réponses de l'outil comparées plus bas. Le reste
// du texte ne bouge pas. Aucun « € » ne doit rester dans le moteur.
const ACHAT = /\s*\([^()]*€[^()]*\)/g;
const neutraliser = (s) => s.replace(ACHAT, "");
function neutraliserObjet(o) {
  if (typeof o === "string") return neutraliser(o);
  if (Array.isArray(o)) return o.map(neutraliserObjet);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, neutraliserObjet(x)]));
  return o;
}
function neutraliserCode(texte) {
  const ast = acorn.parse(texte, { ecmaVersion: "latest", sourceType: "script" });
  const morceaux = [];
  const vis = (n) => {
    if (!n || typeof n.type !== "string") return;
    if ((n.type === "Literal" && typeof n.value === "string") || n.type === "TemplateElement") {
      const brut = texte.slice(n.start, n.end);
      if (brut.includes("€")) morceaux.push([n.start, n.end, neutraliser(brut)]);
    }
    for (const k in n) { const c = n[k]; if (Array.isArray(c)) c.forEach(vis); else if (c && typeof c.type === "string") vis(c); }
  };
  vis(ast);
  let out = texte;
  for (const [s, e, t] of morceaux.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + t + out.slice(e);
  return { texte: out, retires: morceaux.length };
}
const moteurNeutre = neutraliserCode(corpsDe([...dansMoteur]));
/**
 * Le catalogue des volutes du commerce (MT_CATALOGUE : références, codes des fournisseurs, clés de prix) sert au mode
 * catalogue des PORTAILS (ch.catalogue, z.catalogue). Le garde-corps du site ne l'a jamais (ses choix viennent de lireDecorGC) :
 * le code public le reçoit vide, et rien du catalogue n'y entre. Le contrôle de parité (plus bas) refait les garde-corps à décor.
 */
function viderCatalogue(texte) {
  if (!texte.includes("const MT_CATALOGUE = [")) return texte;
  const vide = texte.replace(/const MT_CATALOGUE = \[[\s\S]*?\n\];/, "const MT_CATALOGUE = [];   // vidé dans le code public : le garde-corps du site n'a pas de mode catalogue");
  if (vide === texte || /prixCle: "|ref: "/.test(vide)) arret("le catalogue des volutes (MT_CATALOGUE) n'a pas pu être retiré du moteur public");
  return vide;
}
const corpsMoteur = viderCatalogue(moteurNeutre.texte);
if (corpsMoteur.includes("€")) arret("le moteur contient encore un prix (« € ») hors d'une note d'achat entre parenthèses");
const corpsDevis = corpsDe(propresDevis);
const corpsChiffrage = corpsDe(propresChiffrage);

// ---------- 3. DEFAUTS_GC (lire() de l'outil sur les valeurs de sa page) et BORNES_GC ----------
const avantScript = html.slice(0, html.indexOf("<script"));
function champsDuHtml(h) {
  const champs = {};
  const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)].slice(1).map((m) => [m[1], m[2] ?? true]));
  for (const m of h.matchAll(/<input\b[^>]*>/g)) {
    const a = attrs(m[0]);
    if (!a.id) continue;
    const valeur = typeof a.value === "string" ? a.value : "";
    champs[a.id] = { tag: "input", type: a.type || "text", value: valeur, defaultValue: valeur, checked: a.checked === true || a.checked === "", min: a.min, max: a.max };
  }
  for (const m of h.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const opts = [...m[2].matchAll(/<option\b([^>]*)>/g)].map((o) => ({ value: (o[1].match(/value="([^"]*)"/) || [])[1] ?? "", selected: /\bselected\b/.test(o[1]) }));
    const choisi = opts.find((o) => o.selected) || opts[0] || { value: "" };
    champs[m[1]] = { tag: "select", value: choisi.value, defaultValue: choisi.value, checked: false };
  }
  return champs;
}
const champs = champsDuHtml(avantScript);
const lireSrc = decl("lire").texte, champsSrc = decl("CHAMPS").texte;
if (!/^function lire\(\)/.test(lireSrc)) arret("lire() a changé de forme dans l'outil");
// lire() utilise quelques constantes de l'outil (le jour automatique) : on les lui donne telles qu'elles sont déclarées.
const constantesDeLire = ["MINI_GC", "MINI_SEULS", "JOUR_MINI", "HAUT_ETAGE", "CIBLE_MARGE"].map((n) => decl(n).texte).join("\n");
// Depuis le 07/10/2026, lire() ajoute aussi les champs « es… » de l'onglet Escaliers (lireEscalier, module plans-escalier.js) :
// ils ne font pas partie des valeurs de départ du garde-corps, on lui rend un objet vide.
const sansEscalier = "function lireEscalier() { return {}; }";
const DEFAUTS_GC = new Function("$", `${constantesDeLire};\n${sansEscalier};\n${champsSrc};\n${lireSrc};\nreturn lire();`)((id) => {
  if (!champs[id]) throw new Error("champ absent de la page de l'outil : " + id);
  return champs[id];
});
const BORNES_GC = {};
for (const id of ["B", "A", "Hf"]) {
  const min = Number(champs[id]?.min), max = Number(champs[id]?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max <= min) arret(`bornes min/max du champ ${id} introuvables dans l'outil`);
  BORNES_GC[id] = { min, max };
}

// ---------- 4. La clé du chiffrage ----------
const cheminChiffre = join(DOSSIER, NOMS.chiffrage);
let cle = lireCle(RACINE);
let cleCreee = false;
if (!cle) {
  if (VERIFIER) arret(`clé du chiffrage absente (${NOM_CLE}, ou le fichier ${FICHIER_CLE} à la racine du site).`);
  if (!NOUVELLE_CLE) arret(`clé du chiffrage absente. Copier le fichier ${FICHIER_CLE} d'une autre copie du site (jamais par git), ou définir ${NOM_CLE}. La toute première fois seulement : ajouter --nouvelle-cle.`);
  if (existsSync(cheminChiffre)) arret(`${NOMS.chiffrage} existe déjà : une nouvelle clé le rendrait illisible pour le site en ligne. Retrouver la clé d'origine.`);
  cle = randomBytes(32);
  cleCreee = true;
}
if (existsSync(cheminChiffre)) {
  const ancien = readFileSync(cheminChiffre, "utf8").match(/export const CHIFFRE = "([^"]+)"/);
  try { if (ancien) dechiffrer(ancien[1], cle); } catch { arret(`la clé ne lit pas le ${NOMS.chiffrage} déjà présent : ce n'est pas la bonne clé.`); }
}

// ---------- 5. Les fichiers ----------
const entete = (quoi) => [
  "// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : NE PAS MODIFIER À LA MAIN.",
  `// ${quoi}`,
  `// Source : l'outil de plans (plans-atelier.html), sha256 ${empreinteSource}`,
  "/* eslint-disable */",
  "",
].join("\n");
// Chaque fichier se termine par son empreinte : un test la recalcule et voit toute retouche à la main.
const scelle = (texte) => `${texte}export const EMPREINTE = "${empreinte(texte)}";\n`;
const gele = (o) => `Object.freeze({ ${Object.entries(o).map(([k, x]) => `${k}: Object.freeze(${JSON.stringify(x)})`).join(", ")} })`;
const exportsDe = (noms) => [...new Set(noms.filter((n) => Object.values(RACINES).flat().includes(n)))].sort();

const texteMoteur = scelle(
  entete("Moteur garde-corps : norme NF P01-012, géométrie, débit, dessins. SANS coûts.") +
  corpsMoteur + "\n" +
  `export const DEFAUTS_GC = Object.freeze(${JSON.stringify(DEFAUTS_GC)});\n` +
  `export const BORNES_GC = ${gele(BORNES_GC)};\n` +
  `export const EMPREINTE_SOURCE = "${empreinteSource}";\n` +
  `export { ${exportsDe([...dansMoteur]).join(", ")} };\n`
);
const texteDevis = scelle(
  entete("Devis garde-corps au format du site (composerDevisGC, dsDevisHtml). SANS coûts : le prix est une entrée.") +
  (impDevis.length ? `import { ${impDevis.join(", ")} } from "./moteur.genere.mjs";\n` : "") +
  corpsDevis + "\n" +
  `export const EMPREINTE_SOURCE = "${empreinteSource}";\n` +
  `export { ${exportsDe(propresDevis).join(", ")} };\n`
);
const paquet = chiffrer(corpsChiffrage, cle);
if (dechiffrer(paquet, cle) !== corpsChiffrage) arret("le chiffrement ne se relit pas à l'identique");
const texteChiffre = scelle(
  entete("CHIFFRAGE de l'atelier (coûts, fournisseurs, heure, frais fixes), CHIFFRÉ. Lu par le serveur seulement, avec la clé.") +
  `export const CHIFFRE = "${paquet}";\n` +
  `export const EMPREINTE_CLAIR = "${empreinte(corpsChiffrage)}";\n` +
  `export const EMPREINTE_SOURCE = "${empreinteSource}";\n`
);

const TYPES = {
  "moteur.genere.d.mts": `// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : types du moteur (moteur.genere.mjs).
export type ValeursGC = {
  B: number; A: number; Hs: number; Hf: number; Xo: number; jour: number; j: number; s: number; nP: number; nb: number;
  sbMode: string; ass: string; rosace: boolean; etage: boolean; mc: number; epMc: number; mcType: string; essence: string;
  rainure: boolean; rnP: number; rnJ: number; dF: number; fF: number; eF: number; nF: number; trait: number;
  debitAr: number; minSoud: number; remise: string; km: number; prixVente: number; traverse: boolean; renfort: string; seuls?: boolean; patte?: number; rD: number; jourAuto?: boolean; jourSaisi?: number; _rapide?: boolean;
  /** Le décor à volutes : "aucun" ou un assemblage (DECOR_NOMS), puis la forme et les finitions, en chaînes comme les champs de l'outil. */
  decor?: string; decorForme?: string; decorBouts?: string; decorLiaison?: string; decorBarreaux?: string; decorFriseBasse?: string; decorDore?: string;
  [autre: string]: unknown;
};
export type LigneDebitGC = { nom: string; qte: number; mat: string; long: number; coupes: string; note: string; dessin?: unknown };
export type ResultatGC = {
  vues: { face: unknown[]; cote: unknown[]; dessus: unknown[] };
  debit: LigneDebitGC[];
  alertes: string[];
  oks: string[];
  notes: string[];
  resume: [string, string][];
  kg?: number;
  metres?: number;
  hauteurGC?: number;
  /** La main courante retenue : largeur, hauteur, profondeur de rainure ; et le plat de renfort s'il y en a un. */
  mc?: { l: number; h: number; chev: number; renfort: { l: number; e: number; vis: number } | null };
  /** Avec un décor à volutes : son nom (« Frise de volutes en S ») et ses finitions, tels que le devis les écrit. */
  decorNom?: string;
  decorFinitions?: string;
  [autre: string]: unknown;
};
export type GeomGC = { Lc: number; cible: number; manque: number; appui: "barre" | "rien" | null; hNorme: number; Hr: number; Hc: number; h: number; w: number; sb: number; ok: boolean; dMax: number; limite: number; [autre: string]: unknown };
export type VarianteGC = { w: ValeursGC; R: ResultatGC; change: number; score: number };
export declare const DEFAUTS_GC: Readonly<ValeursGC>;
export declare const BORNES_GC: Readonly<Record<"B" | "A" | "Hf", Readonly<{ min: number; max: number }>>>;
export declare function calculerGC(v: ValeursGC): ResultatGC;
export declare function geomGC(v: ValeursGC, n: number): GeomGC;
export declare function variantesConformes(v: ValeursGC): VarianteGC[];
export declare function decrireVariante(v: ValeursGC, c: { w: ValeursGC }): string[];
export declare function fmt(x: number, d?: number): string;
export declare function mmTxt(x: number): string;
export declare function coupeMainCourante(v: ValeursGC): unknown[];
export declare function svgDe(prims: readonly unknown[], petit?: boolean | string): { vb: number[]; fs: number; html: string };
export declare function planA3Pur(R: ResultatGC, v: ValeursGC, infos: { apercu?: boolean; date?: string; client?: string; chantier?: string; numero?: string }, modele: string): string;
export declare const ALLEGE_LIBRE: number;
export declare const BARRE_APPUI: number;
export declare const CIBLE_MARGE: number;
export declare const HAUT_ETAGE: number;
export declare const LIMITE_ACIER: number;
export declare const MINI_GC: number;
export declare const MARGE_BOULE: number;
/** La fixation par platines au bout des lisses (10/10/2026) : recul du cadre depuis le tableau, platine (l × e × h), bord, entraxe des trous… en mm. */
export declare const FIX_GC: Readonly<{ recul: number; l: number; e: number; h: number; bord: number; entraxe: number; rondelle: number; appui: number; ecart: number }>;
export declare const MINI_SEULS: number;
export declare const RENFORT: Readonly<{ l: number; e: number; bois: Readonly<{ l: number; h: number }>; LcMax: number; pasVis: number; visD: number; visL: number }>;
export declare const ROSACE_R: number;
export declare const SPHERE: number;
export declare const SPHERE_HAUT: number;
export declare const Z_ESCALADE: number;
export declare const Z_SPHERE: number;
export declare const DECOR_NOMS: Readonly<Record<string, string>>;
export declare const MT_AVEC: Readonly<Record<string, readonly string[]>>;
export declare const MT_NOMS: Readonly<Record<string, string>>;
export declare const MT_CHOIX: Readonly<Record<string, readonly string[]>>;
export declare function decorActif(v: Partial<ValeursGC> | null | undefined): boolean;
export declare function mtAlleger(t: readonly (readonly [number, number])[], tol?: number): [number, number][];
export declare const EMPREINTE: string;
export declare const EMPREINTE_SOURCE: string;
`,
  "devis.genere.d.mts": `// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : types du devis (devis.genere.mjs).
import type { ResultatGC, ValeursGC } from "./moteur.genere.mjs";
export type LigneDevisGC = { designation: string; details: string[]; quantite: number; unitaire: number; total: number; titre?: boolean };
export type DevisGC = {
  nature: "devis";
  numero: string;
  date: string;
  validite: string;
  emetteur: { nom: string; lignes: string[] };
  client: { nom?: string; adresse?: string; email?: string; telephone?: string };
  piece: {
    nom: string;
    accroche: string;
    image: { type: "photo"; src: string } | { type: "svg"; svg: string } | null;
    caracteristiques: { label: string; value: string }[];
  };
  lignes: LigneDevisGC[];
  total: number;
  delai: string;
  conditions: string[];
  lienFiche: string | null;
};
export type InfosDevisGC = { client?: string; chantier?: string; email?: string; telephone?: string; date?: Date | string | null };
export declare function composerDevisGC(p: {
  R: ResultatGC;
  v: ValeursGC;
  prix: number;
  rem: { prix: number };
  infos?: InfosDevisGC;
  image?: "auto" | "schema" | "photo";
}): { ok: true; devis: DevisGC } | { ok: false; raison: string };
export declare function dsDevisHtml(devis: DevisGC): string;
export declare function dsPrix(euros: number): string;
export declare const DS_GC: Readonly<{ nom: string; nomSansRosace: string; nomBarreaux: string; delai: string; teinte: string; rosace: string; parts: Readonly<Record<string, number>>; photo: string }>;
export declare const DS_VALIDITE_JOURS: number;
export declare const EMPREINTE: string;
export declare const EMPREINTE_SOURCE: string;
`,
  "chiffrage.chiffre.d.mts": `// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : types du chiffrage chiffré (chiffrage.chiffre.mjs).
export declare const CHIFFRE: string;
export declare const EMPREINTE_CLAIR: string;
export declare const EMPREINTE: string;
export declare const EMPREINTE_SOURCE: string;
`,
};

// ---------- 6. Contrôles des textes ----------
for (const [nom, texte] of [[NOMS.moteur, texteMoteur], [NOMS.devis, texteDevis]]) {
  const c = controlerModule(texte);
  if (c.inconnus.length || c.dom.length) arret(`${nom} : noms inconnus [${c.inconnus.join(" ")}], navigateur [${c.dom.join(" ")}]`);
  console.log(`${nom} : ${texte.length} octets, ${c.declares.size} déclarations, globaux : ${c.globaux.join(" ")}`);
}
{
  const ast = acorn.parse(corpsChiffrage, { ecmaVersion: "latest", sourceType: "script" });
  const declares = new Set(ast.body.flatMap((s) => (s.type === "FunctionDeclaration" ? [s.id.name] : s.declarations.map((d) => d.id.name))));
  const utilises = new Set(ast.body.flatMap((s) => { const { lus, ecrits } = libres(s); return [...lus, ...ecrits]; }));
  const inconnus = [...utilises].filter((n) => !declares.has(n) && !GLOBAUX_PERMIS.has(n) && !DEPENDANCES_CHIFFRAGE.includes(n));
  if (inconnus.length) arret(`chiffrage : noms inconnus [${inconnus.join(" ")}]`);
  console.log(`${NOMS.chiffrage} : ${texteChiffre.length} octets (clair : ${corpsChiffrage.length} octets, ${declares.size} déclarations)`);
}
// Les valeurs de coûts (textes, fournisseurs, prix d'achat) et les noms du chiffrage : ni dans le moteur, ni
// dans le devis, ni dans la référence des tests (tous publics, puisque le dépôt l'est).
const { valeurs: VALEURS_COUTS, noms: NOMS_COUTS } = chainesSecretes(corpsChiffrage);
const SECRETS = [...VALEURS_COUTS, ...NOMS_COUTS];
const fuites = (texte) => secretsDans(texte, SECRETS);
for (const [nom, texte] of [[NOMS.moteur, texteMoteur], [NOMS.devis, texteDevis], [NOMS.chiffrage, texteChiffre], ...Object.entries(TYPES)]) {
  const f = fuites(texte);
  if (f.length) arret(`${nom} contient ${f.length} chaîne(s) de coûts`);
}
console.log(`notes d'achat retirées du moteur : ${moteurNeutre.retires} ; chaînes de coûts contrôlées : ${SECRETS.length}`);

// ---------- 7. L'outil et le code extrait, côte à côte ----------
const temp = mkdtempSync(join(tmpdir(), "moteur-gc-"));
let reference;
let texteCoupes = "";
let texteDecors = "";
/** Les vignettes des décors : nom du fichier (« frise-S.svg ») → texte SVG. */
let vignettes = {};
try {
  writeFileSync(join(temp, NOMS.moteur), texteMoteur);
  writeFileSync(join(temp, NOMS.devis), texteDevis);
  const M = await import(pathToFileURL(join(temp, NOMS.moteur)).href);
  const D = await import(pathToFileURL(join(temp, NOMS.devis)).href);
  const CH = evaluerChiffrage(dechiffrer(paquet, cle), M.fmt);
  reference = comparerAvecOutil(M, D, CH);
  // Les quatre coupes de main courante du choix du site, dessinées par l'outil (coupeMainCourante + svgDe) : le site les montre
  // telles quelles, il ne les redessine pas.
  const TYPES_MC = {
    "bois-rainure": { mcType: "bois", renfort: "sans" },
    "bois-plat": { mcType: "bois", renfort: "plat" },
    "acier-plat": { mcType: "acier", renfort: "sans" },
    "acier-profile": { mcType: "profil", renfort: "sans" },
  };
  const coupes = {};
  for (const [type, reglages] of Object.entries(TYPES_MC)) {
    const prims = M.coupeMainCourante({ ...DEFAUTS_GC, rainure: true, ...reglages });
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const p of prims) for (const [x, y] of p.pts) { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); }
    const marge = 4;
    coupes[type] = { vb: [x1 - marge, -(y2 + marge), x2 - x1 + 2 * marge, y2 - y1 + 2 * marge].map((n) => Math.round(n * 10) / 10), html: M.svgDe(prims).html };
  }
  texteCoupes = entete("Les quatre coupes de main courante du choix du site, dessinées par l'outil de plans (coupeMainCourante).") +
    `export const COUPES_MAIN_COURANTE_GC: Readonly<Record<"bois-rainure" | "bois-plat" | "acier-plat" | "acier-profile", Readonly<{ vb: readonly [number, number, number, number]; html: string }>>> = ${JSON.stringify(coupes, null, 1)};\n`;
  // Le décor à volutes : les choix que le site propose (les noms de l'outil), et une vignette par décor dessinée par l'outil.
  const decors = decorsDuSite(M);
  texteDecors = texteDesDecors(decors);
  vignettes = vignettesDecors(M, decors);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
const texteReference = JSON.stringify(reference, null, 1) + "\n";
if (fuites(texteReference).length) arret("la référence des tests contient des chaînes de coûts");
// Les fichiers publics du décor (la liste des choix, les vignettes) : aucune chaîne de coûts non plus.
for (const [nom, texte] of [["garde-corps-decors.genere.ts", texteDecors], ...Object.entries(vignettes)]) {
  if (fuites(texte).length) arret(`${nom} contient des chaînes de coûts`);
}

// ---------- 8. Écrire, ou vérifier ----------
const aEcrire = [
  [join(DOSSIER, NOMS.moteur), texteMoteur],
  [join(DOSSIER, NOMS.devis), texteDevis],
  [cheminChiffre, texteChiffre],
  ...Object.entries(TYPES).map(([n, t]) => [join(DOSSIER, n), t]),
  [join(RACINE, "src/lib/garde-corps-coupes.genere.ts"), texteCoupes],
  [join(RACINE, "src/lib/garde-corps-decors.genere.ts"), texteDecors],
  ...Object.entries(vignettes).map(([nom, t]) => [join(DOSSIER_VIGNETTES, nom), t]),
  [REFERENCE, texteReference],
];
// Une vignette d'un décor que l'outil ne propose plus : à retirer (au moment d'écrire), un écart (à la vérification).
const vignettesEnTrop = existsSync(DOSSIER_VIGNETTES) ? readdirSync(DOSSIER_VIGNETTES).filter((n) => n.endsWith(".svg") && !Object.hasOwn(vignettes, n)) : [];
if (VERIFIER) {
  const ecarts = [
    ...aEcrire.filter(([f, t]) => !existsSync(f) || readFileSync(f, "utf8") !== t).map(([f]) => f.slice(RACINE.length)),
    ...vignettesEnTrop.map((n) => join(DOSSIER_VIGNETTES, n).slice(RACINE.length) + " (en trop)"),
  ];
  if (ecarts.length) arret(`ces fichiers ne sont pas ceux que donne l'outil :\n  ${ecarts.join("\n  ")}\nRelancer sans --verifier pour les régénérer.`);
  console.log("\nVÉRIFIÉ : les fichiers du dépôt sont exactement ceux que donne cet outil, et l'outil donne les mêmes réponses que le site.");
} else {
  if (cleCreee) {
    const chemin = join(RACINE, FICHIER_CLE);
    writeFileSync(chemin, `# Clé du chiffrage garde-corps (coûts de l'atelier). NE JAMAIS la commiter, l'afficher ni l'envoyer.\n# En ligne : la même valeur dans Vercel > Settings > Environment Variables > ${NOM_CLE}.\n${NOM_CLE}=${cle.toString("base64")}\n`, { mode: 0o600 });
    try {
      execFileSync("git", ["-C", RACINE, "check-ignore", "-q", FICHIER_CLE]);
    } catch {
      rmSync(chemin, { force: true });
      arret(`${FICHIER_CLE} ne serait pas ignoré par git : clé supprimée, rien n'est écrit.`);
    }
    console.log(`\nClé créée dans ${FICHIER_CLE} (ignoré par git).`);
  }
  mkdirSync(DOSSIER, { recursive: true });
  mkdirSync(join(RACINE, "tests/reference"), { recursive: true });
  mkdirSync(DOSSIER_VIGNETTES, { recursive: true });
  for (const n of vignettesEnTrop) rmSync(join(DOSSIER_VIGNETTES, n));
  for (const [f, t] of aEcrire) writeFileSync(f, t);
  console.log(`\nÉCRIT : ${aEcrire.map(([f]) => f.slice(RACINE.length)).join(", ")}`);
}
console.log(`empreintes : moteur ${empreinte(texteMoteur.slice(0, texteMoteur.lastIndexOf("export const EMPREINTE =")))} · devis ${empreinte(texteDevis.slice(0, texteDevis.lastIndexOf("export const EMPREINTE =")))} · chiffrage (clair) ${empreinte(corpsChiffrage)} · outil ${empreinteSource.slice(0, 12)}`);

// ======================================================================================================
// La comparaison : l'outil (tel quel, dans node:vm) et le code extrait répondent-ils la même chose ?
// Elle rend la référence des tests : les entrées, les prix de vente, des empreintes (jamais un coût).
// ======================================================================================================
function comparerAvecOutil(M, D, CH) {
  const J = (x) => JSON.stringify(x);
  const trie = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  const DATE = "2026-09-29T10:00:00.000Z";   // date fixe des devis de référence (le numéro en dépend)
  const lancer = preparerOutil(html);
  const t0 = Date.now();
  const depart = lancer(null);
  // Les champs « es… » de l'onglet Escaliers (lireEscalier, module plans-escalier.js collé le 07/10/2026) sont relus par lire()
  // de l'outil : ils ne concernent pas le garde-corps, on les retire avant chaque comparaison avec le code extrait.
  const lireSansEscalier = (P) => {
    const v = JSON.parse(J(P.lire()));
    for (const k of Object.keys(P.lireEscalier ? P.lireEscalier() : {})) delete v[k];
    return v;
  };
  const defautsOutil = lireSansEscalier(depart.P);
  if (J(trie(defautsOutil)) !== J(trie(DEFAUTS_GC))) throw new Error("DEFAUTS_GC diffère de lire() de l'outil chargé");
  const O = depart.O;
  const dateOutil = depart.dateOutil(DATE);
  const ecarts = [];

  // --- Cas généraux : toutes les familles de réglages de l'outil ---
  let graine = 20260929;
  const hasard = () => ((graine = (graine * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const pick = (t) => t[Math.floor(hasard() * t.length)];
  const entre = (a, b, pas) => a + pas * Math.floor(hasard() * ((b - a) / pas + 1));
  const cas = [
    { nom: "valeurs de départ de l'outil", lire: true },
    { nom: "photo du site, 4 croix", valeurs: { nP: 4 }, lire: true },
    { nom: "limite de solidité du carré 16", valeurs: { B: 1195, nP: 3 }, lire: true },
    { nom: "juste au-delà, carré 16", valeurs: { B: 1200, nP: 3 } },
    { nom: "juste au-delà, carré 18", valeurs: { B: 1200, s: 18, nP: 4 }, lire: true },
    { nom: "appui bas et soubassement", valeurs: { B: 900, A: 300, nP: 2 }, chantier: "12 rue des Lilas, 44000 Nantes" },
    { nom: "rez-de-chaussée, au sol", valeurs: { B: 800, A: 0, etage: false, nP: 2 } },
    { nom: "allège 900, pas d'obligation", valeurs: { B: 300, A: 900 } },
    { nom: "très large, carré 20", valeurs: { B: 3000, A: 500, s: 20, nP: 6 } },
    { nom: "plat d'acier, sans rosace", valeurs: { B: 1000, A: 725, mcType: "acier", rosace: false }, lire: true },
    { nom: "main courante profilée, allège 599", valeurs: { B: 1400, A: 599, mcType: "profil" } },
    { nom: "fenêtre trop basse", valeurs: { B: 1000, A: 600, Hf: 300 } },
    { nom: "meuble de 450, transporteur à 250 km", valeurs: { B: 1100, A: 100, Xo: 450, remise: "transporteur", km: 250 }, chantier: "33000 Bordeaux", lire: true },
    { nom: "hors gabarit, pose à 120 km", valeurs: { B: 2100, A: 800, remise: "pose", km: 120, s: 20, nP: 6 }, chantier: "Tours 37000" },
    { nom: "noyer, barreaux, onglets, sans rainure", valeurs: { B: 950, A: 400, sbMode: "toujours", nb: 1, ass: "onglet", essence: "noyer", rainure: false }, lire: true },
    { nom: "prix tapé 900 €", valeurs: { B: 1000, A: 650, prixVente: 900, remise: "transporteur", km: 60 }, lire: true },
    { nom: "pin, pose à 10 km", valeurs: { B: 700, A: 850, essence: "pin", remise: "pose", km: 10, nP: 1 } },
    { nom: "hêtre, retrait, rez-de-chaussée", valeurs: { B: 1150, A: 250, etage: false, essence: "hetre", nP: 3 }, lire: true },
  ];
  while (cas.length < 40) {
    const v = { B: entre(300, 2400, 5), A: entre(0, 1100, 5), etage: hasard() < 0.8, Hf: hasard() < 0.5 ? 0 : entre(600, 2200, 10), essence: pick(["pin", "hetre", "chene", "noyer"]), remise: pick(["retrait", "transporteur", "pose"]), km: entre(0, 500, 5) };
    v.s = hasard() < 0.75 ? 16 : pick([12, 18, 20]);
    if (hasard() < 0.15) v.mcType = pick(["acier", "profil"]);
    if (hasard() < 0.1) v.rosace = false;
    if (hasard() < 0.15) v.sbMode = "toujours";
    if (hasard() < 0.1) v.nb = entre(1, 2, 1);
    if (hasard() < 0.15) v.Xo = entre(100, 700, 10);
    if (hasard() < 0.15) v.Hs = entre(200, 1000, 10);
    if (hasard() < 0.2) v.jour = entre(60, 120, 5);
    if (hasard() < 0.15) v.ass = "onglet";
    if (hasard() < 0.15) v.rainure = false;
    v.nP = entre(1, 6, 1);
    cas.push({ nom: "hasard " + cas.length, valeurs: v, chantier: hasard() < 0.3 ? "49400 Saumur" : "", lire: cas.length % 5 === 0 });
  }
  // Le fer plat de renfort de la lisse haute (fenêtre large). Ajoutés APRÈS les cas tirés au hasard : leur tirage ne change pas.
  cas.push(
    { nom: "renfort, 1990 de large, 5 croix", valeurs: { B: 1990, A: 650, nP: 5, renfort: "plat" }, lire: true },
    { nom: "renfort, 2400 de large, traverse au milieu", valeurs: { B: 2400, A: 400, nP: 3, traverse: true, renfort: "plat" } },
    { nom: "renfort au-delà de 2400", valeurs: { B: 2500, A: 500, nP: 6, renfort: "plat" } },
    { nom: "renfort, bas de fenêtre haut", valeurs: { B: 1800, A: 720, nP: 5, renfort: "plat" }, lire: true },
    { nom: "renfort pas nécessaire, noyer", valeurs: { B: 1180, A: 650, nP: 4, renfort: "plat", essence: "noyer" } },
    { nom: "renfort demandé avec un plat d'acier", valeurs: { B: 1900, A: 600, nP: 5, renfort: "plat", mcType: "acier" } },
    { nom: "renfort, pin, transporteur", valeurs: { B: 2200, A: 300, nP: 6, renfort: "plat", essence: "pin", remise: "transporteur", km: 180 }, chantier: "75011 Paris", lire: true },
    // Les barreaux seuls (des barreaux verticaux, sans croix ni rosace) : ajoutés APRÈS les autres cas.
    { nom: "barreaux seuls, 1180 × 650", valeurs: { B: 1180, A: 650, seuls: true }, lire: true },
    { nom: "barreaux seuls, bas de fenêtre bas (escalade)", valeurs: { B: 1180, A: 300, seuls: true } },
    { nom: "barreaux seuls, 700 de large, acier", valeurs: { B: 700, A: 500, seuls: true, mcType: "acier" }, lire: true },
    { nom: "barreaux seuls, large : carré de 20", valeurs: { B: 1990, A: 650, seuls: true, s: 20 }, lire: true },
    { nom: "barreaux seuls, renfort, noyer", valeurs: { B: 2200, A: 400, seuls: true, renfort: "plat", essence: "noyer" } },
    { nom: "barreaux seuls, trop souple", valeurs: { B: 2400, A: 300, seuls: true } },
    // Le jour automatique : à 760 mm du sol, le jour tapé (90) est réduit à 65 pour que le garde-corps fasse 200 mm.
    { nom: "jour automatique, bas de fenêtre à 760", valeurs: { B: 1180, A: 760, jourAuto: true, jour: 65, jourSaisi: 90 }, lire: true },
    // La patte au milieu (05/10/2026) : fenêtre large et garde-corps bas, les vis des tableaux trop tirées sans elle.
    { nom: "2 pattes, 1775 × 665, carré de 18", valeurs: { B: 1775, A: 665, nP: 5, s: 18, patte: 2 }, lire: true },
    { nom: "1 patte, 1775 × 665, carré de 18 (trop faible)", valeurs: { B: 1775, A: 665, nP: 5, s: 18, patte: 1 } },
    { nom: "4 pattes, 1775 × 665, carré de 16", valeurs: { B: 1775, A: 665, nP: 6, s: 16, patte: 4 }, lire: true },
    { nom: "3 pattes sur 2 croix (impossible)", valeurs: { B: 900, A: 650, nP: 2, patte: 3 } },
    { nom: "1 patte, barreaux seuls", valeurs: { B: 1800, A: 800, seuls: true, s: 18, patte: 1 }, lire: true },
    // Sans rosace (Ø0, choix du site depuis le 05/10/2026) : la case « Rosace au centre : Sans » de l'outil.
    { nom: "sans rosace, 1180 × 650", valeurs: { B: 1180, A: 650, rosace: false }, lire: true },
    { nom: "sans rosace, 900 × 400, 5 croix, traverse", valeurs: { B: 900, A: 400, nP: 5, rosace: false, traverse: true }, lire: true },
    // Barreaux seuls à 760 mm : leur minimum (120) laisse le jour à 90 — c'est ce que le site applique (jourGC(allège, seuls)).
    { nom: "barreaux seuls, bas de fenêtre à 760 : jour 90", valeurs: { B: 1180, A: 760, seuls: true, jourAuto: true, jour: 90, jourSaisi: 90 }, lire: true },
    { nom: "barreaux seuls bas, bas de fenêtre à 840", valeurs: { B: 1180, A: 840, seuls: true, jourAuto: true, jour: 65, jourSaisi: 90 }, lire: true },
  );
  // Le décor à volutes (bibliothèque de styles, 06/10/2026), ajouté APRÈS les autres cas : un cas par assemblage et par forme
  // permise (finitions de départ ; un sur trois avec la case « barreaux seuls », comme le site), puis chaque finition, le pied
  // qui grimpe (bas de fenêtre à 300 mm), un décor refusé par la norme, le jour automatique, et d'autres mains courantes.
  {
    let k = 0;
    for (const a of Object.keys(M.DECOR_NOMS)) for (const f of M.MT_AVEC[a]) {
      cas.push({ nom: `décor ${a}, ${f}`, valeurs: { B: 1180, A: 650, decor: a, decorForme: f, ...(k % 3 === 0 ? { seuls: true } : {}) }, lire: k % 2 === 0 });
      k++;
    }
  }
  cas.push(
    { nom: "décor, bouts effilés", valeurs: { B: 1000, A: 650, decor: "entre", decorForme: "S", decorBouts: "effile" }, lire: true },
    { nom: "décor, bouts coupés droits", valeurs: { B: 1400, A: 700, decor: "frise", decorForme: "C", decorBouts: "droit" } },
    { nom: "décor, volutes en crosse (soudées, la seule liaison)", valeurs: { B: 900, A: 650, decor: "entre", decorForme: "J" }, lire: true },
    { nom: "décor, barreaux torsadés", valeurs: { B: 1180, A: 500, decor: "medaillon", decorForme: "coeur", decorBarreaux: "torsade" }, lire: true },
    { nom: "décor, barreaux à bagues", valeurs: { B: 1600, A: 650, decor: "anneaux", decorForme: "anneau", decorBarreaux: "bagues", seuls: true } },
    { nom: "décor, frise basse de postes", valeurs: { B: 1180, A: 650, decor: "applique", decorForme: "C", decorFriseBasse: "postes" }, lire: true },
    { nom: "décor, frise basse au ras du sol (retirée)", valeurs: { B: 1180, A: 300, decor: "frise", decorForme: "S", decorFriseBasse: "postes" } },
    { nom: "décor doré, transporteur à 120 km", valeurs: { B: 1180, A: 650, decor: "frise", decorForme: "S", decorDore: "1", remise: "transporteur", km: 120 }, chantier: "37000 Tours", lire: true },
    { nom: "décor, escalade : cœurs à 300", valeurs: { B: 1180, A: 300, decor: "coeurs", decorForme: "coeur", seuls: true }, lire: true },
    { nom: "décor, escalade : grille de volutes à 300", valeurs: { B: 1180, A: 300, decor: "hauteur", decorForme: "S" } },
    { nom: "décor refusé : grille de volutes, 2200 × 400", valeurs: { B: 2200, A: 400, decor: "hauteur", decorForme: "C", seuls: true } },
    { nom: "décor, jour automatique à 760", valeurs: { B: 1180, A: 760, jourAuto: true, jour: 65, jourSaisi: 90, decor: "frise", decorForme: "S" }, lire: true },
    { nom: "décor, noyer, pose à 40 km", valeurs: { B: 1300, A: 600, decor: "medaillon", decorForme: "doubleC", essence: "noyer", remise: "pose", km: 40 }, chantier: "49000 Angers" },
    { nom: "décor, main courante d'acier plat", valeurs: { B: 1100, A: 650, decor: "entre", decorForme: "C", mcType: "acier", seuls: true }, lire: true },
    { nom: "décor, bois sur fer plat, fenêtre large", valeurs: { B: 2100, A: 650, decor: "applique", decorForme: "doubleC", renfort: "plat", seuls: true } },
  );
  let variantes = 0;
  const casRef = [];
  for (const c of cas) {
    const valeurs = c.valeurs || {};
    // Le jour automatique réduit le jour tapé quand le garde-corps serait trop bas : les cas ordinaires le coupent (la comparaison
    // se fait valeur pour valeur) ; un cas dédié, plus bas, le laisse faire et vérifie le jour retenu.
    const vE = { ...DEFAUTS_GC, jourAuto: false, ...valeurs };
    if (valeurs.jourSaisi === undefined) vE.jourSaisi = vE.jour;
    let vO = vE, Olocal = O, dateLocale = dateOutil, charge = null;
    if (c.lire) {                     // l'outil relit ces valeurs comme si elles étaient gardées dans le navigateur
      charge = lancer(vE);
      vO = lireSansEscalier(charge.P);
      Olocal = charge.O;
      dateLocale = charge.dateOutil(DATE);
      if (J(trie(vO)) !== J(trie(vE))) ecarts.push(`${c.nom} : lire()`);
    }
    const infos = (date) => ({ client: "", chantier: c.chantier || "", email: "", telephone: "", date });
    const RObrut = Olocal.calculerGC(vO), RO = neutraliserObjet(JSON.parse(J(RObrut)));
    const RE = M.calculerGC(vE);
    if (J(RO) !== J(RE)) ecarts.push(`${c.nom} : calculerGC`);
    const CO = Olocal.chiffrerGC(RObrut, vO), CE = CH.chiffrerGC(RE, vE);
    if (J(CO) !== J(CE)) ecarts.push(`${c.nom} : chiffrerGC`);
    for (const p of [CE.conseille, CE.plancher, 500]) if (CO.reste(p) !== CE.reste(p)) ecarts.push(`${c.nom} : reste(${p})`);
    const remO = Olocal.remiseGC(RObrut, vO), remE = CH.remiseGC(RE, vE);
    if (J(remO) !== J(remE)) ecarts.push(`${c.nom} : remiseGC`);
    const prix = vE.prixVente > 0 ? vE.prixVente : CE.conseille;
    const devO = Olocal.composerDevisGC({ R: RObrut, v: vO, prix, rem: remO, infos: infos(dateLocale) });
    const devE = D.composerDevisGC({ R: RE, v: vE, prix, rem: remE, infos: infos(new Date(DATE)) });
    if (J(devO) !== J(devE)) ecarts.push(`${c.nom} : composerDevisGC`);
    const htmlO = devO.ok ? Olocal.dsDevisHtml(devO.devis) : null, htmlE = devE.ok ? D.dsDevisHtml(devE.devis) : null;
    if (htmlO !== htmlE) ecarts.push(`${c.nom} : dsDevisHtml`);
    if (charge) {
      // Ce que l'outil affiche vraiment : le devis de l'onglet Contrôles (daté du jour) et son statut.
      // (L'outil passe son réglage de TVA sur les ventes au devis : sans TVA, l'émetteur porte la mention de franchise.)
      const duJour = D.composerDevisGC({ R: RE, v: vE, prix, rem: remE, infos: { client: "", chantier: "", email: "", telephone: "", date: null }, tva: CH.REGLAGES.tvaVente });
      const zone = charge.els.prixDevis.innerHTML;
      if (duJour.ok ? !zone.includes(D.dsDevisHtml(duJour.devis)) : !zone.includes(duJour.raison)) ecarts.push(`${c.nom} : devis affiché par l'outil`);
      if ((charge.els.statut.textContent === "Conforme NF P01-012") !== (RE.alertes.length === 0)) ecarts.push(`${c.nom} : statut affiché`);
    }
    const ref = {
      nom: c.nom,
      valeurs,
      ...(c.chantier ? { chantier: c.chantier } : {}),
      R: court(J(RE)),
      hauteurGC: RE.hauteurGC ?? null,
      kg: RE.kg ?? null,
      alertes: RE.alertes.length,
      prix: CE.conseille,
      chiffrage: court(J(CE)),
      remise: { prix: remE.prix, empreinte: court(J(remE)) },
      devis: devE.ok
        ? { numero: devE.devis.numero, total: devE.devis.total, lignes: devE.devis.lignes.length, donnees: court(J(devE)), html: court(htmlE) }
        : { raison: devE.raison },
    };
    if (RE.alertes.length && variantes < 2) {        // coûteux (plusieurs secondes) : 2 cas suffisent
      variantes++;
      const VO = neutraliserObjet(JSON.parse(J(Olocal.variantesConformes(vO)))), VE = M.variantesConformes(vE);
      if (J(VO) !== J(VE)) ecarts.push(`${c.nom} : variantesConformes`);
      ref.variantes = court(J(VE));
    }
    casRef.push(ref);
  }

  // --- Relevés du site : l'outil sur chaque carré (12 à 20) et chaque nombre de croix (1 à 6) ---
  const releves = [
    [1180, 650, true, 0, "chene"], [300, 0, true, 0, "chene"], [450, 900, true, 0, "pin"], [600, 850, false, 0, "hetre"],
    [800, 0, false, 1200, "chene"], [1000, 350, true, 1500, "noyer"], [1000, 600, true, 300, "chene"], [1195, 650, true, 0, "chene"],
    [1200, 650, true, 0, "chene"], [1300, 100, true, 0, "pin"], [1400, 599, true, 1400, "chene"], [1500, 900, true, 0, "hetre"],
    [1600, 650, true, 0, "noyer"], [1700, 650, true, 0, "chene"], [2000, 300, false, 0, "chene"], [3000, 1200, true, 0, "chene"],
    [700, 99, true, 0, "chene"], [950, 1100, false, 0, "pin"],
  ].map(([largeurMm, allegeMm, enEtage, fenetreMm, essence]) => ({ largeurMm, allegeMm, enEtage, fenetreMm, essence }));
  while (releves.length < 24) {
    releves.push({ largeurMm: entre(300, 1800, 1), allegeMm: entre(0, 1200, 1), enEtage: hasard() < 0.8, fenetreMm: hasard() < 0.6 ? 0 : entre(400, 2500, 1), essence: pick(["pin", "hetre", "chene", "noyer"]) });
  }
  // Fenêtres larges (fer plat de renfort) : ajoutées APRÈS le tirage au hasard, qui ne change donc pas.
  for (const [largeurMm, allegeMm, enEtage, fenetreMm, essence] of [[1669, 650, true, 0, "chene"], [1990, 650, true, 0, "chene"], [2400, 300, true, 0, "pin"], [2401, 500, true, 0, "chene"], [2200, 700, true, 1500, "noyer"], [1850, 0, false, 0, "hetre"], [2300, 640, true, 0, "noyer"], [1750, 560, true, 0, "pin"], [2402, 650, true, 0, "chene"]]) {
    releves.push({ largeurMm, allegeMm, enEtage, fenetreMm, essence });
  }
  const site = [];
  for (const e of releves) {
    const alertes = {};
    let choix = null;
    for (const s of ORDRE_CARRES) {
      alertes[s] = [];
      for (let n = 1; n <= CROIX_MAX; n++) {
        const codesO = O.calculerGC({ ...valeursGC(defautsOutil, e, s, n), _rapide: true }).alertes.map(codeAlerte);
        const codesE = M.calculerGC({ ...valeursGC(DEFAUTS_GC, e, s, n), _rapide: true }).alertes.map(codeAlerte);
        if (J(codesO) !== J(codesE)) ecarts.push(`relevé ${J(e)} : alertes carré ${s}, ${n} croix`);
        if (codesO.includes("autre")) ecarts.push(`relevé ${J(e)} : une alerte de l'outil n'a pas de code (entree.ts)`);
        alertes[s].push(codesO);
        if (!choix && !codesO.length) choix = { carre: s, croix: n };
      }
    }
    // Avec le fer plat de renfort, au carré de l'atelier : croix seules, de 1 à 6 croix.
    const renfort = [];
    for (let n = 1; n <= CROIX_MAX; n++) {
      const codesO = O.calculerGC({ ...valeursGC(defautsOutil, e, CARRE_RENFORT, n, false, false, true), _rapide: true }).alertes.map(codeAlerte);
      const codesE = M.calculerGC({ ...valeursGC(DEFAUTS_GC, e, CARRE_RENFORT, n, false, false, true), _rapide: true }).alertes.map(codeAlerte);
      if (J(codesO) !== J(codesE)) ecarts.push(`relevé ${J(e)} : alertes avec renfort, ${n} croix`);
      if (codesO.includes("autre")) ecarts.push(`relevé ${J(e)} : une alerte de l'outil n'a pas de code (entree.ts)`);
      renfort.push(codesO);
    }
    const geo = M.geomGC(valeursGC(DEFAUTS_GC, e, 16, 1), 1);
    if (J(O.geomGC(valeursGC(defautsOutil, e, 16, 1), 1).Hr) !== J(geo.Hr)) ecarts.push(`relevé ${J(e)} : hauteur`);
    const ref = { entree: e, hauteur: geo.Hr, alertes, renfort, choix: null };
    if (choix) {
      const vO = valeursGC(defautsOutil, e, choix.carre, choix.croix), vE = valeursGC(DEFAUTS_GC, e, choix.carre, choix.croix);
      const RObrut = O.calculerGC(vO), RE = M.calculerGC(vE);
      if (J(neutraliserObjet(JSON.parse(J(RObrut)))) !== J(RE)) ecarts.push(`relevé ${J(e)} : calculerGC`);
      const CO = O.chiffrerGC(RObrut, vO), CE = CH.chiffrerGC(RE, vE);
      if (J(CO) !== J(CE)) ecarts.push(`relevé ${J(e)} : chiffrerGC`);
      ref.choix = { ...choix, R: court(J(RE)), hauteurGC: RE.hauteurGC, kg: RE.kg, prix: CE.conseille };
    }
    site.push(ref);
  }
  // --- Relevés du site avec un décor : le calcul COMPLET de l'outil (c'est lui qui est vendu), carré par carré ---
  // Le cadre d'un décor est celui des barreaux seuls (une seule « croix ») ; sans carré qui passe, le fer plat de renfort.
  const relevesDecor = [
    [1180, 650, true, 0, "chene", "entre.C.bouton.colliers.carre.aucune.0"],
    [1000, 300, true, 0, "pin", "coeurs.coeur.effile.soudure.torsade.aucune.0"],
    [1600, 650, true, 1500, "chene", "frise.S.bouton.colliers.bagues.postes.1"],
    [900, 760, true, 0, "noyer", "medaillon.doubleC.droit.colliers.carre.aucune.0"],
    [2200, 400, true, 0, "chene", "hauteur.C.bouton.colliers.carre.aucune.0"],
    [1400, 500, false, 0, "acier", "anneaux.anneau.bouton.soudure.carre.aucune.0"],
    [1800, 650, true, 0, "chene-plat", "applique.coeur.bouton.colliers.carre.aucune.1"],
    // Fenêtre large (fer plat et panneaux) et bande basse sous une fenêtre haute (07/10/2026 : aucun décor « à étudier »).
    [2400, 400, true, 0, "chene", "frise.S.bouton.colliers.carre.aucune.0"],
    [1000, 800, true, 0, "chene", "anneaux.anneau.bouton.colliers.carre.aucune.0"],
  ].map(([largeurMm, allegeMm, enEtage, fenetreMm, essence, decor]) => ({ largeurMm, allegeMm, enEtage, fenetreMm, essence, decor }));
  const siteDecors = [];
  for (const e of relevesDecor) {
    const alertes = {};
    let choix = null;
    // n : le nombre de panneaux du décor (des montants au milieu), 1 à 3 comme le site (calcul.ts).
    const essai = (s, renfort, n = 1) => {
      const vO = valeursGC(defautsOutil, e, s, n, false, false, renfort, true), vE = valeursGC(DEFAUTS_GC, e, s, n, false, false, renfort, true);
      const RObrut = O.calculerGC(vO), RE = M.calculerGC(vE);
      if (J(neutraliserObjet(JSON.parse(J(RObrut)))) !== J(RE)) ecarts.push(`relevé décor ${J(e)} : calculerGC, carré ${s}${renfort ? ", renfort" : ""}`);
      const codes = RE.alertes.map(codeAlerte);
      // Une bande trop basse pour un décor (le fer plat la réduit encore) : l'outil le dit, sans poser de décor.
      if (!RE.decorNom && !codes.includes("trop-petit")) ecarts.push(`relevé décor ${J(e)} : le décor n'est pas lu (valeursGC)`);
      if (codes.includes("autre")) ecarts.push(`relevé décor ${J(e)} : une alerte de l'outil n'a pas de code (entree.ts)`);
      return { codes, vO, vE, RObrut, RE };
    };
    const retenir = (s, renfort, x, n) => {
      const CO = O.chiffrerGC(x.RObrut, x.vO), CE = CH.chiffrerGC(x.RE, x.vE);
      if (J(CO) !== J(CE)) ecarts.push(`relevé décor ${J(e)} : chiffrerGC`);
      return { carre: s, renfort, panneaux: n, R: court(J(x.RE)), hauteurGC: x.RE.hauteurGC, kg: x.RE.kg, prix: CE.conseille, nom: x.RE.decorNom };
    };
    // Dans chaque carré : 1 panneau (ses alertes sont gardées pour les tests), puis 2, puis 3 tant que rien n'est retenu.
    const parCarre = (s, renfortOn, garde) => {
      const x = essai(s, renfortOn, 1);
      garde[s] = x.codes;
      if (!choix && !x.codes.length) choix = retenir(s, renfortOn, x, 1);
      for (let n = 2; n <= 3 && !choix; n++) {
        const xn = essai(s, renfortOn, n);
        if (!xn.codes.length) choix = retenir(s, renfortOn, xn, n);
      }
    };
    for (const s of ORDRE_CARRES) parCarre(s, false, alertes);
    const renfort = {};
    for (const s of CARRES_RENFORT_SEULS) parCarre(s, true, renfort);
    siteDecors.push({ entree: e, alertes, renfort, choix });
  }
  // Depuis le 07/10/2026, chaque décor a une variante aux normes sur toute fenêtre que le site vend (balayage de
  // plans/tests/motifs.test.mjs) : un relevé refusé n'est plus exigé, mais les décors vendus le sont.
  if (siteDecors.filter((r) => r.choix).length < 4) ecarts.push("relevés décor : il faut au moins 4 décors vendus");

  if (ecarts.length) throw new Error("L'OUTIL ET LE CODE EXTRAIT DIFFÈRENT :\n" + ecarts.join("\n"));
  console.log(`\nOutil et code extrait identiques : ${cas.length} cas généraux (${cas.filter((c) => c.lire).length} relus par lire()), ${site.length} relevés du site × ${ORDRE_CARRES.length} carrés × ${CROIX_MAX} croix, ${siteDecors.length} relevés avec un décor, ${variantes} recherches de variantes (${Date.now() - t0} ms).`);
  return {
    "à lire": "Généré par scripts/extraire-moteur-garde-corps.mjs à partir de l'outil de plans (chargé tel quel dans node:vm). Aucun coût : des prix de vente, des poids, des hauteurs et des empreintes (sha256 tronqué) des réponses complètes. Ne pas modifier à la main.",
    outil: empreinteSource,
    empreintes: { moteur: empreinte(texteMoteur.slice(0, texteMoteur.lastIndexOf("export const EMPREINTE ="))), devis: empreinte(texteDevis.slice(0, texteDevis.lastIndexOf("export const EMPREINTE ="))), chiffrage: empreinte(corpsChiffrage) },
    defauts: court(J(trie(DEFAUTS_GC))),
    date: DATE,
    cas: casRef,
    site,
    decors: siteDecors,
  };
}

// ======================================================================================================
// Le décor à volutes (bibliothèque de styles de l'outil, 06/10/2026) : ce que le site propose, et ses vignettes.
// ======================================================================================================

/** Les boutons « Décor à volutes » de la page de l'outil (.choix[data-cible^="decor"]) : leur valeur et leur libellé. */
function boutonsDecor(h) {
  const texte = (t) => t.trim().replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const groupes = {};
  for (const m of h.matchAll(/<div class="choix" data-cible="(decor[A-Za-z]*)">([\s\S]*?)<\/div>/g)) {
    groupes[m[1]] = [...m[2].matchAll(/<button\b[^>]*\bdata-v="([^"]*)"[^>]*>([^<]*)<\/button>/g)].map((b) => ({ id: b[1], nom: texte(b[2]) }));
  }
  return groupes;
}

/**
 * Les choix du décor tels que le site les propose, pris dans l'outil : les assemblages et leur nom (DECOR_NOMS), les formes
 * permises pour chacun (MT_AVEC : « anneaux » et « cœurs » n'en ont qu'une), le nom de chaque forme (MT_NOMS), et les
 * finitions avec le libellé des boutons de l'outil. La première finition de chaque liste est celle de la page de l'outil.
 */
function decorsDuSite(M) {
  const b = boutonsDecor(avantScript);
  const ids = (l) => (l || []).map((x) => x.id);
  const memes = (a, c) => a.length === c.length && [...a].sort().join() === [...c].sort().join();
  const assemblages = Object.keys(M.DECOR_NOMS);
  if (!memes(assemblages, CONTRAT_DECORS.assemblages)) arret(`l'outil propose les décors [${assemblages.join(", ")}] ; l'écran du site attend [${CONTRAT_DECORS.assemblages.join(", ")}] (CONTRAT_DECORS)`);
  if (ids(b.decor).join() !== ["aucun", ...assemblages].join()) arret("les boutons « Décor à volutes » de l'outil ne sont plus « Sans décor » suivi des assemblages de DECOR_NOMS");
  if (assemblages.some((a) => !M.MT_CHOIX.assemblage.includes(a))) arret("un décor de DECOR_NOMS n'est pas un assemblage de la bibliothèque (MT_CHOIX)");
  const formes = {};
  for (const a of assemblages) {
    const f = M.MT_AVEC[a];
    if (!Array.isArray(f) || !f.length || f.some((x) => !CONTRAT_DECORS.formes.includes(x) || !M.MT_CHOIX.forme.includes(x) || !M.MT_NOMS[x])) {
      arret(`le décor « ${a} » permet les formes [${f}] : hors du contrat de l'écran (CONTRAT_DECORS)`);
    }
    formes[a] = [...f];
  }
  const nomsFormes = Object.fromEntries(CONTRAT_DECORS.formes.map((f) => [f, M.MT_NOMS[f]]));
  const liste = (cible, cle, contrat, defaut) => {
    const l = b[cible];
    if (!l || !memes(ids(l), contrat) || l.some((x) => !M.MT_CHOIX[cle].includes(x.id) || !x.nom)) arret(`les boutons « ${cible} » de l'outil ne sont plus [${contrat.join(", ")}]`);
    if (l[0].id !== defaut) arret(`« ${cible} » : la valeur de départ de l'outil (${defaut}) n'est plus le premier bouton`);
    return l.map(({ id, nom }) => ({ id, nom }));
  };
  if (ids(b.decorDore).join() !== "0,1" || DEFAUTS_GC.decorDore !== "0") arret("les boutons « Rehauts dorés » de l'outil ne sont plus Non (0) / Oui (1)");
  return {
    assemblages: assemblages.map((id) => ({ id, nom: M.DECOR_NOMS[id] })),
    formes,
    nomsFormes,
    bouts: liste("decorBouts", "bouts", CONTRAT_DECORS.bouts, DEFAUTS_GC.decorBouts),
    // Plus de bouton « Liaison » dans l'outil : la soudure, seule liaison du module (MT_CHOIX.liaison).
    liaisons: (() => {
      if (b.decorLiaison) return liste("decorLiaison", "liaison", CONTRAT_DECORS.liaisons, DEFAUTS_GC.decorLiaison);
      if (!memes(M.MT_CHOIX.liaison, CONTRAT_DECORS.liaisons)) arret(`la liaison du module n'est plus [${CONTRAT_DECORS.liaisons.join(", ")}]`);
      return [{ id: "soudure", nom: "Soudées" }];
    })(),
    barreaux: liste("decorBarreaux", "barreaux", CONTRAT_DECORS.barreaux, DEFAUTS_GC.decorBarreaux),
    frisesBasses: liste("decorFriseBasse", "friseBasse", CONTRAT_DECORS.frisesBasses, DEFAUTS_GC.decorFriseBasse),
  };
}

/** Le fichier public src/lib/garde-corps-decors.genere.ts : le contrat de l'écran, rempli par l'outil. */
function texteDesDecors(decors) {
  const union = (l) => l.map((x) => JSON.stringify(x)).join(" | ");
  return entete("Le décor à volutes du garde-corps : assemblages, formes permises (MT_AVEC), noms de l'outil (DECOR_NOMS, MT_NOMS, ses boutons). SANS coûts.") +
    `export type AssemblageDecorGC = ${union(CONTRAT_DECORS.assemblages)};\n` +
    `export type FormeDecorGC = ${union(CONTRAT_DECORS.formes)};\n` +
    "function geler<T>(o: T): T {\n  if (o && typeof o === \"object\" && !Object.isFrozen(o)) {\n    for (const x of Object.values(o)) geler(x);\n    Object.freeze(o);\n  }\n  return o;\n}\n" +
    "export const DECORS_GC: {\n" +
    "  assemblages: readonly { id: AssemblageDecorGC; nom: string }[];\n" +
    "  formes: Readonly<Record<AssemblageDecorGC, readonly FormeDecorGC[]>>;\n" +
    "  nomsFormes: Readonly<Record<FormeDecorGC, string>>;\n" +
    `  bouts: readonly { id: ${union(CONTRAT_DECORS.bouts)}; nom: string }[];\n` +
    `  liaisons: readonly { id: ${union(CONTRAT_DECORS.liaisons)}; nom: string }[];\n` +
    `  barreaux: readonly { id: ${union(CONTRAT_DECORS.barreaux)}; nom: string }[];\n` +
    `  frisesBasses: readonly { id: ${union(CONTRAT_DECORS.frisesBasses)}; nom: string }[];\n` +
    `} = geler(${JSON.stringify(decors, null, 1)});\n`;
}

/**
 * Une vignette par décor (assemblage × forme permise), DESSINÉE PAR L'OUTIL : son calcul complet (calculerGC) pour la fenêtre
 * d'appel (1 000 mm de large, bas de fenêtre à 650 mm, en étage), finitions de départ, carré de 16 ; on garde les traits du
 * décor (ceux qui portent un rôle) et le cadre, rendus par svgDe, la fonction de dessin de l'outil. Les traits sont allégés
 * par mtAlleger (la fonction de l'outil), le style est écrit dans le fichier (fond transparent), la boîte serrée au dessin.
 */
function vignettesDecors(M, decors) {
  const ALLEGE = 0.8;   // mm : invisible à la taille d'une vignette (1 000 mm de fenêtre sur quelques centaines de pixels)
  const CADRE = new Set(["Traverses du cadre", "Montants de rive"]);
  const STYLE = {
    cadre: 'fill="#2b2320"',
    fer: 'fill="#2b2320"',
    collier: 'fill="#2b2320"',
    or: 'fill="#b8893f"',
    vrille: 'fill="none" stroke="#d9cdbb" stroke-width="1.4" stroke-linecap="round"',
  };
  const e = { largeurMm: 1000, allegeMm: 650, enEtage: true, fenetreMm: 0, essence: "chene" };
  const out = {};
  for (const { id: a } of decors.assemblages) for (const f of decors.formes[a]) {
    const v = {
      ...valeursGC(DEFAUTS_GC, e, 16, 1, false, false, false, true),
      decor: a, decorForme: f, decorBouts: decors.bouts[0].id, decorLiaison: decors.liaisons[0].id, decorBarreaux: decors.barreaux[0].id,
      decorFriseBasse: decors.frisesBasses[0].id, decorDore: "0",
    };
    const R = M.calculerGC(v);
    if (!R.decorNom) arret(`vignette ${a}-${f} : l'outil n'a pas dessiné de décor`);
    const prims = [];
    for (const p of R.vues.face) {
      if (p.role) {
        if (!Object.hasOwn(STYLE, p.role) || p.role === "cadre") arret(`vignette ${a}-${f} : rôle de trait inconnu « ${p.role} »`);
        if (p.t === "poly") prims.push({ t: "poly", ouvert: p.ouvert === true, cls: p.role, pts: p.role === "vrille" ? p.pts : M.mtAlleger(p.pts, ALLEGE) });
        else if (p.t === "cercle") prims.push({ t: "cercle", cls: p.role, c: p.c, r: p.r });
        else arret(`vignette ${a}-${f} : trait « ${p.t} » inattendu`);
      } else if (p.t === "poly" && CADRE.has(p.piece)) prims.push({ t: "poly", cls: "cadre", pts: p.pts });
    }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    const ajoute = ([x, y], r = 0) => { x1 = Math.min(x1, x - r); x2 = Math.max(x2, x + r); y1 = Math.min(y1, y - r); y2 = Math.max(y2, y + r); };
    for (const p of prims) if (p.pts) p.pts.forEach((q) => ajoute(q)); else ajoute(p.c, p.r);
    const marge = 3;
    const gauche = Math.floor(x1 - marge), haut = Math.floor(-(y2 + marge));
    const vb = [gauche, haut, Math.ceil(x2 + marge) - gauche, Math.ceil(-(y1 - marge)) - haut];
    const corps = M.svgDe(prims).html
      // Au millimètre près (svgDe écrit le dixième) : une vignette n'en montre pas plus, et le fichier pèse moitié moins.
      .replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n)) || 0))
      .replace(/ class="([a-z]+)"/g, (m, c) => { if (!Object.hasOwn(STYLE, c)) arret(`vignette ${a}-${f} : classe « ${c} »`); return " " + STYLE[c]; });
    if (/data-|class=|cliquable/.test(corps)) arret(`vignette ${a}-${f} : attribut de l'outil resté dans le dessin`);
    out[`${a}-${f}.svg`] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}"><!-- ${a}-${f} : dessiné par l'outil de plans (scripts/extraire-moteur-garde-corps.mjs), ne pas modifier à la main. -->${corps}</svg>\n`;
  }
  return out;
}
