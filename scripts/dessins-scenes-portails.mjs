// Les scènes de la page des portails (public/images/portails/scenes/**) : le dessin de face du moteur de l'outil de plans
// (planPortail(...).vues.face, passé par svgDe), habillé par STYLE_RENDU_PORTAIL, avec le ciel et le sol DANS le fichier.
// Jamais redessinées : seules les cotes et les textes sont retirés, comme le fait la fiche. Chargées en <img>.
//   npm run portails:scenes
// À relancer après tout changement du moteur, des styles ou des teintes (puis changer VERSION_DESSINS).
//
// Vitrine : 7 styles x 6 teintes en portail battant, fenêtre 5 200 x 2 971 mm rendue en 1300 x 743.
// Cartes  : 4 modèles x 7 styles en gris anthracite (+ le coulissant sans rail), fenêtre 6 000 x 4 000 mm rendue en 600 x 400.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { svgDe } from "../src/lib/portails-outil/moteur.genere.mjs";
import { appliquerStyle, configDepart, COULEURS_PORTAIL, planPortail, SLUGS_PORTAIL, STYLES_PORTAIL } from "../src/lib/portails.ts";
import { STYLE_RENDU_PORTAIL } from "../src/lib/portails-rendu.ts";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
export const DOSSIER_SCENES = join(RACINE, "public/images/portails/scenes");

export const CIEL = "#ffffff";
export const SOL = "#efe9df";

/**
 * Les deux fenêtres, en millimètres du moteur (sol y = 0, la hauteur vers le haut) : la largeur et la hauteur de la
 * fenêtre, ce qu'elle montre au-dessus du sol et au-dessous, et sa taille en pixels. Le sol est à 81,39 % de la hauteur
 * sur la vitrine et à 74 % sur les cartes : c'est aussi le fond de réserve que la page pose avant le chargement.
 */
export const FENETRES = {
  vitrine: { L: 5200, H: 2971, haut: 2418, bas: 553, pxL: 1300, pxH: 743 },
  carte: { L: 6000, H: 4000, haut: 2960, bas: 1040, pxL: 600, pxH: 400 },
};
/** Une primitive utile garde au moins cette marge (mm) avec le bord de la fenêtre. */
const MARGE_MM = 100;
/** Les pièces qui sortent de la fenêtre par nature : la piste du coulissant est coupée par le cadre. */
const PISTES = new Set(["Rail au sol"]);

const arrondi = (x, d = 1) => Number(x.toFixed(d));
const nombre = (x, d = 1) => String(arrondi(x, d)).replace(/^(-?)0\./, "$1.");

/** Une pièce cachée : l'outil de plans la dessine en pointillé (gonds sous le cadre, queue et chariots de l'autoportant). */
const cachee = (p) => String(p.cls ?? "").split(" ").includes("t-cache");

/** Une primitive qui compte pour le centrage et la marge : ni le sol, ni les parties cachées, ni les cotes, ni les textes. */
function utile(p) {
  if (p.t !== "poly" && p.t !== "cercle") return false;
  return !cachee(p) && ![].concat(p.piece ?? []).some((n) => PISTES.has(n));
}

/** L'emprise d'une primitive en millimètres du moteur : [x1, x2, y1, y2]. */
function emprise(p) {
  const pts = p.t === "cercle" ? [[p.c[0] - p.r, p.c[1] - p.r], [p.c[0] + p.r, p.c[1] + p.r]] : p.pts;
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

/** Retire de la feuille de style du site les règles (et les sélecteurs) dont aucun élément du dessin ne se sert. */
function styleUtile(couleur, html) {
  const jeux = [...html.matchAll(/class="([^"]*)"/g)].map((m) => new Set(m[1].split(" ").filter(Boolean)));
  const sert = (sel) => {
    const cl = sel.split(".").filter(Boolean);
    return jeux.some((j) => cl.every((c) => j.has(c)));
  };
  const regles = [];
  for (const m of STYLE_RENDU_PORTAIL(couleur).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].split(",").filter(sert);
    if (sels.length) regles.push(`${sels.join(",")}{${m[2]}}`);
  }
  return regles.join("");
}

