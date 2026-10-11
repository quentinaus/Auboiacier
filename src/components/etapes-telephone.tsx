"use client";

/**
 * Le garde-corps sur téléphone, UNE QUESTION À LA FOIS (demande de Quentin, 05/10 au soir : « tu affiches une question,
 * quelle est la taille de la fenêtre, hop, il remplit, après il passe à l'autre… une fois qu'il a tout rempli, il voit
 * ses différents modèles et le prix »). Le croquis reste en haut ; dessous, cinq questions, puis le modèle, les finitions
 * et le prix. Le prix n'apparaît qu'une fois les questions remplies.
 */

/**
 * Le téléphone, debout ou TOURNÉ (paysage : 31,25 rem = 500 px de haut au plus, moins de 1024 px de large). Tourné, il
 * est assez large pour la mise en page tablette, mais trop bas : les cartes étaient coupées. Il garde donc le parcours en
 * questions, en deux colonnes (globals.css, même requête).
 */
export const MEDIA_TELEPHONE_GC = "(max-width: 47.999rem), (orientation: landscape) and (max-height: 31.25rem) and (max-width: 63.999rem)";

/**
 * Les questions d'abord (largeur en bas, largeur en haut, hauteur sous la fenêtre, hauteur de la fenêtre, étage, mur,
 * profondeur du tableau pour la fixation), puis le reste.
 */
export const QUESTIONS_GC = 7;
/** Après les questions : les finitions d'abord (demande de Quentin, 05/10), puis le modèle, puis le prix. */
export const ETAPE_FINITIONS_GC = QUESTIONS_GC + 1;
export const ETAPE_MODELE_GC = QUESTIONS_GC + 2;

export const ETAPES_GC = [
  {
    courtFr: "Largeur",
    courtEn: "Width",
    questionFr: "Quelle largeur en bas, d'un mur à l'autre\u00a0?",
    questionEn: "How wide at the bottom, wall to wall?",
    aideFr: "Posez le mètre juste au-dessus de l'appui de fenêtre (le mètre jaune sur le dessin). La cote exacte, en millimètres.",
    aideEn: "Put the tape just above the window sill (the yellow tape on the drawing). The exact size, in millimetres.",
  },
  {
    courtFr: "Murs",
    courtEn: "Walls",
    questionFr: "Vos murs sont-ils bien droits\u00a0?",
    questionEn: "Are your walls straight?",
    aideFr: "Dans une maison ancienne, ce n'est pas toujours le cas. Si vous ne savez pas, mesurez les deux\u00a0: en bas au ras de l'appui, et à 1\u00a0m du sol.",
    aideEn: "In an older house this is not always so. If you do not know, measure both: at the bottom, at the sill, and 1 m from the floor.",
  },
  {
    courtFr: "Hauteur",
    courtEn: "Height",
    questionFr: "Quelle hauteur entre le sol et le bas de la fenêtre\u00a0?",
    questionEn: "How high is the bottom of the window from the floor?",
    aideFr: "Du sol (parquet ou carrelage) jusqu'au-dessus de l'appui, en millimètres.",
    aideEn: "From the floor (wood or tiles) to the top of the sill, in millimetres.",
  },
  {
    courtFr: "Fenêtre",
    courtEn: "Window",
    questionFr: "Et la hauteur de la fenêtre\u00a0?",
    questionEn: "And the height of the window?",
    aideFr: "De l'appui jusqu'en haut de l'ouverture. Facultatif\u00a0: passez si vous ne savez pas.",
    aideEn: "From the sill to the top of the opening. Optional: skip it if you do not know.",
  },
  {
    courtFr: "Étage",
    courtEn: "Floor",
    questionFr: "Où est la fenêtre\u00a0?",
    questionEn: "Where is the window?",
    aideFr: "La norme en dépend.",
    aideEn: "The standard depends on it.",
  },
  {
    courtFr: "Mur",
    courtEn: "Wall",
    questionFr: "Dans quel mur fixer le garde-corps\u00a0?",
    questionEn: "What wall will the railing be fixed in?",
    aideFr: "Il décide de la fixation que nous fournissons.",
    aideEn: "It decides the fixings we supply.",
  },
  {
    // La fixation dans le mur (« Auboiacier », 07/10/2026) : les tiges se scellent dans le tableau.
    courtFr: "Tableau",
    courtEn: "Reveal",
    questionFr: "Quelle profondeur entre la façade et la fenêtre\u00a0?",
    questionEn: "How deep is it from the façade to the window?",
    aideFr: "Dehors, de l'angle du mur jusqu'au cadre de la fenêtre, en millimètres. Les fixations se scellent dans cette épaisseur.",
    aideEn: "Outside, from the corner of the wall to the window frame, in millimetres. The fixings are set in this depth.",
  },
  {
    courtFr: "Finitions",
    courtEn: "Finishes",
    questionFr: "Quelles finitions aimeriez-vous\u00a0?",
    questionEn: "Which finishes would you like?",
    aideFr: "La couleur de l'acier, la main courante et la rosace.",
    aideEn: "The steel colour, the handrail and the rosette.",
  },
  {
    courtFr: "Modèle",
    courtEn: "Model",
    questionFr: "Choisissez votre modèle",
    questionEn: "Choose your model",
    aideFr: "Tous sont aux normes pour votre fenêtre. Un modèle est déjà choisi pour vous\u00a0: touchez-en un autre si vous préférez.",
    aideEn: "All of them meet the standard for your window. One is already chosen for you: tap another if you prefer.",
  },
  {
    courtFr: "Prix",
    courtEn: "Price",
    questionFr: "Votre prix",
    questionEn: "Your price",
    aideFr: "Choisissez la livraison\u00a0: c'est prêt.",
    aideEn: "Choose the delivery: you are done.",
  },
] as const;

