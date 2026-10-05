// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : NE PAS MODIFIER À LA MAIN.
// Moteur garde-corps : norme NF P01-012, géométrie, débit, dessins. SANS coûts.
// Source : l'outil de plans (plans-atelier.html), sha256 1caf8c6fed72a55330b1cf64acaf9923f600e337c091bfb21176ddcfebe93e3c
/* eslint-disable */
const NOMS = { mikado: "Table Mikado", croix: "Table Croix", mikadoExt: "Table Mikado extérieur", gardeCorps: "Garde-corps Rosace à croix", escalier: "Escalier droit à limon central" };
const SPHERE = 110;
const SPHERE_HAUT = 180;
const Z_SPHERE = 800;
const MARGE_BOULE = 3;
const CIBLE_MARGE = 25;
const ROSACE_R = 50;
const rosaceR = (v) => (v.rosace === false ? 0 : v.rD >= 20 ? v.rD / 2 : ROSACE_R);
const Z_ESCALADE = 600;
const SB_VIDE = 100;
const SB_MINI = 60;
const SB_CROIX_MINI = 250;
const MC_PROFIL = { l: 40, h: 10, ep: 5.6, r: 20, kg: 2.2 };
const LIMITE_ACIER = 235;
const RENFORT = { l: 60, e: 10, bois: { l: 60, h: 45 }, LcMax: 2400, pasVis: 250, visD: 5, visL: 40 };
const E_ACIER = 210000;
const CHARGE_V = 0.67 * 1.5;
const HAUT_ETAGE = 1000;
const ALLEGE_LIBRE = 900;
const MINI_GC = 200;
const MINI_SEULS = 120;
const BARRE_APPUI = 40;
const DEG = 180 / Math.PI;
const BARRE = 6000;
const fmt = (x, d = 0) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const mmTxt = (x) => fmt(Math.round(x));
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
function barres(morceaux, trait, a) {
    const liste = [];
    for (const m of morceaux) for (let i = 0; i < m.qte; i++) liste.push(m.long + (m.ang ? a / Math.tan(m.ang) : 0) + trait);
    liste.sort((x, y) => y - x);
    const reste = [];
    for (const lg of liste) {
      const i = reste.findIndex((r) => r >= lg);
      if (i >= 0) reste[i] -= lg; else reste.push(BARRE - lg);
    }
    return { n: reste.length, chute: reste.reduce((s, r) => s + r, 0) };
  }
function aPlat(pts) {
    let best = 0, ang = 0;
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (l > best + 1e-6) { best = l; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
    });
    const c = Math.cos(-ang), s = Math.sin(-ang);
    let r = pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
    const mx = Math.min(...r.map((p) => p[0])), my = Math.min(...r.map((p) => p[1]));
    r = r.map(([x, y]) => [x - mx, y - my]);
    const H = Math.max(...r.map((p) => p[1]));
    const long = (y) => r.filter((p) => Math.abs(p[1] - y) < 0.5);
    const lg = (arr) => arr.length > 1 ? Math.max(...arr.map((p) => p[0])) - Math.min(...arr.map((p) => p[0])) : 0;
    if (lg(long(H)) > lg(long(0)) + 0.5) r = r.map(([x, y]) => [x, H - y]);
    return r;
  }
function nettoyer(pts) {
    const out = [];
    pts.forEach((p) => { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05) out.push(p); });
    if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 0.05) out.pop();
    return out.filter((p, i) => {
      const a = out[(i - 1 + out.length) % out.length], b = out[(i + 1) % out.length];
      return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) > 1e-3 * Math.hypot(b[0] - a[0], b[1] - a[1]);
    });
  }
function couper(poly, a, b, c) {
    const out = [];
    const f = (p) => a * p[0] + b * p[1] - c;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], fp = f(p), fq = f(q);
      if (fp <= 0) out.push(p);
      if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const k = fp / (fp - fq); out.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]); }
    }
    return out;
  }
function profil(pts, { cls = "t-acier-plein", debout = false, entier = false, pointe = false } = {}) {
    let P0 = nettoyer(pts);
    if (debout) { const mx = Math.min(...P0.map((p) => p[0])), my = Math.min(...P0.map((p) => p[1])); P0 = P0.map(([x, y]) => [x - mx, y - my]); }
    else P0 = aPlat(P0);
    const W = Math.max(...P0.map((p) => p[0])), H = Math.max(...P0.map((p) => p[1]));
    const iPointe = pointe ? P0.findIndex((p) => Math.abs(p[0] - W) < 0.5 && Math.abs(p[1] - H / 2) < 0.5) : -1;
    const eP = iPointe >= 0 ? Math.max(0, ...P0.filter((p) => p[0] > W / 2 && p[0] < W - 0.5).map((p) => W - p[0])) + 1.5 * H : 0;
    const e = Math.max(3.5 * H, eP), gap = 1.4 * H, coupe = !debout && !entier && W > 10 * H && W > 2 * e + 2 * gap;
    const X = (x) => !coupe || x <= e ? x : x >= W - e ? x - (W - 2 * e) + gap : e + gap / 2;
    const P = P0.map(([x, y]) => [X(x), y]);
    const prims = [{ t: "poly", cls, pts: P }];
    if (coupe) {
      prims.push({ t: "poly", cls: "t-fond", pts: [[e, -H * 0.2], [e + gap, -H * 0.2], [e + gap, H * 1.2], [e, H * 1.2]] });
      for (const xb of [e, e + gap]) prims.push({ t: "poly", cls: "t-coupure", pts: [[xb - H * 0.15, -H * 0.2], [xb + H * 0.15, H * 0.35], [xb - H * 0.15, H * 0.65], [xb + H * 0.15, H * 1.2]], ouvert: true });
    }
    const aretes = [];
    P0.forEach((p, i) => {
      const q = P0[(i + 1) % P0.length];
      if (Math.abs(q[1] - p[1]) < 0.5 && Math.abs(q[0] - p[0]) > 0.5) aretes.push([Math.min(p[0], q[0]), Math.max(p[0], q[0]), p[1]]);
    });
    const bas = aretes.filter((a) => a[2] < H / 2).sort((u, w) => (w[1] - w[0]) - (u[1] - u[0]))[0];
    const haut = aretes.filter((a) => a[2] >= H / 2).sort((u, w) => (w[1] - w[0]) - (u[1] - u[0]))[0];
    if (bas) prims.push({ t: "cote", a: [X(bas[0]), bas[2]], b: [X(bas[1]), bas[2]], cote: "bas", d: 1, txt: `${mmTxt(bas[1] - bas[0])}` });
    if (haut && !(bas && Math.abs(haut[0] - bas[0]) < 0.5 && Math.abs(haut[1] - bas[1]) < 0.5)) prims.push({ t: "cote", a: [X(haut[0]), haut[2]], b: [X(haut[1]), haut[2]], cote: "haut", d: 1, txt: `${mmTxt(haut[1] - haut[0])}` });
    const horsTout = !(bas && Math.abs(bas[1] - bas[0] - W) < 0.5) && !(haut && Math.abs(haut[1] - haut[0] - W) < 0.5);
    if (horsTout) prims.push({ t: "cote", a: [0, 0], b: [X(W), 0], cote: "bas", d: 2, txt: `${mmTxt(W)} hors tout` });
    if (debout) {
      P0.forEach((p, i) => {
        const q = P0[(i + 1) % P0.length];
        if (Math.abs(q[0] - p[0]) < 0.5 && Math.abs(q[1] - p[1]) > 0.5) {
          const gauche = p[0] < W / 2;
          prims.push({ t: "cote", a: [p[0], Math.min(p[1], q[1])], b: [p[0], Math.max(p[1], q[1])], cote: gauche ? "gauche" : "droite", d: 1, txt: `${mmTxt(Math.abs(q[1] - p[1]))}` });
        }
      });
    } else prims.push({ t: "cote", a: [X(W), 0], b: [X(W), H], cote: "droite", d: 1, txt: `${mmTxt(H)}` });
    const angles = P0.map((p, i) => {
      const a = P0[(i - 1 + P0.length) % P0.length], b = P0[(i + 1) % P0.length];
      const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
      return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))))) * DEG;
    });
    P.forEach((p, i) => {
      const ang = angles[i];
      if (i === iPointe) { prims.push({ t: "texte", p, txt: `pointe ${fmt(ang, 1)}°`, pos: "sur", decal: 1.5 }); return; }
      if (Math.abs(ang - 90) < 0.3 || ang > 179.5) return;
      const ia = (i - 1 + P.length) % P.length, ib = (i + 1) % P.length;
      if (iPointe >= 0 && (ia === iPointe || ib === iPointe) && P0[i][1] >= H / 2) return;
      const la = Math.hypot(P0[ia][0] - P0[i][0], P0[ia][1] - P0[i][1]), lb = Math.hypot(P0[ib][0] - P0[i][0], P0[ib][1] - P0[i][1]);
      const voisin = la < lb ? ia : ib;
      if (ang > 90 && Math.abs(ang + angles[voisin] - 180) < 0.5) return;
      prims.push({ t: "texte", p, txt: `${fmt(ang, 1)}° · scie ${fmt(Math.abs(90 - ang), 1)}°`, pos: p[1] < H / 2 ? "sous" : "sur" });
    });
    return prims;
  }
const rectPts = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const percages = (Lm, n, e) => (n >= 3 ? [e, Lm / 2, Lm - e] : [e, Lm - e]);
function percageCache(xe, xi, y, d, f) {
    const sens = Math.sign(xi - xe), pf = (f - d) / 2;
    return [
      { t: "poly", ouvert: true, cls: "t-cache", pts: [[xe, y + d / 2], [xi - sens * pf, y + d / 2], [xi, y + f / 2]] },
      { t: "poly", ouvert: true, cls: "t-cache", pts: [[xe, y - d / 2], [xi - sens * pf, y - d / 2], [xi, y - f / 2]] },
    ];
  }
function droite(p1, p2, vers, off) {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], n = Math.hypot(dx, dy);
    let a = -dy / n, b = dx / n, c = a * p1[0] + b * p1[1];
    if (a * vers[0] + b * vers[1] < c) { a = -a; b = -b; c = -c; }
    return { a, b, c: c + off };
  }
function inter(d1, d2) {
    const det = d1.a * d2.b - d2.a * d1.b;
    return [(d1.c * d2.b - d2.c * d1.b) / det, (d1.a * d2.c - d2.a * d1.c) / det];
  }
function cercleInscrit(P) {
    const [A, B, C] = P;
    const la = Math.hypot(B[0] - C[0], B[1] - C[1]), lb = Math.hypot(A[0] - C[0], A[1] - C[1]), lc = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const aire = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])) / 2;
    const per = la + lb + lc, r = 2 * aire / per;
    return { r, c: [(la * A[0] + lb * B[0] + lc * C[0]) / per, (la * A[1] + lb * B[1] + lc * C[1]) / per] };
  }
function trousPanneau(w, h, s, rr = ROSACE_R, barres = [], traverse = false) {
    const O = [0, 0], X = [w, 0], Y = [0, h], XY = [w, h], M = [w / 2, h / 2];
    const G = [0, h / 2], D2 = [w, h / 2];
    const tris = traverse ? [
      { nom: "bas", pts: [O, X, M] }, { nom: "haut", pts: [Y, XY, M] },
      { nom: "gauche-bas", pts: [O, G, M] }, { nom: "gauche-haut", pts: [G, Y, M] },
      { nom: "droite-bas", pts: [X, D2, M] }, { nom: "droite-haut", pts: [D2, XY, M] },
    ] : [
      { nom: "haut", pts: [Y, XY, M] }, { nom: "bas", pts: [O, X, M] },
      { nom: "gauche", pts: [O, Y, M] }, { nom: "droite", pts: [X, XY, M] },
    ];
    return tris.map((tr) => {
      const g = [(tr.pts[0][0] + tr.pts[1][0] + tr.pts[2][0]) / 3, (tr.pts[0][1] + tr.pts[1][1] + tr.pts[2][1]) / 3];
      const cotes = [[tr.pts[0], tr.pts[1], 0], [tr.pts[1], tr.pts[2], s / 2], [tr.pts[2], tr.pts[0], s / 2]];
      const D = cotes.map(([p, q, off]) => droite(p, q, g, off));
      const P = [inter(D[0], D[1]), inter(D[1], D[2]), inter(D[2], D[0])];
      const dBarre = (x) => barres.reduce((m, [a, b]) => Math.min(m, x < a ? a - x : x > b ? x - b : -Math.min(x - a, b - x)), Infinity);
      const f = (x, y) => Math.min(...D.map((d) => d.a * x + d.b * y - d.c), Math.hypot(x - M[0], y - M[1]) - rr, dBarre(x));
      let best = { r: -Infinity, c: [0, 0] };
      const N = barres.length ? 72 : 48;
      const parMorceau = traverse ? barres.map(() => ({ r: -Infinity, c: [0, 0] })).concat([{ r: -Infinity, c: [0, 0] }]) : null;
      for (let i = 0; i <= N; i++) for (let k = 0; k <= N - i; k++) {
        const u = i / N, w2 = k / N, z = 1 - u - w2;
        const x = u * P[0][0] + w2 * P[1][0] + z * P[2][0], y = u * P[0][1] + w2 * P[1][1] + z * P[2][1];
        const r = f(x, y); if (r > best.r) best = { r, c: [x, y] };
        if (traverse) { const m = parMorceau[barres.filter(([a]) => x > a).length]; if (r > m.r) { m.r = r; m.c = [x, y]; } }
      }
      const crete = (x, y) => {
        const L = D.map((d) => ({ v: d.a * x + d.b * y - d.c, g: [d.a, d.b] }));
        const dm = Math.hypot(x - M[0], y - M[1]) || 1e-9;
        L.push({ v: dm - rr, g: [(x - M[0]) / dm, (y - M[1]) / dm] });
        for (const [a, b] of barres) L.push({ v: x < a ? a - x : x > b ? x - b : -Math.min(x - a, b - x), g: [x < a ? -1 : x > b ? 1 : x - a < b - x ? -1 : 1, 0] });
        L.sort((p, q) => p.v - q.v);
        const t = [L[1].g[1] - L[0].g[1], L[0].g[0] - L[1].g[0]], n = Math.hypot(t[0], t[1]);
        return n > 1e-12 ? [[t[0] / n, t[1] / n], [-t[0] / n, -t[1] / n]] : [];
      };
      const huit = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      const departs = !traverse ? [best] : [best, (() => { const ci = cercleInscrit(P); return { r: f(ci.c[0], ci.c[1]), c: ci.c }; })()]
        .concat(barres.length ? parMorceau.filter((m) => m.r > -Infinity) : []);
      let fin = null;
      for (const d0 of departs) {
        best = d0;
        let pas = Math.max(w, h) / N;
        for (let it = 0; it < (traverse ? 60 : 30); it++) {
          let amel = false;
          for (const [dx, dy] of traverse ? huit.concat(crete(best.c[0], best.c[1])) : huit) {
            const x = best.c[0] + dx * pas, y = best.c[1] + dy * pas, r = f(x, y);
            if (r > best.r) { best = { r, c: [x, y] }; amel = true; }
          }
          if (!amel) pas /= 2;
        }
        if (!fin || best.r > fin.r) fin = best;
      }
      best = fin;
      if (traverse) {
        const dirs = Array.from({ length: 24 }, (_, k) => [Math.cos(k * Math.PI / 12), Math.sin(k * Math.PI / 12)]);
        let pas = 1;
        for (let it = 0; it < 40; it++) {
          let amel = false;
          for (const [dx, dy] of dirs) { const x = best.c[0] + dx * pas, y = best.c[1] + dy * pas, r = f(x, y); if (r > best.r) { best = { r, c: [x, y] }; amel = true; } }
          if (!amel) pas /= 2;
        }
      }
      return { nom: tr.nom, r: best.r, c: best.c, yBas: Math.min(P[0][1], P[1][1], P[2][1]) };
    });
  }
