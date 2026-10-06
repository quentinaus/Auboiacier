// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : NE PAS MODIFIER À LA MAIN.
// Le moteur des PORTAILS (plans/modules/plans-portails.js, tel que collé dans l'outil) : géométrie, débit, dessins, contrôles. Aucun prix.
// Source : l'outil de plans (plans-atelier.html), sha256 c395e97a6a6cf64489476285.
/* eslint-disable */
// Plans de fabrication des portails : battant (1 ou 2 vantaux), coulissant (sur rail ou autoportant), pliant, portillon.
// Étude du 06/10/2026 avec Quentin : https://claude.ai/artifact/RvJQFroNvsu5kDhivWKu5r
//   - 4 modèles pour couvrir toutes les entrées (place derrière → battant ; place sur le côté → coulissant ; ni l'un ni
//     l'autre → pliant ; piétons → portillon) ;
//   - le portail se COMPOSE par blocs (décision de Quentin, 06/10) : forme du haut, soubassement, remplissage, décor,
//     matière, couleur. Les « styles » (Plein, Barreaux, Lames chêne, Rosace, Volutes) ne sont que des compositions toutes
//     faites (PT_STYLES) ;
//   - surtout de l'alu (Quentin soude l'alu au TIG) ; Rosace et Volutes en acier (rosaces en fonte, volutes forgées) ;
//   - moteur en option, posé par Quentin ; poteaux acier ou alu en option.
//
// calculerPortail(v, modele) rend la MÊME structure R que calculerGC de l'outil (plans-atelier.html) :
//   R.vues.face / cote / dessus : primitives { t: "poly" | "cercle" | "cote" | "texte" | "sol" } dessinées par dessiner() ;
//   R.debit : { nom, qte, mat, long, coupes, note } (les pièces identiques sont regroupées) ;
//   R.alertes (rouge, bloque le devis), R.avertissements (orange, à confirmer), R.oks (vert), R.notes (gris) ;
//   R.resume : [[libellé, valeur]] ; R.poids, R.dims, R.quant (mètres par profilé, surfaces, achats), R.grandeCote.
//
// Module SANS DOM, fonctions pures, AUCUN PRIX (il pourra servir de moteur public au site).
// Tous les noms de premier niveau commencent par « pt » ou « PT_ » : aucun nom en commun avec l'outil ni les autres modules.
//   - collé dans l'IIFE de plans-atelier.html : calculerPortail(v, "ptBattant") ;
//   - chargé seul : node plans/tests/banc.mjs --seul modules/plans-portails.js ; test : node plans/tests/plans-portails.test.mjs
//
// Entrées (v), toutes facultatives (valeurs de départ entre parenthèses) :
//   ptP passage entre poteaux (3500 ; portillon 1000), ptH hauteur au poteau (1600), ptGS garde au sol (selon le modèle),
//   ptVantaux "2" | "1" (battant), ptRep "egal" | "tiers" (2 vantaux inégaux), ptGuidage "rail" | "auto" (coulissant),
//   ptSens "gauche" | "droite" (côté où s'ouvre le coulissant, ou côté des gonds du vantail seul, vu de la rue),
//   ptMat "alu" | "acier", ptForme "droit" | "chapeau" | "creux" | "biais", ptFleche (150),
//   ptSoub "aucun" | "plein" | "lames" | "barreaux" (soubassement), ptHSoub hauteur du soubassement depuis le sol (500),
//   ptRemp "plein" | "lames" | "lamesAlu" | "barreaux" | "croix" | "volutes" (remplissage au-dessus),
//   ptPointes (barreaux qui dépassent, pointes de lance), ptLisse (lisse en chêne sur le dessus),
//   ptPoteaux "existants" | "acier" | "alu", ptMoteur (true/false), ptPente (mm de montée côté propriété, battant),
//   ptCouleur (texte, sans effet sur le plan), trait (scie, 3).
//   ptStyle (facultatif) : "plein" | "barreaux" | "lamesChene" | "rosace" | "volutes" remplit les blocs non donnés.

/* ---------- Réglages d'atelier : valeurs de départ, À CONFIRMER par Quentin ---------- */

const PT_ATELIER = {
  jeuGonds: 15,              // entre le poteau et le montant côté gonds
  jeuCentre: 10,             // entre les deux vantaux
  jeuSerrure: 12,            // vantail seul : côté serrure
  jeuPli: 12,                // pliant : entre les deux panneaux d'un même côté
  gardeSol: { battant: 50, portillon: 50, pliant: 50, rail: 70, auto: 60 },
  recouvrement: { guide: 100, reception: 60 },   // coulissant : derrière le poteau guide, dans la réception
  queueAuto: 0.45, queueMini: 1200, queuePas: 50,   // autoportant : la queue fait 45 % du passage (kits du commerce : 40 à 50 %)
  traverseInter: 40,         // traverse entre soubassement et remplissage
  panneauMax: 1800,          // au-delà, un montant intermédiaire coupe le vantail en panneaux
  panneauMaxLames: 1300,     // lames de chêne : appui tous les 1,30 m au plus
  videMax: 110,              // vide entre barreaux : habitude du garde-corps (boule de 110), pas une norme du portail
  lameChene: { h: 120, ep: 27, jour: 15 },
  lameAlu: { h: 100, ep: 20, jour: 20 },          // lames alu ajourées
  croixCellule: 850,         // largeur visée d'une case à croix (comme le garde-corps)
  rosaceD: 100,              // rosace de l'atelier, Ø 100 (garde-corps)
  frise: 220,                // hauteur de la frise de volutes
  pointe: { depasse: 110, h: 70 },               // barreaux qui dépassent au-dessus de la traverse haute
  lisse: { h: 45, deb: 15 }, // lisse en chêne : épaisseur, débord de chaque côté
  scellement: 500,           // poteau à sceller : longueur dans le massif
  massif: { cote: 400, prof: 600 },
  bornes: {
    P: { battant: [2000, 5000], coulissant: [2000, 6000], pliant: [2400, 5000], portillon: [700, 1400] },
    H: [800, 2200],
    fleche: [0, 400],
  },
  vantailMax: { alu: 2500, acier: 2200 },        // largeur d'un vantail battant
  poidsVantailMax: { alu: 120, acier: 250 },     // au-delà : gonds renforcés (kg)
  flecheMaxRatio: 0.25,
};

