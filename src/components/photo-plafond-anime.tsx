"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * La lumière de la toile : pêche, rose, lavande — le dégradé pastel que
 * Quentin a retenu, tel quel, sans filtre de saturation.
 */
export const LUMIERE = "linear-gradient(135deg, #f9cfa0 0%, #f6c6d6 50%, #cbc2f5 100%)";

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

type Rectangle = { left: number; top: number; width: number; height: number };

function pourcent(valeur: string) {
  return parseFloat(valeur) / 100;
}

/**
 * La fiche produit encadre la photo dans une boîte dont la forme change avec
 * l'écran (large et basse sur téléphone, haute sur ordinateur) : on ne peut
 * pas la forcer à un ratio fixe comme sur la page d'accueil. Le calage du
 * halo en pourcentages d'un « conteneur carré » (`container-type: size` +
 * unités `cqw`/`cqh`) dépendait donc du bon calcul de ce carré au bon
 * moment — fragile sur certains Safari mobiles, où le cadre et le dégradé se
 * sont retrouvés décalés. On mesure ici directement le rectangle réellement
 * dessiné par la photo (comme pour le clic hors-image du plein écran plus
 * bas) : le halo se cale dessus, quel que soit le navigateur.
 */
function useRectanglePhoto(image: HTMLImageElement | null) {
  const [rect, setRect] = useState<Rectangle | null>(null);

  useEffect(() => {
    if (!image) return;
    function mesurer() {
      const img = image!;
      const cs = getComputedStyle(img);
      const padGauche = parseFloat(cs.paddingLeft) || 0;
      const padHaut = parseFloat(cs.paddingTop) || 0;
      const padDroite = parseFloat(cs.paddingRight) || 0;
      const padBas = parseFloat(cs.paddingBottom) || 0;
      const cw = img.clientWidth - padGauche - padDroite;
      const ch = img.clientHeight - padHaut - padBas;
      const { naturalWidth: nw, naturalHeight: nh } = img;
      if (!nw || !nh || cw <= 0 || ch <= 0) return;
      const echelle = Math.min(cw / nw, ch / nh);
      const width = nw * echelle;
      const height = nh * echelle;
      setRect({
        left: img.offsetLeft + padGauche + (cw - width) / 2,
        top: img.offsetTop + padHaut + (ch - height) / 2,
        width,
        height,
      });
    }
    mesurer();
    image.addEventListener("load", mesurer);
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(image);
    return () => {
      image.removeEventListener("load", mesurer);
      observateur.disconnect();
    };
  }, [image]);

  return rect;
}

/**
 * La photo de plafond de la fiche produit, dans un cadre à la forme variable
 * (voir `useRectanglePhoto` ci-dessus) : le halo se cale sur la photo
 * elle-même, mesurée en pixels, plutôt que sur un conteneur carré recalculé.
 */
export function PhotoPlafondMesuree({
  src,
  alt,
  glow,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  glow: { box: { left: string; top: string; width: string; height: string }; clip: string };
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const rect = useRectanglePhoto(image);

  return (
    <>
      <Image
        ref={setImage}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className ?? "object-contain"}
        priority={priority}
      />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: rect.left + pourcent(glow.box.left) * rect.width,
            top: rect.top + pourcent(glow.box.top) * rect.height,
            width: pourcent(glow.box.width) * rect.width,
            height: pourcent(glow.box.height) * rect.height,
          }}
        >
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: glow.clip }}>
            <div
              className="membrane-lumiere absolute inset-0"
              style={{ backgroundImage: LUMIERE, backgroundSize: "125% 125%" }}
            />
          </div>
        </div>
      )}
    </>
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
