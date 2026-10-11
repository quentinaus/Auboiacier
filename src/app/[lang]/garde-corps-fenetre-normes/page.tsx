import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, jsonLdArticle, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { getProduct, productLocalise } from "@/lib/products";
import {
  ChiffrageIndisponible,
  configurationGC,
  prixAppelGC,
  reponsePrixGC,
  SLUG_GC,
} from "@/lib/prix-garde-corps.server";
import {
  ALLEGE_SANS_OBLIGATION_MM,
  HAUTEUR_LOI_GC_MM,
  JOUR_GC_MM,
  JOUR_MINI_GC_MM,
  MAIN_COURANTE_MM,
  MARGE_BOULE_GC_MM,
  SPHERE_GC_MM,
  SPHERE_HAUT_GC_MM,
  Z_ESCALADE_GC_MM,
  Z_SPHERE_GC_MM,
  diametreRosaceGC,
  seuilsFormeGC,
  type MainCouranteGC,
  type MainsPrixGC,
} from "@/lib/garde-corps";
import { RAYON_MAX_KM } from "@/lib/deplacement";
import { remplir } from "@/lib/vitrine";
import { prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { SchemaFenetre } from "@/components/schema-fenetre";
import { OuvrirCotesGC } from "@/components/ouvrir-cotes-gc";

/**
 * Le guide « Garde-corps de fenêtre : hauteur et normes ». La fiche sert à
 * configurer et à acheter ; cette page sert à comprendre la règle : quand un
 * garde-corps est obligatoire, à quelle hauteur poser la main courante, quels
 * vides il peut laisser, et ce que cela donne, fenêtre par fenêtre.
 *
 * AUCUN CHIFFRE N'EST TAPÉ ICI NI DANS LE DICTIONNAIRE (bloc « normesGc ») :
 * les valeurs de la règle viennent de src/lib/garde-corps.ts, chacune
 * comparée à l'outil de plans par tests/garde-corps.test.ts ; les exemples
 * et leurs prix sont calculés au rendu par reponsePrixGC, la fonction même de
 * /api/prix-garde-corps — la page et la fiche donnent le même résultat. Sans
 * clé du chiffrage, la forme vient de l'outil et la cellule du prix renvoie à
 * la fiche : rien n'est inventé.
 *
 * Données structurées : le fil d'Ariane (visible plus bas) et l'Article du
 * guide, signé par l'atelier tant que Quentin n'a pas relu le texte (plan de
 * référencement, C9). Ni FAQ balisée (src/lib/faq-balisees.ts), ni produit :
 * il reste sur la fiche.
 */

/** Les deux dates du guide : celles que la page affiche et que Google lit (Article). AAAA-MM-JJ. */
const DATE_PUBLICATION = "2026-10-06";
const DATE_MODIFICATION = "2026-10-10";

/** La fenêtre des exemples : 1 000 mm de large, en étage, aux options de départ de la fiche. À AJUSTER par Quentin. */
const LARGEUR_EXEMPLE_MM = 1000;
/** Les hauteurs d'appui du tableau : de la porte-fenêtre à la fenêtre haute. À AJUSTER par Quentin. */
const ALLEGES_EXEMPLES_MM = [0, 300, 500, 700, 850, 950] as const;
/** L'exemple dessiné à côté de la règle de hauteur : le cadre commence sous la zone d'escalade, des barreaux ferment le bas. */
const ALLEGE_CROQUIS_MM = 500;
/** L'exemple des prix par main courante et par rosace. */
const ALLEGE_MAINS_MM = 700;

/** Ce que la page montre d'un exemple. */
type Exemple = {
  allegeMm: number;
  obligatoire: boolean;
  forme: "garde-corps" | "main-seule" | "rien";
  hauteurMm: number;
  jourMm: number;
  dessin: { croix: number; traverse: boolean; soubassementMm: number; seuls: boolean; renfort: boolean; patte: number } | null;
  /** Le prix d'une pièce, comme sur la fiche ; null sans clé du chiffrage. */
  prix: number | null;
  /** Le prix d'une pièce avec chaque main courante qui convient. */
  mains: MainsPrixGC;
};

/** Un exemple, calculé comme la fiche le calculerait pour ces cotes. */
function calculerExemple(allegeMm: number, essence: MainCouranteGC): Exemple | null {
  const releve = { largeurMm: LARGEUR_EXEMPLE_MM, allegeMm, enEtage: true, fenetreMm: 0 };
  try {
    // Les options absentes sont celles du modèle (noir, fleur, croix) : celles que la fiche montre d'abord.
    const r = reponsePrixGC({ releve, essence, quantite: 1 });
    if (r?.ok) {
      return {
        allegeMm,
        obligatoire: r.obligatoire,
        forme: "garde-corps",
        hauteurMm: r.hauteurMm,
        jourMm: r.jourMm,
        dessin: { croix: r.croix, traverse: r.traverse, soubassementMm: r.soubassementMm, seuls: r.seuls, renfort: r.renfort, patte: r.patte },
        prix: r.prix,
        mains: r.mains,
      };
    }
    if (r && (r.raison === "barre-appui" || r.raison === "sans-garde-corps")) {
      return {
        allegeMm,
        obligatoire: r.obligatoire,
        forme: r.raison === "barre-appui" ? "main-seule" : "rien",
        hauteurMm: r.hauteurMm,
        jourMm: r.jourMm,
        dessin: null,
        prix: null,
        mains: {},
      };
    }
    if (r) return null;
  } catch (erreur) {
    if (!(erreur instanceof ChiffrageIndisponible)) throw erreur;
  }
  // Sans clé du chiffrage : la forme seule, par l'outil (elle ne demande aucun coût).
  const c = configurationGC(releve, essence);
  if (!c) return null;
  if (c.ok) {
    return {
      allegeMm,
      obligatoire: c.obligatoire,
      forme: "garde-corps",
      hauteurMm: c.hauteurMm,
      jourMm: c.jourMm,
      dessin: { croix: c.croix, traverse: c.traverse, soubassementMm: c.soubassementMm, seuls: c.seuls, renfort: c.renfort, patte: c.patte },
      prix: null,
      mains: {},
    };
  }
  if (c.raison !== "barre-appui" && c.raison !== "sans-garde-corps") return null;
  return {
    allegeMm,
    obligatoire: c.obligatoire,
    forme: c.raison === "barre-appui" ? "main-seule" : "rien",
    hauteurMm: c.hauteurMm,
    jourMm: c.jourMm,
    dessin: null,
    prix: null,
    mains: {},
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/garde-corps-fenetre-normes">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/garde-corps-fenetre-normes",
    title: dict.seo.normesGc.title,
    description: dict.seo.normesGc.description,
    image: "/images/garde-corps/fenetre-pose.jpg",
  });
}

