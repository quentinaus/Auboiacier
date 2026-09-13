import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { serif } from "@/lib/fonts";
import { CONTACT_PUBLIC, horairesLisibles, telephoneLisible } from "@/lib/seo";

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
  const telephone = telephoneLisible();
  const horaires = horairesLisibles(locale);
  const links = [
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    { href: `/${locale}/artisanat/verrieres`, label: dict.verrieres.title },
    { href: `/${locale}/artisanat/sculptures`, label: dict.sculptures.title },
    { href: `/${locale}/devis`, label: dict.nav.devis },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/zone-intervention`, label: dict.nav.zone },
    { href: `/${locale}/faq`, label: dict.nav.faq },
    { href: `/${locale}/contact`, label: dict.nav.contact },
    { href: `/${locale}/cgv`, label: dict.footer.cgv },
    { href: `/${locale}/mentions-legales`, label: dict.footer.legal },
  ];

  return (
    <footer
      className={
        dark
          ? "border-t border-white/10 bg-[#0b0a09] text-white"
          : "border-t border-[#e8e1d8] bg-[#f5f1ea] text-[#2b2320]"
      }
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1fr_1.4fr_0.9fr] md:gap-14">
        <div>
          <span className={`${serif.className} text-xl`}>Auboiacier</span>
          <p className={`mt-3 max-w-xs text-sm leading-relaxed ${dark ? "text-white/60" : "text-[#726757]"}`}>
            {dict.footer.tagline}
          </p>
        </div>

        <div>
          <h2 className={`text-xs font-medium uppercase tracking-widest ${dark ? "text-white/50" : "text-[#726757]"}`}>
            {dict.footer.navTitle}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:gap-x-10">
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
          <h2 className={`text-xs font-medium uppercase tracking-widest ${dark ? "text-white/50" : "text-[#726757]"}`}>
            {dict.footer.contactTitle}
          </h2>
          <ul className={`mt-4 flex flex-col gap-2 text-sm ${dark ? "text-white/80" : "text-[#4a4038]"}`}>
            <li>
              <a
                href={`mailto:${dict.contact.email}`}
                className="underline-offset-4 hover:underline"
              >
                {dict.contact.email}
              </a>
            </li>
            {/* Téléphone et horaires : affichés seulement une fois renseignés
                dans Vercel — on n'invente pas un numéro. */}
            {telephone && (
              <li>
                <a
                  href={`tel:${CONTACT_PUBLIC.telephone}`}
                  className="underline-offset-4 hover:underline"
                >
                  {telephone}
                </a>
              </li>
            )}
            {horaires && <li>{horaires}</li>}
            <li>{dict.contact.location}</li>
          </ul>
        </div>
      </div>

      {/* Le copyright était en blanc à 40 % sur le fond noir : 3,8 de contraste,
          sous le minimum lisible. À 70 % il monte à 9,8, et reste discret. */}
      <div
        className={`border-t px-6 py-5 text-center text-xs ${
          dark ? "border-white/10 text-white/70" : "border-[#e8e1d8] text-[#726757]"
        }`}
      >
        © {new Date().getFullYear()} Auboiacier — {dict.footer.rights}
      </div>
    </footer>
  );
}
