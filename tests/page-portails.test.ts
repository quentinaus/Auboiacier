/**
 * La page des portails (12/10/2026) : ses prix viennent du serveur et sont ceux de la fiche, ses adresses ouvrent la fiche sur
 * la configuration affichée, ses textes existent dans les deux langues, aucun montant n'est écrit à la main.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { configDepart, configDepuisAdresse, STYLES_PORTAIL, type SlugPortail } from "../src/lib/portails.ts";
import { COULEURS_PORTAIL } from "../src/lib/portails-base.ts";
import { ORDRE_MODELES, TXT, finitionDe, lienFiche, matiereVitrine, paramsVitrine, prixPlage, srcCarte, srcVitrine, formatCote } from "../src/lib/portails-page.ts";
import { donneesPagePortails } from "../src/lib/portails-outil/donnees-page.ts";
import { prixDepartPortail, prixPortail, prixStylesPortail, styleDepartPortail } from "../src/lib/portails-outil/prix.ts";

const RACINE = join(import.meta.dirname, "..");
const D = donneesPagePortails();
const requete = (lien: string) => new URL(lien, "http://site.test").searchParams;
const prixDeLaFiche = (slug: SlugPortail, lien: string, reception: "pose" | "retrait" = "pose") => {
  const cfg = configDepuisAdresse(slug, configDepart(slug), requete(lien));
  const r = prixPortail(slug, { ...cfg, reception });
  return r.ok ? r.prix : null;
};

test("vitrine : pour chaque style et chaque teinte, le bouton ouvre la fiche au prix affiché (la tôle : une fourchette qui contient le prix de la fiche)", () => {
  for (const style of STYLES_PORTAIL) {
    for (const teinte of COULEURS_PORTAIL) {
      const lien = lienFiche("fr", "portail-battant", paramsVitrine(style, teinte));
      const affiche = D.vitrine[finitionDe(teinte)][style];
      const fiche = prixDeLaFiche("portail-battant", lien), ficheSans = prixDeLaFiche("portail-battant", lien, "retrait");
      assert.notEqual(affiche.pose, null, `${style}/${teinte} : un prix posé`);
      if (style === "tole") {
        // la fiche ouvre sur le premier dessin : son prix est dans la fourchette annoncée
        assert.ok(fiche! >= affiche.pose! && fiche! <= (affiche.poseMax ?? affiche.pose!), `${style}/${teinte} : ${fiche} dans ${affiche.pose}–${affiche.poseMax}`);
        assert.ok(ficheSans! >= affiche.sansPose! && ficheSans! <= (affiche.sansPoseMax ?? affiche.sansPose!), `${style}/${teinte} sans pose`);
      } else {
        assert.equal(fiche, affiche.pose, `${style}/${teinte} : prix posé`);
        assert.equal(ficheSans, affiche.sansPose, `${style}/${teinte} : prix sans pose`);
      }
    }
  }
});

test("vitrine : la teinte ne change pas le prix, sauf le galvanisé brut (acier, sans laquage)", () => {
  for (const style of STYLES_PORTAIL) {
    for (const teinte of COULEURS_PORTAIL.filter((c) => c !== "galva")) {
      const fiche = prixDeLaFiche("portail-battant", lienFiche("fr", "portail-battant", paramsVitrine(style, teinte)))!;
      const px = D.vitrine.laque[style];
      if (style === "tole") assert.ok(fiche >= px.pose! && fiche <= px.poseMax!, `${style}/${teinte} : ${fiche} dans la fourchette`);
      else assert.equal(fiche, px.pose, `${style}/${teinte}`);
    }
    assert.ok(D.vitrine.brut[style].pose! <= D.vitrine.laque[style].pose!, `${style} : le galvanisé brut ne coûte pas plus que le thermolaqué`);
  }
  // le galvanisé brut est de l'acier, même pour un style qui est en alu
  for (const style of STYLES_PORTAIL) assert.equal(matiereVitrine(style, "galva"), "acier");
  assert.equal(matiereVitrine("lisse", "noir"), "alu");
  assert.equal(matiereVitrine("rosace", "noir"), "acier");
  const fiche = configDepuisAdresse("portail-battant", configDepart("portail-battant"), requete(lienFiche("fr", "portail-battant", paramsVitrine("lisse", "galva"))));
  assert.equal(fiche.mat, "acier"); assert.equal(fiche.couleur, "galva");
});

test("cartes : le style dessiné est celui du « dès » ; le prix affiché est celui de la fiche ouverte sur ce style", () => {
  for (const slug of ORDRE_MODELES) {
    const m = D.modeles[slug];
    assert.equal(m.style, styleDepartPortail(slug), `${slug} : le dessin est le style le moins cher`);
    const lien = lienFiche("fr", slug, { style: m.style });
    assert.equal(prixDeLaFiche(slug, lien), m.depart, `${slug} : « dès » posé`);
    assert.equal(prixDeLaFiche(slug, lien, "retrait"), m.departSans, `${slug} : « dès » sans pose`);
    // le « dès » de la page est celui des fiches et de la page du guide de choix
    assert.equal(m.depart, Math.min(...STYLES_PORTAIL.map((st) => prixStylesPortail(slug)[st].pose).filter((x): x is number => x !== null)));
    assert.equal(m.depart, prixDepartPortail(slug, "pose"), `${slug} : « dès » posé = prixDepartPortail`);
    assert.equal(m.departSans, prixDepartPortail(slug, "retrait"), `${slug} : « dès » sans pose = prixDepartPortail`);
  }
});

test("coulissant sans rail : son style, son « dès » et l'adresse de la fiche avec guidage=auto", () => {
  const s = D.sansRail!;
  assert.ok(s, "un prix sans rail");
  assert.equal(s.style, styleDepartPortail("portail-coulissant", { guidage: "auto" }));
  const lien = lienFiche("fr", "portail-coulissant", { style: s.style, guidage: "auto" });
  assert.equal(requete(lien).get("guidage"), "auto");
  assert.equal(prixDeLaFiche("portail-coulissant", lien), s.depart);
  assert.equal(prixDeLaFiche("portail-coulissant", lien, "retrait"), s.departSans);
  assert.ok(s.depart! > D.modeles["portail-coulissant"].depart!, "sans rail coûte plus cher que sur rail (contrepoids, plus d'acier)");
});

test("les adresses : ordre style, mat, couleur, guidage ; une valeur absente est omise ; l'ancre ouvre la configuration", () => {
  assert.equal(lienFiche("fr", "portail-battant", { style: "lisse", mat: "acier", couleur: "galva" }), "/fr/artisanat/portail-battant?style=lisse&mat=acier&couleur=galva#configuration");
  assert.equal(lienFiche("en", "portillon"), "/en/artisanat/portillon#configuration");
  assert.deepEqual(paramsVitrine("tole", "noir"), { style: "tole", couleur: "noir" });
  assert.deepEqual(paramsVitrine("volutes", "galva"), { style: "volutes", mat: "acier", couleur: "galva" });
});

test("les dessins : une adresse par style et par teinte, une par carte, versionnée", () => {
  assert.match(srcVitrine("lamesChene", "anthracite"), /^\/images\/portails\/scenes\/vitrine\/battant-lamesChene-anthracite\.svg\?v=\d+$/);
  assert.match(srcCarte("portail-pliant", "lisse"), /^\/images\/portails\/scenes\/cartes\/portail-pliant-lisse\.svg\?v=\d+$/);
  assert.match(srcCarte("portail-coulissant", "lisse", "auto"), /portail-coulissant-lisse-auto\.svg/);
  assert.doesNotMatch(srcCarte("portail-battant", "lisse", "auto"), /auto/, "le guidage ne concerne que le coulissant");
});

test("formats : cote en mètres, fourchette de prix", () => {
  assert.equal(formatCote(3500, 1600, "fr"), "3,50 × 1,60 m");
  assert.equal(formatCote(1000, 1600, "en"), "1.00 × 1.60 m");
  const plage = prixPlage(2970, 3110, "fr");
  assert.equal(plage.plage, true);
  assert.equal(plage.texte.replace(/[\u00a0\u202f]/g, " "), "2 970 à 3 110 €");
  assert.equal(prixPlage(2970, null, "fr").plage, false);
  assert.equal(prixPlage(2970, 2970, "fr").plage, false);
});

/** Les clés d'un objet de textes, en profondeur ; une fonction compte comme une feuille. */
function cles(o: unknown, prefixe = ""): string[] {
  if (o === null || typeof o !== "object" || Array.isArray(o)) return [prefixe];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => cles(v, `${prefixe}.${k}`));
}
test("textes : le français et l'anglais ont les mêmes clés, et les mêmes fonctions rendent du texte", () => {
  assert.deepEqual(cles(TXT.fr), cles(TXT.en));
  assert.equal(TXT.fr.faits.length, TXT.en.faits.length);
  assert.equal(TXT.fr.etapes.liste.length, 4); assert.equal(TXT.en.etapes.liste.length, 4);
  for (const l of ["fr", "en"] as const) {
    const t = TXT[l];
    assert.equal(typeof t.vitrine.cote("3,50 m", "1,60 m"), "string");
    assert.ok(t.vitrine.teinte("Gris", "RAL 7016").includes("RAL 7016"));
    assert.ok(!t.vitrine.teinte("Rouille").includes("RAL"));
    for (const slug of ORDRE_MODELES) { assert.ok(t.modeles.phrase[slug]); assert.ok(t.modeles.place[slug]); }
  }
});

