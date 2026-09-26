import { NextResponse } from "next/server";
import { ouvrirSession } from "@/lib/compte";
import { lireLien, retourInterne } from "@/lib/compte-jetons";

export const runtime = "nodejs";

/**
 * On arrive ici depuis sa boîte mail. Le jeton prouve qu'on contrôle
 * l'adresse : c'est tout ce qu'il faut pour ouvrir la session.
 *
 * Volontairement réutilisable pendant ses quinze minutes (voir DUREE_LIEN_S) :
 * ouvert depuis l'application Mail d'un iPhone, le lien s'ouvre dans une
 * fenêtre qui ne partage pas ses témoins avec Safari, et le client rouvre le
 * lien depuis son navigateur. À usage unique, il tomberait sur un refus.
 */
export async function GET(request: Request) {
  const parametres = new URL(request.url).searchParams;
  const locale = parametres.get("l") === "en" ? "en" : "fr";
  const jeton = lireLien(parametres.get("j"), Math.floor(Date.now() / 1000));

  if (!jeton || !(await ouvrirSession(jeton.email))) {
    return NextResponse.redirect(new URL(`/${locale}/compte/connexion?erreur=lien`, request.url));
  }
  const retour = retourInterne(parametres.get("s")) ?? `/${locale}/compte`;
  return NextResponse.redirect(new URL(retour, request.url));
}
