"use client";

import { useEffect, useState } from "react";

/**
 * En bas du premier écran de l'accueil, une fine flèche qui glisse vers le bas : on comprend qu'il y a une suite
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-7 w-7 drop-shadow md:h-8 md:w-8">
        <path d="M5 9l7 7 7-7" />
      </svg>
    </a>
  );
}
