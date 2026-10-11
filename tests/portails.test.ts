import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  acomptePortail, appliquerStyle, bornesPortail, configDepart, decrireDecor, guidePortail, lireConfig, lireConfigPanier, lireDecorChoix, planPortail, styleDe, versEntrees, versParams, versParamsPanier,
  ACOMPTE_PORTAIL_PCT, DECORS_PORTAIL, SLUGS_PORTAIL, STYLES_PORTAIL,
  type ChoixDecor, type ConfigPortail, type SlugPortail, type StylePortail,
} from "../src/lib/portails.ts";
import { prixDepartModeles, prixDepartPortail, prixPortail, prixVariantesPortail } from "../src/lib/portails-outil/prix.ts";
import { composerEstimationPortail } from "../src/lib/portails-outil/devis-site.ts";
import { getProduct } from "../src/lib/products.ts";
import { tarifer } from "../src/lib/tarif-panier.ts";
import { CALCUL_GC } from "../src/lib/garde-corps-outil/site.ts";
import { PRISE_DE_COTES, type ResultatLieu } from "../src/lib/deplacement.ts";

/**
 * Les portails sur le site (étude du 06/10/2026) : le dessin vient du moteur de l'outil de plans (extrait tel quel), le
 * prix du chiffrage de l'outil (chiffré dans le dépôt). Ces tests tiennent le site et l'outil ensemble : même prix pour
 * chaque portail de la référence écrite par scripts/extraire-portails.mjs, à l'euro.
 */

const REF = JSON.parse(readFileSync(new URL("./reference/portails-outil.json", import.meta.url), "utf8")) as {
  cas: { modele: string; v: Record<string, unknown>; o?: { complement?: boolean; reception?: "pose" | "transporteur" | "retrait" }; prix: number; alertes: number }[];
};
const SLUG_DE = Object.fromEntries(Object.entries(SLUGS_PORTAIL).map(([s, m]) => [m, s])) as Record<string, SlugPortail>;

/** La configuration du site qui correspond à une entrée de l'outil (style + options). */
function configDe(slug: SlugPortail, v: Record<string, unknown>): ConfigPortail {
  let cfg = configDepart(slug, v.ptStyle as never);
  if (v.ptP) cfg = { ...cfg, P: Number(v.ptP) };
  if (v.ptH) cfg = { ...cfg, H: Number(v.ptH) };
  if (v.ptMoteur) cfg = { ...cfg, moteur: true };
  if (v.ptMoteurModele) cfg = { ...cfg, moteurModele: v.ptMoteurModele as ConfigPortail["moteurModele"] };
  if (v.ptPoteaux) cfg = { ...cfg, poteaux: v.ptPoteaux as ConfigPortail["poteaux"] };
  if (v.ptGuidage) cfg = { ...cfg, guidage: v.ptGuidage as ConfigPortail["guidage"] };
  if (v.ptMat) cfg = { ...cfg, mat: v.ptMat as ConfigPortail["mat"] };
  if (v.ptSoub) cfg = { ...cfg, soub: v.ptSoub as ConfigPortail["soub"] };
  if (v.ptHSoub) cfg = { ...cfg, hSoub: Number(v.ptHSoub) };
  if (v.ptDecor) cfg = { ...cfg, decor: v.ptDecor as ConfigPortail["decor"], mat: "acier" };
  if (v.ptDecorChoix) cfg = { ...cfg, decorChoix: JSON.parse(String(v.ptDecorChoix)) as ChoixDecor[] };
  if (v.ptBouts) cfg = { ...cfg, bouts: v.ptBouts as ConfigPortail["bouts"] };
  if (v.ptBarreauxDeco) cfg = { ...cfg, barreauxDeco: v.ptBarreauxDeco as ConfigPortail["barreauxDeco"] };
  if (v.ptPointes) cfg = { ...cfg, pointes: true };
  if (v.ptMoulure) cfg = { ...cfg, moulure: true };
  if (v.ptFinition === "brut") cfg = { ...cfg, couleur: "galva" };
  if (v.ptDesign) cfg = { ...cfg, design: v.ptDesign as ConfigPortail["design"] };
  return cfg;
}

