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

/**
 * Un budget de TEMPS DE CALCUL, par adresse et au total : le calcul d'un garde-corps coûte de 0,1 s (relevé déjà vu) à plus de
 * 3 s (grande fenêtre jamais vue), sur le seul fil du serveur. Compter les requêtes ne suffit donc pas : 120 requêtes de 3 s
 * font 6 minutes de calcul. Chaque porte qui calcule mesure son temps (`depenser`) et refuse (`epuise`) quand l'adresse — ou
 * l'instance entière — a déjà pris son budget sur la fenêtre. Un client normal (quelques dizaines de relevés) n'y touche pas.
 */
export function creerBudget({
  fenetreMs,
  budgetMs,
  budgetGlobalMs,
  tailleMax = 5000,
}: {
  fenetreMs: number;
  budgetMs: number;
  budgetGlobalMs: number;
  tailleMax?: number;
}) {
  const depenses = new Map<string, { heure: number; ms: number }[]>();
  let globales: { heure: number; ms: number }[] = [];
  const recents = (liste: { heure: number; ms: number }[], maintenant: number) => liste.filter((d) => maintenant - d.heure < fenetreMs);
  const somme = (liste: { ms: number }[]) => liste.reduce((t, d) => t + d.ms, 0);

  return {
    /** Vrai quand l'adresse (ou l'instance) a épuisé son temps de calcul : la porte répond 429. */
    epuise(request: Request, maintenant: number): boolean {
      globales = recents(globales, maintenant);
      if (somme(globales) > budgetGlobalMs) return true;
      return somme(recents(depenses.get(adresseAppelante(request)) ?? [], maintenant)) > budgetMs;
    },
    /** À appeler une fois le calcul fait, avec sa durée (performance.now() avant/après). */
    depenser(request: Request, ms: number, maintenant: number): void {
      if (!(ms > 0)) return;
      const ip = adresseAppelante(request);
      depenses.set(ip, [...recents(depenses.get(ip) ?? [], maintenant), { heure: maintenant, ms }]);
      globales.push({ heure: maintenant, ms });
      if (depenses.size > tailleMax) {
        for (const [cle, liste] of depenses) {
          if (recents(liste, maintenant).length === 0) depenses.delete(cle);
        }
      }
    },
  };
}
