/**
 * Réduction des photos dans le navigateur, avant l'envoi du formulaire.
 *
 * Une photo de téléphone pèse 4 à 12 Mo ; l'hébergeur coupe la requête à
 * 4,5 Mo. Plutôt que de limiter le client à deux photos, on les redessine ici
 * à 1 600 px de côté au plus, en JPEG : de quoi lire un plan ou juger un mur,
 * pour 300 à 500 Ko chacune. Un PDF ou une image qu'on ne sait pas décoder
 * part tel quel — le serveur garde le dernier mot sur le poids.
 *
 * Ce fichier n'est tiré que par un composant "use client".
 */

/** Le grand côté d'une photo envoyée, en pixels. */
export const COTE_MAX_PX = 1600;
/** Qualité JPEG : 0,82 ne se voit pas, et divise le poids par trois. */
export const QUALITE_JPEG = 0.82;
/** En dessous de ce poids, un JPEG part tel quel : le réduire n'apporterait rien. */
const DEJA_LEGER_OCTETS = 500 * 1024;

/** Une photo (JPEG, PNG, HEIC converti par le téléphone…), réduite si elle en vaut la peine. */
export async function reduirePhoto(fichier: File): Promise<File> {
  if (!fichier.type.startsWith("image/")) return fichier;
  if (/jpe?g$/i.test(fichier.type) && fichier.size <= DEJA_LEGER_OCTETS) return fichier;
  try {
    // « from-image » : la photo est remise droite selon ses données EXIF,
    // sinon un portrait pris au téléphone arrivait couché.
    const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    const rapport = Math.min(1, COTE_MAX_PX / Math.max(image.width, image.height));
    const largeur = Math.max(1, Math.round(image.width * rapport));
    const hauteur = Math.max(1, Math.round(image.height * rapport));
    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;
    const ctx = toile.getContext("2d");
    if (!ctx) return fichier;
    // Un PNG transparent sur fond blanc, pas noir.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.drawImage(image, 0, 0, largeur, hauteur);
    image.close();
    const blob = await new Promise<Blob | null>((resolve) => toile.toBlob(resolve, "image/jpeg", QUALITE_JPEG));
    if (!blob || blob.size >= fichier.size) return fichier;
    const nom = `${fichier.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], nom, { type: "image/jpeg", lastModified: fichier.lastModified });
  } catch {
    return fichier;
  }
}

/** Toutes les pièces jointes, photos réduites, dans l'ordre choisi. */
export function preparerFichiers(fichiers: readonly File[]): Promise<File[]> {
  return Promise.all(fichiers.map(reduirePhoto));
}
