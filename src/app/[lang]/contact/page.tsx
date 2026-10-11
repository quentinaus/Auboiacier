import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Visuel } from "@/components/visuel";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, CONTACT_PUBLIC, horairesLisibles, telephoneLisible } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { DevisForm } from "@/components/devis-form";
import { Apparition } from "@/components/apparition";
import { getProduct, productLocalise } from "@/lib/products";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/contact",
    title: dict.seo.contact.title,
    description: dict.seo.contact.description,
  });
}

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const { produit, config, releve } = await searchParams;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.contact;

  // Arrivée depuis un bouton « Demander un devis » : on reprend la pièce et sa
  // configuration. Le nom se relit dans le catalogue traduit — l'adresse
  // Internet est toujours en français, et un visiteur anglais arrivait avec un
  // message qui commençait par « escalier limon central ».
  const fiche = typeof produit === "string" ? getProduct(produit) : undefined;
  const piece = fiche
    ? productLocalise(fiche, locale).name
    : typeof produit === "string"
      ? produit.replace(/-/g, " ")
      : "";
  // Ces deux paramètres viennent de l'adresse : un lien forgé peut y mettre
  // n'importe quoi. On borne la longueur et on retire les caractères de
  // contrôle, en gardant les retours à la ligne et tabulations du relevé.
  const propre = (valeur: unknown, max: number) =>
    typeof valeur === "string" ? valeur.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, max) : "";
  const configuration = propre(config, 200);
  // Le relevé de cotes fait par le client sur la fiche : il arrive ici déjà
  // écrit, sur ses propres lignes, pour qu'il n'ait pas à le retaper.
  const cotes = propre(releve, 2000);
  const prefill = piece
    ? `${piece}${configuration ? ` — ${configuration}` : ""}\n${cotes ? `${cotes}\n` : ""}\n`
    : "";

  // Les coordonnées : sous le titre sur grand écran, sous le formulaire sur
  // téléphone, pour qu'il ne descende pas trop bas.
  const coordonnees = (
    <dl className="border-t border-[#e5ddd3] pt-8 text-[16px] leading-[1.55] md:text-[17px]">
      <dt className="surtitre">{t.detailsTitle}</dt>
      <dd className="mt-3 flex flex-col gap-2 text-[#2b2320]">
        <a href={`mailto:${t.email}`} className="w-fit underline-offset-4 hover:underline">
          {t.email}
        </a>
        {telephoneLisible() && (
          <a href={`tel:${CONTACT_PUBLIC.telephone}`} className="w-fit underline-offset-4 hover:underline">
            {telephoneLisible()}
          </a>
        )}
        {horairesLisibles(locale) && <span className="text-[#5c5140]">{horairesLisibles(locale)}</span>}
        <span className="text-[#5c5140]">{t.location}</span>
      </dd>
    </dl>
  );

  /** Le titre, la phrase puis la liste arrivent l'un après l'autre, comme en haut de l'accueil. */
  const entree = (ms: number) => ({ "--retard": `${ms}ms` }) as CSSProperties;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* Le même gabarit que les fiches : à gauche ce qui rassure et reste
          à l'écran, à droite le formulaire qui défile. */}
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-24">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="surtitre entree-monte" style={entree(100)}>{t.form.title}</p>
            <h1
              className={`${serif.className} entree-monte mt-4 text-balance text-[2.4rem] leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}
              style={entree(200)}
            >
              {t.headline}
            </h1>
            <p
              className="entree-monte mt-6 max-w-md text-[17px] leading-[1.45] text-[#5c5140] md:mt-7 md:text-[21px]"
              style={entree(380)}
            >
              {t.subtitle}
            </p>

            <ul
              className="entree-monte mt-9 flex flex-col gap-3.5 text-[16px] leading-[1.45] text-[#2b2320] md:text-[17px]"
              style={entree(520)}
            >
              {t.points.map((point) => (
                <li key={point} className="flex items-start gap-3.5">
                  <span aria-hidden="true" className="mt-[0.72em] h-px w-5 shrink-0 bg-[#2b2320]" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-12 hidden lg:block">{coordonnees}</div>

            <Apparition className="mt-10 hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[22px]">
                <Visuel
                  locale={locale}
                  src="/images/atelier-soudeur.jpg"
                  alt={dict.hub.altAtelier}
                  fill
                  sizes="(min-width: 1024px) 34vw, 0px"
                  className="object-cover"
                />
              </div>
            </Apparition>
          </aside>

          <div className="lg:pt-2">
            <DevisForm t={t.form} email={t.email} locale={locale} prefill={prefill} />
            <div className="mt-14 lg:hidden">{coordonnees}</div>
          </div>
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
