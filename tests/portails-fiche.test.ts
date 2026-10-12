/**
 * La fiche d'un portail, après la recette du 13/10/2026 :
 * - le guide de la fiche (« Quel portail pour votre entrée ? ») ouvre la même fiche que celui de la page des portails : même modèle,
 *   même guidage (rail ou sans rail), même style (celui du « dès » annoncé) : donc le même prix à l'arrivée ;
 * - l'arrivée avec une configuration dans l'adresse ne montre plus le style de départ (script d'attente + plaque cachée + useLayoutEffect) ;
 * - la fiche ouverte en galvanisé brut depuis un style d'alu reconnaît ce style.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appliquerStyle, configDepart, configDepuisAdresse, guidePortail, resultatGuide, resumeConfig, styleDe, styleEstAlu, STYLES_PORTAIL, TEXTES_PORTAIL,
  type SlugPortail, type StylePortail,
} from "../src/lib/portails.ts";
import { liensGuideFiche, stylesDepart, STYLE_SANS_PRIX } from "../src/lib/portails-fiche.ts";
import { conseilGuide, etatGuide, type Reponses } from "../src/lib/portails-guide.ts";
import { ORDRE_MODELES, TXT, type ModeleCarte } from "../src/lib/portails-page.ts";
import { donneesPagePortails } from "../src/lib/portails-outil/donnees-page.ts";
import { prixPortail, styleDepartPortail } from "../src/lib/portails-outil/prix.ts";
import { ATTRIBUT_ATTENTE, DELAI_FILET_MS, DUREE_FONDU_MS, HOTE_ATTENTE, PARAMS_ADRESSE_FICHE, adressePorteConfig, libererAttente, scriptAttente } from "../src/lib/portails-attente.ts";

const RACINE = join(import.meta.dirname, "..");
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");
const D = donneesPagePortails();
const NOMS = { "portail-battant": "Portail battant", "portail-coulissant": "Portail coulissant", "portail-pliant": "Portail pliant", portillon: "Portillon" } as const;
const MODELES: ModeleCarte[] = ORDRE_MODELES.map((slug) => ({ slug, nom: NOMS[slug], ...D.modeles[slug] }));
const requete = (lien: string) => new URL(lien, "http://site.test").searchParams;

/** Les quatre parcours du guide : les réponses données, le modèle conseillé, son guidage. */
const PARCOURS = {
  battant: { g: { derriere: true } as Reponses, slug: "portail-battant" as SlugPortail, guidage: undefined },
  pliant: { g: { derriere: false, cote: false } as Reponses, slug: "portail-pliant" as SlugPortail, guidage: undefined },
  rail: { g: { derriere: false, cote: true, sol: true } as Reponses, slug: "portail-coulissant" as SlugPortail, guidage: "rail" as const },
  auto: { g: { derriere: false, cote: true, sol: false } as Reponses, slug: "portail-coulissant" as SlugPortail, guidage: "auto" as const },
};

// ---------------------------------------------------------------------------------------------------------------------------------
// Le guide de la fiche et celui de la page ouvrent la même fiche
// ---------------------------------------------------------------------------------------------------------------------------------
test("guide de la fiche : pour les 4 parcours, en français et en anglais, le lien est celui du guide de la page des portails", () => {
  const departs = stylesDepart(styleDepartPortail);
  for (const locale of ["fr", "en"] as const) {
    const liens = liensGuideFiche(locale, departs);
    for (const [etat, p] of Object.entries(PARCOURS)) {
      const page = conseilGuide(p.g, MODELES, D.sansRail, locale)!;
      assert.equal(liens[etat as keyof typeof liens], page.vue.lien, `${locale} ${etat} : le lien de la fiche est celui de la page`);
      // Le résultat que la fiche lit (guidePortail) est bien celui que la page affiche.
      assert.equal(resultatGuide(guidePortail(p.g)!), etatGuide(p.g), etat);
    }
  }
});

