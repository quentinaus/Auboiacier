// Extraire le moteur des PORTAILS de l'outil de plans, SANS rien réécrire (même principe que extraire-moteur-garde-corps.mjs).
//
//   npm run portails:extraire -- "<chemin de plans-atelier.html>"              écrit les fichiers
//   npm run portails:extraire -- "<chemin de plans-atelier.html>" --verifier   ne touche à rien : compare
//
// L'outil n'entre jamais dans le dépôt : il contient les coûts de l'atelier. Ce script COPIE, tels quels, les deux blocs
// que l'outil a collés depuis plans/modules/ (entre leurs repères), et écrit :
//   src/lib/portails-outil/moteur.genere.mjs      motifs.js (le décor, lot 3) + plans-portails.js : la géométrie, le débit,
//                                                 les dessins, les contrôles ; AUCUN prix (refus si un nom de tarif ou un
//                                                 prix d'achat y apparaît). motifs.js y entre SANS commentaires, et son
//                                                 catalogue des volutes du commerce ANONYMISÉ : ni référence, ni fournisseur,
//                                                 ni clé de prix (chaque référence devient « c1 », « c2 »…) ;
//   src/lib/portails-outil/chiffrage.chiffre.mjs  chiffrage-motifs.js + chiffrage-portails.js + les réglages, SEULS les
//                                                 tarifs utilisés, et la table « c1 » → clé de prix du catalogue,
//                                                 CHIFFRÉS avec la clé du serveur (le dépôt GitHub est public) ;
//   tests/reference/portails-outil.json           ce que l'outil répond sur une série de portails : prix de vente
//                                                 seulement, jamais un coût.
import { createHash } from "node:crypto";
import * as acorn from "acorn";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chiffrer, dechiffrer, empreinte, lireCle } from "../src/lib/garde-corps-outil/coffre.ts";

const args = process.argv.slice(2);
const SOURCE = args.find((a) => !a.startsWith("--"));
const VERIFIER = args.includes("--verifier");
if (!SOURCE) {
  console.error('Usage : npm run portails:extraire -- "<chemin de plans-atelier.html>" [--verifier]');
  process.exit(2);
}
const arret = (m) => { console.error("\nREFUS : " + m); process.exit(1); };
const RACINE = fileURLToPath(new URL("..", import.meta.url));
const DOSSIER = join(RACINE, "src/lib/portails-outil");
const REFERENCE = join(RACINE, "tests/reference/portails-outil.json");
const sha = (t) => createHash("sha256").update(t).digest("hex");

