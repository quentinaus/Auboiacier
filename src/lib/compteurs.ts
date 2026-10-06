/**
 * Les compteurs du site : combien de prix calculés, de devis PDF,
 * d'inscriptions « me prévenir », de demandes et de commandes. De quoi
 * décider (quelle pièce intéresse, quelle publication amène des clients),
 * sans rien savoir de personne.
 *
 * Un compteur, c'est un NOM (« devis_pdf ») et au plus deux étiquettes prises
 * dans des listes fermées (la famille de la pièce, la réponse à « Comment
 * nous avez-vous connu ? », le canal du lien d'arrivée). Jamais un nom, une
 * adresse, un e-mail, une adresse IP, une cote, un prix ni un identifiant :
 * une étiquette inconnue devient « autre », une étiquette en trop est jetée.
 *
 * Il part à deux endroits, depuis le serveur :
 * 1. une ligne dans les journaux de Vercel, « COMPTEUR {…} » : visible tout
 *    de suite (Vercel > Logs), mais gardée peu de temps (1 heure en Hobby,
 *    1 jour en Pro) ;
 * 2. un « événement personnalisé » de Vercel Web Analytics, gardé 12 mois et
 *    additionné tout seul (Vercel > Analytics > Events). Vercel ne les
 *    accepte qu'avec l'offre Pro — celle qu'exige de toute façon un site qui
 *    vend (l'offre Hobby est réservée à un usage non commercial). En Hobby,
 *    ils sont simplement ignorés.
 *    Sauf `commande_payee` : il est compté au passage du webhook de Stripe,
 *    une requête de Stripe et non du client — Vercel le prendrait pour un
 *    robot et le jetterait. Il reste dans les journaux seulement ; Stripe
 *    (Paiements) est de toute façon la référence des commandes.
 * Comment Quentin lit les chiffres : MISE-EN-LIGNE.md, « Lire les compteurs ».
 *
 * Pourquoi pas la fonction track() de @vercel/analytics/server : elle
 * recopie vers Vercel l'adresse IP, les cookies (dont celui de l'espace
 * client) et le navigateur complet du visiteur, et peut y joindre l'adresse
 * de la requête — celle du devis PDF porte le nom et l'e-mail du client. On
 * envoie ici le même message qu'elle, réduit au nom du compteur et à ses
 * étiquettes : ni adresse IP, ni cookie, ni adresse de page.
 *
 * Le navigateur : Vercel lit l'en-tête user-agent pour écarter les robots et
 * classer les visites par navigateur ; sans lui, il verrait le serveur
 * lui-même (« node ») et pourrait jeter l'événement. On ne lui transmet que
 * la FAMILLE du navigateur — Chrome, Safari, Firefox, Edge ou autre —, sous
 * la forme d'un user-agent générique, le même pour tous les visiteurs de
 * cette famille (familleNavigateur) : ni version, ni système, ni appareil,
 * rien qui distingue un visiteur d'un autre. C'est ce qu'annonce la
 * politique de confidentialité (article 8). Un robot reconnu (Googlebot,
 * curl, navigateur sans écran…) n'est pas envoyé du tout : seule la ligne du
 * journal le compte.
 *
 * Seul le site en production compte : les essais sur les adresses de
 * prévisualisation ne faussent pas les chiffres.
 *
 * Les tests (node --test) chargent ce fichier tel quel : extensions écrites.
 */
import type { Famille } from "./products.ts";
import { CANAUX, SOURCES_CONNU, canalProvenance, type Provenance, type SourceConnu } from "./provenance.ts";
import { SITE_URL } from "./seo.ts";

/** Les familles de pièces, telles que le catalogue les nomme (un test vérifie qu'il n'en manque aucune). */
export const FAMILLES = [
  "table-interieur",
  "table-exterieur",
  "chaise",
  "chaise-exterieur",
  "escalier",
  "garde-corps",
  "plafond",
] as const satisfies readonly Famille[];

/** Chaque étiquette et ses seules valeurs possibles. */
const VALEURS = {
  famille: [...FAMILLES, "autre"],
  resultat: ["prix", "a-etudier"],
  connu: [...SOURCES_CONNU.map((s) => s.id), "sans-reponse"],
  canal: [...CANAUX],
} as const;

type Etiquette = keyof typeof VALEURS;

/** Les compteurs, et les étiquettes que chacun peut porter (deux au plus : la limite de Vercel en Pro). */
export const COMPTEURS = {
  /**
   * Un prix de garde-corps calculé pour des cotes (les autres pièces se chiffrent dans le navigateur).
   * Un nombre de calculs, pas de visiteurs : chaque cote ou option changée en relance un.
   */
  prix_calcule: ["famille", "resultat"],
  /** Un devis PDF fabriqué. */
  devis_pdf: ["famille"],
  /** Une demande de devis envoyée (page Contact). */
  demande_devis: ["connu", "canal"],
  /** Une demande de rendez-vous envoyée (page Rendez-vous). */
  demande_rendez_vous: ["connu", "canal"],
  /** Une inscription « me prévenir à l'ouverture ». */
  inscription_prevenir: ["connu", "canal"],
  /** Un client parti payer chez Stripe (il peut encore renoncer). */
  depart_paiement: ["connu", "canal"],
  /** Une commande payée (compté une fois, au premier passage du webhook) — dans les journaux seulement. */
  commande_payee: ["connu", "canal"],
} as const satisfies Record<string, readonly Etiquette[]>;

export type Compteur = keyof typeof COMPTEURS;

/**
 * Les compteurs qui ne partent pas chez Vercel : leur requête ne vient pas
 * d'un visiteur (le webhook de Stripe). Vercel les filtrerait comme robots ;
 * la ligne « COMPTEUR » des journaux suffit, Stripe fait foi.
 */
