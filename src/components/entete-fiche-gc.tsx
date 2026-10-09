"use client";

/**
 * Le haut de la fiche du garde-corps (Quentin, 09/10/2026 : « cette page ne va pas, pas belle, pas intuitive ; la fusionner
 * avec celle des deux motion design ») : plus de bouton « Configurer » entre la photo et les deux films. Le titre porte
 * l'essentiel : le nom, le prix d'appel et « aux normes » (avec le lien vers la vérification). La grande photo reste
 * (Quentin : « comment le client fait pour voir à quoi s'attendre ? ») : `PhotoFicheGC`, à côté des films sur ordinateur,
 * au-dessus sur téléphone.
 *
 * Écrit deux fois : sur l'écran de choix (porte-qui-mesure.tsx, `titre` = false, avec le fil d'Ariane), et au-dessus du
 * configurateur (`titre` = true : le seul h1 de la page).
 */

import { useState } from "react";
import Link from "next/link";
import { Visuel } from "./visuel";
import { serif } from "@/lib/fonts";
import type { Product } from "@/lib/products";

export function EnTeteFicheGC({
  nom,
  locale,
  prix,
  titre,
  filAriane,
}: {
  nom: string;
  locale: "fr" | "en";
  /** « Dès 300 € pour une fenêtre de 100 cm », déjà écrit ; null sans prix d'appel. */
  prix: { montant: string; largeurCm: number } | null;
  /** true : le titre de la page (h1) ; false : le même texte, sans titre (l'écran de choix, posé par-dessus). */
  titre: boolean;
  filAriane?: { label: string; etapes: { nom: string; href: string }[] };
}) {
  const fr = locale === "fr";
  const Nom = titre ? "h1" : "p";

  // Au-dessus du configurateur : le nom seul, à la place du mot « Configuration » (le prix vit déjà dans la colonne d'achat,
  // « Aux normes » sur le croquis) : la plaque garde sa hauteur pour les questions.
  if (titre) return <h1 className={`${serif.className} whitespace-nowrap text-lg leading-none text-[#2b2320] md:text-[22px]`}>{nom}</h1>;

  return (
    <div className="min-w-0">
      {filAriane && (
        <nav aria-label={filAriane.label} className="mb-1 hidden min-w-0 whitespace-nowrap text-[11px] text-[#7a6f64] md:flex">
          {filAriane.etapes.map((etape) => (
            <span key={etape.href} className="shrink-0">
              <Link href={etape.href} className="hover:text-[#2b2320]">
                {etape.nom}
              </Link>
              <span className="mx-1.5">/</span>
            </span>
          ))}
          <span className="min-w-0 truncate text-[#2b2320]">{nom}</span>
        </nav>
      )}
      <Nom className={`${serif.className} text-[21px] leading-tight text-[#2b2320] md:text-[28px] md:leading-none`}>{nom}</Nom>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] leading-snug text-[#4a4038] md:text-[13px]">
        {prix && (
          <span className="tabular-nums">
            {fr ? "Dès " : "From "}
            <span className="font-semibold text-[#2b2320]">{prix.montant}</span>
            {/* Sur téléphone, la ligne doit tenir : « fenêtre 100 cm » au lieu de « pour une fenêtre de 100 cm ». */}
            <span className="md:hidden">{fr ? ` · fenêtre ${prix.largeurCm} cm` : ` · ${prix.largeurCm} cm window`}</span>
            <span className="hidden md:inline">{fr ? ` pour une fenêtre de ${prix.largeurCm} cm` : ` for a ${prix.largeurCm} cm window`}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[#1f5a2e]">
          <svg viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" />
          </svg>
          <Link href={`/${locale}/artisanat/verification-garde-corps`} className="underline decoration-[#1f5a2e]/40 underline-offset-2">
            {fr ? "Aux normes" : "To standard"}
            <span className="hidden md:inline">{fr ? " : comment on vérifie" : ": how we check"}</span>
          </Link>
        </span>
      </p>

    </div>
  );
}

/**
 * La grande photo du garde-corps, avec ses flèches : le client voit à quoi s'attendre avant de choisir qui mesure.
 * Chaque image passe par Visuel (la mention « Image d'illustration » s'y pose seule).
 */
export function PhotoFicheGC({ images, locale, className = "" }: { images: Product["images"]; locale: "fr" | "en"; className?: string }) {
  const fr = locale === "fr";
  const [vue, setVue] = useState(0);
  const image = images[vue] ?? images[0];
  if (!image) return null;
  const aller = (pas: number) => setVue((v) => (v + pas + images.length) % images.length);
  const fleche = "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg text-[#2b2320] shadow-sm backdrop-blur transition-colors hover:bg-white";
  return (
    <div className={`relative overflow-hidden rounded-[22px] ${className}`} style={{ backgroundColor: image.bg ?? "#ffffff" }}>
      <Visuel
        locale={locale}
        coin="haut-droite"
        key={image.src}
        src={image.src}
        alt={image.alt}
        fill
        priority={vue === 0}
        sizes="(max-width: 768px) 100vw, 50vw"
        style={{ objectPosition: image.position }}
        className={(image.fit ?? "cover") === "contain" ? "object-contain p-6" : "object-cover"}
      />
      {images.length > 1 && (
        <>
          <button type="button" aria-label={fr ? "Photo précédente" : "Previous photo"} onClick={() => aller(-1)} className={`${fleche} left-3`}>
            ‹
          </button>
          <button type="button" aria-label={fr ? "Photo suivante" : "Next photo"} onClick={() => aller(1)} className={`${fleche} right-3`}>
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5" aria-hidden>
            {images.map((img, i) => (
              <i key={img.src} className={`block h-1.5 rounded-full transition-all ${i === vue ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
