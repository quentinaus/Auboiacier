"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { prixAffiche } from "@/lib/ui";
import type { TarifAffiche } from "@/lib/tarif-panier";
import { LIVRAISON, POSE, PRISE_DE_COTES, RETRAIT, libelleLivraison, libellePose, libellePriseDeCotes } from "@/lib/deplacement";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";
import { InscriptionOuverture } from "@/components/inscription-ouverture";
import { ChoixConnu } from "@/components/choix-connu";
import type { SourceConnu } from "@/lib/provenance";
import { provenanceVisite } from "@/lib/provenance-visite";

type Status =
  | "idle"
  | "loading"
  | "unavailable"
  | "not_configured"
  | "too_many"
  | "code_postal"
  | "mode_livraison"
  | "changed"
  | "error";

/**
 * Ce que le panier envoie au serveur pour une ligne : des identifiants et des
 * cotes, jamais un prix. La hauteur d'un garde-corps n'est pas envoyée pour
 * le tarif : c'est le serveur qui la calcule (l'outil de plans) ; au paiement,
 * le panier renvoie celle qu'il a AFFICHÉE, et le serveur refuse si elle a
 * changé entre-temps.
 */
function ligneEnvoyee(item: CartItem) {
  const gardeCorps = item.allegeMm !== undefined;
  return {
    slug: item.slug,
    sizeId: item.sizeId,
    largeurMm: item.largeurMm,
    hauteurMm: gardeCorps ? undefined : item.hauteurMm,
    epaisseurMm: item.epaisseurMm,
    allegeMm: item.allegeMm,
    enEtage: item.enEtage,
    fenetreMm: item.fenetreMm,
    modeleGc: item.modeleGc,
    woodId: item.woodId,
    metalId: item.metalId,
    fabricId: item.fabricId,
    remplissageId: item.remplissageId,
    quantity: item.quantity,
    priseDeCotesCp: item.priseDeCotesCp,
    poseCp: item.poseCp,
    livraisonCp: item.livraisonCp,
    rdv: item.rdv,
    note: item.note,
  };
}

/** Longueur maximale de la ville : un nom de commune, pas un roman. */
const VILLE_MAX = 80;


