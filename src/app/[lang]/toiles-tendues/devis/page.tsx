import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { PlaceholderBlock } from "@/components/placeholder-block";

export default async function DevisPage({
  params,
}: PageProps<"/[lang]/toiles-tendues/devis">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.devis;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-medium">{t.title}</h1>
      <p className="mt-2 text-white/60">{t.subtitle}</p>

      <div className="mt-8">
        <PlaceholderBlock label={t.formPlaceholder} tone="dark" />
      </div>
    </div>
  );
}
