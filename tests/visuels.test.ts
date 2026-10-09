/**
 * Les images du site : honnêtes sur ce qu'elles montrent.
 *
 * L'atelier n'a pas encore de chantier client (commandes ouvertes le 7 décembre 2026). Les images des pièces sont
 * des visuels faits par ordinateur, sauf quelques vraies photos. Décision de Quentin (06/10/2026) : chaque visuel porte
 * la mention discrète « Image d'illustration » (« Illustration » en anglais), les vraies photos ne la portent pas,
 * et aucune phrase ne fait croire à des chantiers ou des clients passés (code de la consommation, art. L121-2).
 *
 * Ce qu'on vérifie :
 * 1. la liste des vraies photos (src/lib/visuels.ts) : trois fichiers, qui existent, sans mention ;
 * 2. chaque image de pièce du dossier public/images et chaque image citée par le catalogue ou la page « Projets et
 *    visuels » porte la mention — sauf les vraies photos ;
 * 3. aucune image ne s'affiche hors du composant `Visuel`, qui pose la mention tout seul : un `<Image>` de Next, un
 *    `<img src="/images/…">` ou un `url(/images/…)` écrits à la main passeraient sans mention ;
 * 4. la mention se lit : contraste d'au moins 4,5:1 sur n'importe quelle image, et dite aux lecteurs d'écran une fois ;
 * 5. plus aucune des phrases retirées, et la phrase des mentions légales dans les deux langues ;
 * 6. les vraies photos sont le travail de Quentin d'avant l'atelier, jamais des chantiers d'Auboiacier ; les légendes
 *    des visuels ne disent pas « posé », et un visuel s'appelle une image, pas une photo.
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
  VISUELS_SOMBRES,
  VRAIES_PHOTOS,
  altAvecMention,
  cheminImage,
  estVraiePhoto,
  montreUnePiece,
  porteMentionIllustration,
  tonMention,
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

/** Le travail de Quentin avant l'ouverture de l'atelier : « réalisé par Quentin avant l'ouverture de l'atelier ». */
const TRAVAUX_AVANT_ATELIER = [
  "/images/torse-acier-poster.jpg",
  "/images/verriere-pose-chantier-2.jpg",
  "/images/verriere-pose-chantier-4.jpg",
  // Ses plafonds lumineux et un escalier en fabrication (« mes propres pièces », 09/10/2026).
  "/images/atelier/plafond-caisson-led.jpg",
  "/images/atelier/plafond-caisson-led-poster.jpg",
  "/images/atelier/plafond-profiles-alu.jpg",
  "/images/atelier/plafond-toile-allumee.jpg",
  "/images/atelier/escalier-atelier-poster.jpg",
];
/** Quentin au travail, qui meule un châssis : son texte alternatif le nomme. */
const PORTRAIT_QUENTIN = "/images/atelier-soudeur.jpg";
/** Les vraies photos que Quentin a désignées. */
const ATTENDUES = [...TRAVAUX_AVANT_ATELIER, PORTRAIT_QUENTIN];

/** Ce qui n'est pas une photo de pièce : textures du croquis, images de partage, pictogrammes, deux paysages. */
const PAS_DES_PIECES = (src: string) =>
  src.startsWith("/images/schema/") ||
  src.startsWith("/images/partage/") ||
  src === "/images/partage-auboiacier.jpg" ||
  src.endsWith(".svg") ||
  src === "/images/saumur.jpg" ||
  src === "/images/vignes-coucher-soleil.jpg";

test("les vraies photos, et seulement elles : elles existent et ne portent pas la mention", () => {
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
    // Un bloc peut montrer une vraie photo d'atelier (escalier, plafond : 09/10/2026), vérifiée plus bas avec son texte.
    for (const s of p.sections ?? []) if (!TRAVAUX_AVANT_ATELIER.includes((s as { image?: string }).image ?? "")) ajouter((s as { image?: string }).image);
  }
  assert.ok(sources.size > 50, "les images du catalogue n'ont pas été lues");
  for (const src of sources) {
    assert.ok(existsSync(join(RACINE, "public", src)), `${src} : citée par le catalogue mais absente de public`);
    assert.ok(porteMentionIllustration(src), `${src} : image du catalogue sans mention`);
  }
});

