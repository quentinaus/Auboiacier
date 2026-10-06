import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdListe, scriptJsonLd } from "@/lib/seo";
import {
  getProduct,
  products,
  productLocalise,
  PLATEAU_MAX_LARGEUR_MM,
  PLATEAU_MAX_LONGUEUR_MM,
} from "@/lib/products";
import { prixDepart } from "@/lib/prix-garde-corps.server";
import { delaiFabrication, essencesParPrix, remplir } from "@/lib/vitrine";
import { serif } from "@/lib/fonts";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { MaterialBubble } from "@/components/material-bubble";
import { FaqVisible } from "@/components/faq-visible";
import { questionsTables } from "@/lib/faq-balisees";
import { Apparition } from "@/components/apparition";

/**
 * Les tables sur mesure, en une page : ce que cherchent ceux qui tapent
 * « table sur mesure bois massif ». Rien n'y est recopié du catalogue : les
 * modèles, leurs prix « à partir de », l'ordre de prix des essences, les
 * teintes du piétement, le plus grand plateau et le délai sont lus dans
 * src/lib/products.ts au moment de fabriquer la page.
 */

/** La table de référence : ses essences, ses teintes et ses tailles servent d'exemple. */
const REFERENCE = "table-mikado";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/tables">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat/tables",
    title: dict.seo.tables.title,
    description: dict.seo.tables.description,
    image: "/images/partage/artisanat.jpg",
  });
}

