// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : NE PAS MODIFIER À LA MAIN.
// Moteur garde-corps : norme NF P01-012, géométrie, débit, dessins. SANS coûts.
// Source : l'outil de plans (plans-atelier.html), sha256 f305bbfeaa2968decd89d9ac295800f463a52329cedb119de0d891f83f58fb8f
/* eslint-disable */
const NOMS = { mikado: "Table Mikado", croix: "Table Croix", mikadoExt: "Table Mikado extérieur", resine: "Table Résine Époxy Mikado", gardeCorps: "Garde-corps Rosace à croix", escalier: "Escalier droit à limon central", ptBattant: "Portail battant", ptCoulissant: "Portail coulissant", ptPliant: "Portail pliant", ptPortillon: "Portillon" };
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
const PATTE = { scel: 80 };
const PATTES_MAX = 4;
const nbPattes = (v) => (v.patte === true ? 1 : Math.max(0, Math.min(PATTES_MAX, Math.round(Number(v.patte) || 0))));
const HAUTE_PATTE = 1.5;
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
const fmt = ((formats) => (x, d = 0) => (formats[d] || (formats[d] = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }))).format(Number(x)))({});
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
function plaque(contour, trous = [], { cls = "t-acier-plein", note = "", cotes = null } = {}) {
    const xs = contour.map((p) => p[0]), ys = contour.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    const prims = [{ t: "poly", cls, pts: contour }];
    prims.push({ t: "cote", a: [x0, y0], b: [x1, y0], cote: "bas", d: trous.length ? 1 : 1, txt: mmTxt(x1 - x0) });
    prims.push({ t: "cote", a: [x1, y0], b: [x1, y1], cote: "droite", d: 1, txt: mmTxt(y1 - y0) });
    if (trous.length) {
      trous.forEach((tr) => prims.push({ t: "cercle", cls: "t-trou-plan", c: tr.c, r: tr.d / 2 }));
      const chaine = (vals, lo, hi) => [lo, ...[...new Set(vals.map((v) => Math.round(v * 10) / 10))].sort((a, b) => a - b).filter((v) => v > lo + 0.5 && v < hi - 0.5), hi];
      const ref = cotes || { x: trous, y: trous };
      const cx = chaine(ref.x.map((tr) => tr.c[0]), x0, x1), cy = chaine(ref.y.map((tr) => tr.c[1]), y0, y1);
      for (let k = 0; k + 1 < cx.length; k++) prims.push({ t: "cote", a: [cx[k], y1], b: [cx[k + 1], y1], cote: "haut", d: 1, txt: mmTxt(cx[k + 1] - cx[k]) });
      for (let k = 0; k + 1 < cy.length; k++) prims.push({ t: "cote", a: [x0, cy[k]], b: [x0, cy[k + 1]], cote: "gauche", d: 1, txt: mmTxt(cy[k + 1] - cy[k]) });
      const ds = [...new Set(trous.map((tr) => tr.d))];
      prims.push({ t: "texte", p: [(x0 + x1) / 2, y0], txt: `${trous.length} trou${trous.length > 1 ? "s" : ""} Ø ${ds.join(" / ")}${note ? " · " + note : ""}`, pos: "sous", decal: 3.2 });
    } else if (note) prims.push({ t: "texte", p: [(x0 + x1) / 2, y0], txt: note, pos: "sous", decal: 3.2 });
    return prims;
  }
const rectPts = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const percages = (Lm, n, e) => (n >= 3 ? [e, Lm / 2, Lm - e] : [e, Lm - e]);
const effortsPoints = (P, yH, ys) => {
    const n = ys.length, m = ys.reduce((a, y) => a + y, 0) / n, I = ys.reduce((a, y) => a + (y - m) ** 2, 0);
    return ys.map((y) => Math.abs(P / n + (I > 0 ? P * (yH - m) * (y - m) / I : 0)));
  };