test("aucun montant en euros écrit à la main dans la page (les prix viennent du serveur)", () => {
  const montant = /\d[\d   ]{2,}\s?€/;
  const fichiers = ["src/lib/portails-page.ts", "src/components/portail/page-portails.tsx"];
  const dossier = join(RACINE, "src/components/portail");
  if (existsSync(dossier)) for (const f of readdirSync(dossier)) if (/\.(tsx|ts)$/.test(f) && statSync(join(dossier, f)).isFile()) fichiers.push(`src/components/portail/${f}`);
  for (const f of new Set(fichiers)) {
    if (!existsSync(join(RACINE, f))) continue;
    const texte = readFileSync(join(RACINE, f), "utf8");
    assert.ok(!montant.test(texte), `${f} : un montant écrit à la main (${texte.match(montant)?.[0]})`);
  }
});

test("la page ne dit jamais « pose comprise », « garantie », « nouveau » (Quentin : rien qu'on ne puisse tenir)", () => {
  const texte = JSON.stringify([TXT.fr, TXT.en], (_k, v) => (typeof v === "function" ? v("A", "B", "C") : v));
  for (const mot of [/pose comprise/i, /garantie/i, /\bnouveau\b/i, /\bnew\b/i, /fer forgé/i, /\bTIG\b/, /sur étude/i, /à étudier/i]) assert.ok(!mot.test(texte), `mot interdit : ${mot}`);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// La page du serveur (page-portails.tsx, page.tsx, EtapesFabrication), 13/10/2026 : ses liens existent, ses îlots restent légers, ses
// fichiers neufs gardent le langage du site. Ces tests lisent les SOURCES (le rendu complet se vérifie dans le navigateur).
// Les 77 scènes (existence, cadre, poids) sont déjà vérifiées par tests/scenes-portails.test.ts : pas répétées ici.
// ---------------------------------------------------------------------------------------------------------------------------------
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");
const FICHIER_PAGE = "src/app/[lang]/artisanat/famille/[famille]/page.tsx";
const ILOTS = ["src/components/portail/vitrine-portail.tsx", "src/components/portail/portails-modeles.tsx"];
const FICHIERS_NEUFS = [
  "src/components/portail/page-portails.tsx", "src/components/portail/page-portails.css",
  "src/components/portail/vitrine-portail.tsx", "src/components/portail/vitrine-portail.css",
  "src/components/portail/portails-modeles.tsx", "src/components/portail/portails-modeles.css",
];

/** Les imports d'un fichier : { de, type } ; `type` = « import type » (effacé à la compilation). */
function imports(source: string): { de: string; type: boolean }[] {
  const sansCommentaires = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return [...sansCommentaires.matchAll(/^\s*import\s+(type\s+)?(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => ({ de: m[2], type: Boolean(m[1]) }));
}

/** Vrai si l'adresse (sans la langue) mène à une page : un dossier fixe en priorité, sinon un dossier [paramètre] ; le paramètre est contrôlé. */
function routeExiste(chemin: string, slugs: Set<string>): boolean {
  const segments = chemin.split("#")[0].split("?")[0].split("/").filter(Boolean).slice(1); // sans la langue
  let dossier = join(RACINE, "src/app/[lang]");
  const familles = lire("src/lib/categories-collection.ts").match(/FAMILLES_AVEC_PAGE[^=]*=\s*\[([^\]]*)\]/)?.[1].match(/"([^"]+)"/g)?.map((m) => m.slice(1, -1)) ?? [];
  for (const segment of segments) {
    if (existsSync(join(dossier, segment)) && statSync(join(dossier, segment)).isDirectory()) { dossier = join(dossier, segment); continue; }
    const dynamique = readdirSync(dossier).find((d) => /^\[[^.\]]+\]$/.test(d) && statSync(join(dossier, d)).isDirectory());
    if (!dynamique) return false;
    if (dynamique === "[slug]" && !slugs.has(segment)) return false;
    if (dynamique === "[famille]" && !familles.includes(segment)) return false;
    dossier = join(dossier, dynamique);
  }
  return existsSync(join(dossier, "page.tsx"));
}

test("chaque lien de la page se résout vers une route qui existe (les 4 fiches, le guide du choix, le métallier, le contact, la collection)", async () => {
  const { products } = await import("../src/lib/products.ts");
  const slugs = new Set(products.map((p) => p.slug));
  const fiches = products.filter((p) => p.famille === "portail").map((p) => p.slug);
  assert.deepEqual([...fiches].sort(), [...ORDRE_MODELES].sort(), "les quatre modèles de la page sont ceux du catalogue");
  const liens = new Set<string>();
  for (const l of ["fr", "en"] as const) {
    for (const slug of ORDRE_MODELES) {
      liens.add(lienFiche(l, slug, { style: D.modeles[slug].style }));
      liens.add(lienFiche(l, slug, { style: D.modeles[slug].style, guidage: "auto" }));
    }
    for (const style of STYLES_PORTAIL) for (const teinte of COULEURS_PORTAIL) liens.add(lienFiche(l, "portail-battant", paramsVitrine(style, teinte)));
  }
  // Les adresses écrites dans la page du serveur et dans la branche « portail » de page.tsx (textes() : les deux pages voisines).
  const dansLaPage = lire("src/components/portail/page-portails.tsx");
  const source = lire(FICHIER_PAGE);
  const brancheGardeCorps = source.indexOf('if (famille === "garde-corps")'), brancheNormale = source.indexOf("return {", source.indexOf("  }\n  return {", brancheGardeCorps));
  for (const t of [dansLaPage, source.slice(brancheNormale, source.indexOf("export async function generateMetadata"))])
    for (const m of t.matchAll(/`(\/\$\{locale\}[^`$]*)`/g)) liens.add(m[1].replace("${locale}", "/fr").replace("//", "/"));
  for (const l of ["fr", "en"]) for (const fin of ["", "/contact", "/artisanat", "/portail-sur-mesure-saumur", "/metallier-saumur", "/artisanat/famille/portail"]) liens.add(`/${l}${fin}`);
  assert.ok(liens.size > 80);
  for (const lien of liens) assert.ok(routeExiste(lien, slugs), `${lien} : aucune route`);
  // Le contrôle voit bien une adresse qui n'existe pas.
  assert.equal(routeExiste("/fr/artisanat/portail-inconnu", slugs), false);
  assert.equal(routeExiste("/fr/artisanat/famille/inconnue", slugs), false);
  assert.equal(routeExiste("/fr/page-inconnue/encore", slugs), false);
  // Les deux pages voisines que la page garde en bas (référencement, cahier 8).
  assert.match(source, /\/portail-sur-mesure-saumur/);
  assert.match(source, /dict\.liens\.metallierSaumur/);
  assert.match(dansLaPage, /\/contact`/);
});

