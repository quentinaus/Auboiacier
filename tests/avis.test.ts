import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import type Stripe from "stripe";
import {
  CLE_AVIS,
  FENETRE_JOURS,
  JOUR_MS,
  JOURS_APRES_LIVRAISON,
  SEMAINES_PAR_DEFAUT,
  cleEnvoiAvis,
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
import { ADRESSE_RESEND, posterResend, type ResultatEnvoi } from "../src/lib/envoi-resend.ts";
import { AVIS_GOOGLE_REPLI, lienLaisserAvis } from "../src/lib/seo.ts";
import { products } from "../src/lib/products.ts";
import { codeQR, traceQR } from "../src/lib/qr.ts";
import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };

/**
 * La demande d'avis : une seule par commande, dix jours après la livraison,
 * sans contrepartie ni pression. Ce qui doit rester vrai :
 *  — la date d'envoi suit le délai de fabrication écrit sur les fiches ;
 *  — un client ne reçoit JAMAIS deux fois le mail : ni si un envoi échoue ou
 *    reste sans réponse, ni si le cron tourne deux fois en même temps, ni
 *    s'il recommande des mois plus tard ;
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
 *  Un petit Stripe en mémoire : sessions, paiements et fiches client
 * ------------------------------------------------------------------ */

type Faux = {
  sessions: Stripe.Checkout.Session[];
  /** Les métadonnées des PaymentIntents. */
  meta: Map<string, Record<string, string>>;
  /** Les fiches client : une par commande, comme avec customer_creation « always ». */
  clients: Map<string, { email: string; metadata: Record<string, string> }>;
};

function fauxStripe(): Faux {
  return { sessions: [], meta: new Map(), clients: new Map() };
}

