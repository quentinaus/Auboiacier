"use client";

import { useId } from "react";
import { SOURCES_CONNU, TEXTES_CONNU, lireConnu, type SourceConnu } from "@/lib/provenance";

/**
 * « Comment nous avez-vous connu ? » : un menu court, facultatif, rien de
 * coché d'avance. Le même dans les formulaires de devis et de rendez-vous,
 * dans « Me prévenir » et au panier ; chacun lui donne ses classes pour
 * garder son propre dessin (trait sous le champ, ou pilule).
 *
 * Deux façons de s'en servir : avec `name`, le menu part tout seul avec le
 * formulaire (FormData) ; avec `valeur` et `onChange`, le composant parent
 * garde la réponse et l'envoie lui-même.
 */
export function ChoixConnu({
  locale,
  name,
  valeur,
  onChange,
  classeLibelle,
  classeChamp,
  className,
}: {
  locale: "fr" | "en";
  name?: string;
  valeur?: SourceConnu | null;
  onChange?: (valeur: SourceConnu | null) => void;
  classeLibelle: string;
  classeChamp: string;
  className?: string;
}) {
  const id = useId();
  const textes = TEXTES_CONNU[locale];
  const controle = onChange ? { value: valeur ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(lireConnu(e.target.value)) } : { defaultValue: "" };
  return (
    <div className={className}>
      <label htmlFor={id} className={classeLibelle}>
        {textes.question}
      </label>
      <div className="relative">
        <select id={id} name={name} {...controle} className={`${classeChamp} cursor-pointer appearance-none pr-9`}>
          <option value="">{textes.aucune}</option>
          {SOURCES_CONNU.map((source) => (
            <option key={source.id} value={source.id}>
              {source[locale]}
            </option>
          ))}
        </select>
        {/* La flèche du menu : le champ natif est dessiné comme les autres, sans la sienne. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f6357]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
