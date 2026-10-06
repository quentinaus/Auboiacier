import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import type Stripe from "stripe";
import {
  CLE_AVIS,
  JOUR_MS,
  JOURS_APRES_LIVRAISON,
  SEMAINES_PAR_DEFAUT,
  cronAutorise,
  dateEnvoiAvis,
  demanderLesAvis,
  etatAvis,
  lireCommande,
  mailAvis,
  semainesCommande,
  semainesFabrication,
  type CommandeAvis,
  type MailAvis,
} from "../src/lib/avis.ts";
import { ADRESSE_AVIS, ADRESSE_AVIS_LISIBLE, estCheminAvis, redirectionAvis } from "../src/lib/avis-lien.ts";
import { AVIS_GOOGLE_REPLI, lienLaisserAvis } from "../src/lib/seo.ts";
import { products } from "../src/lib/products.ts";
import { codeQR, traceQR } from "../src/lib/qr.ts";
import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };

/**
 * La demande d'avis : une seule par commande, dix jours après la livraison,
 * sans contrepartie ni pression. Ce qui doit rester vrai :
 *  — la date d'envoi suit le délai de fabrication écrit sur les fiches ;
 *  — un client ne reçoit JAMAIS deux fois le mail, même si un envoi échoue ;
 *  — rien ne part sans le lien d'avis, ni sans Resend, ni sans CRON_SECRET ;
 *  — https://auboiacier.fr/avis mène au lien d'avis Google dès qu'il est connu.
 */

const lire = (chemin: string) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");
const fiche = (slug: string) => {
  const p = products.find((produit) => produit.slug === slug);
  assert.ok(p, `fiche ${slug} introuvable`);
  return p;
};

/** 1er décembre 2026, midi (secondes). */
const PAYE_LE = Date.UTC(2026, 11, 1, 12) / 1000;
const LIEN = "https://g.page/r/CExempleAvis/review";

/* ------------------------------------------------------------------ *
 *  Un petit Stripe en mémoire : sessions, et métadonnées des paiements
 * ------------------------------------------------------------------ */

type Faux = {
  sessions: Stripe.Checkout.Session[];
  meta: Map<string, Record<string, string>>;
};

function fauxStripe(): Faux {
  return { sessions: [], meta: new Map() };
}

function ajouter(
  stripe: Faux,
  {
    n,
    email = `client${n}@exemple.fr`,
    payeLe = PAYE_LE,
    metadata = {},
    metaPaiement = {},
    statutPaiement = "succeeded",
    charge = {},
  }: {
    n: number;
    email?: string;
    payeLe?: number;
    metadata?: Record<string, string>;
    metaPaiement?: Record<string, string>;
    statutPaiement?: string;
    charge?: Record<string, unknown>;
  }
) {
  const paiementId = `pi_${n}`;
  stripe.meta.set(paiementId, { order_ref: `AB-TEST${n}`, ...metaPaiement });
  const session = {
    id: `cs_${n}`,
    created: payeLe - 60,
    payment_status: "paid",
    customer_details: { email, name: "Camille Bertrand" },
    metadata: { order_ref: `AB-TEST${n}`, locale: "fr", livraison_mode: "transporteur", fabrication_semaines: "8", ...metadata },
    payment_intent: {
      id: paiementId,
      created: payeLe,
      status: statutPaiement,
      // Lu à chaque passage, comme Stripe le renverrait.
      get metadata() {
        return stripe.meta.get(paiementId);
      },
      latest_charge: { id: `ch_${n}`, created: payeLe, refunded: false, amount_refunded: 0, disputed: false, ...charge },
    },
  };
  stripe.sessions.push(session as unknown as Stripe.Checkout.Session);
  return paiementId;
}

