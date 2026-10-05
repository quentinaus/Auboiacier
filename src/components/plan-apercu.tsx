"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { lirePlanApercuGC, type PlanApercuGC } from "@/lib/garde-corps";

/**
 * LE PLAN D'APERÇU du garde-corps (demande de Quentin, 05/10/2026) : « utilise le Plan A3 de l'outil pour montrer au client le
 * plan de sa fenêtre — il fait professionnel — mais sans tous les codes pour le recréer lui-même ».
 *
 * Ce n'est PAS un dessin du site : c'est la feuille A3 que l'outil de plans de l'atelier dessine pour cette configuration
 * (/api/plan-garde-corps). En mode aperçu, l'outil en retire la liste de débit, le détail de fixation et le perçage, et pose
 * un filigrane. Le SVG ne s'affiche que dans une balise <img> : il n'exécute rien.
 */
type Etat = { statut: "charge" } | { statut: "ok"; plan: PlanApercuGC } | { statut: "erreur"; limite: boolean };

export function PlanApercu({ parametres, fr, onClose }: { parametres: URLSearchParams; fr: boolean; onClose: () => void }) {
  const idTitre = useId();
  const fermer = useRef<HTMLButtonElement>(null);
  const cle = parametres.toString();
  const [etat, setEtat] = useState<{ cle: string; valeur: Etat } | null>(null);

  useEffect(() => {
    fermer.current?.focus();
    const touche = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onClose]);

  useEffect(() => {
    const controle = new AbortController();
    fetch(`/api/plan-garde-corps?${cle}`, { signal: controle.signal })
      .then(async (r) => {
        if (!r.ok) return { statut: "erreur", limite: r.status === 429 } as Etat;
        const plan = lirePlanApercuGC(await r.json());
        return (plan ? { statut: "ok", plan } : { statut: "erreur", limite: false }) as Etat;
      })
      .catch((e) => (e instanceof DOMException && e.name === "AbortError" ? null : ({ statut: "erreur", limite: false } as Etat)))
      .then((valeur) => valeur && setEtat({ cle, valeur }));
    return () => controle.abort();
  }, [cle]);

  const courant: Etat = etat && etat.cle === cle ? etat.valeur : { statut: "charge" };
  const image = useMemo(
    () => (courant.statut === "ok" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(courant.plan.svg)}` : null),
    [courant],
  );
  const date = new Date().toLocaleDateString(fr ? "fr-FR" : "en-GB");

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2b2320]/55 p-3 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={idTitre} className="flex max-h-full w-[min(96vw,1240px)] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_-20px_rgba(43,35,32,0.6)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5ddd3] px-5 py-3">
          <div>
            <h2 id={idTitre} className="text-[16px] font-semibold text-[#2b2320]">{fr ? "Le plan de votre garde-corps" : "The drawing of your railing"}</h2>
            <p className="text-[12.5px] text-[#5c5140]">
              {fr ? "Aperçu aux cotes de votre fenêtre. Le plan d'atelier complet est établi par Auboiacier après votre commande." : "Preview at your window's dimensions. The full workshop drawing is made by Auboiacier after your order."}
            </p>
          </div>
          <button
            ref={fermer}
            type="button"
            onClick={onClose}
            aria-label={fr ? "Fermer" : "Close"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d6cbbd] text-[#2b2320] transition-colors hover:bg-[#f6f1ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
          >
            <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#f6f1ea] p-3 sm:p-4">
          {courant.statut === "ok" && image ? (
            // Largeur définie : sur Safari, une image dont le parent s'ajuste au contenu s'écrase.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={fr ? `Plan d'aperçu : garde-corps de ${courant.plan.largeurMm} mm, ${courant.plan.seuls ? "barreaux droits" : `${courant.plan.croix} croix`}, hauteur ${courant.plan.hauteurMm} mm` : `Preview drawing: ${courant.plan.largeurMm} mm railing, ${courant.plan.seuls ? "vertical bars" : `${courant.plan.croix} crosses`}, ${courant.plan.hauteurMm} mm high`}
              width={1188}
              height={840}
              className="mx-auto block h-auto bg-white shadow-[0_2px_14px_-6px_rgba(43,35,32,0.35)]"
              style={{ width: "min(100%, calc((100vh - 13rem) * 1.4141))", aspectRatio: "420 / 297" }}
            />
          ) : courant.statut === "erreur" ? (
            <p className="mx-auto max-w-md py-16 text-center text-[14px] text-[#5c5140]" role="alert">
              {courant.limite
                ? fr ? "Vous avez regardé beaucoup de plans : réessayez dans quelques minutes." : "You have viewed many drawings: please try again in a few minutes."
                : fr ? "Le plan n'a pas pu s'afficher. Réessayez dans un instant." : "The drawing could not be displayed. Please try again."}
            </p>
          ) : (
            <p className="py-16 text-center text-[14px] text-[#5c5140]" role="status">{fr ? "Dessin du plan…" : "Drawing the plan…"}</p>
          )}
        </div>
        <p className="border-t border-[#e5ddd3] px-5 py-2 text-[11.5px] leading-snug text-[#6f6357]">
          {fr ? `Aperçu non contractuel du ${date} : ni liste de débit, ni perçages, ni détails de fabrication.` : `Non-contractual preview of ${date}: no cutting list, no drilling, no manufacturing details.`}
        </p>
      </div>
    </div>,
    document.body,
  );
}