test("les prix du site sont ceux de l'outil de plans, portail par portail (120 cas)", () => {
  assert.ok(REF.cas.length >= 100);
  for (const c of REF.cas) {
    const slug = SLUG_DE[c.modele];
    if (c.o?.complement) {
      // Le portillon assorti : sa part dans le prix d'un battant du même style (une seule visite, un seul voyage).
      const avec = prixPortail("portail-battant", { ...configDe("portail-battant", { ptStyle: c.v.ptStyle }), portillon: true, portillonP: Number(c.v.ptP) });
      assert.ok(avec.ok, `portillon assorti ${JSON.stringify(c.v)}`);
      if (avec.ok) assert.equal(avec.portillon, c.prix, `portillon assorti ${JSON.stringify(c.v)}`);
      continue;
    }
    const r = prixPortail(slug, { ...configDe(slug, c.v), ...(c.o?.reception ? { reception: c.o.reception } : {}) });
    if (c.alertes) { assert.equal(r.ok, false, `${c.modele} ${JSON.stringify(c.v)} : à étudier dans l'outil`); continue; }
    assert.ok(r.ok, `${c.modele} ${JSON.stringify(c.v)} : refusé sur le site`);
    if (r.ok) assert.equal(r.prix, c.prix, `${c.modele} ${JSON.stringify(c.v)}`);
  }
});

test("les 4 fiches existent, et leur « à partir de » est le style le moins cher à la cote courante", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const fiche = getProduct(slug);
    assert.ok(fiche, slug);
    assert.equal(fiche?.famille, "portail");
    // Commande en ligne depuis le 10/10/2026 (acompte de 40 % au panier).
    assert.equal(fiche?.orderMode, "cart");
    const depart = prixDepartPortail(slug);
    const prix = STYLES_PORTAIL.map((st) => prixPortail(slug, configDepart(slug, st))).filter((r) => r.ok).map((r) => (r as { prix: number }).prix);
    assert.equal(depart, Math.min(...prix), slug);
  }
});

test("la configuration se relit à l'identique, et tout choix inconnu ou toute cote hors bornes est refusé", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) for (const st of STYLES_PORTAIL) {
    const cfg = configDepart(slug, st);
    const lu = lireConfig(versParams(slug, cfg));
    assert.deepEqual(lu, { slug, cfg }, `${slug} ${st}`);
    assert.equal(styleDe(cfg), st, `${slug} ${st} : le style se reconnaît`);
  }
  const p = versParams("portail-battant", configDepart("portail-battant"));
  for (const [k, v] of [["P", "900"], ["P", "9000"], ["H", "3000"], ["mat", "bois"], ["remp", "verre"], ["slug", "fenetre"], ["moteur", "oui"]]) {
    const q = new URLSearchParams(p);
    q.set(k, v);
    assert.equal(lireConfig(q), null, `${k}=${v}`);
  }
});

test("un style remplit les blocs ; changer un bloc donne « composé »", () => {
  const cfg = appliquerStyle(configDepart("portail-battant"), "volutes");
  assert.equal(cfg.mat, "acier");
  assert.equal(cfg.remp, "barreaux");
  assert.equal(cfg.decor, "frise", "le style Volutes = barreaux + la formule de décor « frise » (lot 3)");
  assert.equal(styleDe(cfg), "volutes");
  assert.equal(styleDe({ ...cfg, decor: "medaillon" }), null);
});

test("le guide des trois questions mène au bon modèle", () => {
  assert.deepEqual(guidePortail({ derriere: true }), { slug: "portail-battant" });
  assert.deepEqual(guidePortail({ derriere: false, cote: false }), { slug: "portail-pliant" });
  assert.deepEqual(guidePortail({ derriere: false, cote: true, sol: true }), { slug: "portail-coulissant", guidage: "rail" });
  assert.deepEqual(guidePortail({ derriere: false, cote: true, sol: false }), { slug: "portail-coulissant", guidage: "auto" });
  assert.equal(guidePortail({}), null);
});

test("décors (lot 3) : chaque formule se dessine et se chiffre sur le site, avec le catalogue anonymisé", () => {
  for (const slug of ["portail-battant", "portillon"] as SlugPortail[]) for (const d of DECORS_PORTAIL) {
    if (d === "aucun" || d === "perso") continue;
    const cfg = { ...configDepart(slug, "barreaux"), decor: d, mat: "acier" as const };
    const R = planPortail(slug, cfg);
    const r = prixPortail(slug, cfg);
    if (d === "surMesure") { assert.equal(r.ok, false, `${slug} : sur mesure = à étudier`); continue; }
    assert.equal(R.alertes.length, 0, `${slug} ${d} : ${R.alertes.join(" ")}`);
    const base = prixPortail(slug, configDepart(slug, "barreaux"));
    assert.ok(r.ok && base.ok && r.prix > base.prix, `${slug} ${d} : plus cher que les barreaux seuls`);
    assert.equal(lireConfig(versParams(slug, cfg))?.cfg.decor, d, `${slug} ${d} : se relit`);
  }
});

