// Le calage du guide de la page des portails (src/components/portail/portails-modeles.css, bloc « calage du guide »).
//
// Pourquoi : le guide empile ses sept états (trois questions, quatre résultats) dans la même case, pour que la page ne bouge pas d'un
// état à l'autre. Mais le HTML du serveur ne porte que le premier état (pas de texte en double dans la page) : sans réserve, la
// bande du guide grandit de 24 à 74 px quand la page s'anime, et tout ce qui est dessous saute. Le CSS réserve donc la hauteur du plus
// haut des sept états, largeur par largeur (min-height de .pm-pile, un palier par plage de largeurs, en français et en anglais).
// Ces hauteurs dépendent des textes du guide et de la mise en page : ELLES SE MESURENT, elles ne se calculent pas.
//
// À relancer après toute modification des textes du guide (portails-textes.ts : guideQ, guideAide, guideOui/Non, guideVocab,
// guideCtx, guideVerif, guideRaison, guideConseil, guidage ; portails-page.ts : guide), de la mise en page du guide (portails-modeles.css,
// portails-modeles.tsx) ou de la police du site :
//   1. lancer le serveur de dev (npm run dev), puis
//   2. node scripts/calage-guide-portails.mjs            écrit le bloc dans portails-modeles.css (port 3151 ; autre : PORT_SITE=3000)
//      node scripts/calage-guide-portails.mjs verifier   ne change rien : contrôle chaque largeur impaire de 321 à 2001 px
//      SANS_WEBKIT=1 devant l'une ou l'autre : sans WebKit (voir plus bas ; Linux, Windows)
//
// Chaque largeur est mesurée dans Chrome puis, sur un Mac, dans WebKit (le moteur de Safari et de tous les navigateurs d'iPhone : un
// WKWebView piloté par scripts/calage-guide-webkit.swift, compilé à la volée par swiftc). WebKit coupe les lignes à des largeurs un peu
// différentes de Chrome : mesuré le 13/10/2026 (macOS 26), la hauteur du guide y change de 4 à 18 px de largeur plus tard, et pendant ces
// quelques pixels le guide dépasse une réserve calée sur Chrome d'une ligne entière (12 à 21 px), à plusieurs largeurs de téléphone.
// Chaque moteur donne quatre hauteurs : avec la police du site (celle de l'ordinateur qui mesure : San Francisco sur un Mac) puis avec Arial
// (Windows, Android), chacune avec et sans barre de défilement classique (15 px : Windows, ou un Mac avec une souris ; mesurée dès
// BARRE_DES px, un téléphone n'en a pas). Avec une barre, les requêtes média comptent toujours la largeur de la fenêtre mais la page est
// 15 px plus étroite, donc le texte passe plus tôt à la ligne : la page est alors mesurée 15 px plus étroite sous les mêmes requêtes.
// La plus haute des hauteurs, tous moteurs confondus, est gardée. Deux sécurités s'y ajoutent :
//   - FENETRE : une baisse de hauteur n'est prise en compte que FENETRE px plus loin (la hauteur gardée à une largeur est la plus haute
//     de celles des FENETRE px qui précèdent) : 8 px avec WebKit (les versions de Safari et d'iOS se ressemblent), 24 px sans lui (Chrome
//     seul : de quoi couvrir l'écart de 18 px mesuré) ; le blanc en trop dure alors quelques pixels de largeur de plus à chaque palier ;
//   - MARGE : quelques pixels de plus à chaque hauteur (arrondis, interlignes).
// Les mesures se font tous les 2 px (largeurs paires) ; « verifier » mesure les largeurs impaires, celles que l'écriture n'a pas vues.
// Un palier garde 10 px de tolérance au plus (le blanc sous le texte, invisible à côté du dessin). Une police beaucoup plus large que
// celles-là peut encore faire gagner une ligne à certaines largeurs.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const CSS = join(RACINE, "src/components/portail/portails-modeles.css");
const PORT_SITE = process.env.PORT_SITE ?? "3151";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUT = "/* ==== calage du guide : début (écrit par scripts/calage-guide-portails.mjs, ne pas modifier à la main) ==== */";
const FIN = "/* ==== calage du guide : fin ==== */";
const LANGUES = ["fr", "en"];
const TOLERANCE = 10;
/** Marge de sécurité ajoutée à chaque hauteur réservée, en pixels (voir plus haut). */
const MARGE = 4;
/** Largeur sur laquelle une baisse de hauteur est retardée, en pixels : avec WebKit mesuré, sans lui (voir plus haut). */
const FENETRE_AVEC_WEBKIT = 8, FENETRE_SANS_WEBKIT = 24;
/** Largeur d'une barre de défilement classique, et largeur de fenêtre à partir de laquelle on la suppose possible (en dessous : téléphones). */
const BARRE = 15, BARRE_DES = 600;
const SWIFT = join(RACINE, "scripts/calage-guide-webkit.swift");
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Largeurs mesurées : tous les 2 px (paires) jusqu'à 1800, puis tous les 100 px jusqu'à 2400 (la page n'évolue plus au-delà : le conteneur s'arrête à 1 680 px). */
const largeursEcriture = () => { const l = []; for (let w = 320; w <= 1800; w += 2) l.push(w); for (let w = 1900; w <= 2400; w += 100) l.push(w); return l; };
/** Largeurs de contrôle : les impaires, que l'écriture n'a pas mesurées, jusqu'à 2001. */
const largeursVerification = () => { const l = []; for (let w = 321; w <= 2001; w += 2) l.push(w); return l; };

