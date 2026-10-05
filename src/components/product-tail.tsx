import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { lienAvisGoogle } from "@/lib/seo";

/**
 * Bas de page commun à toutes les fiches (mobilier, sculptures, verrières) :
 * avis, questions fréquentes, mission et contact.
 */
export function ProductTail({
  dict,
  locale,
  testimonial,
  lumiere = false,
}: {
  dict: Dictionary;
  locale: Locale;
  testimonial?: { quote: string; author: string };
  /** Un plafond lumineux : la toile remplace le bois et l'acier dans les questions. */
  lumiere?: boolean;
}) {
  const t = dict.artisanat;

  /* Les questions communes à toutes les fiches, visibles à l'écran. Elles ne
     sont plus balisées pour Google : les mêmes questions sur quinze pages
     passaient pour du contenu dupliqué. Les pages qui ont leurs propres
     questions (tables, plafonds, bois massif, FAQ) gardent leur balisage. */
  const questions = [
    { q: t.faqDeliveryQ, a: t.faqDeliveryA },
    { q: t.faqShorterQ, a: t.faqShorterA },
    { q: t.faqCustomQ, a: t.faqCustomA },
    { q: t.faqPayQ, a: t.faqPayA },
    ...(lumiere
      ? [
          { q: t.faqPoseToileQ, a: t.faqPoseToileA },
          { q: t.faqToileQ, a: t.faqToileA },
        ]
      : [{ q: t.faqCareQ, a: t.faqCareA }]),
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl px-6">
        {/* Avis clients */}
        <section className="mt-20 border-t border-[#e8e1d8] pt-16">
          <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.3em] text-[#6f6357]">
            {t.avisTitle}
          </h2>
          {testimonial ? (
            <blockquote className="mx-auto mt-8 max-w-2xl text-center">
              <p className={`${serif.className} text-xl italic leading-relaxed text-[#2b2320]`}>
                « {testimonial.quote} »
              </p>
              <footer className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#6f6357]">
                {testimonial.author}
              </footer>
            </blockquote>
          ) : (
            <p className="mx-auto mt-6 max-w-xl text-center leading-relaxed text-[#726757]">
              {t.avisNote}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
            {/* Les avis restent sur Google : ni note recopiée, ni balisage d'avis ici. */}
            <a
              href={lienAvisGoogle()}
              target="_blank"
              rel="noopener"
              className="inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black"
            >
              {t.avisGoogle}
            </a>
            <Link
              href={`/${locale}/realisations`}
              className="inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black"
            >
              {t.avisCta}
            </Link>
          </div>
        </section>

        {/* Questions fréquentes */}
        <section className="mt-20 border-t border-[#e8e1d8] pt-16">
          <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{t.sectionFaq}</h2>
          <div className="mt-4 flex max-w-2xl flex-col divide-y divide-[#e8e1d8]">
            {questions.map((item) => (
              <details key={item.q} className="group py-4">
                {/* La flèche du navigateur est masquée (elle n'est pas la même
                    d'un navigateur à l'autre) : on en dessine une, qui pivote
                    quand la question s'ouvre. */}
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-[#2b2320]">
                  <span>{item.q}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-[#2b2320] transition-transform duration-200 group-open:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* Notre mission */}
      <section className="relative mt-20 flex min-h-[55vh] items-center justify-center overflow-hidden md:min-h-[70vh]">
        <Image
          src="/images/vignes-coucher-soleil.jpg"
          alt={dict.hub.altVignes}
          fill
          sizes="100vw"
          className="object-cover"
        />
        {/* Voile à 55 % : même sur la partie la plus claire de la photo, du
            blanc pur passe alors à 4,7 de contraste (minimum exigé : 4,5). */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-white">
            {dict.hub.missionTitle}
          </h2>
          <p className={`${serif.className} mt-6 text-2xl leading-snug text-white md:text-3xl`}>
            {dict.hub.missionBody}
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className={`${serif.className} text-2xl text-[#2b2320] md:text-3xl`}>
          {t.contactTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-[#4a4038]">{t.contactBody}</p>
        <Link
          href={`/${locale}/contact`}
          className="mt-8 inline-block rounded-full border border-[#2b2320] px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:bg-[#2b2320] hover:text-white"
        >
          {t.contactCta}
        </Link>
      </section>
    </>
  );
}
