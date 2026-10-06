import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { metadataPage, lienAvisGoogle } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { PhotoPlafondAnime } from "@/components/photo-plafond-anime";
import { hoverZoom } from "@/lib/ui";
import { Apparition } from "@/components/apparition";
import { Parallaxe } from "@/components/parallaxe";
import { getProduct } from "@/lib/products";
import { prixAppelGC } from "@/lib/prix-garde-corps.server";
import { prixAffiche } from "@/lib/ui";
import { GardeCorpsEnAplats } from "@/components/chargement-modeles";

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
  divider = false,
  rang = 0,
}: {
  href: string;
  src: string;
  alt: string;
  title: string;
  /** Une phrase pour choisir : prix fermes d'un côté, sur mesure de l'autre. */
  subtitle?: string;
  cta: string;
  objectPosition?: string;
  priority?: boolean;
  divider?: boolean;
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
      className={`group relative flex min-h-[46vh] items-center justify-center overflow-hidden sm:min-h-[52vh] md:min-h-[64vh] ${
        divider ? "border-t border-white/15 md:border-l md:border-t-0" : ""
      }`}
    >
      {/* La caméra avance lentement (cadre) ; le survol agrandit la photo
          elle-même : les deux mouvements ne se contrarient pas. */}
      <div className="camera-lente absolute inset-0">
        <Image
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

      <div className="relative z-10 flex flex-col items-center px-3 text-center sm:px-6">
        {/* Ce n'est pas un titre de section mais l'intitulé d'un lien : en
            faire un <h2> plaçait deux titres de niveau 2 AVANT le titre de la
            page, et la structure se lisait à l'envers pour un lecteur d'écran
            comme pour Google. */}
        <p
          style={entree(0)}
          className={`entree-monte ${serif.className} max-w-md text-[2.2rem] font-normal leading-[1.04] tracking-[-0.016em] text-white drop-shadow-lg sm:text-[2.6rem] md:text-[3.4rem]`}
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

/** Tuile de catégorie : photo portrait qui grandit au survol, titre dessous. */
function CategoryTile({
  href,
  src,
  alt,
  label,
  objectPosition,
  entiere = false,
  clip,
  clipBox,
}: {
  href: string;
  src: string;
  alt: string;
  label: string;
  objectPosition?: string;
  /** La photo en entier sur fond blanc, sans recadrage : pour une pièce détourée. */
  entiere?: boolean;
  /** Contour de la dalle lumineuse : la photo s'anime alors dedans. */
  clip?: string;
  clipBox?: { left: string; top: string; width: string; height: string };
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-3">
      <div className={`relative aspect-[4/5] w-full overflow-hidden ${entiere ? "bg-white" : ""} ${hoverZoom}`}>
        {clip && clipBox ? (
          <PhotoPlafondAnime
            src={src}
            alt={alt}
            box={clipBox}
            clip={clip}
            sizes="(max-width: 768px) 50vw, 280px"
            entiere={entiere}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 50vw, 280px"
            style={{ objectPosition }}
            className={entiere ? "object-contain" : "object-cover"}
          />
        )}
      </div>
      <span className={`${serif.className} text-[15px] text-[#2b2320] md:text-base`}>{label}</span>
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

  const categories = [
    {
      href: `/${locale}/artisanat#table-interieur`,
      // La photo détourée, rognée au plus près : la table prend toute la largeur.
      src: "/images/accueil/table-mikado-laiton.jpg",
      alt: t.altTables,
      label: t.catTables,
      entiere: true,
    },
    {
      href: `/${locale}/artisanat#table-exterieur`,
      src: "/images/table-exterieur-lattes.jpg",
      alt: t.altTablesExt,
      label: t.catTablesExt,
    },
    {
      href: `/${locale}/artisanat#chaise`,
      src: "/images/chaises/vert-bouteille.jpg",
      alt: t.altChaises,
      label: t.catChaises,
      objectPosition: "50% 55%",
    },
    {
      href: `/${locale}/artisanat#chaise-exterieur`,
      // Recadrage 3/4 du fauteuil, centré : la photo d'origine est en paysage.
      src: "/images/chaise-exterieur-tuile.jpg",
      alt: t.altChaisesExt,
      label: t.catChaisesExt,
    },
    {
      href: `/${locale}/artisanat/sculptures`,
      src: "/images/sculpture-cheval-v2.jpg",
      alt: t.altSculptures,
      label: t.catSculptures,
      objectPosition: "50% 40%",
    },
    {
      href: `/${locale}/artisanat#escalier`,
      src: "/images/escalier/limon-droit.jpg",
      alt: t.altEscaliers,
      label: t.catEscaliers,
      objectPosition: "88% 50%",
    },
    {
      href: `/${locale}/artisanat#garde-corps`,
      // La pièce détourée, en entier, plutôt que la photo de pose.
      src: "/images/accueil/garde-corps-fenetre.jpg",
      alt: t.altGardeCorps,
      label: t.catGardeCorps,
      entiere: true,
    },
    {
      href: `/${locale}/artisanat/verrieres`,
      src: "/images/verriere-interieure.jpg",
      alt: t.altVerrieres,
      label: t.catVerrieres,
      objectPosition: "50% 45%",
    },
    {
      // Le plafond rectangulaire, seul sur fond blanc.
      href: `/${locale}/artisanat/plafond-lumineux-lucarne`,
      src: "/images/lumiere/panneau-dessous-carre.jpg",
      alt: t.altLucarne,
      label: t.catLucarne,
      entiere: true,
      // La toile relevée sur la photo (carrée, montrée entière dans la
      // vignette 4/5 : un bandeau blanc de 10 % en haut et en bas, d'où les
      // pourcentages verticaux ramenés à 80 %) : le dégradé s'anime dedans.
      clipBox: { left: "11.9%", top: "33.3%", width: "80.3%", height: "37%" },
      clip: "polygon(66.6% 0%, 100% 47.4%, 34.2% 100%, 0% 66.9%)",
    },
    {
      // Le plafond rond, seul sur fond blanc.
      href: `/${locale}/artisanat/plafond-lumineux-halo`,
      src: "/images/lumiere/rond-dessous-carre.jpg",
      alt: t.altHalo,
      label: t.catHalo,
      entiere: true,
      clipBox: { left: "16.4%", top: "36.7%", width: "67.5%", height: "27.1%" },
      clip: "ellipse(50% 50% at 50% 50%)",
    },
  ];

  /** Le garde-corps en haut de l'accueil, avec son prix d'appel calculé par l'outil (étude marketing, 06/10). */
  const ficheGC = getProduct("garde-corps");
  const appelGC = ficheGC ? prixAppelGC(ficheGC) : null;

  /** Vrais témoignages clients — à remplir, rien d'inventé ici. */
  const testimonials: { quote: string; author: string }[] = [];
  // La fiche Google de l'atelier, quand elle existe : sans elle, ni phrase ni lien.
  const ficheGoogle = lienAvisGoogle();

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} overlay />
      <main id="contenu">

      {/* 1. Le premier écran, façon Apple (Quentin, 06/10/2026 : « plus premium, plus Apple ») : une seule grande photo,
          le grand titre de la page — le métier et la ville —, une phrase, deux boutons. Le h1 garde toute sa phrase pour
          le référencement : le métier en très grand, le reste dessous. */}
      {(() => {
        const [metier, ...reste] = t.h1.split(" — ");
        return (
          <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-[#1d1d1f] md:items-center">
            <div className="camera-lente absolute inset-0">
              <Image
                src="/images/mikado/ambiance.jpg"
                alt={t.altHeroMobilier}
                fill
                priority
                sizes="100vw"
                style={{ objectPosition: "50% 58%" }}
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/45 md:bg-gradient-to-r md:from-black/60 md:via-black/30 md:to-black/5" />
            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-32 md:pb-0 md:pt-0">
              <h1 className={`${serif.className} max-w-5xl text-white`}>
                <span className="entree-monte block text-[clamp(2.9rem,8.4vw,6.4rem)] font-normal leading-[0.98] tracking-[-0.022em]" style={{ "--retard": "200ms" } as CSSProperties}>
                  {metier}
                </span>
                {reste.length > 0 && (
                  <>
                    {/* Le tiret reste dans le texte du titre : sans lui, Google et les lecteurs d'écran liraient les
                        deux moitiés collées. */}
                    <span className="sr-only"> — </span>
                    <span
                      className="entree-monte mt-5 block max-w-xl font-sans text-[17px] font-normal leading-[1.45] tracking-[-0.01em] text-white/88 md:mt-7 md:text-[21px]"
                      style={{ "--retard": "420ms" } as CSSProperties}
                    >
                      {reste.join(" — ").replace(/^./, (c) => c.toUpperCase())}.
                    </span>
                  </>
                )}
              </h1>
              <div className="entree-monte mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-10" style={{ "--retard": "620ms" } as CSSProperties}>
                <Link href={`/${locale}/artisanat`} className="btn-clair">
                  {t.craftCta}
                </Link>
                <Link href={`/${locale}/toiles-tendues`} className="lien-fleche text-white">
                  {t.lightingCta}
                </Link>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 1 ter. Les deux univers, juste sous le premier écran */}
      {/* Sur téléphone les panneaux se superposent : côte à côte, ils ne font
          que 180 px de large et le texte devient illisible. */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <HeroPanel
          href={`/${locale}/toiles-tendues`}
          src="/images/salle-plafond-mikado.jpg"
          alt={t.altHeroLumiere}
          title={t.lightingTitle}
          subtitle={t.lightingSubtitle}
          objectPosition="50% 26%"
          cta={t.lightingCta}
        />
        <HeroPanel
          href={`/${locale}/artisanat`}
          src="/images/escalier/limon-droit.jpg"
          alt={t.altEscaliers}
          title={t.craftTitle}
          subtitle={t.craftSubtitle}
          cta={t.craftCta}
          objectPosition="72% 50%"
          divider
          rang={1}
        />
      </section>

      {/* 1 bis. Le garde-corps, tout de suite : le produit le plus demandé, avec un prix réaliste et la fenêtre qui va
          avec, avant toute configuration (étude marketing, 06/10). Sans prix (outil indisponible), pas de bandeau. */}
      {appelGC && (
        <section className="bg-[#f5f1ea] px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-[26px] border border-[#e5ddd3] bg-white px-5 py-6 shadow-[0_22px_50px_-36px_rgba(43,35,32,0.5)] md:flex-row md:gap-8 md:px-8">
            {/* Le dessin d'un garde-corps de la fiche (deux croix, rosaces, main courante en chêne) : pas une photo. */}
            {/* Le garde-corps en aplats des films du site, qui se fabrique sous les yeux quand le bandeau arrive (Quentin,
                06/10/2026 : reprendre le motion design déjà fait) : cadre, croix, soudure, rosaces, main courante en chêne. */}
            <Apparition className="w-44 shrink-0 rounded-2xl bg-[#f7f4ef] px-4 pb-3 pt-4 md:w-52">
              <GardeCorpsEnAplats uneFois className="h-auto w-full" />
            </Apparition>
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="surtitre">
                {locale === "fr" ? "Sur mesure, aux normes" : "Made to measure, to standard"}
              </p>
              <p className={`${serif.className} mt-1 text-[1.75rem] leading-[1.08] tracking-[-0.01em] text-[#2b2320] md:text-[2.1rem]`}>
                {locale === "fr" ? "Garde-corps de fenêtre" : "Window railings"}
              </p>
              <p className="mt-2 text-[15px] leading-snug text-[#4a4038] md:text-[17px]">
                {locale === "fr" ? "Dès " : "From "}
                <span className="font-semibold text-[#2b2320]">{prixAffiche(appelGC.prix, locale)}</span>
                {locale === "fr"
                  ? ` pour une fenêtre de ${appelGC.largeurMm / 10}\u00a0cm de large. Votre prix exact, à vos mesures, tout de suite.`
                  : ` for a window ${appelGC.largeurMm / 10} cm wide. Your exact price, to your measurements, straight away.`}
              </p>
            </div>
            <Link
              href={`/${locale}/artisanat/garde-corps#configuration`}
              className="btn-plein shrink-0"
            >
              {locale === "fr" ? "Calculer mon prix" : "Get my price"}
            </Link>
          </div>
        </section>
      )}

      {/* 2 bis. Le configurateur : ce que peu d'artisans offrent, dit
          clairement — on entre ses cotes, on voit le prix, on télécharge
          son devis. Trois portes, une par famille configurable. */}
      <section className="border-t border-[#e5ddd3] bg-[#f5f1ea] px-6 py-14 md:py-20">
        <Apparition className="mx-auto max-w-3xl text-center">
          <p className="surtitre">{t.configLabel}</p>
          <h2 className={`${serif.className} mt-3 text-[2.1rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.7rem] md:text-[3.5rem]`}>
            {t.configTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]">{t.configText}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            {[
              // Chaque porte mène aux modèles de sa famille — pas à un seul
              // d'entre eux — pour qu'on choisisse lequel configurer.
              { href: `/${locale}/artisanat#table-interieur`, label: t.configTable, plein: true },
              { href: `/${locale}/artisanat#garde-corps`, label: t.configGardeCorps, plein: false },
              { href: `/${locale}/toiles-tendues`, label: t.configPlafond, plein: false },
            ].map((porte) => (
              <Link
                key={porte.href}
                href={porte.href}
                className={porte.plein ? "btn-plein" : "btn-contour"}
              >
                {porte.label}
              </Link>
            ))}
          </div>
        </Apparition>
      </section>

      {/* 3. Bandeau atelier */}
      <section>
        <div className="relative flex h-[240px] items-center justify-center overflow-hidden sm:h-[280px] md:h-[340px]">
          {/* La photo glisse un peu moins vite que la page (Parallaxe). */}
          <Parallaxe>
            <Image
              src="/images/atelier-soudeur.jpg"
              alt={t.altAtelier}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </Parallaxe>
          <div className="absolute inset-0 bg-black/35" />
          <Apparition className="relative z-10 px-6 text-center">
            <h2 className={`${serif.className} text-[2rem] leading-[1.05] tracking-[-0.016em] text-white drop-shadow-lg sm:text-[2.6rem] md:text-[3.2rem]`}>{t.bandTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] text-white/88 drop-shadow md:text-[19px]">{t.bandSubtitle}</p>
          </Apparition>
        </div>
      </section>

      {/* 4. Les catégories */}
      <section className="bg-[#f5f1ea] px-6 pb-16 pt-10 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${serif.className} text-center text-[2.1rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.7rem] md:text-[3.2rem]`}>
            {t.categoriesTitle}
          </h2>
          {/* Quatre par rangée, plus petites ; la dernière rangée se centre. */}
          <div className="mt-10 flex flex-wrap justify-center gap-4 sm:gap-6 md:mt-14">
            {/* Les tuiles d'une même rangée arrivent l'une après l'autre. */}
            {categories.map((c, i) => (
              <Apparition
                key={c.href + c.label}
                retard={(i % 4) * 110}
                className="basis-[calc(50%-0.5rem)] md:basis-[calc(25%-1.125rem)]"
              >
                <CategoryTile {...c} />
              </Apparition>
            ))}
          </div>
        </div>
      </section>

      {/* 4 bis. Le texte que lisent les moteurs de recherche ET les visiteurs : ce que fait l'atelier, où, et comment avoir un prix.
          Écrit en phrases, pas en liste de mots-clés : Google pénalise l'entassement de mots et récompense un texte utile.
          Chaque lien mène à la fiche de la fabrication citée. */}
      <section className="border-t border-[#e5ddd3] bg-white px-6 py-14 md:py-20">
        <Apparition className="mx-auto max-w-3xl">
          <h2 className={`${serif.className} text-[1.9rem] leading-[1.08] tracking-[-0.016em] text-[#2b2320] sm:text-[2.3rem]`}>{t.seoTitle}</h2>
          <p className="mt-5 text-[16px] leading-[1.6] text-[#4a4038] md:text-[17px]">{t.seoP1}</p>
          <p className="mt-4 text-[16px] leading-[1.6] text-[#4a4038] md:text-[17px]">{t.seoP2}</p>
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

      {/* 5. Le mot de l'atelier — le panneau sombre et la marche d'escalier
          en gros plan : le même dessin que sur la page des verrières. */}
      <BandeauDetail
        titre={t.editorialTitle}
        corps={[t.editorialBody1, t.editorialBody2]}
        cta={{ href: `/${locale}/a-propos`, label: t.editorialCta }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/escalier/marche-detail.jpg", alt: t.altDetailMarche }}
      />

      {/* 6. Les avis — remplir `testimonials` dès qu'il y a de vrais retours clients. */}
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

      {/* 7. La mission, sur une photo plein cadre */}
      <section className="relative flex min-h-[55vh] items-center justify-center overflow-hidden md:min-h-[80vh]">
        <Parallaxe>
          <Image
            src="/images/vignes-coucher-soleil.jpg"
            alt={t.altVignes}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </Parallaxe>
        <div className="absolute inset-0 bg-black/45" />
        <Apparition className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className={`${serif.className} text-[2.2rem] leading-[1.05] tracking-[-0.018em] text-white sm:text-[2.8rem] md:text-[3.6rem]`}>{t.missionTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.5] text-white/88 md:text-[19px]">{t.missionBody}</p>
          <Link
            href={`/${locale}/contact`}
            className="btn-clair mt-10"
          >
            {t.missionCta}
          </Link>
        </Apparition>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="dark" />
    </div>
  );
}
