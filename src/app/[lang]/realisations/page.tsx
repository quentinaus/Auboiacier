import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";
import { VideoBoucle } from "@/components/video-boucle";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { photos, type Famille } from "@/lib/chantiers";

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

  // Le menu du site et le pied de page, comme sur les autres pages : sans eux, on ne pouvait plus revenir en arrière
  // depuis les Réalisations (Quentin, 05/10/2026).
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
    <GlobalHeader locale={locale} dict={dict} />
    <main id="contenu">
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{t.title}</h1>
      <p className="mt-2 max-w-xl text-[#5c5140]">{t.subtitle}</p>

      <nav className="mt-8 flex flex-wrap gap-3 text-sm" aria-label={t.title}>
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
                  ? "rounded-full bg-[#2b2320] px-4 py-2 text-white"
                  : "rounded-full border border-[#e5ddd3] px-4 py-2 text-[#5c5140] transition-colors hover:border-black hover:text-[#2b2320]"
              }
            >
              {choix.label}
            </Link>
          );
        })}
      </nav>

      {visibles.length > 0 ? (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {visibles.map((photo) => {
            const legende = t[photo.alt];
            // Une vidéo n'est pas dans un lien (elle a son bouton pause) : c'est sa légende qui mène à la fiche.
            if (photo.video) {
              return (
                <figure key={photo.src} className="flex flex-col gap-3">
                  <VideoBoucle
                    src={photo.video}
                    poster={photo.src}
                    description={legende}
                    libellePause={dict.sculptures.videoPause}
                    libelleLecture={dict.sculptures.videoPlay}
                    className="aspect-[4/5] w-full rounded-xl bg-[#e5ddd3]"
                  />
                  <figcaption className="text-sm text-[#726757]">
                    {photo.lien ? (
                      <Link href={`/${locale}/artisanat/${photo.lien}`} className="underline underline-offset-4 hover:text-[#2b2320]">
                        {legende}
                      </Link>
                    ) : (
                      legende
                    )}
                  </figcaption>
                </figure>
              );
            }
            const figure = (
              <>
                <div className={`relative ${photo.portrait ? "aspect-[4/5]" : "aspect-[16/10]"} overflow-hidden rounded-xl ${hoverZoom}`}>
                  <Image
                    src={photo.src}
                    alt={legende}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-sm text-[#726757]">{legende}</figcaption>
              </>
            );
            return (
              <figure key={photo.src} className="flex flex-col gap-3">
                {photo.lien ? (
                  <Link href={`/${locale}/artisanat/${photo.lien}`} className="flex flex-col gap-3">
                    {figure}
                  </Link>
                ) : (
                  figure
                )}
              </figure>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 leading-relaxed text-[#5c5140]">{t.filterEmpty}</p>
      )}

      <p className="mt-10 text-sm text-[#6f6357]">{t.moreSoon}</p>
    </div>
    </main>
    <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
