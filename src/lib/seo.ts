import type { Metadata } from "next";
// Extension écrite en toutes lettres : c'est ce qui permet aux tests
// (node --test, sans outil de construction) d'importer ce fichier tel quel.
import { locales, type Locale } from "./i18n.ts";
import type { DisponibiliteGoogle, FourchetteGoogle } from "./donnees-google.ts";

/**
 * Tout ce qui sert au référencement est rassemblé ici : adresse de l'atelier,
 * zone desservie, mots-clés, et les fabriques de balises et de données
 * structurées. Une seule source, donc pas de dérive entre les pages.
 */

/** Domaine de repli, sans www : c'est la seule forme utilisée par le site. */
const DOMAINE = "https://auboiacier.fr";

/**
 * L'adresse publique du site. Elle vient de NEXT_PUBLIC_SITE_URL (à remplir
 * dans Vercel). On enlève la barre finale ET le « www. » : tout le site parle
 * d'une seule adresse, sinon Google voit deux sites jumeaux et n'en classe
 * bien aucun. vercel.json renvoie www vers cette adresse-ci.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? DOMAINE)
  .trim()
  .replace(/\/+$/, "")
  .replace(/^(https?:\/\/)www\./i, "$1");

export const ATELIER = {
  nom: "Auboiacier",
  legal: "Auboiacier — atelier de métallerie",
  email: "auboiacier@gmail.com",
  rue: "",
  ville: "Saumur",
  codePostal: "49400",
  departement: "Maine-et-Loire",
  region: "Pays de la Loire",
  pays: "FR",
  latitude: 47.2601,
  longitude: -0.0769,
  /** Communes et départements desservis : c'est le cœur du référencement local. */
  zones: [
    "Saumur",
    "Angers",
    "Cholet",
    "Doué-en-Anjou",
    "Longué-Jumelles",
    "Montreuil-Bellay",
    "Bourgueil",
    "Chinon",
    "Tours",
    "Fontevraud-l'Abbaye",
    "Montsoreau",
    "Gennes",
    "Les Rosiers-sur-Loire",
    "Beaufort-en-Anjou",
    "Baugé-en-Anjou",
    "Langeais",
    "Azay-le-Rideau",
    "Loudun",
    "Thouars",
    "Poitiers",
    "Le Mans",
    "Nantes",
    "Maine-et-Loire (49)",
    "Indre-et-Loire (37)",
    "Deux-Sèvres (79)",
    "Vienne (86)",
    "Pays de la Loire",
  ],
} as const;

/**
 * Coordonnées publiques de l'atelier. Le téléphone et les horaires sont ceux
 * de la fiche Google de Quentin (capture du 05/10/2026) : le site doit dire
 * exactement la même chose que la fiche. Une variable remplie dans Vercel
 * (voir .env.example) les remplace ; ce qui reste vide est omis, jamais inventé.
 * Le préfixe NEXT_PUBLIC_ est volontaire — ce sont des informations publiques,
 * et elles peuvent ainsi être affichées aussi bien dans les pages que dans les
 * données envoyées à Google.
 */
export const CONTACT_PUBLIC = {
  /** Format international, sans espaces : +33612345678. */
  telephone: process.env.NEXT_PUBLIC_ATELIER_TELEPHONE || "+33782372379",
  /**
   * Horaires au format compris par Google, séparés par des points-virgules :
   * « Mo-Fr 08:00-18:00; Sa 09:00-12:00 ».
   */
  horaires: process.env.NEXT_PUBLIC_ATELIER_HORAIRES || "Mo-Fr 07:00-17:00; Sa 09:00-16:00",
  facebook: process.env.NEXT_PUBLIC_ATELIER_FACEBOOK ?? "",
  instagram: process.env.NEXT_PUBLIC_ATELIER_INSTAGRAM ?? "",
  /** Adresse de la fiche Google de l'atelier (Google Business Profile). */
  google: process.env.NEXT_PUBLIC_ATELIER_GOOGLE ?? "",
} as const;

