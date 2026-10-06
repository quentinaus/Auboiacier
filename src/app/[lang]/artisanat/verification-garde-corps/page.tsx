import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import { metadataPage, jsonLdFilAriane, scriptJsonLd } from "@/lib/seo";
import { serif } from "@/lib/fonts";
import { FENETRE_APPEL_GC, planApercuGC, reponsePrixGC } from "@/lib/prix-garde-corps.server";
import type { ModeleGC } from "@/lib/garde-corps";

/**
 * « Comment on vérifie votre garde-corps » (étude marketing, 06/10/2026 : la vraie différence d'Auboiacier, ce sont les
 * dessins testés pour la fenêtre du client). Un exemple RÉEL, calculé par l'outil de plans au moment de la construction de
 * la page : chaque dessin testé pour une fenêtre courante, accepté ou refusé avec sa raison, et le plan d'atelier du moins
 * cher. Jamais « certifié NF » : on applique les règles, on ne prétend pas à un label.
 */

const CHEMIN = "/artisanat/verification-garde-corps";

export async function generateMetadata({ params }: PageProps<"/[lang]/artisanat/verification-garde-corps">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const fr = locale === "fr";
  return metadataPage({
    locale,
    chemin: CHEMIN,
    title: fr ? "Comment on vérifie votre garde-corps" : "How we check your railing",
    description: fr
      ? "Avant de vous donner un prix, notre outil dessine votre garde-corps à vos mesures et teste chaque modèle : hauteur (art. R134-59), vides (NF P01-012), partie basse, solidité."
      : "Before giving you a price, our tool draws your railing to your measurements and tests every design: height (art. R134-59), gaps (NF P01-012), lower part, strength.",
  });
}

/** Le nom d'un dessin, comme sur la fiche. */
function nomDessin(m: ModeleGC, fr: boolean): string {
  if (m.seuls) return fr ? "Barreaux seuls" : "Bars only";
  const croix = fr ? `${m.croix} croix` : `${m.croix} ${m.croix > 1 ? "crosses" : "cross"}`;
  const plus = [m.traverse ? (fr ? "traverse" : "middle rail") : null, m.soubassementMm > 0 ? (fr ? "barreaux en bas" : "bars below") : null].filter(Boolean);
  return plus.length ? `${croix} + ${plus.join(" + ")}` : croix;
}

