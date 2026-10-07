// Fabriquer les vidéos des films « en aplats » à partir des scènes extraites (scripts/films-aplat.genere.mjs, écrit par
// scripts/extraire-motion-aplat.mjs), image par image.
//
//   node scripts/rendre-films-aplat.mjs [film]       film : atelier | je-mesure (les deux par défaut)
//
// Pourquoi des vidéos : dessinées en direct (372 mouvements SVG recalculés à chaque image), les scènes ramaient dans
// Safari, sur Mac comme sur iPhone (Quentin, 07/10/2026 : « ça rame, ça manque de FPS »). Une vidéo est lue par la puce
// vidéo de l'appareil : fluide partout, sans effort pour la page.
//
// Chaque film est rendu deux fois, à 60 images par seconde, avec Chrome sans écran (gelé à chaque instant) :
//   - « grand » : 1440 × 800 (la scène à 720 px de large, écran Retina) — cartes et panneau sur ordinateur ;
//   - « petit » : 1536 × 480 (plus large que la scène, petits textes agrandis) — cartes du téléphone.
// Puis ffmpeg (H.264, lisible partout, démarrage rapide) écrit public/videos/aplat/<film>-<taille>.mp4, avec deux images
// fixes : la première (affiche, en attendant la vidéo) et l'image finale (pour les visiteurs qui ont demandé moins
// d'animations : le garde-corps posé).
// Il faut Google Chrome et ffmpeg (variable FFMPEG, sinon celui de Pinokio, sinon « ffmpeg »).
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const racine = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const { CSS_APLAT, SVG_FILM, SVG_JE_MESURE } = await import(pathToFileURL(join(racine, "scripts/films-aplat.genere.mjs")).href);

const FPS = 60;
const PARALLELE = 4;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG = process.env.FFMPEG ?? [join(homedir(), "pinokio/bin/miniforge/bin/ffmpeg")].find(existsSync) ?? "ffmpeg";