/** Un passage du cron, branché sur le faux Stripe. */
async function passage(
  stripe: Faux,
  options: {
    maintenant: number;
    lien?: string | null;
    emailPret?: boolean;
    envoiReussi?: (n: number) => boolean;
    marquageReussi?: boolean;
    journal?: string[];
    maximum?: number;
  }
) {
  const envoyes: { mail: MailAvis; commande: CommandeAvis }[] = [];
  let tentative = 0;
  const bilan = await demanderLesAvis({
    commandes: stripe.sessions.map(lireCommande),
    maintenant: options.maintenant,
    lien: options.lien === undefined ? LIEN : options.lien,
    emailPret: options.emailPret ?? true,
    maximum: options.maximum,
    envoyer: async (mail, commande) => {
      options.journal?.push(`envoyer ${commande.reference}`);
      tentative++;
      if (options.envoiReussi && !options.envoiReussi(tentative)) return false;
      envoyes.push({ mail, commande });
      return true;
    },
    marquer: async (paiementId, valeur) => {
      options.journal?.push(`marquer ${paiementId} ${valeur ? "oui" : "efface"}`);
      if (options.marquageReussi === false) return false;
      const meta = { ...(stripe.meta.get(paiementId) ?? {}) };
      if (valeur) meta[CLE_AVIS] = valeur;
      else delete meta[CLE_AVIS];
      stripe.meta.set(paiementId, meta);
      return true;
    },
  });
  return { bilan, envoyes };
}

/** Le jour où la commande payée le 1er décembre, 8 semaines, devient due. */
const DUE = PAYE_LE * 1000 + (8 * 7 + JOURS_APRES_LIVRAISON) * JOUR_MS;

/* ------------------------------------------------------------------ *
 *  Le délai de fabrication, lu sur les fiches
 * ------------------------------------------------------------------ */

test("le délai de fabrication vient des fiches : la borne haute, en semaines", () => {
  assert.equal(semainesFabrication(fiche("table-mikado")), 8, "« 6 à 8 semaines »");
  assert.equal(semainesFabrication(fiche("garde-corps")), 6, "« 4 à 6 semaines »");
  assert.equal(semainesFabrication(fiche("chaise-acier-bois")), 4, "« 4 semaines »");
  assert.equal(semainesFabrication(fiche("table-resine-mikado")), null, "« délai confirmé avec le devis »");
  // Toute fiche qui annonce des semaines est lue : aucune ne retombe en silence sur le défaut.
  for (const p of products) {
    const ligne = p.specs.find((s) => s.label === "Fabrication");
    if (ligne && /semaine/.test(ligne.value)) assert.notEqual(semainesFabrication(p), null, p.slug);
  }
});

test("une commande attend sa pièce la plus longue ; à défaut, 8 semaines", () => {
  assert.equal(SEMAINES_PAR_DEFAUT, 8);
  assert.equal(semainesCommande([fiche("chaise-acier-bois"), fiche("table-mikado")]), 8);
  assert.equal(semainesCommande([fiche("chaise-acier-bois"), fiche("garde-corps")]), 6);
  assert.equal(semainesCommande([fiche("table-resine-mikado")]), SEMAINES_PAR_DEFAUT);
  assert.equal(semainesCommande([]), SEMAINES_PAR_DEFAUT);
});

test("/api/commande note le délai de la commande chez Stripe, depuis les fiches", () => {
  const source = lire("src/app/api/commande/route.ts");
  assert.match(source, /fabrication_semaines: String\(semainesCommande\(tarif\.pieces\.map\(\(p\) => p\.line\.product\)\)\)/);
});

/* ------------------------------------------------------------------ *
 *  La date d'envoi
 * ------------------------------------------------------------------ */

test("date d'envoi : paiement + fabrication la plus longue + 10 jours", () => {
  const payeLe = PAYE_LE * 1000;
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 8, statut: "", statutLe: null }), payeLe + 66 * JOUR_MS);
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 4, statut: "recue", statutLe: null }), payeLe + 38 * JOUR_MS);
});

