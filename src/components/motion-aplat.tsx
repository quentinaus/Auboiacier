"use client";

import { useEffect, useState } from "react";

/**
 * Les scènes animées « en aplats » (motion-aplat.genere.ts, extraites de docs/motion-aplat/ par
 * scripts/extraire-motion-aplat.mjs) : environ 50 ko compressés, chargés à la demande, seulement là où une
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
 * Une scène : son dessin SVG tel que la maquette l'a écrit (muet pour les lecteurs d'écran : le texte de la
 * carte ou la légende le dit), et ses styles, posés UNE fois dans la page (React les dédoublonne par `href`).
 * Tant que les scènes ne sont pas chargées, la place est tenue, dans la couleur du décor.
 */
export function SceneAplat({ scenes, svg, className = "" }: { scenes: Scenes | null; svg: keyof Omit<Scenes, "CSS_APLAT">; className?: string }) {
  return (
    <>
      {scenes && (
        <style href="motion-aplat" precedence="medium">
          {scenes.CSS_APLAT}
        </style>
      )}
      <span aria-hidden className={`block ${className}`} dangerouslySetInnerHTML={scenes ? { __html: scenes[svg] } : undefined} />
    </>
  );
}