test("les adresses de dessins de la page mènent à des fichiers qui existent", () => {
  const sur = (src: string) => existsSync(join(RACINE, "public", src.split("?")[0]));
  for (const style of STYLES_PORTAIL) {
    for (const teinte of COULEURS_PORTAIL) assert.ok(sur(srcVitrine(style, teinte)), srcVitrine(style, teinte));
    for (const slug of ORDRE_MODELES) assert.ok(sur(srcCarte(slug, style)), srcCarte(slug, style));
    assert.ok(sur(srcCarte("portail-coulissant", style, "auto")), `coulissant sans rail, ${style}`);
  }
});

test("EtapesFabrication garde ses valeurs par défaut : cinq colonnes, fond blanc ; la page Collection ne change pas", () => {
  const source = lire("src/components/etapes-fabrication.tsx");
  assert.match(source, /colonnes = 5/);
  assert.match(source, /fond = "blanc"/);
  assert.match(source, /colonnes\?: 4 \| 5/);
  assert.match(source, /fond\?: "blanc" \| "creme"/);
  assert.match(source, /colonnes === 4 \? "lg:grid-cols-4" : "lg:grid-cols-5"/, "quatre colonnes ou cinq : classes écrites en entier");
  assert.match(source, /fond === "creme" \? "bg-\[#f5f1ea\][^"]*" : "bg-\[#ffffff\] py-14 md:py-20"/, "le fond blanc garde ses espacements d'origine");
  assert.match(lire("src/app/[lang]/artisanat/page.tsx"), /<EtapesFabrication titre=\{t\.etapesTitre\} etapes=\{t\.etapes\} \/>/, "la Collection n'envoie aucun réglage");
  assert.match(lire("src/components/portail/page-portails.tsx"), /<EtapesFabrication [^>]*colonnes=\{4\}[^>]*fond="creme"/);
});

test("page.tsx : plus d'ancien guide ni de « dès » écrit sur place ; la page reste statique ; JSON-LD, métadonnées et garde-corps gardés", () => {
  const source = lire(FICHIER_PAGE);
  const importes = imports(source).map((i) => i.de);
  assert.ok(!importes.some((d) => /portails-guide/.test(d)), "n'importe plus portails-guide");
  assert.ok(!importes.some((d) => /prix-portail\.server/.test(d)), "n'importe plus prix-portail.server");
  assert.ok(!/PortailsGuide|departPortail|prixDepartPortail/.test(source));
  assert.ok(importes.includes("@/components/portail/page-portails"));
  assert.ok(!/searchParams/.test(source), "la page reste statique : aucune lecture de l'adresse");
  for (const garde of ["generateStaticParams", "generateMetadata", "jsonLdFilAriane", "jsonLdListe", "scriptJsonLd", "<CarteProduit", 'famille === "portail"'])
    assert.ok(source.includes(garde), `page.tsx garde ${garde}`);
  assert.match(source, /phrase: TXT_PORTAILS\[locale\]\.phrase/, "la phrase de la page vient de portails-page.ts");
  // Le titre, la description, le canonical et l'hreflang viennent de metadataPage, avec le même titre et la même description qu'avant.
  assert.match(source, /Portail sur mesure, alu ou acier/);
  assert.match(source, /Portails sur mesure en alu ou en acier, fabriqués à Saumur : \$\{n\} modèles, composés à votre goût, posés par l'atelier\./);
});

test("page-portails.tsx : composant serveur, un seul titre de premier niveau, les prix du serveur, la vitrine avant les modèles", () => {
  const source = lire("src/components/portail/page-portails.tsx");
  assert.ok(!/^\s*["']use client["']/m.test(source), "composant serveur");
  assert.equal(source.match(/<h1[\s>]/g)?.length, 1, "un seul <h1>");
  const importes = imports(source);
  assert.ok(importes.some((i) => i.de === "@/lib/portails-page.server"), "les prix viennent du serveur");
  assert.ok(!importes.some((i) => !i.type && /^@\/lib\/portails$|portail-configurateur|moteur\.genere/.test(i.de)), "aucun moteur côté page");
  assert.match(lire("src/lib/portails-page.server.ts"), /^import "server-only";/m);
  assert.ok(source.indexOf("<VitrinePortail") < source.indexOf("<PortailsModeles"), "la vitrine, puis les quatre modèles, puis le guide");
  assert.ok(source.indexOf("<PortailsModeles") < source.indexOf("<EtapesFabrication"));
  assert.ok(source.indexOf("<EtapesFabrication") < source.indexOf('id="pp-contact"'));
  assert.match(source, /className="pp-page /, "pp-page porte --info (la colonne d'info commune à la phrase et à la vitrine)");
  assert.match(lire("src/components/portail/page-portails.css"), /\.pp-page\s*\{[^}]*--info:\s*clamp\(340px,\s*28vw,\s*460px\)/);
});

test("les deux îlots du navigateur n'importent ni le moteur, ni la fiche, ni le serveur (poids de la page)", () => {
  for (const f of ILOTS) {
    const source = lire(f);
    assert.match(source, /^"use client";/, `${f} : îlot client`);
    for (const i of imports(source)) {
      if (i.type) continue;
      assert.ok(!/^@\/lib\/portails$|^\.{1,2}\/(?:\.\.\/)*(?:lib\/)?portails(?:\.ts)?$/.test(i.de), `${f} importe le moteur par ${i.de}`);
      assert.ok(!/portail-configurateur|moteur\.genere|vue-ouverture|portails-outil|\.server|server-only|prix-portail/.test(i.de), `${f} importe ${i.de}`);
    }
    assert.ok(!/\bVue\b/.test(source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), `${f} : pas de <Vue>`);
  }
});

test("fichiers neufs : ni verre, ni SMIL, ni capitales, ni pilule, ni transition hors opacity et transform", () => {
  const roulesDeTeinte = "src/components/portail/vitrine-portail"; // seules les pastilles de teinte sont rondes
  for (const f of FICHIERS_NEUFS) {
    if (!existsSync(join(RACINE, f))) { assert.ok(f.endsWith(".css"), `${f} manque`); continue; }
    const source = lire(f);
    const css = f.endsWith(".css");
    assert.ok(!/backdrop-filter|-webkit-backdrop/.test(source), `${f} : backdrop-filter`);
    assert.ok(!/<animate|<set\b|<animateTransform/.test(source), `${f} : SMIL`);
    assert.ok(!/(?<![\w-])uppercase(?![\w-])|text-transform\s*:\s*(?:uppercase|capitalize)/.test(source), `${f} : capitales`);
    assert.ok(!/tracking-\[0?\.[1-9]|tracking-(?:wide|wider|widest)\b|letter-spacing\s*:\s*(?:0?\.(?:0[5-9]|[1-9])\d*|[1-9][\d.]*)em/.test(source), `${f} : interlettrage large`);
    if (!f.startsWith(roulesDeTeinte)) assert.ok(!/rounded-full|border-radius\s*:\s*(?:50%|999+px|100vmax)/.test(source), `${f} : pilule ou rond`);
    // Le mouvement : seulement opacity et transform.
    for (const m of source.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)[;}]/g))
      for (const item of m[1].split(/,(?![^()]*\))/)) assert.match(item.trim().split(/\s+/)[0], /^(?:opacity|transform|none)$/, `${f} : transition « ${item.trim()} »`);
    if (!css) {
      assert.ok(!/(?<![\w:-])transition(?![-\w])/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), `${f} : « transition » seul anime aussi les couleurs et les ombres`);
      assert.ok(!/transition-(?:all|colors|shadow)/.test(source), `${f} : transition-all, -colors ou -shadow`);
      for (const m of source.matchAll(/transition-\[([^\]]+)\]/g)) for (const item of m[1].split(",")) assert.match(item, /^(?:opacity|transform)$/, `${f} : transition-[${m[1]}]`);
    }
    if (/transition|animation/.test(source) && css) assert.match(source, /prefers-reduced-motion/, `${f} : le mouvement réduit coupe les animations`);
    if (css && /:hover/.test(source)) assert.match(source, /\(hover:\s*hover\)/, `${f} : le survol sous @media (hover: hover)`);
  }
});
