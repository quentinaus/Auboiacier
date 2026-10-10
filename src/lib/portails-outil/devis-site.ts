/**
 * L'estimation PDF d'un portail, sur le site (lot 9, 09/10/2026) : LE DEVIS DE L'OUTIL, en nature « estimation ».
 *
 * Les lignes et le total sont ceux de l'outil de plans : composerDevisPortail (devis.genere.mjs, extrait tel quel de
 * modules/devis-portails.js) avec les postes du chiffrage chiffré (ptcPostesDevis : des prix de vente seulement). Le site
 * n'ajoute que ce qui lui appartient : l'émetteur et ses mentions, le numéro, la date, le lien vers la fiche, et range les
 * encarts (compris, non compris, à préparer) dans les conditions du PDF.
 *
 * SERVEUR SEULEMENT (via src/lib/prix-portail.server.ts). En français : le devis du portail n'a pas encore sa version anglaise.
 */
import { createHash } from "node:crypto";
import { fabriqueDevisPortail } from "./devis.genere.mjs";
import { PT_MODELES } from "./moteur.genere.mjs";
import { chiffragePortail } from "./chiffrage.ts";
import { calculerPortail } from "./moteur.genere.mjs";
import { configPortillonAssorti, planPortail, versEntrees, SLUGS_PORTAIL, type ConfigPortail, type SlugPortail } from "../portails.ts";
import { dateLisible, emetteurDevis, type Devis, type ResultatDevis } from "../devis.ts";

const FINE = " ";
const nb = (n: number, d = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n).replace(/\s/g, FINE);
const compacte = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** Les petits outils du devis de l'outil, refaits avec ceux du site (même sortie que dans l'outil pour ce devis). */
function outilsDevis() {
  const em = emetteurDevis("fr");
  return {
    dsEsc: (t: unknown) => String(t ?? ""),
    dsNb: nb,
    dsMm: (x: number) => nb(Math.round(x)),
    dsPrix: (x: number) => `${nb(x, 2)} €`,
    dsDate: (d?: unknown) => (d instanceof Date ? d : new Date()),
    dsDateLisible: (d: Date) => dateLisible(d, "fr"),
    dsDateCompacte: compacte,
    dsPlusJours: (d: Date, n: number) => new Date(d.getTime() + n * 86400000),
    dsEmpreinte: (t: string) => createHash("sha256").update(t).digest("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase(),
    dsLieu: () => "",
    dsDevisHtml: () => "",
    DS_EMETTEUR: { nom: em.nom, lignes: em.lignes, franchiseTva: [] },
    DS_VALIDITE_JOURS: 30,
    PT_MODELES,
  };
}

export function composerEstimationPortail(entree: { slug: SlugPortail; cfg: ConfigPortail; client: { nom?: string; email?: string }; date: Date; /** La livraison par transporteur, en euros, si elle est connue (une ligne de l'estimation). */ livraison?: number | null }): ResultatDevis {
  const { slug, cfg } = entree;
  const R = planPortail(slug, cfg);
  if (R.alertes.length) return { ok: false, reason: "a_etudier" };
  const ch = chiffragePortail();
  const modele = SLUGS_PORTAIL[slug];
  const o = { clesCatalogue: ch.PTC_CLES_CATALOGUE, reception: cfg.reception };
  const P = ch.ptcPostesDevis(R, versEntrees(cfg), undefined, o, (vv) => calculerPortail(vv, modele));
  let portillon: { R: unknown; montant: number } | null = null;
  if (cfg.portillon && slug !== "portillon") {
    const q = configPortillonAssorti(cfg), Rq = planPortail("portillon", q);
    if (Rq.alertes.length) return { ok: false, reason: "a_etudier" };
    portillon = { R: Rq, montant: ch.chiffrerPortail(Rq, versEntrees(q), undefined, { ...o, complement: true }).conseille };
  }
  const { composerDevisPortail } = fabriqueDevisPortail(outilsDevis());
  const r = composerDevisPortail({ R, v: versEntrees(cfg), postes: P.postes, portillon, infos: { client: entree.client.nom, email: entree.client.email, date: entree.date }, nature: "estimation", reception: cfg.reception, livraison: entree.livraison ?? null });
  if (!r.ok) return { ok: false, reason: "a_etudier" };
  const d = r.devis;
  const encarts: string[] = (d.encarts as { titre: string; lignes: string[] }[]).flatMap((e) => e.lignes.map((l) => `${e.titre} : ${l.charAt(0).toLowerCase()}${l.slice(1)}`));
  const devis: Devis = {
    nature: "estimation",
    numero: d.numero,
    date: d.date,
    validite: "",
    locale: "fr",
    emetteur: emetteurDevis("fr"),
    client: { nom: entree.client.nom, email: entree.client.email },
    piece: { nom: d.piece.nom, accroche: d.piece.accroche, caracteristiques: d.piece.caracteristiques },
    lignes: d.lignes,
    total: d.total,
    // Le PDF écrit « Délai de fabrication : …, à compter du paiement » : la pose et ce qui la conditionne sont dans les conditions.
    delai: "6 à 8 semaines",
    conditions: [...d.conditions, ...encarts],
    // Un portail ne se commande pas en ligne (la visite d'abord) : pas de « Pour commander en ligne ».
    lienFiche: "",
  };
  return { ok: true, devis };
}
