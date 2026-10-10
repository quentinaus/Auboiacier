/**
 * Le prix d'un portail calculé par l'outil de plans (moteur public + chiffrage chiffré). SERVEUR SEULEMENT : le site
 * l'importe par src/lib/prix-portail.server.ts (« server-only ») ; les tests et site.ts l'importent directement.
 *
 * Le prix est le « prix conseillé » de l'outil (chiffrage-portails.js) : le prix plancher de l'atelier (son heure à
 * 50 €) arrondi à la dizaine, × 1,17 pour un décor en fer forgé (« juste sous le marché », Quentin, 06/10/2026). Visite
 * de prise de cotes et pose comprises jusqu'à 45 km de Saumur (la visite payée en ligne est déduite de la commande).
 */
import { ChiffragePortailIndisponible, chiffragePortail } from "./chiffrage.ts";
import { appliquerStyle, bornesPortail, configDepart, configPortillonAssorti, planPortail, DECORS_PORTAIL, MOTEURS_PORTAIL, RECEPTIONS_PORTAIL, SLUGS_PORTAIL, STYLES_PORTAIL, versEntrees, type ConfigPortail, type ReceptionPortail, type SlugPortail, type StylePortail } from "../portails.ts";

export { ChiffragePortailIndisponible };

export type ReponsePrixPortail =
  // prix : le portail, plus son portillon assorti s'il est demandé (portillon : sa part, posée avec le portail).
  | { ok: true; prix: number; portillon: number | null; avertissements: string[]; resume: [string, string][] }
  | { ok: false; alertes: string[] };

/** Le prix d'un portail configuré, ou ce qui bloque (les mêmes phrases que l'outil). */
export function prixPortail(slug: SlugPortail, cfg: ConfigPortail): ReponsePrixPortail {
  const R = planPortail(slug, cfg);
  if (R.alertes.length) return { ok: false, alertes: R.alertes };
  const ch = chiffragePortail();
  // La façon de recevoir (cfg.reception) : « pose » = le prix posé ; sans pose, ni visite, ni route, ni pose, mais l'emballage.
  // Un portail motorisé ne se vend pas sans la pose (l'outil le refuse : la conformité CE de l'ensemble est celle de l'atelier).
  const reception = cfg.reception;
  if (reception !== "pose" && cfg.moteur) return { ok: false, alertes: ["Motorisation : posée par l'atelier seulement."] };
  const C = ch.chiffrerPortail(R, versEntrees(cfg), undefined, { clesCatalogue: ch.PTC_CLES_CATALOGUE, reception });
  // Le portillon assorti (cahier des charges §4.6) : même style, chiffré en complément (une seule visite, un seul voyage).
  let portillon: number | null = null;
  if (cfg.portillon && slug !== "portillon") {
    const q = configPortillonAssorti(cfg), Rq = planPortail("portillon", q);
    if (Rq.alertes.length) return { ok: false, alertes: Rq.alertes.map((a) => `Portillon assorti : ${a}`) };
    portillon = ch.chiffrerPortail(Rq, versEntrees(q), undefined, { clesCatalogue: ch.PTC_CLES_CATALOGUE, complement: true, reception }).conseille;
  }
  return { ok: true, prix: C.conseille + (portillon ?? 0), portillon, avertissements: R.avertissements, resume: R.resume };
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
  // Le portillon assorti : son prix posé avec le portail, et commandé seul (pour comparer) ; null sur la fiche du portillon.
  portillon: { avec: number | null; seul: number | null } | null;
  // Les moulures : le prix avec et sans (null quand le bas n'est pas plein).
  moulure: { avec: number | null; sans: number | null };
  // La façon de recevoir (10/10/2026) : le prix de la configuration posée, livrée par transporteur, au retrait. Sans pose, pas de moteur : null avec moteur.
  reception: Record<ReceptionPortail, number | null>;
};
export function prixVariantesPortail(slug: SlugPortail, cfg: ConfigPortail): VariantesPortail {
  const p = (c: ConfigPortail) => { const r = prixPortail(slug, c); return r.ok ? r.prix : null; };
  const styles = Object.fromEntries(STYLES_PORTAIL.map((st) => [st, p({ ...appliquerStyle(cfg, st), couleur: cfg.couleur, moteur: false })])) as VariantesPortail["styles"];
  const decors = Object.fromEntries(DECORS_PORTAIL.map((d) => [d, d === "aucun" ? p({ ...cfg, decor: "aucun" }) : p({ ...cfg, decor: d, mat: "acier", remp: "barreaux" })])) as VariantesPortail["decors"];
  const moteurs = {
    aucun: p({ ...cfg, moteur: false }),
    ...Object.fromEntries((["ixengo", "axovia", "elixo"] as const).map((m) => [m, p({ ...cfg, moteur: true, moteurModele: m })])),
  } as VariantesPortail["moteurs"];
  const q = configPortillonAssorti(cfg);
  const avecP = slug === "portillon" ? null : prixPortail(slug, { ...cfg, portillon: true }), sansP = slug === "portillon" ? null : prixPortail(slug, { ...cfg, portillon: false });
  const portillon = slug === "portillon" ? null : {
    avec: avecP?.ok && sansP?.ok ? avecP.prix - sansP.prix : null,
    seul: (() => { const r = prixPortail("portillon", q); return r.ok ? r.prix : null; })(),
  };
  const basPlein = cfg.soub === "plein" || cfg.soub === "panneau";
  const moulure = { avec: basPlein ? p({ ...cfg, moulure: true }) : null, sans: p({ ...cfg, moulure: false }) };
  const reception = Object.fromEntries(RECEPTIONS_PORTAIL.map((r) => [r, p({ ...cfg, reception: r })])) as VariantesPortail["reception"];
  return { base: prixPortail(slug, cfg), styles, decors, moteurs, portillon, moulure, reception };
}

/**
 * Le « dès » de chaque modèle AUX COTES DU CLIENT (la page des portails, 10/10/2026) : le style le moins cher, sans moteur,
 * à son passage et sa hauteur. null quand la cote sort des bornes du modèle (le portillon garde sa largeur courante : les
 * cotes données sont celles du portail). Des prix de vente seulement.
 */
export function prixDepartModeles(P: number, H: number): Record<SlugPortail, number | null> {
  const sortie = {} as Record<SlugPortail, number | null>;
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const b = bornesPortail(slug);
    const p = slug === "portillon" ? configDepart(slug).P : P;
    if (p < b.P[0] || p > b.P[1] || H < b.H[0] || H > b.H[1]) { sortie[slug] = null; continue; }
    const prix = STYLES_PORTAIL.map((st) => prixPortail(slug, { ...configDepart(slug, st), P: p, H })).filter((r) => r.ok).map((r) => (r as { prix: number }).prix);
    sortie[slug] = prix.length ? Math.min(...prix) : null;
  }
  return sortie;
}
