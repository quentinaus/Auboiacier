import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";

/** Les deux familles de chantiers, telles qu'elles s'écrivent dans l'adresse. */
type Categorie = "residentiel" | "professionnel";

/**
 * Chantiers publiés. Chacun porte sa catégorie et la clé de sa légende dans le
 * dictionnaire : la légende change donc de langue avec le reste du site.
 * Pour ajouter un chantier : une ligne ici, et la légende dans les deux
 * dictionnaires (realisations.altXxx), en français et en anglais.
 */
const photos: { src: string; alt: "altSalle" | "altReunion"; categorie: Categorie }[] = [
  {
    src: "/images/salle-plafond-mikado.jpg",
    alt: "altSalle",
    categorie: "residentiel",
  },
];

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/toiles-tendues/realisations">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/toiles-tendues/realisations",
    title: dict.seo.realisations.title,
    description: dict.seo.realisations.description,
    image: "/images/salle-plafond-mikado.jpg",
  });
}

export default async function RealisationsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/toiles-tendues/realisations">) {
  const { lang } = await params;
  const { categorie } = await searchParams;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.realisations;

  // Le filtre est un vrai lien : il marche sans JavaScript, il se partage, et
  // le bouton « page précédente » du navigateur le défait.
  const filtre =
    categorie === "residentiel" || categorie === "professionnel" ? categorie : null;

  const filtres = [
    { valeur: null, label: t.filterAll },
    { valeur: "residentiel" as const, label: t.filterResidential },
    { valeur: "professionnel" as const, label: t.filterCommercial },
  ];

  const visibles = filtre ? photos.filter((p) => p.categorie === filtre) : photos;

  return (
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
                  ? `/${locale}/toiles-tendues/realisations?categorie=${choix.valeur}`
                  : `/${locale}/toiles-tendues/realisations`
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
            return (
              <figure key={photo.src} className="flex flex-col gap-3">
                <div className={`relative aspect-[16/10] overflow-hidden rounded-xl ${hoverZoom}`}>
                  <Image
                    src={photo.src}
                    alt={legende}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-sm text-[#726757]">{legende}</figcaption>
              </figure>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 leading-relaxed text-[#5c5140]">{t.filterEmpty}</p>
      )}

      <p className="mt-10 text-sm text-[#6f6357]">{t.moreSoon}</p>
    </div>
  );
}
