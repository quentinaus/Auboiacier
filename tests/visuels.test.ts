/**
 * Les images du site : honnêtes sur ce qu'elles montrent.
 *
 * L'atelier n'a pas encore de chantier client (commandes ouvertes le 7 décembre 2026). Les images des pièces sont
 * des visuels faits par ordinateur, sauf trois vraies photos. Décision de Quentin (06/10/2026) : chaque visuel porte
 * la mention discrète « Image d'illustration » (« Illustration » en anglais), les vraies photos ne la portent pas,
 * et aucune phrase ne fait croire à des chantiers ou des clients passés (code de la consommation, art. L121-2).
 *
 * Ce qu'on vérifie :
 * 1. la liste des vraies photos (src/lib/visuels.ts) : trois fichiers, qui existent, sans mention ;
 * 2. chaque image de pièce du dossier public/images et chaque image citée par le catalogue ou la page « Projets et
 *    visuels » porte la mention — sauf les trois vraies photos ;
 * 3. aucune image ne s'affiche hors du composant `Visuel`, qui pose la mention tout seul : un `<Image>` de Next
 *    écrit à la main dans une page passerait sans mention ;
 * 4. plus aucune des phrases retirées, et la phrase des mentions légales dans les deux langues.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };
import { products } from "../src/lib/products.ts";
import { photos } from "../src/lib/chantiers.ts";
import {
  MENTION_ILLUSTRATION,
  VRAIES_PHOTOS,
  cheminImage,
  estVraiePhoto,
  montreUnePiece,
  porteMentionIllustration,
} from "../src/lib/visuels.ts";

const RACINE = new URL("..", import.meta.url).pathname;
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

/** Tous les fichiers d'un dossier, récursivement, en chemins relatifs à la racine du dépôt. */
function fichiers(dossier: string): string[] {
  return readdirSync(join(RACINE, dossier)).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(join(RACINE, chemin)).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

/** Les images de public/images, telles que le site les appelle : « /images/… ». */
const IMAGES = fichiers("public/images").map((f) => `/${relative("public", f)}`);

/** Les trois vraies photos que Quentin a désignées. */
const ATTENDUES = [
  "/images/torse-acier-poster.jpg",
  "/images/verriere-pose-chantier-2.jpg",
  "/images/verriere-pose-chantier-4.jpg",
];

/** Ce qui n'est pas une photo de pièce : textures du croquis, images de partage, pictogrammes, deux paysages. */
const PAS_DES_PIECES = (src: string) =>
  src.startsWith("/images/schema/") ||
  src.startsWith("/images/partage/") ||
  src === "/images/partage-auboiacier.jpg" ||
  src.endsWith(".svg") ||
  src === "/images/saumur.jpg" ||
  src === "/images/vignes-coucher-soleil.jpg";

test("trois vraies photos, et seulement elles : elles existent et ne portent pas la mention", () => {
  assert.deepEqual([...VRAIES_PHOTOS].sort(), [...ATTENDUES].sort());
  for (const src of ATTENDUES) {
    assert.ok(existsSync(join(RACINE, "public", src)), `${src} introuvable dans public`);
    assert.ok(estVraiePhoto(src), src);
    assert.ok(montreUnePiece(src), `${src} : c'est bien une pièce (ou un chantier)`);
    assert.equal(porteMentionIllustration(src), false, `${src} : une vraie photo ne porte pas la mention`);
  }
  // Le chemin se lit aussi dans une adresse complète (le devis PDF reçoit l'image avec le domaine du site).
  assert.equal(porteMentionIllustration("https://auboiacier.fr/images/verriere-pose-chantier-4.jpg"), false);
  assert.equal(porteMentionIllustration("https://auboiacier.fr/images/mikado/ambiance.jpg?v=2"), true);
  assert.equal(cheminImage("http://localhost:3000/images/a.jpg#x"), "/images/a.jpg");
});

test("chaque image de public/images : la mention, sauf les vraies photos et ce qui n'est pas une pièce", () => {
  assert.ok(IMAGES.length > 100, "le dossier des images n'a pas été lu");
  for (const src of IMAGES) {
    const attendu = !ATTENDUES.includes(src) && !PAS_DES_PIECES(src);
    assert.equal(porteMentionIllustration(src), attendu, `${src} : mention ${attendu ? "attendue" : "en trop"}`);
  }
  // Les familles de pièces, nommément : chaises comprises, et l'image de l'atelier (elle n'est pas une vraie photo).
  for (const src of [
    "/images/mikado/ambiance.jpg",
    "/images/chaises/vert-bouteille.jpg",
    "/images/garde-corps/fenetre-pose.jpg",
    "/images/garde-corps/rosaces/fonte.jpg",
    "/images/lumiere/salle-ronde.jpg",
    "/images/verriere-interieure.jpg",
    "/images/sculpture-cheval-v2.jpg",
    "/images/plafond-cadre.png",
    "/images/atelier-soudeur.jpg",
  ]) {
    assert.ok(porteMentionIllustration(src), src);
  }
});

test("le catalogue : chaque image d'une fiche (vues, teintes, essences, coloris) porte la mention", () => {
  const sources = new Set<string>();
  const ajouter = (valeur: unknown) => {
    if (typeof valeur === "string") sources.add(valeur);
    else if (valeur && typeof valeur === "object") Object.values(valeur).forEach(ajouter);
  };
  for (const p of products) {
    for (const img of p.images) {
      ajouter(img.src);
      ajouter(img.variants);
      ajouter(img.parBois);
      ajouter(img.parColoris);
    }
    for (const photo of p.photosDescriptif ?? []) ajouter(photo.src);
    for (const f of p.fabrics ?? []) ajouter(f.image);
    for (const s of p.sections ?? []) ajouter((s as { image?: string }).image);
  }
  assert.ok(sources.size > 50, "les images du catalogue n'ont pas été lues");
  for (const src of sources) {
    assert.ok(existsSync(join(RACINE, "public", src)), `${src} : citée par le catalogue mais absente de public`);
    assert.ok(porteMentionIllustration(src), `${src} : image du catalogue sans mention`);
  }
});

test("Projets et visuels : les vraies photos d'un côté, les visuels de l'autre, aucun visuel « près de chez vous »", () => {
  const vraies = photos.filter((p) => estVraiePhoto(p.src)).map((p) => p.src);
  assert.deepEqual(vraies.sort(), [...ATTENDUES].sort(), "les vraies photos de la page");
  for (const p of photos) {
    assert.ok(existsSync(join(RACINE, "public", p.src)), `${p.src} introuvable`);
    if (!estVraiePhoto(p.src)) {
      assert.ok(porteMentionIllustration(p.src), `${p.src} : visuel sans mention`);
      assert.equal(p.commune, undefined, `${p.src} : un visuel ne porte jamais la commune d'un chantier`);
    }
  }
  const page = lire("src/app/[lang]/realisations/page.tsx");
  assert.match(page, /estVraiePhoto\(p\.src\)/, "la page range les images selon src/lib/visuels.ts");
  assert.match(page, /t\.chantierTitle/);
  assert.match(page, /t\.visuelsTitle/);
  const zone = lire("src/app/[lang]/zone-intervention/page.tsx");
  assert.match(zone, /estVraiePhoto\(photo\.src\)/, "la zone d'intervention ne montre que de vraies photos");
});

test("aucune image ne s'affiche sans passer par Visuel (qui pose la mention)", () => {
  const sources = fichiers("src").filter((f) => /\.tsx?$/.test(f));
  const fautes: string[] = [];
  for (const f of sources) {
    const code = lire(f);
    if (f !== join("src", "components", "visuel.tsx") && /from "next\/image"/.test(code)) {
      fautes.push(`${f} : importe next/image (passer par Visuel)`);
    }
    // Chaque Visuel reçoit la langue : la mention s'écrit dans celle de la page.
    for (const m of code.matchAll(/<Visuel\b([^>]*?)\/?>/g)) {
      if (!/\blocale=/.test(m[1])) fautes.push(`${f} : <Visuel> sans locale`);
    }
    // Une vignette ne porte pas la mention : seulement dans la galerie, la barre d'achat et le panier, où la grande
    // image (ou la fiche) est juste à côté.
    if (/<Visuel\b[^>]*\bvignette\b/.test(code)) {
      const permis = ["product-view.tsx", "product-options.tsx", "cart-view.tsx"].map((n) => join("src", "components", n));
      if (!permis.includes(f)) fautes.push(`${f} : vignette sans mention hors de la galerie, de la barre d'achat ou du panier`);
    }
    // Une mention retirée de l'image doit être posée à la main dans le même fichier.
    if (/mention=\{false\}/.test(code) && f !== join("src", "components", "visuel.tsx") && !/<MentionIllustration\b/.test(code)) {
      fautes.push(`${f} : mention={false} sans <MentionIllustration> dans le fichier`);
    }
  }
  assert.deepEqual(fautes, []);
  // Les images en CSS (pastilles de matière) ne sont que des textures et des rosaces de quelques millimètres.
  // Le devis PDF, lui, écrit la mention sous la photo de la pièce.
  assert.match(lire("src/lib/devis-pdf.tsx"), /porteMentionIllustration\(devis\.piece\.photo\)/);
});

test("la mention : le texte exact, sans « IA », « généré » ni « 3D »", () => {
  assert.equal(MENTION_ILLUSTRATION.fr, "Image d'illustration");
  assert.equal(MENTION_ILLUSTRATION.en, "Illustration");
  const composant = lire("src/components/visuel.tsx");
  assert.match(composant, /pointer-events-none/, "la mention ne doit pas prendre le clic");
  assert.match(composant, /data-mention-illustration/);
  const interdit = /\bIA\b|intelligence artificielle|g[ée]n[ée]r[ée]e?s?\b|\b3D\b|\bAI\b|AI-generated|computer-generated|\bCGI\b/;
  for (const [nom, texte] of [
    ["mention fr", MENTION_ILLUSTRATION.fr],
    ["mention en", MENTION_ILLUSTRATION.en],
    ["fr.json", JSON.stringify(fr)],
    ["en.json", JSON.stringify(en)],
  ] as const) {
    assert.doesNotMatch(texte, interdit, nom);
  }
});

test("plus aucune des phrases retirées (chantiers, clients ou importations qu'on ne peut pas montrer)", () => {
  const textes = [
    ["fr.json", JSON.stringify(fr)],
    ["en.json", JSON.stringify(en)],
    ["toiles-tendues", lire("src/app/[lang]/toiles-tendues/page.tsx")],
    ["chantiers.ts", lire("src/lib/chantiers.ts")],
  ] as const;
  const retirees = [
    /posés chez des particuliers/i,
    /fitted for homes and businesses/i,
    /for homes and businesses in the Loire Valley/i,
    /rien n'est importé/i,
    /nothing is imported/i,
    /Ce qu'en disent nos clients/i,
    /What our clients say/i,
    /Les premiers chantiers arrivent/i,
    /First projects are under way/i,
    /Réalisations récentes/i,
    /Recent projects/i,
    /Voir les réalisations/i,
    /See our work/i,
    /See the projects/i,
    /D'autres chantiers seront ajoutés/i,
    /Aucun chantier de cette famille/i,
    /More projects will be added/i,
    /Our projects: furniture/i,
    /Le cheval cabré est né/i,
    /The rearing horse is made/i,
    /Lucarne posé,/i,
    /Lucarne backlit stretch ceiling installed/i,
  ];
  for (const [nom, texte] of textes) {
    for (const motif of retirees) assert.doesNotMatch(texte, motif, `${nom} : ${motif}`);
  }
  // La page garde son adresse, mais plus son ancien nom.
  assert.equal(fr.nav.realisations, "Projets et visuels");
  assert.equal(en.nav.realisations, "Projects and visuals");
  assert.equal(fr.realisations.title, "Projets et visuels");
  assert.equal(en.realisations.title, "Projects and visuals");
  assert.ok(existsSync(join(RACINE, "src/app/[lang]/realisations/page.tsx")), "l'adresse /realisations est gardée");
});

test("les mentions légales disent ce que sont les images d'illustration, dans les deux langues", () => {
  const phraseFr = fr.mentionsLegales.sections.find((s) => s.body.includes("« Image d'illustration »"));
  assert.ok(phraseFr, "mentions légales (fr) : la phrase sur les images d'illustration manque");
  assert.match(phraseFr.body, /présentent nos modèles/);
  assert.match(phraseFr.body, /peut différer légèrement/);
  const phraseEn = en.mentionsLegales.sections.find((s) => s.body.includes("“Illustration”"));
  assert.ok(phraseEn, "legal notice (en): the sentence about illustrations is missing");
  assert.match(phraseEn.body, /may differ slightly/);
  // Les liens de la page visent toujours les bons articles (index 4 et 5).
  assert.match(fr.mentionsLegales.sections[4].title, /propriété intellectuelle/i);
  assert.match(fr.mentionsLegales.sections[5].title, /données personnelles/i);
});
