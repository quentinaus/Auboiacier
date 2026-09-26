import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavorisListe } from "@/components/favoris-liste";
import { clientConnecte } from "@/lib/compte";
import { serif } from "@/lib/fonts";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { ficheDuClient } from "@/lib/profil-client";
import { metadataPage } from "@/lib/seo";
import { getDictionary } from "../../dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/compte/favoris">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/compte/favoris",
    title: dict.compte.favorisTitre,
    description: dict.seo.compte.description,
    noIndex: true,
  });
}

/** Cette page lit un témoin et interroge Stripe : elle ne se pré-calcule pas. */
export const dynamic = "force-dynamic";

export default async function FavorisPage({ params }: PageProps<"/[lang]/compte/favoris">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.compte;

  const email = await clientConnecte();
  if (!email) redirect(`/${locale}/compte/connexion`);

  const { favoris } = await ficheDuClient(email);

  return (
    <>
      <h1 className={`${serif.className} text-3xl md:text-4xl`}>{t.favorisTitre}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{t.favorisIntro}</p>

      <FavorisListe
        favoris={favoris}
        locale={locale}
        lienCollection={`/${locale}/artisanat`}
        t={{
          reprendre: t.favorisReprendre,
          retirer: t.favorisRetirer,
          gardeLe: t.favorisGardeLe,
          erreur: t.favorisErreur,
          aucunTitre: t.favorisAucunTitre,
          aucunCorps: t.favorisAucunCorps,
          voirCollection: t.voirCollection,
        }}
      />
    </>
  );
}
