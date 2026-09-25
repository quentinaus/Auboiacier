import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Devis } from "@/lib/devis";
import { prixAffiche } from "@/lib/ui";

/* ------------------------------------------------------------------ *
 *  La mise en page du devis, en PDF
 *  Une feuille A4, sobre, dans les couleurs du site : le titre en Crimson
 *  (le serif du document), le reste en Helvetica. Les données viennent de
 *  composerDevis (src/lib/devis.ts) ; ici on ne fait que les poser.
 * ------------------------------------------------------------------ */

const ENCRE = "#2b2320";
const GRIS = "#6f6357";
const TRAIT = "#e5ddd3";
const FOND = "#f7f4ef";

/**
 * Le serif du devis, lu une fois dans public/fonts et passé en base64 :
 * react-pdf ne lit pas les polices du système, et un chemin de fichier n'est
 * pas sûr d'exister une fois le site déployé. Sans le fichier, Times prend
 * le relais : le devis sort quand même.
 */
let policeEnregistree = false;
function enregistrerPolice() {
  if (policeEnregistree) return;
  policeEnregistree = true;
  try {
    const dossier = path.join(process.cwd(), "public", "fonts");
    const lire = (fichier: string) =>
      `data:font/ttf;base64,${fs.readFileSync(path.join(dossier, fichier)).toString("base64")}`;
    Font.register({
      family: "Crimson",
      fonts: [
        { src: lire("CrimsonText-Regular.ttf"), fontWeight: 400 },
        { src: lire("CrimsonText-SemiBold.ttf"), fontWeight: 600 },
      ],
    });
  } catch {
    Font.register({
      family: "Crimson",
      fonts: [{ src: "Times-Roman" }, { src: "Times-Bold", fontWeight: 600 }],
    });
  }
  // Aucune césure : un mot coupé au hasard fait amateur sur un devis.
  Font.registerHyphenationCallback((mot) => [mot]);
}

