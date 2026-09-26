"use client";

import { usePathname } from "next/navigation";

/**
 * Le cadre de l'espace client : deux colonnes avec le menu, ou une seule.
 *
 * Pourquoi un composant de navigateur pour si peu : la page de connexion
 * partage ce layout, mais n'a pas de menu — on n'y est pas encore connecté.
 * Sans cette distinction, elle gardait à sa gauche une colonne vide de
 * treize rem, et le formulaire se retrouvait de travers. Seul l'adresse en
 * cours permet de trancher, et une mise en page n'y a pas accès côté serveur.
 */
export function CompteCadre({
  menu,
  children,
  sansMenu,
}: {
  menu: React.ReactNode;
  children: React.ReactNode;
  /** Les adresses qui se passent du menu (la connexion). */
  sansMenu: string[];
}) {
  const chemin = usePathname();
  const nu = sansMenu.some(
    (adresse) => chemin === adresse || chemin.startsWith(`${adresse}/`)
  );

  if (nu) {
    return <div className="mx-auto max-w-xl px-6 py-16 md:py-24">{children}</div>;
  }

  return (
    /* Une seule colonne sur téléphone, deux à partir de la tablette. La
       colonne du menu est fixe : c'est la page qui prend le reste. */
    <div className="mx-auto max-w-5xl px-6 py-12 md:grid md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-12 md:py-20 lg:gap-16">
      {menu}
      <div className="mt-8 min-w-0 md:mt-0">{children}</div>
    </div>
  );
}