function demiTraverse(w, h, s) {
    const al = Math.atan2(h, w), long = w / 2 - (s / 2) / Math.sin(al), retrait = (s / 2) / Math.tan(al);
    return { al, long, retrait, pts: [[0, h / 2 - s / 2], [long - retrait, h / 2 - s / 2], [long, h / 2], [long - retrait, h / 2 + s / 2], [0, h / 2 + s / 2]] };
  }
function clip(poly, x1, y1, x2, y2) {
    const bords = [[(p) => p[0] >= x1, (a, b) => { const k = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + k * (b[1] - a[1])]; }],
      [(p) => p[0] <= x2, (a, b) => { const k = (x2 - a[0]) / (b[0] - a[0]); return [x2, a[1] + k * (b[1] - a[1])]; }],
      [(p) => p[1] >= y1, (a, b) => { const k = (y1 - a[1]) / (b[1] - a[1]); return [a[0] + k * (b[0] - a[0]), y1]; }],
      [(p) => p[1] <= y2, (a, b) => { const k = (y2 - a[1]) / (b[1] - a[1]); return [a[0] + k * (b[0] - a[0]), y2]; }]];
    let out = poly;
    for (const [dedans, cross] of bords) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[i], b = inp[(i + 1) % inp.length];
        if (dedans(b)) { if (!dedans(a)) out.push(cross(a, b)); out.push(b); } else if (dedans(a)) out.push(cross(a, b));
      }
    }
    return out;
  }
function barre(p, q, s, r) {
    const dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy), nx = -dy / n * s / 2, ny = dx / n * s / 2;
    const ex = dx / n * s * 3, ey = dy / n * s * 3;
    const poly = [[p[0] - ex + nx, p[1] - ey + ny], [q[0] + ex + nx, q[1] + ey + ny], [q[0] + ex - nx, q[1] + ey - ny], [p[0] - ex - nx, p[1] - ey - ny]];
    return clip(poly, r[0], r[1], r[2], r[3]);
  }
function mainCouranteGC(v) {
    if (v._mc) return v;
    let w = { ...v, _mc: true };
    if (v.mcType === "profil") w = { ...w, mc: MC_PROFIL.h, lMc: MC_PROFIL.l, chev: MC_PROFIL.h - MC_PROFIL.ep, lR: MC_PROFIL.r, profilMC: true };
    else if (v.mcType === "acier") w = { ...w, lMc: v.mc, mc: v.epMc };
    else if (v.mc > 0 && v.renfort === "plat") w = { ...w, lMc: RENFORT.bois.l, mc: RENFORT.bois.h, chev: 0, lR: 0, eRf: RENFORT.e, lRf: RENFORT.l };
    else if (v.mc > 0 && v.rainure !== false && v.rnP > 0) w = { ...w, chev: Math.min(v.rnP, v.s), lR: v.s + v.rnJ };
    return w;
  }
function geomGC(v, n) {
    v = mainCouranteGC(v);
    const seuls = !!v.seuls;
    if (seuls) { v = { ...v, traverse: false, nb: 0, rosace: false, sbMode: "auto" }; n = 1; }
    const Lc = v.B - v.j;
    const appuiA = 0, appuiX = v.Xo >= 100 && v.Xo < 600 ? v.Xo : 0;
    const cible = HAUT_ETAGE + Math.max(appuiA, appuiX) + CIBLE_MARGE;
    const manque = Math.ceil(cible - v.A - v.jour);
    const mini = seuls ? MINI_SEULS : MINI_GC;
    const hNorme = Math.max(mini, manque);
    const Hr = v.Hs >= mini ? v.Hs : hNorme;
    const appui = v.Hs >= mini || manque >= mini ? null : cible - v.A < BARRE_APPUI && (appuiX === 0 || v.A >= HAUT_ETAGE + appuiX) ? "rien" : "barre";
    const Hc = Hr - v.mc + (v.chev || 0) - (v.eRf || 0);
    const zCadre = v.A + v.jour;
    const Hc0 = Hc, hautInt = zCadre + Hc0 - v.s;
    const place = (z) => z - zCadre >= v.s + SB_MINI && hautInt - (z + v.s) >= SB_CROIX_MINI;
    const besoin = zCadre < Z_ESCALADE, voulu = !seuls && (besoin || v.sbMode === "toujours");
    let zL = 0;
    if (voulu) zL = place(Z_SPHERE) ? Z_SPHERE : besoin ? Z_ESCALADE : Math.round(zCadre + v.s + (Hc0 - 3 * v.s) / 3);
    let sb = zL ? Math.max(zL - zCadre, v.s + SB_MINI) : 0;
    if (sb && !besoin && Hc0 - 2 * v.s - sb < SB_CROIX_MINI / 2) sb = 0;
    const hb = sb ? sb - v.s : 0;
    const Wint = Lc - 2 * v.s;
    const videCible = zCadre + v.s < Z_SPHERE ? SB_VIDE : SPHERE_HAUT - 10;
    const nbS = sb ? Math.max(1, Math.ceil((Wint - videCible) / (v.s + videCible))) : 0;
    const videS = sb ? (Wint - nbS * v.s) / (nbS + 1) : 0;
    const h = Hc - 2 * v.s - (sb ? sb : 0);
    const w = (Lc - 2 * v.s - (n - 1) * v.s) / n;
    const zBas = v.A + v.jour + v.s + (sb ? sb : 0);
    const videB = zBas < Z_SPHERE ? SB_VIDE : SPHERE_HAUT - 10;
    const nbB = seuls ? Math.max(1, Math.ceil((Wint - videB) / (v.s + videB))) : 0;
    const vide = seuls ? (w - nbB * v.s) / (nbB + 1) : v.nb > 0 ? (w - v.nb * v.s) / (v.nb + 1) : Infinity;
    const barres = v.nb > 0 ? Array.from({ length: v.nb }, (_, b) => { const x = (b + 1) * vide + b * v.s; return [x, x + v.s]; }) : [];
    const trousSeuls = seuls && w > 0 && h > 0 ? [{ c: [vide / 2, Math.min(vide, h) / 2], r: Math.min(vide, h) / 2, yBas: 0 }] : [];
    const trous = (seuls ? trousSeuls : w > 0 && h > 0 ? trousPanneau(w, h, v.s, rosaceR(v), barres, !!v.traverse) : []).map((x) => {
      const d = 2 * x.r;
      const limite = zBas + x.yBas < Z_SPHERE ? SPHERE : SPHERE_HAUT;
      return { ...x, d, limite, ok: d < limite - MARGE_BOULE };
    });
    const pire = trous.reduce((m, x) => (!m || x.d / x.limite > m.d / m.limite ? x : m), null);
    return { Lc, cible, manque, appui, hNorme, Hr, Hc, h, w, trous, pire, vide, zBas, sb, hb, nbS, nbB, videS, limiteS: zCadre + v.s < Z_SPHERE ? SPHERE : SPHERE_HAUT, dMax: pire ? pire.d : Infinity, limite: pire ? pire.limite : SPHERE, ok: trous.every((x) => x.ok) };
  }
function sectionMainCourante(v) {
    if (v.profilMC) {
      const L = v.lMc / 2, H = v.mc, c = v.chev, r = v.lR / 2, pts = [[-L, 0], [-r, 0], [-r, c], [r, c], [r, 0], [L, 0], [L, H * 0.4]];
      for (let i = 1; i < 12; i++) { const t = Math.PI * i / 12, x = L * Math.cos(t); pts.push([x, H * 0.4 + H * 0.6 * Math.sin(t)]); }
      pts.push([-L, H * 0.4]);
      return pts;
    }
    const m = v.mc, W = v.eRf ? v.lMc : v.mc, c = v.chev || 0, l = v.lR || 0;
    return c > 0 ? [[-W / 2, 0], [-l / 2, 0], [-l / 2, c], [l / 2, c], [l / 2, 0], [W / 2, 0], [W / 2, m], [-W / 2, m]] : rect(-W / 2, 0, W / 2, m);
  }
function dessinMainCourante(L, v) {
    const W = v.profilMC || v.eRf ? v.lMc : v.mc, H = v.mc, cls = v.profilMC ? "t-acier-plein" : "t-bois";
    const D = profil(rectPts(L, H), { cls });
    if (!(v.chev > 0) && !v.eRf) return D;
    const K = Math.max(2, Math.round(Math.min(L, 12 * W) / (3 * W)));
    const m = W * K, ox = -(m / 2 + 5.5 * W);
    const S = sectionMainCourante(v).map(([x, y]) => [ox + x * K, y * K]);
    const n = (x) => (Number.isInteger(x) ? mmTxt(x) : fmt(x, 1));
    if (v.eRf) {
      const e = v.eRf * K, sK = v.s * K, lP = v.lRf * K, xv = (v.s / 2 + v.lRf / 2) / 2 * K;
      D.push({ t: "poly", cls: "t-acier-plein", pts: rect(ox - sK / 2, -e - sK, ox + sK / 2, -e) });
      D.push({ t: "poly", cls: "t-acier-plein", pts: rect(ox - lP / 2, -e, ox + lP / 2, 0) });
      D.push({ t: "poly", cls, pts: S });
      D.push({ t: "poly", ouvert: true, cls: "t-cache", pts: [[ox - xv, -e], [ox - xv, (v.eRf + 30) * K - e]] }, { t: "poly", ouvert: true, cls: "t-cache", pts: [[ox + xv, -e], [ox + xv, (v.eRf + 30) * K - e]] });
      D.push({ t: "cote", a: [ox - m / 2, 0], b: [ox - m / 2, H * K], cote: "gauche", d: 1, txt: n(H) });
      D.push({ t: "cote", a: [ox + lP / 2, -e], b: [ox + lP / 2, 0], cote: "droite", d: 1, txt: n(v.eRf) });
      D.push({ t: "cote", a: [ox - m / 2, H * K], b: [ox + m / 2, H * K], cote: "haut", d: 1, txt: n(W) });
      D.push({ t: "texte", p: [ox, -e - sK], txt: `Section (agrandie ×${K}) : bois ${n(W)} × ${n(H)} posé sur le plat ${n(v.lRf)} × ${n(v.eRf)}, vissé par dessous`, pos: "sous", decal: 4.2 });
      return D;
    }
    D.push({ t: "poly", cls, pts: S });
    D.push({ t: "cote", a: [ox - v.lR * K / 2, 0], b: [ox + v.lR * K / 2, 0], cote: "bas", d: 1, txt: n(v.lR) });
    D.push({ t: "cote", a: [ox + m / 2, 0], b: [ox + m / 2, v.chev * K], cote: "droite", d: 1, txt: n(v.chev) });
    D.push({ t: "cote", a: [ox - m / 2, 0], b: [ox - m / 2, H * K], cote: "gauche", d: 1, txt: n(H) });
    D.push({ t: "cote", a: [ox - m / 2, H * K], b: [ox + m / 2, H * K], cote: "haut", d: 1, txt: n(W) });
    D.push({ t: "texte", p: [ox, 0], txt: `Section (agrandie ×${K}) : rainure ${n(v.lR)} × ${n(v.chev)}`, pos: "sous", decal: 4.2 });
    return D;
  }
