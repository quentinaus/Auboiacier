// FICHIER GÉNÉRÉ par scripts/extraire-portails.mjs : NE PAS MODIFIER À LA MAIN.
// Le moteur des PORTAILS (plans/modules/plans-portails.js, tel que collé dans l'outil) : géométrie, débit, dessins, contrôles. Aucun prix.
// Source : l'outil de plans (plans-atelier.html), sha256 b86ad428f12c7971cbe66238.
/* eslint-disable */
// Plans de fabrication des portails : battant (1 ou 2 vantaux), coulissant (sur rail ou autoportant), pliant, portillon.
// Étude du 06/10/2026 avec Quentin : https://claude.ai/artifact/RvJQFroNvsu5kDhivWKu5r
//   - 4 modèles pour couvrir toutes les entrées (place derrière → battant ; place sur le côté → coulissant ; ni l'un ni
//     l'autre → pliant ; piétons → portillon) ;
//   - le portail se COMPOSE par blocs (décision de Quentin, 06/10) : forme du haut, soubassement, remplissage, décor,
//     matière, couleur. Les « styles » (Plein, Barreaux, Lames chêne, Rosace, Volutes) ne sont que des compositions toutes
//     faites (PT_STYLES) ;
//   - surtout de l'alu (Quentin soude l'alu au TIG) ; Rosace et Volutes en acier (rosaces en fonte, volutes ACHETÉES :
//     rien n'est forgé à l'atelier) ;
//   - moteur en option, posé par Quentin ; poteaux acier ou alu en option.
//
// GAUCHE / DROITE : TOUJOURS VU DE LA RUE, face au portail (ptSens, ptCourant, les trois vues). Chaque vue le rappelle en
// texte (primitive texte marquée convention: true). On n'écrit jamais « vu de la propriété ».
//
// calculerPortail(v, modele) rend la MÊME structure R que calculerGC de l'outil (plans-atelier.html) :
//   R.vues.face / cote / dessus : primitives { t: "poly" | "cercle" | "cote" | "texte" | "sol" } dessinées par dessiner() ;
//   R.debit : { nom, qte, mat, long, coupes, note } (les pièces identiques sont regroupées) ;
//   R.alertes (rouge, bloque le devis), R.avertissements (orange, à confirmer), R.oks (vert), R.notes (gris) ;
//   R.resume : [[libellé, valeur]] ; R.poids, R.dims, R.quant (mètres par profilé, surfaces, achats), R.grandeCote ;
//   R.jeux : { gonds, centre, serrure, auxGonds, course: [{ vantail, min, angle, auxGonds }], reglage } (jeux au dessin,
//     plus petit jeu côté gonds sur toute la course, jeu au droit de la platine des gonds, plage de réglage des gonds
//     sur chantier qui garde tous les jeux) ; R.visite : les relevés de la visite (null = non relevé) et ce qui manque ;
//   R.quant.gonds / poteau / massif / roues / butee / plots / finition : ce que le moteur a choisi dans les tables
//     PT_GONDS, PT_POTEAUX, PT_ROUES et PT_ATELIER (des cotes et des références, AUCUN prix).
//
// Module SANS DOM, fonctions pures, AUCUN PRIX (il pourra servir de moteur public au site).
// Tous les noms de premier niveau commencent par « pt » ou « PT_ » : aucun nom en commun avec l'outil ni les autres modules.
//   - collé dans l'IIFE de plans-atelier.html : calculerPortail(v, "ptBattant") ;
//   - chargé seul : node plans/tests/banc.mjs --seul modules/plans-portails.js ; test : node plans/tests/plans-portails.test.mjs
//
// Entrées (v), toutes facultatives (valeurs de départ entre parenthèses) :
//   ptP passage entre poteaux (3500 ; portillon 1000), ptH hauteur au poteau (1600), ptGS garde au sol (selon le modèle ;
//     coulissant sur rail : sous la roue retenue et son support, jamais moins),
//   ptVantaux "2" | "1" (battant), ptRep "egal" | "tiers" (2 vantaux inégaux), ptGuidage "rail" | "auto" (coulissant),
//   ptSens "gauche" | "droite" (vu de la rue : côté où s'ouvre le coulissant, côté des gonds du vantail seul, ou côté du
//     grand vantail des 2 vantaux inégaux),
//   ptMat "alu" | "acier", ptForme "droit" | "chapeau" | "creux" | "biais", ptFleche (150),
//   ptSoub "aucun" | "plein" | "lames" | "barreaux" (soubassement), ptHSoub hauteur du soubassement depuis le sol (500),
//   ptRemp "plein" | "lames" | "lamesAlu" | "barreaux" | "croix" | "volutes" (remplissage au-dessus),
//   ptPointes (barreaux qui dépassent, pointes de lance), ptLisse (lisse en chêne sur le dessus),
//   ptPoteaux "existants" | "acier" | "alu", ptMoteur (true/false), ptPente (mm de montée côté propriété, battant),
//   ptCouleur (texte, sans effet sur le plan), trait (scie, 3).
//   ptStyle (facultatif) : "plein" | "barreaux" | "lamesChene" | "rosace" | "volutes" remplit les blocs non donnés.
//
// Entrées de la VISITE (outil seulement, toutes facultatives). AUCUNE valeur par défaut : une entrée absente reste
// null (« non relevée »), produit une note, et le moteur ne suppose rien à sa place.
//   ptSupport "beton" | "parpaing" | "brique" | "tuffeau" | "inconnu" (matière des piliers),
//   ptPilierEtat "sain" | "fissure" | "nonArme" | "inconnu", ptPilierL largeur des piliers (mm, vue de la rue),
//   ptClairHaut, ptClairMilieu, ptClairBas : le clair entre piliers mesuré à 3 hauteurs ; le PLUS PETIT donne P,
//   ptAplombG, ptAplombD (écart d'aplomb du pilier gauche, du pilier droit, vus de la rue, mm ; ptAplomb, l'ancienne
//     entrée unique, reste lue), ptDenivele (différence de niveau entre les piliers, mm ;
//     positif : le pilier droit est plus haut, vu de la rue), ptGondBord (de l'axe du gond à l'arête côté propriété, mm),
//   ptRecoin (du gond au premier obstacle le long du mur, mm), ptVent "abrite" | "expose" | "tres",
//   ptSeuil "neuf" | "existant" (rail), ptCloture "pleine" | "ajouree" | "aucune" (le long du refoulement),
//   ptReseaux (texte : réseaux repérés, date de la réponse DT-DICT), ptAcces "oui" | "non" (le camion arrive au portail),
//   ptCourant "gauche" | "droite" | "aucun" | "inconnu" (pilier où arrive le courant, vu de la rue ; "nsp" = "inconnu").
// Un relevé illisible ou ambigu (« 3.470 » : millier ou mètres ?) ou hors de 0 à 20 000 mm reste null : rien n'est deviné.

/* ---------- Réglages d'atelier : valeurs de départ, À CONFIRMER par Quentin ---------- */

const PT_ATELIER = {
  // Jeux : décision de Quentin du 06/10/2026 (question 4) : 30 mm côté gonds, 25 au centre. Un jour entre 8 et 25 mm pince
  // les doigts (zone de danger 3 des notices Somfy Ixengo) : on reste au-dessus de 25.
  //   vantaux = (P − 2 × jeuGonds − jeuCentre) / 2, P = le plus petit clair relevé ; le demi-millimètre restant va au
  //   centre (P = 3 500 → 1 707 + 1 707, 26 au centre).
  jeuGonds: 30,              // entre le nu du pilier (ou du poteau) et le montant côté gonds, AU DESSIN
  jeuGondsMin: 25,           // contrôlé sur toute la course (de fermé à ouvert au maximum) : alerte en dessous
  jeuCentre: 25,             // entre les deux vantaux
  // Vantail seul et portillon, côté serrure : VALEUR DE L'ATELIER, à confirmer par Quentin (sa décision ne parle que des
  // gonds et du centre). Il faut être ≥ 25 ou ≤ 8 ; 8 mm laisserait le pêne et la gâche sans réglage possible (piliers
  // rarement d'aplomb), donc 25, comme le centre.
  jeuSerrure: 25,
  zonePincement: [8, 25],    // jour interdit (mm), bornes exclues
  jeuPli: 12,                // pliant : entre les deux panneaux d'un même côté (dans la zone 8-25 : voir l'avertissement)
  // Marge sous le point le plus bas d'un vantail (cahier §1 : pente et dénivelé absorbés jusqu'à garde au sol − 15).
  margeSol: 15,
  // Gonds : axe à 65 mm du nu du pilier, à 90 mm au moins de l'arête côté propriété (sinon le pilier éclate au perçage) ;
  // 2 par vantail (3 si H > 1 800) à garde au sol + 200 et à 200 sous le haut du vantail ; gond haut axe vers le bas
  // (anti-dégondage), 1 à 3 mm de jeu vertical ; gond à visser sur platine 100 × 100 (épaisseur platineEp), 4 trous à 65,
  // la platine vissée sur le nu du pilier, dans le jeu.
  //   plageNu : la plage de RÉGLAGE du gond sur chantier (55 à 68). Régler l'axe déplace le vantail : le moteur calcule la
  //   partie de cette plage qui garde tous les jeux (R.jeux.reglage) et l'écrit sur le plan pour le poseur.
  //   axeDerriere : l'axe est derrière la face arrière (côté propriété) du montant côté gonds, de quoi loger le gond femelle
  //   (Ø 36) et la tige M20 sans entrer dans le montant. HYPOTHÈSE DE L'ATELIER (axeReleve: false), à recaler sur la
  //   notice du gond retenu, comme l'épaisseur de la platine.
  gonds: { axeNu: 65, plageNu: [55, 68], areteMin: 90, axeDerriere: 20, axeReleve: false, bas: 200, haut: 200, troisAuDela: 1800, ouverture: 90, platine: 100, platineEp: 10, entraxe: 65, jeuVertical: [1, 3], femelleD: 36 },
  // Butée centrale BASSE (la butée de 77 mm au milieu du passage est retirée : on trébuche dessus). Viser 40 mm au-dessus
  // du sol fini (référence à relever). Un sabot vissé sous la traverse basse de chaque vantail descend la chercher (le
  // cahier en dit un, au droit de la butée : un par vantail, chacun doit buter, à confirmer par Quentin) : recouvrement
  // de 25 mm, donc le bas du sabot est à 15 mm du sol. l × p : encombrement au dessin (référence à relever).
  // Motorisé : selon la notice du moteur, sans basculeur.
  butee: { h: 40, recouvrement: 25, l: 100, p: 60, sabot: 40 },
  // Vantail seul et portillon : butée de fermeture côté serrure, côté rue (ou gâche à butée) : le vantail ne passe pas
  // vers la rue. Encombrement au dessin (référence à relever).
  buteeFermeture: { recouvre: 15, ep: 10, h: 60 },
  // Arrêts de vantail ouvert : sur plots de béton 250 × 250 × 400, à 200 mm du bout du vantail.
  plotArret: { l: 250, p: 250, h: 400, aBout: 200 },
  // Garde au sol (valeur de l'atelier). Coulissant sur rail : 70 au moins, et jamais moins que la roue retenue + son
  // support (roueSupport : hauteur du support sous la traverse basse, à relever sur la notice de la roue).
  gardeSol: { battant: 50, portillon: 50, pliant: 50, rail: 70, auto: 60 },
  roueSupport: 15,
  recouvrement: { guide: 100, reception: 60 },   // coulissant : derrière le poteau guide, dans la réception
  queueAuto: 0.45, queueMini: 1200, queuePas: 50,   // autoportant : la queue fait 45 % du passage (kits du commerce : 40 à 50 %)
  // Autoportant (en attendant le tableau Comunello, lot 4) : massif sous la queue = queue + 300, depuis la face extérieure
  // du pilier ; 1er chariot à 200 mm du pilier (cahier §2.4), 2e à 100 mm du bout de la queue.
  chariots: { aPilier: 200, aBout: 100, massifEnPlus: 300 },
  traverseInter: 40,         // traverse entre soubassement et remplissage
  panneauMax: 1800,          // au-delà, un montant intermédiaire coupe le vantail en panneaux
  panneauMaxLames: 1300,     // lames de chêne : appui tous les 1,30 m au plus
  videMax: 110,              // vide entre barreaux : habitude du garde-corps (boule de 110), pas une norme du portail
  lameChene: { h: 120, ep: 27, jour: 15 },
  lameAlu: { h: 100, ep: 20, jour: 20 },          // lames alu ajourées
  croixCellule: 850,         // largeur visée d'une case à croix (comme le garde-corps)
  rosaceD: 100,              // rosace de l'atelier, Ø 100 (garde-corps)
  frise: 220,                // hauteur de la frise de volutes
  pointe: { depasse: 110, h: 70 },               // barreaux qui dépassent au-dessus de la traverse haute
  // Lisse en chêne 70 × 45 posée sur la traverse haute : elle déborde DEVANT ET DERRIÈRE le cadre (70 pour 40), jamais au
  // bout du vantail (elle mangerait les jeux côté gonds, au centre et côté serrure).
  lisse: { h: 45, l: 70 },
  // Piliers existants dont la largeur ou la profondeur n'est pas relevée : dessinés à 300 mm, pour le dessin seulement.
  pilierDessin: 300,
  // Poteau à sceller : 500 mm dans le massif (400 au moins). Massif carré de côté = section du poteau + 2 × 150 (420 pour un
  // poteau de 120, 450 pour 150), 600 de profondeur (hors gel dans le 49), cage d'armature 10 × 10, trou de drainage Ø 5
  // au ras du béton, semelle commune conseillée. Variante : poteau sur platine 200 × 200 × 10, 4 tiges M16.
  scellement: 500, scellementMin: 400,
  massif: { marge: 150, prof: 600, cage: "10 × 10", drainage: 5, semelleCommune: true },
  platinePoteau: { cote: 200, ep: 10, tiges: 4, d: 16 },
  // Pièces qui vont chez le galvaniseur (acier), chez le laqueur (tout) et sur la remorque.
  //   transportMax : décision de Quentin du 07/10/2026 (« pièces jusqu'à 6 m ») : au-delà, alerte « en deux parties, sur
  //   étude ». cuveGalva (longueur × largeur × profondeur) et fourLaquage (longueur × hauteur) : valeurs courantes, À
  //   CONFIRMER chez le galvaniseur et le laqueur (releve: false) : au-delà, seulement un avertissement (rien n'est bloqué
  //   sur une valeur non relevée).
  finition: { cuveGalva: { L: 6000, l: 1500, h: 2500, releve: false }, fourLaquage: { L: 7000, h: 2200, releve: false }, transportMax: 6000, transportReleve: true },
  bornes: {
    // Pliant : 2 400 à 5 000 mm de PASSAGE TOTAL. Incohérence à lever : le kit FAC KC7101 donne sa largeur « A » de 2,00 à
    // 5,00 m, et l'étude ne dit pas si A est un côté (2 panneaux) ou le passage total. Si A est un côté, le pliant irait
    // de 4 000 à 10 000 mm de passage et presque tous ceux d'ici sortiraient du tableau FAC. Bornes gardées en passage
    // total jusqu'à la relecture de la notice FAC (le cahier ne tranche pas) : d'ici là, tout pliant porte l'avertissement
    // « à confirmer » (pas de pliant en ligne avant cette relecture).
    P: { battant: [2000, 5000], coulissant: [2000, 6000], pliant: [2400, 5000], portillon: [700, 1400] },
    H: [800, 2200],
    fleche: [0, 400],
  },
  vantailMax: { alu: 2500, acier: 2200 },        // largeur d'un vantail battant
  flecheMaxRatio: 0.25,
};

// Les gonds : choisis selon le poids du vantail (pliant : les 2 panneaux d'un côté). TABLE DE L'ATELIER, À VALIDER PAR
// QUENTIN : seul le gond M20 sur platine 100 × 100 (4 trous à 65) vient du cahier ; les autres références et toutes les
// charges admissibles PAR PAIRE sont des propositions prudentes, à relever sur la notice de chaque gond (releve: false :
// le débit écrit « référence à relever »). Au-delà du plus fort : sur étude. Sur l'alu : gonds en inox à visser sur un
// renfort, avec rondelles isolantes (pas d'acier contre l'alu). La clé de prix de chaque gond (cle) se relie dans le
// chiffrage (lot 7) : aucun nom de tarif ici.
const PT_GONDS = [
  { cle: "aluInoxM20", mat: "alu", ref: "Gond réglable inox A4 à visser, tige M20, platine 100 × 100 (4 trous à 65), rondelles isolantes", chargePaire: 120, inox: true, releve: false },
  { cle: "aluInoxM24", mat: "alu", ref: "Gond réglable inox A4 à visser, tige M24, platine 100 × 100 (4 trous à 65), rondelles isolantes", chargePaire: 200, inox: true, releve: false },
  { cle: "acierM20", mat: "acier", ref: "Gond réglable à visser, tige M20, platine 100 × 100 (4 trous à 65), gond femelle soudé avant galvanisation", chargePaire: 250, inox: false, releve: false },
  { cle: "acierAxe40", mat: "acier", ref: "Gond réglable à visser, axe Ø 40, réglage M27, platine 100 × 100 (4 trous à 65), gond femelle soudé avant galvanisation", chargePaire: 400, inox: false, releve: false },
];

