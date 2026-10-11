// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : NE PAS MODIFIER À LA MAIN.
// Le moteur des PORTAILS (plans/modules/motifs.js sans commentaires ni catalogue nominatif, puis plans-portails.js, tels que collés dans l'outil) : géométrie, débit, dessins, contrôles. Aucun prix.
// Source : l'outil de plans (plans-atelier.html), sha256 bd87f01e0e090ecd2be09a7d.
/* eslint-disable */


const MT_ATELIER = {
  barreau: 16,
  vide: 105,
  videGrille: 128,
  volute: { b: 16, e: 6 },
  epVue: 7,
  collier: { h: 13, b: 12, e: 4 },
  lisseFrise: { b: 30, e: 8 },
  frise: 170,
  friseBasse: 80,
  voluteMax: 230,
  pointe: { depasse: 110, h: 75 },
  achatMax: 700,
  densite: 7.85,
  barreauDecor: 150,
  jeuCatalogue: 2,
  reprise: 0.1,
  repriseSecours: 0.12,
  plat12Max: 250,
  cimier: [150, 300],
  coinMax: 0.3,
  jeuBande: 3,
  videEscalade: 95,
  petiteHauteur: 220,
  jeuVoisin: 5,
};

const MT_CHOIX = {
  assemblage: ["barreaux", "entre", "frise", "anneaux", "hauteur", "coeurs", "medaillon", "applique", "coins", "cimier", "appliquePlein"],
  forme: ["C", "S", "J", "coeur", "doubleC", "poste", "anneau"],
  bouts: ["droit", "effile", "bouton"],
  liaison: ["soudure"],
  barreaux: ["carre", "torsade", "bagues"],
  friseBasse: ["aucune", "postes"],
  pointes: ["aucune", "lance"],
  pos: ["haut", "milieu", "bas"],
  rythme: ["tous", "unSurDeux", "alterne"],
};
const MT_CHOIX_GC = ["entre", "frise", "anneaux", "hauteur", "coeurs", "medaillon", "applique"];
const MT_PORTAIL_SEUL = ["coins", "cimier", "appliquePlein"];
const MT_AVEC = {
  barreaux: [],
  entre: ["C", "S", "J"],
  frise: ["S", "C", "poste"],
  anneaux: ["anneau"],
  hauteur: ["C", "S"],
  coeurs: ["coeur"],
  medaillon: ["coeur", "doubleC", "J"],
  applique: ["doubleC", "coeur", "C"],
  coins: ["C", "J"],
  cimier: ["C", "S", "doubleC"],
  appliquePlein: ["doubleC", "coeur", "C"],
};
const MT_SYMETRIQUES = ["coeur", "doubleC", "anneau", "lyre", "ovale"];
const MT_NOMS = { C: "Volute en C", S: "Volute en S", J: "Crosse", coeur: "Cœur", doubleC: "Double C", poste: "Poste", lyre: "Lyre", Scouche: "Volute en S", ovale: "Ovale (deux C affrontés)", anneau: "Anneau" };
const MT_NOMS_PLACEMENT = { barreaux: "barreaux droits", entre: "entre les barreaux", frise: "frise sous la traverse haute", anneaux: "frise d'anneaux", hauteur: "grille sur toute la hauteur", coeurs: "cœurs", medaillon: "médaillon", applique: "motifs en applique", coins: "coins du haut", cimier: "couronnement", appliquePlein: "motif sur le soubassement plein" };
const MT_NOMS_POS = { haut: "en haut", milieu: "au milieu", bas: "en bas" };


const MT_CATALOGUE = [
  { forme: "C", ref: "c1", fournisseur: "", h: 115, l: 95, section: "12×6", params: { r0: 46, L1: 10, T: 1.9 } },
  { forme: "C", ref: "c2", fournisseur: "", h: 110, l: 60, section: "12×6", params: { r0: 34, L1: 110, T: 1.4 } },
  { forme: "C", ref: "c3", fournisseur: "", h: 190, l: 95, section: "12×6", params: { r0: 42, L1: 130, T: 1.4, Rb: 800 } },
  { forme: "C", ref: "c4", fournisseur: "", h: 190, l: 120, section: "16×8", params: { r0: 34, L1: 40, T: 1.4 } },
  { forme: "C", ref: "c5", fournisseur: "", h: 235, l: 120, section: "16×8", params: { r0: 46, L1: 110, T: 1.2, Rb: 800 } },
  { forme: "C", ref: "c6", fournisseur: "", h: 470, l: 120, section: "16×8", params: { r0: 28, L1: 80, Ld: 150, Rb: 1000, T: 1.6 } },
  { forme: "S", ref: "c7", fournisseur: "", h: 150, l: 70, section: "12×6", params: { r0: 42, Lb: 60, T: 1.9 } },
  { forme: "S", ref: "c8", fournisseur: "", h: 190, l: 75, section: "12×6", params: { r0: 42, Lb: 270, T: 1.6, e: 22 } },
  { forme: "S", ref: "c9", fournisseur: "", h: 205, l: 72, section: "12×6", params: { r0: 36, Lb: 330, T: 2.5 } },
  { forme: "S", ref: "c10", fournisseur: "", h: 270, l: 110, section: "12×6", params: { r0: 48, Lb: 100, T: 1.9 } },
  { forme: "S", ref: "c11", fournisseur: "", h: 350, l: 110, section: "12×6", params: { r0: 36, Lb: 270, T: 1.6, e: 22 } },
  { forme: "S", ref: "c12", fournisseur: "", h: 185, l: 155, section: "16×8", params: { r0: 42, Lb: 60, T: 1.1, e: 30 } },
  { forme: "S", ref: "c13", fournisseur: "", h: 195, l: 165, section: "16×8", params: { r0: 36, Lb: 60, T: 1.6, e: 30 } },
  { forme: "coeur", ref: "c14", fournisseur: "", h: 95, l: 95, section: "12×6", params: { ouv: 1, L1: 40, R1: 80 }, nbAchat: 1 },
  { forme: "coeur", ref: "c15", fournisseur: "", h: 135, l: 165, section: "12×6", params: { ouv: 0.85, L1: 170, R1: 200 }, nbAchat: 1 },
  { forme: "coeur", ref: "c16", fournisseur: "", h: 385, l: 230, section: "12×6", params: { ouv: 0.6, L1: 170, R1: 120 }, nbAchat: 1 },
  { forme: "coeur", ref: "c17", fournisseur: "", h: 440, l: 225, section: "12×6", params: { ouv: 0.45, L1: 100, R1: 200 }, nbAchat: 1 },
  { forme: "doubleC", ref: "c1", fournisseur: "", h: 115, l: 198, section: "12×6", params: { r0: 46, L1: 10, T: 1.9, jeu: 6.68 }, nbAchat: 2 },
  { forme: "doubleC", ref: "c3", fournisseur: "", h: 190, l: 198, section: "12×6", params: { r0: 42, L1: 130, T: 1.4, Rb: 800, jeu: 8.25 }, nbAchat: 2 },
  { forme: "doubleC", ref: "c4", fournisseur: "", h: 190, l: 248, section: "16×8", params: { r0: 34, L1: 40, T: 1.4, jeu: 4.26 }, nbAchat: 2 },
  { forme: "doubleC", ref: "c5", fournisseur: "", h: 235, l: 248, section: "16×8", params: { r0: 46, L1: 110, T: 1.2, Rb: 800, jeu: 6.46 }, nbAchat: 2 },
  { forme: "doubleC", ref: "c6", fournisseur: "", h: 470, l: 248, section: "16×8", params: { r0: 28, L1: 80, Ld: 150, Rb: 1000, T: 1.6, jeu: 4.63 }, nbAchat: 2 },
  { forme: "lyre", ref: "c18", fournisseur: "", h: 200, l: 100, section: "16×8", params: { Ls: 225 }, nbAchat: 1 },
  { forme: "anneau", ref: "c19", fournisseur: "", h: 100, l: 100, section: "12×6", params: {} },
  { forme: "poste", ref: "c20", fournisseur: "", h: 100, l: 1080, section: "12×6", params: {}, parMetre: true },
];
const MT_FOURNISSEURS = {};
const MT_SECTIONS = { "12×6": { b: 12, e: 6 }, "16×8": { b: 16, e: 8 } };


const MT_INCOMPAT = [
  { a: "hauteur", b: "coeurs", raison: "La grille de volutes et les cœurs demandent chacun leurs propres barreaux : un seul des deux." },
  { a: "hauteur", b: "frise", raison: "La grille de volutes occupe déjà toute la hauteur du panneau : pas de place pour une frise." },
  { a: "hauteur", b: "anneaux", raison: "La grille de volutes occupe déjà toute la hauteur du panneau : pas de place pour une frise d'anneaux." },
  { a: "hauteur", b: "entre", raison: "La grille de volutes remplit déjà chaque vide, sur toute la hauteur." },
  { a: "hauteur", b: "medaillon", raison: "Le médaillon tomberait sur la grille de volutes." },
  { a: "hauteur", b: "applique", raison: "Les motifs en applique tomberaient sur la grille de volutes." },
  { a: "hauteur", b: "coins", raison: "La grille de volutes occupe déjà les coins du panneau." },
  { a: "coeurs", b: "frise", raison: "Les cœurs retirent un barreau sur deux, la frise les garde tous : un seul des deux." },
  { a: "coeurs", b: "anneaux", raison: "Les cœurs retirent un barreau sur deux, la frise d'anneaux les garde tous : un seul des deux." },
  { a: "coeurs", b: "entre", raison: "Les cœurs remplissent déjà les grands vides." },
  { a: "coeurs", b: "medaillon", raison: "Le médaillon tomberait sur les cœurs, au milieu du panneau." },
  { a: "coeurs", b: "applique", raison: "Les motifs en applique tomberaient sur les cœurs." },
  { a: "frise", b: "anneaux", raison: "Deux frises sous la traverse haute : une seule à la fois." },
  { a: "frise", b: "entre:haut", raison: "Les volutes en tête des vides prennent la place de la frise : mettez-les au milieu ou en bas." },
  { a: "anneaux", b: "entre:haut", raison: "Les volutes en tête des vides prennent la place des anneaux : mettez-les au milieu ou en bas." },
  { a: "medaillon", b: "entre:milieu", raison: "Le médaillon est au milieu du panneau, à la place des volutes du milieu." },
  { a: "medaillon", b: "applique", raison: "Les motifs en applique et le médaillon se superposent au milieu du panneau." },
  { a: "applique", b: "entre:milieu", raison: "Les motifs en applique tombent sur les volutes du milieu." },
  { a: "entre:haut", b: "coins", raison: "Les volutes des coins tombent sur les volutes en tête des vides." },
];
const MT_RANG = { hauteur: 0, coeurs: 1, frise: 2, anneaux: 3, entre: 4, medaillon: 5, applique: 6, coins: 7, cimier: 8, appliquePlein: 9, barreaux: 10 };


function mtSpireL(r0, r1, T) { return 2 * Math.PI * T * (r0 - r1) / Math.log(r0 / r1); }
function mtTracer(segs, a0 = 0, n = 700) {
  const Lt = segs.reduce((t, g) => t + g.L, 0), ds = Lt / n;
  const kAt = (s) => {
    for (const g of segs) {
      if (s <= g.L || g === segs[segs.length - 1]) {
        const t = Math.min(1, s / g.L);
        return g.ra != null ? g.s / (g.ra + (g.rb - g.ra) * t) : g.ka + (g.kb - g.ka) * t;
      }
      s -= g.L;
    }
    return 0;
  };
  let x = 0, y = 0, a = a0; const pts = [[0, 0]];
  for (let i = 0; i < n; i++) {
    const k = kAt((i + 0.5) * ds), am = a + k * ds / 2;
    x += Math.cos(am) * ds; y += Math.sin(am) * ds; a += k * ds; pts.push([x, y]);
  }
  return pts;
}
const mtSpire = (r0, r1, T, s, sortante) => ({ L: mtSpireL(r0, r1, T), ra: sortante ? r1 : r0, rb: sortante ? r0 : r1, s });
const mtLin = (L, ka, kb) => ({ L, ka, kb });
const mtTourner = (traits, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return traits.map((t) => t.map(([x, y]) => [x * c - y * s, x * s + y * c])); };
const mtMiroir = (traits) => traits.map((t) => t.map(([x, y]) => [-x, y]));
const mtDecaler = (traits, dx, dy) => traits.map((t) => t.map(([x, y]) => [x + dx, y + dy]));
const mtBoite = (traits) => { const a = traits.flat(); return { x0: Math.min(...a.map((p) => p[0])), x1: Math.max(...a.map((p) => p[0])), y0: Math.min(...a.map((p) => p[1])), y1: Math.max(...a.map((p) => p[1])) }; };
const mtRedresser = (traits) => { const t = traits[0], p = t[0], q = t[t.length - 1]; return mtTourner(traits, Math.PI / 2 - Math.atan2(q[1] - p[1], q[0] - p[0])); };
const mtLongueur = (t) => t.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1]) : 0), 0);

const MT_FORMES = {
  C: (p = {}) => { const r0 = p.r0 || 34, e = p.e || 13, T = p.T || 1.6, L1 = p.L1 || 70, kb = 1 / (p.Rb || 260);
    return mtRedresser([mtTracer([mtSpire(r0, e, T, 1, true), mtLin(L1, 1 / r0, kb), ...(p.Ld ? [mtLin(p.Ld, kb, kb)] : []), mtLin(L1, kb, 1 / r0), mtSpire(r0, e, T, 1, false)])]); },
  S: (p = {}) => { const r0 = p.r0 || 42, e = p.e || 14, T = p.T || 1.6;
    return mtRedresser([mtTracer([mtSpire(r0, e, T, 1, true), mtLin(p.Lb || 120, 1 / r0, -1 / r0), mtSpire(r0, e, T, -1, false)])]); },
  J: (p = {}) => { const r0 = p.r0 || 36, e = p.e || 11, T = p.T || 1.8;
    return mtTourner([mtTracer([mtLin(p.Ls || 170, 0, 0), mtLin(60, 0, 1 / r0), mtSpire(r0, e, T, 1, false)])], -Math.PI / 2); },
  coeur: (p = {}) => { const r0 = p.r0 || 40, e = p.e || 11, T = p.T || 1.75, L1 = p.L1 || 170, k1 = 1 / (p.R1 || 120);
    const demi = [mtTracer([mtLin(L1, 0, k1), mtLin(25, k1, 1 / r0), mtSpire(r0, e, T, 1, false)], -Math.PI / 2 - (p.ouv || 0.72))];
    return [...demi, ...mtMiroir(demi)]; },
  doubleC: (p = {}) => { const c = MT_FORMES.C(p), b = mtBoite(c), jeu = p.jeu ?? 8;
    const gauche = mtDecaler(c, -b.x1 - jeu / 2, 0); return [...gauche, ...mtMiroir(gauche)]; },
  lyre: (p = {}) => { const j = MT_FORMES.J({ Ls: p.Ls || 40 }), b = mtBoite(j), d = mtDecaler(j, -b.x0 + 2, 0); return [...d, ...mtMiroir(d)]; },
  Scouche: (p = {}) => mtTourner(MT_FORMES.S(p), Math.PI / 2),
  ovale: (p = {}) => { const c = MT_FORMES.C(p), b = mtBoite(c), d = mtDecaler(c, -b.x0 + (p.jeu ?? 6) / 2, 0); return [...mtMiroir(d), ...d]; },
  anneau: () => [Array.from({ length: 73 }, (_, i) => [50 * Math.cos(i * Math.PI / 36), 50 * Math.sin(i * Math.PI / 36)])],
  poste: (p = {}) => { const r0 = p.r0 || 28, e = p.e || 10, T = p.T || 1.6;
    return [mtTracer([mtLin(p.L0 || 12, 0, 0), mtLin(p.L1 || 45, 0, -1 / 40), mtLin(p.L2 || 45, -1 / 40, 1 / r0), mtSpire(r0, e, T, 1, false)])]; },
};
const mtForme = (k) => MT_FORMES[k]();
const mtFormeRef = (e) => MT_FORMES[e.forme](e.params || {});


function mtCaser(traits, x, yb, w, h, ancre = "centre", miroir = false) {
  const b = mtBoite(traits), sc = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
  const bw = (b.x1 - b.x0) * sc, bh = (b.y1 - b.y0) * sc;
  const ox = x + (w - bw) / 2, haut = ancre === "haut" ? yb + h : ancre === "bas" ? yb + bh : yb + (h + bh) / 2;
  return traits.map((t) => t.map(([px, py]) => [miroir ? ox + bw - (px - b.x0) * sc : ox + (px - b.x0) * sc, haut - (py - b.y0) * sc]));
}
function mtAlleger(t, tol = 0.5, stable = false) {
  if (t.length < 3) return t;
  if (Math.hypot(t[0][0] - t[t.length - 1][0], t[0][1] - t[t.length - 1][1]) < 1e-6 && t.length > 4) { const m = t.length >> 1; return mtAlleger(t.slice(0, m + 1), tol, stable).concat(mtAlleger(t.slice(m), tol, stable).slice(1)); }
  const garder = new Uint8Array(t.length); garder[0] = garder[t.length - 1] = 1; const pile = [[0, t.length - 1]], ex = stable ? 1e-9 : 0;
  while (pile.length) {
    const [a, b] = pile.pop(), [ax, ay] = t[a], [bx, by] = t[b], L = Math.hypot(bx - ax, by - ay) || 1; let dm = 0, im = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - t[i][1]) - (ax - t[i][0]) * (by - ay)) / L; if (d > dm + ex) { dm = d; im = i; } }
    if (dm > tol) { garder[im] = 1; pile.push([a, im], [im, b]); }
  }
  return t.filter((_, i) => garder[i]);
}
function mtOeil(t, debut) {
  const n = t.length, k = Math.max(4, Math.round(n * 0.12)), seg = debut ? t.slice(0, k) : t.slice(n - k);
  let tour = 0;
  for (let i = 2; i < seg.length; i++) {
    let d = Math.atan2(seg[i][1] - seg[i - 1][1], seg[i][0] - seg[i - 1][0]) - Math.atan2(seg[i - 1][1] - seg[i - 2][1], seg[i - 1][0] - seg[i - 2][0]);
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; tour += d;
  }
  return Math.abs(tour) > 0.9;
}
function mtRuban(t, ep, bouts) {
  const n = t.length, L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(t[i][0] - t[i - 1][0], t[i][1] - t[i - 1][1]));
  const Lt = L[n - 1], oeilD = bouts !== "droit" && mtOeil(t, true), oeilF = bouts !== "droit" && mtOeil(t, false), lc = Math.min(Lt * 0.18, ep * 9);
  const lisse = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const demi = (s) => { let w = 1; if (oeilD) w = Math.min(w, 0.5 + 0.5 * lisse(s / lc)); if (oeilF) w = Math.min(w, 0.5 + 0.5 * lisse((Lt - s) / lc)); return ep * w / 2; };
  const G = [], D = [];
  const ferme = n > 3 && Math.hypot(t[0][0] - t[n - 1][0], t[0][1] - t[n - 1][1]) < 1e-6;
  for (let i = 0; i < n; i++) {
    const p = t[i === 0 && ferme ? n - 2 : Math.max(0, i - 1)], q = t[i === n - 1 && ferme ? 1 : Math.min(n - 1, i + 1)], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, h = demi(L[i]);
    G.push([t[i][0] - dy / l * h, t[i][1] + dx / l * h]); D.push([t[i][0] + dy / l * h, t[i][1] - dx / l * h]);
  }
  const boutons = [];
  if (bouts === "bouton") { if (oeilD) boutons.push(t[0]); if (oeilF) boutons.push(t[n - 1]); }
  return { pts: G.concat(D.reverse()), boutons, forges: (oeilD ? 1 : 0) + (oeilF ? 1 : 0), long: Lt };
}


function mtFleche(f, a, b) {
  const fa = f(a), fb = f(b); let m = 0;
  for (let k = 1; k < 16; k++) m = Math.max(m, Math.abs(f(a + (b - a) * k / 16) - fa - (fb - fa) * k / 16));
  return m;
}
const mtCourbe = (z) => mtFleche(z.haut, z.x0, z.x1) > 0.5;
function mtHauteurMin(z) { let m = Infinity; for (let k = 0; k <= 20; k++) { const x = z.x0 + (z.x1 - z.x0) * k / 20; m = Math.min(m, z.haut(x) - z.bas(x)); } return m; }
function mtEcart(m, f, sens) { let e = Infinity; for (const t of m) for (const [x, y] of t) e = Math.min(e, sens * (y - f(x))); return e; }
const mtContreHaut = (m, haut, jeu) => mtDecaler(m, 0, mtEcart(m, haut, -1) - jeu);
function mtDansBande(m, dessous, dessus, jeuB, jeuH = 0, kMin = 0.5) {
  const poser = (t) => mtDecaler(t, 0, jeuB - mtEcart(t, dessous, 1));
  const r = poser(m);
  if (!dessus || mtEcart(r, dessus, -1) >= jeuH) return r;
  const b = mtBoite(m), cx = (b.x0 + b.x1) / 2;
  const reduire = (k) => poser(m.map((t) => t.map(([x, y]) => [cx + (x - cx) * k, b.y0 + (y - b.y0) * k])));
  let lo = Math.min(1, kMin), hi = 1;
  for (let i = 0; i < 30; i++) { const k = (lo + hi) / 2; if (mtEcart(reduire(k), dessus, -1) >= jeuH) lo = k; else hi = k; }
  return reduire(lo);
}


const mtSectionVoulue = (assemblage, dim) => (["medaillon", "coins", "cimier"].includes(assemblage) || dim > MT_ATELIER.plat12Max ? "16×8" : "12×6");
const mtNoteRef = (e, s, assemblage, taille, viser) => Math.abs(taille - viser) / Math.max(1, viser) + (mtSectionVoulue(assemblage, Math.max(e.h, e.l) * s) === e.section ? 0 : 0.15);
function mtRef(forme, assemblage, lim) {
  const R = MT_ATELIER.reprise; let best = null;
  for (const e of MT_CATALOGUE) {
    if (e.forme !== forme || e.parMetre || (lim.filtre && !lim.filtre(e))) continue;
    const sMax = Math.min(1 + R, (lim.hMax || Infinity) / e.h, (lim.lMax || Infinity) / e.l);
    if (sMax < 1 - R) continue;
    const s0 = lim.viserL ? lim.viserL / e.l : lim.viser ? lim.viser / e.h : 1, s = Math.max(1 - R, Math.min(sMax, s0));
    const note = lim.viserL ? mtNoteRef(e, s, assemblage, e.l * s, lim.viserL) : mtNoteRef(e, s, assemblage, e.h * s, lim.viser || e.h);
    if (!best || note < best.note - 1e-9) best = { e, s, note };
  }
  return best;
}
function mtRefVides(forme, assemblage, W, B, hMax, viser = hMax, pair = false, filtre = null, R = MT_ATELIER.reprise) {
  const J = MT_ATELIER.jeuCatalogue; let best = null;
  for (const e of MT_CATALOGUE) {
    if (e.forme !== forme || e.parMetre || (filtre && !filtre(e))) continue;
    const n0 = Math.round((W + B) / (e.l + J + B));
    for (const n of (pair ? [n0 - 2, n0 - 1, n0, n0 + 1, n0 + 2].filter((x) => x % 2 === 0) : [n0, n0 - 1, n0 + 1])) {
      if (n < 1) continue;
      const v = (W - (n - 1) * B) / n, s = (v - J) / e.l;
      if (Math.abs(s - 1) > R + 1e-9 || e.h * s > hMax + 1e-6) continue;
      const note = mtNoteRef(e, s, assemblage, e.h * s, viser) + Math.abs(s - 1) * 0.01;
      if (!best || note < best.note - 1e-9) best = { e, s, v, note };
    }
  }
  return best;
}
function mtRefDuVide(forme, assemblage, v, hMax, viser = hMax) {
  const R = MT_ATELIER.reprise, J = MT_ATELIER.jeuCatalogue; let best = null;
  for (const e of MT_CATALOGUE) {
    if (e.forme !== forme || e.parMetre) continue;
    const s = (v - J) / e.l;
    if (Math.abs(s - 1) > R + 1e-9 || e.h * s > hMax + 1e-6) continue;
    const note = mtNoteRef(e, s, assemblage, e.h * s, viser);
    if (!best || note < best.note - 1e-9) best = { e, s, note };
  }
  return best;
}
function mtRefVidesLu(z, forme, assemblage, W, B, hMax, viser, q, filtre = null) {
  const lu = mtLuAxe(z), cat = mtRefVides(forme, assemblage, W, B, hMax, viser, lu, filtre);
  if (cat || !lu) return { cat, lu };
  const file = mtRefVides(forme, assemblage, W, B, hMax, viser, false, filtre);
  if (!file) return { cat: null, lu };
  q.notes = (q.notes || []).concat(`${MT_NOMS[forme] || forme} : aucun nombre pair de vides ne tombe juste avec la pièce du catalogue (±10 %) : posées en file, dans le même sens.`);
  return { cat: file, lu: false };
}
const mtFiltreImpose = (ch, forme) => (ch.refs && ch.refs[forme] ? (e) => e.ref === ch.refs[forme] : null);
function mtRefVidesLuImp(z, ch, assemblage, W, B, hMax, viser, q) {
  const f = mtFiltreImpose(ch, ch.forme);
  if (f) { const r = mtRefVidesLu(z, ch.forme, assemblage, W, B, hMax, viser, q, f); if (r.cat) return r; }
  return mtRefVidesLu(z, ch.forme, assemblage, W, B, hMax, viser, q);
}
const mtRefPoste = () => MT_CATALOGUE.find((e) => e.forme === "poste");
function mtRefus(q, quoi, raison) { if (!(q.refus || []).some((r) => r.raison === raison)) q.refus = (q.refus || []).concat({ quoi, raison }); }
const mtSansRef = (forme, assemblage) => `${MT_NOMS[forme] || forme} : aucune référence du catalogue ne va ${assemblage === "entre" ? "entre ces barreaux" : "à cette place"} (reprise au gabarit de ±10 % au plus). Choisissez une autre forme.`;


const mtSym = (i, n) => (n ? Math.min(i, n - 1 - i) : i);
const mtDroite = (i, n) => (n ? i > (n - 1) / 2 : false);
const mtSens = (i, n, alterne = true) => (n ? (alterne && mtSym(i, n) % 2 === 1) !== mtDroite(i, n) : alterne && i % 2 === 1);
const mtPetite = (z, ch) => !ch.catalogue && !z.lib && mtHauteurMin(z) < MT_ATELIER.petiteHauteur;
const mtCouchee = (k) => mtTourner(mtForme(k), Math.PI / 2);
function mtBande(z, ch, F, pieces, q, debout) {
  const lu = mtLuAxe(z), hB = mtHauteurMin(z) - 8, forme = (k) => { const d = mtForme(k), b = mtBoite(d), w = hB * (b.x1 - b.x0) / (b.y1 - b.y0); return debout && w + 2 >= 60 ? d : mtCouchee(k); };
  const f = forme(ch.forme), bb = mtBoite(f), vmax = Math.min(z.vide || MT_ATELIER.vide, hB * (bb.x1 - bb.x0) / (bb.y1 - bb.y0) + 2);
  const lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, vmax, undefined, undefined, lu), nL = lu ? lib.length : 0;
  lib.forEach(([a, c], i) => {
    if (mtSaute(ch, i, nL)) return;
    const fo = mtFormeN(ch, i, nL), { yb, yh } = mtCase(z.bas, z.haut, a, c);
    const m = mtCaser(fo === ch.forme ? f : forme(fo), a + 1, yb + 4, c - a - 2, yh - yb - 8, "centre", mtSens(i, nL));
    if (mtVolute(m, fo, F, pieces, q, ch)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
  });
}
const mtLuAxe = (z) => { const W = z.x1 - z.x0; return Math.abs(z.haut(z.x1) - z.haut(z.x0)) <= 0.05 * W && Math.abs(z.bas(z.x1) - z.bas(z.x0)) <= 0.05 * W; };
const mtSaute = (ch, i, n) => ch.rythme === "unSurDeux" && mtSym(i, n) % 2 === 1;
const mtFormeN = (ch, i, n) => (ch.rythme === "alterne" && mtSym(i, n) % 2 === 1 && ch.forme2 ? ch.forme2 : ch.forme);
const mtFormeAxe = (forme) => (MT_SYMETRIQUES.includes(forme) ? forme : "doubleC");


const mtKgM = (b, e) => b * e / 1e6 * MT_ATELIER.densite * 1000;
function mtPoly(F, pts, piece, role, cls = "t-acier-plein") { F.push({ t: "poly", pts, cls, piece, role }); }
function mtBarreau(z, x, F, pieces, q, ch, y0, y1) {
  const b = z.barreau || MT_ATELIER.barreau, P = MT_ATELIER.pointe, bas = y0 || z.bas, lance = !y1 && ch.pointes === "lance" && z.pointes;
  const haut = lance ? (xx) => z.haut(xx) + z.pointes + P.depasse : y1 || z.haut;
  const pts = [[x, bas(x)], [x + b, bas(x + b)], [x + b, haut(x + b)], [x, haut(x)]];
  mtPoly(F, pts, "Barreaux", "fer");
  if (lance) {
    const xm = x + b / 2, yt = haut(xm);
    mtPoly(F, [[xm - b * 0.55, yt], [xm - b * 1.3, yt + 20], [xm, yt + P.h], [xm + b * 1.3, yt + 20], [xm + b * 0.55, yt]], "Pointes de lance", ch.dore ? "or" : "fer");
    mtPoly(F, [[x - 3, yt - 14], [x + b + 3, yt - 14], [x + b + 3, yt - 4], [x - 3, yt - 4]], "Pointes de lance", ch.dore ? "or" : "collier");
    q.pointes = (q.pointes || 0) + 1;
  }
  const L = Math.max(haut(x), haut(x + b)) - Math.min(bas(x), bas(x + b));
  if (ch.barreaux === "bagues" && L > MT_ATELIER.barreauDecor) {
    for (const t of [1 / 3, 2 / 3]) { const y = bas(x + b / 2) + t * (haut(x + b / 2) - bas(x + b / 2)); mtPoly(F, [[x - 4, y - 7], [x + b + 4, y - 7], [x + b + 4, y + 7], [x - 4, y + 7]], "Bagues", ch.dore ? "or" : "collier"); }
    q.bagues = (q.bagues || 0) + 2;
  }
  if (ch.barreaux === "torsade" && L > MT_ATELIER.barreauDecor) {
    const ya = Math.min(bas(x), bas(x + b)) + 0.2 * L, yb = ya + 0.6 * L;
    for (let y = ya; y < yb - b; y += b * 0.95) F.push({ t: "poly", ouvert: true, pts: [[x + 1, y], [x + b - 1, y + b * 0.55]], cls: "t-acier", role: "vrille" });
    q.torsades = (q.torsades || 0) + 1;
  }
  const tors = ch.barreaux === "torsade" && L > MT_ATELIER.barreauDecor;
  pieces.push({ nom: tors ? "Barreau torsadé" : "Barreau", mat: tors ? `Carré ${b} torsadé (acheté)` : `Carré plein ${b}`, long: L, kgM: mtKgM(b, b), peri: 4 * b, coupes: Math.abs(bas(x) - bas(x + b)) > 1 ? "Coupes d'onglet à la pente" : "Coupes droites", note: tors ? "Acheté torsadé (60 % de la longueur)" : "", groupe: "Remplissage" });
  q.soudures = (q.soudures || 0) + 2;
}
function mtCompteBarreaux(z, a, b, vmax) {
  vmax = Math.min(vmax || z.vide || MT_ATELIER.vide, z.videMax || Infinity);
  if (z.norme && z.norme.escalade && vmax <= 110) vmax = Math.min(vmax, MT_ATELIER.videEscalade);
  const B = z.barreau || MT_ATELIER.barreau;
  return Math.max(0, Math.ceil((b - a - vmax) / (B + vmax)));
}
function mtBarreaux(z, a, b, F, pieces, q, ch, vmax, y0, y1, pair = false) {
  if (z.lib) return z.lib;
  const B = z.barreau || MT_ATELIER.barreau, n0 = mtCompteBarreaux(z, a, b, vmax), n = pair && n0 % 2 === 0 ? n0 + 1 : n0, v = (b - a - n * B) / (n + 1);
  for (let i = 0; i < n; i++) mtBarreau(z, a + v + i * (v + B), F, pieces, q, ch, y0, y1);
  q.vide = Math.max(q.vide || 0, v);
  return Array.from({ length: n + 1 }, (_, i) => [a + i * (v + B), a + i * (v + B) + v]);
}
function mtVolute(traits, forme, F, pieces, q, ch, devant = false, cat = null) {
  if (ch.catalogue) {
    const b0 = mtBoite(traits), d0 = Math.max(b0.x1 - b0.x0, b0.y1 - b0.y0), nom = MT_NOMS[forme] || "Volute";
    if (d0 > MT_ATELIER.achatMax) { mtRefus(q, nom, `${nom} de ${Math.round(d0)} mm : au-delà de ${MT_ATELIER.achatMax} mm, aucune pièce du catalogue, et pas de pièce forgée sur un portail.`); return false; }
  }
  const S = cat ? MT_SECTIONS[cat.e.section] : null;
  const ep = S ? S.e + 1 : MT_ATELIER.epVue, V = S || MT_ATELIER.volute;
  let longueur = 0;
  for (const t0 of traits) {
    const t = mtAlleger(t0, 0.3, ch.stable === true), r = mtRuban(t, ep, ch.bouts || "bouton");
    if (devant) F.push({ t: "poly", pts: t, ouvert: true, cls: "t-acier", role: "detour" });
    F.push({ t: "poly", pts: r.pts, cls: "t-acier-plein", piece: MT_NOMS[forme] || "Volutes", role: "fer", axe: t });
    for (const c of r.boutons) F.push({ t: "cercle", c, r: ep * 0.62, cls: "t-acier-plein", piece: "Boutons forgés", role: ch.dore ? "or" : "fer" });
    q.bouts = (q.bouts || 0) + r.forges;
    longueur += r.long;
  }
  const bt = mtBoite(traits), dim = Math.max(bt.x1 - bt.x0, bt.y1 - bt.y0);
  const fab = ch.catalogue ? "achat" : ch.fab === "forge" || dim > MT_ATELIER.achatMax ? "forge" : "achat";
  pieces.push({ nom: MT_NOMS[forme] || "Volute", mat: `Fer plat ${V.b} × ${V.e}`, long: longueur, kgM: mtKgM(V.b, V.e), peri: 2 * (V.b + V.e), coupes: fab === "achat" ? "Achetée, reprise au gabarit" : "Forgée au gabarit", note: ch.bouts === "droit" ? "Bouts coupés droits" : ch.bouts === "effile" ? "Bouts effilés à la forge" : "Bouts effilés et boutonnés", groupe: "Décor", forme, fab, dim: Math.round(dim) });
  if (cat) {
    const e = cat.e, p = pieces[pieces.length - 1], cle = `${e.fournisseur} ${e.ref}`;
    Object.assign(p, { ref: e.ref, fournisseur: e.fournisseur, section: e.section, h: e.h, l: e.l, reprise: Math.round((cat.s - 1) * 1000) / 10, nbAchat: e.nbAchat || 1 });
    if (e.parMetre) p.parMetre = true;
    p.coupes = Math.abs(cat.s - 1) < 0.005 ? "Achetée, posée telle quelle" : `Achetée, reprise au gabarit (${cat.s > 1 ? "+" : ""}${String(p.reprise).replace(".", ",")} %)`;
    q.commandes = q.commandes || {};
    const c = q.commandes[cle] || (q.commandes[cle] = { ref: e.ref, fournisseur: e.fournisseur, forme: e.forme, h: e.h, l: e.l, section: e.section, qte: 0 });
    c.qte += e.nbAchat || 1;
  }
  q.fab = q.fab || { achat: 0, forge: 0 }; q.fab[fab]++;
  q.volutes = q.volutes || {}; q.volutes[forme] = (q.volutes[forme] || 0) + 1;
  q.longueurVolutes = (q.longueurVolutes || 0) + longueur;
  return true;
}
function mtLien(F, pieces, q, ch, r) {
  q.liens = q.liens || [];
  if (q.liens.some((l) => Math.abs(l[0] - r[0]) < 3 && Math.abs(l[1] - r[1]) < 12)) return;
  q.liens.push(r);
  q.soudures = (q.soudures || 0) + 1;
  q.pointsSoudes = (q.pointsSoudes || 0) + 1;
}
function mtLiens(m, cotes, a, c, F, pieces, q, ch, B = MT_ATELIER.barreau, z = null) {
  const pts = m.flat(), H = MT_ATELIER.collier.h, e = MT_ATELIER.epVue + 4;
  const g = pts.reduce((r, p) => (p[0] < r[0] ? p : r)), d = pts.reduce((r, p) => (p[0] > r[0] ? p : r));
  const h = pts.reduce((r, p) => (p[1] > r[1] ? p : r)), b = pts.reduce((r, p) => (p[1] < r[1] ? p : r));
  void z;
  if (cotes.includes("g")) mtLien(F, pieces, q, ch, [a - B - e, g[1] - H / 2, B + 2 * e, H]);
  if (cotes.includes("d")) mtLien(F, pieces, q, ch, [c - e, d[1] - H / 2, B + 2 * e, H]);
  if (cotes.includes("h")) mtLien(F, pieces, q, ch, [h[0] - H / 2, h[1] - e, H, e + 20]);
  if (cotes.includes("b")) mtLien(F, pieces, q, ch, [b[0] - H / 2, b[1] - 20, H, e + 20]);
}
function mtLisse(z, yDessus, F, pieces, ch, nom) {
  const L = MT_ATELIER.lisseFrise, fl = mtFleche(yDessus, z.x0, z.x1);
  if (fl <= 0.5) {
    mtPoly(F, [[z.x0, yDessus(z.x0) - L.b], [z.x1, yDessus(z.x1) - L.b], [z.x1, yDessus(z.x1)], [z.x0, yDessus(z.x0)]], nom, "fer");
    pieces.push({ nom, mat: `Fer plat ${L.b} × ${L.e}`, long: Math.hypot(z.x1 - z.x0, yDessus(z.x1) - yDessus(z.x0)), kgM: mtKgM(L.b, L.e), peri: 2 * (L.b + L.e), coupes: "Percée pour les barreaux", note: "", groupe: "Remplissage" });
    return;
  }
  const n = Math.max(8, Math.ceil((z.x1 - z.x0) / 20)), xs = Array.from({ length: n + 1 }, (_, i) => z.x0 + (z.x1 - z.x0) * i / n);
  mtPoly(F, [...xs.map((x) => [x, yDessus(x) - L.b]), ...xs.slice().reverse().map((x) => [x, yDessus(x)])], nom, "fer");
  pieces.push({ nom, mat: `Fer plat ${L.b} × ${L.e}`, long: mtLongueur(xs.map((x) => [x, yDessus(x) - L.b / 2])), kgM: mtKgM(L.b, L.e), peri: 2 * (L.b + L.e), coupes: `Cintrée (flèche ${Math.round(fl)} mm), percée pour les barreaux`, note: "Cintrée chez le même cintreur que la traverse haute", groupe: "Remplissage", cintree: true });
}
const mtCase = (bas, haut, a, c) => ({ yb: Math.max(bas(a), bas(c)), yh: Math.min(haut(a), haut(c)) });


