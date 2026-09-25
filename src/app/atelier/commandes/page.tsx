import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cleAgendaValide } from "@/lib/agenda";
import { commandesPayees } from "@/lib/commandes-atelier";
import { CarteCommande } from "@/components/commande-atelier";
import { serif } from "@/lib/fonts";
import { STATUTS, libelleStatut } from "@/lib/statut-commande";

export const metadata: Metadata = {
  title: "Commandes de l'atelier",
  robots: { index: false, follow: false },
};

/** Cette page ne se pré-calcule pas : elle lit Stripe à chaque visite. */
export const dynamic = "force-dynamic";

/**
 * La page privée de Quentin : ses commandes payées, et où elles en sont.
 * Protégée par la clé AGENDA_CLE, comme l'agenda — sans elle, ou avec une
 * autre, la page n'existe pas.
 *
 * Rien à saisir : les commandes viennent de Stripe. Quentin ne fait qu'une
 * chose ici, appuyer sur un bouton quand une pièce avance. Sans cet écran,
 * l'espace client afficherait « Commande reçue » pendant huit semaines et
 * donnerait l'impression d'un atelier qui a oublié la commande — pire que
 * pas de suivi du tout.
 */
export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ cle?: string | string[] }>;
}) {
  const { cle } = await searchParams;
  if (!cleAgendaValide(cle)) notFound();

  const commandes = await commandesPayees(true);
  const enCours = commandes.filter((c) => c.statut !== "livree");
  const terminees = commandes.filter((c) => c.statut === "livree");

  return (
    <main id="contenu" className="mx-auto max-w-3xl px-5 py-12 text-[#2b2320] md:px-6 md:py-16">
      <h1 className={`${serif.className} text-3xl md:text-4xl`}>Commandes</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">
        Les commandes payées, lues chez Stripe. Appuyez sur l&apos;état où en est la pièce : le
        client le verra dans son espace, et recevra un e-mail si la case est cochée.
      </p>
      <p className="mt-2 text-sm">
        <Link
          href={`/atelier/agenda?cle=${encodeURIComponent(cle)}`}
          className="text-[#5c5140] underline underline-offset-4"
        >
          Voir les prises de cotes
        </Link>
      </p>

      <Liste titre={`À suivre (${enCours.length})`} liste={enCours} cle={cle} />
      <Liste titre={`Terminées (${terminees.length})`} liste={terminees} cle={cle} />

      <p className="mt-12 border-t border-[#e8e1d8] pt-5 text-xs leading-relaxed text-[#726757]">
        Les quatre états : {STATUTS.map((s) => libelleStatut(s)).join(" · ")}. Une commande posée
        par l&apos;atelier dit « prête à poser » puis « posée » au lieu de « expédiée » et
        « livrée ». Les prises de cotes ne figurent pas ici : elles ont leur propre page.
      </p>
    </main>
  );
}

function Liste({
  titre,
  liste,
  cle,
}: {
  titre: string;
  liste: Awaited<ReturnType<typeof commandesPayees>>;
  cle: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">{titre}</h2>
      {liste.length === 0 ? (
        <p className="mt-3 text-sm text-[#726757]">Rien pour l&apos;instant.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {liste.map((commande) => (
            <CarteCommande key={commande.sessionId} commande={commande} cle={cle} />
          ))}
        </ul>
      )}
    </section>
  );
}
