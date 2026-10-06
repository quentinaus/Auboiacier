"use client";

import { useEffect, useRef, useState } from "react";

import { moinsDAnimations } from "@/lib/ui";
import type { Locale } from "@/lib/i18n";
import { MentionIllustration } from "./visuel";

/**
 * UNE VIDÉO EN BOUCLE, SANS SON : elle se lance toute seule (le téléphone l'accepte parce qu'elle est muette), sauf si le visiteur a demandé
 * « moins d'animations » dans les réglages de son appareil — il voit alors la photo d'ouverture et lance la vidéo lui-même. Un bouton la met en
 * pause (une image qui bouge sans fin doit pouvoir s'arrêter). Le fichier est léger (voir public/videos) et ne se charge pas avant d'être près de l'écran.
 */
export function VideoBoucle({
  src,
  poster,
  description,
  libellePause,
  libelleLecture,
  className = "",
  locale,
}: {
  /** La langue de la page : si la photo d'ouverture est un visuel, la vidéo porte la mention « Image d'illustration ». */
  locale: Locale;
  src: string;
  poster: string;
  /** Ce que montre la vidéo, pour les lecteurs d'écran. */
  description: string;
  libellePause: string;
  libelleLecture: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [enLecture, setEnLecture] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || moinsDAnimations()) return;
    // Le navigateur peut refuser le lancement automatique (économie d'énergie) : la photo reste, le bouton « lire » aussi.
    v.play().catch(() => {});
  }, []);

  const basculer = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={video}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={description}
        onPlay={() => setEnLecture(true)}
        onPause={() => setEnLecture(false)}
        className="block h-full w-full object-cover"
      />
      {/* En haut : le bouton pause occupe le coin du bas. Rien pour une vraie vidéo (le torse). */}
      <MentionIllustration src={poster} locale={locale} coin="haut-droite" />
      <button
        type="button"
        onClick={basculer}
        aria-label={enLecture ? libellePause : libelleLecture}
        className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#2b2320]/70 text-white backdrop-blur-sm transition-colors hover:bg-[#2b2320]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {enLecture ? (
          <svg viewBox="0 0 20 20" aria-hidden fill="currentColor" className="h-4 w-4">
            <rect x="5" y="4" width="3.4" height="12" rx="0.8" />
            <rect x="11.6" y="4" width="3.4" height="12" rx="0.8" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden fill="currentColor" className="h-4 w-4">
            <path d="M6 4.2v11.6a.6.6 0 0 0 .9.5l9.4-5.8a.6.6 0 0 0 0-1L6.9 3.7a.6.6 0 0 0-.9.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
