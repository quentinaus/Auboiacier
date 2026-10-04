/**
 * Le devis PDF d'un garde-corps de fenêtre, sur le site : LE DEVIS DE L'OUTIL.
 *
 * Décision de Quentin (29/09) : pour la même entrée, le devis du site donne
 * les mêmes lignes et le même total que le devis de l'outil de plans — même
 * découpage en postes (structure 55, main courante 15, peinture 15,
 * fixations 15), même livraison. On ne le réécrit donc pas : on appelle
 * composerDevisGC, le code de l'outil extrait tel quel (devis.genere.mjs),
 * avec la configuration et le prix de l'outil.
 *
 * Ce que le site ajoute ensuite, et seulement ça :
 * - les options que l'outil ne chiffre pas encore (teinte blanche ou brute,
 *   rosace en fonte, en acier ou grand médaillon, verre) : leur supplément
 *   rejoint son poste, leur nom remplace celui du modèle ;
 * - la quantité, et la remise de plusieurs garde-corps (frais fixes de
 *   l'atelier comptés une fois, jamais sous le plancher) ;
 * - ce qui appartient au site : numéro, client, émetteur et ses mentions,
 *   photo, lien de commande, et la version anglaise (mêmes lignes, mêmes
 *   montants, dans l'ordre).
 * Avec les options du modèle (noir, fleur, croix) et une seule pièce, les
 * lignes et le total sont ceux de l'outil, au caractère près (un test le
 * vérifie).
 *
 * SERVEUR SEULEMENT (via src/lib/prix-garde-corps.server.ts).
 */
import { composerDevisGC, DS_GC, DS_VALIDITE_JOURS, type DevisGC, type LigneDevisGC } from "./devis.genere.mjs";
import { prixCommandeGC, prixGC, type ConfigGC } from "./calcul.ts";
import { configurationGC, ligneGC, SLUG_GC } from "./site.ts";
import { dateLisible, emetteurDevis, numeroDevis, photoConfiguration, type Caracteristique, type Devis, type LigneDevis, type ResultatDevis } from "../devis.ts";
import { getProduct, productLocalise, SUR_MESURE, type ResolvedLine } from "../products.ts";
import { tarifLivraison, tarifPose, type Lieu } from "../deplacement.ts";
import type { ReleveGC } from "../garde-corps.ts";
import type { Locale } from "../i18n.ts";

export type LivraisonDevisGC =
  | { mode: "transporteur" | "pose"; codePostal: string; lieu: Lieu }
  | { mode: "retrait" };

export type EntreeDevisGC = {
  releve: ReleveGC;
  options: { woodId: string; metalId?: string; fabricId?: string; remplissageId?: string };
  quantite: number;
  livraison: LivraisonDevisGC;
  client?: { nom?: string; adresse?: string; email?: string; telephone?: string };
  date: Date;
  locale: Locale;
  /** L'adresse du site, pour la photo et le lien de commande. */
  origine: string;
};

/** La livraison du devis : exactement le calcul du panier (src/lib/tarif-panier.ts) pour cette seule pièce. */
export function livraisonDevisGC(line: ResolvedLine, quantite: number, livraison: LivraisonDevisGC): { prix: number; kg: number; km: number } {
  const kg = quantite * line.gc!.kg;
  if (livraison.mode === "retrait") return { prix: 0, kg, km: 0 };
  const km = livraison.lieu.distanceKm;
  const [L, H] = line.size.dimsMm!;
  const cents = livraison.mode === "pose" ? tarifPose(km).montantCents : tarifLivraison(km, kg, Math.max(L, H)).montantCents;
  return { prix: cents / 100, kg, km };
}

