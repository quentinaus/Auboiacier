/**
 * Les portails sur le site : la configuration choisie par le client, ses bornes, ses textes, et le passage vers le
 * moteur de l'outil de plans (src/lib/portails-outil/moteur.genere.mjs, extrait tel quel : aucun prix).
 *
 * Ce fichier ne contient AUCUN prix : il sert au navigateur (dessin, choix) comme au serveur (validation). Le prix se
 * demande à /api/prix-portail, calculé par src/lib/prix-portail.server.ts avec le chiffrage chiffré de l'outil.
 *
 * Étude du 06/10/2026 avec Quentin : quatre modèles pour toutes les entrées (battant, coulissant sur rail ou
 * autoportant, pliant, portillon), un portail composé par blocs (forme du haut, soubassement, remplissage, options),
 * six styles tout faits, surtout de l'alu, l'acier pour la Rosace et les Volutes.
 */
import { calculerPortail, MT_AVEC, PT_ATELIER, PT_STYLES, type ResultatPortail } from "./portails-outil/moteur.genere.mjs";
import { COULEURS_PORTAIL, DESSINS_TOLE, estSlugPortail, RECEPTIONS_PORTAIL, SLUGS_PORTAIL, STYLES_PORTAIL, type DessinTole, type Langue, type ReceptionPortail, type SlugPortail, type StylePortail } from "./portails-base.ts";
import { TEXTES_PORTAIL } from "./portails-textes.ts";

// Ce qui n'a pas besoin du moteur vit dans portails-base.ts (constantes, guide) et portails-textes.ts ; ré-exporté ici : l'API ne change pas.
export { COULEURS_PORTAIL, DESSINS_TOLE, estSlugPortail, guidePortail, RECEPTIONS_PORTAIL, SLUGS_PORTAIL, STYLES_PORTAIL } from "./portails-base.ts";
export type { DessinTole, Langue, ReceptionPortail, SlugPortail, StylePortail } from "./portails-base.ts";
export { TEXTES_PORTAIL } from "./portails-textes.ts";


const FORMES = ["droit", "chapeau", "creux", "biais"] as const;
const SOUBS = ["aucun", "plein", "panneau", "lames", "barreaux"] as const;
const REMPS = ["plein", "panneau", "lames", "lamesAlu", "barreaux", "croix", "volutes", "tole"] as const;
const POTEAUX = ["existants", "acier", "alu"] as const;
// Les décors (lot 3, 07/10/2026) : les formules PT_DECOR_FORMULES de l'outil (motifs.js, références du commerce). Un décor
// impose l'acier ; « Sur mesure » se chiffre sur devis (le moteur rend une alerte : « à étudier »).
// « perso » (lot 10, 09/10/2026) : « Personnaliser », 2 emplacements au plus (decorChoix, lu par ptDecorPerso de l'outil).
export const DECORS_PORTAIL = ["aucun", "classique", "frise", "medaillon", "couronnement", "coeurs", "surMesure", "perso"] as const;
// Les emplacements proposés par « Personnaliser » (motifs.js : MT_CHOIX.assemblage, sans « barreaux » qui n'est pas un décor).
export const EMPLACEMENTS_DECOR = ["entre", "frise", "anneaux", "hauteur", "coeurs", "medaillon", "applique", "coins", "cimier", "appliquePlein"] as const;
export type EmplacementDecor = (typeof EMPLACEMENTS_DECOR)[number];
export const POS_DECOR = ["haut", "milieu", "bas"] as const;
export const RYTHMES_DECOR = ["tous", "unSurDeux", "alterne"] as const;
/** Un emplacement de « Personnaliser » : où, quelle forme, à quelle hauteur (entre les barreaux), à quel rythme. */
export type ChoixDecor = { assemblage: EmplacementDecor; forme: string; pos?: (typeof POS_DECOR)[number]; rythme?: (typeof RYTHMES_DECOR)[number]; forme2?: string };
/** Les formes qu'un emplacement accepte (MT_AVEC de motifs.js). */
export const formesDe = (a: EmplacementDecor): string[] => [...((MT_AVEC as Record<string, string[]>)[a] ?? [])];
/** Un motif soudé sur le bas ne va que sur un soubassement plein (tôle ou panneau). */
export const emplacementPermis = (a: EmplacementDecor, cfg: Pick<ConfigPortail, "soub">) => a !== "appliquePlein" || cfg.soub === "plein" || cfg.soub === "panneau";
export const BOUTS_DECOR = ["droit", "effile", "bouton"] as const;
export const BARREAUX_DECOR = ["carre", "torsade", "bagues"] as const;
// Le moteur (lot 4, « Somfy partout ») : « conseille » laisse l'outil choisir (PT_MOTEURS : le plus facile à poser qui
// convient à ce portail) ; sinon le client choisit Ixengo (vérins), Axovia (bras) ou Elixo (coulissant).
export const MOTEURS_PORTAIL = ["conseille", "ixengo", "axovia", "elixo"] as const;


