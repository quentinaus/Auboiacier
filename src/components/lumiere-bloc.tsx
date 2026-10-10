"use client";

/**
 * Le bloc « Configuration » des plafonds lumineux (Lucarne, Halo), au gabarit du portail (Quentin, 10/10/2026 : « le même
 * bloc que celui du portail, sans les mêmes options » — il n'aimait pas « le petit tableau de configuration »).
 *
 * Ici seulement les MORCEAUX qui se voient : la rangée des plaquettes de couleur, une ligne de cote (picto, curseur,
 * pastille, bouton « i »), les deux tuiles de forme et le récapitulatif de la colonne d'achat. L'état, le prix, le panier,
 * la livraison et le prélancement restent dans product-options.tsx, qui dépose ces morceaux dans les emplacements de
 * product-view.tsx par portails — exactement comme le garde-corps. Rien n'est recalculé ici.
 *
 * Choix d'architecture : étendre la mise en page trois colonnes du garde-corps (product-view.tsx, `troisColonnes`)
 * plutôt qu'un configurateur à part : la logique d'achat (panier, pose, code postal, « Être prévenu en priorité », mise de
 * côté, devis PDF) est dans ProductOptions et doit continuer de marcher à l'identique ; la dupliquer pour deux fiches
 * aurait fait deux paniers à entretenir.
 */
import "./lumiere/bloc-lumiere.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { MaterialBubble } from "./material-bubble";
import { prixAffiche } from "@/lib/ui";
import type { ProductSwatch } from "@/lib/products";

/* ---------- Les textes propres au bloc (le reste vient des dictionnaires) ---------- */
export const TXT_LUMIERE = {
  fr: {
    vosMesures: "Vos mesures",
    consigne: "Mesurez la surface lumineuse souhaitée.",
    votreForme: "Votre forme",
    formesNote: "Prix à vos cotes, cadre compris",
    des: "dès",
    infoLongueur: "La plus grande cote de la toile, d'un bord du cadre à l'autre.",
    infoLargeur: "La petite cote de la toile, d'un bord du cadre à l'autre.",
    infoDiametre: "Le diamètre de la toile, d'un bord du cadre à l'autre.",
    infoEpaisseur: "La profondeur du caisson, en millimètres : 180 mm suffisent à une lumière égale.",
    surface: "surface",
    ficheTechnique: "Voir la fiche technique",
    lucarne: "Lucarne",
    halo: "Halo",
    rectangle: "Rectangle",
    rond: "Rond",
    sansPrix: "—",
    allerVers: (nom: string) => `Voir ${nom} à ces cotes`,
  },
  en: {
    vosMesures: "Your measurements",
    consigne: "Measure the lit surface you want.",
    votreForme: "Your shape",
    formesNote: "Price at your size, frame included",
    des: "from",
    infoLongueur: "The longest side of the fabric, frame edge to frame edge.",
    infoLargeur: "The short side of the fabric, frame edge to frame edge.",
    infoDiametre: "The diameter of the fabric, frame edge to frame edge.",
    infoEpaisseur: "The depth of the box, in millimetres: 180 mm is enough for an even light.",
    surface: "surface",
    ficheTechnique: "See the technical sheet",
    lucarne: "Lucarne",
    halo: "Halo",
    rectangle: "Rectangle",
    rond: "Round",
    sansPrix: "—",
    allerVers: (nom: string) => `See ${nom} at this size`,
  },
} as const;