/** Remplace UNE occurrence exacte ; sinon le devis n'est pas fait (jamais un texte à moitié juste). */
function remplacer(texte: string, avant: string, apres: string): string {
  const i = texte.indexOf(avant);
  if (i < 0 || texte.indexOf(avant, i + avant.length) >= 0) throw new Error(`devis garde-corps : « ${avant} » introuvable ou en double`);
  return texte.slice(0, i) + apres + texte.slice(i + avant.length);
}
const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Le devis de l'outil pour cette configuration (quantité 1, options du
 * modèle) : la base, telle quelle. Exporté pour les tests de parité.
 */
export function devisOutil(config: ConfigGC, line: ResolvedLine, quantite: number, livraison: LivraisonDevisGC, date: Date): DevisGC {
  const liv = livraisonDevisGC(line, quantite, livraison);
  const v = { ...config.v, remise: livraison.mode, km: liv.km };
  // Le colis de la commande entière (la quantité, le verre) : seul le poids écrit dans la ligne de livraison change.
  const R = { ...config.R, kg: liv.kg };
  const chantier = livraison.mode === "retrait" ? "" : `${livraison.codePostal} ${livraison.lieu.commune}`;
  const r = composerDevisGC({ R, v, prix: prixGC(config), rem: { prix: liv.prix }, infos: { chantier, date }, image: "photo" });
  if (!r.ok) throw new Error(`devis garde-corps : ${r.raison}`);
  return r.devis;
}

/**
 * Le devis du site pour un garde-corps. Rend le même type que composerDevis
 * (devis.ts) : devis-pdf.tsx le met en page comme les autres.
 */
export function composerDevisGardeCorps(entree: EntreeDevisGC): ResultatDevis {
  const { releve, options, livraison, locale } = entree;
  const quantite = Math.max(1, Math.min(10, Math.floor(entree.quantite)));
  const resolu = ligneGC(releve, options, "fr");
  if (!resolu.ok) return { ok: false, reason: resolu.reason };
  const line = resolu.line;
  // La configuration du relevé RÉELLEMENT chiffré par la ligne (sous verre, le dessin choisi ne compte pas) :
  // le devis décrit exactement ce que le panier encaisse.
  const config = configurationGC(line.gc!.releve, options.woodId);
  if (!config) return { ok: false, reason: "unknown_size" };
  if (!config.ok) return { ok: false, reason: "a_etudier" };

  const base = devisOutil(config, line, quantite, livraison, entree.date);
  const fr = lignesSite(base, config, line, quantite);
  const produitFr = getProduct(SLUG_GC)!;
  const lignes = locale === "en" ? lignesAnglaises(fr, config, line, quantite, livraison) : fr.lignes;
  const total = Math.round(lignes.reduce((a, l) => a + l.total * 100, 0)) / 100;
  if (Math.round(fr.total * 100) !== Math.round(total * 100)) throw new Error("devis garde-corps : les deux langues ne donnent pas le même total");

  const produit = productLocalise(produitFr, locale);
  const selection = {
    slug: SLUG_GC,
    sizeId: SUR_MESURE,
    woodId: line.wood?.id,
    metalId: line.metal?.id,
    fabricId: line.fabric?.id,
    remplissageId: line.remplissage?.id,
    largeurMm: releve.largeurMm,
    hauteurMm: line.gc!.hauteurMm,
    allegeMm: releve.allegeMm,
    enEtage: releve.enEtage,
    fenetreMm: releve.fenetreMm,
    // Le modèle choisi : deux devis de modèles différents ne portent pas le même numéro.
    ...(releve.modele !== undefined ? { modeleGc: releve.modele } : {}),
  };
  const photo = photoConfiguration(produit, selection);
  const devis: Devis = {
    nature: "devis",
    numero: numeroDevis({
      selection,
      quantity: quantite,
      livraison: livraison.mode === "retrait" ? { mode: "retrait" } : { mode: livraison.mode, codePostal: livraison.codePostal },
      date: entree.date,
    }),
    date: dateLisible(entree.date, locale),
    validite: dateLisible(new Date(entree.date.getTime() + DS_VALIDITE_JOURS * 24 * 3600 * 1000), locale),
    locale,
    emetteur: emetteurDevis(locale),
    client: {
      nom: entree.client?.nom?.trim() || undefined,
      adresse: entree.client?.adresse?.trim() || undefined,
      email: entree.client?.email?.trim() || undefined,
      telephone: entree.client?.telephone?.trim() || undefined,
    },
    piece: {
      nom: produit.name,
      accroche: locale === "en" ? accrocheAnglaise(line, config) : fr.accroche,
      photo: photo ? `${entree.origine}${photo}` : undefined,
      caracteristiques: locale === "en" ? caracteristiquesAnglaises(base, config, line, livraison) : fr.caracteristiques,
    },
    lignes,
    total,
    delai: locale === "en" ? "4 to 6 weeks" : DS_GC.delai,
    conditions: locale === "en" ? conditionsAnglaises(base, livraison) : [...base.conditions],
    lienFiche: `${entree.origine}/${locale}/artisanat/${SLUG_GC}`,
  };
  return { ok: true, devis };
}

