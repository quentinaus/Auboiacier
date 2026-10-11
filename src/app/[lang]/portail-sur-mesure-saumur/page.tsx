import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdService, scriptJsonLd } from "@/lib/seo";
import { MODELES_PAGE_PORTAIL, textesPortailSurMesure, type ModelePagePortail } from "@/lib/textes/portail-sur-mesure-saumur";
import { COULEURS_PORTAIL, TEXTES_PORTAIL, type SlugPortail } from "@/lib/portails";
import { getProduct, productLocalise } from "@/lib/products";
import { prixDepartPortail } from "@/lib/prix-portail.server";
import { prixAffiche } from "@/lib/ui";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

/**
 * « Portail sur mesure à Saumur » (10/10/2026) : la page d'atterrissage de qui cherche un portail autour de Saumur.
 * Elle aide à choisir le type, l'alu ou l'acier, le moteur, dit ce qu'on choisit en ligne et comment le portail arrive
 * (posé par l'atelier, livré, retiré), puis mène aux quatre fiches.
 *
 * Tous les textes, FR et EN, sont dans src/lib/textes/portail-sur-mesure-saumur.ts. Aucun prix tapé : les « dès »
 * viennent du serveur (prixDepartPortail, comme la page des portails), la prise de cotes du code. Données structurées :
 * le fil d'Ariane et le service, sans prix. Les questions sont visibles mais pas balisées : seules /faq, /artisanat/tables,
 * /toiles-tendues et le guide de l'escalier balisent une FAQ (tests/seo-fiches.test.ts).
 */

const CHEMIN = "/portail-sur-mesure-saumur";

/** En français, une espace insécable avant « ? », « ! », « : » et « ; » : jamais un « ? » seul en début de ligne. */
function insecable(texte: string, locale: Locale) {
  return locale === "fr" ? texte.replace(/ ([?!:;])/g, " $1") : texte;
}

/** « anthracite, noir, blanc, vert sapin et rouille » : les teintes du configurateur. */
function teintes(locale: Locale) {
  const noms = COULEURS_PORTAIL.map((c) => TEXTES_PORTAIL[locale].couleur[c].toLowerCase());
  const et = locale === "fr" ? " et " : " and ";
  return `${noms.slice(0, -1).join(", ")}${et}${noms[noms.length - 1]}`;
}