// Les profilés : section (b = face vue de la rue, e = épaisseur du portail), épaisseur de paroi (ep) ou plein.
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
    volute: { b: 20, e: 6, plein: true, nom: "Fer plat 20 × 6 (forgé)" },
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
  volutes: { nom: "Volutes", ptMat: "acier", ptForme: "chapeau", ptFleche: 200, ptSoub: "plein", ptHSoub: 550, ptRemp: "volutes", ptPointes: true, ptLisse: false },
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
const ptNombre = (x, def) => { const n = parseFloat(String(x ?? "").replace(",", ".")); return Number.isFinite(n) ? n : def; };
const ptBool = (x, def) => (x === undefined || x === null || x === "" ? def : x === true || x === "1" || x === 1 || x === "true");

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
  c.P = Math.round(ptNombre(v.ptP, type === "portillon" ? 1000 : 3500));
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
  c.pointes = ptBool(pick("ptPointes", false), false) && ["barreaux", "volutes"].includes(c.remp);
  c.lisse = ptBool(pick("ptLisse", false), false);
  c.poteaux = ptChoix(v.ptPoteaux, ["existants", "acier", "alu"], "existants");
  c.moteur = ptBool(v.ptMoteur, false);
  c.pente = Math.max(0, Math.round(ptNombre(v.ptPente, 0)));
  c.couleur = v.ptCouleur || (c.mat === "alu" ? "Gris anthracite (RAL 7016)" : "Noir");
  c.trait = ptNombre(v.trait, 3);
  const cleGS = type === "coulissant" ? c.guidage : type;
  c.gs = Math.round(ptNombre(v.ptGS, PT_ATELIER.gardeSol[cleGS]));
  return c;
}

/* ---------- 2. Les vantaux : où est chaque panneau, sur quel axe il tourne ou glisse ---------- */

