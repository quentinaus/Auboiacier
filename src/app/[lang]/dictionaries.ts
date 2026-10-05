import type { Locale } from "@/lib/i18n";
import { remplacerMarqueurs } from "@/lib/marqueurs";

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
 * marqueur (« {prixVisite} ») et remplacés ici par leur valeur
 * (src/lib/marqueurs.ts) : aucune page ne peut annoncer un ancien prix.
 */
export const getDictionary = (locale: Locale): Promise<Brut> => {
  let pret = prets.get(locale);
  if (!pret) {
    pret = dictionaries[locale]().then((brut) => remplacerMarqueurs(brut, locale));
    prets.set(locale, pret);
  }
  return pret;
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
