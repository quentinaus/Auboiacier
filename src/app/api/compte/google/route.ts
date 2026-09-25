import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { compteConfigure } from "@/lib/compte-jetons";
import { poserPassage } from "@/lib/compte";
import { adresseDeDepart, googleConfigure } from "@/lib/google-oauth";

export const runtime = "nodejs";

/**
 * Départ vers Google. On tire un jeton de passage au hasard, on le pose dans
 * un témoin ET on l'envoie à Google : au retour, les deux devront
 * correspondre. C'est ce qui empêche un autre site d'envoyer un visiteur sur
 * notre adresse de retour avec un code obtenu ailleurs.
 */
export async function GET(request: Request) {
  if (!compteConfigure() || !googleConfigure()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const suite = new URL(request.url).searchParams.get("suite") ?? "/fr/compte";
  const passage = randomBytes(18).toString("base64url");
  await poserPassage(passage);
  return NextResponse.redirect(adresseDeDepart(passage, suite));
}