function ajouter(
  stripe: Faux,
  {
    n,
    email = `client${n}@exemple.fr`,
    client = `cus_${n}`,
    metaClient = {},
    payeLe = PAYE_LE,
    metadata = {},
    metaPaiement = {},
    statutPaiement = "succeeded",
    charge = {},
  }: {
    n: number;
    email?: string;
    client?: string;
    metaClient?: Record<string, string>;
    payeLe?: number;
    metadata?: Record<string, string>;
    metaPaiement?: Record<string, string>;
    statutPaiement?: string;
    charge?: Record<string, unknown>;
  }
) {
  const paiementId = `pi_${n}`;
  stripe.meta.set(paiementId, { order_ref: `AB-TEST${n}`, ...metaPaiement });
  if (!stripe.clients.has(client)) stripe.clients.set(client, { email, metadata: { ...metaClient } });
  const session = {
    id: `cs_${n}`,
    created: payeLe - 60,
    payment_status: "paid",
    customer_details: { email, name: "Camille Bertrand" },
    // Développée (expand: data.customer), lue à chaque passage.
    customer: {
      id: client,
      get metadata() {
        return stripe.clients.get(client)?.metadata;
      },
    },
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

/** Laisse la main : deux passages lancés ensemble s'entremêlent, comme deux appels réseau. */
const tour = () => new Promise<void>((fin) => setImmediate(fin));

/** Un passage du cron, branché sur le faux Stripe, comme /api/cron/avis. */
async function passage(
  stripe: Faux,
  options: {
    maintenant: number;
    lien?: string | null;
    emailPret?: boolean;
    /** Faux : Resend refuse franchement (rien n'est parti). */
    envoiReussi?: (n: number) => boolean;
    /** La réponse de Resend à la n-ième tentative ; « exception » : envoyer lève. */
    resultat?: (n: number) => ResultatEnvoi | "exception";
    /** Remplace l'envoi (deux passages en même temps, avec un faux Resend). */
    envoyer?: (mail: MailAvis, commande: CommandeAvis, cleUnique: string) => Promise<ResultatEnvoi>;
    marquageReussi?: boolean;
    effacementReussi?: boolean;
    relectureReussie?: boolean;
    fichesLisibles?: boolean;
    journal?: string[];
    maximum?: number;
    /** Ce qui se passe chez Stripe entre la lecture des commandes et la suite. */
    apresLecture?: () => void;
  }
) {
  const envoyes: { mail: MailAvis; commande: CommandeAvis; cle: string }[] = [];
  let tentative = 0;
  // Comme la route : les sessions des 120 derniers jours seulement.
  const depuis = (options.maintenant - FENETRE_JOURS * JOUR_MS) / 1000;
  const commandes = stripe.sessions.filter((s) => s.created >= depuis).map(lireCommande);
  options.apresLecture?.();
  const bilan = await demanderLesAvis({
    commandes,
    maintenant: options.maintenant,
    lien: options.lien === undefined ? LIEN : options.lien,
    emailPret: options.emailPret ?? true,
    maximum: options.maximum,
    envoyer: async (mail, commande, cle) => {
      options.journal?.push(`envoyer ${commande.reference}`);
      if (options.envoyer) return options.envoyer(mail, commande, cle);
      tentative++;
      if (options.envoiReussi && !options.envoiReussi(tentative)) return "refuse";
      const resultat = options.resultat?.(tentative) ?? "envoye";
      if (resultat === "exception") throw new Error("coupure");
      if (resultat !== "refuse") envoyes.push({ mail, commande, cle });
      return resultat;
    },
    marquer: async (paiementId, valeur) => {
      options.journal?.push(`marquer ${paiementId} ${valeur ? valeur.replace(/^\d{4}-.*$/, "oui") : "efface"}`);
      await tour();
      if (options.marquageReussi === false) return false;
      if (!valeur && options.effacementReussi === false) return false;
      const meta = { ...(stripe.meta.get(paiementId) ?? {}) };
      if (valeur) meta[CLE_AVIS] = valeur;
      else delete meta[CLE_AVIS];
      stripe.meta.set(paiementId, meta);
      return true;
    },
    relire: async (paiementId) => {
      options.journal?.push(`relire ${paiementId}`);
      await tour();
      if (options.relectureReussie === false) return null;
      return stripe.meta.get(paiementId)?.[CLE_AVIS] ?? "";
    },
    clientDejaSollicite: async (commande) => {
      options.journal?.push(`fiches ${commande.reference}`);
      await tour();
      if (options.fichesLisibles === false) return null;
      // Comme customers.list({ email }) : le filtre de Stripe tient compte des majuscules.
      const adresses = new Set([commande.email, commande.email.toLowerCase()]);
      for (const [id, fiche] of stripe.clients) {
        if ((adresses.has(fiche.email) || id === commande.clientId) && fiche.metadata[CLE_AVIS]) return true;
      }
      return false;
    },
    marquerClient: async (clientId, valeur) => {
      options.journal?.push(`fiche ${clientId}`);
      await tour();
      const fiche = stripe.clients.get(clientId);
      if (!fiche) return false;
      fiche.metadata = { ...fiche.metadata, [CLE_AVIS]: valeur };
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

test("pose ou retrait : « Prête à poser » ou « Prête à retirer » attend la case « Posée » ou « Retirée »", () => {
  const payeLe = PAYE_LE * 1000;
  // L'exemple des relecteurs : 8 semaines, prête au jour 42, posée au jour 75.
  const preteLe = payeLe + 42 * JOUR_MS;
  const poseeLe = payeLe + 75 * JOUR_MS;
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 8, statut: "expediee", statutLe: preteLe, poseOuRetrait: true }), null);
  assert.equal(
    dateEnvoiAvis({ payeLe, semaines: 8, statut: "livree", statutLe: poseeLe, poseOuRetrait: true }),
    poseeLe + 10 * JOUR_MS,
    "dix jours après la pose réelle"
  );
  // Par transporteur, « Expédiée » garde sa semaine de route.
  assert.equal(dateEnvoiAvis({ payeLe, semaines: 8, statut: "expediee", statutLe: preteLe }), payeLe + 66 * JOUR_MS);

  const modes: Record<string, string>[] = [
    { livraison_mode: "pose", pose_cp: "49400", pose_commune: "Saumur" },
    { livraison_mode: "retrait", retrait: "1" },
  ];
  for (const metadata of modes) {
    const stripe = fauxStripe();
    ajouter(stripe, { n: 1, metadata, metaPaiement: { statut: "expediee", statut_le: new Date(preteLe).toISOString() } });
    const commande = lireCommande(stripe.sessions[0]);
    assert.equal(commande.poseOuRetrait, true);
    // Au jour 66, et même trois mois plus tard : rien tant que la case n'est pas cochée.
    for (const jour of [66, 90, 119]) {
      assert.equal(etatAvis(commande, payeLe + jour * JOUR_MS).raison, "attente_pose_ou_retrait", `${metadata.livraison_mode}, jour ${jour}`);
    }
    stripe.meta.set("pi_1", { ...stripe.meta.get("pi_1"), statut: "livree", statut_le: new Date(poseeLe).toISOString() });
    const posee = lireCommande(stripe.sessions[0]);
    assert.equal(etatAvis(posee, poseeLe + 10 * JOUR_MS - 1).raison, "pas_encore");
    assert.equal(etatAvis(posee, poseeLe + 10 * JOUR_MS).raison, "a_envoyer");
  }
  const transporteur = fauxStripe();
  ajouter(transporteur, { n: 1 });
  assert.equal(lireCommande(transporteur.sessions[0]).poseOuRetrait, false);
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

test("rien pour une commande remboursée en totalité, annulée, une prise de cotes seule, ou un client qui a dit non", () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1, charge: { refunded: true, amount_refunded: 184000 } });
  ajouter(stripe, { n: 3, statutPaiement: "canceled" });
  ajouter(stripe, { n: 5, metadata: { livraison_mode: "", fabrication_semaines: "", rdv: "2026-12-03-matin" } });
  ajouter(stripe, { n: 6, metaPaiement: { [CLE_AVIS]: "non" } });
  ajouter(stripe, { n: 7, statutPaiement: "processing" });
  const raisons = stripe.sessions.map((s) => etatAvis(lireCommande(s), DUE + JOUR_MS).raison);
  // Un paiement annulé n'est plus un paiement réussi : « pas payée ».
  assert.deepEqual(raisons, ["remboursee", "pas_payee", "sans_piece", "deja_demande", "pas_payee"]);
});

test("remboursée en partie ou contestée : la demande part comme pour tout le monde (Google interdit de ne solliciter que les contents)", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 2, charge: { amount_refunded: 5000 } });
  ajouter(stripe, { n: 4, charge: { disputed: true } });
  assert.deepEqual(
    stripe.sessions.map((s) => etatAvis(lireCommande(s), DUE).raison),
    ["a_envoyer", "a_envoyer"]
  );
  const { bilan } = await passage(stripe, { maintenant: DUE });
  assert.deepEqual(bilan.envoyes.sort(), ["AB-TEST2", "AB-TEST4"]);
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

test("la trace est relue, puis posée AVANT l'envoi, puis recopiée sur la fiche ; sans trace possible, rien ne part", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const journal: string[] = [];
  const premier = await passage(stripe, { maintenant: DUE, journal });
  assert.deepEqual(journal, ["relire pi_1", "fiches AB-TEST1", "marquer pi_1 oui", "envoyer AB-TEST1", "fiche cus_1"]);
  assert.equal(premier.envoyes[0].cle, cleEnvoiAvis("pi_1"), "la clé Idempotency-Key de la commande");
  assert.equal(cleEnvoiAvis("pi_1"), "avis/pi_1");
  assert.match(stripe.clients.get("cus_1")?.metadata[CLE_AVIS] ?? "", /^\d{4}-\d{2}-\d{2}T/, "la trace durable, sur la fiche client");

  const autre = fauxStripe();
  ajouter(autre, { n: 2 });
  const { bilan, envoyes } = await passage(autre, { maintenant: DUE, marquageReussi: false });
  assert.equal(envoyes.length, 0);
  assert.deepEqual(bilan.echecs, ["AB-TEST2"]);
});

