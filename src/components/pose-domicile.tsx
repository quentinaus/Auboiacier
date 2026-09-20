"use client";

import { useEffect, useId, useState } from "react";
import type { Deplacement } from "@/lib/deplacement";
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
  demontee = false,
  livraisonSeule = false,
  infoSeul,
  t,
  locale,
}: {
  choix: ChoixPose;
  onChange: (choix: ChoixPose) => void;
  /** La pièce, ses cotes et sa quantité : le serveur en déduit le poids du colis (livraison seule). */
  colis: { slug: string; largeurMm?: number; hauteurMm?: number; epaisseurMm?: number; quantity?: number };
  /** Une table part démontée ; une autre pièce arrive prête à poser. */
  demontee?: boolean;
  /** La pièce ne se pose pas : pas de choix, la livraison par transporteur est la seule façon. */
  livraisonSeule?: boolean;
  /** Remplace le texte par défaut sous « Livraison par transporteur » (une pièce qui part démontée d'une façon qui lui est propre). */
  infoSeul?: string;
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
  const cleColis = `${colis.slug}:${colis.largeurMm ?? ""}x${colis.hauteurMm ?? ""}x${colis.epaisseurMm ?? ""}:${colis.quantity ?? 1}`;

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
        : `/api/deplacement?cp=${codePostal}&pour=livraison&slug=${encodeURIComponent(colis.slug)}${colis.largeurMm ? `&l=${colis.largeurMm}` : ""}${colis.hauteurMm ? `&w=${colis.hauteurMm}` : ""}${colis.epaisseurMm ? `&t=${colis.epaisseurMm}` : ""}&qty=${colis.quantity ?? 1}`;
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

  /**
   * Une carte par façon de livrer : le titre et une ligne, rien de plus. Le
   * détail de l'option retenue se lit une fois, sous les deux cartes — deux
   * paragraphes côte à côte faisaient un bloc de texte que personne ne lisait.
   */
  const carte = (voulue: boolean, titre: string, court: string) => {
    const active = choix.voulue === voulue;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange({ ...choix, voulue, deplacement: null })}
        className={`flex flex-1 items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
          active ? "border-[#2b2320] bg-white" : "border-[#e5ddd3] bg-transparent hover:border-[#9a8d80]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            active ? "border-[#2b2320]" : "border-[#9a8d80]"
          }`}
        >
          <span className={`h-2 w-2 rounded-full bg-[#2b2320] transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-snug text-[#2b2320]">{titre}</span>
          <span className="mt-1 block text-xs leading-snug text-[#6f6357]">{court}</span>
        </span>
      </button>
    );
  };

  const invalide = etat === "invalide" || etat === "hors" || etat === "loin";

  return (
    <div className="mt-5 border-t border-[#e5ddd3] pt-5">
      <span id={idGroupe} className="block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
        {livraisonSeule ? t.livraisonTitle : t.poseTitle}
      </span>
      {/* Une pièce qui ne se pose pas (une chaise) n'a rien à choisir : on
          saute le radiogroup à deux cartes, il n'y a qu'une façon de la
          recevoir. */}
      {!livraisonSeule && (
        <div role="radiogroup" aria-labelledby={idGroupe} className="mt-3 flex flex-col gap-2 sm:flex-row">
          {carte(false, t.poseSeul, t.poseSeulCourt)}
          {carte(true, t.poseAtelier, t.poseAtelierCourt)}
        </div>
      )}
      {/* Ce que l'option retenue veut dire, une fois. */}
      <p className="mt-3 text-xs leading-relaxed text-[#6f6357]">
        {livraisonSeule
          ? (infoSeul ?? t.poseSeulInfoPiece)
          : choix.voulue
            ? t.poseAtelierInfo
            : demontee
              ? t.poseSeulInfo
              : t.poseSeulInfoPiece}
      </p>

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
