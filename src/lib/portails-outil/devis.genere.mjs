// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs depuis l'outil de plans (modules/devis-portails.js) : ne pas modifier.
export function fabriqueDevisPortail(ds) {
  const { dsEsc, dsNb, dsMm, dsPrix, dsDate, dsDateLisible, dsDateCompacte, dsPlusJours, dsEmpreinte, dsLieu, dsDevisHtml, DS_EMETTEUR, DS_VALIDITE_JOURS, PT_MODELES } = ds;
// Devis du portail (lot 8, 09/10/2026), au format du devis du site (dsDevisHtml de l'outil, mise en pages A4 et impression
// du garde-corps). Module SANS DOM, fonctions pures, en français ET en anglais (locale: "en", 10/10/2026). Noms de premier niveau : « dp » / « DP_ », ou
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
const DP_DELAI_SANS_POSE = "6 à 8 semaines de fabrication";
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
// Sans pose (Quentin, 10/10/2026) : le portail part par transporteur ou le client vient le chercher ; la pose est faite par le client ou son poseur.
const DP_COMPRIS_SANS_POSE = {
  transporteur: [
    "Le plan, la fabrication dans notre atelier à Saumur, la finition",
    "L'emballage sur palette : le portail voyage debout, calé et protégé pour que le laquage ne soit pas rayé",
    "La livraison par transporteur est facturée à part, d'après le poids et les dimensions du colis",
  ],
  retrait: [
    "Le plan, la fabrication dans notre atelier à Saumur, la finition",
    "La protection du laquage pour le transport dans votre véhicule",
    "Le retrait à l'atelier, à Saumur, sur rendez-vous : gratuit",
  ],
};
const DP_NON_COMPRIS_SANS_POSE = [
  "La pose, le réglage et la mise en service du portail : faits par vous ou votre poseur",
  "La motorisation : posée par l'atelier seulement (la conformité CE de l'ensemble est de notre responsabilité)",
];
const DP_NON_COMPRIS = [
  "Le courant jusqu'au pilier (votre électricien)",
  "Le béton : massifs, plots, longrine, socle et tranchée, faits par votre maçon d'après notre plan (feuille 2)",
  "Les piliers et leurs enduits",
];

function dpPrem(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

// L'anglais (Quentin, 10/10/2026 : devis du portail en anglais, pour la version EN du site). Les phrases françaises restent la
// référence : composerDevisPortail({ …, locale: "en" }) écrit les mêmes lignes, les mêmes montants, en anglais. Ce qui vient du
// moteur (phrases « à préparer », contenu des moteurs, moulures) est traduit ici, par sa clé ou sa phrase française exacte.
const DP_EN = {
  delai: "6 to 8 weeks of manufacturing, then fitting", delaiSansPose: "6 to 8 weeks of manufacturing",
  couleurs: { anthracite: "anthracite grey (RAL 7016)", noir: "black (RAL 9005)", blanc: "white (RAL 9016)", vert: "fir green (RAL 6009)", rouille: "rust" },
  formes: { droit: "straight", chapeau: "arched (gendarme's hat)", creux: "dipped", biais: "sloped" },
  remp: { plein: "Solid interlocking slats", panneau: "Flat aluminium panel", lames: "Oak slats", lamesAlu: "Open aluminium slats", barreaux: "Bars", croix: "Crosses and rosettes", volutes: "Bars and scrolls" },
  modeles: { ptBattant: "Swing gate", ptCoulissant: "Sliding gate", ptPliant: "Folding gate", ptPortillon: "Pedestrian gate" },
  compris: [
    "The survey visit and measurements at your place (a visit paid online is deducted from this quote)",
    "The drawing, manufacturing in our Saumur workshop, the finish",
    "Delivery and fitting up to 45 km from Saumur, adjustment and testing",
  ],
  comprisSansPose: {
    transporteur: [
      "The drawing, manufacturing in our Saumur workshop, the finish",
      "Palletised packing: the gate travels upright, wedged and protected so that the lacquer is not scratched",
      "Carrier delivery is invoiced separately, according to the weight and dimensions of the parcel",
    ],
    retrait: [
      "The drawing, manufacturing in our Saumur workshop, the finish",
      "Protection of the lacquer for transport in your vehicle",
      "Collection at the workshop in Saumur, by appointment: free",
    ],
  },
  nonComprisSansPose: [
    "Fitting, adjustment and commissioning of the gate: done by you or your installer",
    "The motor: fitted by the workshop only (the CE conformity of the whole is our responsibility)",
  ],
  nonCompris: [
    "Power supply to the pillar (your electrician)",
    "Concrete: footings, pads, ground beam, base and trench, done by your mason from our drawing (sheet 2)",
    "The pillars and their render",
  ],
  moulures: { f400: "Oval cast zinc medallion 400 × 200", f250: "Oval cast zinc medallion 250 × 100", a400: "Oval cast aluminium medallion 400 × 200", a340: "Oval cast aluminium medallion 340 × 170" },
  contenuMoteur: {
    ixengo: "2 actuators, 3S+ io control box, 2 remote controls, photocells, flashing light with antenna, backup battery, adjustable pillar brackets",
    axovia: "2 articulated-arm motors, 3S+ io control box, 2 remote controls, photocells, flashing light with antenna, backup battery",
    elixo: "Motor with built-in control box, 2 remote controls, photocells, flashing light with antenna, backup battery (rack supplied separately)",
  },
  prerequis: {
    "Si quelque chose n'est pas prêt (maçonnerie, courant, accès), le client nous prévient par mail ou par téléphone pour décaler la pose": "If something is not ready (masonry, power, access), the customer lets us know by email or phone so that the fitting can be postponed",
    "Accès et place dégagés le jour de la pose": "Access and space cleared on the day of fitting",
    "Maçonnerie faite par son maçon d'après notre plan, coulée 7 jours au moins avant la pose": "Masonry done by the customer's mason from our drawing, poured at least 7 days before fitting",
    "Courant amené au pilier de l'armoire (si prévu)": "Power brought to the control box pillar (if planned)",
    "Déclaration préalable accordée, s'il en faut une (le client la dépose avec notre dessin)": "Prior declaration approved, if one is needed (the customer files it with our drawing)",
    "Réseaux signalés (DT-DICT)": "Underground services marked (DT-DICT)",
  },
};

function composerDevisPortail({ R, v, postes, portillon = null, infos = {}, nature = "devis", tva = null, acomptePct = DP_ACOMPTE_PCT, reception = "pose", livraison = null, locale = "fr" }) {
  const en = locale === "en", L = (fr, ang) => (en ? ang : fr);
  if (!R || !R.config || !R.debit) return { ok: false, raison: "Pas de devis : le plan du portail manque." };
  if (R.alertes && R.alertes.length) return { ok: false, raison: `Pas de devis : ${R.alertes[0]}` };
  if (!postes || !postes.length) return { ok: false, raison: "Pas de devis : le prix du portail manque." };
  const c = R.config, date = dsDate(infos.date);
  const estimation = nature === "estimation";
  // reception : « pose » (l'atelier livre et pose), « transporteur » ou « retrait » (sans pose). livraison : le montant de la livraison
  // par transporteur, s'il est connu (le site le calcule d'après le colis) : il devient une ligne du devis.
  const sansPose = reception === "transporteur" || reception === "retrait";
  const recep = sansPose ? reception : "pose";
  const nomModele = en ? (DP_EN.modeles[c.modele] || "Gate") : (typeof PT_MODELES !== "undefined" && PT_MODELES[c.modele] ? PT_MODELES[c.modele].nom : "Portail");
  const acier = c.mat === "acier";
  const couleurs = en ? DP_EN.couleurs : DP_COULEURS, couleur = couleurs[c.couleur] || (acier ? couleurs.noir : couleurs.anthracite);
  const nbV = R.dims.vantaux.length;
  const vantauxTxt = nbV > 1 ? L(`${nbV} vantaux de ${R.dims.vantaux.map(dsMm).join(" + ")} mm`, `${nbV} leaves of ${R.dims.vantaux.map(dsMm).join(" + ")} mm`) : L(`1 vantail de ${dsMm(R.dims.vantaux[0])} mm`, `1 leaf of ${dsMm(R.dims.vantaux[0])} mm`);
  const sensTxt = c.type === "coulissant" ? L(`il se range vers la ${c.sens === "droite" ? "droite" : "gauche"}, vu de la rue`, `it slides to the ${c.sens === "droite" ? "right" : "left"}, seen from the street`)
    : nbV === 1 ? L(`gonds à ${c.sens === "droite" ? "droite" : "gauche"}, vu de la rue`, `hinges on the ${c.sens === "droite" ? "right" : "left"}, seen from the street`) : L("s'ouvre vers la propriété", "opens into the property");
  const M = R.moteurs && c.moteur ? R.moteurs.choisi : null;
  const decorPieces = R.quant && R.quant.decor ? R.quant.decor.pieces.length : 0;
  const montant = (cle) => { const p = postes.find((x) => x.cle === cle); return p ? Math.round(p.montant * 100) / 100 : 0; };

  // --- Les lignes, dans l'ordre du cahier des charges (§5.3) ; une ligne vide est omise ---
  const titre = L(`${nomModele} ${nbV > 1 ? `${nbV} vantaux` : c.type === "coulissant" ? (c.guidage === "auto" ? "autoportant" : "sur rail") : "1 vantail"}, ${dsMm(c.P)} × ${dsMm(c.H)} mm, ${acier ? "acier galvanisé et thermolaqué" : "alu thermolaqué"} ${couleur}`,
    `${nomModele} ${nbV > 1 ? `${nbV} leaves` : c.type === "coulissant" ? (c.guidage === "auto" ? "cantilever" : "on rail") : "1 leaf"}, ${dsMm(c.P)} × ${dsMm(c.H)} mm, ${acier ? "galvanised and powder-coated steel" : "powder-coated aluminium"}, ${couleur}`);
  const designations = {
    fabrication: { d: L(`Fabrication sur mesure à l'atelier : cadre, remplissage, ${acier ? "soudure MAG" : "soudure TIG de l'alu"}`, `Made-to-measure manufacturing in the workshop: frame, infill, ${acier ? "MAG welding" : "TIG welding of the aluminium"}`), x: [vantauxTxt, L(`Poids environ ${dsNb(Math.round(R.poids))} kg`, `Weight about ${dsNb(Math.round(R.poids))} kg`)] },
    decor: { d: L("Décor de ferronnerie, soudé à l'atelier (aucun collier)", "Ironwork decoration, welded in the workshop (no clamps)"), x: [decorPieces ? L(`${decorPieces} pièces de fer forgé du commerce, reprises au gabarit`, `${decorPieces} commercial wrought-iron pieces, reworked to the template`) : ""] },
    finition: { d: acier ? L("Finition : galvanisation à chaud puis thermolaquage (duplex)", "Finish: hot-dip galvanising then powder coating (duplex)") : L("Finition : thermolaquage", "Finish: powder coating"), x: [L(`Teinte ${couleur}`, `Colour ${couleur}`)] },
    quincaillerie: { d: c.type === "coulissant" ? (c.guidage === "auto" ? L("Guidage autoportant et quincaillerie : chariots, guide, serrure, butées", "Cantilever guidance and hardware: carriages, guide, lock, stops") : L("Guidage et quincaillerie : rail, roues, guide, serrure, butées", "Guidance and hardware: rail, wheels, guide, lock, stops"))
      : L("Quincaillerie : gonds réglables adaptés au poids, serrure et cylindre, butée, arrêts", "Hardware: adjustable hinges suited to the weight, lock and cylinder, stop, catches"), x: [] },
    poteaux: { d: L(`Poteaux ${c.poteaux === "alu" ? "alu" : "acier"} (option), boulonnés sur les massifs de votre maçon`, `${c.poteaux === "alu" ? "Aluminium" : "Steel"} posts (option), bolted to your mason's footings`), x: [] },
    moteur: { d: M ? L(`Motorisation Somfy (option) : ${M.nom}${M.ref ? `, ${M.ref}` : ""}`, `Somfy motor (option): ${M.nom}${M.ref ? `, ${M.ref.replace("Pack Confort", "Comfort Pack").replace("réf.", "ref.")}` : ""}`) : L("Motorisation (option)", "Motor (option)"), x: [M && M.contenu ? (en ? (DP_EN.contenuMoteur[M.cle] || M.contenu) : M.contenu) : "", L("Mise en service : réglage des efforts, essais, déclaration CE, notice et registre d'entretien", "Commissioning: force adjustment, tests, CE declaration, manual and maintenance log")] },
    pose: { d: L("Visite de prise de cotes, plan, livraison et pose jusqu'à 45 km de Saumur", "Survey visit, drawing, delivery and fitting up to 45 km from Saumur"), x: [] },
    emballage: { d: recep === "retrait" ? L("Protection du portail laqué pour le transport dans votre véhicule", "Protection of the lacquered gate for transport in your vehicle") : L("Emballage sur palette, calage et protection du laquage", "Palletised packing, wedging and lacquer protection"), x: recep === "transporteur" ? [L("Le portail voyage debout, calé", "The gate travels upright, wedged")] : [] },
  };
  const lignes = [{ designation: titre, details: [], quantite: 1, unitaire: 0, total: 0, titre: true }];
  for (const cle of ["fabrication", "decor", "finition", "quincaillerie", "poteaux", "moteur"]) {
    const m = montant(cle);
    if (!m) continue;
    lignes.push({ designation: designations[cle].d, details: designations[cle].x.filter(Boolean), quantite: 1, unitaire: m, total: m });
  }
  if (portillon && portillon.montant > 0 && portillon.R) {
    const q = portillon.R.config;
    lignes.push({ designation: L(`Portillon assorti (option), même style : ${dsMm(q.P)} × ${dsMm(q.H)} mm, gonds à ${q.sens === "droite" ? "droite" : "gauche"} vu de la rue`, `Matching pedestrian gate (option), same style: ${dsMm(q.P)} × ${dsMm(q.H)} mm, hinges on the ${q.sens === "droite" ? "right" : "left"}, seen from the street`), details: [L("Posé le même jour que le portail : une seule visite, un seul voyage", "Fitted the same day as the gate: one visit, one trip")], quantite: 1, unitaire: portillon.montant, total: portillon.montant });
  }
  const mEmb = sansPose ? montant("emballage") : 0;
  if (mEmb) lignes.push({ designation: designations.emballage.d, details: designations.emballage.x, quantite: 1, unitaire: mEmb, total: mEmb });
  const mPose = sansPose ? 0 : montant("pose");
  if (sansPose && recep === "transporteur" && Number(livraison) > 0) lignes.push({ designation: `${L("Livraison par transporteur", "Carrier delivery")}${dsLieu(infos.chantier) ? ` — ${dsLieu(infos.chantier)}` : ""}`, details: [L("D'après le poids et les dimensions du colis", "According to the weight and dimensions of the parcel"), L("Le portail voyage debout, sur palette", "The gate travels upright, on a pallet")], quantite: 1, unitaire: Math.round(Number(livraison) * 100) / 100, total: Math.round(Number(livraison) * 100) / 100 });
  if (mPose) lignes.push({ designation: `${designations.pose.d}${dsLieu(infos.chantier) ? ` — ${dsLieu(infos.chantier)}` : ""}`, details: [L("Au-delà de 45 km, la route est comptée à part", "Beyond 45 km, the travel is charged separately")], quantite: 1, unitaire: mPose, total: mPose });
  const total = Math.round(lignes.reduce((a, l) => a + l.total, 0) * 100) / 100;

  // --- La pièce ---
  const caracteristiques = [
    { label: L("Dimensions", "Dimensions"), value: L(`Passage ${dsMm(c.P)} mm, hauteur ${dsMm(c.H)} mm · ${vantauxTxt}`, `Opening ${dsMm(c.P)} mm, height ${dsMm(c.H)} mm · ${vantauxTxt}`) },
    { label: L("Ouverture", "How it opens"), value: dpPrem(sensTxt) },
    { label: L("Forme du haut", "Top shape"), value: dpPrem((en ? DP_EN.formes : DP_FORMES)[c.forme] || c.forme) + (c.forme !== "droit" && c.fleche ? L(`, flèche ${dsMm(c.fleche)} mm`, `, rise ${dsMm(c.fleche)} mm`) : "") },
    c.soub && c.soub !== "aucun" ? { label: L("Soubassement", "Lower panel"), value: `${(en ? DP_EN.remp : DP_REMP)[c.soub] || dpPrem(c.soub)}, ${dsMm(c.hSoub)} mm` } : null,
    { label: L("Remplissage", "Infill"), value: (en ? DP_EN.remp : DP_REMP)[c.remp] || dpPrem(c.remp) },
    decorPieces ? { label: L("Décor", "Decoration"), value: L("Fer forgé, soudé à l'atelier", "Wrought iron, welded in the workshop") } : null,
    R.quant && R.quant.moulure ? { label: L("Moulures", "Mouldings"), value: L(`${R.quant.moulure.nom}, une par vantail, vissée par derrière (rien ne se voit de la rue)`, `${DP_EN.moulures[R.quant.moulure.id] || R.quant.moulure.nom}, one per leaf, screwed from behind (nothing shows from the street)`) } : null,
    { label: L("Matière et finition", "Material and finish"), value: acier ? L(`Acier galvanisé à chaud puis thermolaqué, ${couleur}`, `Hot-dip galvanised steel then powder-coated, ${couleur}`) : L(`Alu soudé TIG, thermolaqué ${couleur}`, `TIG-welded aluminium, powder-coated ${couleur}`) },
    { label: L("Fixation", "Fixing"), value: c.poteaux === "existants" ? (sansPose ? L("Sur vos piliers, gonds réglables (matière à vérifier par vous ou votre poseur)", "On your pillars, adjustable hinges (material to be checked by you or your installer)") : L("Sur vos piliers, gonds réglables (matière vérifiée à la visite)", "On your pillars, adjustable hinges (material checked at the visit)")) : L(`Poteaux ${c.poteaux} sur massifs (béton par votre maçon, d'après notre plan)`, `${c.poteaux === "alu" ? "Aluminium" : "Steel"} posts on footings (concrete by your mason, from our drawing)`) },
    { label: L("Moteur", "Motor"), value: M ? L(`${M.nom}, garantie ${M.garantie || 5} ans`, `${M.nom}, ${M.garantie || 5}-year warranty`) : L("Ouverture à la main", "Manual opening") },
    sansPose ? { label: L("Réception", "Reception"), value: recep === "transporteur" ? L("Livré par transporteur, sur palette (sans pose)", "Delivered by carrier, on a pallet (no fitting)") : L("Retrait à l'atelier, à Saumur, sur rendez-vous (sans pose)", "Collected at the workshop in Saumur, by appointment (no fitting)") } : null,
  ].filter(Boolean);

  // --- Les encarts : ce que comprend le prix, ce qu'il ne comprend pas, ce qui doit être prêt avant la pose ---
  const prerequis = (R.pose && R.pose.prerequis) || [];
  const trad = (x) => (en ? (DP_EN.prerequis[x] || x) : x);
  const encarts = [
    { titre: L("Ce que comprend le prix", "What the price includes"), lignes: sansPose ? (en ? DP_EN.comprisSansPose : DP_COMPRIS_SANS_POSE)[recep] : (en ? DP_EN.compris : DP_COMPRIS) },
    { titre: L("Ce qui n'est pas compris", "What is not included"), lignes: sansPose ? (en ? DP_EN.nonComprisSansPose.concat(DP_EN.nonCompris) : DP_NON_COMPRIS_SANS_POSE.concat(DP_NON_COMPRIS)) : (en ? DP_EN.nonCompris : DP_NON_COMPRIS) },
    sansPose
      ? { titre: L("À préparer pour la pose (par vous ou votre poseur)", "To prepare for fitting (by you or your installer)"), lignes: prerequis.filter((x) => !/décaler la pose|nous prévient/i.test(x)).map(trad) }
      : { titre: L("À préparer avant la pose", "To prepare before fitting"), lignes: prerequis.map(trad).concat([L("Nous contrôlons les supports à la pose : cotes à ± 10 mm, niveau, aplomb.", "We check the supports at fitting: dimensions within ± 10 mm, level, plumb.")]) },
  ];

  const acompte = estimation ? null : (() => {
    const a = Math.round(total * acomptePct / 100);
    return { texte: sansPose
      ? L(`Acompte de ${acomptePct} % à la signature : ${dsPrix(a)} · Solde ${recep === "retrait" ? "au retrait du portail à l'atelier" : "avant l'expédition du portail"} : ${dsPrix(total - a)}`,
          `${acomptePct} % deposit at signing: ${dsPrix(a)} · Balance ${recep === "retrait" ? "on collection of the gate at the workshop" : "before the gate is dispatched"}: ${dsPrix(total - a)}`)
      : L(`Acompte de ${acomptePct} % à la signature : ${dsPrix(a)} · Solde à la réception (procès-verbal signé), mise en service comprise : ${dsPrix(total - a)}`,
          `${acomptePct} % deposit at signing: ${dsPrix(a)} · Balance on receipt (signed acceptance report), commissioning included: ${dsPrix(total - a)}`), montant: a, solde: total - a };
  })();

  const cgv = L("Les conditions générales de vente, disponibles sur auboiacier.fr/fr/cgv, s'appliquent à toute commande.", "The terms and conditions of sale, available at auboiacier.fr/en/cgv, apply to every order.");
  const conditions = estimation ? (sansPose ? [
    L("Estimation établie à partir des cotes et des choix indiqués sur le site, sans engagement.", "Estimate based on the dimensions and choices entered on the website, without commitment."),
    L("Sans pose, il n'y a pas de visite : le portail est fabriqué aux cotes que vous avez saisies. Vérifiez-les chez vous avant de commander.", "Without fitting there is no visit: the gate is made to the dimensions you entered. Check them at home before ordering."),
    cgv,
  ] : [
    L("Estimation établie à partir des cotes et des choix indiqués sur le site, sans engagement.", "Estimate based on the dimensions and choices entered on the website, without commitment."),
    L("Le devis définitif est remis après le relevé de cotes chez vous.", "The final quote is issued after the survey at your place."),
    L("Le prix ne change que si la visite révèle : un pilier à reprendre, une différence de niveau, une pente, des réseaux enterrés, l'absence de courant ou un accès difficile.", "The price only changes if the visit reveals: a pillar to rebuild, a difference in level, a slope, buried services, no power supply or difficult access."),
    cgv,
  ]) : [
    L("Devis gratuit, établi à partir des cotes relevées chez vous et des choix indiqués ci-dessus.", "Free quote, based on the dimensions measured at your place and the choices shown above."),
    L("Prix en euros, montant total à payer ; le régime de TVA de l'atelier est rappelé sur la facture.", "Prices in euros, total amount payable; the workshop's VAT status is shown on the invoice."),
    L(`Devis valable ${DS_VALIDITE_JOURS} jours à compter de sa date.`, `Quote valid for ${DS_VALIDITE_JOURS} days from its date.`),
    sansPose
      ? L(`Un acompte de ${acomptePct} % est versé à la signature ; le solde est dû ${recep === "retrait" ? "au retrait du portail à l'atelier" : "avant l'expédition du portail"}.`, `A ${acomptePct} % deposit is paid at signing; the balance is due ${recep === "retrait" ? "on collection of the gate at the workshop" : "before the gate is dispatched"}.`)
      : L(`Un acompte de ${acomptePct} % est versé à la signature ; le solde est dû à la réception du portail, constatée par un procès-verbal signé, avec ou sans réserves.`, `A ${acomptePct} % deposit is paid at signing; the balance is due on receipt of the gate, recorded in a signed acceptance report, with or without reservations.`),
    sansPose
      ? L("Le délai court à partir de l'acompte. La pose, faite par vous ou votre poseur, n'est pas comprise : les supports (piliers, béton) sont à préparer d'après notre plan.", "The lead time starts from the deposit. Fitting, done by you or your installer, is not included: the supports (pillars, concrete) must be prepared from our drawing.")
      : L("Le délai court à partir de l'acompte, de l'accord de la déclaration préalable s'il en faut une, et du jour où ce qui est à préparer avant la pose est prêt. Si quelque chose n'est pas prêt, vous nous prévenez par mail ou par téléphone pour décaler la pose.", "The lead time starts from the deposit, from approval of the prior declaration if one is needed, and from the day everything to be prepared before fitting is ready. If something is not ready, let us know by email or phone so that the fitting can be postponed."),
    L("Portail fabriqué sur mesure, selon vos spécifications : le droit de rétractation ne s'applique pas (art. L221-28 3° du code de la consommation).", "Gate made to measure, to your specifications: the right of withdrawal does not apply (art. L221-28 3° of the French Consumer Code)."),
    sansPose
      ? L(`Garanties, à partir de ${recep === "retrait" ? "la remise du portail à l'atelier" : "la livraison"} : garantie légale de conformité (deux ans) et des vices cachés. La garantie du fabricant ne couvre pas un portail posé par un autre que nous, ni un défaut de pose.`, `Warranties, from ${recep === "retrait" ? "handover of the gate at the workshop" : "delivery"}: legal warranty of conformity (two years) and against hidden defects. The manufacturer's warranty does not cover a gate fitted by anyone other than us, nor an installation defect.`)
      : L("Garanties, à partir de la réception : garantie légale de conformité (deux ans) et des vices cachés ; garantie de parfait achèvement (un an) ; bon fonctionnement du moteur et de la quincaillerie (deux ans) ; la garantie décennale s'applique dans les limites de l'attestation de notre assureur.", "Warranties, from acceptance: legal warranty of conformity (two years) and against hidden defects; completion warranty (one year); proper operation of the motor and hardware (two years); the ten-year warranty applies within the limits of our insurer's certificate."),
    L(`Entretien : graisser les gonds et les roues une fois par an${M ? ", faire vérifier le moteur et ses sécurités chaque année (registre d'entretien)" : ""}${R.debit.some((d) => /chêne/i.test(d.mat)) ? " ; huiler le chêne chaque année (notice remise à la pose)" : ""}. Après-vente : nous contacter, nous venons sur place.`,
      `Maintenance: grease the hinges and wheels once a year${M ? ", have the motor and its safety devices checked every year (maintenance log)" : ""}${R.debit.some((d) => /chêne/i.test(d.mat)) ? "; oil the oak every year (leaflet supplied at fitting)" : ""}. After-sales: contact us, we come on site.`),
    cgv,
  ];

  const emetteur = tva === 0 ? { nom: DS_EMETTEUR.nom, lignes: DS_EMETTEUR.lignes.concat(DS_EMETTEUR.franchiseTva) } : { nom: DS_EMETTEUR.nom, lignes: DS_EMETTEUR.lignes.slice() };
  const devis = {
    nature: estimation ? "estimation" : "devis",
    titreDoc: estimation ? L("Estimation", "Estimate") : L("Devis", "Quote"),
    numero: "",
    date: dsDateLisible(date),
    validite: estimation ? null : dsDateLisible(dsPlusJours(date, DS_VALIDITE_JOURS)),
    emetteur,
    client: { nom: infos.client || undefined, adresse: infos.chantier || undefined, email: infos.email || undefined, telephone: infos.telephone || undefined },
    piece: { nom: nomModele, accroche: sansPose ? L("Fabriqué sur mesure dans notre atelier à Saumur.", "Made to measure in our workshop in Saumur.") : L("Fabriqué sur mesure dans notre atelier à Saumur, posé par nos soins.", "Made to measure in our workshop in Saumur, fitted by us."), image: null, caracteristiques },
    lignes,
    total,
    delai: sansPose ? L(DP_DELAI_SANS_POSE, DP_EN.delaiSansPose) : L(DP_DELAI, DP_EN.delai),
    delaiTexte: sansPose ? L(`${DP_DELAI_SANS_POSE}, à partir de l'acompte`, `${DP_EN.delaiSansPose}, from the deposit`) : L(`${DP_DELAI}, à partir de l'acompte et du jour où tout est prêt pour la pose ; pose au plus tard ${DP_POSE_MAX_SEMAINES} semaines après l'acompte, une fois prêt ce qui est à préparer avant la pose`, `${DP_EN.delai}, from the deposit and the day everything is ready for fitting; fitting at the latest ${DP_POSE_MAX_SEMAINES} weeks after the deposit, once what is to be prepared before fitting is ready`),
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
