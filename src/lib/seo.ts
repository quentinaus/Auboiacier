import type { Metadata } from "next";
// Extension écrite en toutes lettres : c'est ce qui permet aux tests
// (node --test, sans outil de construction) d'importer ce fichier tel quel.
import { locales, type Locale } from "./i18n.ts";
import type { DisponibiliteGoogle, FourchetteGoogle } from "./donnees-google.ts";
import { PRIX_OFFRE_CENTS, RAYON_MAX_KM, RAYON_OFFRE_KM } from "./deplacement.ts";
import { ENTREPRISE, siretValide } from "./entreprise.ts";
import type { Famille } from "./products.ts";

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
 * Les quatre départements autour de l'atelier : ceux de la page « zone
 * d'intervention » et de la zone annoncée à Google (jsonLdAtelier).
 */
export const DEPARTEMENTS_DESSERVIS = [
  { nom: "Maine-et-Loire", numero: "49" },
  { nom: "Indre-et-Loire", numero: "37" },
  { nom: "Deux-Sèvres", numero: "79" },
  { nom: "Vienne", numero: "86" },
] as const;

/**
 * Les communes que la page « zone d'intervention » affiche : seulement
 * celles à moins de 50 km de l'atelier, à vol d'oiseau (la mesure de
 * src/lib/deplacement.ts), de la plus proche à la plus loin. Une longue
 * liste de villes lointaines (de Nantes au Mans) ressemblait à du bourrage ;
 * le reste de la zone se dit en une phrase (« et jusqu'à … km de
 * l'atelier », RAYON_MAX_KM). Distances arrondies, centre de la commune.
 */
