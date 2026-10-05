"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { TextesOuverture } from "@/lib/ouverture";
import { EMAIL_VALIDE } from "@/lib/devis-regles";

type Etat = "idle" | "loading" | "ok" | "invalide" | "too_many" | "erreur";

/**
 * « Me prévenir à l'ouverture » : avant l'ouverture des commandes, le client
 * laisse son e-mail, l'atelier le reçoit avec la configuration (/api/prevenir),
 * et les premiers inscrits passent en priorité dans le planning. Le même
 * formulaire dans le panier et sur la fiche produit.
 */
export function InscriptionOuverture({
  t,
  locale,
  contactEmail,
  lignes,
  emailInitial = "",
  autoFocus = false,
}: {
  t: TextesOuverture;
  locale: "fr" | "en";
  contactEmail: string;
  /** Le panier, une ligne par pièce, tel que l'atelier le lira. */
  lignes: string[];
  /** L'adresse déjà donnée ailleurs (devis PDF) : rien à retaper. */
  emailInitial?: string;
  autoFocus?: boolean;
}) {
  const [email, setEmail] = useState(emailInitial);
  const [etat, setEtat] = useState<Etat>("idle");
  /** Champ piège : invisible pour un humain, rempli par les robots. */
  const [piege, setPiege] = useState("");
  /** Depuis quand le formulaire est affiché : un robot poste en moins d'une seconde. */
  const [ouvertDepuis] = useState(() => Date.now());
  const idEmail = useId();
  const idMessage = useId();

  async function envoyer() {
    const adresse = email.trim();
    if (!EMAIL_VALIDE.test(adresse)) {
      setEtat("invalide");
      return;
    }
    setEtat("loading");
    try {
      const response = await fetch("/api/prevenir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adresse,
          locale,
          website: piege,
          dureeMs: Date.now() - ouvertDepuis,
          panier: lignes,
        }),
      });
      if (response.ok) {
        setEtat("ok");
        return;
      }
      setEtat(response.status === 429 ? "too_many" : response.status === 400 ? "invalide" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <>
      {etat === "ok" ? (
        <p role="status" className="mt-4 text-sm font-medium text-[#2b2320]">
          {t.prevenirOk}
        </p>
      ) : (
        <form
          className="mt-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            envoyer();
          }}
        >
          <label htmlFor={idEmail} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f6357]">
            {t.prevenirEmail}
          </label>
          <input
            id={idEmail}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (etat === "invalide") setEtat("idle");
            }}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={autoFocus}
            maxLength={254}
            placeholder={t.prevenirEmailPh}
            aria-invalid={etat === "invalide"}
            aria-describedby={etat === "invalide" || etat === "erreur" || etat === "too_many" ? idMessage : undefined}
            className="mt-2 w-full rounded-full border border-[#9a8d80] bg-white px-4 py-2.5 text-sm text-[#2b2320] transition-colors placeholder:text-[#726757] focus:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320]"
          />
          {/* Le piège à robots : hors de l'écran, sauté au clavier. */}
          <input
            type="text"
            name="website"
            value={piege}
            onChange={(event) => setPiege(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px opacity-0"
          />
          {etat === "invalide" && (
            <p id={idMessage} role="alert" className="mt-2 text-sm text-[#2b2320]">
              {t.prevenirInvalide}
            </p>
          )}
          {(etat === "erreur" || etat === "too_many") && (
            <p id={idMessage} role="alert" className="mt-2 text-sm leading-relaxed text-[#2b2320]">
              {etat === "too_many" ? t.tooMany : t.prevenirErreur}{" "}
              <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">
                {t.writeUs}
              </a>
            </p>
          )}
          <button
            type="submit"
            disabled={etat === "loading"}
            className="btn-verre mt-4 w-full rounded-full px-8 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
          >
            {etat === "loading" ? t.prevenirEnvoi : t.prevenirBouton}
          </button>
        </form>
      )}
      <p className="mt-3 text-xs leading-relaxed text-[#6f6357]">
        {t.prevenirNote}{" "}
        <Link href={`/${locale}/confidentialite`} className="underline underline-offset-4 hover:text-black">
          {t.privacyLink}
        </Link>
      </p>
    </>
  );
}
