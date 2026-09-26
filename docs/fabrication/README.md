# Fiches de fabrication

Ce que contient réellement chaque pièce : matériaux, sections, masses, références
fournisseur, méthode de montage.

**À quoi ça sert.** Ces fiches sont la source de trois choses que le site calcule
aujourd'hui de mémoire, et parfois de travers :

1. **Le poids annoncé au client** (`poidsColisKg`, src/lib/products.ts), qui
   décide du prix de livraison et de la faisabilité d'une pose à deux.
2. **Le prix de revient**, pour le chiffrage détaillé de chaque article — à
   faire, avec le coût de l'outillage et les charges.
3. **Les textes du site** : les fiches techniques affichées au client doivent
   dire la même chose que ce qui sort de l'atelier.

**Comment les remplir.** Une ligne par matériau, avec sa masse unitaire ET sa
source. On distingue toujours ce qui est **mesuré** (pesé, lu sur une étiquette,
sur un catalogue fournisseur) de ce qui est **estimé**. Une estimation qui se
fait passer pour une mesure coûte de l'argent le jour où elle est fausse.

**Les questions ouvertes restent écrites dans la fiche**, en bas. C'est ce qui
permet de reprendre le travail des semaines plus tard sans tout redemander.

| Fiche | Article |
|---|---|
| [plafond-lumineux.md](plafond-lumineux.md) | Plafonds lumineux à toile tendue — Lucarne et Halo |
