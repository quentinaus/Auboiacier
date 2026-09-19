// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.
import type { Locale } from "./i18n.ts";
import {
  SUR_MESURE,
  computeUnitPrice,
  getProduct,
  poidsColisKg,
  productLocalise,
  remiseLot,
  resolveSelection,
  surfaceM2,
  type Product,
  type ProductSize,
  type ProductSwatch,
  type Remplissage,
  type Selection,
} from "./products.ts";
import type { Deplacement } from "./deplacement.ts";
import { ENTREPRISE } from "./entreprise.ts";

/* ------------------------------------------------------------------ *
 *  Le devis d'une pièce configurée
 *
 *  Ce que le client télécharge depuis la fiche, une fois ses choix faits :
 *  un document qui dit exactement ce qu'il commande — la pièce, ses cotes,
 *  ses matières, sa livraison — et ce qu'il paiera. Tout est recalculé ici,
 *  côté serveur, avec les mêmes fonctions que le paiement (resolveSelection,
 *  poidsColisKg, remiseLot) : le devis ne peut pas dire autre chose que le
 *  panier.
 *
 *  Chaque famille de pièce a ses propres lignes de caractéristiques : on ne
 *  parle pas d'épaisseur de plateau pour une chaise, ni de puissance pour
 *  une table. Ce module ne fait que composer les données ; la mise en page
 *  est dans devis-pdf.tsx.
 * ------------------------------------------------------------------ */

/** Combien de jours le prix reste garanti. */
export const VALIDITE_JOURS = 30;
/** La part encaissée à la commande quand le client choisit l'acompte (voir /api/commande). */
export const TAUX_ACOMPTE = 0.4;

export type Caracteristique = { label: string; value: string };

export type LigneDevis = {
  designation: string;
  /** Les précisions sous la désignation, une par ligne. */
  details: string[];
  quantite: number;
  /** Prix unitaire en euros, remise de lot déjà comptée. */
  unitaire: number;
  /** Prix unitaire avant remise de lot, quand elle s'applique. */
  avantRemise?: number;
  total: number;
};

export type LivraisonDevis = {
  mode: "transporteur" | "pose";
  codePostal: string;
  deplacement: Deplacement;
};

export type EntreeDevis = {
  selection: Selection;
  quantity: number;
  /** La hauteur finie d'une table à vos cotes, quand elle n'est pas 75 cm. */
  hauteurTableMm?: number;
  /** Ce que le client a précisé (relevé d'un garde-corps, d'un escalier). */
  note?: string;
  livraison?: LivraisonDevis | null;
  client?: { nom?: string; adresse?: string };
  date: Date;
  locale: Locale;
  /** L'adresse du site, pour la photo de la pièce et le lien de commande. */
  origine: string;
};

export type Devis = {
  /** « Devis » pour une pièce achetable ; « Estimation » pour une pièce sur devis. */
  nature: "devis" | "estimation";
  numero: string;
  date: string;
  validite: string;
  locale: Locale;
  emetteur: { nom: string; lignes: string[] };
  client: { nom?: string; adresse?: string };
  piece: {
    nom: string;
    accroche: string;
    /** L'adresse absolue de la photo dans la configuration choisie (JPEG ou PNG seulement). */
    photo?: string;
    caracteristiques: Caracteristique[];
  };
  lignes: LigneDevis[];
  total: number;
  acompte: number;
  solde: number;
  delai: string;
  conditions: string[];
  /** Le lien vers la fiche, pour commander en ligne. */
  lienFiche: string;
};

export type ResultatDevis = { ok: true; devis: Devis } | { ok: false; reason: string };

/* ------------------------------------------------------------------ *
 *  Textes du devis, dans les deux langues
 * ------------------------------------------------------------------ */
