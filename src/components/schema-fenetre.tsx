"use client";

/**
 * Le croquis du garde-corps dans sa fenêtre, vu de l'intérieur de la pièce.
 *
 * On est debout dans la pièce : le parquet devant soi, le mur de pierre, la
 * fenêtre avec son appui, et le garde-corps derrière la vitre. Deux cotes à
 * prendre — ① la largeur de la fenêtre entre les murs, ② la hauteur du sol au
 * bas de la fenêtre — et une cote ③ que l'atelier calcule : la hauteur du
 * garde-corps, pour que sa main courante monte à la hauteur de la règle
 * (un mètre en étage, quatre-vingts centimètres au rez-de-chaussée). Le
 * garde-corps ne touche pas l'appui : il se pose 100 mm au-dessus, le jour
 * que la norme tolère, et ce jour est coté sur le dessin.
 *
 * Sur le dessin, rien que des numéros : les noms et les valeurs sont dans
 * les cases, juste à côté. La cote qu'on remplit s'allume, et cliquer un
 * numéro amène le curseur dans sa case. Le dessin est à l'échelle des cotes
 * tapées, largeur et hauteurs à la même échelle : une fenêtre de 4,5 m sur
 * une allège de 6 cm ressemble à ce qu'elle est.
 *
 * Le dessin est plus haut que large et se cadre en « slice » : il remplit
 * tout son cadre, quelle que soit sa forme, en rognant un peu de mur en haut
 * ou de parquet en bas — jamais la fenêtre ni ses cotes, qui tiennent dans la
 * bande du milieu.
 */

import { JOUR_MM } from "@/lib/garde-corps";

const ACCENT = "#6d2c2c";
const ENCRE = "#2a2116";
const VITRE = "#dfe9ef";
const ACIER = "#2b2320";
const BOIS = "#e0bd8c";

/** Le tuffeau, la pierre de Saumur : quatre teintes de crème, et un joint. */
const PIERRES = ["#ede6d8", "#e6ddcc", "#f0e9dc", "#e3d9c6"];
const JOINT = "#d6ccbb";
/** Les lames du parquet : cinq tons de chêne. */
const LAMES = ["#d8b78b", "#cba97a", "#dfbf94", "#c9a470", "#d3b385"];

export type CoteFenetre = "largeur" | "allege" | "fenetre" | "hauteur";

/** Le numéro de chaque cote : le même sur le dessin et devant sa case. */
export const NUMERO_COTE: Record<CoteFenetre, number> = { largeur: 1, allege: 2, fenetre: 3, hauteur: 4 };

type Point = [number, number];

const LARGEUR = 330;
const HAUTEUR = 660;
/** Le pied du mur : là où le parquet commence. Bas dans le cadre : c'est la
 *  fenêtre qu'on veut voir, pas le parquet. */
const SOL_Y = 430;
/** La place pour la fenêtre entre les pastilles de gauche et de droite, et pour les hauteurs du sol au haut de la fenêtre. */
const PLACE_LARGEUR = 210;
const PLACE_HAUTEUR = 230;
/** Profondeur apparente du tableau, de chaque côté de l'ouverture. */
const TABLEAU = 6;
/** Les cotes du modèle en photo, dessinées tant que le client n'a rien tapé. */
const MODELE = { largeurMm: 1180, hauteurMm: 350, fenetreMm: 1200 };

const r = (n: number) => Math.round(n * 100) / 100;

