/**
 * Le compteur de passages, partagé par les trois portes du site : le devis, le
 * départ en paiement et la page de remerciement.
 *
 * Il vit dans la mémoire d'une instance. Vercel peut en démarrer plusieurs en
 * parallèle, chacune avec son compteur : la limite réelle est donc plus haute
 * que celle annoncée. C'est un garde-fou, pas un rempart — un vrai plafond
 * demanderait un compteur partagé (Vercel KV, Upstash).
 */

/**
 * L'adresse de l'appelant, celle qu'il ne peut pas écrire lui-même.
 *
 * `x-forwarded-for` est une chaîne de relais : n'importe qui peut y ajouter
 * une fausse adresse EN TÊTE, et c'est justement la première qui était lue.
 * Il suffisait donc de changer d'adresse inventée à chaque requête pour
 * n'être jamais compté. La vraie adresse est celle que le dernier relais —
 * le nôtre — a réellement vue : la dernière de la liste.
 */
export function adresseAppelante(request: Request): string {
  const direct =
    request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
  if (direct && direct.trim()) return direct.trim();

  const chaine = request.headers.get("x-forwarded-for");
  if (!chaine) return "inconnue";
  const relais = chaine
    .split(",")
    .map((morceau) => morceau.trim())
    .filter(Boolean);
  return relais[relais.length - 1] ?? "inconnue";
}

/**
 * Fabrique un compteur : `maximum` passages par adresse et par `fenetreMs`.
 * Il rend `true` quand la limite est dépassée.
 */
export function creerLimite({
  fenetreMs,
  maximum,
  tailleMax = 5000,
}: {
  fenetreMs: number;
  maximum: number;
  tailleMax?: number;
}) {
  const passages = new Map<string, number[]>();

  return function tropDeDemandes(request: Request, maintenant: number): boolean {
    const ip = adresseAppelante(request);
    const recents = (passages.get(ip) ?? []).filter((heure) => maintenant - heure < fenetreMs);
    recents.push(maintenant);
    passages.set(ip, recents);

    // Ménage ciblé. L'ancienne version vidait la table entière dès 500
    // entrées : 501 requêtes depuis 501 adresses différentes remettaient le
    // compteur de TOUT LE MONDE à zéro, et il n'y avait plus qu'à recommencer.
    if (passages.size > tailleMax) {
      for (const [cle, heures] of passages) {
        if (heures.every((heure) => maintenant - heure >= fenetreMs)) passages.delete(cle);
      }
    }
    return recents.length > maximum;
  };
}
