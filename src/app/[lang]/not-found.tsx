import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { lang } from "next/root-params";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import { serif } from "@/lib/fonts";
import { ATELIER } from "@/lib/seo";
import { TitreIntrouvable } from "@/components/titre-introuvable";

/**
 * Page « introuvable » pour toute adresse inconnue sous /fr ou /en (fiche
 * produit qui n'existe plus, lien mal recopié…). Sans elle, Next affichait sa
 * page grise par défaut, avec « 404: This page could not be found. » comme
 * titre — même sur le site français.
 *
 * not-found.tsx ne reçoit aucune prop : la langue de l'adresse se lit avec
 * next/root-params (le segment [lang] au-dessus du layout racine). La page
 * garde ainsi l'en-tête, le pied de page et la langue du visiteur, avec trois
 * portes de sortie : l'accueil, le mobilier, le devis.
 */
async function langueDemandee(): Promise<Locale> {
  const brut = (await lang()) ?? defaultLocale;
  return isLocale(brut) ? brut : defaultLocale;
}

function titreComplet(titre: string): string {
  return `${titre} — ${ATELIER.nom} ${ATELIER.ville}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await langueDemandee());
  return {
    // Titre absolu : le modèle du layout ajouterait un second « Auboiacier ».
    title: { absolute: titreComplet(dict.introuvable.title) },
    // Next ajoute lui-même une balise « noindex » à toute page introuvable
    // (réponse 404). Le layout en poserait une seconde, « index, follow »,
    // héritée de ses métadonnées : null l'efface, et la page n'a plus qu'une
    // balise robots, celle de Next (avant : « noindex » plus « noindex,
    // nofollow », deux balises pour une même consigne).
    robots: null,
  };
}

export default async function NotFound() {
  const locale = await langueDemandee();
  const dict = await getDictionary(locale);
  const t = dict.introuvable;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      {/* Next remet le titre de l'accueil après l'hydratation : on le corrige. */}
      <TitreIntrouvable titre={titreComplet(t.title)} />
      <GlobalHeader locale={locale} dict={dict} />
      {/* Façon Apple (Quentin, 06/10/2026) : l'accroche en phrase normale, le grand titre, un seul bouton plein, les
          deux autres sorties en liens fléchés. Le bloc monte sans attendre le JavaScript. */}
      <main id="contenu" className="mx-auto max-w-3xl px-6 py-20 text-center md:py-32">
        <div className="entree-monte" style={{ "--retard": "120ms" } as CSSProperties}>
          <p className="surtitre">{t.code}</p>
          <h1 className={`${serif.className} mt-3 text-balance text-[2.4rem] font-normal leading-[1.03] tracking-[-0.02em] sm:text-[3rem] md:text-[3.8rem]`}>
            {t.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.45] text-[#5c5140] md:mt-6 md:text-[21px]">{t.body}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-x-8 gap-y-4 sm:flex-row sm:flex-wrap">
            <Link href={`/${locale}`} className="btn-plein">
              {t.home}
            </Link>
            <Link href={`/${locale}/artisanat`} className="lien-fleche py-2 text-[#2b2320]">
              {t.craft}
            </Link>
            <Link href={`/${locale}/devis`} className="lien-fleche py-2 text-[#2b2320]">
              {t.quote}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}