const MT_ASSEMBLAGES = {
  barreaux: (z, ch, F, pieces, q) => { mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch); },
  entre: (z, ch, F, pieces, q) => {
    if (mtPetite(z, ch)) return mtBande(z, ch, F, pieces, q, false);
    const B = z.barreau || MT_ATELIER.barreau;
    const { cat, lu } = ch.catalogue && !z.lib ? mtRefVidesLuImp(z, ch, "entre", z.x1 - z.x0, B, Math.min(MT_ATELIER.voluteMax, mtHauteurMin(z) - 8), undefined, q) : { cat: null, lu: mtLuAxe(z) };
    const lib = mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : undefined, undefined, undefined, lu);
    if (ch.catalogue && !z.lib && !cat) { mtRefus(q, MT_NOMS[ch.forme], mtSansRef(ch.forme, "entre")); return; }
    const courbe = mtCourbe(z), nL = lu ? lib.length : 0;
    lib.forEach(([a, c], i) => {
      if (mtSaute(ch, i, nL)) return;
      const forme = mtFormeN(ch, i, nL), { yb, yh } = mtCase(z.bas, z.haut, a, c);
      let h = Math.min(MT_ATELIER.voluteMax, yh - yb - 8), traits, k = null;
      if (h < 60 || c - a < 40) return;
      if (ch.catalogue) {
        k = cat && forme === ch.forme ? cat : mtRefDuVide(forme, "entre", c - a, h);
        if (!k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "entre")); return; }
        traits = mtFormeRef(k.e); h = k.e.h * k.s;
      } else traits = mtForme(forme);
      const y = ch.pos === "bas" ? yb + 4 : ch.pos === "milieu" ? (yb + yh - h) / 2 : yh - 4 - h;
      const sens = mtSens(i, nL);
      let m = mtCaser(traits, a + 1, y, c - a - 2, h, ch.pos === "bas" ? "bas" : ch.pos === "milieu" ? "centre" : "haut", sens);
      const crosse = forme === "J" && !k;
      if (crosse) { const bm = mtBoite(m); m = mtDecaler(m, sens ? c - 1 - bm.x1 : a + 1 - bm.x0, 0); }
      if (courbe && ch.pos === "haut") m = mtContreHaut(m, z.haut, 4);
      if (mtVolute(m, forme, F, pieces, q, ch, false, k)) mtLiens(m, crosse ? (sens ? "d" : "g") : "gd", a, c, F, pieces, q, ch, z.barreau, z);
    });
  },
  frise: (z, ch, F, pieces, q) => {
    if (ch.forme === "poste" && Math.abs((z.haut(z.x1) - z.haut(z.x0)) / (z.x1 - z.x0)) > 0.05) {
      ch = { ...ch, forme: "S" }; q.notes = (q.notes || []).concat("Frise de postes impossible sur une rampe : frise de S à la place.");
    }
    const lance = ch.pointes === "lance" && z.pointes, courbe = mtCourbe(z), B = z.barreau || MT_ATELIER.barreau, R = MT_ATELIER.reprise, J = MT_ATELIER.jeuBande;
    if (lance && ch.forme !== "poste") {
      let hF = MT_ATELIER.frise;
      let { cat, lu } = ch.catalogue ? mtRefVidesLu(z, ch.forme, "frise", z.x1 - z.x0, B, hF - 6, undefined, q) : { cat: null, lu: mtLuAxe(z) };
      const e0 = ch.catalogue && !cat ? mtRef(ch.forme, "frise", { hMax: hF - 6, viser: hF - 6 }) : null;
      if (e0) {
        const r2 = mtRefVidesLu(z, ch.forme, "frise", z.x1 - z.x0, B, MT_ATELIER.voluteMax, hF - 6, q, (e) => e.section === e0.e.section);
        if (r2.cat) {
          ({ cat, lu } = r2); hF = Math.ceil(cat.e.h * cat.s) + 6;
          q.notes = (q.notes || []).concat(`Frise portée à ${hF} mm : la pièce de ${MT_ATELIER.frise} mm ne tombe pas juste dans ce panneau.`);
        }
      }
      const lib = mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : undefined, undefined, undefined, lu);
      if (ch.catalogue && !cat) { mtRefus(q, MT_NOMS[ch.forme], mtSansRef(ch.forme, "frise")); return; }
      const yL = (x) => z.haut(x) - hF, nL = lu ? lib.length : 0;
      mtLisse(z, yL, F, pieces, ch, "Lisse de frise");
      lib.forEach(([a, c], i) => {
        if (mtSaute(ch, i, nL)) return;
        const forme = mtFormeN(ch, i, nL), { yb, yh } = mtCase(yL, z.haut, a, c);
        let k = null, m;
        if (ch.catalogue) {
          k = forme === ch.forme ? cat : mtRefDuVide(forme, "frise", c - a, hF - 6);
          if (!k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "frise")); return; }
          m = mtCaser(mtFormeRef(k.e), a + 1, yb + 3, c - a - 2, k.e.h * k.s, "centre", mtDroite(i, nL));
        } else m = mtCaser(mtForme(forme), a + 1, yb + 3, c - a - 2, yh - yb - 6, "centre", mtDroite(i, nL));
        if (courbe || k) m = mtDansBande(m, yL, z.haut, J, J, k ? (1 - R) / k.s : 0.5);
        if (mtVolute(m, forme, F, pieces, q, ch, false, k)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
      });
      return;
    }
    const L = MT_ATELIER.lisseFrise, hz = Math.min(z.haut(z.x0) - z.bas(z.x0), z.haut(z.x1) - z.bas(z.x1));
    const refP = ch.forme === "poste" && ch.catalogue ? mtRefPoste() : null;
    const hF = Math.min(ch.forme === "poste" ? (refP ? refP.h : MT_ATELIER.friseBasse) : MT_ATELIER.frise, hz), plein = hF >= hz - 60;
    const dessusLisse = (x) => (plein ? z.bas(x) : z.haut(x) - hF);
    const lanceP = lance && ch.forme === "poste";
    if (lanceP) mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch);
    if (!plein) mtLisse(z, dessusLisse, F, pieces, ch, "Lisse de frise");
    const hU = Math.min(z.haut(z.x0) - dessusLisse(z.x0), z.haut(z.x1) - dessusLisse(z.x1)) - 6;
    let cat = refP ? { e: refP, s: 1 } : null;
    if (ch.catalogue && ch.forme !== "poste") {
      cat = mtRef(ch.forme, "frise", { hMax: hU, viser: hU });
      if (!cat) {
        mtRefus(q, MT_NOMS[ch.forme], mtSansRef(ch.forme, "frise"));
        if (!plein && !lanceP) mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, 0, z.bas, (x) => dessusLisse(x) - L.b);
        return;
      }
    }
    const catV = cat && !refP, f = catV ? mtFormeRef(cat.e) : mtForme(ch.forme), bb = mtBoite(f), hV = catV ? cat.e.h * cat.s : hU;
    const W = z.x1 - z.x0, axe = (z.x0 + z.x1) / 2, poste = ch.forme === "poste";
    const larg = Math.min(hV * (bb.x1 - bb.x0) / (bb.y1 - bb.y0), poste ? W / 2 : Infinity), pas0 = poste ? larg * 0.74 : larg * 1.25;
    const mP = Math.max(1, Math.round((W / 2 - larg + pas0) / pas0)), pP = mP > 1 ? (W / 2 - larg) / (mP - 1) : 0;
    const lu = mtLuAxe(z), n1 = Math.max(1, Math.round(W / pas0)), n = poste ? 2 * mP : lu ? n1 + (n1 % 2) : n1, nA = lu ? n : 0, bAxe = poste || !lu ? 0 : B, pas = (W - bAxe) / n;
    if (bAxe) mtBarreau(z, axe - B / 2, F, pieces, q, ch, dessusLisse, z.haut);
    for (let i = 0; i < n; i++) {
      const r = poste ? i >> 1 : i, gauche = poste && i % 2 === 1;
      if (poste ? ch.rythme === "unSurDeux" && r % 2 === 1 : mtSaute(ch, i, nA)) continue;
      const forme = poste ? (ch.rythme === "alterne" && r % 2 === 1 && ch.forme2 ? ch.forme2 : ch.forme) : mtFormeN(ch, i, nA);
      let k = cat, fi = f;
      if (forme !== ch.forme) {
        if (ch.catalogue) { k = mtRef(forme, "frise", { hMax: hU, viser: hU }); if (!k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "frise")); continue; } fi = mtFormeRef(k.e); }
        else fi = mtForme(forme);
      }
      const kV = k && k.e.forme !== "poste";
      const a = poste ? (gauche ? axe - r * pP - larg : axe + r * pP) : z.x0 + i * pas + (mtDroite(i, nA) ? bAxe : 0), c = poste ? a + larg : a + pas;
      const { yb, yh } = mtCase(dessusLisse, z.haut, a, c);
      let m = mtCaser(fi, a + 2, yb + 3, c - a - 4, kV ? k.e.h * k.s : yh - yb - 6, poste ? "bas" : "centre", poste ? gauche : mtDroite(i, nA));
      if (courbe) m = ch.forme === "poste" ? mtDansBande(m, dessusLisse, null, J) : mtDansBande(m, dessusLisse, z.haut, J, J, kV ? (1 - R) / k.s : 0.5);
      if (mtVolute(m, forme, F, pieces, q, ch, lanceP, k)) mtLiens(m, ch.forme === "poste" ? "b" : "hb", a, c, F, pieces, q, ch, z.barreau, z);
    }
    if (!plein && !lanceP) mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, 0, z.bas, (x) => dessusLisse(x) - L.b);
  },
  hauteur: (z, ch, F, pieces, q) => {
    if (mtPetite(z, ch)) return mtBande(z, ch, F, pieces, q, true);
    const B = z.barreau || MT_ATELIER.barreau, esc = z.norme && z.norme.escalade;
    const { cat, lu } = ch.catalogue && !esc ? mtRefVidesLuImp(z, ch, "hauteur", z.x1 - z.x0, B, mtHauteurMin(z) - 4, MT_ATELIER.voluteMax, q) : { cat: null, lu: mtLuAxe(z) };
    const f = mtForme(ch.forme), bb = mtBoite(f), r = (bb.y1 - bb.y0) / (bb.x1 - bb.x0);
    let vG = esc ? 0 : z.videGrille || MT_ATELIER.videGrille, nVoulu = 0;
    if (lu && !esc && !cat && !ch.catalogue && !z.lib) {
      const W = z.x1 - z.x0, H = mtHauteurMin(z), n0 = mtCompteBarreaux(z, z.x0, z.x1, vG), nb = n0 % 2 === 0 ? n0 + 1 : n0, v0 = (W - nb * B) / (nb + 1), h1 = (v0 - 2) * r;
      const n = Math.max(1, Math.round(H / h1));
      if (H / n < h1 - 0.5) { vG = (H / n - 2) / r + 2; nVoulu = n; }
    }
    const lib = mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : vG, undefined, undefined, lu);
    if (ch.catalogue && !cat) { mtRefus(q, MT_NOMS[ch.forme], mtSansRef(ch.forme, "hauteur")); return; }
    const nL = lu ? lib.length : 0;
    lib.forEach(([a, c], i) => {
      if (mtSaute(ch, i, nL)) return;
      const cs = mtCase(z.bas, z.haut, a, c), yh = cs.yh, h1 = (c - a - 2) * (bb.y1 - bb.y0) / (bb.x1 - bb.x0);
      const yb = z.norme && z.norme.escalade ? Math.max(cs.yb, Math.max(z.norme.sol(a), z.norme.sol(c)) + 600) : cs.yb;
      if (cat) {
        const k2 = ch.rythme === "alterne" && ch.forme2 !== ch.forme ? mtRefDuVide(ch.forme2, "hauteur", c - a, yh - yb) : null;
        if (ch.rythme === "alterne" && !k2) mtRefus(q, MT_NOMS[ch.forme2], mtSansRef(ch.forme2, "hauteur"));
        const hs = Math.max(cat.e.h * cat.s, k2 ? k2.e.h * k2.s : 0), n = Math.floor((yh - yb) / (hs + 2)), ph = n ? (yh - yb) / n : 0;
        for (let j = 0; j < n; j++) {
          const deux = k2 && mtFormeN(ch, mtSym(i, nL) + j) !== ch.forme, kk = deux ? k2 : cat, fo = deux ? ch.forme2 : ch.forme, hk = kk.e.h * kk.s;
          const m = mtCaser(mtFormeRef(kk.e), a + 1, yb + j * ph + (ph - hk) / 2, c - a - 2, hk, "centre", mtSens(i, nL) !== (j % 2 === 1));
          if (mtVolute(m, fo, F, pieces, q, ch, false, kk)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
        }
        return;
      }
      if (yh - yb < h1 * 0.6) return;
      const n = nVoulu || Math.max(1, Math.round((yh - yb) / h1)), ph = (yh - yb) / n;
      for (let k = 0; k < n; k++) {
        const forme = mtFormeN(ch, mtSym(i, nL) + k);
        const m = mtCaser(forme === ch.forme ? f : mtForme(forme), a + 1, yb + k * ph + 1, c - a - 2, ph - 2, "centre", mtSens(i, nL) !== (k % 2 === 1));
        if (mtVolute(m, forme, F, pieces, q, ch)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
      }
    });
  },
  anneaux: (z, ch, F, pieces, q) => {
    if (mtPetite(z, ch)) {
      const lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, Math.min(z.vide || MT_ATELIER.vide, mtHauteurMin(z)), undefined, undefined, mtLuAxe(z));
      lib.forEach(([a, c], i) => {
        if (mtSaute(ch, i, lib.length)) return;
        const { yb, yh } = mtCase(z.bas, z.haut, a, c), m = mtCaser(mtForme("anneau"), a + 1, yb + 1, c - a - 2, yh - yb - 2);
        if (mtVolute(m, "anneau", F, pieces, q, ch)) mtLiens(m, "gdhb", a, c, F, pieces, q, ch, z.barreau, z);
      });
      return;
    }
    const B = z.barreau || MT_ATELIER.barreau, cat = ch.catalogue ? mtRefVides("anneau", "anneaux", z.x1 - z.x0, B, Infinity, 100) : null;
    const lib = mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : undefined), v = lib[0][1] - lib[0][0], L = MT_ATELIER.lisseFrise;
    if (ch.catalogue && !cat) { mtRefus(q, MT_NOMS.anneau, mtSansRef("anneau", "anneaux")); return; }
    const lu = mtLuAxe(z), pente = (z.haut(z.x1) - z.haut(z.x0)) / (z.x1 - z.x0), rampe = !lu && !cat && !z.lib;
    const yL = rampe ? (x) => z.haut(x) - (v + 2) * Math.hypot(1, pente) : (x) => z.haut(x) - v - 2, courbe = mtCourbe(z);
    mtLisse(z, yL, F, pieces, ch, "Lisse de frise");
    lib.forEach(([a, c], i) => {
      if (mtSaute(ch, i, lib.length)) return;
      const { yb, yh } = mtCase(yL, z.haut, a, c);
      let m = mtCaser(mtForme("anneau"), a + 1, yb + 1, c - a - 2, cat ? cat.e.h * cat.s : rampe ? c - a - 2 : yh - yb - 2);
      if (courbe || cat || rampe) m = mtDansBande(m, yL, z.haut, 1, 1, cat ? (1 - MT_ATELIER.reprise) / cat.s : 0.5);
      if (mtVolute(m, "anneau", F, pieces, q, ch, false, cat)) mtLiens(m, rampe ? "gd" : "gdhb", a, c, F, pieces, q, ch, z.barreau, z);
    });
    void L;
  },
  coeurs: (z, ch, F, pieces, q) => {
    const B = z.barreau || MT_ATELIER.barreau, v0 = z.vide || MT_ATELIER.vide;
    if (!ch.variante) {
      const hz = ch.catalogue ? mtHauteurMin(z) - 10 : 0;
      const viserC = Math.min(hz, 1.4 * (2 * v0 + B));
      const chercher = (f) => {
        let k = mtRefVides("coeur", "coeurs", z.x1 - z.x0, B, hz, viserC, false, f);
        for (let R = MT_ATELIER.reprise + 0.0025; !k && R <= MT_ATELIER.repriseSecours + 1e-9; R += 0.0025) k = mtRefVides("coeur", "coeurs", z.x1 - z.x0, B, hz, viserC, false, f, R);
        return k;
      };
      const fI = mtFiltreImpose(ch, "coeur");
      const cat = ch.catalogue ? (fI && chercher(fI)) || chercher(null) : null;
      if (ch.catalogue && !cat) { mtRefus(q, MT_NOMS.coeur, mtSansRef("coeur", "coeurs")); mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch); return; }
      const fC = mtBoite(mtForme("coeur")), wC = (mtHauteurMin(z) - 10) * (fC.x1 - fC.x0) / (fC.y1 - fC.y0) + 2;
      mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : Math.min(2 * v0 + B, wC)).forEach(([a, c], i, L) => {
        if (mtSaute(ch, i, L.length)) return;
        const cs = mtCase(z.bas, z.haut, a, c), hh = cat ? cat.e.h * cat.s : Math.min(cs.yh - cs.yb - 10, 1.4 * (c - a));
        const m = mtCaser(cat ? mtFormeRef(cat.e) : mtForme("coeur"), a + 1, cs.yb + (cs.yh - cs.yb - hh) / 2, c - a - 2, hh);
        if (mtVolute(m, "coeur", F, pieces, q, ch, false, cat)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
      });
      return;
    }
    const lu = mtLuAxe(z), lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, undefined, undefined, undefined, lu), xs = lib.slice(0, -1).map(([, c]) => c), v = lib[0][1] - lib[0][0];
    const Hc = MT_ATELIER.collier.h, n = xs.length, jeu = 5 + MT_ATELIER.epVue * 0.62 + 1, w = 2 * v + B - 2 * jeu, iAxe = lu ? (n - 1) / 2 : 0;
    xs.forEach((x, i) => {
      if ((i - iAxe) % 2) return;
      const cs = mtCase(z.bas, z.haut, x - v, x + B + v), hh = Math.min(cs.yh - cs.yb - 10, 1.4 * w);
      const m = mtCaser(mtForme("coeur"), x + B / 2 - w / 2, cs.yb + (cs.yh - cs.yb - hh) / 2, w, hh), bm = mtBoite(m);
      mtVolute(m, "coeur", F, pieces, q, ch, true);
      mtLien(F, pieces, q, ch, [x - 4, bm.y0 + 2, B + 8, Hc]); mtLien(F, pieces, q, ch, [x - 4, bm.y1 - (bm.y1 - bm.y0) * 0.18 - Hc / 2, B + 8, Hc]);
    });
  },
  medaillon: (z, ch, F, pieces, q) => {
    const B = z.barreau || MT_ATELIER.barreau, cx = (z.x0 + z.x1) / 2, forme = ch.forme === "J" ? "lyre" : ch.forme;
    const { yb, yh } = mtCase(z.bas, z.haut, cx - 200, cx + 200), H = yh - yb;
    const limM = { hMax: H - 20, lMax: (z.x1 - z.x0) * 0.6, viser: Math.min(0.46 * H, H - 20, 520) }, fM = mtFiltreImpose(ch, forme);
    const k = ch.catalogue ? (fM && mtRef(forme, "medaillon", { ...limM, filtre: fM })) || mtRef(forme, "medaillon", limM) : null;
    if (ch.catalogue && !k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "medaillon")); mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch); return; }
    const f = k ? mtFormeRef(k.e) : mtForme(forme), bb = mtBoite(f);
    let w = Math.min(Math.min(0.46 * H, H - 20, 520) * (bb.x1 - bb.x0) / (bb.y1 - bb.y0), (z.x1 - z.x0) * 0.6), hh = w * (bb.y1 - bb.y0) / (bb.x1 - bb.x0);
    if (k) { hh = k.e.h * k.s; w = hh * (bb.x1 - bb.x0) / (bb.y1 - bb.y0); }
    const y = yb + (H - hh) * 0.62, e = MT_ATELIER.epVue + 4, Hc = MT_ATELIER.collier.h;
    if (z.norme || z.lib) {
      if (mtPetite(z, ch)) {
        const lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, undefined, undefined, undefined, true), v = lib[0][1] - lib[0][0];
        const asp = (bb.y1 - bb.y0) / (bb.x1 - bb.x0), jeu = MT_ATELIER.jeuVoisin + MT_ATELIER.epVue * 0.62 + 1;
        const wP = Math.min((H - 12) / asp, 2 * v + B - 2 * jeu), hP = wP * asp, m = mtCaser(f, cx - wP / 2, yb + (H - hP) / 2, wP, hP), bm = mtBoite(m);
        if (!mtVolute(m, forme, F, pieces, q, ch, true)) return;
        mtLien(F, pieces, q, ch, [cx - B / 2 - 4, bm.y0 + 2, B + 8, Hc]);
        if (bm.y1 - bm.y0 > 40) mtLien(F, pieces, q, ch, [cx - B / 2 - 4, bm.y1 - Hc - 2, B + 8, Hc]);
        return;
      }
      const lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch), xs = lib.slice(0, -1).map(([, c]) => c), pas = lib.length > 1 ? lib[1][0] - lib[0][0] : z.x1 - z.x0;
      const asp = (bb.y1 - bb.y0) / (bb.x1 - bb.x0), wN = k ? w : Math.min(Math.max(w, 2 * pas + 8), (z.x1 - z.x0) * 0.8, (H - 20) / asp), hN = wN * asp, yN = yb + (H - hN) * 0.62;
      const m = mtCaser(f, cx - wN / 2, yN, wN, hN), bm = mtBoite(m);
      if (!mtVolute(m, forme, F, pieces, q, ch, true, k)) return;
      xs.filter((x) => x + B > bm.x0 + 4 && x < bm.x1 - 4).forEach((x) => {
        const pts = m.flat().filter(([px]) => px > x - 2 && px < x + B + 2);
        if (!pts.length) return;
        const ys = pts.map((p) => p[1]); mtLien(F, pieces, q, ch, [x - 4, Math.min(...ys) - 2, B + 8, Hc]); if (Math.max(...ys) - Math.min(...ys) > 60) mtLien(F, pieces, q, ch, [x - 4, Math.max(...ys) - Hc + 2, B + 8, Hc]);
      });
      return;
    }
    mtBarreau(z, cx - B / 2, F, pieces, q, ch);
    mtBarreaux(z, z.x0, cx - w / 2 - 4, F, pieces, q, ch); mtBarreaux(z, cx + w / 2 + 4, z.x1, F, pieces, q, ch);
    const m = mtCaser(f, cx - w / 2, y, w, hh);
    if (!mtVolute(m, forme, F, pieces, q, ch, false, k)) return;
    const bm = mtBoite(m);
    mtLien(F, pieces, q, ch, [cx - B / 2 - e, bm.y0 + 2, B + 2 * e, Hc]);
    mtLien(F, pieces, q, ch, [cx - B / 2 - e, bm.y1 - (bm.y1 - bm.y0) * 0.16 - Hc / 2, B + 2 * e, Hc]);
  },
  applique: (z, ch, F, pieces, q) => {
    const petite = mtPetite(z, ch), B = z.barreau || MT_ATELIER.barreau, deux = !petite && !z.lib && mtCompteBarreaux(z, z.x0, z.x1) === 2;
    const lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, undefined, undefined, undefined, deux), xs = lib.slice(0, -1).map(([, c]) => c);
    if (!xs.length) return;
    const v = lib[0][1] - lib[0][0], f = mtForme(ch.forme), bb = mtBoite(f), pas = petite ? 1 : 3, debut = petite ? 0 : [0, 1, 2].find((d) => (2 * d) % pas === (xs.length - 1) % pas), axe = (z.x0 + z.x1) / 2;
    const nM = Math.floor((xs.length - 1 - debut) / pas) + 1, lu = mtLuAxe(z);
    xs.forEach((x, i) => {
      if ((i - debut) % pas) return;
      const j = (i - debut) / pas, centre = lu && Math.abs(x + B / 2 - axe) < 0.5;
      if (mtSaute(ch, j, nM)) return;
      const forme = centre ? mtFormeAxe(mtFormeN(ch, j, nM)) : mtFormeN(ch, j, nM), { yb, yh } = mtCase(z.bas, z.haut, x - v, x + B + v);
      let fi = forme === ch.forme ? f : mtForme(forme), k = null;
      const bi = forme === ch.forme ? bb : mtBoite(fi);
      let w = petite ? 2 * v + B - 2 * (MT_ATELIER.jeuVoisin + MT_ATELIER.epVue * 0.62 + 1) : 2 * v + B * 1.6, h = Math.min(w * (bi.y1 - bi.y0) / (bi.x1 - bi.x0), yh - yb - (petite ? 12 : 16));
      if (petite) w = Math.min(w, h * (bi.x1 - bi.x0) / (bi.y1 - bi.y0));
      if (ch.catalogue) {
        k = mtRef(forme, "applique", { hMax: yh - yb - 16, viserL: w });
        if (!k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "applique")); return; }
        fi = mtFormeRef(k.e); w = k.e.l * k.s; h = k.e.h * k.s;
      }
      const yc = petite ? (yb + yh) / 2 : Math.min(yb + (yh - yb) * 0.62, yh - h / 2 - 8);
      const m = mtCaser(fi, x + B / 2 - w / 2, yc - h / 2, w, h, "centre", lu && !MT_SYMETRIQUES.includes(forme) && x + B / 2 > axe + 0.5);
      if (!mtVolute(m, forme, F, pieces, q, ch, true, k)) return;
      mtLien(F, pieces, q, ch, [x - 4, yc - 7, B + 8, 14]);
    });
  },
  coins: (z, ch, F, pieces, q) => {
    const B = z.barreau || MT_ATELIER.barreau, lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch), xs = lib.slice(0, -1).map(([, c]) => c);
    const t = MT_ATELIER.coinMax * Math.min(z.x1 - z.x0, mtHauteurMin(z)), Hc = MT_ATELIER.collier.h;
    const k = ch.catalogue ? mtRef(ch.forme, "coins", { hMax: t, lMax: t, viser: t }) : null;
    if (ch.catalogue && !k) { mtRefus(q, MT_NOMS[ch.forme], mtSansRef(ch.forme, "coins")); return; }
    const f = k ? mtFormeRef(k.e) : mtForme(ch.forme), bb = mtBoite(f), sc = Math.min(t / (bb.x1 - bb.x0), t / (bb.y1 - bb.y0));
    const hC = k ? k.e.h * k.s : (bb.y1 - bb.y0) * sc, wC = hC * (bb.x1 - bb.x0) / (bb.y1 - bb.y0);
    for (const droite of [false, true]) {
      const m = mtContreHaut(mtCaser(f, droite ? z.x1 - 2 - wC : z.x0 + 2, z.bas(z.x0), wC, hC, "bas", droite), z.haut, 2);
      if (!mtVolute(m, ch.forme, F, pieces, q, ch, true, k)) continue;
      q.soudures = (q.soudures || 0) + 2; q.pointsSoudes = (q.pointsSoudes || 0) + 2;
      const bm = mtBoite(m);
      xs.filter((x) => x + B > bm.x0 + 4 && x < bm.x1 - 4).forEach((x) => {
        const pts = m.flat().filter(([px]) => px > x - 2 && px < x + B + 2);
        if (pts.length) mtLien(F, pieces, q, ch, [x - 4, Math.min(...pts.map((p) => p[1])) - 2, B + 8, Hc]);
      });
    }
  },
  cimier: (z, ch, F, pieces, q) => {
    mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch);
    const C = z.cimier;
    if (!C || C.y == null) { mtRefus(q, "Couronnement", "Couronnement : la zone ne dit pas où est le dessus de la traverse haute (z.cimier)."); return; }
    const yC = typeof C.y === "function" ? C.y : () => C.y, [hMin, hMax] = MT_ATELIER.cimier, hC = Math.max(hMin, Math.min(hMax, C.h || 220));
    if (C.h && C.h !== hC) q.notes = (q.notes || []).concat(`Couronnement ramené à ${hC} mm (de ${hMin} à ${hMax} mm).`);
    const motif = (fo) => {
      if (!ch.catalogue) { const f = mtForme(fo), b = mtBoite(f); return { f, h: hC, w: hC * (b.x1 - b.x0) / (b.y1 - b.y0), k: null }; }
      const k = mtRef(fo, "cimier", { hMax, viser: hC });
      if (!k) { mtRefus(q, MT_NOMS[fo], mtSansRef(fo, "cimier")); return null; }
      const f = mtFormeRef(k.e), b = mtBoite(f), h = k.e.h * k.s;
      return { f, h, w: h * (b.x1 - b.x0) / (b.y1 - b.y0), k };
    };
    const M1 = motif(ch.forme);
    if (!M1) return;
    const M2 = ch.rythme === "alterne" && ch.forme2 !== ch.forme ? motif(ch.forme2) || M1 : M1;
    const W = z.x1 - z.x0, cx = (z.x0 + z.x1) / 2, wm = Math.max(M1.w, M2.w), g = 0.25 * wm;
    const symetrique = MT_SYMETRIQUES.includes(ch.forme) && (M2 === M1 || MT_SYMETRIQUES.includes(ch.forme2));
    let n = Math.max(1, Math.floor((W + g) / (wm + g))); if (symetrique ? n % 2 === 0 : n % 2 === 1 && n > 1) n--;
    const x0 = cx - (n * wm + (n - 1) * g) / 2;
    let hMaxi = 0, nPose = 0;
    for (let i = 0; i < n; i++) {
      if (mtSaute(ch, i, n)) continue;
      const deux = mtFormeN(ch, i, n) !== ch.forme && M2 !== M1, Mi = deux ? M2 : M1, fo = deux ? ch.forme2 : ch.forme;
      const m0 = mtCaser(Mi.f, x0 + i * (wm + g) + (wm - Mi.w) / 2, 0, Mi.w, Mi.h, "bas", mtDroite(i, n));
      const m = mtDecaler(m0, 0, -mtEcart(m0, yC, 1));
      if (!mtVolute(m, fo, F, pieces, q, ch, false, Mi.k)) continue;
      q.soudures = (q.soudures || 0) + 2; q.pointsSoudes = (q.pointsSoudes || 0) + 2; nPose++;
      hMaxi = Math.max(hMaxi, -mtEcart(m, yC, -1));
    }
    if (nPose) q.cimier = { h: Math.round(hMaxi), n: nPose };
  },
  appliquePlein: (z, ch, F, pieces, q) => {
    if (!z.plein) mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch);
    const P = z.plein ? z : z.soub;
    if (!P) { mtRefus(q, "Soubassement", "Motif sur le soubassement : la zone n'a pas de soubassement plein (z.soub)."); return; }
    const bas = typeof P.bas === "function" ? P.bas : () => P.y0, haut = typeof P.haut === "function" ? P.haut : () => P.haut;
    const W = P.x1 - P.x0, cx = (P.x0 + P.x1) / 2, { yb, yh } = mtCase(bas, haut, P.x0, P.x1), Hs = yh - yb;
    const motif = (fo) => {
      const k = ch.catalogue ? mtRef(fo, "appliquePlein", { hMax: 0.8 * Hs, lMax: 0.45 * W, viser: 0.7 * Hs }) : null;
      if (ch.catalogue && !k) { mtRefus(q, MT_NOMS[fo], mtSansRef(fo, "appliquePlein")); return null; }
      const f = k ? mtFormeRef(k.e) : mtForme(fo), b = mtBoite(f), asp = (b.y1 - b.y0) / (b.x1 - b.x0);
      const h = k ? k.e.h * k.s : Math.min(0.7 * Hs, 0.45 * W * asp);
      return { f, h, w: h / asp, k };
    };
    const M1 = motif(ch.forme);
    if (!M1) return;
    const M2 = ch.rythme === "alterne" && ch.forme2 !== ch.forme ? motif(ch.forme2) || M1 : M1;
    const xs = W >= 3.6 * Math.max(M1.w, M2.w) ? [P.x0 + W / 6, cx, P.x1 - W / 6] : [cx];
    xs.forEach((x, i) => {
      if (mtSaute(ch, i, xs.length)) return;
      const deux = mtFormeN(ch, i, xs.length) !== ch.forme && M2 !== M1, fo0 = deux ? ch.forme2 : ch.forme;
      const surAxe = Math.abs(x - cx) < 0.5 && !MT_SYMETRIQUES.includes(fo0), fo = surAxe ? mtFormeAxe(fo0) : fo0, Mi = surAxe ? motif(fo) || (deux ? M2 : M1) : deux ? M2 : M1;
      const m = mtCaser(Mi.f, x - Mi.w / 2, (yb + yh - Mi.h) / 2, Mi.w, Mi.h, "centre", mtDroite(i, xs.length));
      if (mtVolute(m, fo, F, pieces, q, ch, true, Mi.k)) { q.soudures = (q.soudures || 0) + 4; q.pointsSoudes = (q.pointsSoudes || 0) + 4; }
    });
  },
};


const MT_SOCLE = ["hauteur", "coeurs"];
const MT_VARIANTES = { coeurs: 2 };

function mtChoix(c = {}) {
  const pick = (k, def) => (MT_CHOIX[k].includes(c[k]) ? c[k] : def);
  const assemblage = pick("assemblage", "entre"), avec = MT_AVEC[assemblage];
  const forme = avec.length ? (avec.includes(c.forme) ? c.forme : avec[0]) : null;
  const ch = { assemblage, forme, bouts: pick("bouts", "bouton"), liaison: "soudure", barreaux: pick("barreaux", "carre"), friseBasse: pick("friseBasse", "aucune"), pointes: pick("pointes", "aucune"), dore: c.dore === true, fab: c.fab === "forge" ? "forge" : "achat" };
  ch.pos = pick("pos", "haut"); ch.rythme = pick("rythme", "tous");
  ch.forme2 = avec.length ? (avec.includes(c.forme2) && c.forme2 !== forme ? c.forme2 : avec.find((f) => f !== forme) || forme) : null;
  ch.catalogue = c.catalogue === true;
  ch.refs = c.refs && typeof c.refs === "object" ? c.refs : null;
  return ch;
}
function mtRemplir(z0, choix, F, pieces, q) { return mtRemplirZone(z0, choix, F, pieces, q).ch; }
function mtRemplirZone(z0, choix, F, pieces, q) {
  if (z0.miroir) return mtEnMiroir(z0, F, q, (z) => mtRemplirZone(z, choix, F, pieces, q));
  const ch = mtChoix(choix), Z = { ...z0, bas: typeof z0.bas === "function" ? z0.bas : () => z0.y0 };
  if (Z.catalogue === true) ch.catalogue = true;
  if (Z.norme && MT_PORTAIL_SEUL.includes(ch.assemblage)) {
    const r = `Décor « ${MT_NOMS_PLACEMENT[ch.assemblage]} » réservé aux portails : barreaux droits à la place.`;
    mtRefus(q, MT_NOMS_PLACEMENT[ch.assemblage], r); q.notes = (q.notes || []).concat(r);
    ch.assemblage = "barreaux"; ch.forme = null; ch.forme2 = null;
  }
  if (ch.assemblage === "cimier" && ch.pointes === "lance" && Z.pointes) {
    mtRefus(q, "Pointes de lance", "Pointes de lance retirées : le couronnement prend leur place au-dessus de la traverse haute.");
    ch.pointes = "aucune";
  }
  let z = Z;
  if (ch.friseBasse === "postes" && Z.norme && Z.norme.escalade) {
    ch.friseBasse = "aucune"; q.notes = (q.notes || []).concat("Frise basse retirée : au ras du sol, les vagues feraient des marches (norme NF P01-012).");
  }
  if (ch.friseBasse === "postes") {
    const refP = ch.catalogue ? mtRefPoste() : null, hB = refP ? refP.h : MT_ATELIER.friseBasse, L = MT_ATELIER.lisseFrise.b, dessus = (x) => Z.bas(x) + hB + L;
    if (Math.min(Z.haut(Z.x0) - dessus(Z.x0), Z.haut(Z.x1) - dessus(Z.x1)) > 150) {
      MT_ASSEMBLAGES.frise({ x0: Z.x0, x1: Z.x1, bas: Z.bas, haut: (x) => Z.bas(x) + hB }, { ...ch, forme: "poste", pointes: "aucune", rythme: "tous", stable: !Z.norme }, F, pieces, q);
      mtLisse(Z, dessus, F, pieces, ch, "Lisse de frise basse");
      z = { ...Z, bas: dessus };
    }
  }
  if (Z.norme && Z.norme.escalade && MT_SOCLE.includes(ch.assemblage)) {
    const sol = Z.norme.sol || (() => 0), Lb = MT_ATELIER.lisseFrise.b, bas0 = z.bas, dessus = (x) => Math.max(bas0(x) + 150, sol(x) + 620 + Lb);
    if (Math.min(Z.haut(Z.x0) - dessus(Z.x0), Z.haut(Z.x1) - dessus(Z.x1)) >= 220) {
      mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch, 0, bas0, (x) => dessus(x) - Lb);
      mtLisse(z, dessus, F, pieces, ch, "Lisse du socle");
      z = { ...z, bas: dessus };
    }
  }
  const n0 = F.length, p0 = pieces.length, q0 = JSON.stringify(q);
  for (let variante = 0; ; variante++) {
    MT_ASSEMBLAGES[ch.assemblage](z, { ...ch, variante, stable: !Z.norme }, F, pieces, q);
    delete q.liens;
    if (!Z.norme || Z.norme.controle === false) break;
    const r = mtControleVides(F, Z, Z.norme.sol || (() => 0), Z.norme.pas || 2);
    const marge = Z.norme.marge || 0;
    const res = { ok: r.dBas < 110 - marge && r.dMax < 180 - marge && !r.appui, dBas: r.dBas, dMax: r.dMax, ou: r.ou, appui: r.appui, variante, marge };
    if (res.ok || variante + 1 >= (MT_VARIANTES[ch.assemblage] || 1)) { q.norme = (q.norme || []).concat(res); break; }
    F.length = n0; pieces.length = p0; for (const k of Object.keys(q)) delete q[k]; Object.assign(q, JSON.parse(q0));
  }
  return { ch, z };
}

