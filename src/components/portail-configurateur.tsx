"use client";

/**
 * Le bloc « Configuration » d'une fiche portail (étude du 06/10/2026 avec Quentin) : le client compose son portail par
 * blocs, le dessin suit à l'échelle et le prix se calcule.
 *
 * - Le DESSIN vient du moteur de l'outil de plans, extrait tel quel (src/lib/portails-outil/moteur.genere.mjs), rendu par
 *   le svgDe de l'outil (copié avec le moteur des portails) : jamais redessiné ici. Seules les couleurs changent (src/lib/portails-rendu.ts).
 * - Le PRIX vient du serveur (/api/prix-portail) : aucun coût dans ce fichier.
 * - Règles de mise en page de Quentin : le bloc tient dans l'écran sans faire défiler la page (ce qui est long défile
 *   À L'INTÉRIEUR du panneau), le dessin reste visible à côté de ce qu'on change, sur ordinateur, tablette et téléphone ;
 *   les styles en bandeau de visuels en bas ; chaque choix est une pilule segmentée (role="radiogroup").
 */
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { svgDe } from "@/lib/portails-outil/moteur.genere.mjs";
import {
  appliquerStyle, bornesPortail, configDepart, guidePortail, planPortail, resumeConfig, styleDe, versParams,
  COULEURS_PORTAIL, STYLES_PORTAIL, TEXTES_PORTAIL, type ConfigPortail, type Langue, type SlugPortail,
} from "@/lib/portails";
import { STYLE_RENDU_PORTAIL, TEINTES_PORTAIL } from "@/lib/portails-rendu";
import { prixAffiche } from "@/lib/ui";
import { serif } from "@/lib/fonts";

type Onglet = "cotes" | "style" | "compo" | "pose";
type EtatPrix = { etat: "calcul" } | { etat: "ok"; prix: number; avertissements: string[] } | { etat: "etudier"; alertes: string[] } | { etat: "indispo" };
type Reponse = { cle: string; etat: EtatPrix };

/** Une vue de l'outil en SVG, sans ses cotes si on le demande. */
function Vue({ prims, petit, sansCotes, couleur, className, label }: { prims: { t: string }[]; petit?: boolean; sansCotes?: boolean; couleur: ConfigPortail["couleur"]; className?: string; label: string }) {
  const r = useMemo(() => svgDe(sansCotes ? prims.filter((p) => p.t !== "cote" && p.t !== "texte") : prims, petit ?? false), [prims, petit, sansCotes]);
  // Sans cotes, la marge que svgDe garde pour leurs chiffres ne sert à rien : on serre le cadre sur le dessin.
  const m = sansCotes ? r.fs * 8.5 * 0.9 : 0;
  const vb = [r.vb[0] + m, r.vb[1] + m, r.vb[2] - 2 * m, r.vb[3] - 2 * m];
  return (
    <svg role="img" aria-label={label} viewBox={vb.map((x) => x.toFixed(1)).join(" ")} className={className} preserveAspectRatio="xMidYMid meet">
      <style>{STYLE_RENDU_PORTAIL(couleur)}</style>
      <g dangerouslySetInnerHTML={{ __html: r.html }} />
    </svg>
  );
}