test("guide de la fiche : « Coulissant (Sans rail) » ouvre le coulissant sans rail, dans le style du « dès » sans rail, et les autres dans le style de leur « dès »", () => {
  const liens = liensGuideFiche("fr", stylesDepart(styleDepartPortail));
  const autoStyle = styleDepartPortail("portail-coulissant", { guidage: "auto" });
  assert.ok(autoStyle, "le chiffrage donne un style de départ au coulissant sans rail");
  const auto = requete(liens.auto);
  assert.ok(liens.auto.startsWith("/fr/artisanat/portail-coulissant?") && liens.auto.endsWith("#configuration"), liens.auto);
  assert.equal(auto.get("guidage"), "auto");
  assert.equal(auto.get("style"), autoStyle);
  assert.equal(requete(liens.rail).get("guidage"), "rail");
  assert.equal(requete(liens.rail).get("style"), styleDepartPortail("portail-coulissant"));
  assert.equal(requete(liens.battant).get("style"), styleDepartPortail("portail-battant"));
  assert.equal(requete(liens.battant).get("guidage"), null, "le battant n'a pas de guidage");
  assert.equal(requete(liens.pliant).get("style"), styleDepartPortail("portail-pliant"));
  // Anglais : même adresse sous /en.
  assert.ok(liensGuideFiche("en", stylesDepart(styleDepartPortail)).auto.startsWith("/en/artisanat/portail-coulissant?"));
});

test("guide de la fiche : la fiche ouverte par chaque lien affiche le prix annoncé par la page (« dès » posé), sans rail à 3 100 € comme sur la page", () => {
  const liens = liensGuideFiche("fr", stylesDepart(styleDepartPortail));
  for (const [etat, p] of Object.entries(PARCOURS)) {
    const q = requete(liens[etat as keyof typeof liens]);
    // Ce que fait la fiche à l'arrivée : la configuration de départ du modèle, puis l'adresse (configDepuisAdresse).
    const depart = configDepart(p.slug, p.slug === "portail-battant" ? "lamesChene" : "plein");
    const cfg = configDepuisAdresse(p.slug, depart, q);
    const r = prixPortail(p.slug, cfg);
    assert.ok(r.ok, `${etat} : un prix`);
    const annonce = etat === "auto" ? D.sansRail!.depart : D.modeles[p.slug].depart;
    assert.equal(r.ok && r.prix, annonce, `${etat} : la fiche s'ouvre au « dès » annoncé`);
    if (p.guidage) assert.equal(cfg.guidage, p.guidage, `${etat} : le guidage de la fiche`);
  }
  assert.notEqual(D.sansRail!.depart, D.modeles["portail-coulissant"].depart, "le sans rail n'a pas le prix du sur rail (c'était le bug)");
});

test("guide de la fiche : sans chiffrage, le même repli que la page des portails (style « lisse »), jamais une adresse sans style", () => {
  const sans = stylesDepart(() => null);
  const liens = liensGuideFiche("fr", sans);
  assert.equal(STYLE_SANS_PRIX, "lisse");
  for (const etat of ["battant", "pliant", "rail", "auto"] as const) assert.equal(requete(liens[etat]).get("style"), STYLE_SANS_PRIX, etat);
  assert.equal(requete(liens.auto).get("guidage"), "auto");
});

