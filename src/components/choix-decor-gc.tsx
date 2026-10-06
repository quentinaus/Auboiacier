"use client";

/**
 * Le choix du DÉCOR À VOLUTES d'un garde-corps de fenêtre (bibliothèque de styles, demande de Quentin du 06/10/2026 :
 * « un max de possibilités aux clients pour la personnalisation », niveau des balcons parisiens et des grilles de château).
 *
 * Une rangée de vignettes, une par assemblage (volutes entre les barreaux, frise, anneaux du style Directoire, grille,
 * cœurs, médaillon, applique) : chacune est DESSINÉE PAR L'OUTIL DE PLANS de l'atelier (public/garde-corps/decors, fichiers
 * générés par l'extraction), jamais redessinée ici. Sous la rangée, les finitions : la volute, ses bouts, les colliers,
 * les barreaux, la frise basse, les rehauts dorés. Le prix et la norme viennent du serveur (le même calcul que le panier).
 *
 * Le composant ne décide rien : il montre les choix permis (DECORS_GC, tirés de l'outil) et rend le décor choisi.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DECORS_GC, type AssemblageDecorGC, type FormeDecorGC } from "@/lib/garde-corps-decors.genere";
import type { ChoixDecorGC } from "@/lib/garde-corps";

/** Les libellés anglais (les français viennent de l'outil de plans). */
const EN: Record<string, string> = {
  entre: "Scrolls between the bars",
  frise: "Scroll frieze",
  anneaux: "Ring frieze (Directoire)",
  hauteur: "Full scroll grille",
  coeurs: "Forged hearts",
  medaillon: "Medallion",
  applique: "Applied motifs",
  C: "C scroll",
  S: "S scroll",
  J: "Crook",
  coeur: "Heart",
  doubleC: "Double C",
  poste: "Wave frieze",
  anneau: "Ring",
  bouton: "Tapered, button end",
  effile: "Tapered",
  droit: "Square cut",
  colliers: "Forged collars",
  soudure: "Welded",
  carre: "Plain square",
  torsade: "Twisted",
  bagues: "With rings",
  aucune: "None",
  postes: "Waves",
};

/** Les mots courts des pilules (le nom complet s'affiche au survol). */
const COURT: Record<string, [string, string]> = {
  bouton: ["Bouton", "Button"], effile: ["Effilés", "Tapered"], droit: ["Droits", "Square"],
  colliers: ["Colliers", "Collars"], soudure: ["Soudées", "Welded"],
  carre: ["Lisses", "Plain"], torsade: ["Torsadés", "Twisted"], bagues: ["Bagues", "Rings"],
  aucune: ["Aucune", "None"], postes: ["Postes", "Waves"],
  C: ["C", "C"], S: ["S", "S"], J: ["Crosse", "Crook"], coeur: ["Cœur", "Heart"], doubleC: ["Double C", "Double C"], poste: ["Postes", "Waves"],
};

const PILULE =
  "whitespace-nowrap rounded-full px-1.5 py-1 text-[11.5px] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] disabled:cursor-not-allowed disabled:opacity-40";

/** Le prix d'un assemblage, tel que le serveur le donne (avec les finitions choisies). */
export type PrixDecorsGC = Partial<Record<AssemblageDecorGC, { prix: number; conforme: boolean }>>;