/**
 * Les horaires, écrits pour un être humain plutôt que pour Google.
 * « Mo-Fr 08:00-18:00; Sa 09:00-12:00 » devient « Lun–Ven 08:00–18:00 ·
 * Sam 09:00–12:00 ». Vide si la variable n'est pas remplie.
 */
const JOURS: Record<Locale, Record<string, string>> = {
  fr: { Mo: "Lun", Tu: "Mar", We: "Mer", Th: "Jeu", Fr: "Ven", Sa: "Sam", Su: "Dim" },
  en: { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" },
};

export function horairesLisibles(locale: Locale): string {
  const brut = CONTACT_PUBLIC.horaires.trim();
  if (!brut) return "";
  return brut
    .split(";")
    .map((plage) =>
      plage
        .trim()
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (jour) => JOURS[locale][jour] ?? jour)
        .replace(/-/g, "\u2013")
    )
    .filter(Boolean)
    .join(" · ");
}

/**
 * L'adresse de la fiche Google de l'atelier (NEXT_PUBLIC_ATELIER_GOOGLE), où
 * se lisent les avis des clients — ou null tant qu'elle n'est pas renseignée.
 * Sans fiche, le site n'en parle pas du tout : ni « nos avis sont sur
 * Google », ni lien, ni recherche Google Maps de repli (elle ne menait à
 * aucune fiche). Le site ne recopie ni la note ni les avis.
 */
export function lienAvisGoogle(): string | null {
  return CONTACT_PUBLIC.google.trim() || null;
}

/**
 * Le lien « laisser un avis » de la fiche Google, celui qui ouvre directement
 * la fenêtre des étoiles (https://g.page/r/…/review). Google le donne dans la
 * fiche : « Demander des avis ». C'est la destination de l'adresse courte
 * https://auboiacier.fr/avis — celle de la carte glissée dans les colis et du
 * mail envoyé après la livraison (src/lib/avis.ts).
 *
 * La variable NEXT_PUBLIC_ATELIER_GOOGLE_AVIS de Vercel l'emporte ; à défaut,
 * cette constante, vide tant que Quentin n'a pas le lien. Vide : /avis montre
 * une page de remerciement, et aucun mail de demande d'avis ne part.
 */
export const AVIS_GOOGLE_REPLI = "";

/**
 * Le lien d'avis, ou null. Une adresse complète en https, sinon rien : une
 * faute de frappe ne doit pas envoyer les clients sur une page d'erreur.
 */
export function lienLaisserAvis(): string | null {
  const lien = (process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS || AVIS_GOOGLE_REPLI).trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(lien) ? lien : null;
}

/** Le téléphone tel qu'on le compose : +33612345678 → 06 12 34 56 78. */
export function telephoneLisible(): string {
  const brut = CONTACT_PUBLIC.telephone.replace(/\s+/g, "");
  if (!brut) return "";
  const national = brut.startsWith("+33") ? `0${brut.slice(3)}` : brut;
  return /^0\d{9}$/.test(national) ? national.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : brut;
}

/*
 * Plus de liste de mots-clés « de fond » répétée sur toutes les pages : Google
 * ne lit pas la balise keywords, et Bing prend une longue liste identique
 * partout pour du bourrage. Chaque page ne déclare que les siens (motsCles).
 */

/**
 * Image de partage par défaut (Facebook, WhatsApp, LinkedIn…).
 * Ce fichier est fabriqué exprès au format demandé par les réseaux,
 * 1200 × 630 : les photos de l'atelier, elles, ont chacune leur format et
 * se retrouveraient rognées n'importe comment.
 */
const IMAGE_PARTAGE = "/images/partage-auboiacier.jpg";

/** Le logo de l'atelier pour Google : carré, 512 × 512, dans public/. */
const LOGO = "/icon-512.png";

/** Celui qui a ouvert l'atelier (page À propos). */
const FONDATEUR = "Quentin Aumercier";

/**
 * Dimensions réelles, uniquement pour les images dont on est sûr.
 * Annoncer 1200 × 630 pour une photo qui n'en fait pas donne un aperçu
 * déformé ou coupé : on préfère ne rien annoncer et laisser le réseau mesurer.
 */
