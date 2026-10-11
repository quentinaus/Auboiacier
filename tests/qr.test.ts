import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { VERSION_MAX, blocsQR, codeQR, correctionRS, motFormat, type NiveauCorrection } from "../src/lib/qr.ts";

/**
 * Le QR code de la carte des colis. Un QR faux ne se voit pas à l'œil : il
 * ne se lit pas, c'est tout, et le client range la carte. Ces tests le
 * comparent donc à des références qui ne viennent PAS de src/lib/qr.ts :
 * les exemples de la norme, et les codes fabriqués par le générateur de
 * macOS (CoreImage, filtre CIQRCodeGenerator) le 06/10/2026.
 */

const NIVEAUX: NiveauCorrection[] = ["L", "M", "Q", "H"];

const lignes = (modules: boolean[][]) => modules.map((rang) => rang.map((m) => (m ? "1" : "0")).join(""));

test("Reed-Solomon : les deux exemples classiques de la norme", () => {
  // « 01234567 », version 1-M (ISO/IEC 18004, annexe I).
  assert.deepEqual(
    correctionRS([16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17], 10),
    [165, 36, 212, 193, 237, 54, 199, 135, 44, 85]
  );
  // « HELLO WORLD », version 1-M.
  assert.deepEqual(
    correctionRS([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10),
    [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]
  );
});

test("information de format : les valeurs de la table de la norme", () => {
  assert.equal(motFormat("M", 0).toString(2).padStart(15, "0"), "101010000010010");
  assert.equal(motFormat("L", 4).toString(2).padStart(15, "0"), "110011000101111");
  assert.equal(motFormat("H", 7).toString(2).padStart(15, "0"), "000100000111011");
  assert.equal(motFormat("Q", 3).toString(2).padStart(15, "0"), "011101000000110");
});

test("la table des blocs remplit exactement la place de chaque version", () => {
  for (let version = 1; version <= VERSION_MAX; version++) {
    // Les modules libres pour les données, d'après la géométrie seule.
    let libres = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const n = Math.floor(version / 7) + 2;
      libres -= (25 * n - 10) * n - 55;
      if (version >= 7) libres -= 36;
    }
    for (const niveau of NIVEAUX) {
      assert.equal(blocsQR(version, niveau).total, Math.floor(libres / 8), `version ${version}-${niveau}`);
    }
  }
});

test("l'adresse de la carte : module pour module, le code de CoreImage", () => {
  // CIQRCodeGenerator, « https://auboiacier.fr/avis », correction M.
  const coreImage = [
    "1111111001100010101111111",
    "1000001000110101101000001",
    "1011101010100001101011101",
    "1011101011111101001011101",
    "1011101011010100101011101",
    "1000001011001111101000001",
    "1111111010101010101111111",
    "0000000010010001000000000",
    "1011111001101110001111100",
    "0110010001011000110100010",
    "1100111000101111111101011",
    "1001010110111000011000001",
    "0100111101101111011010111",
    "1000000000101010100101010",
    "1010111000000101101111011",
    "1011100001011001000110001",
    "1000111101100101111110100",
    "0000000011010101100011000",
    "1111111001100110101010111",
    "1000001010101010100011000",
    "1011101011111111111110100",
    "1011101011110000011011111",
    "1011101011101001100001101",
    "1000001000010011110111001",
    "1111111011100110010111111",
  ];
  const code = codeQR("https://auboiacier.fr/avis");
  assert.equal(code.version, 2);
  assert.equal(code.niveau, "M");
  assert.deepEqual(lignes(code.modules), coreImage);
});

test("versions 7 à 10, plusieurs blocs, accents : identiques à CoreImage", () => {
  // Empreinte SHA-256 des lignes de 0 et de 1 produites par CoreImage.
  const cas: [NiveauCorrection, string, number, string][] = [
    ["L", "x".repeat(150), 7, "1b893491bd8934e7e281a7818cb4450f2b9821d9db8aeb32d1d4442b21d32f12"],
    ["Q", "y".repeat(120), 9, "aa15a05a116cc9a3c97eb2bd6588e8fb63ce930579dfde52be706dd722aa3e1b"],
    [
      "H",
      "Merci ! Votre avis compte — l'atelier Auboiacier, Saumur (49400). Ça marche avec les accents : é è à ç ô.",
      10,
      "13b97259116ea135d332dd3b453d48c3607e4a37ffac701b909b8fcf5c418b50",
    ],
  ];
  for (const [niveau, texte, version, empreinte] of cas) {
    const code = codeQR(texte, { niveau });
    assert.equal(code.version, version, texte.slice(0, 20));
    assert.equal(createHash("sha256").update(lignes(code.modules).join("\n")).digest("hex"), empreinte, texte.slice(0, 20));
  }
});

test("un texte trop long est refusé, jamais tronqué", () => {
  assert.throws(() => codeQR("x".repeat(400)), /trop long/);
});
