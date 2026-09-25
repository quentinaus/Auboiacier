"use client";

import { useState } from "react";

/** Se déconnecter : on efface le témoin, puis on recharge la page. */
export function CompteDeconnexion({ libelle }: { libelle: string }) {
  const [enCours, setEnCours] = useState(false);
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={async () => {
        setEnCours(true);
        await fetch("/api/compte/deconnexion", { method: "POST" }).catch(() => {});
        // Rechargement complet, et non un router.refresh() : la page suivante
        // doit être rendue par le serveur SANS le témoin, pas rejouée avec un
        // cache client qui connaît encore les commandes.
        window.location.href = window.location.pathname;
      }}
      className="text-sm text-[#5c5140] underline underline-offset-4 disabled:opacity-60"
    >
      {libelle}
    </button>
  );
}
