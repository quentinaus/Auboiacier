// Fabrique la carte « Merci ! Votre avis compte » à imprimer pour les colis.
//
//   npm run carte-avis
//
// Trois fichiers, dans public/imprimer/ :
// - carte-avis.svg              la carte seule, 105 × 148 mm (A6), à envoyer à un imprimeur ;
// - carte-avis-a6.pdf           la même en PDF, une page A6 ;
// - carte-avis-4-par-a4.pdf     quatre cartes sur une feuille A4, avec les traits de coupe,
//                               pour l'imprimante de l'atelier (imprimer à 100 %, « taille réelle »).
//
// Le dessin est dans dessin.mjs. Le QR code vient de src/lib/qr.ts ; l'adresse,
// de src/lib/avis-lien.ts. tests/avis.test.ts vérifie que le SVG rangé est bien
// celui que ce script fabrique aujourd'hui.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { Document, Page, Path, Svg, renderToBuffer } from "@react-pdf/renderer";
import { HAUTEUR_MM, LARGEUR_MM, formesCarte, svgCarte } from "./dessin.mjs";

const RACINE = fileURLToPath(new URL("../..", import.meta.url));
const DOSSIER = join(RACINE, "public/imprimer");
mkdirSync(DOSSIER, { recursive: true });

/** Points PDF par millimètre. */
const PT = 72 / 25.4;
const formes = formesCarte();

/** Une carte, à la position (x, y) en millimètres sur la page. */
function carte(x, y) {
  return h(
    Svg,
    {
      key: `${x}-${y}`,
      viewBox: `0 0 ${LARGEUR_MM} ${HAUTEUR_MM}`,
      style: { position: "absolute", left: x * PT, top: y * PT, width: LARGEUR_MM * PT, height: HAUTEUR_MM * PT },
    },
    formes.map((f, i) => h(Path, { key: i, d: f.d, fill: f.couleur }))
  );
}

const meta = { title: "Carte avis — Auboiacier", author: "Auboiacier", creator: "Auboiacier", producer: "Auboiacier" };

// Une page A6.
const a6 = h(
  Document,
  meta,
  h(Page, { size: [LARGEUR_MM * PT, HAUTEUR_MM * PT], style: { backgroundColor: "#ffffff" } }, carte(0, 0))
);

// Quatre cartes sur une feuille A4 (210 × 297 mm), avec des traits de coupe
// gris clair au milieu : deux coups de massicot ou de cutter, quatre cartes.
const A4 = { l: 210, h: 297 };
const marge = (A4.h - 2 * HAUTEUR_MM) / 2;
const traits = h(
  Svg,
  {
    key: "traits",
    viewBox: `0 0 ${A4.l} ${A4.h}`,
    style: { position: "absolute", left: 0, top: 0, width: A4.l * PT, height: A4.h * PT },
  },
  // Pointillés : 2 mm tracés, 2 mm vides.
  [
    ...Array.from({ length: Math.ceil(A4.h / 4) }, (_, i) => `M104.9 ${i * 4}h0.2v2h-0.2z`),
    ...Array.from({ length: Math.ceil(A4.l / 4) }, (_, i) => `M${i * 4} ${A4.h / 2 - 0.1}h2v0.2h-2z`),
  ].map((d, i) => h(Path, { key: i, d, fill: "#c9bfb4" }))
);
const planche = h(
  Document,
  meta,
  h(
    Page,
    { size: "A4", style: { backgroundColor: "#ffffff" } },
    traits,
    carte(0, marge),
    carte(LARGEUR_MM, marge),
    carte(0, marge + HAUTEUR_MM),
    carte(LARGEUR_MM, marge + HAUTEUR_MM)
  )
);

writeFileSync(join(DOSSIER, "carte-avis.svg"), svgCarte());
writeFileSync(join(DOSSIER, "carte-avis-a6.pdf"), await renderToBuffer(a6));
writeFileSync(join(DOSSIER, "carte-avis-4-par-a4.pdf"), await renderToBuffer(planche));
console.log("Carte avis fabriquée dans public/imprimer/ : carte-avis.svg, carte-avis-a6.pdf, carte-avis-4-par-a4.pdf");
