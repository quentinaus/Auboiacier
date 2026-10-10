"use client";

/**
 * La page des portails (Quentin, 10/10/2026) : d'abord les questions qui disent quel type de portail convient chez le client,
 * puis les quatre modèles dessinés avec leur « dès … € posé », triés par prix. Pas de mesures ici : elles se saisissent sur la
 * fiche. Refait pour être INTUITIF (retour de son père, bricoleur, qui sautait la question : « trop de texte ») : UNE question à
 * la fois, un titre court, le schéma, DEUX GROS BOUTONS ; les explications sont repliées (« Besoin d'aide pour vérifier ? ») ;
 * les réponses données restent en pastilles modifiables ; le résultat est une GRANDE carte sombre avec le dessin, le nom du
 * type en gros et le bouton pour le composer. Les dessins viennent du moteur de l'outil ; les « dès » du serveur.
 */
import "./configurateur-portail.css";
import { useMemo, useState } from "react";
import Link from "next/link";
import { configDepart, guidePortail, planPortail, TEXTES_PORTAIL, type Langue, type SlugPortail, type StylePortail } from "@/lib/portails";
import { prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";
import { Vue } from "@/components/portail-configurateur";
import { SchemaGuide } from "./schema-guide";

type Prims = { t: string; [k: string]: unknown }[];
/** Le style dessiné sur la carte de chaque modèle (celui de la fiche au premier affichage). */
const STYLE_CARTE: Record<SlugPortail, StylePortail> = { "portail-battant": "lamesChene", "portail-coulissant": "plein", "portail-pliant": "barreaux", portillon: "rosace" };
const ORDRE: SlugPortail[] = ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"];
type Reponses = { derriere?: boolean; cote?: boolean; sol?: boolean };
const CLES = ["derriere", "cote", "sol"] as const;

const TXT = {
  fr: {
    guide: "Quel portail pour votre entrée ?", guideSous: "3 questions, sans rien mesurer.",
    question: (n: number) => `Question ${n}`, plus: "Quel est ce portail ?",
    rail: "sur rail", auto: "sans rail, autoportant",
    modeles: "Les modèles", modelesSous: "« Dès » : le prix d'un portail posé par l'atelier, dans le style le moins cher, sans moteur, pour un passage de 3,50 m et 1,60 m de haut (portillon : 1,00 m). Vos mesures, votre style, et la pose, la livraison ou le retrait à l'atelier se choisissent sur la fiche.",
    des: "dès", aEtudier: "À étudier à la visite", conseille: "Conseillé pour vous", ouvrir: "Composer ce portail", portillonNote: "Pour les piétons, seul ou assorti au portail.",
    voirPrix: (p: string) => `Dès ${p} posé`, composer: "Composer ce portail",
    place: "Place nécessaire :", placeLigne: { "portail-battant": "la moitié du passage, derrière chaque pilier.", "portail-coulissant": "d'un côté, une longueur de clôture égale au passage (environ une fois et demie sans rail).", "portail-pliant": "très peu, ni derrière le portail ni sur le côté.", portillon: "" },
    triCroissant: "Prix croissant", triDecroissant: "Prix décroissant", triTitre: "Inverser l'ordre des prix",
    vuRue: "Vu depuis la rue", reponses: "Vos réponses",
    schema: ["Schéma : deux vantaux ouverts vers la propriété", "Schéma : le portail glisse le long de la clôture", "Schéma : sol dur avec rail, ou sol meuble sans rail"],
  },
  en: {
    guide: "Which gate for your entrance?", guideSous: "3 questions, no measuring.",
    question: (n: number) => `Question ${n}`, plus: "What is this gate?",
    rail: "on a rail", auto: "no rail, cantilever",
    modeles: "The models", modelesSous: "“From” is the price of a gate fitted by the workshop, in the least expensive style, without motor, for a 3.50 m opening and 1.60 m height (pedestrian gate: 1.00 m). Your measurements, your style, and fitting, delivery or collection at the workshop are chosen on the model page.",
    des: "from", aEtudier: "To be studied at the visit", conseille: "Recommended for you", ouvrir: "Compose this gate", portillonNote: "For pedestrians, alone or matching the gate.",
    voirPrix: (p: string) => `From ${p} fitted`, composer: "Compose this gate",
    place: "Room needed:", placeLigne: { "portail-battant": "half the opening, behind each pillar.", "portail-coulissant": "on one side, a length of fence equal to the opening (about one and a half times without a rail).", "portail-pliant": "very little, neither behind the gate nor at the side.", portillon: "" },
    triCroissant: "Price: low to high", triDecroissant: "Price: high to low", triTitre: "Reverse the price order",
    vuRue: "Seen from the street", reponses: "Your answers",
    schema: ["Diagram: two leaves open into the property", "Diagram: the gate slides along the fence", "Diagram: hard ground with a rail, or soft ground without a rail"],
  },
} as const;

/** La question en cours : la première sans réponse parmi celles que les réponses précédentes rendent utiles ; null = le résultat est là. */
function questionCourante(g: Reponses): 0 | 1 | 2 | null {
  if (g.derriere === undefined) return 0;
  if (g.derriere) return null;
  if (g.cote === undefined) return 1;
  if (!g.cote) return null;
  return g.sol === undefined ? 2 : null;
}
/** Les questions déjà répondues, dans l'ordre. */
function repondues(g: Reponses): (0 | 1 | 2)[] {
  const l: (0 | 1 | 2)[] = [];
  if (g.derriere !== undefined) l.push(0);
  if (g.derriere === false && g.cote !== undefined) l.push(1);
  if (g.derriere === false && g.cote === true && g.sol !== undefined) l.push(2);
  return l;
}

export function PortailsGuide({ locale, noms, taglines, departs }: {
  locale: Langue;
  noms: Record<SlugPortail, string>;
  taglines: Record<SlugPortail, string>;
  /** Le « dès » de chaque modèle (prixDepartPortail, calculé par le serveur) ; null quand le serveur ne peut pas le donner. */
  departs: Record<SlugPortail, number | null>;
}) {
  const t = TXT[locale], tp = TEXTES_PORTAIL[locale];
  const [guide, setGuide] = useState<Reponses>({});
  const [tri, setTri] = useState<"croissant" | "decroissant">("croissant");
  const reponse = guidePortail(guide);
  const guidage = reponse?.guidage;
  const q = questionCourante(guide);
  const faites = repondues(guide);

  // Les dessins des quatre modèles, à la cote courante de chaque fiche.
  const dessins = Object.fromEntries(ORDRE.map((slug) => {
    const cfg = { ...configDepart(slug, STYLE_CARTE[slug]), ...(slug === "portail-coulissant" && guidage ? { guidage } : {}) };
    return [slug, planPortail(slug, cfg).vues.face as Prims];
  })) as Record<SlugPortail, Prims>;

  const euros = (n: number) => prixAffiche(n, locale);
  const ordre = useMemo(() => {
    const s = tri === "croissant" ? 1 : -1;
    return [...ORDRE].sort((a, c) => { const pa = departs[a], pc = departs[c]; if (pa == null || pc == null) return pa == null ? 1 : -1; return (pa - pc) * s; });
  }, [departs, tri]);

  const lien = (slug: SlugPortail) => `/${locale}/artisanat/${slug}${slug === "portail-coulissant" && guidage ? `?guidage=${guidage}` : ""}#configuration`;
  /** Répondre : les réponses d'avant sont gardées, la nouvelle s'ajoute, celles des questions d'après sont oubliées. */
  const repondre = (i: 0 | 1 | 2, v: boolean) => setGuide((g) => {
    const gardees = Object.fromEntries(CLES.slice(0, i).map((k) => [k, g[k]]));
    return { ...gardees, [CLES[i]]: v } as Reponses;
  });
  /** Revenir sur une réponse : elle et les suivantes sont effacées. */
  const modifier = (i: 0 | 1 | 2) => setGuide((g) => Object.fromEntries(CLES.slice(0, i).map((k) => [k, g[k]])) as Reponses);
  const raison = reponse ? tp.guideRaison[reponse.slug === "portail-battant" ? "battant" : reponse.slug === "portail-pliant" ? "pliant" : reponse.guidage === "auto" ? "auto" : "rail"] : "";
  const prixConseille = reponse ? departs[reponse.slug] : null;

  return (
    <div className="cpt pg">
      {/* 1. Les questions, une à la fois, puis le résultat en grand. */}
      <section className="carte-verre pg-carte" aria-labelledby="pg-guide">
        <h2 id="pg-guide" className={`${serif.className} pg-titre`}>{t.guide}</h2>
        <p className="pg-sous">{t.guideSous}</p>

        {faites.length > 0 && (
          <ul className="pg-pastilles" aria-label={t.reponses}>
            {faites.map((i) => (
              <li key={i}>
                <button type="button" className="pg-pastille" onClick={() => modifier(i)} title={tp.guideModifier} aria-label={`${tp.guidePuce[i]}: ${guide[CLES[i]] ? tp.oui : tp.non}. ${tp.guideModifier}`}>
                  <span className={`pg-pastille-signe ${guide[CLES[i]] ? "oui" : "non"}`} aria-hidden="true">{guide[CLES[i]] ? "✓" : "✕"}</span>
                  <span>{tp.guidePuce[i]}{locale === "fr" ? "\u00a0: " : ": "}<b>{guide[CLES[i]] ? tp.oui : tp.non}</b></span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {q !== null && (
          <div className="pg-q" key={q}>
            <p className="pg-q-etape">{t.question(q + 1)}</p>
            <div className="pg-q-corps">
              <SchemaGuide question={q} locale={locale} label={t.schema[q]} />
              <div className="pg-q-droite">
                <h3 className="pg-q-titre">{tp.guideQ[q]}</h3>
                <p className="pg-q-aide">{tp.guideAide[q]}</p>
                <div className="pg-reps" role="group" aria-label={tp.guideQ[q]}>
                  <button type="button" className="pg-rep oui" onClick={() => repondre(q, true)}><span className="pg-rep-signe" aria-hidden="true">✓</span>{tp.guideOui[q]}</button>
                  <button type="button" className="pg-rep non" onClick={() => repondre(q, false)}><span className="pg-rep-signe" aria-hidden="true">✕</span>{tp.guideNon[q]}</button>
                </div>
                <details className="pg-plus">
                  <summary>{tp.guideAideLien}</summary>
                  <p>{tp.guideVocab}</p>
                  <p>{tp.guideCtx[q]}</p>
                  <p className="pg-plus-verif"><b>{tp.guideVerifTitre}.</b> {tp.guideVerif[q]}</p>
                </details>
              </div>
            </div>
          </div>
        )}

        {reponse && (
          <div className="pg-resultat" role="status" aria-live="polite">
            <div className="pg-res-dessin"><Vue prims={dessins[reponse.slug]} couleur="anthracite" sansCotes label={`${noms[reponse.slug]}, ${t.vuRue}`} /></div>
            <div className="pg-res-texte">
              <p className="pg-res-kicker">{tp.guideConseil}</p>
              <p className={`pg-res-nom ${serif.className}`}>{noms[reponse.slug]}</p>
              {reponse.guidage && <p className="pg-res-variante">{reponse.guidage === "rail" ? t.rail : t.auto}</p>}
              <p className="pg-res-raison">{raison}</p>
              {prixConseille != null && <p className="pg-res-prix">{t.voirPrix(euros(prixConseille))}</p>}
              <div className="pg-res-actions">
                <Link href={lien(reponse.slug)} className="pg-res-cta">{t.composer}</Link>
                <button type="button" className="pg-res-refaire" onClick={() => setGuide({})}>{tp.guideRefaire}</button>
              </div>
            </div>
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
