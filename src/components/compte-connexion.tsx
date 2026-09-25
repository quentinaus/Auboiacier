"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * Se connecter, sans mot de passe.
 *
 * Google en premier et en grand, le lien par e-mail en secours — et c'est
 * volontaire. Un lien ouvert depuis l'application Mail d'un iPhone s'ouvre
 * dans une fenêtre qui ne partage pas ses témoins avec Safari : le client se
 * retrouve connecté dans sa boîte mail et déconnecté dans son navigateur.
 * Google, lui, passe par une redirection ordinaire et n'a pas ce défaut.
 */

type Textes = {
  google: string;
  ou: string;
  emailLabel: string;
  emailPlaceholder: string;
  envoyer: string;
  envoi: string;
  envoyeTitre: string;
  envoyeCorps: string;
  erreurEmail: string;
  erreurEnvoi: string;
};

export function CompteConnexion({
  t,
  locale,
  google,
  suite,
}: {
  t: Textes;
  locale: Locale;
  /** Faux quand la clé Google n'est pas configurée : on n'affiche pas un bouton mort. */
  google: boolean;
  /** Où revenir une fois connecté. */
  suite: string;
}) {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "envoye">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (etat === "envoi") return;
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim())) {
      setErreur(t.erreurEmail);
      return;
    }
    setErreur(null);
    setEtat("envoi");
    try {
      const reponse = await fetch("/api/compte/lien", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (!reponse.ok) throw new Error("refus");
      setEtat("envoye");
    } catch {
      setErreur(t.erreurEnvoi);
      setEtat("repos");
    }
  }

  if (etat === "envoye") {
    return (
      <div className="rounded-2xl border border-[#e8e1d8] bg-white p-6 text-center">
        <p className="text-base font-medium text-[#2b2320]">{t.envoyeTitre}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">{t.envoyeCorps}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[380px]">
      {google && (
        <>
          <a
            href={`/api/compte/google?suite=${encodeURIComponent(suite)}`}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#9a8d80] text-sm font-medium text-[#2b2320] transition-colors hover:bg-[#f7f4ef]"
          >
            {/* Le G de Google, aux couleurs officielles : une marque ne se
                redessine pas en gris pour faire joli. */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
              <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" />
              <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
            </svg>
            {t.google}
          </a>
          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#e8e1d8]" />
            <span className="text-xs uppercase tracking-widest text-[#726757]">{t.ou}</span>
            <span className="h-px flex-1 bg-[#e8e1d8]" />
          </div>
        </>
      )}

      <form onSubmit={envoyer} noValidate>
        <label htmlFor="compte-email" className="block text-sm text-[#5c5140]">
          {t.emailLabel}
        </label>
        <input
          id="compte-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErreur(null);
          }}
          placeholder={t.emailPlaceholder}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? "compte-erreur" : undefined}
          className="mt-2 h-12 w-full rounded-full border border-[#9a8d80] bg-white px-5 text-base text-[#2b2320] outline-none transition-[border-color,box-shadow] placeholder:text-[#726757] focus:border-[#2b2320] focus:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]"
        />
        <button
          type="submit"
          disabled={etat === "envoi"}
          className="btn-verre mt-4 h-12 w-full rounded-full text-[11px] font-medium uppercase tracking-[0.2em] text-white disabled:opacity-60"
        >
          {etat === "envoi" ? t.envoi : t.envoyer}
        </button>
      </form>

      <p id="compte-erreur" className="mt-3 min-h-5 text-sm text-[#6d2c2c]" aria-live="polite">
        {erreur}
      </p>
    </div>
  );
}
