import Image, { type ImageProps } from "next/image";
import type { Ref } from "react";
import type { Locale } from "@/lib/i18n";
import { MENTION_ILLUSTRATION, porteMentionIllustration } from "@/lib/visuels";

/** Le coin de l'image où se pose la mention. */
export type CoinMention = "haut-gauche" | "haut-droite" | "bas-gauche" | "bas-droite";

const COINS: Record<CoinMention, string> = {
  "haut-gauche": "left-2 top-2",
  "haut-droite": "right-2 top-2",
  "bas-gauche": "bottom-2 left-2",
  "bas-droite": "bottom-2 right-2",
};

/**
 * LA MENTION « IMAGE D'ILLUSTRATION », dans un coin de l'image (voir src/lib/visuels.ts).
 *
 * Discrète mais lisible : petite, grise, sur un voile clair à peine visible sur un fond de studio blanc. Sur une
 * photo sombre en plein cadre (`ton="sombre"`), un voile foncé et un gris clair. Elle ne prend jamais le clic
 * (pointer-events-none) et ne se lit pas deux fois au lecteur d'écran dans un lien (aria-hidden) : la phrase des
 * mentions légales le dit à tous. Elle se place dans le parent positionné de l'image — celui qu'exige `fill`.
 *
 * Rien ne s'affiche pour une vraie photo ni pour une image qui ne montre pas une pièce.
 */
export function MentionIllustration({
  src,
  locale,
  coin = "bas-droite",
  ton = "clair",
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
        "pointer-events-none absolute z-[3] select-none whitespace-nowrap rounded-full px-1.5 py-px text-[9px] leading-[14px] tracking-[0.02em] md:text-[10px]",
        ton === "sombre" ? "bg-black/25 text-white/80" : "bg-white/70 text-[#7a6f64]",
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
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- `alt` est obligatoire dans ImageProps et passe avec le reste */}
      <Image {...props} />
      {mention && !vignette && <MentionIllustration src={src} locale={locale} coin={coin} ton={ton} />}
    </>
  );
}
