/**
 * Les redirections permanentes de next.config.mjs.
 *
 * auboiacier.vercel.app renvoie au .fr — sauf /api/… : un service réglé sur
 * cette adresse (le webhook de Stripe, par exemple) ne suit pas une
 * redirection, il échouerait. On fait tourner la règle avec le moteur de
 * correspondance de Next lui-même.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import nextConfig from "../next.config.mjs";

const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match.js");

test("auboiacier.vercel.app renvoie au .fr, sauf les adresses /api/", async () => {
  const regles = await nextConfig.redirects();
  const vercel = regles.find((regle: { has?: { type: string; value: string }[] }) =>
    regle.has?.some((condition) => condition.type === "host" && condition.value.includes("vercel"))
  );
  assert.ok(vercel, "règle auboiacier.vercel.app introuvable");
  assert.equal(vercel.permanent, true);
  const correspond = getPathMatch(vercel.source, { strict: true, removeUnnamedParams: true });

  for (const chemin of ["/", "/fr", "/en/artisanat/tables", "/fr/bois-massif", "/apiculture"]) {
    assert.ok(correspond(chemin), `${chemin} devrait renvoyer au .fr`);
  }
  for (const chemin of ["/api", "/api/", "/api/stripe/webhook", "/api/commande"]) {
    assert.equal(correspond(chemin), false, `${chemin} ne doit pas être redirigé`);
  }
});