// Les poteaux vendus en option : section selon la largeur et le poids du vantail qu'ils portent, et la hauteur. Tableau de
// l'atelier À VALIDER PAR QUENTIN. Hors tableau : sur étude (alerte). « pour » : les modèles qui peuvent le prendre (le
// poteau d'un coulissant porte le guide haut : jamais moins de 120). kgMax selon la matière du POTEAU.
const PT_POTEAUX = [
  { cle: "p100", profil: "poteauPetit", b: 100, pour: ["portillon"], lMax: 1200, kgMax: { alu: 60, acier: 80 }, hMax: 2000 },
  { cle: "p120", profil: "poteau", b: 120, pour: ["battant", "portillon", "pliant", "coulissant"], lMax: 2500, kgMax: { alu: 150, acier: 250 }, hMax: 2200 },
];

// Les roues du coulissant sur rail (2 roues) : choisies selon le poids du portail. Au-delà de 410 kg : sur étude.
const PT_ROUES = [
  { cle: "r80", d: 80, rail: 16, kgMax: 250 },
  { cle: "r100", d: 100, rail: 16, kgMax: 380 },
  { cle: "r120", d: 120, rail: 20, kgMax: 410 },
];

// Les profilés : section (b = face vue de la rue, e = épaisseur du portail), épaisseur de paroi (ep) ou plein.
const PT_MATIERES = {
  alu: {
    nom: "Aluminium", densite: 2.7, finition: "Thermolaquage",
    cadre: { b: 80, e: 40, ep: 2, nom: "Tube alu 80 × 40 × 2" },
    fort: { b: 80, e: 40, ep: 3, nom: "Tube alu 80 × 40 × 3" },           // montant côté gonds, traverse basse du coulissant
    inter: { b: 40, e: 40, ep: 2, nom: "Tube alu 40 × 40 × 2" },          // traverse et montants intermédiaires
    barreau: { b: 25, e: 25, ep: 2, nom: "Tube alu 25 × 25 × 2" },
    croix: { b: 25, e: 25, ep: 2, nom: "Tube alu 25 × 25 × 2" },
    volute: { b: 20, e: 6, plein: true, nom: "Plat alu 20 × 6" },
    plein: { type: "lames", h: 150, ep: 20, kgM: 1.4, nom: "Lame alu pleine 150 × 20 à emboîter" },
    poteau: { b: 120, e: 120, ep: 4, nom: "Tube alu 120 × 120 × 4" },
    poteauPetit: { b: 100, e: 100, ep: 3, nom: "Tube alu 100 × 100 × 3" },
  },
  acier: {
    nom: "Acier", densite: 7.85, finition: "Galvanisation à chaud + peinture",
    cadre: { b: 60, e: 40, ep: 2, nom: "Tube acier 60 × 40 × 2" },
    fort: { b: 60, e: 60, ep: 3, nom: "Tube acier 60 × 60 × 3" },
    inter: { b: 40, e: 40, ep: 2, nom: "Tube acier 40 × 40 × 2" },
    barreau: { b: 16, e: 16, plein: true, nom: "Carré acier plein 16 × 16" },
    croix: { b: 16, e: 16, plein: true, nom: "Carré acier plein 16 × 16" },
    volute: { b: 20, e: 6, plein: true, nom: "Fer plat 20 × 6" },
    plein: { type: "tole", ep: 2, nom: "Tôle acier 2 mm" },
    poteau: { b: 120, e: 120, ep: 4, nom: "Tube acier 120 × 120 × 4" },
    poteauPetit: { b: 100, e: 100, ep: 3, nom: "Tube acier 100 × 100 × 3" },
  },
};
const PT_CHENE = { nom: "Lame chêne 120 × 27", kgM: 0.12 * 0.027 * 700 };

// Les compositions toutes faites (« styles » de l'étude). Un bloc donné dans v passe avant le style.
const PT_STYLES = {
  plein: { nom: "Plein", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "plein", ptPointes: false, ptLisse: false },
  // Panneau composite alu déjà laqué : moins cher que les lames (décision de Quentin, 06/10 : « les deux, au choix »).
  lisse: { nom: "Lisse", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "panneau", ptPointes: false, ptLisse: false },
  barreaux: { nom: "Barreaux", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "barreaux", ptPointes: false, ptLisse: false },
  lamesChene: { nom: "Lames chêne", ptMat: "alu", ptForme: "droit", ptSoub: "aucun", ptRemp: "lames", ptPointes: false, ptLisse: false },
  rosace: { nom: "Rosace", ptMat: "acier", ptForme: "droit", ptSoub: "plein", ptHSoub: 600, ptRemp: "croix", ptPointes: false, ptLisse: true },
  volutes: { nom: "Volutes", ptMat: "acier", ptForme: "chapeau", ptFleche: 200, ptSoub: "plein", ptHSoub: 550, ptRemp: "volutes", ptPointes: true, ptLisse: false },
};

const PT_MODELES = {
  ptBattant: { type: "battant", nom: "Portail battant" },
  ptCoulissant: { type: "coulissant", nom: "Portail coulissant" },
  ptPliant: { type: "pliant", nom: "Portail pliant" },
  ptPortillon: { type: "portillon", nom: "Portillon" },
};