test("un refus franc de Resend efface sa trace et repart le lendemain, une seule fois", async () => {
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
 *  Mieux vaut aucun mail que deux
 * ------------------------------------------------------------------ */

test("Resend sans réponse claire : la trace reste, sur la commande et la fiche, et le mail ne repart jamais", async () => {
  for (const reponse of ["incertain", "exception"] as const) {
    const stripe = fauxStripe();
    ajouter(stripe, { n: 1 });
    const journal: string[] = [];
    const { bilan } = await passage(stripe, { maintenant: DUE, resultat: () => reponse, journal });
    assert.deepEqual(bilan.incertains, ["AB-TEST1"], reponse);
    assert.deepEqual(bilan.envoyes, []);
    assert.deepEqual(bilan.echecs, [], `${reponse} : pas « à refaire »`);
    assert.ok(!journal.includes("marquer pi_1 efface"), `${reponse} : la trace ne doit pas être effacée`);
    assert.match(stripe.meta.get("pi_1")?.[CLE_AVIS] ?? "", /^\d{4}-/);
    assert.match(stripe.clients.get("cus_1")?.metadata[CLE_AVIS] ?? "", /^\d{4}-/);
    // Le lendemain, et après les 24 heures de la clé Resend : rien ne repart.
    for (const jours of [1, 2, 30]) {
      const ensuite = await passage(stripe, { maintenant: DUE + jours * JOUR_MS });
      assert.equal(ensuite.envoyes.length, 0, `${reponse}, ${jours} jour(s) après`);
    }
  }
});

test("refus franc mais trace impossible à effacer : la commande est « bloquée », pas « à refaire »", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const { bilan } = await passage(stripe, { maintenant: DUE, envoiReussi: () => false, effacementReussi: false });
  assert.deepEqual(bilan.echecs, []);
  assert.deepEqual(bilan.bloques, ["AB-TEST1 (pi_1)"]);
  assert.equal(stripe.clients.get("cus_1")?.metadata[CLE_AVIS], undefined, "rien n'est parti : la fiche reste vierge");
});

test("la trace est relue juste avant l'envoi : posée entre-temps par un autre passage, la commande est sautée", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  ajouter(stripe, { n: 2, email: "client1@exemple.fr", client: "cus_2", payeLe: PAYE_LE + 86400 });
  // L'autre passage a écrit sa trace après notre lecture des commandes, et n'a pas encore écrit la fiche.
  const { bilan, envoyes } = await passage(stripe, {
    maintenant: DUE + 2 * JOUR_MS,
    apresLecture: () => stripe.meta.set("pi_1", { ...stripe.meta.get("pi_1"), [CLE_AVIS]: "2027-02-05T09:00:00.000Z" }),
  });
  assert.equal(envoyes.length, 0);
  assert.equal(bilan.ignores.deja_demande, 1);
  // Sa seconde commande ne part pas d'ici non plus : l'autre passage sert ce client.
  assert.equal(bilan.ignores.meme_client, 1);
  assert.equal(stripe.meta.get("pi_2")?.[CLE_AVIS], "autre-commande");
});

