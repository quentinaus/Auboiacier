import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdFilAriane, jsonLdService, scriptJsonLd } from "@/lib/seo";
import { remplacerAvec, remplacerMarqueurs, verifierMarqueurs } from "@/lib/marqueurs";
import { commandesOuvertes } from "@/lib/entreprise";
import { CHEMIN_SOUDURE, TEXTES_SOUDURE, valeursSoudure } from "@/lib/textes/soudure-reparations";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { Apparition } from "@/components/apparition";
import { serif } from "@/lib/fonts";

/**
 * « Soudure et réparations à Saumur » : la soudure à façon et les
 * réparations, que Quentin veut vendre aussi (07/10/2026). Ce que l'atelier
 * soude et répare, avec quels procédés, comment demander un devis (photo et
 * dimensions par le formulaire de contact, prise de cotes sur place par
 * /rendez-vous), qui soude, et quand il vaut mieux refaire à neuf.
 *
 * Les textes, en français et en anglais, sont dans
 * src/lib/textes/soudure-reparations.ts (ce qui est vrai et ce qui ne l'est
 * pas encore y est écrit). Aucun prix écrit : « sur devis », et la prise de
 * cotes par ses marqueurs, remplacés ici.
 *
 * Données structurées : le fil d'Ariane (visible plus bas) et le service
 * (sans prix). Les questions sont affichées, pas balisées : la FAQ balisée
 * est réservée à /faq, /artisanat/tables et /toiles-tendues.
 */

/**
 * Les textes de la page dans une langue, marqueurs remplacés (ceux du code, puis le jour d'ouverture des
 * commandes) ; un marqueur sans valeur fait échouer la page.
 */
function textes(locale: Locale) {
  const t = remplacerAvec(remplacerMarqueurs(TEXTES_SOUDURE[locale], locale), valeursSoudure(locale));
  verifierMarqueurs(t, `soudure-reparations (${locale})`);
  return t;
}

/**
 * Le français met une espace insécable devant « ? ! : ; » et après « « » :
 * à l'écran, le signe ne part jamais seul sur la ligne suivante
 * (« Travaillez-vous pour les particuliers » puis « ? » tout seul, 375 px).
 */
function insecables<T>(valeur: T): T {
  const suivre = (v: unknown): unknown => {
    if (typeof v === "string") return v.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
    if (Array.isArray(v)) return v.map(suivre);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([cle, sous]) => [cle, suivre(sous)]));
    return v;
  };
  return suivre(valeur) as T;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/soudure-reparations">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = textes(locale);
  return metadataPage({
    locale,
    chemin: CHEMIN_SOUDURE,
    title: t.seo.title,
    description: t.seo.description,
  });
}

