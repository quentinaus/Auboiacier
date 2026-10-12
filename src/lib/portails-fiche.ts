/**
 * Ce que la fiche d'un portail reprend de la page des portails (13/10/2026) : l'adresse du résultat de son guide
 * « Quel portail pour votre entrée ? ». Même adresse que celle du bouton de la page (portails-guide.ts : vueModele) :
 * le modèle, le STYLE DU « DÈS » annoncé (pas le style de départ de la fiche) et, pour le coulissant, le guidage (rail ou
 * sans rail). Sans moteur ni prix : le serveur donne les styles (styleDepartPortail) et construit les quatre adresses,
 * le navigateur n'a plus qu'à choisir (la page des portails et ses textes n'entrent pas dans le code de la fiche).
 */
import { SLUGS_PORTAIL, type Langue, type SlugPortail, type StylePortail } from "./portails-base.ts";
import type { LiensGuideFiche, ResultatGuideFiche } from "./portails.ts";
import { lienFiche } from "./portails-page.ts";

/** Le style du « dès » de chaque modèle (styleDepartPortail), et celui du coulissant sans rail ; null quand le chiffrage est indisponible. */
export type StylesDepart = Record<SlugPortail, StylePortail | null> & { sansRail: StylePortail | null };

/** Le style du « dès » de chaque modèle et du coulissant sans rail, d'après le chiffrage (styleDepartPortail de portails-outil/prix.ts : serveur seulement, donné ici en paramètre). */
export function stylesDepart(styleDepartPortail: (slug: SlugPortail, o?: { guidage?: "rail" | "auto" }) => StylePortail | null): StylesDepart {
  const departs = {} as StylesDepart;
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) departs[slug] = styleDepartPortail(slug);
  departs.sansRail = styleDepartPortail("portail-coulissant", { guidage: "auto" });
  return departs;
}

/** Le style montré quand le chiffrage est indisponible : celui de donnees-page.ts (STYLE_PAR_DEFAUT), pour que les deux adresses restent les mêmes. */
export const STYLE_SANS_PRIX: StylePortail = "lisse";

/** Les quatre parcours du guide : le modèle et, pour le coulissant, le guidage. */
const MODELES: Record<ResultatGuideFiche, { slug: SlugPortail; guidage?: "rail" | "auto" }> = {
  battant: { slug: "portail-battant" }, pliant: { slug: "portail-pliant" },
  rail: { slug: "portail-coulissant", guidage: "rail" }, auto: { slug: "portail-coulissant", guidage: "auto" },
};

/** Les quatre adresses du guide de la fiche : /fr/artisanat/portail-coulissant?style=lisse&guidage=auto#configuration. */
export function liensGuideFiche(locale: Langue, departs: StylesDepart): LiensGuideFiche {
  const lien = (r: ResultatGuideFiche) => {
    const { slug, guidage } = MODELES[r];
    const style = (r === "auto" ? departs.sansRail : null) ?? departs[slug] ?? STYLE_SANS_PRIX;
    return lienFiche(locale, slug, { style, ...(guidage ? { guidage } : {}) });
  };
  return { battant: lien("battant"), pliant: lien("pliant"), rail: lien("rail"), auto: lien("auto") };
}
