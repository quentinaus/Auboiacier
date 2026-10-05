"use client";

import { useContext, useEffect, useEffectEvent, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { InfoBulle } from "./info-bulle";
import { ChoixCreneau } from "./choix-creneau";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";
import { RevenirAuChoix } from "./porte-qui-mesure";

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
  compact = false,
}: {
  valeur: Visite["qui"];
  onChange: (qui: Visite["qui"]) => void;
  t: Dictionary["artisanat"];
  /** Ce que chaque choix implique pour cette pièce-là. */
  notes: { moi: string; atelier: string };
  /** L'étiquette du bouton « je mesure » : « Prix immédiat » quand le prix tombe, « Gratuit » sinon. */
  tagMoi?: string;
  /**
   * Colonne étroite (le garde-corps sur grand écran) : UNE pilule segmentée, comme le choix d'épaisseur d'une table, avec des
   * noms courts ; l'étiquette de chaque choix passe dans sa bulle (title). Elle ne prend qu'une ligne.
   */
  compact?: boolean;
}) {
  const idQui = useId();
  const idNote = useId();
  /** Le choix s'est fait sur l'écran « Qui prend les mesures ? » (porte-qui-mesure.tsx) : on y retourne pour en changer. */
  const revenir = useContext(RevenirAuChoix);
  // La langue de la fiche, lue dans ses propres mots (le composant ne reçoit que le dictionnaire).
  const fr = /moi/i.test(t.gcQuiMoi);
  if (revenir) {
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-[14px] font-semibold leading-tight text-[#2b2320]">
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
              {valeur === "atelier" ? (
                <>
                  <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" />
                  <circle cx="12" cy="10" r="2.2" />
                </>
              ) : (
                <>
                  <rect x="3" y="8" width="18" height="8" rx="1.5" />
                  <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
                </>
              )}
            </svg>
            {/* Les noms courts de la pilule : la colonne est étroite, « moi-même » s'y coupait en deux. */}
            {valeur === "atelier" ? (fr ? "L'atelier mesure" : "We measure") : fr ? "Je mesure" : "I measure"}
          </span>
          <button
            type="button"
            data-revenir-choix
            onClick={revenir}
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium text-[#6f6357] underline-offset-4 hover:text-[#2b2320] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
          >
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M16 10H5M9 5.5 4.5 10 9 14.5" />
            </svg>
            {fr ? "Changer" : "Change"}
          </button>
        </div>
        <p id={idNote} className="note-qui mt-1.5 text-[12px] leading-snug text-[#6f6357]">
          {valeur === "atelier" ? notes.atelier : notes.moi}
        </p>
      </>
    );
  }
  const choix = [
    // L'atelier d'abord, et en sombre : celui qui découvre la page voit tout de suite qu'il n'a rien
    // à mesurer s'il ne veut pas. Deux boutons, pas un de plus.
    { id: "atelier", label: fr ? "L'atelier vient mesurer" : "The workshop measures", tag: fr ? "On s'occupe de tout" : "We handle everything" },
    { id: "moi", label: t.gcQuiMoi, tag: tagMoi ?? t.gcQuiMoiTag },
  ] as const;
  return (
    <>
      <span id={idQui} className="intitule-qui">
        <Intitule info={t.gcQuiInfo} infoLabel={t.gcInfoLabel}>
          {t.gcQui}
        </Intitule>
      </span>
      {compact ? (
        <div role="radiogroup" aria-labelledby={idQui} aria-describedby={idNote} className="mt-1.5 grid grid-cols-2 rounded-full border border-[#9a8d80] bg-white p-0.5">
          {choix.map((c) => {
            const actif = valeur === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={actif}
                title={[c.label, c.tag].filter(Boolean).join(" — ")}
                onClick={() => onChange(c.id)}
                className={`rounded-full px-1.5 py-1.5 text-[12px] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${actif ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"}`}
              >
                {c.id === "atelier" ? (fr ? "L'atelier mesure" : "We measure") : fr ? "Je mesure" : "I measure"}
              </button>
            );
          })}
        </div>
      ) : (
      <div role="group" aria-labelledby={idQui} className="mt-2 grid grid-cols-2 items-stretch gap-2">
        {choix.map((c) => {
          const actif = valeur === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={actif}
              aria-describedby={actif ? idNote : undefined}
              onClick={() => onChange(c.id)}
              /* CHOISI : plein sombre, comme tous les choix de la carte. Pas choisi : clair.
                 « L'atelier s'occupe de tout », pas choisi, est mis en avant d'un fond chaud et d'un
                 liseré — mais jamais en sombre : on croirait qu'il est déjà coché. */
              className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                actif
                  ? "choix-qui-actif border-[#2b2320] bg-[#2b2320] text-white"
                  : c.id === "atelier"
                    ? "border-[#c98a3a] bg-[#fdf3e3] hover:border-[#2b2320]"
                    : "border-[#e5ddd3] bg-white hover:border-[#a3968a]"
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
                className={`h-4 w-4 shrink-0 ${actif ? "text-white" : "text-[#2b2320]"}`}
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
                <span className={`block text-[13px] leading-tight ${actif ? "font-semibold text-white" : "font-medium text-[#2a2116]"}`}>
                  {/* Trait d'union insécable : « moi-même » ne se coupe pas en deux
                      lignes dans un bouton de la moitié d'une carte. */}
                  {c.label.replace(/-/g, "\u2011")}
                </span>
                {c.tag && (
                  <span
                    className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f6357]"
                    /* La carte du configurateur reteinte les petits titres (globals.css) : sur le bouton choisi, sombre, on impose le clair. */
                    style={actif ? { color: "rgba(255,255,255,0.82)" } : undefined}
                  >
                    {c.tag}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      )}
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
  question,
  recapSlot,
}: {
  cotes: Visite;
  onChange: (cotes: Visite) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** « Code postal de la fenêtre » par défaut ; un escalier dit « du chantier ». */
  labelCodePostal?: string;
  /** La première question : « Où se trouve la fenêtre ? » par défaut ; un escalier dit « le chantier ». */
  question?: string;
  /** Grand écran : où poser le récapitulatif de la visite (en tête de la colonne d'achat). */
  recapSlot?: HTMLElement | null;
}) {
  const idOu = useId();
  const idQuand = useId();
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
  /**
   * La réponse du serveur ne touche QU'AU déplacement. Elle arrive 350 ms et
   * un aller-retour après la frappe : entre-temps le client a pu choisir son
   * créneau. On part donc de l'état du moment (useEffectEvent lit les
   * dernières valeurs), jamais de celui du lancement — sinon le créneau
   * choisi s'effaçait.
   */
  const poserDeplacement = useEffectEvent((deplacement: Deplacement | null) => {
    onChange({ ...cotes, deplacement });
  });
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
            poserDeplacement(json as Deplacement);
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
            poserDeplacement(null);
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
  }, [codePostal, cpComplet, cotes.qui]);

  const visite: "attente" | "calcul" | "ok" | "invalide" | "hors" | "loin" | "erreur" = !cpComplet
    ? codePostal
      ? "invalide"
      : "attente"
    : reponse?.cp === codePostal
      ? reponse.etat
      : "calcul";

  const dep = cotes.deplacement;
  const fr = locale === "fr";
  /** Ce qui empêche la visite, dit tel quel (les mots du dictionnaire). */
  const probleme =
    visite === "invalide"
      ? t.gcVisiteInvalide
      : visite === "hors"
        ? t.gcVisiteHorsMetropole
        : visite === "loin"
          ? t.gcVisiteTropLoin.replace("{commune}", reponse?.commune ?? codePostal).replace("{km}", String(reponse?.distanceKm ?? ""))
          : visite === "erreur" || (visite === "ok" && !dep)
            ? t.gcVisiteErreur
            : null;
  const lieuFait = visite === "ok" && dep !== null;
  const creneau = lireCreneau(cotes.rdv);
  const detailPrix = !dep
    ? ""
    : dep.offre
      ? fr
        ? "Tarif unique jusqu'à 30 km de Saumur"
        : "Flat rate within 30 km of Saumur"
      : fr
        ? `${dep.routeAllerRetourKm} km aller-retour · ${dep.heures.toLocaleString(langue)} h de route`
        : `${dep.routeAllerRetourKm} km round trip · ${dep.heures.toLocaleString(langue)} h on the road`;

  return (
    <div className="mt-5 space-y-6">
      {/* ① Où : le code postal, et aussitôt la commune et le prix du déplacement. */}
      <section aria-labelledby={idOu}>
        <Etape id={idOu} n={1} fait={lieuFait} titre={question ?? (fr ? "Où se trouve la fenêtre\u00a0?" : "Where is the window?")} info={t.gcCodePostalInfo} infoLabel={t.gcInfoLabel} />
        <label className="mt-3 flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-[0_0_0_1px_rgba(43,35,32,0.1)] transition-shadow focus-within:shadow-[0_0_0_2px_#2b2320]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5 shrink-0 text-[#2b2320]">
            <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" />
            <circle cx="12" cy="10" r="2.2" />
          </svg>
          <span className="sr-only">{labelCodePostal ?? t.gcCodePostal}</span>
          <input
            value={cotes.codePostal}
            // Le déplacement ne s'efface que si le code postal change vraiment : une espace tapée en plus laissait
            // le même code, donc aucun nouveau calcul — et la visite restait sans prix.
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d\s]/g, "").slice(0, 6);
              onChange({ ...cotes, codePostal: v, deplacement: v.replace(/\s+/g, "") === codePostal ? cotes.deplacement : null });
            }}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={labelCodePostal ?? t.gcCodePostal}
            className="w-full min-w-0 bg-transparent text-[18px] font-medium tracking-[0.06em] tabular-nums text-[#2b2320] outline-none placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-[#7a6f64]"
          />
          {visite === "calcul" && <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[rgba(43,35,32,0.15)] border-t-[#2b2320]" />}
          {lieuFait && (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5 shrink-0 text-[#2f6b45]">
              <path d="M5 10.5l3.2 3.2L15 7" />
            </svg>
          )}
        </label>
        <div role="status" aria-live="polite" className="mt-2">
          {lieuFait && dep ? (
            <>
              <div key={dep.commune} className="visite-lieu flex items-center justify-between gap-3 rounded-2xl bg-[#2b2320] px-4 py-3 text-white">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-tight">{dep.commune}</p>
                  <p className="mt-1 text-[12px] leading-snug text-white/70">{detailPrix}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[17px] font-semibold leading-tight tabular-nums">{prixAffiche(dep.montantCents / 100, locale)}</p>
                  <p className="mt-0.5 text-[11px] text-white/60">{fr ? "la visite" : "the visit"}</p>
                </div>
              </div>
              <p className="mt-1.5 px-1 text-[11.5px] leading-snug text-[#6f6357]">{t.gcVisiteDeduite}</p>
            </>
          ) : probleme ? (
            <p className="flex gap-2 rounded-2xl bg-[#f8ebe2] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#7a3b1d]">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="mt-px h-4 w-4 shrink-0">
                <circle cx="10" cy="10" r="7.5" />
                <path d="M10 6v4.5M10 13.5v.2" />
              </svg>
              {probleme}
            </p>
          ) : (
            <p className="px-1 text-[12.5px] leading-snug text-[#6f6357]">
              {visite === "calcul" ? t.gcVisiteCalcul : fr ? "Le prix du déplacement depuis Saumur s'affiche aussitôt." : "The travel price from Saumur shows straight away."}
            </p>
          )}
        </div>
      </section>

      {/* ② Quand : un calendrier, puis le matin ou l'après-midi. */}
      <section aria-labelledby={idQuand}>
        <Etape id={idQuand} n={2} fait={creneau !== null} titre={`${t.gcCreneauTitre}${fr ? "\u00a0?" : "?"}`} info={t.gcCreneauInfo} infoLabel={t.gcInfoLabel} />
        <div className="mt-3">
          <ChoixCreneau valeur={cotes.rdv} onChange={(rdv) => onChange({ ...cotes, rdv })} t={t} locale={locale} />
        </div>
      </section>

      {recapSlot && createPortal(<RecapVisite deplacement={lieuFait ? dep : null} creneau={creneau} locale={locale} />, recapSlot)}
    </div>
  );
}

/** Le titre d'une étape de la réservation : son numéro, coché quand elle est faite. */
function Etape({ id, n, fait, titre, info, infoLabel }: { id: string; n: number; fait: boolean; titre: string; info: string; infoLabel: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
          fait ? "bg-[#2f6b45] text-white" : "bg-[#2b2320] text-white"
        }`}
      >
        {fait ? (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M5 10.5l3.2 3.2L15 7" />
          </svg>
        ) : (
          n
        )}
      </span>
      <h3 id={id} className="min-w-0 flex-1 text-[15px] font-semibold leading-tight text-[#2b2320]">
        {titre}
      </h3>
      <InfoBulle texte={info} label={infoLabel} />
    </div>
  );
}

/**
 * Grand écran : en tête de la colonne d'achat, ce que le client réserve — où, quand, combien. Chaque ligne
 * se remplit à mesure qu'il avance ; le bouton du panier, dessous, s'allume quand tout y est.
 */
function RecapVisite({ deplacement, creneau, locale }: { deplacement: Deplacement | null; creneau: ReturnType<typeof lireCreneau>; locale: "fr" | "en" }) {
  const fr = locale === "fr";
  const lignes = [
    { id: "ou", label: fr ? "Où" : "Where", valeur: deplacement?.commune ?? null, d: "M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11zM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" },
    { id: "quand", label: fr ? "Quand" : "When", valeur: creneau ? libelleCreneau(creneau, locale) : null, d: "M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4" },
    { id: "prix", label: fr ? "Visite" : "Visit", valeur: deplacement ? prixAffiche(deplacement.montantCents / 100, locale) : null, d: "M16.5 7.5A6 6 0 1 0 16.5 16.5M5 10.5h8M5 13.5h8" },
  ];
  return (
    <div className="pt-1">
      <p className="text-[17px] font-semibold leading-tight text-[#2b2320]">{fr ? "Votre visite" : "Your visit"}</p>
      <p className="mt-1 text-[12.5px] leading-snug text-[#6f6357]">
        {fr ? "L'atelier vient prendre les cotes chez vous, puis vous envoie le prix exact." : "The workshop comes to measure, then sends you the exact price."}
      </p>
      <dl className="mt-4 divide-y divide-[rgba(43,35,32,0.08)] rounded-2xl bg-white/75 px-3.5 shadow-[0_0_0_1px_rgba(43,35,32,0.06)]">
        {lignes.map((l) => (
          <div key={l.id} className="flex items-center gap-2.5 py-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`h-[18px] w-[18px] shrink-0 ${l.valeur ? "text-[#2b2320]" : "text-[#7a6f64]"}`}>
              <path d={l.d} />
            </svg>
            <dt className="text-[12.5px] text-[#7a6f64]">{l.label}</dt>
            <dd className={`min-w-0 flex-1 text-right text-[13.5px] leading-snug first-letter:uppercase ${l.valeur ? "font-semibold text-[#2b2320]" : "text-[#7a6f64]"}`}>
              {l.valeur ?? (fr ? "à choisir" : "to choose")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12px] leading-snug text-[#6f6357]">
        {fr ? "Nous confirmons l'heure exacte par téléphone la veille." : "We confirm the exact time by phone the day before."}
      </p>
    </div>
  );
}
