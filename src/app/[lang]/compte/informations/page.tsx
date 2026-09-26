import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtisanatHeader } from "@/components/artisanat-header";
import { ProfilFormulaire } from "@/components/profil-formulaire";
import { SiteFooter } from "@/components/site-footer";
import { clientConnecte } from "@/lib/compte";
import { serif } from "@/lib/fonts";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { ficheDuClient } from "@/lib/profil-client";
import { metadataPage } from "@/lib/seo";
import { getDictionary } from "../../dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/compte/informations">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/compte/informations",
    title: dict.compte.infosTitre,
    description: dict.seo.compte.description,
    noIndex: true,
  });
}

/** Cette page lit un témoin et interroge Stripe : elle ne se pré-calcule pas. */
export const dynamic = "force-dynamic";

export default async function InformationsPage({
  params,
}: PageProps<"/[lang]/compte/informations">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.compte;

  const email = await clientConnecte();
  if (!email) redirect(`/${locale}/compte/connexion`);

  const { profil } = await ficheDuClient(email);

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">
        <div className="mx-auto max-w-lg px-6 py-14 md:py-20">
          <p className="text-sm">
            <Link href={`/${locale}/compte`} className="text-[#5c5140] underline underline-offset-4">
              ← {t.retourEspace}
            </Link>
          </p>

          <h1 className={`${serif.className} mt-6 text-3xl md:text-4xl`}>{t.infosTitre}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{t.infosIntro}</p>

          <ProfilFormulaire
            email={email}
            profil={profil}
            t={{
              email: t.infosEmail,
              emailFixe: t.infosEmailFixe,
              nom: t.infosNom,
              telephone: t.infosTelephone,
              telephoneAide: t.infosTelephoneAide,
              adresse: t.infosAdresse,
              ligne1: t.infosLigne1,
              ligne2: t.infosLigne2,
              codePostal: t.infosCodePostal,
              ville: t.infosVille,
              enregistrer: t.infosEnregistrer,
              enregistrement: t.infosEnregistrement,
              enregistre: t.infosEnregistre,
              erreur: t.infosErreur,
              erreurCodePostal: t.infosErreurCodePostal,
              erreurTelephone: t.infosErreurTelephone,
              ou: t.infosOu,
            }}
          />
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