function coupeMainCourante(v0) {
    const v = mainCouranteGC(v0), s = v.s, D = [];
    if (v.eRf) {
      const xv = (s / 2 + v.lRf / 2) / 2;
      D.push({ t: "poly", cls: "t-acier-plein", pts: rect(-s / 2, -v.eRf - s, s / 2, -v.eRf) });
      D.push({ t: "poly", cls: "t-acier-plein", pts: rect(-v.lRf / 2, -v.eRf, v.lRf / 2, 0) });
      D.push({ t: "poly", cls: "t-bois", pts: sectionMainCourante(v) });
      D.push({ t: "poly", ouvert: true, cls: "t-cache", pts: [[-xv, -v.eRf], [-xv, v.mc * 0.7]] }, { t: "poly", ouvert: true, cls: "t-cache", pts: [[xv, -v.eRf], [xv, v.mc * 0.7]] });
      return D;
    }
    if (v.mcType === "acier") {
      D.push({ t: "poly", cls: "t-acier-plein", pts: rect(-s / 2, -s, s / 2, 0) });
      D.push({ t: "poly", cls: "t-acier-plein", pts: rect(-v.lMc / 2, 0, v.lMc / 2, v.mc) });
      return D;
    }
    const c = v.chev || 0;
    D.push({ t: "poly", cls: "t-acier-plein", pts: rect(-s / 2, c - s, s / 2, c) });
    D.push({ t: "poly", cls: v.profilMC ? "t-acier-plein" : "t-bois", pts: sectionMainCourante(v) });
    return D;
  }
function dessinMontantRive(pts, Lm, v) {
    const s = v.s, posF = percages(Lm, v.nF, v.eF);
    const D = profil(pts, { entier: true });
    const pf = (v.fF - v.dF) / 2;
    posF.forEach((x) => [-1, 1].forEach((k) => D.push({ t: "poly", ouvert: true, cls: "t-cache", pts: [[x + k * v.dF / 2, 0], [x + k * v.dF / 2, s - pf], [x + k * v.fF / 2, s]] })));
    const dy = -(s + Math.max(60, Lm * 0.18));
    D.push({ t: "poly", cls: "t-acier-plein", pts: rectPts(Lm, s).map(([a, b]) => [a, b + dy]) });
    posF.forEach((x) => D.push({ t: "cercle", cls: "t-cache", c: [x, dy + s / 2], r: v.fF / 2 }, { t: "cercle", cls: "t-trou-plan", c: [x, dy + s / 2], r: v.dF / 2 }));
    const ch = [0, ...posF, Lm];
    for (let k = 0; k + 1 < ch.length; k++) D.push({ t: "cote", a: [ch[k], dy], b: [ch[k + 1], dy], cote: "bas", d: 1, txt: mmTxt(ch[k + 1] - ch[k]) });
    D.push({ t: "texte", p: [Lm / 2, dy + s], txt: `Face intérieure : ${posF.length} perçages Ø ${fmt(v.dF, 1)} traversants, fraisés 90° à Ø ${fmt(v.fF, 1)}`, pos: "sur", decal: 0.6 });
    return D;
  }