test("Volutes : chaque forme du haut et chaque bas ont un prix, jamais « À étudier » (Quentin, 10/10/2026)", () => {
  // 3 500 × 1 800, haut droit, bas en lames : aucun nombre pair de vides ne prenait la S du catalogue (±10 %) et le
  // décor était refusé. Les volutes se posent alors en file (motifs.js, mtRefVidesLu) : le portail a un prix.
  // Pliant de 2 440 : panneaux de 460, ni 5 ni 6 S de 150 × 70 dans les ±10 % : S de 190 × 75, frise un peu plus haute.
  for (const [slug, P, H] of [["portail-battant", 3500, 1800], ["portail-battant", 3500, 1600], ["portail-battant", 2400, 1200], ["portail-pliant", 2440, 1800], ["portillon", 1000, 1800]] as [SlugPortail, number, number][])
    for (const forme of ["droit", "chapeau", "creux", "biais"] as const) for (const soub of ["aucun", "plein", "lames", "barreaux"] as const) {
      const r = prixPortail(slug, { ...appliquerStyle(configDepart(slug), "volutes"), P, H, forme, soub });
      assert.ok(r.ok, `${slug} ${P} × ${H} ${forme} ${soub} : ${r.ok ? "" : r.alertes.join(" ")}`);
    }
});

test("Cœurs : les panneaux de 600 ont un prix, jamais « À étudier » (Quentin, 10/10/2026)", () => {
  // Panneau de 600 : 5 cœurs de 95 à +10,7 % ou 6 à −10,9 %, aucune pièce dans les ±10 % : la reprise la plus faible au
  // gabarit, ±12 % au plus (motifs.js, MT_ATELIER.repriseSecours). Portillon de 780, pliant de 2 500 et 3 000, petit
  // vantail du battant 1/3 – 2/3 de 2 260.
  for (const [slug, P, rep] of [["portillon", 780, "egal"], ["portail-pliant", 2500, "egal"], ["portail-pliant", 3000, "egal"], ["portail-battant", 2260, "tiers"]] as [SlugPortail, number, "egal" | "tiers"][])
    for (const H of [1000, 2000]) for (const forme of ["droit", "chapeau"] as const) {
      const r = prixPortail(slug, { ...configDepart(slug, "barreaux"), decor: "coeurs", mat: "acier", pointes: true, P, H, rep, forme });
      assert.ok(r.ok, `${slug} ${P} × ${H} ${rep} ${forme} : ${r.ok ? "" : r.alertes.join(" ")}`);
    }
});

test("une seule taille de pièce par portail, sur tous les vantaux (Quentin, 10/10/2026)", () => {
  // Avant : chaque panneau choisissait sa pièce (battant 1/3 – 2/3 : grands cœurs d'un côté, petits de l'autre ; haut
  // chapeau : C de 190 × 95 sur les côtés, de 110 × 60 au milieu). plans-portails.js recalcule avec une pièce imposée.
  for (const [slug, P, H, rep, forme, decor] of [["portail-battant", 2260, 2000, "tiers", "droit", "coeurs"], ["portail-battant", 2000, 1000, "tiers", "droit", "classique"], ["portail-battant", 4300, 1000, "egal", "chapeau", "classique"], ["portail-pliant", 2400, 1000, "egal", "chapeau", "medaillon"]] as [SlugPortail, number, number, "egal" | "tiers", "droit" | "chapeau", "coeurs" | "classique" | "medaillon"][]) {
    const cfg = { ...configDepart(slug, "barreaux"), decor, mat: "acier" as const, pointes: true, P, H, rep, forme };
    const note = planPortail(slug, cfg).notes.find((n) => n.startsWith("Décor : pièces du commerce")) ?? "";
    assert.ok(note && !(note.split(" : ").pop() ?? "").includes(","), `${slug} ${P} × ${H} ${rep} ${forme} ${decor} : une seule pièce attendue — ${note}`);
    assert.ok(prixPortail(slug, cfg).ok, `${slug} ${P} × ${H} ${decor} : a un prix`);
  }
});

test("« Personnaliser » (lot 10) : 1 ou 2 emplacements permis par motifs.js, relus à l'identique ; tout le reste est refusé", () => {
  const choix: ChoixDecor[] = [{ assemblage: "entre", forme: "S", pos: "milieu" }, { assemblage: "cimier", forme: "C" }];
  const cfg: ConfigPortail = { ...configDepart("portail-battant", "barreaux"), mat: "acier", decor: "perso", decorChoix: choix, bouts: "bouton", barreauxDeco: "torsade" };
  assert.deepEqual(lireConfig(versParams("portail-battant", cfg)), { slug: "portail-battant", cfg });
  const r = prixPortail("portail-battant", cfg), base = prixPortail("portail-battant", { ...cfg, decor: "aucun", decorChoix: [] });
  assert.ok(r.ok && base.ok && r.prix > base.prix, "le décor personnalisé se chiffre, plus cher que sans décor");
  assert.match(decrireDecor(cfg, "fr"), /Volute en S, entre les barreaux au milieu \+ Volute en C, couronnement/);
  for (const faux of ["", "[]", "{}", JSON.stringify([...choix, choix[0]]), JSON.stringify([{ assemblage: "barreaux", forme: "C" }]), JSON.stringify([{ assemblage: "coeurs", forme: "S" }]),
    JSON.stringify([{ assemblage: "entre", forme: "C", pos: "dessus" }]), JSON.stringify([{ assemblage: "entre", forme: "C", liaison: "colliers" }])]) {
    assert.equal(lireDecorChoix(faux), null, `refusé : ${faux}`);
  }
  // Des emplacements sans décor « perso » : refusés (jamais devinés).
  const q = versParams("portail-battant", cfg);
  q.set("decor", "frise");
  assert.equal(lireConfig(q), null);
});