export default async function SoudureReparationsPage({ params }: PageProps<"/[lang]/soudure-reparations">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const brut = textes(locale);
  const t = insecables(brut);

  // Le formulaire de contact reprend la première ligne du message : Quentin
  // sait d'où vient la demande, le client n'a plus qu'à décrire sa pièce.
  const hrefDevis = `/${locale}/contact?produit=${encodeURIComponent(brut.prefillContact)}`;

  /** Les titres de la page, aux tailles de l'accueil (façon Apple, 06/10/2026). */
  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;
  const sousTitre = `${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`;
  const texte = "text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]";
  /** Le titre, la phrase puis les boutons arrivent l'un après l'autre, comme en haut de l'accueil. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: brut.filAriane, chemin: CHEMIN_SOUDURE },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdService({
            locale,
            nom: brut.service.nom,
            type: brut.service.type,
            chemin: CHEMIN_SOUDURE,
            description: brut.seo.description,
          })
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* 1. Le titre, ce que fait l'atelier en une phrase, et les deux façons de demander un prix. */}
      <section className="bg-[#ffffff] px-6 pb-16 pt-10 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-3xl">
          {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[14px] text-[#6f6357]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#2b2320]">{t.filAriane}</span>
          </nav>
          <p className="surtitre entree-monte mt-10 md:mt-14" style={entree(80)}>
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
            {t.intro}
          </p>
          {/* Avant l'ouverture des commandes : seulement des demandes de devis. */}
          {!commandesOuvertes() && (
            <p className="entree-monte mt-5 text-[15px] leading-[1.5] text-[#6f6357] md:text-[16px]" style={entree(420)}>
              {t.ouverture}
            </p>
          )}
          <div
            className="entree-monte mt-9 flex flex-col items-start gap-6 sm:flex-row sm:flex-wrap sm:gap-x-10"
            style={entree(500)}
          >
            <div className="flex flex-col items-start gap-2.5">
              <Link href={hrefDevis} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <span className="text-[14px] text-[#6f6357]">{t.ctaDevisNote}</span>
            </div>
            <div className="flex flex-col items-start gap-2.5">
              <Link href={`/${locale}/rendez-vous`} className="btn-contour">
                {t.ctaCotes}
              </Link>
              <span className="text-[14px] text-[#6f6357]">{t.ctaCotesNote}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Ce que l'atelier soude et répare : quatre familles de travaux. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titreSection}>{t.travauxTitre}</h2>
            <p className={`mt-5 ${texte}`}>{t.travauxIntro}</p>
          </Apparition>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5">
            {t.travaux.map((travail, i) => (
              <li key={travail.titre}>
                <Apparition retard={(i % 2) * 110} className="h-full rounded-[22px] bg-white px-7 py-7 md:px-8 md:py-8">
                  <h3 className={sousTitre}>{travail.titre}</h3>
                  <p className={`mt-3 ${texte}`}>{travail.texte}</p>
                </Apparition>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Les trois procédés de Quentin, et les métaux soudés. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            <h2 className={titreSection}>{t.procedesTitre}</h2>
            <p className={`mt-5 ${texte}`}>{t.procedesIntro}</p>
          </Apparition>
          <ul className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
            {t.procedes.map((procede, i) => (
              <li key={procede.titre}>
                <Apparition retard={(i % 3) * 110} className="h-full rounded-[22px] bg-[#f5f1ea] px-7 py-8 md:px-8 md:py-9">
                  <h3 className={sousTitre}>{procede.titre}</h3>
                  <p className={`mt-3 ${texte}`}>{procede.texte}</p>
                </Apparition>
              </li>
            ))}
          </ul>
          <Apparition>
            <p className={`mt-8 max-w-3xl md:mt-10 ${texte}`}>{t.matieres}</p>
          </Apparition>
        </div>
      </section>

      {/* 4. Comment demander un devis : quatre étapes, puis la prise de cotes sur place. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="max-w-3xl">
            <h2 className={titreSection}>{t.demandeTitre}</h2>
          </Apparition>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-4">
            {t.etapes.map((etape, i) => (
              <li key={etape.titre}>
                <Apparition retard={(i % 4) * 110} className="h-full rounded-[22px] bg-white px-7 py-8 md:px-8 md:py-9">
                  <span
                    aria-hidden
                    className={`${serif.className} inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2b2320] text-[17px] text-[#2b2320]`}
                  >
                    {i + 1}
                  </span>
                  <h3 className={`mt-5 ${sousTitre}`}>{etape.titre}</h3>
                  <p className="mt-3 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{etape.texte}</p>
                </Apparition>
              </li>
            ))}
          </ol>
          <Apparition className="mt-10 max-w-3xl md:mt-14">
            <p className={texte}>{t.cotesTexte}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href={hrefDevis} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <Link href={`/${locale}/rendez-vous`} className="lien-fleche py-2 text-[#2b2320]">
                {t.cotesLien}
              </Link>
            </div>
          </Apparition>
        </div>
      </section>

      {/* 5. Le prix, et qui soude. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col gap-14 md:gap-16">
          <Apparition>
            <h2 className={sousTitre}>{t.prixTitre}</h2>
            <p className={`mt-4 ${texte}`}>{t.prixTexte}</p>
          </Apparition>
          <Apparition>
            <h2 className={sousTitre}>{t.quiTitre}</h2>
            <p className={`mt-4 ${texte}`}>
              {t.quiTexte}
              {t.quiLangue && <> {t.quiLangue}</>}
            </p>
            <p className={`mt-4 ${texte}`}>{t.zoneTexte}</p>
            <div className="mt-5 flex flex-col items-start gap-y-3 sm:flex-row sm:flex-wrap sm:gap-x-8">
              <Link href={`/${locale}/a-propos`} className="lien-fleche text-[#2b2320]">
                {t.quiLien}
              </Link>
              <Link href={`/${locale}/zone-intervention`} className="lien-fleche text-[#2b2320]">
                {t.zoneLien}
              </Link>
            </div>
          </Apparition>
        </div>
      </section>

      {/* 6. Quand la réparation ne vaut plus la peine : les pièces que l'atelier fabrique. Toute la tuile s'ouvre au clic. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Apparition className="mx-auto max-w-3xl text-center">
            <h2 className={titreSection}>{t.neufTitre}</h2>
            <p className={`mt-5 ${texte}`}>{t.neufTexte}</p>
          </Apparition>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5">
            {t.neuf.map((piece, i) => (
              <li key={piece.chemin}>
                <Apparition retard={(i % 2) * 110} className="h-full">
                  <div className="group relative h-full rounded-[22px] bg-white px-7 py-7 transition-shadow duration-500 hover:shadow-[0_22px_50px_-36px_rgba(43,35,32,0.5)] md:px-8 md:py-8">
                    <Link
                      href={`/${locale}${piece.chemin}`}
                      className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] decoration-1 underline-offset-[6px] before:absolute before:inset-0 before:rounded-[22px] before:content-[''] after:ml-1.5 after:inline-block after:transition-transform after:duration-300 after:content-['›'] group-hover:underline group-hover:after:translate-x-1 md:text-[1.5rem]`}
                    >
                      {piece.titre}
                    </Link>
                    <p className="mt-3 text-[16px] leading-[1.55] text-[#4a4038]">{piece.texte}</p>
                  </div>
                </Apparition>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. Les questions, affichées (non balisées), puis la demande de devis. */}
      <section className="bg-[#ffffff] px-6 py-16 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Apparition>
            <h2 className={titreSection}>{t.faqTitre}</h2>
            <div className="mt-8 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
              {t.faq.map((item) => (
                <div key={item.q} className="py-6">
                  <h3 className={sousTitre}>{item.q}</h3>
                  <p className={`mt-3 ${texte}`}>{item.a}</p>
                </div>
              ))}
            </div>
          </Apparition>

          <Apparition className="mt-16 text-center md:mt-24">
            <h2 className={titreSection}>{t.finTitre}</h2>
            <p className={`mx-auto mt-5 max-w-2xl ${texte}`}>{t.finTexte}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link href={hrefDevis} className="btn-plein">
                {t.ctaDevis}
              </Link>
              <Link href={`/${locale}/faq`} className="lien-fleche py-2 text-[#2b2320]">
                {t.finLienFaq}
              </Link>
            </div>
          </Apparition>
        </div>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