function calculerGC(v) {
    const vEntree = v;
    const acier = v.mcType === "acier";
    const profilMC = v.mcType === "profil";
    v = mainCouranteGC(v);
    const seuls = !!v.seuls;
    if (seuls) v = { ...v, traverse: false, nb: 0, rosace: false, sbMode: "auto", nP: 1 };
    const renfort = v.eRf > 0;
    const rain = !acier && !profilMC && !renfort && v.chev > 0;
    const R = { vues: { face: [], cote: [], dessus: [] }, debit: [], alertes: [], oks: [], notes: [], resume: [], tubes: [], acierM2: 0, poids: 0 };
    const F = R.vues.face, C = R.vues.cote, D = R.vues.dessus;
    const auto = Math.max(1, Math.round(v.B / 600));
    const n = v.nP >= 1 ? Math.round(v.nP) : 1;
    const g = geomGC(v, seuls ? 1 : n);
    if ((v.ass === "onglet" ? g.Hc : g.Hc - 2 * v.s) < 2 * v.eF + v.fF) v = { ...v, eF: Math.max(15, v.fF / 2 + 9) };
    if (!(g.w > 3 * v.s) || !(g.h > 3 * v.s)) { R.alertes.push(seuls ? "Le garde-corps est trop petit pour des barreaux : augmente la largeur ou la hauteur." : "Le garde-corps est trop petit pour ce nombre de croix : baisse le nombre de croix ou augmente la hauteur."); return R; }
    const s = v.s, x0 = -g.Lc / 2, y0 = v.A + v.jour, haut = y0 + g.Hr;
    const obligatoire = v.etage && v.A < ALLEGE_LIBRE;
    if (g.appui === "rien") R.alertes.push(`Barre d'appui : rien à poser. Le bas de la fenêtre est à ${mmTxt(v.A)} mm du sol : il reste moins de ${BARRE_APPUI} mm jusqu'à ${mmTxt(g.cible)} mm${v.Xo >= 100 && v.Xo < 600 ? "" : `, et à partir de ${ALLEGE_LIBRE} mm la loi n'impose rien`}.`);
    else if (g.appui) {
      const miniGC = seuls ? MINI_SEULS : MINI_GC, videB = g.cible - BARRE_APPUI - v.A, limiteB = v.A < Z_SPHERE ? SPHERE : SPHERE_HAUT, jourB = g.cible - v.A - miniGC;
      R.alertes.push(`Barre d'appui : il ne manque que ${mmTxt(g.cible - v.A)} mm entre le bas de la fenêtre et ${mmTxt(g.cible)} mm du sol. Un garde-corps ${seuls ? "à barreaux" : "à croix"} de ${miniGC} mm monterait à ${mmTxt(haut)} mm : la main courante ne serait plus à sa hauteur. ` +
        (videB < limiteB ? `Une barre d'appui seule suffit (vide de ${mmTxt(videB)} mm dessous, boule de ${limiteB}).` : `Il faut une barre d'appui avec une lisse basse (une barre seule laisserait ${mmTxt(videB)} mm de vide, boule de ${limiteB}).`) +
        (jourB >= 0 ? ` Ou garde un garde-corps de ${miniGC} mm en réduisant le jour sous le cadre à ${mmTxt(jourB)} mm.` : ""));
    }

    let nMin = null;
    if (!v._rapide && !seuls) for (let k = 1; k <= 12; k++) { const gk = geomGC(v, k); if (gk.w > 3 * s && gk.ok) { nMin = k; break; } }
    let bMin = null;
    if (!g.ok && !v._rapide && !seuls) for (let k = 1; k <= 12; k++) { const gk = geomGC({ ...v, nb: k }, n); if (gk.ok) { bMin = k; break; } }
    const tOk = !g.ok && !v.traverse && !v._rapide && !seuls && geomGC({ ...v, traverse: true }, n).ok;
    if (g.ok && g.dMax > g.limite - 10) R.notes.push(`Trous : ${mmTxt(g.dMax)} mm pour ${g.limite - MARGE_BOULE} au maximum (la boule de la norme, ${g.limite}, moins ${MARGE_BOULE} mm de marge de fabrication). C'est juste : la norme ne tolère aucun millimètre de plus.`);
    if (g.ok) R.oks.push(`Trous : le plus grand cercle fait Ø ${mmTxt(g.dMax)} mm${v.nb > 0 || seuls ? `, vide entre barreaux ${fmt(g.vide, 1)} mm` : ""} (boule de ${g.limite} mm à cet endroit, ${MARGE_BOULE} mm de marge comprise : ${g.limite === SPHERE ? "le trou commence sous 800 mm du sol" : "tout le trou est au-dessus de 800 mm du sol"}) : elle ne passe pas.`);
    else R.alertes.push(`Trous : ${mmTxt(g.dMax)} mm (cercle rouge). À cet endroit, une boule de ${g.limite} mm ne doit pas passer : l'atelier exige moins de ${g.limite - MARGE_BOULE} mm (${MARGE_BOULE} mm de marge de fabrication), pas aux normes.` +
      (nMin ? ` Solution : ${nMin} croix sur cette largeur.` : "") + (bMin ? ` Ou ${bMin} barreaux par panneau (réglage « Barreaux »).` : "") +
      (tOk ? `${nMin || bMin ? " Ou" : " Solution :"} une traverse au milieu ${n > 1 ? "de chaque croix" : "de la croix"} (Options, « Traverse au milieu »).` : ""));
    {
      const LmC = v.ass === "onglet" ? g.Hc : g.Hc - 2 * s;
      if (v.fF > s - 2) R.alertes.push(`Fixation : la fraisure Ø ${fmt(v.fF, 1)} est trop grande pour un carré de ${s}. Il faut au moins 1 mm de métal de chaque côté (Ø ${s - 2} au plus) : prends une vis plus petite ou un carré plus gros.`);
      else if (v.dF >= v.fF) R.alertes.push(`Fixation : la fraisure (Ø ${fmt(v.fF, 1)}) doit être plus grande que le perçage (Ø ${fmt(v.dF, 1)}).`);
      if (v.eF < v.fF / 2 + (v.ass === "onglet" ? s : 0) + 3 || LmC < 2 * v.eF + v.fF) R.alertes.push(`Fixation : les perçages sont trop près des bouts du montant (${mmTxt(v.eF)} mm du bout, montant de ${mmTxt(LmC)} mm). Change « Perçages : distance des bouts ».`);
      else R.oks.push(`Fixation : ${v.nF} perçages Ø ${fmt(v.dF, 1)} fraisés à Ø ${fmt(v.fF, 1)} par montant de rive, à ${mmTxt(v.eF)} mm des bouts.`);
    }
    if (profilMC && s > MC_PROFIL.r - 1) R.alertes.push(`Main courante profilée : sa rainure fait ${MC_PROFIL.r} mm, le carré de ${s} ne rentre pas. Prends un carré de ${MC_PROFIL.r - 2} au plus.`);
    else if (profilMC) R.notes.push(`Main courante profilée ${MC_PROFIL.l} × ${MC_PROFIL.h} : rainure de ${MC_PROFIL.r} sur un carré de ${s} (${fmt((MC_PROFIL.r - s) / 2, 1)} mm de jeu de chaque côté), emboîtée de ${fmt(MC_PROFIL.h - MC_PROFIL.ep, 1)} mm. Profondeur déduite des cotes du fabricant (10 − 5,6) : à vérifier sur la barre reçue.`);
    const nVisMc = renfort ? Math.max(4, Math.round(g.Lc / RENFORT.pasVis) + 1) : 0;
    if (renfort) {
      const debord = (v.lRf - s) / 2;
      if (debord < RENFORT.visD + 8) R.alertes.push(`Main courante : avec un carré de ${s}, le plat de ${mmTxt(v.lRf)} ne dépasse que de ${fmt(debord, 1)} mm de chaque côté : pas la place pour les vis du bois. Prends un carré de ${v.lRf - 2 * (RENFORT.visD + 8)} au plus.`);
      else R.oks.push(`Main courante : bois ${mmTxt(v.lMc)} × ${mmTxt(v.mc)} posé sur le plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)}, vissé par dessous (${nVisMc} vis Ø ${RENFORT.visD} × ${RENFORT.visL}).`);
    }
    if (rain) {
      const joue = (v.mc - v.lR) / 2, dessus = v.mc - v.chev;
      if (joue < 8 || dessus < 20) R.alertes.push(`Main courante : la rainure ${(Number.isInteger(v.lR) ? mmTxt(v.lR) : fmt(v.lR, 1))} × ${mmTxt(v.chev)} affaiblit trop le bois de ${mmTxt(v.mc)} (il reste ${fmt(joue, 1)} mm sur les côtés et ${mmTxt(dessus)} mm dessus). Il faut au moins 8 mm sur les côtés et 20 mm dessus : prends une main courante plus grosse ou une rainure moins profonde.`);
      else R.oks.push(`Main courante : rainure ${(Number.isInteger(v.lR) ? mmTxt(v.lR) : fmt(v.lR, 1))} × ${mmTxt(v.chev)}, il reste ${fmt(joue, 1)} mm de bois sur les côtés et ${mmTxt(dessus)} mm dessus.`);
      if (v.chev >= v.s) R.notes.push("Rainure aussi profonde que le carré : le bois descend jusqu'au bas de la lisse et touchera les cordons de soudure des diagonales. Garde 2 mm de moins que le carré.");
    }
    if (!(v.j >= 0 && v.j <= 2)) R.alertes.push(`Jeu total : ${mmTxt(v.j)} mm entre les murs. Il doit rester entre 0 et 2 mm (le cadre fait alors ${mmTxt(v.B - Math.min(Math.max(v.j, 0), 2))} mm pour ${mmTxt(v.B)} mm entre tableaux).`);
    if (v.jour >= SPHERE) R.alertes.push(`Jour sous le cadre : ${mmTxt(v.jour)} mm. Il doit faire moins de ${SPHERE} mm.`);
    else if (v.jour > 90) R.notes.push(`Jour sous le cadre : ${mmTxt(v.jour)} mm. C'est permis (moins de ${SPHERE}), mais les fabricants conseillent 90 mm au plus, mesuré au point le plus creux de l'appui.`);
    else R.oks.push(`Jour sous le cadre : ${mmTxt(v.jour)} mm.`);
    const appuiAllege = 0, appuiMeuble = v.Xo >= 100 && v.Xo < 600 ? v.Xo : 0;
    const X = Math.max(appuiAllege, appuiMeuble), hMin = HAUT_ETAGE + X;
    if (obligatoire || X > 0) {
      const raison = X === 0 ? "du sol" : appuiMeuble >= appuiAllege ? `du sol (1 000 au-dessus du radiateur ou du meuble de ${mmTxt(X)} mm)` : `du sol (1 000 au-dessus de l'appui)`;
      if (haut < hMin) R.alertes.push(`Hauteur : la main courante arrive à ${mmTxt(haut)} mm. Il faut au moins ${mmTxt(hMin)} mm ${raison}, sans tolérance.`);
      else if (haut < hMin + CIBLE_MARGE) R.notes.push(`Hauteur : ${mmTxt(haut)} mm, c'est juste (au moins ${mmTxt(hMin)}, aucune tolérance). Vise ${mmTxt(hMin + CIBLE_MARGE)} mm.`);
      else R.oks.push(`Hauteur : la main courante arrive à ${mmTxt(haut)} mm ${X ? raison : "du sol"} (au moins ${mmTxt(hMin)}).`);
    } else R.notes.push(v.etage ? `Allège de ${mmTxt(v.A)} mm : à partir de ${ALLEGE_LIBRE} mm, la loi n'impose pas de protection.` : "Rez-de-chaussée : la loi n'impose pas de protection.");
    if (!appuiMeuble && v.A >= 100 && v.A < Z_ESCALADE && v.Hs < MINI_GC) R.notes.push(`Bas de fenêtre à ${mmTxt(v.A)} mm (entre 100 et ${Z_ESCALADE}) : main courante à ${mmTxt(HAUT_ETAGE)} mm du sol au moins, mesurée du sol.`);
    if (v.A >= 600 && v.A < 625) R.notes.push("Allège entre 600 et 625 mm : le seuil de 600 n'a pas de tolérance. Mesure bien.");
    if (g.sb) {
      R.notes.push(`Soubassement : ${v.A + v.jour < Z_ESCALADE ? `le cadre commence à ${mmTxt(v.A + v.jour)} mm du sol, dans la zone d'escalade (100 à 600 mm). ` : "choisi pour le style. "}Le bas est rempli de ${g.nbS} barreaux (vides de ${fmt(g.videS, 1)} mm), fermé par une lisse dont le dessus est à ${mmTxt(v.A + v.jour + g.sb + s)} mm du sol ; les croix commencent au-dessus.`);
      if (g.videS >= g.limiteS - MARGE_BOULE) R.alertes.push(`Soubassement : vide de ${fmt(g.videS, 1)} mm entre barreaux, il faut moins de ${g.limiteS - MARGE_BOULE} (la boule de la norme, ${g.limiteS}, moins ${MARGE_BOULE} mm de marge).`);
      else R.oks.push(v.A + v.jour < Z_ESCALADE ? `Escalade : rien à quoi grimper sous 600 mm (barreaux verticaux, vide de ${fmt(g.videS, 1)} mm).` : `Soubassement : barreaux verticaux, vide de ${fmt(g.videS, 1)} mm.`);
    } else if (seuls) R.oks.push(`Escalade : seulement des barreaux verticaux, rien à quoi poser le pied (${g.nbB} barreaux, vides de ${fmt(g.vide, 1)} mm).`);
    else R.oks.push("Escalade : tout le garde-corps est au-dessus de 600 mm du sol.");
    if (v.traverse) {
      const zT = g.zBas + g.h / 2 + s / 2;
      if (zT >= Z_ESCALADE) R.oks.push(`Traverse du milieu : son dessus est à ${mmTxt(zT)} mm du sol, plus haut que 600 mm. Pour la norme, ce n'est pas une marche : la hauteur à respecter ne change pas.`);
      else R.alertes.push(`Escalade : le dessus de la traverse du milieu est à ${mmTxt(zT)} mm du sol. Sous 600 mm, un enfant peut y poser le pied : pas aux normes. Enlève la traverse.`);
    }
    if (!seuls && v.sbMode === "toujours" && !g.sb) R.notes.push(`Barreaux en bas : pas assez de hauteur (cadre de ${mmTxt(g.Hc)} mm), les croix seraient trop plates. Garde-corps dessiné avec les croix seules.`);
    const Ih = s ** 4 / 12 + (renfort ? v.eRf * v.lRf ** 3 / 12 : 0);
    const Wh = renfort ? Ih / (Math.max(s, v.lRf) / 2) : s * s * s / 6;
    const Lm = g.Lc / 1000, sigma = (0.9 * Lm * Lm / 8) * 1e6 / Wh;
    const lisseTxt = renfort ? `la lisse haute renforcée (carré de ${s} + plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)})` : `la lisse haute en carré de ${s}`;
    const peutRenfort = !renfort && !acier && !profilMC && v.mc > 0 && g.Lc <= RENFORT.LcMax;
    if (renfort && g.Lc > RENFORT.LcMax) R.alertes.push(`Solidité : ${mmTxt(g.Lc)} mm de large. Au-delà de ${mmTxt(RENFORT.LcMax)} mm, le plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)} n'est plus garanti (flèche, déversement, fixations) : il faut une note de calcul.`);
    else if (sigma > LIMITE_ACIER) R.alertes.push(`Solidité : ${lisseTxt} travaille à ${mmTxt(sigma)} MPa (limite ${LIMITE_ACIER}). Trop faible : ${renfort ? "il faut une note de calcul" : `prends un carré plus gros${peutRenfort ? `, ou ajoute le renfort (plat ${RENFORT.l} × ${RENFORT.e} sous la main courante bois)` : ""}`}.`);
    else if (sigma > 0.8 * LIMITE_ACIER) R.notes.push(`Solidité : ${lisseTxt} travaille à ${mmTxt(sigma)} MPa, pour ${LIMITE_ACIER} au maximum. C'est à la limite : ${renfort ? "une note de calcul" : s < 20 ? "un carré de 20 ou une note de calcul" : "le renfort (plat sous la main courante) ou une note de calcul"}.`);
    else R.oks.push(`Solidité : ${renfort ? "lisse haute renforcée" : "lisse haute"} à ${mmTxt(sigma)} MPa (limite ${LIMITE_ACIER}).`);
    if (renfort) {
      const fleche = 5 * 0.6 * g.Lc ** 4 / (384 * E_ACIER * Ih);
      R.notes.push(`Flèche : sous la poussée normale (0,6 kN/m), la main courante bouge de ${fmt(fleche, 1)} mm au milieu (repère du métier : L/300 = ${fmt(g.Lc / 300, 1)} mm).`);
    }
    {
      const Lv = g.w + s, Wv = renfort ? (s ** 4 / 12 + v.lRf * v.eRf ** 3 / 12) / (s / 2) : s * s * s / 6;
      const Iv = s ** 4 / 12 + (renfort ? v.lRf * v.eRf ** 3 / 12 : 0), Ib = s ** 4 / 12;
      const sigmaV = seuls ? (Iv / (Iv + Ib)) * 0.25 * CHARGE_V * g.Lc * 1000 / (Iv / (s / 2)) : (n > 1 ? 0.203 : 0.25) * CHARGE_V * Lv * 1000 / Wv;
      if (seuls) {
        if (sigmaV > LIMITE_ACIER) R.alertes.push(`Charge verticale : si quelqu'un s'appuie de tout son poids au milieu, la traverse haute (reliée à la basse par les barreaux) travaille à ${mmTxt(sigmaV)} MPa (limite ${LIMITE_ACIER}). Trop faible : prends un carré plus gros.`);
        else R.oks.push(`Charge verticale : la traverse haute, aidée par la basse à travers les barreaux, travaille à ${mmTxt(sigmaV)} MPa (limite ${LIMITE_ACIER}). Calcul simplifié.`);
      } else if (sigmaV > LIMITE_ACIER) R.alertes.push(`Charge verticale : si quelqu'un s'appuie de tout son poids au milieu d'un panneau de ${mmTxt(Lv)} mm, la lisse haute travaille à ${mmTxt(sigmaV)} MPa (limite ${LIMITE_ACIER}). Trop faible : mets plus de croix (des panneaux plus étroits).`);
      else R.oks.push(`Charge verticale : lisse haute à ${mmTxt(sigmaV)} MPa entre deux montants (limite ${LIMITE_ACIER}).`);
    }
    {
      const LmF = v.ass === "onglet" ? g.Hc : g.Hc - 2 * s, pos = percages(LmF, v.nF, v.eF);
      const dF = pos[pos.length - 1] - pos[0], aF = g.Hr - ((v.ass === "onglet" ? 0 : s) + pos[pos.length - 1]);
      if (dF > 0) {
        const Vd = 0.45 * Lm, k = 1 + aF / dF, haute = Vd * k;
        if (renfort && k > 2) R.alertes.push(`Fixation : les perçages d'un montant ne sont écartés que de ${mmTxt(dF)} mm. Sur une fenêtre de ${mmTxt(g.Lc)} mm, la vis du haut reprendrait ${mmTxt(haute * 100)} kg : trop pour un mur. Il faut un garde-corps plus haut (un bas de fenêtre plus bas) ou une note de calcul.`);
        else if (renfort || haute > 1) R.notes.push(`Fixation : chaque côté reprend ${mmTxt(Vd * 100)} kg de poussée, dont ${mmTxt(haute * 100)} kg sur la vis du haut. À justifier selon le mur : scellement chimique ; dans le tuffeau ou un mur creux, essai d'arrachement sur place.`);
      }
    }
    if (v.Hf > 0 && v.A + v.Hf < haut) R.alertes.push(`La fenêtre est trop basse : le haut de l'ouverture est à ${mmTxt(v.A + v.Hf)} mm du sol, la main courante à ${mmTxt(haut)} mm.`);
    R.notes.push("Garde-corps visible en façade : le client doit sans doute déposer une déclaration préalable en mairie.");

    const B2 = v.B / 2, hautMur = Math.max(haut + 250, v.Hf > 0 ? v.A + v.Hf : 0);
    F.push({ t: "sol", x1: -B2 - 350, x2: B2 + 350 });
    F.push({ t: "poly", cls: "t-mur", pts: rect(-B2 - 250, 0, -B2, hautMur) }, { t: "poly", cls: "t-mur", pts: rect(B2, 0, B2 + 250, hautMur) });
    F.push({ t: "poly", cls: "t-mur", pts: rect(-B2, 0, B2, v.A) });
    F.push({ t: "poly", piece: "Traverses du cadre", cls: "t-acier-plein", pts: rect(x0, y0, -x0, y0 + s) }, { t: "poly", piece: "Traverses du cadre", cls: "t-acier-plein", pts: rect(x0, y0 + g.Hc - s, -x0, y0 + g.Hc) });
    F.push({ t: "poly", piece: "Montants de rive", cls: "t-acier-plein", pts: rect(x0, y0, x0 + s, y0 + g.Hc) }, { t: "poly", piece: "Montants de rive", cls: "t-acier-plein", pts: rect(-x0 - s, y0, -x0, y0 + g.Hc) });
    if (renfort) F.push({ t: "poly", piece: "Plat de renfort", cls: "t-acier-plein", pts: rect(x0, y0 + g.Hc, -x0, y0 + g.Hc + v.eRf) });
    if (v.mc > 0) F.push({ t: "poly", piece: "Main courante", cls: acier || profilMC ? "t-acier-plein" : "t-bois", pts: rect(x0, y0 + g.Hc + (v.eRf || 0) - (v.chev || 0), -x0, haut) });
    const yM = v.ass === "onglet" ? y0 : y0 + s, LmR = v.ass === "onglet" ? g.Hc : g.Hc - 2 * s;
    const posF = percages(LmR, v.nF, v.eF);
    posF.forEach((pz) => { F.push(...percageCache(x0, x0 + s, yM + pz, v.dF, v.fF), ...percageCache(-x0, -x0 - s, yM + pz, v.dF, v.fF)); });
    if (g.sb) {
      F.push({ t: "poly", piece: "Lisse intermédiaire", cls: "t-acier-plein", pts: rect(x0 + s, y0 + g.sb, -x0 - s, y0 + g.sb + s) });
      for (let b = 1; b <= g.nbS; b++) { const bx = x0 + s + b * g.videS + (b - 1) * s; F.push({ t: "poly", piece: "Barreaux du soubassement", cls: "t-acier-plein", pts: rect(bx, y0 + s, bx + s, y0 + g.sb) }); }
      F.push({ t: "cote", a: [x0 + s, y0 + s + g.hb * 0.25], b: [x0 + s + g.videS, y0 + s + g.hb * 0.25], cote: "haut", d: 0, txt: fmt(g.videS, 0) });
    }
    for (let i = 0; i < n; i++) {
      const px = x0 + s + i * (g.w + s), py = y0 + s + (g.sb || 0);
      if (i > 0) F.push({ t: "poly", piece: "Montants entre les croix", cls: "t-acier-plein", pts: rect(px - s, py, px, py + g.h) });
      const r = [px, py, px + g.w, py + g.h];
      if (seuls) for (let b = 1; b <= g.nbB; b++) { const bx = px + b * g.vide + (b - 1) * s; F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: rect(bx, py, bx + s, py + g.h) }); }
      else {
      F.push({ t: "poly", piece: "Diagonale entière", cls: "t-acier-plein", pts: barre([px, py], [px + g.w, py + g.h], s, r) });
      F.push({ t: "poly", piece: "Demi-diagonale", cls: "t-acier-plein", pts: barre([px, py + g.h], [px + g.w, py], s, r) });
      if (v.traverse) {
        const dt = demiTraverse(g.w, g.h, s);
        F.push({ t: "poly", piece: "Demi-traverses du milieu", cls: "t-acier-plein", pts: dt.pts.map(([x, y]) => [px + x, py + y]) });
        F.push({ t: "poly", piece: "Demi-traverses du milieu", cls: "t-acier-plein", pts: dt.pts.map(([x, y]) => [px + g.w - x, py + y]) });
      }
      if (v.rosace !== false) F.push({ t: "cercle", piece: "Rosaces", cls: "t-rond", c: [px + g.w / 2, py + g.h / 2], r: rosaceR(v) });
      for (let b = 1; b <= v.nb; b++) { const bx = px + b * g.vide + (b - 1) * s; F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: rect(bx, py, bx + s, py + g.h) }); }
      }
      if (i === 0) {
        const vus = new Set(), ronds = [];
        g.trous.forEach((x) => { const k = v.traverse ? `${Math.round(x.d)}|${x.ok}` : Math.round(x.d); if (!vus.has(k)) { vus.add(k); ronds.push({ c: [px + x.c[0], py + x.c[1]], d: x.d, ok: x.ok }); } });
        if (g.sb) { const dS = Math.min(g.videS, g.hb); ronds.push({ c: [x0 + s + g.videS / 2, y0 + s + g.hb / 2], d: dS, ok: dS < g.limiteS - MARGE_BOULE }); }
        const yl = y0 - Math.max(60, g.Lc * 0.07);
        ronds.sort((a, b) => a.c[0] - b.c[0]).forEach((r, k) => {
          const xl = x0 + (g.Lc * (k + 1)) / (ronds.length + 1), ton = r.ok ? "bon" : "ko";
          F.push({ t: "cercle", cls: r.ok ? "t-bon" : "t-trou", c: r.c, r: r.d / 2 });
          F.push({ t: "poly", ouvert: true, cls: "t-cote " + ton, pts: [[r.c[0], r.c[1] - r.d / 2], [r.c[0], yl], [xl, yl]] });
          F.push({ t: "fleche", p: [r.c[0], r.c[1] - r.d / 2], ton });
          F.push({ t: "texte", p: [xl, yl], txt: `Ø ${mmTxt(r.d)}`, pos: "sous", decal: -0.1, ton });
        });
      }
    }
    F.push({ t: "cote", a: [-B2, hautMur], b: [B2, hautMur], cote: "haut", d: 1, txt: `${mmTxt(v.B)} entre tableaux` });
    F.push({ t: "cote", a: [x0, haut], b: [-x0, haut], cote: "haut", d: 1, txt: `${mmTxt(g.Lc)}` });
    F.push({ t: "cote", a: [-B2 - 250, 0], b: [-B2 - 250, v.A], cote: "gauche", d: 1, txt: `${mmTxt(v.A)}` });
    F.push({ t: "cote", a: [-B2 - 250, v.A], b: [-B2 - 250, y0], cote: "gauche", d: 1, txt: `${mmTxt(v.jour)}` });
    if (g.sb) F.push({ t: "cote", a: [-B2 - 250, y0], b: [-B2 - 250, y0 + g.sb + s], cote: "gauche", d: 1, txt: `${mmTxt(g.sb + s)}` });
    F.push({ t: "cote", a: [B2 + 250, y0], b: [B2 + 250, y0 + g.Hc], cote: "droite", d: 1, txt: `${mmTxt(g.Hc)}` });
    if (v.mc > 0) F.push({ t: "cote", a: [B2 + 250, y0 + g.Hc - (v.chev || 0)], b: [B2 + 250, haut], cote: "droite", d: 1, txt: renfort ? `${mmTxt(v.eRf)} + ${mmTxt(v.mc)}` : `${mmTxt(v.mc)}` });
    F.push({ t: "cote", a: [B2 + 250, 0], b: [B2 + 250, haut], cote: "droite", d: 2, txt: `${mmTxt(haut)} du sol` });
    const px0 = x0 + s;
    for (let i = 0; i < n; i++) { const pxi = x0 + s + i * (g.w + s); F.push({ t: "cote", a: [pxi, haut], b: [pxi + g.w, haut], cote: "haut", d: 2, txt: `${mmTxt(g.w)}` }); }
    if (v.rosace !== false) F.push({ t: "texte", p: [x0 + s + g.w / 2, y0 + s + (g.sb || 0) + g.h / 2 - rosaceR(v)], txt: `rosace Ø ${mmTxt(2 * rosaceR(v))}`, pos: "sous" });

    const ep = 200;
    C.push({ t: "sol", x1: -ep - 300, x2: 300 });
    C.push({ t: "poly", cls: "t-mur", pts: rect(-ep, 0, 0, v.A) });
    C.push({ t: "poly", piece: "Montants de rive", cls: "t-acier-plein", pts: rect(-ep / 2 - s / 2, y0, -ep / 2 + s / 2, y0 + g.Hc) });
    if (v.mc > 0) C.push({ t: "poly", piece: "Main courante", cls: acier || profilMC ? "t-acier-plein" : "t-bois", pts: acier ? rect(-ep / 2 - v.lMc / 2, y0 + g.Hc, -ep / 2 + v.lMc / 2, haut) : sectionMainCourante(v).map(([x, y]) => [x - ep / 2, y + y0 + g.Hc + (v.eRf || 0) - (v.chev || 0)]) });
    if (renfort) {
      C.push({ t: "poly", piece: "Plat de renfort", cls: "t-acier-plein", pts: rect(-ep / 2 - v.lRf / 2, y0 + g.Hc, -ep / 2 + v.lRf / 2, y0 + g.Hc + v.eRf) });
      for (const xv of [-1, 1].map((k) => -ep / 2 + k * (s / 2 + v.lRf / 2) / 2)) C.push({ t: "poly", ouvert: true, cls: "t-cache", pts: [[xv, y0 + g.Hc], [xv, y0 + g.Hc + v.eRf + 30]] });
    }
    C.push({ t: "cote", a: [0, 0], b: [0, v.A], cote: "droite", d: 2, txt: `${mmTxt(v.A)}` });
    C.push({ t: "cote", a: [0, v.A], b: [0, y0], cote: "droite", d: 2, txt: `${mmTxt(v.jour)}` });
    C.push({ t: "cote", a: [0, y0], b: [0, haut], cote: "droite", d: 2, txt: `${mmTxt(g.Hr)}` });
    if (v.mc > 0) { const lm = acier || profilMC || renfort ? v.lMc : v.mc; C.push({ t: "cote", a: [-ep / 2 - lm / 2, haut], b: [-ep / 2 + lm / 2, haut], cote: "haut", d: 1, txt: `${mmTxt(lm)}` }); }

    D.push({ t: "poly", cls: "t-mur", pts: rect(-B2 - 250, -ep / 2, -B2, ep / 2) }, { t: "poly", cls: "t-mur", pts: rect(B2, -ep / 2, B2 + 250, ep / 2) });
    const lmD = v.mc > 0 ? (acier || profilMC || renfort ? v.lMc : v.mc) : s;
    if (renfort) D.push({ t: "poly", piece: "Plat de renfort", cls: "t-cache", pts: rect(x0, -v.lRf / 2, -x0, v.lRf / 2) });
    if (v.mc > 0) D.push({ t: "poly", piece: "Main courante", cls: acier || profilMC ? "t-acier-plein" : "t-bois", pts: rect(x0, -lmD / 2, -x0, lmD / 2) });
    else D.push({ t: "poly", piece: "Traverses du cadre", cls: "t-acier-plein", pts: rect(x0, -s / 2, -x0, s / 2) });
    D.push({ t: "poly", piece: "Traverses du cadre", cls: "t-cache", pts: rect(x0, -s / 2, -x0, s / 2) });
    D.push({ t: "cote", a: [-B2, ep / 2], b: [B2, ep / 2], cote: "haut", d: 1, txt: `${mmTxt(v.B)}` });
    D.push({ t: "cote", a: [x0, -lmD / 2], b: [-x0, -lmD / 2], cote: "bas", d: 1, txt: `${mmTxt(g.Lc)} (${v.j ? "jeu " + mmTxt(v.j) + " mm au total" : "même taille que la fenêtre"})` });

    const alpha = Math.atan2(g.h, g.w), diag = Math.hypot(g.w, g.h);
    const theta = Math.min(2 * alpha, Math.PI - 2 * alpha);
    const demi = diag / 2 - (s / 2) / Math.sin(2 * alpha);
    const mat = `Carré plein ${s} × ${s}`;
    const morceaux = [];
    if (v.ass === "onglet") {
      R.debit.push({ nom: "Traverses du cadre (haut et bas)", qte: 2, mat, long: g.Lc, coupes: "Onglets à 45° aux 2 bouts", note: "Mesuré à l'extérieur", dessin: profil([[0, 0], [g.Lc, 0], [g.Lc - s, s], [s, s]]) });
      R.debit.push({ nom: "Montants de rive du cadre", qte: 2, mat, long: g.Hc, coupes: `Onglets à 45° aux 2 bouts · ${v.nF} perçages Ø ${fmt(v.dF, 1)} fraisés Ø ${fmt(v.fF, 1)}`, note: "Mesuré à l'extérieur", dessin: dessinMontantRive([[0, 0], [g.Hc, 0], [g.Hc - s, s], [s, s]], g.Hc, v) });
      morceaux.push({ qte: 2, long: g.Lc }, { qte: 2, long: g.Hc });
    } else {
      R.debit.push({ nom: "Traverses du cadre (haut et bas)", qte: 2, mat, long: g.Lc, coupes: "Coupes droites", note: "Filantes", dessin: profil(rectPts(g.Lc, s)) });
      R.debit.push({ nom: "Montants de rive du cadre", qte: 2, mat, long: g.Hc - 2 * s, coupes: `Coupes droites · ${v.nF} perçages Ø ${fmt(v.dF, 1)} fraisés Ø ${fmt(v.fF, 1)}`, note: v.traverse ? "Entre les traverses du cadre" : "Entre les traverses", dessin: dessinMontantRive(rectPts(g.Hc - 2 * s, s), g.Hc - 2 * s, v) });
      morceaux.push({ qte: 2, long: g.Lc }, { qte: 2, long: g.Hc - 2 * s });
    }
    if (g.sb) {
      R.debit.push({ nom: "Lisse intermédiaire (haut du soubassement)", qte: 1, mat, long: g.Lc - 2 * s, coupes: "Coupes droites", note: `Entre les montants de rive, dessus à ${mmTxt(v.A + v.jour + g.sb + s)} mm du sol`, dessin: profil(rectPts(g.Lc - 2 * s, s)) });
      R.debit.push({ nom: "Barreaux du soubassement", qte: g.nbS, mat, long: g.hb, coupes: `Coupes droites · vides égaux de ${fmt(g.videS, 1)} mm`, note: "Entre la traverse basse et la lisse intermédiaire", dessin: profil(rectPts(g.hb, s)) });
      morceaux.push({ qte: 1, long: g.Lc - 2 * s }, { qte: g.nbS, long: g.hb });
    }
    if (n > 1) { R.debit.push({ nom: "Montants entre les croix", qte: n - 1, mat, long: g.h, coupes: "Coupes droites", note: g.sb ? "Entre la lisse intermédiaire et la traverse haute" : v.traverse ? "Entre les traverses du cadre" : "Entre les traverses", dessin: profil(rectPts(g.h, s)) }); morceaux.push({ qte: n - 1, long: g.h }); }
    const rP = [0, 0, g.w, g.h];
    const diagEntiere = barre([0, 0], [g.w, g.h], s, rP);
    const nx = -Math.sin(alpha), ny = Math.cos(alpha);
    const demiBrute = barre([0, g.h], [g.w, 0], s, rP);
    const demiPoly = couper(demiBrute, -nx, -ny, -(nx * g.w / 2 + ny * g.h / 2) - s / 2);
    if (!seuls) R.debit.push({ nom: "Diagonale entière (1 par croix)", qte: n, mat, long: diag, dessin: profil(diagEntiere), coupes: `Bouts en pointe : ${fmt(alpha * DEG, 1)}° et ${fmt(90 - alpha * DEG, 1)}°`, note: "Mesuré à l'axe, d'un coin à l'autre" });
    if (!seuls) R.debit.push({ nom: "Demi-diagonale (2 par croix)", qte: 2 * n, mat, long: demi, dessin: profil(demiPoly), coupes: `Côté coin en pointe (${fmt(alpha * DEG, 1)}° / ${fmt(90 - alpha * DEG, 1)}°) · côté centre contre la diagonale à ${fmt(2 * alpha * DEG, 1)}°`, note: "Mesuré à l'axe" });
    if (!seuls) morceaux.push({ qte: n, long: diag }, { qte: 2 * n, long: demi });
    if (v.traverse) {
      const dt = demiTraverse(g.w, g.h, s);
      R.debit.push({ nom: "Demi-traverses du milieu (2 par croix)", qte: 2 * n, mat, long: dt.long, dessin: profil(dt.pts, { pointe: true }), coupes: `Côté montant : coupe droite · côté centre : en pointe, 2 coupes à ${fmt(alpha * DEG, 1)}° (scie à ${fmt(90 - alpha * DEG, 1)}°)`, note: "Mesuré à l'axe, du montant à la pointe" });
      morceaux.push({ qte: 2 * n, long: dt.long });
    }
    if (seuls) { R.debit.push({ nom: "Barreaux", qte: g.nbB, mat, long: g.h, coupes: `Coupes droites · vides égaux de ${fmt(g.vide, 1)} mm`, note: "Entre la traverse haute et la traverse basse", dessin: profil(rectPts(g.h, s)) }); morceaux.push({ qte: g.nbB, long: g.h }); }
    if (v.nb > 0) { R.debit.push({ nom: "Barreaux", qte: v.nb * n, mat, long: g.h, coupes: `Coupes droites · vides égaux de ${mmTxt(g.vide)} mm`, note: g.sb ? "Entre la lisse intermédiaire et la traverse haute" : v.traverse ? "Entre les traverses du cadre" : "Entre les traverses", dessin: profil(rectPts(g.h, s)) }); morceaux.push({ qte: v.nb * n, long: g.h }); }
    if (profilMC) R.debit.push({ nom: "Main courante", qte: 1, mat: `Main courante acier profilée ${MC_PROFIL.l} × ${MC_PROFIL.h}, rainure ${MC_PROFIL.r}`, long: g.Lc, coupes: "Coupes droites, emboîtée sur la traverse haute, soudée par points dessous", note: "Achetée en barre", dessin: dessinMainCourante(g.Lc, v) });
    else if (v.mc > 0 && acier) R.debit.push({ nom: "Main courante", qte: 1, mat: `Plat acier ${mmTxt(v.lMc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: "Coupes droites, soudée à plat sur la traverse haute", note: "Arêtes cassées", dessin: profil(rectPts(g.Lc, v.mc)) });
    else if (v.mc > 0 && renfort) {
      R.debit.push({ nom: "Plat de renfort de la lisse haute", qte: 1, mat: `Plat acier ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)}`, long: g.Lc, coupes: `Coupes droites · ${nVisMc} trous Ø ${fmt(RENFORT.visD + 0.5, 1)} fraisés dessous, en quinconce à ${fmt((s / 2 + v.lRf / 2) / 2, 0)} mm de l'axe, tous les ${RENFORT.pasVis} mm environ (à percer avant de souder) · soudé à plat, centré sur la traverse haute, cordon continu des deux côtés`, note: "Il tient la poussée sur la main courante : ne pas le supprimer ni le raccourcir", dessin: profil(rectPts(g.Lc, v.eRf)) });
      R.debit.push({ nom: "Main courante", qte: 1, mat: `${{ chene: "Chêne", hetre: "Hêtre", pin: "Pin", noyer: "Noyer" }[v.essence || "chene"]} massif ${mmTxt(v.lMc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: "Dessous plan, sans rainure · arrondie, poncée, huilée", note: "Posée sur le plat de renfort · vissée par dessous à travers le plat", dessin: dessinMainCourante(g.Lc, v) });
      R.debit.push({ nom: `Vis du bois Ø ${RENFORT.visD} × ${RENFORT.visL} inox à tête fraisée`, qte: nVisMc, mat: "À acheter", long: 0, coupes: "Par dessous, à travers le plat de renfort", note: "Avant-trou Ø 3 dans le bois" });
    }
    else if (v.mc > 0) R.debit.push({ nom: "Main courante", qte: 1, mat: `${{ chene: "Chêne", hetre: "Hêtre", pin: "Pin", noyer: "Noyer" }[v.essence || "chene"]} massif ${mmTxt(v.mc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: rain ? `Rainure dessous ${(Number.isInteger(v.lR) ? mmTxt(v.lR) : fmt(v.lR, 1))} × ${mmTxt(v.chev)} de profondeur, sur toute la longueur · arrondie, poncée, huilée` : "Arrondie, poncée, huilée", note: rain ? "Emboîtée sur la lisse haute · collage PU ou vis par-dessous à travers la lisse" : "Fixation sur le cadre : à définir", dessin: dessinMainCourante(g.Lc, v) });
    if (v.rosace !== false) R.debit.push({ nom: `Rosaces Ø ${mmTxt(2 * rosaceR(v))}`, qte: n, mat: "Achetées", long: 0, coupes: "1 au centre de chaque croix", note: "" });
    R.debit.push({ nom: `Vis ou goujons Ø ${fmt(v.dF - 0.5, 0)} à tête fraisée + chevilles`, qte: 2 * v.nF, mat: "À acheter (longueur selon le mur)", long: 0, coupes: `${v.nF} par montant de rive`, note: "Mur plein : cheville nylon · mur creux ou ancien : scellement chimique" });

    const b = barres(morceaux, v.trait, 0);
    const metres = morceaux.reduce((x, m) => x + m.qte * m.long, 0) / 1000;
    const kg = metres * s * s * 7.85e-3 + (profilMC ? MC_PROFIL.kg * g.Lc / 1000 : acier ? v.lMc * v.mc * g.Lc / 1e9 * 7850 : (renfort ? v.lMc : v.mc) * v.mc * g.Lc / 1e9 * 700)
      + (renfort ? v.lRf * v.eRf * g.Lc / 1e9 * 7850 : 0);
    R.kg = kg; R.metres = metres; R.hauteurGC = g.Hr;
    R.mc = { l: acier || profilMC || renfort ? v.lMc : v.mc, h: v.mc, chev: v.chev || 0, renfort: renfort ? { l: v.lRf, e: v.eRf, vis: nVisMc } : null };
    if (renfort && !v._rapide && !R.alertes.length && !calculerGC({ ...vEntree, renfort: "sans", _rapide: true }).alertes.length) R.notes.unshift("Renfort : pas nécessaire ici. Sans le plat, la lisse haute tient et le garde-corps reste aux normes (main courante de 40).");
    if (v.nb > 0 && !v._rapide && !R.alertes.length) {
      const sans = calculerGC({ ...vEntree, nb: 0, _rapide: true });
      if (!sans.alertes.length) R.notes.unshift(`Barreaux dans les croix : pas nécessaires ici. Sans eux, le garde-corps reste aux normes. Mets « Barreaux par panneau » à 0 dans Paramètres d'atelier.`);
      else R.notes.unshift(`Barreaux dans les croix : nécessaires. Sans eux, ${sans.alertes[0].split(":")[0].toLowerCase()} ne passe plus la norme.`);
    }
    R.resume = [
      ["Carré plein " + s, `${fmt(metres, 2)} m`],
      ["Barres de 6 m", `${b.n}`],
      ["Chute", `${fmt(b.chute / 1000, 2)} m`],
      ["Peinture", `${fmt(metres * 4 * s / 1000, 2)} m²`],
      ...(renfort ? [[`Plat de renfort ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)}`, `${fmt(g.Lc / 1000, 2)} m`]] : []),
      ["Poids", `≈ ${fmt(kg, 1)} kg`],
      seuls ? ["Barreaux", `${g.nbB}`] : ["Croix", `${n}${v.nP >= 1 ? "" : " (auto)"}`],
    ];
    R.notes.push(`Hauteur retenue : ${mmTxt(g.Hr)} mm, main courante comprise (${v.Hs >= MINI_GC ? "voulue par le client" : `calculée pour que la main courante arrive à ${mmTxt(g.cible)} mm du sol${v.etage ? "" : " ; au rez-de-chaussée ce n'est pas obligatoire, tu peux taper une hauteur plus basse"}`}).`);
    if (renfort) R.notes.push(`Main courante ${mmTxt(v.lMc)} × ${mmTxt(v.mc)} sur plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)} : le cadre est plus bas de ${mmTxt(v.mc + v.eRf - (vEntree.mc - (mainCouranteGC({ ...vEntree, renfort: "sans" }).chev || 0)))} mm qu'avec la main courante de ${mmTxt(vEntree.mc)}, le dessus reste à la même hauteur.`);
    R.notes.push(seuls ? `Barreaux verticaux seuls : ${g.nbB} barreaux soudés entre la traverse haute et la traverse basse, vides égaux de ${fmt(g.vide, 1)} mm. Pas de croix ni de rosace.` : v.traverse ? "Chaque croix : une diagonale entière et deux demi-diagonales soudées contre elle. Au milieu, deux demi-traverses vont du montant jusqu'au centre : leur bout en pointe rentre entre les diagonales." : "Chaque croix : une diagonale entière et deux demi-diagonales soudées contre elle.");
    return R;
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
      const court = !p.ton && Math.abs(bx - ax) < fs * 0.62 * String(p.txt).length + fs;
      const tx = court ? Math.max(ax, bx) + fs * (0.9 + 0.33 * String(p.txt).length) : (ax + bx) / 2;
      return { l: [[ax, ay, ax, y], [bx, by, bx, y], [ax, y, bx, y]], ticks: [[ax, y], [bx, y]], txt: [tx, y + (p.cote === "haut" ? fs * 0.45 : -fs * 1.15)], rot: 0 };
    }
    const x = p.cote === "droite" ? Math.max(ax, bx) + pas : Math.min(ax, bx) - pas;
    const court = Math.abs(by - ay) < fs * 0.62 * String(p.txt).length + fs;
    const ty = court ? Math.max(ay, by) + fs * (0.9 + 0.33 * String(p.txt).length) : (ay + by) / 2;
    return { l: [[ax, ay, x, ay], [bx, by, x, by], [x, ay, x, by]].concat(court ? [[x, Math.max(ay, by), x, ty - fs * 0.33 * String(p.txt).length - fs * 0.3]] : []), ticks: [[x, ay], [x, by]], txt: [x + (p.cote === "droite" ? fs * 0.45 : -fs * 0.45), ty], rot: -90, cote: p.cote };
  }
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
        const tr = g.rot ? ` transform="rotate(90 ${tx.toFixed(1)} ${Y(ty).toFixed(1)})"` : "";
        const dy = g.rot ? (g.cote === "droite" ? -fs * 0.25 : fs * 0.45) : 0;
        out += `<text class="t-texte${ton}" font-size="${fs.toFixed(1)}" x="${tx.toFixed(1)}" y="${(Y(ty) + dy).toFixed(1)}" text-anchor="${anchor}"${tr}>${esc(p.txt)}</text>`;
      }
    }
    return { vb, fs, html: out };
  }
