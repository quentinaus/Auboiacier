# Mettre le site en ligne — guide pas à pas

Ce fichier s'adresse à Quentin. Aucune ligne de code à écrire : uniquement des
comptes à créer et des clés à copier-coller.

## Ce qui se passe quand un client achète

1. Le client remplit son panier et clique « Payer ma commande ».
2. Il est envoyé sur la page de paiement de **Stripe** (aucune donnée bancaire
   ne passe par le site).
3. Dès que le paiement est accepté, Stripe prévient le site, qui envoie
   **un e-mail de commande** à l'adresse `DEVIS_TO_EMAIL` avec : la référence,
   les pièces commandées avec leurs options, le total payé, le nom, le
   téléphone et l'adresse de livraison. Un simple « Répondre » écrit au client.
4. Le client reçoit une confirmation, puis sa facture, envoyée par Stripe.
5. La commande reste consultable pour toujours dans Stripe > Paiements
   (et dans l'application mobile Stripe).

Une demande de devis suit le même chemin, sans paiement : elle arrive par
e-mail, avec les photos jointes, et « Répondre » écrit au prospect.

## Les comptes à créer (deux, gratuits)

| Service | À quoi ça sert | Coût |
|---|---|---|
| **Stripe** | encaisser les paiements, garder les commandes, éditer les factures | gratuit, commission par vente |
| **Resend** | envoyer les e-mails de commande et de devis | gratuit jusqu'à 3 000 e-mails/mois |

Vercel (l'hébergement) est le troisième, gratuit lui aussi pour démarrer.

## Les étapes, dans l'ordre

1. **Créer le compte Stripe** sur stripe.com.
2. **Copier la clé de test** : laisser « Mode test » allumé, puis
   Développeurs > Clés API > Clé secrète (commence par `sk_test_`).
3. **Créer le compte Resend**, ajouter le domaine `auboiacier.fr` et recopier
   les lignes DNS demandées chez le vendeur du domaine. Tant que le domaine
   n'est pas vérifié, Resend n'écrit qu'à l'adresse d'inscription du compte.
4. **Copier la clé Resend** (commence par `re_`, affichée une seule fois).
5. **Publier le site sur Vercel** (Add New > Project > Deploy).
6. **Coller les clés** dans Vercel : Settings > Environment Variables.
   Les variables sont listées dans `.env.example`. Cinq sont obligatoires :
   `RESEND_API_KEY`, `DEVIS_FROM_EMAIL`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET` et `NEXT_PUBLIC_SITE_URL`. Tant qu'il en manque une,
   le site refuse d'ouvrir le paiement — c'est voulu.
   `DEVIS_FROM_EMAIL` doit porter le domaine **vérifié** chez Resend
   (`Auboiacier <contact@auboiacier.fr>`). L'adresse de démonstration
   `onboarding@resend.dev` n'a le droit d'écrire qu'au titulaire du compte
   Resend : avec elle, un client paierait sans jamais recevoir sa
   confirmation. Le site refuse donc d'encaisser tant qu'elle est en place.
   `NEXT_PUBLIC_SITE_URL` s'écrit **toujours sans `www` et sans barre à la
   fin** : `https://auboiacier.fr`. C'est l'adresse officielle du site ; les
   visiteurs qui tapent `www.auboiacier.fr` y sont renvoyés automatiquement
   (le fichier `vercel.json` s'en charge). Dans Vercel > Settings > Domains,
   ajouter les deux domaines et mettre `auboiacier.fr` en « Primary ».
7. **Créer le webhook** dans Stripe : Développeurs > Webhooks > Ajouter un
   endpoint. URL : `https://auboiacier.fr/api/stripe/webhook`.
   Événements à cocher : `checkout.session.completed` et
   `checkout.session.async_payment_succeeded`. Copier le « Signing secret »
   (`whsec_`) dans Vercel.
8. **Redéployer** (Deployments > … > Redeploy). Sans ça, les clés ne sont pas
   prises en compte : c'est l'oubli le plus fréquent.
9. **Faire une commande d'essai** avec la carte de test `4242 4242 4242 4242`,
   n'importe quelle date future et n'importe quel code. Vérifier : l'e-mail de
   commande arrive, le client reçoit sa confirmation, la commande apparaît dans
   Stripe, le panier s'est vidé.
10. **Activer le compte Stripe pour de vrai** (SIRET, pièce d'identité, IBAN),
    puis reprendre la clé `sk_live_` et **recréer le webhook en mode réel**
    (le `whsec_` est différent).
11. **Remplir les textes légaux** : les pages Conditions générales de vente et
    Mentions légales existent mais attendent la raison sociale, le statut, le
    SIRET, l'adresse, le téléphone et le régime de TVA.
12. **Remplir le bas des factures** (obligatoire avant la première vente
    réelle). Stripe édite la facture du client, mais une facture française doit
    porter les mentions de l'entreprise. Elles se collent dans Vercel, comme les
    clés, dans ces cinq variables :
    - `FACTURE_RAISON_SOCIALE` — nom et statut (ex. « Auboiacier — EI Quentin Aumercier »)
    - `FACTURE_ADRESSE` — l'adresse du siège, sur une ligne
    - `FACTURE_SIRET` — SIRET, code APE, chambre de métiers
    - `FACTURE_TVA` — soit « TVA non applicable, art. 293 B du CGI », soit le numéro de TVA
    - `FACTURE_ASSURANCE` — l'assurance décennale (dès qu'il y a de la pose)

    Tant qu'elles sont vides, le bas de facture reste vide : le site n'invente
    rien sur un document comptable. Il n'y a rien à écrire dans le code.
13. **Faire connaître l'atelier à Google** (facultatif, mais c'est ce qui fait
    apparaître le téléphone, les horaires et les avis dans les résultats) :
    créer la fiche Google de l'atelier (Google Business Profile), puis remplir
    dans Vercel `NEXT_PUBLIC_ATELIER_TELEPHONE`, `NEXT_PUBLIC_ATELIER_HORAIRES`,
    `NEXT_PUBLIC_ATELIER_FACEBOOK`, `NEXT_PUBLIC_ATELIER_INSTAGRAM` et
    `NEXT_PUBLIC_ATELIER_GOOGLE`. Chaque case laissée vide est simplement
    ignorée. Redéployer ensuite.

## Ce que le site attend de toi, et que personne d'autre ne peut écrire

Le code est prêt et se tait tant que ces valeurs sont vides : rien ne s'affiche
« à compléter » sur le site, mais rien ne s'invente non plus.

**Sans ça, on ne peut pas vendre**

- [ ] Identité de l'entreprise : raison sociale, statut, SIRET, adresse du
      siège, numéro de TVA → `src/lib/entreprise.ts`. Elle s'affiche sur les
      mentions légales ET sur la politique de confidentialité : sans elle, le
      « responsable du traitement » n'est pas identifiable (RGPD).
- [ ] Régime de TVA → `TVA_MENTION` en haut de `src/app/[lang]/cgv/page.tsx`
      (franchise en base : « TVA non applicable, article 293 B du CGI » ;
      sinon : « Prix TTC, TVA 20 % incluse — n° TVA FR… »).
- [ ] Médiateur de la consommation : l'adhésion est obligatoire pour vendre en
      ligne à des particuliers → `MEDIATEUR`, même fichier.
- [ ] Le domaine `auboiacier.fr` vérifié chez Resend, et `DEVIS_FROM_EMAIL`
      réglé dessus (voir plus haut : sans ça le site refuse d'encaisser).
- [ ] Les cinq variables obligatoires dans Vercel.

**Pour que la politique de confidentialité dise vrai**

La page `/fr/confidentialite` annonce quatre choses que seul toi peux rendre
vraies. Tant qu'un point n'est pas fait, le texte correspondant ment : à
régler avant la mise en ligne, ou à retirer du texte (voir les remarques).

- [ ] Stripe > Settings > Business > Public details (ou Branding) :
      « Privacy policy » = `https://auboiacier.fr/fr/confidentialite` et
      « Terms of service » = `https://auboiacier.fr/fr/cgv`. La page de
      paiement Stripe affiche alors ces deux liens en bas. Ne PAS ajouter de
      case « j'accepte les CGV » côté Stripe : elle est déjà cochée au panier.
- [ ] Vercel : les fonctions s'exécutent à Paris. C'est déjà écrit dans
      `vercel.json` (`"regions": ["cdg1"]`) ; vérifier après le premier
      déploiement dans Project > Settings > Functions > Region que « Paris »
      apparaît bien. C'est la moitié de la phrase « fonctions du site à
      Paris » de l'article 5.
- [ ] Resend > Domains : au moment d'ajouter `auboiacier.fr`, choisir la
      région **eu-west-1 (Ireland)**. C'est l'autre moitié de la phrase
      (« envoi des e-mails depuis l'Irlande »). Si tu ne le fais pas, supprime
      la phrase « Lorsque le prestataire le permet, nous choisissons une
      exécution en Europe (…) » de l'article 5, dans `fr.json` ET `en.json`.
- [ ] Validation en deux étapes (2FA) activée sur Gmail, Stripe, Vercel et
      Resend : l'article 9 l'annonce. Sinon, retirer « et validation en deux
      étapes » / « and two-step verification » du texte.
- [ ] Mesure d'audience : le site embarque **Vercel Web Analytics** (sans
      cookie, donc sans bandeau ; `src/components/analytics.tsx`), et
      l'article 8 le décrit. Pour que les chiffres arrivent : Vercel > Project
      > onglet Analytics > Enable, puis redéployer (Deployments > … >
      Redeploy). Ouvrir 2-3 pages du site en ligne et attendre une minute :
      les vues apparaissent. Si un jour l'outil est retiré ou remplacé, changer
      le paragraphe « Mesure d'audience » de l'article 8 (les deux langues) le
      MÊME jour. Jamais Google Analytics, Meta Pixel, YouTube ou Google Maps
      embarqués : chacun réintroduit l'obligation d'un bandeau cookies.
- [ ] Tenir, dans un document privé (pas sur le site), un registre des
      traitements en trois lignes : devis / commande / journaux techniques.
      L'article 30 du RGPD l'exige même pour une entreprise individuelle.

**Pour les prises de cotes à domicile**

- [ ] `AGENDA_CLE` dans Vercel : au moins 30 caractères tirés au hasard — ne
      l'invente pas, fais-la fabriquer par `openssl rand -base64 30` dans le
      Terminal et colle le résultat. Elle ouvre ta page privée
      `https://auboiacier.fr/atelier/agenda?cle=TA_CLE` — la liste des
      rendez-vous payés, avec l'adresse et le téléphone du client — et le flux
      calendrier. Sur cette page, un lien « ouvrir l'abonnement » ajoute les
      rendez-vous dans Apple Calendrier ; pour Google Agenda, colle l'adresse
      du flux dans « Autres agendas → À partir de l'URL ». Chaque nouveau
      rendez-vous apparaît ensuite tout seul sur ton téléphone. La clé voyage
      dans l'adresse : si tu as partagé le lien par erreur, change-la dans
      Vercel et réabonne ton calendrier.
- [ ] `AGENDA_INDISPONIBLE` (facultatif) : les jours où tu ne veux pas de
      visite, séparés par des virgules (`2026-09-20, 2026-09-21`). Le site ne
      propose jamais le samedi, le dimanche, ni les trois prochains jours.
- [ ] Vérifier le prix du déplacement : 19,99 € jusqu'à 30 km autour de Saumur,
      puis 0,45 €/km aller-retour + 40 €/h de route et de mesure (1 h sur place
      comptée). Angers ≈ 161 €, Tours ≈ 208 €, Paris ≈ 752 €.

**Sans ça, le référencement local ne démarre pas**

- [ ] Créer la fiche Google Business Profile de l'atelier.
- [ ] `NEXT_PUBLIC_ATELIER_TELEPHONE` (format `+33612345678`),
      `NEXT_PUBLIC_ATELIER_HORAIRES` (`Mo-Fr 08:00-18:00; Sa 09:00-12:00`) et
      `NEXT_PUBLIC_ATELIER_GOOGLE` (l'adresse de la fiche). Le téléphone et les
      horaires s'affichent alors tout seuls en bas de page et sur la page
      Contact, et partent à Google : les trois doivent être écrits pareil
      partout, c'est ce que Google compare.
- [ ] L'adresse de l'atelier dans `ATELIER.rue` (`src/lib/seo.ts`) si elle est
      publique.

**Trois décisions de métier**

- [ ] Les vraies photos. Beaucoup d'images du site sont des rendus ou des
      photos d'autres fabricants : elles doivent être remplacées avant la mise
      en ligne, pour le droit d'auteur comme pour la confiance.
- [ ] La livraison et le montage sont-ils vraiment offerts **partout** en
      France métropolitaine ? C'est écrit sur chaque fiche et dans le panier.
- [ ] Les prix. Ceux du catalogue viennent d'un barème cohérent, mais c'est ton
      chiffrage. Deux points à trancher : le supplément noyer est un forfait
      (+710 € sur une table, quelle que soit sa taille) — sur une grande table
      sur mesure, ça peut passer sous le prix du bois ; et les tables
      d'extérieur restent nettement moins chères que le seul piétement de la
      table d'intérieur.
- [ ] Les avis clients : la page d'accueil a la place prête et n'affiche rien
      tant qu'il n'y a pas de vrais retours. On n'en écrit pas.

## Si quelque chose ne marche plus

- **Une commande n'est pas arrivée par e-mail** → Stripe > Développeurs >
  Webhooks > l'endpoint : les échecs apparaissent en rouge, avec un bouton
  « Renvoyer ». Un clic et le bon de commande repart. L'argent, lui, est déjà
  encaissé et la commande est dans Stripe > Paiements.
- **Retrouver une commande même si l'e-mail ne part jamais** → à chaque échec
  d'envoi, le site recopie la commande entière dans ses journaux : Vercel >
  le projet > Observability > Logs, puis chercher `COMMANDE-A-RECOPIER`. Tout y
  est sur une seule ligne : référence, pièces, options, montants, nom, e-mail,
  téléphone et adresse de livraison.
- **Le bouton « Payer ma commande » ne fait rien / dit que le paiement est
  indisponible** → il manque une des quatre variables obligatoires (le plus
  souvent `STRIPE_WEBHOOK_SECRET`), ou le site n'a pas été redéployé depuis.
- **Aucun e-mail ne part** → Resend > Logs : la raison du refus y est écrite.
  Le plus souvent, le domaine n'est pas encore vérifié.
- **Une clé a été modifiée** → toujours redéployer ensuite dans Vercel.
- **Filet de sécurité** : dans Stripe > Paramètres > Notifications par e-mail,
  activer « Paiements réussis ». Même si le site tombe en panne, Stripe
  prévient directement par e-mail à chaque vente.
