"use client";

/**
 * La page des portails (Quentin, 10/10/2026) : d'abord les trois questions qui disent quel portail convient chez lui, puis
 * les quatre modèles dessinés avec leur « dès … € posé », triés par prix (bouton comme le garde-corps). Pas de mesures ici
 * (Quentin, 10/10 : « ici, je veux qu'on demande seulement certaines questions pour savoir quel style de portail sera
 * adaptable… et ensuite on entre les cotes ») : les cotes se saisissent sur la fiche, qui signale un passage trop large
 * pour un battant et renvoie au coulissant. Chaque modèle mène à sa fiche, guidage déjà rempli. Les dessins viennent du
 * moteur de l'outil ; les « dès » du serveur (prixDepartPortail, à la cote courante), passés par la page.
 */
import "./configurateur-portail.css";
import { useMemo, useState } from "react";
import Link from "next/link";
import { configDepart, guidePortail, planPortail, TEXTES_PORTAIL, type Langue, type SlugPortail, type StylePortail } from "@/lib/portails";
import { prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";
import { Pilule, Vue } from "@/components/portail-configurateur";
import { SchemaGuide } from "./schema-guide";

type Prims = { t: string; [k: string]: unknown }[];
/** Le style dessiné sur la carte de chaque modèle (celui de la fiche au premier affichage). */
const STYLE_CARTE: Record<SlugPortail, StylePortail> = { "portail-battant": "lamesChene", "portail-coulissant": "plein", "portail-pliant": "barreaux", portillon: "rosace" };
const ORDRE: SlugPortail[] = ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"];

const TXT = {
  fr: {
    guide: "Quel portail chez vous ?", guideSous: "Deux ou trois questions sur votre entrée, sans mesurer : le site vous dit quel type de portail lui convient. Les mesures viennent après, sur la fiche.",
    vocab: "Un vantail est la partie du portail qui bouge. Le passage est la largeur libre entre vos deux piliers.",
    notes: [
      "Un portail battant s'ouvre comme une porte : chaque vantail tourne autour de ses gonds, vers l'intérieur. Il faut un sol à peu près plat, sans marche, et une place libre égale à la moitié du passage : 1,75 m derrière chaque vantail pour un passage de 3,50 m, sans voiture, arbre ni mur dans le quart de cercle.",
      "Un portail coulissant glisse le long de la clôture, comme une porte de placard. Il faut une longueur libre, d'un seul côté, au moins égale à la largeur du passage (3,50 m pour un passage de 3,50 m), sans arbre ni mur devant. Sinon, ce sera un portail pliant.",
      "Sur un sol dur et plat, le portail roule sur un rail fixé au sol. Si le sol est meuble, en pente ou avec une marche, on prend le coulissant sans rail (autoportant) : il tient avec un contrepoids derrière lui, soit environ une fois et demie plus de longueur libre.",
    ] as const,
    oui: "Oui, il y a la place", non: "Non, pas la place", ouiSol: "Oui, dur et plat", nonSol: "Non, ou je ne suis pas sûr",
    schema: ["Schéma : deux vantaux ouverts vers la propriété", "Schéma : le portail glisse le long de la clôture", "Schéma : sol dur avec rail, ou sol meuble sans rail"],
    conseil: "Le bon type chez vous :", conseilNote: { "portail-battant": "la place pour tourner est libre derrière.", "portail-coulissant": "pas de place pour tourner, mais la longueur de clôture est libre.", "portail-pliant": "ni la place pour tourner, ni la longueur pour glisser : chaque vantail se plie en deux et prend peu de place.", portillon: "" },
    rail: "sur rail", auto: "sans rail, autoportant",
    modeles: "Les modèles", modelesSous: "Prix posé, dans le style le moins cher, sans moteur, à la cote courante (3,50 × 1,60 m ; portillon 1,00 m). Vos mesures et vos choix se règlent sur la fiche.",
    des: "dès", aEtudier: "À étudier à la visite", conseille: "Conseillé pour vous", ouvrir: "Composer ce portail", portillonNote: "Pour les piétons, seul ou assorti au portail.",
    triCroissant: "Prix croissant", triDecroissant: "Prix décroissant", triTitre: "Inverser l'ordre des prix",
    vuRue: "Vu depuis la rue",
  },
  en: {
    guide: "Which gate for your entrance?", guideSous: "Two or three questions about your entrance, no measuring: the site tells you which type of gate suits it. Measurements come next, on the model page.",
    vocab: "A leaf is the part of the gate that moves. The opening is the clear width between your two pillars.",
    notes: [
      "A swing gate opens like a door: each leaf turns on its hinges, inward. You need roughly level ground, no step, and free room equal to half the opening: 1.75 m behind each leaf for a 3.50 m opening, with no car, tree or wall in the quarter circle.",
      "A sliding gate glides along the fence, like a wardrobe door. You need a free length, on one side only, at least equal to the opening (3.50 m for a 3.50 m opening), with no tree or wall in front. Otherwise it will be a folding gate.",
      "On hard, level ground the gate rolls on a rail fixed to the ground. If the ground is soft, sloping or has a step, take the sliding gate without rail (cantilever): it holds with a counterweight behind it, about one and a half times more free length.",
    ] as const,
    oui: "Yes, there is room", non: "No, not enough room", ouiSol: "Yes, hard and level", nonSol: "No, or I am not sure",
    schema: ["Diagram: two leaves open into the property", "Diagram: the gate slides along the fence", "Diagram: hard ground with a rail, or soft ground without a rail"],
    conseil: "The right type for you:", conseilNote: { "portail-battant": "there is room to swing behind.", "portail-coulissant": "no room to swing, but the length of fence is free.", "portail-pliant": "neither room to swing nor length to slide: each leaf folds in two and takes little space.", portillon: "" },
    rail: "on a rail", auto: "no rail, cantilever",
    modeles: "The models", modelesSous: "Fitted price, in the least expensive style, without motor, at the usual size (3.50 × 1.60 m; pedestrian gate 1.00 m). Your measurements and choices are set on the model page.",
    des: "from", aEtudier: "To be studied at the visit", conseille: "Recommended for you", ouvrir: "Compose this gate", portillonNote: "For pedestrians, alone or matching the gate.",
    triCroissant: "Price: low to high", triDecroissant: "Price: high to low", triTitre: "Reverse the price order",
    vuRue: "Seen from the street",
  },
} as const;

export function PortailsGuide({ locale, noms, taglines, departs }: {
  locale: Langue;
  noms: Record<SlugPortail, string>;
  taglines: Record<SlugPortail, string>;
  /** Le « dès » de chaque modèle (prixDepartPortail, calculé par le serveur) ; null quand le serveur ne peut pas le donner. */
  departs: Record<SlugPortail, number | null>;
}) {
  const t = TXT[locale], tp = TEXTES_PORTAIL[locale];
  const [guide, setGuide] = useState<{ derriere?: boolean; cote?: boolean; sol?: boolean }>({});
  const [tri, setTri] = useState<"croissant" | "decroissant">("croissant");
  const reponse = guidePortail(guide);
  const guidage = reponse?.guidage;

  // Les dessins des quatre modèles, à la cote courante de chaque fiche.
  const dessins = useMemo(() => Object.fromEntries(ORDRE.map((slug) => {
    const cfg = { ...configDepart(slug, STYLE_CARTE[slug]), ...(slug === "portail-coulissant" && guidage ? { guidage } : {}) };
    return [slug, planPortail(slug, cfg).vues.face as Prims];
  })) as Record<SlugPortail, Prims>, [guidage]);

  const euros = (n: number) => prixAffiche(n, locale);
  const ordre = useMemo(() => {
    const s = tri === "croissant" ? 1 : -1;
    return [...ORDRE].sort((a, c) => { const pa = departs[a], pc = departs[c]; if (pa == null || pc == null) return pa == null ? 1 : -1; return (pa - pc) * s; });
  }, [departs, tri]);

  const lien = (slug: SlugPortail) => `/${locale}/artisanat/${slug}${slug === "portail-coulissant" && guidage ? `?guidage=${guidage}` : ""}#configuration`;

  return (
    <div className="cpt pg">
      {/* 1. Les trois questions. */}
      <section className="carte-verre pg-carte" aria-labelledby="pg-guide">
        <h2 id="pg-guide" className={serif.className}>{t.guide}</h2>
        <p className="pg-sous">{t.guideSous}</p>
        <p className="pg-vocab">{t.vocab}</p>
        {tp.guideQ.map((q, i) => {
          const cleQ = (["derriere", "cote", "sol"] as const)[i];
          const visible = i === 0 || (i === 1 && guide.derriere === false) || (i === 2 && guide.derriere === false && guide.cote === true);
          if (!visible) return null;
          return (
            <div key={cleQ} className="pg-question">
              <SchemaGuide question={i as 0 | 1 | 2} locale={locale} label={t.schema[i]} />
              <div className="pg-q-texte">
                <p className="pg-q-titre">{q}</p>
                <p className="pg-q-note">{t.notes[i]}</p>
                <Pilule aria={q} valeur={guide[cleQ] === undefined ? "" : guide[cleQ] ? "oui" : "non"}
                  onChange={(x) => setGuide((g) => ({ ...g, [cleQ]: x === "oui", ...(i === 0 ? { cote: undefined, sol: undefined } : i === 1 ? { sol: undefined } : {}) }))}
                  options={[{ v: "oui", label: i === 2 ? t.ouiSol : t.oui }, { v: "non", label: i === 2 ? t.nonSol : t.non }]} />
              </div>
            </div>
          );
        })}
        {reponse && (
          <p className="cpt-f-info pg-conseil">{t.conseil} <b>{noms[reponse.slug]}{reponse.guidage ? ` (${reponse.guidage === "rail" ? t.rail : t.auto})` : ""}</b> — {t.conseilNote[reponse.slug]}</p>
        )}
      </section>

      {/* 2. Les modèles, triés par prix. */}
      <section aria-labelledby="pg-modeles" className="pg-modeles">
        <div className="pg-modeles-tete">
          <div><h2 id="pg-modeles" className={serif.className}>{t.modeles}</h2><p className="pg-sous">{t.modelesSous}</p></div>
          <button type="button" className="cpt-tri" onClick={() => setTri((v) => (v === "croissant" ? "decroissant" : "croissant"))} title={t.triTitre}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={tri === "croissant" ? "M10 16V4M10 4l-4 4M10 4l4 4" : "M10 4v12M10 16l-4-4M10 16l4-4"} /></svg>
            {tri === "croissant" ? t.triCroissant : t.triDecroissant}
          </button>
        </div>
        <ul className="pg-grille">
          {ordre.map((slug) => {
            const p = departs[slug], conseille = reponse?.slug === slug;
            return (
              <li key={slug} className={`carte-verre pg-modele ${conseille ? "conseille" : ""}`}>
                {conseille && <span className="pg-badge">{t.conseille}</span>}
                <div className="pg-dessin"><Vue prims={dessins[slug]} couleur={slug === "portillon" ? "noir" : "anthracite"} sansCotes label={`${noms[slug]}, ${t.vuRue}`} /></div>
                <h3 className={serif.className}>{noms[slug]}</h3>
                <p className="pg-tagline">{slug === "portillon" ? t.portillonNote : taglines[slug]}</p>
                <p className="pg-prix">{p === null ? t.aEtudier : `${t.des} ${euros(p)}`}</p>
                <Link href={lien(slug)} className="btn-verre pg-cta">{t.ouvrir}</Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