function fixationMurGC({ mur, c, s, LmF, y0, yH, P, eF, eMur }) {
    const NOMS_MUR = { beton: "béton", brique: "brique pleine", "brique-creuse": "brique creuse", parpaing: "parpaing", "beton-cellulaire": "béton cellulaire", tuffeau: "pierre tendre (tuffeau)", "pierre-dure": "pierre dure", moellons: "moellons", placo: "placo", enduit: "mur inconnu (enduit)" };
    const nomMur = NOMS_MUR[mur] || mur;
    const MONTAGE_CLIENT = { tige: "des tiges scellées dans le mur à travers le cadre", platine: "de petites platines soudées au cadre et des tiges scellées dans le mur", platines: "de petites platines soudées au cadre et des tiges scellées dans le mur", traversant: "des tiges qui traversent le mur, avec une plaque côté intérieur" };
    const CONSEIL_CLIENT = {
      placo: "Le placo est à l'intérieur : indiquez le mur extérieur (béton, brique, pierre…).",
      "brique-creuse": "S'il y a un poteau en béton le long de la fenêtre, choisissez « Béton ».",
      parpaing: "S'il y a un poteau en béton le long de la fenêtre, choisissez « Béton ».",
    };
    const client = (statut, mode) => statut === "valide" ? `Fixation adaptée à votre mur (${nomMur}) : ${MONTAGE_CLIENT[mode] || "des tiges scellées dans le mur"}, tout en inox, fournie.`
      : statut === "indicatif" ? "Prix indicatif : nous confirmerons la fixation avec la photo de votre tableau."
      : `Votre mur (${nomMur}) demande une fixation à étudier : nous vous faisons un devis.${CONSEIL_CLIENT[mur] ? " " + CONSEIL_CLIENT[mur] : ""}`;
    const kg = (kN) => Math.round(kN * 101.97);
    const haut = y0 + LmF - eF, bas = y0 + eF;
    const TIGE = (d, l) => ({ cle: d === 8 ? "fxT8" : "fxT10", nom: `Tige filetée M${d} inox A4, coupée à ${l} mm` });
    const ECROU = (d) => ({ cle: d === 8 ? "fxE8" : "fxE10", nom: `Écrou borgne et rondelle M${d} inox A4` });
    const RESINE = { cle: "fxRes", nom: "Résine de scellement fischer FIS V Plus 360 S (cartouche)" };
    const BRIQUE_PLEINE = () => ({ mode: "platine", nom: "en haut, une platine 50 × 6 à 2 tiges M10 l'une au-dessus de l'autre (65 mm, deux briques) ; en bas, une platine à 1 tige M10", cMin: 60, sMin: 0,
      pts: () => (haut - 65 >= bas + 30 ? [bas, haut - 65, haut] : null), rd: "brique",
      trou: "platine 50 × 6 × 100 mm en haut (2 trous Ø 12), platine 50 × 6 × 60 mm en bas (1 trou Ø 12), soudées derrière le montant, posées sur le mur nu", platines: 4, plat: [50, 6, 100],
      plaques: [{ qte: 2, L: 100, W: 50, E: 6, d: 12, trous: [[25, 17.5], [25, 82.5]], role: "en haut, 2 tiges l'une au-dessus de l'autre (65 mm)" }, { qte: 2, L: 60, W: 50, E: 6, d: 12, trous: [[25, 30]], role: "en bas, 1 tige" }],
      achats: [[TIGE(10, 100), 6], [ECROU(10), 6], [RESINE, 1]] });
    const TRAVERSANT = (nomMurT) => {
      const e = Math.max(80, c), a = 75, rdT = Math.min(5.625 * a / (e + a), 4.225 * a / e, 0.783 / (e / 1000));
      const lT = Math.round((eMur || 450) + 90);
      return { mode: "traversant", nom: `en haut et en bas de chaque montant, une patte en équerre (plat 50 × 8 de chant) qui revient sur la façade, 2 tiges M10 inox qui traversent le mur (${Math.round(eMur || 450)} mm) jusqu'à une plaque inox 150 × 150 × 6 à l'intérieur`, cMin: 0, sMin: 0,
        pts: () => [bas, haut], rd: [rdT, rdT], statut: "valide",
        nature: `calcul de l'ancrage traversant (${nomMurT} : aucune cheville ; appui des plaques sur la maçonnerie 0,25 N/mm², acier M10 A4-70) ; tiges à ${e} mm de l'arête`,
        trou: "4 pattes en équerre 50 × 8 soudées aux montants de rive (2 trous Ø 12 chacune), talon de 130 × 130 sur la façade ; 4 plaques inox 150 × 150 × 6 à l'intérieur, isolées de l'acier (rondelles)", platines: 4, plat: [50, 8, 180],
        plaques: [{ qte: 4, L: 180, W: 50, E: 8, d: 12, trous: [[150, 10], [150, 40]], role: "pattes de façade en équerre (2 tiges chacune)" }],
        achats: [[TIGE(10, lT), 8], [ECROU(10), 16], [{ cle: "fxPlq", nom: "Plaque inox A4 150 × 150 × 6 (intérieur)" }, 4], [{ cle: "fxRon", nom: "Rondelles isolantes (inox / acier)" }, 8]] };
    };
    const MONTAGES = {
      beton: [
        { mode: "tige", nom: "une tige M8 inox scellée à travers le montant, en haut et en bas", cMin: 40, sMin: 14, pts: () => [bas, haut], rd: [1.69, 1.69], statut: "valide",
          nature: "valeur calculée (EN 1992-4, béton C20/25 fissuré, ancrage 80 mm), à faire confirmer par fischer ou Hilti",
          trou: "trou droit Ø 9 dans le montant (au lieu du fraisé), tige posée d'abord dans le mur", platines: 0,
          achats: [[TIGE(8, 110), 4], [ECROU(8), 4], [RESINE, 1]] },
        { mode: "platine", nom: "en haut, une platine 40 × 6 à 2 tiges M8 l'une derrière l'autre (la 1re à 60 mm de l'arête) ; en bas, une tige M8", cMin: 60, sMin: 0, pts: () => [bas, haut], rd: [1.69, 2.87], statut: "valide",
          nature: "valeurs calculées (EN 1992-4, béton C20/25 fissuré), à faire confirmer par fischer ou Hilti",
          trou: "platine 40 × 6 × 90 mm soudée derrière le montant en haut (2 trous Ø 9) ; en bas, trou droit Ø 9", platines: 2, plat: [40, 6, 90],
          plaques: [{ qte: 2, L: 90, W: 40, E: 6, d: 9, trous: [[45, 20], [85, 20]], role: "en haut, 2 tiges l'une derrière l'autre (40 mm)" }],
          achats: [[TIGE(8, 110), 6], [ECROU(8), 6], [RESINE, 1]] },
      ],
      "beton-cellulaire": [
        { mode: "platines", nom: "deux platines 50 × 6 par montant, à 240 mm l'une de l'autre, tige M10 dans un trou conique (foret fischer PBB Ø 14, 75 mm)", cMin: 120, sMin: 0,
          pts: () => (haut - 240 >= y0 + 15 ? [haut - 240, haut] : null), rd: [0.89, 0.89], statut: "valide",
          nature: "valeur calculée avec l'ETE fischer (bloc ≥ 2,5 N/mm²), à faire confirmer par fischer",
          trou: "2 platines 50 × 6 × 90 mm soudées derrière le montant (1 trou Ø 12 chacune), posées sur le bloc nu (enduit enlevé)", platines: 4, plat: [50, 6, 90],
          plaques: [{ qte: 4, L: 90, W: 50, E: 6, d: 12, trous: [[70, 25]], role: "en haut et en bas, à 240 mm" }],
          achats: [[TIGE(10, 100), 4], [ECROU(10), 4], [RESINE, 1]] },
      ],
      brique: [
        { mode: "platine", nom: "en haut, une platine 50 × 6 à 2 tiges M10 l'une au-dessus de l'autre (65 mm, deux briques) ; en bas, une platine à 1 tige M10", cMin: 60, sMin: 0,
          pts: () => (haut - 65 >= bas + 30 ? [bas, haut - 65, haut] : null), rd: "brique", statut: "valide",
          nature: "valeur calculée prudente, sans essai : le plus petit de l'ETE-20/0729 (1,14 kN par tige) et de la casse du bord de la brique (TR 054, brique 12,5 N/mm², γ 2,5) ; à faire confirmer par fischer",
          trou: "platine 50 × 6 × 100 mm en haut (2 trous Ø 12), platine 50 × 6 × 60 mm en bas (1 trou Ø 12), soudées derrière le montant, posées sur la brique nue", platines: 4, plat: [50, 6, 100],
          plaques: [{ qte: 2, L: 100, W: 50, E: 6, d: 12, trous: [[25, 17.5], [25, 82.5]], role: "en haut, 2 tiges l'une au-dessus de l'autre (65 mm)" }, { qte: 2, L: 60, W: 50, E: 6, d: 12, trous: [[25, 30]], role: "en bas, 1 tige" }],
          achats: [[TIGE(10, 100), 6], [ECROU(10), 6], [RESINE, 1]] },
      ],
      "brique-creuse": [
        { mode: "platines", nom: "deux platines 50 × 6 par montant, à 315 mm (une par rang), tamis fischer FIS H 20 × 85 K + douille FIS E 15 × 85 M10 inox", cMin: 50, sMin: 0,
          pts: () => (haut - 315 >= y0 + 15 ? [haut - 315, haut] : null), rd: [0.12, 0.12], statut: "valide",
          nature: "valeur calculée prudente, sans essai : la plus faible valeur publiée pour une brique creuse (VRk 0,3 kN, ETE-20/0729) ÷ 2,5 ; à faire confirmer par fischer",
          trou: "2 platines 50 × 6 × 90 mm soudées derrière le montant (1 trou Ø 12 chacune), posées sur la brique nue", platines: 4, plat: [50, 6, 90],
          plaques: [{ qte: 4, L: 90, W: 50, E: 6, d: 12, trous: [[60, 25]], role: "en haut et en bas, à 315 mm (un rang chacune)" }],
          achats: [[{ cle: "fxTaF", nom: "Tamis fischer FIS H 20 × 85 K" }, 4], [{ cle: "fxDou", nom: "Douille taraudée fischer FIS E 15 × 85 M10 (inox si possible)" }, 4], [{ cle: "fxV10", nom: "Vis M10 inox A4 + rondelle" }, 4], [RESINE, 1]] },
      ],
      parpaing: [
        { mode: "platines", nom: "deux platines 50 × 6 par montant, à 200 mm (deux rangs de blocs), chevilles chimiques avec tamis", cMin: 50, sMin: 0,
          pts: () => (haut - 200 >= y0 + 15 ? [haut - 200, haut] : null), rd: [0.48, 0.48], statut: "valide",
          nature: "valeur calculée sans essai : 1,2 kN publiés pour le bloc creux (Hilti, ETE-19/0160, bord ≥ 50 mm) ÷ 2,5 ; à faire confirmer par Hilti",
          trou: "2 platines 50 × 6 × 90 mm soudées derrière le montant (1 trou Ø 9 chacune), posées sur le bloc nu", platines: 4, plat: [50, 6, 90],
          plaques: [{ qte: 4, L: 90, W: 50, E: 6, d: 9, trous: [[60, 25]], role: "en haut et en bas, à 200 mm (un rang de blocs chacune)" }],
          achats: [[{ cle: "fxTaH", nom: "Tamis Hilti HIT-SC 16 × 85" }, 4], [TIGE(8, 160), 4], [ECROU(8), 4], [{ cle: "fxHit", nom: "Résine Hilti HIT-HY 270 (cartouche)" }, 1]] },
      ],
      "pierre-dure": [TRAVERSANT("pierre dure")],
      moellons: [TRAVERSANT("moellons")],
      enduit: [{ ...BRIQUE_PLEINE(), statut: "indicatif", nature: "prix indicatif, sur la base d'une brique pleine : le mur sera confirmé avec la photo du tableau, la fixation et le prix peuvent changer" }],
      tuffeau: [
        { mode: "platine", nom: "en haut, une platine 50 × 6 à 2 tiges M10 inox scellées 100 mm, l'une au-dessus de l'autre dans 2 pierres différentes ; en bas, une platine à 1 tige", cMin: 60, sMin: 0,
          pts: () => (haut - 65 >= bas + 30 ? [bas, haut - 65, haut] : null), rd: "tuffeau", statut: "valide",
          nature: "valeur calculée prudente, sans essai (tuffeau mouillé 3,2 N/mm², TR 054, γ 2,5) : aucune valeur publiée pour la pierre ; à faire confirmer par fischer",
          trou: "platine 50 × 6 × 100 mm en haut (2 trous Ø 12), platine 50 × 6 × 60 mm en bas (1 trou Ø 12), posées sur la pierre nue", platines: 4, plat: [50, 6, 100],
          plaques: [{ qte: 2, L: 100, W: 50, E: 6, d: 12, trous: [[25, 17.5], [25, 82.5]], role: "en haut, 2 tiges dans 2 pierres différentes" }, { qte: 2, L: 60, W: 50, E: 6, d: 12, trous: [[25, 30]], role: "en bas, 1 tige" }],
          achats: [[TIGE(10, 120), 6], [ECROU(10), 6], [RESINE, 1]] },
      ],
    };
    const ETUDE = {
      placo: "le placo est à l'intérieur, le garde-corps se fixe dehors : indiquer le mur extérieur (béton, brique, pierre…)",
    };
    if (ETUDE[mur]) return { mur, nomMur, mode: "etude", statut: "etude", texte: `sur étude — ${ETUDE[mur]}.`, texteClient: client("etude"), points: [], achats: [], platines: 0 };
    const liste = MONTAGES[mur];
    if (!liste) return { mur, nomMur, mode: "etude", statut: "etude", texte: "mur inconnu de l'outil : sur étude.", texteClient: client("etude"), points: [], achats: [], platines: 0 };
    let refus = "";
    for (const m of liste) {
      if (c < m.cMin) { refus = `la 1re fixation doit être à ${m.cMin} mm au moins de l'arête du mur nu (ici ${Math.round(c)} mm)`; continue; }
      if (s < m.sMin) { refus = `un carré de ${m.sMin} au moins pour le trou de la tige`; continue; }
      const ys = m.pts();
      if (!ys) { refus = `le montant de rive est trop court (${Math.round(LmF)} mm) pour écarter les fixations`; continue; }
      const V = effortsPoints(P, yH, ys);
      const rd = m.rd === "tuffeau" ? ys.map(() => 0.091 * c ** 1.5 / 101.97)
        : m.rd === "brique" ? ys.map(() => Math.min(1.14, 0.091 * Math.sqrt(12.5 / 3.2) * c ** 1.5 / 101.97)) : m.rd;
      const points = ys.map((y, i) => ({ y, V: V[i], rd: rd ? rd[i] : null }));
      const trop = rd ? points.find((p) => p.V > p.rd) : null;
      if (trop && m.statut !== "indicatif") { refus = `la fixation la plus chargée reprendrait ${kg(trop.V)} kg pour ${kg(trop.rd)} kg admis`; continue; }
      const pire = points.reduce((a, p) => (p.V > a.V ? p : a), points[0]);
      const charge = rd ? `fixation la plus chargée : ${kg(pire.V)} kg pour ${kg(pire.rd)} kg admis` : `fixation la plus chargée : ${kg(pire.V)} kg, à prouver par essais`;
      const texte = `${m.statut === "valide" ? "validé par le calcul" : m.statut === "indicatif" ? "prix indicatif" : "sous réserve d'essais"} — ${m.nom} ; ${charge}${trop ? " : il faudra sans doute des pattes ou un autre montage" : ""} (${m.nature}). ${m.trou}. Tout en inox A4.`;
      return { mur, nomMur, mode: m.mode, statut: m.statut, texte, texteClient: client(m.statut, m.mode), nomMontage: m.nom, trou: m.trou, points, plat: m.plat || null, platines: m.platines, plaques: m.plaques || [], c,
        achats: m.achats.map(([a, q]) => ({ cle: a.cle, nom: a.nom, qte: q })) };
    }
    const SOLUTIONS = {
      "brique-creuse": "si un poteau ou un encadrement en béton borde la fenêtre (fréquent en construction récente), la fixation se fait dedans (choisir « Béton ») ; sinon pattes scellées dans un appui en béton, ou visite",
      parpaing: "si un poteau ou un encadrement en béton borde la fenêtre (fréquent en construction récente), la fixation se fait dedans (choisir « Béton ») ; sinon pattes scellées dans un appui en béton, ou visite",
      "beton-cellulaire": "pattes scellées dans un appui en béton, ou visite",
      beton: "platine plus loin de l'arête, pattes dans l'appui, ou note de calcul",
    };
    return { mur, nomMur, mode: "etude", statut: "etude", texte: `sur étude — ${refus}. Solutions : ${SOLUTIONS[mur] || "pattes dans l'appui, montage plus fort à étudier, ou visite"}.`, texteClient: client("etude"), points: [], achats: [], platines: 0 };
  }
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
      const dBarre = (x) => {
        let m = Infinity;
        for (let j = 0; j < barres.length; j++) { const a = barres[j][0], b = barres[j][1]; m = Math.min(m, x < a ? a - x : x > b ? x - b : -Math.min(x - a, b - x)); }
        return m;
      };
      const D0 = D[0], D1 = D[1], D2c = D[2];
      const f = (x, y) => Math.min(D0.a * x + D0.b * y - D0.c, D1.a * x + D1.b * y - D1.c, D2c.a * x + D2c.b * y - D2c.c, Math.hypot(x - M[0], y - M[1]) - rr, dBarre(x));
      const morceauDe = (x) => { let k = 0; for (let j = 0; j < barres.length; j++) if (x > barres[j][0]) k++; return k; };
      let best = { r: -Infinity, c: [0, 0] };
      const N = barres.length ? 72 : 48;
      const parMorceau = traverse ? barres.map(() => ({ r: -Infinity, c: [0, 0] })).concat([{ r: -Infinity, c: [0, 0] }]) : null;
      for (let i = 0; i <= N; i++) for (let k = 0; k <= N - i; k++) {
        const u = i / N, w2 = k / N, z = 1 - u - w2;
        const x = u * P[0][0] + w2 * P[1][0] + z * P[2][0], y = u * P[0][1] + w2 * P[1][1] + z * P[2][1];
        const r = f(x, y); if (r > best.r) best = { r, c: [x, y] };
        if (traverse) { const m = parMorceau[morceauDe(x)]; if (r > m.r) { m.r = r; m.c = [x, y]; } }
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
    const mini = seuls && !decorActif(v) ? MINI_SEULS : MINI_GC;
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
    const rH = Math.min(6, m / 4, W / 4), rB = Math.min(2, m / 8, (W - l) / 4);
    const arc = (cx, cy, r, a0, a1) => Array.from({ length: 7 }, (_, i) => { const a = a0 + (a1 - a0) * i / 6; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    const P = Math.PI;
    const basGauche = arc(-W / 2 + rB, rB, rB, P, 1.5 * P), basDroite = arc(W / 2 - rB, rB, rB, 1.5 * P, 2 * P);
    const dessus = [...arc(W / 2 - rH, m - rH, rH, 0, 0.5 * P), ...arc(-W / 2 + rH, m - rH, rH, 0.5 * P, P)];
    return c > 0
      ? [...basGauche, [-l / 2, 0], [-l / 2, c], [l / 2, c], [l / 2, 0], ...basDroite, ...dessus]
      : [...basGauche, ...basDroite, ...dessus];
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
const DECOR_NOMS = { entre: "Volutes entre les barreaux", frise: "Frise de volutes", anneaux: "Frise d'anneaux (Directoire)", hauteur: "Grille de volutes", coeurs: "Cœurs forgés", medaillon: "Médaillon", applique: "Motifs en applique" };
function decorActif(v) { return !!(v && DECOR_NOMS[v.decor]); }
const DECOR_FORMES_TXT = { C: "volutes en C", S: "volutes en S", J: "crosses", coeur: "cœurs", doubleC: "doubles C", poste: "postes", anneau: "anneaux", lyre: "deux crosses en lyre" };
function nomDecorGC(ch) {
    const f = DECOR_FORMES_TXT[ch.forme] || "volutes", f1 = { C: "volute en C", S: "volute en S", J: "deux crosses en lyre", coeur: "cœur", doubleC: "double C" }[ch.forme] || f;
    switch (ch.assemblage) {
      case "entre": return `${f.charAt(0).toUpperCase() + f.slice(1)} entre les barreaux`;
      case "frise": return ch.forme === "poste" ? "Frise de postes" : `Frise de ${f}`;
      case "anneaux": return "Frise d'anneaux (Directoire)";
      case "hauteur": return `Grille de ${f}`;
      case "coeurs": return "Cœurs forgés";
      case "medaillon": return `Médaillon : ${f1}`;
      case "applique": return `${f.charAt(0).toUpperCase() + f.slice(1)} en applique`;
      default: return DECOR_NOMS[ch.assemblage] || "Décor à volutes";
    }
  }
function choixDecorGC(v) {
    return { assemblage: v.decor, forme: v.decorForme, bouts: v.decorBouts, liaison: v.decorLiaison, barreaux: v.decorBarreaux, friseBasse: v.decorFriseBasse, dore: v.decorDore === "1" || v.decorDore === true };
  }
function decorGC(v, g, x0, y0) {
    const s = v.s, px = x0 + s, py = y0 + s, escalade = y0 < Z_ESCALADE;
    const z = { x0: px, x1: px + g.w, y0: py, haut: () => py + g.h, barreau: s, vide: py < Z_SPHERE ? SB_VIDE : SPHERE_HAUT - 10,
      norme: { sol: () => 0, escalade, marge: MARGE_BOULE, pas: 2 } };
    const F = [], pieces = [], q = {};
    const ch = mtRemplir(z, choixDecorGC(v), F, pieces, q);
    const N = (q.norme || [])[0] || { ok: true, dBas: 0, dMax: 0, ou: null, appui: null };
    const nom = nomDecorGC(ch);
    const nVol = Object.values(q.volutes || {}).reduce((a, b) => a + b, 0);
    const fin = [ch.assemblage === "anneaux" ? null : ch.bouts === "bouton" ? "bouts effilés à bouton" : ch.bouts === "effile" ? "bouts effilés" : "bouts coupés droits", ch.liaison === "colliers" ? (q.colliers ? `${q.colliers} colliers` : null) : "soudées", ch.barreaux === "torsade" ? "barreaux torsadés" : ch.barreaux === "bagues" ? "barreaux à bagues" : null, ch.dore ? "rehauts dorés" : null].filter(Boolean).join(", ");
    const note = `Décor : ${nom}, ${nVol} pièce${nVol > 1 ? "s" : ""} (${fin})${escalade ? ", posé au-dessus d'un socle de barreaux serrés jusqu'à 620 mm du sol" : ""}. Volutes, colliers et bagues achetés tout faits, repris au gabarit.`;
    const trous = N.ou ? [{ c: [N.ou[0] - px, N.ou[1] - py], d: N.dBas, ok: N.ok }] : [];
    const kgDecor = pieces.filter((p) => !/^Carré plein/.test(p.mat)).reduce((t, p) => t + (p.kgM || 0) * (p.long || 0) / 1000, 0);
    return { F: F.filter((p) => p.role !== "detour"), pieces, q, ch, N, escalade, nom, fin, note, trous, kgDecor, chiffre: { pieces, q, ch } };
  }
function normeDecorGC(R, D) {
    const N = D.N, lim = SPHERE - MARGE_BOULE;
    if (N.ok) R.oks.push(`Trous : décor contrôlé sur son dessin. Le plus grand cercle fait Ø ${mmTxt(N.dBas)} mm sous 800 mm du sol${N.dMax > N.dBas + 1 ? `, Ø ${mmTxt(N.dMax)} mm au-dessus` : ""} (boules de ${SPHERE} et ${SPHERE_HAUT} mm, ${MARGE_BOULE} mm de marge comprise) : elles ne passent pas.`);
    else if (N.appui) R.alertes.push(`Escalade : le décor laisse un appui pour le pied à ${mmTxt(N.appui[1])} mm du sol (entre 100 et 600 mm) : pas aux normes. Choisis un autre décor.`);
    else R.alertes.push(`Trous : le décor laisse passer un cercle de Ø ${mmTxt(N.dBas >= lim ? N.dBas : N.dMax)} mm (boule de ${N.dBas >= lim ? SPHERE : SPHERE_HAUT} mm, ${MARGE_BOULE} mm de marge) : pas aux normes. Choisis une autre volute ou un autre décor.`);
    if (N.variante) R.notes.push("Décor : pour rester aux normes, les barreaux restent continus derrière le motif, soudé devant.");
    for (const n of D.q.notes || []) R.notes.push(n);
  }
function debitDecorGC(R, D, morceaux, s) {
    const groupes = new Map();
    for (const p of D.pieces) { const k = `${p.nom}|${p.mat}|${Math.round(p.long)}|${p.dim || 0}`; const x = groupes.get(k); if (x) x.qte++; else groupes.set(k, { ...p, qte: 1 }); }
    for (const p of groupes.values()) {
      const carre = /^Carré plein/.test(p.mat), achetee = p.fab === "achat";
      const d = { nom: p.nom, qte: p.qte, mat: achetee ? `Achetée toute faite (environ ${mmTxt(p.dim)} mm), fer plat ${MT_ATELIER.volute.b} × ${MT_ATELIER.volute.e}` : p.nom === "Collier" ? "Acheté (collier pour volutes)" : p.mat, long: achetee || p.nom === "Collier" ? 0 : Math.round(p.long), coupes: p.coupes, note: p.note };
      if (carre) { d.dessin = profil(rectPts(p.long, s)); morceaux.push({ qte: p.qte, long: p.long }); }
      if (p.forme) {
        const f = MT_FORMES[p.forme === "lyre" ? "lyre" : p.forme](), b = mtBoite(f), k = p.dim / Math.max(b.x1 - b.x0, b.y1 - b.y0);
        const tr = f.map((t) => t.map(([x, y]) => [(x - b.x0) * k, (b.y1 - y) * k]));
        d.dessin = [...tr.map((t) => ({ t: "poly", ouvert: true, cls: "t-acier", pts: mtAlleger(t, 0.3) })),
          { t: "cote", a: [0, 0], b: [(b.x1 - b.x0) * k, 0], cote: "bas", d: 1, txt: mmTxt((b.x1 - b.x0) * k) },
          { t: "cote", a: [0, 0], b: [0, (b.y1 - b.y0) * k], cote: "gauche", d: 1, txt: mmTxt((b.y1 - b.y0) * k) }];
        d.note = (d.note ? d.note + " · " : "") + `longueur développée ${mmTxt(p.long)} mm`;
      }
      R.debit.push(d);
    }
    if (D.q.bagues) R.debit.push({ nom: "Bagues", qte: D.q.bagues, mat: "Achetées (bagues forgées)", long: 0, coupes: "Deux par barreau, au tiers et aux deux tiers", note: "" });
  }
function calculerGC(v) {
    const vEntree = v;
    const acier = v.mcType === "acier";
    const profilMC = v.mcType === "profil";
    v = mainCouranteGC(v);
    const decor = decorActif(v);
    if (decor) v = { ...v, seuls: true };
    const seuls = !!v.seuls;
    if (seuls) v = { ...v, traverse: false, nb: 0, rosace: false, sbMode: "auto", nP: 1 };
    const renfort = v.eRf > 0;
    const rain = !acier && !profilMC && !renfort && v.chev > 0;
    const R = { vues: { face: [], cote: [], dessus: [] }, debit: [], alertes: [], oks: [], notes: [], resume: [], tubes: [], acierM2: 0, poids: 0 };
    const F = R.vues.face, C = R.vues.cote, D = R.vues.dessus;
    const auto = Math.max(1, Math.round(v.B / 600));
    const n = v.nP >= 1 ? Math.round(v.nP) : 1;
    const g = geomGC(v, seuls ? 1 : n);
    if (v.ass === "onglet" && v.eF < v.fF / 2 + v.s + 3) v = { ...v, eF: Math.ceil(v.fF / 2 + v.s + 3) };
    if ((v.ass === "onglet" ? g.Hc : g.Hc - 2 * v.s) < 2 * v.eF + v.fF) v = { ...v, eF: Math.max(15, v.fF / 2 + 9) };
    if (!(g.w > 3 * v.s) || !(g.h > 3 * v.s)) { R.alertes.push(seuls ? "Le garde-corps est trop petit pour des barreaux : augmente la largeur ou la hauteur." : "Le garde-corps est trop petit pour ce nombre de croix : baisse le nombre de croix ou augmente la hauteur."); return R; }
    const s = v.s, x0 = -g.Lc / 2, y0 = v.A + v.jour, haut = y0 + g.Hr;
    const Dec = decor ? decorGC(v, g, x0, y0) : null;
    const kPattes = nbPattes(v);
    const xsPattes = !kPattes ? [] : (() => {
      const elems = seuls ? Array.from({ length: g.nbB }, (_, b) => x0 + s + (b + 1) * g.vide + b * s + s / 2)
        : Array.from({ length: n - 1 }, (_, i) => x0 + s + (i + 1) * (g.w + s) - s / 2);
      const pris = [];
      for (let j = 1; j <= kPattes; j++) {
        const cible = x0 + g.Lc * j / (kPattes + 1);
        const libres = elems.filter((x) => !pris.includes(x));
        if (!libres.length) return null;
        pris.push(libres.reduce((a, c) => (Math.abs(c - cible) < Math.abs(a - cible) ? c : a)));
      }
      return pris.sort((a, b) => a - b);
    })();
    const xPattes = xsPattes || [];
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
    if (Dec) normeDecorGC(R, Dec);
    else {
    if (g.ok && g.dMax > g.limite - 10) R.notes.push(`Trous : ${mmTxt(g.dMax)} mm pour ${g.limite - MARGE_BOULE} au maximum (la boule de la norme, ${g.limite}, moins ${MARGE_BOULE} mm de marge de fabrication). C'est juste : la norme ne tolère aucun millimètre de plus.`);
    if (g.ok) R.oks.push(`Trous : le plus grand cercle fait Ø ${mmTxt(g.dMax)} mm${v.nb > 0 || seuls ? `, vide entre barreaux ${fmt(g.vide, 1)} mm` : ""} (boule de ${g.limite} mm à cet endroit, ${MARGE_BOULE} mm de marge comprise : ${g.limite === SPHERE ? "le trou commence sous 800 mm du sol" : "tout le trou est au-dessus de 800 mm du sol"}) : elle ne passe pas.`);
    else R.alertes.push(`Trous : ${mmTxt(g.dMax)} mm (cercle rouge). À cet endroit, une boule de ${g.limite} mm ne doit pas passer : l'atelier exige moins de ${g.limite - MARGE_BOULE} mm (${MARGE_BOULE} mm de marge de fabrication), pas aux normes.` +
      (nMin ? ` Solution : ${nMin} croix sur cette largeur.` : "") + (bMin ? ` Ou ${bMin} barreaux par panneau (réglage « Barreaux »).` : "") +
      (tOk ? `${nMin || bMin ? " Ou" : " Solution :"} une traverse au milieu ${n > 1 ? "de chaque croix" : "de la croix"} (Options, « Traverse au milieu »).` : ""));
    }
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
    } else if (Dec) { if (!Dec.N.appui) R.oks.push(Dec.escalade ? "Escalade : le décor est au-dessus d'un socle de barreaux serrés (rien à quoi poser le pied sous 600 mm), contrôlé sur le dessin." : "Escalade : tout le garde-corps est au-dessus de 600 mm du sol."); }
    else if (seuls) R.oks.push(`Escalade : seulement des barreaux verticaux, rien à quoi poser le pied (${g.nbB} barreaux, vides de ${fmt(g.vide, 1)} mm).`);
    else R.oks.push("Escalade : tout le garde-corps est au-dessus de 600 mm du sol.");
    if (v.traverse) {
      const zT = g.zBas + g.h / 2 + s / 2;
      if (zT >= Z_ESCALADE) R.oks.push(`Traverse du milieu : son dessus est à ${mmTxt(zT)} mm du sol, plus haut que 600 mm. Pour la norme, ce n'est pas une marche : la hauteur à respecter ne change pas.`);
      else R.alertes.push(`Escalade : le dessus de la traverse du milieu est à ${mmTxt(zT)} mm du sol. Sous 600 mm, un enfant peut y poser le pied : pas aux normes. Enlève la traverse.`);
    }
    if (!seuls && v.sbMode === "toujours" && !g.sb) R.notes.push(`Barreaux en bas : pas assez de hauteur (cadre de ${mmTxt(g.Hc)} mm), les croix seraient trop plates. Garde-corps dessiné avec les croix seules.`);
    const Ih = s ** 4 / 12 + (renfort ? v.eRf * v.lRf ** 3 / 12 : 0);
    const Wh = renfort ? Ih / (Math.max(s, v.lRf) / 2) : s * s * s / 6;
    const Lm = g.Lc / 1000;
    const appuis = [x0, ...xPattes, -x0].map((x) => x / 1000), travees = appuis.slice(1).map((x, i) => x - appuis[i]);
    const Ms = new Array(appuis.length).fill(0);
    if (xPattes.length) {
      const m = xPattes.length, A = [], b = [];
      for (let j = 1; j <= m; j++) {
        const lg = travees[j - 1], ld = travees[j], row = new Array(m).fill(0);
        row[j - 1] = 2 * (lg + ld); if (j > 1) row[j - 2] = lg; if (j < m) row[j] = ld;
        A.push(row); b.push(0.9 * (lg ** 3 + ld ** 3) / 4);
      }
      for (let i = 0; i < m; i++) for (let r = i + 1; r < m; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < m; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
      for (let i = m - 1; i >= 0; i--) { let t = b[i]; for (let c = i + 1; c < m; c++) t -= A[i][c] * Ms[c + 1]; Ms[i + 1] = t / A[i][i]; }
    }
    const reactions = new Array(appuis.length).fill(0);
    let Mmax = Math.max(...Ms);
    travees.forEach((l, i) => {
      const g0 = 0.9 * l / 2 + (Ms[i] - Ms[i + 1]) / l, d0 = 0.9 * l / 2 + (Ms[i + 1] - Ms[i]) / l;
      reactions[i] += g0; reactions[i + 1] += d0;
      Mmax = Math.max(Mmax, g0 * g0 / 1.8 - Ms[i]);
    });
    const RA = reactions[0], RC = reactions[reactions.length - 1], RB = xPattes.length ? Math.max(...reactions.slice(1, -1)) : 0;
    const l2 = xPattes.length ? 1 : 0;
    const sigma = Mmax * 1e6 / Wh;
    const lisseTxt = (renfort ? `la lisse haute renforcée (carré de ${s} + plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)})` : `la lisse haute en carré de ${s}`) + (xPattes.length ? `, tenue par ${xPattes.length > 1 ? `${xPattes.length} pattes` : "la patte"}` : "");
    const peutRenfort = !renfort && !acier && !profilMC && v.mc > 0 && g.Lc <= RENFORT.LcMax;
    if (renfort && g.Lc > RENFORT.LcMax) R.alertes.push(`Solidité : ${mmTxt(g.Lc)} mm de large. Au-delà de ${mmTxt(RENFORT.LcMax)} mm, le plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)} n'est plus garanti (flèche, déversement, fixations) : il faut une note de calcul.`);
    else if (sigma > LIMITE_ACIER) R.alertes.push(`Solidité : ${lisseTxt} travaille à ${mmTxt(sigma)} MPa (limite ${LIMITE_ACIER}). Trop faible : ${renfort ? "il faut une note de calcul" : `prends un carré plus gros${peutRenfort ? `, ou ajoute le renfort (plat ${RENFORT.l} × ${RENFORT.e} sous la main courante bois)` : ""}`}.`);
    else if (sigma > 0.8 * LIMITE_ACIER) R.notes.push(`Solidité : ${lisseTxt} travaille à ${mmTxt(sigma)} MPa, pour ${LIMITE_ACIER} au maximum. C'est à la limite : ${renfort ? "une note de calcul" : s < 20 ? "un carré de 20 ou une note de calcul" : "le renfort (plat sous la main courante) ou une note de calcul"}.`);
    else R.oks.push(`Solidité : ${renfort ? "lisse haute renforcée" : "lisse haute"} à ${mmTxt(sigma)} MPa (limite ${LIMITE_ACIER}).`);
    if (renfort) {
      const fleche = 5 * 0.6 * (1000 * Math.max(...travees)) ** 4 / (384 * E_ACIER * Ih);
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
      if (v.mur) {
        const F = fixationMurGC({ mur: v.mur, c: v.cMur, s, LmF, y0: v.ass === "onglet" ? 0 : s, yH: g.Hr, P: Math.max(RA, RC), eF: v.eF, eMur: v.eMur });
        R.fixation = F;
        const msg = `Fixation dans le mur (${F.nomMur}) : ${F.texte}`;
        if (F.statut === "etude") R.alertes.push(msg);
        else if (F.statut === "essais" || F.statut === "indicatif") R.notes.push(msg);
        else R.oks.push(msg);
      } else if (dF > 0) {
        const Vd = Math.max(RA, RC), k = 1 + aF / dF, haute = Vd * k;
        const tropTire = xPattes.length ? k > 2 && haute > HAUTE_PATTE : renfort && k > 2;
        if (tropTire) R.alertes.push(`Fixation : les perçages d'un montant ne sont écartés que de ${mmTxt(dF)} mm. Sur une fenêtre de ${mmTxt(g.Lc)} mm, la vis du haut reprendrait ${mmTxt(haute * 100)} kg : trop pour un mur. Solution : une ou plusieurs pattes scellées dans l'appui (Options, « Pattes »), un garde-corps plus haut (un bas de fenêtre plus bas) ou une note de calcul.`);
        else if (renfort || haute > 1) R.notes.push(`Fixation : chaque côté reprend ${mmTxt(Vd * 100)} kg de poussée, dont ${mmTxt(haute * 100)} kg sur la vis du haut. À justifier selon le mur : scellement chimique ; dans le tuffeau ou un mur creux, essai d'arrachement sur place.`);
      }
    }
    if (kPattes) {
      const nomP = kPattes > 1 ? `Pattes (${kPattes})` : "Patte";
      if (!xsPattes) R.alertes.push(`Patte impossible : ${kPattes} patte${kPattes > 1 ? "s" : ""} demandée${kPattes > 1 ? "s" : ""}, mais pas assez de ${seuls ? "barreaux" : "montants (il faut plus de croix)"} pour les souder dessous.`);
      else {
        const W = s ** 3 / 6, sigM = RB * 1000 * g.Hr / W, sigP = RB * 1000 * (g.Hr + v.jour) / W;
        if (Math.max(sigM, sigP) > LIMITE_ACIER) R.alertes.push(`Patte au milieu : la plus chargée reprend ${mmTxt(RB * 100)} kg ; en carré de ${s}, elle travaille à ${mmTxt(sigP)} MPa dans l'appui (limite ${LIMITE_ACIER}). Trop faible : une patte de plus, ou un carré plus gros.`);
        else R.oks.push(`${nomP} scellée${kPattes > 1 ? "s" : ""} dans l'appui, en carré de ${s} : la plus chargée reprend ${mmTxt(RB * 100)} kg ; ${seuls ? "barreau" : "montant"} à ${mmTxt(sigM)} MPa, patte à ${mmTxt(sigP)} MPa (limite ${LIMITE_ACIER}). Calcul simplifié.`);
        R.notes.push(`${nomP} en carré de ${s}, scellée${kPattes > 1 ? "s" : ""} de ${PATTE.scel} mm dans l'appui (trou Ø ${s + 2}, scellement chimique). L'appui doit être sain et faire au moins ${PATTE.scel + 20} mm d'épaisseur ; dans le tuffeau, essai d'arrachement sur place.`);
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
    for (const xp of xPattes) {
      F.push({ t: "poly", piece: "Pattes de scellement", cls: "t-acier-plein", pts: rect(xp - s / 2, v.A, xp + s / 2, y0) });
      F.push({ t: "poly", cls: "t-cache", pts: rect(xp - s / 2, v.A - PATTE.scel, xp + s / 2, v.A) });
    }
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
      if (Dec) F.push(...Dec.F);
      else if (seuls) for (let b = 1; b <= g.nbB; b++) { const bx = px + b * g.vide + (b - 1) * s; F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: rect(bx, py, bx + s, py + g.h) }); }
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
        (Dec ? Dec.trous : g.trous).forEach((x) => { const k = v.traverse ? `${Math.round(x.d)}|${x.ok}` : Math.round(x.d); if (!vus.has(k)) { vus.add(k); ronds.push({ c: [px + x.c[0], py + x.c[1]], d: x.d, ok: x.ok }); } });
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
    if (R.fixation && R.fixation.statut !== "etude" && R.fixation.points.length) {
      const fxC = R.fixation, avecPlatine = fxC.mode !== "tige", xFront = -ep / 2 + s / 2;
      for (const pt of fxC.points) {
        const yW = y0 + pt.y, xT = avecPlatine ? -ep / 2 - 35 : -ep / 2;
        const sansPlatineEnBas = fxC.mur === "beton" && pt === fxC.points[0];
        if (avecPlatine && !sansPlatineEnBas) C.push({ t: "poly", piece: "Platines de fixation", cls: "t-acier-plein", pts: rect(xT - 25, yW - 22, xFront, yW + 22) });
        C.push({ t: "cercle", cls: "t-trou-plan", c: [sansPlatineEnBas ? -ep / 2 : xT, yW], r: fxC.mode === "tige" || fxC.mur === "beton" || fxC.mur === "parpaing" ? 4.5 : 6 });
      }
      const ptH = fxC.points[fxC.points.length - 1];
      C.push({ t: "texte", p: [-ep / 2 - 60, y0 + ptH.y + 40], txt: `${fxC.nomMur} : 1re tige à ${mmTxt(fxC.c)} mm de l'arête du mur nu`, pos: "sur" });
    }
    if (xPattes.length) {
      C.push({ t: "poly", piece: "Pattes de scellement", cls: "t-acier-plein", pts: rect(-ep / 2 - s / 2, v.A, -ep / 2 + s / 2, y0) });
      C.push({ t: "poly", cls: "t-cache", pts: rect(-ep / 2 - s / 2, v.A - PATTE.scel, -ep / 2 + s / 2, v.A) });
    }
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
    const fx = R.fixation && R.fixation.statut !== "etude" ? R.fixation : null;
    const tigeMontant = fx && (fx.mode === "tige" || (fx.mode === "platine" && fx.mur === "beton"));
    const percMontant = !fx ? `${v.nF} perçages Ø ${fmt(v.dF, 1)} fraisés Ø ${fmt(v.fF, 1)}`
      : fx.mode === "tige" ? "2 trous droits Ø 9 (tiges M8 scellées dans le mur)"
      : tigeMontant ? "1 trou droit Ø 9 en bas ; platine soudée en haut"
      : "sans perçage : platines soudées (voir « Platines de fixation »)";
    const dessinRive = (pts, L) => (tigeMontant ? dessinMontantRive(pts, L, { ...v, dF: 9, fF: 9 }) : fx ? profil(pts) : dessinMontantRive(pts, L, v));
    if (v.ass === "onglet") {
      R.debit.push({ nom: "Traverses du cadre (haut et bas)", qte: 2, mat, long: g.Lc, coupes: "Onglets à 45° aux 2 bouts", note: "Mesuré à l'extérieur", dessin: profil([[0, 0], [g.Lc, 0], [g.Lc - s, s], [s, s]]) });
      R.debit.push({ nom: "Montants de rive du cadre", qte: 2, mat, long: g.Hc, coupes: `Onglets à 45° aux 2 bouts · ${percMontant}`, note: "Mesuré à l'extérieur", dessin: dessinRive([[0, 0], [g.Hc, 0], [g.Hc - s, s], [s, s]], g.Hc) });
      morceaux.push({ qte: 2, long: g.Lc }, { qte: 2, long: g.Hc });
    } else {
      R.debit.push({ nom: "Traverses du cadre (haut et bas)", qte: 2, mat, long: g.Lc, coupes: "Coupes droites", note: "Filantes", dessin: profil(rectPts(g.Lc, s)) });
      R.debit.push({ nom: "Montants de rive du cadre", qte: 2, mat, long: g.Hc - 2 * s, coupes: `Coupes droites · ${percMontant}`, note: v.traverse ? "Entre les traverses du cadre" : "Entre les traverses", dessin: dessinRive(rectPts(g.Hc - 2 * s, s), g.Hc - 2 * s) });
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
    if (Dec) debitDecorGC(R, Dec, morceaux, s);
    else if (seuls) { R.debit.push({ nom: "Barreaux", qte: g.nbB, mat, long: g.h, coupes: `Coupes droites · vides égaux de ${fmt(g.vide, 1)} mm`, note: "Entre la traverse haute et la traverse basse", dessin: profil(rectPts(g.h, s)) }); morceaux.push({ qte: g.nbB, long: g.h }); }
    if (v.nb > 0) { R.debit.push({ nom: "Barreaux", qte: v.nb * n, mat, long: g.h, coupes: `Coupes droites · vides égaux de ${mmTxt(g.vide)} mm`, note: g.sb ? "Entre la lisse intermédiaire et la traverse haute" : v.traverse ? "Entre les traverses du cadre" : "Entre les traverses", dessin: profil(rectPts(g.h, s)) }); morceaux.push({ qte: v.nb * n, long: g.h }); }
    if (profilMC) R.debit.push({ nom: "Main courante", qte: 1, mat: `Main courante acier profilée ${MC_PROFIL.l} × ${MC_PROFIL.h}, rainure ${MC_PROFIL.r}`, long: g.Lc, coupes: "Coupes droites, emboîtée sur la traverse haute, soudée par points dessous", note: "Achetée en barre", dessin: dessinMainCourante(g.Lc, v) });
    else if (v.mc > 0 && acier) R.debit.push({ nom: "Main courante", qte: 1, mat: `Plat acier ${mmTxt(v.lMc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: "Coupes droites, soudée à plat sur la traverse haute", note: "Arêtes cassées", dessin: profil(rectPts(g.Lc, v.mc)) });
    else if (v.mc > 0 && renfort) {
      R.debit.push({ nom: "Plat de renfort de la lisse haute", qte: 1, mat: `Plat acier ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)}`, long: g.Lc, coupes: `Coupes droites · ${nVisMc} trous Ø ${fmt(RENFORT.visD + 0.5, 1)} fraisés dessous, en quinconce à ${fmt((s / 2 + v.lRf / 2) / 2, 0)} mm de l'axe, tous les ${RENFORT.pasVis} mm environ (à percer avant de souder) · soudé à plat, centré sur la traverse haute, cordon continu des deux côtés`, note: "Il tient la poussée sur la main courante : ne pas le supprimer ni le raccourcir", dessin: profil(rectPts(g.Lc, v.eRf)) });
      R.debit.push({ nom: "Main courante", qte: 1, mat: `${{ chene: "Chêne", hetre: "Hêtre", pin: "Pin", noyer: "Noyer" }[v.essence || "chene"]} massif ${mmTxt(v.lMc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: "Dessous plan, sans rainure · arêtes arrondies (R 6 dessus, R 2 dessous), poncée, huilée", note: "Posée sur le plat de renfort · vissée par dessous à travers le plat", dessin: dessinMainCourante(g.Lc, v) });
      R.debit.push({ nom: `Vis du bois Ø ${RENFORT.visD} × ${RENFORT.visL} inox à tête fraisée`, qte: nVisMc, mat: "À acheter", long: 0, coupes: "Par dessous, à travers le plat de renfort", note: "Avant-trou Ø 3 dans le bois" });
    }
    else if (v.mc > 0) R.debit.push({ nom: "Main courante", qte: 1, mat: `${{ chene: "Chêne", hetre: "Hêtre", pin: "Pin", noyer: "Noyer" }[v.essence || "chene"]} massif ${mmTxt(v.mc)} × ${mmTxt(v.mc)}`, long: g.Lc, coupes: rain ? `Rainure dessous ${(Number.isInteger(v.lR) ? mmTxt(v.lR) : fmt(v.lR, 1))} × ${mmTxt(v.chev)} de profondeur, sur toute la longueur · arêtes arrondies (R 6 dessus, R 2 dessous), poncée, huilée` : "Arêtes arrondies (R 6 dessus, R 2 dessous), poncée, huilée", note: rain ? "Emboîtée sur la lisse haute · collage PU ou vis par-dessous à travers la lisse" : "Fixation sur le cadre : à définir", dessin: dessinMainCourante(g.Lc, v) });
    if (v.rosace !== false) R.debit.push({ nom: `Rosaces Ø ${mmTxt(2 * rosaceR(v))}`, qte: n, mat: "Achetées", long: 0, coupes: "1 au centre de chaque croix", note: "" });
    if (xPattes.length) {
      const k = xPattes.length;
      R.debit.push({ nom: `Patte${k > 1 ? "s" : ""} de scellement`, qte: k, mat, long: v.jour + PATTE.scel, coupes: `Coupe droite · soudée${k > 1 ? "s" : ""} sous ${k > 1 ? `${k} ${seuls ? "barreaux" : "montants"}` : `le ${seuls ? "barreau" : "montant"} du milieu`}`, note: `Scellée${k > 1 ? "s" : ""} de ${PATTE.scel} mm dans l'appui : trou Ø ${s + 2}, scellement chimique` });
      morceaux.push({ qte: k, long: v.jour + PATTE.scel });
      R.debit.push({ nom: "Scellement chimique (cartouche)", qte: 1, mat: "À acheter", long: 0, coupes: `Pour ${k > 1 ? `les ${k} pattes` : "la patte"}`, note: "Résine pour pierre tendre (tuffeau)" });
    }
    if (fx) {
      for (const pl of fx.plaques) R.debit.push({ nom: "Platines de fixation", qte: pl.qte, mat: `Plat acier ${pl.W} × ${pl.E}`, long: pl.L, coupes: `${pl.role} · ${pl.trous.length} trou${pl.trous.length > 1 ? "s" : ""} Ø ${pl.d}`, note: `Soudées derrière les montants de rive (côté fenêtre), posées à plat sur le mur nu · 1re tige à ${mmTxt(fx.c)} mm de l'arête`, dessin: plaque(rectPts(pl.L, pl.W), pl.trous.map((c) => ({ c, d: pl.d })), { note: "tiges inox" }) });
      fx.achats.forEach((a, n) => R.debit.push({ nom: a.nom, qte: a.qte, mat: "À acheter", long: 0, coupes: "", note: n ? "" : `Fixation dans le mur (${fx.nomMur})` }));
    } else R.debit.push({ nom: `Vis ou goujons Ø ${fmt(v.dF - 0.5, 0)} à tête fraisée + chevilles`, qte: 2 * v.nF, mat: "À acheter (longueur selon le mur)", long: 0, coupes: `${v.nF} par montant de rive`, note: "Mur plein : cheville nylon · mur creux ou ancien : scellement chimique" });

    const b = barres(morceaux, v.trait, 0);
    const metres = morceaux.reduce((x, m) => x + m.qte * m.long, 0) / 1000;
    const kg = metres * s * s * 7.85e-3 + (profilMC ? MC_PROFIL.kg * g.Lc / 1000 : acier ? v.lMc * v.mc * g.Lc / 1e9 * 7850 : (renfort ? v.lMc : v.mc) * v.mc * g.Lc / 1e9 * 700)
      + (renfort ? v.lRf * v.eRf * g.Lc / 1e9 * 7850 : 0)
      + (fx ? fx.plaques.reduce((t, pl) => t + pl.qte * pl.L * pl.W * pl.E / 1e9 * 7850, 0) : 0);
    R.kg = kg; R.metres = metres; R.hauteurGC = g.Hr;
    if (Dec) { R.kg += Dec.kgDecor; R.decor = Dec.chiffre; R.decorNom = Dec.nom; R.decorFinitions = Dec.fin; }
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
      Dec ? ["Décor", Dec.nom] : seuls ? ["Barreaux", `${g.nbB}`] : ["Croix", `${n}${v.nP >= 1 ? "" : " (auto)"}`],
    ];
    R.notes.push(`Hauteur retenue : ${mmTxt(g.Hr)} mm, main courante comprise (${v.Hs >= MINI_GC ? "voulue par le client" : `calculée pour que la main courante arrive à ${mmTxt(g.cible)} mm du sol${v.etage ? "" : " ; au rez-de-chaussée ce n'est pas obligatoire, tu peux taper une hauteur plus basse"}`}).`);
    if (renfort) R.notes.push(`Main courante ${mmTxt(v.lMc)} × ${mmTxt(v.mc)} sur plat ${mmTxt(v.lRf)} × ${mmTxt(v.eRf)} : le cadre est plus bas de ${mmTxt(v.mc + v.eRf - (vEntree.mc - (mainCouranteGC({ ...vEntree, renfort: "sans" }).chev || 0)))} mm qu'avec la main courante de ${mmTxt(vEntree.mc)}, le dessus reste à la même hauteur.`);
    R.notes.push(Dec ? Dec.note : seuls ? `Barreaux verticaux seuls : ${g.nbB} barreaux soudés entre la traverse haute et la traverse basse, vides égaux de ${fmt(g.vide, 1)} mm. Pas de croix ni de rosace.` : v.traverse ? "Chaque croix : une diagonale entière et deux demi-diagonales soudées contre elle. Au milieu, deux demi-traverses vont du montant jusqu'au centre : leur bout en pointe rentre entre les diagonales." : "Chaque croix : une diagonale entière et deux demi-diagonales soudées contre elle.");
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
    const carres = [...new Set([v.s, 16, 18].filter((x) => x >= v.s && x <= 18))];
    const croix = v.seuls ? [1] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], barreaux = v.seuls ? [0] : [0, 1, 2, 3, 4];
    const rf0 = v.renfort === "plat" ? "plat" : "sans";
    const tropSouple = v.mcType === "bois" && calculerGC({ ...v, s: 18, renfort: "sans", _rapide: true }).alertes.some((a) => a.startsWith("Solidité"));
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
    const fxB = R.fixation && R.fixation.statut !== "etude" ? R.fixation : null;
    const vDetailB = fxB ? { ...v, dF: 9, fF: 9 } : v;
    if (mR && v.nF && !apercu && fxB && fxB.mode !== "tige") {
      const x0 = oxC + bc.w / k + 26, y0 = oyF - Math.max(bf.h / k, 40);
      const lignes = [];
      for (const t of [fxB.nomMontage, fxB.trou, `1re tige à ${mmTxt(fxB.c)} mm de l'arête du mur nu · tout en inox A4`, fxB.statut === "essais" ? "sous réserve d'essais du mur, avant la fabrication" : "valeur calculée, à confirmer par le fabricant de la résine"]) {
        let l = "";
        for (const mot of String(t).split(" ")) { if ((l + " " + mot).length > 62 && l) { lignes.push(l); l = mot; } else l = l ? l + " " + mot : mot; }
        if (l) lignes.push(l);
      }
      titre(x0, y0 + 4, "DÉTAIL B", " - FIXATION", `selon le mur : ${fxB.nomMur} · voir « Platines de fixation » au débit`);
      lignes.forEach((t, n) => { out += T(x0, y0 + 12 + n * 3.4, t, { t: 2.3, a: "start" }); });
    } else if (mR && v.nF && !apercu) {
      const v = vDetailB;
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
      out += T(x0 + s / kd + 16, y0 + 12, `${posF.length} ${fxB ? "trous droits" : "perçages"} Ø ${fmt(v.dF, 1)} traversants par montant`, { t: 2.3, a: "start" });
      out += T(x0 + s / kd + 16, y0 + 15.5, fxB ? `tiges M8 inox scellées dans le mur (${fxB.nomMur})` : `fraisés à 90°, Ø ${fmt(v.fF, 1)}, côté intérieur`, { t: 2.3, a: "start" });
      out += T(x0 + s / kd + 16, y0 + 19, fxB ? `résine fischer FIS V Plus, écrou borgne inox` : `vis ou goujon à tête fraisée + cheville dans le tableau`, { t: 2.3, a: "start" });
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
        decorActif(v) ? `Garde-corps forgé à volutes : ${R.decorNom || DECOR_NOMS[v.decor]}` : v.seuls ? "Garde-corps de fenêtre à barreaux droits" : `Garde-corps de fenêtre, ${v.nP} croix de Saint-André${v.traverse ? " avec traverse" : ""}`,
        `Largeur entre tableaux : ${mmTxt(v.B)} mm`,
        `Bas de fenêtre à ${mmTxt(v.A)} mm du sol`,
        `Hauteur du garde-corps : ${mmTxt(R.hauteurGC)} mm, main courante comprise`,
        `Acier carré plein ${v.s} × ${v.s} mm`,
        `Main courante : ${mcTxt}`,
        (() => { const p = R.debit.find((d) => /^Pattes? de scellement/.test(d.nom)); return p ? `${p.qte > 1 ? `${p.qte} pattes` : "Une patte"} en carré ${v.s} × ${v.s}, scellée${p.qte > 1 ? "s" : ""} dans l'appui` : ""; })(),
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
      ["PROJET", modele === "gardeCorps" ? decorActif(v) ? `Garde-corps à volutes : ${DECOR_NOMS[v.decor]}` : v.seuls ? "Garde-corps à barreaux droits" : `Garde-corps ${v.rosace === false ? "à croix" : "rosace à croix"}${v.traverse ? " et traverse" : ""}` : NOMS[modele]], ["DATE", infos.date || ""],
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
  plat12Max: 250,
  cimier: [150, 300],
  coinMax: 0.3,
  jeuBande: 3,
};
const MT_CHOIX = {
  assemblage: ["barreaux", "entre", "frise", "anneaux", "hauteur", "coeurs", "medaillon", "applique", "coins", "cimier", "appliquePlein"],
  forme: ["C", "S", "J", "coeur", "doubleC", "poste", "anneau"],
  bouts: ["droit", "effile", "bouton"],
  liaison: ["soudure", "colliers"],
  barreaux: ["carre", "torsade", "bagues"],
  friseBasse: ["aucune", "postes"],
  pointes: ["aucune", "lance"],
  pos: ["haut", "milieu", "bas"],
  rythme: ["tous", "unSurDeux", "alterne"],
};
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
const MT_CATALOGUE = [];   // vidé dans le code public : le garde-corps du site n'a pas de mode catalogue
const MT_SECTIONS = { "12×6": { b: 12, e: 6 }, "16×8": { b: 16, e: 8 } };
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
  for (let i = 0; i < n; i++) {
    const p = t[Math.max(0, i - 1)], q = t[Math.min(n - 1, i + 1)], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, h = demi(L[i]);
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
    if (e.forme !== forme || e.parMetre) continue;
    const sMax = Math.min(1 + R, (lim.hMax || Infinity) / e.h, (lim.lMax || Infinity) / e.l);
    if (sMax < 1 - R) continue;
    const s0 = lim.viserL ? lim.viserL / e.l : lim.viser ? lim.viser / e.h : 1, s = Math.max(1 - R, Math.min(sMax, s0));
    const note = lim.viserL ? mtNoteRef(e, s, assemblage, e.l * s, lim.viserL) : mtNoteRef(e, s, assemblage, e.h * s, lim.viser || e.h);
    if (!best || note < best.note - 1e-9) best = { e, s, note };
  }
  return best;
}
function mtRefVides(forme, assemblage, W, B, hMax, viser = hMax, pair = false) {
  const R = MT_ATELIER.reprise, J = MT_ATELIER.jeuCatalogue; let best = null;
  for (const e of MT_CATALOGUE) {
    if (e.forme !== forme || e.parMetre) continue;
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
const mtRefPoste = () => MT_CATALOGUE.find((e) => e.forme === "poste");
function mtRefus(q, quoi, raison) { if (!(q.refus || []).some((r) => r.raison === raison)) q.refus = (q.refus || []).concat({ quoi, raison }); }
const mtSansRef = (forme, assemblage) => `${MT_NOMS[forme] || forme} : aucune référence du catalogue ne va ${assemblage === "entre" ? "entre ces barreaux" : "à cette place"} (reprise au gabarit de ±10 % au plus). Choisissez une autre forme.`;
const mtSym = (i, n) => (n ? Math.min(i, n - 1 - i) : i);
const mtDroite = (i, n) => (n ? i > (n - 1) / 2 : false);
const mtSens = (i, n, alterne = true) => (n ? (alterne && mtSym(i, n) % 2 === 1) !== mtDroite(i, n) : alterne && i % 2 === 1);
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
function mtBarreaux(z, a, b, F, pieces, q, ch, vmax, y0, y1, pair = false) {
  if (z.lib) return z.lib;
  vmax = Math.min(vmax || z.vide || MT_ATELIER.vide, z.videMax || Infinity);
  const B = z.barreau || MT_ATELIER.barreau, n0 = Math.max(0, Math.ceil((b - a - vmax) / (B + vmax))), n = pair && n0 % 2 === 0 ? n0 + 1 : n0, v = (b - a - n * B) / (n + 1);
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
    Object.assign(p, { ref: e.ref, fournisseur: e.fournisseur, prixCle: e.prixCle, section: e.section, h: e.h, l: e.l, reprise: Math.round((cat.s - 1) * 1000) / 10, nbAchat: e.nbAchat || 1 });
    if (e.parMetre) p.parMetre = true;
    p.coupes = Math.abs(cat.s - 1) < 0.005 ? "Achetée, posée telle quelle" : `Achetée, reprise au gabarit (${cat.s > 1 ? "+" : ""}${String(p.reprise).replace(".", ",")} %)`;
    q.commandes = q.commandes || {};
    const c = q.commandes[cle] || (q.commandes[cle] = { ref: e.ref, fournisseur: e.fournisseur, forme: e.forme, h: e.h, l: e.l, section: e.section, prixCle: e.prixCle, qte: 0 });
    c.qte += e.nbAchat || 1;
  }
  q.fab = q.fab || { achat: 0, forge: 0 }; q.fab[fab]++;
  q.volutes = q.volutes || {}; q.volutes[forme] = (q.volutes[forme] || 0) + 1;
  q.longueurVolutes = (q.longueurVolutes || 0) + longueur;
  return true;
}
function mtLien(F, pieces, q, ch, r, soude = false) {
  q.liens = q.liens || [];
  if (q.liens.some((l) => Math.abs(l[0] - r[0]) < 3 && Math.abs(l[1] - r[1]) < 12)) return;
  q.liens.push(r);
  if (ch.liaison !== "colliers" || soude) { q.soudures = (q.soudures || 0) + 1; return; }
  const [x, y, w, h] = r, C = MT_ATELIER.collier;
  mtPoly(F, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], "Colliers", ch.dore ? "or" : "collier");
  pieces.push({ nom: "Collier", mat: `Fer plat ${C.b} × ${C.e}`, long: 2 * (Math.max(w, h) + 20) + 2 * MT_ATELIER.volute.b, kgM: mtKgM(C.b, C.e), peri: 2 * (C.b + C.e), coupes: "Coupe droite, serré à chaud", note: "", groupe: "Décor" });
  q.colliers = (q.colliers || 0) + 1;
}
function mtLiens(m, cotes, a, c, F, pieces, q, ch, B = MT_ATELIER.barreau, z = null) {
  const pts = m.flat(), H = MT_ATELIER.collier.h, e = MT_ATELIER.epVue + 4;
  const g = pts.reduce((r, p) => (p[0] < r[0] ? p : r)), d = pts.reduce((r, p) => (p[0] > r[0] ? p : r));
  const h = pts.reduce((r, p) => (p[1] > r[1] ? p : r)), b = pts.reduce((r, p) => (p[1] < r[1] ? p : r));
  if (cotes.includes("g")) mtLien(F, pieces, q, ch, [a - B - e, g[1] - H / 2, B + 2 * e, H], !!z && Math.abs(a - z.x0) < 0.5);
  if (cotes.includes("d")) mtLien(F, pieces, q, ch, [c - e, d[1] - H / 2, B + 2 * e, H], !!z && Math.abs(c - z.x1) < 0.5);
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
    const B = z.barreau || MT_ATELIER.barreau;
    const lu = mtLuAxe(z), cat = ch.catalogue && !z.lib ? mtRefVides(ch.forme, "entre", z.x1 - z.x0, B, Math.min(MT_ATELIER.voluteMax, mtHauteurMin(z) - 8), undefined, lu) : null;
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
      let m = mtCaser(traits, a + 1, y, c - a - 2, h, ch.pos === "bas" ? "bas" : ch.pos === "milieu" ? "centre" : "haut", mtSens(i, nL));
      if (courbe && ch.pos === "haut") m = mtContreHaut(m, z.haut, 4);
      if (mtVolute(m, forme, F, pieces, q, ch, false, k)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
    });
  },
  frise: (z, ch, F, pieces, q) => {
    if (ch.forme === "poste" && Math.abs((z.haut(z.x1) - z.haut(z.x0)) / (z.x1 - z.x0)) > 0.05) {
      ch = { ...ch, forme: "S" }; q.notes = (q.notes || []).concat("Frise de postes impossible sur une rampe : frise de S à la place.");
    }
    const lance = ch.pointes === "lance" && z.pointes, courbe = mtCourbe(z), B = z.barreau || MT_ATELIER.barreau, R = MT_ATELIER.reprise, J = MT_ATELIER.jeuBande;
    if (lance && ch.forme !== "poste") {
      const hF = MT_ATELIER.frise;
      const lu = mtLuAxe(z), cat = ch.catalogue ? mtRefVides(ch.forme, "frise", z.x1 - z.x0, B, hF - 6, undefined, lu) : null;
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
    const B = z.barreau || MT_ATELIER.barreau, esc = z.norme && z.norme.escalade;
    const lu = mtLuAxe(z), cat = ch.catalogue && !esc ? mtRefVides(ch.forme, "hauteur", z.x1 - z.x0, B, mtHauteurMin(z) - 4, MT_ATELIER.voluteMax, lu) : null;
    const lib = mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : z.norme && z.norme.escalade ? 0 : z.videGrille || MT_ATELIER.videGrille, undefined, undefined, lu), f = mtForme(ch.forme), bb = mtBoite(f);
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
      const n = Math.max(1, Math.round((yh - yb) / h1)), ph = (yh - yb) / n;
      for (let k = 0; k < n; k++) {
        const forme = mtFormeN(ch, mtSym(i, nL) + k);
        const m = mtCaser(forme === ch.forme ? f : mtForme(forme), a + 1, yb + k * ph + 1, c - a - 2, ph - 2, "centre", mtSens(i, nL) !== (k % 2 === 1));
        if (mtVolute(m, forme, F, pieces, q, ch)) mtLiens(m, "gd", a, c, F, pieces, q, ch, z.barreau, z);
      }
    });
  },
  anneaux: (z, ch, F, pieces, q) => {
    const B = z.barreau || MT_ATELIER.barreau, cat = ch.catalogue ? mtRefVides("anneau", "anneaux", z.x1 - z.x0, B, Infinity, 100) : null;
    const lib = mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : undefined), v = lib[0][1] - lib[0][0], L = MT_ATELIER.lisseFrise;
    if (ch.catalogue && !cat) { mtRefus(q, MT_NOMS.anneau, mtSansRef("anneau", "anneaux")); return; }
    const yL = (x) => z.haut(x) - v - 2, courbe = mtCourbe(z);
    mtLisse(z, yL, F, pieces, ch, "Lisse de frise");
    lib.forEach(([a, c], i) => {
      if (mtSaute(ch, i, lib.length)) return;
      const { yb, yh } = mtCase(yL, z.haut, a, c);
      let m = mtCaser(mtForme("anneau"), a + 1, yb + 1, c - a - 2, cat ? cat.e.h * cat.s : yh - yb - 2);
      if (courbe || cat) m = mtDansBande(m, yL, z.haut, 1, 1, cat ? (1 - MT_ATELIER.reprise) / cat.s : 0.5);
      if (mtVolute(m, "anneau", F, pieces, q, ch, false, cat)) mtLiens(m, "gdhb", a, c, F, pieces, q, ch, z.barreau, z);
    });
    void L;
  },
  coeurs: (z, ch, F, pieces, q) => {
    const B = z.barreau || MT_ATELIER.barreau, v0 = z.vide || MT_ATELIER.vide;
    if (!ch.variante) {
      const hz = ch.catalogue ? mtHauteurMin(z) - 10 : 0;
      const cat = ch.catalogue ? mtRefVides("coeur", "coeurs", z.x1 - z.x0, B, hz, Math.min(hz, 1.4 * (2 * v0 + B))) : null;
      if (ch.catalogue && !cat) { mtRefus(q, MT_NOMS.coeur, mtSansRef("coeur", "coeurs")); mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch); return; }
      mtBarreaux(cat ? { ...z, videMax: 0 } : z, z.x0, z.x1, F, pieces, q, ch, cat ? cat.v * (1 + 1e-6) : 2 * v0 + B).forEach(([a, c], i, L) => {
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
    const k = ch.catalogue ? mtRef(forme, "medaillon", { hMax: H - 20, lMax: (z.x1 - z.x0) * 0.6, viser: Math.min(0.46 * H, H - 20, 520) }) : null;
    if (ch.catalogue && !k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "medaillon")); mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch); return; }
    const f = k ? mtFormeRef(k.e) : mtForme(forme), bb = mtBoite(f);
    let w = Math.min(Math.min(0.46 * H, H - 20, 520) * (bb.x1 - bb.x0) / (bb.y1 - bb.y0), (z.x1 - z.x0) * 0.6), hh = w * (bb.y1 - bb.y0) / (bb.x1 - bb.x0);
    if (k) { hh = k.e.h * k.s; w = hh * (bb.x1 - bb.x0) / (bb.y1 - bb.y0); }
    const y = yb + (H - hh) * 0.62, e = MT_ATELIER.epVue + 4, Hc = MT_ATELIER.collier.h;
    if (z.norme || z.lib) {
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
    const B = z.barreau || MT_ATELIER.barreau, lib = mtBarreaux(z, z.x0, z.x1, F, pieces, q, ch), xs = lib.slice(0, -1).map(([, c]) => c);
    if (!xs.length) return;
    const v = lib[0][1] - lib[0][0], f = mtForme(ch.forme), bb = mtBoite(f), pas = 3, debut = [0, 1, 2].find((d) => (2 * d) % pas === (xs.length - 1) % pas), axe = (z.x0 + z.x1) / 2;
    const nM = Math.floor((xs.length - 1 - debut) / pas) + 1, lu = mtLuAxe(z);
    xs.forEach((x, i) => {
      if ((i - debut) % pas) return;
      const j = (i - debut) / pas, centre = lu && Math.abs(x + B / 2 - axe) < 0.5;
      if (mtSaute(ch, j, nM)) return;
      const forme = centre ? mtFormeAxe(mtFormeN(ch, j, nM)) : mtFormeN(ch, j, nM), { yb, yh } = mtCase(z.bas, z.haut, x - v, x + B + v);
      let fi = forme === ch.forme ? f : mtForme(forme), k = null;
      const bi = forme === ch.forme ? bb : mtBoite(fi);
      let w = 2 * v + B * 1.6, h = Math.min(w * (bi.y1 - bi.y0) / (bi.x1 - bi.x0), yh - yb - 16);
      if (ch.catalogue) {
        k = mtRef(forme, "applique", { hMax: yh - yb - 16, viserL: w });
        if (!k) { mtRefus(q, MT_NOMS[forme], mtSansRef(forme, "applique")); return; }
        fi = mtFormeRef(k.e); w = k.e.l * k.s; h = k.e.h * k.s;
      }
      const yc = Math.min(yb + (yh - yb) * 0.62, yh - h / 2 - 8);
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
      q.soudures = (q.soudures || 0) + 2;
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
      q.soudures = (q.soudures || 0) + 2; nPose++;
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
      if (mtVolute(m, fo, F, pieces, q, ch, true, Mi.k)) q.soudures = (q.soudures || 0) + 4;
    });
  },
};
const MT_SOCLE = ["hauteur", "coeurs"];
const MT_VARIANTES = { coeurs: 2 };
function mtChoix(c = {}) {
  const pick = (k, def) => (MT_CHOIX[k].includes(c[k]) ? c[k] : def);
  const assemblage = pick("assemblage", "entre"), avec = MT_AVEC[assemblage];
  const forme = avec.length ? (avec.includes(c.forme) ? c.forme : avec[0]) : null;
  const ch = { assemblage, forme, bouts: pick("bouts", "bouton"), liaison: pick("liaison", "colliers"), barreaux: pick("barreaux", "carre"), friseBasse: pick("friseBasse", "aucune"), pointes: pick("pointes", "aucune"), dore: c.dore === true, fab: c.fab === "forge" ? "forge" : "achat" };
  ch.pos = pick("pos", "haut"); ch.rythme = pick("rythme", "tous");
  ch.forme2 = avec.length ? (avec.includes(c.forme2) && c.forme2 !== forme ? c.forme2 : avec.find((f) => f !== forme) || forme) : null;
  ch.catalogue = c.catalogue === true;
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
export const DEFAUTS_GC = Object.freeze({"prixVente":0,"km":30,"debitAr":8,"minSoud":1.2,"rnP":14,"rnJ":1,"nF":2,"dF":6.5,"fF":13,"eF":25,"cMur":60,"eMur":450,"epMc":8,"L":2000,"l":1000,"H":750,"e":45,"a":80,"ep":3,"t":3,"pL":75,"pl":60,"pX":80,"rX":250,"tS":300,"tW":120,"pR":60,"bR":300,"lame":150,"latte":120,"jeu":8,"trait":3,"B":1180,"A":650,"Hs":0,"Hf":0,"s":16,"mc":40,"j":1,"jour":90,"nP":1,"nb":0,"rD":100,"Xo":0,"Hm":2600,"recul":0,"Wm":900,"lh":150,"lw":100,"le":5,"em":50,"nez":0,"hs":80,"tp":8,"plx":200,"ply":150,"tpp":10,"epl":200,"ptP":3500,"ptH":1600,"ptFleche":150,"ptHSoub":500,"ptPente":0,"ass":"droit","mur":"","etage":true,"rosace":true,"traverse":false,"mcType":"bois","sbMode":"auto","seuls":false,"decor":"aucun","decorForme":"C","decorBouts":"bouton","decorLiaison":"colliers","decorBarreaux":"carre","decorFriseBasse":"aucune","decorDore":"0","renfort":"sans","patte":0,"essence":"chene","remise":"retrait","essenceT":"chene","teinte":"noir","rainure":true,"ptMat":"alu","ptForme":"droit","ptSoub":"aucun","ptRemp":"plein","ptVantaux":"2","ptRep":"egal","ptGuidage":"rail","ptSens":"gauche","ptPoteaux":"existants","ptPointes":false,"ptLisse":false,"ptMoteur":false,"jourAuto":true,"jourSaisi":90});
export const BORNES_GC = Object.freeze({ B: Object.freeze({"min":300,"max":3000}), A: Object.freeze({"min":0,"max":1200}), Hf: Object.freeze({"min":0,"max":3000}) });
export const EMPREINTE_SOURCE = "f305bbfeaa2968decd89d9ac295800f463a52329cedb119de0d891f83f58fb8f";
export { ALLEGE_LIBRE, BARRE_APPUI, CIBLE_MARGE, DECOR_NOMS, DS_ESSENCES, HAUT_ETAGE, LIMITE_ACIER, MARGE_BOULE, MINI_GC, MINI_SEULS, MT_AVEC, MT_CHOIX, MT_NOMS, RENFORT, ROSACE_R, SPHERE, SPHERE_HAUT, Z_ESCALADE, Z_SPHERE, calculerGC, coupeMainCourante, decorActif, decrireVariante, fmt, geomGC, mmTxt, mtAlleger, planA3Pur, svgDe, variantesConformes };
export const EMPREINTE = "c8c5ee0e3f2a";
