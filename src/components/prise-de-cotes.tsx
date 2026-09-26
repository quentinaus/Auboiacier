"use client";

import { useEffect, useId, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ChampCote } from "./champ-cote";
import { InfoBulle } from "./info-bulle";
import { ChoixCreneau } from "./choix-creneau";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";

const ACCENT = "#2b2320";

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
 * La première question : qui prend les cotes ? Deux boutons côte à côte, et
 * sous eux, UNE phrase — celle du choix en cours.
 *
 * C'étaient deux grandes cartes empilées, chacune avec son rond d'icône, son
 * titre et deux lignes d'explication : près de la moitié d'un écran de
 * téléphone pour une question à deux réponses, et le prix passait en dessous
 * de la ligne de flottaison. L'atelier les a trouvées trop encombrantes.
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
  /** L'étiquette du bouton « je mesure » : « Prix immédiat » quand le prix tombe, « Gratuit » sinon. */
  tagMoi?: string;
}) {
  const idQui = useId();
  const idNote = useId();
  const choix = [
    { id: "moi", label: t.gcQuiMoi, tag: tagMoi ?? t.gcQuiMoiTag },
    { id: "atelier", label: t.gcQuiAtelier, tag: t.gcQuiAtelierTag },
  ] as const;
  return (
    <>
      <span id={idQui}>
        <Intitule info={t.gcQuiInfo} infoLabel={t.gcInfoLabel}>
          {t.gcQui}
        </Intitule>
      </span>
      <div role="group" aria-labelledby={idQui} className="mt-2 grid grid-cols-2 gap-2">
        {choix.map((c) => {
          const actif = valeur === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={actif}
              aria-describedby={actif ? idNote : undefined}
              onClick={() => onChange(c.id)}
              className={`flex min-h-12 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left transition-colors ${
                actif ? "border-[#2b2320] ring-1 ring-[#2b2320]" : "border-[#e5ddd3] hover:border-[#a3968a]"
              }`}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-[#2b2320]"
              >
                {c.id === "atelier" ? (
                  /* Une épingle de carte : on vient chez vous. */
                  <>
                    <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" />
                    <circle cx="12" cy="10" r="2.2" />
                  </>
                ) : (
                  /* Un mètre ruban : vous mesurez. */
                  <>
                    <rect x="3" y="8" width="18" height="8" rx="1.5" />
                    <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
                  </>
                )}
              </svg>
              <span className="min-w-0">
                <span className={`block text-[13px] leading-tight text-[#2a2116] ${actif ? "font-semibold" : "font-medium"}`}>
                  {/* Trait d'union insécable : « moi-même » ne se coupe pas en deux
                      lignes dans un bouton de la moitié d'une carte. */}
                  {c.label.replace(/-/g, "\u2011")}
                </span>
                {c.tag && (
                  <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f6357]">
                    {c.tag}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {/* Une seule explication, celle du choix fait : deux paragraphes côte à
          côte se lisaient comme un tableau à comparer, pas comme une réponse. */}
      <p id={idNote} className="mt-2 text-[12px] leading-snug text-[#6f6357]">
        {valeur === "atelier" ? notes.atelier : notes.moi}
      </p>
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
