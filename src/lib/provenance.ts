/**
 * D'où vient un client : sa réponse à « Comment nous avez-vous connu ? » et,
 * s'il est arrivé par un lien marqué (une annonce Google, un lien posté sur
 * Instagram…), le nom de la campagne lu dans l'adresse de la page d'arrivée.
 *
 * Les deux voyagent avec les demandes (devis, rendez-vous, « me prévenir »)
 * et avec la commande (métadonnées Stripe, bon de commande de l'atelier) :
 * c'est ce qui permet à Quentin de savoir quelles publications et quelles
 * annonces amènent vraiment des clients.
 *
 * Une seule liste, ici, pour le navigateur ET le serveur : le menu affiche
 * ces choix, le serveur n'accepte qu'eux et écrit leur nom français dans
 * l'e-mail de l'atelier. Un choix inconnu est ignoré, jamais recopié.
 *
 * RGPD et CNIL :
 * - la question est facultative (aucune réponse : « sans réponse ») ;
 * - la provenance est lue dans l'adresse, jamais écrite sur l'appareil du
 *   visiteur (ni cookie, ni stockage : voir src/lib/provenance-visite.ts) ;
 * - de l'annonce Google, on ne garde que le FAIT que le lien en venait :
 *   l'identifiant de clic (gclid) lui-même n'est ni recopié ni transmis ;
 * - les valeurs des paramètres sont nettoyées : une adresse e-mail ou un
 *   long numéro (téléphone, identifiant) collé dans un lien est écarté.
 *
 * Aucun import : le formulaire du navigateur, les routes du serveur et les
 * tests (node --test) chargent ce fichier tel quel.
 */

type Langue = "fr" | "en";

/* ------------------------------------------------------------------ *
 *  « Comment nous avez-vous connu ? »
 * ------------------------------------------------------------------ */

/** Les réponses proposées, dans l'ordre du menu. */
export const SOURCES_CONNU = [
  { id: "google", fr: "Google", en: "Google" },
  { id: "fiche-google", fr: "Fiche Google / Maps", en: "Google Maps listing" },
  { id: "instagram", fr: "Instagram", en: "Instagram" },
  { id: "facebook", fr: "Facebook", en: "Facebook" },
  { id: "bouche-a-oreille", fr: "Bouche-à-oreille", en: "Word of mouth" },
  { id: "presse", fr: "Presse", en: "Press" },
  { id: "autre", fr: "Autre", en: "Other" },
] as const;

export type SourceConnu = (typeof SOURCES_CONNU)[number]["id"];

/** La question et la ligne vide du menu, dans les deux langues. */
export const TEXTES_CONNU: Record<Langue, { question: string; aucune: string }> = {
  fr: { question: "Comment nous avez-vous connu ?", aucune: "Choisir (facultatif)" },
  en: { question: "How did you hear about us?", aucune: "Choose (optional)" },
};

/** La réponse envoyée par le navigateur, si elle est l'une des nôtres ; sinon rien. */
export function lireConnu(valeur: unknown): SourceConnu | null {
  return SOURCES_CONNU.find((source) => source.id === valeur)?.id ?? null;
}

/** Le nom d'une réponse, tel qu'on l'affiche (le français pour l'atelier). */
export function libelleConnu(id: SourceConnu, langue: Langue = "fr"): string {
  return SOURCES_CONNU.find((source) => source.id === id)?.[langue] ?? id;
}

/* ------------------------------------------------------------------ *
 *  Liens marqués : utm_source, utm_medium, utm_campaign, gclid
 * ------------------------------------------------------------------ */

/** Ce qu'on garde d'un lien marqué. Tout est facultatif. */
export type Provenance = {
  /** utm_source : qui envoie (« instagram », « google », « flyer »…). */
  source?: string;
  /** utm_medium : par quel moyen (« social », « cpc », « e-mail »…). */
  support?: string;
  /** utm_campaign : le nom de la campagne (« garde-corps-printemps »…). */
  campagne?: string;
  /** Le lien venait d'une annonce Google (gclid, gbraid ou wbraid présent). */
  annonceGoogle?: boolean;
};

/** Longueur maximale d'une valeur : un nom de campagne, pas un texte. */
const MAX_VALEUR = 60;

/**
 * Une valeur de paramètre, nettoyée : en minuscules, lettres non accentuées,
 * chiffres, point, tiret, souligné et plus ; 60 signes. Rien du tout si elle
 * ressemble à une donnée personnelle — une adresse e-mail (un « @ ») ou un
 * long numéro (neuf chiffres ou plus, séparateurs compris : un téléphone,
 * un identifiant ; une date « 2026-12-07 » passe).
 */
