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
}: {
  film: FilmAplat;
  className?: string;
  children?: ReactNode;
  portee?: RefObject<HTMLElement | null>;
  attendrePorte?: boolean;
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
    v.src = `/videos/aplat/${film}-${taille}.mp4`;
    // La version du téléphone est plus large que la scène (le décor continue) : elle remplit le cadre, les côtés en trop
    // sont coupés. Celle de l'ordinateur a les proportions de la scène : elle s'y loge entière.
    v.style.objectFit = taille === "petit" ? "cover" : "contain";

    const zone = () => portee?.current ?? el;
    const bloquee = () => attendrePorte && Boolean(el.closest(".fond-configuration")?.querySelector(".porte-qui"));
    let visible = false;
    let image = 0;

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
        v.currentTime = 0;
        caler();
        return;
      }
      if (visible) {
        v.play().catch(() => {}); // économie d'énergie de l'iPhone : l'affiche reste, c'est tout
      } else {
        v.pause();
      }
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
      v.removeEventListener("pause", surPause);
      v.removeEventListener("seeked", caler);
      v.pause();
    };
  }, [film, portee, attendrePorte]);

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
