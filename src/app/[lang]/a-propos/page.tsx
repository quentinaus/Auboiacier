import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { PlaceholderBlock } from "@/components/placeholder-block";
import { GlobalHeader } from "@/components/global-header";

export default async function AProposPage({
  params,
}: PageProps<"/[lang]/a-propos">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.apropos;

  return (
    <div>
    <GlobalHeader locale={locale} dict={dict} />
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-medium">{t.title}</h1>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-xl font-medium">{t.histoireTitle}</h2>
        <PlaceholderBlock label={t.histoirePlaceholder} />
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-xl font-medium">{t.savoirFaireTitle}</h2>
        <PlaceholderBlock label={t.savoirFairePlaceholder} />
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-xl font-medium">{t.valeursTitle}</h2>
        <PlaceholderBlock label={t.valeursPlaceholder} />
      </section>
    </div>
    </div>
  );
}
