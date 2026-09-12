import type { Metadata } from "next";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { DevisForm } from "@/components/devis-form";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/toiles-tendues/devis">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/toiles-tendues/devis",
    title: dict.seo.devis.title,
    description: dict.seo.devis.description,
  });
}

export default async function DevisPage({
  params,
}: PageProps<"/[lang]/toiles-tendues/devis">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.devis;

  // Même formulaire que la page Contact. Le premier choix de la liste
  // « Type de projet » est déjà le plafond lumineux : on le reprend en tête du
  // message pour que la demande arrive déjà cadrée.
  const sujetPlafond = dict.contact.form.projects[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{t.title}</h1>
      <p className="mt-2 text-[#726757]">{t.subtitle}</p>

      <div className="mt-8">
        <DevisForm
          t={dict.contact.form}
          email={dict.contact.email}
          locale={locale}
          prefill={`${sujetPlafond}\n\n`}
        />
      </div>
    </div>
  );
}
