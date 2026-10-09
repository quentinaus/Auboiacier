// FICHIER GÉNÉRÉ par scripts/extraire-moteur-garde-corps.mjs : NE PAS MODIFIER À LA MAIN.
// Le décor à volutes du garde-corps : assemblages, formes permises (MT_AVEC), noms de l'outil (DECOR_NOMS, MT_NOMS, ses boutons). SANS coûts.
// Source : l'outil de plans (plans-atelier.html), sha256 4df9f77df04cf93f92e2886b83c5a61772ca1b58314b23788b5a69a4548f777d
/* eslint-disable */
export type AssemblageDecorGC = "entre" | "frise" | "anneaux" | "hauteur" | "coeurs" | "medaillon" | "applique";
export type FormeDecorGC = "C" | "S" | "J" | "coeur" | "doubleC" | "poste" | "anneau";
function geler<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    for (const x of Object.values(o)) geler(x);
    Object.freeze(o);
  }
  return o;
}
export const DECORS_GC: {
  assemblages: readonly { id: AssemblageDecorGC; nom: string }[];
  formes: Readonly<Record<AssemblageDecorGC, readonly FormeDecorGC[]>>;
  nomsFormes: Readonly<Record<FormeDecorGC, string>>;
  bouts: readonly { id: "bouton" | "effile" | "droit"; nom: string }[];
  liaisons: readonly { id: "soudure"; nom: string }[];
  barreaux: readonly { id: "carre" | "torsade" | "bagues"; nom: string }[];
  frisesBasses: readonly { id: "aucune" | "postes"; nom: string }[];
} = geler({
 "assemblages": [
  {
   "id": "entre",
   "nom": "Volutes entre les barreaux"
  },
  {
   "id": "frise",
   "nom": "Frise de volutes"
  },
  {
   "id": "anneaux",
   "nom": "Frise d'anneaux (Directoire)"
  },
  {
   "id": "hauteur",
   "nom": "Grille de volutes"
  },
  {
   "id": "coeurs",
   "nom": "Cœurs forgés"
  },
  {
   "id": "medaillon",
   "nom": "Médaillon"
  },
  {
   "id": "applique",
   "nom": "Motifs en applique"
  }
 ],
 "formes": {
  "entre": [
   "C",
   "S",
   "J"
  ],
  "frise": [
   "S",
   "C",
   "poste"
  ],
  "anneaux": [
   "anneau"
  ],
  "hauteur": [
   "C",
   "S"
  ],
  "coeurs": [
   "coeur"
  ],
  "medaillon": [
   "coeur",
   "doubleC",
   "J"
  ],
  "applique": [
   "doubleC",
   "coeur",
   "C"
  ]
 },
 "nomsFormes": {
  "C": "Volute en C",
  "S": "Volute en S",
  "J": "Crosse",
  "coeur": "Cœur",
  "doubleC": "Double C",
  "poste": "Poste",
  "anneau": "Anneau"
 },
 "bouts": [
  {
   "id": "bouton",
   "nom": "Effilés à bouton"
  },
  {
   "id": "effile",
   "nom": "Effilés"
  },
  {
   "id": "droit",
   "nom": "Coupés droits"
  }
 ],
 "liaisons": [
  {
   "id": "soudure",
   "nom": "Soudées"
  }
 ],
 "barreaux": [
  {
   "id": "carre",
   "nom": "Carrés lisses"
  },
  {
   "id": "torsade",
   "nom": "Torsadés"
  },
  {
   "id": "bagues",
   "nom": "À bagues"
  }
 ],
 "frisesBasses": [
  {
   "id": "aucune",
   "nom": "Aucune"
  },
  {
   "id": "postes",
   "nom": "Postes"
  }
 ]
});
