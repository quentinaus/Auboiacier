/**
 * Le guide « Quel portail pour votre entrée ? » de la page des portails (13/10/2026) : sa logique est dans src/lib/portails-guide.ts
 * (fonctions pures, sans moteur), que ces tests exécutent : les quatre parcours, le retour en arrière, le garde-fou du double appui,
 * l'adresse du bouton, le prix et le dessin du coulissant « sans rail », la mémoire de la session.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLE_MEMOIRE_GUIDE, DELAI_DOUBLE_APPUI_MS, ETATS, SUIVI_VIERGE, conseilGuide, etatGuide, lireReponses, memoriserReponses, modifier,
  actionAcceptee, questionCourante, repondre, repondues, reponseAcceptee, retourAccepte, suivreAction, suivreReponse, suivreRetour, type Reponses, type SuiviGuide,
} from "../src/lib/portails-guide.ts";
import { ORDRE_MODELES, TXT, lienFiche, prixPage, type ModeleCarte } from "../src/lib/portails-page.ts";
import { donneesPagePortails } from "../src/lib/portails-outil/donnees-page.ts";

const RACINE = join(import.meta.dirname, "..");
const D = donneesPagePortails();
const NOMS = { "portail-battant": "Portail battant", "portail-coulissant": "Portail coulissant", "portail-pliant": "Portail pliant", portillon: "Portillon" } as const;
const MODELES: ModeleCarte[] = ORDRE_MODELES.map((slug) => ({ slug, nom: NOMS[slug], ...D.modeles[slug] }));
const SANS_RAIL = D.sansRail!;
const requete = (lien: string) => new URL(lien, "http://site.test").searchParams;

/** Les quatre parcours : les réponses, l'état final, le modèle conseillé, le guidage de la fiche. */
const PARCOURS = {
  battant: { g: { derriere: true } as Reponses, slug: "portail-battant", guidage: undefined },
  pliant: { g: { derriere: false, cote: false } as Reponses, slug: "portail-pliant", guidage: undefined },
  rail: { g: { derriere: false, cote: true, sol: true } as Reponses, slug: "portail-coulissant", guidage: "rail" },
  auto: { g: { derriere: false, cote: true, sol: false } as Reponses, slug: "portail-coulissant", guidage: "auto" },
} as const;

test("guide : les sept états, trois questions puis quatre résultats", () => {
  assert.deepEqual([...ETATS], ["q0", "q1", "q2", "battant", "pliant", "rail", "auto"]);
  assert.equal(etatGuide({}), "q0");
  assert.equal(etatGuide({ derriere: false }), "q1");
  assert.equal(etatGuide({ derriere: false, cote: true }), "q2");
  for (const [etat, p] of Object.entries(PARCOURS)) assert.equal(etatGuide(p.g), etat, etat);
});

test("guide : la question courante et les questions répondues suivent chaque parcours", () => {
  assert.equal(questionCourante({}), 0);
  assert.deepEqual(repondues({}), []);
  assert.equal(questionCourante({ derriere: false }), 1);
  assert.deepEqual(repondues({ derriere: false }), [0]);
  assert.equal(questionCourante({ derriere: false, cote: true }), 2);
  assert.deepEqual(repondues({ derriere: false, cote: true }), [0, 1]);
  assert.equal(questionCourante(PARCOURS.battant.g), null);
  assert.deepEqual(repondues(PARCOURS.battant.g), [0]);
  assert.equal(questionCourante(PARCOURS.pliant.g), null);
  assert.deepEqual(repondues(PARCOURS.pliant.g), [0, 1]);
  for (const p of [PARCOURS.rail, PARCOURS.auto]) { assert.equal(questionCourante(p.g), null); assert.deepEqual(repondues(p.g), [0, 1, 2]); }
});

test("guide : chaque parcours conseille le bon modèle, au bon guidage, sur la bonne adresse de la fiche", () => {
  for (const locale of ["fr", "en"] as const) {
    for (const [etat, p] of Object.entries(PARCOURS)) {
      const c = conseilGuide(p.g, MODELES, SANS_RAIL, locale)!;
      assert.ok(c, `${etat} : un conseil`);
      assert.equal(c.etat, etat);
      assert.equal(c.slug, p.slug);
      assert.equal(c.vue.guidage, p.guidage);
      const q = requete(c.vue.lien);
      assert.ok(c.vue.lien.startsWith(`/${locale}/artisanat/${p.slug}?`), c.vue.lien);
      assert.ok(c.vue.lien.endsWith("#configuration"), "la fiche s'ouvre sur la configuration");
      assert.equal(q.get("guidage"), p.guidage ?? null, `${etat} : guidage=${p.guidage ?? "(absent)"}`);
      assert.equal(q.get("style"), c.vue.style);
    }
  }
});

