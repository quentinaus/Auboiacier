"use client";

import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";

/**
 * Panier côté navigateur.
 *
 * Le panier vit dans localStorage, en dehors de React : on s'y abonne avec
 * useSyncExternalStore, ce qui évite tout décalage entre le HTML rendu par le
 * serveur (panier vide) et l'affichage réel, et fonctionne entre onglets.
 *
 * On n'y stocke que la sélection (produit + options). Le prix mémorisé n'est
 * qu'une copie d'affichage : la page panier le recalcule depuis le catalogue et
 * /api/commande le recalcule côté serveur avant tout paiement.
 */
export type CartItem = {
  /** Identifiant de ligne, dérivé des options : deux fois la même config = une seule ligne. */
  id: string;
  slug: string;
  sizeId?: string;
  woodId?: string;
  metalId?: string;
  fabricId?: string;
  /** Le remplissage d'un garde-corps (croix, verre). */
  remplissageId?: string;
  /** Cotes en millimètres pour une pièce fabriquée sur mesure. */
  largeurMm?: number;
  hauteurMm?: number;
  epaisseurMm?: number;
  /**
   * Une ligne « prise de cotes à domicile » (slug PRISE_DE_COTES) : le code
   * postal du client décide du prix, le créneau vient de l'agenda. Les deux
   * sont recalculés et revérifiés par le serveur avant d'encaisser.
   */
  priseDeCotesCp?: string;
  /** Le créneau choisi : « 2026-09-23|matin ». */
  rdv?: string;
  /** Ce que le client précise (type de mur, pièce voulue…), transmis tel quel à l'atelier. */
  note?: string;
  quantity: number;
  /** Copie d'affichage, jamais contractuelle. Ne jamais l'envoyer à une API. */
  name: string;
  optionsLabel: string;
  unitPrice: number;
  image?: string;
};

export type CartLine = Omit<CartItem, "id" | "quantity">;

const STORAGE_KEY = "auboiacier-panier-v1";
/** Mêmes bornes que /api/commande : au-delà, le serveur refuserait la commande. */
const MAX_QUANTITY = 10;
const MAX_LINES = 20;

function lineId(line: CartLine) {
  return [
    line.slug,
    line.sizeId,
    line.woodId,
    line.metalId,
    line.fabricId,
    line.remplissageId,
    line.largeurMm,
    line.hauteurMm,
    line.epaisseurMm,
    line.priseDeCotesCp,
    line.rdv,
    line.note,
  ]
    .map((part) => part ?? "-")
    .join("|");
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.id === "string" &&
        typeof item.slug === "string" &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

/* ---- Le magasin, hors de React ---- */

const EMPTY: CartItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;
const listeners = new Set<() => void>();

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Navigation privée ou stockage bloqué.
    return null;
  }
}

/** Renvoie toujours la MÊME référence tant que le contenu n'a pas changé. */
function getSnapshot(): CartItem[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }
  return cachedItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Un autre onglet a modifié le panier : on se resynchronise.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(items: CartItem[]) {
  const raw = JSON.stringify(items);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Le panier reste au moins valable pour cette page.
  }
  cachedRaw = raw;
  cachedItems = items;
  listeners.forEach((listener) => listener());
}

/* ---- L'accès depuis React ---- */

/**
 * Conservé pour envelopper l'application : le panier n'a pas besoin de contexte,
 * mais ce point de montage reste pratique si un jour il en faut un.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // false pendant le rendu serveur et l'hydratation, true ensuite : évite
  // d'afficher « panier vide » ou un compteur avant d'avoir lu le stockage.
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const add = useCallback((line: CartLine, quantity = 1) => {
    const id = lineId(line);
    const current = getSnapshot();
    const existing = current.find((item) => item.id === id);

    if (existing) {
      write(
        current.map((item) =>
          item.id === id
            ? { ...item, ...line, quantity: Math.min(MAX_QUANTITY, item.quantity + quantity) }
            : item
        )
      );
      return;
    }
    if (current.length >= MAX_LINES) return;
    write([
      ...current,
      { ...line, id, quantity: Math.max(1, Math.min(MAX_QUANTITY, quantity)) },
    ]);
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    const current = getSnapshot();
    write(
      quantity <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity: Math.min(MAX_QUANTITY, quantity) } : item
          )
    );
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return { items, count, total, ready, add, setQuantity, remove, clear };
  }, [items, ready, add, setQuantity, remove, clear]);
}
