/**
 * Ce que les textes juridiques doivent garder vrai.
 *
 * La politique de confidentialité et les CGU vivent dans les dictionnaires ;
 * les pages qui les affichent supposent une structure précise (dix articles,
 * un lien sous tel index). Une traduction oubliée d'un côté ferait planter
 * la page anglaise ; un article supprimé décalerait les liens. Et deux
 * affirmations de la politique dépendent du code : la clé du panier dans le
 * navigateur, et le fait que le site ne dépose aucun cookie de son cru.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

import fr from "../src/app/[lang]/dictionaries/fr.json" with { type: "json" };
import en from "../src/app/[lang]/dictionaries/en.json" with { type: "json" };

/** Toutes les clés d'un objet, à plat : « cgu.sections », « footer.privacy »… */
function cles(objet: unknown, prefixe = ""): string[] {
  if (!objet || typeof objet !== "object" || Array.isArray(objet)) return [prefixe.slice(0, -1)];
  return Object.entries(objet).flatMap(([k, v]) => cles(v, `${prefixe}${k}.`));
}

test("fr.json et en.json ont exactement les mêmes clés", () => {
  const a = new Set(cles(fr));
  const b = new Set(cles(en));
  assert.deepEqual([...a].filter((k) => !b.has(k)), [], "clés présentes en français, absentes en anglais");
  assert.deepEqual([...b].filter((k) => !a.has(k)), [], "clés présentes en anglais, absentes en français");
});

test("politique et CGU : dix articles, numérotés, dans les deux langues", () => {
  for (const dict of [fr, en]) {
    for (const page of [dict.confidentialite, dict.cgu]) {
      assert.equal(page.sections.length, 10, page.title);
      page.sections.forEach((section, i) => {
        assert.match(section.title, new RegExp(`^${i + 1}\\. `), `${page.title} — ${section.title}`);
        assert.ok(section.body.trim().length > 40, `${page.title} — article ${i + 1} vide`);
      });
    }
  }
});

test("les liens placés sous un article visent le bon article", () => {
  // cgu/page.tsx met la politique sous l'index 7 et les CGV sous l'index 9 ;
  // cgv/page.tsx met la politique sous l'index 9 ; mentions-legales/page.tsx
  // met les CGU sous l'index 4 et la politique sous l'index 5.
  assert.match(fr.cgu.sections[7].title, /cookies/i);
  assert.match(fr.cgu.sections[9].title, /litiges/i);
  assert.match(fr.cgv.sections[9].title, /données personnelles/i);
  assert.match(fr.mentionsLegales.sections[4].title, /propriété intellectuelle/i);
  assert.match(fr.mentionsLegales.sections[5].title, /données personnelles/i);
});

test("la politique cite la vraie clé du panier dans le navigateur", () => {
  const cart = readFileSync(new URL("../src/lib/cart.tsx", import.meta.url), "utf8");
  const cle = cart.match(/STORAGE_KEY\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(cle, "STORAGE_KEY introuvable dans src/lib/cart.tsx");
  for (const dict of [fr, en]) {
    assert.ok(dict.confidentialite.sections[7].body.includes(cle), `article 8 (${dict.confidentialite.title})`);
  }
});

test("un seul fichier du site pose des témoins, et l'article 8 les décrit", () => {
  // Le site n'a longtemps déposé AUCUN témoin. L'espace client en impose un
  // (rester connecté d'une page à l'autre), et un second le temps de la
  // connexion. Ils vivent tous les deux dans src/lib/compte.ts, et nulle part
  // ailleurs : ce test tient la porte. Qu'un troisième apparaisse dans un
  // autre fichier — ni en-tête Set-Cookie, ni document.cookie, ni l'API
  // cookies() de Next — et l'article 8 doit être réécrit le même jour.
  const sortie = execSync(
    "grep -rlniE 'set-cookie|document\\.cookie|cookies\\(' src --include='*.ts' --include='*.tsx' || true",
    { cwd: new URL("..", import.meta.url), encoding: "utf8" }
  );
  const fichiers = sortie.trim().split("\n").filter(Boolean).sort();
  assert.deepEqual(fichiers, ["src/lib/compte.ts"], `un témoin est posé ailleurs :\n${sortie}`);

  // Et l'article 8 nomme les deux, dans les deux langues : un témoin décrit
  // nulle part est un témoin qu'on n'a pas le droit de poser.
  for (const dict of [fr, en]) {
    const article = dict.confidentialite.sections[7].body;
    for (const temoin of ["auboiacier_compte", "auboiacier_passage"]) {
      assert.ok(article.includes(temoin), `article 8 (${dict.confidentialite.title}) ne nomme pas ${temoin}`);
    }
  }
});

test("l'espace client apparaît dans la liste des destinataires", () => {
  // « Se connecter avec Google » fait entrer Google dans le circuit : il doit
  // figurer à l'article 4, dans les deux langues, sans quoi la politique ment.
  for (const dict of [fr, en]) {
    assert.match(
      dict.confidentialite.sections[3].body,
      /Google Ireland/,
      `article 4 (${dict.confidentialite.title}) ne cite pas Google`
    );
  }
});

test("l'article 8 décrit l'outil de mesure d'audience réellement posé", () => {
  // La mesure d'audience (Vercel Web Analytics) est posée dans le layout des
  // pages publiques ; l'article 8 de la politique doit la nommer, dans les
  // deux langues. Si l'outil est retiré, retirer aussi le paragraphe.
  const layout = readFileSync(new URL("../src/app/[lang]/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<MesureAudience \/>/, "le composant de mesure n'est plus dans le layout");
  for (const dict of [fr, en]) {
    assert.ok(
      dict.confidentialite.sections[7].body.includes("Vercel Web Analytics"),
      `article 8 (${dict.confidentialite.title}) ne nomme pas l'outil de mesure`
    );
  }
});

test("le proxy laisse passer les envois de la mesure d'audience", () => {
  // Le script envoie ses vues sur /_vercel/insights/view, sans point dans le
  // chemin : sans exclusion explicite, le proxy le redirigerait vers /fr/…
  // et aucune visite ne serait comptée.
  const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const matcher = proxy.match(/matcher:\s*\["([^"]+)"\]/)?.[1];
  assert.ok(matcher, "matcher introuvable dans src/proxy.ts");
  const motif = new RegExp(`^${matcher.replace(/\\\\/g, "\\")}$`);
  assert.equal(motif.test("/_vercel/insights/view"), false, "le proxy intercepte /_vercel/insights/view");
  assert.equal(motif.test("/fr/artisanat"), true, "le proxy n'intercepte plus les pages");
});