export const NB_ETAPES_GC = ETAPES_GC.length;

/** Les finitions du forgé : ni rosace ni verre (le décor remplit le cadre). */
const AIDE_FINITIONS_FORGE = { aideFr: "La couleur de l'acier et la main courante.", aideEn: "The steel colour and the handrail." };

/** L'étape « Modèle » du Garde-corps forgé à volutes : le choix du décor. */
const ETAPE_DECOR_GC = {
  courtFr: "Décor",
  courtEn: "Design",
  questionFr: "Choisissez votre décor",
  questionEn: "Choose your design",
  aideFr: "Chaque décor est dessiné et contrôlé à vos cotes. Un décor est déjà choisi pour vous\u00a0: touchez-en un autre si vous préférez.",
  aideEn: "Each design is drawn and checked to your measurements. One is already chosen for you: tap another if you prefer.",
};

/**
 * En haut, sous le croquis. Pendant les questions : « Question 2 sur 5 », une barre qui avance, et la question en
 * grand. Ensuite : Modèle, Finitions, Prix (on peut toucher chacun), « Mesures » pour revenir aux questions, et le prix.
 */
export function EnteteEtapes({
  etape,
  aller,
  locale,
  prix,
  sansModele,
  forge = false,
}: {
  /** La fiche du Garde-corps forgé à volutes : l'étape « Modèle » est celle du décor. */
  forge?: boolean;
  etape: number;
  aller: (etape: number) => void;
  locale: "fr" | "en";
  /** Le prix, écrit à droite une fois les questions remplies (null : pas encore de prix). */
  prix: string | null;
  /** Aucun modèle à choisir pour ces mesures (hors barème, sans garde-corps, à étudier) : l'étape « Modèle » ne promet rien. */
  sansModele: boolean;
}) {
  const fr = locale === "fr";
  // Le forgé choisit un décor, pas un modèle à croix : la même étape, ses mots à elle.
  const etapes = forge
    ? ETAPES_GC.map((e, i) => (i + 1 === ETAPE_MODELE_GC ? ETAPE_DECOR_GC : i + 1 === ETAPE_FINITIONS_GC ? { ...e, ...AIDE_FINITIONS_FORGE } : e))
    : ETAPES_GC;
  const courante = etapes[etape - 1] ?? etapes[0];
  const enQuestions = etape <= QUESTIONS_GC;
  const sansChoix = sansModele && etape === ETAPE_MODELE_GC;
  const question = sansChoix ? (fr ? "Votre garde-corps" : "Your railing") : fr ? courante.questionFr : courante.questionEn;
  const aide = sansChoix
    ? fr
      ? "Pour ces mesures, voici ce que nous vous proposons."
      : "For these measurements, here is what we offer."
    : fr
      ? courante.aideFr
      : courante.aideEn;
  return (
    <div>
      {enQuestions ? (
        <div className="flex items-center gap-2.5 px-1">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f6357]">
            {fr ? `Question ${etape} sur ${QUESTIONS_GC}` : `Question ${etape} of ${QUESTIONS_GC}`}
          </span>
          <span className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: QUESTIONS_GC }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < etape ? "bg-[#2b2320]" : "bg-[#2b2320]/15"}`} />
            ))}
          </span>
        </div>
      ) : (
        <nav aria-label={fr ? "Étapes de la configuration" : "Configuration steps"}>
          <ol className="flex rounded-full bg-[rgba(118,118,128,0.16)] p-0.5">
            {/* Revenir aux mesures : la première question, les réponses déjà remplies. */}
            <li className="min-w-0 flex-1">
              <button type="button" onClick={() => aller(1)} className="w-full truncate rounded-full px-1 py-2.5 text-[12.5px] font-semibold text-[#2b2320]">
                {fr ? "Mesures" : "Measures"}
              </button>
            </li>
            {etapes.slice(QUESTIONS_GC).map((e, i) => {
              const n = QUESTIONS_GC + i + 1;
              const active = n === etape;
              return (
                <li key={e.courtFr} className="min-w-0 flex-1">
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    onClick={() => aller(n)}
                    className={`w-full truncate rounded-full px-1 py-2.5 text-[12.5px] font-semibold transition-colors ${
                      active ? "bg-white text-[#1d1d1f] shadow-[0_3px_8px_rgba(0,0,0,0.12)]" : n < etape ? "text-[#2b2320]" : "text-[#7a6f64]"
                    }`}
                  >
                    {fr ? e.courtFr : e.courtEn}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="mt-2 flex items-start justify-between gap-3 px-1" aria-live="polite">
        <div className="min-w-0">
          <h3 className="text-[18px] font-semibold leading-tight text-[#1d1d1f]">{question}</h3>
          {/* L'aide s'efface clavier ouvert (globals.css) : la case doit rester au-dessus du clavier, même sur un petit iPhone. */}
          <p className="aide-question mt-0.5 text-[12.5px] leading-snug text-[#5c5140]">{aide}</p>
        </div>
        {/* Le prix, à partir du modèle : avant, il ne serait que celui d'un modèle que le client n'a pas choisi. */}
        {etape >= ETAPE_MODELE_GC && prix && <span className="shrink-0 text-[18px] font-semibold tabular-nums text-[#1d1d1f]">{prix}</span>}
      </div>
    </div>
  );
}

/**
 * Sous la carte : « Retour » et « Suivant ». Tant que la question n'a pas de réponse, « Suivant » est pâle ; touché, il dit
 * ce qui manque et met le doigt sur la case (un bouton grisé sans explication laisse le client perdu).
 */
export function NavEtape({
  etape,
  aller,
  locale,
  bloque,
  message,
  passer,
  onSuivant,
  forge = false,
}: {
  /** La fiche du Garde-corps forgé à volutes : « Voir mes décors ». */
  forge?: boolean;
  etape: number;
  aller: (etape: number) => void;
  locale: "fr" | "en";
  /** La question n'a pas encore de réponse : le bouton est pâle (il reste touchable, pour dire ce qui manque). */
  bloque: boolean;
  /** Écrit au-dessus des boutons : ce qui manque (après un essai), ou ce qu'il faut savoir. */
  message: string | null;
  /** Question facultative laissée vide : le bouton dit « Passer ». */
  passer: boolean;
  onSuivant: () => void;
}) {
  const fr = locale === "fr";
  const suivante = forge && etape + 1 === ETAPE_MODELE_GC ? ETAPE_DECOR_GC : ETAPES_GC[etape];
  const libelle =
    etape === QUESTIONS_GC
      ? fr
        ? "Suivant : mes finitions →"
        : "Next: my finishes →"
      : etape === ETAPE_FINITIONS_GC
        ? fr
          ? forge ? "Voir mes décors →" : "Voir mes modèles →"
          : forge ? "See my designs →" : "See my models →"
        : etape < QUESTIONS_GC
        ? passer
          ? fr
            ? "Passer →"
            : "Skip →"
          : fr
            ? "Suivant →"
            : "Next →"
        : fr
          ? `Suivant : ${suivante?.courtFr ?? ""} →`
          : `Next: ${suivante?.courtEn ?? ""} →`;
  return (
    <div>
      {message && (
        <p role="alert" className="mb-2 px-1 text-[12.5px] font-medium leading-snug text-[#7a4510]">
          {message}
        </p>
      )}
      <div className="flex items-center gap-2">
        {etape > 1 && (
          <button
            type="button"
            onClick={() => aller(etape - 1)}
            className="rounded-full bg-white/70 px-4 py-3 text-[14px] font-medium text-[#2b2320] ring-1 ring-[#2b2320]/15"
          >
            {fr ? "← Retour" : "← Back"}
          </button>
        )}
        {suivante && (
          <button
            type="button"
            onClick={onSuivant}
            className={`flex-1 rounded-full px-4 py-3 text-[15px] font-semibold text-white transition-colors ${bloque ? "bg-[#1d1d1f]/45" : "bg-[#1d1d1f]"}`}
          >
            {libelle}
          </button>
        )}
      </div>
    </div>
  );
}