const TEXTES = {
  fr: {
    dimensions: "Dimensions",
    plateau: "Plateau",
    epaisseur: "Épaisseur du plateau",
    hauteur: "Hauteur finie",
    surface: "Surface du plateau",
    places: "Capacité",
    placesEnv: "{n} places environ",
    placesN: "{n} places",
    essence: "Essence",
    pietement: "Piétement",
    teinte: "Teinte de l'acier",
    finition: "Finition du bois",
    huileCire: "Huile-cire, satinée",
    assise: "Assise",
    coussins: "Coussins",
    structure: "Structure",
    velours: "Velours",
    toile: "Toile",
    cadre: "Cadre",
    couleurCadre: "Couleur du cadre",
    eclairage: "Éclairage",
    puissance: "Puissance",
    caisson: "Profondeur du caisson",
    surfaceLumineuse: "Surface lumineuse",
    pose: "Pose",
    largeurTableau: "Largeur entre tableaux",
    hauteurGc: "Hauteur du garde-corps",
    remplissage: "Remplissage",
    rosace: "Rosace",
    mainCourante: "Main courante",
    normes: "Normes",
    releve: "Relevé du client",
    forme: "Forme",
    marches: "Marches",
    limon: "Limon",
    gardeCorps: "Garde-corps",
    hauteurEscalier: "Hauteur à monter",
    fabrication: "Fabrication",
    surMesure: "Sur mesure, à vos cotes",
    catalogue: "Format du catalogue",
    pieceLigne: "{nom} — {options}",
    lot: "Prix de lot : remise de {taux} % dès {n} pièces dans la même commande",
    transporteur: "Livraison par transporteur — {commune} ({cp})",
    transporteurTable: "Livrée démontée : plateau, piétement soudé d'une pièce, visserie et notice de montage. Colis estimé à {kg} kg.",
    transporteurPiece: "Livrée prête à poser, emballée à l'atelier. Colis estimé à {kg} kg.",
    transporteurNote: "Prix estimé selon la ville, le poids et les dimensions, à {km} km de Saumur.",
    poseLigne: "Livraison et pose par l'atelier — {commune} ({cp})",
    poseDetail: "Un seul déplacement depuis Saumur ({km} km) : livraison, montage et mise à niveau sur place, par nos soins.",
    poseDetailGc: "Un seul déplacement depuis Saumur ({km} km) : livraison et encastrement dans le tableau de la fenêtre, par nos soins.",
    poseDetailLumiere: "Un seul déplacement depuis Saumur ({km} km) : livraison, fixation et raccordement du plafond lumineux, par nos soins.",
    sansLivraison: "Livraison en France métropolitaine comprise, fixations et notice de pose fournies.",
    delaiInconnu: "Sur commande",
    emetteurLignes: ["Métallerie d'art — atelier à Saumur (49400), Maine-et-Loire", "auboiacier@gmail.com — auboiacier.fr"],
    conditions: {
      prix: "Prix en euros, montant total à payer ; le régime de TVA de l'atelier est rappelé sur la facture.",
      validite: `Devis valable ${VALIDITE_JOURS} jours à compter de sa date, pour la configuration décrite ci-dessus.`,
      paiement:
        "Paiement à la commande, par carte, sur auboiacier.fr — en une fois, ou par un acompte de 40 % suivi du solde de 60 % prélevé le jour de la livraison ou de la pose.",
      delai: "Chaque pièce est fabriquée à la commande dans notre atelier : le délai indiqué court à compter du paiement ou de l'acompte.",
      transporteur:
        "Livraison sur rendez-vous, au pied du camion, sans montage. Le prix de transport est estimé à la commande d'après le poids, les dimensions et la distance.",
      pose: "Livraison et pose sur rendez-vous, en un seul déplacement ; l'accès et l'emplacement doivent être dégagés le jour convenu.",
      retractation:
        "Pièce fabriquée aux spécifications du client : le droit de rétractation de quatorze jours ne s'applique pas (art. L221-28 3° du code de la consommation).",
      garantie:
        "Garantie légale de conformité (deux ans à compter de la livraison) et garantie légale des vices cachés. Le bois et l'acier sont des matières vivantes : de légères variations de teinte et de veinage sont normales.",
      cgv: "Les conditions générales de vente, disponibles sur auboiacier.fr/fr/cgv, s'appliquent à toute commande.",
      estimation:
        "Cette estimation est établie d'après les cotes et les choix indiqués sur le site. Le devis définitif est remis après le relevé de cotes à domicile ; il vaut offre de vente.",
    },
  },
  en: {
    dimensions: "Dimensions",
    plateau: "Top",
    epaisseur: "Top thickness",
    hauteur: "Finished height",
    surface: "Top area",
    places: "Seats",
    placesEnv: "about {n} seats",
    placesN: "{n} seats",
    essence: "Wood",
    pietement: "Base",
    teinte: "Steel colour",
    finition: "Wood finish",
    huileCire: "Hardwax oil, satin",
    assise: "Seat",
    coussins: "Cushions",
    structure: "Frame",
    velours: "Velvet",
    toile: "Membrane",
    cadre: "Frame",
    couleurCadre: "Frame colour",
    eclairage: "Lighting",
    puissance: "Power",
    caisson: "Box depth",
    surfaceLumineuse: "Lit area",
    pose: "Installation",
    largeurTableau: "Width between reveals",
    hauteurGc: "Railing height",
    remplissage: "Infill",
    rosace: "Rosette",
    mainCourante: "Handrail",
    normes: "Standards",
    releve: "Customer's survey",
    forme: "Shape",
    marches: "Treads",
    limon: "Stringer",
    gardeCorps: "Railing",
    hauteurEscalier: "Rise",
    fabrication: "Lead time",
    surMesure: "Made to your dimensions",
    catalogue: "Catalogue size",
    pieceLigne: "{nom} — {options}",
    lot: "Batch price: {taux}% off from {n} pieces in the same order",
    transporteur: "Carrier delivery — {commune} ({cp})",
    transporteurTable: "Shipped dismantled: top, one-piece welded base, hardware and assembly notes. Parcel estimated at {kg} kg.",
    transporteurPiece: "Shipped ready to install, packed at the workshop. Parcel estimated at {kg} kg.",
    transporteurNote: "Price estimated from the town, weight and dimensions, {km} km from Saumur.",
    poseLigne: "Delivery and installation by the workshop — {commune} ({cp})",
    poseDetail: "A single trip from Saumur ({km} km): delivery, assembly and levelling on site, by us.",
    poseDetailGc: "A single trip from Saumur ({km} km): delivery and fitting into the window reveal, by us.",
    poseDetailLumiere: "A single trip from Saumur ({km} km): delivery, fixing and wiring of the light ceiling, by us.",
    sansLivraison: "Delivery within mainland France included, fixings and fitting notes supplied.",
    delaiInconnu: "Made to order",
    emetteurLignes: ["Art metalwork — workshop in Saumur (49400), Maine-et-Loire, France", "auboiacier@gmail.com — auboiacier.fr"],
    conditions: {
      prix: "Prices in euros, total amount payable; the workshop's VAT status is stated on the invoice.",
      validite: `Quote valid for ${VALIDITE_JOURS} days from its date, for the configuration described above.`,
      paiement:
        "Payment on order, by card, on auboiacier.fr — in full, or a 40% deposit followed by the 60% balance charged on the day of delivery or installation.",
      delai: "Every piece is made to order in our workshop: the lead time runs from payment or deposit.",
      transporteur:
        "Kerbside delivery by appointment, without assembly. The shipping price is estimated at order from weight, dimensions and distance.",
      pose: "Delivery and installation by appointment, in a single trip; access and location must be clear on the agreed day.",
      retractation:
        "Piece made to the customer's specifications: the fourteen-day right of withdrawal does not apply (art. L221-28 3° of the French Consumer Code).",
      garantie:
        "Legal guarantee of conformity (two years from delivery) and legal guarantee against hidden defects. Wood and steel are living materials: slight variations in tone and grain are normal.",
      cgv: "The terms of sale, available at auboiacier.fr/en/cgv, apply to every order.",
      estimation:
        "This estimate is based on the dimensions and choices entered on the website. The final quote is issued after the on-site survey; it constitutes an offer of sale.",
    },
  },
} as const;

