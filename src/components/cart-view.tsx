"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { productLocalise, remiseLot, resolveSelection, SUR_MESURE, type Product } from "@/lib/products";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { prixAffiche } from "@/lib/ui";
import { LIVRAISON, POSE, PRISE_DE_COTES, libelleLivraison, libellePose, libellePriseDeCotes } from "@/lib/deplacement";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";

const ACCENT = "#2b2320";

type Status =
  | "idle"
  | "loading"
  | "unavailable"
  | "not_configured"
  | "too_many"
  | "code_postal"
  | "error";

/** Longueur maximale de la ville : un nom de commune, pas un roman. */
const VILLE_MAX = 80;

export function CartView({
  t,
  locale,
  contactEmail,
}: {
  t: Dictionary["panier"];
  locale: "fr" | "en";
  contactEmail: string;
}) {
  const { items, ready, setQuantity, remove } = useCart();
  // Ces intitulés-là ne sont lus que par les lecteurs d'écran : ils ne sont pas
  // dans les dictionnaires, on les écrit ici dans les deux langues.
  const fr = locale === "fr";
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [showCgvError, setShowCgvError] = useState(false);
  /**
   * La ville, demandée avant de payer. Stripe recueillera l'adresse complète
   * juste après ; celle-ci arrive plus tôt pour que Quentin sache tout de
   * suite où va la pièce — et elle reste sur le bon de commande même si le
   * client abandonne la page de paiement.
   */
  const [ville, setVille] = useState("");
  /** Payer 40 % aujourd'hui, le solde à la livraison ou à la pose. */
  const [acompte, setAcompte] = useState(false);
  const [showVilleError, setShowVilleError] = useState(false);
  const idVille = useId();
  const idVilleErreur = useId();
  /** Ce qui vient de se passer dans le panier, dit à voix haute une seule fois. */
  const [annonce, setAnnonce] = useState("");
  const idCgvErreur = useId();

  // Les prix stockés dans le navigateur ne sont qu'une copie d'affichage :
  // on recalcule tout depuis le catalogue à chaque rendu.
  const { lines, stale } = useMemo(() => {
    const lines: {
      id: string;
      quantity: number;
      name: string;
      options: string;
      unitPrice: number;
      image?: string;
      /** Une visite ou une pose : quantité figée à un, prix venu du serveur au moment du choix. */
      visite?: boolean;
      /** La ligne de pose, pour le récapitulatif et son icône. */
      pose?: boolean;
      /** La ligne de livraison par transporteur. */
      livraison?: boolean;
      /** La pièce du catalogue, pour le prix de lot. */
      product?: Product;
      /** Le prix catalogue avant remise de lot, et la remise appliquée. */
      prixCatalogue?: number;
      remise?: number;
    }[] = [];
    const stale: string[] = [];

    for (const item of items) {
      // La prise de cotes n'est pas une pièce du catalogue : son prix a été
      // calculé par le serveur (/api/deplacement) quand le client a choisi, et
      // /api/commande le recalcule avant d'encaisser. On l'affiche tel quel.
      // La livraison par transporteur : prix venu du serveur au moment du choix.
      if (item.slug === LIVRAISON) {
        if (!item.livraisonCp) {
          stale.push(item.id);
          continue;
        }
        lines.push({
          id: item.id,
          quantity: 1,
          name: libelleLivraison(item.livraisonCp, locale),
          options: item.optionsLabel,
          unitPrice: item.unitPrice,
          visite: true,
          livraison: true,
        });
        continue;
      }
      // La pose à domicile : même logique, sans créneau — l'atelier appelle
      // pour convenir du jour quand la pièce est prête.
      if (item.slug === POSE) {
        if (!item.poseCp) {
          stale.push(item.id);
          continue;
        }
        lines.push({
          id: item.id,
          quantity: 1,
          name: libellePose(item.poseCp, locale),
          options: item.optionsLabel,
          unitPrice: item.unitPrice,
          visite: true,
          pose: true,
        });
        continue;
      }
      if (item.slug === PRISE_DE_COTES) {
        const creneau = lireCreneau(item.rdv);
        if (!item.priseDeCotesCp || !creneau) {
          stale.push(item.id);
          continue;
        }
        lines.push({
          id: item.id,
          quantity: 1,
          name: libellePriseDeCotes(item.priseDeCotesCp, locale),
          options: [libelleCreneau(creneau, locale), item.note].filter(Boolean).join(" · "),
          unitPrice: item.unitPrice,
          visite: true,
        });
        continue;
      }
      const resolved = resolveSelection({
        slug: item.slug,
        sizeId: item.sizeId,
        largeurMm: item.largeurMm,
        hauteurMm: item.hauteurMm,
        epaisseurMm: item.epaisseurMm,
        woodId: item.woodId,
        metalId: item.metalId,
        fabricId: item.fabricId,
        remplissageId: item.remplissageId,
        locale,
      });
      if (!resolved.ok) {
        stale.push(item.id);
        continue;
      }
      // Le panier se relit dans le catalogue : on le relit donc dans la langue
      // du visiteur. Le résumé des options est refait ici, parce que
      // resolveSelection (le calcul du prix) ne connaît que le français.
      const fiche = productLocalise(resolved.line.product, locale);
      const { size, wood, metal, fabric, remplissage } = resolved.line;
      // Les tailles gardent le même rang d'une langue à l'autre. Des cotes qui
      // retombent pile sur une taille du catalogue en reprennent le nom.
      const rangTaille = resolved.line.product.sizes.findIndex(
        (taille) => taille.id === size.id || taille.label === size.label
      );
      const options = [
        fiche.sizes.length > 1 || size.id === SUR_MESURE
          ? rangTaille >= 0
            ? fiche.sizes[rangTaille].label
            : size.label
          : null,
        fiche.woods.find((bois) => bois.id === wood?.id)?.label,
        fiche.metals.find((acier) => acier.id === metal?.id)?.label,
        fiche.fabrics?.find((velours) => velours.id === fabric?.id)?.label,
        remplissage && remplissage.id !== fiche.remplissages?.[0]?.id
          ? fiche.remplissages?.find((option) => option.id === remplissage.id)?.label
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      lines.push({
        id: item.id,
        quantity: item.quantity,
        name: fiche.name,
        options: [options, item.note].filter(Boolean).join(" · "),
        unitPrice: resolved.line.unitPrice,
        image: resolved.line.image,
        product: resolved.line.product,
      });
    }
    // Le prix de lot : plusieurs garde-corps dans la même commande, même avec
    // des cotes différentes. Même calcul que /api/commande.
    const lot = new Map(
      remiseLot(lines.filter((line): line is typeof line & { product: Product } => !!line.product)).map(
        (line) => [line.id, line]
      )
    );
    // Les pièces d'abord, la pose et la visite en dernier : elles
    // accompagnent la commande, elles ne la font pas.
    const ordonnees = [...lines.filter((l) => !l.visite), ...lines.filter((l) => l.visite)];
    return {
      lines: ordonnees.map((line) => {
        const remisee = lot.get(line.id);
        return remisee && remisee.remise > 0
          ? { ...line, unitPrice: remisee.prixLot, prixCatalogue: line.unitPrice, remise: remisee.remise }
          : line;
      }),
      stale,
    };
  }, [items, locale]);

  // Une ligne qui ne se résout plus est retirée : le panier se répare seul.
  useEffect(() => {
    stale.forEach((id) => remove(id));
  }, [stale, remove]);

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const totalPieces = lines.filter((l) => !l.visite).reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const lignePose = lines.find((l) => l.pose);
  const ligneLivraison = lines.find((l) => l.livraison);
  // Le même arrondi que le serveur : 40 % de chaque ligne, au centime.
  const montantAcompte = lines.reduce((sum, line) => sum + (Math.round(line.unitPrice * 40) / 100) * line.quantity, 0);
  const solde = total - montantAcompte;

  async function checkout() {
    if (!ville.trim()) {
      setShowVilleError(true);
      return;
    }
    if (!accepted) {
      setShowCgvError(true);
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          cgvAccepted: true,
          acompte,
          ville: ville.trim().slice(0, VILLE_MAX),
          lines: items.map((item) => ({
            slug: item.slug,
            sizeId: item.sizeId,
            largeurMm: item.largeurMm,
            hauteurMm: item.hauteurMm,
            epaisseurMm: item.epaisseurMm,
            woodId: item.woodId,
            metalId: item.metalId,
            fabricId: item.fabricId,
            remplissageId: item.remplissageId,
            quantity: item.quantity,
            priseDeCotesCp: item.priseDeCotesCp,
            poseCp: item.poseCp,
            livraisonCp: item.livraisonCp,
            livraisonSlug: item.livraisonSlug,
            rdv: item.rdv,
            note: item.note,
          })),
        }),
      });

      if (response.ok) {
        const { url } = (await response.json()) as { url?: string };
        if (url) {
          window.location.href = url;
          return;
        }
      }

      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(
        error === "not_configured"
          ? "not_configured"
          : error === "too_many"
            ? "too_many"
            : error === "unavailable"
            ? "unavailable"
            : error === "code_postal"
              ? "code_postal"
              : "error"
      );
      if (error === "cgv") setShowCgvError(true);
      if (error === "ville") setShowVilleError(true);
    } catch {
      setStatus("error");
    }
  }

  if (!ready) {
    return <div className="h-40" aria-hidden />;
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e8e1d8] bg-white p-10 text-center">
        <p className="text-[#5c5140]">{t.empty}</p>
        <Link
          href={`/${locale}/artisanat`}
          className="mt-6 inline-block rounded-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          {t.backToShop}
        </Link>
      </div>
    );
  }

  const problem =
    status === "unavailable"
      ? t.unavailable
      : status === "not_configured"
        ? t.notConfigured
        : status === "too_many"
          ? t.tooMany
          : status === "code_postal"
            ? t.badPostcode
            : status === "error"
              ? t.error
              : null;

  return (
    <div>
      {stale.length > 0 && (
        <p role="status" className="mb-6 rounded-xl border border-[#e8e1d8] px-5 py-4 text-sm text-[#2b2320]">
          {t.removedLine}
        </p>
      )}

      {/* Deux colonnes : les lignes à gauche, le récapitulatif et le paiement
          à droite, comme un comptoir. Sur téléphone, l'un sous l'autre. */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <ul className="divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-5 py-6">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f2f2f1]">
                {line.image && (
                  <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
                )}
                {line.visite && (
                  /* Une visite : un calendrier ; une pose : la route. */
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7a6f64"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-full w-full p-5"
                  >
                    {line.pose || line.livraison ? (
                      <>
                        <path d="M3 16V8a1 1 0 0 1 1-1h9v9" />
                        <path d="M13 10h4l3 3v3h-7" />
                        <circle cx="7" cy="17" r="1.6" />
                        <circle cx="17" cy="17" r="1.6" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M3 10h18M8 3v4M16 3v4" />
                      </>
                    )}
                  </svg>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className={`${serif.className} text-lg leading-snug text-[#2b2320]`}>{line.name}</h2>
                    {line.options && <p className="mt-1 text-sm text-[#726757]">{line.options}</p>}
                  </div>
                  <p className="whitespace-nowrap font-medium tabular-nums text-[#2b2320]">
                    {prixAffiche(line.unitPrice * line.quantity, locale)}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-4">
                  {!line.visite && (
                    <div className="flex items-center rounded-full border border-[#9a8d80]">
                      {/* Un lecteur d'écran entend « moins », « plus », « retirer » :
                          sans le nom de la pièce, on ne sait pas laquelle on modifie. */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuantity(line.id, line.quantity - 1);
                          if (line.quantity <= 1) {
                            setAnnonce(fr ? `${line.name} retiré du panier` : `${line.name} removed from the cart`);
                          }
                        }}
                        className="px-3 py-1.5 text-[#5c5140] hover:text-[#2a2116]"
                        aria-label={fr ? `Diminuer la quantité — ${line.name}` : `Decrease quantity — ${line.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        className="px-3 py-1.5 text-[#5c5140] hover:text-[#2a2116]"
                        aria-label={fr ? `Augmenter la quantité — ${line.name}` : `Increase quantity — ${line.name}`}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Le prix unitaire ne se répète que s'il y en a plusieurs. */}
                  {!line.visite && line.quantity > 1 && (
                    <span className="text-sm tabular-nums text-[#726757]">
                      {line.prixCatalogue !== undefined && (
                        <s className="mr-1.5 text-[#6f6357]">{prixAffiche(line.prixCatalogue, locale)}</s>
                      )}
                      {prixAffiche(line.unitPrice, locale)} × {line.quantity}
                    </span>
                  )}
                  {line.remise !== undefined && (
                    <span className="rounded-full bg-[#2b2320]/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#2b2320]">
                      {t.lot.replace("{taux}", String(Math.round(line.remise * 100)))}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      remove(line.id);
                      setAnnonce(fr ? `${line.name} retiré du panier` : `${line.name} removed from the cart`);
                    }}
                    aria-label={fr ? `${t.remove} ${line.name} du panier` : `${t.remove} ${line.name} from the cart`}
                    className="ml-auto -my-1 py-1 text-xs text-[#726757] underline underline-offset-4 hover:text-black"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Le récapitulatif, collé en haut quand la liste défile. */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-[#e8e1d8] p-6">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{t.recap}</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#5c5140]">{t.pieces}</dt>
                <dd className="tabular-nums text-[#2b2320]">{prixAffiche(totalPieces, locale)}</dd>
              </div>
              {/* Livraison par transporteur : son prix ; avec une pose : comprise
                  dans la pose ; sinon (chaise, garde-corps…) : comprise. */}
              <div className="flex justify-between gap-4">
                <dt className="text-[#5c5140]">{t.delivery}</dt>
                <dd className="tabular-nums text-[#2b2320]">
                  {ligneLivraison
                    ? prixAffiche(ligneLivraison.unitPrice, locale)
                    : lignePose
                      ? t.deliveryWithPose
                      : t.deliveryIncluded}
                </dd>
              </div>
              {lignePose && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5c5140]">{t.poseLine}</dt>
                  <dd className="tabular-nums text-[#2b2320]">{prixAffiche(lignePose.unitPrice, locale)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-[#e8e1d8] pt-3">
                <dt className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f6357]">{t.total}</dt>
                <dd className="text-2xl font-medium tabular-nums text-[#2b2320]">{prixAffiche(total, locale)}</dd>
              </div>
              {acompte && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#5c5140]">{t.acompteToday}</dt>
                    <dd className="tabular-nums text-[#2b2320]">{prixAffiche(montantAcompte, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#5c5140]">{t.acompteBalance}</dt>
                    <dd className="tabular-nums text-[#2b2320]">{prixAffiche(solde, locale)}</dd>
                  </div>
                </>
              )}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-[#726757]">{t.shippingNote}</p>

            {/* La ville, avant tout le reste : c'est la première chose que Quentin
                regarde en recevant une commande. */}
            <div className="mt-6">
              <label htmlFor={idVille} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f6357]">
                {t.city}
              </label>
              <input
                id={idVille}
                value={ville}
                onChange={(event) => {
                  setVille(event.target.value);
                  if (event.target.value.trim()) setShowVilleError(false);
                }}
                maxLength={VILLE_MAX}
                autoComplete="address-level2"
                placeholder={t.cityPh}
                aria-invalid={showVilleError && !ville.trim()}
                aria-describedby={showVilleError && !ville.trim() ? idVilleErreur : undefined}
                className="mt-2 w-full rounded-full border border-[#9a8d80] bg-white px-4 py-2.5 text-sm text-[#2b2320] transition-colors placeholder:text-[#726757] focus:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
              />
              <p className="mt-2 text-xs leading-relaxed text-[#726757]">{t.cityNote}</p>
              {showVilleError && !ville.trim() && (
                <p id={idVilleErreur} role="alert" className="mt-2 text-sm text-[#2b2320]">
                  {t.cityRequired}
                </p>
              )}
            </div>

            <label className="mt-4 flex items-start gap-3 text-sm text-[#4a4038]">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => {
                  setAccepted(event.target.checked);
                  if (event.target.checked) setShowCgvError(false);
                }}
                aria-invalid={showCgvError && !accepted}
                aria-describedby={showCgvError && !accepted ? idCgvErreur : undefined}
                className="mt-1 h-4 w-4 accent-[#2b2320]"
              />
              <span>
                {t.cgvAccept}{" "}
                <Link href={`/${locale}/cgv`} className="underline underline-offset-4 hover:text-black">
                  {t.cgvLink}
                </Link>
                .
              </span>
            </label>
            {showCgvError && !accepted && (
              <p id={idCgvErreur} role="alert" className="mt-2 text-sm text-[#2b2320]">
                {t.cgvRequired}
              </p>
            )}

            {problem && (
              <p role="alert" className="mt-5 text-sm leading-relaxed text-[#2b2320]">
                {problem}{" "}
                <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">
                  {t.writeUs}
                </a>
              </p>
            )}

            <button
              type="button"
              onClick={checkout}
              disabled={status === "loading"}
              className="btn-verre mt-6 w-full rounded-full px-8 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white disabled:opacity-60"
            >
              {status === "loading"
                ? t.redirecting
                : acompte
                  ? t.checkoutAcompte.replace("{montant}", prixAffiche(montantAcompte, locale))
                  : t.checkout}
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-[#6f6357]">{t.securedBy}</p>

            {/* L'acompte : un lien discret sous le bouton, qui s'ouvre en une
                case ; il ne se voit pas avant qu'on le cherche. */}
            {!acompte ? (
              <p className="mt-3 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setAcompte(true)}
                  className="text-[#7a6f64] underline underline-offset-4 hover:text-black"
                >
                  {t.acompteLien}
                </button>
              </p>
            ) : (
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#e8e1d8] px-4 py-3 text-sm text-[#4a4038]">
                <input
                  type="checkbox"
                  checked={acompte}
                  onChange={(event) => setAcompte(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#2b2320]"
                />
                <span>
                  {t.acompteToggle}
                  <span className="mt-1 block text-xs leading-relaxed text-[#726757]">
                    {t.acompteInfo.replace("{solde}", prixAffiche(solde, locale))}
                  </span>
                </span>
              </label>
            )}
            {/* La politique s'informe, elle ne se consent pas : la base légale est
                le contrat, donc un simple lien, pas une seconde case à cocher. */}
            <p className="mt-2 text-center text-xs leading-relaxed text-[#6f6357]">
              {t.privacyNote}{" "}
              <Link href={`/${locale}/confidentialite`} className="underline underline-offset-4 hover:text-black">
                {t.privacyLink}
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {/* Ce que le panier vient de faire : le total qui change, la ligne
          retirée. Sans cette zone, le « + » ne produisait aucun son et le
          bouton « Retirer » disparaissait sans un mot. */}
      <p role="status" aria-live="polite" className="sr-only">
        {annonce ? `${annonce}. ` : ""}
        {`${t.total}${fr ? " : " : ": "}${prixAffiche(total, locale)}`}
      </p>
    </div>
  );
}
