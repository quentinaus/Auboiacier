import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { serif } from "@/lib/fonts";

const photos = [
  {
    src: "/images/interieur-ensemble.jpg",
    alt: "Plafond lumineux tendu au-dessus d'une salle à manger, avec escalier et table sur mesure",
  },
  { src: "/images/plafond-salle.jpg", alt: "Plafond lumineux tendu — salle épurée" },
  { src: "/images/plafond-garage.png", alt: "Plafond lumineux LED — garage aménagé" },
];

export default async function RealisationsPage({
  params,
}: PageProps<"/[lang]/toiles-tendues/realisations">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.realisations;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className={`${serif.className} text-3xl font-medium md:text-4xl`}>{t.title}</h1>
      <p className="mt-2 max-w-xl text-white/60">{t.subtitle}</p>

      <div className="mt-8 flex gap-3 text-sm">
        <span className="rounded-full bg-white px-4 py-2 text-gray-900">
          {t.filterAll}
        </span>
        <span className="rounded-full border border-white/20 px-4 py-2 text-white/70">
          {t.filterResidential}
        </span>
        <span className="rounded-full border border-white/20 px-4 py-2 text-white/70">
          {t.filterCommercial}
        </span>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {photos.map((photo) => (
          <figure key={photo.src} className="flex flex-col gap-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <figcaption className="text-sm text-white/70">{photo.alt}</figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-10 text-sm text-white/50">{t.moreSoon}</p>
    </div>
  );
}
