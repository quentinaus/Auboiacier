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

// Le portail de la carte (Quentin, 10/10/2026 : « un portail avec des volutes et quelque chose de travaillé, un de mes plus beaux
// portails ») : battant acier noir, haut en chapeau de gendarme, frise de volutes en S, couronnement de volutes en C et S,
// barreaux torsadés à bouts à bouton, soubassement plein avec un médaillon par vantail.
const cfg = {
  ...configDepart("portail-battant", "volutes"), couleur: "noir", mat: "acier", remp: "barreaux", soub: "plein", hSoub: 550, forme: "chapeau", fleche: 250,
  decor: "perso", decorChoix: [{ assemblage: "frise", forme: "S" }, { assemblage: "cimier", forme: "C", rythme: "alterne", forme2: "S" }], barreauxDeco: "torsade", bouts: "bouton", moulure: true,
};
const R = planPortail("portail-battant", cfg);
if (R.alertes.length) throw new Error(`le portail de la carte est refusé par l'outil : ${R.alertes.join(" · ")}`);
// Les piliers sont redessinés ici, en pierre ; le reste (vantaux, gonds, serrure) vient du moteur tel quel.
const prims = R.vues.face.filter((p) => p.t !== "cote" && p.t !== "texte" && p.t !== "sol" && !String(p.cls || "").includes("t-pilier"));
const r = svgDe(prims, false);

