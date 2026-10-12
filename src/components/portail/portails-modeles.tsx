"use client";

/**
 * La page des portails (refaite le 12/10/2026) : « Les quatre modèles » puis la bande du guide, dans un seul îlot parce qu'ils
 * partagent l'état du guide : la réponse du client règle la carte « conseillé chez vous » et, pour le coulissant, le dessin et
 * le prix « sans rail ». Les cartes sont dans le HTML initial : la page se lit sans JavaScript (le guide y cède la place à un
 * message qui renvoie aux modèles). Aucun moteur ici : les prix et les styles arrivent du serveur (donneesPagePortails), les
 * textes de portails-page.ts et portails-textes.ts, la logique du guide de portails-guide.ts (testée), les dessins de
 * public/images/portails/scenes. Mouvement : seulement opacity et transform.
 */
import "./portails-modeles.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { TEXTES_PORTAIL } from "@/lib/portails-textes";
import { MENTION_SCENE, ORDRE_MODELES, TXT, formatCote, prixPage, type ModeleCarte, type PropsModeles } from "@/lib/portails-page";
import {
  CLE_MEMOIRE_GUIDE, ETATS, conseilDe, conseilGuide, etatGuide, lireReponses, memoriserReponses, questionCourante, repondues,
  suivreAction, suivreReponse, suivreRetour, vueModele, type EtatGuide, type EtatResultat, type IndexQuestion, type SuiviGuide, type VueModele,
} from "@/lib/portails-guide";
import { focusVisible } from "@/lib/ui";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";
import { SchemaGuide } from "./schema-guide";

/** Faux abonnement : vrai dans le navigateur une fois la page animée, faux sur le serveur et pendant l'hydratation. */
const abonner = () => () => {};

/** Un texte à trou (« Posé dès {p} ») coupé autour du montant : le montant prend alors sa propre taille. */
const autour = (gabarit: (p: string) => string): [string, string] => {
  const [avant, apres] = gabarit("\u0001").split("\u0001");
  return [avant, apres ?? ""];
};

/**
 * La mémoire de la session : les réponses du guide, que le navigateur garde quand on revient de la fiche (sessionStorage), ou à défaut
 * une variable du module si le stockage est fermé. C'est une source externe : le composant la lit avec useSyncExternalStore, qui sert
 * « guide vierge » au serveur et pendant l'hydratation, puis les réponses gardées juste après : rien n'est lu avant l'hydratation.
 */
let enMemoire = "";
const ecouteurs = new Set<() => void>();
const lireMemoire = (): string => {
  try { return window.sessionStorage.getItem(CLE_MEMOIRE_GUIDE) ?? enMemoire; } catch { return enMemoire; }
};
const ecrireMemoire = (brut: string) => {
  enMemoire = brut;
  try { window.sessionStorage.setItem(CLE_MEMOIRE_GUIDE, brut); } catch { /* stockage fermé : le guide marche sans mémoire */ }
  ecouteurs.forEach((f) => f());
};
const souscrire = (f: () => void) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; };
const memoireDuServeur = () => "";

