import Link from "next/link";

/**
 * Icône « mon espace », à côté du panier.
 *
 * Une icône et rien d'autre : le commentaire de global-header.tsx le dit déjà,
 * « les langues se battent avec le logo pour la place ». Le lien en toutes
 * lettres existe, lui, dans le menu du téléphone.
 *
 * Pas de « use client » ici : ce bouton ne sait pas si le visiteur est
 * connecté, et n'a pas besoin de le savoir. La page /compte s'en charge — et
 * la connaissance ne descend donc jamais dans le navigateur.
 */
export function CompteBouton({
  locale,
  label,
  variant = "light",
}: {
  locale: string;
  label: string;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <Link
      href={`/${locale}/compte`}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        dark ? "text-white/80 hover:text-white" : "text-[#5c5140] hover:text-[#2a2116]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