test("guide : tant qu'une question reste sans réponse, il n'y a pas de conseil", () => {
  for (const g of [{}, { derriere: false }, { derriere: false, cote: true }] as Reponses[]) assert.equal(conseilGuide(g, MODELES, SANS_RAIL, "fr"), null);
});

test("guide : battant et pliant gardent le style et le « dès » de leur carte", () => {
  for (const [etat, slug] of [["battant", "portail-battant"], ["pliant", "portail-pliant"]] as const) {
    const c = conseilGuide(PARCOURS[etat].g, MODELES, SANS_RAIL, "fr")!;
    const m = D.modeles[slug];
    assert.equal(c.vue.auto, false);
    assert.equal(c.vue.style, m.style);
    assert.equal(c.vue.depart, m.depart);
    assert.equal(c.vue.departSans, m.departSans);
    assert.equal(c.vue.src, `/images/portails/scenes/cartes/${slug}-${m.style}.svg?v=${c.vue.src.split("v=")[1]}`);
    assert.equal(c.vue.lien, lienFiche("fr", slug, { style: m.style }));
  }
});

test("guide : coulissant sur rail, le style, le prix et le dessin du « dès » du coulissant", () => {
  const c = conseilGuide(PARCOURS.rail.g, MODELES, SANS_RAIL, "fr")!;
  const m = D.modeles["portail-coulissant"];
  assert.equal(c.vue.auto, false);
  assert.equal(c.vue.style, m.style);
  assert.equal(c.vue.depart, m.depart);
  assert.equal(c.vue.departSans, m.departSans);
  assert.doesNotMatch(c.vue.src, /-auto\.svg/);
  assert.equal(c.vue.lien, lienFiche("fr", "portail-coulissant", { style: m.style, guidage: "rail" }));
});

test("guide : coulissant sans rail, le style, le prix et le dessin sont ceux de props.sansRail", () => {
  const c = conseilGuide(PARCOURS.auto.g, MODELES, SANS_RAIL, "fr")!;
  assert.equal(c.vue.auto, true);
  assert.equal(c.vue.style, SANS_RAIL.style);
  assert.equal(c.vue.depart, SANS_RAIL.depart);
  assert.equal(c.vue.departSans, SANS_RAIL.departSans);
  assert.notEqual(c.vue.depart, D.modeles["portail-coulissant"].depart, "le sans rail n'a pas le prix du sur rail");
  assert.ok(c.vue.src.includes(`portail-coulissant-${SANS_RAIL.style}-auto.svg`), c.vue.src);
  assert.equal(c.vue.lien, lienFiche("fr", "portail-coulissant", { style: SANS_RAIL.style, guidage: "auto" }));
  // un autre prix de sans rail change le prix affiché : il vient bien de props.sansRail
  const autre = { style: "barreaux", depart: 12345, departSans: 11111 } as const;
  const c2 = conseilGuide(PARCOURS.auto.g, MODELES, autre, "en")!;
  assert.equal(c2.vue.depart, 12345);
  assert.equal(c2.vue.departSans, 11111);
  assert.ok(c2.vue.src.includes("portail-coulissant-barreaux-auto.svg"));
  assert.ok(c2.vue.lien.startsWith("/en/artisanat/portail-coulissant?style=barreaux&guidage=auto"));
});

test("guide : sans prix de sans rail, le coulissant sans rail garde son dessin et son adresse mais n'affiche pas le prix du sur rail", () => {
  const c = conseilGuide(PARCOURS.auto.g, MODELES, null, "fr")!;
  assert.equal(c.vue.auto, true);
  assert.equal(c.vue.depart, null);
  assert.equal(c.vue.departSans, null);
  assert.equal(requete(c.vue.lien).get("guidage"), "auto");
  assert.match(c.vue.src, /-auto\.svg/);
});

