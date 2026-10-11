import type { Locale } from "@/lib/i18n";
// Pas de fichier *.server.* ici, même par ricochet : les composants du
// navigateur importent le type Dictionary de ce fichier
// (tests/frontiere-chiffrage.test.ts). Les prix du garde-corps se remplissent
// dans la page, avec remplacerMarqueursPrix (src/lib/marqueurs-prix.server.ts).
import { remplacerMarqueurs, verifierMarqueurs } from "@/lib/marqueurs";

const dictionaries = {
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

type Brut = Awaited<ReturnType<(typeof dictionaries)["fr"]>>;

/** Un dictionnaire par langue, marqueurs remplacés une fois pour toutes. */
const prets = new Map<Locale, Promise<Brut>>();

/**
 * Le dictionnaire d'une langue. Les chiffres qui appartiennent au code — le
 * prix de la prise de cotes, par exemple — y sont écrits sous forme de
 * marqueur (« {prixVisite} », « dès {prixTables} ») et remplacés ici par leur
 * valeur (src/lib/marqueurs.ts) : aucune page ne peut annoncer un ancien prix.
 *
 * Un marqueur sans valeur (prix d'une fiche sur devis, faute de frappe…)
 * fait échouer la fabrication des pages : jamais un chiffre écrit à la main,
 * jamais un « {prix:…} » affiché tel quel. Seuls ceux du garde-corps passent,
 * pour la page qui les remplit.
 */
export const getDictionary = (locale: Locale): Promise<Brut> => {
  let pret = prets.get(locale);
  if (!pret) {
    pret = dictionaries[locale]().then((brut) => {
      const dict = remplacerMarqueurs(brut, locale);
      verifierMarqueurs(dict, `dictionnaire ${locale}`, { serveurPermis: true });
      return dict;
    });
    prets.set(locale, pret);
  }
  return pret;
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
