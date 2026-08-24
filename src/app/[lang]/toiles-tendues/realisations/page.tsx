import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { PlaceholderBlock } from "@/components/placeholder-block";

export default async function RealisationsPage({
  params,
}: PageProps<"/[lang]/toiles-tendues/realisations">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.realisations;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-medium">{t.title}</h1>
      <p className="mt-2 max-w-xl text-white/60">{t.subtitle}</p>

      <div className="mt-8 flex gap-3 text-sm">
        <span className="rounded-full bg-white px-4 py-2 text-gray-900">
          {t.filterAll}
        </span>
        <span className="rounded-full border border-white/20 px-4 py-2 text-white/70">
          {t.filterResidential}
        </span>
        <span className="rounded-full border border-white/20 px-4 py-2 text-white/70">
          {t.filterCommercial}
        </span>
      </div>

      <div className="mt-8">
        <PlaceholderBlock label={t.gridPlaceholder} tone="dark" />
      </div>
    </div>
  );
}