export type ConfigPortail = {
  /** La façon de recevoir le portail ; « pose » par défaut. */
  reception: ReceptionPortail;
  P: number;
  H: number;
  mat: "alu" | "acier";
  forme: (typeof FORMES)[number];
  fleche: number;
  soub: (typeof SOUBS)[number];
  hSoub: number;
  remp: (typeof REMPS)[number];
  decor: (typeof DECORS_PORTAIL)[number];
  decorChoix: ChoixDecor[];
  bouts: (typeof BOUTS_DECOR)[number];
  barreauxDeco: (typeof BARREAUX_DECOR)[number];
  pointes: boolean;
  lisse: boolean;
  // Les moulures (09/10/2026) : un médaillon par vantail sur le bas plein, vissé par derrière.
  moulure: boolean;
  vantaux: 1 | 2;
  rep: "egal" | "tiers";
  guidage: "rail" | "auto";
  sens: "gauche" | "droite";
  poteaux: (typeof POTEAUX)[number];
  moteur: boolean;
  moteurModele: (typeof MOTEURS_PORTAIL)[number];
  pente: number;
  couleur: (typeof COULEURS_PORTAIL)[number];
  /** Le dessin de la tôle découpée (sans effet pour les autres remplissages). */
  design: DessinTole;
  // Le portillon assorti (lot 10) : même style, même hauteur, posé avec le portail (visite et route comptées une fois).
  portillon: boolean;
  portillonP: number;
  portillonSens: "gauche" | "droite";
};

/** Les bornes de l'atelier (celles de l'outil : PT_ATELIER.bornes). */
export function bornesPortail(slug: SlugPortail, guidage?: "rail" | "auto") {
  const type = SLUGS_PORTAIL[slug].slice(2).toLowerCase();
  // Un coulissant sans rail (autoportant) emmène sa queue de contrepoids : 4 000 mm au plus, pour tenir dans la remorque d'un
  // seul tenant ; sur rail, 5 840 mm au plus (le vantail de 6 000 mm). Jamais « sur étude » (Quentin, 10/10/2026).
  const P = (type === "coulissant" && guidage === "auto" ? PT_ATELIER.bornes.PAutoportant : PT_ATELIER.bornes.P[type]) as [number, number];
  return { P, H: PT_ATELIER.bornes.H, fleche: [50, 400] as [number, number], hSoub: [250, 1400] as [number, number], pente: [0, 300] as [number, number] };
}

/** La configuration de départ d'une fiche : la cote courante, dans un style. */
export function configDepart(slug: SlugPortail, style: StylePortail = "plein"): ConfigPortail {
  const base: ConfigPortail = {
    reception: "pose",
    P: slug === "portillon" ? 1000 : 3500, H: 1600, mat: "alu", forme: "droit", fleche: 150, soub: "aucun", hSoub: 500,
    remp: "plein", decor: "aucun", decorChoix: [], bouts: "effile", barreauxDeco: "carre", pointes: false, lisse: false, moulure: false, vantaux: 2, rep: "egal",
    guidage: "rail", sens: "gauche", poteaux: "existants", moteur: false, moteurModele: "conseille", pente: 0, couleur: "anthracite", design: "foret",
    portillon: false, portillonP: 1000, portillonSens: "gauche",
  };
  return appliquerStyle(base, style);
}

