"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * Les scènes animées « en aplats » (motion-aplat.genere.ts, extraites de docs/motion-aplat/ par
 * scripts/extraire-motion-aplat.mjs) : environ 60 ko compressés, chargés à la demande, seulement là où une
 * scène s'affiche (la fiche du garde-corps), jamais avec le reste du site.
 */
type Scenes = typeof import("./motion-aplat.genere");

let chargement: Promise<Scenes> | null = null;

/** Les scènes, une fois chargées (`null` avant) ; un seul chargement pour toute la page. */
export function useScenesAplat(): Scenes | null {
  const [scenes, setScenes] = useState<Scenes | null>(null);
  useEffect(() => {
    let vivant = true;
    (chargement ??= import("./motion-aplat.genere")).then((s) => {
      if (vivant) setScenes(s);
    });
    return () => {
      vivant = false;
    };
  }, []);
  return scenes;
}

/**
 * Un film hors de l'écran s'arrête (`data-hors-ecran`, globals.css) : sur iPhone, Safari dessine les scènes SVG sur le
 * fil principal, et les films qui tournaient sans être vus faisaient tomber l'animation visible vers 40 images/s
 * (« mettre plus de FPS », Quentin, 05/10/2026). La pause passe par le CSS (animation-play-state) : toutes les
 * animations du film s'arrêtent et repartent au même instant, il reste donc synchronisé avec ses légendes.
 */
export function useHorsEcran(ref: RefObject<HTMLElement | null> | null) {
  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) el.removeAttribute("data-hors-ecran");
      else el.setAttribute("data-hors-ecran", "");
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/**
 * Une scène : son dessin SVG tel que la maquette l'a écrit (muet pour les lecteurs d'écran : le texte de la
 * carte ou la légende le dit), et ses styles, posés UNE fois dans la page (React les dédoublonne par `href`).
 * Tant que les scènes ne sont pas chargées, la place est tenue, dans la couleur du décor. `children` : ce qui se
 * pose par-dessus le dessin, comme les étiquettes d'étape (.aplat-et), synchronisées avec lui.
 */
export function SceneAplat({
  scenes,
  svg,
  className = "",
  children,
  suivreEcran = true,
}: {
  scenes: Scenes | null;
  svg: keyof Omit<Scenes, "CSS_APLAT">;
  className?: string;
  children?: ReactNode;
  /** `false` quand c'est l'enveloppe qui s'arrête hors de l'écran (le panneau du film, avec ses légendes). */
  suivreEcran?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useHorsEcran(suivreEcran ? ref : null);
  return (
    <>
      {scenes && (
        <style href="motion-aplat" precedence="medium">
          {scenes.CSS_APLAT}
        </style>
      )}
      <span ref={ref} className={`relative block ${className}`}>
        <span aria-hidden className="scene-aplat-dessin block h-full w-full" dangerouslySetInnerHTML={scenes ? { __html: scenes[svg] } : undefined} />
        {scenes && children}
      </span>
    </>
  );
}
