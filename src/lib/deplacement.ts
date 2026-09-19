/**
 * La prise de cotes à domicile : ce qu'elle coûte selon la distance.
 *
 * Les chiffres sont ceux de Quentin. Jusqu'à 30 km autour de Saumur, c'est
 * une offre : 19,99 €. Au-delà, on compte les kilomètres aller-retour et le
 * temps — le temps de route et l'heure sur place — à son taux horaire de
 * déplacement, 40 €/h. Ce taux ne sert qu'à ça : il n'a rien à voir avec
 * celui des devis de fabrication ou de pose.
 *
 * La distance vient du code postal du client, géocodé par l'annuaire des
 * adresses de l'État (api-adresse.data.gouv.fr — gratuit, sans clé). Si le
 * service ne répond pas, on retombe sur la préfecture du département : moins
 * précis, mais jamais bloqué. Le résultat est le même dans le navigateur et
 * sur le serveur, parce que c'est le serveur qui calcule dans les deux cas.
 */

/** L'atelier : Saumur. */
const SAUMUR = { lat: 47.2601, lon: -0.0769 };

/** Jusque-là, c'est l'offre. Distance à vol d'oiseau. */
export const RAYON_OFFRE_KM = 30;
export const PRIX_OFFRE_CENTS = 1999;

/** Au-delà, l'atelier ne se déplace pas : on fabrique et on expédie sur les cotes du client. */
export const RAYON_MAX_KM = 200;

/** La route fait toujours plus long que la ligne droite. */
const COEF_ROUTE = 1.25;
/** Kilomètres aller-retour : carburant et usure, sans plus. */
const EURO_PAR_KM = 0.45;
/** Vitesse moyenne route + ville, pour compter les heures de trajet. */
const VITESSE_KMH = 60;
/** Le temps sur place, pour mesurer et discuter. */
const HEURES_SUR_PLACE = 1;
/** Le taux horaire de déplacement. Rien d'autre ne l'utilise. */
export const TAUX_HORAIRE_DEPLACEMENT = 40;

export type Deplacement = {
  /** En centimes : 19,99 € se dit 1999. */
  montantCents: number;
  /** Distance à vol d'oiseau depuis Saumur, en km. */
  distanceKm: number;
  /** Kilomètres de route, aller-retour. */
  routeAllerRetourKm: number;
  /** Temps compté, route et sur place, en heures. */
  heures: number;
  offre: boolean;
  /** La commune trouvée, pour que le client vérifie qu'on parle bien de chez lui. */
  commune: string;
  /** « adresse » : géocodé finement. « departement » : repli sur la préfecture. */
  precision: "adresse" | "departement";
};

export type ResultatDeplacement =
  | { ok: true; deplacement: Deplacement }
  | {
      ok: false;
      reason: "code_postal_invalide" | "hors_metropole" | "trop_loin" | "introuvable";
      /** Pour « trop loin » : où, et à combien de kilomètres, pour le dire au client. */
      distanceKm?: number;
      commune?: string;
    };

/** « 49400 » → « 49 ». Corse : « 20 ». */
export function departementDe(codePostal: string): string | null {
  const cp = codePostal.replace(/\s+/g, "");
  if (!/^\d{5}$/.test(cp)) return null;
  return cp.slice(0, 2);
}

/** Distance à vol d'oiseau, en km. */
function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/**
 * Le prix à partir de la distance à vol d'oiseau. C'est la partie pure, celle
 * que les tests vérifient : le géocodage est ailleurs.
 */
export function tarifDeplacement(distanceKm: number): Omit<Deplacement, "commune" | "precision"> {
  if (distanceKm <= RAYON_OFFRE_KM) {
    const route = Math.round(distanceKm * COEF_ROUTE * 2);
    return {
      montantCents: PRIX_OFFRE_CENTS,
      distanceKm: Math.round(distanceKm),
      routeAllerRetourKm: route,
      heures: Math.round((route / VITESSE_KMH + HEURES_SUR_PLACE) * 10) / 10,
      offre: true,
    };
  }
  const route = distanceKm * COEF_ROUTE * 2;
  const heures = route / VITESSE_KMH + HEURES_SUR_PLACE;
  const euros = Math.ceil(route * EURO_PAR_KM + heures * TAUX_HORAIRE_DEPLACEMENT);
  return {
    montantCents: euros * 100,
    distanceKm: Math.round(distanceKm),
    routeAllerRetourKm: Math.round(route),
    heures: Math.round(heures * 10) / 10,
    offre: false,
  };
}