test("date d'envoi : « Livrée » cochée à l'atelier, 10 jours après — même en avance", () => {
  const payeLe = PAYE_LE * 1000;
  const livreeLe = payeLe + 20 * JOUR_MS;
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 8, statut: "livree", statutLe: livreeLe }), livreeLe + 10 * JOUR_MS);
});

test("date d'envoi : une pièce en retard ne reçoit rien avant d'être arrivée", () => {
  const payeLe = PAYE_LE * 1000;
  // Toujours en fabrication : on attend.
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 4, statut: "fabrication", statutLe: payeLe + 40 * JOUR_MS }), null);
  // Expédiée bien après la date prévue : une semaine de route, puis dix jours.
  const expedieeLe = payeLe + 50 * JOUR_MS;
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 4, statut: "expediee", statutLe: expedieeLe }), expedieeLe + 17 * JOUR_MS);
  // Expédiée à l'heure : l'estimation reste la règle.
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 8, statut: "expediee", statutLe: payeLe + 30 * JOUR_MS }), payeLe + 66 * JOUR_MS);
});

test("le retrait à l'atelier compte comme une livraison", () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1, metadata: { livraison_mode: "retrait", retrait: "1", fabrication_semaines: "4" } });
  const commande = lireCommande(stripe.sessions[0]);
  assert.equal(commande.avecPieces, true);
  const due = PAYE_LE * 1000 + (4 * 7 + 10) * JOUR_MS;
  assert.equal(etatAvis(commande, due - 1).raison, "pas_encore");
  assert.equal(etatAvis(commande, due).raison, "a_envoyer");
});

test("rien pour une commande remboursée, annulée, contestée, une prise de cotes seule, ou un client qui a dit non", () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1, charge: { refunded: true, amount_refunded: 184000 } });
  ajouter(stripe, { n: 2, charge: { amount_refunded: 5000 } });
  ajouter(stripe, { n: 3, statutPaiement: "canceled" });
  ajouter(stripe, { n: 4, charge: { disputed: true } });
  ajouter(stripe, { n: 5, metadata: { livraison_mode: "", fabrication_semaines: "", rdv: "2026-12-03-matin" } });
  ajouter(stripe, { n: 6, metaPaiement: { [CLE_AVIS]: "non" } });
  ajouter(stripe, { n: 7, statutPaiement: "processing" });
  const raisons = stripe.sessions.map((s) => etatAvis(lireCommande(s), DUE + JOUR_MS).raison);
  // Un paiement annulé n'est plus un paiement réussi : « pas payée ».
  assert.deepEqual(raisons, ["remboursee", "remboursee", "pas_payee", "remboursee", "sans_piece", "deja_demande", "pas_payee"]);
});

test("la date de paiement est celle du paiement, et un délai illisible retombe sur 8 semaines", () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1, metadata: { fabrication_semaines: "abc" } });
  const commande = lireCommande(stripe.sessions[0]);
  assert.equal(commande.payeLe, PAYE_LE * 1000);
  assert.equal(commande.semaines, SEMAINES_PAR_DEFAUT);
  assert.equal(commande.locale, "fr");
  assert.equal(commande.paiementId, "pi_1");
});

/* ------------------------------------------------------------------ *
 *  Une seule fois
 * ------------------------------------------------------------------ */

test("un seul envoi par commande : le passage du lendemain ne renvoie rien", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const avant = await passage(stripe, { maintenant: DUE - JOUR_MS });
  assert.equal(avant.envoyes.length, 0, "pas avant la date");
  assert.equal(avant.bilan.ignores.pas_encore, 1);

  const jour = await passage(stripe, { maintenant: DUE });
  assert.deepEqual(jour.bilan.envoyes, ["AB-TEST1"]);
  assert.match(stripe.meta.get("pi_1")?.[CLE_AVIS] ?? "", /^\d{4}-\d{2}-\d{2}T/);
  // La trace s'ajoute aux métadonnées, sans rien effacer.
  assert.equal(stripe.meta.get("pi_1")?.order_ref, "AB-TEST1");

  for (const jours of [1, 2, 30]) {
    const ensuite = await passage(stripe, { maintenant: DUE + jours * JOUR_MS });
    assert.equal(ensuite.envoyes.length, 0, `renvoyé ${jours} jour(s) après`);
  }
});

