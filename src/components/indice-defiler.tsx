"use client";

import { useEffect, useState } from "react";

/**
 * En bas du premier écran de l'accueil : « Découvrir », et une souris dont la bille descend ; on comprend qu'il y a une
 * suite (Quentin, 06/10/2026 : « on ne comprend pas qu'on peut faire descendre la page »). Elle s'efface dès qu'on
 * défile ; un clic descend jusqu'à la suite. Et si le visiteur ne bouge pas pendant 3,5 s, la page sautille une fois :
 * elle remonte un peu, montre le haut de la suite, et retombe (Quentin, 07/10 : « toujours pas assez clair »).
 * Rien ne bouge si le visiteur a demandé moins d'animations (globals.css et la vérification ci-dessous).
 */
export function IndiceDefiler({ cible, label, mot }: { cible: string; label: string; mot: string }) {
  const [parti, setParti] = useState(false);
  useEffect(() => {
    const surDefilement = () => setParti(window.scrollY > 40);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  // La page qui sautille, une seule fois, seulement si personne n'a encore touché à rien.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let touche = false;
    const marquer = () => {
      touche = true;
    };
    const evenements = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;
    evenements.forEach((n) => window.addEventListener(n, marquer, { passive: true, once: true }));
    const minuteur = window.setTimeout(() => {
      const page = document.getElementById("contenu");
      if (touche || !page || window.scrollY > 10 || typeof page.animate !== "function") return;
      page.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-46px)", offset: 0.38 },
          { transform: "translateY(6px)", offset: 0.72 },
          { transform: "translateY(-2px)", offset: 0.86 },
          { transform: "translateY(0)" },
        ],
        { duration: 1100, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
      );
    }, 3500);
    return () => {
      window.clearTimeout(minuteur);
      evenements.forEach((n) => window.removeEventListener(n, marquer));
    };
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
      className="indice-defiler absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 p-3 text-white md:bottom-7"
      data-parti={parti ? "" : undefined}
    >
      <span aria-hidden className="text-[14px] font-medium tracking-[-0.005em] [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] md:text-[15px]">
        {mot}
      </span>
      {/* Une souris au contour blanc, et sa bille qui descend : le signe le plus connu de « faites défiler ». */}
      <span className="indice-souris" aria-hidden>
        <span className="indice-bille" />
      </span>
    </a>
  );
}
