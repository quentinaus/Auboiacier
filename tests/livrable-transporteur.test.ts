import assert from "node:assert/strict";
import test from "node:test";
import {
  TRANSPORT_MAX_GRANDE_COTE_MM,
  TRANSPORT_MAX_PETITE_COTE_MM,
  getProduct,
  livrableParTransporteur,
  products,
} from "../src/lib/products.ts";

/**
 * Au-delà d'une certaine taille, aucun transporteur ne prend un plafond
 * lumineux : seule la pose par l'atelier peut le livrer. Ces tests tiennent la
 * règle, parce qu'une livraison vendue puis refusée au départ, c'est une
 * commande à rembourser et un client perdu.
 */

const lucarne = getProduct("plafond-lumineux-lucarne")!;
const halo = getProduct("plafond-lumineux-halo")!;

test("les deux plafonds lumineux existent toujours sous ces identifiants", () => {
  assert.ok(lucarne && lucarne.category === "lumiere");
  assert.ok(halo && halo.category === "lumiere");
});

test("une pièce qui tient dans le gabarit part par transporteur", () => {
  for (const cotes of [
    { largeurMm: 300, hauteurMm: 300 },
    { largeurMm: 1400, hauteurMm: 1400 },
    { largeurMm: 2000, hauteurMm: 1200 },
    { largeurMm: TRANSPORT_MAX_GRANDE_COTE_MM, hauteurMm: TRANSPORT_MAX_PETITE_COTE_MM },
  ]) {
    assert.ok(livrableParTransporteur(lucarne, cotes), JSON.stringify(cotes));
  }
});

test("le plafond de 2330 mm, celui qui sert d'exemple, dépasse de 30 mm", () => {
  // Utile à savoir : la cote qui revient partout dans les relevés de l'atelier
  // est déjà hors gabarit. Ce n'est pas un bug, c'est le seuil qui est serré —
  // et c'est cohérent avec l'enquête transport, qui trouvait 2,45 m une fois
  // la pièce coffrée, contre 2,40 m admis par les réseaux.
  assert.equal(livrableParTransporteur(lucarne, { largeurMm: 2330, hauteurMm: 1200 }), false);
  assert.ok(livrableParTransporteur(lucarne, { largeurMm: 2300, hauteurMm: 1200 }));
});

test("un millimètre de trop et la pose devient obligatoire", () => {
  assert.equal(
    livrableParTransporteur(lucarne, {
      largeurMm: TRANSPORT_MAX_GRANDE_COTE_MM + 1,
      hauteurMm: 1000,
    }),
    false
  );
  // Pour que la petite cote bloque, il faut que les DEUX dépassent la limite
  // de hauteur : sinon l'atelier dresse la caisse dans l'autre sens.
  assert.ok(
    livrableParTransporteur(lucarne, {
      largeurMm: 1000,
      hauteurMm: TRANSPORT_MAX_PETITE_COTE_MM + 1,
    }),
    "2101 au sol et 1000 en hauteur : ça passe, il suffit de la coucher"
  );
  assert.equal(
    livrableParTransporteur(lucarne, {
      largeurMm: TRANSPORT_MAX_PETITE_COTE_MM + 1,
      hauteurMm: TRANSPORT_MAX_PETITE_COTE_MM + 1,
    }),
    false
  );
});

test("la pièce se pose debout dans le sens le plus favorable", () => {
  // 2300 × 2100 passe, quel que soit le champ qui porte quelle cote : c'est
  // l'atelier qui décide du sens dans lequel la caisse se dresse.
  assert.ok(livrableParTransporteur(lucarne, { largeurMm: 2300, hauteurMm: 2100 }));
  assert.ok(livrableParTransporteur(lucarne, { largeurMm: 2100, hauteurMm: 2300 }));
  // En revanche, deux grandes cotes ne passent dans aucun sens.
  assert.equal(livrableParTransporteur(lucarne, { largeurMm: 2300, hauteurMm: 2300 }), false);
});

test("les grands formats du catalogue exigent la pose", () => {
  // Les deux fiches annoncent jusqu'à 4000 mm : ces pièces-là ne partent pas
  // par transporteur, et le site ne doit plus le proposer.
  assert.equal(livrableParTransporteur(lucarne, { largeurMm: 4000, hauteurMm: 3000 }), false);
  assert.equal(livrableParTransporteur(halo, { largeurMm: 4000, hauteurMm: 4000 }), false);
});

test("sans cote saisie, on ne bloque rien", () => {
  // Le client n'a encore rien choisi : lui annoncer que la pose est
  // obligatoire n'aurait aucun sens.
  assert.ok(livrableParTransporteur(lucarne, {}));
  assert.ok(livrableParTransporteur(lucarne, { largeurMm: 0, hauteurMm: 0 }));
});

test("une pièce ronde n'a qu'une cote, et elle suffit", () => {
  // Le Halo est rond : le configurateur ne remplit que la largeur (le
  // diamètre). Sans reprise de la seconde cote, un Ø 4 m serait passé pour
  // livrable.
  assert.ok(livrableParTransporteur(halo, { largeurMm: 2000 }));
  assert.equal(livrableParTransporteur(halo, { largeurMm: 4000 }), false);
});

test("les autres familles ne sont pas concernées", () => {
  // Une table part démontée, une chaise dans un carton : la contrainte est
  // propre au caisson lumineux, qui voyage monté et debout.
  const autres = products.filter((p) => p.category !== "lumiere");
  assert.ok(autres.length > 0, "le catalogue n'a plus que des lumières ?");
  for (const p of autres) {
    assert.ok(
      livrableParTransporteur(p, { largeurMm: 4000, hauteurMm: 3000 }),
      `${p.slug} est bloqué à tort`
    );
  }
});

test("le seuil reste prudent tant qu'aucun transporteur n'est choisi", () => {
  // 2,30 × 2,10 m nus, soit 2,40 × 2,20 m coffrés : la limite acceptée par la
  // quasi-totalité des réseaux français. À remonter le jour où un
  // transporteur est retenu et où ses cotes réelles sont connues.
  assert.equal(TRANSPORT_MAX_GRANDE_COTE_MM, 2300);
  assert.equal(TRANSPORT_MAX_PETITE_COTE_MM, 2100);
  assert.ok(TRANSPORT_MAX_PETITE_COTE_MM < TRANSPORT_MAX_GRANDE_COTE_MM);
});
