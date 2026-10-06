import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { products, prixParOutil, productLocalise, type Famille, type Product } from "@/lib/products";
import { prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import { BandeauDetail } from "@/components/bandeau-detail";
import { Apparition } from "@/components/apparition";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * La page « Devis » : celle que la fiche Google Business met en avant.
 *
 * Elle répond à une seule question — comment avoir un prix — et dans l'ordre
 * où le client se la pose : ce qui se chiffre tout seul (tables, garde-corps,
 * plafonds lumineux : on entre ses cotes, le prix s'affiche), ce qui demande
 * un relevé de cotes (escalier, verrière, sculpture), et le formulaire pour
 * tout le reste. Aucun chiffre n'est écrit ici : les « à partir de » viennent
 * du catalogue, comme sur les fiches.
 */

export async function generateMetadata({ params }: PageProps<"/[lang]/devis">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/devis",
    title: dict.seo.devis.title,
    description: dict.seo.devis.description,
  });
}

/** L'ordre des familles sur la page : ce qui se vend le plus d'abord. */
const FAMILLES_INSTANT: Famille[] = ["table-interieur", "garde-corps", "plafond", "table-exterieur"];

/** Ce qu'il faudra taper sur la fiche, dit en une ligne sous chaque pièce. */
function saisie(product: Product, t: { table: string; gardeCorps: string; plafondRect: string; plafondRond: string }) {
  if (product.famille === "garde-corps") return t.gardeCorps;
  if (product.famille === "plafond") return product.surMesure?.forme === "rond" ? t.plafondRond : t.plafondRect;
  return t.table;
}

