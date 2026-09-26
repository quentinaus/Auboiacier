import type { ProductSwatch } from "@/lib/products";

/**
 * La plaquette de matière du nuancier.
 *
 * ELLE ÉTAIT RONDE, ET ELLE BRILLAIT. Un reflet en haut à gauche, une ombre
 * interne, et — surtout — une image qui était elle-même une sphère éclairée,
 * calculée par un script. Une bille de chêne, ça n'existe pas ; une bille de
 * peinture non plus. C'est ce volume ajouté, toujours éclairé du même coin,
 * qui faisait « image de synthèse » et non « atelier ».
 *
 * Ici la matière est posée à plat, rectangulaire, comme une chute sur
 * l'établi ou une lame de nuancier RAL. Aucune lumière ajoutée, aucun vernis,
 * et aucune fausse veinure : un thermolaquage mat EST un aplat, et le fil du
 * chêne se regarde sur les photos de l'atelier, où il est vrai. La seule
 * image qui subsiste est une vraie photo — les rosaces de fonderie.
 *
 * (Le nom MaterialBubble est conservé pour ne pas toucher aux trois endroits
 * qui l'importent ; « plaquette » serait plus juste.)
 */

/**
 * Le chant de la plaquette : son épaisseur, vue de dessus. Il fait aussi le
 * travail d'accessibilité — sans lui, « Blanc » (#f0efeb) sur la page blanche
 * n'aurait aucun bord. Sur la carte sombre du configurateur c'est l'inverse :
 * le Noir charbon s'y fondrait, il lui faut un trait de lumière. D'où la
 * variable, définie par .carte-sombre (globals.css) et absente ailleurs.
 */
const CHANT = "inset 0 0 0 1px var(--chant, rgba(43,35,32,0.38))";

/** L'ombre d'un objet posé sur une feuille. Pas d'un objet qui flotte. */
const POSEE = "0 1px 2px rgba(43,35,32,0.16)";

/**
 * La plaquette choisie : un liseré de fond, puis un cadre d'encre. C'est une
 * FORME qui apparaît, pas une couleur qui change — elle reste lisible pour
 * qui ne distingue pas les teintes, en plus de l'état aria-pressed du bouton
 * et de l'intitulé qui passe en gras dessous.
 *
 * --carte et --carte-texte ne sont définies que dans .carte-sombre : sur la
 * page claire, les valeurs de repli s'appliquent. La plaquette n'a donc pas à
 * savoir sur quel fond elle est posée.
 */
const CHOISIE =
  "0 0 0 2px var(--carte, #ffffff), 0 0 0 3.5px var(--carte-texte, #2b2320), 0 2px 6px -1px rgba(43,35,32,0.28)";

export function MaterialBubble({
  material,
  selected = false,
  taille = "fiche",
  className = "",
}: {
  material: ProductSwatch;
  selected?: boolean;
  /**
   * « miniature » : les quelques pixels sous les cartes de la boutique. À
   * cette taille, une ombre portée n'est qu'une salissure : seul le chant
   * reste, et c'est lui qui fait lire une rangée d'échantillons là où des
   * ronds lisaient comme des puces de liste.
   */
  taille?: "fiche" | "miniature";
  className?: string;
}) {
  const miniature = taille === "miniature";
  /** Une vraie photo — les rosaces de fonderie. Tout le reste est un aplat. */
  const photo = material.grain?.startsWith("url(") ?? false;

  return (
    <span
      /* La matière n'est pas une information à lire : le bouton porte son
         aria-label, et la carte de la boutique porte le nom du produit. */
      aria-hidden
      /* Deux pixels de rayon, pas plus : un échantillon a le coin vif, à
         peine cassé par la coupe. Une pilule redeviendrait un objet
         d'interface, et c'est justement ce qu'on quitte. */
      className={`block ${miniature ? "rounded-[1px]" : "rounded-[2px]"} ${className}`}
      style={{
        backgroundColor: material.swatch,
        backgroundImage: photo ? material.grain : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: selected
          ? `${CHANT}, ${CHOISIE}`
          : miniature
            ? CHANT
            : `${CHANT}, ${POSEE}`,
      }}
    />
  );
}
