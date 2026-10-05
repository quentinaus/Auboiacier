"use client";

/**
 * LE CHOIX DE LA MAIN COURANTE du garde-corps (demande de Quentin, 05/10/2026 : « je veux des vrais designs de main
 * courante, bois, acier ou fer plat… et que tout soit relié au devis »). Quatre MODÈLES, dessinés en coupe à l'échelle comme
 * dans l'outil de plans de l'atelier, puis l'essence pour un bois — au lieu d'une rangée de carrés de couleur qui ne disait
 * pas ce que l'on choisissait :
 *   - bois RAINURÉ : un carré de bois de 40 × 40, creusé dessous, qui s'emboîte sur la lisse haute ;
 *   - bois SUR FER PLAT : le bois (60 × 45) vissé par dessous sur un plat de 60 × 10 soudé sur la lisse, qui la raidit ;
 *   - acier, FER PLAT : un plat de 40 × 8 soudé à plat sur le cadre ;
 *   - acier PROFILÉ : un profilé du commerce de 40 × 10, rainuré, emboîté sur la lisse.
 * Chaque modèle montre son écart de prix (celui de l'outil, pour CETTE fenêtre) ; celui qui ne passe pas la norme pour la
 * fenêtre est grisé, avec la raison. Le choix reste UN identifiant (« chene-plat », « acier »…) : le même que celui du
 * panier, du devis et de l'outil.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ESSENCES_GC, idMainCouranteGC, lireMainCouranteGC, type EssenceGC, type MainsPrixGC, type TypeMainCouranteGC } from "@/lib/garde-corps";
import type { ProductSwatch } from "@/lib/products";
import { prixAffiche } from "@/lib/ui";
import { COUPES_MAIN_COURANTE_GC } from "@/lib/garde-corps-coupes.genere";

const TYPES: TypeMainCouranteGC[] = ["bois-rainure", "bois-plat", "acier-plat", "acier-profile"];

const MOTS = {
  fr: {
    titre: "Main courante",
    modele: "Modèle de main courante",
    essence: "Essence du bois",
    fermer: "Terminé",
    pareil: "Même prix",
    nom: { "bois-rainure": "Bois rainuré", "bois-plat": "Bois sur fer plat", "acier-plat": "Acier, fer plat", "acier-profile": "Acier, profilé" },
    detail: {
      "bois-rainure": "Carré de bois 40 × 40, creusé dessous : il s'emboîte sur le cadre.",
      "bois-plat": "Bois 60 × 45 vissé sur un fer plat 60 × 10 soudé : plus large, plus rigide.",
      "acier-plat": "Fer plat 40 × 8 soudé à plat sur le cadre, peint comme le cadre.",
      "acier-profile": "Profilé du commerce 40 × 10, rainuré, emboîté sur le cadre et peint.",
    },
    impossible: {
      "bois-rainure": "Fenêtre large : un fer plat est nécessaire sous le bois.",
      "bois-plat": "Trop haut pour cette fenêtre : le cadre n'aurait plus assez de place.",
      "acier-plat": "Trop fin pour cette largeur : prendre le bois sur fer plat.",
      "acier-profile": "Trop fin pour cette largeur : prendre le bois sur fer plat.",
    },
    essences: { pin: "Pin", hetre: "Hêtre", chene: "Chêne", noyer: "Noyer" },
  },
  en: {
    titre: "Handrail",
    modele: "Handrail design",
    essence: "Wood species",
    fermer: "Done",
    pareil: "Same price",
    nom: { "bois-rainure": "Grooved wood", "bois-plat": "Wood on flat bar", "acier-plat": "Steel, flat bar", "acier-profile": "Steel, profiled" },
    detail: {
      "bois-rainure": "40 × 40 wooden block, grooved underneath: it fits over the frame.",
      "bois-plat": "60 × 45 wood screwed onto a welded 60 × 10 flat bar: wider and stiffer.",
      "acier-plat": "40 × 8 flat bar welded flat on the frame, painted like the frame.",
      "acier-profile": "Off-the-shelf 40 × 10 grooved profile, fitted over the frame and painted.",
    },
    impossible: {
      "bois-rainure": "Wide window: a flat bar is needed under the wood.",
      "bois-plat": "Too tall for this window: the frame would not have enough room.",
      "acier-plat": "Too thin for this width: take the wood on a flat bar.",
      "acier-profile": "Too thin for this width: take the wood on a flat bar.",
    },
    essences: { pin: "Pine", hetre: "Beech", chene: "Oak", noyer: "Walnut" },
  },
} as const;

/** Ce qui sera fabriqué : le bois « rainuré » devient « sur fer plat » quand l'outil impose le plat (fenêtre large). */
function idFabrique(id: string, renfort?: boolean): string {
  const m = lireMainCouranteGC(id);
  return renfort && m?.type === "bois-rainure" && m.essence ? idMainCouranteGC("bois-plat", m.essence) : id;
}

