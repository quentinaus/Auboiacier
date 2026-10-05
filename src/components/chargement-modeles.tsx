"use client";

/**
 * Pendant que le serveur cherche les garde-corps aux normes pour la fenêtre du client (« ça a pris du temps à s'afficher
 * et on ne comprenait pas ce qui se passait », Quentin, 05/10) : un garde-corps qui se fabrique, dans le style en aplats
 * des films de la fiche — le cadre se trace, puis les croix une à une, un éclat de soudure à chaque croisement, les
 * rosaces, et la main courante en bois qui se pose. Une boucle de 2,8 s, et une phrase qui dit ce qui se passe.
 * Sans mouvement si le client a demandé moins d'animations : le garde-corps fini, immobile.
 */

/** Un trait qui se dessine entre deux instants de la boucle (en %), puis tient, puis s'efface avec le reste. */
const trace = (nom: string, debut: number, fin: number) =>
  `@keyframes ${nom}{0%,${debut}%{stroke-dashoffset:1;opacity:1}${fin}%,88%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}`;

/** Un éclat de soudure : il jaillit, puis s'éteint aussitôt. */
const eclat = (nom: string, a: number) =>
  `@keyframes ${nom}{0%,${a}%{opacity:0;transform:scale(.3)}${a + 3}%{opacity:1;transform:scale(1.15)}${a + 10}%,100%{opacity:0;transform:scale(1.5)}}`;

/** Une rosace qui se pose, avec un léger rebond. */
const rosace = (nom: string, a: number) =>
  `@keyframes ${nom}{0%,${a}%{transform:scale(0)}${a + 6}%{transform:scale(1.2)}${a + 10}%,88%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}}`;

const STYLES = `
.cm-scene .cm-anim { transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: no-preference) {
  .cm-scene .cm-trait { stroke-dasharray: 1; }
  .cm-scene .cm-anim, .cm-scene .cm-trait { animation-duration: 2.8s; animation-iteration-count: infinite; animation-timing-function: cubic-bezier(.45,0,.2,1); animation-fill-mode: both; }
  .cm-scene .cm-cadre { animation-name: cm-cadre; }
  .cm-scene .cm-montant { animation-name: cm-montant; }
  .cm-scene .cm-c1a { animation-name: cm-c1a; }
  .cm-scene .cm-c1b { animation-name: cm-c1b; }
  .cm-scene .cm-c2a { animation-name: cm-c2a; }
  .cm-scene .cm-c2b { animation-name: cm-c2b; }
  .cm-scene .cm-eclat1 { animation-name: cm-eclat1; animation-timing-function: ease-out; }
  .cm-scene .cm-eclat2 { animation-name: cm-eclat2; animation-timing-function: ease-out; }
  .cm-scene .cm-rosace1 { animation-name: cm-rosace1; }
  .cm-scene .cm-rosace2 { animation-name: cm-rosace2; }
  .cm-scene .cm-bois { animation-name: cm-bois; }
  ${trace("cm-cadre", 0, 13)}
  ${trace("cm-montant", 9, 17)}
  ${trace("cm-c1a", 16, 25)}
  ${trace("cm-c1b", 21, 30)}
  ${trace("cm-c2a", 33, 42)}
  ${trace("cm-c2b", 38, 47)}
  ${eclat("cm-eclat1", 29)}
  ${eclat("cm-eclat2", 46)}
  ${rosace("cm-rosace1", 50)}
  ${rosace("cm-rosace2", 54)}
  @keyframes cm-bois { 0%, 60% { transform: translateY(-15px); opacity: 0; } 65% { opacity: 1; } 71% { transform: translateY(1.6px); } 76%, 88% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(0); opacity: 0; } }
}
/* Sans animation : le garde-corps fini, sans éclats. */
@media (prefers-reduced-motion: reduce) {
  .cm-scene .cm-eclat { display: none; }
}
`;

/** Les pétales d'une rosace de fonderie, autour de (x, y). */
function Rosace({ x, y, classe }: { x: number; y: number; classe: string }) {
  return (
    <g className={`cm-anim ${classe}`}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <circle key={i} cx={x + Math.cos(a) * 4.2} cy={y + Math.sin(a) * 4.2} r="2.5" fill="#2b2320" />;
      })}
      <circle cx={x} cy={y} r="3.6" fill="#3d3532" />
      <circle cx={x} cy={y} r="1.5" fill="#c98a3a" />
    </g>
  );
}

/** Un éclat de soudure au croisement (x, y) : une lueur chaude et quelques étincelles. */
function Eclat({ x, y, classe }: { x: number; y: number; classe: string }) {
  return (
    <g className={`cm-anim cm-eclat ${classe}`} opacity="0">
      <circle cx={x} cy={y} r="9" fill="#ffd79a" opacity=".45" />
      <circle cx={x} cy={y} r="3.4" fill="#fff4dc" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 + 0.4;
        return (
          <path
            key={i}
            d={`M${x + Math.cos(a) * 5} ${y + Math.sin(a) * 5}L${x + Math.cos(a) * 11} ${y + Math.sin(a) * 11}`}
            stroke="#c98a3a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

export function ChargementModeles({ locale, texte }: { locale: "fr" | "en"; texte?: string }) {
  const fr = locale === "fr";
  return (
    <div role="status" aria-live="polite" className="cm-scene flex flex-col items-center gap-2 py-1">
      {/* Les styles une seule fois dans la page, même si l'animation est montrée à deux endroits. */}
      <style href="chargement-modeles" precedence="medium">
        {STYLES}
      </style>
      <svg viewBox="0 0 168 72" className="h-14 w-auto overflow-visible" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* L'ombre posée sous le garde-corps. */}
        <ellipse cx="84" cy="66" rx="74" ry="3.2" fill="rgba(43,35,32,.1)" />
        {/* La main courante en bois : elle se pose sur le cadre, à la fin. */}
        <g className="cm-anim cm-bois">
          <rect x="4" y="11" width="160" height="7.5" rx="2.5" fill="#c19a5e" />
          <rect x="6" y="11.6" width="156" height="2" rx="1" fill="#d8b984" />
        </g>
        {/* Le cadre, le montant du milieu, puis les deux croix. */}
        <path className="cm-trait cm-cadre" pathLength={1} d="M8 20 H160 V60 H8 Z" stroke="#2b2320" strokeWidth="3.2" />
        <path className="cm-trait cm-montant" pathLength={1} d="M84 20 V60" stroke="#2b2320" strokeWidth="2.8" />
        <path className="cm-trait cm-c1a" pathLength={1} d="M10 22 L82 58" stroke="#2b2320" strokeWidth="2.4" />
        <path className="cm-trait cm-c1b" pathLength={1} d="M82 22 L10 58" stroke="#2b2320" strokeWidth="2.4" />
        <path className="cm-trait cm-c2a" pathLength={1} d="M86 22 L158 58" stroke="#2b2320" strokeWidth="2.4" />
        <path className="cm-trait cm-c2b" pathLength={1} d="M158 22 L86 58" stroke="#2b2320" strokeWidth="2.4" />
        <Eclat x={46} y={40} classe="cm-eclat1" />
        <Eclat x={122} y={40} classe="cm-eclat2" />
        <Rosace x={46} y={40} classe="cm-rosace1" />
        <Rosace x={122} y={40} classe="cm-rosace2" />
      </svg>
      <p className="text-center text-[12.5px] leading-snug text-[#5c5140]">
        {texte ?? (fr ? "Nous cherchons les garde-corps aux normes pour votre fenêtre…" : "Finding the railings that meet the standard for your window…")}
      </p>
    </div>
  );
}
