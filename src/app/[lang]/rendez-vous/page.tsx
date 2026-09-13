import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";
import { products, productLocalise } from "@/lib/products";
import { DevisForm } from "@/components/devis-form";
import { GlobalHeader } from "@/components/global-header";

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

  const bouton = "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors";

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        <section className="border-b border-[#e5ddd3] px-6 pb-14 pt-16 md:pb-20 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#6d2c2c]">{t.eyebrow}</p>
            <h1 className={`${serif.className} mt-4 text-3xl leading-tight sm:text-4xl md:text-[3rem] md:leading-[1.1]`}>{t.h1}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#5c5140] md:text-lg">{t.lead}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex flex-col items-center gap-2">
                <a href="#pieces" className={`${bouton} bg-[#6d2c2c] text-white hover:bg-[#5a2323]`}>
                  {t.ctaPieces}
                </a>
                <span className="text-xs text-[#6f6357]">{t.ctaPiecesNote}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <a href="#formulaire" className={`${bouton} border border-[#2b2320]/25 text-[#2b2320] hover:border-[#6d2c2c] hover:text-[#6d2c2c]`}>
                  {t.ctaAutre}
                </a>
                <span className="text-xs text-[#6f6357]">{t.ctaAutreNote}</span>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-5xl md:mt-20">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{t.etapesTitle}</p>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {t.etapes.map((etape, i) => (
                <li key={etape.titre} className="rounded-2xl border border-[#e5ddd3] bg-white px-6 py-6">
                  <span aria-hidden className={`${serif.className} inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2b2320] text-base`}>
                    {i + 1}
                  </span>
                  <h2 className={`${serif.className} mt-4 text-xl`}>{etape.titre}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f6357]">{etape.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pieces" className="scroll-mt-24 px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className={`${serif.className} text-3xl md:text-4xl`}>{t.piecesTitle}</h2>
              <p className="mt-4 leading-relaxed text-[#5c5140]">{t.piecesSubtitle}</p>
            </div>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {pieces.map((product) => {
                const image = product.images[0];
                return (
                  <Link key={product.slug} href={`/${locale}/artisanat/${product.slug}#cotes`} className="group flex flex-col gap-4">
                    <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${hoverZoom}`} style={{ backgroundColor: image?.bg ?? "#ffffff" }}>
                      {image && (
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className={image.fit === "contain" ? "object-contain p-4" : "object-cover"}
                          style={image.position ? { objectPosition: image.position } : undefined}
                        />
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-[#6d2c2c] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                        {t.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className={`${serif.className} text-lg transition-colors duration-300 group-hover:text-[#6d2c2c]`}>{product.name}</h3>
                      <p className="mt-1 text-sm text-[#6f6357]">{product.tagline}</p>
                      <span className="mt-3 inline-block border-b border-[#6d2c2c] pb-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d2c2c]">
                        {t.cta}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="formulaire" className="scroll-mt-24 border-t border-[#e5ddd3] px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className={`${serif.className} text-3xl md:text-4xl`}>{t.formTitle}</h2>
            <p className="mt-3 leading-relaxed text-[#5c5140]">{t.formSubtitle}</p>
            <div className="mt-8">
              <DevisForm
                t={dict.contact.form}
                email={dict.contact.email}
                locale={locale}
                prefill={`${t.prefill}\n\n`}
                redirectTo={`/${locale}/rendez-vous/merci`}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
