import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { serif } from "@/lib/fonts";
import { hoverZoomSubtle } from "@/lib/ui";
import type { Categorie } from "@/lib/categories-collection";
import type { Locale } from "@/lib/i18n";

/**
 * Une carte de catégorie : la photo en situation au cadrage 4:5, le nom dessous, et une ligne discrète (modèles, prix
 * de départ). Le même dessin sur l'accueil et sur la page Collection. Toutes les images remplissent le cadre (même un
 * visuel de studio, recadré) : pas de cadre dans le cadre, la grille reste d'un seul dessin.
 */
export function CarteCategorie({
  categorie,
  detail,
  locale,
  priority = false,
  dense = false,
  serre = false,
  sizes = "(max-width: 768px) 50vw, 360px",
}: {
  categorie: Categorie;
  detail?: string;
  locale: Locale;
  priority?: boolean;
  /** Cinq cartes de front (page Collection sur grand écran) : titre et ligne un peu plus petits. */
  dense?: boolean;
  /** Six cartes de front (accueil, dès 1536 px) : le titre rétrécit pour tenir sur une ligne ou deux. */
  serre?: boolean;
  sizes?: string;
}) {
  const { image } = categorie;
  return (
    <Link href={categorie.href} className="group block">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-[18px] bg-[#ebe5db] ${hoverZoomSubtle}`}>
        <Visuel
          locale={locale}
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          style={{ objectPosition: image.position }}
          className="object-cover"
        />
      </div>
      <h3 className={`${serif.className} mt-4 text-[1.2rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.45rem] ${dense ? "xl:text-[1.25rem]" : ""} ${serre ? "2xl:text-[1.2rem]" : ""}`}>
        {categorie.titre}{"\u00a0"}
        {/* La flèche dit que toute la carte se touche (Quentin, 12/10/2026 : « on ne sait pas s'il faut cliquer sur le bouton ou la photo »). */}
        <span aria-hidden="true" className="inline-block text-[#8a7d6f] transition-transform duration-300 group-hover:translate-x-1">→</span>
      </h3>
      {detail && <p className={`mt-1 text-[14px] leading-[1.4] text-[#6f6357] md:text-[15px] ${dense ? "xl:text-[14px]" : ""}`}>{detail}</p>}
    </Link>
  );
}