test("trace ou fiches illisibles juste avant l'envoi : rien n'est marqué ni envoyé, la commande attend le lendemain", async () => {
  for (const panne of [{ relectureReussie: false }, { fichesLisibles: false }]) {
    const stripe = fauxStripe();
    ajouter(stripe, { n: 1 });
    const journal: string[] = [];
    const { bilan, envoyes } = await passage(stripe, { maintenant: DUE, journal, ...panne });
    assert.equal(envoyes.length, 0, JSON.stringify(panne));
    assert.deepEqual(bilan.echecs, ["AB-TEST1"]);
    assert.ok(!journal.some((ligne) => ligne.startsWith("marquer")), "aucune trace posée");
    const lendemain = await passage(stripe, { maintenant: DUE + JOUR_MS });
    assert.deepEqual(lendemain.bilan.envoyes, ["AB-TEST1"]);
  }
});

/**
 * Un faux Resend qui applique l'Idempotency-Key comme le vrai : la même clé
 * en cours d'envoi donne 409, la même clé déjà envoyée rejoue la réponse
 * sans renvoyer le message. `sansCle` : un Resend qui l'ignorerait.
 */
function fauxResend({ sansCle = false } = {}) {
  const remis: string[] = [];
  const cles = new Map<string, { corps: string; fini: boolean }>();
  const appel = (async (_adresse: string | URL | Request, init?: RequestInit) => {
    const cle = sansCle ? undefined : (init?.headers as Record<string, string>)["Idempotency-Key"];
    const corps = String(init?.body);
    if (cle) {
      const deja = cles.get(cle);
      if (deja && !deja.fini) return new Response('{"name":"concurrent_idempotent_requests"}', { status: 409 });
      if (deja && deja.corps === corps) return new Response('{"id":"re_1"}', { status: 200 });
      if (deja) return new Response('{"name":"invalid_idempotent_request"}', { status: 409 });
      cles.set(cle, { corps, fini: false });
    }
    await tour();
    await tour();
    remis.push(JSON.parse(corps).to[0]);
    if (cle) cles.get(cle)!.fini = true;
    return new Response('{"id":"re_1"}', { status: 200 });
  }) as typeof fetch;
  const envoyer = (mail: MailAvis, commande: CommandeAvis, cleUnique: string) =>
    posterResend({
      apiKey: "re_test",
      payload: { from: "atelier@auboiacier.fr", to: [commande.email], subject: mail.subject, text: mail.text, html: mail.html },
      cleUnique,
      fetch: appel,
      pauseMs: 0,
    });
  return { remis, cles, envoyer };
}

