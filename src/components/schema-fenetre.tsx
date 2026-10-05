"use client";

/**
 * Le croquis du garde-corps dans sa fenêtre, vu de l'intérieur de la pièce.
 *
 * On est debout dans la pièce : le parquet devant soi, le mur de pierre, la
 * fenêtre avec son appui, et le garde-corps derrière la vitre. Deux cotes à
 * prendre — ① la largeur de la fenêtre entre les murs, ② la hauteur du sol au
 * bas de la fenêtre — et une cote ③ que l'atelier calcule : la hauteur du
 * garde-corps, pour que sa main courante monte à la hauteur de la norme
 * (un mètre au-dessus du sol, ou de l'appui quand on pourrait y monter).
 * Le garde-corps ne touche pas l'appui : il se pose un peu au-dessus (le
 * jour de l'outil de plans, 90 mm), et ce jour est coté sur le dessin.
 * Les croix et les barreaux du bas sont ceux que l'outil retient, dès que
 * le serveur a répondu.
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

import { BARRE_APPUI_MM, JOUR_GC_MM, MAIN_COURANTE_MM, formeGC, type TrousGC } from "@/lib/garde-corps";

const ACCENT = "#2b2320";
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
const HAUTEUR = 440;
/**
 * LE HAUT DE LA MAIN COURANTE NE BOUGE JAMAIS (demande de Quentin, 04/10/2026) : il est dessiné à cette
 * hauteur du cadre, toujours. Quand le client change le bas de sa fenêtre, c'est la fenêtre qui monte ou
 * descend et le garde-corps qui grandit ou rapetisse ; le sol, lui, est placé sous la main courante, à la
 * distance que donne la norme.
 */
const MAIN_COURANTE_Y = 268;
/** Où la norme veut le haut de la main courante, depuis le sol : 1 000 mm, visés à 1 025 (l'outil de plans). */
const NORME_MM = MAIN_COURANTE_MM;
/** La place pour la fenêtre entre les pastilles de gauche et de droite, et pour les hauteurs du sol au haut de la fenêtre. */
const PLACE_LARGEUR = 232;
const PLACE_HAUTEUR = 330;
/** Le milieu de la fenêtre : décalé à droite, la gauche porte les cotes ② et ③ (il n'y a plus rien à droite). */
const CENTRE = 186;
/** La hauteur de la pièce dessinée, du sol au haut du cadre : tant que la fenêtre y tient, l'échelle ne bouge pas —
 *  la ligne de la norme reste donc au même endroit, et c'est la fenêtre qui monte ou descend. */
