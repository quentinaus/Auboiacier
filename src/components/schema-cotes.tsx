"use client";

/**
 * Le croquis coté du bloc « à vos cotes ».
 *
 * La pièce vue de trois quarts, comme sur les photos : le plateau de bois sur
 * ses pieds — ou le caisson lumineux seul, quand il n'y a pas de pieds. C'est
 * un plan d'atelier, pas une illustration : son seul travail est de montrer
 * où se prend chaque cote.
 *
 * Chaque cote porte un numéro, le même que devant sa case. La cote qu'on
 * remplit s'allume, la valeur tapée s'écrit à côté de son numéro, et cliquer
 * un numéro amène le curseur dans la case.
 */

const TRAIT = "#a3968a";
const ACCENT = "#6d2c2c";
const ENCRE = "#2a2116";

type Point = [number, number];
const r = (n: number) => Math.round(n * 100) / 100;

export type CoteActive = "principale" | "secondaire" | "epaisseur" | "hauteur" | null;
export type CoteSchema = Exclude<CoteActive, null>;

/* Le plateau, vu de biais : la face du dessus, le chant avant, le petit côté. */
const A: Point = [86, 44]; // dessus, arrière gauche
const B: Point = [262, 44]; // dessus, arrière droit
const C: Point = [300, 92]; // dessus, avant droit
const D: Point = [124, 92]; // dessus, avant gauche
const EP = 13; // épaisseur dessinée du chant
const SOL = 196; // le sol, quand la pièce a des pieds