export function CartView({
  t,
  locale,
  contactEmail,
  ouvert,
}: {
  t: Dictionary["panier"];
  locale: "fr" | "en";
  contactEmail: string;
  /** Les commandes sont-elles ouvertes ? Non tant que l'entreprise n'a pas son numéro. */
  ouvert: boolean;
}) {
  const { items, ready, setQuantity, remove } = useCart();
  // Ces intitulés-là ne sont lus que par les lecteurs d'écran : ils ne sont pas
  // dans les dictionnaires, on les écrit ici dans les deux langues.
  const fr = locale === "fr";
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [showCgvError, setShowCgvError] = useState(false);
  /** La visite avant la fin du délai de rétractation : demande expresse du client (art. L221-25 du code de la consommation). */
  const [avantDelai, setAvantDelai] = useState(false);
  const [showAvantDelaiError, setShowAvantDelaiError] = useState(false);
  /**
   * La ville, demandée avant de payer. Stripe recueillera l'adresse complète
   * juste après ; celle-ci arrive plus tôt pour que Quentin sache tout de
   * suite où va la pièce — et elle reste sur le bon de commande même si le
   * client abandonne la page de paiement.
   */
  const [ville, setVille] = useState("");
  /** « Comment nous avez-vous connu ? » : facultatif, il part avec la commande (métadonnées Stripe). */
  const [connu, setConnu] = useState<SourceConnu | null>(null);
  /** Payer 40 % aujourd'hui, le solde à la livraison ou à la pose. */
  const [showVilleError, setShowVilleError] = useState(false);
  const idVille = useId();
  const idVilleErreur = useId();
  /** Ce qui vient de se passer dans le panier, dit à voix haute une seule fois. */
  const [annonce, setAnnonce] = useState("");
  const idCgvErreur = useId();
  const idAvantDelaiErreur = useId();

  /**
   * Le tarif du panier : demandé au serveur (/api/panier/tarif), qui le
   * calcule avec LA fonction dont /api/commande se sert pour dire à Stripe
   * quoi encaisser. Les prix stockés dans le navigateur ne sont qu'une copie
   * d'affichage : ici, chaque montant vient du serveur — les pièces (le
   * garde-corps par l'outil de plans), la remise sur plusieurs garde-corps,
   * la livraison, la pose ou le retrait, la visite. Le prix vu est le prix payé.
   */
  const requete = useMemo(() => JSON.stringify(items.map(ligneEnvoyee)), [items]);
  /** Redemander le tarif après un refus du paiement (un prix qui a changé). */
  const [version, setVersion] = useState(0);
  const [tarif, setTarif] = useState<
    { requete: string; etat: "ok"; data: TarifAffiche } | { requete: string; etat: "erreur" | "indisponible" } | null
  >(null);
  useEffect(() => {
    if (!ready || items.length === 0) return;
    let annule = false;
    const minuteur = setTimeout(async () => {
      try {
        const reponse = await fetch("/api/panier/tarif", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, lines: JSON.parse(requete) }),
        });
        const json = (await reponse.json().catch(() => null)) as TarifAffiche | null;
        if (annule) return;
        if (reponse.ok && json && Array.isArray(json.lignes)) setTarif({ requete, etat: "ok", data: json });
        else setTarif({ requete, etat: reponse.status === 503 ? "indisponible" : "erreur" });
      } catch {
        if (!annule) setTarif({ requete, etat: "erreur" });
      }
    }, 150);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
    // items est lu à travers requete : c'est elle qui change quand le panier change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requete, locale, ready, version]);

  /** Le tarif qui correspond au panier tel qu'il est (pas une réponse en retard). */
  const tarifCourant = tarif && tarif.requete === requete ? tarif : null;
  const donnees = tarifCourant?.etat === "ok" ? tarifCourant.data : null;

  // Ce que le panier affiche : les montants du serveur. Tant qu'ils ne sont
  // pas arrivés, les lignes s'affichent avec leur nom, sans prix.
  const { lines, stale } = useMemo(() => {
    const lines: {
      id: string;
      quantity: number;
      name: string;
      options: string;
      /** Prix unitaire du serveur, ou null tant qu'il n'est pas arrivé. */
      unitPrice: number | null;
      image?: string;
      /** Une visite, une livraison, une pose ou un retrait : quantité figée à un. */
      visite?: boolean;
      /** La ligne de pose, pour le récapitulatif et son icône. */
      pose?: boolean;
      /** La ligne de livraison par transporteur. */
      livraison?: boolean;
      /** Le retrait à l'atelier : gratuit. */
      retrait?: boolean;
      /** La hauteur d'un garde-corps, telle que le serveur l'a calculée et que le client la voit. */
      hauteurMm?: number;
    }[] = [];
    const stale: string[] = [];
    if (donnees) {
      for (const i of donnees.refusees) if (items[i]) stale.push(items[i].id);
      for (const ligne of donnees.lignes) {
        const item = items[ligne.index];
        if (!item) continue;
        lines.push({
          id: item.id,
          quantity: ligne.quantite,
          name: ligne.nom,
          options: ligne.options,
          unitPrice: ligne.unitaire,
          image: ligne.image,
          visite: ligne.type !== "piece",
          pose: ligne.type === "pose",
          livraison: ligne.type === "livraison",
          retrait: ligne.type === "retrait",
          hauteurMm: ligne.hauteurMm,
        });
      }
    } else {
      for (const item of items) {
        lines.push({
          id: item.id,
          quantity: item.quantity,
          name: item.name,
          options: item.optionsLabel,
          unitPrice: null,
          image: item.image,
          visite: [LIVRAISON, POSE, PRISE_DE_COTES, RETRAIT].includes(item.slug),
        });
      }
    }
    // Les pièces d'abord, la livraison et la visite en dernier : elles
    // accompagnent la commande, elles ne la font pas.
    return { lines: [...lines.filter((l) => !l.visite), ...lines.filter((l) => l.visite)], stale };
  }, [items, donnees]);

  // Une ligne que le serveur refuse (une pièce qui ne se vend plus telle
  // quelle, une livraison sans pièce) est retirée : le panier se répare seul.
  useEffect(() => {
    stale.forEach((id) => remove(id));
  }, [stale, remove]);

  const prixConnus = donnees !== null;
  const remise = donnees?.remise ?? 0;
  const total = donnees?.total ?? 0;
  const totalPieces = lines.filter((l) => !l.visite).reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);
  const lignePose = lines.find((l) => l.pose);
  const ligneLivraison = lines.find((l) => l.livraison);
  const ligneRetrait = lines.find((l) => l.retrait);
  const piecesAuPanier = lines.some((l) => !l.visite);
  /** Une prise de cotes à domicile dans le panier (le service, pas une livraison). */
  const visiteAuPanier = items.some((item) => item.slug === PRISE_DE_COTES);
  /** Ce qui empêche de payer, dit par le serveur (une livraison à choisir, un code postal…). */
  const probleme = donnees?.probleme ?? null;

  async function checkout() {
    if (!ville.trim()) {
      setShowVilleError(true);
      return;
    }
    if (!accepted) {
      setShowCgvError(true);
      return;
    }
    if (visiteAuPanier && !avantDelai) {
      setShowAvantDelaiError(true);
      return;
    }
    if (!prixConnus || probleme) return;
    setStatus("loading");
    try {
      const response = await fetch("/api/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          cgvAccepted: true,
          ...(visiteAuPanier ? { visiteAvantDelai: true } : {}),
          ville: ville.trim().slice(0, VILLE_MAX),
          connu,
          // Le lien marqué de l'arrivée sur le site, gardé en mémoire pendant la visite.
          provenance: provenanceVisite(),
          // Les mêmes lignes que pour le tarif affiché ; un garde-corps y joint
          // la hauteur que le client a vue : si elle a changé, le serveur refuse.
          lines: items.map((item) => {
            const vue = lines.find((l) => l.id === item.id)?.hauteurMm;
            return { ...ligneEnvoyee(item), ...(vue !== undefined ? { hauteurMm: vue } : {}) };
          }),
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
            : error === "code_postal" || error === "rdv"
              ? "code_postal"
              : error === "mode_livraison"
                ? "mode_livraison"
                : error === "changed"
                  ? "changed"
                  : "error"
      );
      // Un prix ou une hauteur a changé : le panier redemande son tarif, le client le revoit.
      if (error === "changed" || error === "unavailable") setVersion((v) => v + 1);
      if (error === "cgv") setShowCgvError(true);
      if (error === "avant_delai") setShowAvantDelaiError(true);
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
      <div className="rounded-[28px] bg-[#f5f1ea] px-6 py-14 text-center md:py-20">
        <p className="text-[17px] leading-[1.45] text-[#4a4038] md:text-[21px]">{t.empty}</p>
        <Link
          href={`/${locale}/artisanat`}
          className="btn-plein mt-8"
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
            : status === "mode_livraison"
              ? t.modeManquant
              : status === "changed"
                ? t.prixChange
                : status === "error"
                  ? t.error
                  : // Ce que le tarif dit avant même de payer.
                    tarifCourant?.etat === "indisponible" || tarifCourant?.etat === "erreur"
                    ? t.tarifIndisponible
                    : probleme === "mode_livraison"
                      ? t.modeManquant
                      : probleme === "code_postal" || probleme === "rdv"
                        ? t.badPostcode
                        : probleme
                          ? t.error
                          : null;

  /** Une ligne du panier : la pièce ou le service, son prix, et de quoi la modifier. */
  const rangee = (line: (typeof lines)[number]) => (
            <li key={line.id} className="flex gap-4 py-7 sm:gap-6 md:py-8">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] bg-[#f2f2f1] sm:h-24 sm:w-24 md:h-28 md:w-28">
                {line.image && (
                  <Image src={line.image} alt={line.name} fill sizes="112px" className="object-cover" />
                )}
                {line.visite && (
                  /* Une visite : un calendrier ; une pose ou une livraison : la route ; un retrait : l'atelier. */
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7a6f64"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-full w-full p-5 md:p-7"
                  >
                    {line.retrait ? (
                      <>
                        <path d="M4 20V10l8-5 8 5v10" />
                        <path d="M9.5 20v-6h5v6" />
                      </>
                    ) : line.pose || line.livraison ? (
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
                    <h2 className={`${serif.className} text-[1.25rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.45rem]`}>{line.name}</h2>
                    {line.options && <p className="mt-1.5 text-[15px] leading-[1.45] text-[#5c5140]">{line.options}</p>}
                  </div>
                  <p className="whitespace-nowrap text-[17px] font-medium tabular-nums text-[#2b2320]">
                    {line.unitPrice !== null ? prixAffiche(line.unitPrice * line.quantity, locale) : "…"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
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
                        className="px-3.5 py-2 text-[17px] leading-none text-[#5c5140] hover:text-[#2a2116]"
                        aria-label={fr ? `Diminuer la quantité — ${line.name}` : `Decrease quantity — ${line.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-[15px] tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        className="px-3.5 py-2 text-[17px] leading-none text-[#5c5140] hover:text-[#2a2116]"
                        aria-label={fr ? `Augmenter la quantité — ${line.name}` : `Increase quantity — ${line.name}`}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Le prix unitaire ne se répète que s'il y en a plusieurs. */}
                  {!line.visite && line.quantity > 1 && line.unitPrice !== null && (
                    <span className="text-[15px] tabular-nums text-[#6f6357]">
                      {prixAffiche(line.unitPrice, locale)} × {line.quantity}
                    </span>
                  )}

                  {/* La façon de recevoir la commande ne se retire pas tant qu'il y a des
                      pièces : elle se change sur la fiche de la pièce. */}
                  {!((line.livraison || line.pose || line.retrait) && piecesAuPanier) && (
                  <button
                    type="button"
                    onClick={() => {
                      remove(line.id);
                      setAnnonce(fr ? `${line.name} retiré du panier` : `${line.name} removed from the cart`);
                    }}
                    aria-label={fr ? `${t.remove} ${line.name} du panier` : `${t.remove} ${line.name} from the cart`}
                    className="ml-auto -my-1 py-1 text-[15px] text-[#5c5140] underline decoration-[#5c5140]/40 underline-offset-4 hover:text-black hover:decoration-black"
                  >
                    {t.remove}
                  </button>
                  )}
                </div>
              </div>
            </li>
  );

  return (
    <div>
      {stale.length > 0 && (
        <p role="status" className="mb-8 rounded-[18px] bg-[#f5f1ea] px-5 py-4 text-[15px] leading-[1.5] text-[#2b2320] md:text-[16px]">
          {t.removedLine}
        </p>
      )}

      {/* Deux colonnes : les lignes à gauche, le récapitulatif et le paiement
          à droite, comme un comptoir. Sur téléphone, l'un sous l'autre. */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <ul className="divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
          {[
            ...lines.filter((l) => !l.visite).map(rangee),
            // Plusieurs garde-corps : la remise, une ligne à elle, comme sur la page de paiement.
            remise < 0 ? (
              <li key="remise" className="flex gap-4 py-7 sm:gap-6 md:py-8">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-[#f2f2f1] sm:h-24 sm:w-24 md:h-28 md:w-28" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7a6f64" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full p-5 md:p-7">
                    <path d="M3 12V4h8l10 10-8 8z" />
                    <circle cx="7.5" cy="8.5" r="1.4" />
                  </svg>
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className={`${serif.className} text-[1.25rem] leading-[1.15] tracking-[-0.01em] text-[#2b2320] md:text-[1.45rem]`}>{t.lot}</h2>
                    <p className="mt-1.5 text-[15px] leading-[1.45] text-[#5c5140]">{t.remiseNote}</p>
                  </div>
                  <p className="whitespace-nowrap text-[17px] font-medium tabular-nums text-[#2b2320]">{prixAffiche(remise, locale)}</p>
                </div>
              </li>
            ) : null,
            ...lines.filter((l) => l.visite).map(rangee),
          ]}
        </ul>

        {/* Le récapitulatif, collé en haut quand la liste défile. */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          {/* Façon Apple (Quentin, 06/10/2026) : un panneau papier, un vrai titre, des montants lisibles. */}
          <div className="rounded-[28px] bg-[#f5f1ea] p-6 md:p-8">
            <h2 className={`${serif.className} text-[1.4rem] leading-[1.12] tracking-[-0.01em] text-[#2b2320] md:text-[1.7rem]`}>{t.recap}</h2>
            <dl className="mt-5 space-y-3 text-[16px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#5c5140]">{t.pieces}</dt>
                <dd className="tabular-nums text-[#2b2320]">{prixConnus ? prixAffiche(totalPieces, locale) : "…"}</dd>
              </div>
              {remise < 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5c5140]">{t.lot}</dt>
                  <dd className="tabular-nums text-[#2b2320]">{prixAffiche(remise, locale)}</dd>
                </div>
              )}
              {/* Livraison par transporteur : son prix ; avec une pose : comprise
                  dans la pose ; retrait à l'atelier : gratuit. */}
              {(piecesAuPanier || ligneLivraison || lignePose || ligneRetrait) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5c5140]">{t.delivery}</dt>
                  <dd className="tabular-nums text-[#2b2320]">
                    {ligneLivraison
                      ? ligneLivraison.unitPrice !== null
                        ? prixAffiche(ligneLivraison.unitPrice, locale)
                        : "…"
                      : lignePose
                        ? t.deliveryWithPose
                        : ligneRetrait
                          ? t.retrait
                          : "—"}
                  </dd>
                </div>
              )}
              {lignePose && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5c5140]">{t.poseLine}</dt>
                  <dd className="tabular-nums text-[#2b2320]">{lignePose.unitPrice !== null ? prixAffiche(lignePose.unitPrice, locale) : "…"}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-[#e0d7cb] pt-4">
                <dt className="text-[17px] font-semibold text-[#2b2320]">{t.total}</dt>
                <dd className="text-[1.75rem] font-medium tracking-[-0.01em] tabular-nums text-[#2b2320]">{prixConnus ? prixAffiche(total, locale) : "…"}</dd>
              </div>
            </dl>
            {/* En attendant le serveur : les prix arrivent, rien ne se paie encore. */}
            {!prixConnus && !tarifCourant && <p className="mt-3 text-[14px] text-[#6f6357]">{t.tarifCalcul}</p>}
            <p className="mt-3 text-[14px] leading-[1.5] text-[#6f6357]">{t.shippingNote}</p>

            {ouvert ? (
              <>
            {/* La ville, avant tout le reste : c'est la première chose que Quentin
                regarde en recevant une commande. */}
            <div className="mt-7">
              <label htmlFor={idVille} className="block text-[15px] font-medium text-[#2b2320]">
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
                className="mt-2 w-full rounded-full border border-[#9a8d80] bg-white px-4 py-3 text-[16px] text-[#2b2320] transition-colors placeholder:text-[#6f6357] focus:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
              />
              <p className="mt-2 text-[14px] leading-[1.5] text-[#6f6357]">{t.cityNote}</p>
              {showVilleError && !ville.trim() && (
                <p id={idVilleErreur} role="alert" className="mt-2 text-[15px] text-[#2b2320]">
                  {t.cityRequired}
                </p>
              )}
            </div>

            <ChoixConnu
              locale={locale}
              valeur={connu}
              onChange={setConnu}
              className="mt-5"
              classeLibelle="block text-[14px] font-semibold text-[#5c5140]"
              classeChamp="mt-2 w-full rounded-full border border-[#9a8d80] bg-white px-4 py-2.5 text-[15px] text-[#2b2320] transition-colors focus:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
            />

            <label className="mt-5 flex items-start gap-3 text-[15px] leading-[1.5] text-[#4a4038]">
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
              <p id={idCgvErreur} role="alert" className="mt-2 text-[15px] text-[#2b2320]">
                {t.cgvRequired}
              </p>
            )}

            {/* Une prise de cotes est un SERVICE : 14 jours de rétractation.
                La visite tombe presque toujours dans ce délai ; la loi exige
                alors que le client le demande expressément, case non cochée
                d'avance. Sans elle, il pourrait se faire rembourser une
                visite déjà faite. */}
            {visiteAuPanier && (
              <>
                <label className="mt-5 flex items-start gap-3 text-[15px] leading-[1.5] text-[#4a4038]">
                  <input
                    type="checkbox"
                    checked={avantDelai}
                    onChange={(event) => {
                      setAvantDelai(event.target.checked);
                      if (event.target.checked) setShowAvantDelaiError(false);
                    }}
                    aria-invalid={showAvantDelaiError && !avantDelai}
                    aria-describedby={showAvantDelaiError && !avantDelai ? idAvantDelaiErreur : undefined}
                    className="mt-1 h-4 w-4 accent-[#2b2320]"
                  />
                  <span>{t.avantDelaiAccept}</span>
                </label>
                {showAvantDelaiError && !avantDelai && (
                  <p id={idAvantDelaiErreur} role="alert" className="mt-2 text-[15px] text-[#2b2320]">
                    {t.avantDelaiRequired}
                  </p>
                )}
              </>
            )}

            {problem && (
              <p role="alert" className="mt-5 text-[15px] leading-[1.5] text-[#2b2320]">
                {problem}{" "}
                <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">
                  {t.writeUs}
                </a>
              </p>
            )}

            <button
              type="button"
              onClick={checkout}
              disabled={status === "loading" || !prixConnus || probleme !== null}
              className="btn-plein mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "loading" ? t.redirecting : t.checkout}
            </button>
            <p className="mt-4 text-center text-[14px] leading-[1.5] text-[#6f6357]">{t.securedBy}</p>

            {/* La politique s'informe, elle ne se consent pas : la base légale est
                le contrat, donc un simple lien, pas une seconde case à cocher. */}
            <p className="mt-2 text-center text-[14px] leading-[1.5] text-[#6f6357]">
              {t.privacyNote}{" "}
              <Link href={`/${locale}/confidentialite`} className="underline underline-offset-4 hover:text-black">
                {t.privacyLink}
              </Link>
            </p>
              </>
            ) : (
              <>
            {/* Avant l'immatriculation, on n'encaisse pas : le client laisse son
                e-mail et l'atelier le prévient le jour de l'ouverture. */}
            <div className="mt-7 rounded-[20px] bg-white p-5 md:p-6">
              <p className="text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#2b2320]">{t.prevenirTitre}</p>
              <p className="mt-2 text-[15px] leading-[1.55] text-[#4a4038]">{t.prevenirTexte}</p>
              <InscriptionOuverture
                t={t}
                locale={locale}
                contactEmail={contactEmail}
                lignes={lines.map(
                  (line) =>
                    `${line.name}${line.options ? ` (${line.options})` : ""} × ${line.quantity}${line.unitPrice === null ? "" : ` — ${prixAffiche(line.unitPrice * line.quantity, locale)}`}`,
                )}
              />
            </div>
            <p className="mt-5 text-center text-[15px] leading-[1.5] text-[#4a4038]">
              {t.prevenirDevis}{" "}
              <Link href={`/${locale}/devis`} className="underline underline-offset-4 hover:text-black">
                {t.prevenirDevisLien}
              </Link>
            </p>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Ce que le panier vient de faire : le total qui change, la ligne
          retirée. Sans cette zone, le « + » ne produisait aucun son et le
          bouton « Retirer » disparaissait sans un mot. */}
      <p role="status" aria-live="polite" className="sr-only">
        {annonce ? `${annonce}. ` : ""}
        {prixConnus ? `${t.total}${fr ? " : " : ": "}${prixAffiche(total, locale)}` : ""}
      </p>
    </div>
  );
}
