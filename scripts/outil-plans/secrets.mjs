// Les « chaînes de coûts » : des morceaux de texte qui trahiraient les coûts de l'atelier s'ils
// apparaissaient ailleurs que dans le chiffrage chiffré. La liste n'est JAMAIS écrite dans le dépôt : elle est
// tirée, au moment du contrôle, du chiffrage déchiffré avec la clé. Ce fichier ne contient que la méthode.
import { acorn } from "./analyse.mjs";

/**
 * Les déclarations de l'outil qui portent les coûts. MTC_PRIX et MTC_TEMPS : les prix d'achat et les temps du décor à volutes
 * (module chiffrage-motifs de l'outil, 06/10/2026). MTC_PIECES_PAR_FORME n'en est pas : c'est un nombre de pièces par forme.
 */
export const DECLARATIONS_COUTS = ["REGLAGES", "TARIFS", "CONSO", "TEMPS_REF", "MTC_PRIX", "MTC_TEMPS"];

/** Les fonctions du chiffrage et du moteur : leurs noms ne doivent jamais apparaître dans le JavaScript public. */
export const FONCTIONS_SERVEUR = ["chiffrerGC", "remiseGC", "calculerGC", "geomGC", "composerDevisGC", "dsDevisHtml", "variantesConformes", "trousPanneau"];

// Mots du métier présents aussi dans les textes publics du site : ce ne sont pas des indices.
// (« bouts effilés », « assemblage », « collier » : le décor à volutes les nomme dans le moteur, le devis et l'écran du site ;
// « estimation », « au mètre », « au poids » : des mots des textes du site.)
const BANALS = new Set([
  "pièce", "forfait", "tableur", "recherche", "repère", "mainCourante", "emballage", "peinture", "soudure", "chene",
  "hetre", "noyer", "morceaux", "Saumur", "notice", "rosace", "Huile-cire", "huileCire", "bouts effilés", "assemblage",
  "collier", "estimation", "au mètre", "au poids",
]);

/**
 * Tirées du texte du chiffrage (déchiffré), dans les déclarations de coûts :
 * - valeurs : les textes de 6 signes et plus (désignations, sources avec fournisseurs et prix), chaque
 *   morceau de ces sources (« tableur · Fournisseur, Ville · … » : un fournisseur cité seul), et les nombres
 *   décimaux d'au moins 4 chiffres. Elles ne doivent apparaître NULLE PART en clair : ni dans un fichier
 *   suivi par git (le dépôt est public), ni dans le JavaScript publié.
 * - noms : les noms des déclarations et des champs (7 signes et plus). Le code du serveur s'en sert
 *   (calcul d'une commande), mais ils ne doivent jamais apparaître dans le JavaScript publié.
 */
export function chainesSecretes(corpsChiffrage) {
  const ast = acorn.parse(corpsChiffrage, { ecmaVersion: "latest", sourceType: "script" });
  const valeurs = new Set(), noms = new Set(DECLARATIONS_COUTS);
  const vis = (n) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "Literal" && typeof n.value === "string" && n.value.length >= 6) valeurs.add(n.value);
    if (n.type === "Literal" && typeof n.value === "number" && /^\d{2,}\.\d\d$|^\d\.\d{3,}$/.test(String(n.value))) valeurs.add(String(n.value));
    if (n.type === "Property" && !n.computed && n.key.type === "Identifier" && n.key.name.length >= 7) noms.add(n.key.name);
    for (const k in n) {
      const c = n[k];
      if (Array.isArray(c)) c.forEach(vis);
      else if (c && typeof c.type === "string") vis(c);
    }
  };
  for (const s of ast.body) {
    if (s.type === "VariableDeclaration" && s.declarations.some((d) => DECLARATIONS_COUTS.includes(d.id.name))) vis(s);
  }
  for (const t of [...valeurs]) {
    t.split(/[·,()]/).map((x) => x.trim()).filter((x) => x.length >= 8 && /[A-Za-zÀ-ÿ]/.test(x) && !/^\d/.test(x)).forEach((x) => valeurs.add(x));
  }
  for (const b of BANALS) { valeurs.delete(b); noms.delete(b); }
  const parLongueur = (a, b) => b.length - a.length;
  return { valeurs: [...valeurs].sort(parLongueur), noms: [...noms].sort(parLongueur) };
}

/** Les chaînes de la liste présentes dans un texte (vide = propre). */
export function secretsDans(texte, liste) {
  // Un prix (« 12.34 ») ne compte que comme nombre entier : « 112.34 », une coordonnée d'un dessin SVG, n'est pas une fuite.
  const nombre = (x) => new RegExp(`(?<![\\d.])${x.replace(".", "\\.")}(?!\\d)`);
  return liste.filter((s) => (/^\d+\.\d+$/.test(s) ? nombre(s).test(texte) : texte.includes(s)));
}