const TEXTES = {
  fr: {
    devis: "Devis",
    estimation: "Estimation",
    numero: "N°",
    date: "Date",
    validite: "Valable jusqu'au",
    emetteur: "Émetteur",
    client: "Client",
    clientVide: "Nom, adresse",
    piece: "Votre pièce",
    designation: "Désignation",
    qte: "Qté",
    unitaire: "Prix unitaire",
    total: "Total",
    totalDu: "Total",
    delai: "Délai de fabrication",
    delaiSuite: "à compter du paiement",
    conditions: "Conditions",
    accord: "Bon pour accord",
    signature: "Date et signature, précédées de « Bon pour accord »",
    confirmation: "Confirmation de commande",
    accepte: "Commande acceptée et payée",
    accepteLe: "Le",
    accepteCgv: "Conditions générales de vente acceptées avant le paiement.",
    transaction: "Paiement :",
    empreinte: "Empreinte du document :",
    suivi: "Une question sur cette commande :",
    commander: "Pour commander en ligne, aux conditions de ce devis :",
    page: "Page",
    sur: "/",
    pied: "Auboiacier — métallerie d'art, Saumur — auboiacier.fr — auboiacier@gmail.com",
  },
  en: {
    devis: "Quote",
    estimation: "Estimate",
    numero: "No.",
    date: "Date",
    validite: "Valid until",
    emetteur: "From",
    client: "Customer",
    clientVide: "Name, address",
    piece: "Your piece",
    designation: "Description",
    qte: "Qty",
    unitaire: "Unit price",
    total: "Total",
    totalDu: "Total",
    delai: "Lead time",
    delaiSuite: "from payment",
    conditions: "Terms",
    accord: "Agreed and accepted",
    signature: "Date and signature, preceded by “Agreed and accepted”",
    confirmation: "Order confirmation",
    accepte: "Order accepted and paid",
    accepteLe: "On",
    accepteCgv: "Terms of sale accepted before payment.",
    transaction: "Payment:",
    empreinte: "Document fingerprint:",
    suivi: "Any question about this order:",
    commander: "To order online, on the terms of this quote:",
    page: "Page",
    sur: "/",
    pied: "Auboiacier — art metalwork, Saumur, France — auboiacier.fr — auboiacier@gmail.com",
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: ENCRE,
  },
  /* Chaque texte a son interligne, en points ET avec l'unité : pour react-pdf
     un nombre nu est un multiplicateur de la taille de police (13 = treize
     fois !), et le texte ne tient plus jamais dans la page — le serveur
     tournait sans fin. Rien sur la page elle-même : hérité par le numéro de
     page (un Text à `render`), l'interligne l'empêchait de s'afficher. */
  corps: {},
  enTete: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  marque: { fontSize: 12, letterSpacing: 3.2, color: ENCRE },
  marqueSous: { marginTop: 3, fontSize: 8, color: GRIS, lineHeight: "11pt" },
  titre: {
    fontFamily: "Crimson",
    fontWeight: 600,
    fontSize: 30,
    lineHeight: "30pt",
    textAlign: "right",
    color: ENCRE,
  },
  /**
   * « Confirmation de commande » fait trois fois la largeur de « Devis » : à
   * 30 points il passait par-dessus l'adresse de l'atelier, à gauche. Les
   * documents courts gardent leur grand titre, les longs rapetissent.
   */
  titreLong: { fontSize: 19, lineHeight: "21pt" },
  titrePiece: {
    marginTop: 4,
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: GRIS,
    textAlign: "right",
    lineHeight: "11pt",
  },
  meta: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  metaLabel: {
    fontSize: 7.5,
    color: GRIS,
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: "12pt",
  },
  metaValeur: { fontSize: 9, lineHeight: "12pt" },
  filet: { marginTop: 16, borderBottomWidth: 0.75, borderBottomColor: ENCRE },
  filetFin: { borderBottomWidth: 0.5, borderBottomColor: TRAIT },
  colonnes: { marginTop: 16, flexDirection: "row", gap: 28 },
  colonne: { flex: 1 },
  etiquette: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: GRIS,
    marginBottom: 5,
    lineHeight: "10pt",
  },
  nomEmetteur: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    lineHeight: "14pt",
  },
  ligneGrise: { fontSize: 8.5, color: GRIS, lineHeight: "12.5pt" },
  clientVide: {
    marginTop: 2,
    height: 46,
    borderBottomWidth: 0.5,
    borderBottomColor: TRAIT,
  },
  section: { marginTop: 24 },
  piece: { flexDirection: "row", gap: 22, marginTop: 8 },
  photo: { width: 140, height: 140, objectFit: "contain" },
  pieceTexte: { flex: 1 },
  pieceNom: {
    fontFamily: "Crimson",
    fontWeight: 600,
    fontSize: 20,
    lineHeight: "22pt",
  },
  pieceAccroche: {
    marginTop: 3,
    fontSize: 8.5,
    color: GRIS,
    lineHeight: "12.5pt",
  },
  caracteristiques: { marginTop: 10 },
  carac: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: TRAIT,
  },
  caracLabel: {
    width: 104,
    fontSize: 8,
    color: GRIS,
    paddingRight: 8,
    lineHeight: "12pt",
  },
  caracValeur: { flex: 1, fontSize: 8.75, lineHeight: "13pt" },
  tableau: { marginTop: 22 },
  enTeteTableau: {
    flexDirection: "row",
    paddingBottom: 5,
    borderBottomWidth: 0.75,
    borderBottomColor: ENCRE,
  },
  ligne: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: TRAIT,
  },
  ligneTitre: { paddingTop: 9, paddingBottom: 3 },
  designationTitre: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    lineHeight: "14pt",
  },
  celDesignation: { flex: 1, paddingRight: 10, paddingLeft: 10 },
  celQte: { width: 34, textAlign: "right", lineHeight: "13pt" },
  celPrix: { width: 82, textAlign: "right", lineHeight: "13pt" },
  celTotal: { width: 82, textAlign: "right", lineHeight: "13pt" },
  designation: { fontSize: 9.5, lineHeight: "14pt" },
  detail: { marginTop: 2, fontSize: 8, color: GRIS, lineHeight: "12pt" },
  /** Le poids du colis, dans un détail : à repérer d'un coup d'œil, pas noyé dans le gris. */
  detailGras: { fontFamily: "Helvetica-Bold", color: ENCRE },
  totaux: { marginTop: 10, alignItems: "flex-end" },
  totalLigne: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    gap: 18,
    paddingVertical: 2,
  },
  totalLabel: { fontSize: 8.5, color: GRIS, lineHeight: "13pt" },
  totalValeur: {
    width: 82,
    textAlign: "right",
    fontSize: 9,
    lineHeight: "13pt",
  },
  totalDu: { fontFamily: "Helvetica-Bold", fontSize: 12.5 },
  encart: {
    marginTop: 14,
    backgroundColor: FOND,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 8.75,
    lineHeight: "13pt",
  },
  conditions: { marginTop: 18 },
  condition: { flexDirection: "row", gap: 6, marginBottom: 2.5 },
  puce: { width: 6, color: GRIS, fontSize: 7.5, lineHeight: "11.5pt" },
  conditionTexte: { flex: 1, fontSize: 7.5, color: GRIS, lineHeight: "11.5pt" },
  accord: { marginTop: 18, flexDirection: "row", gap: 16 },
  accordBoite: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: ENCRE,
    padding: 10,
    minHeight: 78,
  },
  accordTitre: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    lineHeight: "12pt",
  },
  accordTexte: { marginTop: 2, fontSize: 7.5, color: GRIS, lineHeight: "11pt" },
  accordEmpreinte: {
    marginTop: 4,
    fontSize: 6,
    color: GRIS,
    letterSpacing: 0.3,
    lineHeight: "8.5pt",
  },
  commander: { flex: 1, justifyContent: "flex-end" },
  lien: {
    fontSize: 8,
    color: ENCRE,
    textDecoration: "underline",
    lineHeight: "12pt",
  },
  pied: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 26,
    fontSize: 7,
    color: GRIS,
    borderTopWidth: 0.5,
    borderTopColor: TRAIT,
    paddingTop: 6,
    lineHeight: "10pt",
  },
  /* Surtout pas d'interligne ici : avec, le Text à `render` ne s'affiche plus. */
  pageNumero: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 26,
    paddingTop: 6,
    textAlign: "right",
    fontSize: 7,
    color: GRIS,
  },
});

