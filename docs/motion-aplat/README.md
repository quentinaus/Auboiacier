# Motion design « en aplats »

Les scènes animées validées par Quentin le 05/10/2026 pour le configurateur du garde-corps :

- **Scène A** : l'utilitaire « AUBOIACIER » part de Saumur, la fenêtre est cotée (gardée dans la maquette, plus montrée sur le site).
- **Scène B** : le film « Je mesure et pose moi-même », 36,95 s : les deux mesures (1 000 mm, 650 mm), le devis à 320 € et
  le tampon « Commandé », la fabrication à Saumur, la caisse en bois tamponnée « AUBOIACIER », le camion du transporteur
  (sans nom) et la carte de France, puis la pose par le client.
- **Scène C** : le film de l'atelier, 27,76 s, en quatre chapitres (prise de cotes, prix exact, fabrication à Saumur, pose
  par l'atelier) : sur la carte « L'atelier mesure et s'occupe de tout » et dans le panneau du mode atelier.
- Les deux films finissent sur l'écran « AUBOIACIER » (le sceau au garde-corps, le nom, « Métallerie · Saumur ») et
  repartent en douceur. Sur les cartes, une étiquette par étape (.aplat-et, .aplat-etB0…5, .aplat-etC0…3) : des
  éléments HTML posés par le site, dans sa langue, et calés sur le film par les styles extraits.

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
