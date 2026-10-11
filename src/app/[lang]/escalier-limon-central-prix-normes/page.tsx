import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdArticle, jsonLdFaq, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { questionsEscalier } from "@/lib/faq-balisees";
import {
  CHEMIN_GUIDE_ESCALIER,
  DATE_MODIFICATION_GUIDE_ESCALIER,
  DATE_PUBLICATION_GUIDE_ESCALIER,
  guideEscalier,
} from "@/lib/textes/guide-escalier";
import { serif } from "@/lib/fonts";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { Apparition } from "@/components/apparition";
import { Visuel } from "@/components/visuel";

/**
 * Le guide « Escalier à limon central : prix, formes et normes » (plan de
 * référencement, page n° 1). La fiche sert à demander le devis ; cette page
 * répond à ceux qui cherchent « escalier limon central prix », « quart
 * tournant », « hauteur de marche norme », « loi de Blondel », « échappée ».
 *
 * AUCUN CHIFFRE N'EST TAPÉ ICI : textes, prix et normes viennent de
 * guideEscalier (src/lib/textes/guide-escalier.ts), qui lit le moteur du
 * catalogue, les marqueurs du code et src/lib/normes-escalier.ts.
 *
 * Données structurées : fil d'Ariane (visible plus bas), Article signé par
 * l'atelier (Quentin n'a pas encore relu le guide) et les questions du guide,
 * balisées ici et seulement ici (plan, page n° 1 ; questionsEscalier dans
 * src/lib/faq-balisees.ts, qui garde la règle « une question balisée une seule
 * fois », tests/seo-fiches.test.ts) : la liste balisée est celle affichée.
 * Pas de Product : il reste sur la fiche.
 */

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/escalier-limon-central-prix-normes">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const g = guideEscalier(locale);
  return metadataPage({
    locale,
    chemin: CHEMIN_GUIDE_ESCALIER,
    title: g.seo.titre,
    description: g.seo.description,
    image: g.imageHero.src,
  });
}

