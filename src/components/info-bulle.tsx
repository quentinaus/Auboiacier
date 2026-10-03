"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

/** La largeur de la bulle, et la marge qu'elle garde avec les bords de l'écran. */
const LARGEUR = 256;
const MARGE = 8;

/**
 * Le petit « i » devant un intitulé : une phrase pour dire de quoi on parle,
 * qui s'ouvre au survol, au clic ou au clavier — et qu'un lecteur d'écran lit
 * comme la description de l'intitulé.
 *
 * La bulle est posée sur la page entière (portail vers <body>, position fixe),
 * pas dans la carte : dans une carte étroite, elle était coupée au bord de la
 * carte et on n'en lisait que le début. Elle reste toujours entière à l'écran.
 */
export function InfoBulle({ texte, label }: { texte: string; label: string }) {
  const [place, setPlace] = useState<CSSProperties | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const ouvert = place !== null;

  const ouvrir = () => {
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    const ecranL = document.documentElement.clientWidth;
    const ecranH = document.documentElement.clientHeight;
    const largeur = Math.min(LARGEUR, ecranL - 2 * MARGE);
    // Sous le « i », alignée sur lui, mais jamais hors de l'écran ; au-dessus quand il n'y a plus de place dessous.
    const left = Math.max(MARGE, Math.min(r.left, ecranL - largeur - MARGE));
    const dessous = ecranH - r.bottom >= 200 || r.top < 200;
    // La plus longue bulle fait une dizaine de lignes : elle ne dépasse jamais de l'écran (elle défile au besoin).
    setPlace({ left, width: largeur, maxHeight: `calc(100vh - ${2 * MARGE}px)`, overflowY: "auto", ...(dessous ? { top: r.bottom + 4 } : { bottom: ecranH - r.top + 4 }) });
  };
  const fermer = () => setPlace(null);

  // La bulle est fixe : dès que la page défile ou change de taille, elle ne serait plus sous son « i ».
  useEffect(() => {
    if (!ouvert) return;
    // (Sauf si c'est la bulle elle-même qui défile, quand elle est plus haute que l'écran.)
    const fermerAuDefilement = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('[role="tooltip"]')) return;
      setPlace(null);
    };
    window.addEventListener("scroll", fermerAuDefilement, true);
    window.addEventListener("resize", fermerAuDefilement);
    return () => {
      window.removeEventListener("scroll", fermerAuDefilement, true);
      window.removeEventListener("resize", fermerAuDefilement);
    };
  }, [ouvert]);

  return (
    <span className="relative inline-flex align-middle" onMouseEnter={ouvrir} onMouseLeave={fermer}>
      <button
        ref={bouton}
        type="button"
        aria-label={label}
        aria-expanded={ouvert}
        aria-describedby={ouvert ? id : undefined}
        onClick={() => (ouvert ? fermer() : ouvrir())}
        onBlur={fermer}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#8f8275] font-serif text-[11px] font-semibold italic leading-none text-[#6f6357] transition-colors hover:border-black hover:text-black focus-visible:border-[#2b2320]"
      >
        i
      </button>
      {place &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={place}
            className="fixed z-[70] rounded-lg border border-[#e5ddd3] bg-white px-3 py-2.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-[#5c5140] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]"
          >
            {texte}
          </span>,
          document.body
        )}
    </span>
  );
}