function mtEnMiroir(z0, F, q, dessiner) {
  const S = z0.x0 + z0.x1, sym = (f) => (typeof f === "function" ? (x) => f(S - x) : f), px = ([x, y]) => [S - x, y];
  const z = { ...z0, miroir: false, bas: sym(z0.bas), haut: sym(z0.haut) };
  if (z0.norme) z.norme = { ...z0.norme, sol: sym(z0.norme.sol) };
  if (z0.cimier) z.cimier = { ...z0.cimier, y: sym(z0.cimier.y) };
  if (z0.soub) z.soub = { ...z0.soub, x0: S - z0.soub.x1, x1: S - z0.soub.x0, bas: sym(z0.soub.bas), haut: sym(z0.soub.haut) };
  const n0 = F.length, nn = (q.norme || []).length, r = dessiner(z);
  for (let i = n0; i < F.length; i++) {
    const p = { ...F[i] };
    if (p.pts) p.pts = p.pts.map(px);
    if (p.axe) p.axe = p.axe.map(px);
    if (p.c) p.c = px(p.c);
    F[i] = p;
  }
  for (const r2 of (q.norme || []).slice(nn)) { if (r2.ou) r2.ou = px(r2.ou); if (r2.appui) r2.appui = px(r2.appui); }
  return r;
}


const mtCleP = (ch) => (ch.assemblage === "entre" ? `entre:${ch.pos}` : ch.assemblage);
const mtVa = (cle, motif) => cle === motif || cle.startsWith(motif + ":");
const mtNomChoix = (ch) => MT_NOMS_PLACEMENT[ch.assemblage] + (ch.assemblage === "entre" ? `, ${MT_NOMS_POS[ch.pos]}` : "");
function mtIncompat(c1, c2) {
  const a = mtCleP(mtChoix(c1)), b = mtCleP(mtChoix(c2));
  if (a === "barreaux" || b === "barreaux") return "";
  if (a === b) return `Le même placement deux fois (${mtNomChoix(mtChoix(c1))}) : choisissez-en un autre.`;
  const r = MT_INCOMPAT.find((x) => (mtVa(a, x.a) && mtVa(b, x.b)) || (mtVa(b, x.a) && mtVa(a, x.b)));
  return r ? r.raison : "";
}
function mtHautLibre(z, ch, lib) {
  const L = MT_ATELIER.lisseFrise.b;
  if (ch.assemblage === "frise") {
    const poste = ch.forme === "poste" && Math.abs((z.haut(z.x1) - z.haut(z.x0)) / (z.x1 - z.x0)) <= 0.05;
    if (ch.pointes === "lance" && z.pointes && !poste) return (x) => z.haut(x) - MT_ATELIER.frise - L;
    const hz = Math.min(z.haut(z.x0) - z.bas(z.x0), z.haut(z.x1) - z.bas(z.x1));
    const hF = Math.min(poste ? (ch.catalogue ? mtRefPoste().h : MT_ATELIER.friseBasse) : MT_ATELIER.frise, hz);
    return hF >= hz - 60 ? null : (x) => z.haut(x) - hF - L;
  }
  if (ch.assemblage === "anneaux") { const v = lib[0][1] - lib[0][0]; return (x) => z.haut(x) - v - 2 - L; }
  return z.haut;
}
function mtBoitesDecor(F, i0, i1) {
  const r = [];
  for (let i = i0; i < i1; i++) {
    const p = F[i];
    if (p.role !== "fer" || !p.axe) continue;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of p.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    r.push({ x0, x1, y0, y1 });
  }
  return r;
}
const mtChevauche = (A, B, tol = 0.5) => A.some((a) => B.some((b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > tol && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > tol));
function mtRemplirPlusieurs(z0, liste, F, pieces, q) {
  if (z0.miroir) return mtEnMiroir(z0, F, q, (z) => mtRemplirPlusieurs(z, liste, F, pieces, q));
  let L = (Array.isArray(liste) ? liste : [liste]).filter(Boolean);
  if (L.length > 2) { mtRefus(q, "Placements", `${L.length} placements demandés : deux au plus, les deux premiers sont gardés.`); L = L.slice(0, 2); }
  if (L.length === 2) { const a = mtChoix(L[0]).assemblage, b = mtChoix(L[1]).assemblage; if (b === "barreaux") L = [L[0]]; else if (a === "barreaux") L = [L[1]]; }
  if (L.length < 2) return [mtRemplir(z0, L[0] || {}, F, pieces, q)];
  const c0 = mtChoix(L[0]), c1 = mtChoix(L[1]), raison = mtIncompat(c0, c1);
  if (raison) { mtRefus(q, mtNomChoix(c1), raison); return [mtRemplir(z0, L[0], F, pieces, q)]; }
  const iB = MT_RANG[c0.assemblage] <= MT_RANG[c1.assemblage] ? 0 : 1, cB = { ...L[iB] }, chS = mtChoix(L[1 - iB]);
  if (L.some((x) => x.friseBasse === "postes")) cB.friseBasse = "postes";
  if (L.some((x) => x.pointes === "lance")) cB.pointes = "lance";
  if (L.some((x) => x.catalogue === true)) cB.catalogue = true;
  if (chS.assemblage === "cimier" && cB.pointes === "lance" && z0.pointes) {
    mtRefus(q, "Pointes de lance", "Pointes de lance retirées : le couronnement prend leur place au-dessus de la traverse haute.");
    cB.pointes = "aucune";
  }
  const n0 = F.length, { ch: chB, z } = mtRemplirZone(z0, cB, F, pieces, q);
  if (z0.norme && MT_PORTAIL_SEUL.includes(chS.assemblage)) { mtRefus(q, mtNomChoix(chS), `Décor « ${mtNomChoix(chS)} » réservé aux portails.`); return [chB]; }
  const n1 = F.length, p1 = pieces.length, q1 = JSON.stringify(q), B = z.barreau || MT_ATELIER.barreau;
  const xs = [...new Set(F.slice(n0, n1).filter((p) => p.piece === "Barreaux" && p.t === "poly" && p.role === "fer").map((p) => Math.round(Math.min(...p.pts.map((pt) => pt[0])) * 1000) / 1000))].sort((a, b) => a - b);
  const lib = xs.length ? [[z.x0, xs[0]], ...xs.slice(1).map((x, i) => [xs[i] + B, x]), [xs[xs.length - 1] + B, z.x1]] : [[z.x0, z.x1]];
  const haut = mtHautLibre(z, chB, lib);
  if (!haut) { mtRefus(q, mtNomChoix(chS), `Pas de place pour « ${mtNomChoix(chS)} » : la frise prend toute la hauteur du panneau.`); return [chB]; }
  Object.assign(chS, { catalogue: chS.catalogue || chB.catalogue, friseBasse: "aucune", pointes: chB.pointes });
  MT_ASSEMBLAGES[chS.assemblage]({ ...z, haut, lib }, { ...chS, variante: 0, stable: !z0.norme }, F, pieces, q);
  delete q.liens;
  if (mtChevauche(mtBoitesDecor(F, n0, n1), mtBoitesDecor(F, n1, F.length))) {
    F.length = n1; pieces.length = p1; for (const k of Object.keys(q)) delete q[k]; Object.assign(q, JSON.parse(q1));
    mtRefus(q, mtNomChoix(chS), `« ${mtNomChoix(chS)} » et « ${mtNomChoix(chB)} » se chevauchent à ces cotes : le second placement est retiré.`);
    return [chB];
  }
  if (z0.norme && z0.norme.controle !== false) {
    const Z = { ...z0, bas: typeof z0.bas === "function" ? z0.bas : () => z0.y0 }, r = mtControleVides(F, Z, Z.norme.sol || (() => 0), Z.norme.pas || 2), marge = Z.norme.marge || 0;
    q.norme = (q.norme || []).concat({ ok: r.dBas < 110 - marge && r.dMax < 180 - marge && !r.appui, dBas: r.dBas, dMax: r.dMax, ou: r.ou, appui: r.appui, variante: 0, marge, plusieurs: true });
  }
  return [chB, chS];
}


function mtEdt1(f, d, n, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    const fq = f[q] + q * q;
    let s = (fq - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = (fq - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const e = q - v[k]; d[q] = e * e + f[v[k]]; }
}
function mtControleVides(F, z, sol = () => 0, pas = 2) {
  const bas = typeof z.bas === "function" ? z.bas : () => z.y0;
  let a = Infinity, b = -Infinity;
  for (let k = 0; k <= 20; k++) { const x = z.x0 + (z.x1 - z.x0) * k / 20; a = Math.min(a, bas(x)); b = Math.max(b, z.haut(x)); }
  const G = { x0: z.x0, y0: a, pas, nx: Math.ceil((z.x1 - z.x0) / pas) + 1, ny: Math.ceil((b - a) / pas) + 1 };
  G.plein = new Uint8Array(G.nx * G.ny);
  const cB = new Float64Array(G.nx), cH = new Float64Array(G.nx), cS = new Float64Array(G.nx);
  for (let i = 0; i < G.nx; i++) { const x = G.x0 + i * pas; cB[i] = bas(x); cH[i] = z.haut(x); cS[i] = sol(x); }
  mtGrilleCadre(G, cB, cH);
  for (const p of F) {
    if (p.role === "vrille" || p.role === "detour" || p.role === "marche") continue;
    if (p.t === "cercle") mtGrilleTrait(G, [p.c, p.c], p.r);
    else if (p.axe) mtGrilleTrait(G, p.axe, MT_ATELIER.volute.e / 2);
    else if (p.t === "poly" && !p.ouvert) mtGrillePoly(G, p.pts);
  }
  const D = mtGrilleDistance(G), r = mtGrilleMax(G, D, cS);
  r.appui = z.norme && z.norme.escalade ? mtGrilleAppui(G, cS) : null;
  return r;
}
function mtGrilleCadre(G, cB, cH) {
  const { nx, ny, plein, y0, pas } = G;
  for (let j = 0, o = 0; j < ny; j++, o += nx) {
    const y = y0 + j * pas;
    for (let i = 0; i < nx; i++) if (i === 0 || i === nx - 1 || y <= cB[i] || y >= cH[i]) plein[o + i] = 1;
  }
}
function mtGrillePoly(G, pts) {
  const { nx, ny, plein, x0, y0, pas } = G, n = pts.length;
  let ya = Infinity, yb = -Infinity; for (let k = 0; k < n; k++) { ya = Math.min(ya, pts[k][1]); yb = Math.max(yb, pts[k][1]); }
  const j0 = Math.max(0, Math.floor((ya - y0) / pas)), j1 = Math.min(ny - 1, Math.ceil((yb - y0) / pas)), xs = [];
  for (let j = j0; j <= j1; j++) {
    const y = y0 + j * pas; xs.length = 0;
    for (let k = 0; k < n; k++) { const p = pts[k], q = pts[(k + 1) % n]; if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) xs.push(p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0])); }
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2) { const ia = Math.max(0, Math.ceil((xs[k] - x0) / pas)), ib = Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / pas)); for (let i = ia; i <= ib; i++) plein[j * nx + i] = 1; }
  }
}
function mtGrilleTrait(G, pts, r) {
  const { nx, ny, plein, x0, y0, pas } = G, r2 = r * r;
  for (let k = 0; k + 1 < pts.length || k === 0; k++) {
    const A = pts[k], Bp = pts[Math.min(k + 1, pts.length - 1)], ax = A[0], ay = A[1], dx = Bp[0] - ax, dy = Bp[1] - ay, L2 = dx * dx + dy * dy || 1;
    const ia = Math.max(0, Math.floor((Math.min(ax, Bp[0]) - r - x0) / pas)), ib = Math.min(nx - 1, Math.ceil((Math.max(ax, Bp[0]) + r - x0) / pas));
    const ja = Math.max(0, Math.floor((Math.min(ay, Bp[1]) - r - y0) / pas)), jb = Math.min(ny - 1, Math.ceil((Math.max(ay, Bp[1]) + r - y0) / pas));
    for (let j = ja; j <= jb; j++) {
      const py = y0 + j * pas;
      for (let i = ia; i <= ib; i++) {
        const px = x0 + i * pas; let t = ((px - ax) * dx + (py - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - ax - t * dx, ey = py - ay - t * dy; if (ex * ex + ey * ey <= r2) plein[j * nx + i] = 1;
      }
    }
    if (pts.length < 2) break;
  }
}
function mtGrilleDistance(G) {
  const { nx, ny, plein } = G, INF = 1e12, D = new Float64Array(nx * ny), m = Math.max(nx, ny);
  const fb = new Float64Array(m), db = new Float64Array(m), vb = new Int32Array(m), zb = new Float64Array(m + 1);
  for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) fb[j] = plein[j * nx + i] ? 0 : INF; mtEdt1(fb, db, ny, vb, zb); for (let j = 0; j < ny; j++) D[j * nx + i] = db[j]; }
  for (let j = 0, o = 0; j < ny; j++, o += nx) { for (let i = 0; i < nx; i++) fb[i] = D[o + i]; mtEdt1(fb, db, nx, vb, zb); for (let i = 0; i < nx; i++) D[o + i] = db[i]; }
  return D;
}
function mtGrilleMax(G, D, cS) {
  const { nx, ny, x0, y0, pas } = G;
  let dMax = 0, dBas = 0, ou = null;
  for (let j = 0, o = 0; j < ny; j++, o += nx) {
    const y = y0 + j * pas;
    for (let i = 0; i < nx; i++) {
      const r2 = D[o + i]; if (!r2) continue;
      const r = Math.sqrt(r2) * pas, d = 2 * r - pas;
      if (d > dMax) dMax = d;
      if (d > dBas && y - r - cS[i] < 800) { dBas = d; ou = [x0 + i * pas, y]; }
    }
  }
  return { dMax, dBas, ou };
}
function mtGrilleAppui(G, cS) {
  const { nx, ny, plein, x0, y0, pas } = G, Gc = new Int32Array(nx * ny), Dc = new Int32Array(nx * ny);
  for (let j = 0, o = 0; j < ny; j++, o += nx) {
    for (let i = 0; i < nx; i++) Gc[o + i] = plein[o + i] ? 0 : (i ? Gc[o + i - 1] : 0) + 1;
    for (let i = nx - 1; i >= 0; i--) Dc[o + i] = plein[o + i] ? 0 : (i < nx - 1 ? Dc[o + i + 1] : 0) + 1;
  }
  const k55 = Math.ceil(6 * 1.43 / pas) + 1, nl = Math.round(50 / pas), d3 = Math.max(1, Math.round(6 / pas));
  const portant = (i, j) => { for (let k = 1; k <= k55; k++) if (j - k >= 0 && plein[(j - k) * nx + i]) return true; return false; };
  for (let j = 1; j < ny - nl; j++) for (let i = d3; i < nx - d3; i++) {
    if (plein[j * nx + i] || !plein[(j - 1) * nx + i]) continue;
    const hS = y0 + j * pas - cS[i]; if (hS < 100 || hS > 600) continue;
    if (!portant(i - d3, j) || !portant(i + d3, j)) continue;
    let tient = true;
    for (let r = 1; r <= nl && tient; r++) { const dw = 50 * (1 - Math.abs(r * pas - 25) / 25) / pas, c = (j + r) * nx + i; if (Gc[c] - 1 < dw || Dc[c] - 1 < dw) tient = false; }
    if (tient) return [x0 + i * pas, y0 + j * pas];
  }
  return null;
}


// Plans de fabrication des portails : battant (1 ou 2 vantaux), coulissant (sur rail ou autoportant), pliant, portillon.
// Étude du 06/10/2026 avec Quentin : https://claude.ai/artifact/RvJQFroNvsu5kDhivWKu5r
//   - 4 modèles pour couvrir toutes les entrées (place derrière → battant ; place sur le côté → coulissant ; ni l'un ni
//     l'autre → pliant ; piétons → portillon) ;
//   - le portail se COMPOSE par blocs (décision de Quentin, 06/10) : forme du haut, soubassement, remplissage, décor,
//     matière, couleur. Les « styles » (Plein, Barreaux, Lames chêne, Rosace, Volutes) ne sont que des compositions toutes
//     faites (PT_STYLES) ;
//   - surtout de l'alu (Quentin soude l'alu au TIG) ; Rosace et Volutes en acier (rosaces en fonte, volutes ACHETÉES :
//     rien n'est forgé à l'atelier) ;
//   - moteur en option, posé par Quentin ; poteaux acier ou alu en option.
//
// GAUCHE / DROITE : TOUJOURS VU DE LA RUE, face au portail (ptSens, ptCourant, les trois vues). Chaque vue le rappelle en
// texte (primitive texte marquée convention: true). On n'écrit jamais « vu de la propriété ».
//
// calculerPortail(v, modele) rend la MÊME structure R que calculerGC de l'outil (plans-atelier.html) :
//   R.vues.face / cote / dessus : primitives { t: "poly" | "cercle" | "cote" | "texte" | "sol" } dessinées par dessiner() ;
//   R.debit : { nom, qte, mat, long, coupes, note } (les pièces identiques sont regroupées) ;
//   R.alertes (rouge, bloque le devis), R.avertissements (orange, à confirmer), R.oks (vert), R.notes (gris) ;
//   R.resume : [[libellé, valeur]] ; R.poids, R.dims, R.quant (mètres par profilé, surfaces, achats), R.grandeCote ;
//   R.jeux : { gonds, centre, serrure, auxGonds, course: [{ vantail, min, angle, auxGonds }], reglage } (jeux au dessin,
//     plus petit jeu côté gonds sur toute la course, jeu au droit de la platine des gonds, plage de réglage des gonds
//     sur chantier qui garde tous les jeux) ; R.visite : les relevés de la visite (null = non relevé) et ce qui manque ;
//   R.quant.gonds / poteau / massif / roues / butee / plots / finition : ce que le moteur a choisi dans les tables
//     PT_GONDS, PT_POTEAUX, PT_ROUES et PT_ATELIER (des cotes et des références, AUCUN prix).
//
// Module SANS DOM, fonctions pures, AUCUN PRIX (il pourra servir de moteur public au site).
// Tous les noms de premier niveau commencent par « pt » ou « PT_ » : aucun nom en commun avec l'outil ni les autres modules.
//   - collé dans l'IIFE de plans-atelier.html : calculerPortail(v, "ptBattant") ;
//   - chargé seul : node plans/tests/banc.mjs --seul modules/plans-portails.js ; test : node plans/tests/plans-portails.test.mjs
//
// Entrées (v), toutes facultatives (valeurs de départ entre parenthèses) :
//   ptP passage entre poteaux (3500 ; portillon 1000), ptH hauteur au poteau (1600), ptGS garde au sol (selon le modèle ;
//     coulissant sur rail : sous la roue retenue et son support, jamais moins),
//   ptVantaux "2" | "1" (battant), ptRep "egal" | "tiers" (2 vantaux inégaux), ptGuidage "rail" | "auto" (coulissant),
//   ptSens "gauche" | "droite" (vu de la rue : côté où s'ouvre le coulissant, côté des gonds du vantail seul, ou côté du
//     grand vantail des 2 vantaux inégaux),
//   ptMat "alu" | "acier", ptForme "droit" | "chapeau" | "creux" | "biais", ptFleche (150),
//   ptSoub "aucun" | "plein" | "lames" | "barreaux" (soubassement), ptHSoub hauteur du soubassement depuis le sol (500),
//   ptRemp "plein" | "lames" | "lamesAlu" | "barreaux" | "croix" | "volutes" (remplissage au-dessus),
//   ptPointes (barreaux qui dépassent, pointes de lance), ptLisse (lisse en chêne sur le dessus),
//   ptPoteaux "existants" | "acier" | "alu", ptMoteur (true/false), ptMoteurModele (lot 4 : "ixengo" | "axovia" | "elixo" ;
//     absent = le moteur conseillé par PT_MOTEURS), ptPente (mm de montée côté propriété, battant),
//   ptCouleur (texte, sans effet sur le plan), trait (scie, 3).
//   ptStyle (facultatif) : "plein" | "barreaux" | "lamesChene" | "rosace" | "volutes" remplit les blocs non donnés.
//   ptDecor (lot 3, 07/10/2026) : "aucun" | une formule de PT_DECOR_FORMULES ("classique", "frise", "medaillon",
//     "couronnement", "coeurs", "surMesure") | "perso" (ptDecorChoix : 1 ou 2 placements motifs.js, tableau ou JSON) ;
//     finitions ptBouts "droit" | "effile" | "bouton", ptBarreauxDeco "carre" | "torsade" | "bagues" (liaison toujours
//     soudée : pas de colliers, décision de Quentin du 07/10/2026), ptMiroir (vantail droit en miroir, oui par défaut). Le décor vient de la bibliothèque de styles
//     (modules/motifs.js, chargée AVANT ce module), en mode catalogue : la référence achetée exacte est dessinée et l'écart
//     des barreaux est réglé sur elle. Un décor impose l'acier. ptRemp "volutes" (ancien) se lit comme la formule « frise ».
//
// Entrées de la VISITE (outil seulement, toutes facultatives). AUCUNE valeur par défaut : une entrée absente reste
// null (« non relevée »), produit une note, et le moteur ne suppose rien à sa place.
//   ptSupport "beton" | "parpaing" | "brique" | "tuffeau" | "inconnu" (matière des piliers),
//   ptPilierEtat "sain" | "fissure" | "nonArme" | "inconnu", ptPilierL largeur des piliers (mm, vue de la rue),
//   ptClairHaut, ptClairMilieu, ptClairBas : le clair entre piliers mesuré à 3 hauteurs ; le PLUS PETIT donne P,
//   ptAplombG, ptAplombD (écart d'aplomb du pilier gauche, du pilier droit, vus de la rue, mm ; ptAplomb, l'ancienne
//     entrée unique, reste lue), ptDenivele (différence de niveau entre les piliers, mm ;
//     positif : le pilier droit est plus haut, vu de la rue), ptGondBord (de l'axe du gond à l'arête côté propriété, mm),
//   ptRecoin (du gond au premier obstacle le long du mur, mm), ptVent "abrite" | "expose" | "tres",
//   ptSeuil "neuf" | "existant" (rail), ptCloture "pleine" | "ajouree" | "aucune" (le long du refoulement),
//   ptReseaux (texte : réseaux repérés, date de la réponse DT-DICT), ptAcces "oui" | "non" (le camion arrive au portail),
//   ptCourant "gauche" | "droite" | "aucun" | "inconnu" (pilier où arrive le courant, vu de la rue ; "nsp" = "inconnu").
// Un relevé illisible ou ambigu (« 3.470 » : millier ou mètres ?) ou hors de 0 à 20 000 mm reste null : rien n'est deviné.

/* ---------- Réglages d'atelier : valeurs de départ, À CONFIRMER par Quentin ---------- */

const PT_ATELIER = {
  // Jeux : décisions de Quentin : 25 au centre (06/10/2026) ; 35 mm côté gonds (07/10/2026, au lieu de 30 : la platine du
  // gond, 10 mm vissés sur le nu, est dans le jeu, et il reste ainsi 25 mm à son droit). Un jour entre 8 et 25 mm pince
  // les doigts (zone de danger 3 des notices Somfy Ixengo) : on reste au-dessus de 25.
  //   vantaux = (P − 2 × jeuGonds − jeuCentre) / 2, P = le plus petit clair relevé ; le demi-millimètre restant va au
  //   centre (P = 3 500 → 1 702 + 1 702, 26 au centre).
  jeuGonds: 35,              // entre le nu du pilier (ou du poteau) et le montant côté gonds, AU DESSIN
  jeuGondsMin: 25,           // contrôlé sur toute la course (de fermé à ouvert au maximum) : alerte en dessous
  jeuCentre: 25,             // entre les deux vantaux
  // Vantail seul et portillon, côté serrure : 25 mm, décision de Quentin du 07/10/2026. Il faut être ≥ 25 ou ≤ 8 ; 8 mm
  // laisserait le pêne et la gâche sans réglage possible (piliers rarement d'aplomb), donc 25, comme le centre.
  jeuSerrure: 25,
  zonePincement: [8, 25],    // jour interdit (mm), bornes exclues
  jeuPli: 12,                // pliant : entre les deux panneaux d'un même côté (dans la zone 8-25 : voir l'avertissement)
  // Marge sous le point le plus bas d'un vantail (cahier §1 : pente et dénivelé absorbés jusqu'à garde au sol − 15).
  margeSol: 15,
  // Gonds : axe à 65 mm du nu du pilier, à 90 mm au moins de l'arête côté propriété (sinon le pilier éclate au perçage) ;
  // 2 par vantail (3 si H > 1 800) à garde au sol + 200 et à 200 sous le haut du vantail ; gond haut axe vers le bas
  // (anti-dégondage), 1 à 3 mm de jeu vertical ; gond à visser sur platine 100 × 100 (épaisseur platineEp), 4 trous à 65,
  // la platine vissée sur le nu du pilier, dans le jeu.
  //   plageNu : la plage de RÉGLAGE du gond sur chantier (55 à 68). Régler l'axe déplace le vantail : le moteur calcule la
  //   partie de cette plage qui garde tous les jeux (R.jeux.reglage) et l'écrit sur le plan pour le poseur.
  //   axeDerriere : l'axe est derrière la face arrière (côté propriété) du montant côté gonds, de quoi loger le gond femelle
  //   (Ø 36) et la tige M20 sans entrer dans le montant. HYPOTHÈSE DE L'ATELIER (axeReleve: false), à recaler sur la
  //   notice du gond retenu, comme l'épaisseur de la platine.
  gonds: { axeNu: 65, plageNu: [55, 68], areteMin: 90, axeDerriere: 20, axeReleve: false, bas: 200, haut: 200, troisAuDela: 1800, ouverture: 90, platine: 100, platineEp: 10, entraxe: 65, jeuVertical: [1, 3], femelleD: 36 },
  // Butée centrale BASSE (la butée de 77 mm au milieu du passage est retirée : on trébuche dessus). Viser 40 mm au-dessus
  // du sol fini (référence à relever). Un sabot vissé sous la traverse basse de chaque vantail descend la chercher (un par
  // vantail, chacun doit buter : décision de Quentin du 07/10/2026) : recouvrement
  // de 25 mm, donc le bas du sabot est à 15 mm du sol. l × p : encombrement au dessin (référence à relever).
  // Motorisé : selon la notice du moteur, sans basculeur.
  butee: { h: 40, recouvrement: 25, l: 100, p: 60, sabot: 40 },
  // Vantail seul et portillon : butée de fermeture côté serrure, côté rue (ou gâche à butée) : le vantail ne passe pas
  // vers la rue. Encombrement au dessin (référence à relever).
  buteeFermeture: { recouvre: 15, ep: 10, h: 60 },
  // Arrêts de vantail ouvert : sur plots de béton 250 × 250 × 400, à 200 mm du bout du vantail.
  plotArret: { l: 250, p: 250, h: 400, aBout: 200 },
  // Garde au sol (valeur de l'atelier). Coulissant sur rail : 70 au moins, et jamais moins que la roue retenue + son
  // support (roueSupport : hauteur du support sous la traverse basse, à relever sur la notice de la roue).
  gardeSol: { battant: 50, portillon: 50, pliant: 50, rail: 70, auto: 60 },
  roueSupport: 15,
  recouvrement: { guide: 100, reception: 60 },   // coulissant : derrière le poteau guide, dans la réception
  queueAuto: 0.45, queueMini: 1200, queuePas: 50,   // autoportant : la queue fait 45 % du passage (kits du commerce : 40 à 50 %)
  // Autoportant (en attendant le tableau Comunello, lot 4) : massif sous la queue = queue + 300, depuis la face extérieure
  // du pilier ; 1er chariot à 200 mm du pilier (cahier §2.4), 2e à 100 mm du bout de la queue.
  chariots: { aPilier: 200, aBout: 100, massifEnPlus: 300 },
  traverseInter: 40,         // traverse entre soubassement et remplissage
  panneauMax: 1800,          // au-delà, un montant intermédiaire coupe le vantail en panneaux
  panneauMaxLames: 1300,     // lames de chêne : appui tous les 1,30 m au plus
  videMax: 110,              // vide entre barreaux : habitude du garde-corps (boule de 110), pas une norme du portail
  // Décor (motifs.js) : vide visé entre barreaux hors référence (comme le garde-corps : 105, sous la boule de 110) ;
  // hauteur du couronnement au-dessus de la traverse haute (motifs.js la ramène entre 150 et 300).
  decor: { vide: 105, cimier: 200 },
  lameChene: { h: 120, ep: 27, jour: 15 },
  lameAlu: { h: 100, ep: 20, jour: 20 },          // lames alu ajourées
  croixCellule: 850,         // largeur visée d'une case à croix (comme le garde-corps)
  rosaceD: 100,              // rosace de l'atelier, Ø 100 (garde-corps)
  frise: 220,                // hauteur de la frise de volutes
  pointe: { depasse: 110, h: 70 },               // barreaux qui dépassent au-dessus de la traverse haute
  // Lisse en chêne 70 × 45 posée sur la traverse haute : elle déborde DEVANT ET DERRIÈRE le cadre (70 pour 40), jamais au
  // bout du vantail (elle mangerait les jeux côté gonds, au centre et côté serrure).
  lisse: { h: 45, l: 70 },
  // Piliers existants dont la largeur ou la profondeur n'est pas relevée : dessinés à 300 mm, pour le dessin seulement.
  pilierDessin: 300,
  // Poteau à sceller : 500 mm dans le massif (400 au moins). Massif carré de côté = section du poteau + 2 × 150 (420 pour un
  // poteau de 120, 450 pour 150), 600 de profondeur (hors gel dans le 49), cage d'armature 10 × 10, trou de drainage Ø 5
  // au ras du béton, semelle commune conseillée. Variante : poteau sur platine 200 × 200 × 10, 4 tiges M16.
  scellement: 500, scellementMin: 400,
  massif: { marge: 150, prof: 600, cage: "10 × 10", drainage: 5, semelleCommune: true },
  platinePoteau: { cote: 200, ep: 10, tiges: 4, d: 16 },
  // Pièces qui vont chez le galvaniseur (acier), chez le laqueur (tout) et sur la remorque.
  //   transportMax : décision de Quentin du 07/10/2026 (« pièces jusqu'à 6 m ») : les bornes des passages sont choisies pour
  //   qu'aucun vantail ne dépasse (coulissant : 5 900 + 2 × 40 de débord = 5 980 mm) ; l'alerte reste un filet, sans jamais
  //   dire « sur étude » (Quentin, 10/10/2026 : c'est l'atelier qui trouve la solution, jamais le client). cuveGalva (longueur × largeur × profondeur) et fourLaquage (longueur × hauteur) : valeurs courantes, À
  //   CONFIRMER chez le galvaniseur et le laqueur (releve: false) : au-delà, seulement un avertissement (rien n'est bloqué
  //   sur une valeur non relevée).
  finition: { cuveGalva: { L: 6000, l: 1500, h: 2500, releve: false }, fourLaquage: { L: 7000, h: 2200, releve: false }, transportMax: 6000, transportReleve: true },
  bornes: {
    // Pliant : 2 400 à 5 000 mm de PASSAGE TOTAL. Incohérence à lever : le kit FAC KC7101 donne sa largeur « A » de 2,00 à
    // 5,00 m, et l'étude ne dit pas si A est un côté (2 panneaux) ou le passage total. Si A est un côté, le pliant irait
    // de 4 000 à 10 000 mm de passage et presque tous ceux d'ici sortiraient du tableau FAC. Bornes gardées en passage
    // total jusqu'à la relecture de la notice FAC (le cahier ne tranche pas) : d'ici là, tout pliant porte l'avertissement
    // « à confirmer » (pas de pliant en ligne avant cette relecture).
    // Coulissant : 5 840 mm au plus, pour que le vantail (passage + 100 mm derrière le poteau guide + 60 mm dans la réception)
    // tienne dans la remorque de 6 m d'un seul tenant (Quentin, 10/10/2026 : à 5 950, le site disait « en deux parties, sur
    // étude » — jamais ça). Sans rail (autoportant), la queue de contrepoids compte aussi : 4 000 mm au plus (le site le dit sur la fiche).
    P: { battant: [2000, 5000], coulissant: [2000, 5840], pliant: [2400, 5000], portillon: [700, 1400] },
    PAutoportant: [2000, 4000],
    H: [800, 2200],
    fleche: [0, 400],
  },
  vantailMax: { alu: 2500, acier: 2500 },        // largeur d'un vantail battant (acier relevé de 2 200 à 2 500 le 10/10/2026, décision de Quentin : un battant acier de 5 000 mm se commande ; l'étude du moteur ne trouve aucun autre blocage)
  flecheMaxRatio: 0.25,
};

// Les gonds : choisis selon le poids du vantail (pliant : les 2 panneaux d'un côté). TABLE DE L'ATELIER, À VALIDER PAR
// QUENTIN : seul le gond M20 sur platine 100 × 100 (4 trous à 65) vient du cahier ; les autres références et toutes les
// charges admissibles PAR PAIRE sont des propositions prudentes, à relever sur la notice de chaque gond (releve: false :
// le débit écrit « référence à relever »). Au-delà du plus fort : sur étude. Sur l'alu : gonds en inox à visser sur un
// renfort, avec rondelles isolantes (pas d'acier contre l'alu). La clé de prix de chaque gond (cle) se relie dans le
// chiffrage (lot 7) : aucun nom de tarif ici.
const PT_GONDS = [
  { cle: "aluInoxM20", mat: "alu", ref: "Gond réglable inox A4 à visser, tige M20, platine 100 × 100 (4 trous à 65), rondelles isolantes", chargePaire: 120, inox: true, releve: false },
  { cle: "aluInoxM24", mat: "alu", ref: "Gond réglable inox A4 à visser, tige M24, platine 100 × 100 (4 trous à 65), rondelles isolantes", chargePaire: 200, inox: true, releve: false },
  { cle: "acierM20", mat: "acier", ref: "Gond réglable à visser, tige M20, platine 100 × 100 (4 trous à 65), gond femelle soudé avant galvanisation", chargePaire: 250, inox: false, releve: false },
  { cle: "acierAxe40", mat: "acier", ref: "Gond réglable à visser, axe Ø 40, réglage M27, platine 100 × 100 (4 trous à 65), gond femelle soudé avant galvanisation", chargePaire: 400, inox: false, releve: false },
];

// Les poteaux vendus en option : section selon la largeur et le poids du vantail qu'ils portent, et la hauteur. Tableau de
// l'atelier À VALIDER PAR QUENTIN. Hors tableau : sur étude (alerte). « pour » : les modèles qui peuvent le prendre (le
// poteau d'un coulissant porte le guide haut : jamais moins de 120). kgMax selon la matière du POTEAU.
const PT_POTEAUX = [
  { cle: "p100", profil: "poteauPetit", b: 100, pour: ["portillon"], lMax: 1200, kgMax: { alu: 60, acier: 80 }, hMax: 2000 },
  { cle: "p120", profil: "poteau", b: 120, pour: ["battant", "portillon", "pliant", "coulissant"], lMax: 2500, kgMax: { alu: 150, acier: 250 }, hMax: 2200 },
];

// Les roues du coulissant sur rail (2 roues) : choisies selon le poids du portail. Au-delà de 410 kg : sur étude.
const PT_ROUES = [
  { cle: "r80", d: 80, rail: 16, kgMax: 250 },
  { cle: "r100", d: 100, rail: 16, kgMax: 380 },
  { cle: "r120", d: 120, rail: 20, kgMax: 410 },
];

