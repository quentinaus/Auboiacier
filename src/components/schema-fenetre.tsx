"use client";

/**
 * Le croquis du garde-corps dans sa fenêtre, vu depuis la pièce.
 *
 * Une élévation d'architecte, sobre : le mur dans la matière que le client a
 * choisie (pierre, brique, béton…), la fenêtre au milieu du dessin, le parquet
 * qui file vers la fenêtre, et le garde-corps derrière la vitre. Tout est à la
 * même échelle que les cotes tapées : une brique fait 22 cm, une lame de
 * parquet 18 cm, une plinthe 7 cm — une grande fenêtre les fait petites, une
 * petite fenêtre les fait grandes. Rien n'est là « pour faire joli » sans être
 * juste (demande de Quentin, 05/10 : « ça fait trop dessin, ça induit en
 * erreur »).
 *
 * Les cotes sont celles d'un plan : un trait fin, deux petites barres
 * obliques aux extrémités, et la valeur écrite dans une étiquette — la mesure
 * tapée (« 1 180 mm »), ou son nom tant qu'elle manque. Plus de pastilles
 * numérotées (« pas pro »). La largeur est au-dessus de la fenêtre, le bas de
 * la fenêtre à gauche, sa hauteur à droite : le dessin reste centré. La cote
 * qu'on remplit s'allume, et cliquer une étiquette amène le curseur dans sa
 * case.
 *
 * LE HAUT DE LA MAIN COURANTE NE BOUGE JAMAIS (demande de Quentin, 04/10) :
 * quand le client change le bas de sa fenêtre, c'est la fenêtre qui monte ou
 * descend, et le garde-corps qui grandit ou rapetisse. Les croix et les
 * barreaux du bas sont ceux que l'outil retient, dès que le serveur a
 * répondu.
 *
 * Le dessin (330 × 440) se cadre en « slice » dans un cadre de 3/4 : il le
 * remplit, en rognant au besoin un peu de mur en haut ou de parquet en bas —
 * jamais la fenêtre ni ses cotes.
 */

import { useId } from "react";
import { BARRE_APPUI_MM, JOUR_GC_MM, MAIN_COURANTE_MM, formeGC, type TrousGC } from "@/lib/garde-corps";
import type { MatiereMur } from "@/lib/murs-gc";

const ENCRE = "#2b2320";
/** L'acier et le bois tant que la fiche n'en dit rien : noir charbon, chêne. */
const ACIER_DEFAUT = "#2b2320";
const BOIS_DEFAUT = "#d9b582";

/** « largeur » : la largeur en bas, au ras de l'appui ; « largeurHaut » : la largeur à 1 m du sol. */
export type CoteFenetre = "largeur" | "largeurHaut" | "allege" | "fenetre" | "hauteur";


type Point = [number, number];

const LARGEUR = 330;
const HAUTEUR = 440;
/** Le dessus de la main courante, toujours à cette hauteur du dessin : assez haut pour laisser voir le parquet. */
const MAIN_COURANTE_Y = 232;
/** Où la norme veut le haut de la main courante, depuis le sol : 1 000 mm, visés à 1 025 (l'outil de plans). */
const NORME_MM = MAIN_COURANTE_MM;
/** Le milieu du dessin : la fenêtre y est centrée. */
const CENTRE = LARGEUR / 2;
/** La place pour la fenêtre, entre la cote de gauche et celle de droite ; et pour les hauteurs, du sol au haut de la fenêtre. */
const PLACE_LARGEUR = 236;
const PLACE_HAUTEUR = 330;
/** La hauteur de la pièce dessinée, du sol au haut du cadre : tant que la fenêtre y tient, l'échelle ne bouge pas. */
const PIECE_MM = 2200;
/** Les cotes du modèle en photo, dessinées tant que le client n'a rien tapé. */
const MODELE = { largeurMm: 1180, hauteurMm: 350, fenetreMm: 1200 };
/** Le bas de la fenêtre dessiné tant que le client n'a rien tapé : celui qui donne le garde-corps de la photo. */
const ALLEGE_MODELE_MM = MAIN_COURANTE_MM - JOUR_GC_MM - MODELE.hauteurMm;
/** Le regard : à 1,60 m du sol, à 3 m du mur. Il donne la fuite du parquet. */
const YEUX_MM = 1600;
const RECUL_MM = 3000;

const r = (n: number) => Math.round(n * 100) / 100;

/**
 * Un nombre de 0 à 1 tiré des indices, toujours le même (entiers seulement : pas de Math.sin, dont le
 * dernier chiffre peut varier d'un navigateur à l'autre) — le serveur et le navigateur dessinent le même mur.
 */