/* ------------------------------------------------------------------ *
 *  Outils
 * ------------------------------------------------------------------ */

/** Un nombre écrit dans la langue : « 1 234,5 » ou « 1,234.5 ». */
function nombre(valeur: number, locale: Locale, decimales = 0) {
  return valeur.toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
}

/** Une cote en centimètres à partir de millimètres : « 200 », « 152,5 ». */
const cm = (mm: number, locale: Locale) => nombre(mm / 10, locale, 1);

function remplir(modele: string, valeurs: Record<string, string | number>) {
  return Object.entries(valeurs).reduce((texte, [cle, valeur]) => texte.replaceAll(`{${cle}}`, String(valeur)), modele);
}

/** Une date lisible : « 20 septembre 2026 » / « 20 September 2026 ». */
export function dateLisible(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(date);
}

/** La date au format « 20260920 », heure de Paris. */
function dateCompacte(date: Date) {
  const parties = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Paris",
  }).formatToParts(date);
  const lire = (type: string) => parties.find((p) => p.type === type)?.value ?? "";
  return `${lire("year")}${lire("month")}${lire("day")}`;
}

/** Une empreinte courte et stable d'une chaîne (FNV-1a), en base 36 majuscule. */
function empreinte(texte: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(7, "0").slice(-5);
}