// Les profilés : section (b = face vue de la rue, e = épaisseur du portail), épaisseur de paroi (ep) ou plein.
// Les moteurs (lot 4, décision de Quentin du 06/10/2026 : « Somfy partout »). AUCUN PRIX ici (clés de prix dans
// chiffrage-portails.js). Fiches relevées le 07/10/2026 (packs « Confort » : moteurs, armoire, 2 télécommandes Keygo io,
// cellules, feu avec antenne, batterie de secours) ; tout ce que la fiche ne dit pas reste « selon la notice, à relever ».
//   kgVantail : [largeur de vantail jusqu'à (mm), kg au plus] ; surfaceVent : m² pleins par vantail au plus selon le vent
//   (abrité, exposé, très exposé) ; recoinMin : place derrière le gond, le long du mur ; facilite : critères de la jauge
//   (cahier §6.2 : on part de 10 et on retire) ; garantie en années.
const PT_MOTEURS = [
  { cle: "ixengo", nom: "Somfy Ixengo L 3S+ io", ref: "Pack Confort, réf. 1246485", pour: ["battant"], principe: "Deux vérins à vis sans fin sur le pilier",
    kgVantail: [[2600, 400], [3000, 300], [4000, 170]], surfaceVent: { abrite: 4, expose: 3, tres: 2 }, recoinMin: 160, gondBordMax: 250,
    contenu: "2 vérins, armoire 3S+ io, 2 télécommandes, cellules, feu avec antenne, batterie de secours, pattes de pilier réglables",
    garantie: 5, criteres: [], releve: true },
  { cle: "axovia", nom: "Somfy Axovia MultiPro 3S+ io", ref: "Pack Confort", pour: ["battant"], principe: "Deux bras articulés, pour les gros piliers ou un gond loin du bord",
    kgVantail: [[3500, 300]], surfaceVent: null, recoinMin: 500, gondBordMax: null,
    contenu: "2 moteurs à bras, armoire 3S+ io, 2 télécommandes, cellules, feu avec antenne, batterie de secours",
    garantie: 5, criteres: ["bras"], releve: false },
  { cle: "elixo", nom: "Somfy Elixo 3S+ M io", ref: "Pack Confort, réf. 1246489", pour: ["coulissant"], principe: "Moteur à crémaillère au sol, côté où le portail se range",
    kgMax: 600, longueurMax: 8000, contenu: "Moteur avec armoire intégrée, 2 télécommandes, cellules, feu avec antenne, batterie de secours (crémaillère à part)",
    garantie: 5, criteres: [], releve: true },
];
// La jauge « Facilité de pose » (cahier §6.2) : on part de 10 et on retire selon les critères du kit.
const PT_FACILITE = { pattes: 1, batterie: 1, butee: 1, finsDeCourse: 1, bras: 2, caisson: 4, special: 6 };
const ptFacilite = (m) => 10 - m.criteres.reduce((s, k) => s + (PT_FACILITE[k] || 0), 0);

const PT_MATIERES = {
  alu: {
    nom: "Aluminium", densite: 2.7, finition: "Thermolaquage",
    cadre: { b: 80, e: 40, ep: 2, nom: "Tube alu 80 × 40 × 2" },
    fort: { b: 80, e: 40, ep: 3, nom: "Tube alu 80 × 40 × 3" },           // montant côté gonds, traverse basse du coulissant
    inter: { b: 40, e: 40, ep: 2, nom: "Tube alu 40 × 40 × 2" },          // traverse et montants intermédiaires
    barreau: { b: 25, e: 25, ep: 2, nom: "Tube alu 25 × 25 × 2" },
    croix: { b: 25, e: 25, ep: 2, nom: "Tube alu 25 × 25 × 2" },
    volute: { b: 20, e: 6, plein: true, nom: "Plat alu 20 × 6" },
    plein: { type: "lames", h: 150, ep: 20, kgM: 1.4, nom: "Lame alu pleine 150 × 20 à emboîter" },
    poteau: { b: 120, e: 120, ep: 4, nom: "Tube alu 120 × 120 × 4" },
    poteauPetit: { b: 100, e: 100, ep: 3, nom: "Tube alu 100 × 100 × 3" },
  },
  acier: {
    nom: "Acier", densite: 7.85, finition: "Galvanisation à chaud + peinture",
    cadre: { b: 60, e: 40, ep: 2, nom: "Tube acier 60 × 40 × 2" },
    fort: { b: 60, e: 60, ep: 3, nom: "Tube acier 60 × 60 × 3" },
    inter: { b: 40, e: 40, ep: 2, nom: "Tube acier 40 × 40 × 2" },
    barreau: { b: 16, e: 16, plein: true, nom: "Carré acier plein 16 × 16" },
    croix: { b: 16, e: 16, plein: true, nom: "Carré acier plein 16 × 16" },
    volute: { b: 20, e: 6, plein: true, nom: "Fer plat 20 × 6" },
    plein: { type: "tole", ep: 2, nom: "Tôle acier 2 mm" },
    poteau: { b: 120, e: 120, ep: 4, nom: "Tube acier 120 × 120 × 4" },
    poteauPetit: { b: 100, e: 100, ep: 3, nom: "Tube acier 100 × 100 × 3" },
  },
};
const PT_CHENE = { nom: "Lame chêne 120 × 27", kgM: 0.12 * 0.027 * 700 };

// Les compositions toutes faites (« styles » de l'étude). Un bloc donné dans v passe avant le style.
const PT_STYLES = {
  plein: { nom: "Plein", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "plein", ptPointes: false, ptLisse: false },
  // Panneau composite alu déjà laqué : moins cher que les lames (décision de Quentin, 06/10 : « les deux, au choix »).
  lisse: { nom: "Lisse", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "panneau", ptPointes: false, ptLisse: false },
  barreaux: { nom: "Barreaux", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "barreaux", ptPointes: false, ptLisse: false },
  lamesChene: { nom: "Lames chêne", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "lames", ptPointes: false, ptLisse: false },
  rosace: { nom: "Rosace", ptMat: "acier", ptForme: "droit", ptSoub: "plein", ptHSoub: 600, ptRemp: "croix", ptPointes: false, ptLisse: true },
  // Volutes : barreaux + la formule de décor « frise » (lot 3 : le décor vient de motifs.js, références du catalogue).
  volutes: { nom: "Volutes", ptMat: "acier", ptForme: "chapeau", ptFleche: 200, ptSoub: "plein", ptHSoub: 550, ptRemp: "barreaux", ptDecor: "frise", ptPointes: true, ptLisse: false },
};

// Les formules de décor (cahier §1.5, décision de Quentin du 06/10/2026 : « 6 décors dessinés + Personnaliser ») : chacune
// est une liste de placements motifs.js (2 au plus). « Sur mesure » n'est pas dessiné : prix sur devis.
const PT_DECOR_FORMULES = {
  classique: { nom: "Classique", ligne: "Volutes en C entre les barreaux, en haut", choix: [{ assemblage: "entre", forme: "C", pos: "haut" }] },
  frise: { nom: "Frise", ligne: "Frise de volutes en S sous la traverse haute", choix: [{ assemblage: "frise", forme: "S" }] },
  medaillon: { nom: "Médaillon", ligne: "Un double C au centre de chaque vantail", choix: [{ assemblage: "medaillon", forme: "doubleC" }] },
  couronnement: { nom: "Couronnement", ligne: "Volutes en S et en C au-dessus de la traverse haute", choix: [{ assemblage: "cimier", forme: "S", rythme: "alterne", forme2: "C" }] },
  coeurs: { nom: "Cœurs", ligne: "Un cœur entre les barreaux", choix: [{ assemblage: "coeurs", forme: "coeur" }] },
  surMesure: { nom: "Sur mesure", ligne: "Votre motif d'après une photo : dessiné par nous, prix sur devis", choix: [] },
};
// Les choix d'un placement « Personnaliser » (motifs.js : MT_CHOIX et MT_AVEC) ; « barreaux » seul n'est pas un décor.
function ptDecorPerso(x) {
  let L = x;
  if (typeof L === "string") { try { L = JSON.parse(L); } catch (e) { L = null; } }
  if (!Array.isArray(L)) return [];
  const ok = (val, liste, def) => (liste.includes(val) ? val : def);
  return L.filter((ch) => ch && MT_CHOIX.assemblage.includes(ch.assemblage) && ch.assemblage !== "barreaux").slice(0, 2).map((ch) => {
    const formes = MT_AVEC[ch.assemblage] || [];
    const r = { assemblage: ch.assemblage, forme: ok(ch.forme, formes, formes[0]), pos: ok(ch.pos, MT_CHOIX.pos, "haut"), rythme: ok(ch.rythme, MT_CHOIX.rythme, "tous") };
    if (r.rythme === "alterne") r.forme2 = ok(ch.forme2, formes, formes[1] || formes[0]);
    return r;
  });
}

// Les moulures (09/10/2026, décision de Quentin) : un médaillon ovale du commerce, au centre du bas plein de chaque vantail,
// VISSÉ PAR DERRIÈRE (trous taraudés M5-M6 du motif, vis inox depuis la propriété : rien ne se voit de la rue ; jamais de
// collier). Fonte zinguée sur l'acier, alu moulé sur l'alu. Le plus grand qui tient est choisi (60 % de la largeur du
// vantail, 70 % de la hauteur du bas). Ici les tailles seulement : les prix sont dans le chiffrage (privé).
const PT_MOULURES = {
  acier: [{ id: "f400", l: 400, h: 200, nom: "Médaillon ovale en fonte zinguée 400 × 200" }, { id: "f250", l: 250, h: 100, nom: "Médaillon ovale en fonte zinguée 250 × 100" }],
  alu: [{ id: "a400", l: 400, h: 200, nom: "Médaillon ovale en alu moulé 400 × 200" }, { id: "a340", l: 340, h: 170, nom: "Médaillon ovale en alu moulé 340 × 170" }],
};

const PT_MODELES = {
  ptBattant: { type: "battant", nom: "Portail battant" },
  ptCoulissant: { type: "coulissant", nom: "Portail coulissant" },
  ptPliant: { type: "pliant", nom: "Portail pliant" },
  ptPortillon: { type: "portillon", nom: "Portillon" },
};

const PT_FINE = " ";
const ptMm = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, PT_FINE);
const ptKg = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
const ptM = (x) => (Math.round(x * 100) / 100).toFixed(2).replace(".", ",");
const ptRect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const ptChoix = (x, liste, def) => (liste.includes(x) ? x : def);
// Les espaces (y compris insécables et fines : « 3 470 ») sont retirés avant de lire le nombre.
const ptNombre = (x, def) => { const n = parseFloat(String(x ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : def; };
const ptBool = (x, def) => (x === undefined || x === null || x === "" ? def : x === true || x === "1" || x === 1 || x === "true");
// Relevés de la visite : jamais de valeur par défaut. Absent ou illisible → null (« non relevé »).
// Lecture STRICTE : le nombre entier seul (« 1 20 » → 120, « 12abc » → null) ; « 3.470 » ou « 3,470 » (millier ou mètres ?)
// est ambigu → null ; au-delà de PT_RELEVE_MAX mm → null.
const PT_RELEVE_MAX = 20000;
function ptReleve(x) {
  if (typeof x === "number") return Number.isFinite(x) && Math.abs(x) <= PT_RELEVE_MAX ? Math.round(x) : null;
  const s = String(x ?? "").replace(/\s/g, "");
  if (!/^[+-]?\d+([.,]\d+)?$/.test(s) || /^[+-]?\d{1,3}[.,]\d{3}$/.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && Math.abs(n) <= PT_RELEVE_MAX ? Math.round(n) : null;
}
const ptRelevePositif = (x) => { const n = ptReleve(x); return n !== null && n > 0 ? n : null; };
const ptReleveChoix = (x, liste, alias = {}) => { const s = alias[x] !== undefined ? alias[x] : x; return liste.includes(s) ? s : null; };

/** Poids au mètre d'un profilé (kg/m) et son périmètre (mm, pour la surface à laquer). */
function ptKgM(pr, densite) {
  if (pr.kgM) return pr.kgM;
  const aire = pr.plein ? pr.b * pr.e : 2 * (pr.b + pr.e) * pr.ep - 4 * pr.ep * pr.ep;
  return aire * densite * 1e-3;
}
const ptPerimetre = (pr) => (pr.type === "lames" ? 2 * pr.h : 2 * (pr.b + (pr.e || pr.ep || 0)));

/* ---------- 1. Les entrées : modèle, style et blocs ---------- */

function ptEntrees(v, modele) {
  v = v || {};
  const M = PT_MODELES[modele] || PT_MODELES.ptBattant;
  const st = PT_STYLES[v.ptStyle] || null;
  const pick = (k, def) => (v[k] !== undefined && v[k] !== null && v[k] !== "" ? v[k] : st && st[k] !== undefined ? st[k] : def);
  const type = M.type;
  const c = { modele: PT_MODELES[modele] ? modele : "ptBattant", type, nomModele: M.nom, style: st ? v.ptStyle : null };
  c.visite = ptVisite(v);
  const clairs = [c.visite.clairHaut, c.visite.clairMilieu, c.visite.clairBas].filter((x) => x !== null);
  c.Pdonne = Math.round(ptNombre(v.ptP, type === "portillon" ? 1000 : 3500));
  // Le plus petit clair relevé donne le passage ; sans clair relevé, on garde ptP (ou la cote de départ du configurateur).
  c.P = clairs.length ? Math.min(...clairs) : c.Pdonne;
  c.Psource = clairs.length ? "clairs" : "ptP";
  c.H = Math.round(ptNombre(v.ptH, type === "portillon" ? 1600 : 1600));
  c.nbV = type === "battant" ? (String(v.ptVantaux) === "1" ? 1 : 2) : type === "portillon" ? 1 : type === "pliant" ? 2 : 1;
  c.rep = ptChoix(v.ptRep, ["egal", "tiers"], "egal");
  c.guidage = ptChoix(v.ptGuidage, ["rail", "auto"], "rail");
  c.sens = ptChoix(v.ptSens, ["gauche", "droite"], "gauche");
  c.mat = ptChoix(pick("ptMat", "alu"), ["alu", "acier"], "alu");
  c.M = PT_MATIERES[c.mat];
  c.forme = ptChoix(pick("ptForme", "droit"), ["droit", "chapeau", "creux", "biais"], "droit");
  c.fleche = c.forme === "droit" ? 0 : Math.round(ptNombre(pick("ptFleche", 150), 150));
  c.soub = ptChoix(pick("ptSoub", "aucun"), ["aucun", "plein", "panneau", "lames", "barreaux"], "aucun");
  c.hSoub = Math.round(ptNombre(pick("ptHSoub", 500), 500));
  c.remp = ptChoix(pick("ptRemp", "plein"), ["plein", "panneau", "lames", "lamesAlu", "barreaux", "croix", "volutes"], "plein");
  // Le décor (lot 3) : une formule, ou « perso » (1 ou 2 placements). L'ancien remplissage « volutes » = la formule « frise ».
  const dec = pick("ptDecor", "aucun");
  c.decor = PT_DECOR_FORMULES[dec] || dec === "perso" ? dec : "aucun";
  if (c.remp === "volutes") { c.remp = "barreaux"; if (c.decor === "aucun") c.decor = "frise"; }
  c.decorChoix = c.decor === "perso" ? ptDecorPerso(v.ptDecorChoix) : c.decor !== "aucun" ? PT_DECOR_FORMULES[c.decor].choix.map((x) => ({ ...x })) : [];
  if (c.decor === "perso" && !c.decorChoix.length) c.decor = "aucun";
  // Liaison TOUJOURS soudée : décision de Quentin du 07/10/2026 (« je sais pas faire tout ce qui est collier… c'est
  // uniquement soudure, on propose pas ») : aucun collier, ni dessiné, ni acheté, ni proposé.
  c.decorFin = { bouts: ptChoix(v.ptBouts, ["droit", "effile", "bouton"], "effile"), liaison: "soudure", barreaux: ptChoix(v.ptBarreauxDeco, ["carre", "torsade", "bagues"], "carre") };
  c.decorMiroir = ptBool(v.ptMiroir, true);
  c.decorNotes = [];
  if (c.decor !== "aucun") {
    // Le décor est en fer forgé : il impose l'acier, et il prend la place du remplissage du haut (barreaux + motifs).
    if (c.mat !== "acier") c.decorNotes.push("Le décor en fer forgé impose l'acier : le portail passe en acier.");
    c.mat = "acier"; c.M = PT_MATIERES.acier;
    if (c.remp !== "barreaux") c.decorNotes.push("Le décor se pose entre des barreaux : le remplissage du haut devient « barreaux ».");
    c.remp = "barreaux";
  }
  c.pointes = ptBool(pick("ptPointes", false), false) && ["barreaux", "volutes"].includes(c.remp);
  if (c.pointes && c.decorChoix.some((x) => x.assemblage === "cimier")) { c.pointes = false; c.decorNotes.push("Pas de pointes de lance sous un couronnement : retirées."); }
  c.lisse = ptBool(pick("ptLisse", false), false);
  // Les moulures : seulement sur un bas plein (tôle ou panneau).
  c.mouluresDemandees = ptBool(v.ptMoulure, false);
  c.moulure = c.mouluresDemandees && (c.soub === "plein" || c.soub === "panneau");
  c.poteaux = ptChoix(v.ptPoteaux, ["existants", "acier", "alu"], "existants");
  c.moteur = ptBool(v.ptMoteur, false);
  c.moteurModele = PT_MOTEURS.some((m) => m.cle === v.ptMoteurModele) ? v.ptMoteurModele : null;
  c.pente = Math.max(0, Math.round(ptNombre(v.ptPente, 0)));
  c.couleur = v.ptCouleur || (c.mat === "alu" ? "Gris anthracite (RAL 7016)" : "Noir");
  c.trait = ptNombre(v.trait, 3);
  const cleGS = type === "coulissant" ? c.guidage : type;
  c.gsDonne = v.ptGS !== undefined && v.ptGS !== null && v.ptGS !== "";
  c.gs = Math.round(ptNombre(v.ptGS, PT_ATELIER.gardeSol[cleGS]));
  return c;
}

/** Les relevés de la visite (outil seulement) : chacun vaut null tant qu'il n'est pas relevé. */
function ptVisite(v) {
  const reseaux = v.ptReseaux === undefined || v.ptReseaux === null ? "" : String(v.ptReseaux).trim().slice(0, 300);
  const recoin = ptReleve(v.ptRecoin), abs = (x) => (x === null ? null : Math.abs(x));
  // Aplomb relevé pilier par pilier (vus de la rue) ; l'ancienne entrée unique ptAplomb reste lue pour les deux.
  const aplombG = abs(ptReleve(v.ptAplombG)), aplombD = abs(ptReleve(v.ptAplombD)), aplombUn = abs(ptReleve(v.ptAplomb));
  const parPilier = [aplombG, aplombD].filter((x) => x !== null);
  return {
    support: ptReleveChoix(v.ptSupport, ["beton", "parpaing", "brique", "tuffeau", "inconnu"], { "béton": "beton" }),
    pilierEtat: ptReleveChoix(v.ptPilierEtat, ["sain", "fissure", "nonArme", "inconnu"], { "fissuré": "fissure", "non armé": "nonArme", nonarme: "nonArme" }),
    pilierL: ptRelevePositif(v.ptPilierL),
    clairHaut: ptRelevePositif(v.ptClairHaut), clairMilieu: ptRelevePositif(v.ptClairMilieu), clairBas: ptRelevePositif(v.ptClairBas),
    aplombG, aplombD,
    aplomb: parPilier.length ? Math.max(...parPilier) : aplombUn,   // le plus grand des deux
    denivele: ptReleve(v.ptDenivele),
    gondBord: ptRelevePositif(v.ptGondBord),
    recoin: recoin !== null && recoin >= 0 ? recoin : null,
    vent: ptReleveChoix(v.ptVent, ["abrite", "expose", "tres"], { "abrité": "abrite", "exposé": "expose", "très": "tres" }),
    seuil: ptReleveChoix(v.ptSeuil, ["neuf", "existant"]),
    cloture: ptReleveChoix(v.ptCloture, ["pleine", "ajouree", "aucune"], { "ajourée": "ajouree" }),
    reseaux: reseaux || null,
    acces: ptReleveChoix(v.ptAcces === true ? "oui" : v.ptAcces === false ? "non" : v.ptAcces, ["oui", "non"]),
    courant: ptReleveChoix(v.ptCourant, ["gauche", "droite", "aucun", "inconnu"], { nsp: "inconnu" }),
  };
}

// Les relevés utiles à ce portail, avec leur libellé (pour la note « non relevé »).
const PT_VISITE_NOMS = {
  clairs: "clairs entre piliers (haut, milieu, bas)", aplombG: "aplomb du pilier gauche", aplombD: "aplomb du pilier droit", denivele: "différence de niveau entre les piliers",
  vent: "exposition au vent", acces: "accès du camion", reseaux: "réseaux enterrés (DT-DICT)", support: "matière des piliers",
  pilierEtat: "état des piliers", pilierL: "largeur des piliers", gondBord: "axe du gond à l'arête", recoin: "recoin derrière le gond",
  seuil: "seuil du rail (neuf ou existant)", cloture: "clôture le long du refoulement", courant: "pilier où arrive le courant",
};
function ptVisiteManque(c) {
  const V = c.visite, piliers = c.poteaux === "existants", gonds = c.type !== "coulissant";
  const utiles = ["clairs", "denivele", "vent", "acces", "reseaux"];
  // Aplomb pilier par pilier (vus de la rue), sauf si l'ancienne entrée unique ptAplomb est donnée.
  if (!(V.aplomb !== null && V.aplombG === null && V.aplombD === null)) utiles.push("aplombG", "aplombD");
  if (piliers) utiles.push("support", "pilierEtat", "pilierL");
  if (piliers && gonds) utiles.push("gondBord");
  if (gonds) utiles.push("recoin");
  if (c.type === "coulissant") { if (c.guidage === "rail") utiles.push("seuil"); utiles.push("cloture"); }
  if (c.moteur && c.type !== "portillon") utiles.push("courant");   // le portillon n'a jamais de moteur
  return utiles.filter((k) => (k === "clairs" ? V.clairHaut === null && V.clairMilieu === null && V.clairBas === null : V[k] === null));
}

/* ---------- 2. Les vantaux : où est chaque panneau, sur quel axe il tourne ou glisse ---------- */

function ptVantaux(c) {
  const R = PT_ATELIER, P = c.P;
  if (c.type === "battant" && c.nbV === 2) {
    // vantaux = (P − 2 × jeuGonds − jeuCentre) / 2, au mm près ; le demi-millimètre restant va au centre (jamais sous 25).
    // 2 vantaux inégaux : le PETIT sert de passage piéton (serrure, poignées), le GRAND est semi-fixe (verrou au sol) ;
    // ptSens dit de quel côté est le grand vantail, vu de la rue (à gauche par défaut). Égaux : serrure à gauche.
    const utile = P - 2 * R.jeuGonds - R.jeuCentre, tiers = c.rep === "tiers";
    const grand = tiers ? Math.round(utile * 2 / 3) : Math.floor(utile / 2), petit = tiers ? utile - grand : grand;
    const grandAGauche = !tiers || c.sens !== "droite";
    const w1 = grandAGauche ? grand : petit, w2 = grandAGauche ? petit : grand;
    const a = R.jeuGonds, b = a + w1, d = P - R.jeuGonds, e = d - w2;
    return [
      { nom: tiers ? (grandAGauche ? "Grand vantail" : "Petit vantail") : "Vantail gauche", x0: a, x1: b, gonds: "gauche", serrure: !tiers || !grandAGauche, verrou: tiers && grandAGauche },
      { nom: tiers ? (grandAGauche ? "Petit vantail" : "Grand vantail") : "Vantail droit", x0: e, x1: d, gonds: "droite", serrure: tiers && grandAGauche, verrou: !tiers || !grandAGauche },
    ];
  }
  if (c.type === "battant" || c.type === "portillon") {
    const gauche = c.sens === "gauche";
    const x0 = gauche ? R.jeuGonds : R.jeuSerrure, x1 = P - (gauche ? R.jeuSerrure : R.jeuGonds);
    return [{ nom: c.type === "portillon" ? "Portillon" : "Vantail", x0, x1, gonds: c.sens, serrure: true }];
  }
  if (c.type === "pliant") {
    // Même formule par côté, puis 2 panneaux égaux au mm près ; les millimètres restants vont au centre.
    const p = Math.floor((Math.floor((P - 2 * R.jeuGonds - R.jeuCentre) / 2) - R.jeuPli) / 2), utile = 2 * p + R.jeuPli;
    const a = R.jeuGonds, d = P - R.jeuGonds;
    return [
      { nom: "Panneau gauche, côté poteau", x0: a, x1: a + p, gonds: "gauche", pli: "droite" },
      { nom: "Panneau gauche, côté centre", x0: a + p + R.jeuPli, x1: a + utile, pli: "gauche" },
      { nom: "Panneau droit, côté centre", x0: d - utile, x1: d - utile + p, pli: "droite" },
      { nom: "Panneau droit, côté poteau", x0: d - p, x1: d, gonds: "droite", pli: "gauche" },
    ];
  }
  // Coulissant : une seule pièce qui déborde derrière le poteau guide et entre dans la réception.
  const rg = R.recouvrement.guide, rr = R.recouvrement.reception;
  return c.sens === "gauche"
    ? [{ nom: "Portail coulissant", x0: -rg, x1: P + rr, coulissant: true }]
    : [{ nom: "Portail coulissant", x0: -rr, x1: P + rg, coulissant: true }];
}

/** La ligne du haut du portail, sur toute sa longueur visible : y(x). Le sommet (chapeau, biais) ou le creux est en xm :
 *  au milieu, ou entre les deux vantaux s'ils sont inégaux. */
function ptLigneHaut(c, a, b, xm = (a + b) / 2) {
  const base = c.gs + c.H, f = c.fleche;
  if (c.forme === "droit" || f <= 0) return () => base;
  if (c.forme === "biais") {
    if (c.nbV === 2 || c.type === "pliant") return (x) => base + f * (x <= xm ? (x - a) / (xm - a) : (b - x) / (b - xm));
    const versDroite = c.sens === "gauche";
    return (x) => base + f * (versDroite ? (x - a) / (b - a) : (b - x) / (b - a));
  }
  // Deux arcs de cercle de même flèche, tangents à l'horizontale au sommet (un seul arc si xm est au milieu).
  const creux = (x) => { const demi = x <= xm ? xm - a : b - xm, Rr = (demi * demi + f * f) / (2 * f); return Rr - Math.sqrt(Math.max(0, Rr * Rr - (x - xm) * (x - xm))); };
  return c.forme === "chapeau" ? (x) => base + f - creux(x) : (x) => base - f + creux(x);
}

const ptCourbe = (fn, a, b, n = 24) => { const pts = []; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts.push([x, fn(x)]); } return pts; };
const ptLongueur = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/* ---------- 3. Le dessin d'un vantail : cadre, panneaux, soubassement, remplissage ---------- */

// Une pièce du débit : { nom, mat, long, kgM, peri, coupes, note, groupe }.
function ptPiece(pieces, nom, pr, long, densite, coupes, note, groupe = "Cadre") {
  pieces.push({ nom, mat: pr.nom, long, kgM: ptKgM(pr, densite), peri: ptPerimetre(pr), coupes, note: note || "", groupe });
}

// Le nom d'une pièce de remplissage : « Barreau du haut », « Barreau » (zone sans nom : jamais d'espace en trop).
const ptNomZ = (base, z, suite) => [base, z.nomZone].filter(Boolean).join(" ") + (suite ? `, ${suite}` : "");

// Remplit une zone { x0, x1, y0, haut(x) } avec un remplissage. Rend les primitives et ajoute les pièces.
function ptRemplir(c, z, remp, F, pieces, q, ctx) {
  if (z.decor) return ptDecorZone(c, z, F, pieces, q);
  const RG = PT_ATELIER, M = c.M, d = M.densite, w = z.x1 - z.x0;
  const hautMin = Math.min(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2));
  const contour = () => [[z.x0, z.y0], [z.x1, z.y0], ...ptCourbe(z.haut, z.x1, z.x0, 16)];
  const courbe = c.forme !== "droit" && !z.plat;
  if (remp === "panneau" && M === PT_MATIERES.alu) {
    // Panneau composite alu laqué (4 mm), tenu par des parcloses alu 20 × 20 vissées tout autour, des deux côtés.
    F.push({ t: "poly", piece: "Panneau lisse", cls: "t-mur t-panneau", pts: contour() });
    const h = (z.haut(z.x0) + z.haut(z.x1)) / 2 - z.y0, aire = w * h / 1e6;
    pieces.push({ nom: ptNomZ("Panneau", z), mat: "Panneau composite alu 4 mm laqué", long: w, larg: hautMin - z.y0, aire, kgM: 0, kg: aire * 5.5, peri: 0, coupes: courbe ? "Découpé à la forme du haut" : "Rectangle", note: "Laqué 2 faces, film retiré à la pose", groupe: "Remplissage", tole: true, panneau: true });
    ptPiece(pieces, ptNomZ("Parclose", z), { nom: "Cornière alu 20 × 20 × 2", b: 20, e: 20, ep: 2 }, 2 * 2 * (w + h), d, "Coupes droites, vissée", "Deux côtés, tout autour", "Remplissage");
    return;
  }
  if (remp === "plein" || remp === "panneau") {
    if (M.plein.type === "tole") {
      F.push({ t: "poly", piece: "Tôle de remplissage", cls: "t-mur t-panneau", pts: contour() });
      const aire = (w * ((z.haut(z.x0) + z.haut(z.x1)) / 2 - z.y0)) / 1e6;
      pieces.push({ nom: ptNomZ("Tôle", z), mat: M.plein.nom, long: w, larg: hautMin - z.y0, aire, kgM: 0, kg: aire * M.plein.ep * d, peri: 0, coupes: courbe ? "Découpée à la forme du haut" : "Rectangle", note: "", groupe: "Remplissage", tole: true });
      q.soudureM += 2 * (w + hautMin - z.y0) / 1000 * 0.25;   // points de soudure espacés : un quart du tour
    } else {
      F.push({ t: "poly", piece: "Lames de remplissage", cls: "t-mur t-panneau", pts: contour() });
      const n = Math.ceil((hautMin - z.y0) / M.plein.h);
      for (let i = 1; i < n; i++) { const y = z.y0 + i * M.plein.h; F.push({ t: "poly", cls: "t-acier t-joint", ouvert: true, pts: [[z.x0, y], [z.x1, y]] }); }
      const nCoupe = courbe ? Math.ceil((Math.max(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2)) - z.y0) / M.plein.h) - n + 1 : 0;
      for (let i = 0; i < n - (nCoupe ? 1 : 0); i++) ptPiece(pieces, ptNomZ("Lame pleine", z), M.plein, w, d, "Coupe droite, emboîtée", "", "Remplissage");
      for (let i = 0; i < nCoupe; i++) ptPiece(pieces, ptNomZ("Lame pleine", z, "découpée en courbe"), M.plein, w, d, "Découpée à la forme du haut", "", "Remplissage");
    }
    return;
  }
  if (remp === "lames" || remp === "lamesAlu") {
    const L = remp === "lames" ? RG.lameChene : RG.lameAlu;
    const pr = remp === "lames" ? { nom: PT_CHENE.nom, kgM: PT_CHENE.kgM, b: L.h, e: L.ep } : { nom: "Lame alu 100 × 20", b: 100, e: 20, ep: 2 };
    const cls = remp === "lames" ? "t-bois" : "t-acier-plein";
    const pas = L.h + L.jour, hautMax = Math.max(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2));
    for (let y = z.y0 + L.jour; y + 40 <= hautMax; y += pas) {
      const yHaut = y + L.h;
      if (yHaut <= hautMin + 1) { F.push({ t: "poly", piece: remp === "lames" ? "Lames de chêne" : "Lames alu", cls, pts: ptRect(z.x0, y, z.x1, yHaut) }); ptPiece(pieces, remp === "lames" ? ptNomZ("Lame chêne", z) : ptNomZ("Lame alu", z), pr, w, d, "Coupe droite", remp === "lames" ? "Vissée sur cornières, huile-cire" : "", "Remplissage"); continue; }
      // Lame coupée à la forme du haut : on garde ce qui est sous la ligne.
      const pts = ptCourbe((x) => Math.min(yHaut, z.haut(x)), z.x1, z.x0, 16).filter(([, yy]) => yy > y + 1);
      if (pts.length < 2) continue;
      F.push({ t: "poly", piece: remp === "lames" ? "Lames de chêne" : "Lames alu", cls, pts: [[z.x0, y], [z.x1, y], ...ptCourbe((x) => Math.max(y, Math.min(yHaut, z.haut(x))), z.x1, z.x0, 16)] });
      ptPiece(pieces, remp === "lames" ? ptNomZ("Lame chêne", z, "découpée") : ptNomZ("Lame alu", z, "découpée"), pr, w, d, "Découpée à la forme du haut", "", "Remplissage");
    }
    return;
  }
  if (remp === "barreaux") {
    const pr = M.barreau, n = Math.max(1, Math.ceil((w - RG.videMax) / (pr.b + RG.videMax))), pas = (w - n * pr.b) / (n + 1);
    const pointes = c.pointes && z.dessus;
    for (let i = 0; i < n; i++) {
      const xa = z.x0 + pas + i * (pas + pr.b), xb = xa + pr.b, xm = (xa + xb) / 2;
      const yTop = pointes ? z.hautExt(xm) + RG.pointe.depasse : z.haut(xm);
      F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: [[xa, z.y0], [xb, z.y0], [xb, yTop], [xa, yTop]] });
      if (pointes) F.push({ t: "poly", piece: "Pointes de lance", cls: "t-acier-plein", pts: [[xa - 8, yTop], [xb + 8, yTop], [xm, yTop + RG.pointe.h]] });
      ptPiece(pieces, ptNomZ("Barreau", z), pr, yTop - z.y0, d, pointes ? "Traverse haute percée, barreau traversant" : courbe ? "Haut coupé à la forme" : "Coupes droites", "", "Remplissage");
      q.soudures += pointes ? 3 : 2;
    }
    if (pointes) q.achats.pointes = (q.achats.pointes || 0) + n;
    q.vide = Math.max(q.vide || 0, pas);
    return;
  }
  if (remp === "croix") {
    const pr = M.croix, cols = Math.max(1, Math.round(w / RG.croixCellule)), mi = 30;
    const cw = (w - (cols - 1) * mi) / cols;
    for (let k = 0; k < cols; k++) {
      const a = z.x0 + k * (cw + mi), b = a + cw, ya = z.haut(a), yb = z.haut(b);
      if (k > 0) { F.push({ t: "poly", piece: "Montants des croix", cls: "t-acier-plein", pts: [[a - mi, z.y0], [a, z.y0], [a, z.haut(a)], [a - mi, z.haut(a - mi)]] }); ptPiece(pieces, ptNomZ("Montant entre croix", z), { nom: c.mat === "acier" ? "Plat acier 30 × 8" : "Plat alu 30 × 8", b: 30, e: 8, plein: true }, z.haut(a) - z.y0, d, "Coupes droites", "", "Remplissage"); }
      const e = pr.b / 2;
      F.push({ t: "poly", piece: "Croix", cls: "t-acier-plein", pts: [[a, z.y0], [a + e * 1.4, z.y0], [b, yb - e * 1.4], [b, yb], [b - e * 1.4, yb], [a, z.y0 + e * 1.4]] });
      F.push({ t: "poly", piece: "Croix", cls: "t-acier-plein", pts: [[a, ya], [a, ya - e * 1.4], [b - e * 1.4, z.y0], [b, z.y0], [b, z.y0 + e * 1.4], [a + e * 1.4, ya]] });
      // La barre entière (l'autre est en deux demi-barres) est retournée sur le côté droit : miroir exact, vu de la rue.
      const yPlein = z.miroir ? ya : yb, yDemi = z.miroir ? yb : ya;
      const L1 = Math.hypot(b - a, yPlein - z.y0), L2 = Math.hypot(b - a, yDemi - z.y0);
      ptPiece(pieces, ptNomZ("Barre de croix", z), pr, L1, d, `Coupes à ${Math.round(Math.atan2(yPlein - z.y0, b - a) * 180 / Math.PI)}°`, "", "Remplissage");
      ptPiece(pieces, ptNomZ("Demi-barre de croix", z), pr, L2 / 2, d, "Coupée au centre, contre la rosace", "", "Remplissage");
      ptPiece(pieces, ptNomZ("Demi-barre de croix", z), pr, L2 / 2, d, "Coupée au centre, contre la rosace", "", "Remplissage");
      const cx = (a + b) / 2, cy = (z.y0 + (ya + yb) / 2) / 2;
      F.push({ t: "cercle", piece: "Rosaces", cls: "t-rond", c: [cx, cy], r: RG.rosaceD / 2 });
      F.push({ t: "cercle", cls: "t-acier", c: [cx, cy], r: RG.rosaceD / 2 * 0.55 });
      q.rosaces = (q.rosaces || 0) + 1; q.soudures += 8;
    }
  }
}

/* ---------- Le décor : la bibliothèque de styles (modules/motifs.js) dans la zone du haut ---------- */

// Additionne les compteurs de motifs.js d'une zone à ceux du portail (nombres, listes, et tables de commandes par clé).
function ptFusion(a, b) {
  for (const [k, x] of Object.entries(b || {})) {
    if (k === "vide") a.vide = Math.max(a.vide || 0, x);
    else if (typeof x === "number") a[k] = (a[k] || 0) + x;
    else if (Array.isArray(x)) a[k] = (a[k] || []).concat(x);
    else if (x && typeof x === "object") {
      a[k] = a[k] || {};
      for (const [kk, y] of Object.entries(x)) {
        if (typeof y === "number") a[k][kk] = (a[k][kk] || 0) + y;
        else if (y && typeof y === "object") a[k][kk] = a[k][kk] ? { ...a[k][kk], qte: (a[k][kk].qte || 0) + (y.qte || 0) } : { ...y };
        else a[k][kk] = y;
      }
    }
  }
  return a;
}

