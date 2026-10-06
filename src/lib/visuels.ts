/**
 * LES IMAGES DU SITE : VRAIES PHOTOS OU IMAGES D'ILLUSTRATION.
 *
 * L'atelier n'a pas encore de chantier client à montrer (commandes ouvertes le 7 décembre 2026). Les images des
 * pièces sont donc des visuels faits par ordinateur. Quatre vraies photos font exception : la vidéo du torse (sa
 * photo d'ouverture) et deux photos de la pose d'une verrière — du travail de Quentin réalisé AVANT l'ouverture de
 * l'atelier (chez un ancien employeur ou à titre personnel) : la page « Projets et visuels » le dit, et ne les
 * présente jamais comme des chantiers d'Auboiacier ; et Quentin au travail, qui meule un châssis (atelier-soudeur) —
 * un portrait de lui, ni une pièce ni un chantier d'Auboiacier : son texte alternatif le nomme. Décision de Quentin, 06/10/2026 : chaque visuel porte,
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
  // Le travail de Quentin avant l'ouverture de l'atelier.
  "/images/torse-acier-poster.jpg",
  "/images/verriere-pose-chantier-2.jpg",
  "/images/verriere-pose-chantier-4.jpg",
  // Quentin au travail (confirmé par lui le 06/10/2026) : un portrait, pas une pièce d'Auboiacier.
  "/images/atelier-soudeur.jpg",
];

/**
 * Les images qui ne montrent pas une pièce : pas de mention. Les textures du croquis coté (schema/), les images de
 * partage sur les réseaux (partage/, jamais affichées dans une page), les pictogrammes (.svg) et deux paysages du
 * pays saumurois — le château de Saumur et les vignes — qui ne présentent ni une pièce ni un chantier.
 * La photo de Quentin qui meule un châssis (atelier-soudeur) n'y est pas : c'est une des vraies photos.
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

/** Une des vraies photos ? */
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

/**
 * Les visuels en demi-teinte ou sombres, en plein cadre : leur mention prend le ton sombre (voile foncé, texte blanc),
 * plus discret qu'un voile clair posé sur une pièce dans l'ombre. Les deux tons se lisent sur n'importe quelle image
 * (contraste d'au moins 4,5:1, vérifié par tests/visuels.test.ts) : cette liste ne règle que la discrétion.
 * Un `ton` passé à la main au composant l'emporte.
 */
export const VISUELS_SOMBRES: readonly string[] = [
  "/images/verriere-croisillon.jpg",
  "/images/sculpture-cheval-v2.jpg",
  "/images/lumiere/salle-ronde.jpg",
  "/images/escalier/limon-droit.jpg",
  "/images/verriere-interieure.jpg",
];

/** Le ton de la mention quand la page ne le choisit pas : sombre pour les visuels de `VISUELS_SOMBRES`, clair sinon. */
export function tonMention(src: string): "clair" | "sombre" {
  return VISUELS_SOMBRES.includes(cheminImage(src)) ? "sombre" : "clair";
}

/**
 * Le texte alternatif d'une image qui porte la mention, pour les lecteurs d'écran : « Table Mikado… (image
 * d'illustration) ». La mention visible, elle, leur est cachée : l'information se lit une seule fois, avec l'image.
 * Une image décorative (alt vide) reste muette, et une vraie photo garde son texte tel quel.
 */
export function altAvecMention(alt: string, src: string, locale: Locale): string {
  const mention = MENTION_ILLUSTRATION[locale].toLowerCase();
  if (!alt.trim() || !porteMentionIllustration(src) || alt.toLowerCase().includes(`(${mention})`)) return alt;
  return `${alt} (${mention})`;
}
