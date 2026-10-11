"use client";

import { useEffect } from "react";
import { retenirProvenance } from "@/lib/provenance-visite";

/**
 * Lit, une fois, l'adresse de la page d'arrivée (utm_source, utm_medium,
 * utm_campaign, gclid) et garde la provenance en mémoire pour la visite
 * (src/lib/provenance-visite.ts). N'affiche rien, n'écrit rien sur
 * l'appareil, n'envoie rien : la provenance ne part qu'avec un formulaire
 * que le visiteur envoie lui-même.
 */
export function RetenirProvenance() {
  useEffect(() => {
    retenirProvenance(window.location.search);
  }, []);
  return null;
}
