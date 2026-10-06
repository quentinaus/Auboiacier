/**
 * « Comment nous avez-vous connu ? », la provenance des visites (liens
 * marqués utm_… et annonces Google) et les compteurs du site.
 *
 * Trois promesses, faites dans la politique de confidentialité :
 * - le menu est facultatif, et seules ses réponses passent au serveur ;
 * - la provenance est lue dans l'adresse et gardée EN MÉMOIRE : rien n'est
 *   écrit sur l'appareil (ni cookie, ni stockage) ; d'une annonce Google, on
 *   ne garde que le fait d'en venir, jamais l'identifiant de clic ;
 * - les compteurs ne portent aucune donnée personnelle : un nom de compteur
 *   et au plus deux étiquettes prises dans des listes fermées, envoyés sans
 *   adresse IP ni cookie.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CANAUX,
  SOURCES_CONNU,
  TEXTES_CONNU,
  canalProvenance,
  libelleConnu,
  lignesOrigine,
  lireConnu,
  lireProvenance,
  metadonneesOrigine,
  nettoyerProvenance,
  origineDesMetadonnees,
  valeurPropre,
} from "../src/lib/provenance.ts";
import { provenanceVisite, retenirProvenance } from "../src/lib/provenance-visite.ts";
import {
  COMPTEURS,
  FAMILLES,
  JOURNAL_SEULEMENT,
  USER_AGENT_FAMILLE,
  compter,
  etiquettesOrigine,
  etiquettesPropres,
  familleNavigateur,
  ligneCompteur,
} from "../src/lib/compteurs.ts";
import { products } from "../src/lib/products.ts";
import { SITE_URL } from "../src/lib/seo.ts";
import { MAX_METADONNEE_STRIPE } from "../src/lib/libelle-stripe.ts";

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), "utf8");
/** Le code sans ses commentaires : ceux-ci EXPLIQUENT pourquoi on n'utilise pas le stockage, et le nomment. */
const sansCommentaires = (texte: string) => texte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const adresse = (recherche: string) => lireProvenance(new URLSearchParams(recherche));

/* ------------------------------------------------------------------ *
 *  Le menu
 * ------------------------------------------------------------------ */

test("le menu propose les sept réponses demandées, dans l'ordre, en français et en anglais", () => {
  assert.deepEqual(
    SOURCES_CONNU.map((s) => s.fr),
    ["Google", "Fiche Google / Maps", "Instagram", "Facebook", "Bouche-à-oreille", "Presse", "Autre"]
  );
  for (const source of SOURCES_CONNU) {
    assert.ok(source.en.trim(), `${source.id} : pas de libellé anglais`);
    assert.match(source.id, /^[a-z0-9-]+$/);
    assert.equal(libelleConnu(source.id), source.fr);
    assert.equal(libelleConnu(source.id, "en"), source.en);
  }
  assert.match(TEXTES_CONNU.fr.question, /^Comment nous avez-vous connu\s\?$/);
  assert.equal(TEXTES_CONNU.en.question, "How did you hear about us?");
  // Facultatif, et dit comme tel dans la ligne vide du menu.
  assert.match(TEXTES_CONNU.fr.aucune, /facultatif/);
  assert.match(TEXTES_CONNU.en.aucune, /optional/);
});

test("le serveur n'accepte que les réponses du menu", () => {
  for (const source of SOURCES_CONNU) assert.equal(lireConnu(source.id), source.id);
  for (const intrus of ["", "Google", "jean@exemple.fr", "autre ", null, undefined, 3, {}, ["google"]]) {
    assert.equal(lireConnu(intrus), null, JSON.stringify(intrus));
  }
});

/* ------------------------------------------------------------------ *
 *  Les liens marqués
 * ------------------------------------------------------------------ */

