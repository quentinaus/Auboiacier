import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { MaterialBubble } from "@/components/material-bubble";
import { serif } from "@/lib/fonts";
import { hoverZoomSubtle, prixAffiche } from "@/lib/ui";
import { prixParOutil, type Product } from "@/lib/products";
import { prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import type { Locale } from "@/lib/i18n";

/**
 * La carte d'un modèle (page d'une famille) : la photo, le nom, le prix de départ, « Se configure en ligne », les
 * matières. Pour le garde-corps, le prix d'appel de la fiche (« dès 300 € pour une fenêtre de 100 cm ») : un seul
 * chiffre partout pour le client (décision de Quentin, 07/10/2026). Composant du serveur : il lit les prix.
 */
export function CarteProduit({
  product,
  locale,
  t,
  priority = false,
}: {
  /** La pièce, déjà dans la langue du visiteur (productLocalise). */
  product: Product;
  locale: Locale;
  t: { from: string; onQuote: string; configurable: string };
  priority?: boolean;
}) {
  const appel = prixAppelGC(product);
  const depart = appel ? appel.prix : prixDepart(product);
  const image = product.images[0];
  return (
    <Link href={`/${locale}/artisanat/${product.slug}`} className="group flex flex-col gap-5">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-[18px] ${hoverZoomSubtle}`}
        // Le cadre prend la teinte du fond de la photo : son contour ne se voit plus.
        style={{ backgroundColor: image?.bg ?? "#ffffff" }}
      >
        {image && (
          <Visuel
            locale={locale}
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            priority={priority}
            className={image.fit === "contain" ? "object-contain p-6" : "object-cover"}
          />
        )}
      </div>
      <div>
        <h2 className={`${serif.className} text-[1.5rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.8rem]`}>
          {product.name}
        </h2>
        {depart === null ? (
          <p className="mt-2 text-[15px] text-[#5c5140] md:text-[16px]">{t.onQuote}</p>
        ) : (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[15px] text-[#5c5140] md:text-[16px]">
            <span>{appel ? (locale === "fr" ? "Dès" : "From") : t.from}</span>
            <span className="text-[17px] font-medium tabular-nums text-[#2b2320] md:text-[18px]">{prixAffiche(depart, locale)}</span>
            {appel && (
              <span className="text-[14px]">
                {locale === "fr" ? `fenêtre de ${appel.largeurMm / 10} cm` : `${appel.largeurMm / 10} cm window`}
              </span>
            )}
          </p>
        )}
        {(product.surMesure || prixParOutil(product)) && product.orderMode === "cart" && (
          <p className="mt-1 text-[14px] text-[#6f6357]">{t.configurable}</p>
        )}
        <div className="mt-4 flex items-center gap-1.5">
          {[...product.woods, ...product.metals, ...(product.fabrics ?? [])].slice(0, 8).map((material) => (
            <MaterialBubble key={`${material.id}-${material.label}`} material={material} taille="miniature" className="h-5 w-4" />
          ))}
        </div>
      </div>
    </Link>
  );
}
