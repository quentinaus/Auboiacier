"use client";

import { useState } from "react";

/**
 * Le croquis coté du bloc « à vos cotes » : le plateau seul, vu de trois
 * quarts, comme une planche posée sur l'établi. Pas de piétement — il
 * n'apprend rien sur les cotes, et c'est le plateau qui fait le prix.
 *
 * Chaque cote porte un numéro, le même que devant sa case. La cote qu'on
 * remplit s'allume, la valeur tapée s'écrit à côté de son numéro, et cliquer
 * une cote amène le curseur dans la case.
 */

const ENCRE = "#2a2116";
const ACCENT = "#2b2320";
/** Les cotes au repos : lisibles, mais derrière le plateau. */
const REPOS = "#7a6e61";
/** Les traits d'attache, plus légers que les cotes. */
const ATTACHE = "#bdb2a3";

type Point = [number, number];
const r = (n: number) => Math.round(n * 100) / 100;
const p = (pt: Point) => `${r(pt[0])},${r(pt[1])}`;

export type CoteActive = "principale" | "secondaire" | "epaisseur" | "hauteur" | null;
/** Les cotes dessinées. La hauteur finie d'une table n'en est pas : le croquis ne montre que le plateau. */
export type CoteSchema = "principale" | "secondaire" | "epaisseur";

type Etat = "repos" | "survol" | "actif";

/** La boîte du dessin, en unités SVG. */
const LARGEUR_BOX = 460;
const HAUTEUR_BOX = 180;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Le plateau en isométrie : la longueur monte vers la droite, la largeur vers
 * la gauche, toutes deux à 30° et à la MÊME échelle. C'est la seule vue où
 * un plateau carré se lit carré et un 300 × 100 trois fois plus long que
 * large. Les proportions sont bornées pour rester lisibles (un 400 × 80 ne
 * devient pas un trait), et l'épaisseur est exagérée : à l'échelle, 35 mm sur
 * 2 m feraient trois pixels.
 */
const ISO: Point = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)]; // (0,866, 0,5)

function geometrieRect(mm: { principale?: number; secondaire?: number; epaisseur?: number }) {
  const L = mm.principale && mm.principale > 0 ? mm.principale : 2000;
  const W = mm.secondaire && mm.secondaire > 0 ? mm.secondaire : 1000;
  const T = mm.epaisseur && mm.epaisseur > 0 ? mm.epaisseur : 35;
  const ratio = clamp(L / W, 0.5, 4); // longueur / largeur
  // La place disponible : les cotes prennent 46 px de chaque côté et 34 px
  // sous la pointe avant ; 10 px libres au-dessus du coin arrière.
  const largeurUtile = LARGEUR_BOX - 2 * 46;
  const hauteurUtile = HAUTEUR_BOX - 10 - 34;
  const ep = clamp(Math.round(6 + (T / 35) * 10), 8, 26);
  // Longueur dessinée L·k, largeur W·k : le losange fait 0,866·(L+W)·k de
  // large et 0,5·(L+W)·k + ep de haut. On prend le plus grand k qui tienne.
  const somme = ratio + 1;
  const k = Math.min(largeurUtile / (ISO[0] * somme), (hauteurUtile - ep) / (ISO[1] * somme));
  const lPx = ratio * k;
  const wPx = k;
  const largeur = ISO[0] * (lPx + wPx);
  const hauteur = ISO[1] * (lPx + wPx) + ep;
  const gauche = (LARGEUR_BOX - largeur) / 2;
  const haut = 10 + (hauteurUtile - hauteur) / 2;
  // La pointe avant (D) est en bas ; C au bout de la longueur, A au bout de
  // la largeur, B au fond.
  const D: Point = [gauche + ISO[0] * wPx, haut + ISO[1] * (lPx + wPx)];
  const C: Point = [D[0] + ISO[0] * lPx, D[1] - ISO[1] * lPx];
  const A: Point = [D[0] - ISO[0] * wPx, D[1] - ISO[1] * wPx];
  const B: Point = [C[0] - ISO[0] * wPx, C[1] - ISO[1] * wPx];
  return { A, B, C, D, EP: ep };
}