/* ------------------------------------------------------------------ *
 *  La pose à domicile
 *  L'atelier livre et installe lui-même, sur un seul trajet : la livraison
 *  et la pose se paient ensemble, une fois. Le prix : un forfait de
 *  main-d'œuvre sur place (déballage, montage, mise à niveau), plus la route
 *  aller-retour et le temps de trajet, au même taux que la prise de cotes.
 *  Pas d'offre à 19,99 € ici : c'est un service, pas un rendez-vous d'avant-
 *  vente. Les chiffres restent à valider par Quentin.
 * ------------------------------------------------------------------ */

/** Main-d'œuvre sur place, forfait. */
export const FORFAIT_POSE_CENTS = 9000;
/** Le temps compté chez le client pour poser une table. */
const HEURES_POSE = 1.5;

export function tarifPose(distanceKm: number): Omit<Deplacement, "commune" | "precision"> {
  const route = distanceKm * COEF_ROUTE * 2;
  const heuresRoute = route / VITESSE_KMH;
  const euros = Math.ceil(route * EURO_PAR_KM + heuresRoute * TAUX_HORAIRE_DEPLACEMENT);
  return {
    montantCents: FORFAIT_POSE_CENTS + euros * 100,
    distanceKm: Math.round(distanceKm),
    routeAllerRetourKm: Math.round(route),
    heures: Math.round((heuresRoute + HEURES_POSE) * 10) / 10,
    offre: false,
  };
}

/** Libellé de la ligne « pose », dans la langue du client. */
export function libellePose(codePostal: string, locale: "fr" | "en"): string {
  return locale === "en"
    ? `Delivery and fitting at home — Saumur → ${codePostal}`
    : `Livraison et pose à domicile — Saumur → ${codePostal}`;
}

/**
 * Le « produit » pose, tel qu'il circule dans le panier : une ligne à part,
 * au code postal du client, recalculée par /api/commande avant d'encaisser.
 */
export const POSE = "pose-a-domicile";

/* ------------------------------------------------------------------ *
 *  Le repli : la préfecture de chaque département de métropole.
 *  Approximatif par nature ; ne sert que si l'annuaire ne répond pas.
 * ------------------------------------------------------------------ */