export default async function NormesGardeCorpsPage({
  params,
}: PageProps<"/[lang]/garde-corps-fenetre-normes">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.normesGc;
  const a = dict.artisanat;

  const modele = getProduct(SLUG_GC)!;
  const gc = productLocalise(modele, locale);
  const fiche = `/${locale}/artisanat/${SLUG_GC}`;

  // Les options de départ de la fiche : le bois par défaut (rainuré), la première teinte, la première rosace.
  const essence = (gc.boisParDefaut ?? gc.woods[0].id) as MainCouranteGC;
  const bois = gc.woods.find((w) => w.id === essence)!;
  const teinte = gc.metals[0];
  const rosace = gc.fabrics?.[0];

  const nombre = (n: number) => n.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB");
  const mm = (n: number) => `${nombre(n)} mm`;
  const seuils = seuilsFormeGC();
  // Les chiffres de la règle, tous lus dans le code (src/lib/garde-corps.ts, deplacement.ts, products.ts).
  const valeurs: Record<string, string> = {
    seuil: mm(ALLEGE_SANS_OBLIGATION_MM),
    loi: mm(HAUTEUR_LOI_GC_MM),
    cible: mm(MAIN_COURANTE_MM),
    jour: mm(JOUR_GC_MM),
    jourMini: mm(JOUR_MINI_GC_MM),
    sphere: mm(SPHERE_GC_MM),
    sphereHaut: mm(SPHERE_HAUT_GC_MM),
    zSphere: mm(Z_SPHERE_GC_MM),
    marge: mm(MARGE_BOULE_GC_MM),
    escalade: mm(Z_ESCALADE_GC_MM),
    mainSeule: mm(seuils.mainSeuleMm),
    rien: mm(seuils.rienMm),
    largeur: mm(LARGEUR_EXEMPLE_MM),
    rayonMax: `${RAYON_MAX_KM} km`,
    bois: bois.label,
    teinte: teinte.label,
    rosace: rosace?.label ?? "",
  };
  const texte = (modeleTexte: string, autres: Record<string, string> = {}) => remplir(modeleTexte, { ...valeurs, ...autres });

  const exemples = ALLEGES_EXEMPLES_MM.map((allegeMm) => calculerExemple(allegeMm, essence)).filter(
    (e): e is Exemple => e !== null
  );
  const croquis = calculerExemple(ALLEGE_CROQUIS_MM, essence);
  const pourMains = calculerExemple(ALLEGE_MAINS_MM, essence);
  // Le prix d'appel de la fiche (« Dès … pour une fenêtre de … cm de large »), le même calcul (prixAppelGC).
  const appel = prixAppelGC(modele);
  // Le délai et la livraison tels que la fiche les écrit (« Fabrication », « Livraison » ; « Lead time », « Delivery »).
  const livraison = gc.specs.find((s) => s.label === "Livraison" || s.label === "Delivery");
  const fabrication = gc.specs.find((s) => s.label === "Fabrication" || s.label === "Lead time");

  /** Le dessin d'un exemple, en mots : « 2 croix, traverse au milieu, barreaux en bas ». */
  const dessinEnMots = (d: NonNullable<Exemple["dessin"]>) =>
    d.seuls
      ? t.dessinSeuls
      : [
          remplir(d.croix === 1 ? t.dessinCroixUne : t.dessinCroix, { n: String(d.croix) }),
          d.traverse ? t.dessinTraverse : null,
          d.soubassementMm > 0 ? t.dessinBarreauxBas : null,
        ]
          .filter(Boolean)
          .join(", ");

  /** Les mains courantes de l'exemple, dans l'ordre de la fiche : chêne rainuré, chêne sur fer plat, acier plat, profilé. */
  const mains = pourMains
    ? (Object.entries(pourMains.mains) as [MainCouranteGC, number][])
        .filter(([id]) => id === essence || id === `${essence}-plat` || id === "acier" || id === "profil")
        .map(([id, prix]) => ({ id, label: gc.woods.find((w) => w.id === id)?.label ?? id, prix }))
    : [];
  /**
   * Le prix du garde-corps complet avec chaque rosace, à la fenêtre des mains courantes, par le moteur de la fiche.
   * Jamais le supplément du catalogue seul : avec une autre rosace, le moteur peut proposer un autre dessin (une rosace
   * plus petite laisse de plus grands vides), et le prix change avec lui, d'un écart qui varie d'une fenêtre à l'autre.
   * Sans clé du chiffrage, ou sur un cadre à barreaux seuls (pas de croix, donc pas de rosace), la liste disparaît.
   */
  const rosaces = (gc.fabrics ?? []).flatMap((f) => {
    const releve = { largeurMm: LARGEUR_EXEMPLE_MM, allegeMm: ALLEGE_MAINS_MM, enEtage: true, fenetreMm: 0 };
    try {
      const r = reponsePrixGC({ releve, essence, fabricId: f.id, quantite: 1 });
      if (!r?.ok || r.seuls) return [];
      const dessin = dessinEnMots({ croix: r.croix, traverse: r.traverse, soubassementMm: r.soubassementMm, seuls: r.seuls, renfort: r.renfort, patte: r.patte });
      return [{ id: f.id, label: f.label, prix: r.prix, dessin }];
    } catch (erreur) {
      if (!(erreur instanceof ChiffrageIndisponible)) throw erreur;
      return [];
    }
  });

  const lien =
    "inline-block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] underline underline-offset-8 hover:text-black";
  // Chiffres alignés (lining-nums) : les chiffres elzéviriens de la police faisaient lire « Po1-o12 » et « 1 ooo ».
  const titre2 = `${serif.className} text-2xl lining-nums text-[#2b2320]`;
  const corps = "mt-3 leading-relaxed text-[#4a4038]";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: t.title, chemin: "/garde-corps-fenetre-normes" },
          ])
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdArticle({
            locale,
            chemin: "/garde-corps-fenetre-normes",
            titre: t.h1,
            description: dict.seo.normesGc.description,
            datePublication: DATE_PUBLICATION,
            dateModification: DATE_MODIFICATION,
            image: "/images/garde-corps/fenetre-pose.jpg",
          })
        )}
      />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-10 md:pt-14">
          {/* Le fil d'Ariane visible : le même que celui balisé plus haut. */}
          <nav aria-label={dict.nav.breadcrumb} className="flex flex-wrap text-[11px] text-[#726757]">
            <Link href={`/${locale}`} className="hover:text-[#2b2320]">
              {dict.nav.home}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#2b2320]">{t.title}</span>
          </nav>

          <h1 className={`${serif.className} mt-6 text-3xl font-medium leading-tight tracking-tight md:text-4xl`}>
            {t.h1}
          </h1>
          <p className="mt-4 leading-relaxed text-[#5c5140]">{t.intro}</p>
          <div className="mt-3 flex flex-wrap gap-x-8">
            <Link href={fiche} className={lien}>
              {t.introLien}
            </Link>
            <Link href={`/${locale}/artisanat/verification-garde-corps`} className={lien}>
              {dict.liens.verificationGc}
            </Link>
          </div>

          <div className="mt-12 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
            {/* 1. L'obligation. */}
            <section className="py-8">
              <h2 className={titre2}>{t.obligatoireTitle}</h2>
              <p className={corps}>{texte(t.obligatoireBody)}</p>
            </section>

            {/* 2. La hauteur : celle de la main courante, et le croquis du configurateur pour un exemple. */}
            <section className="py-8">
              <h2 className={titre2}>{t.hauteurTitle}</h2>
              <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_15rem]">
                <div>
                  <p className="leading-relaxed text-[#4a4038]">{texte(t.hauteurBody)}</p>
                  <p className={corps}>{texte(t.jourBody)}</p>
                  <p className={corps}>{t.allegeBody}</p>
                </div>
                {croquis?.forme === "garde-corps" && croquis.dessin && (
                  <figure className="mx-auto w-full max-w-[15rem]">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-[#e8e1d8] bg-white">
                      <SchemaFenetre
                        className="absolute inset-0 h-full w-full"
                        largeurMm={LARGEUR_EXEMPLE_MM}
                        largeurHautMm={LARGEUR_EXEMPLE_MM}
                        allegeMm={croquis.allegeMm}
                        croix={croquis.dessin.croix}
                        soubassementMm={croquis.dessin.soubassementMm}
                        traverse={croquis.dessin.traverse}
                        seuls={croquis.dessin.seuls}
                        renfort={croquis.dessin.renfort}
                        patte={croquis.dessin.patte}
                        rosaceMm={diametreRosaceGC(rosace?.id)}
                        teinteAcier={teinte.swatch}
                        locale={locale}
                        actif={null}
                        coteMainCourante
                        labels={{
                          largeur: a.gcSchemaLargeur,
                          allege: a.gcSchemaAllege,
                          fenetre: a.gcSchemaFenetre,
                          hauteur: a.gcSchemaHauteur,
                          mainCourante: t.croquisCote,
                          metre: remplir(a.gcSchemaMetre, { m: nombre(MAIN_COURANTE_MM) }),
                          interieur: a.gcSchemaInterieur,
                          jour: a.gcSchemaJour,
                        }}
                      />
                    </div>
                    <figcaption className="mt-2 text-xs leading-relaxed text-[#6f6357]">
                      {texte(t.croquisLegende, {
                        allege: mm(croquis.allegeMm),
                        hauteur: mm(croquis.hauteurMm),
                        jourEx: mm(croquis.jourMm),
                        // Le haut de la main courante, tel que le croquis le cote : l'appui, le jour, le garde-corps.
                        mainCourante: mm(croquis.allegeMm + croquis.jourMm + croquis.hauteurMm),
                      })}
                    </figcaption>
                  </figure>
                )}
              </div>
            </section>

            {/* 3. Les vides entre les barres, l'escalade, la rosace. */}
            <section className="py-8">
              <h2 className={titre2}>{t.videsTitle}</h2>
              <p className={corps}>{texte(t.videsBody)}</p>
              <p className={corps}>{texte(t.escaladeBody)}</p>
              <p className={corps}>{t.rosaceBody}</p>
              <p className="mt-4 border-l-2 border-[#d9cfc0] pl-4 text-sm leading-relaxed text-[#5c5140]">{t.videsNote}</p>
            </section>

            {/* 4. Les exemples calculés : le vrai atout de la page. */}
            <section className="py-8">
              <h2 className={titre2}>{texte(t.exemplesTitle)}</h2>
              <p className={corps}>{texte(t.exemplesIntro)}</p>
              {/* Un tableau sur grand écran ; sur téléphone, chaque ligne devient une carte, chaque cellule dit son titre. */}
              <table className="mt-8 w-full border-collapse text-left text-sm max-md:block">
                <thead className="max-md:hidden">
                  <tr className="border-b border-[#d9cfc0] align-bottom text-[11px] uppercase tracking-[0.1em] text-[#726757]">
                    <th scope="col" className="whitespace-nowrap py-3 pr-3 font-medium">{t.colAllege}</th>
                    <th scope="col" className="py-3 pr-3 font-medium">{t.colObligatoire}</th>
                    <th scope="col" className="whitespace-nowrap py-3 pr-3 font-medium">{t.colHauteur}</th>
                    <th scope="col" className="py-3 pr-3 font-medium">{t.colJour}</th>
                    <th scope="col" className="py-3 pr-3 font-medium">{t.colDessin}</th>
                    <th scope="col" className="whitespace-nowrap py-3 pr-3 font-medium">{t.colPrix}</th>
                    <th scope="col" className="py-3 font-medium">
                      <span className="sr-only">{t.ouvrir}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="max-md:block max-md:space-y-3">
                  {exemples.map((e) => {
                    const cellule =
                      "py-3 pr-3 align-top max-md:flex max-md:justify-between max-md:gap-4 max-md:py-1.5 max-md:pr-0 max-md:before:text-[11px] max-md:before:uppercase max-md:before:tracking-[0.14em] max-md:before:text-[#726757] max-md:before:content-[attr(data-titre)]";
                    return (
                      <tr
                        key={e.allegeMm}
                        className="border-b border-[#e8e1d8] max-md:block max-md:rounded-xl max-md:border max-md:px-4 max-md:py-3"
                      >
                        <th
                          scope="row"
                          data-titre={t.colAllege}
                          className={`${cellule} whitespace-nowrap font-medium tabular-nums text-[#2b2320]`}
                        >
                          {mm(e.allegeMm)}
                        </th>
                        <td data-titre={t.colObligatoire} className={`${cellule} whitespace-nowrap text-[#4a4038]`}>
                          {e.obligatoire ? t.oui : t.non}
                        </td>
                        <td data-titre={t.colHauteur} className={`${cellule} whitespace-nowrap tabular-nums text-[#4a4038]`}>
                          {e.forme === "garde-corps" ? mm(e.hauteurMm) : "—"}
                        </td>
                        <td data-titre={t.colJour} className={`${cellule} whitespace-nowrap tabular-nums text-[#4a4038]`}>
                          {e.forme === "garde-corps" ? mm(e.jourMm) : "—"}
                        </td>
                        <td data-titre={t.colDessin} className={`${cellule} text-[#4a4038] max-md:text-right`}>
                          {e.dessin ? dessinEnMots(e.dessin) : e.forme === "main-seule" ? t.mainSeule : t.rien}
                        </td>
                        <td data-titre={t.colPrix} className={`${cellule} whitespace-nowrap tabular-nums font-medium text-[#2b2320]`}>
                          {e.forme === "garde-corps"
                            ? e.prix !== null
                              ? prixAffiche(e.prix, locale)
                              : t.prixFiche
                            : e.forme === "main-seule"
                              ? t.surDevis
                              : "—"}
                        </td>
                        <td className="py-3 align-top max-md:block max-md:pt-2">
                          {e.forme !== "rien" && (
                            <OuvrirCotesGC
                              href={`${fiche}#configuration`}
                              slug={SLUG_GC}
                              largeurMm={LARGEUR_EXEMPLE_MM}
                              allegeMm={e.allegeMm}
                              enEtage
                              woodId={essence}
                              label={t.ouvrir}
                              ariaLabel={texte(t.ouvrirAria, { allege: mm(e.allegeMm) })}
                              className="inline-block whitespace-nowrap py-2 text-[13px] text-[#2b2320] underline decoration-[#2b2320]/30 underline-offset-4 hover:decoration-[#2b2320] md:-my-2"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-4 text-sm leading-relaxed text-[#6f6357]">{t.exemplesNote}</p>
            </section>

            {/* 5. La porte-fenêtre. */}
            <section className="py-8">
              <h2 className={titre2}>{t.porteFenetreTitle}</h2>
              <p className={corps}>{t.porteFenetreBody}</p>
            </section>

            {/* 6. La fenêtre haute. */}
            <section className="py-8">
              <h2 className={titre2}>{t.hauteTitle}</h2>
              <p className={corps}>{texte(t.hauteBody)}</p>
            </section>

            {/* 7. Mesurer, ou faire venir l'atelier. */}
            <section className="py-8">
              <h2 className={titre2}>{t.mesurerTitle}</h2>
              <p className={corps}>{texte(t.mesurerBody)}</p>
              <p className={corps}>{texte(t.visiteBody)}</p>
              <Link href={`/${locale}/rendez-vous`} className={`mt-3 ${lien}`}>
                {t.ctaRdv}
              </Link>
            </section>

            {/* 8. Ce qui fait varier le prix : tout est lu dans le moteur et dans le catalogue. */}
            <section className="py-8">
              <h2 className={titre2}>{t.prixTitle}</h2>
              <p className={corps}>
                {appel !== null
                  ? texte(t.prixBody, {
                      depart: prixAffiche(appel.prix, locale),
                      largeurAppel: `${appel.largeurMm / 10}\u00a0cm`,
                    })
                  : // Sans clé du chiffrage, pas de prix d'appel : la dernière phrase disparaît.
                    t.prixBody.replace(/[^.]*\{depart\}[^.]*\.\s*/, "")}
              </p>
              <div className="mt-6 grid gap-8 sm:grid-cols-2">
                {pourMains && mains.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#726757]">
                      {texte(t.mainsTitre, { allege: mm(pourMains.allegeMm) })}
                    </h3>
                    <dl className="mt-3 divide-y divide-[#e8e1d8] border-y border-[#e8e1d8] text-sm">
                      {mains.map((m) => (
                        <div key={m.id} className="flex justify-between gap-4 py-2">
                          <dt className="text-[#4a4038]">{m.label}</dt>
                          <dd className="tabular-nums text-[#2b2320]">{prixAffiche(m.prix, locale)}</dd>
                        </div>
                      ))}
                    </dl>
                    <Link href={`/${locale}/bois-massif`} className={`mt-2 ${lien}`}>
                      {dict.liens.boisLong}
                    </Link>
                  </div>
                )}
                {rosaces.length > 1 && (
                  <div>
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#726757]">
                      {texte(t.rosacesTitre, { allege: mm(ALLEGE_MAINS_MM) })}
                    </h3>
                    <dl className="mt-3 divide-y divide-[#e8e1d8] border-y border-[#e8e1d8] text-sm">
                      {rosaces.map((r) => (
                        <div key={r.id} className="flex justify-between gap-4 py-2">
                          <dt className="text-[#4a4038]">
                            {r.label}
                            {/* Le dessin que la fiche propose avec cette rosace : il peut changer, et le prix avec lui. */}
                            <span className="block text-xs text-[#6f6357]">{r.dessin}</span>
                          </dt>
                          <dd className="whitespace-nowrap tabular-nums text-[#2b2320]">{prixAffiche(r.prix, locale)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
              {rosaces.length > 1 && <p className="mt-4 text-sm leading-relaxed text-[#6f6357]">{t.rosacesNote}</p>}
              <p className={corps}>{t.lotBody}</p>
              {(fabrication || livraison) && (
                <dl className="mt-6 grid gap-1 text-sm sm:grid-cols-[9rem_1fr]">
                  {fabrication && (
                    <>
                      <dt className="text-[#726757]">{fabrication.label}</dt>
                      <dd className="mb-2 text-[#2b2320]">{fabrication.value}</dd>
                    </>
                  )}
                  {livraison && (
                    <>
                      <dt className="text-[#726757]">{livraison.label}</dt>
                      <dd className="text-[#2b2320]">{livraison.value}</dd>
                    </>
                  )}
                </dl>
              )}
            </section>
          </div>

          {/* 9. L'appel : la fiche, la prise de cotes, la zone. */}
          <section className="mt-12 rounded-xl border border-[#d9cfc0] bg-white px-6 py-7 md:px-10 md:py-10">
            <h2 className={`${serif.className} text-xl text-[#2b2320] md:text-2xl`}>{t.ctaTitle}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-[#4a4038]">{t.ctaBody}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href={`${fiche}#configuration`}
                className="btn-verre inline-block whitespace-nowrap rounded-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white sm:px-8 sm:tracking-[0.2em]"
              >
                {t.ctaCalculer}
              </Link>
              <Link href={`/${locale}/rendez-vous`} className={lien}>
                {t.ctaRdv}
              </Link>
              <Link href={`/${locale}/zone-intervention`} className={lien}>
                {dict.liens.zonePose}
              </Link>
              {/* Le garde-corps d'un escalier : ses règles sont sur le guide de l'escalier (référencement, lot L9). */}
              <Link href={`/${locale}/escalier-limon-central-prix-normes`} className={lien}>
                {dict.liens.guideEscalier}
              </Link>
              {/* Le balcon et la terrasse : leur page, pour que les trois pages garde-corps se renvoient l'une à l'autre. */}
              <Link href={`/${locale}/garde-corps-balcon-terrasse`} className={lien}>
                {dict.liens.balconTerrasse}
              </Link>
              <Link href={`/${locale}/artisanat/famille/garde-corps`} className={lien}>
                {dict.hub.catGardeCorps}
              </Link>
            </div>
          </section>

          {/* Qui a écrit le guide, et quand : l'atelier, tant que Quentin ne l'a pas relu (C9). */}
          <p className="mt-10 text-[14px] leading-[1.6] text-[#6f6357]">
            {remplir(t.signature, {
              date: new Date(DATE_MODIFICATION).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }),
            })}
          </p>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