test("guide de la fiche : le composant ne construit plus l'adresse à la main, et le titre est celui de la page", () => {
  const source = lire("src/components/portail-configurateur.tsx");
  assert.doesNotMatch(source, /href=\{`\/\$\{locale\}\/artisanat\/\$\{reponseGuide\.slug\}`\}/);
  assert.match(source, /href=\{liensGuide\[resultatGuide\(reponseGuide\)\]\}/);
  const page = lire("src/app/[lang]/artisanat/[slug]/page.tsx");
  assert.match(page, /liensGuide=\{liensGuideFiche\(locale, stylesDepart\(styleDepartPortail\)\)\}/);
  // Une seule formule : « Quel portail pour votre entrée ? » / « Which gate for your entrance? ».
  for (const l of ["fr", "en"] as const) assert.equal(TEXTES_PORTAIL[l].guideTitre, TXT[l].guide.h2, l);
  assert.equal(TEXTES_PORTAIL.fr.guideTitre.replace(/\xa0/g, " "), "Quel portail pour votre entrée ?");
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Galvanisé brut : le style est reconnu
// ---------------------------------------------------------------------------------------------------------------------------------
const depuisAdresse = (slug: SlugPortail, query: string) => configDepuisAdresse(slug, configDepart(slug, slug === "portail-battant" ? "lamesChene" : "plein"), new URLSearchParams(query));

test("galvanisé brut : ouverte depuis un style d'alu (?mat=acier&couleur=galva), la fiche reconnaît le style au lieu de « Composé à votre goût »", () => {
  for (const st of STYLES_PORTAIL) {
    const cfg = depuisAdresse("portail-battant", `style=${st}&mat=acier&couleur=galva`);
    assert.equal(cfg.couleur, "galva", st);
    assert.equal(cfg.mat, "acier", st);
    assert.equal(styleDe(cfg), st, `${st} en galvanisé brut`);
  }
});

test("galvanisé brut : le devis dit « Style : Lisse · Acier · Galvanisé brut » (et en anglais), plus « Composé à votre goût »", () => {
  const cfg = depuisAdresse("portail-battant", "style=lisse&mat=acier&couleur=galva");
  const fr = resumeConfig("portail-battant", cfg, "fr", null).join("\n");
  assert.match(fr, /Style : Lisse · Acier · Galvanisé brut/);
  assert.doesNotMatch(fr, /Composé à votre goût/);
  const en = resumeConfig("portail-battant", cfg, "en", null).join("\n");
  assert.match(en, /Style : Flat · Steel · Raw galvanised/);
  assert.doesNotMatch(en, /Made to your taste/);
});

test("galvanisé brut : rien ne change hors du galvanisé (acier laqué d'un style d'alu = composé ; styles d'acier et d'alu laqué = leur style)", () => {
  assert.equal(styleDe(depuisAdresse("portail-battant", "style=lisse&mat=acier&couleur=noir")), null, "un panneau lisse en acier laqué n'est pas un style tout fait");
  assert.equal(styleDe(depuisAdresse("portail-battant", "style=lisse&couleur=vert")), "lisse");
  for (const st of ["rosace", "volutes", "tole"] as StylePortail[]) assert.equal(styleDe(depuisAdresse("portail-battant", `style=${st}&couleur=galva`)), st, st);
  // Changer de style depuis la fiche (la tuile) reste ce qu'il était : appliquerStyle n'est pas modifié.
  const cfg = depuisAdresse("portail-battant", "style=lisse&mat=acier&couleur=galva");
  for (const st of STYLES_PORTAIL) assert.equal(styleDe(appliquerStyle(cfg, st)), st, `tuile ${st}`);
});

test("galvanisé brut : la note du style ne dit plus « alu », et la ligne « — prix » du style d'alu n'est plus écrite (le prix de la tuile est celui de l'alu laqué)", () => {
  for (const l of ["fr", "en"] as const) {
    const t = TEXTES_PORTAIL[l];
    assert.deepEqual(Object.keys(t.stylesNoteBrut), Object.keys(t.stylesNote), l);
    for (const st of STYLES_PORTAIL) {
      assert.doesNotMatch(t.stylesNoteBrut[st], /\balu(?:minium)?\b/i, `${l} ${st} : ${t.stylesNoteBrut[st]}`);
      if (!styleEstAlu(st)) assert.equal(t.stylesNoteBrut[st], t.stylesNote[st], `${l} ${st} : un style d'acier garde sa note`);
    }
  }
  assert.deepEqual(STYLES_PORTAIL.filter(styleEstAlu).sort(), ["barreaux", "lamesChene", "lisse", "plein"]);
  const source = lire("src/components/portail-configurateur.tsx");
  assert.match(source, /\(cfg\.couleur === "galva" \? tp\.stylesNoteBrut : tp\.stylesNote\)\[style\]/);
  assert.match(source, /!\(cfg\.couleur === "galva" && styleEstAlu\(style\)\) && <span> — /);
});

test("bande des styles : la tuile choisie reste à l'écran quand la bande se retrie par prix (le défilement accroché la laissait à moitié sortie à gauche)", () => {
  const source = lire("src/components/portail-configurateur.tsx");
  assert.match(source, /<div ref=\{tuilesRef\} className="cpt-tuiles"/);
  assert.match(source, /const r = tuilesRef\.current, p = r\?\.querySelector<HTMLElement>\('\[aria-pressed="true"\]'\);/);
  assert.match(source, /if \(a\.left < b\.left\) r\.scrollLeft \+= a\.left - b\.left;\s*else if \(a\.right > b\.right\) r\.scrollLeft \+= a\.right - b\.right;/);
  assert.match(source, /\}, \[ordreStyles, style\]\);/, "elle ne tourne que quand l'ordre ou le style change : jamais contre le défilement du visiteur");
});

