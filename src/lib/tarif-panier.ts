// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import {
  livrableParTransporteur,
  poidsColisKg,
  productLocalise,
  resolveSelection,
  SUR_MESURE,
  type PrixReleve,
  type ResolveFailure,
  type ResolvedLine,
} from "./products.ts";
import {
  deplacementPour,
  localiser,
  RAYON_MAX_KM,
  tarifDeplacement,
  tarifLivraison,
  tarifPose,
  LIVRAISON,
  POSE,
  PRISE_DE_COTES,
  RETRAIT,
  libelleLivraison,
  libellePose,
  libellePriseDeCotes,
  libelleRetrait,
  type Deplacement,
  type ModeLivraison,
  type ResultatLieu,
} from "./deplacement.ts";
import { libelleCreneau, lireCreneau, type Creneau } from "./creneau.ts";
import { finitionsDecorGC, lireDecorGC, NOM_GC_DECOR, type ReleveGC } from "./garde-corps.ts";
import { eligibleGarantieCotes, prixGarantieCotes } from "./garantie-cotes.ts";

/* ------------------------------------------------------------------ *
 *  Le tarif d'un panier
 *
 *  UNE fonction, deux usages : /api/commande l'appelle pour dire à Stripe
 *  quoi encaisser, et /api/panier/tarif l'appelle pour que le panier affiche
 *  exactement ces montants-là. Le prix vu est donc le prix payé, ligne par
 *  ligne : pièces, remise sur plusieurs garde-corps, livraison, pose,
 *  retrait à l'atelier, prise de cotes.
 *
 *  Le navigateur n'envoie que des identifiants et des cotes : aucun montant
 *  n'est lu. Le garde-corps se chiffre avec l'outil de plans, que seul le
 *  serveur a (`gc`, fourni par src/lib/prix-garde-corps.server.ts) : ce
 *  fichier-ci ne contient aucun coût.
 * ------------------------------------------------------------------ */

/** Mêmes bornes que le panier (cart.tsx) : au-delà, la commande est refusée. */
export const MAX_LIGNES = 20;
export const MAX_QUANTITE = 10;
/**
 * Ce que le client précise sur une pièce (le relevé d'un garde-corps : étage,
 * mur, allège, fenêtre, « posé à »), en signes. La note la plus longue que la
 * fiche écrit en fait 174 (en anglais) : à 120, le panier et le bon de
 * commande perdaient la hauteur de la fenêtre et « posé à ». Un test vérifie
 * que la plus longue passe entière.
 */
export const MAX_PRECISIONS = 240;

/** Le calcul du garde-corps par l'outil de plans : fourni par le serveur seulement. */
export type CalculGC = {
  /** La forme et le prix de l'outil pour un relevé et une essence. */
  prixReleve: PrixReleve;
  /**
   * La remise d'une commande de plusieurs garde-corps (0 ou négative, en
   * euros) : les frais fixes de l'atelier comptés une seule fois, jamais sous
   * le prix plancher (décision de Quentin du 29/09).
   */
  remise: (lignes: { releve: ReleveGC; essence: string; quantite: number; rosaceMm?: number }[]) => number;
};

/** Une pièce du panier, vérifiée et chiffrée. */
export type PieceTarifee = {
  /** Sa place dans la liste reçue. */
  index: number;
  line: ResolvedLine;
  quantite: number;
  /** Le nom de la pièce, dans la langue du client. */
  nom: string;
  /** Ses options, dans la langue du client (cotes, croix, bois, teinte…). */
  options: string;
  /** Ce que le client a précisé (relevé, mur…), borné. */
  precisions: string;
  /** L'épaisseur demandée d'une pièce sur mesure (plateau, caisson), pour son poids. */
  epaisseurMm?: number;
  /**
   * La Garantie cotes (garantie-cotes.ts) : son prix pour UNE pièce, en euros,
   * si la pièce peut la recevoir (sinon null) — le panier l'affiche à côté de
   * la case —, et si le client l'a cochée.
   */
  garantiePrix: number | null;
  garantie: boolean;
};

