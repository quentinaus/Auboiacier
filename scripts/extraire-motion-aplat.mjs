// Extraire les scènes de motion design « en aplats » de leur maquette, SANS les redessiner.
//
//   node scripts/extraire-motion-aplat.mjs
//
// La maquette validée par Quentin le 05/10/2026 vit dans docs/motion-aplat/ : index.html, écrit par build.py
// (toute l'animation est en @keyframes CSS, les mouvements composés y sont échantillonnés). Ce script en COPIE,
// telles quelles, les trois scènes et leurs styles, et écrit src/components/motion-aplat.genere.ts :
//   SVG_JE_MESURE  la carte « Je mesure moi-même » (le mètre, les deux cotes, le prix) ;
//   SVG_FILM       le film du parcours (prise de cotes, prix, fabrication, pose), sur la carte « L'atelier mesure et
//                  s'occupe de tout » et en mode « l'atelier vient mesurer » ;
//   CSS_APLAT      leurs styles, et seulement les leurs : les règles de la page de démonstration (html, body, *,
//                  en-tête, colonne « téléphone », bouton « Rejouer ») et ses @font-face sont écartées.
// Les titres de la maquette sont en Crimson Text : sur le site, c'est la police des titres du site.
// Le texte « lu » de chaque scène est porté par le composant (deux langues) : les SVG sont muets (aria-hidden).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { texteDuChiffrage } from "../src/lib/garde-corps-outil/chiffrage.ts";
import { chainesSecretes } from "./outil-plans/secrets.mjs";

const racine = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const html = readFileSync(join(racine, "docs/motion-aplat/index.html"), "utf8");

/** Les classes de la page de démonstration, qui n'existent pas sur le site. */
const PAGE = /^\.aplat-(page|head|replay|phone)\b/;

/** Découpe un texte CSS en blocs de premier niveau : { prelude, corps }. */
function blocs(css) {
  const sortie = [];
  let profondeur = 0;
  let debut = 0;
  let prelude = "";
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const fin = css.indexOf("*/", i + 2);
      if (profondeur === 0) debut = fin + 2;
      i = fin + 1;
      continue;
    }
    if (c === "{") {
      if (profondeur === 0) {
        prelude = css.slice(debut, i).trim();
        debut = i + 1;
      }
      profondeur++;
    } else if (c === "}") {
      profondeur--;
      if (profondeur === 0) {
        sortie.push({ prelude, corps: css.slice(debut, i) });
        debut = i + 1;
      }
    }
  }
  return sortie;
}

/** Une règle à garder : chacun de ses sélecteurs vise une classe des scènes. */
function aGarder(prelude) {
  const selecteurs = prelude.split(",").map((s) => s.trim());
  return selecteurs.every((s) => s.startsWith(".aplat-") && !PAGE.test(s));
}

/** Le CSS des scènes, @media / @container / @supports compris (filtrés à l'intérieur). */
function filtrer(css) {
  let sortie = "";
  for (const { prelude, corps } of blocs(css)) {
    if (prelude.startsWith("@keyframes")) sortie += `${prelude}{${corps.trim()}}\n`;
    else if (/^@(media|container|supports)/.test(prelude)) {
      const dedans = filtrer(corps);
      if (dedans.trim()) sortie += `${prelude}{\n${dedans}}\n`;
    } else if (!prelude.startsWith("@") && aGarder(prelude)) sortie += `${prelude}{${corps.trim()}}\n`;
  }
  return sortie;
}

const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
const css = filtrer(styles).replaceAll('"Crimson Text"', '"Auboiacier Display"');

/** Le premier SVG de scène qui suit un repère du balisage ; muet pour les lecteurs d'écran. */
function svgApres(repere) {
  const i = html.indexOf(repere);
  if (i < 0) throw new Error(`Repère introuvable dans la maquette : ${repere}`);
  const debut = html.indexOf('<svg class="aplat-svg"', i);
  const fin = html.indexOf("</svg>", debut) + "</svg>".length;
  return html
    .slice(debut, fin)
    .replace(/\srole="img"/, "")
    .replace(/\saria-label="[^"]*"/, ' aria-hidden="true" focusable="false"')
    .replaceAll('"Crimson Text"', '"Auboiacier Display"');
}

// (La scène A de la maquette, l'utilitaire seul, n'est plus montrée sur le site : la carte de l'atelier montre le film.)
const scenes = {
  SVG_JE_MESURE: svgApres('class="aplat-card-scene aplat-scB"'),
  SVG_FILM: svgApres('class="aplat-film"'),
};