export default async function DevisPage({ params }: PageProps<"/[lang]/devis">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.devis;

  // Les pièces qui se chiffrent seules : un barème sur mesure (ou l'outil de
  // plans, pour le garde-corps), et une commande en ligne au bout. L'escalier
  // a un barème mais se vend sur devis : il va dans la deuxième liste.
  const instantanees = products
    .filter((p) => (p.surMesure || prixParOutil(p)) && p.orderMode === "cart")
    .map((p) => productLocalise(p, locale));
  const parFamille = FAMILLES_INSTANT.map((famille) => ({
    famille,
    label: t.familles[famille as keyof typeof t.familles],
    pieces: instantanees.filter((p) => p.famille === famille),
  })).filter((f) => f.pieces.length > 0);

  const surDevis: { titre: string; texte: string; href: string; image: string; position?: string }[] = [
    { ...t.surDevis[0], href: `/${locale}/artisanat/escalier-limon-central`, image: "/images/escalier/limon-droit.jpg", position: "88% 50%" },
    { ...t.surDevis[1], href: `/${locale}/artisanat/verrieres`, image: "/images/verriere-interieure.jpg" },
    { ...t.surDevis[2], href: `/${locale}/artisanat/sculptures`, image: "/images/sculpture-cheval-v2.jpg" },
  ];

  /** Le titre, la phrase puis les boutons arrivent l'un après l'autre, comme en haut de l'accueil. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
      {/* 1. La promesse, en une phrase, et les deux chemins possibles. */}
      <section className="bg-[#ffffff] px-6 pb-16 pt-16 md:pb-28 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="surtitre entree-monte" style={entree(100)}>{t.eyebrow}</p>
          <h1
            className={`${serif.className} entree-monte mt-4 text-balance text-[2.4rem] leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}
            style={entree(200)}
          >
            {t.h1}
          </h1>
          <p
            className="entree-monte mx-auto mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
            style={entree(380)}
          >
            {t.lead}
          </p>
          <div
            className="entree-monte mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-start sm:gap-5"
            style={entree(560)}
          >
            <div className="flex flex-col items-center gap-2.5">
              <a href="#modeles" className="btn-plein">
                {t.ctaModeles}
              </a>
              <span className="text-[14px] text-[#6f6357]">{t.ctaModelesNote}</span>
            </div>
            {/* Ce qui n'entre dans aucune fiche : le formulaire de la page contact. */}
            <div className="flex flex-col items-center gap-2.5">
              <Link href={`/${locale}/contact`} className="btn-contour">
                {t.ctaAutre}
              </Link>
              <span className="text-[14px] text-[#6f6357]">{t.ctaAutreNote}</span>
            </div>
          </div>
        </div>

        {/* 2. Trois étapes, numérotées comme sur les croquis des fiches. */}
        <div className="mx-auto mt-20 max-w-6xl md:mt-28">
          <Apparition>
            <p className="surtitre text-center">{t.etapesTitle}</p>
          </Apparition>
          <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
            {t.etapes.map((etape, i) => (
              <li key={etape.titre}>
                <Apparition retard={(i % 4) * 110} className="h-full rounded-[22px] bg-[#f5f1ea] px-7 py-8 md:px-8 md:py-9">
                  <span
                    aria-hidden
                    className={`${serif.className} inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2b2320] text-[17px] text-[#2b2320]`}
                  >
                    {i + 1}
                  </span>
                  <h2 className={`${serif.className} mt-5 text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>
                    {etape.titre}
                  </h2>
                  <p className="mt-3 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{etape.texte}</p>
                </Apparition>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. Les pièces qui se chiffrent seules, famille par famille. */}
      <section id="modeles" className="scroll-mt-24 bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`}>
              {t.instantTitle}
            </h2>
            <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.instantSubtitle}</p>
          </Apparition>

          {parFamille.map((famille) => (
            <div key={famille.famille} className="mt-16 md:mt-24">
              <Apparition className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <h3 className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>
                  {famille.label}
                </h3>
                {/* Chaque famille a sa page de présentation : on y renvoie. */}
                {famille.famille === "table-interieur" && (
                  <Link href={`/${locale}/artisanat/tables`} className="lien-fleche text-[#2b2320]">
                    {dict.liens.toutesTables}
                  </Link>
                )}
                {famille.famille === "plafond" && (
                  <Link href={`/${locale}/toiles-tendues`} className="lien-fleche text-[#2b2320]">
                    {dict.liens.plafonds}
                  </Link>
                )}
              </Apparition>
              <div className="mt-7 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 md:mt-9">
                {famille.pieces.map((product, i) => {
                  const image = product.images[0];
                  // Le garde-corps : le prix d'appel de sa fiche (« dès 300 € pour une fenêtre de 100 cm »).
                  const appel = prixAppelGC(product);
                  const depart = appel ? appel.prix : prixDepart(product);
                  return (
                    <Apparition key={product.slug} retard={(i % 3) * 110}>
                      <Link
                        href={`/${locale}/artisanat/${product.slug}#cotes`}
                        className="group flex flex-col gap-5"
                      >
                        <div
                          className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${hoverZoom}`}
                          style={{ backgroundColor: image?.bg ?? "#ffffff" }}
                        >
                          {image && (
                            <Image
                              src={image.src}
                              alt={image.alt}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className={image.fit === "contain" ? "object-contain p-4" : "object-cover"}
                              style={image.position ? { objectPosition: image.position } : undefined}
                            />
                          )}
                          <span className="absolute left-4 top-4 rounded-full bg-[#2b2320] px-3 py-1 text-[13px] font-medium text-white">
                            {t.badge}
                          </span>
                        </div>
                        <div>
                          <h4 className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] transition-colors duration-300 group-hover:text-black`}>
                            {product.name}
                          </h4>
                          <p className="mt-1.5 text-[15px] leading-[1.5] text-[#5c5140] md:text-[16px]">{saisie(product, t.saisie)}</p>
                          {depart !== null && (
                            <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 text-[15px] text-[#5c5140] md:text-[16px]">
                              <span>{appel ? (locale === "fr" ? "Dès" : "From") : t.from}</span>
                              <span className="text-[17px] font-medium tabular-nums text-[#2b2320] md:text-[18px]">{prixAffiche(depart, locale)}</span>
                              {appel && (
                                <span className="text-[14px]">
                                  {locale === "fr" ? `fenêtre de ${appel.largeurMm / 10}\u00a0cm` : `${appel.largeurMm / 10} cm window`}
                                </span>
                              )}
                            </p>
                          )}
                          <span className="lien-fleche mt-3 text-[#2b2320]">{t.cta}</span>
                        </div>
                      </Link>
                    </Apparition>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Ce que l'atelier vient mesurer avant de chiffrer. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`}>
              {t.surDevisTitle}
            </h2>
            <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{t.surDevisSubtitle}</p>
          </Apparition>
          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3">
            {surDevis.map((item, i) => (
              <Apparition key={item.href} retard={(i % 4) * 110} className="h-full">
                <Link
                  href={item.href}
                  className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-[#f5f1ea]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.titre}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      style={item.position ? { objectPosition: item.position } : undefined}
                    />
                  </div>
                  <div className="px-7 pb-8 pt-6">
                    <h3 className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] transition-colors group-hover:text-black md:text-[1.7rem]`}>
                      {item.titre}
                    </h3>
                    <p className="mt-3 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{item.texte}</p>
                  </div>
                </Link>
              </Apparition>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Ce qui est compris, dit une fois, sur la photo de l'atelier. */}
      <BandeauDetail
        titre={t.reassurance[0].titre}
        corps={t.reassurance.slice(1).map((r) => `${r.titre} — ${r.texte}`)}
        mention={t.reassurance[0].texte}
        photo={{ src: "/images/atelier-soudeur.jpg", alt: dict.hub.altAtelier }}
        photoAGauche
      />
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
