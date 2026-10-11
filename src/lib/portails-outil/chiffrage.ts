/**
 * Le chiffrage des portails de l'outil de plans (chiffrerPortail, plans/modules/chiffrage-portails.js), déchiffré avec la
 * clé du serveur. SERVEUR SEULEMENT : passer par src/lib/prix-portail.server.ts.
 *
 * Même coffre que le garde-corps (src/lib/garde-corps-outil/coffre.ts, même clé) : les coûts de l'atelier voyagent chiffrés
 * dans le dépôt public. Sans clé (ou avec une mauvaise clé), rien n'est inventé : le site ne donne pas de prix de portail.
 */
import { CHIFFRE, EMPREINTE_CLAIR } from "./chiffrage.chiffre.mjs";
import { dechiffrer, empreinte, lireCle } from "../garde-corps-outil/coffre.ts";

/** Ce que rend chiffrerPortail : seuls les champs utilisés par le site sont typés. */
export type ResultatChiffragePortail = {
  conseille: number;
  plancher: number;
  cout: number;
  heures: number;
  [autre: string]: unknown;
};
type ChiffragePortail = {
  chiffrerPortail: (R: unknown, v: unknown, T?: unknown, options?: { km?: number; clesCatalogue?: Record<string, string>; complement?: boolean; reception?: "pose" | "transporteur" | "retrait" }) => ResultatChiffragePortail;
  PTC_KM_REF: number;
  /** Le catalogue public des volutes est anonymisé (« c1 », « c2 »…) : sa table code → clé de prix est ici, chiffrée. */
  PTC_CLES_CATALOGUE: Record<string, string>;
  /** Les postes du devis (lot 8) : des prix de vente seulement, dont la somme fait le prix. plans(v) rend le plan d'une variante. */
  ptcPostesDevis: (R: unknown, v: unknown, T: unknown, options: { km?: number; clesCatalogue?: Record<string, string>; reception?: "pose" | "transporteur" | "retrait" }, plans: (v: Record<string, unknown>) => unknown) => { total: number; postes: { cle: string; montant: number }[] };
};

/** Le prix ne peut pas être calculé : clé absente ou fausse. La route répond 503, jamais un prix inventé. */
export class ChiffragePortailIndisponible extends Error {
  raison: "cle-absente" | "cle-invalide";
  constructor(raison: "cle-absente" | "cle-invalide") {
    super(`chiffrage des portails indisponible (${raison})`);
    this.name = "ChiffragePortailIndisponible";
    this.raison = raison;
  }
}

let charge: ChiffragePortail | null = null;

/** Le chiffrage, déchiffré une seule fois par instance du serveur ; sinon l'erreur ChiffragePortailIndisponible. */
export function chiffragePortail(dossier?: string): ChiffragePortail {
  if (charge) return charge;
  let cle: Buffer | null;
  try {
    cle = lireCle(dossier);
  } catch {
    throw new ChiffragePortailIndisponible("cle-invalide");
  }
  if (!cle) throw new ChiffragePortailIndisponible("cle-absente");
  let corps: string;
  try {
    corps = dechiffrer(CHIFFRE, cle);
  } catch {
    throw new ChiffragePortailIndisponible("cle-invalide");
  }
  if (empreinte(corps) !== EMPREINTE_CLAIR) throw new ChiffragePortailIndisponible("cle-invalide");
  const fabrique = new Function(`"use strict";\n${corps}\nreturn { chiffrerPortail, PTC_KM_REF, PTC_CLES_CATALOGUE, ptcPostesDevis };`) as () => ChiffragePortail;
  charge = Object.freeze(fabrique());
  return charge;
}
