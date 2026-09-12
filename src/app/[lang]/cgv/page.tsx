import type { Metadata } from "next";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

/* ------------------------------------------------------------------ *
 *  À COMPLÉTER AVANT LA PREMIÈRE VENTE
 *  Tant qu'une valeur est vide, rien ne s'affiche : le client ne voit
 *  jamais de « à compléter » sur le site.
 *
 *  1. Le régime de TVA (TVA_MENTION ci-dessous). Deux cas courants :
 *     — franchise en base : « TVA non applicable, article 293 B du CGI » ;
 *     — assujetti : « Prix TTC, TVA 20 % incluse — n° TVA FR00 000000000 ».
 *  2. Le médiateur de la consommation (MEDIATEUR ci-dessous). Adhérer à un
 *     médiateur est obligatoire pour vendre en ligne à des particuliers :
 *     on remplit le nom, le site et l'adresse postale une fois l'adhésion faite.
 *  3. Les identifiants de l'entreprise (raison sociale, statut juridique,
 *     SIRET, n° de TVA, adresse du siège, téléphone) : ils se remplissent
 *     dans src/app/[lang]/mentions-legales/page.tsx.
 * ------------------------------------------------------------------ */

/** Mention de TVA, dans les deux langues. Vide = rien ne s'affiche. */
const TVA_MENTION: Record<string, string> = {
  fr: "",
  en: "",
};

/** Médiateur de la consommation auquel l'atelier adhère. Vide = rien ne s'affiche. */
const MEDIATEUR = {
  nom: "",
  adresse: "",
  site: "",
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/cgv">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/cgv",
    title: dict.seo.cgv.title,
    description: dict.seo.cgv.description,
    noIndex: true,
  });
}

export default async function CgvPage({ params }: PageProps<"/[lang]/cgv">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.cgv;

  const tva = TVA_MENTION[locale] ?? "";

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.intro}</p>

        <div className="mt-12 flex flex-col gap-10">
          {t.sections.map((section, i) => (
            <section key={section.title}>
              <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{section.title}</h2>
              {/* Les articles du dictionnaire contiennent des retours à la
                  ligne : whitespace-pre-line les respecte. */}
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[#4a4038]">
                {section.body}
              </p>

              {/* Régime de TVA : sous l'article « Prix et TVA », une fois rempli. */}
              {tva && i === 2 && (
                <p className="mt-3 leading-relaxed text-[#4a4038]">
                  <span className="text-[#726757]">{t.tvaLabel} : </span>
                  {tva}
                </p>
              )}

              {/* Médiateur : sous l'article « Médiation », une fois rempli. */}
              {MEDIATEUR.nom && i === 10 && (
                <p className="mt-3 leading-relaxed text-[#4a4038]">
                  <span className="text-[#726757]">{t.mediateurLabel} : </span>
                  {[MEDIATEUR.nom, MEDIATEUR.adresse, MEDIATEUR.site].filter(Boolean).join(" — ")}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* Encadré imposé par la loi depuis 2022 : texte repris mot pour mot. */}
        <section className="mt-14 rounded-xl border border-[#d9cfc0] bg-white px-6 py-7">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.garantieTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#726757]">{t.garantieIntro}</p>
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-[#4a4038]">
            {t.garantieBody}
          </p>
        </section>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