test("la trace est posée AVANT l'envoi ; sans trace possible, rien ne part", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const journal: string[] = [];
  await passage(stripe, { maintenant: DUE, journal });
  assert.deepEqual(journal, ["marquer pi_1 oui", "envoyer AB-TEST1"]);

  const autre = fauxStripe();
  ajouter(autre, { n: 2 });
  const { bilan, envoyes } = await passage(autre, { maintenant: DUE, marquageReussi: false });
  assert.equal(envoyes.length, 0);
  assert.deepEqual(bilan.echecs, ["AB-TEST2"]);
});

test("un envoi raté efface sa trace et repart le lendemain, une seule fois", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const rate = await passage(stripe, { maintenant: DUE, envoiReussi: () => false });
  assert.deepEqual(rate.bilan.echecs, ["AB-TEST1"]);
  assert.equal(stripe.meta.get("pi_1")?.[CLE_AVIS], undefined, "la trace d'un envoi raté doit être effacée");

  const lendemain = await passage(stripe, { maintenant: DUE + JOUR_MS });
  assert.deepEqual(lendemain.bilan.envoyes, ["AB-TEST1"]);
  const surlendemain = await passage(stripe, { maintenant: DUE + 2 * JOUR_MS });
  assert.equal(surlendemain.envoyes.length, 0);
});

test("deux commandes du même client : un seul mail, la promesse du mail est tenue", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1, email: "Camille@Exemple.fr" });
  ajouter(stripe, { n: 2, email: "camille@exemple.fr", payeLe: PAYE_LE + 3 * 86400 });
  const premier = await passage(stripe, { maintenant: DUE + 5 * JOUR_MS });
  assert.deepEqual(premier.bilan.envoyes, ["AB-TEST1"]);
  assert.equal(premier.bilan.ignores.meme_client, 1);
  assert.equal(stripe.meta.get("pi_2")?.[CLE_AVIS], "autre-commande");
  const ensuite = await passage(stripe, { maintenant: DUE + 60 * JOUR_MS });
  assert.equal(ensuite.envoyes.length, 0);
});

test("au plus ENVOIS_PAR_PASSAGE mails par passage, les plus anciens d'abord ; le reste suit", async () => {
  const stripe = fauxStripe();
  for (let n = 1; n <= 5; n++) ajouter(stripe, { n, payeLe: PAYE_LE - n * 86400 });
  const un = await passage(stripe, { maintenant: DUE, maximum: 2 });
  assert.deepEqual(un.bilan.envoyes, ["AB-TEST5", "AB-TEST4"]);
  const deux = await passage(stripe, { maintenant: DUE + JOUR_MS, maximum: 10 });
  assert.deepEqual(deux.bilan.envoyes.sort(), ["AB-TEST1", "AB-TEST2", "AB-TEST3"]);
});

/* ------------------------------------------------------------------ *
 *  Rien ne part sans lien, sans Resend, sans secret
 * ------------------------------------------------------------------ */

test("lien d'avis vide : rien n'est envoyé ni marqué, les commandes attendent", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const journal: string[] = [];
  const { bilan } = await passage(stripe, { maintenant: DUE, lien: null, journal });
  assert.equal(bilan.arret, "lien_vide");
  assert.deepEqual(journal, []);
  // Le lien arrive : la commande part au passage suivant.
  const ensuite = await passage(stripe, { maintenant: DUE + JOUR_MS });
  assert.deepEqual(ensuite.bilan.envoyes, ["AB-TEST1"]);
});

