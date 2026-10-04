"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { InfoBulle } from "./info-bulle";
import { QuiMesure, VisiteAtelier } from "./prise-de-cotes";
import { SchemaFenetre, NUMERO_COTE, type CoteFenetre } from "./schema-fenetre";
import {
  BORNES_RELEVE_GC,
  MAIN_COURANTE_MM,
  lireReponsePrixGC,
  noteReleveGC,
  parametresPrixGC,
  type ModeleGC,
  type OptionsGC,
  type ReleveGC,
  type ReponsePrixGC,
  type TrousGC,
} from "@/lib/garde-corps";
import type { Deplacement } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";
import { idModeleGC, lireModeleGC } from "@/lib/garde-corps";

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
  // « 1 180 » (avec l'espace, comme le site écrit lui-même ses nombres) et « 1180 mm » se lisent aussi.
  const nombre = Number(valeur.replace(/[\s\u00a0\u202f]/g, "").replace(/mm$/i, "").replace(",", "."));
  return valeur.trim() !== "" && Number.isFinite(nombre) && nombre >= 0 ? Math.round(nombre) : NaN;
};

/** Ce que disent les cases : un relevé complet, ce qui manque, ou une cote hors de ce que l'atelier fabrique. */
export type LectureReleve =
  /**
   * `manque` : la première chose qui manque, pour le dire précisément au client — la largeur (①), le bas de
   * la fenêtre (②), la hauteur de fenêtre tapée de travers (③, facultative), ou « etage » quand les cotes
   * sont là mais que le client n'a pas dit où est la fenêtre.
   */
  | { etat: "incomplet"; manque: "largeur" | "allege" | "fenetre" | "etage"; illisible?: boolean }
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
  // `illisible` : la case est remplie, mais ce n'est pas une mesure (des lettres, zéro, un nombre négatif).
  if (!Number.isFinite(largeurMm) || largeurMm <= 0) return { etat: "incomplet", manque: "largeur", illisible: cotes.largeur.trim() !== "" };
  if (!Number.isFinite(allegeMm)) return { etat: "incomplet", manque: "allege", illisible: cotes.allege.trim() !== "" };
  if (!Number.isFinite(fenetreMm)) return { etat: "incomplet", manque: "fenetre", illisible: true };
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

/**
 * Ce qui manque, dit précisément (« j'ai tout indiqué et je ne peux pas ajouter au panier » : la largeur
 * affichait sa valeur d'exemple en gris, et le site ne disait pas QUELLE mesure manquait).
 */
