"use client";

/**
 * La vue de dessus animée d'un portail : il s'ouvre et se ferme en boucle, et l'on voit la place qu'il prend chez le
 * client (Quentin, 10/10/2026 : « ajoute ce modèle des bras qui se plie et déplie au site », d'après l'étude du 06/10).
 * Les cotes viennent du plan de l'outil (passage, longueur des vantaux ou des panneaux, place à laisser libre) ; seule la
 * mise en mouvement est faite ici. Le plan « Voir le plan » garde la vue de dessus de l'outil, fixe.
 * Repère : l'écran, y vers le bas ; la rue en bas, la propriété en haut ; tout en mm.
 */
import { useEffect, useRef } from "react";
import { TEINTES_PORTAIL } from "@/lib/portails-rendu";
import type { ConfigPortail } from "@/lib/portails";

const PILIER = 300, EP = 40;
/** Le cycle de l'étude : ouvert (on voit la place prise), fermeture, fermé, ouverture. */
const CYCLE = 7600;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function phase(ms: number) {
  const t = ms % CYCLE;
  if (t < 2400) return 1;
  if (t < 4600) return 1 - ease((t - 2400) / 2200);
  if (t < 5600) return 0;
  return ease((t - 5600) / 2000);
}
const f = (n: number) => n.toFixed(1);

export type VueOuvertureProps = {
  type: "battant" | "coulissant" | "pliant" | "portillon";
  P: number;
  /** Les vantaux (ou les quatre panneaux du pliant) tels que l'outil les a dessinés, de gauche à droite vus de la rue. */
  vantaux: number[];
  sens: ConfigPortail["sens"];
  guidage: ConfigPortail["guidage"];
  /** La place à laisser libre, lue dans le résumé de l'outil (mm) ; null si l'outil ne la donne pas. */
  place: number | null;
  couleur: ConfigPortail["couleur"];
  label: string;
  className?: string;
};

