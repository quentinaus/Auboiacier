import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  acomptePortail, appliquerStyle, bornesPortail, configDepart, decrireDecor, guidePortail, lireConfig, lireConfigPanier, lireDecorChoix, planPortail, styleDe, versParams, versParamsPanier,
  ACOMPTE_PORTAIL_PCT, DECORS_PORTAIL, SLUGS_PORTAIL, STYLES_PORTAIL,
  type ChoixDecor, type ConfigPortail, type SlugPortail,
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
