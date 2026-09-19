"use client";

import Image from "next/image";

/**
 * La lumière de la toile : pêche, rose, lavande — le dégradé pastel que
 * Quentin a retenu, tel quel, sans filtre de saturation.
 */
const LUMIERE = "linear-gradient(135deg, #f9cfa0 0%, #f6c6d6 50%, #cbc2f5 100%)";

/**
 * Une photo d'intérieur dont la dalle lumineuse est réellement éclairée par le
 * dégradé animé.
 *
 * Le dégradé est dessiné dans une boîte calée sur la dalle, pas sur toute la
 * photo : sinon on n'en voyait qu'une tranche, comme un shader rogné. Le
 * polygone est donc donné en pourcentages de cette boîte.
 */
/**
 * La lumière de la toile, découpée dans la membrane. Réutilisé par la galerie produit.
 *
 * Un dégradé CSS, pas le shader WebGL du bandeau d'accueil : sur une dalle,
 * le bruit du shader faisait des taches et un contour flou, alors que ce
 * dégradé fixe donne une toile uniformément allumée, du chaud au froid, au
 * contour net. Il dérive très
 * lentement pour que la lumière vive un peu ; pas du tout si le visiteur a
 * demandé moins d'animations.
 */
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
        <div
          className="membrane-lumiere absolute inset-0"
          style={{ backgroundImage: LUMIERE, backgroundSize: "125% 125%" }}
        />
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
