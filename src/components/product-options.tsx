"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  computeUnitPrice,
  deltaBois,
  surfaceTailleM2,
  devisSurMesure,
  epaisseurMaxMm,
  epaisseurMiniMm,
  poidsColisKg,
  priceFrom,
  prixRemise,
  remplissageConforme,
  SUR_MESURE,
  type Product,
  type ProductSize,
  type ProductSwatch,
} from "@/lib/products";
import { amenerAlEcran, prixAffiche, surfaceAffichee } from "@/lib/ui";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { useCart } from "@/lib/cart";
import { MaterialBubble } from "./material-bubble";
import { SchemaCotes, type CoteActive, type CoteSchema } from "./schema-cotes";
import {
  ReleveGardeCorps,
  calculDepuisCotes,
  noteGardeCorps,
  COTES_GARDE_CORPS_VIDES,
  type CotesGardeCorps,
} from "./releve-garde-corps";
import { LIVRAISON, POSE, PRISE_DE_COTES } from "@/lib/deplacement";
import { memoriserConfig, reprendreConfig, type ConfigMemo } from "@/lib/config-memo";
import { livrableParTransporteur } from "@/lib/products";
import { VisiteAtelier } from "./prise-de-cotes";
import { MAX_TEXTE, EMAIL_MOTIF } from "@/lib/devis-regles";
import { POSE_INITIALE, PoseDomicile, type ChoixPose } from "./pose-domicile";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";