test("portillon assorti (lot 10) : posé avec le portail, moins cher que seul, relu à l'identique", () => {
  const cfg: ConfigPortail = { ...configDepart("portail-battant", "lamesChene"), portillon: true, portillonP: 1100, portillonSens: "droite" };
  assert.deepEqual(lireConfig(versParams("portail-battant", cfg)), { slug: "portail-battant", cfg });
  const V = prixVariantesPortail("portail-battant", cfg);
  assert.ok(V.base.ok && V.portillon?.avec && V.portillon.seul, "les deux prix du portillon");
  if (V.base.ok && V.portillon?.avec && V.portillon.seul) {
    assert.equal(V.base.portillon, V.portillon.avec);
    assert.ok(V.portillon.avec < V.portillon.seul - 200, `assorti ${V.portillon.avec} € < seul ${V.portillon.seul} €`);
    const sans = prixPortail("portail-battant", { ...cfg, portillon: false });
    assert.ok(sans.ok && V.base.prix === sans.prix + V.portillon.avec, "le prix posé = portail + portillon");
  }
  // Pas de portillon assorti sur la fiche du portillon, ni hors de ses bornes.
  const p = versParams("portillon", configDepart("portillon"));
  p.set("portillon", "1");
  assert.equal(lireConfig(p), null);
  const q = versParams("portail-battant", cfg);
  q.set("portillonP", "3000");
  assert.equal(lireConfig(q), null);
});

test("estimation PDF (lot 9) : le devis de l'outil, son total est le prix affiché, sans aucun coût", () => {
  for (const [slug, cfg] of [
    ["portail-battant", { ...configDepart("portail-battant", "lamesChene"), moteur: true, portillon: true }],
    ["portail-battant", configDepart("portail-battant", "volutes")],
    ["portail-coulissant", { ...configDepart("portail-coulissant", "plein"), moteur: true }],
    ["portillon", configDepart("portillon", "rosace")],
  ] as [SlugPortail, ConfigPortail][]) {
    const r = composerEstimationPortail({ slug, cfg, client: { nom: "Essai" }, date: new Date(2026, 9, 9) });
    const p = prixPortail(slug, cfg);
    assert.ok(r.ok && p.ok, slug);
    if (!r.ok || !p.ok) continue;
    assert.equal(r.devis.nature, "estimation");
    assert.equal(r.devis.total, p.prix, `${slug} : total = prix de la fiche`);
    assert.equal(r.devis.lignes.filter((l) => !l.titre).reduce((s, l) => s + l.total, 0), r.devis.total, `${slug} : somme des lignes`);
    assert.equal(r.devis.lienFiche, "", "pas de commande en ligne");
    const texte = JSON.stringify(r.devis);
    for (const interdit of ["plancher", "fraisFixes", "heure_atelier", "Bon pour accord", "acompte"]) assert.ok(!texte.includes(interdit), `${slug} : « ${interdit} »`);
  }
});

