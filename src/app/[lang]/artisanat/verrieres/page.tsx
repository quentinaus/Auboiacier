import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdService, scriptJsonLd } from "@/lib/seo";
import { photos } from "@/lib/chantiers";
import { estVraiePhoto } from "@/lib/visuels";
import { serif } from "@/lib/fonts";
import { hoverZoomSubtle } from "@/lib/ui";
import { ProductTail } from "@/components/product-tail";
import { BandeauDetail } from "@/components/bandeau-detail";
import { Apparition } from "@/components/apparition";


export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/verrieres">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat/verrieres",
    title: dict.seo.verrieres.title,
    description: dict.seo.verrieres.description,
    image: "/images/verriere-interieure.jpg",
  });
}

export default async function VerrieresPage({
  params,
}: PageProps<"/[lang]/artisanat/verrieres">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.verrieres;
  /** Le titre, la phrase puis le texte arrivent l'un après l'autre (animation CSS, sans attendre le script). */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;
  // Les vraies photos de verrières (src/lib/chantiers.ts) : le travail de Quentin avant l'ouverture de l'atelier.
  const vraiesPhotos = photos.filter((photo) => photo.famille === "verriere" && !photo.video && estVraiePhoto(photo.src));

  return (
    <>
      <div>
      {/* Le chemin de navigation, déclaré aux moteurs : c'est lui qui fait
          apparaître « auboiacier.fr › Boutique › ... » sous le lien. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.artisanat.breadcrumbShop, chemin: "/artisanat" },
            { nom: t.title, chemin: "/artisanat/verrieres" },
          ])
        )}
      />
      {/* Le service, sur devis : aucun prix annoncé (référencement, lot L7). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdService({
            locale,
            nom: t.serviceNom,
            chemin: "/artisanat/verrieres",
            description: dict.seo.verrieres.description,
          })
        )}
      />
      </div>

      {/* Le même gabarit que les fiches : la photo pleine hauteur à gauche,
          la colonne étroite à droite. */}
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(380px,36%)] lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="relative h-[78vw] max-h-[80vh] md:sticky md:top-0 md:h-screen md:max-h-none md:self-start">
          <Visuel
            locale={locale}
            // En haut : l'image fait toute la hauteur de l'écran, son bas tombe sous la ligne de flottaison.
            coin="haut-droite"
            src="/images/verriere-interieure.jpg"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="px-6 pb-12 pt-8 md:px-8 md:pb-10 md:pt-10 lg:px-12">
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap justify-end text-[13px] text-[#6f6357]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
              {dict.artisanat.breadcrumbShop}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#2b2320]">{t.title}</span>
          </nav>
          <h1
            className={`${serif.className} entree-monte mt-8 text-[2.4rem] text-balance leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem]`}
            style={entree(100)}
          >
            {t.h1}
          </h1>
          <p className="entree-monte mt-4 text-[17px] leading-[1.45] text-[#5c5140] md:mt-5 lg:text-[19px]" style={entree(240)}>
            {t.tagline}
          </p>

          <div className="entree-monte" style={entree(380)}>
            <h2 className={`${serif.className} mt-10 text-balance text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>
              {t.atelierTitle}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.intro}</p>
            <p className="mt-4 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.body}</p>

            {/* Pour quelle pièce : un usage par ligne (référencement, lot L7). */}
            <h2 className={`${serif.className} mt-10 text-balance text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>
              {t.usagesTitle.replace(/ ([?!:;])/g, "\u00a0$1")}
            </h2>
            <ul className="mt-4 space-y-3">
              {t.usages.map((usage) => (
                <li key={usage.t} className="text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">
                  <h3 className="inline font-semibold text-[#2b2320]">{usage.t}</h3> — {usage.d}
                </li>
              ))}
            </ul>

            <div className="mt-10 border-t border-[#e8e1d8] pt-8">
              <span className="surtitre block">{t.cotesTitle}</span>
              <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.cotesBody}</p>
              <Link href={`/${locale}/rendez-vous`} className="lien-fleche mt-4 text-[#2b2320]">
                {t.cotesLien}
              </Link>
            </div>

            <div className="mt-10 border-t border-[#e8e1d8] pt-8">
              <span className="surtitre block">{t.priceTitle}</span>
              <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.priceBody}</p>
              <Link href={`/${locale}/zone-intervention`} className="lien-fleche mt-4 text-[#2b2320]">
                {dict.liens.zonePose}
              </Link>
            </div>
          </div>

          <div className="mt-8 md:sticky md:bottom-0 md:-mx-8 md:border-t md:border-[#e5ddd3] md:bg-white md:px-8 md:py-4 lg:-mx-12 lg:px-12">
            <Link href={`/${locale}/contact`} className="btn-plein w-full">
              {t.cta}
            </Link>
          </div>
          <p className="mt-5 text-[14px] text-[#6f6357] md:text-[15px]">{dict.artisanat.madeInFrance}</p>
        </div>
      </div>

      {/* Le détail laiton, en pleine largeur : le bandeau commun (même dessin partout). */}
      <BandeauDetail
        className="mt-16 md:mt-24"
        titre={t.detailTitle}
        corps={t.detailBody}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/verriere-poignee-laiton.jpg", alt: t.detailAlt }}
        locale={locale}
      />

      {/* Le panneau plein */}
      <section className="px-6 pt-16 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <Apparition>
            <div className={`relative aspect-[4/3] overflow-hidden rounded-[28px] bg-white sm:aspect-[21/9] ${hoverZoomSubtle}`}>
              <Visuel
                locale={locale}
                src="/images/verriere-croisillon.jpg"
                alt={t.panelAlt}
                fill
                sizes="(max-width: 1680px) 100vw, 1680px"
                className="object-cover"
              />
            </div>
          </Apparition>
          <Apparition className="mt-10 max-w-3xl md:mt-12">
            <h2 className={`${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`}>
              {t.panelTitle}
            </h2>
            <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.panelBody}</p>
          </Apparition>
        </div>
      </section>

      {/* En photo : deux verrières réalisées par Quentin avant l'ouverture de l'atelier — de vraies photos, pas des visuels. */}
      {vraiesPhotos.length > 0 && (
        <section className="px-6 pt-16 md:pt-28">
          <div className="mx-auto max-w-6xl">
            <Apparition className="max-w-3xl">
              <h2 className={`${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`}>
                {dict.realisations.chantierTitle}
              </h2>
              <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.photosTexte}</p>
            </Apparition>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 md:mt-12">
              {vraiesPhotos.map((photo, i) => (
                <Apparition key={photo.src} retard={(i % 2) * 110}>
                  <figure className="flex flex-col gap-3">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px]">
                      <Visuel
                        locale={locale}
                        src={photo.src}
                        alt={dict.realisations[photo.alt]}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <figcaption className="text-[15px] leading-[1.45] text-[#5c5140]">{dict.realisations[photo.alt]}</figcaption>
                  </figure>
                </Apparition>
              ))}
            </div>
          </div>
        </section>
      )}

      <ProductTail dict={dict} locale={locale} />
    </>
  );
}
