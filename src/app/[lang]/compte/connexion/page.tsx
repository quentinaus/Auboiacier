import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompteConnexion } from "@/components/compte-connexion";
import { clientConnecte } from "@/lib/compte";
import { accueilApresConnexion, compteConfigure, retourInterne } from "@/lib/compte-jetons";
import { serif } from "@/lib/fonts";
import { googleConfigure } from "@/lib/google-oauth";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { metadataPage } from "@/lib/seo";
import { getDictionary } from "../../dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/compte/connexion">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/compte/connexion",
    title: dict.seo.compteConnexion.title,
    description: dict.seo.compteConnexion.description,
    noIndex: true,
  });
}

/** Cette page lit un témoin : elle ne se pré-calcule pas. */
export const dynamic = "force-dynamic";

export default async function ConnexionPage({
  params,
  searchParams,
}: PageProps<"/[lang]/compte/connexion">) {
  const { lang } = await params;
  const { erreur, suite } = await searchParams;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.compte;

  // Déjà connecté : on ne lui remontre pas un formulaire de connexion.
  if (await clientConnecte()) redirect(accueilApresConnexion(locale));

  const ouvert = compteConfigure();

  /**
   * Où revenir une fois connecté. Le configurateur s'en sert pour ramener le
   * client sur SA fiche, avec ses cotes (voir config-memo.ts).
   *
   * Strictement une adresse interne : elle doit commencer par une seule barre
   * oblique et ne contenir que des caractères d'adresse. « //ailleurs.fr » est
   * une adresse ABSOLUE pour un navigateur — accepté ici, il enverrait le
   * client hors du site à la sortie de Google.
   */
  const retour = retourInterne(suite) ?? accueilApresConnexion(locale);
  const message =
    erreur === "lien" ? t.erreurLien : typeof erreur === "string" ? t.erreurConnexion : null;

  return (
    <>
      <h1 className={`${serif.className} text-center text-3xl md:text-4xl`}>
        {t.connexionTitre}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-[#5c5140]">
        {t.connexionIntro}
      </p>

      {message && (
        <p className="mx-auto mt-6 max-w-[380px] rounded-2xl border border-[#e8e1d8] bg-[#fbfaf8] px-5 py-3 text-center text-sm text-[#6d2c2c]">
          {message}
        </p>
      )}

      <div className="mt-8">
        {ouvert ? (
          <CompteConnexion
            t={t}
            locale={locale}
            google={googleConfigure()}
            suite={retour}
          />
        ) : (
          /* La clé n'est pas encore posée dans Vercel : on le dit, et le
             reste du site continue de fonctionner normalement. */
          <p className="text-center text-sm text-[#5c5140]">{t.ferme}</p>
        )}
      </div>
    </>
  );
}
