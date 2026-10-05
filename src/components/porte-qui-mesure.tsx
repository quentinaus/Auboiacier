"use client";

import { createContext, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { serif } from "@/lib/fonts";
import { SceneAplat, useScenesAplat } from "./motion-aplat";
import { PRIX_OFFRE_CENTS } from "@/lib/deplacement";
import { prixAffiche } from "@/lib/ui";

export type QuiPrendLesCotes = "moi" | "atelier";

/**
 * Le retour à l'écran de choix, depuis le configurateur. `QuiMesure` (prise-de-cotes.tsx) le lit : quand
 * il est fourni, la pilule « L'atelier mesure / Je mesure » laisse la place au choix fait et à « Changer ».
 */
export const RevenirAuChoix = createContext<(() => void) | null>(null);

/**
 * « choix » : les deux cartes. « ouverture » : la carte choisie s'agrandit jusqu'à remplir le bloc.
 * « revele » : elle s'efface sur le configurateur. « retour » : le chemin inverse, depuis « Changer ».
 */
type Phase = "choix" | "ouverture" | "revele" | "retour";

type Rect = { top: number; left: number; width: number; height: number };

const px = (r: Rect) => ({ top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
const moinsDeMouvement = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** La même courbe partout : un départ franc, une arrivée qui se pose. */
const COURBE = "cubic-bezier(0.7, 0, 0.2, 1)";

/** La place d'une carte dans l'écran de choix (le voile est positionné dans ce repère). */
function placeDe(carte: Element, racine: Element): Rect {
  const r = carte.getBoundingClientRect();
  const p = racine.getBoundingClientRect();
  return { top: r.top - p.top, left: r.left - p.left, width: r.width, height: r.height };
}

/**
 * Avant le configurateur du garde-corps, une seule question, sur tout le bloc : qui prend les cotes ?
 * Deux grandes cartes, chacune avec sa scène animée en aplats (le motion design choisi par Quentin le
 * 05/10/2026, après avoir refusé un dessin, des photos puis une frise d'icônes). Celle qu'on touche s'agrandit
 * jusqu'à remplir le bloc, puis s'efface sur le configurateur, déjà réglé sur ce choix.
 *
 * Posé par portail sur la plaque « Configuration » (product-view.tsx, porteSlot). Tant qu'il est là, la
 * plaque cache ce qu'il recouvre (globals.css, .porte-qui).
 */
export function PorteQuiMesure({
  locale,
  titre,
  notes,
  depuis,
  onChoisir,
  onFin,
}: {
  locale: "fr" | "en";
  /** « Configuration » : le même titre, à la même place, que celui du configurateur. */
  titre: string;
  /** Ce qu'implique « je mesure », et son étiquette (les mots du dictionnaire). */
  notes: { moi: string; tagMoi: string };
  /** Le mode d'où l'on revient (« Changer ») : sa carte se reforme à partir du bloc entier. */
  depuis?: QuiPrendLesCotes;
  onChoisir: (qui: QuiPrendLesCotes) => void;
  /** L'écran de choix a fini de s'effacer : on peut l'enlever. */
  onFin: () => void;
}) {
  const fr = locale === "fr";
  const racine = useRef<HTMLDivElement>(null);
  const voile = useRef<HTMLDivElement>(null);
  // Ce composant n'existe que dans le navigateur (portail posé après le montage) : on peut lire la préférence ici.
  const [phase, setPhase] = useState<Phase>(() => (depuis && !moinsDeMouvement() ? "retour" : "choix"));
  /** La carte qui s'ouvre (ou qui se reforme) : c'est sa photo que porte le voile. */
  const [choisi, setChoisi] = useState<QuiPrendLesCotes | null>(depuis ?? null);
  /** L'écran est entré dans la fenêtre : les cartes montent, la cote se trace. */
  const [vu, setVu] = useState(false);
  /** D'où part le voile quand une carte s'ouvre. */
  const depart = useRef<Rect | null>(null);
  /** Au retour : le voile, plein, doit se replier sur sa carte dès que les cartes sont posées. */
  const repli = useRef(false);
  const fin = useEffectEvent(onFin);
  const scenes = useScenesAplat();

  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setVu(true);
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function choisir(qui: QuiPrendLesCotes, carte: HTMLElement) {
    if (phase !== "choix" || !racine.current) return;
    onChoisir(qui);
    if (moinsDeMouvement()) {
      onFin();
      return;
    }
    depart.current = placeDe(carte, racine.current);
    setChoisi(qui);
    setPhase("ouverture");
  }

  /* La carte s'ouvre : le voile part de sa place exacte et gagne tout le bloc. Avant l'affichage
     (useLayoutEffect) : on ne voit jamais le voile plein avant son départ. */
  useLayoutEffect(() => {
    const v = voile.current;
    if (phase !== "ouverture" || !v || !depart.current) return;
    const a = v.animate(
      [
        { ...px(depart.current), borderRadius: "24px" },
        { top: "0px", left: "0px", width: "100%", height: "100%", borderRadius: "32px" },
      ],
      { duration: 720, easing: COURBE },
    );
    a.onfinish = () => setPhase("revele");
    return () => a.cancel();
  }, [phase]);

  /* Le voile s'efface sur le configurateur, dont les panneaux montent l'un après l'autre. */
  useEffect(() => {
    const v = voile.current;
    const plaque = racine.current?.closest(".fond-configuration");
    if (phase !== "revele" || !v || !plaque) return;
    // Sur téléphone, le bloc s'allonge d'un coup : on garde son haut à l'écran.
    const section = plaque.closest("section");
    if (section && section.getBoundingClientRect().top < -4) section.scrollIntoView({ behavior: "smooth", block: "start" });
    // Les montées vont au bout même si l'écran de choix disparaît avant elles : elles appartiennent aux panneaux.
    [...plaque.children]
      .filter((e) => !e.classList.contains("porte-slot"))
      .forEach((e, i) =>
        e.animate([{ opacity: 0, transform: "translateY(18px) scale(0.985)" }, { opacity: 1, transform: "none" }], {
          duration: 760,
          delay: 140 + i * 70,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fill: "backwards",
        }),
      );
    const a = v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, delay: 60, easing: "ease-out", fill: "forwards" });
    a.onfinish = () => {
      // Au clavier, on reste dans le bloc : sur « Changer », juste en haut du configurateur.
      if (racine.current?.contains(document.activeElement)) {
        plaque.querySelector<HTMLElement>("[data-revenir-choix]")?.focus({ preventScroll: true });
      }
      fin();
    };
    return () => a.cancel();
  }, [phase]);

  /* Retour depuis « Changer » : le voile de la photo couvre le configurateur… */
  useLayoutEffect(() => {
    const v = voile.current;
    if (phase !== "retour" || !v) return;
    const a = v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
    a.onfinish = () => {
      repli.current = true;
      setPhase("choix");
    };
    return () => a.cancel();
  }, [phase]);

  /* …puis se replie sur sa carte, qui reprend sa place parmi les deux. */
  useLayoutEffect(() => {
    const v = voile.current;
    const el = racine.current;
    if (phase !== "choix" || !repli.current || !v || !el || !choisi) return;
    repli.current = false;
    const section = el.closest("section");
    if (section && section.getBoundingClientRect().top < -4) section.scrollIntoView({ behavior: "smooth", block: "start" });
    const carte = el.querySelector<HTMLElement>(`[data-carte="${choisi}"]`);
    if (!carte) return;
    const arrivee = placeDe(carte, el);
    const a = v.animate(
      [
        { top: "0px", left: "0px", width: `${el.clientWidth}px`, height: `${el.clientHeight}px`, borderRadius: "32px", opacity: 1 },
        { ...px(arrivee), borderRadius: "24px", opacity: 1, offset: 0.82 },
        { ...px(arrivee), borderRadius: "24px", opacity: 0 },
      ],
      { duration: 760, easing: COURBE },
    );
    a.onfinish = () => {
      setChoisi(null);
      carte.focus({ preventScroll: true });
    };
  }, [phase, choisi]);

  const cartes = [
    {
      id: "atelier" as const,
      // Le film du parcours (prise de cotes, prix, fabrication, pose), le même que dans le mode atelier : Quentin
      // l'a voulu ici, et que la carte dise que l'atelier s'occupe de tout, pose comprise (05/10/2026).
      scene: "SVG_FILM" as const,
      classeScene: "aplat-film porte-scene-film",
      etiquette: fr ? "Sans rien mesurer" : "Nothing to measure",
      titre: fr ? "L'atelier mesure et s'occupe de\u00a0tout" : "The workshop measures and handles everything",
      note: fr
        ? `Nous prenons les cotes chez vous, puis nous fabriquons et posons votre garde-corps. Visite à partir de\u00a0${prixAffiche(PRIX_OFFRE_CENTS / 100, locale)}.`
        : `We take the measurements at your home, then make and fit your railing. Visit from\u00a0${prixAffiche(PRIX_OFFRE_CENTS / 100, locale)}.`,
      action: fr ? "Prendre rendez-vous" : "Book a visit",
    },
    {
      id: "moi" as const,
      scene: "SVG_JE_MESURE" as const,
      classeScene: "aplat-scB",
      etiquette: notes.tagMoi,
      // Trait d'union insécable : « moi-même » ne se coupe pas en fin de ligne.
      titre: fr ? "Je mesure moi\u2011même" : "I measure myself",
      note: fr ? "Deux mesures au mètre, guidées pas à pas. Le prix s'affiche aussitôt, sans frais." : "Two tape measurements, guided step by step. The price shows straight away, free of charge.",
      action: fr ? "Saisir mes mesures" : "Enter my measurements",
    },
  ];

  return (
    <div ref={racine} className="porte-qui" data-etat={phase} data-vu={vu ? "" : undefined} data-retour={depuis ? "" : undefined}>
      <div className="porte-contenu flex min-h-0 flex-1 flex-col">
        <h2 className={`${serif.className} text-lg leading-none text-[#2b2320] md:text-[28px]`}>{titre}</h2>
        <div className="porte-entete mt-2 text-center md:mt-1">
          <p className={`${serif.className} text-[24px] leading-tight text-[#2b2320] md:text-[clamp(28px,2.6vw,38px)]`}>
            {fr ? "Qui prend les mesures ?" : "Who takes the measurements?"}
          </p>
          <p className="mt-1 hidden text-[13px] text-[#5c5148] sm:block md:text-[14px]">
            {fr ? "Choisissez comment commencer. Vous pourrez changer d'avis à tout moment." : "Choose how to start. You can change your mind at any time."}
          </p>
        </div>
        {/* Les deux cartes de la maquette en aplats (docs/motion-aplat), validées par Quentin : la scène animée en
            haut, dans ses proportions, le texte dessous. Les cartes ne prennent que leur hauteur et se centrent dans le
            bloc ; si la hauteur manque (téléphone bas), c'est la scène qui se resserre, jamais le texte. */}
        <div className="mx-auto mt-3 flex min-h-0 w-full max-w-[1120px] flex-1 flex-col justify-center gap-3 md:mt-5 md:grid md:grid-cols-2 md:content-center md:items-stretch md:gap-5">
          {cartes.map((c) => (
            <button
              key={c.id}
              type="button"
              data-carte={c.id}
              onClick={(e) => choisir(c.id, e.currentTarget)}
              className="porte-carte aplat-card flex min-h-0 flex-col text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#2b2320]"
            >
              <SceneAplat scenes={scenes} svg={c.scene} className={`aplat-card-scene ${c.classeScene} porte-scene`} />
              <span className="aplat-card-body porte-texte shrink-0">
                <span className="aplat-tag">{c.etiquette}</span>
                <span className="aplat-card-title block">{c.titre}</span>
                <span className="aplat-card-text block">{c.note}</span>
                <span className="aplat-btn porte-action">
                  {c.action}
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-2 h-4 w-4">
                    <path d="M4 10h11M11 5.5 15.5 10 11 14.5" />
                  </svg>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Le voile : le papier de la carte choisie, qui s'agrandit jusqu'à couvrir le bloc (ou s'y replie). */}
      <div ref={voile} className="porte-voile" aria-hidden />
    </div>
  );
}
