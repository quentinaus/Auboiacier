/**
 * Une requête envoyée depuis un AUTRE site que le nôtre.
 *
 * Un formulaire multipart est une requête « simple » pour le navigateur : pas
 * de préflight CORS, donc n'importe quelle page tierce peut faire poster des
 * demandes de devis par le navigateur de ses visiteurs. L'en-tête Origin est
 * écrit par le navigateur et une page web ne peut pas le maquiller ;
 * Sec-Fetch-Site dit « cross-site » pour la même raison. On compare à l'hôte
 * réellement appelé (et non à NEXT_PUBLIC_SITE_URL) pour que les déploiements
 * de prévisualisation *.vercel.app et localhost marchent.
 *
 * Sans Origin (curl, script) on laisse passer : c'est le travail de la limite
 * de débit et du champ piège, pas celui-ci. À ne JAMAIS appliquer au webhook
 * Stripe, qui n'envoie pas d'Origin et se protège par sa signature.
 */
export function origineEtrangere(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const hote = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== hote;
  } catch {
    return true;
  }
}
