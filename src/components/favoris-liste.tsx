"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Favori } from "@/lib/favoris";
import { memoriserConfig } from "@/lib/config-memo";
import { prixAffiche } from "@/lib/ui";

/**
 * Les pièces mises de côté.
 *
 * « Reprendre » ne se contente pas d'ouvrir la fiche : il repose la
 * configuration dans le stockage de session AVANT de naviguer, et le
 * configurateur la relit au montage (config-memo.ts). C'est exactement le
 * chemin déjà emprunté par le retour de connexion — une seule mécanique à
 * entretenir, et un client qui retrouve ses 1 650 × 990 en noir charbon sans
 * retaper une cote.
 */

type Textes = {
  reprendre: string;
  retirer: string;
  gardeLe: string;
  erreur: string;
  aucunTitre: string;
  aucunCorps: string;
  voirCollection: string;
};

export function FavorisListe({
  favoris,
  t,
  locale,
  lienCollection,
}: {
  favoris: Favori[];
  t: Textes;
  locale: "fr" | "en";
  lienCollection: string;
}) {
  const router = useRouter();
  const [liste, setListe] = useState(favoris);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  function reprendre(favori: Favori) {
    memoriserConfig(favori.config);
    router.push(`/${locale}/artisanat/${favori.slug}#configuration`);
  }

  async function retirer(id: string) {
    if (occupe) return;
    setOccupe(id);
    setErreur(null);
    // On retire tout de suite à l'écran : l'attente d'un aller-retour avec
    // Stripe donnerait l'impression d'un bouton mort. En cas d'échec, la
    // pièce revient et le message l'explique.
    const avant = liste;
    setListe((l) => l.filter((f) => f.id !== id));
    try {
      const reponse = await fetch("/api/compte/favoris", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!reponse.ok) throw new Error("refus");
      const { favoris: restants } = (await reponse.json()) as { favoris: Favori[] };
      if (Array.isArray(restants)) setListe(restants);
    } catch {
      setListe(avant);
      setErreur(t.erreur);
    } finally {
      setOccupe(null);
    }
  }

  if (liste.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-[#e8e1d8] bg-white p-6">
        <p className="text-base font-medium text-[#2b2320]">{t.aucunTitre}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.aucunCorps}</p>
        <a
          href={lienCollection}
          className="btn-verre mt-6 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
        >
          {t.voirCollection}
        </a>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-6 flex flex-col gap-3">
        {liste.map((favori) => (
          <li
            key={favori.id}
            className="rounded-2xl border border-[#e8e1d8] bg-white p-5 transition-colors hover:bg-[#fbfaf8]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-base font-medium text-[#2b2320]">{favori.titre}</p>
              {favori.prixCents !== null && (
                <p className="text-sm tabular-nums text-[#5c5140]">
                  {prixAffiche(favori.prixCents / 100, locale)}
                </p>
              )}
            </div>
            {favori.resume && (
              <p className="mt-1.5 text-sm leading-relaxed text-[#5c5140]">{favori.resume}</p>
            )}
            {favori.ajouteLe > 0 && (
              <p className="mt-1 text-xs text-[#6f6357]">
                {t.gardeLe} {date.format(new Date(favori.ajouteLe * 1000))}
              </p>
            )}
            {/* Deux gestes, et le plus utile en premier : reprendre.
                « Retirer » reste en retrait, pour qu'on ne l'atteigne pas en
                visant l'autre au pouce. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => reprendre(favori)}
                className="btn-verre rounded-full px-7 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
              >
                {t.reprendre}
              </button>
              <button
                type="button"
                onClick={() => retirer(favori.id)}
                disabled={occupe === favori.id}
                className="text-sm text-[#6f6357] underline decoration-dotted underline-offset-4 transition-colors hover:text-[#6d2c2c] disabled:opacity-50"
              >
                {t.retirer}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-[#6d2c2c]">
        {erreur}
      </p>
    </>
  );
}
