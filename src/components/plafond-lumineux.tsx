"use client";

import Image from "next/image";
import { HeroShaderBackground } from "./hero-shader-background";

/**
 * Le panneau, découpé : le cadre acier est opaque, la toile est un trou.
 * Le dégradé animé passe donc réellement à travers la membrane, comme la
 * lumière d'un plafond tendu.
 *
 * Les quatre sommets sont ceux de la vraie toile, relevés sur l'image.
 */
const TOILE = "polygon(65.49% 16.54%, 92.27% 51.84%, 39.48% 90.81%, 11.78% 66.42%)";

export function PlafondLumineux({
  className = "",
  alt,
}: {
  className?: string;
  /** Décrit la photo dans la langue de la page : elle est lue par Google et par les lecteurs d'écran. */
  alt: string;
}) {
  return (
    <div className={`relative aspect-[1307/816] w-full ${className}`}>
      {/* Halo : la lumière qui déborde autour du panneau. Dessiné en CSS —
          un second canvas se décalait du cadre dès qu'on l'agrandissait. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[6%] opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(255,240,214,0.85), rgba(255,240,214,0) 70%)",
        }}
      />

      {/* La toile éclairée, strictement dans les limites de la membrane. */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: TOILE }}>
        <HeroShaderBackground />
        {/* La membrane diffuse : elle adoucit et blanchit le dégradé. */}
        <div className="absolute inset-0 bg-white/15 mix-blend-screen" />
      </div>

      {/* Le cadre acier, par-dessus. */}
      <Image
        src="/images/plafond-cadre.png"
        alt={alt}
        fill
        /* Pas de « priority » : cette image est au milieu de la page, sous le
           titre et sous toute la grille du catalogue. Elle passait devant les
           vraies premières photos dans la file d'attente du navigateur. */
        sizes="(max-width: 768px) 100vw, 560px"
        className="pointer-events-none object-contain"
      />
    </div>
  );
}
