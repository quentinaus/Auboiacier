"use client";

import { useRef } from "react";
import { SceneAplat, useHorsEcran, useScenesAplat } from "./motion-aplat";

/**
 * « L'atelier vient mesurer » : ce qui se passe ensuite, en un petit film en aplats, en quatre chapitres — la prise
 * de cotes, le prix exact, la fabrication à Saumur, la pose. C'est la scène C de la maquette validée par Quentin le
 * 05/10/2026 (docs/motion-aplat) ; il avait refusé avant elle un transat dessiné, une photo et une frise d'icônes.
 *
 * Le film, ses barres de progression et ses légendes sont réglés sur la même horloge (16 s, motion-aplat.genere.ts).
 * Il attend que l'écran « Qui prend les mesures ? » soit parti pour commencer (globals.css, .parcours-aplat).
 * `petit` : la version de la carte, sous 1024 px (product-options.tsx, bandeauSlot).
 */
export function SereniteAtelier({ locale, petit = false }: { locale: "fr" | "en"; petit?: boolean }) {
  const fr = locale === "fr";
  const scenes = useScenesAplat();
  // Le panneau entier s'arrête hors de l'écran : le film, ses traits de progression et ses légendes, ensemble.
  const panneau = useRef<HTMLElement>(null);
  useHorsEcran(panneau);
  const chapitres = fr
    ? ["Nous venons prendre les cotes", "Vous recevez le prix exact", "Fabrication à l'atelier, à Saumur", "Pose de votre garde-corps"]
    : ["We come and take the measurements", "You receive the exact price", "Made in our workshop, in Saumur", "Your railing is fitted"];
  return (
    <section
      ref={panneau}
      aria-label={fr ? "Ce que fait l'atelier" : "What the workshop does"}
      className={`parcours-aplat aplat-panel flex w-full flex-col ${petit ? "aplat-sm mt-3" : "h-full min-h-0"}`}
    >
      {/* Les mots de Quentin (05/10/2026) : « nous venons mesurer et nous nous occupons de tout, de A à Z ». */}
      <h3 className="aplat-panel-title">{fr ? "Nous venons mesurer. Nous nous occupons du reste." : "We come and measure. We take care of the rest."}</h3>
      <p className="aplat-panel-sub">
        {fr
          ? "De la prise de cotes à la pose, l'atelier prend tout en charge, de A à Z."
          : "From measuring to fitting, the workshop handles everything, from start to finish."}
      </p>
      <SceneAplat scenes={scenes} svg="SVG_FILM" className="aplat-film" suivreEcran={false} />
      <div className="aplat-progress" aria-hidden>
        {chapitres.map((_, i) => (
          <span key={i} className="aplat-bar">
            <i className={`aplat-fill${i}`} />
          </span>
        ))}
      </div>
      <ol className="aplat-caps">
        {chapitres.map((c, i) => (
          <li key={c} className={`aplat-cap aplat-cap${i}`}>
            <span className="aplat-capn">0{i + 1}</span>
            {c}
          </li>
        ))}
      </ol>
    </section>
  );
}
