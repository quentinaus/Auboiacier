"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/products";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ProductOptions } from "./product-options";
import Link from "next/link";
import { serif } from "@/lib/fonts";
import { amenerAlEcran, hoverZoom } from "@/lib/ui";
import { MembraneAnimee } from "./photo-plafond-anime";

/**
 * Les flèches de la galerie ne portent pas de texte : seul un lecteur d'écran
 * les annonce. Ces deux libellés-là ne sont pas dans les dictionnaires, on les
 * écrit ici dans les deux langues.
 */
const COLORIS_FLECHES = {
  fr: { precedent: "Coloris précédent", suivant: "Coloris suivant" },
  en: { precedent: "Previous colour", suivant: "Next colour" },
} as const;

/** Le plein écran de la photo : deux mots de service, dans les deux langues. */
const ZOOM = {
  fr: { ouvrir: "Voir la photo en plein écran", fermer: "Fermer" },
  en: { ouvrir: "View photo full screen", fermer: "Close" },
} as const;

/**
 * Galerie + options d'un produit. La galerie suit le coloris sélectionné :
 * choisir un velours remplace la photo principale par celle de ce coloris.
 */
export function ProductView({
  product,
  t,
  locale,
}: {
  product: Product;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
}) {
  // Coloris de départ : celui de la photo principale du produit.
  const defaultFabric =
    product.fabrics?.find((f) => f.image === product.images[0]?.src) ?? product.fabrics?.[0];
  const [fabricId, setFabricId] = useState(defaultFabric?.id ?? "");
  /**
   * Certaines prises de vue existent dans chaque teinte de pieds (table
   * Mikado) : la photo affichée suit alors la couleur choisie. Les vignettes,
   * elles, restent sur la version noire pour ne pas encombrer la bande.
   */
  const [metalId, setMetalId] = useState(product.metals[0]?.id ?? "");
  /** Photo choisie en cliquant une vignette. Null = on suit le coloris. */
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  /** La photo en grand. Un <dialog> natif : Échap referme, sans bibliothèque. */
  const zoomRef = useRef<HTMLDialogElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  /** Sur téléphone la photo est au-dessus des options : on y remonte au changement de coloris. */
  function selectFabric(id: string) {
    setFabricId(id);
    // Le coloris reprend la main sur une photo choisie à la vignette.
    setPickedSrc(null);
    // La bande de vignettes suit le coloris choisi dans les bulles.
    // Le glissement doux passe en saut sec quand le visiteur a demandé
    // « moins d'animations » (voir src/lib/ui.ts).
    amenerAlEcran(stripRef.current?.querySelector(`[data-fabric="${id}"]`), {
      inline: "center",
      block: "nearest",
    });
    if (window.innerWidth < 768) {
      amenerAlEcran(galleryRef.current, { block: "center" });
    }
  }

  /** Changer la teinte des pieds ne change que la photo, pas la prise de vue. */
  function selectMetal(id: string) {
    setMetalId(id);
    if (window.innerWidth < 768) {
      amenerAlEcran(galleryRef.current, { block: "center" });
    }
  }

  /** Une vignette cliquée passe en grand, avec sa teinte de pieds. */
  function selectImage(src: string) {
    setPickedSrc(src);
    const vue = product.images.find((img) => img.src === src);
    if (vue?.metal) setMetalId(vue.metal);
    // Une vignette de coloris reprend la main sur la galerie.
    if (vue?.fabric) {
      setFabricId(vue.fabric);
      setPickedSrc(null);
    }
    if (window.innerWidth < 768) {
      amenerAlEcran(galleryRef.current, { block: "center" });
    }
  }

  const fleches = COLORIS_FLECHES[locale];
  const fabric = product.fabrics?.find((f) => f.id === fabricId);
  const coloris = fabric;

  const images: Product["images"] = coloris?.image
    ? [
        { src: coloris.image, alt: `${product.name} — ${coloris.label}`, fit: "cover" as const },
        ...product.images.filter((img) => img.src !== coloris.image),
      ]
    : product.images;
  const mainImage = (pickedSrc && images.find((img) => img.src === pickedSrc)) || images[0];
  // Les rendus de coloris ont leur propre fond gris : on remplit le cadre avec.
  const isColorShot = Boolean(coloris?.image && mainImage?.src === coloris.image);
  /** La même prise de vue, dans la teinte de pieds choisie. */
  const mainSrc = mainImage?.variants?.[metalId] ?? mainImage?.src;

  /**
   * `fit` est relevé sur la photo elle-même (voir products.ts) : fond uni de
   * studio → la pièce reste entière sur un cadre de la même couleur ; fond
   * varié ou photo d'ambiance → elle remplit le cadre, sinon on verrait son
   * contour rectangulaire à l'intérieur.
   */
  const fond = mainImage?.bg ?? "#ffffff";
  const remplitLeCadre = isColorShot || (mainImage?.fit ?? "cover") === "cover";
  // Toutes les teintes en vignettes : on fait défiler sans passer par les bulles.
  /**
   * Quand les vignettes sont choisies à la main sur le produit (trois coloris
   * plus un gros plan), on garde cette bande-là : les quinze rendus de velours
   * restent accessibles par les bulles.
   */
  const vignettesChoisies = product.images.some((img) => img.fabric);
  /** La bande reste fixe quand elle est choisie à la main sur le produit. */
  const vignettes = vignettesChoisies ? product.images : images;
  const colorThumbs = vignettesChoisies ? [] : (product.fabrics ?? []).filter((f) => f.image);
  const currentIndex = colorThumbs.findIndex((f) => f.id === fabricId);
  /** Photos qui ne sont pas des rendus de coloris : détails, mises en situation. */
  const otherImages = product.images.filter(
    (img) => !colorThumbs.some((f) => f.image === img.src)
  );

  function step(direction: 1 | -1) {
    if (colorThumbs.length < 2) return;
    const next = (currentIndex + direction + colorThumbs.length) % colorThumbs.length;
    selectFabric(colorThumbs[next].id);
  }

  return (
    <div className="mt-6 grid gap-10 md:grid-cols-2">
      {/* Galerie — reste visible pendant qu'on parcourt les options */}
      <div ref={galleryRef} className="flex flex-col gap-3 md:sticky md:top-6 md:self-start">
        <div
          className="relative flex aspect-square cursor-zoom-in items-center justify-center overflow-hidden rounded-xl"
          // Le cadre prend la teinte du fond de la photo : plus de liseré blanc
          // autour d'une photo qui n'est pas exactement blanche.
          style={{ backgroundColor: isColorShot ? "#f2f2f1" : fond }}
        >
          {mainImage ? (
            <Image
              key={mainSrc}
              src={mainSrc!}
              alt={mainImage.alt}
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              className={remplitLeCadre ? "object-cover" : "object-contain p-6"}
              priority
            />
          ) : (
            <div className="h-full w-full bg-[#f1ece4]" />
          )}

          {/* La toile de la photo, réellement éclairée. */}
          {mainImage?.glow && (
            <MembraneAnimee box={mainImage.glow.box} clip={mainImage.glow.clip} />
          )}

          {/* Toute la photo est cliquable : un meuble à 3 000 €, on veut voir
              la soudure de près. Les flèches gardent leur z-10 et passent
              devant ce bouton. */}
          {mainImage && (
            <button
              type="button"
              onClick={() => zoomRef.current?.showModal()}
              aria-label={ZOOM[locale].ouvrir}
              className="absolute inset-0 z-[5] h-full w-full"
            />
          )}

          {/* Flèches : passer d'un coloris à l'autre sans quitter la photo. */}
          {colorThumbs.length > 1 && (
            <>
              <button
                type="button"
                aria-label={fleches.precedent}
                onClick={() => step(-1)}
                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-lg text-[#2b2320] backdrop-blur transition-colors hover:bg-white"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={fleches.suivant}
                onClick={() => step(1)}
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-lg text-[#2b2320] backdrop-blur transition-colors hover:bg-white"
              >
                ›
              </button>
            </>
          )}
        </div>
        {/* Vignettes : coloris puis autres photos. Un clic les passe en grand. */}
        {colorThumbs.length > 0 ? (
          <div
            ref={stripRef}
            className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1"
          >
            {colorThumbs.map((f) => {
              const isCurrent = f.id === fabricId && !pickedSrc;
              return (
                <button
                  key={f.id}
                  type="button"
                  data-fabric={f.id}
                  title={f.label}
                  aria-label={f.label}
                  aria-pressed={isCurrent}
                  onClick={() => selectFabric(f.id)}
                  className={`relative aspect-square w-24 shrink-0 snap-start overflow-hidden rounded-lg bg-[#f2f2f1] transition-opacity hover:opacity-80 ${
                    isCurrent ? "ring-2 ring-inset ring-[#6d2c2c]" : ""
                  }`}
                >
                  <Image src={f.image!} alt={f.label} fill sizes="120px" className="object-cover" />
                </button>
              );
            })}

            {otherImages.map((img) => (
              <button
                key={img.src}
                type="button"
                title={img.alt}
                aria-label={img.alt}
                aria-pressed={pickedSrc === img.src}
                onClick={() => selectImage(img.src)}
                className={`relative aspect-square w-24 shrink-0 snap-start overflow-hidden rounded-lg bg-white transition-opacity hover:opacity-80 ${
                  pickedSrc === img.src ? "ring-2 ring-inset ring-[#6d2c2c]" : ""
                }`}
              >
                <Image src={img.src} alt={img.alt} fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : (
          vignettes.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {vignettes.slice(0, 4).map((img) => {
                const isCurrent =
                  img.fabric
                    ? img.fabric === fabricId && !pickedSrc
                    : mainImage?.src === img.src && (!img.metal || img.metal === metalId);
                return (
                  <button
                    key={img.src}
                    type="button"
                    title={img.alt}
                    aria-label={img.alt}
                    aria-pressed={isCurrent}
                    onClick={() => selectImage(img.src)}
                    className={`relative aspect-square overflow-hidden rounded-lg bg-white transition-opacity hover:opacity-80 ${
                      isCurrent ? "ring-2 ring-inset ring-[#6d2c2c]" : hoverZoom
                    }`}
                  >
                    <Image src={img.src} alt={img.alt} fill sizes="150px" className="object-cover" />
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* La photo en grand, par-dessus la page. Le <dialog> du navigateur
            gère seul la touche Échap et le piège à focus. */}
        <dialog
          ref={zoomRef}
          onClick={(event) => {
            if (event.target === zoomRef.current) zoomRef.current?.close();
          }}
          className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#2b2320]/95 p-0 backdrop:bg-transparent"
        >
          <button
            type="button"
            onClick={() => zoomRef.current?.close()}
            aria-label={ZOOM[locale].fermer}
            className="focus-clair absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-xl text-[#2b2320] transition-colors hover:bg-white"
          >
            ×
          </button>
          {mainImage && mainSrc && (
            <div className="relative h-full w-full">
              <Image
                src={mainSrc}
                alt={mainImage.alt}
                fill
                sizes="100vw"
                className="object-contain p-4 md:p-10"
              />
            </div>
          )}
        </dialog>
      </div>

      {/* Options */}
      <div>
        <h1 className={`${serif.className} text-3xl text-[#2b2320] md:text-4xl`}>{product.name}</h1>
        {/* Plus de « à partir de » ici : juste en dessous, la colonne d'options
            affiche le prix RÉEL de la configuration montrée. Les deux chiffres
            ne concordaient pas, et rien n'expliquait l'écart au moment précis
            où le client hésite. Le « à partir de » garde tout son sens sur les
            cartes de la boutique, où il n'y a pas de configurateur. */}
        <p className="mt-4 text-[#5c5140]">{product.tagline}</p>
        <a
          href="#descriptif"
          className="mt-3 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d2c2c] underline underline-offset-4"
        >
          {t.moreInfo}
        </a>
        <div className="mt-6">
          <ProductOptions
            product={product}
            t={t}
            locale={locale}
            fabricId={fabricId}
            onFabricChange={selectFabric}
            metalId={metalId}
            onMetalChange={selectMetal}
          />

          <p className="mt-6 border-t border-[#e5ddd3] pt-6 text-sm text-[#726757]">
            {t.helpTitle}{" "}
            <Link
              href={`/${locale}/contact`}
              className="text-[#6d2c2c] underline underline-offset-4"
            >
              {t.helpCta}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
