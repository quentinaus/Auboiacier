"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { InfoBulle } from "./info-bulle";
import { QuiMesure, VisiteAtelier } from "./prise-de-cotes";
import { SereniteAtelier } from "./serenite-atelier";
import { MetreRuban, SchemaFenetre, type CoteFenetre } from "./schema-fenetre";
import { matiereMur } from "@/lib/murs-gc";
import { PlanApercu } from "./plan-apercu";
import { ChargementModeles } from "./chargement-modeles";
import { PhotoTableau } from "./photo-tableau";
import { ETAPES_GC, QUESTIONS_GC } from "./etapes-telephone";
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
  RECUL_FIXATION_GC_MM,
} from "@/lib/garde-corps";
import { prixAffiche } from "@/lib/ui";
import { BORNES_MUR_GC, NOMS_MUR_FIXATION_GC, idDecorGC, lireDecorGC, lireModeleGC, nomDecorAnglaisGC } from "@/lib/garde-corps";
import { ChoixDecorGC, type PrixDecorsGC } from "./choix-decor-gc";
import type { AssemblageDecorGC } from "@/lib/garde-corps-decors.genere";

/*
 * Le relevé et sa lecture (les cases, lireReleve, l'état des questions, les deux largeurs) vivent dans src/lib/releve-gc.ts,
 * sans JSX, pour que les tests les chargent ; la fiche les réexporte, les autres composants n'ont pas bougé.
 */
import {
  COTES_GARDE_CORPS_VIDES,
  PIERRES_GC,
  etatQuestionGC,
  largeursGC,
  largeurHautSaisie,
  lireReleve,
  mm,
  murAvecEpaisseurGC,
  murFixationDesCotes,
  saisieMur,
  texteEcartGC,
  texteManqueGC,
  type CotesGardeCorps,
  type LectureReleve,
} from "@/lib/releve-gc";

export { COTES_GARDE_CORPS_VIDES, PIERRES_GC, etatQuestionGC, largeursGC, largeurHautSaisie, lireReleve, murAvecEpaisseurGC, murFixationDesCotes, texteEcartGC, texteManqueGC };
export type { CotesGardeCorps, LectureReleve };

const ACCENT = "#2b2320";
/** Décision du 03/10 : plus de panneau de verre proposé — les modèles aux normes (croix, barreaux) le remplacent. */
const PROPOSER_VERRE: boolean = false;

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
    {
      etage: cotes.etage,
      mur: cotes.mur,
      allegeMm: mm(cotes.allege),
      fenetreMm: mm(cotes.fenetre),
      jourMm: reponse?.jourMm ?? 0,
      largeurBasMm: largeursGC(cotes)?.basMm,
      largeurHautMm: largeursGC(cotes)?.hautMm,
    },
    t,
    langue,
  );
}

/** Les cotes qui se tapent (et ont un curseur) : celles de la fenêtre, et celles du mur pour la fixation. */
type CoteSaisieGC = "largeur" | "largeurHaut" | "allege" | "fenetre" | "tMur" | "eMur";

/**
 * Devant chaque case, le pictogramme de sa cote, dessiné comme sur un plan : une largeur entre deux murs,
 * une hauteur depuis le sol, une hauteur de fenêtre. Il remplace les pastilles ①②③ (« pas pro », 05/10).
 */

function IconeCote({ cote }: { cote: CoteSaisieGC }) {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0 text-[#2a2116]" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
      {cote === "largeur" && <path d="M2 3v12M16 3v12M2 12h14M3.6 13.6l1.6-3.2M12.8 13.6l1.6-3.2" />}
      {cote === "largeurHaut" && <path d="M2 3v12M16 3v12M2 6h14M3.6 7.6l1.6-3.2M12.8 7.6l1.6-3.2" />}
      {cote === "allege" && <path d="M2.5 16h13M9 16V3M5 3h8M7.4 4.6l3.2-3.2M7.4 17.6l3.2-3.2" strokeOpacity={1} />}
      {cote === "fenetre" && <path d="M7 3h8v12H7zM11 3v12M3 3v12M1.4 4.6l3.2-3.2M1.4 16.6l3.2-3.2" />}
      {/* Vue de dessus : le mur, la fenêtre au fond du tableau, et la profondeur entre les deux. */}
      {cote === "tMur" && <path d="M2 2v14M2 2h5v5M16 7H7M7 7v9M2 12h14M3.6 13.6l-1.6-1.6 1.6-1.6M14.4 10.4l1.6 1.6-1.6 1.6" />}
      {cote === "eMur" && <path d="M5 2v14M13 2v14M5 9h8M6.6 10.6L5 9l1.6-1.6M11.4 7.4L13 9l-1.6 1.6" />}
    </svg>
  );
}

/**
 * La profondeur du tableau, vue de dessus (Quentin, 09/10/2026 : « un dessin par question ») : le mur coupé, la fenêtre au fond,
 * et le mètre ruban posé de l'angle de la façade jusqu'au cadre. Le croquis de face ne peut pas montrer cette mesure.
 */
