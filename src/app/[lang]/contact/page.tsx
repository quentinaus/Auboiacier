import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";

export default async function ContactPage({
  params,
}: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.contact;

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-3 text-[#7a6e63]">{t.subtitle}</p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e8e1d8] bg-white p-6">
            <p className="text-sm leading-relaxed text-[#4a4038]">{t.formSoon}</p>
            <a
              href={`mailto:${t.email}`}
              className="mt-6 inline-block rounded-full bg-[#6d2c2c] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#5a2424]"
            >
              {t.email}
            </a>
          </div>

          <div>
            <h2 className={`${serif.className} text-lg font-medium`}>{t.detailsTitle}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[#4a4038]">
              <li>{t.email}</li>
              <li>{t.location}</li>
            </ul>
          </div>
        </div>
      </div>

      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
