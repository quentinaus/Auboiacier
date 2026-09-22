"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { InfoBulle } from "./info-bulle";
import { QuiMesure, VisiteAtelier } from "./prise-de-cotes";
import { SchemaFenetre, NUMERO_COTE, type CoteFenetre } from "./schema-fenetre";
import { calculerGardeCorpsFenetre, JOUR_MM, type CalculFenetre } from "@/lib/garde-corps";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";

const ACCENT = "#2b2320";

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

/** Le calcul, à partir des cases : `null` tant qu'il manque la largeur ou l'allège. */
export function calculDepuisCotes(
  cotes: CotesGardeCorps,
  t: Dictionary["artisanat"]
): CalculFenetre | null {
  const largeurMm = mm(cotes.largeur);
  const allegeMm = mm(cotes.allege);
  const hauteurFenetreMm = mm(cotes.fenetre);
  if (!Number.isFinite(largeurMm) || !Number.isFinite(allegeMm) || !Number.isFinite(hauteurFenetreMm) || hauteurFenetreMm <= 0) {
    return null;
  }
  // La hauteur, c'est nous qui la calculons : le client n'a rien à choisir.
  return calculerGardeCorpsFenetre({
    largeurMm,
    allegeMm,
    hauteurFenetreMm,
    // Tant que le client n'a pas dit, on suppose l'étage : c'est le cas où la
    // règle s'applique, mieux vaut la montrer que la taire.
    enEtage: cotes.etage !== t.gcEtageOptions[1],
  });
}

/**
 * Ce que le client précise et qui doit arriver tel quel à l'atelier, sur le
 * bon de commande : la fenêtre, le mur, la profondeur. Une ligne, courte.
 */