export const JOURNAL_SEULEMENT: readonly Compteur[] = ["commande_payee"];

/** Les familles de navigateur transmises à Vercel, et rien de plus fin. */
export type FamilleNavigateur = "chrome" | "safari" | "firefox" | "edge" | "autre";

/**
 * L'user-agent générique envoyé à Vercel pour chaque famille : assez pour que
 * Vercel y lise le nom du navigateur et n'y voie pas un robot, sans vraie
 * version (0.0), sans système, sans appareil. Le même pour tous les visiteurs
 * d'une famille. Des formes plus courtes (« Mozilla/5.0 Chrome ») passent
 * pour des robots auprès des filtres courants (liste isbot, vérifiée le
 * 06/10/2026) : d'où ces chaînes complètes.
 */
export const USER_AGENT_FAMILLE: Record<FamilleNavigateur, string> = {
  chrome: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/0.0.0.0 Safari/537.36",
  safari: "Mozilla/5.0 AppleWebKit/605.1.15 (KHTML, like Gecko) Version/0.0 Safari/605.1.15",
  firefox: "Mozilla/5.0 Gecko/20100101 Firefox/0.0",
  edge: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/0.0.0.0 Safari/537.36 Edg/0.0.0.0",
  autre: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko)",
};

/** Les robots et outils les plus courants : leur passage n'est pas un visiteur. */
const ROBOT = /(?<!cu)bots?\b|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget|python|node|axios|go-http|java\/|okhttp|stripe/i;

/**
 * La famille du navigateur d'après son user-agent, ou null pour un robot (ou
 * une requête sans user-agent) : rien n'est alors envoyé à Vercel. L'ordre
 * compte : Edge et Chrome sur iPhone se disent aussi « Safari », Edge se dit
 * aussi « Chrome ».
 */
export function familleNavigateur(userAgent: string): FamilleNavigateur | null {
  const ua = userAgent.trim();
  if (!ua || ROBOT.test(ua)) return null;
  if (/\bEdg(e|A|iOS)?\//.test(ua)) return "edge";
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return "firefox";
  if (/\bChrome\/|\bCriOS\/|\bChromium\//.test(ua)) return "chrome";
  if (/\bSafari\//.test(ua) && /\bVersion\//.test(ua)) return "safari";
  return "autre";
}

export type Etiquettes = Partial<Record<Etiquette, string>>;

/** Les deux étiquettes d'origine d'une demande ou d'une commande. */
export function etiquettesOrigine(connu: SourceConnu | null, provenance: Provenance | null): Etiquettes {
  return { connu: connu ?? "sans-reponse", canal: canalProvenance(provenance) };
}

/** Les seules étiquettes permises pour ce compteur, chacune ramenée à sa liste (« autre » sinon). */
export function etiquettesPropres(compteur: Compteur, etiquettes: Etiquettes = {}): Record<string, string> {
  const propres: Record<string, string> = {};
  for (const cle of COMPTEURS[compteur] as readonly Etiquette[]) {
    const valeur = etiquettes[cle];
    if (valeur === undefined) continue;
    const permises = VALEURS[cle] as readonly string[];
    propres[cle] = permises.includes(valeur) ? valeur : "autre";
  }
  return propres;
}

/** La ligne écrite dans les journaux : « COMPTEUR {"compteur":"devis_pdf","famille":"plafond"} ». */
export function ligneCompteur(compteur: Compteur, etiquettes: Etiquettes = {}): string {
  return `COMPTEUR ${JSON.stringify({ compteur, ...etiquettesPropres(compteur, etiquettes) })}`;
}

/**
 * Compte un événement. Ne lève jamais, ne fait jamais attendre le client :
 * les routes l'appellent dans after() (next/server), une fois la réponse
 * partie.
 */
export async function compter(compteur: Compteur, etiquettes: Etiquettes = {}, request?: Request): Promise<void> {
  try {
    console.log(ligneCompteur(compteur, etiquettes));
    if (JOURNAL_SEULEMENT.includes(compteur)) return;
    // Un robot (ou une requête sans navigateur) : la ligne du journal, rien de plus.
    const famille = familleNavigateur(request?.headers.get("user-agent") ?? "");
    if (famille === null) return;
    await envoyerAVercel(compteur, etiquettesPropres(compteur, etiquettes), famille);
  } catch (erreur) {
    // Un compteur raté ne doit jamais rien casser : on le signale, c'est tout.
    console.error("[compteurs] envoi impossible :", compteur, erreur instanceof Error ? erreur.message : erreur);
  }
}

/**
 * L'événement personnalisé de Vercel Web Analytics : le message qu'envoie
 * track() (@vercel/analytics 2.0.1, src/server), sans l'adresse IP, sans
 * cookie, sans l'adresse de la requête, et avec la seule famille du
 * navigateur. Adressé au domaine du site (que la protection des déploiements
 * ne bloque pas), en production seulement.
 */
async function envoyerAVercel(compteur: Compteur, etiquettes: Record<string, string>, famille: FamilleNavigateur) {
  if (process.env.VERCEL_ENV !== "production") return;
  const reponse = await fetch(`${SITE_URL}/_vercel/insights/event`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-va-server": "1",
      "user-agent": USER_AGENT_FAMILLE[famille],
    },
    body: JSON.stringify({
      o: `${SITE_URL}/`,
      ts: Date.now(),
      sdkn: "@vercel/analytics/server",
      sdkv: "2.0.1",
      r: "",
      en: compteur,
      ed: etiquettes,
    }),
    // Deux secondes au plus : un compteur ne retient pas la fonction.
    signal: AbortSignal.timeout(2000),
  });
  // La réponse ne nous apprend rien : on la libère sans la lire.
  await reponse.body?.cancel();
}
