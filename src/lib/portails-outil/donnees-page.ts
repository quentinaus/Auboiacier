/**
 * Les prix de la page des portails (12/10/2026), calculés une fois par build avec les MÊMES fonctions que la fiche : la vitrine
 * (chaque style, en laqué et en galvanisé brut), les quatre cartes (le style dont le prix EST le « dès »), le coulissant sans
 * rail. Rien n'est écrit à la main. SERVEUR SEULEMENT : le site l'importe par src/lib/portails-page.server.ts.
 */
import { configDepart, type SlugPortail, type StylePortail } from "../portails.ts";
import { ORDRE_MODELES, type DonneesPagePortails } from "../portails-page.ts";
import { prixStylesPortail, styleDepartPortail } from "./prix.ts";

/** Style retenu quand un modèle n'a aucun prix (chiffrage indisponible) : le dessin existe, les prix sont null. */
const STYLE_PAR_DEFAUT: StylePortail = "lisse";

/** Vrai si la vitrine n'a aucun prix posé, ni en laqué ni en galvanisé brut : le chiffrage n'a pas pu se lancer (clé absente). */
export const aucunPrixVitrine = (d: Pick<DonneesPagePortails, "vitrine">): boolean =>
  (["laque", "brut"] as const).every((finition) => Object.values(d.vitrine[finition]).every((px) => px.pose === null));

/**
 * Un build sans la clé de chiffrage publiait en silence une page statique sans aucun prix (« Prix à vos mesures sur la fiche » partout,
 * aucun « Posé dès »). Désormais : un avertissement net en développement et pendant les tests, et sur Vercel en production
 * (VERCEL_ENV=production) une erreur claire, pour que le déploiement échoue plutôt que d'afficher une page sans prix.
 */
export function verifierPrixPage(
  d: Pick<DonneesPagePortails, "vitrine">,
  env: Record<string, string | undefined> = process.env,
  avertir: (message: string) => void = (message) => console.warn(message),
): void {
  if (!aucunPrixVitrine(d)) return;
  const message = "[page des portails] aucun prix n'a pu être calculé : la clé de chiffrage CHIFFRAGE_GARDE_CORPS_CLE est absente ou refusée. La page n'afficherait aucun prix (« Prix à vos mesures sur la fiche » partout).";
  if (env.VERCEL_ENV === "production") throw new Error(`${message} Déploiement refusé : définissez la clé dans Vercel > Settings > Environment Variables (Production).`);
  avertir(message);
}

export function donneesPagePortails(): DonneesPagePortails {
  const battant: SlugPortail = "portail-battant";
  const vitrine = {
    laque: prixStylesPortail(battant, { finition: "laque", plageTole: true }),
    brut: prixStylesPortail(battant, { finition: "brut", plageTole: true }),
  };
  const modeles = {} as DonneesPagePortails["modeles"];
  for (const slug of ORDRE_MODELES) {
    const style = styleDepartPortail(slug) ?? STYLE_PAR_DEFAUT;
    const px = prixStylesPortail(slug)[style];
    const c = configDepart(slug);
    modeles[slug] = { style, depart: px.pose, departSans: px.sansPose, P: c.P, H: c.H };
  }
  const styleAuto = styleDepartPortail("portail-coulissant", { guidage: "auto" });
  const sansRail = styleAuto ? (() => { const px = prixStylesPortail("portail-coulissant", { guidage: "auto" })[styleAuto]; return { style: styleAuto, depart: px.pose, departSans: px.sansPose }; })() : null;
  const c = configDepart(battant);
  const donnees: DonneesPagePortails = { vitrine, modeles, sansRail, coteVitrine: { P: c.P, H: c.H } };
  verifierPrixPage(donnees);
  return donnees;
}