const PT_FINE = " ";
const ptMm = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, PT_FINE);
const ptKg = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
const ptM = (x) => (Math.round(x * 100) / 100).toFixed(2).replace(".", ",");
const ptRect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const ptChoix = (x, liste, def) => (liste.includes(x) ? x : def);
// Les espaces (y compris insécables et fines : « 3 470 ») sont retirés avant de lire le nombre.
const ptNombre = (x, def) => { const n = parseFloat(String(x ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : def; };
const ptBool = (x, def) => (x === undefined || x === null || x === "" ? def : x === true || x === "1" || x === 1 || x === "true");
// Relevés de la visite : jamais de valeur par défaut. Absent ou illisible → null (« non relevé »).
// Lecture STRICTE : le nombre entier seul (« 1 20 » → 120, « 12abc » → null) ; « 3.470 » ou « 3,470 » (millier ou mètres ?)
// est ambigu → null ; au-delà de PT_RELEVE_MAX mm → null.
const PT_RELEVE_MAX = 20000;
function ptReleve(x) {
  if (typeof x === "number") return Number.isFinite(x) && Math.abs(x) <= PT_RELEVE_MAX ? Math.round(x) : null;
  const s = String(x ?? "").replace(/\s/g, "");
  if (!/^[+-]?\d+([.,]\d+)?$/.test(s) || /^[+-]?\d{1,3}[.,]\d{3}$/.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && Math.abs(n) <= PT_RELEVE_MAX ? Math.round(n) : null;
}
const ptRelevePositif = (x) => { const n = ptReleve(x); return n !== null && n > 0 ? n : null; };
const ptReleveChoix = (x, liste, alias = {}) => { const s = alias[x] !== undefined ? alias[x] : x; return liste.includes(s) ? s : null; };

/** Poids au mètre d'un profilé (kg/m) et son périmètre (mm, pour la surface à laquer). */
function ptKgM(pr, densite) {
  if (pr.kgM) return pr.kgM;
  const aire = pr.plein ? pr.b * pr.e : 2 * (pr.b + pr.e) * pr.ep - 4 * pr.ep * pr.ep;
  return aire * densite * 1e-3;
}
const ptPerimetre = (pr) => (pr.type === "lames" ? 2 * pr.h : 2 * (pr.b + (pr.e || pr.ep || 0)));

/* ---------- 1. Les entrées : modèle, style et blocs ---------- */

function ptEntrees(v, modele) {
  v = v || {};
  const M = PT_MODELES[modele] || PT_MODELES.ptBattant;
  const st = PT_STYLES[v.ptStyle] || null;
  const pick = (k, def) => (v[k] !== undefined && v[k] !== null && v[k] !== "" ? v[k] : st && st[k] !== undefined ? st[k] : def);
  const type = M.type;
  const c = { modele: PT_MODELES[modele] ? modele : "ptBattant", type, nomModele: M.nom, style: st ? v.ptStyle : null };
  c.visite = ptVisite(v);
  const clairs = [c.visite.clairHaut, c.visite.clairMilieu, c.visite.clairBas].filter((x) => x !== null);
  c.Pdonne = Math.round(ptNombre(v.ptP, type === "portillon" ? 1000 : 3500));
  // Le plus petit clair relevé donne le passage ; sans clair relevé, on garde ptP (ou la cote de départ du configurateur).
  c.P = clairs.length ? Math.min(...clairs) : c.Pdonne;
  c.Psource = clairs.length ? "clairs" : "ptP";
  c.H = Math.round(ptNombre(v.ptH, type === "portillon" ? 1600 : 1600));
  c.nbV = type === "battant" ? (String(v.ptVantaux) === "1" ? 1 : 2) : type === "portillon" ? 1 : type === "pliant" ? 2 : 1;
  c.rep = ptChoix(v.ptRep, ["egal", "tiers"], "egal");
  c.guidage = ptChoix(v.ptGuidage, ["rail", "auto"], "rail");
  c.sens = ptChoix(v.ptSens, ["gauche", "droite"], "gauche");
  c.mat = ptChoix(pick("ptMat", "alu"), ["alu", "acier"], "alu");
  c.M = PT_MATIERES[c.mat];
  c.forme = ptChoix(pick("ptForme", "droit"), ["droit", "chapeau", "creux", "biais"], "droit");
  c.fleche = c.forme === "droit" ? 0 : Math.round(ptNombre(pick("ptFleche", 150), 150));
  c.soub = ptChoix(pick("ptSoub", "aucun"), ["aucun", "plein", "panneau", "lames", "barreaux"], "aucun");
  c.hSoub = Math.round(ptNombre(pick("ptHSoub", 500), 500));
  c.remp = ptChoix(pick("ptRemp", "plein"), ["plein", "panneau", "lames", "lamesAlu", "barreaux", "croix", "volutes"], "plein");
  c.pointes = ptBool(pick("ptPointes", false), false) && ["barreaux", "volutes"].includes(c.remp);
  c.lisse = ptBool(pick("ptLisse", false), false);
  c.poteaux = ptChoix(v.ptPoteaux, ["existants", "acier", "alu"], "existants");
  c.moteur = ptBool(v.ptMoteur, false);
  c.pente = Math.max(0, Math.round(ptNombre(v.ptPente, 0)));
  c.couleur = v.ptCouleur || (c.mat === "alu" ? "Gris anthracite (RAL 7016)" : "Noir");
  c.trait = ptNombre(v.trait, 3);
  const cleGS = type === "coulissant" ? c.guidage : type;
  c.gsDonne = v.ptGS !== undefined && v.ptGS !== null && v.ptGS !== "";
  c.gs = Math.round(ptNombre(v.ptGS, PT_ATELIER.gardeSol[cleGS]));
  return c;
}

/** Les relevés de la visite (outil seulement) : chacun vaut null tant qu'il n'est pas relevé. */
function ptVisite(v) {
  const reseaux = v.ptReseaux === undefined || v.ptReseaux === null ? "" : String(v.ptReseaux).trim().slice(0, 300);
  const recoin = ptReleve(v.ptRecoin), abs = (x) => (x === null ? null : Math.abs(x));
  // Aplomb relevé pilier par pilier (vus de la rue) ; l'ancienne entrée unique ptAplomb reste lue pour les deux.
  const aplombG = abs(ptReleve(v.ptAplombG)), aplombD = abs(ptReleve(v.ptAplombD)), aplombUn = abs(ptReleve(v.ptAplomb));
  const parPilier = [aplombG, aplombD].filter((x) => x !== null);
  return {
    support: ptReleveChoix(v.ptSupport, ["beton", "parpaing", "brique", "tuffeau", "inconnu"], { "béton": "beton" }),
    pilierEtat: ptReleveChoix(v.ptPilierEtat, ["sain", "fissure", "nonArme", "inconnu"], { "fissuré": "fissure", "non armé": "nonArme", nonarme: "nonArme" }),
    pilierL: ptRelevePositif(v.ptPilierL),
    clairHaut: ptRelevePositif(v.ptClairHaut), clairMilieu: ptRelevePositif(v.ptClairMilieu), clairBas: ptRelevePositif(v.ptClairBas),
    aplombG, aplombD,
    aplomb: parPilier.length ? Math.max(...parPilier) : aplombUn,   // le plus grand des deux
    denivele: ptReleve(v.ptDenivele),
    gondBord: ptRelevePositif(v.ptGondBord),
    recoin: recoin !== null && recoin >= 0 ? recoin : null,
    vent: ptReleveChoix(v.ptVent, ["abrite", "expose", "tres"], { "abrité": "abrite", "exposé": "expose", "très": "tres" }),
    seuil: ptReleveChoix(v.ptSeuil, ["neuf", "existant"]),
    cloture: ptReleveChoix(v.ptCloture, ["pleine", "ajouree", "aucune"], { "ajourée": "ajouree" }),
    reseaux: reseaux || null,
    acces: ptReleveChoix(v.ptAcces === true ? "oui" : v.ptAcces === false ? "non" : v.ptAcces, ["oui", "non"]),
    courant: ptReleveChoix(v.ptCourant, ["gauche", "droite", "aucun", "inconnu"], { nsp: "inconnu" }),
  };
}

// Les relevés utiles à ce portail, avec leur libellé (pour la note « non relevé »).
const PT_VISITE_NOMS = {
  clairs: "clairs entre piliers (haut, milieu, bas)", aplombG: "aplomb du pilier gauche", aplombD: "aplomb du pilier droit", denivele: "différence de niveau entre les piliers",
  vent: "exposition au vent", acces: "accès du camion", reseaux: "réseaux enterrés (DT-DICT)", support: "matière des piliers",
  pilierEtat: "état des piliers", pilierL: "largeur des piliers", gondBord: "axe du gond à l'arête", recoin: "recoin derrière le gond",
  seuil: "seuil du rail (neuf ou existant)", cloture: "clôture le long du refoulement", courant: "pilier où arrive le courant",
};
function ptVisiteManque(c) {
  const V = c.visite, piliers = c.poteaux === "existants", gonds = c.type !== "coulissant";
  const utiles = ["clairs", "denivele", "vent", "acces", "reseaux"];
  // Aplomb pilier par pilier (vus de la rue), sauf si l'ancienne entrée unique ptAplomb est donnée.
  if (!(V.aplomb !== null && V.aplombG === null && V.aplombD === null)) utiles.push("aplombG", "aplombD");
  if (piliers) utiles.push("support", "pilierEtat", "pilierL");
  if (piliers && gonds) utiles.push("gondBord");
  if (gonds) utiles.push("recoin");
  if (c.type === "coulissant") { if (c.guidage === "rail") utiles.push("seuil"); utiles.push("cloture"); }
  if (c.moteur && c.type !== "portillon") utiles.push("courant");   // le portillon n'a jamais de moteur
  return utiles.filter((k) => (k === "clairs" ? V.clairHaut === null && V.clairMilieu === null && V.clairBas === null : V[k] === null));
}

/* ---------- 2. Les vantaux : où est chaque panneau, sur quel axe il tourne ou glisse ---------- */

function ptVantaux(c) {
  const R = PT_ATELIER, P = c.P;
  if (c.type === "battant" && c.nbV === 2) {
    // vantaux = (P − 2 × jeuGonds − jeuCentre) / 2, au mm près ; le demi-millimètre restant va au centre (jamais sous 25).
    // 2 vantaux inégaux : le PETIT sert de passage piéton (serrure, poignées), le GRAND est semi-fixe (verrou au sol) ;
    // ptSens dit de quel côté est le grand vantail, vu de la rue (à gauche par défaut). Égaux : serrure à gauche.
    const utile = P - 2 * R.jeuGonds - R.jeuCentre, tiers = c.rep === "tiers";
    const grand = tiers ? Math.round(utile * 2 / 3) : Math.floor(utile / 2), petit = tiers ? utile - grand : grand;
    const grandAGauche = !tiers || c.sens !== "droite";
    const w1 = grandAGauche ? grand : petit, w2 = grandAGauche ? petit : grand;
    const a = R.jeuGonds, b = a + w1, d = P - R.jeuGonds, e = d - w2;
    return [
      { nom: tiers ? (grandAGauche ? "Grand vantail" : "Petit vantail") : "Vantail gauche", x0: a, x1: b, gonds: "gauche", serrure: !tiers || !grandAGauche, verrou: tiers && grandAGauche },
      { nom: tiers ? (grandAGauche ? "Petit vantail" : "Grand vantail") : "Vantail droit", x0: e, x1: d, gonds: "droite", serrure: tiers && grandAGauche, verrou: !tiers || !grandAGauche },
    ];
  }
  if (c.type === "battant" || c.type === "portillon") {
    const gauche = c.sens === "gauche";
    const x0 = gauche ? R.jeuGonds : R.jeuSerrure, x1 = P - (gauche ? R.jeuSerrure : R.jeuGonds);
    return [{ nom: c.type === "portillon" ? "Portillon" : "Vantail", x0, x1, gonds: c.sens, serrure: true }];
  }
  if (c.type === "pliant") {
    // Même formule par côté, puis 2 panneaux égaux au mm près ; les millimètres restants vont au centre.
    const p = Math.floor((Math.floor((P - 2 * R.jeuGonds - R.jeuCentre) / 2) - R.jeuPli) / 2), utile = 2 * p + R.jeuPli;
    const a = R.jeuGonds, d = P - R.jeuGonds;
    return [
      { nom: "Panneau gauche, côté poteau", x0: a, x1: a + p, gonds: "gauche", pli: "droite" },
      { nom: "Panneau gauche, côté centre", x0: a + p + R.jeuPli, x1: a + utile, pli: "gauche" },
      { nom: "Panneau droit, côté centre", x0: d - utile, x1: d - utile + p, pli: "droite" },
      { nom: "Panneau droit, côté poteau", x0: d - p, x1: d, gonds: "droite", pli: "gauche" },
    ];
  }
  // Coulissant : une seule pièce qui déborde derrière le poteau guide et entre dans la réception.
  const rg = R.recouvrement.guide, rr = R.recouvrement.reception;
  return c.sens === "gauche"
    ? [{ nom: "Portail coulissant", x0: -rg, x1: P + rr, coulissant: true }]
    : [{ nom: "Portail coulissant", x0: -rr, x1: P + rg, coulissant: true }];
}

/** La ligne du haut du portail, sur toute sa longueur visible : y(x). Le sommet (chapeau, biais) ou le creux est en xm :
 *  au milieu, ou entre les deux vantaux s'ils sont inégaux. */
function ptLigneHaut(c, a, b, xm = (a + b) / 2) {
  const base = c.gs + c.H, f = c.fleche;
  if (c.forme === "droit" || f <= 0) return () => base;
  if (c.forme === "biais") {
    if (c.nbV === 2 || c.type === "pliant") return (x) => base + f * (x <= xm ? (x - a) / (xm - a) : (b - x) / (b - xm));
    const versDroite = c.sens === "gauche";
    return (x) => base + f * (versDroite ? (x - a) / (b - a) : (b - x) / (b - a));
  }
  // Deux arcs de cercle de même flèche, tangents à l'horizontale au sommet (un seul arc si xm est au milieu).
  const creux = (x) => { const demi = x <= xm ? xm - a : b - xm, Rr = (demi * demi + f * f) / (2 * f); return Rr - Math.sqrt(Math.max(0, Rr * Rr - (x - xm) * (x - xm))); };
  return c.forme === "chapeau" ? (x) => base + f - creux(x) : (x) => base - f + creux(x);
}

const ptCourbe = (fn, a, b, n = 24) => { const pts = []; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts.push([x, fn(x)]); } return pts; };
const ptLongueur = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/* ---------- 3. Le dessin d'un vantail : cadre, panneaux, soubassement, remplissage ---------- */

// Une pièce du débit : { nom, mat, long, kgM, peri, coupes, note, groupe }.
function ptPiece(pieces, nom, pr, long, densite, coupes, note, groupe = "Cadre") {
  pieces.push({ nom, mat: pr.nom, long, kgM: ptKgM(pr, densite), peri: ptPerimetre(pr), coupes, note: note || "", groupe });
}

// La volute en S : deux spirales qui s'opposent, dans un rectangle w × h (acier : volute du commerce ; alu : plat cintré).
function ptVoluteS(x0, y0, w, h) {
  const R = Math.min(0.3 * w, 0.24 * h), c1 = [x0 + 0.32 * w, y0 + 0.27 * h], cx = x0 + w / 2, cy = y0 + h / 2;
  const A = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, phi = Math.PI / 2 - 2.4 * Math.PI * (1 - t), r = R * (0.14 + 0.86 * t);
    A.push([c1[0] + r * Math.cos(phi), c1[1] + r * Math.sin(phi)]);
  }
  const B = A.map(([x, y]) => [2 * cx - x, 2 * cy - y]).reverse();
  return A.concat(B);
}

// Le nom d'une pièce de remplissage : « Barreau du haut », « Barreau » (zone sans nom : jamais d'espace en trop).
const ptNomZ = (base, z, suite) => [base, z.nomZone].filter(Boolean).join(" ") + (suite ? `, ${suite}` : "");

// Remplit une zone { x0, x1, y0, haut(x) } avec un remplissage. Rend les primitives et ajoute les pièces.
function ptRemplir(c, z, remp, F, pieces, q, ctx) {
  const RG = PT_ATELIER, M = c.M, d = M.densite, w = z.x1 - z.x0;
  const hautMin = Math.min(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2));
  const contour = () => [[z.x0, z.y0], [z.x1, z.y0], ...ptCourbe(z.haut, z.x1, z.x0, 16)];
  const courbe = c.forme !== "droit" && !z.plat;
  if (remp === "panneau" && M === PT_MATIERES.alu) {
    // Panneau composite alu laqué (4 mm), tenu par des parcloses alu 20 × 20 vissées tout autour, des deux côtés.
    F.push({ t: "poly", piece: "Panneau lisse", cls: "t-mur t-panneau", pts: contour() });
    const h = (z.haut(z.x0) + z.haut(z.x1)) / 2 - z.y0, aire = w * h / 1e6;
    pieces.push({ nom: ptNomZ("Panneau", z), mat: "Panneau composite alu 4 mm laqué", long: w, larg: hautMin - z.y0, aire, kgM: 0, kg: aire * 5.5, peri: 0, coupes: courbe ? "Découpé à la forme du haut" : "Rectangle", note: "Laqué 2 faces, film retiré à la pose", groupe: "Remplissage", tole: true, panneau: true });
    ptPiece(pieces, ptNomZ("Parclose", z), { nom: "Cornière alu 20 × 20 × 2", b: 20, e: 20, ep: 2 }, 2 * 2 * (w + h), d, "Coupes droites, vissée", "Deux côtés, tout autour", "Remplissage");
    return;
  }
  if (remp === "plein" || remp === "panneau") {
    if (M.plein.type === "tole") {
      F.push({ t: "poly", piece: "Tôle de remplissage", cls: "t-mur t-panneau", pts: contour() });
      const aire = (w * ((z.haut(z.x0) + z.haut(z.x1)) / 2 - z.y0)) / 1e6;
      pieces.push({ nom: ptNomZ("Tôle", z), mat: M.plein.nom, long: w, larg: hautMin - z.y0, aire, kgM: 0, kg: aire * M.plein.ep * d, peri: 0, coupes: courbe ? "Découpée à la forme du haut" : "Rectangle", note: "", groupe: "Remplissage", tole: true });
      q.soudureM += 2 * (w + hautMin - z.y0) / 1000 * 0.25;   // points de soudure espacés : un quart du tour
    } else {
      F.push({ t: "poly", piece: "Lames de remplissage", cls: "t-mur t-panneau", pts: contour() });
      const n = Math.ceil((hautMin - z.y0) / M.plein.h);
      for (let i = 1; i < n; i++) { const y = z.y0 + i * M.plein.h; F.push({ t: "poly", cls: "t-acier t-joint", ouvert: true, pts: [[z.x0, y], [z.x1, y]] }); }
      const nCoupe = courbe ? Math.ceil((Math.max(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2)) - z.y0) / M.plein.h) - n + 1 : 0;
      for (let i = 0; i < n - (nCoupe ? 1 : 0); i++) ptPiece(pieces, ptNomZ("Lame pleine", z), M.plein, w, d, "Coupe droite, emboîtée", "", "Remplissage");
      for (let i = 0; i < nCoupe; i++) ptPiece(pieces, ptNomZ("Lame pleine", z, "découpée en courbe"), M.plein, w, d, "Découpée à la forme du haut", "", "Remplissage");
    }
    return;
  }
  if (remp === "lames" || remp === "lamesAlu") {
    const L = remp === "lames" ? RG.lameChene : RG.lameAlu;
    const pr = remp === "lames" ? { nom: PT_CHENE.nom, kgM: PT_CHENE.kgM, b: L.h, e: L.ep } : { nom: "Lame alu 100 × 20", b: 100, e: 20, ep: 2 };
    const cls = remp === "lames" ? "t-bois" : "t-acier-plein";
    const pas = L.h + L.jour, hautMax = Math.max(z.haut(z.x0), z.haut(z.x1), z.haut((z.x0 + z.x1) / 2));
    for (let y = z.y0 + L.jour; y + 40 <= hautMax; y += pas) {
      const yHaut = y + L.h;
      if (yHaut <= hautMin + 1) { F.push({ t: "poly", piece: remp === "lames" ? "Lames de chêne" : "Lames alu", cls, pts: ptRect(z.x0, y, z.x1, yHaut) }); ptPiece(pieces, remp === "lames" ? ptNomZ("Lame chêne", z) : ptNomZ("Lame alu", z), pr, w, d, "Coupe droite", remp === "lames" ? "Vissée sur cornières, huile-cire" : "", "Remplissage"); continue; }
      // Lame coupée à la forme du haut : on garde ce qui est sous la ligne.
      const pts = ptCourbe((x) => Math.min(yHaut, z.haut(x)), z.x1, z.x0, 16).filter(([, yy]) => yy > y + 1);
      if (pts.length < 2) continue;
      F.push({ t: "poly", piece: remp === "lames" ? "Lames de chêne" : "Lames alu", cls, pts: [[z.x0, y], [z.x1, y], ...ptCourbe((x) => Math.max(y, Math.min(yHaut, z.haut(x))), z.x1, z.x0, 16)] });
      ptPiece(pieces, remp === "lames" ? ptNomZ("Lame chêne", z, "découpée") : ptNomZ("Lame alu", z, "découpée"), pr, w, d, "Découpée à la forme du haut", "", "Remplissage");
    }
    return;
  }
  if (remp === "barreaux" || remp === "volutes") {
    const pr = M.barreau, n = Math.max(1, Math.ceil((w - RG.videMax) / (pr.b + RG.videMax))), pas = (w - n * pr.b) / (n + 1);
    const pointes = c.pointes && z.dessus;
    const xs = [];
    for (let i = 0; i < n; i++) {
      const xa = z.x0 + pas + i * (pas + pr.b), xb = xa + pr.b, xm = (xa + xb) / 2;
      xs.push([xa, xb]);
      const yTop = pointes ? z.hautExt(xm) + RG.pointe.depasse : z.haut(xm);
      F.push({ t: "poly", piece: "Barreaux", cls: "t-acier-plein", pts: [[xa, z.y0], [xb, z.y0], [xb, yTop], [xa, yTop]] });
      if (pointes) F.push({ t: "poly", piece: "Pointes de lance", cls: "t-acier-plein", pts: [[xa - 8, yTop], [xb + 8, yTop], [xm, yTop + RG.pointe.h]] });
      ptPiece(pieces, ptNomZ("Barreau", z), pr, yTop - z.y0, d, pointes ? "Traverse haute percée, barreau traversant" : courbe ? "Haut coupé à la forme" : "Coupes droites", "", "Remplissage");
      q.soudures += pointes ? 3 : 2;
    }
    if (pointes) q.achats.pointes = (q.achats.pointes || 0) + n;
    q.vide = Math.max(q.vide || 0, pas);
    if (remp === "volutes") {
      // Frise de volutes en S sous la traverse haute, une dans chaque case.
      const hf = RG.frise, yb = z.friseY != null ? z.friseY : hautMin - hf - 10;
      const bords = [[z.x0, z.x0 + pas], ...xs.map(([, xb], i) => [xb, i + 1 < xs.length ? xs[i + 1][0] : z.x1])];
      let nv = 0;
      bords.forEach(([a, b], i) => {
        if (b - a < 60 || yb < z.y0 + 100) return;
        // Côté droit (vu de la rue) : la volute est retournée, pour que le portail soit le miroir exact de gauche à droite.
        const pts = ptVoluteS(a + 3, yb + 4, b - a - 6, hf - 4).map(([x, y]) => [z.miroir ? a + b - x : x, y]);
        F.push({ t: "poly", piece: "Volutes", cls: "t-acier t-volute", ouvert: true, pts });
        // Acier : volute du commerce (« tout commandé », décision de Quentin du 06/10/2026). Alu : plat cintré à l'atelier.
        if (c.mat === "acier") ptPiece(pieces, "Volute en S", { nom: "Volute en S achetée (fer forgé 12 × 6)", b: 12, e: 6, plein: true }, ptLongueur(pts), d, "Achetée, à souder", "Pièce de ferronnerie du commerce, soudée aux barreaux", "Décor");
        else ptPiece(pieces, "Volute en S", M.volute, ptLongueur(pts), d, "Cintrée au gabarit", "Soudée aux barreaux", "Décor");
        nv++; q.soudures += 2;
      });
      q.volutes = (q.volutes || 0) + nv;
      if (yb >= z.y0 + 100) F.push({ t: "poly", piece: "Traverse de frise", cls: "t-acier-plein", pts: ptRect(z.x0, yb - 20, z.x1, yb) }), ptPiece(pieces, "Traverse de frise (plat)", { nom: c.mat === "acier" ? "Fer plat 30 × 8" : "Plat alu 30 × 8", b: 30, e: 8, plein: true }, w, d, "Coupes droites, percée pour les barreaux", "", "Décor");
    }
    return;
  }
  if (remp === "croix") {
    const pr = M.croix, cols = Math.max(1, Math.round(w / RG.croixCellule)), mi = 30;
    const cw = (w - (cols - 1) * mi) / cols;
    for (let k = 0; k < cols; k++) {
      const a = z.x0 + k * (cw + mi), b = a + cw, ya = z.haut(a), yb = z.haut(b);
      if (k > 0) { F.push({ t: "poly", piece: "Montants des croix", cls: "t-acier-plein", pts: [[a - mi, z.y0], [a, z.y0], [a, z.haut(a)], [a - mi, z.haut(a - mi)]] }); ptPiece(pieces, ptNomZ("Montant entre croix", z), { nom: c.mat === "acier" ? "Fer plat 30 × 8" : "Plat alu 30 × 8", b: 30, e: 8, plein: true }, z.haut(a) - z.y0, d, "Coupes droites", "", "Remplissage"); }
      const e = pr.b / 2;
      F.push({ t: "poly", piece: "Croix", cls: "t-acier-plein", pts: [[a, z.y0], [a + e * 1.4, z.y0], [b, yb - e * 1.4], [b, yb], [b - e * 1.4, yb], [a, z.y0 + e * 1.4]] });
      F.push({ t: "poly", piece: "Croix", cls: "t-acier-plein", pts: [[a, ya], [a, ya - e * 1.4], [b - e * 1.4, z.y0], [b, z.y0], [b, z.y0 + e * 1.4], [a + e * 1.4, ya]] });
      // La barre entière (l'autre est en deux demi-barres) est retournée sur le côté droit : miroir exact, vu de la rue.
      const yPlein = z.miroir ? ya : yb, yDemi = z.miroir ? yb : ya;
      const L1 = Math.hypot(b - a, yPlein - z.y0), L2 = Math.hypot(b - a, yDemi - z.y0);
      ptPiece(pieces, ptNomZ("Barre de croix", z), pr, L1, d, `Coupes à ${Math.round(Math.atan2(yPlein - z.y0, b - a) * 180 / Math.PI)}°`, "", "Remplissage");
      ptPiece(pieces, ptNomZ("Demi-barre de croix", z), pr, L2 / 2, d, "Coupée au centre, contre la rosace", "", "Remplissage");
      ptPiece(pieces, ptNomZ("Demi-barre de croix", z), pr, L2 / 2, d, "Coupée au centre, contre la rosace", "", "Remplissage");
      const cx = (a + b) / 2, cy = (z.y0 + (ya + yb) / 2) / 2;
      F.push({ t: "cercle", piece: "Rosaces", cls: "t-rond", c: [cx, cy], r: RG.rosaceD / 2 });
      F.push({ t: "cercle", cls: "t-acier", c: [cx, cy], r: RG.rosaceD / 2 * 0.55 });
      q.rosaces = (q.rosaces || 0) + 1; q.soudures += 8;
    }
  }
}

