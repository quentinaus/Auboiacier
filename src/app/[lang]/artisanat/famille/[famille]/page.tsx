import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { CarteProduit } from "@/components/carte-produit";
import { productLocalise, type Famille } from "@/lib/products";
import { FAMILLES_AVEC_PAGE, piecesDeFamille } from "@/lib/categories-collection";
import { PortailsGuide } from "@/components/portail/portails-guide";
import { prixDepartPortail } from "@/lib/prix-portail.server";
import type { SlugPortail } from "@/lib/portails";

/**
 * LA PAGE D'UNE FAMILLE (09/10/2026) : les modèles d'une catégorie qui en a plusieurs et pas de page à elle
 * (garde-corps de fenêtre, portails). On y arrive en cliquant sa carte dans la Collection ; « La collection » y ramène.
 */
export function generateStaticParams() {
  return FAMILLES_AVEC_PAGE.map((famille) => ({ famille }));
}

function estFamille(x: string): x is Famille {
  return (FAMILLES_AVEC_PAGE as string[]).includes(x);
}

/** Le titre, la phrase et la description pour Google, par famille. */
function textes(famille: Famille, locale: "fr" | "en", dict: Awaited<ReturnType<typeof getDictionary>>) {
  const n = piecesDeFamille(famille).length;
  if (famille === "garde-corps") {
    return {
      titre: dict.hub.catGardeCorps,
      // Le titre et le H1 disent « sur mesure » et la ville : ce que les gens tapent (référencement, 10/10/2026).
      h1: locale === "fr" ? "Garde-corps de fenêtre sur mesure" : "Bespoke window railings",
      titreSeo: locale === "fr" ? "Garde-corps de fenêtre sur mesure" : "Bespoke window railings, Saumur",
      phrase:
        (locale === "fr"
          ? "Garde-corps de fenêtre sur mesure, soudés à l'atelier de métallerie, à Saumur. "
          : "Bespoke window railings, welded in our metalwork workshop in Saumur. ") + dict.artisanat.familleGardeCorpsNote,
      liens: [
        { href: `/${locale}/garde-corps-fenetre-normes`, label: dict.liens.normesGc },
        { href: `/${locale}/garde-corps-balcon-terrasse`, label: dict.liens.balconTerrasse },
        { href: `/${locale}/artisanat/verification-garde-corps`, label: dict.liens.verificationGc },
      ],
      seo:
        locale === "fr"
          ? `Garde-corps de fenêtre sur mesure en acier plein, fabriqués à Saumur : ${n} modèles aux normes, prix affiché à vos mesures.`
          : `Bespoke solid steel window railings made in Saumur: ${n} models to the French standard, price shown for your measurements.`,
    };
  }
  return {
    titre: dict.hub.catPortails,
    h1: locale === "fr" ? "Portails sur mesure" : "Bespoke gates",
    titreSeo: locale === "fr" ? "Portail sur mesure, alu ou acier" : "Bespoke gates, aluminium or steel",
    phrase:
      locale === "fr"
        ? "Portails sur mesure en alu ou en acier, fabriqués à Saumur. Battant, coulissant, pliant, ou le portillon assorti : composé à votre goût, soudé et thermolaqué, posé par l'atelier."
        : "Bespoke aluminium or steel gates, made in Saumur. Swing, sliding, folding, or the matching side gate: composed to your taste, welded and powder-coated, fitted by the workshop.",
    liens: [
      { href: `/${locale}/portail-sur-mesure-saumur`, label: locale === "fr" ? "Portail sur mesure à Saumur : bien choisir" : "Bespoke gates in Saumur: how to choose" },
    ],
    seo:
      locale === "fr"
        ? `Portails sur mesure en alu ou en acier, fabriqués à Saumur : ${n} modèles, composés à votre goût, posés par l'atelier.`
        : `Bespoke aluminium or steel gates made in Saumur: ${n} models, composed to your taste, fitted by the workshop.`,
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/famille/[famille]">): Promise<Metadata> {
  const { lang, famille } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  if (!estFamille(famille)) return {};
  const dict = await getDictionary(locale);
  const x = textes(famille, locale, dict);
  return metadataPage({ locale, chemin: `/artisanat/famille/${famille}`, title: x.titreSeo, description: x.seo });
}

/** Le « dès » d'un modèle ; null si le chiffrage n'est pas disponible sur ce serveur (la carte dit « À étudier à la visite »). */
function departPortail(slug: SlugPortail): number | null {
  try { return prixDepartPortail(slug); } catch { return null; }
}

export default async function FamillePage({ params }: PageProps<"/[lang]/artisanat/famille/[famille]">) {
  const { lang, famille } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  if (!estFamille(famille)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.artisanat;
  const x = textes(famille, locale, dict);
  const pieces = piecesDeFamille(famille).map((p) => productLocalise(p, locale));

  return (
    <div className="bg-[#f5f1ea]">
      <section className="px-6 pb-20 pt-10 md:pb-28 md:pt-14">
        <div className="mx-auto max-w-5xl">
          <Link href={`/${locale}/artisanat`} className="text-[15px] text-[#6f6357] hover:text-[#2b2320]">
            {t.backToCatalogue}
          </Link>
          <h1 className={`${serif.className} mt-6 text-[2.3rem] text-balance leading-[1.04] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.5rem]`}>
            {x.h1}
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]">{x.phrase}</p>

          {/* Les portails (Quentin, 10/10/2026) : d'abord les trois questions, puis les modèles avec leur « dès », triés par prix ;
              pas de mesures ici, elles se saisissent sur la fiche (Quentin, 10/10). Le « dès » est calculé par le serveur. */}
          {famille === "portail" ? (
            <div className="mt-10 md:mt-12">
              <PortailsGuide locale={locale}
                noms={Object.fromEntries(pieces.map((p) => [p.slug, p.name])) as Record<SlugPortail, string>}
                taglines={Object.fromEntries(pieces.map((p) => [p.slug, p.tagline])) as Record<SlugPortail, string>}
                departs={Object.fromEntries(pieces.map((p) => [p.slug, departPortail(p.slug as SlugPortail)])) as Record<SlugPortail, number | null>} />
            </div>
          ) : (
          <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 md:mt-14">
            {pieces.map((product, i) => (
              <li key={product.slug}>
                <Apparition retard={(i % 2) * 110}>
                  <CarteProduit product={product} locale={locale} t={t} priority={i < 2} />
                </Apparition>
              </li>
            ))}
          </ul>
          )}
          {/* Les pages voisines : le guide des normes et le balcon pour les garde-corps, le guide du choix pour les portails. */}
          <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-2 md:mt-16">
            {x.liens.map((lien) => (
              <li key={lien.href}>
                <Link href={lien.href} className="lien-fleche py-2 text-[#2b2320]">
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
