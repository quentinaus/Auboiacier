import type { Metadata } from "next";
import Link from "next/link";
import { serif } from "@/lib/fonts";
import { ATELIER } from "@/lib/seo";

/**
 * Page « introuvable » pour toute adresse inconnue sous /fr ou /en (fiche
 * produit qui n'existe plus, lien mal recopié…). Sans elle, Next affichait sa
 * page grise par défaut, avec « 404: This page could not be found. » comme
 * titre — même sur le site français.
 *
 * Cette page ne reçoit pas la langue de l'adresse : elle parle donc les deux,
 * français d'abord, et renvoie vers l'accueil de chacune.
 */
export const metadata: Metadata = {
  title: { absolute: `Page introuvable — ${ATELIER.nom} ${ATELIER.ville}` },
  // Pas de `robots` ici : Next ajoute lui-même « noindex » à toute page
  // introuvable — une erreur n'a rien à faire dans les résultats de recherche.
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b2320]">
      <main id="contenu" className="mx-auto max-w-2xl px-6 py-24 text-center md:py-32">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">
          {ATELIER.nom} — {ATELIER.ville}
        </p>
        <span aria-hidden className="mx-auto my-8 block h-px w-10 bg-[#6d2c2c]/60" />
        <h1 className={`${serif.className} text-3xl md:text-4xl`} lang="fr">
          Page introuvable
        </h1>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-[#5c5140]" lang="fr">
          Cette adresse ne mène nulle part : la page a été déplacée, ou le lien est mal
          recopié.
        </p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-[#6f6357]" lang="en">
          This page could not be found — it may have moved, or the link is broken.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/fr"
            lang="fr"
            className="inline-flex items-center justify-center rounded-full bg-[#6d2c2c] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#5a2323]"
          >
            Retour à l’accueil
          </Link>
          <Link
            href="/en"
            lang="en"
            className="inline-flex items-center justify-center rounded-full border border-[#2b2320]/25 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2b2320] transition-colors hover:border-[#6d2c2c] hover:text-[#6d2c2c]"
          >
            Back to the home page
          </Link>
        </div>
      </main>
    </div>
  );
}
