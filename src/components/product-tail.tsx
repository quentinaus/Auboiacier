import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { lienAvisGoogle } from "@/lib/seo";
import { Apparition } from "@/components/apparition";
import { Parallaxe } from "@/components/parallaxe";

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
  // La fiche Google de l'atelier, quand elle existe : sans elle, ni phrase ni lien.
  const ficheGoogle = lienAvisGoogle();

  /* Les questions communes à toutes les fiches, visibles à l'écran. Elles ne
     sont plus balisées pour Google : les mêmes questions sur quinze pages
     passaient pour du contenu dupliqué. Seules /faq, /artisanat/tables et
     /toiles-tendues balisent leurs questions (src/lib/faq-balisees.ts). */
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

  /** Le titre d'une section, le même dessin que sur l'accueil. */
  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;

  /* Façon Apple (Quentin, 06/10/2026 : « plus premium, moins IA ») : de vrais titres à la place des petites capitales
     espacées, des textes lisibles, un seul bouton plein, et le papier de l'accueil pour les avis. */
  return (
    <>
      {/* Avis clients */}
      <section className="mt-16 bg-[#f5f1ea] px-6 py-16 md:mt-24 md:py-24">
        <Apparition className="mx-auto max-w-3xl text-center">
          <h2 className={titreSection}>{t.avisTitle}</h2>
          {testimonial ? (
            <blockquote className="mx-auto mt-10 max-w-2xl">
              <p className={`${serif.className} text-[1.4rem] italic leading-[1.4] text-[#2b2320] md:text-[1.7rem]`}>
                « {testimonial.quote} »
              </p>
              <footer className="mt-5 text-[15px] font-medium text-[#5c5140]">
                {testimonial.author}
              </footer>
            </blockquote>
          ) : (
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]">
              {ficheGoogle ? t.avisNoteGoogle : t.avisNote}
            </p>
          )}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
            {/* Les avis restent sur Google : ni note recopiée, ni balisage
                d'avis ici. Pas de lien tant que la fiche n'est pas renseignée. */}
            {ficheGoogle && (
              <a
                href={ficheGoogle}
                target="_blank"
                rel="noopener"
                className="lien-fleche py-2 text-[#2b2320]"
              >
                {t.avisGoogle}
              </a>
            )}
            <Link href={`/${locale}/realisations`} className="lien-fleche py-2 text-[#2b2320]">
              {t.avisCta}
            </Link>
          </div>
        </Apparition>
      </section>

      {/* Questions fréquentes : sur grand écran, le titre à gauche et les questions à droite, comme le descriptif de la fiche. */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <Apparition>
            <h2 className={titreSection}>{t.sectionFaq}</h2>
          </Apparition>
          <Apparition retard={110}>
            <div className="flex flex-col divide-y divide-[#e8e1d8] border-y border-[#e8e1d8]">
              {questions.map((item) => (
                <details key={item.q} className="group py-5 md:py-6">
                  {/* La flèche du navigateur est masquée (elle n'est pas la même
                      d'un navigateur à l'autre) : on en dessine une, qui pivote
                      quand la question s'ouvre. */}
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium leading-[1.4] text-[#2b2320] md:text-[17px]">
                    <span>{item.q}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="h-5 w-5 shrink-0 text-[#2b2320] transition-transform duration-200 group-open:rotate-180"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{item.a}</p>
                </details>
              ))}
            </div>
          </Apparition>
        </div>
      </section>

      {/* Notre mission, sur la photo plein cadre de l'accueil */}
      <section className="relative flex min-h-[55vh] items-center justify-center overflow-hidden md:min-h-[70vh]">
        <Parallaxe>
          <Image
            src="/images/vignes-coucher-soleil.jpg"
            alt={dict.hub.altVignes}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </Parallaxe>
        {/* Voile à 55 % : même sur la partie la plus claire de la photo, du
            blanc pur passe alors à 4,7 de contraste (minimum exigé : 4,5). */}
        <div className="absolute inset-0 bg-black/55" />
        <Apparition className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className={`${serif.className} text-balance text-[2.2rem] leading-[1.05] tracking-[-0.018em] text-white sm:text-[2.8rem] md:text-[3.6rem]`}>
            {dict.hub.missionTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.5] text-white md:text-[19px]">
            {dict.hub.missionBody}
          </p>
        </Apparition>
      </section>

      {/* Contact */}
      <section className="px-6 py-16 text-center md:py-28">
        <Apparition className="mx-auto max-w-3xl">
          <h2 className={titreSection}>{t.contactTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.5] text-[#4a4038] md:text-[19px]">{t.contactBody}</p>
          <Link href={`/${locale}/contact`} className="btn-plein mt-10">
            {t.contactCta}
          </Link>
        </Apparition>
      </section>
    </>
  );
}
