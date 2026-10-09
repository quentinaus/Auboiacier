"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * Les films « en aplats » du garde-corps (docs/motion-aplat) sont des VIDÉOS (public/videos/aplat, fabriquées par
 * scripts/rendre-films-aplat.mjs) : dessinés en direct, 372 mouvements recalculés à chaque image, ils ramaient dans
 * Safari (Quentin, 07/10/2026 : « ça rame, ça manque de FPS »). Une vidéo est lue par la puce de l'appareil : fluide.
 *
 * Ce qui se pose PAR-DESSUS reste du texte de la page, dans sa langue : les étiquettes d'étape (.aplat-et…), les
 * légendes et les traits de progression du panneau. Leurs styles (motion-aplat.genere.ts) sont réglés sur la même
 * horloge que le film ; ils suivent l'instant de la vidéo, image par image.
 */
type Habillage = typeof import("./motion-aplat.genere");

let chargement: Promise<Habillage> | null = null;

/** Les styles des films (étiquettes, légendes, traits), chargés une fois, à la demande. */
export function useScenesAplat(): Habillage | null {
  const [habillage, setHabillage] = useState<Habillage | null>(null);
  useEffect(() => {
    let vivant = true;
    (chargement ??= import("./motion-aplat.genere")).then((h) => {
      if (vivant) setHabillage(h);
    });
    return () => {
      vivant = false;
    };
  }, []);
  return habillage;
}

export type FilmAplat = "atelier" | "je-mesure";

/**
 * L'instant où l'écran « AUBOIACIER » de fin est complet : chaque film COMMENCE là (Quentin, 07/10/2026 : « mets exactement
 * cette petite image aussi au début des motion design »). Le logo tient environ 2 s, puis le film reprend à son début ;
 * l'image d'attente (<film>-<taille>-debut.jpg, scripts/rendre-films-aplat.mjs) est cette même image : aucun saut.
 */
// Juste avant la fin du logo (Quentin, 09/10/2026 : « le logo reste beaucoup trop longtemps ») : il se voit moins d'une
// seconde, puis le film reprend.
export const DEBUT_LOGO: Record<FilmAplat, number> = { atelier: 26.2, "je-mesure": 35.4 };

/**
 * Un seul film à la fois dans un même groupe (les deux cartes de « Qui prend les mesures ? ») : deux vidéos qui tournent
 * côte à côte, on ne sait plus où regarder (Quentin, 07/10/2026). Celui qu'on survole joue ; sinon chacun joue un tour
 * complet (du logo au logo), puis passe la main ; l'autre attend, immobile, sur l'écran AUBOIACIER.
 */
type Membre = { activer: () => void; desactiver: () => void };
const groupes = new Map<string, { membres: Membre[]; actif: Membre | null }>();
function choisirDansGroupe(nom: string, m: Membre) {
  const g = groupes.get(nom);
  if (!g || g.actif === m) return;
  g.actif = m;
  for (const x of g.membres) (x === m ? x.activer : x.desactiver)();
}
function passerLaMain(nom: string, m: Membre) {
  const g = groupes.get(nom);
  if (!g || g.actif !== m || g.membres.length < 2) return;
  choisirDansGroupe(nom, g.membres[(g.membres.indexOf(m) + 1) % g.membres.length]);
}

/**
 * La vitesse de lecture (Quentin, 09/10/2026 : « les vidéos trop longues ; quelqu'un qui ne me connaît pas ne regardera
 * pas si c'est lent ») : une fois et demie plus vite. Le temps de la vidéo reste celui du film : les étiquettes suivent.
 */
const VITESSE = 1.5;

/** Sous cette largeur, la version « petit » du film (ses petits textes y sont agrandis, comme sur la page). */
const LARGEUR_PETIT = 520;