/** Comment la commande part : une seule façon par commande. */
export type ModeTarife =
  | { index: number; mode: "transporteur"; codePostal: string; deplacement: Deplacement; kg: number }
  | { index: number; mode: "pose"; codePostal: string; deplacement: Deplacement }
  | { index: number; mode: "retrait" };

export type VisiteTarifee = { index: number; codePostal: string; creneau: Creneau; deplacement: Deplacement; note: string };

/** Ce qui empêche de payer, pour toute la commande. */
export type ProblemeTarif =
  /** Une ligne illisible, deux façons de livrer, ou une Garantie cotes sur ce qui ne peut pas la recevoir. */
  | "invalid"
  /** Le code postal de la livraison, de la pose ou de la visite n'est pas valable. */
  | "code_postal"
  /** Le créneau de la visite est illisible, ou deux visites. */
  | "rdv"
  /** Une pièce trop encombrante pour un transporteur. */
  | "pose_obligatoire"
  /** Des pièces, mais aucune façon de les recevoir choisie. */
  | "mode_livraison";

export type Tarif = {
  pieces: PieceTarifee[];
  /** Les lignes qui ne se vendent plus telles quelles (à retirer du panier). */
  refusees: { index: number; raison: ResolveFailure | "orphelin" }[];
  /**
   * Les pièces dont la Garantie cotes, cochée, ne peut pas être vendue (pièce
   * non éligible, prise de cotes à domicile ou pose par l'atelier dans la
   * commande) : leur place dans la liste reçue. /api/commande refuse alors la
   * commande ; le panier (garantieSouple) décoche la case et continue.
   */
  garantiesRefusees: number[];
  /** Pourquoi aucune Garantie cotes n'est proposée dans cette commande : l'atelier mesure, ou il pose. */
  garantieExclue: "visite" | "pose" | null;
  /** La remise sur plusieurs garde-corps, en euros (0 ou négative). */
  remise: number;
  mode: ModeTarife | null;
  visite: VisiteTarifee | null;
  probleme: ProblemeTarif | null;
  /** Ce que le client paiera, en euros : la somme de tout ce qui précède. */
  total: number;
};

/** Une ligne de texte libre du client, bornée et sans retour à la ligne. */
export const texteBorne = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\r\n\t\u0000-\u001f]+/g, " ").trim().slice(0, max) : "";

const identifiant = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** Une cote : un entier de millimètres, rien d'autre. Le reste est refusé. */
export const coteMm = (value: unknown) => {
  const mm = Number(value);
  return value !== null && value !== "" && Number.isInteger(mm) && mm > 0 && mm <= 10_000 ? mm : undefined;
};

/** Une allège ou une hauteur de fenêtre : un entier de millimètres, zéro permis. */
const hauteurMm = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10_000 ? value : undefined);

/**
 * Le libellé de la ligne, écrit dans la langue du client : il part sur la page
 * de paiement, sur la facture Stripe et dans l'e-mail de confirmation. Les
 * options sont dans le NOM : Stripe ne rend pas la description des lignes.
 */
export function libellePiece(piece: PieceTarifee): string {
  return `${piece.options ? `${piece.nom} — ${piece.options}` : piece.nom}${piece.precisions ? ` — ${piece.precisions}` : ""}`;
}

