import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdService, scriptJsonLd } from "@/lib/seo";
import { textesGcExterieur } from "@/lib/textes/garde-corps-balcon-terrasse";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

/**
 * « Garde-corps de balcon et de terrasse sur mesure » : balcons, terrasses,
 * rampes d'escalier extérieur (oui de Quentin, 07/10/2026).
 *
 * Tous les textes, FR et EN, sont dans src/lib/textes/garde-corps-balcon-terrasse.ts,
 * avec les sources de chaque chiffre de la règle. Aucun prix : sur devis ; la
 * seule somme citée est celle de la prise de cotes, lue dans le code. La pose
 * attend l'assurance décennale : la page le dit, elle ne la promet pas.
 *
 * Données structurées : le fil d'Ariane (visible plus bas) et le service, sans
 * prix. Les questions de la page sont visibles mais pas balisées : seules /faq,
 * /artisanat/tables et /toiles-tendues balisent une FAQ (tests/seo-fiches.test.ts).
 */

const CHEMIN = "/garde-corps-balcon-terrasse";
/** Le garde-corps de fenêtre de l'atelier, avec sa main courante en chêne : pour montrer l'acier et le bois ensemble. */
const IMAGE_MATIERES = "/images/garde-corps/fenetre-rue.jpg";

/** En français, une espace insécable fine avant « ? », « ! », « : » et « ; » : jamais un « ? » seul en début de ligne. */
function insecable(texte: string, locale: Locale) {
  return locale === "fr" ? texte.replace(/ ([?!:;])/g, " $1") : texte;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/garde-corps-balcon-terrasse">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = textesGcExterieur(locale);
  return metadataPage({
    locale,
    chemin: CHEMIN,
    title: t.seo.title,
    description: t.seo.description,
  });
}

