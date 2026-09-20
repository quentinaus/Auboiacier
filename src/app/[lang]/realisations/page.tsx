import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom } from "@/lib/ui";

/** Les familles publiées, telles qu'elles s'écrivent dans l'adresse. */
type Famille = "table" | "garde-corps" | "escalier" | "plafond" | "verriere" | "sculpture";

/** Les clés de légende, une par photo — chacune existe dans les deux dictionnaires. */
type CleLegende =
  | "altTableMikado"
  | "altGardeCorpsInterieur"
  | "altGardeCorpsRue"
  | "altEscalierSalle"
  | "altEscalierMarche"
  | "altSalle"
  | "altPlafondBeton"
  | "altLucarneCouleur"
  | "altHaloSalle"
  | "altReunion"
  | "altVerriereSalon"
  | "altVerriereCroisillon"
  | "altSculptureCheval";

/**
 * Chantiers publiés. Chacun porte sa famille et la clé de sa légende dans le
 * dictionnaire : la légende change donc de langue avec le reste du site.
 * `lien`, quand il existe, mène à la fiche de la pièce posée — pour qu'un
 * visiteur convaincu par une photo puisse configurer la sienne tout de
 * suite.
 * Pour ajouter un chantier : une ligne ici, et la légende dans les deux
 * dictionnaires (realisations.altXxx), en français et en anglais.
 */
const photos: { src: string; alt: CleLegende; famille: Famille; lien?: string }[] = [
  {
    src: "/images/mikado/ambiance.jpg",
    alt: "altTableMikado",
    famille: "table",
    lien: "table-mikado",
  },
  {
    src: "/images/garde-corps/fenetre-pose.jpg",
    alt: "altGardeCorpsInterieur",
    famille: "garde-corps",
    lien: "garde-corps",
  },
  {
    src: "/images/garde-corps/fenetre-rue.jpg",
    alt: "altGardeCorpsRue",
    famille: "garde-corps",
    lien: "garde-corps",
  },
  {
    src: "/images/escalier/limon-droit.jpg",
    alt: "altEscalierSalle",
    famille: "escalier",
    lien: "escalier-limon-central",
  },
  {
    src: "/images/escalier/marche-detail.jpg",
    alt: "altEscalierMarche",
    famille: "escalier",
    lien: "escalier-limon-central",
  },
  {
    src: "/images/salle-plafond-mikado.jpg",
    alt: "altSalle",
    famille: "plafond",
    lien: "plafond-lumineux-lucarne",
  },
  {
    src: "/images/salle-plafond-tuile.jpg",
    alt: "altPlafondBeton",
    famille: "plafond",
    lien: "plafond-lumineux-lucarne",
  },
  {
    src: "/images/lumiere/lucarne-rgb.jpg",
    alt: "altLucarneCouleur",
    famille: "plafond",
    lien: "plafond-lumineux-lucarne",
  },
  {
    src: "/images/lumiere/rond-allume.jpg",
    alt: "altHaloSalle",
    famille: "plafond",
    lien: "plafond-lumineux-halo",
  },
  {
    src: "/images/lumiere/salle-ronde.jpg",
    alt: "altReunion",
    famille: "plafond",
    lien: "plafond-lumineux-halo",
  },
  {
    src: "/images/verriere-interieure.jpg",
    alt: "altVerriereSalon",
    famille: "verriere",
    lien: "verrieres",
  },
  {
    src: "/images/verriere-croisillon.jpg",
    alt: "altVerriereCroisillon",
    famille: "verriere",
    lien: "verrieres",
  },
  {
    src: "/images/sculpture-cheval-v2.jpg",
    alt: "altSculptureCheval",
    famille: "sculpture",
    lien: "sculptures",
  },
];

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
            const figure = (
              <>
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
  );
}
