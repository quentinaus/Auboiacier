import assert from "node:assert/strict";
import test from "node:test";
import {
  STATUTS,
  STATUT_INITIAL,
  estStatut,
  etapeStatut,
  libelleStatut,
  phraseStatut,
  prevenirParDefaut,
  type Statut,
} from "../src/lib/statut-commande.ts";

/**
 * Ces quatre états sont lus par trois endroits qui ne se parlent pas :
 * l'écran de l'atelier, l'e-mail au client et, demain, son espace. Un libellé
 * manquant dans une langue s'y voit en « undefined ».
 */

test("les quatre états sont dans l'ordre de la fabrication", () => {
  assert.deepEqual([...STATUTS], ["recue", "fabrication", "expediee", "livree"]);
  assert.equal(STATUT_INITIAL, "recue", "une commande payée est reçue, sans rien faire");
  STATUTS.forEach((s, i) => assert.equal(etapeStatut(s), i));
});

/** Les trois façons de recevoir une commande : transporteur, pose, retrait à l'atelier. */
const CAS = [{}, { pose: true }, { retrait: true }] as const;

test("tout état a un libellé et une phrase, dans les deux langues et les trois cas", () => {
  for (const statut of STATUTS) {
    for (const cas of CAS) {
      for (const locale of ["fr", "en"] as const) {
        const libelle = libelleStatut(statut, { ...cas, locale });
        const phrase = phraseStatut(statut, { ...cas, locale });
        assert.ok(libelle && libelle.length > 2, `libellé manquant : ${statut}/${JSON.stringify(cas)}/${locale}`);
        assert.ok(phrase && phrase.length > 15, `phrase manquante : ${statut}/${JSON.stringify(cas)}/${locale}`);
      }
    }
  }
});

test("une pièce retirée à l'atelier ne s'expédie pas : elle est prête, puis retirée", () => {
  assert.equal(libelleStatut("expediee", { retrait: true }), "Prête à retirer");
  assert.equal(libelleStatut("livree", { retrait: true }), "Retirée");
  assert.equal(libelleStatut("livree", { retrait: true, locale: "en" }), "Collected");
  assert.ok(!phraseStatut("expediee", { retrait: true }).includes("transporteur"));
  assert.ok(phraseStatut("expediee", { retrait: true }).includes("Saumur"));
});

test("une pièce posée par l'atelier ne s'expédie pas et ne se livre pas", () => {
  assert.equal(libelleStatut("expediee"), "Expédiée");
  assert.equal(libelleStatut("expediee", { pose: true }), "Prête à poser");
  assert.equal(libelleStatut("livree"), "Livrée");
  assert.equal(libelleStatut("livree", { pose: true }), "Posée");
  // Et la phrase suit : on n'annonce pas un transporteur à qui attend l'atelier.
  assert.ok(phraseStatut("expediee").includes("transporteur"));
  assert.ok(!phraseStatut("expediee", { pose: true }).includes("transporteur"));
});

test("estStatut refuse tout ce qui ne vient pas de la liste", () => {
  for (const statut of STATUTS) assert.ok(estStatut(statut));
  for (const faux of ["fabrikation", "", "RECUE", null, undefined, 3, {}, ["recue"]]) {
    assert.ok(!estStatut(faux), `accepté à tort : ${JSON.stringify(faux)}`);
  }
});

test("on ne prévient le client que pour l'état qui l'intéresse vraiment", () => {
  const prevenus = STATUTS.filter((s) => prevenirParDefaut(s));
  assert.deepEqual(prevenus, ["expediee"], "quatre e-mails pour une table, et il se désabonne");
});

test("le français n'oublie pas ses espaces insécables devant la ponctuation double", () => {
  for (const statut of STATUTS) {
    for (const cas of CAS) {
      const phrase = phraseStatut(statut, { ...cas, locale: "fr" });
      assert.ok(
        !/ [:;?!]/.test(phrase),
        `espace ordinaire avant une ponctuation double : ${statut} — ${phrase}`
      );
    }
  }
});

test("les libellés français tiennent sur un bouton de téléphone", () => {
  for (const statut of STATUTS) {
    for (const cas of CAS) {
      const libelle = libelleStatut(statut as Statut, cas);
      assert.ok(libelle.length <= 18, `trop long pour un bouton : « ${libelle} »`);
    }
  }
});
