import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdListe, scriptJsonLd } from "@/lib/seo";
import {
  getProduct,
  products,
  productLocalise,
  PLATEAU_MAX_LARGEUR_MM,
  PLATEAU_MAX_LONGUEUR_MM,
} from "@/lib/products";
import { prixDepart } from "@/lib/prix-garde-corps.server";
import { delaiFabrication, essencesParPrix, remplir } from "@/lib/vitrine";
import { serif } from "@/lib/fonts";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { MaterialBubble } from "@/components/material-bubble";
import { FaqVisible } from "@/components/faq-visible";
import { questionsTables } from "@/lib/faq-balisees";

/**
 * Les tables sur mesure, en une page : ce que cherchent ceux qui tapent
 * « table sur mesure bois massif ». Rien n'y est recopié du catalogue : les
 * modèles, leurs prix « à partir de », l'ordre de prix des essences, les
 * teintes du piétement, le plus grand plateau et le délai sont lus dans
 * src/lib/products.ts au moment de fabriquer la page.
 */

/** La table de référence : ses essences, ses teintes et ses tailles servent d'exemple. */
const REFERENCE = "table-mikado";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/tables">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/artisanat/tables",
    title: dict.seo.tables.title,
    description: dict.seo.tables.description,
    image: "/images/partage/artisanat.jpg",
  });
}