test("Resend non configuré : rien n'est envoyé ni marqué", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const journal: string[] = [];
  const { bilan } = await passage(stripe, { maintenant: DUE, emailPret: false, journal });
  assert.equal(bilan.arret, "email_non_configure");
  assert.deepEqual(journal, []);
});

test("le lien d'avis : vide par défaut, et seulement une adresse https complète", () => {
  const avant = process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS;
  try {
    assert.equal(AVIS_GOOGLE_REPLI, "", "la constante de repli reste vide tant que Quentin n'a pas le lien");
    delete process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS;
    assert.equal(lienLaisserAvis(), null);
    process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS = "   ";
    assert.equal(lienLaisserAvis(), null);
    process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS = " https://g.page/r/CExempleAvis/review ";
    assert.equal(lienLaisserAvis(), "https://g.page/r/CExempleAvis/review");
    for (const mauvais of ["g.page/r/x/review", "http://g.page/r/x/review", "javascript:alert(1)", "https://g.page/r x"]) {
      process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS = mauvais;
      assert.equal(lienLaisserAvis(), null, mauvais);
    }
  } finally {
    if (avant === undefined) delete process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS;
    else process.env.NEXT_PUBLIC_ATELIER_GOOGLE_AVIS = avant;
  }
});

test("CRON_SECRET : sans lui, ou sans le bon en-tête, refus", () => {
  const secret = "s3cret-tire-au-hasard-0123456789";
  for (const vide of [undefined, "", "   "]) {
    assert.equal(cronAutorise(`Bearer ${vide ?? ""}`, vide), false, "secret absent : tout est refusé");
    assert.equal(cronAutorise("Bearer ", vide), false);
  }
  assert.equal(cronAutorise(`Bearer ${secret}`, secret), true);
  for (const entete of [null, undefined, "", secret, `bearer ${secret}`, `Bearer ${secret} `, `Bearer ${secret}x`, "Bearer autre"]) {
    assert.equal(cronAutorise(entete, secret), false, String(entete));
  }
});

test("/api/cron/avis : 401 d'abord, puis le lien et Resend, avant de lire la moindre commande", () => {
  const source = lire("src/app/api/cron/avis/route.ts");
  const corps = source.slice(source.indexOf("export async function GET"));
  const porte = corps.indexOf('cronAutorise(request.headers.get("authorization"), process.env.CRON_SECRET)');
  const refus = corps.indexOf("{ status: 401 }");
  const lien = corps.indexOf("lienLaisserAvis()");
  const resend = corps.indexOf("isEmailConfigured()");
  const stripe = corps.indexOf("checkout.sessions.list");
  assert.ok(porte > 0 && refus > porte, "la porte CRON_SECRET doit ouvrir la fonction");
  assert.ok(lien > refus && resend > refus && stripe > lien && stripe > resend, "ordre des vérifications");
  // Les 120 derniers jours, commandes payées, paiement et dernier débit développés (remboursements).
  assert.match(corps, /FENETRE_JOURS \* JOUR_MS/);
  assert.match(corps, /"data\.payment_intent\.latest_charge"/);
  // Une seule clé écrite : jamais une copie périmée de toutes les métadonnées.
  assert.match(corps, /metadata: \{ \[CLE_AVIS\]: valeur \}/);
});

test("vercel.json : la demande d'avis tourne une fois par jour (plan Hobby)", () => {
  const vercel = JSON.parse(lire("vercel.json"));
  const crons = vercel.crons as { path: string; schedule: string }[];
  assert.equal(crons.length, 1);
  assert.equal(crons[0].path, "/api/cron/avis");
  assert.match(crons[0].schedule, /^\d{1,2} \d{1,2} \* \* \*$/, "une heure fixe, chaque jour");
  assert.deepEqual(vercel.regions, ["cdg1"], "les fonctions restent à Paris (politique de confidentialité)");
});

/* ------------------------------------------------------------------ *
 *  Le mail
 * ------------------------------------------------------------------ */

