import { permanentRedirect } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n";

/**
 * L'ancienne adresse du formulaire de devis des plafonds lumineux. La page
 * « Devis » du site couvre maintenant toutes les pièces : on y envoie, pour
 * de bon, ceux qui ont gardé l'ancien lien.
 */
export default async function AncienDevisPage({ params }: PageProps<"/[lang]/toiles-tendues/devis">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  permanentRedirect(`/${locale}/devis`);
}
