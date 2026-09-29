// Charge l'outil de plans TEL QUEL (son <script>, sans rien réécrire) dans une bulle node:vm, avec un
// faux DOM minimal, pour lui faire calculer des cas et comparer ses réponses à celles du code extrait.
// Le faux DOM suit les règles du navigateur pour les valeurs de départ : une case est cochée si elle porte
// « checked », un <select> prend l'option « selected », sinon la première.
//
// Une seule ligne est AJOUTÉE, en mémoire (le fichier de l'outil n'est jamais modifié) : juste avant
// « window.__plans = { », elle expose aux comparaisons les fonctions internes de l'outil.
import vm from "node:vm";
import { extraireScript } from "./analyse.mjs";

const EXPOSES = ["calculerGC", "geomGC", "chiffrerGC", "remiseGC", "composerDevisGC", "dsDevisHtml", "variantesConformes", "lire"];
const REPERE = "window.__plans = {";

function champsDuHtml(avant) {
  const attrs = {};
  for (const m of avant.matchAll(/<input\b[^>]*>/g)) {
    const id = (m[0].match(/\bid="([^"]+)"/) || [])[1];
    if (!id) continue;
    attrs[id] = {
      value: (m[0].match(/\bvalue="([^"]*)"/) || [])[1] ?? "",
      checked: /\schecked\b/.test(m[0]),
      type: (m[0].match(/\btype="([^"]*)"/) || [])[1] || "text",
    };
  }
  for (const m of avant.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const o = [...m[2].matchAll(/<option\b([^>]*)>/g)].map((x) => ({ v: (x[1].match(/value="([^"]*)"/) || [])[1] ?? "", s: /\bselected\b/.test(x[1]) }));
    attrs[m[1]] = { value: (o.find((x) => x.s) || o[0] || { v: "" }).v, checked: false, type: "select" };
  }
  return attrs;
}

/** Prépare l'outil une fois ; rend une fonction qui le lance avec des valeurs données (comme si elles étaient gardées dans le navigateur). */
export function preparerOutil(html) {
  const { js } = extraireScript(html);
  if (js.split(REPERE).length !== 2) throw new Error(`repère « ${REPERE} » introuvable (ou en double) dans l'outil`);
  const jsExpose = js.replace(REPERE, `window.__outilGC = { ${EXPOSES.join(", ")} };\n  ${REPERE}`);
  const script = new vm.Script(jsExpose, { filename: "plans-atelier.html#script" });
  const avant = html.slice(0, html.indexOf("<script"));
  const attrs = champsDuHtml(avant);
  const ids = [...new Set([...avant.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))];

  return function lancer(valeurs) {
    const els = {};
    const mk = (id) => {
      const a = attrs[id] || { value: "", checked: false, type: "" };
      return {
        id, type: a.type, value: a.value, defaultValue: a.value, checked: a.checked, textContent: "", innerHTML: "", className: "",
        disabled: false, hidden: false, open: false, dataset: {}, attrs: {}, style: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
        addEventListener() {}, removeEventListener() {}, querySelectorAll: () => [], querySelector: () => mk("tmp"),
        closest: () => null, appendChild() {}, remove() {},
      };
    };
    ids.forEach((id) => (els[id] = mk(id)));
    const stock = valeurs ? { "plans-modele": "gardeCorps", "plans-valeurs": JSON.stringify(valeurs) } : { "plans-modele": "gardeCorps" };
    const document = {
      addEventListener() {}, getElementById: (id) => els[id] || (els[id] = mk(id)), querySelectorAll: () => [],
      querySelector: () => null, createElementNS: () => mk("tmp"), createElement: () => mk("tmp"),
    };
    const window = {};
    const ctx = vm.createContext({ document, window, localStorage: { getItem: (k) => stock[k] ?? null, setItem() {} }, console, setTimeout: () => 0, clearTimeout() {} });
    script.runInContext(ctx);
    if (!window.__outilGC || !window.__plans) throw new Error("l'outil n'a pas exposé ses fonctions");
    // Une date fabriquée DANS la bulle : l'outil teste « instanceof Date » avec son propre Date.
    const dateOutil = (iso) => vm.runInContext(`new Date(${JSON.stringify(iso)})`, ctx);
    return { O: window.__outilGC, P: window.__plans, els, dateOutil };
  };
}
