import type { Metadata } from "next";
import { lireLien, retourInterne } from "@/lib/compte-jetons";
import { serif } from "@/lib/fonts";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { metadataPage } from "@/lib/seo";
import { getDictionary } from "../../../dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/compte/connexion/confirmer">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/compte/connexion/confirmer",
    title: dict.compte.confirmerTitre,
    description: dict.seo.compteConnexion.description,
    noIndex: true,
  });
}

/** Le jeton est relu à chaque passage : rien à pré-calculer. */
export const dynamic = "force-dynamic";

/** Le jeton relu maintenant, hors du rendu (qui doit rester pur). */
function lienValide(jeton: string | null) {
  return lireLien(jeton, Math.floor(Date.now() / 1000));
}

/**
 * L'étape entre le lien reçu par e-mail et la session ouverte.
 *
 * Le lien ouvrait la session tout seul, sur un simple clic. Quelqu'un pouvait
 * donc demander un lien pour SA propre adresse, l'envoyer à un client (« voici
 * votre devis »), et le client se retrouvait connecté au compte de l'autre
 * sans le savoir : sa commande, son adresse et son téléphone atterrissaient
 * dans l'espace de l'escroc. Ici, l'adresse s'affiche en toutes lettres et
 * rien ne s'ouvre sans un clic sur le bouton.
 */
export default async function ConfirmerConnexionPage({
  params,
  searchParams,
}: PageProps<"/[lang]/compte/connexion/confirmer">) {
  const { lang } = await params;
  const { j, s } = await searchParams;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = (await getDictionary(locale)).compte;

  const jeton = typeof j === "string" ? j : null;
  const lu = lienValide(jeton);
  const retour = retourInterne(s);

  return (
    <>
      <h1 className={`${serif.className} text-center text-3xl md:text-4xl`}>{t.confirmerTitre}</h1>
      {lu && jeton ? (
        <form
          method="post"
          action="/api/compte/lien/ouvrir"
          className="mx-auto mt-8 w-full max-w-[380px] text-center"
        >
          <p className="text-sm text-[#5c5140]">{t.confirmerCorps}</p>
          <p className="mt-2 break-all text-base font-medium text-[#2b2320]">{lu.email}</p>
          <input type="hidden" name="j" value={jeton} />
          <input type="hidden" name="l" value={locale} />
          {retour && <input type="hidden" name="s" value={retour} />}
          <button
            type="submit"
            className="btn-verre mt-6 h-12 w-full rounded-full text-[11px] font-medium uppercase tracking-[0.2em] text-white"
          >
            {t.confirmerBouton}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-[#726757]">{t.confirmerPasMoi}</p>
        </form>
      ) : (
        <p className="mx-auto mt-6 max-w-[380px] rounded-2xl border border-[#e8e1d8] bg-[#fbfaf8] px-5 py-3 text-center text-sm text-[#6d2c2c]">
          {t.erreurLien}
        </p>
      )}
    </>
  );
}
