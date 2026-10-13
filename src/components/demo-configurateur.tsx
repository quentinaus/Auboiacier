import Link from "next/link";
import "./demo-configurateur.css";
import { prixAffiche } from "@/lib/ui";
import type { Locale } from "@/lib/i18n";

/**
 * Le mini-configurateur de l'accueil (Quentin, 13/10/2026, sur « Configurez votre pièce » : « ça ne donne pas envie de
 * configurer »). Une table dessinée à ses cotes, une longueur qui glisse, un prix qui suit : exactement ce que fait le vrai
 * configurateur, en trois images qui se fondent l'une dans l'autre (opacité et transform seulement : fluide dans Safari,
 * jamais de JavaScript). Les prix viennent du barème public de la fiche (computeUnitPrice), jamais écrits ici. L'animation
 * ne joue que lorsque le bloc est visible ; « réduire les animations » : la première image reste fixe.
 */
export type EtatDemo = { longueurCm: number; prix: number };

const TXT = {
  fr: { exemple: "Exemple : une table sur mesure", longueur: "Longueur", prix: "Votre prix", cta: "Configurer ma table", largeur: "Largeur" },
  en: { exemple: "Example: a made-to-measure table", longueur: "Length", prix: "Your price", cta: "Configure my table", largeur: "Width" },
} as const;

/** Les bornes du curseur du vrai configurateur (en cm) : la position du pouce reste fidèle. */
const MIN_CM = 80;
const MAX_CM = 450;

/** Une cote : une pastille blanche posée sur le trait. */
function etiquette(at: [number, number], text: string) {
  return (
    <g transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})`}>
      <rect x={-27} y={-10} width={54} height={20} rx={10} fill="#fff" stroke="#c9bcab" />
      <text textAnchor="middle" y={4.5} fontSize={12.5} fontWeight={600} fill="#2b2320" fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif">{text}</text>
    </g>
  );
}

/** Une table en perspective isométrique, à l'échelle, dans un cadre de 400 × 230. */
function Table({ longueurCm, largeurCm, epaisseurCm, labels }: { longueurCm: number; largeurCm: number; epaisseurCm: number; labels: { l: string; w: string } }) {
  const c = 0.866, s = 0.5, k = 0.93;
  // L'épaisseur est un peu forcée : à 4,5 cm, le chant ne se verrait pas.
  const t = Math.max(epaisseurCm * 1.6, 9);
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * c * k, (x + y) * s * k - z];
  const L = longueurCm, W = largeurCm;
  const pts = { A: P(0, 0, t), B: P(L, 0, t), C: P(L, W, t), D: P(0, W, t), B0: P(L, 0, 0), C0: P(L, W, 0), D0: P(0, W, 0) };
  // Les deux cotes : parallèles aux arêtes du bas, en retrait de la table.
  const off = 26;
  const l1 = P(0, W + off, 0), l2 = P(L, W + off, 0);
  const w1 = P(L + off, 0, 0), w2 = P(L + off, W, 0);
  // Centré dans le cadre, cotes comprises.
  const tous = [...Object.values(pts), l1, l2, w1, w2];
  const xs = tous.map((p) => p[0]), ys = tous.map((p) => p[1]);
  const ox = 200 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const oy = 120 - (Math.min(...ys) + Math.max(...ys)) / 2;
  const f = (p: [number, number]) => `${(p[0] + ox).toFixed(1)},${(p[1] + oy).toFixed(1)}`;
  const poly = (...p: [number, number][]) => p.map(f).join(" ");
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2 + ox, (a[1] + b[1]) / 2 + oy];
  const ml = mid(l1, l2), mw = mid(w1, w2);
  return (
    <svg viewBox="0 0 400 240" className="dc-svg" role="img" aria-label={`${L} × ${W} cm`}>
      <defs>
        <linearGradient id={`dc-top-${L}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecd5ae" />
          <stop offset="1" stopColor="#dcbd8c" />
        </linearGradient>
      </defs>
      <polygon points={poly(pts.D, pts.C, pts.C0, pts.D0)} fill="#c39a63" />
      <polygon points={poly(pts.B, pts.C, pts.C0, pts.B0)} fill="#a97f4a" />
      <polygon points={poly(pts.A, pts.B, pts.C, pts.D)} fill={`url(#dc-top-${L})`} stroke="#9c7a4c" strokeWidth="0.8" strokeLinejoin="round" />
      {/* le fil du bois */}
      {[0.22, 0.42, 0.62, 0.8].map((q) => (
        <polyline key={q} points={poly(P(L * 0.04, W * q, t), P(L * 0.96, W * q, t))} fill="none" stroke="#b58f5b" strokeWidth="0.7" opacity="0.35" />
      ))}
      <line x1={l1[0] + ox} y1={l1[1] + oy} x2={l2[0] + ox} y2={l2[1] + oy} stroke="#6f6357" strokeWidth="1.2" />
      <line x1={w1[0] + ox} y1={w1[1] + oy} x2={w2[0] + ox} y2={w2[1] + oy} stroke="#6f6357" strokeWidth="1.2" />
      {etiquette(ml, `${L} cm`)}
      {etiquette(mw, `${W} cm`)}
      <title>{labels.l}</title>
    </svg>
  );
}