function ptDessinerVantail(c, V, haut, F, pieces, q, Vn) {
  const RG = PT_ATELIER, M = c.M, d = M.densite, gs = c.gs;
  const cotéGonds = V.gonds === "gauche" ? "g" : V.gonds === "droite" ? "d" : null;
  const prG = V.coulissant ? M.cadre : cotéGonds === "g" ? M.fort : M.cadre, prD = cotéGonds === "d" ? M.fort : M.cadre;
  const bG = prG.b, bD = prD.b, bB = M.cadre.b, bH = M.cadre.b;
  const prBas = V.coulissant ? M.fort : M.cadre;
  const x0 = V.x0, x1 = V.x1, xi0 = x0 + bG, xi1 = x1 - bD;
  const hautCadre = (x) => haut(x) - bH;
  // Décor retourné sur le côté droit (vu de la rue) : vantail à gonds à droite, panneau de la moitié droite, coulissant sens droite.
  const miroir = V.coulissant ? c.sens === "droite" : V.gonds ? V.gonds === "droite" : (V.x0 + V.x1) / 2 > c.P / 2;
  // Montants (haut coupé à la forme), traverses basse et haute.
  F.push({ t: "poly", piece: "Montants", cls: "t-acier-plein", pts: [[x0, gs], [xi0, gs], [xi0, haut(xi0)], [x0, haut(x0)]] });
  F.push({ t: "poly", piece: "Montants", cls: "t-acier-plein", pts: [[xi1, gs], [x1, gs], [x1, haut(x1)], [xi1, haut(xi1)]] });
  F.push({ t: "poly", piece: "Traverse basse", cls: "t-acier-plein", pts: ptRect(xi0, gs, xi1, gs + bB) });
  const courbe = c.forme !== "droit";
  F.push({ t: "poly", piece: "Traverse haute", cls: "t-acier-plein", pts: [...ptCourbe(hautCadre, xi0, xi1), ...ptCourbe(haut, xi1, xi0)] });
  const coupeHaut = c.forme === "droit" ? "Coupes droites" : c.forme === "biais" ? "Haut coupé en biais" : "Haut coupé à la courbe";
  ptPiece(pieces, cotéGonds === "g" ? "Montant côté gonds" : V.coulissant ? "Montant" : V.pli === "gauche" ? "Montant côté pli" : "Montant de serrure", prG, haut(x0) - gs, d, coupeHaut, "", "Cadre");
  ptPiece(pieces, cotéGonds === "d" ? "Montant côté gonds" : V.coulissant ? "Montant" : V.pli === "droite" ? "Montant côté pli" : "Montant de serrure", prD, haut(x1) - gs, d, coupeHaut, "", "Cadre");
  ptPiece(pieces, V.coulissant ? "Traverse basse (porte les roues)" : "Traverse basse", prBas, xi1 - xi0, d, "Coupes droites, bouchons", "", "Cadre");
  const lh = courbe && c.forme !== "biais" ? ptLongueur(ptCourbe((x) => hautCadre(x) + bH / 2, xi0, xi1)) : Math.hypot(xi1 - xi0, haut(xi1) - haut(xi0));
  ptPiece(pieces, "Traverse haute", M.cadre, lh, d, c.forme === "chapeau" || c.forme === "creux" ? "Cintrée" : c.forme === "biais" ? "Coupes d'équerre sur la pente" : "Coupes droites, bouchons", c.forme === "chapeau" || c.forme === "creux" ? `Cintrage : flèche ${ptMm(c.fleche)} sur toute la largeur du portail` : "", "Cadre");
  q.soudures += 4;
  // Panneaux : montants intermédiaires si le vantail est long.
  const maxP = (c.remp === "lames" || c.soub === "lames") ? RG.panneauMaxLames : RG.panneauMax;
  const nP = Math.max(1, Math.ceil((xi1 - xi0) / maxP)), mi = M.inter.b;
  const wP = (xi1 - xi0 - (nP - 1) * mi) / nP;
  const ySoub = c.soub !== "aucun" ? gs + c.hSoub : null;
  // Frise de volutes à la même hauteur sur tout le vantail (sous le point le plus bas du haut).
  const friseY = Math.min(...ptCourbe(hautCadre, xi0, xi1, 12).map((p) => p[1])) - RG.frise - 10;
  for (let k = 0; k < nP; k++) {
    const a = xi0 + k * (wP + mi), b = a + wP;
    if (k > 0) {
      F.push({ t: "poly", piece: "Montants intermédiaires", cls: "t-acier-plein", pts: [[a - mi, gs + bB], [a, gs + bB], [a, hautCadre(a)], [a - mi, hautCadre(a - mi)]] });
      ptPiece(pieces, "Montant intermédiaire", M.inter, hautCadre(a - mi / 2) - gs - bB, d, courbe ? "Haut coupé à la forme" : "Coupes droites", "", "Cadre");
      q.soudures += 2;
    }
    const y0 = gs + bB;
    if (ySoub) {
      const ti = RG.traverseInter;
      F.push({ t: "poly", piece: "Traverse intermédiaire", cls: "t-acier-plein", pts: ptRect(a, ySoub, b, ySoub + ti) });
      ptPiece(pieces, "Traverse intermédiaire", M.inter, b - a, d, "Coupes droites", "", "Cadre");
      q.soudures += 2;
      ptRemplir(c, { x0: a, x1: b, y0, haut: () => ySoub, plat: true, nomZone: "du soubassement", hautExt: () => ySoub, miroir }, c.soub, F, pieces, q);
      ptRemplir(c, { x0: a, x1: b, y0: ySoub + ti, haut: hautCadre, nomZone: "du haut", dessus: true, hautExt: haut, friseY, miroir }, c.remp, F, pieces, q);
    } else {
      ptRemplir(c, { x0: a, x1: b, y0, haut: hautCadre, nomZone: "", dessus: true, hautExt: haut, friseY, miroir }, c.remp, F, pieces, q);
    }
  }
  // Lisse en chêne posée sur la traverse haute (haut droit seulement) : de bout en bout du vantail, SANS débord au bout
  // (elle mangerait les jeux) ; elle déborde seulement devant et derrière (vue de côté).
  if (c.lisse && c.forme === "droit") {
    const L = RG.lisse, yT = haut(x0);
    F.push({ t: "poly", piece: "Lisse en chêne", cls: "t-bois", pts: ptRect(x0, yT, x1, yT + L.h) });
    ptPiece(pieces, "Lisse en chêne", { nom: `Chêne ${L.l} × ${L.h}`, kgM: L.l / 1000 * L.h / 1000 * 700 }, x1 - x0, d, "Bouts arrondis, huile-cire", `Vissée par-dessous, débord de ${(L.l - M.cadre.e) / 2} mm devant et derrière, aucun au bout`, "Remplissage");
  }
  // Gonds : à garde au sol + 200 et à 200 sous le haut du vantail (3 si H > 1 800, le 3e au milieu). Vu de la rue, on voit la
  // platine sur le nu du pilier et le bras dans le jeu ; le gond femelle et son axe (à 65 du nu) sont derrière le montant.
  if (cotéGonds) {
    const G = RG.gonds, s = cotéGonds === "g" ? 1 : -1, xm = cotéGonds === "g" ? x0 : x1, nu = xm - s * RG.jeuGonds, xAxe = nu + s * G.axeNu;
    const nG = c.H > G.troisAuDela ? 3 : 2, yBas = gs + G.bas, yHaut = haut(xm) - G.haut;
    V.gondsY = Array.from({ length: nG }, (_, i) => yBas + i * (yHaut - yBas) / (nG - 1));
    for (const y of V.gondsY) {
      F.push({ t: "poly", piece: "Gonds", cls: "t-acier-plein", pts: ptRect(nu, y - G.platine / 2, nu + s * G.platineEp, y + G.platine / 2) });
      F.push({ t: "poly", piece: "Gonds", cls: "t-acier-plein", pts: ptRect(nu + s * G.platineEp, y - 15, xm, y + 15) });
      F.push({ t: "poly", piece: "Gonds", cls: "t-cache", pts: ptRect(xAxe - G.femelleD / 2, y - 45, xAxe + G.femelleD / 2, y + 45) });
    }
  }
  if (V.pli === "droite") {
    for (let i = 0; i < (c.H > 1800 ? 4 : 3); i++) {
      const y = gs + 150 + i * (c.H - 300) / ((c.H > 1800 ? 4 : 3) - 1);
      F.push({ t: "poly", piece: "Charnières de pli", cls: "t-acier-plein", pts: ptRect(x1 - 6, y - 35, x1 + PT_ATELIER.jeuPli + 6, y + 35) });
    }
  }
  // Serrure sur le montant libre (2 vantaux inégaux : sur le petit, le passage piéton), à 950 du bas, plus bas sur un
  // vantail court ; verrou au sol sur le vantail semi-fixe.
  if (!V.coulissant && !V.pli) {
    const xs = cotéGonds === "g" ? x1 - bD / 2 : x0 + bG / 2, yS = Math.min(gs + 950, haut(xs) - bH - 170);
    V.serrureY = yS;
    if (V.serrure) F.push({ t: "poly", piece: "Serrure", cls: "t-acier t-serrure", pts: ptRect(xs - 14, yS, xs + 14, yS + 150) });
    if (V.verrou) F.push({ t: "poly", piece: "Verrou du vantail fixe", cls: "t-acier t-serrure", pts: ptRect(xs - 8, 0, xs + 8, gs + 300) });
  }
}

/* ---------- 4. Les gonds et les tables : géométrie, jeu sur toute la course, choix selon le poids ---------- */

// Distance d'un point p au segment [a, b].
function ptDistSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
// Le point p est-il dans le polygone convexe pts (bord compris) ?
function ptDansPoly(p, pts) {
  let signe = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cr) < 1e-9) continue;
    if (!signe) signe = Math.sign(cr); else if (Math.sign(cr) !== signe) return false;
  }
  return true;
}
// Un point tourné de deg degrés autour de l'axe A, dans le sens trigonométrique (un vantail à gonds à gauche, vu de la
// rue, s'ouvre ainsi vers la propriété).
const ptPivote = ([x, y], [ax, ay], deg) => { const t = deg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t); return [ax + (x - ax) * co - (y - ay) * si, ay + (x - ax) * si + (y - ay) * co]; };

// Distance entre un rectangle droit o = { x0, x1, y0, y1 } (un obstacle fixe, ses coins dans Rr) et un polygone convexe
// Q (une pièce qui tourne) : 0 s'ils se touchent ou se chevauchent. Un coin « sans fin » (PT_LOIN) n'est jamais le plus
// proche : seuls les coins réels (l'arête du pilier, les coins de la platine) sont comparés aux bords de Q. Appelée des
// milliers de fois par portail : arithmétique à plat.
function ptDistRectPoly(o, Q, Rr = ptRect(o.x0, o.y0, o.x1, o.y1)) {
  const n = Q.length;
  let d = Infinity, qx0 = Infinity, qx1 = -Infinity, qy0 = Infinity, qy1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = Q[i][0], y = Q[i][1];
    const dx = x < o.x0 ? o.x0 - x : x > o.x1 ? x - o.x1 : 0, dy = y < o.y0 ? o.y0 - y : y > o.y1 ? y - o.y1 : 0;
    if (dx === 0 && dy === 0) return 0;
    const h = Math.sqrt(dx * dx + dy * dy);
    if (h < d) d = h;
    if (x < qx0) qx0 = x; if (x > qx1) qx1 = x; if (y < qy0) qy0 = y; if (y > qy1) qy1 = y;
  }
  // Les boîtes se recouvrent : un coin de l'obstacle dans Q, ou deux bords qui se croisent, et c'est 0.
  const recouvre = qx0 <= o.x1 && qx1 >= o.x0 && qy0 <= o.y1 && qy1 >= o.y0;
  for (let j = 0; j < 4; j++) {
    const r = Rr[j], reel = Math.abs(r[0]) < PT_LOIN / 2 && Math.abs(r[1]) < PT_LOIN / 2;
    if (recouvre) {
      if (reel && ptDansPoly(r, Q)) return 0;
      const r2 = Rr[(j + 1) % 4];
      for (let i = 0; i < n; i++) {
        const a = Q[i], b = Q[(i + 1) % n];
        const c1 = (b[0] - a[0]) * (r[1] - a[1]) - (b[1] - a[1]) * (r[0] - a[0]), c2 = (b[0] - a[0]) * (r2[1] - a[1]) - (b[1] - a[1]) * (r2[0] - a[0]);
        const c3 = (r2[0] - r[0]) * (a[1] - r[1]) - (r2[1] - r[1]) * (a[0] - r[0]), c4 = (r2[0] - r[0]) * (b[1] - r[1]) - (r2[1] - r[1]) * (b[0] - r[0]);
        if (c1 * c2 < 0 && c3 * c4 < 0) return 0;
      }
    }
    if (reel) for (let i = 0; i < n; i++) { const h = ptDistSegment(r, Q[i], Q[(i + 1) % n]); if (h < d) d = h; }
  }
  return d;
}
const PT_LOIN = 1e6;   // « sans fin » pour un obstacle dont un bord n'est pas relevé

/** Un vantail à gonds, ramené à son côté des gonds comme s'il était à gauche (vu de la rue) : x depuis le nu du pilier
 *  vers le passage, y depuis la face côté rue du vantail fermé vers la propriété. monde(p) rend le point dans le repère
 *  des vues (x depuis le nu du pilier gauche) : le vantail à gonds à droite est le miroir exact de celui de gauche.
 *  Le montant côté gonds (profilé « fort ») est centré sur l'épaisseur du cadre ; l'axe du gond est à axeNu du nu, à
 *  axeDerriere derrière la face arrière du montant. pieces : ce qui tourne près du pilier (le montant, et la lisse en
 *  chêne qui déborde devant et derrière) ; platine : la platine du gond, vissée sur le nu (obstacle fixe, à la hauteur
 *  des gonds seulement). decaler(d) : le même vantail réglé de d mm vers le passage (d < 0 : vers le pilier). */
function ptGeoGond(c, vt, decal = 0) {
  const G = PT_ATELIER.gonds, M = c.M, gauche = vt.gonds === "gauche";
  const e = M.cadre.e, eF = M.fort.e, jeu = (gauche ? vt.x0 : c.P - vt.x1) + decal, w = vt.x1 - vt.x0;
  const montant = { x0: jeu, x1: jeu + M.fort.b, y0: (e - eF) / 2, y1: (e + eF) / 2 };
  const axe = [G.axeNu + decal, montant.y1 + G.axeDerriere];
  const pieces = [montant];
  // La lisse : sa partie au droit du montant (plus loin, en ouvrant jusqu'à 90°, elle ne s'approche pas plus du pilier).
  if (c.lisse && c.forme === "droit") { const l = PT_ATELIER.lisse.l; pieces.push({ x0: jeu, x1: jeu + M.fort.b, y0: (e - l) / 2, y1: (e + l) / 2 }); }
  const platine = { x0: -PT_LOIN, x1: G.platineEp, y0: axe[1] - G.platine / 2, y1: axe[1] + G.platine / 2 };
  return { gauche, jeu, w, e, montant, pieces, platine, axe, cadre: ptRect(jeu, 0, jeu + w, e), monde: ([x, y]) => [gauche ? x : c.P - x, y], decaler: (d) => ptGeoGond(c, vt, decal + d) };
}

/** Le plus petit jeu entre ce qui tourne côté gonds (g.pieces, ou le seul montant) et un obstacle fixe, de fermé (0°) à
 *  ouvert au maximum, degré par degré. Obstacle par défaut : le pilier, x ≤ 0 (son nu), de g.yAvant (sa face côté rue)
 *  à yArete (son arête côté propriété). Un bord inconnu (Infinity, ou yAvant absent) est pris sans fin : le cas le plus
 *  défavorable. obst : un autre obstacle { x0, x1, y0, y1 } (la platine du gond). */
function ptJeuCourse(g, yArete, deg, obst) {
  const fin = (y, def) => (Number.isFinite(y) ? y : def);
  const o = obst || { x0: -PT_LOIN, x1: 0, y0: fin(g.yAvant, -PT_LOIN), y1: fin(yArete, PT_LOIN) }, Rr = ptRect(o.x0, o.y0, o.x1, o.y1);
  const [ax, ay] = g.axe;
  const pieces = (g.pieces || [g.montant]).map((m) => ptRect(m.x0, m.y0, m.x1, m.y1));
  const vus = new Map();
  const jeu = (a) => {
    if (vus.has(a)) return vus.get(a);
    const t = a * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
    let d = Infinity;
    for (const p of pieces) {
      d = Math.min(d, ptDistRectPoly(o, p.map(([x, y]) => [ax + (x - ax) * co - (y - ay) * si, ay + (x - ax) * si + (y - ay) * co]), Rr));
      if (d === 0) break;
    }
    vus.set(a, d);
    return d;
  };
  // Degré par degré, sans tout calculer : d'abord tous les 5°, puis chaque degré d'un intervalle où le jeu peut passer
  // sous le plus petit trouvé (en tournant de θ, un point à r de l'axe bouge de r × θ au plus).
  const rMax = Math.max(...pieces.flat().map(([x, y]) => Math.hypot(x - ax, y - ay)));
  const bornes = [];
  for (let a = 0; a < deg; a += 5) bornes.push(a);
  bornes.push(deg);
  let best = Math.min(...bornes.map(jeu));
  for (let i = 0; i + 1 < bornes.length; i++) {
    const a = bornes[i], b = bornes[i + 1];
    if ((jeu(a) + jeu(b) - rMax * (b - a) * Math.PI / 180) / 2 > best + 1e-9) continue;
    for (let k = a + 1; k < b; k++) best = Math.min(best, jeu(k));
  }
  let min = Infinity, angle = 0;
  for (const a of [...vus.keys()].sort((x, y) => x - y)) if (vus.get(a) < min - 1e-9) { min = vus.get(a); angle = a; }
  return { min, angle };
}

/** La place derrière le portail (depuis sa face côté rue) que balaie le vantail de fermé à ouvert au maximum. */
function ptPlaceDerriere(g, deg) {
  let yMax = 0;
  for (let a = 0; a <= deg; a++) for (const p of g.cadre) yMax = Math.max(yMax, ptPivote(p, g.axe, a)[1]);
  return yMax;
}

/** Le gond le moins fort qui porte kg (par paire), dans la matière du cadre ; null au-delà du plus fort (sur étude). */
const ptChoixGond = (mat, kg) => PT_GONDS.filter((x) => x.mat === mat).sort((a, b) => a.chargePaire - b.chargePaire).find((x) => x.chargePaire >= kg) || null;
/** Les roues les plus petites qui portent kg (le portail entier, 2 roues) ; null au-delà de la plus forte (sur étude). */
const ptChoixRoue = (kg) => [...PT_ROUES].sort((a, b) => a.kgMax - b.kgMax).find((x) => x.kgMax >= kg) || null;
/** La plus petite section de poteau qui porte un vantail de l mm et kg (pliant : un côté), à la hauteur H. Le poteau d'un
 *  coulissant ne porte pas le portail : seule la hauteur compte. null : hors tableau (sur étude). */
function ptChoixPoteau(type, matPoteau, H, l, kg) {
  return [...PT_POTEAUX].sort((a, b) => a.b - b.b).find((p) => p.pour.includes(type) && H <= p.hMax && (type === "coulissant" || (l <= p.lMax && kg <= p.kgMax[matPoteau]))) || null;
}

/** Les pièces qui ne passent pas chez le galvaniseur (acier), chez le laqueur ou sur la remorque (PT_ATELIER.finition).
 *  aFinir : [{ nom, dims: [3 cotes en mm], acier }]. Une pièce entre dans la cuve dans n'importe quel sens ; dans le four,
 *  elle pend (longueur × hauteur). releve : la limite est-elle relevée (alerte) ou une valeur à confirmer (avertissement) ? */