test("Vercel lance le cron deux fois en même temps : un seul mail, et rien le lendemain", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  ajouter(stripe, { n: 2, email: "client1@exemple.fr", client: "cus_2", payeLe: PAYE_LE + 86400 });
  const resend = fauxResend();
  const [a, b] = await Promise.all([
    passage(stripe, { maintenant: DUE + 2 * JOUR_MS, envoyer: resend.envoyer }),
    passage(stripe, { maintenant: DUE + 2 * JOUR_MS, envoyer: resend.envoyer }),
  ]);
  assert.deepEqual(resend.remis, ["client1@exemple.fr"], "un seul mail remis, pour deux commandes et deux passages");
  assert.deepEqual([...a.bilan.envoyes, ...b.bilan.envoyes], ["AB-TEST1"]);
  assert.match(stripe.meta.get("pi_1")?.[CLE_AVIS] ?? "", /^\d{4}-/, "la trace reste posée");
  assert.equal(stripe.meta.get("pi_2")?.[CLE_AVIS], "autre-commande");

  // Les 24 heures de la clé sont passées : la trace suffit.
  resend.cles.clear();
  await passage(stripe, { maintenant: DUE + 3 * JOUR_MS, envoyer: resend.envoyer });
  assert.equal(resend.remis.length, 1);
});

test("le test des deux passages simultanés mord : sans l'Idempotency-Key, deux mails seraient partis", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  const resend = fauxResend({ sansCle: true });
  await Promise.all([
    passage(stripe, { maintenant: DUE, envoyer: resend.envoyer }),
    passage(stripe, { maintenant: DUE, envoyer: resend.envoyer }),
  ]);
  assert.equal(resend.remis.length, 2, "les deux passages s'entremêlent bien jusqu'à l'envoi");
});

/* ------------------------------------------------------------------ *
 *  Un client, une demande, même des mois plus tard
 * ------------------------------------------------------------------ */

/** La seconde commande d'un client, cinq mois après la première : hors des 120 jours relus. */
const PAYE_LE_5_MOIS = PAYE_LE + 150 * 86400;
const DUE_5_MOIS = PAYE_LE_5_MOIS * 1000 + 66 * JOUR_MS;

test("un client qui recommande cinq mois plus tard ne reçoit pas de seconde demande", async () => {
  const stripe = fauxStripe();
  ajouter(stripe, { n: 1 });
  assert.deepEqual((await passage(stripe, { maintenant: DUE })).bilan.envoyes, ["AB-TEST1"]);
  // Nouvelle commande, nouvelle fiche client (customer_creation « always »), majuscules différentes.
  ajouter(stripe, { n: 2, email: "Client1@Exemple.fr", client: "cus_2", payeLe: PAYE_LE_5_MOIS });
  const { bilan, envoyes } = await passage(stripe, { maintenant: DUE_5_MOIS });
  assert.equal(envoyes.length, 0, "la première commande n'est plus lue, la fiche client s'en souvient");
  assert.equal(bilan.ignores.meme_client, 1);
  assert.equal(stripe.meta.get("pi_2")?.[CLE_AVIS], "autre-commande");
});

