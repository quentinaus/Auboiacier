"use client";

import { createContext, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { serif } from "@/lib/fonts";
import { FilmAplat } from "./motion-aplat";
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
  entete,
  notes,
  depuis,
  onChoisir,
  onFin,
}: {
  locale: "fr" | "en";
  /** « Configuration » : le même titre, à la même place, que celui du configurateur. */
  titre: string;
  /** Le garde-corps (09/10/2026) : le haut de la fiche (nom, prix, normes, photos) à la place du titre. */
  entete?: ReactNode;
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
      film: "atelier" as const,
      classeScene: "aplat-film porte-scene-film",
      etiquette: fr ? "Sans rien mesurer" : "Nothing to measure",
      titre: fr ? "L'atelier mesure et s'occupe de\u00a0tout" : "The workshop measures and handles everything",
      note: fr
        ? `Nous prenons les cotes chez vous, puis nous fabriquons et posons votre garde-corps. Visite à partir de\u00a0${prixAffiche(PRIX_OFFRE_CENTS / 100, locale)}.`
        : `We take the measurements at your home, then make and fit your railing. Visit from\u00a0${prixAffiche(PRIX_OFFRE_CENTS / 100, locale)}.`,
      action: fr ? "Prendre rendez-vous" : "Book a visit",
      // La facilité de pose, en regard de l'autre carte (Quentin, 06/10/2026) : ici, l'atelier pose, il n'y a rien à faire.
      facilite: {
        niveau: 10,
        titre: fr ? "Pose par l'atelier" : "Fitted by the workshop",
        detail: fr ? "rien à faire." : "nothing to do.",
      },
      // Les étapes du film, en étiquette sur l'image (« que le client comprenne ce qui se passe », Quentin, 05/10/2026) :
      // chacune s'affiche pendant son étape (classes .aplat-etC0… de motion-aplat.genere.ts, calées sur le film).
      etiquettes: {
        classe: "aplat-etC",
        textes: fr
          ? ["Nous venons mesurer", "Vous recevez le prix exact", "Fabrication à Saumur", "Pose par l'atelier"]
          : ["We come and measure", "You receive the exact price", "Made in Saumur", "Fitted by the workshop"],
      },
    },
    {
      id: "moi" as const,
      film: "je-mesure" as const,
      classeScene: "aplat-scB porte-scene-film",
      etiquette: notes.tagMoi,
      // « Je mesure, l'atelier fabrique, je pose » (Quentin, 06/10/2026 : « on ne comprend pas que c'est l'atelier qui
      // fabrique ») : les trois étapes dans l'ordre, et ce qui compte en gras — l'atelier fabrique aux cotes exactes.
      titre: fr ? "Je mesure, l'atelier fabrique, je\u00a0pose" : "I measure, the workshop makes it, I\u00a0fit\u00a0it",
      note: fr ? (
        <>
          Vous prenez trois mesures au mètre&nbsp;: l&apos;atelier fabrique votre garde-corps <strong className="porte-fort">à vos cotes exactes</strong>.
        </>
      ) : (
        <>
          You take three tape measurements: the workshop makes your railing <strong className="porte-fort">to your exact dimensions</strong>.
        </>
      ),
      // Ce que le client reçoit pour poser, et une note de facilité honnête (Quentin, 06/10/2026 : « une note assez facile,
      // même si ce n'est pas le plus simple du monde » ; 8/10, une perceuse et un niveau, environ une heure).
      petit: fr
        ? "Vous recevez la notice de pose de votre garde-corps et toute la visserie (vis, chevilles)."
        : "You receive the fitting guide for your railing and all the fixings (screws, wall plugs).",
      facilite: {
        niveau: 8,
        titre: fr ? "Pose facile : 8/10" : "Easy to fit: 8/10",
        detail: fr ? "une perceuse, un niveau, environ 1\u00a0h." : "a drill, a spirit level, about 1\u00a0hour.",
      },
      action: fr ? "Saisir mes mesures" : "Enter my measurements",
      etiquettes: {
        classe: "aplat-etB",
        textes: fr
          ? ["Vous mesurez", "Le prix s'affiche, vous commandez", "Fabrication à Saumur", "Emballé avec soin", "Livré partout en France", "Vous le posez"]
          : ["You measure", "See the price, place your order", "Made in Saumur", "Carefully packed", "Delivered anywhere in France", "You fit it yourself"],
      },
    },
  ];

  return (
    <div ref={racine} className="porte-qui" data-etat={phase} data-vu={vu ? "" : undefined} data-retour={depuis ? "" : undefined}>
      <div className="porte-contenu flex min-h-0 flex-1 flex-col">
        {entete ?? <h2 className={`${serif.className} text-lg leading-none text-[#2b2320] md:text-[28px]`}>{titre}</h2>}
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
        <div className="porte-grille mx-auto mt-3 flex min-h-0 w-full flex-1 flex-col justify-center gap-3 md:mt-5 md:grid md:grid-cols-2 md:content-center md:items-stretch md:gap-5">
          {cartes.map((c) => (
            <button
              key={c.id}
              type="button"
              data-carte={c.id}
              onClick={(e) => choisir(c.id, e.currentTarget)}
              className="porte-carte aplat-card flex min-h-0 flex-col text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#2b2320]"
            >
              <FilmAplat film={c.film} groupe="porte" className={`aplat-card-scene ${c.classeScene} porte-scene`}>
                {c.etiquettes.textes.map((texte, i) => (
                  <span key={i} aria-hidden className={`aplat-et ${c.etiquettes.classe}${i}`}>
                    <b>{i + 1}</b> · {texte}
                  </span>
                ))}
              </FilmAplat>
              <span className="aplat-card-body porte-texte shrink-0">
                <span className="aplat-tag">{c.etiquette}</span>
                <span className="aplat-card-title block">{c.titre}</span>
                {c.note && <span className="aplat-card-text block">{c.note}</span>}
                {"petit" in c && c.petit && <span className="porte-petit block">{c.petit}</span>}
                <span className="porte-facilite">
                  <span className="porte-jauge" aria-hidden>
                    {Array.from({ length: 10 }, (_, i) => (
                      <i key={i} data-plein={i < c.facilite.niveau ? "" : undefined} />
                    ))}
                  </span>
                  <span>
                    <strong>{c.facilite.titre}</strong> · {c.facilite.detail}
                  </span>
                </span>
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