function ptVantaux(c) {
  const R = PT_ATELIER, P = c.P;
  if (c.type === "battant" && c.nbV === 2) {
    const utile = P - 2 * R.jeuGonds - R.jeuCentre;
    const w1 = c.rep === "tiers" ? Math.round(utile * 2 / 3) : utile / 2, w2 = utile - w1;
    const a = R.jeuGonds, b = a + w1, d = P - R.jeuGonds, e = d - w2;
    return [
      { nom: c.rep === "tiers" ? "Grand vantail" : "Vantail gauche", x0: a, x1: b, gonds: "gauche" },
      { nom: c.rep === "tiers" ? "Petit vantail" : "Vantail droit", x0: e, x1: d, gonds: "droite" },
    ];
  }
  if (c.type === "battant" || c.type === "portillon") {
    const gauche = c.sens === "gauche";
    const x0 = gauche ? R.jeuGonds : R.jeuSerrure, x1 = P - (gauche ? R.jeuSerrure : R.jeuGonds);
    return [{ nom: c.type === "portillon" ? "Portillon" : "Vantail", x0, x1, gonds: c.sens }];
  }
  if (c.type === "pliant") {
    const utile = (P - 2 * R.jeuGonds - R.jeuCentre) / 2;
    const p = (utile - R.jeuPli) / 2;
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

// La volute en S : deux spirales qui s'opposent, dans un rectangle w × h (fer plat forgé).
function ptVoluteS(x0, y0, w, h) {
  const R = Math.min(0.3 * w, 0.24 * h), c1 = [x0 + 0.32 * w, y0 + 0.27 * h], cx = x0 + w / 2, cy = y0 + h / 2;
  const A = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, phi = Math.PI / 2 - 2.4 * Math.PI * (1 - t), r = R * (0.14 + 0.86 * t);
    A.push([c1[0] + r * Math.cos(phi), c1[1] + r * Math.sin(phi)]);
  }
  const B = A.map(([x, y]) => [2 * cx - x, 2 * cy - y]).reverse();
  return A.concat(B);
}

// Remplit une zone { x0, x1, y0, haut(x) } avec un remplissage. Rend les primitives et ajoute les pièces.
function ptRemplir(c, z, remp, F, pieces, q, ctx) {
  const RG = PT_ATELIER, M = c.M, d = M.densite, w = z.x1 - z.x0;
  const hautMin = Math.min(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2));
  const contour = () => [[z.x0, z.y0], [z.x1, z.y0], ...ptCourbe(z.haut, z.x1, z.x0, 16)];
  const courbe = c.forme !== "droit" && !z.plat;
  if (remp === "panneau" && M === PT_MATIERES.alu) {
    // Panneau composite alu laqué (4 mm), tenu par des parcloses alu 20 × 20 vissées tout autour, des deux côtés.
    F.push({ t: "poly", piece: "Panneau lisse", cls: "t-mur t-panneau", pts: contour() });
    const h = (z.haut(z.x0) + z.haut(z.x1)) / 2 - z.y0, aire = w * h / 1e6;
    pieces.push({ nom: `Panneau ${z.nomZone}`.trim(), mat: "Panneau composite alu 4 mm laqué", long: w, larg: hautMin - z.y0, aire, kgM: 0, kg: aire * 5.5, peri: 0, coupes: courbe ? "Découpé à la forme du haut" : "Rectangle", note: "Laqué 2 faces, film retiré à la pose", groupe: "Remplissage", tole: true, panneau: true });
    ptPiece(pieces, `Parclose ${z.nomZone}`.trim(), { nom: "Cornière alu 20 × 20 × 2", b: 20, e: 20, ep: 2 }, 2 * 2 * (w + h), d, "Coupes droites, vissée", "Deux côtés, tout autour", "Remplissage");
    return;
  }
  if (remp === "plein" || remp === "panneau") {
    if (M.plein.type === "tole") {
      F.push({ t: "poly", piece: "Tôle de remplissage", cls: "t-mur t-panneau", pts: contour() });
      const aire = (w * ((z.haut(z.x0) + z.haut(z.x1)) / 2 - z.y0)) / 1e6;
      pieces.push({ nom: `Tôle ${z.nomZone}`, mat: M.plein.nom, long: w, larg: hautMin - z.y0, aire, kgM: 0, kg: aire * M.plein.ep * d, peri: 0, coupes: courbe ? "Découpée à la forme du haut" : "Rectangle", note: "", groupe: "Remplissage", tole: true });
      q.soudureM += 2 * (w + hautMin - z.y0) / 1000 * 0.25;   // points de soudure espacés : un quart du tour
    } else {
      F.push({ t: "poly", piece: "Lames de remplissage", cls: "t-mur t-panneau", pts: contour() });
      const n = Math.ceil((hautMin - z.y0) / M.plein.h);
      for (let i = 1; i < n; i++) { const y = z.y0 + i * M.plein.h; F.push({ t: "poly", cls: "t-acier t-joint", ouvert: true, pts: [[z.x0, y], [z.x1, y]] }); }
      const nCoupe = courbe ? Math.ceil((Math.max(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2)) - z.y0) / M.plein.h) - n + 1 : 0;
      for (let i = 0; i < n - (nCoupe ? 1 : 0); i++) ptPiece(pieces, `Lame pleine ${z.nomZone}`, M.plein, w, d, "Coupe droite, emboîtée", "", "Remplissage");
      for (let i = 0; i < nCoupe; i++) ptPiece(pieces, `Lame pleine ${z.nomZone}, découpée en courbe`, M.plein, w, d, "Découpée à la forme du haut", "", "Remplissage");
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
      if (yHaut <= hautMin + 1) { F.push({ t: "poly", piece: remp === "lames" ? "Lames de chêne" : "Lames alu", cls, pts: ptRect(z.x0, y, z.x1, yHaut) }); ptPiece(pieces, remp === "lames" ? `Lame chêne ${z.nomZone}` : `Lame alu ${z.nomZone}`, pr, w, d, "Coupe droite", remp === "lames" ? "Vissée sur cornières, huile-cire" : "", "Remplissage"); continue; }
      // Lame coupée à la forme du haut : on garde ce qui est sous la ligne.
      const pts = ptCourbe((x) => Math.min(yHaut, z.haut(x)), z.x1, z.x0, 16).filter(([, yy]) => yy > y + 1);
      if (pts.length < 2) continue;
      F.push({ t: "poly", piece: remp === "lames" ? "Lames de chêne" : "Lames alu", cls, pts: [[z.x0, y], [z.x1, y], ...ptCourbe((x) => Math.max(y, Math.min(yHaut, z.haut(x))), z.x1, z.x0, 16)] });
      ptPiece(pieces, remp === "lames" ? `Lame chêne ${z.nomZone}, découpée` : `Lame alu ${z.nomZone}, découpée`, pr, w, d, "Découpée à la forme du haut", "", "Remplissage");
    }
    return;
  }
  if (remp === "barreaux" || remp === "volutes") {
    const pr = M.barreau, n = Math.max(1, Math.ceil((w - RG.videMax) / (pr.b + RG.videMax))), pas = (w - n * pr.b) / (n + 1);
    const pointes = c.pointes && z.dessus;
    const xs = [];
    for (let i = 0; i < n; i++) {
      const xa = z.x0 + pas + i * (pas + pr.b), xb = xa + pr.b, xm = (xa + xb) / 2;
      xs.push([xa, xb]);
      const yTop = pointes ? z.hautExt(xm) + RG.pointe.depasse : z.haut(xm);
      F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: [[xa, z.y0], [xb, z.y0], [xb, yTop], [xa, yTop]] });
      if (pointes) F.push({ t: "poly", piece: "Pointes de lance", cls: "t-acier-plein", pts: [[xa - 8, yTop], [xb + 8, yTop], [xm, yTop + RG.pointe.h]] });
      ptPiece(pieces, `Barreau ${z.nomZone}`, pr, yTop - z.y0, d, pointes ? "Traverse haute percée, barreau traversant" : courbe ? "Haut coupé à la forme" : "Coupes droites", "", "Remplissage");
      q.soudures += pointes ? 3 : 2;
    }
    if (pointes) q.achats.pointes = (q.achats.pointes || 0) + n;
    q.vide = Math.max(q.vide || 0, pas);
    if (remp === "volutes") {
      // Frise de volutes en S sous la traverse haute, une dans chaque case.
      const hf = RG.frise, yb = z.friseY != null ? z.friseY : hautMin - hf - 10;
      const bords = [[z.x0, z.x0 + pas], ...xs.map(([, xb], i) => [xb, i + 1 < xs.length ? xs[i + 1][0] : z.x1])];
      let nv = 0;
      bords.forEach(([a, b], i) => {
        if (b - a < 60 || yb < z.y0 + 100) return;
        const pts = ptVoluteS(a + 3, yb + 4, b - a - 6, hf - 4);
        F.push({ t: "poly", piece: "Volutes", cls: "t-acier t-volute", ouvert: true, pts });
        // Acier : volute du commerce (« tout commandé », décision de Quentin du 06/10/2026). Alu : plat cintré à l'atelier.
        if (c.mat === "acier") ptPiece(pieces, "Volute en S", { nom: "Volute en S achetée (fer forgé 12 × 6)", b: 12, e: 6, plein: true }, ptLongueur(pts), d, "Achetée, à souder", "Pièce de ferronnerie du commerce, soudée aux barreaux", "Décor");
        else ptPiece(pieces, "Volute en S", M.volute, ptLongueur(pts), d, "Cintrée au gabarit", "Soudée aux barreaux", "Décor");
        nv++; q.soudures += 2;
      });
      q.volutes = (q.volutes || 0) + nv;
      if (yb >= z.y0 + 100) F.push({ t: "poly", piece: "Traverse de frise", cls: "t-acier-plein", pts: ptRect(z.x0, yb - 20, z.x1, yb) }), ptPiece(pieces, "Traverse de frise (plat)", { nom: c.mat === "acier" ? "Fer plat 30 × 8" : "Plat alu 30 × 8", b: 30, e: 8, plein: true }, w, d, "Coupes droites, percée pour les barreaux", "", "Décor");
    }
    return;
  }
  if (remp === "croix") {
    const pr = M.croix, cols = Math.max(1, Math.round(w / RG.croixCellule)), mi = 30;
    const cw = (w - (cols - 1) * mi) / cols;
    for (let k = 0; k < cols; k++) {
      const a = z.x0 + k * (cw + mi), b = a + cw, ya = z.haut(a), yb = z.haut(b);
      if (k > 0) { F.push({ t: "poly", piece: "Montants des croix", cls: "t-acier-plein", pts: [[a - mi, z.y0], [a, z.y0], [a, z.haut(a)], [a - mi, z.haut(a - mi)]] }); ptPiece(pieces, `Montant entre croix ${z.nomZone}`, { nom: c.mat === "acier" ? "Fer plat 30 × 8" : "Plat alu 30 × 8", b: 30, e: 8, plein: true }, z.haut(a) - z.y0, d, "Coupes droites", "", "Remplissage"); }
      const e = pr.b / 2;
      F.push({ t: "poly", piece: "Croix", cls: "t-acier-plein", pts: [[a, z.y0], [a + e * 1.4, z.y0], [b, yb - e * 1.4], [b, yb], [b - e * 1.4, yb], [a, z.y0 + e * 1.4]] });
      F.push({ t: "poly", piece: "Croix", cls: "t-acier-plein", pts: [[a, ya], [a, ya - e * 1.4], [b - e * 1.4, z.y0], [b, z.y0], [b, z.y0 + e * 1.4], [a + e * 1.4, ya]] });
      const L1 = Math.hypot(b - a, yb - z.y0), L2 = Math.hypot(b - a, ya - z.y0);
      ptPiece(pieces, `Barre de croix ${z.nomZone}`, pr, L1, d, `Coupes à ${Math.round(Math.atan2(yb - z.y0, b - a) * 180 / Math.PI)}°`, "", "Remplissage");
      ptPiece(pieces, `Demi-barre de croix ${z.nomZone}`, pr, L2 / 2, d, "Coupée au centre, contre la rosace", "", "Remplissage");
      ptPiece(pieces, `Demi-barre de croix ${z.nomZone}`, pr, L2 / 2, d, "Coupée au centre, contre la rosace", "", "Remplissage");
      const cx = (a + b) / 2, cy = (z.y0 + (ya + yb) / 2) / 2;
      F.push({ t: "cercle", piece: "Rosaces", cls: "t-rond", c: [cx, cy], r: RG.rosaceD / 2 });
      F.push({ t: "cercle", cls: "t-acier", c: [cx, cy], r: RG.rosaceD / 2 * 0.55 });
      q.rosaces = (q.rosaces || 0) + 1; q.soudures += 8;
    }
  }
}

