/**
 * Le chiffrage de l'outil de plans (chiffrerGC, remiseGC, REGLAGES), déchiffré
 * avec la clé du serveur. SERVEUR SEULEMENT : passer par
 * src/lib/prix-garde-corps.server.ts.
 *
 * Sans clé (ou avec une mauvaise clé), rien n'est inventé : le site ne donne
 * pas de prix de garde-corps, il répond « indisponible ».
 */
import { CHIFFRE, EMPREINTE_CLAIR } from "./chiffrage.chiffre.mjs";
import { fmt } from "./moteur.genere.mjs";
import { dechiffrer, empreinte, evaluerChiffrage, lireCle, type ChiffrageGC } from "./coffre.ts";

export type EtatChiffrage = { ok: true; chiffrage: ChiffrageGC } | { ok: false; raison: "cle-absente" | "cle-invalide" };

/** Le prix ne peut pas être calculé : clé absente ou fausse. La route répond 503, jamais un prix inventé. */
export class ChiffrageIndisponible extends Error {
  raison: "cle-absente" | "cle-invalide";
  constructor(raison: "cle-absente" | "cle-invalide") {
    super(`chiffrage du garde-corps indisponible (${raison})`);
    this.name = "ChiffrageIndisponible";
    this.raison = raison;
  }
}

function texteClair(dossier?: string): { ok: true; corps: string } | { ok: false; raison: "cle-absente" | "cle-invalide" } {
  let cle: Buffer | null;
  try {
    cle = lireCle(dossier);
  } catch {
    return { ok: false, raison: "cle-invalide" };
  }
  if (!cle) return { ok: false, raison: "cle-absente" };
  try {
    const corps = dechiffrer(CHIFFRE, cle);
    return empreinte(corps) === EMPREINTE_CLAIR ? { ok: true, corps } : { ok: false, raison: "cle-invalide" };
  } catch {
    return { ok: false, raison: "cle-invalide" };
  }
}

let charge: ChiffrageGC | null = null;

/** Le chiffrage, déchiffré une seule fois par instance du serveur. */
export function chargerChiffrage(dossier?: string): EtatChiffrage {
  if (charge) return { ok: true, chiffrage: charge };
  const t = texteClair(dossier);
  if (!t.ok) return t;
  charge = evaluerChiffrage(t.corps, fmt);
  return { ok: true, chiffrage: charge };
}

/** Le chiffrage, ou l'erreur ChiffrageIndisponible. */
export function chiffrage(): ChiffrageGC {
  const e = chargerChiffrage();
  if (!e.ok) throw new ChiffrageIndisponible(e.raison);
  return e.chiffrage;
}

/**
 * Le texte en clair du chiffrage : pour les contrôles seulement (les tests et
 * la vérification du build en tirent la liste des chaînes de coûts à ne
 * jamais retrouver ailleurs). Ne jamais l'écrire, l'afficher ni l'envoyer.
 */
export function texteDuChiffrage(dossier?: string): string | null {
  const t = texteClair(dossier);
  return t.ok ? t.corps : null;
}