export default async function TablesPage({ params }: PageProps<"/[lang]/artisanat/tables">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.tables;
  const e = dict.essences;

  const tables = products
    .filter((p) => p.famille === "table-interieur" || p.famille === "table-exterieur")
    .map((p) => productLocalise(p, locale));
  const reference = productLocalise(getProduct(REFERENCE)!, locale);
  const essences = essencesParPrix(reference);
  const delai = delaiFabrication(reference);
  const cm = (mm: number) => String(mm / 10);
  // Les formats du catalogue pour 6, 8 et 10 couverts, tels qu'écrits sur la fiche.
  const formats = reference.sizes
    .filter((taille) => ["p6", "p8", "p10"].includes(taille.id))
    .map((taille) => taille.label)
    .join(locale === "fr" ? " ; " : "; ");

  const titreModeles = remplir(t.modelesTitle, { n: String(tables.length) });

  // Balisées pour Google : chacune ne l'est que sur cette page (src/lib/faq-balisees.ts).
  const questions = questionsTables(dict, formats);

  const lien =
    "inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black";

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.artisanat.breadcrumbShop, chemin: "/artisanat" },
            { nom: t.title, chemin: "/artisanat/tables" },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdListe(
            locale,
            titreModeles,
            tables.map((p) => ({ nom: p.name, chemin: `/artisanat/${p.slug}` }))
          )
        )}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:pt-14">
        <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[11px] text-[#726757]">
          <Link href={`/${locale}`} className="hover:text-[#2b2320]">
            {dict.nav.home}
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
            {dict.artisanat.breadcrumbShop}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[#2b2320]">{t.title}</span>
        </nav>

        <h1 className={`${serif.className} mt-6 max-w-3xl text-3xl leading-tight text-[#2b2320] md:text-5xl`}>
          {t.h1}
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-[#5c5140]">{t.intro}</p>

        {/* 1. Les modèles, chacun avec le prix calculé par le catalogue. */}
        <section className="mt-14">
          <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{titreModeles}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#726757]">{t.modelesNote}</p>
          <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((product, index) => {
              const depart = prixDepart(product);
              const image = product.images[0];
              return (
                <Link
                  key={product.slug}
                  href={`/${locale}/artisanat/${product.slug}`}
                  className="group flex flex-col gap-4"
                >
                  <div
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl ${hoverZoom}`}
                    style={{ backgroundColor: image?.bg ?? "#ffffff" }}
                  >
                    {image && (
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={index < 3}
                        className={image.fit === "contain" ? "object-contain p-4" : "object-cover"}
                        style={image.position ? { objectPosition: image.position } : undefined}
                      />
                    )}
                    {product.slug === "table-resine-mikado" && (
                      <span className="absolute left-3 top-3 rounded-full bg-[#2b2320] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                        {t.riviere}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3
                      className={`${serif.className} text-lg text-[#2b2320] transition-colors duration-300 group-hover:text-black`}
                    >
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#5c5140]">{product.tagline}</p>
                    {depart === null ? (
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#726757]">
                        {dict.artisanat.onQuote}
                      </p>
                    ) : (
                      <p className="mt-2 flex items-baseline gap-2 text-[#726757]">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                          {dict.artisanat.from}
                        </span>
                        <span className="text-[15px] font-medium tabular-nums text-[#2b2320]">
                          {prixAffiche(depart, locale)}
                        </span>
                      </p>
                    )}
                    <span className="mt-3 inline-block border-b border-[#2b2320] pb-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2b2320]">
                      {t.configurer}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 2. Les essences, rangées par prix d'après les écarts du catalogue. */}
        <section className="mt-20 border-t border-[#e8e1d8] pt-14">
          <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.essencesTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#726757]">{e.note}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {essences.map((bois) => {
              const texte = e[bois.id as "pin" | "hetre" | "chene" | "noyer"];
              if (!texte) return null;
              return (
                <div key={bois.id} className="rounded-2xl border border-[#e8e1d8] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <MaterialBubble material={bois} className="h-8 w-6" />
                    <h3 className={`${serif.className} text-lg text-[#2b2320]`}>{bois.label}</h3>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#726757]">{e.teinte}</dt>
                      <dd className="text-[#4a4038]">{texte.teinte}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#726757]">{e.durete}</dt>
                      <dd className="text-[#4a4038]">{texte.durete}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#726757]">{e.usage}</dt>
                      <dd className="text-[#4a4038]">{texte.usage}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
          <Link href={`/${locale}/bois-massif`} className={`mt-6 ${lien}`}>
            {dict.liens.boisLong}
          </Link>
        </section>

        {/* 3. Le piétement et ses teintes, lues dans les options de la fiche. */}
        <section className="mt-20 grid gap-10 border-t border-[#e8e1d8] pt-14 md:grid-cols-2">
          <div>
            <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.pietementTitle}</h2>
            <p className="mt-4 leading-relaxed text-[#4a4038]">{t.pietementBody}</p>
          </div>
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#726757]">{t.teintesTitle}</h3>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {reference.metals.map((teinte) => (
                <li key={teinte.id} className="flex items-center gap-3 text-sm text-[#4a4038]">
                  <MaterialBubble material={teinte} className="h-8 w-6" />
                  {teinte.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Dimensions et fabrication. */}
        <section className="mt-20 grid gap-10 border-t border-[#e8e1d8] pt-14 md:grid-cols-2">
          <div>
            <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.dimensionsTitle}</h2>
            <p className="mt-4 leading-relaxed text-[#4a4038]">
              {remplir(t.dimensionsBody, {
                min: cm(reference.surMesure?.minMm ?? 0),
                longueur: cm(PLATEAU_MAX_LONGUEUR_MM),
                largeur: cm(PLATEAU_MAX_LARGEUR_MM),
              })}
            </p>
          </div>
          <div>
            <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.fabricationTitle}</h2>
            <p className="mt-4 leading-relaxed text-[#4a4038]">
              {delai
                ? remplir(t.fabricationBody, { delai })
                : // Sans délai écrit sur la fiche, la phrase du délai disparaît.
                  t.fabricationBody.replace(/[^.]*\{delai\}[^.]*\.\s*/, "")}
            </p>
          </div>
        </section>

        {/* 5. Questions fréquentes, affichées ET balisées depuis la même liste. */}
        <FaqVisible titre={t.faqTitle} questions={questions} className="mt-20 max-w-3xl" />

        {/* 6. Un projet hors catalogue. */}
        <section className="mt-20 rounded-xl border border-[#d9cfc0] bg-white px-6 py-7 md:px-10 md:py-10">
          <h2 className={`${serif.className} text-xl text-[#2b2320] md:text-2xl`}>{t.ctaTitle}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[#4a4038]">{t.ctaBody}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={`/${locale}/devis`}
              className="btn-verre inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
            >
              {t.ctaDevis}
            </Link>
            <Link href={`/${locale}/contact`} className={lien}>
              {t.ctaContact}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
