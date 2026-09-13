"use client";

import Image from "next/image";
import { HeroShaderBackground } from "./hero-shader-background";

/**
 * Une photo d'intérieur dont la dalle lumineuse est réellement éclairée par le
 * dégradé animé.
 *
 * Le dégradé est dessiné dans une boîte calée sur la dalle, pas sur toute la
 * photo : sinon on n'en voyait qu'une tranche, comme un shader rogné. Le
 * polygone est donc donné en pourcentages de cette boîte.
 */
/** Le dégradé animé, découpé dans une membrane. Réutilisé par la galerie produit. */
export function MembraneAnimee({
  box,
  clip,
}: {
  box: { left: string; top: string; width: string; height: string };
  clip: string;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={box}>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: clip }}>
        {/* Le dégradé déborde largement : de grands aplats doux, pas une mosaïque.
            Le même dégradé que le bandeau d'accueil, mais franchement coloré
            ici : une toile allumée, pas un blanc voilé. */}
        <div className="absolute -inset-x-[120%] -inset-y-[260%]" style={{ filter: "saturate(2.6) contrast(1.08)" }}>
          <HeroShaderBackground />
        </div>
      </div>
    </div>
  );
}

export function PhotoPlafondAnime({
  src,
  alt,
  box,
  clip,
  sizes,
  entiere = false,
}: {
  src: string;
  alt: string;
  /** Rectangle englobant la dalle, en pourcentages de la photo. */
  box: { left: string; top: string; width: string; height: string };
  /** Contour de la dalle, en pourcentages de ce rectangle. */
  clip: string;
  sizes: string;
  /** La photo entière dans le cadre (fond de studio), plutôt que recadrée. */
  entiere?: boolean;
}) {
  return (
    <>
      <Image src={src} alt={alt} fill sizes={sizes} className={entiere ? "object-contain" : "object-cover"} />
      <MembraneAnimee box={box} clip={clip} />
    </>
  );
}
