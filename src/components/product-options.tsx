"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  computeUnitPrice,
  devisSurMesure,
  epaisseurMaxMm,
  epaisseurMiniMm,
  priceFrom,
  prixRemise,
  remplissageConforme,
  SUR_MESURE,
  type Product,
  type ProductSize,
  type ProductSwatch,
} from "@/lib/products";
import { prixAffiche, surfaceAffichee } from "@/lib/ui";
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
import { PRISE_DE_COTES } from "@/lib/deplacement";
import { VisiteAtelier } from "./prise-de-cotes";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";

const ACCENT = "#6d2c2c";

const VOIR_PANIER = {
  fr: "Voir mon panier",
  en: "View my cart",
} as const;

/** Style commun à tous les intitulés d'option (dimensions, bois, acier…). */
const GROUP_LABEL =
  "block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]";

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
  return (
    <div className="w-full">
      <span className={`${GROUP_LABEL} text-center`} id={idGroupe}>
        {label}
      </span>
      {/* Les pastilles en rangée, centrées sous leur intitulé : la colonne est
          étroite, chaque groupe se lit comme un nuancier. */}
      <div role="group" aria-labelledby={idGroupe} className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-5 sm:gap-x-5">
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
                showDelta ? `${o.label} — ${formatDelta(o.priceDelta ?? 0, locale)}` : o.label
              }
              className="group w-[4.25rem] shrink-0 rounded-xl text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d2c2c] lg:w-[4.75rem]"
            >
              {/* La matière d'abord, grande et ronde ; son nom en dessous, sur
                  deux lignes s'il le faut — comme un nuancier. */}
              <MaterialBubble
                material={o}
                selected={isSelected}
                className="mx-auto aspect-square w-[3.5rem] transition-transform duration-200 group-hover:scale-[1.05] group-focus-visible:scale-[1.05] lg:w-[4rem]"
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
}) {
  const bornesId = `${id}-bornes`;
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
        <Pastille n={n} />
        {label}
      </span>
      {/* Le focus est porté par la pilule seule — bordure bordeaux et halo
          léger ; le filet de sécurité global est coupé sur le champ. */}
      <span className="flex h-10 w-[8.5rem] shrink-0 items-center gap-1 rounded-full border border-[#9a8d80] bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-[#6d2c2c] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]">
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
          className="w-full min-w-0 bg-transparent text-right text-base tabular-nums text-[#2b2320] placeholder:text-[#726757] outline-none focus-visible:shadow-none focus-visible:outline-none sm:text-[15px]"
        />
        <span className="text-xs text-[#6f6357]">{unite}</span>
        <span id={bornesId} className="sr-only">
          {bornes} {unite}
        </span>
      </span>
    </label>
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
}: {
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
}) {
  /** La taille à laquelle la fiche s'ouvre, s'il y en a une. */
  const tailleInitiale = (product.sizes.find((s) => s.default) ?? product.sizes[0])?.id ?? "";
  // Une pièce qui a un barème s'ouvre sans taille ni prix : le chiffre vient
  // avec les cotes du client (ou une taille du catalogue, s'il en choisit une).
  // Les autres s'ouvrent sur leur taille par défaut (la 8 places sur les
  // chaises vendues par lot, par exemple).
  const [sizeId, setSizeId] = useState(product.surMesure ? "" : tailleInitiale);
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
  const [unite, setUnite] = useState<"mm" | "cm" | "m">(
    product.surMesure?.axes === "plan" && product.category !== "lumiere" ? "cm" : "mm"
  );
  const [largeurSaisie, setLargeurSaisie] = useState("");
  const [hauteurSaisie, setHauteurSaisie] = useState("");
  /** La hauteur finie d'une table, du sol au dessus du plateau : 75 cm si on ne dit rien. */
  const [hauteurTableSaisie, setHauteurTableSaisie] = useState("");
  /** La hauteur finie se replie : une ligne « 75 cm · Modifier », le champ au clic. */
  const [hauteurOuverte, setHauteurOuverte] = useState(false);
  const [epaisseurSaisie, setEpaisseurSaisie] = useState("");
  /** Cote en cours de saisie : c'est elle qui s'allume sur le croquis. */
  const [coteActive, setCoteActive] = useState<CoteActive>(null);
  const [cotes, setCotes] = useState<
    { largeurMm: number; hauteurMm: number; epaisseurMm: number } | null
  >(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  // Essence de référence par défaut (écart nul), pas la première de la liste.
  const [ownWoodId, setOwnWoodId] = useState(
    (product.woods.find((w) => !w.priceDelta) ?? product.woods[0])?.id ?? ""
  );
  const woodId = woodIdProp ?? ownWoodId;
  const setWoodId = onWoodChange ?? setOwnWoodId;
  const [ownMetalId, setOwnMetalId] = useState(product.metals[0]?.id ?? "");
  const metalId = metalIdProp ?? ownMetalId;
  const setMetalId = onMetalChange ?? setOwnMetalId;
  const [ownFabricId, setOwnFabricId] = useState(product.fabrics?.[0]?.id ?? "");
  /** Le remplissage d'un garde-corps : celui du modèle, sauf si la norme oblige à passer au verre. */
  const [remplissageId, setRemplissageId] = useState(product.remplissages?.[0]?.id ?? "");
  const fabricIdChoisi = fabricIdProp ?? ownFabricId;
  const setFabricId = onFabricChange ?? setOwnFabricId;
  /** Sous un panneau de verre, il n'y a plus de croix : plus de rosace à choisir ni à payer. */
  const sansRosace =
    product.fabricLabel !== undefined &&
    product.remplissages?.some((option) => option.id === remplissageId && option.hauteurMaxConformeMm === undefined) === true;
  const fabricId = sansRosace ? (product.fabrics?.[0]?.id ?? "") : fabricIdChoisi;
  const [quantity, setQuantity] = useState(1);
  /** Configuration pour laquelle la confirmation d'ajout a été affichée. */
  const [ajoutee, setAjoutee] = useState<string | null>(null);
  /**
   * Sur téléphone, cette colonne fait plus de deux écrans de haut : le prix et
   * le bouton disparaissent dès qu'on descend choisir un bois ou taper ses
   * cotes. On suit donc le vrai bouton, et une barre prend le relais quand il
   * sort de l'écran.
   */
  /** Les cotes relevées chez le client (garde-corps), et la visite de l'atelier. */
  const [cotesGardeCorps, setCotesGardeCorps] =
    useState<CotesGardeCorps>(
      // Une pièce sur devis ne se mesure pas soi-même : c'est l'atelier qui vient.
      product.orderMode === "quote" ? { ...COTES_GARDE_CORPS_VIDES, qui: "atelier" } : COTES_GARDE_CORPS_VIDES
    );
  const boutonPanierRef = useRef<HTMLButtonElement>(null);
  /** Le bloc de relevé : pour y ramener le curseur quand on ajoute une autre fenêtre. */
  const releveRef = useRef<HTMLDivElement>(null);
  const [boutonVisible, setBoutonVisible] = useState(true);

  const { add, items: panier } = useCart();

  useEffect(() => {
    const bouton = boutonPanierRef.current;
    if (!bouton) return;
    const observateur = new IntersectionObserver(([entree]) =>
      setBoutonVisible(entree.isIntersecting)
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
  /** Une table se mesure en longueur × largeur, un panneau en largeur × hauteur. */
  const labelPrincipale = rond ? t.customDiameter : plan ? t.customLength : t.customWidth;
  const labelSecondaire = plan ? t.customWidth : t.customHeight;
  const facteur = unite === "mm" ? 1 : unite === "cm" ? 10 : 1000;
  /** Une cote en millimètres, écrite dans l'unité choisie : « 220 cm », « 2 200 mm », « 2,2 m ». */
  /** Le nombre seul, dans l'unité choisie : « 80 », « 4 ». */
  const chiffre = (mm: number, u: "mm" | "cm" | "m" = unite) =>
    (mm / (u === "mm" ? 1 : u === "cm" ? 10 : 1000)).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 });
  const enUnite = (mm: number, u: "mm" | "cm" | "m" = unite) => `${chiffre(mm, u)} ${u}`;
  const enMm = (valeur: string) => {
    const nombre = Number(valeur.replace(",", "."));
    return Number.isFinite(nombre) ? Math.round(nombre * facteur) : NaN;
  };
  /** La hauteur finie d'une table, en millimètres : 750 tant que rien n'est tapé. */
  const HAUTEUR_TABLE_MM = 750;
  const hauteurTableMm = hauteurTableSaisie === "" ? HAUTEUR_TABLE_MM : enMm(hauteurTableSaisie);
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

  /* Les bornes d'épaisseur ne sont pas fixes : un plateau s'épaissit avec sa
     portée, un caisson lumineux ne peut pas être plus profond que son panneau
     n'est étroit. L'aide sous la case annonçait « 25 – 80 mm » même sur une
     table de 3,50 m, où 25 mm est refusé. */
  const porteeMm = Math.max(
    Number.isFinite(largeurMm) ? largeurMm : 0,
    Number.isFinite(hauteurMm) ? hauteurMm : 0
  );
  const epaisseurMini = bareme
    ? porteeMm > 0
      ? epaisseurMiniMm(bareme, porteeMm)
      : bareme.epaisseur.minMm
    : 0;
  const epaisseurMaxi =
    bareme && porteeMm > 0 && Number.isFinite(largeurMm) && Number.isFinite(hauteurMm)
      ? epaisseurMaxMm(bareme, largeurMm, hauteurMm)
      : (bareme?.epaisseur.maxMm ?? 0);

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
    product.releve === "garde-corps-fenetre" ? calculDepuisCotes(cotesGardeCorps, t) : null;
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
        : cotes;
  const sizeIdEff =
    product.releve === "garde-corps-fenetre" ? (calculFenetre ? SUR_MESURE : "") : sizeId;
  /**
   * Une fenêtre plus large que le barème : le bouton se grise, mais il faut le
   * dire — sans ce mot, 4 555 mm tapés laissaient un bouton mort et personne
   * ne savait pourquoi.
   */
  const horsBareme =
    calculFenetre &&
    bareme &&
    !devisSurMesure(product, calculFenetre.largeurMm, calculFenetre.hauteurRetenueMm, bareme.epaisseur.refMm, locale).ok
      ? { largeurMaxMm: bareme.maxLargeurMm, hauteurMaxMm: bareme.maxHauteurMm }
      : null;

  const wood = product.woods.find((w) => w.id === woodId);
  const woodDelta = wood?.priceDelta ?? 0;
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
    }) ?? size?.price ?? null;

  /**
   * La norme, sur le remplissage : à partir d'une certaine hauteur, les croix
   * du modèle laissent des vides trop grands. On ne vend pas ça — on montre le
   * verre feuilleté (chiffré tout de suite) et les autres modèles.
   */
  const remplissage = product.remplissages?.find((option) => option.id === remplissageId);
  const remplissageModele = product.remplissages?.[0];
  const nonConforme =
    calculFenetre !== null && remplissage !== undefined && !remplissageConforme(remplissage, calculFenetre.hauteurRetenueMm);
  const croixConformes =
    calculFenetre !== null && remplissageModele !== undefined && remplissageConforme(remplissageModele, calculFenetre.hauteurRetenueMm);
  const verre = product.remplissages?.find((option) => option.hauteurMaxConformeMm === undefined);
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
      ? devisSurMesure(product, cotesEff.largeurMm, cotesEff.hauteurMm, cotesEff.epaisseurMm, locale)
      : null;

  /**
   * L'atelier vient mesurer : c'est la VISITE qu'on met au panier, pas le
   * garde-corps. Son prix vient du serveur (le code postal), son créneau de
   * l'agenda ; il faut les deux avant de pouvoir l'ajouter.
   */
  const modeVisite = product.priseDeCotes === true && cotesGardeCorps.qui === "atelier";
  const creneauVisite = modeVisite ? lireCreneau(cotesGardeCorps.rdv) : null;
  const visitePrete = modeVisite && cotesGardeCorps.deplacement !== null && creneauVisite !== null;
  const prixVisite = modeVisite && cotesGardeCorps.deplacement ? cotesGardeCorps.deplacement.montantCents / 100 : null;
  /** Ce qui s'affiche en grand et part au panier : la visite, sinon la pièce. */
  const total = modeVisite ? prixVisite : totalPiece;
  /**
   * Le prix du cadre sur-mesure, options comprises.
   * Il n'affichait que le barème au mètre carré : une table demandée en noyer
   * s'annonçait 3 500 € et se facturait 4 210 €, le supplément d'essence
   * n'ayant jamais été ajouté. C'est le même calcul que le serveur.
   */
  const prixSurMesure =
    devis?.ok
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
    ? panier.filter((ligne) => ligne.slug === product.slug).reduce((somme, ligne) => somme + ligne.quantity, 0)
    : 0;
  const lotActif = lot !== undefined && !modeVisite && dejaAuPanier + quantity >= lot.desPieces;
  const prixLot = lotActif && total !== null ? prixRemise(total, lot.taux) : total;
  /** Le délai, lu dans les caractéristiques : « Fabrication » / « Lead time ». */
  const delai = product.specs.find((spec) => /fabrication|lead time/i.test(spec.label))?.value;

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

  /* --- La liste des dimensions au clavier --- */
  function ouvrirFermerTailles() {
    setSizesOpen((ouvert) => {
      if (!ouvert) {
        const courant = product.sizes.findIndex((taille) => taille.id === sizeId);
        setLigneClavier(courant < 0 ? 0 : courant);
      }
      return !ouvert;
    });
  }

  function choisirTaille(id: string) {
    setSizeId(id);
    // On quitte le sur-mesure : les cotes ne comptent plus.
    setCotes(null);
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
          note: [product.name, wood?.label, metal?.label].filter(Boolean).join(" · "),
          name: t.gcVisiteResume,
          optionsLabel,
          unitPrice: cotesGardeCorps.deplacement.montantCents / 100,
        },
        1
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
              table && sizeIdEff === SUR_MESURE && Number.isFinite(hauteurTableMm) && hauteurTableMm !== HAUTEUR_TABLE_MM
              ? t.customTableHeightNote.replace("{h}", (hauteurTableMm / 10).toLocaleString(locale === "en" ? "en-GB" : "fr-FR"))
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
      quantity
    );
    setAjoutee(configuration);
  }

  return (
    /* pb-24 sur téléphone : la barre d'achat fixe ne doit pas recouvrir la fin
       de la colonne. */
    <div className="flex flex-col pb-24 md:pb-0">
      {/* En tête, seulement le prix de départ : le prix réel de la
          configuration est dans la barre d'achat, en bas de la colonne, et
          suit chaque choix. */}
      {modeVisite ? (
        <p className="text-[13px] text-[#6f6357]">{t.onQuote}</p>
      ) : bareme && total === null ? (
        /* Pas encore de cotes : le prix de départ s'il existe, et où taper,
           en deux lignes discrètes. */
        <p className="text-[13px] leading-snug text-[#6f6357]">
          {prixDepart !== null && (
            <span className="block tabular-nums">
              {t.from} <span className="text-[#2b2320]">{prixAffiche(prixDepart, locale)}</span>
            </span>
          )}
          <span className="mt-1 block text-xs text-[#7a6f64]">
            {product.releve === "garde-corps-fenetre" ? t.gcPrixAttente : t.prixAttenteCotes}
          </span>
        </p>
      ) : orderable ? (
        prixDepart !== null && (
          <p className="text-[13px] tabular-nums text-[#6f6357]">
            {t.from} <span className="text-[#2b2320]">{prixAffiche(prixDepart, locale)}</span>
          </p>
        )
      ) : (
        <p className="text-[13px] text-[#6f6357]">{t.onQuote}</p>
      )}

      {product.fabrics && product.fabrics.length > 0 && !product.fabricLabel && (
        <div className="mt-5 border-t border-[#e5ddd3] pt-5">
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
      {(product.woods.length > 0 || product.metals.length > 0) && (
        <div className="mt-5 border-t border-[#e5ddd3] pt-5">
          <div className="flex flex-col gap-7">
            {product.metals.length > 0 && (
              <SwatchGroup
                label={product.metalLabel ? product.metalLabel[locale] : t.metalLabel}
                options={product.metals}
                selected={metalId}
                onSelect={setMetalId}
                locale={locale}
              />
            )}
            {product.woods.length > 0 && (
              <SwatchGroup
                label={product.woodLabel ? product.woodLabel[locale] : t.woodLabel}
                options={product.woods}
                selected={woodId}
                onSelect={setWoodId}
                locale={locale}
                /* Les écarts ne se montrent que s'il y en a : sur une pièce sur
                   devis sans prix, quatre « Inclus » n'apprendraient rien. */
                showDelta={orderable && product.woods.some((bois) => bois.priceDelta)}
              />
            )}
            {/* Les rosaces d'un garde-corps, avec les matières — et pas sous un
                panneau de verre, où il n'y a plus de croix. */}
            {product.fabrics && product.fabrics.length > 0 && product.fabricLabel && !sansRosace && (
              <SwatchGroup
                label={product.fabricLabel[locale]}
                options={product.fabrics}
                selected={fabricId}
                onSelect={setFabricId}
                locale={locale}
                showDelta={product.fabrics.some((rosace) => rosace.priceDelta)}
              />
            )}
          </div>
        </div>
      )}

      {/* DIMENSIONS — le sur-mesure d'abord : c'est le cœur du métier, et la
          taille toute faite n'est qu'un raccourci pour ceux qui n'ont pas de
          cotes en tête. */}
      {((bareme && !product.releve) || (product.sizes.length > 1 && orderable)) && (
        <div className="mt-4 scroll-mt-28 border-t border-[#e5ddd3] pt-5" id="cotes">
          {/* Le titre, et l'unité de saisie en face : rien d'autre à lire. */}
          <div className="flex items-center justify-between gap-4">
            <span className={GROUP_LABEL} id={`${idTailles}-titre`}>
              {product.sizeLabel ? product.sizeLabel[locale] : t.sizeLabel}
            </span>
            {bareme && !product.releve && (
              <div role="radiogroup" aria-label={t.customUnit} className="flex rounded-full border border-[#9a8d80] bg-white p-0.5">
                {(["mm", "cm", "m"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={unite === u}
                    onClick={() => setUnite(u)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      unite === u ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {bareme && !product.releve && (
            <>
              {/* Le croquis, nu : c'est lui qui explique où mesurer. */}
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
                    principale: Number.isFinite(largeurMm) ? largeurMm : undefined,
                    secondaire: Number.isFinite(hauteurMm) ? hauteurMm : undefined,
                    epaisseur: Number.isFinite(epaisseurMm) ? epaisseurMm : undefined,
                  }}
                  labels={{
                    principale: labelPrincipale,
                    secondaire: labelSecondaire,
                    epaisseur: t.customThickness,
                  }}
                />
              </div>

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
                    devis && !devis.ok && !devis.reason.startsWith("epaisseur") ? `${idTailles}-erreur` : undefined
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
                    erreurId={
                      devis && !devis.ok && !devis.reason.startsWith("epaisseur") ? `${idTailles}-erreur` : undefined
                    }
                  />
                )}
                {bareme.epaisseur.choixMm ? (
                  /* Un plateau de table ne se coupe qu'à trois cotes : on
                     choisit, on ne tape pas. Les cotes trop fines pour la
                     longueur saisie restent visibles mais grisées. */
                  <div
                    className="flex items-center justify-between gap-4 py-3"
                    onFocus={() => setCoteActive("epaisseur")}
                    onBlur={() => setCoteActive(null)}
                  >
                    <span id={`${idTailles}-epaisseur-titre`} className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
                      <Pastille n={rond ? 2 : 3} />
                      {t.customThickness}
                    </span>
                    <span className="flex items-center gap-2">
                      <div
                        role="radiogroup"
                        aria-labelledby={`${idTailles}-epaisseur-titre`}
                        className="flex h-10 items-center rounded-full border border-[#9a8d80] bg-white p-0.5"
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
                              title={tropFin ? t.customThicknessTooThin.replace("{portee}", String(porteeMm)) : undefined}
                              onClick={() => setEpaisseurSaisie(String(mm))}
                              aria-label={`${mm} mm`}
                              className={`h-full rounded-full px-3.5 text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-[#a3968a] ${
                                choisi ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"
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
                      devis && !devis.ok && (devis.reason.startsWith("epaisseur") || devis.reason === "caisson_trop_profond")
                        ? `${idTailles}-erreur`
                        : undefined
                    }
                  />
                )}

                {/* La hauteur finie d'une table : 75 cm sauf demande, sans effet
                    sur le prix. Une ligne grise, sans numéro, qui ne montre son
                    champ qu'au clic. */}
                {table && (
                  <div className="flex items-center justify-between gap-4 py-2.5 text-sm text-[#6f6357]">
                    <span id={`${idTailles}-hauteur-titre`}>{t.customTableHeight}</span>
                    {hauteurOuverte ? (
                      <span className="flex h-10 w-[8.5rem] items-center gap-1 rounded-full border border-[#9a8d80] bg-white px-3.5 focus-within:border-[#6d2c2c] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]">
                        <input
                          id={`${idTailles}-hauteur`}
                          autoFocus
                          inputMode="decimal"
                          value={hauteurTableSaisie}
                          onChange={(e) => setHauteurTableSaisie(e.target.value)}
                          placeholder={(HAUTEUR_TABLE_MM / facteur).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                          aria-labelledby={`${idTailles}-hauteur-titre`}
                          aria-describedby={`${idTailles}-hauteur-aide`}
                          onFocus={() => setCoteActive("hauteur")}
                          onBlur={() => {
                            setCoteActive(null);
                            setHauteurOuverte(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") setHauteurOuverte(false);
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
                          {Number.isFinite(hauteurTableMm) ? enUnite(hauteurTableMm) : enUnite(HAUTEUR_TABLE_MM)}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="underline underline-offset-4">{t.customTableHeightEdit}</span>
                      </button>
                    )}
                    <span id={`${idTailles}-hauteur-aide`} className="sr-only">
                      {t.customTableHeightAide}
                    </span>
                  </div>
                )}
              </div>

              {/* Le prix, en grand dès qu'il existe, et le geste en face. */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <p
                    className="text-[28px] font-medium leading-none tabular-nums transition-colors"
                    style={{ color: devis?.ok ? ACCENT : "#6f6357" }}
                  >
                    {devis?.ok ? prixAffiche(prixSurMesure ?? devis.prix, locale) : "—"}
                  </p>
                  <p className="mt-1.5 text-xs text-[#6f6357]">
                    {devis?.ok
                      ? `${surfaceAffichee(devis.surface, locale)} · ${epaisseurMm.toLocaleString(
                          locale === "en" ? "en-GB" : "fr-FR"
                        )} mm`
                      : t.customAwait}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!devis?.ok}
                  onClick={() => {
                    setCotes({ largeurMm, hauteurMm, epaisseurMm });
                    setSizeId(SUR_MESURE);
                  }}
                  // En contour : régler ses cotes prépare l'achat, ce n'est pas
                  // l'action principale. Le seul bouton plein de la colonne
                  // reste « Ajouter au panier » (ou « Demander un devis »).
                  className="w-full rounded-full border border-[#2b2320] bg-transparent px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2b2320] transition-colors hover:bg-[#2b2320] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#2b2320] sm:w-auto"
                >
                  {sizeId === SUR_MESURE ? `✓ ${t.customApplied}` : t.customApply}
                </button>
              </div>
              <div>
                {/* Le refus doit s'entendre, pas seulement se voir : sans
                    role="alert" un lecteur d'écran ne disait rien et le client
                    continuait de taper devant un bouton grisé. */}
                <p id={`${idTailles}-erreur`} role="alert" className="mt-2 min-h-4 text-xs leading-snug text-[#6d2c2c]">
                  {devis && !devis.ok
                    ? devis.reason === "trop_petit"
                      ? t.customTooSmall
                      : devis.reason === "trop_grand"
                        ? t.customTooBig
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
                    : ""}
                </p>

                {/* Et le prix, lui, se dit dès qu'il change. */}
                <p role="status" aria-live="polite" className="sr-only">
                  {devis?.ok
                    ? `${prixAffiche(prixSurMesure ?? devis.prix, locale)} — ${surfaceAffichee(devis.surface, locale)}`
                    : ""}
                </p>

                {sizeId === SUR_MESURE && (
                  <button
                    type="button"
                    onClick={() => {
                      setCotes(null);
                      setSizeId("");
                    }}
                    className="mt-2 block text-xs text-[#6f6357] underline underline-offset-4 hover:text-[#2b2320]"
                  >
                    {t.customReset}
                  </button>
                )}
              </div>
            </>
          )}

          {/* La taille toute faite, en second. */}
          {product.sizes.length > 1 && (
            <div className={bareme && !product.releve ? "mt-7" : "mt-4"}>
              {bareme && !product.releve && (
                <span
                  className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[#6f6357]"
                  id={`${idTailles}-ou`}
                >
                  {t.customOr}
                </span>
              )}
          {/* Une seule ligne visible : les autres dimensions et leurs tarifs
              s'affichent au clic, comme dans une boutique. Le tout s'annonce
              comme une liste de choix et se parcourt aux flèches. */}
          <div
            ref={sizesRef}
            className="relative mt-4"
            onBlur={(e) => {
              if (!sizesRef.current?.contains(e.relatedTarget as Node)) setSizesOpen(false);
            }}
          >
            <button
              type="button"
              id={`${idTailles}-bouton`}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={sizesOpen}
              aria-controls={`${idTailles}-liste`}
              aria-labelledby={
                bareme
                  ? `${idTailles}-ou ${idTailles}-bouton`
                  : `${idTailles}-titre ${idTailles}-bouton`
              }
              aria-activedescendant={
                sizesOpen ? `${idTailles}-${product.sizes[ligneClavier]?.id}` : undefined
              }
              onClick={() => ouvrirFermerTailles()}
              onKeyDown={clavierTailles}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#e5ddd3] px-5 py-3.5 text-left text-sm text-[#2a2116] transition-colors hover:border-[#6f6357]"
            >
              <span className={labelTaille?.ok || size ? "" : "text-[#6f6357]"}>
                {labelTaille?.ok ? labelTaille.label : (size?.label ?? t.sizeChoose)}
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
                aria-labelledby={bareme ? `${idTailles}-ou` : `${idTailles}-titre`}
                className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[#e5ddd3] bg-white shadow-lg"
              >
                {product.sizes.map((s, index) => (
                  <div
                    key={s.id}
                    id={`${idTailles}-${s.id}`}
                    role="option"
                    aria-selected={s.id === sizeId}
                    onClick={() => choisirTaille(s.id)}
                    onMouseEnter={() => setLigneClavier(index)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left text-sm transition-colors ${
                      s.id === sizeId
                        ? "bg-[#6d2c2c]/5 text-[#2a2116]"
                        : "text-[#5c5140] hover:bg-[#f5f1ea]"
                    } ${index === ligneClavier ? "ring-2 ring-inset ring-[#6d2c2c]" : ""}`}
                  >
                    <span>{s.label}</span>
                    {/* Sur devis, pas de prix dans la liste : le chiffre viendrait avant le relevé. */}
                    {orderable && (
                      <span className="font-medium tabular-nums">
                        {prixAffiche(s.price + woodDelta, locale)}
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
        <div className="@container mt-4 scroll-mt-28 border-t border-[#e5ddd3] pt-4" id="cotes">
          <span className={GROUP_LABEL}>{t.gcVisiteResume}</span>
          {/* Uniquement sur devis : l'atelier vient prendre les cotes, et c'est
              la visite qu'on met au panier. Pas de cotes à taper soi-même. */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#e0d5c7] bg-[#fbfaf8]">
            <div className="px-3.5 pb-3.5 pt-3 md:px-4">
              <p className="text-xs leading-relaxed text-[#6f6357]">{t.releveVisiteIntro}</p>
              <VisiteAtelier
                cotes={cotesGardeCorps}
                onChange={(visite) => setCotesGardeCorps({ ...cotesGardeCorps, ...visite })}
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
                    choisirVerre: verre ? () => setRemplissageId(verre.id) : undefined,
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

      {orderable || modeVisite ? (
        /* La barre d'achat reste au bas de la colonne pendant qu'on choisit :
           sur grand écran elle se colle au bord inférieur, débordant du
           gabarit de la colonne pour aller d'un bord à l'autre. */
        <div className="mt-5 md:sticky md:bottom-0 md:z-20 md:-mx-8 md:border-t md:border-[#e5ddd3] md:bg-[#fbf9f6]/95 md:px-8 md:py-4 md:backdrop-blur lg:-mx-12 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xl font-medium leading-tight tabular-nums" style={{ color: ACCENT }}>
                {modeVisite
                  ? t.onQuote
                  : total !== null
                    ? prixAffiche(total, locale)
                    : bareme
                      ? "— €"
                      : prixDepart !== null
                        ? `${t.from} ${prixAffiche(prixDepart, locale)}`
                        : t.onQuote}
              </p>
              {size && !modeVisite && orderable && total !== null && (
                <p className="truncate text-[11px] text-[#6f6357]">
                  {cotesCourtes(
                    sizeIdEff === SUR_MESURE && labelTaille?.ok ? labelTaille.label : size.label
                  )}
                </p>
              )}
            </div>
            <div className={`flex shrink-0 items-center rounded-full border border-[#9a8d80] ${modeVisite ? "hidden" : ""}`}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 text-[#5c5140] hover:text-[#2a2116]"
                aria-label={locale === "fr" ? "Diminuer la quantité" : "Decrease quantity"}
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="px-4 py-3 text-[#5c5140] hover:text-[#2a2116]"
                aria-label={locale === "fr" ? "Augmenter la quantité" : "Increase quantity"}
              >
                +
              </button>
            </div>

            <button
              ref={boutonPanierRef}
              type="button"
              onClick={addToCart}
              disabled={total === null || (modeVisite && !visitePrete)}
              className="shrink-0 rounded-full px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {t.addToCart}
            </button>
          </div>
          {/* Ce que ce prix-là comprend : sans cette ligne, cliquer « Noyer »
              faisait bondir le chiffre de 710 € sans un mot d'explication. */}
          {optionsLabel && !modeVisite && total !== null && (
            <p className="mt-2 text-[11px] text-[#5c5140]">{optionsLabel}</p>
          )}

          {/* Le grand prix reste unitaire : on affiche le total dès qu'on en commande plusieurs. */}
          {quantity > 1 && total !== null && (
            <p className="mt-3 text-center text-sm tabular-nums text-[#5c5140]">
              {lotActif && prixLot !== total && (
                <s className="mr-1.5 text-[#6f6357]">{prixAffiche(total, locale)}</s>
              )}
              {prixAffiche(prixLot ?? total, locale)} × {quantity} {t.cartTotalLine}{" "}
              <span className="font-medium">{prixAffiche((prixLot ?? total) * quantity, locale)}</span>
              {lotActif && (
                <span className="ml-2 rounded-full bg-[#6d2c2c]/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6d2c2c]">
                  {t.gcLotTag.replace("{taux}", String(Math.round((lot?.taux ?? 0) * 100)))}
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
                  <span className="font-medium text-[#6d2c2c]">
                    {t.gcLotDeja.replace("{n}", String(dejaAuPanier))}
                  </span>{" "}
                  {quantity === 1 && prixLot !== null && prixLot !== total && (
                    <span className="tabular-nums">
                      <s className="text-[#6f6357]">{prixAffiche(total, locale)}</s>{" "}
                      <span className="font-medium text-[#2a2116]">{prixAffiche(prixLot, locale)}</span>
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
                  className="inline-block rounded-full border border-[#6d2c2c] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d2c2c] transition-colors hover:bg-[#6d2c2c] hover:text-white"
                >
                  {VOIR_PANIER[locale]}
                </Link>
                {/* Une autre fenêtre : on vide les cotes, on garde le bois et
                    l'acier, et le curseur revient dans la première case. */}
                {lot && !modeVisite && (
                  <button
                    type="button"
                    onClick={() => {
                      setCotesGardeCorps({ ...cotesGardeCorps, largeur: "", allege: "", fenetre: "" });
                      setQuantity(1);
                      setAjoutee(null);
                      const premiere = releveRef.current?.querySelector<HTMLInputElement>("input[inputmode=decimal]");
                      premiere?.focus();
                      premiere?.scrollIntoView({ block: "center", behavior: "smooth" });
                    }}
                    className="inline-block rounded-full border border-[#e5ddd3] bg-white px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2a2116] transition-colors hover:border-[#6d2c2c] hover:text-[#6d2c2c]"
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
              optionsLabel
            )}`}
            className="block rounded-full px-6 py-3.5 text-center text-sm font-medium uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            {t.requestQuote}
          </Link>
          <p className="mt-3 text-center text-sm leading-relaxed text-[#726757]">{t.quoteNote}</p>
        </div>
      )}

      {/* Ce que le prix comprend, juste sous le bouton, en petit : le délai,
          la livraison, l'atelier, le paiement. */}
      <ul className="mt-4 grid gap-1.5 border-t border-[#e5ddd3] pt-3 text-xs leading-relaxed text-[#5c5140]">
        {/* Pour une visite, ni délai de fabrication ni livraison : seul le paiement sécurisé reste vrai. */}
        {(modeVisite
          ? [t.inclusAtelier, t.inclusPaiement]
          : [
              delai,
              // Le garde-corps se pose soi-même, fixations fournies : pas de montage sur place.
              product.releve === "garde-corps-fenetre" ? t.inclusLivraisonPose : t.inclusLivraison,
              t.inclusAtelier,
              orderable ? t.inclusPaiement : null,
            ]
        )
          .filter(Boolean)
          .map((ligne) => (
            <li key={ligne} className="flex items-start gap-2.5">
              <svg
                viewBox="0 0 20 20"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#6d2c2c]"
              >
                <path d="M4 10.5l4 4 8-9" />
              </svg>
              <span>{ligne}</span>
            </li>
          ))}
      </ul>

      <p className={`${GROUP_LABEL} mt-4`}>{t.madeInFrance}</p>

      {/* La barre d'achat du téléphone : elle n'apparaît que lorsque le vrai
          bouton est sorti de l'écran, et disparaît dès qu'il revient. */}
      {orderable && !boutonVisible && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[#e5ddd3] bg-[#fbf9f6]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="min-w-0">
            <p
              className="text-lg font-medium leading-tight tabular-nums"
              style={{ color: ACCENT }}
            >
              {total !== null
                ? prixAffiche(total, locale)
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
                sizeIdEff === SUR_MESURE && labelTaille?.ok ? labelTaille.label : (size?.label ?? "")
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={total === null || (modeVisite && !visitePrete)}
            className="ml-auto shrink-0 rounded-full px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-white disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {t.addToCart}
          </button>
        </div>
      )}
    </div>
  );
}