/* ------------------------------------------------------------------ *
 *  Le devis de l'outil, complété des options, de la quantité et de la remise
 * ------------------------------------------------------------------ */

/** Le rôle de chaque ligne du devis de l'outil, vérifié : titre, structure, main courante, peinture, fixations, livraison. */
function rolesOutil(base: DevisGC) {
  const [titre, structure, mainCourante, peinture, fixations, ...reste] = base.lignes;
  const ok =
    titre?.titre === true &&
    structure?.designation.startsWith("Structure acier plein — ") &&
    mainCourante?.designation.startsWith("Main courante ") &&
    peinture?.designation.startsWith("Finition peinte de l'acier — ") &&
    fixations?.designation.startsWith("Fixations") &&
    reste.length <= 1 &&
    (reste.length === 0 || reste[0].designation.startsWith("Livraison"));
  if (!ok) throw new Error("devis garde-corps : les lignes de l'outil ne sont plus celles attendues");
  return { titre, structure, mainCourante, peinture, fixations, livraison: reste[0] as LigneDevisGC | undefined };
}

type LignesSite = { lignes: LigneDevis[]; total: number; accroche: string; caracteristiques: Caracteristique[] };

function lignesSite(base: DevisGC, config: ConfigGC, line: ResolvedLine, quantite: number): LignesSite {
  const r = rolesOutil(base);
  const produit = line.product;
  const metal = line.metal!;
  const fabric = line.fabric!;
  const verre = line.remplissage?.sansCroix === true ? line.remplissage : undefined;
  const teinteModele = produit.metals[0];
  const rosaceModele = produit.fabrics![0];
  const n = config.croix;

  let titre = r.titre.designation;
  let structure = r.structure.designation;
  let peinture = r.peinture.designation;
  let accroche = base.piece.accroche;
  let caracs = base.piece.caracteristiques.map((c) => ({ ...c }));
  const carac = (label: string) => {
    const c = caracs.find((x) => x.label === label);
    if (!c) throw new Error(`devis garde-corps : caractéristique « ${label} » introuvable`);
    return c;
  };

  // La teinte : l'outil écrit celle du modèle (noir charbon).
  if (metal.id !== teinteModele.id) {
    titre = remplacer(titre, ` · ${majuscule(DS_GC.teinte)}`, ` · ${metal.label}`);
    const teinte = metal.label.toLowerCase();
    // L'acier brut n'est pas peint : il est verni (le texte du site, depuis toujours).
    peinture = metal.id === "brut" ? "Finition de l'acier — brut, vernis incolore de protection" : remplacer(peinture, `teinte ${DS_GC.teinte}`, `teinte ${teinte}`);
    carac("Structure").value = remplacer(
      carac("Structure").value,
      `finition peinte — teinte de l'acier ${DS_GC.teinte}`,
      metal.id === "brut" ? "finition brute, vernis incolore de protection" : `finition peinte — teinte de l'acier ${teinte}`
    );
  }
  if (verre) {
    // Le verre à la place des croix : plus de croix ni de rosace, un cadre qui reçoit le panneau.
    titre = remplacer(remplacer(titre, ` · ${n} croix`, ""), ` · ${DS_GC.rosace}`, "");
    // Ni de traverse au milieu des croix, quand le dessin retenu en avait une.
    const traverseDeLOutil = `, traverse au milieu de ${n > 1 ? "chaque croix" : "la croix"}`;
    if (config.traverse) {
      titre = remplacer(titre, " · traverse au milieu", "");
      structure = remplacer(structure, traverseDeLOutil, "");
    }
    titre = `${titre} · ${verre.label}`;
    const croix = `${n} croix de Saint-André et ${n} ${n > 1 ? "rosaces" : "rosace"} ${minuscule(DS_GC.rosace)}`;
    structure = remplacer(structure, croix, "cadre soudé recevant le verre");
    const remplissage = carac("Remplissage");
    if (config.traverse) remplissage.value = remplacer(remplissage.value, traverseDeLOutil, "");
    remplissage.value = remplacer(remplissage.value, `${n} croix de Saint-André et ${n} ${n > 1 ? "rosaces" : "rosace"}`, verre.label);
    caracs = caracs.filter((c) => c.label !== "Rosace");
    // L'outil écrit « rosace » au singulier quand il n'y a qu'une croix.
    const rosacesDeLOutil = n > 1 ? "rosaces de fonderie" : "rosace de fonderie";
    accroche = remplacer(accroche, `Croix de Saint-André en acier plein${config.traverse ? " avec traverse au milieu" : ""}, ${rosacesDeLOutil}`, "Panneau de verre feuilleté dans un cadre en acier plein");
  } else if (fabric.id !== rosaceModele.id) {
    titre = remplacer(titre, ` · ${DS_GC.rosace}`, ` · ${fabric.label}`);
    structure = remplacer(structure, minuscule(DS_GC.rosace), minuscule(fabric.label));
    carac("Rosace").value = fabric.label;
  }

  const q = quantite;
  const piece = (l: LigneDevisGC, designation: string, supplement: number): LigneDevis => ({
    designation,
    details: [...l.details],
    quantite: q,
    unitaire: l.unitaire + supplement,
    total: (l.unitaire + supplement) * q,
  });
  const lignes: LigneDevis[] = [
    { designation: titre, details: [...r.titre.details], quantite: q, unitaire: 0, total: 0, titre: true },
    // La rosace rejoint la structure, la teinte la peinture : comme au panier, le supplément est à son poste.
    piece(r.structure, structure, verre ? 0 : (fabric.priceDelta ?? 0)),
    piece(r.mainCourante, r.mainCourante.designation, 0),
    piece(r.peinture, peinture, metal.priceDelta ?? 0),
    piece(r.fixations, r.fixations.designation, 0),
  ];
  if (verre) {
    const supplement = line.unitPrice - line.gc!.prixOutil - (metal.priceDelta ?? 0);
    lignes.push({ designation: verre.label, details: [], quantite: q, unitaire: supplement, total: supplement * q });
  }
  const remise = q > 1 ? prixCommandeGC([{ config, quantite: q }]).remise : 0;
  if (remise < 0) {
    lignes.push({
      designation: "Plusieurs garde-corps dans la même commande — frais fixes de l'atelier comptés une fois",
      details: [],
      quantite: 1,
      unitaire: remise,
      total: remise,
    });
  }
  if (r.livraison) lignes.push({ ...r.livraison, details: [...r.livraison.details] });

  // La somme des postes vaut le prix de la pièce, options comprises : le devis ne dit pas autre chose que le panier.
  const pieceUnitaire = lignes.slice(1).filter((l) => l.quantite === q && l.unitaire > 0 && !/^Livraison/.test(l.designation)).reduce((a, l) => a + l.unitaire, 0);
  if (pieceUnitaire !== line.unitPrice) throw new Error("devis garde-corps : les postes ne font pas le prix de la pièce");
  const total = Math.round(lignes.reduce((a, l) => a + l.total * 100, 0)) / 100;
  return { lignes, total, accroche, caracteristiques: caracs };
}

