// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) et le script
// de la carte (scripts/carte-avis.mjs) chargent ce fichier directement.
import { locales } from "./i18n.ts";

/**
 * L'adresse courte des avis : https://auboiacier.fr/avis.
 *
 * Elle est imprimée sur la carte des colis et écrite dans le mail envoyé après
 * la livraison. Elle ne change JAMAIS : c'est sa destination qui change (le
 * lien d'avis de la fiche Google, lienLaisserAvis dans seo.ts). Une carte
 * imprimée aujourd'hui reste bonne le jour où Google change son lien.
 *
 * Ce fichier est PUR : le proxy (src/proxy.ts), la page /avis, les tests et le
 * script de la carte le lisent.
 */
export const ADRESSE_AVIS = "https://auboiacier.fr/avis";

/** La même, telle qu'on l'écrit pour un être humain : sans « https:// ». */
export const ADRESSE_AVIS_LISIBLE = "auboiacier.fr/avis";

/** /avis, /fr/avis et /en/avis, avec ou sans barre finale. */
export function estCheminAvis(chemin: string): boolean {
  const propre = chemin.replace(/\/+$/, "");
  return propre === "/avis" || locales.some((locale) => propre === `/${locale}/avis`);
}

/**
 * Où renvoyer une visite de /avis : le lien d'avis Google quand il est connu,
 * sinon null — la visite suit alors son chemin normal jusqu'à la page de
 * remerciement (src/app/[lang]/avis/page.tsx).
 */
export function redirectionAvis(chemin: string, lien: string | null): string | null {
  return lien && estCheminAvis(chemin) ? lien : null;
}