function ptFinition(aFinir) {
  const F = PT_ATELIER.finition, tri = (a) => [...a].sort((x, y) => y - x);
  const cuve = tri([F.cuveGalva.L, F.cuveGalva.l, F.cuveGalva.h]), trop = [];
  for (const p of aFinir) {
    const [a, b, e] = tri(p.dims);
    if (p.acier && (a > cuve[0] || b > cuve[1] || e > cuve[2])) trop.push({ nom: p.nom, dims: p.dims, ou: "la cuve du galvaniseur", lim: `${ptMm(F.cuveGalva.L)} × ${ptMm(F.cuveGalva.l)} × ${ptMm(F.cuveGalva.h)} mm`, releve: !!F.cuveGalva.releve });
    if (a > F.fourLaquage.L || b > F.fourLaquage.h) trop.push({ nom: p.nom, dims: p.dims, ou: "le four du laqueur", lim: `${ptMm(F.fourLaquage.L)} × ${ptMm(F.fourLaquage.h)} mm`, releve: !!F.fourLaquage.releve });
    if (a > F.transportMax) trop.push({ nom: p.nom, dims: p.dims, ou: "la remorque", lim: `${ptMm(F.transportMax)} mm de long`, releve: !!F.transportReleve });
  }
  return trop;
}

const ptMm1 = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");

/** Où sont les piliers (ou les poteaux) en profondeur, dans le repère des vues de dessus et de côté (y depuis la face
 *  côté rue du vantail fermé, vers la propriété). b : largeur vue de la rue. y0 / y1 : faces côté rue et côté propriété
 *  DESSINÉES ; yAvant / yArete : ce que le contrôle de course en sait (Infinity : inconnu, pris sans fin).
 *  - poteaux d'un portail à gonds : l'axe des gonds au milieu du poteau, pour que la platine 100 × 100 tienne dans sa face ;
 *  - poteaux d'un coulissant : centrés sur y = 0 (le portail passe derrière) ;
 *  - piliers existants : arête côté propriété = axe du gond + ptGondBord quand il est relevé ; sinon, et pour la
 *    profondeur, une valeur de dessin (PT_ATELIER.pilierDessin). La largeur relevée (ptPilierL) ne sert jamais de profondeur. */
function ptPiliers(c, prP, geos, Vi) {
  const Dp = PT_ATELIER.pilierDessin, gonds = c.type !== "coulissant" && geos.length > 0;
  if (prP) {
    const ym = gonds ? geos[0].axe[1] : 0;
    return { b: prP.b, y0: ym - prP.b / 2, y1: ym + prP.b / 2, yAvant: ym - prP.b / 2, yArete: ym + prP.b / 2, poteau: true };
  }
  const b = Vi.pilierL || Dp;
  if (gonds && Vi.gondBord !== null) {
    const y1 = geos[0].axe[1] + Vi.gondBord;
    return { b, y0: Math.min(-Dp / 2, y1 - Dp), y1, yAvant: -Infinity, yArete: y1, areteRelevee: true };
  }
  return { b, y0: -Dp / 2, y1: Dp / 2, yAvant: -Infinity, yArete: Infinity };
}

/* ---------- 5. Le calcul complet ---------- */