/** Le « dès » d'un modèle ; null si le chiffrage n'est pas disponible sur ce serveur (la carte ne montre alors aucun prix). */
function departPortail(slug: SlugPortail): number | null {
  try {
    return prixDepartPortail(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/[lang]/portail-sur-mesure-saumur">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = textesPortailSurMesure(locale, teintes(locale));
  return metadataPage({ locale, chemin: CHEMIN, title: t.seo.title, description: t.seo.description });
}

export default async function PortailSurMesureSaumurPage({ params }: PageProps<"/[lang]/portail-sur-mesure-saumur">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = textesPortailSurMesure(locale, teintes(locale));
  const f = (texte: string) => insecable(texte, locale);

  const famille = `/${locale}/artisanat/famille/portail`;
  const contact = `/${locale}/contact`;

  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const sousTitre = `${serif.className} text-balance text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  /** Les quatre modèles : la fiche (nom, dessin, passage, place) et le « dès » du serveur. */
  const modeles = MODELES_PAGE_PORTAIL.map((slug: ModelePagePortail) => {
    const p = productLocalise(getProduct(slug)!, locale);
    const spec = (motif: RegExp) => p.specs.find((s) => motif.test(s.label))?.value;
    return {
      slug,
      nom: p.name,
      image: p.images[0],
      passage: spec(/^(Passage|Opening)$/),
      place: spec(/^(Place à prévoir|Space needed)$/),
      des: departPortail(slug),
    };
  });

  const liens = [
    { href: famille, label: t.liens.famille },
    ...modeles.map((m) => ({ href: `/${locale}/artisanat/${m.slug}`, label: t.types[m.slug].lien })),
    { href: `/${locale}/zone-intervention`, label: t.liens.zone },
    { href: `/${locale}/rendez-vous`, label: t.liens.rdv },
    { href: `/${locale}/bois-massif`, label: t.liens.bois },
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
          jsonLdService({ locale, nom: t.service.nom, type: t.service.type, chemin: CHEMIN, description: t.seo.description })
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* 1. Le titre, la promesse, les deux portes : composer le portail, ou poser une question. */}
        <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
          <div className="mx-auto max-w-3xl">
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
            <p className="entree-monte mt-6 text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]" style={entree(330)}>
              {f(t.intro)}
            </p>
            <div className="entree-monte mt-9 flex flex-wrap items-center gap-x-8 gap-y-4" style={entree(480)}>
              <Link href={famille} className="btn-plein">
                {t.ctaConfig}
              </Link>
              <Link href={contact} className="lien-fleche py-2 text-[#2b2320]">
                {t.ctaContact}
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Les quatre modèles : quand choisir lequel, la place, le passage, le « dès » du serveur. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{f(t.typesTitre)}</h2>
              <p className={`mx-auto mt-5 max-w-2xl text-center ${texte}`}>{f(t.typesIntro)}</p>
            </Apparition>
            <ul className="mt-10 grid gap-4 md:mt-14 md:grid-cols-2 md:gap-5">
              {modeles.map((m, i) => (
                <li key={m.slug}>
                  <Apparition retard={(i % 2) * 110} className="h-full">
                    <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-white">
                      {m.image && (
                        <div className="relative aspect-[16/9] bg-[#f4f1ec]">
                          <Visuel
                            locale={locale}
                            src={m.image.src}
                            alt={m.image.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, min(50vw, 600px)"
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col px-7 py-7 md:px-8 md:py-8">
                        <h3 className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.5rem]`}>{m.nom}</h3>
                        <p className={`mt-3 ${texte}`}>{f(t.types[m.slug].quand)}</p>
                        <dl className="mt-4 space-y-1 text-[15px] leading-[1.5] text-[#4a4038]">
                          {m.passage && (
                            <div>
                              <dt className="inline text-[#6f6357]">{locale === "fr" ? "Passage" : "Opening"}{f(locale === "fr" ? " : " : ": ")}</dt>
                              <dd className="inline">{f(m.passage)}</dd>
                            </div>
                          )}
                          {m.place && (
                            <div>
                              <dt className="inline text-[#6f6357]">{locale === "fr" ? "Place à prévoir" : "Space needed"}{f(locale === "fr" ? " : " : ": ")}</dt>
                              <dd className="inline">{f(m.place)}</dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-5">
                          <Link href={`/${locale}/artisanat/${m.slug}`} className="lien-fleche py-2 text-[#2b2320]">
                            {t.types[m.slug].lien}
                          </Link>
                          {m.des != null && (
                            <span className="text-[15px] text-[#4a4038]">
                              {locale === "fr" ? "dès" : "from"} <strong className="font-medium text-[#2b2320]">{prixAffiche(m.des, locale)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ul>
            <Apparition className="mx-auto mt-8 max-w-2xl text-center md:mt-10">
              <p className="text-[14px] leading-[1.5] text-[#6f6357] md:text-[15px]">{f(t.desLegende)}</p>
              <p className={`mt-8 ${texte}`}>{f(t.triTexte)}</p>
              <Link href={famille} className="lien-fleche mt-2 py-2 text-[#2b2320]">
                {t.triLien}
              </Link>
            </Apparition>
          </div>
        </section>

        {/* 3. Alu ou acier, couleur, style. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={titreSection}>{f(t.matiereTitre)}</h2>
            </Apparition>
            <div className="mt-10 divide-y divide-[#e8e1d8] border-y border-[#e8e1d8] md:mt-12">
              {t.matiere.map((bloc) => (
                <Apparition key={bloc.titre} className="py-7 md:py-8">
                  <h3 className={sousTitre}>{f(bloc.titre)}</h3>
                  <p className={`mt-3 ${texte}`}>{f(bloc.texte)}</p>
                </Apparition>
              ))}
            </div>
          </div>
        </section>

        {/* 4. La motorisation. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{f(t.motoTitre)}</h2>
            {t.moto.map((paragraphe) => (
              <p key={paragraphe} className={`mt-5 ${texte}`}>
                {f(paragraphe)}
              </p>
            ))}
          </Apparition>
        </section>

        {/* 5. Ce que le client choisit en ligne. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{f(t.enLigneTitre)}</h2>
            </Apparition>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-4">
              {t.enLigne.map((etape, i) => (
                <li key={etape.titre}>
                  <Apparition retard={(i % 4) * 110} className="h-full">
                    <div className="h-full rounded-[22px] bg-[#f5f1ea] px-7 py-7">
                      <span className="surtitre block" aria-hidden="true">
                        {i + 1}
                      </span>
                      <h3 className={`${serif.className} mt-2 text-[1.3rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320]`}>{f(etape.titre)}</h3>
                      <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{f(etape.texte)}</p>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6. Posé par l'atelier, livré ou retiré. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition>
              <h2 className={`${titreSection} text-center`}>{f(t.receptionTitre)}</h2>
            </Apparition>
            <ul className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
              {t.reception.map((bloc, i) => (
                <li key={bloc.titre}>
                  <Apparition retard={i * 110} className="h-full">
                    <div className="h-full rounded-[22px] bg-white px-7 py-7 md:px-8 md:py-8">
                      <h3 className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.5rem]`}>{f(bloc.titre)}</h3>
                      <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{f(bloc.texte)}</p>
                    </div>
                  </Apparition>
                </li>
              ))}
            </ul>
            <Apparition className="mx-auto mt-10 max-w-3xl md:mt-14">
              <h3 className={sousTitre}>{f(t.nonComprisTitre)}</h3>
              <p className={`mt-3 ${texte}`}>{f(t.nonCompris)}</p>
            </Apparition>
          </div>
        </section>

        {/* 7. Prix, acompte, délai. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{f(t.prixTitre)}</h2>
            {t.prix.map((paragraphe) => (
              <p key={paragraphe} className={`mt-5 ${texte}`}>
                {f(paragraphe)}
              </p>
            ))}
          </Apparition>
        </section>

        {/* 8. Les questions : visibles, non balisées (voir plus haut). */}
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

        {/* 9. L'appel, et les pages voisines. */}
        <section className="bg-[#ffffff] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titreSection}>{t.finTitre}</h2>
            <p className={`mx-auto mt-5 max-w-2xl ${texte}`}>
              {f(t.fin)}
              {t.anglais && <span className="mt-2 block">{t.anglais}</span>}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link href={famille} className="btn-plein">
                {t.ctaConfig}
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