// Une zone du haut reçoit un ou deux placements de motifs.js, en mode catalogue (la référence achetée exacte, l'écart des
// barreaux réglé sur elle). motifs.js dessine les barreaux ET le décor. Ses barreaux droits redeviennent les barreaux du
// portail (même carré, chiffrés au mètre) ; le reste (volutes, colliers, lisses des frises, barreaux torsadés, bagues) est
// marqué decor: true : chiffré par chiffrage-motifs.js, compté dans le poids, la peinture et la galvanisation, jamais dans
// les mètres de profilés. q.decor garde les pièces, les compteurs et les refus de tout le portail.
function ptDecorZone(c, z, F, pieces, q) {
  const RG = PT_ATELIER, M = c.M, d = M.densite;
  const pointes = c.pointes && z.dessus;
  const choix = z.decor.map((ch) => ({ ...c.decorFin, ...ch, liaison: "soudure", catalogue: true, pointes: pointes ? "lance" : "aucune", refs: c.decorRefs }));
  const mz = { x0: z.x0, x1: z.x1, y0: z.y0, haut: z.haut, barreau: M.barreau.b, vide: RG.decor.vide, pointes: pointes ? M.cadre.b : 0, miroir: !!z.miroir && c.decorMiroir, catalogue: true };
  if (choix.some((ch) => ch.assemblage === "cimier")) mz.cimier = { y: z.hautExt, h: RG.decor.cimier };
  if (z.soub) mz.soub = z.soub;
  const Fm = [], pm = [], qm = {};
  if (choix.length > 1) mtRemplirPlusieurs(mz, choix, Fm, pm, qm); else mtRemplir(mz, choix[0], Fm, pm, qm);
  for (const p of Fm) if (p.role !== "detour") F.push(p);
  const D = q.decor || (q.decor = { pieces: [], q: {}, ch: choix.filter((x) => x.assemblage !== "barreaux"), refus: [], cimierH: 0 });
  let nBarreaux = 0;
  for (const p of pm) {
    if (p.mat === "Carré plein 16") { ptPiece(pieces, ptNomZ("Barreau", z), M.barreau, p.long, d, p.coupes, p.note, "Remplissage"); nBarreaux++; continue; }
    // Une pièce achetée porte sa référence (outil) ; sur le site, le catalogue public n'a que la taille.
    const mat = p.fab === "achat" && p.h ? `Achetée${p.ref ? `, réf. ${p.ref}` : ""} (${ptMm(p.h)} × ${ptMm(p.l)}, plat ${p.section})` : p.mat;
    const dp = { ...p, mat, decor: true };
    pieces.push(dp); D.pieces.push(dp);
  }
  q.soudures += nBarreaux * (pointes ? 3 : 2);
  if (qm.pointes) q.achats.pointes = (q.achats.pointes || 0) + qm.pointes;
  if (qm.vide) q.vide = Math.max(q.vide || 0, qm.vide);
  const { refus, cimier, norme, soudures, ...reste } = qm;
  ptFusion(D.q, reste);
  for (const r of refus || []) if (!D.refus.some((x) => x.quoi === r.quoi && x.raison === r.raison)) D.refus.push(r);
  if (cimier && cimier.h) D.cimierH = Math.max(D.cimierH, cimier.h);
}

function ptDessinerVantail(c, V, haut, F, pieces, q, Vn) {
  const RG = PT_ATELIER, M = c.M, d = M.densite, gs = c.gs;
  const cotéGonds = V.gonds === "gauche" ? "g" : V.gonds === "droite" ? "d" : null;
  const prG = V.coulissant ? M.cadre : cotéGonds === "g" ? M.fort : M.cadre, prD = cotéGonds === "d" ? M.fort : M.cadre;
  const bG = prG.b, bD = prD.b, bB = M.cadre.b, bH = M.cadre.b;
  const prBas = V.coulissant ? M.fort : M.cadre;
  const x0 = V.x0, x1 = V.x1, xi0 = x0 + bG, xi1 = x1 - bD;
  const hautCadre = (x) => haut(x) - bH;
  // Décor retourné sur le côté droit (vu de la rue) : vantail à gonds à droite, panneau de la moitié droite, coulissant sens droite.
  const miroir = V.coulissant ? c.sens === "droite" : V.gonds ? V.gonds === "droite" : (V.x0 + V.x1) / 2 > c.P / 2;
  // Montants (haut coupé à la forme), traverses basse et haute.
  F.push({ t: "poly", piece: "Montants", cls: "t-acier-plein", pts: [[x0, gs], [xi0, gs], [xi0, haut(xi0)], [x0, haut(x0)]] });
  F.push({ t: "poly", piece: "Montants", cls: "t-acier-plein", pts: [[xi1, gs], [x1, gs], [x1, haut(x1)], [xi1, haut(xi1)]] });
  F.push({ t: "poly", piece: "Traverse basse", cls: "t-acier-plein", pts: ptRect(xi0, gs, xi1, gs + bB) });
  const courbe = c.forme !== "droit";
  F.push({ t: "poly", piece: "Traverse haute", cls: "t-acier-plein", pts: [...ptCourbe(hautCadre, xi0, xi1), ...ptCourbe(haut, xi1, xi0)] });
  const coupeHaut = c.forme === "droit" ? "Coupes droites" : c.forme === "biais" ? "Haut coupé en biais" : "Haut coupé à la courbe";
  ptPiece(pieces, cotéGonds === "g" ? "Montant côté gonds" : V.coulissant ? "Montant" : V.pli === "gauche" ? "Montant côté pli" : "Montant de serrure", prG, haut(x0) - gs, d, coupeHaut, "", "Cadre");
  ptPiece(pieces, cotéGonds === "d" ? "Montant côté gonds" : V.coulissant ? "Montant" : V.pli === "droite" ? "Montant côté pli" : "Montant de serrure", prD, haut(x1) - gs, d, coupeHaut, "", "Cadre");
  ptPiece(pieces, V.coulissant ? "Traverse basse (porte les roues)" : "Traverse basse", prBas, xi1 - xi0, d, "Coupes droites, bouchons", "", "Cadre");
  const lh = courbe && c.forme !== "biais" ? ptLongueur(ptCourbe((x) => hautCadre(x) + bH / 2, xi0, xi1)) : Math.hypot(xi1 - xi0, haut(xi1) - haut(xi0));
  ptPiece(pieces, "Traverse haute", M.cadre, lh, d, c.forme === "chapeau" || c.forme === "creux" ? "Cintrée" : c.forme === "biais" ? "Coupes d'équerre sur la pente" : "Coupes droites, bouchons", c.forme === "chapeau" || c.forme === "creux" ? `Cintrage : flèche ${ptMm(c.fleche)} sur toute la largeur du portail` : "", "Cadre");
  q.soudures += 4;
  // Panneaux : montants intermédiaires si le vantail est long.
  const maxP = (c.remp === "lames" || c.soub === "lames") ? RG.panneauMaxLames : RG.panneauMax;
  let nP = Math.max(1, Math.ceil((xi1 - xi0) / maxP));
  // Médaillon : un nombre impair de panneaux, pour que le motif soit sur l'axe du vantail (dans le panneau du milieu).
  const medaillon = c.decorChoix.some((x) => x.assemblage === "medaillon");
  if (medaillon && nP % 2 === 0) nP++;
  const mi = M.inter.b;
  const wP = (xi1 - xi0 - (nP - 1) * mi) / nP;
  const ySoub = c.soub !== "aucun" ? gs + c.hSoub : null;
  const avecDecor = c.decorChoix.length > 0 && typeof mtRemplir === "function";
  for (let k = 0; k < nP; k++) {
    const a = xi0 + k * (wP + mi), b = a + wP;
    // Le médaillon va dans le panneau du milieu ; les autres panneaux gardent les autres placements, ou des barreaux.
    let decor = null;
    if (avecDecor) {
      decor = c.decorChoix.filter((x) => x.assemblage !== "medaillon" || k === (nP - 1) / 2);
      if (!decor.length) decor = [{ assemblage: "barreaux" }];
    }
    if (k > 0) {
      F.push({ t: "poly", piece: "Montants intermédiaires", cls: "t-acier-plein", pts: [[a - mi, gs + bB], [a, gs + bB], [a, hautCadre(a)], [a - mi, hautCadre(a - mi)]] });
      ptPiece(pieces, "Montant intermédiaire", M.inter, hautCadre(a - mi / 2) - gs - bB, d, courbe ? "Haut coupé à la forme" : "Coupes droites", "", "Cadre");
      q.soudures += 2;
    }
    const y0 = gs + bB;
    if (ySoub) {
      const ti = RG.traverseInter;
      F.push({ t: "poly", piece: "Traverse intermédiaire", cls: "t-acier-plein", pts: ptRect(a, ySoub, b, ySoub + ti) });
      ptPiece(pieces, "Traverse intermédiaire", M.inter, b - a, d, "Coupes droites", "", "Cadre");
      q.soudures += 2;
      ptRemplir(c, { x0: a, x1: b, y0, haut: () => ySoub, plat: true, nomZone: "du soubassement", hautExt: () => ySoub, miroir }, c.soub, F, pieces, q);
      // Un soubassement plein (tôle ou panneau) peut porter un motif soudé (placement « appliquePlein » de motifs.js : z.soub).
      const soubPlein = c.soub === "plein" || c.soub === "panneau" ? { soub: { x0: a, x1: b, y0, haut: ySoub } } : {};
      ptRemplir(c, { x0: a, x1: b, y0: ySoub + ti, haut: hautCadre, nomZone: "du haut", dessus: true, hautExt: haut, miroir, decor, ...soubPlein }, c.remp, F, pieces, q);
    } else {
      ptRemplir(c, { x0: a, x1: b, y0, haut: hautCadre, nomZone: "", dessus: true, hautExt: haut, miroir, decor }, c.remp, F, pieces, q);
    }
  }
  // La moulure : au centre du bas plein du vantail (le plus grand modèle qui tient), vissée par derrière.
  if (c.moulure && ySoub) {
    const w = xi1 - xi0, hS = ySoub - (gs + bB);
    const m = PT_MOULURES[c.mat === "acier" ? "acier" : "alu"].find((x) => x.l <= 0.6 * w && x.h <= 0.7 * hS);
    if (m) {
      const cx = (xi0 + xi1) / 2, cy = gs + bB + hS / 2;
      const ell = (rx, ry) => Array.from({ length: 28 }, (_, i) => [cx + rx * Math.cos((i / 28) * 2 * Math.PI), cy + ry * Math.sin((i / 28) * 2 * Math.PI)]);
      F.push({ t: "poly", piece: "Moulure", cls: "t-acier-plein", pts: ell(m.l / 2, m.h / 2) });
      F.push({ t: "poly", piece: "Moulure", cls: "t-acier", pts: ell(m.l * 0.36, m.h * 0.32) });
      F.push({ t: "cercle", piece: "Moulure", cls: "t-acier-plein", c: [cx, cy], r: m.h * 0.17 });
      q.achats.moulures = (q.achats.moulures || 0) + 1;
      q.moulure = m;
    } else q.mouluresRefus = true;
  }
  // Lisse en chêne posée sur la traverse haute (haut droit seulement) : de bout en bout du vantail, SANS débord au bout
  // (elle mangerait les jeux) ; elle déborde seulement devant et derrière (vue de côté).
  if (c.lisse && c.forme === "droit") {
    const L = RG.lisse, yT = haut(x0);
    F.push({ t: "poly", piece: "Lisse en chêne", cls: "t-bois", pts: ptRect(x0, yT, x1, yT + L.h) });
    ptPiece(pieces, "Lisse en chêne", { nom: `Chêne ${L.l} × ${L.h}`, kgM: L.l / 1000 * L.h / 1000 * 700 }, x1 - x0, d, "Bouts arrondis, huile-cire", `Vissée par-dessous, débord de ${(L.l - M.cadre.e) / 2} mm devant et derrière, aucun au bout`, "Remplissage");
  }
  // Gonds : à garde au sol + 200 et à 200 sous le haut du vantail (3 si H > 1 800, le 3e au milieu). Vu de la rue, on voit la
  // platine sur le nu du pilier et le bras dans le jeu ; le gond femelle et son axe (à 65 du nu) sont derrière le montant.
  if (cotéGonds) {
    const G = RG.gonds, s = cotéGonds === "g" ? 1 : -1, xm = cotéGonds === "g" ? x0 : x1, nu = xm - s * RG.jeuGonds, xAxe = nu + s * G.axeNu;
    const nG = c.H > G.troisAuDela ? 3 : 2, yBas = gs + G.bas, yHaut = haut(xm) - G.haut;
    V.gondsY = Array.from({ length: nG }, (_, i) => yBas + i * (yHaut - yBas) / (nG - 1));
    for (const y of V.gondsY) {
      F.push({ t: "poly", piece: "Gonds", cls: "t-acier-plein", pts: ptRect(nu, y - G.platine / 2, nu + s * G.platineEp, y + G.platine / 2) });
      F.push({ t: "poly", piece: "Gonds", cls: "t-acier-plein", pts: ptRect(nu + s * G.platineEp, y - 15, xm, y + 15) });
      F.push({ t: "poly", piece: "Gonds", cls: "t-cache", pts: ptRect(xAxe - G.femelleD / 2, y - 45, xAxe + G.femelleD / 2, y + 45) });
    }
  }
  if (V.pli === "droite") {
    for (let i = 0; i < (c.H > 1800 ? 4 : 3); i++) {
      const y = gs + 150 + i * (c.H - 300) / ((c.H > 1800 ? 4 : 3) - 1);
      F.push({ t: "poly", piece: "Charnières de pli", cls: "t-acier-plein", pts: ptRect(x1 - 6, y - 35, x1 + PT_ATELIER.jeuPli + 6, y + 35) });
    }
  }
  // Serrure sur le montant libre (2 vantaux inégaux : sur le petit, le passage piéton), à 950 du bas, plus bas sur un
  // vantail court ; verrou au sol sur le vantail semi-fixe.
  if (!V.coulissant && !V.pli) {
    const xs = cotéGonds === "g" ? x1 - bD / 2 : x0 + bG / 2, yS = Math.min(gs + 950, haut(xs) - bH - 170);
    V.serrureY = yS;
    if (V.serrure) F.push({ t: "poly", piece: "Serrure", cls: "t-acier t-serrure", pts: ptRect(xs - 14, yS, xs + 14, yS + 150) });
    if (V.verrou) F.push({ t: "poly", piece: "Verrou du vantail fixe", cls: "t-acier t-serrure", pts: ptRect(xs - 8, 0, xs + 8, gs + 300) });
  }
}

/* ---------- 4. Les gonds et les tables : géométrie, jeu sur toute la course, choix selon le poids ---------- */

// Distance d'un point p au segment [a, b].
function ptDistSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
// Le point p est-il dans le polygone convexe pts (bord compris) ?
function ptDansPoly(p, pts) {
  let signe = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cr) < 1e-9) continue;
    if (!signe) signe = Math.sign(cr); else if (Math.sign(cr) !== signe) return false;
  }
  return true;
}
// Un point tourné de deg degrés autour de l'axe A, dans le sens trigonométrique (un vantail à gonds à gauche, vu de la
// rue, s'ouvre ainsi vers la propriété).
const ptPivote = ([x, y], [ax, ay], deg) => { const t = deg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t); return [ax + (x - ax) * co - (y - ay) * si, ay + (x - ax) * si + (y - ay) * co]; };

// Distance entre un rectangle droit o = { x0, x1, y0, y1 } (un obstacle fixe, ses coins dans Rr) et un polygone convexe
// Q (une pièce qui tourne) : 0 s'ils se touchent ou se chevauchent. Un coin « sans fin » (PT_LOIN) n'est jamais le plus
// proche : seuls les coins réels (l'arête du pilier, les coins de la platine) sont comparés aux bords de Q. Appelée des
// milliers de fois par portail : arithmétique à plat.
function ptDistRectPoly(o, Q, Rr = ptRect(o.x0, o.y0, o.x1, o.y1)) {
  const n = Q.length;
  let d = Infinity, qx0 = Infinity, qx1 = -Infinity, qy0 = Infinity, qy1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = Q[i][0], y = Q[i][1];
    const dx = x < o.x0 ? o.x0 - x : x > o.x1 ? x - o.x1 : 0, dy = y < o.y0 ? o.y0 - y : y > o.y1 ? y - o.y1 : 0;
    if (dx === 0 && dy === 0) return 0;
    const h = Math.sqrt(dx * dx + dy * dy);
    if (h < d) d = h;
    if (x < qx0) qx0 = x; if (x > qx1) qx1 = x; if (y < qy0) qy0 = y; if (y > qy1) qy1 = y;
  }
  // Les boîtes se recouvrent : un coin de l'obstacle dans Q, ou deux bords qui se croisent, et c'est 0.
  const recouvre = qx0 <= o.x1 && qx1 >= o.x0 && qy0 <= o.y1 && qy1 >= o.y0;
  for (let j = 0; j < 4; j++) {
    const r = Rr[j], reel = Math.abs(r[0]) < PT_LOIN / 2 && Math.abs(r[1]) < PT_LOIN / 2;
    if (recouvre) {
      if (reel && ptDansPoly(r, Q)) return 0;
      const r2 = Rr[(j + 1) % 4];
      for (let i = 0; i < n; i++) {
        const a = Q[i], b = Q[(i + 1) % n];
        const c1 = (b[0] - a[0]) * (r[1] - a[1]) - (b[1] - a[1]) * (r[0] - a[0]), c2 = (b[0] - a[0]) * (r2[1] - a[1]) - (b[1] - a[1]) * (r2[0] - a[0]);
        const c3 = (r2[0] - r[0]) * (a[1] - r[1]) - (r2[1] - r[1]) * (a[0] - r[0]), c4 = (r2[0] - r[0]) * (b[1] - r[1]) - (r2[1] - r[1]) * (b[0] - r[0]);
        if (c1 * c2 < 0 && c3 * c4 < 0) return 0;
      }
    }
    if (reel) for (let i = 0; i < n; i++) { const h = ptDistSegment(r, Q[i], Q[(i + 1) % n]); if (h < d) d = h; }
  }
  return d;
}
const PT_LOIN = 1e6;   // « sans fin » pour un obstacle dont un bord n'est pas relevé

/** Un vantail à gonds, ramené à son côté des gonds comme s'il était à gauche (vu de la rue) : x depuis le nu du pilier
 *  vers le passage, y depuis la face côté rue du vantail fermé vers la propriété. monde(p) rend le point dans le repère
 *  des vues (x depuis le nu du pilier gauche) : le vantail à gonds à droite est le miroir exact de celui de gauche.
 *  Le montant côté gonds (profilé « fort ») est centré sur l'épaisseur du cadre ; l'axe du gond est à axeNu du nu, à
 *  axeDerriere derrière la face arrière du montant. pieces : ce qui tourne près du pilier (le montant, et la lisse en
 *  chêne qui déborde devant et derrière) ; platine : la platine du gond, vissée sur le nu (obstacle fixe, à la hauteur
 *  des gonds seulement). decaler(d) : le même vantail réglé de d mm vers le passage (d < 0 : vers le pilier). */
function ptGeoGond(c, vt, decal = 0) {
  const G = PT_ATELIER.gonds, M = c.M, gauche = vt.gonds === "gauche";
  const e = M.cadre.e, eF = M.fort.e, jeu = (gauche ? vt.x0 : c.P - vt.x1) + decal, w = vt.x1 - vt.x0;
  const montant = { x0: jeu, x1: jeu + M.fort.b, y0: (e - eF) / 2, y1: (e + eF) / 2 };
  const axe = [G.axeNu + decal, montant.y1 + G.axeDerriere];
  const pieces = [montant];
  // La lisse : sa partie au droit du montant (plus loin, en ouvrant jusqu'à 90°, elle ne s'approche pas plus du pilier).
  if (c.lisse && c.forme === "droit") { const l = PT_ATELIER.lisse.l; pieces.push({ x0: jeu, x1: jeu + M.fort.b, y0: (e - l) / 2, y1: (e + l) / 2 }); }
  const platine = { x0: -PT_LOIN, x1: G.platineEp, y0: axe[1] - G.platine / 2, y1: axe[1] + G.platine / 2 };
  return { gauche, jeu, w, e, montant, pieces, platine, axe, cadre: ptRect(jeu, 0, jeu + w, e), monde: ([x, y]) => [gauche ? x : c.P - x, y], decaler: (d) => ptGeoGond(c, vt, decal + d) };
}

/** Le plus petit jeu entre ce qui tourne côté gonds (g.pieces, ou le seul montant) et un obstacle fixe, de fermé (0°) à
 *  ouvert au maximum, degré par degré. Obstacle par défaut : le pilier, x ≤ 0 (son nu), de g.yAvant (sa face côté rue)
 *  à yArete (son arête côté propriété). Un bord inconnu (Infinity, ou yAvant absent) est pris sans fin : le cas le plus
 *  défavorable. obst : un autre obstacle { x0, x1, y0, y1 } (la platine du gond). */
function ptJeuCourse(g, yArete, deg, obst) {
  const fin = (y, def) => (Number.isFinite(y) ? y : def);
  const o = obst || { x0: -PT_LOIN, x1: 0, y0: fin(g.yAvant, -PT_LOIN), y1: fin(yArete, PT_LOIN) }, Rr = ptRect(o.x0, o.y0, o.x1, o.y1);
  const [ax, ay] = g.axe;
  const pieces = (g.pieces || [g.montant]).map((m) => ptRect(m.x0, m.y0, m.x1, m.y1));
  const vus = new Map();
  const jeu = (a) => {
    if (vus.has(a)) return vus.get(a);
    const t = a * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
    let d = Infinity;
    for (const p of pieces) {
      d = Math.min(d, ptDistRectPoly(o, p.map(([x, y]) => [ax + (x - ax) * co - (y - ay) * si, ay + (x - ax) * si + (y - ay) * co]), Rr));
      if (d === 0) break;
    }
    vus.set(a, d);
    return d;
  };
  // Degré par degré, sans tout calculer : d'abord tous les 5°, puis chaque degré d'un intervalle où le jeu peut passer
  // sous le plus petit trouvé (en tournant de θ, un point à r de l'axe bouge de r × θ au plus).
  const rMax = Math.max(...pieces.flat().map(([x, y]) => Math.hypot(x - ax, y - ay)));
  const bornes = [];
  for (let a = 0; a < deg; a += 5) bornes.push(a);
  bornes.push(deg);
  let best = Math.min(...bornes.map(jeu));
  for (let i = 0; i + 1 < bornes.length; i++) {
    const a = bornes[i], b = bornes[i + 1];
    if ((jeu(a) + jeu(b) - rMax * (b - a) * Math.PI / 180) / 2 > best + 1e-9) continue;
    for (let k = a + 1; k < b; k++) best = Math.min(best, jeu(k));
  }
  let min = Infinity, angle = 0;
  for (const a of [...vus.keys()].sort((x, y) => x - y)) if (vus.get(a) < min - 1e-9) { min = vus.get(a); angle = a; }
  return { min, angle };
}

/** La place derrière le portail (depuis sa face côté rue) que balaie le vantail de fermé à ouvert au maximum. */
function ptPlaceDerriere(g, deg) {
  let yMax = 0;
  for (let a = 0; a <= deg; a++) for (const p of g.cadre) yMax = Math.max(yMax, ptPivote(p, g.axe, a)[1]);
  return yMax;
}

/** Le gond le moins fort qui porte kg (par paire), dans la matière du cadre ; null au-delà du plus fort (sur étude). */
const ptChoixGond = (mat, kg) => PT_GONDS.filter((x) => x.mat === mat).sort((a, b) => a.chargePaire - b.chargePaire).find((x) => x.chargePaire >= kg) || null;
/** Les roues les plus petites qui portent kg (le portail entier, 2 roues) ; null au-delà de la plus forte (sur étude). */
const ptChoixRoue = (kg) => [...PT_ROUES].sort((a, b) => a.kgMax - b.kgMax).find((x) => x.kgMax >= kg) || null;
/** La plus petite section de poteau qui porte un vantail de l mm et kg (pliant : un côté), à la hauteur H. Le poteau d'un
 *  coulissant ne porte pas le portail : seule la hauteur compte. null : hors tableau (sur étude). */
function ptChoixPoteau(type, matPoteau, H, l, kg) {
  return [...PT_POTEAUX].sort((a, b) => a.b - b.b).find((p) => p.pour.includes(type) && H <= p.hMax && (type === "coulissant" || (l <= p.lMax && kg <= p.kgMax[matPoteau]))) || null;
}

/** Les pièces qui ne passent pas chez le galvaniseur (acier), chez le laqueur ou sur la remorque (PT_ATELIER.finition).
 *  aFinir : [{ nom, dims: [3 cotes en mm], acier }]. Une pièce entre dans la cuve dans n'importe quel sens ; dans le four,
 *  elle pend (longueur × hauteur). releve : la limite est-elle relevée (alerte) ou une valeur à confirmer (avertissement) ? */
function ptFinition(aFinir) {
  const F = PT_ATELIER.finition, tri = (a) => [...a].sort((x, y) => y - x);
  const cuve = tri([F.cuveGalva.L, F.cuveGalva.l, F.cuveGalva.h]), trop = [];
  for (const p of aFinir) {
    const [a, b, e] = tri(p.dims);
    if (p.acier && (a > cuve[0] || b > cuve[1] || e > cuve[2])) trop.push({ nom: p.nom, dims: p.dims, ou: "la cuve du galvaniseur", lim: `${ptMm(F.cuveGalva.L)} × ${ptMm(F.cuveGalva.l)} × ${ptMm(F.cuveGalva.h)} mm`, releve: !!F.cuveGalva.releve });
    if (a > F.fourLaquage.L || b > F.fourLaquage.h) trop.push({ nom: p.nom, dims: p.dims, ou: "le four du laqueur", lim: `${ptMm(F.fourLaquage.L)} × ${ptMm(F.fourLaquage.h)} mm`, releve: !!F.fourLaquage.releve });
    if (a > F.transportMax) trop.push({ nom: p.nom, dims: p.dims, ou: "la remorque", lim: `${ptMm(F.transportMax)} mm de long`, releve: !!F.transportReleve });
  }
  return trop;
}

const ptMm1 = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");

/** Où sont les piliers (ou les poteaux) en profondeur, dans le repère des vues de dessus et de côté (y depuis la face
 *  côté rue du vantail fermé, vers la propriété). b : largeur vue de la rue. y0 / y1 : faces côté rue et côté propriété
 *  DESSINÉES ; yAvant / yArete : ce que le contrôle de course en sait (Infinity : inconnu, pris sans fin).
 *  - poteaux d'un portail à gonds : l'axe des gonds au milieu du poteau, pour que la platine 100 × 100 tienne dans sa face ;
 *  - poteaux d'un coulissant : centrés sur y = 0 (le portail passe derrière) ;
 *  - piliers existants : arête côté propriété = axe du gond + ptGondBord quand il est relevé ; sinon, et pour la
 *    profondeur, une valeur de dessin (PT_ATELIER.pilierDessin). La largeur relevée (ptPilierL) ne sert jamais de profondeur. */
function ptPiliers(c, prP, geos, Vi) {
  const Dp = PT_ATELIER.pilierDessin, gonds = c.type !== "coulissant" && geos.length > 0;
  if (prP) {
    const ym = gonds ? geos[0].axe[1] : 0;
    return { b: prP.b, y0: ym - prP.b / 2, y1: ym + prP.b / 2, yAvant: ym - prP.b / 2, yArete: ym + prP.b / 2, poteau: true };
  }
  const b = Vi.pilierL || Dp;
  if (gonds && Vi.gondBord !== null) {
    const y1 = geos[0].axe[1] + Vi.gondBord;
    return { b, y0: Math.min(-Dp / 2, y1 - Dp), y1, yAvant: -Infinity, yArete: y1, areteRelevee: true };
  }
  return { b, y0: -Dp / 2, y1: Dp / 2, yAvant: -Infinity, yArete: Infinity };
}

/* ---------- 5. Le calcul complet ---------- */

/* ---------- 5 bis. La motorisation (lot 4) : les solutions permises pour CE portail, la conseillée ---------- */

// La part pleine (prise au vent) de chaque remplissage : approchée, pour la limite de surface des vérins.
const PT_PLEIN = { plein: 1, panneau: 1, lames: 0.9, lamesAlu: 0.8, croix: 0.3, barreaux: 0.2 };
/**
 *  Rend { permis, refus, conseille, choisi, barrePalpeuse, notes } : chaque solution de PT_MOTEURS est permise ou refusée
 *  avec sa raison en clair (largeur et poids de chaque vantail, surface au vent, pilier, recoin, longueur et poids du
 *  coulissant). Conseillé (sans prix) : le plus facile à poser, puis la plus longue garantie ; le chiffrage départage par
 *  le prix (cahier §6.2). Aucune cote inventée : ce que la visite n'a pas relevé reste une note « à relever ».
 */
/**
 * Le colis d'un portail livré par transporteur (Quentin, 10/10/2026 : « on le met droit dans le camion, on gagne de la place »).
 * Chaque pièce voyage DEBOUT, calée sur sa palette : ce qui compte pour le transporteur, c'est son poids et sa plus grande
 * dimension, pas sa surface à plat. Rien n'est deviné : les dimensions et les poids sont ceux du plan ; l'emballage (palette,
 * calage, cerclage) se chiffre dans chiffrage-portails.js, la livraison se facture sur le site selon ce colis.
 *   pieces : [{ nom, longueurMm, hauteurMm, kg }] : les vantaux ou panneaux (avec sa queue et sa poutre pour un autoportant) et les poteaux
 *   kg : le poids de tout ce qui part ; plusGrandeCoteMm : la plus grande dimension d'une pièce debout (longueur ou hauteur).
 */
function ptColis(R) {
  const c = R.config, Q = R.quant, H = R.dims.hautMax, kgTotal = Math.round(R.kg);
  const queue = c.type === "coulissant" ? (Q.queue || 0) : 0;
  const pieces = Q.vantaux.map((vt) => ({ nom: vt.nom, longueurMm: Math.round(vt.l + queue), hauteurMm: H, kg: Math.round(vt.kg) }));
  // Les poteaux s'ils sont fournis, le rail d'un coulissant sur rail (en tronçons de 3 m, à joindre sur place : à valider avec le
  // fournisseur du rail), puis la quincaillerie : tout ce qui part, au poids du plan.
  const nPot = R.debit.filter((d) => d.nom === "Poteau").reduce((s, d) => s + d.qte, 0), kgPot = Math.round(Q.kgParNom["Poteau"] || 0);
  for (const d of R.debit.filter((x) => x.nom === "Poteau")) for (let i = 0; i < d.qte; i++) pieces.push({ nom: "Poteau", longueurMm: Math.round(d.long), hauteurMm: 0, kg: Math.round(kgPot / Math.max(1, nPot)) });
  const rail = R.debit.find((d) => d.groupe === "Guidage" && /^Rail/.test(d.nom));
  if (rail) {
    const n = Math.ceil(rail.long / PT_COLIS.tronconRailMm), kgRail = Math.round(Q.kgParNom[rail.nom] || 0);
    for (let i = 0; i < n; i++) pieces.push({ nom: `Rail à sceller (tronçon ${i + 1} sur ${n})`, longueurMm: Math.min(PT_COLIS.tronconRailMm, Math.round(rail.long - i * PT_COLIS.tronconRailMm)), hauteurMm: 0, kg: Math.round(kgRail / n) });
  }
  const reste = kgTotal - pieces.reduce((s, p) => s + p.kg, 0);
  if (reste > 0) pieces.push({ nom: "Quincaillerie et accessoires", longueurMm: 0, hauteurMm: 0, kg: reste });
  const kg = pieces.reduce((s, p) => s + p.kg, 0);

  // Les palettes (fabriquées à l'atelier : Quentin les construit lui-même) : les vantaux ou panneaux debout, DEUX par palette au plus
  // (côte à côte, de la longueur du plus long) ; une dernière pour les poteaux et le rail en tronçons ; la quincaillerie voyage dans un
  // carton avec les vantaux. Le poids TAXABLE d'une palette est le plus grand du poids réel et du mètre plancher : un vantail debout est
  // « non gerbable », le transporteur le taxe sur la place qu'il prend au sol (longueur × profondeur ÷ 2,4 m × 1 750 kg).
  const grandes = pieces.filter((p) => p.hauteurMm > 0).sort((x, y) => y.longueurMm - x.longueurMm);
  const autres = pieces.filter((p) => !(p.hauteurMm > 0) && p.longueurMm > 0), quinc = pieces.filter((p) => p.longueurMm === 0).reduce((s, p) => s + p.kg, 0);
  const palettes = [];
  for (let i = 0; i < grandes.length; i += PT_COLIS.vantauxParPalette) {
    const lot = grandes.slice(i, i + PT_COLIS.vantauxParPalette);
    palettes.push({ longueurMm: Math.max(...lot.map((p) => p.longueurMm)), hauteurMm: Math.max(...lot.map((p) => p.hauteurMm)), kg: lot.reduce((s, p) => s + p.kg, 0), pieces: lot.length });
  }
  if (autres.length) palettes.push({ longueurMm: Math.max(1200, ...autres.map((p) => Math.min(p.longueurMm, PT_COLIS.tronconRailMm))), hauteurMm: 0, kg: autres.reduce((s, p) => s + p.kg, 0), pieces: autres.length });
  if (palettes.length && quinc) palettes[0].kg += quinc;
  for (const pl of palettes) pl.kgTaxable = Math.round(Math.max(pl.kg, (pl.longueurMm / 1000) * PT_COLIS.profondeurPaletteM * PT_COLIS.kgParMetrePlancher));
  return {
    pieces, palettes, kg,
    kgTaxable: palettes.reduce((s, pl) => s + pl.kgTaxable, 0),
    longueurMaxMm: Math.max(...pieces.map((p) => p.longueurMm)), hauteurMaxMm: Math.max(...pieces.map((p) => p.hauteurMm)),
    plusGrandeCoteMm: Math.max(...pieces.map((p) => Math.max(p.longueurMm, p.hauteurMm))),
  };
}
// Un rail à sceller part en tronçons de 3 m (un transporteur n'en prend pas de plus longs sans affrètement) ; une palette porte deux
// vantaux ou panneaux au plus ; profondeur de la palette (un vantail debout, calé) 0,6 m ; mètre plancher : 1 750 kg pour 2,4 m² (règle DSV).
const PT_COLIS = { tronconRailMm: 3000, vantauxParPalette: 2, profondeurPaletteM: 0.6, kgParMetrePlancher: 1750 / 2.4 };

function ptMotorisation(c, V, R, ctx) {
  const Vi = c.visite, out = { permis: [], refus: [], conseille: null, choisi: null, barrePalpeuse: false, notes: [] };
  if (c.type === "portillon") return out;
  if (c.type === "pliant") { out.refus.push({ cle: null, nom: "Pliant motorisé", raison: "sur étude (deux moteurs sur les kits de pli, et la mesure des forces est obligatoire : aucun rapport d'essai de fabricant)" }); return out; }
  const part = (t) => PT_PLEIN[t] ?? 1;
  const surface = (l) => (l / 1000) * (c.soub !== "aucun" ? (c.hSoub * part(c.soub) + (c.H - c.hSoub) * part(c.remp)) : c.H * part(c.remp)) / 1000 + (c.decor !== "aucun" ? 0.1 * (l / 1000) * (c.H / 1000) : 0);
  for (const m of PT_MOTEURS) {
    if (!m.pour.includes(c.type)) continue;
    const raisons = [], notes = [];
    if (c.type === "battant") {
      V.forEach((vt, i) => {
        const l = vt.x1 - vt.x0, kg = ctx.kgV[i].kg, lim = m.kgVantail.find(([L]) => l <= L);
        const r = !lim ? `vantail de ${ptMm(l)} mm (${ptMm(m.kgVantail[m.kgVantail.length - 1][0])} au plus)` : kg > lim[1] ? `vantail de ${ptKg(kg)} kg (${lim[1]} kg au plus jusqu'à ${ptMm(lim[0])} mm de large)` : null;
        if (r && !raisons.includes(r)) raisons.push(r);
      });
      if (m.gondBordMax && Vi.gondBord !== null && Vi.gondBord > m.gondBordMax) raisons.push(`pilier profond : axe du gond à ${ptMm(Vi.gondBord)} mm de l'arête (${m.gondBordMax} au plus pour les vérins)`);
      if (Vi.recoin !== null && Vi.recoin < m.recoinMin) raisons.push(`recoin de ${ptMm(Vi.recoin)} mm derrière le gond (${m.recoinMin} au moins)`);
      if (m.surfaceVent) {
        const sMax = Math.max(...V.map((vt) => surface(vt.x1 - vt.x0)));
        const lim = m.surfaceVent[Vi.vent || "abrite"];
        if (sMax > lim) raisons.push(`vantail de ${ptKg(sMax)} m² pleins au vent (${lim} m² au plus${Vi.vent ? "" : ", même abrité"})`);
        else if (!Vi.vent && sMax > m.surfaceVent.expose) notes.push(`${m.nom} : vantail de ${ptKg(sMax)} m² pleins, au-delà de ${m.surfaceVent.expose} m² si l'entrée est exposée au vent : exposition à relever à la visite.`);
      } else notes.push(`${m.nom} : surface au vent permise selon la notice, à relever.`);
    } else if (c.type === "coulissant") {
      const kg = ctx.kgV.reduce((x, y) => x + y.kg, 0);
      if (kg > m.kgMax) raisons.push(`portail de ${ptKg(kg)} kg (${m.kgMax} kg au plus)`);
      if (ctx.Lg > m.longueurMax) raisons.push(`portail de ${ptMm(ctx.Lg)} mm (${ptMm(m.longueurMax)} au plus)`);
    }
    const e = { cle: m.cle, nom: m.nom, ref: m.ref, principe: m.principe, contenu: m.contenu, garantie: m.garantie, facilite: ptFacilite(m), releve: m.releve, notes };
    if (raisons.length) out.refus.push({ ...e, raison: raisons.join(" ; ") }); else out.permis.push(e);
  }
  out.conseille = [...out.permis].sort((a, b) => b.facilite - a.facilite || b.garantie - a.garantie)[0] || null;
  out.choisi = c.moteurModele ? out.permis.find((m) => m.cle === c.moteurModele) || null : out.conseille;
  if (out.choisi) out.notes.push(...out.choisi.notes);
  // Coulissant : barre palpeuse sur le bord de fermeture si le remplissage est ajouré, et d'office au-delà de 200 kg.
  if (c.type === "coulissant") {
    const kg = ctx.kgV.reduce((x, y) => x + y.kg, 0), ajoure = part(c.remp) < 0.85;
    if (kg > 200 || ajoure) { out.barrePalpeuse = true; out.notes.push(`Barre palpeuse sur le bord de fermeture : ${kg > 200 ? `portail de ${ptKg(kg)} kg (plus de 200)` : "remplissage ajouré (une main passe au travers)"}.`); }
  }
  // Côtés : M1 et l'armoire du côté où arrive le courant (battant) ; le moteur du côté où le portail se range (coulissant).
  if (c.type === "battant") {
    if (Vi.courant === "gauche" || Vi.courant === "droite") out.notes.push(`Courant au pilier de ${Vi.courant} (vu de la rue) : M1 sur le vantail de ${Vi.courant}, armoire sur ce pilier, à 40 cm du sol au moins ; ordre d'ouverture selon la notice.`);
    else if (Vi.courant === "aucun") out.notes.push("Pas de courant au portail : l'électricien du client amène le 230 V au pilier (ligne dédiée 10 A, différentiel 30 mA), hors devis.");
    else out.notes.push("Pilier où arrive le courant : à relever à la visite (M1 et l'armoire vont de ce côté).");
    if (out.choisi && out.choisi.cle === "ixengo") out.notes.push("Ixengo : pattes de pilier réglables du kit (B = Z + X, Z = 110, ou 240 avec la patte longue réf. 9019500 ; A ≈ B) : A et B à mesurer à la visite, selon la notice.");
    if (out.choisi && out.choisi.cle === "axovia") out.notes.push("Axovia : bras articulés, cotes de pose selon la notice (à relever) ; recoin de 500 mm au moins derrière le gond.");
  } else if (c.type === "coulissant") {
    out.notes.push(`Moteur côté propriété, du côté où le portail se range (${c.sens}, vu de la rue), sur socle maçonné ; crémaillère sur la traverse basse, 1 à 2 mm de jeu sur le pignon.`);
  }
  return out;
}

