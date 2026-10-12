"use client";

/**
 * La page des portails (refaite le 12/10/2026) : « Les quatre modèles » puis la bande du guide, dans un seul îlot parce qu'ils
 * partagent l'état du guide : la réponse du client règle la carte « conseillé chez vous » et, pour le coulissant, le dessin et
 * le prix « sans rail ». Les cartes sont dans le HTML initial : la page se lit sans JavaScript (les boutons du guide sont alors
 * masqués). Aucun moteur ici : les prix et les styles arrivent du serveur (donneesPagePortails), les textes de portails-page.ts
 * et portails-textes.ts, les dessins de public/images/portails/scenes. Mouvement : seulement opacity et transform.
 */
import "./portails-modeles.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { guidePortail, type Langue, type SlugPortail } from "@/lib/portails-base";
import { TEXTES_PORTAIL } from "@/lib/portails-textes";
import { MENTION_SCENE, ORDRE_MODELES, TXT, formatCote, lienFiche, srcCarte, type ModeleCarte, type PropsModeles } from "@/lib/portails-page";
import { focusVisible, prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { SchemaGuide } from "./schema-guide";

type Reponses = { derriere?: boolean; cote?: boolean; sol?: boolean };
const CLES = ["derriere", "cote", "sol"] as const;

/** La question en cours : la première sans réponse parmi celles que les réponses précédentes rendent utiles ; null = le résultat est là. */
function questionCourante(g: Reponses): 0 | 1 | 2 | null {
  if (g.derriere === undefined) return 0;
  if (g.derriere) return null;
  if (g.cote === undefined) return 1;
  if (!g.cote) return null;
  return g.sol === undefined ? 2 : null;
}
/** Les questions déjà répondues, dans l'ordre. */
function repondues(g: Reponses): (0 | 1 | 2)[] {
  const l: (0 | 1 | 2)[] = [];
  if (g.derriere !== undefined) l.push(0);
  if (g.derriere === false && g.cote !== undefined) l.push(1);
  if (g.derriere === false && g.cote === true && g.sol !== undefined) l.push(2);
  return l;
}

/** Les sept états du guide : trois questions et quatre résultats (un par parcours ; ce sont aussi les clés de guideRaison). */
const ETATS = ["q0", "q1", "q2", "battant", "pliant", "rail", "auto"] as const;
type Etat = (typeof ETATS)[number];
const RESULTATS: Record<"battant" | "pliant" | "rail" | "auto", { slug: SlugPortail; guidage?: "rail" | "auto" }> = {
  battant: { slug: "portail-battant" }, pliant: { slug: "portail-pliant" },
  rail: { slug: "portail-coulissant", guidage: "rail" }, auto: { slug: "portail-coulissant", guidage: "auto" },
};
/** L'état affiché : la question en cours, ou le résultat du parcours. */
function etatDe(q: 0 | 1 | 2 | null, reponse: ReturnType<typeof guidePortail>): Etat {
  if (q !== null) return `q${q}`;
  if (reponse?.slug === "portail-battant") return "battant";
  if (reponse?.slug === "portail-pliant") return "pliant";
  return reponse?.guidage === "auto" ? "auto" : "rail";
}

/** Faux abonnement : vrai dans le navigateur une fois la page animée, faux sur le serveur et pendant l'hydratation. */
const abonner = () => () => {};

/** Un texte à trou (« Posé dès {p} ») coupé autour du montant : le montant prend alors sa propre taille. */
const autour = (gabarit: (p: string) => string): [string, string] => {
  const [avant, apres] = gabarit("\u0001").split("\u0001");
  return [avant, apres ?? ""];
};

/** Ce que montre un modèle : le coulissant devient « sans rail » quand le guide a répondu « sol non dur ». */
function vueModele(m: ModeleCarte, sansRail: PropsModeles["sansRail"], guidage: "rail" | "auto" | undefined, locale: Langue) {
  const auto = m.slug === "portail-coulissant" && guidage === "auto" && sansRail !== null;
  const style = auto && sansRail ? sansRail.style : m.style;
  const lien = lienFiche(locale, m.slug, { style, ...(m.slug === "portail-coulissant" && guidage ? { guidage } : {}) });
  return {
    auto, style, lien,
    depart: auto && sansRail ? sansRail.depart : m.depart,
    departSans: auto && sansRail ? sansRail.departSans : m.departSans,
    src: srcCarte(m.slug, style, auto ? "auto" : undefined),
  };
}

export function PortailsModeles({ locale, modeles, sansRail }: PropsModeles) {
  const t = TXT[locale], tp = TEXTES_PORTAIL[locale];
  const [guide, setGuide] = useState<Reponses>({});
  const [anime, setAnime] = useState(false);
  const monte = useSyncExternalStore(abonner, () => true, () => false);
  const reponse = guidePortail(guide);
  const guidage = reponse?.guidage;
  const q = questionCourante(guide);
  const faites = repondues(guide);
  const cle = q === null ? "resultat" : `q${q}`;
  const euros = (n: number) => prixAffiche(n, locale);
  const ordonnes = ORDRE_MODELES.map((slug) => modeles.find((m) => m.slug === slug)).filter((m): m is ModeleCarte => !!m);
  const nomStyle = (s: ModeleCarte["style"]) => tp.styles[s];

  /** Répondre : les réponses d'avant sont gardées, la nouvelle s'ajoute, celles des questions d'après sont oubliées. */
  const repondre = (i: 0 | 1 | 2, v: boolean) => {
    setAnime(true);
    setGuide((g) => ({ ...Object.fromEntries(CLES.slice(0, i).map((k) => [k, g[k]])), [CLES[i]]: v }) as Reponses);
  };
  /** Revenir sur une réponse : elle et les suivantes sont effacées. */
  const modifier = (i: 0 | 1 | 2) => {
    setAnime(true);
    setGuide((g) => Object.fromEntries(CLES.slice(0, i).map((k) => [k, g[k]])) as Reponses);
  };

  // Le focus suit le guide : à chaque nouvel état, il va sur le titre de la question ou du résultat (jamais au premier affichage,
  // jamais de défilement). La clé précédente est gardée pour que le double appel du mode strict ne déplace pas le focus.
  const titreRef = useRef<HTMLHeadingElement>(null);
  const precedente = useRef(cle);
  useEffect(() => {
    if (precedente.current === cle) return;
    precedente.current = cle;
    titreRef.current?.focus({ preventScroll: true });
  }, [cle]);

  const conseille = reponse ? ordonnes.find((m) => m.slug === reponse.slug) : undefined;
  const vueConseille = conseille ? vueModele(conseille, sansRail, guidage, locale) : null;
  const [avantG, apresG] = autour(t.guide.posedes);
  const [avantC, apresC] = autour(t.modeles.posedes);
  const fondu = anime ? "pm-fondu" : "";

  const etat = etatDe(q, reponse);
  /** Un état du guide ; seul l'état courant est actif (titre à focaliser, boutons, lien). */
  const rendre = (e: Etat) => {
    const actif = e === etat;
    const tete = { id: actif ? "pm-q-t" : undefined, ref: actif ? titreRef : undefined, tabIndex: actif ? -1 : undefined };
    const classe = `pm-etat ${actif ? "pm-actif" : ""} ${actif ? fondu : ""}`;
    const acces = { role: actif ? "group" : undefined, "aria-labelledby": actif ? "pm-q-t" : undefined, "aria-hidden": actif ? undefined : true, inert: !actif };
    if (e.startsWith("q")) {
      const i = Number(e[1]) as 0 | 1 | 2;
      return (
        <div key={e} className={classe} {...acces}>
          {/* « Retour » flotte en haut à droite, sur la ligne de « Question n sur 3 » : sa présence ne change pas la hauteur du bloc. */}
          {actif && faites.length > 0 && (
            <button type="button" className={`pm-js pm-retour lien-fleche absolute right-0 top-[-12px] min-h-[44px] min-w-[44px] justify-end text-[#2b2320] ${focusVisible}`} onClick={() => modifier(faites[faites.length - 1])}>{t.guide.retour}</button>
          )}
          <p className="text-[14px] leading-[1.4] text-[#6f6357]">{t.guide.question(i + 1)}</p>
          <div className="mb-4 mt-3 flex max-w-[200px] gap-1" aria-hidden="true">
            {[0, 1, 2].map((k) => <i key={k} className={`h-[3px] flex-1 rounded-[2px] ${k <= i ? "bg-[#1d1d1f]" : "bg-[#e0d7cb]"}`} />)}
          </div>
          <h3 {...tete} className={`${serif.className} text-[1.5rem] leading-[1.2] text-[#2b2320] lg:text-[1.75rem] ${focusVisible}`}>{tp.guideQ[i]}</h3>
          <p className="mt-2 max-w-[34em] text-[16px] leading-[1.5] text-[#5c5140]">{tp.guideAide[i]}</p>
          <div className="pm-js pm-reps">
            <button type="button" className="btn-contour" onClick={() => repondre(i, true)}>{tp.guideOui[i]}</button>
            <button type="button" className="btn-contour" onClick={() => repondre(i, false)}>{tp.guideNon[i]}</button>
          </div>
          <details className="pm-plus mt-2">
            <summary className={`pm-aide ${focusVisible}`}>{tp.guideAideLien}</summary>
            <div className="max-w-[34em] pb-1 pt-1 text-[15px] leading-[1.55] text-[#5c5140]">
              <p>{tp.guideVocab}</p>
              <p className="mt-2">{tp.guideCtx[i]}</p>
              <p className="mt-2"><b className="font-semibold text-[#2b2320]">{tp.guideVerifTitre}.</b> {tp.guideVerif[i]}</p>
            </div>
          </details>
        </div>
      );
    }
    const res = RESULTATS[e as keyof typeof RESULTATS];
    const m = ordonnes.find((x) => x.slug === res.slug);
    if (!m) return null;
    const v = vueModele(m, sansRail, res.guidage, locale);
    const bouton = "btn-plein min-h-[48px] md:min-h-[52px]";
    return (
      <div key={e} className={classe} {...acces}>
        <p className="text-[14px] leading-[1.4] text-[#6f6357]">{tp.guideConseil}</p>
        <h3 {...tete} className={`${serif.className} mt-1 text-[2rem] leading-[1.06] text-[#2b2320] lg:text-[2.6rem] ${focusVisible}`}>{m.nom}</h3>
        {res.guidage && <p className="mt-1 text-[15px] font-semibold leading-[1.4] text-[#8a6233]">{tp.guidage[res.guidage]}</p>}
        <p className="mt-3 max-w-[34em] text-[16px] leading-[1.5] text-[#4a4038]">{tp.guideRaison[e as keyof typeof RESULTATS]}</p>
        {v.depart !== null && (
          <p className="mt-3 text-[16px] leading-[1.5] text-[#5c5140]">
            {avantG}<b className="text-[20px] font-medium tabular-nums text-[#1d1d1f]">{euros(v.depart)}</b>{apresG}
            {v.departSans !== null && <span className="tabular-nums"> · {t.guide.sansPose(euros(v.departSans))}</span>}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1">
          {actif ? <Link href={v.lien} prefetch={false} className={bouton}>{t.vitrine.bouton}</Link> : <span className={bouton}>{t.vitrine.bouton}</span>}
          <button type="button" className={`pm-js lien-fleche min-h-[44px] text-[#2b2320] underline underline-offset-[0.2em] after:hidden ${focusVisible}`} onClick={() => modifier(0)}>{tp.guideRefaire}</button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Les quatre modèles */}
      <section id="modeles" aria-labelledby="pm-modeles-t" className="scroll-mt-6 bg-[#f5f1ea] pb-16 pt-16 lg:pb-24 lg:pt-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <h2 id="pm-modeles-t" className={`${serif.className} text-balance text-[1.8rem] leading-[1.08] tracking-[-0.018em] text-[#2b2320] sm:text-[2.2rem]`}>{t.modeles.h2}</h2>
            <p className="text-[15px] leading-[1.55] text-[#5c5140] lg:max-w-[34rem]">{t.modeles.legende}</p>
          </div>
          <ul className="mt-8 grid grid-cols-1 border-t border-[#e0d7cb] min-[560px]:grid-cols-2 min-[560px]:gap-x-6 min-[560px]:gap-y-12 min-[560px]:border-t-0 lg:mt-10 min-[1360px]:grid-cols-4">
            {ordonnes.map((m, i) => {
              const v = vueModele(m, sansRail, m.slug === "portail-coulissant" ? guidage : undefined, locale);
              const ici = conseille?.slug === m.slug;
              const idT = `pm-t-${m.slug}`, idP = `pm-p-${m.slug}`, idC = `pm-c-${m.slug}`;
              const mots = m.nom.split(" "), fin = mots.pop() ?? "";
              const cote = formatCote(m.P, m.H, locale).replace(/ /g, "\u00a0");
              return (
                <li key={m.slug}>
                  <Apparition retard={(i % 4) * 110} className="h-full">
                    {/* Pas de préchargement des fiches (prefetch={false}) : une fiche embarque le configurateur et le moteur, que la page des
                        portails ne doit pas faire charger en arrière-plan ; le clic charge la fiche à la demande. */}
                    <Link
                      href={v.lien}
                      prefetch={false}
                      aria-labelledby={ici ? `${idT} ${idC}` : idT}
                      aria-describedby={idP}
                      data-conseille={ici ? "" : undefined}
                      className={`pm-carte group grid grid-cols-[132px_1fr] gap-x-4 border-b border-[#e0d7cb] py-3.5 min-[560px]:flex min-[560px]:h-full min-[560px]:flex-col min-[560px]:border-b-0 min-[560px]:py-0 ${focusVisible}`}
                    >
                      <div className="pm-plaque">
                        {/* eslint-disable-next-line @next/next/no-img-element -- dessin SVG du moteur, déjà léger : pas de passage par l'optimiseur */}
                        <img src={v.src} width={600} height={400} loading="lazy" decoding="async" alt={t.modeles.alt(m.nom, nomStyle(v.style))} className="pm-dessin" />
                        <span className="pm-etiq" aria-hidden="true">
                          <span className="min-[560px]:hidden">{t.modeles.conseilleCourt}</span>
                          <span className="hidden min-[560px]:inline">{t.modeles.conseille}</span>
                        </span>
                        <span className="pm-mention" data-mention="" aria-hidden="true">{MENTION_SCENE[locale]}</span>
                      </div>
                      <div className="min-w-0 min-[560px]:flex min-[560px]:flex-1 min-[560px]:flex-col">
                        <h3 id={idT} className={`${serif.className} text-[1.3rem] leading-[1.15] text-[#2b2320] min-[560px]:mt-[18px] min-[560px]:text-[1.5rem] 2xl:text-[1.75rem]`}>
                          {mots.length > 0 && `${mots.join(" ")} `}
                          <span className="whitespace-nowrap">{fin}<span className="pm-fl" aria-hidden="true">→</span></span>
                        </h3>
                        {ici && <span id={idC} className="sr-only">{t.modeles.conseilleCache}</span>}
                        <p className="mt-1 text-[16px] leading-[1.35] text-[#4a4038] min-[560px]:mt-1.5 min-[560px]:leading-[1.4]">{t.modeles.phrase[m.slug]}</p>
                        <p className="mt-2 hidden text-[14px] leading-[1.45] text-[#5c5140] min-[560px]:block">{v.auto ? t.modeles.placeSansRail : t.modeles.place[m.slug]}</p>
                        <div id={idP} className="mt-2 min-[560px]:mt-auto min-[560px]:pt-4">
                          {v.depart === null ? (
                            <p className="text-[15px] leading-[1.35] text-[#5c5140]">{t.modeles.aEtudier}</p>
                          ) : (
                            <>
                              <p className="text-[15px] leading-[1.35] text-[#5c5140]">{avantC}<b className="text-[18px] font-medium tabular-nums text-[#1d1d1f]">{euros(v.depart)}</b>{apresC}</p>
                              {v.departSans !== null && <p className="mt-0.5 text-[15px] leading-[1.35] tabular-nums text-[#5c5140]">{t.modeles.sansPose(euros(v.departSans))}</p>}
                            </>
                          )}
                          <p className="mt-1 text-[14px] leading-[1.4] text-[#6f6357] min-[560px]:mt-1.5 min-[560px]:leading-[1.45]">
                            {v.auto ? t.modeles.ligneStyleSansRail(nomStyle(v.style), cote) : t.modeles.ligneStyle(nomStyle(v.style), cote, m.slug)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </Apparition>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 2. Le guide : trois questions, une à la fois, sans rien mesurer */}
      <section id="guide" aria-labelledby="pm-guide-t" className="pm-guide scroll-mt-6 bg-white py-14 lg:py-20">
        {/* Sans JavaScript, les réponses ne servent à rien : les boutons disparaissent, la question et son aide restent lisibles. */}
        <noscript><style>{".pm-js{display:none!important}"}</style></noscript>
        <div className="mx-auto max-w-6xl px-6">
          <div className="pm-guide-grille">
            <div>
              <h2 id="pm-guide-t" className={`${serif.className} text-balance text-[1.8rem] leading-[1.08] tracking-[-0.018em] text-[#2b2320] sm:text-[2.2rem]`}>{t.guide.h2}</h2>
              <p className="mt-2 text-[16px] leading-[1.5] text-[#5c5140]">{t.guide.sous}</p>
            </div>
            <div className="pm-guide-corps">
              {/* La figure garde la même place (3 : 2) pour les trois schémas et pour le dessin du résultat. */}
              <div className={`pm-fig ${vueConseille ? "pm-fig-scene" : ""} ${fondu}`} key={`f-${cle}`}>
                {q !== null ? (
                  <SchemaGuide question={q} locale={locale} label={t.guide.schema[q]} />
                ) : vueConseille && conseille ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- dessin SVG du moteur */}
                    <img src={vueConseille.src} width={600} height={400} decoding="async" alt={t.guide.alt(conseille.nom, nomStyle(vueConseille.style))} />
                    <span className="pm-mention" data-mention="" aria-hidden="true">{MENTION_SCENE[locale]}</span>
                  </>
                ) : null}
              </div>
              {/* Les sept états (trois questions, quatre résultats) sont empilés dans la même case de la grille : la hauteur est celle du plus
                  haut, quelle que soit la largeur ou la langue, et ne bouge plus d'un état à l'autre. Un seul se voit ; les autres sont masqués
                  (visibility), inertes et cachés aux lecteurs d'écran. Ils n'arrivent qu'une fois la page animée : le HTML du serveur ne porte
                  que l'état affiché (la première question), sans texte en double. */}
              <div aria-live="polite" className="pm-pile lg:min-h-[15rem]">{ETATS.filter((e) => monte || e === etat).map(rendre)}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
