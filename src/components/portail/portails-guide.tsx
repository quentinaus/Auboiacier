"use client";

/**
 * La page des portails (Quentin, 10/10/2026) : d'abord les trois questions qui disent quel portail convient chez lui, puis
 * ses mesures, puis les quatre modèles dessinés à ses cotes avec leur « dès … € posé », triés par prix (bouton comme le
 * garde-corps). Chaque modèle mène à sa fiche, cotes et guidage déjà remplis. Les dessins viennent du moteur de l'outil ;
 * les prix du serveur (/api/prix-portail?modeles=1).
 */
import "./configurateur-portail.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { bornesPortail, configDepart, guidePortail, planPortail, SLUGS_PORTAIL, TEXTES_PORTAIL, type Langue, type SlugPortail, type StylePortail } from "@/lib/portails";
import { prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";
import { LigneCote, Pilule, Vue } from "@/components/portail-configurateur";

type Prims = { t: string; [k: string]: unknown }[];
/** Le style dessiné sur la carte de chaque modèle (celui de la fiche au premier affichage). */
const STYLE_CARTE: Record<SlugPortail, StylePortail> = { "portail-battant": "lamesChene", "portail-coulissant": "plein", "portail-pliant": "barreaux", portillon: "rosace" };
const ORDRE: SlugPortail[] = ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"];

const TXT = {
  fr: {
    guide: "Quel portail chez vous ?", guideSous: "Trois questions, dans l'ordre : le site vous dit quel modèle convient à votre entrée.",
    conseil: "Le bon modèle chez vous :", conseilNote: { "portail-battant": "la place d'un vantail est libre derrière.", "portail-coulissant": "pas de place derrière, mais de la place le long de la clôture.", "portail-pliant": "ni derrière, ni sur le côté : chaque vantail se plie en deux.", portillon: "" },
    rail: "sur rail", auto: "sans rail (autoportant)",
    mesures: "Vos mesures", mesuresSous: "Au plus étroit, d'un pilier à l'autre. Vous les corrigerez sur la fiche.", passage: "Passage entre piliers", hauteur: "Hauteur",
    infoPassage: "Mesurez au plus étroit, entre les deux piliers, en haut et en bas.", infoHauteur: "La hauteur du portail, sans les pointes.", aCorriger: "à corriger",
    modeles: "Les modèles", modelesSous: "Prix posé à vos cotes, dans le style le moins cher, sans moteur. Tout se compose ensuite sur la fiche.",
    des: "dès", aEtudier: "À étudier à la visite", calcul: "Calcul…", conseille: "Conseillé pour vous", ouvrir: "Composer ce portail", portillonNote: "Pour les piétons, seul ou assorti au portail.",
    triCroissant: "Prix croissant", triDecroissant: "Prix décroissant", triTitre: "Inverser l'ordre des prix",
    vuRue: "Vu depuis la rue", oui: "Oui", non: "Non",
  },
  en: {
    guide: "Which gate for your entrance?", guideSous: "Three questions, in order: the site tells you which model suits your entrance.",
    conseil: "The right model for you:", conseilNote: { "portail-battant": "there is room for one leaf to swing behind.", "portail-coulissant": "no room behind, but room along the fence.", "portail-pliant": "neither behind nor to the side: each leaf folds in two.", portillon: "" },
    rail: "on a rail", auto: "no rail (cantilever)",
    mesures: "Your measurements", mesuresSous: "At the narrowest point, pillar to pillar. You can adjust them on the model page.", passage: "Opening between pillars", hauteur: "Height",
    infoPassage: "Measure at the narrowest point between the two pillars, top and bottom.", infoHauteur: "The height of the gate, without spear tips.", aCorriger: "to fix",
    modeles: "The models", modelesSous: "Fitted price at your size, in the least expensive style, without motor. Everything is then composed on the model page.",
    des: "from", aEtudier: "To be studied at the visit", calcul: "Calculating…", conseille: "Recommended for you", ouvrir: "Compose this gate", portillonNote: "For pedestrians, alone or matching the gate.",
    triCroissant: "Price: low to high", triDecroissant: "Price: high to low", triTitre: "Reverse the price order",
    vuRue: "Seen from the street", oui: "Yes", non: "No",
  },
} as const;

export function PortailsGuide({ locale, noms, taglines }: { locale: Langue; noms: Record<SlugPortail, string>; taglines: Record<SlugPortail, string> }) {
  const t = TXT[locale], tp = TEXTES_PORTAIL[locale];
  const b = bornesPortail("portail-battant");
  const [P, setP] = useState(3500);
  const [H, setH] = useState(1600);
  const [guide, setGuide] = useState<{ derriere?: boolean; cote?: boolean; sol?: boolean }>({});
  const [tri, setTri] = useState<"croissant" | "decroissant">("croissant");
  const [prix, setPrix] = useState<{ cle: string; valeurs: Record<SlugPortail, number | null> | null } | null>(null);
  const reponse = guidePortail(guide);
  const guidage = reponse?.guidage;

  // Les dessins des quatre modèles à ces cotes (le portillon garde sa largeur : les cotes sont celles du portail).
  const dessins = useMemo(() => Object.fromEntries(ORDRE.map((slug) => {
    const cfg = { ...configDepart(slug, STYLE_CARTE[slug]), H, ...(slug === "portillon" ? {} : { P }), ...(slug === "portail-coulissant" && guidage ? { guidage } : {}) };
    const bb = bornesPortail(slug);
    if (cfg.P < bb.P[0] || cfg.P > bb.P[1]) return [slug, null];
    return [slug, planPortail(slug, cfg).vues.face as Prims];
  })) as Record<SlugPortail, Prims | null>, [P, H, guidage]);

  // Les « dès » du serveur, une fois la frappe posée.
  const cle = `${P}x${H}`;
  useEffect(() => {
    let annule = false;
    const minuteur = setTimeout(async () => {
      let valeurs: Record<SlugPortail, number | null> | null = null;
      try { const rep = await fetch(`/api/prix-portail?modeles=1&P=${P}&H=${H}`); if (rep.ok) valeurs = (await rep.json()) as Record<SlugPortail, number | null>; } catch { valeurs = null; }
      if (!annule) setPrix({ cle, valeurs });
    }, 320);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [cle, P, H]);
  const V = prix?.valeurs ?? null, perime = prix?.cle !== cle;
  const euros = (n: number) => prixAffiche(n, locale);

  const ordre = useMemo(() => {
    if (!V) return ORDRE;
    const s = tri === "croissant" ? 1 : -1;
    return [...ORDRE].sort((a, c) => { const pa = V[a], pc = V[c]; if (pa == null || pc == null) return pa == null ? 1 : -1; return (pa - pc) * s; });
  }, [V, tri]);

  const lien = (slug: SlugPortail) => `/${locale}/artisanat/${slug}?P=${slug === "portillon" ? configDepart(slug).P : P}&H=${H}${slug === "portail-coulissant" && reponse?.guidage ? `&guidage=${reponse.guidage}` : ""}#configuration`;

  return (
    <div className="cpt pg">
      {/* 1. Les trois questions. */}
      <section className="carte-verre pg-carte" aria-labelledby="pg-guide">
        <h2 id="pg-guide" className={serif.className}>{t.guide}</h2>
        <p className="pg-sous">{t.guideSous}</p>
        {tp.guideQ.map((q, i) => {
          const cleQ = (["derriere", "cote", "sol"] as const)[i];
          const visible = i === 0 || (i === 1 && guide.derriere === false) || (i === 2 && guide.derriere === false && guide.cote === true);
          if (!visible) return null;
          return (
            <div key={cleQ} className="pg-question">
              <p>{q}</p>
              <Pilule aria={q} valeur={guide[cleQ] === undefined ? "" : guide[cleQ] ? "oui" : "non"}
                onChange={(x) => setGuide((g) => ({ ...g, [cleQ]: x === "oui", ...(i === 0 ? { cote: undefined, sol: undefined } : i === 1 ? { sol: undefined } : {}) }))}
                options={[{ v: "oui", label: t.oui }, { v: "non", label: t.non }]} />
            </div>
          );
        })}
        {reponse && (
          <p className="cpt-f-info pg-conseil">{t.conseil} <b>{noms[reponse.slug]}{reponse.guidage ? ` (${reponse.guidage === "rail" ? t.rail : t.auto})` : ""}</b> — {t.conseilNote[reponse.slug]}</p>
        )}
      </section>

      {/* 2. Les mesures. */}
      <section className="carte-verre pg-carte" aria-labelledby="pg-mesures">
        <h2 id="pg-mesures" className={serif.className}>{t.mesures}</h2>
        <p className="pg-sous">{t.mesuresSous}</p>
        <div className="pg-cotes">
          <LigneCote picto="passage" titre={t.passage} info={t.infoPassage} valeur={P} bornes={[Math.min(b.P[0], bornesPortail("portail-pliant").P[0]), Math.max(b.P[1], bornesPortail("portail-coulissant").P[1])]} onChange={setP} aCorriger={t.aCorriger} />
          <LigneCote picto="hauteur" titre={t.hauteur} info={t.infoHauteur} valeur={H} bornes={b.H} onChange={setH} aCorriger={t.aCorriger} />
        </div>
      </section>

      {/* 3. Les modèles, triés par prix. */}
      <section aria-labelledby="pg-modeles" className="pg-modeles">
        <div className="pg-modeles-tete">
          <div><h2 id="pg-modeles" className={serif.className}>{t.modeles}</h2><p className="pg-sous">{t.modelesSous}</p></div>
          <button type="button" className="cpt-tri" onClick={() => setTri((v) => (v === "croissant" ? "decroissant" : "croissant"))} title={t.triTitre}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={tri === "croissant" ? "M10 16V4M10 4l-4 4M10 4l4 4" : "M10 4v12M10 16l-4-4M10 16l4-4"} /></svg>
            {tri === "croissant" ? t.triCroissant : t.triDecroissant}
          </button>
        </div>
        <ul className={`pg-grille ${perime ? "perimee" : ""}`}>
          {ordre.map((slug) => {
            const p = V ? V[slug] : undefined, prims = dessins[slug], conseille = reponse?.slug === slug;
            return (
              <li key={slug} className={`carte-verre pg-modele ${conseille ? "conseille" : ""}`}>
                {conseille && <span className="pg-badge">{t.conseille}</span>}
                <div className="pg-dessin">{prims ? <Vue prims={prims} couleur={slug === "portillon" ? "noir" : "anthracite"} sansCotes label={`${noms[slug]}, ${t.vuRue}`} /> : <span className="pg-vide">{t.aEtudier}</span>}</div>
                <h3 className={serif.className}>{noms[slug]}</h3>
                <p className="pg-tagline">{slug === "portillon" ? t.portillonNote : taglines[slug]}</p>
                <p className="pg-prix">{p === undefined ? t.calcul : p === null ? t.aEtudier : `${t.des} ${euros(p)}`}</p>
                <Link href={lien(slug)} className="btn-verre pg-cta">{t.ouvrir}</Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
