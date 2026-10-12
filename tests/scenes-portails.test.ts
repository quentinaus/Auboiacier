import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { configDepart, configDepuisAdresse, COULEURS_PORTAIL, planPortail, SLUGS_PORTAIL, STYLES_PORTAIL } from "../src/lib/portails.ts";
import { TEINTES_PORTAIL } from "../src/lib/portails-rendu.ts";
import {
  CIEL, configCarte, configVitrine, DOSSIER_SCENES, fabriquer, fabriquerScene, FENETRES, limiteDe, listeScenes, SOL,
} from "../scripts/dessins-scenes-portails.mjs";

/**
 * Les scènes de la page des portails (public/images/portails/scenes) : le dessin de face du moteur de l'outil de plans,
 * habillé de la teinte, avec le ciel et le sol dans le fichier, chargé en <img>. Elles sont écrites par
 * `npm run portails:scenes` ; ces tests vérifient qu'elles existent toutes, qu'elles tiennent dans leurs poids, qu'elles
 * ne portent rien de la fiche (pièces cliquables, étiquettes) et que le script les refait octet pour octet.
 */

const scenes = listeScenes() as { chemin: string; slug: keyof typeof SLUGS_PORTAIL; cfg: ReturnType<typeof configDepart>; fenetre: "vitrine" | "carte" }[];
const lire = (chemin: string) => readFileSync(join(DOSSIER_SCENES, chemin), "utf8");
const viewBoxAttendu = { vitrine: "0 0 1300 743", carte: "0 0 600 400" } as const;

test("les 77 scènes : 42 de vitrine, 28 de cartes, 7 coulissants sans rail", () => {
  assert.equal(scenes.length, 77);
  assert.equal(scenes.filter((s) => s.chemin.startsWith("vitrine/")).length, STYLES_PORTAIL.length * COULEURS_PORTAIL.length);
  assert.equal(scenes.filter((s) => s.chemin.startsWith("cartes/") && !s.chemin.endsWith("-auto.svg")).length, 4 * STYLES_PORTAIL.length);
  assert.equal(scenes.filter((s) => s.chemin.endsWith("-auto.svg")).length, STYLES_PORTAIL.length);
  assert.equal(new Set(scenes.map((s) => s.chemin)).size, 77);
  for (const s of scenes) assert.ok(existsSync(join(DOSSIER_SCENES, s.chemin)), `${s.chemin} manque : npm run portails:scenes`);
});

test("les noms de fichiers sont ceux que la page demande", () => {
  for (const style of STYLES_PORTAIL) {
    for (const t of COULEURS_PORTAIL) assert.ok(scenes.some((s) => s.chemin === `vitrine/battant-${style}-${t}.svg`));
    for (const slug of Object.keys(SLUGS_PORTAIL)) assert.ok(scenes.some((s) => s.chemin === `cartes/${slug}-${style}.svg`));
    assert.ok(scenes.some((s) => s.chemin === `cartes/portail-coulissant-${style}-auto.svg`));
  }
});

test("chaque scène est un SVG autonome au bon cadre, sans rien de la fiche", () => {
  for (const s of scenes) {
    const svg = lire(s.chemin);
    const box = viewBoxAttendu[s.fenetre];
    const [, , w, h] = box.split(" ");
    assert.ok(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box}">`), `${s.chemin} : entête`);
    assert.ok(svg.includes("<style>"), `${s.chemin} : sa propre feuille de style`);
    assert.ok(svg.includes(`fill="${CIEL}"`) && svg.includes(`fill="${SOL}"`), `${s.chemin} : ciel et sol`);
    for (const interdit of ["data-piece", "cliquable", "aria-label", "role=", "<text", "<script", "<image", "href="])
      assert.ok(!svg.includes(interdit), `${s.chemin} contient « ${interdit} »`);
    // Une seule racine, bien fermée.
    assert.equal(svg.match(/<svg/g)?.length, 1, s.chemin);
    assert.ok(svg.trimEnd().endsWith("</svg>"), s.chemin);
  }
});

test("le manifeste liste les 77 fichiers, leur taille et leur cadre", () => {
  const m = JSON.parse(lire("manifeste.json")) as { fichiers: { chemin: string; octets: number; viewBox: string; largeur: number; hauteur: number }[] };
  assert.equal(m.fichiers.length, 77);
  for (const s of scenes) {
    const f = m.fichiers.find((x) => x.chemin === s.chemin);
    assert.ok(f, `${s.chemin} absent du manifeste`);
    assert.equal(f.viewBox, viewBoxAttendu[s.fenetre]);
    assert.equal(f.largeur, FENETRES[s.fenetre].pxL);
    assert.equal(f.hauteur, FENETRES[s.fenetre].pxH);
    assert.equal(f.octets, Buffer.byteLength(lire(s.chemin)), `${s.chemin} : le manifeste n'est plus à jour`);
  }
});

