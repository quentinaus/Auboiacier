import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

export default async function AProposPage({
  params,
}: PageProps<"/[lang]/a-propos">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.apropos;

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>

        <section className="mt-14 max-w-prose">
          <h2 className={`${serif.className} text-2xl font-medium`}>{t.histoireTitle}</h2>
          <p className="mt-4 leading-relaxed text-[#4a4038]">{t.histoireBody}</p>
        </section>

        <section className="mt-14 max-w-prose">
          <h2 className={`${serif.className} text-2xl font-medium`}>{t.savoirFaireTitle}</h2>
          <p className="mt-4 leading-relaxed text-[#4a4038]">{t.savoirFaireBody}</p>
        </section>

        <section className="mt-14">
          <h2 className={`${serif.className} text-2xl font-medium`}>{t.valeursTitle}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {t.valeurs.map((valeur) => (
              <div
                key={valeur.title}
                className="rounded-2xl border border-[#e8e1d8] bg-white p-6"
              >
                <h3 className={`${serif.className} text-lg font-medium`}>{valeur.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{valeur.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