export function noteGardeCorps(cotes: CotesGardeCorps, t: Dictionary["artisanat"]): string {
  const calcul = calculDepuisCotes(cotes, t);
  return [
    cotes.etage,
    cotes.mur && `${t.gcMur.toLowerCase()} : ${cotes.mur.toLowerCase()}`,
    Number.isFinite(mm(cotes.allege)) && `${t.gcAllege.toLowerCase()} ${mm(cotes.allege)} mm`,
    Number.isFinite(mm(cotes.fenetre)) && `${t.gcFenetre.toLowerCase()} ${mm(cotes.fenetre)} mm`,
    calcul && calcul.jourMm > 0 && `${t.gcJourCourt} ${calcul.jourMm} mm`,
  ]
    .filter(Boolean)
    .join(" · ");
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
 * croquis et les cases apparaissent, et le prix du garde-corps suit sa frappe.
 * Le bloc ne refuse rien : il calcule, il nomme, il prévient.
 */
export function ReleveGardeCorps({
  cotes,
  onChange,
  t,
  locale,
  prixPiece,
  horsBareme = null,
  tropBasse = false,
  lienDevis,
  norme,
  rosaceMm,
  schemaSlot,
}: {
  cotes: CotesGardeCorps;
  onChange: (cotes: CotesGardeCorps) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** Le prix du garde-corps aux cotes tapées, bois et acier compris. */
  prixPiece: number | null;
  /** Les cotes dépassent le barème : pas de prix, une demande de devis — avec les bornes à citer. */
  horsBareme?: { largeurMaxMm: number; hauteurMaxMm: number } | null;
  /** La fenêtre est trop basse : la main courante dépasserait le haut de l'ouverture. Sur devis. */
  tropBasse?: boolean;
  lienDevis?: string;
  /** Le diamètre de la rosace choisie, en millimètres, pour le croquis. */
  rosaceMm?: number;
  /**
   * L'emplacement du croquis, hors de la carte du configurateur : à côté
   * d'elle, en grand (voir schemaSlot dans product-view.tsx). Sans lui, le
   * croquis reste à sa place, au-dessus des cases.
   */
  schemaSlot?: HTMLDivElement | null;
  /** La norme sur le remplissage : les croix jusqu'à une hauteur, le verre au-delà. */
  norme?: {
    nonConforme: boolean;
    hauteurMaxMm: number;
    surVerre: boolean;
    croixConformes: boolean;
    prixVerre: number | null;
    choisirVerre?: () => void;
    revenirCroix: () => void;
    lienAutres: string;
  };
}) {
  const idTitre = useId();
  const idChamps = useId();
  const langue = locale === "en" ? "en-GB" : "fr-FR";
  const [coteActive, setCoteActive] = useState<CoteFenetre | null>(null);
  const calcul = calculDepuisCotes(cotes, t);
  const rdc = cotes.etage === t.gcEtageOptions[1];

  const remarque = calcul
    ? calcul.obligatoire
      ? calcul.sousLaRegle
        ? t.gcRegleSous
            .replace("{h}", calcul.hauteurRetenueMm.toLocaleString(langue))
            .replace("{n}", calcul.hauteurNormeMm.toLocaleString(langue))
        : t.gcRegleOk.replace("{n}", calcul.hauteurNormeMm.toLocaleString(langue))
      : rdc
        ? t.gcRegleLibreRdc.replace("{n}", calcul.hauteurNormeMm.toLocaleString(langue))
        : t.gcRegleLibreAllege
    : "";

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
    <label className="flex items-center justify-between gap-4 py-3">
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
      <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]" id={idTitre}>
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
          const croquis = (
            <SchemaFenetre
              className="absolute inset-0 h-full w-full"
              largeurMm={Number.isFinite(mm(cotes.largeur)) && mm(cotes.largeur) > 0 ? mm(cotes.largeur) : undefined}
              allegeMm={Number.isFinite(mm(cotes.allege)) ? mm(cotes.allege) : undefined}
              hauteurFenetreMm={Number.isFinite(mm(cotes.fenetre)) && mm(cotes.fenetre) > 0 ? mm(cotes.fenetre) : undefined}
              hauteurMm={calcul?.hauteurRetenueMm}
              jourMm={calcul?.jourMm ?? JOUR_MM}
              rosaceMm={rosaceMm}
              mainCouranteMm={calcul?.mainCouranteMm ?? (rdc ? 800 : 1000)}
              remplissage={norme?.surVerre ? "verre" : "croix"}
              actif={coteActive}
              onChoisir={allerA}
              locale={locale}
              labels={{
                largeur: t.gcSchemaLargeur,
                allege: t.gcSchemaAllege,
                fenetre: t.gcSchemaFenetre,
                hauteur: t.gcSchemaHauteur,
                metre: (rdc ? t.gcSchemaMetreRdc : t.gcSchemaMetre).replace(
                  "{m}",
                  (calcul?.mainCouranteMm ?? (rdc ? 800 : 1000)).toLocaleString(langue)
                ),
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
            {ligne("largeur", { label: t.gcLargeur, aide: t.gcLargeurAide, info: t.gcLargeurInfo, placeholder: "1180" })}
            {ligne("allege", { label: t.gcAllege, aide: t.gcAllegeAide, info: t.gcAllegeInfo, placeholder: "850" })}
            {ligne("fenetre", { label: t.gcFenetre, aide: t.gcFenetreAide, info: t.gcFenetreInfo, placeholder: "1200" })}

            {/* En étage ou pas : deux boutons, c'est ce qui décide de la règle. */}
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
                <InfoBulle texte={t.gcEtageInfo} label={t.gcInfoLabel} />
                {t.gcEtage}
              </span>
              <div className="flex shrink-0 rounded-full border border-[#9a8d80] bg-white p-0.5">
                {t.gcEtageOptions.map((option, i) => {
                  const actifBouton = cotes.etage === option || (cotes.etage === "" && i === 0);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={actifBouton}
                      onClick={() => set("etage")(option)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
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
            <label className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
                <InfoBulle texte={t.gcMurInfo} label={t.gcInfoLabel} />
                {t.gcMur}
                <span className="text-xs text-[#6f6357]">{t.gcFacultatif}</span>
              </span>
              <select value={cotes.mur} onChange={(e) => set("mur")(e.target.value)} className={SELECT}>
                <option value="">—</option>
                {t.gcMurOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* ④ Ce que ça donne, calculé par nous : les cotes, le prix, et la
              règle en une ligne. */}
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
                style={{ color: calcul && prixPiece !== null && !norme?.nonConforme && !horsBareme && !tropBasse ? ACCENT : "#6f6357" }}
              >
                {horsBareme || tropBasse
                  ? t.onQuote
                  : calcul && prixPiece !== null && !norme?.nonConforme
                    ? prixAffiche(prixPiece, locale)
                    : "—"}
              </p>
              <p className="mt-1.5 text-xs text-[#6f6357]">
                {calcul
                  ? `${t.gcResume
                      .replace("{l}", calcul.largeurMm.toLocaleString(langue))
                      .replace("{h}", calcul.hauteurRetenueMm.toLocaleString(langue))} · ${t.gcPrixCompris}`
                  : t.gcAttente}
              </p>
            </div>

            <div className="w-full text-xs leading-snug sm:max-w-[17rem]">
              {horsBareme && (
                <p className="text-[#2b2320]" role="alert">
                  {t.gcHorsBareme
                    .replace("{l}", horsBareme.largeurMaxMm.toLocaleString(langue))
                    .replace("{h}", horsBareme.hauteurMaxMm.toLocaleString(langue))}{" "}
                  {lienDevis && (
                    <Link href={lienDevis} className="font-medium underline underline-offset-4">
                      {t.requestQuote}
                    </Link>
                  )}
                </p>
              )}
              {tropBasse && calcul && (
                <p className="text-[#2b2320]" role="alert">
                  {t.gcTropBasse
                    .replace("{m}", calcul.mainCouranteMm.toLocaleString(langue))
                    .replace("{f}", (mm(cotes.allege) + mm(cotes.fenetre)).toLocaleString(langue))}{" "}
                  {lienDevis && (
                    <Link href={lienDevis} className="font-medium underline underline-offset-4">
                      {t.requestQuote}
                    </Link>
                  )}
                </p>
              )}
              {/* La norme dit non aux croix à cette hauteur : on le dit, et
                  on donne les deux issues — le verre, chiffré, ou un autre modèle. */}
              {calcul && !horsBareme && !tropBasse && norme?.nonConforme && (
                <div role="alert">
                  <p className="font-medium text-[#2b2320]">{t.gcNonConformeTitre}</p>
                  <p className="mt-1 text-[#5c5140]">
                    {t.gcNonConforme
                      .replace("{h}", calcul.hauteurRetenueMm.toLocaleString(langue))
                      .replace("{max}", norme.hauteurMaxMm.toLocaleString(langue))}
                  </p>
                  {norme.choisirVerre && norme.prixVerre !== null && (
                    <button
                      type="button"
                      onClick={norme.choisirVerre}
                      className="mt-2.5 block w-full rounded-xl border border-[#2b2320] bg-white px-3 py-2 text-left transition-colors hover:bg-[#2b2320] hover:text-white"
                    >
                      <span className="block font-medium">{t.gcPasserVerre.replace("{prix}", prixAffiche(norme.prixVerre, locale))}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug opacity-80">{t.gcPasserVerreNote}</span>
                    </button>
                  )}
                  <Link href={norme.lienAutres} className="mt-2 block text-center font-medium text-[#2b2320] underline underline-offset-4">
                    {t.gcVoirAutres}
                  </Link>
                </div>
              )}
              {calcul && !horsBareme && !tropBasse && !norme?.nonConforme && (
                <>
                  <p className="flex items-center gap-1.5 font-medium text-[#2a6b3a]">
                    <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    {t.gcConforme}
                  </p>
                  <p className="mt-1 text-[#5c5140]">
                    {t.gcMainCourante
                      .replace("{m}", calcul.mainCouranteMm.toLocaleString(langue))
                      .replace("{j}", calcul.jourMm.toLocaleString(langue))}
                    {calcul.sousLaRegle ? ` ${remarque}` : ""}
                  </p>
                  {norme?.surVerre && (
                    <p className="mt-1 text-[#5c5140]">
                      {t.gcSurVerre}{" "}
                      {norme.croixConformes && (
                        <button type="button" onClick={norme.revenirCroix} className="font-medium text-[#2b2320] underline underline-offset-4">
                          {t.gcRevenirCroix}
                        </button>
                      )}
                    </p>
                  )}
                </>
              )}
              <p role="status" aria-live="polite" className="sr-only">
                {calcul
                  ? `${calcul.largeurMm} × ${calcul.hauteurRetenueMm} mm. ${t.gcCalcule.replace("{m}", String(calcul.mainCouranteMm))} ${remarque}`
                  : ""}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-snug text-[#726757]">{t.gcNote}</p>
        </>
      )}
    </div>
  );
}
