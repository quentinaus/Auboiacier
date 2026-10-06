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
 * Comment Quentin lit les chiffres : MISE-EN-LIGNE.md, « Lire les compteurs ».
 *
 * Pourquoi pas la fonction track() de @vercel/analytics/server : elle
 * recopie vers Vercel l'adresse IP et les cookies du visiteur (dont celui de
 * son espace client), et peut y joindre l'adresse de la requête — celle du
 * devis PDF porte le nom et l'e-mail du client. On envoie ici le même message
 * qu'elle, réduit au nom du compteur, à ses étiquettes et au type de
 * navigateur (que Vercel reçoit déjà avec chaque page vue) : ni adresse IP,
 * ni cookie, ni adresse de page. Seul le site en production compte : les essais sur les
 * adresses de prévisualisation ne faussent pas les chiffres.
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
  /** Un prix de garde-corps calculé pour des cotes (les autres pièces se chiffrent dans le navigateur). */
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
  /** Une commande payée (compté une fois, au premier passage du webhook). */
  commande_payee: ["connu", "canal"],
} as const satisfies Record<string, readonly Etiquette[]>;

export type Compteur = keyof typeof COMPTEURS;
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
    await envoyerAVercel(compteur, etiquettesPropres(compteur, etiquettes), request?.headers.get("user-agent") ?? "");
  } catch (erreur) {
    // Un compteur raté ne doit jamais rien casser : on le signale, c'est tout.
    console.error("[compteurs] envoi impossible :", compteur, erreur instanceof Error ? erreur.message : erreur);
  }
}

/**
 * L'événement personnalisé de Vercel Web Analytics : le message qu'envoie
 * track() (@vercel/analytics 2.0.1, src/server), sans l'adresse IP, sans
 * cookie et sans l'adresse de la requête. Adressé au domaine du site (que la
 * protection des déploiements ne bloque pas), en production seulement.
 */
async function envoyerAVercel(compteur: Compteur, etiquettes: Record<string, string>, navigateur: string) {
  if (process.env.VERCEL_ENV !== "production") return;
  const reponse = await fetch(`${SITE_URL}/_vercel/insights/event`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-va-server": "1",
      ...(navigateur ? { "user-agent": navigateur.slice(0, 300) } : {}),
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
