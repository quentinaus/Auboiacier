import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { PlafondLumineux } from "@/components/plafond-lumineux";
import { products, priceFrom, productLocalise } from "@/lib/products";
import { MaterialBubble } from "@/components/material-bubble";
import { serif } from "@/lib/fonts";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { PhotoPlafondAnime, MembraneAnimee } from "@/components/photo-plafond-anime";

const realisationPhotos: {
  src: string;
  alt: string;
  /** Même description, en anglais : elle est lue par les moteurs et les lecteurs d'écran. */
  altEn: string;
  clipBox?: { left: string; top: string; width: string; height: string };
  clip?: string;
}[] = [
  {
    src: "/images/lumiere/lucarne-rgb.jpg",
    alt: "Plafond lumineux Lucarne posé, toile tendue éclairée en dégradé rose et bleu",
    altEn: "Lucarne backlit stretch ceiling installed, fabric lit in a pink-to-blue gradient",
  },
  {
    src: "/images/lumiere/salle-ronde.jpg",
    alt: "Grand plafond lumineux rond au-dessus d'une salle de réunion",
    altEn: "Large round backlit stretch ceiling above a meeting room",
  },
  {
    src: "/images/salle-plafond-large.jpg",
    alt: "Plafond lumineux au-dessus d'une table à manger",
    altEn: "Backlit stretch ceiling above a dining table",
  },
];

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/toiles-tendues">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/toiles-tendues",
    title: dict.seo.lumiere.title,
    description: dict.seo.lumiere.description,
    image: "/images/lumiere/salle-ronde.jpg",
  });
}

export default async function ToilesTenduesPage({
  params,
}: PageProps<"/[lang]/toiles-tendues">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.home;
  const ta = dict.artisanat;

  // Nom, description des photos et teintes de cadre dans la langue du visiteur.
  const luminaires = products
    .filter((product) => product.category === "lumiere")
    .map((product) => productLocalise(product, locale));

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <h1 className={`${serif.className} text-4xl text-[#2b2320] md:text-5xl`}>{t.heroTitle}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-[#5c5140]">{t.heroSubtitle}</p>

        {/* Le catalogue, exactement comme du côté mobilier */}
        <section className="mt-16">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[#726757]">
            {t.catalogueLumiere}
          </h2>
          <p className="mt-2 text-sm text-[#726757]">{t.catalogueLumiereNote}</p>

          <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {luminaires.map((product, index) => (
              <Link
                key={product.slug}
                href={`/${locale}/artisanat/${product.slug}`}
                className="group flex flex-col gap-4"
              >
                {/* Vignette carrée : la photo garde ses proportions, donc la
                    membrane animée reste calée sur la toile. */}
                <div
                  className={`relative aspect-square overflow-hidden rounded-xl ${hoverZoom}`}
                  style={{ backgroundColor: product.images[0]?.bg ?? "#ffffff" }}
                >
                  {product.images[0] && (
                    <Image
                      src={product.images[0].src}
                      alt={product.images[0].alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      // Première rangée du catalogue, sous le titre : préchargée
                      // plutôt que chargée après la mise en page (élément LCP).
                      priority={index < 3}
                      className={
                        product.images[0].fit === "contain"
                          ? "object-contain p-4"
                          : "object-cover"
                      }
                    />
                  )}
                  {product.images[0]?.glow && (
                    <MembraneAnimee
                      box={product.images[0].glow.box}
                      clip={product.images[0].glow.clip}
                    />
                  )}
                </div>

                <div>
                  <h3
                    className={`${serif.className} text-lg text-[#2b2320] transition-colors duration-300 group-hover:text-black`}
                  >
                    {product.name}
                  </h3>
                  <p className="mt-1.5 flex items-baseline gap-2 text-[#726757]">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                      {ta.from}
                    </span>
                    <span className="text-[15px] font-medium tabular-nums text-[#2b2320]">
                      {prixAffiche(priceFrom(product) ?? 0, locale)}
                    </span>
                  </p>
                  {/* Aperçu des teintes de cadre, mêmes pastilles que la fiche produit. */}
                  <div className="mt-3 flex items-center gap-1.5">
                    {product.metals.slice(0, 8).map((material) => (
                      <MaterialBubble key={material.id} material={material} taille="miniature" className="h-5 w-4" />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Le sur-mesure : au-delà des tailles du catalogue */}
        <section className="mt-20 grid items-center gap-10 rounded-2xl bg-[#0b0a09] p-8 md:grid-cols-[1fr_1.1fr] md:p-12">
          <div>
            <h2 className={`${serif.className} text-2xl text-white md:text-3xl`}>
              {t.surMesureTitle}
            </h2>
            <p className="mt-4 leading-relaxed text-white/70">{t.surMesureBody}</p>
            <Link
              href={`/${locale}/devis`}
              className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-opacity hover:opacity-90"
            >
              {t.ctaButton}
            </Link>
          </div>
          {/* La toile est réellement éclairée par le dégradé animé. */}
          <PlafondLumineux alt={t.altPlafondDemo} className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]" />
        </section>

        {/* Réalisations */}
        <section className="mt-20">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[#726757]">
            {t.realisationsTitle}
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {realisationPhotos.map((photo) => (
              <div
                key={photo.src}
                className={`relative aspect-[16/10] overflow-hidden rounded-xl ${hoverZoom}`}
              >
                {photo.clip && photo.clipBox ? (
                  <PhotoPlafondAnime
                    src={photo.src}
                    alt={locale === "en" ? photo.altEn : photo.alt}
                    box={photo.clipBox}
                    clip={photo.clip}
                    sizes="(max-width: 768px) 100vw, 560px"
                  />
                ) : (
                  <Image
                    src={photo.src}
                    alt={locale === "en" ? photo.altEn : photo.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                  />
                )}
              </div>
            ))}
          </div>
          <Link
            href={`/${locale}/realisations?famille=plafond`}
            className="mt-6 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-[#2b2320] underline underline-offset-4"
          >
            {t.heroCtaSecondary}
          </Link>
        </section>

        {/* Ce que ça change */}
        <section className="mt-20 grid gap-10 border-t border-[#e5ddd3] pt-10 md:grid-cols-3">
          {t.pourquoi.map((item, index) => (
            <div key={item.title}>
              <span className="font-mono text-sm text-[#6f6357]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className={`${serif.className} mt-3 text-lg text-[#2b2320]`}>{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{item.body}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Bandeau atelier : panneau sombre et photo, le même dessin partout. */}
      <BandeauDetail
        titre={ta.craftBandTitle}
        corps={ta.craftBandBody}
        cta={{ href: `/${locale}/contact`, label: dict.nav.contact }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/salle-plafond-mikado.jpg", alt: dict.artisanat.altBandeauLumiere }}
      />
    </div>
  );
}