function variantesConformes(v) {
    const base = calculerGC(v);
    if (!base.alertes.length) return [];
    const carres = [...new Set([v.s, 16, 18, 20].filter((x) => x >= v.s))];
    const croix = v.seuls ? [1] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], barreaux = v.seuls ? [0] : [0, 1, 2, 3, 4];
    const rf0 = v.renfort === "plat" ? "plat" : "sans";
    const tropSouple = v.mcType === "bois" && calculerGC({ ...v, s: 20, renfort: "sans", _rapide: true }).alertes.some((a) => a.startsWith("Solidité"));
    const renforts = tropSouple ? [...new Set([rf0, "plat"])] : [rf0];
    const vues = new Set(), out = [];
    for (const renfort of renforts) for (const sbMode of [...new Set([v.sbMode || "auto", "toujours"])]) for (const s of carres) for (const nP of croix) for (const nb of barreaux) for (const Hs of v.Hs >= MINI_GC ? [v.Hs, 0] : [0]) for (const traverse of [false, true]) {
      if (v.seuls && (traverse || sbMode !== "auto")) continue;
      if (traverse && nb > 0) continue;
      if (renfort !== rf0 && nb > 0) continue;
      const w = { ...v, s, nP, nb, Hs, sbMode, traverse, renfort, _rapide: true };
      const cle = [sbMode, s, nP, nb, Hs, traverse, renfort].join("|");
      if (vues.has(cle)) continue;
      vues.add(cle);
      let R;
      try { R = calculerGC(w); } catch (e) { continue; }
      if (R.alertes.length) continue;
      const change = (s !== v.s) + (Math.max(1, Math.round(v.nP || 1)) !== nP) + ((v.nb || 0) !== nb) + (Hs !== v.Hs) + (sbMode !== (v.sbMode || "auto")) + (traverse !== !!v.traverse) + (renfort !== rf0);
      out.push({ w, R, change, score: change * 4 + (R.kg || 0) + nb * 8 });
    }
    out.sort((a, b) => a.score - b.score);
    const rf = (x) => (x.w.renfort === "plat" ? 1 : 0);
    const domine = (a, b) => b.w.sbMode === a.w.sbMode && b.w.nP <= a.w.nP && b.w.nb <= a.w.nb && b.w.s <= a.w.s && b.w.Hs === a.w.Hs && b.w.traverse <= a.w.traverse && rf(b) <= rf(a) && (!a.w.traverse || b.change <= a.change) && (b.w.nP < a.w.nP || b.w.nb < a.w.nb || b.w.s < a.w.s || b.w.traverse < a.w.traverse || rf(b) < rf(a));
    const utiles = out.filter((a) => !out.some((b) => domine(a, b)));
    const vuesD = new Set(), uniques = [];
    for (const c of utiles) { const k = c.R.debit.map((d) => `${d.nom}:${d.qte}:${Math.round(d.long || 0)}`).join("|"); if (!vuesD.has(k)) { vuesD.add(k); uniques.push(c); } }
    return uniques.slice(0, 3);
  }