/**
 * Le numéro du devis : la date, puis une empreinte de la configuration.
 * Deux téléchargements du même devis le même jour portent le même numéro ;
 * changer une cote, une essence ou la ville en donne un autre.
 */
export function numeroDevis(entree: Pick<EntreeDevis, "selection" | "quantity" | "livraison" | "hauteurTableMm" | "date">) {
  const s = entree.selection;
  const cle = [
    s.slug,
    s.sizeId,
    s.woodId,
    s.metalId,
    s.fabricId,
    s.remplissageId,
    s.largeurMm,
    s.hauteurMm,
    s.epaisseurMm,
    entree.hauteurTableMm,
    entree.quantity,
    entree.livraison?.mode,
    entree.livraison?.codePostal,
  ]
    .map((v) => v ?? "-")
    .join("|");
  return `D-${dateCompacte(entree.date)}-${empreinte(cle)}`;
}

/** Le texte après le tiret d'une fiche : « Sur commande — comptez 6 à 8 semaines » → « 6 à 8 semaines ». */
function delaiDepuisSpecs(product: Product, locale: Locale) {
  const spec = product.specs.find((s) => /^(Fabrication|Lead time)$/i.test(s.label));
  if (!spec) return TEXTES[locale].delaiInconnu;
  const apres = spec.value.split("—")[1]?.trim();
  return apres ? apres.replace(/^(comptez|allow)\s+/i, "") : spec.value;
}

function spec(product: Product, label: RegExp) {
  return product.specs.find((s) => label.test(s.label))?.value;
}

/**
 * La photo de la pièce dans la configuration choisie — la même logique que la
 * galerie de la fiche. Le PDF ne sait lire que le JPEG et le PNG : une photo
 * d'un autre format est simplement omise.
 */
export function photoConfiguration(
  product: Product,
  choix: { woodId?: string; metalId?: string; fabricId?: string }
): string | undefined {
  const coloris = product.fabrics?.find((f) => f.id === choix.fabricId);
  const principale = coloris?.image ? { src: coloris.image } : product.images[0];
  if (!principale) return undefined;
  const enBois = product.images[0]?.parBois?.[choix.woodId ?? ""];
  const src =
    (typeof enBois === "string" ? enBois : enBois?.[choix.metalId ?? ""]) ??
    product.images[0]?.variants?.[choix.metalId ?? ""] ??
    principale.src;
  return /\.(jpe?g|png)$/i.test(src) ? src : undefined;
}

/* ------------------------------------------------------------------ *
 *  Les caractéristiques, famille par famille
 * ------------------------------------------------------------------ */

type Pieces = {
  product: Product;
  size: ProductSize;
  wood?: ProductSwatch;
  metal?: ProductSwatch;
  fabric?: ProductSwatch;
  remplissage?: Remplissage;
};

