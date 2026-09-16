import { notFound } from "next/navigation";

/**
 * Attrape toute adresse sous /fr ou /en qu'aucune page ne réclame
 * (/fr/nexiste-pas…) et déclare la page introuvable : c'est ce qui fait
 * afficher src/app/[lang]/not-found.tsx, dans la langue du site, au lieu de
 * la page grise « 404: This page could not be found. » de Next. Les vraies
 * pages passent toujours avant : Next ne vient ici qu'en dernier recours.
 * Le proxy (src/proxy.ts) préfixant toute adresse par une langue, aucun 404
 * ne passe à côté.
 */
export default function PageIntrouvable() {
  notFound();
}