function calculerPortail(v, modele) {
  v = v || {};
  const c = ptEntrees(v, modele), RG = PT_ATELIER, M = c.M, G = RG.gonds, Vi = c.visite;
  const R = { vues: { face: [], cote: [], dessus: [] }, debit: [], alertes: [], avertissements: [], oks: [], notes: [], resume: [], tubes: [], acierM2: 0, poids: 0 };
  const F = R.vues.face, C = R.vues.cote, D = R.vues.dessus;
  const q = { soudures: 0, soudureM: 0, achats: {}, rosaces: 0, volutes: 0, vide: 0 };
  const cleBornes = c.type;
  const [pMin, pMax] = RG.bornes.P[cleBornes], [hMin, hMax] = RG.bornes.H;
  const piliers = c.poteaux === "existants", aGonds = c.type !== "coulissant", coul = c.type === "coulissant";
  const marge = RG.margeSol;

  // --- Contrôles des entrées ---
  if (c.P < pMin || c.P > pMax) R.alertes.push(`Passage de ${ptMm(c.P)} mm : le ${c.nomModele.toLowerCase()} se fait de ${ptMm(pMin)} à ${ptMm(pMax)} mm.`);
  if (c.H < hMin || c.H > hMax) R.alertes.push(`Hauteur de ${ptMm(c.H)} mm : de ${ptMm(hMin)} à ${ptMm(hMax)} mm.`);
  if (c.forme !== "droit" && (c.fleche < 50 || c.fleche > Math.min(RG.bornes.fleche[1], RG.flecheMaxRatio * c.H))) R.alertes.push(`Flèche de ${ptMm(c.fleche)} mm : entre 50 et ${ptMm(Math.min(RG.bornes.fleche[1], RG.flecheMaxRatio * c.H))} mm pour cette hauteur.`);
  if (c.soub !== "aucun") {
    const hHaut = c.H - c.hSoub - RG.traverseInter - M.cadre.b - (c.forme === "creux" ? c.fleche : 0);
    if (c.hSoub < 250) R.alertes.push(`Soubassement de ${ptMm(c.hSoub)} mm : 250 mm au moins.`);
    else if (hHaut < 300) R.alertes.push(`Soubassement trop haut : il reste ${ptMm(Math.max(0, hHaut))} mm pour le remplissage du haut (300 au moins).`);
  }
  if (c.lisse && c.forme !== "droit") R.alertes.push("La lisse en chêne se pose sur un haut droit seulement : choisis « droit » ou retire la lisse.");
  if (c.mat === "alu" && (c.remp === "croix" || c.remp === "volutes")) R.avertissements.push(`${c.remp === "croix" ? "Rosaces" : "Volutes"} en alu : pièces à trouver chez un fournisseur, rendu moins « fer forgé ». À confirmer.`);
  if (c.mat === "acier" && (c.remp === "panneau" || c.soub === "panneau")) R.notes.push("En acier, le panneau lisse est une tôle pleine : c'est le remplissage « plein ».");
  if (c.mat === "acier" && c.remp === "lamesAlu") R.alertes.push("Lames alu sur un cadre acier : pas de mélange (corrosion). Choisis le cadre alu ou un autre remplissage.");
  if (c.pointes && c.mat === "alu") R.avertissements.push("Pointes de lance en alu : à trouver chez un fournisseur. À confirmer.");
  if (aGonds && (G.axeNu < G.plageNu[0] || G.axeNu > G.plageNu[1] || G.axeNu <= RG.jeuGonds)) R.alertes.push(`Axe des gonds à ${ptMm(G.axeNu)} mm du nu du pilier : il doit être dans la plage du gond (${G.plageNu[0]} à ${G.plageNu[1]} mm) et au-delà du jeu de ${RG.jeuGonds}.`);
  if (!piliers && RG.scellement < RG.scellementMin) R.alertes.push(`Poteaux scellés sur ${ptMm(RG.scellement)} mm : ${ptMm(RG.scellementMin)} mm au moins dans le massif.`);
  // Le pliant n'est pas validé : bornes et tableau FAC à relire sur la notice (cahier : pas de pliant en ligne avant).
  if (c.type === "pliant") R.avertissements.push(`Pliant à confirmer : notice FAC KC7101 non relue. Bornes du pliant (${ptMm(RG.bornes.P.pliant[0])} à ${ptMm(RG.bornes.P.pliant[1])} mm de passage total) et poids du tableau FAC à aligner (la largeur A du tableau FAC est-elle un côté ou le passage total ?). Pas de pliant en ligne avant.`);

  // --- Vantaux ---
  const V = ptVantaux(c);
  const xa = Math.min(...V.map((x) => x.x0)), xb = Math.max(...V.map((x) => x.x1));
  const xm = V.length === 2 ? (V[0].x1 + V[1].x0) / 2 : (xa + xb) / 2;

  // --- Coulissant sur rail : les roues selon le poids, et la garde au sol jamais sous la roue et son support ---
  // (le poids ne dépend pas de la garde au sol : un premier dessin, jeté, le donne)
  let roue = null;
  if (coul && c.guidage === "rail") {
    const p0 = [], q0 = { soudures: 0, soudureM: 0, achats: {}, rosaces: 0, volutes: 0, vide: 0 };
    ptDessinerVantail(c, { ...V[0] }, ptLigneHaut(c, xa, xb, xm), [], p0, q0, V.length);
    roue = ptChoixRoue(p0.reduce((s, p) => s + (p.kg != null ? p.kg : p.kgM * p.long / 1000), 0));
    if (roue) {
      const gsRoue = roue.d + RG.roueSupport;
      if (!c.gsDonne) c.gs = Math.max(c.gs, gsRoue);
      else if (c.gs < gsRoue) R.alertes.push(`Garde au sol de ${ptMm(c.gs)} mm : la roue Ø ${roue.d} et son support (${RG.roueSupport} mm, à relever) montent à ${ptMm(gsRoue)} mm et entreraient dans la traverse basse. ${ptMm(gsRoue)} mm au moins.`);
    }
  }

  // --- Relevés de la visite (rien n'est supposé quand ils manquent) ---
  if (c.Psource === "clairs") {
    const cl = [["haut", Vi.clairHaut], ["milieu", Vi.clairMilieu], ["bas", Vi.clairBas]].filter(([, x]) => x !== null);
    const ptPdonne = v.ptP !== undefined && v.ptP !== null && v.ptP !== "" && c.Pdonne !== c.P;
    R.notes.push(`Passage pris au plus petit clair relevé : ${ptMm(c.P)} mm (${cl.map(([k, x]) => `${k} ${ptMm(x)}`).join(", ")})${ptPdonne ? `, au lieu des ${ptMm(c.Pdonne)} mm donnés` : ""}.`);
  }
  if (piliers && (Vi.pilierEtat === "fissure" || Vi.pilierEtat === "nonArme")) {
    const etat = Vi.pilierEtat === "fissure" ? "fissuré" : "non armé";
    if (aGonds) R.alertes.push(`Pilier ${etat} : pas de gonds dessus. Poteau devant le pilier ou reprise du pilier, sur étude (photos des piliers au dossier).`);
    else R.avertissements.push(`Pilier ${etat} : le guide haut et la réception s'y fixent. Poteau ou reprise du pilier, à voir.`);
  }
  if (piliers && aGonds && Vi.gondBord !== null) {
    if (Vi.gondBord < G.areteMin) R.alertes.push(`Axe du gond à ${ptMm(Vi.gondBord)} mm de l'arête côté propriété : ${G.areteMin} mm au moins, sinon le pilier éclate au perçage. Poteau ou platine déportée, sur étude.`);
    else R.oks.push(`Axe du gond à ${ptMm(Vi.gondBord)} mm de l'arête côté propriété (${G.areteMin} au moins).`);
  }
  if (Vi.denivele !== null && Math.abs(Vi.denivele) > c.gs - marge) R.avertissements.push(`Différence de niveau de ${ptMm(Math.abs(Vi.denivele))} mm entre les piliers : plus que la garde au sol moins ${marge} mm (${ptMm(c.gs - marge)}). ${coul ? "Reprise du sol" : "Bas du vantail en biais"}, sur devis.`);

  // --- Ligne du haut et dessin des vantaux ---
  const haut = ptLigneHaut(c, xa, xb, xm);
  const pieces = [];
  const parVantail = [];
  for (const vt of V) {
    const p0 = pieces.length;
    ptDessinerVantail(c, vt, haut, F, pieces, q, V.length);
    const kg = pieces.slice(p0).reduce((s, p) => s + (p.kg != null ? p.kg : p.kgM * p.long / 1000), 0);
    parVantail.push({ nom: vt.nom, l: vt.x1 - vt.x0, kg });
  }
  const largeurs = V.map((x) => x.x1 - x.x0);
  const vMax = Math.max(...largeurs);
  if (c.type === "battant") {
    if (vMax > RG.vantailMax[c.mat]) R.alertes.push(`Vantail de ${ptMm(vMax)} mm : trop large en ${M.nom.toLowerCase()} (${ptMm(RG.vantailMax[c.mat])} au plus). ${c.nbV === 1 ? "Passe en 2 vantaux" : "Passe en coulissant"}.`);
    else R.oks.push(`Vantail de ${ptMm(vMax)} mm : dans la limite de ${ptMm(RG.vantailMax[c.mat])} mm en ${M.nom.toLowerCase()}.`);
  }

  // --- Jeux au dessin : côté gonds 30, au centre et côté serrure 25 (jamais entre 8 et 25) ---
  const aGondsV = V.filter((x) => x.gonds), geos = aGondsV.map((vt) => ptGeoGond(c, vt));
  const centre = c.type === "battant" && c.nbV === 2 ? V[1].x0 - V[0].x1 : c.type === "pliant" ? V[2].x0 - V[1].x1 : null;
  const serrure = (c.type === "battant" && c.nbV === 1) || c.type === "portillon" ? (c.sens === "gauche" ? c.P - V[0].x1 : V[0].x0) : null;
  R.jeux = { gonds: aGonds ? RG.jeuGonds : null, centre, serrure, auxGonds: null, course: [], reglage: null };
  const [z0, z1] = RG.zonePincement;
  for (const [nom, j] of [["au centre", centre], ["côté serrure", serrure]]) if (j !== null && j > z0 && j < z1) R.alertes.push(`Jeu ${nom} de ${ptMm1(j)} mm : entre ${z0} et ${z1} mm, un doigt peut s'y pincer.`);
  if (c.type === "pliant") R.avertissements.push(`Pliant : jeu de pli de ${RG.jeuPli} mm entre les panneaux d'un côté, dans la zone de ${z0} à ${z1} mm où un doigt se pince. Protège-doigts du kit FAC ou jeu à revoir. À confirmer.`);

  // Ce que porte chaque côté à gonds : son vantail (pliant : les 2 panneaux de ce côté).
  const porte = aGondsV.map((vt) => {
    if (c.type !== "pliant") return { l: vt.x1 - vt.x0, kg: parVantail[V.indexOf(vt)].kg };
    const cote = V.filter((x) => (vt.gonds === "gauche" ? x.x1 <= c.P / 2 : x.x0 >= c.P / 2));
    return { l: Math.max(...cote.map((x) => x.x1)) - Math.min(...cote.map((x) => x.x0)), kg: cote.reduce((s, x) => s + parVantail[V.indexOf(x)].kg, 0) };
  });
  const kgPorte = porte.length ? Math.max(...porte.map((x) => x.kg)) : 0, lPorte = porte.length ? Math.max(...porte.map((x) => x.l)) : 0;

  // --- Place derrière, pente, butée centrale basse et ses sabots (2 vantaux et pliant), butée de fermeture (1 vantail) ---
  const B = RG.butee, basSabot = B.h - B.recouvrement;
  const battant2 = c.type === "battant" && c.nbV === 2, unVantail = (c.type === "battant" && c.nbV === 1) || c.type === "portillon";
  const aButee = battant2 || c.type === "pliant", sabots = aButee && c.gs > basSabot;
  const [Vg, Vd] = c.type === "pliant" ? [V[1], V[2]] : [V[0], V[1]];
  const xmB = aButee ? (Vg.x1 + Vd.x0) / 2 : null;
  let place = 0;
  if (aGonds) {
    const places = new Map();   // les deux côtés sont souvent le miroir l'un de l'autre : un seul balayage
    for (const g of geos) { const k = JSON.stringify([g.cadre, g.axe]); if (!places.has(k)) places.set(k, ptPlaceDerriere(g, G.ouverture)); }
    place = Math.max(...places.values()) + 50;
    // Garde au sol − 15 (cahier §1) ; avec des sabots, le point le plus bas au bout du vantail est le sabot (15 mm).
    if (c.pente > c.gs - marge) R.alertes.push(`Le sol monte de ${ptMm(c.pente)} mm côté propriété : au bout du vantail, il reste moins de ${marge} mm sous le bas du vantail (garde au sol ${ptMm(c.gs)}), il frotterait. Il faut un coulissant, ou des gonds à rattrapage de pente (sur devis).`);
    else if (sabots && c.pente > basSabot - marge) R.alertes.push(`Le sol monte de ${ptMm(c.pente)} mm côté propriété : au bout du vantail, il reste moins de ${marge} mm sous le sabot de butée (bas à ${basSabot} mm du sol), il buterait et le vantail ne s'ouvrirait plus. Butée escamotable sans sabot (sur devis) ou coulissant.`);
    else if (c.pente > 0) R.oks.push(`Pente côté propriété : ${ptMm(c.pente)} mm, au plus la garde au sol moins ${marge} mm (${ptMm(c.gs - marge)}).`);
    R.resume.push(["Place derrière", `${ptMm(place)} mm`]);
  }
  if (aButee) {
    // Vu de la rue, la butée est devant les vantaux ; chaque vantail (pliant : chaque panneau côté centre) a son sabot.
    if (sabots) for (const [s0, s1] of [[Vg.x1 - B.sabot, Vg.x1], [Vd.x0, Vd.x0 + B.sabot]]) F.push({ t: "poly", piece: "Sabots de butée", cls: "t-acier-plein", pts: ptRect(s0, basSabot, s1, c.gs) });
    F.push({ t: "poly", piece: "Butée centrale", cls: "t-acier-plein", pts: ptRect(xmB - B.l / 2, 0, xmB + B.l / 2, B.h) });
  }
  // Vantail seul et portillon : butée de fermeture sur le pilier côté serrure, côté rue (vue de face : devant le vantail).
  const BF = RG.buteeFermeture;
  const xBF = unVantail ? (c.sens === "gauche" ? [V[0].x1 - BF.recouvre, c.P] : [0, V[0].x0 + BF.recouvre]) : null;
  if (xBF) F.push({ t: "poly", piece: "Butée de fermeture", cls: "t-acier-plein", pts: ptRect(xBF[0], V[0].serrureY - 20 - BF.h, xBF[1], V[0].serrureY - 20) });

  // --- Gonds : choisis selon le poids ---
  let gond = null;
  if (aGonds) {
    gond = ptChoixGond(c.mat, kgPorte);
    const quoi = c.type === "pliant" ? "Côté de pliant" : c.type === "portillon" ? "Portillon" : "Vantail";
    if (!gond) {
      const fort = Math.max(...PT_GONDS.filter((x) => x.mat === c.mat).map((x) => x.chargePaire));
      R.alertes.push(`${quoi} de ${ptKg(kgPorte)} kg : plus lourd que le plus fort des gonds en ${M.nom.toLowerCase()} (${fort} kg par paire). Sur étude.`);
    } else R.oks.push(`Gonds pour ${ptKg(kgPorte)} kg : ${gond.ref} (${gond.chargePaire} kg par paire${gond.releve ? "" : ", référence et charge à relever sur la notice"}).`);
  }

  // --- Poteaux (tableau PT_POTEAUX, massif = section + 300) ou piliers ---
  let poteau = null, prP = null, massif = null;
  if (!piliers) {
    const pm = PT_MATIERES[c.poteaux];
    poteau = ptChoixPoteau(c.type, c.poteaux, c.H, lPorte, kgPorte);
    if (poteau) prP = pm[poteau.profil];
    else {
      prP = pm.poteau;
      R.alertes.push(`Poteaux : ${aGonds ? `${c.type === "pliant" ? "côté" : "vantail"} de ${ptMm(lPorte)} mm et ${ptKg(kgPorte)} kg, ` : ""}hauteur ${ptMm(c.H)} mm, hors du tableau des poteaux. Sur étude.`);
    }
    const MS = RG.massif;
    massif = { n: 2, cote: prP.b + 2 * MS.marge, prof: MS.prof, scellement: RG.scellement, scellementMin: RG.scellementMin, cage: MS.cage, drainage: MS.drainage, semelleCommune: MS.semelleCommune };
    massif.m3 = Math.round(massif.n * massif.cote * massif.cote * massif.prof / 1e6) / 1e3;
    if (aGonds && G.platine > prP.b) R.alertes.push(`Platine de gond de ${G.platine} mm sur un poteau de ${prP.b} : elle ne tient pas dans sa face. Gond à souder ou poteau plus large, sur étude.`);
  }
  const pil = ptPiliers(c, prP, geos, Vi), bP = pil.b;
  const hPost = Math.max(haut(xa), haut(xb)) + 50;
  const posts = [[-bP, 0], [c.P, c.P + bP]];
  for (const [p0, p1] of posts) {
    if (prP) {
      F.push({ t: "poly", piece: "Poteaux", cls: "t-acier-plein", pts: ptRect(p0, 0, p1, hPost) });
      F.push({ t: "poly", cls: "t-cache", pts: ptRect(p0, -RG.scellement, p1, 0) });
    } else F.push({ t: "poly", cls: "t-mur t-pilier", pts: ptRect(p0, 0, p1, hPost + 100) });
  }
  if (prP) {
    const PP = RG.platinePoteau;
    const note = `${ptMm(RG.scellement)} mm scellés (${ptMm(RG.scellementMin)} au moins) dans un massif ${ptMm(massif.cote)} × ${ptMm(massif.cote)} × ${ptMm(massif.prof)}, cage d'armature ${massif.cage}, trou de drainage Ø ${massif.drainage} au ras du béton, semelle commune conseillée (ou platine ${PP.cote} × ${PP.cote} × ${PP.ep}, ${PP.tiges} × M${PP.d})${aGonds ? " ; axe des gonds au milieu du poteau" : ""}`;
    for (let i = 0; i < 2; i++) pieces.push({ nom: "Poteau", mat: prP.nom, long: hPost + RG.scellement, kgM: ptKgM(prP, PT_MATIERES[c.poteaux].densite), peri: 4 * prP.b, coupes: "Coupe droite, chapeau soudé", note, groupe: "Poteaux" });
  } else if (Vi.pilierEtat !== "sain") R.notes.push("Piliers existants : à vérifier sur place (parpaing creux ou fissuré : ils ne tiennent pas un portail battant).");

  // --- Coulissant : rail, roues, queue de l'autoportant ---
  const Lg = coul ? V[0].x1 - V[0].x0 : 0;
  const queue = coul && c.guidage === "auto" ? Math.max(RG.queueMini, Math.ceil(RG.queueAuto * c.P / RG.queuePas) * RG.queuePas) : 0;
  const gauche = c.sens === "gauche";
  const yG = pil.y1 + 30;   // coulissant : sa face côté rue, 30 mm derrière les piliers (vues de dessus et de côté)
  if (coul) {
    const course = c.P + RG.recouvrement.reception;
    R.resume.push(["Place le long de la clôture", `${ptMm(Lg + queue)} mm`]);
    if (c.guidage === "rail") {
      const kgP = parVantail[0].kg;
      if (!roue) R.alertes.push(`Coulissant de ${ptKg(kgP)} kg : plus lourd que les roues du tableau (${Math.max(...PT_ROUES.map((x) => x.kgMax))} kg au plus). Sur étude.`);
      else R.oks.push(`Roues Ø ${roue.d} sur rail Ø ${roue.rail} : jusqu'à ${roue.kgMax} kg, pour ${ptKg(kgP)} kg ; garde au sol ${ptMm(c.gs)} (roue + support de ${RG.roueSupport} mm).`);
      const hRoue = roue ? roue.d : 90, rd = hRoue / 2;
      const railL = Lg + course;
      const r0 = gauche ? V[0].x0 - course : V[0].x0, r1 = r0 + railL;
      F.push({ t: "poly", piece: "Rail au sol", cls: "t-acier-plein", pts: ptRect(r0, -10, r1, 0) });
      for (const xr of [V[0].x0 + 300, V[0].x1 - 300]) {
        F.push({ t: "cercle", piece: "Roues", cls: "t-rond", c: [xr, rd], r: rd });
        if (c.gs > hRoue) F.push({ t: "poly", piece: "Roues", cls: "t-acier-plein", pts: ptRect(xr - 30, hRoue, xr + 30, c.gs) });   // support, sous la traverse basse
      }
      pieces.push({ nom: "Rail à sceller", mat: "Rail acier galvanisé (à gorge)", long: railL, kgM: 2.5, peri: 0, coupes: "Coupe droite", note: `${roue ? `Rail Ø ${roue.rail}, roues Ø ${roue.d} : ` : ""}scellé de niveau sur une bande de béton`, groupe: "Guidage" });
      q.achats.roues = 2; q.achats.guideHaut = 1; q.achats.butees = 3;
    } else {
      const CH = RG.chariots;
      const xq0 = gauche ? V[0].x0 - queue : V[0].x1, xq1 = gauche ? V[0].x0 : V[0].x1 + queue;
      const xe = gauche ? xq0 : xq1, xBout = gauche ? V[0].x0 : V[0].x1;
      F.push({ t: "poly", piece: "Queue de l'autoportant", cls: "t-cache", pts: ptRect(xq0, c.gs, xq1, c.gs + 120) });
      F.push({ t: "poly", piece: "Queue de l'autoportant", cls: "t-cache", ouvert: true, pts: [[xBout, haut(xBout)], [xe, c.gs + 120]] });
      F.push({ t: "texte", p: [(xq0 + xq1) / 2, c.gs + 120], txt: "derrière la clôture", pos: "sur", decal: 0.2 });
      // Les deux chariots sont sur le massif, sous la queue : le 1er à 200 mm du pilier, le 2e à 100 mm du bout de la queue.
      const xc1 = gauche ? -bP - CH.aPilier : c.P + bP + CH.aPilier, xc2 = gauche ? xq0 + CH.aBout : xq1 - CH.aBout;
      for (const xg of [xc1, xc2]) F.push({ t: "cercle", piece: "Chariots", cls: "t-cache", c: [xg, c.gs / 2], r: 25 });
      q.massifQueue = queue + CH.massifEnPlus;
      if ((gauche ? xc1 - xc2 : xc2 - xc1) < 500) R.avertissements.push(`Autoportant : les chariots ne sont qu'à ${ptMm(Math.abs(xc1 - xc2))} mm l'un de l'autre (pilier large ou queue courte). Sur étude, avec le tableau Comunello.`);
      pieces.push({ nom: "Poutre autoportante", mat: "Kit autoportant (poutre, 2 chariots, roulette, réception)", long: Lg + queue, kgM: 0, peri: 0, coupes: "Selon le kit", note: "Vissée sous la traverse basse", groupe: "Guidage", achat: true });
      pieces.push({ nom: "Traverse de queue", mat: M.cadre.nom, long: Math.hypot(queue, haut(xBout) - c.gs - 120), kgM: ptKgM(M.cadre, M.densite), peri: ptPerimetre(M.cadre), coupes: "Coupes d'onglet", note: "Diagonale de la queue", groupe: "Cadre" });
      q.achats.kitAutoportant = 1; q.achats.guideHaut = 1;
    }
    if (c.P > 5000 && c.mat === "acier") R.avertissements.push(`Coulissant acier de ${ptMm(Lg)} mm : lourd, moteur à dimensionner.`);
  }

  // --- Jeu côté gonds sur toute la course (de fermé à ouvert au maximum), au droit des platines, et réglage ---
  const r1 = (x) => Math.round(x * 10) / 10;
  // Les deux côtés à gonds sont le plus souvent le miroir l'un de l'autre : même calcul, fait une fois.
  const dejaVu = new Map(), jeuCourse = (g, ya, obst) => {
    const k = JSON.stringify([g.pieces || [g.montant], g.axe, Number.isFinite(g.yAvant) ? g.yAvant : null, Number.isFinite(ya) ? ya : null, obst || null]);
    if (!dejaVu.has(k)) dejaVu.set(k, ptJeuCourse(g, ya, G.ouverture, obst));
    return dejaVu.get(k);
  };
  geos.forEach((g, i) => {
    g.yAvant = pil.yAvant;
    const r = jeuCourse(g, pil.yArete);
    const rp = jeuCourse({ ...g, pieces: [g.montant] }, null, g.platine);
    R.jeux.course.push({ vantail: aGondsV[i].nom, min: r1(r.min), angle: r.angle, auxGonds: r1(rp.min), brut: r.min });
  });
  if (R.jeux.course.length) {
    const pire = R.jeux.course.reduce((a, b) => (b.min < a.min ? b : a));
    const hyp = G.axeReleve ? "" : ` Selon l'hypothèse de l'atelier : axe du gond à ${G.axeDerriere} mm derrière le montant, à confirmer sur la notice du gond.`;
    if (pire.min < RG.jeuGondsMin) R.alertes.push(`Jeu côté gonds de ${ptMm1(pire.min)} mm à ${pire.angle}° d'ouverture (${pire.vantail.toLowerCase()}) : moins de ${RG.jeuGondsMin} mm, un doigt peut s'y pincer. Jeu ou position de l'axe du gond à revoir.${hyp}`);
    else if (G.axeReleve) R.oks.push(`Jeu côté gonds : ${ptMm1(pire.min)} mm au plus juste, de fermé à ouvert à ${G.ouverture}° (${RG.jeuGondsMin} au moins).`);
    else R.notes.push(`Jeu côté gonds : ${ptMm1(pire.min)} mm au plus juste, de fermé à ouvert à ${G.ouverture}° (${RG.jeuGondsMin} au moins).${hyp}`);
    // La platine du gond, vissée sur le nu, est dans le jeu : au droit des gonds, il reste jeu − épaisseur de la platine.
    const aux = Math.min(...R.jeux.course.map((x) => x.auxGonds));
    R.jeux.auxGonds = aux;
    if (aux > z0 && aux < z1) R.avertissements.push(`Au droit des gonds, la platine (${G.platineEp} mm, vissée sur le nu) ne laisse que ${ptMm1(aux)} mm au montant : dans la zone de ${z0} à ${z1} mm où un doigt se pince. Platine encastrée, protège-doigts, ou jeu porté à ${RG.jeuGondsMin + G.platineEp} mm au nu : à trancher.`);
    // Réglage sur chantier : régler l'axe déplace le vantail. Vers le pilier, le jeu côté gonds baisse (au plus 1 mm par
    // mm) ; vers le passage, le centre (les deux vantaux) ou le côté serrure baisse. On garde la plage qui tient tout.
    const kMax = Math.max(0, G.axeNu - G.plageNu[0]);
    const minA = (k) => Math.min(...geos.map((g) => { const h = g.decaler(-k); h.yAvant = pil.yAvant; return jeuCourse(h, pil.yArete).min; }));
    const m0 = Math.min(...R.jeux.course.map((x) => x.brut));
    let dMin = Math.max(0, Math.min(kMax, Math.floor(m0 - RG.jeuGondsMin + 1e-9)));
    while (m0 >= RG.jeuGondsMin && dMin < kMax && minA(dMin + 1) >= RG.jeuGondsMin - 1e-9) dMin++;
    const vers = centre !== null ? Math.floor((centre - z1) / 2 + 1e-9) : serrure !== null ? serrure - z1 : Infinity;
    const dMax = Math.max(0, Math.min(G.plageNu[1] - G.axeNu, vers));
    R.jeux.reglage = { axeMin: G.axeNu - dMin, axeMax: G.axeNu + dMax, plage: [...G.plageNu] };
    R.jeux.course.forEach((x) => { delete x.brut; });
  }

  // --- Galvaniseur, laqueur, remorque : chaque pièce doit y entrer ---
  const ePiece = Math.max(M.cadre.e, M.fort.e), dessus = c.pointes ? RG.pointe.depasse + RG.pointe.h : 0;
  const aFinir = V.map((vt) => ({
    nom: vt.coulissant && queue ? "Portail coulissant avec sa queue et sa poutre" : vt.nom,
    dims: [Math.round(vt.x1 - vt.x0 + (vt.coulissant ? queue : 0)), Math.round(Math.max(...ptCourbe(haut, vt.x0, vt.x1, 12).map(([, y]) => y)) - c.gs + dessus), ePiece],
    acier: c.mat === "acier",
  }));
  if (prP) aFinir.push({ nom: "Poteau", dims: [Math.round(hPost + RG.scellement), prP.b, prP.e], acier: c.poteaux === "acier" });
  const trop = ptFinition(aFinir), tropVus = new Map();
  for (const t of trop) {
    const k = `${t.ou}|${t.dims.join("×")}`;
    if (!tropVus.has(k)) tropVus.set(k, { ...t, noms: [] });
    if (!tropVus.get(k).noms.includes(t.nom)) tropVus.get(k).noms.push(t.nom);
  }
  // Limite relevée (la remorque, décision de Quentin) : alerte. Valeur courante à confirmer (cuve, four) : avertissement.
  for (const t of tropVus.values()) {
    const quoi = `${t.noms.join(" et ")} de ${ptMm(t.dims[0])} × ${ptMm(t.dims[1])} mm : plus grand que ${t.ou} (${t.lim}`;
    if (t.releve) R.alertes.push(`${quoi}). En deux parties, sur étude.`);
    else R.avertissements.push(`${quoi}, valeur courante à confirmer). À vérifier avant le devis : en deux parties si la vraie cote est plus petite.`);
  }

  let xMin = Infinity, xMax = -Infinity;   // une boucle, pas Math.min(...xs) : un très grand portail ferait déborder la pile
  for (const p of F) for (const [x] of p.pts || (p.c ? [p.c] : [])) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; }
  F.unshift({ t: "sol", x1: xMin - 300, x2: xMax + 300 });

  // --- Cotes de la vue de face ---
  F.push({ t: "cote", a: [0, 0], b: [c.P, 0], cote: "bas", d: 1.6, txt: `passage ${ptMm(c.P)}` });
  const aDroite = coul && gauche, xH = aDroite ? xb : xa, coteH = aDroite ? "droite" : "gauche";
  F.push({ t: "cote", a: [xH, c.gs], b: [xH, haut(xH)], cote: coteH, d: 2.6, txt: ptMm(c.H) });
  F.push({ t: "cote", a: [xH, 0], b: [xH, c.gs], cote: coteH, d: 1, txt: ptMm(c.gs) });
  if (c.forme !== "droit") {
    const xs = c.forme === "biais" && !(c.nbV === 2 || c.type === "pliant") ? (haut(xa) > haut(xb) ? xa : xb) : xm;
    F.push({ t: "cote", a: [aDroite ? xb : xa, 0], b: [aDroite ? xb : xa, haut(xs)], cote: coteH, d: 4.4, txt: `${ptMm(haut(xs))} ${c.forme === "creux" ? "au milieu" : "au plus haut"}` });
  }
  if (V.length > 1) V.forEach((x) => F.push({ t: "cote", a: [x.x0, Math.max(haut(x.x0), haut(x.x1))], b: [x.x1, Math.max(haut(x.x0), haut(x.x1))], cote: "haut", d: 1, txt: ptMm(x.x1 - x.x0) }));
  else F.push({ t: "cote", a: [V[0].x0, hPost], b: [V[0].x1, hPost], cote: "haut", d: 1, txt: `${coul ? "portail " : ""}${ptMm(V[0].x1 - V[0].x0)}` });
  if (c.soub !== "aucun") F.push({ t: "cote", a: [aDroite ? xa : xb, 0], b: [aDroite ? xa : xb, c.gs + c.hSoub], cote: aDroite ? "gauche" : "droite", d: 1, txt: ptMm(c.hSoub) });
  if (queue) F.push({ t: "cote", a: [gauche ? V[0].x0 - queue : V[0].x1, 0], b: [gauche ? V[0].x0 : V[0].x1 + queue, 0], cote: "bas", d: 1.6, txt: `queue ${ptMm(queue)}` });
  F.push({ t: "texte", p: [c.P / 2, 0], txt: "Vue côté rue : gauche et droite vus de la rue", pos: "sous", decal: 5, convention: true });

  // --- Vue de dessus : la place à prévoir ---
  const plots = c.type === "battant" || c.type === "portillon";
  ptVueDessus(c, V, D, queue, pil, R, { geos, aGondsV, place, butee: aButee, xmB, plots, xBF, yG, massifQueue: q.massifQueue || 0 });
  // --- Vue de côté : coupe du vantail près du poteau gauche ---
  ptVueCote(c, C, haut, xa, pil, prP, massif, coul ? yG : 0);

  // --- Quincaillerie et moteur (achats, sans prix) ---
  const A = q.achats, nG = c.H > G.troisAuDela ? 3 : 2;   // gonds par vantail (pliant : par côté), comme dessinés
  if (c.type === "battant" || c.type === "portillon") {
    A.gonds = nG * c.nbV; A.serrure = 1; A.poignees = 1; A.arrets = c.nbV;
    if (c.nbV === 2) { A.buteeCentrale = 1; if (sabots) A.sabotsButee = 2; A.verrou = 1; }
    else A.buteeFermeture = 1;
  } else if (c.type === "pliant") {
    A.gonds = nG * 2; A.charnieresPli = (c.H > 1800 ? 4 : 3) * 2; A.roulettesBout = 2; A.guidesSol = 2; A.buteeCentrale = 1; if (sabots) A.sabotsButee = 2; A.serrure = 1; A.verrou = 1; A.poignees = 1;
    R.avertissements.push("Pliant : charnières de pli, roulettes et guides au sol à choisir chez un fournisseur. À confirmer.");
  } else { A.serrure = 1; A.poignees = 1; }
  if (c.moteur) {
    if (c.type === "battant") { A.moteur = c.nbV === 2 ? "Kit moteur 2 vérins (cellules, feu, 2 télécommandes)" : "Kit moteur 1 vérin (cellules, feu, 2 télécommandes)"; }
    else if (c.type === "coulissant") { A.moteur = "Kit moteur coulissant (cellules, feu, 2 télécommandes)"; A.cremaillereM = Math.ceil(Lg / 1000); }
    else if (c.type === "pliant") { A.moteur = "Kit moteur pour portail pliant"; R.avertissements.push("Moteur de portail pliant : kit spécial, à choisir sur devis. À confirmer."); }
    else { R.notes.push("Portillon : pas de moteur, mais une gâche électrique peut se poser (sur devis)."); }
    if (c.type !== "portillon") R.notes.push("Motorisé : pose selon NF EN 12453 (cellules, feu clignotant, réglage des efforts) ; déclaration de conformité machine (directive 2006/42/CE jusqu'au 19/01/2027, règlement (UE) 2023/1230 ensuite).");
    if (aButee) R.notes.push("Motorisé : butée centrale selon la notice du moteur, sans basculeur.");
  }
  R.notes.push("Portail : DoP et étiquette CE (NF EN 13241).");
  R.notes.push("Gauche et droite : toujours vus de la rue, face au portail (comme sur les vues).");
  R.notes.push("Ouverture toujours côté propriété : jamais sur le trottoir ni la route.");
  R.notes.push("Mairie : le plan local d'urbanisme peut fixer hauteur et couleur, et demander une déclaration préalable.");
  if (aGonds) {
    const jeux = centre !== null
      ? `${RG.jeuGonds} mm côté gonds au dessin (${RG.jeuGondsMin} au moins sur toute la course) et ${RG.jeuCentre} mm au centre (décision de Quentin du 06/10/2026)`
      : `${RG.jeuGonds} mm côté gonds au dessin (${RG.jeuGondsMin} au moins sur toute la course, décision de Quentin du 06/10/2026) et ${RG.jeuSerrure} mm côté serrure (valeur de l'atelier, à confirmer)`;
    R.notes.push(`Jeux : ${jeux} : hors de la zone de ${z0} à ${z1} mm où un doigt se pince (notice Somfy Ixengo, zone 3).`);
  }
  if (R.jeux.reglage) {
    const rg = R.jeux.reglage;
    R.notes.push(`Réglage des gonds sur chantier : axe de ${rg.axeMin} à ${rg.axeMax} mm du nu (le gond permet ${rg.plage[0]} à ${rg.plage[1]}) ; au-delà, un jeu passerait sous ${RG.jeuGondsMin} mm.`);
  }
  if (aButee) R.notes.push(`Butée centrale basse : ${B.h} mm au-dessus du sol fini (référence à relever), ${sabots ? `un sabot sous la traverse basse de chaque ${c.type === "pliant" ? "panneau côté centre" : "vantail"} (bas à ${basSabot} mm du sol ; le cahier en dit un : un par vantail, à confirmer)` : "la traverse basse vient contre elle"}. Pas de butée haute au milieu du passage.`);
  if (unVantail) R.notes.push(`Butée de fermeture sur le pilier côté serrure, côté rue (ou gâche à butée) : le ${c.type === "portillon" ? "portillon" : "vantail"} ne passe jamais vers la rue.`);
  if (plots) R.notes.push(`Arrêts de vantail ouvert sur plots de ${RG.plotArret.l} × ${RG.plotArret.p} × ${RG.plotArret.h}, à ${RG.plotArret.aBout} mm du bout du vantail.`);
  const aRelever = [];
  if (gond && !gond.releve) aRelever.push("références et charges des gonds (notice ; table à valider)");
  if (aGonds && !G.axeReleve) aRelever.push(`position de l'axe du gond (${G.axeDerriere} mm derrière le montant) et épaisseur de sa platine (${G.platineEp} mm) : notice du gond retenu`);
  if (poteau) aRelever.push("tableau des poteaux (à valider)");
  if (aButee) aRelever.push("référence de la butée centrale et de ses sabots");
  if (unVantail) aRelever.push("référence de la butée de fermeture");
  if (roue) aRelever.push(`hauteur du support de roue (${RG.roueSupport} mm : notice de la roue)`);
  const FI = RG.finition, fin = [];
  if (!FI.cuveGalva.releve) fin.push(`cuve du galvaniseur ${ptMm(FI.cuveGalva.L)} × ${ptMm(FI.cuveGalva.l)} × ${ptMm(FI.cuveGalva.h)}`);
  if (!FI.fourLaquage.releve) fin.push(`four du laqueur ${ptMm(FI.fourLaquage.L)} × ${ptMm(FI.fourLaquage.h)}`);
  if (!FI.transportReleve) fin.push(`remorque ${ptMm(FI.transportMax)}`);
  if (fin.length) aRelever.push(`${fin.join(", ")} (valeurs courantes à confirmer)`);
  if (aRelever.length) R.notes.push(`Valeurs de l'atelier à relever : ${aRelever.join(" ; ")}.`);
  R.notes.push("Profilés, gardes au sol et quincaillerie : valeurs de départ de l'étude du 06/10/2026, à confirmer par toi.");
  const manque = ptVisiteManque(c);
  if (manque.length) R.notes.push(`Visite, non relevé : ${manque.map((k) => PT_VISITE_NOMS[k]).join(", ")}. Rien n'est supposé : à mesurer sur place.`);
  if (piliers) R.notes.push(`Piliers : ${Vi.pilierL === null ? `largeur non relevée, dessinés à ${RG.pilierDessin} mm de large ; ` : ""}profondeur dessinée ${pil.areteRelevee ? `jusqu'à l'arête relevée (axe du gond + ${ptMm(Vi.gondBord)})` : `à ${RG.pilierDessin} mm`}, pour le dessin seulement (aucun calcul n'en dépend).`);
  R.visite = { ...Vi, manque };

  // --- Débit : pièces identiques regroupées ---
  const groupes = new Map();
  for (const p of pieces) {
    const k = `${p.groupe}|${p.nom}|${p.mat}|${Math.round(p.long)}|${p.coupes}`;
    if (!groupes.has(k)) groupes.set(k, { ...p, qte: 0, kgTot: 0 });
    const g = groupes.get(k);
    g.qte += 1; g.kgTot += p.kg != null ? p.kg : p.kgM * p.long / 1000;
  }
  const ordre = ["Poteaux", "Cadre", "Remplissage", "Décor", "Guidage"];
  R.debit = [...groupes.values()].sort((a, b) => ordre.indexOf(a.groupe) - ordre.indexOf(b.groupe)).map((g) => ({
    nom: g.nom, qte: g.qte, mat: g.mat, long: g.tole ? 0 : Math.round(g.long), coupes: g.tole ? `${ptMm(g.long)} × ${ptMm(g.larg)} mm, ${g.coupes.toLowerCase()}` : g.coupes, note: g.note, groupe: g.groupe,
  }));
  const ACHATS_NOMS = { gonds: "Gonds réglables", serrure: "Serrure + cylindre", poignees: "Paire de poignées", arrets: "Arrêts de vantail", buteeCentrale: "Butée centrale", sabotsButee: "Sabots de butée", buteeFermeture: "Butée de fermeture", verrou: "Verrou du vantail fixe", charnieresPli: "Charnières de pli", roulettesBout: "Roulettes de bout", guidesSol: "Guides au sol", roues: "Roues à gorge", guideHaut: "Guide haut à rouleaux", butees: "Butées (réception, fin de course)", kitAutoportant: "Kit autoportant", pointes: "Pointes de lance", cremaillereM: "Crémaillère (mètres)" };
  const rgl = R.jeux.reglage;
  const ACHATS_DETAIL = {
    gonds: () => [gond ? `${gond.ref}${gond.releve ? "" : " (référence à relever)"}` : "Gond sur étude", `Gond haut axe vers le bas (anti-dégondage), ${G.jeuVertical[0]} à ${G.jeuVertical[1]} mm de jeu ; axe à ${G.axeNu} mm du nu${rgl ? `, réglé sur chantier entre ${rgl.axeMin} et ${rgl.axeMax}` : ""}`],
    roues: () => [roue ? `Roue à gorge Ø ${roue.d} pour rail Ø ${roue.rail}` : "Roues sur étude", roue ? `Jusqu'à ${roue.kgMax} kg le portail` : ""],
    buteeCentrale: () => ["Quincaillerie", `Basse : ${B.h} mm au-dessus du sol fini (référence à relever)`],
    sabotsButee: () => ["Quincaillerie", `Un sous la traverse basse de chaque ${c.type === "pliant" ? "panneau côté centre" : "vantail"}, au droit de la butée (bas à ${basSabot} mm du sol ; un par vantail : à confirmer)`],
    buteeFermeture: () => ["Quincaillerie", "Sur le pilier côté serrure, côté rue : arrête le vantail fermé (ou gâche à butée) ; référence à relever"],
    arrets: () => ["Quincaillerie", `Sur plots de béton ${RG.plotArret.l} × ${RG.plotArret.p} × ${RG.plotArret.h}, à ${RG.plotArret.aBout} mm du bout du vantail`],
  };
  for (const [k, n] of Object.entries(A)) {
    if (k === "moteur") { R.debit.push({ nom: "Moteur", qte: 1, mat: n, long: 0, coupes: "—", note: "Option, posé par nos soins", groupe: "Achats" }); continue; }
    if (k === "kitAutoportant") continue;   // déjà dans le débit (poutre)
    const [mat, note] = ACHATS_DETAIL[k] ? ACHATS_DETAIL[k]() : ["Quincaillerie", ""];
    R.debit.push({ nom: ACHATS_NOMS[k] || k, qte: n, mat, long: 0, coupes: "—", note, groupe: "Achats" });
  }
  if (q.rosaces) R.debit.push({ nom: "Rosaces", qte: q.rosaces, mat: c.mat === "acier" ? "Rosace fonte Ø 100 (comme le garde-corps)" : "Rosace alu Ø 100 (à trouver)", long: 0, coupes: "—", note: "Soudée au croisement", groupe: "Achats" });

  // --- Quantités pour le chiffrage (aucun prix ici) ---
  const metres = {};
  let laqueM2 = 0, kg = 0, toleM2 = 0, panneauM2 = 0;
  for (const p of pieces) {
    const lm = p.long / 1000;
    if (p.panneau) { panneauM2 += p.aire; kg += p.kg; continue; }
    if (p.tole) { toleM2 += p.aire; laqueM2 += 2 * p.aire; kg += p.kg; metres[p.mat] = (metres[p.mat] || 0); continue; }
    metres[p.mat] = (metres[p.mat] || 0) + lm;
    if (p.groupe !== "Guidage" && !p.mat.startsWith("Lame chêne") && !p.mat.startsWith("Chêne")) laqueM2 += lm * p.peri / 1000;
    kg += p.kgM * lm;
  }
  const kgPortail = parVantail.reduce((s, x) => s + x.kg, 0);
  R.quant = {
    type: c.type, modele: c.modele, mat: c.mat, metres, toleM2, panneauM2, laqueM2, soudures: q.soudures, achats: A, rosaces: q.rosaces, volutes: q.volutes,
    vantaux: parVantail, queue, longueurPortail: coul ? Lg : null, massifQueue: q.massifQueue || 0, poteaux: c.poteaux, moteur: c.moteur,
    cintrage: c.forme === "chapeau" || c.forme === "creux", lisse: c.lisse && c.forme === "droit", pointes: c.pointes,
    // Ce que le moteur a choisi dans ses tables (aucun prix) :
    gonds: gond ? { cle: gond.cle, ref: gond.ref, chargePaire: gond.chargePaire, inox: gond.inox, releve: gond.releve, kgPorte: Math.round(kgPorte * 10) / 10, parVantail: nG } : null,
    poteau: poteau ? { cle: poteau.cle, b: poteau.b, profil: prP.nom } : null,
    massif,
    roues: roue ? { cle: roue.cle, d: roue.d, rail: roue.rail, kgMax: roue.kgMax, support: RG.roueSupport } : null,
    butee: aButee ? { h: B.h, sabots: sabots ? 2 : 0, basSabot: sabots ? basSabot : null } : null,
    plots: plots ? { n: c.nbV, l: RG.plotArret.l, p: RG.plotArret.p, h: RG.plotArret.h, aBout: RG.plotArret.aBout } : null,
    finition: { pieces: aFinir, trop: [...tropVus.values()].map((t) => ({ noms: t.noms, ou: t.ou, dims: t.dims, releve: t.releve })) },
  };
  R.poids = kgPortail;
  R.kg = Math.round(kg);
  R.dims = { P: c.P, H: c.H, type: c.type, vantaux: largeurs.map(Math.round), gs: c.gs, hautMax: Math.round(Math.max(...ptCourbe(haut, xa, xb).map(([, y]) => y))) };
  R.grandeCote = Math.round(Math.max(...largeurs));
  R.config = c;

  // --- Résumé ---
  const nomType = c.type === "battant" ? `Battant ${c.nbV} ${c.nbV > 1 ? "vantaux" : "vantail"}${c.nbV === 2 && c.rep === "tiers" ? ` inégaux, grand à ${c.sens === "droite" ? "droite" : "gauche"}` : ""}` : c.type === "coulissant" ? `Coulissant ${c.guidage === "rail" ? "sur rail" : "autoportant"}` : c.type === "pliant" ? "Pliant (2 × 2 panneaux)" : "Portillon";
  R.resume.unshift(["Modèle", nomType], ["Matière", `${M.nom} · ${M.finition.toLowerCase()}`], ["Vantaux", largeurs.map(ptMm).join(" + ") + " mm"]);
  R.resume.push(["Poids du portail", `≈ ${ptKg(kgPortail)} kg`]);
  if (q.vide) R.resume.push(["Vide entre barreaux", `${ptMm(q.vide)} mm`]);
  if (!R.alertes.length) R.oks.push("Toutes les cotes sont dans les limites de l'atelier.");
  return R;
}

