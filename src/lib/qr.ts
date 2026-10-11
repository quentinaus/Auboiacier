/**
 * Un générateur de QR code, écrit ici plutôt que téléchargé.
 *
 * Il sert à une seule chose : la carte glissée dans les colis, qui renvoie à
 * https://auboiacier.fr/avis. Aucune bibliothèque de QR n'était installée, et
 * en ajouter une pour une adresse fixe de 25 signes aurait fait entrer du code
 * inconnu dans le site. Celui-ci suit la norme ISO/IEC 18004 au plus court :
 * mode « octets » (UTF-8), versions 1 à 10 (jusqu'à 271 octets en correction
 * L, bien assez pour une adresse), quatre niveaux de correction, choix du
 * masque par les quatre règles de pénalité de la norme.
 *
 * Il est vérifié deux fois : tests/qr.test.ts le relit avec un décodeur
 * indépendant de ce fichier, et la carte imprimée a été lue par le décodeur
 * de macOS (CoreImage) avant d'être rangée dans public/imprimer/.
 *
 * Ce fichier est PUR : ni réseau, ni « server-only », ni dépendance. Le
 * script de la carte (scripts/carte-avis.mjs) et les tests le chargent tel
 * quel.
 */

export type NiveauCorrection = "L" | "M" | "Q" | "H";

export type CodeQR = {
  version: number;
  /** Côté, en modules (21 pour la version 1, 4 de plus par version). */
  taille: number;
  niveau: NiveauCorrection;
  masque: number;
  /** modules[ligne][colonne] : true = module foncé. Sans la marge blanche. */
  modules: boolean[][];
};

/** La marge blanche exigée par la norme autour du code, en modules. */
export const MARGE_QR = 4;

/** Les bits du niveau de correction dans l'information de format. */
const BITS_NIVEAU: Record<NiveauCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

/**
 * Les blocs de correction, versions 1 à 10 (ISO/IEC 18004, tableau 9) :
 * [codes de correction par bloc, blocs du groupe 1, données par bloc du
 * groupe 1, blocs du groupe 2, données par bloc du groupe 2].
 */
const BLOCS: Record<NiveauCorrection, [number, number, number, number, number][]> = {
  L: [
    [7, 1, 19, 0, 0],
    [10, 1, 34, 0, 0],
    [15, 1, 55, 0, 0],
    [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0],
    [20, 2, 78, 0, 0],
    [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0],
    [18, 2, 68, 2, 69],
  ],
  M: [
    [10, 1, 16, 0, 0],
    [16, 1, 28, 0, 0],
    [26, 1, 44, 0, 0],
    [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0],
    [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],
    [26, 4, 43, 1, 44],
  ],
  Q: [
    [13, 1, 13, 0, 0],
    [22, 1, 22, 0, 0],
    [18, 2, 17, 0, 0],
    [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0],
    [18, 2, 14, 4, 15],
    [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17],
    [24, 6, 19, 2, 20],
  ],
  H: [
    [17, 1, 9, 0, 0],
    [28, 1, 16, 0, 0],
    [22, 2, 13, 0, 0],
    [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0],
    [26, 4, 13, 1, 14],
    [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13],
    [28, 6, 15, 2, 16],
  ],
};

export const VERSION_MAX = 10;

/** Le centre des motifs d'alignement, versions 1 à 10. */
const ALIGNEMENTS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** La structure des blocs d'une version et d'un niveau (exportée pour les tests). */
export function blocsQR(version: number, niveau: NiveauCorrection) {
  const [correction, n1, d1, n2, d2] = BLOCS[niveau][version - 1];
  const donnees = n1 * d1 + n2 * d2;
  return { correction, groupes: [{ blocs: n1, donnees: d1 }, { blocs: n2, donnees: d2 }], donnees, total: donnees + (n1 + n2) * correction };
}

/* ------------------------------------------------------------------ *
 *  Reed-Solomon sur GF(256), polynôme 0x11D
 * ------------------------------------------------------------------ */

