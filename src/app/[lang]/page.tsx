import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { CarteCategorie } from "@/components/carte-categorie";
import { categoriesCollection, piecesDeFamille } from "@/lib/categories-collection";
import { Visuel, MentionIllustration } from "@/components/visuel";
import type { Locale } from "@/lib/i18n";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { remplacerMarqueurs } from "@/lib/marqueurs";
import { metadataPage, lienAvisGoogle } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { PhotoPlafondAnime } from "@/components/photo-plafond-anime";
import { hoverZoom } from "@/lib/ui";
import { Apparition } from "@/components/apparition";
import { IndiceDefiler } from "@/components/indice-defiler";
import { getProduct, type Famille } from "@/lib/products";
import { prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import { prixAffiche } from "@/lib/ui";

/** Panneau cliquable : image plein cadre, titre centré, bouton. Pleine
 *  largeur sur téléphone, une moitié d'écran à partir de la tablette. */
function HeroPanel({
  href,
  src,
  alt,
  title,
  subtitle,
  cta,
  objectPosition,
  priority = false,
  rang = 0,
  locale,
}: {
  locale: Locale;
  href: string;
  src: string;
  alt: string;
  title: string;
  /** Une phrase pour choisir : prix fermes d'un côté, sur mesure de l'autre. */
  subtitle?: string;
  cta: string;
  objectPosition?: string;
  priority?: boolean;
  /** 0 pour le panneau de gauche, 1 pour celui de droite : le second
   *  s'anime un peu après le premier. */
  rang?: number;
}) {
  /** Titre, phrase puis bouton arrivent l'un après l'autre. */
  const entree = (i: number) =>
    ({ "--retard": `${250 + rang * 180 + i * 160}ms` }) as CSSProperties;
  return (
    <Link
      href={href}
      className="group relative flex min-h-[46vh] items-center justify-center overflow-hidden sm:min-h-[52vh] md:min-h-0"
    >
      {/* La caméra avance lentement (cadre) ; le survol agrandit la photo
          elle-même : les deux mouvements ne se contrarient pas. */}
      <div className="camera-lente absolute inset-0">
        {/* La mention se pose plus bas, au-dessus du voile : ici, elle avancerait avec la caméra. */}
        <Visuel
          locale={locale}
          mention={false}
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectPosition }}
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/55 transition-opacity duration-500 group-hover:opacity-90" />
      <MentionIllustration src={src} locale={locale} ton="sombre" />

      <div className="relative z-10 flex flex-col items-center px-3 text-center sm:px-6">
        {/* Ce n'est pas un titre de section mais l'intitulé d'un lien : en
            faire un <h2> plaçait deux titres de niveau 2 AVANT le titre de la
            page, et la structure se lisait à l'envers pour un lecteur d'écran
            comme pour Google. */}
        <p
          style={entree(0)}
          className={`entree-monte ${serif.className} max-w-md text-[2.2rem] font-normal leading-[1.04] tracking-[-0.016em] text-white drop-shadow-lg sm:text-[2.6rem] md:text-[clamp(2rem,min(3.4vw,6.4svh),3.4rem)]`}
        >
          {title}
        </p>
        {subtitle && (
          <p style={entree(1)} className="entree-monte mt-4 max-w-sm text-[15px] leading-snug text-white/90 drop-shadow-md sm:mt-5 sm:max-w-md md:text-[17px]">
            {subtitle}
          </p>
        )}
        {/* En contour et non en plein : les deux tuiles sont côte à côte
            dès md, deux boutons bordeaux se faisaient concurrence au premier
            écran. Toute la tuile est le lien ; ce bouton n'est qu'une
            invitation. Le seul plein bordeaux de l'accueil est « Demander un
            devis », en bas de page : c'est lui qui convertit. */}
        <span style={entree(2)} className="entree-monte lien-fleche mt-6 text-white md:mt-7">
          {cta}
        </span>
      </div>
    </Link>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "",
    title: dict.seo.hub.title,
    description: dict.seo.hub.description,
    image: "/images/mikado/ambiance.jpg",
  });
}