export function VueOuverture({ type, P, vantaux, sens, guidage, place, couleur, label, className }: VueOuvertureProps) {
  const [c, , d] = TEINTES_PORTAIL[couleur] ?? TEINTES_PORTAIL.anthracite;
  const mobiles = useRef<(SVGGElement | null)[]>([]);
  const coul = type === "coulissant";
  const Lv = vantaux[0] ?? P / 2;
  const placeMm = place ?? (coul ? Lv : Math.max(...vantaux) + 80);
  // Le cadre : assez haut pour le portail ouvert, assez large pour le coulissant rangé le long de la clôture.
  const haut = coul ? 1150 : type === "pliant" ? (vantaux[0] ?? P / 4) + 420 : placeMm + 320;
  const gauche = coul && sens === "gauche" ? -placeMm - 200 : -PILIER - 500;
  const droite = coul && sens === "droite" ? P + placeMm + 200 : P + PILIER + 500;
  const bas = coul ? 360 : 420;
  const vb = `${f(gauche)} ${f(-haut)} ${f(droite - gauche)} ${f(haut + bas)}`;

  // Les pièces fixes : la rue, les murets, les piliers, la place à laisser libre (en vert, comme l'outil).
  const zone = (() => {
    if (coul) {
      const x0 = sens === "gauche" ? -placeMm : P, x1 = sens === "gauche" ? 0 : P + placeMm;
      // Le coulissant est très large : la bande de la place libre est épaissie pour rester lisible dans le médaillon.
      return <rect x={f(x0)} y={f(-900)} width={f(x1 - x0)} height={f(880)} className="vo-zone" />;
    }
    const r = placeMm, quart = (hx: number, versDroite: boolean) =>
      `M${f(hx)} 0 L${f(hx + (versDroite ? r : -r))} 0 A${f(r)} ${f(r)} 0 0 ${versDroite ? 0 : 1} ${f(hx)} ${f(-r)} Z`;
    if (type === "pliant") return <>{<path d={quart(0, true)} className="vo-zone" />}{<path d={quart(P, false)} className="vo-zone" />}</>;
    if (vantaux.length === 1) return <path d={quart(sens === "droite" ? P : 0, sens !== "droite")} className="vo-zone" />;
    return <>{<path d={quart(0, true)} className="vo-zone" />}{<path d={quart(P, false)} className="vo-zone" />}</>;
  })();

  // Les parties mobiles : chacune reçoit, à chaque image, sa position selon e (0 fermé, 1 ouvert).
  type Mobile = { rendu: React.ReactNode; placer: (g: SVGGElement, e: number) => void };
  const vantail = (long: number, hingeX: number, versDroite: boolean, k: number): Mobile => ({
    rendu: <g key={k} ref={(el) => { mobiles.current[k] = el; }}><rect x={f(versDroite ? 0 : -long)} y={f(-EP / 2)} width={f(long)} height={f(EP)} fill={c} stroke={d} strokeWidth="6" /><circle r="34" fill="#fff" stroke={d} strokeWidth="6" /></g>,
    placer: (g, e) => g.setAttribute("transform", `translate(${f(hingeX)} 0) rotate(${f(versDroite ? -90 * e : 90 * e)})`),
  });
  const mobilesDef: Mobile[] = [];
  if (type === "battant" || type === "portillon") {
    if (vantaux.length === 1) mobilesDef.push(vantail(vantaux[0], sens === "droite" ? P : 0, sens !== "droite", 0));
    else { mobilesDef.push(vantail(vantaux[0], 0, true, 0)); mobilesDef.push(vantail(vantaux[1], P, false, 1)); }
  } else if (type === "pliant") {
    // Chaque vantail : un panneau côté pilier qui tourne, un panneau côté centre qui se replie sur lui (le bout glisse).
    const [p1, p2, p3, p4] = vantaux.length === 4 ? vantaux : [Lv / 2, Lv / 2, Lv / 2, Lv / 2];
    const paire = (hx: number, a: number, b: number, s: 1 | -1, k: number): Mobile => ({
      rendu: (
        <g key={k} ref={(el) => { mobiles.current[k] = el; }}>
          <g data-p="1"><rect x={f(s > 0 ? 0 : -a)} y={f(-EP / 2)} width={f(a)} height={f(EP)} fill={c} stroke={d} strokeWidth="6" /><circle r="34" fill="#fff" stroke={d} strokeWidth="6" /></g>
          <g data-p="2"><rect x={f(s > 0 ? 0 : -b)} y={f(-EP / 2)} width={f(b)} height={f(EP)} fill={c} stroke={d} strokeWidth="6" /><circle r="30" fill="#fff" stroke={d} strokeWidth="6" /></g>
        </g>
      ),
      placer: (g, e) => {
        const a1 = -90 * e * s, a2 = a1 + 180 * e * s;
        const r1 = (a1 * Math.PI) / 180;
        const ex = hx + (s > 0 ? a : -a) * Math.cos(r1), ey = (s > 0 ? a : -a) * Math.sin(r1);
        (g.firstElementChild as SVGGElement).setAttribute("transform", `translate(${f(hx)} 0) rotate(${f(a1)})`);
        (g.lastElementChild as SVGGElement).setAttribute("transform", `translate(${f(ex)} ${f(ey)}) rotate(${f(a2)})`);
      },
    });
    mobilesDef.push(paire(0, p1, p2, 1, 0), paire(P, p4, p3, -1, 1));
  } else {
    // Coulissant : le portail glisse derrière la clôture, du côté où il se range ; l'autoportant emmène sa queue.
    const debord = (Lv - P) / 2, queue = guidage === "auto" ? Math.max(0, placeMm - Lv) : 0;
    const dx = sens === "gauche" ? -P : P;
    mobilesDef.push({
      rendu: (
        <g key={0} ref={(el) => { mobiles.current[0] = el; }}>
          <rect x={f(-debord)} y={f(-560)} width={f(Lv)} height={f(200)} fill={c} stroke={d} strokeWidth="6" />
          {queue > 0 && <rect x={f(sens === "gauche" ? -debord - queue : P + debord)} y={f(-510)} width={f(queue)} height={f(100)} fill="none" stroke={d} strokeWidth="12" />}
        </g>
      ),
      placer: (g, e) => g.setAttribute("transform", `translate(${f(dx * e)} 0)`),
    });
  }

  useEffect(() => {
    const placer = (e: number) => mobilesDef.forEach((m, k) => { const g = mobiles.current[k]; if (g) m.placer(g, e); });
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    placer(1);
    if (reduit) return;
    let id = 0;
    const t0 = performance.now();
    const boucle = (now: number) => { if (!document.hidden) placer(phase(now - t0)); id = requestAnimationFrame(boucle); };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, P, vantaux.join(","), sens, guidage, placeMm]);

  return (
    <svg role="img" aria-label={label} viewBox={vb} className={`vo ${className ?? ""}`} preserveAspectRatio="xMidYMid meet">
      <style>{`.vo-zone{fill:rgba(63,107,58,0.13);stroke:#3f6b3a;stroke-width:6;stroke-dasharray:28 18}.vo-mur{fill:#eee8df;stroke:#b5a690;stroke-width:5}.vo-pilier{fill:#dcd2c3;stroke:#b8a993;stroke-width:6}.vo-rue{fill:#f1ede7}`}</style>
      <rect x={f(gauche)} y="0" width={f(droite - gauche)} height={f(bas)} className="vo-rue" />
      <rect x={f(gauche)} y={f(-60)} width={f(-PILIER - gauche)} height="60" className="vo-mur" />
      <rect x={f(P + PILIER)} y={f(-60)} width={f(droite - P - PILIER)} height="60" className="vo-mur" />
      {coul && <line x1={f(-80)} y1={f(-60)} x2={f(P + 80)} y2={f(-60)} stroke="#a89c8e" strokeWidth="4" strokeDasharray="10 14" />}
      {zone}
      <rect x={f(-PILIER)} y={f(-PILIER / 2)} width={f(PILIER)} height={f(PILIER)} className="vo-pilier" />
      <rect x={f(P)} y={f(-PILIER / 2)} width={f(PILIER)} height={f(PILIER)} className="vo-pilier" />
      {mobilesDef.map((m) => m.rendu)}
    </svg>
  );
}