const PIECE_MM = 2500;
/** Profondeur apparente du tableau, de chaque côté de l'ouverture. */
const TABLEAU = 6;
/** Les cotes du modèle en photo, dessinées tant que le client n'a rien tapé. */
const MODELE = { largeurMm: 1180, hauteurMm: 350, fenetreMm: 1200 };
/** Le bas de la fenêtre dessiné tant que le client n'a rien tapé : celui qui donne le garde-corps de la photo. */
const ALLEGE_MODELE_MM = MAIN_COURANTE_MM - JOUR_GC_MM - MODELE.hauteurMm;

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
  croix,
  soubassementMm = 0,
  traverse = false,
  renfort = false,
  trous = null,
  rosaceMm,
  apercu = false,
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
  /** Les cotes dessinées à l'échelle. Sans valeur, le croquis prend celles du modèle. */
  largeurMm?: number;
  allegeMm?: number;
  /** De l'appui au haut de l'ouverture. */
  hauteurFenetreMm?: number;
  /** Le nombre de croix retenu par l'outil ; sans lui, une croix par panneau d'environ 60 cm. */
  croix?: number;
  /** La hauteur des barreaux droits en partie basse (0 : aucun). */
  soubassementMm?: number;
  /** Une traverse au milieu de chaque croix. */
  traverse?: boolean;
  /** Fenêtre large : un fer plat de 10 mm sous une main courante de 45 mm (au lieu de 40 mm). */
  renfort?: boolean;
  /** Le rond rouge (vide trop grand) et les ronds verts de l'outil de plans, posés dans le cadre du modèle montré. */
  trous?: TrousGC | null;
  labels: {
    largeur: string;
    allege: string;
    fenetre: string;
    hauteur: string;
    metre: string;
    interieur: string;
    /** Le jour de 100 mm, sans numéro : il faut dire ce qu'il est, pas juste sa valeur. */
    jour: string;
  };
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
  const A = borne(allegeMm ?? ALLEGE_MODELE_MM, 0, 1500);
  // CE QU'ON DESSINE DANS LA FENÊTRE vient de la règle de l'outil (formeGC), calculée ici même : le croquis
  // suit le curseur EN DIRECT, sans attendre le serveur (avant, il gardait la hauteur de l'ancienne réponse
  // pendant tout le glissement, puis sautait). Un garde-corps tant qu'il en faut au moins 200 mm ; sinon une
  // barre d'appui ; rien quand le bas de la fenêtre est déjà à la hauteur de la norme.
  const forme = formeGC(A);
  const mode = forme.mode;
  const J = forme.jourMm;
  // La hauteur du garde-corps, main courante comprise (une barre d'appui n'a que sa propre épaisseur).
  const H = mode === "garde-corps" ? forme.hauteurMm : BARRE_APPUI_MM;
  /** Où arrive le haut de la main courante, depuis le sol. */
  const MC = mode === "garde-corps" ? A + J + H : NORME_MM;
  const F = borne(hauteurFenetreMm ?? MODELE.fenetreMm, 200, 3000);
  // Une seule échelle pour tout. Tant que la fenêtre tient dans la pièce dessinée, elle ne change pas.
  // Et le haut de la fenêtre, avec sa cote ① au-dessus, reste TOUJOURS dans le cadre (demande de Quentin, 05/10) : le haut de
  // l'ouverture est à (A + F − MC) × échelle au-dessus de la main courante, qui est fixe ; on garde 44 de marge pour la cote.
  const echelleHaut = A + F > MC ? (MAIN_COURANTE_Y - 44) / (A + F - MC) : Infinity;
  const echelle = Math.min(PLACE_LARGEUR / L, PLACE_HAUTEUR / Math.max(PIECE_MM, A + F + 150), echelleHaut);
  const largeur = r(L * echelle);
  const fenetre = Math.max(3, r(F * echelle));
  const hauteur = Math.max(3, r(H * echelle));
  // La main courante est FIXE ; tout le reste se place par rapport à elle.
  const hautGardeCorpsY = MAIN_COURANTE_Y; // dessus de la main courante
  const solY = Math.min(HAUTEUR - 12, r(MAIN_COURANTE_Y + MC * echelle)); // le pied du mur
  const appuiY = r(solY - Math.max(3, A * echelle)); // dessus de l'appui : le bas de la fenêtre
  const HAUT_OUVERTURE_Y = r(appuiY - fenetre); // le haut du tableau
  const basGardeCorpsY = r(Math.min(appuiY - 2, hautGardeCorpsY + hauteur)); // le bas du cadre, au-dessus de l'appui
  const G = r(CENTRE - largeur / 2); // tableau gauche
  const D = r(CENTRE + largeur / 2); // tableau droit
  /** Les croix de l'outil ; en attendant sa réponse, une par panneau d'environ 60 cm. */
  const panneaux = croix && croix > 0 ? croix : Math.max(1, Math.round(L / 600));

  /** L'appui, la main courante et les barres à l'échelle aussi : 50, 40 et 20 mm. */
  const EP_APPUI = Math.max(2, r(50 * echelle));
  const mainCouranteH = mode === "garde-corps" ? Math.max(1.5, Math.min(r((renfort ? 55 : 40) * echelle), hauteur / 2)) : Math.max(2, r(40 * echelle));
  /** Le fer plat de renfort, sous le bois (10 mm sur les 55). */
  const platH = renfort && mode === "garde-corps" ? Math.max(1, r((mainCouranteH * 10) / 55)) : 0;
  const barre = Math.max(1, r(20 * echelle));
  const rosace = Math.max(1.5, r(((rosaceMm ?? 100) / 2) * echelle));
  const cadreHaut = r(hautGardeCorpsY + mainCouranteH);
  const cadreBas = r(basGardeCorpsY - Math.min(2, hauteur / 4));
  /** Les barreaux du bas, quand la norme les demande : les croix commencent au-dessus. */
  const soubassement = soubassementMm > 0 ? Math.min(r(soubassementMm * echelle), (cadreBas - cadreHaut) / 2) : 0;
  const basCroix = r(cadreBas - soubassement);
  const barreaux = soubassement > 0 ? Math.max(2, Math.round(L / 116)) : 0;
  const milieu = r((G + D) / 2);

  // Les pastilles ② et ③ se suivent sur la même verticale : quand une des
  // deux cotes est courte, on les écarte pour qu'elles ne se recouvrent pas.
  let pastilleAllegeY = r((solY + appuiY) / 2);
  let pastilleFenetreY = r((appuiY + HAUT_OUVERTURE_Y) / 2);
  if (pastilleAllegeY - pastilleFenetreY < 27) {
    const milieuGauche = (pastilleAllegeY + pastilleFenetreY) / 2;
    pastilleAllegeY = r(milieuGauche + 13.5);
    pastilleFenetreY = r(milieuGauche - 13.5);
  }

  const legende = locale === "en" ? "Dimensioned sketch, seen from the room: " : "Croquis coté, vu depuis la pièce : ";
  const attache = { stroke: "#4a3f35", strokeWidth: 0.9, strokeDasharray: "3 3", opacity: 0.8 };

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
      <MurDePierre bas={solY} echelle={echelle} />
      {/* Le parquet, devant nous. */}
      <Parquet haut={solY} bas={HAUTEUR} echelle={echelle} />

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
      {mode === "garde-corps" && (
      <g>
        {remplissage === "verre" && (
          /* Le verre feuilleté : un panneau clair, un reflet, aucun vide. */
          <g>
            <rect x={G + 2} y={cadreHaut} width={D - G - 4} height={cadreBas - cadreHaut} fill="#bfd3dd" opacity={0.75} />
            <line x1={G + 8} y1={cadreBas - 2} x2={r(G + 8 + (cadreBas - cadreHaut) * 0.9)} y2={cadreHaut + 2} stroke="#ffffff" strokeWidth={2} opacity={0.7} />
          </g>
        )}
        <rect x={G + 2} y={cadreHaut} width={D - G - 4} height={cadreBas - cadreHaut} fill="none" stroke={ACIER} strokeWidth={r(barre * 1.4)} />
        {soubassement > 0 && (
          /* Les barreaux droits du bas, sous une lisse : rien à quoi grimper sous 600 mm du sol. */
          <g stroke={ACIER} strokeWidth={barre}>
            <line x1={G + 2} y1={basCroix} x2={D - 2} y2={basCroix} strokeWidth={r(barre * 1.2)} />
            {Array.from({ length: barreaux }, (_, i) => {
              const x = r(G + 2 + ((D - G - 4) * (i + 1)) / (barreaux + 1));
              return <line key={i} x1={x} y1={basCroix} x2={x} y2={cadreBas} />;
            })}
          </g>
        )}
        {remplissage === "croix" && Array.from({ length: panneaux }, (_, i) => {
          const x0 = r(G + 2 + ((D - G - 4) * i) / panneaux);
          const x1 = r(G + 2 + ((D - G - 4) * (i + 1)) / panneaux);
          return (
            <g key={i} opacity={apercu ? 0.22 : 1}>
              {i > 0 && <line x1={x0} y1={cadreHaut} x2={x0} y2={basCroix} stroke={ACIER} strokeWidth={barre} />}
              <g stroke={ACIER} strokeWidth={barre}>
                <line x1={x0 + 2} y1={cadreHaut + 1} x2={x1 - 2} y2={basCroix - 1} />
                <line x1={x0 + 2} y1={basCroix - 1} x2={x1 - 2} y2={cadreHaut + 1} />
                {/* La traverse au milieu : d'un montant à l'autre, à mi-hauteur de la croix. */}
                {traverse && <line x1={x0} y1={r((cadreHaut + basCroix) / 2)} x2={x1} y2={r((cadreHaut + basCroix) / 2)} />}
              </g>
              <Rosace
                cx={r((x0 + x1) / 2)}
                cy={r((cadreHaut + basCroix) / 2)}
                taille={Math.min(rosace, (x1 - x0) / 2.2, (basCroix - cadreHaut) / 2.2)}
              />
            </g>
          );
        })}
        {/* Les ronds de l'outil : rouge = le vide est trop grand, vert = le vide respecte la norme. */}
        {trous && remplissage === "croix" && trous.ronds.map((c, i) => {
          const sx = (D - G - 4) / trous.cadreMm.l, sy = (cadreBas - cadreHaut) / trous.cadreMm.h;
          const couleur = c.ok ? "#2f7d46" : "#b3261e";
          return (
            <ellipse key={`rond${i}`} cx={r(G + 2 + c.x * sx)} cy={r(cadreBas - c.y * sy)} rx={r((c.d / 2) * sx)} ry={r((c.d / 2) * sy)} fill={couleur} fillOpacity={0.3} stroke={couleur} strokeWidth={1.6} />
          );
        })}
        <rect x={G - 2} y={hautGardeCorpsY} width={D - G + 4} height={mainCouranteH} rx={2.5} fill={BOIS} stroke="#b08a52" strokeWidth={0.8} />
        {platH > 0 && <rect x={G} y={r(hautGardeCorpsY + mainCouranteH - platH)} width={D - G} height={platH} fill={ACIER} />}
      </g>
      )}
      {/* Une barre d'appui : le bas de la fenêtre est haut, il ne manque qu'une barre à la hauteur de la norme. */}
      {mode === "barre" && (
        <g>
          <line x1={G} y1={r(hautGardeCorpsY + mainCouranteH + barre)} x2={D} y2={r(hautGardeCorpsY + mainCouranteH + barre)} stroke={ACIER} strokeWidth={r(barre * 1.4)} />
          <rect x={G - 2} y={hautGardeCorpsY} width={D - G + 4} height={mainCouranteH} rx={2.5} fill={BOIS} stroke="#b08a52" strokeWidth={0.8} />
        </g>
      )}


      {/* L'appui de fenêtre, devant la vitre, qui déborde un peu du mur. */}
      <rect x={G - 10} y={appuiY} width={D - G + 20} height={EP_APPUI} fill="#e4dccd" stroke="#b7aa94" strokeWidth={0.7} />
      <rect x={G - 10} y={appuiY + EP_APPUI} width={D - G + 20} height={Math.max(1, EP_APPUI / 3)} fill="#5a4a35" opacity={0.18} />

      {/* Plus de ligne en pointillé en travers du dessin (demande du 04/10) : la main courante se lit toute seule. */}
      {/* Pas de cartouche chiffré sur la ligne (demande du 03/10) : la hauteur est dite dans le résultat,
          à côté ; sur le dessin, elle se lisait mal et chargeait le croquis. */}

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
      <Fleche de={[50, solY]} a={[50, appuiY]} actif={actif === "allege"} />
      <Pastille cote="allege" cx={24} cy={pastilleAllegeY} actif={actif === "allege"} onChoisir={onChoisir} label={labels.allege} />

      {/* ③ La hauteur de la fenêtre, de l'appui au haut du tableau, dans le prolongement de ②. */}
      <g {...attache}>
        <line x1={G - TABLEAU} y1={HAUT_OUVERTURE_Y - TABLEAU} x2={44} y2={HAUT_OUVERTURE_Y - TABLEAU} />
      </g>
      <Fleche de={[50, appuiY - 2]} a={[50, HAUT_OUVERTURE_Y - TABLEAU]} actif={actif === "fenetre"} />
      <Pastille cote="fenetre" cx={24} cy={pastilleFenetreY} actif={actif === "fenetre"} onChoisir={onChoisir} label={labels.fenetre} />

      {/* Plus de cote ④ sur le dessin (demande du 04/10) : la hauteur du garde-corps est calculée, pas mesurée —
          elle se lit dans le résultat, à côté. Le dessin ne porte que ce que le client mesure. */}
      {/* Le jour de pose n'est plus coté sur le dessin (demande du 03/10) : ce n'est pas une mesure à prendre. */}
    </svg>
  );
}
