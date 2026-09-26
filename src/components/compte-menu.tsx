"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompteDeconnexion } from "./compte-deconnexion";

/**
 * Le menu de l'espace client.
 *
 * Sur ordinateur : une colonne à gauche, toujours là. Sur téléphone : une
 * bande qui défile sous le titre — une colonne de 200 points mangerait la
 * moitié de l'écran, et c'est sur un téléphone que cet espace se consulte.
 *
 * Il ne s'affiche pas sur la page de connexion : on n'y est pas encore
 * connecté, et un menu vers « vos commandes » y serait une impasse. C'est le
 * cadre qui l'écarte (voir compte-cadre.tsx), pour que la colonne disparaisse
 * avec lui.
 */

type Entree = { href: string; libelle: string };

export function CompteMenu({
  entrees,
  deconnexion,
}: {
  entrees: Entree[];
  deconnexion: string;
}) {
  const chemin = usePathname();

  /* La page courante : l'entrée la PLUS LONGUE qui contienne le chemin.
     Sans cette règle, « /fr/compte » se croirait courant sur
     « /fr/compte/favoris », et deux entrées s'allumeraient à la fois. */
  const courante = entrees
    .filter((e) => chemin === e.href || chemin.startsWith(`${e.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  /* Sur téléphone, la bande défile : la page courante peut être hors de
     l'écran, à droite. On l'y ramène — mais en poussant la bande elle-même,
     pas avec scrollIntoView, qui ferait aussi sauter la page entière. */
  const bandeRef = useRef<HTMLUListElement>(null);
  const actifRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const bande = bandeRef.current;
    const actif = actifRef.current;
    if (!bande || !actif || bande.scrollWidth <= bande.clientWidth) return;
    bande.scrollLeft = Math.max(0, actif.offsetLeft - (bande.clientWidth - actif.offsetWidth) / 2);
  }, [courante]);

  return (
    <nav aria-label="Espace client" className="md:sticky md:top-24">
      <ul
        ref={bandeRef}
        className="-mx-6 flex snap-x gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
      >
        {entrees.map((entree) => {
          const active = entree.href === courante;
          return (
            <li key={entree.href} className="shrink-0 snap-start md:shrink">
              <Link
                ref={active ? actifRef : undefined}
                href={entree.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-colors md:whitespace-normal md:rounded-xl md:px-4 ${
                  active
                    ? "bg-[#2b2320] font-medium text-white"
                    : "bg-[#f4f0ea] text-[#5c5140] hover:bg-[#e8e1d8] md:bg-transparent"
                }`}
              >
                {entree.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Se déconnecter reste à part, sous un filet : ce n'est pas une
          destination, et on ne clique pas dessus en visant « vos commandes ». */}
      <p className="mt-6 hidden border-t border-[#e8e1d8] pt-5 md:block">
        <CompteDeconnexion libelle={deconnexion} />
      </p>
    </nav>
  );
}