/** Le nom d'une main courante, en une ligne (« Chêne, rainuré », « Acier, fer plat »). */
export function nomMainCourante(id: string, locale: "fr" | "en"): string {
  const m = lireMainCouranteGC(id);
  if (!m) return id;
  const t = MOTS[locale];
  if (!m.essence) return t.nom[m.type];
  const suite = m.type === "bois-plat" ? (locale === "fr" ? "sur fer plat" : "on flat bar") : locale === "fr" ? "rainuré" : "grooved";
  return `${t.essences[m.essence]}, ${suite}`;
}

/** Un même cadre pour les quatre coupes : elles gardent ainsi leurs proportions les unes par rapport aux autres. */
const CADRE_COUPES = (() => {
  const vbs = Object.values(COUPES_MAIN_COURANTE_GC).map((c) => c.vb);
  const x1 = Math.min(...vbs.map((v) => v[0])), y1 = Math.min(...vbs.map((v) => v[1]));
  const x2 = Math.max(...vbs.map((v) => v[0] + v[2])), y2 = Math.max(...vbs.map((v) => v[1] + v[3]));
  return `${x1} ${y1} ${x2 - x1} ${y2 - y1}`;
})();

/**
 * La COUPE d'une main courante posée sur la lisse haute du cadre — celle que dessine l'outil de plans (coupeMainCourante, via
 * coupes.genere.ts), à l'échelle : le bois rainuré 40 × 40 sur la lisse, le bois 60 × 45 vissé sur son fer plat 60 × 10, le fer
 * plat 40 × 8, le profilé 40 × 10 à dessus bombé et rainure dessous. Seules les couleurs sont celles du client (voir .coupe-mc).
 */
export function CoupeMainCourante({ type, bois, acier, className }: { type: TypeMainCouranteGC; bois: string; acier: string; className?: string }) {
  return (
    <svg
      viewBox={CADRE_COUPES}
      aria-hidden
      className={`coupe-mc ${className ?? ""}`}
      style={{ "--bois": bois, "--acier": acier } as React.CSSProperties}
      dangerouslySetInnerHTML={{ __html: COUPES_MAIN_COURANTE_GC[type].html }}
    />
  );
}

type Props = {
  /** Les dix mains courantes du catalogue (couleurs d'essence comprises). */
  options: ProductSwatch[];
  choisi: string;
  onChoisir: (id: string) => void;
  /** Les prix de l'outil pour CETTE fenêtre ; undefined tant que le serveur n'a pas répondu (rien n'est grisé). */
  mains?: MainsPrixGC;
  /** Le prix de la pièce avec la main courante choisie, quand le garde-corps est vendable (les écarts se comptent à partir de lui). */
  prixActuel: number | null;
  /** L'outil impose un fer plat sous le bois (fenêtre large) : un bois « rainuré » choisi est alors fabriqué sur fer plat. */
  renfort?: boolean;
  /** La couleur de l'acier choisi : la lisse et les mains courantes en acier la prennent. */
  couleurAcier: string;
  locale: "fr" | "en";
};

