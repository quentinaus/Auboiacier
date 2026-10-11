import "server-only";

/**
 * Les marqueurs de prix, au complet : ceux de tout le site (src/lib/marqueurs.ts)
 * et ceux du garde-corps, que seul l'outil de plans sait calculer —
 * {prix:garde-corps}, {prixAppelGC}, {largeurAppelGC}.
 *
 * SERVEUR SEULEMENT (« server-only ») : l'outil passe par sa seule porte,
 * src/lib/prix-garde-corps.server.ts. getDictionary remplit déjà les autres
 * marqueurs ; une page du serveur qui cite un prix du garde-corps passe son
 * texte (ou tout le dictionnaire) par remplacerMarqueursPrix.
 *
 * Sans la clé du chiffrage, l'outil ne donne aucun prix : le marqueur n'a
 * pas de valeur et remplacerMarqueursPrix lève MarqueurSansValeur, plutôt
 * que d'afficher un chiffre inventé ou un marqueur brut.
 */
import type { Locale } from "./i18n.ts";
import { remplacerAvec, valeursMarqueurs, valeursMarqueursOutil, verifierMarqueurs } from "./marqueurs.ts";
import { prixAppelGC, prixDepart } from "./prix-garde-corps.server.ts";

/** Toutes les valeurs : celles du site, puis celles de l'outil de plans. */
export function valeursMarqueursPrix(locale: Locale): Record<string, string> {
  return { ...valeursMarqueurs(locale), ...valeursMarqueursOutil(locale, { prixDepart, prixAppelGC }) };
}

/**
 * Le même objet, tous les marqueurs du code remplacés. Lève
 * MarqueurSansValeur s'il en reste un sans valeur : jamais de chiffre écrit
 * à la main, jamais de « {prixAppelGC} » affiché tel quel.
 */
export function remplacerMarqueursPrix<T>(valeur: T, locale: Locale): T {
  const resultat = remplacerAvec(valeur, valeursMarqueursPrix(locale));
  verifierMarqueurs(resultat, `marqueurs (${locale})`);
  return resultat;
}
