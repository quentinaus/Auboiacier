import { idDecorGC, lireDecorGC, lireModeleGC, lireMurParametresGC } from "@/lib/garde-corps";
import { NextResponse, after } from "next/server";
import { compter } from "@/lib/compteurs";
import { SUR_MESURE, getProduct, poidsColisKg, prixParOutil } from "@/lib/products";
import { calculerLivraison, calculerPose, localiser } from "@/lib/deplacement";
import { composerDevis, type Devis, type LivraisonDevis, type ResultatDevis } from "@/lib/devis";
import { ChiffrageIndisponible, composerDevisGardeCorps, type LivraisonDevisGC } from "@/lib/prix-garde-corps.server";
import { rendreDevisPdf } from "@/lib/devis-pdf";
import { creerLimite } from "@/lib/limite-debit";
import { budgetCalculGC } from "@/lib/budget-calcul-gc";
import { EMAIL_VALIDE, MAX_TEXTE } from "@/lib/devis-regles";
import { siteOrigin } from "@/lib/stripe";
import { isLocale } from "@/lib/i18n";
import { eligibleGarantieCotes, prixGarantieCotes } from "@/lib/garantie-cotes";
import { prixAffiche } from "@/lib/ui";

export const runtime = "nodejs";
/** Géocodage, photo, police, rendu : jamais plus de vingt secondes. */
export const maxDuration = 20;

/**
 * Le devis en PDF d'une pièce configurée sur sa fiche.
 *
 * Tout arrive dans l'adresse (le bouton de la fiche est un simple lien qui
 * s'ouvre dans un nouvel onglet) : la pièce, ses options, ses cotes, la
 * quantité, le mode de livraison et le code postal. Aucun montant n'est lu :
 * le prix de la pièce vient de resolveSelection, celui de la livraison du
 * même géocodage que le panier. Un lien forgé ne peut donc pas produire un
 * devis à un prix qui n'existe pas.
 *
 * Le garde-corps de fenêtre a son propre devis : celui de l'outil de plans,
 * avec les mêmes lignes et le même total (décision du 29/09), composé sur le
 * serveur à partir du relevé (l, allege, etage, fenetre ; et le mur des
 * tableaux, mur, c, ep, quand le client l'a donné : la fixation est au prix).
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 30 });

/** Un entier positif borné, ou rien. */
function entier(valeur: string | null, max: number): number | undefined {
  if (valeur === null || valeur === "") return undefined;
  const n = Number(valeur);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : undefined;
}

/** Un identifiant d'option : lettres, chiffres et tirets seulement. */
function identifiant(valeur: string | null): string | undefined {
  return valeur && /^[a-z0-9-]{1,40}$/i.test(valeur) ? valeur : undefined;
}

/**
 * Les coordonnées imprimées sur le devis, lues dans l'adresse du lien.
 *
 * Ce PDF sort de auboiacier.fr, au vrai prix : n'importe quel texte qu'on y
 * laisse entrer devient « un devis Auboiacier ». Un champ libre suffisait à un
 * escroc pour envoyer un lien vers un vrai devis portant « Acompte à virer sur
 * IBAN FR76… ». On ne garde donc que ce que la fiche envoie vraiment — un nom
 * et une adresse e-mail — et sous une forme qui ne peut rien dire d'autre :
 * des lettres pour le nom, une adresse valide pour l'e-mail. Ni note, ni
 * adresse postale, ni téléphone (la fiche n'en envoie pas).
 */