/* ------------------------------------------------------------------ *
 *  La version anglaise : les mêmes lignes, les mêmes montants, traduits
 * ------------------------------------------------------------------ */

const nb = (x: number) => Math.round(x).toLocaleString("en-GB");

/** Ce que l'outil lit dans son débit pour écrire le devis (croix, rosaces, soubassement, vis). */
function traits(config: ConfigGC) {
  const { R, v } = config;
  const trouve = (re: RegExp) => R.debit.find((d) => re.test(d.nom));
  const diag = trouve(/^Diagonale entière/);
  const vis = trouve(/^Vis ou goujons/);
  const mcD = R.debit.find((d) => d.nom === "Main courante");
  return {
    n: diag ? diag.qte : Math.max(1, Math.round(v.nP || 1)),
    sb: R.debit.some((d) => /soubassement/i.test(d.nom)),
    // La traverse au milieu des croix : lue dans le débit, comme le fait le devis de l'outil.
    traverse: R.debit.some((d) => /^Demi-traverses/.test(d.nom)),
    nVis: vis ? vis.qte : 2 * v.nF,
    rainure: /^Rainure/.test(mcD?.coupes || ""),
    // La main courante retenue par l'outil (40 × 40, ou 60 × 45 sur le fer plat de renfort d'une fenêtre large).
    mcL: R.mc ? R.mc.l : v.mc,
    mcH: R.mc ? R.mc.h : v.mc,
    renfort: R.mc?.renfort ?? null,
  };
}

