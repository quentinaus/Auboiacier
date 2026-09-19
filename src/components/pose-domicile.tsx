"use client";

import { useEffect, useId, useState } from "react";
import type { Colis, Deplacement } from "@/lib/deplacement";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { prixAffiche } from "@/lib/ui";

/**
 * Le choix « livraison par transporteur » ou « l'atelier livre et pose », sur
 * la fiche d'une table. Les deux se paient selon le code postal : dès qu'il
 * est complet, le serveur (/api/deplacement?pour=livraison|pose) renvoie le
 * prix — la livraison compte aussi le colis (cotes du plateau) — et le
 * parent ajoute la ligne correspondante au panier avec la pièce. Le
 * navigateur ne calcule jamais un montant : /api/commande refait le calcul.
 */
export type ChoixPose = {
  /** true : l'atelier livre et pose ; false : livraison par transporteur. */
  voulue: boolean;
  codePostal: string;
  /** La réponse du serveur pour ce code postal et ce choix, ou null tant qu'elle manque. */
  deplacement: Deplacement | null;
};

export const POSE_INITIALE: ChoixPose = { voulue: false, codePostal: "", deplacement: null };

type Etat = "attente" | "calcul" | "ok" | "invalide" | "hors" | "loin" | "erreur";

export function PoseDomicile({
  choix,
  onChange,
  colis,
  t,
  locale,
}: {
  choix: ChoixPose;
  onChange: (choix: ChoixPose) => void;
  /** Les cotes du plateau, pour le poids du colis (livraison seule). */
  colis: Colis;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
}) {
  const idGroupe = useId();
  const idCp = useId();
  const [reponse, setReponse] = useState<{
    cp: string;
    voulue: boolean;
    etat: Etat;
    commune?: string;
    distanceKm?: number;
  } | null>(null);

  const codePostal = choix.codePostal.replace(/\s+/g, "");
  const cpComplet = /^\d{5}$/.test(codePostal);
  const cleColis = `${colis.longueurMm}x${colis.largeurMm}x${colis.epaisseurMm}`;

  /* Le prix, demandé au serveur dès qu'un code postal complet est tapé, et
     redemandé si le choix ou les cotes changent. Une réponse en retard pour
     un autre code postal est ignorée. */
  useEffect(() => {
    if (!cpComplet) return;
    let annule = false;
    const minuteur = setTimeout(() => {
      setReponse({ cp: codePostal, voulue: choix.voulue, etat: "calcul" });
      const requete = choix.voulue
        ? `/api/deplacement?cp=${codePostal}&pour=pose`
        : `/api/deplacement?cp=${codePostal}&pour=livraison&l=${colis.longueurMm}&w=${colis.largeurMm}&t=${colis.epaisseurMm}`;
      fetch(requete)
        .then(async (r) => {
          const json = await r.json().catch(() => ({}));
          if (annule) return;
          if (r.ok) {
            setReponse({ cp: codePostal, voulue: choix.voulue, etat: "ok" });
            onChange({ ...choix, deplacement: json as Deplacement });
          } else {
            setReponse({
              cp: codePostal,
              voulue: choix.voulue,
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
          if (!annule) setReponse({ cp: codePostal, voulue: choix.voulue, etat: "erreur" });
        });
    }, 350);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
    // Seuls le code postal, le choix et le colis déclenchent le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codePostal, cpComplet, choix.voulue, cleColis]);

  const etat: Etat = !cpComplet
    ? codePostal
      ? "invalide"
      : "attente"
    : reponse?.cp === codePostal && reponse.voulue === choix.voulue
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
            ? choix.voulue
              ? t.poseHors
              : t.livraisonHors
            : etat === "loin"
              ? t.poseLoin.replace("{commune}", reponse?.commune ?? "").replace("{km}", String(reponse?.distanceKm ?? ""))
              : etat === "erreur"
                ? t.poseErreur
                : dep
                  ? (choix.voulue ? t.posePrix : t.livraisonPrix)
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
        onClick={() => onChange({ ...choix, voulue, deplacement: null })}
        className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
          active ? "border-[#2b2320] bg-white" : "border-[#e5ddd3] bg-transparent hover:border-[#9a8d80]"
        }`}
      >
        <span className={`block text-sm ${active ? "font-medium text-[#2b2320]" : "text-[#2b2320]"}`}>{titre}</span>
        <span className="mt-1 block text-xs leading-snug text-[#6f6357]">{info}</span>
      </button>
    );
  };

  const invalide = etat === "invalide" || etat === "hors" || etat === "loin";

  return (
    <div className="mt-5 border-t border-[#e5ddd3] pt-5">
      <span id={idGroupe} className="block text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
        {t.poseTitle}
      </span>
      <div role="radiogroup" aria-labelledby={idGroupe} className="mt-4 flex gap-3">
        {carte(false, t.poseSeul, t.poseSeulInfo)}
        {carte(true, t.poseAtelier, t.poseAtelierInfo)}
      </div>

      <div className="mt-4">
        <label htmlFor={idCp} className="flex items-center justify-between gap-4">
          <span className="text-[15px] text-[#2b2320]">{t.poseCodePostal}</span>
          <span
            className={`flex h-10 w-[8.5rem] shrink-0 items-center rounded-full border bg-white px-3.5 transition-colors focus-within:border-[#2b2320] ${
              invalide ? "border-[#b4533a]" : "border-[#9a8d80]"
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
              aria-invalid={invalide}
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
    </div>
  );
}
