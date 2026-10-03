"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { InfoBulle } from "./info-bulle";
import { QuiMesure, VisiteAtelier } from "./prise-de-cotes";
import { SchemaFenetre, NUMERO_COTE, type CoteFenetre } from "./schema-fenetre";
import {
  BORNES_RELEVE_GC,
  JOUR_GC_MM,
  lireReponsePrixGC,
  noteReleveGC,
  parametresPrixGC,
  type ModeleGC,
  type OptionsGC,
  type ReleveGC,
  type ReponsePrixGC,
} from "@/lib/garde-corps";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";
import { lireModeleGC } from "@/lib/garde-corps";

const ACCENT = "#2b2320";
/** Décision du 03/10 : plus de panneau de verre proposé — les modèles aux normes (croix, barreaux) le remplacent. */
const PROPOSER_VERRE: boolean = false;

/** Tout ce que le client décide sur sa fenêtre, tel qu'il le tape. */
export type CotesGardeCorps = {
  /** « moi » : le client mesure. « atelier » : Quentin vient mesurer. */
  qui: "moi" | "atelier";
  etage: string;
  /** ① La largeur de la fenêtre entre les murs. */
  largeur: string;
  /** ② Du sol au bas de la fenêtre. C'est d'elle qu'on déduit la hauteur du garde-corps. */
  allege: string;
  /** ③ De l'appui au haut de l'ouverture : le garde-corps doit tenir dedans. */
  fenetre: string;
  mur: string;
  codePostal: string;
  /** Le déplacement calculé par le serveur pour ce code postal, ou rien. */
  deplacement: Deplacement | null;
  /** Le créneau choisi : « 2026-09-23|matin ». */
  rdv: string;
  /** Le modèle choisi parmi ceux que la norme permet (« 16-5-b ») ; vide : celui que l'atelier conseille. */
  modele?: string;
};

export const COTES_GARDE_CORPS_VIDES: CotesGardeCorps = {
  // Mesurer soi-même d'abord : gratuit, et le prix tombe tout de suite.
  qui: "moi",
  etage: "",
  largeur: "",
  allege: "",
  fenetre: "",
  mur: "",
  codePostal: "",
  deplacement: null,
  rdv: "",
};

const mm = (valeur: string) => {
  const nombre = Number(valeur.replace(",", "."));
  return valeur.trim() !== "" && Number.isFinite(nombre) && nombre >= 0 ? Math.round(nombre) : NaN;
};

/** Ce que disent les cases : un relevé complet, ce qui manque, ou une cote hors de ce que l'atelier fabrique. */
export type LectureReleve =
  /** `manque` : « etage » quand les cotes sont là mais que le client n'a pas dit où est la fenêtre. */
  | { etat: "incomplet"; manque?: "etage" }
  | { etat: "hors-bornes"; raison: "trop-etroit" | "trop-large" | "allege" | "fenetre" }
  | { etat: "ok"; releve: ReleveGC };

/**
 * Le relevé, lu dans les cases. Les trois mesures sont demandées (la hauteur
 * de la fenêtre dit si le garde-corps tient dedans) ; tant que le client n'a
 * pas dit, on suppose l'étage : c'est le cas où la loi s'applique, mieux vaut
 * la montrer que la taire. Les bornes sont celles de l'outil de plans.
 */
export function lireReleve(cotes: CotesGardeCorps, t: Dictionary["artisanat"]): LectureReleve {
  const largeurMm = mm(cotes.largeur);
  const allegeMm = mm(cotes.allege);
  // La hauteur de la fenêtre est FACULTATIVE (décision du 03/10) : elle ne sert qu'au croquis et à
  // vérifier que le garde-corps tient dans l'ouverture. Vide : 0, « inconnue », comme dans l'outil.
  const fenetreMm = cotes.fenetre.trim() === "" ? 0 : mm(cotes.fenetre);
  if (!Number.isFinite(largeurMm) || largeurMm <= 0 || !Number.isFinite(allegeMm) || !Number.isFinite(fenetreMm)) {
    return { etat: "incomplet" };
  }
  // En étage ou au rez-de-chaussée : JAMAIS présélectionné (décision du 03/10). La norme en dépend ;
  // un choix fait d'avance passerait inaperçu, et le garde-corps serait calculé pour la mauvaise règle.
  if (!t.gcEtageOptions.includes(cotes.etage)) return { etat: "incomplet", manque: "etage" };
  const B = BORNES_RELEVE_GC;
  if (largeurMm < B.largeurMm.min) return { etat: "hors-bornes", raison: "trop-etroit" };
  if (largeurMm > B.largeurMm.max) return { etat: "hors-bornes", raison: "trop-large" };
  if (allegeMm > B.allegeMm.max) return { etat: "hors-bornes", raison: "allege" };
  if (fenetreMm > B.fenetreMm.max) return { etat: "hors-bornes", raison: "fenetre" };
  return {
    etat: "ok",
    releve: { largeurMm, allegeMm, enEtage: cotes.etage === t.gcEtageOptions[0], fenetreMm, ...(lireModeleGC(cotes.modele) ? { modele: cotes.modele } : {}) },
  };
}

