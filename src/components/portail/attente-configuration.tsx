"use client";

/**
 * Le script de l'arrivée sur une fiche de portail (voir src/lib/portails-attente.ts), posé juste avant la fiche.
 * Écrit comme le recommande la documentation de Next (« Preventing Flash »), pour un composant client : le serveur écrit un
 * vrai script, que le navigateur exécute pendant la lecture de la page (arrivée sur la page, rechargement) ; côté navigateur
 * (navigation d'une page à l'autre du site) le type est « text/plain », React n'écrit alors pas de script exécutable, et la
 * fiche applique l'adresse elle-même avant le premier affichage (useLayoutEffect de portail-configurateur.tsx).
 */
import { scriptAttente } from "@/lib/portails-attente";

export function AttenteConfiguration() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: scriptAttente() }}
    />
  );
}
