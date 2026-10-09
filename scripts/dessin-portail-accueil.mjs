// Le visuel de la carte « Portails » de l'accueil (public/images/portails/portail-accueil.jpg, 4:5) : le portail dessiné par le
// moteur de l'outil de plans (jamais redessiné), mis en scène en aplats sobres — ciel, haie, murets, allée, ombre.
//   node scripts/dessin-portail-accueil.mjs        (macOS : Google Chrome sans tête rend le SVG, sips fait le JPEG)
// C'est un DESSIN, pas une photo : la carte porte la mention « Image d'illustration » (src/lib/visuels.ts). Quentin le
// remplacera par sa première vraie photo de portail posé (décision du 10/10/2026 : « un dessin plus réaliste » en attendant).
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { svgDe } from "../src/lib/portails-outil/moteur.genere.mjs";
import { configDepart, planPortail } from "../src/lib/portails.ts";
import { STYLE_RENDU_PORTAIL } from "../src/lib/portails-rendu.ts";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const SORTIE = join(RACINE, "public/images/portails/portail-accueil.jpg");

// Le portail de la carte : battant Volutes, noir, 3 500 × 1 600 (la cote courante de la fiche).
const cfg = { ...configDepart("portail-battant", "volutes"), couleur: "noir" };
const R = planPortail("portail-battant", cfg);
const prims = R.vues.face.filter((p) => p.t !== "cote" && p.t !== "texte" && p.t !== "sol");
const r = svgDe(prims, false);

// Tout en mm, comme le dessin ; l'écran a l'axe y vers le bas (svgDe écrit Y = −y) : Y(y) convertit.
const Y = (y) => -y;
const P = R.config.P, piliers = [[-300, 0], [P, P + 300]], hPilier = 1800;
// Le cadre 4:5 : 5 400 mm de large (le portail et ses piliers en prennent 76 %), l'horizon (le sol, y = 0) aux trois quarts.
const W = 5400, H = 6750, x0 = P / 2 - W / 2, yHaut = 5000, yBas = yHaut - H;
const vb = [x0, Y(yHaut), W, H];
const rect = (x, y1, y2, fill, extra = "") => `<rect x="${x[0]}" y="${Y(y2)}" width="${x[1] - x[0]}" height="${y2 - y1}" fill="${fill}" ${extra}/>`;
// La haie derrière le portail : des arrondis verts, deux plans, du plus loin (clair) au plus près (sombre).
const haie = (y, h, teinte, pas, decal) => {
  let out = "";
  for (let x = x0 - 400 + decal; x < x0 + W + 400; x += pas) out += `<ellipse cx="${x}" cy="${Y(y)}" rx="${pas * 0.78}" ry="${h}" fill="${teinte}"/>`;
  return out;
};
const scene = [
  `<defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e3ea"/><stop offset="1" stop-color="#f3f0ea"/></linearGradient>`,
  `<linearGradient id="allee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3cdc3"/><stop offset="1" stop-color="#c3bcb0"/></linearGradient>`,
  `<radialGradient id="ombre" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2b2320" stop-opacity="0.22"/><stop offset="1" stop-color="#2b2320" stop-opacity="0"/></radialGradient></defs>`,
  // Le ciel, jusqu'à l'horizon.
  rect([x0, x0 + W], 0, yHaut, "url(#ciel)"),
  // Des arbres au loin, puis la haie derrière le portail (on la voit entre les barreaux).
  haie(2300, 900, "#b7c4ae", 1100, 300), haie(1750, 820, "#93a98b", 820, 0), haie(1250, 700, "#7d9474", 640, 260),
  rect([x0, x0 + W], 0, 1250, "#7d9474"),
  // L'allée et, devant, le trottoir ; l'ombre du portail sur l'allée.
  rect([x0, x0 + W], yBas, 0, "url(#allee)"),
  rect([x0, x0 + W], yBas, -320, "#c9c2b6"),
  `<ellipse cx="${P / 2}" cy="${Y(-420)}" rx="${P * 0.62}" ry="520" fill="url(#ombre)"/>`,
  // Les murets de clôture, de chaque côté des piliers, avec leur couvertine.
  rect([x0 - 100, piliers[0][0]], 0, 1050, "#e3dbcf", 'stroke="#c9bfae" stroke-width="12"'),
  rect([piliers[1][1], x0 + W + 100], 0, 1050, "#e3dbcf", 'stroke="#c9bfae" stroke-width="12"'),
  rect([x0 - 100, piliers[0][0] + 40], 1050, 1130, "#d2c8b8"),
  rect([piliers[1][1] - 40, x0 + W + 100], 1050, 1130, "#d2c8b8"),
  // Les chapeaux des piliers (le moteur dessine les piliers eux-mêmes).
  ...piliers.map(([a, b]) => `<polygon points="${a - 60},${Y(hPilier)} ${b + 60},${Y(hPilier)} ${b + 20},${Y(hPilier + 110)} ${a - 20},${Y(hPilier + 110)}" fill="#cfc4b2" stroke="#b8a993" stroke-width="8"/>`),
].join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="${vb.join(" ")}"><style>${STYLE_RENDU_PORTAIL("noir")}</style>${scene}${r.html}</svg>`;

const tmp = mkdtempSync(join(tmpdir(), "portail-accueil-"));
const fichierSvg = join(tmp, "portail-accueil.svg");
writeFileSync(fichierSvg, svg);
// Chrome sans tête rend le SVG à sa taille exacte, deux fois plus fin (protocole DevTools : le mode « --screenshot » reste
// parfois bloqué), puis sips fait le JPEG à 1 200 × 1 500.
const png = await rendrePng(`file://${fichierSvg}`, 1200, 1500);
writeFileSync(join(tmp, "portail-accueil.png"), png);
execFileSync("sips", ["-z", "1500", "1200", "-s", "format", "jpeg", "-s", "formatOptions", "84", join(tmp, "portail-accueil.png"), "--out", SORTIE], { stdio: "ignore" });
console.log("écrit", SORTIE);

async function rendrePng(url, largeur, hauteur) {
  const port = 9500 + Math.floor(Math.random() * 400);
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmp, "profil")}`, "about:blank"], { stdio: "ignore" });
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  let cible = null;
  for (let i = 0; i < 60 && !cible; i++) {
    await attendre(250);
    try { cible = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {}
  }
  if (!cible) { chrome.kill(); throw new Error("Chrome ne répond pas"); }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let n = 0;
  const attente = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && attente.has(m.id)) { attente.get(m.id)(m); attente.delete(m.id); } });
  const cmd = (method, params = {}) => new Promise((r) => { const id = ++n; attente.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await cmd("Emulation.setDeviceMetricsOverride", { width: largeur, height: hauteur, deviceScaleFactor: 2, mobile: false });
  await cmd("Page.enable");
  await cmd("Page.navigate", { url });
  await attendre(1500);
  const shot = await cmd("Page.captureScreenshot", { format: "png" });
  ws.close(); chrome.kill();
  return Buffer.from(shot.result.data, "base64");
}
