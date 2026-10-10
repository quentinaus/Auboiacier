"use client";

/**
 * Le configurateur des portails (lot 10, d'après la maquette validée par Quentin le 07/10/2026).
 * Ordinateur : trois colonnes comme le garde-corps — les mesures et l'ouverture, le croquis de l'outil et le bandeau des
 * styles, l'aspect, le décor, le moteur et l'achat. Tablette : le croquis en haut, les deux cartes dessous. Téléphone :
 * tout à la suite, en attendant le parcours question par question (lot 11).
 * Tous les dessins viennent du moteur de l'outil de plans (svgDe), jamais redessinés. Les prix viennent du serveur
 * (/api/prix-portail?variantes=1 : le portail, ses styles, ses décors et ses moteurs en une demande) : jamais un coût ici.
 */
import "./portail/configurateur-portail.css";
import { useDeferredValue, useEffect, useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { libellePriseDeCotes, LIVRAISON, PRISE_DE_COTES, POSE, RETRAIT, type Deplacement } from "@/lib/deplacement";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";
import { VisiteAtelier, type Visite } from "./prise-de-cotes";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { svgDe, PT_DECOR_FORMULES } from "@/lib/portails-outil/moteur.genere.mjs";
import {
  acomptePortail, appliquerStyle, bornesPortail, configDepart, configPortillonAssorti, emplacementPermis, formesDe, guidePortail, planPortail, resumeConfig, styleDe, versParams, versParamsPanier,
  ACOMPTE_PORTAIL_PCT, BARREAUX_DECOR, BOUTS_DECOR, COULEURS_PORTAIL, DECORS_PORTAIL, EMPLACEMENTS_DECOR, POS_DECOR, STYLES_PORTAIL, TEXTES_PORTAIL,
  type ChoixDecor, type ConfigPortail, type Langue, type ReceptionPortail, type SlugPortail, type StylePortail,
} from "@/lib/portails";
import { STYLE_RENDU_PORTAIL, TEINTES_PORTAIL } from "@/lib/portails-rendu";
import { VueOuverture } from "./portail/vue-ouverture";
import { prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";

type Prims = { t: string; [k: string]: unknown }[];
type Decor = ConfigPortail["decor"];
type CleMoteur = "aucun" | "ixengo" | "axovia" | "elixo";
type Variantes = {
  base: { ok: true; prix: number; portillon: number | null; avertissements: string[] } | { ok: false; alertes: string[] };
  styles: Record<StylePortail, number | null>;
  decors: Record<Decor, number | null>;
  moteurs: Record<CleMoteur, number | null>;
  portillon: { avec: number | null; seul: number | null } | null;
  moulure: { avec: number | null; sans: number | null };
  reception: Record<ReceptionPortail, number | null>;
};
type EtatPrix = { etat: "ok"; v: Variantes } | { etat: "indispo" };
type Fenetre = null | "decor" | "moteur" | "portillon" | "details" | "plan" | "guide" | "visite";

/* ---------- Les textes de l'écran (français, anglais) ---------- */
const TXT = {
  fr: {
    configuration: "Configuration", couleur: "Couleur", matiere: "Matière",
    vosMesures: "Vos mesures", consigne: "Au plus étroit, d'un pilier à l'autre.", passage: "Passage entre piliers", hauteur: "Hauteur",
    pente: "Pente du sol derrière", penteAide: "Sur la longueur d'un vantail, 0 si le sol est plat.", aCorriger: "à corriger",
    infoPassageAuto: "Sans rail, le portail emmène un contrepoids derrière lui : 4 000 mm de passage au plus. Mesurez au plus étroit, entre les deux piliers.",
    infoPassage: "Mesurez au plus étroit, entre les deux piliers, en haut et en bas.", infoHauteur: "La hauteur du portail, sans les pointes.",
    infoPente: "Mesurée côté propriété, là où s'ouvrent les vantaux.", ouverture: "Ouverture", vantaux: "Vantaux", repartition: "Répartition",
    guidage: "Guidage", sens: "Il se range", sensPortillon: "Les gonds", fixation: "Fixation",
    legendeOuverture: "Toujours ouvert côté propriété. Nous vérifions vos piliers à la visite.",
    vuRue: "Vu depuis la rue · cotes en mm", placeDerriere: "Place derrière", placeCote: "Place le long de la clôture", chezVous: "Chez vous", rue: "Rue",
    votreStyle: "Votre style", stylesNote: "Prix posé à vos cotes, sans moteur", stylesNoteSansPose: "Prix sans pose à vos cotes", compose: "Composé à votre goût", des: "dès",
    aspect: "Aspect", formeHaut: "Forme du haut", basPortail: "Bas du portail", lisse: "Lisse en chêne", lisseRaison: "Haut droit seulement",
    decor: "Décor", decorAucun: "Aucun", decorAjouter: "Ajouter", decorDetail: "Volutes, frise, cœurs", moteur: "Moteur", sansMoteur: "Sans moteur",
    prixPose: "Prix posé", poseComprise: "Pose comprise jusqu'à 45 km de Saumur",
    cta: "Demander ma visite", visite: "Visite à partir de 19,99 €, déduite si vous commandez", calcul: "Calcul…", indispo: "Prix indisponible pour le moment",
    aEtudier: "À étudier à la visite", voirPlan: "Voir le plan", devis: "Estimation PDF", devisRaison: "Le devis à signer suit la visite.", details: "Détails",
    fabrique: "fabriqué en 6 à 8 semaines", vantail: "vantail de", vantauxDe: "vantaux de",
    fDecorSous: "Des volutes en fer forgé, soudées à l'atelier, posées par nous.", fDecorInfo: "Les volutes sont en fer forgé :", fDecorAcier: "votre portail passe en acier.",
    surMesure: "Sur mesure", surMesureLigne: "Votre motif : une photo, nous le dessinons. Prix sur devis.", sansDecor: "Sans décor",
    pied: "Le dessin suit chaque choix.", termine: "Terminé", fermer: "Fermer",
    fMoteurSous: "La jauge dit la facilité de pose. Somfy partout : une seule appli, les mêmes télécommandes.", conseille: "Conseillé",
    moteurMain: "Ouverture à la main. Nous posons les attentes : le moteur peut venir plus tard.", rienABrancher: "Rien à brancher",
    courant: "Le côté où arrive le courant se décide à la visite (le premier vantail et l'armoire vont de ce côté).",
    piedMoteur: "Prix posé, réglage compris.",
    facilite: (n: number) => `Facilité de pose : ${n} sur 10`, garantie: (n: number) => `Garantie ${n} ans.`, kit: "Télécommandes, cellules, feu et batterie.",
    dVotre: (nom: string) => `Votre ${nom.toLowerCase()}`, dDimensions: "Dimensions", dVantaux: "Vantaux", dMatiere: "Matière", dPoids: "Poids", dMoteur: "Moteur", dDelai: "Délai",
    dDelaiTxt: "6 à 8 semaines de fabrication, puis la pose", dCompris: "Ce que comprend le prix",
    compris: ["La visite et la mesure chez vous", "Le plan, la fabrication dans notre atelier, la finition", "La pose jusqu'à 45 km de Saumur, le réglage, les télécommandes"],
    dNonCompris: "Ce qui n'est pas compris", nonCompris: ["Le courant jusqu'au pilier (votre électricien)", "Le béton : massifs, longrine, socle, faits par votre maçon d'après notre plan", "Les piliers et leurs enduits"],
    dVisite: "Ce qui peut changer à la visite", visiteChange: ["Un pilier à reprendre ou fissuré", "Une différence de niveau, une pente derrière", "Des réseaux enterrés, un accès difficile"],
    fabriqueSaumur: "Fabriqué à Saumur", planTitre: "Le plan de votre portail", planSous: "Dessins de l'outil de l'atelier, cotes en mm. Le plan définitif suit la visite.",
    vueFace: "Vue de face, depuis la rue", vueDessus: "Vue de dessus : la place à laisser libre", vueCote: "Coupe",
    question: "Une question sur cette pièce ?", contact: "Nous contacter", voirCoulissant: "Voir le portail coulissant",
    formes: { droit: "Droit", chapeau: "Chapeau", creux: "Creux", biais: "Biais" }, sans: "Sans", avec: "Avec",
    soubCourt: { aucun: "Aucun", plein: "Plein", lames: "Lames", barreaux: "Barreaux" }, moteurMainCourt: "Ouverture à la main, moteur possible plus tard",
    matiereAlu: "Cadre alu thermolaqué", matiereAcier: "Acier galvanisé et thermolaqué",
    formules: "Formules", personnaliser: "Personnaliser", perso: "Personnalisé", emplacement: "Emplacement", ajouterEmplacement: "Ajouter un 2e emplacement",
    retirer: "Retirer", ou: "Où", forme: "Forme", hauteurDecor: "Hauteur", rythme: "Rythme", formeAlternee: "Seconde forme", finitions: "Finitions",
    bouts: "Bouts des volutes", barreauxDeco: "Barreaux", pointes: "Pointes", lance: "Lance", basPleinRequis: "Il faut un bas plein (tôle ou panneau).", dejaPris: "Déjà choisi pour l'autre emplacement.",
    zonesAide: "Touchez une zone du dessin pour y placer un décor.", piedPerso: "Deux emplacements au plus. Le dessin suit chaque choix.",
    portillon: "Portillon assorti", portillonAucun: "Aucun", portillonAjouter: "Ajouter", portillonDetail: "Même style, posé avec le portail",
    portillonSous: "Même style et même hauteur que votre portail, posé le même jour : une seule visite, un seul voyage.",
    portillonLargeur: "Passage du portillon", portillonInfo: "Mesurez au plus étroit, entre ses deux piliers.", portillonGonds: "Les gonds",
    portillonSeul: (p: string) => `${p} s'il est commandé seul`, piedPortillon: "Prix posé avec le portail.",
    vuePortillon: "Le portillon assorti, vu de la rue",
    etape: (n: number, total: number) => `Étape ${n} sur ${total}`, retour: "Retour", suivant: "Suivant", ctaCourt: "Ma visite", conseilAtelier: "Garder le conseil de l'atelier", eCouleur: "Couleur et matière",
    triCroissant: "Prix croissant", triDecroissant: "Prix décroissant", triTitre: "Inverser l'ordre des prix", triAria: (v: string) => `Trier par prix : ${v === "croissant" ? "croissant" : "décroissant"} (toucher pour inverser)`,
    commander: `Commander — acompte de ${ACOMPTE_PORTAIL_PCT} %`, commanderCourt: "Commander",
    acompte: (a: string) => `${a} d'acompte aujourd'hui, plus la visite de prise de cotes selon votre commune (déduite du solde) · le solde à la réception du portail posé.`,
    visiteTitre: "Votre visite de prise de cotes", visiteSous: "Nous venons mesurer vos piliers et votre sol avant de fabriquer. La visite se paie avec l'acompte, et elle est déduite du solde.",
    visiteCp: "Code postal du portail", visiteOu: "Où se trouve le portail ?",
    vAcompte: `Acompte de ${ACOMPTE_PORTAIL_PCT} %`, vVisite: "Visite de prise de cotes", vAujourdhui: "À payer aujourd'hui", vSolde: "Solde à la réception, visite déduite",
    vAjouter: "Ajouter au panier", vNote: "Le paiement se fait au panier. Le solde se règle à la réception du portail posé.",
    // La façon de recevoir le portail (Quentin, 10/10/2026) : posé par l'atelier, livré par transporteur (debout, sur palette) ou retiré à l'atelier.
    reception: "Réception", recPose: "Posé", recTransporteur: "Transporteur", recRetrait: "Retrait",
    recNote: {
      pose: (p: string) => `Posé par l'atelier : ${p}, visite et pose comprises.`,
      transporteur: (p: string) => `Livré debout, sur palette, sans pose : ${p} + la livraison selon votre commune et la taille du portail.`,
      retrait: (p: string) => `Retiré à l'atelier, à Saumur, sans pose : ${p}.`,
    },
    recNoteCourte: { pose: "visite et pose comprises", transporteur: "sans pose · livraison selon votre commune", retrait: "sans pose · à l'atelier, à Saumur" },
    moteurSeulementPose: "Motorisation : posée par l'atelier seulement (la conformité CE de l'ensemble est de notre responsabilité).",
    prixSansPose: "Prix sans pose", sansPoseNote: "Sans pose : le portail part debout sur palette, ou vous venez le retirer à l'atelier.",
    acompteTransporteur: (a: string) => `${a} d'acompte aujourd'hui, plus la livraison selon votre commune · le solde avant l'expédition.`,
    acompteRetrait: (a: string) => `${a} d'acompte aujourd'hui · le solde au retrait à l'atelier.`,
    cmdTitre: "Votre commande", livTitre: "Livraison par transporteur", livSous: "Le portail voyage debout, calé sur une palette faite à l'atelier. Le prix de la livraison suit sa taille, son poids et la distance.",
    livCp: "Code postal de livraison", livOu: "Où livrer le portail ?", livColis: (kg: string, l: string) => `Colis : environ ${kg} kg, pièce la plus longue ${l} mm, debout sur palette.`,
    retTitre: "Retrait à l'atelier", retSous: "Vous venez chercher le portail à l'atelier, à Saumur, sur rendez-vous : gratuit. Nous vous appelons dès qu'il est prêt.",
    vLivraison: "Livraison par transporteur", vSoldeExpedition: "Solde avant l'expédition", vSoldeRetrait: "Solde au retrait à l'atelier",
    vNoteTransporteur: "Le paiement se fait au panier. Le solde se règle avant l'expédition ; la pose n'est pas comprise.",
    vNoteRetrait: "Le paiement se fait au panier. Le solde se règle au retrait ; la pose n'est pas comprise.",
    dont: "Dont", dontMoteur: "moteur", dontDecor: "décor", dontPortillon: "portillon",
    moulures: "Moulures", moulureDetail: "Un médaillon par vantail, vissé par derrière", moulureBasPlein: "Il faut un bas plein",
  },
  en: {
    configuration: "Configuration", couleur: "Colour", matiere: "Material",
    vosMesures: "Your measurements", consigne: "At the narrowest point, pillar to pillar.", passage: "Opening between pillars", hauteur: "Height",
    pente: "Ground slope behind", penteAide: "Over the length of one leaf, 0 if the ground is flat.", aCorriger: "to fix",
    infoPassageAuto: "Without a rail, the gate carries a counterweight behind it: 4,000 mm opening at most. Measure at the narrowest point between the two pillars.",
    infoPassage: "Measure at the narrowest point between the two pillars, top and bottom.", infoHauteur: "The height of the gate, without spear tips.",
    infoPente: "Measured on the property side, where the leaves open.", ouverture: "Opening", vantaux: "Leaves", repartition: "Split",
    guidage: "Guiding", sens: "Slides to the", sensPortillon: "Hinges", fixation: "Fixing",
    legendeOuverture: "Always opens onto your property. We check your pillars at the survey visit.",
    vuRue: "Seen from the street · dimensions in mm", placeDerriere: "Space behind", placeCote: "Space along the fence", chezVous: "Your side", rue: "Street",
    votreStyle: "Your style", stylesNote: "Fitted price at your size, without motor", stylesNoteSansPose: "Price without fitting at your size", compose: "Made to your taste", des: "from",
    aspect: "Look", formeHaut: "Top shape", basPortail: "Lower panel", lisse: "Oak top rail", lisseRaison: "Straight top only",
    decor: "Decoration", decorAucun: "None", decorAjouter: "Add", decorDetail: "Scrolls, frieze, hearts", moteur: "Motor", sansMoteur: "No motor",
    prixPose: "Fitted price", poseComprise: "Fitting included within 45 km of Saumur",
    cta: "Book my survey visit", visite: "Survey visit from €19.99, deducted if you order", calcul: "Calculating…", indispo: "Price unavailable for now",
    aEtudier: "To be studied at the visit", voirPlan: "See the plan", devis: "PDF estimate", devisRaison: "The quote to sign follows the visit.", details: "Details",
    fabrique: "made in 6 to 8 weeks", vantail: "leaf of", vantauxDe: "leaves of",
    fDecorSous: "Wrought-iron scrolls, welded in our workshop, fitted by us.", fDecorInfo: "The scrolls are wrought iron:", fDecorAcier: "your gate becomes steel.",
    surMesure: "Bespoke", surMesureLigne: "Your own motif: send a photo, we draw it. Price on quotation.", sansDecor: "No decoration",
    pied: "The drawing follows every choice.", termine: "Done", fermer: "Close",
    fMoteurSous: "The gauge shows how easy it is to fit. Somfy throughout: one app, the same remotes.", conseille: "Recommended",
    moteurMain: "Opens by hand. We fit the provisions: a motor can come later.", rienABrancher: "Nothing to wire",
    courant: "Which side the power comes from is decided at the visit (the first leaf and the control box go on that side).",
    piedMoteur: "Fitted price, adjustment included.",
    facilite: (n: number) => `Ease of fitting: ${n} out of 10`, garantie: (n: number) => `${n}-year warranty.`, kit: "Remotes, photocells, light and battery.",
    dVotre: (nom: string) => `Your ${nom.toLowerCase()}`, dDimensions: "Size", dVantaux: "Leaves", dMatiere: "Material", dPoids: "Weight", dMoteur: "Motor", dDelai: "Lead time",
    dDelaiTxt: "6 to 8 weeks of making, then fitting", dCompris: "What the price includes",
    compris: ["The survey visit and measuring at your home", "The plan, making in our workshop, the finish", "Fitting within 45 km of Saumur, adjustment, the remotes"],
    dNonCompris: "Not included", nonCompris: ["Power up to the pillar (your electrician)", "Concrete: footings, ground beam, base, by your builder from our plan", "The pillars and their render"],
    dVisite: "What can change at the visit", visiteChange: ["A pillar to repair or cracked", "A level difference, a slope behind", "Buried networks, difficult access"],
    fabriqueSaumur: "Made in Saumur", planTitre: "Your gate's plan", planSous: "Drawings from the workshop's tool, dimensions in mm. The final plan follows the visit.",
    vueFace: "Front view, from the street", vueDessus: "Top view: the space to keep clear", vueCote: "Section",
    question: "A question about this piece?", contact: "Contact us", voirCoulissant: "See the sliding gate",
    formes: { droit: "Straight", chapeau: "Arched", creux: "Dipped", biais: "Sloped" }, sans: "No", avec: "Yes",
    soubCourt: { aucun: "None", plein: "Solid", lames: "Slats", barreaux: "Bars" }, moteurMainCourt: "Opens by hand, motor possible later",
    matiereAlu: "Powder-coated aluminium frame", matiereAcier: "Galvanised, powder-coated steel",
    formules: "Designs", personnaliser: "Customise", perso: "Custom", emplacement: "Position", ajouterEmplacement: "Add a 2nd position",
    retirer: "Remove", ou: "Where", forme: "Shape", hauteurDecor: "Height", rythme: "Rhythm", formeAlternee: "Second shape", finitions: "Finishes",
    bouts: "Scroll ends", barreauxDeco: "Bars", pointes: "Tips", lance: "Spear", basPleinRequis: "Needs a solid lower panel (sheet or panel).", dejaPris: "Already chosen for the other position.",
    zonesAide: "Tap an area of the drawing to place a decoration there.", piedPerso: "Two positions at most. The drawing follows every choice.",
    portillon: "Matching pedestrian gate", portillonAucun: "None", portillonAjouter: "Add", portillonDetail: "Same style, fitted with the gate",
    portillonSous: "Same style and height as your gate, fitted the same day: one survey visit, one trip.",
    portillonLargeur: "Pedestrian gate opening", portillonInfo: "Measure at the narrowest point, between its two pillars.", portillonGonds: "Hinges",
    portillonSeul: (p: string) => `${p} if ordered on its own`, piedPortillon: "Fitted price, with the gate.",
    vuePortillon: "The matching pedestrian gate, from the street",
    etape: (n: number, total: number) => `Step ${n} of ${total}`, retour: "Back", suivant: "Next", ctaCourt: "Book visit", conseilAtelier: "Keep the workshop's advice", eCouleur: "Colour and material",
    triCroissant: "Price: low to high", triDecroissant: "Price: high to low", triTitre: "Reverse the price order", triAria: (v: string) => `Sort by price: ${v === "croissant" ? "low to high" : "high to low"} (tap to reverse)`,
    commander: `Order — ${ACOMPTE_PORTAIL_PCT}% deposit`, commanderCourt: "Order",
    acompte: (a: string) => `${a} deposit today, plus the survey visit priced by your postcode (deducted from the balance) · the balance when the fitted gate is handed over.`,
    visiteTitre: "Your survey visit", visiteSous: "We come and measure your pillars and your ground before making the gate. The visit is paid with the deposit, and deducted from the balance.",
    visiteCp: "Postcode of the gate", visiteOu: "Where is the gate?",
    vAcompte: `${ACOMPTE_PORTAIL_PCT}% deposit`, vVisite: "Survey visit", vAujourdhui: "To pay today", vSolde: "Balance on handover, visit deducted",
    vAjouter: "Add to basket", vNote: "Payment is made in the basket. The balance is paid when the fitted gate is handed over.",
    reception: "Reception", recPose: "Fitted", recTransporteur: "Carrier", recRetrait: "Collect",
    recNote: {
      pose: (p: string) => `Fitted by the workshop: ${p}, survey visit and fitting included.`,
      transporteur: (p: string) => `Delivered upright on a pallet, no fitting: ${p} + delivery according to your town and the size of the gate.`,
      retrait: (p: string) => `Collected at the workshop in Saumur, no fitting: ${p}.`,
    },
    recNoteCourte: { pose: "survey visit and fitting included", transporteur: "no fitting · delivery by your town", retrait: "no fitting · at the workshop in Saumur" },
    moteurSeulementPose: "Motor: fitted by the workshop only (the CE compliance of the whole is our responsibility).",
    prixSansPose: "Price without fitting", sansPoseNote: "Without fitting: the gate leaves upright on a pallet, or you collect it at the workshop.",
    acompteTransporteur: (a: string) => `${a} deposit today, plus delivery according to your town · the balance before shipping.`,
    acompteRetrait: (a: string) => `${a} deposit today · the balance when you collect it at the workshop.`,
    cmdTitre: "Your order", livTitre: "Delivery by carrier", livSous: "The gate travels upright, wedged on a pallet made at the workshop. The delivery price follows its size, its weight and the distance.",
    livCp: "Delivery postcode", livOu: "Where should we deliver the gate?", livColis: (kg: string, l: string) => `Parcel: about ${kg} kg, longest piece ${l} mm, upright on a pallet.`,
    retTitre: "Collection at the workshop", retSous: "You collect the gate at the workshop in Saumur, by appointment: free. We call you as soon as it is ready.",
    vLivraison: "Delivery by carrier", vSoldeExpedition: "Balance before shipping", vSoldeRetrait: "Balance on collection",
    vNoteTransporteur: "Payment is made in the basket. The balance is paid before shipping; fitting is not included.",
    vNoteRetrait: "Payment is made in the basket. The balance is paid on collection; fitting is not included.",
    dont: "Including", dontMoteur: "motor", dontDecor: "decoration", dontPortillon: "pedestrian gate",
    moulures: "Mouldings", moulureDetail: "One medallion per leaf, screwed from behind", moulureBasPlein: "Needs a solid lower panel",
  },
} as const;

/* ---------- Petits dessins de l'interface ---------- */
const FORME_PICTO: Record<ConfigPortail["forme"], string> = { droit: "M2 13V4h14v9", chapeau: "M2 13V6Q9 0.5 16 6v7", creux: "M2 13V3Q9 8.5 16 3v10", biais: "M2 13V3l14 4.5V13" };
const PictoForme = ({ k }: { k: ConfigPortail["forme"] }) => (<svg viewBox="0 0 18 15" aria-hidden="true"><path d={FORME_PICTO[k]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>);
const PICTO_COTE = { passage: "M2 5v8M16 5v8M3 9h12M5.5 6.6 3 9l2.5 2.4M12.5 6.6 15 9l-2.5 2.4", hauteur: "M5 2h8M5 16h8M9 3v12M6.6 5.5 9 3l2.4 2.5M6.6 12.5 9 15l2.4-2.5", pente: "M2 15h14M2 15l14-6" };
const PictoCote = ({ k }: { k: keyof typeof PICTO_COTE }) => (<svg viewBox="0 0 18 18" aria-hidden="true"><path d={PICTO_COTE[k]} fill="none" stroke="#6f6357" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ChevronBas = () => (<svg className="cpt-chevron-bas" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Coche = () => (<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 6.3 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Croix = () => (<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const PictoPlace = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16h12M5 16V5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M5 5a11 11 0 0 1 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.2 2.2" /></svg>);
const PictoPlus = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="#6f6357" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const PictoPhoto = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6.5h3l1.5-2h5l1.5 2h3v9H3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><circle cx="10" cy="11" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>);
const PictoAtelier = () => (<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 17V8l5-3.5V8l5-3.5V8l5-3.5V17z" fill="none" stroke="#2b2320" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 17v-4h4v4" fill="none" stroke="#2b2320" strokeWidth="1.4" /></svg>);
const PICTO_MOTEUR: Record<CleMoteur, ReactNode> = {
  ixengo: (<svg viewBox="0 0 54 54" aria-hidden="true"><rect x="9" y="12" width="7" height="30" rx="1.5" fill="#dcd2c3" stroke="#b8a993" /><path d="M16 27h10" stroke="#2b2320" strokeWidth="2" strokeLinecap="round" /><rect x="25" y="23.5" width="17" height="7" rx="3.5" fill="#3a3f43" /><path d="M42 27h5" stroke="#2b2320" strokeWidth="2" strokeLinecap="round" /><path d="M47 14v26" stroke="#3a3f43" strokeWidth="3" strokeLinecap="round" /></svg>),
  axovia: (<svg viewBox="0 0 54 54" aria-hidden="true"><rect x="7" y="12" width="12" height="30" rx="1.5" fill="#dcd2c3" stroke="#b8a993" /><rect x="19" y="22" width="8" height="10" rx="2" fill="#3a3f43" /><path d="M27 27l9-8 9 8" fill="none" stroke="#2b2320" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M46 14v26" stroke="#3a3f43" strokeWidth="3" strokeLinecap="round" /></svg>),
  elixo: (<svg viewBox="0 0 54 54" aria-hidden="true"><rect x="8" y="26" width="16" height="16" rx="2" fill="#3a3f43" /><path d="M6 44h44" stroke="#b8a993" strokeWidth="2" /><path d="M24 38h24" stroke="#2b2320" strokeWidth="2.4" strokeDasharray="3 2" /><rect x="22" y="14" width="26" height="20" rx="1.5" fill="none" stroke="#3a3f43" strokeWidth="2" /></svg>),
  aucun: (<svg viewBox="0 0 54 54" aria-hidden="true"><rect x="9" y="12" width="7" height="30" rx="1.5" fill="#dcd2c3" stroke="#b8a993" /><path d="M16 27h6M24 18v18M24 27h6" stroke="#2b2320" strokeWidth="2" strokeLinecap="round" /></svg>),
};

/** Une vue de l'outil en SVG (svgDe), habillée de la couleur choisie ; sans cotes pour les vignettes. */
export function Vue({ prims, couleur, petit = false, sansCotes = false, label, className, zones, onZone }: { prims: Prims; couleur: ConfigPortail["couleur"]; petit?: boolean; sansCotes?: boolean; label: string; className?: string; zones?: Prims; onZone?: (cle: string) => void }) {
  const r = useMemo(() => svgDe(sansCotes ? prims.filter((p) => p.t !== "cote" && p.t !== "texte") : prims, petit), [prims, petit, sansCotes]);
  // Les zones du décor (fenêtre Décor ouverte) : dessinées dans le même repère, sans changer le cadre du dessin.
  const htmlZones = useMemo(() => (zones?.length ? svgDe(zones, petit).html : ""), [zones, petit]);
  // Sans cotes, la marge que svgDe garde pour leurs chiffres ne sert à rien : on serre le cadre sur le dessin.
  const m = sansCotes ? r.fs * 8.5 * 0.9 : 0;
  const vb = [r.vb[0] + m, r.vb[1] + m, r.vb[2] - 2 * m, r.vb[3] - 2 * m];
  return (
    <svg role="img" aria-label={label} viewBox={vb.map((x) => x.toFixed(1)).join(" ")} className={`rendu ${className ?? ""}`} preserveAspectRatio="xMidYMid meet"
      onClick={onZone ? (e) => { const z = (e.target as Element).closest?.("[data-piece^='zone:']"); if (z) onZone(String(z.getAttribute("data-piece")).slice(5)); } : undefined}>
      <style>{STYLE_RENDU_PORTAIL(couleur)}</style>
      <g dangerouslySetInnerHTML={{ __html: r.html }} />
      {htmlZones && <g className="cpt-zones" dangerouslySetInnerHTML={{ __html: htmlZones }} />}
    </svg>
  );
}

/** La pilule segmentée (marqueurs du verre : role=radiogroup, rounded-full, border-[#9a8d80]). */
export function Pilule<T extends string | number>({ aria, valeur, options, onChange, picto = false, desactive = [] }: { aria: string; valeur: T | ""; options: { v: T; label: string; icone?: ReactNode; titre?: string }[]; onChange: (v: T) => void; picto?: boolean; desactive?: T[] }) {
  return (
    <div role="radiogroup" aria-label={aria} className={`cpt-pilule rounded-full border-[#9a8d80] bg-white ${picto ? "cpt-pilule-picto" : ""}`} style={{ gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))` }}>
      {options.map((o) => {
        const off = desactive.includes(o.v);
        return (
          <button key={String(o.v)} type="button" role="radio" aria-checked={valeur === o.v} aria-disabled={off || undefined} title={o.titre}
            onClick={() => { if (!off) onChange(o.v); }}>
            {o.icone}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Une cote : curseur et case, bornés par l'atelier. Une cote hors bornes est dite « à corriger », jamais corrigée en douce. */
export function LigneCote({ picto, titre, info, valeur, bornes, onChange, aide, aCorriger }: { picto: keyof typeof PICTO_COTE; titre: string; info: string; valeur: number; bornes: [number, number]; onChange: (n: number) => void; aide?: string; aCorriger: string }) {
  const [texte, setTexte] = useState(String(valeur));
  // La case suit le curseur : quand la cote change d'ailleurs, le texte reprend sa valeur (pendant le rendu, sans effet).
  const [vue, setVue] = useState(valeur);
  if (vue !== valeur) { setVue(valeur); setTexte(String(valeur)); }
  const n = Math.round(Number(texte.replace(/\s/g, "").replace(",", ".")));
  const hors = !Number.isFinite(n) || n < bornes[0] || n > bornes[1];
  const valider = () => { if (!hors && n !== valeur) onChange(n); };
  return (
    <div className="cpt-cote">
      <div className="cpt-cote-titre"><PictoCote k={picto} /><span className="cpt-ct-nom">{titre}{hors && <span className="cpt-a-corriger">{aCorriger}</span>}</span><span className="cpt-info" title={info} aria-label={info} role="note">i</span></div>
      <div className="cpt-cote-rang">
        <input type="range" className="curseur-cote" min={bornes[0]} max={bornes[1]} step={picto === "pente" ? 5 : 10} value={Math.min(bornes[1], Math.max(bornes[0], valeur))} aria-label={titre} onChange={(e) => onChange(Number(e.target.value))} />
        <label className={`cpt-pastille rounded-full border-[#9a8d80] bg-white ${hors ? "hors" : ""}`}>
          <input type="text" inputMode="numeric" value={texte} aria-label={`${titre} (mm)`} aria-invalid={hors || undefined}
            onChange={(e) => setTexte(e.target.value)} onBlur={valider} onKeyDown={(e) => { if (e.key === "Enter") valider(); }} />
          <span>mm</span>
        </label>
      </div>
      {aide && <p className="cpt-cote-aide">{aide}</p>}
    </div>
  );
}

/** La jauge de facilité de pose (10 traits). */
const Jauge = ({ n, phrase, aria }: { n: number; phrase: string; aria: string }) => (
  <span className="porte-facilite"><span className="porte-jauge" role="img" aria-label={aria}>{Array.from({ length: 10 }, (_, i) => <i key={i} data-plein={i < n ? "" : undefined} />)}</span><span>{phrase}</span></span>
);

/** La croix qui ferme une fenêtre. */
const Fermer = ({ label, onClose }: { label: string; onClose: () => void }) => (<button type="button" className="cpt-fermer" aria-label={label} onClick={onClose}><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="#3c3c43" strokeWidth="1.6" strokeLinecap="round" /></svg></button>);
/** Le pied d'une fenêtre : une phrase et « Terminé ». */
const Pied = ({ phrase, termine, onClose }: { phrase: string; termine: string; onClose: () => void }) => (<div className="cpt-f-pied"><span>{phrase}</span><button type="button" className="btn-verre" onClick={onClose}>{termine}</button></div>);

/* ---------- Le décor « Personnaliser » et ses zones sur le croquis ---------- */
const FORMULES = PT_DECOR_FORMULES as Record<string, { nom: string; ligne: string; choix: Record<string, string>[] }>;

/** Un emplacement rendu valable : une forme qu'il accepte, la hauteur pour « entre les barreaux », un rythme possible. */
function normaliser(c: ChoixDecor): ChoixDecor {
  const formes = formesDe(c.assemblage);
  const forme = formes.includes(c.forme) ? c.forme : formes[0];
  const r: ChoixDecor = { assemblage: c.assemblage, forme };
  if (c.assemblage === "entre") r.pos = c.pos ?? "haut";
  if (c.rythme === "unSurDeux") r.rythme = "unSurDeux";
  if (c.rythme === "alterne" && formes.length > 1) {
    r.rythme = "alterne";
    r.forme2 = c.forme2 && formes.includes(c.forme2) && c.forme2 !== forme ? c.forme2 : formes.find((f) => f !== forme);
  }
  return r;
}

/** Les emplacements du décor choisi : ceux de « Personnaliser », ou ceux de la formule (point de départ des retouches). */
function choixDe(cfg: ConfigPortail): ChoixDecor[] {
  if (cfg.decor === "perso") return cfg.decorChoix;
  if (cfg.decor === "aucun" || cfg.decor === "surMesure") return [];
  return (FORMULES[cfg.decor]?.choix ?? []).map((x) => normaliser(x as unknown as ChoixDecor));
}

/** Les zones du croquis où l'on touche pour placer un décor ; chacune est la place qu'y prend un décor dessiné par l'outil. */
const ZONES_DECOR: { cle: string; choix: ChoixDecor }[] = [
  { cle: "cimier", choix: { assemblage: "cimier", forme: "C" } },
  { cle: "haut", choix: { assemblage: "entre", forme: "C", pos: "haut" } },
  { cle: "milieu", choix: { assemblage: "medaillon", forme: "doubleC" } },
  { cle: "bas", choix: { assemblage: "entre", forme: "C", pos: "bas" } },
  { cle: "plein", choix: { assemblage: "appliquePlein", forme: "doubleC" } },
];
const memeZone = (a: ChoixDecor, b: ChoixDecor) => a.assemblage === b.assemblage && (a.assemblage !== "entre" || (a.pos ?? "haut") === (b.pos ?? "haut"));

function zonesDecor(slug: SlugPortail, cfg: ConfigPortail): { cle: string; boites: number[][] }[] {
  const base: ConfigPortail = { ...cfg, mat: "acier", remp: "barreaux", moteur: false, portillon: false };
  const deja = new Set((planPortail(slug, { ...base, decor: "aucun", decorChoix: [] }).vues.face as Prims).map((p) => JSON.stringify(p)));
  const sortie: { cle: string; boites: number[][] }[] = [];
  for (const z of ZONES_DECOR) {
    if (!emplacementPermis(z.choix.assemblage, base)) continue;
    const R = planPortail(slug, { ...base, decor: "perso", decorChoix: [z.choix] });
    if (R.alertes.length) continue;
    const boites = (R.vues.face as Prims)
      .filter((p) => p.t === "poly" && !deja.has(JSON.stringify(p)) && !(Array.isArray(p.piece) ? p.piece : [p.piece]).includes("Barreaux"))
      .map((p) => { const pts = p.pts as [number, number][]; const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; })
      .sort((a, b) => a[0] - b[0]);
    // Une zone par vantail (ou panneau) : deux groupes de pièces séparés de plus de 120 mm sont deux zones.
    const groupes: number[][] = [];
    for (const b of boites) {
      const g = groupes[groupes.length - 1];
      if (g && b[0] - g[2] < 120) { g[0] = Math.min(g[0], b[0]); g[1] = Math.min(g[1], b[1]); g[2] = Math.max(g[2], b[2]); g[3] = Math.max(g[3], b[3]); }
      else groupes.push([...b]);
    }
    if (groupes.length) sortie.push({ cle: z.cle, boites: groupes });
  }
  return sortie;
}

const MEDIA_TEL = "(max-width: 767px)";
const abonnerTelephone = (f: () => void) => { const m = window.matchMedia(MEDIA_TEL); m.addEventListener("change", f); return () => m.removeEventListener("change", f); };

type InfosMoteurs = {
  permis: { cle: CleMoteur; nom: string; principe: string; contenu: string; garantie: number; facilite: number }[];
  refus: { cle: CleMoteur | null; nom: string; raison: string }[];
  conseille: { cle: CleMoteur } | null;
  choisi: { cle: CleMoteur } | null;
};

/** La livraison par transporteur d'un portail : son code postal, et le prix que le SERVEUR calcule d'après le colis du plan (jamais un poids envoyé). */
type EtatLivraison = { codePostal: string; deplacement: (Deplacement & { kg?: number; plusGrandeCoteMm?: number }) | null };
function LivraisonPortail({ etat, onChange, requete, t, locale, euros }: {
  etat: EtatLivraison; onChange: (e: EtatLivraison) => void; requete: string; locale: Langue; euros: (n: number) => string;
  t: { livCp: string; livOu: string; livColis: (kg: string, l: string) => string };
}) {
  const [reponse, setReponse] = useState<{ cp: string; etat: "calcul" | "ok" | "erreur" | "invalide" | "hors" | "long" } | null>(null);
  const codePostal = etat.codePostal.replace(/\s+/g, "");
  const complet = /^\d{5}$/.test(codePostal);
  useEffect(() => {
    if (!complet) return;
    let annule = false;
    const minuteur = setTimeout(() => {
      setReponse({ cp: codePostal, etat: "calcul" });
      fetch(`/api/deplacement?cp=${codePostal}&pour=livraison&${requete}`)
        .then(async (r) => {
          const json = await r.json().catch(() => ({}));
          if (annule) return;
          if (r.ok) { setReponse({ cp: codePostal, etat: "ok" }); onChange({ codePostal: etat.codePostal, deplacement: json as Deplacement }); }
          else {
            setReponse({ cp: codePostal, etat: json.error === "hors_metropole" ? "hors" : json.error === "code_postal_invalide" ? "invalide" : json.error === "trop_long" ? "long" : "erreur" });
            onChange({ codePostal: etat.codePostal, deplacement: null });
          }
        })
        .catch(() => { if (!annule) setReponse({ cp: codePostal, etat: "erreur" }); });
    }, 350);
    return () => { annule = true; clearTimeout(minuteur); };
    // Seuls le code postal et le portail (la requête) déclenchent le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codePostal, complet, requete]);
  const etatAffiche = !complet ? (codePostal ? "invalide" : "attente") : reponse?.cp === codePostal ? reponse.etat : "calcul";
  const d = etat.deplacement;
  const fr = locale === "fr";
  return (
    <div className="cpt-livraison">
      <label className="cpt-livraison-q" htmlFor="cpt-liv-cp">{t.livOu}</label>
      <input id="cpt-liv-cp" className="cpt-livraison-cp" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="49400" aria-label={t.livCp}
        value={etat.codePostal} onChange={(e) => onChange({ codePostal: e.target.value.replace(/\D/g, "").slice(0, 5), deplacement: null })} />
      {etatAffiche === "calcul" && <p className="cpt-livraison-note">{fr ? "Calcul du prix…" : "Calculating the price…"}</p>}
      {etatAffiche === "invalide" && <p className="cpt-livraison-note">{fr ? "Entrez les 5 chiffres du code postal." : "Enter the 5-digit postcode."}</p>}
      {etatAffiche === "hors" && <p className="cpt-livraison-alerte">{fr ? "Nous livrons en France métropolitaine." : "We deliver within mainland France."}</p>}
      {etatAffiche === "long" && <p className="cpt-livraison-alerte">{fr ? "Ce portail est trop long pour un transporteur : choisissez le retrait à l'atelier ou la pose." : "This gate is too long for a carrier: choose collection at the workshop or fitting."}</p>}
      {etatAffiche === "erreur" && <p className="cpt-livraison-alerte">{fr ? "Le prix de la livraison n'a pas pu être calculé. Réessayez dans un instant." : "The delivery price could not be calculated. Please try again in a moment."}</p>}
      {etatAffiche === "ok" && d && (
        <div className="cpt-livraison-prix">
          <b>{d.commune}</b><span>{euros(d.montantCents / 100)}</span>
          {d.kg !== undefined && d.plusGrandeCoteMm !== undefined && <small>{t.livColis(String(d.kg), String(d.plusGrandeCoteMm))}</small>}
        </div>
      )}
    </div>
  );
}

export function PortailConfigurateur({ slug, locale, nom, filAriane, image, tVisite }: {
  /** L'image de la fiche, pour la carte du panier. */
  image?: string;
  /** Les mots du dictionnaire pour la visite de prise de cotes (code postal, créneau), partagés avec le garde-corps. */
  tVisite: Dictionary["artisanat"];
  slug: SlugPortail;
  locale: Langue;
  nom: string;
  filAriane?: { label: string; etapes: { nom: string; href: string }[] };
}) {
  const t = TXT[locale], tp = TEXTES_PORTAIL[locale];
  const bP = bornesPortail("portillon");
  const [cfg, setCfg] = useState<ConfigPortail>(() => configDepart(slug, slug === "portail-battant" ? "lamesChene" : slug === "portillon" ? "rosace" : "plein"));
  // Les bornes du passage : celles du coulissant dépendent du guidage (sans rail, la queue de contrepoids compte : 4 000 mm au plus).
  const b = bornesPortail(slug, cfg.guidage);
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [guide, setGuide] = useState<{ derriere?: boolean; cote?: boolean; sol?: boolean }>({});
  // La fenêtre Décor : les formules, ou « Personnaliser » (2 emplacements au plus) ; l'emplacement en cours de réglage.
  const [modeDecor, setModeDecor] = useState<"formules" | "perso">("formules");
  const [empl, setEmpl] = useState(0);
  // Téléphone (lot 11) : moins de 768 px de large ; l'étape en cours du parcours.
  const tel = useSyncExternalStore(abonnerTelephone, () => window.matchMedia(MEDIA_TEL).matches, () => false);
  const [etape, setEtape] = useState(0);
  // La page des portails envoie les cotes et le guidage dans l'adresse (?P=3500&H=1600&guidage=auto) : repris au premier affichage.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const P = Number(q.get("P")), H = Number(q.get("H")), guidage = q.get("guidage");
    const maj2: Partial<ConfigPortail> = {};
    if (Number.isFinite(P) && P >= b.P[0] && P <= b.P[1] && q.has("P")) maj2.P = Math.round(P);
    if (Number.isFinite(H) && H >= b.H[0] && H <= b.H[1] && q.has("H")) maj2.H = Math.round(H);
    if (slug === "portail-coulissant" && (guidage === "rail" || guidage === "auto")) maj2.guidage = guidage;
    if (!Object.keys(maj2).length) return;
    const id = requestAnimationFrame(() => setCfg((c) => ({ ...c, ...maj2 })));   // après le premier affichage : pas d'écart avec le serveur
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Le bandeau des styles : prix croissant ou décroissant (Quentin, 10/10/2026 : « comme les garde-corps »).
  const [tri, setTri] = useState<"croissant" | "decroissant">("croissant");
  const maj = (p: Partial<ConfigPortail>) => setCfg((c) => {
    const n = { ...c, ...p };
    // Sans pose (transporteur, retrait), pas de moteur : l'atelier le pose lui-même.
    if (n.reception !== "pose") n.moteur = false;
    // Le passage reste dans les bornes du guidage choisi (sans rail : 4 000 mm au plus).
    const max = bornesPortail(slug, n.guidage).P[1];
    return n.P > max ? { ...n, P: max } : n;
  });
  const style = styleDe(cfg);
  const fr = locale === "fr";
  const nf = (n: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB").format(Math.round(n));
  const euros = (n: number) => prixAffiche(n, locale);
  const ecart = (n: number) => `${n >= 0 ? "+" : "−"} ${euros(Math.abs(n))}`;

  // Le plan de l'outil, dans le navigateur (moteur public, sans prix).
  const R = useMemo(() => planPortail(slug, cfg), [slug, cfg]);
  // Les vignettes des styles et des décors suivent la configuration sans bloquer la frappe (rendu différé).
  const cfgLente = useDeferredValue(cfg);
  const vignettes = useMemo(
    () => STYLES_PORTAIL.map((st) => ({ st, prims: planPortail(slug, { ...appliquerStyle(cfgLente, st), couleur: cfgLente.couleur }).vues.face as Prims })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, cfgLente.P, cfgLente.H, cfgLente.vantaux, cfgLente.rep, cfgLente.guidage, cfgLente.sens, cfgLente.poteaux, cfgLente.couleur],
  );
  const decorsDessines = useMemo(() => {
    if (fenetre !== "decor") return [];
    return DECORS_PORTAIL.filter((d) => d !== "aucun" && d !== "surMesure" && d !== "perso").map((d) => ({ d, prims: planPortail(slug, { ...cfgLente, decor: d, mat: "acier", remp: "barreaux", moteur: false }).vues.face as Prims }));
  }, [fenetre, slug, cfgLente]);

  // « Personnaliser » : la tuile de chaque emplacement possible, dessinée avec l'autre emplacement, ou grisée avec sa raison.
  const tuilesOu = useMemo(() => {
    if (fenetre !== "decor" || modeDecor !== "perso") return [];
    const L = choixDe(cfgLente), cur = L[empl] ?? L[0] ?? { assemblage: "entre" as const, forme: "C", pos: "haut" as const }, autre = L.length > 1 ? L[1 - Math.min(empl, 1)] : undefined;
    const base: ConfigPortail = { ...cfgLente, mat: "acier", remp: "barreaux", moteur: false, portillon: false };
    return EMPLACEMENTS_DECOR.map((a) => {
      const ch = normaliser({ ...cur, assemblage: a });
      const combo = autre ? (empl === 0 ? [ch, autre] : [autre, ch]) : [ch];
      const R = planPortail(slug, { ...base, decor: "perso", decorChoix: combo });
      const raison = !emplacementPermis(a, base) ? t.basPleinRequis : autre && autre.assemblage === a ? t.dejaPris : (R.alertes[0] ?? null);
      return { a, prims: R.vues.face as Prims, raison };
    });
  }, [fenetre, modeDecor, empl, slug, cfgLente, t]);
  // Les zones du croquis (fenêtre Décor ouverte) : la place de chaque décor, calculée par l'outil à ces cotes.
  const zones = useMemo(
    () => (fenetre === "decor" ? zonesDecor(slug, cfgLente) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fenetre, slug, cfgLente.P, cfgLente.H, cfgLente.forme, cfgLente.fleche, cfgLente.soub, cfgLente.hSoub, cfgLente.vantaux, cfgLente.rep, cfgLente.guidage, cfgLente.sens, cfgLente.poteaux, cfgLente.pente],
  );
  // Le portillon assorti, dessiné par l'outil (même composition, sa largeur, ses gonds).
  const portillonPrims = useMemo(
    () => (slug !== "portillon" && (cfgLente.portillon || fenetre === "portillon") ? (planPortail("portillon", configPortillonAssorti(cfgLente)).vues.face as Prims) : null),
    [slug, cfgLente, fenetre],
  );

  // Les prix : demandés au serveur une fois la frappe posée (le portail, ses styles, ses décors et ses moteurs d'un coup).
  const cle = versParams(slug, cfg).toString();
  const [reponse, setReponse] = useState<{ cle: string; etat: EtatPrix } | null>(null);
  // Pendant le calcul, on garde les derniers prix (grisés) plutôt qu'un trou.
  const [dernier, setDernier] = useState<Variantes | null>(null);
  useEffect(() => {
    let annule = false;
    const minuteur = setTimeout(async () => {
      let etat: EtatPrix;
      try {
        const rep = await fetch(`/api/prix-portail?${cle}&variantes=1`);
        etat = rep.ok ? { etat: "ok", v: (await rep.json()) as Variantes } : { etat: "indispo" };
      } catch {
        etat = { etat: "indispo" };
      }
      if (!annule) { setReponse({ cle, etat }); if (etat.etat === "ok") setDernier(etat.v); }
    }, 320);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [cle]);
  const vFrais = reponse?.etat.etat === "ok" ? reponse.etat.v : null;
  const perime = reponse?.cle !== cle;
  const V = vFrais ?? dernier;
  // Le bandeau trié par prix (un prix inconnu reste à la fin) ; sans prix encore, l'ordre de l'atelier.
  const vignettesTriees = useMemo(() => {
    if (!V) return vignettes;
    const sens = tri === "croissant" ? 1 : -1;
    return [...vignettes].sort((a, b2) => { const pa = V.styles[a.st], pb = V.styles[b2.st]; if (pa == null || pb == null) return pa == null ? 1 : -1; return (pa - pb) * sens; });
  }, [vignettes, V, tri]);
  const alerte = R.alertes[0] ?? (V && !V.base.ok && !perime ? V.base.alertes[0] : null);
  const prixBase = V && V.base.ok ? V.base.prix : null;

  // Ce que le plan dit (le moteur de l'outil écrit en français ; les chiffres, eux, s'écrivent dans les deux langues).
  const placeTxt = (R.resume.find(([k]) => k === "Place derrière" || k === "Place le long de la clôture") ?? [])[1];
  const placeCle = R.resume.some(([k]) => k === "Place le long de la clôture") ? t.placeCote : t.placeDerriere;
  // La vue de dessus animée (le portail s'ouvre et se ferme) : les cotes du plan, la place à laisser libre de l'outil.
  const placeMm = placeTxt ? Number(String(placeTxt).replace(/\D/g, "")) || null : null;
  const vueOuverture = <VueOuverture type={R.dims.type as "battant"} P={cfg.P} vantaux={R.dims.vantaux} sens={cfg.sens} guidage={cfg.guidage} place={placeMm} couleur={cfg.couleur} label={t.vueDessus} />;
  const moteurs = (R as unknown as { moteurs?: InfosMoteurs }).moteurs;
  const moteurChoisi: CleMoteur = cfg.moteur ? (moteurs?.choisi?.cle ?? "aucun") : "aucun";
  const nomMoteur = (k: CleMoteur) => (k === "aucun" ? t.sansMoteur : (moteurs?.permis.find((m) => m.cle === k)?.nom ?? moteurs?.refus.find((m) => m.cle === k)?.nom ?? k));
  const formules = FORMULES;
  const formule = cfg.decor !== "aucun" && cfg.decor !== "perso" ? formules[cfg.decor] : null;
  // Le décor en une ligne : la formule, ou les emplacements de « Personnaliser ».
  const choixDecor = useMemo(() => choixDe(cfg), [cfg]);
  const enMots = (c: ChoixDecor) => `${tp.formesDecor[c.forme] ?? c.forme} · ${tp.emplacements[c.assemblage].toLowerCase()}${c.assemblage === "entre" && c.pos ? ` ${tp.posDecor[c.pos].toLowerCase()}` : ""}`;
  const decorNom = cfg.decor === "perso" ? t.perso : formule ? formule.nom : t.decorAucun;
  const decorLigne = cfg.decor === "perso" ? cfg.decorChoix.map(enMots).join(" + ") : formule ? formule.ligne : t.decorDetail;

  // « Personnaliser » : chaque changement passe le décor en « perso », en acier et à barreaux (motifs.js les exige).
  const poserChoix = (L: ChoixDecor[]) => maj(L.length ? { decor: "perso", decorChoix: L.map(normaliser), mat: "acier", remp: "barreaux" } : { decor: "aucun", decorChoix: [] });
  const changerEmpl = (i: number, p: Partial<ChoixDecor>) => {
    const L = [...choixDecor];
    const k = Math.min(i, L.length);
    L[k] = { ...(L[k] ?? { assemblage: "entre", forme: "C", pos: "haut" }), ...p } as ChoixDecor;
    poserChoix(L);
    setEmpl(k);
  };
  const passerPerso = () => {
    setModeDecor("perso");
    setEmpl(0);
    if (!choixDecor.length) poserChoix([{ assemblage: "entre", forme: "C", pos: "haut" }]);
  };
  const ajouterEmpl = () => {
    if (choixDecor.length !== 1) return;
    poserChoix([...choixDecor, choixDecor[0].assemblage === "cimier" ? { assemblage: "entre", forme: "C", pos: "haut" } : { assemblage: "cimier", forme: "C" }]);
    setEmpl(1);
  };
  const retirerEmpl = (i: number) => { poserChoix(choixDecor.filter((_, k) => k !== i)); setEmpl(0); };
  // Une zone touchée sur le croquis : elle devient l'emplacement en cours (ou on y va, s'il y est déjà).
  const toucherZone = (cle: string) => {
    const z = ZONES_DECOR.find((x) => x.cle === cle);
    if (!z) return;
    setModeDecor("perso");
    const i = choixDecor.findIndex((c) => memeZone(c, z.choix));
    if (i >= 0) { setEmpl(i); return; }
    if (!choixDecor.length) { poserChoix([z.choix]); setEmpl(0); return; }
    const cur = choixDecor[Math.min(empl, choixDecor.length - 1)];
    changerEmpl(Math.min(empl, choixDecor.length - 1), { ...z.choix, forme: formesDe(z.choix.assemblage).includes(cur.forme) ? cur.forme : z.choix.forme, rythme: undefined, forme2: undefined, pos: z.choix.pos });
  };
  const zonesPrims = useMemo<Prims>(() => {
    const aire = (b: number[]) => (b[2] - b[0]) * (b[3] - b[1]);
    return zones
      .flatMap((z) => z.boites.map((b) => ({ cle: z.cle, b })))
      .sort((x, y) => aire(y.b) - aire(x.b))
      .map(({ cle, b }) => {
        const actif = choixDecor.some((c) => memeZone(c, ZONES_DECOR.find((x) => x.cle === cle)!.choix));
        const m = 25;
        return { t: "poly", cls: `zone-decor${actif ? " zone-active" : ""}`, piece: `zone:${cle}`, pts: [[b[0] - m, b[1] - m], [b[2] + m, b[1] - m], [b[2] + m, b[3] + m], [b[0] - m, b[3] + m]] };
      });
  }, [zones, choixDecor]);

  const lienVisite = useMemo(() => {
    const q = new URLSearchParams({
      produit: slug,
      config: `${style ? tp.styles[style] : t.compose} · ${cfg.P} × ${cfg.H} mm`.slice(0, 200),
      releve: resumeConfig(slug, cfg, locale, prixBase).join("\n").slice(0, 2000),
    });
    return `/${locale}/contact?${q}`;
  }, [slug, cfg, locale, prixBase, style, tp, t]);

  // Échap ferme la fenêtre ouverte.
  useEffect(() => {
    if (!fenetre) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFenetre(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fenetre]);

  const idTitre = useId();
  // La commande en ligne (Quentin, 10/10/2026 : « je veux qu'on puisse les commander ») : la ligne du panier porte la
  // configuration en texte ; le serveur la relit, la rechiffre avec l'outil et n'encaisse que l'acompte (le portillon
  // assorti est dans la configuration, donc dans la même ligne). Le prix affiché ici n'est jamais envoyé.
  const panier = useCart();
  const router = useRouter();
  // « Commander » ouvre la fenêtre de la commande, selon la façon de recevoir le portail (cfg.reception) :
  //   - posé par l'atelier : la visite de prise de cotes se paie avec l'acompte et se déduit du solde (code postal → déplacement, créneau) ;
  //   - transporteur : le code postal → la livraison, calculée par le serveur d'après le colis (debout, sur palette) ;
  //   - retrait : rien à choisir, le portail se retire à l'atelier.
  // Le portail et sa ligne de réception partent ensemble au panier.
  const [visite, setVisite] = useState<Visite>({ qui: "atelier", codePostal: "", deplacement: null, rdv: "" });
  const [livraison, setLivraison] = useState<EtatLivraison>({ codePostal: "", deplacement: null });
  const recep = cfg.reception;
  const acompte = prixBase != null ? acomptePortail(prixBase) : 0;
  const prixVisite = visite.deplacement ? visite.deplacement.montantCents / 100 : null;
  const prixLivraison = livraison.deplacement ? livraison.deplacement.montantCents / 100 : null;
  const creneauVisite = lireCreneau(visite.rdv);
  const commandePrete = prixBase != null && !alerte && (recep === "pose" ? prixVisite !== null && creneauVisite !== null : recep === "transporteur" ? prixLivraison !== null : true);
  // Ce que le client paie aujourd'hui, et ce qui reste (la visite payée se déduit du solde d'un portail posé).
  const supplement = recep === "pose" ? prixVisite : recep === "transporteur" ? prixLivraison : 0;
  const soldeCommande = prixBase != null ? Math.max(0, prixBase - acompte - (recep === "pose" ? (prixVisite ?? 0) : 0)) : 0;
  const requeteLivraison = `${new URLSearchParams({ slug, cfg: versParamsPanier(slug, cfg) }).toString()}`;
  const commander = () => { if (prixBase != null && !alerte) setFenetre("visite"); };
  const ajouterAuPanier = () => {
    if (!commandePrete || prixBase == null) return;
    // Une seule façon de recevoir par commande : les lignes de livraison, de pose et de retrait déjà au panier s'effacent.
    panier.items.filter((l) => l.slug === POSE || l.slug === LIVRAISON || l.slug === RETRAIT).forEach((l) => panier.remove(l.id));
    panier.add({
      slug, portail: versParamsPanier(slug, cfg), image,
      name: `${nom} · ${nf(cfg.P)} × ${nf(cfg.H)} mm`, optionsLabel: resumeConfig(slug, cfg, locale, null).slice(1).join(" · "),
      unitPrice: acompte,
    }, 1);
    if (recep === "pose" && prixVisite !== null && creneauVisite) {
      const cp = visite.codePostal.replace(/\s+/g, "");
      panier.add({
        slug: PRISE_DE_COTES, priseDeCotesCp: cp, rdv: visite.rdv,
        // Ce que le client a en tête, pour que l'atelier arrive avec la bonne idée.
        note: `${nom} ${nf(cfg.P)} × ${nf(cfg.H)} mm · ${style ? tp.styles[style] : t.compose}`.slice(0, 160),
        name: libellePriseDeCotes(cp, locale), optionsLabel: libelleCreneau(creneauVisite, locale), unitPrice: prixVisite,
      }, 1);
    } else if (recep === "transporteur" && prixLivraison !== null && livraison.deplacement) {
      panier.add({ slug: LIVRAISON, livraisonCp: livraison.codePostal.replace(/\s+/g, ""), name: tVisite.livraisonResume, optionsLabel: livraison.deplacement.commune, unitPrice: prixLivraison }, 1);
    } else if (recep === "retrait") {
      panier.add({ slug: RETRAIT, name: tVisite.retraitResume, optionsLabel: "", unitPrice: 0 }, 1);
    }
    router.push(`/${locale}/panier`);
  };
  const acompteTxt = prixBase != null && !alerte ? (recep === "transporteur" ? t.acompteTransporteur(euros(acompte)) : recep === "retrait" ? t.acompteRetrait(euros(acompte)) : t.acompte(euros(acompte))) : null;
  const battant = slug === "portail-battant", coulissant = slug === "portail-coulissant", portillon = slug === "portillon";
  const vantauxTxt = R.dims.vantaux.length > 1 ? `${R.dims.vantaux.length} ${t.vantauxDe} ${R.dims.vantaux.map(nf).join(" + ")} mm` : `1 ${t.vantail} ${nf(R.dims.vantaux[0])} mm`;
  const tropLarge = battant && cfg.P > b.P[1];
  const etapesTel = ["mesures", ...(coulissant ? [] : ["sol"]), "ouverture", "fixation", "style", "aspect", "couleur", "decor", ...(portillon ? [] : ["moteur", "portillon"]), "prix"];
  const ecartDecor = V && cfg.decor !== "aucun" && V.decors[cfg.decor] != null && V.decors.aucun != null ? (V.decors[cfg.decor] as number) - (V.decors.aucun as number) : null;
  const ecartPortillon = cfg.portillon && !portillon && V?.base.ok ? (V.base.portillon ?? null) : null;
  const ecartMoteur = V && cfg.moteur && V.moteurs[moteurChoisi] != null && V.moteurs.aucun != null ? (V.moteurs[moteurChoisi] as number) - (V.moteurs.aucun as number) : null;

  const fermer = () => setFenetre(null);

  const lignesMoteur: { k: CleMoteur; permis: boolean; detail: string; facilite: number; garantie?: number }[] = [
    ...(moteurs?.permis ?? []).map((m) => ({ k: m.cle, permis: true, detail: `${m.principe}. ${t.kit}`, facilite: m.facilite, garantie: m.garantie })),
    ...(moteurs?.refus ?? []).filter((m) => m.cle).map((m) => ({ k: m.cle as CleMoteur, permis: false, detail: m.raison.charAt(0).toUpperCase() + m.raison.slice(1) + ".", facilite: 0 })),
    { k: "aucun", permis: true, detail: t.moteurMain, facilite: 10 },
  ];
  const reponseGuide = guidePortail(guide);

  // Les lignes et liens de la colonne d'achat, partagés avec le parcours du téléphone.
  const ligneDecor = (
    <button type="button" className="cpt-ligne-choix" aria-expanded={fenetre === "decor"} aria-haspopup="dialog" onClick={() => setFenetre((f) => (f === "decor" ? null : "decor"))}>
                    <span className={`cpt-lc-picto ${cfg.decor !== "aucun" ? "" : "vide"}`}>{cfg.decor !== "aucun" ? <Vue prims={R.vues.face as Prims} couleur={cfg.couleur} sansCotes label={decorNom} /> : <PictoPlus />}</span>
                    <span className="cpt-lc-texte">
                      <span className="cpt-lc-tete"><span>{t.decor}</span>{cfg.decor !== "aucun" ? (ecartDecor != null && <span className="cpt-lc-ecart">{ecart(ecartDecor)}</span>) : <span className="cpt-lc-ajouter">{t.decorAjouter}</span>}</span>
                      <span className="cpt-lc-valeur">{decorNom}</span>
                      <span className="cpt-lc-detail">{decorLigne}</span>
                    </span>
                    <ChevronBas />
                  </button>
  );
  // La façon de recevoir le portail : posé par l'atelier, livré par transporteur (sans pose), retiré à l'atelier (sans pose).
  const ligneReception = (
    <div className="cpt-reception">
      <Pilule aria={t.reception} valeur={cfg.reception} onChange={(r) => maj({ reception: r })}
        options={[{ v: "pose" as const, label: t.recPose, titre: t.recNote.pose(euros(V?.reception?.pose ?? 0)) }, { v: "transporteur" as const, label: t.recTransporteur, titre: t.recNote.transporteur(euros(V?.reception?.transporteur ?? 0)) }, { v: "retrait" as const, label: t.recRetrait, titre: t.recNote.retrait(euros(V?.reception?.retrait ?? 0)) }]} />
      <p className="cpt-prix-note">{t.recNoteCourte[cfg.reception]}</p>
    </div>
  );
  const ligneMoteur = !portillon && (
                    <button type="button" className="cpt-ligne-choix" disabled={cfg.reception !== "pose"} aria-expanded={fenetre === "moteur"} aria-haspopup="dialog" onClick={() => setFenetre((f) => (f === "moteur" ? null : "moteur"))}>
                      <span className="cpt-lc-picto">{PICTO_MOTEUR[moteurChoisi]}</span>
                      <span className="cpt-lc-texte">
                        <span className="cpt-lc-tete"><span>{t.moteur}</span>{ecartMoteur != null && <span className="cpt-lc-ecart">{ecart(ecartMoteur)}</span>}</span>
                        <span className="cpt-lc-valeur">{nomMoteur(moteurChoisi)}</span>
                        <span className="cpt-lc-detail">{cfg.reception !== "pose" ? t.moteurSeulementPose : cfg.moteur ? (moteurs?.permis.find((m) => m.cle === moteurChoisi)?.principe ?? "") : t.moteurMainCourt}</span>
                      </span>
                      <ChevronBas />
                    </button>
                  );
  const lignePortillon = !portillon && (
                    <button type="button" className="cpt-ligne-choix" aria-expanded={fenetre === "portillon"} aria-haspopup="dialog" onClick={() => setFenetre((f) => (f === "portillon" ? null : "portillon"))}>
                      <span className={`cpt-lc-picto ${cfg.portillon ? "" : "vide"}`}>{cfg.portillon && portillonPrims ? <Vue prims={portillonPrims} couleur={cfg.couleur} sansCotes label={t.vuePortillon} /> : <PictoPlus />}</span>
                      <span className="cpt-lc-texte">
                        <span className="cpt-lc-tete"><span>{t.portillon}</span>{cfg.portillon ? (ecartPortillon != null && <span className="cpt-lc-ecart">{ecart(ecartPortillon)}</span>) : <span className="cpt-lc-ajouter">{t.portillonAjouter}</span>}</span>
                        <span className="cpt-lc-valeur">{cfg.portillon ? `${nf(cfg.portillonP)} × ${nf(cfg.H)} mm` : t.portillonAucun}</span>
                        <span className="cpt-lc-detail">{t.portillonDetail}</span>
                      </span>
                      <ChevronBas />
                    </button>
                  );
  const notePrix = (ecartMoteur != null || ecartDecor != null || ecartPortillon != null) && (
                  <p className="cpt-prix-note">{t.dont} {[ecartMoteur != null && `${t.dontMoteur} ${ecart(ecartMoteur)}`, ecartDecor != null && `${t.dontDecor} ${ecart(ecartDecor)}`, ecartPortillon != null && `${t.dontPortillon} ${ecart(ecartPortillon)}`].filter(Boolean).join(" · ")}</p>
                );
  const liensAchat = (
    <div className="cpt-liens">
                  {/* La visite seule reste possible : le devis signé suit la visite, sans rien payer en ligne. */}
                  <Link href={lienVisite}>{t.cta}</Link>
                  <button type="button" onClick={() => setFenetre("plan")} aria-haspopup="dialog">{t.voirPlan}</button>
                  {/* L'estimation PDF (lot 9) : celle de l'outil, composée sur le serveur ; le devis à signer suit la visite. */}
                  {alerte || prixBase == null ? <span className="grise" aria-disabled="true" title={t.devisRaison}>{t.devis}</span>
                    : <a href={`/api/devis-pdf?${cle}&lang=${locale}${recep === "transporteur" && /^\d{5}$/.test(livraison.codePostal) ? `&cp=${livraison.codePostal}` : ""}`} target="_blank" rel="noopener" title={t.devisRaison}>{t.devis}</a>}
                  <button type="button" aria-expanded={fenetre === "details"} aria-haspopup="dialog" onClick={() => setFenetre((f) => (f === "details" ? null : "details"))}>{t.details}<ChevronBas /></button>
                </div>
  );

  // Les fenêtres (décor, portillon, moteur) et les superpositions (détails, plan, guide) : les mêmes sur ordinateur et sur téléphone.
  const fenetres = (<>
            {/* La fenêtre Décor : sur la colonne des mesures, le croquis reste visible et suit chaque choix ; ses zones se touchent. */}
            {fenetre === "decor" && (
              <div className="carte-verre cpt-fenetre" role="dialog" aria-label={t.decor}>
                <div className="cpt-f-tete"><div><p className="cpt-f-titre">{t.decor}</p><p className="cpt-f-sous">{t.fDecorSous}</p></div><Fermer label={t.fermer} onClose={fermer} /></div>
                <div style={{ marginTop: 10 }}>
                  <Pilule aria={t.decor} valeur={modeDecor} onChange={(m) => (m === "perso" ? passerPerso() : setModeDecor("formules"))}
                    options={[{ v: "formules", label: t.formules }, { v: "perso", label: t.personnaliser }]} />
                </div>
                {/* Les moulures : un médaillon par vantail sur le bas plein, vissé par derrière ; en alu comme en acier. */}
                <div className="cpt-ligne-libre" style={{ marginTop: 10 }}>
                  <span><span className="cpt-libelle uppercase">{t.moulures}</span>
                    <span className="cpt-raison">{cfg.soub === "plein" || cfg.soub === "panneau" ? (V?.moulure.avec != null && V.moulure.sans != null ? `${t.moulureDetail} · ${ecart(V.moulure.avec - V.moulure.sans)}` : t.moulureDetail) : t.moulureBasPlein}</span></span>
                  <Pilule aria={t.moulures} valeur={cfg.moulure ? "avec" : "sans"} onChange={(x) => maj({ moulure: x === "avec" })} desactive={cfg.soub === "plein" || cfg.soub === "panneau" ? [] : ["avec"]}
                    options={[{ v: "sans", label: t.sans }, { v: "avec", label: t.avec }]} />
                </div>
                {modeDecor === "formules" ? (<>
                  <p className="cpt-f-info">{t.fDecorInfo} <b>{t.fDecorAcier}</b></p>
                  <div className="cpt-formules">
                    <button type="button" className="tuile-modele cpt-formule" aria-pressed={cfg.decor === "aucun"} onClick={() => maj({ decor: "aucun", decorChoix: [] })}>
                      <span className="cpt-dessin" style={{ height: 62 }}><Vue prims={vignettes.find((x) => x.st === (style ?? "barreaux"))?.prims ?? (R.vues.face as Prims)} couleur={cfg.couleur} sansCotes label={t.sansDecor} /></span>
                      <span className="cpt-f-nom">{t.sansDecor}</span>
                    </button>
                    {decorsDessines.map(({ d, prims }) => {
                      const f = formules[d], p = V?.decors[d], base = V?.decors.aucun;
                      return (
                        <button key={d} type="button" className="tuile-modele cpt-formule" aria-pressed={cfg.decor === d} onClick={() => maj({ decor: d, decorChoix: [], mat: "acier", remp: "barreaux" })}>
                          <span className="cpt-dessin"><Vue prims={prims} couleur={cfg.couleur} sansCotes label={f.nom} /></span>
                          <span className="cpt-f-nom">{f.nom}</span><span className="cpt-f-ligne">{f.ligne}</span>
                          {p != null && base != null && <span className="cpt-f-ecart">{ecart(p - base)}</span>}
                        </button>
                      );
                    })}
                    <button type="button" className="tuile-modele cpt-sur-mesure" aria-pressed={cfg.decor === "perso"} onClick={passerPerso}>
                      <span className="cpt-vide-dessin"><PictoPlus /></span>
                      <span><span className="cpt-f-nom" style={{ display: "block" }}>{t.personnaliser}</span><span className="cpt-f-ligne" style={{ display: "block" }}>{t.piedPerso}</span></span>
                    </button>
                    <button type="button" className="tuile-modele cpt-sur-mesure" aria-pressed={cfg.decor === "surMesure"} onClick={() => maj({ decor: "surMesure", decorChoix: [], mat: "acier", remp: "barreaux" })}>
                      <span className="cpt-vide-dessin"><PictoPhoto /></span>
                      <span><span className="cpt-f-nom" style={{ display: "block" }}>{t.surMesure}</span><span className="cpt-f-ligne" style={{ display: "block" }}>{t.surMesureLigne}</span></span>
                    </button>
                  </div>
                  <Pied phrase={t.pied} termine={t.termine} onClose={fermer} />
                </>) : (() => {
                  const k = Math.min(empl, Math.max(0, choixDecor.length - 1)), cur = choixDecor[k];
                  const formes = cur ? formesDe(cur.assemblage) : [];
                  const ecartPerso = cfg.decor === "perso" && V?.decors.perso != null && V.decors.aucun != null ? V.decors.perso - V.decors.aucun : null;
                  return (<>
                    <div className="cpt-empls" role="tablist" aria-label={t.emplacement}>
                      {choixDecor.map((c, i) => (
                        <span key={i} className="cpt-empl">
                          <button type="button" role="tab" aria-selected={i === k} onClick={() => setEmpl(i)}>{i + 1} · {tp.emplacements[c.assemblage]}</button>
                          {choixDecor.length > 1 && <button type="button" className="cpt-empl-retirer" aria-label={`${t.retirer} ${i + 1}`} onClick={() => retirerEmpl(i)}><Croix /></button>}
                        </span>
                      ))}
                      {choixDecor.length === 1 && <button type="button" className="cpt-empl-ajouter" onClick={ajouterEmpl}><PictoPlus />{t.ajouterEmplacement}</button>}
                      {ecartPerso != null && <span className="cpt-empl-ecart">{ecart(ecartPerso)}</span>}
                    </div>
                    <span className="cpt-libelle uppercase">{t.ou}</span>
                    <div className="cpt-ou" role="radiogroup" aria-label={t.ou}>
                      {tuilesOu.map(({ a, prims, raison }) => (
                        <button key={a} type="button" role="radio" className="tuile-modele cpt-ou-tuile" aria-checked={cur?.assemblage === a} aria-disabled={raison ? true : undefined} title={raison ?? undefined}
                          onClick={() => { if (!raison) changerEmpl(k, { assemblage: a }); }}>
                          <span className="cpt-dessin"><Vue prims={prims} couleur={cfg.couleur} sansCotes label={tp.emplacements[a]} /></span>
                          <span className="cpt-ou-nom">{tp.emplacements[a]}</span>
                        </button>
                      ))}
                    </div>
                    {cur && (<>
                      {cur.assemblage === "entre" && (<>
                        <span className="cpt-libelle uppercase">{t.hauteurDecor}</span>
                        <Pilule aria={t.hauteurDecor} valeur={cur.pos ?? "haut"} onChange={(pos) => changerEmpl(k, { pos })} options={POS_DECOR.map((x) => ({ v: x, label: tp.posDecor[x] }))} />
                      </>)}
                      <span className="cpt-libelle uppercase">{t.forme}</span>
                      <Pilule aria={t.forme} valeur={cur.forme} onChange={(forme) => changerEmpl(k, { forme })} options={formes.map((f) => ({ v: f, label: tp.formesDecor[f] ?? f }))} />
                      <span className="cpt-libelle uppercase">{t.rythme}</span>
                      <Pilule aria={t.rythme} valeur={cur.rythme ?? "tous"} onChange={(rythme) => changerEmpl(k, { rythme })} desactive={formes.length > 1 ? [] : ["alterne"]}
                        options={(["tous", "unSurDeux", "alterne"] as const).map((x) => ({ v: x, label: tp.rythmes[x] }))} />
                      {cur.rythme === "alterne" && formes.length > 1 && (<>
                        <span className="cpt-libelle uppercase">{t.formeAlternee}</span>
                        <Pilule aria={t.formeAlternee} valeur={cur.forme2 ?? ""} onChange={(forme2) => changerEmpl(k, { forme2 })} desactive={[cur.forme]} options={formes.map((f) => ({ v: f, label: tp.formesDecor[f] ?? f }))} />
                      </>)}
                    </>)}
                    <div className="cpt-filet" />
                    <h3 className="cpt-carte-titre">{t.finitions}</h3>
                    <span className="cpt-libelle uppercase">{t.bouts}</span>
                    <Pilule aria={t.bouts} valeur={cfg.bouts} onChange={(bouts) => maj({ bouts })} options={BOUTS_DECOR.map((x) => ({ v: x, label: tp.bouts[x] }))} />
                    <span className="cpt-libelle uppercase">{t.barreauxDeco}</span>
                    <Pilule aria={t.barreauxDeco} valeur={cfg.barreauxDeco} onChange={(barreauxDeco) => maj({ barreauxDeco })} options={BARREAUX_DECOR.map((x) => ({ v: x, label: tp.barreauxDeco[x] }))} />
                    <span className="cpt-libelle uppercase">{t.pointes}</span>
                    <Pilule aria={t.pointes} valeur={cfg.pointes ? "lance" : "sans"} onChange={(x) => maj({ pointes: x === "lance" })} options={[{ v: "sans", label: t.sans }, { v: "lance", label: t.lance }]} />
                    <Pied phrase={t.piedPerso} termine={t.termine} onClose={fermer} />
                  </>);
                })()}
              </div>
            )}

            {/* La fenêtre Portillon assorti : même style, sa largeur et ses gonds ; posé avec le portail. */}
            {fenetre === "portillon" && !portillon && (
              <div className="carte-verre cpt-fenetre" role="dialog" aria-label={t.portillon}>
                <div className="cpt-f-tete"><div><p className="cpt-f-titre">{t.portillon}</p><p className="cpt-f-sous">{t.portillonSous}</p></div><Fermer label={t.fermer} onClose={fermer} /></div>
                <div style={{ marginTop: 10 }}>
                  <Pilule aria={t.portillon} valeur={cfg.portillon ? "oui" : "non"} onChange={(x) => maj({ portillon: x === "oui" })} options={[{ v: "non", label: t.portillonAucun }, { v: "oui", label: t.portillonAjouter }]} />
                </div>
                {cfg.portillon && (<>
                  <LigneCote picto="passage" titre={t.portillonLargeur} info={t.portillonInfo} valeur={cfg.portillonP} bornes={bP.P} onChange={(portillonP) => maj({ portillonP })} aCorriger={t.aCorriger} />
                  <span className="cpt-libelle uppercase">{t.portillonGonds}</span>
                  <Pilule aria={t.portillonGonds} valeur={cfg.portillonSens} onChange={(portillonSens) => maj({ portillonSens })} options={(["gauche", "droite"] as const).map((x) => ({ v: x, label: tp.sensPortillon[x] }))} />
                  {portillonPrims && <div className="cpt-portillon-dessin"><Vue prims={portillonPrims} couleur={cfg.couleur} petit label={t.vuePortillon} /></div>}
                  {V?.portillon?.avec != null && <p className="cpt-f-info"><b>{ecart(V.portillon.avec)}</b>{V.portillon.seul != null ? ` · ${t.portillonSeul(euros(V.portillon.seul))}` : ""}</p>}
                </>)}
                <Pied phrase={t.piedPortillon} termine={t.termine} onClose={fermer} />
              </div>
            )}

            {/* La fenêtre Moteur : chaque kit Somfy permis pour CE portail, le conseillé, ceux qui ne vont pas et pourquoi. */}
            {fenetre === "moteur" && (
              <div className="carte-verre cpt-fenetre" role="dialog" aria-label={t.moteur}>
                <div className="cpt-f-tete"><div><p className="cpt-f-titre">{t.moteur}</p><p className="cpt-f-sous">{vantauxTxt}, ≈ {nf(R.poids)} kg. {t.fMoteurSous}</p></div><Fermer label={t.fermer} onClose={fermer} /></div>
                <div className="cpt-moteurs" role="radiogroup" aria-label={t.moteur}>
                  {lignesMoteur.map((l) => {
                    const choisi = moteurChoisi === l.k;
                    const p = V?.moteurs[l.k], base = V?.moteurs[moteurChoisi];
                    return (
                      <button key={l.k} type="button" role="radio" aria-checked={choisi} aria-disabled={!l.permis || undefined} className="cpt-moteur"
                        onClick={() => { if (l.permis) maj(l.k === "aucun" ? { moteur: false } : { moteur: true, moteurModele: l.k }); }}>
                        <span className="cpt-lc-picto">{PICTO_MOTEUR[l.k]}</span>
                        <span>
                          <span className="cpt-m-nom">{nomMoteur(l.k)}{choisi ? <span className="cpt-m-prix"><span className="cpt-coche-rond" aria-hidden="true"><Coche /></span></span> : l.permis && p != null && base != null ? <span className="cpt-m-prix">{ecart(p - base)}</span> : null}</span>
                          <span className="cpt-m-detail">{moteurs?.conseille?.cle === l.k && <><span className="cpt-conseille">{t.conseille}</span> </>}{l.detail}{l.garantie ? ` ${t.garantie(l.garantie)}` : ""}</span>
                          {l.permis && <Jauge n={l.facilite} phrase={l.k === "aucun" ? t.rienABrancher : t.facilite(l.facilite)} aria={t.facilite(l.facilite)} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="cpt-f-note">{t.courant}</p>
                <Pied phrase={t.piedMoteur} termine={t.termine} onClose={fermer} />
              </div>
            )}
  </>);
  const superpositions = (<>
      {fenetre === "visite" && prixBase != null && (<>
        <div className="cpt-voile-fond" onClick={() => setFenetre(null)} aria-hidden="true" />
        <div className="cpt-visite" role="dialog" aria-label={t.cmdTitre}>
          <div className="cpt-f-tete"><div>
            <p className="cpt-f-titre">{recep === "pose" ? t.visiteTitre : recep === "transporteur" ? t.livTitre : t.retTitre}</p>
            <p className="cpt-f-sous">{recep === "pose" ? t.visiteSous : recep === "transporteur" ? t.livSous : t.retSous}</p>
          </div><Fermer label={t.fermer} onClose={fermer} /></div>
          {recep === "pose" && <VisiteAtelier cotes={visite} onChange={setVisite} t={tVisite} locale={locale} labelCodePostal={t.visiteCp} question={t.visiteOu} />}
          {recep === "transporteur" && <LivraisonPortail etat={livraison} onChange={setLivraison} requete={requeteLivraison} t={t} locale={locale} euros={euros} />}
          {/* Le récapitulatif et le bouton restent visibles en bas de la fenêtre, même quand le calendrier la fait défiler. */}
          <div className="cpt-visite-pied">
            <dl className="cpt-d-liste cpt-visite-recap">
              <dt>{t.vAcompte}</dt><dd>{euros(acompte)}</dd>
              {recep === "pose" && <><dt>{t.vVisite}</dt><dd>{prixVisite !== null ? euros(prixVisite) : "…"}</dd></>}
              {recep === "transporteur" && <><dt>{t.vLivraison}</dt><dd>{prixLivraison !== null ? euros(prixLivraison) : "…"}</dd></>}
              <dt>{t.vAujourdhui}</dt><dd><b>{supplement !== null ? euros(acompte + supplement) : "…"}</b></dd>
              <dt>{recep === "pose" ? t.vSolde : recep === "transporteur" ? t.vSoldeExpedition : t.vSoldeRetrait}</dt><dd>{euros(soldeCommande)}</dd>
            </dl>
            <button type="button" className="btn-verre cpt-cta" onClick={ajouterAuPanier} disabled={!commandePrete}>{t.vAjouter}</button>
            <p className="cpt-btn-note">{recep === "pose" ? t.vNote : recep === "transporteur" ? t.vNoteTransporteur : t.vNoteRetrait}</p>
          </div>
        </div>
      </>)}

      {fenetre === "details" && (<>
        <div className="cpt-voile-fond" onClick={() => setFenetre(null)} aria-hidden="true" />
        <div className="cpt-details" role="dialog" aria-label={t.details}>
          <div className="cpt-f-tete"><p className="cpt-d-titre">{t.dVotre(nom)}</p><Fermer label={t.fermer} onClose={fermer} /></div>
          <dl className="cpt-d-liste">
            <dt>{t.dDimensions}</dt><dd>{t.passage} {nf(cfg.P)} mm, {t.hauteur.toLowerCase()} {nf(cfg.H)} mm</dd>
            <dt>{t.dVantaux}</dt><dd>{vantauxTxt}</dd>
            <dt>{t.dMatiere}</dt><dd>{cfg.mat === "alu" ? t.matiereAlu : t.matiereAcier}, {tp.couleur[cfg.couleur].toLowerCase()}{cfg.decor !== "aucun" ? ` · ${decorNom}` : ""}</dd>
            <dt>{t.dPoids}</dt><dd>≈ {nf(R.poids)} kg</dd>
            {!portillon && <><dt>{t.dMoteur}</dt><dd>{nomMoteur(moteurChoisi)}</dd></>}
            {!portillon && cfg.portillon && <><dt>{t.portillon}</dt><dd>{nf(cfg.portillonP)} × {nf(cfg.H)} mm, {tp.sensPortillon[cfg.portillonSens].toLowerCase()}</dd></>}
            <dt>{t.dDelai}</dt><dd>{t.dDelaiTxt}</dd>
          </dl>
          <p className="cpt-d-sous">{t.dCompris}</p>
          <ul className="cpt-coches">{t.compris.map((x) => <li key={x}><Coche />{x}</li>)}</ul>
          <p className="cpt-d-sous">{t.dNonCompris}</p>
          <ul className="cpt-coches non">{t.nonCompris.map((x) => <li key={x}><Croix />{x}</li>)}</ul>
          <p className="cpt-d-sous">{t.dVisite}</p>
          <ul className="cpt-coches non">{t.visiteChange.map((x) => <li key={x}><Croix />{x}</li>)}</ul>
          <p className="cpt-d-fabrique"><PictoAtelier />{t.fabriqueSaumur}</p>
        </div>
      </>)}

      {fenetre === "plan" && (<>
        <div className="cpt-voile-fond" onClick={() => setFenetre(null)} aria-hidden="true" />
        <div className="cpt-plan" role="dialog" aria-label={t.planTitre}>
          <div className="cpt-f-tete"><div><p className="cpt-f-titre">{t.planTitre}</p><p className="cpt-f-sous">{t.planSous}</p></div><Fermer label={t.fermer} onClose={fermer} /></div>
          <div className="cpt-plan-vues">
            <figure><figcaption>{t.vueFace}</figcaption><Vue prims={R.vues.face as Prims} couleur={cfg.couleur} label={t.vueFace} /></figure>
            <figure><figcaption>{t.vueDessus}</figcaption><Vue prims={R.vues.dessus as Prims} couleur={cfg.couleur} label={t.vueDessus} /></figure>
            <figure><figcaption>{t.vueCote}</figcaption><Vue prims={R.vues.cote as Prims} couleur={cfg.couleur} label={t.vueCote} /></figure>
            {cfg.portillon && portillonPrims && <figure><figcaption>{t.vuePortillon}</figcaption><Vue prims={portillonPrims} couleur={cfg.couleur} label={t.vuePortillon} /></figure>}
          </div>
        </div>
      </>)}

      {fenetre === "guide" && (<>
        <div className="cpt-voile-fond" onClick={() => setFenetre(null)} aria-hidden="true" />
        <div className="cpt-guide" role="dialog" aria-label={tp.guideTitre}>
          <div className="cpt-f-tete"><p className="cpt-f-titre">{tp.guideTitre}</p><Fermer label={t.fermer} onClose={fermer} /></div>
          {tp.guideQ.map((q, i) => {
            const cleQ = (["derriere", "cote", "sol"] as const)[i];
            const visible = i === 0 || (i === 1 && guide.derriere === false) || (i === 2 && guide.derriere === false && guide.cote === true);
            if (!visible) return null;
            return (
              <div key={cleQ} style={{ marginTop: 12 }}>
                <p className="cpt-f-sous" style={{ color: "#2b2320", fontSize: 13 }}>{q}</p>
                <Pilule aria={q} valeur={guide[cleQ] === undefined ? "" : guide[cleQ] ? "oui" : "non"}
                  onChange={(x) => setGuide((g) => ({ ...g, [cleQ]: x === "oui", ...(i === 0 ? { cote: undefined, sol: undefined } : i === 1 ? { sol: undefined } : {}) }))}
                  options={[{ v: "oui", label: tp.oui }, { v: "non", label: tp.non }]} />
              </div>
            );
          })}
          {reponseGuide && (
            <p className="cpt-f-info">{tp.guideVers} <b>{tp.modeles[reponseGuide.slug]}{reponseGuide.guidage ? ` (${tp.guidage[reponseGuide.guidage]})` : ""}</b>{" "}
              {reponseGuide.slug === slug
                ? (reponseGuide.guidage && reponseGuide.guidage !== cfg.guidage ? <button type="button" style={{ textDecoration: "underline" }} onClick={() => { maj({ guidage: reponseGuide.guidage }); setFenetre(null); }}>{tp.ouvrirModele}</button> : null)
                : <Link style={{ textDecoration: "underline" }} href={`/${locale}/artisanat/${reponseGuide.slug}`}>{tp.ouvrirModele}</Link>}
            </p>
          )}
        </div>
      </>)}
  </>);

  // Téléphone (lot 11) : une question à la fois sous le croquis ; en bas, le prix et « Retour / Suivant ».
  if (tel) {
    const cleEtape = etapesTel[Math.min(etape, etapesTel.length - 1)];
    const k = etapesTel.indexOf(cleEtape);
    const suivant = () => { setEtape(Math.min(k + 1, etapesTel.length - 1)); window.scrollTo({ top: 0 }); };
    const conseil = <button type="button" className="cpt-tel-conseil" onClick={suivant}>{t.conseilAtelier}</button>;
    const titres: Record<string, string> = { mesures: t.vosMesures, sol: t.pente, ouverture: t.ouverture, fixation: t.fixation, style: t.votreStyle, aspect: t.aspect, couleur: t.eCouleur, decor: t.decor, moteur: t.moteur, portillon: t.portillon, prix: cfg.reception === "pose" ? t.prixPose : t.prixSansPose };
    let contenu: ReactNode = null;
    if (cleEtape === "mesures") contenu = (<>
      <p className="cpt-consigne">{t.consigne}</p>
      <LigneCote picto="passage" titre={t.passage} info={coulissant && cfg.guidage === "auto" ? t.infoPassageAuto : t.infoPassage} valeur={cfg.P} bornes={b.P} onChange={(P) => maj({ P })} aCorriger={t.aCorriger} />
      <LigneCote picto="hauteur" titre={t.hauteur} info={t.infoHauteur} valeur={cfg.H} bornes={b.H} onChange={(H) => maj({ H })} aCorriger={t.aCorriger} />
    </>);
    else if (cleEtape === "sol") contenu = (<>
      <LigneCote picto="pente" titre={t.pente} info={t.infoPente} valeur={cfg.pente} bornes={b.pente} onChange={(pente) => maj({ pente })} aide={t.penteAide} aCorriger={t.aCorriger} />
    </>);
    else if (cleEtape === "ouverture") contenu = (<>
      {battant && (<>
        <span className="cpt-libelle uppercase">{t.vantaux}</span>
        <Pilule aria={t.vantaux} valeur={cfg.vantaux} onChange={(vantaux) => maj({ vantaux })} options={[{ v: 1, label: tp.vantaux[1] }, { v: 2, label: tp.vantaux[2] }]} />
        {cfg.vantaux === 2 && (<>
          <span className="cpt-libelle uppercase">{t.repartition}</span>
          <Pilule aria={t.repartition} valeur={cfg.rep} onChange={(rep) => maj({ rep })} options={[{ v: "egal", label: tp.rep.egal }, { v: "tiers", label: tp.rep.tiers }]} />
        </>)}
      </>)}
      {coulissant && (<>
        <span className="cpt-libelle uppercase">{t.guidage}</span>
        <Pilule aria={t.guidage} valeur={cfg.guidage} onChange={(guidage) => maj({ guidage })} options={[{ v: "rail", label: tp.guidage.rail }, { v: "auto", label: tp.guidage.auto }]} />
      </>)}
      {(coulissant || portillon || (battant && cfg.vantaux === 1)) && (<>
        <span className="cpt-libelle uppercase">{coulissant ? t.sens : t.sensPortillon}</span>
        <Pilule aria={coulissant ? t.sens : t.sensPortillon} valeur={cfg.sens} onChange={(sens) => maj({ sens })}
          options={(["gauche", "droite"] as const).map((s) => ({ v: s, label: coulissant ? tp.sens[s] : tp.sensPortillon[s] }))} />
      </>)}
      <div className="cpt-tel-ouverture">{vueOuverture}<span className="cpt-med-mot" style={{ top: "9%" }}>{t.chezVous}</span><span className="cpt-med-mot" style={{ top: "93%" }}>{t.rue}</span></div>
      <p className="cpt-legende-option">{t.legendeOuverture}</p>
      {conseil}
    </>);
    else if (cleEtape === "fixation") contenu = (<>
      <Pilule aria={t.fixation} valeur={cfg.poteaux} onChange={(poteaux) => maj({ poteaux })} options={(["existants", "alu", "acier"] as const).map((p) => ({ v: p, label: tp.poteaux[p] }))} />
      <p className="cpt-legende-option">{t.legendeOuverture}</p>
      {conseil}
    </>);
    else if (cleEtape === "style") contenu = (
      <div className={`cpt-tel-styles ${perime ? "perimee" : ""}`} role="group" aria-label={t.votreStyle}>
        {vignettesTriees.map(({ st, prims }) => {
          const p = V?.styles[st] ?? null;
          return (
            <button key={st} type="button" className="tuile-modele" aria-pressed={style === st} onClick={() => setCfg((c) => appliquerStyle(c, st))}>
              <span className="cpt-dessin"><Vue prims={prims} couleur={cfg.couleur} sansCotes label={tp.styles[st]} /></span>
              <span className="cpt-t-nom">{tp.styles[st]}</span>
              <span className="cpt-t-prix">{p != null ? `${t.des} ${euros(p)}` : "—"}</span>
            </button>
          );
        })}
      </div>
    );
    else if (cleEtape === "aspect") contenu = (<>
      <span className="cpt-libelle uppercase">{t.formeHaut}</span>
      <Pilule aria={t.formeHaut} picto valeur={cfg.forme} onChange={(forme) => maj({ forme, ...(forme !== "droit" ? { lisse: false } : {}) })}
        options={(["droit", "chapeau", "creux", "biais"] as const).map((x) => ({ v: x, label: t.formes[x], icone: <PictoForme k={x} /> }))} />
      <span className="cpt-libelle uppercase">{t.basPortail}</span>
      <Pilule aria={t.basPortail} valeur={cfg.soub} onChange={(soub) => maj({ soub })} options={(["aucun", "plein", "lames", "barreaux"] as const).map((s) => ({ v: s, label: t.soubCourt[s], titre: tp.soub[s] }))} />
      <div className="cpt-ligne-libre">
        <span><span className="cpt-libelle uppercase">{t.lisse}</span>{cfg.forme !== "droit" && <span className="cpt-raison">{t.lisseRaison}</span>}</span>
        <Pilule aria={t.lisse} valeur={cfg.lisse ? "avec" : "sans"} onChange={(x) => maj({ lisse: x === "avec" })} desactive={cfg.forme !== "droit" ? ["avec"] : []} options={[{ v: "sans", label: t.sans }, { v: "avec", label: t.avec }]} />
      </div>
      {conseil}
    </>);
    else if (cleEtape === "couleur") contenu = (<>
      <span className="cpt-libelle uppercase">{t.couleur}</span>
      <div className="cpt-plaquettes" role="group" aria-label={t.couleur}>
        {COULEURS_PORTAIL.map((c) => (
          <button key={c} type="button" className="cpt-plaquette-btn" aria-pressed={cfg.couleur === c} aria-label={tp.couleur[c]} title={tp.couleur[c]} onClick={() => maj({ couleur: c })}>
            <span className="cpt-plaquette" style={{ background: TEINTES_PORTAIL[c][0] }} />
          </button>
        ))}
        <span className="cpt-mat-nom">{tp.couleur[cfg.couleur]}</span>
      </div>
      <span className="cpt-libelle uppercase">{t.matiere}</span>
      <Pilule aria={t.matiere} valeur={cfg.mat} onChange={(mat) => maj({ mat })} desactive={cfg.decor !== "aucun" ? ["alu"] : []}
        options={[{ v: "alu", label: tp.mat.alu, titre: cfg.decor !== "aucun" ? t.fDecorAcier : undefined }, { v: "acier", label: tp.mat.acier }]} />
    </>);
    else if (cleEtape === "decor") contenu = (<>{ligneDecor}{conseil}</>);
    else if (cleEtape === "moteur") contenu = (<>{ligneMoteur}<p className="cpt-f-note">{t.courant}</p>{conseil}</>);
    else if (cleEtape === "portillon") contenu = (<>{lignePortillon}{conseil}</>);
    else if (cleEtape === "prix") contenu = (<>
      {ligneReception}
      <p className="cpt-r-nom">{nom} · {nf(cfg.P)} × {nf(cfg.H)} mm</p>
      <p className="cpt-r-ligne">{vantauxTxt} · ≈ {nf(R.poids)} kg · {t.fabrique}</p>
      {notePrix}
      <p className="cpt-prix-note">{cfg.reception === "pose" ? t.poseComprise : t.sansPoseNote}</p>
      <button type="button" className="btn-verre cpt-cta" onClick={commander} disabled={prixBase == null || !!alerte}>{t.commander}</button>
      <p className="cpt-btn-note">{acompteTxt ?? t.visite}</p>
      {liensAchat}
    </>);
    return (
      <div className="cpt cpt-tel">
        <div className="cpt-tete">
          <div className="cpt-h1">
            <h1 className={serif.className}>{nom}</h1>
            <button type="button" className="cpt-guide-lien" onClick={() => setFenetre("guide")} aria-haspopup="dialog">{tp.guideTitre}</button>
          </div>
        </div>
        <section id="configuration" className="cpt-section" aria-labelledby={idTitre}>
          <div className="fond-configuration cpt-plaque">
            <div className={`cpt-tel-croquis ${fenetre === "decor" ? "avec-zones" : ""}`}>
              <Vue prims={R.vues.face as Prims} couleur={cfg.couleur} label={`${nom}, ${t.vuRue}`} zones={fenetre === "decor" ? zonesPrims : undefined} onZone={fenetre === "decor" ? toucherZone : undefined} />
              {placeTxt && <span className="cpt-badge-place"><span className="cpt-rond"><PictoPlace /></span>{placeCle} {placeTxt}</span>}
            </div>
            {alerte && <div className="cpt-croquis-alerte" role="status"><b>{alerte}</b>{tropLarge && <> <Link href={`/${locale}/artisanat/portail-coulissant`}>{t.voirCoulissant}</Link></>}</div>}
            <div className="cpt-tel-progres">
              <h2 id={idTitre} className={serif.className}>{titres[cleEtape]}</h2>
              <span>{t.etape(k + 1, etapesTel.length)}</span>
              <div className="cpt-tel-barre" aria-hidden="true"><i style={{ width: `${((k + 1) / etapesTel.length) * 100}%` }} /></div>
            </div>
            <div className="carte-verre cpt-tel-carte">{contenu}</div>
          </div>
          {!(fenetre === "decor" || fenetre === "moteur" || fenetre === "portillon" || fenetre === "visite") && <nav className="cpt-tel-nav" aria-label={t.configuration}>
          <button type="button" className="cpt-tel-retour" disabled={k === 0} onClick={() => setEtape(Math.max(0, k - 1))}>{t.retour}</button>
          <span className={`cpt-tel-prix ${perime ? "perime" : ""}`} aria-live="polite">{alerte ? t.aEtudier : prixBase != null ? euros(prixBase) : t.calcul}</span>
          {k < etapesTel.length - 1
            ? <button type="button" className="btn-verre cpt-tel-suivant" onClick={suivant}>{t.suivant}</button>
            : <button type="button" className="btn-verre cpt-tel-suivant" onClick={commander} disabled={prixBase == null || !!alerte}>{t.commanderCourt}</button>}
          </nav>}
        </section>
        {/* Les fenêtres hors de la plaque : sur téléphone, ce sont des feuilles posées en bas de l'écran, au-dessus de tout. */}
        <div className="fond-configuration cpt-tel-feuilles">{fenetres}</div>
        {superpositions}
      </div>
    );
  }

  return (
    <div className="cpt">
      <div className="cpt-tete">
        {filAriane && (
          <nav aria-label={filAriane.label} className="cpt-fil">
            {filAriane.etapes.map((e) => (<span key={e.href}><Link href={e.href}>{e.nom}</Link> /</span>))}
            <span aria-current="page">{nom}</span>
          </nav>
        )}
        <div className="cpt-h1">
          <h1 className={serif.className}>{nom}</h1>
          <button type="button" className="cpt-guide-lien" onClick={() => setFenetre("guide")} aria-haspopup="dialog">{tp.guideTitre}</button>
        </div>
      </div>

      <section id="configuration" className="cpt-section" aria-labelledby={idTitre}>
        <div className="fond-configuration cpt-plaque">
          <div className="cpt-grille">
            {/* Rangée 1 : le titre, la couleur et la matière. */}
            <div className="cpt-titre-config">
              <div className="cpt-titre-gauche"><h2 id={idTitre} className={serif.className}>{t.configuration}</h2></div>
              <div className="cpt-emplacement-matieres">
                <div className="cpt-matieres">
                  <div className="cpt-mat-groupe"><span className="cpt-mat-titre">{t.couleur}</span>
                    <div className="cpt-plaquettes" role="group" aria-label={t.couleur}>
                      {COULEURS_PORTAIL.map((c) => (
                        <button key={c} type="button" className="cpt-plaquette-btn" aria-pressed={cfg.couleur === c} aria-label={tp.couleur[c]} title={tp.couleur[c]} onClick={() => maj({ couleur: c })}>
                          <span className="cpt-plaquette" style={{ background: TEINTES_PORTAIL[c][0] }} />
                        </button>
                      ))}
                    </div>
                    <span className="cpt-mat-nom">{tp.couleur[cfg.couleur]}</span>
                  </div>
                  <div className="cpt-mat-groupe"><span className="cpt-mat-titre">{t.matiere}</span>
                    <Pilule aria={t.matiere} valeur={cfg.mat} onChange={(mat) => maj({ mat })} desactive={cfg.decor !== "aucun" ? ["alu"] : []}
                      options={[{ v: "alu", label: tp.mat.alu, titre: cfg.decor !== "aucun" ? t.fDecorAcier : undefined }, { v: "acier", label: tp.mat.acier }]} />
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne 1 : les mesures et l'ouverture. */}
            <div className="carte-verre cpt-cotes">
              <h3 className="cpt-carte-titre cpt-titre-mesures">{t.vosMesures}</h3>
              <p className="cpt-consigne">{t.consigne}</p>
              <LigneCote picto="passage" titre={t.passage} info={coulissant && cfg.guidage === "auto" ? t.infoPassageAuto : t.infoPassage} valeur={cfg.P} bornes={b.P} onChange={(P) => maj({ P })} aCorriger={t.aCorriger} />
              <LigneCote picto="hauteur" titre={t.hauteur} info={t.infoHauteur} valeur={cfg.H} bornes={b.H} onChange={(H) => maj({ H })} aCorriger={t.aCorriger} />
              {!coulissant && <LigneCote picto="pente" titre={t.pente} info={t.infoPente} valeur={cfg.pente} bornes={b.pente} onChange={(pente) => maj({ pente })} aide={t.penteAide} aCorriger={t.aCorriger} />}
              <div className="cpt-filet" />
              <h3 className="cpt-carte-titre cpt-titre-mesures cpt-intitule">{t.ouverture}</h3>
              {battant && (<>
                <span className="cpt-libelle uppercase">{t.vantaux}</span>
                <Pilule aria={t.vantaux} valeur={cfg.vantaux} onChange={(vantaux) => maj({ vantaux })} options={[{ v: 1, label: tp.vantaux[1] }, { v: 2, label: tp.vantaux[2] }]} />
                {cfg.vantaux === 2 && (<>
                  <span className="cpt-libelle uppercase">{t.repartition}</span>
                  <Pilule aria={t.repartition} valeur={cfg.rep} onChange={(rep) => maj({ rep })} options={[{ v: "egal", label: tp.rep.egal }, { v: "tiers", label: tp.rep.tiers }]} />
                </>)}
              </>)}
              {coulissant && (<>
                <span className="cpt-libelle uppercase">{t.guidage}</span>
                <Pilule aria={t.guidage} valeur={cfg.guidage} onChange={(guidage) => maj({ guidage })} options={[{ v: "rail", label: tp.guidage.rail }, { v: "auto", label: tp.guidage.auto }]} />
              </>)}
              {(coulissant || portillon || (battant && cfg.vantaux === 1)) && (<>
                <span className="cpt-libelle uppercase">{coulissant ? t.sens : t.sensPortillon}</span>
                <Pilule aria={coulissant ? t.sens : t.sensPortillon} valeur={cfg.sens} onChange={(sens) => maj({ sens })}
                  options={(["gauche", "droite"] as const).map((s) => ({ v: s, label: coulissant ? tp.sens[s] : tp.sensPortillon[s] }))} />
              </>)}
              <span className="cpt-libelle uppercase">{t.fixation}</span>
              <Pilule aria={t.fixation} valeur={cfg.poteaux} onChange={(poteaux) => maj({ poteaux })} options={(["existants", "alu", "acier"] as const).map((p) => ({ v: p, label: tp.poteaux[p] }))} />
              <p className="cpt-legende-option">{t.legendeOuverture}</p>
            </div>

            {/* Colonne 2 : le croquis de l'outil, la place derrière, la vue de dessus. */}
            <div className={`cpt-croquis ${alerte ? "avec-alerte" : ""}`}>
              <div className={`cpt-croquis-dessin ${fenetre === "decor" ? "avec-zones" : ""}`}>
                <Vue prims={R.vues.face as Prims} couleur={cfg.couleur} label={`${nom}, ${t.vuRue}`} zones={fenetre === "decor" ? zonesPrims : undefined} onZone={fenetre === "decor" ? toucherZone : undefined} />
              </div>
              {placeTxt && <span className="cpt-badge-place"><span className="cpt-rond"><PictoPlace /></span>{placeCle} {placeTxt}</span>}
              <div className="cpt-medaillon" role="img" aria-label={t.vueDessus}>
                <div className="cpt-med-dessin">
                  {vueOuverture}
                  <span className="cpt-med-mot" style={{ top: "10%" }}>{t.chezVous}</span>
                  <span className="cpt-med-mot" style={{ top: "92%" }}>{t.rue}</span>
                </div>
              </div>
              {alerte
                ? <div className="cpt-croquis-alerte" role="status"><b>{alerte}</b>{tropLarge && <> <Link href={`/${locale}/artisanat/portail-coulissant`}>{t.voirCoulissant}</Link></>}</div>
                : <p className="cpt-croquis-legende">{fenetre === "decor" ? t.zonesAide : t.vuRue}</p>}
            </div>

            {/* Rangée 3 : le bandeau des styles, avec leur prix aux cotes du client. */}
            <div className="carte-verre cpt-modeles">
              <div className="cpt-modeles-tete"><strong>{t.votreStyle}</strong><span className="cpt-modeles-note">{cfg.reception === "pose" ? t.stylesNote : t.stylesNoteSansPose}</span>
                <button type="button" className="cpt-tri" onClick={() => setTri((v) => (v === "croissant" ? "decroissant" : "croissant"))} aria-label={t.triAria(tri)} title={t.triTitre}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={tri === "croissant" ? "M10 16V4M10 4l-4 4M10 4l4 4" : "M10 4v12M10 16l-4-4M10 16l4-4"} /></svg>
                  {tri === "croissant" ? t.triCroissant : t.triDecroissant}
                </button>
              </div>
              <p className="cpt-modeles-detail" aria-live="polite">
                <b>{style ? `${tp.styles[style]} : ${tp.stylesNote[style]}` : t.compose}</b>
                {style && V?.styles[style] != null && <span> — {euros(V.styles[style] as number)}</span>}
              </p>
              <div className={`cpt-rangee ${perime ? "perimee" : ""}`}>
                <div className="cpt-tuiles" role="group" aria-label={t.votreStyle}>
                  {vignettesTriees.map(({ st, prims }) => {
                    const p = V?.styles[st] ?? null;
                    return (
                      <button key={st} type="button" className="tuile-modele" aria-pressed={style === st} onClick={() => setCfg((c) => appliquerStyle(c, st))}
                        aria-label={`${tp.styles[st]}${p != null ? `, ${t.des} ${euros(p)}` : ""}`}>
                        <span className="cpt-dessin"><Vue prims={prims} couleur={cfg.couleur} sansCotes label={tp.styles[st]} /></span>
                        <span className="cpt-t-nom">{tp.styles[st]}</span>
                        <span className="cpt-t-prix">{p != null ? `${t.des} ${euros(p)}` : "—"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Colonne 3 : l'aspect, le décor, le moteur, puis la barre d'achat. */}
            <div className="carte-verre cpt-achat">
              <div className="cpt-haut-achat">
                <p className="cpt-r-nom">{nom} · {nf(cfg.P)} × {nf(cfg.H)} mm</p>
                <p className="cpt-r-ligne">{vantauxTxt} · ≈ {nf(R.poids)} kg<span className="cpt-r-fab"> · {t.fabrique}</span></p>
                <div className="cpt-filet" />
                <h3 className="cpt-carte-titre cpt-aide-option">{t.aspect}</h3>
                <span className="cpt-libelle uppercase">{t.formeHaut}</span>
                <Pilule aria={t.formeHaut} picto valeur={cfg.forme} onChange={(forme) => maj({ forme, ...(forme !== "droit" ? { lisse: false } : {}) })}
                  options={(["droit", "chapeau", "creux", "biais"] as const).map((k) => ({ v: k, label: t.formes[k], icone: <PictoForme k={k} /> }))} />
                <span className="cpt-libelle uppercase">{t.basPortail}</span>
                <Pilule aria={t.basPortail} valeur={cfg.soub} onChange={(soub) => maj({ soub })} options={(["aucun", "plein", "lames", "barreaux"] as const).map((s) => ({ v: s, label: t.soubCourt[s], titre: tp.soub[s] }))} />
                <div className="cpt-ligne-libre">
                  <span><span className="cpt-libelle uppercase">{t.lisse}</span>{cfg.forme !== "droit" && <span className="cpt-raison">{t.lisseRaison}</span>}</span>
                  <Pilule aria={t.lisse} valeur={cfg.lisse ? "avec" : "sans"} onChange={(x) => maj({ lisse: x === "avec" })} desactive={cfg.forme !== "droit" ? ["avec"] : []}
                    options={[{ v: "sans", label: t.sans }, { v: "avec", label: t.avec }]} />
                </div>
                <div className="cpt-lignes-choix">
                  {ligneDecor}
                  {ligneMoteur}
                  {lignePortillon}
                </div>
              </div>
              <div className="cpt-barre-achat">
                {ligneReception}
                <div className="cpt-prix-ligne">
                  <span className={`cpt-prix ${perime ? "perime" : ""}`} aria-live="polite">{alerte ? t.aEtudier : prixBase != null ? euros(prixBase) : reponse?.etat.etat === "indispo" && !perime ? t.indispo : t.calcul}</span>
                  <span className="cpt-prix-etiquette">{cfg.reception === "pose" ? t.prixPose : t.prixSansPose}</span>
                </div>
                {notePrix}
                {cfg.reception === "pose" && <p className="cpt-prix-note cpt-note-pose">{t.poseComprise}</p>}
                <button type="button" className="btn-verre cpt-cta" onClick={commander} disabled={prixBase == null || !!alerte}>{t.commander}</button>
                <p className="cpt-btn-note">{acompteTxt ?? t.visite}</p>
                {liensAchat}
              </div>
            </div>

            {fenetres}
          </div>
        </div>
        <p className="cpt-aide-bas">{t.question} <Link href={`/${locale}/contact`}>{t.contact}</Link></p>
      </section>

      {superpositions}
    </div>
  );
}