function decrireVariante(v, c) {
    const d = [];
    const n0 = Math.max(1, Math.round(v.nP || 1));
    if (c.w.nP !== n0) d.push(`${c.w.nP} croix au lieu de ${n0}`);
    if ((v.nb || 0) !== c.w.nb) d.push(c.w.nb ? `${c.w.nb} barreau${c.w.nb > 1 ? "x" : ""} verticaux à travers chaque croix` : "sans barreaux dans les croix");
    if (c.w.s !== v.s) d.push(`carré de ${c.w.s} au lieu de ${v.s}`);
    if (c.w.Hs !== v.Hs) d.push("hauteur calculée pour la norme");
    if (c.w.traverse !== !!v.traverse) d.push(c.w.traverse ? `une traverse au milieu ${c.w.nP > 1 ? "de chaque croix" : "de la croix"}` : "sans traverse au milieu");
    if (c.w.sbMode !== (v.sbMode || "auto")) d.push(c.w.sbMode === "toujours" ? "barreaux en bas, croix au-dessus" : "croix seules");
    if ((c.w.renfort === "plat") !== (v.renfort === "plat")) d.push(c.w.renfort === "plat" ? `lisse haute renforcée : plat ${RENFORT.l} × ${RENFORT.e} sous une main courante bois de ${RENFORT.bois.l}` : "sans plat de renfort");
    return d;
  }
