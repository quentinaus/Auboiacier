import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

/**
 * « Comment votre pièce est faite » : les cinq étapes d'une commande, de vos cotes à la livraison (plan de
 * référencement, 1.2). Compact : une rangée de cinq sur grand écran, une liste serrée sur téléphone. Pas d'image tant
 * que les vraies photos de l'atelier n'existent pas.
 */
export function EtapesFabrication({ titre, etapes }: { titre: string; etapes: readonly { t: string; d: string }[] }) {
  return (
    <section className="bg-[#ffffff] px-6 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Apparition>
          <h2 className={`${serif.className} text-balance text-[1.8rem] leading-[1.08] tracking-[-0.018em] text-[#2b2320] sm:text-[2.2rem]`}>
            {titre}
          </h2>
        </Apparition>
        <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 md:mt-10 lg:grid-cols-5">
          {etapes.map((etape, i) => (
            <li key={etape.t}>
              <Apparition retard={(i % 5) * 80} className="flex gap-4 lg:block">
                <span className={`${serif.className} text-[1.6rem] leading-none text-[#6f6357] lg:block`}>{i + 1}</span>
                <div className="lg:mt-3">
                  <h3 className="text-[16px] font-semibold leading-tight text-[#2b2320]">{etape.t}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.55] text-[#4a4038]">{etape.d}</p>
                </div>
              </Apparition>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