// Tout en mm, comme le dessin ; l'écran a l'axe y vers le bas (svgDe écrit Y = −y) : Y(y) convertit.
const Y = (y) => -y;
// Les piliers en pierre montent à 2 100 mm, un peu plus haut que les vantaux (le moteur, lui, dessine des piliers de 1 800).
const P = R.config.P, piliers = [[-300, 0], [P, P + 300]], hPilier = 2100;
// Le cadre 4:5 : 5 400 mm de large (le portail et ses piliers en prennent 76 %), l'horizon (le sol, y = 0) aux trois quarts.
const W = 5400, H = 6750, x0 = P / 2 - W / 2, yHaut = 5000, yBas = yHaut - H;
const vb = [x0, Y(yHaut), W, H];
const rect = (x, y1, y2, fill, extra = "") => `<rect x="${x[0]}" y="${Y(y2)}" width="${x[1] - x[0]}" height="${y2 - y1}" fill="${fill}" ${extra}/>`;
// Un feuillage : des ronds de trois tons, du plus sombre (derrière) au plus clair (devant, en haut à gauche, côté soleil).
const feuillage = (cx, cy, rayon, tons) => {
  let out = "";
  const grappe = [[0, 0, 1], [-0.55, 0.25, 0.75], [0.55, 0.2, 0.8], [-0.25, 0.6, 0.6], [0.3, 0.62, 0.62], [0, -0.35, 0.8], [-0.7, -0.2, 0.55], [0.72, -0.25, 0.55]];
  for (const [t, k] of tons.map((t, k) => [t, k])) for (const [dx, dy, s] of grappe) out += `<circle cx="${cx + dx * rayon - k * rayon * 0.12}" cy="${Y(cy + dy * rayon + k * rayon * 0.1)}" r="${rayon * s * (1 - k * 0.08)}" fill="${t}"/>`;
  return out;
};
// Une haie taillée, en bosses régulières.
const haie = (y, h, teinte, pas, decal) => {
  let out = "";
  for (let x = x0 - 400 + decal; x < x0 + W + 400; x += pas) out += `<ellipse cx="${x}" cy="${Y(y)}" rx="${pas * 0.78}" ry="${h}" fill="${teinte}"/>`;
  return out;
};
// La pierre des piliers et des murets : des moellons en quinconce, et une lumière qui vient du haut à gauche.
const pierre = (x, y1, y2, id) => `${rect(x, y1, y2, `url(#${id})`)}${rect(x, y1, y2, "url(#lumierePierre)")}${rect(x, y1, y2, "none", 'stroke="#b9ab96" stroke-width="10"')}`;
const scene = [
  `<defs>`,
  `<linearGradient id="ciel" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#9fb8cc"/><stop offset="0.55" stop-color="#d4e0e8"/><stop offset="1" stop-color="#f1ede4"/></linearGradient>`,
  `<radialGradient id="soleil" cx="0.18" cy="0.12" r="0.5"><stop offset="0" stop-color="#fff6dc" stop-opacity="0.85"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>`,
  `<linearGradient id="allee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9b1a4"/><stop offset="0.5" stop-color="#cfc7ba"/><stop offset="1" stop-color="#d9d2c6"/></linearGradient>`,
  `<linearGradient id="lumierePierre" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#2b2320" stop-opacity="0.14"/></linearGradient>`,
  `<pattern id="moellons" width="600" height="300" patternUnits="userSpaceOnUse"><rect width="600" height="300" fill="#d8ccb9"/>`,
  `<rect x="0" y="0" width="290" height="140" fill="#dfd4c2"/><rect x="310" y="0" width="290" height="140" fill="#d2c6b2"/><rect x="-150" y="160" width="290" height="140" fill="#d4c8b5"/><rect x="160" y="160" width="290" height="140" fill="#e1d6c4"/><rect x="470" y="160" width="290" height="140" fill="#cfc3af"/>`,
  `<path d="M0 150H600M0 300H600M300 0V150M150 150V300M450 150V300" stroke="#b6a892" stroke-width="12" fill="none"/></pattern>`,
  `<filter id="ombrePortail" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="55" dy="70" stdDeviation="40" flood-color="#1c1714" flood-opacity="0.32"/></filter>`,
  `<filter id="flou"><feGaussianBlur stdDeviation="120"/></filter>`,
  `<linearGradient id="piedHaie" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2320" stop-opacity="0"/><stop offset="1" stop-color="#2b2320" stop-opacity="0.28"/></linearGradient>`,
  `</defs>`,
  // Le ciel, la lumière du soleil en haut à gauche.
  rect([x0, x0 + W], 0, yHaut, "url(#ciel)"), rect([x0, x0 + W], 0, yHaut, "url(#soleil)"),
  // Des arbres au loin, puis deux grands arbres derrière les piliers, puis la haie taillée (on la voit entre les barreaux).
  haie(2500, 700, "#b4c3ad", 1300, 500),
  feuillage(-1000, 3500, 850, ["#5f7a57", "#728d68", "#8aa47e"]), feuillage(P + 1150, 3800, 950, ["#5a7552", "#6e8964", "#86a07a"]),
  haie(1950, 430, "#6f8a66", 700, 150), rect([x0, x0 + W], 0, 1950, "#6f8a66"), rect([x0, x0 + W], 0, 1000, "url(#piedHaie)"),
  // L'allée, un seuil plus sombre au pied du portail, puis l'ombre portée des vantaux et des piliers sur le sol.
  rect([x0, x0 + W], yBas, 0, "url(#allee)"), rect([x0, x0 + W], -140, 0, "#aaa295"),
  `<polygon points="${piliers[0][0] - 60},${Y(-40)} ${piliers[1][1] + 60},${Y(-40)} ${piliers[1][1] + 760},${Y(-820)} ${piliers[0][0] + 640},${Y(-820)}" fill="#2b2320" fill-opacity="0.13" filter="url(#flou)"/>`,
  // Les murets de clôture et leur couvertine, de chaque côté des piliers ; les piliers en pierre, avec leur chapeau.
  pierre([x0 - 100, piliers[0][0]], 0, 1050, "moellons"), pierre([piliers[1][1], x0 + W + 100], 0, 1050, "moellons"),
  rect([x0 - 100, piliers[0][0] + 40], 1050, 1140, "#cbbfab", 'stroke="#b2a38e" stroke-width="10"'), rect([piliers[1][1] - 40, x0 + W + 100], 1050, 1140, "#cbbfab", 'stroke="#b2a38e" stroke-width="10"'),
  ...piliers.map(([a, b]) => pierre([a, b], 0, hPilier, "moellons")),
  ...piliers.map(([a, b]) => `<polygon points="${a - 70},${Y(hPilier)} ${b + 70},${Y(hPilier)} ${b + 20},${Y(hPilier + 130)} ${a - 20},${Y(hPilier + 130)}" fill="#cbbfab" stroke="#b2a38e" stroke-width="10"/><rect x="${a - 70}" y="${Y(hPilier)}" width="${b - a + 140}" height="60" fill="#2b2320" fill-opacity="0.18"/>`),
].join("");
// Le portail du moteur, avec son ombre portée sur la haie (le soleil vient du haut à gauche).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="${vb.join(" ")}"><style>${STYLE_RENDU_PORTAIL("noir")}</style>${scene}`
  + `<g filter="url(#ombrePortail)">${r.html}</g></svg>`;

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
