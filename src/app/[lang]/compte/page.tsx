import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtisanatHeader } from "@/components/artisanat-header";
import { CompteDeconnexion } from "@/components/compte-deconnexion";
import { SiteFooter } from "@/components/site-footer";
import { commandesDuClient } from "@/lib/commandes-client";
import { clientConnecte } from "@/lib/compte";
import { serif } from "@/lib/fonts";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { adresseSurUneLigne, profilRempli } from "@/lib/profil";
import { ficheDuClient } from "@/lib/profil-client";
import { metadataPage } from "@/lib/seo";
import { libelleStatut } from "@/lib/statut-commande";
import { prixAffiche } from "@/lib/ui";
import { getDictionary } from "../dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/compte">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/compte",
    title: dict.seo.compte.title,
    description: dict.seo.compte.description,
    noIndex: true,
  });
}

/** Cette page lit un témoin et interroge Stripe : elle ne se pré-calcule pas. */
export const dynamic = "force-dynamic";

/** L'intitulé d'une section, toujours écrit pareil. */
function Titre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">{children}</h2>
  );
}

export default async function ComptePage({ params }: PageProps<"/[lang]/compte">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.compte;

  const email = await clientConnecte();
  if (!email) redirect(`/${locale}/compte/connexion`);

  /* Les commandes viennent de Stripe, les favoris et les coordonnées de la
     fiche client — deux interrogations indépendantes, menées de front : un
     espace qui met deux secondes à s'ouvrir n'est pas un espace. */
  const [commandes, fiche] = await Promise.all([commandesDuClient(email), ficheDuClient(email)]);

  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  const aDesInfos = profilRempli(fiche.profil);
  const adresse = adresseSurUneLigne(fiche.profil.adresse);
  const nombreFavoris = fiche.favoris.length;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">
        <div className="mx-auto max-w-2xl px-6 py-14 md:py-20">
          <h1 className={`${serif.className} text-3xl md:text-4xl`}>{t.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">{t.espaceIntro}</p>
          <p className="mt-1 text-sm text-[#726757]">
            {t.connecteComme} <span className="text-[#5c5140]">{email}</span>
          </p>

          {/* ——— Les commandes ——— */}
          <section className="mt-12">
            <Titre>{t.mesCommandes}</Titre>

            {commandes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#e8e1d8] bg-white p-6">
                <p className="text-base font-medium text-[#2b2320]">{t.aucuneTitre}</p>
                {/* Le texte le plus important de la page : quelqu'un qui a payé
                    avec une autre adresse ne doit pas croire sa commande perdue. */}
                <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.aucuneCorps}</p>
                <Link
                  href={`/${locale}/artisanat`}
                  className="btn-verre mt-6 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
                >
                  {t.voirCollection}
                </Link>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {commandes.map((commande) => (
                  <li key={commande.sessionId}>
                    {/* Toute la carte est cliquable, et haute d'au moins 56
                        points : au pouce, un lien « voir » de 12 points ne se
                        vise pas. */}
                    <Link
                      href={`/${locale}/compte/commandes/${encodeURIComponent(commande.reference)}`}
                      className="block rounded-2xl border border-[#e8e1d8] bg-white p-5 transition-colors hover:bg-[#fbfaf8]"
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="text-base font-medium tabular-nums text-[#2b2320]">
                          {commande.reference}
                        </span>
                        <span className="text-sm tabular-nums text-[#5c5140]">
                          {prixAffiche(commande.montantCents / 100, locale)}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-[#726757]">
                        {date.format(new Date(commande.creeLe * 1000))}
                      </span>
                      {commande.pieces[0] && (
                        <span className="mt-2 block text-sm text-[#5c5140]">
                          {commande.pieces[0]}
                          {commande.pieces.length > 1 &&
                            (locale === "en"
                              ? ` and ${commande.pieces.length - 1} more`
                              : ` et ${commande.pieces.length - 1} autre${commande.pieces.length > 2 ? "s" : ""}`)}
                        </span>
                      )}
                      <span className="mt-3 flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full bg-[#2b2320]"
                        />
                        <span className="text-sm font-medium text-[#2b2320]">
                          {libelleStatut(commande.statut, { pose: commande.pose, locale })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ——— Les pièces mises de côté ——— */}
          <section className="mt-12">
            <Titre>{t.sectionFavoris}</Titre>
            <Link
              href={`/${locale}/compte/favoris`}
              className="mt-4 block rounded-2xl border border-[#e8e1d8] bg-white p-5 transition-colors hover:bg-[#fbfaf8]"
            >
              {nombreFavoris === 0 ? (
                <>
                  <span className="block text-base font-medium text-[#2b2320]">
                    {t.favorisAucunTitre}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-[#5c5140]">
                    {t.sectionFavorisCorps}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-base font-medium text-[#2b2320]">
                    {locale === "en"
                      ? `${nombreFavoris} ${nombreFavoris > 1 ? "pieces saved" : "piece saved"}`
                      : `${nombreFavoris} ${nombreFavoris > 1 ? "pièces mises de côté" : "pièce mise de côté"}`}
                  </span>
                  {/* Les deux dernières, nommées : une carte qui annonce « 4 »
                      sans dire lesquelles n'invite pas à l'ouvrir. */}
                  <span className="mt-1.5 block text-sm leading-relaxed text-[#5c5140]">
                    {fiche.favoris
                      .slice(0, 2)
                      .map((f) => f.titre)
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </>
              )}
            </Link>
          </section>

          {/* ——— Les coordonnées ——— */}
          <section className="mt-12">
            <Titre>{t.sectionInfos}</Titre>
            <Link
              href={`/${locale}/compte/informations`}
              className="mt-4 block rounded-2xl border border-[#e8e1d8] bg-white p-5 transition-colors hover:bg-[#fbfaf8]"
            >
              {aDesInfos ? (
                <>
                  <span className="block text-base font-medium text-[#2b2320]">
                    {fiche.profil.nom || email}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-[#5c5140]">
                    {[fiche.profil.telephone, adresse].filter(Boolean).join(" · ")}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-base font-medium text-[#2b2320]">
                    {t.sectionInfos}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-[#5c5140]">
                    {t.sectionInfosCorps}
                  </span>
                </>
              )}
            </Link>
          </section>

          <p className="mt-12 border-t border-[#e8e1d8] pt-5">
            <CompteDeconnexion libelle={t.deconnexion} />
          </p>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