export function PortailsModeles({ locale, modeles, sansRail }: PropsModeles) {
  const t = TXT[locale], tp = TEXTES_PORTAIL[locale];
  const [anime, setAnime] = useState(false);
  const monte = useSyncExternalStore(abonner, () => true, () => false);
  const brut = useSyncExternalStore(souscrire, lireMemoire, memoireDuServeur);
  const guide = lireReponses(brut);
  // L'instant du dernier changement d'état : de quoi refuser un double appui (portails-guide.ts).
  const dernierChangement = useRef(Number.NEGATIVE_INFINITY);
  const euros = (n: number) => prixPage(n, locale);
  const ordonnes = ORDRE_MODELES.map((slug) => modeles.find((m) => m.slug === slug)).filter((m): m is ModeleCarte => !!m);
  const nomStyle = (s: ModeleCarte["style"]) => tp.styles[s];

  const etat = etatGuide(guide);
  const q = questionCourante(guide);
  const faites = repondues(guide);
  const cle = q === null ? "resultat" : `q${q}`;
  const conseil = conseilGuide(guide, ordonnes, sansRail, locale);
  const guidage = conseil?.vue.guidage;

  /** Le focus ne bouge que pour un geste du visiteur : pas quand les réponses gardées reviennent après l'hydratation. */
  const veutFocus = useRef(false);
  /** Un geste (clic sur « Oui », « Non », « Retour », « Recommencer ») : le suivi calculé par portails-guide.ts, ou le même objet si le clic est refusé. */
  const suiviCourant = (): SuiviGuide => ({ reponses: lireReponses(lireMemoire()), dernierChangement: dernierChangement.current });
  const geste = (calculer: (s: SuiviGuide) => SuiviGuide) => {
    const courant = suiviCourant();
    const suivant = calculer(courant);
    if (suivant === courant) return;
    dernierChangement.current = suivant.dernierChangement;
    veutFocus.current = true;
    setAnime(true);
    ecrireMemoire(memoriserReponses(suivant.reponses));
  };
  // L'instant du clic est celui de l'événement (event.timeStamp, en millisecondes comme performance.now()).
  const repondre = (i: IndexQuestion, v: boolean, instant: number) => geste((s) => suivreReponse(s, i, v, instant));
  const revenir = (i: IndexQuestion, instant: number) => geste((s) => suivreRetour(s, i, instant));
  /**
   * Le lien « Composer ce portail » et le « Besoin d'aide pour vérifier ? » ne changent pas l'état, mais le 2e appui d'un double tap les
   * atteint (ils sont posés sous le bouton qu'on vient de toucher) : un clic arrivé moins de 450 ms après un changement d'état est annulé
   * (preventDefault : le lien n'ouvre pas la fiche, le résumé ne se déplie pas).
   */
  const sauterSiTropTot = (ev: { timeStamp: number; preventDefault: () => void }) => {
    if (!suivreAction(suiviCourant(), ev.timeStamp)) ev.preventDefault();
  };

  // Le focus suit le guide : à chaque nouvel état voulu par un geste, il va sur le titre de la question ou du résultat (jamais au
  // premier affichage ni au retour des réponses gardées, jamais de défilement). La clé précédente est gardée pour que le double appel
  // du mode strict ne déplace pas le focus.
  const titreRef = useRef<HTMLHeadingElement>(null);
  const precedente = useRef(cle);
  useEffect(() => {
    if (precedente.current === cle) return;
    precedente.current = cle;
    if (!veutFocus.current) return;
    veutFocus.current = false;
    titreRef.current?.focus({ preventScroll: true });
  }, [cle]);

  const [avantG, apresG] = autour(t.guide.posedes);
  const [avantC, apresC] = autour(t.modeles.posedes);
  const fondu = anime || brut !== "" ? "pm-fondu" : "";
  /** L'alt d'un dessin : le coulissant dit s'il est sur rail ou sans rail (le dessin et le prix changent). */
  const altCarte = (m: ModeleCarte, style: ModeleCarte["style"], auto: boolean) =>
    m.slug === "portail-coulissant" ? t.modeles.altGuidage(m.nom, nomStyle(style), auto ? "auto" : "rail") : t.modeles.alt(m.nom, nomStyle(style));
  const altResultat = (m: ModeleCarte, style: ModeleCarte["style"], g: "rail" | "auto" | undefined) =>
    g ? t.guide.altGuidage(m.nom, nomStyle(style), g) : t.guide.alt(m.nom, nomStyle(style));

  /** « Retour » flotte en haut à droite, sur la ligne du petit texte du haut : sa présence ne change pas la hauteur du bloc. */
  const retour = (actif: boolean) => actif && faites.length > 0 && (
    <button type="button" className={`pm-js pm-retour lien-fleche absolute right-0 top-[-12px] min-h-[44px] min-w-[44px] justify-end text-[#2b2320] ${focusVisible}`} onClick={(ev) => revenir(faites[faites.length - 1], ev.timeStamp)}>{t.guide.retour}</button>
  );

  /** Un état du guide ; seul l'état courant est actif (titre à focaliser, boutons, lien). */
  const rendre = (e: EtatGuide) => {
    const actif = e === etat;
    const tete = { id: actif ? "pm-q-t" : undefined, ref: actif ? titreRef : undefined, tabIndex: actif ? -1 : undefined };
    const classe = `pm-etat ${actif ? "pm-actif" : ""} ${actif ? fondu : ""}`;
    const acces = { role: actif ? "group" : undefined, "aria-labelledby": actif ? "pm-q-t" : undefined, "aria-hidden": actif ? undefined : true, inert: !actif };
    if (e.startsWith("q")) {
      const i = Number(e[1]) as IndexQuestion;
      return (
        <div key={e} className={classe} {...acces}>
          {retour(actif)}
          <p className="text-[14px] leading-[1.4] text-[#6f6357]">{t.guide.question(i + 1)}</p>
          <div className="mb-4 mt-3 flex max-w-[200px] gap-1" aria-hidden="true">
            {[0, 1, 2].map((k) => <i key={k} className={`h-[3px] flex-1 rounded-[2px] ${k <= i ? "bg-[#1d1d1f]" : "bg-[#e0d7cb]"}`} />)}
          </div>
          <h3 {...tete} className={`${serif.className} text-balance text-[1.5rem] leading-[1.2] text-[#2b2320] lg:text-[1.75rem] ${focusVisible}`}>{tp.guideQ[i]}</h3>
          <p className="mt-2 max-w-[34em] text-pretty text-[16px] leading-[1.5] text-[#5c5140]">{tp.guideAide[i]}</p>
          <div className="pm-js pm-reps">
            <button type="button" className="btn-contour" onClick={(ev) => repondre(i, true, ev.timeStamp)}>{tp.guideOui[i]}</button>
            <button type="button" className="btn-contour" onClick={(ev) => repondre(i, false, ev.timeStamp)}>{tp.guideNon[i]}</button>
          </div>
          <details className="pm-plus mt-2">
            <summary className={`pm-aide ${focusVisible}`} onClick={sauterSiTropTot}>{tp.guideAideLien}</summary>
            <div className="max-w-[34em] pb-1 pt-1 text-[15px] leading-[1.55] text-[#5c5140]">
              <p>{tp.guideVocab}</p>
              <p className="mt-2">{tp.guideCtx[i]}</p>
              <p className="mt-2"><b className="font-semibold text-[#2b2320]">{tp.guideVerifTitre}.</b> {tp.guideVerif[i]}</p>
            </div>
          </details>
        </div>
      );
    }
    const c = conseilDe(e as EtatResultat, ordonnes, sansRail, locale);
    if (!c) return null;
    const { modele: m, vue: v } = c;
    const bouton = "btn-plein min-h-[48px] md:min-h-[52px]";
    return (
      <div key={e} className={classe} {...acces}>
        {retour(actif)}
        <p className="text-[14px] leading-[1.4] text-[#6f6357]">{tp.guideConseil}</p>
        <h3 {...tete} className={`${serif.className} mt-1 text-balance text-[2rem] leading-[1.06] text-[#2b2320] lg:text-[2.6rem] ${focusVisible}`}>{m.nom}</h3>
        {v.guidage && <p className="mt-1 text-[15px] font-semibold leading-[1.4] text-[#8a6233]">{tp.guidage[v.guidage]}</p>}
        <p className="mt-3 max-w-[34em] text-pretty text-[16px] leading-[1.5] text-[#4a4038]">{tp.guideRaison[e as EtatResultat]}</p>
        {v.depart !== null && (
          <p className="mt-3 text-[16px] leading-[1.5] text-[#5c5140]">
            {avantG}<b className="text-[20px] font-medium tabular-nums text-[#1d1d1f]">{euros(v.depart)}</b>{apresG}
            {v.departSans !== null && <span className="tabular-nums"> · {t.guide.sansPose(euros(v.departSans))}</span>}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1">
          {actif ? <Link href={v.lien} prefetch={false} className={bouton} onClick={sauterSiTropTot}>{t.vitrine.bouton}</Link> : <span className={bouton}>{t.vitrine.bouton}</span>}
          <button type="button" className={`pm-js lien-fleche min-h-[44px] text-[#2b2320] underline underline-offset-[0.2em] after:hidden ${focusVisible}`} onClick={(ev) => revenir(0, ev.timeStamp)}>{tp.guideRefaire}</button>
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
            <p className="text-pretty text-[15px] leading-[1.55] text-[#5c5140] lg:max-w-[34rem]">{t.modeles.legende}</p>
          </div>
          <ul className="mt-8 grid grid-cols-1 border-t border-[#e0d7cb] min-[560px]:grid-cols-2 min-[560px]:gap-x-6 min-[560px]:gap-y-12 min-[560px]:border-t-0 lg:mt-10 min-[1100px]:grid-cols-4">
            {ordonnes.map((m, i) => {
              const v = vueModele(m, sansRail, guidage, locale);
              const ici = conseil?.slug === m.slug;
              const idT = `pm-t-${m.slug}`, idP = `pm-p-${m.slug}`, idC = `pm-c-${m.slug}`;
              const mots = m.nom.split(" "), fin = mots.pop() ?? "";
              const cote = formatCote(m.P, m.H, locale).replace(/ /g, " ");
              // Le coulissant change de texte avec le guide (sur rail / sans rail) et les deux textes ne passent pas à la ligne aux mêmes largeurs :
              // l'autre variante est réservée dans un pseudo-élément invisible (data-autre, voir .pm-duo) pour que la carte garde sa hauteur.
              const autre = m.slug === "portail-coulissant" ? vueModele(m, sansRail, v.auto ? "rail" : "auto", locale) : null;
              const ligne = (x: VueModele) => (x.auto ? t.modeles.ligneStyleSansRail(nomStyle(x.style), cote) : t.modeles.ligneStyle(nomStyle(x.style), cote, m.slug));
              const place = (x: VueModele) => (x.auto ? t.modeles.placeSansRail : t.modeles.place[m.slug]);
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
                        <img src={v.src} width={600} height={400} loading="lazy" decoding="async" alt={altCarte(m, v.style, v.auto)} className="pm-dessin" />
                        {/* L'étiquette n'existe que sur la carte conseillée (rien de caché dans le HTML) ; elle apparaît en fondu, sans rien déplacer. */}
                        {ici && (
                          <span className="pm-etiq" aria-hidden="true">
                            <span className="min-[560px]:hidden">{t.modeles.conseilleCourt}</span>
                            <span className="hidden min-[560px]:inline">{t.modeles.conseille}</span>
                          </span>
                        )}
                        <span className="pm-mention" data-mention="" aria-hidden="true">{MENTION_SCENE[locale]}</span>
                      </div>
                      <div className="min-w-0 min-[560px]:flex min-[560px]:flex-1 min-[560px]:flex-col">
                        <h3 id={idT} className={`${serif.className} text-balance text-[1.3rem] leading-[1.15] text-[#2b2320] min-[560px]:mt-[18px] min-[560px]:text-[1.5rem] 2xl:text-[1.75rem]`}>
                          {mots.length > 0 && `${mots.join(" ")} `}
                          <span className="whitespace-nowrap">{fin}<span className="pm-fl" aria-hidden="true">→</span></span>
                        </h3>
                        {ici && <span id={idC} className="sr-only">{t.modeles.conseilleCache}</span>}
                        <p className="mt-1 text-pretty text-[16px] leading-[1.35] text-[#4a4038] min-[560px]:mt-1.5 min-[560px]:leading-[1.4]">{t.modeles.phrase[m.slug]}</p>
                        <p className="pm-duo mt-2 hidden text-pretty text-[14px] leading-[1.45] text-[#5c5140] min-[560px]:grid" data-autre={autre ? place(autre) : undefined}><span>{place(v)}</span></p>
                        <div id={idP} className="mt-2 min-[560px]:mt-auto min-[560px]:pt-4">
                          {v.depart === null ? (
                            <p className="text-[15px] leading-[1.35] text-[#5c5140]">{t.modeles.aEtudier}</p>
                          ) : (
                            <>
                              <p className="text-[15px] leading-[1.35] text-[#5c5140]">{avantC}<b className="text-[18px] font-medium tabular-nums text-[#1d1d1f]">{euros(v.depart)}</b>{apresC}</p>
                              {v.departSans !== null && <p className="mt-0.5 text-[15px] leading-[1.35] tabular-nums text-[#5c5140]">{t.modeles.sansPose(euros(v.departSans))}</p>}
                            </>
                          )}
                          <p className="pm-duo pm-ligne-style mt-1 grid text-[14px] leading-[1.4] text-[#6f6357] min-[560px]:mt-1.5 min-[560px]:leading-[1.45]" data-autre={autre ? ligne(autre) : undefined}>
                            <span>{ligne(v)}</span>
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
        <div className="mx-auto max-w-6xl px-6">
          <div className="pm-guide-grille">
            <div>
              <h2 id="pm-guide-t" className={`${serif.className} text-balance text-[1.8rem] leading-[1.08] tracking-[-0.018em] text-[#2b2320] sm:text-[2.2rem]`}>{t.guide.h2}</h2>
              <p className="pm-sous mt-2 text-[16px] leading-[1.5] text-[#5c5140]">{t.guide.sous}</p>
              {/* Sans JavaScript, les réponses ne servent à rien : la question et ses boutons cèdent la place à ce message (portails-modeles.css,
                  @media (scripting: none)). Un <noscript> ne s'affiche que dans ce cas : rien de caché dans le HTML pour les autres. */}
              <noscript>
                <p className="mt-3 max-w-[34em] text-[16px] leading-[1.5] text-[#4a4038]">{t.guide.sansJs}</p>
                <a href="#modeles" className={`lien-fleche min-h-[44px] text-[#2b2320] underline underline-offset-[0.2em] after:hidden ${focusVisible}`}>{t.vitrine.lienModeles}</a>
              </noscript>
            </div>
            <div className="pm-guide-corps">
              {/* La figure garde la même place (3 : 2) pour les trois schémas et pour le dessin du résultat. */}
              <div className={`pm-fig ${conseil ? "pm-fig-scene" : ""} ${fondu}`} key={`f-${cle}`}>
                {q !== null ? (
                  <SchemaGuide question={q} locale={locale} label={t.guide.schema[q]} />
                ) : conseil ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- dessin SVG du moteur */}
                    <img src={conseil.vue.src} width={600} height={400} decoding="async" alt={altResultat(conseil.modele, conseil.vue.style, conseil.vue.guidage)} />
                    <span className="pm-mention" data-mention="" aria-hidden="true">{MENTION_SCENE[locale]}</span>
                  </>
                ) : null}
              </div>
              {/* Les sept états (trois questions, quatre résultats) sont empilés dans la même case de la grille : la hauteur est celle du plus
                  haut et ne bouge plus d'un état à l'autre. Un seul se voit ; les autres sont masqués (visibility), inertes et cachés aux
                  lecteurs d'écran. Ils n'arrivent qu'une fois la page animée : le HTML du serveur ne porte que l'état affiché (la première
                  question), sans texte en double ; sa hauteur est réservée par portails-modeles.css (min-height par largeur), pour que le
                  premier affichage soit déjà celui de la page animée. Pas d'aria-live : le focus va sur le titre du nouvel état, qui est lu. */}
              <div className="pm-pile">{ETATS.filter((e) => monte || e === etat).map(rendre)}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
