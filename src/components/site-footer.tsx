import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";

export function SiteFooter({
  locale,
  dict,
  tone = "light",
}: {
  locale: Locale;
  dict: Dictionary;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const links = [
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <footer
      className={
        dark
          ? "border-t border-white/10 bg-[#0b0a09] text-white"
          : "border-t border-[#e8e1d8] bg-[#f5f1ea] text-[#2b2320]"
      }
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <span className={`${serif.className} text-xl`}>Auboiacier</span>
          <p className={`mt-3 max-w-xs text-sm leading-relaxed ${dark ? "text-white/60" : "text-[#7a6e63]"}`}>
            {dict.footer.tagline}
          </p>
        </div>

        <div>
          <h3 className={`text-xs font-medium uppercase tracking-widest ${dark ? "text-white/50" : "text-[#7a6e63]"}`}>
            {dict.footer.navTitle}
          </h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={dark ? "text-white/80 hover:text-white" : "text-[#4a4038] hover:text-[#2b2320]"}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={`text-xs font-medium uppercase tracking-widest ${dark ? "text-white/50" : "text-[#7a6e63]"}`}>
            {dict.footer.contactTitle}
          </h3>
          <ul className={`mt-4 flex flex-col gap-2 text-sm ${dark ? "text-white/80" : "text-[#4a4038]"}`}>
            <li>{dict.contact.email}</li>
            <li>{dict.contact.location}</li>
          </ul>
        </div>
      </div>

      <div
        className={`border-t px-6 py-5 text-center text-xs ${
          dark ? "border-white/10 text-white/40" : "border-[#e8e1d8] text-[#9a8f83]"
        }`}
      >
        © {new Date().getFullYear()} Auboiacier — {dict.footer.rights}
      </div>
    </footer>
  );
}