async function ouvrirChrome() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profil = join(tmpdir(), `calage-guide-${port}-${process.pid}`);
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--hide-scrollbars", `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 80 && !v; i++) { try { v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await attendre(250); } }
  if (!v) { chrome.kill("SIGKILL"); throw new Error("Chrome ne répond pas"); }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const attente = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && attente.has(m.id)) { attente.get(m.id)(m); attente.delete(m.id); } };
  const envoyer = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; attente.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { result: { targetId } } = await envoyer("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await envoyer("Target.attachToTarget", { targetId, flatten: true });
  const S = (method, params) => envoyer(method, params, sessionId);
  await S("Page.enable");
  return {
    S,
    async evaluer(expression) { const r = await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); return r.result.result?.value; },
    async fermer() { try { ws.close(); } catch { /* déjà fermé */ } chrome.kill("SIGKILL"); await attendre(300); try { rmSync(profil, { recursive: true, force: true }); } catch { /* profil déjà parti */ } },
  };
}

/** La hauteur naturelle de la pile des sept états à cette largeur (sans réserve), et celle que le CSS réserve ; avec Arial et avec une barre classique aussi. */
const MESURE = `(() => {
  const pile = document.querySelector('.pm-pile');
  const reserve = parseFloat(getComputedStyle(pile).minHeight) || 0;
  const s = document.createElement('style');
  document.head.appendChild(s);
  const ARIAL = '#guide *:not(.font-display){font-family:Arial,Helvetica,sans-serif!important}';
  // Une barre classique ôte ${BARRE} px à la page sans changer les requêtes média : html devient ${BARRE} px plus étroit que la fenêtre.
  const BARRE = 'html{width:calc(100vw - ${BARRE}px)}';
  const hauteur = (css) => { s.textContent = '.pm-pile{min-height:0!important}' + css; return pile.getBoundingClientRect().height; };
  const r = { largeur: window.innerWidth, etats: pile.querySelectorAll('.pm-etat').length, reserve, site: hauteur(''), arial: hauteur(ARIAL), siteBarre: hauteur(BARRE), arialBarre: hauteur(ARIAL + BARRE) };
  s.remove();
  return r;
})()`;

