import type { Metadata } from "next";
import { compteConfigure } from "@/lib/compte-jetons";
import { commandesOuvertes } from "@/lib/entreprise";
import { textesOuverture } from "@/lib/ouverture";
import Link from "next/link";
import { Visuel } from "@/components/visuel";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { getProduct, products, prixParOutil, productLocalise } from "@/lib/products";
import { disponibiliteGoogle, fourchetteGoogle, prixAfficheFiche, textePrixDescription } from "@/lib/donnees-google";
import { fourchetteGC, prixAppelGC, prixDepart } from "@/lib/prix-garde-corps.server";
import { ProductView } from "@/components/product-view";
import { ProductTail } from "@/components/product-tail";
import { MembraneAnimee } from "@/components/photo-plafond-anime";
import {
  metadataPage,
  descriptionTient,
  jsonLdProduit,
  jsonLdFilAriane,
  scriptJsonLd,
  ATELIER,
} from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { hoverZoom, hoverZoomSubtle, prixAffiche } from "@/lib/ui";
import { Apparition } from "@/components/apparition";

/**
 * Le bandeau « Livraison » d'une pièce qui n'a encore aucun prix (sur devis,
 * sans visite de l'atelier) : le texte habituel promet un prix qui s'affiche
 * sur la fiche dès le code postal, ce qui n'arrive pas ici. Même règle de
 * livraison (90 € au maximum, voir src/lib/deplacement.ts), dite autrement.
 */
const LIVRAISON_SUR_DEVIS = {
  fr: "Nous livrons partout en France métropolitaine, par transporteur, 90 € au maximum. Si vous préférez, l'atelier vient livrer et poser la pièce lui-même, sur un seul trajet depuis Saumur. Le prix de la livraison ou de la pose est écrit sur votre devis.",
  en: "We deliver anywhere in mainland France by carrier, €90 at most. If you prefer, the workshop delivers and fits the piece itself, in a single trip from Saumur. The delivery or fitting price is written on your quote.",
} as const;

/**
 * Les titres en grand : la ponctuation haute (« ? », « : »…) et l'unité d'une
 * cote ne partent jamais seules à la ligne (« 230 × 210 cm », « mur à mur ? »).
 * Le texte ne change pas, seules ces espaces deviennent insécables.
 */
const sansVeuve = (texte: string) =>
  texte
    .replace(/ ([?!:;»])/g, "\u00a0$1")
    .replace(/(\d) ([×x]) (\d)/g, "$1\u00a0$2\u00a0$3")
    .replace(/(\d) (cm|mm|m|km|€|K)(?![\p{L}])/gu, "$1\u00a0$2");

/**
 * Les photos à membrane sont carrées ; les blocs éditoriaux les affichent dans
 * un cadre 4/3 en « cover », qui rogne 12,5 % en haut et en bas. On décale donc
 * la membrane d'autant, sinon la lumière ne tomberait pas sur la toile.
 */