/** La durée d'un film et l'instant de son image finale, lus dans ses styles (la même horloge que ses étiquettes). */
function horloge(classe, reduit) {
  const duree = Number(CSS_APLAT.match(new RegExp(`\\.${classe}\\{animation:${classe} ([0-9.]+)s`))[1]);
  const fin = -Number(CSS_APLAT.match(reduit)[1]);
  return { duree, fin };
}
const FILMS = {
  atelier: { svg: SVG_FILM, conteneur: "aplat-film", ...horloge("aplat-etC0", /\.aplat-panel \*[^{]*\{animation-delay:(-[0-9.]+)s/) },
  "je-mesure": { svg: SVG_JE_MESURE, conteneur: "aplat-card-scene aplat-scB", ...horloge("aplat-etB0", /\.aplat-scB \*\{animation-delay:(-[0-9.]+)s/) },
};
// « petit » est plus large que la scène (3,2 pour 1) : sur le téléphone, la carte est très allongée ; le décor continue de
// chaque côté (le dessin déborde de son cadre), et la vidéo remplit la carte sans bandes vides. Moins de 520 px de large :
// les petits textes de la scène y sont agrandis, comme sur la page. Rendue à 3 pixels par point, pour rester nette.
const TAILLES = { grand: { w: 720, h: 400, dsf: 2 }, petit: { w: 512, h: 160, dsf: 3 } };

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Un Chrome sans écran piloté par le protocole DevTools, sur la page d'un film. */
async function ouvrir(page, w, h, dsf) {
  const port = 9600 + Math.floor(Math.random() * 300);
  const profil = mkdtempSync(join(tmpdir(), "film-"));
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${profil}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
  let cible;
  for (let i = 0; i < 80 && !cible; i++) {
    await attendre(250);
    try {
      cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const attente = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && attente.has(m.id)) {
      attente.get(m.id)(m);
      attente.delete(m.id);
    }
  });
  const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; attente.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dsf, mobile: false });
  await cdp("Page.enable");
  await cdp("Page.navigate", { url: pathToFileURL(page).href });
  await attendre(1500);
  await cdp("Runtime.evaluate", { expression: "document.fonts.ready.then(() => { window.__anims = document.getAnimations(); window.__anims.forEach((a) => a.pause()); return window.__anims.length; })", awaitPromise: true });
  const fermer = async () => {
    ws.close();
    chrome.kill();
    await attendre(300);
    try { rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  };
  return { cdp, fermer };
}

/** Une image du film à l'instant t (ms). */
async function image(cdp, t) {
  await cdp("Runtime.evaluate", {
    expression: `window.__anims.forEach((a) => { a.currentTime = ${t}; }); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`,
    awaitPromise: true,
  });
  const r = await cdp("Page.captureScreenshot", { format: "png" });
  return Buffer.from(r.result.data, "base64");
}

const choix = process.argv[2] ? [process.argv[2]] : Object.keys(FILMS);
const sortie = join(racine, "public/videos/aplat");
mkdirSync(sortie, { recursive: true });

for (const nom of choix) {
  const film = FILMS[nom];
  if (!film) throw new Error(`Film inconnu : ${nom}`);
  // LIMITE : un essai sur les premières images seulement.
  const n = Number(process.env.LIMITE) || Math.round(film.duree * FPS);
  for (const [taille, { w, h, dsf }] of Object.entries(TAILLES)) {
    if (process.env.TAILLE && process.env.TAILLE !== taille) continue;
    const dossier = mkdtempSync(join(tmpdir(), `${nom}-${taille}-`));
    const page = join(dossier, "film.html");
    writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8"><style>${CSS_APLAT}
html,body{margin:0;background:#f5ecdf;overflow:hidden}
.cadre{width:${w}px;height:${h}px;overflow:hidden;border-radius:0!important}
.cadre svg{display:block;width:100%;height:100%;overflow:visible}</style>
<div class="cadre ${film.conteneur}">${film.svg}</div>`,
    );
    const debut = Date.now();
    // Les images du film, réparties entre plusieurs Chrome.
    await Promise.all(
      Array.from({ length: PARALLELE }, async (_, k) => {
        const { cdp, fermer } = await ouvrir(page, w, h, dsf);
        for (let i = k; i < n; i += PARALLELE) {
          writeFileSync(join(dossier, `f${String(i).padStart(5, "0")}.png`), await image(cdp, (i * 1000) / FPS));
        }
        // Les deux images fixes, depuis le premier Chrome.
        if (k === 0) {
          // L'image d'attente : l'écran AUBOIACIER complet, d'où chaque film démarre (DEBUT_LOGO, motion-aplat.tsx).
          writeFileSync(join(sortie, `${nom}-${taille}-debut.png`), await image(cdp, { atelier: 25000, "je-mesure": 34200 }[nom]));
          writeFileSync(join(sortie, `${nom}-${taille}-fin.png`), await image(cdp, film.fin * 1000));
        }
        await fermer();
      }),
    );
    console.log(`${nom} ${taille} : ${n} images en ${Math.round((Date.now() - debut) / 1000)} s`);
    const mp4 = join(sortie, `${nom}-${taille}.mp4`);
    execFileSync(FFMPEG, [
      "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dossier, "f%05d.png"),
      "-c:v", "libx264", "-preset", "slow", "-crf", taille === "grand" ? "21" : "22", "-tune", "animation",
      "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-an", mp4,
    ]);
    // Les images fixes en JPEG léger (l'affiche s'affiche avant la vidéo).
    for (const quoi of ["debut", "fin"]) {
      const png = join(sortie, `${nom}-${taille}-${quoi}.png`);
      execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", png, "-q:v", "3", png.replace(/\.png$/, ".jpg")]);
      rmSync(png);
    }
    rmSync(dossier, { recursive: true, force: true });
  }
}
console.log(execFileSync("ls", ["-la", sortie]).toString());
