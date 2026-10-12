/**
 * L'arrivée sur la fiche d'un portail avec une configuration dans l'adresse (?style=barreaux&couleur=vert#configuration), 13/10/2026.
 * Le serveur envoie la fiche dans son style de départ ; le style, la teinte et les cotes de l'adresse ne sont lus qu'au navigateur.
 * Sans précaution, le visiteur voit d'abord le mauvais dessin, puis le bon. Un petit script posé avant la fiche (il s'exécute
 * pendant la lecture de la page, avant le premier affichage) met un attribut sur le bloc qui porte la fiche (#acheter, qui porte
 * suppressHydrationWarning : sur <html>, React signale l'attribut ajouté avant l'hydratation) ; la feuille de style cache alors la plaque
 * de la configuration (opacity : elle garde sa place, rien ne bouge) ; la fiche, une fois la configuration de l'adresse appliquée,
 * lève l'attribut (« fondu » : l'opacité remonte en un fondu), puis le retire. Un filet de sécurité retire l'attribut au bout de
 * 2,5 s dans tous les cas (script de la fiche en erreur, page abandonnée). Sans JavaScript, l'attribut n'est jamais posé : rien n'est caché.
 * Sans paramètre de configuration dans l'adresse, le script ne fait rien : la page se charge comme avant.
 */

/** L'attribut posé sur le bloc de la fiche : « attente » (plaque cachée), « fondu » (plaque qui réapparaît), absent (rien de spécial). */
export const ATTRIBUT_ATTENTE = "data-cfg-attente";
/** Le bloc de la fiche (page.tsx : <div id="acheter" suppressHydrationWarning>) : le script y pose l'attribut, la fiche le lève. */
export const HOTE_ATTENTE = "acheter";
/** Les paramètres d'adresse que configDepuisAdresse (portails.ts) sait lire. */
export const PARAMS_ADRESSE_FICHE = ["style", "design", "mat", "couleur", "P", "H", "guidage"] as const;
/** Au bout de ce délai (ms), la plaque réapparaît quoi qu'il arrive. */
export const DELAI_FILET_MS = 2500;
/** Le fondu d'apparition (ms) ; l'attribut est retiré un peu après. */
export const DUREE_FONDU_MS = 220;

/** Vrai si l'adresse (sa partie « ?… ») porte une configuration à appliquer. */
export function adressePorteConfig(recherche: string): boolean {
  const q = new URLSearchParams(recherche);
  return PARAMS_ADRESSE_FICHE.some((k) => q.has(k));
}

/** Le script posé avant la fiche : sans paramètre dans l'adresse, il ne fait rien ; sinon il pose l'attribut et arme le filet de sécurité. */
export function scriptAttente(): string {
  const a = JSON.stringify(ATTRIBUT_ATTENTE), p = JSON.stringify(PARAMS_ADRESSE_FICHE);
  return `(function(){try{var q=new URLSearchParams(location.search),p=${p},v=false,i;for(i=0;i<p.length;i++)if(q.has(p[i]))v=true;if(!v)return;`
    + `var h=document.getElementById(${JSON.stringify(HOTE_ATTENTE)}),a=${a};if(!h)return;h.setAttribute(a,"attente");`
    + `setTimeout(function(){if(h.getAttribute(a)==="attente"){h.setAttribute(a,"fondu");setTimeout(function(){if(h.getAttribute(a)==="fondu")h.removeAttribute(a)},${DUREE_FONDU_MS + 130})}},${DELAI_FILET_MS})}catch(e){}})()`;
}

/** Une configuration appliquée : la plaque réapparaît en fondu, puis l'attribut disparaît. Sans effet quand l'attribut n'est pas là. */
export function libererAttente(racine: { getAttribute(n: string): string | null; setAttribute(n: string, v: string): void; removeAttribute(n: string): void } | null, minuteur: (f: () => void, ms: number) => unknown = setTimeout): void {
  if (!racine || racine.getAttribute(ATTRIBUT_ATTENTE) !== "attente") return;
  racine.setAttribute(ATTRIBUT_ATTENTE, "fondu");
  minuteur(() => { if (racine.getAttribute(ATTRIBUT_ATTENTE) === "fondu") racine.removeAttribute(ATTRIBUT_ATTENTE); }, DUREE_FONDU_MS + 130);
}
