"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { serif } from "@/lib/fonts";
import { focusVisible } from "@/lib/ui";
import { STYLES_PORTAIL, type StylePortail } from "@/lib/portails-base";
import { TEXTES_PORTAIL } from "@/lib/portails-textes";
import { TEINTES_PORTAIL } from "@/lib/portails-rendu";
import {
  MENTION_SCENE, RAL_TEINTE, TEINTES_VITRINE, TEINTE_VITRINE_DEPART, TXT,
  finitionDe, formatMetre, lienFiche, matiereVitrine, paramsVitrine, prixPlage, srcVitrine,
  type PropsVitrine, type Teinte,
} from "@/lib/portails-page";
import "./vitrine-portail.css";

/**
 * La vitrine de la page des portails (12/10/2026) : le portail battant en sept styles et six teintes, un seul dessin à la fois.
 * Îlot du navigateur ; le premier affichage est COMPLET côté serveur (Lames chêne, gris anthracite, son prix, son bouton) : la page
 * se lit sans JavaScript, qui ne sert qu'à changer de style et de teinte. Cahier des charges : sections 2.3 et 7.
 *
 * Le dessin change par deux couches d'image : la nouvelle se charge et se décode dans la couche cachée, puis arrive par-dessus
 * l'ancienne en fondu. Jusque-là l'ancien dessin reste, et la vignette ou la pastille touchée porte aria-busy.
 * Le prix vient du serveur (props.prix) ; aucun montant n'est écrit ici. Aucun saut : chaque texte qui change réserve la place
 * du plus grand de ses candidats (Reserve), le bouton ne bouge donc pas quand on parcourt les 42 états. Les gabarits de
 * réservation n'écrivent AUCUN texte dans la page : chacun est un attribut data-g que le CSS affiche (::after { content: attr(data-g) })
 * dans une case invisible et cachée des lecteurs d'écran ; le HTML du serveur ne porte donc ni libellé en double ni montant factice
 * (les chiffres du gabarit sont des 8, de même largeur que tous les chiffres en tabular-nums).
 * Aucun décalage non plus : le texte qui change est dans un nœud neuf (key), jamais un nœud qui se déplace.
 * Le choix (style, teinte) est gardé dans sessionStorage : au retour de la fiche, la vitrine le retrouve (voir lireChoix).
 */
type Etat = { style: StylePortail; teinte: Teinte };
type Occupe = { groupe: "style" | "teinte"; valeur: string } | null;
type Couche = 0 | 1;

const memeEtat = (a: Etat, b: Etat) => a.style === b.style && a.teinte === b.teinte;

/** Une image transparente de 1 pixel : la couche cachée a une adresse valide avant le premier changement. */
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Le choix est gardé le temps de l'onglet : on regarde la fiche, on revient, la vitrine est comme on l'a laissée. */
const CLE_CHOIX = "auboiacier:vitrine-portail";
function lireChoix(): Etat | null {
  try {
    const brut = sessionStorage.getItem(CLE_CHOIX);
    if (!brut) return null;
    const o = JSON.parse(brut) as Partial<Etat> | null;
    if (o && STYLES_PORTAIL.includes(o.style as StylePortail) && TEINTES_VITRINE.includes(o.teinte as Teinte)) return { style: o.style as StylePortail, teinte: o.teinte as Teinte };
  } catch { /* stockage bloqué ou contenu illisible : la vitrine reste sur son état de départ */ }
  return null;
}
/** Rien n'est gardé tant qu'on est sur l'état de départ ; un stockage bloqué ne casse rien. */
function garderChoix(e: Etat, styleDepart: StylePortail) {
  try {
    if (e.style === styleDepart && e.teinte === TEINTE_VITRINE_DEPART) sessionStorage.removeItem(CLE_CHOIX);
    else sessionStorage.setItem(CLE_CHOIX, JSON.stringify(e));
  } catch { /* idem */ }
}

/**
 * Le retour du bouton « Composer » : la fiche (moteur compris) n'est pas préchargée, elle met un moment à venir. Tant que la
 * navigation se prépare, le lien porte aria-busy et s'estompe un peu (CSS : opacity). Aucun texte, aucune place prise.
 */