// ---------------------------------------------------------------------------------------------------------------------------------
// L'arrivée avec une configuration dans l'adresse : pas de flash du style de départ
// ---------------------------------------------------------------------------------------------------------------------------------
type Minuteur = { f: () => void; ms: number };
/** Exécute le script d'attente dans un navigateur factice (adresse, bloc #acheter, minuteurs). */
function jouer(search: string, surcharge: Record<string, unknown> = {}) {
  const attrs = new Map<string, string>(), minuteurs: Minuteur[] = [];
  const racine = { setAttribute: (n: string, v: string) => void attrs.set(n, v), getAttribute: (n: string) => attrs.get(n) ?? null, removeAttribute: (n: string) => void attrs.delete(n) };
  vm.runInNewContext(scriptAttente(), { location: { search }, URLSearchParams, document: { getElementById: (id: string) => (id === HOTE_ATTENTE ? racine : null) }, setTimeout: (f: () => void, ms: number) => minuteurs.push({ f, ms }), ...surcharge });
  return { attrs, minuteurs, racine };
}

test("attente : sans paramètre de configuration dans l'adresse, le script ne fait rien (la page se charge comme avant)", () => {
  for (const search of ["", "?", "?utm_source=mail", "?lang=fr&ref=2", "?Style=plein", "?couleurs=vert"]) {
    const { attrs, minuteurs } = jouer(search);
    assert.equal(attrs.size, 0, `« ${search} » : aucun attribut`);
    assert.equal(minuteurs.length, 0, `« ${search} » : aucun minuteur`);
    assert.equal(adressePorteConfig(search), false, search);
  }
});

test("attente : chaque paramètre de configuration pose l'attribut « attente » et arme le filet de sécurité de 2,5 s", () => {
  for (const k of PARAMS_ADRESSE_FICHE) {
    const { attrs, minuteurs } = jouer(`?${k}=x`);
    assert.equal(attrs.get(ATTRIBUT_ATTENTE), "attente", k);
    assert.equal(minuteurs.length, 1, k);
    assert.equal(minuteurs[0].ms, DELAI_FILET_MS);
    assert.equal(adressePorteConfig(`?${k}=x`), true, k);
  }
  assert.equal(DELAI_FILET_MS, 2500);
  assert.equal(jouer("?style=barreaux&couleur=vert").attrs.get(ATTRIBUT_ATTENTE), "attente");
});

test("attente : le filet de sécurité montre la plaque en fondu puis retire l'attribut, même si la fiche n'a rien fait", () => {
  const { attrs, minuteurs } = jouer("?style=plein");
  minuteurs[0].f();
  assert.equal(attrs.get(ATTRIBUT_ATTENTE), "fondu");
  assert.equal(minuteurs.length, 2);
  assert.ok(minuteurs[1].ms >= DUREE_FONDU_MS, "l'attribut reste le temps du fondu");
  minuteurs[1].f();
  assert.equal(attrs.has(ATTRIBUT_ATTENTE), false, "plus d'attribut");
});

test("attente : la fiche qui a appliqué l'adresse libère la plaque (fondu, puis plus d'attribut) ; le filet ne fait alors plus rien", () => {
  const { attrs, minuteurs, racine } = jouer("?couleur=vert");
  const arme: Minuteur[] = [];
  libererAttente(racine, (f, ms) => void arme.push({ f, ms }));
  assert.equal(attrs.get(ATTRIBUT_ATTENTE), "fondu");
  minuteurs[0].f();   // le filet arrive pendant le fondu : il n'y touche pas
  assert.equal(attrs.get(ATTRIBUT_ATTENTE), "fondu");
  assert.equal(minuteurs.length, 1, "pas de nouveau minuteur");
  arme[0].f();
  assert.equal(attrs.has(ATTRIBUT_ATTENTE), false);
  // Libérer sans attente en cours : sans effet (adresse sans paramètre, script absent, sans JavaScript).
  const vide = new Map<string, string>();
  libererAttente({ getAttribute: (n) => vide.get(n) ?? null, setAttribute: (n, v) => void vide.set(n, v), removeAttribute: (n) => void vide.delete(n) }, () => assert.fail("pas de minuteur"));
  assert.equal(vide.size, 0);
});