const PREFECTURES: Record<string, [number, number, string]> = {
  "01": [46.2056, 5.2256, "Bourg-en-Bresse"], "02": [49.5679, 3.6215, "Laon"], "03": [46.5661, 3.3329, "Moulins"],
  "04": [44.0925, 6.2356, "Digne-les-Bains"], "05": [44.5594, 6.0786, "Gap"], "06": [43.7102, 7.262, "Nice"],
  "07": [44.735, 4.5992, "Privas"], "08": [49.7622, 4.7264, "Charleville-Mézières"], "09": [42.9637, 1.6053, "Foix"],
  "10": [48.2973, 4.0744, "Troyes"], "11": [43.213, 2.3491, "Carcassonne"], "12": [44.3506, 2.575, "Rodez"],
  "13": [43.2965, 5.3698, "Marseille"], "14": [49.1829, -0.3707, "Caen"], "15": [44.9245, 2.4413, "Aurillac"],
  "16": [45.65, 0.1596, "Angoulême"], "17": [46.1603, -1.1511, "La Rochelle"], "18": [47.081, 2.3988, "Bourges"],
  "19": [45.2671, 1.7716, "Tulle"], "20": [41.9192, 8.7386, "Ajaccio"], "21": [47.322, 5.0415, "Dijon"],
  "22": [48.5142, -2.7651, "Saint-Brieuc"], "23": [46.1667, 1.8667, "Guéret"], "24": [45.1846, 0.7214, "Périgueux"],
  "25": [47.2378, 6.0241, "Besançon"], "26": [44.9334, 4.8924, "Valence"], "27": [49.0241, 1.151, "Évreux"],
  "28": [48.4439, 1.4893, "Chartres"], "29": [48.3904, -4.4861, "Brest"], "30": [43.8367, 4.3601, "Nîmes"],
  "31": [43.6047, 1.4442, "Toulouse"], "32": [43.6461, 0.5857, "Auch"], "33": [44.8378, -0.5792, "Bordeaux"],
  "34": [43.6108, 3.8767, "Montpellier"], "35": [48.1173, -1.6778, "Rennes"], "36": [46.8103, 1.6913, "Châteauroux"],
  "37": [47.3941, 0.6848, "Tours"], "38": [45.1885, 5.7245, "Grenoble"], "39": [46.6745, 5.5548, "Lons-le-Saunier"],
  "40": [43.8901, -0.5002, "Mont-de-Marsan"], "41": [47.5861, 1.3359, "Blois"], "42": [45.4397, 4.3872, "Saint-Étienne"],
  "43": [45.0435, 3.885, "Le Puy-en-Velay"], "44": [47.2184, -1.5536, "Nantes"], "45": [47.9029, 1.9093, "Orléans"],
  "46": [44.4475, 1.4406, "Cahors"], "47": [44.2033, 0.6163, "Agen"], "48": [44.5177, 3.5, "Mende"],
  "49": [47.4784, -0.5632, "Angers"], "50": [49.116, -1.09, "Saint-Lô"], "51": [49.0431, 3.9571, "Châlons-en-Champagne"],
  "52": [48.1113, 5.1394, "Chaumont"], "53": [48.0785, -0.7669, "Laval"], "54": [48.6921, 6.1844, "Nancy"],
  "55": [48.7726, 5.1673, "Bar-le-Duc"], "56": [47.6582, -2.7608, "Vannes"], "57": [49.1193, 6.1757, "Metz"],
  "58": [46.99, 3.1625, "Nevers"], "59": [50.6292, 3.0573, "Lille"], "60": [49.4295, 2.0807, "Beauvais"],
  "61": [48.4319, 0.0918, "Alençon"], "62": [50.4574, 2.4934, "Arras"], "63": [45.7772, 3.087, "Clermont-Ferrand"],
  "64": [43.2951, -0.3708, "Pau"], "65": [43.2328, 0.0781, "Tarbes"], "66": [42.6887, 2.8948, "Perpignan"],
  "67": [48.5734, 7.7521, "Strasbourg"], "68": [47.7508, 7.3359, "Colmar"], "69": [45.764, 4.8357, "Lyon"],
  "70": [47.6222, 6.1553, "Vesoul"], "71": [46.7833, 4.85, "Mâcon"], "72": [48.0061, 0.1996, "Le Mans"],
  "73": [45.5646, 5.9178, "Chambéry"], "74": [45.8992, 6.1294, "Annecy"], "75": [48.8566, 2.3522, "Paris"],
  "76": [49.4432, 1.0993, "Rouen"], "77": [48.5421, 2.6554, "Melun"], "78": [48.8049, 2.1204, "Versailles"],
  "79": [46.3237, -0.4648, "Niort"], "80": [49.8941, 2.2958, "Amiens"], "81": [43.9298, 2.148, "Albi"],
  "82": [44.0176, 1.355, "Montauban"], "83": [43.1242, 5.928, "Toulon"], "84": [43.9493, 4.8055, "Avignon"],
  "85": [46.6705, -1.4269, "La Roche-sur-Yon"], "86": [46.5802, 0.3404, "Poitiers"], "87": [45.8336, 1.2611, "Limoges"],
  "88": [48.1724, 6.4497, "Épinal"], "89": [47.7982, 3.5673, "Auxerre"], "90": [47.6379, 6.8628, "Belfort"],
  "91": [48.6326, 2.4406, "Évry"], "92": [48.8924, 2.2071, "Nanterre"], "93": [48.9362, 2.3574, "Bobigny"],
  "94": [48.7904, 2.4556, "Créteil"], "95": [49.0364, 2.0763, "Cergy"],
};

