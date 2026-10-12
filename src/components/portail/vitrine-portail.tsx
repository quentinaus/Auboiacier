"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
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
 * du plus grand de ses candidats (Reserve), le bouton ne bouge donc pas quand on parcourt les 42 états.
 */
type Etat = { style: StylePortail; teinte: Teinte };
type Occupe = { groupe: "style" | "teinte"; valeur: string } | null;
type Couche = 0 | 1;

const memeEtat = (a: Etat, b: Etat) => a.style === b.style && a.teinte === b.teinte;

/** Le texte, avec un morceau en gras (le montant, le nom de la teinte) : les textes viennent d'une seule phrase de portails-page.ts. */
function enGras(texte: string, morceau: string): ReactNode {
  const i = texte.indexOf(morceau);
  if (i < 0) return texte;
  return (
    <>
      {texte.slice(0, i)}
      <b className="font-semibold text-[#1d1d1f]">{morceau}</b>
      {texte.slice(i + morceau.length)}
    </>
  );
}

/**
 * Un texte qui change sans que la page bouge : les gabarits (invisibles, cachés des lecteurs d'écran) sont posés dans la même
 * case de grille que le texte visible ; la case a la hauteur du plus grand, à toute largeur et dans les deux langues.
 */
function Reserve({ gabarits, className = "", children }: { gabarits: ReactNode[]; className?: string; children?: ReactNode }) {
  return (
    <div className={`grid ${className}`}>
      <div aria-hidden className="invisible grid [grid-area:1/1]">
        {gabarits.map((g, i) => <span key={i} className="[grid-area:1/1]">{g}</span>)}
      </div>
      <p className="[grid-area:1/1]">{children}</p>
    </div>
  );
}