const ACCENT = "#2b2320";

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
  return Boolean(product.surMesure);
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
}: {
  label: string;
  options: ProductSwatch[];
  selected: string;
  onSelect: (id: string) => void;
  locale: "fr" | "en";
  showDelta?: boolean;
}) {
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
              onClick={() => onSelect(o.id)}
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
  compteOuvert = false,
}: {
  /** L'espace client est-il ouvert ? On ne propose pas de créer un compte qui n'existe pas encore. */
  compteOuvert?: boolean;
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
   * Où poser le choix des matières (teinte des pieds, essence du plateau)
   * quand le configurateur est en pleine page : à côté de la photo, qu'elles
   * font changer — pas dans la carte plus bas.
   */
  matieresSlot?: HTMLDivElement | null;
}) {
  /** La taille à laquelle la fiche s'ouvre, s'il y en a une. */
  const tailleInitiale =
    (product.sizes.find((s) => s.default) ?? product.sizes[0])?.id ?? "";
  // Une pièce qui a un barème s'ouvre sans taille ni prix : le chiffre vient
  // avec les cotes du client (ou une taille du catalogue, s'il en choisit une).
  // Les autres s'ouvrent sur leur taille par défaut (la 8 places sur les
  // chaises vendues par lot, par exemple).
  const [sizeIdChoisi, setSizeId] = useState(product.surMesure ? "" : tailleInitiale);
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
  // Essence de référence par défaut (écart nul), pas la première de la liste.
  const [ownWoodId, setOwnWoodId] = useState(
    (product.woods.find((w) => !w.priceDelta) ?? product.woods[0])?.id ?? "",
  );
  const woodId = woodIdProp ?? ownWoodId;
  const setWoodId = onWoodChange ?? setOwnWoodId;
  const [ownMetalId, setOwnMetalId] = useState(product.metals[0]?.id ?? "");
  const metalId = metalIdProp ?? ownMetalId;
  const setMetalId = onMetalChange ?? setOwnMetalId;
  const [ownFabricId, setOwnFabricId] = useState(
    product.fabrics?.[0]?.id ?? "",
  );
  /** Le remplissage d'un garde-corps : celui du modèle, sauf si la norme oblige à passer au verre. */
  const [remplissageId, setRemplissageId] = useState(
    product.remplissages?.[0]?.id ?? "",
  );
  const fabricIdChoisi = fabricIdProp ?? ownFabricId;
  const setFabricId = onFabricChange ?? setOwnFabricId;
  /** Sous un panneau de verre, il n'y a plus de croix : plus de rosace à choisir ni à payer. */
  const sansRosace =
    product.fabricLabel !== undefined &&
    product.remplissages?.some(
      (option) =>
        option.id === remplissageId &&
        option.hauteurMaxConformeMm === undefined,
    ) === true;
  const fabricId = sansRosace
    ? (product.fabrics?.[0]?.id ?? "")
    : fabricIdChoisi;
  const [quantity, setQuantity] = useState(1);
  /** Configuration pour laquelle la confirmation d'ajout a été affichée. */
  const [ajoutee, setAjoutee] = useState<string | null>(null);
  const router = useRouter();
  /** Livraison seule, ou livrée et posée par l'atelier (tables). */
  const [pose, setPose] = useState<ChoixPose>(POSE_INITIALE);

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
    if (memo.sizeId !== undefined) setSizeId(memo.sizeId);
    if (memo.woodId) setWoodId(memo.woodId);
    if (memo.metalId) setMetalId(memo.metalId);
    if (memo.fabricId) setFabricId(memo.fabricId);
    if (memo.remplissageId) setRemplissageId(memo.remplissageId);
    if (memo.quantity) setQuantity(memo.quantity);
    if (memo.codePostal || memo.poseVoulue !== undefined) {
      setPose((p) => ({
        ...p,
        codePostal: memo.codePostal ?? p.codePostal,
        voulue: memo.poseVoulue ?? p.voulue,
        // Le prix se recalcule : celui d'avant l'aller-retour n'est plus sûr.
        deplacement: null,
      }));
    }
  }, [product.slug, setWoodId, setMetalId, setFabricId]);
  /** Les coordonnées facultatives du client, pour un devis PDF nominatif. */
  const [coordonnees, setCoordonnees] = useState({ nom: "", email: "" });
  /**
   * Sur téléphone, cette colonne fait plus de deux écrans de haut : le prix et
   * le bouton disparaissent dès qu'on descend choisir un bois ou taper ses
   * cotes. On suit donc le vrai bouton, et une barre prend le relais quand il
   * sort de l'écran.
   */
  /** Les cotes relevées chez le client (garde-corps), et la visite de l'atelier. */
  const [cotesGardeCorps, setCotesGardeCorps] = useState<CotesGardeCorps>(
    // Une pièce sur devis ne se mesure pas soi-même : c'est l'atelier qui vient.
    product.orderMode === "quote"
      ? { ...COTES_GARDE_CORPS_VIDES, qui: "atelier" }
      : COTES_GARDE_CORPS_VIDES,
  );
  const boutonPanierRef = useRef<HTMLButtonElement>(null);
  /** Le bloc de relevé : pour y ramener le curseur quand on ajoute une autre fenêtre. */
  const releveRef = useRef<HTMLDivElement>(null);
  /** La fenêtre qui demande nom et adresse avant d'ouvrir le devis PDF. */
  const devisDialogRef = useRef<HTMLDialogElement>(null);
  const [boutonVisible, setBoutonVisible] = useState(true);
  /** La configuration mise de côté, et l'enregistrement en cours. */
  const [misDeCote, setMisDeCote] = useState<string | null>(null);
  const [favoriEnvoi, setFavoriEnvoi] = useState(false);
  /** Les sous-menus de la carte du configurateur (livraison, poids et détails, ce que comprend le prix). */
  const [menusOuverts, setMenusOuverts] = useState<Record<string, boolean | undefined>>({});
  const ouvrirMenu = (nom: string, ouvert: boolean) => setMenusOuverts((m) => ({ ...m, [nom]: ouvert }));

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
        // « center » plutôt que « start » : la carte défile à l'intérieur
        // d'elle-même, et un bloc collé tout en haut passe sous le titre.
        amenerAlEcran(cible, { block: "center" });
        const champ = cible.querySelector<HTMLInputElement>('input:not([type="hidden"])');
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
   * Sur une pièce qui se relève (le garde-corps de fenêtre), ce sont les cotes
   * du relevé qui font la pièce : dès qu'elles sont là, la sélection est « sur
   * mesure » à ces cotes-là, sans bouton à presser — le prix suit la frappe.
   */
  const calculFenetre =
    product.releve === "garde-corps-fenetre"
      ? calculDepuisCotes(cotesGardeCorps, t)
      : null;
  /** La fenêtre est trop basse pour encastrer : pas de prix, une demande de devis. */
  const fenetreTropBasse = calculFenetre?.tientDansLaFenetre === false;
  const cotesEff =
    calculFenetre && bareme && !fenetreTropBasse
      ? {
          largeurMm: calculFenetre.largeurMm,
          hauteurMm: calculFenetre.hauteurRetenueMm,
          epaisseurMm: bareme.epaisseur.refMm,
        }
      : product.releve === "garde-corps-fenetre"
        ? null
        : cotesTapees;
  const sizeIdEff =
    product.releve === "garde-corps-fenetre"
      ? calculFenetre
        ? SUR_MESURE
        : ""
      : sizeId;
  /**
   * Une fenêtre plus large que le barème : le bouton se grise, mais il faut le
   * dire — sans ce mot, 4 555 mm tapés laissaient un bouton mort et personne
   * ne savait pourquoi.
   */
  const horsBareme =
    calculFenetre &&
    bareme &&
    !devisSurMesure(
      product,
      calculFenetre.largeurMm,
      calculFenetre.hauteurRetenueMm,
      bareme.epaisseur.refMm,
      locale,
    ).ok
      ? { largeurMaxMm: bareme.maxLargeurMm, hauteurMaxMm: bareme.maxHauteurMm }
      : null;

  const wood = product.woods.find((w) => w.id === woodId);
  /** Le poids du colis, estimé comme le fait le serveur (poidsColisKg) : dit au client dans la carte. */
  const poidsKg = poidsColisKg(product, {
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
  // Même calcul que /api/commande : aucune divergence possible.
  const totalPiece =
    computeUnitPrice(product, {
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
    null;

  /**
   * La norme, sur le remplissage : à partir d'une certaine hauteur, les croix
   * du modèle laissent des vides trop grands. On ne vend pas ça — on montre le
   * verre feuilleté (chiffré tout de suite) et les autres modèles.
   */
  const remplissage = product.remplissages?.find(
    (option) => option.id === remplissageId,
  );
  const remplissageModele = product.remplissages?.[0];
  const nonConforme =
    calculFenetre !== null &&
    remplissage !== undefined &&
    !remplissageConforme(remplissage, calculFenetre.hauteurRetenueMm);
  const croixConformes =
    calculFenetre !== null &&
    remplissageModele !== undefined &&
    remplissageConforme(remplissageModele, calculFenetre.hauteurRetenueMm);
  const verre = product.remplissages?.find(
    (option) => option.hauteurMaxConformeMm === undefined,
  );
  const prixVerre =
    verre && calculFenetre && cotesEff
      ? computeUnitPrice(product, {
          sizeId: SUR_MESURE,
          woodId,
          metalId,
          fabricId,
          remplissageId: verre.id,
          largeurMm: cotesEff.largeurMm,
          hauteurMm: cotesEff.hauteurMm,
          epaisseurMm: cotesEff.epaisseurMm,
        })
      : null;
  /** Ce qui s'affiche dans le sélecteur : une taille du catalogue ou les cotes. */
  const labelTaille =
    sizeIdEff === SUR_MESURE && cotesEff
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
   * Le prix de lot : plusieurs garde-corps dans la même commande, avec ceux
   * déjà au panier. Même calcul que le panier et que le serveur.
   */
  const lot = product.remiseLot;
  const dejaAuPanier = lot
    ? panier
        .filter((ligne) => ligne.slug === product.slug)
        .reduce((somme, ligne) => somme + ligne.quantity, 0)
    : 0;
  const lotActif =
    lot !== undefined &&
    !modeVisite &&
    dejaAuPanier + quantity >= lot.desPieces;
  const prixLot =
    lotActif && total !== null ? prixRemise(total, lot.taux) : total;
  /**
   * Le prix vraiment dû : la pièce (au tarif de lot s'il s'applique) fois la
   * quantité, plus la livraison ou la pose — comptée une seule fois, jamais
   * par pièce. C'est ce chiffre-là qui s'affiche en grand : le client ne
   * doit pas découvrir le coût du transport seulement une fois au panier.
   */
  const prixFinal =
    total !== null
      ? (prixLot ?? total) * quantity + (pose.deplacement ? pose.deplacement.montantCents / 100 : 0)
      : null;
  /** Le délai, lu dans les caractéristiques : « Fabrication » / « Lead time ». */
  const delai = product.specs.find((spec) =>
    /fabrication|lead time/i.test(spec.label),
  )?.value;

  const optionsPiece = [
    sizeIdEff === SUR_MESURE && labelTaille?.ok
      ? labelTaille.label
      : product.sizes.length > 1
        ? (size?.label ?? null)
        : null,
    wood?.label,
    metal?.label,
    fabric?.label,
    remplissage && remplissage !== remplissageModele ? remplissage.label : null,
  ]
    .filter(Boolean)
    .join(" · ");
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
    remplissageId,
    quantity,
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

  const urlDevis = (() => {
    // Une pièce sur devis (l'escalier) s'estime d'après sa configuration,
    // même quand la fiche est en mode « visite de l'atelier » : c'est la
    // pièce qu'on estime, pas le rendez-vous.
    if (orderable ? total === null || modeVisite : totalPiece === null) return null;
    if (product.poseOption && orderable && !pose.deplacement) return null;
    const p = new URLSearchParams({
      slug: product.slug,
      lang: locale,
      qty: String(quantity),
    });
    if (sizeIdEff) p.set("size", sizeIdEff);
    if (cotesEff?.largeurMm) p.set("l", String(cotesEff.largeurMm));
    if (cotesEff?.hauteurMm) p.set("w", String(cotesEff.hauteurMm));
    if (cotesEff?.epaisseurMm) p.set("t", String(cotesEff.epaisseurMm));
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
    if (product.releve === "garde-corps-fenetre") {
      const note = noteGardeCorps(cotesGardeCorps, t);
      if (note) p.set("note", note);
    }
    if (product.poseOption && orderable && pose.deplacement) {
      p.set("mode", pose.voulue ? "pose" : "transporteur");
      p.set("cp", pose.codePostal.replace(/\s+/g, ""));
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
  const raisonIndisponible: { message: string; ancre: string } | null = modeVisite
    ? !visitePrete
      ? { message: t.raisonVisiteIncomplete, ancre: "#cotes" }
      : null
    : total === null
      ? // Le même texte que l'alerte sous les champs (raisonDevisTexte) : une
        // fois les deux cotes tapées hors barème, cotesTapees repasse à null
        // et ne dit plus pourquoi tout seul.
        raisonDevisTexte
        ? { message: raisonDevisTexte, ancre: "#cotes" }
        : bareme && !product.releve
          ? { message: t.raisonCotesManquantes, ancre: "#cotes" }
          : // Le garde-corps de fenêtre releve ses propres cotes (largeur,
            // allège, hauteur) : calculFenetre reste null tant qu'il en
            // manque une, avant même de savoir si la fenêtre est conforme.
            product.releve === "garde-corps-fenetre" && !calculFenetre
            ? { message: t.raisonCotesManquantes, ancre: "#cotes" }
            : null
      : product.poseOption && !pose.deplacement
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
      sizeId: sizeIdEff,
      woodId,
      metalId,
      fabricId,
      remplissageId,
      quantity,
      codePostal: pose.codePostal,
      poseVoulue: pose.voulue,
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
    try {
      const reponse = await fetch("/api/compte/favoris", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: product.slug,
          titre: product.name,
          resume: optionsLabel,
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
   * Le devis PDF, et la fenêtre qui demande le nom et l'e-mail avant de
   * l'ouvrir. Le bouton est TOUJOURS là, même quand il ne sert pas encore :
   * un bouton qui apparaît en cours de route se remarque moins qu'un bouton
   * grisé, et on ne sait pas qu'on aurait pu télécharger un devis. Grisé, il
   * dit ce qu'il attend (raisonIndisponible, la même phrase que sous le
   * bouton d'achat).
   */
  const lienDevis = (
    <div className="mt-3">
      <button
        type="button"
        onClick={ouvrirDevis}
        disabled={!urlDevis}
        aria-describedby={!urlDevis && raisonIndisponible ? idRaisonDevis : undefined}
        className={`flex w-full items-center justify-center gap-2.5 rounded-full border px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${
          urlDevis
            ? "border-[#2b2320] text-[#2b2320] hover:bg-[#2b2320] hover:text-white"
            : "cursor-not-allowed border-[#c9bfb2] text-[#6f6357]"
        }`}
      >
        {devisIcone}
        {orderable ? t.devisPdf : t.estimationPdf}
      </button>
      {/* Pourquoi il est grisé — sans ce mot, le bouton a l'air cassé. */}
      {!urlDevis && raisonIndisponible && (
        <p id={idRaisonDevis} className="mt-2 text-center text-xs leading-relaxed text-[#6f6357]">
          {raisonIndisponible.message}
        </p>
      )}

      {/* Mettre la pièce de côté : on garde les cotes et les choix, pas
          seulement le nom de l'article. Discret, en dessous du devis — ce
          n'est pas l'action principale, mais c'est celle qui ramène. */}
      {compteOuvert && !modeVisite && (
        <p className="mt-3 text-center">
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
            {champCoordonnees(t.coordonneesNom, "nom", {
              required: true,
              maxLength: MAX_TEXTE.name,
              autoComplete: "name",
              autoFocus: true,
            })}
            {champCoordonnees(t.coordonneesEmail, "email", {
              required: true,
              type: "email",
              maxLength: MAX_TEXTE.email,
              pattern: EMAIL_MOTIF,
              autoComplete: "email",
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
    </div>
  );

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
        // Le relevé du garde-corps : la note pour l'atelier (étage, mur, allège).
        note:
          product.releve === "garde-corps-fenetre"
            ? noteGardeCorps(cotesGardeCorps, t) || undefined
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
    // La livraison (par transporteur ou avec pose) : une ligne à part, une
    // seule par panier — un seul trajet, un seul colis. Si une autre table
    // l'avait déjà demandée, on la remplace par celle-ci.
    if (product.poseOption && pose.deplacement) {
      panier
        .filter((ligne) => ligne.slug === POSE || ligne.slug === LIVRAISON)
        .forEach((ligne) => remove(ligne.id));
      const cp = pose.codePostal.replace(/\s+/g, "");
      add(
        pose.voulue
          ? {
              slug: POSE,
              poseCp: cp,
              name: t.poseResume,
              optionsLabel: pose.deplacement.commune,
              unitPrice: pose.deplacement.montantCents / 100,
            }
          : {
              slug: LIVRAISON,
              livraisonCp: cp,
              livraisonSlug: product.slug,
              // Les cotes, l'essence et le remplissage : le serveur recalcule le vrai poids avec elles.
              largeurMm: cotesEff?.largeurMm ?? size?.dimsMm?.[0],
              hauteurMm: cotesEff?.hauteurMm ?? size?.dimsMm?.[1],
              epaisseurMm: cotesEff?.epaisseurMm,
              woodId: woodId || undefined,
              remplissageId: remplissageId || undefined,
              livraisonQty: quantity,
              name: t.livraisonResume,
              optionsLabel: pose.deplacement.commune,
              unitPrice: pose.deplacement.montantCents / 100,
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
          rangées au lieu de trois blocs centrés l'un sous l'autre. */}
      {(product.woods.length > 0 || product.metals.length > 0) &&
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
              {product.woods.length > 0 && (
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
                !sansRosace && (
                  <SwatchGroup
                    label={product.fabricLabel[locale]}
                    options={product.fabrics}
                    selected={fabricId}
                    onSelect={setFabricId}
                    locale={locale}
                    showDelta={product.fabrics.some(
                      (rosace) => rosace.priceDelta,
                    )}
                  />
                )}
            </div>
          );
          /* Configurateur en pleine page : les matières font changer la photo,
             elles restent à côté d'elle (portail, voir matieresSlot) — pas
             dans la carte plus bas. */
          if (nouvelleMiseEnPage) {
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
              />
            </div>
          </div>
        </div>
      )}
      {product.releve === "garde-corps-fenetre" && (
        <div ref={releveRef}>
          <ReleveGardeCorps
            schemaSlot={nouvelleMiseEnPage ? schemaSlot : undefined}
            cotes={cotesGardeCorps}
            onChange={setCotesGardeCorps}
            t={t}
            locale={locale}
            prixPiece={totalPiece}
            horsBareme={horsBareme}
            tropBasse={fenetreTropBasse}
            rosaceMm={Number(fabric?.label.match(/Ø(\d+)/)?.[1]) || undefined}
            lienDevis={`/${locale}/contact?produit=${product.slug}&config=${encodeURIComponent(optionsPiece)}`}
            norme={
              remplissage && remplissageModele
                ? {
                    nonConforme,
                    hauteurMaxMm: remplissageModele.hauteurMaxConformeMm ?? 0,
                    surVerre: verre !== undefined && remplissageId === verre.id,
                    croixConformes,
                    prixVerre,
                    choisirVerre: verre
                      ? () => setRemplissageId(verre.id)
                      : undefined,
                    revenirCroix: () => setRemplissageId(remplissageModele.id),
                    lienAutres: calculFenetre
                      ? `/${locale}/artisanat?pour=${product.famille}&l=${calculFenetre.largeurMm}&h=${calculFenetre.hauteurRetenueMm}#${product.famille}`
                      : `/${locale}/artisanat#${product.famille}`,
                  }
                : undefined
            }
          />
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
                choix={poseObligatoire && !pose.voulue ? { ...pose, voulue: true } : pose}
                onChange={setPose}
                compact={nouvelleMiseEnPage}
                demontee={Boolean(product.boisAuM2)}
                livraisonSeule={Boolean(product.livraisonSeule)}
                poseSeule={poseObligatoire}
                infoSeul={product.livraisonInfo?.[locale]}
                colis={{
                  slug: product.slug,
                  largeurMm: cotesEff?.largeurMm ?? size?.dimsMm?.[0],
                  hauteurMm: cotesEff?.hauteurMm ?? size?.dimsMm?.[1],
                  epaisseurMm: cotesEff?.epaisseurMm,
                  woodId: woodId || undefined,
                  remplissageId: remplissageId || undefined,
                  quantity,
                }}
                t={t}
                locale={locale}
              />
        ) : null;
        if (!nouvelleMiseEnPage) return livraison;
        /* La carte du configurateur : des sous-menus repliables, pour que
           tout tienne dans la carte sans la faire déborder de l'écran — la
           livraison, le poids et les détails, ce que comprend le prix. */
        const resumeLivraison = pose.deplacement
          ? `${pose.voulue ? t.poseCourt : t.livraisonCourt} · ${prixAffiche(pose.deplacement.montantCents / 100, locale)}`
          : t.livraisonAChoisir;
        const resumeDetails = `≈ ${poidsKg} kg`;
        return (
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
            <SousMenu
              titre={t.sousMenuDetails}
              resume={resumeDetails}
              ouvert={Boolean(menusOuverts.details)}
              onToggle={(o) => ouvrirMenu("details", o)}
            >
              <dl className="grid gap-1.5 text-xs leading-snug text-[#5c5140]">
                {(
                  [
                    [t.detailDimensions, cotesEff ? `${enUnite(cotesEff.largeurMm)} × ${enUnite(cotesEff.hauteurMm)} × ${cotesEff.epaisseurMm} mm` : size?.label ? cotesCourtes(size.label) : "—"],
                    [t.detailSurface, devis?.ok ? surfaceAffichee(devis.surface, locale) : "—"],
                    [t.customTableHeight, enUnite(hauteurTableMm)],
                    [t.detailMatieres, [wood?.label, metal?.label].filter(Boolean).join(" · ") || "—"],
                    [t.poidsEstime, `≈ ${poidsKg} kg${quantity > 1 ? ` × ${quantity}` : ""}`],
                    [t.delaiTitle, delai ?? "—"],
                  ] as [string, string][]
                ).map(([intitule, valeur]) => (
                  <div key={intitule} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-[#6f6357]">{intitule}</dt>
                    <dd className="text-right tabular-nums text-[#2b2320]">{valeur}</dd>
                  </div>
                ))}
              </dl>
            </SousMenu>
            <SousMenu
              titre={t.sousMenuInclus}
              ouvert={Boolean(menusOuverts.inclus)}
              onToggle={(o) => ouvrirMenu("inclus", o)}
            >
              {listeInclus}
            </SousMenu>
          </div>
        );
      })()}

      {orderable || modeVisite ? (
        /* La barre d'achat reste au bas de la colonne pendant qu'on choisit :
           sur grand écran elle se colle au bord inférieur, débordant du
           gabarit de la colonne pour aller d'un bord à l'autre. */
        <div
          className={
            nouvelleMiseEnPage
              ? /* Dans la carte : collée en bas à toutes les tailles, d'un bord à
                   l'autre de la carte (ses marges internes), dans son gris
                   (voir .barre-achat, globals.css). */
                "barre-achat relative sticky bottom-0 z-20 -mx-5 mt-4 border-t border-[#e5ddd3] px-5 pb-4 pt-3 md:-mx-6 md:px-6 md:pb-5 md:pt-4"
              : "mt-5 md:sticky md:bottom-0 md:z-20 md:-mx-8 md:border-t md:border-[#e5ddd3] md:bg-white md:px-8 md:py-4 lg:-mx-12 lg:px-12"
          }
        >
          {/* Le prix et la quantité tiennent toujours côte à côte (le
              sélecteur ne fait que 109 px) ; le bouton, lui, passe sur sa
              propre ligne pleine largeur — un prix à quatre chiffres
              (« 2 940 € ») écrasait le prix ou le sélecteur quand les trois
              devaient tenir sur la même ligne, dans la colonne étroite du
              format tablette. */}
          <div className={nouvelleMiseEnPage ? "flex flex-col gap-2 md:gap-3" : "flex flex-col gap-3"}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-xl font-medium leading-tight tabular-nums"
                  /* Sur la carte grise du configurateur, le prix s'écrit en clair. */
                  style={{ color: nouvelleMiseEnPage ? "#f6f2ec" : ACCENT }}
                >
                  {modeVisite
                    ? t.onQuote
                    : prixFinal !== null
                      ? prixAffiche(prixFinal, locale)
                      : bareme
                        ? "— €"
                        : prixDepart !== null
                          ? `${t.from} ${prixAffiche(prixDepart, locale)}`
                          : t.onQuote}
                </p>
                {!modeVisite && total !== null && pose.deplacement && (
                  <p className="text-[11px] text-[#6f6357]">{t.livraisonIncluse}</p>
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
              onClick={addToCart}
              disabled={
                total === null ||
                (modeVisite && !visitePrete) ||
                (product.poseOption && !pose.deplacement)
              }
              className={`btn-verre w-full rounded-full px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white ${nouvelleMiseEnPage ? "py-3 md:py-3.5" : "py-3.5"}`}
            >
              {t.addToCart}
            </button>
          </div>
          {/* Pourquoi le bouton est grisé : un lien vers l'endroit à compléter,
              plutôt qu'un bouton mort sans explication. */}
          {raisonIndisponible && (
            <p className="mt-2 text-[11px] text-[#9a5b3f]">
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
          {/* Ce que ce prix-là comprend : sans cette ligne, cliquer « Noyer »
              faisait bondir le chiffre de 710 € sans un mot d'explication. */}
          {optionsLabel && !modeVisite && total !== null && (
            <p className="mt-2 text-[11px] text-[#5c5140]">{optionsLabel}</p>
          )}
          {lienDevis}

          {/* Le grand prix reste unitaire : on affiche le total dès qu'on en commande plusieurs. */}
          {quantity > 1 && total !== null && (
            <p className="mt-3 text-center text-sm tabular-nums text-[#5c5140]">
              {lotActif && prixLot !== total && (
                <s className="mr-1.5 text-[#6f6357]">
                  {prixAffiche(total, locale)}
                </s>
              )}
              {prixAffiche(prixLot ?? total, locale)} × {quantity}{" "}
              {t.cartTotalLine}{" "}
              <span className="font-medium">
                {prixAffiche(prixFinal ?? (prixLot ?? total) * quantity, locale)}
              </span>
              {lotActif && (
                <span className="ml-2 rounded-full bg-[#2b2320]/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#2b2320]">
                  {t.gcLotTag.replace(
                    "{taux}",
                    String(Math.round((lot?.taux ?? 0) * 100)),
                  )}
                </span>
              )}
            </p>
          )}

          {/* Plusieurs fenêtres : le prix de lot, et le moyen d'ajouter un
              garde-corps après l'autre, chacun à ses cotes. */}
          {lot && !modeVisite && (
            <p className="mt-3 text-center text-xs leading-relaxed text-[#6f6357]">
              {dejaAuPanier > 0 && total !== null && lotActif ? (
                <>
                  <span className="font-medium text-[#2b2320]">
                    {t.gcLotDeja.replace("{n}", String(dejaAuPanier))}
                  </span>{" "}
                  {quantity === 1 && prixLot !== null && prixLot !== total && (
                    <span className="tabular-nums">
                      <s className="text-[#6f6357]">
                        {prixAffiche(total, locale)}
                      </s>{" "}
                      <span className="font-medium text-[#2a2116]">
                        {prixAffiche(prixLot, locale)}
                      </span>
                    </span>
                  )}
                </>
              ) : (
                t.gcLot.replace("{taux}", String(Math.round(lot.taux * 100)))
              )}
            </p>
          )}

          {/* La confirmation reste sous les yeux, et mène au panier. */}
          {added && (
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
                {lot && !modeVisite && (
                  <button
                    type="button"
                    onClick={() => {
                      setCotesGardeCorps({
                        ...cotesGardeCorps,
                        largeur: "",
                        allege: "",
                        fenetre: "",
                      });
                      setQuantity(1);
                      setAjoutee(null);
                      const premiere =
                        releveRef.current?.querySelector<HTMLInputElement>(
                          "input[inputmode=decimal]",
                        );
                      premiere?.focus();
                      premiere?.scrollIntoView({
                        block: "center",
                        behavior: "smooth",
                      });
                    }}
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
            {t.quoteNote}
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
            onClick={addToCart}
            disabled={total === null || (modeVisite && !visitePrete) || (product.poseOption && !pose.deplacement)}
            className="btn-verre ml-auto shrink-0 rounded-full px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-white"
          >
            {t.addToCart}
          </button>
        </div>
      )}
    </div>
  );
}