/* ---------- 8. La pose (lot 4) : ouvrages, réservations, électricité, essais, et les vues de pose ---------- */

// Fixation des gonds selon la matière du pilier (cahier §2.4). Rien n'est deviné : support non relevé = « à voir ».
const PT_FIXATION_GONDS = {
  beton: "cheville métal 10 × 80 ou scellement chimique M12, trou Ø 14, 110 de profondeur",
  parpaing: "scellement chimique M12 avec tamis, trou Ø 16 à 20, 2 par gond, à 115-150 mm du bord",
  brique: "scellement chimique M12 avec tamis, trou Ø 16 à 20, 2 par gond, à 115-150 mm du bord",
  tuffeau: "tige M12 traversante avec contre-plaque ; sinon scellement chimique M12 avec tamis sur 150 mm au moins",
};
/**
 *  R.pose = { ouvrages: [{ rep, nom, qte, cotes, quiFait, delai }], reservations, electricite, essais, prerequis, controle,
 *  notes } ; R.vues.pose : l'implantation (la vue de dessus, plus moteurs, armoire, cellules, feu, gaines, longrine, socle) ;
 *  R.vues.poseCoupe : la coupe de pose (massifs, longrine, gaines et leur profondeur). Décision de Quentin du 07/10/2026
 *  (« je veux pas me charger du béton, je veux que le client se charge de ça et qu'il ait les plans pour le maçon ») : tout
 *  le BÉTON (massifs, longrine, socle du moteur, plots) est fait par le maçon du client d'après notre plan de maçonnerie ;
 *  Quentin contrôle les cotes avant de charger le camion. L'électricien du client amène le 230 V au pilier.
 */
function ptPose(c, V, R, ctx) {
  const RG = PT_ATELIER, Vi = c.visite, A = R.quant.achats, Mo = c.moteur && R.moteurs ? R.moteurs.choisi : null;
  const P = { ouvrages: [], reservations: [], electricite: [], essais: [], prerequis: [], controle: [], notes: [] };
  const NOUS = "Auboiacier", ELEC = "Électricien du client", MACON = "Maçon du client (d'après notre plan)";
  let rep = 0;
  // m3 : le volume de béton de l'ouvrage (pour le chiffrage de la maçonnerie, lot 7) ; 0 s'il n'y a pas de béton.
  const ouvrage = (nom, qte, cotes, quiFait = NOUS, delai = "", m3 = 0) => P.ouvrages.push({ rep: ++rep, nom, qte, cotes, quiFait, delai, m3: Math.round(m3 * 1000) / 1000 });
  const coul = c.type === "coulissant", gonds = c.type !== "coulissant", piliers = c.poteaux === "existants";
  let fouille = false;
  // Gonds : fixation selon le pilier, et l'effort au gond haut (m × g × e / h, affiché × 3).
  if (gonds && piliers) {
    const fix = Vi.support && PT_FIXATION_GONDS[Vi.support];
    ouvrage("Fixation des gonds dans les piliers", A.gonds || 0, fix || "matière des piliers à relever à la visite : fixation à choisir sur place", NOUS, fix && /chimique/.test(fix) ? "scellement chimique : temps de prise de la fiche du produit" : "");
    const g = V.find((x) => x.gonds), kg = ctx.kgV[V.indexOf(g)].kg, ys = g.gondsY || [];
    if (ys.length > 1) {
      const h = (ys[ys.length - 1] - ys[0]) / 1000, e = (g.x1 - g.x0) / 2000, F = kg * 9.81 * e / h / 10;
      P.notes.push(`Effort au gond haut : ${ptKg(kg)} kg × 9,81 × ${ptKg(e)} m ÷ ${ptKg(h)} m ≈ ${Math.round(F)} daN ; fixation prévue pour ${Math.round(3 * F)} daN (coefficient 3).`);
    }
  }
  if (c.poteaux !== "existants" && R.quant.massif) {
    const m = R.quant.massif;
    const pl = RG.platinePoteau;
    ouvrage("Massifs des poteaux", 2, `${ptMm(m.cote)} × ${ptMm(m.cote)} × ${ptMm(m.prof)} mm, cage d'armature ${m.cage} ; poteaux sur platine ${pl.cote} × ${pl.cote} × ${pl.ep} : ${pl.tiges} tiges M${pl.d} noyées au gabarit que nous fournissons${gonds ? " (gonds posés à l'atelier)" : ""}`, MACON, "coulés 7 jours au moins avant la pose", 2 * (m.cote / 1000) ** 2 * m.prof / 1000);
    ouvrage("Poteaux boulonnés sur les massifs", 2, `platines de niveau, poteaux d'aplomb`, NOUS);
    fouille = true;
  }
  if (R.quant.butee) ouvrage("Butée centrale basse, scellée au sol", 1, `${R.quant.butee.h} mm au-dessus du sol fini, au milieu du passage ; scellement chimique`, NOUS, "temps de prise de la fiche du produit");
  if (R.quant.plots) { const pl = R.quant.plots; ouvrage("Plots béton des arrêts de vantail ouvert", pl.n, `${pl.l} × ${pl.p} × ${pl.h} mm, à ${pl.aBout} mm du bout du vantail ouvert`, MACON, "coulés 7 jours au moins avant la pose", pl.n * pl.l * pl.p * pl.h / 1e9); fouille = true; }
  if (A.verrou) ouvrage("Gâche de sol du verrou (vantail fixe)", 1, "Ø 30 environ, 60 de profondeur, au droit du verrou", NOUS);
  if (coul && c.guidage === "rail") {
    const L = c.P + R.quant.longueurPortail + 300;
    ouvrage("Longrine du rail, DE NIVEAU", 1, `${ptMm(L)} × 300 × 300 mm (passage + place de rangement), fers 4 HA 10, rail scellé dessus ; seuil ${Vi.seuil === "existant" ? "existant à contrôler (niveau ± 2 mm)" : Vi.seuil === "neuf" ? "neuf" : "à relever (neuf ou existant)"} ; nous scellons le rail`, MACON, "coulée 7 jours au moins avant la pose", L / 1000 * 0.3 * 0.3);
    fouille = true;
  }
  if (coul && c.guidage === "auto" && R.quant.massifQueue) {
    ouvrage("Massif de l'autoportant", 1, `${ptMm(R.quant.massifQueue)} × 600 × 600 mm, depuis la face extérieure du pilier ; platines des chariots sur 4 chevilles chimiques M12 chacune${R.quant.chariots ? ` ; chariots à ${ptMm(Math.abs(R.quant.chariots[0] - R.quant.chariots[1]))} mm l'un de l'autre (à recaler sur la notice du kit)` : ""}`, MACON, "coulé 7 jours au moins avant la pose", R.quant.massifQueue / 1000 * 0.6 * 0.6);
    P.notes.push("Autoportant : réception à 60 mm, avec 5 mm de jeu dans le V ; guide haut au poteau.");
    fouille = true;
  }
  if (coul) {
    P.notes.push(`Coulissant : place de rangement libre de ${ptMm(R.quant.longueurPortail + (R.quant.queue || 0))} mm le long de la clôture${Vi.cloture ? ` (clôture ${Vi.cloture === "aucune" ? "absente" : Vi.cloture})` : " (clôture à relever)"} ; guide haut, butée arrière et réception.`);
  }
  if (c.type === "pliant") P.notes.push("Pliant : 2 kits de pli FAC (pivots haut et bas), U de guidage 40 × 40 sur 1,9 m fixé au pilier ; pas de rail au sol (seulement la butée centrale basse). Une fois ouvert, il occupe un peu plus de la moitié du passage.");
  // Moteur : socle, gaines, électricité, essais.
  if (Mo) {
    if (coul) { ouvrage("Socle du moteur, maçonné", 1, "600 × 400 mm, 400 de profondeur, côté où le portail se range, à l'intérieur ; tiges filetées qui dépassent de 25 à 35 mm (cotes de la notice)", MACON, "coulé 7 jours au moins avant la pose du moteur", 0.6 * 0.4 * 0.4); fouille = true; }
    P.reservations.push({ nom: "Gaine rouge du 230 V jusqu'au pilier de l'armoire", quiFait: ELEC, detail: "câble U-1000 R2V enterré, grillage avertisseur rouge au-dessus" });
    P.reservations.push({ nom: "Gaine basse tension séparée (cellules, feu)", quiFait: NOUS, detail: "distance avec le 230 V à confirmer dans la NF C 15-100" });
    if (c.type === "battant" && c.nbV === 2) {
      // Tranchée et gaine : le maçon du client, d'après notre plan (décision de Quentin du 07/10/2026) ; nous passons les câbles.
      P.reservations.push({ nom: "Traversée de l'allée pour M2 (tranchée et gaine)", quiFait: MACON, detail: `${ptMm(c.P + 600)} mm environ ; 0,50 m sous un jardin, 0,85 m sous un passage de voiture (à confirmer) ; AVANT tout revêtement neuf (le client en est prévenu à la commande) ; nous passons les câbles` });
      fouille = true;
    }
    P.reservations.push({ nom: "Boîte de coupure au pied du pilier de l'armoire", quiFait: NOUS, detail: "" });
    P.electricite.push(
      "Ligne dédiée 10 A, différentiel 30 mA, coupure omnipolaire (électricien du client, hors devis)",
      "Alimentation enterrée U-1000 R2V : 3G1,5 jusqu'à 30 m, 3G2,5 au-delà (chute de tension à vérifier)",
      ...(c.type === "battant" ? ["Moteurs : H07RN-F 3G1,5 entre l'armoire et les moteurs seulement, 20 m au plus"] : []),
      "Cellules : émetteur 2 × 0,75, récepteur 4 × 0,75 ; sortie de câble à 400-600 mm du sol, côté rue",
      "Feu : 2 × 0,75 et câble d'antenne RG58, sur le pilier de l'armoire",
      "Commande fixe à 1 500 mm du sol au moins ; parafoudre conseillé");
    P.essais.push("Inversion du mouvement sur un objet de 50 mm à mi-hauteur", "Cellules (coupure du faisceau pendant la fermeture)", "Déverrouillage manuel", "Forces, si elles sont mesurées : 400 N en zone d'écrasement, 1 400 N au choc, retour sous 25 N en moins de 5 s (valeurs à vérifier dans la NF EN 12453)");
  }
  P.maconnerieClient = P.ouvrages.some((o) => o.quiFait === MACON);
  if (P.maconnerieClient) {
    P.notes.push("Maçonnerie (béton) : faite par le maçon du client d'après notre plan de maçonnerie, remis 15 jours avant ; coulée 7 jours au moins avant la pose (le béton durcit en quelques heures, mais il ne porte un portail et ses fixations qu'après plusieurs jours : environ 70 % de sa résistance à 7 jours, toute sa résistance à 28 jours).");
    P.notes.push("Avant de charger le camion : contrôle des ouvrages du maçon (cotes à ± 10 mm, niveau, aplomb), sur photos cotées ou sur place.");
  }
  if (fouille) P.notes.push(`Avant toute fouille (massifs, longrine, socle, tranchée) : DT-DICT sur le guichet unique (reseaux-et-canalisations.ineris.fr)${Vi.reseaux ? ` : ${Vi.reseaux}` : " : date de la réponse à noter"} ; fouille à la main près d'un réseau repéré.`);
  // Rien n'est prêt le jour prévu : le client prévient pour décaler (décision de Quentin du 07/10/2026 : pas de forfait).
  P.prerequis.push("Si quelque chose n'est pas prêt (maçonnerie, courant, accès), le client nous prévient par mail ou par téléphone pour décaler la pose", "Accès et place dégagés le jour de la pose", ...(P.maconnerieClient ? ["Maçonnerie faite par son maçon d'après notre plan, coulée 7 jours au moins avant la pose"] : []), ...(Mo ? ["Courant amené au pilier de l'armoire (si prévu)"] : []), "Déclaration préalable accordée, s'il en faut une (le client la dépose avec notre dessin)", "Réseaux signalés (DT-DICT)");
  P.controle.push(`Jeux : ${RG.jeuGonds} mm côté gonds, ${RG.jeuCentre} mm au centre ou côté serrure, sur toute la course`, "Aplomb des vantaux", "Manœuvre à la main : effort mesuré au peson (valeur de référence dans la norme)", "Butées et arrêts", "Serrure et verrou");
  P.betonM3 = Math.round(P.ouvrages.reduce((x, o) => x + o.m3, 0) * 1000) / 1000;
  R.pose = P;
  // --- Vue d'implantation : la vue de dessus + les ouvrages de pose ---
  const D = R.vues.dessus.filter((p) => !(p.t === "texte" && p.txt === "place libre")).map((p) => p);
  const pil = ctx.pil, bP = pil.b, xG = -bP / 2, xD = c.P + bP / 2;
  if (Mo && c.type === "battant") {
    const cote = Vi.courant === "droite" ? "droite" : "gauche", xA = cote === "droite" ? xD : xG;
    ctx.geos.forEach((g, i) => {
      const a = g.monde([-40, g.axe[1] + 140]), b = g.monde([g.jeu + 0.42 * g.w, g.axe[1] + 30]);
      D.push({ t: "poly", piece: Mo.cle === "axovia" ? "Bras du moteur" : "Vérin", cls: "t-acier", ouvert: true, pts: [a, b] });
      const m1 = (g.gauche ? "gauche" : "droite") === cote;
      D.push({ t: "texte", p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], txt: m1 ? "M1" : "M2", pos: "sur" });
    });
    D.push({ t: "poly", piece: "Armoire", cls: "t-acier-plein", pts: ptRect(xA - 150, pil.y1 + 20, xA + 150, pil.y1 + 140) });
    D.push({ t: "texte", p: [xA, pil.y1 + 140], txt: Vi.courant === "gauche" || Vi.courant === "droite" ? "armoire" : "armoire (côté du courant, à relever)", pos: "sur" });
    D.push({ t: "poly", cls: "t-cache", ouvert: true, pts: [[xG, pil.y1 + 260], [xD, pil.y1 + 260]] });
    D.push({ t: "texte", p: [c.P / 2, pil.y1 + 260], txt: "traversée de l'allée (M2) : gaine enterrée", pos: "sur" });
  }
  if (Mo) {
    for (const x of [xG, xD]) D.push({ t: "poly", piece: "Cellules", cls: "t-acier-plein", pts: ptRect(x - 30, pil.y0 - 40, x + 30, pil.y0) });
    D.push({ t: "texte", p: [xG, pil.y0 - 40], txt: "cellules (400 à 600 du sol)", pos: "sous", decal: 1.6 });
  }
  if (coul) {
    const yG = ctx.yG, e = c.M.cadre.e, gauche = c.sens === "gauche";
    if (c.guidage === "rail") {
      const L = c.P + R.quant.longueurPortail + 300, x0 = gauche ? c.P + 150 - L : -150, x1 = x0 + L;
      D.unshift({ t: "poly", piece: "Longrine", cls: "t-mur", pts: ptRect(x0, yG + e / 2 - 150, x1, yG + e / 2 + 150) });
      D.push({ t: "cote", a: [x0, yG + e / 2 - 150], b: [x1, yG + e / 2 - 150], cote: "bas", d: 3.4, txt: `longrine ${ptMm(L)}, de niveau` });
    }
    if (Mo) {
      const xs = gauche ? -bP - 700 : c.P + bP + 100;
      D.unshift({ t: "poly", piece: "Socle du moteur", cls: "t-mur", pts: ptRect(xs, yG + e + 40, xs + 600, yG + e + 440) });
      D.push({ t: "texte", p: [xs + 300, yG + e + 440], txt: "socle du moteur 600 × 400", pos: "sur" });
    }
  }
  R.vues.pose = D;
  // --- Coupe de pose : ce qui est sous le sol, avec les profondeurs ---
  const K = [{ t: "sol", x1: -400, x2: 2600 }];
  let x = 0;
  const bloc = (nom, l, h, txt) => { K.push({ t: "poly", piece: nom, cls: "t-mur", pts: ptRect(x, -h, x + l, 0) }); K.push({ t: "cote", a: [x, -h], b: [x + l, -h], cote: "bas", d: 1, txt: ptMm(l) }); K.push({ t: "cote", a: [x + l, -h], b: [x + l, 0], cote: "droite", d: 1, txt: ptMm(h) }); K.push({ t: "texte", p: [x + l / 2, 0], txt, pos: "sur" }); x += l + 500; };
  if (R.quant.massif && c.poteaux !== "existants") bloc("Massif de poteau", R.quant.massif.cote, R.quant.massif.prof, "massif de poteau");
  if (R.quant.plots) bloc("Plot d'arrêt", RG.plotArret.l, RG.plotArret.h, "plot d'arrêt");
  if (coul && c.guidage === "rail") bloc("Longrine", 300, 300, "longrine (rail dessus)");
  if (coul && c.guidage === "auto") bloc("Massif de l'autoportant", 600, 600, "massif de l'autoportant");
  if (Mo && coul) bloc("Socle du moteur", 600, 400, "socle du moteur");
  if (Mo && c.type === "battant" && c.nbV === 2) {
    for (const [dx, prof, ou] of [[60, 500, "sous un jardin"], [560, 850, "sous un passage de voiture"]]) {
      K.push({ t: "cercle", piece: "Gaine", cls: "t-rond", c: [x + dx, -prof], r: 32 });
      K.push({ t: "cote", a: [x + dx + 32, -prof], b: [x + dx + 32, 0], cote: "droite", d: 1, txt: ptMm(prof) });
      K.push({ t: "texte", p: [x + dx, -prof - 32], txt: ou, pos: "sous" });
    }
    K.push({ t: "texte", p: [x + 300, 0], txt: "gaine de la traversée (à confirmer)", pos: "sur" });
  }
  R.vues.poseCoupe = K.length > 1 ? K : [];
  // --- Élévation côté propriété (si motorisé) : le portail vu de l'intérieur (miroir de la vue de face, sans cotes), les
  // vérins ou bras à leur hauteur (selon la notice : à relever), l'armoire sur le pilier du courant, le feu, les cellules.
  const E = [];
  if (Mo) {
    const miroir = (pts) => pts.map(([x, y]) => [c.P - x, y]);
    for (const p of R.vues.face) {
      if (p.t === "poly") E.push({ ...p, pts: miroir(p.pts) });
      else if (p.t === "cercle") E.push({ ...p, c: [c.P - p.c[0], p.c[1]] });
      else if (p.t === "sol") E.push({ ...p });
    }
    const hAxe = c.gs + Math.round((c.H - c.gs) * 0.4);   // hauteur de l'axe : selon la notice ; au dessin, aux 2/5
    // Vu de l'intérieur, la gauche de la rue est à droite : le pilier du courant est donc retourné.
    const xPil = (cote) => (cote === "gauche" ? c.P + bP / 2 : -bP / 2);
    const cote = Vi.courant === "droite" ? "droite" : "gauche";
    if (c.type === "battant") {
      for (const g of ctx.geos) {
        const xp = g.gauche ? c.P + 60 : -60, xv = g.gauche ? c.P - (g.jeu + 0.42 * g.w) : g.jeu + 0.42 * g.w;
        E.push({ t: "poly", piece: Mo.cle === "axovia" ? "Bras du moteur" : "Vérin", cls: "t-acier-plein", pts: [[xp, hAxe - 30], [xv, hAxe - 30], [xv, hAxe + 30], [xp, hAxe + 30]] });
      }
      E.push({ t: "cote", a: [c.P / 2, 0], b: [c.P / 2, hAxe], cote: "droite", d: 1, txt: ptMm(hAxe) });
      E.push({ t: "texte", p: [c.P / 2, hAxe + 30], txt: "axe du moteur : hauteur selon la notice", pos: "sur" });
      E.push({ t: "poly", piece: "Renfort de patte moteur", cls: "t-acier", pts: ptRect(c.P - (ctx.geos[0].jeu + 0.42 * ctx.geos[0].w) - 100, hAxe - 40, c.P - (ctx.geos[0].jeu + 0.42 * ctx.geos[0].w) + 100, hAxe + 40) });
    }
    const xa = xPil(cote);
    E.push({ t: "poly", piece: "Armoire", cls: "t-acier-plein", pts: ptRect(xa - 120, 400, xa + 120, 700) });
    E.push({ t: "texte", p: [xa, 400], txt: "armoire", pos: "sous" });
    E.push({ t: "cercle", piece: "Feu", cls: "t-rond", c: [xa, c.H + 120], r: 60 });
    for (const x of [-bP / 2, c.P + bP / 2]) E.push({ t: "poly", piece: "Cellules", cls: "t-acier-plein", pts: ptRect(x - 30, 450, x + 30, 550) });
    E.push({ t: "texte", p: [c.P / 2, -60], txt: "Vue de l'intérieur (côté propriété) : la gauche de la rue est à droite", pos: "sous", convention: true });
  }
  R.vues.poseElev = E;
}

