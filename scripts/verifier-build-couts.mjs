// Après « npm run build » : prouve qu'aucun coût de l'atelier n'est parti dans ce que le navigateur reçoit.
//
//   npm run garde-corps:verifier-build
//
// Lit tout .next/static (le JavaScript et le CSS publics) et les pages déjà fabriquées (.next/server/app :
// fichiers .html, .rsc, .body, .meta — pas le code du serveur), et y cherche :
// - les valeurs de coûts et les noms du chiffrage, tirés du chiffrage déchiffré avec la clé (jamais écrits) ;
// - les noms des fonctions du moteur et du chiffrage (calculerGC, chiffrerGC…) ;
// - le texte chiffré et la clé elle-même.
// Sort en erreur au moindre résultat.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chainesSecretes, FONCTIONS_SERVEUR, secretsDans } from "./outil-plans/secrets.mjs";
import { texteDuChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { lireCle } from "../src/lib/garde-corps-outil/coffre.ts";
import { CHIFFRE } from "../src/lib/garde-corps-outil/chiffrage.chiffre.mjs";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const NEXT = join(RACINE, ".next");
if (!existsSync(join(NEXT, "static"))) {
  console.error("Pas de .next/static : lancer d'abord « npm run build ».");
  process.exit(2);
}
const corps = texteDuChiffrage(RACINE);
if (!corps) {
  console.error("Clé du chiffrage absente ou invalide : contrôle impossible.");
  process.exit(2);
}
const { valeurs, noms } = chainesSecretes(corps);
const cle = lireCle(RACINE).toString("base64");
const morceauxChiffre = CHIFFRE.split(".").slice(1).map((m) => m.slice(0, 32));
const cherchees = [...valeurs, ...noms, ...FONCTIONS_SERVEUR, cle, ...morceauxChiffre];

function fichiers(dossier, garder) {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier).flatMap((nom) => {
    const f = join(dossier, nom);
    return statSync(f).isDirectory() ? fichiers(f, garder) : garder(f) ? [f] : [];
  });
}
const publics = [
  ...fichiers(join(NEXT, "static"), () => true),
  ...fichiers(join(NEXT, "server", "app"), (f) => /\.(html|rsc|body|meta)$/.test(f)),
];
let trouves = 0;
for (const f of publics) {
  const texte = readFileSync(f, "latin1") + "\n" + readFileSync(f, "utf8");
  const x = secretsDans(texte, cherchees);
  if (x.length) {
    trouves += x.length;
    // On dit OÙ, et combien ; on n'affiche pas la valeur (elle pourrait être un coût).
    console.error(`TROUVÉ dans ${relative(RACINE, f)} : ${x.length} chaîne(s) interdite(s)${x.some((s) => FONCTIONS_SERVEUR.includes(s)) ? ` (dont ${x.filter((s) => FONCTIONS_SERVEUR.includes(s)).join(", ")})` : ""}`);
  }
}
console.log(`${publics.length} fichiers publics lus, ${cherchees.length} chaînes cherchées (${valeurs.length} valeurs de coûts, ${noms.length} noms du chiffrage, ${FONCTIONS_SERVEUR.length} fonctions, la clé, le texte chiffré).`);
if (trouves) {
  console.error(`ÉCHEC : ${trouves} chaîne(s) interdite(s) dans le JavaScript public.`);
  process.exit(1);
}
console.log("PROPRE : aucun coût, aucune fonction du chiffrage, ni la clé, dans ce que le navigateur reçoit.");