function nomClient(valeur: string | null): string | undefined {
  if (!valeur) return undefined;
  // Ni chiffre (un IBAN, un téléphone), ni point (une adresse web), 60 signes.
  const propre = valeur.replace(/[^\p{L} '’-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return propre.length >= 2 ? propre : undefined;
}
function emailClient(valeur: string | null): string | undefined {
  const propre = (valeur ?? "").trim().slice(0, MAX_TEXTE.email);
  return EMAIL_VALIDE.test(propre) ? propre : undefined;
}

export async function GET(request: Request) {
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const url = new URL(request.url);
  const p = url.searchParams;

  const slug = identifiant(p.get("slug"));
  const product = slug ? getProduct(slug) : undefined;
  if (!product) return NextResponse.json({ error: "unknown_slug" }, { status: 400 });

  const langue = p.get("lang") ?? "fr";
  const locale = isLocale(langue) ? langue : "fr";
  const client = { nom: nomClient(p.get("nom")), email: emailClient(p.get("email")) };
  const mode = p.get("mode");
  const cp = (p.get("cp") ?? "").replace(/\s+/g, "");

  let resultat: ResultatDevis;
  if (prixParOutil(product)) {
    // Le garde-corps : le relevé, et une façon de le recevoir (transporteur, pose ou retrait).
    const mm = (cle: string) => {
      const t = p.get(cle);
      return t !== null && /^\d{1,5}$/.test(t) ? Number(t) : undefined;
    };
    const largeurMm = mm("l");
    const allegeMm = mm("allege");
    const fenetreMm = mm("fenetre") ?? 0;
    const etage = p.get("etage");
    const woodId = identifiant(p.get("wood"));
    if (largeurMm === undefined || allegeMm === undefined || (etage !== "1" && etage !== "0") || !woodId) {
      return NextResponse.json({ error: "unknown_size" }, { status: 400 });
    }
    // Comme /api/prix-garde-corps : une option absente est celle du modèle
    // (ligneGC), une option illisible est refusée — jamais remplacée en silence.
    const option = (cle: string) => {
      const t = p.get(cle);
      return t === null ? undefined : (identifiant(t) ?? null);
    };
    const metalId = option("metal");
    const fabricId = option("fabric");
    const remplissageId = option("remplissage");
    if (metalId === null || fabricId === null || remplissageId === null) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    // Le modèle choisi : « 16-3 ». Illisible : refusé. Non conforme : le calcul le refuse plus bas.
    const modele = p.get("modele");
    if (modele !== null && !lireModeleGC(modele)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    // Le décor à volutes : « frise.S.bouton.soudure.carre.aucune.0 ». Illisible : refusé. Il remplace le modèle.
    const decorBrut = p.get("decor");
    const decor = decorBrut === null ? null : lireDecorGC(decorBrut);
    if (decorBrut !== null && !decor) return NextResponse.json({ error: "invalid" }, { status: 400 });
    // Le Garde-corps forgé à volutes a toujours un décor ; le garde-corps Rosace, jamais (07/10/2026) : le devis est celui de la fiche.
    if (product.decorsGC === true ? !decor : decor !== null) return NextResponse.json({ error: "invalid" }, { status: 400 });
    // Le mur des tableaux (facultatif) : illisible, refusé — la fixation change le prix, jamais remplacée en silence.
    const mur = lireMurParametresGC(p);
    if (mur === null) return NextResponse.json({ error: "invalid" }, { status: 400 });
    let livraison: LivraisonDevisGC;
    if (mode === "retrait") livraison = { mode: "retrait" };
    else if (mode === "transporteur" || mode === "pose") {
      if (!/^\d{5}$/.test(cp)) return NextResponse.json({ error: "code_postal_invalide" }, { status: 400 });
      const situe = await localiser(cp);
      if (!situe.ok) return NextResponse.json({ error: situe.reason }, { status: 400 });
      livraison = { mode, codePostal: cp, lieu: situe.lieu };
    } else return NextResponse.json({ error: "mode_livraison" }, { status: 400 });
    // Composer ce devis, c'est calculer le garde-corps : même budget de temps que la fiche.
    if (budgetCalculGC.epuise(request, Date.now())) {
      return NextResponse.json({ error: "too_many" }, { status: 429 });
    }
    const debut = performance.now();
    try {
      resultat = composerDevisGardeCorps({
        releve: { largeurMm, allegeMm, enEtage: etage === "1", fenetreMm, ...(decor ? { decor: idDecorGC(decor) } : modele ? { modele } : {}), ...mur },
        options: { woodId, metalId, fabricId, remplissageId },
        quantite: entier(p.get("qty"), 10) ?? 1,
        livraison,
        client,
        date: new Date(),
        locale,
        // Le domaine du site, jamais l'hôte de la requête : la photo du devis
        // est téléchargée par le serveur à cette adresse, et un en-tête Host
        // forgé l'aurait envoyé chercher ailleurs.
        origine: siteOrigin(),
      });
      budgetCalculGC.depenser(request, performance.now() - debut, Date.now());
    } catch (erreur) {
      if (erreur instanceof ChiffrageIndisponible) return NextResponse.json({ error: "indisponible" }, { status: 503 });
      throw erreur;
    }
  } else {
    resultat = await devisCatalogue(p, product, locale, mode, cp, client, siteOrigin());
  }
  if (!resultat.ok) return NextResponse.json({ error: resultat.reason }, { status: 400 });
  // La Garantie cotes ne se coche qu'au panier : le devis dit seulement qu'elle existe, et son prix pour cette pièce.
  if (resultat.devis.nature === "devis" && resultat.prixPiece !== undefined && eligibleGarantieCotes(product)) {
    const prix = prixAffiche(prixGarantieCotes(resultat.prixPiece), locale);
    resultat.devis.conditions.push(
      locale === "en"
        ? `Measurement guarantee available in the cart: +${prix} per piece — one alteration or remake if your measurements were wrong (terms of sale, article 13).`
        : `Garantie cotes disponible au panier : +${prix} par pièce — une modification ou une refabrication si vos cotes étaient fausses (CGV, article 13).`
    );
  }
  const reponse = await pdfDuDevis(resultat.devis, locale);
  // Un devis PDF de plus au compteur : la famille de la pièce, rien d'autre —
  // surtout pas le nom ni l'e-mail que porte l'adresse de ce lien.
  after(() => compter("devis_pdf", { famille: product.famille }, request));
  return reponse;
}

/** Le devis d'une pièce du catalogue (table, chaise, lumière) : composerDevis. */
async function devisCatalogue(
  p: URLSearchParams,
  product: NonNullable<ReturnType<typeof getProduct>>,
  locale: "fr" | "en",
  mode: string | null,
  cp: string,
  client: { nom?: string; adresse?: string; email?: string; telephone?: string },
  origine: string
): Promise<ResultatDevis> {
  const sizeId = identifiant(p.get("size"));
  const surMesure = sizeId === SUR_MESURE;
  const largeurMm = surMesure ? entier(p.get("l"), 20000) : undefined;
  const hauteurMm = surMesure ? entier(p.get("w"), 20000) : undefined;
  const epaisseurMm = surMesure ? entier(p.get("t"), 1000) : undefined;
  const woodId = identifiant(p.get("wood"));
  const remplissageId = identifiant(p.get("remplissage"));
  const quantity = entier(p.get("qty"), 10) ?? 1;

  // La livraison : par transporteur (au poids de la pièce), avec la pose, ou retirée à l'atelier.
  let livraison: LivraisonDevis | null = null;
  if (mode === "retrait" && product.poseOption) {
    livraison = { mode: "retrait" };
  } else if ((mode === "transporteur" || mode === "pose") && product.poseOption) {
    if (!/^\d{5}$/.test(cp)) return { ok: false, reason: "code_postal_invalide" };
    const dims = surMesure ? [largeurMm, hauteurMm] : (product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0])?.dimsMm;
    const kg =
      poidsColisKg(product, { largeurMm: dims?.[0], hauteurMm: dims?.[1], epaisseurMm, woodId, remplissageId }) * quantity;
    const plusGrandeCoteMm = Math.max(dims?.[0] ?? 0, dims?.[1] ?? 0);
    const calcul = mode === "pose" ? await calculerPose(cp) : await calculerLivraison(cp, kg, plusGrandeCoteMm);
    if (!calcul.ok) return { ok: false, reason: calcul.reason };
    livraison = { mode, codePostal: cp, deplacement: calcul.deplacement };
  }

  return composerDevis({
    selection: {
      slug: product.slug,
      sizeId,
      woodId,
      metalId: identifiant(p.get("metal")),
      fabricId: identifiant(p.get("fabric")),
      remplissageId,
      largeurMm,
      hauteurMm,
      epaisseurMm,
    },
    quantity,
    hauteurTableMm: entier(p.get("h"), 2000),
    livraison,
    client,
    date: new Date(),
    locale,
    origine,
  });
}

async function pdfDuDevis(devis: Devis, locale: "fr" | "en") {
  const pdf = await rendreDevisPdf(devis);
  // « Devis-Auboiacier-Table-Mikado-D-20260920-3KS01.pdf » : sans accent ni
  // espace, pour que tous les navigateurs gardent le nom tel quel.
  const nature =
    locale === "en"
      ? devis.nature === "estimation"
        ? "Estimate"
        : "Quote"
      : devis.nature === "estimation"
        ? "Estimation"
        : "Devis";
  const piece = devis.piece.nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const nom = `${nature}-Auboiacier-${piece}-${devis.numero}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nom}"`,
      "cache-control": "private, no-store",
    },
  });
}
