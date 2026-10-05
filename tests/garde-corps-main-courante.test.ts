/**
 * LA MAIN COURANTE ET LE PLAN D'APERÇU (demande de Quentin, 05/10/2026) :
 *  - quatre mains courantes au choix (bois rainuré, bois sur fer plat, acier plat, acier profilé), chacune avec son prix — celui de
 *    l'outil, pour la fenêtre du client ; une qui ne passe pas la norme n'est pas proposée ;
 *  - leurs coupes sont dessinées par l'outil de plans (coupes.genere.ts), pas par le site ;
 *  - « Voir le plan » montre le Plan A3 de l'outil, SANS liste de débit, détail de fixation ni perçage.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculerGC } from "../src/lib/garde-corps-outil/moteur.genere.mjs";
import { COUPES_MAIN_COURANTE_GC } from "../src/lib/garde-corps-coupes.genere.ts";
import { configurationGC, ligneGC, planApercuGC, reponsePrixGC, type RequetePrixGC } from "../src/lib/garde-corps-outil/site.ts";
import { MAINS_COURANTES_GC, idMainCouranteGC, lireMainCouranteGC, lirePlanApercuGC, lireReponsePrixGC, modeleAfficheGC } from "../src/lib/garde-corps.ts";

const releve = (largeurMm: number, allegeMm = 650, fenetreMm = 0) => ({ largeurMm, allegeMm, enEtage: true, fenetreMm });
const q = (largeurMm: number, allegeMm = 650, essence: RequetePrixGC["essence"] = "chene"): RequetePrixGC => ({ releve: releve(largeurMm, allegeMm), essence, fabricId: "fleur", quantite: 1 });

test("les identifiants de main courante : un type, une essence", () => {
  assert.deepEqual(lireMainCouranteGC("chene"), { type: "bois-rainure", essence: "chene" });
  assert.deepEqual(lireMainCouranteGC("noyer-plat"), { type: "bois-plat", essence: "noyer" });
  assert.deepEqual(lireMainCouranteGC("acier"), { type: "acier-plat", essence: null });
  assert.deepEqual(lireMainCouranteGC("profil"), { type: "acier-profile", essence: null });
  for (const mauvais of ["", "chene-rainure", "acier-plat", "__proto__", "plat"]) assert.equal(lireMainCouranteGC(mauvais), null, mauvais);
  for (const id of MAINS_COURANTES_GC) {
    const m = lireMainCouranteGC(id)!;
    assert.equal(idMainCouranteGC(m.type, m.essence ?? "chene"), id);
  }
});

test("le prix de chaque main courante est celui du panier ; une qui ne convient pas est absente", () => {
  let propose = 0, absent = 0;
  for (const [l, a] of [[1180, 650], [855, 610], [1500, 300], [900, 735], [1990, 650]] as const) {
    const r = reponsePrixGC(q(l, a));
    assert.ok(r, `${l} × ${a}`);
    assert.deepEqual(lireReponsePrixGC(JSON.parse(JSON.stringify(r))), r, "la réponse se relit");
    for (const id of MAINS_COURANTES_GC) {
      const prix: number | undefined = r.mains[id];
      // Le dessin affiché (sans choix : le moins cher à croix) est gardé quand la main courante l'accepte, comme au panier.
      const gardee: ReturnType<typeof ligneGC> | null = r.ok ? ligneGC({ ...releve(l, a), modele: modeleAfficheGC(r) }, { woodId: id, fabricId: "fleur" }) : null;
      const ligne: ReturnType<typeof ligneGC> = gardee?.ok ? gardee : ligneGC(releve(l, a), { woodId: id, fabricId: "fleur" });
      if (prix === undefined) { absent++; continue; }
      propose++;
      assert.ok(ligne.ok, `${id} proposé pour ${l} × ${a} : il se commande`);
      assert.equal(prix, ligne.line.unitPrice, `${id} ${l} × ${a} : le prix annoncé est celui du panier`);
    }
  }
  assert.ok(propose >= 20 && absent >= 3, `des mains courantes proposées (${propose}) et des refusées (${absent})`);
});

test("fenêtre large : l'outil pose le bois sur un fer plat — « rainuré » n'est pas proposé, « sur fer plat » l'est, au même prix", () => {
  const r = reponsePrixGC(q(1990))!;
  assert.ok(r.ok && r.renfort, "à 1990 mm, le fer plat est imposé");
  assert.equal(r.mains.chene, undefined);
  assert.equal(r.mains["chene-plat"], r.prix);
  // La ligne de panier dit ce qui sera fabriqué.
  const l = ligneGC(releve(1990), { woodId: "chene", fabricId: "fleur" });
  assert.ok(l.ok);
  assert.match(l.line.optionsLabel, /sur fer plat/);
});

test("le bois sur fer plat demandé : le fer plat est là (renfort), le bois fait 60 × 45", () => {
  const c = configurationGC(releve(1180), "chene-plat");
  assert.ok(c?.ok && c.renfort);
  const R = calculerGC({ ...c.v });
  assert.ok(R.mc && R.mc.renfort && R.mc.l === 60 && R.mc.h === 45 && R.mc.renfort.l === 60 && R.mc.renfort.e === 10, JSON.stringify(R.mc));
  const rainure = configurationGC(releve(1180), "chene");
  assert.ok(rainure?.ok && !rainure.renfort);
  const Rr = calculerGC({ ...rainure.v });
  assert.ok(Rr.mc && !Rr.mc.renfort && Rr.mc.l === 40 && Rr.mc.h === 40 && Rr.mc.chev === 14);
});

test("les quatre coupes viennent de l'outil : des traits, aux cotes de l'outil, avec le profilé à dessus bombé", () => {
  for (const type of ["bois-rainure", "bois-plat", "acier-plat", "acier-profile"] as const) {
    const c = COUPES_MAIN_COURANTE_GC[type];
    assert.ok(c.vb.length === 4 && c.vb.every(Number.isFinite) && c.html.length > 50, type);
    assert.ok(!/<(?!\/?(polygon|polyline)\b)/.test(c.html), `${type} : seulement des polygones`);
  }
  // Le profilé : la section de l'outil a un dessus bombé (12 segments d'arc) ; le fer plat, un simple rectangle.
  const points = (type: keyof typeof COUPES_MAIN_COURANTE_GC) => [...COUPES_MAIN_COURANTE_GC[type].html.matchAll(/points="([^"]+)"/g)].map((m) => m[1].trim().split(/\s+/).length);
  assert.ok(Math.max(...points("acier-profile")) > 12, "profilé bombé");
  assert.deepEqual(points("acier-plat"), [4, 4], "lisse + fer plat : deux rectangles");
});

test("le plan d'aperçu est le Plan A3 de l'outil, sans liste de débit ni détail de fabrication", () => {
  for (const [l, a, essence] of [[855, 610, "chene"], [1180, 650, "acier"], [1990, 650, "chene-plat"], [1180, 650, "profil"]] as const) {
    const plan = planApercuGC(q(l, a, essence));
    assert.ok(plan, `${l} × ${a} ${essence}`);
    const lu = lirePlanApercuGC(JSON.parse(JSON.stringify(plan)));
    assert.deepEqual(lu, plan, "la réponse se relit");
    const texte = [...plan.svg.matchAll(/>([^<]+)</g)].map((m) => m[1]).join("\n");
    // Ce que la feuille montre : le cartouche, les vues, le filigrane.
    for (const attendu of [/AUBOIACIER/, /VUE DE FACE/, /VUE DE DESSUS/, /VUE DE CÔTÉ/, /APERÇU/, /hors tout/, /VOTRE GARDE-CORPS/]) assert.match(texte, attendu, String(attendu));
    // Ce qu'elle ne montre pas : de quoi refaire le garde-corps (débit, fixation, perçages, repères de pièces).
    for (const interdit of [/LISTE DE D[ÉE]BIT/, /D[ÉE]TAIL B/, /COUPE C-C/, /FIXATION/, /per[çc]age/i, /Rep\. \d/, /À ACHETER/, /Demi-diagonale|Diagonale|Montants de rive|Lisse haute|Lisse basse/, /\d+x \d+ mm/]) {
      assert.doesNotMatch(texte, interdit, `${l} × ${a} ${essence} : pas de ${interdit}`);
    }
  }
});

test("le plan d'aperçu : pas de plan pour ce qui est à étudier ; la réponse refuse tout ce qui n'est pas un dessin", () => {
  assert.equal(planApercuGC(q(3000, 0)), null, "trop large et trop haut, même avec des pattes : à étudier");
  const ok = planApercuGC(q(1180))!;
  const base = JSON.parse(JSON.stringify(ok));
  assert.ok(lirePlanApercuGC(base));
  for (const faux of [
    { ...base, svg: base.svg.replace("</svg>", "<script>alert(1)</script></svg>") },
    { ...base, svg: base.svg.replace("<rect", '<image href="https://exemple.fr/x.png"/><rect') },
    { ...base, svg: base.svg.replace("<rect", '<rect onload="x()"') },
    { ...base, svg: "<div>pas un svg</div>" },
    { ...base, svg: "x".repeat(700_000) },
    { ...base, croix: -1 },
    { ...base, seuls: "non" },
    null, "texte", {},
  ]) assert.equal(lirePlanApercuGC(faux), null, JSON.stringify(faux).slice(0, 80));
});