function multiplier(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function diviseur(degre: number): number[] {
  const resultat = new Array<number>(degre).fill(0);
  resultat[degre - 1] = 1;
  let racine = 1;
  for (let i = 0; i < degre; i++) {
    for (let j = 0; j < resultat.length; j++) {
      resultat[j] = multiplier(resultat[j], racine);
      if (j + 1 < resultat.length) resultat[j] ^= resultat[j + 1];
    }
    racine = multiplier(racine, 0x02);
  }
  return resultat;
}

/** Les codes de correction d'un bloc de données (exportée pour les tests). */
export function correctionRS(donnees: number[], degre: number): number[] {
  const div = diviseur(degre);
  const reste = new Array<number>(degre).fill(0);
  for (const octet of donnees) {
    const facteur = octet ^ (reste.shift() as number);
    reste.push(0);
    div.forEach((coef, i) => {
      reste[i] ^= multiplier(coef, facteur);
    });
  }
  return reste;
}

/* ------------------------------------------------------------------ *
 *  Les données : mode octets, longueur, fin, bourrage
 * ------------------------------------------------------------------ */

function bitsLongueur(version: number) {
  return version <= 9 ? 8 : 16;
}

function donneesCodees(octets: Uint8Array, version: number, capacite: number): number[] {
  const bits: number[] = [];
  const ajouter = (valeur: number, longueur: number) => {
    for (let i = longueur - 1; i >= 0; i--) bits.push((valeur >>> i) & 1);
  };
  ajouter(0b0100, 4);
  ajouter(octets.length, bitsLongueur(version));
  for (const octet of octets) ajouter(octet, 8);
  const max = capacite * 8;
  ajouter(0, Math.min(4, max - bits.length));
  ajouter(0, (8 - (bits.length % 8)) % 8);
  const mots: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    mots.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  for (let bourrage = 0xec; mots.length < capacite; bourrage ^= 0xec ^ 0x11) mots.push(bourrage);
  return mots;
}

/** Données et correction entrelacées, bloc par bloc, comme la norme les range. */
function motsEntrelaces(donnees: number[], version: number, niveau: NiveauCorrection): number[] {
  const { correction, groupes } = blocsQR(version, niveau);
  const blocs: { donnees: number[]; correction: number[] }[] = [];
  let k = 0;
  for (const groupe of groupes) {
    for (let b = 0; b < groupe.blocs; b++) {
      const morceau = donnees.slice(k, k + groupe.donnees);
      k += groupe.donnees;
      blocs.push({ donnees: morceau, correction: correctionRS(morceau, correction) });
    }
  }
  const resultat: number[] = [];
  const plusLong = Math.max(...blocs.map((b) => b.donnees.length));
  for (let i = 0; i < plusLong; i++) for (const b of blocs) if (i < b.donnees.length) resultat.push(b.donnees[i]);
  for (let i = 0; i < correction; i++) for (const b of blocs) resultat.push(b.correction[i]);
  return resultat;
}

/* ------------------------------------------------------------------ *
 *  La grille : motifs fixes, données, masque, format
 * ------------------------------------------------------------------ */

type Grille = { taille: number; modules: boolean[][]; fixes: boolean[][] };

function nouvelleGrille(taille: number): Grille {
  const vide = () => Array.from({ length: taille }, () => new Array<boolean>(taille).fill(false));
  return { taille, modules: vide(), fixes: vide() };
}

function poser(g: Grille, x: number, y: number, fonce: boolean) {
  g.modules[y][x] = fonce;
  g.fixes[y][x] = true;
}

function motifsFixes(g: Grille, version: number) {
  const { taille } = g;
  // Lignes de synchronisation.
  for (let i = 0; i < taille; i++) {
    poser(g, 6, i, i % 2 === 0);
    poser(g, i, 6, i % 2 === 0);
  }
  // Les trois carrés de repérage, avec leur liseré clair.
  for (const [cx, cy] of [
    [3, 3],
    [taille - 4, 3],
    [3, taille - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= taille || y >= taille) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        poser(g, x, y, d !== 2 && d !== 4);
      }
    }
  }
  // Les motifs d'alignement, sauf sous les carrés de repérage.
  const centres = ALIGNEMENTS[version - 1];
  const n = centres.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          poser(g, centres[i] + dx, centres[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  // Places réservées : format (rempli après le choix du masque) et version.
  bitsFormat(g, "L", 0);
  if (version >= 7) bitsVersion(g, version);
}

/** L'information de format : niveau et masque, protégés par un code BCH, posée deux fois. */
export function motFormat(niveau: NiveauCorrection, masque: number): number {
  const donnee = (BITS_NIVEAU[niveau] << 3) | masque;
  let reste = donnee;
  for (let i = 0; i < 10; i++) reste = (reste << 1) ^ ((reste >>> 9) * 0x537);
  return ((donnee << 10) | reste) ^ 0x5412;
}

function bitsFormat(g: Grille, niveau: NiveauCorrection, masque: number) {
  const bits = motFormat(niveau, masque);
  const bit = (i: number) => ((bits >>> i) & 1) !== 0;
  const { taille } = g;
  for (let i = 0; i <= 5; i++) poser(g, 8, i, bit(i));
  poser(g, 8, 7, bit(6));
  poser(g, 8, 8, bit(7));
  poser(g, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) poser(g, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) poser(g, taille - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) poser(g, 8, taille - 15 + i, bit(i));
  // Le module toujours foncé, à côté du carré du bas.
  poser(g, 8, taille - 8, true);
}

function bitsVersion(g: Grille, version: number) {
  let reste = version;
  for (let i = 0; i < 12; i++) reste = (reste << 1) ^ ((reste >>> 11) * 0x1f25);
  const bits = (version << 12) | reste;
  for (let i = 0; i < 18; i++) {
    const fonce = ((bits >>> i) & 1) !== 0;
    const a = g.taille - 11 + (i % 3);
    const b = Math.floor(i / 3);
    poser(g, a, b, fonce);
    poser(g, b, a, fonce);
  }
}

/** Les mots posés en zigzag, deux colonnes à la fois, de droite à gauche. */
function poserDonnees(g: Grille, mots: number[]) {
  const { taille } = g;
  let i = 0;
  for (let droite = taille - 1; droite >= 1; droite -= 2) {
    if (droite === 6) droite = 5;
    const montant = ((droite + 1) & 2) === 0;
    for (let v = 0; v < taille; v++) {
      for (let j = 0; j < 2; j++) {
        const x = droite - j;
        const y = montant ? taille - 1 - v : v;
        if (g.fixes[y][x]) continue;
        // Au-delà des mots, les quelques bits de reste sont clairs.
        g.modules[y][x] = i < mots.length * 8 && ((mots[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
        i++;
      }
    }
  }
}

const MASQUES: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function appliquerMasque(g: Grille, masque: number) {
  const test = MASQUES[masque];
  for (let y = 0; y < g.taille; y++) {
    for (let x = 0; x < g.taille; x++) {
      if (!g.fixes[y][x] && test(x, y)) g.modules[y][x] = !g.modules[y][x];
    }
  }
}

/** Les quatre règles de pénalité de la norme : le masque le moins pénalisé l'emporte. */
export function penaliteQR(modules: boolean[][]): number {
  const n = modules.length;
  const lire = (ligne: boolean, a: number, b: number) => (ligne ? modules[a][b] : modules[b][a]);
  let total = 0;
  // Règle 1 : cinq modules ou plus de la même couleur à la suite.
  for (const ligne of [true, false]) {
    for (let a = 0; a < n; a++) {
      let suite = 1;
      for (let b = 1; b <= n; b++) {
        if (b < n && lire(ligne, a, b) === lire(ligne, a, b - 1)) suite++;
        else {
          if (suite >= 5) total += 3 + (suite - 5);
          suite = 1;
        }
      }
    }
  }
  // Règle 2 : carrés de 2 × 2 de la même couleur.
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) total += 3;
    }
  }
  // Règle 3 : ce qui ressemble à un carré de repérage (1:1:3:1:1 bordé de 4 clairs).
  const motifs = [
    [true, false, true, true, true, false, true, false, false, false, false],
    [false, false, false, false, true, false, true, true, true, false, true],
  ];
  for (const ligne of [true, false]) {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b + 11 <= n; b++) {
        for (const motif of motifs) {
          if (motif.every((fonce, k) => lire(ligne, a, b + k) === fonce)) total += 40;
        }
      }
    }
  }
  // Règle 4 : l'écart à la moitié de modules foncés.
  let fonces = 0;
  for (const rang of modules) for (const m of rang) if (m) fonces++;
  const k = Math.ceil(Math.abs(fonces * 20 - n * n * 10) / (n * n)) - 1;
  total += Math.max(0, k) * 10;
  return total;
}

