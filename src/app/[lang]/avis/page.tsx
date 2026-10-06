import type { Metadata } from "next";
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
 * si elle est renseignée, soit « la page arrive ». Jamais d'erreur.
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
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="rounded-2xl border border-[#e8e1d8] bg-white p-8 text-center md:p-12">
            <h1 className={`${serif.className} text-3xl text-[#2b2320]`}>{t.titre}</h1>
            <p className="mt-4 leading-relaxed text-[#4a4038]">{t.intro}</p>
            <p className="mt-4 leading-relaxed text-[#4a4038]">{fiche ? t.fiche : t.attente}</p>
            {fiche && (
              <a
                href={fiche}
                target="_blank"
                rel="noopener"
                className="btn-verre mt-8 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
              >
                {t.boutonFiche}
              </a>
            )}
            <p className="mt-8 border-t border-[#e8e1d8] pt-6 text-sm leading-relaxed text-[#5c5140]">
              {t.question}{" "}
              <a href={`mailto:${ATELIER.email}`} className="underline underline-offset-4 hover:text-black">
                {ATELIER.email}
              </a>
            </p>
            <Link
              href={`/${locale}`}
              className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-black"
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