function optionsTraduites(line: ResolvedLine, locale: "fr" | "en"): { nom: string; options: string } {
  const { product, size, wood, metal, fabric, remplissage } = line;
  const fiche = productLocalise(product, locale);
  const rangTaille = product.sizes.findIndex((taille) => taille.id === size.id);
  // Sous un panneau de verre, ou avec des barreaux seuls (un décor à volutes aussi), il n'y a pas de rosace : on ne l'écrit pas.
  const sousVerre = remplissage?.sansCroix === true || line.gc?.seuls === true;
  // Un décor à volutes : la pièce se nomme « Garde-corps forgé à volutes », et ses finitions suivent les options.
  const decor = line.gc?.releve.decor === undefined ? null : lireDecorGC(line.gc.releve.decor);
  const options =
    [
      product.sizes.length > 1 || size.id === SUR_MESURE ? (rangTaille >= 0 ? fiche.sizes[rangTaille].label : size.label) : null,
      fiche.woods.find((bois) => bois.id === wood?.id)?.label,
      fiche.metals.find((acier) => acier.id === metal?.id)?.label,
      sousVerre ? null : fiche.fabrics?.find((velours) => velours.id === fabric?.id)?.label,
      remplissage && remplissage.id !== fiche.remplissages?.[0]?.id ? fiche.remplissages?.find((option) => option.id === remplissage.id)?.label : null,
      decor ? finitionsDecorGC(line.gc?.decorFriseRetiree ? { ...decor, friseBasse: "aucune" } : decor, locale).join(", ") : null,
    ]
      .filter(Boolean)
      .join(" · ") || line.optionsLabel;
  return { nom: decor ? NOM_GC_DECOR[locale] : fiche.name, options };
}

/**
 * Le tarif d'un panier, tel que Stripe l'encaissera.
 *
 * `lignes` est ce que le navigateur a envoyé, sans confiance : chaque champ
 * est relu et borné. `localiser` situe un code postal (l'annuaire de l'État,
 * voir deplacement.ts) ; les tests en passent un autre.
 */