export function ChoixDecorGC({
  choix,
  onChoix,
  prix,
  locale,
  grand = false,
  prixAffiche,
}: {
  /** Le décor choisi. */
  choix: ChoixDecorGC;
  onChoix: (c: ChoixDecorGC) => void;
  /** Les prix par assemblage (null tant que le serveur ne les a pas donnés). */
  prix: PrixDecorsGC | null;
  locale: "fr" | "en";
  /** Bandeau du grand écran ou étape « Modèle » du téléphone : des vignettes plus grandes. */
  grand?: boolean;
  prixAffiche: (n: number, locale: "fr" | "en") => string;
}) {
  const fr = locale === "fr";
  const nom = (id: string, francais: string) => (fr ? francais : (EN[id] ?? francais));
  const formes = DECORS_GC.formes[choix.assemblage];
  /** Une vignette montre la volute choisie si l'assemblage la permet, sinon la sienne. */
  const formeDe = (a: AssemblageDecorGC): FormeDecorGC => (DECORS_GC.formes[a].includes(choix.forme) ? choix.forme : DECORS_GC.formes[a][0]);
  const changer = (c: Partial<ChoixDecorGC>) => {
    const suite = { ...choix, ...c };
    if (!DECORS_GC.formes[suite.assemblage].includes(suite.forme)) suite.forme = DECORS_GC.formes[suite.assemblage][0];
    onChoix(suite);
  };
  /** Les finitions s'ouvrent dans une fenêtre flottante (règle de la fiche : rien ne se déplie dans le bloc, qui tient sur un écran). */
  // Elle est posée au-dessus de la PAGE (portail), à la place du bouton : une carte qui défile (l'étape du téléphone) ne la
  // coupe pas. Elle se ferme d'un clic ailleurs, avec Échap, ou quand la page ou la carte défile.
  const [ouvert, setOuvert] = useState<null | { left: number; top?: number; bottom?: number; largeur: number }>(null);
  const zone = useRef<HTMLDivElement | null>(null);
  const bouton = useRef<HTMLButtonElement | null>(null);
  const fenetre = useRef<HTMLDivElement | null>(null);
  const ouvrir = () => {
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    const largeur = Math.min(352, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - largeur - 8);
    // Au-dessus du bouton s'il y a la place (environ 230 px), sinon dessous.
    setOuvert(r.top > 240 ? { left, bottom: window.innerHeight - r.top + 6, largeur } : { left, top: r.bottom + 6, largeur });
  };
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (ev: Event) => {
      if (ev instanceof KeyboardEvent) {
        if (ev.key === "Escape") setOuvert(null);
        return;
      }
      const cible = ev.target as Node;
      if (ev.type === "pointerdown" && (zone.current?.contains(cible) || fenetre.current?.contains(cible))) return;
      if (ev.type === "scroll" && fenetre.current?.contains(cible)) return;
      setOuvert(null);
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", fermer);
    window.addEventListener("scroll", fermer, true);
    window.addEventListener("resize", fermer);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", fermer);
      window.removeEventListener("scroll", fermer, true);
      window.removeEventListener("resize", fermer);
    };
  }, [ouvert]);
  const lignes: { titre: string; valeur: string; options: { id: string; nom: string }[]; choisir: (v: string) => void }[] = [
    // Les anneaux n'ont pas de bouts : la ligne ne s'affiche que pour les volutes.
    ...(choix.assemblage === "anneaux" ? [] : [{ titre: fr ? "Bouts des volutes" : "Scroll ends", valeur: choix.bouts, options: [...DECORS_GC.bouts], choisir: (v: string) => changer({ bouts: v as ChoixDecorGC["bouts"] }) }]),
    { titre: fr ? "Assemblage" : "Joints", valeur: choix.liaison, options: [...DECORS_GC.liaisons], choisir: (v: string) => changer({ liaison: v as ChoixDecorGC["liaison"] }) },
    { titre: fr ? "Barreaux" : "Bars", valeur: choix.barreaux, options: [...DECORS_GC.barreaux], choisir: (v: string) => changer({ barreaux: v as ChoixDecorGC["barreaux"] }) },
    { titre: fr ? "Frise basse" : "Lower frieze", valeur: choix.friseBasse, options: [...DECORS_GC.frisesBasses], choisir: (v: string) => changer({ friseBasse: v as ChoixDecorGC["friseBasse"] }) },
    { titre: fr ? "Rehauts dorés" : "Gilded accents", valeur: choix.dore ? "1" : "0", options: [{ id: "0", nom: fr ? "Non" : "No" }, { id: "1", nom: fr ? "Oui" : "Yes" }], choisir: (v: string) => changer({ dore: v === "1" }) },
  ];
  const resume = [
    choix.assemblage === "anneaux" ? null : COURT[choix.bouts]?.[fr ? 0 : 1],
    choix.liaison === "colliers" ? (fr ? "colliers" : "collars") : fr ? "soudées" : "welded",
    choix.barreaux === "carre" ? null : COURT[choix.barreaux]?.[fr ? 0 : 1]?.toLowerCase(),
    choix.friseBasse === "postes" ? (fr ? "postes" : "waves") : null,
    choix.dore ? (fr ? "doré" : "gilded") : null,
  ].filter(Boolean).join(" · ");
  return (
    <div className="choix-decor" data-choix-decor>
      <div role="radiogroup" aria-label={fr ? "Décor à volutes" : "Scrollwork design"} style={{ scrollbarWidth: "thin" }} className="-mx-1 mt-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 pt-0.5">
        {DECORS_GC.assemblages.map((a) => {
          const p = prix?.[a.id];
          const actif = choix.assemblage === a.id;
          const refuse = p ? !p.conforme : false;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={actif}
              disabled={refuse}
              title={refuse ? (fr ? "Pas aux normes pour cette fenêtre" : "Not to standard for this window") : nom(a.id, a.nom)}
              onClick={() => changer({ assemblage: a.id })}
              className={`tuile-modele relative flex ${grand ? "w-[112px]" : "w-[92px]"} shrink-0 snap-start flex-col px-1.5 pb-1.5 pt-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {/* Dessinée par l'outil de plans (fenêtre de 1 000 × 650), pas une photo. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/garde-corps/decors/${a.id}-${formeDe(a.id)}.svg`} alt="" loading="lazy" className={`w-full object-contain ${grand ? "h-[44px]" : "h-[34px]"}`} />
              <span className="mt-1 block text-[10.5px] font-semibold leading-tight text-[#2b2320]">{nom(a.id, a.nom)}</span>
              <span className="block text-[10.5px] font-medium leading-tight tabular-nums text-[#2b2320]">
                {p ? (p.conforme ? prixAffiche(p.prix, locale) : fr ? "À étudier" : "To study") : "…"}
              </span>
            </button>
          );
        })}
      </div>
      <div ref={zone} className="relative mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {formes.length > 1 && (
          <div role="radiogroup" aria-label={fr ? "Volute" : "Scroll"} className="grid rounded-full border border-[#9a8d80] bg-white p-0.5" style={{ gridTemplateColumns: `repeat(${formes.length}, auto)` }}>
            {formes.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={choix.forme === f}
                title={nom(f, DECORS_GC.nomsFormes[f])}
                onClick={() => changer({ forme: f })}
                className={`${PILULE} px-2.5 ${choix.forme === f ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"}`}
              >
                {COURT[f]?.[fr ? 0 : 1] ?? nom(f, DECORS_GC.nomsFormes[f])}
              </button>
            ))}
          </div>
        )}
        <button
          ref={bouton}
          type="button"
          aria-expanded={Boolean(ouvert)}
          onClick={() => (ouvert ? setOuvert(null) : ouvrir())}
          className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#9a8d80] bg-white px-2.5 py-1 text-[11.5px] font-medium leading-tight text-[#2b2320] transition-colors hover:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
        >
          <span className="shrink-0">{fr ? "Finitions" : "Finishes"}</span>
          <span className="truncate font-normal text-[#6f6357]">{resume}</span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`} aria-hidden>
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
        {ouvert && createPortal(
          /* La fenêtre flottante des finitions : au-dessus de la page, sans pousser le bloc. */
          <div
            ref={fenetre}
            role="dialog"
            aria-label={fr ? "Finitions du décor" : "Design finishes"}
            style={{ position: "fixed", left: ouvert.left, top: ouvert.top, bottom: ouvert.bottom, width: ouvert.largeur }}
            className="z-[60] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-[#2b2320]/10"
          >
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
              {lignes.map((ligne) => (
                <div key={ligne.titre} className={`min-w-0 ${ligne.options.length > 2 && ligne.options.some((o) => (COURT[o.id]?.[0] ?? o.nom).length > 7) ? "col-span-2" : ""}`}>
                  <span className="block text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{ligne.titre}</span>
                  {/* Une pilule segmentée, comme les autres choix de la fiche (style de .carte-verre). */}
                  <div role="radiogroup" aria-label={ligne.titre} className="mt-1 grid rounded-full border border-[#9a8d80] bg-white p-0.5" style={{ gridTemplateColumns: `repeat(${ligne.options.length}, minmax(0, 1fr))` }}>
                    {ligne.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={ligne.valeur === o.id}
                        title={nom(o.id, o.nom)}
                        onClick={() => ligne.choisir(o.id)}
                        className={`${PILULE} truncate ${ligne.valeur === o.id ? "bg-[#2b2320] text-white" : "text-[#6f6357] hover:text-[#2b2320]"}`}
                      >
                        {COURT[o.id]?.[fr ? 0 : 1] ?? nom(o.id, o.nom)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
