// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : types du moteur des portails (moteur.genere.mjs).
export type Primitive = { t: string; [k: string]: unknown };
export type ResultatPortail = {
  vues: { face: Primitive[]; cote: Primitive[]; dessus: Primitive[] };
  debit: { nom: string; qte: number; mat: string; long: number; coupes: string; note: string; groupe: string }[];
  alertes: string[]; avertissements: string[]; oks: string[]; notes: string[];
  resume: [string, string][];
  poids: number; kg: number; grandeCote: number;
  dims: { P: number; H: number; type: string; vantaux: number[]; gs: number; hautMax: number };
  quant: Record<string, unknown>;
  config: Record<string, unknown> & { type: string; mat: string; remp: string; decor: string };
  decor: { formule: string; nom: string; refus: { quoi: string; raison: string }[]; cimierH: number } | null;
  moteurs?: { permis: { cle: string; nom: string; facilite: number; garantie: number }[]; refus: { cle: string | null; nom: string; raison: string }[]; conseille: { cle: string } | null; choisi: { cle: string } | null; barrePalpeuse: boolean; notes: string[] };
  pose?: { ouvrages: { rep: number; nom: string; qte: number; cotes: string; quiFait: string; delai: string }[]; reservations: { nom: string; quiFait: string; detail: string }[]; electricite: string[]; essais: string[]; prerequis: string[]; controle: string[]; notes: string[] };
};
export declare function calculerPortail(v: Record<string, unknown>, modele: string): ResultatPortail;
export declare function ptEntrees(v: Record<string, unknown>, modele: string): Record<string, unknown>;
export declare const PT_STYLES: Readonly<Record<string, Record<string, unknown> & { nom: string }>>;
export declare const PT_MODELES: Readonly<Record<string, { type: string; nom: string }>>;
export declare function svgDe(prims: readonly unknown[], petit?: boolean | string): { vb: number[]; fs: number; html: string };
export declare const PT_ATELIER: Readonly<Record<string, unknown> & { bornes: { P: Record<string, [number, number]>; PAutoportant: [number, number]; H: [number, number]; fleche: [number, number] } }>;
export declare const PT_MATIERES: Readonly<Record<string, unknown>>;
export declare const PT_DECOR_FORMULES: Readonly<Record<string, { nom: string; ligne: string; choix: Record<string, string>[] }>>;
export declare const MT_AVEC: Readonly<Record<string, string[]>>;
export declare const PT_MOTEURS: Readonly<{ cle: string; nom: string; ref: string; pour: string[]; principe: string; contenu: string; garantie: number }[]>;
export declare const MT_NOMS: Readonly<Record<string, string>>;
export declare const EMPREINTE: string;