export const COMMUNES_AFFICHEES = [
  "Saumur",
  "Montsoreau", // 11 km
  "Fontevraud-l'Abbaye", // 13 km
  "Longué-Jumelles", // 13 km
  "Gennes", // 15 km
  "Les Rosiers-sur-Loire", // 15 km
  "Montreuil-Bellay", // 16 km
  "Doué-en-Anjou", // 17 km
  "Bourgueil", // 19 km
  "Beaufort-en-Anjou", // 23 km
  "Chinon", // 26 km
  "Loudun", // 30 km
  "Baugé-en-Anjou", // 31 km
  "Thouars", // 33 km
  "Langeais", // 37 km
  "Azay-le-Rideau", // 41 km
  "Angers", // 43 km
] as const;

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
 * Abréviations dont le point ne finit pas la phrase : « hauteur (art. R134-59) »
 * était coupé en « hauteur (art. » (page vérification, 06/10/2026).
 */
const ABREVIATIONS = new Set(["art", "al", "env", "n°", "no", "cf", "ex", "p", "réf", "ref"]);

/** Le mot qui finit ce texte, sans la ponctuation qui l'ouvre ni le point qui le ferme, en minuscules. */
function dernierMot(texte: string): string {
  const mot = texte.trimEnd().split(" ").pop() ?? "";
  return mot.replace(/^[(«"“[]+/, "").replace(/\.$/, "").toLowerCase();
}

/**
 * La dernière vraie fin de phrase qui tient dans `limite` signes : un point
 * suivi d'une espace puis d'une majuscule, et pas le point d'une abréviation
 * (« art. », « env. »…) ni d'une initiale. -1 s'il n'y en a pas.
 */
function derniereFinDePhrase(texte: string, limite: number): number {
  let fin = -1;
  for (const m of texte.matchAll(/\.(?= \p{Lu})/gu)) {
    const i = m.index ?? 0;
    if (i + 1 > limite) break;
    const mot = dernierMot(texte.slice(0, i));
    if (ABREVIATIONS.has(mot) || /^\p{L}$/u.test(mot)) continue;
    fin = i;
  }
  return fin;
}

/**
 * Coupe une description trop longue sur une fin de phrase, sinon sur un mot,
 * sans jamais dépasser 155 signes. Une description qui tient est rendue telle
 * quelle, espaces normalisés. Une fin de phrase, c'est un point suivi d'une
 * majuscule, jamais celui de « art. », « n° » ou « env. ».
 */
export function descriptionSeo(texte: string) {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= LONGUEUR_DESCRIPTION) return propre;
  const debut = propre.slice(0, LONGUEUR_DESCRIPTION);
  // Une phrase entière vaut mieux qu'une phrase tronquée, à condition de ne
  // pas jeter plus de la moitié du texte.
  const phrase = Math.max(derniereFinDePhrase(propre, LONGUEUR_DESCRIPTION), debut.lastIndexOf(" — "), debut.lastIndexOf("; "));
  if (phrase > LONGUEUR_DESCRIPTION / 2) return propre.slice(0, phrase + 1).trim();
  // Sinon sur le dernier mot entier (ou brut, s'il n'y a aucun espace), sans
  // finir sur une abréviation ni sur une parenthèse ouverte.
  const mot = debut.lastIndexOf(" ");
  let court = debut.slice(0, mot > 0 ? mot : LONGUEUR_DESCRIPTION - 1).replace(/[\s,;:—–(-]+$/, "");
  while (court.includes(" ") && ABREVIATIONS.has(dernierMot(court))) {
    court = court.slice(0, court.lastIndexOf(" ")).replace(/[\s,;:—–(-]+$/, "");
  }
  return court + "…";
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

/** La langue au format des réseaux sociaux (Open Graph). */
const LOCALE_OG: Record<Locale, string> = { fr: "fr_FR", en: "en_GB" };

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
      locale: LOCALE_OG[locale],
      // L'autre langue de la même page (og:locale:alternate). Sans effet sur
      // Google : seuls Facebook et ses cousins le lisent.
      alternateLocale: locales.filter((l) => l !== locale).map((l) => LOCALE_OG[l]),
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

/** L'atelier et Quentin, tels que les blocs de données se citent l'un l'autre. */
const ID_ATELIER = `${SITE_URL}/#atelier`;
const ID_QUENTIN = `${SITE_URL}/#quentin`;

/** Un disque autour de l'atelier, rayon en km (Google le lit en mètres). */
function cercleAutourAtelier(rayonKm: number) {
  return {
    "@type": "GeoCircle",
    geoMidpoint: { "@type": "GeoCoordinates", latitude: ATELIER.latitude, longitude: ATELIER.longitude },
    geoRadius: rayonKm * 1000,
  };
}

/**
 * La zone desservie : jusqu'où l'atelier se déplace (RAYON_MAX_KM,
 * src/lib/deplacement.ts), et les quatre départements de la page zone. Plus
 * de liste de 27 villes de Nantes au Mans : Google la prenait pour ce
 * qu'elle était, une liste.
 */
function zoneDesservie() {
  return [
    cercleAutourAtelier(RAYON_MAX_KM),
    ...DEPARTEMENTS_DESSERVIS.map((d) => ({
      "@type": "AdministrativeArea",
      name: d.nom,
      // « Vienne » est aussi le nom français de Wien : on dit de quel pays.
      containedInPlace: { "@type": "Country", name: "France" },
    })),
  ];
}

/** Ce que l'atelier fait, en une phrase (« chaises » retiré : pièce retirée de la vente le 06/10/2026). */
const DESCRIPTION_ATELIER: Record<Locale, string> = {
  fr: "Atelier de métallerie artisanale à Saumur (Maine-et-Loire) : garde-corps de fenêtre, de balcon et de terrasse, escaliers à limon central, verrières, tables en bois massif sur piétement acier, plafonds lumineux en toile tendue et sculptures, fabriqués à la main, sur mesure. Soudure et réparations à façon.",
  en: "Metalwork workshop in Saumur, Loire Valley, France: window, balcony and terrace railings, steel spine staircases, steel internal windows, solid wood tables on steel bases, backlit stretch-fabric ceiling lights and sculptures, handmade to measure. Welding and metal repairs to order.",
};

/** Les métiers de l'atelier (knowsAbout). Garde-corps de balcon, rampes et soudure à façon : oui de Quentin, 07/10/2026. */
const METIERS_ATELIER: Record<Locale, string[]> = {
  fr: [
    "Métallerie",
    "Soudure TIG",
    "Soudure MAG",
    "Garde-corps de fenêtre",
    "Garde-corps de balcon et de terrasse",
    "Rampe d'escalier",
    "Escalier à limon central",
    "Verrière d'atelier",
    "Mobilier acier et bois massif",
    "Plafond lumineux en toile tendue",
    "Soudure et réparation à façon",
  ],
  en: [
    "Metalwork",
    "TIG welding",
    "MIG/MAG welding",
    "Window railings",
    "Balcony and terrace railings",
    "Stair railings",
    "Steel spine staircases",
    "Steel internal windows",
    "Steel and solid wood furniture",
    "Backlit stretch-fabric ceiling lights",
    "Welding and metal repairs",
  ],
};

/** Le n° de TVA intracommunautaire, s'il y en a un (pas « non applicable, art. 293 B »). */
function tvaIntracommunautaire(): string | null {
  const tva = ENTREPRISE.tva.replace(/\s/g, "").toUpperCase();
  return /^FR[0-9A-Z]{2}\d{9}$/.test(tva) ? tva : null;
}

export function jsonLdAtelier(locale: Locale) {
  const horaires = CONTACT_PUBLIC.horaires
    .split(";")
    .map((plage) => plage.trim())
    .filter(Boolean);
  const reseaux = [CONTACT_PUBLIC.facebook, CONTACT_PUBLIC.instagram, CONTACT_PUBLIC.google].filter(
    Boolean
  );
  const raisonSociale = ENTREPRISE.raisonSociale.trim();
  const tva = tvaIntracommunautaire();

  return {
    "@context": "https://schema.org",
    // Pas de « Store » : aucune boutique ouverte au public, aucune adresse publiée.
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": ID_ATELIER,
    name: ATELIER.nom,
    alternateName: ATELIER.legal,
    // Le nom déposé, le SIRET et la TVA viennent de la fiche de l'entreprise
    // (src/lib/entreprise.ts) : rien tant qu'ils ne sont pas remplis.
    ...(raisonSociale ? { legalName: raisonSociale } : {}),
    ...(siretValide(ENTREPRISE.siret)
      ? { identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: ENTREPRISE.siret.replace(/\s/g, "") } }
      : {}),
    ...(tva ? { vatID: tva } : {}),
    url: `${SITE_URL}/${locale}`,
    email: ATELIER.email,
    image: absolu(IMAGE_PARTAGE),
    // Le logo carré de l'atelier (512 × 512), celui de l'écran d'accueil du téléphone.
    logo: absolu(LOGO),
    // Le fondateur : le même bloc que la page À propos (jsonLdPersonne), par son identifiant.
    founder: { "@type": "Person", "@id": ID_QUENTIN, name: FONDATEUR },
    description: DESCRIPTION_ATELIER[locale],
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
    areaServed: zoneDesservie(),
    knowsAbout: METIERS_ATELIER[locale],
    // Ce qui suit n'apparaît que si la variable correspondante est remplie :
    // une fiche à moitié vide vaut mieux qu'une fiche qui raconte n'importe quoi.
    ...(CONTACT_PUBLIC.telephone ? { telephone: CONTACT_PUBLIC.telephone } : {}),
    ...(horaires.length > 0 ? { openingHours: horaires } : {}),
    ...(reseaux.length > 0 ? { sameAs: reseaux } : {}),
    ...(CONTACT_PUBLIC.google ? { hasMap: CONTACT_PUBLIC.google } : {}),
    priceRange: "€€–€€€",
    currenciesAccepted: "EUR",
    knowsLanguage: ["fr", "en"],
    // Jamais de note ni d'avis sur l'atelier : seulement de vrais avis, sur une pièce livrée.
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
    // Ajoutés le 07/10/2026 (Quentin veut aussi les vendre).
    "Garde-corps de balcon et de terrasse sur mesure",
    "Rampe d'escalier sur mesure",
    "Soudure et réparation à façon",
  ],
  en: [
    "Custom window railing",
    "Bespoke wood and steel table",
    "Upholstered chairs and armchairs",
    "Bespoke steel staircase",
    "Interior steel partition",
    "Metal sculpture",
    "Backlit stretched-fabric ceiling",
    "Bespoke balcony and terrace railings",
    "Bespoke stair railings",
    "Welding and metal repairs",
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
  sku,
  materiau,
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
  /** La référence de la pièce : son slug. Facultatif. */
  sku?: string;
  /** Ses matières, en une ligne (materiauFamille). Facultatif. */
  materiau?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nom,
    description,
    ...(sku ? { sku } : {}),
    ...(materiau ? { material: materiau } : {}),
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
 * Les matières d'une pièce, par famille, pour le bloc Product (material).
 * Rien pour les chaises (session Chaises) ; une pièce qui a une matière en
 * plus (la résine de la table rivière) passe sa propre ligne.
 */
const MATIERES_FAMILLE: Partial<Record<Famille, Record<Locale, string>>> = {
  "table-interieur": { fr: "Acier ; bois massif", en: "Steel; solid wood" },
  "table-exterieur": { fr: "Acier ; bois massif", en: "Steel; solid wood" },
  escalier: { fr: "Acier ; bois massif", en: "Steel; solid wood" },
  "garde-corps": { fr: "Acier ; bois massif ou acier (main courante)", en: "Steel; solid wood or steel (handrail)" },
  plafond: { fr: "Aluminium ; textile tendu ; LED", en: "Aluminium; stretch fabric; LED" },
};

export function materiauFamille(famille: Famille, locale: Locale): string | undefined {
  return MATIERES_FAMILLE[famille]?.[locale];
}

/* ------------------------------------------------------------------ *
 *  Quentin (page À propos)
 * ------------------------------------------------------------------ */

/** Ses diplômes, intitulés exacts (Quentin, 07/10/2026). */
const DIPLOMES: { nom: string; categorie: Record<Locale, string> }[] = [
  {
    nom: "CAP Métallier",
    categorie: {
      fr: "Certificat d'aptitude professionnelle (CAP)",
      en: "Certificat d'aptitude professionnelle (CAP), French vocational diploma",
    },
  },
  {
    nom: "BP Métallier",
    categorie: {
      fr: "Brevet professionnel (BP)",
      en: "Brevet professionnel (BP), French professional diploma",
    },
  },
];

/**
 * Ce que Quentin sait faire. L'aluminium : « bon soudeur alu, TIG si besoin »
 * (Quentin, 06/10/2026).
 */
const SAVOIR_FAIRE_QUENTIN: Record<Locale, string[]> = {
  fr: [
    "Soudure TIG",
    "Soudure MAG",
    "Soudure à l'électrode",
    "Soudure de l'aluminium",
    "Métallerie",
    "Plafonds lumineux en toile tendue",
  ],
  en: [
    "TIG welding",
    "MIG/MAG welding",
    "Stick welding",
    "Aluminium welding",
    "Metalwork",
    "Backlit stretch-fabric ceilings",
  ],
};

/**
 * Son parcours en une phrase. L'employeur australien n'est jamais nommé
 * (Quentin, 07/10/2026) ; la durée, deux ans, est la sienne.
 */
const PARCOURS_QUENTIN: Record<Locale, string> = {
  fr: "Soudeur-métallier, titulaire du CAP Métallier et du BP Métallier. Deux ans en Australie chez un fabricant de plafonds lumineux en toile tendue, puis l'atelier Auboiacier, à Saumur.",
  en: "Welder-metalworker, holder of the French CAP Métallier and BP Métallier diplomas. Two years in Australia with a maker of backlit stretch-fabric ceilings, then the Auboiacier workshop in Saumur, France.",
};

/**
 * Quentin Aumercier, celui qui fabrique : publié sur /a-propos, cité par
 * l'atelier (founder) et par les guides qu'il a relus (jsonLdArticle), par
 * son identifiant. Le jour de l'immatriculation (qualité d'artisan), le
 * titre deviendra « Artisan métallier » — pas avant (loi 96-603, art. 21).
 *
 * `image` : la vraie photo de Quentin au travail, passée par la page À propos
 * (tests/visuels.test.ts n'autorise cette photo que sur quatre pages), puis
 * son portrait au retour.
 */
export function jsonLdPersonne(locale: Locale, { image }: { image?: string } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": ID_QUENTIN,
    name: FONDATEUR,
    givenName: "Quentin",
    familyName: "Aumercier",
    jobTitle: locale === "fr" ? "Soudeur-métallier" : "Welder-metalworker",
    description: PARCOURS_QUENTIN[locale],
    worksFor: { "@id": ID_ATELIER, name: ATELIER.nom },
    url: `${SITE_URL}/${locale}/a-propos`,
    ...(image ? { image: absolu(image) } : {}),
    hasCredential: DIPLOMES.map((diplome) => ({
      "@type": "EducationalOccupationalCredential",
      name: diplome.nom,
      credentialCategory: diplome.categorie[locale],
    })),
    knowsAbout: SAVOIR_FAIRE_QUENTIN[locale],
    knowsLanguage: ["fr", "en"],
  };
}

/* ------------------------------------------------------------------ *
 *  Guides (Article) et services (Service)
 * ------------------------------------------------------------------ */

/** Une date au format AAAA-MM-JJ (avec l'heure, si on veut). */
const DATE_ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Un guide (normes du garde-corps, vérification, escalier) : Google sait qui
 * l'a écrit et quand. `auteur` : « quentin » SEULEMENT si Quentin a lu et
 * validé le texte — une signature d'auteur est une affirmation ; sinon c'est
 * l'atelier, comme la signature visible de la page. Les deux dates sont des
 * constantes réelles de la page, les mêmes que celles qu'elle affiche.
 */
export function jsonLdArticle({
  locale,
  chemin,
  titre,
  description,
  datePublication,
  dateModification,
  image = IMAGE_PARTAGE,
  auteur = "atelier",
}: {
  locale: Locale;
  chemin: string;
  /** Le H1 de la page. */
  titre: string;
  description: string;
  /** AAAA-MM-JJ */
  datePublication: string;
  /** AAAA-MM-JJ, jamais avant la publication. */
  dateModification: string;
  image?: string;
  auteur?: "atelier" | "quentin";
}) {
  for (const date of [datePublication, dateModification]) {
    if (!DATE_ISO.test(date)) throw new Error(`jsonLdArticle (${chemin}) : date « ${date} » à écrire AAAA-MM-JJ`);
  }
  if (dateModification < datePublication) {
    throw new Error(`jsonLdArticle (${chemin}) : modifié le ${dateModification}, avant sa publication le ${datePublication}`);
  }
  const url = `${SITE_URL}/${locale}${chemin}`;
  const atelier = { "@type": "Organization", "@id": ID_ATELIER, name: ATELIER.nom, url: `${SITE_URL}/${locale}` };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: titre,
    description,
    author:
      auteur === "quentin"
        ? { "@type": "Person", "@id": ID_QUENTIN, name: FONDATEUR, url: `${SITE_URL}/${locale}/a-propos` }
        : atelier,
    publisher: { ...atelier, logo: { "@type": "ImageObject", url: absolu(LOGO) } },
    datePublished: datePublication,
    dateModified: dateModification,
    inLanguage: locale,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: [absolu(image)],
  };
}

/** L'offre de la prise de cotes à domicile : son prix et son rayon, ceux de src/lib/deplacement.ts. */
export const OFFRE_PRISE_DE_COTES = { prix: PRIX_OFFRE_CENTS / 100, rayonKm: RAYON_OFFRE_KM } as const;

/**
 * Un service de l'atelier, pour une page qui le présente : verrière d'atelier
 * (sur devis), sculpture sur commande, prise de cotes à domicile
 * (offre = OFFRE_PRISE_DE_COTES). Sans `offre`, aucun prix n'est annoncé :
 * jamais un chiffre écrit à la main.
 */
export function jsonLdService({
  locale,
  nom,
  type,
  chemin,
  description,
  offre,
}: {
  locale: Locale;
  nom: string;
  /** La catégorie du service (serviceType), si elle dit autre chose que le nom. */
  type?: string;
  chemin: string;
  description?: string;
  /** Un prix ferme, valable dans un rayon autour de l'atelier. */
  offre?: { prix: number; rayonKm: number };
}) {
  const url = `${SITE_URL}/${locale}${chemin}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: nom,
    ...(type ? { serviceType: type } : {}),
    ...(description ? { description } : {}),
    provider: { "@id": ID_ATELIER, name: ATELIER.nom },
    areaServed: cercleAutourAtelier(RAYON_MAX_KM),
    url,
    ...(offre
      ? {
          offers: {
            "@type": "Offer",
            price: offre.prix,
            priceCurrency: "EUR",
            eligibleRegion: cercleAutourAtelier(offre.rayonKm),
            url,
          },
        }
      : {}),
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
