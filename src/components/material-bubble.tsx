import type { ProductSwatch } from "@/lib/products";

const ACCENT = "#6d2c2c";

/** Reflet + ombre interne : donne le volume de bille à toutes les pastilles. */
const GLOSS =
  "radial-gradient(circle at 34% 24%, rgba(255,255,255,0.42), rgba(255,255,255,0) 56%), radial-gradient(circle at 68% 84%, rgba(0,0,0,0.20), rgba(0,0,0,0) 52%)";
const INNER_SHADOW =
  "inset 0 -8px 16px rgba(0,0,0,0.20), inset 0 4px 10px rgba(255,255,255,0.14)";

/**
 * Pastille de matière (bois, acier ou velours), utilisée aussi bien en grand sur
 * la fiche produit qu'en miniature sous les cartes de la boutique.
 * La matière est dessinée en CSS : trame du tissu, fil du bois ou brossage de l'acier.
 */
export function MaterialBubble({
  material,
  selected = false,
  className = "",
}: {
  material: ProductSwatch;
  selected?: boolean;
  className?: string;
}) {
  /** Un échantillon calculé (bois, peinture, velours) porte déjà son volume ; une photo (rosace) garde un filet. */
  const calcule = material.grain?.includes("/echantillons/") ?? false;
  return (
    <span
      className={`block overflow-hidden rounded-full ${className}`}
      style={{
        backgroundColor: calcule ? "transparent" : material.swatch,
        backgroundImage: material.grain,
        backgroundSize: "cover",
        // Une image calculée (bois, peinture) porte déjà son volume et son
        // ombre : on ne lui ajoute qu'un anneau de sélection, fin et net.
        boxShadow: selected
          ? `0 0 0 2.5px #fbf9f6, 0 0 0 4px ${ACCENT}`
          : calcule
            ? "none"
            : "0 0 0 1px rgba(0,0,0,0.10), 0 10px 20px -16px rgba(0,0,0,0.55)",
      }}
    >
      {/* Une photo (les rosaces) se montre telle quelle : pas de reflet de bille dessus. */}
      {!material.grain?.startsWith("url(") && (
        <span
          className="block h-full w-full rounded-full"
          style={{ backgroundImage: GLOSS, boxShadow: INNER_SHADOW }}
        />
      )}
    </span>
  );
}
