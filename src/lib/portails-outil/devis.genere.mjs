// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs depuis l'outil de plans (modules/devis-portails.js) : ne pas modifier.
export function fabriqueDevisPortail(ds) {
  const { dsEsc, dsNb, dsMm, dsPrix, dsDate, dsDateLisible, dsDateCompacte, dsPlusJours, dsEmpreinte, dsLieu, dsDevisHtml, DS_EMETTEUR, DS_VALIDITE_JOURS, PT_MODELES } = ds;
// Devis du portail (lot 8, 09/10/2026), au format du devis du site (dsDevisHtml de l'outil, mise en pages A4 et impression
// du garde-corps). Module SANS DOM, fonctions pures, en français. Noms de premier niveau : « dp » / « DP_ », ou
// composerDevisPortail et devisPortailHtml.
//   - Dans l'outil : collé dans l'IIFE après le bloc « DEVIS AU FORMAT DU SITE » (il réutilise dsEsc, dsNb, dsMm, dsMaj,
//     dsPrix, dsDate, dsDateLisible, dsDateCompacte, dsPlusJours, dsEmpreinte, dsLieu, DS_EMETTEUR, DS_VALIDITE_JOURS).
//   - Test : node plans/tests/devis-portails.test.mjs.
// Aucun coût ici : les montants arrivent déjà en prix de vente (ptcPostesDevis de chiffrage-portails.js, privé). Le site
// (lot 9) pourra donc publier ce module tel quel.
//
// Deux natures (cahier des charges §5.1) :
//   - "devis" (outil, après la visite) : à signer, valable 30 jours, avec l'acompte (le mot « acompte » est écrit : sinon,
//     pour un particulier, la somme vaut des arrhes) ;
//   - "estimation" (site, avant la visite) : ni validité ni « Bon pour accord » ; le devis définitif suit la visite.
//
// composerDevisPortail({ R, v, postes, portillon, infos, nature, tva, acomptePct }) → { ok, devis } | { ok: false, raison }
//   R, v : le plan du portail (calculerPortail) et ses entrées ; postes : [{ cle, montant }] (ptcPostesDevis) ;
//   portillon : null, ou { R, montant } (le portillon assorti, chiffré en complément) ; infos : { client, chantier, email,
//   telephone, date } ; tva : le taux de TVA de vente (0 = franchise) ; acomptePct : 30 par défaut (cahier des charges, question 7).

const DP_ACOMPTE_PCT = 30;
const DP_DELAI = "6 à 8 semaines de fabrication, puis la pose";
// La date limite de pose écrite au devis (Quentin, 09/10/2026 : « 10 semaines après l'acompte »), une fois prêt ce qui doit l'être.
const DP_POSE_MAX_SEMAINES = 10;
const DP_COULEURS = { anthracite: "gris anthracite (RAL 7016)", noir: "noir (RAL 9005)", blanc: "blanc (RAL 9016)", vert: "vert sapin (RAL 6009)", rouille: "rouille" };
const DP_FORMES = { droit: "droit", chapeau: "en chapeau de gendarme", creux: "en creux", biais: "en biais" };
const DP_REMP = { plein: "Lames alu pleines, emboîtées", panneau: "Panneau alu lisse", lames: "Lames de chêne", lamesAlu: "Lames alu ajourées", barreaux: "Barreaux", croix: "Croix et rosaces", volutes: "Barreaux et volutes" };
const DP_COMPRIS = [
  "La visite et la prise de cotes chez vous (la visite payée en ligne est déduite de ce devis)",
  "Le plan, la fabrication dans notre atelier à Saumur, la finition",
  "La livraison et la pose jusqu'à 45 km de Saumur, le réglage, les essais",
];
const DP_NON_COMPRIS = [
  "Le courant jusqu'au pilier (votre électricien)",
  "Le béton : massifs, plots, longrine, socle et tranchée, faits par votre maçon d'après notre plan (feuille 2)",
  "Les piliers et leurs enduits",
];

function dpPrem(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

function composerDevisPortail({ R, v, postes, portillon = null, infos = {}, nature = "devis", tva = null, acomptePct = DP_ACOMPTE_PCT }) {
  if (!R || !R.config || !R.debit) return { ok: false, raison: "Pas de devis : le plan du portail manque." };
  if (R.alertes && R.alertes.length) return { ok: false, raison: `Pas de devis : ${R.alertes[0]}` };
  if (!postes || !postes.length) return { ok: false, raison: "Pas de devis : le prix du portail manque." };
  const c = R.config, date = dsDate(infos.date);
  const estimation = nature === "estimation";
  const nomModele = (typeof PT_MODELES !== "undefined" && PT_MODELES[c.modele] ? PT_MODELES[c.modele].nom : "Portail");
  const acier = c.mat === "acier";
  const couleur = DP_COULEURS[c.couleur] || (acier ? DP_COULEURS.noir : DP_COULEURS.anthracite);
  const nbV = R.dims.vantaux.length;
  const vantauxTxt = nbV > 1 ? `${nbV} vantaux de ${R.dims.vantaux.map(dsMm).join(" + ")} mm` : `1 vantail de ${dsMm(R.dims.vantaux[0])} mm`;
  const sensTxt = c.type === "coulissant" ? `il se range vers la ${c.sens === "droite" ? "droite" : "gauche"}, vu de la rue`
    : nbV === 1 ? `gonds à ${c.sens === "droite" ? "droite" : "gauche"}, vu de la rue` : "s'ouvre vers la propriété";
  const M = R.moteurs && c.moteur ? R.moteurs.choisi : null;
  const decorPieces = R.quant && R.quant.decor ? R.quant.decor.pieces.length : 0;
  const montant = (cle) => { const p = postes.find((x) => x.cle === cle); return p ? Math.round(p.montant * 100) / 100 : 0; };

  // --- Les lignes, dans l'ordre du cahier des charges (§5.3) ; une ligne vide est omise ---
  const titre = `${nomModele} ${nbV > 1 ? `${nbV} vantaux` : c.type === "coulissant" ? (c.guidage === "auto" ? "autoportant" : "sur rail") : "1 vantail"}, ${dsMm(c.P)} × ${dsMm(c.H)} mm, ${acier ? "acier galvanisé et thermolaqué" : "alu thermolaqué"} ${couleur}`;
  const designations = {
    fabrication: { d: `Fabrication sur mesure à l'atelier : cadre, remplissage, ${acier ? "soudure MAG" : "soudure TIG de l'alu"}`, x: [vantauxTxt, `Poids environ ${dsNb(Math.round(R.poids))} kg`] },
    decor: { d: "Décor de ferronnerie, soudé à l'atelier (aucun collier)", x: [decorPieces ? `${decorPieces} pièces de fer forgé du commerce, reprises au gabarit` : ""] },
    finition: { d: acier ? "Finition : galvanisation à chaud puis thermolaquage (duplex)" : "Finition : thermolaquage", x: [`Teinte ${couleur}`] },
    quincaillerie: { d: c.type === "coulissant" ? (c.guidage === "auto" ? "Guidage autoportant et quincaillerie : chariots, guide, serrure, butées" : "Guidage et quincaillerie : rail, roues, guide, serrure, butées")
      : "Quincaillerie : gonds réglables adaptés au poids, serrure et cylindre, butée, arrêts", x: [] },
    poteaux: { d: `Poteaux ${c.poteaux === "alu" ? "alu" : "acier"} (option), boulonnés sur les massifs de votre maçon`, x: [] },
    moteur: { d: M ? `Motorisation Somfy (option) : ${M.nom}${M.ref ? `, ${M.ref}` : ""}` : "Motorisation (option)", x: [M && M.contenu ? M.contenu : "", "Mise en service : réglage des efforts, essais, déclaration CE, notice et registre d'entretien"] },
    pose: { d: "Visite de prise de cotes, plan, livraison et pose jusqu'à 45 km de Saumur", x: [] },
  };
  const lignes = [{ designation: titre, details: [], quantite: 1, unitaire: 0, total: 0, titre: true }];
  for (const cle of ["fabrication", "decor", "finition", "quincaillerie", "poteaux", "moteur"]) {
    const m = montant(cle);
    if (!m) continue;
    lignes.push({ designation: designations[cle].d, details: designations[cle].x.filter(Boolean), quantite: 1, unitaire: m, total: m });
  }
  if (portillon && portillon.montant > 0 && portillon.R) {
    const q = portillon.R.config;
    lignes.push({ designation: `Portillon assorti (option), même style : ${dsMm(q.P)} × ${dsMm(q.H)} mm, gonds à ${q.sens === "droite" ? "droite" : "gauche"} vu de la rue`, details: ["Posé le même jour que le portail : une seule visite, un seul voyage"], quantite: 1, unitaire: portillon.montant, total: portillon.montant });
  }
  const mPose = montant("pose");
  if (mPose) lignes.push({ designation: `${designations.pose.d}${dsLieu(infos.chantier) ? ` — ${dsLieu(infos.chantier)}` : ""}`, details: ["Au-delà de 45 km, la route est comptée à part"], quantite: 1, unitaire: mPose, total: mPose });
  const total = Math.round(lignes.reduce((a, l) => a + l.total, 0) * 100) / 100;

  // --- La pièce ---
  const caracteristiques = [
    { label: "Dimensions", value: `Passage ${dsMm(c.P)} mm, hauteur ${dsMm(c.H)} mm · ${vantauxTxt}` },
    { label: "Ouverture", value: dpPrem(sensTxt) },
    { label: "Forme du haut", value: dpPrem(DP_FORMES[c.forme] || c.forme) + (c.forme !== "droit" && c.fleche ? `, flèche ${dsMm(c.fleche)} mm` : "") },
    c.soub && c.soub !== "aucun" ? { label: "Soubassement", value: `${DP_REMP[c.soub] || dpPrem(c.soub)}, ${dsMm(c.hSoub)} mm` } : null,
    { label: "Remplissage", value: DP_REMP[c.remp] || dpPrem(c.remp) },
    decorPieces ? { label: "Décor", value: "Fer forgé, soudé à l'atelier" } : null,
    { label: "Matière et finition", value: acier ? `Acier galvanisé à chaud puis thermolaqué, ${couleur}` : `Alu soudé TIG, thermolaqué ${couleur}` },
    { label: "Fixation", value: c.poteaux === "existants" ? "Sur vos piliers, gonds réglables (matière vérifiée à la visite)" : `Poteaux ${c.poteaux} sur massifs (béton par votre maçon, d'après notre plan)` },
    { label: "Moteur", value: M ? `${M.nom}, garantie ${M.garantie || 5} ans` : "Ouverture à la main" },
  ].filter(Boolean);

  // --- Les encarts : ce que comprend le prix, ce qu'il ne comprend pas, ce qui doit être prêt avant la pose ---
  const prerequis = (R.pose && R.pose.prerequis) || [];
  const encarts = [
    { titre: "Ce que comprend le prix", lignes: DP_COMPRIS },
    { titre: "Ce qui n'est pas compris", lignes: DP_NON_COMPRIS },
    { titre: "À préparer avant la pose", lignes: prerequis.concat(["Nous contrôlons les supports à la pose : cotes à ± 10 mm, niveau, aplomb."]) },
  ];

  const acompte = estimation ? null : (() => {
    const a = Math.round(total * acomptePct / 100);
    return { texte: `Acompte de ${acomptePct} % à la signature : ${dsPrix(a)} · Solde à la réception (procès-verbal signé), mise en service comprise : ${dsPrix(total - a)}`, montant: a, solde: total - a };
  })();

  const conditions = estimation ? [
    "Estimation établie à partir des cotes et des choix indiqués sur le site, sans engagement.",
    "Le devis définitif est remis après le relevé de cotes chez vous.",
    "Le prix ne change que si la visite révèle : un pilier à reprendre, une différence de niveau, une pente, des réseaux enterrés, l'absence de courant ou un accès difficile.",
    "Les conditions générales de vente, disponibles sur auboiacier.fr/fr/cgv, s'appliquent à toute commande.",
  ] : [
    "Devis gratuit, établi à partir des cotes relevées chez vous et des choix indiqués ci-dessus.",
    "Prix en euros, montant total à payer ; le régime de TVA de l'atelier est rappelé sur la facture.",
    `Devis valable ${DS_VALIDITE_JOURS} jours à compter de sa date.`,
    `Un acompte de ${acomptePct} % est versé à la signature ; le solde est dû à la réception du portail, constatée par un procès-verbal signé, avec ou sans réserves.`,
    "Le délai court à partir de l'acompte, de l'accord de la déclaration préalable s'il en faut une, et du jour où ce qui est à préparer avant la pose est prêt. Si quelque chose n'est pas prêt, vous nous prévenez par mail ou par téléphone pour décaler la pose.",
    "Portail fabriqué sur mesure, selon vos spécifications : le droit de rétractation ne s'applique pas (art. L221-28 3° du code de la consommation).",
    "Garanties, à partir de la réception : garantie légale de conformité (deux ans) et des vices cachés ; garantie de parfait achèvement (un an) ; bon fonctionnement du moteur et de la quincaillerie (deux ans) ; la garantie décennale s'applique dans les limites de l'attestation de notre assureur.",
    `Entretien : graisser les gonds et les roues une fois par an${M ? ", faire vérifier le moteur et ses sécurités chaque année (registre d'entretien)" : ""}${R.debit.some((d) => /chêne/i.test(d.mat)) ? " ; huiler le chêne chaque année (notice remise à la pose)" : ""}. Après-vente : nous contacter, nous venons sur place.`,
    "Les conditions générales de vente, disponibles sur auboiacier.fr/fr/cgv, s'appliquent à toute commande.",
  ];

  const emetteur = tva === 0 ? { nom: DS_EMETTEUR.nom, lignes: DS_EMETTEUR.lignes.concat(DS_EMETTEUR.franchiseTva) } : { nom: DS_EMETTEUR.nom, lignes: DS_EMETTEUR.lignes.slice() };
  const devis = {
    nature: estimation ? "estimation" : "devis",
    titreDoc: estimation ? "Estimation" : "Devis",
    numero: "",
    date: dsDateLisible(date),
    validite: estimation ? null : dsDateLisible(dsPlusJours(date, DS_VALIDITE_JOURS)),
    emetteur,
    client: { nom: infos.client || undefined, adresse: infos.chantier || undefined, email: infos.email || undefined, telephone: infos.telephone || undefined },
    piece: { nom: nomModele, accroche: "Fabriqué sur mesure dans notre atelier à Saumur, posé par nos soins.", image: null, caracteristiques },
    lignes,
    total,
    delai: DP_DELAI,
    delaiTexte: `${DP_DELAI}, à partir de l'acompte et du jour où tout est prêt pour la pose ; pose au plus tard ${DP_POSE_MAX_SEMAINES} semaines après l'acompte, une fois prêt ce qui est à préparer avant la pose`,
    acompte,
    encarts,
    conditions,
    accord: !estimation,
    lienFiche: null,
  };
  const imprime = { ...devis, date: undefined, validite: undefined };
  devis.numero = `${estimation ? "E" : "D"}-${dsDateCompacte(date)}-${dsEmpreinte(JSON.stringify(imprime))}`;
  return { ok: true, devis };
}

/** Le devis du portail pour l'onglet de l'outil : bandeau d'écran (impression) + feuilles A4 (appeler paginerDevisSite après). */
function devisPortailHtml(p) {
  const r = composerDevisPortail(p);
  if (!r.ok) return `<div class="devis-site"><p class="ds-alerte">${dsEsc(r.raison)}</p></div>`;
  const d = r.devis;
  const horsClaude = typeof window !== "undefined" && !window.claude;
  const ecran = [];
  if (p.plancher && d.total < p.plancher) ecran.push(`<p class="ds-alerte"><b>Prix sous le plancher :</b> ${dsPrix(d.total)} pour un plancher de ${dsPrix(Math.round(p.plancher))}.</p>`);
  ecran.push(horsClaude ? `<button type="button" class="ds-imprimer" data-ds-imprimer>Imprimer le devis (PDF)</button>` : `<p class="ds-aide">Ici, l'impression ne marche pas : ouvre l'outil depuis le Bureau pour imprimer ce devis.</p>`);
  const titre = `Devis-Auboiacier-${d.piece.nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-")}-${d.numero}`;
  return `<div class="devis-site" data-ds-titre="${dsEsc(titre)}"><div class="ds-ecran">${ecran.join("")}</div>${dsDevisHtml(d)}</div>`;
}

  return { composerDevisPortail };
}
