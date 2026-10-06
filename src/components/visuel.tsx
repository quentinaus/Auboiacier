import Image, { type ImageProps } from "next/image";
import type { Ref } from "react";
import type { Locale } from "@/lib/i18n";
import { MENTION_ILLUSTRATION, altAvecMention, porteMentionIllustration, tonMention } from "@/lib/visuels";

/** Le coin de l'image où se pose la mention. */
export type CoinMention = "haut-gauche" | "haut-droite" | "bas-gauche" | "bas-droite";

const COINS: Record<CoinMention, string> = {
  "haut-gauche": "left-2 top-2",
  "haut-droite": "right-2 top-2",
  "bas-gauche": "bottom-2 left-2",
  "bas-droite": "bottom-2 right-2",
};

/**
 * Les deux tons de la mention. Chacun se lit sur n'importe quelle image, du blanc au noir : le voile est assez
 * couvrant pour que le texte garde un contraste d'au moins 4,5:1 (calculé par tests/visuels.test.ts, qui lit ces deux
 * lignes). Le clair sur un fond de studio, le sombre sur une pièce dans l'ombre (voir VISUELS_SOMBRES).
 */
export const TONS_MENTION = {
  clair: "bg-white/85 text-[#5c5140]",
  sombre: "bg-black/55 text-white",
} as const;

/**
 * LA MENTION « IMAGE D'ILLUSTRATION », dans un coin de l'image (voir src/lib/visuels.ts).
 *
 * Discrète mais lisible : petite, sur un voile clair à peine visible sur un fond de studio blanc. Sur un visuel sombre
 * (`ton="sombre"`, ou de lui-même pour ceux de VISUELS_SOMBRES), un voile foncé et un texte blanc. Elle ne prend
 * jamais le clic (pointer-events-none). Les lecteurs d'écran ne la lisent pas ici (aria-hidden) : `Visuel` l'ajoute
 * au texte alternatif de l'image (« … (image d'illustration) »), et la vidéo à sa description — une seule fois, avec
 * l'image. Elle se place dans le parent positionné de l'image — celui qu'exige `fill`.
 *
 * Rien ne s'affiche pour une vraie photo ni pour une image qui ne montre pas une pièce.
 */
export function MentionIllustration({
  src,
  locale,
  coin = "bas-droite",
  ton,
  className = "",
}: {
  src: string;
  locale: Locale;
  coin?: CoinMention;
  ton?: "clair" | "sombre";
  className?: string;
}) {
  if (!porteMentionIllustration(src)) return null;
  return (
    <span
      aria-hidden="true"
      data-mention-illustration={src}
      className={[
        // Plus discrète (Quentin, 06/10/2026 : « un tout petit peu plus petit »), toujours lisible.
        "pointer-events-none absolute z-[3] select-none whitespace-nowrap rounded-full px-[5px] py-0 text-[8px] leading-[12px] tracking-[0.02em] md:text-[9px] md:leading-[13px]",
        TONS_MENTION[ton ?? tonMention(src)],
        COINS[coin],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {MENTION_ILLUSTRATION[locale]}
    </span>
  );
}

/**
 * L'IMAGE D'UNE PIÈCE, partout sur le site : l'image de Next, suivie de sa mention quand c'en est un visuel.
 *
 * - `coin`, `ton` : où et comment poser la mention (voir `MentionIllustration`).
 * - `alt` : quand l'image porte la mention, « (image d'illustration) » s'y ajoute pour les lecteurs d'écran — aussi
 *   avec `mention={false}`, puisque la mention est alors posée à la main à côté. Pas pour une vignette (sans mention).
 * - `vignette` : une vignette de quelques dizaines de pixels (bande de la galerie, barre d'achat, panier), où la
 *   mention ne tiendrait pas. La grande image qu'elle commande, juste à côté, porte la mention.
 * - `mention={false}` : la mention est posée à la main ailleurs dans la page (sous un voile, hors d'un cadre qui
 *   bouge) — le fichier doit alors contenir son `<MentionIllustration>`.
 * - `ref` : l'élément <img>, pour qui doit le mesurer (la toile animée des plafonds).
 *
 * Ni crochet ni « use client » : il sert aux pages serveur comme aux composants du navigateur.
 */
export function Visuel({
  locale,
  coin,
  ton,
  vignette = false,
  mention = true,
  ...props
}: ImageProps & {
  ref?: Ref<HTMLImageElement>;
  locale: Locale;
  coin?: CoinMention;
  ton?: "clair" | "sombre";
  vignette?: boolean;
  mention?: boolean;
}) {
  const src = typeof props.src === "string" ? props.src : "";
  const alt = vignette ? props.alt : altAvecMention(props.alt, src, locale);
  return (
    <>
      <Image {...props} alt={alt} />
      {mention && !vignette && <MentionIllustration src={src} locale={locale} coin={coin} ton={ton} />}
    </>
  );
}
