/**
 * La photo de chaque section éditoriale sous une fiche (src/app/[lang]/artisanat/[slug]/page.tsx).
 *
 * Règle (relecture du 07/10/2026 : « les mêmes photos reviennent, ça fait catalogue bon marché ») : une photo
 * n'apparaît qu'UNE fois dans les sections d'une même fiche.
 * - Une section qui a sa propre photo (`image`) la garde, et cette photo n'est plus proposée aux autres.
 * - Les autres prennent, dans l'ordre, la photo suivante de la fiche qui n'a pas encore servi : en commençant par
 *   la deuxième (la première est déjà en grand, en haut de la fiche) et en gardant la première pour la fin.
 * - Quand il n'en reste plus, la section n'a pas de photo : la page la montre en carte de texte seul (la carte
 *   beige déjà dessinée pour une fiche sans photo), jamais une photo déjà vue plus haut.
 */
export type ChoixPhoto<P> = { propre: string } | { photo: P } | null;

export function photosDesSections<P extends { src: string }>(
  sections: readonly { image?: string }[],
  photos: readonly P[]
): ChoixPhoto<P>[] {
  const servies = new Set(sections.flatMap((section) => (section.image ? [section.image] : [])));
  const ordre = [...photos.slice(1), ...photos.slice(0, 1)];
  let suivante = 0;
  return sections.map((section) => {
    if (section.image) return { propre: section.image };
    while (suivante < ordre.length && servies.has(ordre[suivante].src)) suivante++;
    if (suivante >= ordre.length) return null;
    const photo = ordre[suivante++];
    servies.add(photo.src);
    return { photo };
  });
}