/** Une pilule segmentée : un choix parmi quelques-uns, comme l'épaisseur d'une table. */
function Pilules<T extends string | number>({ titre, valeur, options, onChange }: { titre: string; valeur: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">{titre}</span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1 rounded-2xl border border-[#d8cfc4] bg-white p-0.5">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={valeur === o.v}
            onClick={() => onChange(o.v)}
            className={`min-h-8 flex-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] transition-colors ${valeur === o.v ? "bg-[#2b2320] text-white" : "text-[#5c5140] hover:text-[#2b2320]"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Une cote en millimètres, bornée par l'atelier. */
function Cote({ label, valeur, bornes, onChange }: { label: string; valeur: number; bornes: [number, number]; onChange: (n: number) => void }) {
  const id = useId();
  const valider = (champ: HTMLInputElement) => {
    const n = Math.round(Number(champ.value.replace(",", ".")));
    const borne = Number.isFinite(n) ? Math.min(bornes[1], Math.max(bornes[0], n)) : valeur;
    champ.value = String(borne);
    if (borne !== valeur) onChange(borne);
  };
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 border-b border-[#e5ddd3] py-1.5">
      <span className="text-[13px] text-[#2b2320]">{label}<small className="ml-1.5 text-[11px] text-[#7a6f64]">{bornes[0]}–{bornes[1]} mm</small></span>
      <span className="flex items-baseline gap-1">
        <input
          id={id}
          key={valeur}
          inputMode="numeric"
          defaultValue={valeur}
          onBlur={(e) => valider(e.target)}
          onKeyDown={(e) => { if (e.key === "Enter") valider(e.target as HTMLInputElement); }}
          className="w-[72px] rounded-none border-0 border-b border-[#9a8d80] bg-transparent py-1 text-right text-[15px] tabular-nums text-[#2b2320] focus:border-[#2b2320] focus:outline-none"
        />
        <span className="text-[11px] text-[#7a6f64]">mm</span>
      </span>
    </label>
  );
}

export function PortailConfigurateur({
  slug, locale, nom, filAriane,
}: {
  slug: SlugPortail;
  locale: Langue;
  nom: string;
  filAriane?: { label: string; etapes: { nom: string; href: string }[] };
}) {
  const t = TEXTES_PORTAIL[locale];
  const b = bornesPortail(slug);
  const [cfg, setCfg] = useState<ConfigPortail>(() => configDepart(slug, slug === "portail-battant" ? "lamesChene" : slug === "portillon" ? "rosace" : "plein"));
  const [onglet, setOnglet] = useState<Onglet>("cotes");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [guide, setGuide] = useState<{ ouvert: boolean; derriere?: boolean; cote?: boolean; sol?: boolean }>({ ouvert: false });
  const maj = (p: Partial<ConfigPortail>) => setCfg((c) => ({ ...c, ...p }));
  const style = styleDe(cfg);

  // Le plan de l'outil, dans le navigateur (moteur public, sans prix).
  const R = useMemo(() => planPortail(slug, cfg), [slug, cfg]);
  // Les styles en vignettes : le même portail, aux mêmes cotes et dans la même couleur, dans chacun des six styles.
  const vignettes = useMemo(
    () => STYLES_PORTAIL.map((st) => ({ st, prims: planPortail(slug, { ...appliquerStyle(cfg, st), couleur: cfg.couleur }).vues.face })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, cfg.P, cfg.H, cfg.vantaux, cfg.rep, cfg.guidage, cfg.sens, cfg.poteaux, cfg.couleur]
  );

  // Le prix : demandé au serveur une fois la frappe posée. Un plan refusé par l'outil est « à étudier » sans attendre.
  const cle = versParams(slug, cfg).toString();
  const aEtudier = R.alertes.length > 0;
  useEffect(() => {
    if (aEtudier) return;
    let annule = false;
    const minuteur = setTimeout(async () => {
      let etat: EtatPrix;
      try {
        const rep = await fetch(`/api/prix-portail?${cle}`);
        const d = rep.ok ? await rep.json() : null;
        etat = !d ? { etat: "indispo" } : d.ok ? { etat: "ok", prix: d.prix, avertissements: d.avertissements ?? [] } : { etat: "etudier", alertes: d.alertes ?? [] };
      } catch {
        etat = { etat: "indispo" };
      }
      if (!annule) setReponse({ cle, etat });
    }, 280);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [cle, aEtudier]);
  const prix: EtatPrix = aEtudier ? { etat: "etudier", alertes: R.alertes } : reponse?.cle === cle ? reponse.etat : { etat: "calcul" };

  const place = R.resume.find(([k]) => k === "Place derrière" || k === "Place le long de la clôture");
  // Le résumé sous le dessin, tiré des chiffres du plan (le moteur de l'outil écrit en français).
  const mm = (n: number) => `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR").format(Math.round(n))} mm`;
  const resume: [string, string][] = [
    [t.titres.vantaux, R.dims.vantaux.map(mm).join(" + ")],
    ...(place ? [[place[0] === "Place derrière" ? t.placeDerriere : t.placeCote, place[1]] as [string, string]] : []),
    [t.poids, `≈ ${new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 0 }).format(R.poids)} kg`],
  ];
  const prixNombre = prix.etat === "ok" ? prix.prix : null;
  const lienVisite = useMemo(() => {
    const q = new URLSearchParams({
      produit: slug,
      config: `${style ? t.styles[style] : t.compose} · ${cfg.P} × ${cfg.H} mm`.slice(0, 200),
      releve: resumeConfig(slug, cfg, locale, prixNombre).join("\n").slice(0, 2000),
    });
    return `/${locale}/contact?${q}`;
  }, [slug, cfg, locale, prixNombre, style, t]);

  const reponseGuide = guidePortail(guide);
  const onglets: { id: Onglet; label: string; mobile?: boolean }[] = [
    { id: "cotes", label: t.onglets.cotes }, { id: "style", label: t.onglets.style, mobile: true },
    { id: "compo", label: t.onglets.compo }, { id: "pose", label: t.onglets.pose },
  ];

  /* ---------- Les panneaux ---------- */
  const panneauCotes = (
    <div className="flex flex-col gap-3">
      <Cote label={t.passage} valeur={cfg.P} bornes={b.P} onChange={(P) => maj({ P })} />
      <Cote label={t.hauteur} valeur={cfg.H} bornes={b.H} onChange={(H) => maj({ H })} />
      {(slug === "portail-battant" || slug === "portail-pliant" || slug === "portillon") && (
        <Cote label={t.pente} valeur={cfg.pente} bornes={b.pente} onChange={(pente) => maj({ pente })} />
      )}
      {place && (
        <p className="rounded-lg bg-[#f4f1ec] px-3 py-2 text-[12px] leading-snug text-[#5c5140]">
          <b className="font-medium text-[#2b2320]">{place[0] === "Place derrière" ? t.placeDerriere : t.placeCote} : {place[1]}</b>
          <br />{t.vueDessus}.
        </p>
      )}
    </div>
  );
  const panneauStyle = (
    <div className="grid grid-cols-2 gap-2">
      {vignettes.map(({ st, prims }) => (
        <button key={st} type="button" onClick={() => setCfg((c) => appliquerStyle(c, st))} aria-pressed={style === st}
          className={`rounded-xl border p-1.5 text-left transition-colors ${style === st ? "border-[#2b2320] bg-[#f4f1ec]" : "border-[#e5ddd3] hover:border-[#9a8d80]"}`}>
          <Vue prims={prims} sansCotes petit couleur={cfg.couleur} className="h-16 w-full" label={t.styles[st]} />
          <span className="mt-1 block text-[12px] font-medium text-[#2b2320]">{t.styles[st]}</span>
        </button>
      ))}
    </div>
  );
  const panneauCompo = (
    <div className="flex flex-col gap-3">
      <Pilules titre={t.titres.mat} valeur={cfg.mat} options={(["alu", "acier"] as const).map((v) => ({ v, label: t.mat[v] }))} onChange={(mat) => maj({ mat })} />
      <Pilules titre={t.titres.forme} valeur={cfg.forme} options={(["droit", "chapeau", "creux", "biais"] as const).map((v) => ({ v, label: t.forme[v] }))} onChange={(forme) => maj({ forme, ...(forme !== "droit" ? { lisse: false } : {}) })} />
      {cfg.forme !== "droit" && <Cote label={t.fleche} valeur={cfg.fleche} bornes={b.fleche} onChange={(fleche) => maj({ fleche })} />}
      <Pilules titre={t.titres.remp} valeur={cfg.remp} options={(["plein", "panneau", "lames", "lamesAlu", "barreaux", "croix", "volutes"] as const).filter((v) => !(cfg.mat === "acier" && (v === "panneau" || v === "lamesAlu"))).map((v) => ({ v, label: t.remp[v] }))} onChange={(remp) => maj({ remp, ...(remp === "barreaux" || remp === "volutes" ? {} : { pointes: false }) })} />
      <Pilules titre={t.titres.soub} valeur={cfg.soub} options={(["aucun", "plein", "panneau", "lames", "barreaux"] as const).filter((v) => !(cfg.mat === "acier" && v === "panneau")).map((v) => ({ v, label: t.soub[v] }))} onChange={(soub) => maj({ soub })} />
      {cfg.soub !== "aucun" && <Cote label={t.hSoub} valeur={cfg.hSoub} bornes={b.hSoub} onChange={(hSoub) => maj({ hSoub })} />}
      <div className="flex flex-wrap gap-2">
        {(cfg.remp === "barreaux" || cfg.remp === "volutes") && (
          <button type="button" aria-pressed={cfg.pointes} onClick={() => maj({ pointes: !cfg.pointes })} className={`rounded-full border px-3 py-1.5 text-[12px] ${cfg.pointes ? "border-[#2b2320] bg-[#2b2320] text-white" : "border-[#d8cfc4] text-[#5c5140]"}`}>{t.pointes}</button>
        )}
        {cfg.forme === "droit" && (
          <button type="button" aria-pressed={cfg.lisse} onClick={() => maj({ lisse: !cfg.lisse })} className={`rounded-full border px-3 py-1.5 text-[12px] ${cfg.lisse ? "border-[#2b2320] bg-[#2b2320] text-white" : "border-[#d8cfc4] text-[#5c5140]"}`}>{t.lisseChene}</button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">{t.titres.couleur}</span>
        <div role="radiogroup" aria-label={t.titres.couleur} className="flex flex-wrap gap-2">
          {COULEURS_PORTAIL.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cfg.couleur === c} title={t.couleur[c]} onClick={() => maj({ couleur: c })}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] ${cfg.couleur === c ? "border-[#2b2320]" : "border-[#e5ddd3]"}`}>
              <span className="h-4 w-4 rounded-full border border-black/15" style={{ backgroundColor: TEINTES_PORTAIL[c][0] }} />
              {t.couleur[c]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  const panneauPose = (
    <div className="flex flex-col gap-3">
      {slug === "portail-battant" && (
        <>
          <Pilules titre={t.titres.vantaux} valeur={cfg.vantaux} options={([2, 1] as const).map((v) => ({ v, label: t.vantaux[v] }))} onChange={(vantaux) => maj({ vantaux })} />
          {cfg.vantaux === 2 && <Pilules titre={t.titres.rep} valeur={cfg.rep} options={(["egal", "tiers"] as const).map((v) => ({ v, label: t.rep[v] }))} onChange={(rep) => maj({ rep })} />}
        </>
      )}
      {slug === "portail-coulissant" && <Pilules titre={t.titres.guidage} valeur={cfg.guidage} options={(["rail", "auto"] as const).map((v) => ({ v, label: t.guidage[v] }))} onChange={(guidage) => maj({ guidage })} />}
      {(slug === "portail-coulissant" || slug === "portillon" || (slug === "portail-battant" && cfg.vantaux === 1)) && (
        <Pilules titre={t.titres.sens} valeur={cfg.sens} options={(["gauche", "droite"] as const).map((v) => ({ v, label: slug === "portail-coulissant" ? t.sens[v] : t.sensPortillon[v] }))} onChange={(sens) => maj({ sens })} />
      )}
      <Pilules titre={t.titres.poteaux} valeur={cfg.poteaux} options={(["existants", "alu", "acier"] as const).map((v) => ({ v, label: t.poteaux[v] }))} onChange={(poteaux) => maj({ poteaux })} />
      {slug !== "portillon" && <Pilules titre={t.titres.moteur} valeur={cfg.moteur ? 1 : 0} options={[{ v: 0, label: t.moteurNon }, { v: 1, label: t.moteurOui }]} onChange={(m) => maj({ moteur: m === 1 })} />}
    </div>
  );
  const panneaux: Record<Onglet, React.ReactNode> = { cotes: panneauCotes, style: panneauStyle, compo: panneauCompo, pose: panneauPose };

  /* ---------- Le prix et la demande de visite ---------- */
  const blocPrix = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f6357]">{t.prix}</span>
        <span className={`${serif.className} block text-2xl leading-tight tabular-nums text-[#2b2320] md:text-[28px]`} aria-live="polite">
          {prix.etat === "ok" ? prixAffiche(prix.prix, locale) : prix.etat === "etudier" ? t.aEtudier : prix.etat === "indispo" ? "—" : t.prixCalcul}
        </span>
      </div>
      <Link href={lienVisite} className="shrink-0 rounded-full bg-[#2b2320] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-black">
        {t.cta}
      </Link>
    </div>
  );
  const notePrix = prix.etat === "etudier"
    ? <p className="text-[12px] leading-snug text-[#9a3a2c]">{locale === "fr" ? prix.alertes[0] : t.etudierEn}</p>
    : prix.etat === "indispo"
      ? <p className="text-[12px] leading-snug text-[#7a6f64]">{t.indisponible}</p>
      : <p className="text-[11px] leading-snug text-[#7a6f64]">{t.prixNote}</p>;

  return (
    <section id="configuration" aria-label={nom} className="mx-auto flex h-[calc(100svh-64px)] max-w-[1600px] flex-col gap-2 px-3 pb-2 pt-2 md:h-[calc(100vh-69px)] md:gap-3 md:px-6 md:pb-4 md:pt-3">
      {/* Rangée du titre : nom, guide, prix et demande de visite. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          {filAriane && (
            <nav aria-label={filAriane.label} className="hidden whitespace-nowrap text-[11px] text-[#7a6f64] md:block">
              {filAriane.etapes.map((e) => (
                <span key={e.href}><Link href={e.href} className="hover:text-[#2b2320]">{e.nom}</Link><span className="mx-1.5">/</span></span>
              ))}
              <span className="text-[#2b2320]">{nom}</span>
            </nav>
          )}
          <div className="flex items-baseline gap-3">
            <h1 className={`${serif.className} text-2xl leading-tight text-[#2b2320] md:text-[2rem]`}>{nom}</h1>
            <button type="button" onClick={() => setGuide((g) => ({ ouvert: !g.ouvert }))} aria-expanded={guide.ouvert}
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a6f64] underline underline-offset-4 hover:text-black">
              <span className="md:hidden">{t.guideCourt}</span><span className="hidden md:inline">{t.guideTitre}</span>
            </button>
          </div>
        </div>
        <div className="hidden w-[400px] md:block">{blocPrix}</div>
      </div>

      {/* Le dessin à gauche (toujours visible), les choix à droite ; sur téléphone, l'un sous l'autre. */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,38%)_minmax(0,1fr)] gap-2 md:grid-rows-[minmax(0,50%)_minmax(0,1fr)] md:gap-3 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-1 lg:gap-4">
        <div className="relative flex min-h-0 flex-col rounded-2xl border border-[#e5ddd3] bg-[#f7f4ef] p-2 md:p-4">
          <Vue prims={R.vues.face} couleur={cfg.couleur} className="min-h-0 w-full flex-1" label={`${nom} — ${t.vueFace}`} />
          <div className="hidden h-[28%] min-h-[90px] items-end gap-4 md:flex">
            <Vue prims={R.vues.dessus} petit couleur={cfg.couleur} className="h-full w-[48%]" label={t.vueDessus} />
            <ul className="mb-1 flex-1 space-y-0.5 text-[11px] text-[#5c5140]">
              {resume.map(([k, v]) => <li key={k}><span className="text-[#7a6f64]">{k} :</span> {v}</li>)}
            </ul>
          </div>
          <p className="pointer-events-none absolute left-3 top-2 text-[10px] text-[#7a6f64]">{t.illustration}</p>
          {guide.ouvert && (
            <div role="dialog" aria-label={t.guideTitre} className="absolute inset-x-2 top-8 z-10 rounded-xl border border-[#d8cfc4] bg-white p-3 shadow-lg md:inset-x-auto md:left-4 md:w-[380px]">
              {t.guideQ.map((q, i) => {
                const cle = (["derriere", "cote", "sol"] as const)[i];
                const visible = i === 0 || (i === 1 && guide.derriere === false) || (i === 2 && guide.derriere === false && guide.cote === true);
                if (!visible) return null;
                return (
                  <div key={cle} className="mb-2">
                    <p className="text-[13px] text-[#2b2320]"><span className="mr-1 text-[#8a6237]">{i + 1}.</span>{q}</p>
                    <div className="mt-1 flex gap-2">
                      {[true, false].map((r) => (
                        <button key={String(r)} type="button" aria-pressed={guide[cle] === r}
                          onClick={() => setGuide((g) => ({ ...g, [cle]: r, ...(i === 0 ? { cote: undefined, sol: undefined } : i === 1 ? { sol: undefined } : {}) }))}
                          className={`rounded-full border px-3 py-1 text-[12px] ${guide[cle] === r ? "border-[#2b2320] bg-[#2b2320] text-white" : "border-[#d8cfc4]"}`}>
                          {r ? t.oui : t.non}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {reponseGuide && (
                <p className="mt-2 border-t border-[#e5ddd3] pt-2 text-[13px]">
                  {t.guideVers} <b>{t.modeles[reponseGuide.slug]}{reponseGuide.guidage ? ` (${t.guidage[reponseGuide.guidage]})` : ""}</b>
                  {reponseGuide.slug === slug ? (
                    reponseGuide.guidage && reponseGuide.guidage !== cfg.guidage ? (
                      <button type="button" className="ml-2 underline" onClick={() => { maj({ guidage: reponseGuide.guidage }); setGuide({ ouvert: false }); }}>{t.ouvrirModele}</button>
                    ) : null
                  ) : (
                    <Link className="ml-2 underline" href={`/${locale}/artisanat/${reponseGuide.slug}`}>{t.ouvrirModele}</Link>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-[#e5ddd3] bg-white">
          <div role="tablist" aria-label={nom} className="flex gap-1 border-b border-[#e5ddd3] px-2 pt-2">
            {onglets.map((o) => (
              <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)}
                className={`${o.mobile ? "md:hidden" : ""} rounded-t-lg px-3 py-2 text-[12px] font-medium ${onglet === o.id ? "border-b-2 border-[#2b2320] text-[#2b2320]" : "text-[#7a6f64] hover:text-[#2b2320]"}`}>
                {o.label}
              </button>
            ))}
          </div>
          {/* Ce qui est long défile ici, jamais la page. */}
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
            {panneaux[onglet === "style" ? "style" : onglet]}
            {locale === "fr" && prix.etat === "ok" && prix.avertissements.length > 0 && (
              <ul className="mt-3 space-y-1 text-[11px] text-[#9a6a1a]">{prix.avertissements.map((a) => <li key={a}>{a}</li>)}</ul>
            )}
          </div>
          <div className="space-y-1 border-t border-[#e5ddd3] px-3 py-2 md:px-4">
            <div className="md:hidden">{blocPrix}</div>
            {notePrix}
          </div>
        </div>
      </div>

      {/* Les six styles, en visuels, sur toute la largeur (ordinateur et tablette). */}
      <div className="hidden h-[112px] shrink-0 gap-2 md:grid md:grid-cols-6">
        {vignettes.map(({ st, prims }) => (
          <button key={st} type="button" onClick={() => setCfg((c) => appliquerStyle(c, st))} aria-pressed={style === st}
            className={`flex min-h-0 flex-col rounded-xl border px-2 pb-1.5 pt-1 text-left transition-colors ${style === st ? "border-[#2b2320] bg-[#f4f1ec]" : "border-[#e5ddd3] bg-white hover:border-[#9a8d80]"}`}>
            <Vue prims={prims} sansCotes petit couleur={cfg.couleur} className="min-h-0 w-full flex-1" label={t.styles[st]} />
            <span className="block truncate text-[12px] font-medium text-[#2b2320]">{t.styles[st]}<span className="ml-1.5 font-normal text-[#7a6f64]">{t.stylesNote[st]}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