/** Le prix du garde-corps, tel que le serveur le donne (/api/prix-garde-corps). */
export type EtatPrixGC =
  /** Il manque une cote. */
  | { statut: "attente" }
  /** La demande est partie ; `precedent`, la dernière réponse, reste dessinée en attendant. */
  | { statut: "calcul"; precedent: ReponsePrixGC | null }
  | { statut: "pret"; reponse: ReponsePrixGC }
  /** Le serveur ne peut pas chiffrer pour l'instant (503) : aucun prix plutôt qu'un prix faux. */
  | { statut: "indisponible" }
  /** Le réseau, trop de demandes, une réponse illisible. */
  | { statut: "erreur" };

/**
 * Demande le prix au serveur, quand la frappe marque une pause (400 ms) : pas
 * une demande par touche. Une réponse en retard pour un autre relevé est
 * ignorée. Le navigateur ne calcule rien : il lit la réponse, champ par champ.
 */
export function usePrixGardeCorps(releve: ReleveGC | null, options: OptionsGC): EtatPrixGC {
  const cle = releve ? parametresPrixGC(releve, options).toString() : "";
  const [resultat, setResultat] = useState<{ cle: string; etat: EtatPrixGC } | null>(null);
  const [dernier, setDernier] = useState<ReponsePrixGC | null>(null);
  useEffect(() => {
    if (!cle) return;
    let annule = false;
    const minuteur = setTimeout(async () => {
      let etat: EtatPrixGC;
      try {
        const r = await fetch(`/api/prix-garde-corps?${cle}`);
        const json = await r.json().catch(() => null);
        if (annule) return;
        const reponse = r.ok ? lireReponsePrixGC(json) : null;
        etat = reponse ? { statut: "pret", reponse } : r.status === 503 ? { statut: "indisponible" } : { statut: "erreur" };
        if (reponse) setDernier(reponse);
      } catch {
        if (annule) return;
        etat = { statut: "erreur" };
      }
      setResultat({ cle, etat });
    }, 400);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [cle]);
  if (!cle) return { statut: "attente" };
  if (resultat?.cle === cle) return resultat.etat;
  return { statut: "calcul", precedent: dernier };
}

/**
 * Ce que le client précise et qui doit arriver tel quel à l'atelier, sur le
 * bon de commande : la fenêtre, le mur. Une ligne, courte. Le jour sous le
 * cadre est celui que l'outil a retenu (la réponse du serveur). Le texte est
 * composé par noteReleveGC (src/lib/garde-corps.ts), que les tests lisent.
 */
export function noteGardeCorps(cotes: CotesGardeCorps, t: Dictionary["artisanat"], reponse?: ReponsePrixGC | null): string {
  return noteReleveGC(
    { etage: cotes.etage, mur: cotes.mur, allegeMm: mm(cotes.allege), fenetreMm: mm(cotes.fenetre), jourMm: reponse?.jourMm ?? 0 },
    t,
  );
}

/** La pastille numérotée devant une case : la même que sur le croquis. */
function Pastille({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border border-[#2a2116] text-[10px] font-bold leading-none text-[#2a2116]"
    >
      {n}
    </span>
  );
}

const SELECT =
  "h-10 w-[8.5rem] shrink-0 rounded-full border border-[#9a8d80] bg-white px-3.5 text-base text-[#2b2320] focus:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] sm:text-[15px]";

/**
 * Le relevé d'un garde-corps de fenêtre.
 *
 * D'abord la question qui décide de tout : qui mesure ? Si c'est l'atelier,
 * le client donne son code postal, voit le prix du déplacement, choisit une
 * demi-journée — et c'est la visite qu'il met au panier. Si c'est lui, le
 * croquis et les cases apparaissent, et le garde-corps suit sa frappe : la
 * hauteur à la norme, le nombre de croix, les barreaux du bas et le prix,
 * tels que l'outil de plans de l'atelier les calcule sur le serveur. Quand
 * la norme ne laisse pas faire ce modèle tel quel, on ne donne pas de prix :
 * « à étudier avec l'atelier ».
 */
export function ReleveGardeCorps({
  cotes,
  onChange,
  t,
  locale,
  lecture,
  prix,
  lienDevis,
  rosaceMm,
  schemaSlot,
  detailsSlot,
  verre,
}: {
  cotes: CotesGardeCorps;
  onChange: (cotes: CotesGardeCorps) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** Les cases, lues (lireReleve). */
  lecture: LectureReleve;
  /** Le prix et la forme, demandés au serveur (usePrixGardeCorps). */
  prix: EtatPrixGC;
  lienDevis?: string;
  /** Le diamètre de la rosace choisie, en millimètres, pour le croquis. */
  rosaceMm?: number;
  /**
   * L'emplacement du croquis, hors de la carte du configurateur : à côté
   * d'elle, en grand (voir schemaSlot dans product-view.tsx). Sans lui, le
   * croquis reste à sa place, au-dessus des cases.
   */
  schemaSlot?: HTMLDivElement | null;
  /**
   * Où la fiche dépose « Poids et détails » et « Ce que comprend le prix » : dans le cadre du
   * résultat, à côté de la carte (qui ne garde que les cotes et la livraison).
   */
  detailsSlot?: (element: HTMLDivElement | null) => void;
  /** Le verre feuilleté à la place des croix : une option, avec son supplément. */
  verre?: {
    surVerre: boolean;
    /** Le supplément du verre à ces cotes, ou null tant que la hauteur n'est pas connue. */
    supplement: number | null;
    choisir: () => void;
    revenir: () => void;
  };
}) {
  const idChamps = useId();
  const langue = locale === "en" ? "en-GB" : "fr-FR";
  const [coteActive, setCoteActive] = useState<CoteFenetre | null>(null);
  /** Le catalogue entier, modèles hors norme compris : fermé d'abord (on ne montre que ce qui se commande). */
  const [toutVoir, setToutVoir] = useState(false);

  const reponse = prix.statut === "pret" ? prix.reponse : null;
  /** Ce que le croquis dessine : la réponse, ou la dernière pendant qu'on recalcule. */
  const dessin = reponse ?? (prix.statut === "calcul" ? prix.precedent : null);
  const conforme = reponse?.ok ? reponse : null;
  const surVerre = verre?.surVerre === true;
  const releve = lecture.etat === "ok" ? lecture.releve : null;
  // Un modèle choisi pour d'autres cotes peut ne plus passer la norme : on revient à celui que l'atelier conseille.
  const modeleRefuse = Boolean(cotes.modele) && reponse !== null && !reponse.ok;
  useEffect(() => {
    if (modeleRefuse) onChange({ ...cotes, modele: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeleRefuse]);
  const nombre = (n: number) => n.toLocaleString(langue);
  const croixTexte = (n: number) => (n > 1 ? t.gcCroixPlusieurs.replace("{n}", String(n)) : t.gcCroixUne);
  const fr = locale === "fr";
  // Le catalogue : tous les dessins, chacun marqué « aux normes » ou non pour CETTE fenêtre.
  const modeles = reponse && !surVerre ? reponse.modeles : [];
  const hMax = Math.max(1, ...modeles.map((m) => m.hauteurMm));
  // Le garde-corps de la photo : deux croix, sans barreaux. La norme en demande parfois plus.
  // Le garde-corps de la photo : deux croix, sans barreaux. S'il n'est pas aux normes ici, on le dit.
  const adapte = modeles.length > 0 && !modeles.some((m) => m.conforme && m.croix === 2 && m.soubassementMm === 0);
  const choisi = modeles.find((m) => m.conforme && m.id === cotes.modele) ?? null;
  const nbConformes = modeles.filter((m) => m.conforme).length;
  const libelleModele = (m: { croix: number; soubassementMm: number }) =>
    `${croixTexte(m.croix)}${m.soubassementMm > 0 ? (fr ? ", barreaux en bas" : ", bars below") : ""}`;
  const pastille = (ok: boolean) => (
    <span
      aria-hidden
      className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ${ok ? "bg-[#2a7a3f]" : "bg-[#b5aca2]"}`}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
        {ok ? <path d="M4.5 10.5l3.5 3.5 7.5-8" /> : <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />}
      </svg>
    </span>
  );
  /**
   * Les modèles, toujours visibles sous le croquis — en petit, pour laisser la place au croquis :
   * avant les mesures (sans pastille), puis ceux qui sont aux normes pour la fenêtre ; un bouton
   * ouvre le catalogue entier, modèles hors norme compris.
   */
  const libelleCourt = (m: { croix: number; soubassementMm: number }) =>
    `${m.croix} ${fr ? "croix" : m.croix > 1 ? "crosses" : "cross"}${m.soubassementMm > 0 ? (fr ? " + barreaux" : " + bars") : ""}`;
  const catalogue = (
    <div id="modeles-gc" className="mt-3 scroll-mt-24 rounded-2xl border border-[#e0d6c8] bg-white/75 px-3 py-2.5 text-left">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[13px] font-medium leading-snug text-[#2b2320]">
          {modeles.length === 0
            ? fr
              ? "Nos modèles"
              : "Our models"
            : nbConformes === 0
              ? fr
                ? "Aucun de nos modèles n'est aux normes pour ces mesures."
                : "None of our models meets the standard for these measurements."
              : adapte
                ? fr
                  ? "Le modèle de la photo n'est pas aux normes ici. Choisissez parmi ceux-ci :"
                  : "The model in the photo is not to standard here. Choose among these:"
                : fr
                  ? "Choisissez votre modèle :"
                  : "Choose your model:"}
          {modeles.length === 0 && (
            <span className="ml-2 text-xs font-normal text-[#6f6357]">
              {fr ? "entrez vos mesures pour voir ceux qui sont aux normes" : "enter your measurements to see the ones to standard"}
            </span>
          )}
        </p>
        {modeles.length > 0 && nbConformes < modeles.length && (
          <button
            type="button"
            onClick={() => setToutVoir((v) => !v)}
            aria-expanded={toutVoir}
            className="text-xs font-medium text-[#2b2320] underline underline-offset-4 hover:no-underline"
          >
            {toutVoir
              ? fr
                ? "Seulement ceux aux normes"
                : "Only those to standard"
              : fr
                ? `Voir tout le catalogue (${modeles.length})`
                : `See the whole catalogue (${modeles.length})`}
          </button>
        )}
      </div>
      <div role="group" aria-label={fr ? "Modèles de garde-corps" : "Railing models"} className="mt-2 flex flex-wrap gap-1.5">
        {(modeles.length ? modeles.filter((m) => toutVoir || m.conforme) : MODELES_VITRINE).map((m) => {
          const actif = choisi?.id === m.id;
          const marque = modeles.length > 0;
          return (
            <button
              key={`${m.croix}-${m.soubassementMm > 0}`}
              type="button"
              aria-pressed={marque ? actif : undefined}
              aria-disabled={marque && !m.conforme}
              aria-label={`${libelleModele(m)}${marque ? (m.conforme ? ` — ${prixAffiche(m.prix, locale)}` : fr ? " — pas aux normes pour cette fenêtre" : " — not to standard for this window") : ""}`}
              title={marque && !m.conforme ? (fr ? "Pas aux normes pour cette fenêtre" : "Not to standard for this window") : libelleModele(m)}
              onClick={() => {
                if (!marque) document.getElementById(`${idChamps}-largeur`)?.focus();
                else if (m.conforme) onChange({ ...cotes, modele: m.id });
              }}
              className={`relative flex w-[96px] flex-col rounded-lg border bg-white px-1.5 pb-1.5 pt-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
                actif ? "border-[#2b2320] ring-2 ring-[#2b2320]" : "border-[#e0d6c8]"
              } ${marque && !m.conforme ? "cursor-not-allowed opacity-60" : "hover:border-[#2b2320]"}`}
            >
              {marque && pastille(m.conforme)}
              <MiniGardeCorps
                largeurMm={releve?.largeurMm ?? 1180}
                hauteurMm={m.hauteurMm}
                hMaxMm={marque ? hMax : 520}
                soubassementMm={m.soubassementMm}
                croix={m.croix}
              />
              <span className="mt-1 block text-[11px] font-medium leading-tight text-[#2b2320]">{libelleCourt(m)}</span>
              {marque && (
                <span className="block text-[11px] leading-tight tabular-nums text-[#6f6357]">
                  {m.conforme ? prixAffiche(m.prix, locale) : fr ? "pas aux normes" : "not to standard"}
                </span>
              )}
            </button>
          );
        })}
        {/* Un garde-corps à son style : une photo, et l'atelier répond. Toujours là, en dernière case. */}
        {lienDevis && (
          <Link
            href={lienDevis}
            className="relative flex w-[96px] flex-col rounded-lg border-2 border-dashed border-[#9a8d80] bg-white/60 px-1.5 pb-1.5 pt-2 text-left transition-colors hover:border-[#2b2320] hover:bg-white"
          >
            <span className="flex h-[40px] w-full items-center justify-center text-[#2b2320]">
              <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="M4 17l5-4.5 3.5 3 3-2.5L20 17" />
              </svg>
            </span>
            <span className="mt-1 block text-[11px] font-medium leading-tight text-[#2b2320]">{fr ? "Votre style" : "Your style"}</span>
            <span className="block text-[10px] leading-tight text-[#6f6357]">{fr ? "une photo, réponse sous 24 à 72 h" : "a photo, reply in 24 to 72 h"}</span>
          </Link>
        )}
      </div>
    </div>
  );

  const set = (champ: keyof CotesGardeCorps) => (valeur: string) =>
    onChange({ ...cotes, [champ]: valeur });

  /** Cliquer une cote sur le croquis amène le curseur dans sa case. */
  const allerA = (cote: CoteFenetre) => {
    setCoteActive(cote);
    document.getElementById(`${idChamps}-${cote}`)?.focus();
  };

  /**
   * Une ligne de cote : le numéro, l'intitulé et son « i » à gauche, la
   * saisie en pilule à droite. L'aide n'est plus écrite sous le champ : elle
   * est dans la bulle.
   */
  const ligne = (cote: "largeur" | "allege" | "fenetre", props: { label: string; aide?: string; info: string; placeholder: string }) => (
    <div className="py-3">
      <label className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2.5 text-[15px] leading-snug text-[#2b2320]">
          <Pastille n={NUMERO_COTE[cote]} />
          <InfoBulle texte={props.aide ? `${props.info} ${props.aide}` : props.info} label={t.gcInfoLabel} />
          {props.label}
        </span>
        <span className="flex h-10 w-[8.5rem] shrink-0 items-center gap-1 rounded-full border border-[#9a8d80] bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-[#2b2320] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]">
          <input
            id={`${idChamps}-${cote}`}
            inputMode="decimal"
            value={cotes[cote]}
            onChange={(e) => set(cote)(e.target.value)}
            placeholder={props.placeholder}
            onFocus={() => setCoteActive(cote)}
            onBlur={() => setCoteActive(null)}
            className="w-full min-w-0 bg-transparent text-right text-base tabular-nums text-[#2b2320] placeholder:text-[#726757] outline-none focus-visible:shadow-none focus-visible:outline-none sm:text-[15px]"
          />
          <span className="text-xs text-[#6f6357]">mm</span>
        </span>
      </label>
      {/* Taper la cote, ou la faire glisser : le même curseur que sur les tables. */}
      <input
        type="range"
        aria-label={props.label}
        min={CURSEURS[cote].min}
        max={CURSEURS[cote].max}
        step={5}
        value={Number.isFinite(mm(cotes[cote])) ? Math.min(CURSEURS[cote].max, Math.max(CURSEURS[cote].min, mm(cotes[cote]))) : CURSEURS[cote].depart}
        onChange={(e) => set(cote)(e.target.value)}
        onFocus={() => setCoteActive(cote)}
        onBlur={() => setCoteActive(null)}
        className="curseur-cote mt-2 block h-5 w-full cursor-pointer"
      />
    </div>
  );

  /** Le grand chiffre : le prix, « à étudier », « sur devis », ou un tiret. */
  const grandChiffre =
    lecture.etat === "hors-bornes"
      ? t.onQuote
      : conforme
        ? prixAffiche(conforme.prix, locale)
        : reponse && !reponse.ok
          ? t.gcAEtudierCourt
          : prix.statut === "calcul" && prix.precedent?.ok
            ? prixAffiche(prix.precedent.prix, locale)
            : "—";

  const lienEtude = lienDevis && (
    <Link href={lienDevis} className="font-medium underline underline-offset-4">
      {t.requestQuote}
    </Link>
  );

  return (
    <div
      /* Premier bloc de la carte du configurateur (schemaSlot) : pas de filet au-dessus. */
      className={
        schemaSlot
          ? "@container scroll-mt-28"
          : "@container mt-4 scroll-mt-28 border-t border-[#e5ddd3] pt-5"
      }
      id="cotes"
    >
      <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
        {t.gcTitle}
      </span>

      {/* 1. Qui mesure ? C'est la première question, elle décide de la suite. */}
      <div className="mt-3">
        <QuiMesure
          valeur={cotes.qui}
          onChange={(qui) => onChange({ ...cotes, qui })}
          t={t}
          notes={{ moi: t.gcQuiMoiNote, atelier: t.gcQuiAtelierNote }}
        />
      </div>

      {/* 2a. L'atelier vient : le code postal, le prix, la demi-journée. */}
      {cotes.qui === "atelier" && (
        <VisiteAtelier cotes={cotes} onChange={(visite) => onChange({ ...cotes, ...visite })} t={t} locale={locale} />
      )}

      {/* 2b. Le client mesure : le croquis, grand et nu, puis une ligne par
          cote, puis le résultat et son prix. Le texte s'efface : le dessin
          explique, les bulles « i » précisent. */}
      {cotes.qui === "moi" && (
        <>
          {(() => {
          const mainCourante = dessin?.mainCouranteMm ?? 1000;
          const croquis = (
            <SchemaFenetre
              className="absolute inset-0 h-full w-full"
              largeurMm={Number.isFinite(mm(cotes.largeur)) && mm(cotes.largeur) > 0 ? mm(cotes.largeur) : undefined}
              allegeMm={Number.isFinite(mm(cotes.allege)) ? mm(cotes.allege) : undefined}
              hauteurFenetreMm={Number.isFinite(mm(cotes.fenetre)) && mm(cotes.fenetre) > 0 ? mm(cotes.fenetre) : undefined}
              hauteurMm={dessin?.hauteurMm}
              jourMm={dessin?.jourMm ?? JOUR_GC_MM}
              croix={dessin?.ok ? dessin.croix : undefined}
              soubassementMm={dessin?.ok ? dessin.soubassementMm : 0}
              rosaceMm={rosaceMm}
              mainCouranteMm={mainCourante}
              remplissage={surVerre ? "verre" : "croix"}
              actif={coteActive}
              onChoisir={allerA}
              locale={locale}
              labels={{
                largeur: t.gcSchemaLargeur,
                allege: t.gcSchemaAllege,
                fenetre: t.gcSchemaFenetre,
                hauteur: t.gcSchemaHauteur,
                metre: t.gcSchemaMetre.replace("{m}", nombre(mainCourante)),
                interieur: t.gcSchemaInterieur,
                jour: t.gcSchemaJour,
              }}
            />
          );
          /* Dans la section « Configuration », le croquis va à côté de la
             carte, en grand ; sinon il reste ici, au-dessus des cases. */
          return schemaSlot
            ? createPortal(
                <>
                  <div className="relative mx-auto aspect-[4/5] max-h-[34svh] w-auto max-w-[320px] overflow-hidden rounded-xl md:max-h-[62vh] md:w-auto md:max-w-[560px]">
                    {croquis}
                  </div>
                  {catalogue}
                </>,
                schemaSlot
              )
            : (
              <div className="relative mx-auto mt-4 aspect-[4/5] w-full max-w-[400px] overflow-hidden rounded-xl">{croquis}</div>
            );
          })()}
          <p className="mt-2.5 text-xs leading-snug text-[#6f6357]">{t.gcConsigne}</p>

          <div className="mt-1 divide-y divide-[#e5ddd3]">
            {/* Des intitulés courts : sur téléphone, « Largeur de la fenêtre,
                entre les murs » tenait sur quatre lignes et chaque cote
                prenait un écran. L'explication complète reste dans la bulle
                « i », et le croquis numéroté juste au-dessus montre où mesurer. */}
            {ligne("largeur", { label: t.gcLargeurCourt, aide: `${t.gcLargeur}. ${t.gcLargeurAide}`, info: t.gcLargeurInfo, placeholder: "1180" })}
            {ligne("allege", { label: t.gcAllegeCourt, aide: `${t.gcAllege}. ${t.gcAllegeAide}`, info: t.gcAllegeInfo, placeholder: "850" })}
            {ligne("fenetre", { label: `${t.gcFenetreCourt} ${locale === "fr" ? "(facultatif)" : "(optional)"}`, aide: `${t.gcFenetre}. ${t.gcFenetreAide}`, info: t.gcFenetreInfo, placeholder: "1200" })}

            {/* En étage ou pas : deux boutons. L'intitulé AU-DESSUS et les
                boutons en pleine largeur : côte à côte, « Au rez-de-chaussée »
                débordait de la carte sur téléphone et écrasait l'intitulé sur
                trois lignes. */}
            <div className="py-3">
              <span className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
                <InfoBulle texte={t.gcEtageInfo} label={t.gcInfoLabel} />
                {t.gcEtage}
                {cotes.etage === "" && (
                  <span className="rounded-full bg-[#fbeeda] px-2 py-0.5 text-[11px] font-medium text-[#7a4510]">{fr ? "à choisir" : "to choose"}</span>
                )}
              </span>
              <div className={`mt-2 grid grid-cols-2 rounded-full border bg-white p-0.5 ${cotes.etage === "" ? "border-[#c98a3a]" : "border-[#9a8d80]"}`}>
                {t.gcEtageOptions.map((option) => {
                  const actifBouton = cotes.etage === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={actifBouton}
                      onClick={() => set("etage")(option)}
                      className={`rounded-full px-2 py-2 text-[13px] font-medium transition-colors ${
                        actifBouton ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Le mur, en option : ça décide des chevilles qu'on fournit. */}
            <label className="block py-3">
              <span className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
                <InfoBulle texte={t.gcMurInfo} label={t.gcInfoLabel} />
                {t.gcMur}
                <span className="text-xs text-[#6f6357]">{t.gcFacultatif}</span>
              </span>
              <select value={cotes.mur} onChange={(e) => set("mur")(e.target.value)} className={`${SELECT.replace("w-[8.5rem]", "w-full")} mt-2`}>
                <option value="">—</option>
                {t.gcMurOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Le résultat : le prix, la norme, le modèle choisi. À côté de la carte, sous le catalogue
              (la carte, à gauche, ne porte plus que les cotes et la livraison : elle était trop longue
              et la colonne de droite restait vide) ; sur téléphone, il reste ici. */}
          {(() => {
            const resultat = (
              <>
          {/* ④ Ce que ça donne, calculé par l'outil de l'atelier : les cotes,
              les croix, le prix, et la norme en une ligne. */}
          <div
            className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3"
            onMouseEnter={() => setCoteActive("hauteur")}
            onMouseLeave={() => setCoteActive(null)}
          >
            <div className="min-w-0">
              <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
                <Pastille n={NUMERO_COTE.hauteur} />
                {t.gcResultTitle}
              </span>
              {/* À côté de la carte, pas de prix en grand : il est déjà dans la barre d'achat, juste à gauche.
                  (Sans prix — « à étudier », « sur devis » — le mot reste : c'est lui l'information.) */}
              {!(schemaSlot && conforme) && (
                <p
                  className="mt-2 text-[28px] font-medium leading-none tabular-nums transition-colors"
                  style={{ color: conforme ? ACCENT : "#6f6357" }}
                >
                  {grandChiffre}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[#6f6357]">
                {releve && dessin
                  ? [
                      t.gcResume.replace("{l}", nombre(releve.largeurMm)).replace("{h}", nombre(dessin.hauteurMm)),
                      dessin.ok && !surVerre ? croixTexte(dessin.croix) : null,
                      conforme ? t.gcPrixCompris : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : prix.statut === "calcul"
                    ? t.gcCalcul
                    : t.gcAttente}
              </p>
            </div>

            <div className="w-full text-xs leading-snug sm:max-w-[17rem]">
              {lecture.etat === "hors-bornes" && (
                <p className="text-[#2b2320]" role="alert">
                  {lecture.raison === "trop-etroit"
                    ? t.gcTropEtroit.replace("{min}", nombre(BORNES_RELEVE_GC.largeurMm.min))
                    : lecture.raison === "trop-large"
                      ? t.gcHorsBareme.replace("{l}", nombre(BORNES_RELEVE_GC.largeurMm.max))
                      : t.gcAEtudier}{" "}
                  {lecture.raison !== "trop-etroit" && lienEtude}
                </p>
              )}
              {(prix.statut === "indisponible" || prix.statut === "erreur") && (
                <p className="text-[#2b2320]" role="alert">
                  {t.gcPrixIndisponible}
                </p>
              )}
              {/* La fenêtre est trop basse pour un encastré : sur devis, en applique. */}
              {reponse && !reponse.ok && reponse.raison === "fenetre-trop-basse" && releve && (
                <p className="text-[#2b2320]" role="alert">
                  {t.gcTropBasse
                    .replace("{m}", nombre(reponse.mainCouranteMm))
                    .replace("{f}", nombre(releve.allegeMm + releve.fenetreMm))}{" "}
                  {lienEtude}
                </p>
              )}
              {/* La norme ne laisse pas faire ce modèle tel quel (solidité, vides) : pas de prix, l'atelier étudie. */}
              {reponse && !reponse.ok && reponse.raison === "a-etudier" && (
                <div role="alert">
                  <p className="font-medium text-[#2b2320]">{t.gcAEtudierTitre}</p>
                  <p className="mt-1 text-[#5c5140]">
                    {reponse.alertes.includes("solidite") ? t.gcAEtudierSolidite : t.gcAEtudier} {lienEtude}
                  </p>
                </div>
              )}
              {conforme && (
                <>
                  <p className="flex items-center gap-1.5 font-medium text-[#2a6b3a]">
                    <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    {t.gcConforme}
                  </p>
                  <p className="mt-1 text-[#5c5140]">
                    {t.gcMainCourante
                      .replace("{m}", nombre(conforme.mainCouranteMm))
                      .replace("{j}", nombre(conforme.jourMm))}
                    {conforme.soubassementMm > 0 ? ` ${t.gcSoubassement}` : ""}
                  </p>
                  {PROPOSER_VERRE && verre && (
                    <p className="mt-1 text-[#5c5140]">
                      {surVerre ? (
                        <>
                          {t.gcSurVerre}{" "}
                          <button type="button" onClick={verre.revenir} className="font-medium text-[#2b2320] underline underline-offset-4">
                            {t.gcRevenirCroix}
                          </button>
                        </>
                      ) : (
                        verre.supplement !== null && (
                          <>
                            <button type="button" onClick={verre.choisir} className="text-left font-medium text-[#2b2320] underline underline-offset-4">
                              {t.gcPasserVerre.replace("{prix}", prixAffiche(verre.supplement, locale))}
                            </button>
                            <span className="mt-0.5 block text-[10px] leading-snug opacity-80">{t.gcPasserVerreNote}</span>
                          </>
                        )
                      )}
                    </p>
                  )}
                </>
              )}
              <p role="status" aria-live="polite" className="sr-only">
                {releve && conforme
                  ? `${releve.largeurMm} × ${conforme.hauteurMm} mm, ${croixTexte(conforme.croix)}. ${t.gcCalcule.replace("{m}", String(conforme.mainCouranteMm))} ${prixAffiche(conforme.prix, locale)}.`
                  : reponse && !reponse.ok
                    ? t.gcAEtudierTitre
                    : ""}
              </p>
            </div>
          </div>

          {/* Le modèle : on le choisit dans le catalogue (à côté du croquis ; ici même sur téléphone). */}
          {!schemaSlot && catalogue}
          {conforme && !surVerre && (
            <p className={`mt-4 rounded-xl px-3.5 py-2.5 text-[13px] leading-snug ${choisi ? "bg-[#e3efe4] text-[#1f5a2e]" : "bg-[#fbeeda] text-[#7a4510]"}`} role="status">
              {choisi
                ? `${fr ? "Modèle choisi" : "Chosen model"} : ${libelleModele(choisi)}${schemaSlot ? "" : ` — ${prixAffiche(choisi.prix, locale)}`}`
                : fr
                  ? "Dernière étape : choisissez votre modèle parmi ceux marqués « aux normes »."
                  : "Last step: choose your model among those marked “to standard”."}{" "}
              {!choisi && (
                <a href="#modeles-gc" className="font-medium underline underline-offset-4">
                  {fr ? "Voir les modèles" : "See the models"}
                </a>
              )}
            </p>
          )}
          {/* « Poids et détails », « Ce que comprend le prix » : la fiche les dépose ici (voir detailsSlot). */}
          {schemaSlot && detailsSlot && <div ref={detailsSlot} className="mt-3" />}

          <p className="mt-4 text-[11px] leading-snug text-[#726757]">{t.gcNote}</p>
              </>
            );
            return schemaSlot
              ? createPortal(<div className="mt-4 rounded-2xl border border-[#e0d6c8] bg-white/75 p-4 text-left md:p-5">{resultat}</div>, schemaSlot)
              : resultat;
          })()}
        </>
      )}
    </div>
  );
}


/** Les bornes des curseurs : celles que l'atelier fabrique (BORNES_RELEVE_GC), et où le curseur attend. */
const CURSEURS = {
  largeur: { min: BORNES_RELEVE_GC.largeurMm.min, max: BORNES_RELEVE_GC.largeurMm.max, depart: 1180 },
  allege: { min: 0, max: BORNES_RELEVE_GC.allegeMm.max, depart: 850 },
  fenetre: { min: 0, max: BORNES_RELEVE_GC.fenetreMm.max, depart: 1200 },
} as const;

/** Les dessins montrés AVANT les mesures : de 1 à 6 croix, seules puis avec barreaux, sur une fenêtre type. */
const MODELES_VITRINE: ModeleGC[] = [false, true].flatMap((b) =>
  [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `16-${n}${b ? "-b" : ""}`,
    conforme: false,
    croix: n,
    carre: 16,
    soubassementMm: b ? 150 : 0,
    hauteurMm: b ? 520 : 350,
    prix: 0,
    kg: 0,
  }))
);

/**
 * Le petit dessin d'un modèle, À L'ÉCHELLE de la fenêtre du client : le cadre,
 * ses croix à rosace, les barreaux du bas. Tous les dessins du catalogue ont
 * le même cadre de vue (largeur de la fenêtre × hauteur du plus haut modèle) :
 * un garde-corps deux fois plus haut est dessiné deux fois plus haut.
 */
function MiniGardeCorps({ largeurMm, hauteurMm, hMaxMm, soubassementMm, croix }: { largeurMm: number; hauteurMm: number; hMaxMm: number; soubassementMm: number; croix: number }) {
  const L = largeurMm, H = Math.max(hMaxMm, hauteurMm);
  const y0 = H - hauteurMm, haut = y0 + 40, bas = H;
  const lisse = soubassementMm > 0 ? bas - soubassementMm : bas;
  const pas = L / croix;
  const nb = Math.max(2, Math.round(L / 110));
  const trait = { vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg viewBox={`${-L * 0.02} ${-H * 0.03} ${L * 1.04} ${H * 1.06}`} preserveAspectRatio="xMidYMax meet" aria-hidden className="block h-[40px] w-full" fill="none" stroke="#2b2320" strokeWidth="1.5" strokeLinecap="round">
      <rect x={-L * 0.01} y={y0} width={L * 1.02} height="40" fill="#c9a36b" stroke="none" />
      <rect x="0" y={haut} width={L} height={bas - haut} {...trait} />
      {soubassementMm > 0 && <line x1="0" y1={lisse} x2={L} y2={lisse} {...trait} />}
      {Array.from({ length: croix }, (_, i) => {
        const x0 = i * pas, x1 = x0 + pas;
        return (
          <g key={i}>
            {i > 0 && <line x1={x0} y1={haut} x2={x0} y2={lisse} {...trait} />}
            <line x1={x0} y1={haut} x2={x1} y2={lisse} strokeWidth="1" {...trait} />
            <line x1={x0} y1={lisse} x2={x1} y2={haut} strokeWidth="1" {...trait} />
            <circle cx={(x0 + x1) / 2} cy={(haut + lisse) / 2} r={Math.min(50, pas / 6, (lisse - haut) / 4)} fill="#2b2320" stroke="none" />
          </g>
        );
      })}
      {soubassementMm > 0 &&
        Array.from({ length: nb - 1 }, (_, i) => {
          const x = ((i + 1) * L) / nb;
          return <line key={`b${i}`} x1={x} y1={lisse} x2={x} y2={bas} strokeWidth="0.9" {...trait} />;
        })}
    </svg>
  );
}
