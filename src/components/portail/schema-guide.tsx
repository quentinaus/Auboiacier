/**
 * Les petits schémas des trois questions de la page des portails (Quentin, 10/10/2026 : « le client ne connaît pas les
 * termes… des petits schémas, des petits chiffres »). Vue de dessus (la rue en bas, la propriété en haut) comme le plan de
 * l'outil, sans animation : un seul regard dit ce que la question demande. La zone verte est la place à garder libre.
 * « Image d'illustration » : ce sont des schémas de principe, pas des plans.
 */
type Langue = "fr" | "en";
const T = {
  fr: { rue: "Rue", maison: "Votre propriété", demi: "1,75 m", longueur: "3,50 m libres au moins", passage: "passage de 3,50 m", rail: "rail fixé au sol", sansRail: "sans rail", sol: "Sol dur et plat", solMeuble: "Sol meuble ou en pente", contrepoids: "contrepoids", ill: "Image d'illustration" },
  en: { rue: "Street", maison: "Your property", demi: "1.75 m", longueur: "3.50 m free at least", passage: "3.50 m opening", rail: "rail fixed to ground", sansRail: "no rail", sol: "Hard, level ground", solMeuble: "Soft or sloping ground", contrepoids: "counterweight", ill: "Illustration" },
} as const;

const PIERRE = { fill: "#dcd2c3", stroke: "#b8a993", strokeWidth: 1.5 };
const MUR = { fill: "#eee8df", stroke: "#b5a690", strokeWidth: 1.2 };
const ZONE = { fill: "rgba(63,107,58,0.13)", stroke: "#3f6b3a", strokeWidth: 1.5, strokeDasharray: "6 4" };
const ENCRE = "#2b2320";
const GRIS = "#6f6357";

/** Le décor commun : la rue, le texte « Votre propriété », les deux murs. Les piliers sont posés par chaque schéma. */
function Decor({ t, xg, xd }: { t: Record<keyof (typeof T)["fr"], string>; xg: number; xd: number }) {
  return (
    <>
      <rect x="0" y="158" width="400" height="32" fill="#f1ede7" />
      <text x="8" y="178" fontSize="13" fill={GRIS}>{t.rue}</text>
      <text x="8" y="17" fontSize="13" fill={GRIS}>{t.maison}</text>
      <rect x="0" y="146" width={xg} height="5" {...MUR} />
      <rect x={xd + 14} y="146" width={400 - xd - 14} height="5" {...MUR} />
      <rect x={xg} y="138" width="14" height="22" {...PIERRE} />
      <rect x={xd} y="138" width="14" height="22" {...PIERRE} />
    </>
  );
}

export function SchemaGuide({ question, locale, label }: { question: 0 | 1 | 2; locale: Langue; label: string }) {
  const t = T[locale];
  return (
    <figure className="pg-schema" role="img" aria-label={label}>
      <svg viewBox="0 0 400 190" preserveAspectRatio="xMidYMid meet">
        {question === 0 && (
          <>
            <Decor t={t} xg={78} xd={308} />
            {/* Deux battants ouverts vers la propriété : le quart de cercle de chacun reste libre (la moitié du passage). */}
            <path d="M92 148 L200 148 A108 108 0 0 0 92 40 Z" {...ZONE} />
            <path d="M308 148 L200 148 A108 108 0 0 1 308 40 Z" {...ZONE} />
            <line x1="92" y1="148" x2="92" y2="40" stroke={ENCRE} strokeWidth="5" strokeLinecap="round" />
            <line x1="308" y1="148" x2="308" y2="40" stroke={ENCRE} strokeWidth="5" strokeLinecap="round" />
            <text x="148" y="108" fontSize="16" fontWeight="700" fill="#3f6b3a" textAnchor="middle">{t.demi}</text>
            <text x="252" y="108" fontSize="16" fontWeight="700" fill="#3f6b3a" textAnchor="middle">{t.demi}</text>
            <text x="200" y="178" fontSize="13" fill={GRIS} textAnchor="middle">{t.passage}</text>
          </>
        )}
        {question === 1 && (
          <>
            <Decor t={t} xg={38} xd={212} />
            {/* Le portail fermé (pointillé), et le même, glissé le long de la clôture : la longueur à garder libre. */}
            <rect x="52" y="143" width="160" height="9" fill="none" stroke={GRIS} strokeWidth="1.3" strokeDasharray="5 4" />
            <rect x="228" y="106" width="166" height="42" {...ZONE} />
            <rect x="232" y="128" width="158" height="9" fill={ENCRE} rx="1" />
            <text x="311" y="100" fontSize="15" fontWeight="700" fill="#3f6b3a" textAnchor="middle">{t.longueur}</text>
            <text x="132" y="178" fontSize="13" fill={GRIS} textAnchor="middle">{t.passage}</text>
          </>
        )}
        {question === 2 && (
          <>
            {/* Vue de côté, deux sols : dur et plat (un rail) ou meuble / en pente (sans rail, avec un contrepoids). */}
            <rect x="0" y="136" width="400" height="54" fill="#e6dfd3" />
            <text x="8" y="20" fontSize="14" fontWeight="700" fill={ENCRE}>{t.sol}</text>
            <rect x="12" y="62" width="150" height="56" fill="#d9d4cc" stroke={ENCRE} strokeWidth="1.8" />
            <rect x="6" y="128" width="190" height="7" fill="#6b6459" />
            <circle cx="40" cy="120" r="8" fill="#fff" stroke={ENCRE} strokeWidth="1.8" />
            <circle cx="132" cy="120" r="8" fill="#fff" stroke={ENCRE} strokeWidth="1.8" />
            <text x="8" y="164" fontSize="13" fill={GRIS}>{t.rail}</text>
            <line x1="204" y1="6" x2="204" y2="186" stroke="#c9bfae" strokeWidth="1" strokeDasharray="3 4" />
            <text x="214" y="20" fontSize="14" fontWeight="700" fill={ENCRE}>{t.solMeuble}</text>
            <path d="M206 140 q28 -8 56 0 t56 5 t56 -4 t26 3" fill="none" stroke="#b5a690" strokeWidth="2.2" />
            <rect x="222" y="66" width="104" height="52" fill="#d9d4cc" stroke={ENCRE} strokeWidth="1.8" />
            <rect x="326" y="80" width="68" height="24" fill="none" stroke={ENCRE} strokeWidth="1.8" strokeDasharray="5 3" />
            <text x="360" y="96" fontSize="11" fill={GRIS} textAnchor="middle">{t.contrepoids}</text>
            <rect x="240" y="118" width="9" height="16" fill="#6b6459" />
            <rect x="290" y="118" width="9" height="16" fill="#6b6459" />
            <text x="214" y="164" fontSize="13" fill={GRIS}>{t.sansRail}</text>
          </>
        )}
      </svg>
      <figcaption className="pg-schema-ill">{t.ill}</figcaption>
    </figure>
  );
}
