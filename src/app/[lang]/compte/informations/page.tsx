import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilFormulaire } from "@/components/profil-formulaire";
import { sessionClient } from "@/lib/compte";
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

  const session = await sessionClient();
  if (!session) redirect(`/${locale}/compte/connexion`);

  const { profil } = await ficheDuClient(session.email);
  /* Connexion par Google : Google nous a donné son nom, autant le proposer
     plutôt qu'une case vide. Il n'est pas encore enregistré — c'est une
     suggestion, que le client valide ou corrige en enregistrant. */
  const depart = profil.nom || !session.nom ? profil : { ...profil, nom: session.nom };

  return (
    <>
      <h1 className={`${serif.className} text-3xl md:text-4xl`}>{t.infosTitre}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{t.infosIntro}</p>

      <ProfilFormulaire
        email={session.email}
        profil={depart}
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
    </>
  );
}