test("les poids : styles simples 12 Ko, tôle 60 Ko (30 Ko compressés), volutes 110 Ko (45 Ko compressés)", () => {
  for (const s of scenes) {
    const svg = lire(s.chemin);
    const lim = limiteDe(s.chemin) as { brut: number; gzip?: number };
    assert.ok(Buffer.byteLength(svg) <= lim.brut, `${s.chemin} : ${Buffer.byteLength(svg)} octets (limite ${lim.brut})`);
    if (lim.gzip) assert.ok(gzipSync(svg, { level: 9 }).length <= lim.gzip, `${s.chemin} : compressé ${gzipSync(svg, { level: 9 }).length} octets (limite ${lim.gzip})`);
  }
  // Les limites sont bien celles du cahier des charges.
  assert.deepEqual(limiteDe("vitrine/battant-plein-noir.svg"), { brut: 12 * 1024 });
  assert.deepEqual(limiteDe("cartes/portail-pliant-tole.svg"), { brut: 60 * 1024, gzip: 30 * 1024 });
  assert.deepEqual(limiteDe("cartes/portail-coulissant-volutes-auto.svg"), { brut: 110 * 1024, gzip: 45 * 1024 });
});

test("la teinte du fichier est celle de STYLE_RENDU_PORTAIL, et pas une autre", () => {
  for (const s of scenes.filter((x) => x.chemin.startsWith("vitrine/"))) {
    const teinte = s.chemin.replace(/\.svg$/, "").split("-").pop() as keyof typeof TEINTES_PORTAIL;
    assert.equal(s.cfg.couleur, teinte);
    const svg = lire(s.chemin);
    assert.ok(svg.includes(TEINTES_PORTAIL[teinte][0]), `${s.chemin} : la teinte du cadre ${TEINTES_PORTAIL[teinte][0]}`);
    for (const autre of COULEURS_PORTAIL.filter((c) => c !== teinte))
      assert.ok(!svg.includes(TEINTES_PORTAIL[autre][0]), `${s.chemin} porte la teinte de ${autre}`);
  }
  // Les cartes sont toutes en gris anthracite.
  for (const s of scenes.filter((x) => x.chemin.startsWith("cartes/"))) {
    assert.equal(s.cfg.couleur, "anthracite");
    assert.ok(lire(s.chemin).includes(TEINTES_PORTAIL.anthracite[0]), s.chemin);
  }
});

test("la vitrine dessine ce que la fiche ouvre avec la même adresse (style, mat=acier pour le galvanisé brut, teinte)", () => {
  for (const style of STYLES_PORTAIL) {
    for (const teinte of COULEURS_PORTAIL) {
      const q = new URLSearchParams({ style, ...(teinte === "galva" ? { mat: "acier" } : {}), couleur: teinte });
      const fiche = configDepuisAdresse("portail-battant", configDepart("portail-battant"), q);
      const vitrine = configVitrine(style, teinte);
      assert.deepEqual(vitrine, fiche, `${style} ${teinte}`);
      assert.equal(vitrine.mat, teinte === "galva" ? "acier" : vitrine.mat);
    }
  }
  // Le galvanisé brut est toujours en acier, même pour les styles qui sont en alu.
  for (const style of STYLES_PORTAIL) assert.equal(configVitrine(style, "galva").mat, "acier");
});

test("les cartes : cote de départ, style de la carte, sans rail pour le coulissant « auto »", () => {
  assert.equal(configCarte("portillon", "plein").P, 1000);
  assert.equal(configCarte("portail-battant", "plein").P, 3500);
  assert.equal(configCarte("portail-coulissant", "plein").guidage, "rail");
  assert.equal(configCarte("portail-coulissant", "plein", "auto").guidage, "auto");
  for (const style of STYLES_PORTAIL) {
    const rail = lire(`cartes/portail-coulissant-${style}.svg`), auto = lire(`cartes/portail-coulissant-${style}-auto.svg`);
    assert.notEqual(rail, auto, `${style} : le coulissant sans rail doit se dessiner autrement`);
  }
});

