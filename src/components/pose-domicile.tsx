"use client";

import { useEffect, useId, useState } from "react";
import type { Deplacement, ModeLivraison } from "@/lib/deplacement";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { prixAffiche } from "@/lib/ui";

/**
 * Comment recevoir la pièce, sur sa fiche : livraison par transporteur,
 * livraison et pose par l'atelier, ou retrait à l'atelier (à Saumur, sur
 * rendez-vous, gratuit — décision de Quentin du 29/09). Le transporteur et
 * la pose se paient selon le code postal : dès qu'il est complet, le serveur
 * (/api/deplacement?pour=livraison|pose) renvoie le prix — la livraison
 * compte aussi le colis — et le parent ajoute la ligne correspondante au
 * panier avec la pièce. Le navigateur ne calcule jamais un montant : le
 * panier et /api/commande refont le calcul (src/lib/tarif-panier.ts).
 */
export type ChoixPose = {
  mode: ModeLivraison;
  codePostal: string;
  /** La réponse du serveur pour ce code postal et ce choix, ou null tant qu'elle manque (et pour le retrait). */
  deplacement: Deplacement | null;
};

export const POSE_INITIALE: ChoixPose = { mode: "transporteur", codePostal: "", deplacement: null };

/** Le choix est complet : un prix connu, ou le retrait à l'atelier. */
export function livraisonPrete(choix: ChoixPose): boolean {
  return choix.mode === "retrait" || choix.deplacement !== null;
}

/** Ce que coûte ce choix, en euros (0 pour le retrait), ou null tant que le prix manque. */
export function montantLivraison(choix: ChoixPose): number | null {
  if (choix.mode === "retrait") return 0;
  return choix.deplacement ? choix.deplacement.montantCents / 100 : null;
}

type Etat = "attente" | "calcul" | "ok" | "invalide" | "hors" | "loin" | "erreur" | "piece";

/** Au-delà, on suggère la pose par l'atelier plutôt que le seul transporteur — même repère que le supplément hors gabarit. */
const KG_SUGGERE_POSE = 30;