/** « 8 places — 200 × 100 × H 75 cm » → « 8 places » ; sinon une estimation. */
function placesTable(size: ProductSize, dims: [number, number] | undefined, locale: Locale) {
  const t = TEXTES[locale];
  const duCatalogue = size.id !== SUR_MESURE ? size.label.split("—")[0]?.trim() : "";
  if (duCatalogue && /\d/.test(duCatalogue)) {
    // Le libellé anglais dit « 8 seats », le français « 8 places » : on garde le chiffre.
    return remplir(t.placesN, { n: duCatalogue.match(/\d+/)?.[0] ?? "" });
  }
  if (!dims) return undefined;
  const [L, W] = dims;
  // Une personne par 55 cm de chaque côté, et deux en bout dès 80 cm de large.
  const n = 2 * Math.floor(L / 550) + (W >= 800 ? 2 : 0);
  return n > 0 ? remplir(t.placesEnv, { n }) : undefined;
}

function caracteristiquesTable(p: Pieces, entree: EntreeDevis): Caracteristique[] {
  const { product, size, wood, metal } = p;
  const locale = entree.locale;
  const t = TEXTES[locale];
  const dims = size.dimsMm;
  const surMesure = size.id === SUR_MESURE;
  const epaisseur = surMesure
    ? (entree.selection.epaisseurMm ?? product.surMesure?.epaisseur.refMm)
    : product.surMesure?.epaisseur.refMm;
  const hauteurMm = surMesure && entree.hauteurTableMm ? entree.hauteurTableMm : 750;
  const exterieur = product.famille === "table-exterieur";
  const lignes: Caracteristique[] = [];
  lignes.push({ label: t.catalogue, value: surMesure ? t.surMesure : size.label });
  if (dims) {
    lignes.push({
      label: t.dimensions,
      value: `${cm(dims[0], locale)} × ${cm(dims[1], locale)} cm — H ${cm(hauteurMm, locale)} cm`,
    });
    lignes.push({ label: t.surface, value: `${nombre(surfaceM2("rect", dims[0], dims[1]), locale, 2)} m²` });
    const places = placesTable(size, dims, locale);
    if (places) lignes.push({ label: t.places, value: places });
  }
  if (exterieur) {
    lignes.push({ label: t.plateau, value: spec(product, /^(Plateau|Top)$/) ?? "" });
  } else {
    const premierChoix = wood?.id === "chene";
    lignes.push({
      label: t.plateau,
      value: [
        wood?.label,
        locale === "en" ? (premierChoix ? "solid, first-grade" : "solid") : premierChoix ? "massif premier choix" : "massif",
        epaisseur ? `${epaisseur} mm` : null,
      ]
        .filter(Boolean)
        .join(", "),
    });
    lignes.push({ label: t.finition, value: t.huileCire });
  }
  if (epaisseur && exterieur) lignes.push({ label: t.epaisseur, value: `${epaisseur} mm` });
  lignes.push({
    label: t.pietement,
    value: [spec(product, /^(Piétement|Base)$/), metal ? `${t.teinte.toLowerCase()} ${metal.label.toLowerCase()}` : null]
      .filter(Boolean)
      .join(" — "),
  });
  return lignes;
}

function caracteristiquesAssise(p: Pieces, locale: Locale): Caracteristique[] {
  const { product, size, metal, fabric } = p;
  const t = TEXTES[locale];
  const lignes: Caracteristique[] = [];
  // « Taille unique — L 48 × P 55 × H 88 cm » : la cote après le tiret.
  const cotes = size.label.split("—")[1]?.trim() ?? size.label;
  lignes.push({ label: t.dimensions, value: cotes });
  if (fabric) lignes.push({ label: t.velours, value: fabric.label });
  const assise = spec(product, /^(Assise|Seat)$/);
  if (assise) lignes.push({ label: t.assise, value: assise });
  const coussins = spec(product, /^(Coussins|Cushions)$/);
  if (coussins) lignes.push({ label: t.coussins, value: coussins });
  lignes.push({
    label: t.structure,
    value: [spec(product, /^(Structure|Frame)$/), metal ? `${t.teinte.toLowerCase()} ${metal.label.toLowerCase()}` : null]
      .filter(Boolean)
      .join(" — "),
  });
  return lignes;
}

