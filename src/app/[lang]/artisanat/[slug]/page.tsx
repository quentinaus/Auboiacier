import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import {
  devisSurMesure,
  epaisseurMaxMm,
  getProduct,
  products,
  priceFrom,
  productLocalise,
} from "@/lib/products";
import { ProductView } from "@/components/product-view";
import { ProductTail } from "@/components/product-tail";
import { MembraneAnimee } from "@/components/photo-plafond-anime";
import {
  metadataPage,
  jsonLdProduit,
  jsonLdFilAriane,
  scriptJsonLd,
  ATELIER,
} from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom, hoverZoomSubtle, prixAffiche } from "@/lib/ui";

const ACCENT = "#6d2c2c";

/**
 * Les photos à membrane sont carrées ; les blocs éditoriaux les affichent dans
 * un cadre 4/3 en « cover », qui rogne 12,5 % en haut et en bas. On décale donc
 * la membrane d'autant, sinon la lumière ne tomberait pas sur la toile.
 */
function membraneEn43(box: { left: string; top: string; width: string; height: string }) {
  const pc = (v: string) => parseFloat(v);
  return {
    left: box.left,
    width: box.width,
    top: `${((pc(box.top) - 12.5) / 0.75).toFixed(2)}%`,
    height: `${(pc(box.height) / 0.75).toFixed(2)}%`,
  };
}

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const fiche = getProduct(slug);
  if (!fiche) return {};
  // Ce que lit Google : le nom et l'accroche doivent être dans la langue de la page.
  const product = productLocalise(fiche, locale);

  // Le prix écrit de la même façon dans le résultat de recherche et sur la
  // page : Google affichait « From €2 870 » là où la page disait « 2 870 € ».
  const prixDepart = priceFrom(product);
  const depuis =
    prixDepart === null
      ? locale === "fr"
        ? "Sur devis, pose comprise."
        : "Price on request, fitting included."
      : locale === "fr"
        ? `À partir de ${prixAffiche(prixDepart, locale)}.`
        : `From ${prixAffiche(prixDepart, locale)}.`;
  // Le titre porte la pièce, la matière et la ville : c'est ce que les gens
  // tapent. Surtout pas l'accroche commerciale, trop longue pour les soixante
  // signes que Google affiche — elle se faisait couper en plein milieu, et le
  // titre se réduisait alors au nom du modèle, que personne ne cherche.
  const title = product.seoMots
    ? `${product.name} — ${product.seoMots}`
    : `${product.name} — ${product.tagline}`;
  const description = `${product.tagline} ${depuis} ${dict.seo.produitSuffixe}`;

  return metadataPage({
    locale,
    chemin: `/artisanat/${product.slug}`,
    title,
    description,
    image: product.images[0]?.src,
    motsCles: [
      `${product.name} ${ATELIER.ville}`,
      locale === "fr" ? `${product.name} sur mesure` : `made-to-measure ${product.name}`,
      `${product.name} ${ATELIER.departement}`,
    ],
  });
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/artisanat/[slug]">) {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;

  const fiche = getProduct(slug);
  if (!fiche) notFound();
  // Tout ce qui vient du catalogue passe dans la langue du visiteur : nom,
  // accroche, blocs descriptifs, caractéristiques, tailles et matières.
  const product = productLocalise(fiche, locale);

  // On reste dans le même univers : une lumière ne renvoie pas vers une table.
  const memeUnivers = products.filter(
    (p) => p.slug !== product.slug && p.category === product.category
  );
  const related = (memeUnivers.length > 0
    ? memeUnivers
    : products.filter((p) => p.slug !== product.slug)
  )
    .slice(0, 3)
    .map((p) => productLocalise(p, locale));
  /** La lumière a sa propre boutique : le fil d'Ariane y ramène. */
  const boutique =
    product.category === "lumiere" ? `/${locale}/toiles-tendues` : `/${locale}/artisanat`;
  const categorie =
    product.category === "lumiere" ? dict.hub.lightingLabel : t.breadcrumbCategory;
  const hasImages = product.images.length > 0;

  /** Images des blocs éditoriaux : on pioche dans les coloris pour ne pas répéter la même photo. */
  const sectionImages: {
    src: string;
    alt: string;
    /** Fond uni de studio : la photo se montre entière, sur ce fond. */
    bg?: string;
    fit?: "cover" | "contain";
    glow?: { box: { left: string; top: string; width: string; height: string }; clip: string };
  }[] = [
    ...product.images,
    ...(product.photosDescriptif ?? []),
    ...(product.fabrics ?? [])
      .filter((f) => f.image && !product.images.some((img) => img.src === f.image))
      .map((f) => ({ src: f.image as string, alt: `${product.name} — ${f.label}` })),
  ];

  /** Achetable en ligne : le bas de page renvoie alors au bouton d'achat. */
  const achetable = product.orderMode === "cart";

  /**
   * La fourchette annoncée à Google doit couvrir ce qu'on vend réellement :
   * les tailles du catalogue, mais aussi le choix de l'essence et le sur-mesure.
   * Elle disait 2 310 – 5 190 € pour une table qui part à 950 € en sur-mesure
   * et monte à près de 14 000 € en noyer épais.
   */
  const ecartsBois = product.woods.map((bois) => bois.priceDelta ?? 0);
  const boisMin = ecartsBois.length ? Math.min(...ecartsBois) : 0;
  const boisMax = ecartsBois.length ? Math.max(...ecartsBois) : 0;
  const bareme = product.surMesure;
  const devisMin = bareme
    ? devisSurMesure(product, bareme.minMm, bareme.minMm)
    : null;
  const devisMax = bareme
    ? devisSurMesure(
        product,
        bareme.maxLargeurMm,
        bareme.maxHauteurMm,
        epaisseurMaxMm(bareme, bareme.maxLargeurMm, bareme.maxHauteurMm)
      )
    : null;
  const prixDepartFiche = priceFrom(product);
  const prixMin = Math.min(
    prixDepartFiche ?? Number.POSITIVE_INFINITY,
    devisMin?.ok ? devisMin.prix + boisMin : Number.POSITIVE_INFINITY
  );
  const prixMax = Math.max(
    product.sizes.length ? Math.max(...product.sizes.map((taille) => taille.price)) + boisMax : 0,
    devisMax?.ok ? devisMax.prix + boisMax : 0
  );
  // Une pièce sur devis sans prix d'appel n'annonce aucune fourchette à
  // Google : mieux vaut pas d'offre qu'une offre inventée.
  const fourchette =
    Number.isFinite(prixMin) && prixMax > 0 ? { prixMin, prixMax } : undefined;

  return (
    <div>
      {/* Fiche produit et fil d'Ariane pour les moteurs : c'est ce qui fait
          apparaître le prix et le fil de navigation dans les résultats. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdProduit({
            locale,
            chemin: `/artisanat/${product.slug}`,
            nom: product.name,
            description: `${product.tagline} ${product.sections[0]?.body ?? ""}`.trim(),
            images: product.images.map((img) => img.src),
            fourchette,
            achetable: product.orderMode === "cart",
          })
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          /* Les deux premières étapes pointaient vers la même adresse :
             Google jetait le fil entier et n'affichait aucun chemin. */
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            {
              nom: categorie,
              chemin: product.category === "lumiere" ? "/toiles-tendues" : "/artisanat",
            },
            { nom: product.name, chemin: `/artisanat/${product.slug}` },
          ])
        )}
      />

      {/* 1. Fiche : galerie + options */}
      <div className="mx-auto max-w-6xl px-6 py-6 md:py-8">
        <nav aria-label={dict.nav.breadcrumb} className="text-xs text-[#726757]">
          <Link href={`/${locale}`} className="hover:text-[#2b2320]">
            {dict.nav.home}
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={boutique} className="hover:text-[#2b2320]">
            {categorie}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#2b2320]">{product.name}</span>
        </nav>

        {/* Ancre « acheter » : c'est ici que remonte le bouton du bas de page. */}
        <div id="acheter" className="scroll-mt-24">
          <ProductView product={product} t={t} locale={locale} />
        </div>

        {/* 2. Blocs éditoriaux */}
        <div className="mt-24 flex flex-col gap-16 md:gap-24">
          {product.sections.map((section, i) =>
            hasImages ? (
              <div key={section.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  {/* Une photo de studio (fond uni) se montre entière dans le
                      cadre ; une photo d'ambiance le remplit. */}
                  <div
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl ${hoverZoomSubtle}`}
                    style={{ backgroundColor: section.image ? "#ffffff" : (sectionImages[(i + 1) % sectionImages.length].bg ?? "#ffffff") }}
                  >
                    <Image
                      src={section.image ?? sectionImages[(i + 1) % sectionImages.length].src}
                      alt={section.image ? section.title : sectionImages[(i + 1) % sectionImages.length].alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 560px"
                      className={
                        !section.image && sectionImages[(i + 1) % sectionImages.length].fit === "contain"
                          ? "object-contain p-4"
                          : "object-cover"
                      }
                    />
                    {(() => {
                      if (section.image) return null;
                      const glow = sectionImages[(i + 1) % sectionImages.length].glow;
                      if (!glow) return null;
                      return <MembraneAnimee box={membraneEn43(glow.box)} clip={glow.clip} />;
                    })()}
                  </div>
                </div>
                <div>
                  <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{section.title}</h2>
                  <p className="mt-4 leading-relaxed text-[#4a4038]">{section.body}</p>
                </div>
              </div>
            ) : (
              <div key={section.title} className="rounded-2xl bg-[#f5f1ea] px-8 py-14 md:px-16">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{section.title}</h2>
                  <p className="mt-4 leading-relaxed text-[#4a4038]">{section.body}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* 3. Artisanat français */}
      <section className="mt-24 bg-[#6d2c2c] px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`${serif.className} text-3xl`}>{t.craftBandTitle}</h2>
          <p className="mt-5 leading-relaxed text-white/85">{t.craftBandBody}</p>
        </div>
      </section>

      {/* 4. Livraison */}
      <section className="bg-[#f5f1ea] px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`${serif.className} text-2xl text-[#2b2320] md:text-3xl`}>
            {t.deliveryTitle}
          </h2>
          <p className="mt-5 leading-relaxed text-[#4a4038]">{t.deliveryBody}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        {/* 5. Descriptif */}
        <section id="descriptif" className="scroll-mt-24 pt-20">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.descriptifTitle}</h2>
          <dl className="mt-6 max-w-2xl divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
            {product.specs.map((spec) => (
              <div key={spec.label} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr]">
                <dt className="text-sm text-[#726757]">{spec.label}</dt>
                <dd className="text-sm leading-relaxed text-[#2b2320]">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 6. Délai */}
        <section className="mt-20 border-t border-[#e8e1d8] pt-16 text-center">
          <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.delaiTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-[#4a4038]">{t.delaiBody}</p>
          {/* Le bouton doit tenir sa promesse : une pièce du catalogue remonte
              au choix des dimensions et au bouton d'achat ; une pièce qui ne se
              vend que sur devis mène au formulaire de contact. */}
          <Link
            href={achetable ? "#acheter" : `/${locale}/contact?produit=${product.slug}`}
            className="mt-8 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            {achetable ? t.delaiCta : t.delaiCtaDevis}
          </Link>
        </section>

      </div>

      <ProductTail dict={dict} locale={locale} testimonial={product.testimonial} />

      <div className="mx-auto max-w-6xl px-6">
        {/* 11. Vous aimerez aussi */}
        {related.length > 0 && (
          <div className="border-t border-[#e8e1d8] py-16 pb-24">
            <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.relatedTitle}</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/${locale}/artisanat/${p.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <div
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl ${hoverZoom}`}
                    style={{ backgroundColor: p.images[0]?.bg ?? "#ffffff" }}
                  >
                    {p.images[0] ? (
                      <Image
                        src={p.images[0].src}
                        alt={p.images[0].alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className={
                          p.images[0].fit === "contain" ? "object-contain p-4" : "object-cover"
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#f1ece4] p-6">
                        <span className={`${serif.className} text-center text-2xl text-[#726757]`}>
                          {p.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className={`${serif.className} text-lg text-[#2b2320]`}>{p.name}</h3>
                    <p className="mt-1 text-sm text-[#726757]">
                      {priceFrom(p) === null
                        ? t.onQuote
                        : `${t.from} ${prixAffiche(priceFrom(p) as number, locale)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              href={`/${locale}/artisanat`}
              className="mt-10 inline-block text-sm text-[#726757] hover:text-[#2b2320]"
            >
              {t.backToCatalogue}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
