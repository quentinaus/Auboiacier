"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { cleCreneau, libelleCreneau, type Creneau } from "@/lib/agenda";

const ACCENT = "#6d2c2c";

/**
 * Le choix d'une demi-journée pour la prise de cotes.
 * Les créneaux viennent du serveur, qui retire déjà ceux qui sont pris et
 * ceux que Quentin a bloqués. Une liste de jours, deux boutons par jour.
 */
export function ChoixCreneau({
  valeur,
  onChange,
  t,
  locale,
}: {
  valeur: string;
  onChange: (cle: string) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
}) {
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    fetch("/api/agenda/creneaux")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { creneaux: Creneau[] }) => {
        if (!annule) setCreneaux(json.creneaux);
      })
      .catch(() => {
        if (!annule) setErreur(true);
      });
    return () => {
      annule = true;
    };
  }, []);

  if (erreur) return <p className="text-xs text-[#6d2c2c]">{t.gcCreneauAucun}</p>;
  if (!creneaux) return <p className="text-xs text-[#6f6357]">{t.gcCreneauChargement}</p>;
  if (creneaux.length === 0) return <p className="text-xs text-[#6d2c2c]">{t.gcCreneauAucun}</p>;

  // Un jour par ligne, ses demi-journées en boutons.
  const parJour = new Map<string, Creneau[]>();
  for (const c of creneaux) parJour.set(c.date, [...(parJour.get(c.date) ?? []), c]);
  const jour = (date: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(`${date}T12:00:00Z`));

  const choisi = creneaux.find((c) => cleCreneau(c) === valeur);

  return (
    <div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-[#e5ddd3] bg-white">
        <ul className="divide-y divide-[#efe9df]">
          {[...parJour.entries()].map(([date, demis]) => (
            <li key={date} className="flex items-center gap-2 px-3 py-2">
              <span className="w-24 shrink-0 text-xs capitalize text-[#2a2116]">{jour(date)}</span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {(["matin", "apres-midi"] as const).map((demi) => {
                  const c = demis.find((d) => d.demi === demi);
                  if (!c) return null;
                  const cle = cleCreneau(c);
                  const actif = cle === valeur;
                  return (
                    <button
                      key={cle}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => onChange(actif ? "" : cle)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        actif
                          ? "border-[#6d2c2c] text-white"
                          : "border-[#e5ddd3] text-[#5c5140] hover:border-[#a3968a]"
                      }`}
                      style={actif ? { backgroundColor: ACCENT } : undefined}
                    >
                      {demi === "matin" ? t.gcCreneauMatin : t.gcCreneauApresMidi}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-[#5c5140]">
        {choisi
          ? t.gcCreneauChoisi.replace("{date}", libelleCreneau(choisi, locale))
          : t.gcCreneauManque}
      </p>
    </div>
  );
}
