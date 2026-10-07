"use client";

/**
 * La photo du tableau (décision de Quentin, 07/10/2026 : « distance + photo », et « bouton photo sur le site ») : dehors,
 * de face, un mètre posé de l'angle du mur jusqu'à la fenêtre. Elle confirme la fixation dans le mur, surtout quand le
 * prix est indicatif (« Je ne sais pas »).
 *
 * Le site ne garde AUCUN fichier : la photo part par e-mail à l'atelier par la route des demandes (/api/devis, formulaire
 * « photo-tableau »), avec ses contrôles (origine, débit, champ piège, durée, format lu dans les premiers octets, poids).
 * Avec elle, le relevé du client en une ligne : l'atelier sait à quelle fenêtre elle se rapporte.
 */

import { useRef, useState } from "react";
import { EMAIL_MOTIF, MAX_TEXTE, fichiersTropLourds } from "@/lib/devis-regles";
import { reduirePhoto } from "@/lib/photos-client";
import { provenanceVisite } from "@/lib/provenance-visite";

type Etat = "pret" | "envoi" | "envoyee" | "trop_lourd" | "trop_vite" | "format" | "invalide" | "erreur";

export function PhotoTableau({
  locale,
  resume,
  codePostal,
  envoyee,
  onEnvoyee,
  grand = false,
}: {
  locale: "fr" | "en";
  /** Le relevé du client, en clair (largeurs, hauteur, mur, tableau) : il part dans le message. */
  resume: string;
  /** Le code postal déjà tapé pour la livraison, repris dans la case. */
  codePostal?: string;
  /** La photo est déjà partie. */
  envoyee: boolean;
  onEnvoyee: () => void;
  /** Sur téléphone, un bouton plus grand. */
  grand?: boolean;
}) {
  const fr = locale === "fr";
  const dialogue = useRef<HTMLDialogElement>(null);
  const ouvertA = useRef(0);
  const [etat, setEtat] = useState<Etat>("pret");
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  /** La photo choisie, et son aperçu (une adresse locale, libérée dès qu'elle ne sert plus). */
  const choisirPhoto = (f: File | null) => {
    setPhoto(f);
    setApercu((ancien) => {
      if (ancien) URL.revokeObjectURL(ancien);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  const ouvrir = () => {
    ouvertA.current = Date.now();
    setEtat(envoyee ? "envoyee" : "pret");
    dialogue.current?.showModal();
  };
  const fermer = () => dialogue.current?.close();

  async function envoyer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!photo) return;
    setEtat("envoi");
    try {
      const reduite = await reduirePhoto(photo);
      if (fichiersTropLourds([reduite])) {
        setEtat("trop_lourd");
        return;
      }
      const donnees = new FormData(form);
      donnees.delete("photo");
      donnees.append("files", reduite, reduite.name);
      donnees.append("message", resume);
      donnees.append("project", fr ? "Garde-corps de fenêtre : photo du tableau" : "Window railing: reveal photo");
      donnees.append("locale", locale);
      donnees.append("formulaire", "photo-tableau");
      donnees.append("dureeMs", String(ouvertA.current ? Date.now() - ouvertA.current : 0));
      const provenance = provenanceVisite();
      if (provenance?.source) donnees.append("utm_source", provenance.source);
      if (provenance?.support) donnees.append("utm_medium", provenance.support);
      if (provenance?.campagne) donnees.append("utm_campaign", provenance.campagne);
      if (provenance?.annonceGoogle) donnees.append("annonce_google", "1");
      const reponse = await fetch("/api/devis", { method: "POST", body: donnees });
      if (reponse.ok) {
        setEtat("envoyee");
        choisirPhoto(null);
        onEnvoyee();
        return;
      }
      const { error } = (await reponse.json().catch(() => ({}))) as { error?: string };
      if (reponse.status === 413 || error === "too_big") setEtat("trop_lourd");
      else if (reponse.status === 429 || error === "too_many") setEtat("trop_vite");
      else if (error === "bad_file") setEtat("format");
      else if (error === "invalid") setEtat("invalide");
      else setEtat("erreur");
    } catch {
      setEtat("erreur");
    }
  }

  const messages: Partial<Record<Etat, string>> = fr
    ? {
        trop_lourd: "Cette photo est trop lourde : essayez-en une autre.",
        trop_vite: "Trop d'envois d'un coup : réessayez dans quelques minutes.",
        format: "Ce fichier n'est pas une photo (JPG ou PNG).",
        invalide: "Vérifiez votre nom, votre e-mail et votre ville.",
        erreur: "L'envoi n'a pas abouti. Réessayez, ou écrivez-nous à auboiacier@gmail.com.",
      }
    : {
        trop_lourd: "This photo is too large: try another one.",
        trop_vite: "Too many sends at once: try again in a few minutes.",
        format: "This file is not a photo (JPG or PNG).",
        invalide: "Check your name, your e-mail and your town.",
        erreur: "Sending failed. Try again, or write to us at auboiacier@gmail.com.",
      };
  const champ =
    "h-10 w-full rounded-xl border border-[#9a8d80] bg-white px-3 text-[15px] text-[#2b2320] outline-none focus:border-[#2b2320] focus:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]";

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 font-medium transition-colors ${
          envoyee ? "border-[#2a6b3a]/40 text-[#2a6b3a]" : "border-[#2b2320]/25 text-[#2b2320] hover:bg-white/80"
        } ${grand ? "py-2.5 text-[14px]" : "py-1 text-[12px]"}`}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
          {envoyee ? <path d="M4 10.5l4 4 8-9" /> : <><path d="M3 7h3l1.5-2h5L14 7h3v9H3z" /><circle cx="10" cy="11.5" r="2.8" /></>}
        </svg>
        {envoyee ? (fr ? "Photo du tableau envoyée" : "Reveal photo sent") : fr ? "Envoyer la photo du tableau" : "Send a photo of the reveal"}
      </button>

      <dialog
        ref={dialogue}
        aria-labelledby="photo-tableau-titre"
        onClick={(e) => {
          // Un clic sur le voile, autour de la carte, ferme.
          if (e.target === dialogue.current) fermer();
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[22px] bg-[#fbf8f4] p-0 text-[#2b2320] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] backdrop:bg-black/40"
      >
        {etat === "envoyee" ? (
          <div className="p-6 text-center" role="status">
            <p className="text-[18px] font-semibold">{fr ? "Photo reçue, merci." : "Photo received, thank you."}</p>
            <p className="mt-2 text-[14px] leading-snug text-[#5c5140]">
              {fr
                ? "Nous la regardons avec vos mesures et nous vous écrivons si la fixation demande un changement."
                : "We look at it with your measurements and write to you if the fixing needs a change."}
            </p>
            <button type="button" onClick={fermer} className="btn-plein mt-5">
              {fr ? "Fermer" : "Close"}
            </button>
          </div>
        ) : (
          <form onSubmit={envoyer} className="p-6">
            <p id="photo-tableau-titre" className="text-[18px] font-semibold">
              {fr ? "La photo de votre tableau" : "A photo of your reveal"}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-snug text-[#5c5140]">
              {fr
                ? "Dehors, de face, avec un mètre posé de l'angle du mur jusqu'à la fenêtre. Elle nous sert à confirmer la fixation dans votre mur."
                : "Outside, straight on, with a tape measure laid from the corner of the wall to the window. We use it to confirm the fixing in your wall."}
            </p>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-[#9a8d80] bg-white px-3 py-4 text-center text-[14px] text-[#2b2320] hover:border-[#2b2320]">
              {apercu ? (
                // eslint-disable-next-line @next/next/no-img-element -- un aperçu local (blob:), jamais envoyé ailleurs
                <img src={apercu} alt={fr ? "Aperçu de votre photo" : "Preview of your photo"} className="max-h-40 w-auto rounded-lg object-contain" />
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-[#6f6357]" aria-hidden>
                  <path d="M3 7h3l1.5-2h5L14 7h3v9H3z" />
                  <circle cx="10" cy="11.5" r="2.8" />
                </svg>
              )}
              <span className="font-medium">{apercu ? (fr ? "Changer de photo" : "Change photo") : fr ? "Choisir ou prendre la photo" : "Choose or take the photo"}</span>
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png"
                required
                className="sr-only"
                onChange={(e) => {
                  choisirPhoto(e.target.files?.[0] ?? null);
                  setEtat("pret");
                }}
              />
            </label>

            <div className="mt-4 grid gap-2.5">
              <input name="name" required maxLength={MAX_TEXTE.name} autoComplete="name" placeholder={fr ? "Nom et prénom" : "Full name"} aria-label={fr ? "Nom et prénom" : "Full name"} className={champ} />
              <input name="email" type="email" required maxLength={MAX_TEXTE.email} pattern={EMAIL_MOTIF} autoComplete="email" placeholder={fr ? "E-mail" : "E-mail"} aria-label="E-mail" className={champ} />
              <input name="city" required maxLength={MAX_TEXTE.city} autoComplete="postal-code" defaultValue={codePostal ?? ""} placeholder={fr ? "Code postal ou ville" : "Postcode or town"} aria-label={fr ? "Code postal ou ville" : "Postcode or town"} className={champ} />
            </div>
            {/* Champ piège : invisible, seuls les robots le remplissent. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

            {messages[etat] && (
              <p role="alert" className="mt-3 text-[13px] font-medium leading-snug text-[#7a4510]">
                {messages[etat]}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={fermer} className="btn-contour">
                {fr ? "Annuler" : "Cancel"}
              </button>
              <button type="submit" disabled={!photo || etat === "envoi"} className="btn-plein disabled:opacity-50">
                {etat === "envoi" ? (fr ? "Envoi…" : "Sending…") : fr ? "Envoyer la photo" : "Send the photo"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