/** Petite mémoire par code postal : l'annuaire n'est appelé qu'une fois par instance. */
const memoire = new Map<string, { lat: number; lon: number; commune: string }>();

/**
 * Où est ce code postal ? L'annuaire des adresses de l'État, avec un délai
 * court : mieux vaut un repli rapide qu'une page qui attend.
 */
async function geocoder(codePostal: string): Promise<{ lat: number; lon: number; commune: string } | null> {
  const enMemoire = memoire.get(codePostal);
  if (enMemoire) return enMemoire;
  try {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), 3500);
    const reponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${codePostal}&postcode=${codePostal}&type=municipality&limit=1`,
      { signal: controleur.signal, headers: { accept: "application/json" } }
    );
    clearTimeout(minuteur);
    if (!reponse.ok) return null;
    const json = (await reponse.json()) as {
      features?: { geometry?: { coordinates?: [number, number] }; properties?: { city?: string; name?: string } }[];
    };
    const trouve = json.features?.[0];
    const coords = trouve?.geometry?.coordinates;
    if (!coords) return null;
    const resultat = {
      lon: coords[0],
      lat: coords[1],
      commune: trouve?.properties?.city ?? trouve?.properties?.name ?? codePostal,
    };
    memoire.set(codePostal, resultat);
    return resultat;
  } catch {
    return null;
  }
}

/**
 * Le prix du déplacement pour ce code postal. Refuse ce qui n'est pas un code
 * postal, et l'outre-mer : on ne prend pas l'avion pour mesurer une fenêtre.
 */
export async function calculerDeplacement(codePostal: string): Promise<ResultatDeplacement> {
  return calculer(codePostal, tarifDeplacement);
}

/**
 * Même trajet, autre motif : la pose. Le prix suit le barème de la pose, et
 * l'atelier va partout en France métropolitaine : pas de rayon, le prix
 * grandit simplement avec la route.
 */
export async function calculerPose(codePostal: string): Promise<ResultatDeplacement> {
  return calculer(codePostal, tarifPose, Infinity);
}

async function calculer(
  codePostal: string,
  tarif: (distanceKm: number) => Omit<Deplacement, "commune" | "precision">,
  rayonMaxKm: number = RAYON_MAX_KM
): Promise<ResultatDeplacement> {
  const cp = codePostal.replace(/\s+/g, "");
  const departement = departementDe(cp);
  if (!departement) return { ok: false, reason: "code_postal_invalide" };
  if (!PREFECTURES[departement]) return { ok: false, reason: "hors_metropole" };

  const fin = await geocoder(cp);
  const [lat, lon, prefecture] = PREFECTURES[departement];
  const point = fin ?? { lat, lon, commune: `${prefecture} (${departement})` };
  const distance = haversineKm(SAUMUR, point);
  if (distance > rayonMaxKm) {
    return { ok: false, reason: "trop_loin", distanceKm: Math.round(distance), commune: point.commune };
  }
  return {
    ok: true,
    deplacement: {
      ...tarif(distance),
      commune: point.commune,
      precision: fin ? "adresse" : "departement",
    },
  };
}

/** Libellé de la ligne « déplacement », dans la langue du client. */
export function libellePriseDeCotes(codePostal: string, locale: "fr" | "en"): string {
  return locale === "en"
    ? `Home survey — Saumur → ${codePostal}`
    : `Prise de cotes à domicile — Saumur → ${codePostal}`;
}

/**
 * Le « produit » prise de cotes, tel qu'il circule dans le panier. Ce n'est
 * pas une pièce du catalogue : son prix vient du code postal, son créneau
 * de l'agenda, et /api/commande recalcule les deux avant d'encaisser.
 */
export const PRISE_DE_COTES = "prise-de-cotes";
