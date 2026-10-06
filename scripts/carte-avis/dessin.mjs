// Le dessin de la carte « Merci ! Votre avis compte », glissée dans les colis.
//
// Une carte A6 (105 × 148 mm), sobre, aux couleurs du site : le nom de
// l'atelier, un merci, le QR code qui mène à https://auboiacier.fr/avis et la
// même adresse écrite en clair, pour qui ne scanne pas. Une ligne en anglais
// en bas. Aucune contrepartie, aucune note suggérée.
//
// Tout est dessiné en tracés, texte compris (police Crimson du site, convertie
// avec fontkit) : la carte sort identique sur n'importe quel ordinateur et
// chez n'importe quel imprimeur, sans police à installer. Le même dessin sert
// au SVG et aux deux PDF (scripts/carte-avis/fabriquer.mjs).
//
// fontkit n'est pas une dépendance directe du site : c'est celle de
// @react-pdf/renderer, qui fabrique déjà les devis. On la prend là.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { codeQR, traceQR, MARGE_QR } from "../../src/lib/qr.ts";
import { ADRESSE_AVIS, ADRESSE_AVIS_LISIBLE } from "../../src/lib/avis-lien.ts";

const require = createRequire(import.meta.url);
const fontkit = require("fontkit");

const RACINE = fileURLToPath(new URL("../..", import.meta.url));
const POLICES = {
  regular: fontkit.openSync(join(RACINE, "public/fonts/CrimsonText-Regular.ttf")),
  semibold: fontkit.openSync(join(RACINE, "public/fonts/CrimsonText-SemiBold.ttf")),
};

export const LARGEUR_MM = 105;
export const HAUTEUR_MM = 148;

const ENCRE = "#2b2320";
const BRUN = "#4a4038";
const GRIS = "#726757";
const TRAIT = "#d9cfc4";

/** Trois décimales suffisent largement : un millième de millimètre. */
const arrondir = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 1000) / 1000));

/** Un texte en tracé, centré sur x, posé sur la ligne de base y (millimètres). */
function texte(chaine, { y, taille, police = "regular", couleur = ENCRE, espacement = 0, x = LARGEUR_MM / 2 }) {
  const font = POLICES[police];
  const run = font.layout(chaine);
  const echelle = taille / font.unitsPerEm;
  const largeur =
    run.positions.reduce((somme, p) => somme + p.xAdvance, 0) * echelle + espacement * (run.glyphs.length - 1);
  let curseur = x - largeur / 2;
  const morceaux = [];
  run.glyphs.forEach((glyphe, i) => {
    const position = run.positions[i];
    if (glyphe.id === 0) throw new Error(`Caractère absent de la police : « ${chaine} »`);
    const trace = glyphe.path
      .scale(echelle, -echelle)
      .translate(curseur + position.xOffset * echelle, y - position.yOffset * echelle)
      .toSVG();
    if (trace) morceaux.push(trace);
    curseur += position.xAdvance * echelle + espacement;
  });
  return { d: arrondir(morceaux.join("")), couleur };
}

/** Le côté du QR code imprimé, marge blanche comprise : 40 mm. */
export const COTE_QR_MM = 40;
const HAUT_QR_MM = 68;

/**
 * Les formes de la carte, dans un repère en millimètres (0,0 en haut à
 * gauche) : [{ id?, d, couleur }]. Le QR code porte l'id « qr ».
 */
export function formesCarte() {
  const code = codeQR(ADRESSE_AVIS, { niveau: "M" });
  const modules = code.taille + 2 * MARGE_QR;
  const pas = COTE_QR_MM / modules;
  const gauche = (LARGEUR_MM - COTE_QR_MM) / 2 + MARGE_QR * pas;
  const haut = HAUT_QR_MM + MARGE_QR * pas;
  // Le tracé du QR est en modules : on le passe en millimètres. Chaque rangée
  // descend de 0,02 mm sur la suivante : deux rangées bord à bord laissent
  // sinon, sur certains écrans, un fil blanc entre elles.
  const mm = (n) => String(Math.round(n * 1000) / 1000);
  const qr = traceQR(code).replace(
    /M(\d+) (\d+)h(\d+)v1h(-\d+)z/g,
    (_, x, y, h, retour) =>
      `M${mm(gauche + x * pas)} ${mm(haut + y * pas)}h${mm(h * pas)}v${mm(pas + 0.02)}h${mm(retour * pas)}z`
  );

  return [
    texte("AUBOIACIER", { y: 17, taille: 4.2, police: "semibold", espacement: 1.2 }),
    texte("Atelier à Saumur", { y: 23, taille: 3.4, couleur: GRIS }),
    texte("Merci !", { y: 41, taille: 15 }),
    texte("Votre avis compte", { y: 50.5, taille: 7.2 }),
    texte("Si vous avez deux minutes, dites ce que vous", { y: 58.5, taille: 3.9, couleur: BRUN }),
    texte("pensez de votre pièce sur Google.", { y: 63.3, taille: 3.9, couleur: BRUN }),
    { id: "qr", d: qr, couleur: ENCRE },
    texte(ADRESSE_AVIS_LISIBLE, { y: 116.5, taille: 6.4, police: "semibold" }),
    texte("Scannez le code avec l’appareil photo", { y: 123.5, taille: 3.4, couleur: GRIS }),
    texte("de votre téléphone, ou tapez l’adresse.", { y: 127.8, taille: 3.4, couleur: GRIS }),
    { d: "M42.5 133.6h20v0.25h-20z", couleur: TRAIT },
    texte(`Thank you! Your review matters: ${ADRESSE_AVIS_LISIBLE}`, { y: 140, taille: 3.2, couleur: GRIS }),
  ];
}

/** La carte en SVG, à la taille réelle (105 × 148 mm). */
export function svgCarte() {
  const formes = formesCarte()
    .map((f) => `  <path${f.id ? ` id="${f.id}"` : ""} fill="${f.couleur}" d="${f.d}"/>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Fabriqué par « npm run carte-avis » (scripts/carte-avis/). Ne pas modifier à la main. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR_MM}mm" height="${HAUTEUR_MM}mm" viewBox="0 0 ${LARGEUR_MM} ${HAUTEUR_MM}" role="img" aria-label="Merci ! Votre avis compte — ${ADRESSE_AVIS}">
  <title>Merci ! Votre avis compte — ${ADRESSE_AVIS_LISIBLE}</title>
  <desc>Carte A6 à glisser dans les colis : QR code vers ${ADRESSE_AVIS}, la même adresse écrite en clair.</desc>
  <rect width="${LARGEUR_MM}" height="${HAUTEUR_MM}" fill="#ffffff"/>
${formes}
</svg>
`;
}
