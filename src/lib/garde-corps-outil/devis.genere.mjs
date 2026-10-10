// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : NE PAS MODIFIER À LA MAIN.
// Devis garde-corps au format du site (composerDevisGC, dsDevisHtml). SANS coûts : le prix est une entrée.
// Source : l'outil de plans (plans-atelier.html), sha256 51b2608a78266473d405fc5cd2bb50cf76beb2117ad642221c37a9186da8ad9b
/* eslint-disable */
import { DS_ESSENCES, largeurMurGC } from "./moteur.genere.mjs";
function kgColisGC(R) { return Math.max(8, Math.round((R && R.kg) || 0)); }
const DS_VALIDITE_JOURS = 30;
const DS_EMETTEUR = {
    nom: "Auboiacier",
    lignes: ["Métallerie d'art — atelier à Saumur (49400), Maine-et-Loire", "auboiacier@gmail.com — auboiacier.fr", "07 82 37 23 79"],
    franchiseTva: "TVA non applicable, art. 293 B du CGI",
  };
const DS_PIED = "Auboiacier — métallerie d'art, Saumur — auboiacier.fr — auboiacier@gmail.com";
const DS_GC = {
    nom: "Garde-corps de fenêtre Rosace",
    nomSansRosace: "Garde-corps de fenêtre à croix",
    nomBarreaux: "Garde-corps de fenêtre à barreaux droits",
    delai: "4 à 6 semaines",
    teinte: "noir charbon",
    rosace: "Fleur, aluminium moulé Ø100",
    parts: { structure: 55, mainCourante: 15, peinture: 15, fixations: 15 },
    photo: "data:image/jpeg;base64,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",
  };
const dsEsc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dsFines = (t) => String(t).replace(/ /g, " ").replace(/−/g, "-");
const dsNb = (x, dec = 0) => dsFines(Number(x).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: dec }));
const dsMm = (x) => dsNb(Math.round(x));
function dsPrix(euros) {
    const d = Number.isInteger(euros) ? 0 : 2;
    return dsFines(euros.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })) + " €";
  }
const dsMaj = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const dsMin = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const dsPluriel = (n, un, plusieurs) => `${n}\u00a0${n > 1 ? plusieurs : un}`;
function dsDateLisible(d) {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(d);
  }
function dsDateCompacte(d) {
    const p = new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Paris" }).formatToParts(d);
    const lire = (t) => (p.find((x) => x.type === t) || {}).value || "";
    return `${lire("year")}${lire("month")}${lire("day")}`;
  }
function dsPlusJours(d, n) {
    const c = dsDateCompacte(d);
    return new Date(Date.UTC(+c.slice(0, 4), +c.slice(4, 6) - 1, +c.slice(6, 8) + n, 12));
  }
function dsEmpreinte(texte) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texte.length; i += 1) { h ^= texte.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36).toUpperCase().padStart(7, "0").slice(-5);
  }
function dsDate(d) {
    if (d instanceof Date && !isNaN(d)) return d;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + "T12:00:00");
    return new Date();
  }
function dsLieu(chantier) {
    const t = String(chantier || "").trim();
    const groupes = [...t.matchAll(/\b(\d{5})\b\s*([^,\d][^,]*)?/g)]
      .filter((g) => !/(?:^|[\s,])(?:BP|CS|TSA|lot|n°|n\.)\s*$/i.test(t.slice(0, g.index)));
    const m = groupes[groupes.length - 1];
    if (!m) return t;
    const nettoyer = (x) => x.replace(/\s+cedex(?:\s*\d+)?\s*$/i, "").trim();
    const commune = nettoyer(m[2] || "") || nettoyer(t.slice(0, m.index).split(",").map((x) => x.trim()).filter(Boolean).pop() || "");
    return commune ? `${commune} (${m[1]})` : m[1];
  }
