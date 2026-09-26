import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SuiviCommande } from "@/components/suivi-commande";
import { commandeDuClient } from "@/lib/commandes-client";
import { clientConnecte } from "@/lib/compte";
import { ATELIER, metadataPage } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { prixAffiche } from "@/lib/ui";
import { getDictionary } from "../../../dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/compte/commandes/[reference]">): Promise<Metadata> {
  const { lang, reference } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: `/compte/commandes/${reference}`,
    title: `${dict.compte.mesCommandes} — ${reference}`,
    description: dict.seo.compte.description,
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function CommandePage({
  params,
}: PageProps<"/[lang]/compte/commandes/[reference]">) {
  const { lang, reference } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.compte;

  const email = await clientConnecte();
  if (!email) redirect(`/${locale}/compte/connexion`);

  // Référence inconnue OU appartenant à quelqu'un d'autre : « introuvable »,
  // jamais « cette commande n'est pas à vous ». Le second message confirmerait
  // à qui essaie des références au hasard que celle-ci existe.
  const commande = await commandeDuClient(email, decodeURIComponent(reference));
  if (!commande) notFound();

  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(commande.creeLe * 1000));

  const objet = encodeURIComponent(
    locale === "en" ? `Order ${commande.reference}` : `Commande ${commande.reference}`
  );

  return (
    <>
      <p className="text-sm">
        <Link href={`/${locale}/compte`} className="text-[#5c5140] underline underline-offset-4">
          ← {t.commandeRetour}
        </Link>
      </p>

      <h1 className={`${serif.className} mt-6 text-3xl tabular-nums md:text-4xl`}>
        {commande.reference}
      </h1>
      <p className="mt-2 text-sm text-[#726757]">
        {t.commandeDate} {date}
      </p>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">
          {t.commandeSuivi}
        </h2>
        <div className="mt-4 rounded-2xl border border-[#e8e1d8] bg-white p-5">
          <SuiviCommande statut={commande.statut} pose={commande.pose} locale={locale} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">
          {t.commandePieces}
        </h2>
        <ul className="mt-4 divide-y divide-[#e8e1d8] rounded-2xl border border-[#e8e1d8] bg-white px-5">
          {commande.pieces.map((piece, i) => (
            <li key={`${piece}-${i}`} className="py-3 text-sm text-[#4a4038]">
              {piece}
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-[#726757]">{t.commandeMontant}</dt>
            <dd className="font-medium tabular-nums text-[#2b2320]">
              {prixAffiche(commande.montantCents / 100, locale)}
            </dd>
          </div>
          {commande.adresse && (
            <div className="flex items-baseline justify-between gap-6">
              <dt className="shrink-0 text-[#726757]">{t.commandeLivraison}</dt>
              <dd className="text-right text-[#4a4038]">{commande.adresse}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href={`/api/commande/confirmation?session_id=${encodeURIComponent(commande.sessionId)}`}
          target="_blank"
          rel="noopener"
          className="btn-verre inline-flex h-12 items-center justify-center rounded-full px-7 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
        >
          {t.telecharger}
        </a>
        {commande.factureUrl && (
          <a
            href={commande.factureUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#9a8d80] px-7 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:bg-[#f7f4ef]"
          >
            {t.facture}
          </a>
        )}
        {/* Le vrai service après-vente d'un artisan, c'est de pouvoir lui
            écrire — pas une messagerie interne que personne ne relève. */}
        <a
          href={`mailto:${ATELIER.email}?subject=${objet}`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-[#9a8d80] px-7 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:bg-[#f7f4ef]"
        >
          {t.ecrire}
        </a>
      </div>
    </>
  );
}
