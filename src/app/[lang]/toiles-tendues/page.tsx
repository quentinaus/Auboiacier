import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdListe, scriptJsonLd } from "@/lib/seo";
import { PlafondLumineux } from "@/components/plafond-lumineux";
import { products, priceFrom, productLocalise } from "@/lib/products";
import { MaterialBubble } from "@/components/material-bubble";
import { serif } from "@/lib/fonts";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { PhotoPlafondAnime, MembraneAnimee } from "@/components/photo-plafond-anime";
import { FaqVisible } from "@/components/faq-visible";
import { delaiFabrication, remplir } from "@/lib/vitrine";
import { questionsPlafonds } from "@/lib/faq-balisees";
import { Apparition } from "@/components/apparition";
import { VideoBoucle } from "@/components/video-boucle";

/**
 * Les titres en grand : la ponctuation haute (« ? », « : »…) et l'unité d'une
 * cote ne partent jamais seules à la ligne (« 230 × 210 cm », « mur à mur ? »).
 * Le texte ne change pas, seules ces espaces deviennent insécables.
 */
const sansVeuve = (texte: string) =>
  texte
    .replace(/ ([?!:;»])/g, "\u00a0$1")
    .replace(/(\d) ([×x]) (\d)/g, "$1\u00a0$2\u00a0$3")
    .replace(/(\d) (cm|mm|m|km|€|K)(?![\p{L}])/gu, "$1\u00a0$2");

