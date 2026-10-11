import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { Apparition } from "@/components/apparition";

/**
 * La page qui suit l'envoi d'une demande (devis ou rendez-vous). Une adresse
 * à elle : c'est elle que Google Ads compte comme une demande aboutie.
 */
export function MerciDemande({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.merciDemande;
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      {/* Façon Apple (Quentin, 06/10/2026) : un grand titre, une phrase lisible, un seul bouton plein et un lien
          fléché, sans capitales espacées. */}
      <main id="contenu" className="mx-auto max-w-3xl px-6 pb-20 pt-20 text-center md:pb-32 md:pt-32">
        <Apparition>
          <span aria-hidden className="mx-auto mb-9 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f1ea] text-[#2b2320]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className={`${serif.className} text-[2.4rem] leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}>{t.title}</h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.45] text-[#5c5140] md:text-[21px]">{t.texte}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-x-8 gap-y-5 sm:flex-row">
            <Link href={`/${locale}/devis#modeles`} className="btn-plein">
              {t.devis}
            </Link>
            <Link href={`/${locale}`} className="lien-fleche text-[#2b2320]">
              {t.retour}
            </Link>
          </div>
        </Apparition>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