/** La distance d'un point au segment [a, b]. */
function distanceSegment(q, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
}
/** Douglas-Peucker sur la chaîne pts[i..j] : les indices à garder (les deux bouts compris). */
function garder(pts, i, j, eps, sortie) {
  let pire = -1, d = 0;
  for (let k = i + 1; k < j; k++) {
    const e = distanceSegment(pts[k], pts[i], pts[j]);
    if (e > d) { d = e; pire = k; }
  }
  if (pire >= 0 && d > eps) { garder(pts, i, pire, eps, sortie); garder(pts, pire, j, eps, sortie); }
  else sortie.push(j);
}
/** Retire les points qui s'écartent de moins de `eps` mm du trait : à 0,05 mm, seulement ceux qui sont alignés. */
function simplifier(pts, eps, ferme) {
  if (eps <= 0 || pts.length < 4) return pts;
  if (!ferme) { const s = [0]; garder(pts, 0, pts.length - 1, eps, s); return s.map((i) => pts[i]); }
  // Un contour fermé : coupé en deux chaînes, entre le premier point et le plus éloigné.
  let m = 0, dm = -1;
  pts.forEach((q, i) => { const e = Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]); if (e > dm) { dm = e; m = i; } });
  const a = [0], b = [m];
  garder(pts, 0, m, eps, a);
  garder(pts.concat([pts[0]]), m, pts.length, eps, b);
  const sortie = a.concat(b.slice(1)).filter((i) => i < pts.length).map((i) => pts[i]);
  return sortie.length >= 3 ? sortie : pts;
}

/**
 * Le dessin du moteur en version légère : sans les marques de la fiche (data-piece, cliquable), les nombres à `d`
 * décimales (le millimètre vaut 0,25 pixel sur la vitrine, 0,1 sur les cartes) et sans les points qui s'écartent de moins
 * de `eps` mm du contour.
 */
function alleger(html, d, eps) {
  const n = (v) => nombre(v, d);
  return html
    .replace(/ data-piece="[^"]*"/g, "")
    .replace(/ cliquable/g, "")
    .replace(/<(polygon|polyline) class="([^"]*)" points="([^"]*)"\/>/g, (_, tag, cl, pts) => {
      const P = pts.split(" ").map((q) => q.split(",").map(Number));
      const S = simplifier(P, eps, tag === "polygon").map((q) => q.map(n).join(","));
      return `<${tag} class="${cl}" points="${S.filter((q, i) => q !== S[i - 1]).join(" ")}"/>`;
    })
    .replace(/ (cx|cy|r|x1|y1|x2|y2)="(-?[\d.]+)"/g, (_, k, v) => ` ${k}="${n(Number(v))}"`);
}

/**
 * Une scène : le dessin de face du moteur pour `slug` et `cfg`, dans la fenêtre `fenetre` ("vitrine" ou "carte").
 * Rend { svg, viewBox, largeur, hauteur }. Échoue si une primitive utile sort de la fenêtre avec moins de 100 mm de marge.
 */
export function fabriquerScene(slug, cfg, fenetre, { decimales = 1, eps = 0.05, nom = slug } = {}) {
  const F = FENETRES[fenetre];
  const R = planPortail(slug, cfg);
  // Ni cotes ni textes (comme la fiche), ni pointillés des pièces cachées : une scène ne montre que ce qu'on voit.
  const prims = R.vues.face.filter((p) => p.t !== "cote" && p.t !== "texte" && !cachee(p));
  const utiles = prims.filter(utile);
  if (!utiles.length) throw new Error(`${nom} : rien à dessiner`);
  const boites = utiles.map(emprise);
  const x1 = Math.min(...boites.map((b) => b[0])), x2 = Math.max(...boites.map((b) => b[1]));
  const cx = (x1 + x2) / 2, fx1 = cx - F.L / 2, fx2 = cx + F.L / 2;
  utiles.forEach((p, i) => {
    const [a, b, c, d] = boites[i];
    if (a < fx1 + MARGE_MM || b > fx2 - MARGE_MM || d > F.haut - MARGE_MM || c < -F.bas + MARGE_MM)
      throw new Error(`${nom} : « ${[].concat(p.piece ?? "?").join("|")} » sort de la fenêtre ${fenetre} (x ${Math.round(a)} à ${Math.round(b)}, y ${Math.round(c)} à ${Math.round(d)}, fenêtre x ${Math.round(fx1)} à ${Math.round(fx2)}, y ${-F.bas} à ${F.haut})`);
  });
  const echelle = F.pxL / F.L;
  const solPx = arrondi((F.pxH * F.haut) / F.H);
  const html = alleger(svgDe(prims, false).html, decimales, eps);
  const tx = arrondi((F.L / 2 - cx) * echelle, 2);
  const viewBox = `0 0 ${F.pxL} ${F.pxH}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${F.pxL}" height="${F.pxH}" viewBox="${viewBox}">` +
    `<style>${styleUtile(cfg.couleur, html)}</style>` +
    `<rect width="${F.pxL}" height="${F.pxH}" fill="${CIEL}"/>` +
    `<rect y="${solPx}" width="${F.pxL}" height="${arrondi(F.pxH - solPx)}" fill="${SOL}"/>` +
    `<g transform="translate(${nombre(tx, 2)} ${solPx}) scale(${nombre(echelle, 3)})">${html}</g></svg>\n`;
  return { svg, viewBox, largeur: F.pxL, hauteur: F.pxH };
}