test("un lien marqué donne sa source, son support et sa campagne, nettoyés", () => {
  assert.deepEqual(adresse("?utm_source=Instagram&utm_medium=social&utm_campaign=Garde-corps%20Printemps"), {
    source: "instagram",
    support: "social",
    campagne: "garde-corps-printemps",
  });
  // Accents retirés, ponctuation remplacée, 60 signes au plus.
  assert.equal(valeurPropre("Été — Saumur !"), "ete-saumur");
  assert.ok((valeurPropre("x".repeat(500)) ?? "").length <= 60);
  // Une campagne datée passe.
  assert.equal(valeurPropre("2026-12-07"), "2026-12-07");
  // Sans marqueur : rien.
  assert.equal(adresse(""), null);
  assert.equal(adresse("?produit=table-mikado&config=abc"), null);
  assert.equal(adresse("?utm_source="), null);
});

test("une donnée personnelle collée dans un lien n'est jamais gardée", () => {
  for (const valeur of ["jean.dupont@gmail.com", "jean%40gmail.com", "06 12 34 56 78", "+33612345678", "0612345678"]) {
    assert.equal(valeurPropre(decodeURIComponent(valeur)), undefined, valeur);
  }
  assert.equal(adresse("?utm_source=jean@exemple.fr"), null);
});

test("d'une annonce Google, on garde le fait d'en venir, jamais l'identifiant de clic", () => {
  const gclid = "EAIaIQobChMI8_secret_gclid_value";
  for (const cle of ["gclid", "gbraid", "wbraid"]) {
    const p = adresse(`?${cle}=${gclid}`);
    assert.deepEqual(p, { annonceGoogle: true }, cle);
    assert.equal(canalProvenance(p), "google-ads");
    const traces = JSON.stringify([p, lignesOrigine(null, p), metadonneesOrigine(null, p)]);
    assert.ok(!traces.includes(gclid), `${cle} recopié`);
  }
});

test("le serveur renettoie la provenance envoyée par le navigateur", () => {
  assert.equal(nettoyerProvenance(null), null);
  assert.equal(nettoyerProvenance("instagram"), null);
  assert.equal(nettoyerProvenance([]), null);
  assert.equal(nettoyerProvenance({}), null);
  assert.deepEqual(nettoyerProvenance({ source: " Facebook ", campagne: "Mail jean@x.fr", gclid: "abc", annonceGoogle: "oui" }), {
    source: "facebook",
  });
  assert.deepEqual(nettoyerProvenance({ annonceGoogle: true }), { annonceGoogle: true });
});

test("le canal est toujours une étiquette de la liste fermée", () => {
  const cas: [string, string][] = [
    ["", "aucun"],
    ["?gclid=x", "google-ads"],
    ["?utm_source=google&utm_medium=cpc", "google-ads"],
    ["?utm_source=google&utm_medium=organic", "google"],
    ["?utm_source=ig", "instagram"],
    ["?utm_source=instagram&utm_medium=social", "instagram"],
    ["?utm_source=fb", "facebook"],
    ["?utm_source=newsletter", "e-mail"],
    ["?utm_source=flyer-salon", "qr-code"],
    ["?utm_source=ouest-france&utm_medium=presse", "autre-lien"],
    ["?utm_source=jean-dupont", "autre-lien"],
  ];
  for (const [recherche, attendu] of cas) {
    const canal = canalProvenance(adresse(recherche));
    assert.equal(canal, attendu, recherche);
    assert.ok((CANAUX as readonly string[]).includes(canal));
  }
});

