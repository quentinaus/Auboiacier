// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : NE PAS MODIFIER À LA MAIN.
// Moteur garde-corps : norme NF P01-012, géométrie, débit, dessins. SANS coûts.
// Source : l'outil de plans (plans-atelier.html), sha256 62e1f7aec8d98b72684a3cbaa2a8afd7530428877ae393c529e117c1a83c7f05
/* eslint-disable */
const SPHERE = 110;
const SPHERE_HAUT = 180;
const Z_SPHERE = 800;
const CIBLE_MARGE = 25;
const ROSACE_R = 50;
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
    const Lc = v.B - v.j;
    const appuiA = 0, appuiX = v.Xo >= 100 && v.Xo < 600 ? v.Xo : 0;
    const cible = HAUT_ETAGE + Math.max(appuiA, appuiX) + CIBLE_MARGE;
    const manque = Math.ceil(cible - v.A - v.jour);
    const hNorme = Math.max(MINI_GC, manque);
    const Hr = v.Hs >= MINI_GC ? v.Hs : hNorme;
    const appui = v.Hs >= MINI_GC || manque >= MINI_GC ? null : cible - v.A < BARRE_APPUI && (appuiX === 0 || v.A >= HAUT_ETAGE + appuiX) ? "rien" : "barre";
    const Hc = Hr - v.mc + (v.chev || 0) - (v.eRf || 0);
    const zCadre = v.A + v.jour;
    const Hc0 = Hc, hautInt = zCadre + Hc0 - v.s;
    const place = (z) => z - zCadre >= v.s + SB_MINI && hautInt - (z + v.s) >= SB_CROIX_MINI;
    const besoin = zCadre < Z_ESCALADE, voulu = besoin || v.sbMode === "toujours";
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
    const vide = v.nb > 0 ? (w - v.nb * v.s) / (v.nb + 1) : Infinity;
    const zBas = v.A + v.jour + v.s + (sb ? sb : 0);
    const barres = v.nb > 0 ? Array.from({ length: v.nb }, (_, b) => { const x = (b + 1) * vide + b * v.s; return [x, x + v.s]; }) : [];
    const trous = (w > 0 && h > 0 ? trousPanneau(w, h, v.s, v.rosace === false ? 0 : ROSACE_R, barres, !!v.traverse) : []).map((x) => {
      const d = 2 * x.r;
      const limite = zBas + x.yBas < Z_SPHERE ? SPHERE : SPHERE_HAUT;
      return { ...x, d, limite, ok: d < limite };
    });
    const pire = trous.reduce((m, x) => (!m || x.d / x.limite > m.d / m.limite ? x : m), null);
    return { Lc, cible, manque, appui, hNorme, Hr, Hc, h, w, trous, pire, vide, zBas, sb, hb, nbS, videS, limiteS: zCadre + v.s < Z_SPHERE ? SPHERE : SPHERE_HAUT, dMax: pire ? pire.d : Infinity, limite: pire ? pire.limite : SPHERE, ok: trous.every((x) => x.ok) };
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
    const renfort = v.eRf > 0;
    const rain = !acier && !profilMC && !renfort && v.chev > 0;
    const R = { vues: { face: [], cote: [], dessus: [] }, debit: [], alertes: [], oks: [], notes: [], resume: [], tubes: [], acierM2: 0, poids: 0 };
    const F = R.vues.face, C = R.vues.cote, D = R.vues.dessus;
    const auto = Math.max(1, Math.round(v.B / 600));
    const n = v.nP >= 1 ? Math.round(v.nP) : 1;
    const g = geomGC(v, n);
    if (!(g.w > 3 * v.s) || !(g.h > 3 * v.s)) { R.alertes.push("Le garde-corps est trop petit pour ce nombre de croix : baisse le nombre de croix ou augmente la hauteur."); return R; }
    const s = v.s, x0 = -g.Lc / 2, y0 = v.A + v.jour, haut = y0 + g.Hr;
    const obligatoire = v.etage && v.A < ALLEGE_LIBRE;
    if (g.appui === "rien") R.alertes.push(`Barre d'appui : rien à poser. Le bas de la fenêtre est à ${mmTxt(v.A)} mm du sol : il reste moins de ${BARRE_APPUI} mm jusqu'à ${mmTxt(g.cible)} mm${v.Xo >= 100 && v.Xo < 600 ? "" : `, et à partir de ${ALLEGE_LIBRE} mm la loi n'impose rien`}.`);
    else if (g.appui) {
      const videB = g.cible - BARRE_APPUI - v.A, limiteB = v.A < Z_SPHERE ? SPHERE : SPHERE_HAUT, jourB = g.cible - v.A - MINI_GC;
      R.alertes.push(`Barre d'appui : il ne manque que ${mmTxt(g.cible - v.A)} mm entre le bas de la fenêtre et ${mmTxt(g.cible)} mm du sol. Un garde-corps à croix de ${MINI_GC} mm monterait à ${mmTxt(haut)} mm : la main courante ne serait plus à sa hauteur. ` +
        (videB < limiteB ? `Une barre d'appui seule suffit (vide de ${mmTxt(videB)} mm dessous, boule de ${limiteB}).` : `Il faut une barre d'appui avec une lisse basse (une barre seule laisserait ${mmTxt(videB)} mm de vide, boule de ${limiteB}).`) +
        (jourB >= 0 ? ` Ou garde un garde-corps de ${MINI_GC} mm en réduisant le jour sous le cadre à ${mmTxt(jourB)} mm.` : ""));
    }

    let nMin = null;
    if (!v._rapide) for (let k = 1; k <= 12; k++) { const gk = geomGC(v, k); if (gk.w > 3 * s && gk.ok) { nMin = k; break; } }
    let bMin = null;
    if (!g.ok && !v._rapide) for (let k = 1; k <= 12; k++) { const gk = geomGC({ ...v, nb: k }, n); if (gk.ok) { bMin = k; break; } }
    const tOk = !g.ok && !v.traverse && !v._rapide && geomGC({ ...v, traverse: true }, n).ok;
    if (g.ok && g.dMax > g.limite - 10) R.notes.push(`Trous : ${mmTxt(g.dMax)} mm pour ${g.limite} au maximum. C'est juste : la norme ne tolère aucun millimètre de plus. Garde 10 mm de marge pour les écarts de fabrication.`);
    if (g.ok) R.oks.push(`Trous : le plus grand cercle fait Ø ${mmTxt(g.dMax)} mm${v.nb > 0 ? `, vide entre barreaux ${mmTxt(g.vide)} mm` : ""} (boule de ${g.limite} mm à cet endroit : ${g.limite === SPHERE ? "le trou commence sous 800 mm du sol" : "tout le trou est au-dessus de 800 mm du sol"}) : elle ne passe pas.`);
    else R.alertes.push(`Trous : ${mmTxt(g.dMax)} mm (cercle rouge). À cet endroit, une boule de ${g.limite} mm ne doit pas passer : pas aux normes.` +
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
      if (g.videS >= g.limiteS) R.alertes.push(`Soubassement : vide de ${fmt(g.videS, 1)} mm entre barreaux, il faut moins de ${g.limiteS}.`);
      else R.oks.push(v.A + v.jour < Z_ESCALADE ? `Escalade : rien à quoi grimper sous 600 mm (barreaux verticaux, vide de ${fmt(g.videS, 1)} mm).` : `Soubassement : barreaux verticaux, vide de ${fmt(g.videS, 1)} mm.`);
    } else R.oks.push("Escalade : tout le garde-corps est au-dessus de 600 mm du sol.");
    if (v.traverse) {
      const zT = g.zBas + g.h / 2 + s / 2;
      if (zT >= Z_ESCALADE) R.oks.push(`Traverse du milieu : son dessus est à ${mmTxt(zT)} mm du sol, plus haut que 600 mm. Pour la norme, ce n'est pas une marche : la hauteur à respecter ne change pas.`);
      else R.alertes.push(`Escalade : le dessus de la traverse du milieu est à ${mmTxt(zT)} mm du sol. Sous 600 mm, un enfant peut y poser le pied : pas aux normes. Enlève la traverse.`);
    }
    if (v.sbMode === "toujours" && !g.sb) R.notes.push(`Barreaux en bas : pas assez de hauteur (cadre de ${mmTxt(g.Hc)} mm), les croix seraient trop plates. Garde-corps dessiné avec les croix seules.`);
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
      const sigmaV = (n > 1 ? 0.203 : 0.25) * CHARGE_V * Lv * 1000 / Wv;
      if (sigmaV > LIMITE_ACIER) R.alertes.push(`Charge verticale : si quelqu'un s'appuie de tout son poids au milieu d'un panneau de ${mmTxt(Lv)} mm, la lisse haute travaille à ${mmTxt(sigmaV)} MPa (limite ${LIMITE_ACIER}). Trop faible : mets plus de croix (des panneaux plus étroits).`);
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
      F.push({ t: "poly", piece: "Diagonale entière", cls: "t-acier-plein", pts: barre([px, py], [px + g.w, py + g.h], s, r) });
      F.push({ t: "poly", piece: "Demi-diagonale", cls: "t-acier-plein", pts: barre([px, py + g.h], [px + g.w, py], s, r) });
      if (v.traverse) {
        const dt = demiTraverse(g.w, g.h, s);
        F.push({ t: "poly", piece: "Demi-traverses du milieu", cls: "t-acier-plein", pts: dt.pts.map(([x, y]) => [px + x, py + y]) });
        F.push({ t: "poly", piece: "Demi-traverses du milieu", cls: "t-acier-plein", pts: dt.pts.map(([x, y]) => [px + g.w - x, py + y]) });
      }
      if (v.rosace !== false) F.push({ t: "cercle", piece: "Rosaces", cls: "t-rond", c: [px + g.w / 2, py + g.h / 2], r: ROSACE_R });
      for (let b = 1; b <= v.nb; b++) { const bx = px + b * g.vide + (b - 1) * s; F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: rect(bx, py, bx + s, py + g.h) }); }
      if (i === 0) {
        const vus = new Set(), ronds = [];
        g.trous.forEach((x) => { const k = v.traverse ? `${Math.round(x.d)}|${x.ok}` : Math.round(x.d); if (!vus.has(k)) { vus.add(k); ronds.push({ c: [px + x.c[0], py + x.c[1]], d: x.d, ok: x.ok }); } });
        if (g.sb) { const dS = Math.min(g.videS, g.hb); ronds.push({ c: [x0 + s + g.videS / 2, y0 + s + g.hb / 2], d: dS, ok: dS < g.limiteS }); }
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
    if (v.rosace !== false) F.push({ t: "texte", p: [x0 + s + g.w / 2, y0 + s + (g.sb || 0) + g.h / 2 - ROSACE_R], txt: "rosace Ø 100", pos: "sous" });

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
    R.debit.push({ nom: "Diagonale entière (1 par croix)", qte: n, mat, long: diag, dessin: profil(diagEntiere), coupes: `Bouts en pointe : ${fmt(alpha * DEG, 1)}° et ${fmt(90 - alpha * DEG, 1)}°`, note: "Mesuré à l'axe, d'un coin à l'autre" });
    R.debit.push({ nom: "Demi-diagonale (2 par croix)", qte: 2 * n, mat, long: demi, dessin: profil(demiPoly), coupes: `Côté coin en pointe (${fmt(alpha * DEG, 1)}° / ${fmt(90 - alpha * DEG, 1)}°) · côté centre contre la diagonale à ${fmt(2 * alpha * DEG, 1)}°`, note: "Mesuré à l'axe" });
    morceaux.push({ qte: n, long: diag }, { qte: 2 * n, long: demi });
    if (v.traverse) {
      const dt = demiTraverse(g.w, g.h, s);
      R.debit.push({ nom: "Demi-traverses du milieu (2 par croix)", qte: 2 * n, mat, long: dt.long, dessin: profil(dt.pts, { pointe: true }), coupes: `Côté montant : coupe droite · côté centre : en pointe, 2 coupes à ${fmt(alpha * DEG, 1)}° (scie à ${fmt(90 - alpha * DEG, 1)}°)`, note: "Mesuré à l'axe, du montant à la pointe" });
      morceaux.push({ qte: 2 * n, long: dt.long });
    }
    if (v.nb > 0) { R.debit.push({ nom: "Barreaux", qte: v.nb * n, mat, long: g.h, coupes: `Coupes droites · vides égaux de ${mmTxt(g.vide)} mm`, note: g.sb ? "Entre la lisse intermédiaire et la traverse haute" : v.traverse ? "Entre les traverses du cadre" : "Entre les traverses", dessin: profil(rectPts(g.h, s)) }); morceaux.push({ qte: v.nb * n, long: g.h }); }
    if (profilMC) R.debit.push({ nom: "Main courante", qte: 1, mat: `Main courante acier profilée ${MC_PROFIL.l} × ${MC_PROFIL.h}, rainure ${MC_PROFIL.r}`, long: g.Lc, coupes: "Coupes droites, emboîtée sur la traverse haute, soudée par points dessous", note: "Achetée en barre", dessin: dessinMainCourante(g.Lc, v) });
    else if (v.mc > 0 && acier) R.debit.push({ nom: "Main courante", qte: 1, mat: `Plat acier ${mmTxt(v.lMc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: "Coupes droites, soudée à plat sur la traverse haute", note: "Arêtes cassées", dessin: profil(rectPts(g.Lc, v.mc)) });
    else if (v.mc > 0 && renfort) {
      R.debit.push({ nom: "Plat de renfort de la lisse haute", qte: 1, mat: `Plat acier ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)}`, long: g.Lc, coupes: `Coupes droites · ${nVisMc} trous Ø ${fmt(RENFORT.visD + 0.5, 1)} fraisés dessous, en quinconce à ${fmt((s / 2 + v.lRf / 2) / 2, 0)} mm de l'axe, tous les ${RENFORT.pasVis} mm environ (à percer avant de souder) · soudé à plat, centré sur la traverse haute, cordon continu des deux côtés`, note: "Il tient la poussée sur la main courante : ne pas le supprimer ni le raccourcir", dessin: profil(rectPts(g.Lc, v.eRf)) });
      R.debit.push({ nom: "Main courante", qte: 1, mat: `${{ chene: "Chêne", hetre: "Hêtre", pin: "Pin", noyer: "Noyer" }[v.essence || "chene"]} massif ${mmTxt(v.lMc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: "Dessous plan, sans rainure · arrondie, poncée, huilée", note: "Posée sur le plat de renfort · vissée par dessous à travers le plat", dessin: dessinMainCourante(g.Lc, v) });
      R.debit.push({ nom: `Vis du bois Ø ${RENFORT.visD} × ${RENFORT.visL} inox à tête fraisée`, qte: nVisMc, mat: "À acheter", long: 0, coupes: "Par dessous, à travers le plat de renfort", note: "Avant-trou Ø 3 dans le bois" });
    }
    else if (v.mc > 0) R.debit.push({ nom: "Main courante", qte: 1, mat: `${{ chene: "Chêne", hetre: "Hêtre", pin: "Pin", noyer: "Noyer" }[v.essence || "chene"]} massif ${mmTxt(v.mc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: rain ? `Rainure dessous ${(Number.isInteger(v.lR) ? mmTxt(v.lR) : fmt(v.lR, 1))} × ${mmTxt(v.chev)} de profondeur, sur toute la longueur · arrondie, poncée, huilée` : "Arrondie, poncée, huilée", note: rain ? "Emboîtée sur la lisse haute · collage PU ou vis par-dessous à travers la lisse" : "Fixation sur le cadre : à définir", dessin: dessinMainCourante(g.Lc, v) });
    if (v.rosace !== false) R.debit.push({ nom: "Rosaces Ø 100", qte: n, mat: "Achetées", long: 0, coupes: "1 au centre de chaque croix", note: "" });
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
      ["Croix", `${n}${v.nP >= 1 ? "" : " (auto)"}`],
    ];
    R.notes.push(`Hauteur retenue : ${mmTxt(g.Hr)} mm, main courante comprise (${v.Hs >= MINI_GC ? "voulue par le client" : `calculée pour que la main courante arrive à ${mmTxt(g.cible)} mm du sol${v.etage ? "" : " ; au rez-de-chaussée ce n'est pas obligatoire, tu peux taper une hauteur plus basse"}`}).`);
    if (renfort) R.notes.push(`Main courante ${mmTxt(v.lMc)} × ${mmTxt(v.mc)} sur plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)} : le cadre est plus bas de ${mmTxt(v.mc + v.eRf - (vEntree.mc - (mainCouranteGC({ ...vEntree, renfort: "sans" }).chev || 0)))} mm qu'avec la main courante de ${mmTxt(vEntree.mc)}, le dessus reste à la même hauteur.`);
    R.notes.push(v.traverse ? "Chaque croix : une diagonale entière et deux demi-diagonales soudées contre elle. Au milieu, deux demi-traverses vont du montant jusqu'au centre : leur bout en pointe rentre entre les diagonales." : "Chaque croix : une diagonale entière et deux demi-diagonales soudées contre elle.");
    return R;
  }
function variantesConformes(v) {
    const base = calculerGC(v);
    if (!base.alertes.length) return [];
    const carres = [...new Set([v.s, 16, 18, 20].filter((x) => x >= v.s))];
    const croix = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], barreaux = [0, 1, 2, 3, 4];
    const rf0 = v.renfort === "plat" ? "plat" : "sans";
    const tropSouple = v.mcType === "bois" && calculerGC({ ...v, s: 20, renfort: "sans", _rapide: true }).alertes.some((a) => a.startsWith("Solidité"));
    const renforts = tropSouple ? [...new Set([rf0, "plat"])] : [rf0];
    const vues = new Set(), out = [];
    for (const renfort of renforts) for (const sbMode of [...new Set([v.sbMode || "auto", "toujours"])]) for (const s of carres) for (const nP of croix) for (const nb of barreaux) for (const Hs of v.Hs >= MINI_GC ? [v.Hs, 0] : [0]) for (const traverse of [false, true]) {
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
export const DEFAUTS_GC = Object.freeze({"prixVente":0,"km":30,"debitAr":8,"minSoud":1.2,"rnP":14,"rnJ":1,"nF":2,"dF":6.5,"fF":13,"eF":40,"epMc":8,"L":2000,"l":1000,"H":750,"e":45,"a":80,"ep":3,"t":3,"pL":75,"pl":60,"pX":80,"rX":250,"tS":300,"tW":120,"pR":60,"bR":300,"lame":150,"latte":120,"jeu":8,"trait":3,"B":1180,"A":650,"Hs":0,"Hf":0,"s":16,"mc":40,"j":1,"jour":90,"nP":1,"nb":0,"Xo":0,"Hm":2600,"recul":0,"Wm":900,"lh":150,"lw":100,"le":5,"em":50,"nez":0,"hs":80,"tp":8,"plx":200,"ply":150,"tpp":10,"epl":200,"ass":"droit","etage":true,"rosace":true,"traverse":false,"mcType":"bois","sbMode":"auto","renfort":"sans","essence":"chene","remise":"retrait","essenceT":"chene","teinte":"noir","rainure":true});
export const BORNES_GC = Object.freeze({ B: Object.freeze({"min":300,"max":3000}), A: Object.freeze({"min":0,"max":1200}), Hf: Object.freeze({"min":0,"max":3000}) });
export const EMPREINTE_SOURCE = "62e1f7aec8d98b72684a3cbaa2a8afd7530428877ae393c529e117c1a83c7f05";
export { ALLEGE_LIBRE, BARRE_APPUI, CIBLE_MARGE, HAUT_ETAGE, LIMITE_ACIER, MINI_GC, RENFORT, ROSACE_R, SPHERE, SPHERE_HAUT, Z_ESCALADE, Z_SPHERE, calculerGC, decrireVariante, fmt, geomGC, mmTxt, variantesConformes };
export const EMPREINTE = "02686a4c5478";
