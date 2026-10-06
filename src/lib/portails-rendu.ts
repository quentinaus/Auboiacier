/**
 * Le rendu « réaliste » des dessins de portail : les mêmes primitives que les plans de l'outil (svgDe), habillées de la
 * couleur choisie, du chêne et de la pierre des piliers. Aucune géométrie ici : seulement des couleurs.
 * Les traits fins ne grossissent pas avec le zoom (vector-effect) ; les volutes, elles, gardent leur vraie épaisseur.
 */
import type { COULEURS_PORTAIL } from "./portails";

type Couleur = (typeof COULEURS_PORTAIL)[number];
/** [teinte du cadre, teinte des panneaux, trait] — RAL 7016, 9005, 9016, 6009, et une rouille. */
export const TEINTES_PORTAIL: Record<Couleur, [string, string, string]> = {
  anthracite: ["#3a3f43", "#454b50", "#26292c"],
  noir: ["#202020", "#2b2b2b", "#0e0e0e"],
  blanc: ["#efede8", "#f6f5f1", "#8f877c"],
  vert: ["#2b3d31", "#34493b", "#1a251e"],
  rouille: ["#74462c", "#7f5034", "#4c2c1a"],
};

export function STYLE_RENDU_PORTAIL(couleur: Couleur): string {
  const [c, p, d] = TEINTES_PORTAIL[couleur] ?? TEINTES_PORTAIL.anthracite;
  const ns = "vector-effect:non-scaling-stroke";
  return [
    `.t-acier-plein,.t-rond{fill:${c};stroke:${d};stroke-width:1;${ns}}`,
    `.t-mur.t-panneau{fill:${p};stroke:${d};stroke-width:1;${ns}}`,
    `.t-acier{fill:none;stroke:${d};stroke-width:1.2;${ns}}`,
    `.t-acier.t-volute{stroke:${c};stroke-width:14;stroke-linecap:round;stroke-linejoin:round;vector-effect:none}`,
    `.t-acier.t-serrure{fill:#9a948c;stroke:none}`,
    `.t-bois{fill:#b98a56;stroke:#8a6237;stroke-width:1;${ns}}`,
    `.t-mur{fill:#eee8df;stroke:#b5a690;stroke-width:1;${ns}}`,
    `.t-mur.t-pilier{fill:#dcd2c3;stroke:#b8a993;stroke-width:1;${ns}}`,
    `.t-cache{fill:none;stroke:#9a8f84;stroke-width:1.2;stroke-dasharray:6 5;${ns}}`,
    `.t-sol{stroke:#a89c8e;stroke-width:1.5;${ns}}`,
    `.t-cote{fill:none;stroke:#2f5f8a;stroke-width:1;${ns}}`,
    `.t-texte{fill:#2f5f8a;font-family:ui-monospace,Menlo,monospace}`,
    `.t-libre{fill:#5c5140;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif}`,
    `.t-fleche{fill:#2f5f8a}`,
    `.t-bon.t-zone{fill:rgba(63,107,58,0.13);stroke:#3f6b3a;stroke-width:1.2;stroke-dasharray:6 4;${ns}}`,
    `.t-bon{fill:none;stroke:#3f6b3a;stroke-width:1.2;stroke-dasharray:6 4;${ns}}`,
  ].join("");
}
