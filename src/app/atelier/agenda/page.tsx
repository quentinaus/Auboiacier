import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HEURES, libelleCreneau, rendezVousPayes, type RendezVous } from "@/lib/agenda";
import { SITE_URL } from "@/lib/seo";
import { serif } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Agenda des prises de cotes",
  robots: { index: false, follow: false },
};

/** Cette page ne se pré-calcule pas : elle lit Stripe à chaque visite. */
export const dynamic = "force-dynamic";

function Liste({ titre, liste }: { titre: string; liste: RendezVous[] }) {
return (
  <section className="mt-10">
    <h2 className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">{titre}</h2>
    {liste.length === 0 ? (
      <p className="mt-3 text-sm text-[#726757]">Rien pour l&apos;instant.</p>
    ) : (
      <ul className="mt-4 divide-y divide-[#e8e1d8] rounded-2xl border border-[#e8e1d8] bg-white">
        {liste.map((rdv) => (
          <li key={rdv.reference} className="grid gap-1 px-5 py-4 sm:grid-cols-[13rem_1fr]">
            <div>
              <p className="text-sm font-medium capitalize text-[#2b2320]">
                {libelleCreneau(rdv.creneau, "fr")}
              </p>
              <p className="text-xs text-[#726757]">
                {HEURES[rdv.creneau.demi].join(" – ")} · {rdv.reference}
              </p>
            </div>
            <div className="text-sm text-[#4a4038]">
              <p className="font-medium">
                {rdv.client.nom || "—"} · {rdv.commune || rdv.codePostal}
              </p>
              <p>{rdv.client.adresse}</p>
              <p>
                {rdv.client.telephone && (
                  <a href={`tel:${rdv.client.telephone}`} className="underline underline-offset-4">
                    {rdv.client.telephone}
                  </a>
                )}
                {rdv.client.telephone && rdv.client.email && " · "}
                {rdv.client.email && (
                  <a href={`mailto:${rdv.client.email}`} className="underline underline-offset-4">
                    {rdv.client.email}
                  </a>
                )}
              </p>
              {rdv.note && <p className="mt-1 text-xs text-[#726757]">{rdv.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);
}

/**
 * La page privée de Quentin : ses rendez-vous de prise de cotes, et le lien
 * pour les voir dans son propre calendrier. Protégée par la clé AGENDA_CLE :
 * sans elle, ou avec une autre, la page n'existe pas.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ cle?: string | string[] }>;
}) {
  const { cle } = await searchParams;
  const attendue = process.env.AGENDA_CLE;
  if (!attendue || typeof cle !== "string" || cle !== attendue) notFound();

  const rendezVous = await rendezVousPayes();
  const aujourdhui = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  const aVenir = rendezVous.filter((rdv) => rdv.creneau.date >= aujourdhui);
  const passes = rendezVous.filter((rdv) => rdv.creneau.date < aujourdhui).reverse();
  const flux = `${SITE_URL}/api/agenda/ics?cle=${encodeURIComponent(cle)}`;
  const fluxWebcal = flux.replace(/^https?:\/\//, "webcal://");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[#2b2320]">
      <h1 className={`${serif.className} text-3xl md:text-4xl`}>Prises de cotes</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5c5140]">
        Les rendez-vous payés par les clients. Ils viennent de Stripe : rien à saisir, rien à
        oublier. Pour les jours où tu ne veux pas de visite, mets les dates dans la variable
        <code className="mx-1 rounded bg-[#f1ece4] px-1.5 py-0.5 text-xs">AGENDA_INDISPONIBLE</code>
        sur Vercel (« 2026-09-20, 2026-09-21 »).
      </p>

      <section className="mt-8 rounded-2xl border border-[#e8e1d8] bg-[#fbfaf8] p-5">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">
          Dans ton calendrier, sur le téléphone
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5c5140]">
          Abonne-toi une fois : chaque nouveau rendez-vous apparaîtra tout seul, avec
          l&apos;adresse et le téléphone du client.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[#4a4038]">
          <li>
            <strong>iPhone / Mac (Apple Calendrier)</strong> :{" "}
            <a href={fluxWebcal} className="underline underline-offset-4">
              ouvrir l&apos;abonnement
            </a>{" "}
            puis « S&apos;abonner ».
          </li>
          <li>
            <strong>Google Agenda</strong> : Autres agendas → « + » → « À partir de l&apos;URL »,
            et coller cette adresse :
          </li>
        </ul>
        <p className="mt-2 select-all break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-[#2b2320]">
          {flux}
        </p>
        <p className="mt-2 text-xs text-[#726757]">
          Cette adresse contient ta clé : ne la partage pas. Google la relit toutes les
          quelques heures, Apple à la fréquence que tu choisis.
        </p>
      </section>

      <Liste titre="À venir" liste={aVenir} />
      <Liste titre="Passés" liste={passes} />
    </main>
  );
}
