"use client";

import { useEffect, useId, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ChampCote } from "./champ-cote";
import { InfoBulle } from "./info-bulle";
import { ChoixCreneau } from "./choix-creneau";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";

const ACCENT = "#6d2c2c";

/**
 * Ce qu'il faut à une visite de l'atelier, quelle que soit la pièce : qui
 * mesure, le code postal, le déplacement calculé par le serveur, le créneau.
 * Le garde-corps et l'escalier partagent ce bloc.
 */
export type Visite = {
  /** « moi » : le client mesure. « atelier » : Quentin vient mesurer. */
  qui: "moi" | "atelier";
  codePostal: string;
  /** Le déplacement calculé par le serveur pour ce code postal, ou rien. */
  deplacement: Deplacement | null;
  /** Le créneau choisi : « 2026-09-23|matin ». */
  rdv: string;
};

/** Un intitulé de sélecteur avec son « i » devant, comme les cases de cote. */
export function Intitule({ info, infoLabel, children }: { info: string; infoLabel: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">
      <InfoBulle texte={info} label={infoLabel} />
      {children}
    </span>
  );
}

/**
 * La première question : qui prend les cotes ? Deux cartes, le client ou
 * l'atelier — chaque pièce donne ses propres notes sous les titres.
 */
export function QuiMesure({
  valeur,
  onChange,
  t,
  notes,
  tagMoi,
}: {
  valeur: Visite["qui"];
  onChange: (qui: Visite["qui"]) => void;
  t: Dictionary["artisanat"];
  /** Ce que chaque choix implique pour cette pièce-là. */
  notes: { moi: string; atelier: string };
  /** L'étiquette de la carte « je mesure » : « Prix immédiat » quand le prix tombe, « Gratuit » sinon. */
  tagMoi?: string;
}) {
  const idQui = useId();
  return (
    <>
      <span id={idQui}>
        <Intitule info={t.gcQuiInfo} infoLabel={t.gcInfoLabel}>
          {t.gcQui}
        </Intitule>
      </span>
      <div role="group" aria-labelledby={idQui} className="mt-2 grid gap-2 @sm:grid-cols-2">
        {(
          [
            { id: "moi", label: t.gcQuiMoi, note: notes.moi, tag: tagMoi ?? t.gcQuiMoiTag },
            { id: "atelier", label: t.gcQuiAtelier, note: notes.atelier, tag: t.gcQuiAtelierTag },
          ] as const
        ).map((choix) => {
          const actif = valeur === choix.id;
          return (
            <button
              key={choix.id}
              type="button"
              aria-pressed={actif}
              onClick={() => onChange(choix.id)}
              className={`relative rounded-2xl border p-3.5 text-left transition-all ${
                actif
                  ? "border-[#6d2c2c] bg-white shadow-[0_10px_30px_-18px_rgba(109,44,44,0.45)] ring-1 ring-[#6d2c2c]"
                  : "border-[#e5ddd3] bg-white hover:border-[#a3968a]"
              }`}
            >
              {choix.tag && (
                <span
                  className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                    actif ? "bg-[#6d2c2c] text-white" : "bg-[#f1ece4] text-[#6d2c2c]"
                  }`}
                >
                  {choix.tag}
                </span>
              )}
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  actif ? "bg-[#6d2c2c] text-white" : "bg-[#f5f1ea] text-[#6d2c2c]"
                }`}
                aria-hidden
              >
                {choix.id === "atelier" ? (
                  /* Une épingle de carte : on vient chez vous. */
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" />
                    <circle cx="12" cy="10" r="2.2" />
                  </svg>
                ) : (
                  /* Un mètre ruban : vous mesurez. */
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <rect x="3" y="8" width="18" height="8" rx="1.5" />
                    <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
                  </svg>
                )}
              </span>
              <span className="mt-3 block text-[15px] font-medium leading-snug text-[#2a2116]">{choix.label}</span>
              <span className="mt-1.5 block text-[12px] leading-snug text-[#6f6357]">{choix.note}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/**
 * L'atelier vient : le code postal, le prix du déplacement (calculé par le
 * serveur dès que le code postal est complet), et la demi-journée.
 */
export function VisiteAtelier({
  cotes,
  onChange,
  t,
  locale,
  labelCodePostal,
}: {
  cotes: Visite;
  onChange: (cotes: Visite) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** « Code postal de la fenêtre » par défaut ; un escalier dit « du chantier ». */
  labelCodePostal?: string;
}) {
  const langue = locale === "en" ? "en-GB" : "fr-FR";
  /**
   * La réponse du serveur pour un code postal donné. On garde le code postal
   * avec elle : une réponse qui arrive en retard pour un autre code postal est
   * simplement ignorée.
   */
  const [reponse, setReponse] = useState<{
    cp: string;
    etat: "calcul" | "ok" | "hors" | "loin" | "invalide" | "erreur";
    /** Pour « trop loin » : où et à combien de kilomètres. */
    commune?: string;
    distanceKm?: number;
  } | null>(null);

  /* Le déplacement : demandé au serveur dès qu'un code postal complet est tapé. */
  const codePostal = cotes.codePostal.replace(/\s+/g, "");
  const cpComplet = /^\d{5}$/.test(codePostal);
  useEffect(() => {
    if (cotes.qui !== "atelier" || !cpComplet) return;
    let annule = false;
    const minuteur = setTimeout(() => {
      setReponse({ cp: codePostal, etat: "calcul" });
      fetch(`/api/deplacement?cp=${codePostal}`)
        .then(async (r) => {
          const json = await r.json().catch(() => ({}));
          if (annule) return;
          if (r.ok) {
            setReponse({ cp: codePostal, etat: "ok" });
            onChange({ ...cotes, deplacement: json as Deplacement });
          } else {
            setReponse({
              cp: codePostal,
              etat:
                json.error === "hors_metropole"
                  ? "hors"
                  : json.error === "trop_loin"
                    ? "loin"
                    : json.error === "code_postal_invalide"
                      ? "invalide"
                      : "erreur",
              commune: json.commune,
              distanceKm: json.distanceKm,
            });
            onChange({ ...cotes, deplacement: null });
          }
        })
        .catch(() => {
          if (!annule) setReponse({ cp: codePostal, etat: "erreur" });
        });
    }, 350);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
    // Seuls le code postal et le choix « qui mesure » déclenchent le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codePostal, cpComplet, cotes.qui]);

  const visite: "attente" | "calcul" | "ok" | "invalide" | "hors" | "loin" | "erreur" = !cpComplet
    ? codePostal
      ? "invalide"
      : "attente"
    : reponse?.cp === codePostal
      ? reponse.etat
      : "calcul";

  const dep = cotes.deplacement;
  const motVisite =
    visite === "attente"
      ? t.gcVisiteAttente
      : visite === "calcul"
        ? t.gcVisiteCalcul
        : visite === "invalide"
          ? t.gcVisiteInvalide
          : visite === "hors"
            ? t.gcVisiteHorsMetropole
            : visite === "loin"
              ? t.gcVisiteTropLoin
                  .replace("{commune}", reponse?.commune ?? codePostal)
                  .replace("{km}", String(reponse?.distanceKm ?? ""))
            : visite === "erreur" || !dep
              ? t.gcVisiteErreur
              : dep.offre
                ? t.gcVisiteOffre
                    .replace("{commune}", dep.commune)
                    .replace("{prix}", prixAffiche(dep.montantCents / 100, locale))
                : t.gcVisitePrix
                    .replace("{commune}", dep.commune)
                    .replace("{prix}", prixAffiche(dep.montantCents / 100, locale))
                    .replace("{km}", String(dep.routeAllerRetourKm))
                    .replace("{h}", dep.heures.toLocaleString(langue));


  return (
    <div className="mt-5">
      <div className="grid gap-3 @sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] @sm:items-start">
        <ChampCote
          label={labelCodePostal ?? t.gcCodePostal}
          info={t.gcCodePostalInfo}
          infoLabel={t.gcInfoLabel}
          valeur={cotes.codePostal}
          onChange={(v) => onChange({ ...cotes, codePostal: v, deplacement: null })}
          placeholder="49400"
          unite=""
        />
        <p
          className="text-xs leading-relaxed @sm:pt-6"
          style={{ color: visite === "ok" ? ACCENT : "#5c5140" }}
          role="status"
          aria-live="polite"
        >
          {motVisite}
          {visite === "ok" && (
            <span className="mt-1 block text-[11px] text-[#6f6357]">{t.gcVisiteDeduite}</span>
          )}
        </p>
      </div>

      <div className="mt-5">
        <Intitule info={t.gcCreneauInfo} infoLabel={t.gcInfoLabel}>
          {t.gcCreneauTitre}
        </Intitule>
        <div className="mt-2">
          <ChoixCreneau valeur={cotes.rdv} onChange={(rdv) => onChange({ ...cotes, rdv })} t={t} locale={locale} />
        </div>
      </div>
    </div>
  );
}
