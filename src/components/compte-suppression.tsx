"use client";

import { useState } from "react";

type Textes = {
  titre: string;
  explication: string;
  bouton: string;
  confirmer: string;
  annuler: string;
  enCours: string;
  erreur: string;
};

/**
 * « Supprimer mon espace », en deux temps : un premier clic montre ce qui
 * sera effacé et ce qui restera, le second supprime. Ensuite, retour à
 * l'accueil, déconnecté.
 */
export function CompteSuppression({ t, locale }: { t: Textes; locale: "fr" | "en" }) {
  const [etape, setEtape] = useState<"repos" | "confirmer" | "envoi" | "erreur">("repos");

  async function supprimer() {
    setEtape("envoi");
    try {
      const reponse = await fetch("/api/compte/suppression", { method: "POST" });
      if (reponse.ok) {
        // Rechargement complet (comme à la déconnexion) : la page suivante doit
        // être rendue par le serveur sans le témoin, pas rejouée depuis un cache
        // client qui connaît encore l'espace. replace : pas de retour arrière
        // vers un espace qui n'existe plus.
        window.location.replace(`/${locale}`);
        return;
      }
    } catch {
      // Le message d'erreur ci-dessous suffit.
    }
    setEtape("erreur");
  }

  return (
    <section className="mt-12 border-t border-[#e8e1d8] pt-8">
      <h2 className="text-base font-medium text-[#2b2320]">{t.titre}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.explication}</p>
      {etape === "repos" ? (
        <button
          type="button"
          onClick={() => setEtape("confirmer")}
          className="mt-4 text-sm text-[#6d2c2c] underline underline-offset-4"
        >
          {t.bouton}
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={supprimer}
            disabled={etape === "envoi"}
            className="rounded-full border border-[#6d2c2c] px-5 py-2.5 text-sm text-[#6d2c2c] transition-colors hover:bg-[#6d2c2c] hover:text-white disabled:opacity-60"
          >
            {etape === "envoi" ? t.enCours : t.confirmer}
          </button>
          <button
            type="button"
            onClick={() => setEtape("repos")}
            disabled={etape === "envoi"}
            className="text-sm text-[#5c5140] underline underline-offset-4"
          >
            {t.annuler}
          </button>
        </div>
      )}
      {etape === "erreur" && (
        <p role="alert" className="mt-3 text-sm text-[#6d2c2c]">
          {t.erreur}
        </p>
      )}
    </section>
  );
}