function lignesAnglaises(fr: LignesSite, config: ConfigGC, line: ResolvedLine, quantite: number, livraison: LivraisonDevisGC): LigneDevis[] {
  const produit = productLocalise(line.product, "en");
  const t = traits(config);
  const verre = line.remplissage?.sansCroix === true;
  const L = config.v.B;
  const H = config.hauteurMm;
  const bois = produit.woods.find((w) => w.id === line.wood?.id)!.label;
  const teinte = produit.metals.find((m) => m.id === line.metal?.id)!.label;
  const rosace = produit.fabrics!.find((f) => f.id === line.fabric?.id)!.label;
  const croix = `${t.n} Saint Andrew's ${t.n > 1 ? "crosses" : "cross"}`;
  const bas = t.sb ? ", straight bars in the lower part" : "";
  const traverse = !verre && t.traverse ? `, a middle rail in ${t.n > 1 ? "each cross" : "the cross"}` : "";
  const renfort = t.renfort ? `, top rail stiffened by a ${nb(t.renfort.l)} × ${nb(t.renfort.e)} mm flat bar hidden under the handrail` : "";
  // Le même ordre et les mêmes mots que le libellé de commande anglais (products.ts) : croix, traverse, barreaux.
  const options = [`Custom — ${nb(L)} × ${nb(H)} mm`, verre ? null : `${t.n} ${t.n > 1 ? "crosses" : "cross"}`, !verre && t.traverse ? "middle rail" : null, t.sb ? "bars below" : null, bois, teinte, verre ? null : rosace, verre ? produit.remplissages?.find((r) => r.sansCroix)?.label : null]
    .filter(Boolean)
    .join(" · ");
  const designations = [
    `${produit.name} — ${options}`,
    verre
      ? `Solid steel structure — ${nb(L)} × ${nb(H)} mm, welded frame holding the glass${bas}${renfort}, TIG welded`
      : `Solid steel structure — ${nb(L)} × ${nb(H)} mm, ${croix} and ${t.n} ${minuscule(rosace)} ${t.n > 1 ? "rosettes" : "rosette"}${traverse}${bas}${renfort}, TIG welded`,
    `Solid ${bois.toLowerCase()} handrail ${nb(t.mcL)} × ${nb(t.mcH)} mm, hardwax-oil finish`,
    line.metal?.id === "brut" ? "Steel finish — raw, clear protective varnish" : `Painted finish of the steel — ${teinte.toLowerCase()}`,
    livraison.mode === "transporteur" ? "Fixings, fitting notes and packaging" : "Fixings and fitting notes",
  ];
  const lieu = livraison.mode === "retrait" ? "" : `${livraison.lieu.commune} (${livraison.codePostal})`;
  const km = livraison.mode === "retrait" ? "0" : nb(livraison.lieu.distanceKm);
  const verreFr = line.product.remplissages?.find((r) => r.sansCroix);
  return fr.lignes.map((l, i) => {
    if (i < designations.length) return { ...l, designation: designations[i], details: [] };
    if (l.designation.startsWith("Plusieurs garde-corps")) return { ...l, designation: "Several railings in the same order — the workshop's fixed costs counted once" };
    if (l.designation.startsWith("Livraison par transporteur")) {
      return {
        ...l,
        designation: `Carrier delivery${lieu ? ` — ${lieu}` : ""}`,
        details: [`Shipped ready to install, packed at the workshop. Parcel estimated at **${nb(quantite * line.gc!.kg)} kg**.`, `Price estimated from the town, weight and dimensions, ${km} km from Saumur.`],
      };
    }
    if (l.designation.startsWith("Livraison et pose")) {
      return {
        ...l,
        designation: `Delivery and installation by the workshop${lieu ? ` — ${lieu}` : ""}`,
        details: [`A single trip from Saumur (${km} km): delivery and fitting into the window reveal, by us.`],
      };
    }
    // Le verre : sa ligne, dans la langue du client.
    if (verreFr && l.designation === verreFr.label) return { ...l, designation: produit.remplissages?.find((r) => r.sansCroix)?.label ?? l.designation };
    throw new Error(`devis garde-corps : ligne sans traduction anglaise (« ${l.designation} »)`);
  });
}