test("attente : un navigateur sans URLSearchParams, sans adresse ou sans le bloc de la fiche ne casse rien (try/catch), sans JavaScript rien n'est jamais caché", () => {
  assert.doesNotThrow(() => jouer("?style=plein", { URLSearchParams: undefined }));
  assert.equal(jouer("?style=plein", { URLSearchParams: undefined }).attrs.size, 0);
  assert.doesNotThrow(() => jouer("?style=plein", { location: undefined }));
  // Pas de bloc #acheter (une autre page) : le script ne pose rien et n'arme aucun minuteur.
  const sansBloc = jouer("?style=plein", { document: { getElementById: () => null } });
  assert.equal(sansBloc.attrs.size, 0);
  assert.equal(sansBloc.minuteurs.length, 0);
  // L'attribut n'existe que dans le script : ni le HTML du serveur ni le gabarit de la page ne le portent.
  assert.doesNotMatch(lire("src/app/[lang]/layout.tsx"), /data-cfg-attente/);
  assert.doesNotMatch(lire("src/app/[lang]/artisanat/[slug]/page.tsx"), /data-cfg-attente/);
  // Le bloc qui reçoit l'attribut avant l'hydratation le déclare : sans cela React signale une erreur d'hydratation (« 1 Issue » en développement).
  assert.match(lire("src/app/[lang]/artisanat/[slug]/page.tsx"), /<div id="acheter" className="scroll-mt-0" suppressHydrationWarning>/);
  assert.equal(HOTE_ATTENTE, "acheter");
});

test("attente : la liste des paramètres du script est exactement celle que configDepuisAdresse lit", () => {
  const source = lire("src/lib/portails.ts");
  const corps = source.slice(source.indexOf("export function configDepuisAdresse"), source.indexOf("/** Les entrées du moteur de l'outil"));
  const lus = [...new Set([...corps.matchAll(/q\.(?:get|has)\("(\w+)"\)/g)].map((m) => m[1]))].sort();
  assert.deepEqual(lus, [...PARAMS_ADRESSE_FICHE].sort());
});

test("attente : la plaque n'est cachée que sous l'attribut, en opacity seulement, et le mouvement réduit supprime le fondu", () => {
  const css = lire("src/components/portail/configurateur-portail.css");
  const regles = [...css.matchAll(/([^{}]*data-cfg-attente[^{}]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corps: m[2].trim() }));
  assert.ok(regles.length >= 3, "attente, fondu, mouvement réduit");
  for (const r of regles) {
    assert.match(r.sel, /#acheter\[data-cfg-attente="(?:attente|fondu)"\]/, r.sel);
    assert.doesNotMatch(r.corps, /visibility|transform|display|backdrop-filter|filter:/, r.sel);
  }
  assert.match(css, /#acheter\[data-cfg-attente="attente"\] \.cpt-plaque[^{]*\{ opacity: 0; \}/);
  assert.match(css, /#acheter\[data-cfg-attente="fondu"\] \.cpt-plaque[^{]*\{ opacity: 1; transition: opacity 0\.22s ease-out; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ #acheter\[data-cfg-attente="fondu"\][^}]*transition: none;/);
  assert.equal(DUREE_FONDU_MS, 220);
  // Aucune règle ne cache la plaque sans l'attribut.
  assert.doesNotMatch(css.replace(/#acheter\[data-cfg-attente[^{]*\{[^}]*\}/g, ""), /\.cpt-plaque[^{]*\{[^}]*opacity: 0/);
});

test("attente : la fiche applique l'adresse avant l'affichage (useLayoutEffect), libère la plaque une fois les vignettes à jour, et le script est posé juste avant la fiche", () => {
  const source = lire("src/components/portail-configurateur.tsx");
  assert.doesNotMatch(source, /requestAnimationFrame\(\(\) => setCfg/, "plus d'application après le premier affichage");
  assert.match(source, /useLayoutEffect\(\(\) => \{\s*const recherche = window\.location\.search;\s*if \(!adressePorteConfig\(recherche\)\) return;\s*const q = new URLSearchParams\(recherche\);(?:\s*\/\/[^\n]*)*\s*setCfg\(\(c\) => configDepuisAdresse\(slug, c, q\)\);\s*setAdresseLue\(true\);/);
  assert.match(source, /if \(adresseLue && cfgLente === cfg\) libererAttente\(document\.getElementById\(HOTE_ATTENTE\)\);/);
  // Pas de nettoyage au démontage : en développement, React simule un démontage au premier affichage et retirerait l'attribut trop tôt.
  assert.doesNotMatch(source, /retirerAttente/);
  const page = lire("src/app/[lang]/artisanat/[slug]/page.tsx");
  assert.match(page, /<AttenteConfiguration \/>\s*<PortailConfigurateur/);
  const composant = lire("src/components/portail/attente-configuration.tsx");
  assert.match(composant, /suppressHydrationWarning/);
  assert.match(composant, /type=\{typeof window === "undefined" \? "text\/javascript" : "text\/plain"\}/);
});