/** La configuration d'un état de la vitrine : le style, puis la teinte (le galvanisé brut n'existe qu'en acier). */
export function configVitrine(style, teinte) {
  let cfg = appliquerStyle(configDepart("portail-battant"), style);
  if (teinte === "galva") cfg = { ...cfg, mat: "acier" };
  return { ...cfg, couleur: teinte };
}

/** La configuration d'une carte : le style de départ du modèle, gris anthracite, à la cote de départ. */
export function configCarte(slug, style, guidage) {
  const cfg = { ...appliquerStyle(configDepart(slug), style), couleur: "anthracite" };
  return guidage ? { ...cfg, guidage } : cfg;
}

/** La liste des 77 scènes : chemin relatif au dossier des scènes, modèle, configuration, fenêtre. */
export function listeScenes() {
  const L = [];
  for (const style of STYLES_PORTAIL)
    for (const teinte of COULEURS_PORTAIL)
      L.push({ chemin: `vitrine/battant-${style}-${teinte}.svg`, slug: "portail-battant", cfg: configVitrine(style, teinte), fenetre: "vitrine" });
  for (const slug of Object.keys(SLUGS_PORTAIL))
    for (const style of STYLES_PORTAIL) L.push({ chemin: `cartes/${slug}-${style}.svg`, slug, cfg: configCarte(slug, style), fenetre: "carte" });
  for (const style of STYLES_PORTAIL)
    L.push({ chemin: `cartes/portail-coulissant-${style}-auto.svg`, slug: "portail-coulissant", cfg: configCarte("portail-coulissant", style, "auto"), fenetre: "carte" });
  return L;
}

// Le poids : une décimale et seulement les points qui comptent (ceux qui ne sont pas alignés). Si la limite d'un fichier
// est dépassée (volutes, tôle découpée) : le millimètre entier, puis, au besoin, sans les points à moins de 0,12 pixel du contour.
export const LIMITES = {
  simple: { brut: 12 * 1024 },
  tole: { brut: 60 * 1024, gzip: 30 * 1024 },
  volutes: { brut: 110 * 1024, gzip: 45 * 1024 },
};
export const limiteDe = (chemin) => (/-tole[-.]/.test(chemin) ? LIMITES.tole : /-volutes[-.]/.test(chemin) ? LIMITES.volutes : LIMITES.simple);

/** Fabrique une scène en respectant sa limite de poids : une décimale, puis l'entier si besoin. */
export function fabriquer({ chemin, slug, cfg, fenetre }) {
  const lim = limiteDe(chemin);
  let r;
  for (const [decimales, px] of [[1, 0], [0, 0], [0, 0.12]]) {
    const eps = px ? px / (FENETRES[fenetre].pxL / FENETRES[fenetre].L) : 0.05;
    r = fabriquerScene(slug, cfg, fenetre, { decimales, eps, nom: chemin });
    r.decimales = decimales;
    r.simplifie = Boolean(px);
    const octets = Buffer.byteLength(r.svg);
    if (octets <= lim.brut && (!lim.gzip || gzipSync(r.svg, { level: 9 }).length <= lim.gzip)) break;
  }
  return r;
}

function ecrire() {
  for (const sous of ["vitrine", "cartes"]) {
    mkdirSync(join(DOSSIER_SCENES, sous), { recursive: true });
    for (const f of readdirSync(join(DOSSIER_SCENES, sous))) if (f.endsWith(".svg")) rmSync(join(DOSSIER_SCENES, sous, f));
  }
  const fichiers = [];
  for (const s of listeScenes()) {
    const r = fabriquer(s);
    writeFileSync(join(DOSSIER_SCENES, s.chemin), r.svg);
    const octets = Buffer.byteLength(r.svg), gzip = gzipSync(r.svg, { level: 9 }).length;
    fichiers.push({ chemin: s.chemin, octets, viewBox: r.viewBox, largeur: r.largeur, hauteur: r.hauteur });
    const lim = limiteDe(s.chemin);
    const depasse = octets > lim.brut || (lim.gzip && gzip > lim.gzip);
    console.log(`${depasse ? "TROP LOURD " : ""}${s.chemin.padEnd(52)} ${(octets / 1024).toFixed(1).padStart(6)} Ko  gzip ${(gzip / 1024).toFixed(1).padStart(5)} Ko  (${r.decimales} déc.${r.simplifie ? ", simplifié" : ""})`);
    if (depasse) process.exitCode = 1;
  }
  writeFileSync(join(DOSSIER_SCENES, "manifeste.json"), JSON.stringify({ fichiers }, null, 2) + "\n");
  console.log(`${fichiers.length} scènes écrites dans public/images/portails/scenes (manifeste.json compris).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) ecrire();