export default async function GardeCorpsBalconTerrassePage({
  params,
}: PageProps<"/[lang]/garde-corps-balcon-terrasse">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = textesGcExterieur(locale);
  const f = (texte: string) => insecable(texte, locale);

  const rdv = `/${locale}/rendez-vous#formulaire`;
  const contact = `/${locale}/contact`;
  const fiche = `/${locale}/artisanat/garde-corps`;
  const normesFenetre = `/${locale}/garde-corps-fenetre-normes`;

  /** Les titres de la page, aux tailles de l'accueil (façon Apple, 06/10/2026). */
  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const sousTitre = `${serif.className} text-balance text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";
  /** Le titre et la phrase du haut arrivent l'un après l'autre, comme en haut de l'accueil. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  const liens = [
    { href: fiche, label: t.liens.fiche },
    { href: normesFenetre, label: t.liens.normes },
    { href: `/${locale}/artisanat/escalier-limon-central`, label: t.liens.escalier },
    { href: `/${locale}/bois-massif`, label: t.liens.bois },
    { href: `/${locale}/zone-intervention`, label: t.liens.zone },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: t.fil, chemin: CHEMIN },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdService({
            locale,
            nom: t.service.nom,
            type: t.service.type,
            chemin: CHEMIN,
            description: t.seo.description,
          })
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* 1. Le titre, la promesse, les deux portes : la prise de cotes, ou décrire le projet. */}
        <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
          <div className="mx-auto max-w-3xl">
            {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
            <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[14px] text-[#6f6357]">
              <Link href={`/${locale}`} className="hover:text-[#2b2320]">
                {dict.nav.home}
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-[#2b2320]">{t.fil}</span>
            </nav>
            <p className="surtitre entree-monte mt-10 md:mt-14" style={entree(60)}>
              {t.surtitre}
            </p>
            <h1
              className={`${serif.className} entree-monte mt-3 text-balance text-[2.4rem] leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}
              style={entree(150)}
            >
              {t.h1}
            </h1>
            <p
              className="entree-monte mt-6 text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
              style={entree(330)}
            >
              {f(t.intro)}
            </p>
            <div className="entree-monte mt-9 flex flex-wrap items-center gap-x-8 gap-y-4" style={entree(480)}>
              <Link href={rdv} className="btn-plein">
                {t.ctaRdv}
              </Link>
              <Link href={contact} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaContact}
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Les trois ouvrages : balcon, terrasse, rampe d'escalier extérieur. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{t.ouvragesTitre}</h2>
            </Apparition>
            <ul className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
              {t.ouvrages.map((ouvrage, i) => (
                <li key={ouvrage.titre}>
                  <Apparition retard={i * 110} className="h-full">
                    <div className="h-full rounded-[22px] bg-white px-7 py-7 md:px-8 md:py-8">
                      <h3 className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.5rem]`}>
                        {ouvrage.titre}
                      </h3>
                      <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{f(ouvrage.texte)}</p>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. La règle, chiffre par chiffre, chaque chiffre sourcé dans le fichier des textes. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={titreSection}>{f(t.normesTitre)}</h2>
              <p className={`mt-5 ${texte}`}>{f(t.normesIntro)}</p>
            </Apparition>
            <div className="mt-10 divide-y divide-[#e8e1d8] border-y border-[#e8e1d8] md:mt-12">
              {t.normes.map((point) => (
                <Apparition key={point.titre} className="py-7 md:py-8">
                  <h3 className={sousTitre}>{f(point.titre)}</h3>
                  <p className={`mt-3 ${texte}`}>{f(point.texte)}</p>
                </Apparition>
              ))}
            </div>
            <Apparition>
              <p className="mt-6 text-[15px] leading-[1.5] text-[#6f6357]">{f(t.normesDates)}</p>
              <Link href={normesFenetre} className="lien-fleche mt-5 py-2 text-[#2b2320]">
                {f(t.normesLienFenetre)}
              </Link>
            </Apparition>
          </div>
        </section>

        {/* 4. Les matières : l'acier soudé, la main courante en acier ou en bois massif (l'image : celle du garde-corps de fenêtre). */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
            <Apparition>
              <h2 className={titreSection}>{f(t.matieresTitre)}</h2>
              {t.matieres.map((paragraphe) => (
                <p key={paragraphe} className={`mt-5 ${texte}`}>
                  {f(paragraphe)}
                </p>
              ))}
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                <Link href={fiche} className="lien-fleche py-2 text-[#2b2320]">
                  {t.matieresLienFiche}
                </Link>
                <Link href={`/${locale}/bois-massif`} className="lien-fleche py-2 text-[#2b2320]">
                  {t.matieresLienBois}
                </Link>
              </div>
            </Apparition>
            <Apparition retard={120}>
              <figure>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-white">
                  <Visuel
                    locale={locale}
                    src={IMAGE_MATIERES}
                    alt={t.matieresAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3 text-[14px] leading-[1.5] text-[#6f6357] md:text-[15px]">{f(t.matieresLegende)}</figcaption>
              </figure>
            </Apparition>
          </div>
        </section>

        {/* 5. La fixation : étudiée au cas par cas, sur place. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{f(t.fixationTitre)}</h2>
            {t.fixation.map((paragraphe) => (
              <p key={paragraphe} className={`mt-5 ${texte}`}>
                {f(paragraphe)}
              </p>
            ))}
          </Apparition>
        </section>

        {/* 6. Comment ça se passe, puis la pose (décennale) et le prix (sur devis). */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{t.etapesTitre}</h2>
            </Apparition>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-4">
              {t.etapes.map((etape, i) => (
                <li key={etape.titre}>
                  <Apparition retard={(i % 4) * 110} className="h-full">
                    <div className="h-full rounded-[22px] bg-white px-7 py-7">
                      <span className="surtitre block" aria-hidden="true">
                        {i + 1}
                      </span>
                      <h3 className={`${serif.className} mt-2 text-[1.3rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320]`}>
                        {etape.titre}
                      </h3>
                      <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{f(etape.texte)}</p>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:gap-16">
            <Apparition>
              <h2 className={sousTitre}>{f(t.poseTitre)}</h2>
              <p className={`mt-4 ${texte}`}>{f(t.pose)}</p>
            </Apparition>
            <Apparition retard={120}>
              <h2 className={sousTitre}>{f(t.prixTitre)}</h2>
              {t.prix.map((paragraphe) => (
                <p key={paragraphe} className={`mt-4 ${texte}`}>
                  {f(paragraphe)}
                </p>
              ))}
              <Link href={`${fiche}#configuration`} className="lien-fleche mt-4 py-2 text-[#2b2320]">
                {f(t.prixLienFenetre)}
              </Link>
            </Apparition>
          </div>
        </section>

        {/* 7. Les questions : visibles, non balisées (voir plus haut). */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={titreSection}>{t.faqTitre}</h2>
            </Apparition>
            <div className="mt-10 divide-y divide-[#e5ddd3] border-y border-[#e5ddd3] md:mt-12">
              {t.faq.map((qr) => (
                <Apparition key={qr.q} className="py-7 md:py-8">
                  <h3 className={sousTitre}>{f(qr.q)}</h3>
                  <p className={`mt-3 ${texte}`}>{f(qr.r)}</p>
                </Apparition>
              ))}
            </div>
          </div>
        </section>

        {/* 8. L'appel, et les pages voisines. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titreSection}>{t.finTitre}</h2>
            <p className={`mx-auto mt-5 max-w-2xl ${texte}`}>
              {f(t.fin)}
              {t.anglais && <span className="mt-2 block">{t.anglais}</span>}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link href={rdv} className="btn-plein">
                {t.ctaRdv}
              </Link>
              <Link href={contact} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaContact}
              </Link>
            </div>
          </Apparition>
          <Apparition className="mx-auto mt-16 max-w-4xl md:mt-20">
            <h2 className="surtitre text-center">{t.voirAussi}</h2>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2">
              {liens.map((lien) => (
                <li key={lien.href}>
                  <Link href={lien.href} className="lien-fleche py-2 text-[#2b2320]">
                    {lien.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Apparition>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
