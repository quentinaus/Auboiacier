"use client";

import { useEffect, useRef, useState } from "react";
import { moinsDAnimations } from "@/lib/ui";

/**
 * Sur téléphone, les trois parties du garde-corps, comme les trois colonnes de l'ordinateur : les mesures, le modèle,
 * le prix (demande de Quentin, 05/10 : « suis l'architecture de la version PC »). Une barre collée en haut de la carte
 * qui défile : toucher une partie y amène, et la partie allumée suit le défilement. Le croquis, au-dessus de la carte,
 * reste toujours visible.
 */
export type PartieConfiguration = { id: string; label: string };

/** La carte qui défile autour de la barre (la carte des choix). */
function carteDe(element: HTMLElement | null): HTMLElement | null {
  return element?.closest<HTMLElement>(".carte-verre") ?? null;
}

export function OngletsConfiguration({ parties, label }: { parties: PartieConfiguration[]; label: string }) {
  const barre = useRef<HTMLElement>(null);
  const [actif, setActif] = useState(parties[0]?.id ?? "");
  const cle = parties.map((p) => p.id).join("|");

  useEffect(() => {
    const carte = carteDe(barre.current);
    if (!carte) return;
    const ids = cle.split("|");
    const suivre = () => {
      // La partie dont le titre est passé sous la barre est celle qu'on lit.
      const seuil = carte.getBoundingClientRect().top + (barre.current?.offsetHeight ?? 0) + 24;
      let courant = ids[0];
      for (const id of ids) {
        const partie = document.getElementById(id);
        if (partie && partie.getBoundingClientRect().top <= seuil) courant = id;
      }
      // Tout en bas de la carte : la dernière partie, même trop courte pour atteindre le seuil.
      if (carte.scrollTop > 0 && carte.scrollTop + carte.clientHeight >= carte.scrollHeight - 4) courant = ids[ids.length - 1];
      setActif(courant);
    };
    suivre();
    carte.addEventListener("scroll", suivre, { passive: true });
    return () => carte.removeEventListener("scroll", suivre);
  }, [cle]);

  const aller = (id: string) => {
    const carte = carteDe(barre.current);
    const partie = document.getElementById(id);
    if (!carte || !partie) return;
    const haut = partie.getBoundingClientRect().top - carte.getBoundingClientRect().top + carte.scrollTop - (barre.current?.offsetHeight ?? 0) - 6;
    carte.scrollTo({ top: Math.max(0, haut), behavior: moinsDAnimations() ? "auto" : "smooth" });
    setActif(id);
  };

  return (
    <nav
      ref={barre}
      aria-label={label}
      // Directement dans le flux de la carte (sans enveloppe) : une enveloppe à sa taille l'empêchait de rester collée.
      // « -top-4 » : collée au bord même de la carte, par-dessus sa marge du haut (sinon le texte défilait au-dessus).
      className="onglets-configuration sticky -top-4 z-30 -mx-5 -mt-4 mb-3 bg-[#f8f6f2] px-5 pb-2 pt-3 shadow-[0_8px_14px_-12px_rgba(43,35,32,0.35)] md:hidden"
    >
      <div className="flex rounded-full bg-[rgba(118,118,128,0.16)] p-0.5">
        {parties.map((p) => {
          const choisi = p.id === actif;
          return (
            <button
              key={p.id}
              type="button"
              aria-current={choisi ? "true" : undefined}
              onClick={() => aller(p.id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-[13px] font-medium transition-colors ${
                choisi ? "bg-white text-[#1d1d1f] shadow-[0_3px_8px_rgba(0,0,0,0.12)]" : "text-[#5c5140]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
