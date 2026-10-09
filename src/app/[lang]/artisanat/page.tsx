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
      <section className="bg-[#f5f1ea] px-6 pb-4 pt-14 md:pt-20">
        <div className="mx-auto max-w-6xl">
          <h1
            className={`${serif.className} entree-monte max-w-4xl text-[2.3rem] text-balance leading-[1.04] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.5rem]`}
            style={entree(80)}
          >
            {t.h1}
          </h1>
          <p className="entree-monte mt-5 max-w-2xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]" style={entree(200)}>
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* 2. Les catégories : trois par rangée sur ordinateur, deux sur téléphone (la dernière se centre). */}
      <section className="bg-[#f5f1ea] px-6 pb-20 pt-10 md:pb-28 md:pt-14">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-10 sm:gap-x-6 md:gap-y-14">
          {categories.map((c, i) => (
            <li key={c.id} className="basis-[calc(50%-0.5rem)] sm:basis-[calc(50%-0.75rem)] md:basis-[calc(33.333%-1rem)]">
              <Arrivee premierEcran={i < 3} retard={(i % 3) * 110}>
                <CarteCategorie
                  categorie={c}
                  detail={detailCategorie(c, locale, t)}
                  locale={locale}
                  priority={i < 3}
                  sizes="(max-width: 768px) 50vw, 370px"
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