test("estimation PDF en anglais (10/10/2026) : mêmes lignes et mêmes montants que le français, aucune phrase française, aucun coût", () => {
  const FRANCAIS = /[éèêëàâçùûôîï]|\b(le|la|les|des|du|une|et|pour|avec|sans|votre|vos|nous|vous|est|sont|chez)\b/i;
  let compares = 0;
  for (const [slug, base] of [
    ["portail-battant", { ...configDepart("portail-battant", "lamesChene"), moteur: true, portillon: true }],
    ["portail-battant", configDepart("portail-battant", "volutes")],
    ["portail-coulissant", { ...configDepart("portail-coulissant", "plein"), moteur: true }],
    ["portail-pliant", configDepart("portail-pliant", "barreaux")],
    ["portillon", configDepart("portillon", "rosace")],
  ] as [SlugPortail, ConfigPortail][]) {
    for (const reception of ["pose", "transporteur", "retrait"] as const) {
      const cfg: ConfigPortail = { ...base, reception, ...(reception !== "pose" ? { moteur: false } : {}) };
      const entree = { slug, cfg, client: { nom: "Essai" }, date: new Date(2026, 9, 9), livraison: reception === "transporteur" ? 190 : null };
      const f = composerEstimationPortail(entree), e = composerEstimationPortail({ ...entree, locale: "en" });
      assert.ok(f.ok && e.ok, `${slug} ${reception}`);
      if (!f.ok || !e.ok) continue;
      compares++;
      assert.equal(e.devis.locale, "en");
      assert.equal(e.devis.total, f.devis.total, `${slug} ${reception} : même total`);
      assert.deepEqual(e.devis.lignes.map((l) => [l.quantite, l.unitaire, l.total]), f.devis.lignes.map((l) => [l.quantite, l.unitaire, l.total]), `${slug} ${reception} : mêmes montants`);
      assert.equal(e.devis.conditions.length, f.devis.conditions.length, `${slug} ${reception} : mêmes conditions`);
      assert.equal(e.devis.delai, "6 to 8 weeks");
      const { emetteur, client, ...corps } = e.devis;
      void emetteur; void client;
      const texte = JSON.stringify(corps);
      const reste = texte.match(new RegExp(FRANCAIS.source, "gi"));
      assert.ok(!reste, `${slug} ${reception} : du français dans l'anglais : ${reste?.slice(0, 6).join(" | ")}`);
      assert.match(texte, /auboiacier\.fr\/en\/cgv/);
      for (const interdit of ["plancher", "fraisFixes", "heure_atelier", "Bon pour accord", "deposit"]) assert.ok(!texte.includes(interdit), `${slug} ${reception} : « ${interdit} »`);
    }
  }
  assert.equal(compares, 15);
});

test("galvanisé brut (11/10/2026) : une teinte « galva » en acier seulement, moins chère que laqué, relue à l'identique, devis sans peinture", () => {
  for (const [slug, st] of [["portail-battant", "plein"], ["portail-battant", "barreaux"], ["portail-battant", "rosace"], ["portail-coulissant", "plein"], ["portail-pliant", "barreaux"]] as [SlugPortail, StylePortail][]) {
    const laque: ConfigPortail = { ...configDe(slug, { ptStyle: st, ptMat: "acier" }), couleur: "noir" };
    const brut: ConfigPortail = { ...laque, couleur: "galva" };
    const pl = prixPortail(slug, laque), pb = prixPortail(slug, brut);
    assert.ok(pl.ok && pb.ok, `${slug} ${st}`);
    if (pl.ok && pb.ok) assert.ok(pb.prix < pl.prix, `${slug} ${st} : brut ${pb.prix} € moins cher que laqué ${pl.prix} €`);
    assert.equal(versEntrees(brut).ptFinition, "brut");
    assert.equal(versEntrees(laque).ptFinition, undefined);
    const relue = lireConfig(new URLSearchParams({ slug, ...Object.fromEntries(versParams(slug, brut)) }));
    assert.equal(relue?.cfg.couleur, "galva", `${slug} ${st} : la teinte se relit`);
    const d = composerEstimationPortail({ slug, cfg: brut, client: { nom: "Essai" }, date: new Date(2026, 9, 11) });
    assert.ok(d.ok, `${slug} ${st} : estimation`);
    if (d.ok) {
      const texte = JSON.stringify(d.devis);
      assert.ok(/galvanisation à chaud, laissée brute/.test(texte), "finition dite");
      assert.ok(!/thermolaqu|duplex|\bRAL\b/i.test(texte), `${slug} ${st} : aucune peinture annoncée`);
    }
  }
  // en alu : refusé (on ne laisse pas l'alu brut) ; appliquer un style en alu remet une teinte laquée
  const alu: ConfigPortail = { ...configDe("portail-battant", { ptStyle: "plein" }), couleur: "galva" };
  assert.equal(lireConfig(new URLSearchParams({ slug: "portail-battant", ...Object.fromEntries(versParams("portail-battant", { ...alu, mat: "alu" })) })), null, "alu brut refusé");
  const style = appliquerStyle({ ...configDe("portail-battant", { ptStyle: "rosace" }), couleur: "galva" }, "lisse");
  assert.equal(style.mat, "alu");
  assert.equal(style.couleur, "anthracite", "un style en alu redonne un gris laqué");
  assert.equal(appliquerStyle({ ...configDe("portail-battant", { ptStyle: "rosace" }), couleur: "galva" }, "volutes").couleur, "galva", "un style en acier garde le brut");
});

