"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ChampCote } from "./champ-cote";
import { Intitule, QuiMesure, VisiteAtelier } from "./prise-de-cotes";
import { SchemaFenetre, NUMERO_COTE, type CoteFenetre } from "./schema-fenetre";
import { calculerGardeCorpsFenetre, type CalculFenetre } from "@/lib/garde-corps";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";

const ACCENT = "#6d2c2c";

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
  "mt-1.5 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2.5 text-base text-[#2a2116] focus:border-[#6d2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d2c2c] sm:text-sm";

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

  const champ = (cote: "largeur" | "allege" | "fenetre", props: { label: string; aide?: string; info: string; placeholder: string }) => (
    <ChampCote
      id={`${idChamps}-${cote}`}
      label={props.label}
      aide={props.aide}
      info={props.info}
      infoLabel={t.gcInfoLabel}
      avant={<Pastille n={NUMERO_COTE[cote]} />}
      valeur={cotes[cote]}
      onChange={set(cote)}
      placeholder={props.placeholder}
      onFocus={() => setCoteActive(cote)}
      onBlur={() => setCoteActive(null)}
    />
  );

  return (
    <div className="@container mt-3 border-t border-[#e5ddd3] pt-3">
      <span
        className="block text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]"
        id={idTitre}
      >
        {t.gcTitle}
      </span>

      <div className="mt-2.5 overflow-hidden rounded-2xl border border-[#e0d5c7] bg-[#fbfaf8]">
        <div className="px-3.5 pb-3.5 pt-3 md:px-4">
          {/* 1. Qui mesure ? C'est la première question, elle décide de la suite. */}
          <QuiMesure
            valeur={cotes.qui}
            onChange={(qui) => onChange({ ...cotes, qui })}
            t={t}
            notes={{ moi: t.gcQuiMoiNote, atelier: t.gcQuiAtelierNote }}
          />

          {/* 2a. L'atelier vient : le code postal, le prix, la demi-journée. */}
          {cotes.qui === "atelier" && (
            <VisiteAtelier cotes={cotes} onChange={(visite) => onChange({ ...cotes, ...visite })} t={t} locale={locale} />
          )}

          {/* 2b. Le client mesure : le croquis et ses deux cases côte à côte,
              pour qu'on voie en même temps où se prend la cote et où on l'écrit. */}
          {cotes.qui === "moi" && (
            <>
              <p className="mt-4 text-xs leading-relaxed text-[#6f6357]">{t.gcIntro}</p>

              <div className="mt-3 grid gap-3 @md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @md:items-start">
                {/* Le croquis, carré : la fenêtre d'abord, un peu de mur et de
                    sol autour, et le prix qui se lit dessus, en bas. Dessous,
                    la consigne qui compte : des cotes exactes, en millimètres. */}
                <div className="flex flex-col gap-2.5">
                <div className="relative aspect-square min-h-0 overflow-hidden rounded-xl border border-[#e5ddd3] bg-[#efe9dd]">
                  <SchemaFenetre
                    className="absolute inset-0 h-full w-full"
                    largeurMm={Number.isFinite(mm(cotes.largeur)) && mm(cotes.largeur) > 0 ? mm(cotes.largeur) : undefined}
                    allegeMm={Number.isFinite(mm(cotes.allege)) ? mm(cotes.allege) : undefined}
                    hauteurFenetreMm={Number.isFinite(mm(cotes.fenetre)) && mm(cotes.fenetre) > 0 ? mm(cotes.fenetre) : undefined}
                    hauteurMm={calcul?.hauteurRetenueMm}
                    jourMm={calcul?.jourMm ?? 0}
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
                    }}
                  />
                  <div className="absolute inset-x-2 bottom-2 rounded-lg border border-white/60 bg-white/90 px-3 py-1.5 shadow-[0_10px_30px_-16px_rgba(42,33,22,0.6)] backdrop-blur-sm">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className="text-xl font-medium leading-none tabular-nums transition-colors"
                        style={{ color: calcul && prixPiece !== null ? ACCENT : "#a3968a" }}
                      >
                        {horsBareme || tropBasse
                          ? t.onQuote
                          : calcul && prixPiece !== null && !norme?.nonConforme
                            ? prixAffiche(prixPiece, locale)
                            : "—"}
                      </span>
                      <span className="text-[11px] leading-snug text-[#5c5140]">
                        {horsBareme
                          ? t.gcHorsBaremeCourt.replace("{l}", horsBareme.largeurMaxMm.toLocaleString(langue))
                          : tropBasse
                            ? t.gcTropBasseCourt
                          : norme?.nonConforme
                            ? t.gcNonConformeCourt
                          : calcul && prixPiece !== null
                          ? `${t.gcResume
                              .replace("{l}", calcul.largeurMm.toLocaleString(langue))
                              .replace("{h}", calcul.hauteurRetenueMm.toLocaleString(langue))} · ${t.gcPrixCompris}`
                          : t.gcPrixAttente}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="rounded-xl border border-[#6d2c2c]/20 bg-[#6d2c2c]/[0.05] px-3.5 py-3 text-[15px] leading-snug text-[#2a2116]">
                  <span className="mr-1.5 inline-block align-[-3px]" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6d2c2c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                      <rect x="3" y="8" width="18" height="8" rx="1.5" />
                      <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
                    </svg>
                  </span>
                  {/* « au millimètre près » souligné, la fin en gras : c'est la consigne qui compte. */}
                  {t.gcCotesExactes.split(" — ")[0].split(t.gcCotesExactesSouligne)[0]}
                  <u className="decoration-[#6d2c2c] decoration-2 underline-offset-[3px]">{t.gcCotesExactesSouligne}</u>
                  {t.gcCotesExactes.split(" — ")[0].split(t.gcCotesExactesSouligne)[1]}
                  {" — "}
                  <strong className="font-semibold text-[#6d2c2c]">{t.gcCotesExactes.split(" — ")[1]}</strong>
                </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {champ("largeur", {
                    label: t.gcLargeur,
                    aide: t.gcLargeurAide,
                    info: t.gcLargeurInfo,
                    placeholder: "1180",
                  })}
                  {champ("allege", {
                    label: t.gcAllege,
                    aide: t.gcAllegeAide,
                    info: t.gcAllegeInfo,
                    placeholder: "850",
                  })}
                  {champ("fenetre", {
                    label: t.gcFenetre,
                    aide: t.gcFenetreAide,
                    info: t.gcFenetreInfo,
                    placeholder: "1200",
                  })}

                  {/* En étage ou pas : deux boutons, c'est ce qui décide de la règle. */}
                  <div>
                    <Intitule info={t.gcEtageInfo} infoLabel={t.gcInfoLabel}>
                      {t.gcEtage}
                    </Intitule>
                    <div className="mt-1.5 flex rounded-full border border-[#e5ddd3] bg-white p-0.5">
                      {t.gcEtageOptions.map((option, i) => {
                        const actifBouton = cotes.etage === option || (cotes.etage === "" && i === 0);
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={actifBouton}
                            onClick={() => set("etage")(option)}
                            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              actifBouton ? "bg-[#2a2116] text-white" : "text-[#726757] hover:text-[#2a2116]"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* ④ Ce que ça donne, calculé par nous : sous le croquis, sur
                  toute la largeur — les cotes à gauche, l'explication à droite. */}
              <div
                className={`mt-3 grid gap-x-5 gap-y-2 rounded-xl border px-3.5 py-3 @sm:grid-cols-[auto_minmax(0,1fr)] @sm:items-start ${
                  calcul ? "border-[#6d2c2c]/30 bg-[#6d2c2c]/[0.04]" : "border-[#e5ddd3] bg-white"
                }`}
                onMouseEnter={() => setCoteActive("hauteur")}
                onMouseLeave={() => setCoteActive(null)}
              >
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">
                    <Pastille n={NUMERO_COTE.hauteur} />
                    {t.gcResultTitle}
                  </span>
                  {/* Les cotes de la pièce ; le prix, lui, est sur le croquis. */}
                  <p
                    className="mt-1 text-lg font-medium leading-tight tabular-nums transition-colors"
                    style={{ color: calcul ? ACCENT : "#a3968a" }}
                  >
                    {calcul
                      ? t.gcResume
                          .replace("{l}", calcul.largeurMm.toLocaleString(langue))
                          .replace("{h}", calcul.hauteurRetenueMm.toLocaleString(langue))
                      : "— × — mm"}
                  </p>
                </div>
                <div className="@sm:pt-0.5">
                {horsBareme && (
                  <p className="mt-1.5 text-[11px] leading-snug text-[#6d2c2c]" role="alert">
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
                  <p className="mt-1.5 text-[11px] leading-snug text-[#6d2c2c]" role="alert">
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
                  <div className="mt-1.5" role="alert">
                    <p className="text-[11px] font-medium leading-snug text-[#6d2c2c]">{t.gcNonConformeTitre}</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#5c5140]">
                      {t.gcNonConforme
                        .replace("{h}", calcul.hauteurRetenueMm.toLocaleString(langue))
                        .replace("{max}", norme.hauteurMaxMm.toLocaleString(langue))}
                    </p>
                    {norme.choisirVerre && norme.prixVerre !== null && (
                      <button
                        type="button"
                        onClick={norme.choisirVerre}
                        className="mt-2.5 block w-full rounded-xl border border-[#6d2c2c] bg-white px-3 py-2 text-left transition-colors hover:bg-[#6d2c2c] hover:text-white"
                      >
                        <span className="block text-xs font-medium">
                          {t.gcPasserVerre.replace("{prix}", prixAffiche(norme.prixVerre, locale))}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug opacity-80">{t.gcPasserVerreNote}</span>
                      </button>
                    )}
                    <Link
                      href={norme.lienAutres}
                      className="mt-2 block text-center text-[11px] font-medium text-[#6d2c2c] underline underline-offset-4"
                    >
                      {t.gcVoirAutres}
                    </Link>
                  </div>
                )}
                {calcul && !horsBareme && !tropBasse && !norme?.nonConforme && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#2a6b3a]">
                    <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                    {t.gcConforme}
                  </p>
                )}
                {calcul && !horsBareme && !tropBasse && norme?.surVerre && (
                  <p className="mt-1 text-[11px] leading-snug text-[#5c5140]">
                    {t.gcSurVerre}{" "}
                    {norme.croixConformes && (
                      <button type="button" onClick={norme.revenirCroix} className="font-medium text-[#6d2c2c] underline underline-offset-4">
                        {t.gcRevenirCroix}
                      </button>
                    )}
                  </p>
                )}
                <p className="mt-1 text-[11px] leading-snug text-[#5c5140]">
                  {horsBareme || tropBasse || norme?.nonConforme
                    ? ""
                    : calcul
                    ? `${calcul.jourMm > 0 ? `${t.gcJour.replace("{j}", calcul.jourMm.toLocaleString(langue))} ` : ""}${t.gcCalcule.replace("{m}", calcul.mainCouranteMm.toLocaleString(langue))} ${remarque} ${t.gcPrixInclus}`
                    : t.gcAttente}
                </p>
                <p role="status" aria-live="polite" className="sr-only">
                  {calcul
                    ? `${calcul.largeurMm} × ${calcul.hauteurRetenueMm} mm. ${t.gcCalcule.replace("{m}", String(calcul.mainCouranteMm))} ${remarque}`
                    : ""}
                </p>
                </div>
              </div>

              {/* Le mur, en option : ça décide des chevilles qu'on fournit. */}
              <label className="mt-3 block">
                <Intitule info={t.gcMurInfo} infoLabel={t.gcInfoLabel}>
                  {t.gcMurFacultatif}
                </Intitule>
                <select value={cotes.mur} onChange={(e) => set("mur")(e.target.value)} className={SELECT}>
                  <option value="">—</option>
                  {t.gcMurOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-[10px] leading-snug text-[#726757]">{t.gcNote}</p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
