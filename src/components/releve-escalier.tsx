"use client";

import { useId } from "react";
import { calculerEscalier, type CalculEscalier } from "@/lib/escalier";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ChampCote } from "./champ-cote";

const ACCENT = "#6d2c2c";

/** Les cotes que le client relève chez lui, telles qu'il les tape. */
export type CotesEscalier = {
  hauteur: string;
  recul: string;
  tremieLongueur: string;
  tremieLargeur: string;
  passage: string;
  depart: string;
};

export const COTES_ESCALIER_VIDES: CotesEscalier = {
  hauteur: "",
  recul: "",
  tremieLongueur: "",
  tremieLargeur: "",
  passage: "",
  depart: "",
};

const mm = (valeur: string) => {
  const nombre = Number(valeur.replace(",", "."));
  return Number.isFinite(nombre) && nombre > 0 ? Math.round(nombre) : NaN;
};

/** Des millimètres en centimètres, avec une décimale : « 17,5 cm ». */
function enCm(millimetres: number, locale: "fr" | "en") {
  const cm = (millimetres / 10).toFixed(1);
  return locale === "en" ? cm : cm.replace(".", ",");
}

/** Des millimètres en mètres : « 4,20 m ». */
function enM(millimetres: number, locale: "fr" | "en") {
  const m = (millimetres / 1000).toFixed(2);
  return locale === "en" ? m : m.replace(".", ",");
}

/**
 * Le résumé qui part avec la demande de devis. Une seule ligne par
 * information : c'est ce que Quentin lira dans sa boîte mail, et il doit
 * pouvoir le recopier sur un carnet sans rien décoder.
 */
export function resumeReleve(
  cotes: CotesEscalier,
  calcul: CalculEscalier | null,
  t: Dictionary["artisanat"],
  locale: "fr" | "en"
): string {
  const releve = [
    Number.isFinite(mm(cotes.hauteur)) && `${t.releveHauteur} ${mm(cotes.hauteur)} mm`,
    Number.isFinite(mm(cotes.recul)) && `${t.releveRecul} ${mm(cotes.recul)} mm`,
    Number.isFinite(mm(cotes.tremieLongueur)) &&
      Number.isFinite(mm(cotes.tremieLargeur)) &&
      `${t.releveTremieLongueur.split(" — ")[0]} ${mm(cotes.tremieLongueur)} × ${mm(cotes.tremieLargeur)} mm`,
    Number.isFinite(mm(cotes.passage)) && `${t.relevePassage} ${mm(cotes.passage)} mm`,
    cotes.depart && `${t.releveDepart} : ${cotes.depart}`,
  ].filter(Boolean);

  if (releve.length === 0) return "";

  const lignes = [`${t.releveRecap} : ${releve.join(" · ")}`];
  if (calcul) {
    const chiffres = [
      t.releveMarches
        .replace("{n}", String(calcul.nombreDeMarches))
        .replace("{h}", enCm(calcul.hauteurDeMarcheMm, locale)),
      calcul.gironMm !== undefined && t.releveGiron.replace("{g}", enCm(calcul.gironMm, locale)),
      calcul.blondelMm !== undefined &&
        t.releveBlondel.replace("{b}", enCm(calcul.blondelMm, locale)),
    ].filter(Boolean);
    lignes.push(`${t.releveCalcul} : ${chiffres.join(" · ")}`);
  }
  return lignes.join("\n");
}

/**
 * Le relevé de cotes d'un escalier.
 *
 * Un escalier ne se commande pas dans un panier : il se relève. Ce bloc
 * demande au client les trois mesures qui décident de tout, lui montre
 * aussitôt ce qu'elles donnent — nombre de marches, hauteur de marche, giron —
 * et fait partir le tout avec la demande de devis.
 *
 * Il ne refuse jamais une cote. Ce n'est pas un gardien : c'est le carnet de
 * l'atelier, ouvert au client.
 */