export default async function GuideEscalierPage({ params }: PageProps<"/[lang]/escalier-limon-central-prix-normes">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const g = guideEscalier(locale);
  /** Les questions affichées en bas de page, et les mêmes pour Google. */
  const questions = questionsEscalier(g);
  const fiche = `/${locale}${g.cheminFiche}`;
  const rdv = `/${locale}/rendez-vous`;

  /** Le titre et la phrase arrivent tout de suite (animation CSS) ; la suite monte au défilement. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  const titre2 = `${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const titre3 = `${serif.className} text-[1.6rem] text-balance leading-[1.1] tracking-[-0.012em] text-[#2b2320] sm:text-[1.9rem]`;
  const chapo = "mt-5 text-[17px] leading-[1.5] text-[#5c5140] md:text-[19px]";
  const corps = "text-[16px] leading-[1.6] text-[#4a4038] md:text-[17px]";
  // Sur téléphone, chaque ligne d'un tableau devient une carte, et chaque cellule dit son titre (data-titre).
  const cellule =
    "py-4 pr-4 align-top max-md:flex max-md:justify-between max-md:gap-4 max-md:py-1.5 max-md:pr-0 max-md:text-right max-md:before:text-left max-md:before:text-[13px] max-md:before:text-[#726757] max-md:before:content-[attr(data-titre)]";
  // Les normes ont des cellules plus longues : sur téléphone, le titre de la cellule au-dessus de sa valeur.
  const celluleEmpilee =
    "py-4 pr-4 align-top max-md:block max-md:py-1.5 max-md:pr-0 max-md:before:block max-md:before:text-[13px] max-md:before:text-[#726757] max-md:before:content-[attr(data-titre)]";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: g.filArianeFiche, chemin: g.cheminFiche },
            { nom: g.filAriane, chemin: CHEMIN_GUIDE_ESCALIER },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdArticle({
            locale,
            chemin: CHEMIN_GUIDE_ESCALIER,
            titre: g.h1,
            description: g.seo.description,
            datePublication: DATE_PUBLICATION_GUIDE_ESCALIER,
            dateModification: DATE_MODIFICATION_GUIDE_ESCALIER,
            image: g.imageHero.src,
          })
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(jsonLdFaq(questions.map((qr) => ({ question: qr.q, reponse: qr.a }))))}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        {/* 1. Le titre, la promesse, les deux portes : la prise de cotes, la fiche. */}
        <section className="px-6 pb-12 pt-10 md:pb-16 md:pt-14">
          <div className="mx-auto max-w-6xl">
            {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
            <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[13px] text-[#6f6357]">
              <Link href={`/${locale}`} className="hover:text-[#2b2320]">
                {dict.nav.home}
              </Link>
              <span className="mx-1.5">/</span>
              <Link href={fiche} className="hover:text-[#2b2320]">
                {g.filArianeFiche}
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-[#2b2320]">{g.filAriane}</span>
            </nav>

            <p className="surtitre entree-monte mt-8 md:mt-12" style={entree(40)}>
              {g.surtitre}
            </p>
            <h1
              className={`${serif.className} entree-monte mt-3 max-w-4xl text-[2.4rem] text-balance leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}
              style={entree(100)}
            >
              {g.h1}
            </h1>
            <p
              className="entree-monte mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
              style={entree(260)}
            >
              {g.intro}
            </p>
            <div className="entree-monte mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={entree(380)}>
              <Link href={rdv} className="btn-plein">
                {g.ctaRdv}
              </Link>
              <Link href={fiche} className="lien-fleche text-[#2b2320]">
                {g.voirFiche}
              </Link>
            </div>
          </div>
        </section>

        {/* L'escalier entier : une image d'illustration, dite comme telle. */}
        <section className="px-6">
          <figure className="mx-auto max-w-6xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#e6e0d6] sm:aspect-[21/9]">
              <Visuel
                locale={locale}
                src={g.imageHero.src}
                alt={g.imageHero.alt}
                fill
                sizes="(max-width: 1680px) 100vw, 1680px"
                className="object-cover"
                style={g.imageHero.position ? { objectPosition: g.imageHero.position } : undefined}
                priority
              />
            </div>
            <figcaption className="mt-3 text-[14px] leading-[1.5] text-[#6f6357] md:text-[15px]">{g.legendeHero}</figcaption>
          </figure>
        </section>

        {/* 2. Les prix : chaque forme, chaque essence, par le moteur du catalogue. */}
        <section className="mt-16 bg-[#f5f1ea] px-6 py-16 md:mt-24 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition className="max-w-3xl">
              <h2 className={titre2}>{g.prix.titre}</h2>
              <p className={chapo}>{g.prix.corps}</p>
            </Apparition>
            <Apparition className="mt-10 rounded-[28px] bg-white px-5 py-6 md:px-10 md:py-9">
              <table className="w-full border-collapse text-left text-[16px] max-md:block md:text-[17px]">
                <caption className="pb-4 text-left text-[14px] text-[#6f6357] max-md:block md:text-[15px]">{g.prix.legende}</caption>
                <thead className="max-md:hidden">
                  <tr className="border-b border-[#d9cfc0] align-bottom text-[14px] text-[#726757]">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      {g.prix.colForme}
                    </th>
                    {g.prix.essences.map((essence) => (
                      <th key={essence} scope="col" className="whitespace-nowrap py-3 pr-4 font-medium">
                        {essence}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="max-md:block max-md:space-y-3">
                  {g.prix.lignes.map((ligne) => (
                    <tr
                      key={ligne.id}
                      className="border-b border-[#e8e1d8] last:border-b-0 max-md:block max-md:rounded-2xl max-md:border max-md:border-[#e8e1d8] max-md:px-4 max-md:py-3 max-md:last:border-b"
                    >
                      <th scope="row" className="py-4 pr-4 align-top font-medium text-[#2b2320] max-md:block max-md:pb-2 max-md:pt-0">
                        {ligne.label}
                      </th>
                      {ligne.prixAffiches.map((prix, i) => (
                        <td
                          key={g.prix.essences[i]}
                          data-titre={g.prix.essences[i]}
                          className={`${cellule} whitespace-nowrap tabular-nums text-[#2b2320]`}
                        >
                          {prix}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Apparition>
            <Apparition className="mt-6 max-w-3xl">
              <p className={corps}>
                {g.prix.fabrication} {g.prix.couleurMemePrix} {g.prix.suite}
              </p>
            </Apparition>
          </div>
        </section>

        {/* 3. Ce que comprend le prix, et le limon sous les marches. */}
        <section className="px-6 py-16 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-16">
            <Apparition>
              <h2 className={titre2}>{g.contenu.titre}</h2>
              <ul className="mt-8 divide-y divide-[#e8e1d8] border-y border-[#e8e1d8]">
                {g.contenu.items.map((item) => (
                  <li key={item} className={`py-4 ${corps}`}>
                    {item}
                  </li>
                ))}
              </ul>
              {/* Ce que le prix de départ ne comprend pas d'office : le garde-corps, chiffré au devis ; la pose, tant que
                  l'assurance décennale n'est pas signée. */}
              {g.contenu.notes.map((note) => (
                <p key={note} className={`mt-6 ${corps}`}>
                  {note}
                </p>
              ))}
            </Apparition>
            {g.imageDetail && (
              <Apparition retard={120} className="md:pt-24">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#d9cfc2]">
                  <Visuel
                    locale={locale}
                    src={g.imageDetail.src}
                    alt={g.imageDetail.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover"
                    style={g.imageDetail.position ? { objectPosition: g.imageDetail.position } : undefined}
                  />
                </div>
              </Apparition>
            )}
          </div>
        </section>

        {/* 4. Les trois formes, selon la trémie. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition className="max-w-3xl">
              <h2 className={titre2}>{g.formes.titre}</h2>
              <p className={chapo}>{g.formes.intro}</p>
            </Apparition>
            <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
              {g.formes.cartes.map((carte, i) => (
                <Apparition key={carte.id} retard={i * 80} className="flex flex-col rounded-[28px] bg-white p-7 md:p-8">
                  <h3 className={`${serif.className} text-[1.5rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320]`}>{carte.label}</h3>
                  <p className={`mt-3 ${corps}`}>{carte.texte}</p>
                  <p className="mt-auto pt-6 text-[17px] font-medium tabular-nums text-[#2b2320]">{carte.des}</p>
                </Apparition>
              ))}
            </div>
            <Apparition className="mt-8 max-w-3xl">
              <p className={corps}>{g.formes.conclusion}</p>
            </Apparition>
          </div>
        </section>

        {/* 5. Les normes, chiffre par chiffre, avec leur source. */}
        <section className="px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition className="max-w-3xl">
              <h2 className={titre2}>{g.normes.titre}</h2>
              <p className={chapo}>{g.normes.intro}</p>
            </Apparition>
            <Apparition className="mt-10">
              <table className="w-full border-collapse text-left text-[16px] max-md:block md:text-[17px]">
                <thead className="max-md:hidden">
                  <tr className="border-b border-[#d9cfc0] align-bottom text-[14px] text-[#726757]">
                    {g.normes.colonnes.map((colonne) => (
                      <th key={colonne} scope="col" className="py-3 pr-4 font-medium">
                        {colonne}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="max-md:block max-md:space-y-3">
                  {g.normes.lignes.map((ligne) => (
                    <tr
                      key={ligne.regle}
                      className="border-b border-[#e8e1d8] max-md:block max-md:rounded-2xl max-md:border max-md:px-4 max-md:py-3"
                    >
                      <th scope="row" className="py-4 pr-4 align-top font-medium text-[#2b2320] max-md:block max-md:pb-2 max-md:pt-0">
                        {ligne.regle}
                      </th>
                      <td data-titre={g.normes.colonnes[1]} className={`${celluleEmpilee} text-[#2b2320]`}>
                        {ligne.chiffre}
                      </td>
                      <td data-titre={g.normes.colonnes[2]} className={`${celluleEmpilee} text-[#4a4038]`}>
                        {ligne.atelier}
                      </td>
                      <td data-titre={g.normes.colonnes[3]} className={`${celluleEmpilee} text-[15px] text-[#6f6357]`}>
                        {ligne.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={`mt-6 max-w-3xl ${corps}`}>{g.normes.mesures}</p>
            </Apparition>

            <div className="mt-12 divide-y divide-[#e5ddd3] border-t border-[#e5ddd3] md:mt-16">
              {[
                { titre: g.normes.blondelTitre, texte: g.normes.blondel },
                { titre: g.normes.quiTitre, texte: g.normes.qui },
                { titre: g.normes.gardeCorpsTitre, texte: g.normes.gardeCorps },
              ].map((bloc) => (
                <section key={bloc.titre} className="py-10 md:py-14">
                  <Apparition className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
                    <h3 className={titre3}>{bloc.titre}</h3>
                    <p className={`md:pt-1 ${corps}`}>{bloc.texte}</p>
                  </Apparition>
                </section>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Les trois mesures à prendre avant la visite. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Apparition className="max-w-3xl">
              <h2 className={titre2}>{g.mesurer.titre}</h2>
              <p className={chapo}>{g.mesurer.intro}</p>
            </Apparition>
            <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
              {g.mesurer.items.map((item, i) => (
                <li key={item.titre}>
                  <Apparition retard={i * 80} className="h-full rounded-[28px] bg-white p-7 md:p-8">
                    <span aria-hidden="true" className={`${serif.className} block text-[2.4rem] leading-none text-[#8a6233]`}>
                      {i + 1}
                    </span>
                    <h3 className={`${serif.className} mt-4 text-[1.4rem] leading-[1.15] text-[#2b2320]`}>{item.titre}</h3>
                    <p className={`mt-2 ${corps}`}>{item.texte}</p>
                  </Apparition>
                </li>
              ))}
            </ol>
            <Apparition className="mt-10 max-w-3xl">
              <p className={corps}>{g.mesurer.visite}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link href={rdv} className="btn-plein">
                  {g.ctaRdv}
                </Link>
                {/* « Zone d'intervention », pas « Pose autour de Saumur » : la pose attend l'assurance décennale. */}
                <Link href={`/${locale}/zone-intervention`} className="lien-fleche text-[#2b2320]">
                  {dict.nav.zone}
                </Link>
              </div>
            </Apparition>
          </div>
        </section>

        {/* 7. Les questions, affichées, et balisées plus haut depuis la même liste. */}
        <section className="px-6 py-16 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Apparition>
              <h2 className={titre2}>{g.faq.titre}</h2>
            </Apparition>
            <div className="mt-8 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
              {questions.map((qr, i) => (
                <div key={qr.q} className="py-7">
                  <h3 className={`${serif.className} text-[1.35rem] leading-[1.2] text-[#2b2320] md:text-[1.5rem]`}>{qr.q}</h3>
                  <p className={`mt-3 ${corps}`}>{qr.a}</p>
                  {i === 0 && (
                    <Link href={`/${locale}/bois-massif`} className="lien-fleche mt-4 text-[#2b2320]">
                      {g.faq.lienBois}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. L'appel : la prise de cotes, la fiche, les pages voisines. */}
        <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titre2}>{g.fin.titre}</h2>
            <p className={`mx-auto max-w-2xl ${chapo}`}>{g.fin.corps}</p>
            <div className="mt-8 flex flex-col items-center gap-5">
              <Link href={rdv} className="btn-plein">
                {g.ctaRdv}
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                <Link href={fiche} className="lien-fleche py-1 text-[#2b2320]">
                  {g.fin.lienFiche}
                </Link>
                <Link href={`/${locale}/bois-massif`} className="lien-fleche py-1 text-[#2b2320]">
                  {dict.liens.boisLong}
                </Link>
                <Link href={`/${locale}/garde-corps-fenetre-normes`} className="lien-fleche py-1 text-[#2b2320]">
                  {dict.liens.normesGc}
                </Link>
              </div>
            </div>
          </Apparition>
        </section>

        {/* 9. Qui a écrit le guide, quand, et d'où viennent les chiffres. */}
        <section className="px-6 py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-[14px] leading-[1.6] text-[#6f6357] md:text-[15px]">
            <p>{g.signature}</p>
            <p className="mt-6 font-semibold text-[#2b2320]">{g.sourcesTitre}</p>
            <ul className="mt-2 space-y-2">
              {g.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} rel="noopener noreferrer" className="underline decoration-[#6f6357]/40 underline-offset-4 hover:text-[#2b2320]">
                    {source.titre}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
