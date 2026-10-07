/**
 * Le prix d'un portail calculé par l'outil de plans (moteur public + chiffrage chiffré). SERVEUR SEULEMENT : le site
 * l'importe par src/lib/prix-portail.server.ts (« server-only ») ; les tests et site.ts l'importent directement.
 *
 * Le prix est le « prix conseillé » de l'outil (chiffrage-portails.js) : le prix plancher de l'atelier (son heure à
 * 50 €) arrondi à la dizaine, × 1,17 pour un décor en fer forgé (« juste sous le marché », Quentin, 06/10/2026). Visite
 * de prise de cotes et pose comprises jusqu'à 45 km de Saumur (la visite payée en ligne est déduite de la commande).
 */
import { ChiffragePortailIndisponible, chiffragePortail } from "./chiffrage.ts";
import { appliquerStyle, configDepart, planPortail, DECORS_PORTAIL, MOTEURS_PORTAIL, STYLES_PORTAIL, versEntrees, type ConfigPortail, type SlugPortail, type StylePortail } from "../portails.ts";

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

/**
 * Les prix voisins d'une configuration, en UNE fois (le bandeau des styles, la fenêtre Décor, la fenêtre Moteur) :
 * - styles : chaque style aux cotes et options du client, SANS moteur (« Prix posé à vos cotes, sans moteur ») ;
 * - decors : le portail du client avec chaque formule de décor (le décor impose l'acier et les barreaux) ;
 * - moteurs : sans moteur, et avec chaque moteur Somfy (null s'il ne convient pas à ce portail).
 * Un prix null = « à étudier » ou refusé par l'outil. Toujours des prix de vente, jamais un coût.
 */
export type VariantesPortail = {
  base: ReponsePrixPortail;
  styles: Record<StylePortail, number | null>;
  decors: Record<(typeof DECORS_PORTAIL)[number], number | null>;
  moteurs: Record<"aucun" | Exclude<(typeof MOTEURS_PORTAIL)[number], "conseille">, number | null>;
};
export function prixVariantesPortail(slug: SlugPortail, cfg: ConfigPortail): VariantesPortail {
  const p = (c: ConfigPortail) => { const r = prixPortail(slug, c); return r.ok ? r.prix : null; };
  const styles = Object.fromEntries(STYLES_PORTAIL.map((st) => [st, p({ ...appliquerStyle(cfg, st), couleur: cfg.couleur, moteur: false })])) as VariantesPortail["styles"];
  const decors = Object.fromEntries(DECORS_PORTAIL.map((d) => [d, d === "aucun" ? p({ ...cfg, decor: "aucun" }) : p({ ...cfg, decor: d, mat: "acier", remp: "barreaux" })])) as VariantesPortail["decors"];
  const moteurs = {
    aucun: p({ ...cfg, moteur: false }),
    ...Object.fromEntries((["ixengo", "axovia", "elixo"] as const).map((m) => [m, p({ ...cfg, moteur: true, moteurModele: m })])),
  } as VariantesPortail["moteurs"];
  return { base: prixPortail(slug, cfg), styles, decors, moteurs };
}
