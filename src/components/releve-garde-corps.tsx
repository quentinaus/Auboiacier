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
  | { etat: "incomplet" }
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
  const B = BORNES_RELEVE_GC;
  if (largeurMm < B.largeurMm.min) return { etat: "hors-bornes", raison: "trop-etroit" };
  if (largeurMm > B.largeurMm.max) return { etat: "hors-bornes", raison: "trop-large" };
  if (allegeMm > B.allegeMm.max) return { etat: "hors-bornes", raison: "allege" };
  if (fenetreMm > B.fenetreMm.max) return { etat: "hors-bornes", raison: "fenetre" };
  return {
    etat: "ok",
    releve: { largeurMm, allegeMm, enEtage: cotes.etage !== t.gcEtageOptions[1], fenetreMm, ...(lireModeleGC(cotes.modele) ? { modele: cotes.modele } : {}) },
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
  const fr = locale === "fr";
  const modeles = conforme && !surVerre ? conforme.modeles : [];
  // Le garde-corps de la photo : deux croix, sans barreaux. La norme en demande parfois plus.
  const adapte = modeles.length > 0 && (modeles[0].soubassementMm > 0 || modeles[0].croix > 2 || modeles[0].carre !== 16);
  const nombre = (n: number) => n.toLocaleString(langue);
  const croixTexte = (n: number) => (n > 1 ? t.gcCroixPlusieurs.replace("{n}", String(n)) : t.gcCroixUne);

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
    <label className="flex flex-wrap items-center justify-between gap-x-4 py-3">
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
        className="curseur-cote order-last mt-1 h-5 w-full basis-full cursor-pointer"
      />
    </label>
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
                <div className="relative mx-auto aspect-[4/5] max-h-[34svh] w-auto max-w-[320px] overflow-hidden rounded-xl md:max-h-none md:w-full md:max-w-[420px]">
                  {croquis}
                </div>,
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
              </span>
              <div className="mt-2 grid grid-cols-2 rounded-full border border-[#9a8d80] bg-white p-0.5">
                {t.gcEtageOptions.map((option, i) => {
                  const actifBouton = cotes.etage === option || (cotes.etage === "" && i === 0);
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
              <p
                className="mt-2 text-[28px] font-medium leading-none tabular-nums transition-colors"
                style={{ color: conforme ? ACCENT : "#6f6357" }}
              >
                {grandChiffre}
              </p>
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

          {/* Les modèles que la norme permet pour CETTE fenêtre : le client choisit son dessin, puis commande. */}
          {modeles.length > 0 && releve && (
            <div id="modeles-gc" className="mt-5 scroll-mt-24 rounded-2xl border border-[#e0d6c8] bg-white/70 p-4">
              <p className="text-[13px] font-medium leading-snug text-[#2b2320]">
                {adapte
                  ? fr
                    ? "Avec les mesures de votre fenêtre, le modèle de la photo ne serait pas aux normes. Mais nous en proposons d'autres, dessinés pour vos cotes."
                    : "With your window's measurements, the model in the photo would not meet the standard. But we offer others, drawn for your measurements."
                  : fr
                    ? "Les modèles aux normes pour votre fenêtre."
                    : "The models that meet the standard for your window."}
              </p>
              <p className="mt-1 text-xs leading-snug text-[#5c5140]">
                {fr ? "Cliquez sur un modèle pour le voir sur le croquis et le choisir." : "Click a model to see it on the sketch and choose it."}
              </p>
              <div role="group" aria-label={fr ? "Modèles aux normes" : "Compliant models"} className="mt-3 grid grid-cols-2 gap-2.5">
                {modeles.map((m) => {
                  const choisi = m.id === cotes.modele;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={choisi}
                      onClick={() => onChange({ ...cotes, modele: m.id })}
                      className={`flex flex-col rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
                        choisi ? "border-[#2b2320] bg-white shadow-sm ring-1 ring-[#2b2320]" : "border-[#e0d6c8] bg-white/60 hover:border-[#9a8d80]"
                      }`}
                    >
                      <span className="flex h-[72px] items-end justify-center">
                        <MiniGardeCorps largeurMm={releve.largeurMm} hauteurMm={m.hauteurMm} soubassementMm={m.soubassementMm} croix={m.croix} />
                      </span>
                      <span className="mt-2 block text-[13px] font-medium leading-snug text-[#2b2320]">
                        {croixTexte(m.croix)}
                        {m.soubassementMm > 0 ? (fr ? ", barreaux en bas" : ", bars below") : ""}
                      </span>
                      <span className="block text-[11px] leading-snug text-[#6f6357]">
                        {fr ? `Hauteur ${nombre(m.hauteurMm)} mm · acier carré de ${m.carre}` : `Height ${nombre(m.hauteurMm)} mm · ${m.carre} mm square steel`}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium tabular-nums" style={{ color: ACCENT }}>
                          {prixAffiche(m.prix, locale)}
                        </span>
                        <span className="rounded-full bg-[#e3efe4] px-2 py-0.5 text-[10px] font-medium text-[#2a6b3a]">{fr ? "Aux normes" : "To standard"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {!cotes.modele && (
                <p className="mt-2.5 text-xs font-medium text-[#8a4b12]" role="status">
                  {fr ? "Choisissez un modèle pour pouvoir l'ajouter au panier." : "Choose a model to add it to your cart."}
                </p>
              )}
            </div>
          )}
          {/* Un autre dessin : la photo de la fenêtre, et l'atelier répond. */}
          {lienDevis && (
            <Link
              href={lienDevis}
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#e0d6c8] bg-white/70 px-4 py-3 transition-colors hover:border-[#2b2320]"
            >
              <span>
                <span className="block text-[13px] font-medium text-[#2b2320]">{fr ? "Garde-corps personnalisé" : "Custom railing"}</span>
                <span className="block text-xs leading-snug text-[#5c5140]">
                  {fr
                    ? "Envoyez une photo de votre fenêtre : sous 48 h, nous vous disons si c'est faisable et à quoi il ressemblerait, aux normes."
                    : "Send a photo of your window: within 48 hours we tell you whether it can be done and what it would look like, to standard."}
                </span>
              </span>
              <span aria-hidden className="text-lg text-[#2b2320]">›</span>
            </Link>
          )}

          <p className="mt-4 text-[11px] leading-snug text-[#726757]">{t.gcNote}</p>
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

/** Le petit dessin d'un modèle, À L'ÉCHELLE de la fenêtre du client : le cadre, ses croix à rosace, les barreaux du bas. */
function MiniGardeCorps({ largeurMm, hauteurMm, soubassementMm, croix }: { largeurMm: number; hauteurMm: number; soubassementMm: number; croix: number }) {
  // Même échelle en largeur et en hauteur, dans une vignette de 130 × 72 au plus.
  const k = Math.min(126 / largeurMm, 68 / hauteurMm);
  const L = largeurMm * k, H = hauteurMm * k;
  const mc = Math.max(2, 40 * k), haut = mc, bas = H - 1;
  const lisse = soubassementMm > 0 ? bas - soubassementMm * k : bas;
  const pas = L / croix;
  const nb = Math.max(2, Math.round(largeurMm / 110));
  return (
    <svg width={L + 4} height={H + 2} viewBox={`-2 0 ${L + 4} ${H + 2}`} aria-hidden className="block max-w-full" fill="none" stroke="#2b2320" strokeWidth="1.5" strokeLinecap="round">
      <rect x="-1" y="0" width={L + 2} height={mc} rx="1" fill="#c9a36b" stroke="none" />
      <rect x="0" y={haut} width={L} height={bas - haut} />
      {soubassementMm > 0 && <line x1="0" y1={lisse} x2={L} y2={lisse} />}
      {Array.from({ length: croix }, (_, i) => {
        const x0 = i * pas, x1 = x0 + pas;
        return (
          <g key={i}>
            {i > 0 && <line x1={x0} y1={haut} x2={x0} y2={lisse} />}
            <line x1={x0} y1={haut} x2={x1} y2={lisse} strokeWidth="1" />
            <line x1={x0} y1={lisse} x2={x1} y2={haut} strokeWidth="1" />
            <circle cx={(x0 + x1) / 2} cy={(haut + lisse) / 2} r={Math.max(1.5, Math.min(4, 50 * k))} fill="#2b2320" stroke="none" />
          </g>
        );
      })}
      {soubassementMm > 0 &&
        Array.from({ length: nb - 1 }, (_, i) => {
          const x = ((i + 1) * L) / nb;
          return <line key={`b${i}`} x1={x} y1={lisse} x2={x} y2={bas} strokeWidth="0.9" />;
        })}
    </svg>
  );
}