/** Un style tout fait remplit les blocs de la composition (PT_STYLES de l'outil). */
export function appliquerStyle(cfg: ConfigPortail, style: StylePortail): ConfigPortail {
  const s = PT_STYLES[style] as Record<string, unknown>;
  if (!s) return cfg;
  return {
    ...cfg,
    mat: s.ptMat as ConfigPortail["mat"],
    forme: s.ptForme as ConfigPortail["forme"],
    soub: s.ptSoub as ConfigPortail["soub"],
    remp: s.ptRemp as ConfigPortail["remp"],
    decor: ((s.ptDecor as ConfigPortail["decor"] | undefined) ?? "aucun"),
    decorChoix: [],
    pointes: Boolean(s.ptPointes),
    lisse: Boolean(s.ptLisse),
    ...(typeof s.ptHSoub === "number" ? { hSoub: s.ptHSoub } : {}),
    ...(typeof s.ptFleche === "number" ? { fleche: s.ptFleche } : {}),
    couleur: s.ptMat === "acier" ? (cfg.couleur === "galva" ? "galva" : s.ptRemp === "tole" ? "anthracite" : "noir") : cfg.couleur === "galva" ? "anthracite" : cfg.couleur === "noir" && cfg.mat === "acier" ? "anthracite" : cfg.couleur,
  };
}

/** Le style dont la composition est exactement celle choisie, ou null (« composé »). */
export function styleDe(cfg: ConfigPortail): StylePortail | null {
  return (
    STYLES_PORTAIL.find((st) => {
      const s = PT_STYLES[st] as Record<string, unknown>;
      return s.ptMat === cfg.mat && s.ptForme === cfg.forme && s.ptSoub === cfg.soub && s.ptRemp === cfg.remp && ((s.ptDecor as string | undefined) ?? "aucun") === cfg.decor && Boolean(s.ptPointes) === cfg.pointes && Boolean(s.ptLisse) === cfg.lisse;
    }) ?? null
  );
}

/**
 * Ce que la page des portails envoie à la fiche d'un modèle dans l'adresse (?style=tole&design=loup&mat=acier&couleur=noir&P=3500&H=1600&guidage=auto) :
 * un style choisi sur la page s'ouvre déjà choisi sur la fiche. Tout est vérifié, une valeur inconnue est ignorée (jamais devinée) ;
 * le galvanisé brut n'existe qu'en acier. Rend la configuration de départ, ou la même si l'adresse ne dit rien.
 */
export function configDepuisAdresse(slug: SlugPortail, cfg: ConfigPortail, q: URLSearchParams): ConfigPortail {
  const b = bornesPortail(slug);
  let n = cfg;
  const style = q.get("style");
  if (style && (STYLES_PORTAIL as readonly string[]).includes(style)) n = appliquerStyle(n, style as StylePortail);
  // « mat=acier » après le style, avant la teinte : le galvanisé brut n'existe qu'en acier, y compris sur les styles qui sont en alu.
  if (q.get("mat") === "acier") n = { ...n, mat: "acier" };
  const design = q.get("design");
  if (design && (DESSINS_TOLE as readonly string[]).includes(design)) n = { ...n, design: design as DessinTole };
  const couleur = q.get("couleur");
  if (couleur && (COULEURS_PORTAIL as readonly string[]).includes(couleur) && (couleur !== "galva" || n.mat === "acier")) n = { ...n, couleur: couleur as ConfigPortail["couleur"] };
  const P = Number(q.get("P")), H = Number(q.get("H")), guidage = q.get("guidage");
  if (q.has("P") && Number.isFinite(P) && P >= b.P[0] && P <= b.P[1]) n = { ...n, P: Math.round(P) };
  if (q.has("H") && Number.isFinite(H) && H >= b.H[0] && H <= b.H[1]) n = { ...n, H: Math.round(H) };
  if (slug === "portail-coulissant" && (guidage === "rail" || guidage === "auto")) n = { ...n, guidage };
  return n;
}