export default async function HubPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.hub;
  /** Le texte du bas, avec {prixVisite} et {rayonVisite} remplacés par les valeurs à jour. */
  const seoBlocs = remplacerMarqueurs(t.seoBlocs, locale);

  /** Les catégories en situation seulement, même cadrage (demande de Quentin, 09/10/2026 : « pas épuré, fait IA »). */
  const categories = categoriesCollection(locale, t).filter((c) => c.enSituation);

  /** Le garde-corps en haut de l'accueil, avec son prix d'appel calculé par l'outil (étude marketing, 06/10). */
  const ficheGC = getProduct("garde-corps");
  const appelGC = ficheGC ? prixAppelGC(ficheGC) : null;
  /** Le plus petit prix de départ d'une ou plusieurs familles (null : sur devis). */
  const departDe = (familles: Famille[]) => {
    const prix = familles.flatMap(piecesDeFamille).map(prixDepart).filter((p): p is number => p !== null);
    return prix.length ? Math.min(...prix) : null;
  };
  const des = (prix: number | null) => (prix === null ? "" : `${locale === "fr" ? "dès" : "from"} ${prixAffiche(prix, locale)}`);
  /** Les trois pièces qui se configurent en ligne, chacune avec son prix de départ. */
  const portesConfig = [
    { href: `/${locale}/artisanat/garde-corps#configuration`, label: t.catGardeCorps, prix: des(appelGC ? appelGC.prix : departDe(["garde-corps"])) },
    { href: `/${locale}/artisanat/tables`, label: t.catTables, prix: des(departDe(["table-interieur"])) },
    { href: `/${locale}/toiles-tendues`, label: t.catPlafonds, prix: des(departDe(["plafond"])) },
  ];

  /** Vrais témoignages clients — à remplir, rien d'inventé ici. */
  const testimonials: { quote: string; author: string }[] = [];
  // La fiche Google de l'atelier, quand elle existe : sans elle, ni phrase ni lien.
  const ficheGoogle = lienAvisGoogle();

  return (
    <div className="accueil-droit min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} overlay />
      <main id="contenu">

      {/* 1. Le premier écran, façon Apple (Quentin, 06/10/2026 : « plus premium, plus Apple ») : une seule grande photo,
          le grand titre de la page — le métier et la ville —, une phrase, deux boutons. Le h1 garde toute sa phrase pour
          le référencement : le métier en très grand, le reste dessous. */}
      {(() => {
        const [metier, ...reste] = t.h1.split(" — ");
        return (
          // La photo encadrée, avec du blanc autour (Quentin, 07/10/2026 : « moins zoomée, pas en pleine page, ça dégrade la
          // qualité ») ; le cadre ne prend pas tout l'écran : le haut de la suite se voit dessous.
          // Sur téléphone (en hauteur), une photo en largeur ne remplit l'écran qu'en étant très zoomée (Quentin, 07/10 :
          // « la photo est très zoomée ») : elle garde ses proportions, en haut, et le texte passe dessous, sur blanc.
          <>
          <section className="hero-accueil trio-accueil bg-white md:grid md:h-[100svh] md:min-h-[600px] md:grid-cols-2 md:grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-px">
          <div className="relative md:col-span-2 md:flex md:items-center md:overflow-hidden">
            <div className="relative aspect-[3/2] overflow-hidden bg-[#1d1d1f] md:absolute md:inset-0 md:aspect-auto">
            <div className="camera-lente camera-douce absolute inset-0">
              {/* La mention se pose plus bas, au-dessus du voile : ici, elle avancerait avec la caméra. */}
              <Visuel
                locale={locale}
                mention={false}
                src="/images/mikado/ambiance-hd.jpg"
                alt={t.altHeroMobilier}
                fill
                priority
                sizes="(max-width: 1680px) 100vw, 1680px"
                style={{ objectPosition: "50% 58%" }}
                className="object-cover"
              />
            </div>
            {/* Sur téléphone, seulement de quoi lire le menu en haut ; sur ordinateur, de quoi lire le titre posé sur la photo. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/0 to-black/0 md:bg-gradient-to-r md:from-black/60 md:via-black/30 md:to-black/5" />
            <MentionIllustration src="/images/mikado/ambiance-hd.jpg" locale={locale} ton="sombre" />
            </div>
            <div className="relative z-10 mx-auto w-full max-w-6xl px-3 pb-2 pt-7 md:px-6 md:pb-0 md:pt-0">
              <h1 className={`${serif.className} max-w-5xl text-[#1d1d1f] md:text-white`}>
                <span className="entree-monte block text-[clamp(2.9rem,8.4vw,6.4rem)] font-normal leading-[0.98] tracking-[-0.022em] md:text-[clamp(2.6rem,min(6.6vw,11svh),6.4rem)]" style={{ "--retard": "200ms" } as CSSProperties}>
                  {metier}
                </span>
                {reste.length > 0 && (
                  <>
                    {/* Le tiret reste dans le texte du titre : sans lui, Google et les lecteurs d'écran liraient les
                        deux moitiés collées. */}
                    <span className="sr-only"> — </span>
                    <span
                      className="entree-monte mt-4 block max-w-xl font-sans text-[17px] font-normal leading-[1.45] tracking-[-0.01em] text-[#4a4038] md:mt-[2.6svh] md:text-[clamp(16px,2.4svh,21px)] md:text-white/88"
                      style={{ "--retard": "420ms" } as CSSProperties}
                    >
                      {reste.join(" — ").replace(/^./, (c) => c.toUpperCase())}.
                    </span>
                  </>
                )}
              </h1>
              <div className="entree-monte mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-[3.4svh]" style={{ "--retard": "620ms" } as CSSProperties}>
                <Link href={`/${locale}/artisanat`} className="btn-clair">
                  {t.craftCta}
                </Link>
                <Link href={`/${locale}/toiles-tendues`} className="lien-fleche text-[#1d1d1f] md:text-white">
                  {t.lightingCta}
                </Link>
              </div>
            </div>
            {/* « Découvrir » et la souris : sur ordinateur seulement (une souris ne dit rien sur un téléphone, et la suite s'y
                voit déjà sous le texte). */}
            <div className="hidden md:block">
              <IndiceDefiler cible="suite" label={locale === "fr" ? "Voir la suite de la page" : "Scroll to see more"} mot={locale === "fr" ? "Découvrir" : "Discover"} />
            </div>
          </div>
          {/* 1 ter. Les deux univers, dans le même cadre que la grande photo (Quentin, 07/10/2026 : « les trois photos en une
              page », séparées d'un trait blanc fin ; pas de trait sur le pourtour de la page). Sur téléphone, les panneaux se superposent :
              côte à côte, ils ne feraient que 180 px de large et le texte deviendrait illisible. */}
          <div className="mt-px grid grid-cols-1 gap-px md:contents">
        <HeroPanel
          locale={locale}
          href={`/${locale}/toiles-tendues`}
          src="/images/salle-plafond-mikado.jpg"
          alt={t.altHeroLumiere}
          title={t.lightingTitle}
          subtitle={t.lightingSubtitle}
          objectPosition="50% 26%"
          cta={t.lightingCta}
          // Sur téléphone, c'est la plus grande image du premier écran (diagnostic du 09/10/2026) : pas de chargement différé.
          priority
        />
        <HeroPanel
          locale={locale}
          href={`/${locale}/artisanat`}
          src="/images/escalier/limon-droit.jpg"
          alt={t.altEscaliers}
          title={t.craftTitle}
          subtitle={t.craftSubtitle}
          cta={t.craftCta}
          objectPosition="72% 50%"
          rang={1}
        />
          </div>
          </section>
          {/* La fin du cadre : « Découvrir » descend jusqu'ici. */}
          <span id="suite" aria-hidden="true" className="block h-0 scroll-mt-0" />
          </>
        );
      })()}

      {/* 2. Configurer sa pièce (refait le 09/10/2026, Quentin : « prend trop de place, pas élégant ») : une bande basse et
          typographique — à gauche le titre, à droite trois lignes fines, chacune avec son prix de départ. Plus de grande
          carte ni d'animation. */}
      <section className="border-t border-[#e5ddd3] bg-[#f5f1ea] px-6 py-12 md:py-16">
        <Apparition className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-14">
          <div>
            <p className="surtitre">{t.configLabel}</p>
            <h2 className={`${serif.className} mt-2 text-balance text-[1.7rem] leading-[1.1] tracking-[-0.016em] text-[#2b2320] md:text-[2.2rem]`}>
              {t.configTitle}
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-[1.5] text-[#6f6357] md:text-[16px]">
              {locale === "fr"
                ? "Vos cotes, votre prix tout de suite, votre devis en PDF : sans compte, sans engagement."
                : "Your measurements, your price straight away, your quote as a PDF: no account, no commitment."}
            </p>
          </div>
          <ul className="divide-y divide-[#e0d7cb] border-y border-[#e0d7cb]">
            {portesConfig.map((porte) => (
              <li key={porte.href}>
                <Link href={porte.href} className="group flex items-baseline justify-between gap-4 py-4 md:py-5">
                  <span className={`${serif.className} text-[1.2rem] leading-[1.2] text-[#2b2320] md:text-[1.4rem]`}>{porte.label}</span>
                  <span className="flex shrink-0 items-baseline gap-3 text-[14px] text-[#6f6357] md:text-[15px]">
                    {porte.prix}
                    <span aria-hidden="true" className="text-[#2b2320] transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Apparition>
      </section>

      {/* 3. Les catégories */}
      <section className="bg-[#f5f1ea] px-6 pb-16 pt-10 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${serif.className} text-center text-[2.1rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.7rem] md:text-[3.2rem]`}>
            {t.categoriesTitle}
          </h2>
          {/* Trois par rangée sur ordinateur, deux sur téléphone : six photos en situation, même cadrage. */}
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:mt-14 md:grid-cols-3 md:gap-y-14">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Apparition retard={(i % 3) * 110}>
                  <CarteCategorie categorie={c} locale={locale} sizes="(max-width: 768px) 50vw, min(33vw, 560px)" />
                </Apparition>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center md:mt-14">
            <Link href={`/${locale}/artisanat`} className="lien-fleche text-[#2b2320]">
              {locale === "fr" ? "Toute la collection" : "The full collection"}
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Les avis — remplir `testimonials` dès qu'il y a de vrais retours clients. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-24">
        <Apparition className="mx-auto max-w-5xl">
          <h2 className={`${serif.className} text-center text-[2.1rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.7rem]`}>
            {t.testimonialsTitle}
          </h2>

          {testimonials.length > 0 ? (
            <div className="mt-12 grid gap-12 md:grid-cols-3">
              {testimonials.map((review) => (
                <blockquote key={review.author} className="text-center">
                  <p className={`${serif.className} text-lg italic leading-relaxed text-[#2b2320]`}>
                    « {review.quote} »
                  </p>
                  <footer className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#6f6357]">
                    {review.author}
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <p className="mx-auto mt-6 max-w-xl text-center text-[17px] leading-[1.5] text-[#5c5140]">
              {ficheGoogle ? t.testimonialsNoteGoogle : t.testimonialsNote}
            </p>
          )}

          {/* Les deux pages de fond (zone desservie, questions fréquentes)
              se rejoignent d'ici : sans lien, personne ne les trouve. */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
            {/* Les avis restent sur la fiche Google : ni note recopiée, ni
                balisage d'avis sur le site. Le lien n'apparaît qu'une fois
                l'adresse de la fiche renseignée (NEXT_PUBLIC_ATELIER_GOOGLE). */}
            {ficheGoogle && (
              <a
                href={ficheGoogle}
                target="_blank"
                rel="noopener"
                className="lien-fleche py-2 text-[#2b2320]"
              >
                {t.avisGoogle}
              </a>
            )}
            {[
              { href: `/${locale}/realisations`, label: t.testimonialsCta },
              { href: `/${locale}/zone-intervention`, label: dict.nav.zone },
              { href: `/${locale}/faq`, label: dict.nav.faq },
            ].map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="lien-fleche py-2 text-[#2b2320]"
              >
                {lien.label}
              </Link>
            ))}
          </div>
        </Apparition>
      </section>

      {/* 5. Le texte que lisent les moteurs de recherche ET les visiteurs, tout en bas : ce que fait l'atelier, comment ça
          se passe, où il intervient (texte de la conversation Tarifs, 07/10/2026 : l'accueil doit garder assez de texte
          visible pour Google — rien de replié ni de caché). Puis les liens vers chaque fabrication. */}
      <section className="border-t border-[#e5ddd3] bg-white px-6 py-16 md:py-24">
        <Apparition className="mx-auto max-w-2xl">
          <h2 className={`${serif.className} text-[1.9rem] leading-[1.08] tracking-[-0.016em] text-[#2b2320] sm:text-[2.3rem]`}>{seoBlocs.titre}</h2>
          {seoBlocs.blocs.map((bloc, i) => (
            <div key={i} className={i ? "mt-9" : "mt-5"}>
              {"h3" in bloc && bloc.h3 && (
                <h3 className={`${serif.className} text-[1.4rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.6rem]`}>{bloc.h3}</h3>
              )}
              {bloc.paragraphes.map((paragraphe, j) => (
                <p key={j} className={`${"h3" in bloc && bloc.h3 && j === 0 ? "mt-3" : j ? "mt-4" : ""} text-[16px] leading-[1.65] text-[#4a4038] md:text-[17px]`}>
                  {paragraphe}
                </p>
              ))}
            </div>
          ))}
          <h3 className="surtitre mt-9">{t.seoLinksTitle}</h3>
          <ul className="mt-4 grid gap-x-8 gap-y-2.5 text-[16px] sm:grid-cols-2">
            {[
              "/artisanat/garde-corps",
              "/garde-corps-fenetre-normes",
              "/artisanat/escalier-limon-central",
              "/artisanat/verrieres",
              "/artisanat/tables",
              "/bois-massif",
              "/toiles-tendues",
              "/artisanat/sculptures",
              "/devis",
              "/rendez-vous",
              "/zone-intervention",
            ].map((chemin, i) => (
              <li key={chemin}>
                <Link href={`/${locale}${chemin}`} className="text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]">
                  {t.seoLinks[i]}
                </Link>
              </li>
            ))}
          </ul>
        </Apparition>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="dark" />
    </div>
  );
}
