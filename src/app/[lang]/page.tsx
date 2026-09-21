import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { PhotoPlafondAnime } from "@/components/photo-plafond-anime";
import { hoverZoom } from "@/lib/ui";

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
}) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[46vh] items-center justify-center overflow-hidden sm:min-h-[58vh] md:min-h-[78vh] ${
        divider ? "border-t border-white/15 md:border-l md:border-t-0" : ""
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
        style={{ objectPosition }}
        className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/55 transition-opacity duration-500 group-hover:opacity-90" />

      <div className="relative z-10 flex flex-col items-center px-3 text-center sm:px-6">
        {/* Ce n'est pas un titre de section mais l'intitulé d'un lien : en
            faire un <h2> plaçait deux titres de niveau 2 AVANT le titre de la
            page, et la structure se lisait à l'envers pour un lecteur d'écran
            comme pour Google. */}
        <p
          className={`${serif.className} max-w-md text-3xl font-normal leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl`}
        >
          {title}
        </p>
        {subtitle && (
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/90 drop-shadow-md sm:mt-5 sm:max-w-md sm:text-sm">
            {subtitle}
          </p>
        )}
        {/* En contour et non en plein : les deux tuiles sont côte à côte
            dès md, deux boutons bordeaux se faisaient concurrence au premier
            écran. Toute la tuile est le lien ; ce bouton n'est qu'une
            invitation. Le seul plein bordeaux de l'accueil est « Demander un
            devis », en bas de page : c'est lui qui convertit. */}
        <span className="mt-6 inline-block border border-white/70 px-7 py-3 text-[11px] font-medium uppercase leading-tight tracking-[0.18em] text-white transition-colors duration-300 group-hover:bg-white group-hover:text-[#2b2320] sm:px-8 sm:py-3.5 md:mt-7 md:tracking-[0.2em]">
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

  /** Vrais témoignages clients — à remplir, rien d'inventé ici. */
  const testimonials: { quote: string; author: string }[] = [];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} overlay />
      <main id="contenu">

      {/* 1. Les deux univers, plein écran */}
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
          priority
        />
        <HeroPanel
          href={`/${locale}/artisanat`}
          src="/images/mikado/ambiance.jpg"
          alt={t.altHeroMobilier}
          title={t.craftTitle}
          subtitle={t.craftSubtitle}
          cta={t.craftCta}
          objectPosition="50% 55%"
          priority
          divider
        />
      </section>

      {/* 2. Ce que fait l'atelier, écrit noir sur blanc.
          Le titre de niveau 1 était caché et ne contenait aucun des mots que
          les gens tapent : ni métallier, ni Saumur, ni table, ni acier. Google
          accorde très peu de poids à un titre invisible — et un visiteur qui
          arrive du moteur veut savoir en une phrase où il est tombé. */}
      <section className="border-t border-[#e5ddd3] bg-[#ffffff] px-6 py-8 md:py-10">
        <div className="mx-auto max-w-2xl text-center">
          {/* Le titre garde toute sa phrase pour le référencement, mais se
              lit en deux temps : le métier et la ville en lettrine, le
              reste en dessous, plus discret. */}
          {(() => {
            const [metier, ...reste] = t.h1.split(" — ");
            return (
              <h1 className={`${serif.className} text-[#2b2320]`}>
                <span className="block text-xl leading-tight sm:text-2xl md:text-[1.6rem]">{metier}</span>
                {reste.length > 0 && (
                  <span className="mt-2 block text-sm font-normal leading-relaxed text-[#6f6357] md:text-[0.95rem]">
                    {reste.join(" — ")}
                  </span>
                )}
              </h1>
            );
          })()}
          <span aria-hidden className="mx-auto mt-5 block h-px w-10 bg-[#2b2320]/60" />
        </div>
      </section>

      {/* 2 bis. Le configurateur : ce que peu d'artisans offrent, dit
          clairement — on entre ses cotes, on voit le prix, on télécharge
          son devis. Trois portes, une par famille configurable. */}
      <section className="border-t border-[#e5ddd3] bg-[#f5f1ea] px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#6f6357]">{t.configLabel}</p>
          <h2 className={`${serif.className} mt-4 text-2xl text-[#2b2320] sm:text-3xl md:text-[2.4rem] md:leading-tight`}>
            {t.configTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#5c5140] md:text-[0.95rem]">{t.configText}</p>
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
                className={`inline-flex items-center justify-center rounded-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
                  porte.plein
                    ? "btn-verre text-white"
                    : "border border-[#2b2320]/30 text-[#2b2320] hover:border-black hover:text-black"
                }`}
              >
                {porte.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Bandeau atelier */}
      <section>
        <div className="relative flex h-[240px] items-center justify-center overflow-hidden sm:h-[280px] md:h-[340px]">
          <Image
            src="/images/atelier-soudeur.jpg"
            alt={t.altAtelier}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative z-10 px-6 text-center">
            <h2 className={`${serif.className} text-2xl text-white drop-shadow-lg sm:text-3xl`}>{t.bandTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 drop-shadow md:text-[0.95rem]">{t.bandSubtitle}</p>
          </div>
        </div>
      </section>

      {/* 4. Les catégories */}
      <section className="bg-[#f5f1ea] px-6 pb-16 pt-10 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.3em] text-[#6f6357]">
            {t.categoriesTitle}
          </h2>
          {/* Quatre par rangée, plus petites ; la dernière rangée se centre. */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-6">
            {categories.map((c) => (
              <div key={c.href + c.label} className="basis-[calc(50%-0.5rem)] md:basis-[calc(25%-1.125rem)]">
                <CategoryTile {...c} />
              </div>
            ))}
          </div>
        </div>
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
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.3em] text-[#6f6357]">
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
            <p className="mx-auto mt-8 max-w-xl text-center leading-relaxed text-[#726757]">
              {t.testimonialsNote}
            </p>
          )}

          {/* Les deux pages de fond (zone desservie, questions fréquentes)
              se rejoignent d'ici : sans lien, personne ne les trouve. */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
            {[
              { href: `/${locale}/realisations`, label: t.testimonialsCta },
              { href: `/${locale}/zone-intervention`, label: dict.nav.zone },
              { href: `/${locale}/faq`, label: dict.nav.faq },
            ].map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black"
              >
                {lien.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. La mission, sur une photo plein cadre */}
      <section className="relative flex min-h-[55vh] items-center justify-center overflow-hidden md:min-h-[80vh]">
        <Image
          src="/images/vignes-coucher-soleil.jpg"
          alt={t.altVignes}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className={`${serif.className} text-2xl text-white sm:text-3xl md:text-4xl`}>{t.missionTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-white/85">{t.missionBody}</p>
          <Link
            href={`/${locale}/contact`}
            className="btn-verre mt-10 inline-block px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
          >
            {t.missionCta}
          </Link>
        </div>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="dark" />
    </div>
  );
}
