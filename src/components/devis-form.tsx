"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChoixCreneau } from "@/components/choix-creneau";
import { libelleCreneau, lireCreneau } from "@/lib/creneau";
import { EMAIL_MOTIF, MAX_TEXTE, TELEPHONE_MOTIF, fichiersTropLourds } from "@/lib/devis-regles";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const ACCENT = "#2b2320";
const FIELD =
  "mt-2 w-full rounded-lg border border-[#9a8d80] bg-white px-4 py-3 text-base text-[#2b2320] transition-colors placeholder:text-[#726757] focus:border-[#2b2320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b2320] sm:text-sm";
const LABEL = "block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f6357]";

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
  /** Trop de fichiers ou trop lourds : dit tout de suite, sous le champ, avant l'envoi. */
  const [fichiersRefuses, setFichiersRefuses] = useState(false);
  const idFichiersAide = useId();
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
        className="flex items-center justify-center rounded-2xl border border-[#e8e1d8] bg-white p-8 text-center outline-none"
        style={hauteurForm ? { minHeight: Math.min(hauteurForm, 480) } : undefined}
      >
        <p className="max-w-md leading-relaxed text-[#2b2320]">{t.success}</p>
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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#e8e1d8] bg-white p-6 md:p-8">
      <p className="text-sm leading-relaxed text-[#5c5140]">{t.intro}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label>
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
        <label>
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
        <label>
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
        <label>
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
        <label>
          <span className={LABEL}>{t.project}</span>
          <select name="project" defaultValue={t.projects[0]} className={FIELD}>
            {t.projects.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {creneau && (
        <div className="mt-5">
          <span className={LABEL}>{creneau.label}</span>
          <div className="mt-2">
            <ChoixCreneau valeur={creneauCle} onChange={setCreneauCle} t={creneau.t} locale={locale} texteManque={creneau.manque} />
          </div>
          <input type="hidden" name="creneau" value={creneauChoisi ? libelleCreneau(creneauChoisi, locale) : ""} />
        </div>
      )}

      <label className="mt-5 block">
        <span className={LABEL}>{t.message}</span>
        <textarea
          name="message"
          required
          maxLength={MAX_TEXTE.message}
          rows={5}
          defaultValue={prefill}
          placeholder={t.messagePh}
          className={FIELD}
        />
      </label>

      <label className="mt-5 block">
        <span className={LABEL}>{t.files}</span>
        <input
          name="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,application/pdf"
          aria-describedby={idFichiersAide}
          aria-invalid={fichiersRefuses || undefined}
          onChange={(e) => setFichiersRefuses(fichiersTropLourds(Array.from(e.target.files ?? [])))}
          className="mt-2 w-full text-sm text-[#5c5140] file:mr-4 file:rounded-full file:border-0 file:bg-[#f1ece4] file:px-4 file:py-2 file:text-sm file:text-[#5c5140] hover:file:bg-[#e8e1d8]"
        />
        <span id={idFichiersAide} className="mt-1 block text-xs text-[#6f6357]">
          {t.filesHint}
        </span>
        {fichiersRefuses && (
          <p role="alert" className="mt-1 text-xs text-[#2b2320]">
            {t.tooBig}
          </p>
        )}
      </label>

      {/* Champ piège anti-robots : invisible pour un visiteur. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {problem && (
        <div role="alert" className="mt-6 text-sm leading-relaxed text-[#2b2320]">
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
        className="mt-6 w-full rounded-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-10"
        style={{ backgroundColor: ACCENT }}
      >
        {status === "sending" ? t.sending : t.submit}
      </button>

      {/* L'information exigée au moment de la collecte (art. 13 RGPD) : une
          phrase, et le lien vers la politique qui détaille le reste. */}
      <p className="mt-4 text-xs leading-relaxed text-[#6f6357]">
        {t.privacy}{" "}
        <Link href={`/${locale}/confidentialite`} className="underline underline-offset-4 hover:text-black">
          {t.privacyLink}
        </Link>
      </p>
    </form>
  );
}