test("Projets et visuels : les vraies photos d'un côté, les visuels de l'autre, aucun visuel « près de chez vous »", () => {
  const vraies = photos.filter((p) => estVraiePhoto(p.src)).map((p) => p.src);
  assert.deepEqual(vraies.sort(), [...TRAVAUX_AVANT_ATELIER].sort(), "les vraies photos de la page");
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
  // Le devis PDF, lui, écrit la mention sous la photo de la pièce.
  assert.match(lire("src/lib/devis-pdf.tsx"), /porteMentionIllustration\(devis\.piece\.photo\)/);
});

/**
 * Les seules images de pièces affichées en CSS : les pastilles des rosaces du garde-corps, de quelques millimètres, à
 * côté du croquis qui les montre en grand. Une nouvelle image en `url(/images/…)` doit passer par `Visuel`, ou
 * s'ajouter ici en connaissance de cause.
 */
const PASTILLES_ROSACES = [
  "src/lib/products.ts : /images/garde-corps/rosaces/fleur.jpg",
  "src/lib/products.ts : /images/garde-corps/rosaces/fonte.jpg",
  "src/lib/products.ts : /images/garde-corps/rosaces/acier.jpg",
  "src/lib/products.ts : /images/garde-corps/rosaces/sans.svg",
];

/** Les seules balises <img> écrites à la main : des plans de garde-corps dessinés par l'outil (SVG), pas des pièces. */
const IMG_PERMISES = [
  join("src", "components", "plan-apercu.tsx"),
  // Les vignettes des décors à volutes (Garde-corps forgé à volutes) : dessinées par l'outil de plans (SVG).
  join("src", "components", "choix-decor-gc.tsx"),
  join("src", "app", "[lang]", "artisanat", "verification-garde-corps", "page.tsx"),
  // L'aperçu de la photo que le CLIENT vient de choisir (blob:, dans son navigateur) : jamais une image du site.
  join("src", "components", "photo-tableau.tsx"),
];