function caracteristiquesLumiere(p: Pieces, entree: EntreeDevis): Caracteristique[] {
  const { product, size, metal } = p;
  const locale = entree.locale;
  const t = TEXTES[locale];
  const rond = product.surMesure?.forme === "rond";
  const dims = size.dimsMm;
  const surMesure = size.id === SUR_MESURE;
  const lignes: Caracteristique[] = [];
  lignes.push({ label: t.catalogue, value: surMesure ? t.surMesure : size.label });
  if (dims) {
    const surface = surfaceM2(rond ? "rond" : "rect", dims[0], dims[1]);
    lignes.push({
      label: t.dimensions,
      value: rond ? `Ø ${cm(dims[0], locale)} cm` : `${cm(dims[0], locale)} × ${cm(dims[1], locale)} cm`,
    });
    lignes.push({ label: t.surfaceLumineuse, value: `${nombre(surface, locale, 2)} m²` });
    // Le catalogue annonce la puissance ; sur mesure, 65 W par m² de toile.
    const duCatalogue = !surMesure ? size.label.match(/(\d+)\s*W/)?.[1] : undefined;
    const watts = duCatalogue ? Number(duCatalogue) : Math.round((surface * 65) / 5) * 5;
    lignes.push({ label: t.puissance, value: `${nombre(watts, locale)} W` });
  }
  const profondeur = surMesure ? entree.selection.epaisseurMm : product.surMesure?.epaisseur.refMm;
  if (profondeur) lignes.push({ label: t.caisson, value: `${profondeur} mm` });
  const toile = spec(product, /^(Toile|Membrane)$/);
  if (toile) lignes.push({ label: t.toile, value: toile });
  lignes.push({
    label: t.cadre,
    value: [spec(product, /^(Cadre|Frame)$/), metal ? `${t.couleurCadre.toLowerCase()} ${metal.label.toLowerCase()}` : null]
      .filter(Boolean)
      .join(" — "),
  });
  const eclairage = spec(product, /^(Éclairage|Lighting)$/);
  if (eclairage) lignes.push({ label: t.eclairage, value: eclairage });
  const pose = spec(product, /^(Pose|Installation)$/);
  if (pose) lignes.push({ label: t.pose, value: pose });
  return lignes;
}

function caracteristiquesGardeCorps(p: Pieces, entree: EntreeDevis): Caracteristique[] {
  const { product, size, wood, metal, fabric, remplissage } = p;
  const locale = entree.locale;
  const t = TEXTES[locale];
  const dims = size.dimsMm;
  const lignes: Caracteristique[] = [];
  if (dims) {
    lignes.push({ label: t.largeurTableau, value: `${nombre(dims[0], locale)} mm` });
    lignes.push({ label: t.hauteurGc, value: `${nombre(dims[1], locale)} mm` });
  }
  if (remplissage) lignes.push({ label: t.remplissage, value: remplissage.label });
  // La rosace n'existe qu'avec les croix : derrière un verre, elle n'a pas de sens.
  if (fabric && remplissage?.id !== "verre") lignes.push({ label: t.rosace, value: fabric.label });
  lignes.push({
    label: t.structure,
    value: [spec(product, /^(Structure|Frame)$/), metal ? `${t.teinte.toLowerCase()} ${metal.label.toLowerCase()}` : null]
      .filter(Boolean)
      .join(" — "),
  });
  lignes.push({
    label: t.mainCourante,
    value: [wood?.label, locale === "en" ? "solid, 40 mm" : "massif, 40 mm", t.huileCire.toLowerCase()].filter(Boolean).join(", "),
  });
  const pose = spec(product, /^(Pose|Installation)$/);
  if (pose) lignes.push({ label: t.pose, value: pose });
  const normes = spec(product, /^(Normes|Standards)$/);
  if (normes) lignes.push({ label: t.normes, value: normes });
  if (entree.note) lignes.push({ label: t.releve, value: entree.note });
  return lignes;
}

