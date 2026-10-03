// Lecture du <script> de l'outil de plans (plans-atelier.html), SANS l'exécuter :
// déclarations de haut niveau de son IIFE, dépendances, écritures, contact avec le DOM.
// Sert au script d'extraction (scripts/extraire-moteur-garde-corps.mjs) et aux tests.
//
// acorn n'est pas une dépendance directe du site : il arrive avec eslint (eslint → espree → acorn).
// S'il manque un jour, le message ci-dessous le dit clairement (rien n'est téléchargé tout seul).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let acorn;
try {
  acorn = require("acorn");
} catch {
  throw new Error(
    "acorn est introuvable dans node_modules (il vient avec eslint). Lancer « npm ci » dans le dossier du site, puis recommencer."
  );
}
export { acorn };

/** Noms qui touchent au navigateur : le code extrait ne doit en utiliser aucun. */
export const GLOBAUX_DOM = new Set([
  "$", "document", "window", "localStorage", "sessionStorage", "navigator", "location", "requestAnimationFrame",
  "setTimeout", "clearTimeout", "setInterval", "fetch", "alert", "confirm", "print", "matchMedia", "getComputedStyle",
  "HTMLElement", "Image", "URL", "Blob", "FileReader", "history", "screen", "devicePixelRatio", "innerWidth",
  "innerHeight", "addEventListener", "event", "performance", "crypto", "globalThis", "self", "process", "require",
]);

/** Globaux JavaScript permis dans le code extrait (tout le reste est refusé). */
export const GLOBAUX_PERMIS = new Set([
  "Math", "Number", "String", "Boolean", "Array", "Object", "JSON", "Set", "Map", "Infinity", "NaN", "undefined",
  "isNaN", "isFinite", "parseFloat", "parseInt", "Intl", "Date", "Error", "RegExp", "Symbol",
]);

/** Le seul <script> de la page : son texte, et la ligne où il commence dans le HTML. */
export function extraireScript(html) {
  const debuts = [...html.matchAll(/<script\b[^>]*>/g)];
  if (debuts.length !== 1) throw new Error(`l'outil devait contenir 1 <script>, il en contient ${debuts.length}`);
  const d = debuts[0].index + debuts[0][0].length;
  const f = html.indexOf("</script>", d);
  return { js: html.slice(d, f), ligne0: html.slice(0, d).split("\n").length };
}

// ---------- Portées ----------
function nomsDuMotif(p, out = []) {
  if (!p) return out;
  switch (p.type) {
    case "Identifier": out.push(p.name); break;
    case "ObjectPattern": for (const q of p.properties) nomsDuMotif(q.type === "RestElement" ? q.argument : q.value, out); break;
    case "ArrayPattern": for (const q of p.elements) nomsDuMotif(q, out); break;
    case "AssignmentPattern": nomsDuMotif(p.left, out); break;
    case "RestElement": nomsDuMotif(p.argument, out); break;
  }
  return out;
}
// var et function hissés dans une fonction (sans descendre dans les fonctions imbriquées)
function hisses(corps, out = new Set()) {
  const vis = (n, racine) => {
    if (!n || typeof n.type !== "string") return;
    if (!racine && /Function/.test(n.type)) return;
    if (n.type === "VariableDeclaration" && n.kind === "var") for (const d of n.declarations) nomsDuMotif(d.id).forEach((x) => out.add(x));
    for (const k in n) {
      if (k === "type") continue;
      const c = n[k];
      if (Array.isArray(c)) c.forEach((e) => e && typeof e.type === "string" && vis(e));
      else if (c && typeof c.type === "string") vis(c);
    }
  };
  vis(corps, true);
  return out;
}
function lexicauxDuBloc(stmts, out = new Set()) {
  for (const s of stmts) {
    if (s.type === "VariableDeclaration" && s.kind !== "var") for (const d of s.declarations) nomsDuMotif(d.id).forEach((x) => out.add(x));
    if (s.type === "FunctionDeclaration" || s.type === "ClassDeclaration") out.add(s.id.name);
  }
  return out;
}

