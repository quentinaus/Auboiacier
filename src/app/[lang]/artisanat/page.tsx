import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { BandeauDetail } from "@/components/bandeau-detail";
import { CarteCategorie } from "@/components/carte-categorie";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { categoriesCollection } from "@/lib/categories-collection";
import { detailCategorie } from "@/lib/categories-collection.server";

/** Une carte arrive en montant : tout de suite dans le premier écran (animation CSS, sans attendre le script), au
 *  défilement ensuite (Apparition). */
function Arrivee({ premierEcran, retard, children }: { premierEcran: boolean; retard: number; children: ReactNode }) {
  if (premierEcran) {
    return (
      <div className="entree-monte h-full" style={{ "--retard": `${420 + retard}ms` } as CSSProperties}>
        {children}
      </div>
    );
  }
  return <Apparition retard={retard}>{children}</Apparition>;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat",
    title: dict.seo.artisanat.title,
    description: dict.seo.artisanat.description,
    // La photo de la Mikado est très allongée (2,5:1) : les réseaux la
    // rognaient des deux côtés. Déclinaison fabriquée au format 1200 × 630.
    image: "/images/partage/artisanat.jpg",
  });
}

/**
 * LA COLLECTION (refaite le 09/10/2026, demande de Quentin : « mal organisée, pas belle, pas intuitive »).
 * Un titre court, puis directement les catégories en grandes cartes, chacune avec sa photo en situation : un clic
 * ouvre ses modèles (src/lib/categories-collection.ts). Plus de sommaire en pastilles ni de sections empilées.
 */
export default async function ArtisanatPage({ params }: PageProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;
  const categories = categoriesCollection(locale, dict.hub);
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div>
      {/* 1. Le titre et la phrase. */}
      {/* Compact et sur toute la largeur (09/10/2026, Quentin : « ça prend trop de place ») : le titre à gauche, la
          phrase à droite sur grand écran, l'un sous l'autre sinon. */}
      <section className="bg-[#f5f1ea] px-6 pb-2 pt-9 md:pt-12 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-end xl:justify-between xl:gap-16">
          <h1
            className={`${serif.className} entree-monte text-[2rem] text-balance leading-[1.06] tracking-[-0.02em] text-[#2b2320] sm:text-[2.4rem] md:text-[2.8rem]`}
            style={entree(80)}
          >
            {t.h1}
          </h1>
          <p className="entree-monte max-w-xl text-[15px] leading-[1.55] text-[#5c5140] md:text-[16px] xl:pb-2" style={entree(200)}>
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* 2. Les catégories sur toute la largeur : deux par rangée sur téléphone, trois sur tablette, cinq dès 1280 px
          (neuf catégories : 5 + 4, aucune carte seule). Les dernières se centrent. */}
      <section className="bg-[#f5f1ea] px-6 pb-16 pt-7 md:pb-24 md:pt-9 lg:px-10">
        <ul className="mx-auto flex max-w-[1600px] flex-wrap justify-center gap-x-4 gap-y-9 sm:gap-x-6 md:gap-y-12 xl:gap-x-5 xl:gap-y-11">
          {categories.map((c, i) => (
            <li key={c.id} className="basis-[calc(50%-0.5rem)] sm:basis-[calc(50%-0.75rem)] md:basis-[calc(33.333%-1rem)] xl:basis-[calc(20%-1rem)]">
              <Arrivee premierEcran={i < 5} retard={(i % 5) * 90}>
                <CarteCategorie
                  categorie={c}
                  detail={detailCategorie(c, locale, t)}
                  locale={locale}
                  priority={i < 5}
                  dense
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
                />
              </Arrivee>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Bandeau atelier : panneau sombre et photo, le même dessin partout. */}
      <BandeauDetail
        titre={t.craftBandTitle}
        corps={t.craftBandBody}
        cta={{ href: `/${locale}/contact`, label: dict.nav.contact }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/mikado/ambiance.jpg", alt: dict.hub.altHeroMobilier }}
        locale={locale}
      />
    </div>
  );
}