test("la provenance est gardée en mémoire pendant la visite, sans rien écrire sur l'appareil", () => {
  retenirProvenance("?utm_source=instagram&utm_campaign=octobre");
  assert.deepEqual(provenanceVisite(), { source: "instagram", campagne: "octobre" });
  // Une page suivante sans marqueur ne l'efface pas.
  retenirProvenance("");
  assert.deepEqual(provenanceVisite(), { source: "instagram", campagne: "octobre" });
  // Ni cookie, ni localStorage, ni sessionStorage, ni IndexedDB : le code ne les touche pas.
  for (const fichier of ["../src/lib/provenance.ts", "../src/lib/provenance-visite.ts", "../src/components/retenir-provenance.tsx", "../src/components/choix-connu.tsx"]) {
    assert.doesNotMatch(sansCommentaires(lire(fichier)), /localStorage|sessionStorage|indexedDB|document\.cookie|cookies\(/, fichier);
  }
  // Et le layout la lit à chaque arrivée sur le site.
  assert.match(lire("../src/app/[lang]/layout.tsx"), /<RetenirProvenance \/>/);
});

/* ------------------------------------------------------------------ *
 *  Les formulaires et la commande
 * ------------------------------------------------------------------ */

test("le menu et la provenance partent avec le devis, le rendez-vous, « me prévenir » et la commande", () => {
  const devis = lire("../src/components/devis-form.tsx");
  assert.match(devis, /<ChoixConnu[\s\S]*?name="connu"/);
  assert.match(devis, /provenanceVisite\(\)/);
  assert.match(devis, /donnees\.append\("formulaire", formulaire\)/);
  assert.match(lire("../src/app/[lang]/rendez-vous/page.tsx"), /formulaire="rendez-vous"/);
  for (const fichier of ["../src/components/inscription-ouverture.tsx", "../src/components/cart-view.tsx"]) {
    const code = lire(fichier);
    assert.match(code, /<ChoixConnu/, fichier);
    assert.match(code, /connu,\s*\n[\s\S]{0,200}provenance: provenanceVisite\(\)/, fichier);
  }
  // Le serveur relit les deux avec les fonctions de src/lib/provenance.ts, jamais telles quelles.
  for (const route of ["../src/app/api/devis/route.ts", "../src/app/api/prevenir/route.ts", "../src/app/api/commande/route.ts"]) {
    const code = lire(route);
    assert.match(code, /lireConnu\(/, route);
    assert.match(code, /nettoyerProvenance\(/, route);
  }
  // Dans l'e-mail de l'atelier, et dans les métadonnées de la commande Stripe.
  assert.match(lire("../src/app/api/devis/route.ts"), /\.\.\.lignesOrigine\(connu, provenance\)/);
  assert.match(lire("../src/app/api/prevenir/route.ts"), /\.\.\.lignesOrigine\(connu, provenance\)/);
  assert.match(lire("../src/app/api/commande/route.ts"), /\.\.\.metadonneesOrigine\(connu, provenance\)/);
  assert.match(lire("../src/lib/order-email.ts"), /lignesOrigine\(connu, provenance\)/);
});

test("les métadonnées Stripe de l'origine tiennent dans les limites de Stripe et se relisent", () => {
  const provenance = adresse(`?utm_source=${"a".repeat(80)}&utm_medium=social&utm_campaign=printemps&gclid=x`);
  const meta = metadonneesOrigine("instagram", provenance);
  for (const [cle, valeur] of Object.entries(meta)) {
    assert.ok(cle.length <= 40, cle);
    assert.ok(valeur.length <= MAX_METADONNEE_STRIPE, cle);
  }
  assert.deepEqual(origineDesMetadonnees(meta), { connu: "instagram", provenance });
  // Une commande sans origine : aucune clé ajoutée, et la relecture dit « rien ».
  assert.deepEqual(metadonneesOrigine(null, null), {});
  assert.deepEqual(origineDesMetadonnees({ order_ref: "A-1" }), { connu: null, provenance: null });
  // Et le bon de commande dit en clair comment le client nous a connus.
  assert.deepEqual(lignesOrigine("bouche-a-oreille", null), ["Nous a connus par : Bouche-à-oreille"]);
  assert.deepEqual(lignesOrigine(null, null), []);
});

/* ------------------------------------------------------------------ *
 *  Les compteurs
 * ------------------------------------------------------------------ */

test("les compteurs connaissent toutes les familles du catalogue", () => {
  for (const p of products) assert.ok((FAMILLES as readonly string[]).includes(p.famille), `${p.slug} : famille ${p.famille} inconnue des compteurs`);
});

test("un compteur ne porte que ses étiquettes, chacune prise dans sa liste", () => {
  for (const [nom, etiquettes] of Object.entries(COMPTEURS)) {
    // Deux étiquettes au plus : la limite des événements de Vercel en Pro.
    assert.ok(etiquettes.length <= 2, nom);
  }
  assert.deepEqual(etiquettesPropres("devis_pdf", { famille: "plafond", connu: "google" }), { famille: "plafond" });
  assert.deepEqual(etiquettesPropres("demande_devis", { connu: "jean@exemple.fr", canal: "Jean Dupont" }), { connu: "autre", canal: "autre" });
  assert.deepEqual(etiquettesOrigine(null, null), { connu: "sans-reponse", canal: "aucun" });
  assert.deepEqual(etiquettesOrigine("presse", adresse("?gclid=abc")), { connu: "presse", canal: "google-ads" });
});

test("la ligne du journal tient sur une ligne et ne dit rien de personne", () => {
  const ligne = ligneCompteur("inscription_prevenir", { connu: "jean.dupont@gmail.com", canal: "instagram", email: "jean.dupont@gmail.com" } as never);
  assert.equal(ligne, 'COMPTEUR {"compteur":"inscription_prevenir","connu":"autre","canal":"instagram"}');
  assert.ok(!ligne.includes("\n"));
});

test("le navigateur réduit à sa famille : Chrome, Safari, Firefox, Edge ou autre ; un robot, rien", () => {
  const cas: [string, string | null][] = [
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", "chrome"],
    ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", "chrome"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1", "chrome"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", "safari"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0", "firefox"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0", "edge"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.0", "autre"],
    // Un téléphone de la marque Cubot n'est pas un robot.
    ["Mozilla/5.0 (Linux; Android 11; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", "chrome"],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", null],
    ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36", null],
    ["Stripe/1.0 (+https://stripe.com/docs/webhooks)", null],
    ["node", null],
    ["", null],
  ];
  for (const [ua, attendu] of cas) assert.equal(familleNavigateur(ua), attendu, ua);
  // Chaque user-agent générique est relu comme sa propre famille, ne passe pas pour un robot, et ne dit rien d'autre.
  for (const [famille, ua] of Object.entries(USER_AGENT_FAMILLE)) {
    assert.equal(familleNavigateur(ua), famille, ua);
    assert.doesNotMatch(ua, /Windows|Mac OS|iPhone|Android|Linux|Mobile|\b[1-9]\d*\.\d+\.\d+\.[1-9]/, ua);
  }
  assert.deepEqual([...JOURNAL_SEULEMENT], ["commande_payee"]);
});

test("compter() : une ligne au journal, et en production un événement sans adresse IP, ni cookie, ni adresse de page, ni navigateur précis", async () => {
  const journal: string[] = [];
  const envois: { url: string; init: RequestInit }[] = [];
  const log = console.log;
  const fetchOriginal = globalThis.fetch;
  const envOriginal = process.env.VERCEL_ENV;
  console.log = (...args: unknown[]) => void journal.push(args.join(" "));
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    envois.push({ url: String(url), init });
    return new Response("ok");
  }) as typeof fetch;
  try {
    const iphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    const requete = new Request("https://auboiacier.fr/api/devis-pdf?slug=table-mikado&nom=Jean%20Dupont&email=jean%40exemple.fr", {
      headers: { "user-agent": iphone, cookie: "auboiacier_compte=secret", "x-forwarded-for": "203.0.113.7" },
    });
    // Hors production (essais, prévisualisations) : le journal seulement.
    delete process.env.VERCEL_ENV;
    await compter("devis_pdf", { famille: "table-interieur" }, requete);
    assert.deepEqual(journal, ['COMPTEUR {"compteur":"devis_pdf","famille":"table-interieur"}']);
    assert.equal(envois.length, 0);

    // En production : l'événement part au domaine du site.
    process.env.VERCEL_ENV = "production";
    await compter("devis_pdf", { famille: "table-interieur" }, requete);
    assert.equal(envois.length, 1);
    const { url, init } = envois[0];
    assert.equal(url, `${SITE_URL}/_vercel/insights/event`);
    const entetes = new Headers(init.headers);
    assert.equal(entetes.get("cookie"), null);
    assert.equal(entetes.get("x-vercel-ip"), null);
    assert.equal(entetes.get("x-forwarded-for"), null);
    // Le navigateur : sa seule famille, sous un user-agent générique (ni iPhone, ni iOS 18, ni version).
    assert.equal(entetes.get("user-agent"), USER_AGENT_FAMILLE.safari);
    const corps = JSON.parse(String(init.body));
    assert.equal(corps.en, "devis_pdf");
    assert.deepEqual(corps.ed, { famille: "table-interieur" });
    assert.equal(corps.o, `${SITE_URL}/`);
    const tout = JSON.stringify(init);
    for (const secret of ["Jean", "jean", "exemple", "203.0.113.7", "secret", "iPhone", "18_0", "18.0"]) assert.ok(!tout.includes(secret), `« ${secret} » envoyé à Vercel`);

    // Une commande payée (webhook de Stripe) : la ligne du journal, rien chez Vercel.
    journal.length = 0;
    const stripe = new Request("https://auboiacier.fr/api/stripe/webhook", { method: "POST", headers: { "user-agent": "Stripe/1.0 (+https://stripe.com/docs/webhooks)" } });
    await compter("commande_payee", { connu: "google", canal: "aucun" }, stripe);
    assert.deepEqual(journal, ['COMPTEUR {"compteur":"commande_payee","connu":"google","canal":"aucun"}']);
    assert.equal(envois.length, 1, "commande_payee envoyée à Vercel");
    // Même avec un vrai navigateur : jamais chez Vercel.
    await compter("commande_payee", {}, requete);
    assert.equal(envois.length, 1);

    // Un robot, ou une requête sans navigateur : le journal seulement.
    for (const robot of ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "curl/8.4.0", ""]) {
      await compter("devis_pdf", { famille: "plafond" }, new Request("https://auboiacier.fr/api/devis-pdf", { headers: robot ? { "user-agent": robot } : {} }));
    }
    assert.equal(envois.length, 1, "un robot envoyé à Vercel");

    // Un envoi qui échoue ne casse rien.
    globalThis.fetch = (async () => {
      throw new Error("réseau coupé");
    }) as typeof fetch;
    const erreur = console.error;
    console.error = () => {};
    try {
      await compter("prix_calcule", { famille: "garde-corps", resultat: "prix" }, requete);
    } finally {
      console.error = erreur;
    }
  } finally {
    console.log = log;
    globalThis.fetch = fetchOriginal;
    if (envOriginal === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = envOriginal;
  }
});

