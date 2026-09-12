# Les tests du calcul des prix

## À quoi ça sert

Tout l'argent du site passe par un seul fichier : `src/lib/products.ts`. C'est
lui qui décide ce qu'affiche la fiche produit, et c'est lui qui décide ce que
Stripe encaisse. Ces tests sont là pour qu'on puisse toucher aux tarifs sans
avoir peur de casser quelque chose en silence.

Ils vérifient trois choses, en gros :

1. **Le prix affiché est le prix facturé.** Jamais un client ne doit voir un
   montant et en payer un autre.
2. **On ne peut pas tricher.** Une essence inconnue, la taille d'un autre
   meuble, un velours sur une table, une pièce infabricable : tout est refusé.
3. **Le sur-mesure reste cohérent avec le catalogue.** Aux mêmes cotes, le même
   prix. Plus grand ou plus épais, plus cher.

## Comment les lancer

Depuis le dossier du projet :

```
npm test
```

Pas d'installation, pas de bibliothèque en plus : c'est le lanceur de tests
livré avec Node.

Pour ne lancer qu'un seul fichier :

```
node --test tests/prix-sur-mesure.test.ts
```

## Ce qu'il y a dans chaque fichier

| Fichier | Ce qu'il surveille |
| --- | --- |
| `prix-catalogue.test.ts` | Les prix du catalogue : entiers, positifs, identiques entre l'affichage et la caisse, et un « à partir de » qui ne ment pas. |
| `prix-sur-mesure.test.ts` | La fabrication aux cotes du client : surfaces, bornes de l'atelier, cohérence avec le catalogue, prix qui monte avec la taille et l'épaisseur. |
| `fraude.test.ts` | Tout ce que le serveur doit refuser avant d'encaisser. |
| `commande-frontiere.test.ts` | Les garde-fous de `/api/commande` : quantités et cotes en millimètres entiers. |
| `catalogue.ts` | Pas un test : la boîte à outils commune (parcourir le catalogue, fabriquer des cotes de test). |

## La règle du jeu quand on écrit un test ici

**On ne fige aucun montant.** Écrire « la table de 8 coûte 3 590 € » ferait
échouer les tests au premier changement de tarif, pour rien. On écrit des
règles : « le prix monte quand la table s'allonge », « le sur-mesure n'est
jamais moins cher que le catalogue à cotes égales ». Les tarifs bougeront ; les
règles, non.

## Un point resté ouvert

Un test est marqué `todo` : *« juste à côté d'une taille du catalogue, le prix
ne doit pas plonger »*. Il ne fait pas échouer la suite, il note un écart à
trancher.

Le problème : une taille du catalogue garde son propre tarif au millimètre
près. Un millimètre à côté, c'est le barème au mètre carré qui s'applique — et
sur certaines tailles ce barème tombe plus bas que le tarif du catalogue.
Concrètement, demander une table de 2 401 mm au lieu de 2 400 mm peut faire
baisser la facture. Il faudra soit réaccorder les tarifs du catalogue avec le
barème, soit donner au barème un plancher au prix de la taille juste en
dessous. C'est une décision de Quentin, pas un bug à corriger tout seul.