function dsRemplissageGC(R, v) {
    if (R.decorNom) {
      const nb = Object.values((R.decor && R.decor.q && R.decor.q.volutes) || {}).reduce((a, b) => a + b, 0);
      const texte = `décor à volutes : ${dsMin(R.decorNom)}${nb ? ` (${dsPluriel(nb, "pièce", "pièces")})` : ""}${R.decorFinitions ? `, ${R.decorFinitions}` : ""}`;
      return { modele: "decor", n: 0, rosaces: 0, traverse: false, barreauxCroix: 0, barreauxDroits: 0, vide: null, bas: 0,
        nom: "Garde-corps forgé à volutes", accroche: `Décor à volutes en acier : ${dsMin(R.decorNom)}`, texte, structure: texte, options: [R.decorNom] };
    }
    const lignes = (re) => (R.debit || []).filter((d) => re.test(d.nom));
    const qte = (re) => lignes(re).reduce((a, d) => a + (Number(d.qte) || 0), 0);
    const bas = qte(/^Barreaux du soubassement/);
    const barreaux = lignes(/^Barreaux/).filter((d) => !/soubassement|^Barreaux de rive/i.test(d.nom));
    const nBarreaux = barreaux.reduce((a, d) => a + (Number(d.qte) || 0), 0);
    let n = qte(/^Diagonale entière/);
    const modele = !n && nBarreaux ? "barreaux" : "croix";
    if (modele === "croix" && !n) n = Math.max(1, Math.round(v.nP || 1));
    const rosaces = qte(/^Rosaces/);
    const traverse = modele === "croix" && qte(/^Demi-traverses/) > 0;
    const barreauxCroix = modele === "croix" && nBarreaux ? Math.round(nBarreaux / n) : 0;
    const barreauxDroits = modele === "barreaux" ? nBarreaux : 0;
    const mVide = modele === "barreaux" && barreaux.length ? String(barreaux[0].coupes || "").match(/vides? égaux de ([\d\s\u00a0\u202f.,]+?)\s*mm/) : null;
    const vide = mVide ? mVide[1].trim() : null;

    const rosacesTxt = dsPluriel(rosaces, "rosace", "rosaces");
    const chaque = n > 1 ? "chaque croix" : "la croix";
    const enBas = bas ? `${dsPluriel(bas, "barreau droit", "barreaux droits")} en partie basse` : null;
    const r = { modele, n: modele === "croix" ? n : 0, rosaces, traverse, barreauxCroix, barreauxDroits, vide, bas };
    if (modele === "barreaux") {
      const droits = `${dsPluriel(barreauxDroits, "barreau droit", "barreaux droits")}${vide ? `, vides de ${vide}\u00a0mm` : ""}`;
      const suite = [enBas].filter(Boolean).map((x) => `, ${x}`).join("");
      return Object.assign(r, {
        nom: DS_GC.nomBarreaux,
        accroche: `Barreaux droits en acier plein${bas ? ", barreaux en partie basse" : ""}`,
        texte: droits + suite,
        structure: droits + suite,
        options: [dsPluriel(barreauxDroits, "barreau droit", "barreaux droits"), bas ? "barreaux en bas" : null].filter(Boolean),
      });
    }
    const croix = dsPluriel(n, "croix de Saint-André", "croix de Saint-André");
    const suite = [
      traverse ? `traverse au milieu de ${chaque}` : null,
      barreauxCroix ? `${dsPluriel(barreauxCroix, "barreau", "barreaux")} dans ${chaque}` : null,
      enBas,
    ].filter(Boolean).map((x) => `, ${x}`).join("");
    return Object.assign(r, {
      nom: rosaces ? DS_GC.nom : DS_GC.nomSansRosace,
      accroche: `Croix de Saint-André en acier plein${traverse ? " avec traverse au milieu" : ""}${rosaces ? (rosaces > 1 ? ", rosaces de fonderie" : ", rosace de fonderie") : ""}${bas ? ", barreaux en partie basse" : ""}`,
      texte: `${croix}${rosaces ? ` et ${rosacesTxt}` : ""}${suite}`,
      structure: `${croix}${rosaces ? ` et ${rosacesTxt} ${dsMin(DS_GC.rosace)}` : ""}${suite}`,
      options: [
        `${n}\u00a0croix`,
        traverse ? "traverse au milieu" : null,
        barreauxCroix ? `${dsPluriel(barreauxCroix, "barreau", "barreaux")} par croix` : null,
        bas ? "barreaux en bas" : null,
      ].filter(Boolean),
    });
  }
function dsPhotoConvient(R, v, rp, avecMc) {
    const ratio = v.B / R.hauteurGC, ref = 1180 / 350;
    return rp.modele === "croix" && rp.n === 2 && rp.rosaces === 2 && !rp.traverse && !rp.barreauxCroix && !rp.bas
      && avecMc && v.mcType === "bois" && !(R.mc && R.mc.renfort) && (v.essence || "chene") === "chene" && ratio > ref * 0.8 && ratio < ref * 1.2;
  }
