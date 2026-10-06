// Les dessins des fiches portails (public/images/portails/*.jpg), tirés du moteur de l'outil de plans : jamais redessinés.
//   node scripts/dessins-portails.mjs        (macOS : qlmanage et sips font le rendu en JPEG)
// Ce sont des DESSINS, pas des photos : la fiche porte la mention « Dessin d'illustration ». Quentin les remplacera par
// ses photos de chantier.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { svgDe } from "../src/lib/portails-outil/moteur.genere.mjs";
import { configDepart, planPortail } from "../src/lib/portails.ts";
import { STYLE_RENDU_PORTAIL } from "../src/lib/portails-rendu.ts";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
const SORTIE = join(RACINE, "public/images/portails");
const DESSINS = [
  ["portail-battant", "lamesChene", "anthracite"], ["portail-battant", "volutes", "noir"],
  ["portail-coulissant", "plein", "anthracite"], ["portail-pliant", "barreaux", "anthracite"], ["portillon", "rosace", "noir"],
];
const tmp = mkdtempSync(join(tmpdir(), "portails-"));
for (const [slug, style, couleur] of DESSINS) {
  const cfg = { ...configDepart(slug, style), couleur };
  const R = planPortail(slug, cfg);
  const prims = R.vues.face.filter((p) => p.t !== "cote" && p.t !== "texte");
  const r = svgDe(prims, false);
  // Un cadre 4:3 autour du dessin (les cartes de la boutique sont en 4:3), carré pour qlmanage.
  const m = r.fs * 8.5, [x, y, w, h] = [r.vb[0] + m, r.vb[1] + m, r.vb[2] - 2 * m, r.vb[3] - 2 * m];   // le dessin seul, sans la marge des cotes
  // Le sol aux trois quarts de l'image (78 %), le haut du portail jamais coupé.
  const H = Math.max((Math.max(w, (h * 4) / 3) * 1.18 * 3) / 4, -y / 0.7), W = (H * 4) / 3, cx = x + w / 2, cy = -0.28 * H;
  const vb = [cx - W / 2, cy - W / 2, W, W];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="${vb.join(" ")}"><style>${STYLE_RENDU_PORTAIL(couleur)}</style>`
    + `<rect x="${vb[0]}" y="${vb[1]}" width="${W}" height="${W}" fill="#f4f1ec"/><rect x="${vb[0]}" y="0" width="${W}" height="${W}" fill="#e7e1d8"/>${r.html}</svg>`;
  const nom = `${slug}-${style}`;
  writeFileSync(join(tmp, `${nom}.svg`), svg);
  execFileSync("qlmanage", ["-t", "-s", "1600", "-o", tmp, join(tmp, `${nom}.svg`)], { stdio: "ignore" });
  // Recadrage 4:3 au centre, puis JPEG.
  execFileSync("sips", ["-c", "1200", "1600", join(tmp, `${nom}.svg.png`), "--out", join(tmp, `${nom}.png`)], { stdio: "ignore" });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", join(tmp, `${nom}.png`), "--out", join(SORTIE, `${nom}.jpg`)], { stdio: "ignore" });
  console.log("écrit", `public/images/portails/${nom}.jpg`);
}
console.log(readdirSync(SORTIE).join(", "));
