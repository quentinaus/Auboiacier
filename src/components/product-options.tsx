"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  computeUnitPrice,
  deltaBois,
  surfaceTailleM2,
  devisSurMesure,
  epaisseurMaxMm,
  epaisseurMiniMm,
  essenceDeReference,
  libelleGardeCorps,
  poidsColisKg,
  priceFrom,
  prixParOutil,
  supplementRemplissage,
  SUR_MESURE,
  type Product,
  type ProductSize,
  type ProductSwatch,
} from "@/lib/products";
import { amenerAlEcran, moinsDAnimations, prixAffiche, surfaceAffichee } from "@/lib/ui";
import { MainCouranteListe, MainCouranteMenu } from "./main-courante-choix";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { useCart } from "@/lib/cart";
import { MaterialBubble } from "./material-bubble";
import { SchemaCotes, type CoteActive, type CoteSchema } from "./schema-cotes";
import {
  ReleveGardeCorps,
  lireReleve,
  texteManqueGC,
  noteGardeCorps,
  usePrixGardeCorps,
  COTES_GARDE_CORPS_VIDES,
  type CotesGardeCorps,
} from "./releve-garde-corps";
import { LIVRAISON, POSE, PRISE_DE_COTES, RETRAIT } from "@/lib/deplacement";
import { diametreRosaceGC } from "@/lib/garde-corps";
import { memoVersReleve, memoriserConfig, releveVersMemo, reprendreConfig, type ConfigMemo } from "@/lib/config-memo";
import { livrableParTransporteur } from "@/lib/products";
import { VisiteAtelier } from "./prise-de-cotes";
import { PorteQuiMesure, RevenirAuChoix, type QuiPrendLesCotes } from "./porte-qui-mesure";
import { MAX_TEXTE, EMAIL_MOTIF } from "@/lib/devis-regles";
import { POSE_INITIALE, PoseDomicile, livraisonPrete, montantLivraison, type ChoixPose } from "./pose-domicile";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";
import { InscriptionOuverture } from "./inscription-ouverture";
import type { TextesOuverture } from "@/lib/ouverture";

const ACCENT = "#2b2320";

/** Avant l'ouverture des commandes : les textes de l'inscription, et l'adresse à écrire si l'envoi échoue. */
export type Ouverture = { t: TextesOuverture; contactEmail: string };

const VOIR_PANIER = {
  fr: "Voir mon panier",
  en: "View my cart",
} as const;

/** Style commun à tous les intitulés d'option (dimensions, bois, acier…). */
const GROUP_LABEL =
  "block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]";

/**
 * Le configurateur en pleine page, sous la photo : une carte avec tous les
 * choix à gauche, le grand croquis coté à droite (voir product-view.tsx).
 * Toute pièce qui se fabrique aux cotes du client y passe : les tables, le
 * garde-corps de fenêtre (son croquis à lui, voir ReleveGardeCorps) et les
 * plafonds lumineux. Les pièces à taille fixe gardent la colonne classique.
 */
export function aLeConfigurateurPleinePage(product: Product): boolean {
  // Le garde-corps n'a plus de barème « sur mesure » (son prix vient de l'outil de plans) :
  // il garde pourtant la même page, son relevé à gauche et le croquis de la fenêtre à droite.
  return Boolean(product.surMesure) || product.releve === "garde-corps-fenetre";
}

function formatDelta(delta: number, locale: "fr" | "en") {
  if (!delta) return locale === "fr" ? "Inclus" : "Included";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${prixAffiche(Math.abs(delta), locale)}`;
}

function SwatchGroup({
  label,
  options,
  selected,
  onSelect,
  locale,
  showDelta = false,
  agrandir = false,
}: {
  label: string;
  options: ProductSwatch[];
  selected: string;
  onSelect: (id: string) => void;
  locale: "fr" | "en";
  showDelta?: boolean;
  /** Au clic, la pastille s'affiche aussi en grand (les rosaces : leur dessin
   *  de fonderie est trop fin pour se lire dans une pastille). */
  agrandir?: boolean;
}) {
  const [enGrand, setEnGrand] = useState<ProductSwatch | null>(null);
  const photo = (o: ProductSwatch) => o.grain?.match(/url\((.+)\)/)?.[1];
  useEffect(() => {
    if (!enGrand) return;
    const fermer = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEnGrand(null);
    };
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [enGrand]);
  /* Sans nom de groupe, un lecteur d'écran énonçait quinze boutons
     « enfoncé / non enfoncé » d'affilée sans jamais dire s'il s'agissait du
     bois, de la couleur des pieds ou du velours. */
  const idGroupe = useId();
  /* Un nuancier de quelques teintes se lit d'un coup d'œil, posé en grille.
     Au-delà, quinze rangées de velours prenaient toute la colonne : on les
     fait défiler à l'horizontale, comme la bande de vignettes de la galerie —
     sur téléphone comme sur grand écran, où la colonne reste étroite. */
  const scrollable = options.length > 6;
  const rangeeRef = useRef<HTMLDivElement>(null);
  /* À la souris, rien n'indique qu'on peut glisser la rangée (pas de doigt à
     balayer) : deux flèches, comme sur la galerie, ce qui fait aussi glisser
     le nuancier d'un coup d'œil animé plutôt que d'un bond sec. */
  function glisser(sens: 1 | -1) {
    rangeeRef.current?.scrollBy({ left: sens * 220, behavior: "smooth" });
  }
  return (
    <div className="w-full">
      <span className={`${GROUP_LABEL} text-center`} id={idGroupe}>
        {label}
      </span>
      {/* Les pastilles en rangée, centrées sous leur intitulé : la colonne est
          étroite, chaque groupe se lit comme un nuancier. Un grand nuancier
          (le velours, quinze teintes) défile à l'horizontale plutôt que de
          s'empiler sur plusieurs rangées — la dernière pastille, coupée au
          bord, montre qu'il y en a d'autres. */}
      <div className={scrollable ? "relative" : undefined}>
        {scrollable && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => glisser(-1)}
              className="absolute left-0 top-9 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-[#e5ddd3] bg-white text-sm text-[#2b2320] shadow-sm transition-colors hover:border-[#2b2320]"
            >
              ‹
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => glisser(1)}
              className="absolute right-0 top-9 z-10 flex h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-[#e5ddd3] bg-white text-sm text-[#2b2320] shadow-sm transition-colors hover:border-[#2b2320]"
            >
              ›
            </button>
          </>
        )}
        <div
          ref={rangeeRef}
          role="group"
          aria-labelledby={idGroupe}
          className={
            scrollable
              ? "no-scrollbar mt-4 flex snap-x snap-mandatory gap-x-4 overflow-x-auto px-0.5 pb-1 pt-1"
              : "mt-4 flex flex-wrap justify-center gap-x-4 gap-y-5 sm:gap-x-5"
          }
        >
        {options.map((o) => {
          const isSelected = o.id === selected;
          return (
            /* Le contour de focus avait été supprimé : au clavier, on
               choisissait son velours à l'aveugle. */
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onSelect(o.id);
                if (agrandir && photo(o)) setEnGrand(o);
              }}
              aria-pressed={isSelected}
              /* Le supplément est écrit à l'écran sous la pastille ; un
                 aria-label remplace tout le contenu du bouton, il doit donc le
                 redire, sinon le « +710 € » du noyer n'est jamais prononcé. */
              aria-label={
                showDelta
                  ? `${o.label} — ${formatDelta(o.priceDelta ?? 0, locale)}`
                  : o.label
              }
              /* flex flex-col justify-start : un <button> centre son contenu
                 verticalement par défaut, même en display:block. Sans ce mot,
                 une pastille dont l'intitulé tient sur une ligne (« Bleu roi »)
                 descendait par rapport à une autre à deux lignes
                 (« Sacramento ») — la rangée n'était plus alignée. */
              className={`group flex w-14 shrink-0 snap-start flex-col justify-start rounded-xl text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] sm:w-[4.25rem] lg:w-[4.75rem]`}
            >
              {/* La matière d'abord, posée à plat ; son nom en dessous, sur
                  deux lignes s'il le faut — comme un nuancier. Plus petite sur
                  téléphone : ce choix passe maintenant tout en haut de la
                  colonne, il ne doit pas y prendre tout l'écran.
                  Au survol la plaquette se soulève de deux points, au lieu de
                  gonfler : on sort une lame du paquet, on ne gonfle pas une
                  bulle. */}
              <MaterialBubble
                material={o}
                selected={isSelected}
                className="mx-auto aspect-[4/5] w-11 transition-transform duration-200 group-hover:-translate-y-[2px] group-focus-visible:-translate-y-[2px] sm:w-[3.25rem] lg:w-14"
              />
              <span
                className={`mt-2.5 block text-[11px] leading-snug ${
                  isSelected ? "font-medium text-[#2a2116]" : "text-[#5c5140]"
                }`}
              >
                {o.label}
              </span>
              {showDelta && (
                <span
                  className={`mt-0.5 block text-[11px] leading-snug tabular-nums ${
                    isSelected ? "text-[#2a2116]" : "text-[#6f6357]"
                  }`}
                >
                  {formatDelta(o.priceDelta ?? 0, locale)}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
      {enGrand &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={enGrand.label}
            onClick={() => setEnGrand(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2b2320]/70 p-4"
          >
            <figure
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[26rem] rounded-2xl bg-white p-4 shadow-xl"
            >
              <button
                type="button"
                autoFocus
                onClick={() => setEnGrand(null)}
                aria-label={locale === "fr" ? "Fermer" : "Close"}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#e5ddd3] bg-white text-xl leading-none text-[#2b2320] shadow-sm transition-colors hover:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
              >
                ×
              </button>
              <Image
                src={photo(enGrand)!}
                alt={enGrand.label}
                width={400}
                height={400}
                className="aspect-square w-full rounded-xl object-cover"
              />
              <figcaption className="mt-3 text-center text-sm text-[#2a2116]">
                {enGrand.label}
                {showDelta && ` · ${formatDelta(enGrand.priceDelta ?? 0, locale)}`}
              </figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Les cotes d'un intitulé de taille, sans le reste : « Ø 120 cm » plutôt que
 * « Ø 120 cm — 1,13 m² — 75 W », « 2 500 × 1 100 × 40 mm » plutôt que la même
 * chose suivie de sa surface. C'est ce qu'on met à côté du grand prix, où la
 * place est comptée.
 */
function cotesCourtes(label: string) {
  const morceaux = label.split(" — ");
  const cotes = morceaux.find((morceau) => /[×Ø]/.test(morceau)) ?? morceaux[0];
  return cotes
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*mm\s*×\s*/, " × ")
    .trim();
}

const clampCurseur = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Un sous-menu de la carte du configurateur : une ligne (titre, résumé,
 * chevron) qui s'ouvre sur son contenu. Un <details> natif : ouvert ou fermé
 * au clic sans script, lisible au clavier et au lecteur d'écran ; l'état est
 * tenu par le parent pour pouvoir l'ouvrir de loin (le lien « indiquez votre
 * code postal » ouvre celui de la livraison).
 */
function SousMenu({
  id,
  titre,
  resume,
  ouvert,
  onToggle,
  children,
}: {
  id?: string;
  titre: string;
  /** Ce qu'on retient quand c'est fermé : « 186 € », « ≈ 52 kg »… */
  resume?: string;
  ouvert: boolean;
  onToggle: (ouvert: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={ouvert}
      onToggle={(event) => onToggle(event.currentTarget.open)}
      className="scroll-mt-28 border-t border-[#e5ddd3]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{titre}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-[#6f6357]">
          {resume && <span className="truncate">{resume}</span>}
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`}
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

/**
 * Une ligne (titre, résumé, chevron) comme celle d'un sous-menu, qui ouvre son contenu dans une FENÊTRE FLOTTANTE posée à gauche
 * de la colonne, au lieu de le déplier dedans : la colonne d'achat du garde-corps (grand écran) tient sur un écran sans jamais
 * défiler (demande de Quentin). Se ferme au clic ailleurs et à « Échap ».
 */