test("le mail : court, signé Quentin, un seul message, aucune contrepartie, aucune note suggérée", () => {
  for (const locale of ["fr", "en"] as const) {
    const mail = mailAvis({ reference: "AB-K7P2X9", locale });
    const tout = `${mail.subject}\n${mail.text}\n${mail.html}`;
    assert.ok(mail.text.includes(ADRESSE_AVIS), `${locale} : le lien vers /avis`);
    assert.ok(mail.html.includes(`href="${ADRESSE_AVIS}"`), `${locale} : le bouton vers /avis`);
    assert.ok(mail.text.includes("AB-K7P2X9"));
    assert.match(mail.text, /\nQuentin\n/, `${locale} : signé Quentin`);
    assert.ok(mail.text.split(/\s+/).length < 120, `${locale} : court`);
    assert.doesNotMatch(tout, /[ée]toile|\bstars?\b|5\s*\/\s*5|★/i, `${locale} : aucune note suggérée`);
    assert.doesNotMatch(
      tout,
      /remise|réduction|cadeau|offert|code promo|concours|tirage|gagne|discount|gift|coupon|voucher|prize|\bfree\b/i,
      `${locale} : aucune contrepartie`
    );
    assert.doesNotMatch(tout, /n'oubliez pas|rappel|dernière chance|don't forget|reminder|last chance/i, `${locale} : aucune pression`);
  }
  const fr = mailAvis({ reference: "AB-K7P2X9", locale: "fr" });
  assert.ok(fr.text.includes("Un seul message : vous ne recevrez rien d'autre de notre part à ce sujet."));
  assert.match(fr.text, /^Bonjour,/);
  const en = mailAvis({ reference: "AB-K7P2X9", locale: "en" });
  assert.ok(en.text.includes("Just this one message: you will not hear from us about this again."));
  assert.match(en.text, /^Hello,/);
  assert.doesNotMatch(en.text, /Bonjour|commande|atelier à/);
});

test("le mail part dans la langue de la commande", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1, metadata: { locale: "en" } });
  ajouter(stripe, { n: 2 });
  const { envoyes } = await passage(stripe, { maintenant: DUE });
  const parRef = Object.fromEntries(envoyes.map((e) => [e.commande.reference, e.mail.text]));
  assert.match(parRef["AB-TEST1"], /^Hello,/);
  assert.match(parRef["AB-TEST2"], /^Bonjour,/);
});

/* ------------------------------------------------------------------ *
 *  L'adresse courte /avis
 * ------------------------------------------------------------------ */

test("/avis, /fr/avis et /en/avis renvoient au lien d'avis quand il est connu, et à rien d'autre", () => {
  assert.equal(ADRESSE_AVIS, "https://auboiacier.fr/avis");
  assert.equal(ADRESSE_AVIS_LISIBLE, "auboiacier.fr/avis");
  for (const chemin of ["/avis", "/avis/", "/fr/avis", "/en/avis", "/en/avis/"]) {
    assert.equal(estCheminAvis(chemin), true, chemin);
    assert.equal(redirectionAvis(chemin, LIEN), LIEN, chemin);
    assert.equal(redirectionAvis(chemin, null), null, `${chemin} sans lien : la page de remerciement`);
  }
  for (const chemin of ["/", "/fr", "/avis-clients", "/fr/avis/x", "/de/avis", "/fr/artisanat/avis", "/api/avis"]) {
    assert.equal(redirectionAvis(chemin, LIEN), null, chemin);
  }
});

test("le proxy fait la redirection avant de choisir la langue, et laisse passer /avis", () => {
  const proxy = lire("src/proxy.ts");
  const avis = proxy.indexOf("redirectionAvis(pathname, lienLaisserAvis())");
  assert.ok(avis > 0, "redirection /avis absente du proxy");
  assert.ok(avis < proxy.indexOf("const hasLocale"), "la redirection doit précéder le choix de la langue");
  assert.match(proxy, /NextResponse\.redirect\(avis, 307\)/, "temporaire : le lien de Google peut changer");
  // Le filtre du proxy n'exclut pas /avis.
  const filtre = proxy.match(/matcher: \["(.+)"\]/)?.[1] ?? "";
  assert.ok(new RegExp(`^${filtre.replace(/\\\\/g, "\\")}$`).test("/avis"), filtre);
});

