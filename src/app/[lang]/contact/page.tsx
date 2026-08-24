import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { PlaceholderBlock } from "@/components/placeholder-block";
import { GlobalHeader } from "@/components/global-header";

export default async function ContactPage({
  params,
}: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.contact;

  return (
    <div>
      <GlobalHeader locale={locale} dict={dict} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-medium">{t.title}</h1>
        <p className="mt-2 text-gray-500">{t.subtitle}</p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <PlaceholderBlock label={t.formPlaceholder} />
          <div>
            <h2 className="text-lg font-medium">{t.detailsTitle}</h2>
            <p className="mt-2 text-sm text-gray-500">{t.email}</p>
            <p className="text-sm text-gray-500">{t.location}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
