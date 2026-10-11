import "server-only";
import { prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import { piecesDeFamille, type Categorie } from "@/lib/categories-collection";
import { prixAffiche } from "@/lib/ui";
import type { Locale } from "@/lib/i18n";

/**
 * La ligne sous le nom d'une catégorie : combien de modèles, et le prix de départ (« 4 modèles · à partir de 890 € »).
 * Le garde-corps garde son prix d'appel de la fiche (« dès 300 € · fenêtre de 100 cm », décision de Quentin du 07/10) ;
 * une catégorie sans prix (verrières, sculptures) dit « Sur devis ».
 */
export function detailCategorie(
  c: Categorie,
  locale: Locale,
  t: { from: string; onQuote: string; familleModeles: string; familleModelesPluriel: string },
): string {
  const pieces = c.familles.flatMap(piecesDeFamille);
  if (pieces.length === 0) return t.onQuote;
  const nombre = pieces.length > 1 ? `${t.familleModelesPluriel.replace("{n}", String(pieces.length))} · ` : "";
  const appel = pieces.map(prixAppelGC).find((a) => a !== null) ?? null;
  if (appel) {
    const dès = locale === "fr" ? "dès" : "from";
    const fenetre = locale === "fr" ? `fenêtre de ${appel.largeurMm / 10} cm` : `${appel.largeurMm / 10} cm window`;
    return `${nombre}${nombre ? dès : dès[0].toUpperCase() + dès.slice(1)} ${prixAffiche(appel.prix, locale)} · ${fenetre}`;
  }
  const prix = pieces.map(prixDepart).filter((p): p is number => p !== null);
  if (prix.length === 0) return `${nombre}${t.onQuote.toLowerCase()}`;
  const aPartir = nombre ? t.from[0].toLowerCase() + t.from.slice(1) : t.from;
  return `${nombre}${aPartir} ${prixAffiche(Math.min(...prix), locale)}`;
}