function ptDessinerVantail(c, V, haut, F, pieces, q, Vn) {
  const RG = PT_ATELIER, M = c.M, d = M.densite, gs = c.gs;
  const cotéGonds = V.gonds === "gauche" ? "g" : V.gonds === "droite" ? "d" : null;
  const prG = V.coulissant ? M.cadre : cotéGonds === "g" ? M.fort : M.cadre, prD = cotéGonds === "d" ? M.fort : M.cadre;
  const bG = prG.b, bD = prD.b, bB = M.cadre.b, bH = M.cadre.b;
  const prBas = V.coulissant ? M.fort : M.cadre;
  const x0 = V.x0, x1 = V.x1, xi0 = x0 + bG, xi1 = x1 - bD;
  const hautCadre = (x) => haut(x) - bH;
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
  const nP = Math.max(1, Math.ceil((xi1 - xi0) / maxP)), mi = M.inter.b;
  const wP = (xi1 - xi0 - (nP - 1) * mi) / nP;
  const ySoub = c.soub !== "aucun" ? gs + c.hSoub : null;
  // Frise de volutes à la même hauteur sur tout le vantail (sous le point le plus bas du haut).
  const friseY = Math.min(...ptCourbe(hautCadre, xi0, xi1, 12).map((p) => p[1])) - RG.frise - 10;
  for (let k = 0; k < nP; k++) {
    const a = xi0 + k * (wP + mi), b = a + wP;
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
      ptRemplir(c, { x0: a, x1: b, y0, haut: () => ySoub, plat: true, nomZone: "du soubassement", hautExt: () => ySoub }, c.soub, F, pieces, q);
      ptRemplir(c, { x0: a, x1: b, y0: ySoub + ti, haut: hautCadre, nomZone: "du haut", dessus: true, hautExt: haut, friseY }, c.remp, F, pieces, q);
    } else {
      ptRemplir(c, { x0: a, x1: b, y0, haut: hautCadre, nomZone: "", dessus: true, hautExt: haut, friseY }, c.remp, F, pieces, q);
    }
  }
  // Lisse en chêne posée sur la traverse haute (haut droit seulement).
  if (c.lisse && c.forme === "droit") {
    const L = RG.lisse, yT = haut(x0);
    F.push({ t: "poly", piece: "Lisse en chêne", cls: "t-bois", pts: ptRect(x0 - L.deb, yT, x1 + L.deb, yT + L.h) });
    ptPiece(pieces, "Lisse en chêne", { nom: "Chêne 70 × 45", kgM: 0.07 * 0.045 * 700 }, x1 - x0 + 2 * L.deb, d, "Bouts arrondis, huile-cire", "Vissée par-dessous", "Remplissage");
  }
  // Gonds, serrure (repères sur la vue de face).
  if (cotéGonds) {
    const xg = cotéGonds === "g" ? x0 : x1, nG = c.H > 1800 ? 3 : 2;
    for (let i = 0; i < nG; i++) {
      const y = gs + 200 + i * (c.H - 400) / (nG - 1);
      F.push({ t: "poly", piece: "Gonds", cls: "t-acier-plein", pts: ptRect(xg - 22, y - 45, xg + 22, y + 45) });
    }
  }
  if (V.pli === "droite") {
    for (let i = 0; i < (c.H > 1800 ? 4 : 3); i++) {
      const y = gs + 150 + i * (c.H - 300) / ((c.H > 1800 ? 4 : 3) - 1);
      F.push({ t: "poly", piece: "Charnières de pli", cls: "t-acier-plein", pts: ptRect(x1 - 6, y - 35, x1 + PT_ATELIER.jeuPli + 6, y + 35) });
    }
  }
  if (!V.coulissant && !V.pli) {
    const xs = cotéGonds === "g" ? x1 - bD / 2 : x0 + bG / 2;
    if (!(c.nbV === 2 && cotéGonds === "d")) F.push({ t: "poly", piece: "Serrure", cls: "t-acier t-serrure", pts: ptRect(xs - 14, gs + 950, xs + 14, gs + 1100) });
  }
}