/** Le disque : son diamètre remplit la place, l'épaisseur suit la même règle. */
function geometrieRond(mm: { principale?: number; epaisseur?: number }) {
  const T = mm.epaisseur && mm.epaisseur > 0 ? mm.epaisseur : 35;
  const ep = clamp(Math.round(6 + (T / 35) * 10), 8, 26);
  const RX = 120;
  const RY = 42;
  const O: Point = [222, 96];
  return { O, RX, RY, EP: ep };
}

/** La pointe pleine d'une cote : un petit triangle, tourné dans le sens de la ligne. */
function pointe(tip: Point, angle: number) {
  const l = 7;
  const w = 2.4;
  const bx = tip[0] - l * Math.cos(angle);
  const by = tip[1] - l * Math.sin(angle);
  const nx = -Math.sin(angle) * w;
  const ny = Math.cos(angle) * w;
  return `${p(tip)} ${p([bx + nx, by + ny])} ${p([bx - nx, by - ny])}`;
}

/**
 * Une cote complète : ses traits d'attache, sa ligne à deux pointes, sa
 * pastille numérotée et la valeur tapée. Tout le groupe se clique.
 */
function Cote({
  n,
  de,
  a,
  attaches,
  etat,
  label,
  valeur,
  pastille,
  valeurA,
  exterieur = false,
  compact = false,
  onChoisir,
  onSurvol,
}: {
  n: number;
  de: Point;
  a: Point;
  attaches: [Point, Point][];
  etat: Etat;
  label: string;
  valeur?: string;
  /** Où pose la pastille. */
  pastille: Point;
  /** Où s'écrit la valeur : sur la ligne, à droite de la pastille, ou dessous. */
  valeurA: "droite" | "dessous";
  /** Les pointes à l'extérieur, pour une cote trop courte pour les loger. */
  exterieur?: boolean;
  /** Dessin nu et plus lisible : pastilles plus grandes, traits plus francs. */
  compact?: boolean;
  onChoisir?: () => void;
  onSurvol?: (dedans: boolean) => void;
}) {
  const actif = etat === "actif";
  const rayon = compact ? 14 : 11;
  const corps = compact ? 14 : 12;
  const couleur = actif ? ACCENT : etat === "survol" ? ENCRE : REPOS;
  const angle = Math.atan2(a[1] - de[1], a[0] - de[0]);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // Les pointes tournées vers l'extérieur ; quand la cote est courte, la
  // ligne déborde et les pointes visent l'intérieur depuis dehors.
  const debord = exterieur ? 12 : 0;
  const ligne: [Point, Point] = exterieur
    ? [
        [de[0] - ux * debord, de[1] - uy * debord],
        [a[0] + ux * debord, a[1] + uy * debord],
      ]
    : [de, a];
  const pointes = exterieur
    ? [pointe(de, angle), pointe(a, angle + Math.PI)]
    : [pointe(de, angle + Math.PI), pointe(a, angle)];

  const [vx, vy] = valeurA === "droite" ? [pastille[0] + 16, pastille[1] + 4] : [pastille[0], pastille[1] + 24];

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${n}. ${label}${valeur ? ` — ${valeur}` : ""}`}
      onClick={onChoisir}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoisir?.();
        }
      }}
      onMouseEnter={() => onSurvol?.(true)}
      onMouseLeave={() => onSurvol?.(false)}
      style={{ cursor: "pointer", outline: "none" }}
    >
      {/* La zone cliquable : plus large que le trait, pour le doigt. */}
      <line x1={ligne[0][0]} y1={ligne[0][1]} x2={ligne[1][0]} y2={ligne[1][1]} stroke="transparent" strokeWidth={22} />
      {attaches.map(([p1, p2], i) => (
        <line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={actif ? ACCENT : ATTACHE} strokeWidth={0.9} opacity={actif ? 0.55 : 1} />
      ))}
      <line
        x1={ligne[0][0]}
        y1={ligne[0][1]}
        x2={ligne[1][0]}
        y2={ligne[1][1]}
        stroke={couleur}
        strokeWidth={compact ? (actif ? 2 : 1.4) : actif ? 1.6 : 1.1}
        strokeLinecap="round"
      />
      {pointes.map((d, i) => (
        <polygon key={i} points={d} fill={couleur} />
      ))}

      {/* La pastille, posée sur la ligne : blanche au repos, pleine quand la case est active. */}
      <circle
        cx={pastille[0]}
        cy={pastille[1]}
        r={rayon}
        fill={actif ? ACCENT : "#ffffff"}
        stroke={actif ? ACCENT : etat === "survol" ? ENCRE : REPOS}
        strokeWidth={etat === "repos" ? 1.2 : 1.6}
      />
      <text
        x={pastille[0]}
        y={pastille[1] + (compact ? 5 : 4.3)}
        textAnchor="middle"
        fontSize={corps}
        fontWeight={700}
        fill={actif ? "#ffffff" : ENCRE}
        style={{ userSelect: "none" }}
      >
        {n}
      </text>

      {valeur && (
        <text
          x={vx}
          y={vy}
          textAnchor={valeurA === "droite" ? "start" : "middle"}
          fontSize={11}
          fontWeight={600}
          fill={actif ? ACCENT : ENCRE}
          stroke="#ffffff"
          strokeWidth={4}
          paintOrder="stroke"
          strokeLinejoin="round"
          style={{ fontVariantNumeric: "tabular-nums", userSelect: "none" }}
        >
          {valeur}
        </text>
      )}
    </g>
  );
}

/** Une veine du bois : une ligne ondulée, dessinée sur toute la largeur puis rognée à la face. */
function veine(y: number, amplitude: number, decalage: number) {
  const pas = 46;
  let d = `M${-pas + decalage} ${y} q${pas / 2} ${-amplitude} ${pas} 0`;
  for (let i = 0; i < 14; i += 1) d += ` t${pas} 0`;
  return d;
}

export function SchemaCotes({
  forme,
  matiere = "bois",
  labels,
  valeurs,
  actif,
  onChoisir,
  locale = "fr",
  compact = false,
  proportions,
}: {
  forme: "rect" | "rond";
  /** Les cotes en millimètres, pour dessiner le plateau à leurs proportions. */
  proportions?: { principale?: number; secondaire?: number; epaisseur?: number };
  /** Sans cadre ni valeurs écrites : les chiffres sont dans les lignes juste dessous. */
  compact?: boolean;
  /** La description lue par les lecteurs d'écran suit la langue de la page. */
  locale?: "fr" | "en";
  /** Un plateau de bois, ou un caisson lumineux à cadre laqué. */
  matiere?: "bois" | "lumiere";
  /** Les intitulés viennent du produit : longueur/largeur, ou largeur/hauteur. */
  labels: { principale: string; secondaire?: string; epaisseur: string };
  /** Les cotes en cours de saisie, écrites sur le dessin. */
  valeurs?: { principale?: string; secondaire?: string; epaisseur?: string };
  actif: CoteActive;
  /** Cliquer une cote amène le curseur dans sa case. */
  onChoisir?: (cote: CoteSchema) => void;
}) {
  const rond = forme === "rond";
  const lumiere = matiere === "lumiere";
  const [survol, setSurvol] = useState<CoteSchema | null>(null);

  // Les numéros suivent l'ordre des cases : ① la grande cote, ② la seconde
  // (pas sur un rond), ③ l'épaisseur.
  const ordre = (["principale", rond ? null : "secondaire", "epaisseur"] as (CoteSchema | null)[]).filter(
    (c): c is CoteSchema => c !== null
  );
  const n = (cote: CoteSchema) => ordre.indexOf(cote) + 1;
  const etat = (cote: CoteSchema): Etat => (actif === cote ? "actif" : survol === cote ? "survol" : "repos");

  // Le bois est un chêne clair dont le chant est un ton en dessous ; la toile
  // est blanche dans son cadre sombre : les mêmes matières que sur les photos.
  const dessus = lumiere ? "url(#toile)" : "url(#bois-dessus)";
  const chant = lumiere ? "#332d28" : "url(#bois-chant)";
  const bout = lumiere ? "#241f1b" : "url(#bois-bout)";

  const legende =
    locale === "en"
      ? `Dimensioned sketch of the ${lumiere ? "housing" : "top"}: `
      : `Croquis coté du ${lumiere ? "caisson" : "plateau"} : `;
  const hauteurBox = rond ? 176 : HAUTEUR_BOX;
  const largeurBox = LARGEUR_BOX;
  const { A, B, C, D, EP } = geometrieRect(proportions ?? {});
  const { O, RX, RY } = geometrieRond(proportions ?? {});
  const bas = (pt: Point): Point => [pt[0], pt[1] + EP];

  const cote = (
    c: CoteSchema,
    props: Omit<Parameters<typeof Cote>[0], "n" | "etat" | "label" | "valeur" | "onChoisir" | "onSurvol">
  ) => (
    <Cote
      compact={compact}
      n={n(c)}
      etat={etat(c)}
      label={c === "principale" ? labels.principale : c === "secondaire" ? labels.secondaire ?? "" : labels.epaisseur}
      valeur={compact ? undefined : valeurs?.[c]}
      onChoisir={onChoisir ? () => onChoisir(c) : undefined}
      onSurvol={(dedans) => setSurvol((s) => (dedans ? c : s === c ? null : s))}
      {...props}
    />
  );

  /** L'arête qui s'allume avec sa cote. */
  const arete = (c: CoteSchema, d: string) =>
    actif === c ? <path d={d} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" /> : null;

  return (
    <svg
      viewBox={`0 0 ${largeurBox} ${hauteurBox}`}
      role="group"
      aria-label={`${legende}${ordre.map((c) => (c === "secondaire" ? labels.secondaire : labels[c])).join(", ")}`}
      className={compact ? "h-auto w-full select-none" : "mx-auto h-auto w-full max-w-[520px] select-none"}
      fontFamily="inherit"
    >
      <defs>
        <linearGradient id="bois-dessus" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efd9ac" />
          <stop offset="0.5" stopColor="#e4c48f" />
          <stop offset="1" stopColor="#d9b67e" />
        </linearGradient>
        <linearGradient id="bois-chant" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99f66" />
          <stop offset="1" stopColor="#b98f58" />
        </linearGradient>
        <linearGradient id="bois-bout" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b3894f" />
          <stop offset="1" stopColor="#a27a45" />
        </linearGradient>
        <radialGradient id="toile" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1ede6" />
        </radialGradient>
        <filter id="ombre" x="-20%" y="-60%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        {rond ? (
          <clipPath id="face">
            <ellipse cx={O[0]} cy={O[1]} rx={RX} ry={RY} />
          </clipPath>
        ) : (
          <clipPath id="face">
            <polygon points={`${p(A)} ${p(B)} ${p(C)} ${p(D)}`} />
          </clipPath>
        )}
      </defs>

      {rond ? (
        <>
          {/* L'ombre portée, douce, qui pose le disque. */}
          <ellipse cx={O[0] + 10} cy={O[1] + EP + 12} rx={RX} ry={RY * 0.85} fill={ENCRE} opacity={0.16} filter="url(#ombre)" />

          {/* Le chant : la moitié avant du cylindre. */}
          <path
            d={`M${O[0] - RX} ${O[1]} A${RX} ${RY} 0 0 0 ${O[0] + RX} ${O[1]} L${O[0] + RX} ${O[1] + EP} A${RX} ${RY} 0 0 1 ${O[0] - RX} ${O[1] + EP} Z`}
            fill={chant}
          />
          <ellipse cx={O[0]} cy={O[1]} rx={RX} ry={RY} fill={dessus} />
          {!lumiere && (
            <g clipPath="url(#face)" fill="none" stroke="#a67f47" strokeWidth={0.8}>
              {[-30, -20, -11, -3, 5, 13, 22, 31].map((dy, i) => (
                <path key={i} d={veine(O[1] + dy, 1.6 + (i % 3) * 0.6, (i * 17) % 46)} opacity={0.16 + (i % 2) * 0.08} />
              ))}
            </g>
          )}
          <g fill="none" stroke={ENCRE} strokeWidth={1} opacity={0.42}>
            <ellipse cx={O[0]} cy={O[1]} rx={RX} ry={RY} />
            <path
              d={`M${O[0] - RX} ${O[1]} L${O[0] - RX} ${O[1] + EP} A${RX} ${RY} 0 0 0 ${O[0] + RX} ${O[1] + EP} L${O[0] + RX} ${O[1]}`}
            />
          </g>
          {arete("principale", `M${O[0] - RX} ${O[1]} A${RX} ${RY} 0 0 1 ${O[0] + RX} ${O[1]}`)}
          {arete("epaisseur", `M${O[0] - RX} ${O[1]} L${O[0] - RX} ${O[1] + EP}`)}

          {/* ① Le diamètre, au-dessus. */}
          {cote("principale", {
            de: [O[0] - RX, 30],
            a: [O[0] + RX, 30],
            attaches: [
              [[O[0] - RX, O[1] - 3], [O[0] - RX, 24]],
              [[O[0] + RX, O[1] - 3], [O[0] + RX, 24]],
            ],
            pastille: [O[0], 30],
            valeurA: "droite",
          })}

          {/* ② L'épaisseur, à gauche du chant. */}
          {cote("epaisseur", {
            de: [O[0] - RX - 30, O[1]],
            a: [O[0] - RX - 30, O[1] + EP],
            attaches: [
              [[O[0] - RX - 3, O[1]], [O[0] - RX - 36, O[1]]],
              [[O[0] - RX - 3, O[1] + EP], [O[0] - RX - 36, O[1] + EP]],
            ],
            pastille: [O[0] - RX - 52, O[1] + EP / 2],
            valeurA: "dessous",
            exterieur: true,
          })}
        </>
      ) : (
        <>
          {/* L'ombre portée, douce, qui pose le plateau. */}
          <polygon
            points={`${p([A[0] + 6, A[1] + EP + 10])} ${p([B[0] + 6, B[1] + EP + 10])} ${p([C[0] + 6, C[1] + EP + 10])} ${p([D[0] + 6, D[1] + EP + 10])}`}
            fill={ENCRE}
            opacity={0.14}
            filter="url(#ombre)"
          />

          {/* Le pavé : les deux chants visibles (longueur à droite, largeur à
              gauche), puis la face du dessus. */}
          <polygon points={`${p(D)} ${p(C)} ${p(bas(C))} ${p(bas(D))}`} fill={chant} />
          <polygon points={`${p(A)} ${p(D)} ${p(bas(D))} ${p(bas(A))}`} fill={bout} />
          <polygon points={`${p(A)} ${p(B)} ${p(C)} ${p(D)}`} fill={dessus} />
          {!lumiere && (
            <>
              {/* Les veines suivent la longueur : des lignes parallèles à D→C. */}
              <g clipPath="url(#face)" fill="none" stroke="#a67f47" strokeWidth={0.8}>
                {[0.12, 0.24, 0.36, 0.5, 0.62, 0.76, 0.88].map((f, i) => {
                  const x1 = D[0] + (A[0] - D[0]) * f;
                  const y1 = D[1] + (A[1] - D[1]) * f;
                  return (
                    <line
                      key={i}
                      x1={x1 - ISO[0] * 20}
                      y1={y1 + ISO[1] * 20}
                      x2={x1 + (C[0] - D[0]) + ISO[0] * 20}
                      y2={y1 + (C[1] - D[1]) - ISO[1] * 20}
                      opacity={0.14 + (i % 2) * 0.1}
                    />
                  );
                })}
              </g>
              {/* Le fil sur le chant, dans le sens de la longueur. */}
              <g fill="none" stroke="#8f6a38" strokeWidth={0.7} opacity={0.22}>
                {[0.3, 0.6].map((f) => (
                  <line key={f} x1={D[0]} y1={D[1] + EP * f} x2={C[0]} y2={C[1] + EP * f} />
                ))}
              </g>
            </>
          )}
          {lumiere && (
            /* Le cadre laqué, en fine bande autour de la toile. */
            <polygon points={`${p(A)} ${p(B)} ${p(C)} ${p(D)}`} fill="none" stroke="#332d28" strokeWidth={3} clipPath="url(#face)" />
          )}
          <g fill="none" stroke={ENCRE} strokeWidth={1} opacity={0.42} strokeLinejoin="round">
            <polygon points={`${p(A)} ${p(B)} ${p(C)} ${p(D)}`} />
            <path d={`M${p(A)} L${p(bas(A))} L${p(bas(D))} L${p(bas(C))} L${p(C)} M${p(D)} L${p(bas(D))}`} />
          </g>
          {arete("principale", `M${p(D)} L${p(C)}`)}
          {arete("secondaire", `M${p(D)} L${p(A)}`)}
          {arete("epaisseur", `M${p(D)} L${p(bas(D))}`)}

          {/* ① La longueur, le long du chant de droite, décalée vers l'extérieur. */}
          {cote("principale", {
            de: [bas(D)[0] + ISO[1] * 26, bas(D)[1] + ISO[0] * 26],
            a: [bas(C)[0] + ISO[1] * 26, bas(C)[1] + ISO[0] * 26],
            attaches: [
              [[bas(D)[0] + ISO[1] * 4, bas(D)[1] + ISO[0] * 4], [bas(D)[0] + ISO[1] * 32, bas(D)[1] + ISO[0] * 32]],
              [[bas(C)[0] + ISO[1] * 4, bas(C)[1] + ISO[0] * 4], [bas(C)[0] + ISO[1] * 32, bas(C)[1] + ISO[0] * 32]],
            ],
            pastille: [(bas(D)[0] + bas(C)[0]) / 2 + ISO[1] * 26, (bas(D)[1] + bas(C)[1]) / 2 + ISO[0] * 26],
            valeurA: "dessous",
          })}

          {/* ② La largeur, le long du chant de gauche. */}
          {cote("secondaire", {
            de: [bas(A)[0] - ISO[1] * 26, bas(A)[1] + ISO[0] * 26],
            a: [bas(D)[0] - ISO[1] * 26, bas(D)[1] + ISO[0] * 26],
            attaches: [
              [[bas(A)[0] - ISO[1] * 4, bas(A)[1] + ISO[0] * 4], [bas(A)[0] - ISO[1] * 32, bas(A)[1] + ISO[0] * 32]],
              [[bas(D)[0] - ISO[1] * 4, bas(D)[1] + ISO[0] * 4], [bas(D)[0] - ISO[1] * 32, bas(D)[1] + ISO[0] * 32]],
            ],
            pastille: [(bas(A)[0] + bas(D)[0]) / 2 - ISO[1] * 26, (bas(A)[1] + bas(D)[1]) / 2 + ISO[0] * 26],
            valeurA: "dessous",
          })}

          {/* ③ L'épaisseur, au bout droit, à côté du chant. */}
          {cote("epaisseur", {
            de: [C[0] + 26, C[1]],
            a: [C[0] + 26, C[1] + EP],
            attaches: [
              [[C[0] + 4, C[1]], [C[0] + 32, C[1]]],
              [[bas(C)[0] + 4, bas(C)[1]], [bas(C)[0] + 32, bas(C)[1]]],
            ],
            pastille: [C[0] + 44, C[1] + EP / 2],
            valeurA: "dessous",
            exterieur: true,
          })}
        </>
      )}
    </svg>
  );
}
