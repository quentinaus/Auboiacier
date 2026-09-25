"use client";

import { useState } from "react";
import type { CommandeAtelier } from "@/lib/commandes-atelier";
import { STATUTS, libelleStatut, type Statut } from "@/lib/statut-commande";
import { prixAffiche } from "@/lib/ui";

/**
 * Une commande, et les quatre boutons qui disent où elle en est.
 *
 * Écrit pour un pouce, sur un téléphone, dans un atelier : les boutons font
 * toute la largeur et 48 points de haut, avec un intervalle qui empêche de
 * viser « Expédiée » et de toucher « Livrée ». L'état part chez Stripe au
 * clic — pas de bouton « enregistrer » à oublier — et l'écran le montre tout
 * de suite, quitte à revenir en arrière si Stripe refuse.
 */

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export function CarteCommande({ commande, cle }: { commande: CommandeAtelier; cle: string }) {
  const [statut, setStatut] = useState<Statut>(commande.statut);
  const [prevenir, setPrevenir] = useState(true);
  const [enCours, setEnCours] = useState<Statut | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function choisir(vise: Statut) {
    if (vise === statut || enCours) return;
    const avant = statut;
    setStatut(vise);
    setEnCours(vise);
    setMessage(null);
    try {
      const reponse = await fetch("/api/atelier/statut", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cle, paiementId: commande.paiementId, statut: vise, prevenir }),
      });
      const resultat = (await reponse.json().catch(() => null)) as
        | { ok?: boolean; prevenu?: boolean }
        | null;
      if (!reponse.ok || !resultat?.ok) throw new Error("refus");
      setMessage(
        prevenir
          ? resultat.prevenu
            ? "Enregistré, client prévenu."
            : "Enregistré — mais l'e-mail n'est pas parti."
          : "Enregistré."
      );
    } catch {
      // On remet ce que Stripe sait vraiment : un écran qui ment est pire
      // qu'un écran qui échoue.
      setStatut(avant);
      setMessage("Pas enregistré. Vérifiez la connexion et réessayez.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <li className="rounded-2xl border border-[#e8e1d8] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-base font-medium tabular-nums text-[#2b2320]">{commande.reference}</p>
        <p className="text-sm tabular-nums text-[#5c5140]">
          {prixAffiche(commande.montantCents / 100, "fr")}
        </p>
      </div>
      <p className="mt-1 text-xs text-[#726757]">
        {DATE.format(new Date(commande.creeLe * 1000))}
        {commande.pose ? " · pose à domicile" : ""}
      </p>

      <p className="mt-3 text-sm text-[#2b2320]">
        {commande.client.nom || "—"}
        {commande.ville ? ` · ${commande.ville}` : ""}
      </p>
      {commande.adresse && <p className="text-sm text-[#5c5140]">{commande.adresse}</p>}
      <p className="mt-1 text-sm">
        {commande.client.telephone && (
          <a href={`tel:${commande.client.telephone}`} className="text-[#5c5140] underline underline-offset-4">
            {commande.client.telephone}
          </a>
        )}
        {commande.client.telephone && commande.client.email && (
          <span className="text-[#726757]"> · </span>
        )}
        {commande.client.email && (
          <a href={`mailto:${commande.client.email}`} className="text-[#5c5140] underline underline-offset-4">
            {commande.client.email}
          </a>
        )}
      </p>

      {commande.pieces.length > 0 && (
        <ul className="mt-3 border-t border-[#e8e1d8] pt-3 text-sm text-[#5c5140]">
          {commande.pieces.map((piece, i) => (
            <li key={`${piece}-${i}`} className="py-0.5">
              {piece}
            </li>
          ))}
        </ul>
      )}

      {/* Les quatre états. Celui qui est en cours est plein, les autres en
          contour : on voit d'un coup d'œil où en est la commande. */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {STATUTS.map((s) => {
          const actif = s === statut;
          return (
            <button
              key={s}
              type="button"
              onClick={() => choisir(s)}
              disabled={enCours !== null}
              aria-pressed={actif}
              className={`min-h-12 flex-1 rounded-full px-4 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                actif
                  ? "bg-[#2b2320] text-white"
                  : "border border-[#9a8d80] text-[#2b2320] hover:bg-[#f7f4ef]"
              }`}
            >
              {libelleStatut(s, { pose: commande.pose })}
            </button>
          );
        })}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-[#5c5140]">
        <input
          type="checkbox"
          checked={prevenir}
          onChange={(e) => setPrevenir(e.target.checked)}
          className="h-4 w-4 accent-[#2b2320]"
        />
        Prévenir le client par e-mail
      </label>

      {/* aria-live : celui qui navigue au clavier ou à la voix entend le
          résultat, qui arrive une seconde après le clic. */}
      <p className="mt-2 min-h-5 text-xs text-[#726757]" aria-live="polite">
        {message}
      </p>
    </li>
  );
}