function PopoverDetails({ titre, libelle, children }: { titre: string; libelle: string; children: ReactNode }) {
  const bouton = useRef<HTMLButtonElement>(null);
  const fenetre = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const idFenetre = useId();
  const ouvrir = () => {
    if (place) return setPlace(null);
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    const right = window.innerWidth - r.left + 12;
    // En haut de l'écran la fenêtre s'aligne sur le haut de la ligne, en bas sur son bas.
    setPlace(r.top > window.innerHeight / 2 ? { right, bottom: Math.max(12, window.innerHeight - r.bottom) } : { right, top: Math.max(12, r.top) });
  };
  useEffect(() => {
    if (!place) return;
    const fermer = () => setPlace(null);
    // Échap : on ferme et le focus revient sur le lien, comme pour une vraie fenêtre.
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      fermer();
      bouton.current?.focus();
    };
    const dehors = (e: MouseEvent) => {
      const cible = e.target as Element | null;
      if (!cible?.closest(`[data-popover="${CSS.escape(idFenetre)}"]`) && !bouton.current?.contains(cible)) fermer();
    };
    // La page défile (la fenêtre est fixe, son lien bouge) : on ferme, sauf si c'est la fenêtre elle-même qui défile.
    const defile = (e: Event) => {
      if (!fenetre.current?.contains(e.target as Node)) fermer();
    };
    window.addEventListener("keydown", touche);
    window.addEventListener("mousedown", dehors);
    window.addEventListener("resize", fermer);
    window.addEventListener("scroll", defile, true);
    // Au clavier : la fenêtre prend le focus à l'ouverture (elle est en fin de page, hors de l'ordre de tabulation du lien).
    fenetre.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("mousedown", dehors);
      window.removeEventListener("resize", fermer);
      window.removeEventListener("scroll", defile, true);
    };
  }, [place, idFenetre]);
  return (
    <>
      <button
        ref={bouton}
        type="button"
        aria-expanded={place !== null}
        aria-haspopup="dialog"
        aria-controls={idFenetre}
        onClick={ouvrir}
        className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[#2b2320] underline underline-offset-4 transition-colors hover:text-[#6d2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
      >
        {libelle}
        <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform ${place ? "-rotate-90" : ""}`}>
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
            aria-label={titre}
            style={{ position: "fixed", right: place.right, top: place.top, bottom: place.bottom, width: 340 }}
            className="z-[90] max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl outline-none border border-[#e5ddd3] bg-white p-4 text-left shadow-[0_24px_60px_-20px_rgba(43,35,32,0.45)]"
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

/** Le numéro d'une cote : le même sur le croquis et devant sa ligne. */
function Pastille({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[#2b2320] text-[10px] font-bold leading-none text-[#2b2320]"
    >
      {n}
    </span>
  );
}

/**
 * Une ligne de cote : le numéro et l'intitulé à gauche, la saisie à droite.
 * Les bornes ne sont plus écrites dessous : elles servent de texte d'attente
 * dans le champ (et sont lues par les lecteurs d'écran).
 */
function Ligne({
  n,
  id,
  label,
  valeur,
  onChange,
  unite,
  bornes,
  onFocus,
  onBlur,
  erreurId,
  curseur,
  serre = false,
}: {
  n: number;
  id: string;
  label: string;
  valeur: string;
  onChange: (valeur: string) => void;
  unite: string;
  bornes: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Le message de refus, quand il y en a un : la ligne le désigne. */
  erreurId?: string;
  /**
   * Un curseur sous la ligne, en plus de la case à taper : les deux pilotent
   * la même cote, en millimètres. Glisser ou taper donnent le même résultat.
   */
  curseur?: {
    minMm: number;
    maxMm: number;
    valeurMm: number;
    onChangeMm: (mm: number) => void;
    stepMm?: number;
  };
  /** Dans la carte du configurateur, sur téléphone : tout doit tenir dans l'écran. */
  serre?: boolean;
}) {
  const bornesId = `${id}-bornes`;
  const pourcent = curseur
    ? Math.round(
        (clampCurseur(
          Number.isFinite(curseur.valeurMm) ? curseur.valeurMm : curseur.minMm,
          curseur.minMm,
          curseur.maxMm
        ) -
          curseur.minMm) /
          (curseur.maxMm - curseur.minMm || 1) *
          100
      )
    : 0;
  return (
    <div className={serre ? "py-1.5 md:py-3" : "py-3"}>
      <label className="flex items-center justify-between gap-3">
        <span className={`flex items-center text-[#2b2320] ${serre ? "gap-2 text-[13.5px] md:gap-2.5 md:text-[15px]" : "gap-2.5 text-[15px]"}`}>
          <Pastille n={n} />
          {label}
        </span>
        {/* Le focus est porté par la pilule seule — bordure bordeaux et halo
            léger ; le filet de sécurité global est coupé sur le champ. */}
        <span className={`flex shrink-0 items-center gap-1 rounded-full border border-[#9a8d80] bg-white transition-[border-color,box-shadow] focus-within:border-[#2b2320] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)] ${serre ? "h-9 w-[7.25rem] px-3 md:h-10 md:w-[8.5rem] md:px-3.5" : "h-10 w-[8.5rem] px-3.5"}`}>
          <input
            id={id}
            inputMode="decimal"
            value={valeur}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={bornes}
            aria-describedby={[bornesId, erreurId].filter(Boolean).join(" ")}
            aria-invalid={erreurId ? true : undefined}
            className={`w-full min-w-0 bg-transparent text-right tabular-nums text-[#2b2320] placeholder:text-[#726757] outline-none focus-visible:shadow-none focus-visible:outline-none ${serre ? "text-[15px] md:text-[15px]" : "text-base sm:text-[15px]"}`}
          />
          <span className="text-xs text-[#6f6357]">{unite}</span>
          <span id={bornesId} className="sr-only">
            {bornes} {unite}
          </span>
        </span>
      </label>
      {curseur && (
        <div className={`relative flex w-full items-center ${serre ? "mt-1 h-4 md:mt-2.5 md:h-5" : "mt-2.5 h-5"}`}>
          <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-[#e5ddd3]" />
          <div
            className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[#2b2320]"
            style={{ width: `${pourcent}%` }}
          />
          <input
            type="range"
            aria-label={label}
            aria-describedby={bornesId}
            min={curseur.minMm}
            max={curseur.maxMm}
            step={curseur.stepMm ?? 10}
            value={Number.isFinite(curseur.valeurMm) ? curseur.valeurMm : curseur.minMm}
            onChange={(e) => curseur.onChangeMm(Number(e.target.value))}
            onFocus={onFocus}
            onBlur={onBlur}
            className="relative h-5 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
              [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2b2320] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(43,35,32,0.45)]
              [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2b2320] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(43,35,32,0.45)]"
          />
        </div>
      )}
    </div>
  );
}

export function ProductOptions({
  product,
  t,
  locale,
  fabricId: fabricIdProp,
  onFabricChange,
  metalId: metalIdProp,
  onMetalChange,
  woodId: woodIdProp,
  onWoodChange,
  apercu,
  schemaSlot,
  matieresSlot,
  matieresCentreSlot,
  bandeauSlot,
  resultatSlot,
  achatSlot,
  porteSlot,
  compteOuvert = false,
  ouverture,
}: {
  /** L'espace client est-il ouvert ? On ne propose pas de créer un compte qui n'existe pas encore. */
  compteOuvert?: boolean;
  /**
   * Les commandes ne sont pas encore ouvertes (src/lib/entreprise.ts) : le
   * bouton du panier devient « Être prévenu en priorité ». La configuration va
   * au panier comme d'habitude, puis une fenêtre demande l'e-mail.
   */
  ouverture?: Ouverture;
  product: Product;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** Coloris piloté par la galerie ; sinon géré ici. */
  fabricId?: string;
  onFabricChange?: (id: string) => void;
  /** Teinte des pieds pilotée par la galerie quand chaque teinte a sa photo. */
  metalId?: string;
  onMetalChange?: (id: string) => void;
  /** Essence du plateau pilotée par la galerie quand la photo se reteinte. */
  woodId?: string;
  onWoodChange?: (id: string) => void;
  /**
   * La photo de la pièce dans sa configuration, pour la barre du téléphone :
   * on choisit une teinte ou un bois en bas de page, on voit le rendu en bas
   * d'écran, sans remonter. Un appui ramène à la galerie.
   */
  apercu?: { src: string; alt: string; onClick: () => void };
  /**
   * L'endroit, hors de cette colonne, où poser le grand croquis coté — en
   * pleine largeur, sous la photo (voir product-view.tsx). Rien ne s'affiche
   * ici tant que ce nœud n'est pas encore monté.
   */
  schemaSlot?: HTMLDivElement | null;
  /**
   * Garde-corps, grand écran (trois colonnes, voir product-view.tsx) : où poser le résultat, puis
   * la livraison et la barre d'achat. Sous 1024 px ces emplacements sont cachés : on n'y dépose rien.
   */
  resultatSlot?: HTMLDivElement | null;
  achatSlot?: HTMLDivElement | null;
  /**
   * Où poser le choix des matières (teinte des pieds, essence du plateau)
   * quand le configurateur est en pleine page : à côté de la photo, qu'elles
   * font changer — pas dans la carte plus bas.
   */
  matieresSlot?: HTMLDivElement | null;
  /** Garde-corps, grand écran : la ligne compacte couleur / bois / rosace, au-dessus du croquis. */
  matieresCentreSlot?: HTMLDivElement | null;
  /** Garde-corps, grand écran : le bandeau des modèles, en bas du bloc (product-view.tsx). */
  bandeauSlot?: HTMLDivElement | null;
  /** Garde-corps : la plaque « Configuration », où poser d'abord la question « Qui prend les mesures ? ». */
  porteSlot?: HTMLDivElement | null;
}) {
  /** La taille à laquelle la fiche s'ouvre, s'il y en a une. */
  const tailleInitiale =
    (product.sizes.find((s) => s.default) ?? product.sizes[0])?.id ?? "";
  // Une pièce qui a un barème s'ouvre sans taille ni prix : le chiffre vient
  // avec les cotes du client (ou une taille du catalogue, s'il en choisit une).
  // Les autres s'ouvrent sur leur taille par défaut (la 8 places sur les
  // chaises vendues par lot, par exemple).
  const [sizeIdChoisi, setSizeId] = useState(product.surMesure ? "" : tailleInitiale);
  /**
   * Une pièce sur devis qui n'a encore aucun prix (la table résine) : le
   * client choisit quand même son format, sans tarif, et ce choix part avec
   * sa demande de devis. Le sur-mesure y vaut SUR_MESURE ; ses cotes, le
   * client les écrit dans son message.
   */
  const formatsDevis = product.orderMode === "cart" ? undefined : product.formatsDevis;
  const [formatDevisId, setFormatDevisId] = useState(
    (formatsDevis?.tailles.find((f) => f.default) ?? formatsDevis?.tailles[0])?.id ?? "",
  );
  /** Le détail des dimensions et de leurs tarifs ne s'ouvre qu'au clic. */
  const [sizesOpen, setSizesOpen] = useState(false);
  /**
   * La ligne parcourue aux flèches haut et bas. C'est le seul endroit du site
   * où l'on choisit le prix : il doit se piloter entièrement au clavier.
   */
  const [ligneClavier, setLigneClavier] = useState(0);
  const idTailles = useId();
  /* --- Fabrication aux cotes du client --- */
  /** Tout est converti en millimètres : l'unité n'est qu'une aide à la saisie. */
  // Une table se donne en centimètres, un caisson lumineux en millimètres ;
  // l'unité reste au choix du client.
  // Une table se saisit en centimètres, comme on la mesure ; le reste en millimètres, l'unité de l'atelier.
  const uniteDepart: "mm" | "cm" | "m" =
    product.surMesure?.axes === "plan" && product.category !== "lumiere" ? "cm" : "mm";
  const [unite, setUnite] = useState<"mm" | "cm" | "m">(uniteDepart);
  /**
   * Les cotes d'entrée, quand la fiche en propose (cotesParDefautMm).
   * Un configurateur vide n'apprend rien : mieux vaut montrer une pièce
   * plausible, son prix et son dessin, que le client ajuste ensuite. Écrit
   * dans l'unité d'affichage et sans séparateur de milliers, comme tout ce
   * qui entre dans ces cases (voir chiffreBrut).
   */
  const coteDepart = (index: 0 | 1 | 2) => {
    const mm = product.surMesure?.cotesParDefautMm?.[index];
    if (!mm) return "";
    // L'épaisseur se saisit toujours en millimètres : c'est une cote d'atelier.
    const diviseur = index === 2 ? 1 : uniteDepart === "mm" ? 1 : uniteDepart === "cm" ? 10 : 1000;
    return String(Math.round((mm / diviseur) * 1000) / 1000).replace(
      ".",
      locale === "en" ? "." : ","
    );
  };
  const [largeurSaisie, setLargeurSaisie] = useState(() => coteDepart(0));
  const [hauteurSaisie, setHauteurSaisie] = useState(() => coteDepart(1));
  /** La hauteur finie d'une table, du sol au dessus du plateau : 75 cm si on ne dit rien. */
  const [hauteurTableSaisie, setHauteurTableSaisie] = useState("");
  /** La hauteur finie se replie : une ligne « 75 cm · Modifier », le champ au clic. */
  const [hauteurOuverte, setHauteurOuverte] = useState(false);
  const [epaisseurSaisie, setEpaisseurSaisie] = useState(() => coteDepart(2));
  /** Cote en cours de saisie : c'est elle qui s'allume sur le croquis. */
  const [coteActive, setCoteActive] = useState<CoteActive>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  // Essence de référence par défaut (écart nul, ou celle de la fiche), pas la première de la liste.
  const [ownWoodId, setOwnWoodId] = useState(
    essenceDeReference(product)?.id ?? "",
  );
  const woodId = woodIdProp ?? ownWoodId;
  const setWoodId = onWoodChange ?? setOwnWoodId;
  const [ownMetalId, setOwnMetalId] = useState(product.metals[0]?.id ?? "");
  const metalId = metalIdProp ?? ownMetalId;
  const setMetalId = onMetalChange ?? setOwnMetalId;
  const [ownFabricId, setOwnFabricId] = useState(
    product.fabrics?.[0]?.id ?? "",
  );
  /** Le remplissage d'un garde-corps : les croix du modèle, ou le verre feuilleté à leur place. */
  const [remplissageId, setRemplissageId] = useState(
    product.remplissages?.[0]?.id ?? "",
  );
  const fabricIdChoisi = fabricIdProp ?? ownFabricId;
  const setFabricId = onFabricChange ?? setOwnFabricId;
  /** Sous un panneau de verre, il n'y a plus de croix : plus de rosace à choisir ni à payer. */
  const sansRosace =
    product.fabricLabel !== undefined &&
    product.remplissages?.some(
      (option) => option.id === remplissageId && option.sansCroix === true,
    ) === true;
  const fabricId = sansRosace
    ? (product.fabrics?.[0]?.id ?? "")
    : fabricIdChoisi;
  const [quantity, setQuantity] = useState(1);
  /** Configuration pour laquelle la confirmation d'ajout a été affichée. */
  const [ajoutee, setAjoutee] = useState<string | null>(null);
  const router = useRouter();
  /** Comment recevoir la pièce : transporteur, livrée et posée par l'atelier, ou retirée à l'atelier. */
  const [pose, setPose] = useState<ChoixPose>(POSE_INITIALE);
  /** Les cotes relevées chez le client (garde-corps), et la visite de l'atelier. */
  const [cotesGardeCorps, setCotesGardeCorps] = useState<CotesGardeCorps>(
    // Une pièce sur devis ne se mesure pas soi-même : c'est l'atelier qui vient.
    product.orderMode === "quote"
      ? { ...COTES_GARDE_CORPS_VIDES, qui: "atelier" }
      : COTES_GARDE_CORPS_VIDES,
  );
  /**
   * Le garde-corps commence par une seule question, sur tout le bloc : qui prend les mesures ? (porte-qui-mesure.tsx)
   * `null` : la question est réglée, le configurateur est là. `depuis` : on y revient par « Changer ».
   * Une pièce sur devis n'a pas la question : c'est toujours l'atelier qui vient.
   */
  const aLaQuestionQui = product.releve === "garde-corps-fenetre" && product.orderMode !== "quote";
  const [porte, setPorte] = useState<{ depuis?: QuiPrendLesCotes } | null>(aLaQuestionQui ? {} : null);

  /**
   * Au retour de la création de compte, on remet la configuration en place.
   *
   * Le client est parti chez Google depuis cette fiche : sans cela il
   * retrouverait un formulaire vide et devrait resaisir ses cotes, son
   * essence et sa teinte. La mémoire est relue UNE fois puis effacée (voir
   * config-memo.ts) — elle ne doit pas ressurgir trois jours plus tard.
   *
   * Ça ne peut pas se faire à l'initialisation des états : le serveur
   * pré-calcule cette page et ne connaît pas le stockage du navigateur ; les
   * deux rendus ne concorderaient pas. C'est donc bien après le montage, et
   * une seule fois.
   */
  const configReprise = useRef(false);
  useEffect(() => {
    if (configReprise.current) return;
    configReprise.current = true;
    const memo = reprendreConfig(product.slug);
    if (!memo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- relecture d'un stockage externe au montage, impossible à l'initialisation (voir ci-dessus)
    if (memo.unite) setUnite(memo.unite);
    if (memo.largeur !== undefined) setLargeurSaisie(memo.largeur);
    if (memo.hauteur !== undefined) setHauteurSaisie(memo.hauteur);
    if (memo.epaisseur !== undefined) setEpaisseurSaisie(memo.epaisseur);
    if (memo.hauteurTable !== undefined) setHauteurTableSaisie(memo.hauteurTable);
    if (memo.sizeId !== undefined) {
      // Une pièce sur devis sans prix range son format au même endroit.
      if (!formatsDevis) setSizeId(memo.sizeId);
      else if (
        memo.sizeId === SUR_MESURE ||
        formatsDevis.tailles.some((f) => f.id === memo.sizeId)
      ) {
        setFormatDevisId(memo.sizeId);
      }
    }
    if (memo.woodId) setWoodId(memo.woodId);
    if (memo.metalId) setMetalId(memo.metalId);
    if (memo.fabricId) setFabricId(memo.fabricId);
    // Un remplissage qui n'est plus proposé (le verre à la place des croix) n'est pas repris : la fiche ne
    // montrerait aucun modèle à choisir, et le panier resterait bloqué.
    if (memo.remplissageId && !product.remplissages?.find((r) => r.id === memo.remplissageId)?.sansCroix) setRemplissageId(memo.remplissageId);
    if (memo.quantity) setQuantity(memo.quantity);
    if (memo.codePostal || memo.poseVoulue !== undefined || memo.modeLivraison) {
      setPose((p) => ({
        ...p,
        codePostal: memo.codePostal ?? p.codePostal,
        // Une mémoire écrite avant le retrait à l'atelier ne connaît que « pose voulue ».
        mode: memo.modeLivraison ?? (memo.poseVoulue === undefined ? p.mode : memo.poseVoulue ? "pose" : "transporteur"),
        // Le prix se recalcule : celui d'avant l'aller-retour n'est plus sûr.
        deplacement: null,
      }));
    }
    // Le relevé du garde-corps : ses cotes, l'étage, le mur et le modèle. On
    // ne remet que ce qui avait été rempli — l'étage d'une NOUVELLE fenêtre,
    // lui, n'est jamais coché d'avance.
    const releve = memoVersReleve(memo, t);
    if (Object.keys(releve).length > 0) {
      setCotesGardeCorps((cotes) => ({ ...cotes, ...releve }));
      // Le client revient à ses cotes : il les a prises lui-même, on ne lui repose pas la question.
      setPorte(null);
    }
  }, [product.slug, formatsDevis, setWoodId, setMetalId, setFabricId, t]);
  /** Les coordonnées facultatives du client, pour un devis PDF nominatif. */
  const [coordonnees, setCoordonnees] = useState({ nom: "", email: "" });
  /**
   * Sur téléphone, cette colonne fait plus de deux écrans de haut : le prix et
   * le bouton disparaissent dès qu'on descend choisir un bois ou taper ses
   * cotes. On suit donc le vrai bouton, et une barre prend le relais quand il
   * sort de l'écran.
   */
  const boutonPanierRef = useRef<HTMLButtonElement>(null);
  /** Le bloc de relevé : pour y ramener le curseur quand on ajoute une autre fenêtre. */
  const releveRef = useRef<HTMLDivElement>(null);
  /** La fenêtre qui demande nom et adresse avant d'ouvrir le devis PDF. */
  const devisDialogRef = useRef<HTMLDialogElement>(null);
  /** La fenêtre d'inscription avant l'ouverture des commandes, et sa clé : un formulaire neuf à chaque ouverture. */
  const ouvertureDialogRef = useRef<HTMLDialogElement>(null);
  const [ouvertureCle, setOuvertureCle] = useState(0);
  const idOuvertureTitre = useId();
  const [boutonVisible, setBoutonVisible] = useState(true);
  /** La configuration mise de côté, et l'enregistrement en cours. */
  const [misDeCote, setMisDeCote] = useState<string | null>(null);
  const [favoriEnvoi, setFavoriEnvoi] = useState(false);
  /** Les sous-menus de la carte du configurateur (livraison, poids et détails, ce que comprend le prix). */
  const [menusOuverts, setMenusOuverts] = useState<Record<string, boolean | undefined>>({
    // Sur le garde-corps, la livraison est OUVERTE d'emblée : c'est là qu'on tape son code postal,
    // sans lequel on ne peut rien ajouter au panier. Fermée, on ne comprenait pas pourquoi le bouton
    // restait gris. (Les tables et les plafonds la gardent repliée : leur carte tient sur un écran.)
    livraison: product.releve === "garde-corps-fenetre",
  });
  const ouvrirMenu = (nom: string, ouvert: boolean) => setMenusOuverts((m) => ({ ...m, [nom]: ouvert }));
  /** L'écran est-il assez large pour les trois colonnes du garde-corps (64 rem = 1024 px, comme la variante « lg: » de Tailwind : même unité, même seuil, même avec une police agrandie) ? Dès 1024 px (05/10) : entre 1024 et 1280, deux colonnes faisaient défiler la carte des cotes ET le croquis. */
  const grandEcran = useSyncExternalStore(
    (prevenir) => {
      const mq = window.matchMedia("(min-width: 64rem)");
      mq.addEventListener("change", prevenir);
      return () => mq.removeEventListener("change", prevenir);
    },
    () => window.matchMedia("(min-width: 64rem)").matches,
    () => false
  );
  /**
   * Une tablette ou plus (48 rem = 768 px, « md: ») : le garde-corps y a déjà sa colonne d'achat (résultat, livraison,
   * panier) et sa ligne des matières dans le titre. Seul le bandeau des modèles attend le grand écran.
   */
  const ecranMoyen = useSyncExternalStore(
    (prevenir) => {
      const mq = window.matchMedia("(min-width: 48rem)");
      mq.addEventListener("change", prevenir);
      return () => mq.removeEventListener("change", prevenir);
    },
    () => window.matchMedia("(min-width: 48rem)").matches,
    () => false
  );
  /** Garde-corps : l'emplacement, dans le cadre du résultat (à côté de la carte), du poids, des détails et de ce que comprend le prix. */
  const [detailsSlot, setDetailsSlot] = useState<HTMLDivElement | null>(null);

  /**
   * Aller à l'endroit qui manque, en partant de la phrase qui le réclame.
   *
   * Une simple ancre (href="#livraison") ne suffisait pas : le navigateur
   * saute AVANT que React ait déplié le menu, donc vers un bloc encore fermé
   * de quelques pixels — la page bougeait à peine et on croyait à un défaut.
   * On attend donc deux images : la première laisse React ouvrir le menu, la
   * seconde laisse le navigateur mesurer la carte une fois dépliée.
   *
   * Et on pose le curseur dans la case : c'est elle qu'on est venu remplir.
   * Sur téléphone, le clavier s'ouvre dans la foulée.
   */
  function allerAuChampManquant(ancre: string) {
    if (ancre === "#livraison") ouvrirMenu("livraison", true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const cible = document.querySelector(ancre);
        if (!cible) return;
        // Le bloc tient dans l'écran et c'est la CARTE qui défile : on pose le bloc en haut de l'écran, puis on fait défiler
        // la carte seule jusqu'à la case. (scrollIntoView faisait aussi défiler la page : sur téléphone, le croquis sortait
        // de l'écran au moment même où l'on venait remplir la cote qu'il montre.)
        // La carte qui défile : le premier parent qui a son propre défilement (la rangée des modèles est elle-même une
        // carte de verre, sans défilement : on remonte jusqu'à celle qui défile).
        let carte = cible.parentElement;
        while (carte && !(carte.scrollHeight > carte.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(carte).overflowY))) {
          carte = carte.parentElement;
        }
        const bloc = document.getElementById("configuration");
        if (carte && bloc && bloc.contains(carte)) {
          amenerAlEcran(bloc, { block: "start" });
          const haut = cible.getBoundingClientRect().top - carte.getBoundingClientRect().top + carte.scrollTop - carte.clientHeight / 3;
          carte.scrollTo({ top: Math.max(0, haut), behavior: moinsDAnimations() ? "auto" : "smooth" });
        } else {
          // « center » plutôt que « start » : un bloc collé tout en haut passe sous le titre.
          amenerAlEcran(cible, { block: "center" });
        }
        // Une case à remplir, ou une liste à choisir (le type de mur).
        const champ = cible.querySelector<HTMLInputElement | HTMLSelectElement>('input:not([type="hidden"]), select');
        champ?.focus({ preventScroll: true });
      })
    );
  }

  const { add, remove, items: panier } = useCart();

  useEffect(() => {
    const bouton = boutonPanierRef.current;
    if (!bouton) return;
    const observateur = new IntersectionObserver(([entree]) =>
      setBoutonVisible(entree.isIntersecting),
    );
    observateur.observe(bouton);
    return () => observateur.disconnect();
  }, []);

  const bareme = product.surMesure;
  const rond = bareme?.forme === "rond";
  /** Un meuble se mesure en longueur × largeur, un panneau en largeur × hauteur. */
  const plan = bareme?.axes === "plan";
  /** Une table : un plateau de bois, avec sa hauteur finie. Un plafond lumineux se mesure à plat aussi, mais n'en est pas une. */
  const table = plan && product.category !== "lumiere";
  /** Le configurateur en pleine page : voir `aLeConfigurateurPleinePage`. */
  const nouvelleMiseEnPage = aLeConfigurateurPleinePage(product);
  /** Une table se mesure en longueur × largeur, un panneau en largeur × hauteur. */
  const labelPrincipale = rond
    ? t.customDiameter
    : plan
      ? t.customLength
      : t.customWidth;
  const labelSecondaire = plan ? t.customWidth : t.customHeight;
  const facteur = unite === "mm" ? 1 : unite === "cm" ? 10 : 1000;
  /** Une cote en millimètres, écrite dans l'unité choisie : « 220 cm », « 2 200 mm », « 2,2 m ». */
  /** Le nombre seul, dans l'unité choisie : « 80 », « 4 ». */
  const chiffre = (mm: number, u: "mm" | "cm" | "m" = unite) =>
    (mm / (u === "mm" ? 1 : u === "cm" ? 10 : 1000)).toLocaleString(
      locale === "en" ? "en-GB" : "fr-FR",
      { maximumFractionDigits: 2 },
    );
  /**
   * Le même nombre, mais SANS séparateur de milliers : c'est la forme qu'on
   * écrit dans une case à taper. « 2 330 » (l'espace insécable de fr-FR) et
   * « 2,330 » (la virgule de en-GB) sont faits pour être lus, pas relus : le
   * curseur réécrivait une cote que enMm ne savait plus interpréter, la valeur
   * retombait au minimum et le schéma affichait « NaN mm ».
   */
  const chiffreBrut = (mm: number, u: "mm" | "cm" | "m" = unite) => {
    const valeur = mm / (u === "mm" ? 1 : u === "cm" ? 10 : 1000);
    return String(Math.round(valeur * 1000) / 1000).replace(
      ".",
      locale === "en" ? "." : ","
    );
  };
  const enUnite = (mm: number, u: "mm" | "cm" | "m" = unite) =>
    // Une cote qu'on n'a pas su lire s'écrit « — », jamais « NaN » : c'est le
    // client qui lit ce texte, sur le schéma comme dans le tableau de détail.
    Number.isFinite(mm) ? `${chiffre(mm, u)} ${u}` : "\u2014";
  const enMm = (valeur: string) => {
    // On accepte aussi une cote écrite avec ses séparateurs, tapée ou collée :
    // « 2 330 ». En français la virgule sépare les décimales, en anglais elle
    // sépare les milliers — les deux ne se nettoient pas de la même façon.
    const sansEspaces = valeur.replace(/\s/g, "");
    const nombre = Number(
      locale === "en" ? sansEspaces.replace(/,/g, "") : sansEspaces.replace(",", ".")
    );
    return Number.isFinite(nombre) ? Math.round(nombre * facteur) : NaN;
  };
  /** La hauteur finie d'une table, en millimètres : 750 tant que rien n'est tapé. */
  const HAUTEUR_TABLE_MM = 750;
  const hauteurTableMm =
    hauteurTableSaisie === "" ? HAUTEUR_TABLE_MM : enMm(hauteurTableSaisie);
  /**
   * Changer d'unité convertit les cotes déjà tapées : « 220 » cm devient
   * « 2 200 » mm, jamais 220 mm. Sinon le prix, le lien du devis et ce que
   * le panier vend changeaient en silence à chaque bascule.
   */
  function changerUnite(nouvelle: "mm" | "cm" | "m") {
    const convertir = (valeur: string) => {
      if (valeur === "") return valeur;
      const mm = enMm(valeur);
      return Number.isFinite(mm) ? chiffreBrut(mm, nouvelle) : valeur;
    };
    setLargeurSaisie(convertir(largeurSaisie));
    setHauteurSaisie(convertir(hauteurSaisie));
    setHauteurTableSaisie(convertir(hauteurTableSaisie));
    setUnite(nouvelle);
  }

  /** Cliquer un numéro sur le croquis amène le curseur dans sa case. */
  const allerA = (cote: CoteSchema) => {
    setCoteActive(cote);
    document.getElementById(`${idTailles}-${cote}`)?.focus();
  };
  const largeurMm = enMm(largeurSaisie);
  const hauteurMm = rond ? largeurMm : enMm(hauteurSaisie);
  // L'épaisseur se saisit toujours en millimètres : c'est une cote d'atelier.
  const epaisseurMm =
    epaisseurSaisie === ""
      ? (bareme?.epaisseur.refMm ?? 0)
      : Math.round(Number(epaisseurSaisie.replace(",", ".")));
  const saisieFaite = largeurSaisie !== "" && (rond || hauteurSaisie !== "");
  const devis =
    bareme && saisieFaite
      ? devisSurMesure(product, largeurMm, hauteurMm, epaisseurMm, locale)
      : null;

  /* Dès que les cotes tapées sont valides, la pièce est « sur mesure » à ces
     cotes — le prix suit la frappe, sans bouton à presser. Effacées ou
     refusées, le sur-mesure se retire et le format choisi au catalogue
     reprend (choisirTaille vide les cases). */
  const cotesTapees =
    bareme && !product.releve && devis?.ok ? { largeurMm, hauteurMm, epaisseurMm } : null;
  const sizeId = cotesTapees ? SUR_MESURE : sizeIdChoisi;

  /* Les bornes d'épaisseur ne sont pas fixes : un plateau s'épaissit avec sa
     portée, un caisson lumineux ne peut pas être plus profond que son panneau
     n'est étroit. L'aide sous la case annonçait « 25 – 80 mm » même sur une
     table de 3,50 m, où 25 mm est refusé. */
  const porteeMm = Math.max(
    Number.isFinite(largeurMm) ? largeurMm : 0,
    Number.isFinite(hauteurMm) ? hauteurMm : 0,
  );
  const epaisseurMini = bareme
    ? porteeMm > 0
      ? epaisseurMiniMm(bareme, porteeMm)
      : bareme.epaisseur.minMm
    : 0;
  /* Number("") vaut 0, pas NaN : une case encore vide n'est donc pas « non
     finie ». Sans un test sur la saisie elle-même (saisieFaite, plus haut),
     la largeur pas encore tapée valait 0 et le caisson lumineux (qui ne
     peut pas être plus profond que son panneau n'est étroit) affichait
     « 180 – 0 mm » — une borne haute sous la borne basse — pendant qu'on
     remplissait la cote suivante. */
  const epaisseurMaxi =
    bareme && porteeMm > 0 && saisieFaite
      ? epaisseurMaxMm(bareme, largeurMm, hauteurMm)
      : (bareme?.epaisseur.maxMm ?? 0);

  /**
   * Pourquoi des cotes tapées sont refusées, en clair : repris par l'alerte
   * sous les champs ET par le bouton d'achat plus bas, pour ne jamais le dire
   * différemment aux deux endroits.
   */
  const raisonDevisTexte =
    devis && !devis.ok
      ? devis.reason === "trop_petit"
        ? t.customTooSmall
        : devis.reason === "trop_grand"
          ? table
            ? t.customTooBigTable
            : t.customTooBig
          : devis.reason === "epaisseur_trop_fine"
            ? t.customThicknessMin
                .replace("{portee}", String(porteeMm))
                .replace("{mini}", String(devis.epaisseurMiniMm ?? epaisseurMini))
            : devis.reason === "caisson_trop_profond"
              ? t.customBoxDepth
                  .replace("{cote}", String(Math.min(largeurMm, hauteurMm)))
                  .replace("{max}", String(epaisseurMaxi))
              : devis.reason === "epaisseur_hors_bornes"
                ? t.customBadThickness
                : t.customInvalid
      : null;

  /**
   * La taille courante. Une pièce sur devis peut n'en avoir aucune : la fiche
   * n'affiche alors ni prix ni dimension, juste « Sur devis » — un garde-corps
   * se chiffre à l'ouverture, pas au catalogue.
   */
  const size: ProductSize | undefined = product.surMesure
    ? product.sizes.find((s) => s.id === sizeId)
    : (product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0]);

  /**
   * Le garde-corps de fenêtre : ce sont les cotes du relevé qui font la pièce.
   * Sa forme (hauteur à la norme, croix, barreaux du bas) et son prix sont
   * ceux de l'outil de plans de l'atelier, calculés sur le serveur
   * (/api/prix-garde-corps) : la fiche les demande dès que la frappe marque
   * une pause, et ne calcule rien elle-même. Le même calcul fait le panier,
   * la commande et le devis : le prix affiché est le prix encaissé.
   */
  const estGC = prixParOutil(product);
  /** Garde-corps sur grand écran : la livraison et la barre d'achat vont dans la troisième colonne. */
  const colonneAchat = estGC && nouvelleMiseEnPage && ecranMoyen ? (achatSlot ?? null) : null;
  const versColonneAchat = (noeud: ReactNode) => (colonneAchat ? createPortal(noeud, colonneAchat) : noeud);
  const lectureReleve = estGC ? lireReleve(cotesGardeCorps, t) : null;
  const releveGC = lectureReleve?.etat === "ok" ? lectureReleve.releve : null;
  const prixGC = usePrixGardeCorps(releveGC, {
    woodId,
    metalId,
    fabricId,
    remplissageId: remplissageId || undefined,
    quantite: quantity,
  });
  const reponseGC = prixGC.statut === "pret" ? prixGC.reponse : null;
  /** La forme retenue et son prix : seulement quand l'outil dit oui (sinon « à étudier »). */
  const configGC = reponseGC?.ok ? reponseGC : null;
  /** Barreaux seuls : pas de croix, donc pas de rosace à choisir ni à payer. */
  const sansRosaceGC = configGC?.seuls === true;
  const cotesEff: { largeurMm: number; hauteurMm: number; epaisseurMm?: number } | null = estGC
    ? configGC && releveGC
      ? { largeurMm: releveGC.largeurMm, hauteurMm: configGC.hauteurMm }
      : null
    : cotesTapees;
  const sizeIdEff = estGC ? (configGC ? SUR_MESURE : "") : sizeId;

  const wood = product.woods.find((w) => w.id === woodId);
  /**
   * Le poids du colis, dit au client dans la carte : celui de l'outil pour le
   * garde-corps, estimé comme le fait le serveur (poidsColisKg) pour le reste.
   */
  const poidsKg: number | null = estGC
    ? (configGC?.kg ?? null)
    : poidsColisKg(product, {
        largeurMm: cotesEff?.largeurMm ?? size?.dimsMm?.[0],
        hauteurMm: cotesEff?.hauteurMm ?? size?.dimsMm?.[1],
        epaisseurMm: cotesEff?.epaisseurMm,
        woodId: woodId || undefined,
        remplissageId: remplissageId || undefined,
      });
  /* La surface qui fait l'écart des essences : les cotes tapées, sinon la
     taille choisie, sinon celle de la table d'origine (200 × 100). */
  const surfaceBois = surfaceTailleM2(
    sizeIdEff === SUR_MESURE ? undefined : size,
    sizeIdEff === SUR_MESURE ? cotesEff?.largeurMm : undefined,
    sizeIdEff === SUR_MESURE ? cotesEff?.hauteurMm : undefined,
  );
  const woodsAffiches = product.woods.map((bois) => ({
    ...bois,
    priceDelta: deltaBois(product, bois, surfaceBois),
  }));
  const metal = product.metals.find((m) => m.id === metalId);
  const fabric = product.fabrics?.find((f) => f.id === fabricId);
  /* Garde-corps : le choix de la main courante (quatre modèles dessinés, puis l'essence), avec les prix de l'outil. */
  const choixMainCourante = {
    options: product.woods,
    choisi: woodId,
    onChoisir: setWoodId,
    mains: reponseGC?.mains,
    prixActuel: configGC?.prix ?? null,
    renfort: configGC?.renfort === true,
    couleurAcier: metal?.swatch ?? "#1c1a18",
    locale,
  };
  // Même calcul que le panier et /api/commande : aucune divergence possible.
  const totalPiece = estGC
    ? (configGC?.prix ?? null)
    : (computeUnitPrice(product, {
        sizeId: sizeIdEff,
        woodId,
        metalId,
        fabricId,
        remplissageId: remplissageId || undefined,
        largeurMm: cotesEff?.largeurMm,
        hauteurMm: cotesEff?.hauteurMm,
        epaisseurMm: cotesEff?.epaisseurMm,
      }) ??
      size?.price ??
      null);

  /**
   * Le remplissage d'un garde-corps : les croix du modèle (leur nombre est
   * celui de l'outil), ou le verre feuilleté à leur place, avec son
   * supplément (décision du 29/09 : ajouté au prix de l'outil).
   */
  const remplissage = product.remplissages?.find(
    (option) => option.id === remplissageId,
  );
  const remplissageModele = product.remplissages?.[0];
  const verre = product.remplissages?.find((option) => option.sansCroix);
  const supplementVerre =
    verre && configGC && releveGC
      ? supplementRemplissage(verre, releveGC.largeurMm, configGC.hauteurMm)
      : null;
  /** Ce qui s'affiche dans le sélecteur : une taille du catalogue ou les cotes. */
  const labelTaille = estGC
    ? configGC && releveGC
      ? {
          ok: true as const,
          label: libelleGardeCorps(
            releveGC.largeurMm,
            configGC.hauteurMm,
            remplissage?.sansCroix ? null : configGC.croix,
            locale,
            // Le même libellé que celui du serveur (panier, commande) : la traverse, les barreaux, le carré.
            { soubassement: configGC.soubassementMm > 0, carre: configGC.carre, traverse: configGC.traverse, renfort: configGC.renfort, seuls: configGC.seuls },
          ),
        }
      : null
    : sizeIdEff === SUR_MESURE && cotesEff
      ? devisSurMesure(
          product,
          cotesEff.largeurMm,
          cotesEff.hauteurMm,
          cotesEff.epaisseurMm,
          locale,
        )
      : null;

  /**
   * L'atelier vient mesurer : c'est la VISITE qu'on met au panier, pas le
   * garde-corps. Son prix vient du serveur (le code postal), son créneau de
   * l'agenda ; il faut les deux avant de pouvoir l'ajouter.
   */
  const modeVisite =
    product.priseDeCotes === true && cotesGardeCorps.qui === "atelier";
  const creneauVisite = modeVisite ? lireCreneau(cotesGardeCorps.rdv) : null;
  const visitePrete =
    modeVisite &&
    cotesGardeCorps.deplacement !== null &&
    creneauVisite !== null;
  const prixVisite =
    modeVisite && cotesGardeCorps.deplacement
      ? cotesGardeCorps.deplacement.montantCents / 100
      : null;
  /** Ce qui s'affiche en grand et part au panier : la visite, sinon la pièce. */
  const total = modeVisite ? prixVisite : totalPiece;
  /**
   * Le prix du cadre sur-mesure, options comprises.
   * Il n'affichait que le barème au mètre carré : une table demandée en noyer
   * s'annonçait 3 500 € et se facturait 4 210 €, le supplément d'essence
   * n'ayant jamais été ajouté. C'est le même calcul que le serveur.
   */
  const prixSurMesure = devis?.ok
    ? computeUnitPrice(product, {
        sizeId: SUR_MESURE,
        woodId,
        metalId,
        fabricId,
        largeurMm,
        hauteurMm,
        epaisseurMm,
      })
    : null;
  const orderable = product.orderMode === "cart";
  /**
   * Le prix d'appel, montré tant que la pièce n'a pas encore ses cotes. Pas
   * sur une pièce qui se relève : « à partir de 380 € » avant les cotes se
   * lisait comme le prix du garde-corps ; on promet le prix immédiat à la place.
   */
  const prixDepart = product.releve ? null : priceFrom(product);
  /**
   * Plusieurs garde-corps : les frais fixes de l'atelier ne comptent qu'une
   * fois (décision du 29/09) — la remise que le serveur donne pour cette
   * quantité, jamais sous le prix plancher. Avec d'autres garde-corps déjà au
   * panier, elle est recalculée au panier, sur tous.
   */
  const dejaAuPanier = estGC
    ? panier
        .filter((ligne) => ligne.slug === product.slug)
        .reduce((somme, ligne) => somme + ligne.quantity, 0)
    : 0;
  const remiseGC = estGC && !modeVisite && configGC ? configGC.remise : 0;
  /** Ce que coûte la façon de recevoir la pièce (0 pour le retrait), ou null tant que le prix manque. */
  const montantLivraisonChoisie = montantLivraison(pose);
  /**
   * Le prix vraiment dû : la pièce fois la quantité, moins la remise de
   * plusieurs garde-corps, plus la livraison ou la pose — comptée une seule
   * fois, jamais par pièce. C'est ce chiffre-là qui s'affiche en grand : le
   * client ne doit pas découvrir le coût du transport seulement au panier.
   */
  const prixFinal =
    total !== null
      ? total * quantity + remiseGC + (!modeVisite && montantLivraisonChoisie !== null ? montantLivraisonChoisie : 0)
      : null;
  /** Le délai, lu dans les caractéristiques : « Fabrication » / « Lead time ». */
  const delai = product.specs.find((spec) =>
    /fabrication|lead time/i.test(spec.label),
  )?.value;

  /** Le format choisi sur une pièce sur devis sans prix, en toutes lettres. */
  const formatDevisLabel = !formatsDevis
    ? null
    : formatDevisId === SUR_MESURE
      ? t.sizeLabel
      : (formatsDevis.tailles.find((f) => f.id === formatDevisId)?.label ?? null);
  const optionsPiece = [
    formatDevisLabel ??
      (sizeIdEff === SUR_MESURE && labelTaille?.ok
        ? labelTaille.label
        : product.sizes.length > 1
          ? (size?.label ?? null)
          : null),
    wood?.label,
    metal?.label,
    // Sous le verre, plus de croix ni de rosace.
    remplissage?.sansCroix || sansRosaceGC ? null : fabric?.label,
    remplissage && remplissage !== remplissageModele ? remplissage.label : null,
  ]
    .filter(Boolean)
    .join(" · ");
  /**
   * Sans prix du serveur (barre d'appui, garde-corps à étudier), le libellé n'a pas les cotes : on les ajoute à
   * la demande de devis (paramètre « releve » de la page contact). C'est là que l'atelier en a le plus besoin.
   */
  const cotesPourDevisGC =
    estGC && releveGC && !configGC
      ? locale === "fr"
        ? `Fenêtre : ${releveGC.largeurMm} mm de large, bas à ${releveGC.allegeMm} mm du sol${releveGC.fenetreMm ? `, ${releveGC.fenetreMm} mm de haut` : ""}, ${releveGC.enEtage ? "en étage" : "au rez-de-chaussée"}${reponseGC && !reponseGC.ok && reponseGC.raison === "barre-appui" ? " — main courante seule" : ""}`
        : `Window: ${releveGC.largeurMm} mm wide, bottom ${releveGC.allegeMm} mm from the floor${releveGC.fenetreMm ? `, ${releveGC.fenetreMm} mm high` : ""}, ${releveGC.enEtage ? "upstairs" : "ground floor"}${reponseGC && !reponseGC.ok && reponseGC.raison === "barre-appui" ? " — handrail on its own" : ""}`
      : null;
  /** Sous le grand prix : la pièce configurée, ou la visite et son créneau. */
  const optionsLabel = modeVisite
    ? [
        // La pièce d'abord — elle est sur devis — puis la visite et son prix.
        t.gcPieceApresVisite,
        prixVisite !== null
          ? `${t.gcVisiteLigne.replace("{prix}", prixAffiche(prixVisite, locale))} — Saumur → ${cotesGardeCorps.codePostal.replace(/\s+/g, "")}`
          : t.gcVisiteLigneDepart,
        creneauVisite && libelleCreneau(creneauVisite, locale),
      ]
        .filter(Boolean)
        .join(" · ")
    : optionsPiece;

  /**
   * La confirmation reste affichée tant qu'on ne touche à rien : dès que la
   * configuration change, elle ne parle plus de la même pièce et disparaît
   * d'elle-même — sans effet, donc sans rendu en cascade.
   */
  const configuration = [
    sizeIdEff,
    woodId,
    metalId,
    fabricId,
    cotesEff?.largeurMm,
    cotesEff?.hauteurMm,
    cotesEff?.epaisseurMm,
    cotesGardeCorps.qui,
    cotesGardeCorps.codePostal,
    cotesGardeCorps.rdv,
    cotesGardeCorps.mur,
    cotesGardeCorps.largeur,
    cotesGardeCorps.allege,
    cotesGardeCorps.fenetre,
    cotesGardeCorps.etage,
    cotesGardeCorps.modele ?? "",
    remplissageId,
    quantity,
    formatDevisId,
    pose.mode,
  ].join("|");
  const added = ajoutee === configuration;

  /* Mise de côté : même principe que la confirmation d'ajout au panier —
     elle vaut pour CETTE configuration, et s'efface dès qu'on change une
     cote, puisque ce n'est plus la pièce qu'on a mise de côté. */
  const favoriFait = misDeCote === configuration;

  /* --- La liste des dimensions au clavier --- */
  function ouvrirFermerTailles() {
    setSizesOpen((ouvert) => {
      if (!ouvert) {
        const courant = product.sizes.findIndex(
          (taille) => taille.id === sizeId,
        );
        setLigneClavier(courant < 0 ? 0 : courant);
      }
      return !ouvert;
    });
  }

  function choisirTaille(id: string) {
    setSizeId(id);
    // On quitte le sur-mesure : les cotes ne comptent plus, et les cases se
    // vident, sinon elles reprendraient la main à la frappe suivante.
    setLargeurSaisie("");
    setHauteurSaisie("");
    setSizesOpen(false);
    const index = product.sizes.findIndex((taille) => taille.id === id);
    setLigneClavier(index < 0 ? 0 : index);
  }

  function clavierTailles(event: React.KeyboardEvent<HTMLButtonElement>) {
    const nombre = product.sizes.length;
    /** Flèches : on ouvre la liste si besoin, puis on descend ou on remonte. */
    function deplacer(pas: number) {
      event.preventDefault();
      if (!sizesOpen) {
        ouvrirFermerTailles();
        return;
      }
      setLigneClavier((ligne) => (ligne + pas + nombre) % nombre);
    }

    switch (event.key) {
      case "ArrowDown":
        deplacer(1);
        break;
      case "ArrowUp":
        deplacer(-1);
        break;
      case "Home":
        event.preventDefault();
        if (!sizesOpen) ouvrirFermerTailles();
        setLigneClavier(0);
        break;
      case "End":
        event.preventDefault();
        if (!sizesOpen) ouvrirFermerTailles();
        setLigneClavier(nombre - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (sizesOpen) choisirTaille(product.sizes[ligneClavier].id);
        else ouvrirFermerTailles();
        break;
      case "Escape":
        if (sizesOpen) {
          event.preventDefault();
          setSizesOpen(false);
        }
        break;
      case "Tab":
        setSizesOpen(false);
        break;
    }
  }

  /**
   * Le devis en PDF de cette configuration (/api/devis-pdf), dès que tout est
   * choisi : une taille ou des cotes valides, et — quand la fiche le demande —
   * un code postal chiffré. Le lien ne porte que des identifiants et des
   * cotes ; le serveur recalcule chaque prix.
   */
  /**
   * Une pièce trop encombrante pour un transporteur ne se livre pas : elle
   * est posée par l'atelier. Le configurateur cesse alors d'offrir un choix
   * qui n'en est pas un (voir livrableParTransporteur, products.ts).
   */
  const poseObligatoire = !livrableParTransporteur(product, {
    largeurMm: cotesEff?.largeurMm ?? size?.dimsMm?.[0],
    hauteurMm: cotesEff?.hauteurMm ?? size?.dimsMm?.[1],
  });

  /**
   * Le colis que /api/deplacement pèse pour la livraison par transporteur :
   * la pièce, ses cotes (ou le relevé du garde-corps), son essence, son
   * remplissage et sa quantité. null : la pièce n'a pas encore de prix (le
   * garde-corps attend ses cotes ou l'outil), rien à peser.
   */
  const colisLivraison = (() => {
    const q = new URLSearchParams({ slug: product.slug });
    if (estGC) {
      if (!configGC || !releveGC) return null;
      q.set("l", String(releveGC.largeurMm));
      q.set("allege", String(releveGC.allegeMm));
      q.set("etage", releveGC.enEtage ? "1" : "0");
      q.set("fenetre", String(releveGC.fenetreMm));
      if (releveGC.modele) q.set("modele", releveGC.modele);
    } else {
      const l = cotesEff?.largeurMm ?? size?.dimsMm?.[0];
      const w = cotesEff?.hauteurMm ?? size?.dimsMm?.[1];
      if (l) q.set("l", String(l));
      if (w) q.set("w", String(w));
      if (cotesEff?.epaisseurMm) q.set("t", String(cotesEff.epaisseurMm));
    }
    if (woodId) q.set("wood", woodId);
    // La rosace choisie : un modèle qui ne passe la norme qu'avec le grand médaillon doit se peser avec lui.
    if (estGC && fabricId) q.set("fabric", fabricId);
    if (remplissageId) q.set("remplissage", remplissageId);
    q.set("qty", String(quantity));
    return q.toString();
  })();

  const urlDevis = (() => {
    // Une pièce sur devis (l'escalier) s'estime d'après sa configuration,
    // même quand la fiche est en mode « visite de l'atelier » : c'est la
    // pièce qu'on estime, pas le rendez-vous.
    if (orderable ? total === null || modeVisite : totalPiece === null) return null;
    if (product.poseOption && orderable && !livraisonPrete(pose)) return null;
    const p = new URLSearchParams({
      slug: product.slug,
      lang: locale,
      qty: String(quantity),
    });
    if (estGC) {
      // Le garde-corps : le relevé. Le serveur en tire la forme et le prix (l'outil de plans).
      if (!releveGC) return null;
      p.set("l", String(releveGC.largeurMm));
      p.set("allege", String(releveGC.allegeMm));
      p.set("etage", releveGC.enEtage ? "1" : "0");
      p.set("fenetre", String(releveGC.fenetreMm));
      // Pas de devis sans modèle choisi, comme pour le panier : le serveur chiffrerait un modèle par défaut
      // que le client n'a pas choisi.
      if (!releveGC.modele) return null;
      p.set("modele", releveGC.modele);
    } else {
      if (sizeIdEff) p.set("size", sizeIdEff);
      if (cotesEff?.largeurMm) p.set("l", String(cotesEff.largeurMm));
      if (cotesEff?.hauteurMm) p.set("w", String(cotesEff.hauteurMm));
      if (cotesEff?.epaisseurMm) p.set("t", String(cotesEff.epaisseurMm));
    }
    if (
      table &&
      sizeIdEff === SUR_MESURE &&
      Number.isFinite(hauteurTableMm) &&
      hauteurTableMm !== HAUTEUR_TABLE_MM
    ) {
      p.set("h", String(hauteurTableMm));
    }
    if (woodId) p.set("wood", woodId);
    if (metalId) p.set("metal", metalId);
    if (fabricId) p.set("fabric", fabricId);
    if (remplissageId) p.set("remplissage", remplissageId);
    if (product.poseOption && orderable && livraisonPrete(pose)) {
      p.set("mode", pose.mode);
      if (pose.mode !== "retrait") p.set("cp", pose.codePostal.replace(/\s+/g, ""));
    }
    if (coordonnees.nom.trim()) p.set("nom", coordonnees.nom.trim());
    if (coordonnees.email.trim()) p.set("email", coordonnees.email.trim());
    return `/api/devis-pdf?${p.toString()}`;
  })();

  /**
   * Pourquoi le bouton reste grisé, à dire au client — sans ce mot, une cote
   * hors barème ou un code postal manquant laissaient un bouton mort et
   * personne ne savait pourquoi. Chaque raison renvoie vers le bon endroit
   * de la fiche (mêmes ancres que « Prise de cotes à domicile »).
   */
  /** Le garde-corps a un prix, mais le client n'a pas encore choisi son modèle parmi ceux aux normes. */
  const modeleAChoisir = estGC && !modeVisite && Boolean(configGC) && !cotesGardeCorps.modele;
  /** Le type de mur est obligatoire (décision de Quentin, 05/10) : il décide des chevilles et de la fixation fournies. */
  const murAChoisir = estGC && !modeVisite && Boolean(configGC) && !cotesGardeCorps.mur;
  const raisonIndisponible: { message: string; ancre: string } | null = modeVisite
    ? !visitePrete
      ? { message: t.raisonVisiteIncomplete, ancre: "#cotes" }
      : null
    : murAChoisir
      ? { message: locale === "fr" ? "Choisissez le type de mur : il décide des chevilles et de la fixation que nous fournissons." : "Choose the wall type: it decides the plugs and fixings we supply.", ancre: "#mur-gc" }
    : modeleAChoisir
      ? { message: locale === "fr" ? "Choisissez votre modèle de garde-corps parmi ceux proposés." : "Choose your railing model among those offered.", ancre: "#modeles-gc" }
    : total === null
      ? // Le même texte que l'alerte sous les champs (raisonDevisTexte) : une
        // fois les deux cotes tapées hors barème, cotesTapees repasse à null
        // et ne dit plus pourquoi tout seul.
        raisonDevisTexte
        ? { message: raisonDevisTexte, ancre: "#cotes" }
        : bareme && !product.releve
          ? { message: t.raisonCotesManquantes, ancre: "#cotes" }
          : // Le garde-corps de fenêtre relève ses propres cotes (largeur,
            // allège, hauteur de la fenêtre), puis attend l'outil de plans.
            estGC
            ? lectureReleve?.etat === "incomplet"
              ? // Ce qui manque, dit précisément : « la mesure ① », pas « indiquez la largeur et la hauteur ».
                { message: texteManqueGC(lectureReleve, locale) ?? t.raisonCotesGardeCorps, ancre: "#cotes" }
              : lectureReleve?.etat === "hors-bornes" && lectureReleve.raison === "allege"
                ? { message: locale === "fr" ? "Votre fenêtre n'a pas besoin de garde-corps." : "Your window does not need a railing.", ancre: "#cotes" }
              : prixGC.statut === "calcul"
                ? { message: t.gcCalcul, ancre: "#cotes" }
                : prixGC.statut === "indisponible" || prixGC.statut === "erreur"
                  ? { message: t.gcPrixIndisponible, ancre: "#cotes" }
                  : reponseGC && !reponseGC.ok && reponseGC.raison === "barre-appui"
                    ? { message: locale === "fr" ? "Pour cette fenêtre : une main courante seule, sur devis. Demandez-nous un devis." : "For this window: a handrail on its own, on quotation. Ask us for a quote.", ancre: "#cotes" }
                    : reponseGC && !reponseGC.ok && reponseGC.raison === "sans-garde-corps"
                      ? { message: locale === "fr" ? "Votre fenêtre n'a pas besoin de garde-corps." : "Your window does not need a railing.", ancre: "#cotes" }
                      : { message: t.raisonGcAEtudier, ancre: "#cotes" }
            : null
      : product.poseOption && !livraisonPrete(pose)
        ? { message: t.raisonCodePostalLivraison, ancre: "#livraison" }
        : null;

  /** Le lien vers le devis, sous la barre d'achat ou sous « Demander un devis ». */
  const coordonneesCompletes = Boolean(coordonnees.nom.trim() && coordonnees.email.trim());
  const idRaisonDevis = `${idTailles}-devis-raison`;
  const devisIcone = (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M5 2.5h6.5L15 6v11.5H5z" strokeLinejoin="round" />
      <path d="M11.5 2.5V6H15M7.5 10h5M7.5 13h5" strokeLinecap="round" />
    </svg>
  );
  /** Un bloqueur de popup peut refuser le nouvel onglet : on ouvre alors dans le même. */
  function ouvrirPdf(url: string) {
    const fenetre = window.open(url, "_blank", "noopener");
    if (!fenetre) window.location.href = url;
  }
  /**
   * Partir créer son compte sans rien perdre. On met la configuration de côté
   * AVANT de quitter la page (voir config-memo.ts), et on demande à revenir
   * sur cette fiche : au retour, les cotes, l'essence et la teinte sont
   * toujours là.
   */
  function configActuelle(): ConfigMemo {
    return {
      slug: product.slug,
      unite,
      largeur: largeurSaisie,
      hauteur: hauteurSaisie,
      epaisseur: epaisseurSaisie,
      hauteurTable: hauteurTableSaisie,
      // Sur une pièce sur devis sans prix, c'est le format choisi (voir formatsDevis).
      // Le garde-corps est toujours « sur mesure » : son relevé l'identifie. (sizeIdEff dépend du prix : un favori
      // mis de côté pendant le recalcul n'avait pas le même identifiant qu'une seconde plus tard — un doublon.)
      sizeId: formatsDevis ? formatDevisId : estGC ? SUR_MESURE : sizeIdEff,
      woodId,
      metalId,
      fabricId,
      remplissageId,
      quantity,
      codePostal: pose.codePostal,
      poseVoulue: pose.mode === "pose",
      modeLivraison: pose.mode,
      // Le garde-corps n'a pas de cotes de table : sa pièce, c'est son relevé.
      ...(estGC ? releveVersMemo(cotesGardeCorps, t) : {}),
    };
  }
  function allerCreerCompte() {
    memoriserConfig(configActuelle());
    router.push(
      `/${locale}/compte/connexion?suite=${encodeURIComponent(`/${locale}/artisanat/${product.slug}`)}`
    );
  }

  /**
   * Mettre la pièce de côté, avec ses cotes et ses choix.
   *
   * On ne demande PAS au serveur, en rendant la page, si le visiteur est
   * connecté : cette fiche est pré-calculée pour tout le monde, et lire un
   * témoin la rendrait dynamique — donc plus lente, pour un bouton. On
   * tente l'enregistrement, et c'est le 401 qui nous apprend qu'il faut
   * d'abord se connecter. La configuration est alors mise de côté dans le
   * navigateur, comme pour le devis : il la retrouvera au retour.
   */
  async function mettreDeCote() {
    if (favoriEnvoi) return;
    setFavoriEnvoi(true);
    const config = configActuelle();
    // Deux fenêtres aux mêmes options font deux favoris : la largeur, en tête
    // du résumé, permet de les distinguer dans la liste.
    const fenetre =
      config.gcLargeurMm === undefined
        ? null
        : locale === "fr"
          ? `Fenêtre de ${config.gcLargeurMm} mm`
          : `${config.gcLargeurMm} mm window`;
    try {
      const reponse = await fetch("/api/compte/favoris", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: product.slug,
          titre: product.name,
          resume: [fenetre, optionsLabel].filter(Boolean).join(" · "),
          prixCents: total !== null ? Math.round(total * 100) : null,
          config,
        }),
      });
      if (reponse.status === 401) {
        memoriserConfig(config);
        router.push(
          `/${locale}/compte/connexion?suite=${encodeURIComponent(`/${locale}/artisanat/${product.slug}`)}`
        );
        return;
      }
      if (!reponse.ok) throw new Error("refus");
      setMisDeCote(configuration);
    } catch {
      // Silencieux : le bouton reprend son libellé d'origine, et le client
      // peut réessayer. Une pièce non mise de côté n'empêche pas d'acheter.
    } finally {
      setFavoriEnvoi(false);
    }
  }
  /** Le nom et l'adresse manquent encore : on les demande avant d'ouvrir le PDF, pas après. */
  function ouvrirDevis() {
    if (!urlDevis) return;
    if (coordonneesCompletes) {
      ouvrirPdf(urlDevis);
    } else {
      devisDialogRef.current?.showModal();
    }
  }
  const champCoordonnees = (
    label: string,
    cle: keyof typeof coordonnees,
    props: Partial<ComponentProps<"input">> = {},
  ) => (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">
        {label}
      </span>
      <input
        value={coordonnees[cle]}
        onChange={(e) => setCoordonnees((c) => ({ ...c, [cle]: e.target.value }))}
        className="mt-1 w-full rounded-none border-0 border-b border-[#9a8d80] bg-transparent px-0 py-1.5 text-sm text-[#2b2320] transition-[border-color,box-shadow] placeholder:text-[#726757] focus:border-[#2b2320] focus:shadow-[0_1px_0_0_#2b2320] focus:outline-none"
        {...props}
      />
    </label>
  );
  /**
   * Une pièce qui n'a encore aucun prix — ni taille chiffrée, ni barème (la
   * table résine, sur devis en attendant ses tarifs) — n'a rien à estimer :
   * son bouton PDF resterait grisé pour toujours, sans raison à donner. On
   * ne le montre pas. Il revient de lui-même le jour où la pièce a ses prix.
   */
  // Le garde-corps n'a ni tailles ni barème (son prix vient de l'outil) : il a pourtant son devis PDF.
  const chiffrable = product.sizes.length > 0 || Boolean(bareme) || estGC;
  /**
   * Le devis PDF, et la fenêtre qui demande le nom et l'e-mail avant de
   * l'ouvrir. Le bouton est TOUJOURS là (sauf sur une pièce sans aucun
   * prix, voir `chiffrable`), même quand il ne sert pas encore :
   * un bouton qui apparaît en cours de route se remarque moins qu'un bouton
   * grisé, et on ne sait pas qu'on aurait pu télécharger un devis. Grisé, il
   * dit ce qu'il attend (raisonIndisponible, la même phrase que sous le
   * bouton d'achat).
   */
  /* Le garde-corps sur grand écran : le devis PDF et « Mettre de côté » sont deux petits liens sur UNE ligne (la colonne d'achat ne défile pas). */
  const liensSerres = Boolean(colonneAchat && estGC);
  /** Une autre fenêtre : on vide les cotes, on garde le bois et l'acier, et le curseur revient dans la première case. */
  const autreFenetre = () => {
    // L'étage et le modèle aussi : ils dépendent de la fenêtre, et rien ne doit être choisi d'avance (décision du 03/10) —
    // le modèle d'avant validait le panier tout seul.
    setCotesGardeCorps({ ...cotesGardeCorps, largeur: "", allege: "", fenetre: "", etage: "", modele: "" });
    setQuantity(1);
    setAjoutee(null);
    const premiere = releveRef.current?.querySelector<HTMLInputElement>("input[inputmode=decimal]");
    premiere?.focus();
    premiere?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const lienDevis = (
    <div className={liensSerres ? "mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1" : "mt-3"}>
      {/* Le lien « Détails » (poids, ce que comprend le prix) : la fenêtre flottante y est posée (detailsSlot). */}
      {liensSerres && <div ref={setDetailsSlot} />}
      {chiffrable && (
        <button
          type="button"
          onClick={ouvrirDevis}
          disabled={!urlDevis}
          aria-describedby={!urlDevis && raisonIndisponible ? idRaisonDevis : undefined}
          className={liensSerres ? `inline-flex items-center gap-1.5 text-[12px] font-medium underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${urlDevis ? "text-[#2b2320] hover:text-[#6d2c2c]" : "cursor-not-allowed text-[#6f6357] no-underline opacity-70"}` : `flex w-full items-center justify-center gap-2.5 rounded-full border px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
            urlDevis
              ? "border-[#2b2320] text-[#2b2320] hover:bg-[#2b2320] hover:text-white"
              : "cursor-not-allowed border-[#c9bfb2] text-[#6f6357]"
          }`}
        >
          {!liensSerres && devisIcone}
          {liensSerres ? (locale === "fr" ? "Devis PDF" : "Quote PDF") : orderable ? t.devisPdf : t.estimationPdf}
        </button>
      )}
      {/* Pourquoi il est grisé — sans ce mot, le bouton a l'air cassé. */}
      {chiffrable && !urlDevis && raisonIndisponible && !nouvelleMiseEnPage && (
        <p id={idRaisonDevis} className="mt-2 text-center text-xs leading-relaxed text-[#6f6357]">
          {raisonIndisponible.message}
        </p>
      )}

      {/* Mettre la pièce de côté : on garde les cotes et les choix, pas
          seulement le nom de l'article. Discret, en dessous du devis — ce
          n'est pas l'action principale, mais c'est celle qui ramène. */}
      {compteOuvert && !modeVisite && (
        <p className={liensSerres ? "" : "mt-3 text-center"}>
          <button
            type="button"
            onClick={mettreDeCote}
            disabled={favoriEnvoi}
            aria-pressed={favoriFait}
            className="inline-flex items-center gap-2 text-[12px] font-medium text-[#2b2320] underline underline-offset-4 transition-colors hover:text-[#6d2c2c] disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill={favoriFait ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.3"
            >
              {/* Un signet, pas un cœur : on met une pièce de côté pour y
                  revenir, on ne la « like » pas. */}
              <path d="M5.5 2.75h9v14.5L10 13.4l-4.5 3.85z" strokeLinejoin="round" />
            </svg>
            {favoriFait ? t.favoriBoutonFait : t.favoriBouton}
          </button>
        </p>
      )}
      {/* <dialog> natif : Échap et le clic sur le fond referment tout seuls,
          sans bibliothèque — même choix que le zoom photo de la galerie. */}
      <dialog
        ref={devisDialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) devisDialogRef.current?.close();
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-[#e5ddd3] bg-white p-6 backdrop:bg-[#2b2320]/50"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            devisDialogRef.current?.close();
            if (urlDevis) ouvrirPdf(urlDevis);
          }}
        >
          <p className="text-lg font-medium text-[#2b2320]">{t.coordonneesTitle}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6f6357]">{t.coordonneesNote}</p>
          <div className="mt-4 grid gap-4">
            {/* Safari (iPhone) propose « Remplir avec mes contacts » d'après le nom du champ et son autocomplete :
                on lui donne les deux (name, autoComplete) ainsi que le type de clavier. */}
            {champCoordonnees(t.coordonneesNom, "nom", {
              required: true,
              maxLength: MAX_TEXTE.name,
              name: "name",
              type: "text",
              autoComplete: "name",
              autoCapitalize: "words",
              enterKeyHint: "next",
              autoFocus: true,
            })}
            {champCoordonnees(t.coordonneesEmail, "email", {
              required: true,
              type: "email",
              maxLength: MAX_TEXTE.email,
              pattern: EMAIL_MOTIF,
              name: "email",
              autoComplete: "email",
              inputMode: "email",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              enterKeyHint: "done",
            })}
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => devisDialogRef.current?.close()}
              className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#6f6357] hover:text-[#2b2320]"
            >
              {t.coordonneesAnnuler}
            </button>
            <button
              type="submit"
              className="btn-verre flex flex-1 items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
            >
              {devisIcone}
              {orderable ? t.devisPdf : t.estimationPdf}
            </button>
          </div>
          {/* L'autre chemin : créer un compte plutôt que de laisser ses
              coordonnées pour un seul PDF. La configuration part en mémoire
              avant la redirection, et revient avec le client. */}
          {compteOuvert && (
            <p className="mt-5 border-t border-[#e5ddd3] pt-4 text-center">
              <button
                type="button"
                onClick={allerCreerCompte}
                className="text-[13px] font-medium text-[#2b2320] underline underline-offset-4 hover:text-[#6d2c2c]"
              >
                {t.coordonneesCompte}
              </button>
              <span className="mt-1 block text-xs leading-relaxed text-[#6f6357]">
                {t.coordonneesCompteNote}
              </span>
            </p>
          )}
        </form>
      </dialog>
      {/* Avant l'ouverture des commandes : la configuration est déjà au
          panier, le client laisse son e-mail pour passer en priorité. */}
      {ouverture && (
        <dialog
          ref={ouvertureDialogRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) ouvertureDialogRef.current?.close();
          }}
          aria-labelledby={idOuvertureTitre}
          className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-[#e5ddd3] bg-white p-6 backdrop:bg-[#2b2320]/50"
        >
          <p id={idOuvertureTitre} className="text-lg font-medium leading-snug text-[#2b2320]">
            {ouverture.t.prevenirTitre}
          </p>
          <p className="mt-2 text-[13px] font-medium text-[#2a6b3a]">✓ {t.ouvertureGardee}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#4a4038]">{ouverture.t.prevenirTexte}</p>
          <InscriptionOuverture
            key={ouvertureCle}
            t={ouverture.t}
            locale={locale}
            contactEmail={ouverture.contactEmail}
            emailInitial={coordonnees.email}
            autoFocus
            lignes={panier.map(
              (item) =>
                `${item.name}${item.optionsLabel ? ` (${item.optionsLabel})` : ""} × ${item.quantity}${item.unitPrice > 0 ? ` — ${prixAffiche(item.unitPrice * item.quantity, locale)}` : ""}`,
            )}
          />
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#e5ddd3] pt-4">
            <button
              type="button"
              onClick={() => ouvertureDialogRef.current?.close()}
              className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#6f6357] hover:text-[#2b2320]"
            >
              {t.ouvertureFermer}
            </button>
            <Link
              href={`/${locale}/panier`}
              className="text-[13px] font-medium text-[#2b2320] underline underline-offset-4 hover:text-[#6d2c2c]"
            >
              {VOIR_PANIER[locale]}
            </Link>
          </div>
        </dialog>
      )}
    </div>
  );

  /** Avant l'ouverture des commandes : la pièce va au panier, puis l'inscription s'ouvre. */
  function sInscrire() {
    addToCart();
    setOuvertureCle((cle) => cle + 1);
    ouvertureDialogRef.current?.showModal();
  }

  function addToCart() {
    // Pas de cotes, pas de pièce : le bouton est grisé, ceci n'est qu'un filet.
    if (total === null) return;
    if (modeVisite) {
      if (!visitePrete || !cotesGardeCorps.deplacement) return;
      add(
        {
          slug: PRISE_DE_COTES,
          priseDeCotesCp: cotesGardeCorps.codePostal.replace(/\s+/g, ""),
          rdv: cotesGardeCorps.rdv,
          // Ce que le client a en tête, pour que Quentin arrive avec la bonne idée.
          note: [product.name, wood?.label, metal?.label]
            .filter(Boolean)
            .join(" · "),
          name: t.gcVisiteResume,
          optionsLabel,
          unitPrice: cotesGardeCorps.deplacement.montantCents / 100,
        },
        1,
      );
      setAjoutee(configuration);
      return;
    }
    add(
      {
        slug: product.slug,
        sizeId: sizeIdEff,
        largeurMm: cotesEff?.largeurMm,
        hauteurMm: cotesEff?.hauteurMm,
        epaisseurMm: cotesEff?.epaisseurMm,
        // Le relevé du garde-corps : c'est avec lui que le serveur recalcule la
        // forme et le prix (la hauteur ci-dessus n'en est qu'une copie).
        ...(estGC && releveGC
          ? { allegeMm: releveGC.allegeMm, enEtage: releveGC.enEtage, fenetreMm: releveGC.fenetreMm, modeleGc: releveGC.modele }
          : {}),
        // Et la note pour l'atelier (étage, mur, allège, fenêtre).
        note:
          estGC
            ? noteGardeCorps(cotesGardeCorps, t, configGC, locale) || undefined
            : // Une table à vos cotes : sa hauteur finie part avec, quand elle n'est pas celle d'usage.
              table &&
                sizeIdEff === SUR_MESURE &&
                Number.isFinite(hauteurTableMm) &&
                hauteurTableMm !== HAUTEUR_TABLE_MM
              ? t.customTableHeightNote.replace(
                  "{h}",
                  (hauteurTableMm / 10).toLocaleString(
                    locale === "en" ? "en-GB" : "fr-FR",
                  ),
                )
              : undefined,
        woodId: woodId || undefined,
        metalId: metalId || undefined,
        fabricId: fabricId || undefined,
        remplissageId: remplissageId || undefined,
        name: product.name,
        optionsLabel,
        unitPrice: total ?? 0,
        image: fabric?.image ?? product.images[0]?.src,
      },
      quantity,
    );
    // Comment la commande part (transporteur, pose, ou retrait à l'atelier) :
    // une ligne à part, une seule par panier — un seul trajet, un seul colis.
    // Si une autre pièce l'avait déjà choisie, on la remplace par celle-ci.
    // Son prix n'est qu'une copie : le panier le redemande au serveur, qui pèse
    // TOUTES les pièces de la commande (src/lib/tarif-panier.ts).
    const deplacement = pose.deplacement;
    if (product.poseOption && (pose.mode === "retrait" || deplacement)) {
      panier
        .filter((ligne) => ligne.slug === POSE || ligne.slug === LIVRAISON || ligne.slug === RETRAIT)
        .forEach((ligne) => remove(ligne.id));
      const cp = pose.codePostal.replace(/\s+/g, "");
      add(
        pose.mode === "retrait" || !deplacement
          ? { slug: RETRAIT, name: t.retraitResume, optionsLabel: "", unitPrice: 0 }
          : pose.mode === "pose"
            ? {
                slug: POSE,
                poseCp: cp,
                name: t.poseResume,
                optionsLabel: deplacement.commune,
                unitPrice: deplacement.montantCents / 100,
              }
            : {
                slug: LIVRAISON,
                livraisonCp: cp,
                name: t.livraisonResume,
                optionsLabel: deplacement.commune,
                unitPrice: deplacement.montantCents / 100,
              },
        1,
      );
    }
    setAjoutee(configuration);
  }

  /** Ce que le prix comprend : le délai, la livraison, l'atelier, le paiement — et le drapeau. */
  const listeInclus = (
    <>
      <ul
        className={
          nouvelleMiseEnPage
            ? "grid gap-1 text-[11px] leading-snug text-[#5c5140]"
            : "mt-4 grid gap-1.5 border-t border-[#e5ddd3] pt-3 text-xs leading-relaxed text-[#5c5140]"
        }
      >
        {/* Pour une visite, ni délai de fabrication ni livraison : seul le paiement sécurisé reste vrai. */}
        {(modeVisite
          ? [t.inclusAtelier, t.inclusPaiement]
          : [
              delai,
              // Le garde-corps se pose soi-même, fixations fournies : pas de montage sur place.
              product.poseOption
                ? t.inclusLivraisonTable
                : product.releve === "garde-corps-fenetre"
                  ? t.inclusLivraisonPose
                  : t.inclusLivraison,
              t.inclusAtelier,
              orderable ? t.inclusPaiement : null,
            ]
        )
          .filter(Boolean)
          .map((ligne) => (
            <li key={ligne} className={nouvelleMiseEnPage ? "flex items-start gap-1.5" : "flex items-start gap-2.5"}>
              <svg
                viewBox="0 0 20 20"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={nouvelleMiseEnPage ? "mt-[1px] h-3 w-3 shrink-0 text-[#2b2320]" : "mt-[2px] h-3.5 w-3.5 shrink-0 text-[#2b2320]"}
              >
                <path d="M4 10.5l4 4 8-9" />
              </svg>
              <span>{ligne}</span>
            </li>
          ))}
      </ul>
      <p className={nouvelleMiseEnPage ? "mt-3 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em] text-[#6f6357]" : "mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]"}>
        <svg viewBox="0 0 18 12" aria-hidden="true" className="h-3 w-[18px] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(43,35,32,0.15)]">
          <rect width="6" height="12" x="0" fill="#1b3a6b" />
          <rect width="6" height="12" x="6" fill="#f7f4ef" />
          <rect width="6" height="12" x="12" fill="#a53a3a" />
        </svg>
        {t.madeInFrance}
      </p>
    </>
  );

  return (
    /* pb-24 sur téléphone : la barre d'achat fixe ne doit pas recouvrir la fin
       de la colonne. */
    <div className={nouvelleMiseEnPage ? "flex flex-col" : "flex flex-col pb-24 md:pb-0"}>
      {/* Le grand croquis : posé par portail à droite de la carte, dans la
          section « Configuration » (voir schemaSlot, product-view.tsx). Rien
          ne bouge dans les cotes elles-mêmes : seul l'endroit où le dessin
          s'affiche change. */}
      {nouvelleMiseEnPage &&
        bareme &&
        !product.releve &&
        schemaSlot &&
        createPortal(
          <SchemaCotes
            forme={bareme.forme}
            locale={locale}
            /* Un plateau de bois, ou la toile tendue d'un caisson lumineux. */
            matiere={table ? "bois" : "lumiere"}
            actif={coteActive}
            onChoisir={allerA}
            proportions={{
              principale: Number.isFinite(largeurMm) ? largeurMm : undefined,
              secondaire: Number.isFinite(hauteurMm) ? hauteurMm : undefined,
              epaisseur: Number.isFinite(epaisseurMm) ? epaisseurMm : undefined,
            }}
            labels={{
              principale: labelPrincipale,
              secondaire: labelSecondaire,
              epaisseur: t.customThickness,
            }}
            valeurs={{
              principale:
                largeurSaisie && Number.isFinite(largeurMm) ? enUnite(largeurMm) : undefined,
              secondaire:
                !rond && hauteurSaisie && Number.isFinite(hauteurMm)
                  ? enUnite(hauteurMm)
                  : undefined,
              epaisseur: Number.isFinite(epaisseurMm) ? enUnite(epaisseurMm, "mm") : undefined,
            }}
          />,
          schemaSlot
        )}

      {/* Sur téléphone, le choix des matières vient en premier — c'est ce que
          le client vient chercher — le prix de départ suit derrière. Sur
          ordinateur, la colonne est assez large pour garder l'ordre naturel :
          `md:order-*` remet le prix devant. */}
      {product.fabrics &&
        product.fabrics.length > 0 &&
        !product.fabricLabel && (
          <div className="md:mt-5 md:border-t md:border-[#e5ddd3] md:pt-5">
            <SwatchGroup
              label={t.fabricLabel}
              options={product.fabrics}
              selected={fabricId}
              onSelect={setFabricId}
              locale={locale}
            />
          </div>
        )}

      {/* Les matières côte à côte, chaque groupe juste aussi large que ses
          pastilles : l'acier, le bois et la rosace tiennent sur une ou deux
          rangées au lieu de trois blocs centrés l'un sous l'autre.
          Pas de matières quand l'atelier vient mesurer le garde-corps : Quentin les montre au client le jour de la
          visite, sur son ordinateur (05/10/2026). */}
      {(product.woods.length > 0 || product.metals.length > 0) &&
        !(estGC && modeVisite) &&
        (() => {
          const matieres = (
            <div className="flex flex-col gap-7">
              {product.metals.length > 0 && (
                <SwatchGroup
                  label={
                    product.metalLabel ? product.metalLabel[locale] : t.metalLabel
                  }
                  options={product.metals}
                  selected={metalId}
                  onSelect={setMetalId}
                  locale={locale}
                />
              )}
              {product.woods.length > 0 && estGC && (
                <MainCouranteListe {...choixMainCourante} />
              )}
              {product.woods.length > 0 && !estGC && (
                <SwatchGroup
                  label={
                    product.woodLabel ? product.woodLabel[locale] : t.woodLabel
                  }
                  options={woodsAffiches}
                  selected={woodId}
                  onSelect={setWoodId}
                  locale={locale}
                  /* Les écarts ne se montrent que s'il y en a : sur une pièce sur
                     devis sans prix, quatre « Inclus » n'apprendraient rien. */
                  showDelta={
                    orderable && product.woods.some((bois) => bois.priceDelta)
                  }
                />
              )}
              {/* Les rosaces d'un garde-corps, avec les matières — et pas sous un
                  panneau de verre, où il n'y a plus de croix. */}
              {product.fabrics &&
                product.fabrics.length > 0 &&
                product.fabricLabel &&
                !sansRosace && !sansRosaceGC && (
                  <SwatchGroup
                    label={product.fabricLabel[locale]}
                    options={product.fabrics}
                    selected={fabricId}
                    onSelect={setFabricId}
                    locale={locale}
                    showDelta={product.fabrics.some(
                      (rosace) => rosace.priceDelta,
                    )}
                    agrandir
                  />
                )}
            </div>
          );
          /* Configurateur en pleine page : les matières font changer la photo,
             elles restent à côté d'elle (portail, voir matieresSlot) — pas
             dans la carte plus bas. */
          /* Garde-corps sur grand écran : une ligne compacte au-dessus du grand croquis, dans le bloc Configuration
             (demande de Quentin, 05/10) — la couleur, le bois et la rosace se choisissent là où on voit le résultat. */
          const ligneMatieres = (titre: string, options: ProductSwatch[], choisi: string, choisir: (id: string) => void, avecEcart: boolean) => (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{titre}</span>
              <div role="group" aria-label={titre} className="flex gap-1">
                {options.map((o) => {
                  const on = o.id === choisi;
                  const nom = avecEcart && o.priceDelta ? `${o.label} (${formatDelta(o.priceDelta, locale)})` : o.label;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      aria-label={nom}
                      title={nom}
                      onClick={() => choisir(o.id)}
                      className={`rounded-[5px] p-[3px] transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${on ? "bg-white ring-2 ring-[#2b2320]" : "ring-1 ring-transparent hover:bg-white/70 hover:ring-[#2b2320]/30"}`}
                    >
                      <MaterialBubble material={o} selected={on} taille="miniature" className="aspect-[4/5] w-[22px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
          const matieresCompactes = (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-white/55 px-3 py-1.5 lg:shrink-0 lg:flex-nowrap">
              {product.metals.length > 0 && ligneMatieres(locale === "fr" ? "Acier" : "Steel", product.metals, metalId, setMetalId, false)}
              {product.woods.length > 0 &&
                (estGC
                  ? <MainCouranteMenu {...choixMainCourante} />
                  : ligneMatieres(locale === "fr" ? "Main courante" : "Handrail", woodsAffiches, woodId, setWoodId, orderable && product.woods.some((bois) => bois.priceDelta)))}
              {product.fabrics && product.fabrics.length > 0 && product.fabricLabel && !sansRosace && !sansRosaceGC &&
                ligneMatieres(locale === "fr" ? "Rosace" : "Rosette", product.fabrics, fabricId, setFabricId, product.fabrics.some((rosace) => rosace.priceDelta))}
            </div>
          );
          if (nouvelleMiseEnPage) {
            if (estGC && ecranMoyen && matieresCentreSlot) return createPortal(matieresCompactes, matieresCentreSlot);
            // Sur téléphone, le garde-corps garde ses matières DANS le bloc, en tête de la carte : elles changent le croquis,
            // qui doit rester visible pendant qu'on les choisit (près de la photo, on ne voyait plus le croquis).
            // (Le choix complet, écrit en clair : la ligne compacte ouvre une fenêtre de 440 px, coupée sur un téléphone.)
            if (estGC) return <div className="mb-3 md:hidden">{matieres}</div>;
            return matieresSlot ? createPortal(matieres, matieresSlot) : null;
          }
          return (
            <div className="md:mt-5 md:border-t md:border-[#e5ddd3] md:pt-5">{matieres}</div>
          );
        })()}

      {/* Le prix de départ : sur téléphone il suit le choix des matières
          plutôt que de le précéder (voir plus haut), sur ordinateur
          `md:order-first` le remet en tête de colonne comme avant. Le prix réel
          de la configuration est dans la barre d'achat, en bas de la
          colonne, et suit chaque choix. Dans le configurateur en pleine page,
          il est écrit sous le titre, à côté de la photo (product-view.tsx). */}
      {nouvelleMiseEnPage ? null : modeVisite ? (
        <p className="mt-5 border-t border-[#e5ddd3] pt-5 text-[13px] text-[#6f6357] md:order-first md:mt-0 md:border-t-0 md:pt-0">
          {t.onQuote}
        </p>
      ) : bareme && total === null ? (
        /* Pas encore de cotes : le prix de départ s'il existe, et où taper,
           en deux lignes discrètes. */
        <p className="mt-5 border-t border-[#e5ddd3] pt-5 text-[13px] leading-snug text-[#6f6357] md:order-first md:mt-0 md:border-t-0 md:pt-0">
          {prixDepart !== null && (
            <span className="block tabular-nums">
              {t.from}{" "}
              <span className="text-[#2b2320]">
                {prixAffiche(prixDepart, locale)}
              </span>
            </span>
          )}
          <span className="mt-1 hidden text-xs text-[#7a6f64] md:block">
            {product.releve === "garde-corps-fenetre"
              ? t.gcPrixAttente
              : t.prixAttenteCotes}
          </span>
        </p>
      ) : orderable ? (
        prixDepart !== null && (
          <p className="mt-5 border-t border-[#e5ddd3] pt-5 text-[13px] tabular-nums text-[#6f6357] md:order-first md:mt-0 md:border-t-0 md:pt-0">
            {t.from}{" "}
            <span className="text-[#2b2320]">
              {prixAffiche(prixDepart, locale)}
            </span>
          </p>
        )
      ) : (
        <p className="mt-5 border-t border-[#e5ddd3] pt-5 text-[13px] text-[#6f6357] md:order-first md:mt-0 md:border-t-0 md:pt-0">
          {t.onQuote}
        </p>
      )}

      {/* DIMENSIONS — le format du catalogue d'abord, en un clic ; puis les
          cotes du client, qui prennent la main dès qu'elles sont valides. */}
      {((bareme && !product.releve) ||
        (product.sizes.length > 1 && orderable)) && (
        <div
          /* Premier bloc de la carte du configurateur : pas de filet au-dessus. */
          className={nouvelleMiseEnPage ? "scroll-mt-28" : "mt-4 scroll-mt-28 border-t border-[#e5ddd3] pt-5"}
          id="cotes"
        >
          {bareme && !product.releve && (
            <div>
              {/* Le titre, et l'unité de saisie en face : rien d'autre à lire. */}
              <div className="flex items-center justify-between gap-4">
                <span
                  /* Dans la carte, plus étroite, l'intitulé se serre pour
                     tenir sur une ligne à côté du choix de l'unité. */
                  className={
                    nouvelleMiseEnPage
                      ? "block whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]"
                      : GROUP_LABEL
                  }
                  id={`${idTailles}-ou`}
                >
                  {t.sizeLabel}
                </span>
                {bareme && !product.releve && (
                  <div
                    role="radiogroup"
                    aria-label={t.customUnit}
                    className={`flex rounded-full border border-[#9a8d80] bg-white p-0.5 ${nouvelleMiseEnPage ? "text-[10px] md:text-[11px]" : ""}`}
                  >
                    {(["mm", "cm", "m"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        role="radio"
                        aria-checked={unite === u}
                        onClick={() => changerUnite(u)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          unite === u
                            ? "bg-[#2b2320] text-white"
                            : "text-[#6f6357] hover:text-[#2b2320]"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Le croquis, nu : c'est lui qui explique où mesurer. Sur les
                  tables d'intérieur, il est déjà affiché en grand sous la
                  photo (voir plus haut) : pas besoin de le répéter ici. */}
              {!nouvelleMiseEnPage && (
                <div className="mx-auto mt-4 max-w-[360px]">
                  <SchemaCotes
                    compact
                    forme={bareme.forme}
                    locale={locale}
                    matiere={table ? "bois" : "lumiere"}
                    actif={coteActive}
                    onChoisir={allerA}
                    /* Le plateau se dessine aux proportions des cotes tapées. */
                    proportions={{
                      principale: Number.isFinite(largeurMm)
                        ? largeurMm
                        : undefined,
                      secondaire: Number.isFinite(hauteurMm)
                        ? hauteurMm
                        : undefined,
                      epaisseur: Number.isFinite(epaisseurMm)
                        ? epaisseurMm
                        : undefined,
                    }}
                    labels={{
                      principale: labelPrincipale,
                      secondaire: labelSecondaire,
                      epaisseur: t.customThickness,
                    }}
                  />
                </div>
              )}

              {/* Une ligne par cote, un filet entre deux. */}
              <div className="mt-3 divide-y divide-[#e5ddd3]">
                <Ligne
                  n={1}
                  id={`${idTailles}-principale`}
                  label={labelPrincipale}
                  valeur={largeurSaisie}
                  onChange={setLargeurSaisie}
                  unite={unite}
                  bornes={`${chiffre(bareme.minMm)} – ${chiffre(bareme.maxLargeurMm)}`}
                  onFocus={() => setCoteActive("principale")}
                  onBlur={() => setCoteActive(null)}
                  erreurId={
                    devis && !devis.ok && !devis.reason.startsWith("epaisseur")
                      ? `${idTailles}-erreur`
                      : undefined
                  }
                  serre={nouvelleMiseEnPage}
                  curseur={
                    nouvelleMiseEnPage
                      ? {
                          minMm: bareme.minMm,
                          maxMm: bareme.maxLargeurMm,
                          valeurMm: largeurMm,
                          onChangeMm: (mm) => setLargeurSaisie(chiffreBrut(mm)),
                        }
                      : undefined
                  }
                />
                {!rond && (
                  <Ligne
                    n={2}
                    id={`${idTailles}-secondaire`}
                    label={labelSecondaire}
                    valeur={hauteurSaisie}
                    onChange={setHauteurSaisie}
                    unite={unite}
                    bornes={`${chiffre(bareme.minMm)} – ${chiffre(bareme.maxHauteurMm)}`}
                    onFocus={() => setCoteActive("secondaire")}
                    onBlur={() => setCoteActive(null)}
                    serre={nouvelleMiseEnPage}
                    curseur={
                      nouvelleMiseEnPage
                        ? {
                            minMm: bareme.minMm,
                            maxMm: bareme.maxHauteurMm,
                            valeurMm: hauteurMm,
                            onChangeMm: (mm) => setHauteurSaisie(chiffreBrut(mm)),
                          }
                        : undefined
                    }
                    erreurId={
                      devis &&
                      !devis.ok &&
                      !devis.reason.startsWith("epaisseur")
                        ? `${idTailles}-erreur`
                        : undefined
                    }
                  />
                )}
                {bareme.epaisseur.choixMm ? (
                  /* Un plateau de table ne se coupe qu'à trois cotes : on
                     choisit, on ne tape pas. Les cotes trop fines pour la
                     longueur saisie restent visibles mais grisées. */
                  <div
                    className={`flex items-center justify-between gap-4 ${nouvelleMiseEnPage ? "py-2 md:py-3" : "py-3"}`}
                    onFocus={() => setCoteActive("epaisseur")}
                    onBlur={() => setCoteActive(null)}
                  >
                    <span
                      id={`${idTailles}-epaisseur-titre`}
                      className={`flex items-center text-[#2b2320] ${nouvelleMiseEnPage ? "gap-2 text-[13.5px] md:gap-2.5 md:text-[15px]" : "gap-2.5 text-[15px]"}`}
                    >
                      <Pastille n={rond ? 2 : 3} />
                      {t.customThickness}
                    </span>
                    <span className="flex items-center gap-2">
                      <div
                        role="radiogroup"
                        aria-labelledby={`${idTailles}-epaisseur-titre`}
                        className={`flex items-center rounded-full border border-[#9a8d80] bg-white p-0.5 ${nouvelleMiseEnPage ? "h-9 md:h-10" : "h-10"}`}
                      >
                        {bareme.epaisseur.choixMm.map((mm) => {
                          const choisi = mm === epaisseurMm;
                          const tropFin = mm < epaisseurMini;
                          return (
                            <button
                              key={mm}
                              type="button"
                              role="radio"
                              aria-checked={choisi}
                              id={choisi ? `${idTailles}-epaisseur` : undefined}
                              disabled={tropFin}
                              title={
                                tropFin
                                  ? t.customThicknessTooThin.replace(
                                      "{portee}",
                                      String(porteeMm),
                                    )
                                  : undefined
                              }
                              onClick={() => setEpaisseurSaisie(String(mm))}
                              aria-label={`${mm} mm`}
                              className={`h-full rounded-full px-3.5 text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-[#a3968a] ${
                                choisi
                                  ? "bg-[#2b2320] text-white"
                                  : "text-[#6f6357] hover:text-[#2b2320]"
                              }`}
                            >
                              {mm}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-xs text-[#6f6357]" aria-hidden>
                        mm
                      </span>
                    </span>
                  </div>
                ) : (
                  <Ligne
                    n={rond ? 2 : 3}
                    id={`${idTailles}-epaisseur`}
                    label={t.customThickness}
                    valeur={epaisseurSaisie}
                    onChange={setEpaisseurSaisie}
                    unite="mm"
                    bornes={`${epaisseurMini} – ${epaisseurMaxi}`}
                    onFocus={() => setCoteActive("epaisseur")}
                    onBlur={() => setCoteActive(null)}
                    erreurId={
                      devis &&
                      !devis.ok &&
                      (devis.reason.startsWith("epaisseur") ||
                        devis.reason === "caisson_trop_profond")
                        ? `${idTailles}-erreur`
                        : undefined
                    }
                  />
                )}

                {/* La hauteur finie d'une table : 75 cm sauf demande, sans effet
                    sur le prix. Une ligne grise, sans numéro, qui ne montre son
                    champ qu'au clic. */}
                {table && (
                  <div className={`flex items-center justify-between gap-4 text-sm text-[#6f6357] ${nouvelleMiseEnPage ? "py-1.5 md:py-2.5" : "py-2.5"}`}>
                    <span id={`${idTailles}-hauteur-titre`}>
                      {t.customTableHeight}
                    </span>
                    {hauteurOuverte ? (
                      <span className="flex h-10 w-[8.5rem] items-center gap-1 rounded-full border border-[#9a8d80] bg-white px-3.5 focus-within:border-[#2b2320] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]">
                        <input
                          id={`${idTailles}-hauteur`}
                          autoFocus
                          inputMode="decimal"
                          value={hauteurTableSaisie}
                          onChange={(e) =>
                            setHauteurTableSaisie(e.target.value)
                          }
                          placeholder={(
                            HAUTEUR_TABLE_MM / facteur
                          ).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                          aria-labelledby={`${idTailles}-hauteur-titre`}
                          aria-describedby={`${idTailles}-hauteur-aide`}
                          onFocus={() => setCoteActive("hauteur")}
                          onBlur={() => {
                            setCoteActive(null);
                            setHauteurOuverte(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape")
                              setHauteurOuverte(false);
                          }}
                          className="w-full min-w-0 bg-transparent text-right text-base tabular-nums text-[#2b2320] outline-none focus-visible:shadow-none focus-visible:outline-none sm:text-[15px]"
                        />
                        <span className="text-xs">{unite}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setHauteurOuverte(true)}
                        aria-describedby={`${idTailles}-hauteur-aide`}
                        className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm hover:text-[#2b2320]"
                      >
                        <span className="tabular-nums text-[#2b2320]">
                          {Number.isFinite(hauteurTableMm)
                            ? enUnite(hauteurTableMm)
                            : enUnite(HAUTEUR_TABLE_MM)}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="underline underline-offset-4">
                          {t.customTableHeightEdit}
                        </span>
                      </button>
                    )}
                    <span id={`${idTailles}-hauteur-aide`} className="sr-only">
                      {t.customTableHeightAide}
                    </span>
                  </div>
                )}
              </div>

              {/* Le refus doit s'entendre, pas seulement se voir : sans
                      role="alert" un lecteur d'écran ne disait rien et le client
                      continuait de taper devant un bouton grisé. */}
              <p
                id={`${idTailles}-erreur`}
                role="alert"
                className={`mt-2 min-h-4 text-xs leading-snug ${raisonDevisTexte ? "font-medium text-[#9a5b3f]" : "text-[#2b2320]"}`}
              >
                {raisonDevisTexte ?? ""}
              </p>

              {/* Et le prix, lui, se dit dès qu'il change. */}
              <p role="status" aria-live="polite" className="sr-only">
                {devis?.ok
                  ? `${prixAffiche(prixSurMesure ?? devis.prix, locale)} — ${surfaceAffichee(devis.surface, locale)}`
                  : ""}
              </p>
            </div>
          )}

          {/* Dans le configurateur en pleine page, on ne choisit plus de format
              du catalogue : les curseurs suffisent, et une cote qui tombe sur
              un format garde son prix (voir devisSurMesure). */}
          {product.sizes.length > 1 && !nouvelleMiseEnPage && (
            <div className={bareme && !product.releve ? "mt-7" : ""}>
              <span className={GROUP_LABEL} id={`${idTailles}-titre`}>
                {product.sizeLabel
                  ? product.sizeLabel[locale]
                  : bareme && !product.releve
                    ? t.customOr
                    : t.sizeLabel}
              </span>
              {/* Une seule ligne visible : les autres dimensions et leurs tarifs
            s'affichent au clic, comme dans une boutique. Le tout s'annonce
            comme une liste de choix et se parcourt aux flèches. */}
              <div
                ref={sizesRef}
                className="relative mt-4"
                onBlur={(e) => {
                  if (!sizesRef.current?.contains(e.relatedTarget as Node))
                    setSizesOpen(false);
                }}
              >
                <button
                  type="button"
                  id={`${idTailles}-bouton`}
                  role="combobox"
                  aria-haspopup="listbox"
                  aria-expanded={sizesOpen}
                  aria-controls={`${idTailles}-liste`}
                  aria-labelledby={`${idTailles}-titre ${idTailles}-bouton`}
                  aria-activedescendant={
                    sizesOpen
                      ? `${idTailles}-${product.sizes[ligneClavier]?.id}`
                      : undefined
                  }
                  onClick={() => ouvrirFermerTailles()}
                  onKeyDown={clavierTailles}
                  className="flex w-full items-center justify-between gap-4 rounded-full border border-[#9a8d80] bg-white px-5 py-3 text-left text-[15px] text-[#2b2320] transition-colors hover:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
                >
                  <span
                    className={labelTaille?.ok || size ? "" : "text-[#6f6357]"}
                  >
                    {labelTaille?.ok
                      ? labelTaille.label
                      : (size?.label ?? t.sizeChoose)}
                  </span>
                  <span
                    aria-hidden
                    className={`text-[#6f6357] transition-transform ${sizesOpen ? "rotate-180" : ""}`}
                  >
                    ⌄
                  </span>
                </button>

                {sizesOpen && (
                  <div
                    id={`${idTailles}-liste`}
                    role="listbox"
                    // Les options ne prennent pas le focus : sans ceci, le
                    // clic faisait d'abord perdre le focus au bouton, la
                    // liste se fermait (onBlur) et l'option n'était jamais
                    // cliquée. À la souris, on ne choisissait rien.
                    onMouseDown={(event) => event.preventDefault()}
                    aria-labelledby={`${idTailles}-titre`}
                    className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#e5ddd3] bg-white shadow-[0_12px_40px_-12px_rgba(43,35,32,0.25)]"
                  >
                    {product.sizes.map((s, index) => (
                      <div
                        key={s.id}
                        id={`${idTailles}-${s.id}`}
                        role="option"
                        aria-selected={s.id === sizeId}
                        onClick={() => choisirTaille(s.id)}
                        onMouseEnter={() => setLigneClavier(index)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3 text-left text-sm transition-colors ${
                          s.id === sizeId
                            ? "bg-[#f5f1ea] text-[#2b2320]"
                            : "text-[#5c5140] hover:bg-[#faf8f5] hover:text-[#2b2320]"
                        } ${index === ligneClavier ? "bg-[#faf8f5] text-[#2b2320]" : ""}`}
                      >
                        <span>{s.label}</span>
                        {/* Sur devis, pas de prix dans la liste : le chiffre viendrait avant le relevé. */}
                        {orderable && (
                          <span className="font-medium tabular-nums">
                            {prixAffiche(
                              s.price +
                                deltaBois(product, wood, surfaceTailleM2(s)),
                              locale,
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Une pièce sur devis sans prix : le format, sans tarif — un des
          formats du catalogue, ou le sur-mesure, dont on dit les bornes. Le
          choix part dans la demande de devis (optionsPiece). Une liste
          native : elle se pilote au clavier et au doigt sans rien de plus. */}
      {formatsDevis && (
        <div className="mt-4 border-t border-[#e5ddd3] pt-5">
          <label htmlFor={`${idTailles}-format`} className={GROUP_LABEL}>
            {t.detailDimensions}
          </label>
          <div className="relative mt-4">
            <select
              id={`${idTailles}-format`}
              value={formatDevisId}
              onChange={(e) => setFormatDevisId(e.target.value)}
              /* 16 px sur téléphone : en dessous, l'iPhone zoome sur la page
                 dès qu'on touche la liste. */
              className="w-full cursor-pointer appearance-none rounded-full border border-[#9a8d80] bg-white py-3 pl-5 pr-12 text-base text-[#2b2320] transition-colors hover:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] md:text-[15px]"
            >
              {formatsDevis.tailles.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label}
                </option>
              ))}
              {formatsDevis.surMesure && (
                <option value={SUR_MESURE}>{t.sizeLabel}</option>
              )}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#6f6357]"
            >
              ⌄
            </span>
          </div>
          {formatDevisId === SUR_MESURE && formatsDevis.surMesure && (
            <p className="mt-2 text-xs leading-relaxed text-[#6f6357]">
              {formatsDevis.surMesure[locale]}
            </p>
          )}
        </div>
      )}

      {/* Les pièces qui se relèvent avant d'être chiffrées : l'escalier demande
          sa hauteur, son recul et sa trémie, et rend le calcul aussitôt. */}
      {product.releve === "escalier" && product.priseDeCotes && (
        // id="cotes" : la page Prise de cotes à domicile envoie ici (…#cotes),
        // comme sur les tables et le garde-corps ; sans lui, le lien tombait en
        // haut de la fiche. scroll-mt-28 laisse la place de l'en-tête fixe.
        <div
          className="@container mt-4 scroll-mt-28 border-t border-[#e5ddd3] pt-4"
          id="cotes"
        >
          <span className={GROUP_LABEL}>{t.gcVisiteResume}</span>
          {/* Uniquement sur devis : l'atelier vient prendre les cotes, et c'est
              la visite qu'on met au panier. Pas de cotes à taper soi-même. */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#e0d5c7] bg-[#fbfaf8]">
            <div className="px-3.5 pb-3.5 pt-3 md:px-4">
              <p className="text-xs leading-relaxed text-[#6f6357]">
                {t.releveVisiteIntro}
              </p>
              <VisiteAtelier
                cotes={cotesGardeCorps}
                onChange={(visite) =>
                  setCotesGardeCorps({ ...cotesGardeCorps, ...visite })
                }
                t={t}
                locale={locale}
                labelCodePostal={t.releveCodePostal}
                question={locale === "fr" ? "Où se trouve le chantier\u00a0?" : "Where is the site?"}
              />
            </div>
          </div>
        </div>
      )}
      {estGC && aLaQuestionQui && porte && porteSlot &&
        createPortal(
          <PorteQuiMesure
            locale={locale}
            titre={t.configurationTitle}
            notes={{ moi: t.gcQuiMoiNote, tagMoi: t.gcQuiMoiTag }}
            depuis={porte.depuis}
            onChoisir={(qui) => setCotesGardeCorps((cotes) => ({ ...cotes, qui }))}
            onFin={() => setPorte(null)}
          />,
          porteSlot,
        )}
      {estGC && lectureReleve && (
        <div ref={releveRef}>
          <RevenirAuChoix.Provider value={aLaQuestionQui && porteSlot ? () => setPorte({ depuis: cotesGardeCorps.qui }) : null}>
          <ReleveGardeCorps
            schemaSlot={nouvelleMiseEnPage ? schemaSlot : undefined}
            resultatSlot={nouvelleMiseEnPage && ecranMoyen ? resultatSlot : undefined}
            bandeauSlot={nouvelleMiseEnPage && grandEcran ? bandeauSlot : undefined}
            cotes={cotesGardeCorps}
            onChange={setCotesGardeCorps}
            t={t}
            locale={locale}
            lecture={lectureReleve}
            prix={prixGC}
            rosaceMm={fabric ? diametreRosaceGC(fabric.id) : undefined}
            rosaceId={fabricId}
            onRosace={setFabricId}
            mainCourante={woodId}
            teinteAcier={metal?.swatch}
            teinteBois={wood?.swatch}
            lienDevis={`/${locale}/contact?produit=${product.slug}&config=${encodeURIComponent(optionsPiece)}${cotesPourDevisGC ? `&releve=${encodeURIComponent(cotesPourDevisGC)}` : ""}`}
            detailsSlot={setDetailsSlot}
            verre={
              verre && remplissageModele
                ? {
                    surVerre: remplissageId === verre.id,
                    supplement: supplementVerre,
                    choisir: () => setRemplissageId(verre.id),
                    revenir: () => setRemplissageId(remplissageModele.id),
                  }
                : undefined
            }
          />
          </RevenirAuChoix.Provider>
        </div>
      )}

      {(() => {
        /* La livraison et la pose : seulement pour une pièce que l'atelier
           livre lui-même (une table). Un garde-corps part avec ses fixations,
           un plafond lumineux dans son tube : rien à choisir ici. */
        const livrable = product.poseOption && orderable && !modeVisite;
        const livraison = livrable ? (
              <PoseDomicile
                /* Trop encombrante pour un transporteur : on impose la pose
                   plutôt que de laisser cocher une livraison impossible. Le
                   choix corrigé part dans le composant, dont le premier appel
                   remet l'état en place — d'ici là le bouton d'achat reste
                   grisé, faute de prix. */
                choix={poseObligatoire && pose.mode === "transporteur" ? { ...pose, mode: "pose" } : pose}
                onChange={setPose}
                compact={nouvelleMiseEnPage}
                pilule={Boolean(colonneAchat && estGC)}
                demontee={Boolean(product.boisAuM2)}
                livraisonSeule={Boolean(product.livraisonSeule)}
                poseSeule={poseObligatoire}
                infoSeul={product.livraisonInfo?.[locale]}
                colis={colisLivraison}
                t={t}
                locale={locale}
              />
        ) : null;
        if (!nouvelleMiseEnPage) return livraison;
        /* La carte du configurateur : des sous-menus repliables, pour que
           tout tienne dans la carte sans la faire déborder de l'écran — la
           livraison, le poids et les détails, ce que comprend le prix. */
        const resumeLivraison =
          pose.mode === "retrait"
            ? t.retraitCourt
            : pose.deplacement
              ? `${pose.mode === "pose" ? t.poseCourt : t.livraisonCourt} · ${prixAffiche(pose.deplacement.montantCents / 100, locale)}`
              : t.livraisonAChoisir;
        const resumeDetails = poidsKg !== null ? `≈ ${poidsKg} kg` : "—";
        const detailsDl = (
          <dl className="grid gap-1.5 text-xs leading-snug text-[#5c5140]">
                  {(
                    [
                      [
                        t.detailDimensions,
                        cotesEff
                          ? `${enUnite(cotesEff.largeurMm)} × ${enUnite(cotesEff.hauteurMm)}${cotesEff.epaisseurMm !== undefined ? ` × ${cotesEff.epaisseurMm} mm` : ""}`
                          : size?.label
                            ? cotesCourtes(size.label)
                            : "—",
                      ],
                      // Le garde-corps n'a ni surface ni hauteur finie de table : ses lignes n'apprendraient rien.
                      estGC ? null : [t.detailSurface, devis?.ok ? surfaceAffichee(devis.surface, locale) : "—"],
                      table ? [t.customTableHeight, enUnite(hauteurTableMm)] : null,
                      [t.detailMatieres, [wood?.label, metal?.label].filter(Boolean).join(" · ") || "—"],
                      [t.poidsEstime, poidsKg !== null ? `≈ ${poidsKg} kg${quantity > 1 ? ` × ${quantity}` : ""}` : "—"],
                      [t.delaiTitle, delai ?? "—"],
                    ].filter((ligne): ligne is [string, string] => ligne !== null)
                  ).map(([intitule, valeur]) => (
                    <div key={intitule} className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 text-[#6f6357]">{intitule}</dt>
                      <dd className="text-right tabular-nums text-[#2b2320]">{valeur}</dd>
                    </div>
                  ))}
          </dl>
        );
        const sousMenus = (
          <div className="mt-2">
            {livraison && (
                <SousMenu
                  id="sous-menu-livraison"
                titre={product.livraisonSeule ? t.livraisonTitle : t.poseTitle}
                resume={resumeLivraison}
                ouvert={Boolean(menusOuverts.livraison)}
                onToggle={(o) => ouvrirMenu("livraison", o)}
              >
                {livraison}
              </SousMenu>
            )}
            {(() => {
              const details = (
                <>
            {!modeVisite && (
            <SousMenu
                titre={t.sousMenuDetails}
                resume={resumeDetails}
                ouvert={Boolean(menusOuverts.details)}
                onToggle={(o) => ouvrirMenu("details", o)}
              >
                {detailsDl}
              </SousMenu>
            )}
            <SousMenu
              titre={t.sousMenuInclus}
              ouvert={Boolean(menusOuverts.inclus)}
              onToggle={(o) => ouvrirMenu("inclus", o)}
            >
              {listeInclus}
            </SousMenu>
                </>
              );
              // Le garde-corps : ces deux sous-menus vont dans le cadre du résultat, à côté de la carte.
              return estGC && detailsSlot ? createPortal(details, detailsSlot) : details;
            })()}
          </div>
        );
        /* Le garde-corps sur grand écran : la colonne d'achat ne défile pas. Les détails (poids, ce que comprend le prix) vont dans
           une fenêtre flottante ; la livraison reste là, en pilules, au-dessus de la barre d'achat. */
        if (colonneAchat && estGC) {
          return (
            <>
              {detailsSlot &&
                createPortal(
                  <PopoverDetails titre={modeVisite ? t.sousMenuInclus : t.sousMenuDetails} libelle={locale === "fr" ? "Détails" : "Details"}>
                    {/* À domicile (visite), seulement ce que comprend le prix de la visite. */}
                    {!modeVisite && (
                      <>
                        {detailsDl}
                        <p className="mt-3 border-t border-[#e5ddd3] pt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{t.sousMenuInclus}</p>
                      </>
                    )}
                    <div className={modeVisite ? "" : "mt-2"}>{listeInclus}</div>
                  </PopoverDetails>,
                  detailsSlot
                )}
              {/* Rien à acheter (main courante seule sur devis, rien à poser, fenêtre trop basse) : pas de livraison à choisir. Le bloc reste
                  monté, seulement caché : s'il apparaissait et disparaissait, il se retrouvait SOUS la barre d'achat. */}
              {/* L'enveloppe reste TOUJOURS dans le portail, cachée quand il n'y a pas de livraison : retirée puis remise (aller-retour
                  par « L'atelier vient mesurer »), React la replaçait APRÈS la barre d'achat, dans la colonne d'achat. */}
              {versColonneAchat(
                <div className={`mt-2 border-t border-[#e5ddd3] pt-2.5 ${!livraison || (reponseGC && !reponseGC.ok && reponseGC.raison !== "a-etudier") ? "hidden" : ""}`} id="sous-menu-livraison">
                  {livraison && (
                    <>
                      <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{product.livraisonSeule ? t.livraisonTitle : t.poseTitle}</span>
                      <div className="mt-2">{livraison}</div>
                    </>
                  )}
                </div>
              )}
            </>
          );
        }
        return versColonneAchat(sousMenus);
      })()}

      {orderable || modeVisite ? (
        /* La barre d'achat reste au bas de la colonne pendant qu'on choisit :
           sur grand écran elle se colle au bord inférieur, débordant du
           gabarit de la colonne pour aller d'un bord à l'autre.

           ELLE NE PORTE QUE L'ESSENTIEL : le prix, la quantité, le bouton,
           et la raison s'il est grisé. Elle portait aussi le devis PDF, sa
           raison répétée, « Mettre de côté » et le prix de lot : collée en
           bas de la carte, elle en mangeait la moitié, et la configuration —
           ce qu'on est venu faire — n'avait plus que l'autre moitié.
           L'atelier l'a signalé. Le reste suit la barre, dans le flux : on le
           trouve en arrivant au bas de la carte. */
        versColonneAchat(<>
        <div
          className={
            nouvelleMiseEnPage
              ? /* Dans la carte : collée en bas à toutes les tailles, d'un bord à
                   l'autre de la carte (ses marges internes), dans son gris
                   (voir .barre-achat, globals.css). */
                "barre-achat relative sticky bottom-0 z-20 -mx-5 mt-4 border-t border-[#e5ddd3] px-5 pb-3 pt-2.5 md:-mx-6 md:px-6 md:pb-5 md:pt-4"
              : "mt-5 md:sticky md:bottom-0 md:z-20 md:-mx-8 md:border-t md:border-[#e5ddd3] md:bg-white md:px-8 md:py-4 lg:-mx-12 lg:px-12"
          }
        >
          {/* Le prix et la quantité tiennent toujours côte à côte (le
              sélecteur ne fait que 109 px) ; le bouton, lui, passe sur sa
              propre ligne pleine largeur — un prix à quatre chiffres
              (« 2 940 € ») écrasait le prix ou le sélecteur quand les trois
              devaient tenir sur la même ligne, dans la colonne étroite du
              format tablette. */}
          <div className={nouvelleMiseEnPage ? "flex flex-col gap-1.5 md:gap-3" : "flex flex-col gap-3"}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium leading-tight tabular-nums ${nouvelleMiseEnPage ? "text-lg md:text-xl" : "text-xl"}`}
                  /* Sur la carte grise du configurateur, le prix s'écrit en clair. */
                  style={{ color: ACCENT }}
                >
                  {modeVisite
                    ? prixVisite !== null
                      ? // La visite a un prix : c'est lui qui part au panier, on le montre.
                        `${locale === "fr" ? "Visite : " : "Visit: "}${prixAffiche(prixVisite, locale)}`
                      : locale === "fr"
                        ? "Visite : — €"
                        : "Visit: — €"
                    : prixFinal !== null
                      ? prixAffiche(prixFinal, locale)
                      : bareme || estGC
                        ? "— €"
                        : prixDepart !== null
                          ? `${t.from} ${prixAffiche(prixDepart, locale)}`
                          : t.onQuote}
                </p>
                {!modeVisite && total !== null && livraisonPrete(pose) && (
                  <p className="text-[11px] text-[#6f6357]">
                    {/* Ce que le prix compte, en chiffres : « Livraison incluse »
                        se lisait « livraison gratuite ». */}
                    {pose.mode === "retrait"
                      ? t.retraitCourt
                      : (pose.mode === "pose" ? t.poseIncluse : t.livraisonIncluse).replace(
                          "{prix}",
                          prixAffiche(montantLivraisonChoisie ?? 0, locale),
                        )}
                  </p>
                )}
                {size && !modeVisite && orderable && total !== null && (
                  <p className="truncate text-[11px] text-[#6f6357]">
                    {cotesCourtes(
                      sizeIdEff === SUR_MESURE && labelTaille?.ok
                        ? labelTaille.label
                        : size.label,
                    )}
                  </p>
                )}
              </div>
              <div
                className={`flex shrink-0 items-center rounded-full border border-[#9a8d80] ${modeVisite ? "hidden" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className={`text-[#5c5140] hover:text-[#2a2116] ${nouvelleMiseEnPage ? "px-3.5 py-2 md:py-3" : "px-4 py-3"}`}
                  aria-label={
                    locale === "fr" ? "Diminuer la quantité" : "Decrease quantity"
                  }
                >
                  −
                </button>
                <span className="min-w-6 text-center text-sm tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className={`text-[#5c5140] hover:text-[#2a2116] ${nouvelleMiseEnPage ? "px-3.5 py-2 md:py-3" : "px-4 py-3"}`}
                  aria-label={
                    locale === "fr"
                      ? "Augmenter la quantité"
                      : "Increase quantity"
                  }
                >
                  +
                </button>
              </div>
            </div>

            <button
              ref={boutonPanierRef}
              type="button"
              onClick={ouverture ? sInscrire : addToCart}
              disabled={
                total === null ||
                (modeVisite && !visitePrete) || murAChoisir || modeleAChoisir ||
                // La visite de l'atelier n'a pas de livraison : seule la pièce en demande une.
                (!modeVisite && product.poseOption && !livraisonPrete(pose))
              }
              className={`btn-verre w-full rounded-full px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white ${nouvelleMiseEnPage ? "py-2.5 md:py-3.5" : "py-3.5"}`}
            >
              {ouverture ? t.ouvertureBouton : t.addToCart}
            </button>
          </div>
          {/* Pourquoi le bouton est grisé : un lien vers l'endroit à compléter,
              plutôt qu'un bouton mort sans explication. Dans la carte, c'est
              aussi la raison du devis grisé (plus de phrase répétée dessous). */}
          {raisonIndisponible && (
            <p id={nouvelleMiseEnPage ? idRaisonDevis : undefined} className="mt-2 text-[11px] leading-snug text-[#9a5b3f]">
              <a
                href={raisonIndisponible.ancre}
                onClick={(e) => {
                  // On reprend la main sur le saut d'ancre du navigateur :
                  // voir allerAuChampManquant.
                  e.preventDefault();
                  allerAuChampManquant(raisonIndisponible.ancre);
                }}
                className="underline decoration-dotted underline-offset-2 hover:text-[#2b2320]"
              >
                {raisonIndisponible.message}
              </a>
            </p>
          )}
        </div>
        <div className={nouvelleMiseEnPage ? (liensSerres ? "pb-2.5" : "pb-5") : ""}>
          {/* Ce que ce prix-là comprend : sans cette ligne, cliquer « Noyer »
              faisait bondir le chiffre de 710 € sans un mot d'explication. */}
          {/* (Dans la troisième colonne du garde-corps, le résultat le dit déjà, juste au-dessus.) */}
          {optionsLabel && !modeVisite && total !== null && !colonneAchat && (
            <p className="mt-2 text-[11px] text-[#5c5140]">{optionsLabel}</p>
          )}
          {/* Grand écran : la colonne ne défile pas, la confirmation d'ajout prend la place des petits liens, sur UNE ligne. */}
          {liensSerres && added ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px]">
              <span className="font-medium text-[#2a6b3a]">✓ {t.added}</span>
              <Link href={`/${locale}/panier`} className="font-medium text-[#2b2320] underline underline-offset-4 hover:text-[#6d2c2c]">
                {VOIR_PANIER[locale]}
              </Link>
              {estGC && !modeVisite && (
                <button type="button" onClick={autreFenetre} className="font-medium text-[#2b2320] underline underline-offset-4 hover:text-[#6d2c2c]">
                  {t.gcLotAutre}
                </button>
              )}
            </div>
          ) : (
            lienDevis
          )}

          {/* Le grand prix comprend la quantité : on détaille dès qu'on en commande plusieurs. */}
          {quantity > 1 && total !== null && (
            <p className="mt-3 text-center text-sm tabular-nums text-[#5c5140]">
              {prixAffiche(total, locale)} × {quantity}{" "}
              {remiseGC < 0 && (
                <span>
                  {"− "}
                  {prixAffiche(-remiseGC, locale)} ({t.gcRemiseCourt}){" "}
                </span>
              )}
              {t.cartTotalLine}{" "}
              <span className="font-medium">
                {prixAffiche(prixFinal ?? total * quantity + remiseGC, locale)}
              </span>
            </p>
          )}

          {/* Plusieurs fenêtres : la remise (frais fixes de l'atelier comptés
              une fois), et le moyen d'ajouter un garde-corps après l'autre,
              chacun à ses cotes. */}
          {/* Dans la troisième colonne : seulement quand il y a déjà un garde-corps au panier (la colonne doit tenir sur un écran). */}
          {estGC && !modeVisite && (!colonneAchat || dejaAuPanier > 0) && (
            <p className="mt-3 text-center text-xs leading-relaxed text-[#6f6357]">
              {dejaAuPanier > 0 ? (
                <span className="font-medium text-[#2b2320]">
                  {t.gcLotDeja.replace("{n}", String(dejaAuPanier))}
                </span>
              ) : (
                t.gcLot
              )}
            </p>
          )}

          {/* La confirmation reste sous les yeux, et mène au panier. */}
          {added && !liensSerres && (
            <div className="mt-5 rounded-xl border border-[#e5ddd3] bg-[#fbfaf8] px-5 py-5 text-center">
              <p className="text-sm font-medium text-[#2a2116]">{t.added}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link
                  href={`/${locale}/panier`}
                  className="inline-block rounded-full border border-[#2b2320] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2b2320] transition-colors hover:bg-[#2b2320] hover:text-white"
                >
                  {VOIR_PANIER[locale]}
                </Link>
                {/* Une autre fenêtre : on vide les cotes, on garde le bois et
                    l'acier, et le curseur revient dans la première case. */}
                {estGC && !modeVisite && (
                  <button
                    type="button"
                    onClick={autreFenetre}
                    className="inline-block rounded-full border border-[#e5ddd3] bg-white px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2a2116] transition-colors hover:border-black hover:text-black"
                  >
                    {t.gcLotAutre}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Zone d'annonce : un lecteur d'écran dit l'ajout à voix haute. */}
          <p role="status" aria-live="polite" className="sr-only">
            {added
              ? `${t.added}${locale === "fr" ? " : " : ": "}${product.name}${optionsLabel ? ` — ${optionsLabel}` : ""}`
              : ""}
          </p>
        </div>
        </>)
      ) : (
        <div className="mt-3">
          <Link
            href={`/${locale}/contact?produit=${product.slug}&config=${encodeURIComponent(
              optionsLabel,
            )}`}
            className="btn-verre block rounded-full px-6 py-3.5 text-center text-sm font-medium uppercase tracking-[0.12em] text-white"
          >
            {t.requestQuote}
          </Link>
          <p className="mt-3 text-center text-sm leading-relaxed text-[#726757]">
            {/* « Prise de cotes à domicile, pose comprise » vaut pour
                l'escalier ; une pièce qui se livre a sa propre phrase. */}
            {product.noteDevis?.[locale] ?? t.quoteNote}
          </p>
          {lienDevis}
        </div>
      )}

      {/* Hors de la carte du configurateur, ces lignes suivent le bouton ;
          dans la carte, elles sont dans le sous-menu « Ce que comprend le prix ». */}
      {!nouvelleMiseEnPage && listeInclus}

      {/* La barre d'achat du téléphone : elle n'apparaît que lorsque le vrai
          bouton est sorti de l'écran, et disparaît dès qu'il revient. */}
      {orderable && !boutonVisible && !nouvelleMiseEnPage && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[#e5ddd3] bg-[#ffffff]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          {apercu && (
            <button
              type="button"
              onClick={apercu.onClick}
              aria-label={t.apercuPhoto}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#e5ddd3] bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
            >
              <Image key={apercu.src} src={apercu.src} alt={apercu.alt} fill sizes="56px" className="object-contain p-1" />
            </button>
          )}
          <div className="min-w-0">
            <p
              className="text-lg font-medium leading-tight tabular-nums"
              style={{ color: ACCENT }}
            >
              {prixFinal !== null
                ? prixAffiche(prixFinal, locale)
                : modeVisite
                  ? t.onQuote
                  : product.releve === "garde-corps-fenetre"
                    ? t.gcPromesseCourt
                    : bareme
                      ? "— €"
                      : prixDepart !== null
                        ? `${t.from} ${prixAffiche(prixDepart, locale)}`
                        : t.onQuote}
            </p>
            <p className="truncate text-[11px] text-[#6f6357]">
              {cotesCourtes(
                sizeIdEff === SUR_MESURE && labelTaille?.ok
                  ? labelTaille.label
                  : (size?.label ?? ""),
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={ouverture ? sInscrire : addToCart}
            disabled={total === null || (modeVisite && !visitePrete) || murAChoisir || modeleAChoisir || (!modeVisite && product.poseOption && !livraisonPrete(pose))}
            className="btn-verre ml-auto shrink-0 rounded-full px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-white"
          >
            {/* La version courte : la longue ne laissait plus de place au prix. */}
            {ouverture ? t.ouvertureBoutonCourt : t.addToCart}
          </button>
        </div>
      )}
    </div>
  );
}
