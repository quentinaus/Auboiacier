"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { priceFrom, type Product } from "@/lib/products";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ProductOptions, aLeConfigurateurPleinePage } from "./product-options";
import Link from "next/link";
import { serif } from "@/lib/fonts";
import { amenerAlEcran, hoverZoom, prixAffiche } from "@/lib/ui";
import { PhotoPlafondMesuree } from "./photo-plafond-anime";

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
  compteOuvert = false,
}: {
  product: Product;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
  /** L'espace client est-il ouvert ? On ne propose pas un compte qui n'existe pas encore. */
  compteOuvert?: boolean;
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
  /**
   * L'emplacement du grand croquis, en pleine largeur, sous la galerie et la
   * colonne d'options — pas dedans. `ProductOptions` y dépose le croquis par
   * portail : il garde la main sur les cotes (l'état ne bouge pas de place),
   * seul l'endroit où ça s'affiche change. `useState` (pas `useRef`) parce
   * qu'il faut un rendu de plus une fois le nœud DOM posé, pour que le
   * portail sache où viser.
   */
  const [schemaSlot, setSchemaSlot] = useState<HTMLDivElement | null>(null);
  /** Même mécanique pour le choix des matières : à côté de la photo, qu'elles font changer. */
  const [matieresSlot, setMatieresSlot] = useState<HTMLDivElement | null>(null);

  /* Sur téléphone la photo est au-dessus des options. On ne remonte plus à
     chaque teinte choisie — c'est la barre du bas qui montre le rendu
     (voir `apercu`), et le client reste sur ses bulles. Seule une vignette
     cliquée ramène à la photo, puisqu'on a demandé à la voir. */
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
  }

  /** Changer la teinte des pieds ne change que la photo, pas la prise de vue. */
  function selectMetal(id: string) {
    setMetalId(id);
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
        {
          src: coloris.image,
          alt: `${product.name} — ${coloris.label}`,
          // Les rendus de velours (la chaise) cadrent déjà serré : une marge
          // en plus dans le cadre, sinon la pièce paraît trop grande.
          fit: "contain" as const,
          pad: "loose" as const,
        },
        ...product.images.filter((img) => img.src !== coloris.image),
      ]
    : product.images;
  const mainImage = (pickedSrc && images.find((img) => img.src === pickedSrc)) || images[0];
  // Les rendus de coloris ont leur propre fond gris : le cadre en reprend la teinte.
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
  const remplitLeCadre = (mainImage?.fit ?? "cover") === "cover";
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

  /** Le configurateur en pleine page sous la photo (tables d'intérieur), ou la colonne étroite classique. */
  const pleinePage = aLeConfigurateurPleinePage(product);
  const prixDepart = product.releve ? null : priceFrom(product);
  const aide = (
    <p className={pleinePage ? "mt-3 text-xs text-[#726757]" : "mt-6 border-t border-[#e5ddd3] pt-6 text-sm text-[#726757]"}>
      {t.helpTitle}{" "}
      <Link
        href={`/${locale}/contact`}
        className="text-[#2b2320] underline underline-offset-4"
      >
        {t.helpCta}
      </Link>
    </p>
  );
  const options = (
    <>
      <ProductOptions
        product={product}
        t={t}
        locale={locale}
        compteOuvert={compteOuvert}
        fabricId={fabricId}
        onFabricChange={selectFabric}
        metalId={metalId}
        onMetalChange={selectMetal}
        woodId={woodId}
        onWoodChange={setWoodId}
        apercu={
          mainImage && mainSrc
            ? { src: mainSrc, alt: mainImage.alt, onClick: () => amenerAlEcran(galleryRef.current, { block: "start" }) }
            : undefined
        }
        schemaSlot={schemaSlot}
        matieresSlot={matieresSlot}
      />
      {!pleinePage && aide}
    </>
  );

  return (
    <>
    {/* Le gabarit d'une fiche : la photo occupe toute la hauteur de l'écran
       à gauche et reste en place ; la colonne de droite, étroite, défile avec
       les choix. Sur téléphone, la photo prend d'abord tout l'écran, puis les
       options suivent. */}
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(380px,36%)] lg:grid-cols-[minmax(0,1fr)_460px]">
      {/* Galerie — reste visible pendant qu'on parcourt les options. Sa
          hauteur retire celle de l'en-tête (non collant, lui) : en
          « h-screen » plein, le bas de la photo — et sa bande de vignettes —
          tombait juste sous le premier écran, un petit défilement à faire
          rien que pour les voir. */}
      <div ref={galleryRef} className="relative md:sticky md:top-0 md:h-[calc(100vh-69px)] md:self-start">
        <div
          /* Sur téléphone, la photo prend moins de hauteur qu'avant : le
             titre et le choix des matières (remontés en haut de la colonne)
             arrivent avec un tout petit défilement, plutôt qu'un écran entier
             plus bas. */
          className="relative flex h-[62vw] max-h-[54vh] cursor-zoom-in items-center justify-center overflow-hidden [container-type:size] md:h-full md:max-h-none"
          // Le cadre prend la teinte du fond de la photo : plus de liseré blanc
          // autour d'une photo qui n'est pas exactement blanche.
          style={{ backgroundColor: isColorShot ? "#f2f2f1" : fond }}
        >
          {mainImage && mainImage.glow ? (
            /* Une photo dont la toile s'éclaire : le halo se cale sur le
               rectangle réellement dessiné par la photo (voir
               `PhotoPlafondMesuree`), pas sur un conteneur carré recalculé —
               ce calcul-là se décalait sur certains navigateurs mobiles. */
            <div className="relative h-full w-full">
              <PhotoPlafondMesuree
                key={mainSrc}
                src={mainSrc!}
                alt={mainImage.alt}
                glow={mainImage.glow}
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-contain p-6 md:p-12"
                priority
              />
            </div>
          ) : mainImage ? (
            <Image
              key={mainSrc}
              src={mainSrc!}
              alt={mainImage.alt}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              style={{ objectPosition: mainImage.position }}
              className={
                remplitLeCadre
                  ? "object-cover"
                  : mainImage?.pad === "loose"
                    ? "object-contain p-14 md:p-20 lg:p-28"
                    : "object-contain p-8 md:p-14 lg:p-20"
              }
              priority
            />
          ) : (
            <div className="h-full w-full bg-[#f1ece4]" />
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
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center px-4 md:bottom-6">
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
                    isCurrent ? "ring-2 ring-inset ring-[#2b2320]" : ""
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
                className={`relative aspect-square w-12 shrink-0 snap-start overflow-hidden rounded-md transition-opacity hover:opacity-80 md:w-14 ${
                  pickedSrc === img.src ? "ring-2 ring-inset ring-[#2b2320]" : ""
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
                      isCurrent ? "ring-2 ring-inset ring-[#2b2320]" : hoverZoom
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
          // N'importe quel clic referme, sauf sur la photo elle-même (voir
          // plus bas) : l'ancienne version ne fermait que sur le fond tout
          // autour du cadre, pas sur les bandes vides que laisse une photo
          // qui ne remplit pas tout l'écran (object-contain).
          onClick={() => zoomRef.current?.close()}
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
                // En grand plan, la compression par défaut (75) se voit sur
                // le bord net entre le bois et le fond blanc.
                quality={92}
                // « object-contain » ne rétrécit que l'image DESSINÉE : la
                // balise, elle, garde toute la surface du cadre (fill), y
                // compris les bandes vides au-dessus et en dessous d'une
                // photo plus large que haute. Un simple stopPropagation ici
                // aurait donc empêché de refermer en cliquant dans ces
                // bandes, qui ne sont pourtant pas la photo. On calcule le
                // rectangle réellement dessiné et on ne bloque la fermeture
                // que si le clic tombe dedans.
                onClick={(event) => {
                  const img = event.currentTarget;
                  const rect = img.getBoundingClientRect();
                  const cs = getComputedStyle(img);
                  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
                  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
                  const cw = rect.width - padX;
                  const ch = rect.height - padY;
                  const { naturalWidth: nw, naturalHeight: nh } = img;
                  if (!nw || !nh || cw <= 0 || ch <= 0) return;
                  const echelle = Math.min(cw / nw, ch / nh);
                  const w = nw * echelle;
                  const h = nh * echelle;
                  const left = rect.left + parseFloat(cs.paddingLeft) + (cw - w) / 2;
                  const top = rect.top + parseFloat(cs.paddingTop) + (ch - h) / 2;
                  const dansLaPhoto =
                    event.clientX >= left &&
                    event.clientX <= left + w &&
                    event.clientY >= top &&
                    event.clientY <= top + h;
                  if (dansLaPhoto) event.stopPropagation();
                }}
                className="object-contain p-4 md:p-10"
              />
            </div>
          )}
        </dialog>
      </div>

      {/* Options : une colonne étroite, comme la fiche d'un configurateur. */}
      {/* Sur téléphone, l'en-tête se serre : le fil d'Ariane disparaît (le
          bouton « retour » de l'en-tête suffit), le titre et le lien se
          rapprochent — l'écran va aux choix, pas au titre. */}
      <div className="px-6 pb-8 pt-2 md:px-8 md:py-10 lg:px-12">
        {filAriane && (
          <nav aria-label={filAriane.label} className="hidden flex-wrap justify-end text-[11px] text-[#7a6f64] md:flex">
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
        <h1 className={`${serif.className} text-2xl leading-tight text-[#2b2320] md:mt-6 md:text-[2rem]`}>{product.name}</h1>
        {/* Pas de mot de présentation ici : la colonne va à l'essentiel, le
            descriptif est plus bas, derrière ce lien. */}
        <a
          href="#descriptif"
          className="mt-1 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-[#7a6f64] underline underline-offset-4 hover:text-black md:mt-2"
        >
          {t.moreInfo}
        </a>

        {pleinePage ? (
          /* À côté de la photo, rien que l'essentiel : l'accroche, le prix de
             départ, et le chemin vers le configurateur, plus bas. */
          <div className="mt-5 md:mt-8">
            {/* Les matières d'abord : c'est ce qu'on vient voir, et la photo
                suit chaque choix — elles restent donc juste sous le titre.
                `ProductOptions` les dépose ici par portail (voir matieresSlot). */}
            <div ref={setMatieresSlot} />
            {/* L'accroche et le prix de départ suivent, avant le chemin vers
                le configurateur. */}
            <p className="mt-8 border-t border-[#e5ddd3] pt-7 text-[15px] leading-relaxed text-[#4a4038]">
              {product.tagline}
            </p>
            {prixDepart !== null && (
              <p className="mt-4 text-[13px] tabular-nums text-[#6f6357]">
                {t.from} <span className="text-[#2b2320]">{prixAffiche(prixDepart, locale)}</span>
              </p>
            )}
            <p className="mt-1 text-xs leading-snug text-[#7a6f64]">{t.prixAttenteCotes}</p>
            <a
              href="#configuration"
              className="btn-verre mt-6 inline-block rounded-full px-7 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
            >
              {t.configurationCta}
            </a>
          </div>
        ) : (
          <div className="mt-2 md:mt-5">{options}</div>
        )}
      </div>
    </div>

    {/* Le configurateur en pleine page, sous la photo — comme la section
        « Configuration » d'un site de découpe de bois : à gauche une carte
        avec tous les choix, à droite le grand croquis coté, qui reste en vue
        pendant qu'on descend dans la carte. `ProductOptions` y dépose le
        croquis par portail (voir schemaSlot). */}
    {pleinePage && (
      /* Sur téléphone, la section est un écran à elle seule : le titre, le
         croquis et la carte se partagent la hauteur de l'écran, la carte
         défilant à l'intérieur — le même agencement que sur ordinateur, où
         le croquis est à côté d'elle. */
      <section
        id="configuration"
        className="mx-auto flex h-[calc(100svh-3.5rem)] max-w-7xl scroll-mt-14 flex-col px-5 pb-3 pt-4 md:block md:h-auto md:px-10 md:py-14"
      >
        <h2 className={`${serif.className} text-xl text-[#2b2320] md:text-3xl`}>{t.configurationTitle}</h2>
        <div className="mt-2 h-[3px] w-12 bg-[#2b2320] md:mt-3 md:w-14" aria-hidden />
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 md:mt-8 md:grid md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] md:gap-14 lg:gap-20">
          {/* La carte grise : ses couleurs sont retournées dans globals.css
              (.carte-sombre). Elle ne dépasse jamais la hauteur de l'écran,
              titre compris : elle défile à l'intérieur, la barre d'achat
              restant collée en bas. */}
          {/* Pas de marge en bas : c'est la barre d'achat, collée au bord
              inférieur, qui porte la sienne — sinon le contenu qui défile
              reste visible dessous, entre la barre et le bord de la carte. */}
          <div className="carte-sombre min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-3xl px-5 pb-0 pt-4 md:max-h-[calc(100vh-13rem)] md:flex-none md:px-6 md:pt-5">
            {options}
          </div>
          {/* Le croquis : au-dessus de la carte sur téléphone, à côté, au
              milieu de sa hauteur, sur ordinateur. */}
          <div className="order-first shrink-0 md:order-none md:flex md:items-center md:self-stretch">
            <div ref={setSchemaSlot} className="mx-auto w-full" />
          </div>
          {/* Sous la carte, en petit : une question ? */}
          <div className="shrink-0 px-1 md:-mt-6">{aide}</div>
        </div>
      </section>
    )}
    </>
  );
}
