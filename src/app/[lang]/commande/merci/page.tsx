import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { ArtisanatHeader } from "@/components/artisanat-header";
import { SiteFooter } from "@/components/site-footer";
import { CartClear } from "@/components/cart-clear";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { serif } from "@/lib/fonts";
import { prixAffiche } from "@/lib/ui";

/**
 * Cette page ne se visite qu'au retour du paiement, avec un numéro de commande
 * dans l'adresse : elle n'a rien à faire dans les résultats de recherche. Elle
 * a donc ses propres balises, et elle est marquée « ne pas indexer ».
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/commande/merci">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return metadataPage({
    locale,
    chemin: "/commande/merci",
    title: dict.seo.merci.title,
    description: dict.seo.merci.description,
    noIndex: true,
  });
}

export default async function MerciPage({
  params,
  searchParams,
}: PageProps<"/[lang]/commande/merci">) {
  const { lang } = await params;
  const { session_id: sessionId } = await searchParams;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.commande;

  // On ne fait jamais confiance à l'URL : c'est Stripe qui confirme le paiement.
  let paid = false;
  let reference = "";
  let amount = "";

  if (typeof sessionId === "string" && sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        paid = true;
        reference = session.metadata?.order_ref ?? session.id;
        amount = prixAffiche((session.amount_total ?? 0) / 100, locale);
      }
    } catch (error) {
      console.error("[merci] session introuvable :", error);
    }
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">

      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-2xl border border-[#e8e1d8] bg-white p-8 text-center md:p-12">
          {paid ? (
            <>
              <CartClear />
              <h1 className={`${serif.className} text-3xl text-[#2b2320]`}>{t.thankTitle}</h1>
              <p className="mt-4 leading-relaxed text-[#4a4038]">{t.thankBody}</p>

              <dl className="mt-8 flex flex-col gap-2 border-y border-[#e8e1d8] py-6 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[#726757]">{t.ref}</dt>
                  <dd className="font-medium tabular-nums text-[#2b2320]">{reference}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[#726757]">{t.amount}</dt>
                  <dd className="font-medium tabular-nums text-[#2b2320]">{amount}</dd>
                </div>
              </dl>

              <p className="mt-6 text-sm leading-relaxed text-[#5c5140]">{t.leadTime}</p>
            </>
          ) : (
            <>
              <h1 className={`${serif.className} text-2xl text-[#2b2320]`}>{t.notPaidTitle}</h1>
              <p className="mt-4 leading-relaxed text-[#4a4038]">{t.notPaidBody}</p>
            </>
          )}

          <Link
            href={`/${locale}/artisanat`}
            className="btn-verre mt-8 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
          >
            {t.backToShop}
          </Link>
        </div>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
