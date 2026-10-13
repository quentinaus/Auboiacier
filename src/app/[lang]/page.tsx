import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { CarteCategorie } from "@/components/carte-categorie";
import { categoriesCollection, piecesDeFamille } from "@/lib/categories-collection";
import { Visuel, MentionIllustration } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { remplacerMarqueurs } from "@/lib/marqueurs";
import { metadataPage, lienAvisGoogle } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { IndiceDefiler } from "@/components/indice-defiler";
import { computeUnitPrice, getProduct, SUR_MESURE, type Famille } from "@/lib/products";
import { DemoConfigurateur, type EtatDemo } from "@/components/demo-configurateur";
import { prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import { prixAffiche } from "@/lib/ui";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "",
    title: dict.seo.hub.title,
    description: dict.seo.hub.description,
    image: "/images/mikado/ambiance.jpg",
  });
}

export default async function HubPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.hub;
  /** Le texte du bas, avec {prixVisite} et {rayonVisite} remplacés par les valeurs à jour. */
  const seoBlocs = remplacerMarqueurs(t.seoBlocs, locale);

  /** Les catégories en situation seulement, même cadrage (demande de Quentin, 09/10/2026 : « pas épuré, fait IA »). */
  const categories = categoriesCollection(locale, t).filter((c) => c.enSituation);

  /** Le garde-corps en haut de l'accueil, avec son prix d'appel calculé par l'outil (étude marketing, 06/10). */
  const ficheGC = getProduct("garde-corps");
  const appelGC = ficheGC ? prixAppelGC(ficheGC) : null;
  /** Le plus petit prix de départ d'une ou plusieurs familles (null : sur devis). */
  const departDe = (familles: Famille[]) => {
    const prix = familles.flatMap(piecesDeFamille).map(prixDepart).filter((p): p is number => p !== null);
    return prix.length ? Math.min(...prix) : null;
  };
  const des = (prix: number | null) => (prix === null ? "" : `${locale === "fr" ? "dès" : "from"} ${prixAffiche(prix, locale)}`);
  /** Les quatre pièces qui se configurent en ligne, chacune avec son prix de départ. */
  const portesConfig = [
    // Quentin (10/10/2026) : d'abord le choix entre les deux garde-corps (sans décor, ou forgé à volutes), pas un modèle d'office.
    { href: `/${locale}/artisanat/famille/garde-corps`, label: t.catGardeCorps, prix: des(appelGC ? appelGC.prix : departDe(["garde-corps"])) },
    { href: `/${locale}/artisanat/tables`, label: t.catTables, prix: des(departDe(["table-interieur"])) },
    { href: `/${locale}/toiles-tendues`, label: t.catPlafonds, prix: des(departDe(["plafond"])) },
    // Quentin (10/10/2026) : « ajoute portails ici aussi ».
    { href: `/${locale}/artisanat/famille/portail`, label: t.catPortails, prix: des(departDe(["portail"])) },
  ];

  /** La démonstration de l'accueil : une table sur mesure à trois longueurs, aux prix du barème public de la fiche (jamais écrits ici). */
  const ficheDemo = getProduct("table-mikado");
  const demoLargeurCm = 90;
  const demoEpaisseurMm = 45;
  const demoEtats: EtatDemo[] = ficheDemo
    ? [140, 240, 340]
        .map((longueurCm) => ({
          longueurCm,
          prix: computeUnitPrice(ficheDemo, {
            sizeId: SUR_MESURE,
            largeurMm: longueurCm * 10,
            hauteurMm: demoLargeurCm * 10,
            epaisseurMm: demoEpaisseurMm,
            woodId: ficheDemo.woods.find((w) => w.id.includes("chene"))?.id ?? ficheDemo.woods[0]?.id,
            metalId: ficheDemo.metals[0]?.id,
            locale,
          }),
        }))
        .filter((e): e is EtatDemo => e.prix !== null)
    : [];

  /** Vrais témoignages clients — à remplir, rien d'inventé ici. */
  const testimonials: { quote: string; author: string }[] = [];
  // La fiche Google de l'atelier, quand elle existe : sans elle, ni phrase ni lien.
  const ficheGoogle = lienAvisGoogle();

  return (
    <div className="accueil-droit min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} overlay />
      <main id="contenu">

      {/* 1. Le premier écran, façon Apple (Quentin, 06/10/2026 : « plus premium, plus Apple ») : une seule grande photo,
          le grand titre de la page — le métier et la ville —, une phrase, deux boutons. Le h1 garde toute sa phrase pour
          le référencement : le métier en très grand, le reste dessous. */}
      {(() => {
        const [metier, ...reste] = t.h1.split(" — ");
        return (
          // La photo encadrée, avec du blanc autour (Quentin, 07/10/2026 : « moins zoomée, pas en pleine page, ça dégrade la
          // qualité ») ; le cadre ne prend pas tout l'écran : le haut de la suite se voit dessous.
          // Sur téléphone (en hauteur), une photo en largeur ne remplit l'écran qu'en étant très zoomée (Quentin, 07/10 :
          // « la photo est très zoomée ») : elle garde ses proportions, en haut, et le texte passe dessous, sur blanc.
          <>
          <section className="hero-accueil trio-accueil bg-white md:grid md:h-[100svh] md:min-h-[600px] md:grid-cols-1 md:grid-rows-1">
          <div className="relative md:col-span-2 md:flex md:items-center md:overflow-hidden">
            <div className="relative aspect-[3/2] overflow-hidden bg-[#1d1d1f] md:absolute md:inset-0 md:aspect-auto">
            <div className="camera-lente camera-douce absolute inset-0">
              {/* La mention se pose plus bas, au-dessus du voile : ici, elle avancerait avec la caméra. */}
              <Visuel
                locale={locale}
                mention={false}
                src="/images/mikado/ambiance-hd.jpg"
                alt={t.altHeroMobilier}
                fill
                priority
                sizes="(max-width: 1680px) 100vw, 1680px"
                style={{ objectPosition: "50% 58%" }}
                className="object-cover"
              />
            </div>
            {/* Sur téléphone, seulement de quoi lire le menu en haut ; sur ordinateur, de quoi lire le titre posé sur la photo. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/0 to-black/0 md:bg-gradient-to-r md:from-black/60 md:via-black/30 md:to-black/5" />
            <MentionIllustration src="/images/mikado/ambiance-hd.jpg" locale={locale} ton="sombre" />
            </div>
            <div className="relative z-10 mx-auto w-full max-w-6xl px-3 pb-2 pt-7 md:px-6 md:pb-0 md:pt-0">
              <h1 className={`${serif.className} max-w-5xl text-[#1d1d1f] md:text-white`}>
                <span className="entree-monte block text-[clamp(2.9rem,8.4vw,6.4rem)] font-normal leading-[0.98] tracking-[-0.022em] md:text-[clamp(2.6rem,min(6.6vw,11svh),6.4rem)]" style={{ "--retard": "200ms" } as CSSProperties}>
                  {metier}
                </span>
                {reste.length > 0 && (
                  <>
                    {/* Le tiret reste dans le texte du titre : sans lui, Google et les lecteurs d'écran liraient les
                        deux moitiés collées. */}
                    <span className="sr-only"> — </span>
                    <span
                      className="entree-monte mt-4 block max-w-xl font-sans text-[17px] font-normal leading-[1.45] tracking-[-0.01em] text-[#4a4038] md:mt-[2.6svh] md:text-[clamp(16px,2.4svh,21px)] md:text-white/88"
                      style={{ "--retard": "420ms" } as CSSProperties}
                    >
                      {reste.join(" — ").replace(/^./, (c) => c.toUpperCase())}.
                    </span>
                  </>
                )}
              </h1>
              <div className="entree-monte mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-[3.4svh]" style={{ "--retard": "620ms" } as CSSProperties}>
                <Link href="#configurer" className="btn-clair">
                  {locale === "fr" ? "Configurer ma pièce" : "Configure my piece"}
                </Link>
                <Link href={`/${locale}/artisanat`} className="lien-fleche text-[#1d1d1f] md:text-white">
                  {locale === "fr" ? "Toute la collection" : "The full collection"}
                </Link>
              </div>
            </div>
            {/* « Découvrir » et la souris : sur ordinateur seulement (une souris ne dit rien sur un téléphone, et la suite s'y
                voit déjà sous le texte). */}
            <div className="hidden md:block">
              <IndiceDefiler cible="suite" label={locale === "fr" ? "Voir la suite de la page" : "Scroll to see more"} mot={locale === "fr" ? "Découvrir" : "Discover"} />
            </div>
          </div>
          {/* (Les deux grands panneaux « Plafonds lumineux » et « Mobilier acier & bois » qui suivaient la photo ont été retirés
              le 12/10/2026 — Quentin, sur son téléphone : trois photos d'affilée, « ça charge », « on ne sait pas s'il faut cliquer
              sur le bouton ou sur la photo ». Les deux univers restent dans le menu, dans la liste des prix juste dessous et dans
              les cartes plus bas.) */}
          </section>
          {/* La fin du cadre : « Découvrir » descend jusqu'ici. */}
          <span id="suite" aria-hidden="true" className="block h-0 scroll-mt-0" />
          </>
        );
      })()}

      {/* 2. Configurer sa pièce (refait le 09/10/2026, Quentin : « prend trop de place, pas élégant ») : une bande basse et
          typographique — à gauche le titre, à droite trois lignes fines, chacune avec son prix de départ. Plus de grande
          carte ni d'animation. */}
      <section id="configurer" className="scroll-mt-4 border-t border-[#e5ddd3] bg-[#f5f1ea] px-6 py-12 md:py-16">
        {/* Refaite le 13/10/2026 (Quentin : « ça ne donne pas envie de configurer ») : à gauche le titre et les quatre pièces à
            configurer, à droite un mini-configurateur qui bouge — la table se redessine à chaque longueur, le prix suit. Compact :
            la bande garde la hauteur de l'ancienne (Quentin, 09/10 : « prend trop de place »). Sur téléphone : titre, démonstration,
            puis les quatre pièces. */}
        <Apparition className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-x-16">
          <div className="md:col-start-1 md:row-start-1 md:self-end">
            <p className="surtitre">{t.configLabel}</p>
            <h2 className={`${serif.className} mt-2 text-balance text-[1.7rem] leading-[1.1] tracking-[-0.016em] text-[#2b2320] md:text-[2.2rem]`}>
              {t.configTitle}
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-[1.5] text-[#6f6357] md:text-[16px]">
              {locale === "fr"
                ? "Vos cotes, votre prix tout de suite, votre devis en PDF : sans compte, sans engagement."
                : "Your measurements, your price straight away, your quote as a PDF: no account, no commitment."}
            </p>
          </div>
          {demoEtats.length === 3 && (
            <div className="md:col-start-2 md:row-span-2 md:row-start-1">
              <DemoConfigurateur etats={demoEtats} largeurCm={demoLargeurCm} epaisseurMm={demoEpaisseurMm} lienTable={`/${locale}/artisanat/tables`} locale={locale} />
            </div>
          )}
          <ul className="md:col-start-1 md:row-start-2 md:self-start">
            {portesConfig.map((porte) => (
              <li key={porte.href} className="border-t border-[#e0d7cb] last:border-b">
                <Link href={porte.href} className="group flex items-center justify-between gap-4 py-3.5">
                  <span className={`${serif.className} text-[1.2rem] leading-[1.2] text-[#2b2320] md:text-[1.35rem]`}>{porte.label}</span>
                  <span className="flex shrink-0 items-center gap-3 text-[14px] text-[#5c5140] md:text-[15px]">
                    {porte.prix}
                    <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full border border-[#cfc4b5] bg-white text-[#2b2320] transition-colors duration-300 group-hover:border-[#2b2320] group-hover:bg-[#2b2320] group-hover:text-white">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Apparition>
      </section>

      {/* 3. Les catégories */}
      <section className="bg-[#f5f1ea] pb-16 pt-10 md:pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className={`${serif.className} text-center text-[2.1rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.7rem] md:text-[3.2rem]`}>
            {t.categoriesTitle}
          </h2>
          {/* Quatre par rangée dès 1280 px (Quentin, 09/10/2026 : « moins gros, on affiche plus »), trois sur tablette, deux
              sur téléphone : six photos en situation, même cadrage ; la dernière rangée se centre. Dès 1536 px, les six
              tiennent sur une seule rangée (Quentin, 11/10/2026, écran de 2000 px : « vraiment trop gros », cartes de 406 px). */}
          <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-10 sm:gap-x-6 md:mt-14 md:gap-y-14">
            {categories.map((c, i) => (
              <li key={c.id} className="basis-[calc(50%-0.5rem)] sm:basis-[calc(50%-0.75rem)] md:basis-[calc(33.333%-1rem)] xl:basis-[calc(25%-1.125rem)] 2xl:basis-[calc(16.666%-1.25rem)]">
                <Apparition retard={(i % 4) * 110}>
                  <CarteCategorie categorie={c} locale={locale} serre sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 17vw" />
                </Apparition>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center md:mt-14">
            <Link href={`/${locale}/artisanat`} className="lien-fleche text-[#2b2320]">
              {locale === "fr" ? "Toute la collection" : "The full collection"}
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Les avis — remplir `testimonials` dès qu'il y a de vrais retours clients. */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-24">
        <Apparition className="mx-auto max-w-5xl">
          <h2 className={`${serif.className} text-center text-[2.1rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.7rem]`}>
            {t.testimonialsTitle}
          </h2>

          {testimonials.length > 0 ? (
            <div className="mt-12 grid gap-12 md:grid-cols-3">
              {testimonials.map((review) => (
                <blockquote key={review.author} className="text-center">
                  <p className={`${serif.className} text-lg italic leading-relaxed text-[#2b2320]`}>
                    « {review.quote} »
                  </p>
                  <footer className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#6f6357]">
                    {review.author}
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <p className="mx-auto mt-6 max-w-xl text-center text-[17px] leading-[1.5] text-[#5c5140]">
              {ficheGoogle ? t.testimonialsNoteGoogle : t.testimonialsNote}
            </p>
          )}

          {/* Les deux pages de fond (zone desservie, questions fréquentes)
              se rejoignent d'ici : sans lien, personne ne les trouve. */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
            {/* Les avis restent sur la fiche Google : ni note recopiée, ni
                balisage d'avis sur le site. Le lien n'apparaît qu'une fois
                l'adresse de la fiche renseignée (NEXT_PUBLIC_ATELIER_GOOGLE). */}
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
            {[
              { href: `/${locale}/realisations`, label: t.testimonialsCta },
              { href: `/${locale}/zone-intervention`, label: dict.nav.zone },
              { href: `/${locale}/faq`, label: dict.nav.faq },
            ].map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="lien-fleche py-2 text-[#2b2320]"
              >
                {lien.label}
              </Link>
            ))}
          </div>
        </Apparition>
      </section>

      {/* 5. Le texte que lisent les moteurs de recherche ET les visiteurs, tout en bas : ce que fait l'atelier, comment ça
          se passe, où il intervient (texte de la conversation Tarifs, 07/10/2026 : l'accueil doit garder assez de texte
          visible pour Google — rien de replié ni de caché). Puis les liens vers chaque fabrication. */}
      <section id="texte-atelier" className="border-t border-[#e5ddd3] bg-white px-6 py-16 md:py-24">
        <Apparition className="mx-auto max-w-6xl">
          <h2 className={`${serif.className} max-w-3xl text-[1.9rem] leading-[1.08] tracking-[-0.016em] text-[#2b2320] sm:text-[2.3rem] lg:text-[2.8rem]`}>{seoBlocs.titre}</h2>
          {/* Le premier bloc (sans titre) est l'introduction : large, en tête. Les autres sont des rubriques en colonnes sur ordinateur. */}
          {seoBlocs.blocs.filter((bloc) => !("h3" in bloc && bloc.h3)).map((bloc, i) => (
            <div key={`intro-${i}`} className="mt-6 max-w-4xl">
              {bloc.paragraphes.map((paragraphe, j) => (
                <p key={j} className={`${j ? "mt-4" : ""} text-[17px] leading-[1.65] text-[#3a312a] md:text-[19px]`}>
                  {paragraphe}
                </p>
              ))}
            </div>
          ))}
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {seoBlocs.blocs.filter((bloc) => "h3" in bloc && bloc.h3).map((bloc, i) => (
              <div key={i} className="border-t border-[#2b2320]/20 pt-5">
                <h3 className={`${serif.className} text-[1.35rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.5rem]`}>{"h3" in bloc ? bloc.h3 : ""}</h3>
                {bloc.paragraphes.map((paragraphe, j) => (
                  <p key={j} className={`${j ? "mt-3" : "mt-3"} text-[15.5px] leading-[1.65] text-[#4a4038]`}>
                    {paragraphe}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <h3 className="surtitre mt-14 border-t border-[#2b2320]/20 pt-8">{t.seoLinksTitle}</h3>
          <ul className="mt-5 grid gap-x-8 gap-y-3 text-[16px] sm:grid-cols-2 lg:grid-cols-3">
            {[
              "/metallier-saumur",
              "/artisanat/famille/garde-corps",
              "/garde-corps-fenetre-normes",
              "/artisanat/verification-garde-corps",
              "/garde-corps-balcon-terrasse",
              "/artisanat/escalier-limon-central",
              "/escalier-limon-central-prix-normes",
              "/artisanat/verrieres",
              "/artisanat/tables",
              "/bois-massif",
              "/toiles-tendues",
              "/artisanat/sculptures",
              "/soudure-reparations",
              "/devis",
              "/rendez-vous",
              "/zone-intervention",
            ].map((chemin, i) => (
              <li key={chemin}>
                <Link href={`/${locale}${chemin}`} className="text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320]">
                  {t.seoLinks[i]}
                </Link>
              </li>
            ))}
          </ul>
        </Apparition>
      </section>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="dark" />
    </div>
  );
}