function EtatLien() {
  const { pending } = useLinkStatus();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const lien = ref.current?.closest("a");
    if (!lien) return;
    if (pending) lien.setAttribute("aria-busy", "true");
    else lien.removeAttribute("aria-busy");
    return () => lien.removeAttribute("aria-busy");
  }, [pending]);
  return <span ref={ref} hidden />;
}

/** Le texte, avec un morceau en gras (le montant, le nom de la teinte) : les textes viennent d'une seule phrase de portails-page.ts. */
function enGras(texte: string, morceau: string): ReactNode {
  const i = texte.indexOf(morceau);
  if (i < 0) return texte;
  // key : quand le morceau change (autre style, autre teinte), le texte entier est un nœud neuf : le bout de phrase qui suit le gras
  // ne « glisse » pas, il est remplacé (aucun décalage de mise en page).
  return (
    <span key={morceau}>
      {texte.slice(0, i)}
      <b className="font-semibold text-[#1d1d1f]">{morceau}</b>
      {texte.slice(i + morceau.length)}
    </span>
  );
}

/**
 * Un texte qui change sans que la page bouge : les gabarits (invisibles, cachés des lecteurs d'écran) sont posés dans la même
 * case de grille que le texte visible ; la case a la hauteur du plus grand, à toute largeur et dans les deux langues.
 * Un gabarit n'est pas du texte : c'est un attribut (data-g) que vitrine-portail.css affiche en ::after ; le HTML n'en garde rien.
 * Le texte visible est dans un nœud neuf à chaque changement (key = le texte) : rien ne se déplace, tout est remplacé.
 */
function Reserve({ gabarits, className = "", children }: { gabarits: string[]; className?: string; children?: ReactNode }) {
  return (
    <div className={`grid ${className}`}>
      <div aria-hidden className="invisible grid [grid-area:1/1]">
        {gabarits.map((g, i) => <span key={i} className="vit-g [grid-area:1/1]" data-g={g} />)}
      </div>
      <p className="[grid-area:1/1]"><span key={typeof children === "string" ? children : undefined}>{children}</span></p>
    </div>
  );
}

/** Le gabarit de la ligne « sans pose » : la phrase du plus long des états, coupée au montant (en gras dans la vraie ligne). */
function GabaritLigne({ phrase, montant }: { phrase: string; montant: string }) {
  const i = phrase.indexOf(montant);
  const avant = i < 0 ? phrase : phrase.slice(0, i);
  const apres = i < 0 ? "" : phrase.slice(i + montant.length);
  return (
    <p aria-hidden className="vit-ligne-sans mt-1 text-[15px] leading-[1.45] tabular-nums">
      {avant ? <span className="vit-g" data-g={avant} /> : null}
      {i < 0 ? null : <b className="vit-g font-semibold" data-g={montant} />}
      {apres ? <span className="vit-g" data-g={apres} /> : null}
    </p>
  );
}

/**
 * Le dessin demandé est chargé ET décodé avant d'arriver : pas de clignotement. decode() sans réponse après 1,5 s : on affiche
 * quand même. « Chargé » veut dire que c'est bien l'adresse demandée (la couche garde sa dernière image jusqu'à l'arrivée de la nouvelle).
 */
async function pret(img: HTMLImageElement, voulu: string): Promise<boolean> {
  const charge = await new Promise<boolean>((resolve) => {
    if (img.complete && img.currentSrc === voulu) { resolve(img.naturalWidth > 0); return; }
    img.addEventListener("load", () => resolve(true), { once: true });
    img.addEventListener("error", () => resolve(false), { once: true });
  });
  if (!charge) return false;
  if (typeof img.decode === "function") {
    await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
  }
  return true;
}