const DIMENSIONS_CONNUES: Record<string, { width: number; height: number }> = {
  [IMAGE_PARTAGE]: { width: 1200, height: 630 },
  // Déclinaisons fabriquées au même format pour les pages dont la photo
  // d'origine ne s'y prête pas (carrée, portrait ou très allongée) :
  // voir scripts/images-partage.py.
  "/images/partage/artisanat.jpg": { width: 1200, height: 630 },
  "/images/partage/sculptures.jpg": { width: 1200, height: 630 },
  "/images/partage/lucarne.jpg": { width: 1200, height: 630 },
  "/images/partage/halo.jpg": { width: 1200, height: 630 },
};

/* ------------------------------------------------------------------ *
 *  Titres
 *  Google n'affiche qu'une soixantaine de signes dans ses résultats.
 *  Tout ce qui dépasse est remplacé par « … » et devient invisible :
 *  si le nom de l'atelier et la ville sont à la fin d'un titre trop long,
 *  personne ne les voit jamais. On coupe donc le titre AVANT d'ajouter
 *  l'atelier et la ville, et on garde toujours ces deux-là.
 * ------------------------------------------------------------------ */

/** Nombre de signes affichés par Google. Au-delà, c'est perdu. */
const LONGUEUR_TITRE = 60;

/** Petits mots sur lesquels un titre ne doit jamais s'arrêter. */
const MOTS_OUTILS = new Set([
  "à", "au", "aux", "avec", "dans", "de", "des", "du", "en", "et", "la", "le",
  "les", "par", "pour", "sur", "un", "une", "and", "for", "in", "of", "the", "with",
]);

/** Ce qu'on ajoute à la fin selon ce que le titre dit déjà. */
function suffixePour(titre: string) {
  const nom = titre.toLowerCase().includes(ATELIER.nom.toLowerCase());
  const ville = titre.toLowerCase().includes(ATELIER.ville.toLowerCase());
  if (nom && ville) return "";
  if (nom) return ` — ${ATELIER.ville}`;
  if (ville) return ` — ${ATELIER.nom}`;
  return ` — ${ATELIER.nom} ${ATELIER.ville}`;
}

/** Coupe sur un tiret, une virgule ou un espace — jamais au milieu d'un mot. */
function couper(texte: string, budget: number) {
  if (texte.length <= budget) return texte;
  const debut = texte.slice(0, budget + 1);
  // Une coupe sur la ponctuation du titre est la plus propre, à condition de
  // ne pas amputer plus de la moitié de ce qu'on pouvait garder.
  const ponctuation = Math.max(
    debut.lastIndexOf(" — "),
    debut.lastIndexOf(" – "),
    debut.lastIndexOf(" | "),
    debut.lastIndexOf(", ")
  );
  let court =
    ponctuation > budget / 2
      ? texte.slice(0, ponctuation)
      : texte.slice(0, Math.max(debut.lastIndexOf(" "), 0) || budget);
  court = court.trim().replace(/[\s,;:|–—-]+$/, "");
  // « … à toile tendue sur » : on retire les petits mots restés en l'air.
  let mots = court.split(" ");
  while (mots.length > 1 && MOTS_OUTILS.has(mots[mots.length - 1].toLowerCase())) {
    mots = mots.slice(0, -1);
  }
  court = mots.join(" ").replace(/[\s,;:|–—-]+$/, "");

  // Un morceau coupé en plein milieu donne un titre qui a l'air cassé :
  // « Verrières en acier et intérieur », « Halo — A circle of backlit
  // stretched ». On le laisse tomber en entier plutôt que de le montrer
  // amputé — mieux vaut un titre plus court qu'un titre qui bafouille.
  const morceaux = court.split(" — ");
  const entiers = texte.split(" — ");
  const dernier = morceaux[morceaux.length - 1];
  const complet = entiers[morceaux.length - 1];
  const ampute = complet !== undefined && dernier !== complet;
  if (morceaux.length > 1 && (dernier.split(" ").length < 2 || ampute)) {
    court = morceaux.slice(0, -1).join(" — ");
  }
  return court;
}

