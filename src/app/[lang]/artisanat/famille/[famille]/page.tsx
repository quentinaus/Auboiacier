import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdListe, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { CarteProduit } from "@/components/carte-produit";
import { productLocalise, type Famille } from "@/lib/products";
import { FAMILLES_AVEC_PAGE, piecesDeFamille } from "@/lib/categories-collection";
import { PagePortails } from "@/components/portail/page-portails";
import { TXT as TXT_PORTAILS } from "@/lib/portails-page";
import type { SlugPortail } from "@/lib/portails-base";

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
      // C'est LA page que Google doit montrer pour « garde-corps Saumur » : elle propose les deux styles, avec ou sans volutes
      // (Quentin, 11/10/2026 : « on tombe direct sur le garde-corps sans volute »). Le titre et le H1 disent « sur mesure » et la
      // ville, ce que les gens tapent.
      h1: locale === "fr" ? "Garde-corps de fenêtre sur mesure, avec ou sans volutes" : "Bespoke window railings, with or without scrolls",
      titreSeo: locale === "fr" ? "Garde-corps à Saumur, avec ou sans volutes" : "Saumur window railings, with or without scrolls",
      phrase:
        (locale === "fr"
          ? "Garde-corps de fenêtre sur mesure, soudés à l'atelier de métallerie, à Saumur. Deux styles : le modèle à croix et rosaces, sans volutes, ou le garde-corps forgé à volutes de ferronnerie. "
          : "Bespoke window railings, welded in our metalwork workshop in Saumur. Two styles: the cross-and-rosette model, without scrolls, or the wrought railing with ironwork scrolls. ") + dict.artisanat.familleGardeCorpsNote,
      liens: [
        { href: `/${locale}/garde-corps-fenetre-normes`, label: dict.liens.normesGc },
        { href: `/${locale}/garde-corps-balcon-terrasse`, label: dict.liens.balconTerrasse },
        { href: `/${locale}/artisanat/verification-garde-corps`, label: dict.liens.verificationGc },
        { href: `/${locale}/metallier-saumur`, label: dict.liens.metallierSaumur },
      ],
      seo:
        locale === "fr"
          ? "Garde-corps de fenêtre sur mesure à Saumur : à croix et rosaces, ou forgé à volutes. Acier plein, aux normes, prix affiché à vos mesures."
          : "Bespoke window railings made in Saumur: cross and rosette, or wrought with scrolls. Solid steel, to the French standard, price shown for your measurements.",
    };
  }
  return {
    titre: dict.hub.catPortails,
    h1: locale === "fr" ? "Portails sur mesure" : "Bespoke gates",
    titreSeo: locale === "fr" ? "Portail sur mesure, alu ou acier" : "Bespoke gates, aluminium or steel",
    // La phrase d'ouverture de la page refaite (12/10/2026) : courte, à droite du titre ; les mots « alu », « acier », « Saumur »,
    // « posé » y sont, les quatre modèles se lisent juste dessous.
    phrase: TXT_PORTAILS[locale].phrase,
    liens: [
      { href: `/${locale}/portail-sur-mesure-saumur`, label: locale === "fr" ? "Portail sur mesure à Saumur : bien choisir" : "Bespoke gates in Saumur: how to choose" },
      { href: `/${locale}/metallier-saumur`, label: dict.liens.metallierSaumur },
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
      {/* Google : le fil d'Ariane (Accueil › La collection › cette page) et la liste des modèles présentés. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd([
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: locale === "fr" ? "La collection" : "The collection", chemin: "/artisanat" },
            { nom: x.h1, chemin: `/artisanat/famille/${famille}` },
          ]),
          jsonLdListe(locale, x.h1, pieces.map((p) => ({ nom: p.name, chemin: `/artisanat/${p.slug}` }))),
        ])}
      />
      {/* Les portails : la page refaite (Quentin, 12/10/2026). Le serveur calcule tous les prix ; pas de mesures ici, elles se
          saisissent sur la fiche. Voir src/components/portail/page-portails.tsx. */}
      {famille === "portail" ? (
        <PagePortails
          locale={locale}
          fil={{ aria: dict.nav.breadcrumb, accueil: dict.nav.home, collection: locale === "fr" ? "La collection" : "The collection", courant: x.titre }}
          h1={x.h1}
          phrase={x.phrase}
          noms={Object.fromEntries(pieces.map((p) => [p.slug, p.name])) as Record<SlugPortail, string>}
          liens={x.liens}
        />
      ) : (
      <section className="px-6 pb-20 pt-10 md:pb-28 md:pt-14">
        <div className="mx-auto max-w-5xl">
          {/* Le fil d'Ariane, affiché comme il est balisé pour Google (Accueil › La collection › cette page). */}
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap items-center gap-x-2 text-[15px] text-[#6f6357]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/${locale}/artisanat`} className="hover:text-[#2b2320]">
              {locale === "fr" ? "La collection" : "The collection"}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-[#2b2320]">{x.titre}</span>
          </nav>
          <h1 className={`${serif.className} mt-6 text-[2.3rem] text-balance leading-[1.04] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.5rem]`}>
            {x.h1}
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]">{x.phrase}</p>

          <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 md:mt-14">
            {pieces.map((product, i) => (
              <li key={product.slug}>
                <Apparition retard={(i % 2) * 110}>
                  <CarteProduit product={product} locale={locale} t={t} priority={i < 2} />
                </Apparition>
              </li>
            ))}
          </ul>
          {/* Les pages voisines : le guide des normes et le balcon pour les garde-corps. */}
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
      )}
    </div>
  );
}
