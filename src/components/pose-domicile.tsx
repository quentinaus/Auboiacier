"use client";

import { useEffect, useId, useState } from "react";
import type { Deplacement } from "@/lib/deplacement";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { prixAffiche } from "@/lib/ui";

/**
 * Le choix « livraison seule » ou « l'atelier livre et pose », sur la fiche
 * d'une table. La livraison est comprise dans tous les cas ; la pose se paie
 * selon la distance depuis Saumur : dès qu'un code postal complet est tapé,
 * le serveur (/api/deplacement?pour=pose) renvoie le prix, et le parent
 * ajoute une ligne « pose » au panier avec la pièce. Le navigateur ne
 * calcule jamais un montant : /api/commande refait le même calcul.
 */
export type ChoixPose = {
  voulue: boolean;
  codePostal: string;
  /** La réponse du serveur pour ce code postal, ou null tant qu'elle manque. */
  deplacement: Deplacement | null;
};

export const POSE_INITIALE: ChoixPose = { voulue: false, codePostal: "", deplacement: null };

type Etat = "attente" | "calcul" | "ok" | "invalide" | "hors" | "loin" | "erreur";

export function PoseDomicile({
  choix,
  onChange,
  t,
  locale,
}: {
  choix: ChoixPose;
  onChange: (choix: ChoixPose) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
}) {
  const idGroupe = useId();
  const idCp = useId();
  const [reponse, setReponse] = useState<{
    cp: string;
    etat: Etat;
    commune?: string;
    distanceKm?: number;
  } | null>(null);

  const codePostal = choix.codePostal.replace(/\s+/g, "");
  const cpComplet = /^\d{5}$/.test(codePostal);

  /* Le prix, demandé au serveur dès qu'un code postal complet est tapé. Une
     réponse en retard pour un autre code postal est ignorée. */
  useEffect(() => {
    if (!choix.voulue || !cpComplet) return;
    let annule = false;
    const minuteur = setTimeout(() => {
      setReponse({ cp: codePostal, etat: "calcul" });
      fetch(`/api/deplacement?cp=${codePostal}&pour=pose`)
        .then(async (r) => {
          const json = await r.json().catch(() => ({}));
          if (annule) return;
          if (r.ok) {
            setReponse({ cp: codePostal, etat: "ok" });
            onChange({ ...choix, deplacement: json as Deplacement });
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
            onChange({ ...choix, deplacement: null });
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
    // Seuls le code postal et le choix déclenchent le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codePostal, cpComplet, choix.voulue]);

  const etat: Etat = !cpComplet
    ? codePostal
      ? "invalide"
      : "attente"
    : reponse?.cp === codePostal
      ? reponse.etat
      : "calcul";

  const dep = choix.deplacement;
  const message =
    etat === "attente"
      ? t.poseAttente
      : etat === "calcul"
        ? t.poseCalcul
        : etat === "invalide"
          ? t.poseInvalide
          : etat === "hors"
            ? t.poseHors
            : etat === "loin"
              ? t.poseLoin
                  .replace("{commune}", reponse?.commune ?? "")
                  .replace("{km}", String(reponse?.distanceKm ?? ""))
              : etat === "erreur"
                ? t.poseErreur
                : dep
                  ? t.posePrix
                      .replace("{commune}", dep.commune)
                      .replace("{prix}", prixAffiche(dep.montantCents / 100, locale))
                  : t.poseCalcul;

  const carte = (voulue: boolean, titre: string, info: string) => {
    const active = choix.voulue === voulue;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange({ ...choix, voulue, deplacement: voulue ? choix.deplacement : null })}
        className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
          active ? "border-[#2b2320] bg-white" : "border-[#e5ddd3] bg-transparent hover:border-[#9a8d80]"
        }`}
      >
        <span className={`block text-sm ${active ? "font-medium text-[#2b2320]" : "text-[#2b2320]"}`}>{titre}</span>
        <span className="mt-1 block text-xs leading-snug text-[#6f6357]">{info}</span>
      </button>
    );
  };

  return (
    <div className="mt-5 border-t border-[#e5ddd3] pt-5">
      <span id={idGroupe} className="block text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
        {t.poseTitle}
      </span>
      <div role="radiogroup" aria-labelledby={idGroupe} className="mt-4 flex gap-3">
        {carte(false, t.poseSeul, t.poseSeulInfo)}
        {carte(true, t.poseAtelier, t.poseAtelierInfo)}
      </div>

      {choix.voulue && (
        <div className="mt-4">
          <label htmlFor={idCp} className="flex items-center justify-between gap-4">
            <span className="text-[15px] text-[#2b2320]">{t.poseCodePostal}</span>
            <span
              className={`flex h-10 w-[8.5rem] shrink-0 items-center rounded-full border bg-white px-3.5 transition-colors focus-within:border-[#2b2320] ${
                etat === "invalide" || etat === "hors" || etat === "loin" ? "border-[#b4533a]" : "border-[#9a8d80]"
              }`}
            >
              <input
                id={idCp}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={choix.codePostal}
                onChange={(event) => onChange({ ...choix, codePostal: event.target.value, deplacement: null })}
                placeholder="49400"
                aria-describedby={`${idCp}-etat`}
                aria-invalid={etat === "invalide" || etat === "hors" || etat === "loin"}
                className="w-full min-w-0 bg-transparent text-right text-base tabular-nums text-[#2b2320] outline-none placeholder:text-[#726757]"
              />
            </span>
          </label>
          <p
            id={`${idCp}-etat`}
            role="status"
            aria-live="polite"
            className={`mt-2 text-xs leading-relaxed ${etat === "ok" ? "text-[#2b2320]" : "text-[#6f6357]"}`}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