/**
 * Titre définitif d'une page : l'essentiel d'abord, puis l'atelier et la ville,
 * le tout dans les 60 premiers signes. « Auboiacier » en tête est retiré,
 * puisqu'il revient à la fin.
 */
export function titreSeo(titre: string) {
  const base = titre
    .replace(/\s+/g, " ")
    .trim()
    .replace(new RegExp(`^${ATELIER.nom}\\s*[—–|-]\\s*`, "i"), "");

  // Deux passes : le suffixe dépend de ce que dit le titre, et ce que dit le
  // titre dépend de l'endroit où on l'a coupé. Deux tours suffisent à se caler.
  let suffixe = suffixePour(base);
  let court = base;
  for (let i = 0; i < 2; i++) {
    court = couper(base, LONGUEUR_TITRE - suffixe.length);
    const nouveau = suffixePour(court);
    if (nouveau === suffixe) break;
    suffixe = nouveau;
  }
  return `${court}${suffixe}`;
}

/* ------------------------------------------------------------------ *
 *  Descriptions
 *  Même logique que pour les titres : Google n'affiche qu'environ 155
 *  signes sous le lien, et remplace la suite par « … ». Les textes des
 *  dictionnaires sont écrits pour tenir ; ce garde-fou rattrape ceux qui
 *  sont assemblés à la volée (fiche produit : accroche + prix + suffixe).
 * ------------------------------------------------------------------ */

/** Nombre de signes qu'un résultat de recherche affiche. */
const LONGUEUR_DESCRIPTION = 155;

/**
 * Coupe une description trop longue sur une fin de phrase, sinon sur un mot,
 * sans jamais dépasser 155 signes. Une description qui tient est rendue telle
 * quelle, espaces normalisés.
 */
export function descriptionSeo(texte: string) {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= LONGUEUR_DESCRIPTION) return propre;
  const debut = propre.slice(0, LONGUEUR_DESCRIPTION);
  // Une phrase entière vaut mieux qu'une phrase tronquée, à condition de ne
  // pas jeter plus de la moitié du texte.
  const phrase = Math.max(debut.lastIndexOf(". "), debut.lastIndexOf(" — "), debut.lastIndexOf("; "));
  if (phrase > LONGUEUR_DESCRIPTION / 2) return propre.slice(0, phrase + 1).trim();
  // Sinon sur le dernier mot entier (ou brut, s'il n'y a aucun espace).
  const mot = debut.lastIndexOf(" ");
  return debut.slice(0, mot > 0 ? mot : LONGUEUR_DESCRIPTION - 1).replace(/[\s,;:—–-]+$/, "") + "…";
}

/** La description tient-elle entière dans ce que Google affiche (descriptionSeo n'y coupe rien) ? */
export function descriptionTient(texte: string): boolean {
  return descriptionSeo(texte) === texte.replace(/\s+/g, " ").trim();
}

function absolu(chemin: string) {
  return chemin.startsWith("http") ? chemin : `${SITE_URL}${chemin}`;
}

/**
 * Canonique + versions linguistiques. `chemin` est sans préfixe de langue :
 * "" pour l'accueil, "/artisanat", "/artisanat/table-mikado"…
 */
export function alternatesPour(locale: Locale, chemin: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${SITE_URL}/${l}${chemin}`;
  languages["x-default"] = `${SITE_URL}/fr${chemin}`;
  return { canonical: `${SITE_URL}/${locale}${chemin}`, languages };
}

/** Fabrique les balises d'une page : titre, description, partage, canonique. */
export function metadataPage({
  locale,
  chemin,
  title,
  description,
  image = IMAGE_PARTAGE,
  motsCles = [],
  noIndex = false,
}: {
  locale: Locale;
  chemin: string;
  title: string;
  description: string;
  image?: string;
  motsCles?: string[];
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}/${locale}${chemin}`;
  // Le titre est fabriqué en entier ici (« absolute ») : le modèle du layout
  // ne vient donc pas rajouter une deuxième fois l'atelier et la ville.
  const titre = titreSeo(title);
  // Même garde-fou pour la description : au-delà de 155 signes, Google coupe.
  const desc = descriptionSeo(description);
  const dimensions = DIMENSIONS_CONNUES[image];
  return {
    title: { absolute: titre },
    description: desc,
    ...(motsCles.length > 0 ? { keywords: motsCles } : {}),
    alternates: alternatesPour(locale, chemin),
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      type: "website",
      siteName: ATELIER.nom,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      url,
      title: titre,
      description: desc,
      // Largeur et hauteur seulement si on les connaît vraiment (voir plus haut).
      images: [{ url: absolu(image), ...(dimensions ?? {}), alt: titre }],
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description: desc,
      images: [absolu(image)],
    },
  };
}

