import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Visuel } from "@/components/visuel";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";
import { products, productLocalise } from "@/lib/products";
import { DevisForm } from "@/components/devis-form";
import { Apparition } from "@/components/apparition";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * La page « Rendez-vous » : la prise de cotes à domicile, pour Google Ads et
 * la fiche Google Business. Même dessin que la page « Devis » : la promesse,
 * trois étapes, les pièces qui se mesurent sur place (celles qui ont
 * `priseDeCotes`), et le formulaire pour le reste — qui finit sur sa propre
 * page de confirmation, /rendez-vous/merci.
 */

export async function generateMetadata({ params }: PageProps<"/[lang]/rendez-vous">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/rendez-vous",
    title: dict.seo.rdv.title,
    description: dict.seo.rdv.description,
  });
}

export default async function RendezVousPage({ params }: PageProps<"/[lang]/rendez-vous">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.rdv;
  const pieces = products.filter((p) => p.priseDeCotes).map((p) => productLocalise(p, locale));

  /** Le titre, la phrase puis les boutons arrivent l'un après l'autre, comme en haut de l'accueil. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        <section className="px-6 pb-16 pt-16 md:pb-28 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="surtitre entree-monte" style={entree(100)}>{t.eyebrow}</p>
            <h1
              className={`${serif.className} entree-monte mt-4 text-balance text-[2.4rem] leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}
              style={entree(200)}
            >
              {t.h1}
            </h1>
            <p
              className="entree-monte mx-auto mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
              style={entree(380)}
            >
              {t.lead}
            </p>
            <div
              className="entree-monte mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-start sm:gap-5"
              style={entree(560)}
            >
              <div className="flex flex-col items-center gap-2.5">
                <a href="#pieces" className="btn-plein">
                  {t.ctaPieces}
                </a>
                <span className="text-[14px] text-[#6f6357]">{t.ctaPiecesNote}</span>
              </div>
              <div className="flex flex-col items-center gap-2.5">
                <a href="#formulaire" className="btn-contour">
                  {t.ctaAutre}
                </a>
                <span className="text-[14px] text-[#6f6357]">{t.ctaAutreNote}</span>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-20 max-w-6xl md:mt-28">
            <Apparition>
              <p className="surtitre text-center">{t.etapesTitle}</p>
            </Apparition>
            <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
              {t.etapes.map((etape, i) => (
                <li key={etape.titre}>
                  <Apparition retard={(i % 4) * 110} className="h-full rounded-[22px] bg-[#f5f1ea] px-7 py-8 md:px-8 md:py-9">
                    <span aria-hidden className={`${serif.className} inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2b2320] text-[17px]`}>
                      {i + 1}
                    </span>
                    <h2 className={`${serif.className} mt-5 text-[1.4rem] leading-[1.12] tracking-[-0.01em] md:text-[1.7rem]`}>{etape.titre}</h2>
                    <p className="mt-3 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{etape.texte}</p>
                  </Apparition>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pieces" className="scroll-mt-24 bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition className="max-w-3xl">
              <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] sm:text-[2.5rem] md:text-[3rem]`}>
                {t.piecesTitle}
              </h2>
              <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.piecesSubtitle}</p>
              {/* Jusqu'où l'atelier se déplace : la page de la zone le dit. */}
              <Link href={`/${locale}/zone-intervention`} className="lien-fleche mt-4 py-2 text-[#2b2320]">
                {t.zoneLink}
              </Link>
            </Apparition>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 md:mt-14">
              {pieces.map((product, i) => {
                const image = product.images[0];
                return (
                  <Apparition key={product.slug} retard={(i % 3) * 110}>
                    <Link href={`/${locale}/artisanat/${product.slug}#cotes`} className="group flex flex-col gap-5">
                      <div className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${hoverZoom}`} style={{ backgroundColor: image?.bg ?? "#ffffff" }}>
                        {image && (
                          <Visuel
                            locale={locale}
                            src={image.src}
                            alt={image.alt}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className={image.fit === "contain" ? "object-contain p-4" : "object-cover"}
                            style={image.position ? { objectPosition: image.position } : undefined}
                          />
                        )}
                        <span className="absolute left-4 top-4 rounded-full bg-[#2b2320] px-3 py-1 text-[13px] font-medium text-white">
                          {t.badge}
                        </span>
                      </div>
                      <div>
                        <h3 className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] transition-colors duration-300 group-hover:text-black`}>
                          {product.name}
                        </h3>
                        <p className="mt-1.5 text-[15px] leading-[1.5] text-[#5c5140] md:text-[16px]">{product.tagline}</p>
                        <span className="lien-fleche mt-3 text-[#2b2320]">{t.cta}</span>
                      </div>
                    </Link>
                  </Apparition>
                );
              })}
            </div>
          </div>
        </section>

        <section id="formulaire" className="scroll-mt-24 bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] sm:text-[2.5rem] md:text-[3rem]`}>
                {t.formTitle}
              </h2>
              <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.formSubtitle}</p>
            </Apparition>
            <div className="mt-10 md:mt-12">
              <DevisForm
                t={dict.contact.form}
                email={dict.contact.email}
                locale={locale}
                prefill={`${t.prefill}\n\n`}
                redirectTo={`/${locale}/rendez-vous/merci`}
                formulaire="rendez-vous"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
