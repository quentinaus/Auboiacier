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
  const fr = locale === "fr";
  const telephone = telephoneLisible();
  const horaires = horairesLisibles(locale);
  const links = [
    { href: `/${locale}/toiles-tendues`, label: dict.hub.lightingLabel },
    { href: `/${locale}/artisanat`, label: dict.hub.craftLabel },
    { href: `/${locale}/artisanat/tables`, label: dict.liens.tables },
    { href: `/${locale}/artisanat/garde-corps`, label: dict.liens.gardeCorps },
    { href: `/${locale}/artisanat/escalier-limon-central`, label: fr ? "Escaliers" : "Staircases" },
    { href: `/${locale}/artisanat/verrieres`, label: dict.verrieres.title },
    { href: `/${locale}/bois-massif`, label: dict.liens.bois },
    { href: `/${locale}/artisanat/sculptures`, label: dict.sculptures.title },
    { href: `/${locale}/realisations`, label: dict.nav.realisations },
    { href: `/${locale}/devis`, label: dict.nav.devis },
    { href: `/${locale}/a-propos`, label: dict.nav.apropos },
    { href: `/${locale}/zone-intervention`, label: dict.nav.zone },
    { href: `/${locale}/faq`, label: dict.nav.faq },
    { href: `/${locale}/contact`, label: dict.nav.contact },
    // Les quatre textes juridiques, du plus engageant au plus administratif :
    // CGV (la vente), CGU (la visite), politique (les données), mentions.
    { href: `/${locale}/cgv`, label: dict.footer.cgv },
    { href: `/${locale}/cgu`, label: dict.footer.cgu },
    { href: `/${locale}/confidentialite`, label: dict.footer.privacy },
    { href: `/${locale}/mentions-legales`, label: dict.footer.legal },
  ];
  // Les guides et les pages de service, liés depuis toutes les pages pour que Google et les visiteurs les trouvent
  // (plan de référencement, 07/10/2026). Libellés écrits ici dans les deux langues, comme dans le menu du haut.
  const guides = [
    { href: `/${locale}/garde-corps-fenetre-normes`, label: dict.liens.normesGc },
    {
      href: `/${locale}/artisanat/verification-garde-corps`,
      label: fr ? "Comment on vérifie un garde-corps" : "How we check a railing",
    },
    {
      href: `/${locale}/escalier-limon-central-prix-normes`,
      label: fr ? "Escalier à limon central : prix et normes" : "Steel spine staircase: prices and rules",
    },
    { href: `/${locale}/soudure-reparations`, label: fr ? "Soudure et réparations" : "Welding and repairs" },
    {
      href: `/${locale}/garde-corps-balcon-terrasse`,
      label: fr ? "Garde-corps de balcon et de terrasse" : "Balcony and terrace railings",
    },
    { href: `/${locale}/rendez-vous`, label: fr ? "Prise de cotes à domicile" : "On-site measuring" },
  ];

  return (
    <footer
      className={
        dark
          ? "border-t border-white/10 bg-[#0b0a09] text-white"
          : "border-t border-[#e8e1d8] bg-[#f5f1ea] text-[#2b2320]"
      }
    >
      {/* Façon Apple (Quentin, 06/10/2026) : les intitulés en phrase normale, plus de petites capitales espacées ;
          des liens à 15 px, bien espacés, lisibles au doigt. Sur tablette, la marque et le contact côte à côte, les liens
          puis les guides en dessous ; sur grand écran, trois colonnes taillées sur leurs liens les plus longs, pour
          qu'aucune ligne ne se coupe (« Conditions générales de vente », l'adresse) : les guides au-dessus du contact,
          dans la troisième colonne, comme les rubriques empilées d'un pied de page Apple (07/10/2026). */}
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:gap-x-14 md:py-20 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:gap-x-16">
        <div className="xl:row-span-2">
          <span className={`${serif.className} text-[1.6rem] leading-none tracking-[-0.01em]`}>Auboiacier</span>
          <p className={`mt-4 max-w-xs text-[15px] leading-[1.55] ${dark ? "text-white/70" : "text-[#5c5140]"}`}>
            {dict.footer.tagline}
          </p>
        </div>

        <div className="md:order-last md:col-span-2 xl:order-none xl:col-span-1 xl:row-span-2">
          <h2 className={`text-[15px] font-semibold tracking-[-0.01em] ${dark ? "text-white" : "text-[#2b2320]"}`}>
            {dict.footer.navTitle}
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[15px] leading-[1.35] sm:gap-x-10 md:grid-cols-3 xl:grid-cols-2">
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

        <div className="md:order-last md:col-span-2 xl:order-none xl:col-span-1">
          <h2 className={`text-[15px] font-semibold tracking-[-0.01em] ${dark ? "text-white" : "text-[#2b2320]"}`}>
            Guides
          </h2>
          <ul className="mt-5 grid gap-x-6 gap-y-3 text-[15px] leading-[1.35] sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3 xl:grid-cols-1">
            {guides.map((link) => (
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
          <h2 className={`text-[15px] font-semibold tracking-[-0.01em] ${dark ? "text-white" : "text-[#2b2320]"}`}>
            {dict.footer.contactTitle}
          </h2>
          <ul className={`mt-5 flex flex-col gap-3 text-[15px] leading-[1.35] ${dark ? "text-white/80" : "text-[#4a4038]"}`}>
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
        className={`border-t px-6 py-6 text-center text-[13px] ${
          dark ? "border-white/10 text-white/70" : "border-[#e8e1d8] text-[#6f6357]"
        }`}
      >
        © {new Date().getFullYear()} Auboiacier — {dict.footer.rights}
      </div>
    </footer>
  );
}
