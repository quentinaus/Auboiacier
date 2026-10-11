import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdArticle, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { FENETRE_APPEL_GC, planApercuGC, reponsePrixGC } from "@/lib/prix-garde-corps.server";
import type { ModeleGC } from "@/lib/garde-corps";
import { MiniGardeCorps } from "@/components/releve-garde-corps";

/**
 * « Comment on vérifie votre garde-corps » (étude marketing, 06/10/2026 : la vraie différence d'Auboiacier, ce sont les
 * dessins testés pour la fenêtre du client). Un exemple RÉEL, calculé par l'outil de plans au moment de la construction de
 * la page : chaque dessin testé pour une fenêtre courante, en vignette, accepté ou refusé avec sa raison (le rond rouge de
 * l'outil là où le vide est trop grand), et le plan d'atelier du moins cher. Jamais « certifié NF » : on applique les
 * règles, on ne prétend pas à un label.
 */

const CHEMIN = "/artisanat/verification-garde-corps";

/** Les deux dates de la page : celles qu'elle affiche et que Google lit (Article). AAAA-MM-JJ. */
const DATE_PUBLICATION = "2026-10-06";
const DATE_MODIFICATION = "2026-10-10";

/**
 * Titre, description et H1 (plan de référencement, 1.8) : pas de « solidité » ni de « 4 contrôles » tant que la
 * fixation renforcée n'est pas décidée — seulement ce que l'outil teste vraiment (hauteur, vides, partie basse).
 */
const TEXTES = {
  fr: {
    title: "Garde-corps de fenêtre : nos contrôles",
    description:
      "Avant d'afficher un prix, l'outil dessine votre garde-corps de fenêtre et teste chaque modèle : hauteur, vides de 110 mm, partie basse. Un exemple réel.",
    h1: "Comment on vérifie votre garde-corps de fenêtre",
    signature: "Page écrite par l'atelier Auboiacier, à Saumur. Mise à jour le {date}.",
  },
  en: {
    title: "Window railing safety: our checks",
    description:
      "Before showing a price, our tool draws your window railing and tests every design: height, gaps under 110 mm, lower part. A real example inside.",
    h1: "How we check your window railing",
    signature: "Page written by the Auboiacier workshop in Saumur. Updated {date}.",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[lang]/artisanat/verification-garde-corps">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  return metadataPage({
    locale,
    chemin: CHEMIN,
    title: TEXTES[locale].title,
    description: TEXTES[locale].description,
  });
}

/** Le nom d'un dessin, comme sur la fiche. */
function nomDessin(m: ModeleGC, fr: boolean): string {
  if (m.seuls) return fr ? "Barreaux seuls" : "Bars only";
  const croix = fr ? `${m.croix} croix` : `${m.croix} ${m.croix > 1 ? "crosses" : "cross"}`;
  const plus = [m.traverse ? (fr ? "traverse" : "rail") : null, m.soubassementMm > 0 ? (fr ? "barreaux en bas" : "bars below") : null].filter(Boolean);
  return plus.length ? `${croix} + ${plus.join(" + ")}` : croix;
}

/** Pourquoi un dessin est refusé pour cette fenêtre, en mots courts (les mêmes que la fiche). */
function raison(m: ModeleGC, fr: boolean): string {
  const r = m.raisons as readonly string[];
  if (r.includes("trous")) return fr ? "Un vide laisserait passer la boule de 110 mm" : "A gap would let the 110 mm ball through";
  if (r.includes("fixation")) return fr ? "Fixations dans le mur trop sollicitées" : "Wall fixings overloaded";
  if (r.includes("solidite") || r.includes("charge-verticale")) return fr ? "Pas assez rigide sur cette largeur" : "Not stiff enough over this width";
  if (r.includes("soubassement")) return fr ? "Près du sol, le bas doit être fermé" : "Near the floor, the bottom must be closed";
  if (r.includes("fenetre")) return fr ? "Ne tiendrait pas dans la fenêtre" : "Would not fit in the window";
  return fr ? "Hors des règles pour cette fenêtre" : "Outside the rules for this window";
}