/** Les plafonds en situation : des images d'illustration (voir src/lib/visuels.ts), pas des chantiers. */
const misesEnSituation: {
  src: string;
  alt: string;
  /** Même description, en anglais : elle est lue par les moteurs et les lecteurs d'écran. */
  altEn: string;
  clipBox?: { left: string; top: string; width: string; height: string };
  clip?: string;
}[] = [
  {
    src: "/images/lumiere/lucarne-rgb.jpg",
    alt: "Plafond lumineux Lucarne, toile tendue éclairée en dégradé rose et bleu",
    altEn: "Lucarne backlit stretch ceiling, fabric lit in a pink-to-blue gradient",
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
  const tl = dict.lumiere;

  // Nom, description des photos et teintes de cadre dans la langue du visiteur.
  const luminaires = products
    .filter((product) => product.category === "lumiere")
    .map((product) => productLocalise(product, locale));

  // Le délai, lu à la ligne « Fabrication » de la fiche : jamais recopié ici.
  const delai = luminaires.map(delaiFabrication).find((d) => d !== null) ?? null;
  const avecDelai = (texte: string) =>
    delai ? remplir(texte, { delai }) : texte.replace(/[^.]*\{delai\}[^.]*\.\s*/, "");

  // Les questions affichées en bas de page, et balisées pour Google depuis la
  // même liste — balisées sur cette page seulement (src/lib/faq-balisees.ts).
  const questions = questionsPlafonds(dict, delai);

  // « {n} formes, prix affichés » : le nombre de modèles vient du catalogue.
  const titreCatalogue = remplir(t.catalogueLumiere, { n: String(luminaires.length) });

  /** Le titre d'une section, le même dessin que sur l'accueil. */
  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  /** Le titre d'un bloc à l'intérieur d'une section. */
  const titreBloc = `${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";

  return (
    <div>
      {/* Le chemin de navigation et la liste des deux modèles, pour les moteurs. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.hub.lightingLabel, chemin: "/toiles-tendues" },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdListe(
            locale,
            titreCatalogue,
            luminaires.map((p) => ({ nom: p.name, chemin: `/artisanat/${p.slug}` }))
          )
        )}
      />

      {/* Façon Apple (Quentin, 06/10/2026 : « plus premium, moins IA ») : un grand titre, des textes lisibles, des
          sections qui respirent, blanc et papier en alternance comme sur l'accueil. */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pb-16 md:pt-16">
        {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
        <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[13px] text-[#6f6357]">
          <Link href={`/${locale}`} className="hover:text-[#2b2320]">
            {dict.nav.home}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#2b2320]">{dict.hub.lightingLabel}</span>
        </nav>
        <h1
          className={`entree-monte ${serif.className} mt-8 max-w-4xl text-[2.4rem] leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}
          style={{ "--retard": "100ms" } as CSSProperties}
        >
          {t.heroTitle}
        </h1>
        <p
          className="entree-monte mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:text-[21px]"
          style={{ "--retard": "280ms" } as CSSProperties}
        >
          {t.heroSubtitle}
        </p>
      </section>

      {/* Le catalogue, exactement comme du côté mobilier : des cartes blanches sur fond papier (la photo, détourée sur
          blanc, se perdait sur une page blanche). */}
      <section className="bg-[#f5f1ea] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Apparition>
            <h2 className={titreSection}>{titreCatalogue}</h2>
            <p className="mt-4 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{t.catalogueLumiereNote}</p>
          </Apparition>

          <div
            // Mêmes colonnes que les tables : des cartes de 270 à 360 px, jamais deux demi-pages (« trop zoomé », Quentin, 10/10/2026).
            className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 md:mt-12 lg:grid-cols-3 xl:grid-cols-4"
          >
            {luminaires.map((product, index) => (
              // Animation CSS : la carte (l'image principale de la page) s'affiche sans attendre le JavaScript (diagnostic du 09/10/2026).
              <div key={product.slug} className="entree-monte" style={{ "--retard": `${200 + (index % 4) * 110}ms` } as CSSProperties}>
                <Link
                  href={`/${locale}/artisanat/${product.slug}`}
                  className="group flex flex-col gap-5"
                >
                  {/* Vignette carrée : la photo garde ses proportions, donc la
                      membrane animée reste calée sur la toile. */}
                  <div
                    className={`relative aspect-square overflow-hidden rounded-[24px] ${hoverZoom}`}
                    style={{ backgroundColor: product.images[0]?.bg ?? "#ffffff" }}
                  >
                    {product.images[0] && (
                      <Visuel
                        locale={locale}
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
                    <h3 className={titreBloc}>{product.name}</h3>
                    {/* Sans prix au catalogue : « Sur devis », jamais « 0 € ». */}
                    {(() => {
                      const depart = priceFrom(product);
                      return depart === null ? (
                        <p className="mt-2.5 text-[15px] text-[#5c5140] md:text-[16px]">{ta.onQuote}</p>
                      ) : (
                        // Le prix comme sur les cartes de la collection. En demi-gras, l'espace des milliers
                        // disparaissait (« 1290 € ») : en medium, il reste (« 1 290 € »).
                        <p className="mt-2.5 flex items-baseline gap-2 text-[15px] text-[#5c5140] md:text-[16px]">
                          <span>{ta.from}</span>
                          <span className="text-[17px] font-medium tabular-nums text-[#2b2320] md:text-[18px]">
                            {prixAffiche(depart, locale)}
                          </span>
                        </p>
                      );
                    })()}
                    {/* Aperçu des teintes de cadre, mêmes pastilles que la fiche produit. */}
                    <div className="mt-4 flex items-center gap-1.5">
                      {product.metals.slice(0, 8).map((material) => (
                        <MaterialBubble key={material.id} material={material} taille="miniature" className="h-5 w-4" />
                      ))}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ce que l'on achète ici, et ce que n'est pas : un plafond tendu mur à
          mur. Les fiches Lucarne et Halo renvoient à cette ancre. */}
      <section id="plafond-tendu" className="scroll-mt-24 bg-[#ffffff] py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Apparition>
            <h2 className={`${titreSection} max-w-3xl`}>{sansVeuve(tl.choixTitle)}</h2>
          </Apparition>
          <div className="mt-10 grid max-w-3xl gap-8 md:mt-14 lg:max-w-none lg:grid-cols-3 lg:gap-10">
            {[tl.choixCadre, tl.choixTendu, tl.choixPrix].map((paragraphe, i) => (
              <Apparition key={paragraphe} retard={(i % 4) * 110}>
                <p className={texte}>{paragraphe}</p>
              </Apparition>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f1ea] py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid max-w-3xl gap-12 lg:max-w-none lg:grid-cols-3 lg:gap-10">
            {[
              { titre: tl.poseTitle, texte: tl.poseBody },
              { titre: tl.lumiereTitle, texte: tl.lumiereBody },
              { titre: tl.piecesTitle, texte: tl.piecesBody },
            ].map((bloc, i) => (
              <Apparition key={bloc.titre} retard={(i % 4) * 110}>
                <h2 className={titreBloc}>{sansVeuve(bloc.titre)}</h2>
                <p className={`mt-4 ${texte}`}>{bloc.texte}</p>
              </Apparition>
            ))}
          </div>

          <Apparition className="mt-16 max-w-3xl border-t border-[#e5ddd3] pt-12 md:mt-24 md:pt-16">
            <h2 className={titreBloc}>{sansVeuve(tl.fabricationTitle)}</h2>
            <p className={`mt-4 ${texte}`}>{avecDelai(tl.fabricationBody)}</p>
            <Link href={`/${locale}/zone-intervention`} className="lien-fleche mt-6 py-1 text-[#2b2320]">
              {tl.zoneLink}
            </Link>
          </Apparition>

          {/* Le sur-mesure : au-delà des tailles du catalogue */}
          <Apparition className="mt-16 md:mt-28">
            <div className="grid items-center gap-10 rounded-[28px] bg-[#0b0a09] px-6 py-12 sm:px-10 md:grid-cols-[1fr_1.1fr] md:px-14 md:py-16">
              <div>
                <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-white sm:text-[2.5rem] md:text-[3rem]`}>
                  {sansVeuve(t.surMesureTitle)}
                </h2>
                <p className="mt-6 text-[16px] leading-[1.55] text-white/80 md:text-[17px]">{t.surMesureBody}</p>
                <Link href={`/${locale}/devis`} className="btn-clair mt-10">
                  {t.ctaButton}
                </Link>
              </div>
              {/* La toile est réellement éclairée par le dégradé animé. */}
              <PlafondLumineux locale={locale} alt={t.altPlafondDemo} className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]" />
            </div>
          </Apparition>
        </div>
      </section>

      {/* Mises en situation (images d'illustration) */}
      <section className="bg-[#ffffff] py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Apparition>
            <h2 className={titreSection}>{t.realisationsTitle}</h2>
          </Apparition>
          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3">
            {misesEnSituation.map((photo, i) => (
              <Apparition key={photo.src} retard={(i % 4) * 110}>
                <div className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${hoverZoom}`}>
                  {photo.clip && photo.clipBox ? (
                    <PhotoPlafondAnime
                      locale={locale}
                      src={photo.src}
                      alt={locale === "en" ? photo.altEn : photo.alt}
                      box={photo.clipBox}
                      clip={photo.clip}
                      sizes="(max-width: 768px) 100vw, min(33vw, 560px)"
                    />
                  ) : (
                    <Visuel
                      locale={locale}
                      src={photo.src}
                      alt={locale === "en" ? photo.altEn : photo.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, min(33vw, 560px)"
                      className="object-cover"
                    />
                  )}
                </div>
              </Apparition>
            ))}
          </div>
          <Link
            href={`/${locale}/realisations?famille=plafond`}
            className="lien-fleche mt-8 py-1 text-[#2b2320]"
          >
            {t.heroCtaSecondary}
          </Link>
        </div>
      </section>

      {/* En fabrication : de vraies photos et une vidéo de plafonds fabriqués par Quentin, avant l'ouverture de l'atelier
          (09/10/2026). Jamais présentés comme des chantiers d'Auboiacier : le texte le dit. */}
      <section className="bg-[#f5f1ea] py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Apparition className="max-w-2xl">
            <h2 className={titreSection}>{dict.lumiere.fabricationTitre}</h2>
            <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{dict.lumiere.fabricationTexte}</p>
          </Apparition>
          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3">
            <Apparition>
              <VideoBoucle
                locale={locale}
                src="/videos/plafond-caisson-led.mp4"
                poster="/images/atelier/plafond-caisson-led-poster.jpg"
                description={dict.realisations.altPlafondCaissonLed}
                libellePause={dict.sculptures.videoPause}
                libelleLecture={dict.sculptures.videoPlay}
                className="aspect-[4/5] w-full rounded-[22px] bg-[#e5ddd3]"
              />
            </Apparition>
            {[
              { src: "/images/atelier/plafond-profiles-alu.jpg", alt: dict.realisations.altPlafondProfiles },
              { src: "/images/atelier/plafond-toile-allumee.jpg", alt: dict.realisations.altPlafondToileAllumee },
            ].map((photo, i) => (
              <Apparition key={photo.src} retard={(i + 1) * 110}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px]">
                  <Visuel locale={locale} src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 100vw, min(33vw, 560px)" className="object-cover" />
                </div>
              </Apparition>
            ))}
          </div>
        </div>
      </section>

      {/* Ce que ça change */}
      <section className="bg-[#ffffff] py-16 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-3 md:gap-8 lg:gap-10">
          {t.pourquoi.map((item, index) => (
            <Apparition key={item.title} retard={(index % 4) * 110}>
              <span className="surtitre">{String(index + 1).padStart(2, "0")}</span>
              <h3 className={`${titreBloc} mt-3`}>{sansVeuve(item.title)}</h3>
              <p className={`mt-4 ${texte}`}>{item.body}</p>
            </Apparition>
          ))}
        </div>
      </section>

      {/* Questions fréquentes, affichées ET balisées depuis la même liste. Le
          composant garde son dessin ; la page agrandit seulement son titre et
          ses textes, comme les autres sections. */}
      <section className="bg-[#f5f1ea] py-16 md:py-28">
        <Apparition className="mx-auto max-w-6xl px-6">
          <FaqVisible
            titre={tl.faqTitle}
            questions={questions}
            className="max-w-3xl [&_h2]:text-[2rem] [&_h2]:leading-[1.05] [&_h2]:tracking-[-0.018em] sm:[&_h2]:text-[2.5rem] md:[&_h2]:text-[3rem] [&_h3]:text-[1.4rem] [&_h3]:leading-[1.12] [&_h3]:tracking-[-0.01em] [&_p]:text-[16px] [&_p]:leading-[1.55] md:[&_p]:text-[17px]"
          />
        </Apparition>
      </section>

      {/* Bandeau atelier : panneau sombre et photo, le même dessin partout. */}
      <BandeauDetail
        titre={ta.craftBandTitle}
        corps={ta.craftBandBody}
        cta={{ href: `/${locale}/contact`, label: dict.nav.contact }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/salle-plafond-mikado.jpg", alt: dict.artisanat.altBandeauLumiere }}
        locale={locale}
      />
    </div>
  );
}