test("la page des portails (10/10/2026) : le « dès » des 4 modèles aux cotes du client, null hors des bornes", () => {
  const d = prixDepartModeles(3500, 1600);
  assert.deepEqual(Object.keys(d).sort(), ["portail-battant", "portail-coulissant", "portail-pliant", "portillon"]);
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const attendu = Math.min(...STYLES_PORTAIL.map((st) => prixPortail(slug, configDepart(slug, st))).filter((r) => r.ok).map((r) => (r as { prix: number }).prix));
    assert.equal(d[slug], attendu, `${slug} : le style le moins cher à la cote courante`);
  }
  const large = prixDepartModeles(5500, 1600);
  assert.equal(large["portail-battant"], null, "battant trop large : à étudier");
  assert.ok((large["portail-coulissant"] ?? 0) > 0, "le coulissant va jusqu'à 6 m");
  assert.ok((prixDepartModeles(2600, 1600)["portail-battant"] ?? 0) < (d["portail-battant"] ?? 0), "plus étroit, moins cher");
});

test("le dessin vient de l'outil : vue de face, de dessus et de côté pour chaque modèle et chaque style", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) for (const st of STYLES_PORTAIL) {
    const R = planPortail(slug, configDepart(slug, st));
    assert.ok(R.vues.face.length > 5 && R.vues.dessus.length > 3 && R.vues.cote.length > 3, `${slug} ${st}`);
    assert.equal(R.alertes.length, 0, `${slug} ${st} : ${R.alertes.join(" ")}`);
  }
});

test("aucun coût en clair dans ce que le dépôt publie (moteur, référence, fiches)", () => {
  const publics = [
    readFileSync(new URL("../src/lib/portails-outil/moteur.genere.mjs", import.meta.url), "utf8"),
    readFileSync(new URL("./reference/portails-outil.json", import.meta.url), "utf8"),
    readFileSync(new URL("../src/lib/portails.ts", import.meta.url), "utf8"),
  ].join("\n");
  for (const interdit of ["TARIFS_ACHATS", "heure_atelier", "prixPaye", "fraisFixes", "kit_moteur", "gonds_portail_reglables", "plancher\":", "prixCle", "volute_cat_", "coeur_cat_", "La Mine de Fer", "Ferronnerie en ligne", "Déco Fer Forgé", "SF11051", "02.204", "MTC_PRIX"]) {
    assert.ok(!publics.includes(interdit), `« ${interdit} » ne doit jamais être publié`);
  }
  const chiffre = readFileSync(new URL("../src/lib/portails-outil/chiffrage.chiffre.mjs", import.meta.url), "utf8");
  for (const interdit of ["TARIFS_ACHATS", "heure_atelier", "Locinox", "Nice"]) assert.ok(!chiffre.includes(interdit), `chiffrage chiffré : ${interdit}`);
});

test("commande en ligne (10/10/2026) : l'acompte de 40 % du prix de la fiche, la configuration du panier relue à l'identique, le solde à la réception", async () => {
  assert.equal(ACOMPTE_PORTAIL_PCT, 40);
  assert.equal(acomptePortail(5370), 2148);
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const cfg: ConfigPortail = { ...configDepart(slug), moulure: slug === "portail-battant", moteur: slug === "portail-battant", portillon: slug === "portail-coulissant" };
    const texte = versParamsPanier(slug, cfg);
    assert.ok(!texte.includes("slug="), "le modèle est le slug de la ligne, pas un paramètre");
    assert.deepEqual(lireConfigPanier(slug, texte), lireConfig(versParams(slug, cfg))!.cfg);
    assert.equal(lireConfigPanier(slug, `${texte}&slug=${slug}`), null);
    assert.equal(lireConfigPanier(slug, 42), null);
    assert.equal(lireConfigPanier("portail-ovni", texte), null);
    const rep = prixPortail(slug, cfg);
    assert.ok(rep.ok, `${slug} se chiffre`);
    // La visite de prise de cotes part avec le portail (payée à part, déduite du solde) ; Saumur même : 10 km.
    const localiser = async (): Promise<ResultatLieu> => ({ ok: true, lieu: { distanceKm: 10, commune: "Saumur", precision: "adresse" } });
    const visite = { slug: PRISE_DE_COTES, priseDeCotesCp: "49400", rdv: "2026-10-12|matin" };
    const t = await tarifer([{ slug, portail: texte, quantity: 1 }, visite], { locale: "fr", gc: CALCUL_GC, portail: prixPortail, localiser });
    assert.deepEqual(t.refusees, []);
    assert.equal(t.probleme, null);
    assert.equal(t.pieces[0].line.unitPrice, acomptePortail(rep.prix));
    assert.equal(t.pieces[0].portail!.prixPose, rep.prix);
    assert.equal(t.pieces[0].line.unitPrice + t.pieces[0].portail!.solde, rep.prix);
    const prixVisite = t.visite!.deplacement.montantCents / 100;
    assert.equal(t.total, acomptePortail(rep.prix) + prixVisite);
    assert.equal(t.soldePortail, rep.prix - acomptePortail(rep.prix) - prixVisite);
    assert.equal(getProduct(slug)!.orderMode, "cart");
  }
});