test("aucune image écrite à la main : ni <img src=\"/images/…\">, ni url(/images/…) hors des pastilles de rosaces", () => {
  const code = fichiers("src").filter((f) => /\.(tsx?|m?js|css)$/.test(f));
  assert.ok(code.length > 50, "les fichiers du site n'ont pas été lus");
  const fautes: string[] = [];
  const urls: string[] = [];
  for (const f of code) {
    const texte = lire(f);
    // Une balise <img> qui va chercher une image du site, en JSX comme dans du HTML écrit en texte.
    for (const m of texte.matchAll(/<img\b[^>]*?\bsrc\s*=\s*\{?\s*["'`]\/images\//g)) {
      fautes.push(`${f} : ${m[0].replace(/\s+/g, " ").slice(0, 80)}… (passer par Visuel)`);
    }
    // Toute balise <img> en JSX, même avec une adresse calculée : seulement là où on sait ce qu'elle montre.
    if (f.endsWith(".tsx") && !IMG_PERMISES.includes(f) && /<img\b[\s/>]/.test(texte.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""))) {
      fautes.push(`${f} : balise <img> écrite à la main (passer par Visuel)`);
    }
    // Une image du site en CSS, avec ou sans guillemets.
    for (const m of texte.matchAll(/url\(\s*["']?(\/images\/[^"')\s]+)/g)) urls.push(`${f} : ${m[1]}`);
  }
  assert.deepEqual(fautes, []);
  assert.deepEqual(urls.sort(), [...PASTILLES_ROSACES].sort(), "images en url(…) : seulement les pastilles de rosaces");
});

/** Luminance relative (WCAG 2) d'une couleur [r, g, b] de 0 à 255. */
function luminance([r, g, b]: number[]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contraste = (a: number[], b: number[]) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/** Une couleur à moitié transparente, posée sur une autre. */
const poser = (dessus: number[], opacite: number, dessous: number[]) => dessus.map((v, i) => v * opacite + dessous[i] * (1 - opacite));

test("la mention se lit sur n'importe quelle image : contraste d'au moins 4,5:1, dans les deux tons", () => {
  const composant = lire("src/components/visuel.tsx");
  const tons = composant.match(/TONS_MENTION = \{\s*clair: "([^"]+)",\s*sombre: "([^"]+)",?\s*\}/);
  assert.ok(tons, "visuel.tsx : TONS_MENTION introuvable");
  /** « bg-white/85 text-[#5c5140] » → le voile (couleur, opacité) et le texte (couleur, opacité). */
  const lireTon = (classes: string) => {
    const couleur = (nom: string) =>
      nom === "white" ? [255, 255, 255] : nom === "black" ? [0, 0, 0] : (nom.match(/^\[#([0-9a-f]{6})\]$/i)?.[1].match(/../g) ?? []).map((h) => parseInt(h, 16));
    // Le fond qui touche les lettres : un voile (bg-…), ou le halo de trois ombres empilées autour des lettres
    // ([text-shadow:0_0_2px_#fff,…]) : leur cœur, sous le contour des lettres, est couvrant (compté à 90 %).
    const halo = classes.match(/\[text-shadow:0_0_\d+px_#(fff|000)(?:,0_0_\d+px_#\1){2,}\]/i);
    const fond = halo ? [halo[0], halo[1] === "fff" ? "white" : "black", "90"] : classes.match(/\bbg-(white|black|\[#[0-9a-f]{6}\])(?:\/(\d+))?(?:\s|$)/i);
    const texte = classes.match(/\btext-(white|black|\[#[0-9a-f]{6}\])(?:\/(\d+))?(?:\s|$)/i);
    assert.ok(fond && texte, `classes illisibles par le test : ${classes}`);
    return {
      fond: couleur(fond[1]),
      opaciteFond: fond[2] ? Number(fond[2]) / 100 : 1,
      texte: couleur(texte[1]),
      opaciteTexte: texte[2] ? Number(texte[2]) / 100 : 1,
    };
  };
  // L'image sous la mention : tous les gris, et les couleurs franches (coins du cube des couleurs).
  const dessous: number[][] = [];
  for (let v = 0; v <= 255; v += 5) dessous.push([v, v, v]);
  for (const r of [0, 255]) for (const g of [0, 255]) for (const b of [0, 255]) dessous.push([r, g, b]);
  for (const [nom, classes] of [["clair", tons[1]], ["sombre", tons[2]]] as const) {
    const ton = lireTon(classes);
    let pire = Infinity;
    for (const image of dessous) {
      const voile = poser(ton.fond, ton.opaciteFond, image);
      pire = Math.min(pire, contraste(poser(ton.texte, ton.opaciteTexte, voile), voile));
    }
    assert.ok(pire >= 4.5, `ton ${nom} (${classes}) : contraste de ${pire.toFixed(2)}:1 au pire, il faut 4,5:1`);
  }
  // Les visuels sombres prennent le ton sombre d'eux-mêmes ; ils existent et portent la mention.
  for (const src of VISUELS_SOMBRES) {
    assert.ok(existsSync(join(RACINE, "public", src)), `${src} introuvable`);
    assert.ok(porteMentionIllustration(src), src);
    assert.equal(tonMention(src), "sombre", src);
  }
  assert.equal(tonMention("/images/mikado/ambiance.jpg"), "clair");
  assert.match(composant, /TONS_MENTION\[ton \?\? tonMention\(src\)\]/, "le ton par défaut vient de VISUELS_SOMBRES");
});

test("lecteurs d'écran : la mention se lit une fois, avec l'image (texte alternatif), jamais en double", () => {
  assert.equal(altAvecMention("Table Mikado", "/images/mikado/ambiance.jpg", "fr"), "Table Mikado (image d'illustration)");
  assert.equal(altAvecMention("Mikado table", "/images/mikado/ambiance.jpg", "en"), "Mikado table (illustration)");
  // Pas deux fois, pas sur une image décorative, pas sur une vraie photo ni sur ce qui n'est pas une pièce.
  assert.equal(altAvecMention("Table Mikado (image d'illustration)", "/images/mikado/ambiance.jpg", "fr"), "Table Mikado (image d'illustration)");
  assert.equal(altAvecMention("", "/images/mikado/ambiance.jpg", "fr"), "");
  assert.equal(altAvecMention("Pose d'une verrière", "/images/verriere-pose-chantier-4.jpg", "fr"), "Pose d'une verrière");
  assert.equal(altAvecMention("Saumur", "/images/saumur.jpg", "fr"), "Saumur");
  const composant = lire("src/components/visuel.tsx");
  assert.match(composant, /aria-hidden="true"/, "la mention visible est cachée aux lecteurs d'écran (sinon : deux fois)");
  assert.match(composant, /altAvecMention\(props\.alt, src, locale\)/, "Visuel ajoute la mention au texte alternatif");
  assert.match(composant, /<Image \{\.\.\.props\} alt=\{alt\} \/>/);
  assert.match(lire("src/components/video-boucle.tsx"), /aria-label=\{altAvecMention\(description, poster, locale\)\}/);
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

test("les vraies photos : le travail de Quentin avant l'ouverture de l'atelier, jamais un chantier d'Auboiacier", () => {
  assert.equal(fr.realisations.chantierTitle, "En photo : le travail de Quentin");
  assert.equal(en.realisations.chantierTitle, "In photos: Quentin's work");
  // « réalisé », « réalisée » ou « réalisés » selon ce qu'on montre.
  for (const [d, avant] of [
    [fr, /réalisée?s? par Quentin avant l'ouverture de l'atelier/],
    [en, /made by Quentin before the workshop opened/],
  ] as const) {
    // Une seule fois par page, pas sous chaque photo (Quentin, 09/10/2026 : « si tu dois le dire sur chacune de mes pièces,
    // on n'a pas fini : c'est mon entreprise »). Le sous-titre de la page et le titre de la section le disent au-dessus
    // de la galerie ; une légende n'a plus à le répéter.
    assert.match(d.realisations.subtitle, avant, "sous-titre de la page");
    for (const p of photos.filter((photo) => estVraiePhoto(photo.src))) {
      assert.ok(d.realisations[p.alt]?.trim(), `légende de ${p.src} : vide`);
      assert.doesNotMatch(d.realisations[p.alt], /chantier d'Auboiacier|Auboiacier job/i, `légende de ${p.src} : jamais présentée comme un chantier d'Auboiacier`);
    }
    // La page Sculptures montre aussi le torse : le texte sous la vidéo le dit, une fois.
    assert.match(d.sculptures.torseBody, avant, "Sculptures : légende du torse");
  }
  // Les travaux d'avant l'atelier ne s'affichent que sur Projets et visuels, la zone d'intervention (avec une commune,
  // jamais un visuel), pour le torse la page Sculptures, et les plafonds en fabrication sur la page des plafonds : un
  // nouvel endroit doit dire, lui aussi, d'où ils viennent.
  const code = fichiers("src").filter((f) => /\.tsx?$/.test(f) && f !== join("src", "lib", "visuels.ts"));
  const endroits = code.filter((f) => TRAVAUX_AVANT_ATELIER.some((src) => lire(f).includes(src)));
  assert.deepEqual(
    endroits.sort(),
    [
      join("src", "app", "[lang]", "artisanat", "sculptures", "page.tsx"),
      join("src", "app", "[lang]", "toiles-tendues", "page.tsx"),
      join("src", "lib", "chantiers.ts"),
      join("src", "lib", "products.ts"),
    ].sort(),
  );
  // Les fiches (escalier, plafond) montrent une vraie photo dans un bloc : son texte, en français et en anglais, le dit.
  for (const p of products) {
    p.sections.forEach((section, i) => {
      if (!section.image || !TRAVAUX_AVANT_ATELIER.includes(section.image)) return;
      assert.match(section.body, /réalisée?s? par Quentin avant l'ouverture de l'atelier/, `${p.slug} : bloc « ${section.title} »`);
      assert.match(p.en?.sections?.[i]?.body ?? "", /made by Quentin before the workshop opened/, `${p.slug} : bloc anglais n° ${i}`);
    });
  }
  // Les plafonds lumineux montrent leurs plafonds en fabrication (09/10/2026) : le bloc dit d'où ils viennent.
  assert.match(fr.lumiere.fabricationTexte, /réalisés par Quentin avant l'ouverture de l'atelier/);
  assert.match(en.lumiere.fabricationTexte, /made by Quentin before the workshop opened/);
});

test("la photo de Quentin au travail : seulement sur l'accueil, le devis, le contact et À propos, avec un texte qui le nomme", () => {
  // Son texte alternatif nomme Quentin, et ne dit pas « à l'atelier » comme si c'était l'atelier Auboiacier.
  for (const [nom, d] of [["fr", fr], ["en", en]] as const) {
    assert.match(d.hub.altAtelier, /^Quentin /, `${nom} : hub.altAtelier`);
    assert.doesNotMatch(d.hub.altAtelier, /à l'atelier|in the workshop/i, `${nom} : hub.altAtelier`);
  }
  const permis = ["page.tsx", join("devis", "page.tsx"), join("contact", "page.tsx"), join("a-propos", "page.tsx")].map((f) =>
    join("src", "app", "[lang]", f),
  );
  const code = fichiers("src").filter((f) => /\.tsx?$/.test(f) && f !== join("src", "lib", "visuels.ts"));
  const endroits = code.filter((f) => lire(f).includes(PORTRAIT_QUENTIN));
  assert.ok(endroits.length > 0, "la photo de Quentin n'est plus utilisée : la retirer de VRAIES_PHOTOS");
  for (const f of endroits) {
    assert.ok(permis.includes(f), `${f} : la photo de Quentin hors de l'accueil, du devis, du contact et d'À propos`);
    // Chaque affichage (hors image de partage des réseaux) prend son texte dans hub.altAtelier, qui nomme Quentin.
    const usages = [...lire(f).matchAll(new RegExp(`${PORTRAIT_QUENTIN.replace(/[./]/g, "\\$&")}"([^\\n]*\\n){0,3}`, "g"))];
    for (const u of usages) {
      if (/^\s*image:/m.test(lire(f).slice(Math.max(0, (u.index ?? 0) - 12), u.index))) continue;
      assert.match(u[0], /altAtelier/, `${f} : la photo de Quentin sans hub.altAtelier`);
    }
  }
  const retirees = [/chantier et atelier/i, /le chantier en cours/i, /premières photos/i, /on site and in the workshop/i, /job in progress/i, /first (site )?photos/i];
  for (const [nom, d] of [["fr", fr], ["en", en]] as const) {
    const textes = JSON.stringify([d.realisations, d.seo.realisations]);
    for (const motif of retirees) assert.doesNotMatch(textes, motif, `${nom} : ${motif}`);
    // La description Google de la page : vraie, et sous la limite de 155 signes.
    assert.ok([...d.seo.realisations.description].length <= 155, `${nom} : description de la page trop longue`);
  }
  // À propos : l'atelier ouvre (commandes le 7 décembre 2026), il n'a pas « ouvert ».
  assert.match(fr.apropos.intro, /atelier de métallerie qui ouvre à Saumur/);
  assert.match(en.apropos.intro, /metalwork workshop opening in Saumur/);
  assert.doesNotMatch(fr.apropos.intro, /a ouvert|installé/);
  assert.doesNotMatch(en.apropos.intro, /opened|based in/);
});

test("les légendes des visuels ne disent pas « posé » ; un visuel est une image, pas une photo", () => {
  const pose = /\bpos[ée]e?s?(?![a-zàâçéèêëîïôûùüÿœ])|\bfitted\b|\binstall[ée]e?s?(?![a-zé])|\binstalled\b/i;
  // Les légendes de la page Projets et visuels (les vraies photos peuvent montrer une pose : ce sont des photos).
  for (const p of photos) {
    if (estVraiePhoto(p.src)) continue;
    assert.doesNotMatch(fr.realisations[p.alt], pose, `fr ${p.alt}`);
    assert.doesNotMatch(en.realisations[p.alt], pose, `en ${p.alt}`);
  }
  // Les textes alternatifs des fiches, en français et en anglais.
  for (const p of products) {
    for (const img of p.images) assert.doesNotMatch(img.alt, pose, `${p.slug} : ${img.alt}`);
    for (const alt of (p.en as { images?: string[] } | undefined)?.images ?? []) assert.doesNotMatch(alt, pose, `${p.slug} (en) : ${alt}`);
  }
  assert.equal(fr.artisanat.apercuPhoto, "Voir l'image de ma configuration");
  assert.equal(en.artisanat.apercuPhoto, "See the image of my configuration");
  assert.match(fr.essences.chene.usage, /celle des images/);
  assert.match(en.essences.chene.usage, /in the images/);
  assert.match(fr.cgu.sections[2].body, /Les fiches, images et rendus d'options/);
  assert.match(en.cgu.sections[2].body, /Product pages, images and option renderings/);
  const catalogue = lire("src/lib/products.ts");
  assert.doesNotMatch(catalogue, /le chêne est celui de la photo|oak is the one in the photo/);
});
