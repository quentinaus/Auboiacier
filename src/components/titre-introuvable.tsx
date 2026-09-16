"use client";

import { useEffect } from "react";

/**
 * Remet le titre de l'onglet sur la page introuvable.
 *
 * Le HTML envoyé par le serveur porte bien le titre de not-found.tsx, mais
 * une fois la page prise en main par le navigateur, Next 16 le remplace par
 * le titre par défaut du layout (celui de l'accueil) : l'onglet d'une adresse
 * inconnue affichait « Mobilier acier-bois & plafonds lumineux… ». Ce
 * composant le repose après coup, dans la langue du visiteur.
 */
export function TitreIntrouvable({ titre }: { titre: string }) {
  useEffect(() => {
    document.title = titre;
  }, [titre]);
  return null;
}
