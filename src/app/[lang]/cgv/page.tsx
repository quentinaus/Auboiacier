import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { ENTREPRISE } from "@/lib/entreprise";

/* La mention de TVA et le médiateur de la consommation se remplissent,
 * comme tout ce qui identifie l'entreprise, dans src/lib/entreprise.ts.
 * Tant qu'une valeur est vide, rien ne s'affiche : le client ne voit jamais
 * de « à compléter » sur le site. */
const MEDIATEUR = ENTREPRISE.mediateur;

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

  const tva = ENTREPRISE.tvaMention[locale] ?? "";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.intro}</p>

        <div className="mt-12 flex flex-col gap-10">
          {t.sections.map((section, i) => (
            // Une ancre sur l'article que d'autres pages citent (le panier : « #garantie-cotes »).
            <section key={section.title} id={"id" in section ? section.id : undefined} className="scroll-mt-24">
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

              {/* Données personnelles : l'article 10 résume, la politique
                  de confidentialité détaille. */}
              {i === 9 && (
                <Link
                  href={`/${locale}/confidentialite`}
                  className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-black"
                >
                  {t.privacyCta}
                </Link>
              )}

              {/* Garantie cotes : les coordonnées postales et téléphoniques du garant (art. L217-22), lues sur la fiche de
                  l'entreprise — rien ne s'affiche de ce qui n'est pas encore rempli. */}
              {"id" in section && section.id === "garantie-cotes" && (
                <p className="mt-3 leading-relaxed text-[#4a4038]">
                  <span className="text-[#726757]">{t.garantLabel} : </span>
                  {["Auboiacier", ENTREPRISE.raisonSociale, ENTREPRISE.adresse, ENTREPRISE.telephone, "auboiacier@gmail.com"]
                    .filter(Boolean)
                    .join(" — ")}
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