const html = readFileSync(SOURCE, "utf8");
/** Le texte entre deux repères ; le repère de début est un texte ou une RegExp (la date du collage change à chaque collage). */
function entre(debut, fin) {
  const re = typeof debut === "string" ? new RegExp(debut.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"), "g") : new RegExp(debut.source, "g");
  const trouves = [...html.matchAll(re)];
  if (trouves.length !== 1) arret(`repère introuvable ou en double dans l'outil : ${typeof debut === "string" ? debut.trim() : debut.source}`);
  const i = trouves[0].index, long = trouves[0][0].length;
  const j = html.indexOf(fin, i);
  if (j < 0) arret(`repère de fin introuvable : ${fin.trim()}`);
  return html.slice(i + long, j);
}
const plans = entre(/\/\* ---------- Portails \(plans\/modules\/plans-portails\.js, collé tel quel le \d\d\/\d\d\/\d{4}\) ---------- \*\/\n/, "\n  /* ---------- fin du module des portails ---------- */");
const chiffrage = entre(/\/\* ---------- Chiffrage des portails \(plans\/modules\/chiffrage-portails\.js, collé tel quel le \d\d\/\d\d\/\d{4}\) ---------- \*\/\n/, "/* ---------- fin du chiffrage des portails ---------- */");
const tarifs = entre("/* ---- TARIFS GÉNÉRÉS DEPUIS LE TABLEUR (début)", "/* ---- TARIFS GÉNÉRÉS DEPUIS LE TABLEUR (fin)");
const motifsBrut = entre(/\/\* ---- MODULE motifs\.js \(début\)[^\n]*\n/, "/* ---- MODULE motifs.js (fin)");
const chiffrageMotifs = entre(/\/\* ---- MODULE chiffrage-motifs\.js \(début\)[^\n]*\n/, "/* ---- MODULE chiffrage-motifs.js (fin)");

// ---------- 0. motifs.js pour le code public : sans commentaires, catalogue anonymisé ----------
// Les commentaires retirés comme pour le garde-corps (acorn) : seul sur sa ligne, la ligne part ; en fin de ligne, lui et
// les espaces d'avant ; au milieu du code, une espace. Rien d'autre ne bouge (les gabarits `…` gardent leurs espaces).
function sansCommentaires(js) {
  const c = [];
  acorn.parse(js, { ecmaVersion: "latest", sourceType: "script", onComment: (bloc, t, s, e) => c.push([s, e, bloc]) });
  let out = "", i = 0;
  for (const [s, e, bloc] of c) {
    if (s < i) continue;
    const ls = js.lastIndexOf("\n", s - 1) + 1, f = js.indexOf("\n", e), le = f === -1 ? js.length : f;
    const seulAvant = ls >= i && js.slice(ls, s).trim() === "", seulApres = js.slice(e, le).trim() === "";
    if (seulAvant && seulApres) { out += js.slice(i, ls); i = Math.min(le + 1, js.length); }
    else if (seulApres) { out += js.slice(i, s).replace(/[ \t]+$/, ""); i = e; }
    else { out += js.slice(i, s) + (bloc ? " " : ""); i = e; }
  }
  return out + js.slice(i);
}
// Le catalogue : chaque référence du commerce (fournisseur + référence) devient un code anonyme « cN » ; la clé de prix
// et la note partent. La table code → clé de prix ne voyage que dans le chiffrage chiffré (PTC_CLES_CATALOGUE).
const clesCatalogue = {}, codes = new Map(), refsRetirees = new Set(), fournisseurs = new Set();
const motifs = sansCommentaires(motifsBrut)
  .replace(/const MT_CATALOGUE = \[([\s\S]*?)\n\];/, (tout, corps) => "const MT_CATALOGUE = [" + corps.split("\n").map((l) => {
    if (!/^\s*\{ forme:/.test(l)) return l;
    const ref = (l.match(/ref: "([^"]*)"/) || [])[1], fo = (l.match(/fournisseur: "([^"]*)"/) || [])[1], prix = (l.match(/prixCle: "([^"]*)"/) || [])[1];
    if (!ref || !fo || !prix) arret(`MT_CATALOGUE : ligne sans référence, fournisseur ou clé de prix : ${l.trim().slice(0, 80)}`);
    const k = `${fo} ${ref}`;
    if (!codes.has(k)) codes.set(k, `c${codes.size + 1}`);
    const id = codes.get(k);
    if (clesCatalogue[id] && clesCatalogue[id] !== prix) arret(`MT_CATALOGUE : la référence ${k} a deux clés de prix`);
    clesCatalogue[id] = prix; refsRetirees.add(ref); fournisseurs.add(fo);
    return l.replace(/ref: "[^"]*"/, `ref: "${id}"`).replace(/fournisseur: "[^"]*"/, 'fournisseur: ""').replace(/,\s*prixCle: "[^"]*"/, "").replace(/,\s*note: "(?:[^"\\]|\\.)*"/, "");
  }).join("\n") + "\n];")
  .replace(/const MT_FOURNISSEURS = \{[^\n]*\};/, "const MT_FOURNISSEURS = {};")
  // Le champ de la clé de prix recopié sur les pièces et les commandes : sans objet dans le code public (toujours vide).
  .replace(/,\s*prixCle: e\.prixCle/g, "");
if (!codes.size) arret("motifs.js : catalogue des volutes (MT_CATALOGUE) introuvable");
for (const x of [/prixCle/, /€/, ...[...fournisseurs].map((f) => new RegExp(`"${f}"`)), ...[...refsRetirees].map((r) => new RegExp(`"${r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`))]) {
  if (x.test(motifs)) arret(`motifs.js public : « ${x.source} » est encore là (référence, fournisseur ou prix)`);
}
// Le dessin SVG de l'outil (bornes, coteGeom, svgDe) : le même rendu que les plans, sans passer par le moteur du garde-corps.
const dessin = entre("  /* ---------- Dessin SVG ---------- */\n", "  function dessiner(svg, prims, petit = false) {");
if (!/function svgDe\(/.test(dessin) || /document|window/.test(dessin)) arret("le dessin SVG de l'outil a changé de forme");

// ---------- 1. Le moteur public : aucun prix ----------
for (const interdit of [/\bTARIFS_ACHATS\b/, /\bREGLAGES\b/, /\bprixPaye\b/, /\bht:/, /\bheure_atelier\b/, /\bchiffrerPortail\b/]) {
  if (interdit.test(plans)) arret(`le moteur des portails contient « ${interdit.source} » : il ne doit porter aucun prix`);
}
for (const n of ["calculerPortail", "ptEntrees", "PT_STYLES", "PT_MODELES", "PT_ATELIER", "PT_MATIERES", "PT_DECOR_FORMULES", "PT_MOTEURS"]) {
  if (!new RegExp(`^(?:const|function) ${n}\\b`, "m").test(plans)) arret(`${n} absent du moteur`);
}
const enTete = (quoi) => `// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : NE PAS MODIFIER À LA MAIN.\n// ${quoi}\n// Source : l'outil de plans (plans-atelier.html), sha256 ${sha(html).slice(0, 24)}.\n`;
const moteur = enTete("Le moteur des PORTAILS (plans/modules/motifs.js sans commentaires ni catalogue nominatif, puis plans-portails.js, tels que collés dans l'outil) : géométrie, débit, dessins, contrôles. Aucun prix.")
  + "/* eslint-disable */\n" + motifs + "\n" + plans + "\n" + dessin
  + `\nexport { calculerPortail, ptEntrees, svgDe, PT_STYLES, PT_MODELES, PT_ATELIER, PT_MATIERES, PT_DECOR_FORMULES, PT_MOTEURS, MT_AVEC, MT_NOMS };\nexport const EMPREINTE = ${JSON.stringify(empreinte(motifs + plans))};\n`;
const moteurTypes = `// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : types du moteur des portails (moteur.genere.mjs).
export type Primitive = { t: string; [k: string]: unknown };
export type ResultatPortail = {
  vues: { face: Primitive[]; cote: Primitive[]; dessus: Primitive[] };
  debit: { nom: string; qte: number; mat: string; long: number; coupes: string; note: string; groupe: string }[];
  alertes: string[]; avertissements: string[]; oks: string[]; notes: string[];
  resume: [string, string][];
  poids: number; kg: number; grandeCote: number;
  dims: { P: number; H: number; type: string; vantaux: number[]; gs: number; hautMax: number };
  quant: Record<string, unknown>;
  config: Record<string, unknown> & { type: string; mat: string; remp: string; decor: string };
  decor: { formule: string; nom: string; refus: { quoi: string; raison: string }[]; cimierH: number } | null;
  moteurs?: { permis: { cle: string; nom: string; facilite: number; garantie: number }[]; refus: { cle: string | null; nom: string; raison: string }[]; conseille: { cle: string } | null; choisi: { cle: string } | null; barrePalpeuse: boolean; notes: string[] };
  pose?: { ouvrages: { rep: number; nom: string; qte: number; cotes: string; quiFait: string; delai: string }[]; reservations: { nom: string; quiFait: string; detail: string }[]; electricite: string[]; essais: string[]; prerequis: string[]; controle: string[]; notes: string[] };
};
export declare function calculerPortail(v: Record<string, unknown>, modele: string): ResultatPortail;
export declare function ptEntrees(v: Record<string, unknown>, modele: string): Record<string, unknown>;
export declare const PT_STYLES: Readonly<Record<string, Record<string, unknown> & { nom: string }>>;
export declare const PT_MODELES: Readonly<Record<string, { type: string; nom: string }>>;
export declare function svgDe(prims: readonly unknown[], petit?: boolean | string): { vb: number[]; fs: number; html: string };
export declare const PT_ATELIER: Readonly<Record<string, unknown> & { bornes: { P: Record<string, [number, number]>; H: [number, number]; fleche: [number, number] } }>;
export declare const PT_MATIERES: Readonly<Record<string, unknown>>;
export declare const PT_DECOR_FORMULES: Readonly<Record<string, { nom: string; ligne: string; choix: Record<string, string>[] }>>;
export declare const MT_AVEC: Readonly<Record<string, string[]>>;
export declare const PT_MOTEURS: Readonly<{ cle: string; nom: string; ref: string; pour: string[]; principe: string; contenu: string; garantie: number }[]>;
export declare const MT_NOMS: Readonly<Record<string, string>>;
export declare const EMPREINTE: string;
`;

// ---------- 2. Le chiffrage, chiffré : seulement les tarifs qu'il utilise ----------
const cles = new Set([...(chiffrageMotifs + chiffrage).matchAll(/"([a-z0-9_]+)"/g), ...chiffrageMotifs.matchAll(/^\s{2}([a-z0-9_]+): \{ ht:/gm)].map((m) => m[1]).concat(["heure_atelier"], Object.values(clesCatalogue)));
const lignesTarifs = tarifs.split("\n");
const debutT = lignesTarifs.findIndex((l) => l.startsWith("const TARIFS_ACHATS = {"));
const finT = lignesTarifs.findIndex((l, i) => i > debutT && l === "};");
if (debutT < 0 || finT < 0) arret("bloc TARIFS_ACHATS introuvable");
const gardees = lignesTarifs.slice(debutT + 1, finT).filter((l) => { const m = l.match(/^ {2}([a-z0-9_]+): \{/); return m && cles.has(m[1]); });
const debutR = lignesTarifs.findIndex((l) => l.startsWith("const REGLAGES = {"));
const finR = lignesTarifs.findIndex((l, i) => i > debutR && l === "};");
const reglages = lignesTarifs.slice(debutR, finR + 1).join("\n");
// Un tarif manquant se voit au calcul de la référence (étape 3) : « tarif inconnu dans Prix des achats ».
const clair = `${reglages}\nconst TARIFS_ACHATS = {\n${gardees.join("\n")}\n};\nconst PTC_CLES_CATALOGUE = ${JSON.stringify(clesCatalogue)};\n${chiffrageMotifs}\n${chiffrage}`;
const cle = lireCle(RACINE);
if (!cle) arret("clé du chiffrage absente (.env.chiffrage.local ou CHIFFRAGE_GARDE_CORPS_CLE)");
const paquet = chiffrer(clair, cle);
if (dechiffrer(paquet, cle) !== clair) arret("le chiffrage ne se relit pas");
const chiffre = enTete("Le CHIFFRAGE des portails (coûts, fournisseurs, heure, frais fixes), CHIFFRÉ. Lu par le serveur seulement, avec la clé.")
  + `export const CHIFFRE = ${JSON.stringify(paquet)};\nexport const EMPREINTE_CLAIR = ${JSON.stringify(empreinte(clair))};\nexport const EMPREINTE_SOURCE = ${JSON.stringify(sha(html))};\n`;
const chiffreTypes = "// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : types du chiffrage chiffré.\nexport declare const CHIFFRE: string;\nexport declare const EMPREINTE_CLAIR: string;\nexport declare const EMPREINTE_SOURCE: string;\n";

// ---------- 3. La référence : ce que l'outil répond (prix de vente seulement) ----------
const evalMoteur = new Function(`"use strict";\n${motifs}\n${plans}\nreturn { calculerPortail };`)();
const evalChiffrage = new Function(`"use strict";\n${clair}\nreturn { chiffrerPortail, PTC_CLES_CATALOGUE };`)();
const CAS = [];
for (const modele of ["ptBattant", "ptCoulissant", "ptPliant", "ptPortillon"]) for (const ptStyle of ["plein", "lisse", "barreaux", "lamesChene", "rosace", "volutes"])
  for (const opts of [{}, { ptMoteur: true }, { ptPoteaux: "alu" }, { ptGuidage: "auto" }, { ptP: modele === "ptPortillon" ? 1200 : 4200, ptH: 1800 }])
    CAS.push({ modele, v: { ptStyle, ...(modele === "ptPortillon" ? { ptP: 1000 } : {}), ...opts } });
// Les moteurs (lot 4) : Axovia demandé sur le battant ; Elixo et barre palpeuse sur un coulissant ajouré.
CAS.push({ modele: "ptBattant", v: { ptStyle: "plein", ptMoteur: true, ptMoteurModele: "axovia" } }, { modele: "ptCoulissant", v: { ptStyle: "barreaux", ptMoteur: true } });
// Les décors (lot 3) : chaque formule sur le battant et le portillon, avec le catalogue anonymisé du site.
for (const modele of ["ptBattant", "ptPortillon"]) for (const ptDecor of ["classique", "frise", "medaillon", "couronnement", "coeurs", "surMesure"])
  CAS.push({ modele, v: { ptStyle: "barreaux", ptDecor, ...(modele === "ptPortillon" ? { ptP: 1000 } : {}) } });
// « Personnaliser » (lot 10) : deux emplacements, un motif soudé sur le bas plein, les finitions (bouts, barreaux, pointes).
const perso = (L) => JSON.stringify(L);
CAS.push(
  { modele: "ptBattant", v: { ptStyle: "barreaux", ptMat: "acier", ptDecor: "perso", ptDecorChoix: perso([{ assemblage: "entre", forme: "S", pos: "milieu" }, { assemblage: "cimier", forme: "C" }]) } },
  { modele: "ptBattant", v: { ptStyle: "barreaux", ptMat: "acier", ptSoub: "plein", ptHSoub: 600, ptDecor: "perso", ptDecorChoix: perso([{ assemblage: "appliquePlein", forme: "doubleC" }]) } },
  { modele: "ptCoulissant", v: { ptStyle: "barreaux", ptMat: "acier", ptDecor: "perso", ptDecorChoix: perso([{ assemblage: "coeurs", forme: "coeur", rythme: "unSurDeux" }]), ptBouts: "bouton", ptBarreauxDeco: "torsade", ptPointes: true } },
  { modele: "ptPortillon", v: { ptStyle: "barreaux", ptMat: "acier", ptP: 1000, ptDecor: "perso", ptDecorChoix: perso([{ assemblage: "frise", forme: "C", rythme: "alterne", forme2: "S" }]) } },
);
// Le portillon assorti (lot 10) : chiffré en complément du portail (o.complement : visite, route et frais fixes une fois).
for (const ptStyle of ["plein", "lamesChene", "rosace", "volutes"]) CAS.push({ modele: "ptPortillon", v: { ptStyle, ptP: 1000 }, o: { complement: true } });
const reference = CAS.map(({ modele, v, o }) => {
  const R = evalMoteur.calculerPortail(v, modele);
  const C = evalChiffrage.chiffrerPortail(R, v, undefined, { ...o, clesCatalogue: evalChiffrage.PTC_CLES_CATALOGUE });
  return { modele, v, ...(o ? { o } : {}), prix: C.conseille, alertes: R.alertes.length, poids: Math.round(R.poids) };
});
// Parité : le site (motifs.js public, catalogue anonymisé, clés rendues par le chiffrage) doit donner le MÊME prix que
// l'outil complet (motifs.js tel quel, références et clés de prix), portail par portail. Sinon on n'écrit rien.
const evalComplet = new Function(`"use strict";\n${motifsBrut}\n${plans}\nreturn { calculerPortail };`)();
const ecartsParite = CAS.map(({ modele, v, o }, i) => {
  const R = evalComplet.calculerPortail(v, modele);
  const prixOutil = R.alertes.length ? null : evalChiffrage.chiffrerPortail(R, v, undefined, o).conseille;
  const site = reference[i];
  return site.alertes ? (R.alertes.length ? null : `${modele} ${JSON.stringify(v)} : refusé sur le site, pas dans l'outil`) : prixOutil === site.prix ? null : `${modele} ${JSON.stringify(v)} : outil ${prixOutil} €, site ${site.prix} €`;
}).filter(Boolean);
if (ecartsParite.length) arret(`le site ne donne pas le prix de l'outil :\n${ecartsParite.slice(0, 10).join("\n")}`);
const refTexte = JSON.stringify({ source: sha(html).slice(0, 24), moteur: empreinte(plans), cas: reference }, null, 1) + "\n";

// ---------- 4. Écrire, ou seulement comparer ----------
const fichiers = [
  [join(DOSSIER, "moteur.genere.mjs"), moteur], [join(DOSSIER, "moteur.genere.d.mts"), moteurTypes],
  [join(DOSSIER, "chiffrage.chiffre.mjs"), chiffre], [join(DOSSIER, "chiffrage.chiffre.d.mts"), chiffreTypes],
  [REFERENCE, refTexte],
];
if (VERIFIER) {
  const ecarts = fichiers.filter(([f, t]) => { try { return readFileSync(f, "utf8") !== t; } catch { return true; } }).map(([f]) => f.replace(RACINE, ""));
  console.log(ecarts.length ? `À régénérer : ${ecarts.join(", ")}` : "Le site est à jour avec l'outil.");
  process.exit(ecarts.length ? 1 : 0);
}
mkdirSync(DOSSIER, { recursive: true });
mkdirSync(join(RACINE, "tests/reference"), { recursive: true });
for (const [f, t] of fichiers) writeFileSync(f, t);
console.log(`Écrit : moteur (${plans.length} signes), chiffrage chiffré (${gardees.length} tarifs), référence (${reference.length} portails).`);