/* ---------- 4. Le calcul complet ---------- */

function calculerPortail(v, modele) {
  const c = ptEntrees(v, modele), RG = PT_ATELIER, M = c.M;
  const R = { vues: { face: [], cote: [], dessus: [] }, debit: [], alertes: [], avertissements: [], oks: [], notes: [], resume: [], tubes: [], acierM2: 0, poids: 0 };
  const F = R.vues.face, C = R.vues.cote, D = R.vues.dessus;
  const q = { soudures: 0, soudureM: 0, achats: {}, rosaces: 0, volutes: 0, vide: 0 };
  const cleBornes = c.type;
  const [pMin, pMax] = RG.bornes.P[cleBornes], [hMin, hMax] = RG.bornes.H;

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
  if (c.mat === "alu" && (c.remp === "croix" || c.remp === "volutes")) R.avertissements.push(`${c.remp === "croix" ? "Rosaces" : "Volutes"} en alu : pièces à trouver chez un fournisseur, rendu moins « fer forgé ». À confirmer.`);
  if (c.mat === "acier" && (c.remp === "panneau" || c.soub === "panneau")) R.notes.push("En acier, le panneau lisse est une tôle pleine : c'est le remplissage « plein ».");
  if (c.mat === "acier" && c.remp === "lamesAlu") R.alertes.push("Lames alu sur un cadre acier : pas de mélange (corrosion). Choisis le cadre alu ou un autre remplissage.");
  if (c.pointes && c.mat === "alu") R.avertissements.push("Pointes de lance en alu : à trouver chez un fournisseur. À confirmer.");

  // --- Vantaux et ligne du haut ---
  const V = ptVantaux(c);
  const xa = Math.min(...V.map((x) => x.x0)), xb = Math.max(...V.map((x) => x.x1));
  const xm = V.length === 2 ? (V[0].x1 + V[1].x0) / 2 : (xa + xb) / 2;
  const haut = ptLigneHaut(c, xa, xb, xm);
  const pieces = [];
  const parVantail = [];
  for (const vt of V) {
    const p0 = pieces.length;
    ptDessinerVantail(c, vt, haut, F, pieces, q, V.length);
    const kg = pieces.slice(p0).reduce((s, p) => s + (p.kg != null ? p.kg : p.kgM * p.long / 1000), 0);
    parVantail.push({ nom: vt.nom, l: vt.x1 - vt.x0, kg });
  }
  const largeurs = V.map((x) => x.x1 - x.x0);
  const vMax = Math.max(...largeurs);
  if (c.type === "battant") {
    if (vMax > RG.vantailMax[c.mat]) R.alertes.push(`Vantail de ${ptMm(vMax)} mm : trop large en ${M.nom.toLowerCase()} (${ptMm(RG.vantailMax[c.mat])} au plus). ${c.nbV === 1 ? "Passe en 2 vantaux" : "Passe en coulissant"}.`);
    else R.oks.push(`Vantail de ${ptMm(vMax)} mm : dans la limite de ${ptMm(RG.vantailMax[c.mat])} mm en ${M.nom.toLowerCase()}.`);
  }
  if (["battant", "portillon", "pliant"].includes(c.type)) {
    const rayon = c.type === "pliant" ? largeurs[0] : vMax;
    if (c.pente > c.gs - 10) R.alertes.push(`Le sol monte de ${ptMm(c.pente)} mm côté propriété : le vantail touche le sol (garde au sol ${ptMm(c.gs)}). Il faut un coulissant, ou des gonds à rattrapage de pente (sur devis).`);
    else if (c.pente > 0) R.oks.push(`Pente côté propriété : ${ptMm(c.pente)} mm, sous la garde au sol (${ptMm(c.gs)}).`);
    R.resume.push(["Place derrière", `${ptMm(rayon + 50)} mm`]);
  }
  const kgVMax = Math.max(...parVantail.map((x) => x.kg));
  if (!parVantail.some((x) => x.nom.startsWith("Portail coulissant")) && kgVMax > RG.poidsVantailMax[c.mat]) R.avertissements.push(`Vantail de ${ptKg(kgVMax)} kg : prévoir des gonds renforcés (au-delà de ${RG.poidsVantailMax[c.mat]} kg).`);

  // --- Coulissant : rail, roues, queue de l'autoportant ---
  const coul = c.type === "coulissant";
  const Lg = coul ? V[0].x1 - V[0].x0 : 0;
  const queue = coul && c.guidage === "auto" ? Math.max(RG.queueMini, Math.ceil(RG.queueAuto * c.P / RG.queuePas) * RG.queuePas) : 0;
  const gauche = c.sens === "gauche";
  if (coul) {
    const course = c.P + RG.recouvrement.reception;
    const place = Lg + queue;
    R.resume.push(["Place le long de la clôture", `${ptMm(place)} mm`]);
    if (c.guidage === "rail") {
      const railL = Lg + course;
      const r0 = gauche ? V[0].x0 - course : V[0].x0, r1 = r0 + railL;
      F.push({ t: "poly", piece: "Rail au sol", cls: "t-acier-plein", pts: ptRect(r0, -10, r1, 0) });
      for (const xr of [V[0].x0 + 300, V[0].x1 - 300]) F.push({ t: "cercle", piece: "Roues", cls: "t-rond", c: [xr, c.gs / 2], r: Math.min(45, c.gs / 2 - 5) });
      pieces.push({ nom: "Rail à sceller", mat: "Rail acier galvanisé (à gorge)", long: railL, kgM: 2.5, peri: 0, coupes: "Coupe droite", note: "Scellé de niveau sur une bande de béton", groupe: "Guidage" });
      q.achats.roues = 2; q.achats.guideHaut = 1; q.achats.butees = 3;
    } else {
      const s = gauche ? -1 : 1, xq0 = gauche ? V[0].x0 - queue : V[0].x1, xq1 = gauche ? V[0].x0 : V[0].x1 + queue;
      const xe = gauche ? xq0 : xq1, xBout = gauche ? V[0].x0 : V[0].x1;
      F.push({ t: "poly", piece: "Queue de l'autoportant", cls: "t-cache", pts: ptRect(xq0, c.gs, xq1, c.gs + 120) });
      F.push({ t: "poly", piece: "Queue de l'autoportant", cls: "t-cache", ouvert: true, pts: [[xBout, haut(xBout)], [xe, c.gs + 120]] });
      F.push({ t: "texte", p: [(xq0 + xq1) / 2, c.gs + 120], txt: "derrière la clôture", pos: "sur", decal: 0.2 });
      const xc1 = gauche ? V[0].x0 - 150 : V[0].x1 + 150, xc2 = xc1 - s * (queue - 250);
      for (const xg of [xc1, xc2]) F.push({ t: "cercle", piece: "Chariots", cls: "t-cache", c: [xg, c.gs / 2], r: 25 });
      pieces.push({ nom: "Poutre autoportante", mat: "Kit autoportant (poutre, 2 chariots, roulette, réception)", long: Lg + queue, kgM: 0, peri: 0, coupes: "Selon le kit", note: "Vissée sous la traverse basse", groupe: "Guidage", achat: true });
      pieces.push({ nom: "Traverse de queue", mat: M.cadre.nom, long: Math.hypot(queue, haut(xBout) - c.gs - 120), kgM: ptKgM(M.cadre, M.densite), peri: ptPerimetre(M.cadre), coupes: "Coupes d'onglet", note: "Diagonale de la queue", groupe: "Cadre" });
      q.achats.kitAutoportant = 1; q.achats.guideHaut = 1; q.massifQueue = queue + 300;
    }
    if (c.P > 5000 && c.mat === "acier") R.avertissements.push(`Coulissant acier de ${ptMm(Lg)} mm : lourd, moteur et roues à dimensionner.`);
  }

  // --- Poteaux ou piliers ---
  const pied = c.type === "portillon" ? "poteauPetit" : "poteau";
  const prP = c.poteaux === "existants" ? null : PT_MATIERES[c.poteaux][pied];
  const bP = prP ? prP.b : 300;
  const hPost = Math.max(haut(xa), haut(xb)) + 50;
  const posts = [[-bP, 0], [c.P, c.P + bP]];
  for (const [p0, p1] of posts) {
    if (prP) {
      F.push({ t: "poly", piece: "Poteaux", cls: "t-acier-plein", pts: ptRect(p0, 0, p1, hPost) });
      F.push({ t: "poly", cls: "t-cache", pts: ptRect(p0, -RG.scellement, p1, 0) });
    } else F.push({ t: "poly", cls: "t-mur t-pilier", pts: ptRect(p0, 0, p1, hPost + 100) });
  }
  if (prP) {
    pieces.push({ nom: "Poteau", mat: prP.nom, long: hPost + RG.scellement, kgM: ptKgM(prP, PT_MATIERES[c.poteaux].densite), peri: 4 * prP.b, coupes: "Coupe droite, chapeau soudé", note: `${ptMm(RG.scellement)} mm scellés dans un massif`, groupe: "Poteaux" });
    pieces.push({ nom: "Poteau", mat: prP.nom, long: hPost + RG.scellement, kgM: ptKgM(prP, PT_MATIERES[c.poteaux].densite), peri: 4 * prP.b, coupes: "Coupe droite, chapeau soudé", note: `${ptMm(RG.scellement)} mm scellés dans un massif`, groupe: "Poteaux" });
  } else R.notes.push("Piliers existants : à vérifier sur place (parpaing creux ou fissuré : ils ne tiennent pas un portail battant).");
  const xs = F.flatMap((p) => (p.pts ? p.pts.map(([x]) => x) : p.c ? [p.c[0]] : []));
  F.unshift({ t: "sol", x1: Math.min(...xs) - 300, x2: Math.max(...xs) + 300 });

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

  // --- Vue de dessus : la place à prévoir ---
  ptVueDessus(c, V, D, queue, bP, R);
  // --- Vue de côté : coupe du vantail ---
  ptVueCote(c, C, haut, xa, bP, prP);

  // --- Quincaillerie et moteur (achats, sans prix) ---
  const A = q.achats;
  if (c.type === "battant" || c.type === "portillon") {
    const nG = c.H > 1800 ? 3 : 2;
    A.gonds = nG * c.nbV; A.serrure = 1; A.poignees = 1; A.arrets = c.nbV;
    if (c.nbV === 2) { A.buteeCentrale = 1; A.verrou = 1; }
  } else if (c.type === "pliant") {
    A.gonds = 4; A.charnieresPli = (c.H > 1800 ? 4 : 3) * 2; A.roulettesBout = 2; A.guidesSol = 2; A.buteeCentrale = 1; A.serrure = 1; A.verrou = 1; A.poignees = 1;
    R.avertissements.push("Pliant : charnières de pli, roulettes et guides au sol à choisir chez un fournisseur. À confirmer.");
  } else { A.serrure = 1; A.poignees = 1; }
  if (c.moteur) {
    if (c.type === "battant") { A.moteur = c.nbV === 2 ? "Kit moteur 2 vérins (cellules, feu, 2 télécommandes)" : "Kit moteur 1 vérin (cellules, feu, 2 télécommandes)"; }
    else if (c.type === "coulissant") { A.moteur = "Kit moteur coulissant (cellules, feu, 2 télécommandes)"; A.cremaillereM = Math.ceil(Lg / 1000); }
    else if (c.type === "pliant") { A.moteur = "Kit moteur pour portail pliant"; R.avertissements.push("Moteur de portail pliant : kit spécial, à choisir sur devis. À confirmer."); }
    else { R.notes.push("Portillon : pas de moteur, mais une gâche électrique peut se poser (sur devis)."); }
    if (c.type !== "portillon") R.notes.push("Motorisé : pose selon NF EN 12453 (cellules, feu clignotant, réglage des efforts) et marquage CE du portail motorisé par l'installateur.");
  }
  R.notes.push("Ouverture toujours côté propriété : jamais sur le trottoir ni la route.");
  R.notes.push("Mairie : le plan local d'urbanisme peut fixer hauteur et couleur, et demander une déclaration préalable.");
  R.notes.push("Profilés, jeux, gardes au sol et quincaillerie : valeurs de départ de l'étude du 06/10/2026, à confirmer par toi.");

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
  }));
  const ACHATS_NOMS = { gonds: "Gonds réglables", serrure: "Serrure + cylindre", poignees: "Paire de poignées", arrets: "Arrêts de vantail", buteeCentrale: "Butée centrale", verrou: "Verrou du vantail fixe", charnieresPli: "Charnières de pli", roulettesBout: "Roulettes de bout", guidesSol: "Guides au sol", roues: "Roues à gorge", guideHaut: "Guide haut à rouleaux", butees: "Butées (réception, fin de course)", kitAutoportant: "Kit autoportant", pointes: "Pointes de lance", cremaillereM: "Crémaillère (mètres)" };
  for (const [k, n] of Object.entries(A)) {
    if (k === "moteur") { R.debit.push({ nom: "Moteur", qte: 1, mat: n, long: 0, coupes: "—", note: "Option, posé par nos soins", groupe: "Achats" }); continue; }
    if (k === "kitAutoportant") continue;   // déjà dans le débit (poutre)
    R.debit.push({ nom: ACHATS_NOMS[k] || k, qte: n, mat: "Quincaillerie", long: 0, coupes: "—", note: "", groupe: "Achats" });
  }
  if (q.rosaces) R.debit.push({ nom: "Rosaces", qte: q.rosaces, mat: c.mat === "acier" ? "Rosace fonte Ø 100 (comme le garde-corps)" : "Rosace alu Ø 100 (à trouver)", long: 0, coupes: "—", note: "Soudée au croisement", groupe: "Achats" });

  // --- Quantités pour le chiffrage (aucun prix ici) ---
  const metres = {};
  let laqueM2 = 0, kg = 0, toleM2 = 0, panneauM2 = 0;
  for (const p of pieces) {
    const lm = p.long / 1000;
    if (p.panneau) { panneauM2 += p.aire; kg += p.kg; continue; }
    if (p.tole) { toleM2 += p.aire; laqueM2 += 2 * p.aire; kg += p.kg; metres[p.mat] = (metres[p.mat] || 0); continue; }
    metres[p.mat] = (metres[p.mat] || 0) + lm;
    if (p.groupe !== "Guidage" && !p.mat.startsWith("Lame chêne") && !p.mat.startsWith("Chêne")) laqueM2 += lm * p.peri / 1000;
    kg += p.kgM * lm;
  }
  const kgPortail = parVantail.reduce((s, x) => s + x.kg, 0);
  R.quant = {
    type: c.type, modele: c.modele, mat: c.mat, metres, toleM2, panneauM2, laqueM2, soudures: q.soudures, achats: A, rosaces: q.rosaces, volutes: q.volutes,
    vantaux: parVantail, queue, longueurPortail: coul ? Lg : null, massifQueue: q.massifQueue || 0, poteaux: c.poteaux, moteur: c.moteur,
    cintrage: c.forme === "chapeau" || c.forme === "creux", lisse: c.lisse && c.forme === "droit", pointes: c.pointes,
  };
  R.poids = kgPortail;
  R.kg = Math.round(kg);
  R.dims = { P: c.P, H: c.H, type: c.type, vantaux: largeurs.map(Math.round), gs: c.gs, hautMax: Math.round(Math.max(...ptCourbe(haut, xa, xb).map(([, y]) => y))) };
  R.grandeCote = Math.round(Math.max(...largeurs));
  R.config = c;

  // --- Résumé ---
  const nomType = c.type === "battant" ? `Battant ${c.nbV} ${c.nbV > 1 ? "vantaux" : "vantail"}${c.nbV === 2 && c.rep === "tiers" ? " inégaux" : ""}` : c.type === "coulissant" ? `Coulissant ${c.guidage === "rail" ? "sur rail" : "autoportant"}` : c.type === "pliant" ? "Pliant (2 × 2 panneaux)" : "Portillon";
  R.resume.unshift(["Modèle", nomType], ["Matière", `${M.nom} · ${M.finition.toLowerCase()}`], ["Vantaux", largeurs.map(ptMm).join(" + ") + " mm"]);
  R.resume.push(["Poids du portail", `≈ ${ptKg(kgPortail)} kg`]);
  if (q.vide) R.resume.push(["Vide entre barreaux", `${ptMm(q.vide)} mm`]);
  if (!R.alertes.length) R.oks.push("Toutes les cotes sont dans les limites de l'atelier.");
  return R;
}

