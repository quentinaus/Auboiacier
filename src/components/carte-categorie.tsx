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
  sizes = "(max-width: 768px) 50vw, 360px",
}: {
  categorie: Categorie;
  detail?: string;
  locale: Locale;
  priority?: boolean;
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
      <h3 className={`${serif.className} mt-4 text-[1.2rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.45rem]`}>
        {categorie.titre}
      </h3>
      {detail && <p className="mt-1 text-[14px] leading-[1.4] text-[#6f6357] md:text-[15px]">{detail}</p>}
    </Link>
  );
}
