"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { InfoBulle } from "./info-bulle";
import { QuiMesure, VisiteAtelier } from "./prise-de-cotes";
import { SereniteAtelier } from "./serenite-atelier";
import { SchemaFenetre, type CoteFenetre } from "./schema-fenetre";
import { matiereMur } from "@/lib/murs-gc";
import { PlanApercu } from "./plan-apercu";
import {
  BORNES_RELEVE_GC,
  MAIN_COURANTE_MM,
  MARGE_BOULE_GC_MM,
  ROSACE_MM_GC,
  lireMainCouranteGC,
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
  /** La largeur de la fenêtre entre les murs. */
  largeur: string;
  /** Du sol au bas de la fenêtre. C'est d'elle qu'on déduit la hauteur du garde-corps. */
  allege: string;
  /** De l'appui au haut de l'ouverture : le garde-corps doit tenir dedans. */
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
   * `manque` : la première chose qui manque, pour le dire précisément au client — la largeur, le bas de
   * la fenêtre, la hauteur de fenêtre tapée de travers (facultative), ou « etage » quand les cotes
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
      if (lecture.illisible) return fr ? "La largeur de la fenêtre n'est pas un nombre : corrigez-la." : "The window width is not a number: please correct it.";
      return fr ? "Il manque la largeur de la fenêtre, d'un mur à l'autre." : "The window width, wall to wall, is missing.";
    case "allege":
      if (lecture.illisible) return fr ? "La hauteur du sol au bas de la fenêtre n'est pas un nombre : corrigez-la." : "The height from the floor to the bottom of the window is not a number: please correct it.";
      return fr ? "Il manque la hauteur du sol au bas de la fenêtre." : "The height from the floor to the bottom of the window is missing.";
    case "fenetre":
      return fr
        ? "La hauteur de la fenêtre n'est pas un nombre : corrigez-la ou effacez-la (elle est facultative)."
        : "The window height is not a number: correct it or clear it (it is optional).";
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
export function noteGardeCorps(cotes: CotesGardeCorps, t: Dictionary["artisanat"], reponse?: ReponsePrixGC | null, langue: "fr" | "en" = "fr"): string {
  return noteReleveGC(
    { etage: cotes.etage, mur: cotes.mur, allegeMm: mm(cotes.allege), fenetreMm: mm(cotes.fenetre), jourMm: reponse?.jourMm ?? 0 },
    t,
    langue,
  );
}

/**
 * Devant chaque case, le pictogramme de sa cote, dessiné comme sur un plan : une largeur entre deux murs,
 * une hauteur depuis le sol, une hauteur de fenêtre. Il remplace les pastilles ①②③ (« pas pro », 05/10).
 */
function IconeCote({ cote }: { cote: "largeur" | "allege" | "fenetre" }) {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0 text-[#2a2116]" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
      {cote === "largeur" && <path d="M2 5v8M16 5v8M2 9h14M3.6 10.6l1.6-3.2M12.8 10.6l1.6-3.2" />}
      {cote === "allege" && <path d="M2.5 16h13M9 16V3M5 3h8M7.4 4.6l3.2-3.2M7.4 17.6l3.2-3.2" strokeOpacity={1} />}
      {cote === "fenetre" && <path d="M7 3h8v12H7zM11 3v12M3 3v12M1.4 4.6l3.2-3.2M1.4 16.6l3.2-3.2" />}
    </svg>
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
  rosaceId,
  onRosace,
  bandeauSlot,
  mainCourante,
  teinteAcier,
  teinteBois,
  schemaSlot,
  resultatSlot,
  detailsSlot,
  matieresSlotTelephone,
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
  /** La rosace choisie (identifiant de l'option) : un modèle peut en demander une plus grande, que le choisir applique. */
  rosaceId?: string;
  onRosace?: (id: string) => void;
  /** Grand écran : le bandeau des modèles, en bas du bloc (product-view.tsx). */
  bandeauSlot?: HTMLDivElement | null;
  /** La main courante choisie (un bois, « acier » ou « profil ») : le croquis la dessine en bois ou en acier. */
  mainCourante?: string;
  /** Les teintes de l'acier et du bois choisies sur la fiche, pour que le croquis les montre. */
  teinteAcier?: string;
  teinteBois?: string;
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
  /** Téléphone : où la fiche dépose les matières (acier, main courante, rosace), dans la partie « Modèle ». */
  matieresSlotTelephone?: (element: HTMLDivElement | null) => void;
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
  /** Un téléphone (moins de 768 px) : le croquis seul en haut du bloc, tout le reste dans la carte qui défile. */
  const telephone = useSyncExternalStore(
    (prevenir) => {
      const mq = window.matchMedia("(max-width: 47.999rem)");
      mq.addEventListener("change", prevenir);
      return () => mq.removeEventListener("change", prevenir);
    },
    () => window.matchMedia("(max-width: 47.999rem)").matches,
    () => false
  );
  const langue = locale === "en" ? "en-GB" : "fr-FR";
  const [coteActive, setCoteActive] = useState<CoteFenetre | null>(null);
  /** La rangée des modèles, qui défile de côté (règle de Quentin, 05/10 : « Votre modèle » ne doit jamais être coupé). */
  const bande = useRef<HTMLDivElement | null>(null);
  /** Y a-t-il plus de modèles que la place ? Alors les flèches s'affichent (mesuré sur la rangée, pas deviné d'après leur nombre). */
  const [deborde, setDeborde] = useState(false);
  /** Le modèle hors norme dont le client veut voir le pourquoi (les ronds rouge et vert de l'outil de plans). */
  const [pourquoi, setPourquoi] = useState<string | null>(null);
  /** Les deux boutons du client : le barreaudage (aucun / en bas / sur toute la hauteur) et la traverse au milieu. */
  const [filtre, setFiltre] = useState<{ barreaux: "aucun" | "bas" | "seuls"; traverse: boolean }>({ barreaux: "aucun", traverse: false });
  /** L'ordre des modèles dans la rangée : prix croissant (par défaut) ou décroissant — le bouton de tri (Quentin, 05/10). */
  const [tri, setTri] = useState<"croissant" | "decroissant">("croissant");
  /** Avant les mesures : le modèle de la vitrine que le client vient de toucher (il s'affiche sur le croquis). */
  const [vitrineId, setVitrineId] = useState<string | null>(null);
  /** Le plan d'aperçu (une vue, filigrané) est-il ouvert ? */
  const [planOuvert, setPlanOuvert] = useState(false);
  /** Le modèle survolé : son détail s'écrit dans le bandeau. */
  const [survol, setSurvol] = useState<string | null>(null);

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
  /** Le client a choisi le bois sur fer plat (et non : la fenêtre est large et l'atelier le pose d'office). */
  const platChoisi = lireMainCouranteGC(mainCourante ?? "")?.type === "bois-plat";
  const textRenfort = platChoisi ? t.gcRenfortChoisi : t.gcRenfort;
  const surVerre = verre?.surVerre === true;
  const releve = lecture.etat === "ok" ? lecture.releve : null;
  /** Le modèle que le client avait choisi et qui ne va plus avec ses nouvelles mesures : on le lui dit. */
  const [perdu, setPerdu] = useState<{ croix: number; barreaux: boolean; traverse: boolean; seuls: boolean; raisons: readonly string[]; pour: string } | null>(null);
  /** Les mesures affichées : le message « modèle perdu » ne vaut que pour celles du refus. */
  const mesures = `${cotes.largeur}|${cotes.allege}|${cotes.fenetre}|${cotes.etage}`;
  /** Le refus déjà pris en compte (la réponse du serveur) : on ne le note qu'une fois. */
  const [refusVu, setRefusVu] = useState<ReponsePrixGC | null>(null);
  if (modeleRefuse && brute && !brute.ok && refusVu !== brute) {
    const voulu = lireModeleGC(cotes.modele);
    setRefusVu(brute);
    // D'autres modèles conviennent : on explique. (Barre d'appui, fenêtre trop basse… : le message du résultat suffit.)
    setPerdu(voulu && brute.raison === "a-etudier" && brute.modeles.some((m) => m.conforme) ? { croix: voulu.croix, barreaux: voulu.barreauxBas, traverse: voulu.traverse, seuls: voulu.seuls, raisons: brute.alertes, pour: mesures } : null);
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
  /** Le nom d'une rosace, avec son diamètre (celui qui compte pour la norme). */
  const rosaceTexte = (id: string) => {
    const nom = { fleur: ["rosace fleur", "flower rosette"], fonte: ["médaillon fonte", "cast-iron medallion"], acier: ["médaillon acier", "steel medallion"], sans: ["sans rosace", "no rosette"] }[id];
    if (!nom) return "";
    return ROSACE_MM_GC[id] > 0 ? `${nom[fr ? 0 : 1]} Ø${ROSACE_MM_GC[id]}` : nom[fr ? 0 : 1];
  };
  /** La configuration complète d'un modèle, en clair : ce qu'il contient, son acier, sa rosace. */
  const descriptionModele = (m: ModeleGC) =>
    [
      m.seuls ? (fr ? "barreaux verticaux seuls" : "vertical bars only") : `${m.croix} ${fr ? "croix" : m.croix > 1 ? "crosses" : "cross"}`,
      m.traverse ? (fr ? "traverse au milieu" : "middle rail") : null,
      !m.seuls && m.soubassementMm > 0 ? (fr ? "barreaux en bas" : "bars below") : null,
      fr ? `acier carré de ${m.carre} mm` : `${m.carre} mm square steel`,
      m.renfort ? (fr ? "lisse haute renforcée" : "reinforced top rail") : null,
      m.rosace ? rosaceTexte(m.rosace) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  /** Ce que le garde-corps contient : ses croix, ou des barreaux verticaux seuls. */
  const contenuTexte = (m: { croix: number; seuls: boolean }) => (m.seuls ? (fr ? "barreaux verticaux" : "vertical bars") : croixTexte(m.croix));
  const fr = locale === "fr";
  // Le catalogue : tous les dessins, chacun marqué « aux normes » ou non pour CETTE fenêtre. Pendant un
  // recalcul, ceux de la réponse précédente restent affichés, estompés (la bande se vidait à chaque touche).
  const sourceModeles = brute ?? (prix.statut === "calcul" ? prix.precedent : null);
  const modeles = sourceModeles && !surVerre ? sourceModeles.modeles : [];
  const modelesPerimes = brute === null && modeles.length > 0;
  const hMax = Math.max(1, ...modeles.map((m) => m.hauteurMm));
  // Le modèle choisi se reconnaît à son DESSIN (croix, barreaux), pas à son carré : le serveur peut l'avoir
  // retenu dans un carré plus gros que celui de l'identifiant.
  const voulu = lireModeleGC(cotes.modele);
  // Le choix se lit tout de suite dans l'identifiant touché (le serveur met un instant à répondre : le croquis et la rangée
  // ne doivent pas attendre). À défaut d'identifiant identique (la fenêtre a changé, le carré avec), le même DESSIN.
  const memeDessin = (m: ModeleGC) => {
    const l = lireModeleGC(m.id);
    return voulu !== null && m.croix === voulu.croix && m.traverse === voulu.traverse && m.seuls === voulu.seuls && (l?.barreauxBas ?? false) === voulu.barreauxBas;
  };
  const choisi = voulu ? (modeles.find((m) => m.conforme && m.id === cotes.modele) ?? modeles.find((m) => m.conforme && memeDessin(m)) ?? null) : null;
  const nbConformes = modeles.filter((m) => m.conforme).length;
  // Les deux boutons du client choisissent une FAMILLE de modèles : barreaux (aucun / en bas / sur toute la hauteur) et
  // traverse. La rangée ne montre que cette famille ; le nombre de croix se choisit dans la rangée.
  const familleDe = (m: ModeleGC) => ({ barreaux: m.seuls ? "seuls" : m.soubassementMm > 0 ? "bas" : "aucun", traverse: m.traverse }) as const;
  // La norme impose des barreaux en bas (cadre sous 60 cm du sol) : aucun modèle sans eux n'existe pour cette fenêtre.
  // Bas de fenêtre trop haut pour des croix : seul existe le cadre bas à barreaux (« toujours quelque chose, jamais hors norme »).
  const seulsExiste = modeles.length > 0 && modeles.every((m) => m.seuls);
  const barreauxImposes = !seulsExiste && modeles.length > 0 && !modeles.some((m) => !m.seuls && m.soubassementMm === 0);
  const familleVoulue: { barreaux: "aucun" | "bas" | "seuls"; traverse: boolean } = seulsExiste
    ? { barreaux: "seuls", traverse: false }
    : choisi
    ? familleDe(choisi)
    : { barreaux: barreauxImposes && filtre.barreaux === "aucun" ? "bas" : filtre.barreaux, traverse: filtre.traverse };
  /** Les modèles aux normes d'une famille, pour cette fenêtre. */
  const conformesDe = (f: { barreaux: "aucun" | "bas" | "seuls"; traverse: boolean }) =>
    modeles.filter((m) => m.conforme && familleDe(m).barreaux === f.barreaux && m.traverse === f.traverse);
  // La rangée ne montre QUE des modèles aux normes (Quentin, 05/10 : « pas tomber sur de tout ») : une famille sans aucun
  // modèle aux normes n'est jamais affichée vide. On passe à la même famille avec ou sans traverse, sinon à celle du moins cher.
  const famille: { barreaux: "aucun" | "bas" | "seuls"; traverse: boolean } =
    choisi || nbConformes === 0 || conformesDe(familleVoulue).length > 0
      ? familleVoulue
      : conformesDe({ ...familleVoulue, traverse: !familleVoulue.traverse }).length > 0
      ? { ...familleVoulue, traverse: !familleVoulue.traverse }
      : familleDe([...modeles.filter((m) => m.conforme)].sort((a, b) => a.prix - b.prix)[0]);
  // Un seul modèle possible (le cadre bas à barreaux) : il n'y a rien à choisir, on le choisit pour le client.
  const seulModele = seulsExiste && modeles.length === 1 && modeles[0].conforme && !choisi ? modeles[0].id : null;
  useEffect(() => {
    if (seulModele) onChange({ ...cotes, modele: seulModele });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seulModele]);
  const modelesFamille = modeles.filter((m) => {
    const f = familleDe(m);
    return f.barreaux === famille.barreaux && f.traverse === famille.traverse;
  });
  const familleSansModele = modelesFamille.length > 0 && !modelesFamille.some((m) => m.conforme);
  // Un modèle hors norme n'est plus montré dans la rangée (seulement ceux aux normes) : il n'y a plus de rond rouge à expliquer,
  // sauf pour un modèle hors norme encore désigné (pourquoi), ce qui n'arrive plus depuis la rangée.
  const explique = pourquoi ? (modeles.find((m) => m.id === pourquoi && !m.conforme) ?? null) : null;
  /** Le modèle montré en grand sur le croquis, dès qu'on le touche : le choisi, ou celui qu'on explique. */
  const apercuModele: ModeleGC | null = explique ?? choisi;
  const changerFamille = (barreaux: "aucun" | "bas" | "seuls", traverse: boolean) => {
    // Les barreaux seuls n'ont ni croix ni traverse (comme dans l'outil).
    let f = { barreaux, traverse: barreaux === "seuls" ? false : traverse };
    // Aucun modèle aux normes avec cette traverse : la même famille avec l'autre réglage de traverse, s'il en a.
    if (!conformesDe(f).length && barreaux !== "seuls" && conformesDe({ ...f, traverse: !f.traverse }).length) f = { ...f, traverse: !f.traverse };
    setFiltre(f);
    setPourquoi(null);
    setPerdu(null);
    // Le garde-corps change tout de suite sur le croquis (règle de Quentin : « quand je clique, ça doit se voir ») : on garde le
    // même nombre de croix s'il est aux normes dans la nouvelle famille, sinon le plus proche (celui du client, ou celui
    // que le site proposait). Sans repère, le moins cher. S'il n'y en a aucun, le choix est retiré et la rangée explique pourquoi.
    const cible = modeles.filter((m) => m.conforme && familleDe(m).barreaux === f.barreaux && m.traverse === f.traverse);
    const repere = choisi ?? (dessin?.ok && !dessin.seuls ? dessin : null);
    const proche = [...cible].sort((a, b) => (repere ? Math.abs(a.croix - repere.croix) - Math.abs(b.croix - repere.croix) : 0) || a.prix - b.prix || a.croix - b.croix)[0];
    if (choisi || proche) onChange({ ...cotes, modele: proche ? proche.id : "" });
  };
  const libelleModele = (m: { croix: number; soubassementMm: number; traverse: boolean; seuls?: boolean }) =>
    m.seuls ? (fr ? "Barreaux seuls" : "Bars only") : `${croixTexte(m.croix)}${m.traverse ? (fr ? ", traverse au milieu" : ", middle rail") : ""}${m.soubassementMm > 0 ? (fr ? ", barreaux en bas" : ", bars below") : ""}`;
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
          ? "sur cette largeur, les fixations dans le mur seraient trop sollicitées"
          : "over this width, the fixings in the wall would be overloaded"
        : raisons.includes("solidite") || raisons.includes("charge-verticale")
        ? fr
          ? "sur cette largeur, la traverse haute ne serait pas assez rigide"
          : "over this width, the top rail would not be stiff enough"
        : raisons.includes("soubassement")
          ? fr
            ? "si près du sol, le bas du cadre doit être fermé par des barreaux"
            : "this close to the floor, the bottom of the frame must be closed with bars"
          : raisons.includes("fenetre")
            ? fr
              ? "il ne tiendrait pas dans la hauteur de la fenêtre"
              : "it would not fit in the height of the window"
            : raisons.includes("trop-petit")
              ? fr
                ? "la hauteur disponible ne suffit pas pour ce modèle"
                : "there is not enough height for this model"
              : "";
  // « Ce n'est pas le modèle qui n'est pas aux normes, c'est l'ensemble modèle + fenêtre » (Quentin, 04/10).
  const pasAdapte = (m: { raisons: readonly string[] }) => {
    const mots = raisonEnMots(m.raisons);
    return fr
      ? `Ce modèle + votre fenêtre : l'ensemble ne serait pas aux normes${mots ? ` (${mots})` : ""}`
      : `This model + your window: together they would not meet the standard${mots ? ` (${mots})` : ""}`;
  };
  const libelleCourt = (m: { croix: number; soubassementMm: number; traverse: boolean; seuls?: boolean }) =>
    m.seuls ? (fr ? "barreaux seuls" : "bars only") : `${m.croix} ${fr ? "croix" : m.croix > 1 ? "crosses" : "cross"}${m.traverse ? (fr ? " + traverse" : " + rail") : ""}${m.soubassementMm > 0 ? (fr ? " + barreaux" : " + bars") : ""}`;
  /** La phrase de la bande : ce qu'il faut faire, ou pourquoi le modèle de la photo ne va pas avec CETTE fenêtre. */
  const phraseModeles =
    modeles.length === 0
      ? reponse && !reponse.ok && reponse.raison === "barre-appui"
        ? fr
          ? "Pour cette fenêtre, une main courante seule respecte la norme : nous la fabriquons sur devis."
          : "For this window a handrail on its own meets the standard: we make it on quotation."
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
          ? "Aucun de nos modèles ne convient à cette fenêtre : nous l'étudions avec vous, sur devis."
          : "None of our models fits this window: we study it with you, on quotation."
        : familleSansModele
          ? fr
            ? "Avec ces choix, aucun modèle n'est conforme aux normes. Modifiez les barreaux ou la traverse."
            : "With these choices, no model meets the standards. Change the bars or the middle rail."
        : perdu && perdu.pour === mesures && !choisi
          ? fr
            ? `Vos choix ont changé\u00a0: le modèle «\u00a0${libelleCourt({ croix: perdu.croix, soubassementMm: perdu.barreaux ? 1 : 0, traverse: perdu.traverse, seuls: perdu.seuls })}\u00a0» n'est plus possible tel quel${raisonEnMots(perdu.raisons) ? ` (${raisonEnMots(perdu.raisons)})` : ""}. Touchez l'un des modèles ci-dessous.`
            : `Your choices have changed: the “${libelleCourt({ croix: perdu.croix, soubassementMm: perdu.barreaux ? 1 : 0, traverse: perdu.traverse, seuls: perdu.seuls })}” model is no longer possible as it was${raisonEnMots(perdu.raisons) ? ` (${raisonEnMots(perdu.raisons)})` : ""}. Tap one of the models below.`
          : "";
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
  // Barre d'appui, rien à poser, fenêtre trop basse : aucun modèle à choisir. Les montrer (« 1 croix… 6 croix ») contredirait la phrase du bandeau.
  const sansModeleAChoisir = reponse !== null && !reponse.ok && (reponse.raison === "barre-appui" || reponse.raison === "sans-garde-corps" || reponse.raison === "fenetre-trop-basse");
  const sens = tri === "croissant" ? 1 : -1;
  const liste: ModeleGC[] = sansModeleAChoisir
    ? []
    : marque
      ? // TOUS les modèles aux normes pour cette fenêtre, tous types confondus (croix, traverse, barreaux), rangés par prix — et
        // seulement eux (Quentin, 05/10 : « on ne comprend pas, il y a de tout », puis « pourquoi ça n'affiche qu'un seul modèle ? »).
        // Les réglages Barreaux et Traverse restent des raccourcis : ils choisissent le modèle le plus proche dans cette rangée.
        modeles.filter((m) => m.conforme).sort((a, b) => sens * (a.prix - b.prix) || sens * (a.croix - b.croix))
      : MODELES_VITRINE.filter((m) => !m.traverse && m.soubassementMm === 0);
  useEffect(() => {
    const zone = bande.current;
    if (!zone || typeof ResizeObserver === "undefined") return;
    const mesurer = () => setDeborde(zone.scrollWidth > zone.clientWidth + 2);
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(zone);
    for (const enfant of Array.from(zone.children)) observateur.observe(enfant);
    return () => observateur.disconnect();
  }, [liste.length, tri, bandeauSlot]);
  // Un réglage qui ne mène à aucun modèle aux normes pour cette fenêtre est grisé (on ne propose que ce qui est aux normes).
  const aucunAuxNormes = fr ? "Aucun modèle aux normes avec ce choix pour votre fenêtre." : "No model meets the standard with this choice for your window.";
  const sansConforme = (barreaux: "aucun" | "bas" | "seuls") =>
    nbConformes === 0 || modeles.some((m) => m.conforme && familleDe(m).barreaux === barreaux) ? "" : aucunAuxNormes;
  const sansConformeTraverse = (traverse: boolean) =>
    nbConformes === 0 || conformesDe({ barreaux: famille.barreaux, traverse }).length ? "" : aucunAuxNormes;
  const controlesFamille = marque ? (
    <div className="space-y-2.5" data-controles-famille>
      {[
        {
          titre: fr ? "Barreaux" : "Bars",
          valeur: famille.barreaux,
          colonnes: "minmax(0,0.85fr) minmax(0,1fr) minmax(0,1.45fr)",
          options: [
            { v: "aucun", label: fr ? "Aucun" : "None", note: seulsExiste ? (fr ? "Pas pour cette fenêtre : le cadre est trop bas pour des croix." : "Not for this window: the frame is too low for crosses.") : barreauxImposes ? (fr ? "Obligatoires ici : le bas du cadre est à moins de 60 cm du sol." : "Mandatory here: the bottom of the frame is under 60 cm from the floor.") : sansConforme("aucun") },
            { v: "bas", label: fr ? "En bas" : "At the bottom", note: seulsExiste ? (fr ? "Pas pour cette fenêtre : le cadre est trop bas pour des croix." : "Not for this window: the frame is too low for crosses.") : sansConforme("bas") },
            { v: "seuls", label: fr ? "Barreaux seuls" : "Bars only", note: sansConforme("seuls") },
          ],
          legende: seulsExiste
            ? fr ? "Fenêtre haute : un cadre bas à barreaux verticaux." : "High window: a low frame of vertical bars."
            : barreauxImposes
            ? fr ? "Barreaux en bas obligatoires ici (cadre sous 60\u00a0cm)." : "Bars at the bottom are required here (frame under 60\u00a0cm)."
            : famille.barreaux === "aucun"
              ? fr ? "Croix de Saint-André seules." : "Saint Andrew's crosses only."
              : famille.barreaux === "bas"
                ? fr ? "Barreaux verticaux sous les croix." : "Vertical bars under the crosses."
                : fr ? "Barreaux verticaux, sans croix." : "Vertical bars, no crosses.",
          choisir: (v: string) => changerFamille(v as "aucun" | "bas" | "seuls", famille.traverse),
        },
        {
          titre: fr ? "Traverse au milieu" : "Middle rail",
          valeur: famille.traverse ? "avec" : "sans",
          options: [
            { v: "sans", label: fr ? "Sans" : "Without", note: sansConformeTraverse(false) },
            { v: "avec", label: fr ? "Avec" : "With", note: famille.barreaux === "seuls" ? (fr ? "Non disponible avec des barreaux seuls." : "Not available with bars only.") : sansConformeTraverse(true) },
          ],
          legende: famille.barreaux === "seuls"
            ? fr ? "Sans objet : pas de croix." : "Not applicable: no crosses."
            : famille.traverse
              ? fr ? "Une barre horizontale au centre des croix." : "A horizontal bar across the centre of the crosses."
              : fr ? "Croix sans barre horizontale." : "Crosses without a horizontal bar.",
          choisir: (v: string) => changerFamille(famille.barreaux, v === "avec"),
        },
      ].map((ligne) => (
        <div key={ligne.titre}>
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{ligne.titre}</span>
          {/* Une pilule segmentée, comme le choix d'épaisseur d'une table (le style vient de .carte-verre, globals.css). */}
          <div
            role="radiogroup"
            aria-label={ligne.titre}
            className="mt-1.5 grid rounded-full border border-[#9a8d80] bg-white p-0.5"
            style={{ gridTemplateColumns: ligne.colonnes ?? `repeat(${ligne.options.length}, minmax(0, 1fr))` }}
          >
            {ligne.options.map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={ligne.valeur === o.v}
                disabled={o.note !== ""}
                title={o.note || undefined}
                onClick={() => ligne.choisir(o.v)}
                className={`whitespace-nowrap rounded-full px-1.5 py-1.5 text-[12px] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] disabled:cursor-not-allowed disabled:opacity-40 ${ligne.valeur === o.v ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className={`${ligne.options.some((o) => o.note) ? "" : "legende-option "}mt-1 text-[11px] leading-snug text-[#6f6357]`}>{ligne.legende}</p>
        </div>
      ))}
    </div>
  ) : null;
  /** Le bouton « personnaliser » : le client envoie une photo du garde-corps qu'il veut, l'atelier répond par un devis. */
  const lienPhoto = lienDevis ? (
    <Link
      href={lienDevis}
      title={fr ? "Envoyez-nous une photo du garde-corps que vous voulez : devis en 24 à 72 h" : "Send us a photo of the railing you want: quote within 24 to 72 h"}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#2b2320]/25 px-2.5 py-1 text-[11px] font-medium leading-tight text-[#2b2320] transition-colors hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
        <path d="M3 7h3l1.5-2h5L14 7h3v9H3z" />
        <circle cx="10" cy="11.5" r="2.8" />
      </svg>
      {fr ? "Personnaliser sur photo : devis" : "Customise from a photo: quote"}
    </Link>
  ) : null;
  /** Le bouton de tri : prix croissant ou décroissant (un clic inverse l'ordre). */
  const boutonPrix =
    marque && liste.length > 1 ? (
      <button
        type="button"
        onClick={() => {
          setTri((v) => (v === "croissant" ? "decroissant" : "croissant"));
          bande.current?.scrollTo({ left: 0 });
        }}
        aria-label={fr ? `Trier par prix : ${tri === "croissant" ? "croissant" : "décroissant"} (toucher pour inverser)` : `Sort by price: ${tri === "croissant" ? "low to high" : "high to low"} (tap to reverse)`}
        title={fr ? "Inverser l'ordre des prix" : "Reverse the price order"}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#2b2320]/[0.07] px-2.5 py-1 text-[11px] font-medium leading-tight text-[#2b2320] transition-colors hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
          <path d={tri === "croissant" ? "M10 16V4M10 4l-4 4M10 4l4 4" : "M10 4v12M10 16l-4-4M10 16l4-4"} />
        </svg>
        {fr ? (tri === "croissant" ? "Prix croissant" : "Prix décroissant") : tri === "croissant" ? "Price: low to high" : "Price: high to low"}
      </button>
    ) : null;
  /** « Uniquement des modèles aux normes » : dit clairement que la rangée ne propose rien d'autre. */
  const mentionNormes = (n: number) => (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2f7d46]">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden>
        <path d="M4.5 10.5l3.5 3.5 7.5-8" />
      </svg>
      {fr
        ? `Uniquement des modèles aux normes pour votre fenêtre (${n})`
        : `Only models that meet the standard for your window (${n})`}
    </span>
  );
  /**
   * La rangée des modèles : des VISUELS, un par modèle AUX NORMES pour cette fenêtre, avec son prix et sa pastille verte, rangés par
   * prix (croissant ou décroissant) ; elle défile de côté s'il y en a plus que la place. Un clic choisit le modèle et son détail
   * s'écrit au-dessus.
   */
  const grandeRangee = Boolean(bandeauSlot);
  const rangee =
    liste.length > 0 ? (
      <div className="relative">
        {deborde &&
          ([-1, 1] as const).map((sens) => (
            <button
              key={sens}
              type="button"
              aria-label={sens < 0 ? (fr ? "Modèles précédents" : "Previous models") : fr ? "Modèles suivants" : "Next models"}
              onClick={() => bande.current?.scrollBy({ left: sens * 260, behavior: "smooth" })}
              className={`absolute top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#2b2320] shadow ring-1 ring-[#2b2320]/20 transition-colors hover:bg-white ${sens < 0 ? "-left-2" : "-right-2"}`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d={sens < 0 ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} />
              </svg>
            </button>
          ))}
        <div
          ref={bande}
          role="group"
          aria-label={fr ? "Modèles de garde-corps" : "Railing models"}
          aria-busy={modelesPerimes}
          style={{ scrollbarWidth: "thin" }}
          className={`relative -mx-1 mt-1.5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 pt-0.5 transition-opacity ${modelesPerimes ? "opacity-60" : ""}`}
        >
          {liste.map((m) => {
            const actif = choisi !== null && choisi.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={marque ? actif : undefined}
                aria-label={`${marque ? descriptionModele(m) : libelleModele(m)}${marque ? ` — ${prixAffiche(m.prix, locale)}` : ""}`}
                title={marque ? descriptionModele(m) : libelleModele(m)}
                onMouseEnter={() => setSurvol(m.id)}
                onMouseLeave={() => setSurvol(null)}
                onFocus={() => setSurvol(m.id)}
                onBlur={() => setSurvol(null)}
                onClick={() => {
                  if (!marque) document.getElementById(`${idChamps}-largeur`)?.focus();
                  else {
                    setPerdu(null);
                    setPourquoi(null);
                    onChange({ ...cotes, modele: m.id });
                    if (m.rosace && rosaceId && m.rosace !== rosaceId) onRosace?.(m.rosace);
                  }
                }}
                className={`tuile-modele relative flex ${grandeRangee ? "w-[104px] grow max-w-[190px]" : "w-[78px]"} shrink-0 snap-start flex-col px-1.5 pb-1.5 pt-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]`}
              >
                {marque && pastille(true)}
                <MiniGardeCorps
                  largeurMm={releve?.largeurMm ?? 1180}
                  hauteurMm={m.hauteurMm}
                  hMaxMm={marque ? hMax : 520}
                  soubassementMm={m.soubassementMm}
                  traverse={m.traverse}
                  seuls={m.seuls}
                  sansRosace={m.rosace === "sans"}
                  croix={m.croix}
                  trous={null}
                  hauteurPx={grandeRangee ? 40 : 26}
                />
                <span className="mt-1 block text-[11px] font-semibold leading-tight text-[#2b2320]">
                  {m.seuls ? (fr ? "Barreaux" : "Bars") : `${m.croix} ${fr ? "croix" : m.croix > 1 ? "crosses" : "cross"}`}
                </span>
                {/* La rangée mêle tous les types : ce que le modèle a en plus des croix se lit sous son nom. */}
                {marque && !m.seuls && (m.traverse || m.soubassementMm > 0) && (
                  <span className="block text-[9.5px] leading-tight text-[#5c5140]">
                    {[m.traverse ? (fr ? "+ traverse" : "+ rail") : null, m.soubassementMm > 0 ? (fr ? "+ barreaux en bas" : "+ bars below") : null].filter(Boolean).join(" ")}
                  </span>
                )}
                {/* Le modèle demande une autre rosace que la choisie (plus grande : les vides sont plus petits). */}
                {marque && m.rosace && rosaceId && m.rosace !== rosaceId && (
                  <span className="block text-[9.5px] leading-tight text-[#6f6357]">{rosaceTexte(m.rosace).split(" Ø")[0]}</span>
                )}
                {marque && <span className="block text-[11px] font-medium leading-tight tabular-nums text-[#2b2320]">{prixAffiche(m.prix, locale)}</span>}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;
  const catalogue = (
    /* Sous le croquis (téléphone, tablette), en bande FINE : les deux boutons (barreaux, traverse) et UNE rangée de modèles qui
       défile de côté, chacun avec son prix : uniquement des modèles aux normes. Sur grand écran : voir `bandeau`. */
    <div id="modeles-gc" className="carte-verre carte-modeles mt-2 scroll-mt-24 rounded-[20px] px-3 pb-2 pt-2.5 text-left">
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 ${marque ? "lg:hidden" : ""}`}>
        {marque ? controlesFamille : <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{fr ? "Votre modèle" : "Your model"}</p>}
      </div>
      {phraseModeles && <p className={`mt-1 text-[11.5px] leading-snug ${modeles.length === 0 && texteManque ? "font-medium text-[#7a4510]" : "text-[#5c5140]"}`}>{phraseModeles}</p>}
      {marque && nbConformes > 0 && (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[13px] font-semibold leading-tight text-[#2b2320]">{!choisi ? (fr ? "Choisissez votre modèle" : "Choose your model") : fr ? "Votre modèle" : "Your model"}</p>
          {mentionNormes(nbConformes)}
        </div>
      )}
      {boutonPrix && <div className="mt-1.5 flex items-center justify-end">{boutonPrix}</div>}
      {rangee}
      {/* Un garde-corps à son style : une photo, et l'atelier répond. */}
      {lienPhoto && <div className="mt-0.5 lg:hidden">{lienPhoto}</div>}
    </div>
  );
  /**
   * LE BANDEAU DES MODÈLES (grand écran) : en bas du bloc Configuration, sur toute la longueur des cotes et du croquis. Des visuels
   * (un par modèle) ; au-dessus, le détail du modèle touché ou survolé, écrit en clair (croix, traverse, barreaux, acier, rosace, prix).
   * Demande de Quentin : « pas un menu déroulant, un bandeau qui prend l'espace vide en bas du panneau ».
   */
  const modeleDetail = (survol ? modeles.find((m) => m.id === survol) : null) ?? explique ?? choisi;
  // Une phrase d'état (aucun modèle aux normes, modèle perdu, mesures à compléter…) passe avant le détail d'un modèle : c'est elle qui dit quoi faire.
  const phraseBandeau = !survol ? phraseModeles : "";
  const bandeau = (
    <div id="modeles-gc" className={`carte-verre carte-modeles rounded-[22px] px-4 pb-2 pt-2 text-left ${marque && nbConformes > 0 && !choisi ? "ring-2 ring-[#c98a3a]/55" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Une consigne tant que rien n'est choisi : « Choisissez votre modèle » ; ensuite, le nom du bloc. */}
        <span className="shrink-0 text-[14px] font-semibold leading-tight text-[#2b2320]">
          {marque && nbConformes > 0 && !choisi ? (fr ? "Choisissez votre modèle" : "Choose your model") : fr ? "Votre modèle" : "Your model"}
        </span>
        {marque && nbConformes > 0 && mentionNormes(nbConformes)}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {boutonPrix}
          {lienPhoto}
        </span>
      </div>
      {/* Le détail du modèle touché, survolé ou choisi — écrit en clair, sur sa propre ligne (deux au plus). */}
      <p
        className="mt-0 line-clamp-2 min-h-[1.1rem] text-[12px] leading-snug text-[#2b2320]"
        aria-live={survol ? "off" : "polite"}
        title={phraseBandeau || (modeleDetail ? descriptionModele(modeleDetail) : undefined)}
      >
        {phraseBandeau ? (
          <span className={modeles.length === 0 && texteManque ? "font-medium text-[#7a4510]" : "text-[#5c5140]"}>{phraseBandeau}</span>
        ) : modeleDetail && marque ? (
          <>
            <span className="font-semibold">{descriptionModele(modeleDetail)}</span>
            <span className="text-[#6f6357]"> — {modeleDetail.conforme ? prixAffiche(modeleDetail.prix, locale) : pasAdapte(modeleDetail)}</span>
          </>
        ) : (
          <span className="text-[#6f6357]">
            {marque ? (fr ? "Touchez un modèle pour le voir sur le croquis et lire son détail." : "Tap a model to see it on the sketch and read its details.") : ""}
          </span>
        )}
      </p>
      {rangee}
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
        <IconeCote cote={cote} />
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
              ? "Une main courante"
              : "A handrail"
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
      <span className="titre-mesures block text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
        {t.gcTitle}
      </span>

      {/* 1. Qui mesure ? C'est la première question, elle décide de la suite. */}
      <div className="mt-3">
        <QuiMesure
          valeur={cotes.qui}
          onChange={(qui) => onChange({ ...cotes, qui })}
          t={t}
          notes={{ moi: t.gcQuiMoiNote, atelier: t.gcQuiAtelierNote }}
          compact={Boolean(bandeauSlot || resultatSlot)}
        />
      </div>

      {/* 2a. L'atelier vient : le code postal, le prix, la demi-journée. */}
      {cotes.qui === "atelier" && (
        <>
          {/* L'atelier s'occupe de tout : à la place du croquis (rien à mesurer), un panneau qui le dit
              et qui détend — sur téléphone, il passe au-dessus du code postal. */}
          {/* Sous 1024 px, la petite version, dans la carte : la grande, en haut du bloc, écrasait le code postal et le créneau
              (téléphone, et tablette peu haute). */}
          {schemaSlot && bandeauSlot ? createPortal(<SereniteAtelier locale={locale} />, schemaSlot) : <SereniteAtelier locale={locale} petit />}
          <VisiteAtelier cotes={cotes} onChange={(visite) => onChange({ ...cotes, ...visite })} t={t} locale={locale} recapSlot={resultatSlot} />
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
              croix={apercuModele ? apercuModele.croix : dessin?.ok ? dessin.croix : undefined}
              soubassementMm={apercuModele ? apercuModele.soubassementMm : dessin?.ok ? dessin.soubassementMm : 0}
              traverse={apercuModele ? apercuModele.traverse : dessin?.ok ? dessin.traverse : false}
              renfort={apercuModele ? apercuModele.renfort : dessin?.ok ? dessin.renfort : false}
              patte={apercuModele ? apercuModele.patte : dessin?.ok ? dessin.patte : 0}
              seuls={apercuModele ? apercuModele.seuls : dessin?.ok ? dessin.seuls : false}
              trous={explique?.trous ?? null}
              rosaceMm={rosaceMm}
              mur={matiereMur(cotes.mur, t.gcMurOptions)}
              teinteAcier={teinteAcier}
              teinteBois={teinteBois}
              typeMainCourante={mainCourante === "acier" ? "acier-plat" : mainCourante === "profil" ? "acier-profile" : undefined}
              apercu={commence && !dessin?.ok && !apercuModele}
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
          const montre = explique ? { ok: false } : (choisi || conforme) && !surVerre ? { ok: true } : null;
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
            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-xl lg:bottom-auto lg:top-11 bg-white/93 px-2.5 py-1.5 text-[11px] leading-snug text-[#4a3f33] shadow-sm" role="status" aria-live="polite">
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
                              ? `${rouges > 1 ? "Ronds rouges" : "Rond rouge"}\u00a0: le plus grand vide mesure ${nombre(t.plusGrandMm)} mm\u00a0; l'atelier exige moins de ${nombre(t.limiteMm)} mm (la boule de la norme, ${nombre(t.limiteMm + MARGE_BOULE_GC_MM)} mm, moins ${MARGE_BOULE_GC_MM} mm de marge de fabrication).`
                              : `${rouges > 1 ? "Red circles" : "Red circle"}: the largest gap is ${nombre(t.plusGrandMm)} mm; the workshop requires under ${nombre(t.limiteMm)} mm (the standard's ${nombre(t.limiteMm + MARGE_BOULE_GC_MM)} mm ball, minus ${MARGE_BOULE_GC_MM} mm manufacturing margin).`}
                          </span>
                        </p>
                      )}
                      {verts && (
                        <p className="flex items-start gap-1.5">
                          <span aria-hidden className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-[#2f7d46] bg-[#2f7d46]/30" />
                          <span>{rouges > 0 ? (fr ? "Ronds verts : vides conformes à la norme." : "Green circles: gaps that meet the standard.") : fr ? `Ronds verts : tous les vides sont conformes à la norme (au plus ${nombre(t.plusGrandMm)} mm).` : `Green circles: every gap meets the standard (at most ${nombre(t.plusGrandMm)} mm).`}</span>
                        </p>
                      )}
                      {rouges === 0 && raison && (
                        <p className="font-medium text-[#2b2320]">
                          {fr ? "Motif : " : "Reason: "}
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
            ? <>
              {createPortal(
                /* Une colonne à la largeur du croquis : la rangée des modèles s'aligne sur ses bords.
                   La largeur du cadre est écrite en toutes lettres (3/4 de sa hauteur) : avec `aspect-ratio` seul,
                   Safari ne la comptait pas dans la largeur de la colonne — elle tombait à zéro, le croquis
                   disparaissait et la carte des modèles s'écrasait. */
                <div className={`mx-auto flex max-w-full flex-col [--h:34svh] lg:min-h-0 lg:flex-1 lg:justify-center ${bandeauSlot ? "w-[calc(var(--h)*0.75)] lg:[--h:clamp(240px,100cqh,800px)]" : "w-[max(calc(var(--h)*0.75),360px)] md:w-full md:[--h:min(38svh,430px)] lg:w-[max(calc(var(--h)*0.75),360px)] lg:[--h:clamp(240px,calc(100dvh_-_22.5rem),780px)]"}`}>
                  {/* GRAND CROQUIS (demande de Quentin, répétée) : sur grand écran il prend toute la hauteur de la colonne, et la
                      bande des modèles (boutons + une rangée qui défile) se pose en bas du croquis, sur le mur et le sol. */}
                  <div className="relative flex flex-col md:flex-row md:items-start md:gap-3 lg:block">
                    <div className="relative mx-auto aspect-[3/4] w-[min(100%,calc(var(--h)*0.75))] shrink-0 overflow-hidden rounded-2xl">
                      {croquis}
                      {puce}
                      {legendeCroquis}
                    </div>
                    {/* La rangée des modèles est SOUS le croquis, jamais par-dessus : elle cachait le garde-corps et les cotes selon la fenêtre.
                        Sur grand écran, elle est dans le bandeau du bas (bandeauSlot). */}
                    {!bandeauSlot && !telephone && <div className="mx-auto w-0 min-w-full md:mx-0 md:w-auto md:min-w-0 md:flex-1">{catalogue}</div>}
                  </div>
                </div>,
                schemaSlot
              )}
              {bandeauSlot && createPortal(bandeau, bandeauSlot)}
            </>
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
                « i », et le croquis coté juste à côté montre où mesurer. */}
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

            {/* Le mur, OBLIGATOIRE (décision de Quentin, 05/10) : il décide des chevilles et de la fixation que
                l'atelier fournit. « Je ne sais pas » reste possible : on demandera une photo. Le croquis le dessine. */}
            <label id="mur-gc" className="block scroll-mt-28 py-3">
              <span className="flex items-center gap-2.5 text-[15px] text-[#2b2320]">
                <InfoBulle texte={t.gcMurInfo} label={t.gcInfoLabel} />
                {t.gcMur}
                {cotes.mur === "" && (
                  <span className="rounded-full bg-[#fbeeda] px-2 py-0.5 text-[11px] font-medium text-[#7a4510]">{fr ? "à choisir" : "to choose"}</span>
                )}
              </span>
              <select
                id={`${idChamps}-mur`}
                value={cotes.mur}
                onChange={(e) => set("mur")(e.target.value)}
                className={`${SELECT.replace("w-[8.5rem]", "w-full")} mt-2 ${cotes.mur === "" ? "border-[#c98a3a]" : ""}`}
              >
                <option value="" disabled>{fr ? "Choisissez…" : "Choose…"}</option>
                {t.gcMurOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Sur téléphone, la partie « Modèle » (comme le dessus et le dessous du croquis sur ordinateur) : les matières, puis la
              rangée des modèles. Dans la carte, sous le mur : sous le croquis, elle le poussait hors de l'écran. */}
          {telephone && schemaSlot && !bandeauSlot && (
            <div id="partie-modele" className="mt-3 border-t border-[#e5ddd3] pt-4">
              <div ref={matieresSlotTelephone} className="mb-4" />
              {catalogue}
            </div>
          )}

          {/* Le résultat : le prix, la norme, le modèle choisi. À côté de la carte, sous le catalogue
              (la carte, à gauche, ne porte plus que les cotes et la livraison : elle était trop longue
              et la colonne de droite restait vide) ; sur téléphone, il reste ici. */}
          {(() => {
            const resultat = (
              <>
          {/* Grand écran : les boutons barreaux et traverse sont ici, à côté du prix ; la rangée des modèles est sur le croquis. */}
          {controlesFamille && (
            <div className="hidden lg:block">
              <p className="titre-options mb-2 text-[15px] font-semibold text-[#2b2320]">{fr ? "Composez votre garde-corps" : "Design your railing"}</p>
              {controlesFamille}
            </div>
          )}
          {/* ④ Ce que ça donne, calculé par l'outil de l'atelier : les cotes,
              les croix, le prix, et la norme en une ligne. */}
          <div
            className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-3 ${resultatSlot ? "mt-3" : "mt-4"}`}
            onMouseEnter={() => setCoteActive("hauteur")}
            onMouseLeave={() => setCoteActive(null)}
          >
            <div className={`min-w-0 ${resultatSlot && conforme ? "hidden" : ""}`}>
              <span className={`flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357] ${resultatSlot ? "hidden" : ""}`}>
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
                      ? `Main courante seule de ${nombre(releve.largeurMm)} mm · sur devis`
                      : `Handrail on its own, ${nombre(releve.largeurMm)} mm · on quotation`
                    : releve && dessin
                  ? [
                      t.gcResume.replace("{l}", nombre(releve.largeurMm)).replace("{h}", nombre(dessin.hauteurMm)),
                      dessin.ok && !surVerre ? contenuTexte(dessin) : null,
                      conforme && !resultatSlot ? t.gcPrixCompris : null,
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
                      ? `Le bas de votre fenêtre est à ${nombre(releve.allegeMm)} mm du sol, et la main courante se pose à ${nombre(reponse.mainCouranteMm)} mm (la loi demande 1 m au moins) : il ne reste que ${nombre(reponse.mainCouranteMm - releve.allegeMm)} mm, trop peu pour un garde-corps. Une main courante seule respecte ici la norme : le vide dessous reste plus petit que la boule de la norme.`
                      : `The bottom of your window is ${nombre(releve.allegeMm)} mm from the floor, and the handrail goes at ${nombre(reponse.mainCouranteMm)} mm (the law asks for at least 1 m): only ${nombre(reponse.mainCouranteMm - releve.allegeMm)} mm are left, too little for a railing. A handrail on its own meets the standard here: the gap below it stays smaller than the standard's ball.`}
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
                    {resultatSlot ? (fr ? "Conforme aux normes françaises" : "Compliant with French standards") : t.gcConforme}
                    {resultatSlot && (
                      <InfoBulle
                        texte={`${fr ? "Hauteur : Code de la construction, art. R134-59. Espaces entre les barres : norme NF P01-012. Calculés pour votre fenêtre : nous ne vendons jamais un garde-corps qui ne les respecte pas." : "Height: French building code, art. R134-59. Gaps between the bars: standard NF P01-012. Worked out for your window: we never sell a railing that does not meet them."}${conforme.renfort ? ` ${textRenfort}` : ""}`}
                        label={t.gcInfoLabel}
                      />
                    )}
                  </p>
                  {/* « Voir le plan » (demande de Quentin) : UNE vue d'aperçu, aux cotes du client, sans rien de la fabrication. */}
                  {releve && !surVerre && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPlanOuvert(true)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#9a8d80] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2320] transition-colors hover:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
                      >
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                          <rect x="2.5" y="4" width="15" height="12" rx="1.2" />
                          <path d="M2.5 8h15M7 8v8M5 6h.01" />
                        </svg>
                        {fr ? "Voir le plan" : "View the drawing"}
                      </button>
                      {planOuvert && (
                        <PlanApercu
                          fr={fr}
                          onClose={() => setPlanOuvert(false)}
                          parametres={parametresPrixGC(releve, { woodId: mainCourante ?? "chene", fabricId: rosaceId })}
                        />
                      )}
                    </>
                  )}
                  {/* La loi n'impose rien ici (rez-de-chaussée, ou bas de fenêtre à 90 cm et plus) : on le dit,
                      pour que le client ne croie pas qu'il lui en faut un. Il peut en vouloir un quand même. */}
                  {!conforme.obligatoire && (
                    <p className="mt-1.5 rounded-lg bg-[#eef3ea] px-2.5 py-1.5 text-[#33502f]">
                      {resultatSlot
                        ? fr
                          ? "La loi n'impose pas de garde-corps ici : c'est un choix de style."
                          : "The law does not require a railing here: it is a style choice."
                        : releve && !releve.enEtage
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
                  {conforme.renfort &&
                    (resultatSlot ? (
                      <p className="info-renfort mt-1.5 flex items-center gap-1.5 text-[11.5px] leading-snug text-[#4a3f33]">
                        {platChoisi ? (fr ? "Sur fer plat : lisse haute renforcée, incluse." : "On a flat bar: reinforced top rail, included.") : fr ? "Fenêtre large : lisse haute renforcée, incluse." : "Wide window: reinforced top rail, included."}
                        <InfoBulle texte={textRenfort} label={t.gcInfoLabel} />
                      </p>
                    ) : (
                      <p className="mt-1.5 rounded-lg bg-[#f3ede3] px-2.5 py-1.5 text-[#4a3f33]">{textRenfort}</p>
                    ))}
                  {/* Fenêtre large et garde-corps bas : la patte du milieu, scellée dans l'appui, est comprise. */}
                  {conforme.patte > 0 && (
                    <p className="info-renfort mt-1.5 flex items-center gap-1.5 text-[11.5px] leading-snug text-[#4a3f33]">
                      {conforme.patte > 1
                        ? fr ? `Garde-corps large et bas : ${conforme.patte} pattes scellées dans l'appui, incluses.` : `Wide, low railing: ${conforme.patte} fixing bars sealed into the sill, included.`
                        : fr ? "Garde-corps large et bas : une patte au milieu, scellée dans l'appui, incluse." : "Wide, low railing: a middle fixing bar sealed into the sill, included."}
                      <InfoBulle
                        texte={fr
                          ? "Votre garde-corps est large et bas : les vis des tableaux seules seraient trop tirées. Des pattes en acier, du même carré que le garde-corps, soudées sous les montants, sont scellées dans l'appui de la fenêtre (scellement chimique). Elles sont comprises dans le prix. L'appui doit être sain : l'atelier le vérifie avec vous avant de fabriquer."
                          : "Your railing is wide and low: the screws in the reveals alone would be overloaded. Steel bars of the same section as the railing, welded under the uprights, are sealed into the window sill (chemical anchor). They are included in the price. The sill must be sound: the workshop checks it with you before making the railing."}
                        label={t.gcInfoLabel}
                      />
                    </p>
                  )}
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
                  ? `${releve.largeurMm} × ${conforme.hauteurMm} mm, ${contenuTexte(conforme)}. ${t.gcCalcule.replace("{m}", String(conforme.mainCouranteMm))} ${prixAffiche(conforme.prix, locale)}.`
                  : reponse && !reponse.ok
                    ? reponse.raison === "barre-appui"
                      ? fr
                        ? "Une main courante seule, sur devis."
                        : "A handrail on its own, on quotation."
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
          {conforme && !surVerre && !resultatSlot && (
            <p className={`mt-3 rounded-xl px-3.5 py-2 text-[13px] leading-snug ${choisi ? "bg-[#e3efe4] text-[#1f5a2e]" : "bg-[#fbeeda] text-[#7a4510]"}`} role="status">
              {choisi
                ? `${fr ? "Modèle choisi : " : "Chosen model: "}${libelleModele(choisi)}${schemaSlot ? "" : ` — ${prixAffiche(choisi.prix, locale)}`}`
                : fr
                  ? "Dernière étape : choisissez votre modèle, sous le croquis."
                  : "Last step: choose your model, under the sketch."}
            </p>
          )}
          {/* Pourquoi des barreaux en bas : si le client ne les a pas choisis, c'est la norme (le cadre commence sous
              60 cm du sol : des croix s'y escaladent, des barreaux droits non). Il doit le savoir, pas le subir. */}
          {conforme && !surVerre && !resultatSlot && conforme.soubassementMm > 0 && !voulu?.barreauxBas && (
            <p className="mt-2 rounded-xl bg-[#f3ede3] px-3.5 py-2 text-[12px] leading-snug text-[#4a3f33]">
              {fr
                ? "Barreaux verticaux en bas : obligatoires. Le bas du garde-corps est à moins de 60 cm du sol, et des croix pourraient servir de marche à un enfant."
                : "Vertical bars at the bottom: mandatory. The bottom of the railing is less than 60 cm from the floor, and crosses could give a child a foothold."}
            </p>
          )}
          {/* « Poids et détails », « Ce que comprend le prix » : la fiche les dépose ici (voir detailsSlot). */}
          {schemaSlot && detailsSlot && !resultatSlot && <div ref={detailsSlot} className="mt-2.5" />}

          {lienPhoto && !bandeauSlot && <div className="mt-1.5 hidden lg:block">{lienPhoto}</div>}
          {/* La note de fabrication : pas dans la colonne étroite, qui doit tenir sur un écran. */}
          {!resultatSlot && <p className="mt-4 text-[11px] leading-snug text-[#726757]">{t.gcNote}</p>}
              </>
            );
            // Sur téléphone, le résultat reste dans la carte qui défile : sous le croquis, il le poussait hors de l'écran.
            return resultatSlot
              ? createPortal(<div className="resultat-colonne pb-1 text-left">{resultat}</div>, resultatSlot)
              : schemaSlot && !telephone
                ? createPortal(<div className="mt-4 rounded-2xl border border-[#e0d6c8] bg-white/75 p-4 text-left md:p-5">{resultat}</div>, schemaSlot)
                : schemaSlot
                  ? <div id="partie-prix" className="mt-3 border-t border-[#e5ddd3] pt-1">{resultat}</div>
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
    seuls: false,
    rosace: "",
    renfort: false,
    patte: 0,
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
function MiniGardeCorps({ largeurMm, hauteurMm, hMaxMm, soubassementMm, croix, traverse = false, seuls = false, sansRosace = false, trous = null, hauteurPx = 26 }: { largeurMm: number; hauteurMm: number; hMaxMm: number; soubassementMm: number; croix: number; seuls?: boolean; traverse?: boolean; sansRosace?: boolean; trous?: TrousGC | null; hauteurPx?: number }) {
  const L = largeurMm, H = Math.max(hMaxMm, hauteurMm);
  const y0 = H - hauteurMm, haut = y0 + 40, bas = H;
  const lisse = soubassementMm > 0 ? bas - soubassementMm : bas;
  const pas = L / croix;
  const nb = Math.max(2, Math.round(L / 110));
  const trait = { vectorEffect: "non-scaling-stroke" as const };
  // Les ronds de l'outil sont en mm depuis le coin bas-gauche du CADRE : on les pose dans le cadre de ce dessin.
  const sx = trous ? L / trous.cadreMm.l : 1, sy = trous ? (bas - haut) / trous.cadreMm.h : 1;
  return (
    <svg viewBox={`${-L * 0.02} ${-H * 0.03} ${L * 1.04} ${H * 1.06}`} preserveAspectRatio="xMidYMax meet" aria-hidden className="block w-full" style={{ height: `var(--mini-gc, ${hauteurPx}px)` }} fill="none" stroke="#2b2320" strokeWidth="1.5" strokeLinecap="round">
      <rect x={-L * 0.01} y={y0} width={L * 1.02} height="40" fill="#c9a36b" stroke="none" />
      <rect x="0" y={haut} width={L} height={bas - haut} {...trait} />
      {soubassementMm > 0 && <line x1="0" y1={lisse} x2={L} y2={lisse} {...trait} />}
      {/* La traverse au milieu des croix : un trait horizontal, d'un montant à l'autre. */}
      {traverse && !seuls && <line x1="0" y1={(haut + lisse) / 2} x2={L} y2={(haut + lisse) / 2} strokeWidth="1" {...trait} />}
      {seuls &&
        Array.from({ length: nb - 1 }, (_, i) => {
          const x = ((i + 1) * L) / nb;
          return <line key={`s${i}`} x1={x} y1={haut} x2={x} y2={bas} strokeWidth="0.9" {...trait} />;
        })}
      {!seuls && Array.from({ length: croix }, (_, i) => {
        const x0 = i * pas, x1 = x0 + pas;
        return (
          <g key={i}>
            {i > 0 && <line x1={x0} y1={haut} x2={x0} y2={lisse} {...trait} />}
            <line x1={x0} y1={haut} x2={x1} y2={lisse} strokeWidth="1" {...trait} />
            <line x1={x0} y1={lisse} x2={x1} y2={haut} strokeWidth="1" {...trait} />
            {!sansRosace && <circle cx={(x0 + x1) / 2} cy={(haut + lisse) / 2} r={Math.min(50, pas / 6, (lisse - haut) / 4)} fill="#2b2320" stroke="none" />}
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