test("sans lien : une page de remerciement, non indexée, hors du plan du site", () => {
  const page = lire("src/app/[lang]/avis/page.tsx");
  assert.match(page, /if \(lien\) redirect\(lien\)/);
  assert.match(page, /noIndex: true/);
  assert.match(page, /fiche \? t\.fiche : t\.attente/, "la fiche Google si elle existe, sinon « la page arrive »");
  assert.doesNotMatch(lire("src/app/sitemap.ts"), /\/avis/);
  for (const dict of [fr, en]) {
    for (const cle of ["titre", "intro", "attente", "fiche", "boutonFiche", "question", "retour"] as const) {
      assert.ok(dict.avis[cle].trim().length > 2, `avis.${cle}`);
    }
    assert.doesNotMatch(JSON.stringify(dict.avis), /[ée]toile|\bstars?\b|remise|cadeau|discount|gift/i);
  }
});

test("la politique de confidentialité annonce la demande d'avis, une seule fois, dans les deux langues", () => {
  assert.match(fr.confidentialite.sections[2].body, /Vous demander votre avis, une seule fois/);
  assert.match(fr.confidentialite.sections[2].body, /intérêt légitime à suivre la relation avec nos clients \(article 6\.1\.f\)/);
  assert.match(fr.confidentialite.sections[3].body, /Resend[^]*demande d'avis après la livraison/);
  assert.match(en.confidentialite.sections[2].body, /Asking for your opinion, once only/);
  assert.match(en.confidentialite.sections[2].body, /Article 6\(1\)\(f\)/);
  assert.match(en.confidentialite.sections[3].body, /Resend[^]*review request after delivery/);
});

/* ------------------------------------------------------------------ *
 *  La carte des colis
 * ------------------------------------------------------------------ */

test("la carte à imprimer : rangée dans public/imprimer, à jour, et son QR mène à /avis", async () => {
  const { svgCarte } = await import("../scripts/carte-avis/dessin.mjs");
  const svg = lire("public/imprimer/carte-avis.svg");
  assert.equal(svg, svgCarte(), "carte-avis.svg n'est plus à jour : lancer « npm run carte-avis »");
  assert.match(svg, /width="105mm" height="148mm"/, "format A6");
  assert.ok(svg.includes(ADRESSE_AVIS_LISIBLE), "l'adresse écrite en clair (titre du dessin)");

  // Le QR imprimé est celui de l'adresse, module pour module (qr.test.ts le
  // compare au générateur de macOS) : même nombre de suites foncées.
  const qr = svg.match(/<path id="qr" fill="[^"]+" d="([^"]+)"\/>/)?.[1] ?? "";
  const attendu = traceQR(codeQR(ADRESSE_AVIS, { niveau: "M" }));
  assert.ok(qr.length > 0, "QR absent de la carte");
  assert.equal(qr.split("z").length, attendu.split("z").length);

  // En ligne pour l'atelier, hors des résultats de recherche.
  assert.match(lire("next.config.mjs"), /source: "\/imprimer\/:fichier\*", headers: \[\{ key: "X-Robots-Tag", value: "noindex" \}\]/);

  for (const pdf of ["carte-avis-a6.pdf", "carte-avis-4-par-a4.pdf"]) {
    const chemin = new URL(`../public/imprimer/${pdf}`, import.meta.url);
    assert.ok(existsSync(chemin), `${pdf} absent`);
    assert.equal(readFileSync(chemin).subarray(0, 5).toString(), "%PDF-", pdf);
  }
});
