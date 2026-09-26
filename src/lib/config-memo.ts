// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.

/**
 * La configuration en cours, mise de côté le temps d'un aller-retour.
 *
 * Quand le client part créer son compte depuis le configurateur, il quitte le
 * site : il va chez Google, puis revient. Sans mémoire, il retrouverait un
 * formulaire vide et devrait tout resaisir — ses cotes, son essence, sa
 * teinte. Autant dire qu'il n'y reviendrait pas.
 *
 * On écrit donc la configuration dans le stockage de SESSION du navigateur,
 * et on la relit au retour. Session, et non local : c'est un aller-retour, pas
 * une préférence. L'onglet fermé, la mémoire s'efface toute seule.
 *
 * Rien de personnel n'y entre — ni nom, ni adresse e-mail. Uniquement des
 * identifiants d'options et des cotes, exactement ce qui figure déjà dans
 * l'adresse du devis PDF. La politique de confidentialité n'a donc rien de
 * nouveau à déclarer.
 */

export const CLE_CONFIG = "auboiacier-config-v1";

/** Ce qu'on remet en place au retour. Tout est facultatif : une version plus ancienne du site a pu écrire moins de champs. */
export type ConfigMemo = {
  /** La pièce concernée : on ne restaure pas la configuration d'une table sur une lampe. */
  slug: string;
  unite?: "mm" | "cm" | "m";
  largeur?: string;
  hauteur?: string;
  epaisseur?: string;
  hauteurTable?: string;
  sizeId?: string;
  woodId?: string;
  metalId?: string;
  fabricId?: string;
  remplissageId?: string;
  quantity?: number;
  codePostal?: string;
  poseVoulue?: boolean;
};

function texte(valeur: unknown): string | undefined {
  return typeof valeur === "string" && valeur.length <= 40 ? valeur : undefined;
}

/**
 * Met la configuration de côté. Ne lève jamais : le stockage de session peut
 * être refusé (navigation privée, réglage du navigateur), et une mémoire qui
 * échoue ne doit pas empêcher d'aller créer son compte.
 */
export function memoriserConfig(config: ConfigMemo): void {
  try {
    sessionStorage.setItem(CLE_CONFIG, JSON.stringify(config));
  } catch {
    // Tant pis : le client resaisira ses cotes.
  }
}

/**
 * Relit la configuration mise de côté, et l'efface. On ne la restaure qu'UNE
 * fois : sans cela, un client qui revient sur la fiche trois jours plus tard
 * verrait ressurgir des cotes qu'il avait oubliées.
 *
 * Rend null si rien n'attend, si la mémoire est illisible, ou si elle
 * concerne une autre pièce.
 */
export function reprendreConfig(slug: string): ConfigMemo | null {
  let brut: string | null = null;
  try {
    brut = sessionStorage.getItem(CLE_CONFIG);
    if (brut !== null) sessionStorage.removeItem(CLE_CONFIG);
  } catch {
    return null;
  }
  if (!brut) return null;

  let lu: unknown;
  try {
    lu = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!lu || typeof lu !== "object") return null;
  const o = lu as Record<string, unknown>;
  if (o.slug !== slug) return null;

  const unite = texte(o.unite);
  const quantity = Number(o.quantity);
  return {
    slug,
    unite: unite === "mm" || unite === "cm" || unite === "m" ? unite : undefined,
    largeur: texte(o.largeur),
    hauteur: texte(o.hauteur),
    epaisseur: texte(o.epaisseur),
    hauteurTable: texte(o.hauteurTable),
    sizeId: texte(o.sizeId),
    woodId: texte(o.woodId),
    metalId: texte(o.metalId),
    fabricId: texte(o.fabricId),
    remplissageId: texte(o.remplissageId),
    quantity: Number.isInteger(quantity) && quantity >= 1 && quantity <= 99 ? quantity : undefined,
    codePostal: texte(o.codePostal),
    poseVoulue: typeof o.poseVoulue === "boolean" ? o.poseVoulue : undefined,
  };
}