function accrocheAnglaise(line: ResolvedLine, config: ConfigGC): string {
  const bois = productLocalise(line.product, "en").woods.find((w) => w.id === line.wood?.id)!.label.toLowerCase();
  return line.remplissage?.sansCroix
    ? `Laminated glass panel in a solid steel frame, ${bois} handrail. Made to the millimetre, fitted into your window.`
    : `Solid steel Saint Andrew's crosses${traits(config).traverse ? " with a middle rail" : ""}, cast rosettes, ${bois} handrail. Made to the millimetre, fitted into your window.`;
}

function caracteristiquesAnglaises(base: DevisGC, config: ConfigGC, line: ResolvedLine, livraison: LivraisonDevisGC): Caracteristique[] {
  const produit = productLocalise(line.product, "en");
  const { v } = config;
  const t = traits(config);
  const verre = line.remplissage?.sansCroix === true;
  const bois = produit.woods.find((w) => w.id === line.wood?.id)!.label;
  const teinte = produit.metals.find((m) => m.id === line.metal?.id)!.label.toLowerCase();
  const rosace = produit.fabrics!.find((f) => f.id === line.fabric?.id)!.label;
  const haut = v.A + v.jour + config.hauteurMm;
  const obligatoire = v.etage && v.A < 900;
  const bas = t.sb ? ", straight bars in the lower part" : "";
  const remplissage = verre
    ? `${produit.remplissages?.find((r) => r.sansCroix)?.label}${bas}`
    : `${t.n} Saint Andrew's ${t.n > 1 ? "crosses" : "cross"} and ${t.n} ${t.n > 1 ? "rosettes" : "rosette"}${t.traverse ? `, a middle rail in ${t.n > 1 ? "each cross" : "the cross"}` : ""}${bas}`;
  const releve = [
    v.etage ? "Upstairs" : "Ground floor",
    `floor to bottom of the window ${nb(v.A)} mm`,
    v.Hf > 0 ? `window height, sill to top ${nb(v.Hf)} mm` : "",
    v.jour > 0 ? `fitted ${nb(v.jour)} mm above the sill` : "",
    `handrail ${nb(haut)} mm from the floor`,
  ]
    .filter(Boolean)
    .join(" · ");
  const lignes: (Caracteristique | null)[] = [
    { label: "Width between reveals", value: `${nb(v.B)} mm` },
    { label: "Railing height", value: `${nb(config.hauteurMm)} mm` },
    { label: "Infill", value: remplissage.charAt(0).toUpperCase() + remplissage.slice(1) },
    verre ? null : { label: "Rosette", value: rosace },
    {
      label: "Frame",
      value: `Solid steel ${nb(v.s)} × ${nb(v.s)} mm${t.renfort ? `, top rail stiffened by a ${nb(t.renfort.l)} × ${nb(t.renfort.e)} mm flat bar hidden under the handrail` : ""}, TIG welded, ${line.metal?.id === "brut" ? "raw steel, clear varnish" : `painted finish — steel colour ${teinte}`}`,
    },
    { label: "Handrail", value: `${bois}, solid, ${nb(t.mcL)} × ${nb(t.mcH)} mm, hardwax oil, satin${t.renfort ? `, screwed from below onto a ${nb(t.renfort.l)} × ${nb(t.renfort.e)} mm steel flat bar` : t.rainure ? ", fitted onto the frame" : ""}` },
    {
      label: "Installation",
      value: `Fitted into the window reveal, ${livraison.mode === "pose" ? "installed by the workshop" : "fixings supplied"} — ${t.nVis} countersunk screws and plugs`,
    },
    base.piece.caracteristiques.some((c) => c.label === "Normes")
      ? {
          label: "Standards",
          value: obligatoire
            ? "Height calculated to art. R134-59 of the French building code; gaps between the bars to NF P01-012"
            : `Infill compliant with NF P01-012; ${v.etage ? "sill at 900 mm or more" : "ground floor"}, the law sets no height`,
        }
      : null,
    { label: "Measurements taken", value: releve },
  ];
  return lignes.filter((c): c is Caracteristique => c !== null);
}