export function texteManqueGC(lecture: LectureReleve | null | undefined, locale: "fr" | "en"): string | null {
  if (lecture?.etat !== "incomplet") return null;
  const fr = locale === "fr";
  switch (lecture.manque) {
    case "largeur":
      if (lecture.illisible) return fr ? "La mesure ① (largeur) n'est pas un nombre : corrigez-la." : "Measurement ① (width) is not a number: please correct it.";
      return fr ? "Il manque la mesure ① : la largeur de la fenêtre." : "Measurement ① is missing: the width of the window.";
    case "allege":
      if (lecture.illisible) return fr ? "La mesure ② (du sol au bas de la fenêtre) n'est pas un nombre : corrigez-la." : "Measurement ② (floor to bottom of the window) is not a number: please correct it.";
      return fr ? "Il manque la mesure ② : du sol au bas de la fenêtre." : "Measurement ② is missing: from the floor to the bottom of the window.";
    case "fenetre":
      return fr
        ? "La mesure ③ n'est pas un nombre : corrigez-la ou effacez-la (elle est facultative)."
        : "Measurement ③ is not a number: correct it or clear it (it is optional).";
    case "etage":
      return fr ? "Dites où est la fenêtre : en étage ou au rez-de-chaussée." : "Tell us where the window is: upstairs or on the ground floor.";
  }
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
  resultatSlot,
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
  /** Grand écran, trois colonnes : le résultat va en tête de la troisième colonne (au lieu de sous le croquis). */
  resultatSlot?: HTMLDivElement | null;
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
  /** La rangée des modèles, qui défile de côté (règle de Quentin, 05/10 : « Votre modèle » ne doit jamais être coupé). */
  const bande = useRef<HTMLDivElement | null>(null);
  /** Le modèle hors norme dont le client veut voir le pourquoi (les ronds rouge et vert de l'outil de plans). */
  const [pourquoi, setPourquoi] = useState<string | null>(null);

  /** La réponse du serveur pour les cotes ET le modèle demandés. */
  const brute = prix.statut === "pret" ? prix.reponse : null;
  // Le modèle choisi (un DESSIN : croix, barreaux — le serveur l'essaie dans tous les carrés de l'atelier) ne
  // passe plus la norme avec ces cotes. On ne montre pas « à étudier » : on retire le choix, le serveur
  // recalcule, et la bande des modèles dit pourquoi — c'est l'ensemble modèle + fenêtre qui ne va plus.
  const modeleRefuse = Boolean(cotes.modele) && brute !== null && !brute.ok;
  const reponse = modeleRefuse ? null : brute;
  /** Ce que le croquis dessine : la réponse, ou la dernière pendant qu'on recalcule. */
  const dessin = reponse ?? (prix.statut === "calcul" ? prix.precedent : null);
  const conforme = reponse?.ok ? reponse : null;
  const surVerre = verre?.surVerre === true;
  const releve = lecture.etat === "ok" ? lecture.releve : null;
  /** Le modèle que le client avait choisi et qui ne va plus avec ses nouvelles mesures : on le lui dit. */
  const [perdu, setPerdu] = useState<{ croix: number; barreaux: boolean; traverse: boolean; raisons: readonly string[]; pour: string } | null>(null);
  /** Les mesures affichées : le message « modèle perdu » ne vaut que pour celles du refus. */
  const mesures = `${cotes.largeur}|${cotes.allege}|${cotes.fenetre}|${cotes.etage}`;
  /** Le refus déjà pris en compte (la réponse du serveur) : on ne le note qu'une fois. */
  const [refusVu, setRefusVu] = useState<ReponsePrixGC | null>(null);
  if (modeleRefuse && brute && !brute.ok && refusVu !== brute) {
    const voulu = lireModeleGC(cotes.modele);
    setRefusVu(brute);
    // D'autres modèles conviennent : on explique. (Barre d'appui, fenêtre trop basse… : le message du résultat suffit.)
    setPerdu(voulu && brute.raison === "a-etudier" && brute.modeles.some((m) => m.conforme) ? { croix: voulu.croix, barreaux: voulu.barreauxBas, traverse: voulu.traverse, raisons: brute.alertes, pour: mesures } : null);
  }
  useEffect(() => {
    if (modeleRefuse) onChange({ ...cotes, modele: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeleRefuse]);
  /** Le client a commencé à remplir : à partir de là, on lui montre précisément ce qui manque. */
  const commence = cotes.largeur.trim() !== "" || cotes.allege.trim() !== "" || cotes.fenetre.trim() !== "" || t.gcEtageOptions.includes(cotes.etage);
  const manque = commence && lecture.etat === "incomplet" ? lecture.manque : null;
  const texteManque = commence ? texteManqueGC(lecture, locale) : null;
  const nombre = (n: number) => n.toLocaleString(langue);
  const croixTexte = (n: number) => (n > 1 ? t.gcCroixPlusieurs.replace("{n}", String(n)) : t.gcCroixUne);
  const fr = locale === "fr";
  // Le catalogue : tous les dessins, chacun marqué « aux normes » ou non pour CETTE fenêtre. Pendant un
  // recalcul, ceux de la réponse précédente restent affichés, estompés (la bande se vidait à chaque touche).
  const sourceModeles = brute ?? (prix.statut === "calcul" ? prix.precedent : null);
  const modeles = sourceModeles && !surVerre ? sourceModeles.modeles : [];
  const modelesPerimes = brute === null && modeles.length > 0;
  const hMax = Math.max(1, ...modeles.map((m) => m.hauteurMm));
  // Le garde-corps de la photo : deux croix, sans barreaux. La norme en demande parfois plus.
  // Le garde-corps de la photo : deux croix, sans barreaux. S'il n'est pas aux normes ici, on le dit.
  const adapte = modeles.length > 0 && !modeles.some((m) => m.conforme && m.croix === 2 && m.soubassementMm === 0 && !m.traverse);
  // Le modèle choisi se reconnaît à son DESSIN (croix, barreaux), pas à son carré : le serveur peut l'avoir
  // retenu dans un carré plus gros que celui de l'identifiant.
  const voulu = lireModeleGC(cotes.modele);
  const estChoisi = (m: { id: string; croix: number; soubassementMm: number; traverse: boolean }) =>
    conforme
      ? m.croix === conforme.croix && m.soubassementMm > 0 === conforme.soubassementMm > 0 && m.traverse === conforme.traverse
      : m.id === cotes.modele || (voulu !== null && m.croix === voulu.croix && m.traverse === voulu.traverse && lireModeleGC(m.id)?.barreauxBas === voulu.barreauxBas);
  const choisi = voulu ? (modeles.find((m) => m.conforme && estChoisi(m)) ?? null) : null;
  const nbConformes = modeles.filter((m) => m.conforme).length;
  // Rien ne convient : le modèle le plus proche de la norme est expliqué d'emblée — le client voit le rond
  // rouge (le vide trop grand) au lieu de seulement lire « à étudier ». Le catalogue, lui, reste à sa demande.
  const rienNeConvient = modeles.length > 0 && nbConformes === 0;
  const plusProche = rienNeConvient
    ? ([...modeles].sort((a, b) => (a.trous ? a.trous.plusGrandMm / a.trous.limiteMm : 99) - (b.trous ? b.trous.plusGrandMm / b.trous.limiteMm : 99))[0] ?? null)
    : null;
  const explique = (pourquoi ? modeles.find((m) => m.id === pourquoi && !m.conforme) : null) ?? plusProche;
  const libelleModele = (m: { croix: number; soubassementMm: number; traverse: boolean }) =>
    `${croixTexte(m.croix)}${m.traverse ? (fr ? ", traverse au milieu" : ", middle rail") : ""}${m.soubassementMm > 0 ? (fr ? ", barreaux en bas" : ", bars below") : ""}`;
  const pastille = (ok: boolean) => (
    <span
      aria-hidden
      className={`absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-white shadow-sm ${ok ? "bg-[#2f7d46]" : "bg-[#b3261e]"}`}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
        {ok ? <path d="M4.5 10.5l3.5 3.5 7.5-8" /> : <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />}
      </svg>
    </span>
  );
  /**
   * Les modèles, toujours visibles sous le croquis — en petit, pour laisser la place au croquis :
   * avant les mesures (sans pastille), puis ceux qui sont aux normes pour la fenêtre ; un bouton
   * ouvre le catalogue entier, modèles hors norme compris.
   */
  /** Pourquoi un modèle ne va pas AVEC cette fenêtre, en mots simples (le modèle, lui, n'est pas en cause). */
  const raisonEnMots = (raisons: readonly string[]): string =>
    raisons.includes("trous")
      ? fr
        ? "l'espace entre les barres serait trop grand"
        : "the gap between the bars would be too wide"
      : raisons.includes("fixation")
        ? fr
          ? "sur cette largeur, les vis dans le mur seraient trop sollicitées"
          : "over this width, the screws in the wall would be overloaded"
        : raisons.includes("solidite") || raisons.includes("charge-verticale")
        ? fr
          ? "sur cette largeur, la barre du haut ne serait pas assez rigide"
          : "over this width the top rail would not be stiff enough"
        : raisons.includes("soubassement")
          ? fr
            ? "si près du sol, le bas doit être fermé par des barreaux"
            : "this close to the floor, the bottom must be closed with bars"
          : raisons.includes("fenetre")
            ? fr
              ? "il ne tiendrait pas dans la hauteur de la fenêtre"
              : "it would not fit in the height of the window"
            : raisons.includes("trop-petit")
              ? fr
                ? "le garde-corps serait trop bas pour ce dessin"
                : "the railing would be too low for this design"
              : "";
  // « Ce n'est pas le modèle qui n'est pas aux normes, c'est l'ensemble modèle + fenêtre » (Quentin, 04/10).
  const pasAdapte = (m: { raisons: readonly string[] }) => {
    const mots = raisonEnMots(m.raisons);
    return fr
      ? `Ce modèle + votre fenêtre : l'ensemble ne serait pas aux normes${mots ? ` (${mots})` : ""}`
      : `This model + your window: together they would not meet the standard${mots ? ` (${mots})` : ""}`;
  };
  /** Le modèle de la photo (deux croix, sans barreaux) : pourquoi il ne va pas avec cette fenêtre. */
  const raisonPhoto = raisonEnMots(modeles.find((m) => m.croix === 2 && m.soubassementMm === 0 && !m.traverse && !m.conforme)?.raisons ?? []);
  const libelleCourt = (m: { croix: number; soubassementMm: number; traverse: boolean }) =>
    `${m.croix} ${fr ? "croix" : m.croix > 1 ? "crosses" : "cross"}${m.traverse ? (fr ? " + traverse" : " + rail") : ""}${m.soubassementMm > 0 ? (fr ? " + barreaux" : " + bars") : ""}`;
  /** La phrase de la bande : ce qu'il faut faire, ou pourquoi le modèle de la photo ne va pas avec CETTE fenêtre. */
  const phraseModeles =
    modeles.length === 0
      ? reponse && !reponse.ok && reponse.raison === "barre-appui"
        ? fr
          ? "Pas de modèle à croix pour cette fenêtre : une barre d'appui, sur devis."
          : "No model with crosses for this window: a support bar, on quotation."
        : reponse && !reponse.ok && reponse.raison === "sans-garde-corps"
          ? fr
            ? "Votre fenêtre n'a pas besoin de garde-corps."
            : "Your window does not need a railing."
          : texteManque
            ? fr
              ? `${texteManque} Nous vous proposerons ensuite les modèles qui conviennent à votre fenêtre.`
              : `${texteManque} We will then show the models that suit your window.`
            : lecture.etat === "incomplet"
              ? fr
                ? "Entrez vos mesures : nous vous proposons les modèles qui conviennent à votre fenêtre."
                : "Enter your measurements: we show the models that suit your window."
              : // Les mesures sont là : le calcul est en cours, ou il n'y a pas de modèle à proposer (le résultat dit pourquoi).
                prix.statut === "calcul"
                ? t.gcCalcul
                : ""
      : nbConformes === 0
        ? fr
          ? "Aucun de nos modèles ne convient à cette fenêtre."
          : "None of our models fits this window."
        : perdu && perdu.pour === mesures && !choisi
          ? fr
            ? `Le modèle que vous aviez choisi (${libelleCourt({ croix: perdu.croix, soubassementMm: perdu.barreaux ? 1 : 0, traverse: perdu.traverse })}) + ces mesures : l'ensemble ne serait plus aux normes${raisonEnMots(perdu.raisons) ? ` (${raisonEnMots(perdu.raisons)})` : ""}. Choisissez-en un autre.`
            : `The model you had chosen (${libelleCourt({ croix: perdu.croix, soubassementMm: perdu.barreaux ? 1 : 0, traverse: perdu.traverse })}) + these measurements: together they would no longer meet the standard${raisonEnMots(perdu.raisons) ? ` (${raisonEnMots(perdu.raisons)})` : ""}. Choose another one.`
          : adapte
            ? fr
              ? `Le modèle de la photo n'est pas aux normes ici${raisonPhoto ? ` (${raisonPhoto})` : ""}. Choisissez-en un adapté.`
              : `The model in the photo is not to standard here${raisonPhoto ? ` (${raisonPhoto})` : ""}. Choose one that fits.`
            : fr
              ? "Ces modèles conviennent à votre fenêtre. Choisissez le vôtre."
              : "These models suit your window. Choose yours.";
  // Le modèle montré en grand sur le croquis : celui que le client vient de toucher s'il n'est pas aux normes (avec ses
  // ronds rouge et vert), ou — quand rien ne convient — le plus proche de la norme.
  const idSelectionne = explique ? explique.id : (choisi?.id ?? null);
  useEffect(() => {
    const zone = bande.current;
    if (!zone || !idSelectionne) return;
    const tuile = zone.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (tuile) zone.scrollTo({ left: Math.max(0, tuile.offsetLeft - (zone.clientWidth - tuile.clientWidth) / 2), behavior: "smooth" });
  }, [idSelectionne]);
  const marque = modeles.length > 0;
  const liste: ModeleGC[] = marque ? modeles : MODELES_VITRINE;
  const catalogue = (
    /* Sous le croquis : UNE rangée de modèles qui défile de côté, chacun avec son prix et sa pastille verte ou rouge
       (aux normes ou non pour cette fenêtre). On touche un modèle : il s'affiche en grand sur le croquis. */
    <div id="modeles-gc" className="carte-verre carte-modeles mt-3 scroll-mt-24 rounded-[22px] px-4 pb-3 pt-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{fr ? "Votre modèle" : "Your model"}</p>
        <span className="flex items-center gap-x-3 text-[12px] font-medium text-[#2b2320]">
          {/* Un garde-corps à son style : une photo, et l'atelier répond. Toujours là, en lien discret. */}
          {lienDevis && (
            <Link
              href={lienDevis}
              title={fr ? "Envoyez-nous une photo : réponse en 24 à 72 h" : "Send us a photo: reply within 24 to 72 h"}
              className="underline underline-offset-4 transition-colors hover:text-[#6d2c2c]"
            >
              {fr ? "Votre style, sur photo" : "Your style, from a photo"}
            </Link>
          )}
          {liste.length > 3 && (
            <span className="flex gap-1">
              {([-1, 1] as const).map((sens) => (
                <button
                  key={sens}
                  type="button"
                  aria-label={sens < 0 ? (fr ? "Modèles précédents" : "Previous models") : fr ? "Modèles suivants" : "Next models"}
                  onClick={() => bande.current?.scrollBy({ left: sens * 220, behavior: "smooth" })}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#2b2320] ring-1 ring-[#2b2320]/20 transition-colors hover:bg-white"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                    <path d={sens < 0 ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} />
                  </svg>
                </button>
              ))}
            </span>
          )}
        </span>
      </div>
      {phraseModeles && <p className={`mt-1 text-[12px] leading-snug ${modeles.length === 0 && texteManque ? "font-medium text-[#7a4510]" : "text-[#5c5140]"}`}>{phraseModeles}</p>}
      {liste.length > 0 && (
        <div
          ref={bande}
          role="group"
          aria-label={fr ? "Modèles de garde-corps" : "Railing models"}
          aria-busy={modelesPerimes}
          style={{ scrollbarWidth: "thin" }}
          className={`relative -mx-1 mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1.5 pt-0.5 transition-opacity ${modelesPerimes ? "opacity-60" : ""}`}
        >
          {liste.map((m) => {
            const actif = choisi !== null && choisi.id === m.id;
            const horsNorme = marque && !m.conforme;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={marque ? (m.conforme ? actif : explique?.id === m.id) : undefined}
                aria-label={`${libelleModele(m)}${marque ? (m.conforme ? ` — ${prixAffiche(m.prix, locale)}` : ` — ${pasAdapte(m)} — ${fr ? "toucher pour voir pourquoi" : "tap to see why"}`) : ""}`}
                title={horsNorme ? `${pasAdapte(m)} — ${fr ? "touchez pour voir pourquoi" : "tap to see why"}` : libelleModele(m)}
                onClick={() => {
                  if (!marque) document.getElementById(`${idChamps}-largeur`)?.focus();
                  else if (m.conforme) {
                    setPerdu(null);
                    setPourquoi(null);
                    onChange({ ...cotes, modele: m.id });
                  } else setPourquoi((p) => (p === m.id ? null : m.id));
                }}
                className={`tuile-modele relative flex w-[92px] shrink-0 snap-start flex-col px-2 pb-2 pt-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] ${horsNorme ? "tuile-hors-norme" : ""}`}
              >
                {marque && pastille(m.conforme)}
                <MiniGardeCorps
                  largeurMm={releve?.largeurMm ?? 1180}
                  hauteurMm={m.hauteurMm}
                  hMaxMm={marque ? hMax : 520}
                  soubassementMm={m.soubassementMm}
                  traverse={m.traverse}
                  croix={m.croix}
                  trous={horsNorme ? m.trous : null}
                  hauteurPx={34}
                />
                <span className="mt-1.5 block text-[12px] font-semibold leading-tight text-[#2b2320]">
                  {m.croix} {fr ? "croix" : m.croix > 1 ? "crosses" : "cross"}
                </span>
                <span className="block min-h-[2.4em] text-[10px] leading-tight text-[#6f6357]">
                  {m.traverse && <span className="block">{fr ? "+\u00a0traverse" : "+\u00a0rail"}</span>}
                  {m.soubassementMm > 0 && <span className="block">{fr ? "+\u00a0barreaux" : "+\u00a0bars"}</span>}
                </span>
                {marque && (
                  <span className={`mt-auto block pt-0.5 text-[12px] font-medium leading-tight tabular-nums ${m.conforme ? "text-[#2b2320]" : "text-[#6d2c2c]"}`}>
                    {m.conforme ? prixAffiche(m.prix, locale) : fr ? "hors norme" : "off-standard"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
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
    <div className="py-2.5">
      <label htmlFor={`${idChamps}-${cote}`} className="flex items-center gap-2 text-[13.5px] leading-snug text-[#2b2320]">
        <Pastille n={NUMERO_COTE[cote]} />
        <span className="min-w-0 flex-1">
          {props.label}
          {/* La mesure qui manque : la même étiquette que « à choisir » pour l'étage. */}
          {manque === cote && (
            <span className="ml-2 inline-block rounded-full bg-[#fbeeda] px-2 py-0.5 align-middle text-[11px] font-medium text-[#7a4510]">
              {cotes[cote].trim() !== "" ? (fr ? "à corriger" : "to correct") : fr ? "à remplir" : "to fill in"}
            </span>
          )}
        </span>
        <InfoBulle texte={props.aide ? `${props.info} ${props.aide}` : props.info} label={t.gcInfoLabel} />
      </label>
      {/* Faire glisser, ou taper la cote : le curseur et la case sur la même ligne. */}
      <div className="mt-1.5 flex items-center gap-3">
        <input
          type="range"
          aria-label={props.label}
          min={CURSEURS[cote].min}
          max={CURSEURS[cote].max}
          step={5}
          value={Number.isFinite(mm(cotes[cote])) ? Math.min(CURSEURS[cote].max, Math.max(CURSEURS[cote].min, mm(cotes[cote]))) : CURSEURS[cote].depart}
          onChange={(e) => set(cote)(e.target.value)}
          // Un clic sur le curseur sans le déplacer : le client garde la valeur où il attend. Elle devient
          // sa mesure (avant, la case restait vide alors que le curseur avait l'air réglé).
          onPointerUp={(e) => {
            if (e.button === 0 && cotes[cote].trim() === "") set(cote)(e.currentTarget.value);
          }}
          onFocus={() => setCoteActive(cote)}
          onBlur={() => setCoteActive(null)}
          className={`curseur-cote block h-5 min-w-0 flex-1 cursor-pointer ${cotes[cote].trim() === "" ? "curseur-vide" : ""}`}
        />
        <span
          className={`flex h-9 w-[6.75rem] shrink-0 items-center gap-1 rounded-full border border-[#9a8d80] bg-white px-3 transition-[border-color,box-shadow] focus-within:border-[#2b2320] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)] ${
            manque === cote ? "outline outline-2 outline-[#c98a3a]" : ""
          }`}
        >
          <input
            id={`${idChamps}-${cote}`}
            inputMode="decimal"
            value={cotes[cote]}
            onChange={(e) => set(cote)(e.target.value)}
            // « ex. 1180 », en italique : une valeur d'EXEMPLE, pas une mesure saisie.
            placeholder={`${fr ? "ex." : "e.g."} ${props.placeholder}`}
            onFocus={() => setCoteActive(cote)}
            onBlur={() => setCoteActive(null)}
            className="w-full min-w-0 bg-transparent text-right text-base tabular-nums text-[#2b2320] placeholder:text-[13px] placeholder:italic placeholder:text-[#726757] outline-none focus-visible:shadow-none focus-visible:outline-none sm:text-[15px]"
          />
          <span className="text-xs text-[#6f6357]">mm</span>
        </span>
      </div>
    </div>
  );

  /** Le grand chiffre : le prix, « à étudier », « sur devis », ou un tiret. */
  const grandChiffre =
    lecture.etat === "hors-bornes"
      ? lecture.raison === "allege"
        ? fr
          ? "Pas besoin de garde-corps"
          : "No railing needed"
        : t.onQuote
      : conforme
        ? prixAffiche(conforme.prix, locale)
        : reponse && !reponse.ok
          ? reponse.raison === "barre-appui"
            ? fr
              ? "Une barre d'appui"
              : "A support bar"
            : reponse.raison === "sans-garde-corps"
              ? fr
                ? "Pas besoin de garde-corps"
                : "No railing needed"
              : t.gcAEtudierCourt
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
        <>
          {/* L'atelier s'occupe de tout : à la place du croquis (rien à mesurer), un panneau qui le dit
              et qui détend — sur téléphone, il passe au-dessus du code postal. */}
          {schemaSlot ? createPortal(<Serenite fr={fr} />, schemaSlot) : <Serenite fr={fr} petit />}
          <VisiteAtelier cotes={cotes} onChange={(visite) => onChange({ ...cotes, ...visite })} t={t} locale={locale} />
        </>
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
              croix={explique ? explique.croix : dessin?.ok ? dessin.croix : undefined}
              soubassementMm={explique ? explique.soubassementMm : dessin?.ok ? dessin.soubassementMm : 0}
              traverse={explique ? explique.traverse : dessin?.ok ? dessin.traverse : false}
              renfort={explique ? false : dessin?.ok ? dessin.renfort : false}
              trous={explique?.trous ?? null}
              rosaceMm={rosaceMm}
              apercu={commence && !dessin?.ok && !explique}
              remplissage={surVerre ? "verre" : "croix"}
              actif={coteActive}
              onChoisir={allerA}
              locale={locale}
              labels={{
                largeur: t.gcSchemaLargeur,
                allege: t.gcSchemaAllege,
                fenetre: t.gcSchemaFenetre,
                hauteur: t.gcSchemaHauteur,
                metre: t.gcSchemaMetre.replace("{m}", nombre(MAIN_COURANTE_MM)),
                interieur: t.gcSchemaInterieur,
                jour: t.gcSchemaJour,
              }}
            />
          );
          // La puce en haut à droite du croquis : verte (aux normes) ou rouge (pas aux normes) pour le modèle montré.
          const montre = explique ? { ok: false } : conforme && !surVerre ? { ok: true } : null;
          const puce = montre && (
            <span
              className={`pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-white/92 py-1 pl-1.5 pr-2.5 text-[11px] font-semibold shadow-sm ${montre.ok ? "text-[#1f5a2e]" : "text-[#8a2b24]"}`}
            >
              <span aria-hidden className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-white ${montre.ok ? "bg-[#2f7d46]" : "bg-[#b3261e]"}`}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                  {montre.ok ? <path d="M4.5 10.5l3.5 3.5 7.5-8" /> : <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />}
                </svg>
              </span>
              {montre.ok ? (fr ? "Aux normes" : "To standard") : fr ? "Pas aux normes" : "Not to standard"}
            </span>
          );
          // Pourquoi le modèle montré n'est pas aux normes, EN BAS DU CROQUIS (on le voit d'un coup, sans défiler). Les ronds
          // sont ceux de l'outil de plans : rouge = le vide trop grand (une boule de la taille limite passerait), vert = un
          // vide qui respecte la norme.
          const legendeCroquis = explique && (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-xl bg-white/93 px-2.5 py-1.5 text-[11px] leading-snug text-[#4a3f33] shadow-sm" role="status" aria-live="polite">
              {explique.trous ? (
                (() => {
                  const t = explique.trous;
                  const rouges = t.ronds.filter((r) => !r.ok).length;
                  const verts = t.ronds.some((r) => r.ok);
                  const raison = raisonEnMots(explique.raisons);
                  return (
                    <>
                      {rouges > 0 && (
                        <p className="flex items-start gap-1.5">
                          <span aria-hidden className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-[#b3261e] bg-[#b3261e]/30" />
                          <span>
                            {fr
                              ? `${rouges > 1 ? "Ronds rouges" : "Rond rouge"} : le plus grand vide fait ${nombre(t.plusGrandMm)} mm. La norme veut moins de ${nombre(t.limiteMm)} mm.`
                              : `${rouges > 1 ? "Red circles" : "Red circle"}: the largest gap is ${nombre(t.plusGrandMm)} mm. The standard wants under ${nombre(t.limiteMm)} mm.`}
                          </span>
                        </p>
                      )}
                      {verts && (
                        <p className="flex items-start gap-1.5">
                          <span aria-hidden className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-[#2f7d46] bg-[#2f7d46]/30" />
                          <span>{rouges > 0 ? (fr ? "Ronds verts : vides conformes." : "Green circles: gaps to standard.") : fr ? `Ronds verts : tous les vides sont conformes (max ${nombre(t.plusGrandMm)} mm).` : `Green circles: every gap is to standard (max ${nombre(t.plusGrandMm)} mm).`}</span>
                        </p>
                      )}
                      {rouges === 0 && raison && (
                        <p className="font-medium text-[#2b2320]">
                          {fr ? "Ce qui bloque : " : "What blocks it: "}
                          {raison}.
                        </p>
                      )}
                    </>
                  );
                })()
              ) : (
                <p>{pasAdapte(explique)}.</p>
              )}
            </div>
          );
          /* Dans la section « Configuration », le croquis va à côté de la
             carte, en grand ; sinon il reste ici, au-dessus des cases. */
          return schemaSlot
            ? createPortal(
                /* Une colonne à la largeur du croquis : la rangée des modèles s'aligne sur ses bords.
                   La largeur du cadre est écrite en toutes lettres (3/4 de sa hauteur) : avec `aspect-ratio` seul,
                   Safari ne la comptait pas dans la largeur de la colonne — elle tombait à zéro, le croquis
                   disparaissait et la carte des modèles s'écrasait. */
                <div className="mx-auto flex w-fit max-w-full flex-col xl:min-h-0 xl:flex-1">
                  <div className="relative h-[var(--h)] w-[calc(var(--h)*0.75)] max-w-full shrink-0 overflow-hidden rounded-2xl [--h:40svh] md:[--h:min(62vh,640px)] xl:[--h:clamp(200px,calc(100dvh_-_28rem),640px)]">
                    {croquis}
                    {puce}
                    {legendeCroquis}
                  </div>
                  {/* Le catalogue (et l'explication des ronds rouge et vert) prend la hauteur qui reste et défile
                      DANS sa zone : le bloc entier tient toujours sur l'écran (règle de Quentin). */}
                  <div className="w-0 min-w-full xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">{catalogue}</div>
                </div>,
                schemaSlot
              )
            : (
              <div className="relative mx-auto mt-4 aspect-[3/4] w-full max-w-[400px] overflow-hidden rounded-xl">
                {croquis}
                {puce}
                {legendeCroquis}
              </div>
            );
          })()}
          <p className="consigne-cotes mt-2.5 text-xs leading-snug text-[#6f6357]">{t.gcConsigne}</p>

          <div className="mt-1 divide-y divide-[#e5ddd3]">
            {/* Des intitulés courts : sur téléphone, « Largeur de la fenêtre,
                entre les murs » tenait sur quatre lignes et chaque cote
                prenait un écran. L'explication complète reste dans la bulle
                « i », et le croquis numéroté juste au-dessus montre où mesurer. */}
            {ligne("largeur", { label: t.gcLargeurCourt, aide: `${t.gcLargeur}. ${t.gcLargeurAide}`, info: t.gcLargeurInfo, placeholder: "1180" })}
            {ligne("allege", { label: t.gcAllegeCourt, aide: `${t.gcAllege}. ${t.gcAllegeAide}`, info: t.gcAllegeInfo, placeholder: String(CURSEURS.allege.depart) })}
            {ligne("fenetre", { label: `${t.gcFenetreCourt} · ${locale === "fr" ? "facultatif" : "optional"}`, aide: `${t.gcFenetre}. ${t.gcFenetreAide}`, info: t.gcFenetreInfo, placeholder: "1200" })}

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
                {releve && dessin && !dessin.ok && dessin.raison === "sans-garde-corps"
                  ? fr
                    ? "Rien à poser"
                    : "Nothing to fit"
                  : releve && dessin && !dessin.ok && dessin.raison === "barre-appui"
                    ? fr
                      ? `Barre d'appui de ${nombre(releve.largeurMm)} mm · sur devis`
                      : `Support bar, ${nombre(releve.largeurMm)} mm · on quotation`
                    : releve && dessin
                  ? [
                      t.gcResume.replace("{l}", nombre(releve.largeurMm)).replace("{h}", nombre(dessin.hauteurMm)),
                      dessin.ok && !surVerre ? croixTexte(dessin.croix) : null,
                      conforme ? t.gcPrixCompris : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : prix.statut === "calcul"
                    ? t.gcCalcul
                    : texteManque
                      ? <span className="font-medium text-[#7a4510]">{texteManque}</span>
                      : // Une cote hors de ce que l'atelier fabrique : le texte d'à côté dit quoi faire, pas « entrez vos mesures ».
                        lecture.etat === "hors-bornes"
                        ? ""
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
                      : lecture.raison === "allege"
                        ? fr
                          ? "À cette hauteur, la loi ne demande pas de garde-corps (seulement en dessous de 90 cm). Il n'y a rien à poser."
                          : "At that height the law does not ask for a railing (only below 90 cm). There is nothing to fit."
                        : t.gcAEtudier}{" "}
                  {lecture.raison !== "trop-etroit" && lecture.raison !== "allege" && lienEtude}
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
              {/* Le bas de la fenêtre est haut : une barre d'appui, à la hauteur de la norme, suffit. */}
              {reponse && !reponse.ok && reponse.raison === "barre-appui" && releve && (
                <div role="status">
                  <p className="text-[#2b2320]">
                    {fr
                      ? `Le bas de votre fenêtre est à ${nombre(releve.allegeMm)} mm du sol. Il manque ${nombre(reponse.mainCouranteMm - releve.allegeMm)} mm pour arriver à ${nombre(reponse.mainCouranteMm)} mm. C'est trop peu pour un garde-corps à croix : il faut une barre d'appui (parfois deux).`
                      : `The bottom of your window is ${nombre(releve.allegeMm)} mm from the floor. ${nombre(reponse.mainCouranteMm - releve.allegeMm)} mm are missing to reach ${nombre(reponse.mainCouranteMm)} mm. That is too little for a railing with crosses: it takes a support bar (sometimes two).`}
                  </p>
                  <p className="mt-1 text-[#5c5140]">
                    {fr ? "Nous la fabriquons sur devis : réponse sous 24 à 72 h." : "We make it on quotation: reply within 24 to 72 h."} {lienEtude}
                  </p>
                  {!reponse.obligatoire && (
                    <p className="mt-1 text-[#5c5140]">
                      {releve.enEtage
                        ? fr
                          ? "Bon à savoir : à partir de 90 cm, la loi ne l'impose plus."
                          : "Good to know: from 90 cm up, the law no longer requires it."
                        : fr
                          ? "Bon à savoir : au rez-de-chaussée, la loi ne l'impose pas."
                          : "Good to know: on the ground floor, the law does not require it."}
                    </p>
                  )}
                </div>
              )}
              {/* Le bas de la fenêtre est déjà à la hauteur de la norme : rien à poser. */}
              {reponse && !reponse.ok && reponse.raison === "sans-garde-corps" && releve && (
                <p className="text-[#2b2320]" role="status">
                  {fr
                    ? `Le bas de votre fenêtre est à ${nombre(releve.allegeMm)} mm du sol. À cette hauteur, la loi ne demande pas de garde-corps (seulement en dessous de 90 cm). Il n'y a rien à poser.`
                    : `The bottom of your window is ${nombre(releve.allegeMm)} mm from the floor. At that height the law does not ask for a railing (only below 90 cm). There is nothing to fit.`}
                </p>
              )}
              {reponse && !reponse.ok && reponse.raison === "a-etudier" && (
                <div role="alert">
                  <p className="font-medium text-[#2b2320]">{t.gcAEtudierTitre}</p>
                  <p className="mt-1 text-[#5c5140]">
                    {reponse.alertes.includes("fixation")
                      ? t.gcAEtudierFixation
                      : reponse.alertes.includes("solidite") || reponse.alertes.includes("charge-verticale")
                        ? t.gcAEtudierSolidite
                        : t.gcAEtudier}{" "}
                    {lienEtude}
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
                  {/* La loi n'impose rien ici (rez-de-chaussée, ou bas de fenêtre à 90 cm et plus) : on le dit,
                      pour que le client ne croie pas qu'il lui en faut un. Il peut en vouloir un quand même. */}
                  {!conforme.obligatoire && (
                    <p className="mt-1.5 rounded-lg bg-[#eef3ea] px-2.5 py-1.5 text-[#33502f]">
                      {releve && !releve.enEtage
                        ? fr
                          ? "Bon à savoir : au rez-de-chaussée, la loi n'impose pas de garde-corps. Vous pouvez en poser un pour le style."
                          : "Good to know: on the ground floor, the law does not require a railing. You can have one for the look."
                        : fr
                          ? "Bon à savoir : le bas de votre fenêtre est à 90 cm du sol ou plus. La loi n'impose pas de garde-corps ici. Vous pouvez en poser un pour le style."
                          : "Good to know: the bottom of your window is 90 cm or more above the floor. The law does not require a railing here. You can have one for the look."}
                    </p>
                  )}
                  {/* En colonne étroite (grand écran), une ligne suffit : la hauteur de la main courante. */}
                  <p className={`mt-1 text-[#5c5140] ${resultatSlot ? "hidden" : ""}`}>
                    {t.gcMainCourante
                      .replace("{m}", nombre(conforme.mainCouranteMm))
                      .replace("{j}", nombre(conforme.jourMm))}
                    {conforme.soubassementMm > 0 ? ` ${t.gcSoubassement}` : ""}
                  </p>
                  {/* Fenêtre large : le renfort est compris dans le prix ; on dit ce qu'il change, et que le mur compte. */}
                  {conforme.renfort && <p className="mt-1.5 rounded-lg bg-[#f3ede3] px-2.5 py-1.5 text-[#4a3f33]">{t.gcRenfort}</p>}
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
                    ? reponse.raison === "barre-appui"
                      ? fr
                        ? "Une barre d'appui, sur devis."
                        : "A support bar, on quotation."
                      : reponse.raison === "sans-garde-corps"
                        ? fr
                          ? "Pas besoin de garde-corps."
                          : "No railing needed."
                        : t.gcAEtudierTitre
                    : ""}
              </p>
            </div>
          </div>

          {/* Le modèle : on le choisit dans le catalogue (à côté du croquis ; ici même sur téléphone). */}
          {!schemaSlot && catalogue}
          {/* (En colonne étroite, « choisissez votre modèle » est déjà dit sous le bouton du panier, juste en dessous.) */}
          {conforme && !surVerre && (choisi || !resultatSlot) && (
            <p className={`mt-3 rounded-xl px-3.5 py-2 text-[13px] leading-snug ${choisi ? "bg-[#e3efe4] text-[#1f5a2e]" : "bg-[#fbeeda] text-[#7a4510]"}`} role="status">
              {choisi
                ? `${fr ? "Modèle choisi" : "Chosen model"} : ${libelleModele(choisi)}${schemaSlot ? "" : ` — ${prixAffiche(choisi.prix, locale)}`}`
                : fr
                  ? "Dernière étape : choisissez votre modèle, sous le croquis."
                  : "Last step: choose your model, under the sketch."}
            </p>
          )}
          {/* Pourquoi des barreaux en bas : si le client ne les a pas choisis, c'est la norme (le cadre commence sous
              60 cm du sol : des croix s'y escaladent, des barreaux droits non). Il doit le savoir, pas le subir. */}
          {conforme && !surVerre && conforme.soubassementMm > 0 && !voulu?.barreauxBas && (
            <p className="mt-2 rounded-xl bg-[#f3ede3] px-3.5 py-2 text-[12px] leading-snug text-[#4a3f33]">
              {fr
                ? "Barreaux droits en bas : imposés par la norme. Le bas de votre garde-corps est à moins de 60 cm du sol, et un enfant pourrait grimper sur des croix."
                : "Straight bars at the bottom: required by the standard. The bottom of your railing is less than 60 cm from the floor, and a child could climb on crosses."}
            </p>
          )}
          {/* « Poids et détails », « Ce que comprend le prix » : la fiche les dépose ici (voir detailsSlot). */}
          {schemaSlot && detailsSlot && <div ref={detailsSlot} className="mt-3" />}

          {/* La note de fabrication : pas dans la colonne étroite, qui doit tenir sur un écran. */}
          {!resultatSlot && <p className="mt-4 text-[11px] leading-snug text-[#726757]">{t.gcNote}</p>}
              </>
            );
            return resultatSlot
              ? createPortal(<div className="resultat-colonne pb-1 text-left">{resultat}</div>, resultatSlot)
              : schemaSlot
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
  // 585 : le bas de fenêtre du garde-corps de la photo (350 mm de haut, main courante à 1 025 mm du sol).
  allege: { min: 0, max: BORNES_RELEVE_GC.allegeMm.max, depart: 585 },
  fenetre: { min: 0, max: BORNES_RELEVE_GC.fenetreMm.max, depart: 1200 },
} as const;

/**
 * « L'atelier s'occupe de tout » : le client n'a rien à mesurer. Un transat, un café qui fume, un
 * soleil qui tourne doucement — et les trois étapes, qui arrivent l'une après l'autre.
 * Les animations sont en CSS (globals.css, .serenite-…) et s'arrêtent si l'on a demandé moins de mouvement.
 */
function Serenite({ fr, petit = false }: { fr: boolean; petit?: boolean }) {
  const etapes = fr
    ? ["Nous venons mesurer chez vous", "Vous recevez le prix exact, sans engagement", "Nous fabriquons et nous posons"]
    : ["We come and measure at your home", "You receive the exact price, no commitment", "We build and we fit"];
  return (
    <div className={`serenite mx-auto flex w-full max-w-[540px] flex-col items-center rounded-2xl border border-[#e0d6c8] bg-white/75 text-center ${petit ? "mt-3 px-4 py-4" : "px-6 py-7 md:px-8 md:py-9"}`}>
      <svg viewBox="0 0 260 150" aria-hidden className={petit ? "h-[92px] w-auto" : "h-[150px] w-auto"} fill="none" stroke="#2b2320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Le soleil, qui tourne tout doucement. */}
        <g className="serenite-soleil">
          <circle cx="208" cy="38" r="15" fill="#f1c56b" stroke="none" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={208 + Math.cos(a) * 22} y1={38 + Math.sin(a) * 22} x2={208 + Math.cos(a) * 29} y2={38 + Math.sin(a) * 29} stroke="#e0a93a" strokeWidth="2.4" />;
          })}
        </g>
        {/* Le sol. */}
        <line x1="18" y1="132" x2="242" y2="132" stroke="#b7aa94" strokeWidth="1.5" />
        {/* Le transat : deux piétements croisés, la toile tendue. */}
        <line x1="52" y1="132" x2="118" y2="58" />
        <line x1="70" y1="88" x2="150" y2="132" />
        <path d="M112 62 Q104 104 150 118" stroke="#c9a36b" strokeWidth="7" />
        <line x1="150" y1="118" x2="172" y2="132" />
        {/* Le guéridon et la tasse, qui fume. */}
        <line x1="186" y1="132" x2="186" y2="104" />
        <line x1="174" y1="104" x2="198" y2="104" />
        <path d="M180 104 v-9 h12 v9" fill="#ffffff" />
        <path d="M192 97 q5 1 0 5" strokeWidth="1.5" />
        <g className="serenite-vapeur" strokeWidth="1.5" stroke="#9a8d80">
          <path d="M183 90 q-3 -5 0 -9 q3 -4 0 -8" />
          <path d="M189 90 q-3 -5 0 -9 q3 -4 0 -8" />
        </g>
      </svg>
      <p className={`mt-3 font-medium leading-snug text-[#2b2320] ${petit ? "text-[15px]" : "text-[20px]"}`}>
        {fr ? "Installez-vous : vous n'avez rien à mesurer." : "Sit back: you have nothing to measure."}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-[#5c5140]">
        {fr ? "Choisissez un créneau, on s'occupe du reste." : "Pick a slot, we take care of the rest."}
      </p>
      <ol className={`w-full text-left ${petit ? "mt-3 space-y-1.5" : "mt-5 space-y-2.5"}`}>
        {etapes.map((etape, i) => (
          <li key={etape} className="serenite-etape flex items-center gap-3 rounded-xl bg-[#f6f1ea] px-3.5 py-2.5 text-[13.5px] text-[#2b2320]" style={{ animationDelay: `${0.25 + i * 0.35}s` }}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2b2320] text-[12px] font-semibold text-white">{i + 1}</span>
            {etape}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-snug text-[#6f6357]">
        {fr ? "Le prix de la visite est déduit de votre commande." : "The price of the visit is deducted from your order."}
      </p>
    </div>
  );
}

/** Les dessins montrés AVANT les mesures : de 1 à 6 croix, seules puis avec barreaux, sur une fenêtre type. */
const MODELES_VITRINE: ModeleGC[] = ([[false, false], [false, true], [true, false], [true, true]] as const).flatMap(([b, t]) =>
  [1, 2, 3, 4, 5, 6].map((n) => ({
    id: idModeleGC(16, n, b, t),
    conforme: false,
    raisons: [],
    croix: n,
    carre: 16,
    soubassementMm: b ? 150 : 0,
    traverse: t,
    trous: null,
    renfort: false,
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
function MiniGardeCorps({ largeurMm, hauteurMm, hMaxMm, soubassementMm, croix, traverse = false, trous = null, hauteurPx = 26 }: { largeurMm: number; hauteurMm: number; hMaxMm: number; soubassementMm: number; croix: number; traverse?: boolean; trous?: TrousGC | null; hauteurPx?: number }) {
  const L = largeurMm, H = Math.max(hMaxMm, hauteurMm);
  const y0 = H - hauteurMm, haut = y0 + 40, bas = H;
  const lisse = soubassementMm > 0 ? bas - soubassementMm : bas;
  const pas = L / croix;
  const nb = Math.max(2, Math.round(L / 110));
  const trait = { vectorEffect: "non-scaling-stroke" as const };
  // Les ronds de l'outil sont en mm depuis le coin bas-gauche du CADRE : on les pose dans le cadre de ce dessin.
  const sx = trous ? L / trous.cadreMm.l : 1, sy = trous ? (bas - haut) / trous.cadreMm.h : 1;
  return (
    <svg viewBox={`${-L * 0.02} ${-H * 0.03} ${L * 1.04} ${H * 1.06}`} preserveAspectRatio="xMidYMax meet" aria-hidden className="block w-full" style={{ height: hauteurPx }} fill="none" stroke="#2b2320" strokeWidth="1.5" strokeLinecap="round">
      <rect x={-L * 0.01} y={y0} width={L * 1.02} height="40" fill="#c9a36b" stroke="none" />
      <rect x="0" y={haut} width={L} height={bas - haut} {...trait} />
      {soubassementMm > 0 && <line x1="0" y1={lisse} x2={L} y2={lisse} {...trait} />}
      {/* La traverse au milieu des croix : un trait horizontal, d'un montant à l'autre. */}
      {traverse && <line x1="0" y1={(haut + lisse) / 2} x2={L} y2={(haut + lisse) / 2} strokeWidth="1" {...trait} />}
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
      {/* Le rond rouge : le vide trop grand. Les ronds verts : les vides qui respectent la norme. */}
      {trous?.ronds.map((r, i) => (
        <ellipse
          key={`r${i}`}
          cx={r.x * sx}
          cy={bas - r.y * sy}
          rx={(r.d / 2) * sx}
          ry={(r.d / 2) * sy}
          fill={r.ok ? "#2f7d46" : "#c0392b"}
          fillOpacity="0.3"
          stroke={r.ok ? "#2f7d46" : "#c0392b"}
          strokeWidth={1.2}
          {...trait}
        />
      ))}
    </svg>
  );
}
