import { STATUTS, etapeStatut, libelleStatut, type Statut } from "@/lib/statut-commande";
import type { Locale } from "@/lib/i18n";

/**
 * La frise des quatre états. Verticale au téléphone, horizontale à partir de
 * « sm » : quatre étapes côte à côte sur 320 points sont illisibles.
 *
 * L'état en cours n'est JAMAIS signalé par la seule couleur — une pastille
 * pleine, un texte plus sombre et le mot « en cours » pour les lecteurs
 * d'écran : c'est la règle du site, et elle vaut aussi ici.
 */
export function SuiviCommande({
  statut,
  pose,
  locale,
}: {
  statut: Statut;
  pose: boolean;
  locale: Locale;
}) {
  const atteinte = etapeStatut(statut);
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-2">
      {STATUTS.map((s, i) => {
        const faite = i <= atteinte;
        const courante = i === atteinte;
        return (
          <li key={s} className="flex flex-1 items-center gap-3 py-2 sm:flex-col sm:items-start sm:gap-2 sm:py-0">
            <span className="flex items-center sm:w-full">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${faite ? "bg-[#2b2320]" : "border border-[#9a8d80] bg-white"}`}
              />
              <span
                aria-hidden="true"
                className={`ml-2 hidden h-px flex-1 sm:block ${i < atteinte ? "bg-[#2b2320]" : "bg-[#e8e1d8]"} ${i === STATUTS.length - 1 ? "sm:invisible" : ""}`}
              />
            </span>
            <span className={`text-sm sm:mt-1 ${courante ? "font-medium text-[#2b2320]" : faite ? "text-[#5c5140]" : "text-[#726757]"}`}>
              {libelleStatut(s, { pose, locale })}
              {courante && (
                <span className="sr-only">{locale === "en" ? " — current step" : " — étape en cours"}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