test("coulissant (10/10/2026) : 5 840 mm au plus sur rail, 4 000 mm sans rail — jamais « sur étude » pour une cote que la fiche laisse saisir", () => {
  assert.deepEqual(bornesPortail("portail-coulissant").P, [2000, 5840]);
  assert.deepEqual(bornesPortail("portail-coulissant", "rail").P, [2000, 5840]);
  assert.deepEqual(bornesPortail("portail-coulissant", "auto").P, [2000, 4000]);
  assert.deepEqual(bornesPortail("portail-battant", "auto").P, bornesPortail("portail-battant").P);
  for (const [guidage, P] of [["rail", 5840], ["rail", 5000], ["auto", 4000], ["auto", 2000]] as const) {
    const cfg: ConfigPortail = { ...configDepart("portail-coulissant"), guidage, P };
    const R = planPortail("portail-coulissant", cfg);
    assert.deepEqual(R.alertes, [], `${guidage} ${P} : aucune alerte`);
    assert.ok(prixPortail("portail-coulissant", cfg).ok, `${guidage} ${P} : un prix`);
    assert.ok(lireConfig(versParams("portail-coulissant", cfg)), `${guidage} ${P} : relu`);
  }
  // Au-delà : refusé à la lecture (le serveur répond 400), et le moteur le dit sans « sur étude ».
  const trop: ConfigPortail = { ...configDepart("portail-coulissant"), guidage: "auto", P: 4100 };
  assert.equal(lireConfig(versParams("portail-coulissant", trop)), null);
  assert.equal(lireConfig(versParams("portail-coulissant", { ...configDepart("portail-coulissant"), P: 5950 })), null);
  for (const cfg of [trop, { ...configDepart("portail-coulissant"), P: 5950 }]) assert.ok(planPortail("portail-coulissant", cfg).alertes.length > 0 && planPortail("portail-coulissant", cfg).alertes.every((a) => !/sur étude/.test(a)));
});

test("les mots du client (10/10/2026) : les quatre portails se commandent avec leur visite de prise de cotes, jamais « sur étude »", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const f = getProduct(slug)!;
    assert.match(f.noteDevis!.fr, /visite de prise de cotes/);
    assert.doesNotMatch(f.noteDevis!.fr, /sur étude/);
  }
});

test("la façon de recevoir un portail (10/10/2026) : « pose » par défaut, relue à l'identique, jamais de moteur sans pose ; le colis vient du plan, debout", () => {
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    for (const reception of ["pose", "transporteur", "retrait"] as const) {
      const cfg: ConfigPortail = { ...configDepart(slug), reception };
      assert.deepEqual(lireConfigPanier(slug, versParamsPanier(slug, cfg)), cfg, `${slug} ${reception} : relu à l'identique`);
      assert.deepEqual(lireConfig(versParams(slug, cfg))!.cfg, cfg);
      const R = planPortail(slug, cfg);
      assert.equal(R.alertes.length, 0);
      const colis = R.colis;
      assert.ok(colis.kg > 0 && colis.kg === colis.pieces.reduce((s, p) => s + p.kg, 0), `${slug} : le poids du colis est la somme de ses pièces`);
      assert.ok(colis.kgTaxable >= colis.kg, `${slug} : le poids taxable n'est jamais sous le poids réel`);
      assert.ok(colis.palettes.length >= 1 && colis.palettes.every((pl) => pl.pieces >= 1 && pl.kgTaxable >= pl.kg));
      assert.ok(colis.longueurMaxMm > 0 && colis.hauteurMaxMm > 0 && colis.plusGrandeCoteMm === Math.max(...colis.pieces.map((p) => Math.max(p.longueurMm, p.hauteurMm))));
    }
  }
  // Sans pose : un prix plus bas que posé, et le même tarif que l'outil (185 cas de la référence).
  for (const slug of Object.keys(SLUGS_PORTAIL) as SlugPortail[]) {
    const posee = prixPortail(slug, configDepart(slug)), sans = prixPortail(slug, { ...configDepart(slug), reception: "retrait" });
    assert.ok(posee.ok && sans.ok && sans.prix < posee.prix, `${slug} : sans pose moins cher que posé`);
  }
  // Une adresse ou un panier d'avant (sans « reception ») se lit comme posé ; une valeur inconnue est refusée ; sans pose, pas de moteur.
  const p = versParams("portail-battant", configDepart("portail-battant"));
  p.delete("reception");
  assert.equal(lireConfig(p)!.cfg.reception, "pose");
  p.set("reception", "drone");
  assert.equal(lireConfig(p), null);
  assert.equal(lireConfig(versParams("portail-battant", { ...configDepart("portail-battant"), reception: "retrait", moteur: true })), null);
  assert.equal(prixPortail("portail-battant", { ...configDepart("portail-battant"), reception: "retrait", moteur: true }).ok, false);
  // Le coulissant sur rail : le rail part en tronçons de 3 m ; un autoportant emmène sa queue (5,26 m) : affrètement.
  const rail = planPortail("portail-coulissant", configDepart("portail-coulissant")).colis;
  assert.ok(rail.pieces.filter((x) => /^Rail/.test(x.nom)).every((x) => x.longueurMm <= 3000));
  const auto = planPortail("portail-coulissant", { ...configDepart("portail-coulissant"), guidage: "auto" }).colis;
  assert.ok(auto.longueurMaxMm > 5000);
});

