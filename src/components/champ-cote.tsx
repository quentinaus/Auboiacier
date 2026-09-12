"use client";

import { InfoBulle } from "./info-bulle";

/**
 * Une case de cote : intitulé, saisie, unité collée, et l'explication dessous.
 * Partagée par tous les relevés (escalier, garde-corps…) pour qu'ils aient la
 * même main.
 */
export function ChampCote({
  label,
  aide,
  valeur,
  onChange,
  placeholder,
  unite = "mm",
  info,
  infoLabel,
  onFocus,
  onBlur,
  id,
  avant,
}: {
  label: string;
  aide?: string;
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  unite?: string;
  /** Le petit « i » devant l'intitulé, et ce qu'il explique. */
  info?: string;
  infoLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Pour y amener le curseur depuis ailleurs (le croquis). */
  id?: string;
  /** Quelque chose devant l'intitulé : la pastille numérotée du croquis. */
  avant?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">
        {avant}
        {info && <InfoBulle texte={info} label={infoLabel ?? label} />}
        {label}
      </span>
      <span className="flex items-center gap-1 rounded-xl border border-[#e5ddd3] bg-white px-3 py-2.5 transition-[border-color,box-shadow] focus-within:border-[#6d2c2c] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]">
        <input
          id={id}
          inputMode="decimal"
          value={valeur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-base tabular-nums text-[#2a2116] outline-none focus-visible:shadow-none focus-visible:outline-none sm:text-sm"
        />
        <span className="text-xs text-[#6f6357]">{unite}</span>
      </span>
      {aide && <span className="text-[10px] leading-snug text-[#726757]">{aide}</span>}
    </label>
  );
}