function usePieces({ options, choisi, mains, prixActuel, renfort, locale }: Props) {
  const t = MOTS[locale];
  const choisie = lireMainCouranteGC(choisi);
  const actuelle = choisie && renfort && choisie.type === "bois-rainure" ? { ...choisie, type: "bois-plat" as const } : choisie;
  // La dernière essence de bois choisie : on la retrouve en revenant de l'acier.
  const [derniere, setDerniere] = useState<EssenceGC>(actuelle?.essence ?? "chene");
  if (actuelle?.essence && actuelle.essence !== derniere) setDerniere(actuelle.essence);
  const contraint = mains !== undefined && Object.keys(mains).length > 0;
  const prix = (id: string) => (mains ? mains[id as keyof MainsPrixGC] : undefined);
  const dispo = (id: string) => !contraint || prix(id) !== undefined;
  const teinte = (essence: EssenceGC) => options.find((o) => o.id === essence)?.swatch ?? "#c19a5e";
  const essenceCourante = actuelle?.essence ?? derniere;
  /** L'identifiant d'un modèle : avec l'essence courante, sinon avec la moins chère qui convient. */
  const idDuType = (type: TypeMainCouranteGC): string => {
    const voulu = idMainCouranteGC(type, essenceCourante);
    if (dispo(voulu)) return voulu;
    const autres = ESSENCES_GC.map((e) => idMainCouranteGC(type, e)).filter(dispo);
    return autres.sort((a, b) => (prix(a) ?? 0) - (prix(b) ?? 0))[0] ?? voulu;
  };
  /** L'écart de prix d'un choix par rapport au choix actuel, écrit : « + 50 € », « − 10 € », « Même prix » ; sinon son prix. */
  const ecart = (id: string): string | null => {
    const p = prix(id);
    if (p === undefined) return null;
    if (prixActuel === null) return `${prixAffiche(p, locale)}`;
    const d = p - prixActuel;
    if (d === 0) return t.pareil;
    return `${d > 0 ? "+" : "−"} ${prixAffiche(Math.abs(d), locale)}`;
  };
  return { t, actuelle, essenceCourante, dispo, teinte, idDuType, ecart, contraint };
}

