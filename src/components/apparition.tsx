"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Bloc qui monte doucement à l'écran la première fois qu'on le voit.
 *
 * La feuille de style (« Apparitions au défilement », globals.css) cache le
 * bloc tant qu'il n'est pas vu, seulement si le visiteur n'a pas demandé
 * moins d'animations ; sans JavaScript, la balise <noscript> du gabarit le
 * montre directement. Une fois apparu, il ne repart plus.
 *
 * `retard` décale l'apparition (en millisecondes) pour que des tuiles voisines
 * arrivent l'une après l'autre plutôt qu'en bloc.
 */
export function Apparition({
  children,
  retard = 0,
  className = "",
}: {
  children: ReactNode;
  retard?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.vu = "";
      return;
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          el.dataset.vu = "";
          obs.disconnect();
        }
      },
      // Déclenché un peu avant que le bloc n'entre vraiment : il a fini de
      // monter quand l'œil arrive dessus.
      { rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-apparition=""
      className={className}
      style={retard ? { transitionDelay: `${retard}ms` } : undefined}
    >
      {children}
    </div>
  );
}
