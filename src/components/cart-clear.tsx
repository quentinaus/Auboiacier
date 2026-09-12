"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/**
 * Vide le panier. Monté uniquement sur la page de remerciement, et seulement
 * quand le serveur a confirmé que le paiement est encaissé : un paiement
 * abandonné ou refusé laisse ainsi le panier intact.
 */
export function CartClear() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