function dsSchemaGC(R, v, avecMc = true) {
    const face = (R.vues && R.vues.face) || [];
    const pieces = face.filter((p) => p.piece && (p.t === "poly" || p.t === "cercle") && p.cls !== "t-cache");
    if (!pieces.length || !(R.hauteurGC > 0)) return "";
    const B2 = v.B / 2, A = Math.max(0, v.A || 0), y0 = A + (v.jour || 0), haut = y0 + R.hauteurGC;
    const wM = 110, hMur = haut + 160, CASE = 140, TXT = 6.3;
    const penche = v.Bh > 0 && v.Bh !== v.B, murX = (z) => (penche ? largeurMurGC(v, z) : v.B) / 2, B2x = penche ? Math.max(B2, murX(hMur)) : B2;
    const long = (t, f) => String(t).length * 0.56 * f;
    const cotes = (f) => {
      const xR1 = B2x + wM + 1.45 * f, xR2 = xR1 + 1.45 * f, xL = -B2x - wM - 1.45 * f, yH = hMur + 0.9 * f;
      return { xR1, xR2, xL, yH, x1: xL - 1.15 * f, x2: xR2 + 0.35 * f, y1: -0.5 * f, y2: yH + 1.15 * f };
    };
    let f = 90, c = cotes(f), u = 1;
    for (let i = 0; i < 12; i++) { c = cotes(f); u = Math.max(c.x2 - c.x1, c.y2 - c.y1) / CASE; f = TXT * u; }
    c = cotes(f);
    const Y = (y) => (-y).toFixed(1), X = (x) => x.toFixed(1);
    const trait = (w) => (w * u).toFixed(2);
    let s = "";
    s += `<polygon points="${[[-B2x - wM, 0], [B2x + wM, 0], [B2x + wM, hMur], [murX(hMur), hMur], [B2, A], [-B2, A], [-murX(hMur), hMur], [-B2x - wM, hMur]].map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}" fill="#efebe5" stroke="#cfc7bb" stroke-width="${trait(0.4)}"/>`;
    s += `<line x1="${X(-B2x - wM - 0.6 * f)}" y1="0" x2="${X(B2x + wM + 0.6 * f)}" y2="0" stroke="#9a8f84" stroke-width="${trait(0.6)}"/>`;
    const COUL = { "t-acier-plein": ["#2b2320", "#2b2320"], "t-bois": ["#c9a46e", "#8a6238"], "t-rond": ["#7d736a", "#2b2320"] };
    for (const p of pieces) {
      const [fond, bord] = COUL[p.cls] || COUL["t-acier-plein"];
      if (p.t === "poly") s += `<polygon points="${p.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}" fill="${fond}" stroke="${bord}" stroke-width="${trait(0.25)}" stroke-linejoin="round"/>`;
      else s += `<circle cx="${X(p.c[0])}" cy="${Y(p.c[1])}" r="${p.r.toFixed(1)}" fill="${fond}" stroke="${bord}" stroke-width="${trait(0.3)}"/>`;
    }
    const tick = 0.32 * f, gris = `stroke="#6f6357" stroke-width="${trait(0.35)}"`;
    const texte = (x, y, t, rot) => `<text x="${X(x)}" y="${Y(y)}" font-size="${f.toFixed(1)}" font-family="Helvetica, Arial, sans-serif" fill="#2b2320" text-anchor="middle"${rot ? ` transform="rotate(-90 ${X(x)} ${Y(y)})"` : ""}>${dsEsc(t)}</text>`;
    const verticale = (x, ya, yb, xa, xb, t) => {
      const bout = (xd) => x + (xd > x ? -tick : tick);
      let o = `<line x1="${X(xa)}" y1="${Y(ya)}" x2="${X(bout(xa))}" y2="${Y(ya)}" ${gris}/><line x1="${X(xb)}" y1="${Y(yb)}" x2="${X(bout(xb))}" y2="${Y(yb)}" ${gris}/>`;
      o += `<line x1="${X(x)}" y1="${Y(ya)}" x2="${X(x)}" y2="${Y(yb)}" ${gris}/>`;
      for (const y of [ya, yb]) o += `<line x1="${X(x - tick)}" y1="${Y(y - tick)}" x2="${X(x + tick)}" y2="${Y(y + tick)}" ${gris}/>`;
      const l = long(t, f), yt = l < yb - ya - 0.5 * f ? (ya + yb) / 2 : yb + 0.4 * f + l / 2;
      return o + texte(x - 0.35 * f, yt, t, true);
    };
    const xg = Math.max(...pieces.filter((p) => p.t === "poly").flatMap((p) => p.pts.map((q) => q[0])));
    const Bt = murX(hMur);
    s += `<line x1="${X(-Bt)}" y1="${Y(hMur + 0.15 * f)}" x2="${X(-Bt)}" y2="${Y(c.yH + tick)}" ${gris}/><line x1="${X(Bt)}" y1="${Y(hMur + 0.15 * f)}" x2="${X(Bt)}" y2="${Y(c.yH + tick)}" ${gris}/>`;
    s += `<line x1="${X(-Bt)}" y1="${Y(c.yH)}" x2="${X(Bt)}" y2="${Y(c.yH)}" ${gris}/>`;
    for (const x of [-Bt, Bt]) s += `<line x1="${X(x - tick)}" y1="${Y(c.yH - tick)}" x2="${X(x + tick)}" y2="${Y(c.yH + tick)}" ${gris}/>`;
    const ltS = dsLargeurGC(v);
    s += texte(0, c.yH + 0.35 * f, ltS ? `${ltS.bas} en bas, ${ltS.haut} à ${ltS.hauteur} du sol` : dsMm(v.B));
    s += verticale(c.xR1, y0, haut, xg + 0.2 * f, xg + 0.2 * f, dsMm(R.hauteurGC));
    s += verticale(c.xR2, 0, haut, B2x + wM + 0.2 * f, c.xR1 + tick, `${dsMm(haut)} du sol`);
    if (A > 0) s += verticale(c.xL, 0, A, -B2x - wM - 0.2 * f, -B2x - wM - 0.2 * f, dsMm(A));
    const vb = [c.x1, -c.y2, c.x2 - c.x1, c.y2 - c.y1].map((x) => x.toFixed(1)).join(" ");
    const titre = `Schéma du garde-corps vu de l'intérieur : ${ltS ? `${ltS.bas} mm entre tableaux en bas, ${ltS.haut} mm à ${ltS.hauteur} du sol` : `${dsMm(v.B)} mm entre tableaux`}, ${dsMm(R.hauteurGC)} mm de haut, ${avecMc ? "main courante" : "haut du garde-corps"} à ${dsMm(haut)} mm du sol`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${dsEsc(titre)}">${s}</svg>`;
  }
