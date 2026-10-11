"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { cleCreneau, libelleCreneau, lireCreneau, type Creneau, type DemiJournee } from "@/lib/creneau";

/** « 2026-10-08 » → le jour de la semaine, lundi = 0 (le calendrier commence le lundi). */
function jourDeSemaine(date: string) {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}
const deux = (n: number) => String(n).padStart(2, "0");

/**
 * Le choix d'une demi-journée pour la prise de cotes : un vrai calendrier, puis le matin ou l'après-midi.
 *
 * C'était une liste qui défilait dans une case, deux petites pastilles par jour : « on ne comprend pas »
 * (Quentin, 05/10/2026). Un mois entier, les jours libres marqués d'un point, celui qu'on touche en plein ;
 * dessous, deux grands boutons. Les créneaux viennent du serveur, qui retire déjà ceux qui sont pris et
 * ceux que Quentin a bloqués.
 */
export function ChoixCreneau({
  valeur,
  onChange,
  t,
  locale,
  texteManque,
}: {
  valeur: string;
  onChange: (cle: string) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** La consigne tant que rien n'est choisi, si ce n'est pas celle du panier. */
  texteManque?: string;
}) {
  const fr = locale === "fr";
  const langue = fr ? "fr-FR" : "en-GB";
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [erreur, setErreur] = useState(false);
  /** Le jour touché dans le calendrier (même avant d'avoir choisi le matin ou l'après-midi). */
  const [jourVu, setJourVu] = useState<string | null>(null);
  /** Le mois affiché, « 2026-10 » ; par défaut, celui du jour touché ou du premier jour libre. */
  const [moisVu, setMoisVu] = useState<string | null>(null);

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

  if (erreur) return <p className="text-[13px] leading-snug text-[#2b2320]">{t.gcCreneauAucun}</p>;
  if (!creneaux)
    return <div className="h-[290px] animate-pulse rounded-2xl bg-[rgba(118,118,128,0.1)]" role="status" aria-label={t.gcCreneauChargement} />;
  if (creneaux.length === 0) return <p className="text-[13px] leading-snug text-[#2b2320]">{t.gcCreneauAucun}</p>;

  const libres = new Map<string, DemiJournee[]>();
  for (const c of creneaux) libres.set(c.date, [...(libres.get(c.date) ?? []), c.demi]);
  const choisi = lireCreneau(valeur);
  const choisiLibre = choisi && libres.get(choisi.date)?.includes(choisi.demi) ? choisi : null;
  const jour = jourVu ?? choisiLibre?.date ?? null;

  const moisListe = [...new Set(creneaux.map((c) => c.date.slice(0, 7)))].sort();
  const mois = moisVu && moisListe.includes(moisVu) ? moisVu : (jour?.slice(0, 7) ?? moisListe[0]);
  const iMois = moisListe.indexOf(mois);
  const [annee, m] = mois.split("-").map(Number);
  const nbJours = new Date(Date.UTC(annee, m, 0)).getUTCDate();
  const cases: (string | null)[] = [
    ...Array.from({ length: jourDeSemaine(`${mois}-01`) }, () => null),
    ...Array.from({ length: nbJours }, (_, i) => `${mois}-${deux(i + 1)}`),
  ];

  const titreMois = new Intl.DateTimeFormat(langue, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(annee, m - 1, 1)));
  // Le lundi 5 janvier 2026, puis les six jours suivants : les initiales de la semaine, dans la langue de la fiche.
  const initiales = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(langue, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5 + i))),
  );
  const jourLong = (date: string) =>
    new Intl.DateTimeFormat(langue, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  function toucherJour(date: string) {
    setJourVu(date);
    // Le matin ou l'après-midi déjà choisi suit le changement de jour, s'il est libre ce jour-là.
    const demi = choisi?.demi;
    onChange(demi && libres.get(date)?.includes(demi) ? cleCreneau({ date, demi }) : "");
  }

  const demis: { id: DemiJournee; libelle: string }[] = [
    { id: "matin", libelle: t.gcCreneauMatin },
    { id: "apres-midi", libelle: t.gcCreneauApresMidi },
  ];

  return (
    <div>
      <div className="rounded-2xl bg-white/85 p-3 shadow-[0_0_0_1px_rgba(43,35,32,0.07),0_8px_22px_-14px_rgba(43,35,32,0.3)]">
        <div className="flex items-center justify-between pl-1">
          <span className="text-[14px] font-semibold capitalize text-[#2b2320]">{titreMois}</span>
          <div className="flex">
            {[
              { pas: -1, label: fr ? "Mois précédent" : "Previous month", d: "M12.5 5 7.5 10l5 5" },
              { pas: 1, label: fr ? "Mois suivant" : "Next month", d: "M7.5 5l5 5-5 5" },
            ].map((f) => {
              const cible = moisListe[iMois + f.pas];
              return (
                <button
                  key={f.pas}
                  type="button"
                  aria-label={f.label}
                  disabled={!cible}
                  onClick={() => cible && setMoisVu(cible)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#2b2320] transition-colors hover:bg-[rgba(118,118,128,0.12)] disabled:text-[#d5ccc1] disabled:hover:bg-transparent"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
                    <path d={f.d} />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-7 text-center" aria-hidden>
          {initiales.map((l, i) => (
            <span key={i} className="pb-1 text-[11px] font-medium text-[#7a6f64]">
              {l}
            </span>
          ))}
        </div>
        <div key={mois} className="creneau-mois grid grid-cols-7 gap-y-0.5 text-center">
          {cases.map((date, i) => {
            if (!date) return <span key={`vide-${i}`} />;
            const n = Number(date.slice(8));
            if (!libres.has(date))
              return (
                <span key={date} className="mx-auto flex aspect-square w-full max-w-10 items-center justify-center text-[13.5px] tabular-nums text-[#7a6f64]">
                  {n}
                </span>
              );
            const actif = date === jour;
            return (
              <button
                key={date}
                type="button"
                aria-pressed={actif}
                aria-label={jourLong(date)}
                onClick={() => toucherJour(date)}
                className={`relative mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full text-[13.5px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2b2320] ${
                  actif ? "bg-[#2b2320] text-white" : "text-[#2b2320] hover:bg-[rgba(43,35,32,0.08)]"
                }`}
              >
                {n}
                {/* Le point dit « libre », sans légende à lire. */}
                {!actif && <span aria-hidden className="absolute bottom-[12%] h-1 w-1 rounded-full bg-[#b9874a]" />}
              </button>
            );
          })}
        </div>
      </div>

      {jour ? (
        <div key={jour} className="creneau-demis mt-3">
          <p className="pl-1 text-[13px] font-semibold first-letter:uppercase text-[#2b2320]">{jourLong(jour)}</p>
          <div role="radiogroup" aria-label={jourLong(jour)} className="mt-2 grid grid-cols-2 gap-2">
            {demis.map((d) => {
              const libre = libres.get(jour)?.includes(d.id) ?? false;
              const actif = libre && choisiLibre?.date === jour && choisiLibre.demi === d.id;
              const [nom, heures] = d.libelle.split(" · ");
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  disabled={!libre}
                  onClick={() => onChange(cleCreneau({ date: jour, demi: d.id }))}
                  className={`rounded-2xl px-3.5 py-2.5 text-left transition-[background-color,box-shadow,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
                    actif
                      ? "bg-[#2b2320] text-white shadow-[0_8px_18px_-10px_rgba(43,35,32,0.8)]"
                      : libre
                        ? "bg-white/85 text-[#2b2320] shadow-[0_0_0_1px_rgba(43,35,32,0.1)] hover:shadow-[0_0_0_1.5px_rgba(43,35,32,0.45)]"
                        : "text-[#7a6f64] shadow-[0_0_0_1px_rgba(43,35,32,0.06)]"
                  }`}
                >
                  <span className="block text-[14px] font-semibold leading-tight">{nom}</span>
                  <span className={`mt-0.5 block text-[12px] leading-tight ${actif ? "text-white/75" : libre ? "text-[#7a6f64]" : ""}`}>
                    {libre ? heures : fr ? "Complet" : "Booked"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-2.5 flex items-center gap-2 pl-1 text-[12.5px] leading-snug text-[#6f6357]">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9874a]" />
          {fr ? "Les jours marqués d'un point sont libres : touchez-en un." : "Days marked with a dot are free: tap one."}
        </p>
      )}

      <p role="status" aria-live="polite" className={`pl-1 text-[12.5px] leading-snug empty:hidden ${choisiLibre ? "mt-2.5 font-medium text-[#2f6b45]" : "mt-2.5 text-[#6f6357]"}`}>
        {choisiLibre ? `✓ ${t.gcCreneauChoisi.replace("{date}", libelleCreneau(choisiLibre, locale))}` : jour ? (texteManque ?? t.gcCreneauManque) : ""}
      </p>
    </div>
  );
}