/** Les noms libres (non résolus localement) d'un nœud : { lus, ecrits }. */
export function libres(noeud) {
  const lus = new Set(), ecrits = new Set();
  const cherche = (nom, portees) => portees.some((p) => p.has(nom));
  const ref = (id, portees, ecrit) => { if (!cherche(id.name, portees)) (ecrit ? ecrits : lus).add(id.name); };
  const motifEcrit = (p, portees) => {
    if (!p) return;
    if (p.type === "Identifier") ref(p, portees, true);
    else if (p.type === "MemberExpression") {
      vis(p, portees);
      let o = p;
      while (o.type === "MemberExpression") o = o.object;
      if (o.type === "Identifier") ref(o, portees, true);
    } else if (p.type === "ObjectPattern") p.properties.forEach((q) => { if (q.type === "RestElement") motifEcrit(q.argument, portees); else { if (q.computed) vis(q.key, portees); motifEcrit(q.value, portees); } });
    else if (p.type === "ArrayPattern") p.elements.forEach((q) => motifEcrit(q, portees));
    else if (p.type === "AssignmentPattern") { motifEcrit(p.left, portees); vis(p.right, portees); }
    else if (p.type === "RestElement") motifEcrit(p.argument, portees);
  };
  const motifLiaison = (p, portees) => {
    if (!p) return;
    if (p.type === "ObjectPattern") p.properties.forEach((q) => { if (q.type === "RestElement") motifLiaison(q.argument, portees); else { if (q.computed) vis(q.key, portees); motifLiaison(q.value, portees); } });
    else if (p.type === "ArrayPattern") p.elements.forEach((q) => motifLiaison(q, portees));
    else if (p.type === "AssignmentPattern") { motifLiaison(p.left, portees); vis(p.right, portees); }
    else if (p.type === "RestElement") motifLiaison(p.argument, portees);
  };
  const fonction = (n, portees) => {
    const p = new Set();
    if (n.id && n.type === "FunctionExpression") p.add(n.id.name);
    n.params.forEach((q) => nomsDuMotif(q).forEach((x) => p.add(x)));
    if (n.type !== "ArrowFunctionExpression") p.add("arguments");
    const pp = [p, ...portees];
    n.params.forEach((q) => motifLiaison(q, pp));
    if (n.body.type === "BlockStatement") {
      hisses(n.body).forEach((x) => p.add(x));
      lexicauxDuBloc(n.body.body).forEach((x) => p.add(x));
      n.body.body.forEach((s) => vis(s, pp));
    } else vis(n.body, pp);
  };
  function vis(n, portees) {
    if (!n || typeof n.type !== "string") return;
    switch (n.type) {
      case "Identifier": ref(n, portees, false); return;
      case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression": fonction(n, portees); return;
      case "BlockStatement": { const p = lexicauxDuBloc(n.body); n.body.forEach((s) => vis(s, [p, ...portees])); return; }
      case "ForStatement": case "ForInStatement": case "ForOfStatement": {
        const p = new Set();
        const init = n.init || n.left;
        if (init && init.type === "VariableDeclaration" && init.kind !== "var") init.declarations.forEach((d) => nomsDuMotif(d.id).forEach((x) => p.add(x)));
        const pp = [p, ...portees];
        if (n.type === "ForStatement") { vis(n.init, pp); vis(n.test, pp); vis(n.update, pp); }
        else { if (n.left.type === "VariableDeclaration") vis(n.left, pp); else motifEcrit(n.left, pp); vis(n.right, pp); }
        vis(n.body, pp);
        return;
      }
      case "CatchClause": { const p = new Set(nomsDuMotif(n.param)); vis(n.body, [p, ...portees]); return; }
      case "VariableDeclaration": n.declarations.forEach((d) => { motifLiaison(d.id, portees); vis(d.init, portees); }); return;
      case "ClassDeclaration": case "ClassExpression": vis(n.superClass, portees); vis(n.body, portees); return;
      case "MemberExpression": vis(n.object, portees); if (n.computed) vis(n.property, portees); return;
      case "Property": case "PropertyDefinition": case "MethodDefinition": if (n.computed) vis(n.key, portees); vis(n.value, portees); return;
      case "AssignmentExpression": motifEcrit(n.left, portees); vis(n.right, portees); return;
      case "UpdateExpression": motifEcrit(n.argument, portees); return;
      case "LabeledStatement": vis(n.body, portees); return;
      case "BreakStatement": case "ContinueStatement": return;
    }
    for (const k in n) {
      if (k === "type" || k === "start" || k === "end" || k === "loc") continue;
      const c = n[k];
      if (Array.isArray(c)) c.forEach((e) => e && typeof e.type === "string" && vis(e, portees));
      else if (c && typeof c.type === "string") vis(c, portees);
    }
  }
  vis(noeud, []);
  return { lus, ecrits };
}

