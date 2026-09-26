"use client";

import { useState } from "react";
import { codePostalFrancais, telephonePlausible, type Profil } from "@/lib/profil";

/**
 * Les coordonnées du client, qu'il corrige lui-même.
 *
 * Tout est facultatif, et c'est volontaire : quelqu'un qui vient seulement
 * corriger une faute dans sa rue ne doit pas se voir réclamer son téléphone.
 * On ne refuse que deux choses, et seulement si elles sont remplies — un code
 * postal qui n'en est pas un, un téléphone trop court — parce que ces
 * deux-là serviront le jour de la livraison et qu'une erreur y coûte un
 * camion.
 */

type Textes = {
  email: string;
  emailFixe: string;
  nom: string;
  telephone: string;
  telephoneAide: string;
  adresse: string;
  ligne1: string;
  ligne2: string;
  codePostal: string;
  ville: string;
  enregistrer: string;
  enregistrement: string;
  enregistre: string;
  erreur: string;
  erreurCodePostal: string;
  erreurTelephone: string;
  ou: string;
};

const CHAMP =
  "mt-2 h-12 w-full rounded-xl border border-[#9a8d80] bg-white px-4 text-base text-[#2b2320] outline-none transition-[border-color,box-shadow] placeholder:text-[#726757] focus:border-[#2b2320] focus:shadow-[0_0_0_3px_rgba(109,44,44,0.14)]";
const INTITULE = "block text-sm text-[#5c5140]";

export function ProfilFormulaire({
  t,
  email,
  profil,
}: {
  t: Textes;
  email: string;
  profil: Profil;
}) {
  const [valeurs, setValeurs] = useState<Profil>(profil);
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  function changer(champ: keyof Profil | keyof Profil["adresse"], valeur: string) {
    setEtat("repos");
    setErreur(null);
    setValeurs((v) =>
      champ === "nom" || champ === "telephone"
        ? { ...v, [champ]: valeur }
        : { ...v, adresse: { ...v.adresse, [champ]: valeur } }
    );
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (etat === "envoi") return;

    // Les deux seules vérifications, et seulement sur ce qui est rempli.
    if (valeurs.adresse.codePostal && !codePostalFrancais(valeurs.adresse.codePostal)) {
      setErreur(t.erreurCodePostal);
      return;
    }
    if (valeurs.telephone && !telephonePlausible(valeurs.telephone)) {
      setErreur(t.erreurTelephone);
      return;
    }

    setErreur(null);
    setEtat("envoi");
    try {
      const reponse = await fetch("/api/compte/profil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(valeurs),
      });
      if (!reponse.ok) throw new Error("refus");
      const { profil: retenu } = (await reponse.json()) as { profil: Profil };
      // On réaffiche ce que le serveur a VRAIMENT gardé : un nom trop long a
      // pu être coupé, un code postal débarrassé de ses espaces.
      if (retenu) setValeurs(retenu);
      setEtat("fait");
    } catch {
      setErreur(t.erreur);
      setEtat("repos");
    }
  }

  return (
    <form onSubmit={envoyer} noValidate className="mt-8">
      {/* L'adresse e-mail, montrée mais pas modifiable : c'est l'identité du
          compte, et en changer reviendrait à perdre ses commandes. */}
      <div className="rounded-2xl border border-[#e8e1d8] bg-[#fbfaf8] p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">{t.email}</p>
        <p className="mt-1 text-base text-[#2b2320]">{email}</p>
        <p className="mt-2 text-xs leading-relaxed text-[#6f6357]">{t.emailFixe}</p>
      </div>

      <div className="mt-6">
        <label htmlFor="profil-nom" className={INTITULE}>
          {t.nom}
        </label>
        <input
          id="profil-nom"
          autoComplete="name"
          value={valeurs.nom}
          onChange={(e) => changer("nom", e.target.value)}
          className={CHAMP}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="profil-tel" className={INTITULE}>
          {t.telephone}
        </label>
        <input
          id="profil-tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={valeurs.telephone}
          onChange={(e) => changer("telephone", e.target.value)}
          aria-describedby="profil-tel-aide"
          className={CHAMP}
        />
        <p id="profil-tel-aide" className="mt-1.5 text-xs text-[#6f6357]">
          {t.telephoneAide}
        </p>
      </div>

      <fieldset className="mt-8 border-t border-[#e8e1d8] pt-6">
        <legend className="text-xs font-medium uppercase tracking-widest text-[#6f6357]">
          {t.adresse}
        </legend>

        <div className="mt-4">
          <label htmlFor="profil-l1" className={INTITULE}>
            {t.ligne1}
          </label>
          <input
            id="profil-l1"
            autoComplete="address-line1"
            value={valeurs.adresse.ligne1}
            onChange={(e) => changer("ligne1", e.target.value)}
            className={CHAMP}
          />
        </div>

        <div className="mt-5">
          <label htmlFor="profil-l2" className={INTITULE}>
            {t.ligne2}
          </label>
          <input
            id="profil-l2"
            autoComplete="address-line2"
            value={valeurs.adresse.ligne2}
            onChange={(e) => changer("ligne2", e.target.value)}
            className={CHAMP}
          />
        </div>

        {/* Code postal et ville côte à côte : c'est ainsi qu'on les écrit, et
            ça épargne une ligne sur un écran de téléphone. */}
        <div className="mt-5 grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-4">
          <div>
            <label htmlFor="profil-cp" className={INTITULE}>
              {t.codePostal}
            </label>
            <input
              id="profil-cp"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={valeurs.adresse.codePostal}
              onChange={(e) => changer("codePostal", e.target.value)}
              className={`${CHAMP} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor="profil-ville" className={INTITULE}>
              {t.ville}
            </label>
            <input
              id="profil-ville"
              autoComplete="address-level2"
              value={valeurs.adresse.ville}
              onChange={(e) => changer("ville", e.target.value)}
              className={CHAMP}
            />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={etat === "envoi"}
        className="btn-verre mt-8 h-12 w-full rounded-full text-[11px] font-medium uppercase tracking-[0.2em] text-white disabled:opacity-60"
      >
        {etat === "envoi" ? t.enregistrement : t.enregistrer}
      </button>

      {/* Une seule ligne de réponse, qui ne saute pas : elle occupe sa place
          même vide, pour que le bouton ne se déplace pas sous le doigt. */}
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-center text-sm ${erreur ? "text-[#6d2c2c]" : "text-[#4a6b4a]"}`}
      >
        {erreur ?? (etat === "fait" ? t.enregistre : "")}
      </p>

      <p className="mt-6 border-t border-[#e8e1d8] pt-5 text-xs leading-relaxed text-[#6f6357]">
        {t.ou}
      </p>
    </form>
  );
}
