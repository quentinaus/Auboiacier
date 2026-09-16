"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Mesure d'audience Vercel : sans cookie, rien n'est écrit sur l'appareil
 * du visiteur, donc pas de bandeau de consentement (l'article 8 de la
 * politique de confidentialité décrit l'outil : le tenir à jour si on en
 * change). On enlève la partie « ?… » des adresses avant l'envoi : elle
 * porte l'identifiant Stripe de la page de remerciement (?session_id=) et
 * les cotes pré-remplies du formulaire de contact (?produit=&config=), qui
 * n'ont rien à faire dans des statistiques.
 *
 * Composant client à part : `beforeSend` est une fonction, elle ne peut pas
 * être passée depuis le layout, qui est un composant serveur. En
 * développement local le script n'envoie rien : les chiffres n'apparaissent
 * qu'en production, une fois l'onglet Analytics activé dans Vercel.
 */
export function MesureAudience() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