/**
 * Le QR code d'un texte. La plus petite version qui le contient, au niveau
 * de correction demandé (M par défaut : 15 % du code peut être abîmé ou sali
 * sans que la lecture échoue). `masque` force un masque : réservé aux tests.
 */
export function codeQR(texte: string, options: { niveau?: NiveauCorrection; masque?: number } = {}): CodeQR {
  const niveau = options.niveau ?? "M";
  const octets = new TextEncoder().encode(texte);
  let version = 0;
  for (let v = 1; v <= VERSION_MAX; v++) {
    const bits = 4 + bitsLongueur(v) + octets.length * 8;
    if (bits <= blocsQR(v, niveau).donnees * 8) {
      version = v;
      break;
    }
  }
  if (!version) throw new Error(`Texte trop long pour un QR code de version ${VERSION_MAX} (${octets.length} octets).`);

  const taille = 17 + 4 * version;
  const mots = motsEntrelaces(donneesCodees(octets, version, blocsQR(version, niveau).donnees), version, niveau);

  const fabriquer = (masque: number) => {
    const g = nouvelleGrille(taille);
    motifsFixes(g, version);
    poserDonnees(g, mots);
    appliquerMasque(g, masque);
    bitsFormat(g, niveau, masque);
    return g;
  };

  let masque = options.masque ?? -1;
  if (masque < 0) {
    let meilleure = Infinity;
    for (let m = 0; m < 8; m++) {
      const penalite = penaliteQR(fabriquer(m).modules);
      if (penalite < meilleure) {
        meilleure = penalite;
        masque = m;
      }
    }
  }
  return { version, taille, niveau, masque, modules: fabriquer(masque).modules };
}

/**
 * Le tracé SVG des modules foncés, un rectangle par suite horizontale, dans
 * un repère où un module mesure 1. La marge blanche n'est pas comprise :
 * c'est à la mise en page de la laisser (MARGE_QR modules au moins).
 */
export function traceQR(code: CodeQR): string {
  const morceaux: string[] = [];
  code.modules.forEach((rang, y) => {
    let x = 0;
    while (x < rang.length) {
      if (!rang[x]) {
        x++;
        continue;
      }
      const debut = x;
      while (x < rang.length && rang[x]) x++;
      morceaux.push(`M${debut} ${y}h${x - debut}v1h${debut - x}z`);
    }
  });
  return morceaux.join("");
}