function dsLargeurGC(v) {
    if (!(v.Bh > 0 && v.Bh !== v.B)) return null;
    const hM = Math.max(1000, (v.A || 0) + 150);
    return { bas: dsMm(v.B), haut: dsMm(v.Bh), hauteur: hM === 1000 ? "1\u00a0m" : `${dsMm(hM)}\u00a0mm` };
  }
function composerDevisGC({ R, v, prix, rem, infos = {}, image = "auto", tva = null }) {
    if (!R || !(R.hauteurGC > 0) || !R.debit || !R.debit.length) {
      return { ok: false, raison: "Pas de devis : le garde-corps est trop petit pour ce nombre de croix. Change les cotes ou le nombre de croix." };
    }
    prix = Math.round(Number(prix) * 100) / 100;
    if (!(prix > 0)) return { ok: false, raison: "Pas de devis : le prix de vente est vide." };
    const date = dsDate(infos.date);
    const trouve = (re) => R.debit.find((d) => re.test(d.nom));
    const mcD = R.debit.find((d) => d.nom === "Main courante"), vis = trouve(/^Vis ou goujons/);
    const rp = dsRemplissageGC(R, v);
    const nom = rp.nom;
    const nVis = vis ? vis.qte : 2 * v.nF;
    const nPlatinesD = R.debit.filter((d) => d.nom === "Platines de fixation").reduce((t, d) => t + d.qte, 0);
    const H = Math.round(R.hauteurGC), L = Math.round(v.B), lt = dsLargeurGC(v);
    const haut = (v.A || 0) + (v.jour || 0) + R.hauteurGC;
    const essence = DS_ESSENCES[v.essence] || DS_ESSENCES.chene;
    const teinte = DS_GC.teinte;
    const remise = v.remise === "transporteur" || v.remise === "pose" ? v.remise : "retrait";
    const km = Math.max(0, Math.round(v.km || 0));
    const obligatoire = v.etage && v.A < 900;

    const mcL = R.mc ? R.mc.l : v.mc, mcH = R.mc ? R.mc.h : v.mc;
    const rfD = R.mc && R.mc.renfort ? R.mc.renfort : null;
    const renfortTxt = (rfD ? `, lisse haute renforcée par un plat ${dsMm(rfD.l)}\u00a0×\u00a0${dsMm(rfD.e)}\u00a0mm caché sous la main courante` : "")
      + ((() => { const p = R.debit.find((d) => /^Pattes? de scellement/.test(d.nom)); return p ? (p.qte > 1 ? `, ${p.qte} pattes scellées dans l'appui` : ", patte au milieu, scellée dans l'appui") : ""; })());
    const mc = !mcD ? null
      : v.mcType === "profil" ? { option: "Main courante profilée 40\u00a0×\u00a010", carac: "Acier profilé 40\u00a0×\u00a010\u00a0mm, emboîté sur le cadre, finition peinte", poste: "Main courante en acier profilé 40\u00a0×\u00a010\u00a0mm, emboîtée sur le cadre, finition peinte", accroche: "acier profilé" }
      : v.mcType === "acier" ? { option: `Main courante plat acier ${dsMm(v.mc)}\u00a0×\u00a0${dsMm(v.epMc)}`, carac: `Plat d'acier ${dsMm(v.mc)}\u00a0×\u00a0${dsMm(v.epMc)}\u00a0mm, soudé sur le cadre, finition peinte`, poste: `Main courante en plat d'acier ${dsMm(v.mc)}\u00a0×\u00a0${dsMm(v.epMc)}\u00a0mm, soudée sur le cadre, finition peinte`, accroche: "plat d'acier" }
      : {
        option: essence,
        carac: `${essence}, massif, ${dsMm(mcL)}\u00a0×\u00a0${dsMm(mcH)}\u00a0mm, huile-cire, satinée${rfD ? `, vissée par dessous sur un plat d'acier ${dsMm(rfD.l)}\u00a0×\u00a0${dsMm(rfD.e)}\u00a0mm` : /^Rainure/.test(mcD.coupes || "") ? ", emboîtée sur le cadre" : ""}`,
        poste: `Main courante ${essence.toLowerCase()} massif ${dsMm(mcL)}\u00a0×\u00a0${dsMm(mcH)}\u00a0mm, finition huile-cire`,
        accroche: essence.toLowerCase(),
      };

    const normes = R.alertes.length ? null
      : obligatoire ? `Hauteur ${v.Hs >= 200 ? "vérifiée" : "calculée"} selon l'art. R134-59 du Code de la construction ; espaces entre les barres selon la NF P01-012`
      : `Remplissage conforme à la NF P01-012 ; ${v.etage ? "allège de 900 mm ou plus" : "au rez-de-chaussée"}, la loi n'impose pas de hauteur`;
    const releve = [
      v.etage ? "En étage" : "Au rez-de-chaussée",
      `hauteur du sol au bas de la fenêtre ${dsMm(v.A)}\u00a0mm`,
      v.Hf > 0 ? `hauteur de la fenêtre, de l'appui au haut ${dsMm(v.Hf)}\u00a0mm` : "",
      v.Xo > 0 ? `meuble ou radiateur sous la fenêtre ${dsMm(v.Xo)}\u00a0mm` : "",
      v.jour > 0 ? `posé à ${dsMm(v.jour)}\u00a0mm au-dessus de l'appui` : "",
      `${mc ? "main courante" : "haut du garde-corps"} à ${dsMm(haut)}\u00a0mm du sol`,
    ].filter(Boolean).join(" · ");
    const caracteristiques = [
      { label: "Largeur entre tableaux", value: lt ? `${lt.bas}\u00a0mm en bas, ${lt.haut}\u00a0mm à ${lt.hauteur} du sol` : `${dsMm(L)}\u00a0mm` },
      { label: "Hauteur du garde-corps", value: `${dsMm(H)}\u00a0mm` },
      { label: "Remplissage", value: dsMaj(rp.texte) },
      rp.rosaces ? { label: "Rosace", value: DS_GC.rosace } : null,
      { label: "Structure", value: `Acier plein ${dsMm(v.s)}\u00a0×\u00a0${dsMm(v.s)}\u00a0mm${renfortTxt}, soudure TIG, finition peinte — teinte de l'acier ${teinte}` },
      mc ? { label: "Main courante", value: mc.carac } : null,
      { label: "Pose", value: R.fixation
        ? `Encastré dans le tableau de la fenêtre, ${remise === "pose" ? "posé par l'atelier" : "fixations fournies"} — ${R.fixation.texteClient}`
        : `Encastré dans le tableau de la fenêtre, ${remise === "pose" ? "posé par l'atelier" : "fixations fournies"} — ${nPlatinesD ? `${nPlatinesD}\u00a0petites platines soudées au bout des barres du haut et du bas du cadre, plaquées contre le mur, ` : ""}${nVis}\u00a0vis à tête fraisée et chevilles` },
      normes ? { label: "Normes", value: normes } : null,
      { label: "Cotes relevées", value: releve },
    ].filter(Boolean);

    let img = null;
    const photo = image === "photo" || (image === "auto" && dsPhotoConvient(R, v, rp, !!mcD));
    if (photo && DS_GC.photo.length > 40) img = { type: "photo", src: DS_GC.photo };
    else { const svg = dsSchemaGC(R, v, !!mcD); if (svg) img = { type: "svg", svg }; }

    const options = [`Sur mesure — ${dsMm(L)}\u00a0×\u00a0${dsMm(H)}\u00a0mm`, ...rp.options, mc ? mc.option : null, dsMaj(teinte), rp.rosaces ? DS_GC.rosace : null].filter(Boolean).join(" · ");
    const postes = [
      { cle: "structure", designation: `Structure acier plein — ${dsMm(L)}\u00a0×\u00a0${dsMm(H)}\u00a0mm, ${rp.structure}${renfortTxt}, soudure TIG` },
      mc ? { cle: "mainCourante", designation: mc.poste } : null,
      { cle: "peinture", designation: `Finition peinte de l'acier — teinte ${teinte}` },
      { cle: "fixations", designation: remise === "transporteur" ? "Fixations, notice de pose et emballage" : "Fixations et notice de pose" },
    ].filter(Boolean);
    const parts = postes.map((p) => DS_GC.parts[p.cle] + (p.cle === "structure" && !mc ? DS_GC.parts.mainCourante : 0));
    const montants = parts.map((part) => Math.round((prix * part) / 100));
    montants[0] += prix - montants.reduce((a, m) => a + m, 0);
    const lignes = [{ designation: `${nom} — ${options}`, details: [], quantite: 1, unitaire: 0, total: 0, titre: true }]
      .concat(postes.map((p, i) => ({ designation: p.designation, details: [], quantite: 1, unitaire: montants[i], total: montants[i] })));

    const lieu = dsLieu(infos.chantier);
    if (remise === "transporteur") {
      lignes.push({
        designation: `Livraison par transporteur${lieu ? ` — ${lieu}` : ""}`,
        details: [`Livrée prête à poser, emballée à l'atelier. Colis estimé à **${dsNb(kgColisGC(R))}\u00a0kg**.`, `Prix estimé selon la ville, le poids et les dimensions, à ${dsNb(km)}\u00a0km de Saumur.`],
        quantite: 1, unitaire: rem.prix, total: rem.prix,
      });
    } else if (remise === "pose") {
      lignes.push({
        designation: `Livraison et pose par l'atelier${lieu ? ` — ${lieu}` : ""}`,
        details: [`Un seul déplacement depuis Saumur (${dsNb(km)}\u00a0km) : livraison et encastrement dans le tableau de la fenêtre, par nos soins.`],
        quantite: 1, unitaire: rem.prix, total: rem.prix,
      });
    }
    const total = Math.round(lignes.reduce((a, l) => a + l.total, 0) * 100) / 100;

    const conditions = [
      "Devis gratuit, établi sans engagement à partir des cotes relevées et des choix indiqués ci-dessus.",
      "Prix en euros, montant total à payer ; le régime de TVA de l'atelier est rappelé sur la facture.",
      `Devis valable ${DS_VALIDITE_JOURS} jours à compter de sa date, pour la configuration décrite ci-dessus.`,
      "Paiement à la commande, en une fois.",
      "Chaque pièce est fabriquée à la commande dans notre atelier : le délai indiqué court à compter du paiement.",
      remise === "transporteur" ? "Livraison sur rendez-vous, au pied du camion, sans montage. Le prix de transport est estimé à la commande d'après le poids, les dimensions et la distance."
        : remise === "pose" ? "Livraison et pose sur rendez-vous, en un seul déplacement ; l'accès et l'emplacement doivent être dégagés le jour convenu."
        : "Pièce à retirer à l'atelier, à Saumur, sur rendez-vous.",
      "Pièce fabriquée aux spécifications du client : le droit de rétractation de quatorze jours ne s'applique pas (art. L221-28 3° du code de la consommation).",
      mc && v.mcType === "bois"
        ? "Garantie légale de conformité (deux ans à compter de la livraison) et garantie légale des vices cachés. Le bois et l'acier sont des matières vivantes : de légères variations de teinte et de veinage sont normales."
        : "Garantie légale de conformité (deux ans à compter de la livraison) et garantie légale des vices cachés.",
      "Les conditions générales de vente, disponibles sur auboiacier.fr/fr/cgv, s'appliquent à toute commande.",
    ];

    const emetteur = tva === 0 ? { nom: DS_EMETTEUR.nom, lignes: DS_EMETTEUR.lignes.concat(DS_EMETTEUR.franchiseTva) } : { nom: DS_EMETTEUR.nom, lignes: DS_EMETTEUR.lignes.slice() };
    const devis = {
      nature: "devis",
      numero: "",
      date: dsDateLisible(date),
      validite: dsDateLisible(dsPlusJours(date, DS_VALIDITE_JOURS)),
      emetteur,
      client: { nom: infos.client || undefined, adresse: infos.chantier || undefined, email: infos.email || undefined, telephone: infos.telephone || undefined },
      piece: {
        nom,
        accroche: `${rp.accroche}${mc ? `, main courante en ${mc.accroche}` : ""}. Fabriqué au millimètre, encastré dans votre fenêtre.`,
        image: img,
        caracteristiques,
      },
      lignes,
      total,
      delai: DS_GC.delai,
      conditions,
      lienFiche: null,
    };
    const imprime = { ...devis, date: undefined, validite: undefined, piece: { ...devis.piece, image: img ? (img.type === "svg" ? img.svg : "photo") : null } };
    devis.numero = `D-${dsDateCompacte(date)}-${dsEmpreinte(JSON.stringify(imprime))}`;
    return { ok: true, devis };
  }
