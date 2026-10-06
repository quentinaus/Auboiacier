"use client";

import Link from "next/link";
import { memoriserConfig } from "@/lib/config-memo";

/**
 * « Ouvrir avec ces cotes », sur la page des normes du garde-corps : le lien
 * mène à la fiche, et pose AVANT d'y aller les cotes de l'exemple dans le
 * stockage de session — le configurateur les relit au montage
 * (config-memo.ts), comme pour « Reprendre » un favori (favoris-liste.tsx).
 * La fiche affiche alors l'exemple, prix compris, et le client n'a plus qu'à
 * changer une cote.
 *
 * Sans JavaScript, ou si le stockage est refusé, c'est un simple lien vers la
 * fiche : rien ne casse. Les deux largeurs (au ras de l'appui, à un mètre du
 * sol) sont celles de l'exemple, des murs parallèles ; l'étage est celui de
 * l'exemple, dit par la page.
 */
export function OuvrirCotesGC({
  href,
  slug,
  largeurMm,
  allegeMm,
  enEtage,
  woodId,
  label,
  ariaLabel,
  className,
}: {
  href: string;
  slug: string;
  largeurMm: number;
  allegeMm: number;
  enEtage: boolean;
  woodId: string;
  label: string;
  /** Le nom lu par les lecteurs d'écran : le texte visible, puis l'appui de l'exemple (tous les liens du tableau disent la même chose). */
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() =>
        memoriserConfig({
          slug,
          woodId,
          gcLargeurMm: largeurMm,
          gcLargeurHautMm: largeurMm,
          gcAllegeMm: allegeMm,
          gcEnEtage: enEtage,
        })
      }
    >
      {label}
    </Link>
  );
}