// Ce que la maquette affiche en chiffres : Quentin a choisi 320 € pour une fenêtre de 1 m (05/10/2026).
// On ne regarde que les textes affichés (pas les coordonnées des dessins).
const textes = Object.values(scenes)
  .flatMap((svg) => [...svg.matchAll(/>([^<>]+)</g)].map((m) => m[1].replace(/&nbsp;|&#8239;|&#160;|\u00a0|\u202f/g, " ")))
  .join(" | ");
for (const ancien of [/1\s?180/, /1\s?114/, /1\s?240/, /585/]) {
  if (ancien.test(textes)) throw new Error(`Ancienne valeur encore affichée dans les scènes : ${ancien}`);
}
// (Le prix, lui, est fait de rouleaux de chiffres qui défilent : il se vérifie sur les captures de la maquette.)
for (const attendu of ["1 000 mm", "650 mm"]) {
  if (!textes.replace(/\s/g, " ").includes(attendu)) throw new Error(`Valeur attendue absente des scènes : ${attendu}`);
}

/**
 * Les scènes sont faites de milliers de nombres (images clés échantillonnées) : l'un d'eux peut ressembler par hasard à
 * une valeur du chiffrage de l'atelier, que le dépôt public ne doit jamais contenir (tests/frontiere-chiffrage.test.ts).
 * On décale alors d'une unité le dernier chiffre en cause, invisible à l'œil. Un texte affiché, lui, n'est jamais touché :
 * le script s'arrête.
 */
function sansChaineDeCouts(texte, secrets) {
  let decalages = 0;
  for (let tour = 0; tour < 200; tour++) {
    const s = secrets.find((x) => texte.includes(x));
    if (!s) return { texte, decalages };
    const i = texte.indexOf(s);
    const avant = texte.lastIndexOf("<", i);
    if (avant > texte.lastIndexOf(">", i)) {
      // Dans une balise (attribut, coordonnées) ou dans le CSS : c'est un nombre du dessin.
    } else if (texte.lastIndexOf(">", i) > avant && texte.indexOf("<", i) < texte.indexOf(">", i)) {
      throw new Error("Une chaîne du chiffrage tombe dans un texte affiché par les scènes : à changer dans la maquette.");
    }
    let j = i + s.length - 1;
    while (j >= i && !/\d/.test(texte[j])) j--;
    if (j < i) throw new Error("Une chaîne du chiffrage sans chiffre tombe dans les scènes : à changer dans la maquette.");
    const d = texte[j] === "9" ? "8" : String(Number(texte[j]) + 1);
    texte = texte.slice(0, j) + d + texte.slice(j + 1);
    decalages++;
  }
  throw new Error("Trop de chaînes du chiffrage dans les scènes.");
}
const chiffrage = texteDuChiffrage(racine);
if (!chiffrage) throw new Error("Clé du chiffrage absente (.env.chiffrage.local) : impossible de vérifier que les scènes n'en contiennent aucune valeur.");
const secrets = chainesSecretes(chiffrage).valeurs;
let decalages = 0;
const propre = (texte) => {
  const r = sansChaineDeCouts(texte, secrets);
  decalages += r.decalages;
  return r.texte;
};
const cssPropre = propre(css);
for (const nom of Object.keys(scenes)) scenes[nom] = propre(scenes[nom]);

/**
 * Le site ne dessine plus les scènes : il montre leurs vidéos (scripts/rendre-films-aplat.mjs, motion-aplat.tsx). Il ne
 * garde que l'HABILLAGE posé par-dessus — étiquettes d'étape, légendes, traits de progression, cadres — sans les
 * mouvements des dessins : une classe qui n'existe que dans les dessins (SVG) et ses images clés ne servent plus.
 */
// (La scène A, l'utilitaire seul, n'est plus sur le site : ses classes partent aussi.)
const dessins = [...Object.values(scenes), svgApres('class="aplat-card-scene aplat-scA"')];
const classesDessins = new Set(dessins.flatMap((svg) => [...svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))));
const deDessin = (selecteur) => [...selecteur.matchAll(/\.(aplat-[\w-]+)/g)].some((m) => classesDessins.has(m[1]));
function habillage(texte) {
  let sortie = "";
  for (const { prelude, corps } of blocs(texte)) {
    if (prelude.startsWith("@keyframes")) {
      if (!classesDessins.has(prelude.replace("@keyframes", "").trim())) sortie += `${prelude}{${corps.trim()}}\n`;
    } else if (/^@(media|container|supports)/.test(prelude)) {
      const dedans = habillage(corps);
      if (dedans.trim()) sortie += `${prelude}{\n${dedans}}\n`;
    } else {
      const gardes = prelude.split(",").map((x) => x.trim()).filter((x) => !deDessin(x));
      if (gardes.length) sortie += `${gardes.join(",")}{${corps.trim()}}\n`;
    }
  }
  return sortie;
}
const cssHabillage = habillage(cssPropre);

const entete =
  "// Généré par scripts/extraire-motion-aplat.mjs depuis docs/motion-aplat/index.html : ne pas modifier à la main.\n";
writeFileSync(
  join(racine, "src/components/motion-aplat.genere.ts"),
  `${entete}// L'habillage des films en aplats (étiquettes d'étape, légendes, traits de progression), calé sur leurs vidéos.\n` +
    `export const CSS_APLAT = ${JSON.stringify(cssHabillage)};\n`,
);
// Les scènes complètes : seulement pour fabriquer les vidéos (scripts/rendre-films-aplat.mjs), jamais envoyées au site.
writeFileSync(
  join(racine, "scripts/films-aplat.genere.mjs"),
  `${entete}// Les scènes complètes des films en aplats, pour scripts/rendre-films-aplat.mjs.\n` +
    [`export const CSS_APLAT = ${JSON.stringify(cssPropre)};`, ...Object.entries(scenes).map(([nom, svg]) => `export const ${nom} = ${JSON.stringify(svg)};`)].join("\n") +
    "\n",
);

const ko = (n) => `${Math.round(n / 1024)} ko`;
if (decalages) console.log(`${decalages} nombre(s) décalé(s) d'une unité (ressemblance avec une valeur du chiffrage).`);
console.log(`site : habillage ${ko(cssHabillage.length)} ; vidéos : CSS ${ko(cssPropre.length)}, ${Object.entries(scenes).map(([n, x]) => `${n} ${ko(x.length)}`).join(", ")}`);