test("chaque compteur est appelé à sa place, après la réponse", () => {
  const appels: [string, RegExp][] = [
    ["../src/app/api/prix-garde-corps/route.ts", /after\(\(\) => compter\("prix_calcule", \{ famille: "garde-corps"/],
    ["../src/app/api/devis-pdf/route.ts", /after\(\(\) => compter\("devis_pdf", \{ famille: product\.famille \}/],
    ["../src/app/api/devis/route.ts", /after\(\(\) => compter\(rendezVous \? "demande_rendez_vous" : "demande_devis", etiquettesOrigine\(connu, provenance\)/],
    ["../src/app/api/prevenir/route.ts", /after\(\(\) => compter\("inscription_prevenir", etiquettesOrigine\(connu, provenance\)/],
    ["../src/app/api/commande/route.ts", /after\(\(\) => compter\("depart_paiement", etiquettesOrigine\(connu, provenance\)/],
    ["../src/app/api/stripe/webhook/route.ts", /if \(!atelierDejaPrevenu && atelierEnvoye\) \{[\s\S]{0,200}after\(\(\) => compter\("commande_payee"/],
  ];
  for (const [fichier, motif] of appels) assert.match(lire(fichier), motif, fichier);
  // Le devis PDF : l'adresse de la requête (nom, e-mail) ne part jamais avec le compteur.
  assert.doesNotMatch(sansCommentaires(lire("../src/lib/compteurs.ts")), /request\.url|from "@vercel\/analytics/);
});

test("MISE-EN-LIGNE.md explique à Quentin où lire chaque compteur", () => {
  const guide = lire("../MISE-EN-LIGNE.md");
  assert.match(guide, /## Lire les compteurs/);
  for (const nom of Object.keys(COMPTEURS)) assert.ok(guide.includes(`\`${nom}\``), `${nom} absent du guide`);
  assert.match(guide, /COMPTEUR/);
  assert.match(guide, /Analytics/);
});
