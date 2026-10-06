import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";
import { VideoBoucle } from "@/components/video-boucle";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { Apparition } from "@/components/apparition";
import { photos, type Famille } from "@/lib/chantiers";
import { estVraiePhoto } from "@/lib/visuels";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/realisations">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/realisations",
    title: dict.seo.realisations.title,
    description: dict.seo.realisations.description,
    image: "/images/mikado/ambiance.jpg",
  });
}

export default async function RealisationsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/realisations">) {
  const { lang } = await params;
  const { famille } = await searchParams;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.realisations;

  const familles: Famille[] = ["table", "garde-corps", "escalier", "plafond", "verriere", "sculpture"];
  // Le filtre est un vrai lien : il marche sans JavaScript, il se partage, et
  // le bouton « page précédente » du navigateur le défait.
  const filtre = familles.includes(famille as Famille) ? (famille as Famille) : null;

  const filtres: { valeur: Famille | null; label: string }[] = [
    { valeur: null, label: t.filterAll },
    { valeur: "table", label: t.filterTable },
    { valeur: "garde-corps", label: t.filterGardeCorps },
    { valeur: "escalier", label: t.filterEscalier },
    { valeur: "plafond", label: t.filterPlafond },
    { valeur: "verriere", label: t.filterVerriere },
    { valeur: "sculpture", label: t.filterSculpture },
  ];

  const visibles = filtre ? photos.filter((p) => p.famille === filtre) : photos;
  /* L'adresse reste /realisations, mais la page dit ce qu'elle montre (décision de Quentin, 06/10/2026) : d'abord les
     vraies photos — le travail de Quentin, réalisé avant l'ouverture de l'atelier, jamais présenté comme un chantier
     d'Auboiacier ; puis les modèles en images, chacun marqué « Image
     d'illustration ». Aucun visuel n'est présenté comme un chantier. La liste des vraies photos : src/lib/visuels.ts. */
  const vraies = visibles.filter((p) => estVraiePhoto(p.src));
  const visuels = visibles.filter((p) => !estVraiePhoto(p.src));

  /** Une image et sa légende ; la légende mène à la fiche de la pièce. Deux par rangée : celle de droite arrive un peu
      après celle de gauche. */
  const carte = (photo: (typeof photos)[number], i: number) => {
    const legende = t[photo.alt];
    const retard = (i % 2) * 110;
    // Une vidéo n'est pas dans un lien (elle a son bouton pause) : c'est sa légende qui mène à la fiche.
    if (photo.video) {
      return (
        <Apparition key={photo.src} retard={retard}>
          <figure className="flex flex-col gap-4">
            <VideoBoucle
              locale={locale}
              src={photo.video}
              poster={photo.src}
              description={legende}
              libellePause={dict.sculptures.videoPause}
              libelleLecture={dict.sculptures.videoPlay}
              className="aspect-[4/5] w-full rounded-[22px] bg-[#e5ddd3] md:rounded-[26px]"
            />
            <figcaption className="text-[15px] leading-[1.45] text-[#5c5140] md:text-[16px]">
              {photo.lien ? (
                <Link href={`/${locale}/artisanat/${photo.lien}`} className="underline decoration-[#2b2320]/30 underline-offset-4 hover:text-[#2b2320] hover:decoration-[#2b2320]">
                  {legende}
                </Link>
              ) : (
                legende
              )}
            </figcaption>
          </figure>
        </Apparition>
      );
    }
    const figure = (
      <>
        <div className={`relative ${photo.portrait ? "aspect-[4/5]" : "aspect-[16/10]"} overflow-hidden rounded-[22px] md:rounded-[26px] ${hoverZoom}`}>
          <Visuel
            locale={locale}
            src={photo.src}
            alt={legende}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
          />
        </div>
        <figcaption className="text-[15px] leading-[1.45] text-[#5c5140] md:text-[16px]">{legende}</figcaption>
      </>
    );
    return (
      <Apparition key={photo.src} retard={retard}>
        <figure className="flex flex-col gap-4">
          {photo.lien ? (
            <Link href={`/${locale}/artisanat/${photo.lien}`} className="flex flex-col gap-4">
              {figure}
            </Link>
          ) : (
            figure
          )}
        </figure>
      </Apparition>
    );
  };

  // Le menu du site et le pied de page, comme sur les autres pages : sans eux, on ne pouvait plus revenir en arrière
  // depuis cette page (Quentin, 05/10/2026).
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
    <GlobalHeader locale={locale} dict={dict} />
    <main id="contenu">
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 md:pb-28 md:pt-24">
      {/* Le haut de page, façon Apple (Quentin, 06/10/2026) : grand titre, chapô, puis les pastilles de familles. Il monte
          sans attendre le JavaScript (pas d'<Apparition> au premier écran). */}
      <div className="entree-monte max-w-3xl" style={{ "--retard": "120ms" } as CSSProperties}>
        <h1 className={`${serif.className} text-[2.4rem] font-normal leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}>
          {t.title}
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-6 md:text-[21px]">{t.subtitle}</p>
      </div>

      <nav
        className="entree-monte mt-9 flex flex-wrap gap-2.5 text-[15px] md:mt-12"
        style={{ "--retard": "280ms" } as CSSProperties}
        aria-label={t.title}
      >
        {filtres.map((choix) => {
          const actif = filtre === choix.valeur;
          return (
            <Link
              key={choix.label}
              href={
                choix.valeur
                  ? `/${locale}/realisations?famille=${choix.valeur}`
                  : `/${locale}/realisations`
              }
              scroll={false}
              // aria-current : un lecteur d'écran annonce la pastille choisie.
              aria-current={actif ? "page" : undefined}
              className={
                actif
                  ? "rounded-full bg-[#1d1d1f] px-4 py-2 font-medium text-white"
                  : "rounded-full border border-[#e5ddd3] px-4 py-2 text-[#4a4038] transition-colors hover:border-[#1d1d1f] hover:text-[#1d1d1f]"
              }
            >
              {choix.label}
            </Link>
          );
        })}
      </nav>

      {visibles.length === 0 && (
        <p className="mt-12 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.filterEmpty}</p>
      )}

      {vraies.length > 0 && (
        <section className="mt-12 md:mt-16">
          <h2 className="surtitre">{t.chantierTitle}</h2>
          <div className="mt-6 grid gap-x-8 gap-y-12 md:mt-8 md:grid-cols-2 md:gap-y-16">{vraies.map(carte)}</div>
        </section>
      )}

      {visuels.length > 0 && (
        <section className="mt-16 md:mt-24">
          <h2 className="surtitre">{t.visuelsTitle}</h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.visuelsNote}</p>
          <div className="mt-8 grid gap-x-8 gap-y-12 md:mt-10 md:grid-cols-2 md:gap-y-16">{visuels.map(carte)}</div>
        </section>
      )}

      <p className="mt-14 text-center text-[15px] text-[#6f6357] md:mt-20">{t.moreSoon}</p>
    </div>
    </main>
    <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