/* ---------- 6. Vue de dessus : la place à prévoir (rue en bas, propriété en haut) ---------- */

function ptVueDessus(c, V, D, queue, pil, R, ctx) {
  const e = c.M.cadre.e, RG = PT_ATELIER, bP = pil.b;
  const coul = c.type === "coulissant", gauche = c.sens === "gauche";
  const murG = coul && gauche ? Math.max(1800, V[0].x1 - V[0].x0 + queue + 600) : 1200, murD = coul && !gauche ? Math.max(1800, V[0].x1 - V[0].x0 + queue + 600) : 1200;
  const ym = (pil.y0 + pil.y1) / 2;
  D.push({ t: "poly", cls: "t-mur", pts: ptRect(-bP - murG, ym - 100, -bP, ym + 100) });
  D.push({ t: "poly", cls: "t-mur", pts: ptRect(c.P + bP, ym - 100, c.P + bP + murD, ym + 100) });
  D.push({ t: "poly", cls: "t-acier-plein", pts: ptRect(-bP, pil.y0, 0, pil.y1) });
  D.push({ t: "poly", cls: "t-acier-plein", pts: ptRect(c.P, pil.y0, c.P + bP, pil.y1) });
  D.push({ t: "texte", p: [-bP / 2, pil.y0], txt: "gauche", pos: "sous", decal: 0.2, convention: true });
  D.push({ t: "texte", p: [c.P + bP / 2, pil.y0], txt: "droite", pos: "sous", decal: 0.2, convention: true });
  D.push({ t: "texte", p: [c.P / 2, pil.y0], txt: "Rue", pos: "sous", decal: 3.2 });
  D.push({ t: "texte", p: [c.P / 2, pil.y0], txt: "Gauche et droite : vus de la rue", pos: "sous", decal: 4.4, convention: true });
  D.push({ t: "texte", p: [c.P / 2, coul ? 1100 : ctx.place + 250], txt: "Côté propriété", pos: "sur" });
  if (coul) {
    const yG = ctx.yG, course = c.P + RG.recouvrement.reception;
    const s = gauche ? -1 : 1;
    const ferme0 = V[0].x0 - (gauche ? queue : 0), ferme1 = V[0].x1 + (gauche ? 0 : queue);
    const ouvert0 = ferme0 + s * course, ouvert1 = ferme1 + s * course;
    const zone0 = gauche ? ouvert0 : c.P, zone1 = gauche ? 0 : ouvert1;
    D.push({ t: "poly", cls: "t-bon t-zone", pts: ptRect(zone0, pil.y1, zone1, yG + e + 60) });
    D.push({ t: "poly", piece: "Portail fermé", cls: "t-acier-plein", pts: ptRect(V[0].x0, yG, V[0].x1, yG + e) });
    if (queue) D.push({ t: "poly", piece: "Queue", cls: "t-acier", pts: ptRect(gauche ? V[0].x0 - queue : V[0].x1, yG + e / 2 - 8, gauche ? V[0].x0 : V[0].x1 + queue, yG + e / 2 + 8) });
    D.push({ t: "poly", cls: "t-cache", pts: ptRect(ouvert0, yG, ouvert1, yG + e) });
    D.push({ t: "cote", a: [zone0, yG + e + 60], b: [zone1, yG + e + 60], cote: "haut", d: 1.2, txt: ptMm(zone1 - zone0) });
    D.push({ t: "texte", p: [(zone0 + zone1) / 2, yG + e + 60], txt: "place libre le long de la clôture", pos: "sur", decal: 4.6 });
    // Autoportant : le massif sous la queue, depuis la face extérieure du pilier, de la longueur de R.quant.massifQueue.
    if (c.guidage === "auto") D.push({ t: "poly", cls: "t-mur", pts: ptRect(gauche ? -bP - ctx.massifQueue : c.P + bP, yG - 40, gauche ? -bP : c.P + bP + ctx.massifQueue, yG + e + 40) });
    return;
  }
  // Battant, portillon, pliant : les vantaux tournent vers la propriété autour de l'axe des gonds (à 65 mm du nu).
  const ouv = RG.gonds.ouverture, PA = RG.plotArret, B = RG.butee, rgl = R.jeux.reglage;
  V.forEach((vt) => D.push({ t: "poly", piece: vt.nom, cls: "t-acier-plein", pts: ptRect(vt.x0, 0, vt.x1, e) }));
  ctx.geos.forEach((g) => {
    const monde = (pts) => pts.map(g.monde), arc = [];
    for (let a = 0; a <= ouv; a += 5) arc.push(ptPivote([g.jeu + g.w, 0], g.axe, a));
    D.push({ t: "poly", cls: "t-bon t-zone", pts: monde([g.axe, ...arc]) });
    if (ctx.plots) {
      const [cx, cy] = ptPivote([g.jeu + g.w - PA.aBout, e / 2], g.axe, ouv);
      D.push({ t: "poly", piece: "Plots d'arrêt", cls: "t-mur", pts: monde(ptRect(cx - PA.l / 2, cy - PA.p / 2, cx + PA.l / 2, cy + PA.p / 2)) });
    }
    D.push({ t: "poly", cls: "t-cache", pts: monde(g.cadre.map((p) => ptPivote(p, g.axe, ouv))) });
    if (c.type === "pliant") {
      // Le panneau côté centre se replie contre le panneau côté poteau, du côté du passage.
      const [ax, ay] = g.axe, x0 = ax + ay + 10;
      D.push({ t: "poly", cls: "t-cache", pts: monde(ptRect(x0, ay + g.jeu - ax + 30, x0 + e, ay + g.jeu - ax + g.w)) });
    }
    D.push({ t: "cercle", piece: "Gonds", cls: "t-rond", c: g.monde(g.axe), r: 10 });
    // Côté rue : le jeu côté gonds et l'axe du gond, cotés depuis le nu du pilier (avec la plage de réglage du poseur).
    D.push({ t: "cote", a: g.monde([0, 0]), b: g.monde([g.jeu, 0]), cote: "bas", d: 1, txt: ptMm(g.jeu) });
    D.push({ t: "cote", a: g.monde([0, g.axe[1]]), b: g.monde(g.axe), cote: "bas", d: 2.2, txt: `axe ${ptMm(g.axe[0])}${rgl ? ` (réglage ${rgl.axeMin} à ${rgl.axeMax})` : ""}` });
  });
  if (ctx.butee) D.push({ t: "poly", piece: "Butée centrale", cls: "t-acier-plein", pts: ptRect(ctx.xmB - B.l / 2, -B.p, ctx.xmB + B.l / 2, 0) });
  if (ctx.xBF) D.push({ t: "poly", piece: "Butée de fermeture", cls: "t-acier-plein", pts: ptRect(ctx.xBF[0], -RG.buteeFermeture.ep, ctx.xBF[1], 0) });
  const j = R.jeux;
  if (j.centre !== null) {
    const [a, b] = c.type === "pliant" ? [V[1].x1, V[2].x0] : [V[0].x1, V[1].x0];
    D.push({ t: "cote", a: [a, 0], b: [b, 0], cote: "bas", d: 1, txt: ptMm(j.centre) });
  }
  if (j.serrure !== null) D.push({ t: "cote", a: gauche ? [V[0].x1, 0] : [0, 0], b: gauche ? [c.P, 0] : [V[0].x0, 0], cote: "bas", d: 1, txt: ptMm(j.serrure) });
  const g0 = ctx.geos[0];
  D.push({ t: "cote", a: g0.monde([0, 0]), b: g0.monde([0, ctx.place]), cote: g0.gauche ? "gauche" : "droite", d: 1.6, txt: ptMm(ctx.place) });
  D.push({ t: "texte", p: g0.monde([g0.axe[0] + 0.45 * g0.w, g0.axe[1] + 0.3 * g0.w]), txt: "place libre", pos: "sur" });
}