/**
 * Un film : la vidéo, en boucle, sans son ; elle ne joue que quand on la voit. `portee` : l'élément dont les animations
 * (étiquettes, légendes, traits) suivent la vidéo — le cadre du film par défaut, tout le panneau pour celui de l'atelier.
 * `attendrePorte` : tant que l'écran « Qui prend les mesures ? » couvre la plaque, le film reste à son début.
 */
export function FilmAplat({
  film,
  className = "",
  children,
  portee,
  attendrePorte = false,
  groupe,
}: {
  film: FilmAplat;
  className?: string;
  children?: ReactNode;
  portee?: RefObject<HTMLElement | null>;
  attendrePorte?: boolean;
  /** Le nom d'un groupe de films dont un seul joue à la fois. */
  groupe?: string;
}) {
  const habillage = useScenesAplat();
  const cadre = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = cadre.current;
    const v = video.current;
    if (!el || !v) return;
    const moinsDeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const taille = el.clientWidth <= LARGEUR_PETIT ? "petit" : "grand";
    // Moins d'animations demandées : l'image finale (le garde-corps posé), sans vidéo.
    if (moinsDeMouvement) {
      v.poster = `/videos/aplat/${film}-${taille}-fin.jpg`;
      v.style.objectFit = taille === "petit" ? "cover" : "contain";
      return;
    }
    v.poster = `/videos/aplat/${film}-${taille}-debut.jpg`;
    // Sur iPhone, une vidéo ne part toute seule que si elle est muette jusque dans son HTML (React ne pose que la
    // propriété) et lue dans la page (Quentin, 09/10/2026 : « sur téléphone, on ne voit pas le motion design »).
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.src = `/videos/aplat/${film}-${taille}.mp4`;
    v.defaultPlaybackRate = VITESSE;
    v.playbackRate = VITESSE;
    // Le film part de l'écran AUBOIACIER (une seule fois : ensuite, la boucle fait le reste).
    const auLogo = () => {
      v.currentTime = DEBUT_LOGO[film];
    };
    v.addEventListener("loadedmetadata", auLogo, { once: true });
    // La version du téléphone est plus large que la scène (le décor continue) : elle remplit le cadre, les côtés en trop
    // sont coupés. Celle de l'ordinateur a les proportions de la scène : elle s'y loge entière.
    v.style.objectFit = taille === "petit" ? "cover" : "contain";

    const zone = () => portee?.current ?? el;
    const bloquee = () => attendrePorte && Boolean(el.closest(".fond-configuration")?.querySelector(".porte-qui"));
    let visible = false;
    let image = 0;
    // Dans un groupe, seul le film actif joue ; le premier inscrit commence. Sans souris (téléphone, tablette), on ne
    // peut pas survoler : les films tournent tous, le second un peu après le premier (Quentin, 09/10/2026 : « il n'y a
    // que la vidéo d'en haut qui tourne »).
    const survol = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const enGroupe = groupe && survol ? groupe : undefined;
    let actif = !enGroupe;
    let decalage = 0;
    if (groupe && !survol) {
      const g = groupes.get(groupe) ?? { membres: [], actif: null };
      if (g.membres.length) {
        actif = false;
        decalage = window.setTimeout(() => {
          actif = true;
          decider();
        }, 2500 * g.membres.length);
      }
      g.membres.push({ activer: () => {}, desactiver: () => {} });
      groupes.set(groupe, g);
    }
    let aBoucle = false;
    let dernier = 0;

    // Les étiquettes et légendes à l'instant exact de la vidéo.
    const caler = () => {
      const t = v.currentTime * 1000;
      for (const a of zone().getAnimations({ subtree: true })) {
        if (a.playState !== "paused") a.pause();
        a.currentTime = t;
      }
    };
    const boucle = () => {
      caler();
      image = requestAnimationFrame(boucle);
    };
    const decider = () => {
      if (bloquee()) {
        v.pause();
        if (v.readyState >= 1) v.currentTime = DEBUT_LOGO[film];
        caler();
        return;
      }
      if (visible && actif) {
        // Refusée (économie d'énergie de l'iPhone) : elle repartira au premier toucher de l'écran.
        v.play().catch(() => attendreUnGeste());
      } else {
        v.pause();
      }
    };
    let geste = false;
    const relancer = () => {
      geste = false;
      decider();
    };
    const attendreUnGeste = () => {
      if (geste) return;
      geste = true;
      for (const n of ["touchend", "click", "keydown"] as const) document.addEventListener(n, relancer, { once: true, passive: true });
    };
    const surLecture = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(boucle);
    };
    const surPause = () => {
      cancelAnimationFrame(image);
      caler();
    };
    // Un tour complet joué (retour au logo après la fin du film) : le film passe la main au suivant du groupe.
    const surTemps = () => {
      if (v.currentTime < dernier - 1) aBoucle = true;
      dernier = v.currentTime;
      if (enGroupe && aBoucle && v.currentTime >= DEBUT_LOGO[film]) {
        aBoucle = false;
        passerLaMain(enGroupe, membre);
      }
    };
    const membre: Membre = {
      activer: () => {
        actif = true;
        aBoucle = false;
        dernier = v.currentTime;
        decider();
      },
      desactiver: () => {
        actif = false;
        v.pause();
        if (v.readyState >= 1) v.currentTime = DEBUT_LOGO[film];
        caler();
      },
    };
    let quitterGroupe = () => {};
    let declencheur: Element | null = null;
    const surSurvol = () => enGroupe && choisirDansGroupe(enGroupe, membre);
    if (enGroupe) {
      const g = groupes.get(enGroupe) ?? { membres: [], actif: null };
      g.membres.push(membre);
      groupes.set(enGroupe, g);
      if (!g.actif) {
        g.actif = membre;
        actif = true;
      }
      declencheur = el.closest("[data-carte]") ?? el;
      declencheur.addEventListener("pointerenter", surSurvol);
      declencheur.addEventListener("focusin", surSurvol);
      quitterGroupe = () => {
        g.membres = g.membres.filter((x) => x !== membre);
        if (g.actif === membre) g.actif = g.membres[0] ?? null;
        if (!g.membres.length) groupes.delete(enGroupe);
      };
    }
    v.addEventListener("timeupdate", surTemps);
    v.addEventListener("playing", surLecture);
    v.addEventListener("pause", surPause);
    v.addEventListener("seeked", caler);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      decider();
    });
    io.observe(el);
    // L'écran « Qui prend les mesures ? » peut partir à tout moment : on regarde de temps en temps.
    const veille = attendrePorte ? window.setInterval(decider, 400) : 0;
    caler();
    return () => {
      io.disconnect();
      window.clearInterval(veille);
      cancelAnimationFrame(image);
      v.removeEventListener("playing", surLecture);
      v.removeEventListener("timeupdate", surTemps);
      for (const n of ["touchend", "click", "keydown"] as const) document.removeEventListener(n, relancer);
      declencheur?.removeEventListener("pointerenter", surSurvol);
      declencheur?.removeEventListener("focusin", surSurvol);
      quitterGroupe();
      window.clearTimeout(decalage);
      if (groupe && !survol) groupes.delete(groupe);
      v.removeEventListener("pause", surPause);
      v.removeEventListener("seeked", caler);
      v.pause();
    };
  }, [film, portee, attendrePorte, groupe]);

  return (
    <>
      {habillage && (
        <style href="motion-aplat" precedence="medium">
          {habillage.CSS_APLAT}
        </style>
      )}
      <span ref={cadre} className={`relative block ${className}`}>
        <video
          ref={video}
          aria-hidden
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          // Sans hauteur imposée par le cadre (le panneau du téléphone), la vidéo garde les proportions de la scène.
          className="scene-aplat-dessin block aspect-[720/400] h-full w-full object-contain"
        />
        {habillage && children}
      </span>
    </>
  );
}
