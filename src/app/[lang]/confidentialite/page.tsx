import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { metadataPage } from "@/lib/seo";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { ENTREPRISE } from "@/lib/entreprise";

/**
 * La politique de confidentialité : ce que le RGPD (article 13) oblige à
 * dire au moment où l'on recueille une donnée — donc avant l'envoi du
 * formulaire de devis, pas seulement à l'achat dans les CGV.
 *
 * Le texte vit dans les dictionnaires ; cette page ne fait que l'afficher,
 * en texte brut. Les adresses web citées (CNIL, Stripe) restent en clair,
 * volontairement : on ne rend pas de HTML depuis le JSON.
 *
 * Deux choses à garder VRAIES, sinon le texte ment (voir MISE-EN-LIGNE.md) :
 *  — l'article 5 annonce des fonctions exécutées à Paris (vercel.json,
 *    « regions ») et des e-mails envoyés depuis l'Irlande (région Resend) ;
 *  — l'article 9 annonce la validation en deux étapes sur nos comptes.
 * Et l'article 8 dit qu'il n'y a pas de mesure d'audience : si un outil
 * d'analytics est installé un jour, changer ce paragraphe le même jour.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/confidentialite">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/confidentialite",
    title: dict.seo.confidentialite.title,
    description: dict.seo.confidentialite.description,
    noIndex: true,
  });
}

export default async function ConfidentialitePage({
  params,
}: PageProps<"/[lang]/confidentialite">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.confidentialite;
  const labels = dict.mentionsLegales;

  // Le responsable du traitement doit être identifiable : on reprend la fiche
  // de l'entreprise des mentions légales. Seules les lignes remplies s'affichent.
  const identite = [
    { label: labels.labelRaisonSociale, value: ENTREPRISE.raisonSociale },
    { label: labels.labelStatut, value: ENTREPRISE.statut },
    { label: labels.labelAdresse, value: ENTREPRISE.adresse },
    { label: labels.labelSiret, value: ENTREPRISE.siret },
    { label: labels.labelTelephone, value: ENTREPRISE.telephone },
  ].filter((ligne) => ligne.value !== "");

  const lienInline = "text-sm underline underline-offset-4 hover:text-[#6d2c2c]";
  const lien = `mt-3 inline-block ${lienInline}`;
  const derniere = t.sections.length - 1;

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className={`${serif.className} text-3xl font-medium tracking-tight md:text-4xl`}>
          {t.title}
        </h1>
        <p className="mt-4 leading-relaxed text-[#5c5140]">{t.intro}</p>
        <p className="mt-2 text-sm text-[#726757]">{t.updated}</p>

        <div className="mt-12 flex flex-col gap-10">
          {t.sections.map((section, i) => (
            <section key={section.title}>
              <h2 className={`${serif.className} text-xl text-[#2b2320]`}>{section.title}</h2>
              {/* Les articles du dictionnaire contiennent des retours à la
                  ligne : whitespace-pre-line les respecte. */}
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[#4a4038]">
                {section.body}
              </p>

              {/* Sous « Qui est responsable » : la fiche de l'entreprise, puis
                  le renvoi vers les mentions légales. */}
              {i === 0 && identite.length > 0 && (
                <dl className="mt-4 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
                  {identite.map((ligne) => (
                    <div key={ligne.label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                      <dt className="text-sm text-[#726757]">{ligne.label}</dt>
                      <dd className="text-sm leading-relaxed text-[#2b2320]">{ligne.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {i === 0 && (
                <Link href={`/${locale}/mentions-legales`} className={lien}>
                  {dict.footer.legal}
                </Link>
              )}

              {/* Sous le dernier article : les deux autres textes du site. */}
              {i === derniere && (
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  <Link href={`/${locale}/cgv`} className={lienInline}>
                    {dict.footer.cgv}
                  </Link>
                  <Link href={`/${locale}/cgu`} className={lienInline}>
                    {dict.footer.cgu}
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
