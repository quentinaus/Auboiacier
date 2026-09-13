import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BandeauDetail } from "@/components/bandeau-detail";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { products, priceFrom, productLocalise, remplissageConforme, type Famille, type Product } from "@/lib/products";
import { serif } from "@/lib/fonts";
import { MaterialBubble } from "@/components/material-bubble";
import { hoverZoom, prixAffiche } from "@/lib/ui";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat",
    title: dict.seo.artisanat.title,
    description: dict.seo.artisanat.description,
    image: "/images/mikado/devant/noir.jpg",
  });
}

/**
 * Un modèle est-il fait pour la fenêtre du client ? On arrive ici depuis une
 * fiche qui a dit non (les croix laissent des vides hors norme à cette
 * hauteur) : chaque modèle de la famille dit s'il convient, ou non.
 */
function convientAuxCotes(product: Product, hauteurMm: number): "oui" | "non" | "verre" {
  const modele = product.remplissages?.[0];
  if (!modele) return "oui";
  if (remplissageConforme(modele, hauteurMm)) return "oui";
  return product.remplissages?.some((option) => remplissageConforme(option, hauteurMm)) ? "verre" : "non";
}

/** Un entier de millimètres lu dans l'adresse, ou rien. */
function mm(valeur: string | string[] | undefined) {
  const n = Number(Array.isArray(valeur) ? valeur[0] : valeur);
  return Number.isInteger(n) && n > 0 && n <= 10_000 ? n : null;
}

