import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { ATELIER, lienAvisGoogle, lienLaisserAvis, metadataPage } from "@/lib/seo";
import { ArtisanatHeader } from "@/components/artisanat-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

/**
 * https://auboiacier.fr/avis — l'adresse de la carte glissée dans les colis
 * et du mail envoyé dix jours après la livraison (src/lib/avis.ts).
 *
 * Quand le lien d'avis Google est connu (lienLaisserAvis), le proxy renvoie
 * /avis, /fr/avis et /en/avis directement vers lui et cette page ne
 * s'affiche jamais ; la redirection ci-dessous n'est qu'un second filet.
 * Tant qu'il ne l'est pas : un merci, et soit la fiche Google de l'atelier
 * si elle est renseignée, soit « la page n'est pas encore ouverte », sans
 * promettre de date ni demander de revenir. Jamais d'erreur.
 *
 * Elle n'a rien à faire dans un moteur de recherche : « ne pas indexer », et
 * absente du plan du site.
 */
export async function generateMetadata({ params }: PageProps<"/[lang]/avis">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/avis",
    title: dict.seo.avis.title,
    description: dict.seo.avis.description,
    noIndex: true,
  });
}

export default async function AvisPage({ params }: PageProps<"/[lang]/avis">) {
  const lien = lienLaisserAvis();
  if (lien) redirect(lien);

  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.avis;
  const fiche = lienAvisGoogle();

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* Façon Apple (Quentin, 06/10/2026) : une carte papier sans liseré, le grand titre, un seul bouton plein. La
            carte monte sans attendre le JavaScript : c'est tout le premier écran. */}
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-28">
          <div
            className="entree-monte rounded-[22px] bg-[#f5f1ea] px-6 py-10 text-center sm:px-10 md:rounded-[28px] md:px-14 md:py-14"
            style={{ "--retard": "120ms" } as CSSProperties}
          >
            <h1 className={`${serif.className} text-[2.4rem] font-normal leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}>
              {t.titre}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[17px] leading-[1.45] text-[#4a4038] md:mt-6 md:text-[21px]">{t.intro}</p>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{fiche ? t.fiche : t.attente}</p>
            {fiche && (
              <a
                href={fiche}
                target="_blank"
                rel="noopener"
                className="btn-plein mt-8"
              >
                {t.boutonFiche}
              </a>
            )}
            <p className="mx-auto mt-10 max-w-lg border-t border-[#e5ddd3] pt-7 text-[15px] leading-[1.55] text-[#5c5140] md:text-[16px]">
              {t.question}{" "}
              <a href={`mailto:${ATELIER.email}`} className="text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]">
                {ATELIER.email}
              </a>
            </p>
            <Link
              href={`/${locale}`}
              className="lien-fleche mt-6 text-[#2b2320]"
            >
              {t.retour}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