function membraneEn43(box: { left: string; top: string; width: string; height: string }) {
  const pc = (v: string) => parseFloat(v);
  return {
    left: box.left,
    width: box.width,
    top: `${((pc(box.top) - 12.5) / 0.75).toFixed(2)}%`,
    height: `${(pc(box.height) / 0.75).toFixed(2)}%`,
  };
}

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/artisanat/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const fiche = getProduct(slug);
  if (!fiche) return {};
  // Ce que lit Google : le nom et l'accroche doivent être dans la langue de la page.
  const product = productLocalise(fiche, locale);

  // Le prix écrit de la même façon dans le résultat de recherche et sur la
  // page : Google affichait « From €2 870 » là où la page disait « 2 870 € ».
  // Et seulement le prix que la fiche affiche (prixAfficheFiche, le même que
  // ProductView et le JSON-LD), avec ses mots : le garde-corps donne son prix
  // d'appel, calculé par l'outil sur le serveur ; l'escalier, sans prix sur
  // sa fiche, « Sur devis, pose comprise. ».
  const prixFiche = prixAfficheFiche(product, prixAppelGC(product));
  // Le titre porte la pièce, la matière et la ville : c'est ce que les gens
  // tapent. Surtout pas l'accroche commerciale, trop longue pour les soixante
  // signes que Google affiche — elle se faisait couper en plein milieu, et le
  // titre se réduisait alors au nom du modèle, que personne ne cherche.
  const title =
    product.seoTitre ??
    (product.seoMots ? `${product.name} — ${product.seoMots}` : `${product.name} — ${product.tagline}`);
  // Une fiche dont l'accroche est trop longue pour tenir avec le prix et le
  // suffixe donne sa propre description (voir Product.seoDescription) ; le
  // prix, lui, vient toujours du catalogue. Si la phrase de la fiche ne tient
  // pas dans les 155 signes de Google (il la couperait, prix compris), sa
  // forme courte : même prix, moins de mots.
  const assembler = (depuis: string) =>
    product.seoDescription ? `${product.seoDescription} ${depuis}` : `${product.tagline} ${depuis} ${dict.seo.produitSuffixe}`;
  const complete = assembler(textePrixDescription(product, prixFiche, locale));
  const description = descriptionTient(complete) ? complete : assembler(textePrixDescription(product, prixFiche, locale, true));

  return metadataPage({
    locale,
    chemin: `/artisanat/${product.slug}`,
    title,
    description,
    // Une photo carrée se ferait rogner d'un tiers dans un aperçu de partage :
    // les fiches concernées ont leur déclinaison 1200 × 630.
    image: product.imagePartage ?? product.images[0]?.src,
    motsCles: [
      `${product.name} ${ATELIER.ville}`,
      locale === "fr" ? `${product.name} sur mesure` : `made-to-measure ${product.name}`,
      `${product.name} ${ATELIER.departement}`,
      ...(product.motsCles ?? []),
    ],
  });
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/artisanat/[slug]">) {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.artisanat;

  const fiche = getProduct(slug);
  if (!fiche) notFound();
  // Tout ce qui vient du catalogue passe dans la langue du visiteur : nom,
  // accroche, blocs descriptifs, caractéristiques, tailles et matières.
  const product = productLocalise(fiche, locale);

  /** Une carte de « Autres pièces de l'atelier » : une fiche, ou une page (les verrières). */
  type Carte = {
    href: string;
    nom: string;
    image?: { src: string; alt: string; bg?: string; fit?: "cover" | "contain"; position?: string };
    prix: string;
  };
  const carteFiche = (p: (typeof products)[number]): Carte => {
    const fichePlus = productLocalise(p, locale);
    const depart = prixDepart(fichePlus);
    // Le garde-corps : le même prix d'appel que sa fiche (« dès 300 € pour une fenêtre de 100 cm »).
    const appel = prixAppelGC(fichePlus);
    return {
      href: `/${locale}/artisanat/${fichePlus.slug}`,
      nom: fichePlus.name,
      image: fichePlus.images[0],
      prix: appel
        ? locale === "fr"
          ? `Dès ${prixAffiche(appel.prix, locale)} pour une fenêtre de ${appel.largeurMm / 10}\u00a0cm`
          : `From ${prixAffiche(appel.prix, locale)} for a ${appel.largeurMm / 10} cm window`
        : depart === null
          ? t.onQuote
          : `${t.from} ${prixAffiche(depart, locale)}`,
    };
  };
  // Le garde-corps et l'escalier renvoient l'un vers l'autre, puis vers les
  // verrières : trois ouvrages du bâtiment, mesurés et posés par l'atelier.
  // Ailleurs, on reste dans le même univers : une lumière ne renvoie pas vers
  // une table.
  const ouvrage = product.famille === "garde-corps" || product.famille === "escalier";
  const memeUnivers = products.filter(
    (p) => p.slug !== product.slug && p.category === product.category
  );
  const related: Carte[] = ouvrage
    ? [
        ...products
          .filter((p) => p.slug !== product.slug && (p.famille === "garde-corps" || p.famille === "escalier"))
          .map(carteFiche),
        {
          href: `/${locale}/artisanat/verrieres`,
          nom: dict.verrieres.title,
          image: { src: "/images/verriere-interieure.jpg", alt: dict.verrieres.photoAlt, fit: "cover" as const, position: "50% 45%" },
          prix: t.onQuote,
        },
      ].slice(0, 3)
    : (memeUnivers.length > 0 ? memeUnivers : products.filter((p) => p.slug !== product.slug))
        .slice(0, 3)
        .map(carteFiche);
  /** La lumière a sa propre boutique : le fil d'Ariane y ramène. */
  const boutique =
    product.category === "lumiere" ? `/${locale}/toiles-tendues` : `/${locale}/artisanat`;
  // « Boutique », comme sur /artisanat/sculptures : un seul libellé pour la
  // même page dans tout le site, sinon Google voit deux fils d'Ariane différents.
  const categorie =
    product.category === "lumiere" ? dict.hub.lightingLabel : t.breadcrumbShop;
  // Les tables ont leur page : Accueil > La collection > Tables > le modèle.
  const estTable = product.famille === "table-interieur" || product.famille === "table-exterieur";

  /** « À voir aussi » : les pages qui complètent cette fiche. */
  const liensUtiles: { href: string; label: string }[] = [
    ...(estTable ? [{ href: `/${locale}/artisanat/tables`, label: dict.liens.toutesTables }] : []),
    // Le garde-corps de fenêtre : la règle (hauteur, vides) et des exemples calculés, sur leur propre page.
    ...(product.famille === "garde-corps"
      ? [{ href: `/${locale}/garde-corps-fenetre-normes`, label: dict.liens.normesGc }]
      : []),
    ...(estTable || ouvrage ? [{ href: `/${locale}/bois-massif`, label: dict.liens.boisLong }] : []),
    ...(product.category === "lumiere"
      ? [{ href: `/${locale}/toiles-tendues#plafond-tendu`, label: dict.liens.plafondTendu }]
      : []),
    ...(ouvrage || product.category === "lumiere"
      ? [{ href: `/${locale}/zone-intervention`, label: dict.liens.zonePose }]
      : []),
  ];
  const hasImages = product.images.length > 0;
  /** Le titre d'une section sous la fiche, le même dessin que sur l'accueil. */
  const titreSection = `${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[3rem]`;

  /** Images des blocs éditoriaux : on pioche dans les coloris pour ne pas répéter la même photo. */
  const sectionImages: {
    src: string;
    alt: string;
    /** Fond uni de studio : la photo se montre entière, sur ce fond. */
    bg?: string;
    fit?: "cover" | "contain";
    glow?: { box: { left: string; top: string; width: string; height: string }; clip: string };
  }[] = [
    ...product.images,
    ...(product.photosDescriptif ?? []),
    ...(product.fabrics ?? [])
      .filter((f) => f.image && !product.images.some((img) => img.src === f.image))
      .map((f) => ({ src: f.image as string, alt: `${product.name} — ${f.label}` })),
  ];

  /** Achetable en ligne : le bas de page renvoie alors au bouton d'achat. */
  const achetable = product.orderMode === "cart";

  /**
   * Ce que Google reçoit (src/lib/donnees-google.ts) : le prix que la fiche
   * affiche (prixAfficheFiche, le même calcul que ProductView), sinon aucune
   * offre — et alors aucun bloc Product, que Google jugerait non valide. La
   * disponibilité n'est envoyée que lorsque le panier encaisse. Le garde-corps
   * a le haut de sa fourchette, calculé par l'outil.
   */
  const prixAppel = prixAppelGC(product);
  const fourchette = fourchetteGoogle(product, prixAfficheFiche(product, prixAppel), prixParOutil(product) ? fourchetteGC() : null);
  const disponibilite = disponibiliteGoogle({ achetable, ouvert: commandesOuvertes() });
  /** Une pièce sans aucun prix au catalogue (bandeau « Livraison » plus bas). */
  const prixDepartFiche = prixDepart(product);

  return (
    <div>
      {/* Fiche produit et fil d'Ariane pour les moteurs : c'est ce qui fait
          apparaître le prix et le fil de navigation dans les résultats. Pas de
          prix affiché sur la fiche : pas de bloc Product, le fil seulement. */}
      {fourchette && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={scriptJsonLd(
            jsonLdProduit({
              locale,
              chemin: `/artisanat/${product.slug}`,
              nom: product.name,
              description: `${product.tagline} ${product.sections[0]?.body ?? ""}`.trim(),
              images: product.images.map((img) => img.src),
              fourchette,
              disponibilite,
            })
          )}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          /* Les deux premières étapes pointaient vers la même adresse :
             Google jetait le fil entier et n'affichait aucun chemin. */
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            {
              nom: categorie,
              chemin: product.category === "lumiere" ? "/toiles-tendues" : "/artisanat",
            },
            ...(estTable ? [{ nom: dict.tables.title, chemin: "/artisanat/tables" }] : []),
            { nom: product.name, chemin: `/artisanat/${product.slug}` },
          ])
        )}
      />

      {/* 1. Fiche : galerie pleine hauteur + colonne d'options, bord à bord.
          Ancre « acheter » : c'est ici que remonte le bouton du bas de page. */}
      <div id="acheter" className="scroll-mt-0">
        <ProductView
          compteOuvert={compteConfigure()}
          prixAppel={prixAppel}
          // Avant l'ouverture des commandes : s'inscrire à la place de payer.
          ouverture={commandesOuvertes() ? undefined : { t: textesOuverture(dict.panier), contactEmail: dict.contact.email }}
          product={product}
          t={t}
          locale={locale}
          filAriane={{
            label: dict.nav.breadcrumb,
            etapes: [
              { nom: dict.nav.home, href: `/${locale}` },
              { nom: categorie, href: boutique },
              ...(estTable ? [{ nom: dict.tables.title, href: `/${locale}/artisanat/tables` }] : []),
            ],
          }}
        />
      </div>

      {/* Sous la fiche, façon Apple (Quentin, 06/10/2026 : « plus premium, moins IA ») : de grands titres, des textes
          lisibles, des sections qui respirent, blanc et papier en alternance comme sur l'accueil. */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-28">
        {/* 2. Blocs éditoriaux */}
        <div className="flex flex-col gap-20 md:gap-32">
          {product.sections.map((section, i) =>
            hasImages ? (
              <div key={section.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16 lg:gap-20">
                <Apparition className={i % 2 === 1 ? "md:order-2" : ""}>
                  {/* Une photo de studio (fond uni) se montre entière dans le
                      cadre ; une photo d'ambiance le remplit. */}
                  <div
                    className={`relative aspect-[4/3] overflow-hidden rounded-[24px] ${hoverZoomSubtle}`}
                    style={{ backgroundColor: section.image ? "#ffffff" : (sectionImages[(i + 1) % sectionImages.length].bg ?? "#ffffff") }}
                  >
                    <Visuel
                      locale={locale}
                      src={section.image ?? sectionImages[(i + 1) % sectionImages.length].src}
                      alt={section.image ? section.title : sectionImages[(i + 1) % sectionImages.length].alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 560px"
                      className={
                        !section.image && sectionImages[(i + 1) % sectionImages.length].fit === "contain"
                          ? "object-contain p-4"
                          : "object-cover"
                      }
                    />
                    {(() => {
                      if (section.image) return null;
                      const glow = sectionImages[(i + 1) % sectionImages.length].glow;
                      if (!glow) return null;
                      return <MembraneAnimee box={membraneEn43(glow.box)} clip={glow.clip} />;
                    })()}
                  </div>
                </Apparition>
                <Apparition retard={110}>
                  <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] text-[#2b2320] sm:text-[2.5rem] md:text-[2.1rem] lg:text-[2.5rem]`}>
                    {sansVeuve(section.title)}
                  </h2>
                  <p className="mt-5 text-[16px] leading-[1.55] text-[#4a4038] md:mt-6 md:text-[17px]">{section.body}</p>
                </Apparition>
              </div>
            ) : (
              <Apparition key={section.title} className="rounded-[28px] bg-[#f5f1ea] px-6 py-14 sm:px-10 md:px-16 md:py-20">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className={titreSection}>{sansVeuve(section.title)}</h2>
                  <p className="mt-6 text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">{section.body}</p>
                </div>
              </Apparition>
            )
          )}
        </div>
      </div>

      {/* 3. Artisanat français */}
      <section className="bg-[#2b2320] px-6 py-16 text-white md:py-28">
        <Apparition className="mx-auto max-w-3xl text-center">
          <h2 className={`${serif.className} text-balance text-[2rem] leading-[1.05] tracking-[-0.018em] sm:text-[2.5rem] md:text-[3rem]`}>
            {sansVeuve(t.craftBandTitle)}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.5] text-white/85 md:text-[19px]">{t.craftBandBody}</p>
        </Apparition>
      </section>

      {/* 4. Livraison */}
      <section className="bg-[#f5f1ea] px-6 py-16 md:py-28">
        <Apparition className="mx-auto max-w-3xl text-center">
          <h2 className={titreSection}>{sansVeuve(t.deliveryTitle)}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.55] text-[#4a4038] md:text-[17px]">
            {prixDepartFiche === null && !product.priseDeCotes
              ? LIVRAISON_SUR_DEVIS[locale]
              : t.deliveryBody}
          </p>
        </Apparition>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        {/* 5. Descriptif : sur grand écran, le titre et les pages utiles à gauche, les caractéristiques à droite. */}
        <section
          id="descriptif"
          className="grid scroll-mt-24 gap-8 py-16 md:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8"
        >
          <Apparition className="lg:col-start-1 lg:row-start-1">
            <h2 className={titreSection}>{t.descriptifTitle}</h2>
          </Apparition>
          <Apparition retard={110} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <dl className="divide-y divide-[#e8e1d8] border-y border-[#e8e1d8]">
              {product.specs.map((spec) => (
                <div key={spec.label} className="grid gap-1 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                  <dt className="text-[15px] text-[#6f6357] md:text-[16px]">{spec.label}</dt>
                  <dd className="text-[16px] leading-[1.55] text-[#2b2320] md:text-[17px]">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </Apparition>
          {liensUtiles.length > 0 && (
            <nav
              aria-label={dict.liens.titre}
              className="flex flex-wrap gap-x-8 gap-y-2 lg:col-start-1 lg:row-start-2 lg:flex-col lg:items-start lg:self-start"
            >
              {liensUtiles.map((l) => (
                <Link key={l.href} href={l.href} className="lien-fleche py-1 text-[#2b2320]">
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </section>

        {/* 6. Délai */}
        <section className="border-t border-[#e8e1d8] pt-16 text-center md:pt-28">
          <Apparition className="mx-auto max-w-3xl">
            <h2 className={titreSection}>{sansVeuve(t.delaiTitle)}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.5] text-[#4a4038] md:text-[19px]">{t.delaiBody}</p>
            {/* Le bouton doit tenir sa promesse : une pièce du catalogue remonte
                au choix des dimensions et au bouton d'achat ; une pièce qui ne se
                vend que sur devis mène au formulaire de contact. */}
            <Link
              href={achetable ? "#acheter" : `/${locale}/contact?produit=${product.slug}`}
              className="btn-plein mt-10"
            >
              {achetable ? t.delaiCta : t.delaiCtaDevis}
            </Link>
          </Apparition>
        </section>
      </div>

      <ProductTail
        dict={dict}
        locale={locale}
        testimonial={product.testimonial}
        lumiere={product.category === "lumiere"}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* 11. Vous aimerez aussi */}
        {related.length > 0 && (
          <div className="border-t border-[#e8e1d8] py-16 md:py-28">
            <Apparition>
              <h2 className={titreSection}>{t.relatedTitle}</h2>
            </Apparition>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
              {related.map((carte, i) => (
                <Apparition key={carte.href} retard={(i % 4) * 110}>
                  <Link href={carte.href} className="group flex flex-col gap-5">
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${hoverZoom}`}
                      style={{ backgroundColor: carte.image?.bg ?? "#ffffff" }}
                    >
                      {carte.image ? (
                        <Visuel
                          locale={locale}
                          src={carte.image.src}
                          alt={carte.image.alt}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          style={carte.image.position ? { objectPosition: carte.image.position } : undefined}
                          className={
                            carte.image.fit === "contain" ? "object-contain p-4" : "object-cover"
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#f1ece4] p-6">
                          <span className={`${serif.className} text-center text-2xl text-[#5c5140]`}>
                            {carte.nom}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>
                        {carte.nom}
                      </h3>
                      <p className="mt-2 text-[16px] text-[#5c5140] md:text-[17px]">{carte.prix}</p>
                    </div>
                  </Link>
                </Apparition>
              ))}
            </div>
            <Link
              href={`/${locale}/artisanat`}
              className="mt-12 inline-block py-1 text-[16px] font-medium text-[#2b2320] hover:underline hover:underline-offset-4 md:text-[17px]"
            >
              {t.backToCatalogue}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