/** La pastille numérotée, cliquable : la même que devant la case. */
function Pastille({
  n,
  cx,
  cy,
  actif,
  label,
  valeur,
  onChoisir,
  cote,
  ancre = "middle",
}: {
  n: number;
  cx: number;
  cy: number;
  actif: boolean;
  label: string;
  /** La cote tapée, écrite à côté du numéro. */
  valeur?: string;
  onChoisir?: (cote: CoteSchema) => void;
  cote: CoteSchema;
  /** Où s'écrit la valeur par rapport à la pastille. */
  ancre?: "start" | "middle" | "end";
}) {
  const x = ancre === "start" ? cx + 15 : ancre === "end" ? cx - 15 : cx;
  const y = ancre === "middle" ? cy + 22 : cy + 4;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${n}. ${label}${valeur ? ` — ${valeur}` : ""}`}
      onClick={() => onChoisir?.(cote)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoisir?.(cote);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <circle cx={cx} cy={cy} r={10.5} fill={actif ? ACCENT : "#ffffff"} stroke={actif ? ACCENT : ENCRE} strokeWidth={1.3} />
      <text x={cx} y={cy + 4.2} textAnchor="middle" fontSize={12} fontWeight={700} fill={actif ? "#ffffff" : ENCRE}>
        {n}
      </text>
      {valeur && (
        <text
          x={x}
          y={y}
          textAnchor={ancre}
          fontSize={10.5}
          fontWeight={600}
          fill={actif ? ACCENT : ENCRE}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {valeur}
        </text>
      )}
    </g>
  );
}

/** Une cote : ses traits d'attache et sa ligne à deux pointes. */
function Fleche({ de, a, attaches = [], actif }: { de: Point; a: Point; attaches?: [Point, Point][]; actif: boolean }) {
  const couleur = actif ? ACCENT : "#5c5140";
  const angle = Math.atan2(a[1] - de[1], a[0] - de[0]);
  const pointe = (p: Point, sens: 0 | 1) => {
    const l = 5.5;
    const o = 0.42;
    const base = angle + sens * Math.PI;
    return `M${p[0]} ${p[1]} l${r(l * Math.cos(base + o))} ${r(l * Math.sin(base + o))} M${p[0]} ${p[1]} l${r(l * Math.cos(base - o))} ${r(l * Math.sin(base - o))}`;
  };
  return (
    <g>
      {attaches.map(([p1, p2], i) => (
        <line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={TRAIT} strokeWidth={0.8} strokeDasharray="2.5 2.5" />
      ))}
      <path
        d={`M${de[0]} ${de[1]} L${a[0]} ${a[1]} ${pointe(de, 0)} ${pointe(a, 1)}`}
        stroke={couleur}
        strokeWidth={actif ? 1.8 : 1.2}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Les pieds : deux panneaux plats sous le plateau, et l'ombre au sol. */
function Pieds({ gauche, droite, haut }: { gauche: number; droite: number; haut: number }) {
  const acier = "#2b2320";
  return (
    <g>
      <ellipse cx={(gauche + droite) / 2} cy={SOL + 3} rx={(droite - gauche) / 2 + 26} ry={7} fill="#2a2116" opacity={0.08} />
      <rect x={gauche} y={haut} width={11} height={SOL - haut} fill={acier} rx={1} />
      <rect x={droite - 11} y={haut} width={11} height={SOL - haut} fill={acier} rx={1} />
      <rect x={gauche - 8} y={SOL - 3} width={27} height={3} fill={acier} />
      <rect x={droite - 19} y={SOL - 3} width={27} height={3} fill={acier} />
    </g>
  );
}

export function SchemaCotes({
  forme,
  matiere = "bois",
  labels,
  valeurs,
  actif,
  onChoisir,
  locale = "fr",
}: {
  forme: "rect" | "rond";
  /** La description lue par les lecteurs d'écran suit la langue de la page. */
  locale?: "fr" | "en";
  /** Un plateau de bois sur ses pieds, ou un caisson lumineux à cadre thermolaqué. */
  matiere?: "bois" | "lumiere";
  /** Les intitulés viennent du produit : longueur/largeur, ou largeur/hauteur. `hauteur` : la hauteur finie d'une table. */
  labels: { principale: string; secondaire?: string; epaisseur: string; hauteur?: string };
  /** Les cotes en cours de saisie, écrites sur le dessin. */
  valeurs?: { principale?: string; secondaire?: string; epaisseur?: string; hauteur?: string };
  actif: CoteActive;
  /** Cliquer un numéro amène le curseur dans sa case. */
  onChoisir?: (cote: CoteSchema) => void;
}) {
  const rond = forme === "rond";
  const lumiere = matiere === "lumiere";
  const pieds = !lumiere && Boolean(labels.hauteur);

  // Les numéros suivent l'ordre des cases : ① la grande cote, ② la seconde
  // (pas sur un rond), ③ l'épaisseur, ④ la hauteur (les tables seulement).
  const ordre = (
    ["principale", rond ? null : "secondaire", "epaisseur", pieds ? "hauteur" : null] as (CoteSchema | null)[]
  ).filter((c): c is CoteSchema => c !== null);
  const n = (cote: CoteSchema) => ordre.indexOf(cote) + 1;

  // La toile est blanche dans son cadre noir, le bois est un chêne clair dont
  // le chant est un ton en dessous : les mêmes matières que sur les photos.
  const dessus = lumiere ? "#faf8f4" : "url(#bois-dessus)";
  const chant = lumiere ? "#302b26" : "#bd9256";
  const cote = lumiere ? "#211d19" : "#a67f47";

  const legende = locale === "en" ? "Dimensioned sketch: " : "Croquis coté : ";
  const hauteurBox = pieds ? 232 : rond ? 132 : 150;

  /* Le disque, pour les pièces rondes. */
  const cx = 193;
  const cy = 62;
  const rx = 104;
  const ry = 34;

  const pastille = (cote: CoteSchema, cx: number, cy: number, label: string, ancre?: "start" | "middle" | "end") => (
    <Pastille
      n={n(cote)}
      cote={cote}
      cx={cx}
      cy={cy}
      actif={actif === cote}
      label={label}
      valeur={valeurs?.[cote]}
      onChoisir={onChoisir}
      ancre={ancre}
    />
  );

  return (
    <svg
      viewBox={`0 0 400 ${hauteurBox}`}
      role="img"
      aria-label={`${legende}${ordre.map((c) => labels[c]).join(", ")}`}
      className="mx-auto h-auto w-full max-w-[440px]"
    >
      <defs>
        <linearGradient id="bois-dessus" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#e6c592" />
          <stop offset="0.55" stopColor="#dcb782" />
          <stop offset="1" stopColor="#e3bf8b" />
        </linearGradient>
        <pattern id="fil" width="26" height="6" patternUnits="userSpaceOnUse" patternTransform="skewX(-38)">
          <path d="M0 3 H26" stroke="#a67f47" strokeWidth="0.6" opacity="0.25" />
        </pattern>
      </defs>

      {rond ? (
        <>
          {pieds && <Pieds gauche={cx - 62} droite={cx + 62} haut={cy + EP + 8} />}
          <path
            d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L${cx + rx} ${cy + EP} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy + EP} Z`}
            fill={chant}
          />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={dessus} />
          {!lumiere && <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#fil)" />}
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={ENCRE} strokeWidth={0.9} opacity={0.32} />

          {/* ① Le diamètre, au-dessus. */}
          <Fleche
            de={[cx - rx, cy - 44]}
            a={[cx + rx, cy - 44]}
            actif={actif === "principale"}
            attaches={[
              [[cx - rx, cy - 2], [cx - rx, cy - 48]],
              [[cx + rx, cy - 2], [cx + rx, cy - 48]],
            ]}
          />
          {pastille("principale", cx, cy - 44, labels.principale)}

          {/* L'épaisseur, à gauche du chant. */}
          <Fleche
            de={[cx - rx - 22, cy]}
            a={[cx - rx - 22, cy + EP]}
            actif={actif === "epaisseur"}
            attaches={[
              [[cx - rx, cy], [cx - rx - 26, cy]],
              [[cx - rx, cy + EP], [cx - rx - 26, cy + EP]],
            ]}
          />
          {pastille("epaisseur", cx - rx - 42, cy + EP / 2, labels.epaisseur, "end")}

          {/* La hauteur finie, à droite : du sol au dessus du plateau. */}
          {pieds && (
            <>
              <Fleche
                de={[cx + rx + 26, SOL]}
                a={[cx + rx + 26, cy]}
                actif={actif === "hauteur"}
                attaches={[
                  [[cx + rx, cy], [cx + rx + 30, cy]],
                  [[cx + 70, SOL], [cx + rx + 30, SOL]],
                ]}
              />
              {pastille("hauteur", cx + rx + 46, (cy + SOL) / 2, labels.hauteur ?? "", "start")}
            </>
          )}
        </>
      ) : (
        <>
          {pieds && <Pieds gauche={D[0] + 22} droite={C[0] - 22} haut={D[1] + EP} />}
          {/* Le pavé : chant avant, petit côté, puis la face du dessus. */}
          <polygon points={`${D[0]},${D[1]} ${C[0]},${C[1]} ${C[0]},${C[1] + EP} ${D[0]},${D[1] + EP}`} fill={chant} />
          <polygon points={`${B[0]},${B[1]} ${C[0]},${C[1]} ${C[0]},${C[1] + EP} ${B[0]},${B[1] + EP}`} fill={cote} />
          <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}`} fill={dessus} />
          {!lumiere && <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}`} fill="url(#fil)" />}
          <g fill="none" stroke={ENCRE} strokeWidth={0.9} opacity={0.32}>
            <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}`} />
            <path d={`M${D[0]} ${D[1]} L${D[0]} ${D[1] + EP} L${C[0]} ${C[1] + EP} L${C[0]} ${C[1]} M${C[0]} ${C[1] + EP} L${B[0]} ${B[1] + EP} L${B[0]} ${B[1]}`} />
          </g>

          {/* ① La grande cote, le long du bord arrière, au-dessus. */}
          <Fleche
            de={[A[0], A[1] - 22]}
            a={[B[0], B[1] - 22]}
            actif={actif === "principale"}
            attaches={[
              [[A[0], A[1] - 2], [A[0], A[1] - 26]],
              [[B[0], B[1] - 2], [B[0], B[1] - 26]],
            ]}
          />
          {pastille("principale", (A[0] + B[0]) / 2, A[1] - 22, labels.principale)}

          {/* ② La seconde cote, dans la profondeur, le long du petit côté. */}
          <Fleche
            de={[C[0] + 20, C[1] - 6]}
            a={[B[0] + 20, B[1] - 6]}
            actif={actif === "secondaire"}
            attaches={[
              [[C[0] + 2, C[1] - 1], [C[0] + 24, C[1] - 7]],
              [[B[0] + 2, B[1] - 1], [B[0] + 24, B[1] - 7]],
            ]}
          />
          {pastille("secondaire", (C[0] + B[0]) / 2 + 38, (C[1] + B[1]) / 2 - 6, labels.secondaire ?? "", "start")}

          {/* ③ L'épaisseur, à gauche du chant. */}
          <Fleche
            de={[D[0] - 20, D[1]]}
            a={[D[0] - 20, D[1] + EP]}
            actif={actif === "epaisseur"}
            attaches={[
              [[D[0], D[1]], [D[0] - 24, D[1]]],
              [[D[0], D[1] + EP], [D[0] - 24, D[1] + EP]],
            ]}
          />
          {pastille("epaisseur", D[0] - 40, D[1] + EP / 2, labels.epaisseur, "end")}

          {/* ④ La hauteur finie, à droite : du sol au dessus du plateau. */}
          {pieds && (
            <>
              <Fleche
                de={[C[0] + 44, SOL]}
                a={[C[0] + 44, C[1]]}
                actif={actif === "hauteur"}
                attaches={[
                  [[C[0] + 2, C[1] + 1], [C[0] + 48, C[1] + 1]],
                  [[C[0] - 14, SOL], [C[0] + 48, SOL]],
                ]}
              />
              {pastille("hauteur", C[0] + 64, (C[1] + SOL) / 2, labels.hauteur ?? "", "start")}
            </>
          )}
        </>
      )}
    </svg>
  );
}
