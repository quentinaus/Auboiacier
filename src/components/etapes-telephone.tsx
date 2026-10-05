"use client";

/**
 * Le garde-corps sur téléphone, en ÉTAPES (demande de Quentin, 05/10 : « mets-toi à la place du client sur téléphone,
 * le pauvre, il ne comprend rien »). Le croquis reste en haut ; dessous, UNE partie à la fois, en grand, avec une phrase
 * qui dit quoi faire et un bouton « Suivant ». Les parties sont celles de l'ordinateur : la colonne des mesures (en deux
 * temps : les cotes, puis la fenêtre), la rangée des modèles, la ligne des finitions, la colonne du prix.
 */

export const ETAPES_GC = [
  { fr: "Mesures", en: "Measures", consigneFr: "Mesurez votre fenêtre au mètre, en millimètres.", consigneEn: "Measure your window with a tape, in millimetres." },
  { fr: "Fenêtre", en: "Window", consigneFr: "Où est la fenêtre, et dans quel mur la fixer ?", consigneEn: "Where is the window, and what wall is it in?" },
  { fr: "Modèle", en: "Model", consigneFr: "Choisissez votre modèle : tous sont aux normes pour votre fenêtre.", consigneEn: "Choose your model: all of them meet the standard for your window." },
  { fr: "Finitions", en: "Finishes", consigneFr: "La couleur de l'acier, la main courante et la rosace.", consigneEn: "The steel colour, the handrail and the rosette." },
  { fr: "Prix", en: "Price", consigneFr: "Votre prix et la livraison : c'est prêt.", consigneEn: "Your price and delivery: you are done." },
] as const;

export const NB_ETAPES_GC = ETAPES_GC.length;

/** En haut, sous le croquis : les cinq étapes (on peut toucher n'importe laquelle), ce qu'il faut faire, et le prix. */
export function EnteteEtapes({
  etape,
  aller,
  locale,
  prixRef,
}: {
  etape: number;
  aller: (etape: number) => void;
  locale: "fr" | "en";
  /** Où la fiche écrit le prix (portail depuis product-options.tsx). */
  prixRef: (element: HTMLSpanElement | null) => void;
}) {
  const fr = locale === "fr";
  const courante = ETAPES_GC[etape - 1];
  return (
    <div className="order-2 shrink-0 md:hidden">
      <nav aria-label={fr ? "Étapes de la configuration" : "Configuration steps"}>
        <ol className="flex rounded-full bg-[rgba(118,118,128,0.16)] p-0.5">
          {ETAPES_GC.map((e, i) => {
            const n = i + 1;
            const active = n === etape;
            return (
              <li key={e.fr} className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => aller(n)}
                  className={`w-full truncate rounded-full px-1 py-1.5 text-[12px] font-semibold transition-colors ${
                    active ? "bg-white text-[#1d1d1f] shadow-[0_3px_8px_rgba(0,0,0,0.12)]" : n < etape ? "text-[#2b2320]" : "text-[#7a6f64]"
                  }`}
                >
                  {fr ? e.fr : e.en}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mt-1.5 flex items-baseline justify-between gap-3 px-1">
        <p className="min-w-0 text-[12.5px] leading-snug text-[#2b2320]">
          <span className="font-semibold">
            {fr ? `Étape ${etape} sur ${NB_ETAPES_GC}` : `Step ${etape} of ${NB_ETAPES_GC}`}
          </span>
          {" — "}
          {fr ? courante.consigneFr : courante.consigneEn}
        </p>
        <span ref={prixRef} className="shrink-0 text-[15px] font-semibold tabular-nums text-[#2b2320]" />
      </div>
    </div>
  );
}

/** Sous chaque étape : revenir, ou passer à la suivante (le bouton dit laquelle). */
export function NavEtape({ etape, aller, locale }: { etape: number; aller: (etape: number) => void; locale: "fr" | "en" }) {
  const fr = locale === "fr";
  const suivante = ETAPES_GC[etape];
  return (
    <div className="order-4 flex shrink-0 items-center gap-2 md:hidden">
      {etape > 1 && (
        <button
          type="button"
          onClick={() => aller(etape - 1)}
          className="rounded-full bg-white/70 px-4 py-3 text-[14px] font-medium text-[#2b2320] ring-1 ring-[#2b2320]/15"
        >
          {fr ? "← Retour" : "← Back"}
        </button>
      )}
      {suivante && (
        <button
          type="button"
          onClick={() => aller(etape + 1)}
          className="flex-1 rounded-full bg-[#1d1d1f] px-4 py-3 text-[15px] font-semibold text-white"
        >
          {fr ? `Suivant : ${suivante.fr} →` : `Next: ${suivante.en} →`}
        </button>
      )}
    </div>
  );
}
