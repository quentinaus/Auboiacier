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
| `catalogue-alt.test.ts` | Les descriptions des photos (alt) : un texte par photo en français, et sa traduction anglaise en face, dans le même ordre. |
| `visuels.test.ts` | Les images honnêtes (décision du 06/10/2026) : chaque visuel de pièce porte « Image d'illustration », les trois vraies photos (`src/lib/visuels.ts`) non ; aucune image hors du composant `Visuel` ; plus aucune phrase sur des chantiers ou des clients passés ; la phrase des mentions légales, en français et en anglais. |
| `seo.test.ts` | Les titres et descriptions que Google affiche : dans les 60 et 155 signes une fois fabriqués par `src/lib/seo.ts`, sans mot perdu, sans doublon. |
| `seo-fiches.test.ts` | Le titre et la description Google de chaque fiche, prix du moteur compris, jamais coupés ; le prix de la prise de cotes jamais tapé dans les textes (il vient de `deplacement.ts`) ; les pages tables, bois massif, plafonds et zone présentes au plan du site ; les tailles de plafond citées (le plus grand, et le plus grand d'un seul tenant, donc livrable) sont celles du code ; une FAQ balisée est toujours une FAQ affichée, chaque question n'est balisée qu'une fois sur tout le site, un fil d'Ariane balisé est toujours affiché, et aucune note ni aucun avis n'est balisé. |
| `redirections.test.ts` | auboiacier.vercel.app renvoie au .fr, sauf les adresses `/api/` (le webhook de Stripe ne suit pas une redirection). |
| `avis.test.ts` | La demande d'avis : la date d'envoi (paiement + fabrication la plus longue + 10 jours, lue sur les fiches ; « Prête à poser » ou « à retirer » attend « Posée » ou « Retirée »), un seul mail par commande et par client — même quand Resend ne répond pas clairement, même quand le cron tourne deux fois en même temps (Idempotency-Key, trace relue), même quand le client recommande des mois plus tard ou a dit non (fiche client Stripe) —, les seules commandes écartées (annulées, remboursées en totalité), rien sans lien d'avis, sans Resend ni sans `CRON_SECRET`, un texte sans contrepartie ni note suggérée, la redirection de `/avis`, les textes juridiques, et la carte à imprimer à jour. |
| `qr.test.ts` | Le QR code de la carte des colis, comparé à des références qui ne viennent pas du site : les exemples de la norme et les codes du générateur de macOS (CoreImage). |
| `catalogue.ts` | Pas un test : la boîte à outils commune (parcourir le catalogue, fabriquer des cotes de test). |
| `garde-corps-outil.test.ts` | Le garde-corps calculé par le site est celui de l'outil de plans, au caractère près : hauteur, croix, débit, dessins, prix, livraison, devis. Il compare au fichier `reference/garde-corps-outil.json`, que le script `npm run garde-corps:extraire` fabrique en faisant tourner l'outil lui-même. |
| `prix-garde-corps.test.ts` | Les règles du garde-corps (décisions du 29/09) : hauteur à la norme, carré 16 et le moins de croix possible, « à étudier » quand rien ne passe, prix jamais sous le plancher, remise de plusieurs pièces, livraison, adresse de `/api/prix-garde-corps`. |
| `garde-corps-decor.test.ts` | Le décor à volutes (bibliothèque de styles de l'outil) : l'identifiant lu et écrit, tout le reste refusé ; les listes du site sont celles de l'outil ; le premier carré où le calcul complet de l'outil n'a aucune alerte, au prix du chiffrage ; sans décor rien ne change, les modèles du catalogue, le prix d'appel et le moins cher proposé d'office n'en dépendent pas ; panier, commande et devis au prix de la route, le décor nommé en français et en anglais ; les traits envoyés au navigateur bornés et relus ; aucun prix ni temps du décor en clair. |
| `frontiere-chiffrage.test.ts` | Les coûts de l'atelier ne sortent jamais du serveur : aucun composant du navigateur n'atteint le calcul, une seule porte (`prix-garde-corps.server.ts`), rien en clair dans le dépôt public, la clé hors de git. |
| `donnees-google.test.ts` | Ce que Google reçoit d'une fiche (données structurées Product / Offer) : un prix bas égal au « à partir de » affiché par la page, pour chaque fiche, et une disponibilité honnête (précommande jusqu'à l'ouverture des commandes le 7/12/2026, disponible ensuite). Après `npx next build`, il relit aussi chaque page fabriquée et y compare le prix des données Google au prix affiché. |
| `provenance-compteurs.test.ts` | « Comment nous avez-vous connu ? », la provenance des liens marqués (utm, annonce Google) et les compteurs du site : seules les réponses du menu passent, rien n'est écrit sur l'appareil du visiteur, l'identifiant de clic Google n'est jamais gardé, et un compteur ne porte ni nom, ni e-mail, ni adresse IP, ni cookie. |

## La règle du jeu quand on écrit un test ici

**On ne fige aucun montant.** Écrire « la table de 8 coûte 3 590 € » ferait
échouer les tests au premier changement de tarif, pour rien. On écrit des
règles : « le prix monte quand la table s'allonge », « le sur-mesure n'est
jamais moins cher que le catalogue à cotes égales ». Les tarifs bougeront ; les
règles, non.

## La clé du chiffrage

Trois fichiers de tests ont besoin de la clé qui déchiffre les coûts de
l'atelier (`.env.chiffrage.local` à la racine du site, ignoré par git). Sans
elle, ils échouent avec un message qui dit quoi faire : copier ce fichier
depuis une autre copie du site. Ne jamais en fabriquer une nouvelle.

Après `npm run build`, `npm run garde-corps:verifier-build` prouve qu'aucun
coût n'est parti dans le JavaScript public (`.next/static`).

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

Un second test `todo`, dans `prix-garde-corps.test.ts` : *« le prix du
garde-corps ne baisse jamais quand la fenêtre s'élargit, même quand le carré
change »*. Au passage du carré de 18 au carré de 20, il peut baisser (exemple :
allège 300 mm, 1 425 mm de large = carré 18 et 4 croix, 850 € ; 1 430 mm =
carré 20 et 3 croix, 780 €). Deux causes, dans l'outil de plans : l'acier y est
compté au prix du carré de 16 quel que soit le carré, et le carré de 20 demande
moins de croix. Décision de Quentin, elle aussi.