function ptCalculerPortail(v, modele, refs) {
  v = v || {};
  const c = ptEntrees(v, modele), RG = PT_ATELIER, M = c.M, G = RG.gonds, Vi = c.visite;
  c.decorRefs = refs || {};
  const R = { vues: { face: [], cote: [], dessus: [] }, debit: [], alertes: [], avertissements: [], oks: [], notes: [], resume: [], tubes: [], acierM2: 0, poids: 0 };
  const F = R.vues.face, C = R.vues.cote, D = R.vues.dessus;
  const q = { soudures: 0, soudureM: 0, achats: {}, rosaces: 0, volutes: 0, vide: 0 };
  const cleBornes = c.type;
  const [pMin, pMax] = RG.bornes.P[cleBornes], [hMin, hMax] = RG.bornes.H;
  const piliers = c.poteaux === "existants", aGonds = c.type !== "coulissant", coul = c.type === "coulissant";
  const marge = RG.margeSol;

  // --- Contrôles des entrées ---
  if (c.P < pMin || c.P > pMax) R.alertes.push(`Passage de ${ptMm(c.P)} mm : le ${c.nomModele.toLowerCase()} se fait de ${ptMm(pMin)} à ${ptMm(pMax)} mm.`);
  if (c.H < hMin || c.H > hMax) R.alertes.push(`Hauteur de ${ptMm(c.H)} mm : de ${ptMm(hMin)} à ${ptMm(hMax)} mm.`);
  if (c.forme !== "droit" && (c.fleche < 50 || c.fleche > Math.min(RG.bornes.fleche[1], RG.flecheMaxRatio * c.H))) R.alertes.push(`Flèche de ${ptMm(c.fleche)} mm : entre 50 et ${ptMm(Math.min(RG.bornes.fleche[1], RG.flecheMaxRatio * c.H))} mm pour cette hauteur.`);
  if (c.soub !== "aucun") {
    const hHaut = c.H - c.hSoub - RG.traverseInter - M.cadre.b - (c.forme === "creux" ? c.fleche : 0);
    if (c.hSoub < 250) R.alertes.push(`Soubassement de ${ptMm(c.hSoub)} mm : 250 mm au moins.`);
    else if (hHaut < 300) R.alertes.push(`Soubassement trop haut : il reste ${ptMm(Math.max(0, hHaut))} mm pour le remplissage du haut (300 au moins).`);
  }
  if (c.lisse && c.forme !== "droit") R.alertes.push("La lisse en chêne se pose sur un haut droit seulement : choisis « droit » ou retire la lisse.");
  if (c.mat === "alu" && c.remp === "croix") R.avertissements.push("Rosaces en alu : pièces à trouver chez un fournisseur, rendu moins « fer forgé ». À confirmer.");
  if (c.mat === "acier" && (c.remp === "panneau" || c.soub === "panneau")) R.notes.push("En acier, le panneau lisse est une tôle pleine : c'est le remplissage « plein ».");
  if (c.mouluresDemandees && !c.moulure) R.avertissements.push("Moulures : il faut un bas plein (tôle ou panneau) pour les poser.");
  if (c.mat === "acier" && c.remp === "lamesAlu") R.alertes.push("Lames alu sur un cadre acier : pas de mélange (corrosion). Choisis le cadre alu ou un autre remplissage.");
  if (c.pointes && c.mat === "alu") R.avertissements.push("Pointes de lance en alu : à trouver chez un fournisseur. À confirmer.");
  if (aGonds && (G.axeNu < G.plageNu[0] || G.axeNu > G.plageNu[1] || G.axeNu <= RG.jeuGonds)) R.alertes.push(`Axe des gonds à ${ptMm(G.axeNu)} mm du nu du pilier : il doit être dans la plage du gond (${G.plageNu[0]} à ${G.plageNu[1]} mm) et au-delà du jeu de ${RG.jeuGonds}.`);
  if (!piliers && RG.scellement < RG.scellementMin) R.alertes.push(`Poteaux scellés sur ${ptMm(RG.scellement)} mm : ${ptMm(RG.scellementMin)} mm au moins dans le massif.`);
  // Le pliant n'est pas validé : bornes et tableau FAC à relire sur la notice (cahier : pas de pliant en ligne avant).
  if (c.type === "pliant") R.avertissements.push(`Pliant à confirmer : notice FAC KC7101 non relue. Bornes du pliant (${ptMm(RG.bornes.P.pliant[0])} à ${ptMm(RG.bornes.P.pliant[1])} mm de passage total) et poids du tableau FAC à aligner (la largeur A du tableau FAC est-elle un côté ou le passage total ?). Pas de pliant en ligne avant.`);

  // --- Vantaux ---
  const V = ptVantaux(c);
  const xa = Math.min(...V.map((x) => x.x0)), xb = Math.max(...V.map((x) => x.x1));
  const xm = V.length === 2 ? (V[0].x1 + V[1].x0) / 2 : (xa + xb) / 2;

  // --- Coulissant sur rail : les roues selon le poids, et la garde au sol jamais sous la roue et son support ---
  // (le poids ne dépend pas de la garde au sol : un premier dessin, jeté, le donne)
  let roue = null;
  if (coul && c.guidage === "rail") {
    const p0 = [], q0 = { soudures: 0, soudureM: 0, achats: {}, rosaces: 0, volutes: 0, vide: 0 };
    ptDessinerVantail(c, { ...V[0] }, ptLigneHaut(c, xa, xb, xm), [], p0, q0, V.length);
    roue = ptChoixRoue(p0.reduce((s, p) => s + (p.kg != null ? p.kg : p.kgM * p.long / 1000), 0));
    if (roue) {
      const gsRoue = roue.d + RG.roueSupport;
      if (!c.gsDonne) c.gs = Math.max(c.gs, gsRoue);
      else if (c.gs < gsRoue) R.alertes.push(`Garde au sol de ${ptMm(c.gs)} mm : la roue Ø ${roue.d} et son support (${RG.roueSupport} mm, à relever) montent à ${ptMm(gsRoue)} mm et entreraient dans la traverse basse. ${ptMm(gsRoue)} mm au moins.`);
    }
  }

  // --- Relevés de la visite (rien n'est supposé quand ils manquent) ---
  if (c.Psource === "clairs") {
    const cl = [["haut", Vi.clairHaut], ["milieu", Vi.clairMilieu], ["bas", Vi.clairBas]].filter(([, x]) => x !== null);
    const ptPdonne = v.ptP !== undefined && v.ptP !== null && v.ptP !== "" && c.Pdonne !== c.P;
    R.notes.push(`Passage pris au plus petit clair relevé : ${ptMm(c.P)} mm (${cl.map(([k, x]) => `${k} ${ptMm(x)}`).join(", ")})${ptPdonne ? `, au lieu des ${ptMm(c.Pdonne)} mm donnés` : ""}.`);
  }
  if (piliers && (Vi.pilierEtat === "fissure" || Vi.pilierEtat === "nonArme")) {
    const etat = Vi.pilierEtat === "fissure" ? "fissuré" : "non armé";
    if (aGonds) R.alertes.push(`Pilier ${etat} : pas de gonds dessus. Poteau devant le pilier ou reprise du pilier, sur étude (photos des piliers au dossier).`);
    else R.avertissements.push(`Pilier ${etat} : le guide haut et la réception s'y fixent. Poteau ou reprise du pilier, à voir.`);
  }
  if (piliers && aGonds && Vi.gondBord !== null) {
    if (Vi.gondBord < G.areteMin) R.alertes.push(`Axe du gond à ${ptMm(Vi.gondBord)} mm de l'arête côté propriété : ${G.areteMin} mm au moins, sinon le pilier éclate au perçage. Poteau ou platine déportée, sur étude.`);
    else R.oks.push(`Axe du gond à ${ptMm(Vi.gondBord)} mm de l'arête côté propriété (${G.areteMin} au moins).`);
  }
  if (Vi.denivele !== null && Math.abs(Vi.denivele) > c.gs - marge) R.avertissements.push(`Différence de niveau de ${ptMm(Math.abs(Vi.denivele))} mm entre les piliers : plus que la garde au sol moins ${marge} mm (${ptMm(c.gs - marge)}). ${coul ? "Reprise du sol" : "Bas du vantail en biais"}, sur devis.`);

  // --- Ligne du haut et dessin des vantaux ---
  const haut = ptLigneHaut(c, xa, xb, xm);
  const pieces = [];
  const parVantail = [];
  for (const vt of V) {
    const p0 = pieces.length;
    ptDessinerVantail(c, vt, haut, F, pieces, q, V.length);
    const kg = pieces.slice(p0).reduce((s, p) => s + (p.kg != null ? p.kg : p.kgM * p.long / 1000), 0);
    parVantail.push({ nom: vt.nom, l: vt.x1 - vt.x0, kg });
  }
  if (c.moulure && q.mouluresRefus) R.avertissements.push(`Moulures : le bas plein est trop petit pour un médaillon (${c.mat === "acier" ? "250 × 100" : "340 × 170"} au moins) : agrandissez le bas, ou à étudier à la visite.`);
  const largeurs = V.map((x) => x.x1 - x.x0);
  const vMax = Math.max(...largeurs);
  if (c.type === "battant") {
    if (vMax > RG.vantailMax[c.mat]) R.alertes.push(`Vantail de ${ptMm(vMax)} mm : trop large en ${M.nom.toLowerCase()} (${ptMm(RG.vantailMax[c.mat])} au plus). ${c.nbV === 1 ? "Passe en 2 vantaux" : "Passe en coulissant"}.`);
    else R.oks.push(`Vantail de ${ptMm(vMax)} mm : dans la limite de ${ptMm(RG.vantailMax[c.mat])} mm en ${M.nom.toLowerCase()}.`);
  }

  // --- Jeux au dessin : côté gonds 30, au centre et côté serrure 25 (jamais entre 8 et 25) ---
  const aGondsV = V.filter((x) => x.gonds), geos = aGondsV.map((vt) => ptGeoGond(c, vt));
  const centre = c.type === "battant" && c.nbV === 2 ? V[1].x0 - V[0].x1 : c.type === "pliant" ? V[2].x0 - V[1].x1 : null;
  const serrure = (c.type === "battant" && c.nbV === 1) || c.type === "portillon" ? (c.sens === "gauche" ? c.P - V[0].x1 : V[0].x0) : null;
  R.jeux = { gonds: aGonds ? RG.jeuGonds : null, centre, serrure, auxGonds: null, course: [], reglage: null };
  const [z0, z1] = RG.zonePincement;
  for (const [nom, j] of [["au centre", centre], ["côté serrure", serrure]]) if (j !== null && j > z0 && j < z1) R.alertes.push(`Jeu ${nom} de ${ptMm1(j)} mm : entre ${z0} et ${z1} mm, un doigt peut s'y pincer.`);
  if (c.type === "pliant") R.avertissements.push(`Pliant : jeu de pli de ${RG.jeuPli} mm entre les panneaux d'un côté, dans la zone de ${z0} à ${z1} mm où un doigt se pince. Protège-doigts du kit FAC ou jeu à revoir. À confirmer.`);

  // Ce que porte chaque côté à gonds : son vantail (pliant : les 2 panneaux de ce côté).
  const porte = aGondsV.map((vt) => {
    if (c.type !== "pliant") return { l: vt.x1 - vt.x0, kg: parVantail[V.indexOf(vt)].kg };
    const cote = V.filter((x) => (vt.gonds === "gauche" ? x.x1 <= c.P / 2 : x.x0 >= c.P / 2));
    return { l: Math.max(...cote.map((x) => x.x1)) - Math.min(...cote.map((x) => x.x0)), kg: cote.reduce((s, x) => s + parVantail[V.indexOf(x)].kg, 0) };
  });
  const kgPorte = porte.length ? Math.max(...porte.map((x) => x.kg)) : 0, lPorte = porte.length ? Math.max(...porte.map((x) => x.l)) : 0;

  // --- Place derrière, pente, butée centrale basse et ses sabots (2 vantaux et pliant), butée de fermeture (1 vantail) ---
  const B = RG.butee, basSabot = B.h - B.recouvrement;
  const battant2 = c.type === "battant" && c.nbV === 2, unVantail = (c.type === "battant" && c.nbV === 1) || c.type === "portillon";
  const aButee = battant2 || c.type === "pliant", sabots = aButee && c.gs > basSabot;
  const [Vg, Vd] = c.type === "pliant" ? [V[1], V[2]] : [V[0], V[1]];
  const xmB = aButee ? (Vg.x1 + Vd.x0) / 2 : null;
  let place = 0;
  if (aGonds) {
    const places = new Map();   // les deux côtés sont souvent le miroir l'un de l'autre : un seul balayage
    for (const g of geos) { const k = JSON.stringify([g.cadre, g.axe]); if (!places.has(k)) places.set(k, ptPlaceDerriere(g, G.ouverture)); }
    place = Math.max(...places.values()) + 50;
    // Garde au sol − 15 (cahier §1) ; avec des sabots, le point le plus bas au bout du vantail est le sabot (15 mm).
    if (c.pente > c.gs - marge) R.alertes.push(`Le sol monte de ${ptMm(c.pente)} mm côté propriété : au bout du vantail, il reste moins de ${marge} mm sous le bas du vantail (garde au sol ${ptMm(c.gs)}), il frotterait. Il faut un coulissant, ou des gonds à rattrapage de pente (sur devis).`);
    else if (sabots && c.pente > basSabot - marge) R.alertes.push(`Le sol monte de ${ptMm(c.pente)} mm côté propriété : au bout du vantail, il reste moins de ${marge} mm sous le sabot de butée (bas à ${basSabot} mm du sol), il buterait et le vantail ne s'ouvrirait plus. Butée escamotable sans sabot (sur devis) ou coulissant.`);
    else if (c.pente > 0) R.oks.push(`Pente côté propriété : ${ptMm(c.pente)} mm, au plus la garde au sol moins ${marge} mm (${ptMm(c.gs - marge)}).`);
    R.resume.push(["Place derrière", `${ptMm(place)} mm`]);
  }
  if (aButee) {
    // Vu de la rue, la butée est devant les vantaux ; chaque vantail (pliant : chaque panneau côté centre) a son sabot.
    if (sabots) for (const [s0, s1] of [[Vg.x1 - B.sabot, Vg.x1], [Vd.x0, Vd.x0 + B.sabot]]) F.push({ t: "poly", piece: "Sabots de butée", cls: "t-acier-plein", pts: ptRect(s0, basSabot, s1, c.gs) });
    F.push({ t: "poly", piece: "Butée centrale", cls: "t-acier-plein", pts: ptRect(xmB - B.l / 2, 0, xmB + B.l / 2, B.h) });
  }
  // Vantail seul et portillon : butée de fermeture sur le pilier côté serrure, côté rue (vue de face : devant le vantail).
  const BF = RG.buteeFermeture;
  const xBF = unVantail ? (c.sens === "gauche" ? [V[0].x1 - BF.recouvre, c.P] : [0, V[0].x0 + BF.recouvre]) : null;
  if (xBF) F.push({ t: "poly", piece: "Butée de fermeture", cls: "t-acier-plein", pts: ptRect(xBF[0], V[0].serrureY - 20 - BF.h, xBF[1], V[0].serrureY - 20) });

  // --- Gonds : choisis selon le poids ---
  let gond = null;
  if (aGonds) {
    gond = ptChoixGond(c.mat, kgPorte);
    const quoi = c.type === "pliant" ? "Côté de pliant" : c.type === "portillon" ? "Portillon" : "Vantail";
    if (!gond) {
      const fort = Math.max(...PT_GONDS.filter((x) => x.mat === c.mat).map((x) => x.chargePaire));
      R.alertes.push(`${quoi} de ${ptKg(kgPorte)} kg : plus lourd que le plus fort des gonds en ${M.nom.toLowerCase()} (${fort} kg par paire). Sur étude.`);
    } else R.oks.push(`Gonds pour ${ptKg(kgPorte)} kg : ${gond.ref} (${gond.chargePaire} kg par paire${gond.releve ? "" : ", référence et charge à relever sur la notice"}).`);
  }

  // --- Poteaux (tableau PT_POTEAUX, massif = section + 300) ou piliers ---
  let poteau = null, prP = null, massif = null;
  if (!piliers) {
    const pm = PT_MATIERES[c.poteaux];
    poteau = ptChoixPoteau(c.type, c.poteaux, c.H, lPorte, kgPorte);
    if (poteau) prP = pm[poteau.profil];
    else {
      prP = pm.poteau;
      R.alertes.push(`Poteaux : ${aGonds ? `${c.type === "pliant" ? "côté" : "vantail"} de ${ptMm(lPorte)} mm et ${ptKg(kgPorte)} kg, ` : ""}hauteur ${ptMm(c.H)} mm, hors du tableau des poteaux. Sur étude.`);
    }
    const MS = RG.massif;
    massif = { n: 2, cote: prP.b + 2 * MS.marge, prof: MS.prof, scellement: RG.scellement, scellementMin: RG.scellementMin, cage: MS.cage, drainage: MS.drainage, semelleCommune: MS.semelleCommune };
    massif.m3 = Math.round(massif.n * massif.cote * massif.cote * massif.prof / 1e6) / 1e3;
    if (aGonds && G.platine > prP.b) R.alertes.push(`Platine de gond de ${G.platine} mm sur un poteau de ${prP.b} : elle ne tient pas dans sa face. Gond à souder ou poteau plus large, sur étude.`);
  }
  const pil = ptPiliers(c, prP, geos, Vi), bP = pil.b;
  const hPost = Math.max(haut(xa), haut(xb)) + 50;
  const posts = [[-bP, 0], [c.P, c.P + bP]];
  for (const [p0, p1] of posts) {
    if (prP) {
      F.push({ t: "poly", piece: "Poteaux", cls: "t-acier-plein", pts: ptRect(p0, 0, p1, hPost) });
      F.push({ t: "poly", cls: "t-cache", pts: ptRect(p0, -RG.scellement, p1, 0) });
    } else F.push({ t: "poly", cls: "t-mur t-pilier", pts: ptRect(p0, 0, p1, hPost + 100) });
  }
  if (prP) {
    const PP = RG.platinePoteau;
    const note = `${ptMm(RG.scellement)} mm scellés (${ptMm(RG.scellementMin)} au moins) dans un massif ${ptMm(massif.cote)} × ${ptMm(massif.cote)} × ${ptMm(massif.prof)}, cage d'armature ${massif.cage}, trou de drainage Ø ${massif.drainage} au ras du béton, semelle commune conseillée (ou platine ${PP.cote} × ${PP.cote} × ${PP.ep}, ${PP.tiges} × M${PP.d})${aGonds ? " ; axe des gonds au milieu du poteau" : ""}`;
    for (let i = 0; i < 2; i++) pieces.push({ nom: "Poteau", mat: prP.nom, long: hPost + RG.scellement, kgM: ptKgM(prP, PT_MATIERES[c.poteaux].densite), peri: 4 * prP.b, coupes: "Coupe droite, chapeau soudé", note, groupe: "Poteaux" });
  } else if (Vi.pilierEtat !== "sain") R.notes.push("Piliers existants : à vérifier sur place (parpaing creux ou fissuré : ils ne tiennent pas un portail battant).");

  // --- Coulissant : rail, roues, queue de l'autoportant ---
  const Lg = coul ? V[0].x1 - V[0].x0 : 0;
  const queue = coul && c.guidage === "auto" ? Math.max(RG.queueMini, Math.ceil(RG.queueAuto * c.P / RG.queuePas) * RG.queuePas) : 0;
  const gauche = c.sens === "gauche";
  const yG = pil.y1 + 30;   // coulissant : sa face côté rue, 30 mm derrière les piliers (vues de dessus et de côté)
  if (coul) {
    const course = c.P + RG.recouvrement.reception;
    R.resume.push(["Place le long de la clôture", `${ptMm(Lg + queue)} mm`]);
    if (c.guidage === "rail") {
      const kgP = parVantail[0].kg;
      if (!roue) R.alertes.push(`Coulissant de ${ptKg(kgP)} kg : plus lourd que les roues du tableau (${Math.max(...PT_ROUES.map((x) => x.kgMax))} kg au plus). Sur étude.`);
      else R.oks.push(`Roues Ø ${roue.d} sur rail Ø ${roue.rail} : jusqu'à ${roue.kgMax} kg, pour ${ptKg(kgP)} kg ; garde au sol ${ptMm(c.gs)} (roue + support de ${RG.roueSupport} mm).`);
      const hRoue = roue ? roue.d : 90, rd = hRoue / 2;
      const railL = Lg + course;
      const r0 = gauche ? V[0].x0 - course : V[0].x0, r1 = r0 + railL;
      F.push({ t: "poly", piece: "Rail au sol", cls: "t-acier-plein", pts: ptRect(r0, -10, r1, 0) });
      for (const xr of [V[0].x0 + 300, V[0].x1 - 300]) {
        F.push({ t: "cercle", piece: "Roues", cls: "t-rond", c: [xr, rd], r: rd });
        if (c.gs > hRoue) F.push({ t: "poly", piece: "Roues", cls: "t-acier-plein", pts: ptRect(xr - 30, hRoue, xr + 30, c.gs) });   // support, sous la traverse basse
      }
      pieces.push({ nom: "Rail à sceller", mat: "Rail acier galvanisé (à gorge)", long: railL, kgM: 2.5, peri: 0, coupes: "Coupe droite", note: `${roue ? `Rail Ø ${roue.rail}, roues Ø ${roue.d} : ` : ""}scellé de niveau sur une bande de béton`, groupe: "Guidage" });
      q.achats.roues = 2; q.achats.guideHaut = 1; q.achats.butees = 3;
    } else {
      const CH = RG.chariots;
      const xq0 = gauche ? V[0].x0 - queue : V[0].x1, xq1 = gauche ? V[0].x0 : V[0].x1 + queue;
      const xe = gauche ? xq0 : xq1, xBout = gauche ? V[0].x0 : V[0].x1;
      F.push({ t: "poly", piece: "Queue de l'autoportant", cls: "t-cache", pts: ptRect(xq0, c.gs, xq1, c.gs + 120) });
      F.push({ t: "poly", piece: "Queue de l'autoportant", cls: "t-cache", ouvert: true, pts: [[xBout, haut(xBout)], [xe, c.gs + 120]] });
      F.push({ t: "texte", p: [(xq0 + xq1) / 2, c.gs + 120], txt: "derrière la clôture", pos: "sur", decal: 0.2 });
      // Les deux chariots sont sur le massif, sous la queue : le 1er à 200 mm du pilier, le 2e à 100 mm du bout de la queue.
      const xc1 = gauche ? -bP - CH.aPilier : c.P + bP + CH.aPilier, xc2 = gauche ? xq0 + CH.aBout : xq1 - CH.aBout;
      for (const xg of [xc1, xc2]) F.push({ t: "cercle", piece: "Chariots", cls: "t-cache", c: [xg, c.gs / 2], r: 25 });
      q.chariots = [xc1, xc2];
      q.massifQueue = queue + CH.massifEnPlus;
      if ((gauche ? xc1 - xc2 : xc2 - xc1) < 500) R.avertissements.push(`Autoportant : les chariots ne sont qu'à ${ptMm(Math.abs(xc1 - xc2))} mm l'un de l'autre (pilier large ou queue courte). Sur étude, avec le tableau Comunello.`);
      pieces.push({ nom: "Poutre autoportante", mat: "Kit autoportant (poutre, 2 chariots, roulette, réception)", long: Lg + queue, kgM: 0, peri: 0, coupes: "Selon le kit", note: "Vissée sous la traverse basse", groupe: "Guidage", achat: true });
      pieces.push({ nom: "Traverse de queue", mat: M.cadre.nom, long: Math.hypot(queue, haut(xBout) - c.gs - 120), kgM: ptKgM(M.cadre, M.densite), peri: ptPerimetre(M.cadre), coupes: "Coupes d'onglet", note: "Diagonale de la queue", groupe: "Cadre" });
      q.achats.kitAutoportant = 1; q.achats.guideHaut = 1;
    }
    if (c.P > 5000 && c.mat === "acier") R.avertissements.push(`Coulissant acier de ${ptMm(Lg)} mm : lourd, moteur à dimensionner.`);
  }

  // --- Jeu côté gonds sur toute la course (de fermé à ouvert au maximum), au droit des platines, et réglage ---
  const r1 = (x) => Math.round(x * 10) / 10;
  // Les deux côtés à gonds sont le plus souvent le miroir l'un de l'autre : même calcul, fait une fois.
  const dejaVu = new Map(), jeuCourse = (g, ya, obst) => {
    const k = JSON.stringify([g.pieces || [g.montant], g.axe, Number.isFinite(g.yAvant) ? g.yAvant : null, Number.isFinite(ya) ? ya : null, obst || null]);
    if (!dejaVu.has(k)) dejaVu.set(k, ptJeuCourse(g, ya, G.ouverture, obst));
    return dejaVu.get(k);
  };
  geos.forEach((g, i) => {
    g.yAvant = pil.yAvant;
    const r = jeuCourse(g, pil.yArete);
    const rp = jeuCourse({ ...g, pieces: [g.montant] }, null, g.platine);
    R.jeux.course.push({ vantail: aGondsV[i].nom, min: r1(r.min), angle: r.angle, auxGonds: r1(rp.min), brut: r.min });
  });
  if (R.jeux.course.length) {
    const pire = R.jeux.course.reduce((a, b) => (b.min < a.min ? b : a));
    const hyp = G.axeReleve ? "" : ` Selon l'hypothèse de l'atelier : axe du gond à ${G.axeDerriere} mm derrière le montant, à confirmer sur la notice du gond.`;
    if (pire.min < RG.jeuGondsMin) R.alertes.push(`Jeu côté gonds de ${ptMm1(pire.min)} mm à ${pire.angle}° d'ouverture (${pire.vantail.toLowerCase()}) : moins de ${RG.jeuGondsMin} mm, un doigt peut s'y pincer. Jeu ou position de l'axe du gond à revoir.${hyp}`);
    else if (G.axeReleve) R.oks.push(`Jeu côté gonds : ${ptMm1(pire.min)} mm au plus juste, de fermé à ouvert à ${G.ouverture}° (${RG.jeuGondsMin} au moins).`);
    else R.notes.push(`Jeu côté gonds : ${ptMm1(pire.min)} mm au plus juste, de fermé à ouvert à ${G.ouverture}° (${RG.jeuGondsMin} au moins).${hyp}`);
    // La platine du gond, vissée sur le nu, est dans le jeu : au droit des gonds, il reste jeu − épaisseur de la platine.
    const aux = Math.min(...R.jeux.course.map((x) => x.auxGonds));
    R.jeux.auxGonds = aux;
    if (aux > z0 && aux < z1) R.avertissements.push(`Au droit des gonds, la platine (${G.platineEp} mm, vissée sur le nu) ne laisse que ${ptMm1(aux)} mm au montant : dans la zone de ${z0} à ${z1} mm où un doigt se pince. Platine encastrée, protège-doigts, ou jeu porté à ${RG.jeuGondsMin + G.platineEp} mm au nu : à trancher.`);
    // Réglage sur chantier : régler l'axe déplace le vantail. Vers le pilier, le jeu côté gonds baisse (au plus 1 mm par
    // mm) ; vers le passage, le centre (les deux vantaux) ou le côté serrure baisse. On garde la plage qui tient tout.
    const kMax = Math.max(0, G.axeNu - G.plageNu[0]);
    const minA = (k) => Math.min(...geos.map((g) => { const h = g.decaler(-k); h.yAvant = pil.yAvant; return jeuCourse(h, pil.yArete).min; }));
    const m0 = Math.min(...R.jeux.course.map((x) => x.brut));
    let dMin = Math.max(0, Math.min(kMax, Math.floor(m0 - RG.jeuGondsMin + 1e-9)));
    while (m0 >= RG.jeuGondsMin && dMin < kMax && minA(dMin + 1) >= RG.jeuGondsMin - 1e-9) dMin++;
    const vers = centre !== null ? Math.floor((centre - z1) / 2 + 1e-9) : serrure !== null ? serrure - z1 : Infinity;
    const dMax = Math.max(0, Math.min(G.plageNu[1] - G.axeNu, vers));
    R.jeux.reglage = { axeMin: G.axeNu - dMin, axeMax: G.axeNu + dMax, plage: [...G.plageNu] };
    R.jeux.course.forEach((x) => { delete x.brut; });
  }

  // --- Galvaniseur, laqueur, remorque : chaque pièce doit y entrer ---
  const ePiece = Math.max(M.cadre.e, M.fort.e), dessus = Math.max(c.pointes ? RG.pointe.depasse + RG.pointe.h : 0, q.decor ? q.decor.cimierH : 0);
  const aFinir = V.map((vt) => ({
    nom: vt.coulissant && queue ? "Portail coulissant avec sa queue et sa poutre" : vt.nom,
    dims: [Math.round(vt.x1 - vt.x0 + (vt.coulissant ? queue : 0)), Math.round(Math.max(...ptCourbe(haut, vt.x0, vt.x1, 12).map(([, y]) => y)) - c.gs + dessus), ePiece],
    acier: c.mat === "acier",
  }));
  if (prP) aFinir.push({ nom: "Poteau", dims: [Math.round(hPost + RG.scellement), prP.b, prP.e], acier: c.poteaux === "acier" });
  const trop = ptFinition(aFinir), tropVus = new Map();
  for (const t of trop) {
    const k = `${t.ou}|${t.dims.join("×")}`;
    if (!tropVus.has(k)) tropVus.set(k, { ...t, noms: [] });
    if (!tropVus.get(k).noms.includes(t.nom)) tropVus.get(k).noms.push(t.nom);
  }
  // Limite relevée (la remorque, décision de Quentin) : alerte. Valeur courante à confirmer (cuve, four) : avertissement.
  for (const t of tropVus.values()) {
    const quoi = `${t.noms.join(" et ")} de ${ptMm(t.dims[0])} × ${ptMm(t.dims[1])} mm : plus grand que ${t.ou} (${t.lim}`;
    if (t.releve) R.alertes.push(`${quoi}) : ${t.ou === "la remorque" ? `réduire le passage${c.type === "coulissant" && c.guidage === "auto" ? ` (4 000 mm au plus sans rail) ou choisir le rail` : ""}.` : "réduire la cote."}`);
    else R.avertissements.push(`${quoi}, valeur courante à confirmer). À vérifier avant le devis : en deux parties si la vraie cote est plus petite.`);
  }

  let xMin = Infinity, xMax = -Infinity;   // une boucle, pas Math.min(...xs) : un très grand portail ferait déborder la pile
  for (const p of F) for (const [x] of p.pts || (p.c ? [p.c] : [])) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; }
  F.unshift({ t: "sol", x1: xMin - 300, x2: xMax + 300 });

  // --- Cotes de la vue de face ---
  F.push({ t: "cote", a: [0, 0], b: [c.P, 0], cote: "bas", d: 1.6, txt: `passage ${ptMm(c.P)}` });
  const aDroite = coul && gauche, xH = aDroite ? xb : xa, coteH = aDroite ? "droite" : "gauche";
  F.push({ t: "cote", a: [xH, c.gs], b: [xH, haut(xH)], cote: coteH, d: 2.6, txt: ptMm(c.H) });
  F.push({ t: "cote", a: [xH, 0], b: [xH, c.gs], cote: coteH, d: 1, txt: ptMm(c.gs) });
  if (c.forme !== "droit") {
    const xs = c.forme === "biais" && !(c.nbV === 2 || c.type === "pliant") ? (haut(xa) > haut(xb) ? xa : xb) : xm;
    F.push({ t: "cote", a: [aDroite ? xb : xa, 0], b: [aDroite ? xb : xa, haut(xs)], cote: coteH, d: 4.4, txt: `${ptMm(haut(xs))} ${c.forme === "creux" ? "au milieu" : "au plus haut"}` });
  }
  if (V.length > 1) V.forEach((x) => F.push({ t: "cote", a: [x.x0, Math.max(haut(x.x0), haut(x.x1))], b: [x.x1, Math.max(haut(x.x0), haut(x.x1))], cote: "haut", d: 1, txt: ptMm(x.x1 - x.x0) }));
  else F.push({ t: "cote", a: [V[0].x0, hPost], b: [V[0].x1, hPost], cote: "haut", d: 1, txt: `${coul ? "portail " : ""}${ptMm(V[0].x1 - V[0].x0)}` });
  if (c.soub !== "aucun") F.push({ t: "cote", a: [aDroite ? xa : xb, 0], b: [aDroite ? xa : xb, c.gs + c.hSoub], cote: aDroite ? "gauche" : "droite", d: 1, txt: ptMm(c.hSoub) });
  if (queue) F.push({ t: "cote", a: [gauche ? V[0].x0 - queue : V[0].x1, 0], b: [gauche ? V[0].x0 : V[0].x1 + queue, 0], cote: "bas", d: 1.6, txt: `queue ${ptMm(queue)}` });
  F.push({ t: "texte", p: [c.P / 2, 0], txt: "Vue côté rue : gauche et droite vus de la rue", pos: "sous", decal: 5, convention: true });

  // --- Vue de dessus : la place à prévoir ---
  const plots = c.type === "battant" || c.type === "portillon";
  ptVueDessus(c, V, D, queue, pil, R, { geos, aGondsV, place, butee: aButee, xmB, plots, xBF, yG, massifQueue: q.massifQueue || 0 });
  // --- Vue de côté : coupe du vantail près du poteau gauche ---
  ptVueCote(c, C, haut, xa, pil, prP, massif, coul ? yG : 0);

  // --- Quincaillerie et moteur (achats, sans prix) ---
  const A = q.achats, nG = c.H > G.troisAuDela ? 3 : 2;   // gonds par vantail (pliant : par côté), comme dessinés
  if (c.type === "battant" || c.type === "portillon") {
    A.gonds = nG * c.nbV; A.serrure = 1; A.poignees = 1; A.arrets = c.nbV;
    if (c.nbV === 2) { A.buteeCentrale = 1; if (sabots) A.sabotsButee = 2; A.verrou = 1; }
    else A.buteeFermeture = 1;
  } else if (c.type === "pliant") {
    A.gonds = nG * 2; A.charnieresPli = (c.H > 1800 ? 4 : 3) * 2; A.roulettesBout = 2; A.guidesSol = 2; A.buteeCentrale = 1; if (sabots) A.sabotsButee = 2; A.serrure = 1; A.verrou = 1; A.poignees = 1;
    R.avertissements.push("Pliant : charnières de pli, roulettes et guides au sol à choisir chez un fournisseur. À confirmer.");
  } else { A.serrure = 1; A.poignees = 1; }
  // Le moteur (lot 4) : les solutions permises pour CE portail, le conseillé, le choix du client (ptMoteurModele).
  R.moteurs = ptMotorisation(c, V, R, { kgV: parVantail, Lg, coul });
  if (c.moteur) {
    const Mo = R.moteurs.choisi;
    if (Mo) {
      A.moteur = `${Mo.nom} (${Mo.ref}) : ${Mo.contenu}`;
      if (c.type === "coulissant") A.cremaillereM = Math.ceil(Lg / 1000);
      if (R.moteurs.barrePalpeuse) A.barrePalpeuse = 1;
    }
    // Portillon : jamais de moteur (note, rien n'est chiffré). Ailleurs, pas de solution permise : sur étude (rouge).
    const refusChoisi = c.moteurModele ? R.moteurs.refus.find((m) => m.cle === c.moteurModele) : null;
    if (!Mo && c.type === "portillon") R.notes.push("Portillon : pas de moteur (gâche électrique et ferme-portillon, sur devis).");
    else if (!Mo && c.type === "pliant") R.alertes.push(`Pliant motorisé : ${R.moteurs.refus[0].raison}.`);
    else if (!Mo) R.alertes.push(refusChoisi
      ? `Moteur ${refusChoisi.nom} : ${refusChoisi.raison}.${R.moteurs.conseille ? ` ${R.moteurs.conseille.nom} convient.` : " Sur étude."}`
      : `Moteur : aucun kit Somfy ne convient (${R.moteurs.refus.map((m) => `${m.nom} : ${m.raison}`).join(" ; ")}). Sur étude.`);
    for (const n of R.moteurs.notes) R.notes.push(n);
    if (c.type !== "portillon" && Mo) R.notes.push("Motorisé : pose selon NF EN 12453 (cellules, feu clignotant, réglage des efforts) ; déclaration de conformité machine (directive 2006/42/CE jusqu'au 19/01/2027, règlement (UE) 2023/1230 ensuite).");
    if (aButee) R.notes.push("Motorisé : butée centrale selon la notice du moteur, sans basculeur.");
  }
  R.notes.push("Portail : DoP et étiquette CE (NF EN 13241).");
  R.notes.push("Gauche et droite : toujours vus de la rue, face au portail (comme sur les vues).");
  R.notes.push("Ouverture toujours côté propriété : jamais sur le trottoir ni la route.");
  R.notes.push("Mairie : le plan local d'urbanisme peut fixer hauteur et couleur, et demander une déclaration préalable.");
  if (aGonds) {
    const jeux = centre !== null
      ? `${RG.jeuGonds} mm côté gonds au dessin (${RG.jeuGondsMin} au moins sur toute la course) et ${RG.jeuCentre} mm au centre (décisions de Quentin des 06 et 07/10/2026)`
      : `${RG.jeuGonds} mm côté gonds au dessin (${RG.jeuGondsMin} au moins sur toute la course) et ${RG.jeuSerrure} mm côté serrure (décision de Quentin du 07/10/2026)`;
    R.notes.push(`Jeux : ${jeux} : hors de la zone de ${z0} à ${z1} mm où un doigt se pince (notice Somfy Ixengo, zone 3).`);
  }
  if (R.jeux.reglage) {
    const rg = R.jeux.reglage;
    R.notes.push(`Réglage des gonds sur chantier : axe de ${rg.axeMin} à ${rg.axeMax} mm du nu (le gond permet ${rg.plage[0]} à ${rg.plage[1]}) ; au-delà, un jeu passerait sous ${RG.jeuGondsMin} mm.`);
  }
  if (aButee) R.notes.push(`Butée centrale basse : ${B.h} mm au-dessus du sol fini (référence à relever), ${sabots ? `un sabot sous la traverse basse de chaque ${c.type === "pliant" ? "panneau côté centre" : "vantail"} (bas à ${basSabot} mm du sol ; un par vantail, décision de Quentin du 07/10/2026)` : "la traverse basse vient contre elle"}. Pas de butée haute au milieu du passage.`);
  if (unVantail) R.notes.push(`Butée de fermeture sur le pilier côté serrure, côté rue (ou gâche à butée) : le ${c.type === "portillon" ? "portillon" : "vantail"} ne passe jamais vers la rue.`);
  if (plots) R.notes.push(`Arrêts de vantail ouvert sur plots de ${RG.plotArret.l} × ${RG.plotArret.p} × ${RG.plotArret.h}, à ${RG.plotArret.aBout} mm du bout du vantail.`);
  const aRelever = [];
  if (gond && !gond.releve) aRelever.push("références et charges des gonds (notice ; table à valider)");
  if (aGonds && !G.axeReleve) aRelever.push(`position de l'axe du gond (${G.axeDerriere} mm derrière le montant) et épaisseur de sa platine (${G.platineEp} mm) : notice du gond retenu`);
  if (poteau) aRelever.push("tableau des poteaux (à valider)");
  if (aButee) aRelever.push("référence de la butée centrale et de ses sabots");
  if (unVantail) aRelever.push("référence de la butée de fermeture");
  if (roue) aRelever.push(`hauteur du support de roue (${RG.roueSupport} mm : notice de la roue)`);
  const FI = RG.finition, fin = [];
  if (!FI.cuveGalva.releve) fin.push(`cuve du galvaniseur ${ptMm(FI.cuveGalva.L)} × ${ptMm(FI.cuveGalva.l)} × ${ptMm(FI.cuveGalva.h)}`);
  if (!FI.fourLaquage.releve) fin.push(`four du laqueur ${ptMm(FI.fourLaquage.L)} × ${ptMm(FI.fourLaquage.h)}`);
  if (!FI.transportReleve) fin.push(`remorque ${ptMm(FI.transportMax)}`);
  if (fin.length) aRelever.push(`${fin.join(", ")} (valeurs courantes à confirmer)`);
  if (aRelever.length) R.notes.push(`Valeurs de l'atelier à relever : ${aRelever.join(" ; ")}.`);
  R.notes.push("Profilés, gardes au sol et quincaillerie : valeurs de départ de l'étude du 06/10/2026, à confirmer par toi.");
  const manque = ptVisiteManque(c);
  if (manque.length) R.notes.push(`Visite, non relevé : ${manque.map((k) => PT_VISITE_NOMS[k]).join(", ")}. Rien n'est supposé : à mesurer sur place.`);
  if (piliers) R.notes.push(`Piliers : ${Vi.pilierL === null ? `largeur non relevée, dessinés à ${RG.pilierDessin} mm de large ; ` : ""}profondeur dessinée ${pil.areteRelevee ? `jusqu'à l'arête relevée (axe du gond + ${ptMm(Vi.gondBord)})` : `à ${RG.pilierDessin} mm`}, pour le dessin seulement (aucun calcul n'en dépend).`);
  R.visite = { ...Vi, manque };

  // --- Débit : pièces identiques regroupées ---
  const groupes = new Map();
  for (const p of pieces) {
    const k = `${p.groupe}|${p.nom}|${p.mat}|${Math.round(p.long)}|${p.coupes}`;
    if (!groupes.has(k)) groupes.set(k, { ...p, qte: 0, kgTot: 0 });
    const g = groupes.get(k);
    g.qte += 1; g.kgTot += p.kg != null ? p.kg : p.kgM * p.long / 1000;
  }
  const ordre = ["Poteaux", "Cadre", "Remplissage", "Décor", "Guidage"];
  R.debit = [...groupes.values()].sort((a, b) => ordre.indexOf(a.groupe) - ordre.indexOf(b.groupe)).map((g) => ({
    nom: g.nom, qte: g.qte, mat: g.mat, long: g.tole ? 0 : Math.round(g.long), coupes: g.tole ? `${ptMm(g.long)} × ${ptMm(g.larg)} mm, ${g.coupes.toLowerCase()}` : g.coupes, note: g.note, groupe: g.groupe,
    ...(g.decor ? { decor: true } : {}),
  }));
  const ACHATS_NOMS = { moulures: "Moulures en applique", gonds: "Gonds réglables", serrure: "Serrure + cylindre", poignees: "Paire de poignées", arrets: "Arrêts de vantail", buteeCentrale: "Butée centrale", sabotsButee: "Sabots de butée", buteeFermeture: "Butée de fermeture", verrou: "Verrou du vantail fixe", charnieresPli: "Charnières de pli", roulettesBout: "Roulettes de bout", guidesSol: "Guides au sol", roues: "Roues à gorge", guideHaut: "Guide haut à rouleaux", butees: "Butées (réception, fin de course)", kitAutoportant: "Kit autoportant", pointes: "Pointes de lance", cremaillereM: "Crémaillère (mètres)" };
  const rgl = R.jeux.reglage;
  const ACHATS_DETAIL = {
    gonds: () => [gond ? `${gond.ref}${gond.releve ? "" : " (référence à relever)"}` : "Gond sur étude", `Gond haut axe vers le bas (anti-dégondage), ${G.jeuVertical[0]} à ${G.jeuVertical[1]} mm de jeu ; axe à ${G.axeNu} mm du nu${rgl ? `, réglé sur chantier entre ${rgl.axeMin} et ${rgl.axeMax}` : ""}`],
    roues: () => [roue ? `Roue à gorge Ø ${roue.d} pour rail Ø ${roue.rail}` : "Roues sur étude", roue ? `Jusqu'à ${roue.kgMax} kg le portail` : ""],
    buteeCentrale: () => ["Quincaillerie", `Basse : ${B.h} mm au-dessus du sol fini (référence à relever)`],
    sabotsButee: () => ["Quincaillerie", `Un sous la traverse basse de chaque ${c.type === "pliant" ? "panneau côté centre" : "vantail"}, au droit de la butée (bas à ${basSabot} mm du sol ; un par vantail)`],
    buteeFermeture: () => ["Quincaillerie", "Sur le pilier côté serrure, côté rue : arrête le vantail fermé (ou gâche à butée) ; référence à relever"],
    moulures: () => [q.moulure ? q.moulure.nom : "Moulure", "Au centre du bas plein, vissée par derrière (vis inox depuis la propriété)"],
    arrets: () => ["Quincaillerie", `Sur plots de béton ${RG.plotArret.l} × ${RG.plotArret.p} × ${RG.plotArret.h}, à ${RG.plotArret.aBout} mm du bout du vantail`],
  };
  for (const [k, n] of Object.entries(A)) {
    if (k === "moteur") { R.debit.push({ nom: "Moteur", qte: 1, mat: n, long: 0, coupes: "—", note: "Option, posé par nos soins", groupe: "Achats" }); continue; }
    if (k === "kitAutoportant") continue;   // déjà dans le débit (poutre)
    const [mat, note] = ACHATS_DETAIL[k] ? ACHATS_DETAIL[k]() : ["Quincaillerie", ""];
    R.debit.push({ nom: ACHATS_NOMS[k] || k, qte: n, mat, long: 0, coupes: "—", note, groupe: "Achats" });
  }
  // Moteur (lot 4) : un renfort dans chaque vantail motorisé, au droit de la patte du vérin ou du bras (selon la notice).
  if (c.moteur && R.moteurs && R.moteurs.choisi && c.type === "battant") R.debit.push({ nom: "Renfort de patte moteur", qte: c.nbV, mat: c.mat === "alu" ? "Plat alu 50 × 10, vissé (jamais soudé à moins de 30 mm d'un nœud)" : "Plat acier 60 × 8, soudé", long: 200, coupes: "Percé et taraudé AVANT laquage ou galvanisation", note: `Position selon la notice ${R.moteurs.choisi.nom}`, groupe: "Achats" });
  if (q.rosaces) R.debit.push({ nom: "Rosaces", qte: q.rosaces, mat: c.mat === "acier" ? "Rosace fonte Ø 100 (comme le garde-corps)" : "Rosace alu Ø 100 (à trouver)", long: 0, coupes: "—", note: "Soudée au croisement", groupe: "Achats" });

  // --- Quantités pour le chiffrage (aucun prix ici) ---
  const metres = {};
  let laqueM2 = 0, kg = 0, toleM2 = 0, panneauM2 = 0;
  let decorKg = 0, decorM2 = 0;
  const kgParNom = {};   // le poids de chaque sorte de pièce (pour le colis : poteaux, rail…)
  const pese = (nom, k) => { kg += k; kgParNom[nom] = (kgParNom[nom] || 0) + k; };
  for (const p of pieces) {
    const lm = p.long / 1000;
    if (p.decor) { const k = (p.kgM || 0) * lm, m2 = lm * (p.peri || 0) / 1000; decorKg += k; decorM2 += m2; pese(p.nom, k); laqueM2 += m2; continue; }
    if (p.panneau) { panneauM2 += p.aire; pese(p.nom, p.kg); continue; }
    if (p.tole) { toleM2 += p.aire; laqueM2 += 2 * p.aire; pese(p.nom, p.kg); metres[p.mat] = (metres[p.mat] || 0); continue; }
    metres[p.mat] = (metres[p.mat] || 0) + lm;
    if (p.groupe !== "Guidage" && !p.mat.startsWith("Lame chêne") && !p.mat.startsWith("Chêne")) laqueM2 += lm * p.peri / 1000;
    pese(p.nom, p.kgM * lm);
  }
  const kgPortail = parVantail.reduce((s, x) => s + x.kg, 0);
  R.quant = {
    type: c.type, modele: c.modele, mat: c.mat, metres, toleM2, panneauM2, laqueM2, soudures: q.soudures, achats: A, rosaces: q.rosaces, volutes: q.volutes, moulure: q.moulure || null,
    vantaux: parVantail, kgParNom, queue, longueurPortail: coul ? Lg : null, massifQueue: q.massifQueue || 0, chariots: q.chariots || null, poteaux: c.poteaux, moteur: c.moteur,
    moteurModele: c.moteur && R.moteurs && R.moteurs.choisi ? R.moteurs.choisi.cle : null,
    cintrage: c.forme === "chapeau" || c.forme === "creux", lisse: c.lisse && c.forme === "droit", pointes: c.pointes,
    // Ce que le moteur a choisi dans ses tables (aucun prix) :
    gonds: gond ? { cle: gond.cle, ref: gond.ref, chargePaire: gond.chargePaire, inox: gond.inox, releve: gond.releve, kgPorte: Math.round(kgPorte * 10) / 10, parVantail: nG } : null,
    poteau: poteau ? { cle: poteau.cle, b: poteau.b, profil: prP.nom } : null,
    massif,
    roues: roue ? { cle: roue.cle, d: roue.d, rail: roue.rail, kgMax: roue.kgMax, support: RG.roueSupport } : null,
    butee: aButee ? { h: B.h, sabots: sabots ? 2 : 0, basSabot: sabots ? basSabot : null } : null,
    plots: plots ? { n: c.nbV, l: RG.plotArret.l, p: RG.plotArret.p, h: RG.plotArret.h, aBout: RG.plotArret.aBout } : null,
    finition: { pieces: aFinir, trop: [...tropVus.values()].map((t) => ({ noms: t.noms, ou: t.ou, dims: t.dims, releve: t.releve })) },
    // Le décor (motifs.js) : ses pièces et ses compteurs, pour chiffrage-motifs.js (aucun prix ici).
    decor: q.decor ? { pieces: q.decor.pieces, q: q.decor.q, ch: q.decor.ch, fin: c.decorFin, kg: decorKg, m2: decorM2, cimierH: q.decor.cimierH } : null,
  };
  R.poids = kgPortail;
  R.kg = Math.round(kg);
  R.dims = { P: c.P, H: c.H, type: c.type, vantaux: largeurs.map(Math.round), gs: c.gs, hautMax: Math.round(Math.max(...ptCourbe(haut, xa, xb).map(([, y]) => y)) + (q.decor ? q.decor.cimierH : 0)) };
  R.grandeCote = Math.round(Math.max(...largeurs));
  R.config = c;
  R.colis = ptColis(R);
  // La pose (lot 4) : les ouvrages, réservations, électricité, essais, et les vues de pose (après R.quant).
  ptPose(c, V, R, { kgV: parVantail, geos, pil, yG });

  // --- Résumé ---
  const nomType = c.type === "battant" ? `Battant ${c.nbV} ${c.nbV > 1 ? "vantaux" : "vantail"}${c.nbV === 2 && c.rep === "tiers" ? ` inégaux, grand à ${c.sens === "droite" ? "droite" : "gauche"}` : ""}` : c.type === "coulissant" ? `Coulissant ${c.guidage === "rail" ? "sur rail" : "autoportant"}` : c.type === "pliant" ? "Pliant (2 × 2 panneaux)" : "Portillon";
  R.resume.unshift(["Modèle", nomType], ["Matière", `${M.nom} · ${M.finition.toLowerCase()}`], ["Vantaux", largeurs.map(ptMm).join(" + ") + " mm"]);
  R.resume.push(["Poids du portail", `≈ ${ptKg(kgPortail)} kg`]);
  if (c.decor !== "aucun") {
    const Fo = PT_DECOR_FORMULES[c.decor];
    const nomD = Fo ? `${Fo.nom} : ${Fo.ligne.charAt(0).toLowerCase()}${Fo.ligne.slice(1)}` : c.decorChoix.map((x) => `${(MT_NOMS[x.forme] || x.forme)} · ${MT_NOMS_PLACEMENT[x.assemblage] || x.assemblage}${x.assemblage === "entre" ? ` ${MT_NOMS_POS[x.pos] || ""}` : ""}`).join(" + ");
    R.decor = { formule: c.decor, nom: nomD, choix: c.decorChoix, refus: q.decor ? q.decor.refus : [], cimierH: q.decor ? q.decor.cimierH : 0 };
    R.resume.push(["Décor", nomD]);
    for (const n of c.decorNotes) R.notes.push(n);
    if (c.decor === "surMesure") R.alertes.push("Décor sur mesure : il se dessine d'après la photo du client, puis se chiffre sur devis.");
    else if (typeof mtRemplir !== "function") R.alertes.push("Décor : la bibliothèque de styles (motifs.js) n'est pas chargée : décor non dessiné.");
    for (const r of R.decor.refus) R.alertes.push(`Décor : ${r.quoi} refusé. ${r.raison}`);
    if (q.decor && q.decor.q.commandes) R.notes.push(`Décor : pièces du commerce, référence exacte dessinée (écart des barreaux réglé sur elle) : ${Object.values(q.decor.q.commandes).map((k) => `${k.qte} × ${MT_NOMS[k.forme] || k.forme} ${ptMm(k.h)} × ${ptMm(k.l)}`).join(", ")}.`);
  } else R.decor = null;
  if (q.vide) R.resume.push(["Vide entre barreaux", `${ptMm(q.vide)} mm`]);
  if (!R.alertes.length) R.oks.push("Toutes les cotes sont dans les limites de l'atelier.");
  PT_COMMANDES.set(R, q.decor && q.decor.q.commandes ? Object.values(q.decor.q.commandes) : []);
  return R;
}