test("tôle découpée (11/10/2026) : un style, neuf dessins, des prix par dessin ; relue avec ses règles, jamais devinée", () => {
  const cfg = configDepart("portail-battant", "tole");
  assert.equal(cfg.remp, "tole");
  assert.equal(cfg.mat, "acier");
  assert.equal(cfg.design, "foret");
  assert.equal(cfg.couleur, "anthracite");
  assert.equal(styleDe(cfg), "tole");
  assert.equal(versEntrees(cfg).ptDesign, "foret");
  assert.equal(versEntrees(configDepart("portail-battant", "plein")).ptDesign, undefined);
  // l'adresse : le dessin voyage, un ancien panier sans dessin reprend le dessin par défaut, un dessin inconnu est refusé
  const p = versParams("portail-battant", { ...cfg, design: "loup" });
  assert.equal(p.get("design"), "loup");
  assert.equal(lireConfig(p)!.cfg.design, "loup");
  p.delete("design");
  assert.equal(lireConfig(p)!.cfg.design, "foret");
  p.set("design", "licorne");
  assert.equal(lireConfig(p), null);
  // l'acier seulement, haut droit, ni bas plein ni décor : sinon refusé
  assert.equal(lireConfig(versParams("portail-battant", { ...cfg, mat: "alu" })), null);
  assert.equal(lireConfig(versParams("portail-battant", { ...cfg, forme: "chapeau" })), null);
  assert.equal(lireConfig(versParams("portail-battant", { ...cfg, soub: "plein" })), null);
  // le prix : posé, sans pose, brut ; chaque dessin se paie à sa découpe
  const pose = prixPortail("portail-battant", cfg), retrait = prixPortail("portail-battant", { ...cfg, reception: "retrait" }), brut = prixPortail("portail-battant", { ...cfg, couleur: "galva" });
  assert.ok(pose.ok && retrait.ok && brut.ok);
  if (pose.ok && retrait.ok && brut.ok) { assert.ok(retrait.prix < pose.prix); assert.ok(brut.prix < pose.prix); }
  const V = prixVariantesPortail("portail-battant", cfg);
  for (const d of ["foret", "vagues", "soleil", "losanges", "feuillage", "lignes", "nid", "loup", "bulles"] as const) assert.ok(typeof V.designs[d] === "number", `prix du dessin ${d}`);
  assert.ok(V.designs.lignes! > V.designs.foret! && V.designs.foret! > V.designs.losanges!, "plus de découpe, plus cher");
  assert.equal(V.designs.foret, V.base.ok ? V.base.prix : null);
  assert.equal(prixVariantesPortail("portail-battant", configDepart("portail-battant", "plein")).designs.foret, null, "hors tôle : aucun prix de dessin calculé");
  // le dessin de l'outil : une montagne, des vides, rien d'incohérent
  const R = planPortail("portail-battant", { ...cfg, design: "loup" });
  assert.equal(R.alertes.length, 0);
  assert.ok(R.vues.face.some((x) => (x as { cls?: string }).cls === "t-vide"), "des découpes dans la tôle");
  // le devis (estimation) : le dessin, la matière et la découpe dits, en français et en anglais, sans promesse
  for (const locale of ["fr", "en"] as const) for (const couleur of ["anthracite", "galva"] as const) {
    const d = composerEstimationPortail({ slug: "portail-battant", cfg: { ...cfg, design: "loup", couleur }, client: { nom: "Essai" }, date: new Date(2026, 9, 11), locale });
    assert.ok(d.ok, `devis ${locale} ${couleur}`);
    if (!d.ok) continue;
    const texte = JSON.stringify(d.devis);
    assert.ok(locale === "fr" ? /Loup/.test(texte) && /prégalvanisé/.test(texte) && /découpée au laser/.test(texte) : /Wolf/.test(texte) && /pre-galvanised/.test(texte) && /laser-cut/.test(texte), `devis ${locale} ${couleur} : dessin et matière`);
    assert.ok(!/garantie de teinte|inoxydable|stainless|rustproof|lifetime/i.test(texte), "aucune promesse");
    if (couleur === "galva") assert.ok(!/thermolaqu|powder|duplex|\bRAL\b/i.test(texte), `devis ${locale} brut : aucune peinture annoncée`);
  }
});
