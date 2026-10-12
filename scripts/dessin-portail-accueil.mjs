// Le visuel de la carte « Portails » de l'accueil et de la Collection (public/images/portails/portail-accueil-vitrine.jpg, 4:5) :
// le portail qui ouvre la page des portails (Lames chêne, gris anthracite), tel que le dessine le moteur de l'outil de plans
// (jamais redessiné), dans le même décor que la page : un ciel blanc et une bande de sol beige.
//   node scripts/dessin-portail-accueil.mjs        (macOS : Google Chrome sans tête rend le SVG, sips fait le JPEG)
// C'est un DESSIN, pas une photo : la carte porte la mention « Image d'illustration » (src/lib/visuels.ts). Quentin le
// remplacera par sa première vraie photo de portail posé. Décision du 13/10/2026 : la carte montre le portail de la nouvelle
// vitrine, plus l'ancien dessin façon dessin animé (haie, arbres, murets).
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { configVitrine, fabriquerScene } from "./dessins-scenes-portails.mjs";
import { STYLE_VITRINE_DEPART, TEINTE_VITRINE_DEPART } from "../src/lib/portails-page.ts";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const SORTIE = join(RACINE, "public/images/portails/portail-accueil-vitrine.jpg");

const { svg, largeur, hauteur } = fabriquerScene("portail-battant", configVitrine(STYLE_VITRINE_DEPART, TEINTE_VITRINE_DEPART), "accueil", { nom: "carte de l'accueil" });
const tmp = mkdtempSync(join(tmpdir(), "portail-accueil-"));
try {
  writeFileSync(join(tmp, "portail-accueil.svg"), svg);
  const png = await rendrePng(`file://${join(tmp, "portail-accueil.svg")}`, largeur, hauteur, join(tmp, "profil"));
  writeFileSync(join(tmp, "portail-accueil.png"), png);
  execFileSync("sips", ["-z", String(hauteur), String(largeur), "-s", "format", "jpeg", "-s", "formatOptions", "86", join(tmp, "portail-accueil.png"), "--out", SORTIE], { stdio: "ignore" });
  console.log("écrit", SORTIE);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/** Chrome sans tête rend le SVG à sa taille exacte, deux fois plus fin (protocole DevTools). Le profil de Chrome est supprimé avec le dossier. */
async function rendrePng(url, l, h, profil) {
  const port = 9500 + Math.floor(Math.random() * 400);
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
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
  await cmd("Emulation.setDeviceMetricsOverride", { width: l, height: h, deviceScaleFactor: 2, mobile: false });
  await cmd("Page.enable");
  await cmd("Page.navigate", { url });
  await attendre(1500);
  const shot = await cmd("Page.captureScreenshot", { format: "png" });
  ws.close(); chrome.kill();
  await attendre(300);
  return Buffer.from(shot.result.data, "base64");
}