test("le sol de la fenêtre est à 81,39 % (vitrine) et 74 % (cartes) : le fond de réserve de la page", () => {
  assert.match(lire("vitrine/battant-plein-noir.svg"), /<rect y="604\.7" width="1300" height="138\.3" fill="#efe9df"\/>/);
  assert.match(lire("cartes/portail-battant-plein.svg"), /<rect y="296" width="600" height="104" fill="#efe9df"\/>/);
  assert.ok(Math.abs((604.7 / 743) * 100 - 81.39) < 0.01);
  assert.ok(Math.abs((296 / 400) * 100 - 74) < 0.001);
});

test("le portail est centré : le milieu des piliers tombe au milieu de la fenêtre", () => {
  for (const chemin of ["vitrine/battant-plein-anthracite.svg", "cartes/portail-battant-plein.svg", "cartes/portillon-plein.svg", "cartes/portail-coulissant-plein.svg"]) {
    const svg = lire(chemin);
    const f = chemin.startsWith("vitrine") ? FENETRES.vitrine : FENETRES.carte;
    const t = svg.match(/<g transform="translate\((-?[\d.]+) ([\d.]+)\) scale\(([\d.]+)\)">/);
    assert.ok(t, chemin);
    const [tx, , echelle] = [Number(t[1]), Number(t[2]), Number(t[3])];
    // Les piliers (classe t-pilier) : de x1 à x2 en millimètres, donc en pixels tx + x * échelle.
    const piliers = [...svg.matchAll(/<polygon class="t-mur t-pilier" points="([^"]*)"/g)].map((m) => m[1].split(" ").map((p) => Number(p.split(",")[0])));
    assert.equal(piliers.length, 2, chemin);
    const xs = piliers.flat();
    const milieuPx = tx + ((Math.min(...xs) + Math.max(...xs)) / 2) * echelle;
    assert.ok(Math.abs(milieuPx - f.pxL / 2) < 0.6, `${chemin} : milieu des piliers à ${milieuPx} px au lieu de ${f.pxL / 2}`);
  }
});

test("une primitive utile qui sort de la fenêtre à moins de 100 mm du bord fait échouer le script", () => {
  // 5 500 mm de passage : avec ses piliers, 6 100 mm de large pour une fenêtre de 6 000.
  assert.throws(() => fabriquerScene("portail-battant", { ...configCarte("portail-battant", "plein"), P: 5500 }, "carte"), /sort de la fenêtre carte/);
  // La piste du coulissant, elle, sort de la fenêtre par nature et ne fait pas échouer.
  assert.doesNotThrow(() => fabriquerScene("portail-coulissant", configCarte("portail-coulissant", "plein"), "carte"));
  // La vitrine (5 200 mm) accepte le passage de départ, pas un passage de 5 000.
  assert.doesNotThrow(() => fabriquerScene("portail-battant", configVitrine("plein", "noir"), "vitrine"));
  assert.throws(() => fabriquerScene("portail-battant", { ...configVitrine("plein", "noir"), P: 5000 }, "vitrine"), /sort de la fenêtre vitrine/);
});

test("le script est déterministe : les mêmes entrées donnent les mêmes octets", () => {
  for (const chemin of ["vitrine/battant-lamesChene-anthracite.svg", "cartes/portail-pliant-tole.svg", "cartes/portail-coulissant-volutes-auto.svg"]) {
    const s = scenes.find((x) => x.chemin === chemin)!;
    const a = (fabriquer(s) as { svg: string }).svg, b = (fabriquer(s) as { svg: string }).svg;
    assert.equal(a, b, `${chemin} : deux passes différentes`);
    assert.equal(a, lire(chemin), `${chemin} : le fichier du dépôt n'est plus celui du script (npm run portails:scenes)`);
  }
});

test("le dessin est celui du moteur : autant de pièces visibles que dans la vue de face", () => {
  const compte = (svg: string) => (svg.match(/<(polygon|polyline|circle|line)\b/g) ?? []).length;
  for (const [chemin, slug] of [["vitrine/battant-barreaux-noir.svg", "portail-battant"], ["cartes/portillon-rosace.svg", "portillon"], ["cartes/portail-pliant-plein.svg", "portail-pliant"]] as const) {
    const s = scenes.find((x) => x.chemin === chemin)!;
    const voulues = planPortail(slug, s.cfg).vues.face.filter((p) => p.t !== "cote" && p.t !== "texte" && !String(p.cls ?? "").split(" ").includes("t-cache")).length;
    assert.equal(compte(lire(chemin)), voulues, chemin);
  }
});