function conditionsAnglaises(base: DevisGC, livraison: LivraisonDevisGC): string[] {
  const en = [
    "Free quote, issued without obligation from the measurements taken and the choices shown above.",
    "Prices in euros, total amount payable; the workshop's VAT status is stated on the invoice.",
    `Quote valid for ${DS_VALIDITE_JOURS} days from its date, for the configuration described above.`,
    "Payment on order, in full.",
    "Every piece is made to order in our workshop: the lead time runs from payment.",
    livraison.mode === "transporteur"
      ? "Kerbside delivery by appointment, without assembly. The shipping price is estimated at order from weight, dimensions and distance."
      : livraison.mode === "pose"
        ? "Delivery and installation by appointment, in a single trip; access and location must be clear on the agreed day."
        : "Piece to be collected from the workshop in Saumur, by appointment.",
    "Piece made to the customer's specifications: the fourteen-day right of withdrawal does not apply (art. L221-28 3° of the French Consumer Code).",
    "Legal guarantee of conformity (two years from delivery) and legal guarantee against hidden defects. Wood and steel are living materials: slight variations in tone and grain are normal.",
    "The terms of sale, available at auboiacier.fr/en/cgv, apply to every order.",
  ];
  if (en.length !== base.conditions.length) throw new Error("devis garde-corps : les conditions de l'outil ont changé, la traduction anglaise est à revoir");
  return en;
}