/** Les entrées du moteur de l'outil (mêmes noms que les champs de l'outil). */
export function versEntrees(cfg: ConfigPortail): Record<string, unknown> {
  // « Personnaliser » sans emplacement = pas de décor.
  const decor = cfg.decor === "perso" && !cfg.decorChoix.length ? "aucun" : cfg.decor;
  return {
    ptP: cfg.P, ptH: cfg.H, ptMat: cfg.mat, ptForme: cfg.forme, ptFleche: cfg.fleche, ptSoub: cfg.soub, ptHSoub: cfg.hSoub,
    ptRemp: cfg.remp, ptDecor: decor, ptPointes: cfg.pointes, ptLisse: cfg.lisse, ptVantaux: String(cfg.vantaux), ptRep: cfg.rep,
    ptGuidage: cfg.guidage, ptSens: cfg.sens, ptPoteaux: cfg.poteaux, ptMoteur: cfg.moteur, ptPente: cfg.pente,
    ...(cfg.moulure ? { ptMoulure: true } : {}),
    ...(cfg.couleur === "galva" ? { ptFinition: "brut" } : {}),
    ...(cfg.remp === "tole" ? { ptDesign: cfg.design } : {}),
    ...(cfg.moteurModele !== "conseille" ? { ptMoteurModele: cfg.moteurModele } : {}),
    ...(decor === "perso" ? { ptDecorChoix: JSON.stringify(cfg.decorChoix) } : {}),
    ...(decor !== "aucun" ? { ptBouts: cfg.bouts, ptBarreauxDeco: cfg.barreauxDeco } : {}),
  };
}

/** Le portillon assorti d'un portail : même composition, même hauteur, sa largeur et ses gonds ; jamais de moteur. */
export function configPortillonAssorti(cfg: ConfigPortail): ConfigPortail {
  return { ...cfg, P: cfg.portillonP, sens: cfg.portillonSens, vantaux: 1, moteur: false, portillon: false };
}

/** Le plan de l'outil pour cette configuration (vues, débit, contrôles). */
export function planPortail(slug: SlugPortail, cfg: ConfigPortail): ResultatPortail {
  return calculerPortail(versEntrees(cfg), SLUGS_PORTAIL[slug]);
}

const PARAMS: (keyof ConfigPortail)[] = ["reception", "P", "H", "mat", "forme", "fleche", "soub", "hSoub", "remp", "decor", "bouts", "barreauxDeco", "pointes", "lisse", "moulure", "vantaux", "rep", "guidage", "sens", "poteaux", "moteur", "moteurModele", "pente", "couleur", "design", "portillon", "portillonP", "portillonSens"];