/** La pastille numérotée, cliquable. */
function Pastille({
  cote,
  cx,
  cy,
  actif,
  onChoisir,
  label,
}: {
  cote: CoteFenetre;
  cx: number;
  cy: number;
  actif: boolean;
  onChoisir?: (cote: CoteFenetre) => void;
  label: string;
}) {
  const n = NUMERO_COTE[cote];
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${n}. ${label}`}
      onClick={() => onChoisir?.(cote)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoisir?.(cote);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <circle cx={cx} cy={cy} r={12} fill={actif ? ACCENT : "#ffffff"} stroke={actif ? ACCENT : ENCRE} strokeWidth={1.5} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={actif ? "#ffffff" : ENCRE}>
        {n}
      </text>
    </g>
  );
}

/** Une flèche à deux pointes. */
function Fleche({ de, a, actif }: { de: Point; a: Point; actif: boolean }) {
  const couleur = actif ? ACCENT : "#4a3f35";
  const angle = Math.atan2(a[1] - de[1], a[0] - de[0]);
  const pointe = (p: Point, sens: 0 | 1) => {
    const l = 6;
    const o = 0.42;
    const base = angle + sens * Math.PI;
    return `M${p[0]} ${p[1]} l${r(l * Math.cos(base + o))} ${r(l * Math.sin(base + o))} M${p[0]} ${p[1]} l${r(l * Math.cos(base - o))} ${r(l * Math.sin(base - o))}`;
  };
  return (
    <path
      d={`M${de[0]} ${de[1]} L${a[0]} ${a[1]} ${pointe(de, 0)} ${pointe(a, 1)}`}
      stroke={couleur}
      strokeWidth={actif ? 2.4 : 1.7}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Une rosace : la fleur en fonte au croisement des barres. */
function Rosace({ cx, cy, taille = 6.5 }: { cx: number; cy: number; taille?: number }) {
  const k = taille / 6.5;
  const petales = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `M${cx} ${cy} m${r(Math.cos(a) * 2 * k)} ${r(Math.sin(a) * 2 * k)} l${r(Math.cos(a) * 5 * k)} ${r(Math.sin(a) * 5 * k)}`;
  }).join(" ");
  return (
    <g>
      <circle cx={cx} cy={cy} r={r(taille)} fill={ACIER} />
      <path d={petales} stroke="#5a5048" strokeWidth={r(1.4 * k)} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r(1.6 * k)} fill="#8a7d72" />
    </g>
  );
}

/**
 * Le mur, en pierre de taille : des assises de tuffeau posées en quinconce,
 * chaque bloc d'une teinte un peu différente. Les teintes suivent l'index du
 * bloc, jamais le hasard : le serveur et le navigateur dessinent le même mur.
 */
function MurDePierre({ bas, echelle }: { bas: number; echelle: number }) {
  // Des pierres de taille comme à Saumur : 25 cm de haut, 40 à 65 cm de long,
  // à la même échelle que la fenêtre — une grande fenêtre les fait petites.
  const ASSISE = Math.max(6, r(250 * echelle));
  const blocs: { x: number; y: number; w: number; teinte: string }[] = [];
  const rangs = Math.ceil(bas / ASSISE);
  for (let i = 0; i < rangs; i++) {
    const y = r(bas - (i + 1) * ASSISE);
    // Chaque assise commence décalée, et ses blocs n'ont pas tous la même longueur.
    let x = -r(((i * 37) % 60) * ASSISE / 24);
    let j = 0;
    while (x < LARGEUR) {
      const w = r((400 + ((i * 5 + j * 11) % 4) * 80) * echelle);
      blocs.push({ x, y, w, teinte: PIERRES[(i * 3 + j * 5) % PIERRES.length] });
      x += w;
      j++;
    }
  }
  return (
    <g>
      <rect x={0} y={0} width={LARGEUR} height={bas} fill={JOINT} />
      {blocs.map((b, k) => (
        <rect key={k} x={r(b.x + 0.9)} y={r(b.y + 0.9)} width={r(b.w - 1.8)} height={r(ASSISE - 1.8)} rx={1.2} fill={b.teinte} />
      ))}
      {/* Un voile de lumière : plus clair vers le haut, plus chaud près du sol. */}
      <rect x={0} y={0} width={LARGEUR} height={bas} fill="url(#lumiere-mur)" />
    </g>
  );
}

/**
 * Le parquet, vu depuis la pièce : des lames de chêne qui filent vers le mur,
 * serrées au fond, larges devant, avec leurs abouts en quinconce.
 */
function Parquet({ haut, bas, echelle }: { haut: number; bas: number; echelle: number }) {
  // Des lames de 14 cm, à l'échelle de la fenêtre, au pied du mur.
  const N = Math.max(3, Math.round(LARGEUR / Math.max(4, 140 * echelle)));
  const fuite = LARGEUR / 2; // le point de fuite, au milieu du mur
  /** Le bord gauche de la lame i, au fond et devant. */
  const xFond = (i: number) => fuite + ((i - N / 2) * LARGEUR) / N;
  const xDevant = (i: number) => fuite + ((i - N / 2) * LARGEUR * 2.1) / N;
  const xA = (i: number, y: number) => {
    const t = (y - haut) / (bas - haut);
    return r(xFond(i) + (xDevant(i) - xFond(i)) * t);
  };
  const lames = Array.from({ length: N }, (_, i) => i);
  // Les abouts : à des profondeurs qui se resserrent vers le fond, décalés d'une lame à l'autre.
  const abouts = [0.08, 0.2, 0.36, 0.56, 0.8];
  return (
    <g>
      {lames.map((i) => (
        <polygon
          key={i}
          points={`${r(xFond(i))},${haut} ${r(xFond(i + 1))},${haut} ${r(xDevant(i + 1))},${bas} ${r(xDevant(i))},${bas}`}
          fill={LAMES[(i * 2) % LAMES.length]}
        />
      ))}
      <g stroke="#a9895e" strokeWidth={0.8} opacity={0.75}>
        {lames.map((i) => (
          <line key={i} x1={r(xFond(i))} y1={haut} x2={r(xDevant(i))} y2={bas} />
        ))}
        {lames.map((i) =>
          abouts.map((t, k) => {
            if ((k + i) % 2) return null;
            const y = r(haut + (bas - haut) * t);
            return <line key={`${i}-${k}`} x1={xA(i, y)} y1={y} x2={xA(i + 1, y)} y2={y} />;
          })
        )}
      </g>
      {/* L'ombre du mur sur le sol, et la lumière qui vient de la fenêtre. */}
      <rect x={0} y={haut} width={LARGEUR} height={bas - haut} fill="url(#ombre-sol)" />
      {/* La plinthe, au pied du mur. */}
      <rect x={0} y={haut - 7} width={LARGEUR} height={7} fill="#f1ece3" />
      <line x1={0} y1={haut - 7} x2={LARGEUR} y2={haut - 7} stroke="#cfc4b2" strokeWidth={0.8} />
      <line x1={0} y1={haut} x2={LARGEUR} y2={haut} stroke="#8f7250" strokeWidth={0.9} />
    </g>
  );
}

export function SchemaFenetre({
  largeurMm,
  allegeMm,
  hauteurFenetreMm,
  hauteurMm,
  jourMm = JOUR_MM,
  mainCouranteMm,
  rosaceMm,
  labels,
  actif,
  onChoisir,
  locale = "fr",
  className = "h-full w-full",
  remplissage = "croix",
}: {
  /** Le diamètre de la rosace choisie, pour la dessiner à l'échelle. */
  rosaceMm?: number;
  /** Les croix du modèle, ou un panneau de verre à leur place. */
  remplissage?: "croix" | "verre";
  /** Les cotes dessinées à l'échelle. Sans valeur, le croquis prend celles du modèle. */
  largeurMm?: number;
  allegeMm?: number;
  /** De l'appui au haut de l'ouverture. */
  hauteurFenetreMm?: number;
  hauteurMm?: number;
  /** Le jour entre l'appui et le bas du garde-corps : 100 mm, celui de l'atelier. */
  jourMm?: number;
  /** Où arrive la main courante, depuis le sol : c'est là que passe la ligne de la règle. */
  mainCouranteMm?: number;
  labels: { largeur: string; allege: string; fenetre: string; hauteur: string; metre: string; interieur: string };
  actif: CoteFenetre | null;
  /** Cliquer une cote amène à sa case. */
  onChoisir?: (cote: CoteFenetre) => void;
  locale?: "fr" | "en";
  className?: string;
}) {
  // Les cotes, bornées à ce qui reste une fenêtre (une faute de frappe à
  // 20 000 mm écrasait tout le dessin) — mais proportionnelles entre elles.
  const borne = (mm: number, min: number, max: number) => Math.min(Math.max(mm, min), max);
  const L = borne(largeurMm ?? MODELE.largeurMm, 200, 3000);
  const H = borne(hauteurMm ?? MODELE.hauteurMm, 100, 1200);
  // Sans allège, on dessine celle qui met la main courante pile sur la règle.
  const A = borne(allegeMm ?? Math.max((mainCouranteMm ?? 1000) - H, 100), 0, 1500);
  const F = borne(hauteurFenetreMm ?? MODELE.fenetreMm, 200, 3000);
  const J = Math.max(jourMm, 0);
  // Une seule échelle pour tout : la plus grande cote décide, et tout reste
  // dans la bande du milieu. Trois unités au moins, pour qu'une flèche se voie.
  const echelle = Math.min(PLACE_LARGEUR / L, PLACE_HAUTEUR / (A + F));
  const largeur = r(L * echelle);
  const allege = Math.max(3, r(A * echelle));
  const fenetre = Math.max(3, r(F * echelle));
  const hauteur = Math.max(3, r(H * echelle));
  const jour = J > 0 ? Math.max(7, r(J * echelle)) : 0;
  const appuiY = r(SOL_Y - allege); // dessus de l'appui : le bas de la fenêtre
  const HAUT_OUVERTURE_Y = r(appuiY - fenetre); // le haut du tableau
  const basGardeCorpsY = r(appuiY - jour); // le bas du cadre, 100 mm au-dessus de l'appui
  const hautGardeCorpsY = r(basGardeCorpsY - hauteur); // dessus de la main courante
  /** La ligne de la règle passe au ras de la main courante : c'est elle qu'on vérifie. */
  const regleY = hautGardeCorpsY;
  const G = r(LARGEUR / 2 - largeur / 2); // tableau gauche
  const D = r(LARGEUR / 2 + largeur / 2); // tableau droit
  /** Autant de croix que de panneaux d'environ 60 cm : la largeur se lit au premier coup d'œil. */
  const panneaux = Math.max(1, Math.round(L / 600));

  /** L'appui, la main courante et les barres à l'échelle aussi : 50, 40 et 20 mm. */
  const EP_APPUI = Math.max(2, r(50 * echelle));
  const mainCouranteH = Math.max(1.5, Math.min(r(40 * echelle), hauteur / 2));
  const barre = Math.max(1, r(20 * echelle));
  const rosace = Math.max(1.5, r(((rosaceMm ?? 100) / 2) * echelle));
  const cadreHaut = r(hautGardeCorpsY + mainCouranteH);
  const cadreBas = r(basGardeCorpsY - Math.min(2, hauteur / 4));
  const milieu = r((G + D) / 2);

  // Les pastilles ② et ③ se suivent sur la même verticale : quand une des
  // deux cotes est courte, on les écarte pour qu'elles ne se recouvrent pas.
  let pastilleAllegeY = r((SOL_Y + appuiY) / 2);
  let pastilleFenetreY = r((appuiY + HAUT_OUVERTURE_Y) / 2);
  if (pastilleAllegeY - pastilleFenetreY < 27) {
    const milieuGauche = (pastilleAllegeY + pastilleFenetreY) / 2;
    pastilleAllegeY = r(milieuGauche + 13.5);
    pastilleFenetreY = r(milieuGauche - 13.5);
  }

  const legende = locale === "en" ? "Dimensioned sketch, seen from the room: " : "Croquis coté, vu depuis la pièce : ";
  const attache = { stroke: "#4a3f35", strokeWidth: 0.9, strokeDasharray: "3 3", opacity: 0.8 };
  /** La largeur du cartouche derrière l'intitulé de la règle. */
  const cartouche = labels.metre.length * 4.9 + 10;

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${legende}${labels.largeur}, ${labels.allege}, ${labels.fenetre}, ${labels.hauteur}. ${labels.interieur}`}
      className={className}
    >
      <defs>
        <linearGradient id="lumiere-mur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="1" stopColor="#5a4a35" stopOpacity={0.1} />
        </linearGradient>
        <linearGradient id="ombre-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a18" stopOpacity={0.22} />
          <stop offset="0.35" stopColor="#3a2a18" stopOpacity={0.04} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.08} />
        </linearGradient>
        <linearGradient id="jour" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d9e3" />
          <stop offset="1" stopColor="#e9f0f4" />
        </linearGradient>
      </defs>

      {/* Le mur, du plafond au pied du mur. */}
      <MurDePierre bas={SOL_Y} echelle={echelle} />
      {/* Le parquet, devant nous. */}
      <Parquet haut={SOL_Y} bas={HAUTEUR} echelle={echelle} />

      {/* Le tableau : l'épaisseur du mur, de chaque côté de l'ouverture. C'est
          là que le garde-corps s'encastre. */}
      <rect x={G - TABLEAU} y={HAUT_OUVERTURE_Y - TABLEAU} width={D - G + TABLEAU * 2} height={appuiY - HAUT_OUVERTURE_Y + TABLEAU} fill="#cfc3ae" />
      <rect x={G - TABLEAU} y={HAUT_OUVERTURE_Y - TABLEAU} width={D - G + TABLEAU * 2} height={appuiY - HAUT_OUVERTURE_Y + TABLEAU} fill="none" stroke="#b7aa94" strokeWidth={0.8} />

      {/* L'ouverture : le jour, la vitre et ses montants. */}
      <rect x={G} y={HAUT_OUVERTURE_Y} width={D - G} height={appuiY - HAUT_OUVERTURE_Y} fill="url(#jour)" />
      <rect x={G} y={HAUT_OUVERTURE_Y} width={D - G} height={appuiY - HAUT_OUVERTURE_Y} fill={VITRE} opacity={0.35} />
      <g stroke="#ffffff" strokeWidth={4}>
        <rect x={G + 3} y={HAUT_OUVERTURE_Y + 3} width={D - G - 6} height={appuiY - HAUT_OUVERTURE_Y - 6} fill="none" />
        <line x1={milieu} y1={HAUT_OUVERTURE_Y} x2={milieu} y2={appuiY} />
      </g>
      <g stroke="#b9c4cc" strokeWidth={0.8} fill="none">
        <rect x={G + 5} y={HAUT_OUVERTURE_Y + 5} width={D - G - 10} height={appuiY - HAUT_OUVERTURE_Y - 10} />
        <line x1={milieu - 2} y1={HAUT_OUVERTURE_Y} x2={milieu - 2} y2={appuiY} />
        <line x1={milieu + 2} y1={HAUT_OUVERTURE_Y} x2={milieu + 2} y2={appuiY} />
      </g>

      {/* Le garde-corps, derrière la vitre, posé sur l'appui : un cadre, une
          croix par panneau, une rosace à chaque croisement. */}
      <g>
        {remplissage === "verre" && (
          /* Le verre feuilleté : un panneau clair, un reflet, aucun vide. */
          <g>
            <rect x={G + 2} y={cadreHaut} width={D - G - 4} height={cadreBas - cadreHaut} fill="#bfd3dd" opacity={0.75} />
            <line x1={G + 8} y1={cadreBas - 2} x2={r(G + 8 + (cadreBas - cadreHaut) * 0.9)} y2={cadreHaut + 2} stroke="#ffffff" strokeWidth={2} opacity={0.7} />
          </g>
        )}
        <rect x={G + 2} y={cadreHaut} width={D - G - 4} height={cadreBas - cadreHaut} fill="none" stroke={ACIER} strokeWidth={r(barre * 1.4)} />
        {remplissage === "croix" && Array.from({ length: panneaux }, (_, i) => {
          const x0 = r(G + 2 + ((D - G - 4) * i) / panneaux);
          const x1 = r(G + 2 + ((D - G - 4) * (i + 1)) / panneaux);
          return (
            <g key={i}>
              {i > 0 && <line x1={x0} y1={cadreHaut} x2={x0} y2={cadreBas} stroke={ACIER} strokeWidth={barre} />}
              <g stroke={ACIER} strokeWidth={barre}>
                <line x1={x0 + 2} y1={cadreHaut + 1} x2={x1 - 2} y2={cadreBas - 1} />
                <line x1={x0 + 2} y1={cadreBas - 1} x2={x1 - 2} y2={cadreHaut + 1} />
              </g>
              <Rosace
                cx={r((x0 + x1) / 2)}
                cy={r((cadreHaut + cadreBas) / 2)}
                taille={Math.min(rosace, (x1 - x0) / 2.2, (cadreBas - cadreHaut) / 2.2)}
              />
            </g>
          );
        })}
        <rect x={G - 2} y={hautGardeCorpsY} width={D - G + 4} height={mainCouranteH} rx={2.5} fill={BOIS} stroke="#b08a52" strokeWidth={0.8} />
      </g>

      {/* L'appui de fenêtre, devant la vitre, qui déborde un peu du mur. */}
      <rect x={G - 10} y={appuiY} width={D - G + 20} height={EP_APPUI} fill="#e4dccd" stroke="#b7aa94" strokeWidth={0.7} />
      <rect x={G - 10} y={appuiY + EP_APPUI} width={D - G + 20} height={Math.max(1, EP_APPUI / 3)} fill="#5a4a35" opacity={0.18} />

      {/* La ligne de la règle : c'est elle qu'on regarde. Elle affleure le
          dessus de la main courante. */}
      <line x1={0} y1={regleY} x2={LARGEUR} y2={regleY} stroke={ACCENT} strokeWidth={1.1} strokeDasharray="4 3" opacity={0.9} />
      {/* Le cartouche, centré sur la fenêtre, juste au-dessus de la ligne —
          ou juste en dessous quand la cote ① est trop près. Il reste entre
          les pastilles de gauche et de droite, que le cadre ne rogne jamais. */}
      {(() => {
        const dessous = regleY - 16 < HAUT_OUVERTURE_Y - 6;
        const y = dessous ? regleY + 4 : regleY - 16;
        const x = Math.max(38, Math.min(292 - cartouche, r(milieu - cartouche / 2)));
        return (
          <g>
            <rect x={x} y={y} width={cartouche} height={13} rx={3} fill="#ffffff" opacity={0.94} />
            <text x={x + 5} y={y + 10} fontSize={9.5} fill={ACCENT} fontWeight={700}>
              {labels.metre}
            </text>
          </g>
        );
      })()}

      {/* ① La largeur, entre les deux murs, au-dessus de la fenêtre. */}
      <g {...attache}>
        <line x1={G} y1={HAUT_OUVERTURE_Y - TABLEAU} x2={G} y2={HAUT_OUVERTURE_Y - 30} />
        <line x1={D} y1={HAUT_OUVERTURE_Y - TABLEAU} x2={D} y2={HAUT_OUVERTURE_Y - 30} />
      </g>
      <Fleche de={[G, HAUT_OUVERTURE_Y - 20]} a={[D, HAUT_OUVERTURE_Y - 20]} actif={actif === "largeur"} />
      <Pastille cote="largeur" cx={milieu} cy={HAUT_OUVERTURE_Y - 20} actif={actif === "largeur"} onChoisir={onChoisir} label={labels.largeur} />

      {/* ② Du sol au bas de la fenêtre, à gauche. */}
      <g {...attache}>
        <line x1={G - 10} y1={appuiY} x2={44} y2={appuiY} />
      </g>
      <Fleche de={[50, SOL_Y]} a={[50, appuiY]} actif={actif === "allege"} />
      <Pastille cote="allege" cx={24} cy={pastilleAllegeY} actif={actif === "allege"} onChoisir={onChoisir} label={labels.allege} />

      {/* ③ La hauteur de la fenêtre, de l'appui au haut du tableau, dans le prolongement de ②. */}
      <g {...attache}>
        <line x1={G - TABLEAU} y1={HAUT_OUVERTURE_Y - TABLEAU} x2={44} y2={HAUT_OUVERTURE_Y - TABLEAU} />
      </g>
      <Fleche de={[50, appuiY - 2]} a={[50, HAUT_OUVERTURE_Y - TABLEAU]} actif={actif === "fenetre"} />
      <Pastille cote="fenetre" cx={24} cy={pastilleFenetreY} actif={actif === "fenetre"} onChoisir={onChoisir} label={labels.fenetre} />

      {/* ④ La hauteur du garde-corps, calculée : du bas du cadre au dessus de la main courante, à droite. */}
      <g {...attache}>
        <line x1={D + 2} y1={basGardeCorpsY} x2={286} y2={basGardeCorpsY} />
        <line x1={D + 2} y1={hautGardeCorpsY} x2={286} y2={hautGardeCorpsY} />
      </g>
      <Fleche de={[280, basGardeCorpsY]} a={[280, hautGardeCorpsY]} actif={actif === "hauteur"} />
      <Pastille cote="hauteur" cx={306} cy={r((basGardeCorpsY + hautGardeCorpsY) / 2)} actif={actif === "hauteur"} onChoisir={onChoisir} label={labels.hauteur} />

      {/* Le jour de 100 mm entre l'appui et le bas du cadre : coté sous ④,
          sans numéro — ce n'est pas une mesure à prendre, c'est la pose. */}
      {jour > 0 && (
        <g>
          <Fleche de={[280, appuiY]} a={[280, basGardeCorpsY]} actif={false} />
          <rect x={284} y={r(appuiY + 2)} width={38} height={11} rx={2.5} fill="#ffffff" opacity={0.94} />
          <text x={286} y={r(appuiY + 10.5)} fontSize={8} fontWeight={700} fill={ENCRE}>
            {`${J} mm`}
          </text>
        </g>
      )}
    </svg>
  );
}
