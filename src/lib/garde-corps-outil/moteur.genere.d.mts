// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : types du moteur (moteur.genere.mjs).
export type ValeursGC = {
  B: number; A: number; Hs: number; Hf: number; Xo: number; jour: number; j: number; s: number; nP: number; nb: number;
  sbMode: string; ass: string; rosace: boolean; etage: boolean; mc: number; epMc: number; mcType: string; essence: string;
  rainure: boolean; rnP: number; rnJ: number; dF: number; fF: number; eF: number; nF: number; trait: number;
  debitAr: number; minSoud: number; remise: string; km: number; prixVente: number; traverse: boolean; renfort: string; seuls?: boolean; patte?: number; rD: number; jourAuto?: boolean; jourSaisi?: number; _rapide?: boolean;
  /** Le décor à volutes : "aucun" ou un assemblage (DECOR_NOMS), puis la forme et les finitions, en chaînes comme les champs de l'outil. */
  decor?: string; decorForme?: string; decorBouts?: string; decorLiaison?: string; decorBarreaux?: string; decorFriseBasse?: string; decorDore?: string;
  [autre: string]: unknown;
};
export type LigneDebitGC = { nom: string; qte: number; mat: string; long: number; coupes: string; note: string; dessin?: unknown };
export type ResultatGC = {
  vues: { face: unknown[]; cote: unknown[]; dessus: unknown[] };
  debit: LigneDebitGC[];
  alertes: string[];
  oks: string[];
  notes: string[];
  resume: [string, string][];
  kg?: number;
  metres?: number;
  hauteurGC?: number;
  /** La main courante retenue : largeur, hauteur, profondeur de rainure ; et le plat de renfort s'il y en a un. */
  mc?: { l: number; h: number; chev: number; renfort: { l: number; e: number; vis: number } | null };
  /** Avec un décor à volutes : son nom (« Frise de volutes en S ») et ses finitions, tels que le devis les écrit. */
  decorNom?: string;
  decorFinitions?: string;
  [autre: string]: unknown;
};
export type GeomGC = { Lc: number; cible: number; manque: number; appui: "barre" | "rien" | null; hNorme: number; Hr: number; Hc: number; h: number; w: number; sb: number; ok: boolean; dMax: number; limite: number; [autre: string]: unknown };
export type VarianteGC = { w: ValeursGC; R: ResultatGC; change: number; score: number };
export declare const DEFAUTS_GC: Readonly<ValeursGC>;
export declare const BORNES_GC: Readonly<Record<"B" | "A" | "Hf", Readonly<{ min: number; max: number }>>>;
export declare function calculerGC(v: ValeursGC): ResultatGC;
export declare function geomGC(v: ValeursGC, n: number): GeomGC;
export declare function variantesConformes(v: ValeursGC): VarianteGC[];
export declare function decrireVariante(v: ValeursGC, c: { w: ValeursGC }): string[];
export declare function fmt(x: number, d?: number): string;
export declare function mmTxt(x: number): string;
export declare function coupeMainCourante(v: ValeursGC): unknown[];
export declare function svgDe(prims: readonly unknown[], petit?: boolean | string): { vb: number[]; fs: number; html: string };
export declare function planA3Pur(R: ResultatGC, v: ValeursGC, infos: { apercu?: boolean; date?: string; client?: string; chantier?: string; numero?: string }, modele: string): string;
export declare const ALLEGE_LIBRE: number;
export declare const BARRE_APPUI: number;
export declare const CIBLE_MARGE: number;
export declare const HAUT_ETAGE: number;
export declare const LIMITE_ACIER: number;
export declare const MINI_GC: number;
export declare const MARGE_BOULE: number;
/** La fixation par platines au bout des lisses (10/10/2026) : recul du cadre depuis le tableau, platine (l × e × h), bord, entraxe des trous… en mm. */
export declare const FIX_GC: Readonly<{ recul: number; l: number; e: number; h: number; bord: number; entraxe: number; rondelle: number; appui: number; ecart: number }>;
export declare const MINI_SEULS: number;
export declare const RENFORT: Readonly<{ l: number; e: number; bois: Readonly<{ l: number; h: number }>; LcMax: number; pasVis: number; visD: number; visL: number }>;
export declare const ROSACE_R: number;
export declare const SPHERE: number;
export declare const SPHERE_HAUT: number;
export declare const Z_ESCALADE: number;
export declare const Z_SPHERE: number;
export declare const DECOR_NOMS: Readonly<Record<string, string>>;
export declare const MT_AVEC: Readonly<Record<string, readonly string[]>>;
export declare const MT_NOMS: Readonly<Record<string, string>>;
export declare const MT_CHOIX: Readonly<Record<string, readonly string[]>>;
export declare function decorActif(v: Partial<ValeursGC> | null | undefined): boolean;
export declare function mtAlleger(t: readonly (readonly [number, number])[], tol?: number): [number, number][];
export declare const EMPREINTE: string;
export declare const EMPREINTE_SOURCE: string;