export function valeurPropre(valeur: unknown): string | undefined {
  if (typeof valeur !== "string") return undefined;
  const brute = valeur.normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  if (!brute || brute.includes("@") || /\d{9,}/.test(brute.replace(/[\s.()-]/g, ""))) return undefined;
  const propre = brute
    .replace(/[^a-z0-9._+-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, MAX_VALEUR)
    .replace(/[-.]+$/, "");
  return propre || undefined;
}

/** Les seuls champs remplis ; une provenance sans aucun champ ne sert à rien : elle vaut « rien ». */
function ouRien(p: Provenance): Provenance | null {
  const remplie = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Provenance;
  return Object.keys(remplie).length ? remplie : null;
}

/**
 * La provenance lue dans l'adresse de la page d'arrivée
 * (« ?utm_source=instagram&utm_campaign=printemps », « ?gclid=… »), ou rien
 * si le lien n'était pas marqué.
 */
export function lireProvenance(parametres: URLSearchParams): Provenance | null {
  const annonce = ["gclid", "gbraid", "wbraid"].some((cle) => (parametres.get(cle) ?? "").trim() !== "");
  return ouRien({
    source: valeurPropre(parametres.get("utm_source")),
    support: valeurPropre(parametres.get("utm_medium")),
    campagne: valeurPropre(parametres.get("utm_campaign")),
    ...(annonce ? { annonceGoogle: true } : {}),
  });
}

/**
 * La provenance renvoyée par le navigateur avec un formulaire, revérifiée
 * par le serveur : il ne croit rien de ce qui arrive, il renettoie tout.
 */
export function nettoyerProvenance(valeur: unknown): Provenance | null {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return null;
  const v = valeur as Record<string, unknown>;
  return ouRien({
    source: valeurPropre(v.source),
    support: valeurPropre(v.support),
    campagne: valeurPropre(v.campagne),
    ...(v.annonceGoogle === true ? { annonceGoogle: true } : {}),
  });
}

/* ------------------------------------------------------------------ *
 *  Le canal : une étiquette courte, prise dans une liste fermée
 *  C'est elle, et non la valeur brute du lien, qui part dans les compteurs :
 *  un lien forgé ne peut pas y faire entrer un mot de son choix.
 * ------------------------------------------------------------------ */

export const CANAUX = [
  "google-ads",
  "google",
  "instagram",
  "facebook",
  "pinterest",
  "youtube",
  "tiktok",
  "linkedin",
  "e-mail",
  "qr-code",
  "presse",
  "autre-lien",
  "aucun",
] as const;

export type Canal = (typeof CANAUX)[number];

/** Les supports qui veulent dire « publicité payante ». */
const PAYANT = /^(cpc|ppc|paid|paid-search|paid-social|ads?|sea|display|pmax)$/;

/** Le canal d'une provenance : « google-ads », « instagram »… ou « aucun » sans lien marqué. */
export function canalProvenance(p: Provenance | null): Canal {
  if (!p) return "aucun";
  const source = p.source ?? "";
  if (p.annonceGoogle || (source.includes("google") && PAYANT.test(p.support ?? ""))) return "google-ads";
  const regles: [RegExp, Canal][] = [
    [/google/, "google"],
    [/instagram|^ig$/, "instagram"],
    [/facebook|^fb$|^meta$/, "facebook"],
    [/pinterest/, "pinterest"],
    [/youtube/, "youtube"],
    [/tiktok/, "tiktok"],
    [/linkedin/, "linkedin"],
    [/mail|newsletter/, "e-mail"],
    [/qr|flyer|carte|affiche/, "qr-code"],
    [/presse|press|journal|magazine/, "presse"],
  ];
  return regles.find(([motif]) => motif.test(source))?.[1] ?? "autre-lien";
}

/* ------------------------------------------------------------------ *
 *  Ce que lit l'atelier : e-mail et commande Stripe
 * ------------------------------------------------------------------ */

/** Les lignes à ajouter à l'e-mail de l'atelier (rien si le client n'a rien dit et sans lien marqué). */
export function lignesOrigine(connu: SourceConnu | null, provenance: Provenance | null): string[] {
  const lignes: string[] = [];
  if (connu) lignes.push(`Nous a connus par : ${libelleConnu(connu)}`);
  if (provenance) {
    const details = [
      provenance.source && `source ${provenance.source}`,
      provenance.support && `support ${provenance.support}`,
      provenance.campagne && `campagne ${provenance.campagne}`,
    ].filter(Boolean);
    if (provenance.annonceGoogle) lignes.push("Arrivé par une annonce Google");
    if (details.length) lignes.push(`Lien suivi : ${details.join(", ")}`);
  }
  return lignes;
}

/**
 * Les métadonnées Stripe de l'origine d'une commande. Des clés courtes et
 * stables : le webhook les relit (provenanceDesMetadonnees) pour le bon de
 * commande et les compteurs.
 */
export function metadonneesOrigine(connu: SourceConnu | null, provenance: Provenance | null): Record<string, string> {
  return {
    ...(connu ? { connu } : {}),
    ...(provenance?.source ? { utm_source: provenance.source } : {}),
    ...(provenance?.support ? { utm_medium: provenance.support } : {}),
    ...(provenance?.campagne ? { utm_campaign: provenance.campagne } : {}),
    ...(provenance?.annonceGoogle ? { annonce_google: "1" } : {}),
  };
}

/** L'origine d'une commande relue dans ses métadonnées Stripe (et revérifiée). */
export function origineDesMetadonnees(metadonnees: Record<string, string> | null | undefined): {
  connu: SourceConnu | null;
  provenance: Provenance | null;
} {
  const m = metadonnees ?? {};
  return {
    connu: lireConnu(m.connu),
    provenance: nettoyerProvenance({
      source: m.utm_source,
      support: m.utm_medium,
      campagne: m.utm_campaign,
      annonceGoogle: m.annonce_google === "1",
    }),
  };
}