/** Analyse le <script> de l'outil : ses déclarations de haut niveau et ce que chacune utilise. */
export function analyser(html) {
  const { js, ligne0 } = extraireScript(html);
  const ast = acorn.parse(js, { ecmaVersion: "latest", sourceType: "script", locations: true });
  if (ast.body.length !== 1) throw new Error("le <script> de l'outil doit contenir une seule instruction (son IIFE)");
  const call = ast.body[0].expression;
  if (!call || call.type !== "CallExpression" || !/Function/.test(call.callee.type)) throw new Error("IIFE de l'outil introuvable");
  const decls = [];
  const autres = [];
  for (const s of call.callee.body.body) {
    const ligne = s.loc.start.line + ligne0 - 1, ligneFin = s.loc.end.line + ligne0 - 1;
    if (s.type === "FunctionDeclaration") decls.push({ noms: [s.id.name], genre: "function", node: s, ligne, ligneFin });
    else if (s.type === "VariableDeclaration") decls.push({ noms: s.declarations.flatMap((d) => nomsDuMotif(d.id)), genre: s.kind, node: s, ligne, ligneFin });
    else if (s.type === "ClassDeclaration") decls.push({ noms: [s.id.name], genre: "class", node: s, ligne, ligneFin });
    else if (s.type === "ExpressionStatement" && s.expression.type === "Literal") continue; // "use strict"
    else autres.push({ genre: s.type, node: s, ligne, ligneFin });
  }
  const haut = new Map();
  decls.forEach((d) => d.noms.forEach((n) => { if (haut.has(n)) throw new Error("déclaration en double dans l'outil : " + n); haut.set(n, d); }));
  const ecritsPar = new Map();
  for (const d of decls) {
    const { lus, ecrits } = libres(d.node);
    d.noms.forEach((n) => { lus.delete(n); ecrits.delete(n); });
    d.deps = [...new Set([...lus, ...ecrits])].filter((n) => haut.has(n)).sort();
    d.globaux = [...lus].filter((n) => !haut.has(n)).sort();
    d.ecritHaut = [...ecrits].filter((n) => haut.has(n)).sort();
    d.dom = d.globaux.filter((g) => GLOBAUX_DOM.has(g)).concat(d.deps.includes("$") ? ["$"] : []);
    d.ecritHaut.forEach((n) => { if (!ecritsPar.has(n)) ecritsPar.set(n, []); ecritsPar.get(n).push(d.noms[0]); });
    d.texte = js.slice(d.node.start, d.node.end);
  }
  for (const a of autres) {
    const { ecrits } = libres(a.node);
    [...ecrits].filter((n) => haut.has(n)).forEach((n) => { if (!ecritsPar.has(n)) ecritsPar.set(n, []); ecritsPar.get(n).push(`<instruction l.${a.ligne}>`); });
  }
  return { js, ligne0, ast, decls, autres, haut, ecritsPar };
}

/** Fermeture des dépendances : les racines et tout ce qu'elles utilisent, de proche en proche. */
export function fermeture(A, racines) {
  const vus = new Set(), pile = [...racines];
  while (pile.length) {
    const n = pile.pop();
    if (vus.has(n)) continue;
    const d = A.haut.get(n);
    if (!d) throw new Error(`« ${n} » n'existe plus dans l'outil : le script d'extraction est à revoir`);
    d.noms.forEach((x) => vus.add(x));
    d.deps.forEach((x) => !vus.has(x) && pile.push(x));
  }
  return vus;
}

/**
 * Relit un module généré (texte ESM) : ses déclarations de haut niveau, ses imports, et les noms
 * libres qu'il utilise. Un nom libre qui n'est ni déclaré, ni importé, ni un global permis = refus.
 */
export function controlerModule(texte) {
  const ast = acorn.parse(texte, { ecmaVersion: "latest", sourceType: "module" });
  const importes = new Set(ast.body.filter((s) => s.type === "ImportDeclaration").flatMap((s) => s.specifiers.map((x) => x.local.name)));
  const declares = new Set();
  for (const s of ast.body) {
    const d = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
    if (d.type === "FunctionDeclaration") declares.add(d.id.name);
    else if (d.type === "VariableDeclaration") d.declarations.forEach((x) => nomsDuMotif(x.id).forEach((n) => declares.add(n)));
  }
  const utilises = new Set();
  for (const s of ast.body) {
    if (s.type === "ImportDeclaration" || (s.type === "ExportNamedDeclaration" && !s.declaration)) continue;
    const { lus, ecrits } = libres(s);
    [...lus, ...ecrits].forEach((n) => utilises.add(n));
  }
  const inconnus = [...utilises].filter((n) => !declares.has(n) && !importes.has(n) && !GLOBAUX_PERMIS.has(n)).sort();
  const dom = [...utilises].filter((n) => GLOBAUX_DOM.has(n) && !declares.has(n) && !importes.has(n)).sort();
  const globaux = [...utilises].filter((n) => GLOBAUX_PERMIS.has(n)).sort();
  return { declares, importes, globaux, inconnus, dom };
}