/** La configuration en paramètres d'adresse (pour /api/prix-portail). */
export function versParams(slug: SlugPortail, cfg: ConfigPortail): URLSearchParams {
  const p = new URLSearchParams({ slug });
  for (const k of PARAMS) {
    const v = cfg[k];
    p.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  if (cfg.decor === "perso") p.set("decorChoix", JSON.stringify(cfg.decorChoix));
  return p;
}

/** Relit les emplacements de « Personnaliser » : 1 ou 2, chacun permis par motifs.js ; sinon null (jamais deviné). */
export function lireDecorChoix(texte: string | null): ChoixDecor[] | null {
  let L: unknown;
  try { L = JSON.parse(texte ?? ""); } catch { return null; }
  if (!Array.isArray(L) || L.length < 1 || L.length > 2) return null;
  const sortie: ChoixDecor[] = [];
  for (const x of L) {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    if (Object.keys(o).some((k) => !["assemblage", "forme", "pos", "rythme", "forme2"].includes(k))) return null;
    const a = o.assemblage as EmplacementDecor;
    if (!EMPLACEMENTS_DECOR.includes(a)) return null;
    const formes = formesDe(a);
    if (typeof o.forme !== "string" || !formes.includes(o.forme)) return null;
    if (o.pos !== undefined && !POS_DECOR.includes(o.pos as never)) return null;
    if (o.rythme !== undefined && !RYTHMES_DECOR.includes(o.rythme as never)) return null;
    if (o.forme2 !== undefined && (typeof o.forme2 !== "string" || !formes.includes(o.forme2))) return null;
    sortie.push(o as ChoixDecor);
  }
  return sortie;
}

/**
 * La commande en ligne d'un portail (Quentin, 10/10/2026) : le client paie un ACOMPTE de 40 % au panier, la visite de prise
 * de cotes est comprise, le solde est dû à la réception. 40 % couvre les achats engagés avant la pose (moteur, matière,
 * galvanisation, laquage) ; l'outil prévient si ce n'est pas le cas sur un portail.
 */
export const ACOMPTE_PORTAIL_PCT = 40;
/** L'acompte en euros entiers, pour un prix posé donné. */
export const acomptePortail = (prix: number) => Math.round((prix * ACOMPTE_PORTAIL_PCT) / 100);
/** La configuration en texte, sans le modèle (la ligne du panier) ; relue par lireConfigPanier, jamais un prix. */
export function versParamsPanier(slug: SlugPortail, cfg: ConfigPortail): string {
  const p = versParams(slug, cfg);
  p.delete("slug");
  return p.toString();
}
/** Relit la ligne d'un panier : le modèle de la fiche et la configuration en texte ; null si quoi que ce soit cloche. */
export function lireConfigPanier(slug: string, texte: unknown): ConfigPortail | null {
  if (!estSlugPortail(slug) || typeof texte !== "string" || texte.length > 800) return null;
  const p = new URLSearchParams(texte);
  if (p.has("slug")) return null;
  p.set("slug", slug);
  const lu = lireConfig(p);
  return lu && lu.slug === slug ? lu.cfg : null;
}

/**
 * Relit une configuration venue du navigateur. Tout est vérifié : un choix inconnu ou une cote hors des bornes de
 * l'atelier rend null (le serveur répond 400), jamais une valeur devinée.
 */
export function lireConfig(params: URLSearchParams): { slug: SlugPortail; cfg: ConfigPortail } | null {
  const slug = params.get("slug") ?? "";
  if (!estSlugPortail(slug)) return null;
  const b = bornesPortail(slug, params.get("guidage") === "auto" ? "auto" : "rail");
  const nombre = (k: string, [min, max]: [number, number]) => {
    const n = Number(params.get(k));
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
  };
  const choix = <T extends string>(k: string, liste: readonly T[]) => {
    const v = params.get(k) as T | null;
    return v !== null && liste.includes(v) ? v : null;
  };
  const bool = (k: string) => (params.get(k) === "1" ? true : params.get(k) === "0" ? false : null);
  const cfg = {
    // Absent (un ancien panier, une ancienne adresse) : « pose », comme avant.
    reception: params.has("reception") ? choix("reception", RECEPTIONS_PORTAIL) : ("pose" as ReceptionPortail),
    P: nombre("P", b.P), H: nombre("H", b.H), mat: choix("mat", ["alu", "acier"] as const), forme: choix("forme", FORMES),
    fleche: nombre("fleche", [0, 400]), soub: choix("soub", SOUBS), hSoub: nombre("hSoub", [0, 2000]), remp: choix("remp", REMPS),
    decor: choix("decor", DECORS_PORTAIL), bouts: choix("bouts", BOUTS_DECOR), barreauxDeco: choix("barreauxDeco", BARREAUX_DECOR),
    pointes: bool("pointes"), lisse: bool("lisse"), moulure: bool("moulure"), vantaux: params.get("vantaux") === "1" ? 1 : params.get("vantaux") === "2" ? 2 : null,
    rep: choix("rep", ["egal", "tiers"] as const), guidage: choix("guidage", ["rail", "auto"] as const), sens: choix("sens", ["gauche", "droite"] as const),
    poteaux: choix("poteaux", POTEAUX), moteur: bool("moteur"), moteurModele: choix("moteurModele", MOTEURS_PORTAIL), pente: nombre("pente", b.pente), couleur: choix("couleur", COULEURS_PORTAIL),
    // Absent (un ancien panier) : le dessin par défaut, sans effet hors de la tôle découpée.
    design: params.has("design") ? choix("design", DESSINS_TOLE) : ("foret" as DessinTole),
    // Le portillon assorti : seulement à côté d'un portail, à la largeur d'un portillon.
    portillon: slug === "portillon" ? (params.get("portillon") === "1" ? null : false) : bool("portillon"),
    portillonP: nombre("portillonP", bornesPortail("portillon").P), portillonSens: choix("portillonSens", ["gauche", "droite"] as const),
    decorChoix: params.get("decor") === "perso" ? lireDecorChoix(params.get("decorChoix")) : params.has("decorChoix") ? null : [],
  };
  if (Object.values(cfg).some((x) => x === null)) return null;
  // Sans pose, pas de moteur : l'atelier le pose lui-même (la conformité CE de l'ensemble est de sa responsabilité).
  if (cfg.reception !== "pose" && cfg.moteur) return null;
  // Le galvanisé brut n'existe qu'en acier (l'alu se lacque).
  if (cfg.couleur === "galva" && cfg.mat !== "acier") return null;
  // La tôle découpée : acier, haut droit, ni bas plein, ni décor, ni lisse (le moteur de l'outil la refuse sinon).
  if (cfg.remp === "tole" && (cfg.mat !== "acier" || cfg.forme !== "droit" || cfg.soub !== "aucun" || cfg.decor !== "aucun" || cfg.lisse || cfg.pointes)) return null;
  return { slug, cfg: cfg as ConfigPortail };
}


/** La configuration en mots (pour la demande de visite : elle arrive écrite dans le message). */
export function resumeConfig(slug: SlugPortail, cfg: ConfigPortail, locale: Langue, prix: number | null): string[] {
  const t = TEXTES_PORTAIL[locale];
  const st = styleDe(cfg);
  const lignes = [
    `${t.passage} : ${cfg.P} mm · ${t.hauteur} : ${cfg.H} mm`,
    `${t.onglets.style} : ${st ? t.styles[st] : t.compose} · ${t.mat[cfg.mat]} · ${t.couleur[cfg.couleur]}`,
    `${t.titres.forme} : ${t.forme[cfg.forme]}${cfg.forme !== "droit" ? ` (${cfg.fleche} mm)` : ""} · ${t.titres.remp} : ${t.remp[cfg.remp]}${cfg.soub !== "aucun" ? ` · ${t.titres.soub} : ${t.soub[cfg.soub]} (${cfg.hSoub} mm)` : ""}${cfg.decor !== "aucun" ? ` · ${t.titres.decor} : ${decrireDecor(cfg, locale)}` : ""}`,
  ];
  if (cfg.remp === "tole") lignes.push(`${t.dessinTitre} : ${t.dessins[cfg.design]}`);
  if (slug === "portail-battant") lignes.push(`${t.titres.vantaux} : ${t.vantaux[cfg.vantaux]}${cfg.vantaux === 2 ? ` (${t.rep[cfg.rep]})` : ""}`);
  if (slug === "portail-coulissant") lignes.push(`${t.titres.guidage} : ${t.guidage[cfg.guidage]} · ${t.titres.sens} : ${t.sens[cfg.sens]}`);
  if (cfg.moulure) lignes.push(t.moulures);
  lignes.push(`${t.titres.poteaux} : ${t.poteaux[cfg.poteaux]} · ${t.titres.moteur} : ${cfg.moteur ? t.moteurOui : t.moteurNon}${cfg.pointes ? ` · ${t.pointes}` : ""}${cfg.lisse ? ` · ${t.lisseChene}` : ""}`);
  if (cfg.portillon && slug !== "portillon") lignes.push(`${t.portillon} : ${cfg.portillonP} × ${cfg.H} mm · ${t.sensPortillon[cfg.portillonSens]}`);
  if (prix !== null) lignes.push(`${t.prix} : ${prix} €`);
  return lignes;
}

/** Le décor en mots : la formule, ou les emplacements de « Personnaliser », avec les finitions. */
export function decrireDecor(cfg: ConfigPortail, locale: Langue): string {
  const t = TEXTES_PORTAIL[locale];
  if (cfg.decor === "aucun") return t.decor.aucun;
  const fins = `${t.titres.options.toLowerCase()} : ${locale === "fr" ? "bouts" : "ends"} ${t.bouts[cfg.bouts].toLowerCase()}, ${locale === "fr" ? "barreaux" : "bars"} ${t.barreauxDeco[cfg.barreauxDeco].toLowerCase()}`;
  if (cfg.decor !== "perso") return cfg.decor === "surMesure" ? t.decor.surMesure : `${t.decor[cfg.decor]} (${fins})`;
  const un = (c: ChoixDecor) => `${t.formesDecor[c.forme] ?? c.forme}${c.rythme === "alterne" && c.forme2 ? ` / ${t.formesDecor[c.forme2] ?? c.forme2}` : ""}, ${t.emplacements[c.assemblage].toLowerCase()}${c.assemblage === "entre" && c.pos ? ` ${t.posDecor[c.pos].toLowerCase()}` : ""}${c.rythme === "unSurDeux" ? ` (${t.rythmes.unSurDeux.toLowerCase()})` : ""}`;
  return `${t.decor.perso} : ${cfg.decorChoix.map(un).join(" + ")} (${fins})`;
}