test("le « non » d'un client vaut pour toutes ses commandes, écrit sur sa fiche ou sur un paiement", async () => {
  // Sur sa fiche client (même une fiche d'une autre commande).
  const fiche = fauxStripe();
  fiche.clients.set("cus_ancien", { email: "client2@exemple.fr", metadata: { [CLE_AVIS]: "non" } });
  ajouter(fiche, { n: 2 });
  ajouter(fiche, { n: 3, metaClient: { [CLE_AVIS]: "non" } });
  const parFiche = await passage(fiche, { maintenant: DUE });
  assert.equal(parFiche.envoyes.length, 0);
  assert.equal(parFiche.bilan.ignores.meme_client, 2);

  // Sur le paiement : recopié sur la fiche au passage suivant, il tient après les 120 jours.
  const paiement = fauxStripe();
  ajouter(paiement, { n: 1, metaPaiement: { [CLE_AVIS]: "non" } });
  await passage(paiement, { maintenant: PAYE_LE * 1000 + 10 * JOUR_MS });
  assert.equal(paiement.clients.get("cus_1")?.metadata[CLE_AVIS], "non");
  ajouter(paiement, { n: 2, email: "client1@exemple.fr", client: "cus_2", payeLe: PAYE_LE_5_MOIS });
  const ensuite = await passage(paiement, { maintenant: DUE_5_MOIS });
  assert.equal(ensuite.envoyes.length, 0);
});

/* ------------------------------------------------------------------ *
 *  L'envoi chez Resend : envoyé, refusé, ou incertain
 * ------------------------------------------------------------------ */

