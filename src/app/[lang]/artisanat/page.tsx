import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { products, prixParOutil, productLocalise, type Famille } from "@/lib/products";
import { prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import { serif } from "@/lib/fonts";
import { MaterialBubble } from "@/components/material-bubble";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { Apparition } from "@/components/apparition";

/** Une carte du catalogue arrive en montant : tout de suite dans le premier écran (animation CSS, l'image principale
 *  n'attend pas le script), au défilement ensuite (Apparition). */
function Arrivee({ premierEcran, retard, children }: { premierEcran: boolean; retard: number; children: ReactNode }) {
  if (premierEcran) {
    return (
      <div className="entree-monte" style={{ "--retard": `${520 + retard}ms` } as CSSProperties}>
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

export default async function ArtisanatPage({ params }: PageProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;
  const h = dict.hub;

  /**
   * Une section par métier, dans l'ordre de la maison : d'abord ce qui se
   * commande en ligne au prix affiché, puis ce qui se dessine sur devis.
   * Les verrières et les sculptures ont leur page à elles : elles ferment
   * la liste avec une carte vers cette page.
   */
  const familles: {
    id: Famille | "verrieres" | "sculptures";
    titre: string;
    note?: string;
    page?: { href: string; src: string; alt: string; position?: string; titre: string };
  }[] = [
    { id: "table-interieur", titre: h.catTables },
    // La table d'extérieur juste après ses cousines d'intérieur : un client
    // qui parcourt les tables doit la croiser tout de suite, pas après
    // l'escalier, les garde-corps et les verrières.
    { id: "table-exterieur", titre: h.catTablesExt },
    // Le garde-corps de fenêtre remonte ici (demande du 03/10) : c'est le produit d'appel.
    { id: "garde-corps", titre: h.catGardeCorps, note: t.familleGardeCorpsNote },
    { id: "chaise-exterieur", titre: h.catChaisesExt },
    { id: "escalier", titre: h.catEscaliers },
    { id: "portail", titre: h.catPortails },
    {
      id: "verrieres",
      titre: h.catVerrieres,
      page: {
        href: `/${locale}/artisanat/verrieres`,
        src: "/images/verriere-interieure.jpg",
        alt: dict.verrieres.photoAlt,
        position: "50% 45%",
        titre: dict.verrieres.title,
      },
    },
    {
      id: "sculptures",
      titre: h.catSculptures,
      page: {
        href: `/${locale}/artisanat/sculptures`,
        src: "/images/sculpture-cheval-v2.jpg",
        alt: dict.sculptures.photoAlt,
        position: "50% 35%",
        titre: dict.sculptures.title,
      },
    },
  ];
  const sections = familles
    .map((famille) => ({
      ...famille,
      // Les textes du catalogue (nom, description des photos, matières)
      // passent dans la langue du visiteur.
      pieces: products
        .filter((product) => product.famille === famille.id && product.category !== "lumiere")
        .map((product) => productLocalise(product, locale)),
    }))
    .filter((famille) => famille.pieces.length > 0 || famille.page);

  /** Le premier écran arrive tout de suite (animation CSS, sans attendre le script) ; la suite monte au défilement. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div>
      {/* 1. Le titre, la phrase, le sommaire. */}
      <section className="bg-[#ffffff] px-6 pb-12 pt-14 md:pb-16 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <h1
            className={`${serif.className} entree-monte max-w-5xl text-[2.4rem] text-balance leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}
            style={entree(100)}
          >
            {t.h1}
          </h1>
          <p
            className="entree-monte mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
            style={entree(260)}
          >
            {t.subtitle}
          </p>

          {/* Le sommaire : une puce par section, pour sauter directement aux
              garde-corps sans passer devant toutes les tables. */}
          <nav
            aria-label={t.famillesNav}
            className="entree-monte mt-10 flex flex-wrap gap-2.5 md:mt-12"
            style={entree(420)}
          >
            {sections.map((famille) => (
              <a
                key={famille.id}
                href={`#${famille.id}`}
                className="rounded-full border border-[#e5ddd3] bg-white px-4 py-2 text-[14px] text-[#4a4038] transition-colors hover:border-[#1d1d1f] hover:text-[#1d1d1f] md:text-[15px]"
              >
                {famille.titre}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* 2. Une section par famille, fonds blanc et papier en alternance (comme l'accueil). */}
      {sections.map((famille, rang) => {
        const nombre = famille.pieces.length + (famille.page ? 1 : 0);
        return (
          <section
            key={famille.id}
            id={famille.id}
            className={`scroll-mt-24 px-6 py-16 md:py-24 ${rang % 2 === 0 ? "bg-[#f5f1ea]" : "bg-[#ffffff]"}`}
          >
            <div className="mx-auto max-w-6xl">
              <Apparition className="max-w-3xl">
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <h2 className={`${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`}>
                    {famille.titre}
                  </h2>
                  <span className="text-[15px] text-[#6f6357] md:text-[16px]">
                    {(nombre > 1 ? t.familleModelesPluriel : t.familleModeles).replace("{n}", String(nombre))}
                  </span>
                </div>
                {famille.note && (
                  <p className="mt-4 max-w-2xl text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{famille.note}</p>
                )}
                {/* Les tables ont leur page : modèles, essences, dimensions, questions. */}
                {famille.id === "table-interieur" && (
                  <Link href={`/${locale}/artisanat/tables`} className="lien-fleche mt-4 text-[#2b2320]">
                    {dict.liens.toutesTables}
                  </Link>
                )}
              </Apparition>

              <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
                {famille.pieces.map((product, index) => {
                  // Le « à partir de » : celui du catalogue ; pour le garde-corps, le prix d'appel de la fiche (« dès 300 € pour
                  // une fenêtre de 100 cm ») : un seul chiffre partout pour le client.
                  const appel = prixAppelGC(product);
                  const depart = appel ? appel.prix : prixDepart(product);
                  return (
                  <Arrivee key={product.slug} premierEcran={rang === 0} retard={(index % 3) * 110}>
                  <Link
                    href={`/${locale}/artisanat/${product.slug}`}
                    className="group flex flex-col gap-5"
                  >
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${hoverZoom}`}
                      // Le cadre prend la teinte du fond de la photo : son contour ne se voit plus.
                      style={{ backgroundColor: product.images[0]?.bg ?? "#ffffff" }}
                    >
                      {product.images[0] ? (
                        <Visuel
                          locale={locale}
                          src={product.images[0].src}
                          alt={product.images[0].alt}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          // Les trois premières cartes de la première famille sont
                          // dans le premier écran : préchargées, elles ne sont plus
                          // demandées après la mise en page (c'est l'élément LCP).
                          // Pas plus de trois : sur téléphone une seule est visible.
                          priority={rang === 0 && index < 3}
                          className={
                            product.images[0].fit === "contain"
                              ? "object-contain p-4"
                              : "object-cover"
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#f1ece4] p-6">
                          <span
                            className={`${serif.className} text-center text-3xl leading-tight text-[#6f6357]`}
                          >
                            {product.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3
                        className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] transition-colors duration-300 group-hover:text-black md:text-[1.7rem]`}
                      >
                        {product.name}
                      </h3>
                      {/* Le chiffre que le client cherche, en clair sous le nom. */}
                      {depart === null ? (
                        <p className="mt-2.5 text-[15px] text-[#5c5140] md:text-[16px]">{t.onQuote}</p>
                      ) : (
                        <p className="mt-2.5 flex items-baseline gap-2 text-[15px] text-[#5c5140] md:text-[16px]">
                          <span>{appel ? (locale === "fr" ? "Dès" : "From") : t.from}</span>
                          <span className="text-[17px] font-medium tabular-nums text-[#2b2320] md:text-[18px]">
                            {prixAffiche(depart, locale)}
                          </span>
                          {appel && (
                            <span className="text-[14px]">
                              {locale === "fr" ? `fenêtre de ${appel.largeurMm / 10}\u00a0cm` : `${appel.largeurMm / 10} cm window`}
                            </span>
                          )}
                        </p>
                      )}
                      {/* La pièce se configure en ligne : dit sur la carte, c'est ce qui la distingue. */}
                      {(product.surMesure || prixParOutil(product)) && product.orderMode === "cart" && (
                        <p className="mt-1 text-[14px] text-[#6f6357]">{t.configurable}</p>
                      )}
                      {/* Aperçu des matières disponibles, mêmes pastilles que la fiche produit. */}
                      <div className="mt-4 flex items-center gap-1.5">
                        {[...product.woods, ...product.metals, ...(product.fabrics ?? [])]
                          .slice(0, 8)
                          .map((material) => (
                            <MaterialBubble
                              key={`${material.id}-${material.label}`}
                              material={material}
                              taille="miniature"
                              className="h-5 w-4"
                            />
                          ))}
                      </div>
                    </div>
                  </Link>
                  </Arrivee>
                  );
                })}

                {/* Les verrières et les sculptures se font sur devis, sur leur
                    propre page : une carte vers cette page ferme la section. */}
                {famille.page && (
                  <Arrivee premierEcran={rang === 0} retard={(famille.pieces.length % 3) * 110}>
                  <Link href={famille.page.href} className="group flex flex-col gap-5">
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-[22px] bg-white ${hoverZoom}`}
                    >
                      <Visuel
                        locale={locale}
                        src={famille.page.src}
                        alt={famille.page.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        style={{ objectPosition: famille.page.position }}
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <h3
                        className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] transition-colors duration-300 group-hover:text-black md:text-[1.7rem]`}
                      >
                        {famille.page.titre}
                      </h3>
                      <p className="mt-2.5 text-[15px] text-[#5c5140] md:text-[16px]">{t.onQuote}</p>
                    </div>
                  </Link>
                  </Arrivee>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* Bandeau atelier : panneau sombre et photo, le même dessin partout. */}
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
