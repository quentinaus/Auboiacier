"use client";

/**
 * Le haut de la fiche du garde-corps (Quentin, 09/10/2026 : « cette page ne va pas, pas belle, pas intuitive ; la fusionner
 * avec celle des deux motion design ») : plus de grande photo ni de bouton « Configurer » au-dessus. La page s'ouvre sur
 * la plaque « Qui prend les mesures ? », et son titre porte l'essentiel : le nom, le prix d'appel, « aux normes » (avec
 * le lien vers la vérification) et les photos, dans une petite fenêtre.
 *
 * Écrit deux fois : sur l'écran de choix (porte-qui-mesure.tsx, `titre` = false, avec le fil d'Ariane), et au-dessus du
 * configurateur (`titre` = true : le seul h1 de la page).
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { Visuel } from "./visuel";
import { serif } from "@/lib/fonts";
import type { Product } from "@/lib/products";

export function EnTeteFicheGC({
  nom,
  locale,
  prix,
  images,
  titre,
  filAriane,
}: {
  nom: string;
  locale: "fr" | "en";
  /** « Dès 300 € pour une fenêtre de 100 cm », déjà écrit ; null sans prix d'appel. */
  prix: { montant: string; largeurCm: number } | null;
  images: Product["images"];
  /** true : le titre de la page (h1) ; false : le même texte, sans titre (l'écran de choix, posé par-dessus). */
  titre: boolean;
  filAriane?: { label: string; etapes: { nom: string; href: string }[] };
}) {
  const fr = locale === "fr";
  const dialogue = useRef<HTMLDialogElement>(null);
  const [vue, setVue] = useState(0);
  const Nom = titre ? "h1" : "p";
  const image = images[vue] ?? images[0];

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
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setVue(0);
              dialogue.current?.showModal();
            }}
            className="inline-flex items-center gap-1 font-medium text-[#2b2320] underline underline-offset-2"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <rect x="2.5" y="4" width="15" height="12" rx="2" />
              <path d="M2.5 13l4-4 3 3 2.5-2.5 5.5 5.5" />
            </svg>
            <span className="md:hidden">Photos</span>
            <span className="hidden md:inline">{fr ? `Voir les photos (${images.length})` : `See the photos (${images.length})`}</span>
          </button>
        )}
      </p>

      {/* Les photos, dans une fenêtre : la grande, et ses vignettes. Échap ou un clic autour la ferme. */}
      <dialog
        ref={dialogue}
        aria-label={fr ? `Photos : ${nom}` : `Photos: ${nom}`}
        onClick={(e) => {
          if (e.target === dialogue.current) dialogue.current?.close();
        }}
        className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-[22px] bg-[#fbf8f4] p-3 backdrop:bg-black/50 md:p-4"
      >
        {image && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ backgroundColor: image.bg ?? "#ffffff" }}>
            <Visuel
              locale={locale}
              coin="haut-droite"
              key={image.src}
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 900px) 100vw, 900px"
              style={{ objectPosition: image.position }}
              className={(image.fit ?? "cover") === "contain" ? "object-contain p-6" : "object-cover"}
            />
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={img.alt}
              aria-pressed={i === vue}
              onClick={() => setVue(i)}
              className={`relative aspect-square w-14 shrink-0 overflow-hidden rounded-md ${i === vue ? "ring-2 ring-[#2b2320]" : "opacity-80 hover:opacity-100"}`}
              style={{ backgroundColor: img.bg ?? "#ffffff" }}
            >
              <Visuel locale={locale} vignette src={img.src} alt={img.alt} fill sizes="120px" className={(img.fit ?? "cover") === "contain" ? "object-contain p-1" : "object-cover"} />
            </button>
          ))}
          <button type="button" onClick={() => dialogue.current?.close()} className="btn-contour ml-auto">
            {fr ? "Fermer" : "Close"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
