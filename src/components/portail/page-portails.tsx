import Link from "next/link";
import { serif } from "@/lib/fonts";
import { focusVisible } from "@/lib/ui";
import { CONTACT_PUBLIC, horairesLisibles, telephoneLisible } from "@/lib/seo";
import type { Langue, SlugPortail } from "@/lib/portails-base";
import { ORDRE_MODELES, STYLE_VITRINE_DEPART, TXT, type ModeleCarte } from "@/lib/portails-page";
import { donneesPagePortails } from "@/lib/portails-page.server";
import { EtapesFabrication } from "@/components/etapes-fabrication";
import { VitrinePortail } from "./vitrine-portail";
import { PortailsModeles } from "./portails-modeles";
import "./page-portails.css";

/**
 * La page des portails (/fr|en/artisanat/famille/portail), refaite le 12/10/2026 (Quentin : « moche, pas intuitive, ni premium
 * ni pro »). Composant SERVEUR : la tête, les trois faits, les étapes et le contact n'envoient aucun JavaScript, et tous les prix
 * sont calculés ici (donneesPagePortails). Seules la vitrine (style et teinte) et les modèles avec leur guide (trois réponses)
 * sont des îlots du navigateur ; leurs données arrivent en nombres et en textes simples. Cahier des charges : section 2 et 3.
 */
type Props = {
  locale: Langue;
  /** Le fil d'Ariane : Accueil › La collection › cette page (balisé pour Google dans page.tsx). */
  fil: { aria: string; accueil: string; collection: string; courant: string };
  h1: string;
  phrase: string;
  /** Le nom de chaque modèle, tel que le catalogue le donne dans la langue de la page. */
  noms: Record<SlugPortail, string>;
  /** Les deux pages voisines (le guide du choix, le métallier) : on les garde en bas de page. */
  liens: { href: string; label: string }[];
};

/** Un titre de bande : le même que celui des étapes. */
const TITRE_BANDE = `${serif.className} text-balance text-[1.8rem] leading-[1.08] tracking-[-0.018em] text-[#2b2320] sm:text-[2.2rem]`;