/* ---------- 5. Vue de dessus : la place à prévoir (rue en bas, propriété en haut) ---------- */

function ptArc(cx, cy, r, a0, a1, n = 18) { const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; }

function ptVueDessus(c, V, D, queue, bP, R) {
  const e = c.M.cadre.e, RG = PT_ATELIER;
  const coul = c.type === "coulissant", gauche = c.sens === "gauche";
  const murG = coul && gauche ? Math.max(1800, V[0].x1 - V[0].x0 + queue + 600) : 1200, murD = coul && !gauche ? Math.max(1800, V[0].x1 - V[0].x0 + queue + 600) : 1200;
  D.push({ t: "poly", cls: "t-mur", pts: ptRect(-bP - murG, -100, -bP, 100) });
  D.push({ t: "poly", cls: "t-mur", pts: ptRect(c.P + bP, -100, c.P + bP + murD, 100) });
  D.push({ t: "poly", cls: "t-acier-plein", pts: ptRect(-bP, -bP / 2, 0, bP / 2) });
  D.push({ t: "poly", cls: "t-acier-plein", pts: ptRect(c.P, -bP / 2, c.P + bP, bP / 2) });
  D.push({ t: "texte", p: [c.P / 2, -bP / 2], txt: "Rue", pos: "sous", decal: 1.5 });
  D.push({ t: "texte", p: [c.P / 2, coul ? 1100 : Math.max(...V.map((x) => x.x1 - x.x0)) + 350], txt: "Côté propriété", pos: "sur" });
  if (coul) {
    const yG = bP / 2 + 30, Lg = V[0].x1 - V[0].x0, course = c.P + RG.recouvrement.reception;
    const s = gauche ? -1 : 1;
    const ferme0 = V[0].x0 - (gauche ? queue : 0), ferme1 = V[0].x1 + (gauche ? 0 : queue);
    const ouvert0 = ferme0 + s * course, ouvert1 = ferme1 + s * course;
    const zone0 = gauche ? ouvert0 : c.P, zone1 = gauche ? 0 : ouvert1;
    D.push({ t: "poly", cls: "t-bon t-zone", pts: ptRect(zone0, bP / 2, zone1, yG + e + 60) });
    D.push({ t: "poly", piece: "Portail fermé", cls: "t-acier-plein", pts: ptRect(V[0].x0, yG, V[0].x1, yG + e) });
    if (queue) D.push({ t: "poly", piece: "Queue", cls: "t-acier", pts: ptRect(gauche ? V[0].x0 - queue : V[0].x1, yG + e / 2 - 8, gauche ? V[0].x0 : V[0].x1 + queue, yG + e / 2 + 8) });
    D.push({ t: "poly", cls: "t-cache", pts: ptRect(ouvert0, yG, ouvert1, yG + e) });
    D.push({ t: "cote", a: [zone0, yG + e + 60], b: [zone1, yG + e + 60], cote: "haut", d: 1.2, txt: ptMm(zone1 - zone0) });
    D.push({ t: "texte", p: [(zone0 + zone1) / 2, yG + e + 60], txt: "place libre le long de la clôture", pos: "sur", decal: 4.6 });
    if (c.guidage === "auto") D.push({ t: "poly", cls: "t-mur", pts: ptRect(gauche ? -bP - queue - 150 : c.P + bP, -40, gauche ? -bP : c.P + bP + queue + 150, yG + e + 40) });
    return;
  }
  // Battant, portillon, pliant : les vantaux tournent vers la propriété.
  const yA = e / 2;
  V.forEach((vt) => {
    D.push({ t: "poly", piece: vt.nom, cls: "t-acier-plein", pts: ptRect(vt.x0, 0, vt.x1, e) });
  });
  const tourne = c.type === "pliant" ? V.filter((x) => x.gonds) : V;
  tourne.forEach((vt) => {
    const g = vt.gonds === "gauche", xh = g ? vt.x0 : vt.x1;
    const r = c.type === "pliant" ? vt.x1 - vt.x0 : vt.x1 - vt.x0;
    const arc = g ? ptArc(xh, yA, r, 0, Math.PI / 2) : ptArc(xh, yA, r, Math.PI, Math.PI / 2);
    D.push({ t: "poly", cls: "t-bon t-zone", pts: [[xh, yA], ...arc] });
    D.push({ t: "poly", cls: "t-cache", pts: g ? ptRect(xh, yA, xh + e, yA + r) : ptRect(xh - e, yA, xh, yA + r) });
    if (c.type === "pliant") D.push({ t: "poly", cls: "t-cache", pts: g ? ptRect(xh + e + 10, yA + 30, xh + 2 * e + 10, yA + r) : ptRect(xh - 2 * e - 10, yA + 30, xh - e - 10, yA + r) });
  });
  const vt = tourne[0], r = vt.x1 - vt.x0, xh = vt.gonds === "gauche" ? vt.x0 : vt.x1;
  D.push({ t: "cote", a: [xh, yA], b: [xh, yA + r + 50], cote: vt.gonds === "gauche" ? "gauche" : "droite", d: 1.6, txt: ptMm(r + 50) });
  D.push({ t: "texte", p: [xh + (vt.gonds === "gauche" ? 1 : -1) * r * 0.45, yA + r * 0.3], txt: "place libre", pos: "sur" });
  void R;
}

