import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

/**
 * Les conditions générales d'utilisation : les règles de la simple visite
 * (accès, propriété des photos et des modèles, liens, responsabilité). Elles
 * sont distinctes des CGV, qui ne régissent que les ventes. Pas obligatoires
 * pour ce site, mais c'est ce texte qui protège les photos et les dessins
 * de meubles contre la copie.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/cgu">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/cgu",
    title: dict.seo.cgu.title,
    description: dict.seo.cgu.description,
    noIndex: true,
  });
}

export default async function CguPage({ params }: PageProps<"/[lang]/cgu">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.cgu;

  const lien = "mt-3 inline-block text-sm underline underline-offset-4 hover:text-black";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.intro}</p>
        <p className="mt-2 text-sm text-[#726757]">{t.updated}</p>

        <div className="mt-12 flex flex-col gap-10">
          {t.sections.map((section, i) => (
            <section key={section.title}>
              <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{section.title}</h2>
              {/* Les articles du dictionnaire contiennent des retours à la
                  ligne : whitespace-pre-line les respecte. */}
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[#4a4038]">
                {section.body}
              </p>

              {/* Sous « Données personnelles et cookies » : la politique ;
                  sous « Droit applicable et litiges » : les CGV. */}
              {i === 7 && (
                <Link href={`/${locale}/confidentialite`} className={lien}>
                  {t.privacyCta}
                </Link>
              )}
              {i === 9 && (
                <Link href={`/${locale}/cgv`} className={lien}>
                  {t.cgvCta}
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
