import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom, prixAffiche } from "@/lib/ui";
import { products, priceFrom, productLocalise, type Famille, type Product } from "@/lib/products";
import { DevisForm } from "@/components/devis-form";
import { BandeauDetail } from "@/components/bandeau-detail";
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

  // Les pièces qui se chiffrent seules : un barème sur mesure, et une commande
  // en ligne au bout. L'escalier a un barème mais se vend sur devis : il va
  // dans la deuxième liste.
  const instantanees = products
    .filter((p) => p.surMesure && p.orderMode === "cart")
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

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
      {/* 1. La promesse, en une phrase, et les deux chemins possibles. */}
      <section className="border-b border-[#e5ddd3] bg-[#fbf9f6] px-6 pb-14 pt-16 md:pb-20 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#6d2c2c]">{t.eyebrow}</p>
          <h1 className={`${serif.className} mt-4 text-3xl leading-tight text-[#2b2320] sm:text-4xl md:text-[3rem] md:leading-[1.1]`}>
            {t.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#5c5140] md:text-lg">{t.lead}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex flex-col items-center gap-2">
              <a
                href="#modeles"
                className="inline-flex items-center justify-center rounded-full bg-[#6d2c2c] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#5a2323]"
              >
                {t.ctaModeles}
              </a>
              <span className="text-xs text-[#6f6357]">{t.ctaModelesNote}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <a
                href="#formulaire"
                className="inline-flex items-center justify-center rounded-full border border-[#2b2320]/25 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:border-[#6d2c2c] hover:text-[#6d2c2c]"
              >
                {t.ctaAutre}
              </a>
              <span className="text-xs text-[#6f6357]">{t.ctaAutreNote}</span>
            </div>
          </div>
        </div>

        {/* 2. Trois étapes, numérotées comme sur les croquis des fiches. */}
        <div className="mx-auto mt-14 max-w-5xl md:mt-20">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{t.etapesTitle}</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {t.etapes.map((etape, i) => (
              <li key={etape.titre} className="rounded-2xl border border-[#e5ddd3] bg-white px-6 py-6">
                <span
                  aria-hidden
                  className={`${serif.className} inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2b2320] text-base text-[#2b2320]`}
                >
                  {i + 1}
                </span>
                <h2 className={`${serif.className} mt-4 text-xl text-[#2b2320]`}>{etape.titre}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6f6357]">{etape.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. Les pièces qui se chiffrent seules, famille par famille. */}
      <section id="modeles" className="scroll-mt-24 px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{t.instantTitle}</h2>
            <p className="mt-4 leading-relaxed text-[#5c5140]">{t.instantSubtitle}</p>
          </div>

          {parFamille.map((famille) => (
            <div key={famille.famille} className="mt-14 first:mt-10">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{famille.label}</h3>
              <div className="mt-5 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {famille.pieces.map((product) => {
                  const image = product.images[0];
                  const depart = priceFrom(product);
                  return (
                    <Link
                      key={product.slug}
                      href={`/${locale}/artisanat/${product.slug}#cotes`}
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
                            className={image.fit === "contain" ? "object-contain p-4" : "object-cover"}
                            style={image.position ? { objectPosition: image.position } : undefined}
                          />
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-[#6d2c2c] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                          {t.badge}
                        </span>
                      </div>
                      <div>
                        <h4 className={`${serif.className} text-lg text-[#2b2320] transition-colors duration-300 group-hover:text-[#6d2c2c]`}>
                          {product.name}
                        </h4>
                        <p className="mt-1 text-sm text-[#6f6357]">{saisie(product, t.saisie)}</p>
                        {depart !== null && (
                          <p className="mt-2 flex items-baseline gap-2 text-[#726757]">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{t.from}</span>
                            <span className="text-base text-[#2b2320]">{prixAffiche(depart, locale)}</span>
                          </p>
                        )}
                        <span className="mt-3 inline-block border-b border-[#6d2c2c] pb-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d2c2c]">
                          {t.cta}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Ce que l'atelier vient mesurer avant de chiffrer. */}
      <section className="border-t border-[#e5ddd3] bg-[#fbf9f6] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{t.surDevisTitle}</h2>
            <p className="mt-4 leading-relaxed text-[#5c5140]">{t.surDevisSubtitle}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {surDevis.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#e5ddd3] bg-white"
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
                <div className="px-6 py-5">
                  <h3 className={`${serif.className} text-xl text-[#2b2320] transition-colors group-hover:text-[#6d2c2c]`}>{item.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f6357]">{item.texte}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Le formulaire, pour ce qui n'entre dans aucune case. */}
      <section id="formulaire" className="scroll-mt-24 px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{t.formTitle}</h2>
          <p className="mt-3 leading-relaxed text-[#5c5140]">{t.formSubtitle}</p>
          <div className="mt-8">
            <DevisForm t={dict.contact.form} email={dict.contact.email} locale={locale} />
          </div>
        </div>
      </section>

      {/* 6. Ce qui est compris, dit une fois, sur la photo de l'atelier. */}
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