test("Resend : la clé Idempotency-Key part à chaque essai, et seul un refus franc veut dire « rien n'est parti »", async () => {
  const delai = () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };
  const reseau = () => {
    throw new TypeError("fetch failed");
  };
  const cas: { reponses: (number | (() => never))[]; attendu: ResultatEnvoi; appels: number }[] = [
    { reponses: [200], attendu: "envoye", appels: 1 },
    { reponses: [delai, 200], attendu: "envoye", appels: 2 },
    { reponses: [delai, delai], attendu: "incertain", appels: 2 },
    { reponses: [reseau, 422], attendu: "incertain", appels: 2 },
    { reponses: [500, 500], attendu: "incertain", appels: 2 },
    { reponses: [500, 200], attendu: "envoye", appels: 2 },
    { reponses: [409], attendu: "incertain", appels: 1 },
    { reponses: [429, 429], attendu: "refuse", appels: 2 },
    { reponses: [429, 200], attendu: "envoye", appels: 2 },
    { reponses: [422], attendu: "refuse", appels: 1 },
    { reponses: [401], attendu: "refuse", appels: 1 },
  ];
  const erreur = console.error;
  console.error = () => {};
  try {
    for (const { reponses, attendu, appels } of cas) {
      const vus: { adresse: string; cle: string | undefined }[] = [];
      const resultat = await posterResend({
        apiKey: "re_test",
        payload: { to: ["client@exemple.fr"] },
        cleUnique: "avis/pi_1",
        pauseMs: 0,
        fetch: (async (adresse: string | URL | Request, init?: RequestInit) => {
          vus.push({ adresse: String(adresse), cle: (init?.headers as Record<string, string>)["Idempotency-Key"] });
          const reponse = reponses[vus.length - 1];
          if (typeof reponse === "function") reponse();
          return new Response("{}", { status: reponse as number });
        }) as typeof fetch,
      });
      const nom = reponses.map((r) => (typeof r === "function" ? r.name : r)).join(" puis ");
      assert.equal(resultat, attendu, nom);
      assert.equal(vus.length, appels, `${nom} : nombre d'essais`);
      assert.ok(vus.every((v) => v.adresse === ADRESSE_RESEND && v.cle === "avis/pi_1"), `${nom} : la même clé à chaque essai`);
    }
    // Sans clé (les autres mails du site), pas d'en-tête.
    let entetes: Record<string, string> = {};
    await posterResend({
      apiKey: "re_test",
      payload: {},
      fetch: (async (_a: string | URL | Request, init?: RequestInit) => {
        entetes = init?.headers as Record<string, string>;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal("Idempotency-Key" in entetes, false);
  } finally {
    console.error = erreur;
  }
});

test("email.ts passe la clé à Resend ; la route d'avis la donne, relit la trace et consulte les fiches client", () => {
  const email = lire("src/lib/email.ts");
  assert.match(email, /cleUnique: input\.idempotencyKey/);
  assert.match(email, /return \(await envoyerEmail\(input\)\) === "envoye"/);
  const route = lire("src/app/api/cron/avis/route.ts");
  assert.match(route, /idempotencyKey: cleUnique/);
  assert.match(route, /paymentIntents\.retrieve\(paiementId\)/);
  assert.match(route, /customers\.list\(\{ email, limit: 100 \}\)/);
  assert.match(route, /customers\.update\(clientId, \{ metadata: \{ \[CLE_AVIS\]: valeur \} \}\)/);
  assert.match(route, /"data\.customer"/);
});

test("/api/cron/avis ne se tait plus : réglage manquant, plafond atteint, rien d'envoyé sur des échecs", () => {
  const route = lire("src/app/api/cron/avis/route.ts");
  const corps = route.slice(route.indexOf("export async function GET"));
  for (const arret of ["email_non_configure", "stripe_non_configure"]) {
    const bloc = corps.slice(corps.indexOf(`arret: "${arret}"`) - 300, corps.indexOf(`arret: "${arret}"`) + 80);
    assert.match(bloc, /console\.error/, `${arret} : écrit dans les journaux`);
    assert.match(bloc, /status: 503/, `${arret} : en rouge dans l'écran des crons`);
  }
  assert.match(corps, /sessions\.length >= SESSIONS_MAX\) \{\s+[^]*?console\.warn/);
  assert.match(corps, /status: bilan\.envoyes\.length === 0 \? 500 : 200/);
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
  assert.match(page, /fiche \? t\.fiche : t\.attente/, "la fiche Google si elle existe, sinon « pas encore ouverte »");
  assert.doesNotMatch(lire("src/app/sitemap.ts"), /\/avis/);
  for (const dict of [fr, en]) {
    for (const cle of ["titre", "intro", "attente", "fiche", "boutonFiche", "question", "retour"] as const) {
      assert.ok(dict.avis[cle].trim().length > 2, `avis.${cle}`);
    }
    assert.doesNotMatch(JSON.stringify(dict.avis), /[ée]toile|\bstars?\b|remise|cadeau|discount|gift/i);
  }
});

test("au moment où il donne ses données, le client lit qu'elles servent aussi à une seule demande d'avis", () => {
  // Le panier (sous le bouton de paiement) et les mentions légales ne disent plus « uniquement la commande ».
  for (const texte of [fr.panier.privacyNote, fr.mentionsLegales.sections[5].body]) {
    assert.doesNotMatch(texte, /uniquement/);
    assert.match(texte, /\(dont une seule demande d'avis après la livraison\)/);
  }
  for (const texte of [en.panier.privacyNote, en.mentionsLegales.sections[5].body]) {
    assert.doesNotMatch(texte, /\bonly\b/);
    assert.match(texte, /\(including a single review request after delivery\)/);
  }
  assert.equal(fr.mentionsLegales.sections[5].title, "Données personnelles");
  assert.equal(en.mentionsLegales.sections[5].title, "Personal data");
});

test("la page /avis sans lien ne promet aucun délai et ne demande pas de revenir", () => {
  assert.equal(fr.avis.attente, "La page des avis n'est pas encore ouverte : cette même adresse y mènera bientôt.");
  assert.equal(en.avis.attente, "The review page is not open yet: this same address will take you there soon.");
  for (const texte of [fr.avis.attente, en.avis.attente]) {
    assert.doesNotMatch(texte, /revenez|quelques jours|très bientôt|come back|few days|very soon/i);
  }
});

test("anglais : les mêmes mots partout — « email », « workshop »", () => {
  const mail = mailAvis({ reference: "AB-K7P2X9", locale: "en" });
  assert.doesNotMatch(`${mail.text}${mail.html}`, /e-mail/);
  assert.match(mail.text, /simply reply to this email\./);
  const politique = en.confidentialite.sections[2].body;
  assert.match(politique, /the workshop's Google page/);
  assert.doesNotMatch(politique, /studio's Google page/);
  assert.match(politique, /Just email us if you would rather not receive it\./);
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