/** Le contenu du choix : les quatre modèles, puis l'essence quand c'est un bois. */
function Choix(props: Props & { enTete?: ReactNode; pied?: ReactNode }) {
  const { choisi, onChoisir, couleurAcier, locale } = props;
  const { t, actuelle, essenceCourante, dispo, teinte, idDuType, ecart } = usePieces(props);
  const bois = actuelle?.essence !== null && actuelle?.essence !== undefined;
  const typeActuel = actuelle?.type ?? "bois-rainure";
  return (
    <div className="flex flex-col gap-3 text-left">
      {props.enTete}
      <div role="radiogroup" aria-label={t.modele} className="flex flex-col gap-1.5">
        {TYPES.map((type) => {
          const id = idDuType(type);
          const possible = dispo(id);
          const sur = typeActuel === type && possible;
          const prixTexte = sur ? null : possible ? ecart(id) : null;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={sur}
              aria-disabled={!possible}
              disabled={!possible}
              onClick={() => onChoisir(id)}
              className={`grid grid-cols-[3.4rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
                sur ? "bg-white ring-2 ring-[#2b2320]" : possible ? "bg-[#f6f1ea] ring-1 ring-[#e5ddd3] hover:bg-white hover:ring-[#2b2320]/40" : "cursor-not-allowed bg-[#f6f1ea]/60 ring-1 ring-[#e5ddd3]"
              }`}
            >
              <span className={`flex h-[3.4rem] w-[3.4rem] items-end justify-center rounded-lg bg-[#fbf8f4] ${possible ? "" : "opacity-40"}`}>
                <CoupeMainCourante type={type} bois={bois ? teinte(essenceCourante) : teinte("chene")} acier={couleurAcier} className="h-full w-full" />
              </span>
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold leading-tight ${possible ? "text-[#2b2320]" : "text-[#6f6357]"}`}>{t.nom[type]}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-[#5c5140]">{possible ? t.detail[type] : t.impossible[type]}</span>
              </span>
              <span className="whitespace-nowrap text-[12px] font-medium tabular-nums text-[#2b2320]">
                {sur ? <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2b2320] text-white">✓</span> : prixTexte}
              </span>
            </button>
          );
        })}
      </div>
      {bois && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{t.essence}</p>
          <div role="radiogroup" aria-label={t.essence} className="grid grid-cols-4 gap-1.5">
            {ESSENCES_GC.map((essence) => {
              const id = idMainCouranteGC(typeActuel === "bois-plat" ? "bois-plat" : "bois-rainure", essence);
              const possible = dispo(id);
              const sur = actuelle?.essence === essence;
              const e = sur ? null : ecart(id);
              return (
                <button
                  key={essence}
                  type="button"
                  role="radio"
                  aria-checked={sur}
                  aria-disabled={!possible}
                  disabled={!possible}
                  onClick={() => onChoisir(id)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
                    sur ? "bg-white ring-2 ring-[#2b2320]" : possible ? "bg-[#f6f1ea] ring-1 ring-[#e5ddd3] hover:bg-white hover:ring-[#2b2320]/40" : "cursor-not-allowed bg-[#f6f1ea]/60 opacity-50 ring-1 ring-[#e5ddd3]"
                  }`}
                >
                  <span aria-hidden className="h-5 w-8 rounded-[5px] ring-1 ring-black/15" style={{ background: teinte(essence) }} />
                  <span className="text-[12px] font-medium leading-tight text-[#2b2320]">{t.essences[essence]}</span>
                  <span className="min-h-[1em] text-[10.5px] leading-tight tabular-nums text-[#5c5140]">{e && e !== t.pareil ? e : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {props.pied}
      <span className="sr-only" aria-live="polite">
        {nomMainCourante(choisi, locale)}
      </span>
    </div>
  );
}

/** Grand écran : une ligne dans la barre des matières (la coupe, le nom) qui ouvre le choix dans une fenêtre sous elle. */
export function MainCouranteMenu(props: Props) {
  const { locale, couleurAcier, options } = props;
  const choisi = idFabrique(props.choisi, props.renfort);
  const t = MOTS[locale];
  const bouton = useRef<HTMLButtonElement>(null);
  const fenetre = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const idFenetre = useId();
  const actuelle = lireMainCouranteGC(choisi);
  const LARGEUR = 440;
  const ouvrir = () => {
    if (place) return setPlace(null);
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - LARGEUR / 2), window.innerWidth - LARGEUR - 12);
    setPlace({ left, top: r.bottom + 8 });
  };
  useEffect(() => {
    if (!place) return;
    const fermer = () => setPlace(null);
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      fermer();
      bouton.current?.focus();
    };
    const dehors = (e: MouseEvent) => {
      const cible = e.target as Element | null;
      if (!cible?.closest(`[data-popover="${CSS.escape(idFenetre)}"]`) && !bouton.current?.contains(cible)) fermer();
    };
    const defile = (e: Event) => {
      if (!fenetre.current?.contains(e.target as Node)) fermer();
    };
    window.addEventListener("keydown", touche);
    window.addEventListener("mousedown", dehors);
    window.addEventListener("resize", fermer);
    window.addEventListener("scroll", defile, true);
    fenetre.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("mousedown", dehors);
      window.removeEventListener("resize", fermer);
      window.removeEventListener("scroll", defile, true);
    };
  }, [place, idFenetre]);
  const boisTeinte = options.find((o) => o.id === (actuelle?.essence ?? "chene"))?.swatch ?? "#c19a5e";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{t.titre}</span>
      <button
        ref={bouton}
        type="button"
        aria-expanded={place !== null}
        aria-haspopup="dialog"
        aria-controls={idFenetre}
        onClick={ouvrir}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-1.5 py-0.5 ring-1 ring-[#2b2320]/25 transition-shadow hover:ring-[#2b2320]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
      >
        <CoupeMainCourante type={actuelle?.type ?? "bois-rainure"} bois={boisTeinte} acier={couleurAcier} className="h-[26px] w-[23px]" />
        <span className="whitespace-nowrap text-[12px] font-medium text-[#2b2320]">{nomMainCourante(choisi, locale)}</span>
        <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 text-[#2b2320] transition-transform ${place ? "rotate-180" : ""}`}>
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {place &&
        createPortal(
          <div
            ref={fenetre}
            id={idFenetre}
            data-popover={idFenetre}
            role="dialog"
            tabIndex={-1}
            aria-label={t.titre}
            style={{ position: "fixed", left: place.left, top: place.top, width: LARGEUR }}
            className="z-[90] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-[#e5ddd3] bg-white p-3.5 text-left shadow-[0_24px_60px_-20px_rgba(43,35,32,0.45)] outline-none"
          >
            <Choix
              {...props}
              pied={
                <button
                  type="button"
                  onClick={() => {
                    setPlace(null);
                    bouton.current?.focus();
                  }}
                  className="self-end rounded-full bg-[#2b2320] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#4a3b36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
                >
                  {t.fermer}
                </button>
              }
            />
          </div>,
          document.body
        )}
    </div>
  );
}

/** Petit écran : le choix en clair dans la page, sous un titre. */
export function MainCouranteListe(props: Props) {
  const t = MOTS[props.locale];
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{t.titre}</legend>
      <Choix {...props} />
    </fieldset>
  );
}