function DessinTableau({ fr }: { fr: boolean }) {
  return (
    <svg viewBox="0 0 240 118" className="mx-auto block h-auto w-full" role="img" aria-label={fr ? "Vue de dessus : mesurez de l'angle du mur, dehors, jusqu'au cadre de la fenêtre." : "Top view: measure from the corner of the wall, outside, to the window frame."}>
      <defs>
        <pattern id="hachures-tableau" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#e9e1d4" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#cfc3b2" strokeWidth="2" />
        </pattern>
      </defs>
      {/* Dedans, en haut ; dehors (la rue), en bas. */}
      <text x="120" y="11" textAnchor="middle" fontSize="9" fill="#6f6357">{fr ? "Dedans" : "Inside"}</text>
      <text x="120" y="114" textAnchor="middle" fontSize="9" fill="#6f6357">{fr ? "Dehors (la rue)" : "Outside (the street)"}</text>
      {/* Les deux murs, coupés, et l'ouverture entre eux. */}
      <rect x="14" y="18" width="62" height="78" fill="url(#hachures-tableau)" stroke="#8f8377" strokeWidth="1" />
      <rect x="164" y="18" width="62" height="78" fill="url(#hachures-tableau)" stroke="#8f8377" strokeWidth="1" />
      {/* La fenêtre, au fond du tableau. */}
      <rect x="76" y="26" width="88" height="9" fill="#ffffff" stroke="#4d433a" strokeWidth="1" />
      <line x1="120" y1="26" x2="120" y2="35" stroke="#4d433a" strokeWidth="1" />
      {/* Le mètre : de l'angle du mur, côté rue, jusqu'au cadre (le même mètre que sur le croquis de face). */}
      <MetreRuban de={[70, 98]} a={[70, 35]} />
      <path d="M86 96 L86 35" stroke="#2b2320" strokeWidth="1" />
      <path d="M83 98 L89 94 M83 37 L89 33" stroke="#2b2320" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="92" y="57" width="64" height="16" rx="8" fill="#2b2320" />
      <text x="124" y="68.5" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#ffffff">{fr ? "la profondeur" : "the depth"}</text>
    </svg>
  );
}

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
  modeleSlot,
  question,
  suivante,
  messageQuestion,
  allerQuestion,
  verre,
  forge = false,
}: {
  /**
   * La fiche du Garde-corps forgé à volutes (07/10/2026) : le client choisit un DÉCOR à volutes (jamais des croix), et
   * cotes.decor en porte toujours un (product-options.tsx). Sans : le garde-corps Rosace, ses croix et ses barreaux, sans décor.
   */
  forge?: boolean;
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
  /** Téléphone, parcours en étapes : l'étape « Modèle » (product-view.tsx), où va la rangée des modèles. */
  modeleSlot?: HTMLDivElement | null;
  /**
   * Téléphone, une question à la fois (etapes-telephone.tsx) : la question posée, de 1 à 5 (largeur, hauteur sous la
   * fenêtre, hauteur de la fenêtre, étage, mur). La carte ne montre alors QUE cette question, en grand.
   */
  question?: number;
  /** Passer à la question suivante (touche Entrée, ou « OK » à côté de la case). */
  suivante?: () => void;
  /** Ce qui manque à la question posée, ou ce qu'il faut savoir : écrit sous sa case, au-dessus du clavier. */
  messageQuestion?: string | null;
  /** Aller à une question (une cote touchée sur le croquis : sa question). */
  allerQuestion?: (question: number) => void;
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
  /**
   * ORDINATEUR ET TABLETTE AUSSI, UNE QUESTION À LA FOIS (Quentin, 07/10/2026 : la colonne des mesures devenait trop
   * longue avec le mur, « questions une par une ») : les questions du téléphone, dans la colonne, à côté du croquis ; puis
   * le résumé des réponses, chacune modifiable. null : la première question qui manque (ou le résumé si tout est là, une
   * configuration reprise), tant que le client n'a rien touché.
   */
  const [questionPc, setQuestionPc] = useState<number | "resume" | null>(null);
  /** Ce qui manque (ou l'avertissement) sous la question de l'ordinateur, après un essai de « Suivant ». */
  const [messagePc, setMessagePc] = useState<{ question: number; texte: string; avertissement: boolean } | null>(null);
  const premiereAFaire = () => {
    for (let n = 1; n <= QUESTIONS_GC; n++) if (etatQuestionGC(cotes, n, t, locale).manque) return n;
    return null;
  };
  const questionAffichee: number | "resume" = questionPc ?? premiereAFaire() ?? "resume";
  /** La question en cours ne bouge plus dès que le client y touche (sinon, la première frappe la faisait passer). */
  const figerQuestion = () => {
    if (!question && questionPc === null) setQuestionPc(questionAffichee);
    if (!question) setMessagePc(null);
  };
  const allerPc = (n: number | "resume") => {
    setMessagePc(null);
    setQuestionPc(n);
  };
  /** « Suivant » sur ordinateur : ce qui manque d'abord ; un avertissement, une fois ; puis la question d'après. */
  const suivantePc = () => {
    if (questionAffichee === "resume") return;
    const n = questionAffichee;
    const etat = etatQuestionGC(cotes, n, t, locale);
    if (etat.manque) {
      setMessagePc({ question: n, texte: etat.manque, avertissement: false });
      return;
    }
    if (etat.avertissement && !(messagePc?.question === n && messagePc.avertissement)) {
      setMessagePc({ question: n, texte: etat.avertissement, avertissement: true });
      return;
    }
    allerPc(n >= QUESTIONS_GC ? "resume" : n + 1);
  };
  /** Un choix (étage, mur) fait passer de lui-même à la suite, comme sur téléphone (là, c'est la fiche qui s'en charge). */
  const passerBientot = (n: number) => {
    if (question) return;
    window.setTimeout(() => allerPc(n >= QUESTIONS_GC ? "resume" : n + 1), 380);
  };
  // La question qui change (« Suivant », « Retour », une réponse du résumé) : le doigt va dans sa case.
  useEffect(() => {
    if (question || questionPc === null || questionPc === "resume") return;
    document.querySelector<HTMLElement>(".colonne-cotes [data-question-champ]")?.focus({ preventScroll: true });
  }, [question, questionPc]);
  /** La cote dont parle la question posée (téléphone) : le croquis la montre, même sans le doigt dans la case. */
  /** Sur ordinateur aussi, la question en cours montre sa cote sur le croquis (avec le mètre), même sans le doigt dans la case. */
  const coteQuestionPc: CoteFenetre | null =
    questionAffichee === 1 ? "largeur" : questionAffichee === 2 && cotes.mursInegaux ? "largeurHaut" : questionAffichee === 3 ? "allege" : questionAffichee === 4 ? "fenetre" : null;
  const coteQuestion: CoteFenetre | null =
    question === 1 ? "largeur" : question === 2 && cotes.mursInegaux ? "largeurHaut" : question === 3 ? "allege" : question === 4 ? "fenetre" : null;
  // La même case sert d'une question de mesure à l'autre (le clavier reste ouvert) : ni « focus » ni « blur » ne
  // préviennent du changement. La cote éclairée repart donc de zéro à chaque question.
  const [questionVue, setQuestionVue] = useState(question);
  if (questionVue !== question) {
    setQuestionVue(question);
    setCoteActive(null);
  }
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
  /** Le décor à volutes choisi : il remplace les croix (le verre, lui, n'a pas de décor). */
  const decorChoisi = !forge || verre?.surVerre === true ? null : lireDecorGC(cotes.decor);
  const modeleRefuse = !decorChoisi && Boolean(cotes.modele) && brute !== null && !brute.ok;
  // Le décor ne passe pas la norme avec ces mesures (un vide, un appui pour grimper) : on le retire et on le dit ; les croix
  // reviennent (« jamais hors norme, mais toujours une proposition »).
  // Sur la fiche du forgé, il n'y a pas de croix où revenir : le décor le moins cher qui passe la norme le remplace (« le site
  // propose la meilleure config ») ; si aucun ne passe, la réponse « à étudier » reste affichée telle quelle.
  const remplacant =
    forge && Boolean(decorChoisi) && brute !== null && !brute.ok && brute.raison === "a-etudier"
      ? [...(brute.decors ?? [])].filter((d) => d.conforme).sort((a, b) => a.prix - b.prix)[0]
      : undefined;
  const decorRefuse = Boolean(decorChoisi) && brute !== null && !brute.ok && brute.raison === "a-etudier" && (!forge || remplacant !== undefined);
  const reponse = modeleRefuse || decorRefuse ? null : brute;
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
  const mesures = `${cotes.largeur}|${cotes.largeurHaut}|${cotes.allege}|${cotes.fenetre}|${cotes.etage}`;
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
  /** Le décor retiré parce qu'il ne passait pas la norme avec ces mesures : le nom du décor, pour le dire. */
  const [decorPerdu, setDecorPerdu] = useState<string | null>(null);
  /** Le refus déjà noté (la réponse du serveur) : on ne le note qu'une fois, comme pour le modèle perdu. */
  const [decorRefusVu, setDecorRefusVu] = useState<ReponsePrixGC | null>(null);
  if (decorRefuse && decorChoisi && brute && decorRefusVu !== brute) {
    setDecorRefusVu(brute);
    setDecorPerdu(decorChoisi.assemblage);
  }
  useEffect(() => {
    if (decorRefuse) onChange({ ...cotes, decor: forge && remplacant ? remplacant.id : "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decorRefuse]);
  /** Le client a commencé à remplir : à partir de là, on lui montre précisément ce qui manque. */
  const commence = cotes.largeur.trim() !== "" || cotes.largeurHaut.trim() !== "" || cotes.allege.trim() !== "" || cotes.fenetre.trim() !== "" || t.gcEtageOptions.includes(cotes.etage);
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
  /**
   * LE MOINS CHER DÉJÀ CHOISI (étude marketing, 06/10, et « le site propose la meilleure config, le client ne cherche pas ») :
   * dès que le serveur répond, le modèle qu'il propose (le moins cher à croix, avec la rosace choisie : avecLeMoinsCher)
   * devient le choix du client — il peut passer au prix sans rien toucher, ou en prendre un autre. Ce choix automatique
   * suit la fenêtre : si une mesure change, il est retiré, et le serveur propose de nouveau le moins cher.
   */
  const choixAuto = useRef<{ modele: string; pour: string } | null>(null);
  const propose =
    !voulu && !decorChoisi && reponse?.ok
      ? (modeles.find(
          (m) =>
            m.conforme &&
            m.croix === reponse.croix &&
            m.traverse === reponse.traverse &&
            Boolean(m.seuls) === Boolean(reponse.seuls) &&
            (m.soubassementMm > 0) === (reponse.soubassementMm > 0),
        ) ?? null)
      : null;
  useEffect(() => {
    if (!propose) return;
    choixAuto.current = { modele: propose.id, pour: mesures };
    onChange({ ...cotes, modele: propose.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propose?.id]);
  useEffect(() => {
    const auto = choixAuto.current;
    if (!auto || cotes.modele !== auto.modele || auto.pour === mesures) return;
    choixAuto.current = null;
    onChange({ ...cotes, modele: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesures]);
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
  const seulModele = seulsExiste && modeles.length === 1 && modeles[0].conforme && !choisi && !decorChoisi ? modeles[0].id : null;
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
              : raisons.includes("escalade")
                ? fr
                  ? "si près du sol, le dessin laisserait un appui pour grimper"
                  : "this close to the floor, the design would leave a foothold"
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
          : // Ce qui manque encore ; l'annonce des modèles est écrite au milieu de la rangée (voir `attente`).
            (texteManque ?? "")
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
  /** Les mesures sont là, le serveur cherche les modèles : l'animation de chargement. */
  const enCalcul = modeles.length === 0 && !sansModeleAChoisir && lecture.etat === "ok" && (prix.statut === "calcul" || prix.statut === "attente");
  // Tant que les mesures et l'étage ne sont pas tous entrés, AUCUN modèle n'est montré (Quentin, 05/10 : « ne propose pas de
  // garde-corps ») : un petit message, au milieu de la rangée, dit qu'ils s'afficheront ici.
  const attente =
    modeles.length === 0 && !sansModeleAChoisir
      ? lecture.etat === "incomplet"
        ? fr
          ? "Les garde-corps aux normes pour votre fenêtre s'afficheront ici dès que toutes vos informations seront entrées."
          : "The railings that meet the standard for your window will appear here as soon as all your details are entered."
        : enCalcul
          ? t.gcCalcul
          : lecture.etat === "hors-bornes" || prix.statut === "pret"
            ? fr
              ? "Pas de modèle à proposer pour ces mesures."
              : "No model to offer for these measurements."
            : null // Serveur injoignable : le message est sous les mesures.
      : null;
  const liste: ModeleGC[] =
    !marque || sansModeleAChoisir
      ? []
      : // TOUS les modèles aux normes pour cette fenêtre, tous types confondus (croix, traverse, barreaux), rangés par prix — et
        // seulement eux (Quentin, 05/10 : « on ne comprend pas, il y a de tout », puis « pourquoi ça n'affiche qu'un seul modèle ? »).
        // Les réglages Barreaux et Traverse restent des raccourcis : ils choisissent le modèle le plus proche dans cette rangée.
        modeles.filter((m) => m.conforme).sort((a, b) => sens * (a.prix - b.prix) || sens * (a.croix - b.croix));
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
  const controlesFamille = marque && !forge ? (
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
      ]
        .map((ligne) => (
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
  /**
   * La preuve de la norme (étude marketing, 06/10) : combien de dessins l'outil a testés pour CETTE fenêtre, combien passent,
   * combien sont refusés — et un lien vers la page qui explique comment.
   */
  const mentionNormes = (n: number) => {
    const testes = modeles.length;
    const refuses = testes - n;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] font-medium text-[#2f7d46]">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden>
          <path d="M4.5 10.5l3.5 3.5 7.5-8" />
        </svg>
        <span>
          {fr
            ? `${testes} dessins testés pour votre fenêtre : ${n} aux normes${refuses > 0 ? `, ${refuses} refusés` : ""}`
            : `${testes} designs tested for your window: ${n} to standard${refuses > 0 ? `, ${refuses} refused` : ""}`}
        </span>
        <Link href={`/${locale}/artisanat/verification-garde-corps`} className="font-normal text-[#5c5140] underline underline-offset-2 hover:text-[#2b2320]">
          {fr ? "Comment ?" : "How?"}
        </Link>
      </span>
    );
  };
  /**
   * La rangée des modèles : des VISUELS, un par modèle AUX NORMES pour cette fenêtre, avec son prix et sa pastille verte, rangés par
   * prix (croissant ou décroissant) ; elle défile de côté s'il y en a plus que la place. Un clic choisit le modèle et son détail
   * s'écrit au-dessus.
   */
  // En grand aussi sur l'étape « Modèle » du téléphone : la rangée y a l'écran pour elle.
  const grandeRangee = Boolean(bandeauSlot || modeleSlot);
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
                  setPerdu(null);
                  setPourquoi(null);
                  onChange({ ...cotes, modele: m.id });
                  if (m.rosace && rosaceId && m.rosace !== rosaceId) onRosace?.(m.rosace);
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
        {/* Les prix se recalculent (une finition changée, une mesure retouchée) : les modèles d'avant restent pâles, et on
            dit que ça travaille. */}
        {modelesPerimes && (
          <div role="status" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-[#2b2320] shadow ring-1 ring-[#2b2320]/10">
              <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2b2320]/20 border-t-[#c98a3a] motion-reduce:animate-none" />
              {fr ? "Mise à jour des modèles…" : "Updating the models…"}
            </span>
          </div>
        )}
      </div>
    ) : attente ? (
      // À peu près la hauteur de la rangée de modèles : le croquis ne saute pas quand ils arrivent.
      <div className={`mt-1.5 flex items-center justify-center rounded-2xl border border-dashed border-[#2b2320]/15 bg-white/35 px-4 py-3 text-center ${grandeRangee ? "min-h-[112px]" : "min-h-[72px]"}`}>
        {/* Le calcul en cours : un garde-corps qui se trace (« on ne comprenait pas ce qui se passait », Quentin, 05/10). */}
        {enCalcul ? (
          <ChargementModeles
            locale={locale}
            texte={
              fr
                ? "Nous testons chaque dessin de garde-corps pour votre fenêtre : hauteur, vides, partie basse, solidité…"
                : "Testing every railing design for your window: height, gaps, lower part, strength…"
            }
          />
        ) : (
          <p className="max-w-[30rem] text-[12.5px] leading-snug text-[#5c5140]" aria-live="polite">{attente}</p>
        )}
      </div>
    ) : null;
  /** Le décor vient d'être remplacé parce qu'il ne passait pas la norme avec ces mesures : on le dit, dans le bandeau. */
  const motDecorPerdu = decorPerdu && forge
    ? fr ? "Le décor choisi ne passait pas la norme avec ces mesures : voici le moins cher qui la passe." : "The chosen design did not meet the standard with these sizes: here is the least expensive one that does."
    : null;
  /** Les prix des décors (avec les finitions choisies), tels que le serveur les donne ; null tant qu'ils ne sont pas là. */
  const prixDecors: PrixDecorsGC | null = (() => {
    const source = brute ?? (prix.statut === "calcul" ? prix.precedent : null);
    const liste = source && "decors" in source ? source.decors : undefined;
    if (!liste) return null;
    const o: PrixDecorsGC = {};
    for (const x of liste) {
      const a = (lireDecorGC(x.id)?.assemblage ?? x.id) as AssemblageDecorGC;
      o[a] = { prix: x.prix, conforme: x.conforme };
    }
    return o;
  })();
  const choixDecor = decorChoisi ? (
    <ChoixDecorGC
      choix={decorChoisi}
      onChoix={(c) => {
        setDecorPerdu(null);
        onChange({ ...cotes, decor: idDecorGC(c), modele: "" });
      }}
      prix={prixDecors}
      locale={locale}
      grand={grandeRangee}
      prixAffiche={prixAffiche}
    />
  ) : null;
  const catalogue = (
    /* Sous le croquis (téléphone, tablette), en bande FINE : les deux boutons (barreaux, traverse) et UNE rangée de modèles qui
       défile de côté, chacun avec son prix : uniquement des modèles aux normes. Sur grand écran : voir `bandeau`. */
    <div id="modeles-gc" className="carte-verre carte-modeles mt-2 scroll-mt-24 rounded-[20px] px-3 pb-2 pt-2.5 text-left">
      <div className={`controles-famille flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 ${marque ? "lg:hidden" : ""}`}>
        {marque && !forge ? controlesFamille : <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{forge ? (fr ? "Votre décor" : "Your design") : fr ? "Votre modèle" : "Your model"}</p>}
      </div>
      {phraseModeles && !decorChoisi && <p className={`mt-1 text-[11.5px] leading-snug ${modeles.length === 0 && texteManque ? "font-medium text-[#7a4510]" : "text-[#5c5140]"}`}>{phraseModeles}</p>}
      {marque && nbConformes > 0 && !decorChoisi && (
        <div className="titre-catalogue mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[13px] font-semibold leading-tight text-[#2b2320]">{!choisi ? (fr ? "Choisissez votre modèle" : "Choose your model") : fr ? "Votre modèle" : "Your model"}</p>
          {mentionNormes(nbConformes)}
        </div>
      )}
      {motDecorPerdu && <p className="mt-1 text-[11.5px] leading-snug text-[#7a4510]">{motDecorPerdu}</p>}
      {boutonPrix && !decorChoisi && <div className="mt-1.5 flex items-center justify-end">{boutonPrix}</div>}
      {decorChoisi ? choixDecor : rangee}
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
    <div id="modeles-gc" className={`carte-verre carte-modeles rounded-[22px] px-4 pb-2 pt-2 text-left ${marque && nbConformes > 0 && !choisi && !decorChoisi ? "ring-2 ring-[#c98a3a]/55" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Une consigne tant que rien n'est choisi : « Choisissez votre modèle » ; ensuite, le nom du bloc. */}
        <span className="shrink-0 text-[14px] font-semibold leading-tight text-[#2b2320]">
          {forge ? (fr ? "Votre décor" : "Your design") : marque && nbConformes > 0 && !choisi ? (fr ? "Choisissez votre modèle" : "Choose your model") : fr ? "Votre modèle" : "Your model"}
        </span>
        {marque && nbConformes > 0 && !decorChoisi && mentionNormes(nbConformes)}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {!decorChoisi && boutonPrix}
          {lienPhoto}
        </span>
      </div>
      {/* Le détail du modèle touché, survolé ou choisi — écrit en clair, sur sa propre ligne (deux au plus). */}
      <p
        className="mt-0 line-clamp-2 min-h-[1.1rem] text-[12px] leading-snug text-[#2b2320]"
        aria-live={survol ? "off" : "polite"}
        title={phraseBandeau || (modeleDetail ? descriptionModele(modeleDetail) : undefined)}
      >
        {motDecorPerdu ? (
          <span className="font-medium text-[#7a4510]">{motDecorPerdu}</span>
        ) : decorChoisi ? (
          /* Le décor choisi, nommé par l'outil (« Frise de volutes en S »), et son prix. */
          dessin?.ok && dessin.decor ? (
            <>
              <span className="font-semibold">{fr ? dessin.decor.nom : nomDecorAnglaisGC(decorChoisi)}</span>
              {conforme && <span className="text-[#6f6357]"> — {prixAffiche(conforme.prix, locale)}</span>}
              {dessin.decor.friseRetiree && <span className="text-[#6f6357]">{fr ? " · frise basse retirée : au ras du sol, elle ferait des marches" : " · lower frieze removed: near the floor it would make footholds"}</span>}
            </>
          ) : lecture.etat === "ok" ? (
            <span className="text-[#6f6357]">{fr ? "Nous dessinons et contrôlons votre décor…" : "Drawing and checking your design…"}</span>
          ) : (
            /* Les mesures ne sont pas toutes là : ce qui manque (le décor se dessine à vos cotes). */
            <span className="text-[#5c5140]">{phraseBandeau || (fr ? "Entrez vos mesures : chaque décor se dessine et se contrôle à vos cotes." : "Enter your measurements: each design is drawn and checked to your sizes.")}</span>
          )
        ) : phraseBandeau ? (
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
      {decorChoisi ? choixDecor : rangee}
    </div>
  );

  const set = (champ: keyof CotesGardeCorps) => (valeur: string) => {
    figerQuestion();
    onChange({ ...cotes, [champ]: valeur });
  };
  /** Le type de mur : le code de la fixation suit ; la pierre attend d'être précisée (sauf si elle l'était déjà). */
  const choisirMur = (option: string) => {
    const matiere = matiereMur(option, t.gcMurOptions);
    const pierreDonnee = (PIERRES_GC as readonly string[]).includes(cotes.murFixation ?? "");
    figerQuestion();
    onChange({ ...cotes, mur: option, murFixation: matiere === "pierre" ? (pierreDonnee ? cotes.murFixation : "") : matiere });
    // La pierre à préciser s'ouvre sous la liste : on l'amène sous les yeux (sur téléphone, elle était sous le bord de la carte).
    if (matiere === "pierre") window.setTimeout(() => document.getElementById(`${idChamps}-pierre`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };
  const estPierre = cotes.mur !== "" && matiereMur(cotes.mur, t.gcMurOptions) === "pierre";
  const murChoisi = murFixationDesCotes(cotes, t.gcMurOptions);
  const NOMS_PIERRES: Record<(typeof PIERRES_GC)[number], string> = fr
    ? { tuffeau: "Tuffeau", "pierre-dure": "Pierre dure", moellons: "Moellons" }
    : { tuffeau: "Tufa", "pierre-dure": "Hard stone", moellons: "Rubble stone" };
  const infoPierre = fr
    ? "Le tuffeau : la pierre blanche et tendre de la région. La pierre dure : un calcaire ou un granit qui ne se raye pas à l'ongle. Les moellons : des pierres irrégulières montées au mortier."
    : "Tufa: the soft white local stone. Hard stone: a limestone or granite you cannot scratch with a fingernail. Rubble stone: irregular stones laid in mortar.";
  const libelleTableau = fr ? "Profondeur du tableau" : "Reveal depth";
  const libelleEpaisseur = fr ? "Épaisseur du mur" : "Wall thickness";
  const infoEpaisseur = fr
    ? "De la façade jusqu'au mur intérieur, à côté de la fenêtre. Facultatif : sans elle, nous comptons 450 mm, l'épaisseur courante des murs en pierre."
    : "From the façade to the inside wall, beside the window. Optional: without it, we count 450 mm, the usual thickness of stone walls.";
  /** La photo du tableau (Quentin, 07/10 : « bouton photo sur le site ») : elle part à l'atelier avec le relevé, en clair. */
  const resumePhoto = [
    noteGardeCorps(cotes, t),
    `Mur : ${murChoisi ? NOMS_MUR_FIXATION_GC[murChoisi].fr : cotes.mur || "non précisé"}`,
    `Profondeur du tableau : ${saisieMur(cotes.tMur) || "non précisée"}`,
    murAvecEpaisseurGC(murChoisi) && cotes.eMur ? `Épaisseur du mur : ${saisieMur(cotes.eMur)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const photoTableau = (grand: boolean) => (
    <PhotoTableau
      locale={locale}
      resume={resumePhoto}
      codePostal={cotes.codePostal}
      envoyee={cotes.photoTableau === "envoyee"}
      onEnvoyee={() => onChange({ ...cotes, photoTableau: "envoyee" })}
      grand={grand}
    />
  );
  /** Les trois pierres, en pilules (ordinateur) ou en gros boutons (téléphone). */
  const choixPierre = (gros: boolean) =>
    estPierre && (
      <div id={`${idChamps}-pierre`} className={gros ? "mt-3" : "mt-2"}>
        <p className={`${gros ? "mb-2 text-[14px]" : "mb-1.5 text-[12.5px]"} font-medium text-[#2b2320]`}>{fr ? "Quelle pierre ?" : "Which stone?"}</p>
        <div className={gros ? "grid grid-cols-3 gap-2" : `grid grid-cols-3 rounded-full border bg-white p-0.5 ${murChoisi ? "border-[#9a8d80]" : "border-[#c98a3a]"}`}>
          {PIERRES_GC.map((pierre) =>
            gros ? (
              grosBouton(
                cotes.murFixation === pierre,
                () => {
                  figerQuestion();
                  onChange({ ...cotes, murFixation: pierre });
                  passerBientot(6);
                },
                NOMS_PIERRES[pierre],
                false,
              )
            ) : (
              <button
                key={pierre}
                type="button"
                aria-pressed={cotes.murFixation === pierre}
                onClick={() => onChange({ ...cotes, murFixation: pierre })}
                className={`whitespace-nowrap rounded-full px-1 py-1.5 text-[12px] font-medium transition-colors ${
                  cotes.murFixation === pierre ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"
                }`}
              >
                {NOMS_PIERRES[pierre]}
              </button>
            ),
          )}
        </div>
        {/* L'aide écrite sous les pierres, plus de bulle « i » (Quentin, 09/10/2026). */}
        <p className="mt-1.5 text-[11.5px] leading-snug text-[#5c5140]">{infoPierre}</p>
      </div>
    );

  /** Cliquer une cote sur le croquis amène le curseur dans sa case. */
  const allerA = (cote: CoteFenetre) => {
    // Téléphone, une question à la fois : la cote touchée ouvre sa question.
    if (question) {
      const n = cote === "largeur" ? 1 : cote === "largeurHaut" ? 2 : cote === "allege" ? 3 : cote === "fenetre" ? 4 : null;
      if (n) allerQuestion?.(n);
      return;
    }
    setCoteActive(cote);
    document.getElementById(`${idChamps}-${cote}`)?.focus();
  };

  /**
   * Une ligne de cote : le numéro, l'intitulé et son « i » à gauche, la
   * saisie en pilule à droite. L'aide n'est plus écrite sous le champ : elle
   * est dans la bulle.
   */
  /** Chaque case a sa cote sur le croquis (la largeur en haut, à 1 m du sol). */
  const coteCroquis = (cote: CoteSaisieGC): CoteFenetre | null => (cote === "tMur" || cote === "eMur" ? null : cote);
  /** Ce qui est tapé dans une case (les cases du mur sont facultatives dans les cotes). */
  const saisie = (cote: CoteSaisieGC) => cotes[cote] ?? "";
  /**
   * Murs pas parallèles (décisions de Quentin, 05/10 puis 10/10/2026) : sous la largeur du haut, l'écart, et ce que l'atelier en
   * fait — le garde-corps suit les murs, chaque traverse coupée à la largeur de son niveau. Plus de renvoi vers l'atelier.
   */
  const ecart = texteEcartGC(cotes, locale);
  const ecartMurs = ecart && (
    <p role="status" className="py-2 text-[12.5px] leading-snug text-[#5c5140]">
      {ecart}
    </p>
  );
  const ligne = (
    cote: CoteSaisieGC,
    props: { label: string; aide?: string; info: string; placeholder: string; facultatif?: boolean },
  ) => (
    <div className="py-2.5">
      <label htmlFor={`${idChamps}-${cote}`} className="flex items-center gap-2 text-[13.5px] leading-snug text-[#2b2320]">
        <IconeCote cote={cote} />
        <span className="min-w-0 flex-1">
          {props.label}
          {/* La mesure qui manque : la même étiquette que « à choisir » pour l'étage. */}
          {manque === cote && (
            <span className="ml-2 inline-block rounded-full bg-[#fbeeda] px-2 py-0.5 align-middle text-[11px] font-medium text-[#7a4510]">
              {saisie(cote).trim() !== "" ? (fr ? "à corriger" : "to correct") : fr ? "à remplir" : "to fill in"}
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
          step={1}
          value={Number.isFinite(mm(saisie(cote))) ? Math.min(CURSEURS[cote].max, Math.max(CURSEURS[cote].min, mm(saisie(cote)))) : CURSEURS[cote].depart}
          onChange={(e) => set(cote)(e.target.value)}
          // Un clic sur le curseur sans le déplacer : le client garde la valeur où il attend. Elle devient
          // sa mesure (avant, la case restait vide alors que le curseur avait l'air réglé).
          onPointerUp={(e) => {
            if (e.button === 0 && saisie(cote).trim() === "") set(cote)(e.currentTarget.value);
          }}
          onFocus={() => setCoteActive(coteCroquis(cote))}
          onBlur={() => setCoteActive(null)}
          className={`curseur-cote block h-5 min-w-0 flex-1 cursor-pointer ${saisie(cote).trim() === "" ? "curseur-vide" : ""}`}
        />
        <span
          className={`flex h-9 w-[6.75rem] shrink-0 items-center gap-1 rounded-full border border-[#9a8d80] bg-white px-3 transition-[border-color,box-shadow] focus-within:border-[#2b2320] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)] ${
            manque === cote ? "outline outline-2 outline-[#c98a3a]" : ""
          }`}
        >
          <input
            id={`${idChamps}-${cote}`}
            inputMode="decimal"
            value={saisie(cote)}
            onChange={(e) => set(cote)(e.target.value)}
            // « ex. 1180 », en italique : une valeur d'EXEMPLE, pas une mesure saisie. Une cote facultative le dit dans sa
            // case : écrit après l'intitulé, « · facultatif » le passait sur deux lignes et la colonne débordait (1280 × 720).
            placeholder={props.facultatif ? (fr ? "facultatif" : "optional") : `${fr ? "ex." : "e.g."} ${props.placeholder}`}
            onFocus={() => setCoteActive(coteCroquis(cote))}
            onBlur={() => setCoteActive(null)}
            className="w-full min-w-0 bg-transparent text-right text-base tabular-nums text-[#2b2320] placeholder:text-[13px] placeholder:italic placeholder:text-[#726757] outline-none focus-visible:shadow-none focus-visible:outline-none sm:text-[15px]"
          />
          <span className="text-xs text-[#6f6357]">mm</span>
        </span>
      </div>
    </div>
  );

  /**
   * TÉLÉPHONE, UNE QUESTION À LA FOIS (etapes-telephone.tsx) : la question elle-même est écrite en grand au-dessus de la
   * carte ; la carte ne porte que la réponse, en grand (la case, le curseur, ou de gros boutons), et l'explication.
   */
  /** Sous la case (ou les boutons) : ce qui manque, ou ce qu'il faut savoir — visible clavier ouvert. */
  /** Le message sous la question : celui de la fiche sur téléphone, le sien sur ordinateur. */
  const messageAffiche = question ? messageQuestion : messagePc && messagePc.question === questionAffichee ? messagePc.texte : null;
  /** Entrée, ou « OK » : la question suivante. */
  const avancer = () => (question ? suivante?.() : suivantePc());
  const messageTel = (
    <p id={`${idChamps}-message`} aria-live="polite" className="mt-2 text-center text-[13px] font-medium leading-snug text-[#7a4510] empty:hidden">
      {messageAffiche ?? ""}
    </p>
  );
  const grandeSaisie = (cote: CoteSaisieGC, props: { label: string; info: string; placeholder: string; sansInfo?: boolean }) => (
    <div className="pt-1">
      <label htmlFor={`${idChamps}-${cote}`} className="sr-only">
        {props.label}
      </label>
      <div className="mx-auto flex w-full max-w-[20rem] items-center gap-2">
      <span className="case-question flex h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#9a8d80] bg-white px-4 transition-[border-color,box-shadow] focus-within:border-[#2b2320] focus-within:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]">
        <input
          id={`${idChamps}-${cote}`}
          data-question-champ
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          aria-describedby={messageAffiche ? `${idChamps}-message` : undefined}
          aria-invalid={messageAffiche ? true : undefined}
          value={saisie(cote)}
          onChange={(e) => set(cote)(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              avancer();
            }
          }}
          placeholder={`${fr ? "ex." : "e.g."} ${props.placeholder}`}
          onFocus={() => setCoteActive(coteCroquis(cote))}
          onBlur={() => setCoteActive(null)}
          className="w-full min-w-0 bg-transparent text-right text-[26px] font-semibold tabular-nums text-[#2b2320] placeholder:text-[18px] placeholder:font-normal placeholder:italic placeholder:text-[#726757] outline-none focus-visible:shadow-none focus-visible:outline-none"
        />
        <span className="text-[15px] text-[#6f6357]">mm</span>
      </span>
      {/* Clavier ouvert, « Suivant » est caché dessous : « OK », à côté de la case, passe à la question suivante — sans
          quitter la case (le clavier reste ouvert pour la mesure suivante). Caché clavier fermé (globals.css). */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => avancer()}
        className="ok-clavier hidden h-14 shrink-0 items-center rounded-2xl bg-[#1d1d1f] px-4 text-[16px] font-semibold text-white"
      >
        OK
      </button>
      </div>
      {messageTel}
      {/* Sous la largeur du haut : l'écart, et le cadre qui suit les murs. */}
      {cote === "largeurHaut" && ecartMurs && <div className="text-center">{ecartMurs}</div>}
      <input
        type="range"
        aria-label={props.label}
        min={CURSEURS[cote].min}
        max={CURSEURS[cote].max}
        step={1}
        value={Number.isFinite(mm(saisie(cote))) ? Math.min(CURSEURS[cote].max, Math.max(CURSEURS[cote].min, mm(saisie(cote)))) : CURSEURS[cote].depart}
        onChange={(e) => set(cote)(e.target.value)}
        onPointerUp={(e) => {
          if (e.button === 0 && saisie(cote).trim() === "") set(cote)(e.currentTarget.value);
        }}
        onFocus={() => setCoteActive(coteCroquis(cote))}
        onBlur={() => setCoteActive(null)}
        className={`curseur-cote curseur-question mt-4 block h-6 w-full cursor-pointer ${saisie(cote).trim() === "" ? "curseur-vide" : ""}`}
      />
      {/* Murs de travers : le message de l'écart dit déjà l'essentiel (la place manquait sur ordinateur). */}
      {!(cote === "largeurHaut" && ecartMurs) && !props.sansInfo && <p className="info-question mt-3 text-[12.5px] leading-snug text-[#5c5140]">{props.info}</p>}
    </div>
  );
  /** Un gros bouton de réponse (étage, mur) : touché, il est choisi ; la fiche passe d'elle-même à la question suivante. */
  const grosBouton = (actifBouton: boolean, onClick: () => void, libelle: string, premier: boolean) => (
    <button
      key={libelle}
      type="button"
      data-question-champ={premier ? "" : undefined}
      aria-pressed={actifBouton}
      onClick={onClick}
      className={`border font-medium leading-tight transition-colors ${question ? "rounded-2xl px-3 py-3.5 text-[15px]" : "rounded-xl px-2.5 py-1.5 text-[13.5px]"} ${
        actifBouton ? "border-[#2b2320] bg-[#2b2320] text-white" : "border-[#d8cec2] bg-white text-[#2b2320] active:bg-[#f3eee8]"
      }`}
    >
      {libelle}
    </button>
  );
  // Courts : dans la colonne de l'ordinateur, chaque intitulé tient sur une ligne ; la bulle « i » dit où mesurer.
  const libelleLargeurBas = fr ? "Largeur en bas" : "Width at the bottom";
  const libelleLargeurHaut = fr ? "Largeur à 1 m du sol" : "Width 1 m from the floor";
  /** L'explication de chaque question : sous la réponse sur téléphone, dans la bulle « i » sur ordinateur. */
  const infoQuestion = (n: number): string =>
    n === 1
      ? t.gcLargeurInfo
      : n === 2
        ? fr
          ? "Dans les maisons anciennes, les murs ne sont pas toujours droits. Si la fenêtre vous paraît plus large en haut qu'en bas (ou l'inverse), répondez « Non » : nous vous demanderons une mesure de plus. Si vous ne savez pas, mesurez les deux : en bas au ras de l'appui, et à 1 m du sol. Le garde-corps suit vos murs."
          : "In older houses the walls are not always straight. If the window looks wider at the top than at the bottom (or the other way round), answer “No”: we will ask for one more measurement. If you do not know, measure both: at the bottom, at the sill, and 1 m from the floor. The railing follows your walls."
        : n === 3
          ? t.gcAllegeInfo
          : n === 4
            ? t.gcFenetreInfo
            : n === 5
              ? t.gcEtageInfo
              : n === 6
                ? t.gcMurInfo
                : fr
                  ? "Sans l'enduit, si vous le voyez. La fixation se fait dans cette épaisseur : nous la plaçons au mieux. Nous vous demanderons aussi une photo du tableau avec un mètre."
                  : "Without the render, if you can see it. The fixing goes into this depth: we place it for the best hold. We will also ask you for a photo of the reveal with a tape measure.";
  const contenuQuestion = (n: number) =>
    n === 1 ? (
      // L'en-tête dit OÙ mesurer (et le croquis le montre avec le mètre) ; sous la case, COMMENT.
      grandeSaisie("largeur", { label: libelleLargeurBas, info: t.gcLargeurInfo, placeholder: "1180" })
    ) : n === 2 ? (
      <div className="pt-1">
        {/* Sur ordinateur, côte à côte : la colonne garde sa place pour la mesure de plus. */}
        <div className={`grid gap-2 ${question ? "" : "grid-cols-2"}`}>
          {grosBouton(
            !cotes.mursInegaux,
            () => {
              figerQuestion();
              onChange({ ...cotes, mursInegaux: false });
            },
            fr ? "Oui, ils sont droits" : "Yes, they are straight",
            true,
          )}
          {grosBouton(
            Boolean(cotes.mursInegaux),
            () => {
              figerQuestion();
              onChange({ ...cotes, mursInegaux: true });
            },
            fr ? "Non, la fenêtre change de largeur" : "No, the window changes width",
            false,
          )}
        </div>
        {cotes.mursInegaux && (
          <div className="mt-3">
            {grandeSaisie("largeurHaut", {
              label: libelleLargeurHaut,
              info: fr
                ? "Mesurez 1 m depuis le sol, faites un trait au crayon, puis la largeur à cette hauteur. Cote brute : ne retirez rien."
                : "Measure 1 m up from the floor, make a pencil mark, then the width at that height. Raw size: deduct nothing.",
              placeholder: "1180",
            })}
          </div>
        )}
        {/* Murs de travers : la case de la largeur du haut (grandeSaisie) écrit déjà le message — une seule fois, un seul id. */}
        {!cotes.mursInegaux && messageTel}
        {!cotes.mursInegaux && <p className="info-question mt-3 text-[12.5px] leading-snug text-[#5c5140]">{infoQuestion(2)}</p>}
      </div>
    ) : n === 3 ? (
      grandeSaisie("allege", { label: t.gcAllegeCourt, info: t.gcAllegeInfo, placeholder: String(CURSEURS.allege.depart) })
    ) : n === 4 ? (
      grandeSaisie("fenetre", { label: t.gcFenetreCourt, info: t.gcFenetreInfo, placeholder: "1200" })
    ) : n === 5 ? (
      <div className="pt-1">
        <div className="grid gap-2">
          {t.gcEtageOptions.map((option, i) =>
            grosBouton(
              cotes.etage === option,
              () => {
                set("etage")(option);
                passerBientot(5);
              },
              option,
              i === 0,
            ),
          )}
        </div>
        {messageTel}
        <p className="info-question mt-3 text-[12.5px] leading-snug text-[#5c5140]">{t.gcEtageInfo}</p>
      </div>
    ) : n === 6 ? (
      <div id="mur-gc" className="scroll-mt-28 pt-1">
        {/* Sur ordinateur, la pierre choisie : la liste se replie sur elle, pour laisser la place aux trois pierres. */}
        {!question && estPierre ? (
          <div className="flex items-center gap-3">
            {grosBouton(true, () => undefined, cotes.mur, true)}
            <button type="button" onClick={() => choisirMur("")} className="text-[12.5px] font-medium text-[#5c5140] underline underline-offset-4">
              {fr ? "Changer de mur" : "Change wall"}
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2">
          {t.gcMurOptions.map((option, i) =>
            grosBouton(
              cotes.mur === option,
              () => {
                choisirMur(option);
                if (matiereMur(option, t.gcMurOptions) !== "pierre") passerBientot(6);
              },
              option,
              i === 0,
            ),
          )}
        </div>
        )}
        {choixPierre(true)}
        {messageTel}
        {/* La pierre choisie : son aide remplace celle du mur. */}
        {!estPierre && (
          <p className="info-question mt-3 text-[12.5px] leading-snug text-[#5c5140]">
            {/* Sur ordinateur, la phrase courte : la colonne n'a pas la place de la longue sous les huit murs. */}
            {question
              ? t.gcMurInfo
              : fr
                ? "Il décide de la fixation, calculée pour votre mur. En cas de doute, choisissez « Je ne sais pas » : le prix sera indicatif."
                : "It decides the fixing, worked out for your wall. If unsure, choose “I don't know”: the price will be indicative."}
          </p>
        )}
      </div>
    ) : n === 7 ? (
      <div>
        {/* L'en-tête dit déjà où mesurer, et le grand dessin le montre (vue de dessus) : sous la case, le reste. */}
        {/* Sur ordinateur, avec l'épaisseur du mur en plus (pierre dure, moellons), l'explication cède la place. */}
        {grandeSaisie("tMur", { label: libelleTableau, info: infoQuestion(7), placeholder: "150", sansInfo: !question && murAvecEpaisseurGC(murChoisi) })}
        {murAvecEpaisseurGC(murChoisi) && ligne("eMur", { label: libelleEpaisseur, info: infoEpaisseur, placeholder: "450", facultatif: true })}
        <div className="mt-3 flex justify-center">{photoTableau(true)}</div>
      </div>
    ) : null;
  const questionTelephone = question ? contenuQuestion(question) : null;

  /** Une cote tapée, écrite comme le site écrit ses nombres (« 1 000 mm »), ou rien. */
  const enMmAffiche = (valeur?: string) => {
    const n = mm(valeur ?? "");
    return Number.isFinite(n) ? `${n.toLocaleString(fr ? "fr-FR" : "en-GB")} mm` : "";
  };
  /** Sur ordinateur et tablette : la question en cours, dans la colonne, avec « Retour » et « Suivant ». */
  const questionOrdinateur = (n: number) => {
    const etape = ETAPES_GC[n - 1];
    const vide = n === 4 && cotes.fenetre.trim() === "";
    const pale = Boolean(etatQuestionGC(cotes, n, t, locale).manque);
    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-[11px] font-semibold text-[#6f6357]">{fr ? `Question ${n} sur ${QUESTIONS_GC}` : `Question ${n} of ${QUESTIONS_GC}`}</span>
          <span className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: QUESTIONS_GC }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < n ? "bg-[#2b2320]" : "bg-[#2b2320]/15"}`} />
            ))}
          </span>
        </div>
        {/* L'explication est écrite sous la réponse, comme sur téléphone : plus de bulle « i » à ouvrir (Quentin, 09/10/2026). */}
        <h3 className="mt-2 text-[16px] font-semibold leading-tight text-[#1d1d1f]">{fr ? etape.questionFr : etape.questionEn}</h3>
        <p className="aide-question mt-0.5 text-[12.5px] leading-snug text-[#5c5140]">{fr ? etape.aideFr : etape.aideEn}</p>
        <div className="mt-2">{contenuQuestion(n)}</div>
        <div className="mt-3 flex items-center gap-2">
          {n > 1 && (
            <button type="button" onClick={() => allerPc(n - 1)} className="rounded-full bg-white/70 px-3.5 py-2.5 text-[13.5px] font-medium text-[#2b2320] ring-1 ring-[#2b2320]/15">
              {fr ? "← Retour" : "← Back"}
            </button>
          )}
          <button
            type="button"
            onClick={suivantePc}
            className={`flex-1 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white transition-colors ${pale ? "bg-[#1d1d1f]/45" : "bg-[#1d1d1f]"}`}
          >
            {n === QUESTIONS_GC ? (fr ? "Terminer →" : "Finish →") : vide ? (fr ? "Passer →" : "Skip →") : fr ? "Suivant →" : "Next →"}
          </button>
        </div>
      </div>
    );
  };
  /** Toutes les réponses données : leur résumé, une ligne chacune ; toucher une ligne rouvre sa question. */
  const nomMur = murChoisi ? NOMS_MUR_FIXATION_GC[murChoisi][fr ? "fr" : "en"] : cotes.mur;
  const lignesResume: { n: number; label: string; valeur: string }[] = [
    { n: 1, label: fr ? "Largeur au ras de l'appui" : "Width at the sill", valeur: enMmAffiche(cotes.largeur) },
    {
      n: 2,
      label: fr ? "Vos murs" : "Your walls",
      valeur: cotes.mursInegaux ? `${fr ? "pas droits" : "not straight"} · ${enMmAffiche(cotes.largeurHaut)}` : fr ? "droits" : "straight",
    },
    { n: 3, label: t.gcAllegeCourt, valeur: enMmAffiche(cotes.allege) },
    { n: 4, label: t.gcFenetreCourt, valeur: enMmAffiche(cotes.fenetre) || (fr ? "non donnée" : "not given") },
    { n: 5, label: t.gcEtage, valeur: fr && cotes.etage === "Au rez-de-chaussée" ? "Rez-de-chaussée" : cotes.etage },
    { n: 6, label: t.gcMur, valeur: nomMur ? nomMur.charAt(0).toUpperCase() + nomMur.slice(1) : "" },
    {
      n: 7,
      label: libelleTableau,
      valeur: [enMmAffiche(cotes.tMur), murAvecEpaisseurGC(murChoisi) && cotes.eMur ? `${fr ? "mur" : "wall"} ${enMmAffiche(cotes.eMur)}` : ""].filter(Boolean).join(" · "),
    },
  ];
  const resumeMesures = (
    <div className="mt-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">{fr ? "Vos mesures" : "Your measurements"}</p>
        <span className="text-[11.5px] text-[#6f6357]">{fr ? "Touchez une ligne pour la changer" : "Tap a line to change it"}</span>
      </div>
      <ul className="mt-1.5 divide-y divide-[#e5ddd3]">
        {lignesResume.map((l) => (
          <li key={l.n}>
            <button
              type="button"
              onClick={() => allerPc(l.n)}
              className="flex w-full items-baseline justify-between gap-3 py-2 text-left text-[13px] transition-colors hover:text-[#1d1d1f]"
            >
              <span className="min-w-0 text-[#5c5140]">{l.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-[#2b2320]">{l.valeur}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2">{photoTableau(false)}</div>
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

      {/* 1. Qui mesure ? C'est la première question, elle décide de la suite (sur téléphone, en tête de la première question). */}
      {(!question || question === 1) && (
      <div className={question ? "qui-mesure-question mt-3" : "mt-3"}>
        <QuiMesure
          valeur={cotes.qui}
          onChange={(qui) => onChange({ ...cotes, qui })}
          t={t}
          notes={{ moi: t.gcQuiMoiNote, atelier: t.gcQuiAtelierNote }}
          compact={Boolean(bandeauSlot || resultatSlot)}
        />
      </div>
      )}

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
          // Question 7 (la profondeur du tableau) : le grand dessin passe en vue de dessus, la seule qui montre cette mesure.
          const vueTableau = (question ?? (questionAffichee === "resume" ? 0 : questionAffichee)) === 7;
          const croquis = vueTableau ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f4efe7] p-3">
              <DessinTableau fr={fr} />
            </div>
          ) : (
            <SchemaFenetre
              className="absolute inset-0 h-full w-full"
              // Les deux largeurs, chacune sur sa barre : en bas au ras de l'appui, en haut sur la main courante.
              largeurMm={Number.isFinite(mm(cotes.largeur)) && mm(cotes.largeur) > 0 ? mm(cotes.largeur) : undefined}
              largeurHautMm={cotes.mursInegaux && Number.isFinite(mm(cotes.largeurHaut)) && mm(cotes.largeurHaut) > 0 ? mm(cotes.largeurHaut) : undefined}
              sansLargeurHaut={!cotes.mursInegaux}
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
              remplissage={surVerre ? "verre" : decorChoisi ? "decor" : "croix"}
              decor={decorChoisi && dessin?.ok && dessin.decor ? dessin.decor : null}
              actif={question ? coteQuestion : (coteActive ?? coteQuestionPc)}
              onChoisir={allerA}
              locale={locale}
              labels={{
                largeur: fr ? "Largeur en bas, au ras de l'appui" : "Width at the bottom, at the sill",
                largeurHaut: fr ? "Largeur à 1 m du sol" : "Width 1 m from the floor",
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
                    {!bandeauSlot && !telephone && !modeleSlot && <div className="mx-auto w-0 min-w-full md:mx-0 md:w-auto md:min-w-0 md:flex-1">{catalogue}</div>}
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
          {question ? (
            questionTelephone
          ) : (
            <>
              <p className="consigne-cotes mt-2.5 text-xs leading-snug text-[#6f6357]">{t.gcConsigne}</p>
              {questionAffichee === "resume" ? resumeMesures : questionOrdinateur(questionAffichee)}
            </>
          )}

          {/* Sur téléphone, la rangée des modèles a son étape à elle (« Modèle », product-view.tsx), comme le bandeau sous le
              croquis sur ordinateur ; sans parcours en étapes, elle reste dans la carte, sous le mur (sous le croquis, elle le
              poussait hors de l'écran). */}
          {/* (`modeleSlot` : le parcours en questions, aussi sur un téléphone tourné, plus large que 48 rem.) */}
          {(telephone || modeleSlot) && schemaSlot && !bandeauSlot && (
            modeleSlot ? createPortal(catalogue, modeleSlot) : <div className="mt-3">{catalogue}</div>
          )}

          {/* Le résultat : le prix, la norme, le modèle choisi. À côté de la carte, sous le catalogue
              (la carte, à gauche, ne porte plus que les cotes et la livraison : elle était trop longue
              et la colonne de droite restait vide) ; sur téléphone, il reste ici. */}
          {(() => {
            const resultat = (
              <>
          {/* Grand écran : les boutons barreaux et traverse sont ici, à côté du prix ; la rangée des modèles est sur le croquis. */}
          {controlesFamille && (
            <div className="raccourcis-modele hidden lg:block">
              {/* Les réglages Barreaux et Traverse : des raccourcis (la rangée des modèles a tous les dessins). Sur un écran
                  peu haut, ils cèdent la place au résultat (globals.css, .raccourcis-modele). */}
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
                      ? reponse.fixation?.statut === "etude"
                        ? reponse.fixation.texte
                        : t.gcAEtudierFixation
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
                  {/* La fixation dans le mur : adaptée (et fournie), ou prix indicatif tant que le mur n'est pas confirmé. */}
                  {reponse?.ok && reponse.fixation && (
                    <p className={`mt-0.5 text-[11.5px] leading-snug ${reponse.fixation.statut === "indicatif" ? "font-medium text-[#7a4510]" : "text-[#5c5140]"}`}>
                      {reponse.fixation.texte}
                    </p>
                  )}
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
                  ? <div className="mt-3 border-t border-[#e5ddd3] pt-1">{resultat}</div>
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
  largeurHaut: { min: BORNES_RELEVE_GC.largeurMm.min, max: BORNES_RELEVE_GC.largeurMm.max, depart: 1180 },
  // 585 : le bas de fenêtre du garde-corps de la photo (350 mm de haut, main courante à 1 025 mm du sol).
  allege: { min: 0, max: BORNES_RELEVE_GC.allegeMm.max, depart: 585 },
  fenetre: { min: 0, max: BORNES_RELEVE_GC.fenetreMm.max, depart: 1200 },
  // Le tableau : le curseur s'arrête à 500 mm (au-delà, rare, la case se tape) ; l'épaisseur, celle des murs anciens.
  tMur: { min: BORNES_MUR_GC.tMurMm.min, max: 500, depart: 150 },
  eMur: { min: BORNES_MUR_GC.eMurMm.min, max: BORNES_MUR_GC.eMurMm.max, depart: 450 },
} as const;

/**
 * Le petit dessin d'un modèle, À L'ÉCHELLE de la fenêtre du client : le cadre,
 * ses croix à rosace, les barreaux du bas. Tous les dessins du catalogue ont
 * le même cadre de vue (largeur de la fenêtre × hauteur du plus haut modèle) :
 * un garde-corps deux fois plus haut est dessiné deux fois plus haut. Aussi sur la page « Comment on vérifie votre
 * garde-corps », avec le rond rouge des dessins refusés.
 */
export function MiniGardeCorps({ largeurMm, hauteurMm, hMaxMm, soubassementMm, croix, traverse = false, seuls = false, sansRosace = false, trous = null, hauteurPx = 26 }: { largeurMm: number; hauteurMm: number; hMaxMm: number; soubassementMm: number; croix: number; seuls?: boolean; traverse?: boolean; sansRosace?: boolean; trous?: TrousGC | null; hauteurPx?: number }) {
  const L = largeurMm, H = Math.max(hMaxMm, hauteurMm);
  const y0 = H - hauteurMm, haut = y0 + 40, bas = H;
  const lisse = soubassementMm > 0 ? bas - soubassementMm : bas;
  // La fixation par platines au bout des lisses (10/10/2026) : le cadre est en retrait de 90 mm dans chaque tableau (ce que
  // disent les ronds de l'outil quand ils sont là), les lisses filent d'un tableau à l'autre.
  const rec = trous ? Math.max(0, (L - trous.cadreMm.l) / 2) : Math.min(RECUL_FIXATION_GC_MM, L / 5);
  const Lc = L - 2 * rec;
  const pas = Lc / croix;
  const nb = Math.max(2, Math.round(Lc / 110));
  const trait = { vectorEffect: "non-scaling-stroke" as const };
  // Les ronds de l'outil sont en mm depuis le coin bas-gauche du CADRE : on les pose dans le cadre de ce dessin.
  const sx = trous ? Lc / trous.cadreMm.l : 1, sy = trous ? (bas - haut) / trous.cadreMm.h : 1;
  return (
    <svg viewBox={`${-L * 0.02} ${-H * 0.03} ${L * 1.04} ${H * 1.06}`} preserveAspectRatio="xMidYMax meet" aria-hidden className="block w-full" style={{ height: `var(--mini-gc, ${hauteurPx}px)` }} fill="none" stroke="#2b2320" strokeWidth="1.5" strokeLinecap="round">
      <rect x={-L * 0.01} y={y0} width={L * 1.02} height="40" fill="#c9a36b" stroke="none" />
      <rect x={rec} y={haut} width={Lc} height={bas - haut} {...trait} />
      {/* Les lisses haute et basse jusqu'aux tableaux, où leurs platines sont fixées. */}
      {rec > 0 && <line x1="0" y1={haut} x2={L} y2={haut} {...trait} />}
      {rec > 0 && <line x1="0" y1={bas} x2={L} y2={bas} {...trait} />}
      {soubassementMm > 0 && <line x1={rec} y1={lisse} x2={rec + Lc} y2={lisse} {...trait} />}
      {/* La traverse au milieu des croix : un trait horizontal, d'un montant à l'autre. */}
      {traverse && !seuls && <line x1={rec} y1={(haut + lisse) / 2} x2={rec + Lc} y2={(haut + lisse) / 2} strokeWidth="1" {...trait} />}
      {seuls &&
        Array.from({ length: nb - 1 }, (_, i) => {
          const x = rec + ((i + 1) * Lc) / nb;
          return <line key={`s${i}`} x1={x} y1={haut} x2={x} y2={bas} strokeWidth="0.9" {...trait} />;
        })}
      {!seuls && Array.from({ length: croix }, (_, i) => {
        const x0 = rec + i * pas, x1 = x0 + pas;
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
          const x = rec + ((i + 1) * Lc) / nb;
          return <line key={`b${i}`} x1={x} y1={lisse} x2={x} y2={bas} strokeWidth="0.9" {...trait} />;
        })}
      {/* Le rond rouge : le vide trop grand. Les ronds verts : les vides qui respectent la norme. */}
      {trous?.ronds.map((r, i) => (
        <ellipse
          key={`r${i}`}
          cx={rec + r.x * sx}
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
