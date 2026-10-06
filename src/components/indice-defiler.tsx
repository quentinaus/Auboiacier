"use client";

import { useEffect, useState } from "react";

/**
 * En bas du premier écran de l'accueil, une souris dont la bille descend : on comprend qu'il y a une suite
 * (Quentin, 06/10/2026 : « on ne comprend pas qu'on peut faire descendre la page »). Elle s'efface dès qu'on défile ;
 * un clic descend jusqu'à la suite. Sans animation si le visiteur en a demandé moins (globals.css).
 */
export function IndiceDefiler({ cible, label }: { cible: string; label: string }) {
  const [parti, setParti] = useState(false);
  useEffect(() => {
    const surDefilement = () => setParti(window.scrollY > 40);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);
  return (
    <a
      href={`#${cible}`}
      aria-label={label}
      onClick={(e) => {
        const el = document.getElementById(cible);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="indice-defiler absolute bottom-5 left-1/2 z-10 -translate-x-1/2 p-3 text-white md:bottom-8"
      data-parti={parti ? "" : undefined}
    >
      {/* Une souris au contour blanc, et sa bille qui descend : le signe le plus connu de « faites défiler » (Quentin,
          06/10/2026 : la fine flèche n'était pas assez compréhensible). */}
      <span className="indice-souris" aria-hidden>
        <span className="indice-bille" />
      </span>
    </a>
  );
}
