/**
 * Ce que l'accessibilité des couleurs doit garder vrai.
 *
 * Le site écrit ses couleurs en clair dans les classes Tailwind
 * (« text-[#6f6357] »). Un gris trop clair choisi un jour pour faire joli
 * rend un prix ou une consigne illisible sur téléphone au soleil — et rien
 * ne le signale. Ces tests calculent le contraste WCAG de chaque couleur de
 * texte trouvée dans src contre les deux fonds du site (le fond de page
 * #fbf9f6 et le blanc des cartes et des champs) et refusent tout ce qui passe
 * sous 4,5:1, le minimum pour du texte courant. Les états désactivés sont
 * exemptés par la norme, et le sont ici aussi.
 *
 * Même chose, à 3:1, pour la limite des champs de saisie : une case qu'on ne
 * distingue pas du fond n'est pas une case.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Tous les fichiers .tsx et .ts de src, récursivement. */
function fichiersSource(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersSource(chemin);
    return /\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

/** Luminance relative d'une couleur « rrggbb », formule WCAG 2. */
function luminance(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Rapport de contraste entre deux couleurs, de 1 (identiques) à 21 (noir sur blanc). */
export function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

const FONDS = { "fond de page #fbf9f6": "fbf9f6", "blanc": "ffffff" };
const SOURCES = fichiersSource("src").map((f) => [f, readFileSync(f, "utf8")] as const);

test("la formule de contraste retrouve les valeurs de référence", () => {
  assert.equal(contraste("000000", "ffffff"), 21);
  assert.equal(contraste("ffffff", "ffffff"), 1);
  assert.ok(Math.abs(contraste("6f6357", "fbf9f6") - 5.55) < 0.01);
});

test("toute couleur de texte de src lit à 4,5:1 au moins sur les fonds clairs", () => {
  const fautes: string[] = [];
  for (const [fichier, code] of SOURCES) {
    // Le préfixe capturé permet d'ignorer les états désactivés (exemptés par
    // WCAG) ; « placeholder: » et « hover: » restent soumis à la règle.
    for (const m of code.matchAll(/(?:([a-z-]+):)?text-\[#([0-9a-fA-F]{6})\]/g)) {
      const [, variante, hex] = m;
      if (variante === "disabled") continue;
      for (const [nom, fond] of Object.entries(FONDS)) {
        const r = contraste(hex.toLowerCase(), fond);
        if (r < 4.5) fautes.push(`${fichier} : ${m[0]} = ${r.toFixed(2)}:1 sur ${nom}`);
      }
    }
  }
  assert.deepEqual(fautes, []);
});

test("la limite des champs de saisie se voit à 3:1 au moins", () => {
  const fautes: string[] = [];
  for (const [fichier, code] of SOURCES) {
    // Un champ de saisie se reconnaît à sa bordure qui change au focus
    // (focus:border-… sur l'<input>, focus-within:border-… sur la pilule qui
    // l'entoure) : on lit la couleur de repos de cette même liste de classes.
    for (const m of code.matchAll(/["`]([^"`\n]*focus(?:-within)?:border-[^"`\n]*)["`]/g)) {
      const classes = m[1];
      for (const b of classes.matchAll(/(?<![a-z:-])border-\[#([0-9a-fA-F]{6})\]/g)) {
        const r = contraste(b[1].toLowerCase(), "ffffff");
        if (r < 3) fautes.push(`${fichier} : ${b[0]} = ${r.toFixed(2)}:1 sur blanc`);
      }
    }
  }
  assert.deepEqual(fautes, []);
});

test("les prix barrés et les indications de plage ne sont plus en gris pâle", () => {
  for (const [fichier, code] of SOURCES) {
    assert.ok(!/<s className="[^"]*text-\[#a3968a\]/.test(code), `${fichier} : prix barré en #a3968a (2,7:1)`);
    assert.ok(!code.includes("placeholder:text-[#c4b9ac]"), `${fichier} : placeholder en #c4b9ac (1,9:1)`);
  }
});