function caracteristiquesEscalier(p: Pieces, entree: EntreeDevis): Caracteristique[] {
  const { product, size, wood, metal } = p;
  const locale = entree.locale;
  const t = TEXTES[locale];
  const lignes: Caracteristique[] = [];
  lignes.push({ label: t.forme, value: size.label });
  lignes.push({
    label: t.limon,
    value: [spec(product, /^(Limon|Stringer)$/), metal ? `${t.teinte.toLowerCase()} ${metal.label.toLowerCase()}` : null]
      .filter(Boolean)
      .join(" — "),
  });
  lignes.push({
    label: t.marches,
    value: [wood?.label, locale === "en" ? "solid, 50 mm" : "massif, 50 mm", t.huileCire.toLowerCase()].filter(Boolean).join(", "),
  });
  const gc = spec(product, /^(Garde-corps|Railing)$/);
  if (gc) lignes.push({ label: t.gardeCorps, value: gc });
  const normes = spec(product, /^(Normes|Standards)$/);
  if (normes) lignes.push({ label: t.normes, value: normes });
  const pose = spec(product, /^(Pose|Installation)$/);
  if (pose) lignes.push({ label: t.pose, value: pose });
  if (entree.note) lignes.push({ label: t.releve, value: entree.note });
  return lignes;
}

function caracteristiques(p: Pieces, entree: EntreeDevis): Caracteristique[] {
  switch (p.product.famille) {
    case "table-interieur":
    case "table-exterieur":
      return caracteristiquesTable(p, entree);
    case "chaise":
    case "chaise-exterieur":
      return caracteristiquesAssise(p, entree.locale);
    case "plafond":
      return caracteristiquesLumiere(p, entree);
    case "garde-corps":
      return caracteristiquesGardeCorps(p, entree);
    case "escalier":
      return caracteristiquesEscalier(p, entree);
  }
}

/* ------------------------------------------------------------------ *
 *  La composition
 * ------------------------------------------------------------------ */

/**
 * Une pièce sur devis (l'escalier) n'a pas de résolution serveur : on lit ses
 * options directement, avec le même calcul de prix que la fiche.
 */
function resoudreEstimation(product: Product, selection: Selection) {
  const size = product.sizes.find((s) => s.id === selection.sizeId) ?? (product.sizes.length === 1 ? product.sizes[0] : undefined);
  if (!size) return null;
  const unitPrice = computeUnitPrice(product, selection);
  if (unitPrice === null) return null;
  const wood = product.woods.find((w) => w.id === selection.woodId);
  const metal = product.metals.find((m) => m.id === selection.metalId);
  const fabric = product.fabrics?.find((f) => f.id === selection.fabricId);
  const optionsLabel = [size.label, wood?.label, metal?.label, fabric?.label].filter(Boolean).join(" · ");
  return { product, size, wood, metal, fabric, remplissage: undefined, unitPrice, optionsLabel };
}