export async function tarifer(
  lignes: unknown,
  contexte: {
    locale: "fr" | "en";
    gc: CalculGC;
    localiser?: (codePostal: string) => Promise<ResultatLieu>;
    /**
     * Le panier seulement (/api/panier/tarif) : une Garantie cotes qui ne peut
     * pas être vendue est signalée (garantiesRefusees) au lieu de bloquer tout
     * le panier — le panier la décoche. /api/commande garde le refus strict.
     */
    garantieSouple?: boolean;
  }
): Promise<Tarif> {
  const { locale, gc } = contexte;
  const situer = contexte.localiser ?? localiser;
  const tarif: Tarif = { pieces: [], refusees: [], garantiesRefusees: [], garantieExclue: null, remise: 0, mode: null, visite: null, probleme: null, total: 0 };
  const probleme = (p: ProblemeTarif) => {
    tarif.probleme ??= p;
    return tarif;
  };
  if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > MAX_LIGNES) return probleme("invalid");

  // Les façons de livrer et la visite ne se chiffrent qu'une fois toutes les
  // pièces lues : la livraison pèse TOUTES les pièces de la commande.
  let modeLu: { index: number; mode: ModeLivraison; codePostal: string } | null = null;
  let visiteLue: { index: number; codePostal: string; creneau: Creneau; note: string } | null = null;

  for (const [index, brute] of lignes.entries()) {
    // {"lines":[null]} : une ligne qui n'est pas un objet est refusée, pas lue.
    if (!brute || typeof brute !== "object") return probleme("invalid");
    const line = brute as Record<string, unknown>;

    // La Garantie cotes : un oui ou un non, rien d'autre. Un montant, un texte,
    // un nombre (« garantieCotes: 1 ») : la requête est forgée, elle est refusée.
    if (line.garantieCotes !== undefined && line.garantieCotes !== null && typeof line.garantieCotes !== "boolean") return probleme("invalid");
    const garantieDemandee = line.garantieCotes === true;

    if (line.slug === LIVRAISON || line.slug === POSE || line.slug === RETRAIT) {
      // Une livraison ne se garantit pas.
      if (garantieDemandee) return probleme("invalid");
      if (modeLu) return probleme("invalid");
      const mode: ModeLivraison = line.slug === LIVRAISON ? "transporteur" : line.slug === POSE ? "pose" : "retrait";
      const codePostal = mode === "retrait" ? "" : texteBorne(mode === "pose" ? line.poseCp : line.livraisonCp, 10).replace(/\s+/g, "");
      modeLu = { index, mode, codePostal };
      continue;
    }

    if (line.slug === PRISE_DE_COTES) {
      if (garantieDemandee) return probleme("invalid");
      if (visiteLue) return probleme("rdv");
      const creneau = lireCreneau(texteBorne(line.rdv, 30));
      if (!creneau) return probleme("rdv");
      visiteLue = { index, codePostal: texteBorne(line.priseDeCotesCp, 10), creneau, note: texteBorne(line.note, 160) };
      continue;
    }

    const quantite = Number(line.quantity);
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > MAX_QUANTITE) return probleme("invalid");
    const resolu = resolveSelection(
      {
        slug: String(line.slug ?? ""),
        sizeId: identifiant(line.sizeId),
        woodId: identifiant(line.woodId),
        metalId: identifiant(line.metalId),
        fabricId: identifiant(line.fabricId),
        remplissageId: identifiant(line.remplissageId),
        largeurMm: coteMm(line.largeurMm),
        hauteurMm: coteMm(line.hauteurMm),
        epaisseurMm: coteMm(line.epaisseurMm),
        allegeMm: hauteurMm(line.allegeMm),
        enEtage: typeof line.enEtage === "boolean" ? line.enEtage : undefined,
        // Une hauteur de fenêtre absente = inconnue (0) ; une hauteur illisible est refusée (NaN), jamais prise pour « inconnue ».
        fenetreMm: line.fenetreMm === undefined || line.fenetreMm === null ? undefined : (hauteurMm(line.fenetreMm) ?? Number.NaN),
        // (« 20-12-b-t » : 9 signes ; au-delà de 16, ce n'est plus un identifiant.)
        modeleGc: typeof line.modeleGc === "string" ? line.modeleGc.slice(0, 16) : undefined,
        // Le décor à volutes : un identifiant (lireDecorGC) ; au-delà de 64 signes, ce n'en est plus un — il est alors refusé
        // (unknown_decor), jamais coupé pour devenir un autre décor.
        decorGc: line.decorGc === undefined || line.decorGc === null ? undefined : typeof line.decorGc === "string" && line.decorGc.length <= 64 ? line.decorGc : "",
        // Le mur des tableaux (facultatif) : la fixation que l'outil y choisit entre dans le prix. Une cote illisible est
        // refusée (NaN), jamais prise pour « absente » ; un mur illisible aussi (1, true, ["beton"], « » : il devient « ? »,
        // qu'aucun mur ne porte), sinon la ligne passait au prix sans mur ; un mur inconnu : refusé par resolveSelection.
        murGc: line.murGc === undefined || line.murGc === null ? undefined : (identifiant(line.murGc)?.slice(0, 20) ?? "?"),
        tMurMm: line.tMurMm === undefined || line.tMurMm === null ? undefined : (hauteurMm(line.tMurMm) ?? Number.NaN),
        eMurMm: line.eMurMm === undefined || line.eMurMm === null ? undefined : (hauteurMm(line.eMurMm) ?? Number.NaN),
        locale,
      },
      gc.prixReleve
    );
    if (!resolu.ok) {
      tarif.refusees.push({ index, raison: resolu.reason });
      continue;
    }
    const { nom, options } = optionsTraduites(resolu.line, locale);
    // La Garantie cotes : seulement sur une pièce dont le client donne les cotes (garantie-cotes.ts) ; son prix vient
    // du prix unitaire de la ligne, calculé ci-dessus — jamais d'un montant reçu.
    const eligible = eligibleGarantieCotes(resolu.line.product);
    if (garantieDemandee && !eligible) tarif.garantiesRefusees.push(index);
    tarif.pieces.push({
      index,
      line: resolu.line,
      quantite,
      nom,
      options,
      precisions: texteBorne(line.note, MAX_PRECISIONS),
      epaisseurMm: resolu.line.size.id === SUR_MESURE ? coteMm(line.epaisseurMm) : undefined,
      garantiePrix: eligible ? prixGarantieCotes(resolu.line.unitPrice) : null,
      garantie: garantieDemandee && eligible,
    });
  }

  // La Garantie cotes ne se vend pas quand elle ne couvrirait rien : l'atelier prend les cotes lui-même (prise de cotes
  // à domicile), ou il pose la pièce et la mesure sur place (pose par l'atelier ; CGV, article 13).
  // (garantieExclue n'est dit que s'il y a une pièce qui, sans cela, aurait pu la recevoir : le panier l'explique.)
  const exclue = visiteLue ? "visite" : modeLu?.mode === "pose" ? "pose" : null;
  if (exclue && tarif.pieces.some((piece) => piece.garantiePrix !== null)) {
    tarif.garantieExclue = exclue;
    for (const piece of tarif.pieces) {
      if (piece.garantie) tarif.garantiesRefusees.push(piece.index);
      piece.garantie = false;
      piece.garantiePrix = null;
    }
  }
  if (tarif.garantiesRefusees.length > 0 && !contexte.garantieSouple) return probleme("invalid");

  // Plusieurs garde-corps : les frais fixes de l'atelier comptés une fois.
  const gardesCorps = tarif.pieces.filter((p) => p.line.gc);
  if (gardesCorps.length) {
    tarif.remise = gc.remise(gardesCorps.map((p) => ({ releve: p.line.gc!.releve, essence: p.line.gc!.essence, quantite: p.quantite, rosaceMm: p.line.gc!.rosaceMm })));
    if (!Number.isInteger(tarif.remise) || tarif.remise > 0) throw new Error("remise de garde-corps invalide");
  }

  const aChoisir = tarif.pieces.filter((p) => p.line.product.poseOption);
  if (modeLu && aChoisir.length === 0) {
    // Une livraison sans pièce à livrer (la pièce a été retirée du panier, ou
    // elle est refusée : un garde-corps « à étudier ») : elle ne se paie pas,
    // et le total n'affiche jamais un montant sans pièce.
    tarif.refusees.push({ index: modeLu.index, raison: "orphelin" });
    modeLu = null;
  }

  if (modeLu?.mode === "retrait") {
    tarif.mode = { index: modeLu.index, mode: "retrait" };
  } else if (modeLu) {
    const situe = await situer(modeLu.codePostal);
    if (!situe.ok) return probleme("code_postal");
    if (modeLu.mode === "pose") {
      const pose = deplacementPour(situe.lieu, tarifPose);
      if (!pose.ok) return probleme("code_postal");
      tarif.mode = { index: modeLu.index, mode: "pose", codePostal: modeLu.codePostal, deplacement: pose.deplacement };
    } else {
      // Toutes les pièces partent dans la même livraison : leur poids s'additionne, la plus grande cote décide du gabarit.
      let kg = 0;
      let plusGrandeCoteMm = 0;
      for (const p of aChoisir) {
        const { product, size, wood, remplissage, gc: g } = p.line;
        const dims = size.dimsMm;
        if (!g && !livrableParTransporteur(product, { largeurMm: dims?.[0], hauteurMm: dims?.[1] })) return probleme("pose_obligatoire");
        kg += p.quantite * (g ? g.kg : poidsColisKg(product, { largeurMm: dims?.[0], hauteurMm: dims?.[1], epaisseurMm: p.epaisseurMm, woodId: wood?.id, remplissageId: remplissage?.id }));
        plusGrandeCoteMm = Math.max(plusGrandeCoteMm, dims?.[0] ?? 0, dims?.[1] ?? 0);
      }
      const livraison = deplacementPour(situe.lieu, (km) => tarifLivraison(km, kg, plusGrandeCoteMm));
      if (!livraison.ok) return probleme("code_postal");
      tarif.mode = { index: modeLu.index, mode: "transporteur", codePostal: modeLu.codePostal, deplacement: { ...livraison.deplacement, kg: Math.round(kg) }, kg };
    }
  }

  if (visiteLue) {
    const situe = await situer(visiteLue.codePostal);
    if (!situe.ok) return probleme("code_postal");
    const visite = deplacementPour(situe.lieu, tarifDeplacement, RAYON_MAX_KM);
    if (!visite.ok) return probleme("code_postal");
    tarif.visite = { ...visiteLue, deplacement: visite.deplacement };
  }

  if (aChoisir.length > 0 && !tarif.mode && tarif.refusees.length === 0) return probleme("mode_livraison");

  const cents =
    tarif.pieces.reduce((t, p) => t + Math.round(p.line.unitPrice * 100) * p.quantite, 0) +
    tarif.pieces.reduce((t, p) => t + (p.garantie && p.garantiePrix !== null ? p.garantiePrix * 100 * p.quantite : 0), 0) +
    tarif.remise * 100 +
    (tarif.mode && tarif.mode.mode !== "retrait" ? tarif.mode.deplacement.montantCents : 0) +
    (tarif.visite ? tarif.visite.deplacement.montantCents : 0);
  tarif.total = cents / 100;
  return tarif;
}