/* ------------------------------------------------------------------ *
 *  Données structurées (JSON-LD)
 *  Elles expliquent à Google ce qu'est l'atelier, où il travaille et ce
 *  qu'il vend — c'est ce qui déclenche les fiches et les prix affichés
 *  directement dans les résultats de recherche.
 * ------------------------------------------------------------------ */

export function jsonLdAtelier(locale: Locale) {
  const horaires = CONTACT_PUBLIC.horaires
    .split(";")
    .map((plage) => plage.trim())
    .filter(Boolean);
  const reseaux = [CONTACT_PUBLIC.facebook, CONTACT_PUBLIC.instagram, CONTACT_PUBLIC.google].filter(
    Boolean
  );

  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness", "Store"],
    "@id": `${SITE_URL}/#atelier`,
    name: ATELIER.nom,
    legalName: ATELIER.legal,
    url: `${SITE_URL}/${locale}`,
    email: ATELIER.email,
    image: absolu(IMAGE_PARTAGE),
    // Le logo carré de l'atelier (512 × 512), celui de l'écran d'accueil du téléphone.
    logo: absolu(LOGO),
    // Le fondateur, tel que le présente la page À propos.
    founder: { "@type": "Person", name: FONDATEUR },
    description:
      locale === "fr"
        ? "Atelier de métallerie artisanale à Saumur (Maine-et-Loire) : garde-corps de fenêtre sur mesure, tables, chaises, escaliers, verrières, sculptures et plafonds lumineux à toile tendue, en acier et bois massif, fabriqués à la main sur mesure."
        : "Craft metalwork studio in Saumur, Loire Valley, France: custom window railings, bespoke tables, chairs, staircases, steel partitions, sculptures and backlit stretched-fabric ceilings in steel and solid wood, all handmade to order.",
    address: {
      "@type": "PostalAddress",
      // Renseignée dans ATELIER.rue le jour où l'adresse de l'atelier est
      // publique : Google compare mot pour mot ce bloc à la fiche Business.
      ...(ATELIER.rue ? { streetAddress: ATELIER.rue } : {}),
      addressLocality: ATELIER.ville,
      postalCode: ATELIER.codePostal,
      addressRegion: ATELIER.region,
      addressCountry: ATELIER.pays,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: ATELIER.latitude,
      longitude: ATELIER.longitude,
    },
    areaServed: ATELIER.zones.map((zone) => ({ "@type": "Place", name: zone })),
    // Ce qui suit n'apparaît que si la variable correspondante est remplie :
    // une fiche à moitié vide vaut mieux qu'une fiche qui raconte n'importe quoi.
    ...(CONTACT_PUBLIC.telephone ? { telephone: CONTACT_PUBLIC.telephone } : {}),
    ...(horaires.length > 0 ? { openingHours: horaires } : {}),
    ...(reseaux.length > 0 ? { sameAs: reseaux } : {}),
    ...(CONTACT_PUBLIC.google ? { hasMap: CONTACT_PUBLIC.google } : {}),
    priceRange: "€€–€€€",
    currenciesAccepted: "EUR",
    knowsLanguage: ["fr", "en"],
    makesOffer: OFFRES[locale].map((nom) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: nom },
    })),
  };
}

/**
 * Ce que l'atelier sait faire, dans les deux langues.
 * Cette liste part à Google sur TOUTES les pages, y compris les anglaises, où
 * elle était restée en français : un anglophone qui cherche « steel partition »
 * ne trouvait rien.
 */