/* ---------- Pictos des cotes : le même trait fin que ceux du portail ---------- */
const PICTO_COTE = {
  longueur: "M2 9h14M4.5 6.6 2 9l2.5 2.4M13.5 6.6 16 9l-2.5 2.4",
  largeur: "M9 2v14M6.6 4.5 9 2l2.4 2.5M6.6 13.5 9 16l2.4-2.5",
  diametre: "M9 2.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M4.4 13.6 13.6 4.4",
  epaisseur: "M3 7h12v5H3zM3 7l2.5-2.5h12M15 7l2.5-2.5v5",
} as const;
export type PictoCoteLumiere = keyof typeof PICTO_COTE;
const PictoCote = ({ k }: { k: PictoCoteLumiere }) => (
  <svg viewBox="0 0 20 18" aria-hidden="true"><path d={PICTO_COTE[k]} fill="none" stroke="#6f6357" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/**
 * Une cote : son intitulé (picto, nom, « i »), puis le curseur et la pastille de saisie côte à côte, comme au portail
 * (.cpt-cote). La case garde la saisie telle que le client la tape (product-options.tsx la lit et la convertit) : le curseur
 * et la case pilotent la même cote en millimètres. Les bornes sont lues par les lecteurs d'écran (sr-only) et servent de
 * texte d'attente dans la case vide.
 */
export function LigneCoteLumiere({
  id, picto, titre, info, valeur, onChange, unite, bornes, curseur, onFocus, onBlur, erreurId,
}: {
  id: string;
  picto: PictoCoteLumiere;
  titre: string;
  info: string;
  valeur: string;
  onChange: (valeur: string) => void;
  unite: string;
  bornes: string;
  curseur: { minMm: number; maxMm: number; valeurMm: number; onChangeMm: (mm: number) => void; stepMm?: number };
  onFocus?: () => void;
  onBlur?: () => void;
  erreurId?: string;
}) {
  const bornesId = `${id}-bornes`;
  const infoId = `${id}-info`;
  const valeurCurseur = Number.isFinite(curseur.valeurMm) ? Math.min(curseur.maxMm, Math.max(curseur.minMm, curseur.valeurMm)) : curseur.minMm;
  return (
    <div className="lum-cote">
      <div className="lum-cote-titre">
        <PictoCote k={picto} />
        <label htmlFor={id} className="lum-ct-nom">{titre}</label>
        {/* Le « i » : la phrase d'aide en bulle (title) et lue au clavier (aria-describedby sur la case). */}
        <span className="lum-info" id={infoId} title={info} aria-label={info} role="note">i</span>
      </div>
      <div className="lum-cote-rang">
        <input
          type="range"
          className={`curseur-cote ${valeur === "" ? "curseur-vide" : ""}`}
          min={curseur.minMm}
          max={curseur.maxMm}
          step={curseur.stepMm ?? 10}
          value={valeurCurseur}
          aria-label={titre}
          aria-describedby={bornesId}
          onChange={(e) => curseur.onChangeMm(Number(e.target.value))}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <span className="lum-pastille rounded-full border-[#9a8d80] bg-white">
          <input
            id={id}
            inputMode="decimal"
            value={valeur}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={bornes}
            aria-describedby={[bornesId, infoId, erreurId].filter(Boolean).join(" ")}
            aria-invalid={erreurId ? true : undefined}
          />
          <span>{unite}</span>
          <span id={bornesId} className="sr-only">{bornes} {unite}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * La rangée du titre : « Couleur du cadre », les six plaquettes et le nom de la couleur choisie (comme la rangée
 * couleur / matière du portail). Les plaquettes sont les pastilles de matière du site (MaterialBubble), en miniature.
 */
export function PlaquettesCadre({ titre, options, choisi, onChoisir }: { titre: string; options: ProductSwatch[]; choisi: string; onChoisir: (id: string) => void }) {
  const actuel = options.find((o) => o.id === choisi);
  return (
    <div className="lum-matieres">
      <div className="lum-mat-groupe">
        <span className="lum-mat-titre">{titre}</span>
        <div role="group" aria-label={titre} className="lum-plaquettes">
          {options.map((o) => {
            const on = o.id === choisi;
            return (
              <button key={o.id} type="button" className="lum-plaquette-btn" aria-pressed={on} aria-label={o.label} title={o.label} onClick={() => onChoisir(o.id)}>
                <MaterialBubble material={o} selected={on} taille="miniature" className="aspect-[4/5] w-[22px]" />
              </button>
            );
          })}
        </div>
        {actuel && <span className="lum-mat-nom">{actuel.label}</span>}
      </div>
    </div>
  );
}

/**
 * Le dessin d'une forme pour sa tuile : la toile allumée vue de dessous, dans son cadre sombre — le même cadre et la même
 * lumière que le croquis coté (schema-cotes.tsx : chant #332d28, dégradé LUMIERE). Le rectangle se dessine aux proportions
 * des cotes du client (bornées, pour rester lisible) ; le rond est un rond.
 */
export function DessinForme({ forme, largeurMm, hauteurMm, teinte, label }: { forme: "rect" | "rond"; largeurMm?: number; hauteurMm?: number; teinte?: string; label: string }) {
  const W = 120, H = 64;
  const cadre = teinte ?? "#332d28";
  const idGrad = `lum-toile-${forme}`;
  let dessin: ReactNode;
  if (forme === "rond") {
    const r = 27;
    dessin = (
      <>
        <circle cx={W / 2} cy={H / 2} r={r} fill={cadre} />
        <circle cx={W / 2} cy={H / 2} r={r - 3.5} fill={`url(#${idGrad})`} />
      </>
    );
  } else {
    const L = largeurMm && largeurMm > 0 ? largeurMm : 1800;
    const l = hauteurMm && hauteurMm > 0 ? hauteurMm : 1180;
    const ratio = Math.min(3, Math.max(0.6, L / l));
    // La plus grande cote tient dans 100 px de large ou 54 px de haut : toujours la même marge.
    const k = Math.min(100 / ratio, 54);
    const w = ratio * k, h = k;
    const x = (W - w) / 2, y = (H - h) / 2;
    dessin = (
      <>
        <rect x={x} y={y} width={w} height={h} rx={2} fill={cadre} />
        <rect x={x + 3.5} y={y + 3.5} width={w - 7} height={h - 7} rx={1} fill={`url(#${idGrad})`} />
      </>
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="lum-dessin-svg">
      <defs>
        {/* Le dégradé de la toile allumée (LUMIERE, photo-plafond-anime.tsx), écrit en arrêts SVG. */}
        <linearGradient id={idGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9cfa0" /><stop offset="50%" stopColor="#f6c6d6" /><stop offset="100%" stopColor="#cbc2f5" />
        </linearGradient>
      </defs>
      {dessin}
    </svg>
  );
}

/**
 * Le bandeau « Votre forme » : la Lucarne (rectangle) et le Halo (rond), chacune avec son prix « dès » aux cotes du client.
 * La fiche courante est marquée (aria-pressed) ; l'autre est un lien vers sa fiche. Deux tuiles seulement : pas de tri.
 */
export function BandeauFormes({
  locale, courante, lucarne, halo, teinte, enCarte = false,
}: {
  locale: "fr" | "en";
  courante: "rect" | "rond";
  lucarne: { href: string; prix: number | null; largeurMm?: number; hauteurMm?: number };
  halo: { href: string; prix: number | null };
  teinte?: string;
  /** Dans la carte des mesures (téléphone) plutôt que dans le bandeau sous le croquis. */
  enCarte?: boolean;
}) {
  const t = TXT_LUMIERE[locale];
  const tuile = (forme: "rect" | "rond", nom: string, sousNom: string, href: string, prix: number | null) => {
    const on = courante === forme;
    const prixTxt = prix != null ? `${t.des} ${prixAffiche(prix, locale)}` : t.sansPrix;
    const contenu = (
      <>
        <span className="lum-dessin"><DessinForme forme={forme} largeurMm={lucarne.largeurMm} hauteurMm={lucarne.hauteurMm} teinte={teinte} label={nom} /></span>
        <span className="lum-t-nom">{nom} <span className="lum-t-sous">· {sousNom}</span></span>
        <span className="lum-t-prix">{prixTxt}</span>
      </>
    );
    return on ? (
      <button key={forme} type="button" className="tuile-modele lum-tuile" aria-pressed aria-label={`${nom}, ${prixTxt}`}>{contenu}</button>
    ) : (
      <Link key={forme} href={href} className="tuile-modele lum-tuile" aria-label={`${t.allerVers(nom)}${prix != null ? `, ${prixTxt}` : ""}`}>{contenu}</Link>
    );
  };
  return (
    <div className={enCarte ? "lum-formes lum-formes-carte" : "carte-verre lum-formes"}>
      <div className="lum-formes-tete"><strong>{t.votreForme}</strong><span className="lum-formes-note">{t.formesNote}</span></div>
      <div className="lum-tuiles" role="group" aria-label={t.votreForme}>
        {tuile("rect", t.lucarne, t.rectangle, lucarne.href, lucarne.prix)}
        {tuile("rond", t.halo, t.rond, halo.href, halo.prix)}
      </div>
    </div>
  );
}

/** Le haut de la colonne d'achat : « Lucarne · 1 800 × 1 180 mm », puis la surface, la puissance et le délai. */
export function RecapLumiere({ nom, cotes, ligne }: { nom: string; cotes: string | null; ligne: string | null }) {
  return (
    <div className="lum-recap">
      <p className="lum-r-nom">{nom}{cotes ? ` · ${cotes}` : ""}</p>
      {ligne && <p className="lum-r-ligne">{ligne}</p>}
    </div>
  );
}