/* ------------------------------------------------------------------ *
 *  Ce que le panier affiche
 * ------------------------------------------------------------------ */

/** Une ligne du panier, avec le montant que Stripe encaissera. */
export type LigneAffichee = {
  /** Sa place dans la liste envoyée par le panier. */
  index: number;
  type: "piece" | "livraison" | "pose" | "retrait" | "visite";
  nom: string;
  options: string;
  quantite: number;
  /** Prix unitaire, en euros. */
  unitaire: number;
  image?: string;
  /** Un garde-corps : la hauteur retenue par l'outil. Le panier la renvoie avec la commande. */
  hauteurMm?: number;
  /** Une pièce qui peut recevoir la Garantie cotes : son prix pour une pièce, en euros (calculé ici, jamais dans le navigateur). */
  garantiePrix?: number;
  /** La Garantie cotes est cochée sur cette pièce (elle est comptée dans le total). */
  garantie?: boolean;
};

export type TarifAffiche = {
  lignes: LigneAffichee[];
  /** La remise sur plusieurs garde-corps, en euros (0 ou négative). */
  remise: number;
  total: number;
  /** Les lignes à retirer du panier : elles ne se vendent plus telles quelles. */
  refusees: number[];
  /** Les lignes dont la Garantie cotes cochée ne peut pas être vendue : le panier la décoche. */
  garantiesRefusees: number[];
  /** Aucune Garantie cotes proposée : la commande a une prise de cotes à domicile, ou la pose par l'atelier. */
  garantieExclue: "visite" | "pose" | null;
  probleme: ProblemeTarif | null;
};

