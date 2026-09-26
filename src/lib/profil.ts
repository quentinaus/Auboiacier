// Chemins relatifs, pas l'alias « @/ » : les tests (node --test) chargent ce
// fichier directement, sans le compilateur de Next.

/**
 * Les coordonnées d'un client : ce qu'il peut relire et corriger lui-même
 * dans son espace.
 *
 * AUCUNE BASE DE DONNÉES, ici non plus (voir compte-jetons.ts). Ces champs
 * sont ceux de la fiche client de Stripe — `name`, `phone`, `address` — et
 * c'est là qu'ils restent. Trois raisons, et la troisième est la vraie :
 *
 * 1. Stripe les connaît déjà : il les a recueillis au premier paiement.
 * 2. La caisse les repropose d'elle-même à la commande suivante.
 * 3. La politique de confidentialité du site dit déjà que les coordonnées
 *    sont chez Stripe. Les recopier ailleurs, ce serait un second fichier
 *    clients à déclarer, à sauvegarder, et à effacer sur demande.
 *
 * L'adresse e-mail ne figure pas ici : elle n'est pas une coordonnée mais
 * l'identité du compte. La changer reviendrait à changer de compte — et à
 * perdre ses commandes, qui se retrouvent par elle (commandes-client.ts).
 */

/** Une adresse postale française, telle qu'on l'écrit sur une étiquette. */
export type Adresse = {
  ligne1: string;
  ligne2: string;
  codePostal: string;
  ville: string;
};

export type Profil = {
  /** Prénom et nom, en un seul champ : Stripe n'en a qu'un, et personne ne s'en plaint. */
  nom: string;
  telephone: string;
  adresse: Adresse;
};

export const PROFIL_VIDE: Profil = {
  nom: "",
  telephone: "",
  adresse: { ligne1: "", ligne2: "", codePostal: "", ville: "" },
};

/**
 * Les longueurs maximales. Elles ne protègent pas d'une faute de frappe mais
 * d'un envoi truqué : sans elles, un formulaire bricolé pourrait pousser cent
 * kilo-octets dans une fiche Stripe.
 */
const MAX = {
  nom: 80,
  telephone: 24,
  ligne1: 100,
  ligne2: 100,
  codePostal: 16,
  ville: 60,
} as const;

function texte(valeur: unknown, maximum: number): string {
  if (typeof valeur !== "string") return "";
  // Les espaces insécables et les tabulations comptent comme des espaces :
  // un nom collé depuis un e-mail en traîne souvent.
  return valeur.replace(/\s+/g, " ").trim().slice(0, maximum);
}

/**
 * Le profil tel qu'on accepte de l'enregistrer. Ne rejette jamais : un champ
 * incompréhensible devient vide. Quelqu'un qui corrige son adresse ne doit
 * pas se heurter à un refus pour un caractère de trop — on coupe, et on lui
 * réaffiche ce qui a été gardé.
 */
export function normaliserProfil(valeur: unknown): Profil {
  if (!valeur || typeof valeur !== "object") return PROFIL_VIDE;
  const o = valeur as Record<string, unknown>;
  const a = (o.adresse ?? {}) as Record<string, unknown>;
  return {
    nom: texte(o.nom, MAX.nom),
    telephone: texte(o.telephone, MAX.telephone),
    adresse: {
      ligne1: texte(a.ligne1, MAX.ligne1),
      ligne2: texte(a.ligne2, MAX.ligne2),
      // Le code postal se range sans espaces : « 49 400 » et « 49400 » sont
      // le même, et c'est lui qui sert à calculer la livraison.
      codePostal: texte(a.codePostal, MAX.codePostal).replace(/\s+/g, ""),
      ville: texte(a.ville, MAX.ville),
    },
  };
}

/** Y a-t-il quelque chose à afficher ? Un profil vide se présente autrement. */
export function profilRempli(profil: Profil): boolean {
  const { nom, telephone, adresse } = profil;
  return Boolean(
    nom || telephone || adresse.ligne1 || adresse.ligne2 || adresse.codePostal || adresse.ville
  );
}

/** L'adresse sur une ligne, comme sur une étiquette : « 12 rue des Forges, 49400 Saumur ». */
export function adresseSurUneLigne(adresse: Adresse): string {
  return [
    adresse.ligne1,
    adresse.ligne2,
    [adresse.codePostal, adresse.ville].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Un code postal français, ou null. Cinq chiffres, et le premier n'est pas
 * un zéro seul — c'est la même règle que celle du calcul de livraison, pour
 * qu'une adresse enregistrée ici serve vraiment à la caisse.
 */
export function codePostalFrancais(valeur: string): string | null {
  const propre = valeur.replace(/\s+/g, "");
  return /^[0-9]{5}$/.test(propre) ? propre : null;
}

/**
 * Un téléphone plausible, ou null. On reste large à dessein : les clients
 * écrivent « 06 12 34 56 78 », « +33 6 12 34 56 78 », « 0033612345678 ».
 * Refuser l'une de ces formes ferait perdre un numéro utile à l'atelier le
 * jour de la livraison.
 */
export function telephonePlausible(valeur: string): string | null {
  const chiffres = valeur.replace(/[^0-9+]/g, "");
  return chiffres.length >= 9 && chiffres.length <= 20 ? valeur.trim() : null;
}
