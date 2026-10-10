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
    sep: "\u00a0: ",
    guide: "Quel type de portail convient à votre entrée ?",
    guideSous: "Le type de portail se choisit d'abord selon la place disponible autour de l'entrée, avant le style ou le matériau. Répondez à ces questions sans rien mesurer : le site vous indique le type adapté. Vos mesures se règlent ensuite sur la fiche du modèle.",
    vocab: [["Vantail", "la partie mobile du portail."], ["Passage", "la largeur libre entre vos deux piliers, par où passent la voiture et les piétons."]] as const,
    schema: ["Schéma : deux vantaux ouverts vers la propriété", "Schéma : le portail glisse le long de la clôture", "Schéma : sol dur avec rail, ou sol meuble sans rail"],
    suite: "Il est signalé « Conseillé pour vous » parmi les modèles ci-dessous. Vos mesures et votre style se règlent ensuite sur sa fiche.",
    rail: "sur rail", auto: "sans rail, autoportant",
    modeles: "Les modèles", modelesSous: "« Dès » : le prix d'un portail posé par l'atelier, dans le style le moins cher, sans moteur, pour un passage de 3,50 m et 1,60 m de haut (portillon : 1,00 m). Vos mesures, votre style, et la pose, la livraison ou le retrait à l'atelier se choisissent sur la fiche.",
    des: "dès", aEtudier: "À étudier à la visite", conseille: "Conseillé pour vous", ouvrir: "Composer ce portail", portillonNote: "Pour les piétons, seul ou assorti au portail.",
    place: "Place nécessaire :", placeLigne: { "portail-battant": "la moitié du passage, derrière chaque pilier.", "portail-coulissant": "d'un côté, une longueur de clôture égale au passage (environ une fois et demie sans rail).", "portail-pliant": "très peu, ni derrière le portail ni sur le côté.", portillon: "" },
    triCroissant: "Prix croissant", triDecroissant: "Prix décroissant", triTitre: "Inverser l'ordre des prix",
    vuRue: "Vu depuis la rue",
  },
  en: {
    sep: ": ",
    guide: "Which type of gate suits your entrance?",
    guideSous: "The type of gate is chosen first according to the space available around the entrance, before style or material. Answer these questions without measuring anything: the site tells you the suitable type. Your measurements are set next, on the model page.",
    vocab: [["Leaf", "the moving part of the gate."], ["Opening", "the clear width between your two pillars, where cars and pedestrians go through."]] as const,
    schema: ["Diagram: two leaves open into the property", "Diagram: the gate slides along the fence", "Diagram: hard ground with a rail, or soft ground without a rail"],
    suite: "It is marked “Recommended for you” among the models below. Your measurements and style are then set on its page.",
    rail: "on a rail", auto: "no rail, cantilever",
    modeles: "The models", modelesSous: "“From” is the price of a gate fitted by the workshop, in the least expensive style, without motor, for a 3.50 m opening and 1.60 m height (pedestrian gate: 1.00 m). Your measurements, your style, and fitting, delivery or collection at the workshop are chosen on the model page.",
    des: "from", aEtudier: "To be studied at the visit", conseille: "Recommended for you", ouvrir: "Compose this gate", portillonNote: "For pedestrians, alone or matching the gate.",
    place: "Room needed:", placeLigne: { "portail-battant": "half the opening, behind each pillar.", "portail-coulissant": "on one side, a length of fence at least equal to the opening (about one and a half times without a rail).", "portail-pliant": "very little, neither behind the gate nor at the side.", portillon: "" },
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
        <p className="pg-vocab">{t.vocab.map(([terme, definition], i) => (<span key={terme}>{i > 0 ? " " : ""}<b>{terme}</b>{t.sep}{definition}</span>))}</p>
        {tp.guideQ.map((q, i) => {
          const cleQ = (["derriere", "cote", "sol"] as const)[i];
          const visible = i === 0 || (i === 1 && guide.derriere === false) || (i === 2 && guide.derriere === false && guide.cote === true);
          if (!visible) return null;
          return (
            <div key={cleQ} className="pg-question">
              <SchemaGuide question={i as 0 | 1 | 2} locale={locale} label={t.schema[i]} />
              <div className="pg-q-texte">
                <p className="pg-q-titre">{q}</p>
                <p className="pg-q-note">{tp.guideCtx[i]}</p>
                <p className="pg-q-verif"><b>{tp.guideVerifTitre}.</b> {tp.guideVerif[i]}</p>
                <Pilule aria={q} valeur={guide[cleQ] === undefined ? "" : guide[cleQ] ? "oui" : "non"}
                  onChange={(x) => setGuide((g) => ({ ...g, [cleQ]: x === "oui", ...(i === 0 ? { cote: undefined, sol: undefined } : i === 1 ? { sol: undefined } : {}) }))}
                  options={[{ v: "oui", label: tp.guideOui[i] }, { v: "non", label: tp.guideNon[i] }]} />
              </div>
            </div>
          );
        })}
        {reponse && (
          <div className="cpt-f-info pg-conseil">
            <p>{tp.guideConseil} <b>{noms[reponse.slug]}{reponse.guidage ? ` (${reponse.guidage === "rail" ? t.rail : t.auto})` : ""}</b> : {tp.guideRaison[reponse.slug === "portail-battant" ? "battant" : reponse.slug === "portail-pliant" ? "pliant" : reponse.guidage === "auto" ? "auto" : "rail"]}</p>
            <p className="pg-conseil-suite">{t.suite}</p>
          </div>
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
                <p className="pg-place">{t.placeLigne[slug] ? <><b>{t.place}</b> {t.placeLigne[slug]}</> : null}</p>
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
