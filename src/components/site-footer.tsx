import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <footer className="border-t border-gray-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-gray-500">
        <span className="font-mono tracking-widest text-gray-900">
          {dict.meta.siteName.toUpperCase()}
        </span>
        <span>{dict.contact.email}</span>
        <span>
          © {new Date().getFullYear()} {dict.meta.siteName} — {dict.footer.rights}
        </span>
      </div>
    </footer>
  );
}