/** Pourquoi un dessin est refusé pour cette fenêtre, en mots (les mêmes que la fiche). */
function raison(m: ModeleGC, fr: boolean): string {
  const r = m.raisons as readonly string[];
  if (r.includes("trous")) return fr ? "un vide laisserait passer la boule de 110 mm" : "a gap would let the 110 mm ball through";
  if (r.includes("fixation")) return fr ? "les fixations dans le mur seraient trop sollicitées" : "the wall fixings would be overloaded";
  if (r.includes("solidite") || r.includes("charge-verticale")) return fr ? "pas assez rigide sur cette largeur" : "not stiff enough over this width";
  if (r.includes("soubassement")) return fr ? "si près du sol, le bas doit être fermé par des barreaux" : "this close to the floor, the bottom must be closed with bars";
  if (r.includes("fenetre")) return fr ? "il ne tiendrait pas dans la hauteur de la fenêtre" : "it would not fit in the window height";
  return fr ? "ne respecte pas les règles pour cette fenêtre" : "does not meet the rules for this window";
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

export default async function VerificationGardeCorpsPage({ params }: PageProps<"/[lang]/artisanat/verification-garde-corps">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const fr = locale === "fr";
  const ex = exemple();
  const aux = ex ? ex.modeles.filter((m) => m.conforme) : [];
  const refuses = ex ? ex.modeles.filter((m) => !m.conforme) : [];
  const cm = FENETRE_APPEL_GC.largeurMm / 10;
  const allegeCm = FENETRE_APPEL_GC.allegeMm / 10;

  const regles = fr
    ? [
        {
          titre: "La hauteur",
          source: "Code de la construction, art. R134-59",
          texte:
            "En étage, une fenêtre dont l'appui est à moins de 90 cm du sol doit être protégée. Le haut de la main courante est à 1 m du sol au moins : nous visons 1 025 mm. C'est le garde-corps qui s'adapte à votre fenêtre, pas l'inverse.",
        },
        {
          titre: "Les vides",
          source: "Norme NF P01-012",
          texte:
            "Aucune ouverture ne doit laisser passer une boule de 110 mm (180 mm dans la partie haute). L'outil mesure chaque vide du dessin, entre les croix, les rosaces et le cadre.",
        },
        {
          titre: "La partie basse",
          source: "Norme NF P01-012",
          texte: "Près du sol, là où un enfant pourrait poser le pied pour grimper, le bas du cadre est fermé par des barreaux droits quand il le faut.",
        },
        {
          titre: "La solidité",
          source: "Calcul de l'atelier",
          texte:
            "Sur une grande largeur, la main courante est raidie par un fer plat d'acier, et l'effort sur les fixations dans le mur est vérifié.",
        },
      ]
    : [
        {
          titre: "Height",
          source: "French Building Code, art. R134-59",
          texte:
            "Upstairs, a window whose sill is less than 90 cm from the floor must be protected. The top of the handrail is at least 1 m from the floor: we aim for 1,025 mm. The railing adapts to your window, not the other way round.",
        },
        {
          titre: "Gaps",
          source: "Standard NF P01-012",
          texte:
            "No opening may let a 110 mm ball through (180 mm in the upper part). The tool measures every gap in the design, between the crosses, the rosettes and the frame.",
        },
        {
          titre: "Lower part",
          source: "Standard NF P01-012",
          texte: "Near the floor, where a child could get a foothold to climb, the bottom of the frame is closed with straight bars when needed.",
        },
        {
          titre: "Strength",
          source: "Workshop calculation",
          texte: "Over a wide span, the handrail is stiffened by a steel flat bar, and the load on the wall fixings is checked.",
        },
      ];

  return (
    <>
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
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-10 md:pt-14">
        <nav aria-label={dict.nav.breadcrumb} className="text-[12px] text-[#6f6357]">
          <Link href={`/${locale}/artisanat/garde-corps`} className="underline underline-offset-4 hover:text-[#2b2320]">
            {fr ? "← Garde-corps de fenêtre" : "← Window railings"}
          </Link>
        </nav>
        <h1 className={`${serif.className} mt-4 text-3xl leading-tight text-[#2b2320] md:text-[2.6rem]`}>
          {fr ? "Comment on vérifie votre garde-corps" : "How we check your railing"}
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#4a4038]">
          {fr
            ? "Avant de vous donner un prix, notre outil de calcul dessine votre garde-corps à vos mesures, puis teste chaque modèle pour VOTRE fenêtre. Vous ne voyez que ceux qui respectent les règles de sécurité : un modèle qui ne passe pas n'est jamais vendu."
            : "Before giving you a price, our calculation tool draws your railing to your measurements, then tests every design for YOUR window. You only see those that meet the safety rules: a design that fails is never sold."}
        </p>

        <h2 className={`${serif.className} mt-12 text-2xl text-[#2b2320]`}>{fr ? "Ce que l'outil vérifie" : "What the tool checks"}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {regles.map((r) => (
            <li key={r.titre} className="rounded-2xl border border-[#e5ddd3] bg-[#fbfaf8] p-5">
              <p className="text-[15px] font-semibold text-[#2b2320]">{r.titre}</p>
              <p className="mt-0.5 text-[11.5px] font-medium uppercase tracking-[0.12em] text-[#6f6357]">{r.source}</p>
              <p className="mt-2.5 text-[14px] leading-relaxed text-[#4a4038]">{r.texte}</p>
            </li>
          ))}
        </ul>

        {ex && (
          <>
            <h2 className={`${serif.className} mt-14 text-2xl text-[#2b2320]`}>{fr ? "Un exemple réel" : "A real example"}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4a4038]">
              {fr
                ? `Une fenêtre de ${cm} cm de large, en étage, le bas à ${allegeCm} cm du sol : ${ex.modeles.length} dessins testés, ${aux.length} aux normes, ${refuses.length} refusés. Calculé par notre outil, comme pour votre fenêtre.`
                : `A window ${cm} cm wide, upstairs, its bottom ${allegeCm} cm from the floor: ${ex.modeles.length} designs tested, ${aux.length} to standard, ${refuses.length} refused. Worked out by our tool, as for your window.`}
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1f5a2e]">
                  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f7d46] text-[11px] text-white">✓</span>
                  {fr ? `Aux normes (${aux.length})` : `To standard (${aux.length})`}
                </p>
                <ul className="mt-2 space-y-1 text-[13.5px] text-[#2b2320]">
                  {aux.map((m) => (
                    <li key={m.id}>{nomDessin(m, fr)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8a2b24]">
                  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b3261e] text-[11px] text-white">✕</span>
                  {fr ? `Refusés pour cette fenêtre (${refuses.length})` : `Refused for this window (${refuses.length})`}
                </p>
                <ul className="mt-2 space-y-1.5 text-[13.5px] text-[#2b2320]">
                  {refuses.map((m) => (
                    <li key={m.id}>
                      {nomDessin(m, fr)}
                      <span className="block text-[12.5px] leading-snug text-[#6f6357]">{raison(m, fr)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-[#6f6357]">
              {fr
                ? "Un dessin refusé ici peut convenir à une autre fenêtre : ce n'est pas le modèle qui est en cause, c'est l'association du modèle et de la fenêtre."
                : "A design refused here may suit another window: it is not the design itself, it is the design and the window together."}
            </p>
            {ex.plan && (
              <figure className="mt-10">
                {/* eslint-disable-next-line @next/next/no-img-element -- un plan SVG calculé sur le serveur, pas une photo */}
                <img src={ex.plan} alt={fr ? "Plan d'atelier du garde-corps, aux cotes de cette fenêtre" : "Workshop drawing of the railing, at this window's dimensions"} className="w-full rounded-2xl border border-[#e5ddd3] bg-white" />
                <figcaption className="mt-2 text-[12.5px] leading-snug text-[#6f6357]">
                  {fr
                    ? "Le plan dessiné par notre outil pour le modèle le moins cher de cet exemple (aperçu). Le plan d'atelier complet est établi après votre commande."
                    : "The drawing made by our tool for the cheapest design in this example (preview). The full workshop drawing is made after your order."}
                </figcaption>
              </figure>
            )}
          </>
        )}

        <div className="mt-14 rounded-2xl bg-[#2b2320] px-6 py-7 text-center text-white">
          <p className={`${serif.className} text-xl`}>{fr ? "Et pour votre fenêtre ?" : "And for your window?"}</p>
          <p className="mt-1.5 text-[14px] text-white/85">
            {fr ? "Entrez vos mesures : les modèles aux normes et leur prix s'affichent tout de suite." : "Enter your measurements: the designs that meet the standard and their price show straight away."}
          </p>
          <Link
            href={`/${locale}/artisanat/garde-corps#configuration`}
            className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2b2320] transition-colors hover:bg-[#f3eee8]"
          >
            {fr ? "Calculer mon prix" : "Get my price"}
          </Link>
        </div>
      </article>
    </>
  );
}
