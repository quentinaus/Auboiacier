"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChoixCreneau } from "@/components/choix-creneau";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";
import { EMAIL_MOTIF, MAX_TEXTE, TELEPHONE_MOTIF, fichiersTropLourds } from "@/lib/devis-regles";
import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * Un champ sans cadre : un simple trait dessous, qui noircit au focus (l'ombre
 * ajoute le second pixel sans faire bouger la ligne). Même gris de repos que
 * les champs des fiches produit, lisible à 3:1 sur blanc.
 */
const FIELD =
  "mt-1 w-full rounded-none border-0 border-b border-[#9a8d80] bg-transparent px-0 py-3 text-base text-[#2b2320] transition-[border-color,box-shadow] placeholder:text-[#726757] focus:border-[#2b2320] focus:shadow-[0_1px_0_0_#2b2320] focus:outline-none sm:text-[15px]";
const LABEL = "block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f6357]";
/** Le type de projet : une rangée de pastilles, comme les options d'une fiche. */
const PILL =
  "cursor-pointer rounded-full border border-[#e5ddd3] px-4 py-2 text-sm text-[#2b2320] transition-colors hover:border-[#9a8d80] has-checked:border-[#2b2320] has-checked:bg-[#2b2320] has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#2b2320]";

type Status =
  | "idle"
  | "sending"
  | "sent"
  | "error"
  | "not_configured"
  | "too_big"
  | "too_many"
  | "bad_file"
  | "invalid"
  | "no_slot";

