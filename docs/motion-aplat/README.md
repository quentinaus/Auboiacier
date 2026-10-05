# Motion design « en aplats »

Les scènes animées validées par Quentin le 05/10/2026 pour le configurateur du garde-corps :

- **Scène A** : la carte « L'atelier vient mesurer » (l'utilitaire part de l'atelier de Saumur, la fenêtre est cotée).
- **Scène B** : la carte « Je mesure moi-même » (le mètre ruban, les cotes 1 000 mm et 650 mm, le prix de 320 €).
- **Scène C** : le film du parcours, en 16 s et quatre chapitres (prise de cotes, prix exact, fabrication à Saumur, pose).

`index.html` est la maquette complète, autonome (HTML, CSS et SVG, sans bibliothèque), écrite par `build.py`. Toute
l'animation y est en `@keyframes` CSS. Avec `index.html?t=3.5`, toutes les animations sont figées à 3,5 s : c'est ce
qui permet d'en tirer des images fixes ou de vérifier un instant précis. Elle n'entre pas dans le dépôt (ses milliers
de nombres peuvent ressembler par hasard à une valeur du chiffrage) : `python3 docs/motion-aplat/build.py` la récrit.

Sur le site, `scripts/extraire-motion-aplat.mjs` en copie les trois scènes et leurs styles, sans les redessiner, dans
`src/components/motion-aplat.genere.ts`. Après une retouche de la maquette :

```bash
node scripts/extraire-motion-aplat.mjs
```

Ce que le site en fait : `src/components/porte-qui-mesure.tsx` (les deux cartes de « Qui prend les mesures ? ») et
`src/components/serenite-atelier.tsx` (le film, en mode « L'atelier vient mesurer »).