// Une seule taille de pièce par portail (Quentin, 10/10/2026 : « même taille partout »). Chaque panneau choisit sa pièce
// du catalogue ; si une même forme sort en deux tailles (vantaux 1/3 – 2/3, panneaux sous un haut cintré, pliant…), le
// portail est recalculé avec UNE pièce imposée à tous les panneaux : la plus employée d'abord, puis les autres pièces de
// la forme ; la première qui se pose partout sans nouvelle alerte est gardée. Sinon le premier calcul reste.
const PT_COMMANDES = new WeakMap();
function calculerPortail(v, modele) {
  const R0 = ptCalculerPortail(v, modele, {}), refs = {}, parForme = {};
  for (const k of PT_COMMANDES.get(R0) || []) (parForme[k.forme] = parForme[k.forme] || []).push(k);
  let R = R0;
  for (const [forme, L] of Object.entries(parForme)) {
    if (L.length < 2) continue;
    const autres = typeof MT_CATALOGUE === "undefined" ? [] : MT_CATALOGUE.filter((e) => e.forme === forme && !e.parMetre && !L.some((k) => k.ref === e.ref));
    for (const ref of [...L.sort((a, b) => b.qte - a.qte).map((k) => k.ref), ...autres.map((e) => e.ref)]) {
      const R1 = ptCalculerPortail(v, modele, { ...refs, [forme]: ref });
      if (R1.alertes.length <= R0.alertes.length && (PT_COMMANDES.get(R1) || []).filter((k) => k.forme === forme).every((k) => k.ref === ref)) { refs[forme] = ref; R = R1; break; }
    }
  }
  return R;
}

/* ---------- 6. Vue de dessus : la place à prévoir (rue en bas, propriété en haut) ---------- */

function ptVueDessus(c, V, D, queue, pil, R, ctx) {
  const e = c.M.cadre.e, RG = PT_ATELIER, bP = pil.b;
  const coul = c.type === "coulissant", gauche = c.sens === "gauche";
  const murG = coul && gauche ? Math.max(1800, V[0].x1 - V[0].x0 + queue + 600) : 1200, murD = coul && !gauche ? Math.max(1800, V[0].x1 - V[0].x0 + queue + 600) : 1200;
  const ym = (pil.y0 + pil.y1) / 2;
  D.push({ t: "poly", cls: "t-mur", pts: ptRect(-bP - murG, ym - 100, -bP, ym + 100) });
  D.push({ t: "poly", cls: "t-mur", pts: ptRect(c.P + bP, ym - 100, c.P + bP + murD, ym + 100) });
  D.push({ t: "poly", cls: "t-acier-plein", pts: ptRect(-bP, pil.y0, 0, pil.y1) });
  D.push({ t: "poly", cls: "t-acier-plein", pts: ptRect(c.P, pil.y0, c.P + bP, pil.y1) });
  D.push({ t: "texte", p: [-bP / 2, pil.y0], txt: "gauche", pos: "sous", decal: 0.2, convention: true });
  D.push({ t: "texte", p: [c.P + bP / 2, pil.y0], txt: "droite", pos: "sous", decal: 0.2, convention: true });
  D.push({ t: "texte", p: [c.P / 2, pil.y0], txt: "Rue", pos: "sous", decal: 3.2 });
  D.push({ t: "texte", p: [c.P / 2, pil.y0], txt: "Gauche et droite : vus de la rue", pos: "sous", decal: 4.4, convention: true });
  D.push({ t: "texte", p: [c.P / 2, coul ? 1100 : ctx.place + 250], txt: "Côté propriété", pos: "sur" });
  if (coul) {
    const yG = ctx.yG, course = c.P + RG.recouvrement.reception;
    const s = gauche ? -1 : 1;
    const ferme0 = V[0].x0 - (gauche ? queue : 0), ferme1 = V[0].x1 + (gauche ? 0 : queue);
    const ouvert0 = ferme0 + s * course, ouvert1 = ferme1 + s * course;
    const zone0 = gauche ? ouvert0 : c.P, zone1 = gauche ? 0 : ouvert1;
    D.push({ t: "poly", cls: "t-bon t-zone", pts: ptRect(zone0, pil.y1, zone1, yG + e + 60) });
    D.push({ t: "poly", piece: "Portail fermé", cls: "t-acier-plein", pts: ptRect(V[0].x0, yG, V[0].x1, yG + e) });
    if (queue) D.push({ t: "poly", piece: "Queue", cls: "t-acier", pts: ptRect(gauche ? V[0].x0 - queue : V[0].x1, yG + e / 2 - 8, gauche ? V[0].x0 : V[0].x1 + queue, yG + e / 2 + 8) });
    D.push({ t: "poly", cls: "t-cache", pts: ptRect(ouvert0, yG, ouvert1, yG + e) });
    D.push({ t: "cote", a: [zone0, yG + e + 60], b: [zone1, yG + e + 60], cote: "haut", d: 1.2, txt: ptMm(zone1 - zone0) });
    D.push({ t: "texte", p: [(zone0 + zone1) / 2, yG + e + 60], txt: "place libre le long de la clôture", pos: "sur", decal: 4.6 });
    // Autoportant : le massif sous la queue, depuis la face extérieure du pilier, de la longueur de R.quant.massifQueue.
    if (c.guidage === "auto") D.push({ t: "poly", cls: "t-mur", pts: ptRect(gauche ? -bP - ctx.massifQueue : c.P + bP, yG - 40, gauche ? -bP : c.P + bP + ctx.massifQueue, yG + e + 40) });
    return;
  }
  // Battant, portillon, pliant : les vantaux tournent vers la propriété autour de l'axe des gonds (à 65 mm du nu).
  const ouv = RG.gonds.ouverture, PA = RG.plotArret, B = RG.butee, rgl = R.jeux.reglage;
  V.forEach((vt) => D.push({ t: "poly", piece: vt.nom, cls: "t-acier-plein", pts: ptRect(vt.x0, 0, vt.x1, e) }));
  ctx.geos.forEach((g) => {
    const monde = (pts) => pts.map(g.monde), arc = [];
    for (let a = 0; a <= ouv; a += 5) arc.push(ptPivote([g.jeu + g.w, 0], g.axe, a));
    D.push({ t: "poly", cls: "t-bon t-zone", pts: monde([g.axe, ...arc]) });
    if (ctx.plots) {
      const [cx, cy] = ptPivote([g.jeu + g.w - PA.aBout, e / 2], g.axe, ouv);
      D.push({ t: "poly", piece: "Plots d'arrêt", cls: "t-mur", pts: monde(ptRect(cx - PA.l / 2, cy - PA.p / 2, cx + PA.l / 2, cy + PA.p / 2)) });
    }
    D.push({ t: "poly", cls: "t-cache", pts: monde(g.cadre.map((p) => ptPivote(p, g.axe, ouv))) });
    if (c.type === "pliant") {
      // Le panneau côté centre se replie contre le panneau côté poteau, du côté du passage.
      const [ax, ay] = g.axe, x0 = ax + ay + 10;
      D.push({ t: "poly", cls: "t-cache", pts: monde(ptRect(x0, ay + g.jeu - ax + 30, x0 + e, ay + g.jeu - ax + g.w)) });
    }
    D.push({ t: "cercle", piece: "Gonds", cls: "t-rond", c: g.monde(g.axe), r: 10 });
    // Côté rue : le jeu côté gonds et l'axe du gond, cotés depuis le nu du pilier (avec la plage de réglage du poseur).
    D.push({ t: "cote", a: g.monde([0, 0]), b: g.monde([g.jeu, 0]), cote: "bas", d: 1, txt: ptMm(g.jeu) });
    D.push({ t: "cote", a: g.monde([0, g.axe[1]]), b: g.monde(g.axe), cote: "bas", d: 2.2, txt: `axe ${ptMm(g.axe[0])}${rgl ? ` (réglage ${rgl.axeMin} à ${rgl.axeMax})` : ""}` });
  });
  if (ctx.butee) D.push({ t: "poly", piece: "Butée centrale", cls: "t-acier-plein", pts: ptRect(ctx.xmB - B.l / 2, -B.p, ctx.xmB + B.l / 2, 0) });
  if (ctx.xBF) D.push({ t: "poly", piece: "Butée de fermeture", cls: "t-acier-plein", pts: ptRect(ctx.xBF[0], -RG.buteeFermeture.ep, ctx.xBF[1], 0) });
  const j = R.jeux;
  if (j.centre !== null) {
    const [a, b] = c.type === "pliant" ? [V[1].x1, V[2].x0] : [V[0].x1, V[1].x0];
    D.push({ t: "cote", a: [a, 0], b: [b, 0], cote: "bas", d: 1, txt: ptMm(j.centre) });
  }
  if (j.serrure !== null) D.push({ t: "cote", a: gauche ? [V[0].x1, 0] : [0, 0], b: gauche ? [c.P, 0] : [V[0].x0, 0], cote: "bas", d: 1, txt: ptMm(j.serrure) });
  const g0 = ctx.geos[0];
  D.push({ t: "cote", a: g0.monde([0, 0]), b: g0.monde([0, ctx.place]), cote: g0.gauche ? "gauche" : "droite", d: 1.6, txt: ptMm(ctx.place) });
  D.push({ t: "texte", p: g0.monde([g0.axe[0] + 0.45 * g0.w, g0.axe[1] + 0.3 * g0.w]), txt: "place libre", pos: "sur" });
}

/* ---------- 7. Vue de côté : coupe près du poteau gauche (rue à gauche, propriété à droite) ---------- */

// Même repère en profondeur que la vue de dessus : x de la coupe = y de la vue de dessus (yV : face côté rue du vantail,
// 0 pour un portail à gonds, derrière les piliers pour un coulissant).
function ptVueCote(c, C, haut, xa, pil, prP, massif, yV) {
  const M = c.M, e = M.cadre.e, gs = c.gs, yT = haut(xa), b = M.cadre.b, RG = PT_ATELIER;
  const ym = (pil.y0 + pil.y1) / 2;
  C.push({ t: "sol", x1: Math.min(pil.y0, yV) - 300, x2: Math.max(pil.y1, yV + e) + 300 });
  if (prP) {
    C.push({ t: "poly", cls: "t-cache", pts: ptRect(pil.y0, -RG.scellement, pil.y1, yT + 50) });
    C.push({ t: "poly", cls: "t-mur", pts: ptRect(ym - massif.cote / 2, -massif.prof, ym + massif.cote / 2, 0) });
  } else C.push({ t: "poly", cls: "t-mur t-pilier", pts: ptRect(pil.y0, 0, pil.y1, yT + 150) });
  // Le vantail, placé comme sur la vue de dessus.
  const x0 = yV, x1 = yV + e, xc = yV + e / 2;
  C.push({ t: "poly", piece: "Traverse basse", cls: "t-acier-plein", pts: ptRect(x0, gs, x1, gs + b) });
  C.push({ t: "poly", piece: "Traverse haute", cls: "t-acier-plein", pts: ptRect(x0, yT - b, x1, yT) });
  const epR = c.remp === "lames" ? RG.lameChene.ep : c.remp === "panneau" && c.mat === "alu" ? 4 : c.remp === "plein" || c.remp === "panneau" ? (M.plein.ep || 2) : c.remp === "lamesAlu" ? RG.lameAlu.ep : M.barreau.b;
  C.push({ t: "poly", piece: "Remplissage", cls: c.remp === "lames" ? "t-bois" : "t-acier-plein", pts: ptRect(xc - epR / 2, gs + b, xc + epR / 2, yT - b) });
  if (c.soub !== "aucun") C.push({ t: "poly", piece: "Traverse intermédiaire", cls: "t-acier-plein", pts: ptRect(xc - M.inter.e / 2, gs + c.hSoub, xc + M.inter.e / 2, gs + c.hSoub + RG.traverseInter) });
  if (c.lisse && c.forme === "droit") C.push({ t: "poly", piece: "Lisse en chêne", cls: "t-bois", pts: ptRect(xc - RG.lisse.l / 2, yT, xc + RG.lisse.l / 2, yT + RG.lisse.h) });
  C.push({ t: "cote", a: [x0, yT], b: [x1, yT], cote: "haut", d: 1, txt: `${e}` });
  C.push({ t: "cote", a: [x1, 0], b: [x1, gs], cote: "droite", d: 1, txt: `${gs}` });
  C.push({ t: "cote", a: [x1, gs], b: [x1, yT], cote: "droite", d: 2.4, txt: ptMm(yT - gs) });
  const xl0 = Math.min(pil.y0, massif ? ym - massif.cote / 2 : pil.y0) - 120, xl1 = Math.max(pil.y1, yV + e, massif ? ym + massif.cote / 2 : pil.y1) + 120;
  C.push({ t: "texte", p: [xl0, 0], txt: "rue", pos: "sous", decal: 0.2 });
  C.push({ t: "texte", p: [xl1, 0], txt: "propriété", pos: "sous", decal: 0.2 });
  C.push({ t: "texte", p: [(xl0 + xl1) / 2, 0], txt: `Coupe près du ${prP ? "poteau" : "pilier"} gauche (gauche et droite vus de la rue)`, pos: "sous", decal: 2.4, convention: true });
}

/* ---------- Plans A3 du portail (lot 6, 09/10/2026) : trois feuilles, comme on les imprime ----------
 * ptFeuillesA3(R) : les feuilles à imprimer — "1" Fabrication (et "1bis" quand la liste de débit dépasse 28 lignes),
 *   "2" Pose et maçonnerie (le plan que le client donne à son maçon), "3" Motorisation et électricité.
 * ptPlanA3(R, v, infos, feuille, dessiner) : la feuille en SVG A3 paysage (420 × 297 mm). « dessiner » est svgDe de l'outil
 *   (primitives → { vb, html }) : le module reste sans DOM. infos = { client, chantier, date "JJ/MM/AAAA", numero }.
 * ptNumeroPlan(R, date, feuille) : PT-AAMMJJ-PxH-F1 (cahier des charges §4).
 * Gauche et droite : toujours VUS DE LA RUE ; chaque feuille porte le petit plan RUE / PROPRIÉTÉ. */
const PT_A3 = { W: 420, H: 297, m: 8, lignesF1: 28 };
const PT_FEUILLES = { "1": "Fabrication", "1bis": "Fabrication (suite de la liste)", "2": "Pose et maçonnerie", "3": "Motorisation et électricité" };
const PT_A3_STYLE = [
  ".t-acier-plein,.t-rond{fill:#e9e4dc;stroke:#2b2320;stroke-width:1;vector-effect:non-scaling-stroke}",
  ".t-acier{fill:none;stroke:#2b2320;stroke-width:1;vector-effect:non-scaling-stroke}.t-acier.t-volute{stroke:#2b2320;stroke-width:10;fill:none;stroke-linecap:round;vector-effect:none}",
  ".t-bois{fill:#f3e6d4;stroke:#8a6237;stroke-width:1;vector-effect:non-scaling-stroke}",
  ".t-mur{fill:#f1ede6;stroke:#9a8f84;stroke-width:1;vector-effect:non-scaling-stroke}.t-mur.t-pilier{fill:#e6ddcf}.t-mur.t-panneau{fill:#d9d4cc}",
  ".t-cache{fill:none;stroke:#7d7368;stroke-width:0.8;stroke-dasharray:5 4;vector-effect:non-scaling-stroke}",
  ".t-sol{stroke:#9a8f84;stroke-width:1;vector-effect:non-scaling-stroke}",
  ".t-cote{fill:none;stroke:#1f4e79;stroke-width:0.7;vector-effect:non-scaling-stroke}.t-texte{fill:#1f4e79;font-family:Helvetica,Arial,sans-serif}.t-fleche{fill:#1f4e79}",
  ".t-libre{fill:#5c5140;font-family:Helvetica,Arial,sans-serif}.t-point{fill:#1f4e79}",
  ".t-bon{fill:rgba(63,107,58,0.10);stroke:#3f6b3a;stroke-width:1;stroke-dasharray:5 3;vector-effect:non-scaling-stroke}",
  ".t-cote.ko{stroke:#b3261e}.t-texte.ko{fill:#b3261e;font-weight:700}.t-texte.bon{fill:#3f6b3a;font-weight:700}",
  ".a3-t{font-family:Helvetica,Arial,sans-serif;fill:#2b2320}.a3-g{font-weight:700}.a3-l{stroke:#2b2320;fill:none}.a3-f{fill:#f7f4ef;stroke:#2b2320}",
].join("");

function ptNumeroPlan(R, date, feuille) {
  const d = date instanceof Date ? date : new Date();
  const z = (n) => String(n).padStart(2, "0");
  const c = R && R.config ? R.config : { P: 0, H: 0 };
  return `PT-${z(d.getFullYear() % 100)}${z(d.getMonth() + 1)}${z(d.getDate())}-${Math.round(c.P)}x${Math.round(c.H)}${feuille ? `-F${feuille}` : ""}`;
}

function ptFeuillesA3(R) {
  const n = ptLignesDebitA3(R).length;
  return n > PT_A3.lignesF1 ? ["1", "1bis", "2", "3"] : ["1", "2", "3"];
}

// La liste de débit en lignes imprimables (une ligne par pièce, groupées par matière).
function ptLignesDebitA3(R) {
  const L = [];
  const mats = [...new Set(R.debit.map((d) => d.mat))];
  for (const mat of mats) {
    L.push({ titre: mat });
    for (const d of R.debit.filter((x) => x.mat === mat)) L.push({ txt: `${d.qte} × ${d.long ? `${ptMm(d.long)} mm` : "—"}  ${d.nom}${d.coupes && d.coupes !== "Coupes droites" ? ` · ${d.coupes}` : ""}` });
  }
  return L;
}

// Un texte coupé en lignes d'au plus n signes (les mots ne sont jamais coupés).
function ptCouper(t, n) {
  const sortie = [];
  let l = "";
  for (const mot of String(t).split(/\s+/)) {
    if (l && (l + " " + mot).length > n) { sortie.push(l); l = mot; } else l = l ? `${l} ${mot}` : mot;
  }
  if (l) sortie.push(l);
  return sortie;
}

function ptPlanA3(R, v, infos = {}, feuille = "1", dessiner) {
  const { W, H, m } = PT_A3;
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const c = R.config, f = String(feuille);
  const out = [];
  const texte = (x, y, t, taille = 2.6, extra = "") => out.push(`<text class="a3-t${extra.includes("g") ? " a3-g" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${taille}"${extra.includes("m") ? ' text-anchor="middle"' : extra.includes("e") ? ' text-anchor="end"' : ""}>${esc(t)}</text>`);
  const cadre = (x, y, w, h, fond = false) => out.push(`<rect class="${fond ? "a3-f" : "a3-l"}" x="${x}" y="${y}" width="${w}" height="${h}" stroke-width="0.3"/>`);
  // Un bloc de lignes de texte (titre gras, puis puces), coupé à la largeur ; rend la hauteur utilisée.
  const bloc = (x, y, w, titre, lignes, taille = 2.3, maxH = 999) => {
    let yy = y + 4;
    texte(x + 2, yy, titre, 2.8, "g");
    yy += 4;
    const n = Math.max(20, Math.floor((w - 6) / (taille * 0.5)));
    for (const l of lignes) {
      const morceaux = ptCouper(l, n);
      for (let i = 0; i < morceaux.length; i++) {
        if (yy > y + maxH - 2) { texte(x + 2, yy, "…", taille); return yy - y + 2; }
        texte(x + 2, yy, `${i === 0 ? "• " : "  "}${morceaux[i]}`, taille);
        yy += taille * 1.35;
      }
    }
    return yy - y + 1;
  };
  // Une vue de l'outil posée dans un cadre de la feuille (même dessin que l'écran, cotes en mm).
  const vue = (prims, x, y, w, h, titre, sous) => {
    texte(x, y + 3.5, titre, 3, "g");
    if (sous) texte(x, y + 7, sous, 2.2);
    if (!prims || !prims.length || typeof dessiner !== "function") return;
    const r = dessiner(prims, false);
    const top = y + (sous ? 9 : 6);
    out.push(`<svg x="${x}" y="${top}" width="${w}" height="${h - (top - y)}" viewBox="${r.vb.map((n) => n.toFixed(1)).join(" ")}" preserveAspectRatio="xMidYMid meet">${r.html}</svg>`);
  };

  // Le cadre, le titre, le cartouche, le petit plan RUE / PROPRIÉTÉ.
  out.push(`<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="#fff" stroke="#2b2320" stroke-width="0.5"/>`);
  const nomModele = (PT_MODELES[c.modele] || { nom: "Portail" }).nom;
  texte(m + 4, m + 8, `${nomModele} ${ptMm(c.P)} × ${ptMm(c.H)} mm — Feuille ${f === "1bis" ? "1 bis" : f} : ${PT_FEUILLES[f] || ""}`, 4.2, "g");
  const cw = 104, ch = 34, cx = W - m - cw, cy = H - m - ch;
  cadre(cx, cy, cw, ch, true);
  texte(cx + 3, cy + 6, "AUBOIACIER", 4.6, "g");
  texte(cx + 3, cy + 9.5, "Métallerie · fait main à Saumur", 2);
  // Le numéro du plan : PT-AAMMJJ-PxH-F1, du jour de la feuille (infos.date « JJ/MM/AAAA » si elle est donnée).
  const jma = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(infos.date || ""));
  const num = ptNumeroPlan(R, jma ? new Date(+jma[3], +jma[2] - 1, +jma[1]) : new Date(), f);
  [["Client", infos.client || "—"], ["Chantier", infos.chantier || "—"], ["Date", infos.date || "—"], ["N° de plan", num], ["Cotes", "en mm · gauche et droite vus de la rue"]].forEach(([k, val], i) => {
    texte(cx + 3, cy + 14 + i * 4.1, `${k} :`, 2.2, "g");
    texte(cx + 24, cy + 14 + i * 4.1, val, 2.2);
  });
  // Petit plan RUE / PROPRIÉTÉ (en haut à droite) : la convention de toutes les feuilles.
  const px = W - m - 52, py = m + 3;
  cadre(px, py, 48, 18, true);
  texte(px + 24, py + 5, "PROPRIÉTÉ", 2.4, "gm");
  out.push(`<line x1="${px + 6}" y1="${py + 9}" x2="${px + 42}" y2="${py + 9}" stroke="#2b2320" stroke-width="0.8"/>`);
  out.push(`<rect x="${px + 4}" y="${py + 7.5}" width="3" height="3" fill="#e6ddcf" stroke="#2b2320" stroke-width="0.2"/><rect x="${px + 41}" y="${py + 7.5}" width="3" height="3" fill="#e6ddcf" stroke="#2b2320" stroke-width="0.2"/>`);
  texte(px + 6, py + 13.5, "G", 2.4, "g"); texte(px + 42, py + 13.5, "D", 2.4, "ge");
  texte(px + 24, py + 16.5, "RUE (vous êtes ici)", 2.2, "m");

  const zoneY = m + 13, zoneB = cy - 3;
  if (f === "1" || f === "1bis") {
    const lignes = ptLignesDebitA3(R);
    // La coupure entre la feuille 1 et la 1 bis : jamais un titre de matière seul en bas de la feuille 1.
    let coupe = Math.min(lignes.length, PT_A3.lignesF1);
    if (coupe < lignes.length && lignes[coupe - 1].titre) coupe--;
    const debut = f === "1" ? 0 : coupe, fin = f === "1" ? coupe : lignes.length;
    const lx = W - m - 112;
    if (f === "1") {
      vue(R.vues.face, m + 4, zoneY, lx - m - 12, 128, "VUE DE FACE", "vue de la rue · cotes en mm");
      vue(R.vues.cote, m + 4, zoneY + 132, 70, zoneB - zoneY - 132, "COUPE", "");
      vue(R.vues.dessus, m + 80, zoneY + 132, lx - m - 88, zoneB - zoneY - 132, "VUE DE DESSUS", "ouverture côté propriété");
    }
    // La liste de débit (à droite), puis la fabrication.
    // La liste commence sous le petit plan RUE / PROPRIÉTÉ.
    const ly = zoneY + 11, hListe = f === "1" ? 140 : zoneB - ly;
    cadre(lx, ly, 108, hListe);
    texte(lx + 2, ly + 4.5, `LISTE DE DÉBIT${f === "1bis" ? " (suite)" : ""}`, 2.8, "g");
    let yy = ly + 9;
    const court = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
    for (const l of lignes.slice(debut, fin)) {
      if (l.titre) { texte(lx + 2, yy + 0.5, court(l.titre, 62), 2.4, "g"); yy += 4.4; } else { texte(lx + 4, yy, court(l.txt, 72), 2.2); yy += 3.3; }
    }
    if (f === "1" && lignes.length > PT_A3.lignesF1) texte(lx + 2, ly + hListe - 2, `Suite sur la feuille 1 bis (${lignes.length - coupe} lignes)`, 2.2, "g");
    if (f === "1") {
      const J = R.jeux || {};
      const acier = c.mat === "acier", chene = R.debit.some((d) => /chêne/i.test(d.mat));
      const fab = [
        `Jeux : ${J.gonds ? `${J.gonds} mm côté gonds, ` : ""}${J.centre ? `${J.centre} mm au centre, ` : ""}${J.serrure ? `${J.serrure} mm côté serrure` : ""}`.replace(/, $/, ""),
        acier ? "Traitement : galvanisation à chaud puis thermolaquage (duplex) ; préparation du zinc exigée du laqueur, garantie écrite." : "Traitement : thermolaquage de l'alu (préparation et garantie écrites par le laqueur).",
        chene ? "Chêne : visserie inox A4, saturateur ; entretien annuel décrit dans la notice (sans lui, pas de garantie sur le bois)." : null,
        acier ? "Trous d'évent et d'écoulement avant la galvanisation (tubes fermés interdits)." : null,
        `Poids ≈ ${ptMm(R.poids)} kg${R.decor ? " · décor soudé, aucun collier" : ""}.`,
      ].filter(Boolean);
      bloc(lx, ly + hListe + 2, 108, "FABRICATION", fab, 2.2, zoneB - ly - hListe - 2);
    }
  } else if (f === "2") {
    const P = R.pose || { ouvrages: [], prerequis: [], controle: [], notes: [] };
    const gw = 236;
    vue(R.vues.pose, m + 4, zoneY, gw, 112, "PLAN DE POSE (VUE DE DESSUS)", "ce que fait votre maçon, ce que nous faisons");
    vue(R.vues.poseCoupe, m + 4, zoneY + 114, gw / 2 - 2, zoneB - zoneY - 114, "COUPE DE MAÇONNERIE", "");
    vue(R.vues.poseElev, m + 4 + gw / 2, zoneY + 114, gw / 2, zoneB - zoneY - 114, "ÉLÉVATION", "");
    // À droite : les ouvrages (qui fait quoi, cotes, délais), puis l'encart « À préparer avant la pose ».
    const rx = m + gw + 10, rw = W - m - rx - 2;
    let yy = zoneY + 22;
    const ouvr = P.ouvrages.map((o) => `${o.rep}. ${o.nom}${o.qte ? ` (${o.qte})` : ""} — ${o.quiFait}${o.cotes ? ` : ${o.cotes}` : ""}${o.delai ? ` · ${o.delai}` : ""}`);
    yy += bloc(rx, yy, rw, "OUVRAGES : QUI FAIT QUOI", ouvr, 2.1, 70);
    yy += bloc(rx, yy, rw, "À PRÉPARER AVANT LA POSE", P.prerequis, 2.1, 48);
    yy += bloc(rx, yy, rw, "NOUS CONTRÔLONS LES SUPPORTS", ["Cotes à ± 10 mm, niveau et aplomb des massifs et des piliers", ...P.controle.slice(0, 3)], 2.1, 32);
    const rest = cy - 3 - yy - 30;
    if (rest > 12) yy += bloc(rx, yy, rw, "À SAVOIR", P.notes.filter((n) => /DT-DICT|7 jours|béton/i.test(n)), 2.1, rest);
    // Le PV de réception (signé avec ou sans réserves, le solde est dû à la réception).
    const vy = cy - 30, vx = m + gw + 10;
    cadre(vx, vy, W - m - vx - 2, 27);
    texte(vx + 2, vy + 4.5, "PROCÈS-VERBAL DE RÉCEPTION", 2.8, "g");
    texte(vx + 2, vy + 9, "Le ___ / ___ / ______ , le portail est reçu :  ☐ sans réserve   ☐ avec les réserves suivantes :", 2.1);
    out.push(`<line x1="${vx + 2}" y1="${vy + 14}" x2="${W - m - 4}" y2="${vy + 14}" stroke="#9a8f84" stroke-width="0.2"/>`);
    texte(vx + 2, vy + 19, "Le client (signature)", 2.1);
    texte(vx + (W - m - vx) / 2, vy + 19, "Auboiacier (signature)", 2.1);
    texte(vx + 2, vy + 25, "Le solde est dû à la réception.", 2, "g");
  } else if (f === "3") {
    const P = R.pose || { reservations: [], electricite: [], essais: [] };
    const M = R.moteurs && R.moteurs.choisi ? R.moteurs.choisi : null;
    const gw = 236;
    vue(R.vues.face, m + 4, zoneY, gw, 100, "VUE DE FACE", "vue de la rue");
    vue(R.vues.pose && R.vues.pose.length ? R.vues.pose : R.vues.dessus, m + 4, zoneY + 104, gw, zoneB - zoneY - 104, "VUE DE DESSUS", "moteurs, armoire et gaines (côté du courant)");
    const rx = m + gw + 10, rw = W - m - rx - 2;
    let yy = zoneY + 22;
    const tete = M ? [`${M.nom}${M.ref ? ` (${M.ref})` : ""}`, M.contenu || "", `Garantie ${M.garantie || "—"} ans`] : ["Sans moteur : ouverture à la main. Les attentes (gaine, fourreau) peuvent être posées pour un moteur plus tard."];
    yy += bloc(rx, yy, rw, "MOTORISATION", tete.filter(Boolean), 2.2, 34);
    if (P.reservations && P.reservations.length) yy += bloc(rx, yy, rw, "RÉSERVATIONS ET GAINES", P.reservations.map((r) => `${r.nom} — ${r.quiFait}${r.detail ? ` : ${r.detail}` : ""}`), 2.1, 60);
    if (M && P.electricite && P.electricite.length) yy += bloc(rx, yy, rw, "ÉLECTRICITÉ", P.electricite, 2.1, 56);
    if (M && P.essais && P.essais.length) bloc(rx, yy, rw, "ESSAIS À LA MISE EN SERVICE", P.essais, 2.1, cy - 3 - yy);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><style>${PT_A3_STYLE}</style>${out.join("")}</svg>`;
}
  function bornes(prims) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    const add = ([x, y]) => { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); };
    for (const p of prims) {
      if (p.pts) p.pts.forEach(add);
      if (p.t === "sol") { add([p.x1, 0]); add([p.x2, 0]); }
      if (p.a) { add(p.a); add(p.b); }
      if (p.t === "cercle") { add([p.c[0] - p.r, p.c[1] - p.r]); add([p.c[0] + p.r, p.c[1] + p.r]); }
      if (p.t === "texte") add(p.p);
    }
    return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
  }

  function coteGeom(p, fs) {
    const pas = fs * 2.4 * p.d;
    const [ax, ay] = p.a, [bx, by] = p.b;
    if (p.cote === "haut" || p.cote === "bas") {
      const y = p.cote === "haut" ? Math.max(ay, by) + pas : Math.min(ay, by) - pas;
      // Cote trop courte pour son chiffre : le chiffre passe à droite, hors des traits.
      const court = !p.ton && Math.abs(bx - ax) < fs * 0.62 * String(p.txt).length + fs;
      const tx = court ? Math.max(ax, bx) + fs * (0.9 + 0.33 * String(p.txt).length) : (ax + bx) / 2;
      return { l: [[ax, ay, ax, y], [bx, by, bx, y], [ax, y, bx, y]], ticks: [[ax, y], [bx, y]], txt: [tx, y + (p.cote === "haut" ? fs * 0.45 : -fs * 1.15)], rot: 0 };
    }
    const x = p.cote === "droite" ? Math.max(ax, bx) + pas : Math.min(ax, bx) - pas;
    // Cote trop courte : le chiffre passe au-dessus du trait, hors des repères.
    const court = Math.abs(by - ay) < fs * 0.62 * String(p.txt).length + fs;
    const ty = court ? Math.max(ay, by) + fs * (0.9 + 0.33 * String(p.txt).length) : (ay + by) / 2;
    return { l: [[ax, ay, x, ay], [bx, by, x, by], [x, ay, x, by]].concat(court ? [[x, Math.max(ay, by), x, ty - fs * 0.33 * String(p.txt).length - fs * 0.3]] : []), ticks: [[x, ay], [x, by]], txt: [x + (p.cote === "droite" ? fs * 0.45 : -fs * 0.45), ty], rot: -90, cote: p.cote };
  }

  // Le dessin d'une vue en SVG (sans toucher à la page) : le cadre (viewBox), la taille du texte et les traits. Le site
  // vend la même vue de face en aperçu : il appelle cette fonction, il ne redessine rien.
  function svgDe(prims, petit = false) {
    const b = bornes(prims);
    const fs = Math.max(b.w, b.h) / (petit === "planche" ? 19 : petit ? 26 : 42);
    const m = fs * 8.5;
    const vb = [b.x1 - m, -(b.y2 + m), b.w + 2 * m, b.h + 2 * m];
    const Y = (y) => -y;
    let out = "";
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    for (const p of prims) {
      const pc = p.piece ? ` data-piece="${esc([].concat(p.piece).join("|"))}"` : "", cc = p.piece ? " cliquable" : "";
      if (p.t === "poly") out += `<${p.ouvert ? "polyline" : "polygon"}${pc} class="${p.cls}${cc}" points="${p.pts.map(([x, y]) => `${x.toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}"/>`;
      if (p.t === "sol") out += `<line class="t-sol" x1="${p.x1}" y1="0" x2="${p.x2}" y2="0"/>`;
      if (p.t === "cercle") out += `<circle${pc} class="${p.cls}${cc}" cx="${p.c[0].toFixed(1)}" cy="${Y(p.c[1]).toFixed(1)}" r="${p.r.toFixed(1)}"/>`;
      if (p.t === "texte") {
        const dy = p.pos === "sous" ? fs * (1.25 + (p.decal || 0) * 1.1) : -fs * (0.55 + (p.decal || 0) * 1.1);
        const tc = p.ton ? `t-texte ${p.ton} halo` : "t-libre", tf = p.ton ? fs * 1.15 : fs * 0.72;
        out += `<text class="${tc}" font-size="${tf.toFixed(1)}" x="${p.p[0].toFixed(1)}" y="${(Y(p.p[1]) + dy).toFixed(1)}" text-anchor="middle">${esc(p.txt)}</text>`;
      }
      // Pointe de flèche (vers le haut) au bout d'un trait de rappel.
      if (p.t === "fleche") {
        const [x, y] = p.p, a = fs * 0.45;
        out += `<polygon class="t-fleche ${p.ton || ""}" points="${x.toFixed(1)},${Y(y).toFixed(1)} ${(x - a * 0.5).toFixed(1)},${Y(y - a).toFixed(1)} ${(x + a * 0.5).toFixed(1)},${Y(y - a).toFixed(1)}"/>`;
      }
      if (p.t === "point") out += `<circle class="t-point" cx="${p.c[0].toFixed(1)}" cy="${Y(p.c[1]).toFixed(1)}" r="${(fs * 0.22).toFixed(1)}"/>`;
      if (p.t === "angle") {
        const r = fs * 3.2, [cx, cy] = p.c;
        const x1 = cx - r, y1 = cy, x2 = cx - r * Math.cos(p.ang), y2 = cy - r * Math.sin(p.ang);
        out += `<path class="t-cote" d="M${x1.toFixed(1)},${Y(y1).toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 0 ${x2.toFixed(1)},${Y(y2).toFixed(1)}"/>`;
        out += `<text class="t-texte" font-size="${(fs * 0.85).toFixed(1)}" x="${(cx - r * 1.35).toFixed(1)}" y="${Y(cy - r * 0.45).toFixed(1)}" text-anchor="end">${esc(p.txt)}</text>`;
      }
      if (p.t === "cote") {
        const g = coteGeom(p, fs);
        const ton = p.ton ? " " + p.ton : "";
        for (const [x1, y1, x2, y2] of g.l) out += `<line class="t-cote${ton}" x1="${x1.toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${Y(y2).toFixed(1)}"/>`;
        const tk = fs * 0.45;
        for (const [x, y] of g.ticks) out += `<line class="t-cote${ton}" x1="${(x - tk).toFixed(1)}" y1="${Y(y - tk).toFixed(1)}" x2="${(x + tk).toFixed(1)}" y2="${Y(y + tk).toFixed(1)}"/>`;
        const [tx, ty] = g.txt;
        const anchor = g.rot ? "middle" : "middle";
        // Cotes verticales lues de haut en bas (tête penchée vers la droite).
        const tr = g.rot ? ` transform="rotate(90 ${tx.toFixed(1)} ${Y(ty).toFixed(1)})"` : "";
        const dy = g.rot ? (g.cote === "droite" ? -fs * 0.25 : fs * 0.45) : 0;
        out += `<text class="t-texte${ton}" font-size="${fs.toFixed(1)}" x="${tx.toFixed(1)}" y="${(Y(ty) + dy).toFixed(1)}" text-anchor="${anchor}"${tr}>${esc(p.txt)}</text>`;
      }
    }
    return { vb, fs, html: out };
  }


export { calculerPortail, ptEntrees, svgDe, PT_STYLES, PT_MODELES, PT_ATELIER, PT_MATIERES, PT_DECOR_FORMULES, PT_MOTEURS, MT_AVEC, MT_NOMS };
export const EMPREINTE = "a268e22c1192";
