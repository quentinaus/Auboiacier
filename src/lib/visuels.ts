/**
 * LES IMAGES DU SITE : VRAIES PHOTOS OU IMAGES D'ILLUSTRATION.
 *
 * L'atelier n'a pas encore de chantier client à montrer (commandes ouvertes le 7 décembre 2026). Les images des
 * pièces sont donc des visuels faits par ordinateur, à trois exceptions près : la vidéo du torse (sa photo
 * d'ouverture) et deux photos de la pose d'une verrière. Décision de Quentin, 06/10/2026 : chaque visuel porte,
 * dans un coin, la mention discrète « Image d'illustration » (« Illustration » en anglais), pour ne jamais faire
 * croire à une réalisation (code de la consommation, art. L121-2). Les mentions légales le disent en une phrase.
 *
 * C'EST LA SEULE LISTE À TENIR. Le composant `Visuel` (src/components/visuel.tsx) et `MentionIllustration`
 * l'interrogent : une nouvelle vraie photo s'ajoute à `VRAIES_PHOTOS`, et sa mention disparaît partout.
 *
 * Ne pas écrire, sur la mention ni ailleurs : « IA », « intelligence artificielle », « généré », « 3D ».
 */

import type { Locale } from "./i18n.ts";

/** Les seules vraies photos du site : elles ne portent pas la mention. */
export const VRAIES_PHOTOS: readonly string[] = [
  "/images/torse-acier-poster.jpg",
  "/images/verriere-pose-chantier-2.jpg",
  "/images/verriere-pose-chantier-4.jpg",
];

/**
 * Les images qui ne montrent pas une pièce : pas de mention. Les textures du croquis coté (schema/), les images de
 * partage sur les réseaux (partage/, jamais affichées dans une page), les pictogrammes (.svg) et deux paysages du
 * pays saumurois — le château de Saumur et les vignes — qui ne présentent ni une pièce ni un chantier.
 * L'image de l'atelier (le soudeur qui meule un châssis) n'y est pas : elle n'est pas une des vraies photos, elle
 * porte donc la mention, comme les pièces.
 */
const PAS_UNE_PIECE: readonly (string | RegExp)[] = [
  /^\/images\/schema\//,
  /^\/images\/partage\//,
  "/images/partage-auboiacier.jpg",
  /\.svg$/,
  "/images/saumur.jpg",
  "/images/vignes-coucher-soleil.jpg",
];

/** Le texte exact de la mention, dans chaque langue. */
export const MENTION_ILLUSTRATION: Record<Locale, string> = {
  fr: "Image d'illustration",
  en: "Illustration",
};

/** Le chemin d'une image, sans le domaine, la requête ni l'ancre : « https://…/images/a.jpg?v=2 » → « /images/a.jpg ». */
export function cheminImage(src: string): string {
  let chemin = src.trim();
  const domaine = chemin.match(/^https?:\/\/[^/]+(\/.*)?$/);
  if (domaine) chemin = domaine[1] ?? "/";
  return chemin.replace(/[?#].*$/, "");
}

/** Une des trois vraies photos ? */
export function estVraiePhoto(src: string): boolean {
  return VRAIES_PHOTOS.includes(cheminImage(src));
}

/** L'image montre-t-elle une pièce ? (Faux pour une texture, une image de partage, un pictogramme, un paysage.) */
export function montreUnePiece(src: string): boolean {
  const chemin = cheminImage(src);
  if (!chemin.startsWith("/images/")) return false;
  return !PAS_UNE_PIECE.some((regle) => (typeof regle === "string" ? regle === chemin : regle.test(chemin)));
}

/** L'image porte-t-elle la mention « Image d'illustration » ? Toute image de pièce, sauf les vraies photos. */
export function porteMentionIllustration(src: string): boolean {
  return montreUnePiece(src) && !estVraiePhoto(src);
}
