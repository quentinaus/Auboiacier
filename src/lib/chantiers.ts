/**
 * Les images de la page « Projets et visuels » (/realisations) : les vraies photos
 * prises sur le chantier et à l'atelier, puis les modèles en images. Qui est une
 * vraie photo et qui est une image d'illustration se lit dans src/lib/visuels.ts,
 * pas ici : la page les range en deux groupes, et chaque visuel porte la mention.
 * La zone d'intervention montre les vraies photos qui portent une commune
 * (« Réalisations près de chez vous ») — la preuve locale, à la place de pages
 * recopiées ville par ville. Un visuel n'y apparaît jamais.
 */

/** Les familles publiées, telles qu'elles s'écrivent dans l'adresse. */
export type Famille = "table" | "garde-corps" | "escalier" | "plafond" | "verriere" | "sculpture";

/** Les clés de légende, une par photo — chacune existe dans les deux dictionnaires. */
export type CleLegende =
  | "altTableMikado"
  | "altGardeCorpsInterieur"
  | "altGardeCorpsRue"
  | "altEscalierSalle"
  | "altEscalierMarche"
  | "altSalle"
  | "altPlafondBeton"
  | "altLucarneCouleur"
  | "altHaloSalle"
  | "altReunion"
  | "altVerriereSalon"
  | "altVerriereCroisillon"
  | "altSculptureCheval"
  | "altSculptureTorse"
  | "altVerrierePose"
  | "altVerrierePoseDetail";

/**
 * Images publiées. Chacune porte sa famille et la clé de sa légende dans le
 * dictionnaire : la légende change donc de langue avec le reste du site.
 * `lien`, quand il existe, mène à la fiche de la pièce posée — pour qu'un
 * visiteur convaincu par une photo puisse configurer la sienne tout de
 * suite.
 * Pour ajouter une image : une ligne ici, et la légende dans les deux
 * dictionnaires (realisations.altXxx), en français et en anglais. Une vraie
 * photo de chantier s'ajoute AUSSI à VRAIES_PHOTOS (src/lib/visuels.ts).
 * `commune` : la commune du chantier, seulement pour une vraie photo, quand
 * elle est vraie et que le client est d'accord. Le chantier apparaît alors
 * aussi sur la page « Zone d'intervention ».
 */
export const photos: {
  src: string;
  alt: CleLegende;
  famille: Famille;
  lien?: string;
  video?: string;
  portrait?: boolean;
  commune?: string;
}[] = [
  {
    src: "/images/mikado/ambiance.jpg",
    alt: "altTableMikado",
    famille: "table",
    lien: "table-mikado",
  },
  {
    src: "/images/garde-corps/fenetre-pose.jpg",
    alt: "altGardeCorpsInterieur",
    famille: "garde-corps",
    lien: "garde-corps",
  },
  {
    src: "/images/garde-corps/fenetre-rue.jpg",
    alt: "altGardeCorpsRue",
    famille: "garde-corps",
    lien: "garde-corps",
  },
  {
    src: "/images/escalier/limon-droit.jpg",
    alt: "altEscalierSalle",
    famille: "escalier",
    lien: "escalier-limon-central",
  },
  {
    src: "/images/escalier/marche-detail.jpg",
    alt: "altEscalierMarche",
    famille: "escalier",
    lien: "escalier-limon-central",
  },
  {
    src: "/images/salle-plafond-mikado.jpg",
    alt: "altSalle",
    famille: "plafond",
    lien: "plafond-lumineux-lucarne",
  },
  {
    src: "/images/salle-plafond-tuile.jpg",
    alt: "altPlafondBeton",
    famille: "plafond",
    lien: "plafond-lumineux-lucarne",
  },
  {
    src: "/images/lumiere/lucarne-rgb.jpg",
    alt: "altLucarneCouleur",
    famille: "plafond",
    lien: "plafond-lumineux-lucarne",
  },
  {
    src: "/images/lumiere/rond-allume.jpg",
    alt: "altHaloSalle",
    famille: "plafond",
    lien: "plafond-lumineux-halo",
  },
  {
    src: "/images/lumiere/salle-ronde.jpg",
    alt: "altReunion",
    famille: "plafond",
    lien: "plafond-lumineux-halo",
  },
  {
    src: "/images/verriere-interieure.jpg",
    alt: "altVerriereSalon",
    famille: "verriere",
    lien: "verrieres",
  },
  {
    src: "/images/verriere-croisillon.jpg",
    alt: "altVerriereCroisillon",
    famille: "verriere",
    lien: "verrieres",
  },
  // La pose d'une verrière sur chantier (photos de l'atelier, en portrait) : le travail tel qu'il se fait.
  { src: "/images/verriere-pose-chantier-2.jpg", alt: "altVerrierePoseDetail", famille: "verriere", lien: "verrieres", portrait: true },
  { src: "/images/verriere-pose-chantier-4.jpg", alt: "altVerrierePose", famille: "verriere", lien: "verrieres", portrait: true },
  {
    src: "/images/sculpture-cheval-v2.jpg",
    alt: "altSculptureCheval",
    famille: "sculpture",
    lien: "sculptures",
  },
  {
    // Une vidéo en boucle : `src` est sa photo d'ouverture.
    src: "/images/torse-acier-poster.jpg",
    video: "/videos/torse-acier.mp4",
    alt: "altSculptureTorse",
    famille: "sculpture",
    lien: "sculptures",
  },
];
