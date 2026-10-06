// Extraire le moteur des PORTAILS de l'outil de plans, SANS rien réécrire (même principe que extraire-moteur-garde-corps.mjs).
//
//   npm run portails:extraire -- "<chemin de plans-atelier.html>"              écrit les fichiers
//   npm run portails:extraire -- "<chemin de plans-atelier.html>" --verifier   ne touche à rien : compare
//
// L'outil n'entre jamais dans le dépôt : il contient les coûts de l'atelier. Ce script COPIE, tels quels, les deux blocs
// que l'outil a collés depuis plans/modules/ (entre leurs repères), et écrit :
//   src/lib/portails-outil/moteur.genere.mjs      plans-portails.js : la géométrie, le débit, les dessins, les contrôles ;
//                                                 AUCUN prix (refus si un nom de tarif ou un prix d'achat y apparaît) ;
//   src/lib/portails-outil/chiffrage.chiffre.mjs  chiffrage-portails.js + les réglages et SEULS les tarifs qu'il utilise,
//                                                 CHIFFRÉS avec la clé du serveur (le dépôt GitHub est public) ;
//   tests/reference/portails-outil.json           ce que l'outil répond sur une série de portails : prix de vente
//                                                 seulement, jamais un coût.
import { createHash } from "node:crypto";
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
function entre(debut, fin) {
  const i = html.indexOf(debut);
  if (i < 0 || html.indexOf(debut, i + 1) >= 0) arret(`repère introuvable ou en double dans l'outil : ${debut.trim()}`);
  const j = html.indexOf(fin, i);
  if (j < 0) arret(`repère de fin introuvable : ${fin.trim()}`);
  return html.slice(i + debut.length, j);
}
const plans = entre("/* ---------- Portails (plans/modules/plans-portails.js, collé tel quel le 06/10/2026) ---------- */\n", "\n  /* ---------- fin du module des portails ---------- */");
const chiffrage = entre("/* ---------- Chiffrage des portails (plans/modules/chiffrage-portails.js, collé tel quel le 06/10/2026) ---------- */\n", "/* ---------- fin du chiffrage des portails ---------- */");
const tarifs = entre("/* ---- TARIFS GÉNÉRÉS DEPUIS LE TABLEUR (début)", "/* ---- TARIFS GÉNÉRÉS DEPUIS LE TABLEUR (fin)");
// Le dessin SVG de l'outil (bornes, coteGeom, svgDe) : le même rendu que les plans, sans passer par le moteur du garde-corps.
const dessin = entre("  /* ---------- Dessin SVG ---------- */\n", "  function dessiner(svg, prims, petit = false) {");
if (!/function svgDe\(/.test(dessin) || /document|window/.test(dessin)) arret("le dessin SVG de l'outil a changé de forme");

// ---------- 1. Le moteur public : aucun prix ----------
for (const interdit of [/\bTARIFS_ACHATS\b/, /\bREGLAGES\b/, /\bprixPaye\b/, /\bht:/, /\bheure_atelier\b/, /\bchiffrerPortail\b/]) {
  if (interdit.test(plans)) arret(`le moteur des portails contient « ${interdit.source} » : il ne doit porter aucun prix`);
}
for (const n of ["calculerPortail", "ptEntrees", "PT_STYLES", "PT_MODELES", "PT_ATELIER", "PT_MATIERES"]) {
  if (!new RegExp(`^(?:const|function) ${n}\\b`, "m").test(plans)) arret(`${n} absent du moteur`);
}
const enTete = (quoi) => `// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : NE PAS MODIFIER À LA MAIN.\n// ${quoi}\n// Source : l'outil de plans (plans-atelier.html), sha256 ${sha(html).slice(0, 24)}.\n`;
const moteur = enTete("Le moteur des PORTAILS (plans/modules/plans-portails.js, tel que collé dans l'outil) : géométrie, débit, dessins, contrôles. Aucun prix.")
  + "/* eslint-disable */\n" + plans + "\n" + dessin
  + `\nexport { calculerPortail, ptEntrees, svgDe, PT_STYLES, PT_MODELES, PT_ATELIER, PT_MATIERES };\nexport const EMPREINTE = ${JSON.stringify(empreinte(plans))};\n`;
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
  config: Record<string, unknown> & { type: string; mat: string; remp: string };
};
export declare function calculerPortail(v: Record<string, unknown>, modele: string): ResultatPortail;
export declare function ptEntrees(v: Record<string, unknown>, modele: string): Record<string, unknown>;
export declare const PT_STYLES: Readonly<Record<string, Record<string, unknown> & { nom: string }>>;
export declare const PT_MODELES: Readonly<Record<string, { type: string; nom: string }>>;
export declare function svgDe(prims: readonly unknown[], petit?: boolean | string): { vb: number[]; fs: number; html: string };
export declare const PT_ATELIER: Readonly<Record<string, unknown> & { bornes: { P: Record<string, [number, number]>; H: [number, number]; fleche: [number, number] } }>;
export declare const PT_MATIERES: Readonly<Record<string, unknown>>;
export declare const EMPREINTE: string;
`;

// ---------- 2. Le chiffrage, chiffré : seulement les tarifs qu'il utilise ----------
const cles = new Set([...chiffrage.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]).concat(["heure_atelier"]));
const lignesTarifs = tarifs.split("\n");
const debutT = lignesTarifs.findIndex((l) => l.startsWith("const TARIFS_ACHATS = {"));
const finT = lignesTarifs.findIndex((l, i) => i > debutT && l === "};");
if (debutT < 0 || finT < 0) arret("bloc TARIFS_ACHATS introuvable");
const gardees = lignesTarifs.slice(debutT + 1, finT).filter((l) => { const m = l.match(/^ {2}([a-z0-9_]+): \{/); return m && cles.has(m[1]); });
const debutR = lignesTarifs.findIndex((l) => l.startsWith("const REGLAGES = {"));
const finR = lignesTarifs.findIndex((l, i) => i > debutR && l === "};");
const reglages = lignesTarifs.slice(debutR, finR + 1).join("\n");
// Un tarif manquant se voit au calcul de la référence (étape 3) : « tarif inconnu dans Prix des achats ».
const clair = `${reglages}\nconst TARIFS_ACHATS = {\n${gardees.join("\n")}\n};\n${chiffrage}`;
const cle = lireCle(RACINE);
if (!cle) arret("clé du chiffrage absente (.env.chiffrage.local ou CHIFFRAGE_GARDE_CORPS_CLE)");
const paquet = chiffrer(clair, cle);
if (dechiffrer(paquet, cle) !== clair) arret("le chiffrage ne se relit pas");
const chiffre = enTete("Le CHIFFRAGE des portails (coûts, fournisseurs, heure, frais fixes), CHIFFRÉ. Lu par le serveur seulement, avec la clé.")
  + `export const CHIFFRE = ${JSON.stringify(paquet)};\nexport const EMPREINTE_CLAIR = ${JSON.stringify(empreinte(clair))};\nexport const EMPREINTE_SOURCE = ${JSON.stringify(sha(html))};\n`;
const chiffreTypes = "// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : types du chiffrage chiffré.\nexport declare const CHIFFRE: string;\nexport declare const EMPREINTE_CLAIR: string;\nexport declare const EMPREINTE_SOURCE: string;\n";

// ---------- 3. La référence : ce que l'outil répond (prix de vente seulement) ----------
const evalMoteur = new Function(`"use strict";\n${plans}\nreturn { calculerPortail };`)();
const evalChiffrage = new Function(`"use strict";\n${clair}\nreturn { chiffrerPortail };`)();
const CAS = [];
for (const modele of ["ptBattant", "ptCoulissant", "ptPliant", "ptPortillon"]) for (const ptStyle of ["plein", "lisse", "barreaux", "lamesChene", "rosace", "volutes"])
  for (const opts of [{}, { ptMoteur: true }, { ptPoteaux: "alu" }, { ptGuidage: "auto" }, { ptP: modele === "ptPortillon" ? 1200 : 4200, ptH: 1800 }])
    CAS.push({ modele, v: { ptStyle, ...(modele === "ptPortillon" ? { ptP: 1000 } : {}), ...opts } });
const reference = CAS.map(({ modele, v }) => {
  const R = evalMoteur.calculerPortail(v, modele);
  const C = evalChiffrage.chiffrerPortail(R, v);
  return { modele, v, prix: C.conseille, alertes: R.alertes.length, poids: Math.round(R.poids) };
});
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