const OFFRES: Record<Locale, string[]> = {
  fr: [
    "Garde-corps de fenêtre sur mesure",
    "Table sur mesure bois et acier",
    "Chaise et fauteuil garnis",
    "Escalier acier sur mesure",
    "Verrière d'atelier",
    "Sculpture métal",
    "Plafond lumineux à toile tendue",
  ],
  en: [
    "Custom window railing",
    "Bespoke wood and steel table",
    "Upholstered chairs and armchairs",
    "Bespoke steel staircase",
    "Interior steel partition",
    "Metal sculpture",
    "Backlit stretched-fabric ceiling",
  ],
};

/**
 * La carte d'identité du site lui-même.
 * C'est elle qui permet à Google d'écrire « Auboiacier » sous le résultat
 * plutôt que « auboiacier.fr », et de rattacher chaque page à l'atelier.
 */
export function jsonLdSite(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    name: ATELIER.nom,
    alternateName: ATELIER.legal,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
    publisher: { "@id": `${SITE_URL}/#atelier` },
  };
}

export function jsonLdFilAriane(locale: Locale, etapes: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map((etape, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: etape.nom,
      item: `${SITE_URL}/${locale}${etape.chemin}`,
    })),
  };
}

/**
 * Une liste de pages (les modèles d'une famille) : Google comprend que la
 * page les présente, et peut les relier entre elles.
 */
export function jsonLdListe(locale: Locale, nom: string, elements: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nom,
    itemListElement: elements.map((element, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: element.nom,
      url: `${SITE_URL}/${locale}${element.chemin}`,
    })),
  };
}

/**
 * Le bloc Product d'une fiche, avec son offre. Seulement pour une fiche qui
 * affiche un prix : sans offre (ni avis, ni note), Google le signale comme
 * élément non valide — la page n'en émet alors aucun (src/lib/donnees-google.ts).
 */
export function jsonLdProduit({
  locale,
  chemin,
  nom,
  description,
  images,
  fourchette,
  disponibilite,
}: {
  locale: Locale;
  chemin: string;
  nom: string;
  description: string;
  images: string[];
  /** Son bas est le prix affiché par la fiche (fourchetteGoogle). */
  fourchette: FourchetteGoogle;
  /** InStock quand le panier encaisse, null avant : aucune disponibilité envoyée (disponibiliteGoogle). */
  disponibilite: DisponibiliteGoogle;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nom,
    description,
    image: images.map(absolu),
    brand: { "@type": "Brand", name: ATELIER.nom },
    manufacturer: { "@id": `${SITE_URL}/#atelier` },
    countryOfOrigin: "FR",
    url: `${SITE_URL}/${locale}${chemin}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: fourchette.prixMin,
      highPrice: fourchette.prixMax,
      offerCount: 1,
      // Seulement une valeur de la liste de Google (MadeToOrder n'en fait
      // pas partie) : InStock quand le panier encaisse — le délai de
      // fabrication est dit dans la page et dans l'e-mail de confirmation.
      // Avant l'ouverture, aucune : rien ne se commande encore.
      ...(disponibilite ? { availability: `https://schema.org/${disponibilite}` } : {}),
      seller: { "@id": `${SITE_URL}/#atelier` },
      areaServed: "FR",
    },
  };
}

/**
 * Foire aux questions.
 * Google peut afficher ces questions-réponses directement sous le lien du
 * site. À brancher sur une page qui pose VRAIMENT ces questions à l'écran :
 * une FAQ déclarée mais invisible est considérée comme de la triche.
 */
export function jsonLdFaq(questions: { question: string; reponse: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions
      .filter((q) => q.question.trim() && q.reponse.trim())
      .map((q) => ({
        "@type": "Question",
        name: q.question.trim(),
        acceptedAnswer: { "@type": "Answer", text: q.reponse.trim() },
      })),
  };
}

/** Balise à insérer dans une page. */
export function scriptJsonLd(donnees: object) {
  return {
    __html: JSON.stringify(donnees).replace(/</g, "\\u003c"),
  };
}
