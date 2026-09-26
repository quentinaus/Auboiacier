import { ArtisanatHeader } from "@/components/artisanat-header";
import { CompteCadre } from "@/components/compte-cadre";
import { CompteMenu } from "@/components/compte-menu";
import { SiteFooter } from "@/components/site-footer";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";

/**
 * L'ossature de l'espace client : l'en-tête, le menu à gauche, la page, le
 * pied.
 *
 * Le menu vit ici plutôt que dans chaque page — sinon il faudrait le redire
 * quatre fois, et il finirait par différer d'une page à l'autre. Il se cache
 * de lui-même sur la connexion (voir CompteMenu).
 */
export default async function CompteLayout({
  children,
  params,
}: LayoutProps<"/[lang]/compte">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.compte;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      <ArtisanatHeader locale={locale} dict={dict} />
      <main id="contenu">
        <CompteCadre
          sansMenu={[`/${locale}/compte/connexion`]}
          menu={
            <CompteMenu
              deconnexion={t.deconnexion}
              /* « Vos commandes » pointe sur l'espace lui-même : c'est là
                 qu'elles sont, et le détail d'une commande en dépend, donc
                 l'entrée reste allumée quand on l'ouvre. */
              entrees={[
                { href: `/${locale}/compte`, libelle: t.mesCommandes },
                { href: `/${locale}/compte/favoris`, libelle: t.sectionFavoris },
                { href: `/${locale}/compte/informations`, libelle: t.sectionInfos },
              ]}
            />
          }
        >
          {children}
        </CompteCadre>
      </main>
      <SiteFooter locale={locale} dict={dict} tone="light" />
    </div>
  );
}
