import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
// Les identifiants de l'entreprise (raison sociale, SIRET, adresse…) se
// remplissent dans src/lib/entreprise.ts : la politique de confidentialité
// les affiche aussi, il fallait une seule source.
import { ENTREPRISE } from "@/lib/entreprise";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/mentions-legales">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/mentions-legales",
    title: dict.seo.mentions.title,
    description: dict.seo.mentions.description,
    noIndex: true,
  });
}

export default async function MentionsLegalesPage({
  params,
}: PageProps<"/[lang]/mentions-legales">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.mentionsLegales;

  // Seules les lignes remplies sont affichées.
  const identite = [
    { label: t.labelRaisonSociale, value: ENTREPRISE.raisonSociale },
    { label: t.labelStatut, value: ENTREPRISE.statut },
    { label: t.labelAdresse, value: ENTREPRISE.adresse },
    { label: t.labelSiret, value: ENTREPRISE.siret },
    { label: t.labelTva, value: ENTREPRISE.tva },
    { label: t.labelTelephone, value: ENTREPRISE.telephone },
  ].filter((ligne) => ligne.value !== "");

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>

        {identite.length > 0 && (
          <section className="mt-12">
            <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.identiteTitle}</h2>
            <dl className="mt-4 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
              {identite.map((ligne) => (
                <div key={ligne.label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-sm text-[#726757]">{ligne.label}</dt>
                  <dd className="text-sm leading-relaxed text-[#2b2320]">{ligne.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="mt-12 flex flex-col gap-10">
          {t.sections.map((section, i) => (
            <section key={section.title}>
              <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{section.title}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[#4a4038]">
                {section.body}
              </p>

              {/* Les deux pages qui détaillent ce que ces sections résument :
                  les CGU sous « Propriété intellectuelle », la politique de
                  confidentialité sous « Données personnelles ». */}
              {i === 4 && (
                <Link
                  href={`/${locale}/cgu`}
                  className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-black"
                >
                  {t.cguCta}
                </Link>
              )}
              {i === 5 && (
                <Link
                  href={`/${locale}/confidentialite`}
                  className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-black"
                >
                  {t.privacyCta}
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
