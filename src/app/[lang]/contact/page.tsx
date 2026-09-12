import type { Metadata } from "next";
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
  const configuration = typeof config === "string" ? config : "";
  // Le relevé de cotes fait par le client sur la fiche : il arrive ici déjà
  // écrit, sur ses propres lignes, pour qu'il n'ait pas à le retaper.
  const cotes = typeof releve === "string" ? releve : "";
  const prefill = piece
    ? `${piece}${configuration ? ` — ${configuration}` : ""}\n${cotes ? `${cotes}\n` : ""}\n`
    : "";

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-3 text-[#726757]">{t.subtitle}</p>

        <div className="mt-10 grid gap-10 md:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className={`${serif.className} text-xl font-medium`}>{t.form.title}</h2>
            <div className="mt-4">
              <DevisForm t={t.form} email={t.email} locale={locale} prefill={prefill} />
            </div>
          </div>

          <div>
            <h2 className={`${serif.className} text-lg font-medium`}>{t.detailsTitle}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[#4a4038]">
              <li>
                <a href={`mailto:${t.email}`} className="underline-offset-4 hover:underline">
                  {t.email}
                </a>
              </li>
              {telephoneLisible() && (
                <li>
                  <span className="text-[#726757]">{t.phoneLabel} : </span>
                  <a
                    href={`tel:${CONTACT_PUBLIC.telephone}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {telephoneLisible()}
                  </a>
                </li>
              )}
              {horairesLisibles(locale) && (
                <li>
                  <span className="text-[#726757]">{t.hoursLabel} : </span>
                  {horairesLisibles(locale)}
                </li>
              )}
              <li>{t.location}</li>
            </ul>
          </div>
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