export default async function TablesPage({ params }: PageProps<"/[lang]/artisanat/tables">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.tables;
  const e = dict.essences;

  const tables = products
    .filter((p) => p.famille === "table-interieur" || p.famille === "table-exterieur")
    .map((p) => productLocalise(p, locale));
  const reference = productLocalise(getProduct(REFERENCE)!, locale);
  const essences = essencesParPrix(reference);
  const delai = delaiFabrication(reference);
  const cm = (mm: number) => String(mm / 10);
  // Les formats du catalogue pour 6, 8 et 10 couverts, tels qu'écrits sur la fiche.
  const formats = reference.sizes
    .filter((taille) => ["p6", "p8", "p10"].includes(taille.id))
    .map((taille) => taille.label)
    .join(locale === "fr" ? " ; " : "; ");

  const titreModeles = remplir(t.modelesTitle, { n: String(tables.length) });

  // Balisées pour Google : chacune ne l'est que sur cette page (src/lib/faq-balisees.ts).
  const questions = questionsTables(dict, formats);

  /** Le premier écran arrive tout de suite (animation CSS) ; la suite monte au défilement. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;
  const titreSection = `${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.artisanat.breadcrumbShop, chemin: "/artisanat" },
            { nom: t.title, chemin: "/artisanat/tables" },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdListe(
            locale,
            titreModeles,
            tables.map((p) => ({ nom: p.name, chemin: `/artisanat/${p.slug}` }))
          )
        )}
      />

      {/* 1. Le titre et la promesse. */}
      <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[13px] text-[#6f6357]">
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
            className={`${serif.className} entree-monte mt-8 max-w-4xl text-[2.4rem] text-balance leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:mt-12 md:text-[3.8rem]`}
            style={entree(100)}
          >
            {t.h1}
          </h1>
          <p
            className="entree-monte mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
            style={entree(260)}
          >
            {t.intro}
          </p>
        </div>
      </section>

      {/* 2. Les modèles, chacun avec le prix calculé par le catalogue. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            <h2 className={titreSection}>{titreModeles}</h2>
            <p className="mt-5 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{t.modelesNote}</p>
          </Apparition>
          <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
            {tables.map((product, index) => {
              const depart = prixDepart(product);
              const image = product.images[0];
              return (
                <Apparition key={product.slug} retard={(index % 3) * 110}>
                <Link
                  href={`/${locale}/artisanat/${product.slug}`}
                  className="group flex flex-col gap-5"
                >
                  <div
                    className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${hoverZoom}`}
                    style={{ backgroundColor: image?.bg ?? "#ffffff" }}
                  >
                    {image && (
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={index < 3}
                        className={image.fit === "contain" ? "object-contain p-4" : "object-cover"}
                        style={image.position ? { objectPosition: image.position } : undefined}
                      />
                    )}
                    {product.slug === "table-resine-mikado" && (
                      <span className="absolute left-4 top-4 rounded-full bg-[#2b2320] px-3 py-1 text-[13px] font-medium text-white">
                        {t.riviere}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3
                      className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] transition-colors duration-300 group-hover:text-black md:text-[1.7rem]`}
                    >
                      {product.name}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-[1.5] text-[#5c5140] md:text-[16px]">{product.tagline}</p>
                    {depart === null ? (
                      <p className="mt-2.5 text-[15px] text-[#5c5140] md:text-[16px]">{dict.artisanat.onQuote}</p>
                    ) : (
                      <p className="mt-2.5 flex items-baseline gap-2 text-[15px] text-[#5c5140] md:text-[16px]">
                        <span>{dict.artisanat.from}</span>
                        <span className="text-[17px] font-medium tabular-nums text-[#2b2320] md:text-[18px]">
                          {prixAffiche(depart, locale)}
                        </span>
                      </p>
                    )}
                    <span className="lien-fleche mt-3 text-[#2b2320]">{t.configurer}</span>
                  </div>
                </Link>
                </Apparition>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Les essences, rangées par prix d'après les écarts du catalogue. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            <h2 className={titreSection}>{t.essencesTitle}</h2>
            <p className="mt-5 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{e.note}</p>
          </Apparition>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-4">
            {essences.map((bois, i) => {
              const fiche = e[bois.id as "pin" | "hetre" | "chene" | "noyer"];
              if (!fiche) return null;
              return (
                <Apparition key={bois.id} retard={(i % 4) * 110} className="h-full rounded-[22px] bg-[#f5f1ea] px-7 py-8">
                  <div className="flex items-center gap-3">
                    <MaterialBubble material={bois} className="h-8 w-6" />
                    <h3 className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>{bois.label}</h3>
                  </div>
                  <dl className="mt-6 space-y-4 text-[16px] leading-[1.5]">
                    <div>
                      <dt className="text-[14px] font-semibold text-[#6f6357]">{e.teinte}</dt>
                      <dd className="mt-0.5 text-[#4a4038]">{fiche.teinte}</dd>
                    </div>
                    <div>
                      <dt className="text-[14px] font-semibold text-[#6f6357]">{e.durete}</dt>
                      <dd className="mt-0.5 text-[#4a4038]">{fiche.durete}</dd>
                    </div>
                    <div>
                      <dt className="text-[14px] font-semibold text-[#6f6357]">{e.usage}</dt>
                      <dd className="mt-0.5 text-[#4a4038]">{fiche.usage}</dd>
                    </div>
                  </dl>
                </Apparition>
              );
            })}
          </div>
          <Apparition>
            <Link href={`/${locale}/bois-massif`} className="lien-fleche mt-8 text-[#2b2320] md:mt-10">
              {dict.liens.boisLong}
            </Link>
          </Apparition>
        </div>
      </section>

      {/* 4. Le piétement et ses teintes, lues dans les options de la fiche. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
          <Apparition>
            <h2 className={titreSection}>{t.pietementTitle}</h2>
            <p className={`mt-6 ${texte}`}>{t.pietementBody}</p>
          </Apparition>
          <Apparition retard={110} className="md:pt-3">
            <h3 className="surtitre">{t.teintesTitle}</h3>
            <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {reference.metals.map((teinte) => (
                <li key={teinte.id} className="flex items-center gap-3 text-[15px] text-[#4a4038] md:text-[16px]">
                  <MaterialBubble material={teinte} className="h-8 w-6" />
                  {teinte.label}
                </li>
              ))}
            </ul>
          </Apparition>
        </div>
      </section>

      {/* 5. Dimensions et fabrication. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:gap-16">
          <Apparition>
            <h2 className={titreSection}>{t.dimensionsTitle}</h2>
            <p className={`mt-6 ${texte}`}>
              {remplir(t.dimensionsBody, {
                min: cm(reference.surMesure?.minMm ?? 0),
                longueur: cm(PLATEAU_MAX_LONGUEUR_MM),
                largeur: cm(PLATEAU_MAX_LARGEUR_MM),
              })}
            </p>
          </Apparition>
          <Apparition retard={110}>
            <h2 className={titreSection}>{t.fabricationTitle}</h2>
            <p className={`mt-6 ${texte}`}>
              {delai
                ? remplir(t.fabricationBody, { delai })
                : // Sans délai écrit sur la fiche, la phrase du délai disparaît.
                  t.fabricationBody.replace(/[^.]*\{delai\}[^.]*\.\s*/, "")}
            </p>
          </Apparition>
        </div>
      </section>

      {/* 6. Questions fréquentes, affichées ET balisées depuis la même liste. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            {/* Le titre de la liste au même corps que les autres titres de section de la page. */}
            <FaqVisible
              titre={t.faqTitle}
              questions={questions}
              className="[&_h2]:text-[2rem] [&_h2]:leading-[1.05] [&_h2]:tracking-[-0.018em] sm:[&_h2]:text-[2.5rem] md:[&_h2]:text-[3rem] [&_h3]:text-[1.4rem] [&_h3]:leading-[1.12] [&_h3]:tracking-[-0.01em] [&_p]:text-[16px] [&_p]:leading-[1.55] md:[&_p]:text-[17px]"
            />
          </Apparition>
        </div>
      </section>

      {/* 7. Un projet hors catalogue : un seul bouton plein, le contact en lien. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <Apparition className="mx-auto max-w-3xl text-center">
          {/* L'espace avant « ? » ne se coupe pas : le point d'interrogation ne part pas seul à la ligne. */}
          <h2 className={titreSection}>{t.ctaTitle.replace(/ ([?!:;])/g, "\u00a0$1")}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]">{t.ctaBody}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-x-8 gap-y-5 sm:flex-row">
            <Link href={`/${locale}/devis`} className="btn-plein">
              {t.ctaDevis}
            </Link>
            <Link href={`/${locale}/contact`} className="lien-fleche text-[#2b2320]">
              {t.ctaContact}
            </Link>
          </div>
        </Apparition>
      </section>
    </div>
  );
}