export default async function ArtisanatPage({
  params,
  searchParams,
}: PageProps<"/[lang]/artisanat">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;
  const h = dict.hub;
  // « ?pour=garde-corps&l=1180&h=940 » : une fiche renvoie ici avec les cotes
  // du client, pour qu'on lui montre ce qui lui convient.
  const query = await searchParams;
  const pour = Array.isArray(query.pour) ? query.pour[0] : query.pour;
  const cotes = { l: mm(query.l), h: mm(query.h) };

  /**
   * Une section par métier, dans l'ordre de la maison : d'abord ce qui se
   * commande en ligne au prix affiché, puis ce qui se dessine sur devis.
   * Les verrières et les sculptures ont leur page à elles : elles ferment
   * la liste avec une carte vers cette page.
   */
  const familles: {
    id: Famille | "verrieres" | "sculptures";
    titre: string;
    note?: string;
    page?: { href: string; src: string; alt: string; position?: string; titre: string };
  }[] = [
    { id: "table-interieur", titre: h.catTables },
    { id: "chaise", titre: h.catChaises },
    { id: "escalier", titre: h.catEscaliers },
    { id: "garde-corps", titre: h.catGardeCorps, note: t.familleGardeCorpsNote },
    {
      id: "verrieres",
      titre: h.catVerrieres,
      page: {
        href: `/${locale}/artisanat/verrieres`,
        src: "/images/verriere-interieure.jpg",
        alt: dict.verrieres.photoAlt,
        position: "50% 45%",
        titre: dict.verrieres.title,
      },
    },
    { id: "table-exterieur", titre: h.catTablesExt },
    { id: "chaise-exterieur", titre: h.catChaisesExt },
    {
      id: "sculptures",
      titre: h.catSculptures,
      page: {
        href: `/${locale}/artisanat/sculptures`,
        src: "/images/sculpture-cheval-v2.jpg",
        alt: dict.sculptures.photoAlt,
        position: "50% 35%",
        titre: dict.sculptures.title,
      },
    },
  ];
  const sections = familles
    .map((famille) => ({
      ...famille,
      // Les textes du catalogue (nom, description des photos, matières)
      // passent dans la langue du visiteur.
      pieces: products
        .filter((product) => product.famille === famille.id && product.category !== "lumiere")
        .map((product) => productLocalise(product, locale)),
    }))
    .filter((famille) => famille.pieces.length > 0 || famille.page);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <h1 className={`${serif.className} text-4xl text-[#2b2320] md:text-5xl`}>{t.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-[#5c5140]">{t.subtitle}</p>

        {/* Le sommaire : une puce par section, pour sauter directement aux
            garde-corps sans passer devant toutes les tables. */}
        <nav aria-label={t.famillesNav} className="mt-8 flex flex-wrap gap-2">
          {sections.map((famille) => (
            <a
              key={famille.id}
              href={`#${famille.id}`}
              className="rounded-full border border-[#e5ddd3] bg-white px-3.5 py-1.5 text-xs text-[#5c5140] transition-colors hover:border-[#6d2c2c] hover:text-[#6d2c2c]"
            >
              {famille.titre}
            </a>
          ))}
        </nav>

        {sections.map((famille) => {
          const cible = pour === famille.id && cotes.l !== null && cotes.h !== null ? cotes : null;
          const compatibles = cible
            ? famille.pieces.filter((product) => convientAuxCotes(product, cible.h as number) === "oui").length
            : 0;
          const nombre = famille.pieces.length + (famille.page ? 1 : 0);
          return (
            <section key={famille.id} id={famille.id} className="mt-16 scroll-mt-24">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{famille.titre}</h2>
                <span className="text-xs text-[#726757]">
                  {(nombre > 1 ? t.familleModelesPluriel : t.familleModeles).replace("{n}", String(nombre))}
                </span>
              </div>
              {famille.note && <p className="mt-2 max-w-xl text-sm text-[#726757]">{famille.note}</p>}

              {/* Les cotes du client, et ce qui leur convient. */}
              {cible && (
                <div
                  role="status"
                  className="mt-4 rounded-2xl border border-[#6d2c2c]/20 bg-[#6d2c2c]/[0.04] px-5 py-4 text-sm leading-relaxed text-[#2a2116]"
                >
                  <p className="font-medium" style={{ color: "#6d2c2c" }}>
                    {t.compatTitre
                      .replace("{l}", cible.l!.toLocaleString(locale === "en" ? "en-GB" : "fr-FR"))
                      .replace("{h}", cible.h!.toLocaleString(locale === "en" ? "en-GB" : "fr-FR"))}
                  </p>
                  <p className="mt-1 text-[#5c5140]">
                    {compatibles === 0
                      ? t.compatAucun
                      : (compatibles > 1 ? t.compatOkPluriel : t.compatOk).replace("{n}", String(compatibles))}
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {famille.pieces.map((product) => {
                  const convient = cible ? convientAuxCotes(product, cible.h as number) : null;
                  return (
                  <Link
                    key={product.slug}
                    href={`/${locale}/artisanat/${product.slug}`}
                    className={`group flex flex-col gap-4 ${convient === "non" ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl ${hoverZoom}`}
                      // Le cadre prend la teinte du fond de la photo : son contour ne se voit plus.
                      style={{ backgroundColor: product.images[0]?.bg ?? "#ffffff" }}
                    >
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].src}
                          alt={product.images[0].alt}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className={
                            product.images[0].fit === "contain"
                              ? "object-contain p-4"
                              : "object-cover"
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#f1ece4] p-6">
                          <span
                            className={`${serif.className} text-center text-3xl leading-tight text-[#726757]`}
                          >
                            {product.name}
                          </span>
                        </div>
                      )}
                      {convient && (
                        <span
                          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                            convient === "non" ? "bg-white/90 text-[#726757]" : "bg-[#6d2c2c] text-white"
                          }`}
                        >
                          {convient === "oui" ? t.compatBadge : convient === "verre" ? t.compatVerre : t.compatNon}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3
                        className={`${serif.className} text-lg text-[#2b2320] transition-colors duration-300 group-hover:text-[#6d2c2c]`}
                      >
                        {product.name}
                      </h3>
                      {/* Le chiffre que le client cherche : il avait exactement
                          la taille et la couleur de la note grise du dessus. */}
                      {priceFrom(product) === null ? (
                        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#726757]">
                          {t.onQuote}
                        </p>
                      ) : (
                        <p className="mt-1.5 flex items-baseline gap-2 text-[#726757]">
                          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                            {t.from}
                          </span>
                          <span className="text-[15px] font-medium tabular-nums text-[#2b2320]">
                            {prixAffiche(priceFrom(product) as number, locale)}
                          </span>
                        </p>
                      )}
                      {/* Aperçu des matières disponibles, mêmes pastilles que la fiche produit. */}
                      <div className="mt-3 flex items-center gap-1.5">
                        {[...product.woods, ...product.metals, ...(product.fabrics ?? [])]
                          .slice(0, 8)
                          .map((material) => (
                            <MaterialBubble
                              key={`${material.id}-${material.label}`}
                              material={material}
                              className="h-4 w-4"
                            />
                          ))}
                      </div>
                    </div>
                  </Link>
                  );
                })}

                {/* Les verrières et les sculptures se font sur devis, sur leur
                    propre page : une carte vers cette page ferme la section. */}
                {famille.page && (
                  <Link href={famille.page.href} className="group flex flex-col gap-4">
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-white ${hoverZoom}`}
                    >
                      <Image
                        src={famille.page.src}
                        alt={famille.page.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        style={{ objectPosition: famille.page.position }}
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <h3
                        className={`${serif.className} text-lg text-[#2b2320] transition-colors duration-300 group-hover:text-[#6d2c2c]`}
                      >
                        {famille.page.titre}
                      </h3>
                      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#726757]">
                        {t.onQuote}
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bandeau atelier : panneau sombre et photo, le même dessin partout. */}
      <BandeauDetail
        titre={t.craftBandTitle}
        corps={t.craftBandBody}
        cta={{ href: `/${locale}/contact`, label: dict.nav.contact }}
        mention={dict.artisanat.madeInFrance}
        photo={{ src: "/images/mikado/ambiance.jpg", alt: dict.hub.altHeroMobilier }}
      />
    </div>
  );
}
