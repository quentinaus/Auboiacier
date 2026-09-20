import type { Metadata } from "next";
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
    // Next ajoute lui-même une balise « noindex » à toute page introuvable ;
    // mais le layout en pose une seconde, « index, follow », héritée de ses
    // métadonnées. Deux consignes contraires sur la même page : on remplace
    // ici celle du layout pour que les deux disent la même chose.
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const locale = await langueDemandee();
  const dict = await getDictionary(locale);
  const t = dict.introuvable;

  const secondaire =
    "inline-flex items-center justify-center rounded-full border border-[#2b2320]/25 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:border-black hover:text-black";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#2b2320]">
      {/* Next remet le titre de l'accueil après l'hydratation : on le corrige. */}
      <TitreIntrouvable titre={titreComplet(t.title)} />
      <GlobalHeader locale={locale} dict={dict} />
      <main id="contenu" className="mx-auto max-w-2xl px-6 py-20 text-center md:py-28">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#6f6357]">{t.code}</p>
        <h1 className={`${serif.className} mt-4 text-3xl md:text-4xl`}>{t.title}</h1>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-[#5c5140]">{t.body}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="btn-verre inline-flex items-center justify-center rounded-full px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
          >
            {t.home}
          </Link>
          <Link href={`/${locale}/artisanat`} className={secondaire}>
            {t.craft}
          </Link>
          <Link href={`/${locale}/devis`} className={secondaire}>
            {t.quote}
          </Link>
        </div>
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}
