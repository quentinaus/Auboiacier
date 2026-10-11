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
 * Les films d'un même groupe (les deux cartes de « Qui prend les mesures ? ») tournent tous, sans rien survoler (Quentin,
 * 09/10/2026 : « pour le client, ce n'est pas intuitif que la souris lance le film ») ; chacun part un peu après le
 * précédent, pour qu'ils ne commencent pas pareil. Pour chaque groupe, l'instant du dernier départ prévu.
 */
const groupes = new Map<string, number>();

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
  /** Le nom d'un groupe de films qui démarrent décalés. */
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
      v.style.objectFit = "contain";
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
    // Les deux versions ont les proportions de la scène : le film se voit en entier (Quentin, 09/10/2026).
    v.style.objectFit = "contain";

    const zone = () => portee?.current ?? el;
    const bloquee = () => attendrePorte && Boolean(el.closest(".fond-configuration")?.querySelector(".porte-qui"));
    let visible = false;
    let image = 0;
    // Dans un groupe, un film qui arrive à l'écran part au moins 2,5 s après le départ du précédent.
    let actif = !groupe;
    let decalage = 0;
    const premierDepart = () => {
      if (actif || decalage || !groupe) return;
      const maintenant = performance.now();
      const attente = Math.max(0, (groupes.get(groupe) ?? -Infinity) + 2500 - maintenant);
      groupes.set(groupe, maintenant + attente);
      if (!attente) {
        actif = true;
        return;
      }
      decalage = window.setTimeout(() => {
        actif = true;
        decider();
      }, attente);
    };

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
      if (visible) premierDepart();
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
      for (const n of ["touchend", "click", "keydown"] as const) document.removeEventListener(n, relancer);
      window.clearTimeout(decalage);
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