/** Coupe un texte sur ses paires de « ** » (le poids du colis) et met le milieu en avant. */
function avecGras(texte: string) {
  return texte
    .split("**")
    .map((morceau, i) => (i % 2 === 1 ? <Text key={i} style={styles.detailGras}>{morceau}</Text> : morceau));
}

function DocumentDevis({ devis }: { devis: Devis }) {
  const t = TEXTES[devis.locale];
  const prix = (euros: number) =>
    prixAffiche(euros, devis.locale)
      .replace(/\u202f/g, "\u00a0")
      .replace(/\u2212/g, "-");
  const titre =
    devis.nature === "confirmation"
      ? t.confirmation
      : devis.nature === "estimation"
        ? t.estimation
        : t.devis;
  return (
    <Document
      title={[titre, "Auboiacier", devis.piece.nom, devis.numero]
        .filter(Boolean)
        .join(" — ")}
      author="Auboiacier"
      subject={devis.piece.nom || devis.numero}
      language={devis.locale}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.corps}>
          {/* En-tête : la marque à gauche, le titre et les repères à droite. */}
          <View style={styles.enTete}>
            <View>
              <Text style={styles.marque}>AUBOIACIER</Text>
              <Text style={styles.marqueSous}>{devis.emetteur.lignes[0]}</Text>
            </View>
            <View>
              <Text
                style={
                  devis.nature === "confirmation"
                    ? [styles.titre, styles.titreLong]
                    : styles.titre
                }
              >
                {titre}
              </Text>
              {/* Sur une commande à plusieurs pièces il n'y a pas de nom à
                  écrire : le numéro juste en dessous dit déjà tout. */}
              {devis.piece.nom !== "" && (
                <Text style={styles.titrePiece}>{devis.piece.nom}</Text>
              )}
              <View style={styles.meta}>
                <Text style={styles.metaLabel}>{t.numero}</Text>
                <Text style={styles.metaValeur}>{devis.numero}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.metaLabel}>{t.date}</Text>
                <Text style={styles.metaValeur}>{devis.date}</Text>
              </View>
              {devis.nature === "devis" && (
                <View style={styles.meta}>
                  <Text style={styles.metaLabel}>{t.validite}</Text>
                  <Text style={styles.metaValeur}>{devis.validite}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.filet} />

          {/* Qui vend, à qui. */}
          <View style={styles.colonnes}>
            <View style={styles.colonne}>
              <Text style={styles.etiquette}>{t.emetteur}</Text>
              <Text style={styles.nomEmetteur}>{devis.emetteur.nom}</Text>
              {devis.emetteur.lignes.map((ligne) => (
                <Text key={ligne} style={styles.ligneGrise}>
                  {ligne}
                </Text>
              ))}
            </View>
            <View style={styles.colonne}>
              <Text style={styles.etiquette}>{t.client}</Text>
              {devis.client.nom || devis.client.adresse || devis.client.email || devis.client.telephone ? (
                <>
                  {devis.client.nom && (
                    <Text style={styles.nomEmetteur}>{devis.client.nom}</Text>
                  )}
                  {devis.client.adresse && (
                    <Text style={styles.ligneGrise}>
                      {devis.client.adresse}
                    </Text>
                  )}
                  {devis.client.email && (
                    <Text style={styles.ligneGrise}>{devis.client.email}</Text>
                  )}
                  {devis.client.telephone && (
                    <Text style={styles.ligneGrise}>{devis.client.telephone}</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.ligneGrise}>{t.clientVide}</Text>
                  <View style={styles.clientVide} />
                </>
              )}
            </View>
          </View>

          {/* La pièce, en photo et en détail — sauf sur une confirmation de
              commande, où ni la photo ni les caractéristiques ne sont connues :
              elles vivent dans le configurateur, pas chez Stripe. Un cadre à
              moitié vide vaudrait moins que le tableau qui suit. */}
          {(devis.piece.photo || devis.piece.caracteristiques.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.etiquette}>{t.piece}</Text>
              <View style={styles.piece}>
                {devis.piece.photo && (
                  // eslint-disable-next-line jsx-a11y/alt-text -- l'Image de react-pdf n'a pas d'attribut alt
                  <Image src={devis.piece.photo} style={styles.photo} />
                )}
                <View style={styles.pieceTexte}>
                  <Text style={styles.pieceNom}>{devis.piece.nom}</Text>
                  <Text style={styles.pieceAccroche}>{devis.piece.accroche}</Text>
                  <View style={styles.caracteristiques}>
                    {devis.piece.caracteristiques.map((c) => (
                      <View key={c.label} style={styles.carac} wrap={false}>
                        <Text style={styles.caracLabel}>{c.label}</Text>
                        <Text style={styles.caracValeur}>{c.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Les lignes et le total. */}
          <View style={styles.tableau}>
            <View style={styles.enTeteTableau}>
              <Text
                style={[
                  styles.celDesignation,
                  styles.etiquette,
                  { marginBottom: 0 },
                ]}
              >
                {t.designation}
              </Text>
              <Text
                style={[styles.celQte, styles.etiquette, { marginBottom: 0 }]}
              >
                {t.qte}
              </Text>
              <Text
                style={[styles.celPrix, styles.etiquette, { marginBottom: 0 }]}
              >
                {t.unitaire}
              </Text>
              <Text
                style={[styles.celTotal, styles.etiquette, { marginBottom: 0 }]}
              >
                {t.total}
              </Text>
            </View>
            {devis.lignes.map((ligne) =>
              ligne.titre ? (
                <View
                  key={ligne.designation}
                  style={styles.ligneTitre}
                  wrap={false}
                >
                  <Text style={styles.designationTitre}>
                    {ligne.designation}
                  </Text>
                  {ligne.details.map((d) => (
                    <Text key={d} style={styles.detail}>
                      {avecGras(d)}
                    </Text>
                  ))}
                </View>
              ) : (
                <View key={ligne.designation} style={styles.ligne} wrap={false}>
                  <View style={styles.celDesignation}>
                    <Text style={styles.designation}>{ligne.designation}</Text>
                    {ligne.details.map((d) => (
                      <Text key={d} style={styles.detail}>
                        {avecGras(d)}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.celQte}>{ligne.quantite}</Text>
                  <Text style={styles.celPrix}>{prix(ligne.unitaire)}</Text>
                  <Text style={styles.celTotal}>{prix(ligne.total)}</Text>
                </View>
              ),
            )}
          </View>
          <View style={styles.totaux} wrap={false}>
            <View style={styles.totalLigne}>
              <Text
                style={[styles.totalLabel, styles.totalDu, { color: ENCRE }]}
              >
                {t.totalDu}
              </Text>
              <Text style={[styles.totalValeur, styles.totalDu]}>
                {prix(devis.total)}
              </Text>
            </View>
          </View>

          <View style={styles.encart} wrap={false}>
            <Text>
              {t.delai} : {devis.delai}, {t.delaiSuite}.
            </Text>
          </View>

          {/* Les conditions, puis la case à signer. */}
          <View style={styles.conditions} wrap={false}>
            <Text style={styles.etiquette}>{t.conditions}</Text>
            {devis.conditions.map((c) => (
              <View key={c} style={styles.condition}>
                <Text style={styles.puce}>—</Text>
                <Text style={styles.conditionTexte}>{c}</Text>
              </View>
            ))}
          </View>

          <View style={styles.accord} wrap={false}>
            {devis.acceptation ? (
              /* La case n'est plus à remplir : elle l'est déjà. Tout ce qui
                 s'y écrit vient de Stripe — l'heure de la commande, le numéro
                 de la transaction — et l'empreinte scelle le contenu. */
              <View style={styles.accordBoite}>
                <Text style={styles.accordTitre}>{t.accepte}</Text>
                <Text style={styles.accordTexte}>
                  {t.accepteLe} {devis.acceptation.quand}
                </Text>
                <Text style={styles.accordTexte}>{t.accepteCgv}</Text>
                <Text style={styles.accordTexte}>
                  {t.transaction} {devis.acceptation.transaction}
                </Text>
                <Text style={styles.accordEmpreinte}>
                  {t.empreinte} {devis.acceptation.empreinte}
                </Text>
              </View>
            ) : devis.nature === "devis" ? (
              <View style={styles.accordBoite}>
                <Text style={styles.accordTitre}>{t.accord}</Text>
                <Text style={styles.accordTexte}>{t.signature}</Text>
              </View>
            ) : null}
            <View style={styles.commander}>
              <Text style={styles.ligneGrise}>
                {devis.acceptation ? t.suivi : t.commander}
              </Text>
              <Text style={styles.lien}>
                {devis.lienFiche.replace(/^https?:\/\//, "")}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.pied} fixed>
          {t.pied}
        </Text>
        <Text
          style={styles.pageNumero}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${t.page} ${pageNumber} ${t.sur} ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

/**
 * L'espace fine insécable que le français met devant les milliers (« 2 440 »)
 * n'existe pas dans Helvetica : elle sortait en « / ». On la remplace par
 * l'espace insécable ordinaire, que toutes les polices du PDF connaissent.
 */
function sansEspacesFines(devis: Devis): Devis {
  return JSON.parse(
    JSON.stringify(devis)
      .replaceAll("\u202f", "\u00a0")
      .replaceAll("\u2212", "-"),
  ) as Devis;
}

/** Le PDF d'un devis, prêt à envoyer au navigateur. */
export async function rendreDevisPdf(brut: Devis): Promise<Buffer> {
  enregistrerPolice();
  const devis = sansEspacesFines(brut);
  try {
    return await renderToBuffer(<DocumentDevis devis={devis} />);
  } catch (erreur) {
    // La photo n'a pas pu être chargée (réseau, format) : le devis sort sans elle.
    if (devis.piece.photo) {
      return renderToBuffer(
        <DocumentDevis
          devis={{ ...devis, piece: { ...devis.piece, photo: undefined } }}
        />,
      );
    }
    throw erreur;
  }
}