function fichesPlanches(R) { return R.debit.filter((d) => d.dessin).map((d, k) => ({ d, rep: k + 1 })); }
const A3_COUL = [
    { cle: "Carré plein", trait: "#d98a2b", fond: "#fdf3e6" },
    { cle: "Plat acier", trait: "#2f6db3", fond: "#eaf1fa" },
    { cle: "Main courante acier", trait: "#2f6db3", fond: "#eaf1fa" },
    { cle: "Tube", trait: "#2f6db3", fond: "#eaf1fa" },
    { cle: "Tôle", trait: "#7a5aa6", fond: "#f2edf8" },
    { cle: "Bois", trait: "#9a6a3a", fond: "#f6ede2" },
    { cle: "Chêne", trait: "#9a6a3a", fond: "#f6ede2" },
    { cle: "Hêtre", trait: "#9a6a3a", fond: "#f6ede2" },
    { cle: "Pin", trait: "#9a6a3a", fond: "#f6ede2" },
    { cle: "Noyer", trait: "#9a6a3a", fond: "#f6ede2" },
  ];
const ECHELLES = [2, 2.5, 5, 7.5, 10, 15, 20, 25, 30, 50];
function a3Matiere(mat) { return String(mat).replace(/\s*\(.*$/, "").trim(); }
function a3Couleur(mat) { return A3_COUL.find((c) => String(mat).startsWith(c.cle)) || { trait: "#2b2320", fond: "#eeeae4" }; }
function planA3Pur(R, v, infos, modele) {
    const apercu = !!infos.apercu;
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const f1 = (x) => (Math.round(x * 100) / 100).toString();
    const nom0 = (p) => [].concat(p.piece)[0];
    const pieces = (prims) => prims.filter((p) => p.piece && (p.t === "poly" || p.t === "cercle"));
    const matDe = (piece) => { const cles = [].concat(piece); const d = R.debit.find((x) => cles.some((k) => x.nom.startsWith(k))); return d ? d.mat : ""; };
    const face = pieces(R.vues.face), vCote = pieces(R.vues.cote), dessus = pieces(R.vues.dessus);
    const cachesFace = apercu ? [] : R.vues.face.filter((p) => p.t === "poly" && p.cls === "t-cache" && p.ouvert);
    const bf = bornes(face), bc = bornes(vCote), bd = bornes(dessus);
    let out = "";
    const T = (x, y, txt, { t = 2.5, a = "middle", g = 400, c = "#1f2a36", rot = 0, f = "Arial, Helvetica, sans-serif" } = {}) =>
      `<text x="${f1(x)}" y="${f1(y)}" font-size="${t}" font-weight="${g}" fill="${c}" font-family="${f}" text-anchor="${a}"${rot ? ` transform="rotate(${rot} ${f1(x)} ${f1(y)})"` : ""}>${esc(txt)}</text>`;
    const L = (x1, y1, x2, y2, c = "#5b6b7c", w = 0.18, dash = "") => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
    const RECT = (x, y, w, h, sw = 0.25, fill = "none") => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}" stroke="#1f2a36" stroke-width="${sw}"/>`;

    const ZX1 = 14, ZX2 = 406, ZY1 = 14, ZY2 = 196;
    const gapX = 34;
    const nInter = apercu ? 0 : Math.max(0, face.filter((p) => p.t === "poly" && /^Montants/.test(nom0(p))).length - 2);
    const autour = 14 + 5 * nInter + 33 + 20 + 4;
    const k = ECHELLES.find((e) => (bf.w + bc.w) / e + gapX + (apercu ? 14 : 26 + 84) <= ZX2 - ZX1 && (bf.h + bd.h) / e + autour <= ZY2 - ZY1) || 50;
    const largeur = bf.w / k + gapX + bc.w / k + (apercu ? 14 : 26 + 78);
    const oxF = ZX1 + (ZX2 - ZX1 - largeur) / 2 + 4;
    const hautBloc = 14 + 5 * nInter + bf.h / k + 33 + bd.h / k + 20;
    const oyF = ZY1 + (ZY2 - ZY1 - hautBloc) / 2 + 14 + 5 * nInter + bf.h / k;
    const ech = `échelle 1:${k} @ A3`;

    function vue(prims, b, ox, oy, extra = []) {
      const P = (x, y) => [ox + (x - b.x1) / k, oy - (y - b.y1) / k];
      prims.forEach((p) => {
        const c = a3Couleur(matDe(p.piece));
        if (p.t === "poly") out += `<polygon points="${p.pts.map(([x, y]) => P(x, y).map(f1).join(",")).join(" ")}" fill="${c.fond}" stroke="${c.trait}" stroke-width="0.3" stroke-linejoin="round"/>`;
        else { const [cx, cy] = P(p.c[0], p.c[1]); out += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(p.r / k)}" fill="${c.fond}" stroke="${c.trait}" stroke-width="0.3"/>`; }
      });
      extra.forEach((p) => out += `<polyline points="${p.pts.map(([x, y]) => P(x, y).map(f1).join(",")).join(" ")}" fill="none" stroke="#1f2a36" stroke-width="0.18" stroke-dasharray="0.8 0.6"/>`);
      return P;
    }
    function coter(P, a, b, sens, dec, txt) {
      const [ax, ay] = P(...a), [bx, by] = P(...b), tk = 1;
      if (sens === "haut" || sens === "bas") {
        const s = sens === "haut" ? -1 : 1, y = sens === "haut" ? Math.min(ay, by) - dec : Math.max(ay, by) + dec;
        out += L(ax, ay + s * 1, ax, y + s * 1.2) + L(bx, by + s * 1, bx, y + s * 1.2) + L(ax, y, bx, y, "#1f2a36", 0.2);
        out += L(ax - tk, y + tk, ax + tk, y - tk, "#1f2a36", 0.3) + L(bx - tk, y + tk, bx + tk, y - tk, "#1f2a36", 0.3);
        out += T((ax + bx) / 2, y - 0.8, txt, { g: 700, t: 2.4 });
      } else {
        const s = sens === "droite" ? 1 : -1, x = sens === "droite" ? Math.max(ax, bx) + dec : Math.min(ax, bx) - dec;
        out += L(ax + s * 1, ay, x + s * 1.2, ay) + L(bx + s * 1, by, x + s * 1.2, by) + L(x, ay, x, by, "#1f2a36", 0.2);
        out += L(x - tk, ay + tk, x + tk, ay - tk, "#1f2a36", 0.3) + L(x - tk, by + tk, x + tk, by - tk, "#1f2a36", 0.3);
        out += T(x - 2.6, (ay + by) / 2, txt, { g: 700, t: 2.4, rot: 90 });
      }
    }
    function titre(x, y, noir, rouge, sous) {
      out += `<text x="${f1(x)}" y="${f1(y)}" font-size="3.6" font-weight="700" font-family="Arial, Helvetica, sans-serif" fill="#111">${esc(noir)}${rouge ? `<tspan fill="#c0392b">${esc(rouge)}</tspan>` : ""}</text>`;
      out += T(x, y + 3.8, sous, { t: 2.2, a: "start", c: "#444" });
    }

    out += `<rect x="0" y="0" width="420" height="297" fill="#fff"/>`;
    out += RECT(10, 10, 400, 277, 0.5);

    const PF = vue(face, bf, oxF, oyF, cachesFace);
    const montants = face.filter((p) => p.t === "poly" && /^Montants/.test(nom0(p))).map((p) => { const xs = p.pts.map((q) => q[0]); return (Math.min(...xs) + Math.max(...xs)) / 2; }).sort((a, b) => a - b);
    const yH = bf.y2, yB = bf.y1;
    const inter = montants.slice(1, -1);
    if (!apercu) inter.forEach((x, i) => coter(PF, [bf.x1, yH], [x, yH], "haut", 6 + 5 * i, `${mmTxt(x - bf.x1)} c/c`));
    coter(PF, [bf.x1, yH], [bf.x2, yH], "haut", 6 + (apercu ? 0 : 5 * inter.length), `${mmTxt(bf.w)} hors tout`);
    for (let i = 0; i + 1 < montants.length; i++) coter(PF, [montants[i], yB], [montants[i + 1], yB], "bas", 6, `${mmTxt(montants[i + 1] - montants[i])} c/c`);
    const mc = face.find((p) => nom0(p) === "Main courante");
    if (mc) {
      const ym = Math.min(...mc.pts.map((q) => q[1]));
      const rfP = face.find((p) => nom0(p) === "Plat de renfort");
      const yc = rfP ? Math.min(...rfP.pts.map((q) => q[1])) : ym;
      coter(PF, [bf.x2, yB], [bf.x2, yc], "droite", 6, `${mmTxt(yc - yB)}`);
      coter(PF, [bf.x2, yc], [bf.x2, yH], "droite", 6, rfP ? `${mmTxt(ym - yc)} + ${mmTxt(yH - ym)}` : `${mmTxt(yH - ym)}`);
      coter(PF, [bf.x2, yB], [bf.x2, yH], "droite", 12, `${mmTxt(bf.h)}`);
    } else coter(PF, [bf.x2, yB], [bf.x2, yH], "droite", 6, `${mmTxt(bf.h)}`);
    titre(oxF, oyF + 17, "VUE DE FACE", " - CADRE SEUL", `vue depuis l'intérieur · ${ech}`);

    const oyD = oyF + 33 + bd.h / k;
    const PD = vue(dessus, bd, oxF + (bd.x1 - bf.x1) / k, oyD);
    coter(PD, [bd.x1, bd.y1], [bd.x2, bd.y1], "bas", 5, `${mmTxt(bd.w)}`);
    coter(PD, [bd.x2, bd.y1], [bd.x2, bd.y2], "droite", 5, `${mmTxt(bd.h)}`);
    titre(oxF, oyD + 15, "VUE DE DESSUS", " - CADRE SEUL", ech);

    const oxC = oxF + bf.w / k + gapX;
    const PC = vue(vCote, bc, oxC, oyF);
    coter(PC, [bc.x2, bc.y1], [bc.x2, bc.y2], "droite", 5, `${mmTxt(bc.h)}`);
    coter(PC, [bc.x1, bc.y2], [bc.x2, bc.y2], "haut", 4, `${mmTxt(bc.w)}`);
    titre(oxC - 4, oyF + 17, "VUE DE CÔTÉ", " - CADRE SEUL", ech);

    const mR = R.debit.find((d) => d.nom.startsWith("Montants de rive"));
    if (mR && v.nF && !apercu) {
      const Lm = mR.long, s = v.s, kd = [1, 2, 2.5, 5, 10, 15, 20, 25, 30].find((e) => Lm / e <= Math.max(bf.h / k, 40)) || 30;
      const posF = percages(Lm, v.nF, v.eF);
      const x0 = oxC + bc.w / k + 26, y0 = oyF - Math.max(bf.h / k, Lm / kd);
      out += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(s / kd)}" height="${f1(Lm / kd)}" fill="#fdf3e6" stroke="#d98a2b" stroke-width="0.3"/>`;
      posF.forEach((z) => {
        const cy = y0 + Lm / kd - z / kd, cx = x0 + s / kd / 2;
        out += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(v.fF / 2 / kd)}" fill="none" stroke="#1f2a36" stroke-width="0.2" stroke-dasharray="0.8 0.5"/>`;
        out += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(v.dF / 2 / kd)}" fill="#fff" stroke="#1f2a36" stroke-width="0.3"/>`;
        out += L(cx - v.fF / kd * 0.8, cy, cx + v.fF / kd * 0.8, cy, "#1f2a36", 0.15, "2 0.6 0.4 0.6");
      });
      const PB = (x, z) => [x0 + x / kd, y0 + Lm / kd - z / kd];
      { const yc = PB(0, posF[posF.length - 1])[1]; out += L(x0 - 5, yc, x0 + s / kd + 3, yc, "#1f2a36", 0.3, "4 1 0.7 1") + T(x0 - 6.5, yc + 1, "C", { t: 2.8, g: 700 }); }
      const ch = [0, ...posF, Lm];
      for (let i = 0; i + 1 < ch.length; i++) coter(PB, [s, ch[i]], [s, ch[i + 1]], "droite", 4, mmTxt(ch[i + 1] - ch[i]));
      coter(PB, [0, Lm], [s, Lm], "haut", 3, `${s}`);
      titre(x0 + s / kd + 16, y0 + 4, "DÉTAIL B", " - FIXATION", `face intérieure d'un montant de rive · échelle 1:${kd}`);
      out += T(x0 + s / kd + 16, y0 + 12, `${posF.length} perçages Ø ${fmt(v.dF, 1)} traversants par montant`, { t: 2.3, a: "start" });
      out += T(x0 + s / kd + 16, y0 + 15.5, `fraisés à 90°, Ø ${fmt(v.fF, 1)}, côté intérieur`, { t: 2.3, a: "start" });
      out += T(x0 + s / kd + 16, y0 + 19, `vis ou goujon à tête fraisée + cheville dans le tableau`, { t: 2.3, a: "start" });
      {
        const e2 = 2, xs = x0 + s / kd + 30, ys = y0 + 30, S2 = s * e2, d2 = v.dF * e2, f2 = v.fF * e2, pf = (f2 - d2) / 2;
        const ym = ys + S2 / 2;
        const trou = [[xs, ym - d2 / 2], [xs + S2 - pf, ym - d2 / 2], [xs + S2, ym - f2 / 2], [xs + S2, ym + f2 / 2], [xs + S2 - pf, ym + d2 / 2], [xs, ym + d2 / 2]];
        out += `<defs><pattern id="hachure" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#d98a2b" stroke-width="0.25"/></pattern></defs>`;
        out += `<rect x="${f1(xs)}" y="${f1(ys)}" width="${f1(S2)}" height="${f1(S2)}" fill="url(#hachure)" stroke="#d98a2b" stroke-width="0.35"/>`;
        out += `<polygon points="${trou.map((q) => q.map(f1).join(",")).join(" ")}" fill="#fff" stroke="#1f2a36" stroke-width="0.3"/>`;
        out += L(xs - 3, ym, xs + S2 + 3, ym, "#1f2a36", 0.15, "3 0.8 0.5 0.8");
        const P2 = (x, y) => [x, y];
        coter(P2, [xs, ys], [xs, ys + S2], "gauche", 4, `${s}`);
        coter(P2, [xs, ys], [xs + S2, ys], "haut", 4, `${s}`);
        coter(P2, [xs + S2, ym - f2 / 2], [xs + S2, ym + f2 / 2], "droite", 4, `Ø ${fmt(v.fF, 1)}`);
        coter(P2, [xs + 1.5, ym - d2 / 2], [xs + 1.5, ym + d2 / 2], "droite", S2 + 12, `Ø ${fmt(v.dF, 1)}`);
        out += T(xs + S2 - pf - 1, ym - f2 / 2 - 1.5, "90°", { t: 2.2, g: 700, a: "end" });
        out += T(xs, ys + S2 + 5, "côté mur", { t: 2, a: "start", c: "#555" }) + T(xs + S2, ys + S2 + 5, "côté intérieur", { t: 2, a: "end", c: "#555" });
        titre(xs - 4, ys + S2 + 12, "COUPE C-C", " - PERÇAGE", "échelle 2:1");
      }
    }

    const yb = 202, hb = 81;
    out += RECT(14, yb, 58, hb);
    out += T(43, yb + 5.5, "RÉVISIONS", { t: 2.6, g: 700 });
    out += L(14, yb + 8, 72, yb + 8, "#1f2a36", 0.2);
    out += T(16, yb + 12, "RÉV.", { t: 1.9, g: 700, a: "start", c: "#6f6357" }) + T(25, yb + 12, "DATE", { t: 1.9, g: 700, a: "start", c: "#6f6357" }) + T(42, yb + 12, "DESCRIPTION", { t: 1.9, g: 700, a: "start", c: "#6f6357" });
    out += L(14, yb + 14, 72, yb + 14, "#1f2a36", 0.15);
    out += T(16, yb + 18.5, "A", { t: 2.3, a: "start" }) + T(25, yb + 18.5, infos.date || "", { t: 2.1, a: "start" }) + T(42, yb + 18.5, "Première émission", { t: 2.1, a: "start" });
    for (let i = 1; i <= 5; i++) out += L(14, yb + 14 + i * 7, 72, yb + 14 + i * 7, "#c8c2b8", 0.12);
    out += L(23.5, yb + 8, 23.5, yb + 49, "#1f2a36", 0.12) + L(40.5, yb + 8, 40.5, yb + 49, "#1f2a36", 0.12);
    out += T(16, yb + 60, "NOTE", { t: 2, g: 700, a: "start", c: "#6f6357" });
    ["Cotes en mm.", "Ne pas mesurer sur le plan.", "Vérifier les cotes sur place", "avant de fabriquer."].forEach((l, i) => out += T(16, yb + 64 + i * 3.4, l, { t: 2, a: "start", c: "#444" }));

    const groupes = new Map(), achats = [];
    const repDe = new Map(fichesPlanches(R).map(({ d, rep }) => [d, rep]));
    R.debit.forEach((d) => {
      if (!d.long || !d.qte) { if (d.qte) achats.push(d); return; }
      const m = a3Matiere(d.mat);
      if (!groupes.has(m)) groupes.set(m, []);
      groupes.get(m).push(d);
    });
    const xL = 75, wL = 176;
    out += RECT(xL, yb, wL, hb);
    if (apercu) {
      const mcTxt = v.mcType === "profil" ? "acier profilé 40 × 10" : v.mcType === "acier" ? `plat d'acier ${mmTxt(v.mc)} × ${mmTxt(v.epMc)}` : `${DS_ESSENCES[v.essence] || DS_ESSENCES.chene}, ${v.renfort === "plat" ? `${RENFORT.bois.l} × ${RENFORT.bois.h} sur plat ${RENFORT.l} × ${RENFORT.e}` : `${mmTxt(v.mc)} × ${mmTxt(v.mc)}`}`;
      out += T(xL + 4, yb + 5.5, "VOTRE GARDE-CORPS", { t: 2.6, g: 700, a: "start", c: "#111" });
      out += L(xL, yb + 8, xL + wL, yb + 8, "#1f2a36", 0.2);
      [
        v.seuls ? "Garde-corps de fenêtre à barreaux droits" : `Garde-corps de fenêtre, ${v.nP} croix de Saint-André${v.traverse ? " avec traverse" : ""}`,
        `Largeur entre tableaux : ${mmTxt(v.B)} mm`,
        `Bas de fenêtre à ${mmTxt(v.A)} mm du sol`,
        `Hauteur du garde-corps : ${mmTxt(R.hauteurGC)} mm, main courante comprise`,
        `Acier carré plein ${v.s} × ${v.s} mm`,
        `Main courante : ${mcTxt}`,
        R.alertes.length ? "" : "Conforme à la norme NF P01-012",
      ].filter(Boolean).forEach((l, i) => out += T(xL + 4, yb + 15 + i * 6, l, { t: 2.6, a: "start" }));
    } else {
    out += T(xL + 4, yb + 5.5, "LISTE DE DÉBIT - " + (modele === "gardeCorps" ? (v.seuls ? "GARDE-CORPS À BARREAUX" : "GARDE-CORPS") : NOMS[modele].toUpperCase()), { t: 2.6, g: 700, a: "start", c: "#111" });
    out += L(xL, yb + 8, xL + wL, yb + 8, "#1f2a36", 0.2);
    let cx = xL + 4, cy0 = yb + 13;
    groupes.forEach((liste, m) => {
      const c = a3Couleur(m);
      out += T(cx, cy0, m, { t: 2.4, g: 700, a: "start", c: c.trait });
      liste.forEach((d, i) => {
        const angle = /°/.test(d.coupes) && !/^Coupes droites/.test(d.coupes.split("·")[0]);
        const perce = /perçage/.test(d.coupes);
        const court = d.nom.replace(/\s*\(.*$/, "").replace(/^Plat de renfort.*/, "Plat de renfort");
        out += T(cx, cy0 + 4.5 + i * 3.8, `${d.qte}x ${mmTxt(d.long)} mm${angle ? " *" : ""}${perce ? " (B)" : ""}`, { t: 2.3, a: "start" });
        out += T(cx + 27, cy0 + 4.5 + i * 3.8, `${repDe.has(d) ? `Rep. ${repDe.get(d)} · ` : ""}${court}`, { t: 2, a: "start", c: "#6f6357" });
      });
      cx += Math.min(88, (wL - 4) / groupes.size);
    });
    const notes = [];
    if (R.debit.some((d) => d.long && /°/.test(d.coupes) && !/^Coupes droites/.test(d.coupes.split("·")[0]))) notes.push("* coupe d'angle : voir la planche de la pièce");
    if (R.debit.some((d) => /perçage/.test(d.coupes))) notes.push("(B) perçages de fixation : voir le détail B");
    notes.forEach((n, i) => out += T(xL + 4, yb + hb - 18 + i * 3.4, n, { t: 2, a: "start", c: "#555" }));
    if (achats.length) {
      out += L(xL, yb + hb - 12, xL + wL, yb + hb - 12, "#1f2a36", 0.15);
      out += T(xL + 4, yb + hb - 7.5, "À ACHETER :", { t: 2.2, g: 700, a: "start" });
      out += T(xL + 24, yb + hb - 7.5, achats.map((d) => `${d.qte}x ${d.nom}`).join("  ·  "), { t: 2.1, a: "start" });
      out += T(xL + 24, yb + hb - 3.8, achats.filter((d) => d.note).map((d) => d.note).join(" · "), { t: 1.9, a: "start", c: "#555" });
    }
    }

    const xK = 254, wK = 44;
    out += RECT(xK, yb, wK, hb);
    out += T(xK + wK / 2, yb + 5.5, "LÉGENDE", { t: 2.6, g: 700 });
    out += L(xK, yb + 8, xK + wK, yb + 8, "#1f2a36", 0.2);
    [...groupes.keys()].forEach((m, i) => {
      const c = a3Couleur(m);
      out += `<rect x="${xK + 4}" y="${yb + 12 + i * 7}" width="5" height="3.6" fill="${c.fond}" stroke="${c.trait}" stroke-width="0.4"/>` + T(xK + 11, yb + 15 + i * 7, m, { t: 2.2, a: "start" });
    });
    const yk = yb + 12 + groupes.size * 7;
    if (!apercu) out += L(xK + 4, yk + 1.8, xK + 9, yk + 1.8, "#1f2a36", 0.2, "0.8 0.6") + T(xK + 11, yk + 3, "Perçage (caché)", { t: 2.2, a: "start" });

    const xC = 301, wC = 105;
    out += RECT(xC, yb, wC, hb, 0.4);
    out += T(xC + 4, yb + 11, "AUBOIACIER", { t: 7.5, a: "start", c: "#2b2320", f: "'Hoefler Text', Georgia, 'Times New Roman', serif" });
    out += T(xC + 4, yb + 16, "MÉTALLERIE · FAIT MAIN À SAUMUR", { t: 2, a: "start", c: "#6f6357" });
    out += T(xC + wC - 4, yb + 16, "auboiacier.fr", { t: 2, a: "end", c: "#6f6357" });
    const cases = [
      ["CLIENT", infos.client || "—"], ["CHANTIER", infos.chantier || "—"],
      ["PROJET", modele === "gardeCorps" ? v.seuls ? "Garde-corps à barreaux droits" : `Garde-corps ${v.rosace === false ? "à croix" : "rosace à croix"}${v.traverse ? " et traverse" : ""}` : NOMS[modele]], ["DATE", infos.date || ""],
      ["DESSINÉ PAR", "Q. Aumercier"], ["VÉRIFIÉ", "—"],
      ["ÉCHELLE", `1:${k} @ A3`], ["N° DE PLAN", apercu ? "APERÇU" : infos.numero || "—"],
      ["RÉVISION", "A"], ["FORMAT", "A3 paysage"],
    ];
    const hc = (hb - 19) / 5;
    cases.forEach(([k2, val], i) => {
      const col = i % 2, lig = Math.floor(i / 2), x = xC + col * wC / 2, y = yb + 19 + lig * hc;
      out += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(wC / 2)}" height="${f1(hc)}" fill="none" stroke="#1f2a36" stroke-width="0.18"/>`;
      out += T(x + 1.5, y + 3, k2, { t: 1.8, g: 700, a: "start", c: "#6f6357" }) + T(x + 1.5, y + hc - 2.3, val, { t: 2.5, a: "start" });
    });
    out += T(14, 285.3, apercu ? "Aperçu non contractuel, non destiné à la fabrication. Le plan d'atelier complet est établi par Auboiacier après la commande." : "Ce plan appartient à Auboiacier. Il ne peut être copié ou transmis sans son accord.", { t: 1.8, a: "start", c: "#777" });
    if (apercu) out += `<text x="210" y="112" font-size="52" font-weight="700" fill="#1f2a36" fill-opacity="0.07" font-family="Arial, Helvetica, sans-serif" text-anchor="middle" transform="rotate(-18 210 112)">APERÇU</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297">${out}</svg>`;
  }