function dsDevisHtml(devis) {
    const e = dsEsc;
    const gras = (t) => e(t).split("**").map((m, i) => (i % 2 ? `<b>${m}</b>` : m)).join("");
    const c = devis.client || {};
    const clientRempli = c.nom || c.adresse || c.email || c.telephone;
    const img = devis.piece.image;
    const blocs = [];
    blocs.push(`<div class="ds-bloc ds-entete">
      <div class="ds-marque-bloc"><div class="ds-marque">AUBOIACIER</div><div class="ds-marque-sous ds-kp">${e(devis.emetteur.lignes[0])}</div></div>
      <div class="ds-titres"><div class="ds-titre">${e(devis.titreDoc || "Devis")}</div>${devis.piece.nom ? `<div class="ds-titre-piece">${e(devis.piece.nom)}</div>` : ""}
        <div class="ds-meta"><span class="ds-meta-l">N°</span><span class="ds-meta-v">${e(devis.numero)}</span></div>
        <div class="ds-meta"><span class="ds-meta-l">Date</span><span class="ds-meta-v">${e(devis.date)}</span></div>
        ${devis.validite === null ? "" : `<div class="ds-meta"><span class="ds-meta-l">Valable jusqu'au</span><span class="ds-meta-v">${e(devis.validite)}</span></div>`}</div>
    </div>`);
    blocs.push(`<div class="ds-bloc ds-filet"></div>`);
    blocs.push(`<div class="ds-bloc ds-colonnes">
      <div class="ds-col"><div class="ds-etiquette">Émetteur</div><div class="ds-nom ds-kp">${e(devis.emetteur.nom)}</div>${devis.emetteur.lignes.map((l) => `<div class="ds-gris ds-kp">${e(l)}</div>`).join("")}</div>
      <div class="ds-col"><div class="ds-etiquette">Client</div>${clientRempli
        ? `${c.nom ? `<div class="ds-nom ds-kp">${e(c.nom)}</div>` : ""}${[c.adresse, c.email, c.telephone].filter(Boolean).map((l) => `<div class="ds-gris ds-kp">${e(l)}</div>`).join("")}`
        : `<div class="ds-gris">Nom, adresse</div><div class="ds-client-vide"></div>`}</div>
    </div>`);
    if (img || devis.piece.caracteristiques.length) {
      blocs.push(`<div class="ds-bloc ds-section-piece"><div class="ds-etiquette">Votre pièce</div>
        <div class="ds-piece">${img ? `<div class="ds-photo">${img.type === "svg" ? img.svg : `<img src="${e(img.src)}" alt="">`}</div>` : ""}
          <div class="ds-piece-texte"><div class="ds-piece-nom ds-kp">${e(devis.piece.nom)}</div><div class="ds-accroche ds-kp">${e(devis.piece.accroche)}</div>
            <div class="ds-caracs">${devis.piece.caracteristiques.map((k) => `<div class="ds-carac"><div class="ds-carac-l ds-kp">${e(k.label)}</div><div class="ds-carac-v ds-kp">${e(k.value)}</div></div>`).join("")}</div>
          </div></div></div>`);
    }
    blocs.push(`<div class="ds-bloc ds-tab-entete"><div class="ds-c-des ds-etiquette">Désignation</div><div class="ds-c-qte ds-etiquette">Qté</div><div class="ds-c-pu ds-etiquette">Prix unitaire</div><div class="ds-c-tot ds-etiquette">Total</div></div>`);
    for (const l of devis.lignes) {
      if (l.titre) blocs.push(`<div class="ds-bloc ds-ligne-titre"><div class="ds-des-titre ds-kp">${e(l.designation)}</div>${l.details.map((d) => `<div class="ds-detail ds-kp">${gras(d)}</div>`).join("")}</div>`);
      else blocs.push(`<div class="ds-bloc ds-ligne"><div class="ds-c-des"><div class="ds-des ds-kp">${e(l.designation)}</div>${l.details.map((d) => `<div class="ds-detail ds-kp">${gras(d)}</div>`).join("")}</div>`
        + `<div class="ds-c-qte ds-chiffre">${e(l.quantite)}</div><div class="ds-c-pu ds-chiffre">${dsPrix(l.unitaire)}</div><div class="ds-c-tot ds-chiffre">${dsPrix(l.total)}</div></div>`);
    }
    blocs.push(`<div class="ds-bloc ds-totaux"><div class="ds-total-l">Total</div><div class="ds-total-v">${dsPrix(devis.total)}</div></div>`);
    if (devis.acompte) blocs.push(`<div class="ds-bloc ds-encart ds-acompte"><div class="ds-encart-t ds-kp"><b>${e(devis.acompte.texte)}</b></div></div>`);
    blocs.push(`<div class="ds-bloc ds-encart"><div class="ds-encart-t ds-kp">${devis.delaiTexte ? `Délai : ${e(devis.delaiTexte)}.` : `Délai de fabrication : ${e(devis.delai)}, à compter du paiement.`}</div></div>`);
    for (const enc of devis.encarts || []) blocs.push(`<div class="ds-bloc ds-conditions"><div class="ds-etiquette">${e(enc.titre)}</div>${enc.lignes.map((t) => `<div class="ds-cond"><div class="ds-puce">—</div><div class="ds-cond-t ds-kp">${e(t)}</div></div>`).join("")}</div>`);
    blocs.push(`<div class="ds-bloc ds-conditions"><div class="ds-etiquette">Conditions</div>${devis.conditions.map((t) => `<div class="ds-cond"><div class="ds-puce">—</div><div class="ds-cond-t ds-kp">${e(t)}</div></div>`).join("")}</div>`);
    if (devis.accord !== false) blocs.push(`<div class="ds-bloc ds-accord"><div class="ds-accord-boite"><div class="ds-accord-titre">Bon pour accord</div><div class="ds-accord-texte ds-kp">Date et signature, précédées de « Bon pour accord »</div></div>`
      + `<div class="ds-commander">${devis.lienFiche ? `<div class="ds-gris">Pour commander en ligne, aux conditions de ce devis :</div><div class="ds-lien">${e(devis.lienFiche.replace(/^https?:\/\//, ""))}</div>` : ""}</div></div>`);
    return `<div class="ds-feuilles">${dsPageHtml(blocs.join(""), 1, 1)}</div>`;
  }
function dsPageHtml(corps, n, total) {
    return `<section class="ds-page"><div class="ds-corps">${corps}</div><div class="ds-pied"><span>${dsEsc(DS_PIED)}</span></div><div class="ds-num"><span>Page ${n} / ${total}</span></div></section>`;
  }
export const EMPREINTE_SOURCE = "51b2608a78266473d405fc5cd2bb50cf76beb2117ad642221c37a9186da8ad9b";
export { DS_GC, DS_VALIDITE_JOURS, composerDevisGC, dsDevisHtml, dsPrix };
export const EMPREINTE = "61616692e1b4";
