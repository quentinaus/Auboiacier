"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { moinsDAnimations } from "@/lib/ui";

/**
 * Photo de fond qui glisse un peu moins vite que la page : l'effet de
 * profondeur des bandeaux de l'accueil.
 *
 * Le cadre (.parallaxe, globals.css) dépasse de 15 % en haut et en bas du
 * bloc qui le contient ; il se décale au plus de 10 % de sa hauteur, donc
 * aucun bord vide n'apparaît. Le bloc parent doit couper ce qui dépasse
 * (overflow-clip ou overflow-hidden). Rien ne bouge si le visiteur a demandé
 * moins d'animations.
 */
export function Parallaxe({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const bloc = el?.parentElement;
    if (!el || !bloc || moinsDAnimations()) return;

    let image = 0;
    const placer = () => {
      image = 0;
      const r = bloc.getBoundingClientRect();
      const h = window.innerHeight;
      if (r.bottom < 0 || r.top > h) return;
      // -1 quand le bloc entre par le bas, +1 quand il sort par le haut.
      const avance = 1 - (2 * (r.bottom)) / (h + r.height);
      el.style.transform = `translate3d(0, ${(avance * 10).toFixed(2)}%, 0)`;
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(placer);
    };
    placer();
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    return () => {
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      if (image) cancelAnimationFrame(image);
    };
  }, []);

  return (
    <div ref={ref} className="parallaxe">
      {children}
    </div>
  );
}