async function mesurerLangue(langue, largeurs) {
  const b = await ouvrirChrome();
  try {
    await b.S("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await b.S("Page.navigate", { url: `http://localhost:${PORT_SITE}/${langue}/artisanat/famille/portail` });
    // La page est prête quand les sept états existent (l'hydratation les a tous posés) et que la police d'affichage est chargée.
    let pret = false;
    for (let i = 0; i < 120 && !pret; i++) {
      await attendre(500);
      pret = await b.evaluer(`document.querySelectorAll('.pm-pile .pm-etat').length === 7 && document.fonts.status === 'loaded'`);
    }
    if (!pret) throw new Error(`${langue} : la page n'a pas affiché les sept états du guide (le serveur tourne-t-il sur le port ${PORT_SITE} ?)`);
    const mesures = [];
    for (const w of largeurs) {
      await b.S("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
      await attendre(40);
      const m = await b.evaluer(MESURE);
      if (m.etats !== 7) throw new Error(`${langue} ${w} px : ${m.etats} états au lieu de 7`);
      mesures.push({ w, besoin: besoinDe(w, m), site: m.site, reserve: m.reserve });
    }
    return mesures;
  } finally { await b.fermer(); }
}

/** La plus haute des hauteurs d'une mesure (police du site, Arial ; avec une barre classique dès BARRE_DES px). */
const besoinDe = (w, m) => Math.max(m.site, m.arial, ...(w >= BARRE_DES ? [m.siteBarre, m.arialBarre] : []));

/** WebKit est mesurable sur un Mac qui a swiftc, sauf si SANS_WEBKIT est posé. */
const webkitDispo = () => process.platform === "darwin" && !process.env.SANS_WEBKIT && spawnSync("swiftc", ["--version"], { stdio: "ignore" }).status === 0;
let executableWebkit = null;
/** Compile (une fois) le pilote WebKit dans un dossier temporaire. */
function compilerWebkit() {
  if (executableWebkit) return executableWebkit;
  const dossier = mkdtempSync(join(tmpdir(), "calage-guide-wk-"));
  const exe = join(dossier, "calage-guide-webkit");
  const c = spawnSync("swiftc", ["-O", SWIFT, "-o", exe], { encoding: "utf8" });
  if (c.status !== 0) throw new Error(`swiftc n'a pas compilé ${SWIFT} : ${c.stderr}`);
  process.on("exit", () => { try { rmSync(dossier, { recursive: true, force: true }); } catch { /* déjà parti */ } });
  return (executableWebkit = exe);
}
/** Les hauteurs de la pile à ces largeurs dans WebKit : une mesure par largeur (même expression que dans Chrome). */
function mesurerWebkit(langue, largeurs) {
  const exe = compilerWebkit();
  const fichier = join(exe, "..", "mesure.js");
  writeFileSync(fichier, MESURE);
  const r = spawnSync(exe, [`http://localhost:${PORT_SITE}/${langue}/artisanat/famille/portail`, fichier, largeurs.join(",")], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${langue} : la mesure WebKit a échoué (${r.status}) ${r.stderr}`);
  const l = JSON.parse(r.stdout);
  l.forEach((m, k) => { if (!m || m.etats !== 7 || m.largeur !== largeurs[k]) throw new Error(`${langue} ${largeurs[k]} px : mesure WebKit inutilisable ${JSON.stringify(m)}`); });
  return l;
}

/** Les mesures de Chrome, puis celles de WebKit quand il est là : à chaque largeur, le besoin est le plus haut des deux. */
async function mesurerTout(langue, largeurs, avecWebkit) {
  const chrome = await mesurerLangue(langue, largeurs);
  if (!avecWebkit) return chrome;
  const wk = mesurerWebkit(langue, largeurs);
  return chrome.map((m, k) => ({ ...m, besoin: Math.max(m.besoin, besoinDe(m.w, wk[k])), webkit: besoinDe(m.w, wk[k]) }));
}

/** Le besoin de chaque largeur devient le plus haut de ceux des `fenetre` px qui la précèdent (elle comprise) : les baisses de hauteur arrivent plus tard. */
function lisser(mesures, fenetre) {
  return mesures.map((m, i) => {
    let besoin = m.besoin;
    for (let j = i - 1; j >= 0 && m.w - mesures[j].w <= fenetre; j--) besoin = Math.max(besoin, mesures[j].besoin);
    return { ...m, besoin };
  });
}

/**
 * Les paliers : une valeur de min-height par plage de largeurs, au plus `tolerance` px de blanc dans une plage. Le palier suivant
 * commence à la largeur mesurée qui change la valeur ; la largeur impaire qui la précède (jamais mesurée) reçoit la plus haute des deux.
 */
function paliers(mesures, tolerance = TOLERANCE) {
  const n = mesures.length, plages = [];
  let i = 0;
  while (i < n) {
    let j = i, max = mesures[i].besoin, min = mesures[i].besoin;
    while (j + 1 < n && Math.max(max, mesures[j + 1].besoin) - Math.min(min, mesures[j + 1].besoin) <= tolerance) {
      j++; max = Math.max(max, mesures[j].besoin); min = Math.min(min, mesures[j].besoin);
    }
    plages.push({ i, H: Math.ceil(max) + 1 + MARGE });
    i = j + 1;
  }
  const out = [];
  plages.forEach((p, k) => {
    if (k === 0) { out.push({ de: 0, H: p.H }); return; }
    const avant = out[out.length - 1];
    if (p.H === avant.H) return;
    // la largeur entre la dernière mesure de la plage d'avant et la première de celle-ci : la plus haute des deux valeurs
    out.push({ de: p.H > avant.H ? mesures[p.i - 1].w + 1 : mesures[p.i].w, H: p.H });
  });
  return out;
}

const bloc = (par) => {
  const lignes = [DEBUT, "/* Hauteur réservée à .pm-pile (le plus haut des sept états du guide), par largeur de fenêtre ; une valeur par plage. */"];
  for (const langue of LANGUES) {
    for (const p of par[langue]) {
      const regle = `.pm-guide:lang(${langue}) .pm-pile { min-height: ${p.H}px; }`;
      lignes.push(p.de === 0 ? regle : `@media (min-width: ${p.de}px) { ${regle} }`);
    }
  }
  lignes.push(FIN);
  return lignes.join("\n");
};

const mode = process.argv[2] ?? "ecrire";
const avecWebkit = webkitDispo();
const fenetre = avecWebkit ? FENETRE_AVEC_WEBKIT : FENETRE_SANS_WEBKIT;
console.log(avecWebkit ? `Chrome et WebKit, fenêtre de ${fenetre} px` : `Chrome seul (pas de WebKit : ${process.env.SANS_WEBKIT ? "SANS_WEBKIT" : "pas de Mac avec swiftc"}), fenêtre de ${fenetre} px`);
/** Le blanc au-delà duquel une largeur est signalée : tolérance du palier plus marge, plus la fenêtre, avec un peu d'air. */
const BLANC_SIGNALE = TOLERANCE + MARGE + 4;
if (mode === "verifier") {
  let mal = 0;
  for (const langue of LANGUES) {
    const mesures = lisser(await mesurerTout(langue, largeursVerification(), avecWebkit), fenetre);
    // « besoin » est la plus haute des hauteurs mesurées (police du site ou Arial, avec ou sans barre, Chrome ou WebKit) : la réserve doit toujours la couvrir.
    const trop = mesures.filter((m) => m.besoin > m.reserve + 0.01);
    const exces = mesures.map((m) => m.reserve - m.besoin);
    const larges = mesures.filter((m) => m.reserve - m.besoin > BLANC_SIGNALE);
    if (larges.length) console.log(`  blanc de plus de ${BLANC_SIGNALE} px à : ${larges.slice(0, 40).map((m) => `${m.w} (${m.reserve - m.besoin | 0})`).join(", ")}`);
    console.log(`${langue} : ${mesures.length} largeurs, réserve manquante à ${trop.length} (${trop.slice(0, 12).map((m) => `${m.w} px : ${m.besoin.toFixed(1)} > ${m.reserve}`).join(" ; ") || "aucune"}), blanc en trop de ${Math.min(...exces).toFixed(1)} à ${Math.max(...exces).toFixed(1)} px`);
    mal += trop.length;
  }
  process.exit(mal ? 1 : 0);
} else {
  const par = {};
  for (const langue of LANGUES) {
    const mesures = lisser(await mesurerTout(langue, largeursEcriture(), avecWebkit), fenetre);
    par[langue] = paliers(mesures);
    console.log(`${langue} : ${mesures.length} largeurs mesurées, de ${Math.min(...mesures.map((m) => m.besoin)).toFixed(1)} à ${Math.max(...mesures.map((m) => m.besoin)).toFixed(1)} px, ${par[langue].length} paliers`);
  }
  const css = readFileSync(CSS, "utf8");
  const debut = css.indexOf(DEBUT), fin = css.indexOf(FIN);
  if (debut < 0 || fin < debut) throw new Error(`les repères « calage du guide » manquent dans ${CSS}`);
  writeFileSync(CSS, css.slice(0, debut) + bloc(par) + css.slice(fin + FIN.length));
  console.log("écrit :", CSS);
}