function tirage(a: number, b: number, c = 0): number {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35) ^ Math.imul(c + 0x1656, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

const HEX = /^#[0-9a-f]{6}$/i;
const rvb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Le mélange de deux teintes (t = 0 : la première, 1 : la seconde). */
function melange(a: string, b: string, t: number): string {
  const [x, y] = [rvb(a), rvb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
/** De 0 (noir) à 1 (blanc). */
const clarte = (h: string) => {
  const [a, b, c] = rvb(h);
  return (0.2126 * a + 0.7152 * b + 0.0722 * c) / 255;
};

/** « 1 180 mm » : l'espace fine du français, la virgule de l'anglais. Écrit à la main : le même partout. */
function enMm(n: number, locale: "fr" | "en"): string {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, locale === "fr" ? " " : ",")} mm`;
}

/* ------------------------------------------------------------------ *
 *  Le mur
 * ------------------------------------------------------------------ */

/** Un appareillage : des assises de blocs, en millimètres, joints compris. */
type Appareil = {
  assise: number;
  /** Les longueurs des blocs de chaque assise : elles font toutes la largeur du motif. */
  rangs: number[][];
  /** Le décalage de chaque assise : en quinconce. */
  decalages: number[];
  joint: number;
  teintes: readonly string[];
  mortier: string;
  /** Les rainures d'une brique creuse, sur sa face. */
  rainures?: boolean;
};

const uniforme = (bloc: number, n: number, rangs: number) => Array.from({ length: rangs }, () => Array.from({ length: n }, () => bloc));

/** Les vraies tailles : brique pleine 22 × 5,5 cm, brique creuse et parpaing 50 × 20, béton cellulaire 62,5 × 25. */
const APPAREILS: Partial<Record<MatiereMur, Appareil>> = {
  // Le tuffeau de Saumur : des assises de 30 cm, des pierres de 45 à 75 cm, des joints fins.
  pierre: {
    assise: 300,
    rangs: [
      [600, 450, 700, 650],
      [500, 750, 550, 600],
      [650, 600, 450, 700],
      [550, 500, 700, 650],
    ],
    decalages: [0, 300, 150, 420],
    joint: 7,
    teintes: ["#ece4d5", "#e7decd", "#efe8db", "#e4dbc9", "#eae2d2"],
    mortier: "#d8cdba",
  },
  brique: {
    assise: 65,
    rangs: uniforme(230, 7, 8),
    decalages: [0, 115, 0, 115, 0, 115, 0, 115],
    joint: 10,
    teintes: ["#b47a63", "#ad735c", "#b98169", "#a96f58", "#b27860", "#b67d66"],
    mortier: "#cbbcad",
  },
  "brique-creuse": {
    assise: 210,
    rangs: uniforme(510, 4, 4),
    decalages: [0, 255, 0, 255],
    joint: 10,
    teintes: ["#d0a080", "#ca9879", "#d5a686", "#c69474"],
    mortier: "#d8c6b4",
    rainures: true,
  },
  parpaing: {
    assise: 210,
    rangs: uniforme(510, 4, 4),
    decalages: [0, 255, 0, 255],
    joint: 10,
    teintes: ["#bdbab4", "#b6b3ad", "#c1beb8", "#b2afa9"],
    mortier: "#a7a49e",
  },
  "beton-cellulaire": {
    assise: 253,
    rangs: uniforme(628, 4, 4),
    decalages: [0, 314, 0, 314],
    joint: 3,
    teintes: ["#f0efeb", "#ecebe6", "#f2f1ed", "#e9e8e3"],
    mortier: "#d8d5ce",
  },
};

/** Le motif d'un appareillage, à l'échelle : les assises partent du sol. */
function MotifAppareil({ id, a, e, origine }: { id: string; a: Appareil; e: number; origine: Point }) {
  const largeurMotif = a.rangs[0].reduce((s, l) => s + l, 0) * e;
  const hauteurAssise = a.assise * e;
  const joint = Math.max(0.5, a.joint * e);
  const blocs: { x: number; y: number; w: number; h: number; teinte: string }[] = [];
  a.rangs.forEach((rang, i) => {
    let x = a.decalages[i] * e;
    rang.forEach((l, j) => {
      const w = l * e;
      const teinte = a.teintes[Math.floor(tirage(i, j, a.assise) * a.teintes.length)];
      const y = i * hauteurAssise;
      // Le bloc qui déborde du motif revient de l'autre côté : le mur se raccorde sans couture.
      const xs = x >= largeurMotif ? [x - largeurMotif] : x + w > largeurMotif ? [x, x - largeurMotif] : [x];
      for (const x0 of xs) blocs.push({ x: x0 + joint / 2, y: y + joint / 2, w: Math.max(0.5, w - joint), h: Math.max(0.5, hauteurAssise - joint), teinte });
      x += w;
    });
  });
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={r(origine[0])} y={r(origine[1])} width={r(largeurMotif)} height={r(hauteurAssise * a.rangs.length)}>
      <rect width={r(largeurMotif)} height={r(hauteurAssise * a.rangs.length)} fill={a.mortier} />
      {blocs.map((b, k) => (
        <rect key={k} x={r(b.x)} y={r(b.y)} width={r(b.w)} height={r(b.h)} fill={b.teinte} />
      ))}
      {a.rainures && (
        <g stroke="#5a3520" strokeOpacity={0.09} strokeWidth={0.5}>
          {blocs.flatMap((b, k) => [1, 2, 3].map((n) => <line key={`${k}-${n}`} x1={r(b.x + 1)} x2={r(b.x + b.w - 1)} y1={r(b.y + (b.h * n) / 4)} y2={r(b.y + (b.h * n) / 4)} />))}
        </g>
      )}
    </pattern>
  );
}

/** Le mur, du plafond au sol, dans la matière choisie. */
function Mur({ matiere, bas, e, ids }: { matiere: MatiereMur; bas: number; e: number; ids: (nom: string) => string }) {
  const appareil = APPAREILS[matiere];
  const origine: Point = [CENTRE, bas];
  let fond: React.ReactNode;
  if (appareil) {
    fond = (
      <>
        <defs>
          <MotifAppareil id={ids(`appareil-${matiere}`)} a={appareil} e={e} origine={origine} />
        </defs>
        <rect x={0} y={0} width={LARGEUR} height={bas} fill={`url(#${ids(`appareil-${matiere}`)})`} />
        {/* Un voile clair : la matière se lit, mais reste derrière la fenêtre et le garde-corps. */}
        <rect x={0} y={0} width={LARGEUR} height={bas} fill="#ffffff" fillOpacity={0.1} />
      </>
    );
  } else if (matiere === "beton") {
    // Un béton banché : des panneaux de coffrage de 2,50 × 1,25 m, et les trous des tiges, en quinconce.
    const w = 2500 * e;
    const h = 1250 * e;
    const trou = Math.max(0.7, 14 * e);
    fond = (
      <>
        <defs>
          <pattern id={ids("banche")} patternUnits="userSpaceOnUse" x={r(CENTRE - w / 2)} y={r(bas)} width={r(w)} height={r(h)}>
            <rect width={r(w)} height={r(h)} fill="#c9c5be" />
            <path d={`M0 0.3 H${r(w)} M0.3 0 V${r(h)}`} stroke="#000" strokeOpacity={0.07} strokeWidth={0.6} />
            {[0.125, 0.375, 0.625, 0.875].flatMap((fx) =>
              [0.25, 0.75].map((fy) => (
                <g key={`${fx}-${fy}`}>
                  <circle cx={r(w * fx)} cy={r(h * fy)} r={r(trou)} fill="#8d8880" fillOpacity={0.55} />
                  <circle cx={r(w * fx - trou * 0.25)} cy={r(h * fy - trou * 0.25)} r={r(trou * 0.45)} fill="#ffffff" fillOpacity={0.25} />
                </g>
              ))
            )}
          </pattern>
        </defs>
        <rect x={0} y={0} width={LARGEUR} height={bas} fill={`url(#${ids("banche")})`} />
      </>
    );
  } else if (matiere === "placo") {
    // Des plaques de 1,20 m, peintes : on devine à peine les bandes.
    const w = 1200 * e;
    fond = (
      <>
        <defs>
          <pattern id={ids("placo")} patternUnits="userSpaceOnUse" x={r(CENTRE - w / 2)} y={0} width={r(w)} height={HAUTEUR}>
            <rect width={r(w)} height={HAUTEUR} fill="#f1eee8" />
            <line x1={0.3} x2={0.3} y1={0} y2={HAUTEUR} stroke="#000" strokeOpacity={0.045} strokeWidth={0.6} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={LARGEUR} height={bas} fill={`url(#${ids("placo")})`} />
      </>
    );
  } else {
    // Un enduit lisse, chaud : tant que le mur n'est pas choisi, ou si le client ne sait pas.
    fond = <rect x={0} y={0} width={LARGEUR} height={bas} fill="#ece6dc" />;
  }
  return (
    <g>
      {fond}
      {/* La lumière de la pièce : un peu d'ombre sous le plafond, un peu au pied du mur. */}
      <rect x={0} y={0} width={LARGEUR} height={bas} fill={`url(#${ids("lumiere-mur")})`} />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 *  Le parquet
 * ------------------------------------------------------------------ */

/** Un chêne clair, huilé : six tons très proches. */
const LAMES = ["#dcc39f", "#d6bc96", "#e1caa8", "#d2b68e", "#dbc19b", "#cfb38b"];

/**
 * Le parquet, en vraie perspective : des lames de 18 cm de large et de 0,90 à 1,50 m de long, posées vers
 * la fenêtre, qui fuient vers le regard (1,60 m du sol, 3 m du mur). Au pied du mur, une lame a sa vraie
 * largeur à l'échelle de la fenêtre ; elle s'élargit en venant vers nous, comme dans une photo.
 */
function Parquet({ haut, bas, e, ids, lumiere }: { haut: number; bas: number; e: number; ids: (nom: string) => string; lumiere: [number, number] }) {
  const horizon = haut - YEUX_MM * e;
  const fuite = haut - horizon;
  const facteur = (bas - horizon) / fuite;
  const zMax = RECUL_MM * (1 - 1 / facteur);
  const yA = (z: number) => horizon + (fuite * RECUL_MM) / (RECUL_MM - z);
  /** Le point du sol qui part de xMur, au pied du mur, vu à la hauteur y. */
  const xA = (xMur: number, y: number) => CENTRE + ((xMur - CENTRE) * (y - horizon)) / fuite;
  const w = 180 * e;
  const n = Math.ceil(CENTRE / w) + 1;
  const lames: { points: string; teinte: string; fil: [Point, Point] | null }[] = [];
  for (let k = -n; k < n; k++) {
    const xg = CENTRE + k * w;
    const xd = xg + w;
    // La rangée est au plus étroit au pied du mur (xA(x, haut) = x) et s'écarte en descendant : elle n'est hors
    // du dessin que si elle l'est déjà au pied du mur.
    if (xd < 0 || xg > LARGEUR) continue;
    // Chaque rangée commence à sa propre distance du mur : les abouts ne s'alignent jamais.
    let z = -tirage(k + 100, 7, 3) * 1200;
    for (let s = 0; z < zMax && s < 12; s++) {
      const longueur = 900 + Math.floor(tirage(k + 100, s, 11) * 7) * 100;
      const za = Math.max(0, z);
      const zb = Math.min(zMax, z + longueur);
      if (zb > za) {
        const [ya, yb] = [yA(za), yA(zb)];
        const xf = xg + w * (0.3 + 0.4 * tirage(k + 100, s, 17));
        lames.push({
          points: `${r(xA(xg, ya))},${r(ya)} ${r(xA(xd, ya))},${r(ya)} ${r(xA(xd, yb))},${r(yb)} ${r(xA(xg, yb))},${r(yb)}`,
          teinte: LAMES[Math.floor(tirage(k + 100, s, 5) * LAMES.length)],
          fil: yb - ya > 3 ? [[r(xA(xf, ya)), r(ya)], [r(xA(xf, yb)), r(yb)]] : null,
        });
      }
      z += longueur;
    }
  }
  const plinthe = Math.max(3, r(70 * e));
  const [g, d] = lumiere;
  const etale = (x: number) => r(xA(x, bas) + (x - CENTRE) * 0.15);
  return (
    <g>
      <rect x={0} y={haut} width={LARGEUR} height={bas - haut} fill={LAMES[0]} />
      <g stroke="#a98d66" strokeOpacity={0.55} strokeWidth={0.45}>
        {lames.map((l, i) => (
          <polygon key={i} points={l.points} fill={l.teinte} />
        ))}
      </g>
      {/* Le fil du bois : un trait à peine visible dans chaque lame. */}
      <g stroke="#9a7b52" strokeOpacity={0.13} strokeWidth={0.4}>
        {lames.map((l, i) => l.fil && <line key={i} x1={l.fil[0][0]} y1={l.fil[0][1]} x2={l.fil[1][0]} y2={l.fil[1][1]} />)}
      </g>
      {/* La lumière de la fenêtre sur le sol, et l'ombre douce au pied du mur. */}
      <polygon points={`${g},${haut} ${d},${haut} ${etale(d)},${bas} ${etale(g)},${bas}`} fill={`url(#${ids("lumiere-sol")})`} />
      <rect x={0} y={haut} width={LARGEUR} height={bas - haut} fill={`url(#${ids("ombre-sol")})`} />
      {/* La plinthe, peinte, au pied du mur : 7 cm, à l'échelle. */}
      <rect x={0} y={r(haut - plinthe)} width={LARGEUR} height={plinthe} fill="#f6f3ee" />
      <line x1={0} x2={LARGEUR} y1={r(haut - plinthe + 0.25)} y2={r(haut - plinthe + 0.25)} stroke="#000" strokeOpacity={0.12} strokeWidth={0.5} />
      <line x1={0} x2={LARGEUR} y1={haut} y2={haut} stroke="#000" strokeOpacity={0.14} strokeWidth={0.5} />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 *  Les cotes
 * ------------------------------------------------------------------ */

/**
 * Une cote, comme sur un plan : le trait, deux barres obliques, et une étiquette qui porte la valeur (ou le
 * nom de la mesure tant qu'elle manque, en pointillé). Cliquer l'étiquette amène à la case.
 */
function Cote({
  cote,
  de,
  a,
  vertical = false,
  texte,
  vide,
  actif,
  label,
  ombre,
  onChoisir,
}: {
  cote: CoteFenetre;
  de: Point;
  a: Point;
  vertical?: boolean;
  texte: string;
  vide: boolean;
  actif: boolean;
  label: string;
  ombre: string;
  onChoisir?: (cote: CoteFenetre) => void;
}) {
  const couleur = actif ? ENCRE : "#4d433a";
  const epaisseur = actif ? 1.3 : 0.75;
  const barre = (p: Point) => `M${r(p[0] - 2.8)} ${r(p[1] + 2.8)} L${r(p[0] + 2.8)} ${r(p[1] - 2.8)}`;
  // Lisible même quand le croquis est petit (230 px de large sur un écran de 1280 × 720) : 11 unités, ≈ 8 px.
  const largeur = r(texte.length * 6.3 + 15);
  const hauteur = 17;
  // L'étiquette se pose au milieu du trait. Quand la cote est plus courte qu'elle, elle irait cacher les deux
  // barres : on la pose alors au-delà du bout, sur le prolongement du trait, sans sortir du dessin.
  const longueur = Math.hypot(a[0] - de[0], a[1] - de[1]);
  const [ux, uy] = longueur > 0 ? [(a[0] - de[0]) / longueur, (a[1] - de[1]) / longueur] : [1, 0];
  const dehors = largeur + 10 > longueur;
  const demi = largeur / 2 + 2;
  const cx = r(dehors ? Math.min(LARGEUR - demi, Math.max(demi, a[0] + ux * (largeur / 2 + 6))) : (de[0] + a[0]) / 2);
  const cy = r(dehors ? Math.min(HAUTEUR - demi, Math.max(demi, a[1] + uy * (largeur / 2 + 6))) : (de[1] + a[1]) / 2);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onChoisir?.(cote)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoisir?.(cote);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <path d={`M${r(de[0])} ${r(de[1])} L${r(a[0])} ${r(a[1])}`} stroke={couleur} strokeWidth={epaisseur} />
      {/* Le trait prolongé jusqu'à l'étiquette posée au-delà du bout. */}
      {dehors && <path d={`M${r(a[0])} ${r(a[1])} L${cx} ${cy}`} stroke={couleur} strokeWidth={0.6} strokeOpacity={0.7} />}
      <path d={`${barre(de)} ${barre(a)}`} stroke={couleur} strokeWidth={epaisseur + 0.45} strokeLinecap="round" />
      <g transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
        <rect
          x={r(cx - largeur / 2)}
          y={r(cy - hauteur / 2)}
          width={largeur}
          height={hauteur}
          rx={hauteur / 2}
          fill={actif ? ENCRE : "#ffffff"}
          fillOpacity={actif ? 1 : 0.95}
          stroke={vide && !actif ? "#8f8377" : "none"}
          strokeWidth={0.7}
          strokeDasharray={vide && !actif ? "2.2 1.6" : undefined}
          filter={`url(#${ombre})`}
        />
        <text
          x={cx}
          y={r(cy + 3.8)}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          letterSpacing={0.15}
          fontStyle={vide && !actif ? "italic" : undefined}
          fill={actif ? "#ffffff" : vide ? "#6f6357" : ENCRE}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {texte}
        </text>
      </g>
    </g>
  );
}

/** Une rosace : la fleur au croisement des barres, dans la teinte de l'acier. */
function Rosace({ cx, cy, taille = 6.5, acier }: { cx: number; cy: number; taille?: number; acier: string }) {
  const k = taille / 6.5;
  const clair = clarte(acier) > 0.55;
  const petales = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `M${cx} ${cy} m${r(Math.cos(a) * 2 * k)} ${r(Math.sin(a) * 2 * k)} l${r(Math.cos(a) * 5 * k)} ${r(Math.sin(a) * 5 * k)}`;
  }).join(" ");
  return (
    <g>
      <circle cx={cx} cy={cy} r={r(taille)} fill={acier} />
      <path d={petales} stroke={melange(acier, clair ? "#000000" : "#ffffff", 0.22)} strokeWidth={r(1.4 * k)} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r(1.6 * k)} fill={melange(acier, clair ? "#000000" : "#ffffff", 0.4)} />
    </g>
  );
}

