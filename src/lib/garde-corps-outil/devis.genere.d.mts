// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : types du devis (devis.genere.mjs).
import type { ResultatGC, ValeursGC } from "./moteur.genere.mjs";
export type LigneDevisGC = { designation: string; details: string[]; quantite: number; unitaire: number; total: number; titre?: boolean };
export type DevisGC = {
  nature: "devis";
  numero: string;
  date: string;
  validite: string;
  emetteur: { nom: string; lignes: string[] };
  client: { nom?: string; adresse?: string; email?: string; telephone?: string };
  piece: {
    nom: string;
    accroche: string;
    image: { type: "photo"; src: string } | { type: "svg"; svg: string } | null;
    caracteristiques: { label: string; value: string }[];
  };
  lignes: LigneDevisGC[];
  total: number;
  delai: string;
  conditions: string[];
  lienFiche: string | null;
};
export type InfosDevisGC = { client?: string; chantier?: string; email?: string; telephone?: string; date?: Date | string | null };
export declare function composerDevisGC(p: {
  R: ResultatGC;
  v: ValeursGC;
  prix: number;
  rem: { prix: number };
  infos?: InfosDevisGC;
  image?: "auto" | "schema" | "photo";
}): { ok: true; devis: DevisGC } | { ok: false; raison: string };
export declare function dsDevisHtml(devis: DevisGC): string;
export declare function dsPrix(euros: number): string;
export declare const DS_GC: Readonly<{ nom: string; nomSansRosace: string; nomBarreaux: string; delai: string; teinte: string; rosace: string; parts: Readonly<Record<string, number>>; photo: string }>;
export declare const DS_VALIDITE_JOURS: number;
export declare const EMPREINTE: string;
export declare const EMPREINTE_SOURCE: string;