/* ---------- 7. Vue de côté : coupe près du poteau gauche (rue à gauche, propriété à droite) ---------- */

// Même repère en profondeur que la vue de dessus : x de la coupe = y de la vue de dessus (yV : face côté rue du vantail,
// 0 pour un portail à gonds, derrière les piliers pour un coulissant).
function ptVueCote(c, C, haut, xa, pil, prP, massif, yV) {
  const M = c.M, e = M.cadre.e, gs = c.gs, yT = haut(xa), b = M.cadre.b, RG = PT_ATELIER;
  const ym = (pil.y0 + pil.y1) / 2;
  C.push({ t: "sol", x1: Math.min(pil.y0, yV) - 300, x2: Math.max(pil.y1, yV + e) + 300 });
  if (prP) {
    C.push({ t: "poly", cls: "t-cache", pts: ptRect(pil.y0, -RG.scellement, pil.y1, yT + 50) });
    C.push({ t: "poly", cls: "t-mur", pts: ptRect(ym - massif.cote / 2, -massif.prof, ym + massif.cote / 2, 0) });
  } else C.push({ t: "poly", cls: "t-mur t-pilier", pts: ptRect(pil.y0, 0, pil.y1, yT + 150) });
  // Le vantail, placé comme sur la vue de dessus.
  const x0 = yV, x1 = yV + e, xc = yV + e / 2;
  C.push({ t: "poly", piece: "Traverse basse", cls: "t-acier-plein", pts: ptRect(x0, gs, x1, gs + b) });
  C.push({ t: "poly", piece: "Traverse haute", cls: "t-acier-plein", pts: ptRect(x0, yT - b, x1, yT) });
  const epR = c.remp === "lames" ? RG.lameChene.ep : c.remp === "panneau" && c.mat === "alu" ? 4 : c.remp === "plein" || c.remp === "panneau" ? (M.plein.ep || 2) : c.remp === "lamesAlu" ? RG.lameAlu.ep : M.barreau.b;
  C.push({ t: "poly", piece: "Remplissage", cls: c.remp === "lames" ? "t-bois" : "t-acier-plein", pts: ptRect(xc - epR / 2, gs + b, xc + epR / 2, yT - b) });
  if (c.soub !== "aucun") C.push({ t: "poly", piece: "Traverse intermédiaire", cls: "t-acier-plein", pts: ptRect(xc - M.inter.e / 2, gs + c.hSoub, xc + M.inter.e / 2, gs + c.hSoub + RG.traverseInter) });
  if (c.lisse && c.forme === "droit") C.push({ t: "poly", piece: "Lisse en chêne", cls: "t-bois", pts: ptRect(xc - RG.lisse.l / 2, yT, xc + RG.lisse.l / 2, yT + RG.lisse.h) });
  C.push({ t: "cote", a: [x0, yT], b: [x1, yT], cote: "haut", d: 1, txt: `${e}` });
  C.push({ t: "cote", a: [x1, 0], b: [x1, gs], cote: "droite", d: 1, txt: `${gs}` });
  C.push({ t: "cote", a: [x1, gs], b: [x1, yT], cote: "droite", d: 2.4, txt: ptMm(yT - gs) });
  const xl0 = Math.min(pil.y0, massif ? ym - massif.cote / 2 : pil.y0) - 120, xl1 = Math.max(pil.y1, yV + e, massif ? ym + massif.cote / 2 : pil.y1) + 120;
  C.push({ t: "texte", p: [xl0, 0], txt: "rue", pos: "sous", decal: 0.2 });
  C.push({ t: "texte", p: [xl1, 0], txt: "propriété", pos: "sous", decal: 0.2 });
  C.push({ t: "texte", p: [(xl0 + xl1) / 2, 0], txt: `Coupe près du ${prP ? "poteau" : "pilier"} gauche (gauche et droite vus de la rue)`, pos: "sous", decal: 2.4, convention: true });
}
  function bornes(prims) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    const add = ([x, y]) => { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); };
    for (const p of prims) {
      if (p.pts) p.pts.forEach(add);
      if (p.t === "sol") { add([p.x1, 0]); add([p.x2, 0]); }
      if (p.a) { add(p.a); add(p.b); }
      if (p.t === "cercle") { add([p.c[0] - p.r, p.c[1] - p.r]); add([p.c[0] + p.r, p.c[1] + p.r]); }
      if (p.t === "texte") add(p.p);
    }
    return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
  }

  function coteGeom(p, fs) {
    const pas = fs * 2.4 * p.d;
    const [ax, ay] = p.a, [bx, by] = p.b;
    if (p.cote === "haut" || p.cote === "bas") {
      const y = p.cote === "haut" ? Math.max(ay, by) + pas : Math.min(ay, by) - pas;
      // Cote trop courte pour son chiffre : le chiffre passe à droite, hors des traits.
      const court = !p.ton && Math.abs(bx - ax) < fs * 0.62 * String(p.txt).length + fs;
      const tx = court ? Math.max(ax, bx) + fs * (0.9 + 0.33 * String(p.txt).length) : (ax + bx) / 2;
      return { l: [[ax, ay, ax, y], [bx, by, bx, y], [ax, y, bx, y]], ticks: [[ax, y], [bx, y]], txt: [tx, y + (p.cote === "haut" ? fs * 0.45 : -fs * 1.15)], rot: 0 };
    }
    const x = p.cote === "droite" ? Math.max(ax, bx) + pas : Math.min(ax, bx) - pas;
    // Cote trop courte : le chiffre passe au-dessus du trait, hors des repères.
    const court = Math.abs(by - ay) < fs * 0.62 * String(p.txt).length + fs;
    const ty = court ? Math.max(ay, by) + fs * (0.9 + 0.33 * String(p.txt).length) : (ay + by) / 2;
    return { l: [[ax, ay, x, ay], [bx, by, x, by], [x, ay, x, by]].concat(court ? [[x, Math.max(ay, by), x, ty - fs * 0.33 * String(p.txt).length - fs * 0.3]] : []), ticks: [[x, ay], [x, by]], txt: [x + (p.cote === "droite" ? fs * 0.45 : -fs * 0.45), ty], rot: -90, cote: p.cote };
  }

  // Le dessin d'une vue en SVG (sans toucher à la page) : le cadre (viewBox), la taille du texte et les traits. Le site
  // vend la même vue de face en aperçu : il appelle cette fonction, il ne redessine rien.
  function svgDe(prims, petit = false) {
    const b = bornes(prims);
    const fs = Math.max(b.w, b.h) / (petit === "planche" ? 19 : petit ? 26 : 42);
    const m = fs * 8.5;
    const vb = [b.x1 - m, -(b.y2 + m), b.w + 2 * m, b.h + 2 * m];
    const Y = (y) => -y;
    let out = "";
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    for (const p of prims) {
      const pc = p.piece ? ` data-piece="${esc([].concat(p.piece).join("|"))}"` : "", cc = p.piece ? " cliquable" : "";
      if (p.t === "poly") out += `<${p.ouvert ? "polyline" : "polygon"}${pc} class="${p.cls}${cc}" points="${p.pts.map(([x, y]) => `${x.toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}"/>`;
      if (p.t === "sol") out += `<line class="t-sol" x1="${p.x1}" y1="0" x2="${p.x2}" y2="0"/>`;
      if (p.t === "cercle") out += `<circle${pc} class="${p.cls}${cc}" cx="${p.c[0].toFixed(1)}" cy="${Y(p.c[1]).toFixed(1)}" r="${p.r.toFixed(1)}"/>`;
      if (p.t === "texte") {
        const dy = p.pos === "sous" ? fs * (1.25 + (p.decal || 0) * 1.1) : -fs * (0.55 + (p.decal || 0) * 1.1);
        const tc = p.ton ? `t-texte ${p.ton} halo` : "t-libre", tf = p.ton ? fs * 1.15 : fs * 0.72;
        out += `<text class="${tc}" font-size="${tf.toFixed(1)}" x="${p.p[0].toFixed(1)}" y="${(Y(p.p[1]) + dy).toFixed(1)}" text-anchor="middle">${esc(p.txt)}</text>`;
      }
      // Pointe de flèche (vers le haut) au bout d'un trait de rappel.
      if (p.t === "fleche") {
        const [x, y] = p.p, a = fs * 0.45;
        out += `<polygon class="t-fleche ${p.ton || ""}" points="${x.toFixed(1)},${Y(y).toFixed(1)} ${(x - a * 0.5).toFixed(1)},${Y(y - a).toFixed(1)} ${(x + a * 0.5).toFixed(1)},${Y(y - a).toFixed(1)}"/>`;
      }
      if (p.t === "point") out += `<circle class="t-point" cx="${p.c[0].toFixed(1)}" cy="${Y(p.c[1]).toFixed(1)}" r="${(fs * 0.22).toFixed(1)}"/>`;
      if (p.t === "angle") {
        const r = fs * 3.2, [cx, cy] = p.c;
        const x1 = cx - r, y1 = cy, x2 = cx - r * Math.cos(p.ang), y2 = cy - r * Math.sin(p.ang);
        out += `<path class="t-cote" d="M${x1.toFixed(1)},${Y(y1).toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 0 ${x2.toFixed(1)},${Y(y2).toFixed(1)}"/>`;
        out += `<text class="t-texte" font-size="${(fs * 0.85).toFixed(1)}" x="${(cx - r * 1.35).toFixed(1)}" y="${Y(cy - r * 0.45).toFixed(1)}" text-anchor="end">${esc(p.txt)}</text>`;
      }
      if (p.t === "cote") {
        const g = coteGeom(p, fs);
        const ton = p.ton ? " " + p.ton : "";
        for (const [x1, y1, x2, y2] of g.l) out += `<line class="t-cote${ton}" x1="${x1.toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${Y(y2).toFixed(1)}"/>`;
        const tk = fs * 0.45;
        for (const [x, y] of g.ticks) out += `<line class="t-cote${ton}" x1="${(x - tk).toFixed(1)}" y1="${Y(y - tk).toFixed(1)}" x2="${(x + tk).toFixed(1)}" y2="${Y(y + tk).toFixed(1)}"/>`;
        const [tx, ty] = g.txt;
        const anchor = g.rot ? "middle" : "middle";
        // Cotes verticales lues de haut en bas (tête penchée vers la droite).
        const tr = g.rot ? ` transform="rotate(90 ${tx.toFixed(1)} ${Y(ty).toFixed(1)})"` : "";
        const dy = g.rot ? (g.cote === "droite" ? -fs * 0.25 : fs * 0.45) : 0;
        out += `<text class="t-texte${ton}" font-size="${fs.toFixed(1)}" x="${tx.toFixed(1)}" y="${(Y(ty) + dy).toFixed(1)}" text-anchor="${anchor}"${tr}>${esc(p.txt)}</text>`;
      }
    }
    return { vb, fs, html: out };
  }


export { calculerPortail, ptEntrees, svgDe, PT_STYLES, PT_MODELES, PT_ATELIER, PT_MATIERES };
export const EMPREINTE = "742858cc6e79";