export function DemoConfigurateur({ etats, largeurCm, epaisseurMm, lienTable, locale }: { etats: EtatDemo[]; largeurCm: number; epaisseurMm: number; lienTable: string; locale: Locale }) {
  const t = TXT[locale === "en" ? "en" : "fr"];
  if (etats.length !== 3) return null;
  /** Position du pouce sur le rail, de 0 à 1 (le rail lui-même change de largeur selon l'écran : voir le CSS). */
  const frac = (cm: number) => ((cm - MIN_CM) / (MAX_CM - MIN_CM)).toFixed(3);
  const cls = ["dc-a", "dc-b", "dc-c"];
  const unite = locale === "en" ? "cm" : "cm";
  return (
    <div className="dc" style={{ ["--dc-f0" as string]: frac(etats[0].longueurCm), ["--dc-f1" as string]: frac(etats[1].longueurCm), ["--dc-f2" as string]: frac(etats[2].longueurCm) }}>
      <p className="dc-exemple">{t.exemple}</p>
      <div className="dc-scene" aria-hidden="true">
        {etats.map((e, i) => (
          <div key={e.longueurCm} className={`dc-etat ${cls[i]}`}>
            <Table longueurCm={e.longueurCm} largeurCm={largeurCm} epaisseurCm={epaisseurMm / 10} labels={{ l: t.longueur, w: t.largeur }} />
          </div>
        ))}
      </div>
      <div className="dc-rang" aria-hidden="true">
        <span className="dc-lib">{t.longueur}</span>
        <span className="dc-rail"><i className="dc-pouce" /></span>
        <span className="dc-valeur">
          {etats.map((e, i) => (<span key={e.longueurCm} className={`dc-etat ${cls[i]}`}>{e.longueurCm}&nbsp;{unite}</span>))}
        </span>
      </div>
      <div className="dc-prix" aria-live="off">
        <span className="dc-lib">{t.prix}</span>
        <span className="dc-montant" aria-hidden="true">
          {etats.map((e, i) => (<span key={e.longueurCm} className={`dc-etat ${cls[i]}`}>{prixAffiche(e.prix, locale)}</span>))}
        </span>
        <span className="sr-only">{locale === "fr" ? `à partir de ${prixAffiche(etats[0].prix, locale)}` : `from ${prixAffiche(etats[0].prix, locale)}`}</span>
      </div>
      <Link href={lienTable} className="dc-cta">{t.cta}<span aria-hidden="true"> →</span></Link>
    </div>
  );
}
