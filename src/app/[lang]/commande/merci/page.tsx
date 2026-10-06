import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage } from "@/lib/seo";
import { ArtisanatHeader } from "@/components/artisanat-header";
import { SiteFooter } from "@/components/site-footer";
import { CartClear } from "@/components/cart-clear";
import { clientConnecte } from "@/lib/compte";
import { compteConfigure } from "@/lib/compte-jetons";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { serif } from "@/lib/fonts";
import { prixAffiche } from "@/lib/ui";
import { lienConfirmationOuvert } from "@/lib/confirmation";
import { Apparition } from "@/components/apparition";

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

function confirmationOuverte(creeLeS: number) {
  return lienConfirmationOuvert(creeLeS, Math.floor(Date.now() / 1000));
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
  // L'espace client se propose ICI, jamais avant le paiement : obliger à
  // créer un compte pour acheter fait fuir une partie des acheteurs, et c'est
  // le seul moment où l'on connaît une adresse e-mail vérifiée par Stripe.
  const proposerCompte = compteConfigure() && !(await clientConnecte());

  // On ne fait jamais confiance à l'URL : c'est Stripe qui confirme le paiement.
  let paid = false;
  let reference = "";
  let amount = "";
  /** L'adresse du PDF « Commande acceptée et payée », une fois le paiement confirmé. */
  let confirmation = "";

  if (typeof sessionId === "string" && sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        paid = true;
        reference = session.metadata?.order_ref ?? session.id;
        amount = prixAffiche((session.amount_total ?? 0) / 100, locale);
        // Le lien du PDF ne vit que trente jours (voir DUREE_LIEN_CONFIRMATION_S).
        if (confirmationOuverte(session.created)) {
          confirmation = `/api/commande/confirmation?session_id=${encodeURIComponent(sessionId)}`;
        }
      }
    } catch (error) {
      console.error("[merci] session introuvable :", error);
    }
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">

      {/* Façon Apple (Quentin, 06/10/2026) : plus de carte bordée ni de capitales espacées ; un grand titre, le
          récapitulatif sur un fond papier, un seul bouton plein par bloc. */}
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-16 text-center md:pb-28 md:pt-24">
        <Apparition>
          {paid ? (
            <>
              <CartClear />
              <h1 className={`${serif.className} text-[2.4rem] leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}>{t.thankTitle}</h1>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#4a4038] md:text-[21px]">{t.thankBody}</p>

              <dl className="mx-auto mt-10 flex max-w-xl flex-col gap-3 rounded-[22px] bg-[#f5f1ea] px-6 py-5 text-left text-[16px] md:px-8 md:py-6 md:text-[17px]">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[#5c5140]">{t.ref}</dt>
                  <dd className="min-w-0 break-all text-right font-semibold tabular-nums text-[#2b2320]">{reference}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[#5c5140]">{t.amount}</dt>
                  <dd className="font-medium tabular-nums text-[#2b2320]">{amount}</dd>
                </div>
              </dl>

              <p className="mx-auto mt-6 max-w-xl text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">{t.leadTime}</p>

              {/* Le même document que celui joint à l'e-mail de confirmation.
                  Une balise <a>, pas un Link : c'est un PDF servi par une
                  route, pas une page du site, et il s'ouvre à côté. */}
              <a
                href={confirmation}
                target="_blank"
                rel="noopener"
                className="btn-plein mt-8"
              >
                {t.confirmationPdf}
              </a>

              {proposerCompte && (
                <div className="mx-auto mt-12 max-w-xl rounded-[28px] bg-[#f5f1ea] px-6 py-8 md:px-10 md:py-10">
                  <p className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>{dict.compte.merciTitre}</p>
                  <p className="mt-3 text-[16px] leading-[1.55] text-[#5c5140] md:text-[17px]">
                    {dict.compte.merciCorps}
                  </p>
                  <Link
                    href={`/${locale}/compte/connexion`}
                    className="btn-contour mt-6"
                  >
                    {dict.compte.merciBouton}
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className={`${serif.className} text-[2.4rem] leading-[1.03] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.8rem]`}>{t.notPaidTitle}</h1>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.45] text-[#4a4038] md:text-[21px]">{t.notPaidBody}</p>
            </>
          )}

          {/* Après un paiement, le bouton plein est le PDF : le retour à la collection devient un lien fléché. */}
          <div className="mt-10">
            <Link
              href={`/${locale}/artisanat`}
              className={paid ? "lien-fleche text-[#2b2320]" : "btn-plein"}
            >
              {t.backToShop}
            </Link>
          </div>
        </Apparition>
      </div>

      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
