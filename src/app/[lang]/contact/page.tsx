import type { Metadata } from "next";
import Image from "next/image";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage, CONTACT_PUBLIC, horairesLisibles, telephoneLisible } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { DevisForm } from "@/components/devis-form";
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
    <dl className="border-t border-[#e5ddd3] pt-8 text-sm">
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f6357]">{t.detailsTitle}</dt>
      <dd className="mt-3 flex flex-col gap-1.5 text-[#2b2320]">
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

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* Le même gabarit que les fiches : à gauche ce qui rassure et reste
          à l'écran, à droite le formulaire qui défile. */}
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-24">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{t.form.title}</p>
            <h1 className={`${serif.className} mt-4 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl`}>
              {t.headline}
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-[#5c5140]">{t.subtitle}</p>

            <ul className="mt-8 flex flex-col gap-3 text-sm text-[#2b2320]">
              {t.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-[0.6em] h-px w-5 shrink-0 bg-[#2b2320]" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-12 hidden lg:block">{coordonnees}</div>

            <div className="relative mt-10 hidden aspect-[4/3] overflow-hidden lg:block">
              <Image
                src="/images/atelier-soudeur.jpg"
                alt={dict.hub.altAtelier}
                fill
                sizes="(min-width: 1024px) 34vw, 0px"
                className="object-cover"
              />
            </div>
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
