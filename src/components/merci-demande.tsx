import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * La page qui suit l'envoi d'une demande (devis ou rendez-vous). Une adresse
 * à elle : c'est elle que Google Ads compte comme une demande aboutie.
 */
export function MerciDemande({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.merciDemande;
  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu" className="mx-auto max-w-2xl px-6 py-24 text-center md:py-32">
        <span aria-hidden className="mx-auto mb-8 block h-px w-10 bg-[#6d2c2c]/60" />
        <h1 className={`${serif.className} text-3xl md:text-4xl`}>{t.title}</h1>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-[#5c5140]">{t.texte}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/${locale}/devis#modeles`}
            className="inline-flex items-center justify-center rounded-full bg-[#6d2c2c] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#5a2323]"
          >
            {t.devis}
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-full border border-[#2b2320]/25 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:border-[#6d2c2c] hover:text-[#6d2c2c]"
          >
            {t.retour}
          </Link>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