export function PagePortails({ locale, fil, h1, phrase, noms, liens }: Props) {
  const x = TXT[locale];
  const donnees = donneesPagePortails();
  const modeles: ModeleCarte[] = ORDRE_MODELES.map((slug) => ({ slug, nom: noms[slug] ?? slug, ...donnees.modeles[slug] }));

  // En français, une espace insécable avant « ? ! : ; % » et après « : jamais un signe seul en début de ligne.
  const f = (texte: string) => (locale === "fr" ? texte.replace(/ ([?!:;%»])/g, "\u00a0$1").replace(/« /g, "«\u00a0") : texte);
  const etapes = x.etapes.liste.map((e) => ({ t: f(e.t), d: f(e.d) }));

  // Le téléphone s'écrit dans la phrase : on la compose, puis on la coupe au numéro pour y poser le lien.
  // Les horaires passent sur leur ligne, par plages (« Lun–Ven 07:00–17:00 · Sam 09:00–16:00 ») : une plage ne se coupe jamais en deux lignes.
  const telephone = telephoneLisible();
  const [avantTel, apresTel] = x.contact.texte(telephone, horairesLisibles(locale)).split(telephone);
  const [, point = "", horaires = ""] = apresTel.trimEnd().match(/^(\.?)\s*([\s\S]*)$/) ?? [];
  const plages = horaires.split(" · ").filter(Boolean);

  // Le fil d'Ariane : la zone à toucher fait 44 px de haut sans bouger la mise en page (marges négatives égales au remplissage).
  const lienFil = `-mx-2 -my-3 px-2 py-3 hover:text-[#2b2320] ${focusVisible}`;

  return (
    <>
      {/* Tête, vitrine et faits partagent le conteneur du site et la colonne d'info (--info, page-portails.css). */}
      <div className="pp-page mx-auto max-w-6xl px-6 pt-6 lg:pt-8">
        <nav aria-label={fil.aria} className="flex flex-wrap items-center gap-x-2 text-[15px] text-[#6f6357]">
          <Link href={`/${locale}`} className={lienFil}>{fil.accueil}</Link>
          <span aria-hidden>/</span>
          <Link href={`/${locale}/artisanat`} className={lienFil}>{fil.collection}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="text-[#2b2320]">{fil.courant}</span>
        </nav>
        <div className="pp-tete mt-4">
          <h1 className={`${serif.className} text-balance text-[2.3rem] leading-[1.04] tracking-[-0.02em] text-[#2b2320] sm:text-[3rem] md:text-[3.5rem]`}>{h1}</h1>
          <p className="pp-phrase max-w-[30em] text-[17px] leading-[1.5] text-[#4a4038] lg:text-[18px]">{phrase}</p>
        </div>

        <div className="mt-5 lg:mt-8">
          <VitrinePortail locale={locale} prix={donnees.vitrine} styleInitial={STYLE_VITRINE_DEPART} cote={donnees.coteVitrine} />
        </div>

        {/* Trois faits, en texte : trois lignes à filets sur téléphone, trois colonnes dès 900 px. Aucune icône. */}
        <ul className="mt-8 border-t border-[#e0d7cb] lg:mt-10 min-[900px]:grid min-[900px]:grid-cols-3">
          {x.faits.map((fait, i) => (
            <li
              key={fait.t}
              className={`border-b border-[#e0d7cb] py-4 text-[15px] leading-[1.5] text-[#5c5140] last:border-b-0 min-[900px]:border-b-0 min-[900px]:pb-0 min-[900px]:pr-8 min-[900px]:pt-5 ${i > 0 ? "min-[900px]:border-l min-[900px]:border-[#e0d7cb] min-[900px]:pl-8" : ""}`}
            >
              <span className="block font-semibold text-[#1d1d1f]">{fait.t}</span>
              {f(fait.d)}
            </li>
          ))}
        </ul>
      </div>

      {/* Les quatre modèles (fond crème) puis le guide (bande blanche) : un seul îlot, qui garde les trois réponses. */}
      <PortailsModeles locale={locale} modeles={modeles} sansRail={donnees.sansRail} />

      <EtapesFabrication titre={x.etapes.titre} etapes={etapes} colonnes={4} fond="creme" />

      {/* Contact et pages voisines. */}
      <section aria-labelledby="pp-contact" className="border-t border-[#e0d7cb] bg-[#ffffff] py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-6 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:gap-x-12">
          <div>
            <h2 id="pp-contact" className={TITRE_BANDE}>{x.contact.h2}</h2>
            <p className="mt-4 max-w-[34em] text-[16px] leading-[1.5] text-[#4a4038]">
              {avantTel}
              <a href={`tel:${CONTACT_PUBLIC.telephone}`} className={`whitespace-nowrap font-medium text-[#1d1d1f] underline decoration-[#1d1d1f]/40 underline-offset-4 hover:decoration-[#1d1d1f] ${focusVisible}`}>
                {telephone}
              </a>
              {point}
              {plages.length > 0 && (
                <span className="mt-1 block text-[#5c5140]">
                  {plages.map((plage, i) => (
                    <span key={plage}>{i > 0 && " · "}<span className="whitespace-nowrap">{plage}</span></span>
                  ))}
                </span>
              )}
            </p>
            <div className="mt-6 flex flex-col gap-3 min-[560px]:flex-row">
              <a href={`tel:${CONTACT_PUBLIC.telephone}`} className={`btn-plein min-h-[48px] md:min-h-[52px] ${focusVisible}`}>{x.contact.appeler}</a>
              <Link href={`/${locale}/contact`} className={`btn-contour min-h-[48px] md:min-h-[52px] ${focusVisible}`}>{x.contact.ecrire}</Link>
            </div>
          </div>
          <div className="mt-10 min-[900px]:mt-0">
            <p className="surtitre">{x.contact.choisir}</p>
            <ul className="mt-2">
              {liens.map((lien) => (
                <li key={lien.href}>
                  <Link href={lien.href} className={`lien-fleche min-h-[44px] py-2 text-[#1d1d1f] ${focusVisible}`}>{lien.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