export function SchemaFenetre({
  largeurMm,
  largeurHautMm,
  allegeMm,
  hauteurFenetreMm,
  croix,
  soubassementMm = 0,
  traverse = false,
  renfort = false,
  patte = 0,
  seuls = false,
  trous = null,
  typeMainCourante,
  rosaceMm,
  apercu = false,
  mur = "enduit",
  teinteAcier,
  teinteBois,
  labels,
  actif,
  onChoisir,
  locale = "fr",
  className = "h-full w-full",
  remplissage = "croix",
}: {
  /** Le diamètre de la rosace choisie, pour la dessiner à l'échelle. */
  rosaceMm?: number;
  /**
   * Le client a commencé ses mesures mais le serveur n'a pas encore proposé de modèle (il manque une cote) :
   * les croix sont dessinées en filigrane. Sinon le modèle de la photo (deux croix), dessiné en plein sur une
   * fenêtre basse, passait pour LE garde-corps proposé — et il n'a pas l'air aux normes.
   */
  apercu?: boolean;
  /** Les croix du modèle, ou un panneau de verre à leur place. */
  remplissage?: "croix" | "verre";
  /** Les cotes dessinées à l'échelle. Sans valeur, le croquis prend celles du modèle, et les étiquettes disent ce qu'il faut mesurer. */
  largeurMm?: number;
  /**
   * La largeur en haut, à 1 m du sol (murs pas parallèles, décision de Quentin, 05/10). `largeurMm` est alors celle
   * d'en bas, au ras de l'appui. Le dessin est à la plus petite des deux.
   */
  largeurHautMm?: number;
  allegeMm?: number;
  /** De l'appui au haut de l'ouverture. */
  hauteurFenetreMm?: number;
  /** Le nombre de croix retenu par l'outil ; sans lui, une croix par panneau d'environ 60 cm. */
  croix?: number;
  /** La hauteur des barreaux droits en partie basse (0 : aucun). */
  soubassementMm?: number;
  /** Une traverse au milieu de chaque croix. */
  traverse?: boolean;
  /** Des barreaux verticaux et rien d'autre : ni croix, ni rosace, ni traverse. */
  seuls?: boolean;
  /** Fenêtre large : un fer plat de 10 mm sous une main courante de 45 mm (au lieu de 40 mm). */
  renfort?: boolean;
  /** Les pattes, du bas du cadre à l'appui (scellées dedans), réparties sur la largeur : leur nombre (true : une seule). */
  patte?: number | boolean;
  /** Le rond rouge (vide trop grand) et les ronds verts de l'outil de plans, posés dans le cadre du modèle montré. */
  trous?: TrousGC | null;
  /** La main courante en acier : fer plat (40 × 8) ou profilé (40 × 10, dessus bombé) ; absente : en bois. */
  typeMainCourante?: "acier-plat" | "acier-profile";
  /** Le mur que le client a choisi (MATIERES_MUR, src/lib/murs-gc.ts) ; un enduit lisse tant qu'il n'a rien dit. */
  mur?: MatiereMur;
  /** La teinte de l'acier et celle du bois choisies sur la fiche (« #1c1a18 »). */
  teinteAcier?: string;
  teinteBois?: string;
  labels: {
    largeur: string;
    /** La largeur en haut (sinon, le libellé de la largeur). */
    largeurHaut?: string;
    allege: string;
    fenetre: string;
    hauteur: string;
    metre: string;
    interieur: string;
    jour: string;
  };
  actif: CoteFenetre | null;
  /** Cliquer une cote amène à sa case. */
  onChoisir?: (cote: CoteFenetre) => void;
  locale?: "fr" | "en";
  className?: string;
}) {
  // Des identifiants propres à ce croquis (motifs, dégradés, filtres) : sans caractères spéciaux, url(#…) les refuserait.
  const prefixe = `gc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ids = (nom: string) => `${prefixe}-${nom}`;

  // Les cotes, bornées à ce qui reste une fenêtre (une faute de frappe à
  // 20 000 mm écrasait tout le dessin) — mais proportionnelles entre elles.
  const borne = (mm: number, min: number, max: number) => Math.min(Math.max(mm, min), max);
  const L = borne(
    largeurMm !== undefined && largeurHautMm !== undefined ? Math.min(largeurMm, largeurHautMm) : (largeurMm ?? largeurHautMm ?? MODELE.largeurMm),
    200,
    3000,
  );
  const A = borne(allegeMm ?? ALLEGE_MODELE_MM, 0, 1500);
  // CE QU'ON DESSINE DANS LA FENÊTRE vient de la règle de l'outil (formeGC), calculée ici même : le croquis
  // suit le curseur EN DIRECT, sans attendre le serveur. Un garde-corps tant qu'il en faut au moins 200 mm ;
  // sinon une barre d'appui ; rien quand le bas de la fenêtre est déjà à la hauteur de la norme.
  const forme = formeGC(A);
  const mode = forme.mode;
  const J = forme.jourMm;
  // La hauteur du garde-corps, main courante comprise (une barre d'appui n'a que sa propre épaisseur).
  const H = mode === "garde-corps" ? forme.hauteurMm : BARRE_APPUI_MM;
  /** Où arrive le haut de la main courante, depuis le sol. */
  const MC = mode === "garde-corps" ? A + J + H : NORME_MM;
  const F = borne(hauteurFenetreMm ?? MODELE.fenetreMm, 200, 3000);
  // Une seule échelle pour tout. Tant que la fenêtre tient dans la pièce dessinée, elle ne change pas. Et le
  // haut de la fenêtre, avec sa cote au-dessus, reste TOUJOURS dans le cadre (demande de Quentin, 05/10).
  const echelleHaut = A + F > MC ? (MAIN_COURANTE_Y - 44) / (A + F - MC) : Infinity;
  const e = Math.min(PLACE_LARGEUR / L, PLACE_HAUTEUR / Math.max(PIECE_MM, A + F + 150), echelleHaut);
  const largeur = r(L * e);
  const fenetre = Math.max(3, r(F * e));
  const hauteur = Math.max(3, r(H * e));
  // La main courante est FIXE ; tout le reste se place par rapport à elle.
  const hautGardeCorpsY = MAIN_COURANTE_Y;
  const solY = Math.min(HAUTEUR - 12, r(MAIN_COURANTE_Y + MC * e)); // le pied du mur
  const appuiY = r(solY - Math.max(3, A * e)); // dessus de l'appui : le bas de la fenêtre
  const hautOuvertureY = r(appuiY - fenetre); // le haut de l'ouverture
  const basGardeCorpsY = r(Math.min(appuiY - 2, hautGardeCorpsY + hauteur)); // le bas du cadre, au-dessus de l'appui
  const G = r(CENTRE - largeur / 2);
  const D = r(CENTRE + largeur / 2);
  const milieu = r(CENTRE);
  /** Les croix de l'outil ; en attendant sa réponse, une par panneau d'environ 60 cm. */
  const panneaux = croix && croix > 0 ? croix : Math.max(1, Math.round(L / 600));
  const pattes = typeof patte === "number" ? Math.max(0, Math.floor(patte)) : patte ? 1 : 0;

  /* L'acier et le bois choisis. Un acier clair (blanc, brut) reçoit un fin contour : sans lui, il se perdait
     sur la vitre et le dormant blancs. */
  const acier = teinteAcier && HEX.test(teinteAcier) ? teinteAcier : ACIER_DEFAUT;
  const bois = teinteBois && HEX.test(teinteBois) ? teinteBois : BOIS_DEFAUT;
  const acierClair = clarte(acier) > 0.55;

  /** La main courante : fer plat 8, profilé 10, bois 40, bois sur fer plat 55 (10 de plat + 45 de bois). */
  const hauteurMcMm = typeMainCourante === "acier-plat" ? 8 : typeMainCourante === "acier-profile" ? 10 : renfort ? 55 : 40;
  const acierMc = typeMainCourante !== undefined;
  const mainCouranteH = mode === "garde-corps" ? Math.max(2, Math.min(r(hauteurMcMm * e), hauteur / 2)) : Math.max(2, r(40 * e));
  const platH = renfort && mode === "garde-corps" ? Math.max(1, r((mainCouranteH * 10) / 55)) : 0;
  const barre = Math.max(1, r(20 * e));
  const rosace = Math.max(1.5, r(((rosaceMm ?? 100) / 2) * e));
  const cadreHaut = r(hautGardeCorpsY + mainCouranteH);
  const cadreBas = r(basGardeCorpsY - Math.min(2, hauteur / 4));
  /** Les barreaux du bas, quand la norme les demande : les croix commencent au-dessus. */
  const soubassement = soubassementMm > 0 ? Math.min(r(soubassementMm * e), (cadreBas - cadreHaut) / 2) : 0;
  const basCroix = r(cadreBas - soubassement);
  const barreaux = soubassement > 0 ? Math.max(2, Math.round(L / 116)) : 0;
  /** Barreaux seuls : un barreau tous les 116 mm environ (vide de 100 mm, carré de 16), sur toute la hauteur du cadre. */
  const barreauxSeuls = seuls ? Math.max(2, Math.round(L / 116)) : 0;

  /* La fenêtre, à l'échelle : un dormant de 5 cm, des ouvrants de 6 cm (9 en bas), une crémone. */
  const dormant = Math.max(1.6, r(50 * e));
  const ouvrant = Math.max(1.6, r(60 * e));
  const ouvrantBas = Math.max(2, r(90 * e));
  const vitreHaut = r(hautOuvertureY + dormant + ouvrant);
  const vitreBas = r(appuiY - dormant - ouvrantBas);
  const vitres: [number, number][] = [
    [r(G + dormant + ouvrant), r(milieu - ouvrant)],
    [r(milieu + ouvrant), r(D - dormant - ouvrant)],
  ].filter(([x0, x1]) => x1 - x0 > 1.5 && vitreBas - vitreHaut > 1.5) as [number, number][];
  const poignee = Math.max(4, r(150 * e));
  /** L'appui intérieur, une tablette qui déborde de 4 cm de chaque côté. */
  const debord = Math.max(3, r(40 * e));
  const tablette = Math.max(2, r(35 * e));

  /* Les cotes. Les deux largeurs, d'un mur à l'autre, à des repères que le client trouve SEUL (« il ne sait pas où sera
     la main courante : c'est nous qui la calculons », Quentin, 06/10) : en bas au ras de l'appui, en haut à 1 m du sol.
     Le bas de la fenêtre à gauche, sa hauteur à droite. */
  const fr = locale === "fr";
  const noms = fr
    ? { largeur: "En bas", largeurHaut: "À 1 m", allege: "Bas de fenêtre", fenetre: "Hauteur" }
    : { largeur: "Bottom", largeurHaut: "At 1 m", allege: "Sill height", fenetre: "Height" };
  /** En bas : juste au-dessus de l'appui. En haut : à 1 m du sol (toujours au-dessus de la ligne du bas). */
  const yLargeurBas = r(appuiY - 5);
  const yLargeurHaut = r(Math.min(solY - 1000 * e, yLargeurBas - 16));
  /** La ligne où mesurer la largeur demandée, surlignée en bleu (« la sélectionner », Quentin). */
  const surligne = actif === "largeur" ? yLargeurBas : actif === "largeurHaut" ? yLargeurHaut : null;
  const xGauche = r(Math.max(14, G - debord - 15));
  const xDroite = r(Math.min(LARGEUR - 14, D + debord + 15));
  const rappel = { stroke: "#4d433a", strokeOpacity: 0.55, strokeWidth: 0.6 };

  const legende = fr ? "Croquis coté, vu depuis la pièce : " : "Dimensioned sketch, seen from the room: ";

  const gardeCorps = mode === "garde-corps" && (
    <g filter={acierClair ? `url(#${ids("contour")})` : undefined}>
      {remplissage === "verre" && (
        /* Le verre feuilleté : un panneau clair, un reflet, aucun vide. */
        <g>
          <rect x={G + 2} y={cadreHaut} width={D - G - 4} height={cadreBas - cadreHaut} fill="#bfd3dd" opacity={0.75} />
          <line x1={G + 8} y1={cadreBas - 2} x2={r(G + 8 + (cadreBas - cadreHaut) * 0.9)} y2={cadreHaut + 2} stroke="#ffffff" strokeWidth={2} opacity={0.7} />
        </g>
      )}
      <rect x={G + 2} y={cadreHaut} width={D - G - 4} height={cadreBas - cadreHaut} fill="none" stroke={acier} strokeWidth={r(barre * 1.4)} />
      {soubassement > 0 && (
        /* Les barreaux droits du bas, sous une lisse : rien à quoi grimper sous 600 mm du sol. */
        <g stroke={acier} strokeWidth={barre}>
          <line x1={G + 2} y1={basCroix} x2={D - 2} y2={basCroix} strokeWidth={r(barre * 1.2)} />
          {Array.from({ length: barreaux }, (_, i) => {
            const x = r(G + 2 + ((D - G - 4) * (i + 1)) / (barreaux + 1));
            return <line key={i} x1={x} y1={basCroix} x2={x} y2={cadreBas} />;
          })}
        </g>
      )}
      {remplissage === "croix" && seuls && (
        /* Des barreaux verticaux, du haut au bas du cadre : rien à quoi poser le pied. */
        <g stroke={acier} strokeWidth={barre}>
          {Array.from({ length: barreauxSeuls }, (_, i) => {
            const x = r(G + 2 + ((D - G - 4) * (i + 1)) / (barreauxSeuls + 1));
            return <line key={i} x1={x} y1={cadreHaut} x2={x} y2={cadreBas} />;
          })}
        </g>
      )}
      {remplissage === "croix" &&
        !seuls &&
        Array.from({ length: panneaux }, (_, i) => {
          const x0 = r(G + 2 + ((D - G - 4) * i) / panneaux);
          const x1 = r(G + 2 + ((D - G - 4) * (i + 1)) / panneaux);
          return (
            <g key={i} opacity={apercu ? 0.22 : 1}>
              {i > 0 && <line x1={x0} y1={cadreHaut} x2={x0} y2={basCroix} stroke={acier} strokeWidth={barre} />}
              <g stroke={acier} strokeWidth={barre}>
                <line x1={x0 + 2} y1={cadreHaut + 1} x2={x1 - 2} y2={basCroix - 1} />
                <line x1={x0 + 2} y1={basCroix - 1} x2={x1 - 2} y2={cadreHaut + 1} />
                {/* La traverse au milieu : d'un montant à l'autre, à mi-hauteur de la croix. */}
                {traverse && <line x1={x0} y1={r((cadreHaut + basCroix) / 2)} x2={x1} y2={r((cadreHaut + basCroix) / 2)} />}
              </g>
              {/* Sans rosace (Ø0) : le centre des croix reste vide. */}
              {rosaceMm !== 0 && (
                <Rosace
                  cx={r((x0 + x1) / 2)}
                  cy={r((cadreHaut + basCroix) / 2)}
                  taille={Math.min(rosace, (x1 - x0) / 2.2, (basCroix - cadreHaut) / 2.2)}
                  acier={acier}
                />
              )}
            </g>
          );
        })}
      {/* Les ronds de l'outil : rouge = le vide est trop grand, vert = le vide respecte la norme. */}
      {trous &&
        remplissage === "croix" &&
        trous.ronds.map((c, i) => {
          const sx = (D - G - 4) / trous.cadreMm.l,
            sy = (cadreBas - cadreHaut) / trous.cadreMm.h;
          const couleur = c.ok ? "#2f7d46" : "#b3261e";
          return (
            <ellipse key={`rond${i}`} cx={r(G + 2 + c.x * sx)} cy={r(cadreBas - c.y * sy)} rx={r((c.d / 2) * sx)} ry={r((c.d / 2) * sy)} fill={couleur} fillOpacity={0.3} stroke={couleur} strokeWidth={1.6} />
          );
        })}
      <MainCourante x={G - 2} y={hautGardeCorpsY} largeur={D - G + 4} hauteur={mainCouranteH} type={typeMainCourante} acier={acier} bois={bois} />
      {platH > 0 && <rect x={G} y={r(hautGardeCorpsY + mainCouranteH - platH)} width={D - G} height={platH} fill={acier} />}
      {/* Les pattes : du bas du cadre jusqu'à l'appui, où elles sont scellées. */}
      {Array.from({ length: pattes }, (_, j) => (
        <rect key={`patte${j}`} x={r(G + ((D - G) * (j + 1)) / (pattes + 1) - Math.max(1, barre / 2))} y={basGardeCorpsY} width={Math.max(2, barre)} height={Math.max(2, appuiY - basGardeCorpsY + 2)} fill={acier} />
      ))}
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${legende}${labels.largeur}, ${labels.allege}, ${labels.fenetre}, ${labels.hauteur}. ${labels.interieur}`}
      className={className}
    >
      <defs>
        <linearGradient id={ids("lumiere-mur")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2e22" stopOpacity={0.07} />
          <stop offset="0.45" stopColor="#3a2e22" stopOpacity={0} />
          <stop offset="1" stopColor="#3a2e22" stopOpacity={0.06} />
        </linearGradient>
        <linearGradient id={ids("ombre-sol")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e2014" stopOpacity={0.2} />
          <stop offset="0.4" stopColor="#2e2014" stopOpacity={0.03} />
          <stop offset="1" stopColor="#2e2014" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={ids("lumiere-sol")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.3} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.04} />
        </linearGradient>
        <linearGradient id={ids("ciel")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d8e2" />
          <stop offset="1" stopColor="#ebf1f4" />
        </linearGradient>
        <linearGradient id={ids("linteau")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1912" stopOpacity={0.16} />
          <stop offset="1" stopColor="#1e1912" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={ids("sous-tablette")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1912" stopOpacity={0.16} />
          <stop offset="1" stopColor="#1e1912" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={ids("vignette")} cx="0.5" cy="0.46" r="0.72">
          <stop offset="0.62" stopColor="#2b2320" stopOpacity={0} />
          <stop offset="1" stopColor="#2b2320" stopOpacity={0.12} />
        </radialGradient>
        <clipPath id={ids("vitres")}>
          {vitres.map(([x0, x1]) => (
            <rect key={x0} x={x0} y={vitreHaut} width={r(x1 - x0)} height={r(vitreBas - vitreHaut)} />
          ))}
        </clipPath>
        <filter id={ids("ombre")} x="-20%" y="-50%" width="140%" height="200%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.7" floodColor="#2b2320" floodOpacity="0.25" />
        </filter>
        {/* En coordonnées du dessin : en proportion de la boîte du groupe, la zone ignorait l'épaisseur des traits
            et rognait le bas du cadre et la barre d'appui. */}
        <filter id={ids("contour")} filterUnits="userSpaceOnUse" x={0} y={0} width={LARGEUR} height={HAUTEUR}>
          <feMorphology in="SourceAlpha" operator="dilate" radius="0.55" result="epais" />
          <feFlood floodColor="#7d746a" result="teinte" />
          <feComposite in="teinte" in2="epais" operator="in" result="trait" />
          <feMerge>
            <feMergeNode in="trait" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <Mur matiere={mur} bas={solY} e={e} ids={ids} />
      <Parquet haut={solY} bas={HAUTEUR} e={e} ids={ids} lumiere={[G, D]} />

      {/* L'ouverture : une ombre douce tout autour dit l'épaisseur du mur. */}
      <rect x={G - 1.2} y={hautOuvertureY - 1.2} width={r(D - G + 2.4)} height={r(appuiY - hautOuvertureY + 1.2)} fill="#1e1912" fillOpacity={0.1} />
      {/* La menuiserie : le dormant et les deux ouvrants, blancs. */}
      <rect x={G} y={hautOuvertureY} width={r(D - G)} height={r(appuiY - hautOuvertureY)} fill="#f7f5f1" />
      {vitres.map(([x0, x1]) => (
        <rect key={x0} x={x0} y={vitreHaut} width={r(x1 - x0)} height={r(vitreBas - vitreHaut)} fill={`url(#${ids("ciel")})`} />
      ))}
      {/* Un reflet en biais sur chaque vitre. */}
      <g clipPath={`url(#${ids("vitres")})`} fill="#ffffff" fillOpacity={0.24}>
        {vitres.map(([x0, x1]) => {
          const w = x1 - x0;
          return <polygon key={x0} points={`${r(x0 + w * 0.55)},${vitreHaut} ${r(x0 + w * 0.8)},${vitreHaut} ${r(x0 + w * 0.3)},${vitreBas} ${r(x0 + w * 0.05)},${vitreBas}`} />;
        })}
      </g>
      <g fill="none" stroke="#cbc3b7" strokeWidth={0.55}>
        <rect x={r(G + dormant)} y={r(hautOuvertureY + dormant)} width={r(D - G - dormant * 2)} height={r(appuiY - hautOuvertureY - dormant * 2)} />
        {vitres.map(([x0, x1]) => (
          <rect key={x0} x={x0} y={vitreHaut} width={r(x1 - x0)} height={r(vitreBas - vitreHaut)} />
        ))}
        <line x1={milieu} x2={milieu} y1={r(hautOuvertureY + dormant)} y2={r(appuiY - dormant)} />
      </g>
      {/* La crémone, sur l'ouvrant de droite. */}
      {vitres.length === 2 && (
        <g>
          <rect x={r(milieu + ouvrant / 2 - 1.3)} y={r((vitreHaut + vitreBas) / 2 - poignee * 0.35)} width={2.6} height={r(poignee * 0.7)} rx={1.3} fill="#e9e5de" stroke="#c9c1b5" strokeWidth={0.4} />
          <rect x={r(milieu + ouvrant / 2 - 0.8)} y={r((vitreHaut + vitreBas) / 2 - poignee / 2)} width={1.6} height={poignee} rx={0.8} fill="#4a443e" />
        </g>
      )}
      {/* L'ombre du linteau sur le haut de la fenêtre. */}
      <rect x={G} y={hautOuvertureY} width={r(D - G)} height={Math.max(4, r(140 * e))} fill={`url(#${ids("linteau")})`} />

      {/* Le garde-corps, derrière la vitre ; une barre d'appui quand il ne manque presque rien. */}
      {gardeCorps}
      {mode === "barre" && (
        <g filter={acierClair ? `url(#${ids("contour")})` : undefined}>
          <line x1={G} y1={r(hautGardeCorpsY + mainCouranteH + barre)} x2={D} y2={r(hautGardeCorpsY + mainCouranteH + barre)} stroke={acier} strokeWidth={r(barre * 1.4)} />
          <MainCourante x={G - 2} y={hautGardeCorpsY} largeur={D - G + 4} hauteur={mainCouranteH} type={typeMainCourante} acier={acier} bois={bois} />
        </g>
      )}

      {/* L'appui intérieur : une tablette claire, son ombre dessous. */}
      <rect x={r(G - debord)} y={appuiY} width={r(D - G + debord * 2)} height={tablette} fill="#f3eee6" />
      <line x1={r(G - debord)} x2={r(D + debord)} y1={r(appuiY + 0.3)} y2={r(appuiY + 0.3)} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={0.6} />
      <rect x={r(G - debord)} y={r(appuiY + tablette)} width={r(D - G + debord * 2)} height={r(Math.max(2, tablette * 1.6))} fill={`url(#${ids("sous-tablette")})`} />

      {/* Une ombre douce sur les bords, comme une photo. */}
      <rect x={0} y={0} width={LARGEUR} height={HAUTEUR} fill={`url(#${ids("vignette")})`} pointerEvents="none" />

      {/* La ligne où mesurer la largeur demandée, en bleu « sélection », d'un mur à l'autre : il ressort sur le bois comme
          sur l'acier (l'orange se confondait avec une main courante en chêne). */}
      {surligne !== null && (
        <g pointerEvents="none">
          <rect x={r(G - 3)} y={r(surligne - 7)} width={r(D - G + 6)} height={14} rx={7} fill="#2f7fe0" opacity={0.18} />
          <rect x={r(G - 1)} y={r(surligne - 4.5)} width={r(D - G + 2)} height={9} rx={4.5} fill="none" stroke="#2f7fe0" strokeWidth={1.8} />
        </g>
      )}
      {/* Les lignes de rappel : du bord mesuré jusqu'au-delà de la cote. */}
      <g {...rappel}>
        <line x1={r(G - debord - 3)} x2={r(xGauche - 5)} y1={appuiY} y2={appuiY} />
        <line x1={r(D + 3)} x2={r(xDroite + 5)} y1={hautOuvertureY} y2={hautOuvertureY} />
        <line x1={r(D + debord + 3)} x2={r(xDroite + 5)} y1={appuiY} y2={appuiY} />
      </g>
      <Cote
        cote="largeurHaut"
        de={[G, yLargeurHaut]}
        a={[D, yLargeurHaut]}
        texte={largeurHautMm !== undefined ? enMm(largeurHautMm, locale) : noms.largeurHaut}
        vide={largeurHautMm === undefined}
        actif={actif === "largeurHaut"}
        label={labels.largeurHaut ?? labels.largeur}
        ombre={ids("ombre")}
        onChoisir={onChoisir}
      />
      <Cote
        cote="largeur"
        de={[G, yLargeurBas]}
        a={[D, yLargeurBas]}
        texte={largeurMm !== undefined ? enMm(largeurMm, locale) : noms.largeur}
        vide={largeurMm === undefined}
        actif={actif === "largeur"}
        label={labels.largeur}
        ombre={ids("ombre")}
        onChoisir={onChoisir}
      />
      {actif === "largeurHaut" ? (
        <Cote
          cote="largeurHaut"
          vertical
          de={[xGauche, solY]}
          a={[xGauche, yLargeurHaut]}
          texte={fr ? "1 m" : "1 m"}
          vide={false}
          actif
          label={fr ? "1 m depuis le sol" : "1 m from the floor"}
          ombre={ids("ombre")}
          onChoisir={onChoisir}
        />
      ) : (
      <Cote
        cote="allege"
        vertical
        de={[xGauche, solY]}
        a={[xGauche, appuiY]}
        texte={allegeMm !== undefined ? enMm(allegeMm, locale) : noms.allege}
        vide={allegeMm === undefined}
        actif={actif === "allege"}
        label={labels.allege}
        ombre={ids("ombre")}
        onChoisir={onChoisir}
      />
      )}
      <Cote
        cote="fenetre"
        vertical
        de={[xDroite, appuiY]}
        a={[xDroite, hautOuvertureY]}
        texte={hauteurFenetreMm !== undefined ? enMm(hauteurFenetreMm, locale) : noms.fenetre}
        vide={hauteurFenetreMm === undefined}
        actif={actif === "fenetre"}
        label={labels.fenetre}
        ombre={ids("ombre")}
        onChoisir={onChoisir}
      />
    </svg>
  );
}

/** La main courante : du bois avec son arête éclairée, ou de l'acier (plat, ou profilé au dessus bombé). */
function MainCourante({
  x,
  y,
  largeur,
  hauteur,
  type,
  acier,
  bois,
}: {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  type?: "acier-plat" | "acier-profile";
  acier: string;
  bois: string;
}) {
  const enAcier = type !== undefined;
  const teinte = enAcier ? acier : bois;
  return (
    <g>
      <rect
        x={r(x)}
        y={r(y)}
        width={r(largeur)}
        height={r(hauteur)}
        rx={type === "acier-profile" ? r(hauteur / 2) : enAcier ? 0.8 : Math.min(2, hauteur / 3)}
        fill={teinte}
        stroke={melange(teinte, "#000000", enAcier ? 0.15 : 0.28)}
        strokeWidth={0.6}
      />
      {/* L'arête du dessus prend la lumière. */}
      {hauteur > 2.5 && <line x1={r(x + 1.5)} x2={r(x + largeur - 1.5)} y1={r(y + 0.8)} y2={r(y + 0.8)} stroke="#ffffff" strokeOpacity={enAcier ? 0.18 : 0.4} strokeWidth={0.6} />}
    </g>
  );
}
