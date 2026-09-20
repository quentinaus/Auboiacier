import { NextResponse } from "next/server";
import { SUR_MESURE, getProduct, poidsColisKg } from "@/lib/products";
import { calculerLivraison, calculerPose } from "@/lib/deplacement";
import { composerDevis, type LivraisonDevis } from "@/lib/devis";
import { rendreDevisPdf } from "@/lib/devis-pdf";
import { creerLimite } from "@/lib/limite-debit";
import { isLocale } from "@/lib/i18n";

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

/** Un texte libre du client, sans caractères de contrôle, borné. */
function texte(valeur: string | null, max: number): string | undefined {
  if (!valeur) return undefined;
  const propre = valeur.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
  return propre || undefined;
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
  const sizeId = identifiant(p.get("size"));
  const surMesure = sizeId === SUR_MESURE;
  const largeurMm = surMesure ? entier(p.get("l"), 20000) : undefined;
  const hauteurMm = surMesure ? entier(p.get("w"), 20000) : undefined;
  const epaisseurMm = surMesure ? entier(p.get("t"), 1000) : undefined;
  const quantity = entier(p.get("qty"), 10) ?? 1;

  // La livraison : par transporteur (au poids de la pièce) ou avec la pose.
  const mode = p.get("mode");
  const cp = (p.get("cp") ?? "").replace(/\s+/g, "");
  let livraison: LivraisonDevis | null = null;
  if ((mode === "transporteur" || mode === "pose") && product.poseOption) {
    if (!/^\d{5}$/.test(cp)) return NextResponse.json({ error: "code_postal_invalide" }, { status: 400 });
    const dims = surMesure ? [largeurMm, hauteurMm] : (product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0])?.dimsMm;
    const kg =
      poidsColisKg(product, { largeurMm: dims?.[0], hauteurMm: dims?.[1], epaisseurMm }) * quantity;
    const calcul = mode === "pose" ? await calculerPose(cp) : await calculerLivraison(cp, kg);
    if (!calcul.ok) return NextResponse.json({ error: calcul.reason }, { status: 400 });
    livraison = { mode, codePostal: cp, deplacement: calcul.deplacement };
  }

  const resultat = composerDevis({
    selection: {
      slug: product.slug,
      sizeId,
      woodId: identifiant(p.get("wood")),
      metalId: identifiant(p.get("metal")),
      fabricId: identifiant(p.get("fabric")),
      remplissageId: identifiant(p.get("remplissage")),
      largeurMm,
      hauteurMm,
      epaisseurMm,
    },
    quantity,
    hauteurTableMm: entier(p.get("h"), 2000),
    note: texte(p.get("note"), 500),
    livraison,
    client: { nom: texte(p.get("nom"), 120), adresse: texte(p.get("adresse"), 300) },
    date: new Date(),
    locale,
    origine: url.origin,
  });
  if (!resultat.ok) return NextResponse.json({ error: resultat.reason }, { status: 400 });

  const pdf = await rendreDevisPdf(resultat.devis);
  // « Devis-Auboiacier-Table-Mikado-D-20260920-3KS01.pdf » : sans accent ni
  // espace, pour que tous les navigateurs gardent le nom tel quel.
  const nature =
    locale === "en"
      ? resultat.devis.nature === "estimation"
        ? "Estimate"
        : "Quote"
      : resultat.devis.nature === "estimation"
        ? "Estimation"
        : "Devis";
  const piece = resultat.devis.piece.nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const nom = `${nature}-Auboiacier-${piece}-${resultat.devis.numero}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nom}"`,
      "cache-control": "private, no-store",
    },
  });
}