export function composerDevis(entree: EntreeDevis): ResultatDevis {
  const brut = getProduct(entree.selection.slug);
  if (!brut) return { ok: false, reason: "unknown_slug" };
  const locale = entree.locale;
  const t = TEXTES[locale];
  const product = productLocalise(brut, locale);
  const quantity = Math.max(1, Math.min(10, Math.floor(entree.quantity)));
  const selection = { ...entree.selection, locale };

  const estimation = product.orderMode !== "cart";
  const resolu = estimation ? resoudreEstimation(product, selection) : null;
  const resultat = estimation ? null : resolveSelection(selection);
  if (!estimation && (!resultat || !resultat.ok)) {
    return { ok: false, reason: resultat && !resultat.ok ? resultat.reason : "invalid" };
  }
  const ligne = estimation ? resolu : resultat && resultat.ok ? resultat.line : null;
  if (!ligne) return { ok: false, reason: "unknown_size" };

  const pieces: Pieces = {
    product,
    size: ligne.size,
    wood: ligne.wood,
    metal: ligne.metal,
    fabric: ligne.fabric,
    remplissage: ligne.remplissage,
  };

  // Le prix de lot d'un garde-corps, exactement comme au panier.
  const [avecLot] = remiseLot([{ product, unitPrice: ligne.unitPrice, quantity }]);
  const unitaire = avecLot.prixLot;
  const details: string[] = [];
  if (avecLot.remise > 0 && product.remiseLot) {
    details.push(remplir(t.lot, { taux: Math.round(product.remiseLot.taux * 100), n: product.remiseLot.desPieces }));
  }
  const lignes: LigneDevis[] = [
    {
      designation: ligne.optionsLabel ? remplir(t.pieceLigne, { nom: product.name, options: ligne.optionsLabel }) : product.name,
      details,
      quantite: quantity,
      unitaire,
      avantRemise: avecLot.remise > 0 ? ligne.unitPrice : undefined,
      total: unitaire * quantity,
    },
  ];

  // La livraison : par transporteur (au poids du colis) ou avec la pose.
  const livraison = entree.livraison;
  if (livraison) {
    const d = livraison.deplacement;
    const km = nombre(Math.round(d.distanceKm), locale);
    const montant = d.montantCents / 100;
    if (livraison.mode === "pose") {
      const detail =
        product.famille === "garde-corps"
          ? t.poseDetailGc
          : product.category === "lumiere"
            ? t.poseDetailLumiere
            : t.poseDetail;
      lignes.push({
        designation: remplir(t.poseLigne, { commune: d.commune, cp: livraison.codePostal }),
        details: [remplir(detail, { km })],
        quantite: 1,
        unitaire: montant,
        total: montant,
      });
    } else {
      const kg =
        poidsColisKg(product, {
          largeurMm: ligne.size.dimsMm?.[0],
          hauteurMm: ligne.size.dimsMm?.[1],
          epaisseurMm: selection.epaisseurMm,
        }) * quantity;
      lignes.push({
        designation: remplir(t.transporteur, { commune: d.commune, cp: livraison.codePostal }),
        details: [
          remplir(product.boisAuM2 ? t.transporteurTable : t.transporteurPiece, { kg: nombre(kg, locale) }),
          remplir(t.transporteurNote, { km }),
        ],
        quantite: 1,
        unitaire: montant,
        total: montant,
      });
    }
  } else if (!estimation && !product.poseOption) {
    lignes[0].details.push(t.sansLivraison);
  }

  const total = lignes.reduce((somme, l) => somme + l.total, 0);
  // Même arrondi que /api/commande : l'acompte se calcule ligne par ligne, au centime.
  const acompte = lignes.reduce((somme, l) => somme + (Math.round(l.unitaire * 100 * TAUX_ACOMPTE) / 100) * l.quantite, 0);
  const solde = Math.round((total - acompte) * 100) / 100;

  const validite = new Date(entree.date.getTime() + VALIDITE_JOURS * 24 * 3600 * 1000);
  const c = t.conditions;
  const conditions: string[] = estimation
    ? [c.estimation, c.prix, c.delai, c.garantie, c.cgv]
    : [
        c.prix,
        c.validite,
        c.paiement,
        c.delai,
        ...(livraison ? [livraison.mode === "pose" ? c.pose : c.transporteur] : []),
        c.retractation,
        c.garantie,
        c.cgv,
      ];

  const emetteur = {
    nom: ENTREPRISE.raisonSociale ? `Auboiacier — ${ENTREPRISE.raisonSociale}` : "Auboiacier",
    lignes: [
      ...t.emetteurLignes,
      ENTREPRISE.adresse,
      ENTREPRISE.siret ? `SIRET ${ENTREPRISE.siret}` : "",
      ENTREPRISE.tva ? `TVA ${ENTREPRISE.tva}` : "",
      ENTREPRISE.telephone,
    ].filter(Boolean),
  };

  const photo = photoConfiguration(product, selection);
  return {
    ok: true,
    devis: {
      nature: estimation ? "estimation" : "devis",
      numero: numeroDevis({ ...entree, quantity }),
      date: dateLisible(entree.date, locale),
      validite: dateLisible(validite, locale),
      locale,
      emetteur,
      client: { nom: entree.client?.nom?.trim() || undefined, adresse: entree.client?.adresse?.trim() || undefined },
      piece: {
        nom: product.name,
        accroche: product.tagline,
        photo: photo ? `${entree.origine}${photo}` : undefined,
        caracteristiques: caracteristiques(pieces, { ...entree, locale }),
      },
      lignes,
      total: Math.round(total * 100) / 100,
      acompte: Math.round(acompte * 100) / 100,
      solde,
      delai: delaiDepuisSpecs(product, locale),
      conditions,
      lienFiche: `${entree.origine}/${locale}/artisanat/${product.slug}`,
    },
  };
}
