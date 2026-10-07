/**
 * Le prix d'un portail calculé par l'outil de plans (moteur public + chiffrage chiffré). SERVEUR SEULEMENT : le site
 * l'importe par src/lib/prix-portail.server.ts (« server-only ») ; les tests et site.ts l'importent directement.
 *
 * Le prix est le « prix conseillé » de l'outil (chiffrage-portails.js) : le prix plancher de l'atelier (son heure à
 * 50 €) arrondi à la dizaine, × 1,17 pour un décor en fer forgé (« juste sous le marché », Quentin, 06/10/2026). Visite
 * de prise de cotes et pose comprises jusqu'à 45 km de Saumur (la visite payée en ligne est déduite de la commande).
 */
import { ChiffragePortailIndisponible, chiffragePortail } from "./chiffrage.ts";
import { configDepart, planPortail, STYLES_PORTAIL, versEntrees, type ConfigPortail, type SlugPortail } from "../portails.ts";

export { ChiffragePortailIndisponible };

export type ReponsePrixPortail =
  | { ok: true; prix: number; avertissements: string[]; resume: [string, string][] }
  | { ok: false; alertes: string[] };

/** Le prix d'un portail configuré, ou ce qui bloque (les mêmes phrases que l'outil). */
export function prixPortail(slug: SlugPortail, cfg: ConfigPortail): ReponsePrixPortail {
  const R = planPortail(slug, cfg);
  if (R.alertes.length) return { ok: false, alertes: R.alertes };
  const ch = chiffragePortail();
  const C = ch.chiffrerPortail(R, versEntrees(cfg), undefined, { clesCatalogue: ch.PTC_CLES_CATALOGUE });
  return { ok: true, prix: C.conseille, avertissements: R.avertissements, resume: R.resume };
}

const departs = new Map<SlugPortail, number | null>();

/**
 * Le « à partir de » d'une fiche : le style le moins cher, à la cote courante (3,50 × 1,60 m ; portillon 1,00 m),
 * posé. Un prix qu'un client obtient vraiment en ouvrant la fiche : jamais un chiffre qu'aucune configuration n'atteint.
 */
export function prixDepartPortail(slug: SlugPortail): number | null {
  if (departs.has(slug)) return departs.get(slug) ?? null;
  try {
    const prix = STYLES_PORTAIL.map((st) => prixPortail(slug, configDepart(slug, st))).filter((r) => r.ok).map((r) => (r as { prix: number }).prix);
    const valeur = prix.length ? Math.min(...prix) : null;
    departs.set(slug, valeur);
    return valeur;
  } catch (e) {
    if (e instanceof ChiffragePortailIndisponible) return null;
    throw e;
  }
}