const DS_ESSENCES = { pin: "Pin", hetre: "Hêtre", chene: "Chêne", noyer: "Noyer" };
export const DEFAUTS_GC = Object.freeze({"prixVente":0,"km":30,"debitAr":8,"minSoud":1.2,"rnP":14,"rnJ":1,"nF":2,"dF":6.5,"fF":13,"eF":40,"epMc":8,"L":2000,"l":1000,"H":750,"e":45,"a":80,"ep":3,"t":3,"pL":75,"pl":60,"pX":80,"rX":250,"tS":300,"tW":120,"pR":60,"bR":300,"lame":150,"latte":120,"jeu":8,"trait":3,"B":1180,"A":650,"Hs":0,"Hf":0,"s":16,"mc":40,"j":1,"jour":90,"nP":1,"nb":0,"rD":100,"Xo":0,"Hm":2600,"recul":0,"Wm":900,"lh":150,"lw":100,"le":5,"em":50,"nez":0,"hs":80,"tp":8,"plx":200,"ply":150,"tpp":10,"epl":200,"ass":"droit","etage":true,"rosace":true,"traverse":false,"mcType":"bois","sbMode":"auto","seuls":false,"renfort":"sans","essence":"chene","remise":"retrait","essenceT":"chene","teinte":"noir","rainure":true,"jourAuto":true,"jourSaisi":90});
export const BORNES_GC = Object.freeze({ B: Object.freeze({"min":300,"max":3000}), A: Object.freeze({"min":0,"max":1200}), Hf: Object.freeze({"min":0,"max":3000}) });
export const EMPREINTE_SOURCE = "1caf8c6fed72a55330b1cf64acaf9923f600e337c091bfb21176ddcfebe93e3c";
export { ALLEGE_LIBRE, BARRE_APPUI, CIBLE_MARGE, DS_ESSENCES, HAUT_ETAGE, LIMITE_ACIER, MARGE_BOULE, MINI_GC, MINI_SEULS, RENFORT, ROSACE_R, SPHERE, SPHERE_HAUT, Z_ESCALADE, Z_SPHERE, calculerGC, coupeMainCourante, decrireVariante, fmt, geomGC, mmTxt, planA3Pur, svgDe, variantesConformes };
export const EMPREINTE = "8df3b38cae66";
