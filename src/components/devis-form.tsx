"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const ACCENT = "#6d2c2c";
const FIELD =
  "mt-2 w-full rounded-lg border border-[#e0d8cd] bg-white px-4 py-3 text-base text-[#2b2320] transition-colors placeholder:text-[#726757] focus:border-[#6d2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d2c2c] sm:text-sm";
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
  | "invalid";

export function DevisForm({
  t,
  email,
  locale,
  prefill = "",
  redirectTo,
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
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [draft, setDraft] = useState({ name: "", phone: "", message: "" });
  /** Le message de fin : on y amène le focus, sinon on repart en haut de page
      sans savoir si la demande est partie. */
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "sent") confirmationRef.current?.focus();
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");

    try {
      const donnees = new FormData(form);
      donnees.append("locale", locale);
      const response = await fetch("/api/devis", {
        method: "POST",
        body: donnees,
      });

      if (response.ok) {
        form.reset();
        setStatus("sent");
        if (redirectTo) router.push(redirectTo);
        return;
      }

      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      if (error === "not_configured") setStatus("not_configured");
      else if (error === "too_big") setStatus("too_big");
      else if (error === "too_many") setStatus("too_many");
      else if (error === "bad_file") setStatus("bad_file");
      else if (error === "invalid") setStatus("invalid");
      else setStatus("error");
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
        className="rounded-2xl border border-[#e8e1d8] bg-white p-8 text-center"
      >
        <p className="leading-relaxed text-[#2b2320]">{t.success}</p>
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
            : status === "error"
              ? t.error
              : null;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#e8e1d8] bg-white p-6 md:p-8">
      <p className="text-sm leading-relaxed text-[#5c5140]">{t.intro}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label>
          <span className={LABEL}>{t.name}</span>
          <input name="name" required autoComplete="name" placeholder={t.namePh} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailPh}
            className={FIELD}
          />
        </label>
        <label>
          <span className={LABEL}>{t.phone}</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder={t.phonePh} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t.city}</span>
          <input
            name="city"
            required
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

      <label className="mt-5 block">
        <span className={LABEL}>{t.message}</span>
        <textarea
          name="message"
          required
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
          className="mt-2 w-full text-sm text-[#5c5140] file:mr-4 file:rounded-full file:border-0 file:bg-[#f1ece4] file:px-4 file:py-2 file:text-sm file:text-[#5c5140] hover:file:bg-[#e8e1d8]"
        />
        <span className="mt-1 block text-xs text-[#6f6357]">{t.filesHint}</span>
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
        <div role="alert" className="mt-6 text-sm leading-relaxed text-[#6d2c2c]">
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
              className="mt-3 inline-block rounded-full border border-[#6d2c2c] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors hover:bg-[#6d2c2c] hover:text-white"
            >
              {t.sendFailedCta}
            </a>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-10"
        style={{ backgroundColor: ACCENT }}
      >
        {status === "sending" ? t.sending : t.submit}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-[#6f6357]">{t.privacy}</p>
    </form>
  );
}
