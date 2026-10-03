/**
 * Les coûts de l'atelier (prix d'achat, fournisseurs, heure, frais fixes,
 * coût de revient, plancher) ne sortent JAMAIS du serveur.
 *
 * - Aucun composant du navigateur (« use client ») n'importe, même par
 *   ricochet, le calcul du garde-corps (src/lib/garde-corps-outil/) ni un
 *   fichier *.server.* : sinon Next les mettrait dans le JavaScript public.
 * - Une seule porte : src/lib/prix-garde-corps.server.ts, qui commence par
 *   import "server-only" (la compilation échoue si le navigateur l'importe).
 * - Le dépôt GitHub est public : le chiffrage n'y est que chiffré, la clé
 *   n'y est jamais, et aucune « chaîne de coûts » n'apparaît en clair dans un
 *   fichier suivi par git. La liste de ces chaînes est tirée, au moment du
 *   test, du chiffrage déchiffré (elle n'est écrite nulle part).
 *
 * Le contrôle du JavaScript réellement publié (.next/static) se fait après
 * « npm run build » : npm run garde-corps:verifier-build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CHIFFRE } from "../src/lib/garde-corps-outil/chiffrage.chiffre.mjs";
import { texteDuChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { FICHIER_CLE, lireCle } from "../src/lib/garde-corps-outil/coffre.ts";
import { chainesSecretes, DECLARATIONS_COUTS, secretsDans } from "../scripts/outil-plans/secrets.mjs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(RACINE, "src");
const OUTIL = join(SRC, "lib", "garde-corps-outil");
const PORTE = join(SRC, "lib", "prix-garde-corps.server.ts");
const rel = (f: string) => relative(RACINE, f);

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const f = join(dossier, nom);
    if (statSync(f).isDirectory()) return fichiers(f);
    return /\.(ts|tsx|mts|mjs|js|jsx)$/.test(nom) && !nom.endsWith(".d.mts") && !nom.endsWith(".d.ts") ? [f] : [];
  });
}
const SOURCES = fichiers(SRC);

// Les modules qu'un fichier importe (import, export … from, import()), résolus en chemins de fichiers.
function imports(fichier: string): string[] {
  const texte = readFileSync(fichier, "utf8");
  const specs = [...texte.matchAll(/(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] ?? m[2]);
  const out: string[] = [];
  for (const spec of specs) {
    let base: string | null = null;
    if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
    else if (spec.startsWith(".")) base = resolve(dirname(fichier), spec);
    if (!base) continue;
    const trouve = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`, join(base, "index.ts"), join(base, "index.tsx")].find((c) => existsSync(c) && statSync(c).isFile());
    if (trouve) out.push(trouve);
  }
  return out;
}
const estClient = (f: string) => /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*["']use client["']/.test(readFileSync(f, "utf8"));
const interdit = (f: string) => f.startsWith(OUTIL + "/") || /\.server\.[a-z]+$/.test(f);

test("aucun composant du navigateur n'atteint le calcul du garde-corps, même par ricochet", () => {
  const clients = SOURCES.filter(estClient);
  assert.ok(clients.length > 5, "les composants « use client » doivent être trouvés");
  for (const depart of clients) {
    const vus = new Set<string>();
    const pile: [string, string[]][] = [[depart, [rel(depart)]]];
    while (pile.length) {
      const [f, chemin] = pile.pop()!;
      if (vus.has(f)) continue;
      vus.add(f);
      for (const g of imports(f)) {
        assert.ok(!interdit(g), `le navigateur atteindrait ${rel(g)} : ${[...chemin, rel(g)].join(" → ")}`);
        pile.push([g, [...chemin, rel(g)]]);
      }
    }
  }
});

test("une seule porte vers le calcul : src/lib/prix-garde-corps.server.ts", () => {
  for (const f of SOURCES) {
    if (f.startsWith(OUTIL + "/") || f === PORTE) continue;
    for (const g of imports(f)) assert.ok(!g.startsWith(OUTIL + "/"), `${rel(f)} importe ${rel(g)} : passer par src/lib/prix-garde-corps.server.ts`);
  }
});

test("la porte commence par import \"server-only\"", () => {
  const texte = readFileSync(PORTE, "utf8");
  assert.match(texte, /^import "server-only";\n/);
});

test("la livraison n'a qu'un calcul sur le site : livraisonGC (sans le verre) ne passe pas la porte", () => {
  // livraisonGC pèse le garde-corps de l'outil, sans le verre : elle ne sert qu'aux tests de parité.
  // Le site livre au poids de la ligne, verre compris (tarifer ; livraisonDevisGC pour le devis).
  const sansCommentaires = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert.doesNotMatch(sansCommentaires(PORTE), /\blivraisonGC\b/);
  for (const f of SOURCES) {
    if (f.startsWith(OUTIL + "/")) continue;
    assert.doesNotMatch(sansCommentaires(f), /\blivraisonGC\b/, `${rel(f)} utilise livraisonGC`);
  }
});

test("la route /api/prix-garde-corps passe par la porte et limite le débit", () => {
  const route = readFileSync(join(SRC, "app", "api", "prix-garde-corps", "route.ts"), "utf8");
  assert.match(route, /from "@\/lib\/prix-garde-corps\.server"/);
  assert.doesNotMatch(route, /garde-corps-outil/);
  assert.match(route, /creerLimite\(/);
  assert.match(route, /tropDeDemandes\(request/);
  assert.match(route, /reponsePrixGC\(requete\)/, "la réponse est construite champ par champ par reponsePrixGC");
});

test("le tarif du panier ne rend que des prix de vente et des noms, construits champ par champ", () => {
  const route = readFileSync(join(SRC, "app", "api", "panier", "tarif", "route.ts"), "utf8");
  assert.match(route, /from "@\/lib\/prix-garde-corps\.server"/);
  assert.match(route, /creerLimite\(/);
  assert.match(route, /NextResponse\.json\(tarifAffiche\(tarif, locale\)/, "la réponse passe par tarifAffiche, jamais le tarif brut (qui porte les lignes résolues)");
  // tarifAffiche : des champs nommés un à un, aucune ligne résolue recopiée telle quelle.
  const tarif = readFileSync(join(SRC, "lib", "tarif-panier.ts"), "utf8");
  const corps = tarif.slice(tarif.indexOf("export function tarifAffiche("));
  assert.doesNotMatch(corps, /\.\.\.p\.line|\.\.\.t\.|line: p\.line|gc: p\.line\.gc\b/);
});

test("le chiffrage n'est dans le dépôt que chiffré", () => {
  assert.match(CHIFFRE, /^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
  const fichier = readFileSync(join(OUTIL, "chiffrage.chiffre.mjs"), "utf8");
  for (const nom of [...DECLARATIONS_COUTS, "chiffrerGC", "remiseGC", "plancher"]) assert.ok(!fichier.includes(nom), nom);
  const corps = texteDuChiffrage(RACINE);
  if (corps) for (const s of [...chainesSecretes(corps).valeurs, ...chainesSecretes(corps).noms]) assert.ok(!fichier.includes(s), "chaîne de coûts en clair");
});

test("la clé du chiffrage n'entre jamais dans git", () => {
  assert.match(readFileSync(join(RACINE, ".gitignore"), "utf8"), /^\.env\*$/m);
  execFileSync("git", ["check-ignore", "-q", FICHIER_CLE], { cwd: RACINE });   // lève une erreur si le fichier n'est pas ignoré
});

test("la clé du chiffrage est là (sinon : aucun prix de garde-corps)", () => {
  assert.ok(
    lireCle(RACINE),
    `Clé absente : copier le fichier ${FICHIER_CLE} d'une autre copie du site (jamais par git), ou définir CHIFFRAGE_GARDE_CORPS_CLE.`
  );
});

test("aucun fichier suivi par git ne contient la clé ni une chaîne de coûts", () => {
  const corps = texteDuChiffrage(RACINE);
  assert.ok(corps, "clé absente ou invalide : contrôle impossible");
  // Les VALEURS (désignations, fournisseurs, prix d'achat) : nulle part. Les noms des champs, eux, servent au
  // code du serveur ; ils sont contrôlés dans le JavaScript publié (npm run garde-corps:verifier-build).
  const secrets = chainesSecretes(corps).valeurs;
  assert.ok(secrets.length > 20, "la liste des chaînes de coûts doit être tirée du chiffrage");
  const cle = lireCle(RACINE)!.toString("base64");
  const suivis = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: RACINE, encoding: "utf8" }).split("\0").filter(Boolean);
  const TEXTE = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".json", ".md", ".css", ".html", ".txt", ".yml", ".yaml", ".svg", ".py", ""]);
  let lus = 0;
  for (const nom of suivis) {
    const f = join(RACINE, nom);
    if (!TEXTE.has(extname(nom)) || !existsSync(f) || statSync(f).size > 5_000_000) continue;
    const texte = readFileSync(f, "utf8");
    lus++;
    assert.ok(!texte.includes(cle), `${nom} contient la clé du chiffrage`);
    const fuites = secretsDans(texte, secrets);
    assert.deepEqual(fuites.length, 0, `${nom} contient ${fuites.length} chaîne(s) de coûts`);
  }
  assert.ok(lus > 50);
});
