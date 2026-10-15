/**
 * « De quoi se compose le prix » (Quentin, 15/10/2026) : trois ou quatre lignes courtes, près du prix, qui disent
 * simplement ce que l'on paie, des matières vraies et un vrai travail. Pas de chiffre, pas de coût, pas de pourcentage.
 *
 * Les lignes viennent du dictionnaire (artisanat.prixCompose, une entrée par famille de pièce). La clé facultative
 * `bois` de chaque famille qui travaille le bois est VIDE aujourd'hui : rien ne s'affiche tant qu'elle l'est. Pour
 * ajouter plus tard une phrase sur le bois (par exemple « Bois massif de réemploi, retravaillé »), il suffit de
 * l'écrire dans fr.json et en.json : elle apparaît en dernière ligne, sans toucher au code.
 *
 * Le texte est toujours dans la page (jamais replié) : Google le lit, et le bloc reste compact.
 */
import type { Dictionary } from "@/app/[lang]/dictionaries";

type EntreeFamille = { lignes: string[]; bois?: string };

/** Les lignes d'une famille, la phrase sur le bois en dernier si elle est écrite ; null si la famille n'a rien. */
export function lignesPrixCompose(t: Dictionary["artisanat"], famille: string): { titre: string; lignes: string[] } | null {
  const pc = t.prixCompose as unknown as Record<string, EntreeFamille | string | undefined>;
  const e = pc[famille];
  if (!e || typeof e === "string" || !Array.isArray(e.lignes) || e.lignes.length === 0) return null;
  const bois = (e.bois ?? "").trim();
  return { titre: pc.titre as string, lignes: bois ? [...e.lignes, bois] : e.lignes };
}

export function PrixCompose({
  t,
  famille,
  compact = false,
  dense = false,
  className = "",
}: {
  t: Dictionary["artisanat"];
  famille: string;
  /** Sur deux colonnes (en-tête du garde-corps, colonne d'achat étroite) : moins de hauteur. */
  compact?: boolean;
  /** Une colonne étroite et basse (le configurateur de portail) : texte un cran plus petit, lignes serrées. */
  dense?: boolean;
  className?: string;
}) {
  const contenu = lignesPrixCompose(t, famille);
  if (!contenu) return null;
  return (
    <section aria-label={contenu.titre} className={`prix-compose ${className}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7a6f64]">{contenu.titre}</p>
      <ul className={`${dense ? "mt-1 text-[12px] leading-[1.3]" : "mt-1.5 text-[13px] leading-snug"} text-[#4a4038] ${compact ? "grid gap-x-5 gap-y-0.5 sm:grid-cols-2" : "grid gap-1"}`}>
        {contenu.lignes.map((ligne) => (
          <li key={ligne} className="flex items-start gap-2">
            <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="#9a7b4f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] h-3 w-3 shrink-0">
              <path d="M4.5 10.5l3.5 3.5 7.5-8" />
            </svg>
            <span>{ligne}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
