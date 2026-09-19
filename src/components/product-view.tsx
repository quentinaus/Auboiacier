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
  filAriane,
}: {
  product: Product;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** Le fil d'Ariane : il ouvre la colonne des options. Des données plutôt
      qu'un élément tout fait — un élément venu du serveur perd le marquage
      « enfants statiques » et React réclame des clés. */
  filAriane?: { label: string; etapes: { nom: string; href: string }[] };
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
  /** L'essence du plateau : la photo se reteinte quand elle change. */
  const [woodId, setWoodId] = useState(
    (product.woods.find((w) => !w.priceDelta) ?? product.woods[0])?.id ?? ""
  );
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
  /** La même prise de vue, dans l'essence de plateau puis la teinte de pieds choisies. */
  const enBois = mainImage?.parBois?.[woodId];
  const mainSrc =
    (typeof enBois === "string" ? enBois : enBois?.[metalId]) ?? mainImage?.variants?.[metalId] ?? mainImage?.src;

  /**
   * `fit` est relevé sur la photo elle-même (voir products.ts) : fond uni de
   * studio → la pièce reste entière sur un cadre de la même couleur ; fond
   * varié ou photo d'ambiance → elle remplit le cadre, sinon on verrait son
   * contour rectangulaire à l'intérieur.
   */
  const fond = mainImage?.bg ?? "#ffffff";
  /** Le calque des pieds dans la teinte choisie, sur les photos de coloris. */
  const calquePieds = (surColoris: boolean) =>
    product.piedsCalque && metalId && surColoris ? `${product.piedsCalque}${metalId}.png` : null;
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
    /* Le gabarit d'une fiche : la photo occupe toute la hauteur de l'écran
       à gauche et reste en place ; la colonne de droite, étroite, défile avec
       les choix. Sur téléphone, la photo prend d'abord tout l'écran, puis les
       options suivent. */
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(380px,36%)] lg:grid-cols-[minmax(0,1fr)_460px]">
      {/* Galerie — reste visible pendant qu'on parcourt les options */}
      <div ref={galleryRef} className="relative md:sticky md:top-0 md:h-screen md:self-start">
        <div
          className="relative flex h-[78vw] max-h-[80vh] cursor-zoom-in items-center justify-center overflow-hidden md:h-full md:max-h-none"
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
              sizes="(max-width: 768px) 100vw, 66vw"
              style={{ objectPosition: mainImage.position }}
              className={remplitLeCadre ? "object-cover" : "object-contain p-8 md:p-14 lg:p-20"}
              priority
            />
          ) : (
            <div className="h-full w-full bg-[#f1ece4]" />
          )}

          {/* Les pieds dans la teinte choisie, calés au pixel sur la photo. */}
          {mainImage && calquePieds(isColorShot) && (
            <Image
              key={calquePieds(isColorShot)}
              src={calquePieds(isColorShot)!}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              style={{ objectPosition: mainImage.position }}
              className={`pointer-events-none ${remplitLeCadre ? "object-cover" : "object-contain p-8 md:p-14 lg:p-20"}`}
              priority
            />
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
                className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-lg text-[#2b2320] shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={fleches.suivant}
                onClick={() => step(1)}
                className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-lg text-[#2b2320] shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                ›
              </button>
            </>
          )}
        </div>
        {/* Vignettes : coloris puis autres photos, posées en bas de la photo.
            Un clic les passe en grand. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4 md:bottom-6">
        {colorThumbs.length > 0 ? (
          <div
            ref={stripRef}
            className="no-scrollbar pointer-events-auto flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl bg-white/70 p-1.5 backdrop-blur"
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
                  className={`relative aspect-square w-12 shrink-0 snap-start overflow-hidden rounded-md bg-[#f2f2f1] transition-opacity hover:opacity-80 md:w-14 ${
                    isCurrent ? "ring-2 ring-inset ring-[#6d2c2c]" : ""
                  }`}
                >
                  <Image src={f.image!} alt={f.label} fill sizes="120px" className="object-cover" />
                  {calquePieds(true) && (
                    <Image src={calquePieds(true)!} alt="" aria-hidden fill sizes="120px" className="object-cover" />
                  )}
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
                className={`relative aspect-square w-12 shrink-0 snap-start overflow-hidden rounded-md transition-opacity hover:opacity-80 md:w-14 ${
                  pickedSrc === img.src ? "ring-2 ring-inset ring-[#6d2c2c]" : ""
                }`}
                style={{ backgroundColor: img.bg ?? "#ffffff" }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="120px"
                  style={{ objectPosition: img.position }}
                  className={(img.fit ?? "cover") === "contain" ? "object-contain p-1" : "object-cover"}
                />
              </button>
            ))}
          </div>
        ) : (
          vignettes.length > 1 && (
            <div className="pointer-events-auto flex gap-2 rounded-xl bg-white/70 p-1.5 backdrop-blur">
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
                    className={`relative aspect-square w-12 overflow-hidden rounded-md transition-opacity hover:opacity-80 md:w-14 ${
                      isCurrent ? "ring-2 ring-inset ring-[#6d2c2c]" : hoverZoom
                    }`}
                    style={{ backgroundColor: img.bg ?? "#ffffff" }}
                  >
                    {/* Une photo de studio se montre entière, comme en grand :
                        recadrée au carré, une table longue perdait ses pieds. */}
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="150px"
                      style={{ objectPosition: img.position }}
                      className={(img.fit ?? "cover") === "contain" ? "object-contain p-1" : "object-cover"}
                    />
                    {img.fabric && calquePieds(true) && (
                      <Image
                        src={calquePieds(true)!}
                        alt=""
                        aria-hidden
                        fill
                        sizes="150px"
                        style={{ objectPosition: img.position }}
                        className={(img.fit ?? "cover") === "contain" ? "object-contain p-1" : "object-cover"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}
        </div>

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

      {/* Options : une colonne étroite, comme la fiche d'un configurateur. */}
      <div className="px-6 py-8 md:px-8 md:py-10 lg:px-12">
        {filAriane && (
          <nav aria-label={filAriane.label} className="text-xs text-[#726757]">
            {filAriane.etapes.map((etape) => (
              <span key={etape.href}>
                <Link href={etape.href} className="hover:text-[#2b2320]">
                  {etape.nom}
                </Link>
                <span className="mx-1.5">/</span>
              </span>
            ))}
            <span className="text-[#2b2320]">{product.name}</span>
          </nav>
        )}
        <h1 className={`${serif.className} mt-4 text-3xl text-[#2b2320] md:text-[2rem]`}>{product.name}</h1>
        {/* Le mot de présentation, puis le prix de départ dans les options. */}
        <p className="mt-3 text-[15px] leading-relaxed text-[#5c5140]">{product.tagline}</p>
        <a
          href="#descriptif"
          className="mt-3 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d2c2c] underline underline-offset-4"
        >
          {t.moreInfo}
        </a>

        {/* Le garde-corps : la promesse, avant les cotes. */}
        {product.releve === "garde-corps-fenetre" && (
          <div className="mt-5 rounded-2xl border border-[#6d2c2c]/20 bg-[#6d2c2c]/[0.04] px-4 py-3.5">
            <p className="flex items-center gap-2.5 text-lg font-medium leading-tight text-[#6d2c2c]">
              <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
                <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
              </svg>
              {t.gcPromesseTitre}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5c5140]">{t.gcPromesse}</p>
          </div>
        )}
        <div className="mt-6">
          <ProductOptions
            product={product}
            t={t}
            locale={locale}
            fabricId={fabricId}
            onFabricChange={selectFabric}
            metalId={metalId}
            onMetalChange={selectMetal}
            woodId={woodId}
            onWoodChange={setWoodId}
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