export function ReleveEscalier({
  cotes,
  onChange,
  t,
  locale,
  entete = true,
}: {
  cotes: CotesEscalier;
  onChange: (cotes: CotesEscalier) => void;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** Sans en-tête : le titre est déjà posé au-dessus, avec le choix « qui mesure ». */
  entete?: boolean;
}) {
  const idTitre = useId();

  const hauteurMm = mm(cotes.hauteur);
  const reculMm = mm(cotes.recul);
  const calcul = Number.isFinite(hauteurMm)
    ? calculerEscalier({
        hauteurMm,
        reculMm: Number.isFinite(reculMm) ? reculMm : undefined,
      })
    : null;

  const remarque = calcul
    ? calcul.confort === "confortable"
      ? t.releveConfortable
      : calcul.confort === "un-peu-raide"
        ? t.releveUnPeuRaide
        : t.releveRaide
    : "";

  const motRecul = calcul
    ? calcul.pas === undefined
      ? t.releveReculConseille.replace("{r}", enM(calcul.reculConfortMm, locale))
      : calcul.pas === "juste"
        ? t.releveReculJuste
        : calcul.pas === "serre"
          ? t.releveReculServe
          : t.releveReculLong
    : "";

  const set = (champ: keyof CotesEscalier) => (valeur: string) =>
    onChange({ ...cotes, [champ]: valeur });

  return (
    <div className={entete ? "@container mt-4 border-t border-[#e5ddd3] pt-4" : "@container"}>
      {entete && (
        <span className="block text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]" id={idTitre}>
          {t.releveTitle}
        </span>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-[#e0d5c7] bg-[#fbfaf8]">
        <div className="px-4 pb-4 pt-3.5 md:px-5 md:pt-4">
          <p className="text-xs leading-relaxed text-[#6f6357]">{t.releveIntro}</p>

          <div className="mt-4 grid gap-3 @sm:grid-cols-2">
            <ChampCote
              label={t.releveHauteur}
              aide={t.releveHauteurAide}
              valeur={cotes.hauteur}
              onChange={set("hauteur")}
              placeholder="2700"
            />
            <ChampCote
              label={t.releveRecul}
              aide={t.releveReculAide}
              valeur={cotes.recul}
              onChange={set("recul")}
              placeholder="4000"
            />
          </div>

          <div className="mt-3 grid gap-3 @sm:grid-cols-3">
            <ChampCote
              label={t.releveTremieLongueur}
              valeur={cotes.tremieLongueur}
              onChange={set("tremieLongueur")}
            />
            <ChampCote
              label={t.releveTremieLargeur}
              valeur={cotes.tremieLargeur}
              onChange={set("tremieLargeur")}
            />
            <ChampCote
              label={t.relevePassage}
              aide={t.relevePassageAide}
              valeur={cotes.passage}
              onChange={set("passage")}
              placeholder="900"
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-[#726757]">{t.releveTremieAide}</p>

          <label className="mt-4 block">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">
              {t.releveDepart}
            </span>
            <select
              value={cotes.depart}
              onChange={(event) => set("depart")(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#9a8d80] bg-white px-3 py-2.5 text-base text-[#2a2116] focus:border-[#6d2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d2c2c] sm:text-sm"
            >
              <option value="">—</option>
              {t.releveDepartOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Ce que les cotes donnent, mis à jour à chaque frappe. */}
        <div className="border-t border-[#e0d5c7] bg-white px-4 py-3 md:px-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">
            {t.releveResultTitle}
          </span>
          <p
            className="mt-1 text-xl font-medium tabular-nums transition-colors"
            style={{ color: calcul ? ACCENT : "#726757" }}
          >
            {calcul
              ? [
                  t.releveMarches
                    .replace("{n}", String(calcul.nombreDeMarches))
                    .replace("{h}", enCm(calcul.hauteurDeMarcheMm, locale)),
                  calcul.gironMm !== undefined &&
                    t.releveGiron.replace("{g}", enCm(calcul.gironMm, locale)),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "—"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#5c5140]">
            {calcul
              ? [remarque, motRecul].filter(Boolean).join(" ")
              : t.releveAttente}
          </p>

          {/* Un lecteur d'écran entend le calcul se refaire. */}
          <p role="status" aria-live="polite" className="sr-only">
            {calcul
              ? `${t.releveMarches
                  .replace("{n}", String(calcul.nombreDeMarches))
                  .replace("{h}", enCm(calcul.hauteurDeMarcheMm, locale))}. ${remarque} ${motRecul}`
              : ""}
          </p>

          <p className="mt-2 text-[11px] leading-snug text-[#726757]">{t.releveNote}</p>
        </div>
      </div>
    </div>
  );
}
