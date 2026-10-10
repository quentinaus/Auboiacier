// Chemins relatifs et extensions en toutes lettres : les tests (node --test) chargent ce fichier tel quel.
import type { CartLine } from "./cart.tsx";

/**
 * L'identifiant d'une ligne du panier, dérivé de ses options : deux fois la même configuration = une seule ligne (sa
 * quantité monte), une option différente = une autre ligne. Sorti de cart.tsx (« use client », du JSX) pour que les tests le
 * lisent. ATTENTION : un identifiant qui change pour une ligne existante la dédouble au panier ; les champs nouveaux ne
 * s'ajoutent que s'ils sont présents.
 */
export function lineId(line: CartLine): string {
  return [
    line.slug,
    line.sizeId,
    line.woodId,
    line.metalId,
    line.fabricId,
    line.remplissageId,
    line.largeurMm,
    line.hauteurMm,
    line.epaisseurMm,
    line.priseDeCotesCp,
    line.poseCp,
    line.livraisonCp,
    line.livraisonSlug,
    line.rdv,
    line.note,
    // Le relevé d'un garde-corps : une autre fenêtre, une autre ligne. Absent
    // des autres pièces, dont l'identifiant ne change donc pas.
    ...(line.allegeMm !== undefined ? [line.allegeMm, line.enEtage ? "etage" : "rdc", line.fenetreMm, line.modeleGc ?? ""] : []),
    // Le décor à volutes, SEULEMENT s'il y en a un : les identifiants des lignes déjà au panier ne changent pas.
    ...(line.decorGc ? [line.decorGc] : []),
    // Le mur des tableaux : un autre mur, une autre fixation, une autre ligne. Sans mur, l'identifiant ne change pas.
    ...(line.allegeMm !== undefined && line.murGc ? [line.murGc, line.tMurMm ?? "", line.eMurMm ?? ""] : []),
    // La largeur à 1 m du sol (murs pas parallèles) : une autre largeur en haut, une autre pièce, une autre ligne. Absente
    // (murs droits), l'identifiant ne change pas.
    ...(line.allegeMm !== undefined && line.largeurHautMm !== undefined ? [`lh${line.largeurHautMm}`] : []),
    // Un portail : une autre configuration, une autre ligne. Absent des autres pièces.
    ...(line.portail ? [line.portail] : []),
  ]
    .map((part) => part ?? "-")
    .join("|");
}