export function VitrinePortail({ locale, prix, styleInitial, cote }: PropsVitrine) {
  const t = TXT[locale].vitrine;
  const tx = TEXTES_PORTAIL[locale];
  const idTitre = useId();

  const depart: Etat = { style: styleInitial, teinte: TEINTE_VITRINE_DEPART };
  const [etat, setEtat] = useState<Etat>(depart);       // le choix : texte, prix, adresse du bouton
  const [vue, setVue] = useState<Etat>(depart);         // le dessin à l'écran (il suit le choix dès qu'il est prêt)
  const [actif, setActif] = useState<Couche>(0);
  const [occupe, setOccupe] = useState<Occupe>(null);
  const etatRef = useRef<Etat>(depart);
  const vueRef = useRef<Etat>(depart);
  const actifRef = useRef<Couche>(0);
  const demande = useRef(0);
  const couches = useRef<(HTMLImageElement | null)[]>([null, null]);
  const preCharges = useRef(new Map<string, HTMLImageElement>());
  const tuiles = useRef<(HTMLButtonElement | null)[]>([]);
  const pastilles = useRef<(HTMLButtonElement | null)[]>([]);

  /** Un choix : le texte et le prix changent tout de suite, le dessin arrive quand il est prêt ; un choix plus récent prend le relais. */
  const choisir = useCallback(async (prochain: Etat, touche: NonNullable<Occupe>) => {
    if (memeEtat(prochain, etatRef.current)) return;
    etatRef.current = prochain;
    setEtat(prochain);
    garderChoix(prochain, styleInitial);
    const mien = ++demande.current;
    if (memeEtat(prochain, vueRef.current)) { setOccupe(null); return; }   // retour au dessin déjà affiché
    setOccupe(touche);
    const cachee = couches.current[actifRef.current === 0 ? 1 : 0];
    if (!cachee) return;
    const src = srcVitrine(prochain.style, prochain.teinte);
    cachee.src = src;
    const ok = await pret(cachee, new URL(src, document.baseURI).href);
    if (mien !== demande.current) return;
    if (!ok) {                                        // erreur de chargement : retour à l'état précédent, sans message
      etatRef.current = vueRef.current;
      setEtat(vueRef.current);
      garderChoix(vueRef.current, styleInitial);
      setOccupe(null);
      return;
    }
    vueRef.current = prochain;
    actifRef.current = actifRef.current === 0 ? 1 : 0;
    setVue(prochain);
    setActif(actifRef.current);
    setOccupe(null);
  }, [styleInitial]);

  /** Au retour de la fiche (ou à un rechargement), le choix gardé revient après l'hydratation : le texte et le prix changent sans bouger la page, le dessin arrive en fondu. */
  useEffect(() => {
    const choix = lireChoix();
    if (!choix || memeEtat(choix, etatRef.current)) return;
    void choisir(choix, choix.style !== etatRef.current.style ? { groupe: "style", valeur: choix.style } : { groupe: "teinte", valeur: choix.teinte });
  }, [choisir]);

  /** Au survol, au focus et au toucher : le fichier du choix possible se charge déjà. */
  function precharger(src: string) {
    if (preCharges.current.has(src)) return;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    preCharges.current.set(src, img);
  }

  /** Groupe de boutons radio : une seule tabulation, les flèches passent au choix voisin et le sélectionnent. */
  function fleches<T extends string>(e: KeyboardEvent, valeurs: readonly T[], courant: T, boutons: (HTMLButtonElement | null)[], aller: (v: T) => void) {
    // Cmd+←, Alt+→ (retour et avance du navigateur), Ctrl et Maj : ce ne sont pas des flèches de groupe, on n'y touche pas.
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
    const n = valeurs.length;
    const i = valeurs.indexOf(courant);
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    aller(valeurs[j]);
    boutons[j]?.focus();
  }

  const nomStyle = (s: StylePortail) => tx.styles[s];
  const nomTeinte = (c: Teinte) => tx.couleur[c];
  const etiquetteTeinte = (c: Teinte) => `${nomTeinte(c)}${RAL_TEINTE[c] ? `, ${RAL_TEINTE[c]}` : ""}`;

  // Le prix du choix : celui du serveur, finition laquée ou brute ; la tôle est une fourchette (neuf dessins).
  const p = prix[finitionDe(etat.teinte)][etat.style];
  const pose = p.pose === null ? null : prixPlage(p.pose, p.poseMax, locale);
  const sans = p.sansPose === null ? null : prixPlage(p.sansPose, p.sansPoseMax, locale);
  const ligneSans = (texte: string) => enGras(t.sansPose(texte), texte);
  // Le gabarit de la ligne « sans pose » : le plus long de tous les états (une fourchette), pour que la ligne garde sa hauteur.
  // Les chiffres y sont des 8 (même largeur que tous les chiffres) et vivent dans un attribut : aucun montant n'est écrit dans la page.
  const montantsSans = Object.values(prix).flatMap((table) => Object.values(table))
    .flatMap((x) => (x.sansPose === null ? [] : [prixPlage(x.sansPose, x.sansPoseMax, locale).texte]));
  const montantGabarit = montantsSans.reduce((a, b) => (t.sansPose(b).length > t.sansPose(a).length ? b : a), "").replace(/\d/g, "8");

  const matiere = (style: StylePortail, teinte: Teinte) => {
    if (style === "tole") return teinte === "galva" ? t.matiere.toleBrut : t.matiere.toleLaque;
    if (teinte === "galva") return t.matiere.brut;
    return matiereVitrine(style, teinte) === "alu" ? t.matiere.aluLaque : t.matiere.acierLaque;
  };
  const toutesMatieres = [t.matiere.aluLaque, t.matiere.acierLaque, t.matiere.toleLaque, t.matiere.brut, t.matiere.toleBrut];
  // La note du style : en galvanisé brut tout est en acier, la note ne dit plus « alu » quand une note propre au brut existe.
  const noteDe = (style: StylePortail, teinte: Teinte) => (teinte === "galva" ? t.notesBrut[style] : undefined) ?? tx.stylesNote[style];
  const toutesNotes = [...STYLES_PORTAIL.map((s) => tx.stylesNote[s]), ...Object.values(t.notesBrut).filter((n): n is string => Boolean(n))];

  const lienCompose = lienFiche(locale, "portail-battant", paramsVitrine(etat.style, etat.teinte));
  const phraseCote = t.cote(formatMetre(cote.P, locale), formatMetre(cote.H, locale));
  const ral = RAL_TEINTE[etat.teinte];
  const altVue = t.alt(nomStyle(vue.style).toLowerCase(), nomTeinte(vue.teinte));

  return (
    <section aria-labelledby={idTitre}>
      <h2 id={idTitre} className="sr-only">{t.h2}</h2>

      <div className="vit">
        {/* La plaque : deux couches d'image empilées (dimensions écrites : aucun saut), la mention en bas à droite. */}
        <div className="vit-plaque">
          {/* eslint-disable-next-line @next/next/no-img-element -- un dessin SVG du moteur, tiré une fois pour toutes (fondu entre deux couches) */}
          <img
            ref={(el) => { couches.current[0] = el; }}
            className="vit-img" data-on={actif === 0 ? "" : undefined}
            src={srcVitrine(styleInitial, TEINTE_VITRINE_DEPART)} alt={actif === 0 ? altVue : ""}
            width={1300} height={743} fetchPriority="high" decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- idem : la couche cachée, une image transparente tant qu'on n'a pas changé de choix */}
          <img
            ref={(el) => { couches.current[1] = el; }}
            className="vit-img" data-on={actif === 1 ? "" : undefined}
            src={PIXEL} alt={actif === 1 ? altVue : ""} aria-hidden={actif === 1 ? undefined : true}
            width={1300} height={743} decoding="async"
          />
          <span data-mention aria-hidden className="vit-mention">{MENTION_SCENE[locale]}</span>
        </div>

        {/* Le haut : le surtitre, le nom du style (ce n'est pas un titre : il change au clic), sa note, puis le prix. */}
        <div className="vit-haut min-w-0">
          <p className="surtitre">{t.surtitre}</p>
          <Reserve gabarits={STYLES_PORTAIL.map(nomStyle)} className={`vit-style mt-1 [text-wrap:balance] ${serif.className} text-[2rem] leading-[1.06] tracking-[-0.012em] text-[#2b2320] lg:text-[2.4rem] 2xl:text-[2.7rem]`}>
            {nomStyle(etat.style)}
          </Reserve>
          <Reserve gabarits={toutesNotes} className="vit-note mt-2 text-[16px] leading-[1.5] text-[#4a4038]">
            {noteDe(etat.style, etat.teinte)}
          </Reserve>

          {/* Le prix. Le texte reste en haut ; la case a la hauteur du plus grand des états (fourchette, ligne de la tôle), invisible :
              sous le prix il reste un blanc constant, et rien dessous ne bouge d'un style à l'autre. Les trois lignes du gabarit sont
              des attributs (data-g), pas du texte. Le contenu visible est un bloc neuf quand le prix passe de un montant à une
              fourchette (key) : le mot « posé » et les lignes qui suivent sont remplacés, ils ne glissent pas. */}
          <div className="vit-prixbloc mt-4 grid border-t border-[#e0d7cb] pt-4 lg:mt-5 lg:pt-5" aria-live="polite" aria-atomic="true">
            <div aria-hidden className="invisible [grid-area:1/1]">
              <p className="vit-a" />
              {montantGabarit ? <GabaritLigne phrase={t.sansPose(montantGabarit)} montant={montantGabarit} /> : null}
              <p className="vit-g mt-2 text-[14px] leading-[1.45]" data-g={`${phraseCote} ${t.tole}`} />
            </div>
            <div key={pose ? (pose.plage ? "plage" : "montant") : "sans-prix"} className="[grid-area:1/1]">
              {pose ? (
                <p className="vit-a vit-prix flex items-baseline whitespace-nowrap text-[17px] text-[#5c5140]" data-plage={pose.plage ? "" : undefined}>
                  <span className="vit-montant font-medium tracking-[-0.01em] text-[#1d1d1f] tabular-nums">{pose.texte}</span>
                  <span className="leading-none">{t.pose}</span>
                </p>
              ) : (
                <p className="vit-a text-[1.35rem] font-medium leading-[1.2] text-[#1d1d1f]">{t.sansPrix}</p>
              )}
              {pose && sans ? <p className="mt-1 text-[15px] leading-[1.45] text-[#5c5140]">{ligneSans(sans.texte)}</p> : null}
              <p className="mt-2 text-[14px] leading-[1.45] text-[#6f6357]">{phraseCote}{pose && etat.style === "tole" ? ` ${t.tole}` : ""}</p>
            </div>
          </div>
        </div>

        {/* Les sept styles en vignettes : le dessin de chaque style en gris anthracite (le même fichier que la vitrine). Le libellé
            « Style : … » au-dessus dit qu'elles se choisissent, comme « Teinte : » pour les pastilles. */}
        <div className="vit-tuiles-bloc">
          <p className="vit-lib-style mb-2 text-[14px] leading-[1.45] text-[#6f6357]">{enGras(t.style(nomStyle(etat.style)), nomStyle(etat.style))}</p>
          <div
            role="radiogroup" aria-label={t.styleGroupe}
            className="vit-tuiles grid grid-cols-4 gap-2 min-[768px]:grid-cols-7"
            onKeyDown={(e) => fleches(e, STYLES_PORTAIL, etatRef.current.style, tuiles.current, (s) => choisir({ ...etatRef.current, style: s }, { groupe: "style", valeur: s }))}
          >
            {STYLES_PORTAIL.map((s, i) => {
              const choisi = etat.style === s;
              const src = srcVitrine(s, "anthracite");
              return (
                <button
                  key={s} ref={(el) => { tuiles.current[i] = el; }}
                  type="button" role="radio" aria-checked={choisi} tabIndex={choisi ? 0 : -1}
                  aria-busy={occupe?.groupe === "style" && occupe.valeur === s ? true : undefined}
                  className={`vit-tuile block min-w-0 rounded-[10px] text-center ${focusVisible}`}
                  onClick={() => choisir({ ...etatRef.current, style: s }, { groupe: "style", valeur: s })}
                  onPointerEnter={() => precharger(srcVitrine(s, etatRef.current.teinte))}
                  onPointerDown={() => precharger(srcVitrine(s, etatRef.current.teinte))}
                  onFocus={() => precharger(srcVitrine(s, etatRef.current.teinte))}
                >
                  <span className="vit-vig">
                    {/* eslint-disable-next-line @next/next/no-img-element -- la vignette est le dessin du style, en SVG */}
                    <img src={src} alt="" width={1300} height={743} loading={s === "volutes" || s === "tole" ? "lazy" : undefined} fetchPriority="low" decoding="async" />
                  </span>
                  {/* Le nom : la case a la hauteur du nom en gras (le style choisi), à toute largeur et dans les deux langues ; le gabarit est
                      un attribut (data-g), le texte visible est un nœud neuf quand le nom passe en gras (aucun décalage). */}
                  <span className="vit-nom mt-1.5 grid text-[14px] leading-[1.25] text-[#5c5140]">
                    <span aria-hidden className="vit-g invisible font-semibold [grid-area:1/1]" data-g={nomStyle(s)} />
                    <span key={choisi ? "choisi" : "autre"} className="[grid-area:1/1]">{nomStyle(s)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Le bas : la teinte, la matière, le bouton qui ouvre la fiche à ce choix, et les deux liens vers la suite de la page. */}
        <div className="vit-bas min-w-0">
          <p className="vit-lib-teinte mt-1 text-[14px] leading-[1.45] text-[#6f6357] lg:mt-5">{enGras(t.teinte(nomTeinte(etat.teinte), ral), nomTeinte(etat.teinte))}</p>
          <div
            role="radiogroup" aria-label={t.teinteGroupe}
            className="vit-pastilles -ml-2 flex"
            onKeyDown={(e) => fleches(e, TEINTES_VITRINE, etatRef.current.teinte, pastilles.current, (c) => choisir({ ...etatRef.current, teinte: c }, { groupe: "teinte", valeur: c }))}
          >
            {TEINTES_VITRINE.map((c, i) => {
              const choisie = etat.teinte === c;
              return (
                <button
                  key={c} ref={(el) => { pastilles.current[i] = el; }}
                  type="button" role="radio" aria-checked={choisie} tabIndex={choisie ? 0 : -1}
                  aria-label={etiquetteTeinte(c)}
                  aria-busy={occupe?.groupe === "teinte" && occupe.valeur === c ? true : undefined}
                  className={`vit-pastille ${focusVisible}`}
                  onClick={() => choisir({ ...etatRef.current, teinte: c }, { groupe: "teinte", valeur: c })}
                  onPointerEnter={() => precharger(srcVitrine(etatRef.current.style, c))}
                  onPointerDown={() => precharger(srcVitrine(etatRef.current.style, c))}
                  onFocus={() => precharger(srcVitrine(etatRef.current.style, c))}
                >
                  <span className="vit-rond" style={{ background: TEINTES_PORTAIL[c][0] }} />
                </button>
              );
            })}
          </div>
          <Reserve gabarits={toutesMatieres} className="vit-matiere mt-2 text-[14px] leading-[1.45] text-[#5c5140]">
            {matiere(etat.style, etat.teinte)}
          </Reserve>

          <Link href={lienCompose} prefetch={false} className={`vit-compose btn-plein mt-5 min-h-[48px] w-full md:min-h-[52px] min-[560px]:w-auto ${focusVisible}`}>
            {t.bouton}
            <EtatLien />
          </Link>
          <div className="mt-1 flex flex-col min-[560px]:flex-row min-[560px]:flex-wrap min-[560px]:gap-x-6">
            <a href="#modeles" className={`lien-fleche min-h-[44px] text-[#1d1d1f] ${focusVisible}`}>{t.lienModeles}</a>
            <a href="#guide" className={`lien-fleche min-h-[44px] text-[#1d1d1f] ${focusVisible}`}>{t.lienGuide}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
