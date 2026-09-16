"use client";

import { useId, useState } from "react";

/**
 * Le petit « i » devant un intitulé : une phrase pour dire de quoi on parle,
 * qui s'ouvre au survol, au clic ou au clavier — et qu'un lecteur d'écran lit
 * comme la description de l'intitulé.
 */
export function InfoBulle({ texte, label }: { texte: string; label: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={ouvert}
        aria-describedby={ouvert ? id : undefined}
        onClick={() => setOuvert((o) => !o)}
        onBlur={() => setOuvert(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#8f8275] font-serif text-[11px] font-semibold italic leading-none text-[#6f6357] transition-colors hover:border-[#6d2c2c] hover:text-[#6d2c2c] focus-visible:border-[#6d2c2c]"
      >
        i
      </button>
      {ouvert && (
        <span
          role="tooltip"
          id={id}
          className="absolute left-0 top-[28px] z-30 w-64 rounded-lg border border-[#e5ddd3] bg-white px-3 py-2.5 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-[#5c5140] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]"
        >
          {texte}
        </span>
      )}
    </span>
  );
}
