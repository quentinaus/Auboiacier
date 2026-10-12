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
  return { vitrine, modeles, sansRail, coteVitrine: { P: c.P, H: c.H } };
}