/** L'exemple, calculé par l'outil ; null si le chiffrage n'est pas disponible sur ce serveur (rien d'inventé). */
function exemple() {
  try {
    const q = { releve: { ...FENETRE_APPEL_GC, enEtage: true, fenetreMm: 0 }, essence: "chene" as const, quantite: 1 };
    const r = reponsePrixGC(q);
    if (!r) return null;
    const plan = planApercuGC(q);
    return { modeles: r.modeles, plan: plan ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(plan.svg)}` : null };
  } catch {
    return null;
  }
}

/* Les pictogrammes des quatre règles, au trait, dans le style des croquis de la fiche. */
const trait = { fill: "none", stroke: "#2b2320", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const PICTOS: Record<string, ReactNode> = {
  hauteur: (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M8 56h48" {...trait} />
      <rect x="22" y="20" width="26" height="22" rx="1.5" {...trait} />
      <path d="M22 42h26" {...trait} strokeWidth={3} stroke="#c19a5e" />
      <path d="M14 56V20M11 23l3-3 3 3M11 53l3 3 3-3" {...trait} />
      <text x="5" y="38" fontSize="7" fill="#2b2320" fontWeight={600}>1 m</text>
    </svg>
  ),
  vides: (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M12 14v38M28 14v38M44 14v38" {...trait} />
      <circle cx="36" cy="33" r="6.5" fill="#2f7d46" fillOpacity={0.18} stroke="#2f7d46" strokeWidth={1.4} />
      <circle cx="20" cy="33" r="6.5" fill="#2f7d46" fillOpacity={0.18} stroke="#2f7d46" strokeWidth={1.4} />
      <text x="47" y="36" fontSize="7" fill="#2b2320" fontWeight={600}>110</text>
    </svg>
  ),
  bas: (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M8 56h48" {...trait} />
      <rect x="10" y="14" width="44" height="34" {...trait} />
      <path d="M10 36h44M10 14l22 22M32 14L10 36M32 14l22 22M54 14L32 36" {...trait} strokeWidth={1.1} />
      <path d="M17 36v12M24 36v12M31 36v12M38 36v12M45 36v12" {...trait} strokeWidth={1.2} />
    </svg>
  ),
  solidite: (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <rect x="6" y="22" width="52" height="6" rx="1.5" fill="#c19a5e" stroke="#2b2320" strokeWidth={1.2} />
      <rect x="6" y="28" width="52" height="3" fill="#2b2320" />
      <path d="M32 6v11M28 13l4 4 4-4" {...trait} />
      <path d="M6 31v22M58 31v22" {...trait} />
      <path d="M4 42h4M56 42h4" {...trait} strokeWidth={2.4} />
    </svg>
  ),
};

export default async function VerificationGardeCorpsPage({ params }: PageProps<"/[lang]/artisanat/verification-garde-corps">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const fr = locale === "fr";
  const ex = exemple();
  const aux = ex ? ex.modeles.filter((m) => m.conforme) : [];
  const refuses = ex ? ex.modeles.filter((m) => !m.conforme) : [];
  const hMax = ex ? Math.max(...ex.modeles.map((m) => m.hauteurMm)) : 0;
  const cm = FENETRE_APPEL_GC.largeurMm / 10;
  const allegeCm = FENETRE_APPEL_GC.allegeMm / 10;

  const regles = [
    {
      cle: "hauteur",
      titre: fr ? "La hauteur" : "Height",
      source: fr ? "Code de la construction, art. R134-59" : "French Building Code, art. R134-59",
      texte: fr
        ? "En étage, dans un logement neuf, une fenêtre dont l'appui est à moins de 90 cm du sol doit être protégée. Dans une maison ancienne, ce n'est pas obligatoire : nous appliquons quand même cette règle. Le haut de la main courante est à 1 m du sol au moins : nous visons 1 025 mm. C'est le garde-corps qui s'adapte à votre fenêtre."
        : "Upstairs, in a new home, a window whose sill is less than 90 cm from the floor must be protected. In an older house it is not compulsory: we still apply the same rule. The top of the handrail is at least 1 m from the floor: we aim for 1,025 mm. The railing adapts to your window.",
    },
    {
      cle: "vides",
      titre: fr ? "Les vides" : "Gaps",
      source: fr ? "Norme NF P01-012" : "Standard NF P01-012",
      texte: fr
        ? "Aucune ouverture ne doit laisser passer une boule de 110 mm (180 mm dans la partie haute). L'outil mesure chaque vide du dessin, entre les croix, les rosaces et le cadre."
        : "No opening may let a 110 mm ball through (180 mm in the upper part). The tool measures every gap in the design, between the crosses, the rosettes and the frame.",
    },
    {
      cle: "bas",
      titre: fr ? "La partie basse" : "Lower part",
      source: fr ? "Norme NF P01-012" : "Standard NF P01-012",
      texte: fr
        ? "Près du sol, là où un enfant pourrait poser le pied pour grimper, le bas du cadre est fermé par des barreaux droits quand il le faut."
        : "Near the floor, where a child could get a foothold to climb, the bottom of the frame is closed with straight bars when needed.",
    },
    {
      cle: "solidite",
      titre: fr ? "La solidité" : "Strength",
      source: fr ? "Calcul de l'atelier" : "Workshop calculation",
      texte: fr
        ? "Sur une grande largeur, la main courante est raidie par un fer plat d'acier. L'outil calcule l'effort que reprennent les fixations dans le mur ; le choix de la fixation dépend de votre mur."
        : "Over a wide span, the handrail is stiffened by a steel flat bar. The tool works out the load the wall fixings take; the choice of fixing depends on your wall.",
    },
  ];

  const tuile = (m: ModeleGC) => (
    <li key={m.id} className="flex flex-col rounded-2xl border border-[#e5ddd3] bg-white p-2.5">
      <div className="relative rounded-xl bg-[#f7f4ef] px-3 pb-2 pt-5">
        <span
          aria-hidden
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ${m.conforme ? "bg-[#2f7d46]" : "bg-[#b3261e]"}`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            {m.conforme ? <path d="M4.5 10.5l3.5 3.5 7.5-8" /> : <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />}
          </svg>
        </span>
        <MiniGardeCorps
          largeurMm={FENETRE_APPEL_GC.largeurMm}
          hauteurMm={m.hauteurMm}
          hMaxMm={hMax}
          soubassementMm={m.soubassementMm}
          croix={m.croix}
          traverse={m.traverse}
          seuls={m.seuls}
          sansRosace={m.rosace === "sans"}
          // Les ronds seulement quand c'est un vide qui est en cause : le rond rouge dit lequel.
          trous={!m.conforme && (m.raisons as readonly string[]).includes("trous") ? m.trous : null}
          hauteurPx={58}
        />
      </div>
      <p className="mt-2 px-1 text-[13px] font-semibold leading-tight text-[#2b2320]">{nomDessin(m, fr)}</p>
      <p className={`mt-0.5 px-1 pb-0.5 text-[12px] leading-snug ${m.conforme ? "text-[#2f7d46]" : "text-[#8a2b24]"}`}>
        {m.conforme ? (fr ? "Aux normes" : "To standard") : raison(m, fr)}
      </p>
    </li>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdArticle({
            locale,
            chemin: CHEMIN,
            titre: TEXTES[locale].h1,
            description: TEXTES[locale].description,
            datePublication: DATE_PUBLICATION,
            dateModification: DATE_MODIFICATION,
          }),
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFilAriane(locale, [
            { nom: dict.nav.home, chemin: "" },
            { nom: dict.artisanat.breadcrumbShop, chemin: "/artisanat" },
            { nom: fr ? "Garde-corps" : "Railings", chemin: "/artisanat/garde-corps" },
            { nom: fr ? "Comment on vérifie" : "How we check", chemin: CHEMIN },
          ]),
        )}
      />

      {/* L'en-tête : la promesse, en une phrase, et ce qu'elle veut dire. */}
      <header className="border-b border-[#e5ddd3] bg-[#f5f1ea] px-6 pb-12 pt-10 md:pb-16 md:pt-14">
        <div className="mx-auto max-w-3xl">
          {/* Le fil d'Ariane visible, le même que celui déclaré aux moteurs. */}
          <nav aria-label={dict.nav.breadcrumb} className="text-[12px] text-[#6f6357]">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {[
                { nom: dict.nav.home, href: `/${locale}` },
                { nom: dict.artisanat.breadcrumbShop, href: `/${locale}/artisanat` },
                { nom: fr ? "Garde-corps" : "Railings", href: `/${locale}/artisanat/garde-corps` },
              ].map((e) => (
                <li key={e.href} className="flex items-center gap-1.5">
                  <Link href={e.href} className="underline-offset-4 hover:text-[#2b2320] hover:underline">
                    {e.nom}
                  </Link>
                  <span aria-hidden>›</span>
                </li>
              ))}
              <li aria-current="page" className="text-[#2b2320]">
                {fr ? "Comment on vérifie" : "How we check"}
              </li>
            </ol>
          </nav>
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.3em] text-[#6f6357]">
            {fr ? "Hauteur et vides calculés pour votre fenêtre" : "Height and gaps worked out for your window"}
          </p>
          <h1 className={`${serif.className} mt-3 text-[2rem] leading-[1.1] text-[#2b2320] md:text-[3rem]`}>
            {TEXTES[locale].h1}
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#4a4038] md:text-[17px]">
            {fr
              ? "Avant de vous donner un prix, notre outil de calcul dessine votre garde-corps à vos mesures, puis teste chaque modèle pour votre fenêtre. Vous ne voyez que ceux qui respectent les règles de sécurité : un modèle qui ne passe pas n'est jamais vendu."
              : "Before giving you a price, our calculation tool draws your railing to your measurements, then tests every design for your window. You only see those that meet the safety rules: a design that fails is never sold."}
          </p>
          {/* La règle elle-même et la fiche, dès le haut de la page (référencement, lot L8). */}
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-1">
            <Link href={`/${locale}/garde-corps-fenetre-normes`} className="lien-fleche py-1 text-[#2b2320]">
              {dict.liens.normesGc}
            </Link>
            <Link href={`/${locale}/artisanat/garde-corps`} className="lien-fleche py-1 text-[#2b2320]">
              {dict.liens.gardeCorps}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        {/* Les quatre règles. */}
        <section className="pt-12 md:pt-16">
          <h2 className={`${serif.className} text-2xl text-[#2b2320] md:text-[2rem]`}>{fr ? "Ce que l'outil vérifie" : "What the tool checks"}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {regles.map((r) => (
              <li key={r.cle} className="flex gap-4 rounded-2xl border border-[#e5ddd3] bg-white p-5">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-[#f7f4ef] p-1.5">{PICTOS[r.cle]}</div>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold leading-tight text-[#2b2320]">{r.titre}</p>
                  <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">{r.source}</p>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-[#4a4038]">{r.texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {ex && (
          <section className="pt-14 md:pt-20">
            <h2 className={`${serif.className} text-2xl text-[#2b2320] md:text-[2rem]`}>{fr ? "Un exemple réel" : "A real example"}</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#4a4038]">
              {fr
                ? `Une fenêtre de ${cm} cm de large, en étage, le bas à ${allegeCm} cm du sol. Calculé par notre outil, exactement comme pour la vôtre.`
                : `A window ${cm} cm wide, upstairs, its bottom ${allegeCm} cm from the floor. Worked out by our tool, exactly as for yours.`}
            </p>
            {/* Le bilan, en trois chiffres. */}
            <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e5ddd3] bg-white text-center">
              {[
                { n: ex.modeles.length, mot: fr ? "dessins testés" : "designs tested", couleur: "text-[#2b2320]" },
                { n: aux.length, mot: fr ? "aux normes" : "to standard", couleur: "text-[#2f7d46]" },
                { n: refuses.length, mot: fr ? "refusés" : "refused", couleur: "text-[#b3261e]" },
              ].map((c, i) => (
                <div key={c.mot} className={`px-3 py-4 ${i > 0 ? "border-l border-[#e5ddd3]" : ""}`}>
                  <p className={`${serif.className} text-3xl leading-none md:text-4xl ${c.couleur}`}>{c.n}</p>
                  <p className="mt-1.5 text-[12px] text-[#6f6357]">{c.mot}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-10 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#b3261e]">
              {fr ? "Refusés pour cette fenêtre" : "Refused for this window"}
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{refuses.map(tuile)}</ul>
            <p className="mt-3 text-[12.5px] leading-snug text-[#6f6357]">
              {fr
                ? "Le rond rouge montre le vide trop grand, comme dans notre outil. Un dessin refusé ici peut convenir à une autre fenêtre : c'est l'association du modèle et de la fenêtre qui compte."
                : "The red circle shows the gap that is too wide, as in our tool. A design refused here may suit another window: what counts is the design and the window together."}
            </p>

            <h3 className="mt-10 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#2f7d46]">
              {fr ? "Aux normes : ceux que vous pouvez choisir" : "To standard: the ones you can choose"}
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{aux.map(tuile)}</ul>

            {ex.plan && (
              <figure className="mt-14">
                <h3 className={`${serif.className} text-xl text-[#2b2320] md:text-2xl`}>{fr ? "Et le plan d'atelier" : "And the workshop drawing"}</h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5ddd3] bg-white p-2 shadow-[0_18px_40px_-28px_rgba(43,35,32,0.45)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- un plan SVG calculé sur le serveur, pas une photo */}
                  <img src={ex.plan} alt={fr ? "Plan d'atelier du garde-corps, aux cotes de cette fenêtre" : "Workshop drawing of the railing, at this window's dimensions"} className="w-full" />
                </div>
                <figcaption className="mt-2.5 text-[12.5px] leading-snug text-[#6f6357]">
                  {fr
                    ? "Le plan dessiné par notre outil pour le modèle le moins cher de cet exemple (aperçu). Le plan d'atelier complet est établi après votre commande."
                    : "The drawing made by our tool for the cheapest design in this example (preview). The full workshop drawing is made after your order."}
                </figcaption>
              </figure>
            )}
          </section>
        )}

        <section className="mt-16 rounded-[28px] bg-[#2b2320] px-6 py-10 text-center text-white md:py-12">
          <p className={`${serif.className} text-2xl md:text-[2rem]`}>{fr ? "Et pour votre fenêtre ?" : "And for your window?"}</p>
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-white/85">
            {fr
              ? "Entrez vos mesures : les modèles aux normes et leur prix s'affichent tout de suite."
              : "Enter your measurements: the designs that meet the standard and their price show straight away."}
          </p>
          <Link
            href={`/${locale}/artisanat/garde-corps#configuration`}
            className="mt-6 inline-block rounded-full bg-white px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2b2320] transition-colors hover:bg-[#f3eee8]"
          >
            {fr ? "Calculer mon prix" : "Get my price"}
          </Link>
        </section>

        {/* Qui a écrit la page, et quand : l'atelier, tant que Quentin ne l'a pas relue (C9). */}
        <p className="mt-10 text-[14px] leading-[1.6] text-[#6f6357]">
          {TEXTES[locale].signature.replace(
            "{date}",
            new Date(DATE_MODIFICATION).toLocaleDateString(fr ? "fr-FR" : "en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }),
          )}
        </p>
      </div>
    </>
  );
}
