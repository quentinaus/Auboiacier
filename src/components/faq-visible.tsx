import { serif } from "@/lib/fonts";
import { jsonLdFaq, scriptJsonLd } from "@/lib/seo";

/**
 * Les questions fréquentes d'une page de présentation, et leur balisage pour
 * Google, fabriqués depuis la MÊME liste : une question balisée est toujours
 * une question affichée (la règle de Google). Toutes restent dépliées.
 */
export function FaqVisible({
  titre,
  questions,
  className = "",
}: {
  titre: string;
  questions: { q: string; a: string }[];
  className?: string;
}) {
  return (
    <section className={className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={scriptJsonLd(
          jsonLdFaq(questions.map((item) => ({ question: item.q, reponse: item.a })))
        )}
      />
      <h2 className={`${serif.className} text-2xl text-[#2b2320]`}>{titre}</h2>
      <div className="mt-6 divide-y divide-[#e8e1d8] border-t border-[#e8e1d8]">
        {questions.map((item) => (
          <div key={item.q} className="py-6">
            <h3 className={`${serif.className} text-lg text-[#2b2320]`}>{item.q}</h3>
            <p className="mt-2 leading-relaxed text-[#4a4038]">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