/** Le tarif, mis en lignes pour le panier : noms et options dans la langue du client. */
export function tarifAffiche(t: Tarif, locale: "fr" | "en"): TarifAffiche {
  const lignes: LigneAffichee[] = t.pieces.map((p) => ({
    index: p.index,
    type: "piece",
    nom: p.nom,
    options: [p.options, p.precisions].filter(Boolean).join(" · "),
    quantite: p.quantite,
    unitaire: p.line.unitPrice,
    image: p.line.image,
    hauteurMm: p.line.gc?.hauteurMm,
    ...(p.garantiePrix !== null ? { garantiePrix: p.garantiePrix, garantie: p.garantie } : {}),
  }));
  if (t.visite) {
    lignes.push({
      index: t.visite.index,
      type: "visite",
      nom: libellePriseDeCotes(t.visite.codePostal, locale),
      options: [libelleCreneau(t.visite.creneau, locale), t.visite.note].filter(Boolean).join(" · "),
      quantite: 1,
      unitaire: t.visite.deplacement.montantCents / 100,
    });
  }
  const m = t.mode;
  if (m?.mode === "retrait") {
    lignes.push({ index: m.index, type: "retrait", nom: libelleRetrait(locale), options: "", quantite: 1, unitaire: 0 });
  } else if (m) {
    lignes.push({
      index: m.index,
      type: m.mode === "pose" ? "pose" : "livraison",
      nom: m.mode === "pose" ? libellePose(m.codePostal, locale) : libelleLivraison(m.codePostal, locale),
      options: m.deplacement.commune,
      quantite: 1,
      unitaire: m.deplacement.montantCents / 100,
    });
  }
  return {
    lignes,
    remise: t.remise,
    total: t.total,
    refusees: t.refusees.map((r) => r.index),
    garantiesRefusees: t.garantiesRefusees,
    garantieExclue: t.garantieExclue,
    probleme: t.probleme,
  };
}