/** Coupe un texte sur ses paires de « ** » (le poids du colis) et met le milieu en avant. */
function texteAvecGras(texte: string) {
  return texte
    .split("**")
    .map((morceau, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-[#2b2320]">
          {morceau}
        </strong>
      ) : (
        morceau
      )
    );
}

export function PoseDomicile({
  choix,
  onChange,
  colis,
  demontee = false,
  livraisonSeule = false,
  poseSeule = false,
  infoSeul,
  compact = false,
  pilule = false,
  t,
  locale,
}: {
  choix: ChoixPose;
  onChange: (choix: ChoixPose) => void;
  /**
   * La pièce est trop encombrante pour un transporteur : la pose par
   * l'atelier (ou le retrait à l'atelier) est la seule façon de la recevoir.
   * On n'affiche alors pas un choix qui n'en est pas un.
   */
  poseSeule?: boolean;
  /**
   * La pièce, telle que /api/deplacement la pèse (livraison par
   * transporteur) : les paramètres de l'adresse (slug, cotes ou relevé,
   * essence, remplissage, quantité). null : la pièce n'a pas encore de prix
   * (cotes incomplètes, garde-corps à étudier), le colis ne se pèse pas.
   */
  colis: string | null;
  /** Une table part démontée ; une autre pièce arrive prête à poser. */
  demontee?: boolean;
  /** La pièce ne se pose pas : pas de choix, la livraison par transporteur est la seule façon. */
  livraisonSeule?: boolean;
  /** Remplace le texte par défaut sous « Livraison par transporteur » (une pièce qui part démontée d'une façon qui lui est propre). */
  infoSeul?: string;
  /** Dans la carte du configurateur : serré, sans le paragraphe d'explication. */
  compact?: boolean;
  /**
   * Le garde-corps sur grand écran : les façons de recevoir la pièce en UNE pilule segmentée (comme le choix d'épaisseur d'une
   * table), le code postal sur une ligne, le prix dessous. La colonne d'achat ne défile pas (demande de Quentin).
   */
  pilule?: boolean;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
}) {
  const idGroupe = useId();
  const idCp = useId();
  const [reponse, setReponse] = useState<{
    cp: string;
    mode: ModeLivraison;
    etat: Etat;
    commune?: string;
    distanceKm?: number;
  } | null>(null);

  const codePostal = choix.codePostal.replace(/\s+/g, "");
  const cpComplet = /^\d{5}$/.test(codePostal);
  const pose = choix.mode === "pose";
  const retrait = choix.mode === "retrait";
  /** Le transporteur a besoin du colis ; la pose et le retrait, non. */
  const colisManquant = choix.mode === "transporteur" && colis === null;

  /* Le prix, demandé au serveur dès qu'un code postal complet est tapé, et
     redemandé si le choix ou le colis changent. Une réponse en retard pour
     un autre code postal est ignorée. Le retrait ne coûte rien : rien à demander. */
  useEffect(() => {
    if (!cpComplet || retrait || colisManquant) return;
    let annule = false;
    const minuteur = setTimeout(() => {
      setReponse({ cp: codePostal, mode: choix.mode, etat: "calcul" });
      const requete = pose
        ? `/api/deplacement?cp=${codePostal}&pour=pose`
        : `/api/deplacement?cp=${codePostal}&pour=livraison&${colis}`;
      fetch(requete)
        .then(async (r) => {
          const json = await r.json().catch(() => ({}));
          if (annule) return;
          if (r.ok) {
            setReponse({ cp: codePostal, mode: choix.mode, etat: "ok" });
            onChange({ ...choix, deplacement: json as Deplacement });
          } else {
            setReponse({
              cp: codePostal,
              mode: choix.mode,
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
          if (!annule) setReponse({ cp: codePostal, mode: choix.mode, etat: "erreur" });
        });
    }, 350);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
    // Seuls le code postal, le choix et le colis déclenchent le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codePostal, cpComplet, choix.mode, colis]);

  const etat: Etat = colisManquant
    ? "piece"
    : !cpComplet
      ? codePostal
        ? "invalide"
        : "attente"
      : reponse?.cp === codePostal && reponse.mode === choix.mode
        ? reponse.etat
        : "calcul";

  const dep = choix.deplacement;
  const message =
    etat === "piece"
      ? t.livraisonAttentePiece
      : etat === "attente"
        ? t.poseAttente
        : etat === "calcul"
          ? t.poseCalcul
          : etat === "invalide"
            ? t.poseInvalide
            : etat === "hors"
              ? pose
                ? t.poseHors
                : t.livraisonHors
              : etat === "loin"
                ? t.poseLoin.replace("{commune}", reponse?.commune ?? "").replace("{km}", String(reponse?.distanceKm ?? ""))
                : etat === "erreur"
                  ? t.poseErreur
                  : dep
                    ? (pose ? t.posePrix : t.livraisonPrix)
                        .replace("{commune}", dep.commune)
                        .replace("{prix}", prixAffiche(dep.montantCents / 100, locale))
                        .replace("{kg}", String(dep.kg ?? ""))
                    : t.poseCalcul;

  /** Les façons de recevoir cette pièce : le retrait à l'atelier est toujours possible. */
  const modes: ModeLivraison[] = [
    ...(poseSeule ? [] : (["transporteur"] as const)),
    ...(livraisonSeule ? [] : (["pose"] as const)),
    "retrait",
  ];
  const titreMode = (mode: ModeLivraison) => (mode === "transporteur" ? t.poseSeul : mode === "pose" ? t.poseAtelier : t.poseRetrait);
  const courtMode = (mode: ModeLivraison) => (mode === "transporteur" ? t.poseSeulCourt : mode === "pose" ? t.poseAtelierCourt : t.poseRetraitCourt);

  /**
   * Une carte par façon de livrer : le titre et une ligne, rien de plus. Le
   * détail de l'option retenue se lit une fois, sous les cartes — des
   * paragraphes côte à côte faisaient un bloc de texte que personne ne lisait.
   */
  const carte = (mode: ModeLivraison) => {
    const active = choix.mode === mode;
    const titre = titreMode(mode);
    const court = courtMode(mode);
    return (
      <button
        key={mode}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => {
          // Le mode déjà choisi : rien à refaire (le prix calculé ne doit pas être effacé sans être redemandé).
          if (mode !== choix.mode) onChange({ ...choix, mode, deplacement: null });
        }}
        className={`flex flex-1 items-start gap-3 rounded-2xl border px-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${compact ? "py-2.5" : "py-3.5"} ${
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
          {/* Serré : le titre suffit, le prix se lit sous le code postal. */}
          {!compact && <span className="mt-1 block text-xs leading-snug text-[#6f6357]">{court}</span>}
        </span>
      </button>
    );
  };

  const invalide = etat === "invalide" || etat === "hors" || etat === "loin";

  if (pilule) {
    const nomPilule = (mode: ModeLivraison) =>
      mode === "transporteur" ? t.livraisonCourt : mode === "pose" ? t.poseCourt : locale === "fr" ? "Retrait" : "Pick-up";
    return (
      <div className="scroll-mt-28" id="livraison">
        <span id={idGroupe} className="sr-only">
          {livraisonSeule ? t.livraisonTitle : t.poseTitle}
        </span>
        {/* La case du code postal AVANT les trois façons de recevoir la pièce : sur téléphone, c'est elle qu'on cherchait
            (Quentin, 10/10/2026), et elle doit se voir sans faire défiler. */}
        {!retrait && (
          <div className="mb-2">
            {/* Une vraie case à remplir, visible (Quentin, 10/10/2026 : « je ne vois pas l'endroit pour l'adresse ») : elle prend
                la largeur qui reste, bord marqué, « ex. 49400 » en exemple écrit à gauche. */}
            <label htmlFor={idCp} className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-[13px] text-[#2b2320]">{locale === "fr" ? "Votre code postal" : "Your postcode"}</span>
              <span
                className={`flex h-10 min-w-[8rem] flex-1 items-center rounded-xl bg-white px-3 shadow-[inset_0_1px_2px_rgba(43,35,32,0.06)] transition-colors focus-within:border-[#2b2320] ${
                  invalide ? "border-[1.5px] border-[#b4533a]" : choix.codePostal ? "border-[1.5px] border-[#2b2320]/40" : "border-[1.5px] border-[#2b2320]/60"
                }`}
              >
                <input
                  id={idCp}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={choix.codePostal}
                  onChange={(event) => onChange({ ...choix, codePostal: event.target.value, deplacement: null })}
                  placeholder={locale === "fr" ? "ex. 49400" : "e.g. 49400"}
                  aria-describedby={`${idCp}-etat`}
                  aria-invalid={invalide}
                  className="w-full min-w-0 bg-transparent text-[15px] tabular-nums text-[#2b2320] outline-none placeholder:text-[#726757]"
                />
              </span>
            </label>
            {/* Tant que le code postal n'est pas tapé, le champ suffit (le bouton d'achat dit quoi faire) : une ligne de moins. */}
            <p id={`${idCp}-etat`} role="status" aria-live="polite" className={`text-[11.5px] leading-snug ${etat === "attente" ? "sr-only" : "mt-1.5"} ${etat === "ok" ? "text-[#2b2320]" : "text-[#6f6357]"}`}>
              {texteAvecGras(message)}
            </p>
            {/* Une pièce lourde ou encombrante coûte cher en simple colis : on le dit tout de suite, aussi en pilule. */}
            {etat === "ok" && choix.mode === "transporteur" && (dep?.kg ?? 0) > KG_SUGGERE_POSE && !livraisonSeule && (
              <p className="mt-1 text-[11px] leading-snug text-[#9a5b3f]">{t.livraisonLourd}</p>
            )}
          </div>
        )}
        <div
          role="radiogroup"
          aria-labelledby={idGroupe}
          className="grid rounded-full border border-[#9a8d80] bg-white p-0.5"
          style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
        >
          {modes.map((mode) => {
            const actif = choix.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={actif}
                title={titreMode(mode)}
                onClick={() => {
                  // Le mode déjà choisi : rien à refaire (le prix calculé ne doit pas être effacé sans être redemandé).
                  if (!actif) onChange({ ...choix, mode, deplacement: null });
                }}
                className={`rounded-full px-1.5 py-1.5 text-[12px] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${actif ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"}`}
              >
                {nomPilule(mode)}
              </button>
            );
          })}
        </div>
        {poseSeule && !livraisonSeule && <p className="mt-1.5 text-[11px] leading-snug text-[#6f6357]">{t.poseObligatoire}</p>}
        {retrait && <p className="mt-1.5 text-[11.5px] leading-snug text-[#6f6357]">{t.poseRetraitInfo}</p>}
      </div>
    );
  }

  return (
    // id="livraison" : le bouton d'achat y renvoie quand le code postal
    // manque encore — scroll-mt-28 laisse la place de l'en-tête fixe.
    <div className={compact ? "scroll-mt-28" : "mt-5 scroll-mt-28 border-t border-[#e5ddd3] pt-5"} id="livraison">
      {/* Serré (dans un sous-menu qui porte déjà ce titre) : le titre ne se lit qu'au lecteur d'écran. */}
      <span id={idGroupe} className={compact ? "sr-only" : "block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]"}>
        {livraisonSeule ? t.livraisonTitle : t.poseTitle}
      </span>
      {/* Les façons de recevoir la pièce, une carte chacune : le retrait à
          l'atelier est toujours là. Une pièce trop encombrante pour un
          transporteur ne le propose pas, une chaise ne propose pas la pose. */}
      <div
        role="radiogroup"
        aria-labelledby={idGroupe}
        /* Trois cartes côte à côte ne tiennent pas dans la carte du configurateur : l'une sous l'autre. */
        className={`flex flex-col gap-2 ${modes.length < 3 ? "sm:flex-row" : ""} ${compact ? "" : "mt-3"}`}
      >
        {modes.map((mode) => carte(mode))}
      </div>
      {/* Pourquoi le transporteur a disparu : la raison reste affichée même en mode serré. */}
      {poseSeule && !livraisonSeule && <p className="mt-2 text-xs leading-snug text-[#6f6357]">{t.poseObligatoire}</p>}
      {/* Ce que l'option retenue veut dire, une fois. */}
      {(!compact || retrait) && (
      <p className="mt-3 text-xs leading-relaxed text-[#6f6357]">
        {retrait
          ? t.poseRetraitInfo
          : livraisonSeule
            ? (infoSeul ?? t.poseSeulInfoPiece)
            : pose
              ? t.poseAtelierInfo
              : demontee
                ? t.poseSeulInfo
                : t.poseSeulInfoPiece}
      </p>
      )}

      {!retrait && (
      <div className={compact ? "mt-3" : "mt-4"}>
        {/* Une vraie case à remplir, pas une ligne « Code postal : 49400 » (Quentin, 10/10/2026 : « je ne vois pas
            l'endroit pour l'adresse ») : la case prend toute la largeur qui reste, écrite à gauche, « ex. 49400 » en exemple. */}
        <label htmlFor={idCp} className="flex items-center justify-between gap-3">
          <span className="shrink-0 text-[15px] text-[#2b2320]">{t.poseCodePostal}</span>
          <span
            className={`flex h-10 min-w-[9rem] flex-1 items-center rounded-xl border-[1.5px] bg-white px-3.5 shadow-[inset_0_1px_2px_rgba(43,35,32,0.06)] transition-colors focus-within:border-[#2b2320] ${
              invalide ? "border-[#b4533a]" : choix.codePostal ? "border-[#2b2320]/40" : "border-[#2b2320]/60"
            }`}
          >
            <input
              id={idCp}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={choix.codePostal}
              onChange={(event) => onChange({ ...choix, codePostal: event.target.value, deplacement: null })}
              placeholder={locale === "fr" ? "ex. 49400" : "e.g. 49400"}
              aria-describedby={`${idCp}-etat`}
              aria-invalid={invalide}
              className="w-full min-w-0 bg-transparent text-base tabular-nums text-[#2b2320] outline-none placeholder:text-[#726757]"
            />
          </span>
        </label>
        <p
          id={`${idCp}-etat`}
          role="status"
          aria-live="polite"
          className={`mt-2 text-xs leading-relaxed ${etat === "ok" ? "text-[#2b2320]" : "text-[#6f6357]"}`}
        >
          {texteAvecGras(message)}
        </p>
        {/* Une pièce lourde ou encombrante coûte cher — voire refuse — en
            simple colis : on le dit tout de suite, pas seulement au moment
            de payer. */}
        {etat === "ok" && choix.mode === "transporteur" && (dep?.kg ?? 0) > KG_SUGGERE_POSE && !livraisonSeule && (
          <p className="mt-1.5 text-xs leading-relaxed text-[#9a5b3f]">{t.livraisonLourd}</p>
        )}
      </div>
      )}
    </div>
  );
}