/** Le dessin est chargé ET décodé avant d'arriver : pas de clignotement. decode() sans réponse après 1,5 s : on affiche quand même. */
async function pret(img: HTMLImageElement): Promise<boolean> {
  const charge = await new Promise<boolean>((resolve) => {
    if (img.complete) { resolve(img.naturalWidth > 0); return; }
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
  async function choisir(prochain: Etat, touche: NonNullable<Occupe>) {
    if (memeEtat(prochain, etatRef.current)) return;
    etatRef.current = prochain;
    setEtat(prochain);
    const mien = ++demande.current;
    if (memeEtat(prochain, vueRef.current)) { setOccupe(null); return; }   // retour au dessin déjà affiché
    setOccupe(touche);
    const cachee = couches.current[actifRef.current === 0 ? 1 : 0];
    if (!cachee) return;
    cachee.src = srcVitrine(prochain.style, prochain.teinte);
    const ok = await pret(cachee);
    if (mien !== demande.current) return;
    if (!ok) {                                        // erreur de chargement : retour à l'état précédent, sans message
      etatRef.current = vueRef.current;
      setEtat(vueRef.current);
      setOccupe(null);
      return;
    }
    vueRef.current = prochain;
    actifRef.current = actifRef.current === 0 ? 1 : 0;
    setVue(prochain);
    setActif(actifRef.current);
    setOccupe(null);
  }

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
  const textesSans = Object.values(prix).flatMap((table) => Object.values(table))
    .flatMap((x) => (x.sansPose === null ? [] : [t.sansPose(prixPlage(x.sansPose, x.sansPoseMax, locale).texte)]));
  const gabaritSans = textesSans.reduce((a, b) => (b.length > a.length ? b : a), "");

  const matiere = (style: StylePortail, teinte: Teinte) => {
    if (style === "tole") return teinte === "galva" ? t.matiere.toleBrut : t.matiere.toleLaque;
    if (teinte === "galva") return t.matiere.brut;
    return matiereVitrine(style, teinte) === "alu" ? t.matiere.aluLaque : t.matiere.acierLaque;
  };
  const toutesMatieres = [t.matiere.aluLaque, t.matiere.acierLaque, t.matiere.toleLaque, t.matiere.brut, t.matiere.toleBrut];

  const lienCompose = lienFiche(locale, "portail-battant", paramsVitrine(etat.style, etat.teinte));
  const phraseCote = t.cote(formatMetre(cote.P, locale), formatMetre(cote.H, locale));
  const ral = RAL_TEINTE[etat.teinte];
  const altVue = t.alt(nomStyle(vue.style), nomTeinte(vue.teinte));

  return (
    <section aria-labelledby={idTitre}>
      <h2 id={idTitre} className="sr-only">{t.h2}</h2>
      {/* Sans JavaScript : les vignettes et les pastilles ne feraient rien ; la vitrine reste lisible, avec son prix et son bouton. */}
      <noscript><style>{".vit-tuiles,.vit-pastilles{display:none}"}</style></noscript>

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
          {/* eslint-disable-next-line @next/next/no-img-element -- idem : la couche cachée, sans dessin tant qu'on n'a pas changé de choix */}
          <img
            ref={(el) => { couches.current[1] = el; }}
            className="vit-img" data-on={actif === 1 ? "" : undefined}
            alt={actif === 1 ? altVue : ""} aria-hidden={actif === 1 ? undefined : true}
            width={1300} height={743} decoding="async"
          />
          <span data-mention aria-hidden className="vit-mention">{MENTION_SCENE[locale]}</span>
        </div>

        {/* Le haut : le surtitre, le nom du style (ce n'est pas un titre : il change au clic), sa note, puis le prix. */}
        <div className="vit-haut min-w-0">
          <p className="surtitre">{t.surtitre}</p>
          <Reserve gabarits={STYLES_PORTAIL.map(nomStyle)} className={`mt-1 ${serif.className} text-[2rem] leading-[1.06] tracking-[-0.012em] text-[#2b2320] lg:text-[2.4rem] 2xl:text-[2.7rem]`}>
            {nomStyle(etat.style)}
          </Reserve>
          <Reserve gabarits={STYLES_PORTAIL.map((s) => tx.stylesNote[s])} className="mt-2 text-[16px] leading-[1.5] text-[#4a4038]">
            {tx.stylesNote[etat.style]}
          </Reserve>

          {/* Le prix. Le texte reste en haut ; la case a la hauteur du plus grand des états (fourchette sur deux lignes, ligne de la
              tôle), invisible : sous le prix il reste un blanc constant, et rien dessous ne bouge d'un style à l'autre. */}
          <div className="mt-4 grid border-t border-[#e0d7cb] pt-4 lg:mt-5 lg:pt-5" aria-live="polite" aria-atomic="true">
            <div aria-hidden className="invisible [grid-area:1/1]">
              <p className="vit-a">{"\u00a0"}</p>
              <p className="mt-1 text-[15px] leading-[1.45]">{gabaritSans}</p>
              <p className="mt-2 text-[14px] leading-[1.45]">{phraseCote}</p>
              <p className="text-[14px] leading-[1.45]">{t.tole}</p>
            </div>
            <div className="[grid-area:1/1]">
              {pose ? (
                <p className="vit-a flex items-baseline gap-x-[.45em] whitespace-nowrap text-[17px] text-[#5c5140]" data-plage={pose.plage ? "" : undefined}>
                  <span className="vit-montant font-medium tracking-[-0.01em] text-[#1d1d1f] tabular-nums">{pose.texte}</span>
                  <span className="leading-none">{t.pose}</span>
                </p>
              ) : (
                <p className="vit-a text-[1.35rem] font-medium leading-[1.2] text-[#1d1d1f]">{t.sansPrix}</p>
              )}
              {pose && sans ? <p className="mt-1 text-[15px] leading-[1.45] text-[#5c5140]">{ligneSans(sans.texte)}</p> : null}
              <p className="mt-2 text-[14px] leading-[1.45] text-[#6f6357]">{phraseCote}</p>
              {pose && etat.style === "tole" ? <p className="text-[14px] leading-[1.45] text-[#6f6357]">{t.tole}</p> : null}
            </div>
          </div>
        </div>

        {/* Les sept styles en vignettes : le dessin de chaque style en gris anthracite (le même fichier que la vitrine). */}
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
                <span className="vit-nom mt-1.5 block min-h-[2.5em] px-0.5 min-[1360px]:min-h-[1.25em] text-[14px] leading-[1.25] text-[#5c5140]">{nomStyle(s)}</span>
              </button>
            );
          })}
        </div>

        {/* Le bas : la teinte, la matière, le bouton qui ouvre la fiche à ce choix, et les deux liens vers la suite de la page. */}
        <div className="vit-bas min-w-0">
          <p className="mt-1 text-[14px] leading-[1.45] text-[#6f6357] lg:mt-5">{enGras(t.teinte(nomTeinte(etat.teinte), ral), nomTeinte(etat.teinte))}</p>
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
                  aria-label={etiquetteTeinte(c)} title={etiquetteTeinte(c)}
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
          <Reserve gabarits={toutesMatieres} className="mt-2 text-[14px] leading-[1.45] text-[#5c5140]">
            {matiere(etat.style, etat.teinte)}
          </Reserve>

          <Link href={lienCompose} prefetch={false} className={`btn-plein mt-5 min-h-[48px] w-full md:min-h-[52px] min-[560px]:w-auto ${focusVisible}`}>
            {t.bouton}
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