export function DevisForm({
  t,
  email,
  locale,
  prefill = "",
  redirectTo,
  creneau,
}: {
  t: Dictionary["contact"]["form"];
  email: string;
  /** La langue part avec la demande : l'accusé de réception s'écrit dedans. */
  locale: "fr" | "en";
  /** Message pré-rempli, quand on arrive depuis « Demander un devis ». */
  prefill?: string;
  /**
   * Une page de confirmation à part, plutôt que le message en place : c'est
   * elle que Google Ads compte comme une demande aboutie.
   */
  redirectTo?: string;
  /**
   * Un calendrier dans le formulaire : le client choisit une demi-journée
   * parmi celles de l'agenda, et elle part avec la demande. Il faut les
   * textes de l'artisanat, où vivent ceux du calendrier.
   */
  creneau?: { t: Dictionary["artisanat"]; label: string; manque: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [creneauCle, setCreneauCle] = useState("");
  const creneauChoisi = lireCreneau(creneauCle);
  const [draft, setDraft] = useState({ name: "", phone: "", message: "" });
  /** Les fichiers choisis, nommés sous la zone : le champ natif est caché. */
  const [fichiers, setFichiers] = useState<File[]>([]);
  /** Trop de fichiers ou trop lourds : dit tout de suite, sous le champ, avant l'envoi. */
  const fichiersRefuses = fichiersTropLourds(fichiers);
  const idFichiersAide = useId();
  const idProjet = useId();
  /**
   * Piège temporel : l'instant où le formulaire est apparu. La durée part avec
   * la demande ; un envoi en moins de trois secondes n'est pas celui d'une
   * personne. Mesuré ici, dans le navigateur, pour ne pas dépendre de l'heure
   * de la machine du visiteur — un décalage d'horloge aurait rejeté des humains.
   */
  const ouvertA = useRef<number | null>(null);
  useEffect(() => {
    ouvertA.current = Date.now();
  }, []);
  /** Le message de fin : on y amène le focus, sinon on repart en haut de page
      sans savoir si la demande est partie. */
  const confirmationRef = useRef<HTMLDivElement>(null);

  // À l'envoi, le formulaire (haut) laisse place à la confirmation (basse) :
  // sans précaution, la page se rétracte d'un coup et le regard est perdu.
  // On garde la hauteur du formulaire, on amène doucement la confirmation à
  // l'écran, puis on lui donne le focus sans provoquer un second saut.
  const [hauteurForm, setHauteurForm] = useState<number>();
  useEffect(() => {
    if (status !== "sent") return;
    const el = confirmationRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (fichiersRefuses) {
      setStatus("too_big");
      return;
    }
    if (creneau && !creneauChoisi) {
      setStatus("no_slot");
      return;
    }
    setStatus("sending");

    try {
      const donnees = new FormData(form);
      donnees.append("locale", locale);
      donnees.append("dureeMs", String(ouvertA.current ? Date.now() - ouvertA.current : 0));
      const response = await fetch("/api/devis", {
        method: "POST",
        body: donnees,
      });

      if (response.ok) {
        setHauteurForm(form.offsetHeight);
        form.reset();
        setFichiers([]);
        setStatus("sent");
        if (redirectTo) router.push(redirectTo);
        return;
      }

      // L'hébergeur refuse lui-même un envoi trop lourd (413) ou trop fréquent
      // (429) avec une page HTML, sans JSON : on lit d'abord le code, sinon le
      // visiteur avait « erreur » au lieu de « fichiers trop lourds ».
      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 413 || error === "too_big") setStatus("too_big");
      else if (response.status === 429 || error === "too_many") setStatus("too_many");
      else if (error === "not_configured") setStatus("not_configured");
      else if (error === "bad_file") setStatus("bad_file");
      else if (error === "invalid") setStatus("invalid");
      else setStatus("error"); // dont « origin » (403), qui ne devrait jamais arriver depuis le site
      setDraft({
        name: String(new FormData(form).get("name") ?? ""),
        phone: String(new FormData(form).get("phone") ?? ""),
        message: String(new FormData(form).get("message") ?? ""),
      });
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        ref={confirmationRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center border-y border-[#e5ddd3] py-16 text-center outline-none"
        style={hauteurForm ? { minHeight: Math.min(hauteurForm, 480) } : undefined}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 text-[#2b2320]" fill="none" stroke="currentColor" strokeWidth="1.25">
          <circle cx="12" cy="12" r="11" />
          <path d="M7 12.5l3.2 3.2L17 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="mt-5 max-w-md leading-relaxed text-[#2b2320]">{t.success}</p>
      </div>
    );
  }

  const problem =
    status === "not_configured"
      ? t.notConfigured
      : status === "too_big"
        ? t.tooBig
        : status === "too_many"
          ? t.tooMany
          : status === "bad_file"
            ? t.badFile
          : status === "invalid"
            ? t.required
            : status === "no_slot"
              ? t.slotRequired
            : status === "error"
              ? t.error
              : null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>{t.name}</span>
          <input
            name="name"
            required
            maxLength={MAX_TEXTE.name}
            autoComplete="name"
            placeholder={t.namePh}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>{t.email}</span>
          <input
            name="email"
            type="email"
            required
            maxLength={MAX_TEXTE.email}
            pattern={EMAIL_MOTIF}
            title={t.emailHint}
            autoComplete="email"
            placeholder={t.emailPh}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>{t.phone}</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={MAX_TEXTE.phone}
            pattern={TELEPHONE_MOTIF}
            title={t.phoneHint}
            autoComplete="tel"
            placeholder={t.phonePh}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>{t.city}</span>
          <input
            name="city"
            required
            maxLength={MAX_TEXTE.city}
            autoComplete="address-level2"
            placeholder={t.cityPh}
            className={FIELD}
          />
        </label>
      </div>

      {/* Le type de projet : des pastilles plutôt qu'une liste déroulante, on
          voit d'un coup d'œil ce que l'atelier fait. Un seul choix, le premier
          coché d'avance. */}
      <fieldset className="mt-9">
        <legend id={idProjet} className={LABEL}>
          {t.project}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {t.projects.map((option, i) => (
            <label key={option} className={PILL}>
              <input type="radio" name="project" value={option} defaultChecked={i === 0} className="sr-only" />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      {creneau && (
        <div className="mt-9">
          <span className={LABEL}>{creneau.label}</span>
          <div className="mt-3">
            <ChoixCreneau valeur={creneauCle} onChange={setCreneauCle} t={creneau.t} locale={locale} texteManque={creneau.manque} />
          </div>
          <input type="hidden" name="creneau" value={creneauChoisi ? libelleCreneau(creneauChoisi, locale) : ""} />
        </div>
      )}

      <label className="mt-9 block">
        <span className={LABEL}>{t.message}</span>
        <textarea
          name="message"
          required
          maxLength={MAX_TEXTE.message}
          rows={5}
          defaultValue={prefill}
          placeholder={t.messagePh}
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </label>

      {/* Les pièces jointes : une zone à cliquer, le champ natif reste caché
          mais focusable au clavier, et les fichiers choisis sont nommés dessous. */}
      <div className="mt-9">
        <span className={LABEL}>{t.files}</span>
        <label
          className={`mt-3 flex cursor-pointer items-center justify-between gap-4 border border-dashed px-5 py-4 transition-colors hover:border-[#2b2320] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#2b2320] ${
            fichiersRefuses ? "border-[#b4533a]" : "border-[#9a8d80]"
          }`}
        >
          <span className="text-sm text-[#2b2320]">{t.filesCta}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[#2b2320]" fill="none" stroke="currentColor" strokeWidth="1.25">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
          <input
            name="files"
            type="file"
            multiple
            accept="image/jpeg,image/png,application/pdf"
            aria-describedby={idFichiersAide}
            aria-invalid={fichiersRefuses || undefined}
            onChange={(e) => setFichiers(Array.from(e.target.files ?? []))}
            className="sr-only"
          />
        </label>
        {fichiers.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-[#2b2320]">
            {fichiers.map((f) => (
              <li key={`${f.name}-${f.size}`} className="truncate">
                {f.name}
              </li>
            ))}
          </ul>
        )}
        <span id={idFichiersAide} className="mt-2 block text-xs text-[#6f6357]">
          {t.filesHint}
        </span>
        {fichiersRefuses && (
          <p role="alert" className="mt-1 text-xs text-[#b4533a]">
            {t.tooBig}
          </p>
        )}
      </div>

      {/* Champ piège anti-robots : invisible pour un visiteur. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {problem && (
        <div role="alert" className="mt-8 border-l-2 border-[#2b2320] pl-4 text-sm leading-relaxed text-[#2b2320]">
          <p>
            {problem}{" "}
            <a href={`mailto:${email}`} className="underline underline-offset-4">
              {email}
            </a>
          </p>
          {(status === "error" || status === "not_configured") && (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(t.mailSubject)}&body=${encodeURIComponent(
                [
                  draft.name && `${t.mailName} : ${draft.name}`,
                  draft.phone && `${t.mailPhone} : ${draft.phone}`,
                  "",
                  draft.message,
                ]
                  .filter(Boolean)
                  .join("\n")
              )}`}
              className="mt-3 inline-block rounded-full border border-[#2b2320] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors hover:bg-[#2b2320] hover:text-white"
            >
              {t.sendFailedCta}
            </a>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        aria-busy={status === "sending"}
        className="mt-10 w-full rounded-full bg-[#2b2320] px-8 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-black disabled:opacity-60"
      >
        {status === "sending" ? t.sending : t.submit}
      </button>

      {/* L'information exigée au moment de la collecte (art. 13 RGPD) : une
          phrase, et le lien vers la politique qui détaille le reste. */}
      <p className="mt-4 text-center text-xs leading-relaxed text-[#6f6357]">
        {t.privacy}{" "}
        <Link href={`/${locale}/confidentialite`} className="underline underline-offset-4 hover:text-black">
          {t.privacyLink}
        </Link>
      </p>
    </form>
  );
}