/* ---------- 6. Vue de côté : coupe du vantail près du poteau ---------- */

function ptVueCote(c, C, haut, xa, bP, prP) {
  const M = c.M, e = M.cadre.e, gs = c.gs, yT = haut(xa), b = M.cadre.b, RG = PT_ATELIER;
  C.push({ t: "sol", x1: -bP - 300, x2: bP + 300 });
  if (prP) {
    C.push({ t: "poly", cls: "t-cache", pts: ptRect(-prP.b / 2, -RG.scellement, prP.b / 2, Math.max(yT, haut(xa)) + 50) });
    C.push({ t: "poly", cls: "t-mur", pts: ptRect(-RG.massif.cote / 2, -RG.massif.prof, RG.massif.cote / 2, 0) });
  } else C.push({ t: "poly", cls: "t-mur t-pilier", pts: ptRect(-150, 0, 150, yT + 150) });
  const x0 = -e / 2, x1 = e / 2;
  C.push({ t: "poly", piece: "Traverse basse", cls: "t-acier-plein", pts: ptRect(x0, gs, x1, gs + b) });
  C.push({ t: "poly", piece: "Traverse haute", cls: "t-acier-plein", pts: ptRect(x0, yT - b, x1, yT) });
  const epR = c.remp === "lames" ? RG.lameChene.ep : c.remp === "panneau" && c.mat === "alu" ? 4 : c.remp === "plein" || c.remp === "panneau" ? (M.plein.ep || 2) : c.remp === "lamesAlu" ? RG.lameAlu.ep : M.barreau.b;
  C.push({ t: "poly", piece: "Remplissage", cls: c.remp === "lames" ? "t-bois" : "t-acier-plein", pts: ptRect(-epR / 2, gs + b, epR / 2, yT - b) });
  if (c.soub !== "aucun") C.push({ t: "poly", piece: "Traverse intermédiaire", cls: "t-acier-plein", pts: ptRect(-M.inter.e / 2, gs + c.hSoub, M.inter.e / 2, gs + c.hSoub + RG.traverseInter) });
  if (c.lisse && c.forme === "droit") C.push({ t: "poly", piece: "Lisse en chêne", cls: "t-bois", pts: ptRect(-35, yT, 35, yT + RG.lisse.h) });
  C.push({ t: "cote", a: [x0, yT], b: [x1, yT], cote: "haut", d: 1, txt: `${e}` });
  C.push({ t: "cote", a: [x1, 0], b: [x1, gs], cote: "droite", d: 1, txt: `${gs}` });
  C.push({ t: "cote", a: [x1, gs], b: [x1, yT], cote: "droite", d: 2.4, txt: ptMm(yT - gs) });
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


export { calculerPortail, ptEntrees, svgDe, PT_STYLES, PT_MODELES, PT_ATELIER, PT_MATIERES };
export const EMPREINTE = "6de429a63dba";