test("guide : l'alt du coulissant dit « sur rail » ou « sans rail », dans les deux langues (le dessin et le prix changent)", () => {
  for (const locale of ["fr", "en"] as const) {
    const t = TXT[locale];
    for (const [nom, bloc] of [["résultat du guide", t.guide], ["carte", t.modeles]] as const) {
      const rail = bloc.altGuidage("Coulissant", "Lisse", "rail"), auto = bloc.altGuidage("Coulissant", "Lisse", "auto");
      assert.notEqual(rail, auto, `${nom} : l'alt change avec le guidage`);
      assert.match(rail, locale === "fr" ? /sur rail/ : /on a rail/);
      assert.match(auto, locale === "fr" ? /sans rail/ : /no rail/);
    }
    // le dessin du résultat porte la mention d'illustration dans son alt (les cartes la disent sur la vignette)
    for (const g of ["rail", "auto"] as const) assert.match(t.guide.altGuidage("Coulissant", "Lisse", g), locale === "fr" ? /\(image d'illustration\)$/ : /\(illustration\)$/, "la mention d'illustration est dans l'alt");
    for (const a of [t.guide.alt("Battant", "Lisse"), t.guide.alt("Pliant", "Plein")]) assert.match(a, locale === "fr" ? /\(image d'illustration\)$/ : /\(illustration\)$/);
  }
});

test("guide : revenir sur une réponse efface celle-ci et les suivantes ; on peut en donner une autre", () => {
  const complet = PARCOURS.auto.g;
  assert.deepEqual(modifier(complet, 2), { derriere: false, cote: true });
  assert.equal(etatGuide(modifier(complet, 2)), "q2");
  assert.deepEqual(modifier(complet, 1), { derriere: false });
  assert.equal(etatGuide(modifier(complet, 1)), "q1");
  assert.deepEqual(modifier(complet, 0), {});
  assert.equal(etatGuide(modifier(complet, 0)), "q0");
  // une question sans réponse : rien ne change (la même référence)
  const g = { derriere: false };
  assert.equal(modifier(g, 2), g);
  assert.equal(modifier(g, 1), g);
  // « Retour » depuis le résultat du battant, puis l'autre réponse : on arrive au pliant
  const apres = repondre(modifier(PARCOURS.battant.g, 0), 0, false);
  assert.equal(etatGuide(apres), "q1");
  assert.equal(etatGuide(repondre(apres, 1, false)), "pliant");
  // changer la 2e réponse du coulissant oublie la 3e
  const autre = repondre(modifier(complet, 1), 1, false);
  assert.deepEqual(autre, { derriere: false, cote: false });
  assert.equal(etatGuide(autre), "pliant");
  // « Retour » depuis chaque résultat mène à la dernière question répondue
  for (const p of Object.values(PARCOURS)) {
    const faites = repondues(p.g), derniere = faites[faites.length - 1];
    const retour = modifier(p.g, derniere);
    assert.equal(etatGuide(retour), `q${derniere}`, `${p.slug} : le retour ouvre la dernière question`);
    assert.equal(repondues(retour).length, faites.length - 1);
  }
});

test("guide : une réponse à la fois (une réponse à une autre question que la courante est refusée)", () => {
  const vide: Reponses = {};
  assert.equal(repondre(vide, 1, false), vide, "la question 2 ne se répond pas avant la 1");
  assert.equal(repondre(vide, 2, true), vide);
  const q1: Reponses = { derriere: false };
  assert.equal(repondre(q1, 0, true), q1, "la question 1 est déjà répondue");
  assert.equal(repondre(q1, 2, true), q1);
  assert.equal(repondre(PARCOURS.battant.g, 1, false), PARCOURS.battant.g, "après un résultat, plus de réponse");
  assert.deepEqual(repondre(vide, 0, false), { derriere: false });
});

test("double appui : les clics arrivés moins de 450 ms après un changement d'état sont ignorés", () => {
  assert.equal(DELAI_DOUBLE_APPUI_MS, 450);
  assert.equal(reponseAcceptee({}, 0, DELAI_DOUBLE_APPUI_MS - 1), false);
  assert.equal(reponseAcceptee({}, 0, DELAI_DOUBLE_APPUI_MS), true);
  assert.equal(reponseAcceptee({}, 0, Number.POSITIVE_INFINITY), true, "le premier clic de la page");
  assert.equal(retourAccepte(PARCOURS.pliant.g, 1, DELAI_DOUBLE_APPUI_MS - 1), false);
  assert.equal(retourAccepte(PARCOURS.pliant.g, 1, DELAI_DOUBLE_APPUI_MS), true);
});

test("double appui : un double tap sur « Non » à la question 1 ne répond pas à la question 2", () => {
  let s: SuiviGuide = SUIVI_VIERGE;
  s = suivreReponse(s, 0, false, 10_000);
  assert.equal(etatGuide(s.reponses), "q1");
  // le 2e tap tombe sur le bouton de la question 2, 60 ms, 150 ms, 300 ms, 449 ms plus tard : ignoré
  for (const ms of [60, 150, 300, 449]) {
    const apres = suivreReponse(s, 1, false, 10_000 + ms);
    assert.equal(apres, s, `à ${ms} ms le clic est ignoré`);
    assert.equal(etatGuide(apres.reponses), "q1");
  }
  // un vrai deuxième tap, après avoir lu la question
  const fin = suivreReponse(s, 1, false, 10_000 + 450);
  assert.equal(etatGuide(fin.reponses), "pliant");
});

test("double appui : le double tap ne traverse pas non plus la question 2 → 3, ni « Retour »", () => {
  let s = suivreReponse(SUIVI_VIERGE, 0, false, 1_000);
  s = suivreReponse(s, 1, true, 2_000);
  assert.equal(etatGuide(s.reponses), "q2");
  assert.equal(suivreReponse(s, 2, true, 2_100), s, "pas de réponse à la 3e question à 100 ms");
  s = suivreReponse(s, 2, true, 2_600);
  assert.equal(etatGuide(s.reponses), "rail");
  // « Retour » : le 2e appui tombe au même endroit sur la question d'avant, qui n'a plus de « Retour » à cet instant
  const r1 = suivreRetour(s, 2, 3_100);
  assert.equal(etatGuide(r1.reponses), "q2");
  assert.equal(suivreRetour(r1, 1, 3_200), r1, "le 2e appui sur « Retour » est ignoré");
  const r2 = suivreRetour(r1, 1, 3_600);
  assert.equal(etatGuide(r2.reponses), "q1");
});

test("double appui : une réponse dont l'index n'est plus la question courante est ignorée, même longtemps après", () => {
  // le bouton de la question 1 (déjà répondue) ne peut plus répondre, quel que soit le temps écoulé
  let s = suivreReponse(SUIVI_VIERGE, 0, false, 5_000);
  const apres = suivreReponse(s, 0, true, 60_000);
  assert.equal(apres, s);
  assert.equal(etatGuide(apres.reponses), "q1");
  // un résultat ne reçoit plus de réponse
  s = suivreReponse(s, 1, false, 60_000);
  assert.equal(etatGuide(s.reponses), "pliant");
  assert.equal(suivreReponse(s, 1, true, 120_000), s);
  assert.equal(suivreReponse(s, 2, true, 120_000), s);
});

test("double appui : le lien « Composer ce portail » et le résumé « Besoin d'aide » attendent eux aussi 450 ms après un changement d'état", () => {
  assert.equal(actionAcceptee(DELAI_DOUBLE_APPUI_MS - 1), false);
  assert.equal(actionAcceptee(DELAI_DOUBLE_APPUI_MS), true);
  // « Oui, j'ai la place » (question 1) : le résultat apparaît, son lien « Composer ce portail » est posé sous le doigt
  const s = suivreReponse(SUIVI_VIERGE, 0, true, 20_000);
  assert.equal(etatGuide(s.reponses), "battant");
  for (const ms of [40, 80, 250, 400, 449]) assert.equal(suivreAction(s, 20_000 + ms), false, `le 2e appui à +${ms} ms n'ouvre pas la fiche`);
  assert.equal(suivreAction(s, 20_000 + 450), true, "un vrai clic, après avoir lu le résultat, ouvre la fiche");
  assert.equal(suivreAction(s, 20_000 + 30_000), true);
  // « Non » puis « Oui, c'est libre » : la question 3 apparaît, son « Besoin d'aide pour vérifier ? » est sous le doigt
  let q = suivreReponse(SUIVI_VIERGE, 0, false, 1_000);
  q = suivreReponse(q, 1, true, 2_000);
  assert.equal(etatGuide(q.reponses), "q2");
  assert.equal(suivreAction(q, 2_100), false, "le 2e appui ne déplie pas l'aide");
  assert.equal(suivreAction(q, 2_450), true);
  // chaque réponse, chaque retour, chaque « Recommencer » remet le délai à zéro
  for (const [etat, p] of Object.entries(PARCOURS)) {
    let t = 0, suivi: SuiviGuide = SUIVI_VIERGE;
    for (const i of repondues(p.g)) { t += 1_000; suivi = suivreReponse(suivi, i, p.g[["derriere", "cote", "sol"][i] as keyof Reponses]!, t); }
    assert.equal(suivreAction(suivi, t + 100), false, `${etat} : le lien du résultat est refusé 100 ms après la dernière réponse`);
    assert.equal(suivreAction(suivi, t + 450), true, `${etat} : puis accepté`);
    const retour = suivreRetour(suivi, repondues(p.g).at(-1)!, t + 1_000);
    assert.equal(suivreAction(retour, t + 1_100), false, `${etat} : le résumé de la question retrouvée est refusé 100 ms après « Retour »`);
    assert.equal(suivreAction(retour, t + 1_450), true);
  }
  // la page vient de s'afficher (ou revient de la fiche) : aucun changement d'état, le lien marche tout de suite
  assert.equal(suivreAction(SUIVI_VIERGE, 5), true);
});

test("double appui : un parcours complet, à son rythme, arrive au bon résultat (aucun clic légitime n'est refusé)", () => {
  for (const [etat, p] of Object.entries(PARCOURS)) {
    let s: SuiviGuide = SUIVI_VIERGE, t = 0;
    for (const i of repondues(p.g)) { t += 1_200; s = suivreReponse(s, i, p.g[["derriere", "cote", "sol"][i] as keyof Reponses]!, t); }
    assert.deepEqual(s.reponses, p.g, etat);
    assert.equal(etatGuide(s.reponses), etat);
  }
});

test("mémoire de la session : les réponses se relisent telles qu'elles ont été écrites, un texte abîmé donne un guide vierge", () => {
  assert.ok(CLE_MEMOIRE_GUIDE.length > 0);
  for (const p of Object.values(PARCOURS)) assert.deepEqual(lireReponses(memoriserReponses(p.g)), p.g);
  for (const g of [{}, { derriere: false }, { derriere: false, cote: true }] as Reponses[]) assert.deepEqual(lireReponses(memoriserReponses(g)), g, "une question en cours");
  for (const brut of [null, undefined, "", "pas du json", "[]", "null", "42", '"oui"', '{"derriere":"oui"}', '{"cote":true}', '{"sol":false}']) assert.deepEqual(lireReponses(brut), {}, String(brut));
  // des réponses incohérentes sont réduites à ce qui a un sens (le battant n'a pas de 2e question)
  assert.deepEqual(lireReponses('{"derriere":true,"cote":false,"sol":true}'), { derriere: true });
  assert.deepEqual(lireReponses('{"derriere":false,"cote":false,"sol":true}'), { derriere: false, cote: false });
  assert.deepEqual(lireReponses('{"derriere":false,"cote":true,"sol":"x"}'), { derriere: false, cote: true });
  assert.equal(memoriserReponses({ derriere: true, cote: false }), '{"derriere":true}');
});

test("le composant : les clics passent par le garde-fou, la mémoire de la session est lue après l'hydratation, aucun moteur", () => {
  const source = readFileSync(join(RACINE, "src/components/portail/portails-modeles.tsx"), "utf8");
  assert.match(source, /from "@\/lib\/portails-guide"/, "la logique vient de portails-guide.ts");
  assert.match(source, /suivreReponse\(/);
  assert.match(source, /suivreRetour\(/);
  assert.match(source, /sessionStorage/);
  assert.doesNotMatch(source, /function questionCourante|function repondues|function vueModele|function etatDe/, "plus de logique du guide dans le composant");
  const lib = readFileSync(join(RACINE, "src/lib/portails-guide.ts"), "utf8");
  const imports = [...lib.matchAll(/^import[^;]*from\s+"([^"]+)"/gm)].map((m) => m[1]);
  for (const i of imports) assert.match(i, /^\.\/(?:portails-base|portails-page)\.ts$/, `portails-guide.ts n'importe que du code léger : ${i}`);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Ce que l'affichage doit garder (13/10/2026) : ces tests lisent les SOURCES ; le rendu se mesure dans le navigateur.
// ---------------------------------------------------------------------------------------------------------------------------------
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");
const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const TSX = "src/components/portail/portails-modeles.tsx", CSS = "src/components/portail/portails-modeles.css", SCHEMA = "src/components/portail/schema-guide.tsx";

test("accessibilité : pas d'aria-live sur le guide (le focus va sur le titre) ; « Retour » aussi sur le résultat ; le schéma dit qu'il est une illustration", () => {
  const tsx = sansCommentaires(lire(TSX));
  assert.doesNotMatch(tsx, /aria-live/, "le focus déplacé sur le titre est déjà lu : pas de double annonce");
  assert.match(tsx, /titreRef\.current\?\.focus\(/, "le focus va sur le titre du nouvel état");
  assert.equal(tsx.match(/\{retour\(actif\)\}/g)?.length, 2, "« Retour » sur les questions ET sur les résultats");
  assert.match(tsx, /revenir\(0, ev\.timeStamp\)/, "« Recommencer » revient à la première question");
  assert.match(sansCommentaires(lire(SCHEMA)), /aria-label=\{`\$\{label\} \(\$\{t\.ill\.toLowerCase\(\)\}\)`\}/, "le nom accessible du schéma porte la mention d'illustration");
});

test("HTML valide : le role=\"img\" est sur le <svg> du schéma, pas sur la <figure> qui contient une <figcaption> ; la mention n'est pas lue deux fois", () => {
  const schema = sansCommentaires(lire(SCHEMA));
  const figure = schema.match(/<figure\b[^>]*>/)?.[0] ?? "";
  assert.ok(figure, "une figure");
  assert.doesNotMatch(figure, /\brole=/, "une figure avec une légende n'a pas de rôle (erreur du validateur W3C sinon)");
  assert.doesNotMatch(figure, /aria-label/, "le nom est porté par le dessin");
  const svg = schema.match(/<svg\b[^>]*>/)?.[0] ?? "";
  assert.match(svg, /\brole="img"/, "le dessin est une image pour un lecteur d'écran");
  assert.match(svg, /aria-label=\{`\$\{label\} \(\$\{t\.ill\.toLowerCase\(\)\}\)`\}/, "…et son nom porte la mention d'illustration");
  const legende = schema.match(/<figcaption\b[^>]*>/)?.[0] ?? "";
  assert.match(legende, /aria-hidden="true"/, "la légende répète la mention du nom : cachée aux lecteurs d'écran");
  assert.match(legende, /data-mention/, "la mention reste visible (et exemptée de la taille minimale)");
});

test("contraste élevé : la figure du guide garde ses couleurs (forced-color-adjust: none), sinon ses textes bruns sont illisibles sur le noir forcé", () => {
  const css = lire(CSS);
  assert.match(css, /@media \(forced-colors: active\)\s*\{\s*\.pm-fig\s*\{\s*forced-color-adjust:\s*none;\s*\}\s*\}/);
});

test("cartes : la ligne de style réserve deux lignes là où elle peut passer sur deux lignes dans une seule carte (blocs prix alignés)", () => {
  const css = lire(CSS), tsx = sansCommentaires(lire(TSX));
  const regle = css.match(/@media ([^{]*)\{\s*\.pm-ligne-style\s*\{\s*min-height:\s*([\d.]+)em;\s*\}\s*\}/);
  assert.ok(regle, "la règle de réserve existe");
  assert.ok(Number(regle![2]) >= 2.8, `deux lignes de ${regle![2]} em : au moins 2 × 1,4`);
  // 2 colonnes étroites (de 560 à 699 px) et 4 colonnes (de 1100 à 1299 px) : les plages où la ligne du coulissant passe sur deux lignes
  assert.match(regle![1], /min-width: 560px\) and \(max-width: 699px\)/);
  assert.match(regle![1], /min-width: 1100px\) and \(max-width: 1299px\)/);
  assert.match(tsx, /className="pm-duo pm-ligne-style /, "la ligne de style des cartes porte la classe");
});

test("schéma de la question 2 : « 3,66 m libres au moins » (le passage plus 160 mm), les autres schémas gardent leurs cotes", () => {
  const schema = lire(SCHEMA);
  assert.match(schema, /longueur: "3,66 m libres au moins"/);
  assert.match(schema, /longueur: "3\.66 m free at least"/);
  assert.doesNotMatch(schema, /3,50 m libres|3\.50 m free/);
  assert.match(schema, /demi: "1,75 m"/);
  assert.match(schema, /passage: "passage de 3,50 m"/);
  // le texte des schémas : 16 unités sur 400 (12 px dès 300 px de large, 12,8 à 320 px en pleine largeur)
  assert.match(schema, /const PETIT = 16, GRAND = 19;/);
});

test("cartes : quatre colonnes dès 1100 px, deux de 560 à 1099 ; l'étiquette « Conseillé » n'existe que sur la carte conseillée", () => {
  const tsx = lire(TSX), css = lire(CSS);
  assert.match(tsx, /min-\[560px\]:grid-cols-2/);
  assert.match(tsx, /min-\[1100px\]:grid-cols-4/);
  assert.doesNotMatch(tsx, /min-\[1360px\]:grid-cols-4/, "plus de deux colonnes géantes entre 1024 et 1359 px");
  assert.match(sansCommentaires(tsx), /\{ici && \(\s*<span className="pm-etiq"/, "l'étiquette n'est rendue que pour la carte conseillée");
  const regleEtiq = css.match(/\.pm-etiq\s*\{[^}]*\}/)?.[0] ?? "";
  assert.doesNotMatch(regleEtiq, /opacity\s*:\s*0\b/, "plus d'étiquette invisible dans le HTML");
  assert.match(regleEtiq, /animation:\s*pm-fondu/, "elle apparaît en fondu (opacity)");
  assert.match(regleEtiq, /position:\s*absolute/, "posée dans la plaque : aucun décalage");
});

test("cartes : le coulissant réserve le texte de son autre variante (sur rail / sans rail) dans un pseudo-élément invisible, sans le mettre dans le HTML lu", () => {
  const tsx = sansCommentaires(lire(TSX)), css = lire(CSS);
  // les deux lignes qui changent avec le guide (style, place) portent l'autre texte dans data-autre, seulement pour le coulissant
  assert.match(tsx, /const autre = m\.slug === "portail-coulissant" \? vueModele\(m, sansRail, v\.auto \? "rail" : "auto", locale\) : null;/);
  assert.equal(tsx.match(/data-autre=\{autre \? (?:ligne|place)\(autre\) : undefined\}/g)?.length, 2, "la ligne de style et la ligne « place »");
  assert.equal(tsx.match(/className="pm-duo /g)?.length, 2);
  // le vrai texte est dans un <span> posé dans la case 1 / 1, le pseudo-élément dans la même case, invisible (visibility) : la hauteur est celle du plus long
  assert.match(css, /\.pm-duo > span \{ grid-area: 1 \/ 1; \}/);
  assert.match(css, /\.pm-duo\[data-autre\]::after \{[^}]*content: attr\(data-autre\);[^}]*grid-area: 1 \/ 1;[^}]*visibility: hidden;/);
  // la ligne « place » reste cachée sur téléphone (hidden) et devient une grille dès 560 px, pas un bloc
  assert.match(tsx, /className="pm-duo mt-2 hidden [^"]*min-\[560px\]:grid"/);
  // et les deux variantes sont bien deux textes différents, dans les deux langues
  for (const l of ["fr", "en"] as const) {
    const t = TXT[l].modeles;
    assert.notEqual(t.ligneStyle("Lisse", "3,50 × 1,60 m", "portail-coulissant"), t.ligneStyleSansRail("Lisse", "3,50 × 1,60 m"));
    assert.notEqual(t.place["portail-coulissant"], t.placeSansRail);
  }
});

test("sans JavaScript : @media (scripting: none) et un <noscript> sans <style> (HTML valide) qui renvoie aux modèles", () => {
  const tsx = lire(TSX), css = lire(CSS);
  assert.doesNotMatch(sansCommentaires(tsx), /<noscript>\s*<style/);
  assert.match(css, /@media \(scripting: none\)\s*\{[^}]*\.pm-js\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /@media \(scripting: none\)\s*\{[\s\S]*?\.pm-sous, \.pm-guide-corps \{ display: none; \}/);
  assert.match(sansCommentaires(tsx), /<noscript>[\s\S]*t\.guide\.sansJs[\s\S]*href="#modeles"[\s\S]*<\/noscript>/);
  for (const l of ["fr", "en"] as const) assert.ok(TXT[l].guide.sansJs.length > 20, `${l} : le message sans JavaScript existe`);
});

test("mouvement réduit : plus de zoom au survol de la carte ; les boutons « Oui / Non » ont une bordure à 3 : 1 au moins", () => {
  const css = lire(CSS);
  const reduit = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduit, /\.pm-carte:hover \.pm-dessin[^{]*\{\s*transform:\s*none/);
  assert.match(reduit, /\.pm-etiq/);
  const m = css.match(/\.pm-reps \.btn-contour\s*\{[^}]*border-color:\s*rgba\(29,\s*29,\s*31,\s*(0?\.\d+)\)/);
  assert.ok(m, "bordure des boutons de réponse");
  const alpha = Number(m![1]);
  const fond = 255, encre = 29, composee = fond * (1 - alpha) + encre * alpha; // gris composé sur le blanc
  const lum = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const contraste = (1.05) / (0.2126 * lum(composee) + 0.7152 * lum(composee) + 0.0722 * lum(composee) + 0.05);
  assert.ok(contraste >= 3, `contraste de la bordure ${contraste.toFixed(2)} : 3 au moins`);
});

test("prix : le guide et les cartes écrivent leurs montants avec prixPage (espace insécable ordinaire), jamais prixAffiche", () => {
  const tsx = sansCommentaires(lire(TSX));
  assert.match(tsx, /prixPage\(n, locale\)/);
  assert.doesNotMatch(tsx, /prixAffiche/);
  for (const l of ["fr", "en"] as const) assert.ok(!prixPage(2570, l).includes("\u202f"), "pas d'espace fine : elle disparaît en gras");
  assert.equal(prixPage(2570, "fr"), "2\u00a0570\u00a0€");
});

test("calage du guide : une hauteur réservée par plage de largeurs, en français et en anglais, du plus petit téléphone au grand écran", () => {
  const css = lire(CSS);
  const bloc = css.slice(css.indexOf("/* ==== calage du guide : début"), css.indexOf("/* ==== calage du guide : fin"));
  assert.ok(bloc.length > 200, "le bloc de calage est écrit (node scripts/calage-guide-portails.mjs)");
  for (const l of ["fr", "en"]) {
    const regles = [...bloc.matchAll(new RegExp(String.raw`(?:@media \(min-width: (\d+)px\) \{ )?\.pm-guide:lang\(${l}\) \.pm-pile \{ min-height: (\d+)px; \}`, "g"))].map((m) => ({ de: m[1] ? Number(m[1]) : 0, H: Number(m[2]) }));
    assert.ok(regles.length >= 3, `${l} : plusieurs paliers`);
    assert.equal(regles[0].de, 0, `${l} : le premier palier vaut dès la plus petite largeur`);
    for (let i = 1; i < regles.length; i++) assert.ok(regles[i].de > regles[i - 1].de, `${l} : les paliers se suivent par largeur croissante`);
    for (const r of regles) assert.ok(r.H >= 200 && r.H <= 500, `${l} : ${r.H} px`);
    assert.ok(regles.some((r) => r.de > 0 && r.de <= 400), `${l} : un palier pour les petits téléphones (moins de 400 px)`);
  }
  const script = lire("scripts/calage-guide-portails.mjs");
  assert.match(script, /node scripts\/calage-guide-portails\.mjs verifier/, "la procédure de contrôle est décrite");
  // les sécurités du 13/10/2026 : une marge, une fenêtre de retard des baisses (plus large sans WebKit), la barre de défilement classique, WebKit mesuré
  const marge = Number(script.match(/const MARGE = (\d+);/)?.[1]);
  assert.ok(marge >= 4 && marge <= 12, `marge de ${marge} px : raisonnable (4 à 12)`);
  const [avec, sans] = (script.match(/const FENETRE_AVEC_WEBKIT = (\d+), FENETRE_SANS_WEBKIT = (\d+);/) ?? []).slice(1).map(Number);
  assert.ok(avec >= 8 && sans >= 18 && sans > avec, `fenêtres de ${avec} px (avec WebKit) et ${sans} px (sans) : sans WebKit, elle couvre les 18 px mesurés`);
  assert.match(script, /const BARRE = 15, BARRE_DES = \d+;/, "la barre de défilement classique est mesurée");
  assert.ok(existsSync(join(RACINE, "scripts/calage-guide-webkit.swift")), "le pilote WebKit est dans le dépôt");
  assert.match(script, /calage-guide-webkit\.swift/, "…et le script le lance");
  // les hauteurs réservées couvrent au moins le plus haut des états mesuré à la fin de la plage la plus étroite (le premier palier est le plus haut)
  for (const l of ["fr", "en"]) {
    const hauteurs = [...bloc.matchAll(new RegExp(String.raw`\.pm-guide:lang\(${l}\) \.pm-pile \{ min-height: (\d+)px; \}`, "g"))].map((m) => Number(m[1]));
    assert.equal(hauteurs[0], Math.max(...hauteurs), `${l} : le plus petit téléphone a la plus haute réserve`);
  }
});
