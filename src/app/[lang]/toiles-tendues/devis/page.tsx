import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { serif } from "@/lib/fonts";

export default async function DevisPage({
  params,
}: PageProps<"/[lang]/toiles-tendues/devis">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.devis;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className={`${serif.className} text-3xl font-medium md:text-4xl`}>{t.title}</h1>
      <p className="mt-2 text-white/60">{t.subtitle}</p>

      <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-8">
        <p className="leading-relaxed text-white/80">{t.formIntro}</p>
        <a
          href={`mailto:${t.formCta}`}
          className="mt-6 inline-block rounded-full bg-[#AD8148] px-6 py-3 text-sm font-medium text-white hover:bg-[#93703d]"
        >
          {t.formCta}
        </a>
      </div>
    </div>
  );
}
