/**
 * Vignette qui grandit au survol et passe au-dessus de ses voisines,
 * façon artmeta.fr. À poser sur le conteneur de l'image (pas sur l'image).
 */
export const hoverZoom =
  "z-0 transition-[scale,box-shadow] duration-500 ease-out hover:z-20 hover:scale-[1.08] hover:shadow-[0_30px_60px_-24px_rgba(0,0,0,0.45)]";

/** Même effet, dosé plus discrètement pour les grandes images. */
export const hoverZoomSubtle =
  "z-0 transition-[scale,box-shadow] duration-500 ease-out hover:z-20 hover:scale-[1.04] hover:shadow-[0_30px_60px_-24px_rgba(0,0,0,0.35)]";

/**
 * Le visiteur a demandé « moins d'animations » dans les réglages de son
 * appareil. La feuille de style s'en occupe pour les transitions ; ceci sert
 * aux animations pilotées en JavaScript (défilements, dégradé animé).
 */
export function moinsDAnimations(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Amène un élément à l'écran. Le glissement doux est supprimé quand le
 * visiteur a demandé moins d'animations : la page saute directement au bon
 * endroit, sans donner le tournis.
 */
export function amenerAlEcran(
  element: Element | null | undefined,
  options: ScrollIntoViewOptions = {}
) {
  if (!element) return;
  element.scrollIntoView({
    ...options,
    behavior: moinsDAnimations() ? "auto" : (options.behavior ?? "smooth"),
  });
}

/** Contour de focus visible, à ajouter aux boutons qui n'en ont pas d'eux-mêmes. */
export const focusVisible =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2b2320]";

/**
 * Un prix, écrit comme on l'écrit dans la langue du visiteur.
 * En français l'euro se met derrière le nombre, en anglais devant : « 2 870 € »
 * d'un côté, « €2,870 » de l'autre. Tout le site passe par ici pour que le prix
 * du catalogue, celui du panier, celui de la facture et celui que Google
 * affiche soient écrits de la même façon.
 */
export function prixAffiche(euros: number, locale: "fr" | "en"): string {
  // Les prix du catalogue sont des euros entiers ; seule la prise de cotes
  // à 9,99 € a des centimes, et on les garde.
  const decimales = Number.isInteger(euros) ? 0 : 2;
  if (locale === "en") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(euros);
  }
  return `${euros.toLocaleString("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}\u00a0€`;
}

/** Une surface en m², avec le séparateur décimal de la langue. */
export function surfaceAffichee(m2: number, locale: "fr" | "en"): string {
  const nombre = m2.toFixed(2);
  return `${locale === "en" ? nombre : nombre.replace(".", ",")} m²`;
}
